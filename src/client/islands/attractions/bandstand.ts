import { CylinderGeometry, LatheGeometry, TorusGeometry, Vector2 } from "three";
import {
  addBush,
  addLampPost,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type AttractionModel,
  type LocalBlocker,
  type Triple,
} from "./attraction-kit.js";

const heritageGreen = "#2d5a40";
const darkGreen = "#1f4030";
const heritageCream = "#ece1c4";
const heritageRed = "#9b2c26";
const gilt = "#c9a24a";
const brick = "#9c4d36";
const mortar = "#c9b9a2";
const coping = "#cfc5b0";
const floorBoards = "#a7784a";

const sides = 8;
const faceTurn = Math.PI / sides;
const baseRadius = 2.45;
const floorHeight = 0.82;
const columnRadius = 2.28;
const columnHeight = 2.45;
const eaveHeight = floorHeight + columnHeight;
const apothem = (radius: number): number => radius * Math.cos(Math.PI / sides);
const stepCount = 4;
const stepRise = floorHeight / (stepCount + 0.3);
const stepDepth = 0.3;

const cornerAngle = (index: number): number =>
  (index / sides) * Math.PI * 2 + faceTurn;
const bayAngle = (index: number): number => (index / sides) * Math.PI * 2;

/** An octagonal prism with a flat face to +z, kept eight-sided far off. */
const addOctagon = (
  builder: AttractionBuilder,
  finish: "matte" | "paint" | "metal",
  colour: string,
  radius: number,
  height: number,
  bottom: number,
  {
    radiusTop = radius,
    isOpen = false,
  }: { radiusTop?: number; isOpen?: boolean } = {},
) => {
  builder.add(
    finish,
    colour,
    new CylinderGeometry(radiusTop, radius, height, sides, 1, isOpen),
    { at: [0, bottom + height / 2, 0], rotation: [0, faceTurn, 0] },
    undefined,
  );
};

/* The base, steps and floor */

const buildBase = (builder: AttractionBuilder) => {
  addOctagon(builder, "matte", palette.darkStone, baseRadius + 0.1, 0.14, 0);
  addOctagon(builder, "matte", brick, baseRadius, floorHeight - 0.24, 0.14);
  addOctagon(
    builder,
    "matte",
    coping,
    baseRadius + 0.14,
    0.12,
    floorHeight - 0.1,
  );
  addOctagon(
    builder,
    "matte",
    floorBoards,
    columnRadius + 0.12,
    0.02,
    floorHeight,
  );
  if (!builder.isFar) {
    [0.3, 0.45].forEach((height) => {
      addOctagon(builder, "matte", mortar, baseRadius + 0.006, 0.018, height, {
        isOpen: true,
      });
    });
    for (let corner = 0; corner < sides; corner++) {
      const angle = cornerAngle(corner);
      builder.box(
        "matte",
        coping,
        [0.2, floorHeight - 0.24, 0.2],
        [
          Math.sin(angle) * (baseRadius - 0.02),
          0.14 + (floorHeight - 0.24) / 2,
          Math.cos(angle) * (baseRadius - 0.02),
        ],
        [0, angle, 0],
      );
    }
    for (let bay = 1; bay < sides; bay++) {
      const angle = bayAngle(bay);
      const out = apothem(baseRadius) + 0.01;
      builder.box(
        "matte",
        shade(brick, 0.78),
        [0.9, 0.24, 0.02],
        [Math.sin(angle) * out, 0.42, Math.cos(angle) * out],
        [0, angle, 0],
      );
      builder.box(
        "paint",
        heritageGreen,
        [0.78, 0.14, 0.02],
        [
          Math.sin(angle) * (out + 0.005),
          0.42,
          Math.cos(angle) * (out + 0.005),
        ],
        [0, angle, 0],
      );
    }
  }
  const front = apothem(baseRadius);
  for (let step = 0; step < stepCount; step++) {
    const height = floorHeight - stepRise * (step + 1) + stepRise;
    builder.box(
      "matte",
      step % 2 === 0 ? coping : shade(coping, 0.94),
      [1.5 + step * 0.08, height, stepDepth + 0.02],
      [0, height / 2, front + stepDepth * (step + 0.5)],
    );
  }
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", coping, {
      radius: 0.14,
      length: 0.5,
      at: [side * 0.86, 0.25, front + stepDepth * stepCount - 0.1],
      segments: 10,
    });
    builder.sphere(
      "matte",
      coping,
      0.13,
      [side * 0.86, 0.58, front + stepDepth * stepCount - 0.1],
      [1, 1, 1],
      8,
    );
  });
};

