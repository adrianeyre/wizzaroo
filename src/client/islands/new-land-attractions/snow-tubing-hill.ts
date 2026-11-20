import { BoxGeometry, ExtrudeGeometry, Shape, Vector2 } from "three";
import {
  addBench,
  addDoor,
  addLampPost,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowBright = "#fbfdff";
const snowShadow = "#d6e1ea";
const laneSnow = "#dbe9f3";
const berm = "#e6eef4";
const pine = "#2d5a40";
const faluRed = "#9e2b25";
const trim = "#f2efe6";
const roofGrey = "#3b4148";
const carpetOrange = "#f07a22";
const tubeColours = ["#e8452f", "#2f7fd8", "#f2c230", "#3fb36b", "#9b5de5"];
const signColour = "#2f7fd8";

/* The hill climbs away from the visitors (-z), its lanes running down to +z */
const hill = { minX: -4.7, maxX: 1.3, backZ: -8.0, topZ: -5.6, bottomZ: 1.6 };
const hillHeight = 2.6;
const lanes = [-3.6, -1.7, 0.2];
const laneHalf = 0.62;
const carpet = { x: 2.15, bottomZ: 2.0, topZ: -6.0, half: 0.42 };
const bumperZ = 3.6;

const cannonAt: Triple = [-6.1, 3.0, -2.0];
const flagAt: Triple = [-1.0, hillHeight, -7.3];
const lampAt: Triple = [-3.9, hillHeight + 1.95, -6.0];
const hireHut = { x: 5.4, z: 2.6, width: 2.4, depth: 1.8, wall: 1.7 };

const signAt: Triple = [3.0, 0, 7.4];
const rideStart = { x: carpet.x, z: carpet.bottomZ + 1.1 };
const rideFinish = { x: lanes[1] + 0.9, z: bumperZ - 0.9 };

/** The hill's height: flat on top, steep at first and running out at the bottom. */
const hillHeightAt = (z: number): number => {
  if (z <= hill.topZ) {
    return hillHeight;
  }
  const share = Math.min(1, (z - hill.topZ) / (hill.bottomZ - hill.topZ));
  return hillHeight * (1 - share) ** 1.6;
};

const carpetHeightAt = (z: number): number =>
  hillHeight *
  Math.min(
    1,
    Math.max(0, (carpet.bottomZ - z) / (carpet.bottomZ - carpet.topZ)),
  );

const listProfile = (steps: number): [number, number][] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const z = hill.topZ + ((hill.bottomZ - hill.topZ) * index) / steps;
    return [z, hillHeightAt(z)];
  });

/* ------------------------------------------------------------------ */
/* The hill and its lanes                                              */
/* ------------------------------------------------------------------ */

