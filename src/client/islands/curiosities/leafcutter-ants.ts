import {
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const moundSoil = "#a0623a";
const cutSoil = "#c4824e";
const tunnelDark = "#4a2a18";
const fungus = "#efe6cf";
const antRed = "#8a2f1a";
const antDark = "#5a1e10";
const leafGreen = "#4caf50";
const leafDark = "#2e7d32";
const trailDirt = "#8a6a44";
const brass = "#c9a24a";
const lens = "#cfeaf2";
const signColour = "#7a3f1f";

const mound = { x: -0.9, z: -1.3 };
/** The mound's shape, radius against height, from its foot to its top. */
const moundProfile: readonly (readonly [number, number])[] = [
  [0, 0],
  [1.95, 0],
  [1.82, 0.32],
  [1.5, 0.72],
  [1.0, 1.02],
  [0.45, 1.17],
  [0, 1.2],
];
const opening = 1.1;
const plant = { x: 2.9, z: -1.6 };
const magnifierPivot: Triple = [1.4, 1.05, 0.85];
const soldierAt: Triple = [0.36, 0.05, 0.05];

/** The trail the ants follow, from the leafy plant to the nest's door. */
const trail: readonly [number, number][] = [
  [2.5, -1.1],
  [2.0, -0.4],
  [1.4, 0.1],
  [0.7, 0.35],
];

/** A cut face of the mound, in the vertical plane at `angle`, facing into the gap. */
const addCutFace = (builder: AttractionBuilder, angle: number) => {
  const shape = new Shape(
    moundProfile.map(([radius, height]) => new Vector2(radius, height)),
  );
  builder.add(
    "matte",
    cutSoil,
    new ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: false,
      curveSegments: 4,
    })
      .translate(0, 0, -0.02)
      .rotateY(angle - Math.PI / 2),
    { at: [mound.x, 0, mound.z] },
  );
  if (builder.isFar) {
    return;
  }
  /* Tunnels and chambers, with the fungus garden the ants grow on leaves */
  const outward = angle > 0 ? -1 : 1;
  const onFace = (along: number, height: number, out = 0.03): Triple => [
    mound.x + Math.sin(angle) * along + outward * Math.cos(angle) * out,
    height,
    mound.z + Math.cos(angle) * along - outward * Math.sin(angle) * out,
  ];
  const chambers: [number, number, number, number][] = [
    [0.6, 0.35, 0.26, 0.16],
    [1.2, 0.3, 0.2, 0.13],
    [0.5, 0.8, 0.2, 0.12],
    [1.0, 0.68, 0.16, 0.1],
  ];
  chambers.forEach(([along, height, wide, tall], index) => {
    builder.add("matte", tunnelDark, new SphereGeometry(1, 10, 6), {
      at: onFace(along, height, 0.01),
      rotation: [0, angle - Math.PI / 2, 0],
      scale: [wide, tall, 0.03],
    });
    builder.add("matte", fungus, new SphereGeometry(1, 8, 5), {
      at: onFace(along, height - tall * 0.25, 0.025),
      rotation: [0, angle - Math.PI / 2, 0],
      scale: [wide * 0.7, tall * 0.55, 0.03],
    });
    /* A tiny ant tending each garden */
    if (index % 2 === 0) {
      builder.sphere(
        "paint",
        antRed,
        0.03,
        onFace(along + wide * 0.5, height + tall * 0.3, 0.05),
        [1.6, 1, 1],
        6,
      );
    }
  });
  /* Tunnels joining the chambers up to the surface */
  const tunnels: [number, number, number, number][] = [
    [0.6, 0.35, 0.5, 0.8],
    [0.5, 0.8, 0.35, 1.15],
    [1.2, 0.3, 1.0, 0.68],
    [1.0, 0.68, 1.35, 0.88],
    [0.6, 0.35, 1.2, 0.3],
  ];
  tunnels.forEach(([fromAlong, fromHeight, toAlong, toHeight]) => {
    builder.bar(
      "matte",
      tunnelDark,
      onFace(fromAlong, fromHeight, 0.015),
      onFace(toAlong, toHeight, 0.015),
      0.07,
      4,
    );
  });
};