/* The cast-iron columns, brackets, railings and roof */

const buildColumns = (builder: AttractionBuilder) => {
  for (let corner = 0; corner < sides; corner++) {
    const angle = cornerAngle(corner);
    const x = Math.sin(angle) * columnRadius;
    const z = Math.cos(angle) * columnRadius;
    builder.lathe(
      "paint",
      heritageGreen,
      [
        [0, 0],
        [0.12, 0],
        [0.12, 0.12],
        [0.08, 0.18],
        [0.07, 0.3],
        [0.055, 0.42],
        [0.05, columnHeight - 0.32],
        [0.07, columnHeight - 0.2],
        [0.12, columnHeight - 0.08],
        [0.13, columnHeight],
        [0, columnHeight],
      ],
      [x, floorHeight, z],
      "y",
      8,
    );
    if (!builder.isFar) {
      builder.torus(
        "metal",
        gilt,
        0.065,
        0.018,
        [x, floorHeight + columnHeight - 0.3, z],
        "y",
        8,
      );
    }
  }
};

const buildBrackets = (builder: AttractionBuilder) => {
  const chord = 2 * columnRadius * Math.sin(Math.PI / sides);
  const archRadius = 1.15;
  const halfArc = Math.asin(chord / 2 / archRadius);
  const springing = eaveHeight - 0.42;
  const centreHeight = springing - archRadius * Math.cos(halfArc);
  const across = apothem(columnRadius);
  for (let bay = 0; bay < sides; bay++) {
    const angle = bayAngle(bay);
    builder.add(
      "paint",
      heritageCream,
      new TorusGeometry(
        archRadius,
        0.035,
        builder.segments(5, 3),
        builder.segments(14, 6),
        halfArc * 2,
      ),
      {
        at: [Math.sin(angle) * across, centreHeight, Math.cos(angle) * across],
        rotation: [0, angle, Math.PI / 2 - halfArc],
      },
    );
    if (builder.isFar) {
      continue;
    }
    [-1, 1].forEach((side) => {
      const along = side * chord * 0.33;
      const ringAt: Triple = [
        Math.sin(angle) * across + Math.cos(angle) * along,
        springing + 0.2,
        Math.cos(angle) * across - Math.sin(angle) * along,
      ];
      builder.add(
        "paint",
        heritageCream,
        new TorusGeometry(0.11, 0.022, 3, 10),
        { at: ringAt, rotation: [0, angle, 0] },
      );
    });
    builder.sphere(
      "metal",
      gilt,
      0.05,
      [
        Math.sin(angle) * across,
        centreHeight + archRadius + 0.04,
        Math.cos(angle) * across,
      ],
      [1, 1, 1],
      8,
    );
  }
};

const buildRailing = (builder: AttractionBuilder) => {
  const railTop = floorHeight + 0.62;
  for (let bay = 1; bay < sides; bay++) {
    const from = cornerAngle(bay - 1);
    const to = cornerAngle(bay);
    const start: Triple = [
      Math.sin(from) * columnRadius,
      0,
      Math.cos(from) * columnRadius,
    ];
    const end: Triple = [
      Math.sin(to) * columnRadius,
      0,
      Math.cos(to) * columnRadius,
    ];
    [railTop, floorHeight + 0.1].forEach((height, index) => {
      builder.bar(
        "paint",
        index === 0 ? heritageGreen : darkGreen,
        [start[0], height, start[2]],
        [end[0], height, end[2]],
        index === 0 ? 0.06 : 0.04,
        6,
      );
    });
    if (builder.isFar) {
      continue;
    }
    const balusters = 9;
    for (let post = 1; post < balusters; post++) {
      const share = post / balusters;
      const x = start[0] + (end[0] - start[0]) * share;
      const z = start[2] + (end[2] - start[2]) * share;
      builder.cylinder("paint", post % 2 === 0 ? heritageCream : darkGreen, {
        radius: 0.018,
        length: railTop - floorHeight - 0.1,
        at: [x, (railTop + floorHeight + 0.1) / 2, z],
        segments: 5,
      });
    }
  }
};

