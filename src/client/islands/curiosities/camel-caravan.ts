import { BoxGeometry, ConeGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalBlocker,
  type LocalSpot,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const camelCoat = "#c99a5c";
const signColour = "#b5462f";
const ropeColour = "#d8c49a";
const brass = "#d4a63c";

/** How big the camels are, so the Character (1.1 tall) can sit up top. */
const size = 0.82;
const lineZ = -0.9;

interface Camel {
  x: number;
  coat: string;
  blanket: string;
  trim: string;
  phase: number;
}

const camels: Camel[] = [
  { x: 2.35, coat: camelCoat, blanket: "#c0392b", trim: "#f2c14e", phase: 0 },
  {
    x: 0,
    coat: shade(camelCoat, 0.9),
    blanket: "#1f9e9a",
    trim: "#f28c38",
    phase: 1.9,
  },
  {
    x: -2.35,
    coat: shade(camelCoat, 1.08),
    blanket: "#e07b24",
    trim: "#2d5fa8",
    phase: 3.6,
  },
];

/** Where a camel's neck meets its head, in camel units before scaling. */
const neckTop: Triple = [1.38, 1.98, 0];
const seat: Triple = [-0.05, 2.2, 0];

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

/** A camel facing +x, its feet on the ground at `x` along the line. */
const buildCamel = (
  builder: AttractionBuilder,
  camel: Camel,
  isLead: boolean,
) => {
  const at = (x: number, y: number, z: number): Triple => [
    camel.x + x * size,
    y * size,
    lineZ + z * size,
  ];
  const far = builder.isFar;
  const coat = camel.coat;
  const belly = shade(coat, 1.12);
  /* Long legs with knobbly knees and wide padded feet */
  [-1, 1].forEach((end) => {
    [-1, 1].forEach((side) => {
      const hip = at(end * 0.55, 1.2, side * 0.22);
      const knee = at(end * 0.55 + (end > 0 ? 0.04 : -0.06), 0.62, side * 0.24);
      const foot = at(end * 0.55, 0.08, side * 0.24);
      if (far) {
        builder.box(
          "matte",
          coat,
          [0.14 * size, 1.15 * size, 0.14 * size],
          at(end * 0.55, 0.6, side * 0.23),
        );
        return;
      }
      builder.bar("matte", coat, hip, knee, 0.17 * size, 6);
      builder.bar("matte", shade(coat, 0.95), knee, foot, 0.12 * size, 6);
      builder.cylinder("matte", shade(coat, 0.75), {
        radius: 0.13 * size,
        radiusEnd: 0.1 * size,
        length: 0.08 * size,
        at: at(end * 0.55 + 0.04, 0.04, side * 0.24),
        segments: 7,
      });
    });
  });
  /* The body, the hump and the chest */
  builder.sphere(
    "matte",
    coat,
    1 * size,
    at(0, 1.42, 0),
    [0.95, 0.42, 0.4],
    far ? 8 : 12,
  );
  if (!far) {
    builder.sphere(
      "matte",
      shade(coat, 1.04),
      1 * size,
      at(-0.05, 1.78, 0),
      [0.45, 0.42, 0.32],
      10,
    );
  }
  /* The neck curving down and up to the head */
  const neck: Triple[] = [
    at(0.75, 1.55, 0),
    at(1.08, 1.45, 0),
    at(1.32, 1.65, 0),
    at(neckTop[0], neckTop[1], 0),
  ];
  if (far) {
    builder.bar("matte", coat, neck[0], neck[3], 0.26 * size, 4);
  }
  for (let piece = 0; !far && piece < neck.length - 1; piece++) {
    builder.bar(
      "matte",
      coat,
      neck[piece],
      neck[piece + 1],
      (0.3 - piece * 0.04) * size,
      8,
    );
  }
  if (far) {
    builder.sphere(
      "matte",
      coat,
      0.3 * size,
      at(neckTop[0] + 0.22, neckTop[1] + 0.06, 0),
      [1.2, 0.5, 0.5],
      6,
    );
    builder.box(
      "matte",
      camel.blanket,
      [0.9 * size, 0.5 * size, 0.85 * size],
      at(-0.05, 1.55, 0),
    );
    return;
  }
  builder.sphere(
    "matte",
    belly,
    0.55 * size,
    at(0.05, 1.22, 0),
    [1.4, 0.45, 0.6],
    10,
  );
  neck.slice(1, 2).forEach((joint) => {
    builder.sphere("matte", coat, 0.14 * size, joint, [1, 1, 1], 8);
  });
  /* A tufted tail */
  builder.bar(
    "matte",
    coat,
    at(-0.9, 1.5, 0),
    at(-1.0, 0.95, 0),
    0.06 * size,
    6,
  );
  builder.sphere(
    "matte",
    shade(coat, 0.6),
    0.07 * size,
    at(-1.0, 0.9, 0),
    [0.8, 1.6, 0.8],
    6,
  );
  /* The blanket draped over the back, edged and tasselled */
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      camel.blanket,
      new BoxGeometry(1.0 * size, 0.62 * size, 0.04 * size),
      { at: at(-0.05, 1.52, side * 0.37), rotation: [side * 0.22, 0, 0] },
      undefined,
    );
    builder.add(
      "paint",
      camel.trim,
      new BoxGeometry(1.04 * size, 0.07 * size, 0.05 * size),
      { at: at(-0.05, 1.23, side * 0.43), rotation: [side * 0.22, 0, 0] },
      undefined,
    );
    builder.add(
      "matte",
      shade(camel.blanket, 0.75),
      new BoxGeometry(1.0 * size, 0.05 * size, 0.05 * size),
      { at: at(-0.05, 1.52, side * 0.385), rotation: [side * 0.22, 0, 0] },
      undefined,
    );
    for (let tassel = 0; tassel < 4; tassel++) {
      builder.add(
        "paint",
        camel.trim,
        new ConeGeometry(0.035 * size, 0.12 * size, 5),
        {
          at: at(-0.45 + tassel * 0.3, 1.14, side * 0.45),
        },
      );
    }
    /* Packs and a water skin hanging each side */
    builder.sphere(
      "matte",
      side > 0 ? "#8a6a48" : "#e8dcc0",
      0.22 * size,
      at(-0.45, 1.35, side * 0.55),
      [0.9, 1.15, 0.6],
      8,
    );
    builder.bar(
      "matte",
      ropeColour,
      at(-0.45, 1.6, side * 0.5),
      at(-0.45, 1.85, side * 0.25),
      0.02 * size,
      4,
    );
  });
  /* The wooden saddle on the hump, with tall pommels */
  builder.box(
    "matte",
    "#8a5a35",
    [0.55 * size, 0.12 * size, 0.6 * size],
    at(seat[0], seat[1] - 0.1, 0),
  );
  [-0.28, 0.24].forEach((dx) => {
    builder.bar(
      "paint",
      "#6b3f22",
      at(seat[0] + dx, seat[1] - 0.05, 0),
      at(seat[0] + dx * 1.25, seat[1] + 0.32, 0),
      0.06 * size,
      8,
    );
    builder.sphere(
      "paint",
      brass,
      0.05 * size,
      at(seat[0] + dx * 1.25, seat[1] + 0.34, 0),
      [1, 1, 1],
      6,
    );
  });
  builder.box(
    "matte",
    camel.trim,
    [0.4 * size, 0.08 * size, 0.5 * size],
    at(seat[0], seat[1] + 0.01, 0),
  );
  /* A rolled carpet tied behind the saddle */
  builder.cylinder("matte", shade(camel.blanket, 1.15), {
    radius: 0.12 * size,
    length: 0.9 * size,
    at: at(-0.55, 1.95, 0),
    axis: "z",
    segments: 8,
  });
  [-0.25, 0.25].forEach((dz) => {
    builder.cylinder("matte", ropeColour, {
      radius: 0.125 * size,
      length: 0.03,
      at: at(-0.55, 1.95, dz),
      axis: "z",
      segments: 8,
      isOpen: true,
    });
  });
  if (isLead) {
    /* A little bell on the lead camel's chest */
    builder.sphere(
      "metal",
      brass,
      0.07 * size,
      at(0.85, 1.25, 0),
      [1, 1.1, 1],
      8,
    );
  }
};

