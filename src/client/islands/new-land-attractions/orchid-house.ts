import { LatheGeometry, Vector2 } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  palette,
  type AttractionBuilder,
  type Deck,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const iron = "#f2f0e8";
const glassTint = "#a9d6cf";
const brick = "#a2513a";
const terracotta = "#c0603a";
const leafDeep = "#256b2a";
const leafMid = "#2f8a35";
const leafBright = "#4fa83c";
const tiles = ["#d8cbb0", "#7d4a32"];
const orchidColours = ["#e05ab8", "#f4f0ff", "#b04ad8", "#ffd23a", "#ff7aa8"];
const orchidLips = ["#ffd23a", "#c8307a", "#ffe9a8", "#c84a2a", "#f4f0ff"];
const signColour = "#7a3a8a";

/* The round glasshouse */

const house = { x: 0, z: -1.0, radius: 3.6, wall: 2.4 };
const doorHalfAngle = 0.3;
const ribs = 16;
const gallery = {
  inner: 2.6,
  outer: 3.45,
  height: 2.4,
  from: 2.15,
  to: Math.PI * 2 + 0.45,
};
const stair = { from: 0.55, to: gallery.from };

const aroundHouse = (angle: number, radius: number, y: number): Triple => [
  house.x + Math.sin(angle) * radius,
  y,
  house.z + Math.cos(angle) * radius,
];

const isDoorway = (angle: number): boolean =>
  Math.abs(Math.sin(angle / 2)) < Math.sin(doorHalfAngle / 2);

const addRing = (
  builder: AttractionBuilder,
  finish: "matte" | "paint" | "glass",
  colour: string,
  profile: readonly [number, number][],
  from: number,
  sweep: number,
  segments: number,
) => {
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      segments,
      from,
      sweep,
    ),
    { at: [house.x, 0, house.z] },
  );
};

const domeProfile: [number, number][] = [
  [house.radius + 0.02, house.wall],
  [3.5, 3.2],
  [3.2, 3.9],
  [2.7, 4.5],
  [2.0, 4.95],
  [1.15, 5.25],
  [0.55, 5.32],
];

