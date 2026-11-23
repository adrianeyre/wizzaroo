import {
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import type { ModelPart, Triple } from "../world-map-models.js";
import {
  blob,
  block,
  eyes,
  mirrored,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

const quarter = Math.PI / 2;
const half = Math.PI;

type Point = readonly [number, number];

interface Placement {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

/** A flat outline given a thickness, centred on z = 0 and facing +z. */
const slab = (
  outline: readonly Point[],
  depth: number,
  colour: string,
  { at, turn, size }: Placement = {},
  bevel = 0,
): ModelPart => {
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 4,
  });
  geometry.translate(0, 0, -depth / 2);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

/** A smooth tube along a curve, for wires, straps, tubing and leads. */
const tube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 16,
  sides = 6,
  isClosed = false,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3(
      points.map((point) => new Vector3(...point)),
      isClosed,
    ),
    segments,
    radius,
    sides,
    isClosed,
  ),
  colour,
  isSmooth: true,
});

/** A coarser ring than `ring`, for when many are needed. */
const hoop = (
  radius: number,
  thickness: number,
  colour: string,
  { at, turn, size }: Placement = {},
  arc = Math.PI * 2,
  startAngle = 0,
  sides = 4,
  steps = 12,
): ModelPart => {
  const geometry = new TorusGeometry(radius, thickness, sides, steps, arc);
  geometry.rotateZ(startAngle);
  return {
    geometry,
    colour,
    position: at,
    rotation: turn,
    scale: size,
    isSmooth: true,
  };
};

/** A disc facing +z, such as a coin, a lens or a clock face. */
const disc = (
  radius: number,
  depth: number,
  colour: string,
  { at, turn, size }: Placement = {},
  sides = 20,
): ModelPart => {
  const geometry = new CylinderGeometry(radius, radius, depth, sides, 1);
  geometry.rotateX(quarter);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

const partMatrix = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: ModelPart): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    typeof scale === "number"
      ? new Vector3(scale, scale, scale)
      : new Vector3(...scale),
  );

/** Turns and moves a whole group of parts together, such as tilting a coin up to the camera. */
const tilted = (
  parts: ModelPart[],
  turn: Triple,
  at: Triple = [0, 0, 0],
): ModelPart[] =>
  parts.map((part) => {
    part.geometry.applyMatrix4(partMatrix(part));
    return { ...part, position: at, rotation: turn, scale: undefined };
  });

/** The turn that lays a part's +z along `normal`, for patches on a sphere. */
const facing = (normal: Vector3): Triple => {
  const euler = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      normal.clone().normalize(),
    ),
  );
  return [euler.x, euler.y, euler.z];
};

const mirrorOutline = (rightHalf: readonly Point[]): Point[] => [
  ...rightHalf,
  ...[...rightHalf].reverse().map(([x, y]): Point => [-x, y]),
];

const smile = (at: Triple, width: number, colour: string): ModelPart =>
  hoop(
    width,
    width * 0.2,
    colour,
    { at, turn: [-0.25, 0, 0] },
    half,
    half,
    3,
    8,
  );

// ---------------------------------------------------------------- people

interface Person {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoes: string;
  hasShorts: boolean;
  hairStyle: "short" | "curly";
  isWaving: boolean;
}

const blush = "#f08a8a";
const mouthDark = "#7a3328";

const head = (
  { skin, hair, hairStyle }: Person,
  y: number,
  radius: number,
): ModelPart[] => [
  blob(
    [radius, radius * 0.98, radius * 0.92],
    skin,
    { at: [0, y, 0] },
    [10, 7],
  ),
  ...eyes([radius * 0.36, y + radius * 0.05, radius * 0.82], radius * 0.13),
  smile([0, y - radius * 0.28, radius * 0.86], radius * 0.24, mouthDark),
  blob(
    [radius * 0.1, radius * 0.08, radius * 0.08],
    skin,
    { at: [0, y - radius * 0.1, radius * 0.93] },
    [6, 4],
  ),
  ...mirrored((side) => [
    blob(
      [radius * 0.14, radius * 0.09, radius * 0.05],
      blush,
      { at: [radius * 0.56 * side, y - radius * 0.2, radius * 0.72] },
      [6, 4],
    ),
    blob(
      [radius * 0.14, radius * 0.22, radius * 0.14],
      skin,
      { at: [radius * 0.97 * side, y, -radius * 0.05] },
      [5, 3],
    ),
  ]),
  ...(hairStyle === "short"
    ? [
        blob(
          [radius * 1.06, radius * 0.75, radius * 1.0],
          hair,
          { at: [0, y + radius * 0.38, -radius * 0.12], turn: [-0.35, 0, 0] },
          [11, 6],
        ),
        blob(
          [radius * 0.6, radius * 0.2, radius * 0.3],
          hair,
          {
            at: [radius * 0.15, y + radius * 0.72, radius * 0.55],
            turn: [0.5, 0, -0.2],
          },
          [8, 5],
        ),
      ]
    : [
        blob(
          [radius * 1.04, radius * 0.9, radius * 0.95],
          hair,
          { at: [0, y + radius * 0.22, -radius * 0.2] },
          [9, 6],
        ),
        // Curls framing the face.
        ...[
          [-0.8, 0.5, 0.45],
          [-0.45, 0.85, 0.5],
          [0, 0.95, 0.5],
          [0.45, 0.85, 0.5],
          [0.8, 0.5, 0.45],
          [-0.95, 0.05, 0.1],
          [0.95, 0.05, 0.1],
        ].map(([x, curlY, z]) =>
          blob(
            [radius * 0.3, radius * 0.3, radius * 0.3],
            hair,
            { at: [x * radius, y + curlY * radius, z * radius] },
            [6, 4],
          ),
        ),
      ]),
];

const person = (look: Person): ModelPart[] => {
  const { skin, top, bottom, shoes, hasShorts, isWaving } = look;
  return [
    ...mirrored((side) => [
      blob(
        [0.075, 0.05, 0.11],
        shoes,
        { at: [0.085 * side, 0.05, 0.03] },
        [7, 4],
      ),
      hasShorts
        ? rod(0.045, 0.28, skin, { at: [0.085 * side, 0.26, 0] }, 6)
        : rod(0.06, 0.32, bottom, { at: [0.085 * side, 0.3, 0] }, 6),
      taper([0.075, 0.07], 0.16, bottom, { at: [0.085 * side, 0.47, 0] }, 8),
      blob([0.07, 0.07, 0.065], top, { at: [0.17 * side, 0.8, 0] }, [7, 4]),
    ]),
    blob([0.165, 0.09, 0.11], bottom, { at: [0, 0.54, 0] }, [8, 5]),
    taper([0.13, 0.16], 0.3, top, { at: [0, 0.7, 0], size: [1, 1, 0.72] }, 10),
    blob([0.13, 0.05, 0.095], top, { at: [0, 0.85, 0] }, [8, 4]),
    rod(0.04, 0.05, skin, { at: [0, 0.9, 0] }, 6),
    // The left arm hangs down; the right one hangs too, or waves.
    rod(0.035, 0.26, skin, { at: [-0.205, 0.65, 0], turn: [0, 0, -0.14] }, 6),
    blob([0.045, 0.05, 0.04], skin, { at: [-0.225, 0.5, 0] }, [7, 5]),
    ...(isWaving
      ? [
          rod(
            0.035,
            0.26,
            skin,
            {
              at: [0.255, 0.97, 0.01],
              turn: [0, 0, -0.5],
            },
            6,
          ),
          // An open, waving hand: a palm with its fingers together and a thumb.
          blob(
            [0.055, 0.08, 0.03],
            skin,
            { at: [0.345, 1.15, 0.02], turn: [0, 0, -0.3] },
            [7, 5],
          ),
          blob(
            [0.016, 0.035, 0.016],
            skin,
            { at: [0.29, 1.15, 0.02], turn: [0, 0, 0.8] },
            [5, 3],
          ),
        ]
      : [
          rod(
            0.035,
            0.26,
            skin,
            { at: [0.205, 0.65, 0], turn: [0, 0, 0.14] },
            6,
          ),
          blob([0.045, 0.05, 0.04], skin, { at: [0.225, 0.5, 0] }, [7, 5]),
        ]),
    ...head(look, 1.1, 0.2),
  ];
};