const buildHill = (builder: AttractionBuilder) => {
  const profile = listProfile(builder.isFar ? 6 : 16);
  const side = new Shape();
  side.moveTo(-hill.bottomZ, 0);
  profile
    .slice()
    .reverse()
    .forEach(([z, height]) => {
      side.lineTo(-z, height);
    });
  side.lineTo(-hill.backZ, hillHeight);
  side.lineTo(-hill.backZ, 0);
  side.closePath();
  builder.sidePlate(
    "matte",
    snowBright,
    side,
    (hill.minX + hill.maxX) / 2,
    hill.maxX - hill.minX,
  );
  /* Snowy drifts softening the hill's sides */
  if (!builder.isFar) {
    [hill.minX, hill.maxX].forEach((x, index) => {
      [-6.6, -3.6, -1.0].forEach((z) => {
        const height = hillHeightAt(z);
        builder.sphere(
          "matte",
          snowShadow,
          0.7,
          [x + (index === 0 ? -0.15 : 0.15), height * 0.4, z],
          [0.6, Math.max(0.35, height * 0.75), 2.0],
          10,
        );
      });
    });
  }
  /* The lanes, each with packed-snow berms either side */
  for (let index = 0; index < profile.length - 1; index++) {
    const [fromZ, fromY] = profile[index];
    const [toZ, toY] = profile[index + 1];
    const length = Math.hypot(toZ - fromZ, toY - fromY);
    const angle = Math.atan2(fromY - toY, toZ - fromZ);
    lanes.forEach((laneX, lane) => {
      builder.box(
        "matte",
        index % 2 === 0 ? laneSnow : shade(laneSnow, 1.03),
        [laneHalf * 2, 0.03, length + 0.02],
        [laneX, (fromY + toY) / 2 + 0.015, (fromZ + toZ) / 2],
        [angle, 0, 0],
      );
      if (builder.isFar) {
        return;
      }
      [-1, 1].forEach((sideX) => {
        if (lane > 0 && sideX < 0) {
          return;
        }
        builder.bar(
          "matte",
          berm,
          [laneX + sideX * (laneHalf + 0.12), fromY + 0.04, fromZ],
          [laneX + sideX * (laneHalf + 0.12), toY + 0.04, toZ],
          0.24,
          5,
        );
      });
    });
  }
  /* The top: a timber edge, railings and the starting gates */
  builder.box(
    "matte",
    palette.paleTimber,
    [hill.maxX - hill.minX, 0.08, 0.3],
    [(hill.minX + hill.maxX) / 2, hillHeight + 0.04, hill.topZ - 0.15],
  );
  [hill.minX + 0.08, hill.maxX - 0.08].forEach((x) => {
    builder.bar(
      "paint",
      carpetOrange,
      [x, hillHeight + 0.9, hill.backZ + 0.1],
      [x, hillHeight + 0.9, hill.topZ - 0.3],
      0.07,
      6,
    );
  });
  builder.bar(
    "paint",
    carpetOrange,
    [hill.minX + 0.08, hillHeight + 0.9, hill.backZ + 0.1],
    [hill.maxX - 0.08, hillHeight + 0.9, hill.backZ + 0.1],
    0.07,
    6,
  );
  const posts: [number, number][] = [
    [hill.minX + 0.08, hill.backZ + 0.1],
    [hill.maxX - 0.08, hill.backZ + 0.1],
    [hill.minX + 0.08, hill.topZ - 0.3],
    [hill.maxX - 0.08, hill.topZ - 0.3],
    [(hill.minX + hill.maxX) / 2, hill.backZ + 0.1],
    [hill.minX + 0.08, (hill.backZ + hill.topZ) / 2],
  ];
  posts.forEach(([x, z]) => {
    builder.box("paint", trim, [0.1, 0.95, 0.1], [x, hillHeight + 0.47, z]);
  });
  /* Gate arches over the top of each lane */
  lanes.forEach((laneX, lane) => {
    builder.torus(
      "paint",
      tubeColours[lane],
      laneHalf + 0.05,
      0.06,
      [laneX, hillHeight + 0.05, hill.topZ - 0.2],
      "z",
      builder.isFar ? 8 : 16,
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        trim,
        [0.32, 0.22, 0.04],
        [laneX, hillHeight + 0.85, hill.topZ - 0.17],
      );
      builder.box(
        "paint",
        tubeColours[lane],
        [0.1, 0.14, 0.02],
        [laneX, hillHeight + 0.85, hill.topZ - 0.14],
      );
    }
  });
};

/* The bottom: a soft bumper to stop the tubes, and the run-out */
const buildRunOut = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    snowShadow,
    [hill.maxX - hill.minX + 0.6, 0.02, bumperZ - hill.bottomZ],
    [(hill.minX + hill.maxX) / 2, 0.01, (hill.bottomZ + bumperZ) / 2],
  );
  const segments = builder.isFar ? 1 : 6;
  for (let piece = 0; piece < segments; piece++) {
    const width = (hill.maxX - hill.minX) / segments;
    builder.cylinder("paint", piece % 2 === 0 ? "#e8452f" : trim, {
      radius: 0.14,
      length: width - 0.02,
      at: [hill.minX + width * (piece + 0.5), 0.14, bumperZ],
      axis: "x",
      segments: 12,
    });
  }
};

/* ------------------------------------------------------------------ */
/* The magic carpet up the side                                        */
/* ------------------------------------------------------------------ */

