import { BoxGeometry, CatmullRomCurve3, ConeGeometry, Vector3 } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#edf3f7";
const frostWhite = "#f8fbfd";
const ice = "#cfe9f5";
const trackWhite = "#f2f4f3";
const trackBlue = "#2c5d9a";
const faluRed = "#9b2f26";
const trim = "#f1ece0";
const roofSlate = "#3b4450";
const pine = "#2d5a40";
const bobYellow = "#f0b62e";
const bobRed = "#d8342c";
const signColour = "#2c5d9a";
const stripeColours = [bobRed, trackBlue, bobYellow, "#3f9a4a"];

/* The track snakes down from the start house at the back to the front */
const trackCurve = new CatmullRomCurve3([
  new Vector3(-5.6, 3.5, -6.8),
  new Vector3(-5.6, 3.25, -4.6),
  new Vector3(-4.4, 2.85, -2.4),
  new Vector3(-1.4, 2.4, -2.6),
  new Vector3(1.6, 2.0, -4.4),
  new Vector3(4.7, 1.6, -4.1),
  new Vector3(6.2, 1.25, -1.5),
  new Vector3(5.1, 0.9, 1.2),
  new Vector3(2.4, 0.55, 2.5),
  new Vector3(-0.8, 0.3, 3.5),
  new Vector3(-3.8, 0.2, 4.5),
  new Vector3(-6.0, 0.2, 5.2),
]);
const trackWidth = 1.0;
const hut = { minX: -6.6, maxX: -4.6, minZ: -8.0, maxZ: -6.0, floor: 3.35 };
const stairX = -4.2;
const rideStart = { x: -3.3, z: -3.9 };
const rideFinish = { x: -5.4, z: 7.0 };
const stand = { minX: 1.2, maxX: 4.6, minZ: 4.6, maxZ: 6.0 };
const boardAt = { x: 6.6, z: 3.6 };
const signAt: Triple = [-1.4, 0, 7.6];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** A box laid from one point to another, `side` across and `lift` up. */
const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Vector3,
  to: Vector3,
  [width, thickness]: [number, number],
  side = 0,
  lift = 0,
) => {
  const flat = Math.hypot(to.x - from.x, to.z - from.z);
  const length = Math.hypot(flat, to.y - from.y);
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  const pitch = Math.atan2(from.y - to.y, flat);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, length + 0.03)
      .rotateX(pitch)
      .rotateY(yaw),
    {
      at: [
        (from.x + to.x) / 2 + Math.cos(yaw) * side,
        (from.y + to.y) / 2 + lift,
        (from.z + to.z) / 2 - Math.sin(yaw) * side,
      ],
    },
    undefined,
  );
};

const addFir = (builder: AttractionBuilder, x: number, z: number, size = 1) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const radius = (0.85 - tier * 0.22) * size;
    const y = (0.5 + tier * 0.55) * size;
    builder.add(
      "matte",
      shade(pine, 1 + tier * 0.07),
      new ConeGeometry(radius, 0.95 * size, builder.segments(9, 6)),
      { at: [x, y + 0.45 * size, z] },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        frostWhite,
        new ConeGeometry(radius * 0.55, 0.34 * size, 9),
        { at: [x, y + 0.78 * size, z] },
      );
    }
  }
};

