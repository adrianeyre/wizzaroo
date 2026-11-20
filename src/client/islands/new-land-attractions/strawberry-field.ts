import { ConeGeometry, CylinderGeometry } from "three";
import {
  addBush,
  addFence,
  addGableRoof,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBunting,
  addFlowerClump,
  addGableEnd,
  buildVillager,
  meadowColours,
} from "./village-fete-parts.js";

const berryRed = "#d42a35";
const berryShine = "#f04a52";
const unripe = "#d9e07a";
const leafGreen = "#3f8f3a";
const strawGold = "#dcc070";
const soilBrown = "#6b4a2f";
const tunnelWhite = "#eef2ee";
const hoopSteel = "#b8c0c6";
const shopGreen = "#3f7a4a";
const punnetGreen = "#5aa040";
const hedgeGreen = "#2f6b2c";
const signColour = "#c8303a";

/* Three rows of strawberries out in the open, on straw */
const rowXs = [-5.6, -3.8, -2.0];
const rowFromZ = -4.8;
const rowToZ = 1.6;
const plantsPerRow = 10;

/* A polytunnel, its sides rolled up, with strawberries on tables inside */
const tunnel = { x: 4.3, fromZ: -5.0, toZ: 1.2, radius: 2.0 };
const tableHeight = 0.85;
const tableOffset = 1.15;
const plantsPerTable = 8;

const shopAt = { x: -3.2, z: 4.6 };
const scarecrowAt: Triple = [-0.4, 0, -4.2];
const rabbitAt: Triple = [-6.9, 0, -1.6];
const trolleyStart = { x: -4.7, z: 2.6 };
const trolleyFinish = { x: -2.9, z: 2.8 };
const trolleyTurn = -4.4;
const signAt = { x: 1.0, z: 7.8 };

/** One strawberry plant, its leaves, a flower and a few berries. */
const addPlant = (
  builder: AttractionBuilder,
  at: Triple,
  seed: number,
  isHanging = false,
) => {
  const [x, y, z] = at;
  builder.sphere(
    "matte",
    seed % 2 === 0 ? leafGreen : shade(leafGreen, 1.12),
    0.17,
    [x, y + 0.08, z],
    [1.1, 0.5, 1.1],
    7,
  );
  builder.add("matte", palette.white, new ConeGeometry(0.035, 0.03, 5), {
    at: [x + 0.05, y + 0.17, z - 0.06],
  });
  const berries = isHanging ? 3 : 2;
  for (let berry = 0; berry < berries; berry++) {
    const angle = seed * 1.7 + berry * 2.2;
    const reach = 0.16;
    const isRipe = (seed + berry) % 4 !== 0;
    builder.add(
      "paint",
      isRipe ? (berry % 2 === 0 ? berryRed : berryShine) : unripe,
      new ConeGeometry(0.045, 0.09, 6).rotateX(Math.PI),
      {
        at: [
          x + Math.sin(angle) * reach,
          isHanging ? y - 0.05 - berry * 0.03 : y + 0.04,
          z + Math.cos(angle) * reach,
        ],
      },
    );
  }
};

const buildField = (builder: AttractionBuilder) => {
  const length = rowToZ - rowFromZ;
  const middle = (rowFromZ + rowToZ) / 2;
  rowXs.forEach((x, row) => {
    /* A low ridge of soil with golden straw tucked along each side */
    builder.box("matte", soilBrown, [0.7, 0.1, length], [x, 0.05, middle]);
    builder.box(
      "matte",
      strawGold,
      [1.15, 0.03, length + 0.2],
      [x, 0.015, middle],
    );
    if (builder.isFar) {
      builder.box(
        "matte",
        leafGreen,
        [0.5, 0.12, length - 0.3],
        [x, 0.16, middle],
      );
      return;
    }
    for (let plant = 0; plant < plantsPerRow; plant++) {
      const z = rowFromZ + 0.3 + ((length - 0.6) / (plantsPerRow - 1)) * plant;
      addPlant(
        builder,
        [x + (plant % 2 === 0 ? 0.08 : -0.08), 0.1, z],
        row * 7 + plant,
      );
    }
    /* Wisps of straw on the path */
    for (let wisp = 0; wisp < 6; wisp++) {
      const angle = wisp * 2.1 + row;
      builder.box(
        "matte",
        shade(strawGold, 0.9),
        [0.28, 0.015, 0.03],
        [x + 0.7 + Math.sin(angle) * 0.2, 0.012, rowFromZ + 0.8 + wisp * 1.0],
        [0, angle, 0],
      );
    }
  });
};

