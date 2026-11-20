import {
  ConeGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  listWallBlockers,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const midnight = "#1b2350";
const navy = "#26346e";
const violet = "#5b3fa8";
const silver = "#c7ced9";
const white = "#eef1f6";
const mirror = "#d9eef8";
const mirrorTint = "#cfd8f6";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowWhite = "#f4f8ff";
const starGold = "#ffd95e";
const laserRed = "#ff4a6a";
const floorTile = "#2b2f5c";
const floorTileLight = "#3a3f78";

/* The maze plan: six cells a side, a court of four in the middle */

const cells = 6;
const cellSize = 1.6;
const half = (cells * cellSize) / 2;
const wallHeight = 2.0;
const wallThickness = 0.1;
const courtFirst = 2;
const courtLast = 3;
const entranceColumn = 2;
const courtDoorColumn = 3;
const signAt: LocalPoint = { x: 2.6, z: 6.5 };

const lineAt = (line: number): number => (line - cells / 2) * cellSize;
const cellMiddle = (cell: number): number =>
  (cell - (cells - 1) / 2) * cellSize;

const isCourt = (column: number, row: number): boolean =>
  column >= courtFirst &&
  column <= courtLast &&
  row >= courtFirst &&
  row <= courtLast;

const makeRandom = (seed: number) => {
  let state = seed;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

interface MazePlan {
  /** `across[line][column]`: a mirror along x on the z line `line`. */
  across: boolean[][];
  /** `along[line][row]`: a mirror along z on the x line `line`. */
  along: boolean[][];
}

const planMaze = (): MazePlan => {
  const across = Array.from({ length: cells + 1 }, () =>
    Array.from({ length: cells }, () => true),
  );
  const along = Array.from({ length: cells + 1 }, () =>
    Array.from({ length: cells }, () => true),
  );
  for (let column = courtFirst; column <= courtLast; column++) {
    for (let row = courtFirst; row <= courtLast; row++) {
      if (column < courtLast) {
        along[column + 1][row] = false;
      }
      if (row < courtLast) {
        across[row + 1][column] = false;
      }
    }
  }
  const random = makeRandom(20_261_119);
  const seen = new Set<string>();
  const key = (column: number, row: number) =>
    `${String(column)},${String(row)}`;
  const stack: [number, number][] = [[entranceColumn, cells - 1]];
  seen.add(key(entranceColumn, cells - 1));
  while (stack.length > 0) {
    const [column, row] = stack[stack.length - 1];
    const options = (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const
    ).filter(([stepColumn, stepRow]) => {
      const nextColumn = column + stepColumn;
      const nextRow = row + stepRow;
      return (
        nextColumn >= 0 &&
        nextColumn < cells &&
        nextRow >= 0 &&
        nextRow < cells &&
        !isCourt(nextColumn, nextRow) &&
        !seen.has(key(nextColumn, nextRow))
      );
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [stepColumn, stepRow] =
      options[Math.floor(random() * options.length)];
    const nextColumn = column + stepColumn;
    const nextRow = row + stepRow;
    if (stepColumn !== 0) {
      along[Math.max(column, nextColumn)][row] = false;
    } else {
      across[Math.max(row, nextRow)][column] = false;
    }
    seen.add(key(nextColumn, nextRow));
    stack.push([nextColumn, nextRow]);
  }
  across[cells][entranceColumn] = false;
  across[courtFirst][courtDoorColumn] = false;
  return { across, along };
};

const plan = planMaze();

interface MirrorPanel {
  from: LocalPoint;
  to: LocalPoint;
  isOuter: boolean;
}

const listPanels = (): MirrorPanel[] => {
  const panels: MirrorPanel[] = [];
  plan.across.forEach((line, lineIndex) => {
    line.forEach((isWall, column) => {
      if (isWall) {
        panels.push({
          from: { x: lineAt(column), z: lineAt(lineIndex) },
          to: { x: lineAt(column + 1), z: lineAt(lineIndex) },
          isOuter: lineIndex === 0 || lineIndex === cells,
        });
      }
    });
  });
  plan.along.forEach((line, lineIndex) => {
    line.forEach((isWall, row) => {
      if (isWall) {
        panels.push({
          from: { x: lineAt(lineIndex), z: lineAt(row) },
          to: { x: lineAt(lineIndex), z: lineAt(row + 1) },
          isOuter: lineIndex === 0 || lineIndex === cells,
        });
      }
    });
  });
  return panels;
};

const panels = listPanels();

/** Grid corners that have a mirror running into them, for the posts. */
const listPosts = (): LocalPoint[] => {
  const posts = new Map<string, LocalPoint>();
  panels.forEach(({ from, to }) => {
    [from, to].forEach((point) => {
      posts.set(`${point.x.toFixed(2)},${point.z.toFixed(2)}`, point);
    });
  });
  return [...posts.values()];
};

const posts = listPosts();

/* The mirrors */

const addMirror = (
  builder: AttractionBuilder,
  { from, to, isOuter }: MirrorPanel,
  index: number,
) => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2;
  const middle: LocalPoint = {
    x: (from.x + to.x) / 2,
    z: (from.z + to.z) / 2,
  };
  const rotation: Triple = [0, turn, 0];
  if (builder.isFar) {
    builder.box(
      "glass",
      isOuter ? navy : mirror,
      [length, wallHeight, wallThickness],
      [middle.x, wallHeight / 2, middle.z],
      rotation,
    );
    return;
  }
  builder.box(
    "glass",
    isOuter ? mirrorTint : index % 3 === 0 ? mirrorTint : mirror,
    [length - 0.08, wallHeight - 0.25, wallThickness],
    [middle.x, 0.15 + (wallHeight - 0.25) / 2, middle.z],
    rotation,
  );
  builder.box(
    "paint",
    isOuter ? navy : violet,
    [length, 0.15, wallThickness + 0.04],
    [middle.x, 0.075, middle.z],
    rotation,
  );
  builder.box(
    "metal",
    silver,
    [length, 0.08, wallThickness + 0.06],
    [middle.x, wallHeight - 0.06, middle.z],
    rotation,
  );
  builder.box(
    "glow",
    index % 2 === 0 ? glowCyan : glowViolet,
    [length - 0.1, 0.04, wallThickness + 0.07],
    [middle.x, wallHeight - 0.13, middle.z],
    rotation,
  );
  if (isOuter) {
    const normal: LocalPoint = {
      x: Math.abs(middle.x) >= half - 0.01 ? Math.sign(middle.x) : 0,
      z: Math.abs(middle.z) >= half - 0.01 ? Math.sign(middle.z) : 0,
    };
    builder.box(
      "paint",
      navy,
      [length - 0.08, wallHeight - 0.25, 0.02],
      [
        middle.x + normal.x * (wallThickness / 2 + 0.01),
        0.15 + (wallHeight - 0.25) / 2,
        middle.z + normal.z * (wallThickness / 2 + 0.01),
      ],
      rotation,
    );
    [0.75, 1.35].forEach((y, row) => {
      builder.add(
        "glow",
        (index + row) % 2 === 0 ? starGold : glowWhite,
        new OctahedronGeometry(0.09, 0),
        {
          at: [
            middle.x + normal.x * (wallThickness / 2 + 0.05),
            y,
            middle.z + normal.z * (wallThickness / 2 + 0.05),
          ],
          scale: [1, 1.3, 1],
        },
      );
    });
  }
};

const buildMirrors = (builder: AttractionBuilder) => {
  panels.forEach((panel, index) => {
    addMirror(builder, panel, index);
  });
  posts.forEach(({ x, z }, index) => {
    if (builder.isFar) {
      return;
    }
    builder.cylinder("metal", silver, {
      radius: 0.08,
      length: wallHeight + 0.1,
      at: [x, (wallHeight + 0.1) / 2, z],
      segments: builder.segments(8, 4),
    });
    builder.add(
      "glow",
      index % 3 === 0 ? starGold : index % 3 === 1 ? glowCyan : glowViolet,
      new OctahedronGeometry(0.1, 0),
      { at: [x, wallHeight + 0.2, z], scale: [1, 1.4, 1] },
    );
  });
};

/* The floor, the grand front and the corner turrets */

const buildFloor = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    floorTile,
    [cells * cellSize + 0.3, 0.04, cells * cellSize + 0.3],
    [0, 0.02, 0],
  );
  if (builder.isFar) {
    return;
  }
  for (let column = 0; column < cells; column++) {
    for (let row = 0; row < cells; row++) {
      if ((column + row) % 2 === 0 || isCourt(column, row)) {
        continue;
      }
      builder.box(
        "matte",
        floorTileLight,
        [cellSize - 0.2, 0.01, cellSize - 0.2],
        [cellMiddle(column), 0.045, cellMiddle(row)],
      );
    }
  }
  builder.add(
    "matte",
    midnight,
    new LatheGeometry(
      [new Vector2(1.55, 0.046), new Vector2(0.001, 0.046)],
      32,
    ),
    {},
  );
  const star = new Shape();
  for (let point = 0; point < 10; point++) {
    const angle = (point / 10) * Math.PI * 2;
    const radius = point % 2 === 0 ? 1.45 : 0.6;
    if (point === 0) {
      star.moveTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
    } else {
      star.lineTo(Math.sin(angle) * radius, Math.cos(angle) * radius);
    }
  }
  star.closePath();
  builder.add(
    "paint",
    starGold,
    new ExtrudeGeometry(star, { depth: 0.01, bevelEnabled: false }),
    {
      at: [0, 0.05, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
  );
};

const buildTurret = (
  builder: AttractionBuilder,
  at: LocalPoint,
  index: number,
) => {
  const segments = builder.segments(14, 8);
  builder.cylinder("paint", index % 2 === 0 ? navy : violet, {
    radius: 0.42,
    length: 2.8,
    at: [at.x, 1.4, at.z],
    segments,
  });
  builder.cylinder("metal", silver, {
    radius: 0.48,
    length: 0.12,
    at: [at.x, 2.86, at.z],
    segments,
  });
  builder.lathe(
    "paint",
    white,
    [
      [0.001, 2.9],
      [0.5, 2.9],
      [0.46, 3.2],
      [0.3, 3.55],
      [0.1, 3.8],
      [0.001, 3.85],
    ],
    [at.x, 0, at.z],
    "y",
    segments,
  );
  builder.add("glow", starGold, new OctahedronGeometry(0.14, 0), {
    at: [at.x, 4.05, at.z],
    scale: [1, 1.4, 1],
  });
  if (builder.isFar) {
    return;
  }
  [0.8, 1.6, 2.4].forEach((y, row) => {
    builder.cylinder("glow", row % 2 === 0 ? glowCyan : glowViolet, {
      radius: 0.43,
      length: 0.06,
      at: [at.x, y, at.z],
      segments,
      isOpen: true,
    });
  });
};

const buildFront = (builder: AttractionBuilder) => {
  const gateX = cellMiddle(entranceColumn);
  const z = half + 0.02;
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", violet, {
      radius: 0.18,
      length: 3.0,
      at: [gateX + side * (cellSize / 2 + 0.16), 1.5, z + 0.05],
      segments: 12,
    });
    builder.sphere(
      "glow",
      side < 0 ? glowCyan : glowViolet,
      0.18,
      [gateX + side * (cellSize / 2 + 0.16), 3.12, z + 0.05],
      [1, 1, 1],
      10,
    );
  });
  const arch = new Shape();
  arch.moveTo(-1.6, 0);
  arch.lineTo(1.6, 0);
  arch.lineTo(1.6, 0.7);
  arch.quadraticCurveTo(1.2, 1.25, 0, 1.45);
  arch.quadraticCurveTo(-1.2, 1.25, -1.6, 0.7);
  arch.closePath();
  const geometry = new ExtrudeGeometry(arch, {
    depth: 0.14,
    bevelEnabled: !builder.isFar,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 1,
    curveSegments: builder.segments(8, 3),
  });
  builder.add("paint", navy, geometry, { at: [gateX, 2.2, z] });
  builder.add("paint", starGold, new TorusGeometry(0.42, 0.05, 5, 20), {
    at: [gateX, 2.95, z + 0.18],
  });
  builder.add(
    "glass",
    mirror,
    new LatheGeometry([new Vector2(0.4, 0), new Vector2(0.001, 0)], 20).rotateX(
      -Math.PI / 2,
    ),
    {
      at: [gateX, 2.95, z + 0.17],
    },
  );
  if (builder.isFar) {
    return;
  }
  for (let bulb = 0; bulb < 13; bulb++) {
    const share = bulb / 12;
    const x = -1.5 + share * 3.0;
    const y = 2.2 + 0.75 + (1 - (x / 1.6) ** 2) * 0.6;
    builder.add(
      "glow",
      bulb % 2 === 0 ? glowWhite : starGold,
      new IcosahedronGeometry(0.05, 0),
      {
        at: [gateX + x, y, z + 0.18],
      },
    );
  }
  [-1, 1].forEach((side) => {
    builder.add("glow", glowWhite, new OctahedronGeometry(0.16, 0), {
      at: [gateX + side * 1.05, 2.7, z + 0.2],
      scale: [1, 1.3, 0.4],
    });
  });
};

