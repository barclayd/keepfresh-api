import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { objectToSnake } from 'ts-case-convert';
import { getCategoryPath } from '@/helpers/category';
import { routes } from '@/routes/v2/routes';
import { InventoryItemSuggestions } from '@/schemas/inventory';
import {
  RefinedProductSearchItemSchema,
  RefinedProductSearchItemsSchema,
} from '@/schemas/product';
import type { HonoEnvironment } from '@/types/hono';
import { calculateDaysBetween } from '@/utils/date';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  toTwoDecimalPlaces,
} from '@/utils/maths';

export const createV2Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(routes.inventory.add, async (c) => {
    const { item, productId, quantity } = c.req.valid('json');

    const userId = c.get('userId');

    const inventoryItemsToInsert = Array.from({ length: quantity }, () => ({
      ...objectToSnake(item),
      product_id: productId,
      user_id: userId,
      ...(item.consumptionPrediction && {
        consumption_prediction_changed_at: new Date().toISOString(),
      }),
    }));

    const inventoryItemsResponse = await c
      .get('supabase')
      .from('inventory_items')
      .insert(inventoryItemsToInsert)
      .select('id');

    if (inventoryItemsResponse.error) {
      return c.json(
        {
          error: `Error occurred creating inventory item(s). Error=${JSON.stringify(inventoryItemsResponse.error)}`,
        },
        400,
      );
    }

    return c.json(
      {
        ...(quantity === 1 && inventoryItemsResponse.data[0]
          ? { inventoryItemId: inventoryItemsResponse.data[0].id }
          : {
              inventoryItemIds: inventoryItemsResponse.data.map(
                (item) => item.id,
              ),
            }),
        count: inventoryItemsResponse.data.length,
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
      expiryDate,
    } = c.req.valid('json');

    const userId = c.get('userId');

    const { error } = await c
      .get('supabase')
      .from('inventory_items')
      .update({
        ...(storageLocation && {
          storage_location: storageLocation,
          location_changed_at: new Date().toISOString(),
        }),
        ...(expiryDate && {
          expiry_date: expiryDate,
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
      .eq('id', inventoryItemId)
      .eq('user_id', userId);
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

  app.openapi(routes.inventory.delete, async (c) => {
    const { inventoryItemId } = c.req.valid('param');

    const userId = c.get('userId');

    const response = await c
      .get('supabase')
      .from('inventory_items')
      .delete()
      .eq('id', inventoryItemId)
      .eq('user_id', userId)
      .single();

    if (response.error) {
      return c.json(
        {
          error: `Error occurred deleting inventory item. Error=${JSON.stringify(response.error)}`,
        },
        400,
      );
    }

    return c.body(null, 204);
  });

  app.openapi(routes.inventory.preview, async (c) => {
    const { productId, categoryId } = c.req.valid('query');

    const supabase = c.get('supabase');

    const userId = c.get('userId');

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
      .eq('id', categoryId)
      .single();

    if (error || !category) {
      return c.json(
        {
          error: `Error occurred retrieving category data for categoryId=${categoryId}. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

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
            purchaseCount,
            consumedCount,
            usagePercentages: productUsagePercentages
              .map((usagePercentage) => toTwoDecimalPlaces(usagePercentage))
              .filter((usagePercentage) => usagePercentage !== undefined),
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
            averageUsage: toTwoDecimalPlaces(
              calculateMean(userUsagePercentages),
            ),
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
    const { search: searchTerm, country, page, limit } = c.req.valid('query');

    const offset = (page - 1) * limit;

    if (searchTerm.length < 2) {
      return c.json(
        {
          error: `Search term must be a minimum length of 2 characters`,
        },
        400,
      );
    }

    const { data, error } = await c
      .get('supabase')
      .rpc('search_products_paginated', {
        search_query: searchTerm,
        country_code: country,
        page_limit: limit,
        page_offset: offset,
      });

    if (error) {
      return c.json(
        {
          error: `Error occurred during search. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const formattedProducts = data.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: {
        id: product.category_id,
        name: product.category_name,
        path: getCategoryPath(product.category_path_display),
        recommendedStorageLocation: product.storage_location,
      },
      icon: product.category_icon,
      ...(product.unit &&
        product.amount && {
          amount: product.amount,
          unit: product.unit,
        }),
    }));

    const results = RefinedProductSearchItemsSchema.parse(formattedProducts);

    return c.json(
      {
        pagination: {
          hasNext: data[0]
            ? Math.ceil(data[0].total_count / limit) > page
            : false,
        },
        results,
      },
      200,
    );
  });

  app.openapi(routes.products.barcode, async (c) => {
    const { barcode } = c.req.valid('param');

    const { data, error } = await c
      .get('supabase')
      .from('products')
      .select(`
        id,
        name,
        brand,
        expiry_type,
        storage_location,
        amount,
        unit,
        category_id,
        category_path_display,
        category:categories (
          icon
        )
      `)
      .eq('barcode', barcode)
      .single();

    if (error) {
      return c.json(
        {
          error: `Error occurred retrieving product with barcode=${barcode}. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const product = RefinedProductSearchItemSchema.parse({
      id: data.id,
      name: data.name,
      brand: data.brand,
      category: {
        id: data.category_id,
        path: getCategoryPath(data.category_path_display),
        name: data.category_path_display.split('.').pop(),
        recommendedStorageLocation: data.storage_location,
      },
      icon: data.category.icon,
      ...(data.unit &&
        data.amount && {
          amount: data.amount,
          unit: data.unit,
        }),
    });

    return c.json(product, 200);
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: `"Authorization": "Bearer token"`,
  });

  app.doc31('/doc', {
    openapi: '3.1.0',
    info: {
      version: '2.0.0',
      title: 'KeepFresh API',
      description: 'KeepFresh API',
    },
    servers: [
      {
        url: '/v2',
        description: 'Version 2 API',
      },
      {
        url: 'https://api.keepfre.sh/v2',
        description: 'Production V2 API',
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
