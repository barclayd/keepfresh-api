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

export const RefinedProductSearchItemSchema = z.object({
  id: z.number(),
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
});

export type RefinedProductSearchItem = z.infer<
  typeof RefinedProductSearchItemSchema
>;

export const RefinedProductSearchItemsSchema = z.array(
  RefinedProductSearchItemSchema,
);

export const PaginatedProductSearchSchema = z.object({
  pagination: z.object({
    hasNext: z.boolean(),
  }),
  results: RefinedProductSearchItemsSchema,
});
