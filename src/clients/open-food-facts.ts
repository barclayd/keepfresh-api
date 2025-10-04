import type { SupabaseClient } from '@supabase/supabase-js';
import { objectToCamel } from 'ts-case-convert';
import { getCategoryPath } from '@/helpers/category';
import { getUniqueProducts } from '@/helpers/product';
import { parseQuantity } from '@/helpers/quantity';
import { toTitleCase } from '@/helpers/toTitleCase';
import { OpenFoodFactsSearchSchema } from '@/schemas/open-food-facts';
import type { ProductSearchItem } from '@/schemas/product';
import type { Database } from '@/types/database';
import { storageLocationFieldMapper } from '@/utils/field-mapper';

const getCategory = async (
  categoryTags: Array<string> | undefined,
  productName: string,
  supabase: SupabaseClient<Database>,
) => {
  const { data, error } = await supabase
    .rpc('match_food_category', {
      api_categories: !categoryTags ? [productName] : categoryTags,
    })
    .single();

  if (error) {
    console.error('Category matching error:', error);
    return;
  }

  return data;
};

export const search = async (
  query: string,
  supabase: SupabaseClient<Database>,
): Promise<Array<ProductSearchItem>> => {
  const searchTerms = encodeURI(query);
  const pageSize = 25;

  // query internal database at the same time
  const openFoodFactsResponse = await fetch(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchTerms}&search_simple=1&action=process&json=1&page_size=${pageSize}&sort_by=unique_scans_n&fields=code,product_name,brands,categories_tags_en,quantity&lc=en`,
  );

  const openFoodFactsData = await openFoodFactsResponse.json();

  const openFoodFactsProducts = OpenFoodFactsSearchSchema.parse(
    objectToCamel(openFoodFactsData as object),
  );

  const uniqueProducts = getUniqueProducts(openFoodFactsProducts.products);

  const searchProducts = await Promise.all(
    uniqueProducts.map(async (product) => {
      const quantity = parseQuantity(product.quantity);
      const productName = toTitleCase(product.productName);

      const category = await getCategory(
        product.categoriesTagsEn,
        productName,
        supabase,
      );

      // change fallback image to be brand image
      const fallbackImageURL =
        'https://keep-fresh-images.s3.eu-west-2.amazonaws.com/milk.png';

      if (!category) {
        console.log('No category found:', productName);
        return;
      }

      if (!product.brands) {
        return;
      }

      return {
        name: productName,
        brand: toTitleCase(product.brands),
        category: {
          id: category.id,
          name: category.name,
          path: getCategoryPath(category.path_display),
          recommendedStorageLocation: storageLocationFieldMapper.toUI(
            category.recommended_storage_location,
          ),
        },
        imageURL: category?.image_url ?? fallbackImageURL,
        icon: category?.icon ?? '🍗',
        ...(quantity && {
          amount: quantity.amount,
          unit: quantity.unit,
        }),
        source: {
          id: 1,
          ref: product.code,
        },
      };
    }),
  );

  // send event to save product in database
  return searchProducts.filter(Boolean) as Array<ProductSearchItem>;
};
