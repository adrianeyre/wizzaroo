import { BoxGeometry, CylinderGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowBlock = "#f7fbfe";
const snowSeam = "#c9d8e4";
const snowShadow = "#dae5ee";
const warmGlow = "#ffbf5e";
const kayakSkin = "#b98a52";
const kayakFrame = "#5c3d24";
const iceWindow = "#bfe3f5";
const signColour = "#2f6f9a";

const dome = { x: 0, z: -0.75, radius: 1.75 };
const tunnel = {
  radius: 0.66,
  from: dome.z + dome.radius - 0.35,
  to: dome.z + dome.radius + 1.05,
};
const lampAt: Triple = [0, 0.18, tunnel.to - 0.45];
const kayakAt: Triple = [-2.65, 0, -0.4];
const rackAt: Triple = [2.55, 0, -1.6];
const spearAt: Triple = [2.35, 0, 0.75];
const signAt: Triple = [1.55, 0, 3.75];
const rideStart = { x: 0, z: tunnel.to + 0.55 };
const rideFinish = { x: 1.35, z: tunnel.to + 0.8 };

/** Where a block sits on the dome, tilted to face out and up. */
const addDomeBlock = (
  builder: AttractionBuilder,
  size: Triple,
  angle: number,
  elevation: number,
  radius: number,
  colour: string,
) => {
  builder.add(
    "matte",
    colour,
    new BoxGeometry(...size).rotateX(-elevation).rotateY(angle),
    {
      at: [
        dome.x + Math.cos(elevation) * Math.sin(angle) * radius,
        Math.sin(elevation) * radius,
        dome.z + Math.cos(elevation) * Math.cos(angle) * radius,
      ],
    },
    undefined,
  );
};

const buildDome = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 16 : 40;
  /* The packed snow core, which shows as the seams between the blocks */
  const profile: [number, number][] = [];
  const steps = builder.isFar ? 4 : 10;
  for (let step = 0; step <= steps; step++) {
    const elevation = (step / steps) * (Math.PI / 2);
    profile.push([
      Math.cos(elevation) * dome.radius,
      Math.sin(elevation) * dome.radius * 0.96,
    ]);
  }
  builder.lathe(
    "matte",
    builder.isFar ? snowBlock : snowSeam,
    profile,
    [dome.x, 0, dome.z],
    "y",
    segments,
  );
  if (builder.isFar) {
    return;
  }
  /* Rings of blocks, fewer and smaller towards the top, each ring staggered */
  const rings = 7;
  for (let ring = 0; ring < rings; ring++) {
    const elevation = ((ring + 0.5) / (rings + 0.6)) * (Math.PI / 2);
    const ringRadius = Math.cos(elevation) * dome.radius;
    const count = Math.max(5, Math.round((Math.PI * 2 * ringRadius) / 0.62));
    const height = (dome.radius * (Math.PI / 2)) / (rings + 0.6) - 0.05;
    for (let block = 0; block < count; block++) {
      const angle = ((block + (ring % 2) * 0.5) / count) * Math.PI * 2;
      /* Leave a gap where the tunnel meets the dome */
      const facing = Math.cos(angle);
      if (ring < 3 && facing > 0.93) {
        continue;
      }
      addDomeBlock(
        builder,
        [(Math.PI * 2 * ringRadius) / count - 0.05, height, 0.14],
        angle,
        elevation,
        dome.radius * 0.97,
        block % 3 === 0 ? shade(snowBlock, 0.97) : snowBlock,
      );
    }
  }
  /* A cap block at the top, with the little air vent */
  builder.cylinder("matte", snowBlock, {
    radius: 0.32,
    radiusEnd: 0.24,
    length: 0.12,
    at: [dome.x, dome.radius * 0.96, dome.z],
    segments: 14,
  });
  builder.cylinder("matte", "#3a3530", {
    radius: 0.08,
    length: 0.02,
    at: [dome.x, dome.radius * 0.96 + 0.065, dome.z],
    segments: 10,
  });
  /* A clear ice block set in as a window, with warm light behind it */
  addDomeBlock(
    builder,
    [0.5, 0.36, 0.12],
    -1.1,
    0.42,
    dome.radius + 0.01,
    iceWindow,
  );
  builder.add(
    "glow",
    warmGlow,
    new BoxGeometry(0.42, 0.3, 0.05).rotateX(-0.42).rotateY(-1.1),
    {
      at: [
        dome.x + Math.cos(0.42) * Math.sin(-1.1) * (dome.radius - 0.05),
        Math.sin(0.42) * (dome.radius - 0.05),
        dome.z + Math.cos(0.42) * Math.cos(-1.1) * (dome.radius - 0.05),
      ],
    },
  );
  /* Snow banked round the foot of the wall */
  builder.torus(
    "matte",
    snowShadow,
    dome.radius + 0.05,
    0.16,
    [dome.x, 0.02, dome.z],
    "y",
    36,
  );
};

