import type { Database } from '@/types/database';

type ApprovedUnit = Database['public']['Enums']['unit'];

const rawUnitToSupportedUnit: Record<string, ApprovedUnit> = {
  mg: 'mg',
  mgs: 'mg',
  milligram: 'mg',
  milligrams: 'mg',

  g: 'g',
  gm: 'g',
  gms: 'g',
  gram: 'g',
  grams: 'g',

  kg: 'kg',
  kgs: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',

  oz: 'oz',
  ozs: 'oz',
  ounce: 'oz',
  ounces: 'oz',

  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',

  ml: 'ml',
  mls: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',

  l: 'l',
  lt: 'l',
  ltr: 'l',
  ltrs: 'l',
  ls: 'l',
  litre: 'l',
  litres: 'l',
  liter: 'l',
  liters: 'l',

  fl_oz: 'fl_oz',
  floz: 'fl_oz',
  'fl oz': 'fl_oz',
  'fl.oz': 'fl_oz',
  fluidounce: 'fl_oz',
  fluidounces: 'fl_oz',

  pt: 'pt',
  pts: 'pt',
  pint: 'pt',
  pints: 'pt',

  qt: 'qt',
  qts: 'qt',
  quart: 'qt',
  quarts: 'qt',

  gal: 'gal',
  gals: 'gal',
  gallon: 'gal',
  gallons: 'gal',
};

export const getSupportedUnit = (unit: string) => {
  const key = unit.trim().toLowerCase();
  return rawUnitToSupportedUnit[key];
};
