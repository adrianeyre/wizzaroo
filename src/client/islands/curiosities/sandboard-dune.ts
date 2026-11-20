import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  PlaneGeometry,
} from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type Deck,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const windwardSand = "#ecd29c";
const slipSand = "#d6b276";
const deckTimber = "#a87a4a";
const signColour = "#d4682a";

/* The dune: a ridge running across, a gentle windward slope behind and a steep slip face in front */
const duneHalfLength = 4.0;
const duneHeight = 2.3;
const backLength = 2.6;
const slipLength = 2.5;

const crestZ = (x: number): number => -1.4 + 0.25 * Math.sin(x * 0.6);
const crestHeight = (x: number): number => {
  const along = Math.min(1, Math.abs(x) / duneHalfLength);
  return duneHeight * (1 - along * along) ** 0.8;
};

/** How high the sand is at a local point. */
const findDuneHeight = (x: number, z: number): number => {
  const crest = crestZ(x);
  const top = crestHeight(x);
  if (z < crest) {
    const share = Math.min(1, (crest - z) / backLength);
    return top * (1 - share * share * (3 - 2 * share));
  }
  const share = Math.min(1, (z - crest) / slipLength);
  return top * (1 - share) ** 1.6;
};

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

/** One side of the dune as a grid running from the crest out to its foot. */
const addDuneFace = (
  builder: AttractionBuilder,
  colour: string,
  isSlip: boolean,
) => {
  const across = builder.segments(44, 8);
  const down = builder.segments(16, 4);
  const grid = new PlaneGeometry(1, 1, across, down).rotateX(-Math.PI / 2);
  const position = grid.getAttribute("position");
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index) * duneHalfLength * 2;
    const share = position.getZ(index) + 0.5;
    const crest = crestZ(x);
    const z = isSlip
      ? crest + share * slipLength
      : crest - (1 - share) * backLength;
    position.setXYZ(index, x, findDuneHeight(x, z) - 0.02, z);
  }
  builder.add("matte", colour, grid);
};

const platform = {
  minX: -2.8,
  maxX: -1.8,
  minZ: -2.15,
  maxZ: -1.15,
  height: 2.05,
};
const stairs = { minX: -2.72, maxX: -2.08, minZ: platform.maxZ, maxZ: 1.3 };
const stairSteps = 9;
const stairRise = platform.height / stairSteps;
const stairTread = (stairs.maxZ - stairs.minZ) / stairSteps;
const sockAt: Triple = [
  platform.minX + 0.05,
  platform.height + 1.6,
  platform.minZ + 0.05,
];
const rack = { x: 2.6, z: 2.0 };
const ramp = { x: -3.55, z: 2.1 };

