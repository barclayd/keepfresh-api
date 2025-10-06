export const calculateDaysBetween = (
  startDate: string | null,
  endDate: string | null,
): number | null => {
  if (!startDate || !endDate) {
    return null;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};
