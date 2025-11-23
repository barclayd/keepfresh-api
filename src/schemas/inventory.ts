import { z } from '@hono/zod-openapi';
import { Units } from '@/helpers/product';
import { InventoryItemStatus } from '@/types/category';
import type { Database } from '@/types/database';
import {
  expiryTypeFieldMapper,
  storageLocationFieldMapper,
} from '@/utils/field-mapper';
import { nullToOptional } from '@/utils/zod';

export const ProductInput = z.object({
  name: z.string(),
  brand: z.string(),
  expiryType: expiryTypeFieldMapper.inputSchema,
  storageLocation: storageLocationFieldMapper.inputSchema,
  barcode: z.string().optional(),
  unit: z.enum(Units).optional(),
  amount: z.float32().optional(),
  categoryId: z.int(),
  sourceId: z.int(),
  sourceRef: z.string(),
});

export const InventoryItemInput = z.object({
  item: z.object({
    expiryDate: z.iso.datetime().optional(),
    storageLocation: storageLocationFieldMapper.inputSchema,
    status: z.enum(InventoryItemStatus),
    expiryType: expiryTypeFieldMapper.inputSchema,
    consumptionPrediction: z.int().optional(),
  }),
  product: ProductInput,
  quantity: z.number().optional(),
});

export const RefinedInventoryItemInput = z.object({
  item: z.object({
    expiryDate: z.iso.datetime().optional(),
    storageLocation: storageLocationFieldMapper.inputSchema,
    status: z.enum(InventoryItemStatus),
    expiryType: expiryTypeFieldMapper.inputSchema,
    consumptionPrediction: z.int().optional(),
  }),
  productId: z.number(),
  quantity: z.number().default(1),
});

export const UpdateInventoryItemInput = z
  .object({
    status: z.enum(InventoryItemStatus).optional(),
    storageLocation: storageLocationFieldMapper.inputSchema.optional(),
    percentageRemaining: z.int().optional(),
    consumptionPrediction: z.int().optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.storageLocation !== undefined,
    { message: 'Either status or storageLocation must be provided' },
  );

const status: Array<
  Database['public']['Tables']['inventory_items']['Row']['status']
> = ['opened', 'unopened', 'consumed', 'discarded'] as const;

export const timestampzTransformer = z
  .string()
  .transform((raw, ctx) => {
    const iso = raw.replace(' ', 'T');
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid timestamptz: ${raw}`,
      });
      return z.NEVER;
    }

    return date.toISOString();
  })
  .pipe(z.iso.datetime());

export const InventoryItemSchema = z.object({
  id: z.number(),
  createdAt: timestampzTransformer,
  updatedAt: timestampzTransformer,
  openedAt: nullToOptional(timestampzTransformer),
  status: z.enum(status),
  storageLocation: storageLocationFieldMapper.outputSchema,
  consumptionPrediction: z.number(),
  consumptionPredictionChangedAt: nullToOptional(timestampzTransformer),
  expiryDate: timestampzTransformer,
  expiryType: expiryTypeFieldMapper.outputSchema,
  product: z.object({
    id: z.number(),
    name: z.string(),
    unit: nullToOptional(z.string()),
    brand: z.string(),
    amount: nullToOptional(z.number()),
    category: z.object({
      icon: nullToOptional(z.string()),
      id: z.int(),
      name: z.string(),
      pathDisplay: z.string(),
      expiryType: expiryTypeFieldMapper.outputSchema,
    }),
  }),
});

export const InventoryItemsSchema = z.array(InventoryItemSchema);

export const InventoryItemSuggestions = z.object({
  shelfLifeInDays: z.object({
    opened: z.object({
      pantry: nullToOptional(z.int()),
      fridge: nullToOptional(z.int()),
      freezer: nullToOptional(z.int()),
    }),
    unopened: z.object({
      pantry: nullToOptional(z.int()),
      fridge: nullToOptional(z.int()),
      freezer: nullToOptional(z.int()),
    }),
  }),
  expiryType: expiryTypeFieldMapper.outputSchema,
  recommendedStorageLocation: storageLocationFieldMapper.outputSchema,
});

export type InventoryItemInput = z.infer<typeof InventoryItemInput>;

export const InventoryItemAddResponse = {
  200: z
    .object({
      inventoryItemId: z.int(),
    })
    .or(
      z.object({
        inventoryItemIds: z.array(z.int()),
      }),
    ),
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

export const InventoryGETSchemaResponse = {
  200: InventoryItemsSchema,
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
