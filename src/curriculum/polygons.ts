import { shapes3d, type Shape3d } from "./shapes-3d.js";

export const polygonNames = [
  "square",
  "rectangle",
  "rhombus",
  "parallelogram",
  "trapezium",
  "right-angled-trapezium",
  "kite",
  "equilateral-triangle",
  "isosceles-triangle",
  "scalene-triangle",
  "right-angled-triangle",
  "regular-pentagon",
  "irregular-pentagon",
  "regular-hexagon",
  "irregular-hexagon",
  "regular-octagon",
] as const;
export type PolygonName = (typeof polygonNames)[number];

export const isPolygonName = (value: unknown): value is PolygonName =>
  polygonNames.some((name) => name === value);

export interface PolygonProperties {
  sides: number;
  rightAngles: number;
  isRegular: boolean;
  alsoCountsAs: readonly PolygonName[];
}

export const polygonProperties: Record<PolygonName, PolygonProperties> = {
  square: {
    sides: 4,
    rightAngles: 4,
    isRegular: true,
    alsoCountsAs: ["rectangle", "rhombus", "parallelogram", "kite"],
  },
  rectangle: {
    sides: 4,
    rightAngles: 4,
    isRegular: false,
    alsoCountsAs: ["parallelogram"],
  },
  rhombus: {
    sides: 4,
    rightAngles: 0,
    isRegular: false,
    alsoCountsAs: ["parallelogram", "kite"],
  },
  parallelogram: {
    sides: 4,
    rightAngles: 0,
    isRegular: false,
    alsoCountsAs: [],
  },
  trapezium: { sides: 4, rightAngles: 0, isRegular: false, alsoCountsAs: [] },
  "right-angled-trapezium": {
    sides: 4,
    rightAngles: 2,
    isRegular: false,
    alsoCountsAs: ["trapezium"],
  },
  kite: { sides: 4, rightAngles: 0, isRegular: false, alsoCountsAs: [] },
  "equilateral-triangle": {
    sides: 3,
    rightAngles: 0,
    isRegular: true,
    alsoCountsAs: ["isosceles-triangle"],
  },
  "isosceles-triangle": {
    sides: 3,
    rightAngles: 0,
    isRegular: false,
    alsoCountsAs: [],
  },
  "scalene-triangle": {
    sides: 3,
    rightAngles: 0,
    isRegular: false,
    alsoCountsAs: [],
  },
  "right-angled-triangle": {
    sides: 3,
    rightAngles: 1,
    isRegular: false,
    // Drawn with three different side lengths, so it is scalene too.
    alsoCountsAs: ["scalene-triangle"],
  },
  "regular-pentagon": {
    sides: 5,
    rightAngles: 0,
    isRegular: true,
    alsoCountsAs: [],
  },
  "irregular-pentagon": {
    sides: 5,
    rightAngles: 2,
    isRegular: false,
    alsoCountsAs: [],
  },
  "regular-hexagon": {
    sides: 6,
    rightAngles: 0,
    isRegular: true,
    alsoCountsAs: [],
  },
  "irregular-hexagon": {
    sides: 6,
    rightAngles: 0,
    isRegular: false,
    alsoCountsAs: [],
  },
  "regular-octagon": {
    sides: 8,
    rightAngles: 0,
    isRegular: true,
    alsoCountsAs: [],
  },
};

export const polygonDifficulties = [1, 2, 3] as const;
export type PolygonDifficulty = (typeof polygonDifficulties)[number];
export type PolygonYear = 3 | 4 | 5;

export interface PolygonQuestion {
  clue: string;
  answer: PolygonName;
  distractors: PolygonName[];
}

const numberWords = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
];

export const describePolygon = (name: PolygonName): string =>
  name.replaceAll("-", " ");

const buildPropertyQuestion = (
  clue: string,
  answer: PolygonName,
  matches: (properties: PolygonProperties) => boolean,
): PolygonQuestion => ({
  clue,
  answer,
  distractors: polygonNames.filter((name) => !matches(polygonProperties[name])),
});

