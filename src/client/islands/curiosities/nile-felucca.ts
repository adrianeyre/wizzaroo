import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  RingGeometry,
} from "three";
import {
  addSignBoard,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const mud = "#8a6a45";
const riverBlue = "#2f8fae";
const riverBed = "#3d6b62";
const hullWhite = "#f2ece0";
const trimBlue = "#2c6fb8";
const trimRed = "#c8462f";
const deckTimber = "#a87a4a";
const sparTimber = "#7a5232";
const sailCloth = "#f7f1e2";
const papyrusGreen = "#5f8f34";
const papyrusHead = "#9cbf4a";
const clay = "#b8643a";
const reedBundle = "#c9a760";
const signColour = "#2c6fb8";

const waterLevel = 0.1;
const water = { x: 0, z: -0.6, radiusX: 4.3, radiusZ: 3.0 };
const loop = { x: -0.2, z: -0.75, radius: 1.75 };
const jetty = { x: -0.2, halfWidth: 0.48, minZ: 1.55, maxZ: 3.5 };
const jettyHeight = 0.34;
const boatPivot: Triple = [loop.x, waterLevel, loop.z];
const hullLength = 2.6;
const sailBillow = 0.28;

/** The felucca sails a slow loop round the river, bow first. */
const boatMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: loop.radius,
  count: 1,
  speed: -0.3,
  isFacingAlong: true,
  bob: 0.035,
};

/** A box laid from one point to another, for fronds, ropes and planks. */
const addSlab = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  width: number,
  thickness: number,
) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const level = Math.hypot(dx, dz);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, thickness, Math.hypot(level, dy))
      .rotateX(Math.atan2(-dy, level))
      .rotateY(Math.atan2(dx, dz)),
    { at: [from[0] + dx / 2, from[1] + dy / 2, from[2] + dz / 2] },
    undefined,
  );
};