const buildTunnel = (builder: AttractionBuilder) => {
  const { x, fromZ, toZ, radius } = tunnel;
  const length = toZ - fromZ;
  const middle = (fromZ + toZ) / 2;
  const far = builder.isFar;
  /* The plastic cover over the top; the sides are rolled up for air */
  builder.add(
    "matte",
    tunnelWhite,
    new CylinderGeometry(
      radius,
      radius,
      length,
      builder.segments(16, 8),
      1,
      true,
      (Math.PI * 2) / 3,
      (Math.PI * 2) / 3,
    ).rotateX(Math.PI / 2),
    { at: [x, 0, middle] },
  );
  const rollAngle = Math.PI / 3;
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", shade(tunnelWhite, 0.92), {
      radius: 0.1,
      length,
      at: [
        x + side * radius * Math.sin(rollAngle),
        radius * Math.cos(rollAngle) - 0.04,
        middle,
      ],
      axis: "z",
      segments: far ? 6 : 10,
    });
  });
  /* Steel hoops holding it up */
  const hoops = far ? 3 : 7;
  const pieces = far ? 4 : 8;
  for (let hoop = 0; hoop < hoops; hoop++) {
    const z = fromZ + (length / (hoops - 1)) * hoop;
    for (let piece = 0; piece < pieces; piece++) {
      const angle = (a: number) => -Math.PI / 2 + (Math.PI * a) / pieces;
      builder.bar(
        "metal",
        hoopSteel,
        [
          x + Math.sin(angle(piece)) * radius,
          Math.cos(angle(piece)) * radius,
          z,
        ],
        [
          x + Math.sin(angle(piece + 1)) * radius,
          Math.cos(angle(piece + 1)) * radius,
          z,
        ],
        0.05,
        4,
      );
    }
  }
  builder.bar(
    "metal",
    hoopSteel,
    [x, radius, fromZ],
    [x, radius, toZ],
    0.05,
    4,
  );
  /* A path of bark down the middle, and strawberry tables either side */
  builder.box("matte", "#8a6a4a", [1.4, 0.02, length], [x, 0.01, middle]);
  [-1, 1].forEach((side) => {
    const tableX = x + side * tableOffset;
    builder.box(
      "paint",
      "#2a2d33",
      [0.32, 0.18, length - 0.6],
      [tableX, tableHeight, middle],
    );
    if (far) {
      return;
    }
    [fromZ + 0.5, middle, toZ - 0.5].forEach((z) => {
      [-0.12, 0.12].forEach((dx) => {
        builder.bar(
          "metal",
          hoopSteel,
          [tableX + dx, 0, z],
          [tableX + dx, tableHeight - 0.09, z],
          0.035,
          4,
        );
      });
    });
    for (let plant = 0; plant < plantsPerTable; plant++) {
      const z = fromZ + 0.6 + ((length - 1.2) / (plantsPerTable - 1)) * plant;
      addPlant(
        builder,
        [tableX + side * 0.06, tableHeight + 0.08, z],
        plant + (side > 0 ? 3 : 0),
        true,
      );
    }
  });
  if (far) {
    return;
  }
  /* Door frames at each end */
  [fromZ, toZ].forEach((z) => {
    [-0.75, 0.75].forEach((dx) => {
      builder.bar(
        "matte",
        palette.paleTimber,
        [x + dx, 0, z],
        [x + dx, 1.85, z],
        0.07,
        4,
      );
    });
    builder.bar(
      "matte",
      palette.paleTimber,
      [x - 0.75, 1.85, z],
      [x + 0.75, 1.85, z],
      0.07,
      4,
    );
  });
};