/* The court: a laser, mirrors to bounce it, and a spinning floor */

const laserPath: Triple[] = [
  [-1.45, 1.55, -1.3],
  [1.3, 1.55, -1.1],
  [1.25, 1.55, 1.35],
  [-1.2, 1.55, 1.1],
  [-1.3, 1.55, -0.6],
];

const buildCourt = (builder: AttractionBuilder) => {
  const [first] = laserPath;
  builder.box(
    "paint",
    midnight,
    [0.3, 0.26, 0.26],
    [first[0] - 0.05, first[1], first[2]],
  );
  builder.cylinder("metal", silver, {
    radius: 0.06,
    length: 0.12,
    at: [first[0] + 0.14, first[1], first[2]],
    axis: "x",
    segments: 8,
  });
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: first[1] - 0.13,
    at: [first[0] - 0.05, (first[1] - 0.13) / 2, first[2]],
    segments: 8,
  });
  laserPath.slice(1, -1).forEach(([x, y, z], index) => {
    builder.cylinder("metal", silver, {
      radius: 0.04,
      length: y - 0.1,
      at: [x, (y - 0.1) / 2, z],
      segments: 6,
    });
    const before = laserPath[index];
    const after = laserPath[index + 2];
    const inAngle = Math.atan2(before[0] - x, before[2] - z);
    const outAngle = Math.atan2(after[0] - x, after[2] - z);
    const facing =
      (inAngle + outAngle) / 2 +
      (Math.abs(inAngle - outAngle) > Math.PI ? Math.PI : 0);
    builder.box("glass", mirror, [0.36, 0.3, 0.03], [x, y, z], [0, facing, 0]);
    builder.box(
      "metal",
      silver,
      [0.4, 0.34, 0.02],
      [x - Math.sin(facing) * 0.025, y, z - Math.cos(facing) * 0.025],
      [0, facing, 0],
    );
  });
  const target = laserPath[laserPath.length - 1];
  builder.cylinder("paint", white, {
    radius: 0.24,
    length: 0.05,
    at: target,
    axis: "z",
    segments: 16,
  });
  builder.cylinder("paint", laserRed, {
    radius: 0.15,
    length: 0.06,
    at: target,
    axis: "z",
    segments: 16,
  });
  builder.cylinder("metal", silver, {
    radius: 0.04,
    length: target[1] - 0.2,
    at: [target[0], (target[1] - 0.2) / 2, target[2]],
    segments: 6,
  });
  laserPath.slice(1).forEach((point, index) => {
    builder.bar("glow", laserRed, laserPath[index], point, 0.025, 4);
  });
};

