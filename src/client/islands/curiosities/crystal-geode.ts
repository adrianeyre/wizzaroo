import {
  CylinderGeometry,
  Euler,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const ashGround = "#574a44";
const geodeRock = "#6a5d55";
const geodeRockDark = "#4d433d";
const chalcedony = "#e4dcea";
const amethyst = "#9b59d0";
const amethystLight = "#c79bf0";
const amethystDeep = "#6a2fa0";
const roseQuartz = "#f08fc0";
const iceBlue = "#7fd4f0";
const cartRed = "#8a3a2a";
const signColour = "#5a2f7a";

const geodeAt: Triple = [0, 1.45, -1.0];
const geodeRadius = 1.7;
const shellThickness = 0.16;
const halfAt: Triple = [-2.45, 0, 0.75];
const halfRadius = 0.95;
const railX = 2.9;
const cartAt: Triple = [railX, 0, 0.3];
const pedestalAt: Triple = [1.25, 0, 1.55];
const floatHeight = 1.35;

const upright = new Vector3(0, 1, 0);

/** A hexagonal crystal: a prism with a pointed tip, growing along `direction`. */
const addCrystal = (
  builder: AttractionBuilder,
  base: Triple,
  direction: Triple,
  length: number,
  radius: number,
  colour: string,
  finish: AttractionFinish = "glass",
) => {
  const pointing = new Vector3(...direction).normalize();
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, pointing),
  );
  const rotation: Triple = [turn.x, turn.y, turn.z];
  const body = length * 0.7;
  const tip = length - body;
  const along = (distance: number): Triple => [
    base[0] + pointing.x * distance,
    base[1] + pointing.y * distance,
    base[2] + pointing.z * distance,
  ];
  builder.add(finish, colour, new CylinderGeometry(radius, radius, body, 6), {
    at: along(body / 2),
    rotation,
  });
  builder.add(
    finish,
    shade(colour, 1.15),
    new CylinderGeometry(0, radius, tip, 6, 1, true),
    { at: along(body + tip / 2), rotation },
  );
};

/** Directions spread evenly over the back half of a sphere (z ≤ 0). */
const listHalfDirections = (count: number, facing: "back" | "up"): Triple[] =>
  Array.from({ length: count }, (_, index) => {
    const depth = (index + 0.5) / count;
    const ring = Math.sqrt(1 - depth * depth);
    const angle = index * 2.39996;
    return facing === "back"
      ? [Math.cos(angle) * ring, Math.sin(angle) * ring, -depth]
      : [Math.cos(angle) * ring, -depth, Math.sin(angle) * ring];
  });