/** A bobsleigh: a sleek shell on runners, nose towards +z. */
const addBobsleigh = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour: string,
) => {
  const [x, y, z] = at;
  const place = (dx: number, dy: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y + dy,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  builder.sphere(
    "paint",
    colour,
    0.3,
    place(0, 0.22, 0),
    [0.95, 0.55, 2.6],
    12,
  );
  builder.box("paint", palette.black, [0.4, 0.06, 0.9], place(0, 0.38, -0.15), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", frostWhite, [0.06, 0.04, 1.2], place(0.29, 0.22, 0), [
    0,
    turn,
    0,
  ]);
  builder.box("paint", frostWhite, [0.06, 0.04, 1.2], place(-0.29, 0.22, 0), [
    0,
    turn,
    0,
  ]);
  [-0.2, 0.2].forEach((side) => {
    builder.box(
      "metal",
      palette.steel,
      [0.03, 0.04, 1.4],
      place(side, 0.03, 0),
      [0, turn, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The track                                                           */
/* ------------------------------------------------------------------ */

const buildTrack = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 14 : 36;
  const points = trackCurve.getSpacedPoints(steps);
  for (let index = 0; index < steps; index++) {
    const from = points[index];
    const to = points[index + 1];
    /* How sharply it bends here, and which way: the outside wall is banked higher */
    const before = trackCurve.getTangentAt(index / steps);
    const after = trackCurve.getTangentAt((index + 1) / steps);
    const bend = before.x * after.z - before.z * after.x;
    const bank = Math.min(0.45, Math.abs(bend) * 3.5);
    const outside = bend > 0 ? 1 : -1;
    addSlab(
      builder,
      "glass",
      index % 2 === 0 ? ice : shade(ice, 1.04),
      from,
      to,
      [trackWidth, 0.08],
    );
    [-1, 1].forEach((side) => {
      const height = 0.4 + (side === outside ? bank : 0);
      addSlab(
        builder,
        "paint",
        trackWhite,
        from,
        to,
        [0.1, height],
        side * (trackWidth / 2 + 0.05),
        height / 2 - 0.04,
      );
      if (!builder.isFar) {
        addSlab(
          builder,
          "paint",
          trackBlue,
          from,
          to,
          [0.14, 0.05],
          side * (trackWidth / 2 + 0.05),
          height - 0.03,
        );
        addSlab(
          builder,
          "paint",
          stripeColours[index % stripeColours.length],
          from,
          to,
          [0.02, 0.12],
          side * (trackWidth / 2 + 0.11),
          height * 0.45,
        );
      }
    });
    if (!builder.isFar) {
      addSlab(
        builder,
        "paint",
        shade(trackWhite, 0.8),
        from,
        to,
        [trackWidth + 0.2, 0.06],
        0,
        -0.07,
      );
    }
  }
  /* Timber legs and cross beams under the high parts */
  const legSteps = builder.isFar ? 7 : 14;
  for (let index = 1; index < legSteps; index++) {
    const share = index / legSteps;
    const point = trackCurve.getPointAt(share);
    if (point.y < 0.6) {
      continue;
    }
    const tangent = trackCurve.getTangentAt(share);
    const yaw = Math.atan2(tangent.x, tangent.z);
    [-1, 1].forEach((side) => {
      const x = point.x + Math.cos(yaw) * side * 0.42;
      const z = point.z - Math.sin(yaw) * side * 0.42;
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.07,
        length: point.y - 0.1,
        at: [x, (point.y - 0.1) / 2, z],
        segments: 6,
      });
    });
    if (!builder.isFar) {
      builder.box(
        "matte",
        palette.timber,
        [trackWidth + 0.1, 0.1, 0.12],
        [point.x, point.y - 0.14, point.z],
        [0, yaw, 0],
      );
      if (point.y > 1.6) {
        builder.box(
          "matte",
          palette.timber,
          [trackWidth, 0.08, 0.08],
          [point.x, point.y * 0.45, point.z],
          [0, yaw, 0],
        );
      }
    }
  }
  /* The finish: a padded buffer at the end of the straight */
  const end = trackCurve.getPointAt(1);
  builder.box(
    "paint",
    bobRed,
    [0.5, 0.7, 1.3],
    [end.x - 0.35, 0.35, end.z],
    [0, 0.35, 0],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      frostWhite,
      [0.52, 0.12, 1.32],
      [end.x - 0.35, 0.5, end.z],
      [0, 0.35, 0],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The start house, up on stilts                                       */
/* ------------------------------------------------------------------ */

const buildStartHouse = (builder: AttractionBuilder) => {
  const width = hut.maxX - hut.minX;
  const depth = hut.maxZ - hut.minZ;
  const middleX = (hut.minX + hut.maxX) / 2;
  const middleZ = (hut.minZ + hut.maxZ) / 2;
  /* The stilts and deck */
  [hut.minX + 0.12, hut.maxX - 0.12].forEach((x) => {
    [hut.minZ + 0.12, hut.maxZ + 0.6].forEach((z) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.18, hut.floor, 0.18],
        [x, hut.floor / 2, z],
      );
    });
  });
  builder.box(
    "matte",
    palette.timber,
    [width + 0.2, 0.14, depth + 0.8],
    [middleX, hut.floor - 0.07, middleZ + 0.3],
  );
  /* The red timber house, its roof and a big front opening for the track */
  const wallHeight = 1.7;
  const wallY = hut.floor + wallHeight / 2;
  builder.box(
    "matte",
    faluRed,
    [width, wallHeight, 0.12],
    [middleX, wallY, hut.minZ + 0.06],
  );
  [hut.minX + 0.06, hut.maxX - 0.06].forEach((x) => {
    builder.box(
      "matte",
      faluRed,
      [0.12, wallHeight, depth],
      [x, wallY, middleZ],
    );
  });
  builder.box(
    "matte",
    faluRed,
    [width, 0.5, 0.12],
    [middleX, hut.floor + wallHeight - 0.25, hut.maxZ - 0.06],
  );
  addGable(builder, middleX, middleZ, width, depth, hut.floor + wallHeight);
  if (builder.isFar) {
    return;
  }
  /* Board-and-batten strips, white corners and windows */
  for (let strip = 0; strip < 7; strip++) {
    const z = hut.minZ + 0.2 + strip * 0.27;
    [hut.minX, hut.maxX].forEach((x) => {
      builder.box(
        "matte",
        shade(faluRed, 0.85),
        [0.15, wallHeight, 0.04],
        [x, wallY, z],
      );
    });
  }
  [hut.minX, hut.maxX].forEach((x) => {
    [hut.minZ, hut.maxZ].forEach((z) => {
      builder.box(
        "paint",
        trim,
        [0.16, wallHeight + 0.02, 0.16],
        [x, wallY, z],
      );
    });
    builder.box(
      "glass",
      palette.glass,
      [0.14, 0.55, 0.7],
      [x, hut.floor + 1.0, middleZ],
    );
    builder.box(
      "paint",
      trim,
      [0.16, 0.06, 0.8],
      [x, hut.floor + 0.7, middleZ],
    );
    builder.box(
      "paint",
      trim,
      [0.16, 0.06, 0.8],
      [x, hut.floor + 1.3, middleZ],
    );
  });
  builder.box(
    "paint",
    trim,
    [width + 0.04, 0.08, 0.16],
    [middleX, hut.floor + wallHeight - 0.5, hut.maxZ - 0.04],
  );
  /* A railing round the front of the deck */
  [hut.minX - 0.05, hut.maxX + 0.05].forEach((x) => {
    builder.bar(
      "paint",
      trim,
      [x, hut.floor + 0.8, hut.maxZ],
      [x, hut.floor + 0.8, hut.maxZ + 0.65],
      0.05,
      5,
    );
    builder.box(
      "paint",
      trim,
      [0.05, 0.8, 0.05],
      [x, hut.floor + 0.4, hut.maxZ + 0.65],
    );
  });
  /* The steps up the side, and a ladder of handrails */
  const stairs = 10;
  for (let step = 0; step < stairs; step++) {
    const share = (step + 1) / stairs;
    builder.box(
      "matte",
      step % 2 === 0 ? palette.timber : shade(palette.timber, 0.9),
      [0.8, 0.07, 0.34],
      [stairX, hut.floor * share - 0.04, -4.7 - share * 1.9],
    );
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [stairX + side * 0.42, 0, -4.6],
      [stairX + side * 0.42, hut.floor, -6.6],
      0.08,
      5,
    );
    builder.bar(
      "paint",
      trim,
      [stairX + side * 0.42, 0.9, -4.6],
      [stairX + side * 0.42, hut.floor + 0.9, -6.6],
      0.05,
      5,
    );
  });
  /* A bob waiting at the top */
  addBobsleigh(
    builder,
    [middleX + 0.7, hut.floor, middleZ - 0.2],
    0,
    bobYellow,
  );
  /* A flag on the roof */
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 1.1,
    at: [hut.maxX - 0.2, hut.floor + wallHeight + 1.3, middleZ],
    segments: 6,
  });
};

