import { BoxGeometry, Shape, ShapeGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Triple,
} from "./attraction-kit.js";

const sand = "#dcc898";
const wetSand = "#b9a47a";
const shallowSea = "#4aa3b4";
const foam = "#eef4f2";
const timber = "#7d5b3b";
const timberPale = "#94704a";
const timberDark = "#4b3523";
const timberWeed = "#5a5a3a";
const rope = "#8a7656";
const sailCloth = "#d8cdb0";
const iron = "#34353a";
const gold = "#f0c24a";
const bronze = "#6f6a48";
const weed = "#4f6b2c";
const weedDark = "#3a5524";
const barnacle = "#d9d4c4";
const rock = "#76706a";

const footprint = 9;
const waterLine = 6.7;

/* The hull lies along z, rolled over towards -x and sunk into the sand. */
const hullX = -0.3;
const roll = 0.36;
const sink = -0.3;
const pitch = 0.07;
const sternZ = -6.4;
const bowZ = 2.9;
const beam = 1.7;
const holeFrom = -4.1;
const holeTo = -1.2;

const share = (z: number) => (z - sternZ) / (bowZ - sternZ);

const findHalfWidth = (z: number): number => {
  const along = share(z);
  if (along < 0.45) {
    return beam * (0.84 + 0.16 * Math.sin((along / 0.45) * (Math.PI / 2)));
  }
  return (
    beam *
    Math.max(0.04, Math.cos(((along - 0.45) / 0.55) * (Math.PI / 2)) ** 0.75)
  );
};

const findTop = (z: number): number => {
  const along = share(z);
  return along < 0.45
    ? 1.3 + 0.4 * ((0.45 - along) / 0.45) ** 2
    : 1.3 + 0.5 * ((along - 0.45) / 0.55) ** 2;
};

const findKeel = (z: number): number =>
  -1.1 + 0.35 * Math.max(0, (share(z) - 0.72) / 0.28) ** 2;

/** From the hull's own frame to the Attraction's local space. */
const toLocal = ([x, y, z]: Triple): Triple => [
  hullX + x * Math.cos(roll) - y * Math.sin(roll),
  x * Math.sin(roll) + y * Math.cos(roll) + sink + pitch * z,
  z,
];

const toHull = (x: number, y: number, z: number): Triple => {
  const across = x - hullX;
  const up = y - sink - pitch * z;
  return [
    across * Math.cos(roll) + up * Math.sin(roll),
    -across * Math.sin(roll) + up * Math.cos(roll),
    z,
  ];
};

const hullTurn: Triple = [-Math.atan(pitch), 0, roll];

const hullBox = (
  builder: AttractionBuilder,
  colour: string,
  size: Triple,
  at: Triple,
  finish: "matte" | "metal" = "matte",
) => {
  builder.box(finish, colour, size, toLocal(at), hullTurn);
};

const hullBar = (
  builder: AttractionBuilder,
  colour: string,
  from: Triple,
  to: Triple,
  thickness: number,
  segments = 6,
) => {
  builder.bar("matte", colour, toLocal(from), toLocal(to), thickness, segments);
};

/** One side of a section, gunwale to keel, as [out, up] in units of the half width. */
const sectionShape = (
  top: number,
  keel: number,
): readonly (readonly [number, number])[] => [
  [1, top],
  [1.04, 0.65],
  [0.97, 0.1],
  [0.78, -0.45],
  [0.42, (keel - 0.45) / 2 - 0.05],
  [0, keel],
];

const strakes = 10;

/** The section's side resampled into evenly spaced strakes, gunwale first. */
const sampleSide = (top: number, keel: number): [number, number][] => {
  const shape = sectionShape(top, keel);
  return Array.from({ length: strakes + 1 }, (_, index) => {
    const up = top - ((top - keel) * index) / strakes;
    const below = shape.findIndex(([, height]) => height <= up);
    if (below <= 0) {
      return [shape[0][0], up];
    }
    const [outAbove, upAbove] = shape[below - 1];
    const [outBelow, upBelow] = shape[below];
    const share = (upAbove - up) / Math.max(0.0001, upAbove - upBelow);
    return [outAbove + (outBelow - outAbove) * share, up];
  });
};

