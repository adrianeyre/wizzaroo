import { ConeGeometry } from "three";
import {
  addBush,
  addDoor,
  addFence,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  findMotionPose,
  listWallBlockers,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addFlowerClump,
  addGableEnd,
  meadowColours,
} from "./village-fete-parts.js";

const brick = "#b5583f";
const cladding = "#6a4a32";
const doorGreen = "#2f5d43";
const trimCream = "#efe2bf";
const slate = "#4b5563";
const cobble = "#a59d8f";
const sand = "#d8c08a";
const ponyBay = "#8a5030";
const ponyGrey = "#c8c4bc";
const maneDark = "#3a2a20";
const saddleRed = "#a8302a";
const poleRed = "#c8302a";
const signColour = "#2f5d43";

/* The stable block across the back, three stalls with stable doors */
const stable = { minX: -5.0, maxX: 1.0, back: -6.1, front: -3.9, wall: 1.9 };
const stallXs = [-4.0, -2.0, 0.0];
const roofRise = 0.9;

/* The sand arena, where a pony gives rides round and round */
const arenaAt = { x: 2.8, z: 1.2 };
const arenaRadius = 3.2;
const ponyRadius = 2.2;
const ponyPivot: Triple = [arenaAt.x, 0, arenaAt.z];
const ponyMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: ponyRadius,
  count: 1,
  speed: -0.4,
  isFacingAlong: true,
  bob: 0.05,
};
const saddleHeight = 0.98;
const gateAngle = -Math.PI / 4;
const gateAt = {
  x: arenaAt.x + Math.sin(gateAngle) * arenaRadius,
  z: arenaAt.z + Math.cos(gateAngle) * arenaRadius,
};
const rideStart = { x: gateAt.x - 0.45, z: gateAt.z + 0.45 };
const rideFinish = { x: gateAt.x - 1.3, z: gateAt.z - 0.45 };

const tackRoom = { x: -5.7, z: -0.6, size: 1.7, wall: 1.6 };
const muckAt: Triple = [-6.3, 0, 2.4];
const signAt = { x: -2.4, z: 8.0 };

const buildStables = (builder: AttractionBuilder) => {
  const { minX, maxX, back, front, wall } = stable;
  const width = maxX - minX;
  const depth = front - back;
  const middleX = (minX + maxX) / 2;
  const middleZ = (back + front) / 2;
  const far = builder.isFar;
  /* Red brick below, dark timber cladding above */
  builder.box("matte", brick, [width, 0.9, depth], [middleX, 0.45, middleZ]);
  builder.box(
    "matte",
    cladding,
    [width - 0.04, wall - 0.9, depth - 0.04],
    [middleX, 0.9 + (wall - 0.9) / 2, middleZ],
  );
  [minX, maxX].forEach((end) => {
    addGableEnd(builder, "matte", cladding, {
      at: [end, wall, middleZ],
      width: depth,
      rise: roofRise,
    });
  });
  addGableRoof(builder, {
    width,
    depth,
    rise: roofRise,
    at: [middleX, wall, middleZ],
    colour: slate,
    overhang: 0.35,
    thickness: 0.08,
  });
  builder.box(
    "matte",
    shade(slate, 0.8),
    [width + 0.75, 0.1, 0.14],
    [middleX, wall + roofRise + 0.03, middleZ],
  );
  /* Each stall: a split stable door, its top half open and dark inside */
  stallXs.forEach((x) => {
    builder.box("matte", "#1d1a18", [0.9, 0.8, 0.04], [x, 1.45, front + 0.01]);
    builder.box("paint", doorGreen, [0.9, 1.0, 0.06], [x, 0.5, front + 0.03]);
    builder.box("paint", trimCream, [1.08, 0.08, 0.1], [x, 1.88, front + 0.04]);
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        trimCream,
        [0.08, 1.88, 0.1],
        [x + side * 0.5, 0.94, front + 0.04],
      );
    });
    if (far) {
      return;
    }
    /* The bottom door's cross-brace, a bolt, and a name plate */
    builder.bar(
      "paint",
      shade(doorGreen, 1.2),
      [x - 0.4, 0.1, front + 0.07],
      [x + 0.4, 0.9, front + 0.07],
      0.05,
      4,
    );
    builder.box(
      "paint",
      shade(doorGreen, 1.2),
      [0.86, 0.06, 0.03],
      [x, 0.94, front + 0.07],
    );
    builder.box(
      "metal",
      palette.black,
      [0.16, 0.03, 0.03],
      [x + 0.3, 0.75, front + 0.08],
    );
    builder.box("paint", trimCream, [0.4, 0.12, 0.02], [x, 2.05, front + 0.05]);
    /* A horseshoe over each door, for luck */
    builder.torus(
      "metal",
      palette.steel,
      0.07,
      0.015,
      [x, 1.74, front + 0.1],
      "z",
      10,
    );
  });
  if (far) {
    return;
  }
  /* Hay nets and a water bucket by the doors */
  stallXs.slice(0, 2).forEach((x) => {
    builder.sphere(
      "matte",
      "#d8bc68",
      0.18,
      [x + 0.85, 1.3, front + 0.15],
      [1, 1.2, 0.8],
      8,
    );
  });
  builder.cylinder("paint", "#2f6fc0", {
    radius: 0.14,
    radiusEnd: 0.16,
    length: 0.25,
    at: [1.4, 0.13, front + 0.4],
    segments: 10,
  });
  addWindow(builder, {
    at: [minX - 0.02, 1.3, middleZ],
    width: 0.5,
    height: 0.45,
    turn: -Math.PI / 2,
    frame: trimCream,
  });
  addLampPost(builder, [1.6, 0, -3.4], 2.0);
};

