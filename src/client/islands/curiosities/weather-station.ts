import { ConeGeometry, CylinderGeometry } from "three";
import {
  addBush,
  addFence,
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const screenWhite = "#f6f4ee";
const screenShadow = "#d9d6cc";
const mastGrey = "#8e969e";
const cupRed = "#d0453a";
const vaneBlack = "#2a2c30";
const copperGauge = "#b87333";
const rainBlue = "#4aa3e0";
const boardBlue = "#2f5f8a";
const sunYellow = "#f2c12e";
const cloudWhite = "#f4f6f8";
const snowBlue = "#cfe8f6";
const sockOrange = "#f07a2a";
const signColour = "#2f6f9a";

const screenAt = { x: -1.25, z: -1.0 };
const screenLegs = 1.0;
const screenSize: Triple = [0.8, 0.62, 0.55];
const anemometerAt: Triple = [1.25, 2.7, -1.2];
const vaneAt: Triple = [0.05, 2.35, -2.0];
const chartAt = { x: -1.3, z: 1.0 };
const chartFace = 1.0;
const pointerPivot: Triple = [chartAt.x, chartFace, chartAt.z + 0.06];
const gaugeAt = { x: 1.1, z: 0.55 };
const sockAt: Triple = [1.95, 2.0, -0.2];

/** The Stevenson screen: a white louvred box on legs, keeping the Sun off its thermometers. */
const buildScreen = (builder: AttractionBuilder) => {
  const { x, z } = screenAt;
  const [width, height, depth] = screenSize;
  const bottom = screenLegs;
  const middle = bottom + height / 2;
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        screenWhite,
        [0.06, bottom + 0.05, 0.06],
        [
          x + sideX * (width / 2 - 0.08),
          (bottom + 0.05) / 2,
          z + sideZ * (depth / 2 - 0.08),
        ],
      );
    });
  });
  builder.box(
    "paint",
    screenShadow,
    [width - 0.04, height, depth - 0.04],
    [x, middle, z],
  );
  /* A double roof, with an air gap between */
  builder.box(
    "paint",
    screenWhite,
    [width + 0.12, 0.04, depth + 0.12],
    [x, bottom + height + 0.04, z],
  );
  builder.box(
    "paint",
    screenWhite,
    [width + 0.18, 0.04, depth + 0.18],
    [x, bottom + height + 0.14, z],
    [0.08, 0, 0],
  );
  builder.box("paint", screenWhite, [width, 0.04, depth], [x, bottom, z]);
  if (builder.isFar) {
    return;
  }
  /* Louvred slats on all four sides let the air through */
  const slats = 7;
  for (let slat = 0; slat < slats; slat++) {
    const y = bottom + 0.06 + (slat + 0.5) * ((height - 0.1) / slats);
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        screenWhite,
        [width, 0.015, 0.09],
        [x, y, z + side * (depth / 2)],
        [side * 0.6, 0, 0],
      );
      builder.box(
        "paint",
        screenWhite,
        [0.09, 0.015, depth],
        [x + side * (width / 2), y, z],
        [0, 0, -side * 0.6],
      );
    });
  }
  /* Corner posts, door hinges and a brass handle */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        screenWhite,
        [0.05, height, 0.05],
        [x + sideX * (width / 2), middle, z + sideZ * (depth / 2)],
      );
    });
    builder.box(
      "metal",
      palette.darkSteel,
      [0.03, 0.08, 0.02],
      [x - width / 2 + 0.03, middle + sideX * 0.2, z + depth / 2 + 0.05],
    );
  });
  builder.sphere(
    "metal",
    palette.brass,
    0.025,
    [x + width / 2 - 0.08, middle, z + depth / 2 + 0.06],
    [1, 1, 1],
    8,
  );
  /* Steps up to read the thermometers */
  builder.box(
    "matte",
    palette.paleTimber,
    [0.6, 0.12, 0.35],
    [x, 0.06, z + depth / 2 + 0.35],
  );
};

