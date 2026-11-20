import { ConeGeometry, Shape, ShapeGeometry } from "three";
import {
  AttractionBuilder,
  addBench,
  addBush,
  addSignBoard,
  addTree,
  palette,
  shade,
  type Deck,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addFlowerClump,
  buildVillager,
  meadowColours,
} from "./village-fete-parts.js";

/*
 * A round green hill where the wind always blows: a mown path winding
 * up to a stone toposcope and a bench on the top, a windsock, kites of
 * every shape tugging on their strings, a rabbit warren, and a little
 * striped kite stall with pinwheels at the bottom. Roll down the hill,
 * or let the big gust lift you off the top.
 */

const hillGreen = "#78b24c";
const hillShade = "#6aa443";
const mownPath = "#a6cf72";
const stallStripe = "#2f8fd0";
const kiteRed = "#e0402c";
const kiteYellow = "#f6c832";
const kiteBlue = "#3a6fd8";
const kitePink = "#ef6f9a";
const stringWhite = "#f4f1ea";
const signColour = "#2f8fd0";

/* The hill */

const hill = { x: 0, z: -1.0, top: 1.8, flat: 1.3, foot: 5.8 };

const findHillHeight = (radius: number): number => {
  if (radius <= hill.flat) {
    return hill.top;
  }
  if (radius >= hill.foot) {
    return 0;
  }
  const share = (radius - hill.flat) / (hill.foot - hill.flat);
  return hill.top * (0.5 + 0.5 * Math.cos(share * Math.PI));
};

const hillRadiusOf = (x: number, z: number): number =>
  Math.hypot(x - hill.x, z - hill.z);

const onHill = (angle: number, radius: number): Triple => [
  hill.x + Math.sin(angle) * radius,
  findHillHeight(radius),
  hill.z + Math.cos(angle) * radius,
];

const hillDeck: Deck = ({ x, z }) => {
  const radius = hillRadiusOf(x, z);
  return radius < hill.foot
    ? { height: findHillHeight(radius), kind: "ground" }
    : undefined;
};

const buildHill = (builder: AttractionBuilder) => {
  const rings = builder.isFar ? 6 : 14;
  const profile: [number, number][] = [[0, hill.top]];
  for (let ring = 0; ring <= rings; ring++) {
    const radius = hill.flat + ((hill.foot - hill.flat) * ring) / rings;
    profile.push([radius, findHillHeight(radius)]);
  }
  profile.push([hill.foot + 0.05, -0.02]);
  builder.lathe(
    "matte",
    hillGreen,
    profile.map(([radius, height]) => [radius, height] as const).toReversed(),
    [hill.x, 0, hill.z],
    "y",
    builder.segments(36, 18),
  );
  if (builder.isFar) {
    return;
  }
  /* A mown path spiralling up from the front to the top */
  const pieces = 30;
  for (let piece = 0; piece < pieces; piece++) {
    const from = spiralAt(piece / pieces);
    const to = spiralAt((piece + 1) / pieces);
    const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
    const pitch = Math.atan2(from[1] - to[1], length);
    builder.box(
      "matte",
      mownPath,
      [1.1, 0.03, length + 0.08],
      [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2 + 0.03,
        (from[2] + to[2]) / 2,
      ],
      [pitch, turn, 0],
    );
  }
  /* Tufts and daisies dotted over the slopes */
  for (let tuft = 0; tuft < 30; tuft++) {
    const angle = tuft * 2.39996;
    const radius = 1.6 + ((tuft * 0.37) % 1) * 3.8;
    const [x, y, z] = onHill(angle, radius);
    if (tuft % 3 === 0) {
      builder.sphere(
        "matte",
        palette.white,
        0.05,
        [x, y + 0.04, z],
        [1, 0.5, 1],
        5,
      );
      builder.sphere(
        "matte",
        meadowColours.butter,
        0.025,
        [x, y + 0.07, z],
        [1, 0.6, 1],
        4,
      );
    } else {
      builder.add(
        "matte",
        tuft % 2 === 0 ? hillShade : shade(hillGreen, 1.1),
        new ConeGeometry(0.12, 0.26, 4),
        { at: [x, y + 0.1, z] },
      );
    }
  }
};

/** The mown path's middle, from the foot (0) to the top (1). */
const spiralAt = (share: number): Triple => {
  const radius = hill.foot + 0.3 - (hill.foot + 0.3 - hill.flat + 0.4) * share;
  return onHill(0.35 + share * Math.PI * 1.5, radius);
};

