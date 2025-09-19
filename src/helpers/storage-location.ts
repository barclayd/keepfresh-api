import { expiryTypeMap } from '@/helpers/expiry';
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

export const locationToStorageLocationMap = Object.fromEntries(
  Object.entries(expiryTypeMap).map(([databaseNaming, zodNaming]) => [
    zodNaming,
    databaseNaming,
  ]),
) as Record<StorageLocation, Database['public']['Enums']['storage_location']>;
