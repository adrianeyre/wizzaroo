import { ConeGeometry, ExtrudeGeometry, Shape } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const sandstone = "#d8b47a";
const paleStone = "#ecdcb8";
const dialFace = "#efe4c8";
const bronze = "#a8743a";
const darkBronze = "#7a4f24";
const shadowColour = "#3a3026";
const gold = "#e8b93a";
const signColour = "#b5462f";

const centre = { x: 0, z: -0.6 };
/** The plinth's round steps, from the bottom up: [radius, top height]. */
const steps: [number, number][] = [
  [1.5, 0.2],
  [1.2, 0.4],
  [0.95, 0.6],
];
const dialHeight = 1.25;
const dialRadius = 0.78;
const dialAt: Triple = [centre.x, dialHeight, centre.z];
/** The gnomon's sloping edge rises towards the north (local -z) at the latitude, about 30° in Egypt. */
const latitude = (30 * Math.PI) / 180;
const pillarRing = 3.2;
const pillarAngles = [-2.18, -1.22, Math.PI, 1.22, 2.18];
const pillarHeight = 1.9;
const sunPillar = { x: centre.x, z: centre.z - pillarRing };
const sunAt: Triple = [sunPillar.x, pillarHeight + 0.75, sunPillar.z + 0.05];
const stick = { x: -1.95, z: 2.0 };

const buildPlinth = (builder: AttractionBuilder) => {
  const segments = builder.segments(36, 14);
  steps.forEach(([radius, height], index) => {
    const tread = index === 0 ? height : height - steps[index - 1][1];
    builder.cylinder(
      "matte",
      index % 2 === 0 ? sandstone : shade(sandstone, 1.06),
      {
        radius,
        length: tread,
        at: [centre.x, height - tread / 2, centre.z],
        segments,
      },
    );
    if (!builder.isFar) {
      builder.cylinder("matte", shade(sandstone, 1.14), {
        radius: radius + 0.02,
        length: 0.04,
        at: [centre.x, height - 0.02, centre.z],
        segments,
        isOpen: true,
      });
    }
  });
  /* The pedestal: a turned stone column with a broad cap */
  builder.lathe(
    "matte",
    paleStone,
    [
      [0, 0.6],
      [0.42, 0.6],
      [0.42, 0.68],
      [0.32, 0.74],
      [0.26, 0.85],
      [0.22, 1.0],
      [0.24, 1.08],
      [0.36, 1.13],
      [0.5, 1.17],
      [0.5, 1.2],
      [0, 1.2],
    ],
    [centre.x, 0, centre.z],
    "y",
    builder.segments(22, 8),
  );
  builder.cylinder("matte", dialFace, {
    radius: dialRadius,
    length: 0.08,
    at: [centre.x, dialHeight - 0.04, centre.z],
    segments: builder.segments(40, 12),
  });
};

const buildDial = (builder: AttractionBuilder) => {
  /* The bronze gnomon: a triangle whose sloping edge points at the Pole Star */
  const southEnd = 0.32;
  const northEnd = -0.62;
  const rise = (southEnd - northEnd) * Math.tan(latitude);
  const gnomon = new Shape();
  gnomon.moveTo(-(centre.z + southEnd), dialHeight);
  gnomon.lineTo(-(centre.z + northEnd), dialHeight);
  gnomon.lineTo(-(centre.z + northEnd), dialHeight + rise);
  gnomon.closePath();
  builder.sidePlate(
    "metal",
    bronze,
    gnomon,
    centre.x,
    0.05,
    builder.isFar ? 0 : 0.01,
  );
  if (builder.isFar) {
    return;
  }
  /* A bronze rim, hour lines fanning out, and marks for the hours */
  builder.cylinder("metal", bronze, {
    radius: dialRadius + 0.01,
    length: 0.1,
    at: [centre.x, dialHeight - 0.03, centre.z],
    segments: 40,
    isOpen: true,
  });
  for (let hour = 0; hour <= 12; hour++) {
    /* 6 am to 6 pm round the north side of the dial */
    const angle = -Math.PI / 2 + (hour / 12) * Math.PI;
    const reach = 0.62;
    const outX = Math.sin(angle);
    const outZ = -Math.cos(angle);
    builder.box(
      "matte",
      darkBronze,
      [0.012, 0.01, reach - 0.18],
      [
        centre.x + outX * (0.18 + (reach - 0.18) / 2),
        dialHeight + 0.005,
        centre.z + outZ * (0.18 + (reach - 0.18) / 2),
      ],
      [0, Math.atan2(outX, outZ), 0],
    );
    builder.box(
      "paint",
      hour % 3 === 0 ? bronze : darkBronze,
      hour % 3 === 0 ? [0.03, 0.012, 0.08] : [0.02, 0.012, 0.05],
      [centre.x + outX * 0.7, dialHeight + 0.006, centre.z + outZ * 0.7],
      [0, Math.atan2(outX, outZ), 0],
    );
  }
  /* A little sun engraved at the south edge, and a compass N to the north */
  builder.cylinder("paint", gold, {
    radius: 0.07,
    length: 0.012,
    at: [centre.x, dialHeight + 0.006, centre.z + 0.55],
    segments: 14,
  });
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    builder.box(
      "paint",
      gold,
      [0.012, 0.012, 0.05],
      [
        centre.x + Math.sin(angle) * 0.11,
        dialHeight + 0.006,
        centre.z + 0.55 + Math.cos(angle) * 0.11,
      ],
      [0, angle, 0],
    );
  }
  builder.box(
    "paint",
    darkBronze,
    [0.015, 0.012, 0.09],
    [centre.x - 0.03, dialHeight + 0.006, centre.z - 0.7],
  );
  builder.box(
    "paint",
    darkBronze,
    [0.015, 0.012, 0.09],
    [centre.x + 0.03, dialHeight + 0.006, centre.z - 0.7],
  );
  builder.box(
    "paint",
    darkBronze,
    [0.015, 0.012, 0.1],
    [centre.x, dialHeight + 0.006, centre.z - 0.7],
    [0, 0.55, 0],
  );
};

