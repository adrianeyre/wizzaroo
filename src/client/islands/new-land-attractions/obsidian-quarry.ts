import {
  addBench,
  addBush,
  addDoor,
  addGableRoof,
  addLampPost,
  addSignBoard,
  addWindow,
  buildFlatDeck,
  shade,
  type AttractionBuilder,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import {
  addCartFrame,
  addCartTub,
  addPickaxe,
  addRails,
  addShard,
  benches,
  faceSweep,
  onFace,
  basalt,
  basaltLight,
  bronze,
  buildCage,
  buildCraneBase,
  buildCraneJib,
  buildHoist,
  buildHoistWheel,
  buildQuarryFace,
  buildWorker,
  cagePeriod,
  cageTravel,
  craneAt,
  darkTimber,
  ember,
  gantryHeight,
  hoistAt,
  hoistHeight,
  obsidian,
  obsidianSheen,
  timber,
} from "./obsidian-quarry-parts.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";

const ashPad = "#5e544e";
const floorDust = "#6a615b";
const signColour = "#3b2a4a";
const hutStone = "#57504c";
const roofSlate = "#3a3f47";

const railsFrom = { x: 0.4, z: 2.6 };
const railsTo = { x: 5.4, z: 2.6 };
const parkedCartAt: Triple = [1.6, 0.08, 2.6];
const tipperAt: Triple = [5.0, 0.26, 2.6];
const yard = { minX: 2.0, maxX: 5.0, minZ: 4.4, maxZ: 6.4 };
const yardHeight = 0.28;
const hutAt = { x: -5.4, z: 3.2 };
const signAt = { x: -1.2, z: 8.6 };
const specimenAt = { x: 4.2, z: 5.6 };

const cageMotion: Motion = {
  kind: "bob",
  height: cageTravel,
  period: cagePeriod,
};
const cagePivot: Triple = [hoistAt.x, gantryHeight - 0.05, hoistAt.z];

/* ------------------------------------------------------------------ */
/* The quarry floor, the rails and the cutting yard                    */
/* ------------------------------------------------------------------ */

const buildFloor = (builder: AttractionBuilder) => {
  builder.cylinder("matte", floorDust, {
    radius: 6.0,
    length: 0.02,
    at: [0, 0.01, 0.5],
    segments: builder.segments(28, 14),
  });
  [
    [-0.8, 7.0, 1.4, 3.6, -0.15],
    [-1.6, -1.2, 1.3, 3.2, 0.1],
    [-3.4, 3.4, 1.2, 2.4, 1.3],
  ].forEach(([x, z, width, length, turn]) => {
    builder.box(
      "matte",
      shade(floorDust, 1.18),
      [width, 0.02, length],
      [x, 0.025, z],
      [0, turn, 0],
    );
  });
  addRails(builder, railsFrom, railsTo);
  addCartFrame(builder, parkedCartAt, Math.PI / 2);
  addCartTub(builder, [parkedCartAt[0], 0.24, parkedCartAt[2]]);
  /* The tipping cart's frame, its tub tips (see the moving parts) */
  addCartFrame(builder, [tipperAt[0], 0.08, tipperAt[2]], Math.PI / 2);
  builder.box(
    "metal",
    darkTimber,
    [0.12, 0.4, 0.7],
    [railsTo.x + 0.1, 0.2, railsTo.z],
  );
  /* The heap the tipping cart empties onto */
  builder.lathe(
    "matte",
    basaltLight,
    [
      [1.1, 0],
      [0.9, 0.25],
      [0.45, 0.6],
      [0, 0.68],
    ],
    [6.5, 0, 2.4],
    "y",
    builder.segments(12, 6),
  );
  if (!builder.isFar) {
    [
      [6.2, 0.45, 2.1],
      [6.7, 0.35, 2.8],
      [6.5, 0.62, 2.4],
      [6.0, 0.2, 2.9],
    ].forEach(([x, y, z], index) => {
      builder.sphere(
        "glass",
        index % 2 === 0 ? obsidian : obsidianSheen,
        0.16,
        [x, y, z],
        [1.2, 0.8, 1],
        5,
      );
    });
  }
};

const buildYard = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = yard;
  builder.box(
    "matte",
    basaltLight,
    [maxX - minX, yardHeight, maxZ - minZ],
    [(minX + maxX) / 2, yardHeight / 2, (minZ + maxZ) / 2],
  );
  if (!builder.isFar) {
    for (let joint = 1; joint < 4; joint++) {
      builder.box(
        "matte",
        shade(basaltLight, 0.75),
        [0.03, 0.01, maxZ - minZ - 0.06],
        [
          minX + ((maxX - minX) * joint) / 4,
          yardHeight + 0.005,
          (minZ + maxZ) / 2,
        ],
      );
    }
  }
  /* The great polished specimen, like a black mirror on its plinth */
  const { x, z } = specimenAt;
  builder.box("matte", basalt, [0.7, 0.5, 0.5], [x, yardHeight + 0.25, z]);
  builder.box(
    "metal",
    bronze,
    [0.5, 0.12, 0.02],
    [x, yardHeight + 0.3, z + 0.26],
  );
  addShard(builder, [x - 0.15, yardHeight + 0.5, z], 0.95, 0.24);
  addShard(
    builder,
    [x + 0.15, yardHeight + 0.5, z + 0.05],
    0.7,
    0.18,
    [0.04, 0, 0],
  );
  addShard(
    builder,
    [x + 0.05, yardHeight + 0.5, z - 0.1],
    0.55,
    0.15,
    [-0.05, 0, 0],
  );
  /* Stacks of cut blocks round the yard's back edge */
  [
    [minX + 0.35, minZ + 0.3, 0],
    [minX + 0.35, minZ + 0.3, 1],
    [minX + 1.0, minZ + 0.3, 0],
    [maxX - 0.35, maxZ - 0.35, 0],
  ].forEach(([bx, bz, level], index) => {
    builder.box(
      "glass",
      index % 2 === 0 ? obsidian : obsidianSheen,
      [0.55, 0.4, 0.45],
      [bx, yardHeight + 0.2 + level * 0.41, bz],
      [0, index * 0.25, 0],
    );
  });
  /* A mason's bench with a hammer and chisel */
  builder.box(
    "paint",
    timber,
    [0.9, 0.06, 0.45],
    [minX + 0.6, yardHeight + 0.62, maxZ - 0.35],
  );
  [-0.38, 0.38].forEach((side) => {
    builder.box(
      "paint",
      darkTimber,
      [0.06, 0.6, 0.4],
      [minX + 0.6 + side, yardHeight + 0.3, maxZ - 0.35],
    );
  });
  if (!builder.isFar) {
    builder.box(
      "metal",
      "#6d737a",
      [0.16, 0.08, 0.08],
      [minX + 0.5, yardHeight + 0.69, maxZ - 0.3],
    );
    builder.bar(
      "matte",
      timber,
      [minX + 0.5, yardHeight + 0.69, maxZ - 0.3],
      [minX + 0.5, yardHeight + 0.69, maxZ - 0.62],
      0.03,
      4,
    );
    builder.box(
      "glass",
      obsidianSheen,
      [0.25, 0.12, 0.2],
      [minX + 0.8, yardHeight + 0.71, maxZ - 0.35],
      [0, 0.4, 0],
    );
  }
};