/** A camel's head, facing +x, built about the top of its neck. */
const buildCamelHead = (builder: AttractionBuilder, camel: Camel) => {
  const at = (x: number, y: number, z: number): Triple => [
    x * size,
    y * size,
    z * size,
  ];
  builder.sphere(
    "matte",
    camel.coat,
    1 * size,
    at(0.2, 0.1, 0),
    [0.24, 0.17, 0.15],
    10,
  );
  builder.sphere(
    "matte",
    shade(camel.coat, 1.06),
    1 * size,
    at(0.45, 0.02, 0),
    [0.17, 0.12, 0.12],
    8,
  );
  /* Droopy lips, nostrils and sleepy eyes with long lashes */
  builder.sphere(
    "matte",
    shade(camel.coat, 0.85),
    0.1 * size,
    at(0.55, -0.08, 0),
    [1, 0.5, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      palette.black,
      0.02 * size,
      at(0.6, 0.04, side * 0.05),
      [1, 0.6, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.035 * size,
      at(0.18, 0.17, side * 0.12),
      [1, 0.7, 1],
      6,
    );
    builder.box(
      "matte",
      shade(camel.coat, 0.7),
      [0.09 * size, 0.02 * size, 0.03 * size],
      at(0.18, 0.21, side * 0.125),
      [side * 0.2, 0, 0.2],
    );
    builder.add(
      "matte",
      shade(camel.coat, 0.9),
      new ConeGeometry(0.035 * size, 0.1 * size, 5),
      {
        at: at(0.02, 0.28, side * 0.09),
        rotation: [side * -0.4, 0, 0.3],
      },
    );
  });
  /* A bright halter with a tassel */
  builder.cylinder("paint", camel.blanket, {
    radius: 0.13 * size,
    length: 0.04 * size,
    at: at(0.42, 0.03, 0),
    axis: "x",
    segments: 8,
    isOpen: true,
  });
  builder.cylinder("paint", camel.blanket, {
    radius: 0.16 * size,
    length: 0.04 * size,
    at: at(0.12, 0.08, 0),
    axis: "x",
    segments: 8,
    isOpen: true,
  });
  builder.add(
    "paint",
    camel.trim,
    new ConeGeometry(0.04 * size, 0.12 * size, 6),
    { at: at(0.3, -0.16, 0) },
  );
};

