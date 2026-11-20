import { CylinderGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const vanMint = "#a8e0c8";
const vanCream = "#fbf3dc";
const vanPink = "#f2a0b8";
const awningPink = "#f27a9a";
const tyreBlack = "#25262a";
const chrome = "#d8dde2";
const waffle = "#d9a55a";
const waffleDark = "#b9823a";
const vanilla = "#fff4d6";
const strawberry = "#f4a6c0";
const chocolate = "#6a3e22";
const cherry = "#d01f36";
const copper = "#b8703a";
const silver = "#c8ccd2";
const gold = "#e0b84a";
const signColour = "#f27a9a";

/* The van stands along local x, its serving hatch facing +z */
const van = { z: -0.8, halfWidth: 0.8 };
const sideZ = van.z + van.halfWidth;
const floor = 0.45;
const bodyTop = 2.1;
const body = { fromX: -1.75, toX: 0.75 };
const cab = { fromX: 0.65, toX: 1.75, top: 1.6 };
const hatch = { x: -0.55, width: 1.25, bottom: 1.08, top: 1.78 };
const roofConeAt: Triple = [-0.5, bodyTop, van.z];
const aBoardAt = { x: 1.2, z: 1.0 };
const tableAt = { x: -2.0, z: 1.5 };

/* ------------------------------------------------------------------ */
/* The van                                                             */
/* ------------------------------------------------------------------ */

const buildBody = (builder: AttractionBuilder) => {
  const bodyLength = body.toX - body.fromX;
  const bodyMiddle = (body.fromX + body.toX) / 2;
  const width = van.halfWidth * 2;
  builder.roundedBox(
    "paint",
    vanMint,
    [bodyLength, bodyTop - floor, width],
    0.14,
    [bodyMiddle, (bodyTop + floor) / 2, van.z],
  );
  /* The cab, lower, with a sloping windscreen and a bonnet */
  const cabLength = cab.toX - cab.fromX;
  builder.roundedBox(
    "paint",
    vanCream,
    [cabLength, cab.top - floor, width - 0.04],
    0.14,
    [(cab.fromX + cab.toX) / 2, (cab.top + floor) / 2, van.z],
  );
  builder.box(
    "glass",
    palette.glass,
    [0.04, 0.48, width - 0.24],
    [cab.toX - 0.17, cab.top - 0.3, van.z],
    [0, 0, 0.35],
  );
  /* A chassis skirt under the body */
  builder.box(
    "paint",
    shade(vanMint, 0.7),
    [3.4, 0.14, width - 0.1],
    [0, floor - 0.02, van.z],
  );
  /* A cream roof cap with a pink stripe round the body */
  builder.box(
    "paint",
    vanCream,
    [bodyLength + 0.02, 0.1, width + 0.02],
    [bodyMiddle, bodyTop - 0.08, van.z],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    vanPink,
    [bodyLength + 0.03, 0.12, width + 0.03],
    [bodyMiddle, 0.82, van.z],
  );
  builder.box(
    "paint",
    vanPink,
    [cabLength + 0.03, 0.12, width - 0.01],
    [(cab.fromX + cab.toX) / 2, 0.82, van.z],
  );
  /* Cab side windows, with the driver's door */
  [-1, 1].forEach((side) => {
    const z = van.z + side * (van.halfWidth - 0.015);
    builder.box(
      "glass",
      palette.glass,
      [0.5, 0.42, 0.02],
      [cab.fromX + 0.5, cab.top - 0.3, z],
    );
    builder.box(
      "paint",
      shade(vanCream, 0.85),
      [0.02, 0.9, 0.02],
      [cab.fromX + 0.2, 1.0, z],
    );
    builder.box(
      "metal",
      chrome,
      [0.1, 0.03, 0.03],
      [cab.fromX + 0.32, 1.05, z + side * 0.01],
    );
    /* Wing mirrors */
    builder.box(
      "paint",
      palette.black,
      [0.06, 0.14, 0.1],
      [cab.toX - 0.35, 1.3, z + side * 0.1],
    );
  });
  /* Headlamps, grille, bumpers and number plates */
  [-0.5, 0.5].forEach((across) => {
    builder.cylinder("glow", "#fff6d0", {
      radius: 0.1,
      length: 0.04,
      at: [cab.toX + 0.01, 0.82, van.z + across],
      axis: "x",
      segments: 12,
    });
    builder.cylinder("glow", "#e83a3a", {
      radius: 0.07,
      length: 0.04,
      at: [body.fromX - 0.01, 0.82, van.z + across],
      axis: "x",
      segments: 10,
    });
  });
  builder.box("metal", chrome, [0.04, 0.2, 0.6], [cab.toX + 0.01, 0.78, van.z]);
  [cab.toX + 0.05, body.fromX - 0.05].forEach((x) => {
    builder.box(
      "metal",
      chrome,
      [0.08, 0.1, van.halfWidth * 2],
      [x, 0.5, van.z],
    );
    builder.box(
      "paint",
      x > 0 ? palette.white : "#f2d23a",
      [0.02, 0.1, 0.34],
      [x + (x > 0 ? 0.04 : -0.04), 0.62, van.z],
    );
  });
  /* A roof vent, a rear ladder, and the back doors' handles */
  builder.box(
    "metal",
    chrome,
    [0.4, 0.08, 0.4],
    [body.fromX + 0.5, bodyTop, van.z],
  );
  [-0.25, 0.25].forEach((across) => {
    builder.bar(
      "metal",
      chrome,
      [body.fromX - 0.06, 0.6, van.z + across],
      [body.fromX - 0.06, 2.0, van.z + across],
      0.03,
      6,
    );
  });
  [0.9, 1.25, 1.6].forEach((y) => {
    builder.bar(
      "metal",
      chrome,
      [body.fromX - 0.06, y, van.z - 0.25],
      [body.fromX - 0.06, y, van.z + 0.25],
      0.025,
      5,
    );
  });
};

const buildWheels = (builder: AttractionBuilder) => {
  [-1.1, 1.25].forEach((x) => {
    [-1, 1].forEach((side) => {
      const z = van.z + side * (van.halfWidth - 0.12);
      builder.cylinder("matte", tyreBlack, {
        radius: 0.3,
        length: 0.24,
        at: [x, 0.3, z],
        axis: "z",
        segments: builder.isFar ? 8 : 18,
      });
      if (builder.isFar) {
        return;
      }
      builder.cylinder("metal", chrome, {
        radius: 0.16,
        length: 0.02,
        at: [x, 0.3, z + side * 0.12],
        axis: "z",
        segments: 14,
      });
      builder.cylinder("paint", vanPink, {
        radius: 0.06,
        length: 0.03,
        at: [x, 0.3, z + side * 0.125],
        axis: "z",
        segments: 8,
      });
      /* The wheel arch */
      builder.add(
        "paint",
        shade(vanMint, 0.8),
        new TorusGeometry(0.36, 0.04, 4, 12, Math.PI),
        { at: [x, 0.36, z + side * 0.13] },
      );
    });
  });
};

/* ------------------------------------------------------------------ */
/* The serving hatch, its awning and the menu                          */
/* ------------------------------------------------------------------ */

const buildHatch = (builder: AttractionBuilder) => {
  const { x, width, bottom, top } = hatch;
  /* The dark inside of the van, seen through the hatch */
  builder.box(
    "matte",
    "#4a3a44",
    [width, top - bottom, 0.02],
    [x, (bottom + top) / 2, sideZ + 0.005],
  );
  if (builder.isFar) {
    return;
  }
  /* A chrome frame round the opening */
  [bottom, top].forEach((y) => {
    builder.box(
      "metal",
      chrome,
      [width + 0.08, 0.04, 0.04],
      [x, y, sideZ + 0.02],
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      chrome,
      [0.04, top - bottom, 0.04],
      [x + (side * width) / 2, (bottom + top) / 2, sideZ + 0.02],
    );
  });
  /* The counter, with cones in a holder and a tub of sprinkles */
  builder.box(
    "metal",
    chrome,
    [width + 0.1, 0.05, 0.3],
    [x, bottom, sideZ + 0.15],
  );
  [-0.4, -0.3, -0.2].forEach((dx) => {
    builder.add("matte", waffle, new CylinderGeometry(0.045, 0.0, 0.16, 8), {
      at: [x + dx, bottom + 0.1, sideZ + 0.12],
    });
  });
  builder.cylinder("paint", palette.white, {
    radius: 0.06,
    length: 0.08,
    at: [x + 0.3, bottom + 0.065, sideZ + 0.15],
    segments: 10,
  });
  [0, 1, 2, 3].forEach((sprinkle) => {
    builder.box(
      "paint",
      [vanPink, "#f2d23a", "#6ac0e8", "#8ad06a"][sprinkle],
      [0.02, 0.01, 0.008],
      [
        x + 0.28 + sprinkle * 0.012,
        bottom + 0.11,
        sideZ + 0.13 + (sprinkle % 2) * 0.03,
      ],
      [0, sprinkle, 0],
    );
  });
  /* The soft-serve machine just inside, with its levers */
  builder.box(
    "metal",
    chrome,
    [0.4, 0.45, 0.04],
    [x - 0.05, bottom + 0.35, sideZ + 0.02],
  );
  [-0.15, 0, 0.15].forEach((dx) => {
    builder.cylinder("metal", chrome, {
      radius: 0.025,
      length: 0.08,
      at: [x - 0.05 + dx, bottom + 0.15, sideZ + 0.06],
      segments: 8,
    });
    builder.bar(
      "paint",
      palette.black,
      [x - 0.05 + dx, bottom + 0.42, sideZ + 0.04],
      [x - 0.05 + dx, bottom + 0.5, sideZ + 0.12],
      0.02,
      4,
    );
  });
  /* The striped awning over the hatch */
  const stripes = 7;
  const awningWidth = width + 0.3;
  for (let stripe = 0; stripe < stripes; stripe++) {
    builder.box(
      "matte",
      stripe % 2 === 0 ? awningPink : vanCream,
      [awningWidth / stripes, 0.02, 0.55],
      [
        x - awningWidth / 2 + (awningWidth / stripes) * (stripe + 0.5),
        top + 0.17,
        sideZ + 0.26,
      ],
      [0.45, 0, 0],
    );
    builder.box(
      "matte",
      stripe % 2 === 0 ? awningPink : vanCream,
      [awningWidth / stripes, 0.1, 0.02],
      [
        x - awningWidth / 2 + (awningWidth / stripes) * (stripe + 0.5),
        top + 0.0,
        sideZ + 0.5,
      ],
    );
  }
};

type CoinValue = "1p" | "2p" | "5p" | "10p" | "20p" | "50p" | "£1" | "£2";

/** A coin, flat and facing out, in its true shape. */
const addCoin = (
  builder: AttractionBuilder,
  at: Triple,
  value: CoinValue,
  facing: "z" | "y" = "z",
) => {
  const sizes: Record<
    CoinValue,
    { radius: number; colour: string; sides: number }
  > = {
    "1p": { radius: 0.04, colour: copper, sides: 12 },
    "2p": { radius: 0.05, colour: copper, sides: 12 },
    "5p": { radius: 0.035, colour: silver, sides: 12 },
    "10p": { radius: 0.048, colour: silver, sides: 12 },
    /* The 20p and 50p have seven curved sides; the pound has twelve */
    "20p": { radius: 0.042, colour: silver, sides: 7 },
    "50p": { radius: 0.05, colour: silver, sides: 7 },
    "£1": { radius: 0.046, colour: gold, sides: 12 },
    "£2": { radius: 0.054, colour: gold, sides: 14 },
  };
  const { radius, colour, sides } = sizes[value];
  builder.cylinder("metal", colour, {
    radius,
    length: 0.012,
    at,
    axis: facing,
    segments: sides,
  });
  if (value === "£2") {
    /* A silver middle inside a gold ring */
    builder.cylinder("metal", silver, {
      radius: radius * 0.7,
      length: 0.014,
      at,
      axis: facing,
      segments: 12,
    });
  }
};

const buildMenu = (builder: AttractionBuilder) => {
  /* A menu board on the van's side, beside the hatch */
  const menuX = 0.35;
  builder.box(
    "paint",
    vanCream,
    [0.5, 0.72, 0.02],
    [menuX, 1.42, sideZ + 0.01],
  );
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    vanPink,
    [0.54, 0.06, 0.025],
    [menuX, 1.8, sideZ + 0.012],
  );
  const treats: { y: number; colour: string; price: CoinValue }[] = [
    { y: 1.62, colour: vanilla, price: "£1" },
    { y: 1.42, colour: strawberry, price: "50p" },
    { y: 1.22, colour: chocolate, price: "20p" },
  ];
  treats.forEach(({ y, colour, price }) => {
    /* A little cone picture, and its price in coins */
    builder.add("paint", waffle, new CylinderGeometry(0.035, 0, 0.09, 6), {
      at: [menuX - 0.15, y - 0.02, sideZ + 0.025],
    });
    builder.sphere(
      "paint",
      colour,
      0.04,
      [menuX - 0.15, y + 0.04, sideZ + 0.025],
      [1, 1, 0.4],
      7,
    );
    addCoin(builder, [menuX + 0.1, y, sideZ + 0.03], price);
  });
};

