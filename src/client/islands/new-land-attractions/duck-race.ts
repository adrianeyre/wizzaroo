import { ConeGeometry, TorusGeometry } from "three";
import {
  addLampPost,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalPoint,
  type LocalSpot,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import {
  addBunting,
  addFlowerClump,
  buildVillager,
  meadowColours,
} from "./village-fete-parts.js";

/*
 * The village duck race: a millstream running round in a ring past a
 * little island with a weeping willow, a waterwheel turning in the
 * stream, a wooden chute the yellow ducks are tipped down at the
 * start, two plank bridges, a chequered finishing arch, and a table
 * with the winner's silver cup.
 */

const duckYellow = "#f6cf2a";
const beakOrange = "#f08a1c";
const brookWater = "#4d9fc0";
const brookBed = "#5a6b4a";
const kerbStone = "#c2b9a6";
const plank = "#b0814f";
const darkPlank = "#7a5534";
const chequerBlack = "#202124";
const willowGreen = "#8bbf4a";
const millWhite = "#f1ebde";
const signColour = "#2f74b5";

/* The brook */

const brook = { x: 0, z: -1.0, inner: 2.4, outer: 3.8 };
const brookWaterTop = 0.08;
const duckRadius = 2.95;

const atBrook = (angle: number, radius: number): LocalPoint => ({
  x: brook.x + Math.sin(angle) * radius,
  z: brook.z + Math.cos(angle) * radius,
});

const buildBrook = (builder: AttractionBuilder) => {
  const segments = builder.segments(48, 24);
  const centre: Triple = [brook.x, 0, brook.z];
  builder.lathe(
    "matte",
    brookBed,
    [
      [brook.inner, 0.03],
      [brook.outer, 0.03],
    ],
    centre,
    "y",
    segments,
  );
  builder.lathe(
    "water",
    brookWater,
    [
      [brook.outer, brookWaterTop],
      [brook.inner, brookWaterTop],
    ],
    centre,
    "y",
    segments,
  );
  /* Low stone kerbs on both banks */
  [brook.inner - 0.1, brook.outer + 0.1].forEach((radius) => {
    builder.lathe(
      "matte",
      kerbStone,
      [
        [radius + 0.12, 0],
        [radius + 0.12, 0.13],
        [radius - 0.12, 0.13],
        [radius - 0.12, 0],
      ],
      centre,
      "y",
      segments,
    );
  });
  /* The island in the middle, a little raised and grassy */
  builder.lathe(
    "matte",
    meadowColours.meadow,
    [
      [0, 0.16],
      [brook.inner - 0.6, 0.15],
      [brook.inner - 0.22, 0.04],
    ],
    centre,
    "y",
    builder.segments(32, 16),
  );
  if (builder.isFar) {
    return;
  }
  /* Lily pads and reeds along the brook */
  [0.6, 1.6, 3.4, 4.3, 5.4].forEach((angle, index) => {
    const { x, z } = atBrook(
      angle,
      index % 2 === 0 ? brook.outer - 0.25 : brook.inner + 0.25,
    );
    builder.cylinder("matte", "#4f8a3a", {
      radius: 0.2,
      length: 0.015,
      at: [x, brookWaterTop + 0.01, z],
      segments: 10,
    });
    if (index % 2 === 0) {
      builder.sphere(
        "matte",
        palette.white,
        0.06,
        [x + 0.05, brookWaterTop + 0.05, z],
        [1, 0.6, 1],
        6,
      );
    }
  });
  [1.1, 2.0, 3.9, 5.0].forEach((angle) => {
    const { x, z } = atBrook(angle, brook.outer + 0.45);
    for (let reed = 0; reed < 3; reed++) {
      builder.add(
        "matte",
        reed === 1 ? "#6f9a42" : "#5a8a3a",
        new ConeGeometry(0.04, 0.6, 4),
        {
          at: [x + (reed - 1) * 0.1, 0.3, z + (reed % 2) * 0.08],
        },
      );
    }
    builder.cylinder("matte", "#6b4a2f", {
      radius: 0.03,
      length: 0.16,
      at: [x + 0.12, 0.62, z],
      segments: 6,
    });
  });
};

/* The willow on the island */

const buildWillow = (builder: AttractionBuilder) => {
  const { x, z } = brook;
  builder.cylinder("matte", "#6b5a44", {
    radius: 0.24,
    radiusEnd: 0.16,
    length: 2.2,
    at: [x, 1.25, z],
    segments: 10,
  });
  builder.sphere(
    "matte",
    willowGreen,
    1.3,
    [x, 2.9, z],
    [1.1, 0.7, 1.1],
    builder.isFar ? 8 : 12,
  );
  /* Long drooping fronds round the crown */
  const fronds = builder.isFar ? 6 : 14;
  for (let frond = 0; frond < fronds; frond++) {
    const angle = (frond / fronds) * Math.PI * 2;
    builder.add(
      "matte",
      frond % 2 === 0 ? willowGreen : shade(willowGreen, 0.86),
      new ConeGeometry(0.32, 2.0, 5).rotateX(Math.PI),
      {
        at: [x + Math.sin(angle) * 1.25, 2.2, z + Math.cos(angle) * 1.25],
        rotation: [Math.cos(angle) * 0.18, 0, -Math.sin(angle) * 0.18],
      },
    );
  }
};

/* Bridges */

interface PlankBridge {
  angle: number;
}

const bridges: readonly PlankBridge[] = [{ angle: 0 }, { angle: -Math.PI / 2 }];
const bridgeFrom = brook.inner - 0.55;
const bridgeTo = brook.outer + 0.55;
const bridgeHalfWidth = 0.7;
const bridgeTop = 0.3;

const toBridgeLocal = (point: LocalPoint, angle: number) => {
  const dx = point.x - brook.x;
  const dz = point.z - brook.z;
  return {
    along: dx * Math.sin(angle) + dz * Math.cos(angle),
    across: dx * Math.cos(angle) - dz * Math.sin(angle),
  };
};

const bridgeDeck: Deck = (point) =>
  bridges.some(({ angle }) => {
    const { along, across } = toBridgeLocal(point, angle);
    return (
      along >= bridgeFrom &&
      along <= bridgeTo &&
      Math.abs(across) <= bridgeHalfWidth - 0.1
    );
  })
    ? { height: bridgeTop, kind: "bridge" }
    : undefined;

const buildBridge = (builder: AttractionBuilder, { angle }: PlankBridge) => {
  const middle = atBrook(angle, (bridgeFrom + bridgeTo) / 2);
  const length = bridgeTo - bridgeFrom;
  builder.box(
    "matte",
    plank,
    [bridgeHalfWidth * 2, 0.08, length],
    [middle.x, bridgeTop - 0.04, middle.z],
    [0, angle, 0],
  );
  const across = { x: Math.cos(angle), z: -Math.sin(angle) };
  if (!builder.isFar) {
    const boards = Math.round(length / 0.3);
    for (let board = 1; board < boards; board++) {
      const spot = atBrook(angle, bridgeFrom + (length * board) / boards);
      builder.box(
        "matte",
        darkPlank,
        [bridgeHalfWidth * 2, 0.012, 0.03],
        [spot.x, bridgeTop + 0.002, spot.z],
        [0, angle, 0],
      );
    }
  }
  /* Handrails on posts, either side */
  [-1, 1].forEach((side) => {
    const offset = side * (bridgeHalfWidth - 0.05);
    const from = atBrook(angle, bridgeFrom + 0.1);
    const to = atBrook(angle, bridgeTo - 0.1);
    builder.bar(
      "paint",
      palette.white,
      [from.x + across.x * offset, bridgeTop + 0.8, from.z + across.z * offset],
      [to.x + across.x * offset, bridgeTop + 0.8, to.z + across.z * offset],
      0.07,
      6,
    );
    [0, 0.5, 1].forEach((share) => {
      const spot = atBrook(angle, bridgeFrom + 0.1 + (length - 0.2) * share);
      builder.box(
        "paint",
        palette.white,
        [0.09, bridgeTop + 0.82, 0.09],
        [
          spot.x + across.x * offset,
          (bridgeTop + 0.82) / 2,
          spot.z + across.z * offset,
        ],
        [0, angle, 0],
      );
    });
  });
};

/* The finishing arch over the front bridge */

const buildFinishArch = (builder: AttractionBuilder) => {
  const { angle } = bridges[0];
  const across = { x: Math.cos(angle), z: -Math.sin(angle) };
  const at = atBrook(angle, brook.outer + 0.3);
  const top = 2.5;
  [-1, 1].forEach((side) => {
    const x = at.x + across.x * side * 0.95;
    const z = at.z + across.z * side * 0.95;
    builder.cylinder("paint", palette.white, {
      radius: 0.07,
      length: top,
      at: [x, top / 2, z],
      segments: 8,
    });
    builder.sphere(
      "paint",
      meadowColours.poppy,
      0.1,
      [x, top + 0.05, z],
      [1, 1, 1],
      8,
    );
  });
  /* The chequered banner */
  const squares = builder.isFar ? 1 : 8;
  for (let square = 0; square < squares; square++) {
    for (let row = 0; row < (builder.isFar ? 1 : 2); row++) {
      const share = (square + 0.5) / squares - 0.5;
      builder.box(
        "matte",
        builder.isFar
          ? palette.white
          : (square + row) % 2 === 0
            ? chequerBlack
            : palette.white,
        [1.8 / squares, builder.isFar ? 0.5 : 0.25, 0.04],
        [
          at.x + across.x * share * 1.8,
          top - 0.2 - row * 0.25 - (builder.isFar ? -0.12 : 0),
          at.z + across.z * share * 1.8,
        ],
        [0, angle, 0],
      );
    }
  }
};

/* The start chute */

const chuteTowerAt = atBrook(-2.45, 5.3);
const chuteEnd = atBrook(-2.0, brook.outer - 0.3);
const platformHeight = 1.7;
const chuteFoot = 0.22;
const ladderFootAt = {
  x: chuteTowerAt.x - (chuteEnd.x - chuteTowerAt.x) * 0.35,
  z: chuteTowerAt.z - (chuteEnd.z - chuteTowerAt.z) * 0.35,
};

const findChuteSpot = (share: number): Triple => {
  const eased = 1 - (1 - share) ** 1.6;
  return [
    chuteTowerAt.x + (chuteEnd.x - chuteTowerAt.x) * share,
    platformHeight - 0.05 + (chuteFoot - platformHeight + 0.05) * eased,
    chuteTowerAt.z + (chuteEnd.z - chuteTowerAt.z) * share,
  ];
};

const buildChute = (builder: AttractionBuilder) => {
  const { x, z } = chuteTowerAt;
  /* The tower: four legs, a deck with a rail and a striped roof */
  [-0.45, 0.45].forEach((dx) => {
    [-0.45, 0.45].forEach((dz) => {
      builder.box(
        "paint",
        palette.white,
        [0.1, platformHeight + 1.1, 0.1],
        [x + dx, (platformHeight + 1.1) / 2, z + dz],
      );
    });
  });
  builder.box("matte", plank, [1.1, 0.1, 1.1], [x, platformHeight, z]);
  builder.add(
    "paint",
    meadowColours.poppy,
    new ConeGeometry(0.95, 0.55, 4).rotateY(Math.PI / 4),
    { at: [x, platformHeight + 1.35, z] },
  );
  if (!builder.isFar) {
    builder.add(
      "paint",
      palette.white,
      new ConeGeometry(0.97, 0.18, 4).rotateY(Math.PI / 4),
      { at: [x, platformHeight + 1.17, z] },
    );
    [-0.45, 0.45].forEach((dx) => {
      builder.bar(
        "paint",
        palette.white,
        [x + dx, platformHeight + 0.55, z - 0.45],
        [x + dx, platformHeight + 0.55, z + 0.45],
        0.05,
        4,
      );
    });
    /* A bucket of ducks waiting to go */
    builder.cylinder("paint", meadowColours.cornflower, {
      radius: 0.18,
      radiusEnd: 0.22,
      length: 0.3,
      at: [x + 0.25, platformHeight + 0.2, z - 0.25],
      segments: 10,
    });
    [0, 1, 2].forEach((duck) => {
      builder.sphere(
        "paint",
        duckYellow,
        0.07,
        [
          x + 0.2 + duck * 0.06,
          platformHeight + 0.38,
          z - 0.25 + (duck % 2) * 0.06,
        ],
        [1, 1, 1],
        6,
      );
    });
  }
  /* The ladder up the back */
  const ladderTop = {
    x: x - (chuteEnd.x - x) * 0.1,
    z: z - (chuteEnd.z - z) * 0.1,
  };
  [-0.22, 0.22].forEach((side) => {
    const turn = Math.atan2(chuteEnd.x - x, chuteEnd.z - z);
    const ax = Math.cos(turn) * side;
    const az = -Math.sin(turn) * side;
    builder.bar(
      "paint",
      palette.white,
      [ladderFootAt.x + ax, 0, ladderFootAt.z + az],
      [ladderTop.x + ax, platformHeight + 0.5, ladderTop.z + az],
      0.06,
      6,
    );
  });
  const rungs = builder.isFar ? 2 : 6;
  for (let rung = 1; rung <= rungs; rung++) {
    const share = rung / (rungs + 1);
    const turn = Math.atan2(chuteEnd.x - x, chuteEnd.z - z);
    builder.box(
      "metal",
      palette.steel,
      [0.44, 0.04, 0.04],
      [
        ladderFootAt.x + (ladderTop.x - ladderFootAt.x) * share,
        (platformHeight + 0.5) * share,
        ladderFootAt.z + (ladderTop.z - ladderFootAt.z) * share,
      ],
      [0, turn, 0],
    );
  }
  /* The chute itself: a wooden trough on legs */
  const steps = builder.segments(10, 5);
  for (let step = 0; step < steps; step++) {
    const from = findChuteSpot(step / steps);
    const to = findChuteSpot((step + 1) / steps);
    const length = Math.hypot(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    );
    const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
    const pitch = Math.atan2(
      from[1] - to[1],
      Math.hypot(to[0] - from[0], to[2] - from[2]),
    );
    const middle: Triple = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ];
    builder.box(
      "paint",
      meadowColours.cornflower,
      [0.6, 0.05, length + 0.02],
      middle,
      [pitch, turn, 0],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        palette.white,
        [0.05, 0.2, length + 0.02],
        [
          middle[0] + Math.cos(turn) * side * 0.3,
          middle[1] + 0.08,
          middle[2] - Math.sin(turn) * side * 0.3,
        ],
        [pitch, turn, 0],
      );
    });
    if (step % 3 === 1) {
      builder.box(
        "paint",
        palette.white,
        [0.08, middle[1], 0.08],
        [middle[0], middle[1] / 2, middle[2]],
      );
    }
  }
};