const buildGlasshouse = (builder: AttractionBuilder) => {
  const { radius, wall } = house;
  /* A brick plinth, open at the door */
  addRing(
    builder,
    "matte",
    brick,
    [
      [radius - 0.12, 0],
      [radius - 0.12, 0.4],
      [radius + 0.12, 0.4],
      [radius + 0.12, 0],
    ],
    doorHalfAngle,
    Math.PI * 2 - doorHalfAngle * 2,
    builder.segments(32, 16),
  );
  /* Glass panes between white iron ribs */
  const chord = 2 * radius * Math.sin(Math.PI / ribs);
  for (let rib = 0; rib < ribs; rib++) {
    const angle = (rib / ribs) * Math.PI * 2;
    const pane = angle + Math.PI / ribs;
    if (!isDoorway(pane)) {
      builder.box(
        "glass",
        glassTint,
        [chord, wall - 0.4, 0.03],
        aroundHouse(
          pane,
          radius * Math.cos(Math.PI / ribs),
          0.4 + (wall - 0.4) / 2,
        ),
        [0, pane, 0],
      );
      if (!builder.isFar) {
        builder.box(
          "paint",
          iron,
          [chord, 0.05, 0.05],
          aroundHouse(pane, radius * Math.cos(Math.PI / ribs) + 0.02, 1.5),
          [0, pane, 0],
        );
      }
    }
    if (!isDoorway(angle) || Math.abs(Math.sin(angle / 2)) > 0.1) {
      builder.box(
        "paint",
        iron,
        [0.09, wall, 0.09],
        aroundHouse(angle, radius, wall / 2),
        [0, angle, 0],
      );
    }
  }
  /* The dome, its ribs and the eaves */
  addRing(
    builder,
    "glass",
    glassTint,
    domeProfile,
    0,
    Math.PI * 2,
    builder.segments(32, 14),
  );
  builder.torus(
    "paint",
    iron,
    radius + 0.04,
    0.07,
    [house.x, wall, house.z],
    "y",
    builder.isFar ? 16 : 40,
  );
  const domeRibs = builder.isFar ? 0 : 12;
  const ribPoints = domeProfile.filter(
    (_, point) => point % 2 === 0 || point === domeProfile.length - 1,
  );
  for (let rib = 0; rib < domeRibs; rib++) {
    const angle = (rib / domeRibs) * Math.PI * 2;
    for (let point = 1; point < ribPoints.length; point++) {
      const [fromRadius, fromY] = ribPoints[point - 1];
      const [toRadius, toY] = ribPoints[point];
      builder.bar(
        "paint",
        iron,
        aroundHouse(angle, fromRadius + 0.03, fromY),
        aroundHouse(angle, toRadius + 0.03, toY),
        0.07,
        4,
      );
    }
  }
  /* The cupola on top, with a weathervane */
  builder.cylinder("glass", glassTint, {
    radius: 0.55,
    length: 0.6,
    at: [house.x, 5.6, house.z],
    segments: builder.segments(12, 8),
  });
  builder.cylinder("paint", iron, {
    radius: 0.7,
    radiusEnd: 0.05,
    length: 0.5,
    at: [house.x, 6.15, house.z],
    segments: builder.segments(12, 8),
  });
  builder.cylinder("paint", iron, {
    radius: 0.62,
    length: 0.06,
    at: [house.x, 5.32, house.z],
    segments: builder.segments(12, 8),
  });
  builder.cylinder("metal", palette.brass, {
    radius: 0.03,
    length: 0.5,
    at: [house.x, 6.55, house.z],
    segments: 6,
  });
  /* The doorway: a frame and an arched fanlight */
  const [doorX, , doorZ] = aroundHouse(0, radius, 0);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      iron,
      [0.16, 2.25, 0.16],
      [doorX + side * 1.04, 1.12, doorZ],
    );
    if (!builder.isFar) {
      builder.box(
        "paint",
        "#2f6b4a",
        [0.5, 2.0, 0.04],
        [doorX + side * 1.2, 1.0, doorZ + 0.3],
        [0, side * 1.1, 0],
      );
    }
  });
  builder.box("paint", iron, [2.3, 0.16, 0.18], [doorX, 2.3, doorZ]);
  builder.cylinder("glass", glassTint, {
    radius: 0.9,
    length: 0.04,
    at: [doorX, 2.38, doorZ + 0.02],
    axis: "z",
    segments: builder.segments(16, 8),
  });
  if (!builder.isFar) {
    builder.box(
      "paint",
      signColour,
      [1.4, 0.26, 0.05],
      [doorX, 2.62, doorZ + 0.1],
    );
    builder.box(
      "paint",
      palette.cream,
      [1.0, 0.06, 0.02],
      [doorX, 2.62, doorZ + 0.13],
    );
  }
};

/* The floor inside: tiles, a pool and a rocky waterfall */

const buildFloor = (builder: AttractionBuilder) => {
  builder.cylinder("matte", tiles[0], {
    radius: house.radius - 0.1,
    length: 0.04,
    at: [house.x, 0.02, house.z],
    segments: builder.segments(28, 12),
  });
  if (!builder.isFar) {
    builder.box(
      "matte",
      tiles[1],
      [1.2, 0.02, 1.6],
      [house.x, 0.03, house.z + 3.0],
    );
  }
  builder.cylinder("water", palette.water, {
    radius: 0.95,
    length: 0.04,
    at: [house.x, 0.06, house.z],
    segments: builder.segments(20, 10),
  });
  builder.torus(
    "matte",
    palette.stone,
    1.0,
    0.1,
    [house.x, 0.08, house.z],
    "y",
    builder.isFar ? 10 : 24,
  );
  /* The rocks, with ferns and a trickle of water */
  const rocks: [number, number, number, number][] = [
    [0, -0.25, 0.5, 0.48],
    [0.25, -0.1, 0.25, 0.32],
    [-0.28, 0.0, 0.22, 0.3],
    [0.05, -0.3, 0.85, 0.3],
  ];
  rocks.forEach(([dx, dz, y, radius], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#7d776c" : "#948d80",
      radius,
      [house.x + dx, y, house.z + dz],
      [1.1, 0.8, 1],
      builder.isFar ? 6 : 9,
    );
  });
  if (!builder.isFar) {
    builder.box(
      "water",
      "#9fd8ea",
      [0.18, 0.75, 0.04],
      [house.x + 0.05, 0.5, house.z + 0.12],
      [0.15, 0, 0],
    );
    [
      [-0.3, 0.75, -0.3],
      [0.35, 0.55, -0.1],
    ].forEach(([dx, y, dz]) => {
      for (let frond = 0; frond < 4; frond++) {
        const angle = (frond / 4) * Math.PI * 2;
        builder.box(
          "matte",
          frond % 2 === 0 ? leafMid : leafBright,
          [0.08, 0.02, 0.4],
          [
            house.x + dx + Math.sin(angle) * 0.15,
            y,
            house.z + dz + Math.cos(angle) * 0.15,
          ],
          [-0.5, angle, 0],
        );
      }
    });
  }
};