const buildDeck = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, height } = platform;
  const middleX = (minX + maxX) / 2;
  const middleZ = (minZ + maxZ) / 2;
  builder.box(
    "matte",
    deckTimber,
    [maxX - minX, 0.1, maxZ - minZ],
    [middleX, height - 0.05, middleZ],
  );
  /* Stilts down into the sand */
  [minX + 0.06, maxX - 0.06].forEach((x) => {
    [minZ + 0.06, maxZ - 0.06].forEach((z) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.1, height, 0.1],
        [x, height / 2, z],
      );
    });
  });
  /* The steps up from the front */
  for (let step = 0; step < stairSteps; step++) {
    const z = stairs.maxZ - (step + 0.5) * stairTread;
    builder.box(
      "matte",
      step % 2 === 0 ? shade(deckTimber, 1.08) : deckTimber,
      [stairs.maxX - stairs.minX, 0.06, stairTread + 0.02],
      [(stairs.minX + stairs.maxX) / 2, (step + 1) * stairRise - 0.03, z],
    );
  }
  /* Stringers either side of the steps */
  [stairs.minX - 0.03, stairs.maxX + 0.03].forEach((x) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      [x, 0, stairs.maxZ],
      [x, height, stairs.minZ],
      0.08,
      4,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Planks, a handrail round three sides and along the steps */
  for (let plank = 0; plank < 6; plank++) {
    builder.box(
      "matte",
      shade(deckTimber, plank % 2 === 0 ? 0.92 : 1.05),
      [maxX - minX + 0.04, 0.02, 0.15],
      [middleX, height + 0.01, minZ + 0.09 + plank * 0.165],
    );
  }
  const rail = 0.75;
  [
    [minX, minZ, maxX, minZ],
    [minX, minZ, minX, maxZ],
  ].forEach(([fromX, fromZ, toX, toZ]) => {
    builder.bar(
      "paint",
      "#d4682a",
      [fromX, height + rail, fromZ],
      [toX, height + rail, toZ],
      0.05,
      6,
    );
    [0, 0.5, 1].forEach((share) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.06, rail, 0.06],
        [
          fromX + (toX - fromX) * share,
          height + rail / 2,
          fromZ + (toZ - fromZ) * share,
        ],
      );
    });
  });
  builder.bar(
    "paint",
    "#d4682a",
    [stairs.minX - 0.03, 0.85, stairs.maxZ],
    [stairs.minX - 0.03, height + rail, stairs.minZ],
    0.05,
    6,
  );
  [0.25, 0.5, 0.75].forEach((share) => {
    const z = stairs.maxZ + (stairs.minZ - stairs.maxZ) * share;
    const floor = share * height;
    builder.box(
      "matte",
      palette.darkTimber,
      [0.05, rail + 0.1, 0.05],
      [stairs.minX - 0.03, floor + rail / 2 + 0.05, z],
    );
  });
  /* The wind sock's pole */
  builder.cylinder("metal", palette.steel, {
    radius: 0.035,
    length: 1.65,
    at: [sockAt[0], platform.height + 0.82, sockAt[2]],
    segments: 8,
  });
  builder.sphere(
    "paint",
    "#d4682a",
    0.05,
    [sockAt[0], sockAt[1] + 0.06, sockAt[2]],
    [1, 1, 1],
    8,
  );
  /* A board waiting at the top, ready to go */
  builder.box(
    "paint",
    "#2f7fc4",
    [0.32, 0.03, 1.1],
    [maxX - 0.25, height + 0.035, middleZ],
    [0, 0.3, 0],
  );
};

/** A sandboard, its nose up, standing or lying as placed. */
const addBoard = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  stripe: string,
  rotation: Triple,
) => {
  builder.box("paint", colour, [0.32, 1.1, 0.03], at, rotation);
  builder.add(
    "paint",
    colour,
    new CylinderGeometry(0.16, 0.16, 0.03, 10, 1, false, 0, Math.PI),
    {
      at: [at[0], at[1] + 0.55, at[2]],
      rotation: [Math.PI / 2 + rotation[0], 0, rotation[2]],
    },
  );
  builder.box("paint", stripe, [0.08, 1.1, 0.032], at, rotation);
};

const buildRack = (builder: AttractionBuilder) => {
  const { x, z } = rack;
  [-0.7, 0.7].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 0.9, 0.08],
      [x + side, 0.45, z],
    );
  });
  builder.box("matte", palette.timber, [1.55, 0.08, 0.1], [x, 0.85, z]);
  builder.box("matte", palette.timber, [1.55, 0.08, 0.1], [x, 0.2, z + 0.25]);
  if (builder.isFar) {
    return;
  }
  [
    ["#d4682a", "#f2c14e"],
    ["#2f7fc4", palette.white],
    ["#3f9a5a", "#f2c14e"],
    ["#b2245a", palette.white],
  ].forEach(([colour, stripe], index) => {
    addBoard(
      builder,
      [x - 0.5 + index * 0.33, 0.62, z + 0.15],
      colour,
      stripe,
      [-0.25, 0, (index - 1.5) * 0.04],
    );
  });
  /* A tub of board wax */
  builder.cylinder("paint", "#f2c14e", {
    radius: 0.09,
    length: 0.1,
    at: [x + 0.95, 0.05, z + 0.25],
    segments: 10,
  });
};

