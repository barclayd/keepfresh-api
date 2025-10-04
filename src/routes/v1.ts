import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { objectToCamel, objectToSnake } from 'ts-case-convert';
import { search } from '@/clients/open-food-facts';
import { routes } from '@/routes/api';
import {
  InventoryItemSuggestions,
  InventoryItemsSchema,
} from '@/schemas/inventory';
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
    expiry_date,
    expiry_type,
    product:products (
      id,
      name,
      brand,
      image_url,
      category:categories (
        name,
        image_url,
        icon,
        path_display
      ),
      amount,
      unit
    )
  `)
      .eq('user_id', '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2')
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

    return c.json(
      {
        inventoryItems: inventoryItems.data,
      },
      200,
    );
  });

  app.openapi(routes.inventory.add, async (c) => {
    const inventoryItemInput = c.req.valid('json');

    // add userId to context - need to explore how I can manage sessions. Better auth?

    // authenticate user in middleware, retrieve userId from context

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

    const inventoryItemsResponse = await c
      .get('supabase')
      .from('inventory_items')
      .insert({
        ...objectToSnake(inventoryItemInput.item),
        product_id: productId,
        user_id: '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2',
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

    const { status, storageLocation, percentageRemaining } =
      c.req.valid('json');

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

    const userId = '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2';

    const productHistoryResponse = await supabase
      .from('inventory_items')
      .select('percentage_remaining, created_at, consumed_at, discarded_at')
      .eq('product_id', productId)
      .in('status', ['consumed', 'discarded']);

    if (productHistoryResponse.error) {
      return c.json(
        {
          error: `Error occurred retrieving product history. Error=${JSON.stringify(productHistoryResponse.error)}`,
        },
        400,
      );
    }

    const productUsagePercentages = productHistoryResponse.data.map(
      (item) => 100 - item.percentage_remaining,
    );

    const productDaysToConsumeOrDiscard = productHistoryResponse.data
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
        predictions: {
          productHistory: {
            purchaseCount: productUsagePercentages.length,
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

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: `"Authorization": "Bearer token"`,
  });

  app.doc31('/doc', {
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'AnyVan InventoryItemInput Gen API',
      description:
        'Use this API to send leads to Anyvan.\n\nThe API is authenticated with Bearer Authentication, providing a header of "Authentication": "Bearer {your_token}."\n\nThe minimum information required for a lead: moveDetails.contactDetails.email, moveDetails.contactDetails.firstname, moveDetails.contactDetails.lastname.\n\nIf you need any support with this API, please contact daniel.barclay@anyvan.com.',
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
      favicon: 'https://www.anyvan.com/favicon.ico',
      pageTitle: 'AnyVan InventoryItemInput Gen API',
    }),
  );

  return app;
};