const buildGeode = (builder: AttractionBuilder) => {
  const width = builder.segments(18, 8);
  const height = builder.segments(14, 6);
  /* The rough outer shell, the back half of a hollow stone ball */
  builder.add(
    "matte",
    geodeRock,
    new SphereGeometry(geodeRadius, width, height, Math.PI, Math.PI),
    { at: geodeAt },
  );
  /* Its lining, a smaller half facing inwards */
  builder.add(
    "matte",
    amethystDeep,
    new SphereGeometry(
      geodeRadius - shellThickness,
      width,
      height,
      Math.PI,
      Math.PI,
    ).scale(-1, 1, 1),
    { at: geodeAt },
  );
  /* The cracked rim: a band of pale chalcedony round the opening */
  builder.torus(
    "matte",
    chalcedony,
    geodeRadius - shellThickness / 2,
    shellThickness * 0.7,
    geodeAt,
    "z",
    builder.isFar ? 12 : 36,
  );
  if (builder.isFar) {
    builder.add(
      "glow",
      amethyst,
      new SphereGeometry(geodeRadius - 0.5, 8, 6, Math.PI, Math.PI),
      { at: geodeAt },
    );
    return;
  }
  /* Knobbly bumps on the outside of the shell */
  listHalfDirections(9, "back").forEach(([x, y, z], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? geodeRockDark : shade(geodeRock, 1.1),
      0.3 + (index % 3) * 0.08,
      [
        geodeAt[0] + x * geodeRadius,
        geodeAt[1] + y * geodeRadius,
        geodeAt[2] + z * geodeRadius * 0.98,
      ],
      [1.2, 1, 0.6],
      7,
    );
  });
  /* Crystals lining the inside, all pointing in towards the middle */
  listHalfDirections(40, "back").forEach(([x, y, z], index) => {
    const reach = geodeRadius - shellThickness - 0.02;
    const colour =
      index % 4 === 0
        ? amethystLight
        : index % 4 === 2
          ? amethystDeep
          : amethyst;
    addCrystal(
      builder,
      [geodeAt[0] + x * reach, geodeAt[1] + y * reach, geodeAt[2] + z * reach],
      [-x + Math.sin(index) * 0.2, -y + Math.cos(index) * 0.2, -z],
      0.42 + (index % 5) * 0.09,
      0.07 + (index % 3) * 0.025,
      colour,
      index % 3 === 0 ? "glow" : "glass",
    );
  });
  /* A cracked notch in the rim, and the stone base it rests in */
  builder.sphere(
    "matte",
    geodeRockDark,
    0.7,
    [geodeAt[0], 0.05, geodeAt[2] - 0.4],
    [2.2, 0.45, 1.4],
    14,
  );
};

