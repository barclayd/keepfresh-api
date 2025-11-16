import * as z from 'zod';
import { timestampzTransformer } from '@/schemas/inventory';

const ShoppingItemStatus = z.enum(['created', 'completed']);
const ShoppingItemSource = z.enum(['user', 'ai']);
const ShoppingItemLocation = z.enum(['pantry', 'fridge', 'freezer', 'other']);

export const ShoppingItemSchema = z.object({
  id: z.int(),
  createdAt: timestampzTransformer,
  updatedAt: timestampzTransformer,
  title: z.string().nullable(),
  status: ShoppingItemStatus,
  source: ShoppingItemSource,
  location: ShoppingItemLocation,
  product: z.object({
    id: z.number(),
    name: z.string(),
    unit: z.string().nullable(),
    brand: z.string(),
    amount: z.number().nullable(),
    category: z.object({
      icon: z.string().nullable(),
      id: z.int(),
      name: z.string(),
      pathDisplay: z.string(),
    }),
  }),
});

export const ShoppingItemsSchema = z.array(ShoppingItemSchema);