/* The waterwheel and its mill hut */

const wheelAngle = Math.PI / 2;
const wheelSpot = atBrook(wheelAngle, brook.outer - 0.25);
const wheelAt: Triple = [wheelSpot.x, 0.75, wheelSpot.z];
const wheelRadius = 0.8;

const buildMill = (builder: AttractionBuilder) => {
  const hut = atBrook(wheelAngle, brook.outer + 1.3);
  builder.box("matte", millWhite, [1.4, 1.5, 1.8], [hut.x, 0.75, hut.z]);
  builder.add(
    "matte",
    meadowColours.thatch,
    new ConeGeometry(1.35, 0.9, 4).rotateY(Math.PI / 4).scale(0.85, 1, 1.05),
    { at: [hut.x, 1.95, hut.z] },
  );
  builder.box(
    "paint",
    darkPlank,
    [0.04, 0.95, 0.5],
    [hut.x + 0.71, 0.48, hut.z],
  );
  if (!builder.isFar) {
    builder.box(
      "glow",
      palette.warmLight,
      [0.04, 0.35, 0.35],
      [hut.x + 0.71, 1.0, hut.z + 0.6],
    );
    builder.box(
      "glass",
      palette.glass,
      [0.03, 0.35, 0.35],
      [hut.x - 0.25, 1.0, hut.z + 0.91],
    );
    /* Timber frame on the white walls */
    [-0.6, 0.6].forEach((dz) => {
      builder.box(
        "matte",
        darkPlank,
        [1.42, 0.06, 0.06],
        [hut.x, 1.45, hut.z + dz * 1.5],
      );
    });
    builder.box("matte", darkPlank, [1.42, 0.06, 1.82], [hut.x, 1.48, hut.z]);
  }
  /* The axle bearing on a post at the stream side */
  builder.box(
    "matte",
    darkPlank,
    [0.2, 0.9, 0.2],
    [wheelAt[0] + 0.32, 0.45, wheelAt[2]],
  );
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.06,
    length: 1.2,
    at: [wheelAt[0] + 0.7, wheelAt[1], wheelAt[2]],
    axis: "x",
    segments: 8,
  });
};

