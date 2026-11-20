import { BoxGeometry, ConeGeometry, OctahedronGeometry } from "three";
import {
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

const snow = "#eef4f8";
const snowShadow = "#d3e1eb";
const frostWhite = "#f8fbfd";
const glacierIce = "#b6dcee";
const deepIce = "#6fb2d8";
const crevasseBlue = "#2d6f9e";
const meltwater = "#1f5f8c";
const glowBlue = "#8fe8ff";
const rope = "#c8a46a";
const plank = "#8a5a35";
const tentOrange = "#f07c2a";
const parkaRed = "#d8342c";
const pine = "#2d5a40";
const signColour = "#2d6f9e";

/* Two shelves of glacier ice, a crevasse between, and a rope bridge across */
const shelfTop = 1.2;
const shelfHalf = 2.6;
const front = { minZ: 1.3, maxZ: 3.6 };
const back = { minZ: -4.6, maxZ: -1.3 };
const bridgeHalf = 0.6;
const bridgeSag = 0.14;
const rampHalf = 0.8;
const frontRamp = { fromZ: front.maxZ, toZ: 6.6 };
const backRamp = { fromZ: back.minZ, toZ: -7.2 };
/* The zip line runs down the right-hand side, from a tower to a post */
const zipTower = { x: 4.1, z: -5.2, platform: 3.1 };
const zipTop: Triple = [zipTower.x, 4.45, zipTower.z];
const zipEnd: Triple = [3.7, 1.7, 6.6];
const zipHang = 1.35;
const rideStart = { x: 4.4, z: -3.6 };
const rideFinish = { x: 2.4, z: 6.8 };
const signAt: Triple = [-2.6, 0, 6.6];

const bridgeHeightAt = (z: number): number =>
  shelfTop - bridgeSag * (1 - (z / front.minZ) ** 2);

const rampHeightAt = (z: number, from: number, to: number): number =>
  shelfTop * Math.min(1, Math.max(0, (z - to) / (from - to)));

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

/** A jagged pinnacle of ice, a serac. */
const addSerac = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string = glacierIce,
) => {
  builder.add("glass", colour, new OctahedronGeometry(size, 0), {
    at: [at[0], at[1] + size * 0.8, at[2]],
    scale: [0.8, 1.6, 0.7],
    rotation: [0.1, at[0] * 1.7, 0.12],
  });
};

/* ------------------------------------------------------------------ */
/* The glacier shelves and the crevasse                                */
/* ------------------------------------------------------------------ */

const addShelf = (
  builder: AttractionBuilder,
  { minZ, maxZ }: { minZ: number; maxZ: number },
  isFront: boolean,
) => {
  const depth = maxZ - minZ;
  const middleZ = (minZ + maxZ) / 2;
  builder.box(
    "paint",
    glacierIce,
    [shelfHalf * 2, shelfTop, depth],
    [0, shelfTop / 2, middleZ],
  );
  builder.box(
    "matte",
    frostWhite,
    [shelfHalf * 2 + 0.1, 0.1, depth + 0.1],
    [0, shelfTop - 0.03, middleZ],
  );
  /* The ice face towards the crevasse, deep blue and jagged */
  const faceZ = isFront ? minZ : maxZ;
  const out = isFront ? -1 : 1;
  builder.box(
    "glass",
    deepIce,
    [shelfHalf * 2, shelfTop - 0.1, 0.12],
    [0, (shelfTop - 0.1) / 2, faceZ + out * 0.04],
  );
  if (builder.isFar) {
    return;
  }
  /* Layers of old snow in the ice, like the rings in a tree */
  [0.3, 0.55, 0.85].forEach((up, index) => {
    builder.box(
      "paint",
      shade(glacierIce, 1.04 + index * 0.02),
      [shelfHalf * 2 + 0.02, 0.05, depth + 0.02],
      [0, up, middleZ],
    );
  });
  for (let shard = 0; shard < 6; shard++) {
    const x = -shelfHalf + 0.45 + shard * 0.85;
    builder.add(
      "glass",
      shard % 2 === 0 ? deepIce : shade(deepIce, 1.12),
      new BoxGeometry(0.5, 0.9 - (shard % 3) * 0.15, 0.14).rotateZ(
        ((shard % 3) - 1) * 0.25,
      ),
      { at: [x, 0.55, faceZ + out * 0.11] },
      undefined,
    );
  }
  /* Icicles over the edge */
  for (let icicle = 0; icicle < 9; icicle++) {
    const x = -shelfHalf + 0.3 + icicle * 0.56;
    if (Math.abs(x) < bridgeHalf + 0.3) {
      continue;
    }
    builder.add(
      "glass",
      frostWhite,
      new ConeGeometry(0.05, 0.25 + (icicle % 3) * 0.1, 5).rotateX(Math.PI),
      { at: [x, shelfTop - 0.25, faceZ + out * 0.12] },
    );
  }
  /* Seracs and drifts along the outer edges */
  [-1, 1].forEach((side) => {
    addSerac(
      builder,
      [side * (shelfHalf - 0.3), shelfTop, middleZ + 0.3 * side],
      0.32,
    );
    builder.sphere(
      "matte",
      frostWhite,
      0.4,
      [side * (shelfHalf - 0.25), shelfTop, middleZ - 0.5],
      [1, 0.4, 1.6],
      8,
    );
  });
};

