import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";

/**
 * The shapes a lab item is built from: smooth, coloured primitives that are
 * merged into one mesh (ADR 0076). Every size is in the item's own units;
 * the finished model is scaled to fit the turntable, so only proportions
 * matter.
 */
export interface LabItemParts {
  body: ModelPart[];
  /** Translucent parts, such as a jellyfish's bell or a jar's glass. */
  glass?: ModelPart[];
}

interface Placement {
  at?: Triple;
  turn?: Triple;
  /** Stretches the shape, such as flattening a cone into a fin. */
  size?: Triple;
}

/** An egg-like blob: a sphere stretched to the three radii. */
export const blob = (
  radii: Triple,
  colour: string,
  { at, turn }: Placement = {},
  detail: [number, number] = [12, 8],
): ModelPart => ({
  geometry: new SphereGeometry(1, detail[0], detail[1]),
  colour,
  position: at,
  rotation: turn,
  scale: radii,
  isSmooth: true,
});

/** A rounded rod, for legs, arms, necks and tails. */
export const rod = (
  radius: number,
  length: number,
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 8,
): ModelPart => ({
  scale: size,
  geometry: new CapsuleGeometry(radius, length, 2, sides),
  colour,
  position: at,
  rotation: turn,
  isSmooth: true,
});

/** A tapering post: a cylinder whose two ends differ. */
export const taper = (
  radii: [number, number],
  length: number,
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 10,
): ModelPart => ({
  scale: size,
  geometry: new CylinderGeometry(radii[0], radii[1], length, sides, 1),
  colour,
  position: at,
  rotation: turn,
  isSmooth: true,
});

/** A cone, for ears, beaks, noses, fins and spikes. */
export const spike = (
  radius: number,
  length: number,
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 8,
): ModelPart => ({
  scale: size,
  geometry: new ConeGeometry(radius, length, sides),
  colour,
  position: at,
  rotation: turn,
});

/** A box, for anything with flat sides. */
export const block = (
  size: Triple,
  colour: string,
  { at, turn }: Placement = {},
): ModelPart => ({
  geometry: new BoxGeometry(size[0], size[1], size[2]),
  colour,
  position: at,
  rotation: turn,
});

/** A ring, for rims, handles and bands. */
export const ring = (
  radius: number,
  thickness: number,
  colour: string,
  { at, turn, size }: Placement = {},
  arc = Math.PI * 2,
): ModelPart => ({
  scale: size,
  geometry: new TorusGeometry(radius, thickness, 6, 18, arc),
  colour,
  position: at,
  rotation: turn,
  isSmooth: true,
});

/**
 * A shape turned on a lathe from its outline, given as [across, up] pairs
 * from the bottom: bottles, cups, bells, vases and bodies.
 */
export const turned = (
  outline: readonly (readonly [number, number])[],
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 18,
): ModelPart => ({
  scale: size,
  geometry: new LatheGeometry(
    outline.map(([across, up]) => new Vector2(across, up)),
    sides,
  ),
  colour,
  position: at,
  rotation: turn,
  isSmooth: true,
});

const eyeWhite = "#ffffff";
const eyeDark = "#16161c";

/**
 * A pair of eyes, mirrored across x = 0, looking along +z, each a dark
 * ball with a white glint so the animal looks alive.
 */
export const eyes = (
  at: Triple,
  radius: number,
  colour = eyeDark,
): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => [
    blob(
      [radius, radius, radius * 0.8],
      colour,
      { at: [at[0] * side, at[1], at[2]] },
      [8, 6],
    ),
    blob(
      [radius * 0.34, radius * 0.34, radius * 0.2],
      eyeWhite,
      {
        at: [
          at[0] * side + radius * 0.3,
          at[1] + radius * 0.35,
          at[2] + radius * 0.72,
        ],
      },
      [5, 4],
    ),
  ]);

/** Builds a part once on each side, mirrored across x = 0. */
export const mirrored = (
  build: (side: -1 | 1) => ModelPart | ModelPart[],
): ModelPart[] => [build(-1), build(1)].flat();