/** A triangle of cloth bellied out sideways, with a face on each side. */
const buildSailCloth = (
  corners: [Triple, Triple, Triple],
  billow: number,
  rows: number,
): BufferGeometry => {
  const [first, second, third] = corners;
  const pointAt = (across: number, up: number): Triple => {
    const rest = 1 - across - up;
    const belly = billow * 6.75 * across * up * rest;
    return [
      first[0] * rest + second[0] * across + third[0] * up + belly,
      first[1] * rest + second[1] * across + third[1] * up,
      first[2] * rest + second[2] * across + third[2] * up,
    ];
  };
  const positions: number[] = [];
  const addTriangle = (a: Triple, b: Triple, c: Triple) => {
    positions.push(...a, ...b, ...c);
    const offset = -0.012;
    positions.push(
      a[0] + offset,
      a[1],
      a[2],
      c[0] + offset,
      c[1],
      c[2],
      b[0] + offset,
      b[1],
      b[2],
    );
  };
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < rows - row; column++) {
      const here = (r: number, c: number) => pointAt(c / rows, r / rows);
      addTriangle(
        here(row, column),
        here(row, column + 1),
        here(row + 1, column),
      );
      if (column < rows - row - 1) {
        addTriangle(
          here(row, column + 1),
          here(row + 1, column + 1),
          here(row + 1, column),
        );
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  return geometry;
};

/** How wide the hull is, and how high its sheer, along its length. */
const hullHalfBeam = (along: number): number =>
  Math.max(
    0.04,
    0.5 * Math.pow(Math.max(0, 1 - (along / (hullLength / 2)) ** 2), 0.55),
  );
const hullSheer = (along: number): number =>
  0.4 +
  0.2 * (along / (hullLength / 2)) ** 2 +
  (along > 0 ? 0.08 * (along / 1.3) ** 3 : 0);

/** The felucca, bow to local +z, with its origin on the waterline at `origin`. */
const buildBoat = (builder: AttractionBuilder, origin: Triple) => {
  const [ox, oy, oz] = origin;
  const at = (x: number, y: number, z: number): Triple => [
    ox + x,
    oy + y,
    oz + z,
  ];
  const steps = builder.segments(16, 4);
  const keel = -0.16;
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const along = -hullLength / 2 + (hullLength * step) / steps;
    const half = hullHalfBeam(along);
    const top = hullSheer(along);
    const bottom = keel * (1 - (along / (hullLength / 2)) ** 2) + 0.02;
    const points: [number, number][] = [
      [ox - half, oy + top],
      [ox - half * 0.97, oy + top * 0.5],
      [ox - half * 0.72, oy + bottom * 0.5],
      [ox, oy + bottom],
      [ox + half * 0.72, oy + bottom * 0.5],
      [ox + half * 0.97, oy + top * 0.5],
      [ox + half, oy + top],
      [ox + half * 0.82, oy + top - 0.02],
      [ox + half * 0.8, oy + 0.26],
      [ox - half * 0.8, oy + 0.26],
      [ox - half * 0.82, oy + top - 0.02],
    ];
    return { z: oz + along, points };
  });
  builder.loft({
    stations,
    paint: (centre, normal) => {
      const height = centre.y - oy;
      if (normal.y > 0.7 && height < 0.4) {
        return { colour: deckTimber, finish: "matte" };
      }
      if (
        Math.abs(centre.x - ox) < hullHalfBeam(centre.z - oz) * 0.85 &&
        height > 0.24
      ) {
        return { colour: shade(deckTimber, 0.85), finish: "matte" };
      }
      if (height > 0.37) {
        return { colour: trimBlue, finish: "paint" };
      }
      if (height > 0.22 && height < 0.32) {
        return { colour: trimRed, finish: "paint" };
      }
      return { colour: height < 0.05 ? "#3d5a4a" : hullWhite, finish: "paint" };
    },
  });
  /* The mast, raked forward, the long lateen yard and the boom */
  const mastFoot = at(0, 0.26, 0.55);
  const mastHead = at(0, 2.75, 0.85);
  builder.bar("matte", sparTimber, mastFoot, mastHead, 0.1, 10);
  const tack = at(0, 0.62, 1.45);
  const peak = at(0, 4.3, -1.75);
  const clew = at(0, 0.95, -1.3);
  builder.bar("matte", sparTimber, tack, peak, 0.075, 8);
  builder.bar("matte", sparTimber, tack, clew, 0.065, 8);
  builder.add(
    "matte",
    sailCloth,
    buildSailCloth([tack, clew, peak], sailBillow, builder.isFar ? 2 : 8),
  );
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", palette.brass, 0.06, at(0, 2.82, 0.86), [1, 1, 1], 8);
  /* Seams across the sail, and a red pennant flying from the peak */
  [0.3, 0.55, 0.78].forEach((share) => {
    const from: Triple = [
      clew[0] + (peak[0] - clew[0]) * share + 0.01,
      clew[1] + (peak[1] - clew[1]) * share,
      clew[2] + (peak[2] - clew[2]) * share,
    ];
    const to: Triple = [
      tack[0] + (peak[0] - tack[0]) * share + 0.01,
      tack[1] + (peak[1] - tack[1]) * share,
      tack[2] + (peak[2] - tack[2]) * share,
    ];
    const middle: Triple = [
      (from[0] + to[0]) / 2 + sailBillow * 1.1 * (1 - share) + 0.01,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ];
    addSlab(
      builder,
      "matte",
      shade(sailCloth, 0.88),
      from,
      middle,
      0.02,
      0.025,
    );
    addSlab(builder, "matte", shade(sailCloth, 0.88), middle, to, 0.02, 0.025);
  });
  builder.add(
    "paint",
    trimRed,
    new BoxGeometry(0.02, 0.18, 0.5).translate(0, 0, -0.25),
    { at: [peak[0], peak[1] + 0.05, peak[2]], rotation: [0.15, 0, 0] },
    undefined,
  );
  /* Halyard and sheet ropes */
  builder.bar("matte", palette.cream, mastHead, at(0, 0.45, -0.2), 0.018, 4);
  builder.bar("matte", palette.cream, clew, at(0.3, 0.42, -0.95), 0.018, 4);
  builder.bar("matte", palette.cream, mastHead, at(0, 0.5, 1.2), 0.018, 4);
  /* Thwarts, cushions and a blanket for passengers */
  [-0.35, 0.2].forEach((along) => {
    builder.box(
      "matte",
      shade(deckTimber, 1.15),
      [hullHalfBeam(along) * 1.7, 0.05, 0.16],
      at(0, 0.38, along),
    );
  });
  [
    { x: -0.24, z: -0.6, colour: "#d8a03a" },
    { x: 0.24, z: -0.55, colour: "#b23a5a" },
    { x: 0, z: -0.95, colour: "#3a8a7a" },
  ].forEach(({ x, z, colour }, index) => {
    builder.sphere(
      "matte",
      colour,
      0.17,
      at(x, 0.34, z),
      [1, 0.4 + index * 0.05, 0.95],
      10,
    );
  });
  builder.box("matte", "#c2462f", [0.62, 0.02, 0.55], at(0, 0.28, -0.25));
  [-0.42, -0.25, -0.08].forEach((along) => {
    builder.box("matte", "#e8c35a", [0.62, 0.022, 0.04], at(0, 0.282, along));
  });
  /* The rudder and tiller at the stern */
  builder.box(
    "matte",
    sparTimber,
    [0.05, 0.55, 0.28],
    at(0, 0.18, -hullLength / 2 - 0.08),
    [0.25, 0, 0],
  );
  builder.bar(
    "matte",
    sparTimber,
    at(0, 0.55, -hullLength / 2),
    at(0.05, 0.62, -0.75),
    0.04,
    6,
  );
  /* An eye painted on each side of the bow, for luck */
  [-1, 1].forEach((side) => {
    const along = 0.95;
    const x = side * (hullHalfBeam(along) + 0.006);
    builder.add(
      "paint",
      palette.white,
      new CylinderGeometry(0.075, 0.075, 0.01, 12),
      {
        at: at(x, 0.3, along),
        rotation: [0, 0, Math.PI / 2],
        scale: [1, 1, 0.6],
      },
    );
    builder.add(
      "paint",
      "#1e3f7a",
      new CylinderGeometry(0.04, 0.04, 0.014, 10),
      { at: at(x + side * 0.003, 0.3, along), rotation: [0, 0, Math.PI / 2] },
    );
  });
  /* A coil of rope and a clay pot on the foredeck */
  builder.torus(
    "matte",
    palette.cream,
    0.12,
    0.03,
    at(0.05, 0.3, 0.85),
    "y",
    14,
  );
  builder.lathe(
    "matte",
    clay,
    [
      [0, 0],
      [0.08, 0.01],
      [0.11, 0.08],
      [0.08, 0.17],
      [0.05, 0.2],
      [0.06, 0.23],
    ],
    at(-0.15, 0.27, 0.95),
    "y",
    10,
  );
};

