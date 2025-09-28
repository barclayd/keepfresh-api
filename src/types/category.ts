import type { Database } from '@/types/database';

export type ExpiryType = 'Best Before' | 'Use By' | 'Long Life';

export const ExpiryType: Array<ExpiryType> = [
  'Use By',
  'Long Life',
  'Best Before',
];

export type ExpiryTypeDb = Database['public']['Enums']['expiry_type'];

export const ExpiryTypeDb: Array<ExpiryTypeDb> = [
  'use_by',
  'long_life',
  'best_before',
];

export type StorageLocation = 'Fridge' | 'Freezer' | 'Pantry';
export type StorageLocationDb = Database['public']['Enums']['storage_location'];

export type InventoryItemStatus =
  Database['public']['Enums']['grocery_item_status'];

export const StorageLocation: Array<StorageLocation> = [
  'Fridge',
  'Freezer',
  'Pantry',
];

export const StorageLocationDb: Array<StorageLocationDb> = [
  'fridge',
  'freezer',
  'pantry',
];

export const InventoryItemStatus: Array<InventoryItemStatus> = [
  'opened',
  'unopened',
  'consumed',
  'discarded',
] as const;

export const ActiveInventoryItemStatus: Array<
  Exclude<InventoryItemStatus, 'consumed' | 'discarded'>
> = ['unopened', 'opened'];
