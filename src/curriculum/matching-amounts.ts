import type { YearGroup } from "./skills.js";

export const matchingAmountSkillIds = [
  "maths.count-objects-to-20",
  "maths.fractions-of-shapes",
  "maths.equivalent-fractions",
  "maths.fractions-as-decimals",
  "maths.fractions-decimals-percentages",
  "maths.fractions-as-decimal-equivalents",
] as const;

export type MatchingAmountSkillId = (typeof matchingAmountSkillIds)[number];

export const matchingAmountSkillByYear: Record<
  YearGroup,
  MatchingAmountSkillId
> = {
  1: "maths.count-objects-to-20",
  2: "maths.fractions-of-shapes",
  3: "maths.equivalent-fractions",
  4: "maths.fractions-as-decimals",
  5: "maths.fractions-decimals-percentages",
  6: "maths.fractions-as-decimal-equivalents",
};

export const shadedShapes = ["circle", "square", "bar"] as const;
export type ShadedShape = (typeof shadedShapes)[number];

export type AmountFace =
  | { kind: "words"; text: string }
  | { kind: "fraction"; numerator: number; denominator: number }
  | { kind: "dots"; count: number }
  | { kind: "shaded-shape"; shape: ShadedShape; parts: number; shaded: number };

export interface Amount {
  key: string;
  faces: AmountFace[];
}

const words = (text: string): AmountFace => ({ kind: "words", text });

const fraction = (numerator: number, denominator: number): AmountFace => ({
  kind: "fraction",
  numerator,
  denominator,
});

const readFraction = (written: string): AmountFace => {
  const [numerator, denominator] = written.split("/").map(Number);
  return fraction(numerator, denominator);
};

const readFace = (written: string): AmountFace =>
  written.includes("/") ? readFraction(written) : words(written);

const buildAmount = (key: string, writtenFaces: readonly string[]): Amount => ({
  key,
  faces: writtenFaces.map(readFace),
});

const listCountingAmounts = (): Amount[] =>
  Array.from({ length: 20 }, (_, offset) => {
    const count = offset + 1;
    return {
      key: String(count),
      faces: [words(String(count)), { kind: "dots", count }],
    };
  });

const buildShapePictures = (parts: number, shaded: number): AmountFace[] =>
  shadedShapes.map((shape) => ({ kind: "shaded-shape", shape, parts, shaded }));

const listShapeFractionAmounts = (): Amount[] => [
  {
    key: "1/2",
    faces: [
      fraction(1, 2),
      fraction(2, 4),
      ...buildShapePictures(2, 1),
      ...buildShapePictures(4, 2),
    ],
  },
  { key: "1/3", faces: [fraction(1, 3), ...buildShapePictures(3, 1)] },
  { key: "1/4", faces: [fraction(1, 4), ...buildShapePictures(4, 1)] },
  { key: "3/4", faces: [fraction(3, 4), ...buildShapePictures(4, 3)] },
];

const equivalentFractionFamilies: readonly (readonly string[])[] = [
  ["1/2", "2/4", "3/6", "4/8", "5/10"],
  ["1/3", "2/6", "3/9", "4/12"],
  ["2/3", "4/6", "6/9", "8/12"],
  ["1/4", "2/8", "3/12", "4/16"],
  ["3/4", "6/8", "9/12", "12/16"],
  ["1/5", "2/10"],
  ["2/5", "4/10"],
  ["3/5", "6/10"],
  ["4/5", "8/10"],
];

const tenthsAndHundredths: readonly (readonly string[])[] = [
  ["1/10", "0.1"],
  ["2/10", "0.2"],
  ["3/10", "0.3"],
  ["4/10", "0.4"],
  ["1/2", "5/10", "0.5"],
  ["6/10", "0.6"],
  ["7/10", "0.7"],
  ["8/10", "0.8"],
  ["9/10", "0.9"],
  ["1/4", "25/100", "0.25"],
  ["3/4", "75/100", "0.75"],
  ["7/100", "0.07"],
  ["3/100", "0.03"],
  ["23/100", "0.23"],
  ["41/100", "0.41"],
  ["9/100", "0.09"],
];

const fractionsDecimalsAndPercentages: readonly (readonly string[])[] = [
  ["1/2", "0.5", "50%"],
  ["1/4", "0.25", "25%"],
  ["3/4", "0.75", "75%"],
  ["1/10", "0.1", "10%"],
  ["3/10", "0.3", "30%"],
  ["7/10", "0.7", "70%"],
  ["9/10", "0.9", "90%"],
  ["1/5", "0.2", "20%"],
  ["2/5", "0.4", "40%"],
  ["3/5", "0.6", "60%"],
  ["4/5", "0.8", "80%"],
  ["1/25", "0.04", "4%"],
  ["3/25", "0.12", "12%"],
  ["1/100", "0.01", "1%"],
];

const decimalEquivalents: readonly (readonly string[])[] = [
  ["1/8", "0.125", "12.5%"],
  ["3/8", "0.375", "37.5%"],
  ["5/8", "0.625", "62.5%"],
  ["7/8", "0.875", "87.5%"],
  ["1/5", "0.2"],
  ["2/5", "0.4"],
  ["3/5", "0.6"],
  ["4/5", "0.8"],
  ["1/4", "0.25", "25%"],
  ["3/4", "0.75", "75%"],
  ["1/20", "0.05", "5%"],
  ["3/20", "0.15", "15%"],
  ["7/20", "0.35", "35%"],
  ["9/25", "0.36", "36%"],
  ["1/2", "0.5", "50%"],
];

const listWrittenAmounts = (
  families: readonly (readonly string[])[],
): Amount[] => families.map((family) => buildAmount(family[0], family));

const amountListers: Record<MatchingAmountSkillId, () => Amount[]> = {
  "maths.count-objects-to-20": listCountingAmounts,
  "maths.fractions-of-shapes": listShapeFractionAmounts,
  "maths.equivalent-fractions": () =>
    listWrittenAmounts(equivalentFractionFamilies),
  "maths.fractions-as-decimals": () => listWrittenAmounts(tenthsAndHundredths),
  "maths.fractions-decimals-percentages": () =>
    listWrittenAmounts(fractionsDecimalsAndPercentages),
  "maths.fractions-as-decimal-equivalents": () =>
    listWrittenAmounts(decimalEquivalents),
};

export const listMatchingAmounts = (skillId: MatchingAmountSkillId): Amount[] =>
  amountListers[skillId]();

export const describeAmountFace = (face: AmountFace): string => {
  switch (face.kind) {
    case "words":
      return face.text;
    case "fraction":
      return `${String(face.numerator)} over ${String(face.denominator)}`;
    case "dots":
      return `${String(face.count)} ${face.count === 1 ? "dot" : "dots"}`;
    case "shaded-shape":
      return `a ${face.shape} in ${String(face.parts)} equal parts with ${String(face.shaded)} shaded`;
  }
};