const addRamp = (builder: AttractionBuilder, fromZ: number, toZ: number) => {
  const length = Math.abs(toZ - fromZ);
  const slope = Math.hypot(length, shelfTop);
  const angle = Math.atan2(shelfTop, length) * Math.sign(toZ - fromZ);
  const middleZ = (fromZ + toZ) / 2;
  /* A wedge of packed snow, its top a gentle slope */
  builder.add(
    "matte",
    snowShadow,
    new BoxGeometry(rampHalf * 2, 0.16, slope).rotateX(angle),
    { at: [0, shelfTop / 2 - 0.08, middleZ] },
    undefined,
  );
  builder.add(
    "paint",
    glacierIce,
    new BoxGeometry(rampHalf * 2 - 0.04, shelfTop * 0.5, length * 0.5),
    { at: [0, shelfTop * 0.25, fromZ + (toZ - fromZ) * 0.25] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* Snow steps cut into the slope, and rope rails on posts */
  const treads = 6;
  for (let tread = 1; tread < treads; tread++) {
    const z = fromZ + ((toZ - fromZ) * tread) / treads;
    builder.box(
      "matte",
      frostWhite,
      [rampHalf * 2 - 0.1, 0.04, 0.12],
      [0, rampHeightAt(z, fromZ, toZ) + 0.02, z],
    );
  }
  [-1, 1].forEach((side) => {
    const x = side * (rampHalf + 0.06);
    for (let post = 0; post <= 3; post++) {
      const z = fromZ + ((toZ - fromZ) * post) / 3;
      const base = rampHeightAt(z, fromZ, toZ);
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.04,
        length: 0.95 + base,
        at: [x, (0.95 + base) / 2, z],
        segments: 6,
      });
    }
    builder.bar(
      "matte",
      rope,
      [x, shelfTop + 0.85, fromZ],
      [x, 0.85, toZ],
      0.04,
      5,
    );
  });
};

const buildGlacier = (builder: AttractionBuilder) => {
  addShelf(builder, front, true);
  addShelf(builder, back, false);
  addRamp(builder, frontRamp.fromZ, frontRamp.toZ);
  addRamp(builder, backRamp.fromZ, backRamp.toZ);
  /* The bottom of the crevasse: deep blue meltwater */
  builder.box(
    "water",
    meltwater,
    [shelfHalf * 2, 0.04, front.minZ - back.maxZ],
    [0, 0.02, 0],
  );
  /* Ridges of ice closing off each end of the crevasse */
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      shade(glacierIce, 0.95),
      [1.0, 1.0, 2.8],
      [side * (shelfHalf + 0.45), 0.5, 0],
    );
    addSerac(builder, [side * (shelfHalf + 0.4), 0.8, -0.6], 0.5, deepIce);
    addSerac(builder, [side * (shelfHalf + 0.5), 0.8, 0.6], 0.42);
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "glow",
    crevasseBlue,
    [shelfHalf * 2 - 0.2, 0.02, 0.3],
    [0, 0.05, 0],
  );
  [-1.6, 1.4].forEach((x) => {
    addSerac(builder, [x, 0, 0.2], 0.25, deepIce);
  });
  /* Big boulders of ice tumbled round the shelves */
  [
    [-3.4, 3.2, 0.42],
    [3.3, 2.6, 0.36],
    [-3.5, -3.6, 0.5],
    [3.0, -2.2, 0.3],
  ].forEach(([x, z, size]) => {
    addSerac(builder, [x, 0, z], size);
  });
};

