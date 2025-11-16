import { createRoute } from '@hono/zod-openapi';
import * as z from 'zod';
import { authMiddleware } from '@/middleware/auth';
import { supabaseMiddleware } from '@/middleware/db';
import {
  InventoryItemAddResponse,
  InventoryItemSuggestions,
  RefinedInventoryItemInput,
} from '@/schemas/inventory';
import {
  PaginatedProductSearchSchema,
  RefinedProductSearchItemSchema,
} from '@/schemas/product';
import { ShoppingItemsSchema } from '@/schemas/shopping';
import { InventoryItemStatus } from '@/types/category';
import { storageLocationFieldMapper } from '@/utils/field-mapper';

export const routes = {
  inventory: {
    preview: createRoute({
      method: 'get',
      path: '/inventory/items/preview',
      request: {
        query: z.object({
          productId: z.coerce.number(),
          categoryId: z.coerce.number(),
        }),
      },
      middleware: [supabaseMiddleware, authMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                predictions: z.object({
                  productHistory: z.object({
                    purchaseCount: z.number(),
                    consumedCount: z.number(),
                    usagePercentages: z.array(z.number()),
                    averageUsage: z.number().optional(),
                    medianUsage: z.number().optional(),
                    standardDeviation: z.number().optional(),
                    averageDaysToConsumeOrDiscarded: z.number().optional(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                  categoryHistory: z.object({
                    purchaseCount: z.number(),
                    averageUsage: z.number().optional(),
                    medianUsage: z.number().optional(),
                    standardDeviation: z.number().optional(),
                    averageDaysToConsumeOrDiscarded: z.number().optional(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                  userBaseline: z.object({
                    averageUsage: z.number().optional(),
                    medianUsage: z.number().optional(),
                    totalItemsCount: z.number(),
                    averageDaysToConsumeOrDiscarded: z.number().optional(),
                    medianDaysToConsumeOrDiscarded: z.number().optional(),
                  }),
                }),
                suggestions: InventoryItemSuggestions,
              }),
            },
          },
          description: 'Success response from KeepFresh API',
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
    add: createRoute({
      method: 'post',
      path: '/inventory/items',
      request: {
        body: {
          content: {
            'application/json': {
              schema: RefinedInventoryItemInput,
            },
          },
        },
      },
      middleware: [supabaseMiddleware, authMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['200'],
            },
          },
          description: 'Success response from KeepFresh API',
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
    delete: createRoute({
      method: 'delete',
      path: '/inventory/items/{inventoryItemId}',
      request: {
        params: z.object({
          inventoryItemId: z.coerce.number(),
        }),
      },
      middleware: [supabaseMiddleware, authMiddleware],
      responses: {
        204: {
          description: 'Successfully deleted inventory item',
        },
        400: {
          description: 'Error occurred when deleting inventory item',
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
              schema: z
                .object({
                  status: z.enum(InventoryItemStatus).optional(),
                  storageLocation:
                    storageLocationFieldMapper.inputSchema.optional(),
                  percentageRemaining: z.int().optional(),
                  consumptionPrediction: z.int().optional(),
                  expiryDate: z.iso.datetime().optional(),
                })
                .refine(
                  (data) =>
                    data.status !== undefined ||
                    data.storageLocation !== undefined ||
                    data.expiryDate !== undefined,
                  {
                    message:
                      'Either status, storageLocation or expiryDate must be provided',
                  },
                ),
            },
          },
        },
      },
      middleware: [supabaseMiddleware, authMiddleware],
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
  },
  products: {
    list: createRoute({
      method: 'get',
      path: '/products',
      middleware: [supabaseMiddleware, authMiddleware],
      request: {
        query: z.object({
          search: z.string(),
          country: z.string().optional().default('GB'),
          page: z.coerce.number().int().positive().optional().default(1),
          limit: z.coerce.number().int().min(1).max(100).optional().default(20),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: PaginatedProductSearchSchema,
            },
          },
          description: 'Success response from KeepFresh API',
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
    barcode: createRoute({
      method: 'get',
      path: '/products/barcode/{barcode}',
      request: {
        params: z.object({
          barcode: z.string(),
        }),
      },
      middleware: [supabaseMiddleware, authMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: RefinedProductSearchItemSchema,
            },
          },
          description: 'Success response from KeepFresh API',
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
    random: createRoute({
      method: 'get',
      path: '/products/random',
      middleware: [supabaseMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: RefinedProductSearchItemSchema,
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
  },
  shopping: {
    get: createRoute({
      method: 'get',
      path: '/shopping',
      middleware: [supabaseMiddleware, authMiddleware],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: ShoppingItemsSchema,
            },
          },
          description: 'Success response from KeepFresh API /shopping',
        },
        400: {
          content: {
            'application/json': {
              schema: z.object({
                error: z.string(),
                details: z
                  .array(
                    z.object({
                      field: z.string(),
                      message: z.string(),
                    }),
                  )
                  .optional(),
              }),
            },
          },
          description: 'Error occurred when processing payload',
        },
        401: {
          content: {
            'application/json': {
              schema: z.object({
                error: z.string(),
                details: z
                  .array(
                    z.object({
                      field: z.string(),
                      message: z.string(),
                    }),
                  )
                  .optional(),
              }),
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
};
