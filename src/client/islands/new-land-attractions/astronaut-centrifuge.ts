import {
  ConeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import {
  addBush,
  addSignBoard,
  findMotionPose,
  moveWithPose,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const midnight = "#1b2350";
const navy = "#26346e";
const silver = "#c7ced9";
const white = "#eef1f6";
const darkMetal = "#3e4450";
const podOrange = "#f08a2c";
const suitOrange = "#ee7a24";
const glowCyan = "#62f0ff";
const glowViolet = "#b58cff";
const glowWhite = "#f4f8ff";
const starGold = "#ffd95e";
const heartRed = "#ff4a5e";
const floorGrey = "#9da2b0";
const floorDark = "#555c6c";

const hubAt: LocalPoint = { x: -0.6, z: -0.4 };
const armRadius = 3.6;
const armY = 2.25;
const seatY = 0.95;
const fenceRadius = 4.7;
const gateHalf = 0.24;
const centrifugeSpeed = 1.35;

const gallery = { minX: 4.5, maxX: 7.1, minZ: -4.0, maxZ: -1.4 };
const galleryHeight = 0.9;
const stepDepth = 0.4;
const signAt: LocalPoint = { x: -2.6, z: 7.4 };
const dialAt: Triple = [
  gallery.maxX - 0.4,
  galleryHeight + 1.45,
  gallery.minZ + 0.42,
];

const armPivot: Triple = [hubAt.x, 0, hubAt.z];
const armMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: armRadius,
  count: 2,
  speed: centrifugeSpeed,
  isFacingAlong: true,
  bob: 0.04,
};

const around = (angle: number, radius: number, y: number): Triple => [
  hubAt.x + Math.sin(angle) * radius,
  y,
  hubAt.z + Math.cos(angle) * radius,
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

/* The hub in the middle, which drives the arms round */

const buildHub = (builder: AttractionBuilder) => {
  const { x, z } = hubAt;
  const segments = builder.segments(24, 12);
  builder.cylinder("matte", floorDark, {
    radius: 1.35,
    length: 0.12,
    at: [x, 0.06, z],
    segments,
  });
  builder.cylinder("paint", navy, {
    radius: 0.95,
    radiusEnd: 0.8,
    length: 1.6,
    at: [x, 0.92, z],
    segments,
  });
  builder.cylinder("paint", white, {
    radius: 0.62,
    length: 0.5,
    at: [x, 1.95, z],
    segments,
  });
  builder.cylinder("glow", glowCyan, {
    radius: 0.82,
    length: 0.08,
    at: [x, 1.55, z],
    segments,
    isOpen: true,
  });
  builder.cylinder("metal", silver, {
    radius: 0.7,
    length: 0.08,
    at: [x, 2.22, z],
    segments,
  });
  if (builder.isFar) {
    return;
  }
  for (let bolt = 0; bolt < 12; bolt++) {
    const angle = (bolt / 12) * Math.PI * 2;
    builder.cylinder("metal", silver, {
      radius: 0.04,
      length: 1.5,
      at: around(angle, 0.92 - 0.06, 0.88),
      segments: 5,
    });
  }
  [-1, 1].forEach((side) => {
    const at = around(side * 1.2 + Math.PI, 0.85, 0.75);
    builder.box(
      "glow",
      side < 0 ? "#7dff9a" : starGold,
      [0.12, 0.12, 0.02],
      at,
      [0, side * 1.2 + Math.PI, 0],
    );
  });
  builder.box("paint", white, [0.6, 0.3, 0.03], around(0, 0.9, 1.1), [0, 0, 0]);
  addSparkle(builder, around(0, 0.93, 1.1), 0.08, starGold);
};

/** A warning beacon on top of the hub, which whirls faster as you come near. */
const buildBeacon = (builder: AttractionBuilder) => {
  builder.cylinder("metal", darkMetal, {
    radius: 0.2,
    length: 0.12,
    at: [0, 0.06, 0],
    segments: 12,
  });
  builder.cylinder("glass", "#ff9a5a", {
    radius: 0.16,
    length: 0.3,
    at: [0, 0.27, 0],
    segments: 12,
  });
  builder.box("glow", "#ff6a2a", [0.3, 0.16, 0.06], [0, 0.27, 0]);
  builder.sphere("glow", starGold, 0.06, [0, 0.47, 0], [1, 1, 1], 8);
};

const buildBeaconBeam = (builder: AttractionBuilder) => {
  [-1, 1].forEach((side) => {
    builder.add(
      "glow",
      "#ffa060",
      new ConeGeometry(0.5, 3.4, 10, 1, true)
        .translate(0, -1.7, 0)
        .rotateZ(side * (Math.PI / 2)),
      {},
    );
  });
};

/* One arm and its pod; the orbit carries two of them round. Local +x points out. */

const buildArm = (builder: AttractionBuilder) => {
  const inner = -armRadius + 0.55;
  const outer = -0.35;
  const segments = builder.segments(16, 8);
  builder.box(
    "paint",
    white,
    [outer - inner, 0.22, 0.36],
    [(inner + outer) / 2, armY, 0],
  );
  builder.box(
    "paint",
    navy,
    [outer - inner, 0.06, 0.38],
    [(inner + outer) / 2, armY + 0.14, 0],
  );
  builder.box("paint", white, [0.9, 0.3, 0.5], [inner - 0.1, armY, 0]);
  if (!builder.isFar) {
    const braces = 6;
    for (let brace = 0; brace < braces; brace++) {
      const from = inner + ((outer - inner) * brace) / braces;
      const to = inner + ((outer - inner) * (brace + 1)) / braces;
      builder.bar(
        "metal",
        silver,
        [from, armY - 0.1, 0.19],
        [to, armY + 0.1, 0.19],
        0.04,
        4,
      );
      builder.bar(
        "metal",
        silver,
        [from, armY + 0.1, -0.19],
        [to, armY - 0.1, -0.19],
        0.04,
        4,
      );
    }
    for (let light = 0; light < 7; light++) {
      builder.add(
        "glow",
        light % 2 === 0 ? glowCyan : glowViolet,
        new IcosahedronGeometry(0.05, 0),
        {
          at: [
            inner + 0.2 + light * ((outer - inner - 0.4) / 6),
            armY - 0.13,
            0,
          ],
        },
      );
    }
  }
  builder.box(
    "metal",
    darkMetal,
    [0.24, 0.5, 0.9],
    [outer + 0.05, armY - 0.1, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      silver,
      [0, armY - 0.25, side * 0.42],
      [0.18, seatY + 0.6, side * 0.55],
      0.07,
      6,
    );
  });
  builder.lathe(
    "paint",
    podOrange,
    [
      [0.001, seatY - 0.32],
      [0.4, seatY - 0.3],
      [0.55, seatY - 0.12],
      [0.6, seatY + 0.25],
      [0.58, seatY + 0.5],
      [0.52, seatY + 0.55],
    ],
    [0.12, 0, 0],
    "y",
    segments,
  );
  builder.lathe(
    "matte",
    midnight,
    [
      [0.5, seatY + 0.52],
      [0.52, seatY + 0.2],
      [0.42, seatY - 0.15],
      [0.001, seatY - 0.2],
    ],
    [0.12, 0, 0],
    "y",
    segments,
  );
  builder.torus(
    "metal",
    silver,
    0.54,
    0.04,
    [0.12, seatY + 0.55, 0],
    "y",
    segments,
  );
  builder.box("paint", white, [0.5, 0.08, 0.45], [0.12, seatY - 0.04, 0]);
  builder.box(
    "paint",
    white,
    [0.1, 0.6, 0.5],
    [0.42, seatY + 0.25, 0],
    [0, 0, 0.2],
  );
  builder.add(
    "paint",
    podOrange,
    new TorusGeometry(0.55, 0.05, 5, builder.segments(14, 6), Math.PI),
    {
      at: [0.12, seatY + 0.55, 0],
      rotation: [0, Math.PI / 2, 0],
    },
  );
  builder.box(
    "glass",
    "#9fd8ff",
    [0.04, 0.32, 0.7],
    [0.4, seatY + 0.85, 0],
    [0, 0, 0.5],
  );
  if (builder.isFar) {
    return;
  }
  builder.box("paint", navy, [0.62, 0.1, 0.02], [0.12, seatY + 0.2, -0.6]);
  addSparkle(builder, [0.12, seatY + 0.2, -0.62], 0.06, starGold);
  builder.box("glow", heartRed, [0.18, 0.1, 0.02], [0.12, seatY + 0.4, -0.58]);
  builder.sphere(
    "glow",
    glowWhite,
    0.06,
    [0.12, seatY - 0.36, 0],
    [1, 1, 1],
    6,
  );
};

/* The safety ring round the arena, and its gate */

const buildFence = (builder: AttractionBuilder) => {
  const span = Math.PI * 2 - gateHalf * 2;
  const panels = builder.isFar ? 8 : 22;
  for (let panel = 0; panel <= panels; panel++) {
    const angle = gateHalf + (panel / panels) * span;
    builder.cylinder("metal", silver, {
      radius: 0.06,
      length: 1.15,
      at: around(angle, fenceRadius, 0.575),
      segments: 6,
    });
  }
  builder.add(
    "glass",
    "#c6e6f6",
    new LatheGeometry(
      [new Vector2(fenceRadius, 0.1), new Vector2(fenceRadius, 1.05)],
      builder.segments(44, 16),
      gateHalf,
      span,
    ),
    { at: [hubAt.x, 0, hubAt.z] },
  );
  builder.add(
    "paint",
    navy,
    new TorusGeometry(fenceRadius, 0.06, 4, builder.segments(44, 16), span)
      .rotateX(Math.PI / 2)
      .rotateY(Math.PI * 1.5 - gateHalf),
    { at: [hubAt.x, 1.12, hubAt.z] },
  );
  [-1, 1].forEach((side) => {
    const at = around(side * gateHalf, fenceRadius, 0);
    builder.cylinder("paint", navy, {
      radius: 0.14,
      length: 2.5,
      at: [at[0], 1.25, at[2]],
      segments: 10,
    });
    builder.sphere(
      "glow",
      side < 0 ? glowCyan : glowViolet,
      0.16,
      [at[0], 2.6, at[2]],
      [1, 1, 1],
      8,
    );
  });
  const left = around(-gateHalf, fenceRadius, 0);
  const right = around(gateHalf, fenceRadius, 0);
  builder.box(
    "paint",
    navy,
    [right[0] - left[0] + 0.3, 0.4, 0.12],
    [(left[0] + right[0]) / 2, 2.3, left[2]],
  );
  if (!builder.isFar) {
    for (let star = 0; star < 5; star++) {
      addSparkle(
        builder,
        [
          left[0] + 0.45 + star * ((right[0] - left[0] - 0.9) / 4),
          2.3,
          left[2] + 0.09,
        ],
        0.07,
        star % 2 === 0 ? starGold : glowWhite,
      );
    }
  }
};

const buildArena = (builder: AttractionBuilder) => {
  const segments = builder.segments(44, 16);
  builder.cylinder("matte", floorGrey, {
    radius: fenceRadius + 0.2,
    length: 0.03,
    at: [hubAt.x, 0.015, hubAt.z],
    segments,
  });
  builder.add(
    "matte",
    floorDark,
    new LatheGeometry(
      [
        new Vector2(armRadius + 0.8, 0.033),
        new Vector2(armRadius - 0.8, 0.033),
      ],
      segments,
    ),
    { at: [hubAt.x, 0, hubAt.z] },
  );
  if (builder.isFar) {
    return;
  }
  [armRadius + 0.85, armRadius - 0.85].forEach((radius) => {
    builder.add(
      "glow",
      starGold,
      new LatheGeometry(
        [new Vector2(radius + 0.04, 0.036), new Vector2(radius - 0.04, 0.036)],
        44,
      ),
      { at: [hubAt.x, 0, hubAt.z] },
    );
  });
  for (let mark = 0; mark < 16; mark++) {
    const angle = (mark / 16) * Math.PI * 2;
    builder.box(
      "paint",
      mark % 2 === 0 ? glowCyan : navy,
      [0.08, 0.01, 0.5],
      around(angle, armRadius, 0.04),
      [0, angle, 0],
    );
  }
};

/* The viewing gallery, with the controls and the heart monitor */

const galleryDeck: Deck = ({ x, z }) => {
  if (x < gallery.minX || x > gallery.maxX) {
    return undefined;
  }
  if (z >= gallery.minZ && z <= gallery.maxZ) {
    return { height: galleryHeight, kind: "bridge" };
  }
  if (
    z > gallery.maxZ &&
    z <= gallery.maxZ + stepDepth * 2 &&
    x <= gallery.minX + 1.4
  ) {
    const step = z <= gallery.maxZ + stepDepth ? 2 : 1;
    return { height: (galleryHeight * step) / 3, kind: "bridge" };
  }
  return undefined;
};

const buildGallery = (builder: AttractionBuilder) => {
  const width = gallery.maxX - gallery.minX;
  const depth = gallery.maxZ - gallery.minZ;
  const midX = (gallery.minX + gallery.maxX) / 2;
  const midZ = (gallery.minZ + gallery.maxZ) / 2;
  builder.box(
    "paint",
    white,
    [width, galleryHeight, depth],
    [midX, galleryHeight / 2, midZ],
  );
  builder.box(
    "metal",
    "#7d8592",
    [width + 0.06, 0.05, depth + 0.06],
    [midX, galleryHeight + 0.02, midZ],
  );
  [1, 2].forEach((step) => {
    const top = (galleryHeight * step) / 3;
    const z = gallery.maxZ + stepDepth * (2 - step) + stepDepth / 2;
    builder.box(
      "paint",
      step % 2 === 0 ? navy : white,
      [1.4, top, stepDepth],
      [gallery.minX + 0.7, top / 2, z],
    );
  });
  const railY = galleryHeight + 1.0;
  const rails: [LocalPoint, LocalPoint][] = [
    [
      { x: gallery.minX + 0.05, z: gallery.minZ },
      { x: gallery.minX + 0.05, z: gallery.maxZ - 0.05 },
    ],
    [
      { x: gallery.minX + 1.45, z: gallery.maxZ - 0.05 },
      { x: gallery.maxX, z: gallery.maxZ - 0.05 },
    ],
    [
      { x: gallery.maxX - 0.05, z: gallery.maxZ },
      { x: gallery.maxX - 0.05, z: gallery.minZ },
    ],
  ];
  rails.forEach(([from, to]) => {
    builder.bar(
      "paint",
      starGold,
      [from.x, railY, from.z],
      [to.x, railY, to.z],
      0.06,
      6,
    );
    const posts = Math.max(
      1,
      Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 0.8),
    );
    for (let post = 0; post <= posts; post++) {
      const share = post / posts;
      builder.box(
        "metal",
        silver,
        [0.05, 1.0, 0.05],
        [
          from.x + (to.x - from.x) * share,
          galleryHeight + 0.5,
          from.z + (to.z - from.z) * share,
        ],
      );
    }
    builder.bar(
      "metal",
      silver,
      [from.x, galleryHeight + 0.5, from.z],
      [to.x, galleryHeight + 0.5, to.z],
      0.03,
      4,
    );
  });
  const deskZ = gallery.minZ + 0.45;
  builder.box(
    "paint",
    navy,
    [2.2, 0.85, 0.6],
    [midX + 0.2, galleryHeight + 0.42, deskZ],
  );
  builder.box(
    "paint",
    midnight,
    [2.3, 0.06, 0.7],
    [midX + 0.2, galleryHeight + 0.87, deskZ],
  );
  [-0.65, 0.2, 1.05].forEach((along, index) => {
    builder.box(
      "paint",
      darkMetal,
      [0.7, 0.5, 0.06],
      [midX + along, galleryHeight + 1.2, deskZ - 0.18],
      [-0.2, 0, 0],
    );
    builder.box(
      "glow",
      index === 1 ? "#0f2f2a" : "#14234a",
      [0.62, 0.42, 0.02],
      [midX + along, galleryHeight + 1.2, deskZ - 0.14],
      [-0.2, 0, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  const beats = [0, 0, 0.12, -0.1, 0.18, 0, 0, 0.12, -0.1, 0.18, 0, 0];
  beats.slice(1).forEach((rise, index) => {
    const x0 = midX + 0.2 - 0.28 + (index / (beats.length - 1)) * 0.56;
    const x1 = midX + 0.2 - 0.28 + ((index + 1) / (beats.length - 1)) * 0.56;
    builder.bar(
      "glow",
      heartRed,
      [x0, galleryHeight + 1.2 + beats[index], deskZ - 0.12],
      [x1, galleryHeight + 1.2 + rise, deskZ - 0.12],
      0.018,
      3,
    );
  });
  for (let line = 0; line < 4; line++) {
    builder.box(
      "glow",
      line % 2 === 0 ? glowCyan : "#7dff9a",
      [0.4 - line * 0.06, 0.03, 0.01],
      [midX - 0.65, galleryHeight + 1.32 - line * 0.08, deskZ - 0.12],
      [-0.2, 0, 0],
    );
  }
  for (let button = 0; button < 6; button++) {
    builder.box(
      "glow",
      button % 3 === 0 ? heartRed : button % 3 === 1 ? glowCyan : starGold,
      [0.1, 0.03, 0.1],
      [midX - 0.6 + button * 0.3, galleryHeight + 0.92, deskZ + 0.12],
    );
  }
  builder.cylinder("paint", white, {
    radius: 0.32,
    length: 0.06,
    at: [dialAt[0], dialAt[1], dialAt[2] - 0.04],
    axis: "z",
    segments: 20,
  });
  builder.torus(
    "metal",
    silver,
    0.32,
    0.03,
    [dialAt[0], dialAt[1], dialAt[2] - 0.01],
    "z",
    20,
  );
  for (let tick = 0; tick < 7; tick++) {
    const angle = -1.2 + tick * 0.4;
    builder.box(
      "paint",
      tick > 4 ? heartRed : midnight,
      [0.025, 0.08, 0.01],
      [
        dialAt[0] + Math.sin(angle) * 0.24,
        dialAt[1] + Math.cos(angle) * 0.24,
        dialAt[2],
      ],
      [0, 0, -angle],
    );
  }
};

/** The g-meter's needle, which swings as you come near. */
const buildNeedle = (builder: AttractionBuilder) => {
  builder.box("paint", heartRed, [0.03, 0.24, 0.015], [0, 0.11, 0]);
  builder.cylinder("metal", silver, {
    radius: 0.03,
    length: 0.03,
    at: [0, 0, 0],
    axis: "z",
    segments: 8,
  });
};

/* Trainees in flight suits */

const buildTrainee = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((x) => {
    builder.cylinder("paint", suitOrange, {
      radius: 0.065,
      length: 0.46,
      at: [x, 0.23, 0],
      segments: builder.segments(6, 4),
    });
    builder.box("paint", midnight, [0.12, 0.07, 0.18], [x, 0.035, 0.03]);
  });
  builder.cylinder("paint", suitOrange, {
    radius: 0.16,
    radiusEnd: 0.14,
    length: 0.44,
    at: [0, 0.67, 0],
    segments: builder.segments(10, 6),
  });
  if (builder.isFar) {
    builder.sphere("paint", "#c98d64", 0.14, [0, 1.02, 0], [1, 1, 1], 6);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      suitOrange,
      [side * 0.18, 0.84, 0],
      [side * 0.22, 0.52, 0.04],
      0.08,
      5,
    );
  });
  builder.box("paint", navy, [0.1, 0.07, 0.02], [0.07, 0.78, 0.15]);
  builder.sphere("paint", "#c98d64", 0.14, [0, 1.02, 0], [1, 1, 1], 10);
  builder.sphere("paint", white, 0.155, [0, 1.06, -0.02], [1, 0.8, 1], 8);
  builder.box("glass", "#62a8d8", [0.18, 0.06, 0.02], [0, 1.06, 0.13]);
};

const addStarLamp = (builder: AttractionBuilder, at: LocalPoint) => {
  builder.cylinder("paint", midnight, {
    radius: 0.09,
    length: 0.3,
    at: [at.x, 0.15, at.z],
    segments: 8,
  });
  builder.cylinder("metal", silver, {
    radius: 0.04,
    radiusEnd: 0.03,
    length: 2.3,
    at: [at.x, 1.3, at.z],
    segments: 6,
  });
  builder.sphere("glow", glowWhite, 0.15, [at.x, 2.55, at.z], [1, 1, 1], 8);
  addSparkle(builder, [at.x, 2.85, at.z], 0.09, starGold);
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    floorGrey,
    [1.8, 0.03, 3.6],
    [hubAt.x, 0.015, hubAt.z + fenceRadius + 1.9],
  );
  buildArena(builder);
  buildHub(builder);
  buildFence(builder);
  buildGallery(builder);
  addStarLamp(builder, { x: hubAt.x - 1.3, z: 6.2 });
  addStarLamp(builder, { x: hubAt.x + 1.3, z: 6.2 });
  addBush(builder, [-5.8, 0, -4.4], 0.65, "#2f5e46");
  addBush(builder, [-6.4, 0, 2.6], 0.55, "#2f5e46");
  addBush(builder, [3.8, 0, 6.2], 0.6, "#2f5e46");
  addSignBoard(builder, [signAt.x, 0, signAt.z], navy);
};