const buildWheel = (builder: AttractionBuilder) => {
  [-0.14, 0.14].forEach((side) => {
    builder.add(
      "paint",
      meadowColours.poppy,
      new TorusGeometry(wheelRadius, 0.04, 5, builder.segments(20, 10)).rotateY(
        Math.PI / 2,
      ),
      { at: [side, 0, 0] },
    );
  });
  builder.cylinder("paint", darkPlank, {
    radius: 0.14,
    length: 0.36,
    at: [0, 0, 0],
    axis: "x",
    segments: 10,
  });
  const paddles = builder.isFar ? 4 : 8;
  for (let paddle = 0; paddle < paddles; paddle++) {
    const angle = (paddle / paddles) * Math.PI * 2;
    builder.box(
      "matte",
      plank,
      [0.36, 0.04, wheelRadius * 2],
      [0, 0, 0],
      [angle, 0, 0],
    );
    builder.box(
      "matte",
      darkPlank,
      [0.34, 0.26, 0.05],
      [
        0,
        Math.sin(angle) * (wheelRadius - 0.1),
        Math.cos(angle) * (wheelRadius - 0.1),
      ],
      [angle, 0, 0],
    );
  }
};

/* The rubber ducks racing round */

const buildRubberDuck = (builder: AttractionBuilder) => {
  /* Each copy swims along the ring towards local -z */
  builder.sphere(
    "paint",
    duckYellow,
    0.14,
    [0, 0.08, 0.03],
    [0.9, 0.7, 1.15],
    10,
  );
  builder.sphere("paint", duckYellow, 0.09, [0, 0.22, -0.08], [1, 1, 1], 10);
  builder.add(
    "paint",
    beakOrange,
    new ConeGeometry(0.04, 0.09, 6).rotateX(-Math.PI / 2),
    {
      at: [0, 0.2, -0.19],
    },
  );
  builder.add(
    "paint",
    duckYellow,
    new ConeGeometry(0.05, 0.1, 5).rotateX(0.8),
    {
      at: [0, 0.14, 0.17],
    },
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.017,
      [side * 0.05, 0.25, -0.15],
      [1, 1, 1],
      5,
    );
  });
  builder.torus(
    "paint",
    meadowColours.poppy,
    0.065,
    0.018,
    [0, 0.16, -0.06],
    "y",
    10,
  );
};

