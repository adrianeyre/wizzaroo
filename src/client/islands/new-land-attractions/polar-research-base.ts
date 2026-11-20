import { ConeGeometry } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type MovingPart,
  type Triple,
  type Wanderers,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef4f8";
const snowShadow = "#d4e1ea";
const frostWhite = "#f8fbfd";
const moduleRed = "#c8342c";
const moduleBlue = "#2f6fb8";
const panelWhite = "#eef0ee";
const deckGrey = "#8a939c";
const legYellow = "#f0b62e";
const snowcatOrange = "#f07c2a";
const iceHole = "#1f5f8c";
const signColour = "#c8342c";

/* Three modules up on legs, with a walkway along the front */
const floor = 1.6;
const moduleHeight = 1.5;
const moduleBack = -4.4;
const moduleFront = -2.2;
const modules = [
  { minX: -4.3, maxX: -1.6, colour: moduleBlue, height: moduleHeight },
  { minX: -1.4, maxX: 1.4, colour: moduleRed, height: moduleHeight + 0.4 },
  { minX: 1.6, maxX: 4.3, colour: moduleBlue, height: moduleHeight },
];
type Module = (typeof modules)[number];
const walkway = { minX: -4.3, maxX: 4.3, minZ: moduleFront, maxZ: -0.6 };
const stairHalf = 0.6;
const stairs = [
  { minZ: -0.6, maxZ: -0.2, height: 1.2 },
  { minZ: -0.2, maxZ: 0.2, height: 0.8 },
  { minZ: 0.2, maxZ: 0.6, height: 0.4 },
];
const balloonAt: Triple = [5.0, 0, 2.2];
const mastAt = { x: -5.4, z: -0.8 };
const turbineAt = { x: -6.2, z: 3.6 };
const sealHole = { x: -1.8, z: 3.8 };
const snowcatAt = { x: 2.6, z: 3.8 };
const signAt: Triple = [-1.4, 0, 6.8];

/* ------------------------------------------------------------------ */
/* The modules                                                         */
/* ------------------------------------------------------------------ */