const sectionAt = (z: number) => {
  const width = findHalfWidth(z);
  const side = sampleSide(findTop(z), findKeel(z));
  const outer = [
    ...side.map(([out, up]) => [out * width, up] as const),
    ...side
      .slice(0, -1)
      .toReversed()
      .map(([out, up]) => [-out * width, up] as const),
  ];
  const thickness = 0.09;
  const inner = outer
    .toReversed()
    .map(
      ([x, y]) =>
        [x * (1 - thickness / Math.max(width, 0.2)), y + thickness] as const,
    );
  return [...outer, ...inner];
};

const hash = (a: number, b: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
};

const isInHole = (x: number, y: number, z: number): boolean =>
  x > 0.3 &&
  z > holeFrom &&
  z < holeTo &&
  y > -0.6 + 0.25 * Math.sin(z * 6.3) + 0.12 * Math.sin(z * 17);

const buildHull = (builder: AttractionBuilder) => {
  const steps = builder.segments(26, 12);
  const stations = Array.from({ length: steps + 1 }, (_, step) => {
    const z = sternZ + ((bowZ - sternZ) * step) / steps;
    return {
      z,
      points: sectionAt(z).map(([x, y]) => {
        const [localX, localY] = toLocal([x, y, z]);
        return [localX, localY] as const;
      }),
    };
  });
  builder.loft({
    stations,
    finish: "matte",
    paint: (centre, normal) => {
      const [x, y, z] = toHull(centre.x, centre.y, centre.z);
      if (isInHole(x, y, z)) {
        return undefined;
      }
      const outward =
        (normal.x * Math.cos(roll) + normal.y * Math.sin(roll)) * Math.sign(x);
      const isInside =
        outward < -0.2 ||
        (Math.abs(x) < findHalfWidth(z) * 0.85 && y > findKeel(z) + 0.05);
      if (isInside) {
        return {
          colour: shade(timberDark, 0.9 + 0.12 * (Math.floor(z * 3) % 2)),
          finish: "matte",
        };
      }
      if (y > findTop(z) - 0.03) {
        return { colour: timberPale, finish: "matte" };
      }
      const height = (y - findKeel(z)) / (findTop(z) - findKeel(z));
      const strake = Math.floor(height * strakes + 0.001);
      const base = strake < 4 ? timberWeed : timber;
      return {
        colour: shade(base, strake % 2 === 0 ? 1 : 0.9),
        finish: "matte",
      };
    },
  });
};

