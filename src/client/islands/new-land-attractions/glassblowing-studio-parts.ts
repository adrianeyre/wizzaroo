import { LatheGeometry, TorusGeometry, Vector2 } from "three";
import {
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Glassblowing Studio's colours, in Ember Isle's style */

export const ashPad = "#6f6862";
export const basalt = "#3a3532";
export const basaltDark = "#2a2624";
export const ash = "#8e8780";
export const flagstone = "#5a534d";
export const timber = "#6b4a2f";
export const timberDark = "#4a3220";
export const bronze = "#b5793a";
export const verdigris = "#5f9e8f";
export const brick = "#8a3f2c";
export const fireBrick = "#c46a3a";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";
export const iron = "#3b3f44";
export const steel = "#9aa3ad";
export const sand = "#d9c08a";
export const leather = "#7a4a2a";
export const skin = "#e0b08a";
export const signColour = "#8a3a1e";

/** Bright glass, as blue, green, amber, ruby, violet and teal. */
export const glassColours = [
  "#3fb6e8",
  "#43c97a",
  "#ffb43a",
  "#e8506e",
  "#9b6bdf",
  "#5fe0d2",
] as const;

export const hash = (a: number, b: number, c = 0): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43_758.5453;
  return value - Math.floor(value);
};

/* Vases, bowls and bottles */

const vaseProfiles: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 0],
    [0.07, 0],
    [0.11, 0.06],
    [0.12, 0.14],
    [0.08, 0.24],
    [0.045, 0.3],
    [0.06, 0.36],
  ],
  [
    [0, 0],
    [0.05, 0],
    [0.12, 0.05],
    [0.16, 0.12],
    [0.17, 0.16],
  ],
  [
    [0, 0],
    [0.06, 0],
    [0.08, 0.05],
    [0.08, 0.22],
    [0.03, 0.3],
    [0.03, 0.4],
    [0.045, 0.42],
  ],
  [
    [0, 0],
    [0.05, 0],
    [0.09, 0.04],
    [0.14, 0.16],
    [0.1, 0.26],
    [0.12, 0.34],
  ],
];

/** A blown-glass vase standing at `at`, one of four shapes, `size` times as big. */
export const addVase = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  shape: number,
  size = 1,
): void => {
  const profile = vaseProfiles[shape % vaseProfiles.length];
  builder.add(
    "glass",
    colour,
    new LatheGeometry(
      profile.map(
        ([radius, height]) => new Vector2(radius * size, height * size),
      ),
      builder.segments(size > 1.5 ? 12 : 7, 5),
    ),
    { at },
  );
  if (!builder.isFar && size > 1.5) {
    /* A swirl of a second colour round its belly */
    builder.add(
      "glass",
      shade(colour, 1.3),
      new TorusGeometry(0.1 * size, 0.012 * size, 3, 12),
      {
        at: [at[0], at[1] + 0.12 * size, at[2]],
        rotation: [Math.PI / 2 + 0.25, 0, 0.2],
      },
    );
  }
};

/* The visitors who wander about */

