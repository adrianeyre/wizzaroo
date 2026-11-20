import { listWholeNumbers } from "./counting-to-20.js";

export const blockMeasureDifficulties = [1, 2, 3] as const;
export type BlockMeasureDifficulty = (typeof blockMeasureDifficulties)[number];

export type BlockMeasureKind = "perimeter" | "area" | "volume";

export interface BlockMeasureQuestion {
  kind: BlockMeasureKind;
  length: number;
  width: number;
  height: number;
  answer: number;
}

export type BlockMeasureYear = 4 | 5 | 6;

const kindOfYear: Record<BlockMeasureYear, BlockMeasureKind> = {
  4: "perimeter",
  5: "area",
  6: "volume",
};

const sizesByDifficulty: Record<BlockMeasureDifficulty, readonly number[]> = {
  1: [2, 3, 4],
  2: [3, 4, 5],
  3: [4, 5, 6],
};

const unitsOfKind: Record<BlockMeasureKind, string> = {
  perimeter: "cm",
  area: "cm²",
  volume: "cm³",
};

export const describeBlockMeasure = (
  kind: BlockMeasureKind,
  value: number,
): string => `${String(value)} ${unitsOfKind[kind]}`;

const findAnswer = (
  kind: BlockMeasureKind,
  length: number,
  width: number,
  height: number,
) => {
  switch (kind) {
    case "perimeter":
      return 2 * (length + width);
    case "area":
      return length * width;
    case "volume":
      return length * width * height;
  }
};

export const buildBlockMeasureQuestions = (
  year: BlockMeasureYear,
  difficulty: BlockMeasureDifficulty,
): BlockMeasureQuestion[] => {
  const kind = kindOfYear[year];
  const sizes = sizesByDifficulty[difficulty];
  return sizes.flatMap((length) =>
    listWholeNumbers(2, length)
      .filter((width) => width <= length)
      .map((width) => {
        const height =
          kind === "volume" ? Math.max(2, sizes[0] - 1 + (width % 2)) : 1;
        return {
          kind,
          length: length + (kind === "volume" ? 0 : 1),
          width,
          height,
          answer: findAnswer(
            kind,
            length + (kind === "volume" ? 0 : 1),
            width,
            height,
          ),
        };
      }),
  );
};

export const listBlockMeasureSlips = ({
  kind,
  length,
  width,
  height,
  answer,
}: BlockMeasureQuestion): number[] =>
  [
    length + width,
    length * width,
    2 * (length + width),
    length * width * height,
    length * width + height,
    answer + 1,
    answer - 1,
    kind === "volume"
      ? 2 * (length * width + width * height + length * height)
      : answer + 2,
  ].filter(
    (slip, position, slips) =>
      slip > 0 && slip !== answer && slips.indexOf(slip) === position,
  );
