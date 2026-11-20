import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  LatheGeometry,
  OctahedronGeometry,
  Vector2,
} from "three";
import {
  addBench,
  addBush,
  addSignBoard,
  addTree,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const stone = "#d9d3c4";
const darkStone = "#a8a091";
const navy = "#26346e";
const midnight = "#1b2350";
const silver = "#c7ced9";
const brass = "#c9a24a";
const timber = "#8a5a35";
const darkTimber = "#5a3a22";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const starGold = "#ffd95e";
const warmLight = "#ffe2a0";

const towerAt: LocalPoint = { x: 0.6, z: -1.1 };
const roomRadius = 2.4;
const wallThickness = 0.22;
const roomHeight = 2.6;
const doorHalf = 0.34;
const turretRadius = 0.9;
const turretTop = roomHeight + 1.75;
const tableHeight = 0.9;

const stairInner = roomRadius + 0.05;
const stairOuter = roomRadius + 1.3;
const stairFrom = -0.55;
const stairTo = -2.75;
const stairSteps = 10;
const stairRise = roomHeight / stairSteps;
const landingTo = stairTo - 0.4;

const pinholeAt: LocalPoint = { x: 4.6, z: 3.0 };
const signAt: LocalPoint = { x: -2.5, z: 6.2 };

const around = (angle: number, radius: number, y: number): Triple => [
  towerAt.x + Math.sin(angle) * radius,
  y,
  towerAt.z + Math.cos(angle) * radius,
];

const addSparkle = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  builder.add("glow", colour, new OctahedronGeometry(size, 0), {
    at,
    scale: [1, 1.35, 1],
  });
};

/* The dark room, with a doorway at the front */

