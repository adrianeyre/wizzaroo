import {
  BoxGeometry,
  CircleGeometry,
  ExtrudeGeometry,
  Shape,
  Vector2,
} from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const snow = "#eef3f6";
const snowBright = "#fbfdff";
const snowShadow = "#d6e1ea";
const pine = "#2d5a40";
const hallTimber = "#5b3b2a";
const hallTrim = "#e9dcc0";
const roofTurf = "#4d5a3a";
const auroraGreen = "#4fd6a2";
const auroraViolet = "#8a6cf0";
const furBrown = "#6b4226";
const furDark = "#4a2d1a";
const furLight = "#8a5a36";
const ivory = "#efe4c8";
const bone = "#efe8da";
const blanketRed = "#b8333a";
const signColour = "#5a3a6e";

/* The museum hall at the back, open to the visitors (+z) */
const hall = { minX: -5.4, maxX: 1.0, minZ: -6.4, maxZ: -2.4, wall: 2.6 };
const floorHeight = 0.2;
const door = { x: -2.2, half: 0.85 };

/* The great woolly mammoth outside, facing the visitors */
const mammoth = { x: 3.7, z: 0.2 };
const backY = 3.62;
const earAt = (side: number): Triple => [
  mammoth.x + side * 0.72,
  3.25,
  mammoth.z + 1.5,
];
const tailAt: Triple = [mammoth.x, 2.75, mammoth.z - 1.72];
const ladderZ = mammoth.z - 2.2;

const pit = { x: -3.6, z: 2.4, radius: 1.25 };
const lanternAt: Triple = [door.x + door.half + 0.35, 2.15, hall.maxZ + 0.35];

const signAt: Triple = [-1.2, 0, 6.6];
const rideStart = { x: mammoth.x, z: ladderZ - 0.7 };
const rideFinish = { x: mammoth.x + 1.4, z: mammoth.z + 4.6 };

/* ------------------------------------------------------------------ */
/* The museum hall                                                     */
/* ------------------------------------------------------------------ */

const plankWall = (
  builder: AttractionBuilder,
  size: Triple,
  at: Triple,
  planks: number,
) => {
  builder.painted(
    new BoxGeometry(size[0], size[1], size[2], 1, planks, 1),
    (centre) =>
      Math.floor(centre.y / (size[1] / planks)) % 2 === 0
        ? hallTimber
        : shade(hallTimber, 0.86),
    { at },
    "matte",
    undefined,
  );
};

