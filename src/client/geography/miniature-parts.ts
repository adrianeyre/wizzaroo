import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  type ColorRepresentation,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";

export interface GeometryBundle<Geometries> {
  geometries: Geometries;
  dispose: () => void;
}

const isGeometry = (value: unknown): value is BufferGeometry =>
  value instanceof BufferGeometry;

export const buildGeometryBundle = <Geometries extends object>(
  geometries: Geometries,
): GeometryBundle<Geometries> => ({
  geometries,
  dispose: () => {
    Object.values(geometries)
      .flat()
      .filter(isGeometry)
      .forEach((geometry) => {
        geometry.dispose();
      });
  },
});

export const findScatter = (index: number, salt: number): number => {
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return wave - Math.floor(wave);
};

export const placeAround = (radius: number, angle: number, up = 0): Triple => [
  Math.sin(angle) * radius,
  up,
  -Math.cos(angle) * radius,
];

export const buildPineParts = (
  at: Triple,
  height: number,
  needleColours: readonly string[] = ["#24502f", "#2d6338", "#3a7543"],
  trunkColour = "#5b3a24",
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.06, 0.09, 0.3, 5),
    colour: trunkColour,
    position: [at[0], at[1] + 0.15 * height, at[2]],
    scale: [height, height, height],
  },
  ...needleColours.map((colour, tier) => ({
    geometry: new ConeGeometry(0.42 - tier * 0.1, 0.55 - tier * 0.05, 7),
    colour,
    position: [
      at[0],
      at[1] + (0.48 + tier * 0.3) * height,
      at[2],
    ] satisfies Triple,
    rotation: [0, tier * 0.6, 0] satisfies Triple,
    scale: [height, height, height] satisfies Triple,
  })),
];

export const buildBroadleafParts = (
  at: Triple,
  height: number,
  crownColours: readonly string[] = ["#3f7a32", "#4a8a38", "#5a9c45"],
  trunkColour = "#6b4a2f",
): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.05, 0.08, 0.6, 6),
    colour: trunkColour,
    position: [at[0], at[1] + 0.3 * height, at[2]],
    scale: [height, height, height],
  },
  ...crownColours.map((colour, blob) => {
    const angle = blob * 2.3;
    const reach = blob === 0 ? 0 : 0.18;
    return {
      geometry: new IcosahedronGeometry(blob === 0 ? 0.36 : 0.26, 0),
      colour,
      position: [
        at[0] + Math.cos(angle) * reach * height,
        at[1] + (blob === 0 ? 0.82 : 0.74 + blob * 0.08) * height,
        at[2] + Math.sin(angle) * reach * height,
      ] satisfies Triple,
      scale: [height, height * 0.92, height] satisfies Triple,
      roughen: 0.25,
      isSmooth: true,
    };
  }),
];

export const buildRockParts = (
  at: Triple,
  size: number,
  colour: ColorRepresentation = "#8b857c",
): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(size, 0),
    colour,
    position: at,
    scale: [1.2, 0.75, 1],
    roughen: 0.4,
  },
];

export const buildBushParts = (
  at: Triple,
  size: number,
  colour: ColorRepresentation = "#4b8436",
): ModelPart[] => [
  {
    geometry: new IcosahedronGeometry(size, 0),
    colour,
    position: [at[0], at[1] + size * 0.55, at[2]],
    scale: [1.25, 0.8, 1.1],
    roughen: 0.35,
    isSmooth: true,
  },
];

export interface DiscGroundShape {
  radius: number;
  rings: number;
  sectors: number;
  findHeight: (x: number, z: number) => number;
  findColour: (x: number, z: number, height: number) => ColorRepresentation;
}

export const buildDiscGround = ({
  radius,
  rings,
  sectors,
  findHeight,
  findColour,
}: DiscGroundShape): BufferGeometry => {
  const positions: number[] = [];
  const colours: number[] = [];
  const colour = new Color();
  const addVertex = (x: number, z: number) => {
    const height = findHeight(x, z);
    positions.push(x, height, z);
    colour.set(findColour(x, z, height));
    colours.push(colour.r, colour.g, colour.b);
  };
  addVertex(0, 0);
  for (let ring = 1; ring <= rings; ring++) {
    const reach = (ring / rings) * radius;
    for (let sector = 0; sector < sectors; sector++) {
      const angle = (sector / sectors) * Math.PI * 2;
      addVertex(Math.sin(angle) * reach, Math.cos(angle) * reach);
    }
  }
  const indices: number[] = [];
  const findIndex = (ring: number, sector: number) =>
    ring === 0 ? 0 : 1 + (ring - 1) * sectors + (sector % sectors);
  for (let ring = 0; ring < rings; ring++) {
    for (let sector = 0; sector < sectors; sector++) {
      const outerLeft = findIndex(ring + 1, sector);
      const outerRight = findIndex(ring + 1, sector + 1);
      if (ring === 0) {
        indices.push(0, outerLeft, outerRight);
        continue;
      }
      const innerLeft = findIndex(ring, sector);
      const innerRight = findIndex(ring, sector + 1);
      indices.push(innerLeft, outerLeft, outerRight);
      indices.push(innerLeft, outerRight, innerRight);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colours), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

export interface RibbonCourse {
  points: readonly (readonly [number, number])[];
  width: number;
  height: number;
  findHeight?: (along: number) => number;
}

export const buildRibbonGeometry = ({
  points,
  width,
  height,
  findHeight = () => height,
}: RibbonCourse): BufferGeometry => {
  const positions: number[] = [];
  const textureCoordinates: number[] = [];
  const lastIndex = points.length - 1;
  points.forEach(([x, z], index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(lastIndex, index + 1)];
    const runX = after[0] - before[0];
    const runZ = after[1] - before[1];
    const runLength = Math.hypot(runX, runZ) || 1;
    const acrossX = (-runZ / runLength) * (width / 2);
    const acrossZ = (runX / runLength) * (width / 2);
    const along = index / lastIndex;
    const y = findHeight(along);
    positions.push(x + acrossX, y, z + acrossZ, x - acrossX, y, z - acrossZ);
    textureCoordinates.push(
      0,
      along * lastIndex * 0.4,
      1,
      along * lastIndex * 0.4,
    );
  });
  const indices = Array.from({ length: lastIndex }, (_, index) => {
    const left = index * 2;
    return [left, left + 1, left + 2, left + 1, left + 3, left + 2];
  }).flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(textureCoordinates), 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

export const buildCurvePoints = (
  count: number,
  findPoint: (along: number) => readonly [number, number],
): (readonly [number, number])[] =>
  Array.from({ length: count + 1 }, (_, index) => findPoint(index / count));
