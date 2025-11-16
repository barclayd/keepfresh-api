import * as z from 'zod';
import { timestampzTransformer } from '@/schemas/inventory';
import { storageLocationFieldMapper } from '@/utils/field-mapper';

const ShoppingItemStatus = z.enum(['created', 'completed']);
const ShoppingItemSource = z.enum(['user', 'ai']);

export const ShoppingItemSchema = z.object({
  id: z.int(),
  createdAt: timestampzTransformer,
  updatedAt: timestampzTransformer,
  title: z.string().optional(),
  status: ShoppingItemStatus,
  source: ShoppingItemSource,
  storageLocation: storageLocationFieldMapper.outputSchema,
  product: z
    .object({
      id: z.number(),
      name: z.string(),
      unit: z.string().optional(),
      brand: z.string(),
      amount: z.number().optional(),
      category: z.object({
        icon: z.string().optional(),
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
