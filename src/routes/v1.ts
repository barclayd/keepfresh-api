import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createClient } from '@supabase/supabase-js';
import { objectToCamel } from 'ts-case-convert';
import { search } from '@/clients/open-food-facts';
import { env } from '@/config/env';
import { expiryTypeMap } from '@/helpers/expiry';
import { storageLocationMap } from '@/helpers/storage-location';
import { categoryInventorySuggestionsRoute } from '@/routes/category';
import {
  inventoryGETRoute,
  inventoryItemRoutePOST,
  productSearchGETRoute,
} from '@/routes/inventory';
import {
  InventoryItemSuggestions,
  InventoryItemsSchema,
} from '@/schemas/inventory';
import type { Database } from '@/types/database';
import type { HonoEnvironment } from '@/types/hono';

export const createV1Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(inventoryGETRoute, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
      id,
      created_at,
      consumption_prediction,
      status,
      storage_location,
      products (
        id,
        name,
        brand,
        image_url,
        category,
        amount,
        unit
      )
      `)
      .eq('user_id', '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2');

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

  app.openapi(inventoryItemRoutePOST, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const _groceryItem = c.req.valid('json');

    const inventoryItem = await supabase
      .from('inventory_items')
      .insert({
        user_id: '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2',
        grocery_item_id: 1,
        storage_location: 'fridge',
      })
      .select();

    if (inventoryItem.error) {
      return c.json(
        {
          error: `Error occurred creating food item. Error=${JSON.stringify(inventoryItem.error)}`,
        },
        400,
      );
    }

    return c.json(
      {
        inventoryItemId: String(inventoryItem.data[0]?.id),
      },
      200,
    );
  });

  app.openapi(productSearchGETRoute, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const { search: searchTerm } = c.req.valid('query');

    const products = await search(searchTerm, supabase);

    return c.json(
      {
        products,
      },
      200,
    );
  });

  app.openapi(categoryInventorySuggestionsRoute, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const { categoryId } = c.req.valid('param');

    const { data, error } = await supabase
      .from('categories')
      .select(`
      id,
      expiry_type,
      recommended_storage_location,
      shelf_life_in_pantry_in_days_unopened,
      shelf_life_in_pantry_in_days_opened,
      shelf_life_in_fridge_in_days_unopened,
      shelf_life_in_fridge_in_days_opened,
      shelf_life_in_freezer_in_days_unopened,
      shelf_life_in_freezer_in_days_opened
    `)
      .eq('id', parseInt(categoryId, 10))
      .single();

    if (error || !data) {
      return c.json(
        {
          error: `Error occurred retrieving food items. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const inventoryItemSuggestion = {
      shelfLifeInDays: {
        opened: {
          pantry: data.shelf_life_in_pantry_in_days_opened,
          fridge: data.shelf_life_in_fridge_in_days_opened,
          freezer: data.shelf_life_in_freezer_in_days_opened,
        },
        unopened: {
          pantry: data.shelf_life_in_pantry_in_days_unopened,
          fridge: data.shelf_life_in_fridge_in_days_unopened,
          freezer: data.shelf_life_in_freezer_in_days_unopened,
        },
      },
      expiryType: expiryTypeMap[data.expiry_type],
      recommendedStorageLocation:
        storageLocationMap[data.recommended_storage_location],
    };

    const inventoryItemSuggestions = InventoryItemSuggestions.parse(
      inventoryItemSuggestion,
    );

    return c.json(inventoryItemSuggestions, 200);
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
        url: 'https://lead-gen-api.anyvan.com/v1',
        description: 'Production V1 API',
      },
      {
        url: 'https://stage-lead-gen-api.anyvan.com/v1',
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
