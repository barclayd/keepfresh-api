import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import { supabaseMiddleware } from '@/middleware/db';
import {
  InventoryGETSchemaResponse,
  InventoryItemAddResponse,
  InventoryItemInput,
  InventoryItemSuggestions,
  ProductInput,
  UpdateInventoryItemInput,
} from '@/schemas/inventory';
import { ProductSearchItemsSchema } from '@/schemas/product';

export const InventorySuggestionsSchemaResponse = {
  200: InventoryItemSuggestions,
  400: z.object({
    error: z.string().openapi({
      example: 'Invalid grocery item name',
      description: 'Error message describing what went wrong',
    }),
    details: z
      .array(
        z.object({
          field: z.string().openapi({ example: 'name' }),
          message: z.string().openapi({ example: 'Invalid grocery item name' }),
        }),
      )
      .optional()
      .openapi({
        description: 'Detailed validation errors for each field',
      }),
  }),
  401: z.object({
    error: z.string().openapi({
      example: 'Invalid API key',
      description: 'Authentication error message describing what went wrong',
    }),
    details: z
      .array(
        z.object({
          header: z.string().openapi({ example: 'Authorization' }),
          message: z
            .string()
            .openapi({ example: 'Missing Bearer from Authorization header' }),
        }),
      )
      .optional()
      .openapi({
        description: 'Detailed validation errors for each field',
      }),
  }),
  500: z.object({
    success: z.boolean().openapi({
      example: false,
    }),
    error: z.string().openapi({
      example: 'Internal server error',
      description: 'Generic error message for server issues',
    }),
  }),
};

export const routes = {
  inventory: {
    get: createRoute({
      method: 'get',
      path: '/inventory',
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: InventoryGETSchemaResponse['200'],
            },
          },
          description: 'Success response from InventoryItemInput Gen API',
        },
        400: {
          content: {
            'application/json': {
              schema: InventoryGETSchemaResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
        401: {
          content: {
            'application/json': {
              schema: InventoryGETSchemaResponse['401'],
            },
          },
          description: 'Authorization error response from Grocery Item API',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
    add: createRoute({
      method: 'post',
      path: '/inventory/items',
      request: {
        body: {
          content: {
            'application/json': {
              schema: InventoryItemInput,
            },
          },
        },
      },
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['200'],
            },
          },
          description: 'Success response from InventoryItemInput Gen API',
        },
        400: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
        401: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['401'],
            },
          },
          description: 'Authorization error response from Grocery Item API',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
    update: createRoute({
      method: 'patch',
      path: '/inventory/items/{inventoryItemId}',
      request: {
        params: z.object({
          inventoryItemId: z.coerce.number(),
        }),
        body: {
          content: {
            'application/json': {
              schema: UpdateInventoryItemInput,
            },
          },
        },
      },
      middleware: [supabaseMiddleware],
      responses: {
        204: {
          description: 'Successfully updated inventory item',
        },
        400: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
        401: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['401'],
            },
          },
          description: 'Authorization error response from Grocery Item API',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
    // /inventory/preview -> wrapper
  },
  products: {
    list: createRoute({
      method: 'get',
      path: '/products',
      middleware: [supabaseMiddleware],
      request: {
        query: z.object({
          search: z.string(),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                products: ProductSearchItemsSchema,
              }),
            },
          },
          description: 'Success response from InventoryItemInput Gen API',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
    resolve: createRoute({
      method: 'post',
      path: '/products/resolve',
      middleware: [supabaseMiddleware],
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                product: ProductInput,
              }),
            },
          },
        },
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                productId: z.number(),
              }),
            },
          },
          description: 'Success response from InventoryItemInput Gen API',
        },
        400: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
    // /products/{id}/prediction-context
  },
  categories: {
    inventorySuggestions: createRoute({
      method: 'get',
      path: '/categories/{categoryId}/inventory-suggestions',
      request: {
        params: z.object({
          categoryId: z.string(),
        }),
      },
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: InventorySuggestionsSchemaResponse['200'],
            },
          },
          description: 'Success response from InventoryItemInput Gen API',
        },
        400: {
          content: {
            'application/json': {
              schema: InventorySuggestionsSchemaResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
        401: {
          content: {
            'application/json': {
              schema: InventorySuggestionsSchemaResponse['401'],
            },
          },
          description: 'Authorization error response from Grocery Item API',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
  },
};