/* The top of the hill */

const buildTop = (builder: AttractionBuilder) => {
  const { x, z, top } = hill;
  /* A stone toposcope: a pillar with a brass dial pointing the way to places */
  builder.cylinder("matte", palette.stone, {
    radius: 0.32,
    radiusEnd: 0.26,
    length: 0.85,
    at: [x, top + 0.42, z],
    segments: 12,
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.36,
    length: 0.05,
    at: [x, top + 0.87, z],
    segments: 16,
  });
  if (!builder.isFar) {
    /* The compass points on the dial */
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach((angle) => {
      builder.add(
        "metal",
        shade(palette.brass, 0.7),
        new ConeGeometry(0.05, 0.28, 3).rotateX(Math.PI / 2).rotateY(angle),
        {
          at: [
            x + Math.sin(angle) * 0.18,
            top + 0.9,
            z + Math.cos(angle) * 0.18,
          ],
        },
        undefined,
      );
    });
    builder.sphere(
      "metal",
      palette.brass,
      0.05,
      [x, top + 0.93, z],
      [1, 1, 1],
      8,
    );
  }
  /* The windsock's pole */
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 2.6,
    at: [windsockAt[0], hill.top + 1.3, windsockAt[2]],
    segments: 8,
  });
  /* A bench on top, looking out over the island */
  addBench(builder, [x, top, z - 1.15], Math.PI, palette.paleTimber);
};

/* Kites */

interface Kite {
  stake: Triple;
  /** Where the kite flies, from its stake. */
  reach: Triple;
  phase: number;
}

const kites: readonly Kite[] = [
  { stake: onHill(1.0, 3.2), reach: [1.8, 4.6, -2.2], phase: 0 },
  { stake: onHill(-0.9, 3.0), reach: [-1.6, 4.2, -2.6], phase: 1.7 },
  { stake: onHill(2.7, 2.6), reach: [0.9, 5.0, -2.0], phase: 3.1 },
];

const addString = (builder: AttractionBuilder, reach: Triple) => {
  builder.bar("matte", stringWhite, [0, 0.7, 0], reach, 0.018, 3);
};

const addTail = (
  builder: AttractionBuilder,
  from: Triple,
  colours: readonly string[],
) => {
  const bows = builder.isFar ? 0 : 5;
  let last = from;
  for (let bow = 1; bow <= bows; bow++) {
    const next: Triple = [
      from[0] + Math.sin(bow * 1.1) * 0.12,
      from[1] - bow * 0.28,
      from[2] + bow * 0.08,
    ];
    builder.bar("matte", stringWhite, last, next, 0.015, 3);
    builder.box(
      "matte",
      colours[bow % colours.length],
      [0.16, 0.08, 0.02],
      next,
      [0, 0, bow * 0.4],
    );
    last = next;
  }
};

const buildDiamondKite =
  (reach: Triple, colours: readonly string[]) =>
  (builder: AttractionBuilder) => {
    addString(builder, reach);
    const [x, y, z] = reach;
    const shape = new Shape();
    shape.moveTo(0, 0.55);
    shape.lineTo(0.38, 0.1);
    shape.lineTo(0, -0.6);
    shape.lineTo(-0.38, 0.1);
    shape.closePath();
    [0.012, -0.012].forEach((offset, face) => {
      builder.add(
        "paint",
        colours[0],
        new ShapeGeometry(shape)
          .rotateY(face === 0 ? 0 : Math.PI)
          .rotateX(-0.5),
        { at: [x, y, z + offset] },
        undefined,
      );
    });
    /* A second colour on the upper half, and the spars */
    const top = new Shape();
    top.moveTo(0, 0.55);
    top.lineTo(0.38, 0.1);
    top.lineTo(-0.38, 0.1);
    top.closePath();
    builder.add(
      "paint",
      colours[1],
      new ShapeGeometry(top).rotateX(-0.5),
      { at: [x, y, z + 0.02] },
      undefined,
    );
    builder.bar(
      "matte",
      palette.darkTimber,
      [x, y + 0.48, z + 0.25],
      [x, y - 0.52, z - 0.26],
      0.025,
      4,
    );
    addTail(builder, [x, y - 0.55, z - 0.27], colours);
  };

