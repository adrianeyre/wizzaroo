import { CylinderGeometry } from "three";
import {
  addBench,
  addDoor,
  addSignBoard,
  buildFlatDeck,
  shade,
  type AttractionBuilder,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  buildBursts,
  buildCart,
  buildCatherineWheel,
  buildCrownFlame,
  buildHut,
  buildLaunchField,
  buildSpectator,
  buildStickRocket,
  fireworkColours as colours,
  hut,
  launchField,
} from "./firework-tower-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

/* ------------------------------------------------------------------ */
/* The tower and its spiral stair                                      */
/* ------------------------------------------------------------------ */

const tower = { x: 0, z: -3.2, radius: 1.25, top: 1.1, height: 7 };
const gallery = { y: 7, radius: 2.2, walk: 1.85 };
const stair = {
  inner: 1.3,
  outer: 2.05,
  walk: 1.65,
  steps: 27,
  firstAngle: -0.4,
  turns: 1.25,
};
const stairSweep = stair.turns * Math.PI * 2;
const stairLastAngle = stair.firstAngle + stairSweep;
/** The gallery floor is open over the last few steps, for a stairwell. */
const stairwell = { from: stairLastAngle - 0.9, to: stairLastAngle + 0.2 };
const crown = { radius: 0.9, top: 8.4 };
const signAt = { x: -1.5, z: 7.3 };
const wheelPosts = [-1.9, 1.9].map((x) => ({ x, z: 0.7 }));
const wheelHeight = 1.8;
const stand = { minX: 2.4, maxX: 6.2, minZ: 2.3, maxZ: 5.0 };
const standHeight = 0.28;

const round = (angle: number, radius: number, y: number): Triple => [
  tower.x + Math.sin(angle) * radius,
  y,
  tower.z + Math.cos(angle) * radius,
];

const towerRadiusAt = (y: number) =>
  tower.radius + ((tower.top - tower.radius) * y) / tower.height;

const buildTower = (builder: AttractionBuilder) => {
  const { x, z, height } = tower;
  /* A low octagonal plinth and paving ring round the foot */
  builder.cylinder("matte", colours.ashPaving, {
    radius: 2.9,
    length: 0.03,
    at: [x, 0.015, z],
    segments: builder.segments(32, 16),
  });
  builder.cylinder("matte", colours.basaltLight, {
    radius: 1.55,
    radiusEnd: 1.45,
    length: 0.26,
    at: [x, 0.13, z],
    segments: 8,
  });
  /* The basalt drum, gently tapering */
  builder.cylinder("matte", colours.basalt, {
    radius: tower.radius,
    radiusEnd: tower.top,
    length: height,
    at: [x, height / 2, z],
    segments: 8,
  });
  /* Stone courses and bronze bands */
  const courses = builder.isFar ? [] : [0.9, 1.8, 3.2, 4.1, 5.0, 6.4];
  courses.forEach((up) => {
    builder.cylinder("matte", colours.basaltEdge, {
      radius: towerRadiusAt(up) + 0.015,
      length: 0.05,
      at: [x, up, z],
      segments: 8,
      isOpen: true,
    });
  });
  [2.5, 5.7].forEach((up) => {
    builder.cylinder("metal", colours.bronze, {
      radius: towerRadiusAt(up) + 0.03,
      length: 0.18,
      at: [x, up, z],
      segments: 8,
      isOpen: !builder.isFar,
    });
  });
  /* Glowing slit windows on the drum's flat faces */
  const windows: [number, number][] = [
    [1, 1.5],
    [3, 2.0],
    [5, 1.6],
    [7, 2.2],
    [0, 3.6],
    [2, 4.4],
    [4, 3.8],
    [6, 4.6],
    [1, 6.2],
    [3, 6.5],
    [5, 6.3],
    [7, 6.1],
  ];
  windows.forEach(([face, up]) => {
    const angle = Math.PI / 8 + (face * Math.PI) / 4;
    const out = towerRadiusAt(up) * Math.cos(Math.PI / 8) + 0.005;
    builder.box(
      "glow",
      colours.lava,
      [0.16, 0.5, 0.04],
      round(angle, out, up),
      [0, angle, 0],
    );
    if (!builder.isFar) {
      builder.box(
        "metal",
        colours.bronzeDark,
        [0.3, 0.06, 0.08],
        round(angle, out + 0.02, up + 0.29),
        [0, angle, 0],
      );
    }
  });
  /* A bronze door on the front-left face */
  const doorAngle = -(3 * Math.PI) / 8;
  addDoor(builder, {
    at: round(doorAngle, tower.radius * Math.cos(Math.PI / 8) + 0.01, 0.26),
    width: 0.6,
    height: 1.2,
    colour: colours.bronzeDark,
    frame: colours.bronze,
    turn: doorAngle,
  });
};