const buildAnemometerMast = (builder: AttractionBuilder) => {
  const [x, top, z] = anemometerAt;
  builder.cylinder("metal", mastGrey, {
    radius: 0.045,
    length: top,
    at: [x, top / 2, z],
    segments: builder.isFar ? 6 : 10,
  });
  builder.cylinder("matte", palette.paving, {
    radius: 0.22,
    length: 0.1,
    at: [x, 0.05, z],
    segments: builder.isFar ? 6 : 14,
  });
  if (builder.isFar) {
    builder.cylinder("paint", cupRed, {
      radius: 0.45,
      length: 0.08,
      at: [x, top + 0.1, z],
      segments: 6,
    });
    return;
  }
  /* Guy wires down to pegs */
  [0.4, 2.5, 4.6].forEach((angle) => {
    const peg: Triple = [
      x + Math.sin(angle) * 0.8,
      0.02,
      z + Math.cos(angle) * 0.8,
    ];
    builder.bar("metal", palette.steel, [x, top * 0.65, z], peg, 0.012, 3);
    builder.box("metal", palette.darkSteel, [0.05, 0.08, 0.05], peg);
  });
};

/** Three cups on arms, which the wind spins faster the harder it blows. */
const buildCups = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.06,
    length: 0.16,
    at: [0, 0.06, 0],
    segments: 12,
  });
  builder.sphere("metal", palette.steel, 0.06, [0, 0.15, 0], [1, 0.6, 1], 10);
  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm / 3) * Math.PI * 2;
    const reach = 0.38;
    const tip: Triple = [Math.sin(angle) * reach, 0.1, Math.cos(angle) * reach];
    builder.bar("metal", palette.steel, [0, 0.1, 0], tip, 0.025, 6);
    /* Each cup opens sideways, all round the same way */
    const facing = angle + Math.PI / 2;
    builder.add(
      "paint",
      cupRed,
      new ConeGeometry(0.1, 0.14, 14, 1, true)
        .rotateZ(Math.PI / 2)
        .rotateY(facing),
      { at: tip },
    );
    builder.sphere(
      "paint",
      shade(cupRed, 0.85),
      0.05,
      [
        tip[0] - Math.cos(facing) * 0.05,
        tip[1],
        tip[2] + Math.sin(facing) * 0.05,
      ],
      [1, 1, 1],
      8,
    );
  }
};

const buildVaneMast = (builder: AttractionBuilder) => {
  const [x, top, z] = vaneAt;
  builder.cylinder("metal", mastGrey, {
    radius: 0.04,
    length: top,
    at: [x, top / 2, z],
    segments: builder.isFar ? 6 : 10,
  });
  if (builder.isFar) {
    builder.box("matte", vaneBlack, [0.08, 0.06, 0.9], [x, top + 0.18, z]);
    return;
  }
  /* The compass points below the arrow: north arm red */
  const height = top - 0.12;
  [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((angle, index) => {
    const tip: Triple = [
      x + Math.sin(angle) * 0.36,
      height,
      z + Math.cos(angle) * 0.36,
    ];
    builder.bar("metal", vaneBlack, [x, height, z], tip, 0.025, 4);
    builder.sphere(
      "paint",
      index === 2 ? cupRed : palette.white,
      0.045,
      tip,
      [1, 1, 1],
      8,
    );
  });
  builder.sphere("metal", palette.brass, 0.05, [x, height, z], [1, 1, 1], 8);
};

/** The wind vane's arrow, which swings to point where the wind comes from. */
const buildVane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", vaneBlack, {
    radius: 0.02,
    length: 0.9,
    at: [0, 0.18, 0.05],
    axis: "z",
    segments: 8,
  });
  builder.add(
    "metal",
    vaneBlack,
    new ConeGeometry(0.07, 0.18, 8).rotateX(Math.PI / 2),
    {
      at: [0, 0.18, 0.58],
    },
  );
  builder.box("metal", vaneBlack, [0.015, 0.22, 0.24], [0, 0.18, -0.36]);
  builder.cylinder("metal", palette.brass, {
    radius: 0.03,
    length: 0.18,
    at: [0, 0.09, 0],
    segments: 8,
  });
  builder.sphere("metal", palette.brass, 0.05, [0, 0.36, 0], [1, 1, 1], 8);
};

