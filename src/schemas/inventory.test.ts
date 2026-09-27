import { describe, expect, test } from 'bun:test';
import { InventoryItemSchema, InventoryItemsSchema } from './inventory';

const inventoryItem = {
  id: 101,
  createdAt: '2026-09-27T12:00:00Z',
  updatedAt: '2026-09-27T12:00:00Z',
  openedAt: null,
  status: 'unopened',
  storageLocation: 'fridge',
  consumptionPrediction: null,
  consumptionPredictionChangedAt: null,
  expiryDate: '2026-10-01T12:00:00Z',
  expiryType: 'best_before',
  product: {
    id: 1,
    name: 'Fixture product',
    brand: 'Tesco',
    amount: 500,
    unit: 'g',
    category: {
      id: 1,
      name: 'Vegetables',
      icon: 'carrot',
      pathDisplay: 'Food > Vegetables',
      expiryType: 'best_before',
    },
  },
};

describe('inventory responses before consumption prediction is available', () => {
  test('a newly purchased item with a null prediction is readable by the app', () => {
    const result = InventoryItemSchema.parse(inventoryItem);
    expect(result.consumptionPrediction).toBe(100);
    expect(result.storageLocation).toBe('Fridge');
    expect(result.expiryType).toBe('Best Before');
  });

  test.each([0, 35, 100])('preserves an existing prediction of %s', (value) => {
    const result = InventoryItemSchema.parse({
      ...inventoryItem,
      consumptionPrediction: value,
    });
    expect(result.consumptionPrediction).toBe(value);
  });

  test('a missing prediction does not prevent the inventory list from loading', () => {
    const result = InventoryItemsSchema.parse([
      inventoryItem,
      { ...inventoryItem, id: 102, consumptionPrediction: 0 },
    ]);
    expect(result.map((item) => item.consumptionPrediction)).toEqual([100, 0]);
  });

  test('rejects malformed predictions instead of treating them as missing', () => {
    expect(
      InventoryItemSchema.safeParse({
        ...inventoryItem,
        consumptionPrediction: 'invalid',
      }).success,
    ).toBe(false);
  });
});