const buildStair = (builder: AttractionBuilder) => {
  const step = stairSweep / (stair.steps - 1);
  const depth = stair.outer - stair.inner;
  const middle = (stair.outer + stair.inner) / 2;
  const stride = builder.isFar ? 2 : 1;
  for (let index = 0; index < stair.steps; index += stride) {
    const angle = stair.firstAngle + index * step;
    const y = 0.25 + (index * (gallery.y - 0.25)) / (stair.steps - 1);
    builder.box(
      "matte",
      index % 2 === 0 ? colours.basaltLight : shade(colours.basaltLight, 0.9),
      [middle * step * stride + 0.08, builder.isFar ? 0.3 : 0.14, depth],
      round(angle, middle, y - 0.07),
      [0, angle, 0],
    );
    if (builder.isFar) {
      continue;
    }
    if (index % 2 === 1) {
      continue;
    }
    /* The bronze nosing on every other tread */
    builder.box(
      "metal",
      colours.bronzeDark,
      [0.04, 0.04, depth],
      round(angle - step / 2, middle, y - 0.01),
      [0, angle, 0],
    );
    /* Balusters on the outer edge */
    if (index % 4 !== 0) {
      continue;
    }
    builder.bar(
      "metal",
      colours.bronze,
      round(angle, stair.outer - 0.05, y),
      round(angle, stair.outer - 0.05, y + 0.85),
      0.035,
      5,
    );
  }
  /* The handrail, following the stair round */
  const railPieces = builder.isFar ? 8 : 18;
  for (let piece = 0; piece < railPieces; piece++) {
    const from = piece / railPieces;
    const to = (piece + 1) / railPieces;
    builder.bar(
      "metal",
      colours.bronze,
      round(
        stair.firstAngle + from * stairSweep,
        stair.outer - 0.05,
        1.1 + from * (gallery.y - 0.25),
      ),
      round(
        stair.firstAngle + to * stairSweep,
        stair.outer - 0.05,
        1.1 + to * (gallery.y - 0.25),
      ),
      0.06,
      5,
    );
  }
  /* Bronze brackets holding the treads to the drum, every few steps */
  if (!builder.isFar) {
    for (let index = 2; index < stair.steps; index += 3) {
      const angle = stair.firstAngle + index * step;
      const y = 0.25 + (index * (gallery.y - 0.25)) / (stair.steps - 1);
      builder.bar(
        "metal",
        colours.bronzeDark,
        round(angle, towerRadiusAt(y - 0.6), y - 0.65),
        round(angle, stair.outer - 0.15, y - 0.15),
        0.06,
        5,
      );
    }
  }
};