const buildDeckAndCastle = (builder: AttractionBuilder) => {
  const deckY = 0.85;
  const planks = builder.isFar ? 6 : 18;
  for (let plank = 0; plank < planks; plank++) {
    const z =
      sternZ + 1.8 + ((bowZ - 1.2 - (sternZ + 1.8)) * (plank + 0.5)) / planks;
    if (!builder.isFar && hash(plank, 3) < 0.22) {
      continue;
    }
    const width = findHalfWidth(z) * 0.96;
    const isBroken = z > holeFrom - 0.2 && z < holeTo + 0.2;
    const from = -width;
    const to = isBroken ? width * (0.1 + hash(plank, 5) * 0.4) : width;
    hullBox(
      builder,
      plank % 2 === 0 ? timberPale : shade(timberPale, 0.88),
      [to - from, 0.05, ((bowZ - 1.2 - (sternZ + 1.8)) / planks) * 0.86],
      [(from + to) / 2, deckY, z],
    );
  }
  const castleFrom = sternZ + 0.05;
  const castleTo = sternZ + 1.9;
  const castleZ = (castleFrom + castleTo) / 2;
  const castleWidth = findHalfWidth(castleZ) * 1.9;
  hullBox(
    builder,
    timber,
    [castleWidth, 0.95, castleTo - castleFrom],
    [0, 1.6, castleZ],
  );
  hullBox(
    builder,
    timberPale,
    [castleWidth + 0.12, 0.08, castleTo - castleFrom + 0.1],
    [0, 2.11, castleZ],
  );
  hullBox(
    builder,
    shade(timber, 0.85),
    [castleWidth, 0.3, 0.06],
    [0, 2.27, castleTo - 0.03],
  );
  if (builder.isFar) {
    return;
  }
  [-0.55, 0, 0.55].forEach((across) => {
    hullBox(
      builder,
      "#2a241e",
      [0.26, 0.32, 0.03],
      [across, 1.6, castleTo + 0.005],
    );
    hullBox(
      builder,
      timberPale,
      [0.34, 0.05, 0.05],
      [across, 1.41, castleTo + 0.02],
    );
  });
  [-0.45, 0.45].forEach((across) => {
    hullBox(
      builder,
      "#2a241e",
      [0.3, 0.3, 0.03],
      [across, 1.6, castleFrom - 0.005],
    );
  });
  [-1, 1].forEach((side) => {
    for (let post = 0; post < 5; post++) {
      hullBox(
        builder,
        timberPale,
        [0.05, 0.28, 0.05],
        [side * (castleWidth / 2 - 0.03), 2.29, castleFrom + 0.15 + post * 0.4],
      );
    }
  });
};

