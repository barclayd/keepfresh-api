export type ExpiryType = 'Best Before' | 'Use By' | 'Long Life';

export const ExpiryType: Array<ExpiryType> = [
  'Use By',
  'Long Life',
  'Best Before',
];

export type StorageLocation = 'Fridge' | 'Freezer' | 'Pantry';

export const StorageLocation: Array<StorageLocation> = [
  'Fridge',
  'Freezer',
  'Pantry',
];