/* ------------------------------------------------------------------ */
/* The workers' hut                                                    */
/* ------------------------------------------------------------------ */

const buildHut = (builder: AttractionBuilder) => {
  const { x, z } = hutAt;
  const width = 2.4;
  const depth = 1.8;
  const height = 1.8;
  const turn = Math.PI / 2;
  builder.box("matte", hutStone, [depth, height, width], [x, height / 2, z]);
  builder.box(
    "matte",
    basalt,
    [depth + 0.12, 0.22, width + 0.12],
    [x, 0.11, z],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.7,
    at: [x, height, z],
    colour: roofSlate,
    overhang: 0.22,
    thickness: 0.09,
    turn,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      hutStone,
      [depth * 0.7, 0.5, 0.08],
      [x, height + 0.22, z + side * (width / 2 - 0.04)],
    );
  });
  addDoor(builder, {
    at: [x + depth / 2 + 0.01, 0.22, z - 0.5],
    width: 0.6,
    height: 1.15,
    colour: "#6b3a22",
    frame: bronze,
    turn,
  });
  addWindow(builder, {
    at: [x + depth / 2 + 0.01, 1.15, z + 0.55],
    width: 0.6,
    height: 0.45,
    frame: bronze,
    turn,
    isLit: true,
  });
  /* The hut's lantern bracket */
  builder.bar(
    "metal",
    "#1f2023",
    [x + depth / 2, 1.7, z],
    [x + depth / 2 + 0.35, 1.7, z],
    0.03,
    4,
  );
  builder.box(
    "glow",
    "#ffd27a",
    [0.14, 0.2, 0.14],
    [x + depth / 2 + 0.35, 1.52, z],
  );
  builder.box(
    "paint",
    "#1f2023",
    [0.2, 0.04, 0.2],
    [x + depth / 2 + 0.35, 1.64, z],
  );
  builder.box(
    "matte",
    basalt,
    [0.36, 1.0, 0.36],
    [x - 0.4, height + 0.55, z - 0.7],
  );
  /* A water barrel, a rack of pickaxes and a pile of helmets */
  builder.cylinder("paint", "#6b4428", {
    radius: 0.3,
    length: 0.75,
    at: [x + 1.3, 0.38, z + 1.25],
    segments: 12,
  });
  builder.cylinder("water", "#3d9fc2", {
    radius: 0.27,
    length: 0.02,
    at: [x + 1.3, 0.74, z + 1.25],
    segments: 12,
  });
  if (!builder.isFar) {
    [0.15, 0.6].forEach((up) => {
      builder.cylinder("metal", "#3a3f44", {
        radius: 0.31,
        length: 0.04,
        at: [x + 1.3, up, z + 1.25],
        segments: 12,
        isOpen: true,
      });
    });
  }
  builder.box(
    "paint",
    darkTimber,
    [0.08, 0.08, 1.3],
    [x + 1.15, 0.85, z - 1.6],
  );
  [-0.5, 0, 0.5].forEach((along) => {
    addPickaxe(builder, [x + 1.2, 0.85, z - 1.6 + along], Math.PI / 2);
  });
  /* A bench for the workers' tea break, and a kettle on a little stove */
  addBench(builder, [x + 0.3, 0, z + 2.1], Math.PI / 2, "#8a5a35");
};