/** The rain gauge: a copper funnel over a measuring glass. */
const buildGauge = (builder: AttractionBuilder) => {
  const { x, z } = gaugeAt;
  builder.cylinder("metal", copperGauge, {
    radius: 0.12,
    length: 0.5,
    at: [x, 0.25, z],
    segments: builder.isFar ? 6 : 16,
  });
  if (builder.isFar) {
    return;
  }
  builder.cylinder("metal", shade(copperGauge, 1.15), {
    radius: 0.16,
    radiusEnd: 0.03,
    length: 0.14,
    at: [x, 0.57, z],
    segments: 16,
    isOpen: true,
  });
  builder.torus(
    "metal",
    shade(copperGauge, 1.2),
    0.155,
    0.012,
    [x, 0.64, z],
    "y",
    16,
  );
  /* A measuring glass beside it, a third full of rain */
  const glass: Triple = [x + 0.32, 0, z + 0.05];
  builder.cylinder("glass", palette.white, {
    radius: 0.05,
    length: 0.4,
    at: [glass[0], 0.2, glass[2]],
    segments: 12,
    isOpen: true,
  });
  builder.cylinder("water", rainBlue, {
    radius: 0.045,
    length: 0.13,
    at: [glass[0], 0.075, glass[2]],
    segments: 12,
  });
  for (let mark = 1; mark < 8; mark++) {
    builder.box(
      "paint",
      palette.black,
      [mark % 2 === 0 ? 0.04 : 0.025, 0.006, 0.005],
      [glass[0], mark * 0.05, glass[2] + 0.05],
    );
  }
};

/** The weather chart: sun, cloud, rain and snow round a dial. */
const buildChart = (builder: AttractionBuilder) => {
  const { x, z } = chartAt;
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.08, 1.6, 0.08],
      [x + side * 0.6, 0.8, z - 0.04],
    );
  });
  builder.box("paint", boardBlue, [1.3, 0.95, 0.05], [x, chartFace + 0.05, z]);
  builder.box(
    "matte",
    palette.darkTimber,
    [1.45, 0.07, 0.12],
    [x, chartFace + 0.56, z],
  );
  if (builder.isFar) {
    return;
  }
  const face = z + 0.03;
  const dial = 0.36;
  const symbolAt = (angle: number): Triple => [
    x + Math.sin(angle) * dial,
    chartFace + Math.cos(angle) * dial,
    face,
  ];
  /* Sun, with its rays */
  const sun = symbolAt(-1.2);
  builder.cylinder("paint", sunYellow, {
    radius: 0.08,
    length: 0.02,
    at: sun,
    axis: "z",
    segments: 14,
  });
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    builder.box(
      "paint",
      sunYellow,
      [0.02, 0.05, 0.015],
      [sun[0] + Math.sin(angle) * 0.12, sun[1] + Math.cos(angle) * 0.12, face],
      [0, 0, -angle],
    );
  }
  /* A cloud, a rain cloud, and a snowy cloud */
  const addCloud = (at: Triple) => {
    [
      [-0.06, 0, 0.05],
      [0.0, 0.03, 0.065],
      [0.07, 0, 0.05],
    ].forEach(([dx, dy, radius]) => {
      builder.sphere(
        "paint",
        cloudWhite,
        radius,
        [at[0] + dx, at[1] + dy, face],
        [1, 1, 0.3],
        8,
      );
    });
  };
  const cloud = symbolAt(-0.4);
  addCloud(cloud);
  const rain = symbolAt(0.4);
  addCloud(rain);
  [-0.05, 0.02, 0.08].forEach((dx) => {
    builder.sphere(
      "paint",
      rainBlue,
      0.018,
      [rain[0] + dx, rain[1] - 0.09, face],
      [0.8, 1.4, 0.5],
      6,
    );
  });
  const snow = symbolAt(1.2);
  addCloud(snow);
  [-0.05, 0.05].forEach((dx) => {
    [0, Math.PI / 3, -Math.PI / 3].forEach((angle) => {
      builder.box(
        "paint",
        snowBlue,
        [0.05, 0.008, 0.01],
        [snow[0] + dx, snow[1] - 0.1, face],
        [0, 0, angle],
      );
    });
  });
  /* The pointer's brass boss, and a thermometer down the side */
  builder.cylinder("metal", palette.brass, {
    radius: 0.05,
    length: 0.03,
    at: [x, chartFace, face + 0.01],
    axis: "z",
    segments: 12,
  });
  builder.box(
    "paint",
    palette.white,
    [0.08, 0.7, 0.02],
    [x + 0.55, chartFace + 0.05, face],
  );
  builder.cylinder("paint", cupRed, {
    radius: 0.012,
    length: 0.4,
    at: [x + 0.55, chartFace - 0.05, face + 0.012],
    segments: 6,
  });
  builder.sphere(
    "paint",
    cupRed,
    0.03,
    [x + 0.55, chartFace - 0.26, face + 0.015],
    [1, 1, 1],
    8,
  );
};