const buildShop = (builder: AttractionBuilder) => {
  const { x, z } = shopAt;
  const width = 2.6;
  const depth = 1.5;
  const height = 1.7;
  /* A little timber farm shop, its whole front a counter */
  builder.box(
    "paint",
    shopGreen,
    [width, height, 0.1],
    [x, height / 2, z - depth / 2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      shopGreen,
      [0.1, height, depth],
      [x + (side * width) / 2, height / 2, z],
    );
    addGableEnd(builder, "paint", shade(shopGreen, 1.1), {
      at: [x + (side * width) / 2, height, z],
      width: depth,
      rise: 0.55,
    });
  });
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.55,
    at: [x, height, z],
    colour: palette.roofTile,
  });
  builder.box(
    "paint",
    palette.cream,
    [width - 0.1, 0.1, 0.5],
    [x, 0.85, z + depth / 2 - 0.2],
  );
  builder.box(
    "paint",
    shopGreen,
    [width - 0.1, 0.8, 0.08],
    [x, 0.4, z + depth / 2 - 0.05],
  );
  if (builder.isFar) {
    return;
  }
  /* Punnets of berries, a set of scales and a chalkboard of prices */
  for (let punnet = 0; punnet < 6; punnet++) {
    const px = x - 1.0 + punnet * 0.32;
    builder.box(
      "paint",
      punnetGreen,
      [0.24, 0.08, 0.18],
      [px, 0.94, z + depth / 2 - 0.25],
    );
    [-0.05, 0.05].forEach((dx) => {
      builder.sphere(
        "paint",
        berryRed,
        0.05,
        [px + dx, 1.0, z + depth / 2 - 0.25],
        [1, 0.9, 1],
        6,
      );
    });
  }
  builder.cylinder("metal", palette.brass, {
    radius: 0.14,
    length: 0.03,
    at: [x + 0.95, 1.08, z + depth / 2 - 0.25],
    segments: 12,
  });
  builder.box(
    "paint",
    "#c03a2a",
    [0.22, 0.14, 0.18],
    [x + 0.95, 0.98, z + depth / 2 - 0.25],
  );
  builder.box(
    "matte",
    "#22262a",
    [0.7, 0.5, 0.04],
    [x, 1.35, z - depth / 2 + 0.07],
  );
  [0, 1, 2].forEach((line) => {
    builder.box(
      "paint",
      palette.white,
      [0.5 - line * 0.1, 0.03, 0.01],
      [x, 1.47 - line * 0.11, z - depth / 2 + 0.1],
    );
  });
  addBunting(
    builder,
    [x - width / 2, height, z + depth / 2 + 0.1],
    [x + width / 2, height, z + depth / 2 + 0.1],
    [berryRed, palette.white, punnetGreen],
    0.12,
  );
  /* Stacked trays of empty punnets beside the shop */
  for (let tray = 0; tray < 4; tray++) {
    builder.box(
      "paint",
      tray % 2 === 0 ? punnetGreen : shade(punnetGreen, 0.85),
      [0.5, 0.1, 0.36],
      [x + width / 2 + 0.4, 0.05 + tray * 0.1, z + 0.3],
    );
  }
};