const buildHall = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, wall } = hall;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const centreX = (minX + maxX) / 2;
  const centreZ = (minZ + maxZ) / 2;
  const planks = builder.isFar ? 1 : 12;
  const thick = 0.16;
  /* Stone base and the floor */
  builder.box(
    "matte",
    palette.darkStone,
    [width + 0.2, floorHeight, depth + 0.2],
    [centreX, floorHeight / 2, centreZ],
  );
  const boards = builder.isFar ? 1 : 14;
  builder.painted(
    new BoxGeometry(width - 0.2, 0.02, depth - 0.2, boards, 1, 1),
    (centre) =>
      Math.floor((centre.x - minX) / (width / boards)) % 2 === 0
        ? palette.paleTimber
        : shade(palette.paleTimber, 0.92),
    { at: [centreX, floorHeight + 0.01, centreZ] },
    "matte",
    undefined,
  );
  /* Back and side walls */
  plankWall(
    builder,
    [width, wall, thick],
    [centreX, floorHeight + wall / 2, minZ + thick / 2],
    planks,
  );
  [minX + thick / 2, maxX - thick / 2].forEach((x) => {
    plankWall(
      builder,
      [thick, wall, depth],
      [x, floorHeight + wall / 2, centreZ],
      planks,
    );
  });
  /* The front: a low wall with tall windows, and the open doorway */
  const leftWidth = door.x - door.half - minX;
  const rightWidth = maxX - (door.x + door.half);
  [
    [minX + leftWidth / 2, leftWidth],
    [maxX - rightWidth / 2, rightWidth],
  ].forEach(([x, span]) => {
    plankWall(
      builder,
      [span, 0.8, thick],
      [x, floorHeight + 0.4, maxZ - thick / 2],
      builder.isFar ? 1 : 4,
    );
    builder.box(
      "matte",
      hallTimber,
      [span, 0.5, thick],
      [x, floorHeight + wall - 0.25, maxZ - thick / 2],
    );
    builder.box(
      "glass",
      "#a8cde0",
      [span - 0.1, wall - 1.3, 0.04],
      [x, floorHeight + 0.8 + (wall - 1.3) / 2, maxZ - thick / 2],
    );
    const mullions = Math.max(1, Math.round(span / 0.8));
    for (let mullion = 0; mullion <= mullions; mullion++) {
      builder.box(
        "paint",
        hallTrim,
        [0.08, wall - 1.3, 0.1],
        [
          x - span / 2 + (span * mullion) / mullions,
          floorHeight + 0.8 + (wall - 1.3) / 2,
          maxZ - thick / 2,
        ],
      );
    }
  });
  builder.box(
    "matte",
    hallTimber,
    [door.half * 2, 0.5, thick],
    [door.x, floorHeight + wall - 0.25, maxZ - thick / 2],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      hallTrim,
      [0.16, wall - 0.5, 0.2],
      [door.x + side * door.half, floorHeight + (wall - 0.5) / 2, maxZ],
    );
  });
  /* A steep roof with turf and snow, and carved crossed bargeboards */
  const eaves = floorHeight + wall;
  const rise = 2.0;
  const gable = new Shape([
    new Vector2(-depth / 2, 0),
    new Vector2(depth / 2, 0),
    new Vector2(0, rise),
  ]);
  builder.add(
    "matte",
    shade(hallTimber, 0.9),
    new ExtrudeGeometry(gable, { depth: width, bevelEnabled: false }),
    { at: [minX, eaves, centreZ], rotation: [0, Math.PI / 2, 0] },
  );
  const overhang = 0.4;
  const halfSpan = depth / 2 + overhang;
  const slope = Math.hypot(halfSpan, rise * (halfSpan / (depth / 2)));
  const angle = Math.atan2(rise, depth / 2);
  [1, -1].forEach((side) => {
    const slabZ = centreZ + (side * halfSpan) / 2;
    const slabY = eaves + rise / 2 + 0.02 - overhang * Math.tan(angle) * 0.5;
    builder.box(
      "matte",
      roofTurf,
      [width + overhang * 2, 0.14, slope],
      [centreX, slabY, slabZ],
      [side * angle, 0, 0],
    );
    builder.box(
      "matte",
      snow,
      [width + overhang * 2 - 0.1, 0.12, slope - 0.2],
      [centreX, slabY + 0.12, slabZ + side * 0.03],
      [side * angle, 0, 0],
    );
  });
  [minX - overhang + 0.05, maxX + overhang - 0.05].forEach((x) => {
    [1, -1].forEach((side) => {
      builder.box(
        "paint",
        hallTrim,
        [0.08, 0.2, slope + 0.6],
        [x, eaves + rise / 2 + 0.12, centreZ + (side * (halfSpan - 0.3)) / 2],
        [side * angle, 0, 0],
      );
    });
    if (!builder.isFar) {
      /* Dragon-head finials where the bargeboards cross */
      builder.sphere(
        "paint",
        hallTrim,
        0.14,
        [x, eaves + rise + 0.45, centreZ],
        [0.6, 1, 1.4],
        8,
      );
    }
  });
  /* The name board over the doorway, glowing in aurora colours */
  builder.box(
    "paint",
    signColour,
    [2.6, 0.45, 0.08],
    [door.x, eaves + 0.55, maxZ + 0.04],
  );
  builder.box(
    "glow",
    auroraGreen,
    [2.3, 0.07, 0.02],
    [door.x, eaves + 0.62, maxZ + 0.09],
  );
  builder.box(
    "glow",
    auroraViolet,
    [1.9, 0.05, 0.02],
    [door.x, eaves + 0.48, maxZ + 0.09],
  );
  /* A window in each side wall */
  addWindow(builder, {
    at: [minX - 0.01, floorHeight + 1.4, centreZ],
    width: 1.0,
    height: 0.8,
    frame: hallTrim,
    turn: -Math.PI / 2,
    isLit: true,
  });
  addWindow(builder, {
    at: [maxX + 0.01, floorHeight + 1.4, centreZ],
    width: 1.0,
    height: 0.8,
    frame: hallTrim,
    turn: Math.PI / 2,
    isLit: true,
  });
};

