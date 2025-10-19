export const calculateMean = (values: number[]): number | undefined => {
  if (values.length === 0) {
    return;
  }
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStandardDeviation = (
  values: number[],
): number | undefined => {
  if (values.length === 0) {
    return;
  }

  const mean = calculateMean(values);

  if (mean === undefined) {
    return;
  }
  const squaredDiffs = values.map((val) => (val - mean) ** 2);
  const variance = calculateMean(squaredDiffs);

  if (variance === undefined) {
    return;
  }

  return Math.sqrt(variance);
};

export const calculateMedian = (values: number[]): number | undefined => {
  if (values.length === 0) {
    return;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  const median = sorted[mid];
  const leftOfMedian = sorted[mid - 1];

  if (leftOfMedian === undefined || median === undefined) {
    return;
  }

  if (sorted.length % 2 !== 0) {
    return toTwoDecimalPlaces(median);
  }

  return toTwoDecimalPlaces((leftOfMedian + median) / 2);
};

export const toTwoDecimalPlaces = (number: number | undefined) => {
  if (number === undefined) {
    return;
  }

  return Math.round(number * 100) / 100;
};