const buildMound = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    moundSoil,
    new LatheGeometry(
      moundProfile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(30),
      opening / 2,
      Math.PI * 2 - opening,
    ),
    { at: [mound.x, 0, mound.z] },
  );
  addCutFace(builder, opening / 2);
  addCutFace(builder, -opening / 2);
  if (builder.isFar) {
    return;
  }
  /* Doorways all over the mound, and loose crumbs of soil */
  [
    [2.0, 0.4],
    [2.6, 0.8],
    [3.4, 0.5],
    [4.3, 0.9],
    [5.2, 0.35],
  ].forEach(([turn, height]) => {
    const radius = height < 0.6 ? 1.72 : 1.28;
    builder.add("matte", tunnelDark, new SphereGeometry(1, 8, 4), {
      at: [
        mound.x + Math.sin(turn) * radius,
        height,
        mound.z + Math.cos(turn) * radius,
      ],
      rotation: [0, turn, 0],
      scale: [0.12, 0.09, 0.05],
    });
  });
  for (let crumb = 0; crumb < 10; crumb++) {
    const turn = 1.2 + crumb * 0.47;
    builder.sphere(
      "matte",
      crumb % 2 === 0 ? moundSoil : shade(moundSoil, 0.85),
      0.06 + (crumb % 3) * 0.02,
      [mound.x + Math.sin(turn) * 2.05, 0.03, mound.z + Math.cos(turn) * 2.05],
      [1, 0.6, 1],
      5,
    );
  }
};

/** A giant leaf, flat and broad, its tip turned out at `turn`. */
const addGiantLeaf = (
  builder: AttractionBuilder,
  base: Triple,
  turn: number,
  tilt: number,
  length: number,
  colour: string,
) => {
  builder.add(
    "matte",
    colour,
    new SphereGeometry(1, builder.segments(8, 4), builder.segments(4, 2)),
    {
      at: [
        base[0] + Math.sin(turn) * length * 0.5 * Math.cos(tilt),
        base[1] + Math.sin(tilt) * length * 0.5,
        base[2] + Math.cos(turn) * length * 0.5 * Math.cos(tilt),
      ],
      rotation: [-tilt, turn, 0],
      scale: [length * 0.32, 0.025, length * 0.5],
    },
  );
};

const buildPlant = (builder: AttractionBuilder) => {
  const { x, z } = plant;
  builder.cylinder("matte", "#5f7a2a", {
    radius: 0.08,
    radiusEnd: 0.05,
    length: 1.3,
    at: [x, 0.65, z],
    segments: 8,
  });
  const leaves = builder.isFar ? 3 : 7;
  for (let leaf = 0; leaf < leaves; leaf++) {
    const turn = (leaf / leaves) * Math.PI * 2;
    const height = 0.5 + (leaf % 3) * 0.35;
    addGiantLeaf(
      builder,
      [x, height, z],
      turn,
      0.15 - (leaf % 2) * 0.2,
      1.1,
      leaf % 2 === 0 ? leafGreen : leafDark,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Bites taken out of the leaves, where the ants cut their pieces */
  [0.4, 2.2, 4.1].forEach((turn, index) => {
    builder.add("matte", shade(leafGreen, 0.6), new SphereGeometry(1, 6, 3), {
      at: [
        x + Math.sin(turn) * 0.85,
        0.58 + index * 0.35 + 0.02,
        z + Math.cos(turn) * 0.85,
      ],
      rotation: [0, turn, 0],
      scale: [0.09, 0.02, 0.07],
    });
  });
};

/** One ant carrying a leaf piece high like a sail; it faces +z. */
const addAnt = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  isRich: boolean,
) => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const segments = isRich ? 8 : 5;
  builder.sphere(
    "paint",
    antRed,
    0.06,
    place(0, 0.08, -0.1),
    [0.9, 0.85, 1.3],
    segments,
  );
  builder.sphere(
    "paint",
    antRed,
    0.035,
    place(0, 0.08, 0),
    [1, 1, 1.4],
    segments,
  );
  builder.sphere(
    "paint",
    antDark,
    0.05,
    place(0, 0.09, 0.08),
    [1.05, 0.9, 0.95],
    segments,
  );
  /* Six legs, as three crossing pairs */
  [-0.04, 0, 0.04].forEach((along, index) => {
    builder.box("paint", antDark, [0.2, 0.012, 0.014], place(0, 0.045, along), [
      0,
      turn + (index - 1) * 0.35,
      0,
    ]);
  });
  /* The leaf piece, held in its jaws */
  builder.add("matte", leafGreen, new SphereGeometry(1, isRich ? 8 : 5, 3), {
    at: place(0, 0.2, 0.06),
    rotation: [0.2, turn, 0],
    scale: [0.11, 0.1, 0.012],
  });
  if (isRich) {
    [-1, 1].forEach((side) => {
      builder.bar(
        "paint",
        antDark,
        place(side * 0.02, 0.12, 0.11),
        place(side * 0.06, 0.18, 0.16),
        0.01,
        3,
      );
    });
  }
};

