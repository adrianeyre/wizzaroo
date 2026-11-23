import {
  CatmullRomCurve3,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Path,
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
  ring,
  rod,
  spike,
  taper,
  turned,
  type LabItemParts,
} from "./lab-item-parts.js";

// Each item faces +z, stands on y = 0 and is about one unit tall.

const quarter = Math.PI / 2;
const fullTurn = Math.PI * 2;

const steel = "#c9ced5";
const steelDark = "#8f969e";
const steelBright = "#e6eaee";
const china = "#f7f5ef";
const clearGlass = "#e2f3f8";
const clearPlastic = "#dff0fa";
const wood = "#b67a44";
const woodDark = "#87552c";
const blackPlastic = "#2a2c31";

interface Place {
  at?: Triple;
  turn?: Triple;
  size?: Triple;
}

type Outline = readonly (readonly [number, number])[];

/** A thin torus, cheaper than `ring`, for wires, rims and smiles. */
const hoop = (
  radius: number,
  thickness: number,
  colour: string,
  { at, turn, size }: Place = {},
  arc = fullTurn,
  segments = 20,
): ModelPart => ({
  geometry: new TorusGeometry(radius, thickness, 4, segments, arc),
  colour,
  position: at,
  rotation: turn,
  scale: size,
  isSmooth: true,
});

/** A bendy tube through the given points, for handles, wires and straws. */
const tube = (
  points: readonly Triple[],
  radius: number,
  colour: string,
  segments = 14,
  sides = 6,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))),
    segments,
    radius,
    sides,
  ),
  colour,
  isSmooth: true,
});

/** A flat shape pushed out along z and centred on its depth. */
const extruded = (
  shape: Shape,
  depth: number,
  colour: string,
  { at, turn, size }: Place = {},
  bevel = 0,
  curveSegments = 3,
): ModelPart => {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  geometry.translate(0, 0, -depth / 2);
  return { geometry, colour, position: at, rotation: turn, scale: size };
};

const outlineShape = (points: Outline): Shape =>
  new Shape(points.map(([x, y]) => new Vector2(x, y)));

const roundedRect = (width: number, height: number, corner: number): Shape => {
  const across = width / 2 - corner;
  const up = height / 2 - corner;
  const shape = new Shape();
  shape.absarc(across, up, corner, 0, quarter, false);
  shape.absarc(-across, up, corner, quarter, Math.PI, false);
  shape.absarc(-across, -up, corner, Math.PI, Math.PI * 1.5, false);
  shape.absarc(across, -up, corner, Math.PI * 1.5, fullTurn, false);
  return shape;
};

/** A box with softly rounded corners and edges, like a sponge or a bag. */
const slab = (
  [width, height, depth]: Triple,
  corner: number,
  colour: string,
  place: Place = {},
): ModelPart => {
  const bevel = Math.min(corner * 0.5, depth * 0.2);
  return extruded(
    roundedRect(width - bevel * 2, height - bevel * 2, corner),
    depth - bevel * 2,
    colour,
    place,
    bevel,
  );
};

/** A round disc facing the camera. */
const disc = (
  radius: number,
  depth: number,
  colour: string,
  at: Triple,
  sides = 20,
): ModelPart =>
  taper([radius, radius], depth, colour, { at, turn: [quarter, 0, 0] }, sides);

/**
 * Turns and moves a whole group of parts together, such as tipping a plate
 * up towards the camera, by baking each part's own placement first.
 */
const placeAll = (
  parts: ModelPart[],
  turn: Triple,
  at: Triple = [0, 0, 0],
): ModelPart[] => {
  const group = new Matrix4().compose(
    new Vector3(...at),
    new Quaternion().setFromEuler(new Euler(...turn)),
    new Vector3(1, 1, 1),
  );
  return parts.map(
    ({
      geometry,
      colour,
      position = [0, 0, 0],
      rotation = [0, 0, 0],
      scale = 1,
      isSmooth,
    }) => {
      const stretch =
        typeof scale === "number"
          ? new Vector3(scale, scale, scale)
          : new Vector3(...scale);
      const local = new Matrix4().compose(
        new Vector3(...position),
        new Quaternion().setFromEuler(new Euler(...rotation)),
        stretch,
      );
      geometry.applyMatrix4(new Matrix4().multiplyMatrices(group, local));
      return { geometry, colour, isSmooth };
    },
  );
};

/** Points spaced evenly round a circle in the xz plane. */
const around = (count: number, radius: number, start = 0): [number, number][] =>
  Array.from({ length: count }, (_, index) => {
    const angle = start + (index / count) * fullTurn;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });

/** A steady pseudo-random number in [0, 1), so a model is the same each time. */
const jitter = (index: number, salt: number): number => {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
};

/** A white streak of light down the front of a glass or clear plastic body. */
const glint = (
  radius: number,
  y: number,
  height: number,
  angle = -0.55,
): ModelPart =>
  block([0.035, height, 0.01], "#ffffff", {
    at: [Math.sin(angle) * radius, y, Math.cos(angle) * radius],
    turn: [0, angle, 0],
  });

const saucer = (colour: string, radius: number): ModelPart =>
  turned(
    [
      [0, 0],
      [radius * 0.8, 0.005],
      [radius, 0.055],
      [radius * 0.97, 0.07],
      [radius * 0.72, 0.035],
      [0, 0.03],
    ],
    colour,
    {},
    24,
  );

const bakingTray = (): LabItemParts => {
  const tray = "#3a3e45";
  const cookie = "#d8a257";
  const tin = [
    block([1.2, 0.035, 0.84], tray, { at: [0, 0.018, 0] }),
    ...mirrored((side) => [
      block([1.26, 0.1, 0.04], tray, {
        at: [0, 0.05, 0.43 * side],
        turn: [0.25 * side, 0, 0],
      }),
      block([0.04, 0.1, 0.88], tray, {
        at: [0.62 * side, 0.05, 0],
        turn: [0, 0, -0.25 * side],
      }),
    ]),
    // Freshly baked cookies, so it reads as an oven tray.
    ...[-0.38, 0, 0.38].flatMap((x) =>
      [-0.18, 0.18].flatMap((z, row) => [
        blob([0.13, 0.03, 0.13], cookie, { at: [x, 0.05, z] }, [10, 5]),
        ...[0, 1].map((chip) =>
          blob(
            [0.022, 0.014, 0.022],
            "#4a2a17",
            {
              at: [
                x + (chip === 0 ? -0.04 : 0.05),
                0.078,
                z + (chip === row ? 0.04 : -0.03),
              ],
            },
            [5, 3],
          ),
        ),
      ]),
    ),
  ];
  return { body: placeAll(tin, [0.75, 0, 0]) };
};

const coffeeCup = (): LabItemParts => {
  const cup = "#fbfaf6";
  return {
    body: [
      saucer(cup, 0.5),
      turned(
        [
          [0, 0.04],
          [0.15, 0.04],
          [0.19, 0.1],
          [0.24, 0.32],
          [0.255, 0.44],
          [0.235, 0.44],
          [0.22, 0.32],
          [0.175, 0.12],
          [0, 0.11],
        ],
        cup,
        {},
        20,
      ),
      taper([0.228, 0.228], 0.01, "#6a3c1f", { at: [0, 0.4, 0] }, 20),
      blob([0.15, 0.012, 0.15], "#b07a46", { at: [0, 0.405, 0] }, [12, 4]),
      hoop(0.085, 0.024, cup, { at: [0.29, 0.27, 0] }, fullTurn, 16),
    ],
    // A wisp of steam rising from the warm drink.
    glass: [
      tube(
        [
          [0, 0.44, 0],
          [0.05, 0.56, 0.02],
          [-0.04, 0.68, 0],
          [0.03, 0.8, -0.02],
          [-0.01, 0.9, 0],
        ],
        0.022,
        "#ffffff",
        16,
        5,
      ),
    ],
  };
};

const flatHandle = (x: number, colour: string): ModelPart =>
  rod(0.04, 0.4, colour, { at: [x, 0.25, 0], size: [1, 1, 0.4] }, 8);

const cutlery = (): LabItemParts => {
  const blade = steelBright;
  const knifeBlade = outlineShape([
    [-0.04, 0],
    [0.035, 0],
    [0.04, 0.38],
    [0.01, 0.5],
    [-0.04, 0.44],
  ]);
  const knife = [
    flatHandle(0, steel),
    extruded(knifeBlade, 0.014, blade, { at: [0, 0.46, 0] }),
  ];
  const fork = [
    flatHandle(0, steel),
    block([0.05, 0.12, 0.016], blade, { at: [0, 0.52, 0] }),
    blob([0.075, 0.06, 0.01], blade, { at: [0, 0.6, 0] }, [10, 5]),
    ...[-0.054, -0.018, 0.018, 0.054].map((x) =>
      block([0.022, 0.24, 0.016], blade, { at: [x, 0.74, 0] }),
    ),
  ];
  const spoon = [
    flatHandle(0, steel),
    block([0.04, 0.14, 0.016], blade, { at: [0, 0.52, 0] }),
    blob([0.1, 0.15, 0.03], blade, { at: [0, 0.72, 0] }, [12, 7]),
    blob([0.075, 0.11, 0.01], "#b9c0c8", { at: [0, 0.73, 0.022] }, [10, 5]),
  ];
  return {
    body: [
      ...placeAll(fork, [0, 0, 0.12], [-0.24, 0, 0]),
      ...placeAll(knife, [0, 0, 0], [0, 0, 0.02]),
      ...placeAll(spoon, [0, 0, -0.12], [0.24, 0, 0]),
    ],
  };
};