/** The spinning floor in the middle of the court. */
const buildTurntable = (builder: AttractionBuilder) => {
  const segments = builder.segments(28, 12);
  builder.cylinder("metal", silver, {
    radius: 0.95,
    length: 0.1,
    at: [0, 0.07, 0],
    segments,
  });
  builder.cylinder("paint", violet, {
    radius: 0.85,
    length: 0.03,
    at: [0, 0.13, 0],
    segments,
  });
  for (let stripe = 0; stripe < 6; stripe++) {
    builder.box(
      "paint",
      stripe % 2 === 0 ? starGold : glowWhite,
      [1.6, 0.012, 0.08],
      [0, 0.15, 0],
      [0, (stripe / 6) * Math.PI, 0],
    );
  }
  builder.cylinder("glow", glowCyan, {
    radius: 0.96,
    length: 0.04,
    at: [0, 0.1, 0],
    segments,
    isOpen: true,
  });
};

/** The mirror ball, which whirls faster as you come near. */
const buildMirrorBall = (builder: AttractionBuilder) => {
  builder.cylinder("metal", silver, {
    radius: 0.015,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 4,
  });
  builder.add(
    "metal",
    "#e8eef6",
    new IcosahedronGeometry(0.32, builder.isFar ? 1 : 2),
    { at: [0, -0.2, 0] },
    undefined,
  );
};

