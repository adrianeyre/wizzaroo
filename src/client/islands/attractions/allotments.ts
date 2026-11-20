import { CylinderGeometry, LatheGeometry, TorusGeometry, Vector2 } from "three";
import {
  addBench,
  addBush,
  addFence,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Triple,
} from "./attraction-kit.js";

const soil = "#5a3d27";
const soilRidge = "#6b4a30";
const edging = "#8a6a48";
const shedSage = "#6f8a6a";
const shedTrim = "#e8e1cf";
const felt = "#34373b";
const cabbageGreen = "#6f9a7c";
const lettuceGreen = "#8cc152";
const leafGreen = "#4f8a3c";
const strawColour = "#d8b25a";

interface Plot {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const plots = {
  cabbages: { minX: -6.2, maxX: -1.1, minZ: 1.2, maxZ: 5.3 },
  carrots: { minX: -6.2, maxX: -1.1, minZ: -3.3, maxZ: -0.7 },
  beans: { minX: 1.1, maxX: 6.2, minZ: 1.2, maxZ: 5.3 },
  pumpkins: { minX: 1.1, maxX: 6.2, minZ: -4.4, maxZ: -0.7 },
} satisfies Record<string, Plot>;

const buildPlotBed = (builder: AttractionBuilder, plot: Plot) => {
  const width = plot.maxX - plot.minX;
  const depth = plot.maxZ - plot.minZ;
  const centreX = (plot.minX + plot.maxX) / 2;
  const centreZ = (plot.minZ + plot.maxZ) / 2;
  builder.box("matte", soil, [width, 0.12, depth], [centreX, 0.06, centreZ]);
  [plot.minZ, plot.maxZ].forEach((edgeZ) => {
    builder.box(
      "matte",
      edging,
      [width + 0.1, 0.18, 0.06],
      [centreX, 0.09, edgeZ],
    );
  });
  [plot.minX, plot.maxX].forEach((edgeX) => {
    builder.box(
      "matte",
      edging,
      [0.06, 0.18, depth + 0.1],
      [edgeX, 0.09, centreZ],
    );
  });
};

/** Raised soil ridges running along x. */
const addRows = (
  builder: AttractionBuilder,
  plot: Plot,
  rowZs: readonly number[],
) => {
  const width = plot.maxX - plot.minX - 0.3;
  const centreX = (plot.minX + plot.maxX) / 2;
  rowZs.forEach((rowZ) => {
    builder.box("matte", soilRidge, [width, 0.08, 0.42], [centreX, 0.14, rowZ]);
  });
};

const spreadAlong = (plot: Plot, count: number, margin = 0.45): number[] =>
  Array.from(
    { length: count },
    (_, index) =>
      plot.minX +
      margin +
      ((plot.maxX - plot.minX - margin * 2) * index) / Math.max(1, count - 1),
  );

/* The crops */

const addCabbage = (builder: AttractionBuilder, x: number, z: number) => {
  builder.sphere(
    "matte",
    shade(cabbageGreen, 0.82),
    0.3,
    [x, 0.2, z],
    [1, 0.42, 1],
    builder.segments(8, 5),
  );
  builder.sphere(
    "matte",
    cabbageGreen,
    0.19,
    [x, 0.3, z],
    [1, 0.88, 1],
    builder.segments(8, 5),
  );
};

const addLettuce = (builder: AttractionBuilder, x: number, z: number) => {
  builder.sphere(
    "matte",
    lettuceGreen,
    0.2,
    [x, 0.22, z],
    [1, 0.6, 1],
    builder.segments(7, 5),
  );
};

const addCarrotTops = (builder: AttractionBuilder, x: number, z: number) => {
  [-0.5, 0.15, 0.8].forEach((lean, frond) => {
    builder.cylinder("matte", frond === 1 ? "#5d9c3a" : "#4c8a32", {
      radius: 0.06,
      radiusEnd: 0.005,
      length: 0.34,
      at: [x + Math.sin(lean) * 0.06, 0.32, z + Math.cos(lean * 2) * 0.03],
      segments: 4,
    });
  });
  builder.cylinder("matte", "#e0782f", {
    radius: 0.04,
    length: 0.05,
    at: [x, 0.17, z],
    segments: 5,
  });
};

const addBeanWigwam = (builder: AttractionBuilder, x: number, z: number) => {
  const canes = 5;
  const top: Triple = [x, 1.85, z];
  for (let cane = 0; cane < canes; cane++) {
    const angle = (cane / canes) * Math.PI * 2 + 0.3;
    builder.bar(
      "matte",
      "#c9a86a",
      [x + Math.sin(angle) * 0.42, 0.1, z + Math.cos(angle) * 0.42],
      [
        top[0] - Math.sin(angle) * 0.06,
        top[1] + 0.12,
        top[2] - Math.cos(angle) * 0.06,
      ],
      0.035,
      4,
    );
  }
  if (builder.isFar) {
    builder.cylinder("matte", leafGreen, {
      radius: 0.42,
      radiusEnd: 0.08,
      length: 1.6,
      at: [x, 0.95, z],
      segments: 6,
    });
    return;
  }
  const clumps = 8;
  for (let clump = 0; clump < clumps; clump++) {
    const share = clump / clumps;
    const angle = clump * 2.2;
    const spread = 0.4 * (1 - share * 0.8);
    builder.sphere(
      "matte",
      clump % 2 === 0 ? leafGreen : shade(leafGreen, 1.15),
      0.2 - share * 0.07,
      [
        x + Math.sin(angle) * spread,
        0.35 + share * 1.45,
        z + Math.cos(angle) * spread,
      ],
      [1, 0.85, 1],
      6,
    );
    if (clump % 2 === 1) {
      builder.sphere(
        "matte",
        "#d8432f",
        0.045,
        [
          x + Math.sin(angle) * (spread + 0.15),
          0.38 + share * 1.45,
          z + Math.cos(angle) * (spread + 0.15),
        ],
        [1, 1, 1],
        5,
      );
    }
  }
};

const addSunflower = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  height: number,
) => {
  builder.cylinder("matte", "#5f8a33", {
    radius: 0.035,
    length: height,
    at: [x, height / 2, z],
    segments: 5,
  });
  [0.45, 0.8].forEach((share, leaf) => {
    const side = leaf === 0 ? 1 : -1;
    builder.sphere(
      "matte",
      leafGreen,
      0.16,
      [x + side * 0.14, height * share, z],
      [1.3, 0.3, 0.8],
      6,
    );
  });
  const face: Triple = [x, height, z + 0.06];
  builder.cylinder("matte", "#f2b62a", {
    radius: 0.3,
    length: 0.04,
    at: face,
    axis: "z",
    segments: builder.segments(14, 6),
  });
  if (!builder.isFar) {
    const petals = 10;
    for (let petal = 0; petal < petals; petal++) {
      const angle = (petal / petals) * Math.PI * 2;
      builder.box(
        "matte",
        petal % 2 === 0 ? "#f6c536" : "#eaa61f",
        [0.1, 0.16, 0.02],
        [
          face[0] + Math.sin(angle) * 0.32,
          face[1] + Math.cos(angle) * 0.32,
          face[2] - 0.01,
        ],
        [0, 0, -angle],
      );
    }
  }
  builder.cylinder("matte", "#5a3a1e", {
    radius: 0.16,
    length: 0.06,
    at: [face[0], face[1], face[2] + 0.02],
    axis: "z",
    segments: builder.segments(12, 6),
  });
};

