import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { objectToCamel, objectToSnake } from 'ts-case-convert';
import { getProductByBarcode, search } from '@/clients/open-food-facts';
import { getCategoryPath } from '@/helpers/category';
import { routes } from '@/routes/api';
import type { Genmoji } from '@/schemas/genmoji';
import {
  InventoryItemSuggestions,
  InventoryItemsSchema,
} from '@/schemas/inventory';
import { ProductSearchItemSchema } from '@/schemas/product';
import { ActiveInventoryItemStatus } from '@/types/category';
import type { HonoEnvironment } from '@/types/hono';
import { calculateDaysBetween } from '@/utils/date';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  toTwoDecimalPlaces,
} from '@/utils/maths';

export const createV1Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(routes.inventory.get, async (c) => {
    const userId = c.get('userId');

    const { data, error } = await c
      .get('supabase')
      .from('inventory_items')
      .select(`
    id,
    created_at,
    updated_at,
    opened_at,
    status,
    storage_location,
    consumption_prediction,
    consumption_prediction_changed_at,
    expiry_date,
    expiry_type,
    product:products (
      id,
      name,
      brand,
      category:categories (
        id,
        name,
        icon,
        path_display
      ),
      amount,
      unit
    )
  `)
      .eq('user_id', userId)
      .in('status', ActiveInventoryItemStatus);

    if (error) {
      return c.json(
        {
          error: `Error occurred retrieving food items. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const inventoryItems = InventoryItemsSchema.safeParse(objectToCamel(data));

    if (!inventoryItems.success) {
      return c.json(
        {
          error: `Error occurred parsing food items. Error=${JSON.stringify(inventoryItems.error)}`,
        },
        400,
      );
    }

    return c.json(inventoryItems.data, 200);
  });

  app.openapi(routes.inventory.add, async (c) => {
    const inventoryItemInput = c.req.valid('json');

    const productUpsertResponse = await c
      .get('supabase')
      .from('products')
      .upsert(
        {
          ...objectToSnake(inventoryItemInput.product),
          source_ref: inventoryItemInput.product.sourceRef,
          source_id: inventoryItemInput.product.sourceId,
        },
        {
          onConflict: 'source_id,source_ref',
        },
      )
      .select('id')
      .single();

    if (productUpsertResponse.error) {
      return c.json(
        {
          error: `Error occurred upserting product. Error=${JSON.stringify(productUpsertResponse.error)}`,
        },
        400,
      );
    }

    const { id: productId } = productUpsertResponse.data;

    const userId = c.get('userId');

    const inventoryItemsResponse = await c
      .get('supabase')
      .from('inventory_items')
      .insert({
        ...objectToSnake(inventoryItemInput.item),
        product_id: productId,
        user_id: userId,
        ...(inventoryItemInput.item.consumptionPrediction && {
          consumption_prediction_changed_at: new Date().toISOString(),
        }),
      })
      .select('id')
      .single();

    if (inventoryItemsResponse.error) {
      return c.json(
        {
          error: `Error occurred creating inventory item. Error=${JSON.stringify(inventoryItemsResponse.error)}`,
        },
        400,
      );
    }

    return c.json(
      {
        inventoryItemId: inventoryItemsResponse.data.id,
      },
      200,
    );
  });

  app.openapi(routes.inventory.update, async (c) => {
    const { inventoryItemId } = c.req.valid('param');

    const {
      status,
      storageLocation,
      percentageRemaining,
      consumptionPrediction,
    } = c.req.valid('json');

    const { error } = await c
      .get('supabase')
      .from('inventory_items')
      .update({
        ...(storageLocation && {
          storage_location: storageLocation,
          location_changed_at: new Date().toISOString(),
        }),
        ...(status && { status }),
        ...(status === 'opened' && {
          opened_at: new Date().toISOString(),
        }),
        ...(consumptionPrediction && {
          consumption_prediction: consumptionPrediction,
          consumption_prediction_changed_at: new Date().toISOString(),
        }),
        ...(status === 'discarded' && {
          discarded_at: new Date().toISOString(),
          ...(percentageRemaining !== undefined && {
            percentage_remaining: percentageRemaining,
            discarded_at: new Date().toISOString(),
          }),
        }),
        ...(status === 'consumed' && {
          consumed_at: new Date().toISOString(),
          percentage_remaining: percentageRemaining,
        }),
      })
      .eq('id', inventoryItemId);
    // send async event to Cloudflare Queue

    if (error) {
      return c.json(
        {
          error: `Error occurred updating inventory item. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    return c.body(null, 204);
  });

  app.openapi(routes.inventory.preview, async (c) => {
    const { product } = c.req.valid('json');

    const supabase = c.get('supabase');

    const { data: category, error } = await supabase
      .from('categories')
      .select(`
      expiry_type,
      recommended_storage_location,
      shelf_life_in_pantry_in_days_unopened,
      shelf_life_in_pantry_in_days_opened,
      shelf_life_in_fridge_in_days_unopened,
      shelf_life_in_fridge_in_days_opened,
      shelf_life_in_freezer_in_days_unopened,
      shelf_life_in_freezer_in_days_opened
    `)
      .eq('id', product.categoryId)
      .single();

    if (error || !category) {
      return c.json(
        {
          error: `Error occurred retrieving food items. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const productUpsertResponse = await supabase
      .from('products')
      .upsert(
        {
          ...objectToSnake(product),
          expiry_type: category.expiry_type,
          storage_location: category.recommended_storage_location,
        },
        {
          onConflict: 'source_id,source_ref',
        },
      )
      .select('id')
      .single();

    if (productUpsertResponse.error) {
      return c.json(
        {
          error: `Error occurred upserting product. Error=${JSON.stringify(productUpsertResponse.error)}`,
        },
        400,
      );
    }

    const { id: productId } = productUpsertResponse.data;

    const userId = c.get('userId');

    const productHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, created_at, consumed_at, discarded_at, status',
      )
      .eq('product_id', productId)
      .eq('user_id', userId);

    if (productHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving product history. Error=${JSON.stringify(productHistoryResponse.error)}`,
        },
        400,
      );
    }

    const purchaseCount = productHistoryResponse.data.length;
    const consumedCount = productHistoryResponse.data.filter(
      (item) => item.status === 'consumed',
    ).length;

    const consumedOrDiscardedItems = productHistoryResponse.data.filter(
      (item) => item.status === 'consumed' || item.status === 'discarded',
    );

    const productUsagePercentages = consumedOrDiscardedItems.map(
      (item) => 100 - item.percentage_remaining,
    );

    const productDaysToConsumeOrDiscard = consumedOrDiscardedItems
      .map((item) =>
        calculateDaysBetween(
          item.created_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const categoryHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, created_at, consumed_at, discarded_at, product:products!inner(category_id)',
      )
      .eq('product.category_id', product.categoryId)
      .eq('user_id', userId)
      .in('status', ['consumed', 'discarded']);

    if (categoryHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving category history. Error=${JSON.stringify(categoryHistoryResponse.error)}`,
        },
        400,
      );
    }

    const categoryUsagePercentages = categoryHistoryResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const categoryDaysToConsumeOrDiscard = categoryHistoryResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.created_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const userBaselineResponse = await supabase
      .from('inventory_items')
      .select('percentage_remaining, created_at, consumed_at, discarded_at')
      .eq('user_id', userId)
      .in('status', ['consumed', 'discarded']);

    if (userBaselineResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving user baseline. Error=${JSON.stringify(userBaselineResponse.error)}`,
        },
        400,
      );
    }

    const userUsagePercentages = userBaselineResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const userDaysToConsumeOrDiscard = userBaselineResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.created_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const inventoryItemSuggestion = {
      shelfLifeInDays: {
        opened: {
          pantry: category.shelf_life_in_pantry_in_days_opened,
          fridge: category.shelf_life_in_fridge_in_days_opened,
          freezer: category.shelf_life_in_freezer_in_days_opened,
        },
        unopened: {
          pantry: category.shelf_life_in_pantry_in_days_unopened,
          fridge: category.shelf_life_in_fridge_in_days_unopened,
          freezer: category.shelf_life_in_freezer_in_days_unopened,
        },
      },
      expiryType: category.expiry_type,
      recommendedStorageLocation: category.recommended_storage_location,
    };

    const inventoryItemSuggestions = InventoryItemSuggestions.parse(
      inventoryItemSuggestion,
    );

    return c.json(
      {
        productId,
        predictions: {
          productHistory: {
            purchaseCount,
            consumedCount,
            usagePercentages: productUsagePercentages.map(
              (usagePercentage) => Math.round(usagePercentage * 100) / 100,
            ),
            averageUsage: toTwoDecimalPlaces(
              calculateMean(productUsagePercentages),
            ),
            medianUsage: calculateMedian(productUsagePercentages),
            standardDeviation: toTwoDecimalPlaces(
              calculateStandardDeviation(productUsagePercentages),
            ),
            averageDaysToConsumeOrDiscarded: toTwoDecimalPlaces(
              calculateMean(productDaysToConsumeOrDiscard),
            ),
            medianDaysToConsumeOrDiscarded: calculateMedian(
              productDaysToConsumeOrDiscard,
            ),
          },
          categoryHistory: {
            purchaseCount: categoryUsagePercentages.length,
            averageUsage: toTwoDecimalPlaces(
              calculateMean(categoryUsagePercentages),
            ),
            medianUsage: calculateMedian(categoryUsagePercentages),
            standardDeviation: toTwoDecimalPlaces(
              calculateStandardDeviation(categoryUsagePercentages),
            ),
            averageDaysToConsumeOrDiscarded: toTwoDecimalPlaces(
              calculateMean(categoryDaysToConsumeOrDiscard),
            ),
            medianDaysToConsumeOrDiscarded: calculateMedian(
              categoryDaysToConsumeOrDiscard,
            ),
          },
          userBaseline: {
            averageUsage:
              Math.round(calculateMean(userUsagePercentages) * 100) / 100,
            medianUsage: calculateMedian(userUsagePercentages),
            totalItemsCount: userUsagePercentages.length,
            averageDaysToConsumeOrDiscarded: toTwoDecimalPlaces(
              calculateMean(userDaysToConsumeOrDiscard),
            ),
            medianDaysToConsumeOrDiscarded: calculateMedian(
              userDaysToConsumeOrDiscard,
            ),
          },
        },
        suggestions: inventoryItemSuggestions,
      },
      200,
    );
  });

  app.openapi(routes.products.prediction, async (c) => {
    const { productId } = c.req.valid('param');

    const supabase = c.get('supabase');

    const userId = c.get('userId');

    const { data: product, error: productError } = await supabase
      .from('products')
      .select(
        `
      category_id,
      category:categories (
        shelf_life_in_pantry_in_days_opened,
        shelf_life_in_fridge_in_days_opened,
        shelf_life_in_freezer_in_days_opened
      )
    `,
      )
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return c.json(
        {
          error: `Error occurred retrieving product. Error=${JSON.stringify(productError)}`,
        },
        400,
      );
    }

    const productOpenedHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, opened_at, consumed_at, discarded_at, status',
      )
      .eq('product_id', productId)
      .eq('user_id', userId)
      .not('opened_at', 'is', null)
      .in('status', ['consumed', 'discarded']);

    if (productOpenedHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving product opened history. Error=${JSON.stringify(productOpenedHistoryResponse.error)}`,
        },
        400,
      );
    }

    const productOpenedUsagePercentages = productOpenedHistoryResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const productOpenedDaysToOutcome = productOpenedHistoryResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.opened_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const categoryOpenedHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, opened_at, consumed_at, discarded_at, product:products!inner(category_id)',
      )
      .eq('product.category_id', product.category_id)
      .eq('user_id', userId)
      .not('opened_at', 'is', null)
      .in('status', ['consumed', 'discarded']);

    if (categoryOpenedHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving category opened history. Error=${JSON.stringify(categoryOpenedHistoryResponse.error)}`,
        },
        400,
      );
    }

    const categoryOpenedUsagePercentages =
      categoryOpenedHistoryResponse.data.map(
        (item) => 100 - item.percentage_remaining,
      );

    const categoryOpenedDaysToOutcome = categoryOpenedHistoryResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.opened_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const userOpenedBaselineResponse = await supabase
      .from('inventory_items')
      .select('percentage_remaining, opened_at, consumed_at, discarded_at')
      .eq('user_id', userId)
      .not('opened_at', 'is', null)
      .in('status', ['consumed', 'discarded']);

    if (userOpenedBaselineResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving user opened baseline. Error=${JSON.stringify(userOpenedBaselineResponse.error)}`,
        },
        400,
      );
    }

    const userOpenedUsagePercentages = userOpenedBaselineResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const userOpenedDaysToOutcome = userOpenedBaselineResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.opened_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    return c.json(
      {
        predictions: {
          productOpenedHistory: {
            medianUsagePercentage:
              calculateMedian(productOpenedUsagePercentages) ?? null,
            medianDaysToOutcome:
              calculateMedian(productOpenedDaysToOutcome) ?? null,
          },
          categoryOpenedHistory: {
            medianUsagePercentage:
              calculateMedian(categoryOpenedUsagePercentages) ?? null,
            medianDaysToOutcome:
              calculateMedian(categoryOpenedDaysToOutcome) ?? null,
          },
          userOpenedBaseline: {
            medianUsagePercentage:
              calculateMedian(userOpenedUsagePercentages) ?? null,
            medianDaysToOutcome:
              calculateMedian(userOpenedDaysToOutcome) ?? null,
          },
        },
        suggestions: {
          opened: {
            pantry: product.category.shelf_life_in_pantry_in_days_opened,
            fridge: product.category.shelf_life_in_fridge_in_days_opened,
            freezer: product.category.shelf_life_in_freezer_in_days_opened,
          },
        },
      },
      200,
    );
  });

  app.openapi(routes.products.usageStats, async (c) => {
    const { productId } = c.req.valid('param');

    const supabase = c.get('supabase');

    const userId = c.get('userId');

    const categoryResponse = await supabase
      .from('products')
      .select('category_id')
      .eq('id', productId)
      .single();

    if (categoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving product history. Error=${JSON.stringify(categoryResponse.error)}`,
        },
        400,
      );
    }

    const { category_id: categoryId } = categoryResponse.data;

    const productHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, created_at, consumed_at, discarded_at, status',
      )
      .eq('product_id', productId)
      .eq('user_id', userId)
      .in('status', ['consumed', 'discarded']);

    if (!productHistoryResponse.data) {
      return c.json(
        {
          error: `Error occurred retrieving product history. Error=${JSON.stringify(productHistoryResponse.error)}`,
        },
        400,
      );
    }

    const categoryHistoryResponse = await supabase
      .from('inventory_items')
      .select(
        'percentage_remaining, created_at, consumed_at, discarded_at, product:products!inner(category_id)',
      )
      .eq('product.category_id', categoryId)
      .eq('user_id', userId)
      .in('status', ['consumed', 'discarded']);

    if (categoryHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving category history. Error=${JSON.stringify(categoryHistoryResponse.error)}`,
        },
        400,
      );
    }

    const productDaysToOutcome = productHistoryResponse.data
      .map((item) =>
        calculateDaysBetween(
          item.created_at,
          item.consumed_at || item.discarded_at,
        ),
      )
      .filter((days): days is number => days !== null);

    const productUsagePercentages = productHistoryResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const categoryUsagePercentages = categoryHistoryResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    return c.json(
      {
        product: {
          medianDaysToOutcome:
            calculateMedian(productDaysToOutcome) ??
            calculateMean(productDaysToOutcome),
          medianUsage:
            calculateMedian(productUsagePercentages) ??
            calculateMean(productUsagePercentages),
        },
        category: {
          medianUsage:
            calculateMedian(categoryUsagePercentages) ??
            calculateMean(categoryUsagePercentages),
        },
      },
      200,
    );
  });

  app.openapi(routes.products.list, async (c) => {
    const { search: searchTerm } = c.req.valid('query');

    const products = await search(searchTerm, c.get('supabase'));

    return c.json(
      {
        products,
      },
      200,
    );
  });

  app.openapi(routes.products.random, async (c) => {
    const productIds = [6, 11, 12, 18, 20, 23, 54, 112];

    const randomProductId =
      productIds[Math.floor(Math.random() * productIds.length)] ?? 11;

    const { data, error } = await c
      .get('supabase')
      .from('products')
      .select(
        `
      id,
      name,
      brand,
      amount,
      unit,
      source_id,
      source_ref,
      category:categories (
        id,
        name,
        icon,
        path_display,
        recommended_storage_location
      )
    `,
      )
      .eq('id', randomProductId)
      .single();

    if (error || !data) {
      return c.json(
        {
          error: `Error occurred retrieving random product. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const parsedData = objectToCamel(data);

    const productSearchItem = ProductSearchItemSchema.parse({
      ...parsedData,
      category: {
        ...parsedData.category,
        path: getCategoryPath(parsedData.category.pathDisplay),
      },
      source: {
        id: data.source_id,
        ref: data.source_ref,
      },
      unit: parsedData.unit ?? undefined,
      amount: parsedData.amount ?? undefined,
      icon: parsedData.category.icon ?? 'chicken',
    });

    return c.json(productSearchItem, 200);
  });

  app.openapi(routes.products.resolve, async (c) => {
    const { product } = c.req.valid('json');

    const productUpsertResponse = await c
      .get('supabase')
      .from('products')
      .upsert(
        {
          ...objectToSnake(product),
          source_ref: product.sourceRef,
          source_id: product.sourceId,
        },
        {
          onConflict: 'source_id,source_ref',
        },
      )
      .select('id')
      .single();

    if (productUpsertResponse.error) {
      return c.json(
        {
          error: `Error occurred upserting product. Error=${JSON.stringify(productUpsertResponse.error)}`,
        },
        400,
      );
    }

    const { id: productId } = productUpsertResponse.data;

    return c.json(
      {
        productId,
      },
      200,
    );
  });

  app.openapi(routes.products.barcode, async (c) => {
    const { barcode } = c.req.valid('param');

    const product = await getProductByBarcode(barcode, c.get('supabase'));

    if (!product) {
      c.header('Cache-Control', 'public, max-age=300');

      return c.json(
        {
          error: `Error occurred retrieving product with product=${product}`,
        },
        400,
        {
          'Cache-Control': 'public, max-age=300',
        },
      );
    }

    return c.json(product, 200, {
      'Cache-Control': 'public, max-age=2592000, immutable',
    });
  });

  app.openapi(routes.images.genmoji.get, async (c) => {
    const { name } = c.req.valid('param');

    const genmoji = await c.env.keepfresh_genmoji.get<Genmoji>(
      `genmoji:${name.toLowerCase()}`,
      'json',
    );

    if (!genmoji) {
      return c.json(
        {
          error: `Error occurred retrieving genmoji with name=${name}`,
        },
        400,
      );
    }

    return c.json(genmoji, 200, {
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  });

  app.openapi(routes.images.genmoji.add, async (c) => {
    const genmoji = c.req.valid('json');

    await c.env.keepfresh_genmoji.put(
      `genmoji:${genmoji.name.toLowerCase()}`,
      JSON.stringify(genmoji),
    );

    return c.body(null, 201);
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: `"Authorization": "Bearer token"`,
  });

  app.doc31('/doc', {
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'KeepFresh API',
      description: 'KeepFresh API',
    },
    servers: [
      {
        url: '/v1',
        description: 'Version 1 API',
      },
      {
        url: 'https://api.keepfre.sh/v1',
        description: 'Production V1 API',
      },
      {
        url: 'https://api.keepfre.sh/v1',
        description: 'Staging V1 API',
      },
    ],
  });

  app.get(
    '/scalar',
    Scalar({
      url: 'doc',
      theme: 'bluePlanet',
      favicon: 'https://keepfre.sh/favicon.ico',
      pageTitle: 'KeepFresh API',
    }),
  );

  return app;
};
