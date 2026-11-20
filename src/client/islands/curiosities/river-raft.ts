import { LatheGeometry, RingGeometry, SphereGeometry, Vector2 } from "three";
import {
  addSignBoard,
  buildFlatDeck,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type LocalPoint,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const mud = "#7a5a3a";
const riverBed = "#2f4b3c";
const riverBlue = "#3a9fb0";
const foam = "#e3f4f2";
const mossRock = "#6f7a5c";
const bamboo = "#c9b458";
const bambooDark = "#9c8a3c";
const lashing = "#7a5230";
const thatch = "#b58f4a";
const jungleLeaf = "#2f7d32";
const brightLeaf = "#4caf50";
const dolphinPink = "#e9a3b4";
const signColour = "#2e6b3a";

/* The river bends round a centre far behind the visitors, so the raft can drift along it by swinging about that centre. */
const bend = { x: 0, z: 7 };
const riverRadius = 9.5;
const riverHalfWidth = 1.1;
const riverSpread = 0.56;
const waterLevel = 0.16;
const raftDrift = 0.28;
const raftPeriod = 16;
const bendPivot: Triple = [bend.x, 0, bend.z];

const pointOnRiver = (angle: number, radius = riverRadius): LocalPoint => ({
  x: bend.x - radius * Math.sin(angle),
  z: bend.z - radius * Math.cos(angle),
});

const jetty = { minX: -0.75, maxX: 0.75, minZ: -1.25, maxZ: 0.6, height: 0.3 };
const canoeAngle = 0.49;
const dolphinAngle = -0.49;

const raftMotion: Motion = {
  kind: "swing",
  axis: "y",
  amplitude: raftDrift,
  period: raftPeriod,
};

/** A flat band of the river's arc, from one radius to another. */
const addRiverBand = (
  builder: AttractionBuilder,
  finish: "matte" | "water",
  colour: string,
  inner: number,
  outer: number,
  height: number,
  spread = riverSpread,
) => {
  builder.add(
    finish,
    colour,
    new RingGeometry(
      inner,
      outer,
      builder.segments(36),
      1,
      Math.PI / 2 - spread,
      spread * 2,
    ).rotateX(-Math.PI / 2),
    { at: [bend.x, height, bend.z] },
  );
};

/** A long leaf, a squashed sphere tipped out from its stem. */
const addLeaf = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  droop: number,
  length: number,
  colour: string,
) => {
  builder.add(
    "matte",
    colour,
    new SphereGeometry(1, builder.segments(6, 4), builder.segments(4, 2)),
    {
      at: [
        at[0] + Math.sin(turn) * length * 0.9 * Math.cos(droop),
        at[1] - Math.sin(droop) * length * 0.9,
        at[2] + Math.cos(turn) * length * 0.9 * Math.cos(droop),
      ],
      rotation: [droop, turn, 0],
      scale: [length * 0.28, 0.04, length],
    },
  );
};

const addPalm = (builder: AttractionBuilder, at: Triple, height: number) => {
  const [x, , z] = at;
  const lean = 0.35;
  builder.cylinder("matte", "#7a5c3c", {
    radius: 0.16,
    radiusEnd: 0.11,
    length: height,
    at: [x + lean / 2, height / 2, z],
    segments: 10,
  });
  const crown: Triple = [x + lean, height, z];
  builder.sphere("matte", "#6b4a2f", 0.17, crown, [1, 0.8, 1], 8);
  const leaves = builder.isFar ? 4 : 8;
  for (let index = 0; index < leaves; index++) {
    addLeaf(
      builder,
      crown,
      (index / leaves) * Math.PI * 2,
      0.45 + (index % 2) * 0.2,
      1.15,
      index % 2 === 0 ? jungleLeaf : brightLeaf,
    );
  }
  if (builder.isFar) {
    return;
  }
  /* Rings on the trunk where old leaves fell, and a bunch of coconuts */
  for (let ring = 1; ring < 4; ring++) {
    const share = ring / 4;
    builder.torus(
      "matte",
      "#5f452c",
      0.16 - share * 0.05,
      0.025,
      [x + lean * share, height * share, z],
      "y",
      10,
    );
  }
  [0, 2.1, 4.2].forEach((turn) => {
    builder.sphere(
      "matte",
      "#5c4027",
      0.1,
      [
        crown[0] + Math.sin(turn) * 0.14,
        crown[1] - 0.14,
        crown[2] + Math.cos(turn) * 0.14,
      ],
      [1, 1, 1],
      6,
    );
  });
};