/* The ride: climb into a pod and whirl round */

const rideStart: LocalPoint = { x: hubAt.x, z: hubAt.z + fenceRadius - 0.6 };
const rideFinish: LocalPoint = {
  x: hubAt.x + 1.2,
  z: hubAt.z + fenceRadius + 1.4,
};

const centrifugeRide = (progress: number, clockSeconds: number): LocalSpot => {
  const pose = findMotionPose(armMotion, clockSeconds, { copy: 0 });
  const [x, y, z] = moveWithPose(
    armPivot,
    [armPivot[0] + 0.12, seatY + 0.02, armPivot[2]],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1] + Math.PI,
  };
};

export const astronautCentrifugeModel: NewLandAttractionModel = {
  kind: "astronaut-centrifuge",
  islandId: "starfall-isle",
  name: "Astronaut Centrifuge",
  fact: "Astronauts ride centrifuges like this to get ready for the push of a rocket launch. As it spins faster, riders are pressed into their seats and blood is pulled towards their feet, so the heart has to pump harder to push blood up to the brain. Blood travels from the heart in arteries and comes back in veins.",
  curriculumLink:
    "Science, Year 6: animals, including humans. Identify and name the main parts of the human circulatory system, and describe the functions of the heart, blood vessels and blood.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: buildGrounds,
  moving: [
    {
      name: "arms",
      pivot: armPivot,
      build: buildArm,
      motion: armMotion,
    },
    {
      name: "beacon",
      pivot: [hubAt.x, 2.26, hubAt.z],
      build: buildBeacon,
      motion: { kind: "whirl", axis: "y", idle: 0.8, speed: 7, reach: 8 },
    },
    {
      name: "beacon-beams",
      pivot: [hubAt.x, 2.53, hubAt.z],
      build: buildBeaconBeam,
      motion: { kind: "spin", axis: "y", speed: 3 },
      look: "beam",
    },
    {
      name: "g-meter-needle",
      pivot: [dialAt[0], dialAt[1], dialAt[2] + 0.03],
      build: buildNeedle,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 1.0, period: 1.6 },
    },
  ],
  wanderers: [
    {
      name: "trainees",
      build: buildTrainee,
      count: 3,
      centre: { x: 4.4, z: 4.6 },
      radius: 1.0,
      speed: 0.4,
    },
  ],
  blockers: [{ x: hubAt.x, z: hubAt.z, radius: 1.1 }] satisfies LocalBlocker[],
  decks: [galleryDeck],
  rides: [
    {
      id: "centrifuge",
      name: "the astronaut centrifuge",
      start: rideStart,
      reach: 0.6,
      seconds: 18,
      finish: rideFinish,
      follow: centrifugeRide,
    },
  ],
  play: {
    label: "Check your heartbeat",
    news: "Ba-dum, ba-dum! As the centrifuge whirled, your heart pumped harder to push blood round your body, up through your arteries and back through your veins.",
  },
};
