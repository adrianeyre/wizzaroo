import { describe, expect, it } from "vitest";
import {
  buildPolygonQuestions,
  isPolygonName,
  listNetDistractors,
  polygonDifficulties,
  polygonProperties,
  shapesWithNets,
} from "./polygons.js";

describe("buildPolygonQuestions", () => {
  it("leaves at least three shapes that don't also fit the clue", () => {
    for (const year of [3, 4, 5] as const) {
      for (const difficulty of polygonDifficulties) {
        const questions = buildPolygonQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        for (const { answer, distractors } of questions) {
          expect(distractors.length).toBeGreaterThanOrEqual(3);
          expect(distractors).not.toContain(answer);
          if (year === 4) {
            for (const distractor of distractors) {
              expect(polygonProperties[distractor].alsoCountsAs).not.toContain(
                answer,
              );
            }
          }
        }
      }
    }
  });

  it("never offers a square when the answer is a rectangle by right angles", () => {
    const [fourRightAngles] = buildPolygonQuestions(3, 2);
    expect(fourRightAngles.clue).toBe(
      "Find the shape with exactly four right angles",
    );
    expect(fourRightAngles.distractors).not.toContain("rectangle");
  });

  it("never offers a second shape that also fits a Year 4 name", () => {
    const named = polygonDifficulties.flatMap((difficulty) =>
      buildPolygonQuestions(4, difficulty),
    );
    const findDistractors = (answer: string) =>
      named.find((question) => question.answer === answer)?.distractors;
    expect(findDistractors("scalene-triangle")).not.toContain(
      "right-angled-triangle",
    );
    expect(findDistractors("kite")).not.toContain("rhombus");
    expect(findDistractors("kite")).not.toContain("square");
  });

  it("asks for regular and irregular shapes in Year 5", () => {
    expect(
      buildPolygonQuestions(5, 1).every(
        ({ answer }) => polygonProperties[answer].isRegular,
      ),
    ).toBe(true);
    expect(
      buildPolygonQuestions(5, 2).every(
        ({ answer }) => !polygonProperties[answer].isRegular,
      ),
    ).toBe(true);
    expect(isPolygonName("kite")).toBe(true);
    expect(isPolygonName("circle")).toBe(false);
  });
});

describe("nets", () => {
  it("offers the other 3-D shapes for each net", () => {
    for (const shape of shapesWithNets) {
      expect(listNetDistractors(shape)).toHaveLength(5);
    }
  });
});