/* Inside: the skeleton, display cases and a cave painting */
const buildExhibits = (builder: AttractionBuilder) => {
  const y = floorHeight;
  const skeleton = { x: -2.2, z: -4.95 };
  builder.box(
    "matte",
    palette.stone,
    [3.4, 0.16, 1.1],
    [skeleton.x, y + 0.08, skeleton.z],
  );
  const top = y + 0.16;
  /* Legs */
  [-1.0, 0.9].forEach((along) => {
    [-0.28, 0.28].forEach((side) => {
      builder.bar(
        "matte",
        bone,
        [skeleton.x + along, top, skeleton.z + side],
        [skeleton.x + along * 0.95, top + 1.35, skeleton.z + side * 0.8],
        0.1,
        6,
      );
    });
  });
  /* Spine and ribs */
  const spine: Triple[] = [
    [skeleton.x - 1.35, top + 1.55, skeleton.z],
    [skeleton.x - 0.5, top + 1.75, skeleton.z],
    [skeleton.x + 0.5, top + 1.95, skeleton.z],
    [skeleton.x + 1.1, top + 1.8, skeleton.z],
  ];
  spine.slice(1).forEach((to, index) => {
    builder.bar("matte", bone, spine[index], to, 0.1, 6);
  });
  if (!builder.isFar) {
    for (let rib = 0; rib < 7; rib++) {
      const x = skeleton.x - 0.75 + rib * 0.25;
      const ribTop = top + 1.7 + rib * 0.03;
      builder.add(
        "matte",
        bone,
        new ExtrudeGeometry(
          (() => {
            const arc = new Shape();
            arc.absarc(0, 0, 0.5, Math.PI * 0.05, Math.PI * 0.95, false);
            arc.absarc(0, 0, 0.44, Math.PI * 0.95, Math.PI * 0.05, true);
            return arc;
          })(),
          { depth: 0.05, bevelEnabled: false, curveSegments: 6 },
        ),
        {
          at: [x, ribTop - 0.5, skeleton.z],
          rotation: [Math.PI, Math.PI / 2, 0],
        },
      );
    }
  }
  /* Skull and tusks */
  builder.sphere(
    "matte",
    bone,
    0.38,
    [skeleton.x + 1.45, top + 1.75, skeleton.z],
    [1, 1.1, 0.9],
    builder.isFar ? 8 : 14,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      ivory,
      [skeleton.x + 1.6, top + 1.45, skeleton.z + side * 0.18],
      [skeleton.x + 2.0, top + 0.95, skeleton.z + side * 0.32],
      0.1,
      6,
    );
    builder.bar(
      "matte",
      ivory,
      [skeleton.x + 2.0, top + 0.95, skeleton.z + side * 0.32],
      [skeleton.x + 2.25, top + 1.25, skeleton.z + side * 0.22],
      0.08,
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.06,
      [skeleton.x + 1.62, top + 1.85, skeleton.z + side * 0.26],
      [1, 1, 1],
      6,
    );
  });
  /* Glass display cases along the sides */
  [
    [hall.minX + 0.75, hall.maxZ - 1.0],
    [hall.maxX - 0.75, hall.maxZ - 1.0],
  ].forEach(([x, z], index) => {
    builder.box("matte", hallTimber, [0.9, 0.8, 0.9], [x, y + 0.4, z]);
    builder.box("glass", "#cfe8f6", [0.86, 0.6, 0.86], [x, y + 1.1, z]);
    builder.box("paint", hallTrim, [0.92, 0.04, 0.92], [x, y + 1.42, z]);
    if (!builder.isFar) {
      if (index === 0) {
        builder.bar(
          "matte",
          ivory,
          [x - 0.3, y + 0.85, z],
          [x + 0.25, y + 1.2, z + 0.1],
          0.08,
          6,
        );
      } else {
        builder.box("matte", "#8a7a64", [0.32, 0.22, 0.2], [x, y + 0.92, z]);
        builder.box("matte", "#a8977d", [0.3, 0.04, 0.18], [x, y + 1.04, z]);
      }
    }
  });
  if (builder.isFar) {
    return;
  }
  /* A cave painting of mammoths on the back wall */
  builder.box(
    "matte",
    "#c9a77a",
    [2.6, 1.2, 0.03],
    [skeleton.x, y + 1.6, hall.minZ + 0.18],
  );
  [-0.7, 0.5].forEach((dx, index) => {
    builder.sphere(
      "matte",
      "#6e3b22",
      0.28 - index * 0.06,
      [skeleton.x + dx, y + 1.6, hall.minZ + 0.2],
      [1.4, 1, 0.1],
      10,
    );
    builder.bar(
      "matte",
      "#6e3b22",
      [skeleton.x + dx + 0.3, y + 1.6, hall.minZ + 0.2],
      [skeleton.x + dx + 0.42, y + 1.25, hall.minZ + 0.2],
      0.05,
      4,
    );
  });
  [-1.1, 0.0, 1.0].forEach((dx) => {
    builder.box(
      "matte",
      "#3a2a1e",
      [0.03, 0.22, 0.02],
      [skeleton.x + dx, y + 1.3, hall.minZ + 0.2],
    );
  });
};

