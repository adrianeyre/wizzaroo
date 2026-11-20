import {
  BoxGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Shape,
  Vector3,
} from "three";
import {
  addBench,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#edf3f7";
const snowShadow = "#d3e0ea";
const frostWhite = "#f8fbfd";
const ice = "#d3ecf6";
const steel = "#8d99a6";
const faluRed = "#9b2f26";
const trim = "#f1ece0";
const roofSlate = "#3b4450";
const pine = "#2d5a40";
const netOrange = "#f07c2a";
const markerColours = ["#d8342c", "#2f6fb8", "#3f9a4a"];
const signColour = "#9b2f26";

/* The in-run comes down from the tower at the back to the take-off */
const towerTop = 6.0;
const cabin = { minX: -1.0, maxX: 1.0, minZ: -9.9, maxZ: -8.4 };
const inRun = new CatmullRomCurve3([
  new Vector3(0, towerTop + 0.05, -8.6),
  new Vector3(0, 5.0, -7.1),
  new Vector3(0, 4.0, -5.6),
  new Vector3(0, 3.45, -4.6),
  new Vector3(0, 3.3, -3.9),
]);
const inRunWidth = 1.3;
const takeOff = inRun.getPointAt(1);

/* The landing hill, flat on the knoll, steep, then running out flat */
const hill = { minX: -1.8, maxX: 1.8, topZ: -4.4, bottomZ: 5.0, height: 2.8 };
const hillHeightAt = (z: number): number => {
  const share = Math.min(
    1,
    Math.max(0, (z - hill.topZ) / (hill.bottomZ - hill.topZ)),
  );
  return hill.height * (1 - share * share * (3 - 2 * share));
};
const landingZ = 1.0;
const outRunEnd = 6.2;
const liftAt = { x: 1.4, z: -9.0 };
const judgesAt = { x: -4.0, z: -0.6 };
const boardAt = { x: 4.3, z: 3.2 };
const rideStart = { x: 2.4, z: -7.0 };
const rideFinish = { x: 0.9, z: 7.7 };
const signAt: Triple = [-3.2, 0, 8.0];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const addSlab = (
  builder: AttractionBuilder,
  colour: string,
  from: Vector3,
  to: Vector3,
  [width, thickness]: [number, number],
  side = 0,
  lift = 0,
  finish: "paint" | "matte" | "metal" | "glass" | "glow" = "paint",
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

/** A little red timber house with a pitched snowy roof, ridge along x. */
const addRedHouse = (
  builder: AttractionBuilder,
  {
    minX,
    maxX,
    minZ,
    maxZ,
  }: { minX: number; maxX: number; minZ: number; maxZ: number },
  floor: number,
  wallHeight: number,
) => {
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    faluRed,
    [width, wallHeight, depth],
    [x, floor + wallHeight / 2, z],
  );
  const rise = 0.6;
  const half = depth / 2 + 0.2;
  const slope = Math.hypot(half, rise);
  const angle = Math.atan2(rise, half);
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      roofSlate,
      [width + 0.4, 0.1, slope + 0.02],
      [x, floor + wallHeight + rise / 2, z + (side * half) / 2],
      [side * angle, 0, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "matte",
        frostWhite,
        [width + 0.42, 0.07, slope * 0.75],
        [
          x,
          floor + wallHeight + rise / 2 + 0.06,
          z + (side * half) / 2 + side * 0.04,
        ],
        [side * angle, 0, 0],
      );
    }
  });
  [minX + 0.02, maxX - 0.02].forEach((endX) => {
    builder.add(
      "matte",
      faluRed,
      new ConeGeometry(depth / 2, rise, 4, 1)
        .rotateY(Math.PI / 4)
        .scale(0.06, 1, 1.41),
      { at: [endX, floor + wallHeight + rise / 2, z] },
    );
  });
  if (builder.isFar) {
    return;
  }
  [minX, maxX].forEach((cornerX) => {
    [minZ, maxZ].forEach((cornerZ) => {
      builder.box(
        "paint",
        trim,
        [0.1, wallHeight + 0.02, 0.1],
        [cornerX, floor + wallHeight / 2, cornerZ],
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The tower, lift and in-run                                          */
/* ------------------------------------------------------------------ */

const buildTower = (builder: AttractionBuilder) => {
  /* Four steel legs, braced, up to the start cabin */
  [cabin.minX + 0.12, cabin.maxX - 0.12].forEach((x) => {
    [cabin.minZ + 0.12, cabin.maxZ - 0.12].forEach((z) => {
      builder.box("metal", steel, [0.16, towerTop, 0.16], [x, towerTop / 2, z]);
    });
  });
  builder.box(
    "metal",
    shade(steel, 0.8),
    [cabin.maxX - cabin.minX + 0.3, 0.16, cabin.maxZ - cabin.minZ + 0.3],
    [0, towerTop - 0.08, (cabin.minZ + cabin.maxZ) / 2],
  );
  addRedHouse(builder, cabin, towerTop, 1.4);
  /* The lift shaft, all glass, with its car at the bottom */
  builder.box(
    "glass",
    palette.glass,
    [0.62, towerTop + 0.4, 0.62],
    [liftAt.x, (towerTop + 0.4) / 2, liftAt.z],
  );
  builder.box(
    "paint",
    faluRed,
    [0.66, 0.2, 0.66],
    [liftAt.x, towerTop + 0.5, liftAt.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box("paint", trim, [0.5, 0.9, 0.5], [liftAt.x, 0.5, liftAt.z]);
  for (let level = 1; level < 6; level++) {
    const y = level * (towerTop / 6);
    [cabin.minZ + 0.12, cabin.maxZ - 0.12].forEach((z) => {
      builder.bar(
        "metal",
        steel,
        [cabin.minX + 0.12, y - 0.9, z],
        [cabin.maxX - 0.12, y, z],
        0.06,
        5,
      );
    });
    [cabin.minX + 0.12, cabin.maxX - 0.12].forEach((x) => {
      builder.bar(
        "metal",
        steel,
        [x, y, cabin.minZ + 0.12],
        [x, y - 0.9, cabin.maxZ - 0.12],
        0.06,
        5,
      );
    });
    [-1, 1].forEach((side) => {
      builder.box(
        "metal",
        steel,
        [0.04, 0.04, 0.66],
        [liftAt.x + side * 0.31, y, liftAt.z],
      );
    });
  }
  /* Windows on the cabin, glowing warm */
  [-0.5, 0.5].forEach((x) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.45, 0.5, 0.04],
      [x, towerTop + 0.85, cabin.minZ - 0.01],
    );
  });
  builder.box(
    "glow",
    palette.warmLight,
    [0.04, 0.5, 0.6],
    [cabin.maxX + 0.01, towerTop + 0.85, -9.15],
  );
  builder.box(
    "paint",
    trim,
    [0.06, 0.06, 0.7],
    [cabin.maxX + 0.03, towerTop + 0.57, -9.15],
  );
  /* The flag on the roof */
  builder.cylinder("metal", steel, {
    radius: 0.03,
    length: 1.3,
    at: [cabin.minX + 0.2, towerTop + 2.3, -9.15],
    segments: 6,
  });
  builder.box(
    "matte",
    "#d8342c",
    [0.6, 0.38, 0.02],
    [cabin.minX + 0.52, towerTop + 2.75, -9.15],
  );
  builder.box(
    "matte",
    frostWhite,
    [0.6, 0.08, 0.025],
    [cabin.minX + 0.52, towerTop + 2.75, -9.15],
  );
  builder.box(
    "matte",
    frostWhite,
    [0.08, 0.38, 0.025],
    [cabin.minX + 0.42, towerTop + 2.75, -9.15],
  );
};

const buildInRun = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 6 : 16;
  const points = inRun.getSpacedPoints(steps);
  for (let index = 0; index < steps; index++) {
    const from = points[index];
    const to = points[index + 1];
    addSlab(
      builder,
      shade(steel, 0.9),
      from,
      to,
      [inRunWidth + 0.2, 0.16],
      0,
      -0.1,
      "metal",
    );
    addSlab(builder, ice, from, to, [inRunWidth, 0.04], 0, 0.0, "glass");
    [-1, 1].forEach((side) => {
      addSlab(
        builder,
        trim,
        from,
        to,
        [0.08, 0.3],
        side * (inRunWidth / 2 + 0.06),
        0.12,
      );
    });
    if (builder.isFar) {
      continue;
    }
    /* Ski tracks cut into the ice, and a red rail along the top */
    [-1, 1].forEach((side) => {
      addSlab(
        builder,
        "#6f9fb8",
        from,
        to,
        [0.1, 0.02],
        side * 0.2,
        0.02,
        "matte",
      );
      addSlab(
        builder,
        faluRed,
        from,
        to,
        [0.1, 0.05],
        side * (inRunWidth / 2 + 0.06),
        0.3,
      );
    });
  }
  /* Steel legs down to the ground, behind the hill */
  [0.18, 0.36, 0.54, 0.72].forEach((share) => {
    const point = inRun.getPointAt(share);
    [-1, 1].forEach((side) => {
      builder.box(
        "metal",
        steel,
        [0.14, point.y - 0.1, 0.14],
        [side * 0.6, (point.y - 0.1) / 2, point.z],
      );
    });
    if (!builder.isFar) {
      builder.bar(
        "metal",
        steel,
        [-0.6, 0.3, point.z],
        [0.6, point.y - 0.3, point.z],
        0.06,
        5,
      );
      builder.box(
        "metal",
        steel,
        [1.2, 0.08, 0.08],
        [0, point.y * 0.5, point.z],
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Floodlights along the in-run */
  [0.25, 0.6].forEach((share) => {
    const point = inRun.getPointAt(share);
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.04,
      length: 1.0,
      at: [-inRunWidth / 2 - 0.2, point.y + 0.4, point.z],
      segments: 6,
    });
    builder.box(
      "glow",
      palette.warmLight,
      [0.2, 0.12, 0.2],
      [-inRunWidth / 2 - 0.2, point.y + 0.95, point.z],
    );
  });
  /* The take-off's lip, painted with a red line */
  builder.box(
    "paint",
    "#d8342c",
    [inRunWidth, 0.03, 0.08],
    [0, takeOff.y + 0.03, takeOff.z - 0.05],
  );
};

/* ------------------------------------------------------------------ */
/* The landing hill and out-run                                        */
/* ------------------------------------------------------------------ */

const buildHill = (builder: AttractionBuilder) => {
  const steps = builder.isFar ? 6 : 16;
  const profile = Array.from({ length: steps + 1 }, (_, index) => {
    const z = hill.topZ + ((hill.bottomZ - hill.topZ) * index) / steps;
    return [z, hillHeightAt(z)] as const;
  });
  const side = new Shape();
  side.moveTo(-hill.bottomZ, 0);
  profile
    .slice()
    .reverse()
    .forEach(([z, height]) => {
      side.lineTo(-z, height);
    });
  side.lineTo(-hill.topZ, 0);
  side.closePath();
  builder.sidePlate("matte", frostWhite, side, 0, hill.maxX - hill.minX);
  /* The out-run, a flat sheet of packed snow */
  builder.box(
    "matte",
    snowShadow,
    [hill.maxX - hill.minX, 0.03, outRunEnd - hill.bottomZ],
    [0, 0.015, (outRunEnd + hill.bottomZ) / 2],
  );
  if (builder.isFar) {
    return;
  }
  /* Distance lines across the slope: red, blue and green */
  [-0.6, 1.4, 3.2].forEach((z, index) => {
    const from = new Vector3(0, hillHeightAt(z - 0.1), z - 0.1);
    const to = new Vector3(0, hillHeightAt(z + 0.1), z + 0.1);
    addSlab(
      builder,
      markerColours[index],
      from,
      to,
      [hill.maxX - hill.minX - 0.1, 0.03],
      0,
      0.02,
      "matte",
    );
    [-1, 1].forEach((sideX) => {
      const x = sideX * (hill.maxX + 0.25);
      const y = hillHeightAt(z) * 0.5;
      builder.cylinder("paint", markerColours[index], {
        radius: 0.05,
        length: hillHeightAt(z) * 0.5 + 0.9,
        at: [x, (hillHeightAt(z) * 0.5 + 0.9) / 2, z],
        segments: 6,
      });
      builder.box(
        "paint",
        markerColours[index],
        [0.04, 0.3, 0.45],
        [x, y + 0.8, z],
      );
    });
  });
  /* Ribbed edges of packed snow, and the orange safety nets */
  for (let index = 0; index < steps; index++) {
    const [fromZ, fromY] = profile[index];
    const [toZ, toY] = profile[index + 1];
    [-1, 1].forEach((sideX) => {
      builder.bar(
        "matte",
        snowShadow,
        [sideX * (hill.maxX - 0.08), fromY + 0.06, fromZ],
        [sideX * (hill.maxX - 0.08), toY + 0.06, toZ],
        0.16,
        6,
      );
    });
  }
  [-1, 1].forEach((sideX) => {
    const x = sideX * (hill.maxX + 0.45);
    builder.box("paint", netOrange, [0.04, 0.7, 3.5], [x, 0.4, 4.25]);
    for (let post = 0; post < 5; post++) {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.07, 0.85, 0.07],
        [x, 0.42, 2.5 + post * 0.875],
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The judges' tower, scoreboard and grounds                           */
/* ------------------------------------------------------------------ */

const judges = {
  minX: judgesAt.x - 0.8,
  maxX: judgesAt.x + 0.8,
  minZ: judgesAt.z - 0.9,
  maxZ: judgesAt.z + 0.9,
};

const buildJudgesTower = (builder: AttractionBuilder) => {
  addRedHouse(builder, judges, 0, 2.0);
  /* The glass booth on top, looking out over the hill */
  builder.box("matte", faluRed, [1.6, 0.2, 1.8], [judgesAt.x, 2.1, judgesAt.z]);
  builder.box(
    "glass",
    palette.glass,
    [1.5, 0.8, 1.7],
    [judgesAt.x, 2.6, judgesAt.z],
  );
  builder.box(
    "matte",
    roofSlate,
    [1.9, 0.12, 2.1],
    [judgesAt.x, 3.06, judgesAt.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "matte",
    frostWhite,
    [1.92, 0.06, 2.12],
    [judgesAt.x, 3.14, judgesAt.z],
  );
  [-0.4, 0.4].forEach((dz) => {
    builder.box(
      "paint",
      trim,
      [0.06, 0.8, 0.06],
      [judges.maxX - 0.03, 2.6, judgesAt.z + dz],
    );
  });
  builder.box(
    "paint",
    palette.darkTimber,
    [0.04, 1.0, 0.5],
    [judges.maxX + 0.01, 0.5, judgesAt.z + 0.2],
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.04, 0.45, 0.5],
    [judges.maxX + 0.01, 1.3, judgesAt.z - 0.45],
  );
  builder.box(
    "paint",
    trim,
    [0.07, 0.06, 0.6],
    [judges.maxX + 0.03, 1.05, judgesAt.z - 0.45],
  );
};

const buildScoreboard = (builder: AttractionBuilder) => {
  const { x, z } = boardAt;
  [-0.7, 0.7].forEach((dz) => {
    builder.box("metal", palette.darkSteel, [0.1, 2.4, 0.1], [x, 1.2, z + dz]);
  });
  builder.box("paint", "#1f2b3d", [0.1, 1.0, 1.8], [x, 2.3, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", faluRed, [0.12, 0.2, 1.9], [x, 2.88, z]);
  [-0.55, -0.25, 0.1, 0.4].forEach((dz, index) => {
    builder.box(
      "glow",
      index === 2 ? "#59f07a" : "#ffcf5a",
      [0.01, 0.34, index === 2 ? 0.06 : 0.2],
      [x - 0.06, 2.3, z + dz],
    );
  });
  builder.box("glow", "#ffcf5a", [0.01, 0.1, 1.4], [x - 0.06, 1.95, z]);
};

const firs: [number, number, number][] = [
  [-5.0, -6.8, 1.3],
  [4.6, -7.2, 1.2],
  [-7.0, -3.4, 1.0],
  [7.4, -2.2, 1.0],
  [-7.6, 2.4, 0.9],
  [7.2, 6.0, 0.85],
  [-2.8, -8.9, 0.8],
];

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 4) {
      addFir(builder, x, z, size);
    }
  });
  if (builder.isFar) {
    return;
  }
  [
    [-5.6, 4.8, 0.55],
    [5.6, 0.6, 0.5],
    [3.2, -4.6, 0.6],
    [-3.0, -4.2, 0.55],
    [6.2, -5.0, 0.45],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  addBench(builder, [-4.8, 0, 5.6], Math.PI / 2, faluRed);
  addBench(builder, [4.8, 0, 6.0], -Math.PI / 2, faluRed);
  /* Skis and poles stuck upright in the snow by the out-run */
  [
    [-2.6, 6.6],
    [2.7, 6.2],
  ].forEach(([x, z], index) => {
    [-0.08, 0.08].forEach((dx) => {
      builder.box(
        "paint",
        index === 0 ? "#2f6fb8" : "#d8342c",
        [0.08, 1.4, 0.03],
        [x + dx, 0.7, z],
        [0, 0, dx],
      );
    });
    builder.bar(
      "metal",
      steel,
      [x + 0.25, 0, z + 0.1],
      [x + 0.3, 1.1, z + 0.1],
      0.03,
      4,
    );
    builder.bar(
      "metal",
      steel,
      [x - 0.25, 0, z + 0.1],
      [x - 0.3, 1.1, z + 0.1],
      0.03,
      4,
    );
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const sockAt: Triple = [hill.maxX + 0.9, 3.4, -3.6];

/** A striped windsock beside the take-off, swinging in the wind. */
const buildWindsock = (builder: AttractionBuilder) => {
  builder.cylinder("metal", steel, {
    radius: 0.04,
    length: 3.4,
    at: [0, -1.7, 0],
    segments: 6,
  });
  for (let band = 0; band < 4; band++) {
    builder.cylinder("matte", band % 2 === 0 ? netOrange : frostWhite, {
      radius: 0.2 - band * 0.03,
      radiusEnd: 0.17 - band * 0.03,
      length: 0.25,
      at: [0, 0, 0.18 + band * 0.25],
      axis: "z",
      segments: 10,
      isOpen: true,
    });
  }
};

const startLightAt: Triple = [inRunWidth / 2 + 0.25, towerTop + 0.9, -8.3];

const buildStartLight = (builder: AttractionBuilder) => {
  builder.box("paint", palette.black, [0.2, 0.4, 0.12], [0, 0, 0]);
  builder.sphere("glow", "#59f07a", 0.07, [0, -0.08, 0.07], [1, 1, 0.6], 8);
  builder.sphere("glow", "#ff5a4a", 0.07, [0, 0.1, 0.07], [1, 1, 0.6], 8);
};

const cardsAt: Triple = [judges.maxX + 0.05, 2.2, judgesAt.z];

/** The judges' score cards, held up as you land. */
const buildScoreCards = (builder: AttractionBuilder) => {
  [-0.5, 0, 0.5].forEach((dz, index) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.02,
      length: 0.5,
      at: [0, 0.25, dz],
      segments: 5,
    });
    builder.box("paint", frostWhite, [0.03, 0.3, 0.36], [0, 0.6, dz]);
    builder.box(
      "paint",
      markerColours[index],
      [0.035, 0.18, 0.06],
      [0, 0.6, dz - 0.06],
    );
    builder.box(
      "paint",
      markerColours[index],
      [0.035, 0.18, 0.06],
      [0, 0.6, dz + 0.06],
    );
  });
};

const moving: MovingPart[] = [
  {
    name: "windsock",
    pivot: sockAt,
    build: buildWindsock,
    motion: { kind: "nod", axis: "y", reach: 8, amplitude: 0.8, period: 2.2 },
  },
  {
    name: "start light",
    pivot: startLightAt,
    build: buildStartLight,
    motion: { kind: "wake", reach: 5 },
  },
  {
    name: "judges' score cards",
    pivot: cardsAt,
    build: buildScoreCards,
    motion: { kind: "rise", reach: 6, height: 0.5, period: 1.2 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

const buildFan = (builder: AttractionBuilder) => {
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
    faluRed,
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
      faluRed,
      [side * 0.14, 0.76, 0],
      [side * 0.24, 0.55, 0.1],
      0.07,
      5,
    );
  });
  if (!builder.isFar) {
    builder.cylinder("metal", palette.brass, {
      radius: 0.06,
      radiusEnd: 0.04,
      length: 0.12,
      at: [0.25, 0.48, 0.12],
      segments: 8,
    });
  }
  builder.torus("matte", frostWhite, 0.08, 0.035, [0, 0.83, 0], "y", 8);
  builder.sphere("matte", "#e8b894", 0.11, [0, 0.94, 0], [1, 1, 1], 9);
  builder.lathe(
    "matte",
    "#2f6fb8",
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
};

/** A snow bunting, white with black wings. */
const buildBunting = (builder: AttractionBuilder) => {
  builder.sphere("matte", frostWhite, 0.07, [0, 0, 0], [0.9, 0.8, 1.5], 8);
  builder.sphere("matte", frostWhite, 0.045, [0, 0.04, 0.09], [1, 1, 1], 6);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.black,
      [0.16, 0.01, 0.07],
      [side * 0.1, 0.02, -0.01],
      [0, 0, side * 0.3],
    );
  });
};

const wanderers: Wanderers[] = [
  {
    name: "ski fans with cowbells",
    build: buildFan,
    count: 2,
    centre: { x: -4.6, z: 3.6 },
    radius: 1.1,
    speed: 0.5,
    bob: 0.06,
  },
  {
    name: "snow buntings",
    build: buildBunting,
    count: 3,
    centre: { x: 2.4, z: -3.4 },
    radius: 2.2,
    speed: 1.6,
    height: 4.6,
    bob: 0.3,
  },
];

/* ------------------------------------------------------------------ */
/* The ride and deck                                                   */
/* ------------------------------------------------------------------ */

const jumpRide = (progress: number): LocalSpot => {
  const top = inRun.getPointAt(0);
  if (progress < 0.2) {
    /* Up in the lift to the start cabin */
    const share = progress / 0.2;
    const across = Math.min(1, share * 3);
    return {
      x: rideStart.x + (top.x - rideStart.x) * across,
      y: top.y * share,
      z: rideStart.z + (top.z - rideStart.z) * across,
      heading: 0,
    };
  }
  if (progress < 0.42) {
    const share = ((progress - 0.2) / 0.22) ** 1.6;
    const point = inRun.getPointAt(share);
    return { x: 0, y: point.y + 0.05, z: point.z, heading: 0 };
  }
  const landingY = hillHeightAt(landingZ) + 0.05;
  if (progress < 0.66) {
    /* Flying! */
    const share = (progress - 0.42) / 0.24;
    const z = takeOff.z + (landingZ - takeOff.z) * share;
    return {
      x: 0,
      y:
        takeOff.y +
        (landingY - takeOff.y) * share +
        0.7 * Math.sin(share * Math.PI),
      z,
      heading: 0,
    };
  }
  if (progress < 0.88) {
    const share = 1 - (1 - (progress - 0.66) / 0.22) ** 1.5;
    const z = landingZ + (outRunEnd - landingZ) * share;
    return { x: 0, y: hillHeightAt(z) + 0.05, z, heading: 0 };
  }
  const share = (progress - 0.88) / 0.12;
  return {
    x: rideFinish.x * share,
    y: 0.05 * (1 - share),
    z: outRunEnd + (rideFinish.z - outRunEnd) * share,
    heading: share * 0.6,
  };
};

const hillDeck: Deck = ({ x, z }) =>
  x >= hill.minX && x <= hill.maxX && z >= hill.topZ && z <= hill.bottomZ
    ? { height: hillHeightAt(z), kind: "trail" }
    : undefined;

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildTower(builder);
  buildInRun(builder);
  buildHill(builder);
  buildJudgesTower(builder);
  buildScoreboard(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

export const skiJumpModel: NewLandAttractionModel = {
  kind: "ski-jump",
  islandId: "frost-isle",
  name: "Ski Jump",
  fact: "Ski jumpers whoosh down a steep slope and fly through the air, sometimes for more than 100 metres! Their long skis are made from layers of wood, plastic and metal, because together these materials are strong, light and bendy, and slide smoothly over the snow.",
  curriculumLink:
    "Science, Year 2: identify and compare the suitability of a variety of everyday materials, including wood, metal and plastic, for particular uses.",
  footprint: 11,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  decks: [hillDeck],
  rides: [
    {
      id: "ski-jump",
      name: "the ski jump",
      start: rideStart,
      reach: 0.7,
      seconds: 9,
      finish: rideFinish,
      follow: jumpRide,
    },
  ],
  blockers: [
    ...firs.map(([x, z, size]) => ({ x, z, radius: 0.35 * size })),
    { x: judgesAt.x, z: judgesAt.z, radius: 0.8 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Take a flying leap",
    news: "Whoosh! You raced down the in-run, soared high over the snowy hill and landed safely, and the judges held up top marks!",
  },
};
