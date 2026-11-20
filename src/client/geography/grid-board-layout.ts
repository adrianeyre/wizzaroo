import {
  findGridOrigin,
  gridSquareCount,
  type GeographyShowOf,
  type GridStyle,
} from "../../curriculum/geography.js";

export interface GridPoint {
  across: number;
  up: number;
}

export interface BoardPosition {
  x: number;
  y: number;
}

export interface GridAxisLabels {
  along: string[];
  upward: string[];
}

export const boardTexturePixels = 512;
export const boardWorldSize = 2.9;
export const gridLeftPixel = 66;
export const gridTopPixel = 24;
export const squarePixels = 68;
export const gridSidePixels = squarePixels * gridSquareCount;
export const gridBottomPixel = gridTopPixel + gridSidePixels;
export const gridRightPixel = gridLeftPixel + gridSidePixels;

const columnLetters = "ABCDEF";
const tenthsPerSquare = 10;

const listSquareIndexes = (): number[] =>
  Array.from({ length: gridSquareCount }, (_unused, index) => index);

const listLineIndexes = (): number[] =>
  Array.from({ length: gridSquareCount + 1 }, (_unused, index) => index);

const describeGridLine = (value: number): string =>
  String(value % 100).padStart(2, "0");

export const isLabellingSquares = (style: GridStyle): boolean =>
  style === "letters";

export const buildGridAxisLabels = (
  style: GridStyle,
  origin: { x: number; y: number },
): GridAxisLabels => {
  if (isLabellingSquares(style)) {
    return {
      along: listSquareIndexes().map((index) => columnLetters.charAt(index)),
      upward: listSquareIndexes().map((index) => String(origin.y + index)),
    };
  }
  return {
    along: listLineIndexes().map((index) => describeGridLine(origin.x + index)),
    upward: listLineIndexes().map((index) =>
      describeGridLine(origin.y + index),
    ),
  };
};

export const findPinGridPoint = (
  show: GeographyShowOf<"grid-hunt">,
): GridPoint => {
  const origin = findGridOrigin(show);
  const across = show.x - origin.x;
  const up = show.y - origin.y;
  return show.style === "six-figure"
    ? { across, up }
    : { across: across + 0.5, up: up + 0.5 };
};

const readTenths = (squares: number) => {
  const tenths = Math.round(squares * tenthsPerSquare);
  return {
    square: Math.floor(tenths / tenthsPerSquare),
    tenth: tenths % tenthsPerSquare,
  };
};

export const readGridReferenceAt = (
  style: GridStyle,
  labels: GridAxisLabels,
  point: GridPoint,
): string => {
  if (style === "six-figure") {
    const along = readTenths(point.across);
    const upward = readTenths(point.up);
    return `${labels.along[along.square] ?? ""}${String(along.tenth)}${labels.upward[upward.square] ?? ""}${String(upward.tenth)}`;
  }
  const column = Math.floor(point.across);
  const row = Math.floor(point.up);
  return `${labels.along[column] ?? ""}${labels.upward[row] ?? ""}`;
};

export const findLinePixelAlong = (across: number): number =>
  gridLeftPixel + across * squarePixels;

export const findLinePixelUpward = (up: number): number =>
  gridBottomPixel - up * squarePixels;

export const findBoardPosition = (point: GridPoint): BoardPosition => ({
  x:
    (findLinePixelAlong(point.across) / boardTexturePixels - 0.5) *
    boardWorldSize,
  y:
    (0.5 - findLinePixelUpward(point.up) / boardTexturePixels) * boardWorldSize,
});

export const findGridPointAt = (position: BoardPosition): GridPoint => ({
  across:
    ((position.x / boardWorldSize + 0.5) * boardTexturePixels - gridLeftPixel) /
    squarePixels,
  up:
    (gridBottomPixel -
      (0.5 - position.y / boardWorldSize) * boardTexturePixels) /
    squarePixels,
});