/* The gallery round the inside of the dome, and the stairs up to it */

const stairHeightAt = (angle: number): number =>
  gallery.height *
  Math.min(1, Math.max(0, (angle - stair.from) / (stair.to - stair.from)));

const buildGallery = (builder: AttractionBuilder) => {
  const sweep = gallery.to - gallery.from;
  addRing(
    builder,
    "matte",
    "#6b5a4a",
    [
      [gallery.inner, gallery.height - 0.1],
      [gallery.outer + 0.1, gallery.height - 0.1],
      [gallery.outer + 0.1, gallery.height],
      [gallery.inner, gallery.height],
      [gallery.inner, gallery.height - 0.1],
    ],
    gallery.from,
    sweep,
    builder.segments(32, 12),
  );
  /* Iron columns holding it up */
  [2.6, 3.6, 4.6, 5.6].forEach((angle) => {
    builder.cylinder("paint", iron, {
      radius: 0.07,
      length: gallery.height,
      at: aroundHouse(angle, gallery.inner + 0.08, gallery.height / 2),
      segments: 8,
    });
    if (!builder.isFar) {
      builder.cylinder("paint", iron, {
        radius: 0.14,
        radiusEnd: 0.07,
        length: 0.2,
        at: aroundHouse(angle, gallery.inner + 0.08, gallery.height - 0.2),
        segments: 8,
      });
    }
  });
  /* The railing along its inner edge */
  const posts = builder.isFar ? 8 : 22;
  for (let post = 0; post <= posts; post++) {
    const angle = gallery.from + (post / posts) * sweep;
    builder.box(
      "paint",
      iron,
      [0.05, 0.9, 0.05],
      aroundHouse(angle, gallery.inner + 0.05, gallery.height + 0.45),
      [0, angle, 0],
    );
    if (post < posts) {
      const next = gallery.from + ((post + 1) / posts) * sweep;
      builder.bar(
        "paint",
        iron,
        aroundHouse(angle, gallery.inner + 0.05, gallery.height + 0.9),
        aroundHouse(next, gallery.inner + 0.05, gallery.height + 0.9),
        0.05,
        4,
      );
    }
  }
  /* A rail across its end, above the foot of the stairs */
  builder.bar(
    "paint",
    iron,
    aroundHouse(gallery.to, gallery.inner, gallery.height + 0.9),
    aroundHouse(gallery.to, gallery.outer, gallery.height + 0.9),
    0.06,
    4,
  );
  builder.bar(
    "paint",
    iron,
    aroundHouse(gallery.to, gallery.inner, gallery.height + 0.45),
    aroundHouse(gallery.to, gallery.outer, gallery.height + 0.45),
    0.05,
    4,
  );
  /* The stairs, curving up round the wall */
  const treads = builder.isFar ? 6 : 14;
  const middle = (gallery.inner + gallery.outer) / 2;
  for (let tread = 0; tread < treads; tread++) {
    const angle =
      stair.from + ((tread + 0.5) / treads) * (stair.to - stair.from);
    const top = stairHeightAt(angle);
    builder.box(
      "matte",
      tread % 2 === 0 ? "#8a6a4a" : "#7a5c40",
      [
        gallery.outer - gallery.inner,
        0.08,
        ((stair.to - stair.from) * middle) / treads + 0.02,
      ],
      aroundHouse(angle, middle, top - 0.04),
      [0, angle + Math.PI / 2, 0],
    );
    builder.box(
      "paint",
      iron,
      [0.05, top + 0.9, 0.05],
      aroundHouse(angle, gallery.inner + 0.05, (top + 0.9) / 2),
    );
  }
  const rails = builder.isFar ? 3 : 8;
  for (let rail = 0; rail < rails; rail++) {
    const from = stair.from + (rail / rails) * (stair.to - stair.from);
    const to = stair.from + ((rail + 1) / rails) * (stair.to - stair.from);
    builder.bar(
      "paint",
      iron,
      aroundHouse(from, gallery.inner + 0.05, stairHeightAt(from) + 0.9),
      aroundHouse(to, gallery.inner + 0.05, stairHeightAt(to) + 0.9),
      0.05,
      4,
    );
  }
};