/** A half-tube through the arch, from z `from` to z `to`. */
const archGeometry = (radius: number, length: number, segments: number) =>
  new CylinderGeometry(
    radius,
    radius,
    length,
    segments,
    1,
    true,
    -Math.PI / 2,
    Math.PI,
  ).rotateX(Math.PI / 2);

const buildTunnel = (builder: AttractionBuilder) => {
  const length = tunnel.to - tunnel.from;
  const middle = (tunnel.from + tunnel.to) / 2;
  const segments = builder.isFar ? 6 : 18;
  builder.add(
    "matte",
    snowBlock,
    archGeometry(tunnel.radius, length, segments),
    { at: [dome.x, 0, middle] },
    undefined,
  );
  /* The dark mouth, with the warm glow of the room beyond */
  builder.add(
    "matte",
    "#2b2a33",
    new CylinderGeometry(
      tunnel.radius - 0.12,
      tunnel.radius - 0.12,
      0.04,
      segments,
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [dome.x, 0, tunnel.to - 0.05] },
  );
  if (builder.isFar) {
    return;
  }
  builder.add(
    "glow",
    warmGlow,
    new CylinderGeometry(
      0.4,
      0.4,
      0.04,
      14,
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [dome.x, 0, tunnel.from + 0.2] },
  );
  /* Blocks on the arch, in courses */
  const courses = 3;
  for (let course = 0; course < courses; course++) {
    const z = tunnel.from + 0.3 + course * ((length - 0.35) / (courses - 1));
    for (let block = 0; block < 5; block++) {
      const angle = -Math.PI / 2 + ((block + 0.5) / 5) * Math.PI;
      builder.box(
        "matte",
        block % 2 === course % 2 ? snowBlock : shade(snowBlock, 0.96),
        [0.38, 0.12, 0.38],
        [
          dome.x + Math.sin(angle) * (tunnel.radius + 0.04),
          Math.cos(angle) * (tunnel.radius + 0.04),
          z,
        ],
        [0, 0, -angle],
      );
    }
  }
  /* A thick snow lintel round the mouth */
  builder.add(
    "matte",
    snowShadow,
    new CylinderGeometry(
      tunnel.radius + 0.1,
      tunnel.radius + 0.1,
      0.16,
      18,
      1,
      true,
      -Math.PI / 2,
      Math.PI,
    ).rotateX(Math.PI / 2),
    { at: [dome.x, 0, tunnel.to] },
  );
  /* A caribou skin hung as a door flap, rolled up */
  builder.cylinder("matte", "#8b6a48", {
    radius: 0.08,
    length: 0.9,
    at: [dome.x, tunnel.radius + 0.05, tunnel.to + 0.08],
    axis: "x",
    segments: 10,
  });
};

/** The seal-oil lamp (qulliq) inside the doorway, glowing as you come near. */
const buildLamp = (builder: AttractionBuilder) => {
  builder.sphere("glow", warmGlow, 0.22, [0, 0.12, 0], [1.3, 0.9, 1], 14);
  builder.sphere("glow", "#ffe7a8", 0.1, [0, 0.16, 0.02], [1, 1.6, 1], 10);
};

/** A soft warm halo spilling out of the doorway after dark. */
const buildDoorGlow = (builder: AttractionBuilder) => {
  builder.sphere("glow", warmGlow, 0.7, [0, 0, 0], [1.2, 0.8, 0.6], 16);
};

const buildLampDish = (builder: AttractionBuilder) => {
  builder.lathe(
    "matte",
    "#7d776c",
    [
      [0, 0],
      [0.16, 0.01],
      [0.22, 0.07],
      [0.2, 0.09],
      [0, 0.06],
    ],
    [lampAt[0], 0, lampAt[2]],
    "y",
    14,
  );
};