const baby = (): LabItemParts => {
  const blanket = "#a9cdee";
  const trim = "#f7f2e6";
  const skin = "#f1c9a5";
  return {
    body: [
      blob([0.48, 0.22, 0.26], blanket, {
        at: [-0.1, 0.22, 0],
        turn: [0, 0, 0.1],
      }),
      // The hood of the swaddle, cupping the back of the head.
      blob([0.25, 0.25, 0.22], blanket, { at: [0.36, 0.3, -0.06] }),
      hoop(
        0.19,
        0.04,
        trim,
        { at: [0.36, 0.29, 0.1], size: [1, 1.05, 1] },
        Math.PI * 2,
        0,
        5,
        16,
      ),
      blob([0.19, 0.18, 0.17], skin, { at: [0.36, 0.28, 0.06] }),
      // Closed, sleeping eyes.
      ...mirrored((side) =>
        hoop(
          0.032,
          0.008,
          "#5b3a2e",
          { at: [0.36 + 0.07 * side, 0.31, 0.22] },
          half,
          half,
          3,
          8,
        ),
      ),
      ...mirrored((side) =>
        blob(
          [0.035, 0.022, 0.01],
          blush,
          { at: [0.36 + 0.11 * side, 0.24, 0.2] },
          [6, 4],
        ),
      ),
      blob(
        [0.02, 0.016, 0.014],
        "#e0a98a",
        { at: [0.36, 0.27, 0.235] },
        [6, 4],
      ),
      blob([0.022, 0.012, 0.01], "#c76d63", { at: [0.36, 0.2, 0.22] }, [6, 4]),
      blob(
        [0.05, 0.03, 0.05],
        "#8a5a3c",
        { at: [0.34, 0.45, 0.1], turn: [0, 0, 0.4] },
        [6, 4],
      ),
      // A band wrapped round the swaddle.
      hoop(
        0.24,
        0.035,
        trim,
        { at: [-0.12, 0.22, 0], turn: [0, quarter, 0], size: [1.08, 0.95, 1] },
        Math.PI * 2,
        0,
        4,
        16,
      ),
      blob([0.06, 0.04, 0.03], trim, { at: [-0.12, 0.3, 0.26] }, [6, 4]),
    ],
  };
};

const boy = (): LabItemParts => ({
  body: person({
    skin: "#e8b48c",
    hair: "#6b3f1f",
    top: "#3f86d8",
    bottom: "#c9a46a",
    shoes: "#d23b34",
    hasShorts: true,
    hairStyle: "short",
    isWaving: false,
  }),
});

const child = (): LabItemParts => ({
  body: person({
    skin: "#9a6240",
    hair: "#24170f",
    top: "#f4c232",
    bottom: "#4f9a58",
    shoes: "#f5f5f5",
    hasShorts: false,
    hairStyle: "curly",
    isWaving: true,
  }),
});

// ---------------------------------------------------------------- body

const peach = "#f2c3a0";
const peachShade = "#e2a585";
const bone = "#f3efe3";
const boneShade = "#d9d2bf";
const socket = "#3b3236";

const ear = (): LabItemParts => ({
  body: [
    blob([0.26, 0.36, 0.07], peach, { at: [0, 0.48, -0.03] }),
    // The curled outer rim, open towards the face.
    hoop(
      0.27,
      0.07,
      peach,
      { at: [0.02, 0.5, 0], size: [0.85, 1.25, 1] },
      Math.PI * 1.55,
      -0.95,
      6,
      16,
    ),
    hoop(
      0.13,
      0.04,
      peach,
      { at: [0.0, 0.48, 0.03], size: [0.8, 1.3, 1] },
      Math.PI * 1.1,
      -0.6,
      5,
      10,
    ),
    blob([0.12, 0.13, 0.03], peachShade, { at: [-0.02, 0.38, 0.0] }, [8, 6]),
    blob([0.04, 0.045, 0.03], "#a8705a", { at: [-0.07, 0.35, 0.02] }, [6, 4]),
    blob([0.05, 0.06, 0.05], peach, { at: [-0.17, 0.33, 0.04] }, [6, 4]),
    blob([0.12, 0.13, 0.07], peach, { at: [0.0, 0.13, 0.0] }, [10, 6]),
  ],
});

const eye = (): LabItemParts => {
  const lash = "#1d1a1f";
  return {
    body: [
      blob([0.48, 0.27, 0.16], "#fbfbf8", { at: [0, 0.4, 0] }),
      blob([0.17, 0.17, 0.06], "#3d86d4", { at: [0, 0.41, 0.115] }, [14, 8]),
      blob([0.11, 0.11, 0.04], "#2a63ab", { at: [0, 0.41, 0.14] }, [12, 6]),
      blob([0.075, 0.075, 0.03], "#121216", { at: [0, 0.41, 0.165] }, [10, 6]),
      blob([0.03, 0.03, 0.015], "#ffffff", { at: [0.05, 0.46, 0.185] }, [6, 4]),
      // The dark lash line along the top of the eye, with its lashes.
      hoop(
        0.5,
        0.03,
        lash,
        { at: [0, 0.4, 0.04], size: [0.98, 0.56, 1] },
        half - 0.3,
        0.15,
        4,
        16,
      ),
      hoop(
        0.5,
        0.014,
        "#c9a48e",
        { at: [0, 0.4, 0.04], size: [0.98, 0.5, 1] },
        half - 0.5,
        half + 0.25,
        3,
        12,
      ),
      ...[-0.7, -0.4, -0.12, 0.12, 0.4, 0.7].map((x) => {
        const angle = quarter - x * 1.1;
        return spike(
          0.03,
          0.16,
          lash,
          {
            at: [
              0.52 * Math.cos(angle),
              0.4 + 0.3 * Math.sin(angle) + 0.05,
              0.05,
            ],
            turn: [0.3, 0, -x * 1.3],
            size: [1, 1, 0.4],
          },
          5,
        );
      }),
    ],
  };
};

const nose = (): LabItemParts => ({
  body: tilted(
    [
      taper(
        [0.05, 0.13],
        0.42,
        peach,
        { at: [0, 0.38, -0.01], size: [1, 1, 0.65] },
        12,
      ),
      blob([0.05, 0.05, 0.035], peach, { at: [0, 0.59, -0.01] }, [6, 4]),
      blob([0.13, 0.12, 0.13], peach, { at: [0, 0.17, 0.06] }),
      ...mirrored((side) => [
        blob(
          [0.1, 0.09, 0.1],
          peach,
          { at: [0.12 * side, 0.12, 0.0] },
          [10, 6],
        ),
        blob(
          [0.04, 0.025, 0.035],
          "#8a4f3d",
          { at: [0.055 * side, 0.06, 0.05] },
          [6, 4],
        ),
      ]),
    ],
    [-0.25, 0, 0],
  ),
});

const tongue = (): LabItemParts => {
  const lip = "#d8656d";
  const mouth: Triple[] = [
    [-0.4, 0.58, 0],
    [-0.2, 0.52, 0.02],
    [0, 0.5, 0.03],
    [0.2, 0.52, 0.02],
    [0.4, 0.58, 0],
    [0.32, 0.38, 0.02],
    [0.16, 0.26, 0.04],
    [0, 0.23, 0.05],
    [-0.16, 0.26, 0.04],
    [-0.32, 0.38, 0.02],
  ];
  return {
    body: [
      blob([0.37, 0.15, 0.06], "#4a1d23", { at: [0, 0.42, -0.02] }),
      tube(mouth, 0.045, lip, 30, 6, true),
      blob([0.28, 0.045, 0.04], "#ffffff", { at: [0, 0.48, 0.0] }, [10, 4]),
      // The tongue, poking out over the bottom lip.
      blob([0.15, 0.17, 0.08], "#f07890", {
        at: [0, 0.2, 0.09],
        turn: [0.5, 0, 0],
      }),
      blob(
        [0.012, 0.09, 0.02],
        "#d55570",
        { at: [0, 0.2, 0.15], turn: [0.5, 0, 0] },
        [5, 4],
      ),
      ...mirrored((side) =>
        blob([0.04, 0.04, 0.03], lip, { at: [0.42 * side, 0.6, 0] }, [6, 4]),
      ),
    ],
  };
};

const rib = (
  radius: number,
  y: number,
  depth: number,
  gap: number,
  colour: string,
): ModelPart =>
  hoop(
    radius,
    0.028,
    colour,
    { at: [0, y, 0], turn: [-quarter + 0.25, 0, 0], size: [1, depth, 1] },
    Math.PI * 2 - gap,
    -quarter + gap / 2,
    4,
    14,
  );

const ribcage = (): LabItemParts => ({
  body: [
    ...[
      [0.24, 0.9, 0.5],
      [0.3, 0.8, 0.45],
      [0.34, 0.69, 0.45],
      [0.36, 0.58, 0.5],
      [0.37, 0.47, 0.6],
      [0.36, 0.36, 0.8],
      [0.33, 0.26, 1.1],
    ].map(([radius, y, gap]) => rib(radius, y, 0.72, gap, bone)),
    blob(
      [0.05, 0.27, 0.03],
      bone,
      { at: [0, 0.68, 0.25], turn: [-0.15, 0, 0] },
      [8, 6],
    ),
    ...[0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95].map((y) =>
      blob([0.055, 0.04, 0.05], boneShade, { at: [0, y, -0.25] }, [6, 4]),
    ),
    ...mirrored((side) =>
      rod(
        0.022,
        0.22,
        bone,
        {
          at: [0.13 * side, 1.0, 0.1],
          turn: [0, 0.3 * side, quarter + 0.1 * side],
        },
        5,
      ),
    ),
  ],
});