export const buildVisitor =
  (shirt: string, trousers: string, hair: string) =>
  (builder: AttractionBuilder): void => {
    if (builder.isFar) {
      builder.cylinder("matte", trousers, {
        radius: 0.12,
        length: 0.45,
        at: [0, 0.23, 0],
        segments: 6,
      });
      builder.box("matte", shirt, [0.3, 0.38, 0.2], [0, 0.62, 0]);
      builder.sphere("matte", hair, 0.13, [0, 0.96, 0], [1, 1, 1], 8);
      return;
    }
    [-0.07, 0.07].forEach((x) => {
      builder.cylinder("matte", trousers, {
        radius: 0.055,
        radiusEnd: 0.06,
        length: 0.42,
        at: [x, 0.23, 0],
        segments: 6,
      });
      builder.box("paint", "#2b2522", [0.09, 0.06, 0.17], [x, 0.03, 0.03]);
    });
    builder.box("matte", shirt, [0.3, 0.38, 0.2], [0, 0.62, 0]);
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        shirt,
        [side * 0.17, 0.76, 0],
        [side * 0.21, 0.5, 0.04],
        0.075,
        6,
      );
      builder.sphere(
        "matte",
        skin,
        0.045,
        [side * 0.21, 0.46, 0.05],
        [1, 1, 1],
        6,
      );
    });
    builder.cylinder("matte", skin, {
      radius: 0.045,
      length: 0.08,
      at: [0, 0.84, 0],
      segments: 6,
    });
    builder.sphere("matte", skin, 0.12, [0, 0.96, 0], [1, 1.05, 1], 8);
    builder.sphere(
      "matte",
      hair,
      0.125,
      [0, 1.0, -0.02],
      [1.04, 0.85, 1.05],
      6,
    );
    [-0.045, 0.045].forEach((x) => {
      builder.sphere("paint", "#1f2023", 0.017, [x, 0.97, 0.11], [1, 1, 1], 5);
    });
    builder.box("paint", "#b4523e", [0.06, 0.015, 0.01], [0, 0.91, 0.115]);
  };

/* The glassblower at the bench */

export const addGlassblower = (
  builder: AttractionBuilder,
  seat: Triple,
): void => {
  const [x, y, z] = seat;
  /* Thighs forward, shins down */
  [-0.11, 0.11].forEach((side) => {
    builder.bar(
      "matte",
      "#3c4a5c",
      [x + side, y + 0.08, z],
      [x + side, y + 0.08, z + 0.38],
      0.13,
      6,
    );
    builder.bar(
      "matte",
      "#3c4a5c",
      [x + side, y + 0.08, z + 0.38],
      [x + side, 0.08, z + 0.42],
      0.11,
      6,
    );
    builder.box(
      "paint",
      "#2b2522",
      [0.11, 0.07, 0.2],
      [x + side, 0.035, z + 0.47],
    );
  });
  /* Body in a leather apron */
  builder.box("matte", "#d8d2c4", [0.38, 0.46, 0.24], [x, y + 0.36, z + 0.02]);
  builder.box("matte", leather, [0.32, 0.5, 0.04], [x, y + 0.3, z + 0.15]);
  /* Arms reaching to the blowpipe */
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#d8d2c4",
      [x + side * 0.2, y + 0.52, z],
      [x + side * 0.28, y + 0.36, z + 0.3],
      0.085,
      6,
    );
    builder.bar(
      "matte",
      leather,
      [x + side * 0.28, y + 0.36, z + 0.3],
      [x + side * 0.3, y + 0.32, z + 0.5],
      0.09,
      6,
    );
    builder.sphere(
      "matte",
      leather,
      0.06,
      [x + side * 0.3, y + 0.31, z + 0.52],
      [1, 1, 1],
      6,
    );
  });
  /* Head, with a cap and safety glasses */
  builder.sphere(
    "matte",
    skin,
    0.14,
    [x, y + 0.75, z + 0.03],
    [1, 1.05, 1],
    12,
  );
  builder.sphere(
    "matte",
    "#5a3a22",
    0.145,
    [x, y + 0.8, z],
    [1.03, 0.7, 1.05],
    10,
  );
  builder.cylinder("paint", "#b8402f", {
    radius: 0.15,
    length: 0.06,
    at: [x, y + 0.86, z],
    segments: 12,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("paint", "#b8402f", [0.2, 0.02, 0.12], [x, y + 0.84, z + 0.18]);
  builder.box("glass", "#5fe0d2", [0.22, 0.05, 0.02], [x, y + 0.77, z + 0.16]);
  builder.box("paint", "#b4523e", [0.07, 0.015, 0.01], [x, y + 0.67, z + 0.16]);
  builder.sphere("matte", shade(skin, 0.92), 0.025, [x, y + 0.72, z + 0.17]);
  /* A big friendly moustache */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#5a3a22",
      0.035,
      [x + side * 0.035, y + 0.69, z + 0.155],
      [1.6, 0.7, 1],
      6,
    );
  });
};
