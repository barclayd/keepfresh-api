import * as z from 'zod';

const OpenFoodFactsProduct = z.object({
  brands: z.string().optional(),
  categoriesTagsEn: z.array(z.string()).optional(),
  code: z.string(),
  productName: z.string().optional(),
  quantity: z.string().optional(),
});

export const OpenFoodFactsSearchSchema = z.object({
  count: z.int(),
  page: z.int().or(z.string()),
  pageCount: z.int(),
  pageSize: z.int(),
  products: z.array(OpenFoodFactsProduct),
});

export const OpenFoodFactsProductByBarcodeSchema = z.object({
  code: z.string(),
  product: z.object({
    brands: z.string().optional(),
    categoriesTagsEn: z.array(z.string()).optional(),
    code: z.string(),
    productName: z.string(),
    quantity: z.string().optional(),
  }),
  status: z.number().optional(),
  status_verbose: z.string().optional(),
});

export type OpenFoodFactsProduct = z.infer<typeof OpenFoodFactsProduct>;
