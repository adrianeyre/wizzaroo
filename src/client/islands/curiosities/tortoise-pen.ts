import { LatheGeometry, SphereGeometry, Vector2 } from "three";
import {
  addSignBoard,
  listRingPoints,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const adobe = "#c98a5a";
const adobeLight = "#dba57a";
const adobeDark = "#a86d44";
const shellOchre = "#c99a4a";
const shellBrown = "#6e4a26";
const tortoiseSkin = "#9a8a6a";
const tortoiseSkinDark = "#7a6c52";
const cactusGreen = "#6a9a4a";
const lettuceGreen = "#8cc152";
const terracotta = "#b8603a";
const signColour = "#7a4a22";

const wallRadius = 3.4;
const wallHeight = 0.55;
const gapHalf = 0.24;
const shelterAt: LocalPoint = { x: -1.1, z: -2.25 };
const sittingTortoise: Triple = [-1.6, 0, 1.15];
const headPivot: Triple = [sittingTortoise[0], 0.2, sittingTortoise[2] + 0.3];

/* The round adobe wall, open at the front */

const buildWall = (builder: AttractionBuilder) => {
  const inner = wallRadius - 0.16;
  const outer = wallRadius + 0.16;
  const profile = builder.isFar
    ? [
        [inner, 0],
        [inner, wallHeight],
        [outer, wallHeight],
        [outer, 0],
      ]
    : [
        [inner - 0.02, 0],
        [inner, wallHeight - 0.08],
        [inner + 0.05, wallHeight - 0.01],
        [wallRadius, wallHeight + 0.04],
        [outer - 0.05, wallHeight - 0.01],
        [outer, wallHeight - 0.08],
        [outer + 0.03, 0],
      ];
  builder.add(
    "matte",
    adobe,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.isFar ? 14 : 34,
      gapHalf,
      Math.PI * 2 - gapHalf * 2,
    ),
    {},
    0.9,
  );
  /* Round gate posts either side of the opening */
  [-1, 1].forEach((side) => {
    const x = Math.sin(side * gapHalf) * wallRadius;
    const z = Math.cos(side * gapHalf) * wallRadius;
    builder.cylinder("matte", adobeLight, {
      radius: 0.22,
      length: wallHeight + 0.25,
      at: [x, (wallHeight + 0.25) / 2, z],
      segments: builder.isFar ? 6 : 14,
    });
    if (builder.isFar) {
      return;
    }
    builder.sphere(
      "matte",
      adobeLight,
      0.22,
      [x, wallHeight + 0.25, z],
      [1, 0.6, 1],
      12,
    );
    builder.sphere(
      "paint",
      shellOchre,
      0.08,
      [x, wallHeight + 0.42, z],
      [1, 0.8, 1],
      8,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Mud bricks showing through the plaster, and buttresses */
  listRingPoints(wallRadius, 12).forEach(({ x, z }, index) => {
    const angle = (index / 12) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) < 0.5) {
      return;
    }
    const out = (wallRadius + 0.2) / wallRadius;
    builder.box(
      "matte",
      adobeDark,
      [0.32, wallHeight - 0.05, 0.14],
      [x * out, (wallHeight - 0.05) / 2, z * out],
      [0, angle, 0],
    );
    if (index % 3 === 1) {
      const brick = (wallRadius + 0.165) / wallRadius;
      [0.15, 0.3].forEach((height, row) => {
        builder.box(
          "matte",
          shade(adobeLight, 1.05),
          [0.2, 0.08, 0.02],
          [
            x * brick + Math.cos(angle) * (0.35 + row * 0.1),
            height,
            z * brick - Math.sin(angle) * (0.35 + row * 0.1),
          ],
          [0, angle, 0],
        );
      });
    }
  });
};

/* The shady hut at the back, where the tortoises sleep */

const buildShelter = (builder: AttractionBuilder) => {
  const { x, z } = shelterAt;
  builder.add(
    "matte",
    adobeLight,
    new SphereGeometry(
      0.85,
      builder.isFar ? 8 : 20,
      builder.isFar ? 3 : 8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    { at: [x, 0, z], scale: [1.2, 0.8, 1] },
  );
  if (builder.isFar) {
    return;
  }
  /* A low arched doorway facing the pen */
  builder.cylinder("matte", "#3a2414", {
    radius: 0.3,
    length: 0.06,
    at: [x + 0.25, 0.08, z + 0.8],
    axis: "z",
    segments: 14,
  });
  builder.box("matte", "#3a2414", [0.6, 0.1, 0.06], [x + 0.25, 0.04, z + 0.8]);
  builder.torus(
    "matte",
    adobeDark,
    0.33,
    0.05,
    [x + 0.25, 0.08, z + 0.79],
    "z",
    14,
  );
  /* A palm-leaf shade on poles beside it */
  const shadeAt: Triple = [x + 1.6, 0, z + 0.15];
  [
    [-0.55, -0.4],
    [0.55, -0.4],
    [-0.55, 0.4],
    [0.55, 0.4],
  ].forEach(([dx, dz]) => {
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.04,
      length: 0.95,
      at: [shadeAt[0] + dx, 0.475, shadeAt[2] + dz],
      segments: 6,
    });
  });
  for (let frond = 0; frond < 6; frond++) {
    builder.box(
      "matte",
      frond % 2 === 0 ? "#b89a50" : "#a88a44",
      [1.35, 0.03, 0.2],
      [shadeAt[0], 0.97 + (frond % 2) * 0.02, shadeAt[2] - 0.5 + frond * 0.2],
      [0, 0, (frond % 3) * 0.04 - 0.04],
    );
  }
};