const buildTrail = (builder: AttractionBuilder) => {
  for (let index = 0; index < trail.length - 1; index++) {
    const [fromX, fromZ] = trail[index];
    const [toX, toZ] = trail[index + 1];
    builder.box(
      "matte",
      trailDirt,
      [0.32, 0.02, Math.hypot(toX - fromX, toZ - fromZ) + 0.2],
      [(fromX + toX) / 2, 0.01, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
    if (builder.isFar) {
      continue;
    }
    /* A line of ants on each stretch, marching home to the nest */
    for (let ant = 0; ant < 3; ant++) {
      const share = (ant + 0.3) / 3;
      addAnt(
        builder,
        [fromX + (toX - fromX) * share, 0.02, fromZ + (toZ - fromZ) * share],
        Math.atan2(toX - fromX, toZ - fromZ),
        false,
      );
    }
  }
};

/** The magnifying glass, tilting to peer at the ants. */
const buildMagnifier = (builder: AttractionBuilder) => {
  builder.torus("metal", brass, 0.32, 0.035, [0, 0, -0.55], "y", 28);
  builder.cylinder("water", lens, {
    radius: 0.31,
    length: 0.02,
    at: [0, 0, -0.55],
    segments: 24,
  });
  /* The arm from the stand to the rim, with a wooden grip */
  builder.cylinder("metal", brass, {
    radius: 0.03,
    length: 0.24,
    at: [0, 0, -0.12],
    axis: "z",
    segments: 8,
  });
  builder.cylinder("paint", "#7a3a1f", {
    radius: 0.05,
    radiusEnd: 0.04,
    length: 0.3,
    at: [0, 0, 0.12],
    axis: "z",
    segments: 10,
  });
  builder.sphere("paint", "#7a3a1f", 0.05, [0, 0, 0.28], [1, 1, 1], 8);
};

const buildMagnifierStand = (builder: AttractionBuilder) => {
  const [x, y, z] = magnifierPivot;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.25,
    radiusEnd: 0.2,
    length: 0.1,
    at: [x, 0.05, z],
    segments: 14,
  });
  builder.cylinder("metal", brass, {
    radius: 0.035,
    length: y,
    at: [x, y / 2, z],
    segments: 8,
  });
  builder.sphere("metal", brass, 0.06, [x, y, z], [1, 1, 1], 8);
  if (builder.isFar) {
    builder.torus("metal", brass, 0.32, 0.04, [x, y, z - 0.55], "y", 12);
  }
};

const buildSoldier = (builder: AttractionBuilder) => {
  /* A big-headed soldier ant guarding the door */
  addAnt(builder, [0, 0, 0], 0, true);
  builder.sphere("paint", antDark, 0.07, [0, 0.11, 0.12], [1.2, 1, 1], 10);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      antDark,
      [0.015, 0.015, 0.08],
      [side * 0.04, 0.08, 0.2],
      [0, side * 0.4, 0],
    );
    builder.sphere(
      "paint",
      palette.black,
      0.012,
      [side * 0.06, 0.14, 0.17],
      [1, 1, 1],
      4,
    );
  });
};

