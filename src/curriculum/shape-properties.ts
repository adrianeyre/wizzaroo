import { shapes3d, type Shape3d } from "./shapes-3d.js";

export const shapeProperties = ["faces", "vertices", "edges"] as const;
export type ShapeProperty = (typeof shapeProperties)[number];

export interface ShapePropertyQuestion {
  property: ShapeProperty;
  count: number;
  shape: Shape3d;
}

const shapePropertyCounts: Record<Shape3d, Record<ShapeProperty, number>> = {
  cube: { faces: 6, vertices: 8, edges: 12 },
  cuboid: { faces: 6, vertices: 8, edges: 12 },
  pyramid: { faces: 5, vertices: 5, edges: 8 },
  sphere: { faces: 1, vertices: 0, edges: 0 },
  cylinder: { faces: 3, vertices: 0, edges: 2 },
  cone: { faces: 2, vertices: 1, edges: 1 },
};

export const countShapeProperty = (
  shape: Shape3d,
  property: ShapeProperty,
): number => shapePropertyCounts[shape][property];

export const listShapesSharing = ({
  property,
  count,
}: Pick<ShapePropertyQuestion, "property" | "count">): Shape3d[] =>
  shapes3d.filter((shape) => countShapeProperty(shape, property) === count);

export const buildShapePropertyQuestions = (
  property: ShapeProperty,
): ShapePropertyQuestion[] =>
  shapes3d.map((shape) => ({
    property,
    count: countShapeProperty(shape, property),
    shape,
  }));

// Many schools count only flat faces and straight edges, and some say a cone
// has no vertex. A shape is never offered as a wrong choice when it would be
// right under either way of counting.
const otherWaysOfCounting: Partial<
  Record<Shape3d, Partial<Record<ShapeProperty, number>>>
> = {
  sphere: { faces: 0 },
  cylinder: { faces: 2, edges: 0 },
  cone: { faces: 1, edges: 0, vertices: 0 },
};

export const listShapesNotSharing = (
  question: ShapePropertyQuestion,
): Shape3d[] => {
  const sharing = listShapesSharing(question);
  return shapes3d.filter(
    (shape) =>
      !sharing.includes(shape) &&
      otherWaysOfCounting[shape]?.[question.property] !== question.count,
  );
};

const countWords = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

export const describeShapeProperty = ({
  property,
  count,
}: Pick<ShapePropertyQuestion, "property" | "count">): string => {
  const singular = { faces: "face", vertices: "vertex", edges: "edge" }[
    property
  ];
  return `${countWords[count]} ${count === 1 ? singular : property}`;
};
