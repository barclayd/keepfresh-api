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

export const calculateMedian = (values: number[]): number | undefined => {
  if (values.length === 0) {
    return undefined;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  const median = sorted[mid];
  const leftOfMedian = sorted[mid - 1];

  if (leftOfMedian === undefined || median === undefined) {
    return undefined;
  }

  if (sorted.length % 2 !== 0) {
    return toTwoDecimalPlaces(median);
  }

  return toTwoDecimalPlaces((leftOfMedian + median) / 2);
};

export const toTwoDecimalPlaces = (number: number) => {
  return Math.round(number * 100) / 100;
};
