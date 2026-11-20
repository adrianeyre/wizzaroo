import { listWholeNumbers } from "./counting-to-20.js";

export const measuringHeightDifficulties = [1, 2, 3, 4, 5, 6] as const;
export type MeasuringHeightDifficulty =
  (typeof measuringHeightDifficulties)[number];

export interface MeasuringHeightQuestion {
  startMark: number;
  centimetres: number;
}

export const rulerCentimetres = 15;

export const buildMeasuringHeightQuestions = (
  difficulty: MeasuringHeightDifficulty,
): MeasuringHeightQuestion[] => {
  switch (difficulty) {
    case 1:
      return listWholeNumbers(2, 10).map((centimetres) => ({
        startMark: 0,
        centimetres,
      }));
    case 2:
      return listWholeNumbers(8, rulerCentimetres).map((centimetres) => ({
        startMark: 0,
        centimetres,
      }));
    case 3:
      return listWholeNumbers(1, 3).flatMap((startMark) =>
        listWholeNumbers(3, 9).map((centimetres) => ({
          startMark,
          centimetres,
        })),
      );
    case 4:
      return listWholeNumbers(2, 12).map((centimetres) => ({
        startMark: 0,
        centimetres: centimetres + 0.5,
      }));
    case 5:
      return listWholeNumbers(3, 12).map((centimetres) => ({
        startMark: 0,
        centimetres: centimetres + (centimetres % 9) / 10 + 0.1,
      }));
    case 6:
      return listWholeNumbers(1, 3).flatMap((startMark) =>
        listWholeNumbers(4, 9).map((centimetres) => ({
          startMark,
          centimetres: centimetres + (centimetres % 4) / 10 + 0.2,
        })),
      );
  }
};

export const toMillimetres = (centimetres: number): number =>
  Math.round(centimetres * 10);

export const listMillimetreSlips = ({
  startMark,
  centimetres,
}: MeasuringHeightQuestion): number[] => {
  const millimetres = toMillimetres(centimetres);
  return [
    toMillimetres(startMark + centimetres),
    millimetres + 10,
    millimetres - 1,
    millimetres + 1,
    Math.floor(centimetres) * 10,
  ].filter(
    (slip, position, slips) =>
      slip > 0 && slip !== millimetres && slips.indexOf(slip) === position,
  );
};

export const listMeasuringHeightSlips = ({
  startMark,
  centimetres,
}: MeasuringHeightQuestion): number[] =>
  [startMark + centimetres, centimetres + 1, centimetres - 1, centimetres + 2]
    .filter((slip) => slip > 0 && slip !== centimetres)
    .filter((slip, position, slips) => slips.indexOf(slip) === position);

export const describeMeasuredHeight = ({
  centimetres,
}: MeasuringHeightQuestion): string =>
  Number.isInteger(centimetres)
    ? `${String(centimetres)} cm`
    : `${String(toMillimetres(centimetres))} mm`;