const buildRibs = (builder: AttractionBuilder) => {
  const ribs = builder.isFar
    ? [-3.2, -2.0]
    : [-3.6, -3.15, -2.7, -2.25, -1.8, -1.4];
  ribs.forEach((z, index) => {
    const width = findHalfWidth(z) * 0.97;
    const points = sectionShape(findTop(z), findKeel(z))
      .slice(0, 4)
      .toReversed()
      .map(([out, up]): Triple => [out * width, up, z]);
    const reach = index % 3 === 1 ? 3 : 2 + hash(index, 9);
    for (let segment = 0; segment < points.length - 1; segment++) {
      if (segment >= reach) {
        break;
      }
      const isLast = segment + 1 > reach - 1 && reach % 1 !== 0;
      const end = points[segment + 1];
      const start = points[segment];
      const cut = isLast ? reach % 1 : 1;
      hullBar(
        builder,
        index % 2 === 0 ? timberDark : shade(timberDark, 1.15),
        start,
        [
          start[0] + (end[0] - start[0]) * cut,
          start[1] + (end[1] - start[1]) * cut,
          z,
        ],
        0.11,
        5,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  [
    [-3.3, 0.4, 0.5],
    [-2.0, 0.15, -0.4],
  ].forEach(([z, up, tilt]) => {
    const width = findHalfWidth(z);
    builder.box(
      "matte",
      shade(timber, 0.92),
      [0.06, 0.18, 1.2],
      toLocal([width * 1.06, up, z]),
      [tilt, 0, roll + 0.2],
    );
  });
};

const mastZ = -0.6;
const mastTop = 4.4;

const buildRig = (builder: AttractionBuilder) => {
  hullBar(builder, timberDark, [0, 0.3, mastZ], [0, mastTop, mastZ], 0.26, 10);
  const splinters: Triple[] = [
    [0.05, 0.3, 0.02],
    [-0.06, 0.22, -0.04],
    [0.02, 0.4, -0.06],
  ];
  splinters.forEach(([x, rise, z]) => {
    builder.cylinder("matte", timberPale, {
      radius: 0.07,
      radiusEnd: 0.005,
      length: rise,
      at: toLocal([x, mastTop + rise / 2 - 0.02, mastZ + z]),
      segments: 4,
    });
  });
  const yardY = 3.55;
  hullBar(
    builder,
    timberDark,
    [-1.6, yardY, mastZ + 0.12],
    [1.4, yardY, mastZ + 0.12],
    0.1,
    6,
  );
  const sail = new BoxGeometry(
    2.6,
    1.6,
    0.025,
    builder.isFar ? 3 : 9,
    builder.isFar ? 2 : 6,
    1,
  );
  const positions = sail.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const billow = Math.cos((x / 2.6) * Math.PI) * (0.8 - y) * 0.22;
    const ragged = y < -0.7 ? 0.22 * hash(Math.round(x * 10), 2) : 0;
    positions.setXYZ(index, x, y + ragged, positions.getZ(index) + billow);
  }
  sail.computeVertexNormals();
  builder.painted(
    sail,
    (centre) => {
      const [x, y] = toHull(centre.x, centre.y, centre.z);
      const tear = hash(Math.round(x * 4), Math.round(y * 4));
      if (!builder.isFar && tear > 0.86 && y < yardY - 0.25) {
        return undefined;
      }
      return {
        colour: shade(sailCloth, 0.9 + 0.1 * Math.round(tear * 2) * 0.5),
        finish: "matte",
      };
    },
    { at: toLocal([-0.1, yardY - 0.82, mastZ + 0.2]), rotation: hullTurn },
    "matte",
  );
  const bowTop = findTop(bowZ - 0.1);
  hullBar(
    builder,
    timberDark,
    [0, bowTop - 0.05, bowZ - 0.2],
    [0, bowTop + 0.45, bowZ + 1.1],
    0.14,
    6,
  );
  builder.bar(
    "matte",
    timberDark,
    [-2.0, 0.18, -2.2],
    [-4.9, 0.12, -4.4],
    0.2,
    8,
  );
  builder.cylinder("matte", timberPale, {
    radius: 0.1,
    radiusEnd: 0.005,
    length: 0.3,
    at: [-1.88, 0.2, -2.1],
    axis: "x",
    segments: 4,
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "matte",
    timberDark,
    [-3.9, 0.1, -2.6],
    [-4.4, 0.16, -4.9],
    0.08,
    5,
  );
  [-1.6, 0.4].forEach((z) => {
    [-1, 1].forEach((side) => {
      const width = findHalfWidth(z);
      hullBar(
        builder,
        rope,
        [side * width, findTop(z), z],
        [side * 0.12, mastTop - 0.25, mastZ],
        0.025,
        4,
      );
    });
  });
  hullBar(
    builder,
    rope,
    [1.35, yardY, mastZ + 0.12],
    [1.5, 0.6, mastZ + 0.9],
    0.025,
    4,
  );
  builder.bar(
    "matte",
    rope,
    toLocal([1.5, 0.6, mastZ + 0.9]),
    [2.4, 0.04, 0.6],
    0.025,
    4,
  );
  builder.bar("matte", rope, [2.4, 0.04, 0.6], [2.9, 0.04, 1.6], 0.025, 4);
  hullBar(
    builder,
    rope,
    [0, bowTop + 0.4, bowZ + 1.0],
    [0, 3.4, mastZ + 0.1],
    0.02,
    4,
  );
};

const buildCrust = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  for (let index = 0; index < 26; index++) {
    const z = sternZ + 0.5 + hash(index, 1) * (bowZ - sternZ - 2);
    const up = -0.3 + hash(index, 2) * 0.6;
    const side = index % 3 === 0 ? -1 : 1;
    if (side > 0 && isInHole(1, up, z)) {
      continue;
    }
    const width = findHalfWidth(z) * (up > 0 ? 1.03 : 0.95);
    builder.sphere(
      "matte",
      index % 4 === 0 ? shade(barnacle, 0.85) : barnacle,
      0.05 + hash(index, 4) * 0.04,
      toLocal([side * width, up, z]),
      [1, 0.6, 1],
      5,
    );
  }
  for (let strand = 0; strand < 9; strand++) {
    const z = sternZ + 0.8 + strand * 0.8;
    if (z > holeFrom && z < holeTo) {
      continue;
    }
    const top = findTop(z);
    const width = findHalfWidth(z);
    hullBar(
      builder,
      strand % 2 === 0 ? weed : weedDark,
      [width + 0.03, top, z],
      [width * 1.06, top - 0.5 - hash(strand, 7) * 0.4, z + 0.12],
      0.05,
      4,
    );
  }
};

const addBarrel = (
  builder: AttractionBuilder,
  at: Triple,
  isLying: boolean,
  turn = 0,
) => {
  const profile = [
    [0, 0],
    [0.2, 0],
    [0.25, 0.27],
    [0.2, 0.54],
    [0, 0.54],
  ] as const;
  const colour = shade(timber, 0.95 + hash(at[0], at[2]) * 0.15);
  if (isLying) {
    builder.lathe(
      "matte",
      colour,
      profile,
      [
        at[0] - 0.27 * Math.cos(turn),
        at[1] + 0.22,
        at[2] + 0.27 * Math.sin(turn),
      ],
      "x",
      10,
    );
    return;
  }
  builder.lathe("matte", colour, profile, at, "y", 10);
  if (!builder.isFar) {
    [0.1, 0.44].forEach((up) => {
      builder.cylinder("metal", iron, {
        radius: 0.225,
        length: 0.04,
        at: [at[0], at[1] + up, at[2]],
        segments: 10,
        isOpen: true,
      });
    });
  }
};

const chestAt: Triple = [2.9, 0, 2.3];
const chestTurn = -0.5;

const buildTreasure = (builder: AttractionBuilder) => {
  const place = (x: number, y: number, z: number): Triple => [
    chestAt[0] + x * Math.cos(chestTurn) + z * Math.sin(chestTurn),
    chestAt[1] + y,
    chestAt[2] - x * Math.sin(chestTurn) + z * Math.cos(chestTurn),
  ];
  const turn: Triple = [0, chestTurn, 0];
  builder.box("matte", timberDark, [0.8, 0.42, 0.5], place(0, 0.19, 0), turn);
  builder.sphere("paint", gold, 0.36, place(0, 0.4, 0), [1, 0.32, 0.6], 10);
  builder.add(
    "matte",
    timber,
    new BoxGeometry(0.82, 0.08, 0.52).rotateX(-1.83),
    {
      at: place(0, 0.42 + 0.25, -0.25 - 0.07),
      rotation: turn,
    },
  );
  if (builder.isFar) {
    return;
  }
  [-0.3, 0.3].forEach((x) => {
    builder.box("metal", iron, [0.06, 0.44, 0.52], place(x, 0.2, 0), turn);
  });
  builder.box("metal", gold, [0.1, 0.12, 0.03], place(0, 0.3, 0.26), turn);
  const coins = 26;
  for (let coin = 0; coin < coins; coin++) {
    const spread = hash(coin, 11);
    const sideways = (hash(coin, 12) - 0.5) * (0.4 + spread * 1.6);
    const at = place(sideways, 0.012, 0.35 + spread * 1.5);
    builder.cylinder("paint", coin % 5 === 0 ? shade(gold, 0.85) : gold, {
      radius: 0.065,
      length: 0.018,
      at: coin % 4 === 0 ? [at[0], 0.06, at[2]] : at,
      axis: coin % 4 === 0 ? "z" : "y",
      segments: 8,
    });
  }
  const jewels: [string, Triple][] = [
    ["#c0263a", place(-0.12, 0.5, 0.06)],
    ["#1f8a5b", place(0.15, 0.48, -0.05)],
    ["#2b5fc4", place(0.4, 0.03, 0.55)],
    ["#c0263a", place(-0.5, 0.03, 0.8)],
    ["#7b3fb3", place(0.05, 0.52, 0.12)],
  ];
  jewels.forEach(([colour, at]) => {
    builder.sphere("glass", colour, 0.055, at, [1, 1.2, 1], 5);
  });
  builder.lathe(
    "metal",
    gold,
    [
      [0.07, 0],
      [0.03, 0.02],
      [0.02, 0.12],
      [0.08, 0.2],
      [0.06, 0.26],
    ],
    place(-0.62, 0, 0.3),
    "y",
    10,
  );
  builder.add("metal", gold, new TorusGeometry(0.16, 0.012, 4, 14), {
    at: place(0.15, 0.48, 0.0),
    rotation: [Math.PI / 2 - 0.4, 0, 0.3],
  });
};

const wheelAt: Triple = [3.9, 0, -0.1];

const buildWheel = (builder: AttractionBuilder) => {
  const lean = 0.35;
  const radius = 0.42;
  const centre: Triple = [
    wheelAt[0],
    radius * Math.cos(lean) + 0.05,
    wheelAt[2],
  ];
  const spin = (x: number, y: number): Triple => [
    centre[0] + x,
    centre[1] + y * Math.cos(lean),
    centre[2] - y * Math.sin(lean),
  ];
  builder.add(
    "paint",
    timber,
    new TorusGeometry(radius, 0.035, 5, builder.segments(20, 10)),
    {
      at: centre,
      rotation: [-lean, 0, 0],
    },
  );
  builder.cylinder("paint", timberDark, {
    radius: 0.07,
    length: 0.12,
    at: centre,
    axis: "z",
    segments: 8,
  });
  const spokes = 8;
  for (let spoke = 0; spoke < spokes; spoke++) {
    const angle = (spoke / spokes) * Math.PI * 2;
    builder.bar(
      "paint",
      timber,
      spin(0, 0),
      spin(
        Math.cos(angle) * (radius + 0.14),
        Math.sin(angle) * (radius + 0.14),
      ),
      0.035,
      5,
    );
  }
};

const buildProps = (builder: AttractionBuilder) => {
  addBarrel(builder, [3.6, 0, -0.75], false);
  addBarrel(builder, [4.6, 0, 0.8], true, 0.4);
  addBarrel(builder, [2.5, -0.18, -5.0], false);
  buildWheel(builder);
  builder.lathe(
    "metal",
    bronze,
    [
      [0, -0.85],
      [0.2, -0.85],
      [0.21, -0.7],
      [0.17, -0.62],
      [0.13, 0.65],
      [0.16, 0.7],
      [0.12, 0.72],
      [0, 0.72],
    ],
    [-3.3, 0.19, -5.0],
    "x",
    12,
  );
  const anchor: Triple = [-3.7, 0, 0.9];
  builder.bar(
    "metal",
    iron,
    [anchor[0], -0.1, anchor[2]],
    [anchor[0] + 0.35, 1.25, anchor[2] - 0.25],
    0.1,
    6,
  );
  builder.bar(
    "matte",
    timberDark,
    [anchor[0] - 0.3, 1.0, anchor[2] - 0.75],
    [anchor[0] + 0.85, 1.12, anchor[2] + 0.15],
    0.1,
    6,
  );
  builder.add("metal", iron, new TorusGeometry(0.12, 0.03, 5, 10), {
    at: [anchor[0] + 0.38, 1.38, anchor[2] - 0.27],
    rotation: [0, 0.7, 0.25],
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      iron,
      [anchor[0], 0.02, anchor[2]],
      [anchor[0] + side * 0.5, 0.25, anchor[2] + side * 0.15],
      0.08,
      6,
    );
    builder.cylinder("metal", iron, {
      radius: 0.1,
      radiusEnd: 0.01,
      length: 0.2,
      at: [anchor[0] + side * 0.55, 0.32, anchor[2] + side * 0.16],
      segments: 4,
    });
  });
  const rocks: [number, number, number][] = [
    [-6.2, -5.6, 0.7],
    [5.8, -5.6, 0.55],
    [6.9, -4.3, 0.4],
    [-5.3, -6.4, 0.45],
  ];
  rocks.forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? rock : shade(rock, 0.85),
      size,
      [x, size * 0.25, z],
      [1.3, 0.75, 1],
      9,
    );
    if (!builder.isFar) {
      builder.sphere(
        "matte",
        weed,
        size * 0.55,
        [x + size * 0.3, size * 0.55, z + size * 0.2],
        [1.2, 0.4, 1],
        6,
      );
    }
  });
  if (builder.isFar) {
    return;
  }
  const shells: Triple[] = [
    [-1.6, 0.03, 6.2],
    [1.4, 0.03, 5.4],
    [-5.6, 0.03, 2.4],
    [5.6, 0.03, 3.4],
  ];
  shells.forEach((at, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#efd2c2" : "#f4ebdc",
      0.08,
      at,
      [1, 0.5, 1.2],
      6,
    );
  });
  [
    [-2.6, 5.4],
    [4.6, 4.8],
  ].forEach(([x, z]) => {
    for (let arm = 0; arm < 5; arm++) {
      const angle = (arm / 5) * Math.PI * 2;
      builder.bar(
        "matte",
        "#e0703a",
        [x, 0.04, z],
        [x + Math.sin(angle) * 0.18, 0.03, z + Math.cos(angle) * 0.18],
        0.06,
        4,
      );
    }
  });
  builder.bar(
    "matte",
    "#a08c70",
    [-5.4, 0.08, 4.6],
    [-3.9, 0.08, 6.1],
    0.14,
    6,
  );
  for (let clump = 0; clump < 6; clump++) {
    const x = -6 + clump * 2.3;
    const z = -waterLine + 0.5 + hash(clump, 21) * 0.5;
    builder.bar(
      "matte",
      weedDark,
      [x, 0.03, z],
      [x + 0.6, 0.03, z + 0.25],
      0.07,
      4,
    );
  }
};