const addPumpkin = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  size: number,
) => {
  builder.sphere(
    "matte",
    "#e07a26",
    size,
    [x, 0.12 + size * 0.7, z],
    [1.15, 0.78, 1.15],
    builder.segments(10, 6),
  );
  builder.cylinder("matte", "#5a6b2e", {
    radius: 0.03,
    length: 0.1,
    at: [x, 0.12 + size * 1.45, z],
    segments: 5,
  });
  if (!builder.isFar) {
    [0.9, 3.6].forEach((angle) => {
      builder.sphere(
        "matte",
        leafGreen,
        0.26,
        [x + Math.sin(angle) * size * 1.4, 0.2, z + Math.cos(angle) * size],
        [1.2, 0.25, 1],
        6,
      );
    });
  }
};

const addGardenFork = (builder: AttractionBuilder, x: number, z: number) => {
  builder.bar(
    "matte",
    palette.paleTimber,
    [x, 0.3, z],
    [x + 0.08, 1.15, z],
    0.045,
    5,
  );
  builder.add(
    "matte",
    palette.black,
    new TorusGeometry(0.07, 0.018, 4, builder.segments(8, 4), Math.PI),
    { at: [x + 0.085, 1.16, z], rotation: [0, 0, 0.09] },
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.22, 0.06, 0.03],
    [x - 0.005, 0.28, z],
  );
  if (!builder.isFar) {
    [-0.09, -0.03, 0.03, 0.09].forEach((tineX) => {
      builder.box(
        "metal",
        palette.darkSteel,
        [0.02, 0.18, 0.02],
        [x + tineX, 0.18, z],
      );
    });
  }
};

