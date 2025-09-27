/** biome-ignore-all lint/suspicious/noExplicitAny: permit any */
import { z } from 'zod';
import { StorageLocation, StorageLocationDb } from '@/types/category';

export function createFieldMapper<UI, DB>(
  uiEnum: z.ZodEnum<any>,
  dbEnum: z.ZodEnum<any>,
  mappings: {
    toDb: Record<string, string>;
    toUI: Record<string, string>;
  },
) {
  return {
    toDb: (value: UI): DB => mappings.toDb[value as string] as DB,
    toUI: (value: DB): UI => mappings.toUI[value as string] as UI,
    inputSchema: uiEnum.transform((val) => mappings.toDb[val] as DB),
    outputSchema: dbEnum.transform((val) => mappings.toUI[val] as UI),
  };
}

export const storageLocationFieldMapper = createFieldMapper<
  StorageLocation,
  StorageLocationDb
>(z.enum(StorageLocation), z.enum(StorageLocationDb), {
  toDb: {
    Freezer: 'freezer',
    Fridge: 'fridge',
    Pantry: 'pantry',
  },
  toUI: {
    freezer: 'Freezer',
    fridge: 'Fridge',
    pantry: 'Pantry',
  },
});
