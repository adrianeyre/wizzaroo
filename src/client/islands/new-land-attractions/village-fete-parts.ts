import { ConeGeometry, CylinderGeometry } from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Triple,
} from "../attractions/attraction-kit.js";

/**
 * Small things the Meadow Isle's new Attractions share: villagers in
 * their summer clothes, strings of bunting, and clumps of flowers.
 */

export const meadowColours = {
  cream: "#f3ead2",
  butter: "#f2d06b",
  rose: "#e06a7a",
  poppy: "#d63b2f",
  sky: "#6fb2e0",
  cornflower: "#4a6fd0",
  sage: "#8fb27a",
  leaf: "#4f9a3e",
  meadow: "#7cb550",
  redBrick: "#b5583f",
  thatch: "#d2ae62",
  timber: "#8a5a35",
  white: "#f7f4ec",
  navy: "#2c3e6b",
  skin: "#f0c8a0",
  darkSkin: "#a8714a",
} as const;

export interface VillagerLook {
  top: string;
  legs: string;
  hair: string;
  skin?: string;
  hat?: string;
  /** A sun dress instead of trousers. */
  isDress?: boolean;
  /** How tall, 1 for a grown-up, about 0.75 for a child. */
  size?: number;
}

/** A villager facing +z, standing on y = 0. */
export const buildVillager =
  ({
    top,
    legs,
    hair,
    skin = meadowColours.skin,
    hat,
    isDress = false,
    size = 1,
  }: VillagerLook) =>
  (builder: AttractionBuilder): void => {
    const s = size;
    const far = builder.isFar;
    if (isDress) {
      builder.cylinder("matte", top, {
        radius: 0.12 * s,
        radiusEnd: 0.24 * s,
        length: 0.62 * s,
        at: [0, 0.55 * s, 0],
        segments: 10,
      });
    } else {
      [-1, 1].forEach((side) => {
        builder.cylinder("matte", legs, {
          radius: 0.06 * s,
          length: 0.55 * s,
          at: [side * 0.08 * s, 0.28 * s, 0],
          segments: 6,
        });
      });
      builder.cylinder("matte", top, {
        radius: 0.15 * s,
        radiusEnd: 0.13 * s,
        length: 0.42 * s,
        at: [0, 0.75 * s, 0],
        segments: 8,
      });
    }
    if (isDress) {
      [-1, 1].forEach((side) => {
        builder.cylinder("matte", skin, {
          radius: 0.04 * s,
          length: 0.3 * s,
          at: [side * 0.07 * s, 0.15 * s, 0],
          segments: 5,
        });
      });
      builder.cylinder("matte", top, {
        radius: 0.13 * s,
        radiusEnd: 0.11 * s,
        length: 0.24 * s,
        at: [0, 0.96 * s, 0],
        segments: 10,
      });
    }
    builder.sphere("matte", skin, 0.13 * s, [0, 1.12 * s, 0], [1, 1.05, 1], 9);
    builder.sphere(
      "matte",
      hair,
      0.135 * s,
      [0, 1.16 * s, -0.025 * s],
      [1, 0.85, 0.95],
      8,
    );
    if (!far) {
      [-1, 1].forEach((side) => {
        builder.bar(
          "matte",
          top,
          [side * 0.16 * s, 0.9 * s, 0],
          [side * 0.2 * s, 0.6 * s, 0.05 * s],
          0.08 * s,
          5,
        );
        builder.sphere(
          "matte",
          skin,
          0.045 * s,
          [side * 0.205 * s, 0.56 * s, 0.06 * s],
          [1, 1, 1],
          5,
        );
        builder.sphere(
          "paint",
          palette.black,
          0.016 * s,
          [side * 0.045 * s, 1.14 * s, 0.12 * s],
          [1, 1, 1],
          4,
        );
        builder.box(
          "matte",
          shade(legs, 0.6),
          [0.09 * s, 0.05 * s, 0.16 * s],
          [side * 0.08 * s, 0.025 * s, 0.03 * s],
        );
      });
      builder.box(
        "matte",
        shade(skin, 0.85),
        [0.06 * s, 0.015 * s, 0.01 * s],
        [0, 1.07 * s, 0.128 * s],
      );
    }
    if (hat !== undefined) {
      builder.cylinder("matte", hat, {
        radius: 0.22 * s,
        length: 0.02 * s,
        at: [0, 1.22 * s, 0],
        segments: 12,
      });
      builder.cylinder("matte", hat, {
        radius: 0.12 * s,
        radiusEnd: 0.1 * s,
        length: 0.1 * s,
        at: [0, 1.28 * s, 0],
        segments: 10,
      });
    }
  };