/** The picker's trolley: a seat on wheels with a tray for punnets. */
const buildTrolley = (builder: AttractionBuilder, at: Triple) => {
  const [x, , z] = at;
  builder.box("paint", "#e05a2a", [0.4, 0.06, 0.5], [x, 0.22, z]);
  builder.cylinder("paint", "#2a2d33", {
    radius: 0.15,
    length: 0.06,
    at: [x, 0.36, z - 0.05],
    segments: 12,
  });
  builder.bar(
    "metal",
    palette.steel,
    [x, 0.22, z - 0.05],
    [x, 0.33, z - 0.05],
    0.04,
    6,
  );
  [-1, 1].forEach((side) => {
    [-0.18, 0.18].forEach((dz) => {
      builder.cylinder("matte", palette.black, {
        radius: 0.08,
        length: 0.05,
        at: [x + side * 0.22, 0.08, z + dz],
        axis: "x",
        segments: 10,
      });
    });
  });
  builder.box("paint", punnetGreen, [0.24, 0.07, 0.18], [x, 0.29, z + 0.17]);
};

const buildFarm = (builder: AttractionBuilder) => {
  /* Hedgerows along the back and the left, the field's old boundary */
  const hedgeBits: [number, number, number, number][] = [
    [-2.8, -6.6, 7.6, 0.9],
    [-7.3, -2.2, 0.9, 7.4],
  ];
  hedgeBits.forEach(([x, z, w, d]) => {
    builder.box("matte", hedgeGreen, [w, 1.1, d], [x, 0.55, z]);
    if (!builder.isFar) {
      const bumps = Math.round(Math.max(w, d) / 0.9);
      for (let bump = 0; bump < bumps; bump++) {
        const share = (bump + 0.5) / bumps;
        builder.sphere(
          "matte",
          shade(hedgeGreen, 1 + (bump % 3) * 0.06),
          0.5,
          [
            x + (w > d ? (share - 0.5) * w : 0),
            1.1,
            z + (d > w ? (share - 0.5) * d : 0),
          ],
          [1, 0.6, 1],
          7,
        );
      }
    }
  });
  addTree(builder, [6.9, 0, -4.4], 1.1);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  /* A farm track in from the front, past the shop */
  builder.box("matte", palette.path, [1.5, 0.03, 4.4], [0.6, 0.015, 5.2]);
  builder.box("matte", palette.path, [9.0, 0.03, 1.4], [0.2, 0.016, 3.1]);
  if (builder.isFar) {
    return;
  }
  buildTrolley(builder, [trolleyStart.x + 0.6, 0, trolleyStart.z - 0.2]);
  buildTrolley(builder, [5.6, 0, 2.6]);
  addFence(
    builder,
    { x: 2.0, z: 6.4 },
    { x: 6.6, z: 3.0 },
    { isPicket: false, colour: palette.paleTimber, height: 0.7 },
  );
  addBush(builder, [6.8, 0, 0.6], 0.5);
  addFlowerClump(
    builder,
    [-0.6, 0, 5.4],
    [meadowColours.poppy, palette.white, meadowColours.butter],
  );
  addFlowerClump(
    builder,
    [2.4, 0, 5.2],
    [meadowColours.cornflower, meadowColours.butter],
  );
  /* A wheelbarrow of straw */
  builder.box(
    "paint",
    "#3a6a9a",
    [0.5, 0.25, 0.8],
    [-0.6, 0.38, 1.0],
    [0.1, 0.3, 0],
  );
  builder.sphere(
    "matte",
    strawGold,
    0.28,
    [-0.6, 0.5, 1.0],
    [0.9, 0.4, 1.3],
    8,
  );
  builder.cylinder("matte", palette.black, {
    radius: 0.14,
    length: 0.06,
    at: [-0.48, 0.14, 1.38],
    axis: "x",
    segments: 10,
  });
};