const buildRoof = (builder: AttractionBuilder) => {
  addOctagon(
    builder,
    "paint",
    heritageCream,
    columnRadius + 0.16,
    0.24,
    eaveHeight,
  );
  addOctagon(
    builder,
    "paint",
    heritageRed,
    columnRadius + 0.18,
    0.06,
    eaveHeight + 0.02,
    { isOpen: true },
  );
  addOctagon(
    builder,
    "paint",
    heritageCream,
    columnRadius + 0.6,
    0.03,
    eaveHeight + 0.22,
  );
  const roofProfile: [number, number][] = [
    [columnRadius + 0.62, 0],
    [columnRadius + 0.3, 0.1],
    [1.95, 0.3],
    [1.5, 0.62],
    [1.12, 1.0],
    [0.84, 1.32],
    [0.58, 1.58],
    [0.34, 1.75],
    [0.14, 1.84],
    [0, 1.86],
  ];
  const roof = new LatheGeometry(
    roofProfile.map(([radius, height]) => new Vector2(radius, height)),
    sides,
  );
  builder.add("paint", heritageGreen, roof, {
    at: [0, eaveHeight + 0.24, 0],
    rotation: [0, faceTurn, 0],
  });
  if (!builder.isFar) {
    for (let corner = 0; corner < sides; corner++) {
      const angle = cornerAngle(corner);
      const points = roofProfile.slice(0, -1);
      for (let piece = 0; piece < points.length - 1; piece++) {
        const [radius, height] = points[piece];
        const [nextRadius, nextHeight] = points[piece + 1];
        builder.bar(
          "paint",
          heritageCream,
          [
            Math.sin(angle) * radius,
            eaveHeight + 0.25 + height,
            Math.cos(angle) * radius,
          ],
          [
            Math.sin(angle) * nextRadius,
            eaveHeight + 0.25 + nextHeight,
            Math.cos(angle) * nextRadius,
          ],
          0.05,
          4,
        );
      }
    }
  }
  const crown = eaveHeight + 0.24 + 1.82;
  builder.lathe(
    "metal",
    gilt,
    [
      [0, 0],
      [0.12, 0],
      [0.1, 0.08],
      [0.05, 0.14],
      [0.11, 0.24],
      [0.11, 0.3],
      [0.04, 0.42],
      [0.03, 0.62],
      [0.06, 0.66],
      [0.0, 0.9],
    ],
    [0, crown, 0],
    "y",
    10,
  );
  addOctagon(
    builder,
    "paint",
    shade(heritageCream, 0.9),
    columnRadius + 0.16,
    0.02,
    eaveHeight - 0.01,
  );
};

/* The band's things */

const chairSpots: [number, number, number][] = [
  [-1.25, -0.2, 1.1],
  [-0.75, -0.95, 0.6],
  [0, -1.25, 0],
  [0.75, -0.95, -0.6],
  [1.25, -0.2, -1.1],
];