const buildCrops = (builder: AttractionBuilder) => {
  Object.values(plots).forEach((plot) => {
    buildPlotBed(builder, plot);
  });
  const cabbageRows = [4.6, 3.7];
  addRows(builder, plots.cabbages, [...cabbageRows, 2.0]);
  cabbageRows.forEach((rowZ, row) => {
    spreadAlong(plots.cabbages, 6).forEach((x, index) => {
      if (row === 1 && index === 2) {
        return;
      }
      addCabbage(builder, x + (row % 2) * 0.2, rowZ);
    });
  });
  spreadAlong(plots.cabbages, 7).forEach((x) => {
    addLettuce(builder, x, 2.0);
  });
  const carrotRows = [-1.3, -2.0, -2.7];
  addRows(builder, plots.carrots, carrotRows);
  carrotRows.forEach((rowZ, row) => {
    spreadAlong(plots.carrots, builder.isFar ? 4 : 9, 0.35).forEach((x) => {
      addCarrotTops(builder, x + (row % 2) * 0.12, rowZ);
    });
  });
  addRows(builder, plots.beans, [2.0]);
  [2.3, 3.75, 5.2].forEach((x) => {
    addBeanWigwam(builder, x, 4.0);
  });
  spreadAlong(plots.beans, 6).forEach((x) => {
    addLettuce(builder, x, 2.0);
  });
  [1.7, 2.45, 3.2, 3.95].forEach((x, index) => {
    addSunflower(builder, x, -3.95, 2.0 + (index % 2) * 0.35 - index * 0.04);
  });
  addGardenFork(builder, 1.75, -2.75);
  addPumpkin(builder, 2.2, -1.6, 0.3);
  addPumpkin(builder, 3.6, -2.1, 0.36);
  addPumpkin(builder, 5.1, -1.4, 0.26);
  addPumpkin(builder, 5.0, -3.0, 0.32);
};

/* The shed and water butt */

const shed = { x: -3.9, z: -4.75, width: 2.5, depth: 1.7, wall: 1.65 };
const shedRise = 0.55;

