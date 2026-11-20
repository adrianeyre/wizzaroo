import { BoxGeometry, BufferAttribute, TorusGeometry } from "three";
import {
  palette,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/* The Dragon Boat Lake's moving things: the longships, the lake dragon and the eider ducks. */

export const vikingRed = "#9c2a22";
const tarredOak = "#4a3122";
const oak = "#7a5232";
const deckPine = "#b4834f";
export const bronze = "#b5793a";
const gold = "#d9a93a";
const sailCream = "#efe2c4";
const shieldColours = [vikingRed, gold, "#f1ebdc", "#2f4f7a", vikingRed];
const tunicBlue = "#3c5a86";
const skin = "#e7b48f";
const helmetIron = "#7d8389";
const beard = "#c46a2b";

/** How long the boat is from its middle to each end. */
const hullHalf = 1.4;
/** Where the Character sits, behind the mast. */
export const boatSeat: Triple = [0, 0.36, 0.55];

const halfWidth = (z: number): number =>
  Math.max(0.035, 0.5 * Math.pow(1 - Math.pow(Math.abs(z) / 1.48, 2.2), 0.6));

/** The top of the boat's side, sweeping up to the prow and the stern. */
export const sheer = (z: number): number =>
  0.3 + 0.24 * Math.pow(Math.abs(z) / hullHalf, 3);

const buildHull = (builder: AttractionBuilder, stripe: string) => {
  const stations = Array.from({ length: builder.isFar ? 7 : 9 }, (_, i) => {
    const count = builder.isFar ? 6 : 8;
    const z = -hullHalf + (2 * hullHalf * i) / count;
    const w = halfWidth(z);
    const h = sheer(z);
    const d = 0.04 + 0.16 * (w / 0.5);
    const side: [number, number][] = [
      [w, h],
      [w * 0.985, h - 0.08],
      [w * 0.96, h * 0.55],
      [w * 0.9, 0.16],
      [w * 0.78, 0.06],
      [w * 0.56, -d * 0.55],
      [w * 0.28, -d * 0.9],
    ];
    const points: [number, number][] = [
      ...side.map(([x, y]): [number, number] => [-x, y]),
      [0, -d],
      ...side
        .slice()
        .reverse()
        .map(([x, y]): [number, number] => [x, y]),
    ];
    return { z, points };
  });
  builder.loft({
    stations,
    finish: "paint",
    paint: (centre, normal) => {
      if (normal.y > 0.75 && centre.y > 0.2) {
        return { colour: deckPine, finish: "matte" };
      }
      const top = sheer(centre.z);
      if (centre.y > top - 0.09) {
        return { colour: stripe, finish: "paint" };
      }
      if (centre.y > top * 0.5) {
        return shade(oak, 1.05);
      }
      if (centre.y > 0.1) {
        return shade(oak, 0.9);
      }
      return tarredOak;
    },
  });
};

const buildDragonProw = (builder: AttractionBuilder, scales: string) => {
  const neck: Triple[] = [
    [0, 0.42, -1.36],
    [0, 0.68, -1.5],
    [0, 0.98, -1.58],
    [0, 1.2, -1.54],
  ];
  neck.slice(1).forEach((point, index) => {
    builder.bar(
      "paint",
      scales,
      neck[index],
      point,
      0.15 - index * 0.02,
      builder.isFar ? 6 : 10,
    );
  });
  /* Head, snout and jaw, looking out ahead */
  builder.sphere(
    "paint",
    scales,
    0.13,
    [0, 1.27, -1.63],
    [0.8, 0.8, 1.2],
    builder.isFar ? 6 : 10,
  );
  builder.box(
    "paint",
    shade(scales, 1.08),
    [0.14, 0.11, 0.22],
    [0, 1.24, -1.8],
    [0.15, 0, 0],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    shade(scales, 0.85),
    [0.13, 0.05, 0.2],
    [0, 1.15, -1.78],
    [0.45, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      "#ffd34a",
      0.035,
      [side * 0.09, 1.33, -1.7],
      [1, 1, 1],
      6,
    );
    builder.bar(
      "metal",
      gold,
      [side * 0.06, 1.34, -1.54],
      [side * 0.12, 1.52, -1.4],
      0.035,
      6,
    );
    builder.box(
      "paint",
      gold,
      [0.02, 0.14, 0.18],
      [side * 0.1, 1.24, -1.5],
      [0, side * 0.3, 0],
    );
  });
  /* A frill of fins down the back of the neck */
  [0, 1, 2].forEach((fin) => {
    builder.box(
      "paint",
      gold,
      [0.02, 0.12, 0.12],
      [0, 0.68 + fin * 0.2, -1.44 + fin * 0.0],
      [0.4, 0, 0],
    );
  });
};

