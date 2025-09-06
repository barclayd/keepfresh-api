import { createRoute } from '@hono/zod-openapi';
import {
  AddGroceryItemSchemaResponse,
  GroceryItem,
} from '@/schemas/grocery-item.ts';

export const addGroceryItemRoute = createRoute({
  method: 'post',
  path: '/grocery-item',
  request: {
    body: {
      content: {
        'application/json': {
          schema: GroceryItem,
        },
      },
    },
  },
  middleware: [],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AddGroceryItemSchemaResponse['200'],
        },
      },
      description: 'Success response from GroceryItem Gen API',
    },
    400: {
      content: {
        'application/json': {
          schema: AddGroceryItemSchemaResponse['400'],
        },
      },
      description: 'Error occurred when processing payload',
    },
    401: {
      content: {
        'application/json': {
          schema: AddGroceryItemSchemaResponse['401'],
        },
      },
      description: 'Authorization error response from Grocery Item API',
    },
  },
  security: [
    {
      Bearer: [],
    },
  ],
});