const buildGantry = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.cylinder("metal", silver, {
      radius: 0.06,
      length: 3.6,
      at: [side * 1.62, 1.8, 0],
      segments: 8,
    });
  });
  builder.bar("paint", navy, [-1.62, 3.55, 0], [1.62, 3.55, 0], 0.12, 8);
  builder.bar("paint", navy, [-1.62, 3.0, 0], [-0.8, 3.55, 0], 0.06, 6);
  builder.bar("paint", navy, [1.62, 3.0, 0], [0.8, 3.55, 0], 0.06, 6);
};

/** A prism that rises from its stand as you come near. */
const buildPrism = (builder: AttractionBuilder) => {
  builder.add(
    "glass",
    "#e8f6ff",
    new ConeGeometry(0.22, 0.5, 3).translate(0, 0.25, 0),
    {},
  );
  builder.add(
    "glass",
    "#e8f6ff",
    new ConeGeometry(0.22, 0.5, 3).translate(0, 0.25, 0).rotateX(Math.PI),
    {},
  );
  if (!builder.isFar) {
    ["#ff5a4a", "#ffb43c", "#ffe84a", "#5ae06a", "#4aa8ff", "#8c5aff"].forEach(
      (colour, index) => {
        builder.bar(
          "glow",
          colour,
          [0, 0, 0],
          [0.9, -0.15 + index * 0.06, 0.25],
          0.02,
          3,
        );
      },
    );
  }
};