/* The prize table */

const buildPrizes = (builder: AttractionBuilder) => {
  const [x, z] = [3.8, 4.4];
  builder.box("paint", palette.white, [1.6, 0.06, 0.8], [x, 0.78, z]);
  builder.box("matte", meadowColours.sky, [1.62, 0.4, 0.82], [x, 0.6, z]);
  [-0.7, 0.7].forEach((dx) => {
    [-0.32, 0.32].forEach((dz) => {
      builder.box("matte", darkPlank, [0.05, 0.4, 0.05], [x + dx, 0.2, z + dz]);
    });
  });
  /* The silver cup */
  builder.lathe(
    "metal",
    "#d9dde2",
    [
      [0, 0],
      [0.12, 0],
      [0.1, 0.04],
      [0.03, 0.08],
      [0.03, 0.18],
      [0.14, 0.24],
      [0.17, 0.42],
      [0, 0.42],
    ],
    [x, 0.81, z],
    "y",
    14,
  );
  if (!builder.isFar) {
    [-1, 1].forEach((side) => {
      builder.torus(
        "metal",
        "#d9dde2",
        0.06,
        0.012,
        [x + side * 0.19, 1.15, z],
        "z",
        10,
      );
    });
    /* Rosettes for second and third */
    [
      { rx: x - 0.5, colour: meadowColours.cornflower },
      { rx: x + 0.5, colour: meadowColours.poppy },
    ].forEach(({ rx, colour }) => {
      builder.cylinder("paint", colour, {
        radius: 0.1,
        length: 0.02,
        at: [rx, 0.82, z + 0.1],
        segments: 12,
      });
    });
    /* A chalk board of the runners */
    builder.box("matte", chequerBlack, [0.9, 0.6, 0.04], [x, 1.55, z - 0.42]);
    builder.box("matte", darkPlank, [1.0, 0.06, 0.06], [x, 1.88, z - 0.42]);
    for (let line = 0; line < 4; line++) {
      builder.box(
        "matte",
        palette.white,
        [0.5 - (line % 2) * 0.15, 0.03, 0.01],
        [x - 0.1, 1.72 - line * 0.11, z - 0.39],
      );
    }
    builder.box("matte", darkPlank, [0.05, 1.9, 0.05], [x, 0.95, z - 0.46]);
  }
};