const buildBoxKite = (reach: Triple) => (builder: AttractionBuilder) => {
  addString(builder, reach);
  const [x, y, z] = reach;
  [0.3, -0.3].forEach((dy, cell) => {
    builder.box(
      "paint",
      cell === 0 ? kiteBlue : kiteYellow,
      [0.5, 0.26, 0.5],
      [x, y + dy, z],
      [0, 0.5, 0.3],
    );
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x + side * 0.22, y - 0.5, z],
      [x + side * 0.22, y + 0.5, z],
      0.025,
      4,
    );
  });
};

const buildBirdKite = (reach: Triple) => (builder: AttractionBuilder) => {
  addString(builder, reach);
  const [x, y, z] = reach;
  /* A swallow kite: two swept wings, a body and a forked tail */
  [-1, 1].forEach((side) => {
    builder.add(
      "paint",
      side < 0 ? kitePink : shade(kitePink, 0.85),
      new ConeGeometry(0.22, 1.0, 3)
        .rotateZ(side * (Math.PI / 2 + 0.25))
        .scale(1, 1, 0.1),
      { at: [x + side * 0.5, y + 0.05, z] },
      undefined,
    );
    builder.add(
      "paint",
      palette.white,
      new ConeGeometry(0.06, 0.5, 3).rotateZ(side * 0.3).scale(1, 1, 0.2),
      { at: [x + side * 0.08, y - 0.5, z] },
      undefined,
    );
  });
  builder.sphere("paint", palette.slate, 0.12, [x, y, z], [0.8, 1.6, 0.6], 8);
  builder.sphere(
    "paint",
    palette.white,
    0.07,
    [x, y + 0.22, z + 0.03],
    [1, 1, 1],
    6,
  );
};

const kiteBuilders = [
  buildDiamondKite(kites[0].reach, [kiteRed, kiteYellow]),
  buildBoxKite(kites[1].reach),
  buildBirdKite(kites[2].reach),
];

/** A villager holding the line at each kite's stake. */
const buildFlyers = (builder: AttractionBuilder) => {
  const looks = [
    buildVillager({
      top: kiteRed,
      legs: meadowColours.navy,
      hair: "#6a4426",
      size: 0.75,
    }),
    buildVillager({
      top: meadowColours.butter,
      legs: meadowColours.sky,
      hair: "#2a1d14",
      isDress: true,
    }),
    buildVillager({
      top: meadowColours.leaf,
      legs: palette.darkTimber,
      hair: "#c9a24a",
      size: 0.72,
    }),
  ];
  kites.forEach(({ stake, reach }, index) => {
    const turn = Math.atan2(reach[0], reach[2]);
    const [sx, sy, sz] = stake;
    /* Each stands a step behind the stake, facing the kite */
    const at: Triple = [
      sx - Math.sin(turn) * 0.45,
      sy,
      sz - Math.cos(turn) * 0.45,
    ];
    const inner = new AttractionBuilder(builder.attractionDetail);
    looks[index](inner);
    builder.addPainted("matte", placeBuilt(inner, at, turn));
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.03,
      length: 0.5,
      at: [sx, sy + 0.25, sz],
      segments: 6,
    });
  });
};

/** Moves a built figure into place, keeping its colours, as one matte part. */
const placeBuilt = (inner: AttractionBuilder, at: Triple, turn: number) => {
  const geometry = inner.build();
  geometry.clearGroups();
  geometry.rotateY(turn);
  geometry.translate(at[0], at[1], at[2]);
  return geometry;
};

/* The windsock, the rabbit and the pinwheels */

const windsockAt: Triple = [hill.x + 0.56, hill.top + 2.5, hill.z + 0.83];

const buildWindsock = (builder: AttractionBuilder) => {
  builder.torus("metal", palette.steel, 0.18, 0.02, [0, 0, 0.12], "z", 12);
  const bands = [kiteRed, palette.white, kiteRed, palette.white, kiteRed];
  bands.forEach((colour, band) => {
    builder.cylinder("matte", colour, {
      radius: 0.18 - band * 0.022,
      radiusEnd: 0.18 - (band + 1) * 0.022,
      length: 0.24,
      at: [0, -0.02 * band, -0.12 - band * 0.24],
      axis: "z",
      segments: 10,
      isOpen: true,
    });
  });
  builder.sphere("metal", palette.brass, 0.05, [0, 0, 0], [1, 1, 1], 6);
};

const warrenAt = onHill(-2.4, 4.4);
const rabbitAt: Triple = [warrenAt[0], warrenAt[1] - 0.32, warrenAt[2] + 0.2];

