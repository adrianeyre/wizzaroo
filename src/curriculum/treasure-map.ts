import { listWholeNumbers } from "./counting-to-20.js";
import { formatNumber } from "./number-format.js";
import {
  buildWordQuestion,
  type PictureQuestion,
  type PictureQuestionDifficulty,
} from "./picture-questions.js";

export type Landmark =
  "shell" | "starfish" | "crab" | "anchor" | "pearl" | "fish";

export interface GridPoint {
  x: number;
  y: number;
}

export interface LabelledPoint extends GridPoint {
  label: string;
}

export interface MirrorLine {
  axis: "x" | "y";
  at: number;
}

export interface TreasureGrid {
  kind: "grid";
  low: number;
  high: number;
  treasure: GridPoint | undefined;
  submarine: GridPoint | undefined;
  flags: LabelledPoint[];
  outline: GridPoint[];
  isOutlineClosed: boolean;
  mirror: MirrorLine | undefined;
}

export type MapPicture =
  | { kind: "turn"; around: Landmark[]; facing: number }
  | { kind: "shelf"; rows: Landmark[][] }
  | TreasureGrid;

export type TreasureMapQuestion = PictureQuestion<MapPicture>;

export type TreasureMapYear = 1 | 2 | 4 | 5 | 6;

export const formatPoint = ({ x, y }: GridPoint): string =>
  `(${formatNumber(x)}, ${formatNumber(y)})`;

export const quartersInATurn = 4;

const arrangements: Landmark[][] = [
  ["shell", "starfish", "crab", "anchor"],
  ["pearl", "fish", "shell", "crab"],
  ["anchor", "pearl", "starfish", "fish"],
];

interface TurnWords {
  quarters: number;
  words: string;
}

const yearOneTurns: Record<1 | 2, TurnWords[]> = {
  1: [
    { quarters: 4, words: "makes a whole turn" },
    { quarters: 2, words: "makes a half turn" },
  ],
  2: [
    { quarters: 1, words: "makes a quarter turn to the right" },
    { quarters: 3, words: "makes a quarter turn to the left" },
    { quarters: 3, words: "makes a three-quarter turn to the right" },
    { quarters: 1, words: "makes a three-quarter turn to the left" },
  ],
};

const yearTwoTurns: Record<1 | 2, TurnWords[]> = {
  1: [
    { quarters: 1, words: "turns a quarter turn clockwise" },
    { quarters: 3, words: "turns a quarter turn anticlockwise" },
    { quarters: 2, words: "turns a half turn clockwise" },
  ],
  2: [
    { quarters: 3, words: "turns a three-quarter turn clockwise" },
    { quarters: 1, words: "turns a three-quarter turn anticlockwise" },
    { quarters: 2, words: "turns 2 right angles anticlockwise" },
    { quarters: 3, words: "turns 3 right angles clockwise" },
  ],
};

const buildTurnQuestions = (turns: readonly TurnWords[]) =>
  arrangements.flatMap((around) =>
    listWholeNumbers(0, quartersInATurn - 1).flatMap((facing) =>
      turns.map(({ quarters, words }) =>
        buildWordQuestion<MapPicture>(
          `The turtle faces the ${around[facing]}. It ${words}. What does it face now?`,
          { kind: "turn", around, facing },
          around[(facing + quarters) % quartersInATurn],
          around,
        ),
      ),
    ),
  );

const rightAngleChoices = ["1", "2", "3", "4"];

const buildRightAngleQuestions = (): TreasureMapQuestion[] =>
  arrangements.flatMap((around) =>
    listWholeNumbers(0, quartersInATurn - 1).flatMap((facing) =>
      listWholeNumbers(1, quartersInATurn - 1).flatMap((quarters) => {
        const target = around[(facing + quarters) % quartersInATurn];
        const isClockwise = (facing + quarters) % 2 === 0;
        const answer = isClockwise ? quarters : quartersInATurn - quarters;
        return buildWordQuestion<MapPicture>(
          `The turtle faces the ${around[facing]}. How many right angles must it turn ${isClockwise ? "clockwise" : "anticlockwise"} to face the ${target}?`,
          { kind: "turn", around, facing },
          String(answer),
          rightAngleChoices,
        );
      }),
    ),
  );