/* The green round it */

const buildGrounds = (builder: AttractionBuilder) => {
  /* A gravel path from the sign to the front bridge */
  builder.box("matte", palette.path, [1.5, 0.025, 5.0], [0, 0.012, 5.8]);
  addLampPost(builder, [-1.1, 0, 6.4], 2.3);
  addTree(builder, [-6.2, 0, -4.0], 1.1);
  addTree(builder, [6.4, 0, -4.6], 1.05, "#4a9440");
  /* Straw bales for the spectators */
  [
    [-4.4, 3.6, 0.5],
    [-3.2, 4.6, 0.3],
    [5.8, 1.8, -0.4],
  ].forEach(([x, z, turn]) => {
    builder.box(
      "matte",
      meadowColours.thatch,
      [1.0, 0.45, 0.5],
      [x, 0.225, z],
      [0, turn, 0],
    );
    if (!builder.isFar) {
      [-0.25, 0.25].forEach((band) => {
        builder.box(
          "matte",
          "#9c7a3a",
          [0.02, 0.46, 0.52],
          [x + Math.cos(turn) * band, 0.225, z - Math.sin(turn) * band],
          [0, turn, 0],
        );
      });
    }
  });
  /* Bunting round the front, between the lamp and two poles */
  [
    [-5.2, 1.6],
    [5.2, 0.8],
  ].forEach(([x, z]) => {
    builder.cylinder("paint", palette.white, {
      radius: 0.05,
      length: 2.6,
      at: [x, 1.3, z],
      segments: 8,
    });
  });
  addBunting(
    builder,
    [-5.2, 2.5, 1.6],
    [-1.1, 2.3, 6.4],
    [duckYellow, meadowColours.sky, meadowColours.poppy, palette.white],
    0.3,
  );
  addBunting(
    builder,
    [5.2, 2.5, 0.8],
    [1.0, 2.5, 3.2],
    [duckYellow, meadowColours.rose, meadowColours.cornflower, palette.white],
    0.3,
  );
  if (!builder.isFar) {
    [
      [-6.4, 0.4],
      [6.6, 3.2],
      [2.6, -6.6],
      [-1.8, -6.8],
    ].forEach(([x, z], index) => {
      addFlowerClump(
        builder,
        [x, 0, z],
        index % 2 === 0
          ? [meadowColours.butter, palette.white]
          : [meadowColours.rose, meadowColours.cornflower],
        5,
        0.3,
      );
    });
  }
  addSignBoard(builder, [-2.8, 0, 7.4], signColour);
};