/* The aurora lantern by the door, lighting up as the Character comes */
const buildLantern = (builder: AttractionBuilder) => {
  builder.box("glow", auroraGreen, [0.2, 0.3, 0.2], [0, 0, 0]);
  builder.cylinder("paint", palette.black, {
    radius: 0.18,
    radiusEnd: 0.02,
    length: 0.14,
    at: [0, 0.22, 0],
    segments: 8,
  });
  builder.box("paint", palette.black, [0.24, 0.04, 0.24], [0, -0.17, 0]);
};

/* ------------------------------------------------------------------ */
/* The woolly mammoth                                                  */
/* ------------------------------------------------------------------ */

const trunkPath: [number, number, number][] = [
  [2.15, 2.75, 0.34],
  [2.6, 2.1, 0.3],
  [2.95, 1.45, 0.26],
  [3.3, 0.9, 0.22],
  [3.7, 0.52, 0.19],
  [4.1, 0.42, 0.16],
  [4.4, 0.6, 0.13],
];

const tuskPath = (side: number): Triple[] => [
  [side * 0.32, 2.45, 2.25],
  [side * 0.55, 1.8, 2.75],
  [side * 0.62, 1.55, 3.35],
  [side * 0.5, 1.75, 3.9],
  [side * 0.32, 2.15, 4.15],
];

const buildMammoth = (builder: AttractionBuilder) => {
  const isNear = !builder.isFar;
  const at = (x: number, y: number, z: number): Triple => [
    mammoth.x + x,
    y,
    mammoth.z + z,
  ];
  /* Legs and feet */
  [-1.05, 1.0].forEach((along) => {
    [-0.55, 0.55].forEach((side) => {
      builder.cylinder("matte", furDark, {
        radius: 0.36,
        radiusEnd: 0.42,
        length: 1.7,
        at: at(side, 0.85, along),
        segments: isNear ? 12 : 6,
      });
      builder.cylinder("matte", "#cbb79a", {
        radius: 0.44,
        length: 0.14,
        at: at(side, 0.07, along),
        segments: isNear ? 12 : 6,
      });
    });
  });
  /* The great shaggy body and its hump */
  builder.sphere(
    "matte",
    furBrown,
    1.35,
    at(0, 2.35, 0),
    [0.88, 0.85, 1.3],
    isNear ? 22 : 10,
  );
  builder.sphere(
    "matte",
    furLight,
    0.85,
    at(0, 3.05, 0.9),
    [0.9, 0.65, 1.0],
    isNear ? 16 : 8,
  );
  /* The head, with its high domed top */
  builder.sphere(
    "matte",
    furBrown,
    0.85,
    at(0, 3.0, 1.75),
    [0.85, 0.95, 0.85],
    isNear ? 18 : 8,
  );
  builder.sphere(
    "matte",
    furLight,
    0.5,
    at(0, 3.68, 1.65),
    [0.9, 0.9, 0.9],
    isNear ? 14 : 6,
  );
  /* The trunk, curling at the tip */
  trunkPath.slice(1).forEach(([z, y, radius], index) => {
    const [fromZ, fromY, fromRadius] = trunkPath[index];
    builder.bar(
      "matte",
      index % 2 === 0 ? furBrown : shade(furBrown, 0.92),
      at(0, fromY, fromZ),
      at(0, y, z),
      fromRadius + radius,
      isNear ? 12 : 6,
    );
    if (isNear) {
      builder.sphere("matte", furBrown, radius, at(0, y, z), [1, 1, 1], 10);
    }
  });
  /* Curving ivory tusks */
  [-1, 1].forEach((side) => {
    const tusk = tuskPath(side);
    tusk.slice(1).forEach((to, index) => {
      const from = tusk[index];
      builder.bar(
        "paint",
        ivory,
        at(from[0], from[1], from[2]),
        at(to[0], to[1], to[2]),
        0.2 - index * 0.035,
        isNear ? 10 : 5,
      );
    });
  });
  if (!isNear) {
    return;
  }
  /* Eyes, and long hair hanging all round */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.07,
      at(side * 0.5, 3.15, 2.3),
      [1, 1, 1],
      8,
    );
    builder.sphere(
      "paint",
      palette.white,
      0.02,
      at(side * 0.5, 3.18, 2.36),
      [1, 1, 1],
      4,
    );
    builder.box(
      "matte",
      furDark,
      [0.18, 0.05, 0.08],
      at(side * 0.5, 3.26, 2.3),
      [0, 0, side * 0.2],
    );
  });
  for (let lock = 0; lock < 22; lock++) {
    const angle = (lock / 22) * Math.PI * 2;
    const length = 0.75 + (lock % 3) * 0.18;
    builder.cylinder("matte", lock % 2 === 0 ? furDark : furBrown, {
      radius: 0.2,
      radiusEnd: 0.03,
      length,
      at: at(
        Math.sin(angle) * 1.1,
        1.45 - length / 2 + 0.3,
        Math.cos(angle) * 1.6,
      ),
      segments: 5,
    });
  }
  for (let lock = 0; lock < 8; lock++) {
    const angle = (lock / 8) * Math.PI * 2;
    builder.cylinder("matte", furDark, {
      radius: 0.14,
      radiusEnd: 0.02,
      length: 0.55,
      at: at(Math.sin(angle) * 0.62, 2.25, 1.85 + Math.cos(angle) * 0.4),
      segments: 5,
    });
  }
};