/** The chart's pointer, swinging over the weather to show today's. */
const buildPointer = (builder: AttractionBuilder) => {
  builder.box("paint", vaneBlack, [0.03, 0.26, 0.015], [0, 0.13, 0]);
  builder.add("paint", vaneBlack, new ConeGeometry(0.035, 0.07, 6), {
    at: [0, 0.29, 0],
  });
};

/** An orange and white windsock, swaying in the breeze. */
const buildSock = (builder: AttractionBuilder) => {
  builder.torus("metal", palette.steel, 0.12, 0.012, [0, 0, 0.05], "z", 14);
  for (let band = 0; band < 4; band++) {
    const from = 0.12 - band * 0.018;
    builder.cylinder("matte", band % 2 === 0 ? sockOrange : palette.white, {
      radius: from,
      radiusEnd: from - 0.018,
      length: 0.18,
      at: [0, -band * 0.03, 0.14 + band * 0.18],
      axis: "z",
      segments: 12,
      isOpen: true,
    });
  }
};

const sunRecorderAt = { x: 0.15, z: -0.7 };
const snowPoleAt = { x: -2.0, z: 0.2 };

/** A sunshine recorder: a glass ball that burns a line on a card while the Sun shines. */
const buildSunRecorder = (builder: AttractionBuilder) => {
  const { x, z } = sunRecorderAt;
  builder.cylinder("paint", screenWhite, {
    radius: 0.14,
    radiusEnd: 0.18,
    length: 0.95,
    at: [x, 0.475, z],
    segments: builder.isFar ? 6 : 14,
  });
  if (builder.isFar) {
    return;
  }
  builder.box("paint", screenWhite, [0.42, 0.05, 0.42], [x, 0.97, z]);
  builder.sphere("glass", "#dff0fa", 0.13, [x, 1.17, z], [1, 1, 1], 18);
  /* The curved bronze bowl holding the card, behind the ball */
  builder.add(
    "metal",
    copperGauge,
    new CylinderGeometry(
      0.19,
      0.19,
      0.16,
      18,
      1,
      true,
      Math.PI * 0.6,
      Math.PI * 0.8,
    ),
    { at: [x, 1.17, z] },
  );
  builder.box("paint", sunYellow, [0.25, 0.012, 0.01], [x, 1.17, z - 0.185]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      copperGauge,
      [x + side * 0.16, 0.99, z - 0.05],
      [x + side * 0.16, 1.2, z - 0.1],
      0.025,
      5,
    );
  });
};

/** A snow pole, banded every ten centimetres, to measure how deep the snow is. */
const buildSnowPole = (builder: AttractionBuilder) => {
  const { x, z } = snowPoleAt;
  builder.box("paint", palette.white, [0.08, 1.2, 0.08], [x, 0.6, z]);
  if (builder.isFar) {
    return;
  }
  for (let band = 0; band < 6; band++) {
    builder.box(
      "paint",
      band % 2 === 0 ? boardBlue : snowBlue,
      [0.085, 0.1, 0.085],
      [x, 0.05 + band * 0.2, z],
    );
  }
  builder.sphere("paint", snowBlue, 0.06, [x, 1.24, z], [1, 1, 1], 10);
};