/* Moving parts beyond the ducks */

const splashAt: Triple = [chuteEnd.x, brookWaterTop, chuteEnd.z];

const buildSplash = (builder: AttractionBuilder) => {
  builder.cylinder("water", "#bfe6f5", {
    radius: 0.12,
    radiusEnd: 0.3,
    length: 1.0,
    at: [0, 0.5, 0],
    segments: 10,
    isOpen: true,
  });
  builder.sphere("water", "#d8f0fa", 0.2, [0, 1.0, 0], [1.4, 0.5, 1.4], 8);
};

const starterAt: Triple = [
  chuteTowerAt.x,
  platformHeight + 0.05,
  chuteTowerAt.z,
];

const buildStarterFlag = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.white, {
    radius: 0.025,
    length: 1.1,
    at: [0, 0.55, 0],
    segments: 6,
  });
  builder.box(
    "matte",
    meadowColours.poppy,
    [0.04, 0.32, 0.45],
    [0, 0.95, 0.23],
  );
  if (!builder.isFar) {
    builder.box("matte", palette.white, [0.045, 0.08, 0.45], [0, 0.95, 0.23]);
  }
};

const frogAt: Triple = [
  atBrook(0.6, brook.outer - 0.25).x,
  -0.08,
  atBrook(0.6, brook.outer - 0.25).z,
];

