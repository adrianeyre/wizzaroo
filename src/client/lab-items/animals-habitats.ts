import type { ModelPart } from "../world-map-models.js";
import {
  blob,
  eyes,
  mirrored,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

// Each animal faces +z, stands on y = 0 and is about one unit tall.

const quarter = Math.PI / 2;

const yellowEyes = (
  at: [number, number, number],
  radius: number,
): ModelPart[] =>
  mirrored((side) => [
    blob(
      [radius, radius, radius * 0.6],
      "#f2c230",
      { at: [at[0] * side, at[1], at[2]] },
      [8, 6],
    ),
    blob(
      [radius * 0.5, radius * 0.5, radius * 0.3],
      "#141414",
      { at: [at[0] * side, at[1], at[2] + radius * 0.45] },
      [6, 4],
    ),
  ]);

const snowyOwl = (): LabItemParts => {
  const white = "#f4f5f2";
  const fleck = "#3b3a36";
  return {
    body: [
      blob([0.36, 0.46, 0.33], white, { at: [0, 0.5, 0] }),
      blob([0.3, 0.27, 0.29], white, { at: [0, 0.98, 0.02] }),
      blob([0.2, 0.15, 0.05], "#ffffff", { at: [0, 0.97, 0.27] }, [10, 6]),
      ...yellowEyes([0.095, 1.0, 0.3], 0.07),
      spike(0.035, 0.09, "#2a2a2a", {
        at: [0, 0.93, 0.35],
        turn: [quarter * 1.2, 0, 0],
      }),
      ...mirrored((side) =>
        blob(
          [0.12, 0.36, 0.26],
          white,
          { at: [0.31 * side, 0.5, -0.04], turn: [0.12, 0, 0.12 * side] },
          [10, 7],
        ),
      ),
      // The dark flecks that bar a snowy owl's back, wings and front.
      ...[
        [0.18, 0.62, 0.27],
        [-0.12, 0.48, 0.3],
        [0.05, 0.36, 0.31],
        [-0.2, 0.3, 0.24],
        [0.39, 0.6, 0.08],
        [-0.4, 0.45, 0.06],
        [0.41, 0.32, -0.02],
        [-0.38, 0.66, -0.08],
        [0.12, 1.18, 0.16],
      ].map(([x, y, z]) =>
        blob([0.045, 0.022, 0.02], fleck, { at: [x, y, z] }, [5, 3]),
      ),
      ...mirrored((side) => [
        blob([0.08, 0.05, 0.09], white, { at: [0.12 * side, 0.06, 0.12] }),
        ...[-0.04, 0, 0.04].map((x) =>
          spike(0.012, 0.06, "#222222", {
            at: [0.12 * side + x, 0.03, 0.22],
            turn: [quarter, 0, 0],
          }),
        ),
      ]),
    ],
  };
};

const camel = (): LabItemParts => {
  const sand = "#c99a5b";
  const dark = "#8e6638";
  return {
    body: [
      blob([0.26, 0.23, 0.46], sand, { at: [0, 0.78, -0.05] }),
      blob([0.18, 0.24, 0.2], sand, { at: [0, 1.0, -0.08] }),
      ...[
        [0.15, 0.24],
        [-0.15, 0.24],
        [0.15, -0.32],
        [-0.15, -0.32],
      ].flatMap(([x, z]) => [
        rod(0.06, 0.54, sand, { at: [x, 0.38, z] }, 6),
        blob([0.065, 0.035, 0.08], dark, { at: [x, 0.03, z + 0.02] }, [8, 5]),
      ]),
      taper([0.06, 0.1], 0.5, sand, {
        at: [0, 1.0, 0.42],
        turn: [0.75, 0, 0],
      }),
      blob([0.09, 0.09, 0.18], sand, { at: [0, 1.2, 0.64] }),
      blob([0.065, 0.06, 0.06], "#b7864c", { at: [0, 1.17, 0.8] }, [8, 5]),
      ...eyes([0.075, 1.25, 0.66], 0.022),
      ...mirrored((side) =>
        spike(0.025, 0.06, dark, {
          at: [0.06 * side, 1.31, 0.56],
          turn: [-0.3, 0, -0.4 * side],
        }),
      ),
      rod(0.018, 0.22, dark, { at: [0, 0.68, -0.52], turn: [0.25, 0, 0] }, 5),
    ],
  };
};

const shark = (): LabItemParts => {
  const back = "#6f8496";
  const belly = "#eef1f2";
  return {
    body: [
      blob([0.24, 0.26, 0.68], back, { at: [0, 0.45, 0] }),
      blob([0.2, 0.15, 0.6], belly, { at: [0, 0.34, 0.04] }),
      blob([0.17, 0.16, 0.22], back, { at: [0, 0.43, 0.56] }),
      spike(0.17, 0.34, back, {
        at: [0, 0.78, -0.02],
        turn: [-0.35, 0, 0],
        size: [0.25, 1, 1],
      }),
      spike(0.13, 0.42, back, {
        at: [0, 0.68, -0.8],
        turn: [-0.9, 0, 0],
        size: [0.2, 1, 1],
      }),
      spike(0.1, 0.26, back, {
        at: [0, 0.3, -0.76],
        turn: [-2.3, 0, 0],
        size: [0.2, 1, 1],
      }),
      ...mirrored((side) =>
        spike(0.12, 0.34, back, {
          at: [0.26 * side, 0.3, 0.2],
          turn: [-1.2, 0, 1.25 * side],
          size: [1, 1, 0.22],
        }),
      ),
      ...mirrored((side) => [
        blob(
          [0.02, 0.03, 0.03],
          "#101418",
          { at: [0.15 * side, 0.5, 0.6] },
          [6, 4],
        ),
        ...[0.3, 0.36, 0.42].map((z) =>
          blob(
            [0.01, 0.07, 0.008],
            "#3e4d5a",
            { at: [0.21 * side, 0.43, z] },
            [4, 3],
          ),
        ),
      ]),
      blob([0.09, 0.012, 0.03], "#3a2c2c", { at: [0, 0.33, 0.7] }, [8, 3]),
    ],
  };
};

const squirrel = (): LabItemParts => {
  const russet = "#b5552a";
  const cream = "#f1dfc2";
  return {
    body: [
      blob([0.2, 0.28, 0.2], russet, { at: [0, 0.34, 0.05] }),
      blob([0.13, 0.2, 0.08], cream, { at: [0, 0.34, 0.2] }, [8, 6]),
      blob([0.16, 0.15, 0.16], russet, { at: [0, 0.7, 0.12] }),
      blob([0.07, 0.06, 0.07], cream, { at: [0, 0.65, 0.26] }, [8, 5]),
      blob([0.022, 0.02, 0.02], "#2a1c16", { at: [0, 0.68, 0.33] }, [6, 4]),
      ...eyes([0.075, 0.74, 0.24], 0.03),
      ...mirrored((side) => [
        spike(0.045, 0.12, russet, {
          at: [0.09 * side, 0.88, 0.08],
          turn: [0, 0, -0.25 * side],
        }),
        spike(0.02, 0.08, "#7d3417", {
          at: [0.105 * side, 0.97, 0.08],
          turn: [0, 0, -0.25 * side],
        }),
        blob(
          [0.07, 0.06, 0.13],
          russet,
          { at: [0.12 * side, 0.08, 0.12] },
          [8, 6],
        ),
        rod(0.03, 0.12, russet, {
          at: [0.07 * side, 0.45, 0.24],
          turn: [-0.9, 0, 0],
        }),
      ]),
      // The acorn it holds in its front paws.
      blob([0.045, 0.055, 0.045], "#a8782f", { at: [0, 0.47, 0.32] }, [8, 6]),
      blob([0.05, 0.025, 0.05], "#6b4a22", { at: [0, 0.51, 0.32] }, [8, 4]),
      // The bushy tail curling up behind it.
      ...[
        [0.14, 0.2, -0.16, 0.13],
        [0.15, 0.42, -0.26, 0.16],
        [0.16, 0.68, -0.28, 0.17],
        [0.15, 0.9, -0.2, 0.15],
        [0.12, 1.02, -0.06, 0.12],
      ].map(([radius, y, z, depth]) =>
        blob(
          [radius, radius * 1.1, depth],
          "#c0622f",
          { at: [0, y, z] },
          [9, 6],
        ),
      ),
    ],
  };
};

const fox = ({
  coat,
  ears,
  earSize,
  tailTip,
  muzzle,
}: {
  coat: string;
  ears: string;
  earSize: number;
  tailTip: string;
  muzzle: number;
}): ModelPart[] => [
  blob([0.17, 0.17, 0.36], coat, { at: [0, 0.42, -0.04] }),
  blob([0.15, 0.14, 0.15], coat, { at: [0, 0.62, 0.34] }),
  spike(0.07, muzzle, coat, {
    at: [0, 0.58, 0.46 + muzzle / 2],
    turn: [quarter, 0, 0],
  }),
  blob([0.025, 0.022, 0.022], "#16161c", {
    at: [0, 0.58, 0.47 + muzzle],
  }),
  ...eyes([0.065, 0.66, 0.46], 0.025),
  ...mirrored((side) =>
    spike(0.055 * earSize, 0.15 * earSize, ears, {
      at: [0.08 * side, 0.74 + 0.06 * earSize, 0.3],
      turn: [-0.15, 0, -0.35 * side],
      size: [1, 1, 0.45],
    }),
  ),
  ...[
    [0.1, 0.2],
    [-0.1, 0.2],
    [0.1, -0.26],
    [-0.1, -0.26],
  ].map(([x, z]) => rod(0.045, 0.28, coat, { at: [x, 0.17, z] }, 6)),
  blob([0.1, 0.1, 0.26], coat, {
    at: [0, 0.36, -0.52],
    turn: [0.6, 0, 0],
  }),
  blob([0.07, 0.07, 0.1], tailTip, {
    at: [0, 0.22, -0.72],
    turn: [0.6, 0, 0],
  }),
];

const arcticFox = (): LabItemParts => ({
  body: fox({
    coat: "#f3f4f1",
    ears: "#e8e9e6",
    earSize: 0.75,
    tailTip: "#ffffff",
    muzzle: 0.1,
  }),
});

const fennecFox = (): LabItemParts => ({
  body: [
    ...fox({
      coat: "#e3c08d",
      ears: "#e3c08d",
      earSize: 1.9,
      tailTip: "#2b2420",
      muzzle: 0.15,
    }),
    // The pale insides of its huge ears.
    ...mirrored((side) =>
      spike(0.07, 0.2, "#f3d9c9", {
        at: [0.08 * side, 0.85, 0.32],
        turn: [-0.15, 0, -0.35 * side],
        size: [1, 1, 0.3],
      }),
    ),
  ],
});

const jellyfishBell = [
  [0, 0.5],
  [0.42, 0.52],
  [0.46, 0.62],
  [0.42, 0.8],
  [0.3, 0.95],
  [0.14, 1.03],
  [0, 1.05],
] as const;

const jellyfish = (): LabItemParts => {
  const pink = "#f08fb7";
  const tentacleCount = 8;
  return {
    glass: [turned(jellyfishBell, "#ff8fc6", {}, 20)],
    body: [
      // The four pink rings seen through the bell.
      ...[0, 1, 2, 3].map((index) =>
        blob(
          [0.08, 0.04, 0.08],
          "#d94f8a",
          {
            at: [
              Math.cos((index * Math.PI) / 2) * 0.14,
              0.78,
              Math.sin((index * Math.PI) / 2) * 0.14,
            ],
          },
          [8, 4],
        ),
      ),
      // The frilly arms down its middle.
      ...[0, 1, 2, 3].map((index) => {
        const angle = (index * Math.PI) / 2 + Math.PI / 4;
        return blob(
          [0.05, 0.3, 0.025],
          pink,
          {
            at: [Math.cos(angle) * 0.07, 0.3, Math.sin(angle) * 0.07],
            turn: [0, -angle, 0.12],
          },
          [8, 6],
        );
      }),
      // The thin tentacles trailing from the rim.
      ...Array.from({ length: tentacleCount }, (_, index) => {
        const angle = (index / tentacleCount) * Math.PI * 2;
        const sway = index % 2 === 0 ? 0.12 : -0.1;
        return rod(
          0.012,
          0.46,
          "#f6c2d8",
          {
            at: [Math.cos(angle) * 0.38, 0.27, Math.sin(angle) * 0.38],
            turn: [sway, 0, -sway],
          },
          4,
        );
      }),
    ],
  };
};

const badger = (): LabItemParts => {
  const grey = "#8d8d8a";
  const black = "#1e1e1e";
  const white = "#f2f2ee";
  return {
    body: [
      blob([0.27, 0.2, 0.44], grey, { at: [0, 0.32, -0.05] }),
      ...[
        [0.15, 0.2],
        [-0.15, 0.2],
        [0.15, -0.3],
        [-0.15, -0.3],
      ].map(([x, z]) => rod(0.06, 0.12, black, { at: [x, 0.1, z] }, 6)),
      blob([0.13, 0.12, 0.2], white, { at: [0, 0.38, 0.42] }),
      spike(0.07, 0.14, white, {
        at: [0, 0.35, 0.65],
        turn: [quarter, 0, 0],
      }),
      blob([0.03, 0.025, 0.025], black, { at: [0, 0.35, 0.72] }, [6, 4]),
      // The two black stripes from its nose over its eyes.
      ...mirrored((side) => [
        blob(
          [0.045, 0.06, 0.2],
          black,
          { at: [0.065 * side, 0.43, 0.44], turn: [0.25, 0, 0] },
          [8, 6],
        ),
        blob([0.05, 0.045, 0.03], black, { at: [0.11 * side, 0.5, 0.3] }),
        blob(
          [0.03, 0.012, 0.025],
          white,
          { at: [0.11 * side, 0.54, 0.31] },
          [6, 3],
        ),
      ]),
      ...eyes([0.07, 0.44, 0.58], 0.018, "#050505"),
      rod(0.035, 0.1, grey, { at: [0, 0.34, -0.5], turn: [1.2, 0, 0] }, 5),
    ],
  };
};

export const habitatAnimalBuilders = {
  "snowy-owl": snowyOwl,
  camel,
  shark,
  squirrel,
  "arctic-fox": arcticFox,
  "fennec-fox": fennecFox,
  jellyfish,
  badger,
} as const;