/* Orchids in pots on the staging, and in hanging baskets */

const addOrchid = (
  builder: AttractionBuilder,
  at: Triple,
  colour: number,
  turn: number,
) => {
  const [x, y, z] = at;
  builder.lathe(
    "matte",
    terracotta,
    [
      [0, 0],
      [0.08, 0],
      [0.11, 0.16],
      [0, 0.16],
    ],
    [x, y, z],
    "y",
    6,
  );
  if (builder.isFar) {
    builder.sphere(
      "paint",
      orchidColours[colour % orchidColours.length],
      0.14,
      [x, y + 0.45, z],
      [1, 0.8, 1],
      6,
    );
    return;
  }
  builder.sphere(
    "matte",
    colour % 2 === 0 ? leafMid : leafDeep,
    0.24,
    [x, y + 0.2, z],
    [1, 0.15, 0.45],
    6,
  );
  const tip: Triple = [
    x + Math.sin(turn) * 0.16,
    y + 0.62,
    z + Math.cos(turn) * 0.16,
  ];
  builder.bar("matte", "#5a7a3a", [x, y + 0.16, z], [x, y + 0.5, z], 0.02, 4);
  builder.bar("matte", "#5a7a3a", [x, y + 0.5, z], tip, 0.02, 4);
  [0.55, 1].forEach((share, flower) => {
    const flowerAt: Triple = [
      x + (tip[0] - x) * share,
      y + 0.5 + (tip[1] - y - 0.5) * share - flower * 0.05,
      z + (tip[2] - z) * share,
    ];
    builder.sphere(
      "paint",
      orchidColours[colour % orchidColours.length],
      0.075,
      flowerAt,
      [1.3, 1.1, 0.35],
      6,
    );
    builder.sphere(
      "paint",
      orchidLips[colour % orchidLips.length],
      0.03,
      [flowerAt[0], flowerAt[1] - 0.02, flowerAt[2] + 0.02],
      [1, 1, 1],
      4,
    );
  });
};

const stagingAngles = [2.95, 3.35, 4.05, 4.4, 5.05, 5.35];