const addFern = (builder: AttractionBuilder, at: Triple, size: number) => {
  const fronds = 6;
  for (let index = 0; index < fronds; index++) {
    addLeaf(
      builder,
      [at[0], at[1] + 0.1 * size, at[2]],
      (index / fronds) * Math.PI * 2 + size,
      -0.5,
      0.5 * size,
      index % 2 === 0 ? brightLeaf : shade(jungleLeaf, 1.1),
    );
  }
};

const buildRiver = (builder: AttractionBuilder) => {
  addRiverBand(
    builder,
    "matte",
    mud,
    riverRadius - riverHalfWidth - 0.45,
    riverRadius + riverHalfWidth + 0.45,
    0.02,
    riverSpread + 0.04,
  );
  addRiverBand(
    builder,
    "matte",
    riverBed,
    riverRadius - riverHalfWidth,
    riverRadius + riverHalfWidth,
    0.05,
  );
  addRiverBand(
    builder,
    "water",
    riverBlue,
    riverRadius - riverHalfWidth,
    riverRadius + riverHalfWidth,
    waterLevel,
  );
  /* Mossy boulders where the river comes out of the jungle and goes back in */
  [-1, 1].forEach((end) => {
    const angle = end * (riverSpread + 0.02);
    [-0.9, -0.3, 0.35, 0.95].forEach((across, index) => {
      if (builder.isFar && index % 2 === 1) {
        return;
      }
      const { x, z } = pointOnRiver(angle, riverRadius + across);
      builder.sphere(
        "matte",
        index % 2 === 0 ? mossRock : shade(mossRock, 0.85),
        0.42 - (index % 2) * 0.1,
        [x, 0.2, z],
        [1.1, 0.75, 1],
        8,
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  /* Stones and reeds along both banks */
  for (let step = 0; step < 9; step++) {
    const angle = -riverSpread + 0.06 + (step / 8) * (riverSpread * 2 - 0.12);
    [-1, 1].forEach((side) => {
      if (side === -1 && Math.abs(angle) < 0.1) {
        return;
      }
      const wobble = ((step * 7 + side * 3) % 5) * 0.04;
      const { x, z } = pointOnRiver(
        angle + wobble * 0.1,
        riverRadius + side * (riverHalfWidth + 0.12 + wobble),
      );
      builder.sphere(
        "matte",
        step % 3 === 0 ? shade(mossRock, 1.15) : mossRock,
        0.16 + wobble,
        [x, 0.1, z],
        [1.2, 0.6, 1],
        6,
      );
    });
  }
  /* Ripples where the water runs past the stones */
  [-0.4, -0.15, 0.2, 0.42].forEach((angle, index) => {
    const { x, z } = pointOnRiver(
      angle,
      riverRadius + (index % 2 ? 0.6 : -0.7),
    );
    builder.box(
      "water",
      foam,
      [0.5, 0.01, 0.08],
      [x, waterLevel + 0.01, z],
      [0, Math.PI / 2 - angle, 0],
    );
  });
  /* Reeds by the jetty */
  [
    [-1.6, -1.5],
    [1.7, -1.45],
    [-2.9, -1.2],
  ].forEach(([x, z]) => {
    for (let reed = 0; reed < 5; reed++) {
      const lean = (reed - 2) * 0.1;
      builder.bar(
        "matte",
        "#6e8f3a",
        [x + reed * 0.07, 0, z],
        [x + reed * 0.07 + lean, 0.7 + (reed % 2) * 0.25, z + lean * 0.4],
        0.03,
        4,
      );
    }
    builder.box("matte", "#5a3b22", [0.05, 0.16, 0.05], [x + 0.14, 0.85, z]);
  });
};

const buildJetty = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ, height } = jetty;
  const width = maxX - minX;
  const length = maxZ - minZ;
  builder.box(
    "matte",
    palette.timber,
    [width, 0.08, length],
    [(minX + maxX) / 2, height - 0.04, (minZ + maxZ) / 2],
  );
  /* Posts at the corners, sunk into the bank */
  [minX + 0.06, maxX - 0.06].forEach((x) => {
    [minZ + 0.08, maxZ - 0.08].forEach((z) => {
      builder.cylinder("matte", palette.darkTimber, {
        radius: 0.07,
        length: z < minZ + 0.1 ? 0.62 : height,
        at: [x, z < minZ + 0.1 ? 0.31 : height / 2, z],
        segments: 8,
      });
    });
  });
  if (builder.isFar) {
    return;
  }
  for (let plank = 0; plank < 9; plank++) {
    const z = minZ + 0.1 + plank * ((length - 0.2) / 8);
    builder.box(
      "matte",
      shade(palette.timber, plank % 2 === 0 ? 1.1 : 0.93),
      [width - 0.04, 0.02, 0.17],
      [(minX + maxX) / 2, height + 0.01, z],
    );
  }
  /* A step up from the path */
  builder.box(
    "matte",
    palette.darkTimber,
    [width, 0.15, 0.3],
    [(minX + maxX) / 2, 0.075, maxZ + 0.15],
  );
  /* Rope coiled on the jetty, and a lantern on a pole */
  builder.torus(
    "matte",
    "#c9a86a",
    0.14,
    0.035,
    [0.45, height + 0.04, -0.2],
    "y",
    14,
  );
  builder.torus(
    "matte",
    "#c9a86a",
    0.09,
    0.03,
    [0.45, height + 0.09, -0.2],
    "y",
    12,
  );
  builder.bar(
    "matte",
    "#c9a86a",
    [0.5, height + 0.05, -0.34],
    [0.68, 0.36, -1.17],
    0.03,
    4,
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 1.5,
    at: [-0.66, height + 0.75, -1.15],
    segments: 6,
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [-0.66, height + 1.45, -1.15],
    [-0.4, height + 1.45, -1.15],
    0.04,
    5,
  );
  builder.box(
    "glow",
    palette.warmLight,
    [0.13, 0.18, 0.13],
    [-0.4, height + 1.25, -1.15],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.11,
    radiusEnd: 0.02,
    length: 0.1,
    at: [-0.4, height + 1.39, -1.15],
    segments: 8,
  });
  /* A paddle leaning on the post, and a basket of fruit */
  builder.bar(
    "matte",
    palette.paleTimber,
    [-0.55, 0.1, 0.62],
    [-0.58, 1.1, 0.4],
    0.04,
    5,
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [0.16, 0.36, 0.04],
    [-0.54, 0.25, 0.66],
    [-0.2, 0, 0],
  );
  builder.cylinder("matte", "#a77b45", {
    radius: 0.2,
    radiusEnd: 0.15,
    length: 0.22,
    at: [0.35, height + 0.11, 0.35],
    segments: 12,
  });
  [
    { colour: "#f2c94c", dx: 0.06, dz: 0 },
    { colour: "#e8742f", dx: -0.05, dz: 0.05 },
    { colour: "#7cb342", dx: 0.02, dz: -0.07 },
  ].forEach(({ colour, dx, dz }) => {
    builder.sphere(
      "paint",
      colour,
      0.07,
      [0.35 + dx, height + 0.25, 0.35 + dz],
      [1, 1, 1],
      8,
    );
  });
};

const buildBanks = (builder: AttractionBuilder) => {
  /* A muddy path from the visitors down to the jetty */
  builder.box("matte", shade(mud, 1.15), [1.1, 0.03, 3.2], [0, 0.015, 2.3]);
  addPalm(builder, [-3.4, 0, -4.3], 3.4);
  addPalm(builder, [2.6, 0, -4.9], 3.0);
  if (builder.isFar) {
    return;
  }
  addFern(builder, [-4.2, 0, 1.0], 1.2);
  addFern(builder, [3.9, 0, 0.6], 1.0);
  addFern(builder, [-0.6, 0, -4.7], 1.1);
  addFern(builder, [4.4, 0, -2.6], 0.9);
  /* Big round leaves of a giant taro by the path */
  [0.4, 2.0, 3.6, 5.0].forEach((turn, index) => {
    builder.bar(
      "matte",
      "#5f8f3a",
      [-1.6, 0, 1.6],
      [-1.6 + Math.sin(turn) * 0.3, 0.75, 1.6 + Math.cos(turn) * 0.3],
      0.04,
      4,
    );
    builder.add(
      "matte",
      index % 2 === 0 ? brightLeaf : jungleLeaf,
      new SphereGeometry(0.34, 8, 4),
      {
        at: [-1.6 + Math.sin(turn) * 0.45, 0.8, 1.6 + Math.cos(turn) * 0.45],
        rotation: [0.5, turn, 0],
        scale: [1, 0.08, 1.3],
      },
    );
  });
  /* A carved post showing how high the river rose in the rainy season */
  builder.box("matte", palette.darkTimber, [0.16, 1.6, 0.16], [1.5, 0.8, -1.2]);
  [0.4, 0.8, 1.2].forEach((height, index) => {
    builder.box(
      "paint",
      ["#3a9fb0", "#2f7fa0", "#1f5f86"][index] ?? riverBlue,
      [0.18, 0.06, 0.18],
      [1.5, height, -1.2],
    );
  });
};

const buildRaft = (builder: AttractionBuilder) => {
  /* Built at the river's middle, as an offset from the bend's centre */
  const centreZ = -riverRadius;
  const deckY = waterLevel + 0.06;
  const poles = 8;
  for (let pole = 0; pole < poles; pole++) {
    const z = centreZ - 0.62 + pole * (1.24 / (poles - 1));
    builder.cylinder("matte", pole % 2 === 0 ? bamboo : shade(bamboo, 0.92), {
      radius: 0.09,
      length: 2.2,
      at: [0, deckY, z],
      axis: "x",
      segments: 10,
    });
  }
  /* Cross-poles lashed on with vine */
  [-0.85, 0, 0.85].forEach((x) => {
    builder.cylinder("matte", bambooDark, {
      radius: 0.06,
      length: 1.4,
      at: [x, deckY + 0.11, centreZ],
      axis: "z",
      segments: 8,
    });
    [-0.5, 0.5].forEach((across) => {
      builder.box(
        "matte",
        lashing,
        [0.14, 0.06, 0.24],
        [x, deckY + 0.1, centreZ + across],
      );
    });
  });
  /* A little hut at the back with a leaf-thatch roof */
  const hutX = -0.55;
  [-0.45, 0.45].forEach((across) => {
    [hutX - 0.4, hutX + 0.4].forEach((x) => {
      builder.cylinder("matte", bambooDark, {
        radius: 0.04,
        length: 0.95,
        at: [x, deckY + 0.55, centreZ + across],
        segments: 6,
      });
    });
  });
  [1, -1].forEach((side) => {
    builder.box(
      "matte",
      side === 1 ? thatch : shade(thatch, 0.9),
      [1.05, 0.06, 0.78],
      [hutX, deckY + 1.18, centreZ + side * 0.3],
      [side * 0.6, 0, 0],
    );
    /* Fringe of thatch hanging from the eaves */
    builder.box(
      "matte",
      shade(thatch, 0.8),
      [1.05, 0.12, 0.03],
      [hutX, deckY + 0.93, centreZ + side * 0.62],
    );
  });
  builder.cylinder("matte", bambooDark, {
    radius: 0.05,
    length: 1.15,
    at: [hutX, deckY + 1.43, centreZ],
    axis: "x",
    segments: 8,
  });
  /* A bench seat and a woven mat inside the hut */
  builder.box(
    "matte",
    "#c87c4a",
    [0.7, 0.02, 0.6],
    [hutX, deckY + 0.13, centreZ],
  );
  [0.2, 0.4].forEach((share) => {
    builder.box(
      "matte",
      "#e0b25a",
      [0.7, 0.025, 0.06],
      [hutX, deckY + 0.135, centreZ - 0.3 + share * 0.75],
    );
  });
  /* Paddles resting across the front, a water jar and a flag */
  [-0.35, 0.35].forEach((across) => {
    builder.bar(
      "matte",
      palette.paleTimber,
      [0.2, deckY + 0.15, centreZ + across],
      [1.05, deckY + 0.15, centreZ + across * 1.4],
      0.04,
      5,
    );
    builder.box(
      "matte",
      palette.paleTimber,
      [0.36, 0.03, 0.16],
      [1.2, deckY + 0.15, centreZ + across * 1.5],
    );
  });
  builder.lathe(
    "matte",
    "#b5653a",
    [
      [0, 0],
      [0.13, 0.02],
      [0.17, 0.14],
      [0.12, 0.27],
      [0.07, 0.31],
      [0.08, 0.35],
    ],
    [0.45, deckY + 0.1, centreZ - 0.38],
    "y",
    12,
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.03,
    length: 1.2,
    at: [0.8, deckY + 0.7, centreZ - 0.5],
    segments: 6,
  });
  builder.box(
    "paint",
    "#e8742f",
    [0.32, 0.2, 0.01],
    [0.95, deckY + 1.18, centreZ - 0.5],
  );
};

/** The raft standing still, for far away. */
const buildStillRaft = (builder: AttractionBuilder) => {
  const { x, z } = pointOnRiver(0);
  builder.box("matte", bamboo, [2.2, 0.18, 1.3], [x, waterLevel + 0.06, z]);
  builder.box(
    "matte",
    thatch,
    [1.0, 0.5, 1.2],
    [x - 0.55, waterLevel + 1.0, z],
  );
};

/** The moored dugout canoe, turned to lie along the river. */
const buildCanoe = (builder: AttractionBuilder) => {
  const turn = canoeAngle;
  const along = (x: number, y: number, z: number): Triple => [
    x * Math.cos(turn) + z * Math.sin(turn),
    y,
    -x * Math.sin(turn) + z * Math.cos(turn),
  ];
  builder.add(
    "matte",
    "#6b4527",
    new LatheGeometry(
      [
        [0, -0.75],
        [0.12, -0.6],
        [0.2, -0.3],
        [0.22, 0],
        [0.2, 0.3],
        [0.12, 0.6],
        [0, 0.75],
      ].map(([radius, length]) => new Vector2(radius, length)),
      builder.segments(10),
    )
      .rotateZ(-Math.PI / 2)
      .scale(1, 0.8, 1),
    { at: along(0, 0.08, 0), rotation: [0, turn, 0] },
  );
  builder.box("matte", "#3f2a18", [1.1, 0.02, 0.26], along(0, 0.2, 0), [
    0,
    turn,
    0,
  ]);
  builder.bar(
    "matte",
    palette.paleTimber,
    along(-0.3, 0.24, -0.2),
    along(0.5, 0.3, 0.25),
    0.035,
    5,
  );
  builder.box("matte", "#c9a86a", [0.06, 0.03, 0.4], along(0.1, 0.22, 0), [
    0,
    turn,
    0,
  ]);
};

/** A pink river dolphin, hidden under the water until someone comes. */
const buildDolphin = (builder: AttractionBuilder) => {
  builder.sphere("paint", dolphinPink, 0.22, [0, 0, 0], [1, 1, 1.9], 12);
  builder.sphere(
    "paint",
    shade(dolphinPink, 1.08),
    0.15,
    [0, 0.03, 0.42],
    [1, 0.95, 1],
    10,
  );
  builder.cylinder("paint", shade(dolphinPink, 0.95), {
    radius: 0.05,
    radiusEnd: 0.035,
    length: 0.28,
    at: [0, 0.0, 0.66],
    axis: "z",
    segments: 8,
  });
  builder.box(
    "paint",
    shade(dolphinPink, 0.88),
    [0.06, 0.12, 0.2],
    [0, 0.22, -0.05],
    [-0.4, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [side * 0.12, 0.08, 0.5],
      [1, 1, 1],
      6,
    );
    builder.box(
      "paint",
      shade(dolphinPink, 0.88),
      [0.18, 0.03, 0.1],
      [side * 0.22, -0.08, 0.15],
      [0, 0, side * 0.4],
    );
  });
  builder.box(
    "paint",
    shade(dolphinPink, 0.88),
    [0.36, 0.03, 0.12],
    [0, 0, -0.44],
  );
};