const addGable = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  width: number,
  depth: number,
  y: number,
) => {
  const rise = 0.8;
  const half = width / 2 + 0.25;
  const slope = Math.hypot(half, rise);
  const angle = Math.atan2(rise, half);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofSlate,
      [slope + 0.02, 0.1, depth + 0.5],
      [x + (side * half) / 2, y + rise / 2, z],
      [0, 0, -side * angle],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        frostWhite,
        [slope * 0.8, 0.08, depth + 0.52],
        [x + (side * half) / 2 + side * 0.05, y + rise / 2 + 0.07, z],
        [0, 0, -side * angle],
      );
    }
  });
  /* Gable ends */
  [z - depth / 2 + 0.06, z + depth / 2 - 0.06].forEach((endZ) => {
    builder.add(
      "matte",
      faluRed,
      new ConeGeometry(width / 2 + 0.04, rise, 4, 1)
        .rotateY(Math.PI / 4)
        .scale(1.41, 1, 0.08),
      { at: [x, y + rise / 2, endZ] },
    );
  });
};

/* ------------------------------------------------------------------ */
/* The grandstand, scoreboard and grounds                              */
/* ------------------------------------------------------------------ */

const buildGrandstand = (builder: AttractionBuilder) => {
  const width = stand.maxX - stand.minX;
  const middleX = (stand.minX + stand.maxX) / 2;
  [0, 1, 2].forEach((tier) => {
    const height = 0.35 + tier * 0.35;
    const z = stand.minZ + 0.25 + tier * 0.45;
    builder.box(
      "matte",
      palette.timber,
      [width, height, 0.46],
      [middleX, height / 2, z],
    );
    builder.box(
      "paint",
      tier % 2 === 0 ? trackBlue : faluRed,
      [width, 0.06, 0.38],
      [middleX, height + 0.03, z],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* A canopy over the back row */
  [stand.minX + 0.1, stand.maxX - 0.1].forEach((x) => {
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.05,
      length: 2.3,
      at: [x, 1.15, stand.maxZ - 0.05],
      segments: 6,
    });
  });
  builder.box(
    "paint",
    faluRed,
    [width + 0.3, 0.08, 1.2],
    [middleX, 2.35, stand.maxZ - 0.5],
    [0.18, 0, 0],
  );
  builder.box(
    "paint",
    trim,
    [width + 0.32, 0.12, 0.06],
    [middleX, 2.28, stand.maxZ - 1.08],
  );
  /* Spectators' scarves and flags left on the benches */
  [0.4, 1.3, 2.2, 3.0].forEach((dx, index) => {
    builder.box(
      "matte",
      stripeColours[index],
      [0.35, 0.04, 0.12],
      [
        stand.minX + dx,
        0.38 + (index % 3) * 0.35 + 0.04,
        stand.minZ + 0.25 + (index % 3) * 0.45,
      ],
    );
  });
};

const buildScoreboard = (builder: AttractionBuilder) => {
  const { x, z } = boardAt;
  const turn = -0.9;
  [-0.6, 0.6].forEach((side) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.1, 2.6, 0.1],
      [x + side * Math.cos(turn), 1.3, z - side * Math.sin(turn)],
    );
  });
  builder.box("paint", "#1f2b3d", [1.6, 0.9, 0.1], [x, 2.4, z], [0, turn, 0]);
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    trackBlue,
    [1.7, 0.18, 0.12],
    [x, 2.95, z],
    [0, turn, 0],
  );
  /* The time, in glowing digits */
  [-0.5, -0.25, 0.05, 0.3, 0.55].forEach((dx, index) => {
    const out = 0.06;
    builder.box(
      "glow",
      index === 2 ? palette.warmLight : "#ffcf5a",
      [index === 2 ? 0.05 : 0.17, index === 2 ? 0.05 : 0.32, 0.01],
      [
        x + dx * Math.cos(turn) + out * Math.sin(turn),
        2.35,
        z - dx * Math.sin(turn) + out * Math.cos(turn),
      ],
      [0, turn, 0],
    );
  });
};

