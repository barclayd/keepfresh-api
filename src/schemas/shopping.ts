import * as z from 'zod';
import { timestampzTransformer } from '@/schemas/inventory';
import {
  expiryTypeFieldMapper,
  storageLocationFieldMapper,
} from '@/utils/field-mapper';
import { nullToOptional } from '@/utils/zod';

export const ShoppingItemStatus = z.enum(['created', 'completed']);
const ShoppingItemSource = z.enum(['user', 'ai']);

export const ShoppingItemSchema = z.object({
  id: z.int(),
  createdAt: timestampzTransformer,
  updatedAt: timestampzTransformer,
  title: nullToOptional(z.string()),
  status: ShoppingItemStatus,
  source: ShoppingItemSource,
  storageLocation: storageLocationFieldMapper.outputSchemaOptional,
  product: nullToOptional(
    z.object({
      id: z.number(),
      name: z.string(),
      unit: nullToOptional(z.string()),
      barcode: nullToOptional(z.string()),
      brand: z.string(),
      amount: nullToOptional(z.float64()),
      category: z.object({
        icon: nullToOptional(z.string()),
        id: z.int(),
        name: z.string(),
        pathDisplay: z.string(),
        expiryType: expiryTypeFieldMapper.outputSchema,
      }),
    }),
  ),
});

export const ShoppingItemsSchema = z.array(ShoppingItemSchema);

export const ShoppingItemInputSchema = z.object({
  title: z.string().optional(),
  source: ShoppingItemSource.default('user'),
  storageLocation: storageLocationFieldMapper.inputSchema.optional(),
  productId: z.int().optional(),
  quantity: z.number().default(1),
});

export const ShoppingItemUpdateSchema = z.object({
  title: z.string().optional(),
  status: ShoppingItemStatus.optional(),
  storageLocation: storageLocationFieldMapper.inputSchema.optional(),
});
