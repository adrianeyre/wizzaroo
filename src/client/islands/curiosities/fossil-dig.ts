import { BoxGeometry, ConeGeometry } from "three";
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

const sand = "#e2c48a";
const earth = "#b88a56";
const pitFloor = "#a77a48";
const bone = "#efe4c8";
const boneShadow = "#d8c8a4";
const rockGrey = "#9a8c78";
const ropeRed = "#d2382c";
const canvas = "#f3ecd8";
const signColour = "#7a5232";

const pit = { x: -0.35, z: -0.85, halfX: 1.75, halfZ: 1.15, bank: 0.3 };
const fence = { halfX: pit.halfX + 0.5, halfZ: pit.halfZ + 0.5 };
const gazebo = { x: 2.85, z: 0.35, half: 0.85, height: 1.85 };
const pulleyAt: Triple = [pit.x - pit.halfX + 0.5, 2.5, pit.z];
const bucketRest: Triple = [pulleyAt[0] + 0.12, 0.04, pulleyAt[2]];
const winch = { x: pit.x - pit.halfX - 0.8, z: pit.z + 0.75 };
const crankAt: Triple = [winch.x, 0.62, winch.z + 0.32];
const slab = { x: -2.35, z: 1.75 };
const sieveAt = { x: 0.75, z: 1.45 };

/** A box laid from one point to another. */
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

const buildPit = (builder: AttractionBuilder) => {
  const { x, z, halfX, halfZ, bank } = pit;
  builder.box("matte", pitFloor, [halfX * 2, 0.03, halfZ * 2], [x, 0.015, z]);
  /* Earth banks all round, as if the floor was dug down */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      earth,
      [halfX * 2 + 0.6, bank, 0.3],
      [x, bank / 2, z + side * (halfZ + 0.15)],
    );
    builder.box(
      "matte",
      earth,
      [0.3, bank, halfZ * 2],
      [x + side * (halfX + 0.15), bank / 2, z],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Layers of rock showing in the banks' inner faces */
  [0.08, 0.17, 0.25].forEach((height, index) => {
    const colour = index === 1 ? "#8e6a40" : shade(earth, 1.1);
    builder.box(
      "matte",
      colour,
      [halfX * 2, 0.035, 0.02],
      [x, height, z - halfZ + 0.005],
    );
    builder.box(
      "matte",
      colour,
      [halfX * 2, 0.035, 0.02],
      [x, height, z + halfZ - 0.005],
    );
    builder.box(
      "matte",
      colour,
      [0.02, 0.035, halfZ * 2],
      [x - halfX + 0.005, height, z],
    );
    builder.box(
      "matte",
      colour,
      [0.02, 0.035, halfZ * 2],
      [x + halfX - 0.005, height, z],
    );
  });
  /* A string grid over the pit, for recording where each bone lies */
  for (let line = 1; line < 6; line++) {
    builder.box(
      "matte",
      palette.white,
      [0.012, 0.012, halfZ * 2],
      [x - halfX + (line * halfX * 2) / 6, bank + 0.02, z],
    );
  }
  for (let line = 1; line < 4; line++) {
    builder.box(
      "matte",
      palette.white,
      [halfX * 2, 0.012, 0.012],
      [x, bank + 0.02, z - halfZ + (line * halfZ * 2) / 4],
    );
  }
  /* Spoil heaps of dug earth behind */
  [
    [-1.2, -2.8, 0.75],
    [0.4, -2.95, 0.6],
    [1.5, -2.6, 0.45],
  ].forEach(([heapX, heapZ, size]) => {
    builder.sphere(
      "matte",
      shade(earth, 1.05),
      size,
      [heapX, 0, heapZ],
      [1.4, 0.65, 1],
      10,
    );
  });
};