const shelves: Landmark[][][] = [
  [
    ["shell", "crab", "pearl"],
    ["fish", "anchor", "starfish"],
  ],
  [
    ["anchor", "fish", "shell"],
    ["starfish", "pearl", "crab"],
  ],
  [
    ["pearl", "starfish", "fish"],
    ["crab", "shell", "anchor"],
  ],
];

const buildShelfQuestions = (): TreasureMapQuestion[] =>
  shelves.flatMap((rows) => {
    const [top, bottom] = rows;
    const everyLandmark = rows.flat();
    const buildShelfQuestion = (question: string, answer: Landmark) =>
      buildWordQuestion<MapPicture>(
        question,
        { kind: "shelf", rows },
        answer,
        everyLandmark.filter(
          (landmark) => !question.includes(`the ${landmark}`),
        ),
      );
    return [
      ...top.map((above, column) =>
        buildShelfQuestion(`What is above the ${bottom[column]}?`, above),
      ),
      ...bottom.map((below, column) =>
        buildShelfQuestion(`What is below the ${top[column]}?`, below),
      ),
      buildShelfQuestion(`What is to the right of the ${top[0]}?`, top[1]),
      buildShelfQuestion(`What is to the left of the ${bottom[2]}?`, bottom[1]),
      buildShelfQuestion(
        `What is between the ${top[0]} and the ${top[2]}?`,
        top[1],
      ),
      buildShelfQuestion(
        `What is between the ${bottom[0]} and the ${bottom[2]}?`,
        bottom[1],
      ),
    ];
  });

const buildGrid = (
  low: number,
  high: number,
  parts: Partial<Omit<TreasureGrid, "kind" | "low" | "high">>,
): TreasureGrid => ({
  kind: "grid",
  low,
  high,
  treasure: undefined,
  submarine: undefined,
  flags: [],
  outline: [],
  isOutlineClosed: false,
  mirror: undefined,
  ...parts,
});

const isOnGrid = ({ x, y }: GridPoint, low: number, high: number) =>
  x >= low && x <= high && y >= low && y <= high;

const listPointSlips = (
  candidates: readonly GridPoint[],
  low: number,
  high: number,
): string[] =>
  candidates
    .filter((candidate) => isOnGrid(candidate, low, high))
    .map(formatPoint);

const buildPointQuestion = (
  ask: string,
  grid: TreasureGrid,
  answer: GridPoint,
  candidates: readonly GridPoint[],
): TreasureMapQuestion =>
  buildWordQuestion<MapPicture>(
    ask,
    grid,
    formatPoint(answer),
    listPointSlips(candidates, grid.low, grid.high),
  );

const buildReadQuestion = (
  point: GridPoint,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const { x, y } = point;
  return buildPointQuestion(
    "What are the coordinates of the treasure?",
    buildGrid(low, high, { treasure: point }),
    point,
    [
      { x: y, y: x },
      { x: -x, y },
      { x, y: -y },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x - 1, y },
    ],
  );
};

const flagLetters = ["A", "B", "C", "D"];

const buildFlagQuestion = (
  point: GridPoint,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const { x, y } = point;
  const decoys = [
    { x: y, y: x },
    { x: x + 1, y: y + 1 },
    { x, y: y - 2 },
    { x: x - 2, y },
    { x: x + 2, y: y - 1 },
  ]
    .filter((decoy) => isOnGrid(decoy, low, high))
    .filter((decoy) => decoy.x !== x || decoy.y !== y)
    .slice(0, flagLetters.length - 1);
  const answerIndex = (x + y) % flagLetters.length;
  const flagPoints = [...decoys];
  flagPoints.splice(answerIndex, 0, point);
  const flags = flagPoints.map((flagPoint, index) => ({
    ...flagPoint,
    label: flagLetters[index],
  }));
  return buildWordQuestion<MapPicture>(
    `Which flag is at ${formatPoint(point)}?`,
    buildGrid(low, high, { flags }),
    flagLetters[flagPoints.indexOf(point)],
    flags.map(({ label }) => label),
  );
};

interface Move {
  across: number;
  up: number;
}

const describeMove = ({ across, up }: Move): string =>
  `${String(Math.abs(across))} ${across > 0 ? "right" : "left"}, ${String(Math.abs(up))} ${up > 0 ? "up" : "down"}`;