/* Food and water */

const buildFood = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  /* A pile of lettuces in front of the sitting tortoise */
  [
    [-1.6, 1.95, 0.16],
    [-1.3, 1.85, 0.13],
  ].forEach(([x, z, size]) => {
    builder.sphere(
      "matte",
      shade(lettuceGreen, 1.1),
      size * 0.7,
      [x, size * 0.6, z],
      [1, 0.9, 1],
      8,
    );
    for (let leaf = 0; leaf < 5; leaf++) {
      const angle = (leaf / 5) * Math.PI * 2;
      builder.sphere(
        "matte",
        leaf % 2 === 0 ? lettuceGreen : shade(lettuceGreen, 0.85),
        size * 0.6,
        [
          x + Math.sin(angle) * size * 0.45,
          size * 0.45,
          z + Math.cos(angle) * size * 0.45,
        ],
        [1, 0.45, 0.7],
        6,
      );
    }
  });
  /* A shallow water dish and a food bowl of dandelions */
  builder.cylinder("matte", terracotta, {
    radius: 0.42,
    radiusEnd: 0.48,
    length: 0.1,
    at: [1.5, 0.05, 1.5],
    segments: 18,
  });
  builder.cylinder("water", palette.water, {
    radius: 0.4,
    length: 0.02,
    at: [1.5, 0.09, 1.5],
    segments: 18,
  });
  builder.cylinder("matte", terracotta, {
    radius: 0.3,
    radiusEnd: 0.36,
    length: 0.12,
    at: [2.0, 0.06, 0.6],
    segments: 14,
  });
  [0, 1.3, 2.6, 3.9, 5.2].forEach((angle, index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? "#f2c230" : lettuceGreen,
      0.07,
      [2.0 + Math.sin(angle) * 0.15, 0.13, 0.6 + Math.cos(angle) * 0.15],
      [1, 0.6, 1],
      6,
    );
  });
};

/* Prickly pear cactus by the wall, with its pink fruit */

const buildCactus = (builder: AttractionBuilder) => {
  [
    { x: 2.2, z: -1.8, size: 1 },
    { x: -2.6, z: -0.2, size: 0.8 },
  ].forEach(({ x, z, size }) => {
    const pads: [number, number, number, number][] = builder.isFar
      ? [[0, 0.35, 0, 0]]
      : [
          [0, 0.35, 0, 0],
          [0.2, 0.75, 0, 0.4],
          [-0.22, 0.72, 0.05, -0.45],
          [0.05, 1.1, 0, 0.1],
          [0.42, 1.0, 0, 0.8],
        ];
    pads.forEach(([dx, dy, dz, tilt], index) => {
      builder.add(
        "matte",
        index % 2 === 0 ? cactusGreen : shade(cactusGreen, 0.88),
        new SphereGeometry(
          0.3 * size,
          builder.isFar ? 6 : 8,
          builder.isFar ? 4 : 5,
        )
          .scale(0.85, 1, 0.22)
          .rotateZ(tilt),
        { at: [x + dx * size, dy * size, z + dz * size] },
      );
    });
    if (builder.isFar) {
      return;
    }
    [
      [0.05, 1.38],
      [0.55, 1.22],
      [-0.3, 0.98],
    ].forEach(([dx, dy]) => {
      builder.sphere(
        "paint",
        "#d6336c",
        0.055 * size,
        [x + dx * size, dy * size, z],
        [1, 1.3, 1],
        6,
      );
    });
  });
};