const buildRoom = (builder: AttractionBuilder) => {
  const segments = builder.segments(32, 14);
  builder.add(
    "matte",
    stone,
    new LatheGeometry(
      [
        [roomRadius, 0],
        [roomRadius, roomHeight],
        [roomRadius - wallThickness, roomHeight],
        [roomRadius - wallThickness, 0],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      doorHalf,
      Math.PI * 2 - doorHalf * 2,
    ),
    { at: [towerAt.x, 0, towerAt.z] },
  );
  builder.add(
    "matte",
    midnight,
    new LatheGeometry(
      [
        new Vector2(roomRadius - wallThickness - 0.01, roomHeight - 0.02),
        new Vector2(roomRadius - wallThickness - 0.01, 0.02),
      ],
      segments,
      doorHalf + 0.03,
      Math.PI * 2 - doorHalf * 2 - 0.06,
    ),
    { at: [towerAt.x, 0, towerAt.z] },
  );
  builder.add(
    "matte",
    darkStone,
    new LatheGeometry(
      [
        new Vector2(roomRadius + 0.08, 0),
        new Vector2(roomRadius + 0.08, 0.3),
        new Vector2(roomRadius, 0.34),
      ],
      segments,
      doorHalf,
      Math.PI * 2 - doorHalf * 2,
    ),
    { at: [towerAt.x, 0, towerAt.z] },
  );
  builder.cylinder("matte", midnight, {
    radius: roomRadius - wallThickness,
    length: 0.03,
    at: [towerAt.x, 0.015, towerAt.z],
    segments,
  });
  builder.cylinder("matte", "#2a2238", {
    radius: roomRadius + 0.1,
    length: 0.18,
    at: [towerAt.x, roomHeight - 0.09, towerAt.z],
    segments,
  });
  builder.cylinder("paint", navy, {
    radius: roomRadius + 0.02,
    length: 0.3,
    at: [towerAt.x, roomHeight - 0.45, towerAt.z],
    segments,
    isOpen: true,
  });
  [-1, 1].forEach((side) => {
    const at = around(side * (doorHalf + 0.02), roomRadius - 0.1, 0);
    builder.box(
      "matte",
      darkStone,
      [0.36, roomHeight - 0.2, 0.42],
      [at[0], (roomHeight - 0.2) / 2, at[2]],
      [0, side * doorHalf, 0],
    );
  });
  const lintel = around(0, roomRadius - 0.05, 0);
  builder.box(
    "matte",
    darkStone,
    [1.7, 0.5, 0.42],
    [lintel[0], roomHeight - 0.25, lintel[2]],
  );
  builder.box(
    "paint",
    navy,
    [1.2, 0.3, 0.06],
    [lintel[0], roomHeight - 0.27, lintel[2] + 0.22],
  );
  if (builder.isFar) {
    return;
  }
  for (let star = 0; star < 5; star++) {
    addSparkle(
      builder,
      [lintel[0] - 0.4 + star * 0.2, roomHeight - 0.27, lintel[2] + 0.27],
      0.045,
      starGold,
    );
  }
  [-1, 1].forEach((side) => {
    const curtain = around(side * (doorHalf + 0.12), roomRadius - 0.3, 0);
    builder.box(
      "matte",
      "#5a2a6e",
      [0.22, 1.9, 0.08],
      [curtain[0], 1.05, curtain[2]],
      [0, side * 0.3, 0],
    );
    builder.cylinder("paint", brass, {
      radius: 0.03,
      length: 0.3,
      at: [curtain[0], 1.1, curtain[2] + 0.06],
      axis: "x",
      segments: 6,
    });
  });
  const windows = 8;
  for (let window = 0; window < windows; window++) {
    const angle =
      doorHalf +
      0.5 +
      (window / (windows - 1)) * (Math.PI * 2 - doorHalf * 2 - 1.0);
    const at = around(angle, roomRadius + 0.01, 1.9);
    builder.add(
      "paint",
      navy,
      new CylinderGeometry(0.2, 0.2, 0.05, 10)
        .rotateX(Math.PI / 2)
        .rotateY(angle),
      { at },
    );
    builder.add(
      "glass",
      "#5d7aa8",
      new CylinderGeometry(0.14, 0.14, 0.06, 10)
        .rotateX(Math.PI / 2)
        .rotateY(angle),
      { at },
    );
    const pier = around(angle + 0.36, roomRadius + 0.03, 1.1);
    builder.box("matte", darkStone, [0.26, 2.0, 0.08], pier, [
      0,
      angle + 0.36,
      0,
    ]);
  }
};

/** The white viewing table, where the picture of the outside world appears. */
const buildTable = (builder: AttractionBuilder) => {
  const [x, , z] = around(0, 0, 0);
  builder.cylinder("paint", navy, {
    radius: 0.5,
    radiusEnd: 0.6,
    length: 0.12,
    at: [x, 0.06, z],
    segments: 16,
  });
  builder.cylinder("paint", midnight, {
    radius: 0.2,
    radiusEnd: 0.28,
    length: tableHeight - 0.2,
    at: [x, (tableHeight - 0.2) / 2 + 0.08, z],
    segments: 12,
  });
  builder.lathe(
    "paint",
    "#f4f1ea",
    [
      [0.25, tableHeight - 0.2],
      [0.85, tableHeight - 0.05],
      [0.9, tableHeight + 0.02],
      [0.8, tableHeight + 0.02],
      [0.001, tableHeight - 0.04],
    ],
    [x, 0, z],
    "y",
    builder.segments(24, 10),
  );
  builder.torus(
    "paint",
    brass,
    0.88,
    0.03,
    [x, tableHeight + 0.02, z],
    "y",
    builder.segments(24, 10),
  );
};

/** The picture on the table: the sea, a hill, a boat and the Sun. */
const buildPicture = (builder: AttractionBuilder) => {
  builder.painted(
    new LatheGeometry(
      [new Vector2(0.78, 0), new Vector2(0.001, -0.04)],
      builder.segments(28, 12),
    ),
    ({ x, z }) => {
      if (Math.hypot(x - 0.35, z + 0.35) < 0.12) {
        return { colour: "#fff2a0", finish: "glow" };
      }
      if (z > 0.15 + Math.sin(x * 4) * 0.08) {
        return { colour: "#5fd36a", finish: "glow" };
      }
      if (z > -0.05) {
        return { colour: "#4aa8ff", finish: "glow" };
      }
      return { colour: "#a8dcff", finish: "glow" };
    },
    {},
    "glow",
  );
  if (builder.isFar) {
    return;
  }
  builder.box("glow", "#f4f1ea", [0.12, 0.012, 0.08], [-0.25, 0.01, 0.06]);
  builder.add(
    "glow",
    "#ff6b5a",
    new ConeGeometry(0.06, 0.012, 3).rotateY(0.3),
    { at: [-0.24, 0.012, 0.0] },
  );
  builder.box("glow", "#c95a3a", [0.1, 0.012, 0.1], [0.25, 0.01, 0.4]);
  builder.box("glow", "#2e8a3a", [0.12, 0.012, 0.12], [-0.35, 0.01, 0.42]);
};

/* The roof terrace and the turret with its turning mirror */

const buildRoof = (builder: AttractionBuilder) => {
  const segments = builder.segments(32, 14);
  builder.cylinder("matte", "#8f8a80", {
    radius: roomRadius + 0.05,
    length: 0.1,
    at: [towerAt.x, roomHeight + 0.01, towerAt.z],
    segments,
  });
  const gapCentre = stairTo - 0.2;
  const parapetFrom = gapCentre + 0.35;
  builder.add(
    "matte",
    stone,
    new LatheGeometry(
      [
        [roomRadius + 0.05, roomHeight],
        [roomRadius + 0.05, roomHeight + 0.95],
        [roomRadius - 0.1, roomHeight + 0.95],
        [roomRadius - 0.1, roomHeight],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      parapetFrom,
      Math.PI * 2 - 0.7,
    ),
    { at: [towerAt.x, 0, towerAt.z] },
  );
  builder.add(
    "paint",
    navy,
    new LatheGeometry(
      [
        [roomRadius + 0.09, roomHeight + 0.9],
        [roomRadius + 0.09, roomHeight + 1.02],
        [roomRadius - 0.14, roomHeight + 1.02],
        [roomRadius - 0.14, roomHeight + 0.9],
      ].map(([radius, height]) => new Vector2(radius, height)),
      segments,
      parapetFrom,
      Math.PI * 2 - 0.7,
    ),
    { at: [towerAt.x, 0, towerAt.z] },
  );
  builder.cylinder("matte", stone, {
    radius: turretRadius,
    length: turretTop - roomHeight,
    at: [towerAt.x, (roomHeight + turretTop) / 2, towerAt.z],
    segments: builder.segments(20, 10),
  });
  builder.cylinder("paint", navy, {
    radius: turretRadius + 0.08,
    length: 0.16,
    at: [towerAt.x, turretTop - 0.05, towerAt.z],
    segments: builder.segments(20, 10),
  });
  builder.add("paint", navy, new BoxGeometry(0.5, 0.95, 0.06), {
    at: around(Math.PI * 0.75, turretRadius + 0.01, roomHeight + 0.5),
    rotation: [0, Math.PI * 0.75, 0],
  });
  if (builder.isFar) {
    return;
  }
  for (let lamp = 0; lamp < 8; lamp++) {
    const angle = (lamp / 8) * Math.PI * 2;
    if (Math.abs(angle - Math.PI * 2 - gapCentre) < 0.4) {
      continue;
    }
    addSparkle(
      builder,
      around(angle, roomRadius - 0.02, roomHeight + 1.12),
      0.07,
      lamp % 2 === 0 ? glowCyan : glowViolet,
    );
  }
  const scopeAt = around(0.5, roomRadius - 0.35, roomHeight);
  builder.cylinder("metal", silver, {
    radius: 0.05,
    length: 0.85,
    at: [scopeAt[0], roomHeight + 0.43, scopeAt[2]],
    segments: 6,
  });
  builder.add(
    "paint",
    brass,
    new CylinderGeometry(0.07, 0.1, 0.6, 10).rotateX(-1.2).rotateY(0.5),
    {
      at: [scopeAt[0], roomHeight + 0.95, scopeAt[2]],
    },
  );
};

/** The hood on top of the turret, with its mirror and lens, which turns to look about. */
const buildPeriscope = (builder: AttractionBuilder) => {
  builder.cylinder("metal", brass, {
    radius: 0.5,
    length: 0.12,
    at: [0, 0.06, 0],
    segments: builder.segments(18, 8),
  });
  builder.cylinder("paint", midnight, {
    radius: 0.38,
    length: 0.55,
    at: [0, 0.38, 0],
    segments: builder.segments(18, 8),
  });
  builder.add("paint", navy, new BoxGeometry(0.62, 0.62, 0.7), {
    at: [0, 0.95, 0.05],
  });
  builder.add(
    "paint",
    brass,
    new CylinderGeometry(0.22, 0.26, 0.2, builder.segments(16, 8)).rotateX(
      Math.PI / 2,
    ),
    { at: [0, 0.95, 0.47] },
  );
  builder.add(
    "glass",
    "#9fd8ff",
    new CylinderGeometry(0.19, 0.19, 0.04, builder.segments(16, 8)).rotateX(
      Math.PI / 2,
    ),
    { at: [0, 0.95, 0.58] },
  );
  builder.add("paint", navy, new BoxGeometry(0.7, 0.06, 0.82).rotateX(-0.2), {
    at: [0, 1.3, 0.08],
  });
  builder.cylinder("metal", silver, {
    radius: 0.03,
    length: 0.6,
    at: [0, 1.6, -0.1],
    segments: 6,
  });
  addSparkle(builder, [0, 2.0, -0.1], 0.13, starGold);
};

/* The stairs that wind round the outside, up to the roof */

const stairAngle = (step: number): number =>
  stairFrom + ((stairTo - stairFrom) * (step + 0.5)) / stairSteps;

const buildStairs = (builder: AttractionBuilder) => {
  const middle = (stairInner + stairOuter) / 2;
  const width = stairOuter - stairInner;
  const sweep = Math.abs(stairTo - stairFrom) / stairSteps;
  for (let step = 0; step < stairSteps; step++) {
    const angle = stairAngle(step);
    const top = (step + 1) * stairRise;
    const tread = middle * sweep + 0.04;
    const at = around(angle, middle, top - 0.06);
    builder.box(
      "matte",
      step % 2 === 0 ? darkStone : shade(darkStone, 1.08),
      [width, 0.12, tread],
      at,
      [0, angle + Math.PI / 2, 0],
    );
    if (!builder.isFar) {
      const post = around(angle, stairOuter - 0.08, 0);
      builder.cylinder("metal", midnight, {
        radius: 0.04,
        length: top + 1.0,
        at: [post[0], (top + 1.0) / 2, post[2]],
        segments: 6,
      });
    }
    const leg = around(angle, middle, 0);
    builder.box(
      "matte",
      shade(darkStone, 0.85),
      [0.18, top - 0.12, 0.18],
      [leg[0], (top - 0.12) / 2, leg[2]],
    );
  }
  const landing = (stairTo + landingTo) / 2;
  const landingAt = around(landing, middle, roomHeight - 0.06);
  builder.box(
    "matte",
    darkStone,
    [width, 0.12, middle * Math.abs(landingTo - stairTo) + 0.1],
    landingAt,
    [0, landing + Math.PI / 2, 0],
  );
  builder.box(
    "matte",
    shade(darkStone, 0.85),
    [0.2, roomHeight - 0.12, 0.2],
    [landingAt[0], (roomHeight - 0.12) / 2, landingAt[2]],
  );
  const railPoints = Array.from({ length: stairSteps + 2 }, (_, index) => {
    const angle =
      index <= stairSteps
        ? stairFrom + ((stairTo - stairFrom) * index) / stairSteps
        : landingTo;
    const height = Math.min(roomHeight, index * stairRise) + 1.0;
    return around(angle, stairOuter - 0.08, height);
  });
  railPoints.slice(1).forEach((point, index) => {
    builder.bar("paint", brass, railPoints[index], point, 0.06, 6);
  });
};

const stairDeck: Deck = ({ x, z }) => {
  const dx = x - towerAt.x;
  const dz = z - towerAt.z;
  const radius = Math.hypot(dx, dz);
  if (radius <= roomRadius - 0.05) {
    return { height: roomHeight + 0.06, kind: "bridge" };
  }
  if (radius < stairInner - 0.05 || radius > stairOuter) {
    return undefined;
  }
  let angle = Math.atan2(dx, dz);
  if (angle > 0.5) {
    angle -= Math.PI * 2;
  }
  if (angle > stairFrom || angle < landingTo) {
    return undefined;
  }
  if (angle <= stairTo) {
    return { height: roomHeight, kind: "bridge" };
  }
  const step = Math.min(
    stairSteps - 1,
    Math.floor(((stairFrom - angle) / (stairFrom - stairTo)) * stairSteps),
  );
  return { height: (step + 1) * stairRise, kind: "bridge" };
};

/* A giant pinhole camera, to see how the picture turns upside down */

const buildPinholeCamera = (builder: AttractionBuilder) => {
  const { x, z } = pinholeAt;
  const turn = -0.5;
  const place = (along: number, y: number, across: number): Triple => [
    x + along * Math.cos(turn) + across * Math.sin(turn),
    y,
    z - along * Math.sin(turn) + across * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  [-0.55, 0.55].forEach((along) => {
    [-0.35, 0.35].forEach((across) => {
      builder.box(
        "matte",
        darkTimber,
        [0.08, 0.9, 0.08],
        place(along, 0.45, across),
        rotation,
      );
    });
  });
  builder.box("matte", timber, [1.5, 0.95, 0.95], place(0, 1.35, 0), rotation);
  builder.box(
    "matte",
    darkTimber,
    [1.56, 0.08, 1.0],
    place(0, 1.86, 0),
    rotation,
  );
  builder.box(
    "paint",
    midnight,
    [0.04, 0.5, 0.5],
    place(-0.76, 1.35, 0),
    rotation,
  );
  builder.cylinder("paint", brass, {
    radius: 0.05,
    length: 0.06,
    at: place(-0.78, 1.35, 0),
    axis: "x",
    segments: 8,
  });
  builder.add("glow", "#e9f6ff", new BoxGeometry(0.03, 0.6, 0.6), {
    at: place(0.76, 1.35, 0),
    rotation,
  });
  builder.box(
    "glow",
    "#5fd36a",
    [0.035, 0.3, 0.1],
    place(0.775, 1.42, 0),
    rotation,
  );
  builder.add(
    "glow",
    "#2e8a3a",
    new ConeGeometry(0.18, 0.35, 6).rotateZ(Math.PI),
    {
      at: place(0.775, 1.25, 0),
      rotation,
      scale: [0.2, 1, 1],
    },
  );
  const treeAt = place(-2.2, 0, 0);
  addTree(builder, treeAt, 0.55, "#3f8a3a");
  if (builder.isFar) {
    return;
  }
  const crown = place(-2.2, 1.35, 0);
  const pinhole = place(-0.78, 1.35, 0);
  const screenTop = place(0.76, 1.5, 0);
  const screenFoot = place(0.76, 1.1, 0);
  builder.bar("glow", "#fff2a0", [crown[0], 1.55, crown[2]], pinhole, 0.015, 3);
  builder.bar(
    "glow",
    "#fff2a0",
    [treeAt[0], 0.3, treeAt[2]],
    pinhole,
    0.015,
    3,
  );
  builder.bar("glow", "#fff2a0", pinhole, screenFoot, 0.015, 3);
  builder.bar("glow", "#fff2a0", pinhole, screenTop, 0.015, 3);
};

const buildLantern = (builder: AttractionBuilder, at: LocalPoint) => {
  builder.cylinder("paint", midnight, {
    radius: 0.08,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 8,
  });
  builder.cylinder("paint", midnight, {
    radius: 0.035,
    length: 2.1,
    at: [at.x, 1.2, at.z],
    segments: 6,
  });
  builder.box("glow", warmLight, [0.2, 0.26, 0.2], [at.x, 2.35, at.z]);
  builder.add(
    "paint",
    midnight,
    new ConeGeometry(0.2, 0.16, 4).rotateY(Math.PI / 4),
    { at: [at.x, 2.56, at.z] },
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", "#c9c3b6", [1.6, 0.03, 4.6], [towerAt.x, 0.015, 4.2]);
  builder.cylinder("matte", "#c9c3b6", {
    radius: 1.3,
    length: 0.03,
    at: [towerAt.x, 0.016, towerAt.z + roomRadius + 0.9],
    segments: builder.segments(20, 10),
  });
  buildRoom(builder);
  buildTable(builder);
  buildRoof(builder);
  buildStairs(builder);
  buildPinholeCamera(builder);
  buildLantern(builder, { x: -0.6, z: 3.4 });
  buildLantern(builder, { x: 1.8, z: 3.4 });
  buildLantern(builder, { x: -0.6, z: 6.2 });
  buildLantern(builder, { x: 1.8, z: 6.2 });
  addBench(builder, [3.6, 0, 6.0], Math.PI + 0.3, "#7d8fc4");
  addBush(builder, [4.8, 0, -3.8], 0.6, "#2f5e46");
  addBush(builder, [-4.2, 0, 2.2], 0.5, "#2f5e46");
  addBush(builder, [-1.2, 0, -5.9], 0.55, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* Visitors, strolling about */

const buildVisitor = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((x) => {
    builder.cylinder("paint", midnight, {
      radius: 0.06,
      length: 0.46,
      at: [x, 0.23, 0],
      segments: builder.segments(6, 4),
    });
  });
  builder.cylinder("paint", "#e8a33a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.42,
    at: [0, 0.66, 0],
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    builder.sphere("paint", "#e9b48a", 0.14, [0, 1.0, 0], [1, 1, 1], 6);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#e8a33a",
      [side * 0.17, 0.84, 0],
      [side * 0.22, 0.52, 0.06],
      0.08,
      5,
    );
  });
  builder.sphere("paint", "#e9b48a", 0.14, [0, 1.0, 0], [1, 1, 1], 10);
  builder.sphere("paint", "#3a2418", 0.145, [0, 1.04, -0.02], [1, 0.75, 1], 8);
  builder.box("paint", midnight, [0.14, 0.1, 0.08], [0, 0.72, 0.16]);
  builder.cylinder("glass", "#62a8d8", {
    radius: 0.035,
    length: 0.03,
    at: [0, 0.72, 0.21],
    axis: "z",
    segments: 8,
  });
};

export const cameraObscuraModel: NewLandAttractionModel = {
  kind: "camera-obscura",
  islandId: "starfall-isle",
  name: "Camera Obscura",
  fact: "Light travels in straight lines. In a camera obscura, light from outside passes through a tiny hole or lens into a dark room, and a picture of the world outside appears on a white table. Because the rays cross over as they pass through the hole, a pinhole camera's picture is upside down.",
  curriculumLink:
    "Science, Year 6: light. Recognise that light appears to travel in straight lines, and use this idea to explain how we see objects and how pictures and shadows form.",
  footprint: 8,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "periscope",
      pivot: [towerAt.x, turretTop + 0.03, towerAt.z],
      build: buildPeriscope,
      motion: { kind: "whirl", axis: "y", idle: 0.12, speed: 1.2, reach: 7 },
    },
    {
      name: "table-picture",
      pivot: [towerAt.x, tableHeight + 0.03, towerAt.z],
      build: buildPicture,
      motion: { kind: "wake", reach: 3.2 },
    },
  ],
  blockers: [
    { x: pinholeAt.x, z: pinholeAt.z, radius: 0.85 },
    { x: towerAt.x, z: towerAt.z, radius: 0.8 },
  ] satisfies LocalBlocker[],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 3,
      centre: { x: -3.6, z: 3.6 },
      radius: 1.2,
      speed: 0.35,
    },
  ],
  decks: [stairDeck],
  tune: [67, 71, 74, 79, 78, 74, 71, 67, 69, 72],
  play: {
    label: "Turn the roof mirror",
    news: "The mirror on the roof turned slowly, and a moving picture of the island outside slid across the white table, carried in by light travelling in straight lines.",
  },
};