const buildFrictionRamp = (builder: AttractionBuilder) => {
  /* A test ramp with three lanes: sandpaper, carpet and smooth plastic */
  const { x, z } = ramp;
  const slope = 0.42;
  builder.box(
    "matte",
    palette.paleTimber,
    [0.95, 0.06, 1.3],
    [x, 0.36, z],
    [slope, 0, 0],
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.95, 0.6, 0.08],
    [x, 0.3, z - 0.6],
  );
  if (builder.isFar) {
    return;
  }
  const lanes: { colour: string; finish: AttractionFinish; slide: number }[] = [
    { colour: "#a07a4a", finish: "matte", slide: 0.15 },
    { colour: "#c0392b", finish: "matte", slide: 0.45 },
    { colour: "#8ad0e8", finish: "paint", slide: 0.95 },
  ];
  lanes.forEach(({ colour, finish, slide }, index) => {
    const laneX = x - 0.3 + index * 0.3;
    builder.box(
      finish,
      colour,
      [0.26, 0.015, 1.25],
      [laneX, 0.4, z],
      [slope, 0, 0],
    );
    /* Each lane's toy block has slid a different way down */
    const along = -0.45 + slide * 0.9;
    builder.box(
      "paint",
      "#f2c14e",
      [0.14, 0.1, 0.14],
      [
        laneX,
        0.44 + 0.07 - Math.sin(slope) * along,
        z + Math.cos(slope) * along,
      ],
      [slope, 0, 0],
    );
  });
  /* Little flags marking how far each one went */
  [0.15, 0.45, 0.95].forEach((slide, index) => {
    const flagZ = z + 0.65 + slide * 0.4;
    builder.bar(
      "matte",
      palette.darkTimber,
      [x - 0.3 + index * 0.3, 0, flagZ],
      [x - 0.3 + index * 0.3, 0.35, flagZ],
      0.015,
      4,
    );
    builder.box(
      "paint",
      index === 2 ? "#3f9a5a" : "#d4682a",
      [0.1, 0.07, 0.01],
      [x - 0.25 + index * 0.3, 0.31, flagZ],
    );
  });
};

const parasol = { x: 3.6, z: 1.0 };

/** A parasol by the run-out, with a cool box and a towel in its shade. */
const buildParasol = (builder: AttractionBuilder) => {
  const { x, z } = parasol;
  builder.cylinder("metal", palette.steel, {
    radius: 0.03,
    length: 2.0,
    at: [x, 1.0, z],
    segments: 6,
  });
  const panels = builder.isFar ? 6 : 12;
  for (let panel = 0; panel < panels; panel++) {
    builder.add(
      "matte",
      panel % 2 === 0 ? "#e8483a" : palette.white,
      new CylinderGeometry(
        0.02,
        0.85,
        0.32,
        1,
        1,
        true,
        (panel / panels) * Math.PI * 2,
        (Math.PI * 2) / panels,
      ),
      { at: [x, 1.95, z] },
    );
  }
  if (builder.isFar) {
    return;
  }
  builder.sphere("paint", "#e8483a", 0.05, [x, 2.13, z], [1, 1, 1], 8);
  builder.box(
    "matte",
    "#2f7fc4",
    [0.7, 0.015, 1.3],
    [x - 0.15, 0.01, z + 0.3],
    [0, 0.3, 0],
  );
  [-0.2, 0, 0.2].forEach((offset) => {
    builder.box(
      "matte",
      palette.white,
      [0.7, 0.017, 0.06],
      [x - 0.15 + offset * 0.3, 0.011, z + 0.3 + offset],
      [0, 0.3, 0],
    );
  });
  builder.box(
    "paint",
    "#3f9a5a",
    [0.5, 0.32, 0.34],
    [x + 0.45, 0.16, z - 0.35],
  );
  builder.box(
    "paint",
    palette.white,
    [0.54, 0.06, 0.38],
    [x + 0.45, 0.34, z - 0.35],
  );
  builder.bar(
    "paint",
    palette.white,
    [x + 0.3, 0.38, z - 0.35],
    [x + 0.6, 0.38, z - 0.35],
    0.03,
    6,
  );
  builder.cylinder("paint", "#f2a33a", {
    radius: 0.04,
    length: 0.18,
    at: [x + 0.1, 0.09, z - 0.5],
    segments: 8,
  });
};