const buildShed = (builder: AttractionBuilder) => {
  const { x, z, width, depth, wall } = shed;
  const front = z + depth / 2;
  [-0.6, 0.6].forEach((bearer) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [width + 0.1, 0.12, 0.12],
      [x, 0.06, z + bearer],
    );
  });
  builder.box("matte", shedSage, [width, wall, depth], [x, 0.12 + wall / 2, z]);
  if (!builder.isFar) {
    for (let board = 1; board < 9; board++) {
      builder.box(
        "matte",
        shade(shedSage, 0.86),
        [width + 0.02, 0.025, depth + 0.02],
        [x, 0.12 + board * (wall / 9), z],
      );
    }
  }
  const gable = new LatheGeometry(
    [new Vector2(0, shedRise), new Vector2(0.5, 0), new Vector2(0, 0)],
    4,
  );
  gable.rotateY(Math.PI / 4);
  gable.scale(0.05 / 0.71, 1, depth / 0.71);
  [x - width / 2 + 0.02, x + width / 2 - 0.02].forEach((gableX) => {
    builder.add("matte", shedSage, gable.clone(), {
      at: [gableX, 0.12 + wall, z],
    });
  });
  const roofBase = 0.12 + wall;
  const overhang = 0.22;
  const halfDepth = depth / 2 + overhang;
  const slope = Math.hypot(halfDepth, shedRise + overhang * 0.32);
  const angle = Math.atan2(shedRise + overhang * 0.32, halfDepth);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      felt,
      [width + 0.36, 0.07, slope],
      [x, roofBase + shedRise / 2 - 0.04, z + (side * halfDepth) / 2],
      [side * angle, 0, 0],
    );
    builder.box(
      "paint",
      shedTrim,
      [width + 0.38, 0.12, 0.03],
      [x, roofBase - 0.1, z + side * (halfDepth - 0.02)],
    );
  });
  builder.box(
    "matte",
    shade(felt, 0.8),
    [width + 0.4, 0.06, 0.12],
    [x, roofBase + shedRise + 0.02, z],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      shedTrim,
      [x + side * (width / 2 + 0.2), roofBase - 0.05, z - halfDepth],
      [x + side * (width / 2 + 0.2), roofBase + shedRise + 0.05, z],
      0.05,
      4,
    );
    builder.bar(
      "paint",
      shedTrim,
      [x + side * (width / 2 + 0.2), roofBase - 0.05, z + halfDepth],
      [x + side * (width / 2 + 0.2), roofBase + shedRise + 0.05, z],
      0.05,
      4,
    );
  });
  const doorX = x - 0.55;
  builder.box(
    "paint",
    shade(shedSage, 0.75),
    [0.72, 1.35, 0.05],
    [doorX, 0.12 + 0.69, front + 0.02],
  );
  builder.box(
    "paint",
    shedTrim,
    [0.84, 0.07, 0.07],
    [doorX, 0.12 + 1.4, front + 0.03],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      shedTrim,
      [0.07, 1.4, 0.07],
      [doorX + side * 0.4, 0.12 + 0.7, front + 0.03],
    );
  });
  if (!builder.isFar) {
    [0.3, 1.1].forEach((braceY) => {
      builder.box(
        "paint",
        shade(shedSage, 0.62),
        [0.64, 0.08, 0.03],
        [doorX, 0.12 + braceY, front + 0.05],
      );
    });
    builder.box(
      "paint",
      shade(shedSage, 0.62),
      [0.08, 0.9, 0.03],
      [doorX, 0.12 + 0.7, front + 0.05],
      [0, 0, 0.62],
    );
    builder.sphere("metal", palette.darkSteel, 0.035, [
      doorX + 0.26,
      0.85,
      front + 0.08,
    ]);
  }
  const windowX = x + 0.55;
  const windowY = 0.12 + 0.98;
  builder.box(
    "glass",
    palette.glass,
    [0.7, 0.5, 0.04],
    [windowX, windowY, front + 0.01],
  );
  builder.box(
    "paint",
    shedTrim,
    [0.8, 0.06, 0.06],
    [windowX, windowY + 0.28, front + 0.03],
  );
  builder.box(
    "paint",
    shedTrim,
    [0.8, 0.06, 0.06],
    [windowX, windowY - 0.28, front + 0.03],
  );
  if (!builder.isFar) {
    [-0.37, 0, 0.37].forEach((barX) => {
      builder.box(
        "paint",
        shedTrim,
        [0.05, 0.5, 0.06],
        [windowX + barX, windowY, front + 0.03],
      );
    });
    builder.box(
      "paint",
      shedTrim,
      [0.7, 0.04, 0.06],
      [windowX, windowY, front + 0.03],
    );
    builder.box(
      "matte",
      palette.timber,
      [0.8, 0.16, 0.2],
      [windowX, windowY - 0.38, front + 0.12],
    );
    [-0.27, -0.09, 0.09, 0.27].forEach((flowerX, flower) => {
      builder.sphere(
        "matte",
        flower % 2 === 0 ? "#d9577a" : "#f4f1ea",
        0.08,
        [windowX + flowerX, windowY - 0.26, front + 0.12],
        [1, 0.8, 1],
        6,
      );
    });
  }
  builder.cylinder("paint", palette.black, {
    radius: 0.05,
    length: width + 0.3,
    at: [x, roofBase - 0.2, front + overhang],
    axis: "x",
    segments: 6,
  });
};

