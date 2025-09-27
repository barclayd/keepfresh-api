import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createClient } from '@supabase/supabase-js';
import { objectToCamel, objectToSnake } from 'ts-case-convert';
import { search } from '@/clients/open-food-facts';
import { env } from '@/config/env';
import { storageLocationDbToStorageLocationMap } from '@/helpers/storage-location';
import { routes } from '@/routes/api';
import {
  expiryTypeDbToExpiryTypeCodec,
  InventoryItemSuggestions,
  InventoryItemsSchema,
  storageLocationDbCodec,
} from '@/schemas/inventory';
import type { Database } from '@/types/database';
import type { HonoEnvironment } from '@/types/hono';

export const createV1Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(routes.inventory.get, async (c) => {
    const { data, error } = await c
      .get('supabase')
      .from('inventory_items')
      .select(`
    id,
    created_at,
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
      categories (
        name,
        image_url,
        icon,
        path_display
      ),
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
          expiry_type: expiryTypeDbToExpiryTypeCodec.encode(
            inventoryItemInput.product.expiryType,
          ),
          storage_location: storageLocationDbCodec.encode(
            inventoryItemInput.product.storageLocation,
          ),
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
        storage_location:
          storageLocationDbToStorageLocationMap[
            inventoryItemInput.item.storageLocation
          ],
        expiry_type: expiryTypeDbToExpiryTypeCodec.encode(
          inventoryItemInput.product.expiryType,
        ),
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

    const { status, storageLocation } = c.req.valid('json');

    const { error } = await c
      .get('supabase')
      .from('inventory_items')
      .update({
        ...(storageLocation
          ? {
              storage_location: 'freezer',
              location_changed_at: new Date().toISOString(),
            }
          : {}),
        ...(status
          ? {
              status,
              opened_at: status === 'opened' ? new Date().toISOString() : null,
            }
          : {}),
      })
      .eq('id', inventoryItemId);

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

  app.openapi(routes.products.list, async (c) => {
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

  app.openapi(routes.categories.inventorySuggestions, async (c) => {
    const { categoryId } = c.req.valid('param');

    const { data, error } = await c
      .get('supabase')
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
      expiryType: expiryTypeDbToExpiryTypeCodec.decode(data.expiry_type),
      recommendedStorageLocation: storageLocationDbCodec.decode(
        data.recommended_storage_location,
      ),
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