const segmentShape = (from: number, radius: number): Shape => {
  const angle = Math.asin(from / radius);
  const shape = new Shape();
  shape.moveTo(-radius * Math.cos(angle), from);
  shape.absarc(0, 0, radius, Math.PI - angle, angle, true);
  shape.lineTo(-radius * Math.cos(angle), from);
  return shape;
};

const buildSandMounds = (builder: AttractionBuilder) => {
  const mounds: [number, number, number, number][] = [
    [-2.4, -4.6, 1.3, 0.9],
    [-2.6, -2.0, 1.4, 1.1],
    [-2.2, 0.6, 1.2, 0.9],
    [-1.4, 2.6, 0.9, 0.7],
    [1.3, -5.2, 0.9, 0.8],
    [1.6, -0.2, 0.9, 1.1],
    [0.9, 2.4, 0.8, 0.7],
  ];
  mounds.forEach(([x, z, along, across], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? sand : shade(sand, 0.96),
      1,
      [x, 0, z],
      [across, 0.2, along * 1.6],
      builder.isFar ? 8 : 14,
    );
  });
};

const buildBeach = (builder: AttractionBuilder) => {
  const curve = builder.segments(24, 10);
  builder.add(
    "matte",
    wetSand,
    new ShapeGeometry(segmentShape(waterLine - 1.4, footprint - 0.02), curve),
    {
      at: [0, 0.025, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
  );
  builder.add(
    "water",
    shallowSea,
    new ShapeGeometry(segmentShape(waterLine, footprint + 0.15), curve),
    {
      at: [0, 0.06, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
  );
  if (builder.isFar) {
    return;
  }
  const edge = Math.sqrt(footprint ** 2 - waterLine ** 2);
  for (let puff = 0; puff < 9; puff++) {
    const x = -edge + ((puff + 0.5) / 9) * edge * 2;
    builder.sphere(
      "matte",
      foam,
      0.4,
      [x, 0.06, -waterLine + 0.05],
      [1.9, 0.08, 0.35],
      8,
    );
  }
  addSignBoard(builder, [3.2, 0, 7.2], "#2d5f7a");
};

const buildCrab = (builder: AttractionBuilder) => {
  const shell = "#d4552f";
  builder.sphere("paint", shell, 0.13, [0, 0.09, 0], [1.2, 0.5, 0.9], 10);
  [-1, 1].forEach((side) => {
    for (let leg = 0; leg < 3; leg++) {
      const z = -0.07 + leg * 0.06;
      builder.bar(
        "paint",
        shade(shell, 0.85),
        [side * 0.12, 0.08, z],
        [side * 0.24, 0.01, z - 0.02],
        0.025,
        4,
      );
    }
    builder.bar(
      "paint",
      shell,
      [side * 0.1, 0.09, 0.08],
      [side * 0.15, 0.12, 0.2],
      0.035,
      4,
    );
    builder.sphere(
      "paint",
      shell,
      0.05,
      [side * 0.16, 0.13, 0.23],
      [1, 0.7, 1.2],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.04, 0.17, 0.09],
      [1, 1, 1],
      4,
    );
  });
};

const hullBlockers: LocalBlocker[] = Array.from({ length: 11 }, (_, index) => {
  const z = sternZ + 0.5 + index * 0.82;
  return { x: hullX - 0.3, z, radius: findHalfWidth(z) + 0.3 };
});

export const shipwreckModel: AttractionModel = {
  kind: "shipwreck",
  name: "Shipwreck",
  fact: "The Mary Rose was King Henry VIII's warship. It sank near Portsmouth in 1545, and in 1982 divers lifted what was left of it from the seabed. Soft mud had kept half of its wooden hull and thousands of Tudor objects safe, so we can learn how the sailors lived.",
  curriculumLink:
    "History, Key Stage 2: a study of British history beyond 1066. The Tudors and the Mary Rose.",
  footprint,
  setting: "shore",
  padColour: sand,
  seaSamples: [
    { x: -4, z: -10.6 },
    { x: 0, z: -11 },
    { x: 4, z: -10.6 },
  ],
  landSamples: [
    { x: 0, z: 0 },
    ...listRingPoints(6.5, 12).filter((point) => point.z > -4.5),
  ],
  signSpot: { x: 3.2, z: 7.9 },
  build: (builder) => {
    buildBeach(builder);
    buildHull(builder);
    buildSandMounds(builder);
    buildDeckAndCastle(builder);
    buildRibs(builder);
    buildRig(builder);
    buildCrust(builder);
    buildTreasure(builder);
    buildProps(builder);
  },
  wanderers: [
    {
      name: "crabs",
      build: buildCrab,
      count: 3,
      centre: { x: -4.4, z: 4.2 },
      radius: 1.4,
      speed: 0.35,
    },
  ],
  blockers: [
    ...hullBlockers,
    { x: chestAt[0], z: chestAt[2], radius: 0.5 },
    { x: 3.7, z: -0.5, radius: 0.55 },
    { x: 4.6, z: 0.8, radius: 0.4 },
    { x: 2.5, z: -5, radius: 0.4 },
    { x: -3.3, z: -5, radius: 0.45 },
    { x: -2.9, z: -5, radius: 0.4 },
    { x: -3.6, z: 0.8, radius: 0.6 },
    { x: -2.6, z: -2.7, radius: 0.35 },
    { x: -3.6, z: -3.4, radius: 0.35 },
    { x: -4.6, z: -4.2, radius: 0.35 },
    { x: -6.2, z: -5.6, radius: 0.85 },
    { x: 5.8, z: -5.6, radius: 0.7 },
    { x: 6.9, z: -4.3, radius: 0.5 },
  ],
};