const buildRiver = (builder: AttractionBuilder) => {
  const segments = builder.segments(40, 10);
  const oval = (
    radius: number,
    height: number,
    y: number,
    colour: string,
    finish: AttractionFinish,
  ) => {
    builder.add(finish, colour, new CylinderGeometry(1, 1, height, segments), {
      at: [water.x, y, water.z],
      scale: [water.radiusX + radius, 1, water.radiusZ + radius],
    });
  };
  oval(0.45, 0.06, 0.03, mud, "matte");
  if (!builder.isFar) {
    oval(0.05, 0.04, 0.05, riverBed, "matte");
  }
  oval(0, 0.06, waterLevel - 0.02, riverBlue, "water");
  if (builder.isFar) {
    return;
  }
  /* Stones and lumps of mud along the bank */
  for (let index = 0; index < 14; index++) {
    const angle = (index / 14) * Math.PI * 2 + 0.2;
    const x = water.x + Math.cos(angle) * (water.radiusX + 0.3);
    const z = water.z + Math.sin(angle) * (water.radiusZ + 0.3);
    if (Math.abs(x - jetty.x) < 0.8 && z > 1) {
      continue;
    }
    builder.sphere(
      "matte",
      index % 3 === 0 ? palette.stone : shade(mud, 1.15),
      0.13 + (index % 4) * 0.03,
      [x, 0.06, z],
      [1.3, 0.6, 1],
      8,
    );
  }
  /* Ripples on the water */
  [
    [2.6, -1.6, 0.5],
    [-2.9, -0.4, 0.4],
    [1.3, 1.5, 0.35],
    [-1.6, -2.7, 0.45],
  ].forEach(([x, z, radius]) => {
    builder.add(
      "water",
      "#bfe6f0",
      new RingGeometry(radius - 0.03, radius, 20).rotateX(-Math.PI / 2),
      { at: [x, waterLevel + 0.012, z] },
    );
  });
};

