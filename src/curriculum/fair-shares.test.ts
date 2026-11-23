import { describe, expect, it } from "vitest";
import { buildFairShareQuestions, type SharePicture } from "./fair-shares.js";
import { pictureQuestionDifficulties } from "./picture-questions.js";

const everyLevel = ([1, 2, 6] as const).flatMap((year) =>
  pictureQuestionDifficulties.map((difficulty) => ({ year, difficulty })),
);

const findPictureTotal = (picture: SharePicture): number | undefined => {
  switch (picture.kind) {
    case "groups":
      return picture.groupCount * picture.perGroup;
    case "array":
      return picture.rows * picture.columns;
    case "share":
    case "parts":
      return picture.total;
    default:
      return undefined;
  }
};

describe("buildFairShareQuestions", () => {
  it.each(everyLevel)(
    "gives Year $year at difficulty $difficulty at least five questions, each with three different slips",
    ({ year, difficulty }) => {
      const questions = buildFairShareQuestions(year, difficulty);

      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { answer, slips } of questions) {
        expect(new Set(slips).size).toBe(slips.length);
        expect(slips).not.toContain(answer);
        expect(slips.length).toBeGreaterThanOrEqual(3);
      }
      expect(
        new Set(questions.map(({ ask, answer }) => `${ask} ${answer}`)).size,
      ).toBe(questions.length);
    },
  );

  it("keeps every Year 1 picture to 20 objects or fewer, as the Year 1 programme of study does", () => {
    for (const difficulty of pictureQuestionDifficulties) {
      for (const { picture } of buildFairShareQuestions(1, difficulty)) {
        expect(findPictureTotal(picture) ?? 0).toBeLessThanOrEqual(20);
      }
    }
  });

  it("answers a double, an array and a fair share correctly", () => {
    const [double] = buildFairShareQuestions(1, 1);
    expect(double).toMatchObject({ ask: "Double 1 is ?", answer: "2" });

    const sharing = buildFairShareQuestions(1, 3).find(({ ask }) =>
      ask.startsWith("Share 15 pearls equally between 5 crabs"),
    );
    expect(sharing?.answer).toBe("3");

    const array = buildFairShareQuestions(1, 2).find(
      ({ picture }) =>
        picture.kind === "array" && picture.rows === 3 && picture.columns === 4,
    );
    expect(array?.answer).toBe("12");
  });

  it("asks Year 2 only the 2, 5 and 10 times tables, with division facts that come back whole", () => {
    for (const { ask, answer } of buildFairShareQuestions(2, 1)) {
      const [, groups, table] = /^(\d+) × (\d+) = \?$/.exec(ask) ?? [];
      expect([2, 5, 10]).toContain(Number(table));
      expect(Number(answer)).toBe(Number(groups) * Number(table));
    }
    for (const { ask, answer } of buildFairShareQuestions(2, 2)) {
      const [, total, divisor] = /^(\d+) ÷ (\d+) = \?$/.exec(ask) ?? [];
      expect(Number(answer) * Number(divisor)).toBe(Number(total));
    }
  });

  it("offers an odd one among even numbers, and an even one among odd numbers", () => {
    const parityQuestions = buildFairShareQuestions(2, 3).filter(
      ({ picture }) => picture.kind === "pairs",
    );

    expect(parityQuestions.length).toBeGreaterThanOrEqual(5);
    for (const { ask, answer, slips } of parityQuestions) {
      const parity = ask.includes("even") ? 0 : 1;
      expect(Number(answer) % 2).toBe(parity);
      for (const slip of slips) {
        expect(Number(slip) % 2).not.toBe(parity);
      }
    }
  });

  it("scales by the factor, and shares in a ratio so the parts add back to the whole", () => {
    const scaled = buildFairShareQuestions(6, 2).find(
      ({ picture }) =>
        picture.kind === "scale" &&
        picture.length === 3 &&
        picture.factor === 4,
    );
    expect(scaled?.answer).toBe("12 cm");

    for (const { picture, answer, ask } of buildFairShareQuestions(6, 3)) {
      if (picture.kind !== "parts") {
        throw new Error("Year 6 unequal sharing should show the parts");
      }
      const partSize =
        picture.total / (picture.firstParts + picture.secondParts);
      const parts = ask.endsWith("blue crab get?")
        ? picture.secondParts
        : picture.firstParts;
      expect(Number(answer)).toBe(parts * partSize);
    }
  });

  it("finds the blue pearls from the red ones, for every group in the ratio", () => {
    for (const { picture, answer } of buildFairShareQuestions(6, 1)) {
      if (picture.kind !== "ratio") {
        throw new Error("Year 6 ratio questions should show the ratio");
      }
      expect(Number(answer)).toBe(picture.second * picture.groupCount);
    }
  });

  it("asks about the red and blue pearls the ratio picture draws, not shells", () => {
    for (const { ask } of buildFairShareQuestions(6, 1)) {
      expect(ask).toMatch(/How many blue pearls are there\?$/);
      expect(ask).not.toContain("shell");
    }
  });
});