const buildTail = (builder: AttractionBuilder, scales: string) => {
  builder.bar("paint", scales, [0, 0.42, 1.36], [0, 0.78, 1.5], 0.12, 8);
  builder.add(
    "paint",
    scales,
    new TorusGeometry(
      0.2,
      0.05,
      builder.segments(6, 4),
      builder.segments(10, 5),
      Math.PI * 1.5,
    ),
    { at: [0, 0.98, 1.44], rotation: [0, Math.PI / 2, 0] },
  );
};

const buildSail = (builder: AttractionBuilder, stripe: string) => {
  const width = 1.5;
  const height = 1.1;
  const geometry = new BoxGeometry(
    width,
    height,
    0.03,
    builder.isFar ? 2 : 6,
    2,
    1,
  );
  const positions = geometry.getAttribute("position");
  if (positions instanceof BufferAttribute) {
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index) / (width / 2);
      const y = positions.getY(index) / (height / 2);
      positions.setZ(
        index,
        positions.getZ(index) - 0.16 * (1 - x * x) * (0.6 + 0.4 * (1 - y)),
      );
    }
  }
  builder.painted(
    geometry,
    (centre) =>
      Math.floor((centre.x + width / 2) / (width / 6)) % 2 === 0
        ? stripe
        : sailCream,
    { at: [0, 1.5, -0.2] },
    "matte",
  );
};

const buildViking = (
  builder: AttractionBuilder,
  at: Triple,
  tunic: string,
  turn = 0,
) => {
  const [x, y, z] = at;
  builder.cylinder("matte", tunic, {
    radius: 0.13,
    radiusEnd: 0.1,
    length: 0.3,
    at: [x, y + 0.15, z],
    segments: 8,
  });
  builder.sphere("matte", skin, 0.09, [x, y + 0.38, z], [1, 1, 1], 7);
  builder.sphere(
    "matte",
    beard,
    0.07,
    [x + Math.sin(turn) * 0.05, y + 0.33, z + Math.cos(turn) * 0.05],
    [1, 0.9, 0.7],
    6,
  );
  builder.sphere("metal", helmetIron, 0.095, [x, y + 0.42, z], [1, 0.75, 1], 7);
};