const buildWanderingAnt = (builder: AttractionBuilder) => {
  addAnt(builder, [0, 0, 0], 0, true);
};

const buildGround = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.0, 0.03, 2.6], [1.6, 0.015, 3.0]);
  if (builder.isFar) {
    return;
  }
  /* Leaf pieces dropped along the way, and a notebook for counting */
  [
    [1.7, 0.6],
    [0.9, 0.6],
    [2.6, -0.3],
  ].forEach(([x, z], index) => {
    builder.add(
      "matte",
      index % 2 === 0 ? leafGreen : leafDark,
      new SphereGeometry(1, 6, 3),
      {
        at: [x, 0.02, z],
        rotation: [0, index * 1.4, 0],
        scale: [0.08, 0.01, 0.07],
      },
    );
  });
  builder.box(
    "paint",
    palette.white,
    [0.32, 0.03, 0.24],
    [0.4, 0.04, 1.0],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    "#3f78c8",
    [0.34, 0.025, 0.26],
    [0.4, 0.02, 1.0],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    palette.black,
    [0.2, 0.005, 0.015],
    [0.4, 0.058, 0.95],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    palette.black,
    [0.15, 0.005, 0.015],
    [0.39, 0.058, 1.02],
    [0, 0.3, 0],
  );
  builder.cylinder("paint", "#f2c94c", {
    radius: 0.015,
    length: 0.22,
    at: [0.62, 0.03, 1.08],
    axis: "x",
    segments: 6,
  });
  /* Ferns round the back */
  [
    [-3.3, 0.6, 1.0],
    [0.9, -3.4, 0.9],
    [-2.6, -3.0, 0.8],
  ].forEach(([x, z, size]) => {
    for (let frond = 0; frond < 6; frond++) {
      const turn = (frond / 6) * Math.PI * 2 + size;
      builder.add(
        "matte",
        frond % 2 === 0 ? leafGreen : leafDark,
        new SphereGeometry(1, 6, 3),
        {
          at: [
            x + Math.sin(turn) * 0.35 * size,
            0.25 * size,
            z + Math.cos(turn) * 0.35 * size,
          ],
          rotation: [-0.5, turn, 0],
          scale: [0.12 * size, 0.03, 0.45 * size],
        },
      );
    }
  });
};

export const leafcutterAntsModel: CuriosityModel = {
  kind: "leafcutter-ants",
  islandId: "jungle-reach",
  name: "Leafcutter Ant Nest",
  fact: "Leafcutter ants are insects: like every insect they have six legs and three body parts. They cut pieces of leaf and carry them home, but they don't eat them! They chew the leaves into a garden where a fungus grows, and the fungus is their food. One nest can hold millions of ants.",
  curriculumLink:
    "Science, Year 4: recognise that living things can be grouped in a variety of ways, and explore and use classification keys to group, identify and name living things.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 1.6, z: 3.6 },
  build: (builder) => {
    buildGround(builder);
    buildMound(builder);
    buildPlant(builder);
    buildTrail(builder);
    buildMagnifierStand(builder);
    addSignBoard(builder, [1.6, 0, 3.6], signColour);
  },
  moving: [
    {
      name: "magnifying glass",
      pivot: magnifierPivot,
      build: buildMagnifier,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.35,
        period: 2.4,
      },
    },
    {
      name: "soldier ant",
      pivot: soldierAt,
      build: buildSoldier,
      motion: { kind: "rise", reach: 5, height: 0.28, period: 1.2 },
    },
  ],
  wanderers: [
    {
      name: "leafcutter ants",
      build: buildWanderingAnt,
      count: 6,
      centre: { x: 1.7, z: -0.6 },
      radius: 0.9,
      speed: 0.25,
    },
  ],
  blockers: [
    { x: mound.x, z: mound.z, radius: 1.75 },
    { x: plant.x, z: plant.z, radius: 0.3 },
    { x: magnifierPivot[0], z: magnifierPivot[2], radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Follow the ants",
    news: "You followed the trail of marching leaves all the way to the nest, where the ants turned them into a fungus garden.",
  },
};
