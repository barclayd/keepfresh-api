import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { objectToCamel } from 'ts-case-convert';
import { getCategoryPath } from '@/helpers/category';
import { routes } from '@/routes/v2/api';
import { FullProductSearchItemSchema } from '@/schemas/product';
import type { HonoEnvironment } from '@/types/hono';

export const createV2Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(routes.products.list, async (c) => {
    const { search: searchTerm, country } = c.req.valid('query');

    console.log(searchTerm.length);

    if (searchTerm.length < 2) {
      return c.json(
        {
          error: `Search term must be a minimum length of 2 characters`,
        },
        400,
      );
    }

    const { data, error } = await c.get('supabase').rpc('search_products', {
      search_query: searchTerm,
      country_code: country,
    });

    if (error) {
      return c.json(
        {
          error: `Error occurred during search. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const formattedProducts = data.map((product) => {
      const formattedProduct = objectToCamel(product);

      return {
        id: formattedProduct.id,
        name: formattedProduct.name,
        brand: formattedProduct.brand,
        category: {
          id: formattedProduct.categoryId,
          name: formattedProduct.categoryName,
          path: getCategoryPath(formattedProduct.categoryPath),
          recommendedStorageLocation: formattedProduct.storageLocation,
        },
        icon: formattedProduct.categoryIcon,
        ...(formattedProduct.unit &&
          formattedProduct.unit && {
            amount: formattedProduct.amount,
            unit: formattedProduct.unit,
          }),
      };
    });

    const products = FullProductSearchItemSchema.parse(formattedProducts);

    return c.json(
      {
        products,
      },
      200,
    );
  });

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    description: `"Authorization": "Bearer token"`,
  });

  app.doc31('/doc', {
    openapi: '3.1.0',
    info: {
      version: '2.0.0',
      title: 'KeepFresh API',
      description: 'KeepFresh API',
    },
    servers: [
      {
        url: '/v2',
        description: 'Version 2 API',
      },
      {
        url: 'https://api.keepfre.sh/v2',
        description: 'Production V2 API',
      },
    ],
  });

  app.get(
    '/scalar',
    Scalar({
      url: 'doc',
      theme: 'bluePlanet',
      favicon: 'https://keepfre.sh/favicon.ico',
      pageTitle: 'KeepFresh API',
    }),
  );

  return app;
};