/** The scarecrow, who waves its arms as you come near; pivot at its middle. */
const buildScarecrow = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.05,
    length: 2.0,
    at: [0, -0.2, 0],
    segments: 6,
  });
  builder.box("matte", palette.darkTimber, [1.4, 0.06, 0.06], [0, 0.35, 0]);
  /* A checked shirt, patched trousers and a straw hat */
  builder.cylinder("matte", "#c0453a", {
    radius: 0.2,
    radiusEnd: 0.17,
    length: 0.55,
    at: [0, 0.3, 0],
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#c0453a",
      [side * 0.15, 0.4, 0],
      [side * 0.62, 0.36, 0],
      0.13,
      6,
    );
    builder.add(
      "matte",
      strawGold,
      new ConeGeometry(0.06, 0.16, 6).rotateZ((side * Math.PI) / 2),
      { at: [side * 0.74, 0.36, 0] },
    );
    builder.bar(
      "matte",
      "#3a5a8a",
      [side * 0.08, 0.05, 0],
      [side * 0.1, -0.5, 0],
      0.12,
      6,
    );
  });
  builder.box("matte", "#e0b040", [0.12, 0.12, 0.02], [0.08, 0.35, 0.2]);
  builder.sphere("matte", "#e8d8a8", 0.17, [0, 0.72, 0], [1, 1.05, 1], 10);
  builder.cylinder("matte", strawGold, {
    radius: 0.3,
    length: 0.03,
    at: [0, 0.84, 0],
    segments: 14,
  });
  builder.cylinder("matte", strawGold, {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.16,
    at: [0, 0.93, 0],
    segments: 12,
  });
  builder.cylinder("matte", berryRed, {
    radius: 0.155,
    length: 0.04,
    at: [0, 0.88, 0],
    segments: 12,
  });
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.06, 0.75, 0.15],
      [1, 1, 1],
      5,
    );
  });
  builder.add(
    "matte",
    "#e07a2a",
    new ConeGeometry(0.03, 0.12, 6).rotateX(Math.PI / 2),
    { at: [0, 0.7, 0.2] },
  );
};

/** A rabbit who pops up from behind the hedge to see the strawberries. */
const buildRabbit = (builder: AttractionBuilder) => {
  const fur = "#9a8270";
  builder.sphere("matte", fur, 0.16, [0, 0.16, 0], [0.9, 1, 1.1], 10);
  builder.sphere("matte", fur, 0.1, [0, 0.34, 0.08], [1, 1, 1], 9);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      fur,
      0.04,
      [side * 0.04, 0.5, 0.06],
      [0.7, 2.4, 0.5],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.017,
      [side * 0.05, 0.37, 0.16],
      [1, 1, 1],
      5,
    );
  });
  builder.sphere("matte", palette.white, 0.05, [0, 0.14, -0.17], [1, 1, 1], 6);
  builder.sphere("matte", "#e8a0a0", 0.015, [0, 0.33, 0.18], [1, 1, 1], 4);
};

/** A giant strawberry on the shop roof, which spins as you come near. */
const buildGiantBerry = (builder: AttractionBuilder) => {
  builder.lathe(
    "paint",
    berryRed,
    [
      [0, 0],
      [0.14, 0.05],
      [0.26, 0.2],
      [0.3, 0.38],
      [0.26, 0.5],
      [0.12, 0.56],
      [0, 0.57],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  if (!builder.isFar) {
    for (let seed = 0; seed < 18; seed++) {
      const angle = seed * 2.4;
      const height = 0.12 + (seed % 6) * 0.065;
      const radius = 0.28 - Math.abs(height - 0.36) * 0.35;
      builder.box(
        "paint",
        "#f2d24a",
        [0.025, 0.035, 0.015],
        [Math.sin(angle) * radius, height, Math.cos(angle) * radius],
        [0, angle, 0],
      );
    }
  }
  for (let leaf = 0; leaf < 5; leaf++) {
    const angle = (leaf / 5) * Math.PI * 2;
    builder.box(
      "paint",
      leafGreen,
      [0.08, 0.02, 0.22],
      [Math.sin(angle) * 0.12, 0.57, Math.cos(angle) * 0.12],
      [0.3 * Math.cos(angle), angle, 0],
    );
  }
  builder.cylinder("paint", leafGreen, {
    radius: 0.025,
    length: 0.12,
    at: [0, 0.64, 0],
    segments: 6,
  });
};

const buildBee = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2c12e", 0.05, [0, 0, 0], [0.9, 0.9, 1.3], 6);
  builder.box("paint", palette.black, [0.09, 0.07, 0.02], [0, 0, 0.0]);
  builder.box("paint", palette.black, [0.08, 0.06, 0.02], [0, 0, -0.04]);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#e8f4ff",
      [0.07, 0.01, 0.04],
      [side * 0.05, 0.04, 0],
      [0, 0, side * 0.4],
    );
  });
};