const skull = (): LabItemParts => ({
  body: [
    blob([0.38, 0.36, 0.38], bone, { at: [0, 0.66, -0.02] }),
    blob([0.3, 0.24, 0.28], bone, { at: [0, 0.42, 0.06] }),
    blob([0.22, 0.1, 0.2], bone, { at: [0, 0.18, 0.1] }, [10, 6]),
    ...mirrored((side) => [
      blob(
        [0.11, 0.12, 0.05],
        socket,
        { at: [0.14 * side, 0.5, 0.3] },
        [10, 6],
      ),
      // A glint in each socket keeps the skull friendly rather than spooky.
      blob(
        [0.025, 0.025, 0.01],
        "#ffffff",
        { at: [0.16 * side, 0.54, 0.345] },
        [5, 4],
      ),
      blob([0.06, 0.06, 0.08], bone, { at: [0.25 * side, 0.4, 0.2] }, [6, 4]),
    ]),
    spike(
      0.045,
      0.08,
      socket,
      { at: [0, 0.36, 0.33], turn: [half, 0, 0], size: [1, 1, 0.3] },
      3,
    ),
    block([0.34, 0.05, 0.03], socket, { at: [0, 0.255, 0.255] }),
    ...[-0.12, -0.06, 0, 0.06, 0.12].flatMap((x) => [
      block([0.05, 0.06, 0.04], "#ffffff", { at: [x, 0.285, 0.26] }),
      block([0.05, 0.05, 0.04], "#ffffff", { at: [x, 0.22, 0.25] }),
    ]),
  ],
});

const skeleton = (): LabItemParts => ({
  body: [
    blob([0.13, 0.13, 0.13], bone, { at: [0, 1.19, 0] }, [10, 7]),
    blob([0.09, 0.06, 0.08], bone, { at: [0, 1.07, 0.04] }, [8, 5]),
    ...mirrored((side) => [
      blob(
        [0.035, 0.04, 0.02],
        socket,
        { at: [0.048 * side, 1.18, 0.115] },
        [6, 4],
      ),
      blob(
        [0.01, 0.01, 0.006],
        "#ffffff",
        { at: [0.055 * side, 1.195, 0.133] },
        [4, 3],
      ),
    ]),
    block([0.1, 0.015, 0.02], socket, { at: [0, 1.075, 0.11] }),
    ...[0.63, 0.71, 0.79, 0.87, 0.95].map((y) =>
      blob([0.025, 0.03, 0.025], boneShade, { at: [0, y, -0.06] }, [5, 3]),
    ),
    ...[
      [0.12, 0.93],
      [0.15, 0.85],
      [0.155, 0.77],
      [0.14, 0.69],
    ].map(([radius, y]) =>
      hoop(
        radius,
        0.018,
        bone,
        { at: [0, y, 0], turn: [-quarter + 0.25, 0, 0], size: [1, 0.65, 1] },
        Math.PI * 2 - 0.6,
        -quarter + 0.3,
        3,
        10,
      ),
    ),
    rod(0.02, 0.2, bone, { at: [0, 0.82, 0.1] }, 5),
    blob([0.12, 0.06, 0.06], bone, { at: [0, 0.54, 0] }, [8, 5]),
    rod(0.016, 0.26, bone, { at: [0, 0.97, 0.02], turn: [0, 0, quarter] }, 5),
    ...mirrored((side) => [
      rod(
        0.017,
        0.2,
        bone,
        { at: [0.17 * side, 0.85, 0], turn: [0, 0, 0.18 * side] },
        5,
      ),
      blob([0.028, 0.028, 0.028], bone, { at: [0.19 * side, 0.74, 0] }, [5, 3]),
      rod(
        0.015,
        0.18,
        bone,
        { at: [0.2 * side, 0.64, 0.015], turn: [0, 0, 0.1 * side] },
        5,
      ),
      blob(
        [0.03, 0.045, 0.02],
        bone,
        { at: [0.215 * side, 0.5, 0.03] },
        [6, 4],
      ),
      rod(0.02, 0.2, bone, { at: [0.075 * side, 0.4, 0] }, 5),
      blob(
        [0.032, 0.032, 0.032],
        bone,
        { at: [0.075 * side, 0.28, 0] },
        [5, 3],
      ),
      rod(0.018, 0.2, bone, { at: [0.075 * side, 0.16, 0] }, 5),
      blob(
        [0.04, 0.025, 0.07],
        bone,
        { at: [0.08 * side, 0.025, 0.04] },
        [6, 4],
      ),
    ]),
  ],
});

// ---------------------------------------------------------------- clothes

/** A flat garment, standing up to face the camera. */
const garment = (outline: readonly Point[], colour: string): ModelPart =>
  slab(outline, 0.1, colour, {}, 0.03);

const tShirt = (): LabItemParts => {
  const green = "#3fae49";
  return {
    body: [
      garment(
        mirrorOutline([
          [0, 0],
          [0.3, 0],
          [0.3, 0.5],
          [0.42, 0.44],
          [0.52, 0.62],
          [0.36, 0.78],
          [0.13, 0.82],
          [0.08, 0.74],
          [0, 0.72],
        ]).reverse(),
        green,
      ),
      hoop(
        0.12,
        0.025,
        "#2f8a39",
        { at: [0, 0.82, 0.07], size: [1, 0.85, 1] },
        half,
        half,
        4,
        10,
      ),
      ...mirrored((side) =>
        block([0.17, 0.03, 0.02], "#2f8a39", {
          at: [0.47 * side, 0.53, 0.07],
          turn: [0, 0, 1.0 * side],
        }),
      ),
      block([0.58, 0.03, 0.02], "#2f8a39", { at: [0, 0.03, 0.07] }),
    ],
  };
};

const shirt = (): LabItemParts => {
  const white = "#ffffff";
  const seam = "#d4d6d8";
  return {
    body: [
      garment(
        mirrorOutline([
          [0, 0],
          [0.3, 0],
          [0.3, 0.52],
          [0.44, 0.1],
          [0.56, 0.14],
          [0.38, 0.74],
          [0.12, 0.82],
          [0, 0.76],
        ]).reverse(),
        white,
      ),
      ...mirrored((side) => [
        slab(
          [
            [0, 0.79],
            [0.15 * side, 0.85],
            [0.16 * side, 0.73],
            [0.02 * side, 0.64],
          ],
          0.04,
          "#ffffff",
          { at: [0, 0, 0.07] },
          0.01,
        ),
        block([0.13, 0.07, 0.03], seam, {
          at: [0.5 * side, 0.12, 0.07],
          turn: [0, 0, 0.33 * side],
        }),
      ]),
      block([0.05, 0.64, 0.02], seam, { at: [0, 0.32, 0.07] }),
      ...[0.12, 0.26, 0.4, 0.54].map((y) =>
        disc(0.02, 0.02, "#9aa3ad", { at: [0, y, 0.09] }, 8),
      ),
      block([0.12, 0.13, 0.015], seam, { at: [-0.17, 0.52, 0.07] }),
    ],
  };
};

const trousers = (): LabItemParts => {
  const blue = "#2f5fb8";
  const dark = "#244a8f";
  return {
    body: [
      garment(
        [
          [-0.34, 0],
          [-0.06, 0],
          [0, 0.62],
          [0.06, 0],
          [0.34, 0],
          [0.3, 1],
          [-0.3, 1],
        ],
        blue,
      ),
      block([0.62, 0.08, 0.03], dark, { at: [0, 0.96, 0.07] }),
      disc(0.025, 0.02, "#c9b26a", { at: [0, 0.96, 0.095] }, 8),
      block([0.02, 0.26, 0.02], dark, { at: [0.03, 0.78, 0.07] }),
      ...mirrored((side) => [
        block([0.03, 0.1, 0.03], dark, { at: [0.2 * side, 0.95, 0.08] }),
        hoop(
          0.1,
          0.012,
          dark,
          { at: [0.3 * side, 0.92, 0.065] },
          quarter,
          side > 0 ? half : -quarter,
          3,
          6,
        ),
        block([0.29, 0.06, 0.03], dark, {
          at: [0.2 * side, 0.03, 0.07],
          turn: [0, 0, 0.03 * side],
        }),
      ]),
    ],
  };
};

const dress = (): LabItemParts => {
  const plum = "#9b4fc4";
  const dot = "#fff3b8";
  const skirtRadius = (y: number): number => 0.42 - 0.56 * y;
  return {
    body: [
      turned(
        [
          [0.42, 0],
          [0.15, 0.48],
          [0.14, 0.62],
          [0.16, 0.8],
          [0.11, 0.86],
          [0.07, 0.87],
        ],
        plum,
        { size: [1, 1, 0.7] },
        16,
      ),
      hoop(
        0.155,
        0.03,
        "#f2a7c8",
        { at: [0, 0.5, 0], turn: [quarter, 0, 0], size: [1, 0.7, 1] },
        Math.PI * 2,
        0,
        4,
        14,
      ),
      blob([0.06, 0.04, 0.025], "#f2a7c8", { at: [0, 0.5, 0.11] }, [6, 4]),
      ...mirrored((side) =>
        blob([0.08, 0.07, 0.08], plum, { at: [0.17 * side, 0.78, 0] }, [8, 5]),
      ),
      // Spots spread over the skirt.
      ...[
        [0.08, 0.1],
        [0.38, 0.1],
        [-0.3, 0.1],
        [0.9, 0.1],
        [-0.85, 0.1],
        [2.2, 0.12],
        [-2.3, 0.12],
        [3.1, 0.1],
        [-0.1, 0.25],
        [0.55, 0.26],
        [-0.65, 0.26],
        [1.4, 0.26],
        [-1.5, 0.26],
        [2.8, 0.26],
        [0.2, 0.39],
        [-0.45, 0.39],
        [1.0, 0.39],
      ].map(([angle, y]) => {
        const radius = skirtRadius(y) + 0.005;
        return blob(
          [0.028, 0.028, 0.028],
          dot,
          { at: [radius * Math.sin(angle), y, radius * Math.cos(angle) * 0.7] },
          [5, 4],
        );
      }),
    ],
  };
};