const buildJetty = (builder: AttractionBuilder) => {
  const { x, halfWidth, minZ, maxZ } = jetty;
  const length = maxZ - minZ;
  builder.box(
    "matte",
    palette.timber,
    [halfWidth * 2, 0.08, length],
    [x, jettyHeight - 0.04, (minZ + maxZ) / 2],
  );
  /* Posts at each corner and along the sides */
  [-1, 1].forEach((side) => {
    [minZ + 0.05, minZ + 0.85, maxZ - 0.1].forEach((z, index) => {
      if (builder.isFar && index > 0) {
        return;
      }
      const height = index === 0 ? jettyHeight + 0.45 : jettyHeight + 0.12;
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.07,
        length: height,
        at: [x + side * (halfWidth - 0.02), height / 2, z],
        segments: 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  const planks = 14;
  for (let plank = 0; plank < planks; plank++) {
    const z = minZ + 0.08 + (plank * (length - 0.16)) / (planks - 1);
    builder.box(
      "matte",
      shade(
        palette.paleTimber,
        plank % 3 === 0 ? 0.9 : plank % 3 === 1 ? 1.05 : 0.97,
      ),
      [halfWidth * 2 + 0.06, 0.03, 0.12],
      [x, jettyHeight + 0.01, z],
    );
  }
  /* Bundles of reeds lashed along the sides, as on the Nile */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", reedBundle, {
      radius: 0.09,
      length: length - 0.1,
      at: [x + side * (halfWidth + 0.06), jettyHeight - 0.1, (minZ + maxZ) / 2],
      axis: "z",
      segments: 8,
    });
    [0.4, 1.0, 1.6].forEach((along) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.1,
        length: 0.04,
        at: [x + side * (halfWidth + 0.06), jettyHeight - 0.1, minZ + along],
        axis: "z",
        segments: 8,
        isOpen: true,
      });
    });
  });
  /* A mooring rope coiled on the deck, and a woven basket */
  builder.torus(
    "matte",
    palette.cream,
    0.14,
    0.035,
    [x + 0.22, jettyHeight + 0.04, minZ + 0.35],
    "y",
    14,
  );
  builder.torus(
    "matte",
    palette.cream,
    0.09,
    0.03,
    [x + 0.22, jettyHeight + 0.09, minZ + 0.35],
    "y",
    12,
  );
  builder.lathe(
    "matte",
    reedBundle,
    [
      [0, 0],
      [0.17, 0.01],
      [0.2, 0.12],
      [0.22, 0.22],
      [0.2, 0.22],
    ],
    [x - 0.2, jettyHeight, minZ + 1.2],
    "y",
    12,
  );
  [0, 1, 2].forEach((index) => {
    builder.sphere(
      "paint",
      "#d9a32a",
      0.06,
      [
        x - 0.24 + index * 0.06,
        jettyHeight + 0.22,
        minZ + 1.18 + (index % 2) * 0.06,
      ],
      [1, 1, 1],
      8,
    );
  });
  /* A pole lantern at the end of the jetty */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 1.5,
    at: [x - halfWidth + 0.02, jettyHeight + 0.75, minZ + 0.05],
    segments: 6,
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [x - halfWidth + 0.02, jettyHeight + 1.45, minZ + 0.05],
    [x - halfWidth - 0.3, jettyHeight + 1.45, minZ + 0.05],
    0.035,
    6,
  );
  builder.cylinder("metal", palette.brass, {
    radius: 0.09,
    radiusEnd: 0.03,
    length: 0.1,
    at: [x - halfWidth - 0.3, jettyHeight + 1.28, minZ + 0.05],
    segments: 8,
  });
  builder.box(
    "glass",
    "#e9d29a",
    [0.14, 0.18, 0.14],
    [x - halfWidth - 0.3, jettyHeight + 1.14, minZ + 0.05],
  );
};