const describeMoveInSquares = ({ across, up }: Move): string =>
  `${String(Math.abs(across))} ${Math.abs(across) === 1 ? "square" : "squares"} ${across > 0 ? "right" : "left"} and ${String(Math.abs(up))} ${Math.abs(up) === 1 ? "square" : "squares"} ${up > 0 ? "up" : "down"}`;

const moveBy = ({ x, y }: GridPoint, { across, up }: Move): GridPoint => ({
  x: x + across,
  y: y + up,
});

const buildTranslateQuestion = (
  start: GridPoint,
  move: Move,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const end = moveBy(start, move);
  return buildPointQuestion(
    `The submarine at ${formatPoint(start)} moves ${describeMoveInSquares(move)}. Where is it now?`,
    buildGrid(low, high, { submarine: start }),
    end,
    [
      moveBy(start, { across: move.up, up: move.across }),
      moveBy(start, { across: -move.across, up: move.up }),
      moveBy(start, { across: move.across, up: -move.up }),
      { x: end.y, y: end.x },
      { x: end.x + 1, y: end.y },
      { x: end.x - 1, y: end.y },
      { x: end.x, y: end.y + 1 },
      { x: end.x, y: end.y - 1 },
      start,
    ],
  );
};

const buildDescribeMoveQuestion = (
  start: GridPoint,
  move: Move,
  low: number,
  high: number,
): TreasureMapQuestion =>
  buildWordQuestion<MapPicture>(
    `The submarine sails from ${formatPoint(start)} to the treasure at ${formatPoint(moveBy(start, move))}. How did it move?`,
    buildGrid(low, high, { submarine: start, treasure: moveBy(start, move) }),
    describeMove(move),
    [
      describeMove({ across: move.up, up: move.across }),
      describeMove({ across: -move.across, up: move.up }),
      describeMove({ across: move.across, up: -move.up }),
      describeMove({ across: -move.across, up: -move.up }),
    ],
  );

const buildRectangleQuestion = (
  corner: GridPoint,
  opposite: GridPoint,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const given = [corner, { x: opposite.x, y: corner.y }, opposite];
  const missing = { x: corner.x, y: opposite.y };
  return buildPointQuestion(
    `Three corners of a rectangle are ${given.map(formatPoint).join(", ")}. Where is the fourth corner?`,
    buildGrid(low, high, { outline: given }),
    missing,
    [
      { x: missing.y, y: missing.x },
      { x: opposite.y, y: corner.x },
      { x: missing.x + 1, y: missing.y },
      { x: missing.x, y: missing.y + 1 },
      { x: missing.x - 1, y: missing.y },
    ],
  );
};

const reflectPoint = (
  { x, y }: GridPoint,
  { axis, at }: MirrorLine,
): GridPoint => (axis === "x" ? { x: 2 * at - x, y } : { x, y: 2 * at - y });

const describeMirror = ({ axis, at }: MirrorLine, isAxisNamed: boolean) => {
  if (isAxisNamed && at === 0) {
    return axis === "x" ? "the y-axis" : "the x-axis";
  }
  return `the mirror line ${axis} = ${formatNumber(at)}`;
};

const buildReflectQuestion = (
  point: GridPoint,
  mirror: MirrorLine,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const image = reflectPoint(point, mirror);
  const otherMirror: MirrorLine = {
    axis: mirror.axis === "x" ? "y" : "x",
    at: mirror.at,
  };
  return buildPointQuestion(
    `The pearl at ${formatPoint(point)} is reflected in ${describeMirror(mirror, low < 0)}. Where does it land?`,
    buildGrid(low, high, { treasure: point, mirror }),
    image,
    [
      reflectPoint(point, otherMirror),
      point,
      { x: image.y, y: image.x },
      mirror.axis === "x"
        ? { x: image.x + 1, y: image.y }
        : { x: image.x, y: image.y + 1 },
      mirror.axis === "x"
        ? { x: image.x - 1, y: image.y }
        : { x: image.x, y: image.y - 1 },
    ],
  );
};

const triangleLetters = ["A", "B", "C"];