const headPivot = (camel: Camel): Triple => [
  camel.x + neckTop[0] * size,
  neckTop[1] * size,
  lineZ,
];

const buildRopes = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* Each camel is tied by its halter to the saddle of the camel in front */
  for (let index = 1; index < camels.length; index++) {
    const [hx, hy, hz] = headPivot(camels[index]);
    builder.bar(
      "matte",
      ropeColour,
      [hx + 0.38 * size, hy - 0.1 * size, hz + 0.09 * size],
      [camels[index - 1].x - 0.6 * size, 1.85 * size, lineZ],
      0.025,
      4,
    );
  }
  /* The lead camel's rope tied to a post */
  const [hx, hy, hz] = headPivot(camels[0]);
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.07,
    length: 1.0,
    at: [4.3, 0.5, lineZ + 0.5],
    segments: 8,
  });
  builder.bar(
    "matte",
    ropeColour,
    [hx + 0.38 * size, hy - 0.1 * size, hz + 0.09 * size],
    [4.3, 0.85, lineZ + 0.5],
    0.025,
    4,
  );
};

const rug = { x: -1.5, z: 2.3, turn: 0.25 };

const buildCamp = (builder: AttractionBuilder) => {
  const place = (x: number, y: number, z: number): Triple => [
    rug.x + x * Math.cos(rug.turn) + z * Math.sin(rug.turn),
    y,
    rug.z - x * Math.sin(rug.turn) + z * Math.cos(rug.turn),
  ];
  const turned: Triple = [0, rug.turn, 0];
  builder.box("matte", "#9e2b25", [2.0, 0.03, 1.3], place(0, 0.015, 0), turned);
  if (builder.isFar) {
    return;
  }
  /* The rug's border and diamond pattern */
  builder.box(
    "matte",
    "#f0c05a",
    [1.8, 0.034, 1.1],
    place(0, 0.016, 0),
    turned,
  );
  builder.box(
    "matte",
    "#9e2b25",
    [1.66, 0.036, 0.96],
    place(0, 0.017, 0),
    turned,
  );
  [-0.55, 0, 0.55].forEach((x, index) => {
    builder.box(
      "matte",
      index === 1 ? "#1f6f8a" : "#f0c05a",
      [0.32, 0.038, 0.32],
      place(x, 0.018, 0),
      [0, rug.turn + Math.PI / 4, 0],
    );
  });
  for (let fringe = 0; fringe < 7; fringe++) {
    [-1, 1].forEach((end) => {
      builder.box(
        "matte",
        palette.cream,
        [0.1, 0.01, 0.03],
        place(end * 1.04, 0.008, -0.54 + fringe * 0.18),
        turned,
      );
    });
  }
  /* Cushions to lean on */
  [
    { x: -0.6, z: -0.45, colour: "#e07b24" },
    { x: 0.1, z: -0.5, colour: "#1f9e9a" },
    { x: 0.75, z: -0.4, colour: "#7a3a8a" },
  ].forEach(({ x, z, colour }) => {
    builder.sphere(
      "matte",
      colour,
      0.25,
      place(x, 0.14, z),
      [1.2, 0.5, 0.8],
      8,
    );
    builder.sphere("paint", "#f2c14e", 0.03, place(x, 0.27, z), [1, 1, 1], 6);
  });
  /* A brass tray with a teapot and little glasses of mint tea */
  builder.cylinder("metal", brass, {
    radius: 0.28,
    length: 0.03,
    at: place(0.1, 0.05, 0.15),
    segments: 14,
  });
  builder.lathe(
    "metal",
    shade(palette.steel, 1.1),
    [
      [0, 0],
      [0.08, 0],
      [0.11, 0.06],
      [0.1, 0.13],
      [0.05, 0.16],
      [0.06, 0.2],
      [0.02, 0.24],
      [0, 0.25],
    ],
    place(0.05, 0.065, 0.15),
    "y",
    12,
  );
  const [px, , pz] = place(0.05, 0, 0.15);
  builder.bar(
    "metal",
    shade(palette.steel, 1.1),
    [px + 0.08, 0.15, pz],
    [px + 0.18, 0.24, pz],
    0.025,
    5,
  );
  [0.28, 0.2, -0.12].forEach((x, index) => {
    builder.cylinder("glass", "#8fc77a", {
      radius: 0.03,
      radiusEnd: 0.035,
      length: 0.08,
      at: place(x, 0.105, 0.3 - index * 0.1),
      segments: 8,
    });
  });
  /* Goatskin water bags, plump and tied at the neck */
  [
    [1.15, 0.7],
    [1.4, 0.45],
  ].forEach(([x, z], index) => {
    const bag = place(x, 0, z);
    builder.sphere(
      "matte",
      index === 0 ? "#7a5232" : "#5e3f26",
      0.24,
      [bag[0], 0.2, bag[2]],
      [1.2, 0.85, 0.85],
      10,
    );
    builder.cylinder("matte", "#5e3f26", {
      radius: 0.05,
      radiusEnd: 0.07,
      length: 0.16,
      at: [bag[0] + 0.24, 0.38, bag[2]],
      segments: 8,
    });
  });
  /* A walking stick and a lantern for the night */
  builder.bar(
    "matte",
    palette.darkTimber,
    place(-1.05, 0, 0.55),
    place(-0.85, 1.3, 0.45),
    0.05,
    6,
  );
  const lantern = place(-1.1, 0, -0.2);
  builder.cylinder("metal", brass, {
    radius: 0.1,
    length: 0.04,
    at: [lantern[0], 0.02, lantern[2]],
    segments: 10,
  });
  builder.cylinder("glass", "#f4d58a", {
    radius: 0.08,
    length: 0.2,
    at: [lantern[0], 0.14, lantern[2]],
    segments: 8,
  });
  builder.add("metal", brass, new ConeGeometry(0.11, 0.12, 8), {
    at: [lantern[0], 0.3, lantern[2]],
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
      0.26 - (piece / pieces) * 0.09,
      builder.isFar ? 5 : 8,
    );
  }
  const top = pointAt(1);
  const fronds = builder.isFar ? 5 : 9;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2 + 0.3;
    const reach = 1.4 + (frond % 2) * 0.2;
    const out = (distance: number, drop: number): Triple => [
      top[0] + Math.sin(angle) * distance,
      top[1] + drop,
      top[2] + Math.cos(angle) * distance,
    ];
    const colour = frond % 2 === 0 ? "#4f8f3a" : "#3f7a30";
    if (builder.isFar) {
      addSlab(builder, "matte", colour, top, out(reach, -0.4), 0.42, 0.04);
      continue;
    }
    const points = [
      out(0, 0.05),
      out(reach * 0.35, 0.2),
      out(reach * 0.7, 0.05),
      out(reach, -0.45),
    ];
    for (let piece = 0; piece < 3; piece++) {
      addSlab(
        builder,
        "matte",
        colour,
        points[piece],
        points[piece + 1],
        0.44 - piece * 0.12,
        0.035,
      );
      if (piece > 0) {
        continue;
      }
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
        "#c98a3e",
        0.1,
        [
          top[0] + Math.sin(angle) * 0.15,
          top[1] - 0.12,
          top[2] + Math.cos(angle) * 0.15,
        ],
        [1, 1.2, 1],
        8,
      );
    });
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  addPalm(builder, [-3.6, 0, -2.6], 3.4, [0.12, 0.1]);
  if (builder.isFar) {
    return;
  }
  /* Hoofprints along the caravan's track, and a few desert shrubs */
  for (let print = 0; print < 8; print++) {
    builder.box(
      "matte",
      shade(sand, 0.86),
      [0.18, 0.01, 0.15],
      [-4.4 + print * 1.1, 0.004, lineZ + (print % 2 === 0 ? 0.25 : -0.25)],
      [0, print * 0.3, 0],
    );
  }
  [
    [3.6, 1.6],
    [1.0, -3.4],
  ].forEach(([x, z]) => {
    for (let twig = 0; twig < 5; twig++) {
      const angle = twig * 1.26;
      builder.bar(
        "matte",
        "#7a8a4a",
        [x, 0, z],
        [
          x + Math.sin(angle) * 0.3,
          0.32 + (twig % 2) * 0.1,
          z + Math.cos(angle) * 0.3,
        ],
        0.03,
        4,
      );
    }
    builder.sphere("matte", "#8a9a5a", 0.2, [x, 0.2, z], [1.2, 0.7, 1.2], 8);
  });
};