const buildPicker = buildVillager({
  top: "#f2d06b",
  legs: "#3a5a8a",
  hair: "#7a4a2a",
  hat: "#e8d8a8",
});

/* Sit on a picking trolley and roll along the rows, up one and back down the next */
const trolleyRide = (progress: number): LocalSpot => {
  const up = 0.45;
  const across = 0.55;
  if (progress < up) {
    const share = progress / up;
    return {
      x: trolleyStart.x,
      y: 0.1 * Math.min(1, share * 10),
      z: trolleyStart.z + (trolleyTurn - trolleyStart.z) * share,
      heading: Math.PI,
    };
  }
  if (progress < across) {
    const share = (progress - up) / (across - up);
    return {
      x: trolleyStart.x + (trolleyFinish.x - trolleyStart.x) * share,
      y: 0.1,
      z: trolleyTurn - Math.sin(share * Math.PI) * 0.3,
      heading: Math.PI / 2,
    };
  }
  const share = (progress - across) / (1 - across);
  return {
    x: trolleyFinish.x,
    y: 0.1 * Math.min(1, (1 - share) * 10),
    z: trolleyTurn + (trolleyFinish.z - trolleyTurn) * share,
    heading: 0,
  };
};

export const strawberryFieldModel: NewLandAttractionModel = {
  kind: "strawberry-field",
  islandId: "meadow-isle",
  name: "Strawberry Field",
  fact: "A strawberry plant has roots under the ground, a short stem, green leaves and little white flowers. Bees carry pollen from flower to flower, and each flower then grows into a juicy red strawberry. It is the only fruit that wears its seeds on the outside, about two hundred of them!",
  curriculumLink:
    "Science, Year 1: plants. Identify and describe the basic structure of a variety of common flowering plants, including roots, stems, leaves and flowers.",
  footprint: 9,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildField(builder);
    buildTunnel(builder);
    buildShop(builder);
    buildFarm(builder);
  },
  moving: [
    {
      name: "scarecrow",
      pivot: [scarecrowAt[0], 1.1, scarecrowAt[2]],
      build: buildScarecrow,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 6,
        amplitude: 0.25,
        period: 1.1,
      },
    },
    {
      name: "giant-strawberry",
      pivot: [shopAt.x, 2.3, shopAt.z],
      build: buildGiantBerry,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 4, reach: 6 },
    },
    {
      name: "rabbit",
      pivot: [rabbitAt[0] + 0.5, -0.4, rabbitAt[2]],
      build: buildRabbit,
      motion: { kind: "rise", reach: 4, height: 0.42, period: 1.4 },
    },
  ],
  wanderers: [
    {
      name: "bees",
      build: buildBee,
      count: 5,
      centre: { x: -3.6, z: -1.6 },
      radius: 2.6,
      speed: 0.7,
      height: 0.55,
      bob: 0.12,
    },
    {
      name: "pickers",
      build: buildPicker,
      count: 2,
      centre: { x: tunnel.x, z: (tunnel.fromZ + tunnel.toZ) / 2 },
      radius: 0.6,
      speed: 0.25,
    },
  ],
  blockers: [{ x: shopAt.x, z: shopAt.z - 0.1, radius: 1.3 }],
  rides: [
    {
      id: "picking-trolley",
      name: "the picking trolley",
      start: trolleyStart,
      reach: 0.6,
      seconds: 14,
      finish: trolleyFinish,
      follow: trolleyRide,
    },
  ],
  play: {
    label: "Pick a punnet",
    news: "You picked a whole punnet of sweet, juicy strawberries, and only ate one on the way back to the shop!",
  },
};