/** A sandwich board on the grass, its prices shown in real coins. */
const buildABoard = (builder: AttractionBuilder) => {
  const { x, z } = aBoardAt;
  const lean = 0.22;
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      palette.black,
      [0.6, 0.85, 0.03],
      [x, 0.42, z + side * 0.1],
      [side * lean, 0, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.box("paint", vanCream, [0.66, 0.06, 0.08], [x, 0.85, z], [0, 0, 0]);
  /* Front face: a 99 with a flake, and its coins */
  const face = (y: number) => z + 0.1 + (0.42 - y) * Math.tan(lean) + 0.02;
  builder.add("paint", waffle, new CylinderGeometry(0.06, 0, 0.18, 6), {
    at: [x - 0.15, 0.55, face(0.55)],
    rotation: [lean, 0, 0],
  });
  builder.sphere(
    "paint",
    vanilla,
    0.07,
    [x - 0.15, 0.68, face(0.68)],
    [1, 1, 0.4],
    8,
  );
  builder.box(
    "paint",
    chocolate,
    [0.03, 0.12, 0.02],
    [x - 0.11, 0.75, face(0.75)],
    [lean, 0, -0.4],
  );
  const prices: CoinValue[] = ["£1", "20p", "10p"];
  prices.forEach((coin, index) => {
    addCoin(
      builder,
      [x + 0.12, 0.66 - index * 0.13, face(0.66 - index * 0.13)],
      coin,
    );
  });
};

const buildPicnicTable = (builder: AttractionBuilder) => {
  const { x, z } = tableAt;
  builder.box("matte", palette.paleTimber, [1.0, 0.05, 0.6], [x, 0.72, z]);
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      palette.paleTimber,
      [1.0, 0.04, 0.22],
      [x, 0.42, z + side * 0.5],
    );
    [-1, 1].forEach((end) => {
      builder.bar(
        "matte",
        palette.timber,
        [x + end * 0.4, 0, z + side * 0.6],
        [x + end * 0.4, 0.7, z - side * 0.15],
        0.06,
        4,
      );
    });
  });
  /* A parasol, and a dropped ice cream melting on the table */
  builder.cylinder("metal", chrome, {
    radius: 0.025,
    length: 1.7,
    at: [x, 0.85, z],
    segments: 6,
  });
  builder.add("matte", awningPink, new CylinderGeometry(0.0, 0.85, 0.32, 8), {
    at: [x, 1.75, z],
  });
  builder.add(
    "matte",
    vanCream,
    new CylinderGeometry(0.0, 0.86, 0.32, 8, 1, true, 0, Math.PI / 4),
    {
      at: [x, 1.751, z],
    },
  );
  builder.add(
    "matte",
    vanCream,
    new CylinderGeometry(0.0, 0.86, 0.32, 8, 1, true, Math.PI, Math.PI / 4),
    {
      at: [x, 1.751, z],
    },
  );
  builder.sphere(
    "paint",
    strawberry,
    0.06,
    [x + 0.25, 0.75, z + 0.1],
    [1.4, 0.3, 1.2],
    8,
  );
  builder.add("matte", waffle, new CylinderGeometry(0.04, 0, 0.13, 6), {
    at: [x + 0.32, 0.77, z + 0.12],
    rotation: [0, 0, 1.5],
  });
};