const buildCupola = (builder: AttractionBuilder) => {
  const x = stallXs[1];
  const z = (stable.back + stable.front) / 2;
  const base = stable.wall + roofRise - 0.25;
  builder.box("paint", palette.white, [0.7, 0.7, 0.7], [x, base + 0.35, z]);
  builder.add("matte", slate, new ConeGeometry(0.62, 0.45, 4), {
    at: [x, base + 0.92, z],
    rotation: [0, Math.PI / 4, 0],
  });
  builder.cylinder("metal", palette.black, {
    radius: 0.025,
    length: 0.5,
    at: [x, base + 1.3, z],
    segments: 6,
  });
  if (builder.isFar) {
    return;
  }
  /* A clock on the front, and louvres on the sides */
  builder.cylinder("paint", palette.white, {
    radius: 0.26,
    length: 0.04,
    at: [x, base + 0.38, z + 0.37],
    axis: "z",
    segments: 16,
  });
  builder.torus(
    "paint",
    palette.black,
    0.26,
    0.025,
    [x, base + 0.38, z + 0.39],
    "z",
    16,
  );
  builder.box(
    "paint",
    palette.black,
    [0.03, 0.18, 0.01],
    [x, base + 0.45, z + 0.4],
  );
  builder.box(
    "paint",
    palette.black,
    [0.13, 0.03, 0.01],
    [x + 0.06, base + 0.38, z + 0.4],
  );
  [-1, 1].forEach((side) => {
    for (let slat = 0; slat < 4; slat++) {
      builder.box(
        "paint",
        shade(palette.white, 0.85),
        [0.02, 0.04, 0.5],
        [x + side * 0.36, base + 0.18 + slat * 0.12, z],
        [0, 0, side * 0.4],
      );
    }
  });
};