/* ------------------------------------------------------------------ */
/* The grounds                                                         */
/* ------------------------------------------------------------------ */

const buildGrounds = (builder: AttractionBuilder) => {
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addLampPost(builder, [-2.6, 0, 5.6]);
  addLampPost(builder, [1.6, 0, 6.6]);
  [
    [-7.8, 1.8, 0.5],
    [7.6, 4.4, 0.55],
  ].forEach(([x, z, size]) => {
    addBush(builder, [x, 0, z], size, "#55703f");
  });
  if (!builder.isFar) {
    [
      [-7.2, 5.6, 0.4],
      [6.6, 6.6, 0.45],
      [-4.2, 7.6, 0.35],
    ].forEach(([x, z, size], index) => {
      builder.sphere(
        index === 1 ? "glass" : "matte",
        index === 1 ? obsidian : basalt,
        size,
        [x, size * 0.4, z],
        [1.3, 0.8, 1],
        6,
      );
    });
  }
  /* A row of warning posts along the foot of the face */
  const posts = builder.isFar ? 0 : 5;
  for (let post = 0; post < posts; post++) {
    const angle = -0.75 + (post / (posts - 1)) * 1.5;
    const x = Math.sin(angle) * 5.35;
    const z = 0.5 - Math.cos(angle) * 5.35;
    if (
      Math.abs(x - hoistAt.x) < 1.2 ||
      Math.hypot(x - craneAt.x, z - craneAt.z) < 1.2
    ) {
      continue;
    }
    builder.box("paint", "#e8c234", [0.08, 0.7, 0.08], [x, 0.35, z]);
    builder.box("paint", "#1f2023", [0.085, 0.12, 0.085], [x, 0.5, z]);
  }
  /* The cable from the hoist's wheel down through its cage */
  builder.bar(
    "metal",
    "#9aa3ad",
    [hoistAt.x, hoistHeight + 0.35, hoistAt.z + 0.5],
    [hoistAt.x, 0.3, hoistAt.z + 0.5],
    0.025,
    4,
  );
  builder.bar(
    "metal",
    "#9aa3ad",
    [hoistAt.x, hoistHeight + 0.35, hoistAt.z - 0.5],
    [hoistAt.x, gantryHeight + 1.6, hoistAt.z - 0.5],
    0.025,
    4,
  );
  /* A glowing crack of lava where the face meets the floor */
  builder.box("glow", ember, [0.06, 0.02, 1.4], [5.6, 0.03, -1.3], [0, 0.5, 0]);
};