const buildStaging = (builder: AttractionBuilder) => {
  const radius = 3.12;
  stagingAngles.forEach((angle, bench) => {
    const at = aroundHouse(angle, radius, 0);
    builder.box(
      "matte",
      "#8a6a4a",
      [0.95, 0.06, 0.5],
      [at[0], 0.72, at[2]],
      [0, angle, 0],
    );
    (builder.isFar ? [] : [-0.4, 0.4]).forEach((side) => {
      builder.box(
        "paint",
        iron,
        [0.05, 0.72, 0.45],
        [at[0] + Math.cos(angle) * side, 0.36, at[2] - Math.sin(angle) * side],
        [0, angle, 0],
      );
    });
    const pots = builder.isFar ? 0 : 2;
    for (let pot = 0; pot < pots; pot++) {
      const side = pot === 0 ? -0.24 : 0.24;
      addOrchid(
        builder,
        [at[0] + Math.cos(angle) * side, 0.75, at[2] - Math.sin(angle) * side],
        bench * 2 + pot,
        angle + Math.PI,
      );
    }
  });
  if (!builder.isFar) {
    /* Orchids clinging to a mossy log, as they grow wild on trees */
    const log: Triple = [house.x - 1.65, 0.25, house.z + 1.1];
    builder.cylinder("matte", "#6a4a32", {
      radius: 0.22,
      radiusEnd: 0.17,
      length: 1.3,
      at: log,
      axis: "x",
      segments: 9,
    });
    builder.sphere(
      "matte",
      "#5a8a3a",
      0.2,
      [log[0] + 0.2, 0.42, log[2]],
      [2, 0.4, 1],
      7,
    );
    [-0.35, 0.3].forEach((dx, index) => {
      addOrchid(builder, [log[0] + dx, 0.35, log[2]], 7 + index, 0.4);
    });
    /* Hanging baskets under the gallery, with dangling roots */
    [3.0, 4.2, 5.0].forEach((angle, basket) => {
      const at = aroundHouse(angle, gallery.inner - 0.3, gallery.height - 0.55);
      builder.bar(
        "metal",
        palette.darkSteel,
        [at[0], gallery.height - 0.1, at[2]],
        [at[0], at[1] + 0.12, at[2]],
        0.015,
        3,
      );
      builder.sphere("matte", "#7a5a32", 0.17, at, [1, 0.6, 1], 8);
      for (let root = 0; root < 4; root++) {
        const turn = root * 1.6;
        builder.bar(
          "matte",
          "#c9d6b0",
          [
            at[0] + Math.sin(turn) * 0.1,
            at[1] - 0.05,
            at[2] + Math.cos(turn) * 0.1,
          ],
          [
            at[0] + Math.sin(turn) * 0.14,
            at[1] - 0.45,
            at[2] + Math.cos(turn) * 0.14,
          ],
          0.015,
          3,
        );
      }
      builder.sphere(
        "paint",
        orchidColours[(basket + 2) % orchidColours.length],
        0.09,
        [at[0], at[1] + 0.16, at[2]],
        [1.3, 1, 0.5],
        6,
      );
    });
  }
};

/* Outside: a path, palms, a bench and lamps */

