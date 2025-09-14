import type { StorageLocation } from '@/types/category';
import type { Database } from '@/types/database';

export const storageLocationMap: Record<
  Database['public']['Enums']['storage_location'],
  StorageLocation
> = {
  pantry: 'Pantry',
  fridge: 'Fridge',
  freezer: 'Freezer',
};