/* The saddle on its back, and the ladder up its side */
const buildSaddle = (builder: AttractionBuilder) => {
  const at = (x: number, y: number, z: number): Triple => [
    mammoth.x + x,
    y,
    mammoth.z + z,
  ];
  builder.box(
    "matte",
    blanketRed,
    [1.9, 0.08, 2.3],
    at(0, backY - 0.12, 0.2),
    [0, 0, 0],
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [1.0, 0.1, 2.0],
    at(0, backY - 0.02, 0.2),
  );
  [-0.5, 0.5].forEach((side) => {
    builder.bar(
      "paint",
      blanketRed,
      at(side, backY + 0.6, -0.75),
      at(side, backY + 0.6, 1.15),
      0.06,
      5,
    );
    [-0.75, 0.2, 1.15].forEach((along) => {
      builder.box(
        "matte",
        palette.darkTimber,
        [0.07, 0.62, 0.07],
        at(side, backY + 0.3, along),
      );
    });
  });
  if (!builder.isFar) {
    for (let tassel = 0; tassel < 9; tassel++) {
      const along = -0.85 + tassel * 0.26;
      [-1, 1].forEach((side) => {
        builder.box(
          "matte",
          "#f2c230",
          [0.03, 0.22, 0.05],
          at(side * 0.96, backY - 0.28, along),
        );
      });
    }
  }
  /* The ladder, leaning on its back */
  [-0.3, 0.3].forEach((side) => {
    builder.bar(
      "matte",
      palette.darkTimber,
      at(side, 0, ladderZ - mammoth.z),
      at(side, backY + 0.3, -1.25),
      0.08,
      5,
    );
  });
  const rungs = builder.isFar ? 4 : 11;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    builder.box(
      "matte",
      palette.paleTimber,
      [0.6, 0.05, 0.07],
      at(
        0,
        (backY + 0.3) * share,
        ladderZ - mammoth.z + (-1.25 - ladderZ + mammoth.z) * share,
      ),
    );
  }
};

/* Its ears, which flap as the Character comes near */
const buildEar = (side: number) => (builder: AttractionBuilder) => {
  builder.sphere(
    "matte",
    furDark,
    0.32,
    [side * 0.12, -0.05, -0.05],
    [0.35, 1.05, 0.85],
    builder.isFar ? 6 : 12,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      "#8f5d3d",
      0.24,
      [side * 0.18, -0.05, -0.03],
      [0.2, 0.9, 0.75],
      10,
    );
  }
};