const buildShapeMoveQuestion = (
  corners: readonly GridPoint[],
  move: Move,
  askedIndex: number,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const asked = corners[askedIndex];
  const flags = corners.map((corner, index) => ({
    ...corner,
    label: triangleLetters[index],
  }));
  const image = moveBy(asked, move);
  return buildPointQuestion(
    `Triangle ABC is translated ${describeMoveInSquares(move)}. Where is corner ${triangleLetters[askedIndex]} now?`,
    buildGrid(low, high, {
      flags,
      outline: [...corners],
      isOutlineClosed: true,
    }),
    image,
    [
      ...corners
        .filter((_, index) => index !== askedIndex)
        .map((corner) => moveBy(corner, move)),
      moveBy(asked, { across: move.up, up: move.across }),
      moveBy(asked, { across: -move.across, up: move.up }),
      { x: image.y, y: image.x },
    ],
  );
};

const buildShapeReflectQuestion = (
  corners: readonly GridPoint[],
  mirror: MirrorLine,
  askedIndex: number,
  low: number,
  high: number,
): TreasureMapQuestion => {
  const asked = corners[askedIndex];
  const flags = corners.map((corner, index) => ({
    ...corner,
    label: triangleLetters[index],
  }));
  const image = reflectPoint(asked, mirror);
  return buildPointQuestion(
    `Triangle ABC is reflected in ${describeMirror(mirror, low < 0)}. Where does corner ${triangleLetters[askedIndex]} land?`,
    buildGrid(low, high, {
      flags,
      outline: [...corners],
      isOutlineClosed: true,
      mirror,
    }),
    image,
    [
      ...corners
        .filter((_, index) => index !== askedIndex)
        .map((corner) => reflectPoint(corner, mirror)),
      asked,
      { x: image.y, y: image.x },
      { x: image.x + 1, y: image.y + 1 },
      { x: image.x - 1, y: image.y },
      { x: image.x, y: image.y - 1 },
    ],
  );
};

const listGridPoints = (
  xs: readonly number[],
  ys: readonly number[],
): GridPoint[] => xs.flatMap((x) => ys.map((y) => ({ x, y })));

const firstQuadrant = { low: 0, high: 8 };
const largerFirstQuadrant = { low: 0, high: 10 };
const fourQuadrants = { low: -6, high: 6 };

const buildYearFourQuestions = (
  difficulty: PictureQuestionDifficulty,
): TreasureMapQuestion[] => {
  const { low, high } = firstQuadrant;
  switch (difficulty) {
    case 1:
      return [
        ...listGridPoints([1, 2, 3, 5, 6, 7], [1, 3, 4, 6])
          .filter(({ x, y }) => x !== y)
          .map((point) => buildReadQuestion(point, low, high)),
        ...listGridPoints([2, 4, 6], [3, 5]).map((point) =>
          buildFlagQuestion(point, low, high),
        ),
      ];
    case 2:
      return [
        ...listGridPoints([1, 2, 3], [1, 2]).flatMap((start) =>
          [
            { across: 3, up: 2 },
            { across: 2, up: 4 },
            { across: 4, up: 1 },
          ].map((move) => buildTranslateQuestion(start, move, low, high)),
        ),
        ...listGridPoints([6, 7], [6, 7]).flatMap((start) =>
          [
            { across: -3, up: -2 },
            { across: -2, up: -4 },
            { across: -4, up: -1 },
          ].map((move) => buildTranslateQuestion(start, move, low, high)),
        ),
      ];
    case 3:
      return listGridPoints([1, 2, 3], [1, 2]).flatMap((corner) =>
        [
          { x: corner.x + 3, y: corner.y + 4 },
          { x: corner.x + 4, y: corner.y + 2 },
          { x: corner.x + 2, y: corner.y + 5 },
        ].map((opposite) =>
          buildRectangleQuestion(corner, opposite, low, high),
        ),
      );
  }
};

const yearFiveTriangles: GridPoint[][] = [
  [
    { x: 1, y: 1 },
    { x: 4, y: 1 },
    { x: 1, y: 4 },
  ],
  [
    { x: 2, y: 2 },
    { x: 4, y: 3 },
    { x: 3, y: 5 },
  ],
  [
    { x: 1, y: 3 },
    { x: 3, y: 1 },
    { x: 4, y: 4 },
  ],
];