const butt = { x: -2.15, z: -4.3 };

const buildWaterButt = (builder: AttractionBuilder) => {
  const { x, z } = butt;
  builder.box("matte", palette.darkBrick, [0.5, 0.24, 0.5], [x, 0.12, z]);
  builder.cylinder("paint", "#2f5a35", {
    radius: 0.32,
    radiusEnd: 0.3,
    length: 0.95,
    at: [x, 0.24 + 0.475, z],
    segments: builder.segments(14, 8),
  });
  [0.45, 0.95].forEach((hoopY) => {
    builder.cylinder("paint", shade("#2f5a35", 0.8), {
      radius: 0.33,
      length: 0.05,
      at: [x, hoopY, z],
      segments: builder.segments(14, 8),
    });
  });
  builder.cylinder("paint", shade("#2f5a35", 0.85), {
    radius: 0.34,
    length: 0.05,
    at: [x, 1.21, z],
    segments: builder.segments(14, 8),
  });
  builder.bar(
    "paint",
    palette.black,
    [x - 0.2, 1.24, z],
    [shed.x + shed.width / 2 + 0.05, 1.7, shed.z + shed.depth / 2 + 0.2],
    0.07,
    6,
  );
  if (!builder.isFar) {
    builder.cylinder("metal", palette.brass, {
      radius: 0.03,
      length: 0.12,
      at: [x, 0.42, z + 0.36],
      axis: "z",
      segments: 6,
    });
    const can: Triple = [x + 0.15, 0, z + 0.75];
    builder.cylinder("paint", "#2f6f73", {
      radius: 0.15,
      radiusEnd: 0.13,
      length: 0.28,
      at: [can[0], 0.14, can[2]],
      segments: 10,
    });
    builder.bar(
      "paint",
      "#2f6f73",
      [can[0] + 0.1, 0.12, can[2]],
      [can[0] + 0.36, 0.34, can[2]],
      0.04,
      5,
    );
    builder.cylinder("paint", "#2f6f73", {
      radius: 0.05,
      radiusEnd: 0.03,
      length: 0.06,
      at: [can[0] + 0.38, 0.36, can[2]],
      axis: "x",
      segments: 6,
    });
    builder.torus(
      "paint",
      "#2f6f73",
      0.11,
      0.02,
      [can[0], 0.3, can[2]],
      "z",
      10,
    );
  }
};

/* The scarecrow */

const scarecrowAt = { x: -3.55, z: 2.85 };

