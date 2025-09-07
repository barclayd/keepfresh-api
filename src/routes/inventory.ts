import { createRoute } from '@hono/zod-openapi';
import {
  InventoryGETSchemaResponse,
  InventoryItemInput,
  InventoryItemSchemaResponsePOST,
} from '@/schemas/inventory';

export const inventoryItemRoutePOST = createRoute({
  method: 'post',
  path: '/inventory/items',
  request: {
    body: {
      content: {
        'application/json': {
          schema: InventoryItemInput,
        },
      },
    },
  },
  middleware: [],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: InventoryItemSchemaResponsePOST['200'],
        },
      },
      description: 'Success response from InventoryItemInput Gen API',
    },
    400: {
      content: {
        'application/json': {
          schema: InventoryItemSchemaResponsePOST['400'],
        },
      },
      description: 'Error occurred when processing payload',
    },
    401: {
      content: {
        'application/json': {
          schema: InventoryItemSchemaResponsePOST['401'],
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

export const inventoryGETRoute = createRoute({
  method: 'get',
  path: '/inventory',
  middleware: [],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: InventoryGETSchemaResponse['200'],
        },
      },
      description: 'Success response from InventoryItemInput Gen API',
    },
    400: {
      content: {
        'application/json': {
          schema: InventoryGETSchemaResponse['400'],
        },
      },
      description: 'Error occurred when processing payload',
    },
    401: {
      content: {
        'application/json': {
          schema: InventoryGETSchemaResponse['401'],
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
