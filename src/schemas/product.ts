import { z } from '@hono/zod-openapi';

export const ProductSearchItemSchema = z.object({
  sourceId: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string().optional(),
  amount: z.number().optional(),
  unit: z.string().optional(),
  icon: z.string().optional(),
  imageURL: z.string().optional(),
});

export type ProductSearchItem = z.infer<typeof ProductSearchItemSchema>;

export const ProductSearchItemsSchema = z.array(ProductSearchItemSchema);

export type ProductSearchItems = z.infer<typeof ProductSearchItemsSchema>;
