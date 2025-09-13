import type { OpenFoodFactsProduct } from '@/schemas/open-food-facts';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

type ValidatedOpenFoodFactProduct = WithRequired<
  OpenFoodFactsProduct,
  'productName'
>;

export const getUniqueProducts = (products: OpenFoodFactsProduct[]) => {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (product.productName === undefined) {
      return false;
    }

    const key = `${product.brands ?? ''}-${product.productName}`
      .toLowerCase()
      .trim();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  }) as ValidatedOpenFoodFactProduct[];
};