/* Its short tail with a tuft, which swishes to and fro */
const buildTail = (builder: AttractionBuilder) => {
  builder.bar("matte", furBrown, [0, 0, 0], [0, -0.55, -0.22], 0.12, 6);
  builder.sphere("matte", furDark, 0.13, [0, -0.66, -0.26], [1, 1.5, 1], 8);
};

/* ------------------------------------------------------------------ */
/* The fossil dig pit                                                  */
/* ------------------------------------------------------------------ */

const buildPit = (builder: AttractionBuilder) => {
  builder.add(
    "matte",
    "#d8c08e",
    new CircleGeometry(pit.radius, builder.segments(24, 10)),
    { at: [pit.x, 0.02, pit.z], rotation: [-Math.PI / 2, 0, 0] },
  );
  builder.torus(
    "matte",
    palette.timber,
    pit.radius + 0.05,
    0.1,
    [pit.x, 0.08, pit.z],
    "y",
    builder.isFar ? 10 : 24,
  );
  if (builder.isFar) {
    return;
  }
  /* Bones poking out of the sand, a bucket and brushes */
  builder.bar(
    "matte",
    bone,
    [pit.x - 0.6, 0.05, pit.z - 0.3],
    [pit.x - 0.1, 0.1, pit.z - 0.5],
    0.08,
    6,
  );
  builder.sphere(
    "matte",
    bone,
    0.07,
    [pit.x - 0.62, 0.06, pit.z - 0.3],
    [1.3, 1, 1],
    6,
  );
  builder.sphere(
    "matte",
    bone,
    0.07,
    [pit.x - 0.08, 0.1, pit.z - 0.5],
    [1.3, 1, 1],
    6,
  );
  builder.cylinder("paint", auroraViolet, {
    radius: 0.16,
    radiusEnd: 0.12,
    length: 0.28,
    at: [pit.x + 0.7, 0.14, pit.z + 0.3],
    segments: 10,
  });
  [0, 0.12].forEach((offset) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [pit.x + 0.2 + offset, 0.04, pit.z + 0.6],
      [pit.x + 0.45 + offset, 0.04, pit.z + 0.75],
      0.03,
      4,
    );
    builder.box(
      "matte",
      palette.black,
      [0.07, 0.04, 0.1],
      [pit.x + 0.47 + offset, 0.04, pit.z + 0.78],
    );
  });
};

/* A giant mammoth tooth that rises out of the sand as the Character comes */
const buildTooth = (builder: AttractionBuilder) => {
  const ridges = builder.isFar ? 1 : 6;
  builder.box("matte", "#a8977d", [0.55, 0.42, 0.38], [0, 0.21, 0]);
  for (let ridge = 0; ridge < ridges; ridge++) {
    builder.box(
      "matte",
      ridge % 2 === 0 ? "#e2d6bc" : "#8a7a64",
      [0.08, 0.06, 0.4],
      [-0.22 + ridge * 0.09, 0.44, 0],
    );
  }
  builder.box("matte", "#7a6a54", [0.4, 0.2, 0.3], [0, -0.1, 0]);
};

/* ------------------------------------------------------------------ */
/* Grounds and visitors                                                */
/* ------------------------------------------------------------------ */

const pines: [number, number, number][] = [
  [-7.4, -4.0, 1.2],
  [-6.4, -7.2, 1.0],
  [3.4, -6.6, 1.3],
  [6.8, -3.6, 1.05],
  [-8.0, 0.6, 0.9],
];