const buildFence = (builder: AttractionBuilder) => {
  const { x, z } = pit;
  const { halfX, halfZ } = fence;
  const corners: [number, number][] = [
    [x - halfX, z - halfZ],
    [x + halfX, z - halfZ],
    [x + halfX, z + halfZ],
    [x - halfX, z + halfZ],
  ];
  corners.forEach(([fromX, fromZ], index) => {
    const [toX, toZ] = corners[(index + 1) % corners.length];
    const posts = builder.isFar ? 1 : 3;
    for (let post = 0; post < posts; post++) {
      const share = post / posts;
      const postX = fromX + (toX - fromX) * share;
      const postZ = fromZ + (toZ - fromZ) * share;
      builder.box(
        "matte",
        palette.paleTimber,
        [0.06, 0.75, 0.06],
        [postX, 0.375, postZ],
      );
      if (!builder.isFar) {
        builder.box(
          "paint",
          ropeRed,
          [0.065, 0.06, 0.065],
          [postX, 0.68, postZ],
        );
      }
    }
    if (builder.isFar) {
      return;
    }
    /* Red and white rope, sagging between posts */
    const pieces = 6;
    for (let piece = 0; piece < pieces; piece++) {
      const sag = (share: number) =>
        0.6 - 0.06 * Math.sin(((share * posts) % 1) * Math.PI);
      const from = piece / pieces;
      const to = (piece + 1) / pieces;
      addSlab(
        builder,
        "paint",
        piece % 2 === 0 ? ropeRed : palette.white,
        [fromX + (toX - fromX) * from, sag(from), fromZ + (toZ - fromZ) * from],
        [fromX + (toX - fromX) * to, sag(to), fromZ + (toZ - fromZ) * to],
        0.025,
        0.025,
      );
    }
  });
};

/** A dinosaur skeleton, half dug out, lying on its side. */
const buildSkeleton = (builder: AttractionBuilder) => {
  const spineAt = (share: number): Triple => [
    pit.x - 1.35 + share * 2.3,
    0.07,
    pit.z - 0.15 + 0.22 * Math.sin(share * 3),
  ];
  const bones = builder.isFar ? 5 : 18;
  for (let vertebra = 0; vertebra < bones; vertebra++) {
    const share = vertebra / (bones - 1);
    const [x, y, z] = spineAt(share);
    const thickness = 0.05 + 0.06 * Math.sin(share * Math.PI * 0.85);
    builder.box(
      "matte",
      vertebra % 2 === 0 ? bone : boneShadow,
      [0.09, thickness, thickness * 1.3],
      [x, y + thickness / 2, z],
    );
    if (builder.isFar) {
      continue;
    }
    /* The spines on top of each backbone, pointing away from the ribs */
    builder.box(
      "matte",
      boneShadow,
      [0.04, 0.03, thickness * 1.6],
      [x, y + 0.02, z - thickness * 1.3],
    );
  }
  if (builder.isFar) {
    builder.box("matte", bone, [0.6, 0.15, 0.4], [pit.x + 1.25, 0.1, pit.z]);
    return;
  }
  /* Ribs curving out from the chest */
  for (let rib = 0; rib < 8; rib++) {
    const share = 0.42 + rib * 0.045;
    const root = spineAt(share);
    const length = 0.55 - Math.abs(rib - 3) * 0.06;
    const middle: Triple = [root[0] + 0.06, 0.06, root[2] + length * 0.6];
    const tip: Triple = [root[0] + 0.14, 0.05, root[2] + length];
    builder.bar(
      "matte",
      bone,
      [root[0], root[1] + 0.03, root[2]],
      middle,
      0.035,
      5,
    );
    builder.bar("matte", bone, middle, tip, 0.03, 5);
  }
  /* The skull with its jaws, teeth and empty eye */
  const skull: Triple = [pit.x + 1.25, 0.11, pit.z - 0.05];
  builder.add(
    "matte",
    bone,
    new BoxGeometry(0.55, 0.16, 0.3).translate(0.12, 0, 0),
    { at: skull, rotation: [0, -0.2, 0] },
  );
  builder.add(
    "matte",
    boneShadow,
    new BoxGeometry(0.45, 0.06, 0.22).translate(0.16, 0, 0),
    {
      at: [skull[0], 0.035, skull[2] + 0.12],
      rotation: [0, -0.35, 0],
    },
  );
  builder.sphere(
    "matte",
    "#4a3420",
    0.055,
    [skull[0] - 0.02, skull[1] + 0.06, skull[2] + 0.1],
    [1, 0.8, 0.6],
    6,
  );
  builder.sphere(
    "matte",
    "#4a3420",
    0.035,
    [skull[0] + 0.3, skull[1] + 0.04, skull[2] - 0.0],
    [1, 0.8, 0.6],
    6,
  );
  for (let tooth = 0; tooth < 6; tooth++) {
    builder.add(
      "matte",
      palette.white,
      new ConeGeometry(0.018, 0.06, 4).rotateX(Math.PI),
      {
        at: [
          skull[0] + 0.05 + tooth * 0.06,
          skull[1] - 0.09,
          skull[2] + 0.14 - tooth * 0.012,
        ],
      },
    );
  }
  /* A big back leg and a little arm with claws */
  const hip = spineAt(0.32);
  builder.bar(
    "matte",
    bone,
    [hip[0], 0.08, hip[2] + 0.05],
    [hip[0] + 0.2, 0.07, hip[2] + 0.55],
    0.075,
    6,
  );
  builder.bar(
    "matte",
    boneShadow,
    [hip[0] + 0.2, 0.07, hip[2] + 0.55],
    [hip[0] - 0.05, 0.06, hip[2] + 0.95],
    0.06,
    6,
  );
  builder.sphere(
    "matte",
    bone,
    0.06,
    [hip[0] + 0.2, 0.07, hip[2] + 0.55],
    [1, 0.8, 1],
    6,
  );
  for (let claw = 0; claw < 3; claw++) {
    builder.bar(
      "matte",
      bone,
      [hip[0] - 0.05, 0.05, hip[2] + 0.95],
      [hip[0] - 0.2 + claw * 0.1, 0.04, hip[2] + 1.08],
      0.025,
      4,
    );
  }
  const shoulder = spineAt(0.8);
  builder.bar(
    "matte",
    bone,
    [shoulder[0], 0.07, shoulder[2] + 0.05],
    [shoulder[0] + 0.1, 0.06, shoulder[2] + 0.3],
    0.04,
    5,
  );
  /* The end of the tail still buried under a heap of sand */
  builder.sphere(
    "matte",
    shade(pitFloor, 1.12),
    0.4,
    [pit.x - 1.35, 0.0, pit.z - 0.2],
    [1.2, 0.4, 1],
    10,
  );
  /* Bits of bone and tools left where they were working */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.04, 0.03, 0.3],
    [pit.x + 0.4, 0.05, pit.z + 0.75],
    [0, 0.6, 0],
  );
  builder.box(
    "matte",
    "#3a2a1a",
    [0.07, 0.05, 0.08],
    [pit.x + 0.48, 0.05, pit.z + 0.88],
    [0, 0.6, 0],
  );
  builder.add(
    "metal",
    palette.steel,
    new ConeGeometry(0.07, 0.14, 4).rotateX(Math.PI / 2),
    {
      at: [pit.x - 0.4, 0.04, pit.z + 0.85],
      scale: [1, 0.25, 1],
    },
  );
  builder.bar(
    "matte",
    palette.timber,
    [pit.x - 0.4, 0.04, pit.z + 0.94],
    [pit.x - 0.4, 0.04, pit.z + 1.08],
    0.03,
    5,
  );
  builder.box(
    "matte",
    canvas,
    [0.4, 0.02, 0.3],
    [pit.x - 0.9, 0.04, pit.z + 0.75],
    [0, 0.2, 0],
  );
};