const skirt = (): LabItemParts => {
  const black = "#2e2e35";
  return {
    body: [
      turned(
        [
          [0.42, 0],
          [0.4, 0.06],
          [0.33, 0.2],
          [0.25, 0.36],
          [0.19, 0.48],
          [0.17, 0.5],
        ],
        black,
        { size: [1, 1, 0.75] },
        16,
      ),
      // Soft folds falling from the waist to the hem.
      ...[-1.2, -0.6, 0, 0.6, 1.2, 2.2, -2.2, half].map((angle) => {
        const lean = Math.atan2(0.24, 0.48);
        return rod(
          0.018,
          0.48,
          black,
          {
            at: [0.3 * Math.sin(angle), 0.24, 0.3 * Math.cos(angle) * 0.75],
            turn: [-lean * Math.cos(angle) * 0.75, 0, lean * Math.sin(angle)],
          },
          4,
        );
      }),
      taper(
        [0.175, 0.18],
        0.08,
        "#17171b",
        { at: [0, 0.53, 0], size: [1, 1, 0.75] },
        14,
      ),
      disc(0.022, 0.02, "#8c8c94", { at: [0.06, 0.53, 0.14] }, 8),
    ],
  };
};

const hat = (): LabItemParts => {
  const red = "#d6302c";
  return {
    body: [
      turned(
        [
          [0, 0.04],
          [0.42, 0.01],
          [0.46, 0.04],
          [0.42, 0.06],
          [0.24, 0.07],
        ],
        red,
        {},
        20,
      ),
      turned(
        [
          [0.24, 0.04],
          [0.25, 0.26],
          [0.21, 0.36],
          [0.1, 0.4],
          [0, 0.41],
        ],
        red,
        {},
        18,
      ),
      taper([0.255, 0.252], 0.08, "#2b2023", { at: [0, 0.1, 0] }, 18),
      blob(
        [0.06, 0.04, 0.03],
        "#2b2023",
        { at: [0.18, 0.1, 0.18], turn: [0, 0.8, 0] },
        [6, 4],
      ),
    ],
  };
};

const sunHat = (): LabItemParts => {
  const straw = "#e6c87c";
  const weave = "#cfa95c";
  const ribbon = "#4aa3d8";
  return {
    body: [
      turned(
        [
          [0, 0.12],
          [0.3, 0.1],
          [0.52, 0.04],
          [0.62, 0.0],
          [0.6, 0.03],
          [0.46, 0.09],
          [0.26, 0.13],
        ],
        straw,
        {},
        20,
      ),
      ...[0.36, 0.48].map((radius) =>
        hoop(
          radius,
          0.008,
          weave,
          { at: [0, 0.135 - (radius - 0.3) * 0.32, 0], turn: [quarter, 0, 0] },
          Math.PI * 2,
          0,
          3,
          18,
        ),
      ),
      turned(
        [
          [0.22, 0.1],
          [0.23, 0.28],
          [0.18, 0.37],
          [0, 0.4],
        ],
        straw,
        {},
        16,
      ),
      taper([0.232, 0.228], 0.07, ribbon, { at: [0, 0.16, 0] }, 16),
      // The bow tying the ribbon.
      ...mirrored((side) =>
        blob(
          [0.06, 0.04, 0.02],
          ribbon,
          { at: [0.06 * side, 0.17, 0.23], turn: [0, 0, 0.3 * side] },
          [6, 4],
        ),
      ),
      rod(0.015, 0.1, ribbon, { at: [0.03, 0.1, 0.235], turn: [0, 0, 0.3] }, 4),
    ],
  };
};

const raincoat = (): LabItemParts => {
  const yellow = "#f5c518";
  const fold = "#d9a90c";
  const toggle = "#2d3a6b";
  return {
    body: [
      turned(
        [
          [0.34, 0],
          [0.24, 0.6],
          [0.2, 0.72],
          [0.1, 0.8],
        ],
        yellow,
        { size: [1, 1, 0.65] },
        16,
      ),
      blob([0.18, 0.2, 0.17], yellow, { at: [0, 0.92, -0.03] }),
      blob([0.11, 0.13, 0.05], "#3b3326", { at: [0, 0.9, 0.11] }, [10, 6]),
      hoop(
        0.12,
        0.025,
        fold,
        { at: [0, 0.9, 0.12], size: [1, 1.15, 1] },
        Math.PI * 2,
        0,
        4,
        14,
      ),
      block([0.02, 0.72, 0.02], fold, {
        at: [0, 0.38, 0.19],
        turn: [-0.15, 0, 0],
      }),
      ...[0.18, 0.38, 0.58].map((y) =>
        rod(
          0.014,
          0.06,
          toggle,
          { at: [0, y, 0.21 - y * 0.12], turn: [0, 0, quarter] },
          4,
        ),
      ),
      ...mirrored((side) => [
        rod(
          0.065,
          0.42,
          yellow,
          { at: [0.26 * side, 0.5, 0], turn: [0, 0, 0.28 * side] },
          8,
        ),
        taper(
          [0.075, 0.075],
          0.05,
          fold,
          { at: [0.32 * side, 0.29, 0], turn: [0, 0, 0.28 * side] },
          8,
        ),
        block([0.14, 0.03, 0.04], fold, {
          at: [0.14 * side, 0.27, 0.17],
          turn: [-0.25, 0.4 * side, 0],
        }),
      ]),
    ],
  };
};

const shoeUpper = (
  colour: string,
  trim: string,
  lace: string,
  sole: string,
): ModelPart[] => [
  blob([0.42, 0.055, 0.17], sole, { at: [0, 0.05, 0] }),
  blob([0.38, 0.14, 0.15], colour, { at: [-0.02, 0.15, 0] }),
  blob([0.16, 0.1, 0.14], trim, { at: [0.25, 0.12, 0] }, [10, 6]),
  blob([0.13, 0.14, 0.15], trim, { at: [-0.29, 0.18, 0] }, [10, 6]),
  blob([0.12, 0.04, 0.09], "#3a3236", { at: [-0.18, 0.28, 0] }, [8, 5]),
  hoop(
    0.12,
    0.03,
    trim,
    { at: [-0.18, 0.28, 0], turn: [quarter, 0, 0], size: [1.1, 0.8, 1] },
    Math.PI * 2,
    0,
    4,
    12,
  ),
  blob(
    [0.07, 0.03, 0.08],
    colour,
    { at: [-0.04, 0.29, 0], turn: [0, 0, 0.6] },
    [6, 4],
  ),
  ...[-0.02, 0.06, 0.14].map((x) =>
    rod(
      0.013,
      0.15,
      lace,
      { at: [x, 0.29 - (x + 0.02) * 0.5, 0], turn: [quarter, 0, 0] },
      4,
    ),
  ),
];

const shoe = (): LabItemParts => ({
  body: tilted(
    shoeUpper("#e2463c", "#f2f2ec", "#ffffff", "#f2f2ec"),
    [0, -0.3, 0],
  ),
});

const trainer = (): LabItemParts => {
  const blue = "#3a7fd6";
  const tread = "#3a3e48";
  return {
    body: tilted(
      [
        ...shoeUpper("#f4f5f7", blue, blue, "#e9eaee"),
        ...mirrored((side) =>
          blob(
            [0.14, 0.045, 0.02],
            blue,
            { at: [0, 0.15, 0.145 * side], turn: [0, 0, 0.4] },
            [8, 4],
          ),
        ),
        // The patterned tread: rows of chevrons under the sole.
        ...[-0.3, -0.18, -0.06, 0.06, 0.18, 0.3].flatMap((x) =>
          mirrored((side) =>
            block([0.04, 0.025, 0.15], tread, {
              at: [x, 0.01, 0.065 * side],
              turn: [0, 0.5 * side, 0],
            }),
          ),
        ),
      ],
      [-0.3, -0.3, 0.1],
    ),
  };
};

const sock = (): LabItemParts => {
  const stripes = ["#e44d4d", "#f5f2e8", "#3d7fd1", "#f5f2e8"];
  return {
    body: [
      hoop(
        0.115,
        0.025,
        "#e44d4d",
        { at: [0, 0.82, 0], turn: [quarter, 0, 0] },
        Math.PI * 2,
        0,
        4,
        14,
      ),
      ...[0.74, 0.62, 0.5, 0.38, 0.26].map((y, index) =>
        taper(
          [0.115, 0.115],
          0.12,
          stripes[index % 4] ?? "#f5f2e8",
          { at: [0, y, 0] },
          14,
        ),
      ),
      blob([0.12, 0.13, 0.13], "#e44d4d", { at: [0, 0.14, -0.02] }),
      ...[0.1, 0.22, 0.34].map((z, index) =>
        taper(
          [0.115, 0.115],
          0.12,
          stripes[(index + 1) % 4] ?? "#f5f2e8",
          { at: [0, 0.12, z], turn: [quarter, 0, 0] },
          14,
        ),
      ),
      blob([0.115, 0.115, 0.1], "#e44d4d", { at: [0, 0.12, 0.4] }),
    ],
  };
};