/** The other half, broken off and lying open to the sky. */
const buildFallenHalf = (builder: AttractionBuilder) => {
  const width = builder.segments(16, 8);
  const height = builder.segments(8, 4);
  const at: Triple = [halfAt[0], halfRadius * 0.55, halfAt[2]];
  builder.add(
    "matte",
    geodeRock,
    new SphereGeometry(
      halfRadius,
      width,
      height,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    { at },
  );
  builder.cylinder("matte", chalcedony, {
    radius: halfRadius,
    length: 0.04,
    at: [at[0], at[1] + 0.01, at[2]],
    segments: width,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("matte", amethystDeep, {
    radius: halfRadius - 0.14,
    length: 0.05,
    at: [at[0], at[1] + 0.02, at[2]],
    segments: width,
  });
  listHalfDirections(14, "up").forEach(([x, , z], index) => {
    const spread = (index % 3) * 0.2 + 0.1;
    addCrystal(
      builder,
      [at[0] + x * 0.6 * spread * 2, at[1], at[2] + z * 0.6 * spread * 2],
      [x * 0.4, 1, z * 0.4],
      0.3 + (index % 4) * 0.08,
      0.06 + (index % 2) * 0.02,
      index % 3 === 0 ? amethystLight : amethyst,
      index % 2 === 0 ? "glow" : "glass",
    );
  });
};

const buildCrystalClusters = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const clusters: { at: Triple; colour: string }[] = [
    { at: [-3.4, 0, -1.5], colour: amethyst },
    { at: [2.0, 0, -2.7], colour: iceBlue },
    { at: [-1.45, 0, 2.6], colour: roseQuartz },
    { at: [3.7, 0, 2.3], colour: amethystLight },
    { at: [-3.6, 0, 2.3], colour: iceBlue },
  ];
  clusters.forEach(({ at, colour }, cluster) => {
    builder.sphere(
      "matte",
      geodeRockDark,
      0.28,
      [at[0], 0.05, at[2]],
      [1.3, 0.5, 1.1],
      7,
    );
    for (let crystal = 0; crystal < 5; crystal++) {
      const angle = crystal * 1.3 + cluster;
      addCrystal(
        builder,
        [at[0] + Math.sin(angle) * 0.1, 0.05, at[2] + Math.cos(angle) * 0.1],
        [Math.sin(angle) * 0.45, 1, Math.cos(angle) * 0.45],
        0.35 + ((crystal + cluster) % 3) * 0.15,
        0.06 + (crystal % 2) * 0.02,
        colour,
        crystal % 2 === 0 ? "glow" : "glass",
      );
    }
  });
};

const buildRailsAndCart = (builder: AttractionBuilder) => {
  const from = -2.2;
  const to = 2.4;
  [-0.3, 0.3].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.05, 0.06, to - from],
      [railX + side, 0.1, (from + to) / 2],
    );
  });
  const [x, , z] = cartAt;
  /* The cart: a tub that widens at the top, on four iron wheels */
  builder.cylinder("paint", cartRed, {
    radius: 0.42,
    radiusEnd: 0.55,
    length: 0.5,
    at: [x, 0.5, z],
    segments: 4,
  });
  if (builder.isFar) {
    return;
  }
  for (let sleeper = 0; sleeper < 9; sleeper++) {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.9, 0.06, 0.18],
      [railX, 0.04, from + 0.2 + sleeper * 0.55],
    );
  }
  /* A buffer stop at the end of the line */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.9, 0.3, 0.2],
    [railX, 0.3, from - 0.05],
  );
  builder.box(
    "paint",
    "#f2c230",
    [0.7, 0.08, 0.21],
    [railX, 0.35, from - 0.05],
  );
  builder.torus("metal", palette.darkSteel, 0.5, 0.03, [x, 0.75, z], "y", 4);
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.cylinder("metal", palette.black, {
        radius: 0.13,
        length: 0.06,
        at: [x + sideX * 0.3, 0.17, z + sideZ * 0.28],
        axis: "x",
        segments: 12,
      });
    });
  });
  /* Heaped with crystals */
  for (let crystal = 0; crystal < 7; crystal++) {
    const angle = crystal * 2.2;
    addCrystal(
      builder,
      [x + Math.sin(angle) * 0.18, 0.72, z + Math.cos(angle) * 0.18],
      [Math.sin(angle) * 0.6, 1, Math.cos(angle) * 0.6],
      0.3 + (crystal % 3) * 0.08,
      0.06,
      crystal % 2 === 0 ? amethyst : amethystLight,
      crystal % 3 === 0 ? "glow" : "glass",
    );
  }
  /* A pickaxe leaning on the cart and a miner's lantern on a crate */
  builder.bar(
    "matte",
    palette.paleTimber,
    [x - 0.62, 0, z + 0.55],
    [x - 0.5, 0.95, z + 0.2],
    0.05,
    5,
  );
  builder.bar(
    "metal",
    palette.steel,
    [x - 0.78, 0.98, z + 0.18],
    [x - 0.22, 0.9, z + 0.22],
    0.05,
    5,
  );
  builder.box(
    "matte",
    palette.timber,
    [0.45, 0.4, 0.45],
    [x - 1.0, 0.2, z - 1.6],
    [0, 0.3, 0],
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.12, 0.18, 0.12],
    [x - 1.0, 0.52, z - 1.6],
  );
  builder.cylinder("metal", palette.black, {
    radius: 0.1,
    radiusEnd: 0.02,
    length: 0.08,
    at: [x - 1.0, 0.65, z - 1.6],
    segments: 8,
  });
};