/** The Character climbs onto the lead camel, sways along on it, and climbs down. */
const lead = camels[0];
const rideStart = { x: lead.x - 0.2, z: lineZ + 1.05 };
const rideFinish = { x: lead.x + 1.05, z: lineZ + 1.2 };
const seatSpot: Triple = [
  lead.x + seat[0] * size,
  (seat[1] + 0.06) * size,
  lineZ,
];

const rideFollow = (progress: number, seconds: number): LocalSpot => {
  const climb = 0.15;
  if (progress < climb || progress > 1 - climb) {
    const isUp = progress < climb;
    const share = isUp ? progress / climb : (1 - progress) / climb;
    const ground = isUp ? rideStart : rideFinish;
    const eased = share * share * (3 - 2 * share);
    return {
      x: ground.x + (seatSpot[0] - ground.x) * eased,
      y:
        seatSpot[1] * Math.sin((eased * Math.PI) / 2) +
        0.25 * Math.sin(eased * Math.PI),
      z: ground.z + (seatSpot[2] - ground.z) * eased,
      heading: Math.PI / 2,
    };
  }
  /* The rolling stride of a camel: up and down, and side to side */
  const stride = seconds * 3.2;
  return {
    x: seatSpot[0] + 0.05 * Math.sin(stride),
    y: seatSpot[1] + 0.06 * Math.abs(Math.sin(stride)),
    z: seatSpot[2] + 0.07 * Math.sin(stride / 2),
    heading: Math.PI / 2 + 0.08 * Math.sin(stride / 2),
  };
};