const addPine = (
  builder: AttractionBuilder,
  [x, z, size]: [number, number, number],
) => {
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.13 * size,
    radiusEnd: 0.08 * size,
    length: 0.8 * size,
    at: [x, 0.4 * size, z],
    segments: 7,
  });
  const tiers = builder.isFar ? 2 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const share = tier / tiers;
    const radius = (1.0 - share * 0.55) * size;
    const height = (1.35 - share * 0.25) * size;
    const base = (0.55 + share * 1.8) * size;
    builder.cylinder("matte", tier % 2 === 0 ? pine : shade(pine, 1.12), {
      radius,
      radiusEnd: 0.02,
      length: height,
      at: [x, base + height / 2, z],
      segments: 9,
    });
    if (!builder.isFar) {
      const cap = height * 0.45;
      builder.cylinder("matte", snow, {
        radius: radius * 0.55,
        radiusEnd: 0.03,
        length: cap,
        at: [x, base + height - cap / 2 + 0.03, z],
        segments: 9,
      });
    }
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  pines.forEach((tree) => {
    addPine(builder, tree);
  });
  /* Paths from the sign to the door and to the mammoth */
  builder.box("matte", "#b9b2a6", [1.6, 0.02, 8.2], [door.x + 0.4, 0.01, 2.0]);
  builder.box("matte", "#b9b2a6", [5.2, 0.02, 1.2], [1.0, 0.01, 4.4]);
  /* The lantern's post */
  builder.cylinder("paint", palette.black, {
    radius: 0.045,
    length: lanternAt[1] - 0.15,
    at: [lanternAt[0], (lanternAt[1] - 0.15) / 2, lanternAt[2]],
    segments: 8,
  });
  addBench(builder, [-0.2, 0, 2.0], -Math.PI / 2, hallTimber);
  addLampPost(builder, [-3.0, 0, 5.4]);
  addLampPost(builder, [1.6, 0, 5.6]);
  if (builder.isFar) {
    return;
  }
  [
    [6.6, 3.4, 0.5],
    [-6.6, 4.4, 0.45],
    [2.6, 7.6, 0.4],
    [6.6, -1.0, 0.4],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowShadow, size, [x, 0, z], [1.6, 0.45, 1.1], 8);
  });
  /* An information board about the Ice Age */
  builder.box("matte", palette.darkTimber, [0.08, 1.2, 0.08], [-5.4, 0.6, 0.4]);
  builder.box("matte", palette.darkTimber, [0.08, 1.2, 0.08], [-4.4, 0.6, 0.4]);
  builder.box("paint", signColour, [1.2, 0.7, 0.05], [-4.9, 1.15, 0.43]);
  builder.box("paint", "#cfe8f6", [1.0, 0.25, 0.02], [-4.9, 1.28, 0.47]);
  builder.sphere("matte", furBrown, 0.12, [-5.1, 1.0, 0.47], [1.4, 1, 0.2], 8);
  builder.box("matte", snowBright, [0.5, 0.05, 0.02], [-4.75, 1.0, 0.47]);
};

/* Young visitors in bobble hats */
const buildVisitor = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.cylinder("matte", "#2b3442", {
      radius: 0.05,
      length: 0.36,
      at: [side, 0.18, 0],
      segments: 6,
    });
    builder.box(
      "matte",
      palette.black,
      [0.09, 0.07, 0.15],
      [side, 0.035, 0.03],
    );
  });
  builder.lathe(
    "matte",
    auroraViolet,
    [
      [0, 0.34],
      [0.15, 0.36],
      [0.16, 0.52],
      [0.12, 0.66],
      [0, 0.68],
    ],
    [0, 0, 0],
    "y",
    builder.isFar ? 5 : 9,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      auroraViolet,
      [side * 0.12, 0.62, 0],
      [side * 0.2, 0.4, 0.04],
      0.06,
      5,
    );
  });
  builder.torus("matte", auroraGreen, 0.07, 0.03, [0, 0.68, 0], "y", 8);
  builder.sphere("matte", "#f0c8a8", 0.1, [0, 0.78, 0], [1, 1, 1], 9);
  builder.sphere("matte", auroraGreen, 0.105, [0, 0.83, 0], [1, 0.75, 1], 9);
  builder.sphere("matte", snowBright, 0.04, [0, 0.94, 0], [1, 1, 1], 6);
};

/* ------------------------------------------------------------------ */
/* The ride: up the ladder, along its back and down its trunk          */
/* ------------------------------------------------------------------ */

const slidePath: [number, number][] = [
  [0.9, backY + 0.05],
  [1.65, 4.2],
  [2.2, 3.8],
  [2.55, 3.0],
  [2.8, 2.3],
  [3.05, 1.65],
  [3.35, 1.1],
  [3.7, 0.75],
  [4.15, 0.6],
];

const slideAt = (share: number): [number, number] => {
  const position = share * (slidePath.length - 1);
  const index = Math.min(slidePath.length - 2, Math.floor(position));
  const step = position - index;
  const [fromZ, fromY] = slidePath[index];
  const [toZ, toY] = slidePath[index + 1];
  return [fromZ + (toZ - fromZ) * step, fromY + (toY - fromY) * step];
};