const buildWinch = (builder: AttractionBuilder) => {
  /* A tripod over the pit with a pulley, and a winch drum on a frame */
  const [px, py, pz] = pulleyAt;
  [
    [px - 0.75, pz - 0.65],
    [px - 0.75, pz + 0.65],
    [px + 0.85, pz],
  ].forEach(([footX, footZ]) => {
    builder.bar(
      "matte",
      palette.timber,
      [footX, 0, footZ],
      [px, py + 0.1, pz],
      0.08,
      builder.isFar ? 4 : 8,
    );
  });
  builder.box(
    "matte",
    palette.darkTimber,
    [0.36, 0.3, 0.3],
    [winch.x, 0.42, winch.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.12,
    length: 0.06,
    at: [px, py, pz],
    axis: "z",
    segments: 14,
  });
  builder.bar(
    "matte",
    palette.cream,
    [px + 0.12, py, pz],
    [px + 0.12, bucketRest[1] + 0.34, pz],
    0.02,
    4,
  );
  builder.bar(
    "matte",
    palette.cream,
    [px - 0.12, py, pz],
    [winch.x, 0.62, winch.z],
    0.02,
    4,
  );
  builder.cylinder("matte", palette.timber, {
    radius: 0.12,
    length: 0.42,
    at: [winch.x, 0.62, winch.z],
    axis: "z",
    segments: 12,
  });
  builder.cylinder("matte", palette.cream, {
    radius: 0.13,
    length: 0.3,
    at: [winch.x, 0.62, winch.z],
    axis: "z",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 0.7, 0.08],
      [winch.x, 0.35, winch.z + side * 0.25],
    );
  });
};