const firs: [number, number, number][] = [
  [-8.6, -1.4, 1.2],
  [8.2, -6.2, 1.1],
  [1.2, -8.6, 1.0],
  [-2.2, -8.4, 0.8],
  [-8.8, 2.2, 0.85],
  [8.9, 1.2, 0.8],
];

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 3) {
      addFir(builder, x, z, size);
    }
  });
  if (builder.isFar) {
    return;
  }
  [
    [0.2, 0.2, 0.7],
    [-2.4, -0.4, 0.5],
    [3.4, -1.2, 0.55],
    [6.8, -3.2, 0.45],
    [-7.6, -4.8, 0.6],
    [6.4, 6.6, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A bob tipped up by the finish, and flags along the straight */
  addBobsleigh(builder, [-7.4, 0, 3.6], 0.4, bobRed);
  [-3.0, -0.2, 2.6].forEach((x, index) => {
    const z = trackCurve.getPointAt(0.86 + index * 0.04).z;
    const poleZ = Math.min(z + 1.0, 5.4);
    builder.cylinder("paint", frostWhite, {
      radius: 0.03,
      length: 1.8,
      at: [x, 0.9, poleZ],
      segments: 6,
    });
    builder.add(
      "paint",
      stripeColours[index],
      new ConeGeometry(0.15, 0.55, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.15),
      { at: [x + 0.28, 1.6, poleZ] },
    );
  });
  /* Lamps along the path to the grandstand */
  [
    [0.2, 6.2],
    [5.4, 7.2],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.05,
      length: 2.2,
      at: [x, 1.1, z],
      segments: 6,
    });
    builder.box("glow", palette.warmLight, [0.2, 0.26, 0.2], [x, 2.3, z]);
    builder.add("paint", palette.black, new ConeGeometry(0.17, 0.16, 6), {
      at: [x, 2.5, z],
    });
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const lightsAt: Triple = [hut.minX + 0.3, hut.floor + 1.35, hut.maxZ + 0.02];

/** The start lights, which light up green as you come near. */
const buildStartLights = (builder: AttractionBuilder) => {
  builder.box("paint", palette.black, [0.2, 0.6, 0.1], [0, 0, 0]);
  [0.18, 0, -0.18].forEach((y, index) => {
    builder.sphere(
      "glow",
      index === 2 ? "#59f07a" : "#ffcf5a",
      0.06,
      [0, y, 0.06],
      [1, 1, 0.6],
      8,
    );
  });
};

const flagAt: Triple = [-6.9, 1.9, 6.4];

/** The finish flag, waved as you finish your run. */
const buildFinishFlag = (builder: AttractionBuilder) => {
  builder.cylinder("paint", frostWhite, {
    radius: 0.03,
    length: 1.9,
    at: [0, -0.95, 0],
    segments: 6,
  });
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 4; column++) {
      builder.box(
        "paint",
        (row + column) % 2 === 0 ? palette.black : palette.white,
        [0.15, 0.15, 0.02],
        [0.1 + column * 0.15, -0.1 - row * 0.15, 0],
      );
    }
  }
};