const dinnerPlate = (): LabItemParts => ({
  body: placeAll(
    [
      turned(
        [
          [0, 0],
          [0.3, 0],
          [0.34, 0.03],
          [0.37, 0.055],
          [0.52, 0.09],
          [0.55, 0.1],
          [0.53, 0.112],
          [0.37, 0.075],
          [0.31, 0.045],
          [0, 0.042],
        ],
        china,
        {},
        28,
      ),
      hoop(
        0.47,
        0.007,
        "#6f93c9",
        { at: [0, 0.091, 0], turn: [quarter, 0, 0] },
        fullTurn,
        28,
      ),
    ],
    [1.1, 0, 0],
  ),
});

const dishwasher = (): LabItemParts => {
  const cabinet = "#eceff2";
  const inside = "#a7b0b9";
  const wire = "#7d8791";
  const lowerRack = 0.2;
  return {
    body: [
      ...mirrored((side) =>
        block([0.04, 1.0, 0.7], cabinet, { at: [0.4 * side, 0.5, 0] }),
      ),
      block([0.84, 0.04, 0.7], cabinet, { at: [0, 0.98, 0] }),
      block([0.8, 0.94, 0.04], inside, { at: [0, 0.5, -0.33] }),
      block([0.8, 0.06, 0.7], inside, { at: [0, 0.07, 0] }),
      block([0.84, 0.13, 0.05], steelDark, { at: [0, 0.9, 0.34] }),
      ...[-0.3, -0.22, -0.14].map((x) =>
        blob([0.022, 0.022, 0.012], "#4a525b", { at: [x, 0.9, 0.37] }, [6, 4]),
      ),
      // The door folded right down, flat.
      block([0.8, 0.05, 0.78], steel, { at: [0, 0.075, 0.74] }),
      block([0.72, 0.02, 0.7], inside, { at: [0, 0.105, 0.74] }),
      block([0.3, 0.04, 0.04], steelDark, { at: [0, 0.06, 1.14] }),
      // The lower rack slid half out, full of plates.
      ...mirrored((side) => [
        block([0.02, 0.1, 0.62], wire, { at: [0.34 * side, lowerRack, 0.25] }),
        block([0.7, 0.1, 0.02], wire, {
          at: [0, lowerRack, (side + 1) * 0.31 - 0.06],
        }),
      ]),
      block([0.7, 0.015, 0.62], wire, { at: [0, lowerRack - 0.05, 0.25] }),
      ...[-0.25, -0.15, -0.05, 0.05, 0.15, 0.25].map((x, index) =>
        taper(
          [0.17, 0.17],
          0.02,
          index % 2 === 0 ? "#ffffff" : "#e9f1f6",
          { at: [x, lowerRack + 0.12, 0.25], turn: [0, 0, quarter - 0.12] },
          18,
        ),
      ),
      // Cups upside down on the top rack.
      block([0.7, 0.015, 0.55], wire, { at: [0, 0.62, -0.02] }),
      ...[-0.22, 0, 0.22].map((x) =>
        taper([0.06, 0.075], 0.13, "#e46b4f", { at: [x, 0.7, 0.05] }, 10),
      ),
    ],
  };
};

const eggBox = (): LabItemParts => {
  const pulp = "#bdb2a0";
  const pulpDark = "#a99d89";
  const spots = [-0.29, 0, 0.29].flatMap((x) =>
    [-0.14, 0.14].map((z): [number, number] => [x, z]),
  );
  return {
    body: [
      block([0.86, 0.14, 0.56], pulp, { at: [0, 0.07, 0] }),
      ...spots.map(([x, z]) =>
        blob([0.14, 0.12, 0.14], pulpDark, { at: [x, 0.12, z] }, [10, 6]),
      ),
      block([0.9, 0.05, 0.6], pulp, { at: [0, 0.24, 0] }),
      ...spots.map(([x, z]) =>
        blob([0.13, 0.12, 0.13], pulp, { at: [x, 0.26, z] }, [10, 6]),
      ),
      ...[-0.145, 0.145].map((x) =>
        spike(0.05, 0.12, pulpDark, { at: [x, 0.3, 0] }, 6),
      ),
      block([0.14, 0.09, 0.03], pulpDark, { at: [0, 0.2, 0.31] }),
    ],
  };
};

const fizzyDrink = (): LabItemParts => {
  const drink = "#ff9a1a";
  const fizz = "#fff3d2";
  const sideBubbles = Array.from({ length: 12 }, (_, index) => {
    const angle = -0.2 + jitter(index, 1) * 2.6;
    const y = 0.1 + jitter(index, 2) * 0.44;
    const radius = 0.266 + (y - 0.04) * 0.03;
    const size = 0.016 + jitter(index, 3) * 0.014;
    return blob(
      [size, size, size],
      fizz,
      { at: [Math.cos(angle) * radius, y, Math.sin(angle) * radius] },
      [5, 4],
    );
  });
  return {
    body: [
      // The drink fills the glass to its walls, so it shows bright through them.
      taper([0.279, 0.263], 0.54, drink, { at: [0, 0.31, 0] }, 20),
      ...sideBubbles,
      ...Array.from({ length: 9 }, (_, index) => {
        const angle = jitter(index, 4) * fullTurn;
        const spread = jitter(index, 5) * 0.2;
        return blob(
          [0.02, 0.02, 0.02],
          fizz,
          {
            at: [
              Math.cos(angle) * spread,
              0.6 + jitter(index, 6) * 0.14,
              Math.sin(angle) * spread,
            ],
          },
          [5, 4],
        );
      }),
      tube(
        [
          [0.06, 0.2, -0.06],
          [0.1, 0.6, -0.06],
          [0.12, 0.82, -0.06],
          [0.16, 0.88, -0.06],
          [0.26, 0.9, -0.06],
        ],
        0.022,
        "#ef5a7f",
        14,
        6,
      ),
    ],
    glass: [
      turned(
        [
          [0.276, 0.56],
          [0.28, 0.7],
          [0.26, 0.7],
          [0.257, 0.56],
        ],
        clearGlass,
        {},
        20,
      ),
      taper([0.262, 0.255], 0.04, clearGlass, { at: [0, 0.02, 0] }, 20),
      glint(0.285, 0.4, 0.46),
    ],
  };
};

const fridge = (): LabItemParts => {
  const white = "#f4f6f8";
  const inside = "#cdd8e0";
  const door = [
    block([0.7, 1.02, 0.07], white, { at: [0.35, 0, 0] }),
    block([0.56, 0.86, 0.02], "#e2e8ec", { at: [0.35, 0, -0.045] }),
    ...[-0.25, 0.1].map((y) =>
      block([0.56, 0.1, 0.08], "#dfe6eb", { at: [0.35, y, -0.08] }),
    ),
    rod(0.022, 0.32, steelDark, { at: [0.64, 0.2, 0.06] }, 6),
  ];
  return {
    body: [
      block([0.7, 1.52, 0.6], white, { at: [0, 0.8, -0.04] }),
      block([0.6, 0.96, 0.02], inside, { at: [0, 0.6, 0.265] }),
      ...[0.4, 0.72].map((y) =>
        block([0.6, 0.02, 0.06], "#f7fbff", { at: [0, y, 0.27] }),
      ),
      // A little food on the shelves.
      blob([0.06, 0.06, 0.06], "#e0443a", { at: [-0.15, 0.47, 0.26] }, [8, 6]),
      taper([0.05, 0.05], 0.2, "#4bb062", { at: [0.15, 0.52, 0.25] }, 8),
      block([0.14, 0.1, 0.06], "#f2c94c", { at: [-0.05, 0.79, 0.25] }),
      block([0.7, 0.46, 0.07], white, { at: [0, 1.33, 0.29] }),
      rod(0.022, 0.18, steelDark, { at: [0.29, 1.22, 0.35] }, 6),
      ...placeAll(door, [0, -0.55, 0], [-0.35, 0.58, 0.3]),
      ...[-0.28, 0.28].map((x) =>
        block([0.08, 0.04, 0.08], "#9aa1a8", { at: [x, 0.02, 0.15] }),
      ),
    ],
  };
};

const glassJar = (): LabItemParts => ({
  body: [
    taper([0.245, 0.25], 0.1, steel, { at: [0, 0.71, 0] }, 20),
    blob([0.235, 0.03, 0.235], steelBright, { at: [0, 0.76, 0] }, [14, 4]),
    ...around(16, 0.25).map(([x, z]) =>
      block([0.018, 0.08, 0.018], steelDark, {
        at: [x, 0.71, z],
        turn: [0, -Math.atan2(z, x), 0],
      }),
    ),
  ],
  glass: [
    turned(
      [
        [0, 0],
        [0.27, 0],
        [0.31, 0.05],
        [0.31, 0.5],
        [0.26, 0.6],
        [0.22, 0.63],
        [0.22, 0.67],
        [0, 0.67],
      ],
      clearGlass,
      {},
      20,
    ),
    // The thick glass base and threads, which catch the light.
    taper([0.3, 0.29], 0.05, "#bfe4ee", { at: [0, 0.03, 0] }, 20),
    hoop(0.225, 0.012, "#ffffff", { at: [0, 0.645, 0], turn: [quarter, 0, 0] }),
    glint(0.315, 0.3, 0.36),
    glint(0.315, 0.27, 0.2, -0.3),
  ],
});