/** Bunting along the roof's edge, and a bin for the wrappers. */
const buildTrimmings = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const flagColours = [awningPink, "#f2d23a", "#6ac0e8", vanCream, "#8ad06a"];
  const flags = 12;
  for (let flag = 0; flag < flags; flag++) {
    const x =
      body.fromX +
      0.12 +
      (flag + 0.5) * ((body.toX - body.fromX - 0.24) / flags);
    builder.add(
      "paint",
      flagColours[flag % flagColours.length],
      new CylinderGeometry(0.09, 0.09, 0.01, 3),
      {
        at: [x, bodyTop - 0.22, sideZ + 0.025],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 1.2],
      },
      undefined,
    );
  }
  builder.box(
    "matte",
    palette.white,
    [body.toX - body.fromX - 0.2, 0.012, 0.012],
    [(body.fromX + body.toX) / 2, bodyTop - 0.13, sideZ + 0.025],
  );
  /* A litter bin by the picnic table */
  const bin: Triple = [tableAt.x + 1.0, 0, tableAt.z + 0.75];
  builder.cylinder("paint", "#3f6b4a", {
    radius: 0.2,
    radiusEnd: 0.22,
    length: 0.7,
    at: [bin[0], 0.35, bin[2]],
    segments: 14,
  });
  builder.cylinder("paint", shade("#3f6b4a", 0.8), {
    radius: 0.24,
    length: 0.06,
    at: [bin[0], 0.72, bin[2]],
    segments: 14,
  });
  builder.box(
    "paint",
    vanPink,
    [0.1, 0.08, 0.02],
    [bin[0] + 0.05, 0.78, bin[2] + 0.05],
    [0.4, 0.3, 0.2],
  );
};