const buildKayak = (builder: AttractionBuilder) => {
  const [x, , z] = kayakAt;
  /* Long and narrow, pointed both ends, resting on two snow blocks */
  builder.sphere(
    "matte",
    kayakSkin,
    0.3,
    [x, 0.42, z],
    [1, 0.55, 5.2],
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  [-0.8, 0.8].forEach((along) => {
    builder.box("matte", snowBlock, [0.55, 0.26, 0.35], [x, 0.13, z + along]);
  });
  builder.torus("matte", kayakFrame, 0.2, 0.035, [x, 0.56, z - 0.1], "y", 16);
  builder.cylinder("matte", "#2a221c", {
    radius: 0.18,
    length: 0.03,
    at: [x, 0.555, z - 0.1],
    segments: 14,
  });
  /* Lashings across the deck */
  [-1.05, -0.65, 0.5, 0.95].forEach((along) => {
    builder.box(
      "matte",
      kayakFrame,
      [0.36, 0.025, 0.04],
      [x, 0.565 - Math.abs(along) * 0.035, z + along],
    );
  });
  /* The double paddle laid across */
  builder.bar(
    "matte",
    palette.paleTimber,
    [x - 0.9, 0.6, z + 0.25],
    [x + 0.9, 0.62, z + 0.05],
    0.05,
    6,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.4, 0.02, 0.14],
      [x + side * 1.0, 0.61, z + 0.15 - side * 0.11],
      [0, -0.11, 0],
    );
  });
};

/** A three-pronged fish spear (kakivak) leaning on a snow block, and a fish. */
const buildSpear = (builder: AttractionBuilder) => {
  const [x, , z] = spearAt;
  builder.box("matte", snowBlock, [0.5, 0.42, 0.36], [x + 0.25, 0.21, z]);
  const tip: Triple = [x - 0.3, 2.0, z - 0.25];
  builder.bar(
    "matte",
    palette.paleTimber,
    [x + 0.35, 0, z + 0.1],
    tip,
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  [-1, 0, 1].forEach((prong) => {
    builder.bar(
      "matte",
      prong === 0 ? palette.steel : "#e9e1cf",
      tip,
      [tip[0] - 0.07 + prong * 0.08, tip[1] + 0.32, tip[2] - 0.05],
      0.025,
      4,
    );
  });
  /* An arctic char lying on the block, pink-bellied */
  builder.sphere(
    "paint",
    "#6f7f7a",
    0.07,
    [x + 0.25, 0.47, z],
    [3.2, 0.9, 1],
    10,
  );
  builder.sphere(
    "paint",
    "#e8866d",
    0.05,
    [x + 0.25, 0.45, z + 0.02],
    [3, 0.6, 1],
    8,
  );
  builder.box(
    "paint",
    "#6f7f7a",
    [0.02, 0.12, 0.1],
    [x + 0.5, 0.47, z],
    [0, Math.PI / 2, 0],
  );
};

/** A wooden rack hung with fish drying in the cold wind. */
const buildRack = (builder: AttractionBuilder) => {
  const [x, , z] = rackAt;
  [-0.6, 0.6].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side - 0.2, 0, z],
      [x + side, 1.45, z],
      0.06,
      5,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side + 0.2, 0, z],
      [x + side, 1.45, z],
      0.06,
      5,
    );
  });
  builder.bar(
    "matte",
    palette.timber,
    [x - 0.75, 1.4, z],
    [x + 0.75, 1.4, z],
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  for (let fish = 0; fish < 5; fish++) {
    const fx = x - 0.45 + fish * 0.22;
    builder.sphere(
      "paint",
      fish % 2 === 0 ? "#c96b4e" : "#a9573e",
      0.06,
      [fx, 1.12, z],
      [1, 3.6, 0.5],
      8,
    );
    builder.box("paint", "#7a3f2c", [0.1, 0.06, 0.02], [fx, 0.88, z]);
  }
};

