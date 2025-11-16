import * as z from 'zod';
import { timestampzTransformer } from '@/schemas/inventory';
import { storageLocationFieldMapper } from '@/utils/field-mapper';

const ShoppingItemStatus = z.enum(['created', 'completed']);
const ShoppingItemSource = z.enum(['user', 'ai']);

const nullToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullable().transform((v) => v ?? undefined);

export const ShoppingItemSchema = z.object({
  id: z.int(),
  createdAt: timestampzTransformer,
  updatedAt: timestampzTransformer,
  title: nullToUndefined(z.string()),
  status: ShoppingItemStatus,
  source: ShoppingItemSource,
  storageLocation: storageLocationFieldMapper.outputSchema,
  product: z
    .object({
      id: z.number(),
      name: z.string(),
      unit: nullToUndefined(z.string()),
      brand: z.string(),
      amount: nullToUndefined(z.float64()),
      category: z.object({
        icon: nullToUndefined(z.string()),
        id: z.int(),
        name: z.string(),
        pathDisplay: z.string(),
      }),
    })
    .optional(),
});

export const ShoppingItemsSchema = z.array(ShoppingItemSchema);

export const ShoppingItemInputSchema = z.object({
  title: z.string().optional(),
  source: ShoppingItemSource.default('user'),
  storageLocation: storageLocationFieldMapper.inputSchema,
  productId: z.int().optional(),
  quantity: z.number().default(1),
});

export const ShoppingItemUpdateSchema = z.object({
  title: z.string().optional(),
  status: ShoppingItemStatus.optional(),
  storageLocation: storageLocationFieldMapper.inputSchema.optional(),
});