const iceCreamCone = (): LabItemParts => {
  const waffle = "#dca862";
  const groove = "#b0773a";
  const height = 0.9;
  const top = 0.26;
  // The criss-cross lines of the waffle, wound round the cone both ways.
  const waffleLine = (start: number, twist: number): ModelPart =>
    tube(
      Array.from({ length: 7 }, (_, index): Triple => {
        const along = 0.08 + (index / 6) * 0.9;
        const angle = start + twist * along;
        const radius = top * along * 1.02;
        return [
          Math.cos(angle) * radius,
          along * height,
          Math.sin(angle) * radius,
        ];
      }),
      0.008,
      groove,
      10,
      3,
    );
  return {
    body: [
      spike(
        top,
        height,
        waffle,
        { at: [0, height / 2, 0], turn: [Math.PI, 0, 0] },
        18,
      ),
      ...around(6, 1).flatMap((_, index) => [
        waffleLine((index / 6) * fullTurn, 2.2),
        waffleLine((index / 6) * fullTurn, -2.2),
      ]),
      ring(top, 0.03, waffle, { at: [0, height, 0], turn: [quarter, 0, 0] }),
      taper(
        [top - 0.02, top - 0.02],
        0.01,
        "#b98142",
        { at: [0, height + 0.002, 0] },
        18,
      ),
    ],
  };
};

const kettle = (): LabItemParts => ({
  body: [
    taper([0.36, 0.37], 0.06, blackPlastic, { at: [0, 0.03, 0] }, 20),
    turned(
      [
        [0, 0.06],
        [0.31, 0.06],
        [0.33, 0.12],
        [0.33, 0.5],
        [0.29, 0.66],
        [0.2, 0.72],
        [0, 0.73],
      ],
      steel,
      {},
      20,
    ),
    hoop(0.18, 0.012, steelDark, { at: [0, 0.715, 0], turn: [quarter, 0, 0] }),
    blob([0.07, 0.05, 0.07], blackPlastic, { at: [0, 0.76, 0] }, [10, 6]),
    taper(
      [0.045, 0.1],
      0.22,
      steel,
      { at: [-0.37, 0.56, 0], turn: [0, 0, 0.85] },
      10,
    ),
    tube(
      [
        [0.26, 0.64, 0],
        [0.42, 0.66, 0],
        [0.5, 0.5, 0],
        [0.46, 0.26, 0],
        [0.31, 0.16, 0],
      ],
      0.045,
      blackPlastic,
      16,
      6,
    ),
    block([0.06, 0.04, 0.08], "#3c3f45", { at: [0.4, 0.13, 0] }),
  ],
});

const kitchenFoil = (): LabItemParts => {
  const foil = "#d9dee3";
  const shine = "#f7f9fb";
  const along: Place = { at: [0, 0.18, 0], turn: [0, 0, quarter] };
  return {
    body: [
      taper([0.18, 0.18], 1.0, foil, along, 20),
      taper([0.08, 0.08], 1.02, "#a98559", along, 12),
      taper([0.055, 0.055], 1.03, "#4f3c28", along, 10),
      block([0.98, 0.012, 0.32], foil, {
        at: [0, 0.012, 0.3],
        turn: [-0.05, 0, 0],
      }),
      block([0.98, 0.012, 0.32], foil, {
        at: [0, 0.012, 0.6],
        turn: [0.06, 0.02, 0],
      }),
      ...[0.25, 0.5, 0.68].map((z, index) =>
        block([0.5 - index * 0.1, 0.004, 0.03], shine, {
          at: [-0.15 + index * 0.18, 0.022, z],
          turn: [0, 0.3, 0],
        }),
      ),
      block([0.9, 0.035, 0.01], shine, {
        at: [0, 0.27, 0.15],
        turn: [-0.6, 0, 0],
      }),
    ],
  };
};

const kitchenScale = (): LabItemParts => {
  const casing = "#d9473f";
  const dialY = 0.24;
  const dialZ = 0.29;
  return {
    body: [
      slab([0.7, 0.44, 0.56], 0.08, casing, { at: [0, 0.22, 0] }),
      disc(0.19, 0.03, steel, [0, dialY, dialZ], 20),
      disc(0.165, 0.03, "#fbfaf4", [0, dialY, dialZ + 0.012], 20),
      ...Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * fullTurn;
        const isZero = index === 0;
        return block([0.012, isZero ? 0.04 : 0.024, 0.01], "#2b2b2b", {
          at: [
            Math.sin(angle) * 0.135,
            dialY + Math.cos(angle) * 0.135,
            dialZ + 0.03,
          ],
          turn: [0, 0, -angle],
        });
      }),
      // The pointer resting upright at nought: no reading.
      block([0.012, 0.13, 0.008], "#d62828", {
        at: [0, dialY + 0.06, dialZ + 0.034],
      }),
      blob(
        [0.022, 0.022, 0.012],
        "#2b2b2b",
        { at: [0, dialY, dialZ + 0.036] },
        [8, 4],
      ),
      taper([0.05, 0.07], 0.06, steelDark, { at: [0, 0.47, 0] }, 10),
      turned(
        [
          [0, 0],
          [0.28, 0],
          [0.36, 0.07],
          [0.38, 0.1],
          [0.35, 0.1],
          [0.27, 0.03],
          [0, 0.03],
        ],
        steel,
        { at: [0, 0.49, 0] },
        22,
      ),
    ],
  };
};

const lunchBag = (): LabItemParts => {
  const fabric = "#2f8f9d";
  const trim = "#1f5f69";
  return {
    body: [
      slab([0.72, 0.56, 0.4], 0.12, fabric, { at: [0, 0.28, 0] }),
      slab([0.5, 0.26, 0.06], 0.06, "#45aab8", { at: [0, 0.22, 0.2] }),
      block([0.36, 0.015, 0.01], trim, { at: [0, 0.35, 0.235] }),
      block([0.66, 0.03, 0.04], trim, { at: [0, 0.56, 0] }),
      block([0.03, 0.1, 0.02], steelDark, { at: [0.2, 0.52, 0.03] }),
      tube(
        [
          [-0.18, 0.55, 0],
          [-0.15, 0.72, 0],
          [0, 0.78, 0],
          [0.15, 0.72, 0],
          [0.18, 0.55, 0],
        ],
        0.03,
        trim,
        12,
        6,
      ),
    ],
  };
};

const lunchbox = (): LabItemParts => {
  const tub = "#2d8be0";
  const lid = "#55c04a";
  const clip = "#ffd23f";
  return {
    body: [
      slab([0.8, 0.54, 0.3], 0.1, tub, {
        at: [0, 0.15, 0],
        turn: [quarter, 0, 0],
      }),
      slab([0.84, 0.58, 0.1], 0.1, lid, {
        at: [0, 0.35, 0],
        turn: [quarter, 0, 0],
      }),
      ...mirrored((side) => [
        block([0.16, 0.16, 0.03], clip, { at: [0, 0.31, 0.3 * side] }),
        block([0.03, 0.16, 0.14], clip, { at: [0.43 * side, 0.31, 0] }),
      ]),
      block([0.6, 0.02, 0.36], "#6fd463", { at: [0, 0.405, 0] }),
    ],
  };
};

const measuringJug = (): LabItemParts => {
  const mark = "#d64545";
  const radiusAt = (y: number): number => 0.29 + ((y - 0.03) / 0.72) * 0.03;
  return {
    // The printed scale lines, with no numbers and no water.
    body: [0.15, 0.25, 0.35, 0.45, 0.55, 0.65].map((y, index) =>
      block([index % 2 === 0 ? 0.12 : 0.07, 0.012, 0.01], mark, {
        at: [index % 2 === 0 ? -0.02 : -0.045, y, radiusAt(y) + 0.004],
      }),
    ),
    glass: [
      turned(
        [
          [0, 0],
          [0.26, 0],
          [0.29, 0.03],
          [0.32, 0.75],
          [0.34, 0.79],
          [0.32, 0.8],
          [0.3, 0.75],
          [0.27, 0.05],
          [0, 0.05],
        ],
        clearPlastic,
        {},
        20,
      ),
      spike(0.1, 0.2, clearPlastic, {
        at: [-0.36, 0.76, 0],
        turn: [0, 0, quarter + 0.2],
        size: [0.35, 1, 1],
      }),
      tube(
        [
          [0.3, 0.68, 0],
          [0.46, 0.66, 0],
          [0.5, 0.45, 0],
          [0.44, 0.22, 0],
          [0.29, 0.17, 0],
        ],
        0.038,
        clearPlastic,
        14,
        6,
      ),
    ],
  };
};

const medicineSpoon = (): LabItemParts => {
  const white = "#f6f8fb";
  return {
    body: placeAll(
      [
        turned(
          [
            [0, 0],
            [0.1, 0.005],
            [0.155, 0.045],
            [0.175, 0.12],
            [0.16, 0.13],
            [0.14, 0.07],
            [0.09, 0.035],
            [0, 0.03],
          ],
          white,
          {},
          18,
        ),
        block([0.5, 0.025, 0.08], white, { at: [0.4, 0.11, 0] }),
        blob([0.04, 0.0125, 0.04], white, { at: [0.65, 0.11, 0] }, [8, 4]),
      ],
      [0.6, 0, 0],
    ),
  };
};

