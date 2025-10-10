import { formatName } from '@/helpers/category';
import { toTitleCase } from '@/helpers/toTitleCase';

type KnownBrands =
  | 'Marks & Spencer'
  | 'Aldi'
  | 'Tesco'
  | 'Morrisons'
  | "Sainsbury's"
  | 'Co-op'
  | 'Lidl';

export const brandMap: Record<string, KnownBrands> = {
  'marks & spencer': 'Marks & Spencer',
  'marks and spencer': 'Marks & Spencer',
  'm&s': 'Marks & Spencer',
  sainsburys: "Sainsbury's",
  coop: 'Co-op',
  coops: 'Co-op',
  tescos: 'Tesco',
  aldis: 'Aldi',
  lidls: 'Lidl',
  morrison: 'Morrisons',
  ashfields: 'Aldi',
  ashfield: 'Aldi',
};

export const formatBrand = (brand: string) => {
  const formattedBrandName = formatName(brand);

  const mappedBrand = brandMap[formattedBrandName.toLowerCase()];

  return mappedBrand ?? toTitleCase(formattedBrandName);
};