const buildBand = (builder: AttractionBuilder) => {
  chairSpots.forEach(([x, z, turn], index) => {
    const place = (dx: number, dy: number, dz: number): Triple => [
      x + dx * Math.cos(turn) + dz * Math.sin(turn),
      floorHeight + dy,
      z - dx * Math.sin(turn) + dz * Math.cos(turn),
    ];
    builder.box("paint", darkGreen, [0.34, 0.04, 0.32], place(0, 0.32, 0), [
      0,
      turn,
      0,
    ]);
    builder.box("paint", darkGreen, [0.34, 0.26, 0.03], place(0, 0.5, -0.16), [
      -0.1,
      turn,
      0,
    ]);
    if (!builder.isFar) {
      [-0.15, 0.15].forEach((side) => {
        [-0.13, 0.13].forEach((depth) => {
          builder.bar(
            "metal",
            palette.darkSteel,
            place(side, 0, depth),
            place(side, 0.31, depth),
            0.025,
            4,
          );
        });
      });
      const stand = place(0, 0, 0.6);
      builder.bar(
        "metal",
        palette.black,
        stand,
        [stand[0], stand[1] + 0.82, stand[2]],
        0.025,
        5,
      );
      [0, 2.1, 4.2].forEach((spread) => {
        builder.bar(
          "metal",
          palette.black,
          [stand[0], stand[1] + 0.2, stand[2]],
          [
            stand[0] + Math.sin(spread) * 0.16,
            stand[1],
            stand[2] + Math.cos(spread) * 0.16,
          ],
          0.02,
          4,
        );
      });
      builder.box(
        "metal",
        palette.black,
        [0.34, 0.24, 0.015],
        [stand[0], stand[1] + 0.9, stand[2]],
        [-0.45, turn, 0],
      );
      builder.box(
        "matte",
        palette.white,
        [0.3, 0.2, 0.01],
        place(0, 0.9, 0.59),
        [-0.45, turn, 0],
      );
    }
    if (index === 1 || index === 3) {
      const bellAt = place(0.02, 0.62, 0.02);
      builder.lathe(
        "metal",
        palette.brass,
        [
          [0, 0],
          [0.05, 0],
          [0.07, 0.2],
          [0.12, 0.34],
          [0.2, 0.42],
          [0.21, 0.44],
        ],
        bellAt,
        "y",
        builder.segments(14, 6),
      );
      if (!builder.isFar) {
        builder.torus(
          "metal",
          palette.brass,
          0.1,
          0.022,
          [bellAt[0], bellAt[1] + 0.05, bellAt[2]],
          "z",
          12,
        );
      }
    }
  });
  builder.box(
    "paint",
    heritageRed,
    [0.5, 0.12, 0.5],
    [0, floorHeight + 0.06, 0.75],
  );
  if (!builder.isFar) {
    builder.bar(
      "metal",
      palette.brass,
      [0, floorHeight + 0.12, 0.75],
      [0, floorHeight + 1.0, 0.75],
      0.03,
      6,
    );
    builder.box(
      "metal",
      palette.brass,
      [0.32, 0.22, 0.02],
      [0, floorHeight + 1.06, 0.68],
      [-0.5, 0, 0],
    );
  }
};

/* The park round it */

const stripeColours = ["#c8423a", "#efe4c8", "#2f6fa6", "#efe4c8", "#c8423a"];