const milk = (): LabItemParts => ({
  body: [
    turned(
      [
        [0, 0.02],
        [0.185, 0.02],
        [0.185, 0.45],
        [0.15, 0.57],
        [0.085, 0.67],
        [0, 0.67],
      ],
      "#fcfcf8",
      {},
      18,
    ),
    taper([0.118, 0.118], 0.05, "#d5dbe1", { at: [0, 0.81, 0] }, 16),
    blob([0.11, 0.025, 0.11], "#eef1f4", { at: [0, 0.835, 0] }, [12, 4]),
  ],
  // Glass only where the bottle is empty, so the milk shows bright white.
  glass: [
    turned(
      [
        [0.2, 0.5],
        [0.16, 0.6],
        [0.1, 0.68],
        [0.095, 0.77],
        [0.11, 0.79],
        [0, 0.79],
      ],
      clearGlass,
      {},
      18,
    ),
    taper([0.2, 0.2], 0.03, clearGlass, { at: [0, 0.015, 0] }, 18),
  ],
});

const mixingBowl = (): LabItemParts => ({
  body: placeAll(
    [
      turned(
        [
          [0, 0],
          [0.2, 0],
          [0.22, 0.03],
          [0.4, 0.2],
          [0.48, 0.4],
          [0.5, 0.43],
          [0.47, 0.43],
          [0.44, 0.38],
          [0.36, 0.2],
          [0, 0.12],
        ],
        "#7fb6d8",
        {},
        24,
      ),
      taper([0.45, 0.45], 0.01, "#f3da86", { at: [0, 0.38, 0] }, 24),
      blob(
        [0.16, 0.035, 0.12],
        "#f6e29e",
        { at: [0.05, 0.39, -0.02], turn: [0, 0.5, 0] },
        [10, 5],
      ),
      blob([0.08, 0.025, 0.06], "#f6e29e", { at: [-0.14, 0.39, 0.12] }, [8, 4]),
    ],
    [0.35, 0, 0],
  ),
});

const mug = (): LabItemParts => {
  const glaze = "#e0483e";
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.22, 0],
          [0.24, 0.02],
          [0.25, 0.6],
          [0.232, 0.6],
          [0.222, 0.07],
          [0, 0.07],
        ],
        glaze,
        {},
        20,
      ),
      taper([0.215, 0.215], 0.01, "#f5ede2", { at: [0, 0.075, 0] }, 20),
      tube(
        [
          [0.22, 0.48, 0],
          [0.37, 0.48, 0],
          [0.42, 0.32, 0],
          [0.36, 0.16, 0],
          [0.22, 0.14, 0],
        ],
        0.042,
        glaze,
        14,
        6,
      ),
      ...[
        [0.1, 0.45],
        [-0.6, 0.3],
        [0.7, 0.22],
        [-0.25, 0.15],
        [0.35, 0.36],
        [-1.0, 0.48],
      ].map(([angle, y]) =>
        blob(
          [0.035, 0.035, 0.012],
          "#ffffff",
          {
            at: [Math.sin(angle) * 0.248, y, Math.cos(angle) * 0.248],
            turn: [0, angle, 0],
          },
          [8, 5],
        ),
      ),
    ],
  };
};

const ovenGlove = (): LabItemParts => {
  const cloth = "#d6453d";
  const stitch = "#9d2a24";
  const hand: Triple = [0.3, 0.42, 0.15];
  const handY = 0.62;
  const onSurface = (x: number, y: number, face: 1 | -1): Triple => {
    const inside = 1 - (x / hand[0]) ** 2 - ((y - handY) / hand[1]) ** 2;
    return [x, y, face * hand[2] * Math.sqrt(Math.max(inside, 0)) * 1.04];
  };
  // The quilting: diagonal stitched lines across both faces.
  const quiltLine = (offset: number, slope: 1 | -1, face: 1 | -1): ModelPart =>
    tube(
      Array.from({ length: 7 }, (_, index): Triple => {
        const y = 0.36 + (index / 6) * 0.48;
        const x = Math.max(
          -0.26,
          Math.min(0.26, slope * (y - handY) * 0.8 + offset),
        );
        return onSurface(x, y, face);
      }),
      0.008,
      stitch,
      10,
      3,
    );
  return {
    body: [
      blob(hand, cloth, { at: [0, handY, 0] }),
      blob(
        [0.1, 0.2, 0.12],
        cloth,
        { at: [0.29, 0.58, 0], turn: [0, 0, -0.65] },
        [10, 7],
      ),
      taper([0.27, 0.3], 0.24, "#f2ead8", { at: [0, 0.16, 0] }, 16),
      ring(0.29, 0.03, "#f2ead8", { at: [0, 0.04, 0], turn: [quarter, 0, 0] }),
      hoop(0.06, 0.012, "#f2ead8", { at: [-0.22, 0.04, 0] }, fullTurn, 12),
      ...[1, -1].flatMap((face) =>
        [-0.12, 0.12].flatMap((offset) => [
          quiltLine(offset, 1, face === 1 ? 1 : -1),
          quiltLine(offset, -1, face === 1 ? 1 : -1),
        ]),
      ),
    ],
  };
};

const paperTowel = (): LabItemParts => {
  const paper = "#fbfbf8";
  const rollY = 0.62;
  return {
    body: [
      taper(
        [0.22, 0.22],
        0.7,
        paper,
        { at: [0, rollY, 0], turn: [0, 0, quarter] },
        22,
      ),
      taper(
        [0.07, 0.07],
        0.72,
        "#b08a5c",
        { at: [0, rollY, 0], turn: [0, 0, quarter] },
        12,
      ),
      rod(0.035, 0.82, wood, { at: [0, rollY, 0], turn: [0, 0, quarter] }, 8),
      ...mirrored((side) => [
        blob(
          [0.05, 0.05, 0.05],
          woodDark,
          { at: [0.46 * side, rollY, 0] },
          [8, 6],
        ),
        block([0.04, rollY, 0.08], wood, {
          at: [0.43 * side, rollY / 2, -0.02],
        }),
      ]),
      block([0.96, 0.04, 0.34], wood, { at: [0, 0.02, -0.02] }),
      // The loose sheet hanging down the front.
      block([0.68, 0.42, 0.012], paper, {
        at: [0, rollY - 0.2, 0.225],
        turn: [0.06, 0, 0],
      }),
      block([0.68, 0.006, 0.016], "#c9ccd0", {
        at: [0, rollY - 0.26, 0.23],
        turn: [0.06, 0, 0],
      }),
      ...[-0.2, 0, 0.2].map((x) =>
        blob(
          [0.035, 0.035, 0.006],
          "#e6e8ea",
          { at: [x, rollY - 0.1, 0.236] },
          [6, 4],
        ),
      ),
    ],
  };
};

const plasticBottle = (): LabItemParts => ({
  body: [
    taper([0.075, 0.078], 0.08, "#2f7fd6", { at: [0, 0.86, 0] }, 14),
    hoop(
      0.085,
      0.012,
      "#2f7fd6",
      { at: [0, 0.8, 0], turn: [quarter, 0, 0] },
      fullTurn,
      14,
    ),
  ],
  glass: [
    turned(
      [
        [0, 0],
        [0.16, 0],
        [0.18, 0.04],
        [0.18, 0.2],
        [0.165, 0.25],
        [0.18, 0.3],
        [0.18, 0.55],
        [0.12, 0.7],
        [0.068, 0.78],
        [0.068, 0.83],
        [0, 0.83],
      ],
      clearPlastic,
      {},
      18,
    ),
    hoop(
      0.17,
      0.01,
      "#ffffff",
      { at: [0, 0.25, 0], turn: [quarter, 0, 0] },
      fullTurn,
      18,
    ),
    glint(0.185, 0.42, 0.24),
    glint(0.185, 0.12, 0.12),
  ],
});

const plasticCup = (): LabItemParts => ({
  body: [
    turned(
      [
        [0, 0],
        [0.17, 0],
        [0.18, 0.01],
        [0.25, 0.6],
        [0.27, 0.62],
        [0.25, 0.635],
        [0.235, 0.6],
        [0.165, 0.03],
        [0, 0.03],
      ],
      "#ff8a1f",
      {},
      20,
    ),
    hoop(0.228, 0.008, "#ffb35c", { at: [0, 0.45, 0], turn: [quarter, 0, 0] }),
  ],
});

const plasticSpoon = (): LabItemParts => {
  const white = "#fafafa";
  return {
    body: placeAll(
      [
        rod(0.045, 0.52, white, { at: [0, 0.3, 0], size: [1, 1, 0.35] }, 8),
        blob([0.12, 0.17, 0.035], white, { at: [0, 0.78, 0] }, [12, 7]),
        blob([0.09, 0.13, 0.012], "#e6e9ec", { at: [0, 0.79, 0.028] }, [10, 5]),
      ],
      [0, 0, -0.15],
    ),
  };
};

