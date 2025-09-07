import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createClient } from '@supabase/supabase-js';
import { objectToCamel } from 'ts-case-convert';
import { env } from '@/config/env';
import {
  groceryItemsGETRoute,
  groceryItemsPOSTRoute,
} from '@/routes/grocery-items';
import { UserGroceryItems } from '@/schemas/grocery-item';
import type { Database } from '@/types/database.ts';
import type { HonoEnvironment } from '@/types/hono';

export const createV1Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(groceryItemsGETRoute, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const { data, error } = await supabase
      .from('user_grocery_item')
      .select(`
      id,
      created_at,
      consumption_prediction,
      status,
      storage_location,
      grocery_item (
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

    const userGroceryItemsResult = UserGroceryItems.safeParse(
      objectToCamel(data),
    );

    if (!userGroceryItemsResult.success) {
      return c.json(
        {
          error: `Error occurred parsing food items. Error=${JSON.stringify(userGroceryItemsResult.error)}`,
        },
        400,
      );
    }

    return c.json(
      {
        groceryItems: userGroceryItemsResult.data,
      },
      200,
    );
  });

  app.openapi(groceryItemsPOSTRoute, async (c) => {
    const supabase = createClient<Database>(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE,
    );

    const _groceryItem = c.req.valid('json');

    const userGroceryItem = await supabase
      .from('user_grocery_item')
      .insert({
        user_id: '7d6ec109-db40-4b94-b4ef-fb5bbc318ff2',
        grocery_item_id: 1,
        storage_location: 'fridge',
      })
      .select();

    if (userGroceryItem.error) {
      return c.json(
        {
          error: `Error occurred creating food item. Error=${JSON.stringify(userGroceryItem.error)}`,
        },
        400,
      );
    }

    return c.json(
      {
        groceryItemId: String(userGroceryItem.data[0]?.id ?? '999'),
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
      title: 'AnyVan GroceryItem Gen API',
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
      pageTitle: 'AnyVan GroceryItem Gen API',
    }),
  );

  return app;
};