/** A galloping-horse weathervane, which swings round as you come near. */
const buildWeathervane = (builder: AttractionBuilder) => {
  builder.box("metal", palette.black, [0.03, 0.03, 0.6], [0, 0, 0]);
  builder.add(
    "metal",
    palette.black,
    new ConeGeometry(0.06, 0.14, 4).rotateX(Math.PI / 2),
    { at: [0, 0, 0.36] },
  );
  builder.box("metal", palette.black, [0.02, 0.12, 0.3], [0, 0.18, -0.02]);
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.12, 0.08],
    [0, 0.28, 0.16],
    [0.5, 0, 0],
  );
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.14, 0.03],
    [0, 0.07, 0.1],
    [-0.4, 0, 0],
  );
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.14, 0.03],
    [0, 0.07, -0.13],
    [0.4, 0, 0],
  );
  builder.box(
    "metal",
    palette.black,
    [0.02, 0.04, 0.14],
    [0, 0.18, -0.2],
    [0.6, 0, 0],
  );
};

const buildTackRoom = (builder: AttractionBuilder) => {
  const { x, z, size, wall } = tackRoom;
  builder.box("matte", brick, [size, wall, size], [x, wall / 2, z]);
  [-1, 1].forEach((side) => {
    addGableEnd(builder, "matte", brick, {
      at: [x, wall, z + (side * size) / 2],
      width: size,
      rise: 0.6,
      turn: Math.PI / 2,
    });
  });
  addGableRoof(builder, {
    width: size,
    depth: size,
    rise: 0.6,
    at: [x, wall, z],
    colour: palette.roofTile,
    turn: Math.PI / 2,
  });
  if (builder.isFar) {
    return;
  }
  addDoor(builder, {
    at: [x + size / 2 + 0.01, 0, z],
    colour: doorGreen,
    turn: Math.PI / 2,
  });
  /* Saddles on a rack outside, and a water trough */
  builder.box(
    "matte",
    palette.darkTimber,
    [0.1, 0.1, 1.2],
    [x + size / 2 + 0.25, 0.95, z + 1.3],
  );
  [-0.35, 0.35].forEach((dz) => {
    builder.sphere(
      "paint",
      "#6a3a22",
      0.22,
      [x + size / 2 + 0.25, 1.0, z + 1.3 + dz],
      [0.8, 0.5, 1],
      10,
    );
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 0.95,
    at: [x + size / 2 + 0.25, 0.48, z + 0.75],
    segments: 6,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 0.95,
    at: [x + size / 2 + 0.25, 0.48, z + 1.85],
    segments: 6,
  });
  builder.box("metal", palette.darkSteel, [0.5, 0.45, 1.3], [-3.0, 0.23, -2.6]);
  builder.box("water", palette.water, [0.42, 0.02, 1.22], [-3.0, 0.42, -2.6]);
};

const buildArena = (builder: AttractionBuilder) => {
  const { x, z } = arenaAt;
  builder.cylinder("matte", sand, {
    radius: arenaRadius - 0.05,
    length: 0.04,
    at: [x, 0.02, z],
    segments: builder.segments(40, 18),
  });
  /* White post-and-rail round it, with a gap for the gate */
  const sides = builder.isFar ? 10 : 20;
  for (let side = 0; side < sides; side++) {
    const from = (side / sides) * Math.PI * 2;
    const to = ((side + 1) / sides) * Math.PI * 2;
    const middle = (from + to) / 2;
    if (
      Math.abs(
        Math.atan2(Math.sin(middle - gateAngle), Math.cos(middle - gateAngle)),
      ) < 0.2
    ) {
      continue;
    }
    addFence(
      builder,
      {
        x: x + Math.sin(from) * arenaRadius,
        z: z + Math.cos(from) * arenaRadius,
      },
      { x: x + Math.sin(to) * arenaRadius, z: z + Math.cos(to) * arenaRadius },
      { isPicket: false, colour: palette.white, height: 0.8 },
    );
  }
  /* Two little jumps, red-and-white poles on wings */
  if (!builder.isFar) {
    [
      [x + 0.1, z - 0.2, 0.3],
      [x - 0.4, z + 0.9, 1.9],
    ].forEach(([jx, jz, turn]) => {
      [-0.55, 0.55].forEach((side) => {
        builder.box(
          "paint",
          palette.white,
          [0.08, 0.7, 0.24],
          [jx + Math.cos(turn) * side, 0.35, jz - Math.sin(turn) * side],
          [0, turn, 0],
        );
      });
      for (let stripe = 0; stripe < 4; stripe++) {
        const share = -0.4 + stripe * 0.27;
        builder.box(
          "paint",
          stripe % 2 === 0 ? poleRed : palette.white,
          [0.27, 0.06, 0.06],
          [
            jx + Math.cos(turn) * share,
            0.4 - stripe * 0.03,
            jz - Math.sin(turn) * share,
          ],
          [0, turn, 0.1],
        );
      }
    });
  }
  /* A mounting block by the gate, two steps up */
  builder.box(
    "matte",
    palette.stone,
    [0.6, 0.25, 0.7],
    [rideStart.x - 1.0, 0.125, rideStart.z + 0.2],
  );
  builder.box(
    "matte",
    palette.stone,
    [0.6, 0.5, 0.35],
    [rideStart.x - 1.0, 0.25, rideStart.z + 0.03],
  );
};

