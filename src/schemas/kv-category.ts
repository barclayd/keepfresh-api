import * as z from 'zod';
import { ExpiryTypeDb, StorageLocationDb } from '@/types/category';

export const kvCategorySchema = z.object({
  expiryType: z.enum(ExpiryTypeDb),
  icon: z.string(),
  pathDisplay: z.string(),
  storageLocation: z.enum(StorageLocationDb),
});

export type KVCategory = z.infer<typeof kvCategorySchema>;