const wellingtonBoot = (): LabItemParts => {
  const green = "#2f8f3e";
  const deep = "#257533";
  const sole = "#23262b";
  return {
    body: tilted(
      [
        taper(
          [0.17, 0.15],
          0.62,
          green,
          { at: [-0.1, 0.48, 0], size: [1, 1, 0.9] },
          14,
        ),
        hoop(
          0.17,
          0.025,
          deep,
          { at: [-0.1, 0.79, 0], turn: [quarter, 0, 0], size: [1, 0.9, 1] },
          Math.PI * 2,
          0,
          4,
          14,
        ),
        blob([0.32, 0.16, 0.15], green, { at: [0.05, 0.16, 0] }),
        blob([0.36, 0.05, 0.16], sole, { at: [0.06, 0.05, 0] }),
        block([0.12, 0.09, 0.28], sole, { at: [-0.18, 0.045, 0] }),
        // Deep grooves across the sole for grip.
        ...[-0.06, 0.04, 0.14, 0.24, 0.32].map((x) =>
          block([0.04, 0.04, 0.29], sole, { at: [x, 0.015, 0] }),
        ),
        block([0.02, 0.12, 0.06], deep, { at: [-0.27, 0.78, 0] }),
      ],
      [0, 0.3, 0],
    ),
  };
};

// ---------------------------------------------------------------- safety kit

const domeHeight = (
  x: number,
  z: number,
  radius: number,
  depth: number,
  height: number,
): number =>
  height *
  Math.sqrt(
    Math.max(0, 1 - (x * x) / (radius * radius) - (z * z) / (depth * depth)),
  );

const bikeHelmet = (): LabItemParts => {
  const shell = "#f2702a";
  const vent = "#2a2c33";
  return {
    body: [
      turned(
        [
          [0.34, 0],
          [0.33, 0.12],
          [0.28, 0.24],
          [0.17, 0.32],
          [0, 0.35],
        ],
        shell,
        { size: [1, 1, 1.3] },
        18,
      ),
      hoop(
        0.335,
        0.03,
        "#30333b",
        { at: [0, 0.01, 0], turn: [quarter, 0, 0], size: [1, 1.3, 1] },
        Math.PI * 2,
        0,
        4,
        18,
      ),
      ...[-0.17, -0.06, 0.06, 0.17].flatMap((x) =>
        [-0.18, 0.12].map((z) =>
          blob(
            [0.035, 0.03, 0.11],
            vent,
            {
              at: [x, domeHeight(x, z, 0.34, 0.44, 0.35) - 0.005, z],
              turn: [-z * 1.6, 0, x * 2.2],
            },
            [6, 4],
          ),
        ),
      ),
      blob(
        [0.24, 0.03, 0.1],
        shell,
        { at: [0, 0.14, 0.42], turn: [-0.25, 0, 0] },
        [10, 5],
      ),
      ...mirrored((side) =>
        tube(
          [
            [0.31 * side, 0.03, -0.05],
            [0.24 * side, -0.15, 0.05],
            [0.04 * side, -0.32, 0.06],
          ],
          0.015,
          "#30333b",
          8,
          4,
        ),
      ),
      block([0.09, 0.05, 0.03], "#2a2c33", { at: [0, -0.32, 0.06] }),
    ],
  };
};

const hardHat = (): LabItemParts => {
  const yellow = "#f6c41f";
  return {
    body: [
      turned(
        [
          [0.32, 0.02],
          [0.31, 0.16],
          [0.26, 0.28],
          [0.15, 0.37],
          [0, 0.39],
        ],
        yellow,
        { size: [1, 1, 1.15] },
        18,
      ),
      turned(
        [
          [0.3, 0.06],
          [0.38, 0.01],
          [0.39, 0.03],
          [0.31, 0.08],
        ],
        yellow,
        { size: [1, 1, 1.15] },
        18,
      ),
      blob(
        [0.22, 0.025, 0.13],
        yellow,
        { at: [0, 0.035, 0.38], turn: [-0.15, 0, 0] },
        [10, 5],
      ),
      // The raised ridge running front to back over the crown.
      hoop(
        0.375,
        0.035,
        "#eab308",
        { turn: [0, quarter, 0], size: [1.1, 1, 1] },
        half - 1.2,
        0.6,
        5,
        12,
      ),
      hoop(
        0.322,
        0.03,
        "#2f3138",
        { at: [0, 0.07, 0], turn: [quarter, 0, 0], size: [1, 1.15, 1] },
        Math.PI * 2,
        0,
        4,
        18,
      ),
    ],
  };
};

const bikeLight = (): LabItemParts => {
  const shell = "#2b2e35";
  const lens = "#b3262b";
  return {
    body: [
      blob([0.16, 0.3, 0.1], shell, { at: [0, 0.4, 0] }),
      blob([0.13, 0.25, 0.04], lens, { at: [0, 0.4, 0.07] }),
      ...[0.26, 0.34, 0.42, 0.5].map((y) =>
        blob(
          [0.11, 0.012, 0.02],
          "#d9464a",
          { at: [0, y + 0.02, 0.105] },
          [8, 3],
        ),
      ),
      disc(
        0.03,
        0.02,
        "#7c818c",
        { at: [0, 0.71, 0], turn: [quarter, 0, 0] },
        10,
      ),
      // The spring clip on the back, ready to grip a bike's seat post.
      block([0.12, 0.36, 0.03], "#7c818c", { at: [0, 0.42, -0.12] }),
      hoop(
        0.05,
        0.015,
        "#7c818c",
        { at: [0, 0.24, -0.17], turn: [0, quarter, 0] },
        half,
        half,
        4,
        8,
      ),
      block([0.12, 0.3, 0.025], "#7c818c", {
        at: [0, 0.39, -0.22],
        turn: [-0.08, 0, 0],
      }),
    ],
  };
};

const boosterSeat = (): LabItemParts => {
  const shell = "#3b3f48";
  const fabric = "#4a7fd0";
  const guide = "#e04a3a";
  return {
    body: [
      block([0.56, 0.16, 0.5], shell, { at: [0, 0.08, 0.02] }),
      blob([0.24, 0.06, 0.22], fabric, { at: [0, 0.18, 0.06] }),
      block([0.56, 0.72, 0.1], shell, {
        at: [0, 0.52, -0.22],
        turn: [-0.12, 0, 0],
      }),
      blob([0.22, 0.3, 0.05], fabric, {
        at: [0, 0.5, -0.16],
        turn: [-0.12, 0, 0],
      }),
      blob(
        [0.2, 0.09, 0.06],
        fabric,
        { at: [0, 0.8, -0.15], turn: [-0.12, 0, 0] },
        [10, 6],
      ),
      ...mirrored((side) => [
        block([0.06, 0.26, 0.24], shell, {
          at: [0.25 * side, 0.82, -0.12],
          turn: [-0.12, 0, 0],
        }),
        rod(
          0.04,
          0.32,
          shell,
          { at: [0.25 * side, 0.27, 0.02], turn: [quarter, 0, 0] },
          6,
        ),
        blob(
          [0.04, 0.03, 0.04],
          guide,
          { at: [0.2 * side, 0.29, 0.14] },
          [6, 4],
        ),
        block([0.04, 0.05, 0.04], guide, { at: [0.22 * side, 0.68, -0.15] }),
      ]),
    ],
  };
};

const stethoscope = (): LabItemParts => {
  const steel = "#c7ccd3";
  const tubing = "#c8343b";
  return {
    body: [
      disc(0.13, 0.05, steel, { at: [0, 0.14, 0.02], turn: [-0.3, 0, 0] }, 18),
      disc(
        0.1,
        0.02,
        "#e8ebef",
        { at: [0, 0.135, 0.05], turn: [-0.3, 0, 0] },
        16,
      ),
      rod(0.02, 0.06, steel, { at: [0, 0.28, 0.0] }, 6),
      tube(
        [
          [0, 0.3, 0],
          [0.06, 0.45, 0.03],
          [0.02, 0.6, 0.02],
          [0, 0.66, 0],
        ],
        0.025,
        tubing,
        12,
        6,
      ),
      blob([0.035, 0.03, 0.03], steel, { at: [0, 0.67, 0] }, [6, 4]),
      ...mirrored((side) => [
        tube(
          [
            [0, 0.67, 0],
            [0.08 * side, 0.74, 0],
            [0.13 * side, 0.84, 0],
          ],
          0.022,
          tubing,
          8,
          6,
        ),
        tube(
          [
            [0.13 * side, 0.84, 0],
            [0.18 * side, 0.98, 0],
            [0.16 * side, 1.08, -0.02],
            [0.11 * side, 1.13, -0.05],
          ],
          0.013,
          steel,
          10,
          5,
        ),
        blob(
          [0.03, 0.03, 0.035],
          "#2a2c33",
          { at: [0.1 * side, 1.14, -0.06] },
          [6, 4],
        ),
      ]),
    ],
  };
};