const buildYard = (builder: AttractionBuilder) => {
  /* Cobbles in front of the stables, and a path in from the sign */
  builder.box("matte", cobble, [8.0, 0.03, 2.4], [-2.0, 0.015, -2.6]);
  builder.box("matte", palette.path, [1.4, 0.03, 9.6], [-2.0, 0.016, 3.0]);
  builder.box("matte", palette.path, [2.6, 0.03, 1.2], [-0.4, 0.017, 4.2]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [6.6, 0, -4.8], 1.15);
  addTree(builder, [-7.2, 0, 5.0], 0.95, "#4a9440");
  if (builder.isFar) {
    return;
  }
  /* The muck heap, steaming gently, with a wheelbarrow and fork */
  builder.sphere("matte", "#6a4a2a", 0.9, muckAt, [1, 0.6, 1], 12);
  builder.box(
    "paint",
    "#2f6fc0",
    [0.5, 0.25, 0.8],
    [muckAt[0] + 1.3, 0.38, muckAt[2] + 0.4],
    [0.1, 0.5, 0],
  );
  builder.cylinder("matte", palette.black, {
    radius: 0.14,
    length: 0.06,
    at: [muckAt[0] + 1.45, 0.14, muckAt[2] + 0.75],
    axis: "x",
    segments: 10,
  });
  builder.bar(
    "matte",
    palette.paleTimber,
    [muckAt[0] + 0.5, 0, muckAt[2] - 0.4],
    [muckAt[0] + 0.7, 1.3, muckAt[2] - 0.6],
    0.04,
    5,
  );
  addBush(builder, [6.8, 0, 4.0], 0.5);
  addBush(builder, [-7.0, 0, -3.6], 0.55, "#3a7d34");
  addFlowerClump(builder, [-3.6, 0, 5.4], [meadowColours.rose, palette.white]);
  addFlowerClump(
    builder,
    [-0.6, 0, 6.4],
    [meadowColours.butter, meadowColours.cornflower],
  );
  addFlowerClump(
    builder,
    [1.6, 0, -3.3],
    [meadowColours.poppy, meadowColours.butter],
    5,
    0.25,
  );
};

