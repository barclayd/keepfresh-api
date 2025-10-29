import { createRoute } from '@hono/zod-openapi';
import * as z from 'zod';
import { authMiddleware } from '@/middleware/auth';
import { supabaseMiddleware } from '@/middleware/db';
import { InventoryItemAddResponse } from '@/schemas/inventory';
import { PaginatedProductSearchSchema } from '@/schemas/product';

export const routes = {
  products: {
    list: createRoute({
      method: 'get',
      path: '/products',
      middleware: [supabaseMiddleware, authMiddleware],
      request: {
        query: z.object({
          search: z.string(),
          country: z.string().optional().default('GB'),
          page: z.coerce.number().int().positive().optional().default(1),
          limit: z.coerce.number().int().min(1).max(100).optional().default(20),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: PaginatedProductSearchSchema,
            },
          },
          description: 'Success response from KeepFresh API',
        },
        400: {
          content: {
            'application/json': {
              schema: InventoryItemAddResponse['400'],
            },
          },
          description: 'Error occurred when processing payload',
        },
      },
      security: [
        {
          Bearer: [],
        },
      ],
    }),
  },
};