/* ------------------------------------------------------------------ */
/* Basalt columns, the Stone Age case and the bench-top details        */
/* ------------------------------------------------------------------ */

const buildFeatures = (builder: AttractionBuilder) => {
  /* Six-sided basalt columns, as lava cracks when it cools, at each end
   * of the face */
  [-1, 1].forEach((side) => {
    const columns: [number, number, number][] = builder.isFar
      ? [
          [0.1, 6.5, 2.8],
          [0.15, 7.6, 3.4],
          [0.12, 8.6, 3.0],
        ]
      : [
          [0.05, 6.2, 1.4],
          [0.12, 6.6, 2.4],
          [0.06, 7.0, 2.0],
          [0.14, 7.4, 3.0],
          [0.08, 7.8, 3.5],
          [0.16, 8.2, 3.2],
          [0.09, 8.6, 3.7],
          [0.15, 9.0, 2.9],
          [0.22, 6.9, 1.2],
          [0.24, 7.9, 2.2],
          [0.25, 8.8, 1.8],
        ];
    columns.forEach(([outside, radius, height], index) => {
      const [x, , z] = onFace(side * (faceSweep + outside), radius);
      builder.cylinder("matte", index % 3 === 0 ? basaltLight : basalt, {
        radius: 0.3,
        length: height,
        at: [x, height / 2, z],
        segments: 6,
      });
      builder.cylinder("matte", shade(basaltLight, 1.2), {
        radius: 0.27,
        length: 0.02,
        at: [x, height + 0.01, z],
        segments: 6,
      });
    });
  });
  /* Glassy outcrops and boulders on the benches, and tufts of grass */
  const outcrops: [number, number, number][] = [
    [-0.3, 1, 0.5],
    [0.55, 2, 0.6],
    [-0.85, 2, 0.45],
    [0.95, 1, 0.4],
  ];
  outcrops.forEach(([angle, bench, height]) => {
    const radius = benches[bench].radius + 0.3;
    const [x, , z] = onFace(angle, radius);
    const y = benches[bench - 1].top;
    addShard(builder, [x, y, z], height, 0.18);
    if (!builder.isFar) {
      addShard(builder, [x + 0.22, y, z + 0.1], height * 0.6, 0.12);
      addShard(builder, [x - 0.18, y, z - 0.05], height * 0.7, 0.13);
    }
  });
  if (!builder.isFar) {
    [
      [-0.55, 0, 0.35],
      [0.2, 1, 0.3],
      [0.8, 2, 0.35],
      [-0.2, 2, 0.3],
      [-1.0, 1, 0.3],
    ].forEach(([angle, bench, size]) => {
      const [x, , z] = onFace(angle, benches[bench].radius + 0.55);
      addBush(builder, [x, benches[bench].top, z], size, "#55703f");
    });
  }
  /* The Stone Age case: obsidian arrowheads and a knife under glass */
  const caseAt = { x: 2.4, z: 7.6 };
  builder.box(
    "paint",
    darkTimber,
    [1.1, 0.75, 0.6],
    [caseAt.x, 0.375, caseAt.z],
  );
  builder.box("paint", "#c9b48a", [1.0, 0.03, 0.5], [caseAt.x, 0.77, caseAt.z]);
  builder.box(
    "glass",
    "#a9c4d4",
    [1.02, 0.32, 0.52],
    [caseAt.x, 0.93, caseAt.z],
  );
  builder.box(
    "paint",
    darkTimber,
    [1.12, 0.05, 0.62],
    [caseAt.x, 1.1, caseAt.z],
  );
  [-0.35, -0.15, 0.05].forEach((along, index) => {
    builder.cylinder("glass", obsidian, {
      radius: 0.07,
      radiusEnd: 0.005,
      length: 0.2,
      at: [caseAt.x + along, 0.8, caseAt.z + (index - 1) * 0.08],
      axis: "z",
      segments: 3,
    });
  });
  builder.box(
    "glass",
    obsidian,
    [0.3, 0.02, 0.08],
    [caseAt.x + 0.3, 0.8, caseAt.z],
    [0, 0.3, 0],
  );
  builder.box(
    "matte",
    "#8a5a35",
    [0.12, 0.03, 0.05],
    [caseAt.x + 0.12, 0.8, caseAt.z - 0.05],
    [0, 0.3, 0],
  );
  /* Signs on the hoist and at the edge of the yard */
  builder.box(
    "paint",
    "#e8c234",
    [0.7, 0.3, 0.04],
    [hoistAt.x, 2.2, hoistAt.z + 0.8],
  );
  if (!builder.isFar) {
    builder.box(
      "paint",
      "#1f2023",
      [0.5, 0.06, 0.02],
      [hoistAt.x, 2.25, hoistAt.z + 0.83],
    );
    builder.box(
      "paint",
      "#1f2023",
      [0.36, 0.05, 0.02],
      [hoistAt.x, 2.14, hoistAt.z + 0.83],
    );
  }
  /* A ladder up one leg of the hoist, for the workers */
  [-0.2, 0.2].forEach((side) => {
    builder.box(
      "paint",
      timber,
      [0.05, 4.2, 0.05],
      [hoistAt.x - 0.95, 2.1, hoistAt.z + side],
    );
  });
  if (!builder.isFar) {
    for (let rung = 1; rung < 12; rung++) {
      builder.box(
        "paint",
        timber,
        [0.04, 0.04, 0.4],
        [hoistAt.x - 0.95, rung * 0.35, hoistAt.z],
      );
    }
  }
  /* A stack of timber props by the crane */
  [0, 1, 2].forEach((layer) => {
    [-1, 0, 1].forEach((log) => {
      if (layer === 2 && log !== 0) {
        return;
      }
      builder.cylinder("matte", layer % 2 === 0 ? timber : darkTimber, {
        radius: 0.12,
        length: 1.6,
        at: [0.9 + log * 0.25 + layer * 0.12, 0.12 + layer * 0.21, -3.6],
        axis: "x",
        segments: builder.segments(8, 5),
      });
    });
  });
};