const porridgeBowl = (): LabItemParts => {
  const spoonWood = "#d6a66a";
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.22, 0],
          [0.24, 0.03],
          [0.4, 0.15],
          [0.46, 0.3],
          [0.47, 0.33],
          [0.44, 0.33],
          [0.42, 0.29],
          [0.36, 0.16],
          [0, 0.1],
        ],
        wood,
        {},
        22,
      ),
      hoop(
        0.43,
        0.008,
        woodDark,
        { at: [0, 0.22, 0], turn: [quarter, 0, 0] },
        fullTurn,
        24,
      ),
      blob([0.42, 0.05, 0.42], "#efe2c4", { at: [0, 0.27, 0] }, [14, 6]),
      blob([0.09, 0.02, 0.07], "#f6ecd6", { at: [-0.1, 0.31, 0.12] }, [8, 4]),
      // The wooden spoon resting in the porridge.
      blob(
        [0.07, 0.025, 0.1],
        spoonWood,
        { at: [0.04, 0.31, 0.02], turn: [0, 1.0, 0] },
        [10, 5],
      ),
      rod(
        0.032,
        0.55,
        spoonWood,
        { at: [0.3, 0.46, 0.05], turn: [0, 0, -0.95] },
        8,
      ),
    ],
  };
};

const saucepan = (): LabItemParts => ({
  body: [
    turned(
      [
        [0, 0],
        [0.32, 0],
        [0.34, 0.02],
        [0.34, 0.36],
        [0.36, 0.385],
        [0.33, 0.385],
        [0.315, 0.35],
        [0.315, 0.04],
        [0, 0.04],
      ],
      steel,
      {},
      24,
    ),
    taper([0.325, 0.325], 0.03, steelDark, { at: [0, 0.015, 0] }, 24),
    taper(
      [0.035, 0.05],
      0.14,
      steel,
      { at: [0.4, 0.3, 0], turn: [0, 0, quarter - 0.2] },
      8,
    ),
    rod(
      0.045,
      0.48,
      blackPlastic,
      { at: [0.7, 0.37, 0], turn: [0, 0, quarter - 0.2] },
      8,
    ),
    hoop(0.025, 0.008, steelDark, { at: [0.94, 0.42, 0] }, fullTurn, 10),
  ],
});

const sieve = (): LabItemParts => {
  const mesh = "#b4bec7";
  const wire = "#7c858e";
  const bowlOutline: Outline = [
    [0.02, 0],
    [0.14, 0.012],
    [0.25, 0.06],
    [0.33, 0.15],
    [0.37, 0.26],
    [0.38, 0.32],
  ];
  // The wires that cross the mesh from the rim to the bottom.
  const meridians = around(10, 1).map(([cos, sin]) =>
    tube(
      bowlOutline.map(([across, up]): Triple => [
        cos * across * 1.02,
        up - 0.004,
        sin * across * 1.02,
      ]),
      0.006,
      wire,
      8,
      3,
    ),
  );
  const latitudes = (
    [
      [0.2, 0.035],
      [0.29, 0.1],
      [0.35, 0.19],
      [0.375, 0.26],
    ] as const
  ).map(([radius, y]) =>
    hoop(
      radius,
      0.006,
      wire,
      { at: [0, y, 0], turn: [quarter, 0, 0] },
      fullTurn,
      18,
    ),
  );
  return {
    body: placeAll(
      [
        ...meridians,
        ...latitudes,
        ring(0.38, 0.022, steel, { at: [0, 0.32, 0], turn: [quarter, 0, 0] }),
        rod(
          0.025,
          0.42,
          steel,
          { at: [0.6, 0.34, 0], turn: [0, 0, quarter - 0.08] },
          8,
        ),
        hoop(
          0.04,
          0.012,
          steel,
          { at: [0.85, 0.36, 0], turn: [quarter, 0, 0] },
          fullTurn,
          10,
        ),
        block([0.08, 0.02, 0.03], steel, { at: [-0.41, 0.33, 0] }),
      ],
      [0.45, 0, 0],
    ),
    glass: placeAll([turned(bowlOutline, mesh, {}, 18)], [0.45, 0, 0]),
  };
};

const soupCan = (): LabItemParts => ({
  body: [
    taper([0.28, 0.28], 0.36, "#f4f1ea", { at: [0, 0.2, 0] }, 22),
    taper([0.28, 0.28], 0.36, "#d42a2a", { at: [0, 0.56, 0] }, 22),
    taper([0.282, 0.282], 0.03, "#f4f1ea", { at: [0, 0.66, 0] }, 22),
    ...[0.01, 0.75].map((y) =>
      taper([0.27, 0.27], 0.03, steel, { at: [0, y, 0] }, 22),
    ),
    ...[0.025, 0.74].map((y) =>
      hoop(
        0.272,
        0.014,
        steelDark,
        { at: [0, y, 0], turn: [quarter, 0, 0] },
        fullTurn,
        22,
      ),
    ),
    // The gold medallion on the front of the label.
    disc(0.08, 0.02, "#e2b341", [0, 0.38, 0.28], 16),
    hoop(0.08, 0.01, "#b8892a", { at: [0, 0.38, 0.29] }, fullTurn, 16),
  ],
});

const sponge = (): LabItemParts => {
  const yellow = "#fff06a";
  const hole = "#d9a91c";
  const size: Triple = [0.8, 0.34, 0.52];
  const pits = (
    count: number,
    salt: number,
    place: (u: number, v: number) => Triple,
    flat: Triple,
  ): ModelPart[] =>
    Array.from({ length: count }, (_, index) => {
      const grow = 0.7 + jitter(index, salt + 2) * 0.7;
      return blob(
        [flat[0] * grow, flat[1] * grow, flat[2] * grow],
        hole,
        { at: place(jitter(index, salt) - 0.5, jitter(index, salt + 1) - 0.5) },
        [5, 3],
      );
    });
  return {
    body: [
      slab(size, 0.06, yellow, { at: [0, size[1] / 2, 0] }),
      ...pits(
        14,
        10,
        (u, v) => [u * 0.68, size[1] / 2 + v * 0.24, size[2] / 2],
        [0.025, 0.02, 0.01],
      ),
      ...pits(
        12,
        20,
        (u, v) => [u * 0.68, size[1], v * 0.4],
        [0.025, 0.01, 0.02],
      ),
      ...pits(
        6,
        30,
        (u, v) => [size[0] / 2, size[1] / 2 + v * 0.24, u * 0.4],
        [0.01, 0.02, 0.025],
      ),
      ...pits(
        6,
        40,
        (u, v) => [-size[0] / 2, size[1] / 2 + v * 0.24, u * 0.4],
        [0.01, 0.02, 0.025],
      ),
    ],
  };
};

const sportsBottle = (): LabItemParts => {
  const plastic = "#3fbf6a";
  const cap = "#eef2f5";
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.18, 0],
          [0.2, 0.03],
          [0.2, 0.3],
          [0.17, 0.38],
          [0.2, 0.46],
          [0.2, 0.7],
          [0.18, 0.74],
          [0, 0.74],
        ],
        plastic,
        {},
        20,
      ),
      taper([0.17, 0.19], 0.1, cap, { at: [0, 0.79, 0] }, 20),
      taper([0.09, 0.12], 0.05, cap, { at: [0, 0.865, 0] }, 14),
      // The narrow spout, pulled up.
      taper([0.04, 0.05], 0.12, "#2f7fd6", { at: [0, 0.95, 0] }, 10),
      taper([0.026, 0.034], 0.05, "#2f7fd6", { at: [0, 1.03, 0] }, 10),
      hoop(
        0.172,
        0.012,
        "#2fa35a",
        { at: [0, 0.38, 0], turn: [quarter, 0, 0] },
        fullTurn,
        18,
      ),
    ],
  };
};

const drinkBottle = (): LabItemParts => {
  const plastic = "#ec5fa0";
  const cap = "#f5f5f5";
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.2, 0],
          [0.22, 0.03],
          [0.22, 0.66],
          [0.18, 0.74],
          [0.14, 0.78],
          [0, 0.78],
        ],
        plastic,
        {},
        20,
      ),
      taper([0.15, 0.15], 0.14, cap, { at: [0, 0.85, 0] }, 20),
      blob([0.15, 0.03, 0.15], cap, { at: [0, 0.92, 0] }, [14, 4]),
      // The grip ridges of the screw-on lid.
      ...around(18, 0.152).map(([x, z]) =>
        block([0.018, 0.12, 0.018], "#d9dde1", {
          at: [x, 0.85, z],
          turn: [0, -Math.atan2(z, x), 0],
        }),
      ),
      hoop(0.06, 0.016, cap, { at: [0, 0.97, 0] }, fullTurn, 12),
    ],
  };
};

const teaTowel = (): LabItemParts => {
  const cotton = "#f5f0e4";
  const stripe = "#c8383a";
  const blue = "#3c6fb0";
  const panel = (z: number): ModelPart[] => [
    block([0.62, 0.72, 0.016], cotton, { at: [0, 0.48, z] }),
    ...[0.18, 0.26, 0.7].map((y, index) =>
      block(
        [0.62, index === 1 ? 0.025 : 0.05, 0.02],
        index === 1 ? blue : stripe,
        { at: [0, y, z] },
      ),
    ),
  ];
  return {
    body: [
      rod(0.03, 0.95, woodDark, { at: [0, 0.86, 0], turn: [0, 0, quarter] }, 8),
      ...mirrored((side) => [
        blob([0.05, 0.05, 0.05], wood, { at: [0.52 * side, 0.86, 0] }, [8, 6]),
        block([0.04, 0.86, 0.06], wood, { at: [0.52 * side, 0.43, 0] }),
        block([0.08, 0.04, 0.4], wood, { at: [0.52 * side, 0.02, 0] }),
      ]),
      rod(0.045, 0.56, cotton, { at: [0, 0.86, 0], turn: [0, 0, quarter] }, 10),
      ...panel(0.04),
      ...panel(-0.04),
    ],
  };
};

