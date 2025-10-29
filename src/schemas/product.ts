import { z } from '@hono/zod-openapi';
import { storageLocationFieldMapper } from '@/utils/field-mapper';

export const ProductSearchItemSchema = z.object({
  name: z.string().min(2),
  brand: z.string(),
  category: z.object({
    id: z.int(),
    name: z.string(),
    path: z.string(),
    recommendedStorageLocation: storageLocationFieldMapper.outputSchema,
  }),
  amount: z.number().optional(),
  unit: z.string().optional(),
  icon: z.string(),
  source: z.object({
    id: z.int(),
    ref: z.string(),
  }),
});

export type ProductSearchItem = z.infer<typeof ProductSearchItemSchema>;

export const ProductSearchItemsSchema = z.array(ProductSearchItemSchema);

export const FullProductSearchItemSchema = z.array(
  z.object({
    name: z.string().min(2),
    brand: z.string(),
    category: z.object({
      id: z.int(),
      name: z.string(),
      path: z.string(),
      recommendedStorageLocation: storageLocationFieldMapper.outputSchema,
    }),
    amount: z
      .number()
      .nullable()
      .transform((val) => val ?? undefined),
    unit: z.string().optional(),
    icon: z.string(),
  }),
);
