import { z } from '@hono/zod-openapi';
import {
  expiryTypeDbToExpiryTypeMap,
  expiryTypeToExpiryTypeDbMap,
} from '@/helpers/expiry';
import { Units } from '@/helpers/product';
import {
  storageLocationDbToStorageLocationMap,
  storageLocationMap,
} from '@/helpers/storage-location';
import { ExpiryTypeSchema } from '@/schemas/product';
import {
  ExpiryType,
  ExpiryTypeDb,
  InventoryItemStatus,
  StorageLocation,
  StorageLocationDb,
} from '@/types/category';
import type { Database } from '@/types/database';

const storageLocationDbToStorageLocation = z.codec(
  z.enum(StorageLocationDb),
  z.enum(StorageLocation),
  {
    decode: (storageLocation) => storageLocationMap[storageLocation],
    encode: (storageLocation) =>
      storageLocationDbToStorageLocationMap[storageLocation],
  },
);

const expiryTypeDbToExpiryType = z.codec(
  z.enum(ExpiryTypeDb),
  z.enum(ExpiryType),
  {
    decode: (expiryType) => expiryTypeDbToExpiryTypeMap[expiryType],
    encode: (expiryType) => expiryTypeToExpiryTypeDbMap[expiryType],
  },
);

export const InventoryItemInput = z.object({
  item: z.object({
    expiryDate: z.iso.datetime().optional(),
    storageLocation: z.enum(StorageLocation),
    status: z.enum(InventoryItemStatus),
    expiryType: z.enum(ExpiryType),
  }),
  product: z.object({
    name: z.string(),
    brand: z.string(),
    expiryType: z.enum(ExpiryType),
    storageLocation: z.enum(StorageLocation),
    barcode: z.string().optional(),
    unit: z.enum(Units).optional(),
    amount: z.float32().optional(),
    categoryId: z.int(),
    sourceId: z.int(),
    sourceRef: z.string(),
  }),
});

export const StorageLocationSchema = z.enum(StorageLocation);

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

export const InventoryItemsSchema = z.array(
  z.object({
    id: z.number(),
    createdAt: timestampzTransformer,
    openedAt: timestampzTransformer.nullable(),
    status: z.enum(status),
    storageLocation: storageLocationDbToStorageLocation,
    consumptionPrediction: z.number(),
    expiryDate: timestampzTransformer,
    expiryType: expiryTypeDbToExpiryType,
    products: z.object({
      id: z.number(),
      name: z.string(),
      unit: z.string(),
      brand: z.string(),
      amount: z.number(),
      imageUrl: z.string().nullable(),
      categories: z.object({
        icon: z.string().nullable(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        pathDisplay: z.string(),
      }),
    }),
  }),
);

export const InventoryItemSuggestions = z.object({
  shelfLifeInDays: z.object({
    opened: z.object({
      pantry: z.int().nullable(),
      fridge: z.int().nullable(),
      freezer: z.int().nullable(),
    }),
    unopened: z.object({
      pantry: z.int().nullable(),
      fridge: z.int().nullable(),
      freezer: z.int().nullable(),
    }),
  }),
  expiryType: ExpiryTypeSchema,
  recommendedStorageLocation: StorageLocationSchema,
});

export type InventoryItemInput = z.infer<typeof InventoryItemInput>;

export const InventoryItemAddResponse = {
  200: z.object({
    inventoryItemId: z.int(),
  }),
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
  200: z.object({
    inventoryItems: InventoryItemsSchema,
  }),
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