const binoculars = (): LabItemParts => {
  const black = "#2c2e33";
  const grip = "#474b54";
  return {
    body: [
      ...mirrored((side) => [
        taper(
          [0.13, 0.11],
          0.34,
          black,
          { at: [0.16 * side, 0.15, 0.1], turn: [quarter, 0, 0] },
          14,
        ),
        taper(
          [0.135, 0.135],
          0.14,
          grip,
          { at: [0.16 * side, 0.15, 0.08], turn: [quarter, 0, 0] },
          14,
        ),
        taper(
          [0.07, 0.08],
          0.14,
          black,
          { at: [0.15 * side, 0.15, -0.14], turn: [quarter, 0, 0] },
          12,
        ),
        hoop(
          0.06,
          0.015,
          grip,
          { at: [0.15 * side, 0.15, -0.21] },
          Math.PI * 2,
          0,
          4,
          12,
        ),
      ]),
      block([0.16, 0.06, 0.18], black, { at: [0, 0.22, 0.0] }),
      taper(
        [0.04, 0.04],
        0.07,
        grip,
        { at: [0, 0.26, -0.08], turn: [0, 0, quarter] },
        10,
      ),
    ],
    glass: mirrored((side) =>
      disc(0.11, 0.01, "#6fa8d6", { at: [0.16 * side, 0.15, 0.27] }, 14),
    ),
  };
};

const telescope = (): LabItemParts => {
  const white = "#f1f2f4";
  const dark = "#30333b";
  const tilt = 0.75;
  return {
    body: [
      ...[0, 2.09, 4.19].map((angle) => {
        const foot: Triple = [
          0.36 * Math.sin(angle),
          0,
          0.36 * Math.cos(angle),
        ];
        return tube(
          [[0, 0.55, 0], [foot[0] * 0.5, 0.28, foot[2] * 0.5], foot],
          0.018,
          dark,
          4,
          5,
        );
      }),
      blob([0.06, 0.05, 0.06], dark, { at: [0, 0.57, 0] }, [6, 4]),
      ...tilted(
        [
          taper([0.09, 0.08], 0.9, white, {}, 14),
          taper([0.1, 0.1], 0.14, white, { at: [0, 0.42, 0] }, 14),
          hoop(
            0.1,
            0.012,
            "#c9ccd3",
            { at: [0, 0.35, 0], turn: [quarter, 0, 0] },
            Math.PI * 2,
            0,
            3,
            14,
          ),
          taper([0.035, 0.03], 0.12, dark, { at: [0, -0.5, 0] }, 8),
          taper(
            [0.025, 0.025],
            0.1,
            dark,
            { at: [0, -0.4, 0.09], turn: [quarter, 0, 0] },
            8,
          ),
          taper([0.03, 0.03], 0.25, white, { at: [0.0, 0.1, 0.12] }, 8),
          block([0.08, 0.14, 0.08], dark, { at: [0, -0.05, -0.08] }),
        ],
        [tilt, 0, 0],
        [0, 0.66, 0.05],
      ),
    ],
    glass: tilted(
      [
        disc(
          0.085,
          0.01,
          "#7fb6e0",
          { at: [0, 0.48, 0], turn: [quarter, 0, 0] },
          14,
        ),
      ],
      [tilt, 0, 0],
      [0, 0.66, 0.05],
    ),
  };
};

// ---------------------------------------------------------------- sky

const onSphere = (latitude: number, longitude: number): Vector3 => {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  return new Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  );
};

const earth = (): LabItemParts => {
  const sea = "#2f74c9";
  const land = "#4f9a45";
  const desert = "#a98a52";
  const ice = "#f4f7fb";
  const centre = new Vector3(0, 1, 0);
  const patch = (
    latitude: number,
    longitude: number,
    width: number,
    height: number,
    colour: string,
    lift = 1,
  ): ModelPart => {
    const normal = onSphere(latitude, longitude);
    const at = normal.clone().multiplyScalar(lift).add(centre);
    return blob(
      [width, height, 0.05],
      colour,
      { at: [at.x, at.y, at.z], turn: facing(normal) },
      [7, 5],
    );
  };
  return {
    body: [
      blob([1, 1, 1], sea, { at: [0, 1, 0] }, [18, 12]),
      patch(5, 20, 0.24, 0.3, land),
      patch(20, 12, 0.3, 0.17, desert),
      patch(-15, 25, 0.17, 0.2, land),
      patch(50, 15, 0.2, 0.1, land),
      patch(55, 60, 0.32, 0.15, land),
      patch(45, 95, 0.35, 0.2, land),
      patch(25, 80, 0.13, 0.15, desert),
      patch(28, 110, 0.2, 0.15, land),
      patch(45, -100, 0.3, 0.22, land),
      patch(62, -110, 0.28, 0.12, land),
      patch(18, -98, 0.1, 0.12, land),
      patch(-8, -60, 0.22, 0.24, land),
      patch(-32, -65, 0.1, 0.17, desert),
      patch(-25, 135, 0.18, 0.12, desert),
      patch(72, -40, 0.13, 0.1, ice),
      patch(90, 0, 0.35, 0.35, ice),
      patch(-90, 0, 0.4, 0.4, ice),
      // Swirls of white cloud.
      patch(30, -20, 0.25, 0.04, "#ffffff", 1.02),
      patch(-20, -10, 0.22, 0.035, "#ffffff", 1.02),
      patch(10, 60, 0.2, 0.035, "#ffffff", 1.02),
      patch(-40, 80, 0.26, 0.04, "#ffffff", 1.02),
      patch(35, -150, 0.25, 0.04, "#ffffff", 1.02),
      patch(-5, 170, 0.2, 0.035, "#ffffff", 1.02),
    ],
  };
};

const stormCloud = (): LabItemParts => {
  const grey = "#5d6470";
  const dark = "#454b56";
  return {
    body: [
      ...[
        [-0.38, 0.62, 0, 0.24],
        [-0.12, 0.76, 0.02, 0.3],
        [0.2, 0.74, 0, 0.27],
        [0.42, 0.6, 0, 0.2],
        [0.02, 0.62, 0.12, 0.25],
        [0.05, 0.7, -0.14, 0.26],
      ].map(([x, y, z, radius]) =>
        blob([radius, radius, radius], grey, { at: [x, y, z] }),
      ),
      blob([0.6, 0.12, 0.26], dark, { at: [0, 0.5, 0] }),
      ...[
        [-0.38, 0.08],
        [-0.2, -0.05],
        [-0.02, 0.1],
        [0.16, -0.06],
        [0.34, 0.05],
        [-0.1, -0.15],
        [0.25, 0.15],
      ].map(([x, z], index) =>
        rod(
          0.018,
          0.12,
          "#7fb2e3",
          { at: [x, 0.25 - (index % 3) * 0.08, z], turn: [0, 0, 0.25] },
          4,
        ),
      ),
    ],
  };
};

const lightningBolt = (): LabItemParts => ({
  body: [
    slab(
      [
        [0.08, 0.45],
        [0.3, 0.45],
        [0.14, -0.05],
        [0.62, 0.62],
        [0.4, 0.62],
        [0.58, 1.0],
        [0.22, 1.0],
      ],
      0.12,
      "#ffe03a",
      {},
      0.03,
    ),
  ],
});

// ---------------------------------------------------------------- everyday things

const toothbrush = (): LabItemParts => {
  const handle = "#2bb3a8";
  return {
    body: tilted(
      [
        rod(0.045, 0.6, handle, { at: [0, 0.35, 0], size: [1, 1, 0.75] }, 8),
        blob([0.05, 0.12, 0.04], "#f5f5f5", { at: [0, 0.3, 0.02] }, [8, 5]),
        taper(
          [0.022, 0.03],
          0.22,
          handle,
          { at: [0, 0.78, 0], size: [1, 1, 0.75] },
          8,
        ),
        blob([0.045, 0.11, 0.03], handle, { at: [0, 0.96, 0] }, [8, 6]),
        ...[0.88, 0.93, 0.98, 1.03].flatMap((y) =>
          [-0.02, 0.02].map((x) =>
            rod(
              0.016,
              0.04,
              "#ffffff",
              { at: [x, y, 0.06], turn: [quarter, 0, 0] },
              5,
            ),
          ),
        ),
      ],
      [0, 0, -0.45],
    ),
  };
};