/** A string of triangular bunting flags sagging between two points. */
export const addBunting = (
  builder: AttractionBuilder,
  from: Triple,
  to: Triple,
  colours: readonly string[],
  sag = 0.25,
): void => {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
  const flags = builder.isFar ? 0 : Math.max(2, Math.round(length / 0.32));
  const at = (share: number): Triple => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share - sag * 4 * share * (1 - share),
    from[2] + (to[2] - from[2]) * share,
  ];
  const pieces = builder.isFar ? 2 : 4;
  for (let piece = 0; piece < pieces; piece++) {
    builder.bar(
      "matte",
      palette.white,
      at(piece / pieces),
      at((piece + 1) / pieces),
      0.015,
      3,
    );
  }
  for (let flag = 1; flag < flags; flag++) {
    const [x, y, z] = at(flag / flags);
    builder.add(
      "matte",
      colours[flag % colours.length],
      new ConeGeometry(0.1, 0.2, 3).rotateX(Math.PI).scale(1, 1, 0.12),
      { at: [x, y - 0.1, z], rotation: [0, turn + Math.PI / 2, 0] },
    );
  }
};

/** A clump of summer flowers, each a stalk and a bloom. */
export const addFlowerClump = (
  builder: AttractionBuilder,
  at: Triple,
  colours: readonly string[],
  count = 7,
  spread = 0.35,
): void => {
  if (builder.isFar) {
    builder.sphere(
      "matte",
      meadowColours.leaf,
      spread,
      [at[0], at[1] + spread * 0.3, at[2]],
      [1, 0.5, 1],
      6,
    );
    return;
  }
  builder.sphere(
    "matte",
    meadowColours.leaf,
    spread * 0.8,
    [at[0], at[1] + spread * 0.2, at[2]],
    [1, 0.45, 1],
    8,
  );
  for (let flower = 0; flower < count; flower++) {
    const angle = flower * 2.39996;
    const reach = spread * Math.sqrt((flower + 0.5) / count);
    const x = at[0] + Math.sin(angle) * reach;
    const z = at[2] + Math.cos(angle) * reach;
    const height = 0.28 + (flower % 3) * 0.07;
    builder.bar(
      "matte",
      meadowColours.leaf,
      [x, at[1], z],
      [x, at[1] + height, z],
      0.02,
      3,
    );
    builder.add(
      "matte",
      colours[flower % colours.length],
      new ConeGeometry(0.06, 0.06, 5).rotateX(Math.PI),
      { at: [x, at[1] + height + 0.02, z] },
    );
  }
};

/**
 * A triangular gable end, `width` across and `rise` high, `thickness`
 * thick, its base centred on `at`, facing along +x (turned by `turn`).
 */
export const addGableEnd = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  {
    at,
    width,
    rise,
    thickness = 0.1,
    turn = 0,
  }: {
    at: Triple;
    width: number;
    rise: number;
    thickness?: number;
    turn?: number;
  },
): void => {
  const prism = new CylinderGeometry(1, 1, 1, 3)
    .rotateX(-Math.PI / 2)
    .rotateY(Math.PI / 2)
    .translate(0, 0.5, 0);
  builder.add(
    finish,
    colour,
    prism,
    {
      at,
      rotation: [0, turn, 0],
      scale: [thickness, rise / 1.5, width / Math.sqrt(3)],
    },
    undefined,
  );
};