const buildWarren = (builder: AttractionBuilder) => {
  const [x, y, z] = warrenAt;
  builder.sphere("matte", "#8a6a48", 0.42, [x, y, z], [1.2, 0.4, 1], 10);
  builder.sphere(
    "matte",
    palette.black,
    0.18,
    [x, y + 0.08, z + 0.32],
    [1.1, 0.8, 0.5],
    8,
  );
};

const buildRabbit = (builder: AttractionBuilder) => {
  const fur = "#a68a6a";
  builder.sphere("matte", fur, 0.14, [0, 0.14, 0], [0.9, 0.9, 1.1], 10);
  builder.sphere("matte", fur, 0.09, [0, 0.3, 0.08], [1, 1, 1.1], 8);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      fur,
      0.035,
      [side * 0.035, 0.46, 0.05],
      [0.8, 2.6, 0.5],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.015,
      [side * 0.045, 0.33, 0.16],
      [1, 1, 1],
      4,
    );
  });
  builder.sphere("matte", palette.white, 0.05, [0, 0.14, -0.15], [1, 1, 1], 6);
};

/* The kite stall at the bottom */

const stallAt = { x: 4.8, z: 4.4, turn: -0.75 };

const buildStall = (builder: AttractionBuilder) => {
  const { x, z, turn } = stallAt;
  const place = (dx: number, dy: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    dy,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  builder.box(
    "paint",
    palette.white,
    [1.8, 0.9, 0.7],
    place(0, 0.45, 0),
    rotation,
  );
  builder.box(
    "paint",
    palette.paleTimber,
    [1.9, 0.06, 0.8],
    place(0, 0.92, 0),
    rotation,
  );
  [-0.85, 0.85].forEach((side) => {
    [-0.3, 0.3].forEach((depth) => {
      builder.box(
        "paint",
        palette.white,
        [0.06, 2.1, 0.06],
        place(side, 1.05, depth),
        rotation,
      );
    });
  });
  /* The striped awning */
  const stripes = builder.isFar ? 1 : 6;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      builder.isFar || stripe % 2 === 0 ? stallStripe : palette.white,
      [1.95 / stripes, 0.05, 1.1],
      place(-0.975 + (1.95 / stripes) * (stripe + 0.5), 2.15, 0.15),
      [-0.25, turn, 0],
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Scalloped edge, and kites for sale */
  for (let flap = 0; flap < 6; flap++) {
    builder.add(
      "matte",
      flap % 2 === 0 ? stallStripe : palette.white,
      new ConeGeometry(0.16, 0.18, 3).rotateX(Math.PI).scale(1, 1, 0.15),
      { at: place(-0.82 + flap * 0.33, 1.94, 0.68), rotation },
    );
  }
  [kiteRed, kiteYellow, kitePink].forEach((colour, index) => {
    builder.add(
      "paint",
      colour,
      new ConeGeometry(0.22, 0.6, 4).scale(1, 1, 0.08),
      { at: place(-0.5 + index * 0.5, 1.45, -0.3), rotation },
    );
  });
  /* Reels of string on the counter */
  [-0.5, 0.1].forEach((dx) => {
    builder.cylinder("paint", meadowColours.rose, {
      radius: 0.08,
      length: 0.1,
      at: place(dx, 1.0, 0.1),
      axis: "x",
      segments: 10,
    });
  });
};

const pinwheelAt: Triple = [
  stallAt.x + 0.85 * Math.cos(stallAt.turn) + 0.3 * Math.sin(stallAt.turn),
  2.5,
  stallAt.z - 0.85 * Math.sin(stallAt.turn) + 0.3 * Math.cos(stallAt.turn),
];

const buildPinwheel = (builder: AttractionBuilder) => {
  [kiteRed, kiteYellow, kiteBlue, kitePink].forEach((colour, blade) => {
    const angle = (blade / 4) * Math.PI * 2;
    builder.add(
      "paint",
      colour,
      new ConeGeometry(0.13, 0.36, 3).scale(1, 1, 0.12),
      {
        at: [Math.sin(angle) * 0.18, Math.cos(angle) * 0.18, 0],
        rotation: [0, 0, -angle],
      },
    );
  });
  builder.sphere("paint", palette.white, 0.05, [0, 0, 0.03], [1, 1, 1], 8);
};

/* The ground round the hill */

/** A dry-stone wall round the back of the hill, with a wooden stile. */
const wallRadius = 8.3;
const stileAngle = Math.PI;

const buildStoneWall = (builder: AttractionBuilder) => {
  const from = Math.PI * 0.62;
  const to = Math.PI * 1.38;
  const pieces = builder.isFar ? 8 : 22;
  for (let piece = 0; piece < pieces; piece++) {
    const middle = from + ((to - from) * (piece + 0.5)) / pieces;
    if (Math.abs(middle - stileAngle) < 0.06) {
      continue;
    }
    const length = (wallRadius * (to - from)) / pieces + 0.04;
    const x = Math.sin(middle) * wallRadius;
    const z = Math.cos(middle) * wallRadius;
    const height = 0.72 + ((piece * 7) % 3) * 0.04;
    builder.box(
      "matte",
      piece % 2 === 0 ? palette.stone : shade(palette.stone, 0.9),
      [length, height, 0.42],
      [x, height / 2, z],
      [0, middle + Math.PI / 2, 0],
    );
    if (!builder.isFar) {
      /* Coping stones set on edge along the top */
      for (let stone = 0; stone < 3; stone++) {
        const along = middle + ((stone - 1) * (to - from)) / pieces / 3;
        builder.box(
          "matte",
          shade(palette.darkStone, 1 + (stone % 2) * 0.12),
          [0.1, 0.16, 0.36],
          [
            Math.sin(along) * wallRadius,
            height + 0.07,
            Math.cos(along) * wallRadius,
          ],
          [0.25 * (stone - 1), along + Math.PI / 2, 0],
        );
      }
    }
  }
  /* The stile: two steps and a post over the gap */
  const x = Math.sin(stileAngle) * wallRadius;
  const z = Math.cos(stileAngle) * wallRadius;
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [0.9, 0.06, 0.25],
      [x, 0.32, z + side * 0.42],
    );
  });
  builder.box("matte", palette.paleTimber, [0.9, 0.06, 0.25], [x, 0.62, z]);
  [-0.4, 0.4].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.2, 0.08],
      [x + side, 0.6, z],
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  addTree(builder, [-6.4, 0, -3.4], 1.1);
  addTree(builder, [6.0, 0, -4.0], 1.0, "#4a9440");
  addBush(builder, [-6.8, 0, 2.6], 0.6);
  addBush(builder, [7.4, 0, 0.6], 0.5, "#3a7d34");
  buildStoneWall(builder);
  /* A picnic blanket at the foot */
  builder.box(
    "matte",
    meadowColours.rose,
    [1.5, 0.02, 1.2],
    [-4.6, 0.02, 5.2],
    [0, 0.4, 0],
  );
  if (!builder.isFar) {
    for (let stripe = 0; stripe < 4; stripe++) {
      builder.box(
        "matte",
        palette.white,
        [0.08, 0.025, 1.2],
        [-5.0 + stripe * 0.3, 0.025, 5.2 + stripe * 0.12],
        [0, 0.4, 0],
      );
    }
    builder.lathe(
      "matte",
      "#b98d4f",
      [
        [0, 0],
        [0.22, 0],
        [0.25, 0.25],
        [0, 0.25],
      ],
      [-4.3, 0.03, 5.0],
      "y",
      10,
    );
    [
      [-2.0, 6.2],
      [3.0, 7.0],
      [-7.0, -0.8],
      [6.6, 2.4],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, 0, z],
        index % 2 === 0
          ? [meadowColours.butter, palette.white]
          : [meadowColours.rose, meadowColours.cornflower],
        5,
        0.3,
      );
    });
  }
  addSignBoard(builder, [-2.8, 0, 7.6], signColour);
};

