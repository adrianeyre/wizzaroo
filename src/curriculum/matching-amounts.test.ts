import { describe, expect, it } from "vitest";
import {
  describeAmountFace,
  listMatchingAmounts,
  matchingAmountSkillByYear,
  matchingAmountSkillIds,
  type AmountFace,
} from "./matching-amounts.js";
import { skills, yearGroups } from "./skills.js";

const readWorth = (written: string): number => {
  if (written.endsWith("%")) {
    return Number(written.slice(0, -1)) / 100;
  }
  if (written.includes("/")) {
    const [numerator, denominator] = written.split("/").map(Number);
    return numerator / denominator;
  }
  return Number(written);
};

const findWorth = (face: AmountFace): number => {
  switch (face.kind) {
    case "words":
      return readWorth(face.text);
    case "fraction":
      return face.numerator / face.denominator;
    case "dots":
      return face.count;
    case "shaded-shape":
      return face.shaded / face.parts;
  }
};

const fewestPairsOnABoard = 10;

describe("listMatchingAmounts", () => {
  it.each(matchingAmountSkillIds)(
    "gives every face of each %s amount the same worth, so any two of them match",
    (skillId) => {
      for (const { key, faces } of listMatchingAmounts(skillId)) {
        for (const face of faces) {
          expect(findWorth(face)).toBeCloseTo(readWorth(key), 10);
        }
      }
    },
  );

  it.each(matchingAmountSkillIds)(
    "never repeats a face in %s, so no tile can be matched with its own twin",
    (skillId) => {
      const faces = listMatchingAmounts(skillId).flatMap(({ faces }) =>
        faces.map((face) => JSON.stringify(face)),
      );

      expect(new Set(faces).size).toBe(faces.length);
    },
  );

  it.each(matchingAmountSkillIds)(
    "has enough faces in %s for at least 10 pairs",
    (skillId) => {
      const pairCount = listMatchingAmounts(skillId).reduce(
        (total, { faces }) => total + Math.floor(faces.length / 2),
        0,
      );

      expect(pairCount).toBeGreaterThanOrEqual(fewestPairsOnABoard);
    },
  );

  it("matches numerals to dots in ten frames in Year 1", () => {
    expect(listMatchingAmounts("maths.count-objects-to-20")[6]).toEqual({
      key: "7",
      faces: [
        { kind: "words", text: "7" },
        { kind: "dots", count: 7 },
      ],
    });
  });

  it("only uses the fractions Year 2 learns: halves, thirds, quarters and three quarters", () => {
    expect(
      listMatchingAmounts("maths.fractions-of-shapes").map(({ key }) => key),
    ).toEqual(["1/2", "1/3", "1/4", "3/4"]);
  });
});

describe("describeAmountFace", () => {
  it("names each face for a screen reader", () => {
    expect(describeAmountFace({ kind: "words", text: "0.375" })).toBe("0.375");
    expect(
      describeAmountFace({ kind: "fraction", numerator: 3, denominator: 8 }),
    ).toBe("3 over 8");
    expect(describeAmountFace({ kind: "dots", count: 1 })).toBe("1 dot");
    expect(
      describeAmountFace({
        kind: "shaded-shape",
        shape: "circle",
        parts: 4,
        shaded: 3,
      }),
    ).toBe("a circle in 4 equal parts with 3 shaded");
  });
});

describe("matchingAmountSkillByYear", () => {
  it("gives each Year Group a Maths Skill from its own year of the National Curriculum", () => {
    for (const yearGroup of yearGroups) {
      const skill = skills.find(
        ({ id }) => id === matchingAmountSkillByYear[yearGroup],
      );

      expect(skill?.subject).toBe("maths");
      expect(skill?.yearGroup).toBe(yearGroup);
    }
  });
});