const addPalm = (builder: AttractionBuilder, at: Triple, height: number) => {
  const [x, , z] = at;
  builder.bar(
    "matte",
    "#8a7050",
    [x, 0, z],
    [x + 0.25, height, z - 0.1],
    0.22,
    7,
  );
  const fronds = builder.isFar ? 4 : 7;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    builder.box(
      "matte",
      frond % 2 === 0 ? leafMid : leafBright,
      [0.36, 0.03, 1.5],
      [
        x + 0.25 + Math.sin(angle) * 0.62,
        height - 0.2,
        z - 0.1 + Math.cos(angle) * 0.62,
      ],
      [0.4, angle, 0],
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  const path: [number, number][] = [
    [0, 2.7],
    [0.4, 4.8],
    [1.4, 6.4],
    [2.0, 8.0],
  ];
  for (let index = 1; index < path.length; index++) {
    const [fromX, fromZ] = path[index - 1];
    const [toX, toZ] = path[index];
    builder.box(
      "matte",
      palette.path,
      [1.4, 0.03, Math.hypot(toX - fromX, toZ - fromZ) + 0.5],
      [(fromX + toX) / 2, 0.015, (fromZ + toZ) / 2],
      [0, Math.atan2(toX - fromX, toZ - fromZ), 0],
    );
  }
  addPalm(builder, [-2.6, 0, 3.6], 3.6);
  addPalm(builder, [5.4, 0, -3.0], 4.0);
  addPalm(builder, [-5.6, 0, -2.2], 3.8);
  addLampPost(builder, [-1.2, 0, 4.4]);
  addLampPost(builder, [1.9, 0, 4.8]);
  addBench(builder, [4.2, 0, 3.4], -0.9, palette.paleTimber);
  /* Flower beds round the glasshouse */
  const beds: [number, number, number][] = [
    [-4.8, 1.6, 0.8],
    [4.6, 0.6, 0.8],
    [-3.6, -5.2, 0.8],
    [3.4, -5.4, 0.8],
  ];
  beds.forEach(([x, z, radius], bed) => {
    builder.cylinder("matte", "#5a3f2a", {
      radius,
      length: 0.12,
      at: [x, 0.06, z],
      segments: builder.segments(12, 6),
    });
    builder.sphere(
      "matte",
      bed % 2 === 0 ? leafMid : leafDeep,
      radius * 0.8,
      [x, 0.2, z],
      [1, 0.45, 1],
      builder.isFar ? 6 : 9,
    );
    if (!builder.isFar) {
      for (let flower = 0; flower < 3; flower++) {
        const angle = flower * 1.6 + bed;
        builder.sphere(
          "paint",
          orchidColours[(flower + bed) % orchidColours.length],
          0.1,
          [
            x + Math.sin(angle) * radius * 0.5,
            0.46,
            z + Math.cos(angle) * radius * 0.5,
          ],
          [1, 0.7, 1],
          6,
        );
      }
    }
  });
};

/* The moving parts */

const bloomsPivot: Triple = [house.x, 0.9, house.z];

const buildBlooms = (builder: AttractionBuilder) => {
  stagingAngles.forEach((angle, bench) => {
    const [x, , z] = aroundHouse(angle, 3.0, 0);
    builder.sphere(
      "paint",
      orchidColours[(bench + 1) % orchidColours.length],
      0.16,
      [x - bloomsPivot[0], 0.45, z - bloomsPivot[2]],
      [1.4, 1.1, 0.4],
      builder.isFar ? 5 : 7,
    );
    if (!builder.isFar) {
      builder.sphere(
        "paint",
        orchidLips[(bench + 1) % orchidLips.length],
        0.06,
        [x - bloomsPivot[0], 0.42, z - bloomsPivot[2]],
        [1, 1, 1],
        5,
      );
    }
  });
};

const buildVane = (builder: AttractionBuilder) => {
  builder.box("metal", palette.brass, [0.04, 0.04, 0.9], [0, 0, 0]);
  builder.cylinder("metal", palette.brass, {
    radius: 0.09,
    radiusEnd: 0,
    length: 0.2,
    at: [0, 0, 0.5],
    axis: "z",
    segments: 6,
  });
  /* An orchid flower for the tail */
  [-1, 0, 1].forEach((petal) => {
    builder.sphere(
      "paint",
      orchidColours[0],
      0.12,
      [petal * 0.09, Math.abs(petal) * -0.03 + 0.04, -0.45],
      [0.6, 1, 0.15],
      builder.isFar ? 4 : 6,
    );
  });
};

const buildMistJets = (builder: AttractionBuilder) => {
  [0, 1, 2, 3].forEach((jet) => {
    const angle = (jet / 4) * Math.PI * 2 + 0.4;
    builder.cylinder("water", "#e6f6fb", {
      radius: 0.02,
      radiusEnd: 0.12,
      length: 0.9,
      at: [Math.sin(angle) * 0.7, 0.45, Math.cos(angle) * 0.7],
      segments: builder.segments(8, 4),
    });
  });
};

const buildButterfly = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    builder.box("paint", "#3a8ae0", [0.28, 0.01, 0.14], [0, 0.02, 0]);
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#3a8ae0",
      0.08,
      [side * 0.07, 0.02, 0.02],
      [1, 0.15, 0.8],
      6,
    );
  });
  builder.cylinder("matte", palette.black, {
    radius: 0.012,
    length: 0.14,
    at: [0, 0.02, 0],
    axis: "z",
    segments: 4,
  });
};