const addModule = (builder: AttractionBuilder, module: Module) => {
  const width = module.maxX - module.minX;
  const depth = moduleFront - moduleBack;
  const x = (module.minX + module.maxX) / 2;
  const z = (moduleFront + moduleBack) / 2;
  const top = floor + module.height;
  /* The body, with rounded ends like a giant capsule */
  builder.box(
    "paint",
    module.colour,
    [width - 0.5, module.height, depth],
    [x, floor + module.height / 2, z],
  );
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", module.colour, {
      radius: depth / 2,
      length: module.height,
      at: [x + side * (width / 2 - 0.5), floor + module.height / 2, z],
      segments: builder.segments(14, 8),
    });
  });
  builder.box(
    "paint",
    panelWhite,
    [width - 0.3, 0.12, depth - 0.1],
    [x, top + 0.06, z],
  );
  /* Hydraulic legs, each on a ski */
  [module.minX + 0.5, module.maxX - 0.5].forEach((legX) => {
    [moduleBack + 0.35, moduleFront - 0.35].forEach((legZ) => {
      builder.cylinder("paint", legYellow, {
        radius: 0.12,
        length: floor,
        at: [legX, floor / 2, legZ],
        segments: 8,
      });
      if (!builder.isFar) {
        builder.cylinder("metal", palette.steel, {
          radius: 0.07,
          length: 0.6,
          at: [legX, floor - 0.3, legZ],
          segments: 6,
        });
        builder.box(
          "paint",
          palette.darkSteel,
          [0.3, 0.08, 0.9],
          [legX, 0.04, legZ],
        );
        builder.bar(
          "paint",
          palette.darkSteel,
          [legX, 0.06, legZ + 0.45],
          [legX, 0.2, legZ + 0.55],
          0.08,
          4,
        );
      }
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    shade(module.colour, 0.8),
    [width - 0.5, 0.15, depth + 0.02],
    [x, floor + 0.08, z],
  );
  /* Portholes and lit windows all along the front */
  const windows = Math.round(width / 0.55);
  for (let window = 0; window < windows; window++) {
    const windowX =
      module.minX + 0.45 + window * ((width - 0.9) / Math.max(1, windows - 1));
    builder.box(
      "glow",
      "#bfe8ff",
      [0.32, 0.36, 0.04],
      [windowX, floor + 0.9, moduleFront + 0.01],
    );
    builder.box(
      "paint",
      panelWhite,
      [0.42, 0.06, 0.06],
      [windowX, floor + 0.7, moduleFront + 0.03],
    );
  }
  /* A white stripe round it, and panel seams */
  builder.box(
    "paint",
    panelWhite,
    [width - 0.48, 0.08, depth + 0.03],
    [x, top - 0.25, z],
  );
  for (let seam = 1; seam < 4; seam++) {
    builder.box(
      "paint",
      shade(module.colour, 0.85),
      [0.03, module.height - 0.1, 0.02],
      [
        module.minX + 0.25 + seam * ((width - 0.5) / 4),
        floor + module.height / 2,
        moduleFront + 0.02,
      ],
    );
  }
};

const buildModules = (builder: AttractionBuilder) => {
  modules.forEach((module) => {
    addModule(builder, module);
  });
  /* Covered bridges joining the modules */
  [-1.5, 1.5].forEach((x) => {
    builder.box(
      "paint",
      panelWhite,
      [0.5, 1.1, 1.0],
      [x, floor + 0.6, (moduleFront + moduleBack) / 2],
    );
  });
  /* A radar dome on the red module */
  const roof = floor + modules[1].height + 0.12;
  builder.lathe(
    "paint",
    panelWhite,
    [
      [0, 0],
      [0.55, 0],
      [0.62, 0.25],
      [0.55, 0.55],
      [0.35, 0.78],
      [0, 0.86],
    ],
    [-0.4, roof, -3.6],
    "y",
    14,
  );
  if (builder.isFar) {
    return;
  }
  builder.cylinder("paint", palette.darkSteel, {
    radius: 0.4,
    length: 0.18,
    at: [-0.4, roof + 0.05, -3.6],
    segments: 10,
  });
  /* Aerials and a mast with a red light */
  [0.6, 1.0].forEach((x, index) => {
    builder.cylinder("metal", palette.steel, {
      radius: 0.025,
      length: 1.2 + index * 0.4,
      at: [x, roof + 0.6 + index * 0.2, -3.0],
      segments: 5,
    });
  });
  builder.sphere(
    "glow",
    "#ff5a4a",
    0.05,
    [1.0, roof + 1.62, -3.0],
    [1, 1, 1],
    6,
  );
  /* Solar panels on the blue modules' roofs */
  [modules[0], modules[2]].forEach((module) => {
    const x = (module.minX + module.maxX) / 2;
    [-0.6, 0.6].forEach((dx) => {
      builder.box(
        "glass",
        "#24406a",
        [0.9, 0.04, 0.7],
        [x + dx, floor + module.height + 0.3, -3.8],
        [0.35, 0, 0],
      );
      builder.box(
        "metal",
        palette.steel,
        [0.04, 0.2, 0.04],
        [x + dx, floor + module.height + 0.18, -3.8],
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The walkway and stairs                                              */
/* ------------------------------------------------------------------ */

const buildWalkway = (builder: AttractionBuilder) => {
  const width = walkway.maxX - walkway.minX;
  const depth = walkway.maxZ - walkway.minZ;
  builder.box(
    "metal",
    deckGrey,
    [width, 0.1, depth],
    [0, floor - 0.05, (walkway.minZ + walkway.maxZ) / 2],
  );
  stairs.forEach(({ minZ, maxZ, height }) => {
    builder.box(
      "metal",
      deckGrey,
      [stairHalf * 2, 0.08, maxZ - minZ],
      [0, height - 0.04, (minZ + maxZ) / 2],
    );
    builder.box(
      "metal",
      palette.darkSteel,
      [stairHalf * 2, height - 0.08, 0.05],
      [0, (height - 0.08) / 2, maxZ - 0.03],
    );
  });
  /* Posts under the walkway's front edge */
  [-4.0, -2.0, 2.0, 4.0].forEach((x) => {
    builder.cylinder("paint", legYellow, {
      radius: 0.08,
      length: floor,
      at: [x, floor / 2, walkway.maxZ - 0.1],
      segments: 6,
    });
  });
  /* Railings along the front, open at the stairs, and up the stairs */
  const railY = floor + 0.9;
  [
    [walkway.minX, -stairHalf - 0.05],
    [stairHalf + 0.05, walkway.maxX],
  ].forEach(([fromX, toX]) => {
    builder.bar(
      "paint",
      legYellow,
      [fromX, railY, walkway.maxZ],
      [toX, railY, walkway.maxZ],
      0.06,
      6,
    );
    if (!builder.isFar) {
      builder.bar(
        "paint",
        legYellow,
        [fromX, railY - 0.45, walkway.maxZ],
        [toX, railY - 0.45, walkway.maxZ],
        0.04,
        5,
      );
    }
    const posts = Math.round((toX - fromX) / 0.7);
    for (let post = 0; post <= posts; post++) {
      builder.box(
        "paint",
        legYellow,
        [0.05, 0.9, 0.05],
        [fromX + ((toX - fromX) * post) / posts, floor + 0.45, walkway.maxZ],
      );
    }
  });
  [walkway.minX, walkway.maxX].forEach((x) => {
    builder.bar(
      "paint",
      legYellow,
      [x, railY, walkway.minZ],
      [x, railY, walkway.maxZ],
      0.06,
      6,
    );
    builder.box(
      "paint",
      legYellow,
      [0.05, 0.9, 0.05],
      [x, floor + 0.45, (walkway.minZ + walkway.maxZ) / 2],
    );
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      legYellow,
      [side * (stairHalf + 0.05), railY, walkway.maxZ],
      [side * (stairHalf + 0.05), 0.9 + 0.4, stairs[2].maxZ],
      0.05,
      6,
    );
    builder.box(
      "paint",
      legYellow,
      [0.05, 1.3, 0.05],
      [side * (stairHalf + 0.05), 0.65, stairs[2].maxZ],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Grating lines on the walkway, and doors into the modules */
  for (let line = 0; line < 14; line++) {
    builder.box(
      "metal",
      shade(deckGrey, 0.8),
      [0.03, 0.005, depth - 0.05],
      [
        walkway.minX + 0.3 + line * 0.6,
        floor + 0.003,
        (walkway.minZ + walkway.maxZ) / 2,
      ],
    );
  }
  [-2.95, 0, 2.95].forEach((x, index) => {
    builder.box(
      "paint",
      index === 1 ? panelWhite : shade(moduleBlue, 0.7),
      [0.6, 1.15, 0.04],
      [x + (index === 1 ? 0.75 : 0), floor + 0.58, moduleFront + 0.02],
    );
    builder.box(
      "glow",
      "#bfe8ff",
      [0.3, 0.25, 0.02],
      [x + (index === 1 ? 0.75 : 0), floor + 0.95, moduleFront + 0.05],
    );
  });
};

/* ------------------------------------------------------------------ */
/* Science round the base                                              */
/* ------------------------------------------------------------------ */

const buildScience = (builder: AttractionBuilder) => {
  /* The weather mast */
  builder.box(
    "metal",
    palette.steel,
    [0.12, 3.6, 0.12],
    [mastAt.x, 1.8, mastAt.z],
  );
  /* The wind turbine's tower */
  builder.cylinder("paint", panelWhite, {
    radius: 0.14,
    radiusEnd: 0.09,
    length: 3.4,
    at: [turbineAt.x, 1.7, turbineAt.z],
    segments: 8,
  });
  builder.box(
    "paint",
    panelWhite,
    [0.24, 0.24, 0.5],
    [turbineAt.x, 3.45, turbineAt.z - 0.1],
  );
  /* The balloon shed, with gas bottles outside */
  const shed = { x: balloonAt[0] + 0.3, z: balloonAt[2] - 1.6 };
  builder.box("paint", snowcatOrange, [1.3, 1.3, 1.0], [shed.x, 0.65, shed.z]);
  builder.box("paint", panelWhite, [1.4, 0.1, 1.1], [shed.x, 1.35, shed.z]);
  if (builder.isFar) {
    return;
  }
  [-0.4, 0.4].forEach((dz) => {
    builder.bar(
      "metal",
      palette.steel,
      [mastAt.x, 0, mastAt.z + dz * 2],
      [mastAt.x, 2.4, mastAt.z],
      0.02,
      4,
    );
  });
  builder.box(
    "paint",
    panelWhite,
    [0.3, 0.4, 0.2],
    [mastAt.x + 0.12, 1.2, mastAt.z + 0.12],
  );
  builder.box(
    "metal",
    palette.steel,
    [0.6, 0.04, 0.04],
    [mastAt.x, 3.0, mastAt.z],
  );
  builder.sphere(
    "paint",
    panelWhite,
    0.08,
    [mastAt.x + 0.3, 3.08, mastAt.z],
    [1, 1, 1],
    6,
  );
  builder.box(
    "paint",
    panelWhite,
    [0.4, 0.8, 0.04],
    [shed.x, 0.5, shed.z + 0.51],
  );
  [0, 1, 2].forEach((bottle) => {
    builder.cylinder("paint", "#3f9a4a", {
      radius: 0.1,
      length: 0.8,
      at: [shed.x - 0.8, 0.4, shed.z + 0.3 - bottle * 0.25],
      segments: 8,
    });
  });
  /* A little white box of thermometers on legs (a Stevenson screen) */
  const screen = { x: -4.6, z: 2.0 };
  [-0.2, 0.2].forEach((dx) => {
    builder.box(
      "paint",
      panelWhite,
      [0.05, 1.0, 0.05],
      [screen.x + dx, 0.5, screen.z],
    );
  });
  builder.box(
    "paint",
    panelWhite,
    [0.55, 0.45, 0.45],
    [screen.x, 1.2, screen.z],
  );
  builder.add(
    "paint",
    panelWhite,
    new ConeGeometry(0.42, 0.18, 4).rotateY(Math.PI / 4),
    {
      at: [screen.x, 1.52, screen.z],
    },
  );
  for (let slat = 0; slat < 4; slat++) {
    builder.box(
      "paint",
      shade(panelWhite, 0.85),
      [0.5, 0.02, 0.02],
      [screen.x, 1.04 + slat * 0.1, screen.z + 0.23],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The grounds: snowcat, seal hole, flag line                          */
/* ------------------------------------------------------------------ */

const buildSnowcat = (builder: AttractionBuilder) => {
  const { x, z } = snowcatAt;
  [-0.55, 0.55].forEach((dx) => {
    builder.box("matte", palette.black, [0.32, 0.4, 1.9], [x + dx, 0.2, z]);
    if (!builder.isFar) {
      [-0.6, 0, 0.6].forEach((dz) => {
        builder.cylinder("metal", palette.darkSteel, {
          radius: 0.14,
          length: 0.34,
          at: [x + dx, 0.2, z + dz],
          axis: "x",
          segments: 8,
        });
      });
    }
  });
  builder.box("paint", snowcatOrange, [1.3, 0.4, 1.8], [x, 0.58, z]);
  builder.box("paint", snowcatOrange, [1.1, 0.6, 1.0], [x, 1.08, z - 0.3]);
  builder.box("glass", palette.glass, [1.12, 0.36, 0.04], [x, 1.14, z + 0.21]);
  if (builder.isFar) {
    return;
  }
  [-0.56, 0.56].forEach((dx) => {
    builder.box(
      "glass",
      palette.glass,
      [0.03, 0.32, 0.7],
      [x + dx, 1.14, z - 0.3],
    );
  });
  builder.box("paint", panelWhite, [1.2, 0.08, 1.1], [x, 1.42, z - 0.3]);
  [-0.4, 0.4].forEach((dx) => {
    builder.box(
      "glow",
      palette.warmLight,
      [0.16, 0.1, 0.03],
      [x + dx, 0.66, z + 0.91],
    );
  });
  builder.box(
    "metal",
    palette.steel,
    [1.6, 0.5, 0.06],
    [x, 0.38, z + 1.15],
    [-0.3, 0, 0],
  );
  builder.box("paint", palette.black, [0.9, 0.06, 0.06], [x, 1.5, z - 0.3]);
};

const firs: [number, number, number][] = [
  [-7.0, -4.6, 1.0],
  [7.2, -4.2, 0.9],
];

const addFir = (builder: AttractionBuilder, x: number, z: number, size = 1) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.1 * size,
    length: 0.5 * size,
    at: [x, 0.25 * size, z],
    segments: 6,
  });
  for (let tier = 0; tier < 3; tier++) {
    const radius = (0.85 - tier * 0.22) * size;
    const y = (0.5 + tier * 0.55) * size;
    builder.add(
      "matte",
      shade("#2d5a40", 1 + tier * 0.07),
      new ConeGeometry(radius, 0.95 * size, builder.segments(9, 6)),
      {
        at: [x, y + 0.45 * size, z],
      },
    );
    if (!builder.isFar) {
      builder.add(
        "matte",
        frostWhite,
        new ConeGeometry(radius * 0.55, 0.34 * size, 9),
        {
          at: [x, y + 0.78 * size, z],
        },
      );
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  buildSnowcat(builder);
  firs.forEach(([x, z, size]) => {
    addFir(builder, x, z, size);
  });
  /* A hole in the sea ice, where a seal comes up to breathe */
  builder.cylinder("water", iceHole, {
    radius: 0.55,
    length: 0.03,
    at: [sealHole.x, 0.02, sealHole.z],
    segments: 14,
  });
  builder.torus(
    "matte",
    snowShadow,
    0.6,
    0.1,
    [sealHole.x, 0.04, sealHole.z],
    "y",
    16,
  );
  if (builder.isFar) {
    return;
  }
  /* A line of flags marking the safe route, black and orange */
  [
    [1.2, 5.6],
    [3.0, 6.4],
    [4.8, 6.2],
    [6.4, 5.0],
  ].forEach(([x, z], index) => {
    builder.cylinder("matte", palette.paleTimber, {
      radius: 0.025,
      length: 1.3,
      at: [x, 0.65, z],
      segments: 5,
    });
    builder.box(
      "matte",
      index % 2 === 0 ? palette.black : snowcatOrange,
      [0.3, 0.22, 0.02],
      [x + 0.16, 1.15, z],
    );
  });
  /* Fuel drums and a cargo sledge */
  [
    [5.6, -1.4],
    [6.0, -1.0],
    [5.9, -1.8],
  ].forEach(([x, z], index) => {
    builder.cylinder("paint", index === 1 ? moduleBlue : moduleRed, {
      radius: 0.22,
      length: 0.6,
      at: [x, 0.3, z],
      segments: 10,
    });
    builder.torus("metal", palette.steel, 0.22, 0.015, [x, 0.4, z], "y", 10);
  });
  builder.box("paint", palette.darkSteel, [1.0, 0.12, 2.0], [-5.6, 0.12, -3.6]);
  builder.box("matte", "#b8a27a", [0.8, 0.5, 0.7], [-5.6, 0.45, -3.2]);
  builder.box("matte", "#3f6f4a", [0.8, 0.45, 0.7], [-5.6, 0.42, -4.0]);
  [
    [-6.8, 0.6, 0.5],
    [6.8, 1.4, 0.45],
    [0.4, -6.6, 0.6],
    [-3.2, -6.4, 0.45],
    [3.8, -6.2, 0.5],
    [-6.2, 6.0, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", frostWhite, size, [x, 0, z], [1.6, 0.45, 1.1], 10);
  });
  /* Pressure ridges in the sea ice */
  [
    [-3.4, 5.6, 0.4],
    [-0.4, 6.0, -0.3],
  ].forEach(([x, z, turn]) => {
    for (let block = 0; block < 3; block++) {
      builder.box(
        "glass",
        "#cfeaf6",
        [0.4, 0.22, 0.3],
        [x + block * 0.36, 0.1, z],
        [0.3 * block, turn, 0.2],
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/** The weather balloon, floating up when you come to launch it. */
const buildBalloon = (builder: AttractionBuilder) => {
  builder.sphere("paint", frostWhite, 0.55, [0, 1.9, 0], [1, 1.15, 1], 14);
  builder.add(
    "paint",
    frostWhite,
    new ConeGeometry(0.12, 0.3, 8).rotateX(Math.PI),
    {
      at: [0, 1.15, 0],
    },
  );
  builder.bar("matte", palette.darkSteel, [0, 1.0, 0], [0, 0.45, 0], 0.012, 3);
  builder.box("paint", snowcatOrange, [0.16, 0.18, 0.12], [0, 0.36, 0]);
  if (!builder.isFar) {
    builder.box("metal", palette.steel, [0.02, 0.1, 0.02], [0.06, 0.22, 0]);
  }
};

const cupsAt: Triple = [mastAt.x, 3.65, mastAt.z];

const buildCups = (builder: AttractionBuilder) => {
  for (let arm = 0; arm < 3; arm++) {
    const angle = (arm / 3) * Math.PI * 2;
    const end: Triple = [Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3];
    builder.bar("metal", palette.steel, [0, 0, 0], end, 0.025, 4);
    builder.sphere("paint", moduleRed, 0.07, end, [1, 1, 1], 8);
  }
};

const dishAt: Triple = [3.0, floor + moduleHeight + 0.12, -3.3];

/** A satellite dish that turns to find its satellite as you come near. */
const buildDish = (builder: AttractionBuilder) => {
  builder.cylinder("metal", palette.steel, {
    radius: 0.06,
    length: 0.5,
    at: [0, 0.25, 0],
    segments: 6,
  });
  builder.lathe(
    "paint",
    panelWhite,
    [
      [0, 0],
      [0.25, 0.04],
      [0.45, 0.15],
      [0.5, 0.2],
    ],
    [0, 0.55, 0.05],
    "z",
    14,
  );
  builder.bar("metal", palette.steel, [0, 0.55, 0.1], [0, 0.55, 0.5], 0.02, 4);
  builder.sphere(
    "paint",
    palette.darkSteel,
    0.05,
    [0, 0.55, 0.5],
    [1, 1, 1],
    6,
  );
};

const turbineHubAt: Triple = [turbineAt.x, 3.45, turbineAt.z + 0.2];

const buildTurbineBlades = (builder: AttractionBuilder) => {
  builder.sphere("paint", panelWhite, 0.12, [0, 0, 0.05], [1, 1, 1.3], 8);
  for (let blade = 0; blade < 3; blade++) {
    const angle = (blade / 3) * Math.PI * 2;
    builder.box(
      "paint",
      panelWhite,
      [0.14, 1.3, 0.03],
      [Math.sin(angle) * 0.68, Math.cos(angle) * 0.68, 0.06],
      [0, 0, -angle],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        moduleRed,
        [0.145, 0.2, 0.035],
        [Math.sin(angle) * 1.22, Math.cos(angle) * 1.22, 0.06],
        [0, 0, -angle],
      );
    }
  }
};

/** A Weddell seal, popping up through the ice to breathe. */
const buildSeal = (builder: AttractionBuilder) => {
  const coat = "#5d6670";
  builder.sphere("matte", coat, 0.3, [0, 0.0, 0], [1, 1.5, 1], 12);
  builder.sphere("matte", coat, 0.2, [0, 0.45, 0.06], [1, 0.95, 1.05], 10);
  builder.sphere(
    "matte",
    shade(coat, 1.25),
    0.1,
    [0, 0.4, 0.22],
    [1, 0.8, 0.9],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.035,
      [side * 0.09, 0.5, 0.2],
      [1, 1, 1],
      6,
    );
    builder.box(
      "matte",
      shade(coat, 0.8),
      [0.16, 0.05, 0.25],
      [side * 0.3, 0.1, 0.08],
      [0, side * 0.4, side * 0.6],
    );
  });
  builder.sphere(
    "paint",
    palette.black,
    0.03,
    [0, 0.43, 0.3],
    [1.2, 0.8, 1],
    6,
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      [0, 1].forEach((whisker) => {
        builder.bar(
          "matte",
          frostWhite,
          [side * 0.05, 0.4, 0.28],
          [side * 0.2, 0.38 + whisker * 0.04, 0.32],
          0.006,
          3,
        );
      });
    });
    [0, 1, 2].forEach((spot) => {
      builder.sphere(
        "matte",
        shade(coat, 0.7),
        0.05,
        [0.12 - spot * 0.1, 0.1 + spot * 0.08, 0.27],
        [1, 1, 0.3],
        5,
      );
    });
  }
};

const moving: MovingPart[] = [
  {
    name: "weather balloon",
    pivot: balloonAt,
    build: buildBalloon,
    motion: { kind: "rise", reach: 5, height: 2.6, period: 2.4 },
  },
  {
    name: "wind cups",
    pivot: cupsAt,
    build: buildCups,
    motion: { kind: "whirl", axis: "y", idle: 1.5, speed: 8, reach: 7 },
  },
  {
    name: "satellite dish",
    pivot: dishAt,
    build: buildDish,
    motion: { kind: "nod", axis: "y", reach: 8, amplitude: 0.6, period: 3 },
  },
  {
    name: "wind turbine",
    pivot: turbineHubAt,
    build: buildTurbineBlades,
    motion: { kind: "spin", axis: "z", speed: 1.4 },
  },
  {
    name: "Weddell seal",
    pivot: [sealHole.x, -0.55, sealHole.z],
    build: buildSeal,
    motion: { kind: "rise", reach: 4, height: 0.6, period: 1.8 },
  },
];

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

/** An emperor penguin, tall, with golden ear patches. */
const buildEmperor = (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    "#2a3038",
    0.2,
    [0, 0.36, -0.02],
    [0.95, 1.8, 0.85],
    10,
  );
  builder.sphere(
    "matte",
    frostWhite,
    0.17,
    [0, 0.34, 0.05],
    [0.9, 1.75, 0.75],
    10,
  );
  builder.sphere("matte", "#2a3038", 0.11, [0, 0.74, 0.02], [1, 1, 1.05], 9);
  builder.add(
    "paint",
    "#2a3038",
    new ConeGeometry(0.03, 0.14, 5).rotateX(Math.PI / 2 + 0.3),
    {
      at: [0, 0.71, 0.15],
    },
  );
  builder.sphere("paint", "#f0b62e", 0.05, [0, 0.62, 0.1], [1.4, 0.8, 0.6], 6);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#f0a62e",
      0.035,
      [side * 0.09, 0.72, 0.06],
      [0.6, 1.4, 0.8],
      5,
    );
    builder.box(
      "matte",
      "#2a3038",
      [0.04, 0.32, 0.12],
      [side * 0.18, 0.4, 0],
      [0, 0, side * 0.2],
    );
    builder.box(
      "paint",
      "#3a3a3a",
      [0.07, 0.02, 0.12],
      [side * 0.06, 0.01, 0.05],
    );
  });
};

const buildScientist = (builder: AttractionBuilder) => {
  [-0.08, 0.08].forEach((side) => {
    builder.box("matte", "#3a2a22", [0.11, 0.12, 0.19], [side, 0.06, 0.02]);
    builder.cylinder("matte", "#2b3442", {
      radius: 0.055,
      length: 0.34,
      at: [side, 0.29, 0],
      segments: 6,
    });
  });
  builder.lathe(
    "matte",
    moduleRed,
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
  builder.bar("matte", moduleRed, [0.15, 0.78, 0], [0.24, 0.55, 0.12], 0.08, 5);
  builder.bar("matte", moduleRed, [-0.15, 0.78, 0], [-0.1, 0.6, 0.2], 0.08, 5);
  /* A clipboard of readings */
  builder.box(
    "paint",
    panelWhite,
    [0.18, 0.24, 0.02],
    [-0.04, 0.66, 0.24],
    [-0.6, 0, 0],
  );
  builder.torus("matte", "#c9b48f", 0.11, 0.045, [0, 0.96, 0.03], "z", 10);
  builder.sphere("matte", moduleRed, 0.14, [0, 0.96, -0.02], [1, 1.05, 1], 9);
  builder.sphere("matte", "#e8b894", 0.085, [0, 0.95, 0.06], [1, 1, 0.8], 8);
  if (!builder.isFar) {
    builder.box("paint", palette.black, [0.16, 0.04, 0.02], [0, 0.98, 0.13]);
  }
};

const wanderers: Wanderers[] = [
  {
    name: "emperor penguins",
    build: buildEmperor,
    count: 3,
    centre: { x: -3.6, z: 4.4 },
    radius: 1.3,
    speed: 0.35,
    bob: 0.05,
  },
  {
    name: "scientists on the walkway",
    build: buildScientist,
    count: 1,
    centre: { x: -2.6, z: -1.4 },
    radius: 0.5,
    speed: 0.3,
    height: floor,
  },
];

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

const build = (builder: AttractionBuilder) => {
  buildModules(builder);
  buildWalkway(builder);
  buildScience(builder);
  buildGrounds(builder);
  addSignBoard(builder, signAt, signColour);
};

const decks: Deck[] = [
  buildFlatDeck(walkway, floor),
  ...stairs.map(({ minZ, maxZ, height }) =>
    buildFlatDeck({ minX: -stairHalf, maxX: stairHalf, minZ, maxZ }, height),
  ),
];

export const polarResearchBaseModel: NewLandAttractionModel = {
  kind: "polar-research-base",
  islandId: "frost-isle",
  name: "Polar Research Base",
  fact: "Scientists live at research bases in Antarctica to study the weather, the ice and the animals, such as emperor penguins. Penguins are well suited to their freezing habitat: a thick layer of fat and tightly packed feathers keep them warm, and in winter storms they huddle together. Some bases stand on legs with skis, so they can be moved when the snow piles up.",
  curriculumLink:
    "Science, Year 2: identify that most living things live in habitats to which they are suited, and describe how different habitats provide for the basic needs of different kinds of animals.",
  footprint: 10,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 0.8 },
  build,
  moving,
  wanderers,
  decks,
  blockers: [
    ...firs.map(([x, z, size]) => ({ x, z, radius: 0.35 * size })),
    { x: snowcatAt.x, z: snowcatAt.z, radius: 0.9 },
  ] satisfies LocalBlocker[],
  tune: [84, 84, 88, 84, 91, 88],
  play: {
    label: "Launch a weather balloon",
    news: "Up, up and away! The weather balloon floated high into the sky to measure how cold and windy it is, and sent its readings back to the scientists.",
  },
};
