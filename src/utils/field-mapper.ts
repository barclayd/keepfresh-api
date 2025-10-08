import * as z from 'zod';
import {
  ExpiryType,
  ExpiryTypeDb,
  StorageLocation,
  StorageLocationDb,
} from '@/types/category';

export const createFieldMapper = <UI extends string, DB extends string>(
  uiEnum: z.ZodType<UI>,
  dbEnum: z.ZodType<DB>,
  mappings: {
    toDb: Record<UI, DB>;
    toUI: Record<DB, UI>;
  },
) => ({
  toDb: (value: UI): DB => mappings.toDb[value],
  toUI: (value: DB): UI => mappings.toUI[value],
  inputSchema: uiEnum.transform((val) => mappings.toDb[val]),
  outputSchema: dbEnum.transform((val) => mappings.toUI[val]),
});

export const storageLocationFieldMapper = createFieldMapper<
  StorageLocation,
  StorageLocationDb
>(z.enum(StorageLocation), z.enum(StorageLocationDb), {
  toDb: {
    Pantry: 'pantry',
    Fridge: 'fridge',
    Freezer: 'freezer',
  },
  toUI: {
    freezer: 'Freezer',
    fridge: 'Fridge',
    pantry: 'Pantry',
  },
});

export const expiryTypeFieldMapper = createFieldMapper<
  ExpiryType,
  ExpiryTypeDb
>(z.enum(ExpiryType), z.enum(ExpiryTypeDb), {
  toDb: {
    'Use By': 'use_by',
    'Long Life': 'long_life',
    'Best Before': 'best_before',
  },
  toUI: {
    best_before: 'Best Before',
    use_by: 'Use By',
    long_life: 'Long Life',
  },
});
