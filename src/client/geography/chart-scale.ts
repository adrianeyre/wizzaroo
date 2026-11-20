export interface ChartScale {
  step: number;
  lineCount: number;
  top: number;
}

const fewestGridlines = 4;
const mostGridlines = 6;
const niceMultipliers = [1, 2, 5] as const;
const roundingSlack = 1e-9;

const countStepsToReach = (largestValue: number, step: number): number =>
  Math.ceil(largestValue / step - roundingSlack);

const findFirstExponent = (largestValue: number): number =>
  largestValue > 0
    ? Math.floor(Math.log10(largestValue / mostGridlines)) - 1
    : 0;

export const buildChartScale = (largestValue: number): ChartScale => {
  const smallestStep = largestValue >= 1 ? 1 : 0;
  for (let exponent = findFirstExponent(largestValue); ; exponent++) {
    for (const multiplier of niceMultipliers) {
      const step = multiplier * 10 ** exponent;
      const stepsNeeded = countStepsToReach(largestValue, step);
      if (step >= smallestStep && stepsNeeded <= mostGridlines) {
        const lineCount = Math.max(fewestGridlines, stepsNeeded);
        return { step, lineCount, top: step * lineCount };
      }
    }
  }
};

export const findGridlineValue = (scale: ChartScale, line: number): number =>
  Number((scale.step * line).toPrecision(12));

export const describeGridlineValue = (value: number): string =>
  value.toLocaleString("en-GB", { maximumFractionDigits: 2 });

export const findBarShare = (scale: ChartScale, value: number): number =>
  value / scale.top;