/* ------------------------------------------------------------------ */
/* The rope bridge                                                     */
/* ------------------------------------------------------------------ */

const buildBridge = (builder: AttractionBuilder) => {
  const planks = builder.isFar ? 6 : 13;
  const span = front.minZ - back.maxZ + 0.4;
  for (let index = 0; index < planks; index++) {
    const z = back.maxZ - 0.2 + (index + 0.5) * (span / planks);
    builder.box(
      "matte",
      index % 3 === 0 ? shade(plank, 0.88) : plank,
      [bridgeHalf * 2, 0.06, span / planks - 0.04],
      [0, bridgeHeightAt(z) - 0.03, z],
      [0, 0, (index % 2) * 0.02 - 0.01],
    );
  }
  /* Tall posts at each end, with the ropes slung between them */
  const postZs = [back.maxZ - 0.25, front.minZ + 0.25];
  [-1, 1].forEach((side) => {
    const x = side * (bridgeHalf + 0.12);
    postZs.forEach((z) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.08,
        length: 1.3,
        at: [x, shelfTop + 0.65, z],
        segments: 8,
      });
    });
    const steps = builder.isFar ? 2 : 8;
    for (let step = 0; step < steps; step++) {
      const fromZ = postZs[0] + ((postZs[1] - postZs[0]) * step) / steps;
      const toZ = postZs[0] + ((postZs[1] - postZs[0]) * (step + 1)) / steps;
      builder.bar(
        "matte",
        rope,
        [x, bridgeHeightAt(fromZ) + 1.0, fromZ],
        [x, bridgeHeightAt(toZ) + 1.0, toZ],
        0.05,
        5,
      );
      if (!builder.isFar) {
        builder.bar(
          "matte",
          rope,
          [x, bridgeHeightAt(fromZ), fromZ],
          [x, bridgeHeightAt(toZ), toZ],
          0.04,
          4,
        );
        builder.bar(
          "matte",
          rope,
          [x, bridgeHeightAt(fromZ) + 1.0, fromZ],
          [x, bridgeHeightAt(fromZ) + 0.02, fromZ],
          0.025,
          4,
        );
        builder.bar(
          "matte",
          rope,
          [x, bridgeHeightAt(fromZ) + 0.5, fromZ],
          [x, bridgeHeightAt(toZ) + 0.5, toZ],
          0.025,
          4,
        );
      }
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Ropes pegged into the ice behind each post */
  [-1, 1].forEach((side) => {
    [
      [back.maxZ - 0.25, back.maxZ - 1.2],
      [front.minZ + 0.25, front.minZ + 1.2],
    ].forEach(([postZ, pegZ]) => {
      builder.bar(
        "matte",
        rope,
        [side * (bridgeHalf + 0.12), shelfTop + 1.25, postZ],
        [side * (bridgeHalf + 0.3), shelfTop + 0.05, pegZ],
        0.035,
        4,
      );
      builder.box(
        "metal",
        palette.steel,
        [0.06, 0.2, 0.06],
        [side * (bridgeHalf + 0.3), shelfTop + 0.08, pegZ],
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The explorers' camp on the back shelf                               */
/* ------------------------------------------------------------------ */

const tentAt = { x: -1.5, z: -3.4 };

const buildCamp = (builder: AttractionBuilder) => {
  /* A pyramid tent, the sort polar explorers use */
  builder.add("matte", tentOrange, new ConeGeometry(0.85, 1.25, 4), {
    at: [tentAt.x, shelfTop + 0.62, tentAt.z],
    rotation: [0, Math.PI / 4, 0],
  });
  if (builder.isFar) {
    return;
  }
  builder.add("matte", shade(tentOrange, 0.7), new ConeGeometry(0.3, 0.6, 3), {
    at: [tentAt.x, shelfTop + 0.3, tentAt.z + 0.55],
    scale: [1, 1, 0.3],
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.025,
    length: 0.3,
    at: [tentAt.x, shelfTop + 1.35, tentAt.z],
    segments: 5,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      rope,
      [tentAt.x + side * 0.6, shelfTop + 0.1, tentAt.z + 0.6],
      [tentAt.x + side * 0.95, shelfTop + 0.02, tentAt.z + 0.95],
      0.02,
      4,
    );
  });
  /* A sledge loaded with supplies */
  const sledge = { x: 1.3, z: -3.6 };
  [-0.22, 0.22].forEach((dx) => {
    builder.box(
      "matte",
      plank,
      [0.05, 0.05, 1.3],
      [sledge.x + dx, shelfTop + 0.05, sledge.z],
    );
    builder.bar(
      "matte",
      plank,
      [sledge.x + dx, shelfTop + 0.05, sledge.z + 0.65],
      [sledge.x + dx, shelfTop + 0.25, sledge.z + 0.78],
      0.05,
      4,
    );
  });
  builder.box(
    "matte",
    shade(plank, 1.2),
    [0.56, 0.05, 1.2],
    [sledge.x, shelfTop + 0.12, sledge.z],
  );
  builder.box(
    "matte",
    "#3f6f4a",
    [0.5, 0.26, 0.5],
    [sledge.x, shelfTop + 0.28, sledge.z - 0.25],
  );
  builder.box(
    "matte",
    "#b8a27a",
    [0.44, 0.22, 0.4],
    [sledge.x, shelfTop + 0.26, sledge.z + 0.25],
  );
  builder.cylinder("paint", parkaRed, {
    radius: 0.1,
    length: 0.5,
    at: [sledge.x, shelfTop + 0.52, sledge.z],
    axis: "x",
    segments: 8,
  });
  /* Snow-block windbreak and a pair of ice axes */
  for (let block = 0; block < 4; block++) {
    builder.box(
      "matte",
      frostWhite,
      [0.4, 0.25, 0.25],
      [-2.1 + block * 0.42, shelfTop + 0.12, -4.25],
    );
  }
  builder.bar(
    "metal",
    palette.steel,
    [0.2, shelfTop, -2.2],
    [0.35, shelfTop + 0.7, -2.15],
    0.03,
    4,
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.25, 0.04, 0.04],
    [0.35, shelfTop + 0.7, -2.15],
  );
};

/* ------------------------------------------------------------------ */
/* The zip line                                                        */
/* ------------------------------------------------------------------ */

const zipPoint = (share: number): Triple => [
  zipTop[0] + (zipEnd[0] - zipTop[0]) * share,
  zipTop[1] +
    (zipEnd[1] - zipTop[1]) * share -
    0.45 * Math.sin(share * Math.PI),
  zipTop[2] + (zipEnd[2] - zipTop[2]) * share,
];

const buildZipLine = (builder: AttractionBuilder) => {
  const { x, z, platform } = zipTower;
  [-0.4, 0.4].forEach((dx) => {
    [-0.4, 0.4].forEach((dz) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.14, platform + 1.5, 0.14],
        [x + dx, (platform + 1.5) / 2, z + dz],
      );
    });
  });
  builder.box("matte", plank, [1.1, 0.1, 1.1], [x, platform, z]);
  builder.box("matte", "#9b2f26", [0.12, 0.12, 1.0], [x, platform + 1.5, z]);
  const steps = builder.isFar ? 3 : 10;
  for (let step = 0; step < steps; step++) {
    builder.bar(
      "metal",
      palette.steel,
      zipPoint(step / steps),
      zipPoint((step + 1) / steps),
      0.035,
      4,
    );
  }
  /* The post at the bottom end */
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1,
    length: zipEnd[1] + 0.2,
    at: [zipEnd[0], (zipEnd[1] + 0.2) / 2, zipEnd[2]],
    segments: 8,
  });
  if (builder.isFar) {
    return;
  }
  /* Ladder up the tower, rails round the top, and cross braces */
  for (let rung = 0; rung < 10; rung++) {
    builder.box(
      "metal",
      palette.steel,
      [0.4, 0.04, 0.04],
      [x, 0.3 + rung * 0.3, z + 0.48],
    );
  }
  [-0.4, 0.4].forEach((dx) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + dx, 0.2, z - 0.4],
      [x + dx, platform - 0.2, z + 0.4],
      0.06,
      4,
    );
    builder.box(
      "paint",
      "#9b2f26",
      [0.05, 0.05, 0.9],
      [x + dx, platform + 0.8, z],
    );
  });
  builder.box(
    "paint",
    "#9b2f26",
    [0.9, 0.05, 0.05],
    [x, platform + 0.8, z - 0.4],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.12, 0.18, 0.08],
    [zipTop[0], zipTop[1] - 0.12, zipTop[2]],
  );
  /* A soft landing mat by the post */
  builder.box(
    "paint",
    "#2f6fb8",
    [1.0, 0.12, 1.2],
    [zipEnd[0] - 0.3, 0.06, zipEnd[2] - 0.9],
  );
};