const prismAt: LocalPoint = { x: 1.3, z: 5.9 };

const buildPrismStand = (builder: AttractionBuilder) => {
  builder.cylinder("paint", navy, {
    radius: 0.3,
    radiusEnd: 0.22,
    length: 0.9,
    at: [prismAt.x, 0.45, prismAt.z],
    segments: 10,
  });
  builder.cylinder("metal", silver, {
    radius: 0.32,
    length: 0.06,
    at: [prismAt.x, 0.93, prismAt.z],
    segments: 10,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    "#b9bdc8",
    [2.0, 0.03, 2.6],
    [cellMiddle(entranceColumn), 0.015, half + 1.3],
  );
  buildFloor(builder);
  buildMirrors(builder);
  buildFront(builder);
  buildCourt(builder);
  buildGantry(builder);
  buildPrismStand(builder);
  [
    { x: -half - 0.2, z: -half - 0.2 },
    { x: half + 0.2, z: -half - 0.2 },
    { x: -half - 0.2, z: half + 0.2 },
    { x: half + 0.2, z: half + 0.2 },
  ].forEach((at, index) => {
    buildTurret(builder, at, index);
  });
  addBench(builder, [-3.4, 0, half + 1.5], Math.PI, "#7d8fc4");
  addBush(builder, [5.6, 0, 1.0], 0.55, "#2f5e46");
  addBush(builder, [-5.6, 0, -1.2], 0.6, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* The ride: step onto the spinning floor in the court */

const rideStart: LocalPoint = { x: 0.2, z: -1.35 };
const rideFinish: LocalPoint = { x: 0, z: 1.3 };
const spinSpeed = 1.3;

const spinRide = (progress: number, clockSeconds: number): LocalSpot => {
  const hop = 0.1;
  const radius = 0.5;
  const angle = clockSeconds * spinSpeed;
  const onFloor = {
    x: Math.sin(angle) * radius,
    y: 0.16,
    z: Math.cos(angle) * radius,
  };
  if (progress < hop || progress > 1 - hop) {
    const share = progress < hop ? progress / hop : (1 - progress) / hop;
    const outside = progress < hop ? rideStart : rideFinish;
    return {
      x: outside.x + (onFloor.x - outside.x) * share,
      y: onFloor.y * share + Math.sin(share * Math.PI) * 0.3,
      z: outside.z + (onFloor.z - outside.z) * share,
      heading: angle + Math.PI / 2,
    };
  }
  return { ...onFloor, heading: angle + Math.PI / 2 };
};

export const mirrorMazeModel: NewLandAttractionModel = {
  kind: "mirror-maze",
  islandId: "starfall-isle",
  name: "Mirror Maze",
  fact: "Light travels in straight lines. When it hits a mirror it bounces off, or reflects, at the same angle it arrived, which is why a mirror maze seems to go on for ever. We see things because light from them travels into our eyes, so a mirror shows us light that has bounced off it.",
  curriculumLink:
    "Science, Year 6: light. Recognise that light appears to travel in straight lines, and use this to explain how objects are seen and how mirrors reflect light.",
  footprint: 8,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "spinning-floor",
      pivot: [0, 0, 0],
      build: buildTurntable,
      motion: { kind: "spin", axis: "y", speed: spinSpeed },
    },
    {
      name: "mirror-ball",
      pivot: [0, 3.45, 0],
      build: buildMirrorBall,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 3.5, reach: 4 },
    },
    {
      name: "prism",
      pivot: [prismAt.x, 1.0, prismAt.z],
      build: buildPrism,
      motion: { kind: "rise", reach: 3.5, height: 0.6, period: 3 },
    },
  ],
  blockers: [
    ...panels
      .filter(({ isOuter }) => isOuter)
      .flatMap(({ from, to }) => listWallBlockers(from, to, 0.2, 0.4))
      .filter(
        ({ x, z }) =>
          !(
            Math.abs(z - half) < 0.1 &&
            Math.abs(x - cellMiddle(entranceColumn)) < 0.85
          ),
      ),
  ] satisfies LocalBlocker[],
  rides: [
    {
      id: "spinning-floor",
      name: "the spinning mirror floor",
      start: rideStart,
      reach: 0.5,
      seconds: 12,
      finish: rideFinish,
      follow: spinRide,
    },
  ],
  tune: [76, 79, 83, 88, 83, 79, 76, 71],
  play: {
    label: "Shine the laser",
    news: "Zap! The laser beam shot across the court in a straight line, bounced off three mirrors and hit the target right in the middle.",
  },
};