/** A wasp after the dropped ice cream. */
const buildWasp = (builder: AttractionBuilder) => {
  builder.sphere("paint", "#f2c21a", 0.05, [0, 0, -0.03], [0.85, 0.85, 1.4], 7);
  [-0.06, -0.02].forEach((z) => {
    builder.cylinder("paint", palette.black, {
      radius: 0.044,
      length: 0.014,
      at: [0, 0, z],
      axis: "z",
      segments: 8,
    });
  });
  builder.sphere("paint", palette.black, 0.03, [0, 0.005, 0.06], [1, 1, 1], 7);
  [-1, 1].forEach((side) => {
    builder.box(
      "glass",
      "#e6f2fa",
      [0.09, 0.005, 0.04],
      [side * 0.05, 0.04, 0],
      [0, side * 0.3, side * 0.3],
    );
  });
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/** The giant cone on the roof: a waffle cone, a swirl, a flake and a cherry. */
const buildRoofCone = (builder: AttractionBuilder) => {
  builder.cylinder("metal", chrome, {
    radius: 0.08,
    length: 0.12,
    at: [0, 0.06, 0],
    segments: 10,
  });
  builder.lathe(
    "matte",
    waffle,
    [
      [0, 0.1],
      [0.3, 0.7],
      [0.32, 0.74],
      [0.3, 0.76],
      [0, 0.76],
    ],
    [0, 0, 0],
    "y",
    16,
  );
  /* The waffle pattern, criss-crossing the cone */
  for (let line = 0; line < 6; line++) {
    const angle = (line / 6) * Math.PI * 2;
    builder.bar(
      "matte",
      waffleDark,
      [Math.sin(angle) * 0.04, 0.17, Math.cos(angle) * 0.04],
      [Math.sin(angle + 0.9) * 0.29, 0.72, Math.cos(angle + 0.9) * 0.29],
      0.018,
      3,
    );
  }
  /* A swirl of strawberry and vanilla, getting smaller to a point */
  [
    [0.3, 0.84, vanilla],
    [0.24, 0.98, strawberry],
    [0.17, 1.1, vanilla],
    [0.1, 1.2, strawberry],
  ].forEach(([radius, y, colour]) => {
    if (
      typeof radius !== "number" ||
      typeof y !== "number" ||
      typeof colour !== "string"
    ) {
      return;
    }
    builder.torus("paint", colour, radius, 0.08, [0, y, 0], "y", 16);
  });
  builder.sphere("paint", vanilla, 0.12, [0, 1.08, 0], [1, 1.2, 1], 10);
  builder.add("paint", strawberry, new CylinderGeometry(0, 0.08, 0.16, 10), {
    at: [0, 1.32, 0],
  });
  builder.box(
    "matte",
    chocolate,
    [0.06, 0.4, 0.06],
    [0.1, 1.2, 0.05],
    [0.2, 0, -0.35],
  );
  builder.sphere("paint", cherry, 0.06, [0, 1.44, 0], [1, 1, 1], 10);
  builder.bar("matte", "#4a7a2a", [0, 1.48, 0], [0.05, 1.6, 0], 0.012, 3);
};

/** The hatch's glass window, which slides up as a customer comes. */
const buildHatchWindow = (builder: AttractionBuilder) => {
  const { width, bottom, top } = hatch;
  const height = top - bottom;
  builder.box(
    "glass",
    "#d6eef5",
    [width - 0.04, height - 0.04, 0.015],
    [0, height / 2, 0],
  );
  builder.box("metal", chrome, [width, 0.04, 0.03], [0, 0.02, 0]);
  builder.box("metal", chrome, [0.03, height, 0.03], [0, height / 2, 0]);
  builder.box("paint", vanPink, [0.2, 0.06, 0.02], [0.3, 0.06, 0.015]);
};

export const iceCreamVanModel: CuriosityModel = {
  kind: "ice-cream-van",
  islandId: "meadow-isle",
  name: "Ice Cream Van",
  fact: "To buy an ice cream you need the right coins. Our coins are 1p, 2p, 5p, 10p, 20p, 50p, £1 and £2. Two 50p coins make £1, and five 20p coins make £1 too. The 20p and 50p coins have seven sides, and the £1 coin has twelve, so you can tell them apart just by touch!",
  curriculumLink:
    "Mathematics, Year 1: recognise and know the value of different denominations of coins and notes.",
  footprint: 4.4,
  setting: "inland",
  signSpot: { x: 2.4, z: 2.6 },
  build: (builder) => {
    buildBody(builder);
    buildWheels(builder);
    buildHatch(builder);
    buildMenu(builder);
    buildABoard(builder);
    buildPicnicTable(builder);
    buildTrimmings(builder);
    if (builder.isFar) {
      builder.add("matte", waffle, new CylinderGeometry(0.3, 0.02, 0.7, 6), {
        at: [roofConeAt[0], roofConeAt[1] + 0.45, roofConeAt[2]],
      });
      builder.sphere(
        "paint",
        strawberry,
        0.3,
        [roofConeAt[0], roofConeAt[1] + 0.95, roofConeAt[2]],
        [1, 1, 1],
        6,
      );
    }
    addSignBoard(builder, [2.4, 0, 2.6], signColour);
  },
  moving: [
    {
      name: "roof cone",
      pivot: roofConeAt,
      build: buildRoofCone,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 2.4, reach: 8 },
    },
    {
      name: "hatch window",
      pivot: [hatch.x, hatch.bottom, sideZ + 0.04],
      build: buildHatchWindow,
      motion: { kind: "rise", reach: 6, height: 0.3, period: 2.0 },
    },
  ],
  wanderers: [
    {
      name: "wasps",
      build: buildWasp,
      count: 2,
      centre: { x: tableAt.x, z: tableAt.z },
      radius: 0.8,
      speed: 0.9,
      height: 1.0,
      bob: 0.2,
    },
  ],
  blockers: [
    { x: tableAt.x + 1.0, z: tableAt.z + 0.75, radius: 0.3 },
    ...[-1.4, -0.7, 0, 0.7, 1.4].map((x) => ({ x, z: van.z, radius: 0.85 })),
    { x: aBoardAt.x, z: aBoardAt.z, radius: 0.35 },
    { x: tableAt.x, z: tableAt.z, radius: 0.7 },
  ] satisfies LocalBlocker[],
  /* Greensleeves, the tune many ice cream vans play */
  tune: [69, 72, 74, 76, 77, 76, 74, 71, 67, 69, 71, 72, 69],
  play: {
    label: "Buy an ice cream",
    news: "Ding-a-ling! You paid with a 50p coin and two 20p coins and a 10p, which makes £1, and got a strawberry swirl with a flake.",
    tune: [76, 74, 71, 67, 69, 71, 72],
  },
};
