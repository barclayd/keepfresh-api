import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { objectToCamel, objectToSnake } from 'ts-case-convert';
import { getRefinedProductByBarcode } from '@/clients/open-food-facts';
import { getCategoryPath } from '@/helpers/category';
import { routes } from '@/routes/v2/routes';
import type { Genmoji } from '@/schemas/genmoji';
import {
  InventoryItemSchema,
  InventoryItemSuggestions,
  InventoryItemsSchema,
} from '@/schemas/inventory';
import {
  RefinedProductSearchItemSchema,
  RefinedProductSearchItemsSchema,
} from '@/schemas/product';
import {
  ShoppingItemSchema,
  ShoppingItemStatus,
  ShoppingItemsSchema,
} from '@/schemas/shopping';
import { InactiveInventoryItemStatus } from '@/types/category';
import type { HonoEnvironment } from '@/types/hono';
import { calculateDaysBetween } from '@/utils/date';
import logger from '@/utils/logger';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  toTwoDecimalPlaces,
} from '@/utils/maths';
import holidaysJSON from '../../data/holidays.json';

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

  app.openapi(routes.inventory.history, async (c) => {
    const { cursor } = c.req.valid('query');

    const userId = c.get('userId');

    let query = c
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
        path_display,
        expiry_type
      ),
      amount,
      unit
    )
  `)
      .eq('user_id', userId)
      .in('status', InactiveInventoryItemStatus)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (cursor) {
      query = query.lt('updated_at', cursor);
    }

    const { data, error } = await query;

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

  app.openapi(routes.products.list, async (c) => {
    const requestStartTime = performance.now();
    const requestId = c.get('requestId');
    const userId = c.get('userId');
    const log = logger.child({ requestId, userId, endpoint: '/v2/products' });

    const { search: searchTerm, country, page, limit } = c.req.valid('query');

    const offset = (page - 1) * limit;

    log.info(
      { searchTerm, country, page, limit },
      'Products search request started',
    );

    if (searchTerm.length < 2) {
      return c.json(
        {
          error: `Search term must be a minimum length of 2 characters`,
        },
        400,
      );
    }

    const dbStartTime = performance.now();
    const { data, error } = await c
      .get('supabase')
      .rpc('search_products_paginated', {
        search_query: searchTerm,
        country_code: country,
        page_limit: limit,
        page_offset: offset,
      });
    const dbDuration = performance.now() - dbStartTime;

    log.info(
      { dbDuration, rowCount: data?.length || 0 },
      'Database RPC completed',
    );

    if (error) {
      log.error({ error, dbDuration }, 'Database RPC error');
      return c.json(
        {
          error: `Error occurred during search. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const formattingStartTime = performance.now();
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
    const formattingDuration = performance.now() - formattingStartTime;

    log.info({ formattingDuration }, 'Data formatting completed');

    const totalDuration = performance.now() - requestStartTime;
    const responseSize = JSON.stringify(results).length;

    log.info(
      {
        totalDuration,
        dbDuration,
        formattingDuration,
        rowCount: results.length,
        responseSize,
      },
      'Products search request completed',
    );

    return c.json(
      {
        pagination: {
          hasNext: data[0]?.has_next ?? false,
        },
        results,
      },
      200,
    );
  });

  app.openapi(routes.products.barcode, async (c) => {
    const { barcode } = c.req.valid('param');

    const supabase = c.get('supabase');

    const { data, error } = await supabase
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
      .in('barcode', [barcode, `0${barcode}`])
      .single();

    if (error || !data) {
      const dynamicallyCreatedProduct = await getRefinedProductByBarcode(
        barcode,
        supabase,
        c.env.keepfresh_categories,
      );

      if (!dynamicallyCreatedProduct) {
        return c.json(
          {
            error: `Error occurred retrieving product with barcode=${barcode}. Error=${JSON.stringify(error)}`,
          },
          400,
        );
      }

      return c.json(dynamicallyCreatedProduct, 200);
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

  app.openapi(routes.products.random, async (c) => {
    const productIds = [
      65316, 18476, 81342, 63519, 151471, 151309, 52617, 36007, 7278, 153250,
    ];

    const randomProductId =
      productIds[Math.floor(Math.random() * productIds.length)] ?? 65316;

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

  app.openapi(routes.shopping.get, async (c) => {
    const userId = c.get('userId');

    const { data, error } = await c
      .get('supabase')
      .from('shopping_items')
      .select(`
    id,
    created_at,
    updated_at,
    status,
    title,
    source,
    storage_location,
    product:products (
      id,
      name,
      barcode,
      brand,
      category:categories (
        id,
        name,
        icon,
        path_display,
        expiry_type
      ),
      amount,
      unit
    )
  `)
      .eq('user_id', userId)
      .eq('status', 'created');

    if (error) {
      return c.json(
        {
          error: `Error occurred retrieving shopping items. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const shoppingItems = ShoppingItemsSchema.safeParse(objectToCamel(data));

    if (!shoppingItems.success) {
      return c.json(
        {
          error: `Error occurred parsing shopping items. Error=${JSON.stringify(shoppingItems.error)}`,
        },
        400,
      );
    }

    return c.json(shoppingItems.data, 200);
  });

  app.openapi(routes.shopping.barcode, async (c) => {
    const { barcode } = c.req.valid('param');

    const supabase = c.get('supabase');

    const userId = c.get('userId');

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        expiry_type,
        storage_location,
        category_id
      `)
      .in('barcode', [barcode, `0${barcode}`])
      .single();

    if (error || !data) {
      return c.json(
        {
          error: `Error occurred retrieving product with barcode=${barcode}. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const shoppingItemsResponse = await c
      .get('supabase')
      .from('shopping_items')
      .insert({
        product_id: data.id,
        user_id: userId,
        source: 'user',
        storage_location: data.storage_location,
        status: 'created',
      })
      .select(
        `
    id,
    created_at,
    updated_at,
    storage_location,
    product:products (
      id,
      name,
      barcode,
      brand,
      category:categories (
        id,
        name,
        icon,
        path_display,
        expiry_type
      ),
      amount,
      unit
    )
  `,
      )
      .single();

    if (shoppingItemsResponse.error || !shoppingItemsResponse.data) {
      return c.json(
        {
          error: `Error occurred retrieving product with barcode=${barcode}. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const { id, createdAt, updatedAt, storageLocation, product } =
      objectToCamel(shoppingItemsResponse.data);

    const shoppingItem = ShoppingItemSchema.safeParse({
      id,
      createdAt,
      updatedAt,
      status: 'created',
      source: 'user',
      storageLocation,
      product,
    });

    if (!shoppingItem.success) {
      return c.json(
        {
          error: `Error occurred parsing created shopping item. Error=${JSON.stringify(shoppingItem.error)}`,
        },
        400,
      );
    }

    return c.json(shoppingItem.data, 200);
  });

  app.openapi(routes.shopping.add, async (c) => {
    const { title, productId, storageLocation, source, quantity } =
      c.req.valid('json');

    const userId = c.get('userId');

    const shoppingItemsToInsert = Array.from({ length: quantity }, () => ({
      product_id: productId,
      user_id: userId,
      source,
      title,
      storage_location: storageLocation,
      status: 'created',
    }));

    const shoppingItemsResponse = await c
      .get('supabase')
      .from('shopping_items')
      .insert(shoppingItemsToInsert)
      .select(
        `
    id,
    created_at,
    updated_at,
    storage_location,
    product:products (
      id,
      name,
      barcode,
      brand,
      category:categories (
        id,
        name,
        icon,
        path_display,
        expiry_type
      ),
      amount,
      unit
    )
  `,
      );

    if (shoppingItemsResponse.error) {
      return c.json(
        {
          error: `Error occurred creating shopping item(s). Error=${JSON.stringify(shoppingItemsResponse.error)}`,
        },
        400,
      );
    }

    const result = ShoppingItemsSchema.safeParse(
      shoppingItemsResponse.data.map((shoppingItem) => {
        const { id, createdAt, updatedAt, storageLocation, product } =
          objectToCamel(shoppingItem);

        return {
          id,
          createdAt,
          updatedAt,
          title,
          status: 'created',
          source,
          storageLocation,
          product,
        };
      }),
    );

    if (!result.success) {
      return c.json(
        {
          error: `Error occurred creating shopping item(s). Error=${JSON.stringify(result.error)}`,
        },
        400,
      );
    }

    return c.json(result.data, 200);
  });

  app.openapi(routes.shopping.update, async (c) => {
    const { shoppingItemId } = c.req.valid('param');

    const { status, title, storageLocation } = c.req.valid('json');

    const userId = c.get('userId');

    const { error } = await c
      .get('supabase')
      .from('shopping_items')
      .update({
        ...(storageLocation && {
          storage_location: storageLocation,
        }),
        ...(status && { status }),
        ...(title && { title }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', shoppingItemId)
      .eq('user_id', userId);

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

  app.openapi(routes.shopping.delete, async (c) => {
    const { shoppingItemId } = c.req.valid('param');

    const userId = c.get('userId');

    const response = await c
      .get('supabase')
      .from('shopping_items')
      .delete()
      .eq('id', shoppingItemId)
      .eq('user_id', userId)
      .single();

    if (response.error) {
      return c.json(
        {
          error: `Error occurred deleting shopping item. Error=${JSON.stringify(response.error)}`,
        },
        400,
      );
    }

    return c.body(null, 204);
  });

  app.openapi(routes.shopping.complete, async (c) => {
    const { shoppingItemId } = c.req.valid('param');
    const { expiryDate } = c.req.valid('json');

    const userId = c.get('userId');

    const shoppingItemsResponse = await c
      .get('supabase')
      .from('shopping_items')
      .update({
        status: ShoppingItemStatus.enum.completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shoppingItemId)
      .eq('user_id', userId)
      .neq('status', ShoppingItemStatus.enum.completed)
      .select(
        'storage_location, product_id, product:products!inner(category:categories!inner(expiry_type))',
      )
      .single();

    if (shoppingItemsResponse.error) {
      return c.json(
        {
          error: `Error occurred updating inventory item. Error=${JSON.stringify(shoppingItemsResponse.error)}`,
        },
        400,
      );
    }

    if (!shoppingItemsResponse.data.storage_location) {
      return c.json(
        {
          error: `Error occurred updating inventory item, no storageLocation found. Error=${JSON.stringify(shoppingItemsResponse.error)}`,
        },
        400,
      );
    }

    if (!shoppingItemsResponse.data.product_id) {
      return c.json(
        {
          error: `Error occurred updating inventory item, no productId found. Error=${JSON.stringify(shoppingItemsResponse.error)}`,
        },
        400,
      );
    }

    const inventoryItemResponse = await c
      .get('supabase')
      .from('inventory_items')
      .insert({
        storage_location: shoppingItemsResponse.data.storage_location,
        user_id: userId,
        product_id: shoppingItemsResponse.data.product_id,
        expiry_date: expiryDate,
        expiry_type: shoppingItemsResponse.data.product.category.expiry_type,
      })
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
        path_display,
        expiry_type
      ),
      amount,
      unit
    )`)
      .single();

    if (inventoryItemResponse.error || !inventoryItemResponse.data) {
      return c.json(
        {
          error: `Error occurred creating inventory item. Error=${JSON.stringify(inventoryItemResponse.error)}`,
        },
        400,
      );
    }

    const inventoryItem = InventoryItemSchema.safeParse(
      objectToCamel(inventoryItemResponse.data),
    );

    if (!inventoryItem.success) {
      return c.json(
        {
          error: `Error occurred parsing inventory item. Error=${JSON.stringify(inventoryItem.error)}`,
        },
        400,
      );
    }

    return c.json(inventoryItem.data, 200);
  });

  app.openapi(routes.shopping.session.add, async (c) => {
    const { createdAt, updatedAt, shoppingItems } = c.req.valid('json');

    const userId = c.get('userId');

    const { data: session, error: sessionCreationError } = await c
      .get('supabase')
      .from('shopping_sessions')
      .insert({ user_id: userId, created_at: createdAt, updated_at: updatedAt })
      .select('id')
      .single();

    if (sessionCreationError) {
      return c.json(
        {
          error: `Error occurred creating shopping session. Error=${JSON.stringify(sessionCreationError)}`,
        },
        400,
      );
    }

    const { data: updatedShoppingItems, error: updatedShoppingItemsError } =
      await c
        .get('supabase')
        .from('shopping_items')
        .update({
          shopping_session_id: session.id,
          updated_at: updatedAt,
          status: 'completed',
        })
        .in(
          'id',
          shoppingItems.map((shoppingItem) => shoppingItem.shoppingItemId),
        )
        .select('id, product_id, storage_location');

    if (!updatedShoppingItems || updatedShoppingItemsError) {
      return c.json(
        {
          error: `Error occurred updating shopping items within shopping session. Error=${JSON.stringify(updatedShoppingItemsError)}`,
        },
        400,
      );
    }

    const expiryByItemId = new Map(
      shoppingItems.map((item) => [item.shoppingItemId, item.expiryDate]),
    );

    const inventoryItemsToInsert = updatedShoppingItems
      .filter(
        (
          item,
        ): item is typeof item & {
          product_id: number;
          storage_location: 'pantry' | 'fridge' | 'freezer';
        } => item.product_id !== null && item.storage_location !== null,
      )
      .map((item) => ({
        product_id: item.product_id,
        storage_location: item.storage_location,
        expiry_date: expiryByItemId.get(item.id),
        user_id: userId,
      }));

    const inventoryItemsResponse = await c
      .get('supabase')
      .from('inventory_items')
      .insert(inventoryItemsToInsert)
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
        path_display,
        expiry_type
      ),
      amount,
      unit
    )`);

    if (inventoryItemsResponse.error || !inventoryItemsResponse.data) {
      return c.json(
        {
          error: `Error occurred creating inventory item. Error=${JSON.stringify(inventoryItemsResponse.error)}`,
        },
        400,
      );
    }

    const inventoryItems = InventoryItemsSchema.safeParse(
      inventoryItemsResponse.data.map((inventoryItem) =>
        objectToCamel(inventoryItem),
      ),
    );

    if (!inventoryItems.success) {
      return c.json(
        {
          error: `Error occurred parsing inventory item. Error=${JSON.stringify(inventoryItems.error)}`,
        },
        400,
      );
    }

    return c.json(inventoryItems.data, 200);
  });

  app.openapi(routes.confetti.get, async (c) => {
    const { timeZone } = c.req.valid('query');

    type HolidayEntry = {
      name: string;
      genmoji: string[];
    };

    const holidays: Record<string, HolidayEntry> = holidaysJSON;

    const now = new Date();

    const dateString = now.toLocaleDateString('en-CA', { timeZone });

    const holiday = holidays[dateString];

    if (!holiday?.genmoji.length) {
      return c.body(null, 204);
    }

    const results = (
      await Promise.all(
        holiday.genmoji.map(async (name) => {
          const genmoji = await c.env.keepfresh_genmoji.get<Genmoji>(
            `genmoji:${name.toLowerCase()}`,
            'json',
          );
          return genmoji ? { name, genmoji } : [];
        }),
      )
    ).flat();

    return c.json(results, 200);
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