const zipRide = (progress: number): LocalSpot => {
  const heading = Math.atan2(zipEnd[0] - zipTop[0], zipEnd[2] - zipTop[2]);
  if (progress < 0.2) {
    const share = progress / 0.2;
    return {
      x: rideStart.x + (zipTop[0] - rideStart.x) * share,
      y: zipTower.platform * share,
      z: rideStart.z + (zipTop[2] - rideStart.z) * share,
      heading,
    };
  }
  if (progress < 0.9) {
    const raw = (progress - 0.2) / 0.7;
    const share = raw * raw * (3 - 2 * raw);
    const [x, y, z] = zipPoint(share);
    return { x, y: Math.max(0, y - zipHang), z, heading };
  }
  const share = (progress - 0.9) / 0.1;
  const [x, y, z] = zipPoint(1);
  return {
    x: x + (rideFinish.x - x) * share,
    y: Math.max(0, y - zipHang) * (1 - share),
    z: z + (rideFinish.z - z) * share,
    heading,
  };
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const firs: [number, number, number][] = [
  [-5.6, -4.6, 1.2],
  [-6.2, 1.4, 1.0],
  [6.6, 0.6, 0.9],
  [-4.4, -7.2, 0.85],
  [6.0, -6.4, 0.9],
];

/** An arch of blue ice over the foot of the front ramp, high enough to walk under. */
const buildIceArch = (builder: AttractionBuilder) => {
  const z = 5.6;
  const span = 1.35;
  [-1, 1].forEach((side) => {
    builder.add("glass", deepIce, new OctahedronGeometry(0.42, 0), {
      at: [side * span, 0.9, z],
      scale: [0.75, 2.4, 0.7],
      rotation: [0, side * 0.4, side * -0.08],
    });
  });
  const steps = builder.isFar ? 4 : 10;
  for (let step = 0; step < steps; step++) {
    const from = (step / steps) * Math.PI;
    const to = ((step + 1) / steps) * Math.PI;
    builder.bar(
      "glass",
      step % 2 === 0 ? glacierIce : shade(glacierIce, 1.06),
      [Math.cos(from) * span, 1.75 + Math.sin(from) * 0.75, z],
      [Math.cos(to) * span, 1.75 + Math.sin(to) * 0.75, z],
      0.34 - Math.sin(((step + 0.5) / steps) * Math.PI) * 0.1,
      6,
    );
  }
  if (builder.isFar) {
    return;
  }
  builder.sphere("matte", frostWhite, 0.35, [0, 2.55, z], [2.4, 0.35, 0.8], 10);
  for (let icicle = 0; icicle < 7; icicle++) {
    const x = -0.9 + icicle * 0.3;
    const top =
      1.75 + Math.sqrt(Math.max(0, 1 - (x / span) ** 2)) * 0.75 - 0.14;
    builder.add(
      "glass",
      frostWhite,
      new ConeGeometry(0.04, 0.2 + (icicle % 3) * 0.08, 5).rotateX(Math.PI),
      { at: [x, top - 0.1, z] },
    );
  }
};

/** A dog sledge, waiting with its two huskies for the explorers. */
const buildDogSledge = (builder: AttractionBuilder) => {
  const at = { x: -4.6, z: -1.2 };
  [-0.24, 0.24].forEach((dx) => {
    builder.box("matte", plank, [0.05, 0.05, 1.5], [at.x + dx, 0.05, at.z]);
    builder.bar(
      "matte",
      plank,
      [at.x + dx, 0.05, at.z + 0.75],
      [at.x + dx, 0.3, at.z + 0.9],
      0.05,
      4,
    );
    builder.bar(
      "matte",
      plank,
      [at.x + dx, 0.05, at.z - 0.7],
      [at.x + dx, 0.9, at.z - 0.85],
      0.04,
      4,
    );
  });
  builder.box("matte", shade(plank, 1.2), [0.6, 0.05, 1.3], [at.x, 0.18, at.z]);
  builder.box("matte", tentOrange, [0.5, 0.3, 0.8], [at.x, 0.36, at.z - 0.1]);
  builder.bar(
    "matte",
    plank,
    [at.x - 0.26, 0.9, at.z - 0.85],
    [at.x + 0.26, 0.9, at.z - 0.85],
    0.04,
    4,
  );
  [-0.25, 0.25].forEach((dx, index) => {
    const dog = { x: at.x + dx, z: at.z + 1.6 + index * 0.25 };
    builder.bar(
      "matte",
      rope,
      [at.x, 0.2, at.z + 0.9],
      [dog.x, 0.35, dog.z - 0.2],
      0.02,
      3,
    );
    builder.sphere(
      "matte",
      "#7d8792",
      0.16,
      [dog.x, 0.32, dog.z],
      [0.8, 0.75, 1.5],
      9,
    );
    builder.sphere(
      "matte",
      frostWhite,
      0.11,
      [dog.x, 0.27, dog.z + 0.05],
      [0.75, 0.6, 1.3],
      8,
    );
    builder.sphere(
      "matte",
      "#7d8792",
      0.11,
      [dog.x, 0.46, dog.z + 0.27],
      [0.9, 0.9, 1],
      8,
    );
    builder.sphere(
      "matte",
      frostWhite,
      0.06,
      [dog.x, 0.42, dog.z + 0.36],
      [0.8, 0.7, 1.1],
      6,
    );
    builder.torus(
      "matte",
      "#7d8792",
      0.06,
      0.025,
      [dog.x, 0.45, dog.z - 0.26],
      "x",
      8,
    );
    [-1, 1].forEach((side) => {
      builder.add("matte", "#7d8792", new ConeGeometry(0.035, 0.09, 4), {
        at: [dog.x + side * 0.05, 0.58, dog.z + 0.25],
      });
      [-0.15, 0.15].forEach((legZ) => {
        builder.cylinder("matte", frostWhite, {
          radius: 0.03,
          length: 0.22,
          at: [dog.x + side * 0.06, 0.11, dog.z + legZ],
          segments: 5,
        });
      });
    });
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  firs.forEach(([x, z, size], index) => {
    if (!builder.isFar || index < 3) {
      addFir(builder, x, z, size);
    }
  });
  buildIceArch(builder);
  if (builder.isFar) {
    return;
  }
  buildDogSledge(builder);
  [
    [-5.4, 4.6, 0.55],
    [5.8, 3.8, 0.45],
    [-1.6, -7.6, 0.5],
    [2.0, -7.4, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* A signpost pointing to the poles */
  const post = { x: -4.0, z: 3.4 };
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.7,
    at: [post.x, 0.85, post.z],
    segments: 6,
  });
  const arms: [number, number, string][] = [
    [1.45, 0.5, parkaRed],
    [1.2, -0.7, "#2f6fb8"],
  ];
  arms.forEach(([y, turn, colour]) => {
    builder.box(
      "paint",
      colour,
      [0.7, 0.16, 0.04],
      [post.x + 0.25, y, post.z],
      [0, turn, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

const flagAt: Triple = [0.9, shelfTop, -2.6];

const buildExplorersFlag = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.03,
    length: 1.6,
    at: [0, 0.8, 0],
    segments: 6,
  });
  builder.box("matte", parkaRed, [0.6, 0.4, 0.02], [0.3, 1.38, 0]);
  builder.box("matte", frostWhite, [0.6, 0.08, 0.025], [0.3, 1.38, 0]);
  builder.box("matte", frostWhite, [0.08, 0.4, 0.025], [0.2, 1.38, 0]);
};

const crystalsAt: Triple = [-1.0, 0.04, 0];

/** Ice crystals in the crevasse, growing and glowing as you look down. */
const buildCrystals = (builder: AttractionBuilder) => {
  [
    [0, 0, 0.3, 0],
    [0.35, 0.1, 0.22, 0.4],
    [-0.3, -0.12, 0.2, -0.3],
    [0.12, 0.25, 0.16, 0.2],
    [2.2, -0.15, 0.24, 0.1],
    [1.9, 0.2, 0.17, -0.4],
  ].forEach(([x, z, size, tilt]) => {
    builder.add("glow", glowBlue, new OctahedronGeometry(size, 0), {
      at: [x, size * 1.2, z],
      scale: [0.5, 1.8, 0.5],
      rotation: [0, 0, tilt],
    });
  });
};

const lanternAt: Triple = [tentAt.x + 0.7, shelfTop + 0.7, tentAt.z + 0.8];

const buildLantern = (builder: AttractionBuilder) => {
  builder.box("glow", palette.warmLight, [0.16, 0.22, 0.16], [0, 0, 0]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.12,
    radiusEnd: 0.02,
    length: 0.1,
    at: [0, 0.16, 0],
    segments: 6,
  });
};

const moving: MovingPart[] = [
  {
    name: "explorers' flag",
    pivot: flagAt,
    build: buildExplorersFlag,
    motion: { kind: "nod", axis: "y", reach: 7, amplitude: 0.45, period: 1.6 },
  },
  {
    name: "glowing ice crystals",
    pivot: crystalsAt,
    build: buildCrystals,
    motion: { kind: "wake", reach: 5 },
  },
  {
    name: "camp lantern",
    pivot: lanternAt,
    build: buildLantern,
    motion: { kind: "wake", reach: 6 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

/** An Adélie penguin: black back, white tummy, and a little white eye ring. */
const buildPenguin = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    palette.black,
    0.16,
    [0, 0.24, 0],
    [0.9, 1.4, 0.85],
    10,
  );
  builder.sphere(
    "matte",
    frostWhite,
    0.13,
    [0, 0.22, 0.05],
    [0.85, 1.35, 0.8],
    8,
  );
  builder.sphere("matte", palette.black, 0.1, [0, 0.5, 0.02], [1, 1, 1], 8);
  builder.add(
    "paint",
    "#e8762c",
    new ConeGeometry(0.03, 0.08, 5).rotateX(Math.PI / 2),
    {
      at: [0, 0.49, 0.13],
    },
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.black,
      [0.03, 0.24, 0.1],
      [side * 0.14, 0.27, 0],
      [0, 0, side * 0.25],
    );
    builder.box(
      "paint",
      "#e8762c",
      [0.06, 0.02, 0.1],
      [side * 0.05, 0.01, 0.04],
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        frostWhite,
        0.025,
        [side * 0.05, 0.53, 0.08],
        [1, 1, 0.6],
        5,
      );
    }
  });
};

const buildExplorer = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((side) => {
    builder.box("matte", "#3a2a22", [0.1, 0.12, 0.18], [side, 0.06, 0.02]);
    builder.cylinder("matte", "#2b3442", {
      radius: 0.055,
      length: 0.34,
      at: [side, 0.29, 0],
      segments: 6,
    });
  });
  builder.lathe(
    "matte",
    parkaRed,
    [
      [0, 0.42],
      [0.18, 0.44],
      [0.18, 0.64],
      [0.15, 0.78],
      [0.07, 0.84],
      [0, 0.84],
    ],
    [0, 0, 0],
    "y",
    8,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      parkaRed,
      [side * 0.15, 0.78, 0],
      [side * 0.26, 0.5, 0.05],
      0.08,
      5,
    );
  });
  /* A fur-lined hood round a smiling face, and a backpack */
  builder.torus("matte", "#c9b48f", 0.11, 0.045, [0, 0.96, 0.03], "z", 10);
  builder.sphere("matte", parkaRed, 0.14, [0, 0.96, -0.02], [1, 1.05, 1], 9);
  builder.sphere("matte", "#e8b894", 0.085, [0, 0.95, 0.06], [1, 1, 0.8], 8);
  builder.box("matte", "#3f6f4a", [0.26, 0.32, 0.14], [0, 0.62, -0.2]);
};

