import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createClient } from '@supabase/supabase-js';
import { objectToCamel } from 'ts-case-convert';
import { env } from '@/config/env';
import { inventoryGETRoute, inventoryItemRoutePOST } from '@/routes/inventory';
import { InventoryItemsSchema } from '@/schemas/inventory';
import type { Database } from '@/types/database.ts';
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