const teacup = (): LabItemParts => {
  const gold = "#d9b24a";
  return {
    body: [
      saucer(china, 0.46),
      hoop(
        0.44,
        0.008,
        gold,
        { at: [0, 0.058, 0], turn: [quarter, 0, 0] },
        fullTurn,
        24,
      ),
      turned(
        [
          [0, 0.03],
          [0.1, 0.03],
          [0.12, 0.06],
          [0.16, 0.08],
          [0.26, 0.2],
          [0.3, 0.3],
          [0.28, 0.3],
          [0.24, 0.2],
          [0.14, 0.1],
          [0, 0.1],
        ],
        china,
        {},
        22,
      ),
      hoop(
        0.29,
        0.008,
        gold,
        { at: [0, 0.302, 0], turn: [quarter, 0, 0] },
        fullTurn,
        24,
      ),
      taper([0.265, 0.265], 0.01, "#b5763c", { at: [0, 0.265, 0] }, 22),
      hoop(0.07, 0.02, china, { at: [0.32, 0.2, 0] }, fullTurn, 14),
      // Little painted roses round the china.
      ...around(5, 0.235, 0.6).flatMap(([x, z], index) => {
        const angle = Math.atan2(x, z);
        return [
          blob(
            [0.03, 0.03, 0.01],
            index % 2 === 0 ? "#e0718f" : "#9a6fd0",
            {
              at: [x, 0.17, z],
              turn: [0, angle, 0],
            },
            [6, 4],
          ),
          blob(
            [0.022, 0.01, 0.008],
            "#5fa35a",
            {
              at: [
                x * 1.0 + Math.cos(angle) * 0.04,
                0.15,
                z - Math.sin(angle) * 0.04,
              ],
              turn: [0, angle, 0.5],
            },
            [5, 3],
          ),
        ];
      }),
    ],
  };
};

const tinCan = (): LabItemParts => ({
  body: [
    taper([0.28, 0.28], 0.52, "#2f6fc4", { at: [0, 0.31, 0] }, 22),
    ...[0.03, 0.59].map((y) =>
      taper([0.272, 0.272], 0.06, steel, { at: [0, y, 0] }, 22),
    ),
    ...[0.0, 0.62].map((y) =>
      hoop(
        0.272,
        0.016,
        steelDark,
        { at: [0, y, 0], turn: [quarter, 0, 0] },
        fullTurn,
        22,
      ),
    ),
    // The ridges pressed into the lid.
    ...[0.08, 0.15, 0.22].map((radius) =>
      hoop(
        radius,
        0.007,
        steelDark,
        { at: [0, 0.62, 0], turn: [quarter, 0, 0] },
        fullTurn,
        18,
      ),
    ),
    // A bowl of beans pictured on the label.
    blob([0.15, 0.1, 0.03], "#fbf8f0", { at: [0, 0.3, 0.27] }, [10, 6]),
    ...Array.from({ length: 9 }, (_, index) =>
      blob(
        [0.028, 0.018, 0.012],
        "#e2672a",
        {
          at: [
            -0.09 + (index % 5) * 0.045,
            0.31 + Math.floor(index / 5) * 0.035,
            0.3,
          ],
          turn: [0, 0, jitter(index, 7)],
        },
        [5, 3],
      ),
    ),
  ],
});

const wetCloth = (): LabItemParts => {
  const blue = "#2f86dc";
  const deep = "#1f62b0";
  const sag = (x: number): number => 0.3 + 0.35 * x * x;
  const strand = (phase: number, colour: string): ModelPart =>
    tube(
      Array.from({ length: 25 }, (_, index): Triple => {
        const along = index / 24;
        const x = -0.4 + along * 0.8;
        const angle = along * fullTurn * 2.2 + phase;
        return [x, sag(x) + 0.08 * Math.cos(angle), 0.08 * Math.sin(angle)];
      }),
      0.095,
      colour,
      34,
      6,
    );
  return {
    body: [
      strand(0, blue),
      strand(Math.PI, deep),
      // The bunched ends of the cloth, flaring out where it is gripped.
      ...mirrored((side) => [
        blob(
          [0.09, 0.17, 0.15],
          blue,
          {
            at: [0.46 * side, sag(0.46) + 0.01, 0],
            turn: [0, 0, -0.35 * side],
          },
          [10, 7],
        ),
        blob(
          [0.05, 0.12, 0.1],
          deep,
          {
            at: [0.53 * side, sag(0.53) + 0.03, 0.03],
            turn: [0.3, 0, -0.6 * side],
          },
          [8, 5],
        ),
      ]),
      // Glints of water shining on the twists.
      ...Array.from({ length: 8 }, (_, index) => {
        const x = -0.32 + index * 0.09;
        return blob(
          [0.03, 0.016, 0.014],
          "#eef8ff",
          {
            at: [x, sag(x) + 0.12, 0.07],
            turn: [0, 0, 0.6],
          },
          [6, 4],
        );
      }),
    ],
  };
};

const cerealBox = (): LabItemParts => {
  const card = "#e2483b";
  const front = 0.1;
  return {
    body: [
      block([0.56, 0.82, 0.2], card, { at: [0, 0.41, 0] }),
      block([0.48, 0.7, 0.01], "#ffe95c", { at: [0, 0.4, front] }),
      // A cartoon face beaming from the front.
      disc(0.12, 0.02, "#7cc46b", [0, 0.56, front + 0.01], 18),
      ...eyes([0.045, 0.59, front + 0.025], 0.02),
      hoop(
        0.06,
        0.01,
        "#1d1d1d",
        { at: [0, 0.56, front + 0.025], turn: [0, 0, -quarter - 0.9] },
        1.8,
        10,
      ),
      // A bowl of cereal flakes.
      blob(
        [0.16, 0.08, 0.02],
        "#ffffff",
        { at: [0, 0.2, front + 0.01] },
        [12, 6],
      ),
      block([0.33, 0.02, 0.02], "#3c78c8", { at: [0, 0.22, front + 0.02] }),
      ...Array.from({ length: 6 }, (_, index) =>
        blob(
          [0.03, 0.02, 0.01],
          "#e38b2c",
          {
            at: [
              -0.11 + index * 0.045,
              0.26 + (index % 2) * 0.02,
              front + 0.02,
            ],
            turn: [0, 0, index],
          },
          [5, 3],
        ),
      ),
      block([0.56, 0.01, 0.2], "#c43a2e", { at: [0, 0.8, 0] }),
    ],
  };
};

const chair = (): LabItemParts => ({
  body: [
    block([0.52, 0.06, 0.5], wood, { at: [0, 0.5, 0] }),
    ...[
      [0.22, 0.21],
      [-0.22, 0.21],
    ].map(([x, z]) =>
      taper([0.03, 0.025], 0.5, woodDark, { at: [x, 0.24, z] }, 8),
    ),
    ...mirrored((side) =>
      taper(
        [0.03, 0.03],
        1.06,
        woodDark,
        { at: [0.22 * side, 0.53, -0.21] },
        8,
      ),
    ),
    block([0.5, 0.1, 0.04], wood, { at: [0, 0.98, -0.21] }),
    ...[-0.1, 0, 0.1].map((x) =>
      block([0.04, 0.3, 0.03], wood, { at: [x, 0.76, -0.21] }),
    ),
    ...mirrored((side) =>
      block([0.025, 0.025, 0.42], woodDark, { at: [0.22 * side, 0.15, 0] }),
    ),
  ],
});

const table = (): LabItemParts => {
  const top = "#a86c38";
  return {
    body: [
      block([1.1, 0.06, 0.7], top, { at: [0, 0.65, 0] }),
      ...mirrored((side) => [
        block([0.96, 0.08, 0.03], woodDark, { at: [0, 0.58, 0.29 * side] }),
        block([0.03, 0.08, 0.56], woodDark, { at: [0.48 * side, 0.58, 0] }),
      ]),
      ...[
        [0.48, 0.29],
        [-0.48, 0.29],
        [0.48, -0.29],
        [-0.48, -0.29],
      ].map(([x, z]) =>
        taper([0.04, 0.03], 0.62, woodDark, { at: [x, 0.31, z] }, 8),
      ),
    ],
  };
};