/** A clump of papyrus: tall stems topped with feathery heads. */
const addPapyrus = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  const stems = builder.isFar ? 1 : 6;
  for (let stem = 0; stem < stems; stem++) {
    const angle = stem * 2.4;
    const lean = 0.12 + (stem % 3) * 0.1;
    const height = (1.4 + (stem % 4) * 0.25) * size;
    const top: Triple = [
      x + Math.cos(angle) * lean * size * 1.5,
      height,
      z + Math.sin(angle) * lean * size * 1.5,
    ];
    builder.bar(
      "matte",
      stem % 2 === 0 ? papyrusGreen : shade(papyrusGreen, 0.85),
      [x + Math.cos(angle) * 0.08, 0, z + Math.sin(angle) * 0.08],
      top,
      0.035,
      4,
    );
    builder.cylinder(
      "matte",
      stem % 2 === 0 ? papyrusHead : shade(papyrusHead, 0.9),
      {
        radius: 0.03,
        radiusEnd: 0.24 * size,
        length: 0.2 * size,
        at: [top[0], top[1] + 0.08 * size, top[2]],
        segments: builder.isFar ? 5 : 8,
        isOpen: !builder.isFar,
      },
    );
  }
};

/** A clay water jar, round-bellied with a narrow neck. */
const addJar = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string,
) => {
  if (builder.isFar) {
    builder.cylinder("matte", colour, {
      radius: 0.2 * size,
      radiusEnd: 0.12 * size,
      length: 0.7 * size,
      at: [at[0], at[1] + 0.35 * size, at[2]],
      segments: 5,
    });
    return;
  }
  builder.lathe(
    "matte",
    colour,
    [
      [0, 0],
      [0.12, 0],
      [0.22, 0.1],
      [0.27, 0.28],
      [0.24, 0.46],
      [0.13, 0.58],
      [0.1, 0.66],
      [0.14, 0.72],
      [0.11, 0.74],
    ].map(([radius, height]): [number, number] => [
      radius * size,
      height * size,
    ]),
    at,
    "y",
    12,
  );
  builder.cylinder("matte", shade(colour, 0.8), {
    radius: 0.272 * size,
    length: 0.04 * size,
    at: [at[0], at[1] + 0.3 * size, at[2]],
    segments: 12,
    isOpen: true,
  });
};

const addPalm = (
  builder: AttractionBuilder,
  at: Triple,
  height: number,
  lean: [number, number],
) => {
  const pieces = builder.isFar ? 2 : 6;
  const pointAt = (share: number): Triple => [
    at[0] + lean[0] * share * share * height,
    at[1] + share * height,
    at[2] + lean[1] * share * share * height,
  ];
  for (let piece = 0; piece < pieces; piece++) {
    builder.bar(
      "matte",
      piece % 2 === 0 ? "#8a6a48" : "#75583a",
      pointAt(piece / pieces),
      pointAt((piece + 1) / pieces),
      0.24 - (piece / pieces) * 0.08,
      builder.isFar ? 5 : 8,
    );
  }
  const top = pointAt(1);
  const fronds = builder.isFar ? 5 : 9;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + 0.3;
    const reach = 1.3 + (frond % 2) * 0.2;
    const out = (distance: number, drop: number): Triple => [
      top[0] + Math.sin(angle) * distance,
      top[1] + drop,
      top[2] + Math.cos(angle) * distance,
    ];
    const colour = frond % 2 === 0 ? "#4f8f3a" : "#3f7a30";
    if (builder.isFar) {
      addSlab(builder, "matte", colour, top, out(reach, -0.4), 0.4, 0.04);
      continue;
    }
    const points = [
      out(0, 0.05),
      out(reach * 0.35, 0.18),
      out(reach * 0.7, 0.05),
      out(reach, -0.4),
    ];
    for (let piece = 0; piece < 3; piece++) {
      addSlab(
        builder,
        "matte",
        colour,
        points[piece],
        points[piece + 1],
        0.42 - piece * 0.11,
        0.035,
      );
      addSlab(
        builder,
        "matte",
        shade(colour, 1.25),
        points[piece],
        points[piece + 1],
        0.05,
        0.05,
      );
    }
  }
  if (!builder.isFar) {
    [0, 2.1, 4.2].forEach((angle) => {
      builder.sphere(
        "matte",
        "#6b4a2a",
        0.1,
        [
          top[0] + Math.sin(angle) * 0.14,
          top[1] - 0.12,
          top[2] + Math.cos(angle) * 0.14,
        ],
        [1, 1, 1],
        8,
      );
    });
  }
};