const buildPedestal = (builder: AttractionBuilder) => {
  const [x, , z] = pedestalAt;
  builder.lathe(
    "matte",
    "#8d847c",
    [
      [0, 0],
      [0.4, 0],
      [0.4, 0.12],
      [0.24, 0.2],
      [0.18, 0.8],
      [0.3, 0.9],
      [0.3, 1.0],
      [0, 1.0],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 6 : 14,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus("glow", amethystLight, 0.27, 0.02, [x, 1.0, z], "y", 16);
};

/** A double-ended crystal floating over the pedestal, turning faster near. */
const buildFloatingCrystal = (builder: AttractionBuilder) => {
  addCrystal(builder, [0, 0, 0], [0, 1, 0], 0.5, 0.12, roseQuartz, "glow");
  addCrystal(builder, [0, 0.01, 0], [0, -1, 0], 0.4, 0.12, roseQuartz, "glow");
  [0, 1, 2].forEach((index) => {
    const angle = (index / 3) * Math.PI * 2;
    builder.add("glow", amethystLight, new OctahedronGeometry(0.05), {
      at: [Math.sin(angle) * 0.32, 0.05, Math.cos(angle) * 0.32],
    });
  });
};

/** Twinkling glints inside the geode, which come out as the Character nears. */
const buildSparkles = (builder: AttractionBuilder) => {
  listHalfDirections(16, "back").forEach(([x, y, z], index) => {
    const reach = (geodeRadius - 0.6) * (0.55 + (index % 3) * 0.2);
    builder.add(
      "glow",
      index % 2 === 0 ? "#ffffff" : amethystLight,
      new OctahedronGeometry(0.07 + (index % 2) * 0.03),
      {
        at: [x * reach, y * reach, z * reach + 0.25],
        scale: [0.5, 1.4, 0.5],
      },
    );
  });
  builder.add(
    "glow",
    amethyst,
    new SphereGeometry(geodeRadius - 0.55, 14, 8, Math.PI, Math.PI).scale(
      -1,
      1,
      1,
    ),
    {},
  );
};

/** A soft purple light spilling from the geode after dark. */
const buildGlow = (builder: AttractionBuilder) => {
  builder.sphere(
    "glow",
    amethystLight,
    geodeRadius * 0.9,
    [0, 0, 0.2],
    [1, 1, 0.6],
    14,
  );
};

export const crystalGeodeModel: CuriosityModel = {
  kind: "crystal-geode",
  islandId: "ember-isle",
  name: "Crystal Geode",
  fact: "A geode looks like a plain round rock on the outside, but inside it is hollow and lined with sparkling crystals. Long ago a bubble of gas was trapped in cooling lava. Water full of dissolved minerals seeped in, and over thousands of years the minerals slowly grew into crystals like this purple amethyst.",
  curriculumLink:
    "Science, Year 5: compare and group together everyday materials on the basis of their properties, including their hardness and transparency.",
  footprint: 5,
  setting: "inland",
  padColour: ashGround,
  signSpot: { x: -0.4, z: 4.0 },
  build: (builder) => {
    buildGeode(builder);
    buildFallenHalf(builder);
    buildCrystalClusters(builder);
    buildRailsAndCart(builder);
    buildPedestal(builder);
    addSignBoard(builder, [-0.4, 0, 4.0], signColour);
  },
  moving: [
    {
      name: "sparkles",
      pivot: geodeAt,
      build: buildSparkles,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "geode glow",
      pivot: geodeAt,
      build: buildGlow,
      motion: { kind: "wake", reach: 8 },
      look: "halo",
    },
    {
      name: "floating crystal",
      pivot: [pedestalAt[0], floatHeight, pedestalAt[2]],
      build: buildFloatingCrystal,
      motion: { kind: "whirl", axis: "y", idle: 0.5, speed: 4, reach: 6 },
    },
  ],
  blockers: [
    { x: geodeAt[0], z: geodeAt[2] - 0.3, radius: 1.75 },
    { x: geodeAt[0] - 1.2, z: geodeAt[2] + 0.4, radius: 0.6 },
    { x: geodeAt[0] + 1.2, z: geodeAt[2] + 0.4, radius: 0.6 },
    { x: halfAt[0], z: halfAt[2], radius: halfRadius + 0.05 },
    { x: cartAt[0], z: cartAt[2], radius: 0.6 },
    { x: cartAt[0] - 1.0, z: cartAt[2] - 1.6, radius: 0.35 },
    { x: pedestalAt[0], z: pedestalAt[2], radius: 0.42 },
  ] satisfies LocalBlocker[],
  tune: [84, 88, 91, 96, 91],
  play: {
    label: "Make the crystals glow",
    news: "Ting-a-ling! You tapped the geode and every crystal inside lit up purple, sparkling like a cave full of stars.",
  },
};