const buildGallery = (builder: AttractionBuilder) => {
  const { x, z } = tower;
  const sweep = Math.PI * 2 - (stairwell.to - stairwell.from);
  builder.add(
    "metal",
    colours.bronzeDark,
    new CylinderGeometry(
      gallery.radius,
      gallery.radius - 0.08,
      0.16,
      builder.segments(28, 14),
      1,
      false,
      stairwell.to,
      sweep,
    ),
    { at: [x, gallery.y - 0.08, z] },
  );
  builder.add(
    "matte",
    colours.basaltLight,
    new CylinderGeometry(
      gallery.radius - 0.1,
      gallery.radius - 0.1,
      0.02,
      builder.segments(28, 14),
      1,
      false,
      stairwell.to,
      sweep,
    ),
    { at: [x, gallery.y + 0.01, z] },
  );
  /* Corbels under the floor */
  const corbels = builder.isFar ? 0 : 10;
  for (let corbel = 0; corbel < corbels; corbel++) {
    const angle = stairwell.to + ((corbel + 0.5) / 10) * sweep;
    builder.bar(
      "matte",
      colours.basaltEdge,
      round(angle, towerRadiusAt(gallery.y - 0.9), gallery.y - 0.9),
      round(angle, gallery.radius - 0.2, gallery.y - 0.12),
      0.16,
      4,
    );
  }
  /* Railing posts, a top rail and a middle rail */
  const posts = builder.isFar ? 8 : 16;
  for (let post = 0; post <= posts; post++) {
    const angle = stairwell.to + (post / posts) * sweep;
    builder.bar(
      "metal",
      colours.bronze,
      round(angle, gallery.radius - 0.06, gallery.y),
      round(angle, gallery.radius - 0.06, gallery.y + 0.8),
      0.05,
      5,
    );
  }
  [0.8, 0.45].forEach((up, index) => {
    if (index === 1 && builder.isFar) {
      return;
    }
    builder.add(
      "metal",
      colours.bronze,
      new CylinderGeometry(
        gallery.radius - 0.04,
        gallery.radius - 0.04,
        index === 0 ? 0.07 : 0.04,
        builder.segments(28, 14),
        1,
        true,
        stairwell.to,
        sweep,
      ),
      { at: [x, gallery.y + up, z] },
    );
  });
  /* Rails round the stairwell's sides */
  [stairwell.from, stairwell.to].forEach((angle) => {
    builder.bar(
      "metal",
      colours.bronze,
      round(angle, towerRadiusAt(gallery.y) + 0.05, gallery.y + 0.8),
      round(angle, gallery.radius - 0.06, gallery.y + 0.8),
      0.06,
      6,
    );
  });
  /* The crown: a smaller drum ringed with mortar tubes, and a bronze dome */
  builder.cylinder("matte", colours.basalt, {
    radius: crown.radius,
    radiusEnd: crown.radius * 0.95,
    length: crown.top - gallery.y,
    at: [x, (crown.top + gallery.y) / 2, z],
    segments: 8,
  });
  builder.cylinder("metal", colours.bronze, {
    radius: crown.radius + 0.12,
    length: 0.2,
    at: [x, crown.top, z],
    segments: 16,
  });
  const tubes = 8;
  const tubeColours = [colours.red, colours.blue, colours.gold, colours.green];
  for (let tube = 0; tube < tubes; tube++) {
    const angle = (tube / tubes) * Math.PI * 2;
    builder.bar(
      "paint",
      tubeColours[tube % tubeColours.length],
      round(angle, crown.radius * 0.8, crown.top),
      round(angle, crown.radius * 1.15, crown.top + 0.7),
      0.16,
      8,
    );
  }
  builder.lathe(
    "metal",
    colours.bronze,
    [
      [0, crown.top + 1.05],
      [0.3, crown.top + 0.98],
      [0.5, crown.top + 0.7],
      [0.58, crown.top + 0.25],
      [0.6, crown.top + 0.1],
    ],
    [x, 0, z],
    "y",
    builder.segments(18, 10),
  );
  /* The fire basket on top */
  builder.lathe(
    "metal",
    colours.bronzeDark,
    [
      [0.12, crown.top + 1.05],
      [0.35, crown.top + 1.15],
      [0.5, crown.top + 1.4],
      [0.46, crown.top + 1.42],
      [0.3, crown.top + 1.2],
      [0.1, crown.top + 1.12],
    ],
    [x, 0, z],
    "y",
    builder.segments(16, 8),
  );
  builder.cylinder("glow", colours.lava, {
    radius: 0.42,
    length: 0.04,
    at: [x, crown.top + 1.36, z],
    segments: builder.segments(16, 8),
  });
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const addBrazier = (builder: AttractionBuilder, x: number, z: number) => {
  const legs = builder.isFar ? 0 : 3;
  for (let leg = 0; leg < legs; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      colours.bronzeDark,
      [x + Math.sin(angle) * 0.32, 0, z + Math.cos(angle) * 0.32],
      [x + Math.sin(angle) * 0.18, 1.0, z + Math.cos(angle) * 0.18],
      0.05,
      5,
    );
  }
  builder.lathe(
    "metal",
    colours.bronze,
    [
      [0.05, 0.95],
      [0.25, 1.0],
      [0.34, 1.2],
      [0.31, 1.22],
      [0.2, 1.06],
    ],
    [x, 0, z],
    "y",
    builder.segments(10, 6),
  );
  builder.sphere("glow", colours.lava, 0.26, [x, 1.17, z], [1, 0.35, 1], 8);
  if (!builder.isFar) {
    builder.sphere(
      "glow",
      colours.ember,
      0.12,
      [x + 0.05, 1.28, z],
      [1, 1.4, 1],
      6,
    );
  }
};