const buildCarpet = (builder: AttractionBuilder) => {
  const { x, bottomZ, topZ, half } = carpet;
  const length = Math.hypot(bottomZ - topZ, hillHeight);
  const angle = Math.atan2(hillHeight, bottomZ - topZ);
  const middleZ = (bottomZ + topZ) / 2;
  const middleY = hillHeight / 2;
  /* The belt and its frame */
  const ribs = builder.isFar ? 1 : 24;
  builder.painted(
    new BoxGeometry(half * 2, 0.08, length, 1, 1, ribs),
    (centre) =>
      Math.floor(((centre.z - topZ) / (bottomZ - topZ)) * ribs) % 2 === 0
        ? "#25282d"
        : "#33373d",
    { at: [x, middleY + 0.08, middleZ], rotation: [angle, 0, 0] },
    "matte",
    undefined,
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      palette.steel,
      [0.1, 0.22, length],
      [x + side * (half + 0.05), middleY + 0.1, middleZ],
      [angle, 0, 0],
    );
    /* Handrails */
    builder.box(
      "paint",
      carpetOrange,
      [0.06, 0.06, length],
      [x + side * (half + 0.08), middleY + 0.95, middleZ],
      [angle, 0, 0],
    );
  });
  /* Legs under it, and hoops that hold its see-through cover */
  const hoops = builder.isFar ? 4 : 9;
  for (let hoop = 0; hoop <= hoops; hoop++) {
    const share = hoop / hoops;
    const z = bottomZ + (topZ - bottomZ) * share;
    const y = hillHeight * share;
    if (y > 0.3) {
      [-1, 1].forEach((side) => {
        builder.box(
          "metal",
          palette.darkSteel,
          [0.08, y, 0.08],
          [x + side * (half + 0.05), y / 2, z],
        );
      });
    }
    builder.add(
      "paint",
      hoop % 2 === 0 ? carpetOrange : trim,
      new ExtrudeGeometry(
        (() => {
          const arch = new Shape();
          arch.absarc(0, 0, half + 0.14, 0, Math.PI, false);
          arch.absarc(0, 0, half + 0.08, Math.PI, 0, true);
          return arch;
        })(),
        {
          depth: 0.06,
          bevelEnabled: false,
          curveSegments: builder.segments(6, 3),
        },
      ),
      { at: [x, y + 0.6, z] },
    );
  }
  /* The clear cover */
  if (!builder.isFar) {
    [-0.55, 0, 0.55].forEach((tilt) => {
      builder.box(
        "glass",
        "#cfe8f6",
        [0.42, 0.02, length],
        [
          x + Math.sin(tilt) * (half + 0.11),
          middleY + 0.6 + Math.cos(tilt) * (half + 0.11),
          middleZ,
        ],
        [angle, 0, -tilt],
      );
    });
  }
  /* A little platform at the top, joining the hill */
  builder.box(
    "matte",
    palette.paleTimber,
    [x - hill.maxX + 0.5, 0.12, 1.2],
    [(x + hill.maxX) / 2, hillHeight + 0.02, topZ - 0.4],
  );
};

/* ------------------------------------------------------------------ */
/* The snow cannon and its spray                                       */
/* ------------------------------------------------------------------ */

const buildCannonTower = (builder: AttractionBuilder) => {
  const [x, y, z] = cannonAt;
  builder.cylinder("metal", palette.steel, {
    radius: 0.1,
    radiusEnd: 0.07,
    length: y,
    at: [x, y / 2, z],
    segments: 10,
  });
  builder.box("matte", palette.darkStone, [0.5, 0.2, 0.5], [x, 0.1, z]);
  /* The barrel, pointing up over the hill */
  builder.cylinder("paint", "#ffcf3a", {
    radius: 0.46,
    radiusEnd: 0.42,
    length: 0.8,
    at: [x + 0.25, y + 0.2, z],
    axis: "x",
    segments: builder.isFar ? 10 : 20,
    isOpen: true,
  });
  builder.torus(
    "paint",
    palette.black,
    0.46,
    0.05,
    [x + 0.65, y + 0.2, z],
    "x",
    builder.isFar ? 10 : 20,
  );
  builder.box("paint", "#ffcf3a", [0.3, 0.3, 0.3], [x - 0.25, y + 0.05, z]);
  if (!builder.isFar) {
    builder.bar(
      "matte",
      palette.black,
      [x, y - 0.2, z],
      [x, 0.4, z + 0.3],
      0.05,
      5,
    );
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.04,
      length: 0.5,
      at: [x + 0.25, y + 0.2, z],
      axis: "x",
      segments: 8,
    });
  }
};

/* The cannon's fan, which roars round faster as the Character comes */
const buildFan = (builder: AttractionBuilder) => {
  builder.sphere("metal", palette.darkSteel, 0.08, [0, 0, 0], [1.4, 1, 1], 10);
  for (let blade = 0; blade < 5; blade++) {
    const turn = (blade / 5) * Math.PI * 2;
    builder.box(
      "metal",
      palette.steel,
      [0.03, 0.38, 0.14],
      [0, Math.cos(turn) * 0.22, Math.sin(turn) * 0.22],
      [turn, 0.35, 0],
    );
  }
};