export const camelCaravanModel: CuriosityModel = {
  kind: "camel-caravan",
  islandId: "sunscorch-sands",
  name: "Camel Caravan",
  fact: "A caravan is a line of camels carrying goods across the desert. Deserts get very little rain, so few plants grow. Camels are well suited to this hot, dry biome: their humps store fat for energy, their wide feet don't sink into sand, and long eyelashes keep the sand out of their eyes.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including climate zones and biomes such as deserts.",
  footprint: 5.9,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 2.4, z: 4.6 },
  build: (builder) => {
    camels.forEach((camel, index) => {
      buildCamel(builder, camel, index === 0);
    });
    buildRopes(builder);
    buildCamp(builder);
    buildGrounds(builder);
    addSignBoard(builder, [2.4, 0, 4.6], signColour);
  },
  moving: camels.map((camel, index): MovingPart => ({
    name: `camel ${String(index + 1)} head`,
    pivot: headPivot(camel),
    build: (builder) => {
      buildCamelHead(builder, camel);
    },
    motion: {
      kind: "nod",
      axis: "z",
      reach: 7,
      amplitude: 0.28,
      period: 2.2 + index * 0.3,
      phase: camel.phase,
    },
  })),
  rides: [
    {
      id: "camel",
      name: "the camel",
      start: rideStart,
      reach: 0.5,
      seconds: 10,
      finish: rideFinish,
      follow: rideFollow,
    },
  ],
  blockers: [
    ...camels.flatMap((camel) => [
      { x: camel.x - 0.45, z: lineZ, radius: 0.55 },
      { x: camel.x + 0.45, z: lineZ, radius: 0.55 },
    ]),
    { x: -3.6, z: -2.6, radius: 0.3 },
    { x: 4.3, z: lineZ + 0.5, radius: 0.2 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Ride a camel",
    news: "Sway, sway! The camel rocked you along like a ship of the desert, and it didn't even need a drink.",
  },
};
