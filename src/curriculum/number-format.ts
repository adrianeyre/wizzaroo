const mostDecimalPlaces = 3;

export const roundToThousandths = (value: number): number =>
  Math.round(value * 10 ** mostDecimalPlaces) / 10 ** mostDecimalPlaces;

export const formatNumber = (value: number): string => {
  const shown = roundToThousandths(value).toLocaleString("en-GB", {
    maximumFractionDigits: mostDecimalPlaces,
  });
  return shown.replace("-", "−");
};