const chestOfDrawers = (): LabItemParts => {
  const carcass = "#9b6236";
  const front = "#c48c53";
  const knob = "#d8b46a";
  const face = 0.225;
  const drawerFront = (y: number, out: number): ModelPart[] => [
    block([0.7, 0.22, 0.03], front, { at: [0, y, face + out] }),
    ...[-0.18, 0.18].map((x) =>
      blob(
        [0.025, 0.025, 0.025],
        knob,
        { at: [x, y, face + out + 0.025] },
        [8, 6],
      ),
    ),
  ];
  const opened = 0.2;
  return {
    body: [
      block([0.8, 0.82, 0.45], carcass, { at: [0, 0.47, 0] }),
      block([0.86, 0.04, 0.5], woodDark, { at: [0, 0.9, 0] }),
      ...mirrored((side) =>
        block([0.06, 0.06, 0.06], woodDark, { at: [0.36 * side, 0.03, 0.17] }),
      ),
      ...drawerFront(0.2, 0),
      ...drawerFront(0.74, 0),
      // The middle drawer pulled half way out.
      block([0.72, 0.22, 0.02], "#3a2414", { at: [0, 0.47, face - 0.005] }),
      ...drawerFront(0.47, opened),
      ...mirrored((side) =>
        block([0.02, 0.18, opened + 0.02], front, {
          at: [0.33 * side, 0.46, face + opened / 2],
        }),
      ),
      block([0.66, 0.02, opened], front, { at: [0, 0.38, face + opened / 2] }),
      blob(
        [0.14, 0.05, 0.08],
        "#4f7fc4",
        { at: [-0.12, 0.42, face + 0.1] },
        [8, 5],
      ),
      blob(
        [0.12, 0.05, 0.07],
        "#e8b23a",
        { at: [0.13, 0.42, face + 0.09] },
        [8, 5],
      ),
    ],
  };
};

const deskFan = (): LabItemParts => {
  const casing = "#eef1f4";
  const guard = "#c3cad1";
  const hubY = 0.78;
  const guardFront = 0.1;
  return {
    body: [
      turned(
        [
          [0, 0],
          [0.3, 0],
          [0.32, 0.03],
          [0.28, 0.07],
          [0, 0.08],
        ],
        casing,
        {},
        20,
      ),
      ...[-0.08, 0, 0.08].map((x) =>
        blob([0.03, 0.015, 0.03], "#9aa3ab", { at: [x, 0.075, 0.2] }, [6, 4]),
      ),
      taper([0.04, 0.05], 0.6, casing, { at: [0, 0.38, -0.08] }, 10),
      blob([0.13, 0.13, 0.17], casing, { at: [0, hubY, -0.14] }, [12, 8]),
      hoop(0.36, 0.012, guard, { at: [0, hubY, guardFront] }, fullTurn, 28),
      hoop(
        0.2,
        0.008,
        guard,
        { at: [0, hubY, guardFront + 0.02] },
        fullTurn,
        18,
      ),
      hoop(0.36, 0.012, guard, { at: [0, hubY, -0.04] }, fullTurn, 28),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * fullTurn;
        return block([0.012, 0.36, 0.012], guard, {
          at: [
            Math.sin(angle) * 0.18,
            hubY + Math.cos(angle) * 0.18,
            guardFront + 0.02,
          ],
          turn: [0, 0, -angle],
        });
      }),
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * fullTurn;
        return block([0.012, 0.012, 0.14], guard, {
          at: [
            Math.sin(angle) * 0.36,
            hubY + Math.cos(angle) * 0.36,
            guardFront - 0.07,
          ],
        });
      }),
      disc(0.05, 0.03, "#7cc3ee", [0, hubY, guardFront + 0.03], 14),
      blob([0.06, 0.06, 0.05], "#5aa9dc", { at: [0, hubY, 0.02] }, [10, 6]),
      // The three still blades.
      ...[0, 1, 2].map((index) => {
        const angle = (index / 3) * fullTurn + 0.3;
        return blob(
          [0.1, 0.17, 0.015],
          "#7cc3ee",
          {
            at: [Math.sin(angle) * 0.18, hubY + Math.cos(angle) * 0.18, 0.02],
            turn: [0, 0.35, -angle],
          },
          [10, 6],
        );
      }),
    ],
  };
};

const vacuumCleaner = (): LabItemParts => {
  const casing = "#8e4fc9";
  const trim = "#f5c518";
  const grey = "#5a6069";
  return {
    body: [
      slab([0.62, 0.12, 0.34], 0.05, grey, { at: [0, 0.07, 0.12] }),
      block([0.5, 0.02, 0.04], trim, { at: [0, 0.06, 0.3] }),
      ...mirrored((side) =>
        taper(
          [0.13, 0.13],
          0.06,
          "#2c2f35",
          { at: [0.24 * side, 0.14, -0.08], turn: [0, 0, quarter] },
          16,
        ),
      ),
      blob([0.2, 0.18, 0.18], casing, { at: [0, 0.24, -0.06] }, [12, 8]),
      taper([0.07, 0.09], 0.9, casing, { at: [0, 0.72, -0.12] }, 12),
      taper([0.15, 0.15], 0.05, casing, { at: [0, 0.37, 0.07] }, 18),
      taper([0.15, 0.15], 0.08, trim, { at: [0, 0.83, 0.07] }, 18),
      // The cyclone inside the clear bin.
      taper([0.1, 0.035], 0.3, "#b4bcc5", { at: [0, 0.63, 0.07] }, 14),
      hoop(
        0.12,
        0.02,
        "#8c8f94",
        { at: [0, 0.42, 0.07], turn: [quarter, 0, 0] },
        fullTurn,
        16,
      ),
      tube(
        [
          [0, 1.15, -0.12],
          [0, 1.28, -0.1],
          [0, 1.32, 0.02],
          [0, 1.22, 0.08],
          [0, 1.08, -0.06],
        ],
        0.035,
        casing,
        14,
        6,
      ),
      taper([0.04, 0.04], 0.2, trim, { at: [0, 1.25, -0.12] }, 10),
    ],
    glass: [taper([0.15, 0.15], 0.38, "#dfeef6", { at: [0, 0.6, 0.07] }, 18)],
  };
};

const smokeAlarm = (): LabItemParts => {
  const white = "#f3f3ef";
  return {
    body: placeAll(
      [
        turned(
          [
            [0, 0],
            [0.42, 0],
            [0.44, 0.04],
            [0.42, 0.1],
            [0.32, 0.16],
            [0.18, 0.19],
            [0, 0.2],
          ],
          white,
          {},
          24,
        ),
        ...around(12, 0.34).map(([x, z]) =>
          block([0.07, 0.02, 0.025], "#9ea3a8", {
            at: [x, 0.145, z],
            turn: [0, -Math.atan2(z, x), 0],
          }),
        ),
        taper([0.07, 0.08], 0.04, "#dcdcd6", { at: [0, 0.205, 0] }, 14),
        blob(
          [0.022, 0.012, 0.022],
          "#8a2d2d",
          { at: [0.16, 0.19, -0.1] },
          [6, 4],
        ),
      ],
      [1.25, 0, 0],
    ),
  };
};

const doorbell = (): LabItemParts => {
  const brick = "#b5543c";
  const mortar = "#d8cdbd";
  return {
    body: [
      block([0.8, 0.9, 0.06], mortar, { at: [0, 0.45, -0.05] }),
      ...[0, 1, 2, 3, 4, 5].flatMap((row) =>
        [-1, 0, 1, 2].map((column) =>
          block([0.24, 0.13, 0.04], brick, {
            at: [
              Math.max(
                -0.28,
                Math.min(0.28, column * 0.26 - (row % 2 === 0 ? 0.13 : 0.26)),
              ),
              0.08 + row * 0.15,
              -0.01,
            ],
          }),
        ),
      ),
      slab([0.3, 0.46, 0.06], 0.07, "#f4f4f0", { at: [0, 0.45, 0.04] }),
      disc(0.1, 0.03, "#c9ced4", [0, 0.4, 0.08], 18),
      disc(0.075, 0.05, "#f2c94c", [0, 0.4, 0.09], 18),
      // A little bell picture above the button.
      spike(
        0.05,
        0.08,
        "#9aa1a8",
        { at: [0, 0.58, 0.075], size: [1, 1, 0.3] },
        10,
      ),
      blob([0.015, 0.015, 0.01], "#9aa1a8", { at: [0, 0.535, 0.08] }, [6, 4]),
    ],
  };
};

const doorHandle = (): LabItemParts => {
  const paint = "#3f6fb0";
  const brass = steel;
  return {
    body: [
      block([0.7, 1.0, 0.05], paint, { at: [0, 0.5, -0.06] }),
      slab([0.16, 0.6, 0.03], 0.06, brass, { at: [0.18, 0.5, 0] }),
      disc(0.055, 0.05, steelBright, [0.18, 0.62, 0.035], 14),
      rod(
        0.03,
        0.34,
        steelBright,
        { at: [0.0, 0.62, 0.08], turn: [0, 0, quarter] },
        8,
      ),
      blob(
        [0.04, 0.035, 0.035],
        steelBright,
        { at: [-0.17, 0.62, 0.08] },
        [8, 6],
      ),
      // The keyhole below the lever.
      blob([0.022, 0.022, 0.01], "#1f2227", { at: [0.18, 0.4, 0.018] }, [8, 4]),
      block([0.018, 0.05, 0.01], "#1f2227", { at: [0.18, 0.375, 0.018] }),
    ],
  };
};