const buildScarecrow = (builder: AttractionBuilder) => {
  const { x, z } = scarecrowAt;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 2.05,
    at: [x, 1.02, z],
    segments: 6,
  });
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 1.5,
    at: [x, 1.42, z],
    axis: "x",
    segments: 6,
  });
  const coat = "#5d6b47";
  builder.cylinder("matte", coat, {
    radius: 0.34,
    radiusEnd: 0.24,
    length: 0.85,
    at: [x, 1.05, z],
    segments: builder.segments(8, 6),
  });
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", coat, {
      radius: 0.11,
      radiusEnd: 0.13,
      length: 0.6,
      at: [x + side * 0.48, 1.42, z],
      axis: "x",
      segments: 6,
    });
    builder.cylinder("matte", strawColour, {
      radius: 0.1,
      radiusEnd: 0.02,
      length: 0.18,
      at: [x + side * 0.84, 1.42, z],
      axis: "x",
      segments: 5,
    });
  });
  builder.cylinder("matte", strawColour, {
    radius: 0.3,
    radiusEnd: 0.1,
    length: 0.22,
    at: [x, 0.55, z],
    segments: 7,
  });
  builder.sphere("matte", "#d9c08c", 0.2, [x, 1.72, z], [1, 1.05, 1], 10);
  builder.lathe(
    "matte",
    "#6b4a2b",
    [
      [0, 0.24],
      [0.14, 0.23],
      [0.15, 0.06],
      [0.32, 0.03],
      [0.33, 0],
      [0, 0],
    ],
    [x, 1.83, z],
    "y",
    builder.segments(12, 6),
  );
  if (!builder.isFar) {
    builder.box(
      "matte",
      "#a8552f",
      [0.2, 0.2, 0.02],
      [x - 0.12, 1.15, z + 0.29],
      [0, 0, 0.2],
    );
    builder.box(
      "matte",
      "#c79a3b",
      [0.14, 0.14, 0.02],
      [x + 0.14, 0.85, z + 0.31],
      [0, 0, -0.3],
    );
    builder.box(
      "matte",
      "#3a3f58",
      [0.12, 0.12, 0.02],
      [x - 0.48, 1.54, z + 0.02],
      [0, 0, 0.4],
    );
    [-0.07, 0.07].forEach((eyeX) => {
      builder.sphere(
        "matte",
        palette.black,
        0.03,
        [x + eyeX, 1.76, z + 0.18],
        [1, 1, 1],
        6,
      );
    });
    builder.box("matte", "#8c2f39", [0.12, 0.02, 0.02], [x, 1.64, z + 0.19]);
    builder.box("matte", "#c8102e", [0.04, 0.04, 0.04], [x, 1.94, z + 0.14]);
    [-0.15, 0.15].forEach((tuftX) => {
      builder.cylinder("matte", strawColour, {
        radius: 0.06,
        radiusEnd: 0.01,
        length: 0.16,
        at: [x + tuftX, 1.79, z + 0.07],
        axis: "x",
        segments: 4,
      });
    });
  }
};

/* The wheelbarrow and compost */

const barrowAt = { x: 3.6, z: 0.15 };

const buildWheelbarrow = (builder: AttractionBuilder) => {
  const { x, z } = barrowAt;
  const turn = 0.25;
  const along = (forward: number, side: number, up: number): Triple => [
    x + forward * Math.cos(turn) + side * Math.sin(turn),
    up,
    z - forward * Math.sin(turn) + side * Math.cos(turn),
  ];
  const trayGreen = "#3d6e4a";
  const tray = new LatheGeometry(
    [
      new Vector2(0, 0),
      new Vector2(0.3, 0),
      new Vector2(0.5, 0.3),
      new Vector2(0.47, 0.31),
      new Vector2(0.28, 0.03),
      new Vector2(0, 0.03),
    ],
    4,
  );
  tray.rotateY(Math.PI / 4);
  tray.scale(1.25, 1, 0.85);
  builder.add("paint", trayGreen, tray, {
    at: along(0, 0, 0.32),
    rotation: [0, turn, 0],
  });
  builder.sphere(
    "matte",
    palette.soil,
    0.36,
    along(0, 0, 0.56),
    [1.35, 0.32, 0.95],
    builder.segments(10, 6),
  );
  const wheel = along(0.62, 0, 0.18);
  builder.add(
    "matte",
    palette.black,
    new TorusGeometry(0.14, 0.045, 6, builder.segments(14, 8)),
    { at: wheel, rotation: [0, turn, 0] },
  );
  builder.add(
    "metal",
    palette.steel,
    new CylinderGeometry(0.1, 0.1, 0.07, builder.segments(10, 6)),
    { at: wheel, rotation: [Math.PI / 2, turn, 0] },
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      along(0.62, side * 0.08, 0.18),
      along(-0.95, side * 0.3, 0.42),
      0.04,
      5,
    );
    builder.bar(
      "metal",
      palette.darkSteel,
      along(-0.4, side * 0.24, 0.34),
      along(-0.45, side * 0.26, 0),
      0.04,
      5,
    );
    builder.cylinder("matte", palette.black, {
      radius: 0.035,
      length: 0.18,
      at: along(-1.02, side * 0.31, 0.43),
      axis: "x",
      segments: 6,
    });
  });
};