/** The gnomon's shadow: a dark wedge lying on the dial, turning with the sun. */
const buildShadow = (builder: AttractionBuilder) => {
  const wedge = new Shape();
  wedge.moveTo(-0.035, 0);
  wedge.lineTo(0.035, 0);
  wedge.lineTo(0.01, -0.62);
  wedge.lineTo(-0.01, -0.62);
  wedge.closePath();
  builder.add(
    "matte",
    shadowColour,
    new ExtrudeGeometry(wedge, { depth: 0.008, bevelEnabled: false }).rotateX(
      Math.PI / 2,
    ),
    { at: [0, 0.012, 0] },
    undefined,
  );
};

/** The hour marks glow gold when someone comes to read the dial. */
const buildHourGlow = (builder: AttractionBuilder) => {
  for (let hour = 0; hour <= 12; hour++) {
    const angle = -Math.PI / 2 + (hour / 12) * Math.PI;
    builder.sphere(
      "glow",
      "#ffd36a",
      hour % 3 === 0 ? 0.035 : 0.025,
      [Math.sin(angle) * 0.7, 0.015, -Math.cos(angle) * 0.7],
      [1, 0.4, 1],
      6,
    );
  }
};

const buildPillar = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.box(
    "matte",
    shade(sandstone, 0.92),
    [0.62, 0.16, 0.62],
    [x, 0.08, z],
  );
  if (builder.isFar) {
    builder.cylinder("matte", sandstone, {
      radius: 0.23,
      radiusEnd: 0.2,
      length: height,
      at: [x, height / 2, z],
      segments: 5,
    });
    builder.box("matte", sandstone, [0.62, 0.12, 0.62], [x, height, z]);
    return;
  }
  const segments = 14;
  builder.lathe(
    "matte",
    sandstone,
    [
      [0, 0.16],
      [0.26, 0.16],
      [0.26, 0.24],
      [0.21, 0.3],
      [0.22, height * 0.5],
      [0.19, height - 0.24],
      [0.27, height - 0.12],
      [0.31, height - 0.06],
      [0, height - 0.06],
    ],
    [x, 0, z],
    "y",
    segments,
  );
  builder.box(
    "matte",
    shade(sandstone, 1.1),
    [0.62, 0.12, 0.62],
    [x, height, z],
  );
  /* Bands painted round the capital, as on Egyptian columns */
  [height - 0.32, height - 0.4].forEach((y, index) => {
    builder.cylinder("paint", index === 0 ? "#2a4f9a" : "#b5462f", {
      radius: 0.205,
      length: 0.05,
      at: [x, y, z],
      segments: 14,
      isOpen: true,
    });
  });
};