const buildBanks = (builder: AttractionBuilder) => {
  addPalm(builder, [3.0, 0, 2.9], 3.2, [-0.15, -0.1]);
  addJar(builder, [1.05, 0, 3.15], 1, clay);
  addJar(builder, [1.5, 0, 3.0], 0.85, shade(clay, 1.12));
  addJar(builder, [1.25, 0, 3.6], 1.1, shade(clay, 0.9));
  addPapyrus(builder, -3.7, 1.0, 1);
  addPapyrus(builder, 2.9, -2.8, 1);
  if (builder.isFar) {
    return;
  }
  addPapyrus(builder, 3.6, 1.0, 0.9);
  addPapyrus(builder, -2.4, -3.2, 1.1);
  addPapyrus(builder, -4.1, -1.6, 0.85);

  /* A broken jar lying on its side, and a reed mat in the shade */
  builder.lathe(
    "matte",
    shade(clay, 1.05),
    [
      [0.1, 0],
      [0.18, 0.1],
      [0.2, 0.28],
      [0.12, 0.42],
    ],
    [1.85, 0.18, 3.55],
    "x",
    10,
  );
  builder.box(
    "matte",
    reedBundle,
    [1.0, 0.03, 0.7],
    [-1.6, 0.02, 3.4],
    [0, 0.2, 0],
  );
  [-0.3, -0.1, 0.1, 0.3].forEach((offset) => {
    builder.box(
      "matte",
      shade(reedBundle, 0.82),
      [1.0, 0.035, 0.05],
      [-1.6 - offset * 0.2, 0.025, 3.4 + offset],
      [0, 0.2, 0],
    );
  });
  /* Footprints in the sand down to the jetty */
  [
    [0.75, 4.4],
    [0.55, 4.1],
    [0.7, 3.8],
    [0.48, 3.55],
  ].forEach(([x, z], index) => {
    builder.sphere(
      "matte",
      shade(sand, 0.85),
      0.07,
      [x, 0.003, z],
      [0.7, 0.15, 1.2],
      6,
    );
    if (index % 2 === 0) {
      builder.sphere(
        "matte",
        shade(sand, 0.85),
        0.035,
        [x, 0.003, z + 0.11],
        [1, 0.15, 1],
        6,
      );
    }
  });
};

/** A sacred ibis on the jetty post: the neck and head, which nod. */
const ibisAt: Triple = [
  jetty.x + jetty.halfWidth - 0.02,
  jettyHeight + 0.45,
  jetty.minZ + 0.05,
];
const ibisNeckAt: Triple = [ibisAt[0], ibisAt[1] + 0.3, ibisAt[2] + 0.1];

const buildIbisBody = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const [x, y, z] = ibisAt;
  builder.sphere(
    "paint",
    palette.white,
    0.13,
    [x, y + 0.24, z - 0.02],
    [0.85, 0.8, 1.35],
    12,
  );
  builder.sphere(
    "paint",
    palette.black,
    0.08,
    [x, y + 0.24, z - 0.19],
    [0.8, 0.5, 1.2],
    8,
  );
  [-0.04, 0.04].forEach((side) => {
    builder.bar(
      "paint",
      "#3a3330",
      [x + side, y + 0.14, z],
      [x + side, y, z],
      0.018,
      4,
    );
  });
};

const buildIbisHead = (builder: AttractionBuilder) => {
  builder.bar("paint", palette.black, [0, 0, 0], [0, 0.16, 0.05], 0.05, 6);
  builder.sphere(
    "paint",
    palette.black,
    0.045,
    [0, 0.18, 0.07],
    [1, 1, 1.2],
    8,
  );
  builder.bar(
    "paint",
    palette.black,
    [0, 0.17, 0.1],
    [0, 0.11, 0.24],
    0.022,
    5,
  );
  builder.bar(
    "paint",
    palette.black,
    [0, 0.11, 0.24],
    [0, 0.03, 0.3],
    0.016,
    5,
  );
};