/* Snow puffing up out of the cannon, higher as the Character comes */
const buildSpray = (builder: AttractionBuilder) => {
  const puffs = builder.isFar ? 3 : 6;
  for (let puff = 0; puff < puffs; puff++) {
    const share = puff / (puffs - 1);
    builder.sphere(
      "matte",
      puff % 2 === 0 ? snowBright : "#e9f3fa",
      0.18 + share * 0.3,
      [0.3 + share * 1.1, share * 1.6, Math.sin(puff * 1.7) * 0.2],
      [1, 0.8, 1],
      builder.isFar ? 6 : 9,
    );
  }
};

/* ------------------------------------------------------------------ */
/* The starter's hut, flag and lamp on top                             */
/* ------------------------------------------------------------------ */

const buildStarterHut = (builder: AttractionBuilder) => {
  const x = -3.6;
  const z = -7.25;
  const y = hillHeight;
  builder.box("matte", faluRed, [1.4, 1.4, 1.0], [x, y + 0.7, z]);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      roofGrey,
      [1.7, 0.08, 0.72],
      [x, y + 1.6, z + side * 0.3],
      [side * 0.6, 0, 0],
    );
    builder.box(
      "matte",
      snow,
      [1.64, 0.07, 0.66],
      [x, y + 1.66, z + side * 0.31],
      [side * 0.6, 0, 0],
    );
  });
  builder.box("paint", trim, [1.42, 0.08, 1.02], [x, y + 1.36, z]);
  addWindow(builder, {
    at: [x, y + 0.85, z + 0.51],
    width: 0.8,
    height: 0.5,
    frame: trim,
    isLit: true,
  });
  /* The lamp's post */
  builder.cylinder("paint", palette.black, {
    radius: 0.04,
    length: 1.9,
    at: [lampAt[0], y + 0.95, lampAt[2]],
    segments: 8,
  });
};

const buildLamp = (builder: AttractionBuilder) => {
  builder.sphere("glow", palette.warmLight, 0.16, [0, 0, 0], [1, 1.2, 1], 12);
  builder.cylinder("paint", palette.black, {
    radius: 0.18,
    radiusEnd: 0.02,
    length: 0.12,
    at: [0, 0.22, 0],
    segments: 10,
  });
};

const buildFlag = (builder: AttractionBuilder) => {
  builder.cylinder("paint", trim, {
    radius: 0.03,
    length: 1.6,
    at: [0, 0.8, 0],
    segments: 6,
  });
  builder.box("matte", "#3fb36b", [0.55, 0.36, 0.02], [0.3, 1.38, 0]);
  builder.box("matte", trim, [0.55, 0.06, 0.025], [0.3, 1.38, 0]);
};

/* ------------------------------------------------------------------ */
/* The tube hire hut, tube stacks and trees                            */
/* ------------------------------------------------------------------ */

const addTube = (builder: AttractionBuilder, at: Triple, colour: string) => {
  builder.torus("paint", colour, 0.36, 0.16, at, "y", builder.isFar ? 8 : 11);
};

const buildHireHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = hireHut;
  const planks = builder.isFar ? 1 : 9;
  builder.painted(
    new BoxGeometry(width, wall, depth, 1, planks, 1),
    (centre) =>
      Math.floor(centre.y / (wall / planks)) % 2 === 0
        ? faluRed
        : shade(faluRed, 0.88),
    { at: [x, wall / 2 + 0.1, z] },
    "matte",
    undefined,
  );
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.14, 0.1, depth + 0.14],
    [x, 0.05, z],
  );
  const eaves = wall + 0.1;
  const rise = 0.8;
  const gable = new Shape([
    new Vector2(-width / 2, 0),
    new Vector2(width / 2, 0),
    new Vector2(0, rise),
  ]);
  [z + depth / 2 - 0.1, z - depth / 2].forEach((gableZ) => {
    builder.add(
      "matte",
      shade(faluRed, 0.9),
      new ExtrudeGeometry(gable, { depth: 0.1, bevelEnabled: false }),
      { at: [x, eaves, gableZ] },
    );
  });
  const overhang = 0.3;
  const halfSpan = width / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (width / 2)));
  const angle = Math.atan2(rise, width / 2);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofGrey,
      [slope, 0.1, depth + overhang * 2],
      [x + (side * halfSpan) / 2, eaves + rise / 2 + 0.02, z],
      [0, 0, -side * angle],
    );
    builder.box(
      "matte",
      snow,
      [slope - 0.1, 0.1, depth + overhang * 2 - 0.1],
      [x + (side * halfSpan) / 2 + side * 0.02, eaves + rise / 2 + 0.11, z],
      [0, 0, -side * angle],
    );
  });
  [-1, 1].forEach((sideX) => {
    builder.box(
      "paint",
      trim,
      [0.1, wall, 0.1],
      [x + sideX * (width / 2), wall / 2 + 0.1, z + depth / 2],
    );
  });
  /* The hatch the tubes are handed out of */
  builder.box(
    "glow",
    "#e9b56c",
    [1.2, 0.6, 0.02],
    [x - 0.3, 1.1, z + depth / 2 + 0.01],
  );
  builder.box(
    "paint",
    trim,
    [1.36, 0.07, 0.36],
    [x - 0.3, 0.78, z + depth / 2 + 0.14],
  );
  addDoor(builder, {
    at: [x + width / 2 + 0.005, 0.1, z],
    colour: "#2f4a5f",
    frame: trim,
    turn: Math.PI / 2,
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    signColour,
    [1.4, 0.28, 0.04],
    [x, eaves + 0.28, z + depth / 2 + 0.02],
  );
  tubeColours.forEach((colour, index) => {
    builder.sphere(
      "paint",
      colour,
      0.06,
      [x - 0.5 + index * 0.25, eaves + 0.28, z + depth / 2 + 0.05],
      [1, 1, 0.5],
      8,
    );
  });
};