const wanderers: Wanderers[] = [
  {
    name: "penguins",
    build: buildPenguin,
    count: 3,
    centre: { x: -3.6, z: 5.2 },
    radius: 1.2,
    speed: 0.4,
    bob: 0.06,
  },
  {
    name: "polar explorers",
    build: buildExplorer,
    count: 1,
    centre: { x: 0.2, z: -3.0 },
    radius: 0.7,
    speed: 0.3,
    height: shelfTop,
  },
];

/* ------------------------------------------------------------------ */
/* Decks                                                               */
/* ------------------------------------------------------------------ */

const glacierDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) <= shelfHalf) {
    if (
      (z >= front.minZ && z <= front.maxZ) ||
      (z >= back.minZ && z <= back.maxZ)
    ) {
      return { height: shelfTop, kind: "trail" };
    }
  }
  if (Math.abs(x) <= bridgeHalf && z > back.maxZ && z < front.minZ) {
    return { height: bridgeHeightAt(z), kind: "bridge" };
  }
  if (Math.abs(x) <= rampHalf) {
    if (z > frontRamp.fromZ && z <= frontRamp.toZ) {
      return {
        height: rampHeightAt(z, frontRamp.fromZ, frontRamp.toZ),
        kind: "trail",
      };
    }
    if (z < backRamp.fromZ && z >= backRamp.toZ) {
      return {
        height: rampHeightAt(z, backRamp.fromZ, backRamp.toZ),
        kind: "trail",
      };
    }
  }
  return undefined;
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildGlacier(builder);
  buildBridge(builder);
  buildCamp(builder);
  buildZipLine(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

export const glacierBridgeModel: NewLandAttractionModel = {
  kind: "glacier-bridge",
  islandId: "frost-isle",
  name: "Glacier Bridge",
  fact: "A glacier is a huge, slow river of ice that slides downhill, often only a few centimetres a day. As it moves, deep cracks called crevasses open up in the ice. Glaciers are found near the North and South Poles and high on mountains, the coldest places on Earth.",
  curriculumLink:
    "Geography, Key Stage 1: identify the location of hot and cold areas of the world in relation to the Equator and the North and South Poles.",
  footprint: 10,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  decks: [glacierDeck],
  rides: [
    {
      id: "zip-line",
      name: "the zip line",
      start: rideStart,
      reach: 0.7,
      seconds: 7,
      finish: rideFinish,
      follow: zipRide,
    },
  ],
  blockers: firs.map(([x, z, size]) => ({
    x,
    z,
    radius: 0.35 * size,
  })) satisfies LocalBlocker[],
  play: {
    label: "Cross the crevasse",
    news: "Wobble, wobble! You stepped carefully across the swaying rope bridge, high over the deep blue crevasse, and made it safely to the explorers' camp.",
  },
};