const buildFrog = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#5aa83a", 0.1, [0, 0.08, 0], [1.1, 0.7, 1.2], 10);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#5aa83a",
      0.04,
      [side * 0.05, 0.15, 0.06],
      [1, 1, 1],
      6,
    );
    builder.sphere(
      "paint",
      palette.black,
      0.02,
      [side * 0.05, 0.17, 0.08],
      [1, 1, 1],
      4,
    );
    builder.sphere(
      "matte",
      "#4a9030",
      0.04,
      [side * 0.1, 0.03, -0.05],
      [1, 0.5, 1.6],
      6,
    );
  });
};

/* Wanderers */

const buildSpectator = buildVillager({
  top: meadowColours.cornflower,
  legs: meadowColours.cream,
  hair: "#5a3a22",
  hat: meadowColours.thatch,
});

const buildMallard = (builder: AttractionBuilder) => {
  builder.sphere("matte", "#8a6a48", 0.13, [0, 0.12, 0], [0.9, 0.7, 1.4], 8);
  builder.sphere("matte", "#2e6b3a", 0.075, [0, 0.26, 0.14], [1, 1, 1.1], 8);
  builder.add(
    "matte",
    duckYellow,
    new ConeGeometry(0.025, 0.08, 4).rotateX(Math.PI / 2),
    {
      at: [0, 0.25, 0.24],
    },
  );
  [-0.05, 0.05].forEach((side) => {
    builder.bar(
      "matte",
      beakOrange,
      [side, 0.06, 0],
      [side, 0, 0.02],
      0.025,
      3,
    );
  });
};

/* The ride down the chute */

const chuteStart = {
  x: ladderFootAt.x - (chuteEnd.x - chuteTowerAt.x) * 0.2,
  z: ladderFootAt.z - (chuteEnd.z - chuteTowerAt.z) * 0.2,
};
const chuteFinish = atBrook(-2.0, brook.inner - 1.0);