/** A pony, facing +z, standing on y = 0, saddled for a ride. */
const addPony = (
  builder: AttractionBuilder,
  coat: string,
  isSaddled: boolean,
) => {
  const far = builder.isFar;
  builder.sphere(
    "matte",
    coat,
    0.32,
    [0, 0.82, 0],
    [0.75, 0.75, 1.45],
    far ? 8 : 14,
  );
  builder.bar(
    "matte",
    coat,
    [0, 0.95, 0.35],
    [0, 1.28, 0.58],
    0.24,
    far ? 6 : 10,
  );
  builder.sphere(
    "matte",
    coat,
    0.14,
    [0, 1.3, 0.68],
    [0.75, 0.85, 1.45],
    far ? 6 : 12,
  );
  [-1, 1].forEach((side) => {
    [-0.3, 0.3].forEach((legZ) => {
      builder.cylinder("matte", coat, {
        radius: 0.06,
        radiusEnd: 0.05,
        length: 0.62,
        at: [side * 0.13, 0.31, legZ],
        segments: far ? 4 : 7,
      });
      if (!far) {
        builder.cylinder("matte", maneDark, {
          radius: 0.065,
          length: 0.08,
          at: [side * 0.13, 0.04, legZ],
          segments: 7,
        });
      }
    });
    if (!far) {
      builder.add("matte", coat, new ConeGeometry(0.04, 0.12, 5), {
        at: [side * 0.06, 1.46, 0.6],
        rotation: [-0.2, 0, -side * 0.2],
      });
      builder.sphere(
        "paint",
        palette.black,
        0.02,
        [side * 0.075, 1.36, 0.76],
        [1, 1, 1],
        5,
      );
    }
  });
  /* A long dark mane and a swishing tail */
  builder.box(
    "matte",
    maneDark,
    [0.06, 0.12, 0.45],
    [0, 1.25, 0.43],
    [-0.95, 0, 0],
  );
  builder.bar(
    "matte",
    maneDark,
    [0, 0.9, -0.44],
    [0, 0.4, -0.6],
    0.1,
    far ? 4 : 6,
  );
  if (!far) {
    builder.sphere(
      "matte",
      shade(coat, 0.75),
      0.07,
      [0, 1.25, 0.86],
      [1, 0.8, 1],
      7,
    );
  }
  if (isSaddled && !far) {
    builder.sphere(
      "paint",
      saddleRed,
      0.24,
      [0, 1.02, -0.02],
      [1.05, 0.3, 1.1],
      10,
    );
    [-1, 1].forEach((side) => {
      builder.bar(
        "metal",
        palette.steel,
        [side * 0.22, 0.92, 0],
        [side * 0.24, 0.62, 0],
        0.015,
        3,
      );
      builder.box(
        "metal",
        palette.steel,
        [0.06, 0.03, 0.1],
        [side * 0.24, 0.6, 0],
      );
    });
    builder.bar(
      "matte",
      saddleRed,
      [-0.1, 1.32, 0.76],
      [-0.18, 1.0, 0.3],
      0.02,
      3,
    );
    builder.bar(
      "matte",
      saddleRed,
      [0.1, 1.32, 0.76],
      [0.18, 1.0, 0.3],
      0.02,
      3,
    );
  }
};

/** A pony looking out over its stable door; it nods hello as you come near. */
const buildPonyHead = (coat: string) => (builder: AttractionBuilder) => {
  builder.bar("matte", coat, [0, 0, -0.2], [0, 0.32, 0.12], 0.22, 8);
  builder.sphere("matte", coat, 0.13, [0, 0.36, 0.25], [0.75, 0.85, 1.5], 12);
  builder.sphere(
    "matte",
    shade(coat, 0.75),
    0.07,
    [0, 0.31, 0.43],
    [1, 0.8, 1],
    7,
  );
  builder.box(
    "matte",
    maneDark,
    [0.05, 0.1, 0.36],
    [0, 0.3, -0.02],
    [-0.8, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.add("matte", coat, new ConeGeometry(0.035, 0.11, 5), {
      at: [side * 0.06, 0.52, 0.17],
      rotation: [-0.2, 0, -side * 0.2],
    });
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [side * 0.07, 0.41, 0.33],
      [1, 1, 1],
      5,
    );
  });
  builder.box(
    "matte",
    palette.white,
    [0.05, 0.16, 0.02],
    [0, 0.4, 0.43],
    [0.6, 0, 0],
  );
};

