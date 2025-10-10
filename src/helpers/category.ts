export const getCategoryPath = (pathDisplay: string) =>
  pathDisplay.replaceAll('.', ' > ');

export const formatName = (name: string) =>
  name.includes(',') ? (name.split(',')[0] ?? name) : name;