const buildPillars = (builder: AttractionBuilder) => {
  pillarAngles.forEach((angle) => {
    const x = centre.x + Math.sin(angle) * pillarRing;
    const z = centre.z + Math.cos(angle) * pillarRing;
    buildPillar(
      builder,
      x,
      z,
      angle === Math.PI ? pillarHeight + 0.35 : pillarHeight,
    );
  });
  /* Lintels join each pair of side pillars, with a painted frieze */
  [
    [pillarAngles[0], pillarAngles[1]],
    [pillarAngles[3], pillarAngles[4]],
  ].forEach(([first, second]) => {
    const from = {
      x: centre.x + Math.sin(first) * pillarRing,
      z: centre.z + Math.cos(first) * pillarRing,
    };
    const to = {
      x: centre.x + Math.sin(second) * pillarRing,
      z: centre.z + Math.cos(second) * pillarRing,
    };
    const length = Math.hypot(to.x - from.x, to.z - from.z) + 0.6;
    const turn = Math.atan2(to.x - from.x, to.z - from.z);
    const middle: Triple = [
      (from.x + to.x) / 2,
      pillarHeight + 0.2,
      (from.z + to.z) / 2,
    ];
    builder.box("matte", paleStone, [0.5, 0.28, length], middle, [0, turn, 0]);
    if (builder.isFar) {
      return;
    }
    builder.box(
      "matte",
      shade(paleStone, 1.06),
      [0.6, 0.07, length + 0.1],
      [middle[0], middle[1] + 0.17, middle[2]],
      [0, turn, 0],
    );
    const inward = { x: centre.x - middle[0], z: centre.z - middle[2] };
    const inwardLength = Math.hypot(inward.x, inward.z);
    for (let tile = 0; tile < 7; tile++) {
      const along = (tile - 3) * 0.28;
      builder.box(
        "paint",
        tile % 2 === 0 ? "#2a4f9a" : gold,
        [0.02, 0.14, 0.16],
        [
          middle[0] +
            Math.sin(turn) * along +
            (inward.x / inwardLength) * 0.255,
          middle[1],
          middle[2] +
            Math.cos(turn) * along +
            (inward.z / inwardLength) * 0.255,
        ],
        [0, turn, 0],
      );
    }
  });
  if (builder.isFar) {
    builder.cylinder("paint", gold, {
      radius: 0.42,
      length: 0.08,
      at: sunAt,
      axis: "z",
      segments: 8,
    });
  }
};

/** The golden sun on the tallest pillar, its rays turning faster as visitors come. */
const buildSun = (builder: AttractionBuilder) => {
  builder.cylinder("paint", gold, {
    radius: 0.26,
    length: 0.1,
    at: [0, 0, 0],
    axis: "z",
    segments: 20,
  });
  builder.sphere(
    "paint",
    shade(gold, 1.1),
    0.18,
    [0, 0, 0.04],
    [1, 1, 0.45],
    12,
  );
  for (let ray = 0; ray < 12; ray++) {
    const angle = (ray / 12) * Math.PI * 2;
    const length = ray % 2 === 0 ? 0.24 : 0.16;
    builder.add(
      "paint",
      ray % 2 === 0 ? gold : "#f2a33a",
      new ConeGeometry(0.06, length, 4),
      {
        at: [
          Math.sin(angle) * (0.26 + length / 2),
          Math.cos(angle) * (0.26 + length / 2),
          0,
        ],
        rotation: [0, 0, -angle],
      },
    );
  }
  /* A smiling face */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      darkBronze,
      0.025,
      [side * 0.07, 0.04, 0.12],
      [1, 1, 0.5],
      6,
    );
  });
  builder.box("paint", darkBronze, [0.1, 0.02, 0.02], [0, -0.06, 0.12]);
};