/** The crank turns faster as someone comes to help lift the bucket. */
const buildCrank = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.025,
    length: 0.12,
    at: [0, 0, 0.0],
    axis: "z",
    segments: 6,
  });
  builder.box("metal", palette.darkSteel, [0.05, 0.3, 0.04], [0, 0.13, 0.06]);
  builder.cylinder("paint", ropeRed, {
    radius: 0.03,
    length: 0.16,
    at: [0, 0.26, 0.14],
    axis: "z",
    segments: 8,
  });
};

/** The bucket of earth, hauled up out of the pit when someone comes near. */
const buildBucket = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.17,
    radiusEnd: 0.2,
    length: 0.3,
    at: [0, 0.15, 0],
    segments: 14,
    isOpen: true,
  });
  builder.cylinder("metal", shade(palette.steel, 0.8), {
    radius: 0.17,
    length: 0.02,
    at: [0, 0.01, 0],
    segments: 14,
  });
  builder.cylinder("matte", earth, {
    radius: 0.19,
    length: 0.03,
    at: [0, 0.26, 0],
    segments: 12,
  });
  builder.sphere(
    "matte",
    shade(earth, 1.1),
    0.12,
    [0.03, 0.28, 0],
    [1.3, 0.5, 1],
    8,
  );
  builder.torus("metal", palette.darkSteel, 0.2, 0.012, [0, 0.32, 0], "z", 12);
};

const buildGazebo = (builder: AttractionBuilder) => {
  const { x, z, half, height } = gazebo;
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.cylinder("metal", palette.steel, {
        radius: 0.03,
        length: height,
        at: [x + sideX * half, height / 2, z + sideZ * half],
        segments: 6,
      });
    });
  });
  builder.add("matte", canvas, new ConeGeometry(half * 1.55, 0.6, 4, 1, true), {
    at: [x, height + 0.3, z],
    rotation: [0, Math.PI / 4, 0],
  });
  if (builder.isFar) {
    return;
  }
  /* A striped valance round the canopy's edge */
  [-1, 1].forEach((side) => {
    for (let flap = 0; flap < 6; flap++) {
      const along = -half + (flap + 0.5) * ((half * 2) / 6);
      const colour = flap % 2 === 0 ? "#2f7fc4" : canvas;
      builder.box(
        "matte",
        colour,
        [(half * 2) / 6, 0.16, 0.02],
        [x + along, height - 0.08, z + side * (half + 0.08)],
      );
      builder.box(
        "matte",
        colour,
        [0.02, 0.16, (half * 2) / 6],
        [x + side * (half + 0.08), height - 0.08, z + along],
      );
    }
  });
  /* The finds table: trays of fossils, labels, a magnifying glass and a notebook */
  builder.box("matte", palette.paleTimber, [1.3, 0.05, 0.65], [x, 0.75, z]);
  [-0.55, 0.55].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.05, 0.75, 0.55],
      [x + side, 0.375, z],
    );
  });
  [-0.38, 0.05].forEach((trayX, tray) => {
    builder.box(
      "matte",
      palette.timber,
      [0.36, 0.04, 0.42],
      [x + trayX, 0.795, z - 0.05],
    );
    builder.box(
      "matte",
      shade(sand, 0.9),
      [0.32, 0.02, 0.38],
      [x + trayX, 0.81, z - 0.05],
    );
    for (let find = 0; find < 4; find++) {
      const findX = x + trayX - 0.08 + (find % 2) * 0.16;
      const findZ = z - 0.15 + Math.floor(find / 2) * 0.2;
      if (tray === 0) {
        builder.torus(
          "matte",
          find % 2 === 0 ? "#b8a07a" : "#8a7a64",
          0.045,
          0.018,
          [findX, 0.83, findZ],
          "y",
          10,
        );
      } else {
        builder.add(
          "matte",
          palette.white,
          new ConeGeometry(0.025, 0.1, 5).rotateZ(Math.PI / 2),
          { at: [findX, 0.83, findZ] },
        );
      }
      builder.box(
        "paint",
        palette.white,
        [0.07, 0.005, 0.03],
        [findX, 0.822, findZ + 0.08],
      );
    }
  });
  builder.torus(
    "metal",
    palette.brass,
    0.07,
    0.012,
    [x + 0.42, 0.79, z + 0.12],
    "y",
    14,
  );
  builder.cylinder("glass", "#cfe6f0", {
    radius: 0.065,
    length: 0.01,
    at: [x + 0.42, 0.79, z + 0.12],
    segments: 14,
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [x + 0.48, 0.785, z + 0.16],
    [x + 0.6, 0.785, z + 0.26],
    0.025,
    5,
  );
  builder.box(
    "paint",
    "#2f6b3a",
    [0.22, 0.02, 0.3],
    [x + 0.45, 0.785, z - 0.16],
    [0, 0.3, 0],
  );
  builder.box(
    "paint",
    palette.white,
    [0.2, 0.022, 0.28],
    [x + 0.45, 0.786, z - 0.16],
    [0, 0.3, 0],
  );
  /* An easel with a picture of the ichthyosaur Mary Anning found */
  const easel: Triple = [x - 0.2, 0, z - 0.75];
  [-0.25, 0.25].forEach((side) => {
    builder.bar(
      "matte",
      palette.timber,
      [easel[0] + side, 0, easel[2] + 0.1],
      [easel[0] + side * 0.4, 1.55, easel[2]],
      0.035,
      5,
    );
  });
  builder.bar(
    "matte",
    palette.timber,
    [easel[0], 0, easel[2] - 0.3],
    [easel[0], 1.45, easel[2]],
    0.035,
    5,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.6, 0.45, 0.02],
    [easel[0], 1.15, easel[2] + 0.06],
    [-0.08, 0, 0],
  );
  builder.sphere(
    "paint",
    "#3f6b8a",
    0.12,
    [easel[0], 1.15, easel[2] + 0.075],
    [1.5, 0.45, 0.1],
    8,
  );
  builder.add(
    "paint",
    "#3f6b8a",
    new ConeGeometry(0.06, 0.12, 3).rotateZ(Math.PI / 2),
    { at: [easel[0] - 0.22, 1.15, easel[2] + 0.075], scale: [1, 1, 0.1] },
  );
  builder.add(
    "paint",
    "#3f6b8a",
    new ConeGeometry(0.03, 0.12, 3).rotateZ(-Math.PI / 2),
    { at: [easel[0] + 0.23, 1.14, easel[2] + 0.075], scale: [1, 1, 0.1] },
  );
};