const chuteRide = (progress: number): LocalSpot => {
  const heading = Math.atan2(
    chuteEnd.x - chuteTowerAt.x,
    chuteEnd.z - chuteTowerAt.z,
  );
  if (progress < 0.35) {
    /* Up the ladder */
    const share = progress / 0.35;
    return {
      x: chuteStart.x + (chuteTowerAt.x - chuteStart.x) * share,
      y: Math.min(platformHeight + 0.05, share * 1.15 * platformHeight),
      z: chuteStart.z + (chuteTowerAt.z - chuteStart.z) * share,
      heading,
    };
  }
  if (progress < 0.7) {
    /* Whoosh down the chute */
    const share = ((progress - 0.35) / 0.35) ** 1.4;
    const [x, y, z] = findChuteSpot(share);
    return { x, y: y + 0.05, z, heading };
  }
  /* Splash into the brook and wade across to the island */
  const share = (progress - 0.7) / 0.3;
  return {
    x: chuteEnd.x + (chuteFinish.x - chuteEnd.x) * share,
    y: Math.max(0.16 * share, chuteFoot * (1 - share * 3)),
    z: chuteEnd.z + (chuteFinish.z - chuteEnd.z) * share,
    heading,
  };
};

export const duckRaceModel: NewLandAttractionModel = {
  kind: "duck-race",
  islandId: "meadow-isle",
  name: "Duck Race",
  fact: "Rubber ducks float because they are hollow and full of air, which makes them light for their size. Things that are heavy for their size, like stones and coins, sink. Rubber and plastic make good bath toys because they are waterproof and bendy.",
  curriculumLink:
    "Science, Year 1: everyday materials. Describe the simple physical properties of everyday materials, such as which ones are waterproof, bendy or float.",
  footprint: 9.4,
  setting: "inland",
  signSpot: { x: -2.8, z: 8.4 },
  build: (builder) => {
    buildGrounds(builder);
    buildBrook(builder);
    buildWillow(builder);
    bridges.forEach((bridge) => {
      buildBridge(builder, bridge);
    });
    buildFinishArch(builder);
    buildChute(builder);
    buildMill(builder);
    buildPrizes(builder);
  },
  moving: [
    {
      name: "rubber-ducks",
      pivot: [brook.x, brookWaterTop - 0.02, brook.z],
      build: buildRubberDuck,
      motion: {
        kind: "orbit",
        axis: "y",
        radius: duckRadius,
        count: 6,
        speed: 0.32,
        isFacingAlong: true,
        bob: 0.03,
      },
    },
    {
      name: "waterwheel",
      pivot: wheelAt,
      build: buildWheel,
      motion: { kind: "whirl", axis: "x", idle: 0.5, speed: 3.2, reach: 5 },
    },
    {
      name: "splash",
      pivot: splashAt,
      build: buildSplash,
      motion: { kind: "splash", reach: 4, period: 1.4 },
    },
    {
      name: "starter-flag",
      pivot: starterAt,
      build: buildStarterFlag,
      motion: { kind: "nod", axis: "x", reach: 5, amplitude: 0.6, period: 0.8 },
    },
    {
      name: "frog",
      pivot: frogAt,
      build: buildFrog,
      motion: { kind: "rise", reach: 3, height: 0.2, period: 0.7 },
    },
  ],
  wanderers: [
    {
      name: "spectators",
      build: buildSpectator,
      count: 3,
      centre: { x: -4.6, z: 4.6 },
      radius: 1.6,
      speed: 0.35,
    },
    {
      name: "mallards",
      build: buildMallard,
      count: 2,
      centre: { x: 4.4, z: -5.8 },
      radius: 1.3,
      speed: 0.3,
    },
  ],
  decks: [bridgeDeck],
  rides: [
    {
      id: "duck-chute",
      name: "the duck chute",
      start: chuteStart,
      reach: 0.55,
      seconds: 8,
      finish: chuteFinish,
      follow: chuteRide,
    },
  ],
  tune: [72, 76, 79, 76, 72, 79, 84, 79, 76, 72],
  play: {
    label: "Start the duck race",
    news: "Splash! Down the chute tumbled the yellow ducks, round and round the brook they bobbed, and the duck with the red bow won the silver cup!",
  },
};