const buildShadowStick = (builder: AttractionBuilder) => {
  /* A stick in the sand, with pebbles marking where its shadow's tip fell each hour */
  builder.cylinder("matte", palette.timber, {
    radius: 0.035,
    length: 0.9,
    at: [stick.x, 0.45, stick.z],
    segments: builder.isFar ? 4 : 8,
  });
  if (builder.isFar) {
    return;
  }
  builder.sphere(
    "paint",
    "#c0392b",
    0.05,
    [stick.x, 0.92, stick.z],
    [1, 1, 1],
    8,
  );
  const tips = 7;
  for (let tip = 0; tip < tips; tip++) {
    const share = tip / (tips - 1);
    const angle = -1.2 + share * 2.4;
    const reach = 0.55 + 0.6 * Math.abs(share - 0.5) ** 1.5 * 2;
    const x = stick.x - Math.sin(angle) * reach;
    const z = stick.z - Math.cos(angle) * reach * 0.8;
    builder.sphere(
      "matte",
      tip === 3 ? "#f2f0ea" : shade(palette.stone, 1.1 - (tip % 2) * 0.12),
      0.06,
      [x, 0.03, z],
      [1.2, 0.6, 1],
      8,
    );
    if (tip % 3 === 0) {
      builder.bar(
        "matte",
        palette.darkTimber,
        [x + 0.08, 0, z],
        [x + 0.08, 0.3, z],
        0.015,
        4,
      );
      builder.box(
        "paint",
        tip === 3 ? "#2a4f9a" : "#e8b93a",
        [0.12, 0.08, 0.01],
        [x + 0.14, 0.26, z],
      );
    }
  }
  /* The shadow the stick is casting now */
  builder.box(
    "matte",
    shade(sand, 0.72),
    [0.06, 0.006, 0.6],
    [stick.x + 0.12, 0.004, stick.z - 0.28],
    [0, 0.4, 0],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* A paved path from the visitors' side up to the steps */
  builder.box(
    "matte",
    shade(sand, 0.93),
    [1.3, 0.025, 2.6],
    [centre.x, 0.012, centre.z + 3.0],
  );
  if (builder.isFar) {
    return;
  }
  for (let slab = 0; slab < 4; slab++) {
    builder.box(
      "matte",
      shade(paleStone, slab % 2 === 0 ? 1 : 0.94),
      [1.1, 0.04, 0.5],
      [centre.x, 0.02, centre.z + 1.95 + slab * 0.6],
    );
  }
  /* Potted date palms either side of the path */
  [-1, 1].forEach((side) => {
    const [x, z] = [centre.x + side * 1.05, centre.z + 3.4];
    builder.lathe(
      "matte",
      "#b8643a",
      [
        [0, 0],
        [0.2, 0],
        [0.3, 0.25],
        [0.32, 0.45],
        [0.36, 0.5],
        [0.28, 0.5],
      ],
      [x, 0, z],
      "y",
      12,
    );
    builder.cylinder("matte", palette.soil, {
      radius: 0.29,
      length: 0.02,
      at: [x, 0.47, z],
      segments: 12,
    });
    builder.cylinder("matte", "#8a6a48", {
      radius: 0.06,
      radiusEnd: 0.045,
      length: 0.7,
      at: [x, 0.8, z],
      segments: 6,
    });
    for (let frond = 0; frond < 7; frond++) {
      const angle = (frond / 7) * Math.PI * 2 + side;
      builder.add(
        "matte",
        frond % 2 === 0 ? "#4f8f3a" : "#3f7a30",
        new ConeGeometry(0.1, 0.75, 4)
          .rotateX(Math.PI / 2 + 0.5)
          .rotateY(angle),
        {
          at: [x + Math.sin(angle) * 0.3, 1.1, z + Math.cos(angle) * 0.3],
          scale: [1, 0.35, 1],
        },
      );
    }
  });
  /* Sand ripples and a few stones */
  [
    [2.4, 2.1, 0.4],
    [-2.6, -1.0, 1.0],
    [2.0, -3.0, 1.5],
  ].forEach(([x, z, turn]) => {
    [0, 0.25, 0.5].forEach((offset) => {
      builder.box(
        "matte",
        shade(sand, 1.06),
        [0.9, 0.025, 0.06],
        [x + Math.sin(turn) * offset, 0.012, z + Math.cos(turn) * offset],
        [0, turn + Math.PI / 2, 0],
      );
    });
  });
};

const stepDeck: Deck = ({ x, z }) => {
  const distance = Math.hypot(x - centre.x, z - centre.z);
  const step = steps.findLast(([radius]) => distance <= radius);
  return step === undefined ? undefined : { height: step[1], kind: "ground" };
};

export const sundialModel: CuriosityModel = {
  kind: "sundial",
  islandId: "sunscorch-sands",
  name: "Great Sundial",
  fact: "A sundial tells the time with a shadow. The sloping bronze edge, called a gnomon, blocks the sunlight, so it casts a shadow on the dial. As the Sun moves across the sky the shadow moves round, and it is shortest at midday when the Sun is highest. The Ancient Egyptians made some of the first shadow clocks.",
  curriculumLink:
    "Science, Year 3: recognise that shadows are formed when the light from a light source is blocked by an opaque object, and find patterns in the way that the size of shadows change.",
  footprint: 4.6,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 1.9, z: 3.7 },
  build: (builder) => {
    buildPlinth(builder);
    buildDial(builder);
    buildPillars(builder);
    buildShadowStick(builder);
    buildGrounds(builder);
    addSignBoard(builder, [1.9, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "shadow",
      pivot: dialAt,
      build: buildShadow,
      motion: { kind: "spin", axis: "y", speed: 0.12 },
    },
    {
      name: "hour marks",
      pivot: dialAt,
      build: buildHourGlow,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "sun",
      pivot: sunAt,
      build: buildSun,
      motion: { kind: "whirl", axis: "z", idle: 0.15, speed: 1.4, reach: 7 },
    },
  ],
  decks: [stepDeck],
  blockers: [
    { x: centre.x, z: centre.z, radius: 0.5 },
    ...pillarAngles.map((angle) => ({
      x: centre.x + Math.sin(angle) * pillarRing,
      z: centre.z + Math.cos(angle) * pillarRing,
      radius: 0.4,
    })),
    { x: stick.x, z: stick.z, radius: 0.12 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Read the shadow",
    news: "The gnomon's shadow points to three o'clock! It is getting longer, because the Sun is sinking lower in the sky.",
  },
};
