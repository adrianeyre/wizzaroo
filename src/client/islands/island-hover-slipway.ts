import { BufferAttribute, BufferGeometry, Color, SphereGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { IslandAdventure } from "./island-adventures.js";
import { hoverSlipSlope } from "./island-sea-craft.js";

export const slipwayHalfWidth = 4.6;
const apronReach = 9;
const underwaterReach = 8;
const slipwayLift = 0.08;
const slipwayStep = 1.5;
const slipwayColumns = 6;
const footing = 0.6;
const lightSpacing = 6;

const paint = {
  concrete: new Color("#b8b2aa"),
  concreteDark: new Color("#a39d95"),
  edge: new Color("#facc15"),
  centre: new Color("#f8fafc"),
  wall: new Color("#8a847c"),
};

export const findSlipwayEnd = ({ hoverPad }: IslandAdventure): number =>
  -(hoverPad.slipStart + hoverPad.slipLevel / hoverSlipSlope + underwaterReach);

const findSlipwayPoint = (
  { hoverPad }: IslandAdventure,
  along: number,
  across: number,
): MapPoint => ({
  x:
    hoverPad.centre.x +
    Math.sin(hoverPad.heading) * along +
    Math.cos(hoverPad.heading) * across,
  z:
    hoverPad.centre.z +
    Math.cos(hoverPad.heading) * along -
    Math.sin(hoverPad.heading) * across,
});

export const findSlipwayTop = (
  adventure: IslandAdventure,
  along: number,
  across: number,
): number => {
  const { slipStart, slipLevel } = adventure.hoverPad;
  const ground = adventure.findHeight(
    findSlipwayPoint(adventure, along, across),
  );
  const ramp =
    along <= -slipStart
      ? slipLevel + hoverSlipSlope * (along + slipStart)
      : -Infinity;
  return Math.max(ground, ramp) + slipwayLift;
};

const paintSlipwayFace = (along: number, across: number): Color => {
  if (Math.abs(across) > slipwayHalfWidth - 0.45) {
    return paint.edge;
  }
  if (Math.abs(across) < 0.2 && Math.round(along) % 3 === 0) {
    return paint.centre;
  }
  return Math.floor(along / 4) % 2 === 0 ? paint.concrete : paint.concreteDark;
};

const buildSlipwaySurface = (adventure: IslandAdventure): BufferGeometry => {
  const end = findSlipwayEnd(adventure);
  const steps = Math.ceil((apronReach - end) / slipwayStep);
  const acrossAt = (column: number) =>
    -slipwayHalfWidth + (column / slipwayColumns) * slipwayHalfWidth * 2;
  const alongAt = (step: number) => apronReach - step * slipwayStep;
  const positions: number[] = [];
  const colours: number[] = [];
  const corner = (along: number, across: number) => {
    const { x, z } = findSlipwayPoint(adventure, along, across);
    return [x, findSlipwayTop(adventure, along, across), z];
  };
  const pushQuad = (quad: number[][], colour: Color) => {
    [0, 1, 2, 0, 2, 3].forEach((index) => {
      positions.push(...quad[index]);
      colours.push(colour.r, colour.g, colour.b);
    });
  };
  let lowest = Infinity;
  for (let step = 0; step <= steps; step++) {
    for (let column = 0; column <= slipwayColumns; column++) {
      lowest = Math.min(lowest, corner(alongAt(step), acrossAt(column))[1]);
    }
  }
  const bottom = lowest - footing;
  for (let step = 0; step < steps; step++) {
    const near = alongAt(step);
    const far = alongAt(step + 1);
    for (let column = 0; column < slipwayColumns; column++) {
      const left = acrossAt(column);
      const right = acrossAt(column + 1);
      pushQuad(
        [
          corner(near, left),
          corner(near, right),
          corner(far, right),
          corner(far, left),
        ],
        paintSlipwayFace((near + far) / 2, (left + right) / 2),
      );
    }
    [-1, 1].forEach((side) => {
      const edge = side * slipwayHalfWidth;
      const top = [corner(near, edge), corner(far, edge)];
      const base = top.map(([x, , z]) => [x, bottom, z]);
      pushQuad(
        side > 0
          ? [top[0], base[0], base[1], top[1]]
          : [top[0], top[1], base[1], base[0]],
        paint.wall,
      );
    });
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
  geometry.computeVertexNormals();
  return geometry;
};

const listSlipwayLights = (adventure: IslandAdventure): ModelPart[] => {
  const end = findSlipwayEnd(adventure);
  const parts = Array.from(
    { length: Math.floor((apronReach - end) / lightSpacing) + 1 },
    (_, light) => apronReach - light * lightSpacing,
  ).flatMap((along) =>
    [-1, 1].flatMap((side): ModelPart[] => {
      const across = side * (slipwayHalfWidth - 0.2);
      const top = findSlipwayTop(adventure, along, across);
      if (top < 0.2) {
        return [];
      }
      const { x, z } = findSlipwayPoint(adventure, along, across);
      return [
        {
          geometry: new SphereGeometry(0.16, 6, 4),
          colour: "#fde047",
          position: [x, top + 0.1, z],
        },
      ];
    }),
  );
  return parts;
};

export const buildHoverSlipwayGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const lights = listSlipwayLights(adventure);
  const surface = buildSlipwaySurface(adventure);
  return lights.length === 0
    ? surface
    : mergeGeometries([surface, buildModelGeometry(lights)]);
};
