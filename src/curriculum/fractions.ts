export const fractionDifficulties = [1, 2, 3] as const;
export type FractionDifficulty = (typeof fractionDifficulties)[number];

export type FractionYear = 1 | 2 | 3 | 4 | 5 | 6;
export type FractionOutline = "circle" | "square";

export interface FractionPicture {
  shaded: number;
  parts: number;
  isEqual: boolean;
}

export interface FractionQuestion {
  target: string;
  outline: FractionOutline;
  askedAs: string;
  distractors: readonly string[];
}

const fractionPictureShape =
  /^(?<uneven>uneven-)?(?<shaded>\d+)\/(?<parts>\d+)$/;

export const parseFractionPicture = (
  picture: string,
): FractionPicture | undefined => {
  const groups = fractionPictureShape.exec(picture)?.groups;
  if (groups === undefined) {
    return undefined;
  }
  return {
    shaded: Number(groups.shaded),
    parts: Number(groups.parts),
    isEqual: !picture.startsWith("uneven-"),
  };
};

const distractorsByTarget: Record<string, readonly string[]> = {
  "1/2": ["1/4", "3/4", "1/1", "uneven-1/2"],
  "1/4": ["1/2", "3/4", "1/1", "uneven-1/4"],
  "1/3": ["1/2", "1/4", "2/3", "uneven-1/3"],
  "2/4": ["1/4", "3/4", "1/3", "uneven-2/4"],
  "3/4": ["1/4", "2/4", "2/3", "uneven-3/4"],
};

export const listFractionDistractors = (target: string): readonly string[] =>
  distractorsByTarget[target] ?? [];

interface FractionAsk {
  target: string;
  askedAs: string;
}

const askFor = (target: string): FractionAsk => ({ target, askedAs: target });
const askEqualTo = (target: string, equalTo: string): FractionAsk => ({
  target,
  askedAs: `a fraction equal to ${equalTo}`,
});
const askAs = (target: string, askedAs: string): FractionAsk => ({
  target,
  askedAs,
});

const asksByYear: Record<
  FractionYear,
  Record<FractionDifficulty, readonly FractionAsk[]>
> = {
  1: {
    1: ["1/2", "1/2", "1/2"].map(askFor),
    2: ["1/4", "1/4", "1/4"].map(askFor),
    3: ["1/2", "1/4", "1/2", "1/4"].map(askFor),
  },
  2: {
    1: ["1/3", "1/3", "1/3"].map(askFor),
    2: ["2/4", "3/4", "2/4"].map(askFor),
    3: ["1/3", "2/4", "3/4", "1/4"].map(askFor),
  },
  3: {
    1: ["1/3", "1/5", "1/6", "1/8", "1/10"].map(askFor),
    2: ["2/3", "3/5", "5/8", "7/10", "4/6"].map(askFor),
    3: ["2/5", "1/8", "5/6", "3/10", "3/8"].map(askFor),
  },
  4: {
    1: [
      askEqualTo("2/4", "1/2"),
      askEqualTo("3/6", "1/2"),
      askEqualTo("4/8", "1/2"),
      askEqualTo("5/10", "1/2"),
    ],
    2: [
      askEqualTo("2/6", "1/3"),
      askEqualTo("4/6", "2/3"),
      askEqualTo("2/8", "1/4"),
      askEqualTo("6/8", "3/4"),
    ],
    3: [
      askEqualTo("2/10", "1/5"),
      askEqualTo("6/10", "3/5"),
      askEqualTo("3/6", "1/2"),
      askEqualTo("6/8", "3/4"),
      askEqualTo("8/10", "4/5"),
    ],
  },
  5: {
    1: [askAs("1/2", "50%"), askAs("1/4", "25%"), askAs("3/4", "75%")],
    2: [
      askAs("1/10", "10%"),
      askAs("1/5", "20%"),
      askAs("2/5", "40%"),
      askAs("7/10", "70%"),
      askAs("3/10", "30%"),
    ],
    3: [
      askAs("3/4", "75%"),
      askAs("4/5", "80%"),
      askAs("9/10", "90%"),
      askAs("1/4", "25%"),
      askAs("3/5", "60%"),
    ],
  },
  6: {
    1: [askAs("1/2", "0.5"), askAs("1/4", "0.25"), askAs("3/4", "0.75")],
    2: [
      askAs("1/5", "0.2"),
      askAs("2/5", "0.4"),
      askAs("3/5", "0.6"),
      askAs("4/5", "0.8"),
    ],
    3: [
      askAs("3/8", "0.375"),
      askAs("1/8", "0.125"),
      askAs("5/8", "0.625"),
      askAs("7/8", "0.875"),
    ],
  },
};

const largestParts = 10;

const findPictureValue = (picture: string) => {
  const parsed = parseFractionPicture(picture);
  return parsed === undefined ? Number.NaN : parsed.shaded / parsed.parts;
};

const listEveryPicture = (): string[] =>
  Array.from({ length: largestParts - 1 }, (_, index) => index + 2).flatMap(
    (parts) =>
      Array.from(
        { length: parts - 1 },
        (_, shaded) => `${String(shaded + 1)}/${String(parts)}`,
      ),
  );

const distractorsShown = 4;

const findNearDistractors = (target: string): string[] => {
  const value = findPictureValue(target);
  const targetParts = parseFractionPicture(target)?.parts ?? 0;
  return listEveryPicture()
    .filter((picture) => Math.abs(findPictureValue(picture) - value) > 1e-9)
    .toSorted((first, second) => {
      const firstParts =
        parseFractionPicture(first)?.parts === targetParts ? 0 : 0.05;
      const secondParts =
        parseFractionPicture(second)?.parts === targetParts ? 0 : 0.05;
      return (
        Math.abs(findPictureValue(first) - value) +
        firstParts -
        (Math.abs(findPictureValue(second) - value) + secondParts)
      );
    })
    .slice(0, distractorsShown);
};

const listDistractors = (target: string): readonly string[] =>
  distractorsByTarget[target] ?? findNearDistractors(target);

const outlines: readonly FractionOutline[] = ["circle", "square"];

export const buildFractionQuestions = (
  year: FractionYear,
  difficulty: FractionDifficulty,
): FractionQuestion[] =>
  asksByYear[year][difficulty].flatMap(({ target, askedAs }) =>
    outlines.map((outline) => ({
      target,
      outline,
      askedAs,
      distractors:
        year <= 2 ? listDistractors(target) : findNearDistractors(target),
    })),
  );

const fractionWords: Record<string, string> = {
  "1/1": "the whole",
  "1/2": "one half",
  "1/3": "one third",
  "2/3": "two thirds",
  "1/4": "one quarter",
  "2/4": "two quarters",
  "3/4": "three quarters",
};

export const describeFraction = (target: string): string =>
  fractionWords[target] ?? target.replace("/", " out of ");

export const describeFractionPicture = (picture: string): string => {
  const parsed = parseFractionPicture(picture);
  if (parsed === undefined) {
    return picture;
  }
  if (!parsed.isEqual) {
    return `${String(parsed.parts)} parts that are not equal, ${String(parsed.shaded)} shaded`;
  }
  return parsed.shaded === parsed.parts
    ? "all of it shaded"
    : `${describeFraction(picture)} shaded`;
};