const buildVisitor = (builder: AttractionBuilder) => {
  [-0.07, 0.07].forEach((side) => {
    builder.box("matte", "#4a4e6a", [0.09, 0.42, 0.1], [side, 0.21, 0]);
  });
  builder.cylinder("matte", "#e8a0c0", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.62, 0],
    segments: 10,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#e8a0c0",
      [side * 0.17, 0.78, 0],
      [side * 0.22, 0.5, 0.05],
      0.07,
      5,
    );
  });
  builder.sphere("matte", "#c98d63", 0.13, [0, 0.95, 0], [1, 1.05, 1], 10);
  if (!builder.isFar) {
    builder.cylinder("matte", "#f2e2b0", {
      radius: 0.22,
      length: 0.03,
      at: [0, 1.05, 0],
      segments: 12,
    });
    builder.cylinder("matte", "#f2e2b0", {
      radius: 0.12,
      length: 0.1,
      at: [0, 1.1, 0],
      segments: 10,
    });
  }
};

/* Where the Character can go */

const toPolar = (x: number, z: number) => {
  const dx = x - house.x;
  const dz = z - house.z;
  const angle = Math.atan2(dx, dz);
  return {
    radius: Math.hypot(dx, dz),
    angle: angle < 0 ? angle + Math.PI * 2 : angle,
  };
};

const galleryDeck: Deck = ({ x, z }) => {
  const { radius, angle } = toPolar(x, z);
  if (radius < gallery.inner + 0.1 || radius > gallery.outer - 0.1) {
    return undefined;
  }
  if (angle >= stair.from && angle <= stair.to) {
    return { height: stairHeightAt(angle), kind: "bridge" };
  }
  const wrapped = angle < gallery.from ? angle + Math.PI * 2 : angle;
  return wrapped >= gallery.from && wrapped <= gallery.to - 0.04
    ? { height: gallery.height, kind: "bridge" }
    : undefined;
};

export const orchidHouseModel: NewLandAttractionModel = {
  kind: "orchid-house",
  islandId: "jungle-reach",
  name: "Orchid House",
  fact: "Orchids are one of the biggest families of flowering plants, with more than 25,000 different kinds. Many rainforest orchids grow high up on tree branches instead of in soil, and their dangling roots soak up water from the rain and mist. Each part of a plant has its own job: roots take in water, the stem holds the plant up, leaves make food and flowers make seeds.",
  curriculumLink:
    "Science, Year 3: plants. Identify and describe the functions of different parts of flowering plants: roots, stem, leaves and flowers, and explore what plants need to grow (orchids catch water from the air with their roots).",
  footprint: 9,
  setting: "inland",
  signSpot: { x: 2.6, z: 7.9 },
  build: (builder) => {
    buildGrounds(builder);
    buildFloor(builder);
    buildGlasshouse(builder);
    buildGallery(builder);
    buildStaging(builder);
    addSignBoard(builder, [2.6, 0, 7.2], signColour, -0.3);
  },
  moving: [
    {
      name: "orchid blooms",
      pivot: bloomsPivot,
      build: buildBlooms,
      motion: { kind: "wake", reach: 6 },
    },
    {
      name: "mist jets",
      pivot: [house.x, 0.06, house.z],
      build: buildMistJets,
      motion: { kind: "splash", reach: 5, period: 2 },
    },
    {
      name: "weathervane",
      pivot: [house.x, 6.75, house.z],
      build: buildVane,
      motion: { kind: "whirl", axis: "y", idle: 0.3, speed: 4, reach: 7 },
    },
    {
      name: "blue morpho butterflies",
      pivot: [house.x, 1.7, house.z],
      build: buildButterfly,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: 1.7,
        count: 4,
        speed: 0.5,
        isFacingAlong: true,
        bob: 0.3,
      },
    },
  ],
  wanderers: [
    {
      name: "visitors",
      build: buildVisitor,
      count: 2,
      centre: { x: -1.6, z: 5.6 },
      radius: 1.4,
      speed: 0.4,
    },
  ],
  smoke: [
    {
      at: [house.x, 0.9, house.z],
      colour: "#f4fbff",
      puffs: 6,
      size: 0.55,
      rise: 2.2,
      spread: 1.4,
    },
  ],
  decks: [galleryDeck],
  play: {
    label: "Turn on the mist",
    news: "Pssssh! Warm mist filled the Orchid House, and the orchids' dangling roots drank the water straight from the air.",
  },
};