/* Wanderers */

const buildLamb = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    palette.white,
    0.22,
    [0, 0.38, 0],
    [0.9, 0.8, 1.2],
    10,
  );
  builder.sphere(
    "matte",
    palette.black,
    0.09,
    [0, 0.5, 0.25],
    [0.9, 1, 1.2],
    8,
  );
  [-1, 1].forEach((side) => {
    [-0.12, 0.12].forEach((end) => {
      builder.bar(
        "matte",
        palette.black,
        [side * 0.09, 0.25, end],
        [side * 0.09, 0, end],
        0.04,
        4,
      );
    });
  });
};

/* Rides */

const rollAngle = 2.0;
const rollStart = {
  x: onHill(rollAngle, 0.9)[0],
  z: onHill(rollAngle, 0.9)[2],
};
const rollFinish = {
  x: onHill(rollAngle, hill.foot + 0.9)[0],
  z: onHill(rollAngle, hill.foot + 0.9)[2],
};

const rollRide = (progress: number): LocalSpot => {
  const share = progress ** 1.5;
  const radius = 0.9 + (hill.foot + 0.9 - 0.9) * share;
  const [x, y, z] = onHill(rollAngle, radius);
  /* Lie down at the top, roll over and over, and stand up at the bottom */
  const isRolling = progress > 0.12 && progress < 0.9;
  return {
    x,
    y: y + (isRolling ? 0.12 + 0.1 * Math.abs(Math.sin(progress * 40)) : 0),
    z,
    heading: rollAngle + (isRolling ? progress * 40 : 0),
  };
};