const addDeckchair = (builder: AttractionBuilder, at: Triple, turn: number) => {
  const place = (dx: number, dy: number, dz: number): Triple => [
    at[0] + dx * Math.cos(turn) + dz * Math.sin(turn),
    at[1] + dy,
    at[2] - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  const wood = palette.paleTimber;
  [-0.26, 0.26].forEach((side) => {
    builder.bar(
      "matte",
      wood,
      place(side, 0, 0.26),
      place(side, 0.74, -0.34),
      0.04,
      4,
    );
    builder.bar(
      "matte",
      wood,
      place(side, 0, -0.22),
      place(side, 0.36, 0.2),
      0.04,
      4,
    );
    builder.bar(
      "matte",
      wood,
      place(side, 0.36, 0.2),
      place(side, 0.36, -0.12),
      0.035,
      4,
    );
  });
  const lean = Math.atan2(0.6, 0.6);
  stripeColours.forEach((colour, index) => {
    const across = -0.2 + index * 0.1;
    builder.box(
      "matte",
      colour,
      [0.1, 0.012, 0.74],
      place(across, 0.42, -0.06),
      [lean * 0.72, turn, 0],
    );
  });
};

interface FlowerBed {
  x: number;
  z: number;
  radius: number;
}

const flowerBeds: FlowerBed[] = [
  { x: -2.3, z: 4.4, radius: 0.9 },
  { x: 2.3, z: 4.4, radius: 0.9 },
];

const flowerColours = ["#d8455b", "#f2c23b", "#8a5cc2", "#f4f1ea", "#e8782f"];

const buildFlowerBed = (builder: AttractionBuilder, bed: FlowerBed) => {
  builder.cylinder("matte", palette.stone, {
    radius: bed.radius + 0.08,
    length: 0.12,
    at: [bed.x, 0.06, bed.z],
    segments: 20,
  });
  builder.cylinder("matte", palette.soil, {
    radius: bed.radius,
    radiusEnd: bed.radius - 0.1,
    length: 0.2,
    at: [bed.x, 0.1, bed.z],
    segments: 20,
  });
  builder.sphere(
    "matte",
    shade(palette.leaf, 0.9),
    bed.radius - 0.06,
    [bed.x, 0.16, bed.z],
    [1, 0.22, 1],
    builder.segments(14, 8),
  );
  const count = builder.isFar ? 5 : 14;
  for (let flower = 0; flower < count; flower++) {
    const angle = flower * 2.39996;
    const reach = Math.sqrt((flower + 0.5) / count) * (bed.radius - 0.18);
    const x = bed.x + Math.sin(angle) * reach;
    const z = bed.z + Math.cos(angle) * reach;
    builder.sphere(
      "matte",
      flowerColours[flower % flowerColours.length],
      0.08,
      [x, 0.28 - reach * 0.08, z],
      [1, 0.8, 1],
      6,
    );
  }
};

const deckchairs: [number, number, number][] = [
  [-3.8, 1.6, Math.PI + 1.15],
  [-3.4, 2.7, Math.PI + 0.8],
  [3.6, 2.2, Math.PI - 1.0],
  [4.1, 0.9, Math.PI - 1.35],
];

const buildPark = (builder: AttractionBuilder) => {
  builder.cylinder("matte", palette.gravel, {
    radius: 3.25,
    length: 0.04,
    at: [0, 0.02, 0],
    segments: builder.segments(40, 16),
  });
  builder.box("matte", palette.gravel, [1.6, 0.04, 4.6], [0, 0.02, 5.2]);
  deckchairs.forEach(([x, z, turn]) => {
    addDeckchair(builder, [x, 0, z], turn);
  });
  flowerBeds.forEach((bed) => {
    buildFlowerBed(builder, bed);
  });
  addLampPost(builder, [-1.15, 0, 5.4], 2.4);
  addLampPost(builder, [1.15, 0, 5.4], 2.4);
  addTree(builder, [-5.2, 0, -4.4], 1.2);
  addTree(builder, [5.4, 0, -3.8], 1.05, "#4a9440");
  addBush(builder, [-6.2, 0, 1.0], 0.5, "#3a7d34");
  addBush(builder, [6.1, 0, 4.2], 0.55);
  addBush(builder, [0.6, 0, -6.2], 0.6, "#3a7d34");
  addSignBoard(builder, [-2.3, 0, 6.3], heritageGreen);
};

export const bandstandModel: AttractionModel = {
  kind: "bandstand",
  name: "Bandstand",
  fact: "Bandstands were built in parks in Victorian times so that brass bands could play on summer afternoons. Every sound is made by something vibrating: in a trumpet or a tuba it is the air inside the tube. The roof helps carry the music out to the listeners.",
  curriculumLink:
    "Science, Year 4: sound. Sounds are made by vibrations that travel to the ear.",
  footprint: 8.4,
  setting: "inland",
  signSpot: { x: -2.3, z: 7.2 },
  build: (builder) => {
    buildPark(builder);
    buildBase(builder);
    buildColumns(builder);
    buildBrackets(builder);
    buildRailing(builder);
    buildRoof(builder);
    buildBand(builder);
  },
  blockers: [
    { x: 0, z: 0, radius: baseRadius + 0.2 },
    { x: 0, z: apothem(baseRadius) + 0.5, radius: 0.6 },
    ...flowerBeds.map((bed): LocalBlocker => ({
      x: bed.x,
      z: bed.z,
      radius: bed.radius + 0.1,
    })),
    ...deckchairs.map(([x, z]): LocalBlocker => ({ x, z, radius: 0.4 })),
    { x: -1.15, z: 5.4, radius: 0.2 },
    { x: 1.15, z: 5.4, radius: 0.2 },
  ],
  tune: [
    70, 74, 77, 82, 81, 77, 74, 77, 75, 79, 82, 84, 86, 84, 82, 77, 79, 81, 82,
  ],
};