const buildYard = (builder: AttractionBuilder) => {
  /* A path of packed snow to the tunnel */
  builder.box(
    "matte",
    snowShadow,
    [1.1, 0.02, 1.7],
    [0.3, 0.01, tunnel.to + 0.85],
    [0, 0.2, 0],
  );
  if (builder.isFar) {
    return;
  }
  /* Spare blocks, cut and stacked, with the snow knife stuck in one */
  [
    [-1.95, 0.17, 2.3, 0.3],
    [-1.45, 0.17, 2.6, -0.2],
    [-1.75, 0.5, 2.45, 0.1],
  ].forEach(([x, y, z, turn]) => {
    builder.box("matte", snowBlock, [0.6, 0.32, 0.38], [x, y, z], [0, turn, 0]);
  });
  builder.box(
    "metal",
    palette.steel,
    [0.04, 0.32, 0.08],
    [-1.7, 0.8, 2.45],
    [0, 0.1, 0.15],
  );
  builder.box(
    "matte",
    "#e9e1cf",
    [0.05, 0.16, 0.1],
    [-1.72, 1.02, 2.45],
    [0, 0.1, 0.15],
  );
  /* Drifts, and footprints crawling into the tunnel */
  [
    [2.9, 2.0, 0.6],
    [-3.3, 1.9, 0.7],
    [0.4, -3.6, 0.8],
    [-2.3, -2.9, 0.6],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowBlock, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
  for (let step = 0; step < 6; step++) {
    const side = step % 2 === 0 ? -1 : 1;
    builder.box(
      "matte",
      shade(snowShadow, 0.94),
      [0.12, 0.012, 0.22],
      [1.2 - step * 0.2 + side * 0.08, 0.012, 3.5 - step * 0.22],
      [0, 0.75, 0],
    );
  }
};

const crawl = (progress: number): LocalSpot => {
  const mouth = { x: rideStart.x, z: rideStart.z };
  const inside = { x: dome.x, z: dome.z + 0.2 };
  if (progress < 0.32) {
    const share = progress / 0.32;
    return {
      x: mouth.x,
      y: 0,
      z: mouth.z + (inside.z - mouth.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.6) {
    /* A look round the warm room, turning about */
    const share = (progress - 0.32) / 0.28;
    return {
      x: inside.x,
      y: 0,
      z: inside.z,
      heading: Math.PI + share * Math.PI,
    };
  }
  if (progress < 0.9) {
    const share = (progress - 0.6) / 0.3;
    return {
      x: mouth.x,
      y: 0,
      z: inside.z + (mouth.z - inside.z) * share,
      heading: 0,
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: mouth.x + (rideFinish.x - mouth.x) * share,
    y: 0,
    z: mouth.z + (rideFinish.z - mouth.z) * share,
    heading: Math.PI / 2,
  };
};

export const iglooModel: CuriosityModel = {
  kind: "igloo",
  islandId: "frost-isle",
  name: "Igloo",
  fact: "An igloo is a snow house built by the Inuit people, who live in the cold Arctic near the North Pole. It is made from blocks of hard snow placed in a spiral that curves in to make a dome. Snow traps air, so it keeps the warmth in, and inside an igloo can be much warmer than outside. The North and South Poles are the coldest places on Earth, a long way from the hot Equator.",
  curriculumLink:
    "Geography, Key Stage 1: identify the location of hot and cold areas of the world in relation to the Equator and the North and South Poles.",
  footprint: 4.4,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildDome(builder);
    buildTunnel(builder);
    buildLampDish(builder);
    buildKayak(builder);
    buildSpear(builder);
    buildRack(builder);
    buildYard(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "seal-oil lamp",
      pivot: lampAt,
      build: buildLamp,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "doorway glow",
      pivot: [0, 0.3, tunnel.to + 0.1],
      build: buildDoorGlow,
      motion: { kind: "wake", reach: 6 },
      look: "halo",
    },
  ],
  smoke: [
    {
      at: [dome.x, dome.radius * 0.96 + 0.1, dome.z],
      colour: "#eef3f7",
      puffs: 4,
      size: 0.12,
      rise: 1.2,
      spread: 0.2,
    },
  ],
  rides: [
    {
      id: "igloo",
      name: "the igloo",
      start: rideStart,
      reach: 0.6,
      seconds: 9,
      finish: rideFinish,
      follow: crawl,
    },
  ],
  blockers: [
    { x: dome.x, z: dome.z, radius: dome.radius - 0.2 },
    ...[-1, 1].map((side) => ({
      x: dome.x + side * 1.25,
      z: dome.z + 1.0,
      radius: 0.5,
    })),
    ...[-1, 1].flatMap((side) => [
      {
        x: dome.x + side * (tunnel.radius + 0.05),
        z: tunnel.from + 0.4,
        radius: 0.22,
      },
      {
        x: dome.x + side * (tunnel.radius + 0.05),
        z: tunnel.to - 0.15,
        radius: 0.22,
      },
    ]),
    { x: kayakAt[0], z: kayakAt[2] - 0.8, radius: 0.45 },
    { x: kayakAt[0], z: kayakAt[2] + 0.8, radius: 0.45 },
    { x: spearAt[0] + 0.25, z: spearAt[2], radius: 0.35 },
    { x: rackAt[0], z: rackAt[2], radius: 0.6 },
    { x: -1.7, z: 2.45, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Crawl inside",
    news: "Cosy! You crawled through the tunnel into the snow house, where the lamp glowed and it was snug and warm.",
  },
};