const buildGrounds = (builder: AttractionBuilder) => {
  /* The path from the sign to the stair */
  builder.box("matte", colours.ashPaving, [1.8, 0.03, 8.4], [0, 0.015, 3.2]);
  if (!builder.isFar) {
    for (let slab = 0; slab < 10; slab++) {
      builder.box(
        "matte",
        shade(colours.ashPaving, 0.82),
        [1.8, 0.035, 0.05],
        [0, 0.017, -0.6 + slab * 0.84],
      );
    }
  }
  /* The viewing stand: a low dais with benches looking at the tower */
  builder.box(
    "matte",
    colours.basaltLight,
    [stand.maxX - stand.minX, standHeight, stand.maxZ - stand.minZ],
    [
      (stand.minX + stand.maxX) / 2,
      standHeight / 2,
      (stand.minZ + stand.maxZ) / 2,
    ],
  );
  builder.box(
    "metal",
    colours.bronzeDark,
    [stand.maxX - stand.minX + 0.06, 0.05, stand.maxZ - stand.minZ + 0.06],
    [(stand.minX + stand.maxX) / 2, standHeight, (stand.minZ + stand.maxZ) / 2],
  );
  if (!builder.isFar) {
    addBench(builder, [3.5, standHeight, 3.0], Math.PI + 0.45, colours.bronze);
    addBench(builder, [5.2, standHeight, 3.9], Math.PI + 0.65, colours.bronze);
    /* A bench on the other side, on the ash */
    addBench(builder, [-4.4, 0, 3.0], Math.PI - 0.55, colours.bronze);
  }
  /* Braziers by the path */
  addBrazier(builder, -3.2, 0.2);
  addBrazier(builder, 3.2, 0.6);
  /* Posts for the Catherine wheels */
  wheelPosts.forEach(({ x, z }) => {
    builder.box("matte", colours.basaltLight, [0.4, 0.2, 0.4], [x, 0.1, z]);
    builder.box(
      "matte",
      colours.crateDark,
      [0.14, wheelHeight, 0.14],
      [x, wheelHeight / 2, z],
    );
    builder.cylinder("metal", colours.bronze, {
      radius: 0.04,
      length: 0.2,
      at: [x, wheelHeight, z + 0.12],
      axis: "z",
      segments: 8,
    });
  });
  /* Boulders of basalt and pumice round the edge */
  const boulders: [number, number, number][] = [
    [-8.2, 2.6, 0.45],
    [-7.4, 4.6, 0.35],
    [7.6, 1.6, 0.5],
    [8.0, -1.0, 0.35],
    [2.4, -7.6, 0.55],
    [-2.2, -7.8, 0.45],
  ];
  (builder.isFar ? [] : boulders).forEach(([x, z, size], index) => {
    builder.sphere(
      "matte",
      index % 3 === 0 ? colours.ash : colours.basalt,
      size,
      [x, size * 0.45, z],
      [1.3, 0.8, 1],
      builder.segments(7, 5),
    );
  });
  /* Glowing cracks of lava in the ash */
  if (!builder.isFar) {
    const cracks: [number, number, number, number][] = [
      [-6.8, 5.2, 0.4, 1.3],
      [6.9, 4.6, -0.6, 1.1],
      [3.3, -6.5, 1.2, 1.0],
      [-3.4, -6.4, -0.3, 0.9],
    ];
    cracks.forEach(([x, z, turn, length]) => {
      builder.box(
        "glow",
        colours.lava,
        [0.08, 0.02, length],
        [x, 0.02, z],
        [0, turn, 0],
      );
      builder.box(
        "glow",
        colours.ember,
        [0.05, 0.02, length * 0.5],
        [x + 0.2, 0.02, z + 0.3],
        [0, turn + 0.7, 0],
      );
    });
  }
  if (!builder.isFar) {
    buildCart(builder, [6.7, 0, -0.4], -0.6);
  }
  addSignBoard(builder, [signAt.x, 0, signAt.z], colours.red);
};