const buildYearFiveQuestions = (
  difficulty: PictureQuestionDifficulty,
): TreasureMapQuestion[] => {
  const { low, high } = largerFirstQuadrant;
  switch (difficulty) {
    case 1:
      return listGridPoints([2, 4], [3, 6]).flatMap((start) =>
        [
          { across: 4, up: -2 },
          { across: 3, up: 3 },
          { across: 5, up: 1 },
          { across: 2, up: -3 },
        ].map((move) => buildDescribeMoveQuestion(start, move, low, high)),
      );
    case 2:
      return [
        ...listGridPoints([1, 2, 3], [2, 6, 8]).map((point) =>
          buildReflectQuestion(point, { axis: "x", at: 5 }, low, high),
        ),
        ...listGridPoints([2, 6, 8], [1, 3]).map((point) =>
          buildReflectQuestion(point, { axis: "y", at: 5 }, low, high),
        ),
      ];
    case 3:
      return yearFiveTriangles.flatMap((corners) =>
        listWholeNumbers(0, 2).flatMap((askedIndex) => [
          buildShapeMoveQuestion(
            corners,
            { across: 4, up: 3 },
            askedIndex,
            low,
            high,
          ),
          buildShapeReflectQuestion(
            corners,
            { axis: "x", at: 5 },
            askedIndex,
            low,
            high,
          ),
        ]),
      );
  }
};

const yearSixTriangles: GridPoint[][] = [
  [
    { x: 1, y: 1 },
    { x: 4, y: 2 },
    { x: 2, y: 5 },
  ],
  [
    { x: -5, y: 1 },
    { x: -2, y: 1 },
    { x: -4, y: 4 },
  ],
];

const buildYearSixQuestions = (
  difficulty: PictureQuestionDifficulty,
): TreasureMapQuestion[] => {
  const { low, high } = fourQuadrants;
  switch (difficulty) {
    case 1:
      return listGridPoints([-5, -3, -2, 2, 4], [-4, -1, 3, 5])
        .filter(({ x, y }) => Math.abs(x) !== Math.abs(y))
        .map((point) => buildReadQuestion(point, low, high));
    case 2:
      return [
        ...listGridPoints([-4, -2], [-3, 1]).flatMap((start) =>
          [
            { across: 5, up: 2 },
            { across: 3, up: -2 },
            { across: 6, up: 3 },
          ].map((move) => buildTranslateQuestion(start, move, low, high)),
        ),
        ...listGridPoints([2, 4], [3, -1]).flatMap((start) =>
          [
            { across: -5, up: -3 },
            { across: -6, up: 1 },
          ].map((move) => buildTranslateQuestion(start, move, low, high)),
        ),
      ];
    case 3:
      return [
        ...listGridPoints([-5, -2, 3, 4], [-4, 2, 5]).flatMap((point) => [
          buildReflectQuestion(point, { axis: "x", at: 0 }, low, high),
          buildReflectQuestion(point, { axis: "y", at: 0 }, low, high),
        ]),
        ...yearSixTriangles.flatMap((corners) =>
          listWholeNumbers(0, 2).map((askedIndex) =>
            buildShapeReflectQuestion(
              corners,
              { axis: corners[0].x > 0 ? "x" : "y", at: 0 },
              askedIndex,
              low,
              high,
            ),
          ),
        ),
        buildRectangleQuestion({ x: -4, y: -3 }, { x: 2, y: 3 }, low, high),
        buildRectangleQuestion({ x: -5, y: -2 }, { x: 3, y: 4 }, low, high),
      ];
  }
};

const yearBuilders: Record<
  TreasureMapYear,
  (difficulty: PictureQuestionDifficulty) => TreasureMapQuestion[]
> = {
  1: (difficulty) =>
    difficulty === 3
      ? buildShelfQuestions()
      : buildTurnQuestions(yearOneTurns[difficulty]),
  2: (difficulty) =>
    difficulty === 3
      ? buildRightAngleQuestions()
      : buildTurnQuestions(yearTwoTurns[difficulty]),
  4: buildYearFourQuestions,
  5: buildYearFiveQuestions,
  6: buildYearSixQuestions,
};

export const buildTreasureMapQuestions = (
  year: TreasureMapYear,
  difficulty: PictureQuestionDifficulty,
): TreasureMapQuestion[] => yearBuilders[year](difficulty);
