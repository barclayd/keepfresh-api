import { z } from '@hono/zod-openapi';
import type { Database } from '@/types/database';

export const GroceryItem = z.object({
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  quantity: z.number(),
  expiryDate: z.iso.date(),
});

const storageLocation: Array<
  Database['public']['Tables']['user_grocery_item']['Row']['storage_location']
> = ['fridge', 'freezer', 'pantry'] as const;

const status: Array<
  Database['public']['Tables']['user_grocery_item']['Row']['status']
> = ['opened', 'unopened', 'consumed', 'discarded'] as const;

export const timestampzTransformer = z
  .string()
  .transform((raw, ctx) => {
    const iso = raw.replace(' ', 'T'); // make ISO-like
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

export const UserGroceryItem = z.object({
  id: z.number(),
  createdAt: timestampzTransformer,
  consumptionPrediction: z.int(),
  storageLocation: z.enum(storageLocation),
  groceryItem: z.object({
    id: z.int(),
    name: z.string(),
    brand: z.string(),
    imageUrl: z.string().nullable(),
    category: z.string(),
    amount: z.number(),
    unit: z.string(),
  }),
  status: z.enum(status),
});

export const UserGroceryItems = z.array(UserGroceryItem);

export type GroceryItem = z.infer<typeof GroceryItem>;

export const GroceryItemPOSTSchemaResponse = {
  200: z.object({
    groceryItemId: z.string(),
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

export const GroceryItemGETSchemaResponse = {
  200: z.object({
    groceryItems: UserGroceryItems,
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