/* The tortoises */

const buildHead = (builder: AttractionBuilder, at: Triple, lift: number) => {
  const [x, y, z] = at;
  builder.bar(
    "matte",
    tortoiseSkin,
    [x, y - 0.06, z - 0.15],
    [x, y + lift, z + 0.03],
    0.11,
    8,
  );
  builder.sphere(
    "matte",
    tortoiseSkin,
    0.085,
    [x, y + lift + 0.02, z + 0.08],
    [0.95, 0.85, 1.25],
    10,
  );
  builder.sphere(
    "matte",
    shade(tortoiseSkin, 0.9),
    0.04,
    [x, y + lift - 0.01, z + 0.16],
    [1.2, 0.8, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#1d140c",
      0.017,
      [x + side * 0.055, y + lift + 0.05, z + 0.12],
      [1, 1, 1],
      6,
    );
  });
};

/** A giant desert tortoise facing +z with its shell, scutes, legs and (if `hasHead`) head. */
const buildTortoise = (
  builder: AttractionBuilder,
  at: Triple,
  hasHead: boolean,
) => {
  const [baseX, baseY, baseZ] = at;
  const size: Triple = [0.38, 0.3, 0.46];
  const shellBase = baseY + 0.15;
  builder.add(
    "paint",
    shellOchre,
    new SphereGeometry(
      1,
      builder.isFar ? 8 : 16,
      builder.isFar ? 3 : 7,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    { at: [baseX, shellBase, baseZ], scale: size },
  );
  if (builder.isFar) {
    return;
  }
  /* The rim of marginal scutes round the bottom edge */
  builder.add(
    "paint",
    shade(shellOchre, 0.82),
    new SphereGeometry(1, 16, 2, 0, Math.PI * 2, Math.PI / 2 - 0.2, 0.25),
    {
      at: [baseX, shellBase + 0.01, baseZ],
      scale: [size[0] + 0.03, size[1], size[2] + 0.03],
    },
  );
  /* Scutes: raised plates, a darker centre in each */
  const scutes: [number, number][] = [
    [0, 0],
    [0.55, 0],
    [0.55, Math.PI],
    [1.05, 0],
    [1.05, Math.PI],
    [0.85, 0.85],
    [0.85, -0.85],
    [0.85, Math.PI / 2],
    [0.85, -Math.PI / 2],
    [0.85, Math.PI - 0.85],
    [0.85, 0.85 - Math.PI],
  ];
  scutes.forEach(([polar, around]) => {
    const unit: Triple = [
      Math.sin(polar) * Math.sin(around),
      Math.cos(polar),
      Math.sin(polar) * Math.cos(around),
    ];
    const normal: Triple = [
      unit[0] / size[0],
      unit[1] / size[1],
      unit[2] / size[2],
    ];
    const length = Math.hypot(...normal);
    const out: Triple = [
      normal[0] / length,
      normal[1] / length,
      normal[2] / length,
    ];
    const spot: Triple = [
      baseX + unit[0] * size[0],
      shellBase + unit[1] * size[1],
      baseZ + unit[2] * size[2],
    ];
    const along = (distance: number): Triple => [
      spot[0] + out[0] * distance,
      spot[1] + out[1] * distance,
      spot[2] + out[2] * distance,
    ];
    builder.bar("paint", shellBrown, along(-0.01), along(0.025), 0.15, 6);
  });
  /* Four stout, scaly legs, and a stubby tail */
  [-1, 1].forEach((side) => {
    [0.26, -0.24].forEach((z) => {
      builder.cylinder("matte", tortoiseSkin, {
        radius: 0.085,
        radiusEnd: 0.07,
        length: 0.2,
        at: [baseX + side * 0.27, baseY + 0.1, baseZ + z],
        segments: 8,
      });
      builder.sphere(
        "matte",
        tortoiseSkinDark,
        0.09,
        [baseX + side * 0.27, baseY + 0.02, baseZ + z + 0.02],
        [1, 0.35, 1.1],
        6,
      );
    });
  });
  builder.cylinder("matte", tortoiseSkin, {
    radius: 0.04,
    radiusEnd: 0.01,
    length: 0.1,
    at: [baseX, shellBase - 0.02, baseZ - 0.5],
    axis: "z",
    segments: 6,
  });
  /* The flat plastron underneath */
  builder.cylinder("matte", shade(shellOchre, 1.15), {
    radius: 0.36,
    length: 0.05,
    at: [baseX, shellBase - 0.02, baseZ],
    segments: 14,
  });
  if (hasHead) {
    buildHead(builder, [baseX, baseY + 0.2, baseZ + 0.5], 0.02);
  }
};

/** The sitting tortoise's head: hidden in its shell, and stretching out when you come near. */
const buildRisingHead = (builder: AttractionBuilder) => {
  builder.bar("matte", tortoiseSkin, [0, -0.3, -0.06], [0, 0.0, 0.08], 0.11, 8);
  builder.sphere(
    "matte",
    tortoiseSkin,
    0.085,
    [0, 0.03, 0.13],
    [0.95, 0.85, 1.25],
    12,
  );
  builder.sphere(
    "matte",
    shade(tortoiseSkin, 0.9),
    0.04,
    [0, 0.0, 0.21],
    [1.2, 0.8, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#1d140c",
      0.017,
      [side * 0.055, 0.06, 0.17],
      [1, 1, 1],
      6,
    );
  });
  /* A leaf of lettuce in its beak */
  builder.sphere(
    "matte",
    lettuceGreen,
    0.06,
    [0.05, -0.01, 0.25],
    [1, 0.3, 0.8],
    7,
  );
};