/* ------------------------------------------------------------------ */
/* The hoist ride: in at the bottom, up to the gantry, and back down   */
/* ------------------------------------------------------------------ */

const rideStart = { x: hoistAt.x, z: hoistAt.z + 1.5 };
const rideFinish = { x: hoistAt.x + 1.6, z: hoistAt.z + 1.9 };

const rideTheHoist = (progress: number, seconds: number): LocalSpot => {
  const lift = Math.sin((seconds / cagePeriod) * Math.PI * 2);
  const floor = cageTravel * (1 + lift);
  /* Near the top, step out along the gantry to look over the quarry */
  const outShare = Math.min(1, Math.max(0, (lift - 0.9) / 0.08));
  const inCage = {
    x: hoistAt.x,
    y: floor + (gantryHeight - floor) * Math.min(1, outShare * 3),
    z: hoistAt.z - 2.0 * outShare,
  };
  const share = Math.min(1, progress * 7, (1 - progress) * 7);
  const ground = progress < 0.5 ? rideStart : rideFinish;
  return {
    x: ground.x + (inCage.x - ground.x) * share,
    y: inCage.y * share,
    z: ground.z + (inCage.z - ground.z) * share,
    heading: outShare > 0 ? Math.PI : 0,
  };
};

/* ------------------------------------------------------------------ */
/* The model                                                           */
/* ------------------------------------------------------------------ */