/** Bunting from the deck down to a post at the bottom of the run. */
const buildBunting = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const from: Triple = [platform.maxX, platform.height + 0.75, platform.maxZ];
  const to: Triple = [1.6, 1.4, 1.9];
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 1.45,
    at: [to[0], 0.72, to[2]],
    segments: 8,
  });
  const flags = 14;
  const pointAt = (share: number): Triple => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share - 0.5 * Math.sin(share * Math.PI),
    from[2] + (to[2] - from[2]) * share,
  ];
  for (let flag = 0; flag < flags; flag++) {
    addSlab(
      builder,
      "matte",
      palette.cream,
      pointAt(flag / flags),
      pointAt((flag + 1) / flags),
      0.012,
      0.012,
    );
    const [x, y, z] = pointAt((flag + 0.5) / flags);
    builder.add(
      "paint",
      ["#e8483a", "#f2c14e", "#2f7fc4", "#3f9a5a"][flag % 4],
      new ConeGeometry(0.08, 0.18, 3).rotateX(Math.PI),
      {
        at: [x, y - 0.1, z],
        rotation: [
          0,
          Math.atan2(to[0] - from[0], to[2] - from[2]) + Math.PI / 2,
          0,
        ],
        scale: [1, 1, 0.15],
      },
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  addDuneFace(builder, windwardSand, false);
  addDuneFace(builder, slipSand, true);
  if (builder.isFar) {
    return;
  }
  /* Board tracks down the slip face, and ripples on the windward side */
  const marks = 9;
  for (let mark = 0; mark < marks; mark++) {
    const spot = (share: number): Triple => {
      const x =
        dropIn.x +
        (runOut.x - dropIn.x) * share +
        0.12 * Math.sin(share * Math.PI * 3);
      const z = dropIn.z + (runOut.z - dropIn.z) * share;
      return [x, findDuneHeight(x, z) + 0.01, z];
    };
    addSlab(
      builder,
      "matte",
      shade(slipSand, 0.84),
      spot(mark / marks),
      spot((mark + 0.8) / marks),
      0.1,
      0.02,
    );
  }
  for (let ripple = 0; ripple < 6; ripple++) {
    const z = crestZ(0) - 0.6 - ripple * 0.32;
    const x = 0.6 - (ripple % 2) * 0.5;
    builder.box(
      "matte",
      shade(windwardSand, 1.06),
      [2.2 - ripple * 0.2, 0.03, 0.06],
      [x, findDuneHeight(x, z) + 0.005, z],
    );
  }
  /* Tufts of desert grass at the dune's foot */
  [
    [3.6, 0.9],
    [-0.9, 2.4],
    [1.6, -3.6],
    [-3.9, -0.6],
  ].forEach(([x, z]) => {
    for (let blade = 0; blade < 6; blade++) {
      const angle = blade * 1.05;
      builder.bar(
        "matte",
        blade % 2 === 0 ? "#9aa84a" : "#7a8a3a",
        [x, 0, z],
        [
          x + Math.sin(angle) * 0.22,
          0.4 + (blade % 3) * 0.08,
          z + Math.cos(angle) * 0.22,
        ],
        0.025,
        3,
      );
    }
  });
};

/** The wind sock, striped and filled with wind, swinging when someone comes near. */
const buildSock = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.15,
    length: 0.03,
    at: [0.03, 0, 0],
    axis: "x",
    segments: 10,
    isOpen: true,
  });
  for (let band = 0; band < 5; band++) {
    const from = 0.15 - band * 0.02;
    builder.add(
      "paint",
      band % 2 === 0 ? "#e8483a" : palette.white,
      new CylinderGeometry(from - 0.02, from, 0.18, 12, 1, true),
      {
        at: [0.12 + band * 0.18, -0.03 - band * 0.025, 0],
        rotation: [0, 0, -Math.PI / 2 - 0.14],
      },
    );
  }
};

const rideStart = { x: platform.maxX - 0.3, z: platform.maxZ - 0.3 };
const dropIn = {
  x: platform.maxX + 0.25,
  z: crestZ(platform.maxX + 0.25) + 0.08,
};
const runOut = { x: 0.7, z: 2.3 };