const buildWanderingTortoise = (builder: AttractionBuilder) => {
  buildTortoise(builder, [0, 0, 0], true);
};

const wallBlockers: LocalBlocker[] = Array.from({ length: 34 }, (_, index) => {
  const angle =
    gapHalf + 0.12 + (index / 33) * (Math.PI * 2 - gapHalf * 2 - 0.24);
  return {
    x: Math.sin(angle) * wallRadius,
    z: Math.cos(angle) * wallRadius,
    radius: 0.36,
  };
});

export const tortoisePenModel: CuriosityModel = {
  kind: "tortoise-pen",
  islandId: "sunscorch-sands",
  name: "Tortoise Pen",
  fact: "A tortoise's shell is part of its skeleton: its backbone and ribs are joined to it. The shell supports its body and protects it, and when danger comes the tortoise pulls its head and legs inside. The plates on the shell are called scutes. Sulcata tortoises live at the edge of the Sahara Desert and can grow as big as a small table.",
  curriculumLink:
    "Science, Year 3: animals including humans. Identify that humans and some other animals have skeletons and muscles for support, protection and movement.",
  footprint: 4.6,
  setting: "inland",
  signSpot: { x: 1.7, z: 3.95 },
  padColour: sand,
  build: (builder) => {
    builder.cylinder("matte", shade(sand, 0.93), {
      radius: wallRadius - 0.1,
      length: 0.02,
      at: [0, 0.01, 0],
      segments: builder.isFar ? 12 : 32,
    });
    buildWall(builder);
    buildShelter(builder);
    buildFood(builder);
    buildCactus(builder);
    buildTortoise(builder, sittingTortoise, false);
    addSignBoard(builder, [1.7, 0, 3.95], signColour);
  },
  moving: [
    {
      name: "tortoise head",
      pivot: headPivot,
      build: buildRisingHead,
      motion: { kind: "rise", reach: 6, height: 0.2, period: 3 },
    },
  ],
  wanderers: [
    {
      name: "tortoises",
      build: buildWanderingTortoise,
      count: 3,
      centre: { x: 0.6, z: -0.1 },
      radius: 1.3,
      speed: 0.12,
    },
  ],
  blockers: [
    ...wallBlockers,
    ...[-1, 1].map((side) => ({
      x: Math.sin(side * gapHalf) * wallRadius,
      z: Math.cos(side * gapHalf) * wallRadius,
      radius: 0.26,
    })),
    { x: shelterAt.x, z: shelterAt.z, radius: 1.0 },
    { x: sittingTortoise[0], z: sittingTortoise[2], radius: 0.5 },
    { x: 2.2, z: -1.8, radius: 0.4 },
    { x: -2.6, z: -0.2, radius: 0.35 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Feed the tortoises",
    news: "Munch, munch! The tortoises plodded over and crunched up the lettuce, very, very slowly.",
  },
};