const lanternAt: Triple = [
  jetty.x - jetty.halfWidth - 0.3,
  jettyHeight + 1.14,
  jetty.minZ + 0.05,
];

const buildLanternGlow = (builder: AttractionBuilder) => {
  builder.box("glow", palette.warmLight, [0.12, 0.16, 0.12], [0, 0, 0]);
  builder.sphere("glow", "#ffe7a8", 0.05, [0, 0, 0], [1, 1.3, 1], 8);
};

const findBoatSpot = (seconds: number): LocalSpot => {
  const pose = findMotionPose(boatMotion, seconds);
  const [x, y, z] = moveWithPose(
    boatPivot,
    [boatPivot[0], boatPivot[1] + 0.3, boatPivot[2] - 0.45],
    pose,
  );
  return { x, y, z, heading: pose.rotation[1] };
};

const rideStart = { x: jetty.x, z: jetty.minZ + 0.25 };
const rideFinish = { x: jetty.x, z: jetty.minZ + 1.6 };

export const nileFeluccaModel: CuriosityModel = {
  kind: "nile-felucca",
  islandId: "sunscorch-sands",
  name: "Nile Felucca",
  fact: "A felucca is a wooden sailing boat with a tall, slanted sail, and people have sailed them on the River Nile for thousands of years. The Ancient Egyptians built their towns along the Nile, because its yearly flood left rich black mud for growing crops. The wind usually blows south, so boats could sail upstream and drift back downstream with the current.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilizations, an overview of where and when they appeared, and a depth study of Ancient Egypt and the River Nile.",
  footprint: 5.6,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 2.3, z: 4.5 },
  build: (builder) => {
    buildRiver(builder);
    buildJetty(builder);
    buildBanks(builder);
    buildIbisBody(builder);
    if (builder.isFar) {
      buildBoat(builder, [loop.x + loop.radius, waterLevel, loop.z]);
    }
    addSignBoard(builder, [2.3, 0, 4.5], signColour);
  },
  moving: [
    {
      name: "felucca",
      pivot: boatPivot,
      build: (builder) => {
        buildBoat(builder, [0, 0, 0]);
      },
      motion: boatMotion,
    },
    {
      name: "ibis",
      pivot: ibisNeckAt,
      build: buildIbisHead,
      motion: { kind: "nod", axis: "x", reach: 6, amplitude: 0.5, period: 1.6 },
    },
    {
      name: "lantern",
      pivot: lanternAt,
      build: buildLanternGlow,
      motion: { kind: "wake", reach: 7 },
    },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: jetty.x - jetty.halfWidth,
        maxX: jetty.x + jetty.halfWidth,
        minZ: jetty.minZ,
        maxZ: jetty.maxZ,
      },
      jettyHeight,
    ),
  ],
  rides: [
    {
      id: "felucca",
      name: "the felucca",
      start: rideStart,
      reach: 0.5,
      seconds: 21,
      finish: rideFinish,
      follow: (progress, seconds) => {
        const boat = findBoatSpot(seconds);
        const ease = Math.min(1, progress / 0.12, (1 - progress) / 0.12);
        const share = ease * ease * (3 - 2 * ease);
        const ashore = progress < 0.5 ? rideStart : rideFinish;
        return {
          x: ashore.x + (boat.x - ashore.x) * share,
          y: jettyHeight + (boat.y - jettyHeight) * share,
          z: ashore.z + (boat.z - ashore.z) * share,
          heading: share > 0.5 ? boat.heading : Math.PI,
        };
      },
    },
  ],
  blockers: [
    { x: 0, z: -1.3, radius: 2.4 },
    { x: -3.0, z: -0.5, radius: 1.35 },
    { x: 3.0, z: -0.5, radius: 1.35 },
    { x: -1.9, z: 1.2, radius: 1.0 },
    { x: 1.6, z: 1.2, radius: 1.0 },
    { x: 3.0, z: 2.9, radius: 0.3 },
    { x: 1.28, z: 3.3, radius: 0.55 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Sail down the Nile",
    news: "Whoosh! The wind filled the great white sail and the felucca glided along the river, past the papyrus reeds.",
  },
};