const vaneAt: Triple = [
  hut.maxX - 0.2,
  hut.floor + 3.0,
  (hut.minZ + hut.maxZ) / 2,
];

/** Wind cups on the roof, spinning faster as you come near. */
const buildWindCups = (builder: AttractionBuilder) => {
  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm / 3) * Math.PI * 2;
    const end: Triple = [Math.sin(angle) * 0.32, 0, Math.cos(angle) * 0.32];
    builder.bar("metal", palette.steel, [0, 0, 0], end, 0.025, 4);
    builder.sphere("paint", bobRed, 0.07, end, [1, 1, 1], 8);
  }
  builder.sphere("metal", palette.steel, 0.05, [0, 0, 0], [1, 1, 1], 6);
};

const moving: MovingPart[] = [
  {
    name: "start lights",
    pivot: lightsAt,
    build: buildStartLights,
    motion: { kind: "wake", reach: 5 },
  },
  {
    name: "finish flag",
    pivot: flagAt,
    build: buildFinishFlag,
    motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.5, period: 0.8 },
  },
  {
    name: "wind cups",
    pivot: vaneAt,
    build: buildWindCups,
    motion: { kind: "whirl", axis: "y", idle: 1.2, speed: 7, reach: 8 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

const buildSpectator = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((side) => {
    builder.box("matte", "#3a2a22", [0.1, 0.1, 0.18], [side, 0.05, 0.02]);
    builder.cylinder("matte", "#2b3442", {
      radius: 0.05,
      length: 0.34,
      at: [side, 0.27, 0],
      segments: 6,
    });
  });
  builder.lathe(
    "matte",
    trackBlue,
    [
      [0, 0.42],
      [0.17, 0.44],
      [0.17, 0.62],
      [0.14, 0.76],
      [0.06, 0.82],
      [0, 0.82],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      trackBlue,
      [side * 0.14, 0.76, 0],
      [side * 0.22, 1.0, 0.08],
      0.07,
      5,
    );
    builder.sphere(
      "matte",
      bobRed,
      0.04,
      [side * 0.22, 1.04, 0.08],
      [1, 1, 1],
      6,
    );
  });
  builder.torus("matte", bobYellow, 0.08, 0.035, [0, 0.83, 0], "y", 8);
  builder.sphere("matte", "#e8b894", 0.11, [0, 0.94, 0], [1, 1, 1], 9);
  builder.lathe(
    "matte",
    bobRed,
    [
      [0, 1.07],
      [0.08, 1.05],
      [0.115, 0.97],
      [0.118, 0.95],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  if (!builder.isFar) {
    builder.sphere("matte", frostWhite, 0.045, [0, 1.09, 0], [1, 1, 1], 6);
  }
};

const wanderers: Wanderers[] = [
  {
    name: "cheering spectators",
    build: buildSpectator,
    count: 3,
    centre: { x: 3.0, z: 8.0 },
    radius: 1.3,
    speed: 0.5,
    bob: 0.08,
  },
];

/* ------------------------------------------------------------------ */
/* The ride                                                            */
/* ------------------------------------------------------------------ */

const trackTop = trackCurve.getPointAt(0);
const trackEnd = trackCurve.getPointAt(1);

const bobRide = (progress: number): LocalSpot => {
  if (progress < 0.18) {
    /* Up the steps to the start house */
    const share = progress / 0.18;
    return {
      x: rideStart.x + (trackTop.x - rideStart.x) * share,
      y: hut.floor * Math.min(1, share * 1.2),
      z: rideStart.z + (trackTop.z - rideStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < 0.9) {
    const share = ((progress - 0.18) / 0.72) ** 1.35;
    const point = trackCurve.getPointAt(share);
    const tangent = trackCurve.getTangentAt(share);
    return {
      x: point.x,
      y: point.y + 0.08,
      z: point.z,
      heading: Math.atan2(tangent.x, tangent.z),
    };
  }
  const share = (progress - 0.9) / 0.1;
  return {
    x: trackEnd.x + (rideFinish.x - trackEnd.x) * share,
    y: (trackEnd.y + 0.08) * (1 - share),
    z: trackEnd.z + (rideFinish.z - trackEnd.z) * share,
    heading: 0,
  };
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildTrack(builder);
  buildStartHouse(builder);
  buildGrandstand(builder);
  buildScoreboard(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

export const bobsleighTrackModel: NewLandAttractionModel = {
  kind: "bobsleigh-track",
  islandId: "frost-isle",
  name: "Bobsleigh Track",
  fact: "A bobsleigh races down a twisting track made of smooth ice. Ice is so slippery that there is hardly any friction to slow the sleigh down, so it goes faster and faster, up to 150 kilometres an hour! Rough surfaces, like snow or grass, have more friction and would slow it right down.",
  curriculumLink:
    "Science, Year 3: forces and magnets. Compare how things move on different surfaces.",
  footprint: 11,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  rides: [
    {
      id: "bobsleigh",
      name: "the bobsleigh run",
      start: rideStart,
      reach: 0.7,
      seconds: 9,
      finish: rideFinish,
      follow: bobRide,
    },
  ],
  blockers: firs.map(([x, z, size]) => ({
    x,
    z,
    radius: 0.35 * size,
  })) satisfies LocalBlocker[],
  play: {
    label: "Start the race",
    news: "Three, two, one, go! The bobsleigh whooshed round the icy bends and crossed the line in a record time.",
  },
};