/** A longship, its prow towards local -z and its waterline at y = 0. */
export const buildDragonBoat = (builder: AttractionBuilder) => {
  const scales = "#3c6b4a";
  buildHull(builder, vikingRed);
  buildDragonProw(builder, scales);
  buildTail(builder, scales);
  /* Mast, yard and the striped square sail */
  builder.cylinder("matte", oak, {
    radius: 0.05,
    radiusEnd: 0.04,
    length: 1.9,
    at: [0, 1.25, -0.15],
    segments: 8,
  });
  builder.bar("matte", oak, [-0.82, 2.06, -0.17], [0.82, 2.06, -0.17], 0.05, 6);
  buildSail(builder, vikingRed);
  /* Shields along both sides */
  const shieldsZ = builder.isFar ? [0] : [-0.9, -0.3, 0.3, 0.9];
  [-1, 1].forEach((side) => {
    shieldsZ.forEach((z, index) => {
      const x = side * (halfWidth(z) + 0.02);
      const y = sheer(z) - 0.07;
      builder.cylinder(
        "paint",
        shieldColours[(index + (side > 0 ? 1 : 0)) % shieldColours.length],
        {
          radius: 0.13,
          length: 0.035,
          at: [x, y, z],
          axis: "x",
          segments: builder.isFar ? 6 : 8,
        },
      );
      if (!builder.isFar) {
        builder.box(
          "metal",
          bronze,
          [0.03, 0.06, 0.06],
          [x + side * 0.02, y, z],
        );
      }
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Rigging, from the masthead to the prow and the stern */
  builder.bar(
    "matte",
    palette.cream,
    [0, 2.15, -0.15],
    [0, 0.55, -1.38],
    0.015,
    4,
  );
  builder.bar(
    "matte",
    palette.cream,
    [0, 2.15, -0.15],
    [0, 0.55, 1.38],
    0.015,
    4,
  );
  builder.sphere("metal", gold, 0.05, [0, 2.22, -0.15], [1, 1, 1], 6);
  /* Oars dipping into the lake */
  [-1, 1].forEach((side) => {
    [-0.45, 0.65].forEach((z) => {
      const x = side * (halfWidth(z) - 0.02);
      const tip: Triple = [side * (halfWidth(z) + 0.42), -0.04, z + 0.1];
      builder.bar(
        "matte",
        palette.paleTimber,
        [x, sheer(z) - 0.02, z],
        tip,
        0.035,
        5,
      );
      builder.box("matte", palette.paleTimber, [0.2, 0.02, 0.08], tip, [
        0,
        side * 0.15,
        0,
      ]);
    });
  });
  /* A rower in front of the mast and a helmsman with the steering oar */
  buildViking(builder, [0.08, 0.36, 1.05], tunicBlue);
  builder.bar("matte", oak, [0.42, 0.5, 1.1], [0.52, -0.1, 1.25], 0.05, 6);
  builder.box("matte", oak, [0.03, 0.28, 0.16], [0.52, -0.05, 1.25]);
};

/* The lake dragon */

const dragonScales = "#d0702c";
const dragonBelly = "#f2cf8a";

/** The friendly lake dragon, local y = 0 its waterline once risen, facing +z. */
export const buildLakeDragon = (builder: AttractionBuilder) => {
  const neck: Triple[] = [
    [0, -0.25, -0.05],
    [0, 0.35, 0.02],
    [0, 0.78, -0.02],
    [0, 1.02, 0.12],
  ];
  neck.slice(1).forEach((point, index) => {
    builder.bar(
      "paint",
      dragonScales,
      neck[index],
      point,
      0.36 - index * 0.05,
      builder.isFar ? 6 : 9,
    );
  });
  builder.box(
    "paint",
    dragonBelly,
    [0.16, 0.7, 0.1],
    [0, 0.45, 0.15],
    [-0.05, 0, 0],
  );
  /* A big round head and a smiling snout */
  builder.sphere(
    "paint",
    dragonScales,
    0.24,
    [0, 1.12, 0.18],
    [1, 0.9, 1.1],
    12,
  );
  builder.sphere(
    "paint",
    shade(dragonScales, 1.1),
    0.14,
    [0, 1.06, 0.4],
    [1, 0.65, 1],
    builder.isFar ? 6 : 10,
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.sphere(
        "paint",
        palette.white,
        0.075,
        [side * 0.12, 1.24, 0.32],
        [1, 1, 1],
        8,
      );
      builder.sphere(
        "paint",
        palette.black,
        0.038,
        [side * 0.12, 1.25, 0.39],
        [1, 1, 1],
        6,
      );
      builder.sphere(
        "paint",
        "#ff9fb0",
        0.045,
        [side * 0.16, 1.08, 0.36],
        [1, 0.6, 0.4],
        6,
      );
      builder.box(
        "paint",
        palette.black,
        [0.03, 0.02, 0.02],
        [side * 0.05, 1.11, 0.53],
      );
      builder.bar(
        "paint",
        dragonBelly,
        [side * 0.1, 1.3, 0.12],
        [side * 0.17, 1.48, 0.02],
        0.05,
        6,
      );
    });
    builder.torus("paint", "#7a2a1a", 0.07, 0.012, [0, 1.0, 0.52], "z", 10);
    /* Spines down its back */
    [0, 1, 2, 3].forEach((spine) => {
      builder.box(
        "paint",
        gold,
        [0.03, 0.14, 0.12],
        [0, 1.25 - spine * 0.28, -0.06 - spine * 0.04],
        [0.5, 0, 0],
      );
    });
  }
  /* Two humps and a curly tail out in the lake behind it */
  [-0.45, -0.78].forEach((z, index) => {
    builder.add(
      "paint",
      index === 0 ? dragonScales : shade(dragonScales, 0.92),
      new TorusGeometry(
        0.2 - index * 0.03,
        0.1 - index * 0.015,
        builder.segments(6, 4),
        builder.segments(10, 5),
        Math.PI,
      ),
      { at: [0, 0, z], rotation: [0, Math.PI / 2, 0] },
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        gold,
        [0.03, 0.1, 0.1],
        [0, 0.32 - index * 0.04, z],
        [0.4, 0, 0],
      );
    }
  });
  builder.add(
    "paint",
    dragonScales,
    new TorusGeometry(
      0.1,
      0.04,
      builder.segments(6, 4),
      builder.segments(10, 5),
      Math.PI * 1.4,
    ),
    { at: [0, 0.06, -1.05], rotation: [0, Math.PI / 2, 0] },
  );
};

/* Eider ducks */

export const buildEiderDuck = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    palette.white,
    0.13,
    [0, 0.06, 0],
    [0.9, 0.62, 1.25],
    8,
  );
  if (builder.isFar) {
    builder.sphere(
      "paint",
      palette.white,
      0.075,
      [0, 0.19, 0.12],
      [1, 1, 1],
      6,
    );
    return;
  }
  builder.sphere(
    "paint",
    palette.black,
    0.12,
    [0, 0.03, -0.04],
    [0.92, 0.55, 1.2],
    6,
  );
  builder.sphere("paint", palette.white, 0.075, [0, 0.19, 0.12], [1, 1, 1], 7);
  builder.sphere("paint", "#9ccc8a", 0.05, [0, 0.21, 0.1], [1.1, 0.7, 0.9], 6);
  builder.box("paint", "#d8c27a", [0.05, 0.035, 0.09], [0, 0.17, 0.22]);
  builder.cylinder("paint", palette.black, {
    radius: 0.03,
    radiusEnd: 0.01,
    length: 0.1,
    at: [0, 0.1, -0.17],
    axis: "z",
    segments: 6,
  });
};