const compostAt = { x: 5.0, z: -5.3 };

const buildCompost = (builder: AttractionBuilder) => {
  const { x, z } = compostAt;
  const bayWidth = 0.95;
  const height = 0.8;
  const slats = builder.isFar ? 1 : 5;
  [-1, 0, 1].forEach((wall) => {
    builder.box(
      "matte",
      palette.timber,
      [0.06, height, 0.95],
      [x + wall * bayWidth, height / 2, z],
    );
  });
  for (let slat = 0; slat < slats; slat++) {
    const slatY =
      slats === 1 ? height / 2 : 0.09 + (slat / (slats - 1)) * (height - 0.16);
    builder.box(
      "matte",
      slat % 2 === 0 ? palette.paleTimber : shade(palette.paleTimber, 0.88),
      [bayWidth * 2 + 0.1, slats === 1 ? height : 0.12, 0.04],
      [x, slatY, z - 0.47],
    );
    if (slat < 2) {
      builder.box(
        "matte",
        palette.paleTimber,
        [bayWidth * 2 + 0.1, 0.12, 0.04],
        [x, slatY, z + 0.47],
      );
    }
  }
  builder.sphere(
    "matte",
    "#4a3221",
    0.5,
    [x - bayWidth / 2, 0.35, z],
    [0.9, 0.7, 0.85],
    8,
  );
  builder.sphere(
    "matte",
    "#5a3d27",
    0.45,
    [x + bayWidth / 2, 0.25, z],
    [0.95, 0.55, 0.9],
    8,
  );
  if (!builder.isFar) {
    const scraps: [number, number, number, string][] = [
      [-0.6, 0.72, 0.1, "#6f9a3c"],
      [-0.3, 0.7, -0.15, "#c9a86a"],
      [0.5, 0.52, 0.1, "#7aa83f"],
    ];
    scraps.forEach(([dx, dy, dz, colour]) => {
      builder.sphere(
        "matte",
        colour,
        0.14,
        [x + dx, dy, z + dz],
        [1.4, 0.4, 1],
        6,
      );
    });
  }
};

/* The plot boundaries */

const fence = { minX: -6.8, maxX: 6.8, minZ: -6.3, maxZ: 6.0 };
const gateHalf = 0.95;

const buildPaths = (builder: AttractionBuilder) => {
  builder.box("matte", palette.path, [1.5, 0.04, 12.6], [0, 0.02, -0.15]);
  builder.box("matte", palette.path, [13.4, 0.04, 1.2], [0, 0.021, 0.25]);
  builder.box("matte", palette.path, [1.6, 0.04, 3.2], [0, 0.022, 7.3]);
  const post: Parameters<typeof addFence>[3] = {
    colour: palette.paleTimber,
    height: 0.75,
    isPicket: false,
    spacing: 0.4,
    finish: "matte",
  };
  const corners = [
    { x: fence.minX, z: fence.maxZ },
    { x: fence.minX, z: fence.minZ },
    { x: fence.maxX, z: fence.minZ },
    { x: fence.maxX, z: fence.maxZ },
  ];
  addFence(builder, { x: -gateHalf, z: fence.maxZ }, corners[0], post);
  addFence(builder, corners[0], corners[1], post);
  addFence(builder, corners[1], corners[2], post);
  addFence(builder, corners[2], corners[3], post);
  addFence(builder, corners[3], { x: gateHalf, z: fence.maxZ }, post);
  [-gateHalf, gateHalf].forEach((gateX) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.14, 1.05, 0.14],
      [gateX, 0.52, fence.maxZ],
    );
    builder.box(
      "matte",
      palette.darkTimber,
      [0.18, 0.05, 0.18],
      [gateX, 1.07, fence.maxZ],
    );
  });
  const gateTurn = -1.25;
  const gateLength = gateHalf * 2 - 0.2;
  const hinge = { x: gateHalf - 0.08, z: fence.maxZ };
  const gateEnd = {
    x: hinge.x - Math.cos(gateTurn) * gateLength,
    z: hinge.z - Math.sin(gateTurn) * gateLength,
  };
  addFence(builder, hinge, gateEnd, { ...post, spacing: 0.25, height: 0.85 });
  if (!builder.isFar) {
    builder.bar(
      "matte",
      palette.paleTimber,
      [hinge.x, 0.25, hinge.z],
      [gateEnd.x, 0.65, gateEnd.z],
      0.05,
      4,
    );
  }
};

