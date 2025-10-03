export const calculateMean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mean = calculateMean(values);
  const squaredDiffs = values.map((val) => (val - mean) ** 2);
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
};

export const toTwoDecimalPlaces = (number: number) => {
  return Math.round(number * 100) / 100;
};