const rideFollow = (progress: number): LocalSpot => {
  const shuffle = 0.12;
  if (progress < shuffle) {
    const share = progress / shuffle;
    const x = rideStart.x + (dropIn.x - rideStart.x) * share;
    const z = rideStart.z + (dropIn.z - rideStart.z) * share;
    return {
      x,
      y: Math.max(platform.height * (1 - share), findDuneHeight(x, z) + 0.06),
      z,
      heading: Math.atan2(dropIn.x - rideStart.x, dropIn.z - rideStart.z),
    };
  }
  const share = (progress - shuffle) / (1 - shuffle);
  const glide = share * share * (3 - 2 * share);
  const x = dropIn.x + (runOut.x - dropIn.x) * glide;
  const z = dropIn.z + (runOut.z - dropIn.z) * glide;
  return {
    x,
    y: findDuneHeight(x, z) + 0.06,
    z,
    heading:
      Math.atan2(runOut.x - dropIn.x, runOut.z - dropIn.z) +
      0.25 * Math.sin(share * Math.PI * 3),
  };
};

const stairDeck: Deck = ({ x, z }) => {
  if (
    x < stairs.minX ||
    x > stairs.maxX ||
    z < stairs.minZ ||
    z > stairs.maxZ
  ) {
    return undefined;
  }
  const step = Math.min(
    stairSteps,
    Math.floor((stairs.maxZ - z) / stairTread) + 1,
  );
  return { height: step * stairRise, kind: "bridge" };
};

const platformDeck: Deck = ({ x, z }) =>
  x >= platform.minX &&
  x <= platform.maxX &&
  z >= platform.minZ &&
  z <= platform.maxZ
    ? { height: platform.height, kind: "bridge" }
    : undefined;

const duneDeck: Deck = ({ x, z }) => {
  if (Math.abs(x) > duneHalfLength) {
    return undefined;
  }
  const height = findDuneHeight(x, z);
  return height > 0.02 ? { height, kind: "trail" } : undefined;
};

export const sandboardDuneModel: CuriosityModel = {
  kind: "sandboard-dune",
  islandId: "sunscorch-sands",
  name: "Sandboard Dune",
  fact: "A sand dune is a hill of sand piled up by the wind. Sliding down it on a sandboard is like sledging on snow! Rough surfaces like sand and carpet cause lots of friction, which slows things down, while smooth, waxed surfaces have less friction, so things slide faster. That is why sandboarders wax the bottom of their boards.",
  curriculumLink:
    "Science, Year 3: compare how things move on different surfaces, and notice that some forces need contact between two objects.",
  footprint: 5.9,
  setting: "inland",
  padColour: sand,
  signSpot: { x: 2.3, z: 4.5 },
  build: (builder) => {
    buildGrounds(builder);
    buildDeck(builder);
    buildRack(builder);
    buildFrictionRamp(builder);
    buildParasol(builder);
    buildBunting(builder);
    if (builder.isFar) {
      builder.add(
        "paint",
        "#e8483a",
        new ConeGeometry(0.14, 0.8, 6).rotateZ(-Math.PI / 2),
        {
          at: [sockAt[0] + 0.45, sockAt[1] - 0.05, sockAt[2]],
        },
      );
    }
    addSignBoard(builder, [2.3, 0, 4.5], signColour);
  },
  moving: [
    {
      name: "wind sock",
      pivot: sockAt,
      build: buildSock,
      motion: {
        kind: "nod",
        axis: "y",
        reach: 8,
        amplitude: 0.45,
        period: 2.6,
      },
    },
  ],
  smoke: [
    {
      at: [0.6, crestHeight(0.6) + 0.05, crestZ(0.6)],
      colour: "#efd9a6",
      puffs: 6,
      size: 0.18,
      rise: 0.8,
      spread: 1.6,
    },
  ],
  decks: [duneDeck, stairDeck, platformDeck],
  rides: [
    {
      id: "sandboard",
      name: "the sandboard run",
      start: rideStart,
      reach: 0.45,
      seconds: 5,
      finish: runOut,
      follow: rideFollow,
    },
  ],
  blockers: [
    { x: rack.x, z: rack.z, radius: 0.6 },
    { x: rack.x - 0.65, z: rack.z, radius: 0.3 },
    { x: rack.x + 0.65, z: rack.z, radius: 0.3 },
    { x: ramp.x, z: ramp.z, radius: 0.65 },
    { x: parasol.x, z: parasol.z, radius: 0.12 },
    { x: parasol.x + 0.45, z: parasol.z - 0.35, radius: 0.35 },
    { x: 1.6, z: 1.9, radius: 0.12 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Surf the dune",
    news: "Whoosh! Your waxed board slid down the dune, and the rough sand at the bottom slowed you to a gentle stop.",
  },
};