/* ------------------------------------------------------------------ */
/* The climb to the gallery                                            */
/* ------------------------------------------------------------------ */

const climbStart: LocalPoint = { x: -1.3, z: -0.7 };
const climbFinish: LocalPoint = { x: 1.3, z: -0.4 };
const galleryFront = Math.PI * 4;
const galleryArrive = stairLastAngle + 0.4;

const along = (from: LocalSpot, to: LocalSpot, share: number): LocalSpot => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share,
  z: from.z + (to.z - from.z) * share,
  heading: Math.atan2(to.x - from.x, to.z - from.z),
});

const onStair = (share: number, isUp: boolean): LocalSpot => {
  const angle = stair.firstAngle + share * stairSweep;
  const [x, , z] = round(angle, stair.walk, 0);
  return {
    x,
    y: 0.04 + share * (gallery.y - 0.04),
    z,
    heading: isUp ? angle + Math.PI / 2 : angle - Math.PI / 2,
  };
};

const onGallery = (angle: number, isForward: boolean): LocalSpot => {
  const [x, , z] = round(angle, gallery.walk, 0);
  return {
    x,
    y: gallery.y + 0.02,
    z,
    heading: isForward ? angle + Math.PI / 2 : angle - Math.PI / 2,
  };
};

const ground = (point: LocalPoint): LocalSpot => ({
  ...point,
  y: 0,
  heading: 0,
});

