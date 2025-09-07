import { createRoute } from '@hono/zod-openapi';
import {
  GroceryItem,
  GroceryItemGETSchemaResponse,
  GroceryItemPOSTSchemaResponse,
} from '@/schemas/grocery-item';

export const groceryItemsPOSTRoute = createRoute({
  method: 'post',
  path: '/grocery-items',
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
          schema: GroceryItemPOSTSchemaResponse['200'],
        },
      },
      description: 'Success response from GroceryItem Gen API',
    },
    400: {
      content: {
        'application/json': {
          schema: GroceryItemPOSTSchemaResponse['400'],
        },
      },
      description: 'Error occurred when processing payload',
    },
    401: {
      content: {
        'application/json': {
          schema: GroceryItemPOSTSchemaResponse['401'],
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

export const groceryItemsGETRoute = createRoute({
  method: 'get',
  path: '/grocery-items',
  middleware: [],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GroceryItemGETSchemaResponse['200'],
        },
      },
      description: 'Success response from GroceryItem Gen API',
    },
    400: {
      content: {
        'application/json': {
          schema: GroceryItemGETSchemaResponse['400'],
        },
      },
      description: 'Error occurred when processing payload',
    },
    401: {
      content: {
        'application/json': {
          schema: GroceryItemGETSchemaResponse['401'],
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