const buildFinds = (builder: AttractionBuilder) => {
  /* A slab of rock studded with ammonites */
  builder.roundedBox(
    "matte",
    rockGrey,
    [1.0, 0.35, 0.7],
    0.08,
    [slab.x, 0.17, slab.z],
    [0, 0.35, 0],
  );
  if (builder.isFar) {
    return;
  }
  [
    [-0.25, 0.1, 0.1],
    [0.15, -0.12, 0.08],
    [0.28, 0.16, 0.06],
  ].forEach(([dx, dz, size]) => {
    const at: Triple = [slab.x + dx, 0.36, slab.z + dz];
    builder.torus("matte", "#c8b48a", size, size * 0.32, at, "y", 14);
    builder.torus(
      "matte",
      "#b09a70",
      size * 0.55,
      size * 0.22,
      [at[0], at[1] + 0.005, at[2]],
      "y",
      10,
    );
    builder.sphere(
      "matte",
      "#a08a60",
      size * 0.25,
      [at[0], at[1] + 0.005, at[2]],
      [1, 0.6, 1],
      6,
    );
  });
  /* The sieve on its stand, with a little heap of sifted sand below */
  const { x, z } = sieveAt;
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.timber,
      [x + side * 0.35, 0, z - 0.2],
      [x + side * 0.3, 0.7, z],
      0.04,
      5,
    );
    builder.bar(
      "matte",
      palette.timber,
      [x + side * 0.35, 0, z + 0.2],
      [x + side * 0.3, 0.7, z],
      0.04,
      5,
    );
  });
  builder.cylinder("matte", palette.paleTimber, {
    radius: 0.34,
    length: 0.1,
    at: [x, 0.72, z],
    segments: 18,
    isOpen: true,
  });
  builder.cylinder("metal", "#6a6e72", {
    radius: 0.33,
    length: 0.01,
    at: [x, 0.69, z],
    segments: 18,
  });
  builder.sphere("matte", shade(sand, 0.9), 0.32, [x, 0, z], [1, 0.4, 1], 10);
  /* Brushes, big and small, and a bucket of tools */
  [
    [0.25, 0.85, 0.3],
    [0.45, 0.7, -0.4],
  ].forEach(([dx, dz, turn], index) => {
    const at: Triple = [x + dx, 0.03, z + dz];
    builder.box("matte", palette.timber, [0.05, 0.04, 0.22], at, [0, turn, 0]);
    builder.box(
      "matte",
      index === 0 ? "#3a2a1a" : "#d8b45a",
      [0.07, 0.05, 0.08],
      [at[0] + Math.sin(turn) * 0.15, 0.035, at[2] + Math.cos(turn) * 0.15],
      [0, turn, 0],
    );
  });
  builder.cylinder("paint", "#2f7fc4", {
    radius: 0.15,
    radiusEnd: 0.18,
    length: 0.3,
    at: [x - 0.65, 0.15, z + 0.35],
    segments: 12,
  });
  builder.bar(
    "matte",
    palette.timber,
    [x - 0.62, 0.2, z + 0.33],
    [x - 0.5, 0.55, z + 0.3],
    0.03,
    5,
  );
  builder.bar(
    "matte",
    palette.timber,
    [x - 0.7, 0.2, z + 0.4],
    [x - 0.8, 0.5, z + 0.45],
    0.03,
    5,
  );
  /* A wheelbarrow by the spoil heaps */
  const barrow: Triple = [2.2, 0, -2.0];
  builder.add("paint", "#3f9a5a", new BoxGeometry(0.6, 0.25, 0.45), {
    at: [barrow[0], 0.4, barrow[2]],
    rotation: [0, 0.5, 0],
  });
  builder.sphere(
    "matte",
    earth,
    0.25,
    [barrow[0], 0.53, barrow[2]],
    [1.2, 0.4, 0.9],
    8,
  );
  builder.cylinder("matte", palette.black, {
    radius: 0.16,
    length: 0.06,
    at: [barrow[0] + 0.33, 0.16, barrow[2] - 0.18],
    axis: "z",
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.timber,
      [barrow[0] + 0.3, 0.25, barrow[2] - 0.15 + side * 0.18],
      [barrow[0] - 0.55, 0.45, barrow[2] + 0.35 + side * 0.18],
      0.04,
      5,
    );
  });
};