/** A robin on the fence, watching the weather too. */
const addRobin = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    "#8a6a4a",
    0.07,
    [x, y + 0.07, z],
    [0.9, 0.9, 1.1],
    10,
  );
  builder.sphere(
    "matte",
    "#d8572a",
    0.05,
    [x, y + 0.07, z + 0.04],
    [1, 1, 0.8],
    8,
  );
  builder.sphere(
    "matte",
    "#8a6a4a",
    0.045,
    [x, y + 0.14, z + 0.04],
    [1, 1, 1],
    8,
  );
  builder.add(
    "paint",
    vaneBlack,
    new ConeGeometry(0.012, 0.04, 5).rotateX(Math.PI / 2),
    {
      at: [x, y + 0.14, z + 0.1],
    },
  );
  builder.box(
    "matte",
    "#6a4a32",
    [0.05, 0.015, 0.08],
    [x, y + 0.08, z - 0.09],
    [-0.4, 0, 0],
  );
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.gravel, [4.6, 0.03, 3.4], [0, 0.015, -0.9]);
  builder.box("matte", palette.path, [0.9, 0.03, 2.4], [0, 0.015, 2.1]);
  /* The windsock's own little mast */
  builder.cylinder("metal", mastGrey, {
    radius: 0.035,
    length: sockAt[1] + 0.1,
    at: [sockAt[0], (sockAt[1] + 0.1) / 2, sockAt[2]],
    segments: builder.isFar ? 5 : 8,
  });
  if (builder.isFar) {
    return;
  }
  addFence(
    builder,
    { x: -2.3, z: -2.6 },
    { x: 2.3, z: -2.6 },
    { height: 0.45 },
  );
  addFence(
    builder,
    { x: -2.3, z: -2.6 },
    { x: -2.3, z: 0.6 },
    { height: 0.45 },
  );
  addFence(builder, { x: 2.3, z: -2.6 }, { x: 2.3, z: 0.6 }, { height: 0.45 });
  /* A notebook on a little desk to write down the readings */
  const desk: Triple = [0.25, 0, 0.9];
  builder.box(
    "matte",
    palette.paleTimber,
    [0.5, 0.04, 0.35],
    [desk[0], 0.7, desk[2]],
    [-0.25, 0, 0],
  );
  builder.box(
    "matte",
    palette.darkTimber,
    [0.06, 0.7, 0.06],
    [desk[0], 0.35, desk[2]],
  );
  builder.box(
    "paint",
    palette.white,
    [0.28, 0.015, 0.2],
    [desk[0] - 0.05, 0.725, desk[2]],
    [-0.25, 0, 0],
  );
  builder.box(
    "paint",
    cupRed,
    [0.012, 0.012, 0.16],
    [desk[0] + 0.14, 0.73, desk[2]],
    [-0.25, 0.3, 0],
  );
  addRobin(builder, [-2.3, 0.5, -1.2]);
  addBush(builder, [-3.0, 0, 1.6], 0.5);
  addBush(builder, [3.0, 0, 1.5], 0.45, "#3d7a34");
};

export const weatherStationModel: CuriosityModel = {
  kind: "weather-station",
  islandId: "meadow-isle",
  name: "Weather Station",
  fact: "A weather station measures the weather every day. The anemometer's spinning cups show how fast the wind blows, the wind vane points to where it comes from, the rain gauge collects rain, and thermometers in the white box show how warm it is. Summer is usually warm and sunny, while winter is cold and sometimes snowy.",
  curriculumLink:
    "Science, Year 1: seasonal changes. Observe changes across the four seasons, and observe and describe weather associated with the seasons.",
  footprint: 4.2,
  setting: "inland",
  signSpot: { x: 1.5, z: 3.1 },
  build: (builder) => {
    buildGrounds(builder);
    buildScreen(builder);
    buildAnemometerMast(builder);
    buildVaneMast(builder);
    buildGauge(builder);
    buildChart(builder);
    buildSunRecorder(builder);
    buildSnowPole(builder);
    addSignBoard(builder, [1.5, 0, 3.1], signColour);
  },
  moving: [
    {
      name: "anemometer cups",
      pivot: anemometerAt,
      build: buildCups,
      motion: { kind: "whirl", axis: "y", idle: 1.2, speed: 7, reach: 8 },
    },
    {
      name: "wind vane",
      pivot: vaneAt,
      build: buildVane,
      motion: { kind: "nod", axis: "y", reach: 8, amplitude: 0.7, period: 3.4 },
    },
    {
      name: "chart pointer",
      pivot: pointerPivot,
      build: buildPointer,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 1.2, period: 4 },
    },
    {
      name: "windsock",
      pivot: sockAt,
      build: buildSock,
      motion: { kind: "swing", axis: "y", amplitude: 0.5, period: 2.8 },
    },
  ],
  blockers: [
    { x: screenAt.x, z: screenAt.z, radius: 0.55 },
    { x: anemometerAt[0], z: anemometerAt[2], radius: 0.3 },
    { x: vaneAt[0], z: vaneAt[2], radius: 0.3 },
    { x: gaugeAt.x + 0.15, z: gaugeAt.z, radius: 0.35 },
    { x: chartAt.x, z: chartAt.z - 0.05, radius: 0.5 },
    { x: sockAt[0], z: sockAt[2], radius: 0.25 },
    { x: sunRecorderAt.x, z: sunRecorderAt.z, radius: 0.3 },
    { x: snowPoleAt.x, z: snowPoleAt.z, radius: 0.2 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Read the weather",
    news: "The cups are whizzing round, so it's breezy! The wind vane points west, the rain gauge has a little rain in it, and the chart says: sunny spells and showers.",
  },
};
