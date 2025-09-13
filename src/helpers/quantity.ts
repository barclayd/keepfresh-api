export const parseQuantity = (quantity: string | undefined) => {
  if (!quantity) {
    return;
  }

  const match = quantity.match(/^(\d+\.?\d*)\s*([a-zA-Z]+)$/);

  if (!match || !match[1] || !match[2]) {
    return;
  }

  return {
    amount: parseFloat(match[1]),
    unit: match[2],
  };
};