const shoppingBasket = (): LabItemParts => {
  const wire = "#c3c8cf";
  const grip = "#d9312b";
  const bottom: Triple = [0.3, 0, 0.2];
  const top: Triple = [0.36, 0.36, 0.25];
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const sideWires = [-0.66, -0.33, 0, 0.33, 0.66].flatMap((t) => [
    block([0.012, 0.37, 0.012], wire, {
      at: [
        lerp(bottom[0], top[0], 0.5) * t,
        0.18,
        lerp(bottom[2], top[2], 0.5),
      ],
      turn: [0.14, 0, 0],
    }),
    block([0.012, 0.37, 0.012], wire, {
      at: [
        lerp(bottom[0], top[0], 0.5) * t,
        0.18,
        -lerp(bottom[2], top[2], 0.5),
      ],
      turn: [-0.14, 0, 0],
    }),
  ]);
  const endWires = [-0.5, 0, 0.5].flatMap((t) =>
    mirrored((side) =>
      block([0.012, 0.37, 0.012], wire, {
        at: [
          lerp(bottom[0], top[0], 0.5) * side,
          0.18,
          lerp(bottom[2], top[2], 0.5) * t,
        ],
        turn: [0, 0, -0.17 * side],
      }),
    ),
  );
  const hoops = [0, 0.12, 0.24, 0.36].map((y) => {
    const t = y / 0.36;
    const x = lerp(bottom[0], top[0], t);
    const z = lerp(bottom[2], top[2], t);
    return hoop(
      1,
      y === 0.36 ? 0.012 : 0.007,
      wire,
      { at: [0, y, 0], turn: [quarter, 0, 0], size: [x * 1.06, z * 1.06, 1] },
      Math.PI * 2,
      Math.PI / 4,
      3,
      4,
    );
  });
  return {
    body: [
      ...sideWires,
      ...endWires,
      ...hoops,
      ...[-0.15, 0, 0.15].map((x) =>
        block([0.012, 0.012, 0.38], wire, { at: [x, 0.005, 0] }),
      ),
      block([0.58, 0.012, 0.012], wire, { at: [0, 0.005, 0] }),
      tube(
        [
          [-0.3, 0.36, 0],
          [-0.25, 0.62, 0],
          [0, 0.72, 0],
          [0.25, 0.62, 0],
          [0.3, 0.36, 0],
        ],
        0.012,
        wire,
        16,
        4,
      ),
      rod(0.03, 0.18, grip, { at: [0, 0.715, 0], turn: [0, 0, quarter] }, 8),
    ],
  };
};

const bucketAndSpade = (): LabItemParts => {
  const red = "#e0322b";
  const yellow = "#f6c71f";
  return {
    body: [
      turned(
        [
          [0, 0.02],
          [0.24, 0.02],
          [0.24, 0],
          [0.32, 0.5],
          [0.35, 0.52],
          [0.35, 0.56],
          [0.31, 0.56],
          [0.29, 0.5],
          [0.21, 0.06],
          [0, 0.06],
        ],
        red,
        {},
        18,
      ),
      ...[0.12, 0.24].map((y) =>
        hoop(
          0.255 + y * 0.16,
          0.012,
          "#c22620",
          { at: [0, y, 0], turn: [quarter, 0, 0] },
          Math.PI * 2,
          0,
          3,
          18,
        ),
      ),
      hoop(
        0.34,
        0.012,
        "#f5f5f5",
        { at: [0, 0.5, 0], turn: [-0.35, 0, 0] },
        half,
        0,
        4,
        14,
      ),
      rod(
        0.03,
        0.12,
        "#f5f5f5",
        { at: [0, 0.82, -0.115], turn: [-0.35, 0, quarter] },
        6,
      ),
      ...mirrored((side) =>
        blob(
          [0.03, 0.03, 0.03],
          "#c22620",
          { at: [0.345 * side, 0.5, 0] },
          [6, 4],
        ),
      ),
      // The spade leaning against the bucket.
      ...tilted(
        [
          rod(0.022, 0.55, yellow, { at: [0, 0.42, 0] }, 6),
          rod(
            0.022,
            0.12,
            yellow,
            { at: [0, 0.74, 0], turn: [0, 0, quarter] },
            6,
          ),
          blob([0.11, 0.14, 0.02], yellow, { at: [0, 0.05, 0] }, [10, 6]),
        ],
        [0.3, 0, -0.35],
        [0.32, 0.08, 0.25],
      ),
    ],
  };
};

const dogLead = (): LabItemParts => {
  const red = "#d62f2f";
  const steel = "#c4c9d0";
  return {
    body: [
      ...[
        [0.3, 0, 0],
        [0.29, 0.03, 0.4],
        [0.31, -0.03, -0.3],
        [0.28, 0.02, 0.8],
      ].map(([radius, x, spin], index) =>
        hoop(
          radius,
          0.032,
          red,
          {
            at: [x, 0.5, index * 0.025 - 0.04],
            turn: [0, 0.15 * (index - 1.5), spin],
          },
          Math.PI * 2,
          0,
          5,
          18,
        ),
      ),
      // The loop handle and the end hanging down to its clip.
      hoop(
        0.12,
        0.032,
        red,
        { at: [-0.05, 0.92, 0.0], size: [0.8, 1, 1] },
        Math.PI * 1.7,
        -0.6,
        5,
        12,
      ),
      tube(
        [
          [0.26, 0.4, 0.05],
          [0.4, 0.3, 0.08],
          [0.42, 0.18, 0.05],
        ],
        0.03,
        red,
        8,
        5,
      ),
      taper([0.05, 0.05], 0.07, steel, { at: [0.42, 0.13, 0.05] }, 8),
      hoop(
        0.07,
        0.02,
        steel,
        { at: [0.42, 0.03, 0.05], size: [0.6, 1, 1] },
        Math.PI * 2,
        0,
        4,
        10,
      ),
      rod(0.012, 0.09, steel, { at: [0.45, 0.03, 0.05] }, 4),
    ],
  };
};

const coin = (faces: ModelPart[]): ModelPart[] =>
  tilted(faces, [-0.25, 0.3, 0]);

const silver = "#c8ccd2";
const silverRaised = "#dfe3e8";

const fivePence = (): LabItemParts => ({
  body: coin([
    disc(0.5, 0.08, silver, {}, 28),
    hoop(
      0.46,
      0.025,
      silverRaised,
      { at: [0, 0, 0.04] },
      Math.PI * 2,
      0,
      3,
      24,
    ),
    // A thistle, raised on the face.
    blob([0.1, 0.09, 0.03], silverRaised, { at: [0, 0.02, 0.045] }, [8, 5]),
    ...[-0.5, -0.25, 0, 0.25, 0.5].map((angle) =>
      spike(
        0.025,
        0.14,
        silverRaised,
        {
          at: [Math.sin(angle) * 0.1, 0.13 + Math.cos(angle) * 0.04, 0.045],
          turn: [0, 0, -angle],
          size: [1, 1, 0.4],
        },
        4,
      ),
    ),
    rod(0.018, 0.2, silverRaised, { at: [0, -0.16, 0.045] }, 4),
    ...mirrored((side) =>
      blob(
        [0.09, 0.03, 0.015],
        silverRaised,
        { at: [0.07 * side, -0.16, 0.045], turn: [0, 0, 0.5 * side] },
        [6, 3],
      ),
    ),
  ]),
});

const tenPence = (): LabItemParts => ({
  body: coin([
    disc(0.5, 0.09, silver, {}, 28),
    hoop(
      0.46,
      0.025,
      silverRaised,
      { at: [0, 0, 0.045] },
      Math.PI * 2,
      0,
      3,
      24,
    ),
    // A crown, raised on the face.
    block([0.36, 0.1, 0.03], silverRaised, { at: [0, -0.08, 0.05] }),
    ...[-0.15, 0, 0.15].map((x) =>
      spike(
        0.06,
        0.18,
        silverRaised,
        { at: [x, 0.05, 0.05], size: [1, 1, 0.3] },
        4,
      ),
    ),
    ...[-0.15, 0, 0.15].map((x) =>
      blob([0.03, 0.03, 0.02], silverRaised, { at: [x, 0.16, 0.05] }, [5, 3]),
    ),
  ]),
});

const poundCoin = (): LabItemParts => {
  const gold = "#d9b13b";
  return {
    body: coin([
      disc(0.5, 0.1, gold, {}, 12),
      disc(0.32, 0.12, "#cfd3d9", {}, 24),
      hoop(
        0.32,
        0.015,
        "#e8c75a",
        { at: [0, 0, 0.055] },
        Math.PI * 2,
        0,
        3,
        24,
      ),
      // A small flower embossed on the silver centre.
      ...[0, 1, 2, 3].map((index) =>
        blob(
          [0.05, 0.08, 0.02],
          "#e6e9ed",
          {
            at: [
              0.07 * Math.sin((index * Math.PI) / 2),
              0.07 * Math.cos((index * Math.PI) / 2),
              0.06,
            ],
            turn: [0, 0, (-index * Math.PI) / 2],
          },
          [6, 4],
        ),
      ),
      blob([0.04, 0.04, 0.02], "#e8c75a", { at: [0, 0, 0.07] }, [6, 4]),
    ]),
  };
};