const buildSurroundings = (builder: AttractionBuilder) => {
  addBench(builder, [-5.6, 0, 0.25], Math.PI / 2, palette.paleTimber);
  addTree(builder, [-7.2, 0, 4.3], 0.95);
  addTree(builder, [7.4, 0, -3.4], 1.0, "#4a9440");
  addBush(builder, [6.3, 0, 7.0], 0.5);
  addBush(builder, [-6.0, 0, -6.9], 0.5, "#3a7d34");
  addBush(builder, [7.5, 0, 2.4], 0.45, "#3a7d34");
  addSignBoard(builder, [-2.1, 0, 6.8], "#3d6e4a");
};

/* The butterflies */

const buildButterfly = (builder: AttractionBuilder) => {
  builder.cylinder("matte", "#3a2a1e", {
    radius: 0.018,
    length: 0.16,
    at: [0, 0, 0],
    axis: "z",
    segments: 4,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      "#d9522b",
      [0.15, 0.01, 0.13],
      [side * 0.085, 0.025, 0.03],
      [0, 0, side * 0.5],
    );
    builder.box(
      "matte",
      "#2a2420",
      [0.1, 0.01, 0.09],
      [side * 0.065, 0.016, -0.065],
      [0, 0, side * 0.5],
    );
  });
};

const blockers: LocalBlocker[] = [
  { x: shed.x - 0.65, z: shed.z, radius: 1.0 },
  { x: shed.x + 0.65, z: shed.z, radius: 1.0 },
  { x: butt.x, z: butt.z, radius: 0.4 },
  { x: scarecrowAt.x, z: scarecrowAt.z, radius: 0.4 },
  { x: barrowAt.x, z: barrowAt.z, radius: 0.55 },
  { x: barrowAt.x - 0.6, z: barrowAt.z + 0.15, radius: 0.35 },
  { x: compostAt.x - 0.5, z: compostAt.z, radius: 0.6 },
  { x: compostAt.x + 0.5, z: compostAt.z, radius: 0.6 },
  ...[2.3, 3.75, 5.2].map((x) => ({ x, z: 4.0, radius: 0.48 })),
  { x: -7.2, z: 4.3, radius: 0.3 },
  { x: 7.4, z: -3.4, radius: 0.3 },
];

export const allotmentsModel: AttractionModel = {
  kind: "allotments",
  name: "Allotments",
  fact: "Plants need water, light and warmth to grow well, and their roots take in water and goodness from the soil. Allotment gardeners add compost made from rotted plant scraps to feed the soil, and runner beans climb tall canes towards the light.",
  curriculumLink:
    "Science, Years 2 and 3: plants. What plants need to grow and stay healthy, and the jobs of roots, stems, leaves and flowers.",
  footprint: 9.4,
  setting: "inland",
  signSpot: { x: -2.1, z: 7.75 },
  build: (builder) => {
    buildPaths(builder);
    buildCrops(builder);
    buildShed(builder);
    buildWaterButt(builder);
    buildScarecrow(builder);
    buildWheelbarrow(builder);
    buildCompost(builder);
    buildSurroundings(builder);
  },
  wanderers: [
    {
      name: "butterflies",
      build: buildButterfly,
      count: 4,
      centre: { x: 0, z: 1.5 },
      radius: 5,
      speed: 0.9,
      height: 0.9,
      bob: 0.25,
    },
  ],
  blockers,
};
