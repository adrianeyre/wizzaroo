import { describe, expect, it } from "vitest";
import {
  buildFractionQuestions,
  describeFraction,
  describeFractionPicture,
  fractionDifficulties,
  listFractionDistractors,
  parseFractionPicture,
} from "./fractions.js";

const findValue = (picture: string) => {
  const parsed = parseFractionPicture(picture);
  return parsed === undefined ? Number.NaN : parsed.shaded / parsed.parts;
};

describe("buildFractionQuestions", () => {
  it("finds halves and quarters in Year 1, thirds and three quarters in Year 2", () => {
    const targetsIn = (year: 1 | 2) =>
      new Set(
        fractionDifficulties.flatMap((difficulty) =>
          buildFractionQuestions(year, difficulty).map(({ target }) => target),
        ),
      );
    expect(targetsIn(1)).toEqual(new Set(["1/2", "1/4"]));
    expect(targetsIn(2)).toEqual(new Set(["1/3", "2/4", "3/4", "1/4"]));
  });

  it("finds non-unit fractions, equivalents, percentages and decimals in Years 3 to 6, never offering an equal picture", () => {
    for (const year of [3, 4, 5, 6] as const) {
      for (const difficulty of fractionDifficulties) {
        for (const { target, distractors } of buildFractionQuestions(
          year,
          difficulty,
        )) {
          expect(distractors.length).toBeGreaterThanOrEqual(3);
          for (const distractor of distractors) {
            expect(findValue(distractor)).not.toBeCloseTo(findValue(target), 6);
          }
        }
      }
    }
    expect(buildFractionQuestions(4, 1)[0].askedAs).toBe(
      "a fraction equal to 1/2",
    );
    expect(buildFractionQuestions(5, 1)[0]).toMatchObject({
      target: "1/2",
      askedAs: "50%",
    });
    expect(buildFractionQuestions(6, 3)[0]).toMatchObject({
      target: "3/8",
      askedAs: "0.375",
    });
  });

  it("has enough Questions for an Activity, on circles and squares", () => {
    for (const year of [1, 2, 3, 4, 5, 6] as const) {
      for (const difficulty of fractionDifficulties) {
        const questions = buildFractionQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        expect(new Set(questions.map(({ outline }) => outline)).size).toBe(2);
      }
    }
  });
});

describe("listFractionDistractors", () => {
  it("never offers a picture worth the same as the answer", () => {
    for (const target of ["1/2", "1/4", "1/3", "2/4", "3/4"]) {
      const distractors = listFractionDistractors(target);
      expect(distractors.length).toBeGreaterThanOrEqual(3);
      for (const distractor of distractors) {
        if (parseFractionPicture(distractor)?.isEqual === true) {
          expect(findValue(distractor)).not.toBe(findValue(target));
        }
      }
    }
  });
});

describe("describeFractionPicture", () => {
  it("names each picture for a screen reader", () => {
    expect(describeFractionPicture("uneven-1/2")).toBe(
      "2 parts that are not equal, 1 shaded",
    );
    expect(describeFractionPicture("1/1")).toBe("all of it shaded");
    expect(describeFractionPicture("3/4")).toBe("three quarters shaded");
    expect(describeFraction("1/3")).toBe("one third");
    expect(parseFractionPicture("third")).toBeUndefined();
  });
});