export const obsidianQuarryModel: NewLandAttractionModel = {
  kind: "obsidian-quarry",
  islandId: "ember-isle",
  name: "Obsidian Quarry",
  fact: "Obsidian is a natural glass made by volcanoes. When lava cools so quickly that crystals have no time to grow, it sets into smooth, shiny black glass instead of grainy rock. Its edges break so sharp that Stone Age people chipped it into knives and arrowheads.",
  curriculumLink:
    "Science, Year 3: rocks. Compare and group together different kinds of rocks on the basis of their appearance and simple physical properties, and describe how rocks are formed.",
  footprint: 10,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: signAt.x, z: signAt.z + 0.7 },
  build: (builder) => {
    buildFloor(builder);
    buildQuarryFace(builder);
    buildHoist(builder);
    buildCraneBase(builder);
    buildYard(builder);
    buildHut(builder);
    buildGrounds(builder);
    buildFeatures(builder);
  },
  moving: [
    {
      name: "hoist cage",
      pivot: cagePivot,
      build: buildCage,
      motion: cageMotion,
    },
    {
      name: "hoist wheel",
      pivot: [hoistAt.x, hoistHeight + 0.35, hoistAt.z],
      build: buildHoistWheel,
      motion: { kind: "swing", axis: "x", amplitude: 2.4, period: cagePeriod },
    },
    {
      name: "crane jib",
      pivot: [craneAt.x, 0.3, craneAt.z],
      build: buildCraneJib,
      motion: { kind: "whirl", axis: "y", idle: 0.08, speed: 0.9, reach: 7 },
    },
    {
      name: "tipping cart",
      pivot: tipperAt,
      build: (builder) => {
        addCartTub(builder);
      },
      motion: { kind: "nod", axis: "z", reach: 4, amplitude: 0.5, period: 3 },
    },
    {
      name: "specimen sparkle",
      pivot: [specimenAt.x - 0.15, yardHeight + 1.5, specimenAt.z],
      build: (builder) => {
        builder.box("glow", "#d9c8ff", [0.05, 0.42, 0.05], [0, 0, 0]);
        builder.box("glow", "#d9c8ff", [0.42, 0.05, 0.05], [0, 0, 0]);
        builder.sphere("glow", "#ffffff", 0.06, [0, 0, 0], [1, 1, 1], 6);
      },
      motion: { kind: "wake", reach: 3.5 },
    },
    {
      name: "lantern glow",
      pivot: [hutAt.x + 1.25, 1.5, hutAt.z],
      build: (builder) => {
        builder.sphere("glow", "#ffd27a", 0.9, [0, 0, 0], [1, 1, 1], 12);
      },
      motion: { kind: "wake", reach: 6 },
      look: "halo",
    },
  ],
  wanderers: [
    {
      name: "quarry workers",
      build: buildWorker,
      count: 2,
      centre: { x: -0.2, z: 0.2 },
      radius: 1.7,
      speed: 0.5,
    },
  ],
  smoke: [
    {
      at: [hutAt.x - 0.4, 3.15, hutAt.z - 0.7],
      colour: "#8f8a86",
      puffs: 4,
      size: 0.28,
      rise: 1.8,
      spread: 0.3,
    },
    {
      at: [6.4, 0.8, 2.4],
      colour: "#b8ada4",
      puffs: 5,
      size: 0.35,
      rise: 1.6,
      spread: 0.5,
    },
  ],
  decks: [buildFlatDeck(yard, yardHeight, "ground")],
  rides: [
    {
      id: "hoist",
      name: "the quarry hoist",
      start: rideStart,
      reach: 0.6,
      seconds: cagePeriod,
      finish: rideFinish,
      follow: rideTheHoist,
    },
  ],
  play: {
    label: "Split an obsidian block",
    news: "Tap, tap, CRACK! The block split along a smooth curved face as shiny as a black mirror, just as Stone Age toolmakers' did.",
    tune: [52, 55, 59, 64],
  },
};