const gustAngle = -1.3;
const gustStart = {
  x: onHill(gustAngle, 1.0)[0],
  z: onHill(gustAngle, 1.0)[2],
};
const gustFinish = {
  x: onHill(gustAngle - 0.6, hill.foot + 1.0)[0],
  z: onHill(gustAngle - 0.6, hill.foot + 1.0)[2],
};

const gustRide = (progress: number): LocalSpot => {
  /* Lifted off the top, round once in the wind, then drifting down */
  const angle = gustAngle + progress * (Math.PI * 2 - 0.6);
  const radius = 1.0 + hill.foot * progress;
  const lift =
    3.2 *
    Math.sin(Math.min(1, progress * 1.4) * Math.PI * 0.5) *
    (1 - progress ** 3);
  const x = hill.x + Math.sin(angle) * radius;
  const z = hill.z + Math.cos(angle) * radius;
  return {
    x,
    y: findHillHeight(radius) + lift,
    z,
    heading: angle + Math.PI / 2 + Math.sin(progress * 12) * 0.4,
  };
};

export const kiteHillModel: NewLandAttractionModel = {
  kind: "kite-hill",
  islandId: "meadow-isle",
  name: "Kite Hill",
  fact: "Wind is air on the move. You cannot see it, but you can see what it does: it bends the grass, turns windmills and lifts kites high into the sky. In the UK, autumn and spring are often the windiest seasons, which makes them the best times to fly a kite.",
  curriculumLink:
    "Science, Year 1: seasonal changes. Observe changes across the four seasons, and observe and describe the weather associated with the seasons, such as wind.",
  footprint: 9.6,
  setting: "inland",
  signSpot: { x: -2.8, z: 8.6 },
  build: (builder) => {
    buildGrounds(builder);
    buildHill(builder);
    buildTop(builder);
    buildWarren(builder);
    buildFlyers(builder);
    buildStall(builder);
  },
  moving: [
    ...kites.map((kite, index) => ({
      name: `kite-${String(index)}`,
      pivot: kite.stake,
      build: kiteBuilders[index],
      motion: {
        kind: "swing" as const,
        axis: "z" as const,
        amplitude: 0.1,
        period: 3.3 + index * 0.6,
        phase: kite.phase,
      },
    })),
    {
      name: "windsock",
      pivot: windsockAt,
      build: buildWindsock,
      motion: { kind: "whirl", axis: "y", idle: 0.2, speed: 2.6, reach: 5 },
    },
    {
      name: "rabbit",
      pivot: rabbitAt,
      build: buildRabbit,
      motion: { kind: "rise", reach: 3.5, height: 0.32, period: 1.2 },
    },
    {
      name: "pinwheel",
      pivot: pinwheelAt,
      build: buildPinwheel,
      motion: { kind: "whirl", axis: "z", idle: 0.8, speed: 8, reach: 4 },
    },
  ],
  wanderers: [
    {
      name: "lambs",
      build: buildLamb,
      count: 2,
      centre: { x: 5.8, z: -2.0 },
      radius: 1.4,
      speed: 0.3,
    },
  ],
  decks: [hillDeck],
  rides: [
    {
      id: "hill-roll",
      name: "the hill roll",
      start: rollStart,
      reach: 0.55,
      seconds: 6,
      finish: rollFinish,
      follow: rollRide,
    },
    {
      id: "big-gust",
      name: "the big gust",
      start: gustStart,
      reach: 0.5,
      seconds: 9,
      finish: gustFinish,
      follow: gustRide,
    },
  ],
  play: {
    label: "Fly a kite",
    news: "Up, up and away! The wind caught your kite and lifted it high over the hill, its tail of bows dancing in the breeze.",
  },
};
