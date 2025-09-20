import { z } from '@hono/zod-openapi';
import { ExpiryType } from '@/types/category';

export const ProductSearchItemSchema = z.object({
  name: z.string(),
  brand: z.string(),
  category: z.object({
    id: z.int(),
    name: z.string(),
    path: z.string(),
  }),
  amount: z.number().optional(),
  unit: z.string().optional(),
  icon: z.string().optional(),
  imageURL: z.string().optional(),
  source: z.object({
    id: z.int(),
    ref: z.string(),
  }),
});

export type ProductSearchItem = z.infer<typeof ProductSearchItemSchema>;

export const ProductSearchItemsSchema = z.array(ProductSearchItemSchema);

export const ExpiryTypeSchema = z.enum(ExpiryType);
