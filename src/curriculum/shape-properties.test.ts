import { describe, expect, it } from "vitest";
import {
  buildShapePropertyQuestions,
  describeShapeProperty,
  listShapesNotSharing,
  listShapesSharing,
  shapeProperties,
  type ShapePropertyQuestion,
} from "./shape-properties.js";

describe("buildShapePropertyQuestions", () => {
  it("asks about every shape, leaving at least three shapes that don't share the count", () => {
    for (const property of shapeProperties) {
      for (const question of buildShapePropertyQuestions(property)) {
        expect(listShapesSharing(question)).toContain(question.shape);
        expect(listShapesNotSharing(question).length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("never offers a curved shape that fits when only flat faces or straight edges count", () => {
    const findWrongChoices = (
      shape: ShapePropertyQuestion["shape"],
      property: ShapePropertyQuestion["property"],
    ) => {
      const question = buildShapePropertyQuestions(property).find(
        (asked) => asked.shape === shape,
      );
      return question === undefined ? [] : listShapesNotSharing(question);
    };
    expect(findWrongChoices("cone", "faces")).not.toContain("cylinder");
    expect(findWrongChoices("sphere", "faces")).not.toContain("cone");
    expect(findWrongChoices("sphere", "edges")).not.toContain("cylinder");
    expect(findWrongChoices("sphere", "edges")).not.toContain("cone");
    expect(findWrongChoices("sphere", "vertices")).not.toContain("cone");
  });

  it("knows a cube and a cuboid both have 8 vertices", () => {
    expect(listShapesSharing({ property: "vertices", count: 8 })).toEqual([
      "cube",
      "cuboid",
    ]);
  });
});

describe("describeShapeProperty", () => {
  it("says the count in words, singular for one", () => {
    expect(describeShapeProperty({ property: "faces", count: 6 })).toBe(
      "six faces",
    );
    expect(describeShapeProperty({ property: "vertices", count: 1 })).toBe(
      "one vertex",
    );
    expect(describeShapeProperty({ property: "edges", count: 0 })).toBe(
      "no edges",
    );
  });
});