const romanCoin = (): LabItemParts => {
  const bronze = "#a0703a";
  const raised = "#c48f50";
  const leaf = "#7f8f45";
  return {
    body: coin([
      { ...disc(0.5, 0.07, bronze, {}, 16), roughen: 0.04 },
      {
        ...hoop(
          0.44,
          0.02,
          raised,
          { at: [0, 0, 0.035] },
          Math.PI * 2,
          0,
          3,
          16,
        ),
        roughen: 0.015,
      },
      // The emperor's head in profile, facing right, crowned with laurel.
      blob([0.17, 0.19, 0.03], raised, { at: [-0.03, 0.06, 0.04] }, [10, 6]),
      blob([0.07, 0.1, 0.03], raised, { at: [0.1, 0.0, 0.042] }, [7, 5]),
      blob(
        [0.035, 0.05, 0.02],
        raised,
        { at: [0.16, 0.03, 0.05], turn: [0, 0, -0.4] },
        [5, 3],
      ),
      blob([0.04, 0.035, 0.02], raised, { at: [0.11, -0.1, 0.05] }, [5, 3]),
      blob(
        [0.09, 0.13, 0.025],
        raised,
        { at: [-0.04, -0.17, 0.04], turn: [0, 0, -0.2] },
        [7, 4],
      ),
      ...[-2.4, -1.9, -1.4, -0.9, -0.4].map((angle) =>
        blob(
          [0.05, 0.022, 0.015],
          leaf,
          {
            at: [
              -0.03 + 0.17 * Math.cos(angle + half),
              0.06 + 0.19 * Math.sin(angle + half),
              0.07,
            ],
            turn: [0, 0, angle + half + quarter],
          },
          [5, 3],
        ),
      ),
      ...[
        [0.3, -0.25],
        [-0.32, 0.2],
        [0.15, 0.35],
      ].map(([x, y]) =>
        blob([0.06, 0.04, 0.012], "#6f9a7a", { at: [x, y, 0.035] }, [6, 3]),
      ),
    ]),
  };
};

const clock = (): LabItemParts => {
  const rim = "#d9473b";
  const hand = "#25262c";
  return {
    body: tilted(
      [
        disc(0.5, 0.08, "#fbfaf6", {}, 28),
        hoop(0.5, 0.06, rim, {}, Math.PI * 2, 0, 6, 28),
        ...Array.from({ length: 12 }, (_, index) => {
          const angle = (index * Math.PI) / 6;
          const isQuarter = index % 3 === 0;
          const length = isQuarter ? 0.1 : 0.05;
          const distance = 0.4 - length / 2;
          return block([isQuarter ? 0.04 : 0.025, length, 0.02], "#3a3b42", {
            at: [distance * Math.sin(angle), distance * Math.cos(angle), 0.045],
            turn: [0, 0, -angle],
          });
        }),
        // Both hands point straight up to 12.
        block([0.06, 0.22, 0.02], hand, { at: [0, 0.1, 0.06] }),
        block([0.035, 0.34, 0.02], hand, { at: [0, 0.16, 0.075] }),
        disc(0.04, 0.03, rim, { at: [0, 0, 0.09] }, 10),
      ],
      [-0.15, 0, 0],
      [0, 0.56, 0],
    ),
  };
};

const cottonWoolBall = (): LabItemParts => ({
  body: [
    ...[
      [0, 0.3, 0, 0.28],
      [0.17, 0.27, 0.08, 0.2],
      [-0.17, 0.28, 0.06, 0.2],
      [0.04, 0.42, 0.1, 0.19],
      [-0.06, 0.32, -0.14, 0.2],
    ].map(([x, y, z, radius]) => ({
      ...blob(
        [radius, radius * 0.95, radius],
        "#fdfdfb",
        { at: [x, y, z] },
        [14, 10],
      ),
      roughen: 0.012,
    })),
    // Wisps teased out of the ball.
    ...[
      [0.33, 0.24, 0.06, 0.4],
      [-0.33, 0.4, 0, -0.6],
    ].map(([x, y, z, spin]) => ({
      ...blob(
        [0.1, 0.035, 0.05],
        "#f6f6f2",
        { at: [x, y, z], turn: [0, 0, spin] },
        [8, 5],
      ),
      roughen: 0.008,
    })),
  ],
});

const drinkingStraw = (): LabItemParts => {
  const red = "#e23b3b";
  const white = "#fbfbf8";
  const radius = 0.035;
  const bendCentre = 0.12;
  const bendAt = 0.8;
  const bendRings = Array.from({ length: 7 }, (_, index) => {
    const angle = half - (index / 6) * (quarter - 0.3);
    const x = bendCentre + bendCentre * Math.cos(angle);
    const y = bendAt + bendCentre * Math.sin(angle);
    return hoop(
      radius,
      0.012,
      index % 2 === 0 ? red : white,
      { at: [x, y, 0], turn: [-quarter, half - angle, 0] },
      Math.PI * 2,
      0,
      3,
      10,
    );
  });
  const endAngle = half - (quarter - 0.3);
  const lean = half - endAngle;
  const endX = bendCentre + bendCentre * Math.cos(endAngle);
  const endY = bendAt + bendCentre * Math.sin(endAngle);
  return {
    body: [
      ...Array.from({ length: 8 }, (_, index) =>
        taper(
          [radius, radius],
          0.1,
          index % 2 === 0 ? red : white,
          { at: [0, 0.05 + index * 0.1, 0] },
          10,
        ),
      ),
      ...bendRings,
      ...[0, 1, 2].map((index) =>
        taper(
          [radius, radius],
          0.1,
          index % 2 === 0 ? white : red,
          {
            at: [
              endX + Math.sin(lean) * (0.05 + index * 0.1),
              endY + Math.cos(lean) * (0.05 + index * 0.1),
              0,
            ],
            turn: [0, 0, -lean],
          },
          10,
        ),
      ),
    ],
  };
};

const brick = (): LabItemParts => {
  const red = "#c4532f";
  return {
    body: [
      block([0.86, 0.26, 0.41], red, { at: [0, 0.13, 0] }),
      ...[-0.25, 0, 0.25].map((x) =>
        disc(
          0.07,
          0.01,
          "#5a1f14",
          { at: [x, 0.262, 0], turn: [quarter, 0, 0] },
          10,
        ),
      ),
      ...[
        [-0.3, 0.08],
        [0.12, 0.17],
        [0.33, 0.06],
        [-0.08, 0.05],
        [0.22, 0.2],
      ].map(([x, y]) =>
        blob([0.025, 0.018, 0.01], "#8f3322", { at: [x, y, 0.205] }, [5, 3]),
      ),
    ],
  };
};

const seed = (): LabItemParts => {
  const brown = "#8a5a32";
  return {
    body: tilted(
      [
        blob([0.36, 0.21, 0.17], brown, {}, [14, 10]),
        blob([0.2, 0.06, 0.08], brown, { at: [0, -0.16, 0] }, [10, 5]),
        // The pale scar where the seed joined its pod.
        blob([0.08, 0.035, 0.04], "#efe2c4", { at: [0, -0.1, 0.15] }, [8, 4]),
      ],
      [0.35, 0, 0],
    ),
  };
};

const sunglasses = (): LabItemParts => {
  const frame = "#1f2026";
  return {
    body: [
      ...mirrored((side) => [
        hoop(
          0.17,
          0.03,
          frame,
          { at: [0.22 * side, 0.3, 0], size: [1, 0.78, 1] },
          Math.PI * 2,
          0,
          5,
          18,
        ),
        blob(
          [0.16, 0.125, 0.02],
          "#2a3442",
          { at: [0.22 * side, 0.3, 0] },
          [12, 6],
        ),
        // A bright glint across each dark lens.
        blob(
          [0.05, 0.018, 0.01],
          "#9fb3c9",
          { at: [0.22 * side + 0.05, 0.36, 0.02], turn: [0, 0, 0.5] },
          [6, 3],
        ),
        rod(
          0.022,
          0.5,
          frame,
          { at: [0.4 * side, 0.34, -0.26], turn: [quarter, 0, 0] },
          5,
        ),
        rod(
          0.022,
          0.1,
          frame,
          { at: [0.4 * side, 0.3, -0.53], turn: [0.6, 0, 0] },
          5,
        ),
      ]),
      hoop(0.06, 0.025, frame, { at: [0, 0.35, 0] }, half, 0, 4, 8),
    ],
  };
};

export const peopleClothesBodyMiscBuilders = {
  baby,
  boy,
  child,
  ear,
  eye,
  nose,
  tongue,
  ribcage,
  skeleton,
  skull,
  dress,
  hat,
  raincoat,
  shirt,
  shoe,
  trainer,
  skirt,
  sock,
  "sun-hat": sunHat,
  sunglasses,
  "t-shirt": tShirt,
  trousers,
  "wellington-boot": wellingtonBoot,
  "bike-helmet": bikeHelmet,
  "bike-light": bikeLight,
  "booster-seat": boosterSeat,
  "hard-hat": hardHat,
  stethoscope,
  binoculars,
  telescope,
  earth,
  "storm-cloud": stormCloud,
  "lightning-bolt": lightningBolt,
  toothbrush,
  "shopping-basket": shoppingBasket,
  "bucket-and-spade": bucketAndSpade,
  "dog-lead": dogLead,
  "five-pence-coin": fivePence,
  "ten-pence-coin": tenPence,
  "pound-coin": poundCoin,
  "roman-coin": romanCoin,
  clock,
  "cotton-wool-ball": cottonWoolBall,
  "drinking-straw": drinkingStraw,
  brick,
  seed,
} satisfies Record<string, () => LabItemParts>;