const raftSeat: Triple = [0.35, waterLevel + 0.2, -riverRadius];
const jettyEnd = { x: 0, z: -1.0 };

const dolphinSpot = pointOnRiver(dolphinAngle);
const canoeSpot = pointOnRiver(canoeAngle);

export const riverRaftModel: CuriosityModel = {
  kind: "river-raft",
  islandId: "jungle-reach",
  name: "River Raft",
  fact: "Rain falls on the rainforest nearly every day. It trickles into streams, and the streams join to make big rivers that flow downhill to the sea. The water then evaporates, forms clouds and falls as rain again: that is the water cycle. The Amazon carries more water than any other river on Earth.",
  curriculumLink:
    "Geography, Key Stage 2: describe and understand key aspects of physical geography, including rivers and the water cycle.",
  footprint: 6.2,
  setting: "inland",
  signSpot: { x: 2.2, z: 4.4 },
  build: (builder) => {
    buildRiver(builder);
    buildJetty(builder);
    buildBanks(builder);
    if (builder.isFar) {
      buildStillRaft(builder);
    }
    addSignBoard(builder, [2.2, 0, 4.4], signColour);
  },
  moving: [
    {
      name: "raft",
      pivot: bendPivot,
      build: buildRaft,
      motion: raftMotion,
    },
    {
      name: "canoe",
      pivot: [canoeSpot.x, waterLevel - 0.06, canoeSpot.z],
      build: buildCanoe,
      motion: { kind: "bob", height: 0.04, period: 2.6 },
    },
    {
      name: "river dolphin",
      pivot: [dolphinSpot.x, waterLevel - 0.35, dolphinSpot.z],
      build: buildDolphin,
      motion: { kind: "rise", reach: 6, height: 0.45, period: 1.8 },
    },
  ],
  blockers: [
    ...Array.from({ length: 13 }, (_, index): LocalBlocker => {
      const angle = -riverSpread + (index / 12) * riverSpread * 2;
      return { ...pointOnRiver(angle), radius: riverHalfWidth - 0.05 };
    }),
    { x: -3.4, z: -4.3, radius: 0.35 },
    { x: 2.6, z: -4.9, radius: 0.35 },
    { x: 1.5, z: -1.2, radius: 0.2 },
  ],
  decks: [
    buildFlatDeck(
      {
        minX: jetty.minX,
        maxX: jetty.maxX,
        minZ: jetty.minZ,
        maxZ: jetty.maxZ,
      },
      jetty.height,
    ),
  ],
  rides: [
    {
      id: "raft",
      name: "the river raft",
      start: jettyEnd,
      reach: 0.5,
      seconds: raftPeriod,
      finish: { x: -1.05, z: 0.1 },
      follow: (progress, seconds) => {
        const pose = findMotionPose(raftMotion, seconds);
        const [x, y, z] = moveWithPose(bendPivot, raftSeat, pose);
        const share = Math.min(1, progress * 12, (1 - progress) * 12);
        const from = { x: jettyEnd.x, y: jetty.height, z: jettyEnd.z };
        return {
          x: from.x + (x - from.x) * share,
          y: from.y + (y - from.y) * share,
          z: from.z + (z - from.z) * share,
          heading: Math.PI / 2 + pose.rotation[1],
        };
      },
    },
  ],
  play: {
    label: "Paddle the raft",
    news: "Splish, splosh! You paddled down the river past the reeds, and a pink river dolphin popped up to say hello.",
  },
};