const windowPane = (): LabItemParts => {
  const frame = "#f7f7f5";
  return {
    body: [
      ...mirrored((side) => [
        block([0.06, 1.0, 0.08], frame, { at: [0.37 * side, 0.55, 0] }),
        block([0.8, 0.06, 0.08], frame, { at: [0, 0.55 + 0.47 * side, 0] }),
      ]),
      block([0.9, 0.05, 0.16], frame, { at: [0, 0.03, 0.04] }),
    ],
    glass: [
      block([0.7, 0.9, 0.015], "#bfe3f2", { at: [0, 0.55, 0] }),
      // Glints of light across the glass.
      block([0.05, 0.5, 0.02], "#ffffff", {
        at: [-0.12, 0.65, 0.01],
        turn: [0, 0, -0.6],
      }),
      block([0.025, 0.36, 0.02], "#ffffff", {
        at: [0.0, 0.6, 0.01],
        turn: [0, 0, -0.6],
      }),
    ],
  };
};

const mirror = (): LabItemParts => {
  const frame = "#e88fb4";
  const centreY = 0.78;
  return {
    body: [
      disc(0.32, 0.06, frame, [0, centreY, 0], 24),
      hoop(0.3, 0.025, "#f2b3cd", { at: [0, centreY, 0.03] }, fullTurn, 24),
      disc(0.27, 0.02, "#d9e4ec", [0, centreY, 0.035], 24),
      disc(0.2, 0.01, "#c6d6e3", [0.04, centreY - 0.04, 0.045], 20),
      // Reflections slanting across the silver glass.
      block([0.05, 0.3, 0.01], "#ffffff", {
        at: [-0.08, centreY + 0.06, 0.05],
        turn: [0, 0, -0.7],
      }),
      block([0.025, 0.2, 0.01], "#ffffff", {
        at: [0.02, centreY + 0.1, 0.05],
        turn: [0, 0, -0.7],
      }),
      taper([0.045, 0.035], 0.42, frame, { at: [0, 0.3, 0] }, 10),
      blob([0.05, 0.04, 0.05], frame, { at: [0, 0.08, 0] }, [8, 6]),
      taper([0.06, 0.045], 0.08, frame, { at: [0, 0.5, 0] }, 10),
    ],
  };
};

const umbrella = (): LabItemParts => {
  const canopy = "#d23c4a";
  return {
    body: [
      // Eight sides, so the folded fabric shows its creases.
      turned(
        [
          [0, 0.24],
          [0.03, 0.26],
          [0.1, 0.45],
          [0.12, 0.7],
          [0.09, 0.95],
          [0.03, 1.12],
          [0, 1.14],
        ],
        canopy,
        {},
        8,
      ),
      taper([0.125, 0.125], 0.06, "#1f2b52", { at: [0, 0.68, 0] }, 12),
      blob([0.025, 0.025, 0.015], steel, { at: [0, 0.68, 0.125] }, [6, 4]),
      spike(0.015, 0.14, steel, { at: [0, 1.2, 0] }, 6),
      rod(0.018, 0.12, steel, { at: [0, 0.2, 0] }, 6),
      tube(
        [
          [0, 0.18, 0],
          [0, 0.06, 0],
          [0.02, -0.04, 0],
          [0.09, -0.08, 0],
          [0.16, -0.04, 0],
          [0.17, 0.03, 0],
        ],
        0.03,
        woodDark,
        14,
        6,
      ),
    ],
  };
};

const keyParts = (colour: string): ModelPart[] => {
  const bow = new Shape();
  bow.absarc(0, 0, 0.2, 0, fullTurn, false);
  const hole = new Path();
  hole.absarc(0, 0, 0.07, 0, fullTurn, true);
  bow.holes.push(hole);
  const blade = outlineShape([
    [0.15, 0.05],
    [0.9, 0.05],
    [0.95, 0],
    [0.9, -0.045],
    [0.85, -0.045],
    [0.82, -0.13],
    [0.76, -0.13],
    [0.72, -0.045],
    [0.66, -0.045],
    [0.62, -0.15],
    [0.55, -0.15],
    [0.52, -0.045],
    [0.15, -0.045],
  ]);
  return [
    extruded(bow, 0.04, colour, {}, 0.012, 8),
    extruded(blade, 0.03, colour, {}, 0.008),
    block([0.06, 0.16, 0.05], colour, { at: [0.2, 0, 0] }),
    block([0.62, 0.015, 0.012], steelDark, { at: [0.55, 0.008, 0.024] }),
  ];
};

const key = (): LabItemParts => ({
  body: placeAll(keyParts(steel), [0, 0, 0.25]),
});

const keyRing = (): LabItemParts => ({
  body: [
    hoop(
      0.2,
      0.018,
      steelBright,
      { at: [0, 0.2, 0], turn: [0, quarter, 0] },
      fullTurn,
      24,
    ),
    ...placeAll(keyParts("#d8b46a"), [0, 0, -quarter], [0, 0.03, 0]),
  ],
});

const flowerVase = (): LabItemParts => {
  const stem = "#4d9a42";
  const flower = (
    top: Triple,
    lean: Triple,
    petal: string,
    middle: string,
  ): ModelPart[] => [
    tube(
      [[0, 0.1, 0], [top[0] * 0.4, 0.55, top[2] * 0.4], top],
      0.014,
      stem,
      6,
      4,
    ),
    ...placeAll(
      [
        ...around(5, 0.06).map(([x, y]) =>
          blob(
            [0.055, 0.035, 0.015],
            petal,
            { at: [x, y, 0], turn: [0, 0, Math.atan2(y, x)] },
            [6, 4],
          ),
        ),
        blob([0.03, 0.03, 0.025], middle, { at: [0, 0, 0.015] }, [6, 4]),
      ],
      lean,
      top,
    ),
  ];
  return {
    body: [
      ...flower([0, 1.0, 0.02], [-0.3, 0, 0], "#f2d23c", "#c9772a"),
      ...flower([-0.2, 0.88, 0.05], [-0.4, -0.4, 0.3], "#e2477a", "#f3d34a"),
      ...flower([0.2, 0.9, 0], [-0.4, 0.4, -0.3], "#ffffff", "#f2c230"),
      ...flower([0.05, 0.82, -0.18], [-0.9, 0, 0], "#9b6fd6", "#f3e2a0"),
      ...flower([0.02, 0.78, 0.2], [-0.2, 0, 0], "#ff8a3d", "#7a3f18"),
      ...mirrored((side) =>
        blob(
          [0.03, 0.1, 0.012],
          "#5fae4f",
          { at: [0.1 * side, 0.6, 0.04], turn: [0, 0, -0.7 * side] },
          [6, 4],
        ),
      ),
    ],
    glass: [
      turned(
        [
          [0, 0],
          [0.16, 0],
          [0.2, 0.05],
          [0.22, 0.25],
          [0.16, 0.45],
          [0.12, 0.52],
          [0.15, 0.58],
        ],
        "#c7e6f2",
        {},
        18,
      ),
    ],
  };
};

const sand = (): LabItemParts => {
  const shades = ["#e3bb66", "#d4a752", "#f0cd80", "#c89848"];
  return {
    body: [
      {
        ...turned(
          [
            [0, 0],
            [0.56, 0],
            [0.5, 0.05],
            [0.36, 0.25],
            [0.18, 0.4],
            [0, 0.45],
          ],
          "#e0b863",
          {},
          24,
        ),
        roughen: 0.12,
      },
      ...Array.from({ length: 28 }, (_, index) => {
        const angle = jitter(index, 50) * fullTurn;
        const reach = 0.5 + jitter(index, 51) * 0.22;
        const size = 0.02 + jitter(index, 52) * 0.016;
        return blob(
          [size, size * 0.8, size],
          shades[index % shades.length] ?? "#e0b863",
          {
            at: [Math.cos(angle) * reach, size * 0.7, Math.sin(angle) * reach],
          },
          [4, 3],
        );
      }),
    ],
  };
};

export const kitchenHomeBuilders = {
  "baking-tray": bakingTray,
  "coffee-cup": coffeeCup,
  cutlery,
  "dinner-plate": dinnerPlate,
  dishwasher,
  "egg-box": eggBox,
  "fizzy-drink": fizzyDrink,
  fridge,
  "glass-jar": glassJar,
  "ice-cream-cone": iceCreamCone,
  kettle,
  "kitchen-foil": kitchenFoil,
  "kitchen-scale": kitchenScale,
  "lunch-bag": lunchBag,
  lunchbox,
  "measuring-jug": measuringJug,
  "medicine-spoon": medicineSpoon,
  milk,
  "mixing-bowl": mixingBowl,
  mug,
  "oven-glove": ovenGlove,
  "paper-towel": paperTowel,
  "plastic-bottle": plasticBottle,
  "plastic-cup": plasticCup,
  "plastic-spoon": plasticSpoon,
  "porridge-bowl": porridgeBowl,
  saucepan,
  sieve,
  "soup-can": soupCan,
  sponge,
  "sports-bottle": sportsBottle,
  "drink-bottle": drinkBottle,
  "tea-towel": teaTowel,
  teacup,
  "tin-can": tinCan,
  "wet-cloth": wetCloth,
  "cereal-box": cerealBox,
  chair,
  table,
  "chest-of-drawers": chestOfDrawers,
  "desk-fan": deskFan,
  "vacuum-cleaner": vacuumCleaner,
  "smoke-alarm": smokeAlarm,
  doorbell,
  "door-handle": doorHandle,
  "window-pane": windowPane,
  mirror,
  umbrella,
  key,
  "key-ring": keyRing,
  "flower-vase": flowerVase,
  sand,
} satisfies Record<string, () => LabItemParts>;