/** Up the spiral stair, round the gallery to look out, and back down. */
const climbTower = (progress: number, seconds: number): LocalSpot => {
  const foot = onStair(0, true);
  const top = onStair(1, true);
  const arrive = onGallery(galleryArrive, true);
  const steps: [number, (share: number) => LocalSpot][] = [
    [0.05, (share) => along(ground(climbStart), foot, share)],
    [0.38, (share) => onStair(share, true)],
    [0.42, (share) => along(top, arrive, share)],
    [
      0.52,
      (share) =>
        onGallery(galleryArrive + (galleryFront - galleryArrive) * share, true),
    ],
    [
      0.7,
      () => ({
        ...onGallery(galleryFront, true),
        heading: 0.35 * Math.sin(seconds * 0.9),
      }),
    ],
    [
      0.8,
      (share) =>
        onGallery(galleryFront + (galleryArrive - galleryFront) * share, false),
    ],
    [0.83, (share) => along(arrive, top, share)],
    [0.96, (share) => onStair(1 - share, false)],
    [1, (share) => along(foot, ground(climbFinish), share)],
  ];
  let before = 0;
  for (const [until, place] of steps) {
    if (progress <= until) {
      return place((progress - before) / (until - before));
    }
    before = until;
  }
  return ground(climbFinish);
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

export const fireworkTowerModel: NewLandAttractionModel = {
  kind: "firework-tower",
  islandId: "ember-isle",
  name: "Firework Tower",
  fact: "When a firework's powder burns, it turns into brand new materials, such as smoke, gases and ash, which can never be turned back into powder: burning is an irreversible change. A pinch of a different metal in each star gives its colour, so copper glows blue, strontium glows red and sodium glows yellow.",
  curriculumLink:
    "Science, Year 5: properties and changes of materials. Explain that some changes result in the formation of new materials, and that this kind of change is not usually reversible, including changes associated with burning.",
  footprint: 9.5,
  setting: "inland",
  padColour: colours.ash,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: (builder) => {
    buildGrounds(builder);
    buildTower(builder);
    buildStair(builder);
    buildGallery(builder);
    buildLaunchField(builder);
    buildHut(builder);
  },
  moving: [
    {
      name: "red rocket",
      pivot: [launchField.rockets[0].x, 0.2, launchField.rockets[0].z],
      build: buildStickRocket(colours.red, colours.gold),
      motion: { kind: "launch", period: 19, height: 14, role: "body" },
    },
    {
      name: "blue rocket",
      pivot: [launchField.rockets[1].x, 0.2, launchField.rockets[1].z],
      build: buildStickRocket(colours.blue, colours.white),
      motion: { kind: "launch", period: 23, height: 15, role: "body" },
    },
    {
      name: "star bursts",
      pivot: [tower.x, 15, tower.z + 0.5],
      build: buildBursts,
      motion: { kind: "wake", reach: 11 },
    },
    {
      name: "left Catherine wheel",
      pivot: [wheelPosts[0].x, wheelHeight, wheelPosts[0].z + 0.24],
      build: buildCatherineWheel(colours.red, colours.gold),
      motion: { kind: "whirl", axis: "z", idle: 0.4, speed: 9, reach: 4.5 },
    },
    {
      name: "right Catherine wheel",
      pivot: [wheelPosts[1].x, wheelHeight, wheelPosts[1].z + 0.24],
      build: buildCatherineWheel(colours.blue, colours.green),
      motion: {
        kind: "whirl",
        axis: "z",
        idle: 0.4,
        speed: 9,
        reach: 4.5,
        phase: 1.3,
      },
    },
    {
      name: "beacon flame",
      pivot: [tower.x, crown.top + 1.36, tower.z],
      build: buildCrownFlame,
      motion: { kind: "flicker", period: 0.7 },
    },
  ],
  wanderers: [
    {
      name: "spectators",
      build: buildSpectator,
      count: 3,
      centre: { x: -0.2, z: 4.4 },
      radius: 1.8,
      speed: 0.45,
    },
  ],
  smoke: [
    {
      at: [hut.x + 0.8, hut.height + 1.5, hut.z - 0.5],
      colour: "#8e8784",
      puffs: 6,
      size: 0.35,
      rise: 2.4,
      spread: 0.4,
    },
    {
      at: [launchField.rockets[0].x, 0.4, launchField.rockets[0].z],
      colour: "#b9b2ad",
      puffs: 5,
      size: 0.3,
      rise: 1.6,
      spread: 0.6,
    },
  ],
  blockers: [{ x: tower.x, z: tower.z, radius: 1.35 }],
  decks: [buildFlatDeck(stand, standHeight, "ground")],
  rides: [
    {
      id: "spiral-stair",
      name: "the Firework Tower's spiral stair",
      start: climbStart,
      reach: 0.6,
      seconds: 16,
      finish: climbFinish,
      follow: climbTower,
    },
  ],
  tune: [72, 76, 79, 84],
  play: {
    label: "Light the fuse",
    news: "Fizz... WHOOSH! A rocket soared over the tower and burst into red, blue and gold stars, leaving only smoke and ash behind.",
    tune: [60, 64, 67, 72, 76, 79, 84],
  },
};