const buildRightAngleQuestions = () =>
  (
    [
      ["square", 4],
      ["right-angled-trapezium", 2],
      ["right-angled-triangle", 1],
      ["irregular-pentagon", 2],
      ["rectangle", 4],
    ] as const
  ).map(([answer, count]) =>
    buildPropertyQuestion(
      `Find the shape with exactly ${numberWords[count]} right ${count === 1 ? "angle" : "angles"}`,
      answer,
      ({ rightAngles }) => rightAngles === count,
    ),
  );

const buildSideQuestions = () =>
  (
    [
      ["equilateral-triangle", 3],
      ["regular-pentagon", 5],
      ["regular-hexagon", 6],
      ["regular-octagon", 8],
      ["kite", 4],
      ["irregular-pentagon", 5],
    ] as const
  ).map(([answer, count]) =>
    buildPropertyQuestion(
      `Find the shape with ${numberWords[count]} straight sides`,
      answer,
      ({ sides }) => sides === count,
    ),
  );

const fewestDistractors = 3;

const buildNamedQuestions = (names: readonly PolygonName[], sides: number) =>
  names.map((answer) => {
    const isFair = (name: PolygonName) =>
      name !== answer && !polygonProperties[name].alsoCountsAs.includes(answer);
    const sameSided = polygonNames.filter(
      (name) => isFair(name) && polygonProperties[name].sides === sides,
    );
    const otherSided = polygonNames.filter(
      (name) => isFair(name) && polygonProperties[name].sides !== sides,
    );
    return {
      clue: `Find the ${describePolygon(answer)}`,
      answer,
      distractors:
        sameSided.length >= fewestDistractors
          ? sameSided
          : [
              ...sameSided,
              ...otherSided.slice(0, fewestDistractors - sameSided.length),
            ],
    };
  });

const buildRegularQuestions = (isRegularAsked: boolean) =>
  polygonNames
    .filter((name) => polygonProperties[name].isRegular === isRegularAsked)
    .map((answer) =>
      buildPropertyQuestion(
        `Find the ${isRegularAsked ? "regular" : "irregular"} shape with ${numberWords[polygonProperties[answer].sides]} sides`,
        answer,
        ({ isRegular, sides }) =>
          isRegular === isRegularAsked &&
          sides === polygonProperties[answer].sides,
      ),
    )
    .map((question) => ({
      ...question,
      distractors: question.distractors.filter(
        (name) =>
          polygonProperties[name].sides ===
            polygonProperties[question.answer].sides ||
          polygonProperties[name].isRegular === isRegularAsked,
      ),
    }));

export const buildPolygonQuestions = (
  year: PolygonYear,
  difficulty: PolygonDifficulty,
): PolygonQuestion[] => {
  const plans: Record<
    PolygonYear,
    Record<PolygonDifficulty, () => PolygonQuestion[]>
  > = {
    3: {
      1: buildSideQuestions,
      2: buildRightAngleQuestions,
      3: () => [...buildSideQuestions(), ...buildRightAngleQuestions()],
    },
    4: {
      1: () =>
        buildNamedQuestions(
          [
            "equilateral-triangle",
            "isosceles-triangle",
            "scalene-triangle",
            "right-angled-triangle",
            "isosceles-triangle",
          ],
          3,
        ),
      2: () =>
        buildNamedQuestions(
          ["rhombus", "parallelogram", "trapezium", "kite", "rectangle"],
          4,
        ),
      3: () => [
        ...buildNamedQuestions(["scalene-triangle", "isosceles-triangle"], 3),
        ...buildNamedQuestions(["trapezium", "kite", "rhombus"], 4),
      ],
    },
    5: {
      1: () => buildRegularQuestions(true),
      2: () => buildRegularQuestions(false),
      3: () => [
        ...buildRegularQuestions(true),
        ...buildRegularQuestions(false),
      ],
    },
  };
  return plans[year][difficulty]();
};

export const shapesWithNets: readonly Shape3d[] = [
  "cube",
  "cuboid",
  "pyramid",
  "cylinder",
  "cone",
];

export const listNetDistractors = (shape: Shape3d): Shape3d[] =>
  shapes3d.filter((other) => other !== shape);
