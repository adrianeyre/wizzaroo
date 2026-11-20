import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";

/**
 * Small helpers for the Quest's models (ADR 0058): each returns one
 * vertex-coloured part for `buildModelGeometry`, so a Find, a thing or
 * an Islander is a single mesh.
 */

interface Placing {
  at?: Triple;
  turn?: Triple;
  scale?: Triple | number;
}

const place = (
  geometry: ModelPart["geometry"],
  colour: string,
  { at, turn, scale }: Placing,
): ModelPart => ({
  geometry,
  colour,
  position: at,
  rotation: turn,
  scale,
});

export const box = (
  size: Triple,
  colour: string,
  placing: Placing = {},
): ModelPart => place(new BoxGeometry(...size), colour, placing);

export const cylinder = (
  radius: number,
  length: number,
  colour: string,
  placing: Placing = {},
  radiusBottom = radius,
  segments = 12,
): ModelPart =>
  place(
    new CylinderGeometry(radius, radiusBottom, length, segments),
    colour,
    placing,
  );

export const cone = (
  radius: number,
  length: number,
  colour: string,
  placing: Placing = {},
  segments = 12,
): ModelPart =>
  place(new ConeGeometry(radius, length, segments), colour, placing);

export const ball = (
  radius: number,
  colour: string,
  placing: Placing = {},
  detail: [number, number] = [10, 6],
): ModelPart => place(new SphereGeometry(radius, ...detail), colour, placing);

export const ring = (
  radius: number,
  tube: number,
  colour: string,
  placing: Placing = {},
  arc = Math.PI * 2,
): ModelPart =>
  place(new TorusGeometry(radius, tube, 6, 16, arc), colour, placing);

export const gem = (
  radius: number,
  colour: string,
  placing: Placing = {},
): ModelPart => place(new OctahedronGeometry(radius, 0), colour, placing);

export const lump = (
  radius: number,
  colour: string,
  placing: Placing = {},
): ModelPart => ({
  ...place(new IcosahedronGeometry(radius, 1), colour, placing),
  roughen: 0.18,
});

export const stone = (
  radius: number,
  colour: string,
  placing: Placing = {},
): ModelPart => ({
  ...place(new DodecahedronGeometry(radius, 0), colour, placing),
  roughen: 0.12,
});

/** A group of parts moved, and scaled about the origin, together. */
export const shift = (
  parts: readonly ModelPart[],
  by: Triple,
  scale = 1,
): ModelPart[] =>
  parts.map((part) => {
    const [x, y, z] = part.position ?? [0, 0, 0];
    const partScale = part.scale ?? 1;
    return {
      ...part,
      position: [x * scale + by[0], y * scale + by[1], z * scale + by[2]],
      scale:
        typeof partScale === "number"
          ? partScale * scale
          : [partScale[0] * scale, partScale[1] * scale, partScale[2] * scale],
    };
  });