const buildHen = (builder: AttractionBuilder) => {
  const brown = "#b5652e";
  builder.sphere("matte", brown, 0.12, [0, 0.18, 0], [0.85, 0.85, 1.2], 8);
  builder.sphere("matte", brown, 0.07, [0, 0.3, 0.1], [1, 1, 1], 7);
  builder.sphere("matte", "#d0302a", 0.03, [0, 0.38, 0.1], [0.5, 1, 1.2], 5);
  builder.box("matte", "#e8a530", [0.04, 0.03, 0.06], [0, 0.29, 0.18]);
  builder.box(
    "matte",
    shade(brown, 0.8),
    [0.08, 0.1, 0.06],
    [0, 0.26, -0.13],
    [-0.5, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#e8a530",
      [side * 0.04, 0.09, 0],
      [side * 0.04, 0, 0.02],
      0.02,
      4,
    );
  });
};

/* Climb the mounting block, sit in the saddle, and ride round the arena */
const ponyRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(ponyMotion, seconds);
  const [x, y, z] = moveWithPose(
    ponyPivot,
    [ponyPivot[0], saddleHeight, ponyPivot[2]],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: outside.x + (x - outside.x) * share,
    y: y * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1],
  };
};

export const ponyStablesModel: NewLandAttractionModel = {
  kind: "pony-stables",
  islandId: "meadow-isle",
  name: "Pony Stables",
  fact: "Ponies are mammals: they have hair, breathe air and feed their babies, called foals, on milk. They are herbivores that eat grass and hay. A pony has hard hooves on its four legs, and a long mane and tail of thick hair.",
  curriculumLink:
    "Science, Year 1: animals, including humans. Identify and name a variety of common animals, including mammals, and describe and compare their structure.",
  footprint: 9.5,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildStables(builder);
    buildCupola(builder);
    buildTackRoom(builder);
    buildArena(builder);
    buildYard(builder);
  },
  moving: [
    {
      name: "riding-pony",
      pivot: ponyPivot,
      build: (builder) => {
        addPony(builder, ponyBay, true);
      },
      motion: ponyMotion,
    },
    {
      name: "pony-at-the-door",
      pivot: [stallXs[0], 1.15, stable.front + 0.05],
      build: buildPonyHead(ponyGrey),
      motion: { kind: "nod", axis: "x", reach: 5, amplitude: 0.3, period: 1.6 },
    },
    {
      name: "pony-next-door",
      pivot: [stallXs[2], 1.15, stable.front + 0.05],
      build: buildPonyHead("#5a3420"),
      motion: {
        kind: "nod",
        axis: "x",
        reach: 5,
        amplitude: 0.3,
        period: 1.9,
        phase: 1.3,
      },
    },
    {
      name: "weathervane",
      pivot: [
        stallXs[1],
        stable.wall + roofRise + 1.55,
        (stable.back + stable.front) / 2,
      ],
      build: buildWeathervane,
      motion: { kind: "whirl", axis: "y", idle: 0.2, speed: 3, reach: 7 },
    },
  ],
  wanderers: [
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: { x: -2.6, z: -1.2 },
      radius: 1.3,
      speed: 0.3,
    },
  ],
  smoke: [
    {
      at: [muckAt[0], 0.6, muckAt[2]],
      colour: "#e4e2dc",
      puffs: 4,
      size: 0.22,
      rise: 0.9,
      spread: 0.4,
    },
  ],
  blockers: [
    ...listWallBlockers(
      { x: stable.minX + 0.5, z: -5.0 },
      { x: stable.maxX - 0.5, z: -5.0 },
      1.0,
      0.8,
    ),
    { x: tackRoom.x, z: tackRoom.z, radius: 1.1 },
  ],
  rides: [
    {
      id: "pony-ride",
      name: "a pony ride",
      start: rideStart,
      reach: 0.6,
      seconds: 18,
      finish: rideFinish,
      follow: ponyRide,
    },
  ],
  play: {
    label: "Brush the pony",
    news: "You brushed the pony's coat until it shone, and it gave a happy snort and nuzzled your hand.",
  },
};
