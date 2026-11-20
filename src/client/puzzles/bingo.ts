import type { YearGroup } from "../../curriculum/skills.js";
import { pickWholeNumber, shuffle } from "./shuffle.js";

/** One call from the ringmaster: a sum whose answer sits on the card. */
export interface BingoCall {
  /** The sum as printed, with proper symbols, such as "13 − 5" or "6²". */
  text: string;
  /** The sum as read aloud, such as "13 take away 5" or "6 squared". */
  spoken: string;
  answer: number;
}

export interface BingoGame {
  size: number;
  /** The card's answers, row by row; every one is different. */
  card: readonly number[];
  /** The calls in the order the ringmaster makes them, one for each square. */
  calls: readonly BingoCall[];
}

export const bingoCardSizes: Record<YearGroup, number> = {
  1: 3,
  2: 3,
  3: 4,
  4: 4,
  5: 4,
  6: 4,
};

const numberFormat = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 2,
});

export const formatBingoNumber = (value: number): string =>
  numberFormat.format(value);

type CallMaker = (random: () => number) => BingoCall;

const takeAway: CallMaker = (random) => {
  const answer = pickWholeNumber(0, 15, random);
  const taken = pickWholeNumber(1, Math.min(10, 20 - answer), random);
  const start = answer + taken;
  return {
    text: `${String(start)} − ${String(taken)}`,
    spoken: `${String(start)} take away ${String(taken)}`,
    answer,
  };
};

const times =
  (tables: readonly number[], smallest: number, largest: number): CallMaker =>
  (random) => {
    const table = tables[pickWholeNumber(0, tables.length - 1, random)];
    const other = pickWholeNumber(smallest, largest, random);
    const [first, second] = random() < 0.5 ? [other, table] : [table, other];
    return {
      text: `${String(first)} × ${String(second)}`,
      spoken: `${String(first)} times ${String(second)}`,
      answer: first * second,
    };
  };

const dividedBy =
  (tables: readonly number[], smallest: number, largest: number): CallMaker =>
  (random) => {
    const table = tables[pickWholeNumber(0, tables.length - 1, random)];
    const answer = pickWholeNumber(smallest, largest, random);
    const whole = answer * table;
    return {
      text: `${String(whole)} ÷ ${String(table)}`,
      spoken: `${String(whole)} divided by ${String(table)}`,
      answer,
    };
  };

const squared: CallMaker = (random) => {
  const base = pickWholeNumber(2, 12, random);
  return {
    text: `${String(base)}²`,
    spoken: `${String(base)} squared`,
    answer: base * base,
  };
};

const cubed: CallMaker = (random) => {
  const base = pickWholeNumber(2, 5, random);
  return {
    text: `${String(base)}³`,
    spoken: `${String(base)} cubed`,
    answer: base * base * base,
  };
};

const powersOfTen = [10, 100, 1000] as const;

const timesPowerOfTen: CallMaker = (random) => {
  const multiplier = powersOfTen[pickWholeNumber(0, 2, random)];
  const isDecimal = random() < 0.5;
  // Kept in tenths so the answer is exact, such as 3.4 × 100 = 34 tenths × 10.
  const tenths = isDecimal
    ? pickWholeNumber(1, 99, random)
    : pickWholeNumber(2, 99, random) * 10;
  const shown = formatBingoNumber(tenths / 10);
  return {
    text: `${shown} × ${formatBingoNumber(multiplier)}`,
    spoken: `${shown} times ${formatBingoNumber(multiplier)}`,
    answer: (tenths * multiplier) / 10,
  };
};

const percentSteps: Readonly<Record<number, number>> = {
  5: 20,
  10: 10,
  15: 20,
  20: 10,
  25: 4,
  30: 10,
  40: 10,
  50: 2,
  60: 10,
  75: 4,
};

const percentages = Object.keys(percentSteps).map(Number);

const percentageOf: CallMaker = (random) => {
  const percent =
    percentages[pickWholeNumber(0, percentages.length - 1, random)];
  const step = percentSteps[percent];
  // Amounts are tidy multiples of 10 (or 20) up to 400, so every answer is whole.
  const unit = step % 10 === 0 ? step : step * 10;
  const amount =
    unit * pickWholeNumber(Math.ceil(20 / unit), 400 / unit, random);
  return {
    text: `${String(percent)}% of ${String(amount)}`,
    spoken: `${String(percent)} percent of ${String(amount)}`,
    answer: (percent * amount) / 100,
  };
};

/** The kinds of call for each Year, taken in turn so a card mixes them. */
export const bingoCallMakers: Record<YearGroup, readonly CallMaker[]> = {
  1: [takeAway],
  2: [times([2, 5, 10], 1, 12), dividedBy([2, 5, 10], 1, 12)],
  3: [
    times([3, 4, 8], 2, 12),
    times([3, 4, 8], 2, 12),
    dividedBy([3, 4, 8], 2, 12),
  ],
  4: [
    times([6, 7, 8, 9, 11, 12], 2, 12),
    times([3, 4, 5, 6, 7, 8, 9, 12], 3, 12),
  ],
  5: [squared, timesPowerOfTen, cubed, timesPowerOfTen],
  6: [percentageOf],
};

const triesPerCall = 200;

export const buildBingoGame = (
  yearGroup: YearGroup,
  random: () => number,
): BingoGame => {
  const size = bingoCardSizes[yearGroup];
  const makers = bingoCallMakers[yearGroup];
  const calls: BingoCall[] = [];
  const answers = new Set<number>();
  const texts = new Set<string>();
  for (let index = 0; calls.length < size * size; index++) {
    const before = calls.length;
    // Each kind takes its turn; if it has run out of new answers, the next kind steps in.
    for (let attempt = 0; attempt < triesPerCall * makers.length; attempt++) {
      const maker =
        makers[(index + Math.floor(attempt / triesPerCall)) % makers.length];
      const call = maker(random);
      if (!answers.has(call.answer) && !texts.has(call.text)) {
        answers.add(call.answer);
        texts.add(call.text);
        calls.push(call);
        break;
      }
    }
    if (calls.length === before) {
      throw new Error(`Not enough different Year ${String(yearGroup)} calls`);
    }
  }
  return {
    size,
    card: shuffle(
      calls.map(({ answer }) => answer),
      random,
    ),
    calls: shuffle(calls, random),
  };
};

/** Every row, column and both diagonals, as lists of square indexes. */
export const listBingoLines = (size: number): number[][] => {
  const indexes = Array.from({ length: size }, (_, index) => index);
  return [
    ...indexes.map((row) => indexes.map((column) => row * size + column)),
    ...indexes.map((column) => indexes.map((row) => row * size + column)),
    indexes.map((index) => index * size + index),
    indexes.map((index) => index * size + (size - 1 - index)),
  ];
};

export const listCompletedLines = (
  size: number,
  dabbed: ReadonlySet<number>,
): number[][] =>
  listBingoLines(size).filter((line) =>
    line.every((index) => dabbed.has(index)),
  );