const mammothRide = (progress: number): LocalSpot => {
  if (progress < 0.06) {
    const share = progress / 0.06;
    return {
      x: mammoth.x,
      y: 0,
      z: rideStart.z + (ladderZ - rideStart.z) * share,
      heading: 0,
    };
  }
  if (progress < 0.32) {
    const share = (progress - 0.06) / 0.26;
    return {
      x: mammoth.x,
      y: (backY + 0.05) * share,
      z: ladderZ + (mammoth.z - 1.0 - ladderZ) * share,
      heading: 0,
    };
  }
  if (progress < 0.46) {
    const share = (progress - 0.32) / 0.14;
    return {
      x: mammoth.x,
      y: backY + 0.05,
      z: mammoth.z - 1.0 + (slidePath[0][0] + 1.0) * share,
      heading: 0,
    };
  }
  if (progress < 0.9) {
    const share = ((progress - 0.46) / 0.44) ** 1.3;
    const [z, y] = slideAt(share);
    return { x: mammoth.x, y: y + 0.12, z: mammoth.z + z, heading: 0 };
  }
  const share = (progress - 0.9) / 0.1;
  const [endZ, endY] = slidePath[slidePath.length - 1];
  return {
    x: mammoth.x + (rideFinish.x - mammoth.x) * share,
    y: (endY + 0.12) * (1 - share),
    z: mammoth.z + endZ + (rideFinish.z - mammoth.z - endZ) * share,
    heading: Math.PI / 4,
  };
};

export const mammothMuseumModel: NewLandAttractionModel = {
  kind: "mammoth-museum",
  islandId: "frost-isle",
  name: "Mammoth Museum",
  fact: "Woolly mammoths lived long ago in the Ice Age, when much of the land was covered in snow and ice. They were suited to the cold, with long shaggy fur, a thick layer of fat and small ears that lost less heat. We know about them from bones, tusks and even whole mammoths found frozen in the ice.",
  curriculumLink:
    "Science, Year 2: living things and their habitats. Animals are suited to where they live, like the woolly mammoth with its thick fur, fat and small ears for the icy cold.",
  footprint: 10,
  setting: "inland",
  padColour: snow,
  signSpot: { x: signAt[0], z: signAt[2] + 1.0 },
  build: (builder) => {
    buildHall(builder);
    buildExhibits(builder);
    buildMammoth(builder);
    buildSaddle(builder);
    buildPit(builder);
    buildGrounds(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    {
      name: "left ear",
      pivot: earAt(-1),
      build: buildEar(-1),
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 0.5, period: 1.2 },
    },
    {
      name: "right ear",
      pivot: earAt(1),
      build: buildEar(1),
      motion: {
        kind: "nod",
        axis: "y",
        reach: 6,
        amplitude: 0.5,
        period: 1.2,
        phase: Math.PI,
      },
    },
    {
      name: "tail",
      pivot: tailAt,
      build: buildTail,
      motion: { kind: "swing", axis: "z", amplitude: 0.4, period: 2.2 },
    },
    {
      name: "giant tooth",
      pivot: [pit.x, -0.5, pit.z],
      build: buildTooth,
      motion: { kind: "rise", reach: 3.5, height: 0.6, period: 1.8 },
    },
    {
      name: "aurora lantern",
      pivot: lanternAt,
      build: buildLantern,
      motion: { kind: "wake", reach: 6 },
    },
  ],
  wanderers: [
    {
      name: "young visitors",
      build: buildVisitor,
      count: 2,
      centre: { x: -1.2, z: 3.0 },
      radius: 1.2,
      speed: 0.5,
    },
  ],
  blockers: [
    { x: mammoth.x, z: mammoth.z - 0.6, radius: 1.1 },
    { x: mammoth.x, z: mammoth.z + 0.9, radius: 1.1 },
  ] satisfies LocalBlocker[],
  decks: [
    buildFlatDeck(
      {
        minX: hall.minX + 0.16,
        maxX: hall.maxX - 0.16,
        minZ: hall.minZ + 0.16,
        maxZ: hall.maxZ + 0.1,
      },
      floorHeight,
    ),
  ],
  rides: [
    {
      id: "mammoth-slide",
      name: "the mammoth's trunk slide",
      start: rideStart,
      reach: 0.7,
      seconds: 12,
      finish: rideFinish,
      follow: mammothRide,
    },
  ],
  play: {
    label: "Pat the woolly mammoth",
    news: "The great woolly mammoth flapped its little ears and swished its tail. Its fur felt thick, shaggy and warm!",
  },
};
