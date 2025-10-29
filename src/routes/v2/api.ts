import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { getCategoryPath } from '@/helpers/category';
import { routes } from '@/routes/v2/routes';
import { FullProductSearchItemsSchema } from '@/schemas/product';
import type { HonoEnvironment } from '@/types/hono';

export const createV2Routes = () => {
  const app = new OpenAPIHono<HonoEnvironment>();

  app.openapi(routes.products.list, async (c) => {
    const { search: searchTerm, country, page, limit } = c.req.valid('query');

    const offset = (page - 1) * limit;

    if (searchTerm.length < 2) {
      return c.json(
        {
          error: `Search term must be a minimum length of 2 characters`,
        },
        400,
      );
    }

    const { data, error } = await c
      .get('supabase')
      .rpc('search_products_paginated', {
        search_query: searchTerm,
        country_code: country,
        page_limit: limit,
        page_offset: offset,
      });

    if (error) {
      return c.json(
        {
          error: `Error occurred during search. Error=${JSON.stringify(error)}`,
        },
        400,
      );
    }

    const formattedProducts = data.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: {
        id: product.category_id,
        name: product.category_name,
        path: getCategoryPath(product.category_path_display),
        recommendedStorageLocation: product.storage_location,
      },
      icon: product.category_icon,
      ...(product.unit &&
        product.unit && {
          amount: product.amount,
          unit: product.unit,
        }),
    }));

    const results = FullProductSearchItemsSchema.parse(formattedProducts);

    return c.json(
      {
        pagination: {
          hasNext: data[0]
            ? Math.ceil(data[0].total_count / limit) > page
            : false,
        },
        results,
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