const pines: [number, number, number][] = [
  [-7.4, -5.6, 1.2],
  [-6.8, 1.4, 1.0],
  [4.6, -7.4, 1.3],
  [6.6, -4.0, 1.05],
  [8.2, -0.6, 0.9],
  [-8.2, -2.2, 0.85],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* Tubes stacked by the carpet, and waiting at the top */
  [0, 1, 2, 3].forEach((level) => {
    addTube(
      builder,
      [carpet.x + 1.1, 0.16 + level * 0.3, carpet.bottomZ + 1.5],
      tubeColours[level],
    );
  });
  [0, 1, 2].forEach((level) => {
    addTube(
      builder,
      [carpet.x + 1.2, 0.16 + level * 0.3, carpet.bottomZ - 0.4],
      tubeColours[level + 2],
    );
  });
  lanes.forEach((laneX, lane) => {
    addTube(
      builder,
      [laneX, hillHeight + 0.16, hill.topZ - 0.75],
      tubeColours[(lane + 1) % tubeColours.length],
    );
  });
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  builder.box(
    "matte",
    "#b9b2a6",
    [1.2, 0.02, 5.4],
    [carpet.x + 0.6, 0.01, 5.0],
  );
  addBench(builder, [-3.4, 0, 5.4], Math.PI, faluRed);
  addBench(builder, [-0.6, 0, 5.4], Math.PI, faluRed);
  addLampPost(builder, [1.2, 0, 6.4]);
  addLampPost(builder, [4.4, 0, 5.0]);
  if (builder.isFar) {
    return;
  }
  [
    [-6.2, 4.6, 0.55],
    [6.8, 6.0, 0.45],
    [-2.0, 7.4, 0.4],
    [7.6, -2.8, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowShadow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
};

/* Children carrying their tubes back to the carpet */
const buildTuber = (builder: AttractionBuilder) => {
  const coat = "#2f7fd8";
  [-0.07, 0.07].forEach((side) => {
    builder.cylinder("matte", "#2b3442", {
      radius: 0.05,
      length: 0.36,
      at: [side, 0.18, 0],
      segments: 6,
    });
    builder.box("matte", palette.black, [0.09, 0.08, 0.16], [side, 0.04, 0.03]);
  });
  builder.lathe(
    "matte",
    coat,
    [
      [0, 0.34],
      [0.14, 0.36],
      [0.15, 0.52],
      [0.12, 0.66],
      [0, 0.68],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 5 : 9,
  );
  builder.sphere("matte", "#f0c8a8", 0.1, [0, 0.78, 0], [1, 1, 1], 9);
  builder.sphere("matte", "#e8452f", 0.105, [0, 0.83, 0], [1, 0.75, 1], 9);
  builder.sphere("matte", trim, 0.035, [0, 0.93, 0], [1, 1, 1], 5);
  /* The tube held at its side */
  builder.torus(
    "paint",
    "#f2c230",
    0.26,
    0.11,
    [0.32, 0.5, 0],
    "x",
    builder.isFar ? 6 : 12,
  );
};

/* ------------------------------------------------------------------ */
/* The ride: up the magic carpet and spinning down a lane              */
/* ------------------------------------------------------------------ */

const laneX = lanes[1];

const tubeRide = (progress: number): LocalSpot => {
  if (progress < 0.06) {
    const share = progress / 0.06;
    return {
      x: carpet.x,
      y: 0.1 * share,
      z: rideStart.z + (carpet.bottomZ - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.42) {
    const share = (progress - 0.06) / 0.36;
    const z = carpet.bottomZ + (carpet.topZ - carpet.bottomZ) * share;
    return { x: carpet.x, y: carpetHeightAt(z) + 0.12, z, heading: Math.PI };
  }
  const topZ = hill.topZ - 0.75;
  if (progress < 0.52) {
    const share = (progress - 0.42) / 0.1;
    const fromZ = carpet.topZ - 0.4;
    return {
      x: carpet.x + (laneX - carpet.x) * share,
      y: hillHeight + 0.05,
      z: fromZ + (topZ - fromZ) * share,
      heading: -Math.PI / 2,
    };
  }
  if (progress < 0.92) {
    const share = ((progress - 0.52) / 0.4) ** 1.5;
    const z = topZ + (bumperZ - 0.6 - topZ) * share;
    return {
      x: laneX + 0.12 * Math.sin(share * 9),
      y: hillHeightAt(z) + 0.18,
      z,
      heading: share * Math.PI * 6,
    };
  }
  const share = (progress - 0.92) / 0.08;
  const fromZ = bumperZ - 0.6;
  return {
    x: laneX + (rideFinish.x - laneX) * share,
    y: 0.18 * (1 - share),
    z: fromZ + (rideFinish.z - fromZ) * share,
    heading: Math.PI / 2,
  };
};

const hillDeck: Deck = ({ x, z }) =>
  x >= hill.minX && x <= hill.maxX && z >= hill.backZ && z <= hill.bottomZ
    ? { height: hillHeightAt(z), kind: "trail" }
    : undefined;

export const snowTubingHillModel: NewLandAttractionModel = {
  kind: "snow-tubing-hill",
  islandId: "frost-isle",
  name: "Snow Tubing Hill",
  fact: "A snow tube is a big rubber ring filled with air. It is smooth and slippery underneath, so it slides fast over snow, and its squashy, bouncy air keeps riders comfy over the bumps. The slope of the hill pulls the tube down, faster and faster.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of everyday materials, including rubber and plastic, for particular uses, and find out how the shapes of solid objects can be changed by squashing.",
  footprint: 10.5,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildHill(builder);
    buildRunOut(builder);
    buildCarpet(builder);
    buildCannonTower(builder);
    buildStarterHut(builder);
    buildHireHut(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "snow cannon fan",
      pivot: [cannonAt[0] + 0.35, cannonAt[1] + 0.2, cannonAt[2]],
      build: buildFan,
      motion: { kind: "whirl", axis: "x", idle: 1, speed: 18, reach: 6 },
    },
    {
      name: "snow spray",
      pivot: [cannonAt[0] + 0.7, cannonAt[1] + 0.3, cannonAt[2]],
      build: buildSpray,
      motion: { kind: "splash", reach: 6, period: 1.2 },
    },
    {
      name: "starter's flag",
      pivot: flagAt,
      build: buildFlag,
      motion: { kind: "nod", axis: "z", reach: 7, amplitude: 0.5, period: 0.8 },
    },
    {
      name: "starter's lamp",
      pivot: lampAt,
      build: buildLamp,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "tubers",
      build: buildTuber,
      count: 2,
      centre: { x: -1.8, z: 4.8 },
      radius: 1.2,
      speed: 0.6,
    },
  ],
  smoke: [
    {
      at: [hireHut.x - 0.5, hireHut.wall + 1.0, hireHut.z],
      colour: "#d8dcdf",
      puffs: 4,
      size: 0.12,
      rise: 1.2,
      spread: 0.3,
    },
  ],
  blockers: [
    { x: hireHut.x - 0.6, z: hireHut.z, radius: 1.0 },
    { x: hireHut.x + 0.6, z: hireHut.z, radius: 1.0 },
    { x: cannonAt[0], z: cannonAt[2], radius: 0.35 },
  ] satisfies LocalBlocker[],
  decks: [hillDeck],
  rides: [
    {
      id: "snow-tube",
      name: "the snow tubing hill",
      start: rideStart,
      reach: 0.7,
      seconds: 14,
      finish: rideFinish,
      follow: tubeRide,
    },
  ],
  play: {
    label: "Spin down the hill",
    news: "Whoosh! Your squashy snow tube spun round and round all the way down the hill and bounced to a stop.",
  },
};
