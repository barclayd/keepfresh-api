import { createRoute } from '@hono/zod-openapi';
import * as z from 'zod';
import { Units } from '@/helpers/product';
import { supabaseMiddleware } from '@/middleware/db';
import {
  InventoryGETSchemaResponse,
  InventoryItemAddResponse,
  InventoryItemInput,
  InventoryItemSuggestions,
  ProductInput,
  UpdateInventoryItemInput,
} from '@/schemas/inventory';
import {
  ProductSearchItemSchema,
  ProductSearchItemsSchema,
} from '@/schemas/product';

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
    preview: createRoute({
      method: 'post',
      path: '/inventory/preview',
      request: {
        body: {
          content: {
            'application/json': {
              schema: z.object({
                product: z.object({
                  name: z.string(),
                  brand: z.string(),
                  barcode: z.string().optional(),
                  unit: z.enum(Units).optional(),
                  amount: z.float32().optional(),
                  sourceId: z.int(),
                  categoryId: z.coerce.number(),
                  sourceRef: z.string(),
                }),
              }),
            },
          },
        },
      },
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                productId: z.int(),
                predictions: z.object({
                  productHistory: z.object({
                    purchaseCount: z.number(),
                    consumedCount: z.number(),
                    usagePercentages: z.array(z.number()),
                    averageUsage: z.number(),
                    medianUsage: z.number().optional(),
                    standardDeviation: z.number(),
                    averageDaysToConsumeOrDiscarded: z.number(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                  categoryHistory: z.object({
                    purchaseCount: z.number(),
                    averageUsage: z.number(),
                    medianUsage: z.number().optional(),
                    standardDeviation: z.number(),
                    averageDaysToConsumeOrDiscarded: z.number(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                  userBaseline: z.object({
                    averageUsage: z.number(),
                    medianUsage: z.number().optional(),
                    totalItemsCount: z.number(),
                    averageDaysToConsumeOrDiscarded: z.number(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                }),
                suggestions: InventoryItemSuggestions,
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
    random: createRoute({
      method: 'get',
      path: '/products/random',
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                product: ProductSearchItemSchema,
              }),
            },
          },
          description: 'Success response from product/random endpoint',
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
    prediction: createRoute({
      method: 'get',
      path: '/products/{productId}/prediction',
      request: {
        params: z.object({
          productId: z.coerce.number(),
        }),
      },
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                predictions: z.object({
                  productOpenedHistory: z.object({
                    medianUsagePercentage: z
                      .number()
                      .min(0)
                      .max(100)
                      .nullable(),
                    medianDaysToOutcome: z.number().min(0).nullable(),
                  }),
                  categoryOpenedHistory: z.object({
                    medianUsagePercentage: z
                      .number()
                      .min(0)
                      .max(100)
                      .nullable(),
                    medianDaysToOutcome: z.number().min(0).nullable(),
                  }),
                  userOpenedBaseline: z.object({
                    medianUsagePercentage: z
                      .number()
                      .min(0)
                      .max(100)
                      .nullable(),
                    medianDaysToOutcome: z.number().min(0).nullable(),
                  }),
                }),
                suggestions: z.object({
                  opened: z.object({
                    pantry: z.int().nullable(),
                    fridge: z.int().nullable(),
                    freezer: z.int().nullable(),
                  }),
                }),
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
  },
  images: {
    genmoji: {
      add: createRoute({
        method: 'post',
        path: '/images/genmoji',
        request: {
          body: {
            content: {
              'application/json': {
                schema: z.object({
                  name: z.string(),
                  contentIdentifier: z.string(),
                  contentDescription: z.string(),
                  imageContent: z.base64(),
                  contentType: z.string(),
                }),
              },
            },
          },
        },
        middleware: [supabaseMiddleware],
        responses: {
          201: {
            description: 'Successfully created',
          },
          400: {
            content: {
              'application/json': {
                schema: InventoryItemAddResponse['400'],
              },
            },
            description: 'Error occurred when creating genmojji',
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
    },
  },
};