export const fossilDigModel: CuriosityModel = {
  kind: "fossil-dig",
  islandId: "sunscorch-sands",
  name: "Fossil Dig",
  fact: "A fossil forms when a plant or animal dies and is buried in mud or sand. Over millions of years the layers above press down and turn to rock, and minerals slowly take the place of the bones. Mary Anning found amazing fossils on the beach at Lyme Regis over 200 years ago, including the first ichthyosaur skeleton to be studied.",
  curriculumLink:
    "Science, Year 3: describe in simple terms how fossils are formed when things that have lived are trapped within rock.",
  footprint: 5.2,
  setting: "inland",
  padColour: sand,
  signSpot: { x: -0.35, z: 3.9 },
  build: (builder) => {
    buildPit(builder);
    buildFence(builder);
    buildSkeleton(builder);
    buildWinch(builder);
    buildGazebo(builder);
    buildFinds(builder);
    addSignBoard(builder, [-0.35, 0, 3.9], signColour);
  },
  moving: [
    {
      name: "bucket",
      pivot: bucketRest,
      build: buildBucket,
      motion: { kind: "rise", reach: 6.5, height: 1.5, period: 2.2 },
    },
    {
      name: "crank",
      pivot: crankAt,
      build: buildCrank,
      motion: { kind: "whirl", axis: "z", idle: 0.2, speed: 3.5, reach: 6.5 },
    },
  ],
  blockers: [
    { x: pit.x - 1.1, z: pit.z, radius: 1.45 },
    { x: pit.x + 0.1, z: pit.z, radius: 1.45 },
    { x: pit.x + 1.2, z: pit.z, radius: 1.45 },
    { x: winch.x, z: winch.z, radius: 0.35 },
    { x: gazebo.x, z: gazebo.z, radius: 0.75 },
    { x: gazebo.x - 0.2, z: gazebo.z - 0.75, radius: 0.3 },
    { x: slab.x, z: slab.z, radius: 0.6 },
    { x: sieveAt.x, z: sieveAt.z, radius: 0.4 },
    { x: 2.2, z: -2.0, radius: 0.5 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Brush the fossil",
    news: "Swish, swish! You gently brushed away the sand and found a dinosaur tooth that has been buried for 70 million years.",
  },
};
