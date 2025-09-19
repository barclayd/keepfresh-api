import type { ExpiryType } from '@/types/category';
import type { Database } from '@/types/database';

export const expiryTypeMap: Record<
  Database['public']['Enums']['expiry_type'],
  ExpiryType
> = {
  best_before: 'Best Before',
  use_by: 'Use By',
  long_life: 'Long Life',
};

export const expiryLabelMap: Record<
  ExpiryType,
  Database['public']['Enums']['expiry_type']
> = Object.fromEntries(
  Object.entries(expiryTypeMap).map(([databaseNaming, zodNaming]) => [
    zodNaming,
    databaseNaming,
  ]),
) as Record<ExpiryType, Database['public']['Enums']['expiry_type']>;
