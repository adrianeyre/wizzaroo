import { CylinderGeometry, LatheGeometry, TorusGeometry, Vector2 } from "three";
import {
  addSignBoard,
  addTree,
  buildFlatDeck,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const limestone = "#d9cfbd";
const limestoneShadow = "#bfb39d";
const marble = "#ece6da";
const skeneOchre = "#c98f5a";
const roofTerracotta = "#b55a35";
const doorBlue = "#2f4f7a";
const maskGold = "#e2b84a";
const maskBlue = "#4a6fa5";
const maskWhite = "#f3eee4";
const darkHole = "#1f1a18";
const olive = "#6f7d3c";
const signColour = "#2f4f7a";
const ashPad = "#5b4a42";

/* The seats curve round the west of a round dancing floor; the stage is east. */
const orchestra = { x: 0.5, z: -0.3, radius: 1.6 };
const tierInner = 1.7;
const tierDepth = 0.55;
const tierRise = 0.3;
const tiers = 4;
const stage = { minX: 1.95, maxX: 2.95, minZ: -2.0, maxZ: 1.4, height: 0.6 };
const skene = { x: 3.25, minZ: -2.4, maxZ: 2.0, height: 2.7, thick: 0.5 };
const maskY = 2.15;

/** A half-ring solid on the seats' side, from one radius to another. */
const halfRing = (
  inner: number,
  outer: number,
  bottom: number,
  top: number,
  segments: number,
) =>
  new LatheGeometry(
    [
      new Vector2(inner, bottom),
      new Vector2(outer, bottom),
      new Vector2(outer, top),
      new Vector2(inner, top),
      new Vector2(inner, bottom),
    ],
    segments,
    Math.PI,
    Math.PI,
  );

/** The tiers of seats, each a step up, with aisles and cushioned lips. */
const buildSeats = (builder: AttractionBuilder) => {
  const segments = builder.isFar ? 6 : 24;
  const at: Triple = [orchestra.x, 0, orchestra.z];
  for (let tier = 0; tier < tiers; tier++) {
    const inner = tierInner + tier * tierDepth;
    builder.add(
      "matte",
      tier % 2 === 0 ? limestone : shade(limestone, 0.95),
      halfRing(inner, inner + tierDepth, 0, tierRise * (tier + 1), segments),
      { at },
    );
    if (builder.isFar) {
      continue;
    }
    /* The seat's rounded front edge, and a shadow line under it */
    builder.add(
      "matte",
      marble,
      halfRing(
        inner - 0.04,
        inner + 0.12,
        tierRise * (tier + 1) - 0.06,
        tierRise * (tier + 1) + 0.02,
        segments,
      ),
      { at },
    );
    builder.add(
      "matte",
      limestoneShadow,
      halfRing(
        inner - 0.02,
        inner,
        tierRise * tier + 0.02,
        tierRise * (tier + 1) - 0.08,
        segments,
      ),
      { at },
    );
  }
  if (builder.isFar) {
    return;
  }
  /* The open ends of the tiers, stepped in dressed stone */
  [-1, 1].forEach((side) => {
    for (let tier = 0; tier < tiers; tier++) {
      const height = tierRise * (tier + 1);
      builder.box(
        "matte",
        limestoneShadow,
        [0.06, height, tierDepth],
        [
          orchestra.x + 0.03,
          height / 2,
          orchestra.z + side * (tierInner + tierDepth * (tier + 0.5)),
        ],
      );
    }
  });
  /* Three aisles of half-steps climbing the seats */
  [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75].forEach((angle) => {
    for (let tier = 0; tier < tiers; tier++) {
      const radius = tierInner + tier * tierDepth + 0.14;
      builder.box(
        "matte",
        marble,
        [0.5, tierRise * (tier + 0.5), 0.28],
        [
          orchestra.x + Math.sin(angle) * radius,
          (tierRise * (tier + 0.5)) / 2,
          orchestra.z + Math.cos(angle) * radius,
        ],
        [0, angle, 0],
      );
    }
  });
  /* A back wall behind the top row */
  builder.add(
    "matte",
    limestoneShadow,
    halfRing(
      tierInner + tiers * tierDepth,
      tierInner + tiers * tierDepth + 0.12,
      0,
      tierRise * tiers + 0.35,
      segments,
    ),
    { at },
  );
};

/** The round dancing floor with its altar in the middle. */
const buildOrchestra = (builder: AttractionBuilder) => {
  builder.cylinder("matte", marble, {
    radius: orchestra.radius,
    length: 0.05,
    at: [orchestra.x, 0.025, orchestra.z],
    segments: 32,
  });
  if (builder.isFar) {
    return;
  }
  builder.add(
    "matte",
    limestoneShadow,
    new TorusGeometry(orchestra.radius, 0.04, 4, 40),
    {
      at: [orchestra.x, 0.05, orchestra.z],
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  builder.add("matte", limestoneShadow, new TorusGeometry(0.75, 0.025, 3, 28), {
    at: [orchestra.x, 0.05, orchestra.z],
    rotation: [Math.PI / 2, 0, 0],
  });
  /* The altar to Dionysus, god of the theatre, with a little flame */
  const altar: Triple = [orchestra.x, 0, orchestra.z];
  builder.lathe(
    "matte",
    marble,
    [
      [0, 0.05],
      [0.3, 0.05],
      [0.3, 0.14],
      [0.22, 0.2],
      [0.2, 0.55],
      [0.28, 0.62],
      [0.28, 0.7],
      [0, 0.7],
    ],
    altar,
    "y",
    16,
  );
  builder.cylinder("glow", "#ff9a2e", {
    radius: 0.09,
    radiusEnd: 0.005,
    length: 0.28,
    at: [altar[0], 0.84, altar[2]],
    segments: 8,
  });
};

/** A Doric column from its base to its capital. */
const addColumn = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  bottom: number,
  height: number,
) => {
  if (builder.isFar) {
    builder.cylinder("matte", marble, {
      radius: 0.13,
      length: height,
      at: [x, bottom + height / 2, z],
      segments: 8,
    });
    return;
  }
  builder.lathe(
    "matte",
    marble,
    [
      [0, bottom],
      [0.16, bottom],
      [0.16, bottom + 0.06],
      [0.12, bottom + 0.1],
      [0.1, bottom + height - 0.16],
      [0.15, bottom + height - 0.08],
      [0, bottom + height - 0.08],
    ],
    [x, 0, z],
    "y",
    14,
  );
  builder.box(
    "matte",
    marble,
    [0.36, 0.08, 0.36],
    [x, bottom + height - 0.04, z],
  );
};

/** The raised stage, the painted stage building and its columns. */
const buildStage = (builder: AttractionBuilder) => {
  const width = stage.maxX - stage.minX;
  const depth = stage.maxZ - stage.minZ;
  const middleZ = (stage.minZ + stage.maxZ) / 2;
  builder.box(
    "matte",
    limestone,
    [width, stage.height, depth],
    [(stage.minX + stage.maxX) / 2, stage.height / 2, middleZ],
  );
  /* The stage building (skene) behind, with a gabled roof */
  const skeneLength = skene.maxZ - skene.minZ;
  const skeneMiddle = (skene.minZ + skene.maxZ) / 2;
  builder.box(
    "matte",
    skeneOchre,
    [skene.thick, skene.height, skeneLength],
    [skene.x, skene.height / 2, skeneMiddle],
  );
  builder.box(
    "paint",
    roofTerracotta,
    [skene.thick + 0.3, 0.14, skeneLength + 0.3],
    [skene.x, skene.height + 0.07, skeneMiddle],
  );
  /* A low gabled roof, a triangle along the building */
  builder.add(
    "paint",
    roofTerracotta,
    new CylinderGeometry(1, 1, skeneLength + 0.3, 3),
    {
      at: [skene.x, skene.height + 0.14 + 0.45 / 3, skeneMiddle],
      rotation: [-Math.PI / 2, 0, 0],
      scale: [0.45 / 0.866, 1, 0.45 / 1.5],
    },
  );
  [-1.4, -0.2, 1.0].forEach((z) => {
    addColumn(builder, stage.maxX - 0.15, z, stage.height, 1.95);
  });
  if (builder.isFar) {
    return;
  }
  addColumn(builder, stage.maxX - 0.15, -2.0 + 0.2, stage.height, 1.95);
  addColumn(builder, stage.maxX - 0.15, 1.4 - 0.2, stage.height, 1.95);
  /* An architrave across the column tops */
  builder.box(
    "matte",
    marble,
    [0.3, 0.18, depth],
    [stage.maxX - 0.15, stage.height + 2.04, middleZ],
  );
  builder.box(
    "paint",
    doorBlue,
    [0.31, 0.06, depth],
    [stage.maxX - 0.15, stage.height + 2.0, middleZ],
  );
  /* Stage front: a frieze of little panels */
  for (let panel = 0; panel < 6; panel++) {
    const z = stage.minZ + 0.3 + panel * ((depth - 0.6) / 5);
    builder.box(
      "matte",
      limestoneShadow,
      [0.03, 0.36, 0.4],
      [stage.minX - 0.01, stage.height / 2, z],
    );
  }
  builder.box(
    "matte",
    marble,
    [width + 0.1, 0.06, depth + 0.1],
    [(stage.minX + stage.maxX) / 2, stage.height + 0.03, middleZ],
  );
  /* Three doors in the skene, the middle one grandest */
  [
    { z: -1.4, width: 0.6, height: 1.3 },
    { z: -0.2, width: 0.8, height: 1.6 },
    { z: 1.0, width: 0.6, height: 1.3 },
  ].forEach(({ z, width: doorWidth, height }) => {
    const face = skene.x - skene.thick / 2;
    builder.box(
      "paint",
      doorBlue,
      [0.04, height, doorWidth],
      [face - 0.01, stage.height + height / 2, z],
    );
    builder.box(
      "matte",
      marble,
      [0.06, 0.12, doorWidth + 0.2],
      [face - 0.02, stage.height + height + 0.06, z],
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "matte",
        marble,
        [0.06, height, 0.1],
        [
          face - 0.02,
          stage.height + height / 2,
          z + side * (doorWidth / 2 + 0.05),
        ],
      );
    });
    builder.sphere(
      "metal",
      maskGold,
      0.035,
      [face - 0.05, stage.height + height * 0.5, z + doorWidth * 0.2],
      [1, 1, 1],
      6,
    );
  });
  /* A painted Greek key band along the top of the skene */
  builder.box(
    "paint",
    doorBlue,
    [0.02, 0.16, skeneLength],
    [skene.x - skene.thick / 2 - 0.01, skene.height - 0.25, skeneMiddle],
  );
  for (let key = 0; key < 14; key++) {
    const z = skene.minZ + 0.2 + key * ((skeneLength - 0.4) / 13);
    builder.box(
      "paint",
      maskWhite,
      [0.025, 0.1, 0.05],
      [skene.x - skene.thick / 2 - 0.015, skene.height - 0.25, z],
    );
  }
  /* A lyre resting on the stage */
  const lyre: Triple = [stage.minX + 0.45, stage.height + 0.05, 0.6];
  builder.box(
    "paint",
    "#8a5a35",
    [0.06, 0.12, 0.34],
    [lyre[0], lyre[1] + 0.06, lyre[2]],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#8a5a35",
      [lyre[0], lyre[1] + 0.1, lyre[2] + side * 0.14],
      [lyre[0], lyre[1] + 0.55, lyre[2] + side * 0.2],
      0.04,
      5,
    );
  });
  builder.box(
    "paint",
    "#8a5a35",
    [0.05, 0.04, 0.46],
    [lyre[0], lyre[1] + 0.55, lyre[2]],
  );
  for (let string = 0; string < 5; string++) {
    builder.box(
      "metal",
      maskGold,
      [0.01, 0.42, 0.01],
      [lyre[0], lyre[1] + 0.33, lyre[2] - 0.1 + string * 0.05],
    );
  }
};

/** Olive trees, amphorae and a bench for latecomers. */
const buildGrounds = (builder: AttractionBuilder) => {
  addTree(builder, [3.6, 0, 3.2], 0.75, olive);
  if (builder.isFar) {
    return;
  }
  [
    [3.9, 2.6],
    [4.2, 2.2],
  ].forEach(([x, z], index) => {
    builder.lathe(
      "paint",
      index === 0 ? "#c0703e" : "#a85d34",
      [
        [0, 0],
        [0.08, 0],
        [0.2, 0.3],
        [0.2, 0.45],
        [0.08, 0.62],
        [0.07, 0.72],
        [0.11, 0.75],
      ],
      [x, 0, z],
      "y",
      14,
    );
  });
};

/**
 * A mask on a peg, facing west over the seats: comedy smiles, tragedy
 * frowns. `across` runs along z and `out` is towards the audience (-x).
 */
const buildMask = (builder: AttractionBuilder, isComedy: boolean) => {
  const spot = (across: number, y: number, out: number): Triple => [
    -out,
    y,
    across,
  ];
  const face = isComedy ? maskGold : maskBlue;
  builder.sphere("paint", face, 0.3, spot(0, 0, 0), [0.35, 1, 0.85], 16);
  builder.sphere(
    "paint",
    maskWhite,
    0.22,
    spot(0, 0.02, 0.04),
    [0.3, 1, 0.85],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      darkHole,
      0.055,
      spot(side * 0.1, 0.07, 0.1),
      [0.4, isComedy ? 0.7 : 1, 1.2],
      8,
    );
    /* Eyebrows: raised and happy, or slanting and sad */
    builder.box(
      "paint",
      darkHole,
      [0.02, 0.02, 0.11],
      spot(side * 0.1, 0.15, 0.1),
      [side * (isComedy ? 0.35 : -0.35), 0, 0],
    );
  });
  /* The mouth: a smile curving up, or a frown curving down */
  builder.add(
    "paint",
    darkHole,
    new TorusGeometry(0.09, 0.025, 4, 10, Math.PI),
    {
      at: spot(0, isComedy ? -0.08 : -0.15, 0.1),
      rotation: [isComedy ? Math.PI : 0, Math.PI / 2, 0],
    },
  );
  /* A ribbon hanging from one side */
  builder.cylinder("paint", isComedy ? "#c8323a" : maskWhite, {
    radius: 0.03,
    length: 0.2,
    at: spot(isComedy ? 0.2 : -0.2, -0.2, 0),
    segments: 6,
  });
};

/* The masks hang on the skene's face, looking out over the seats. */
const buildComedyMask = (builder: AttractionBuilder) => {
  buildMask(builder, true);
};
const buildTragedyMask = (builder: AttractionBuilder) => {
  buildMask(builder, false);
};

/** Each tier is a low step up from the one in front of it. */
const seatsDeck: Deck = ({ x, z }) => {
  const dx = x - orchestra.x;
  const dz = z - orchestra.z;
  const radius = Math.hypot(dx, dz);
  if (dx > 0 || radius < tierInner || radius >= tierInner + tiers * tierDepth) {
    return undefined;
  }
  const tier = Math.floor((radius - tierInner) / tierDepth);
  return { height: tierRise * (tier + 1), kind: "ground" };
};

export const greekTheatreModel: CuriosityModel = {
  kind: "greek-theatre",
  islandId: "ember-isle",
  name: "Greek Theatre",
  fact: "The ancient Greeks invented theatre. Thousands of people sat on stone steps curved round a stage, and the shape carried the actors' voices right to the back row. Actors wore masks: a smiling one for comedy and a sad one for tragedy. We still use the Greek words theatre, drama and chorus today.",
  curriculumLink:
    "History, Key Stage 2: Ancient Greece. A study of Greek life and achievements and their influence on the western world.",
  footprint: 5.5,
  setting: "inland",
  padColour: ashPad,
  signSpot: { x: 1.9, z: 3.7 },
  build: (builder) => {
    buildOrchestra(builder);
    buildSeats(builder);
    buildStage(builder);
    buildGrounds(builder);
    if (builder.isFar) {
      [-0.75, 0.35].forEach((z) => {
        builder.box(
          "paint",
          z < 0 ? maskGold : maskBlue,
          [0.1, 0.5, 0.45],
          [skene.x - skene.thick / 2 - 0.05, maskY, z],
        );
      });
    } else {
      [-0.75, 0.35].forEach((z) => {
        builder.cylinder("metal", maskGold, {
          radius: 0.03,
          length: 0.2,
          at: [skene.x - skene.thick / 2 - 0.1, maskY + 0.25, z],
          axis: "x",
          segments: 6,
        });
      });
    }
    addSignBoard(builder, [1.9, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "comedy mask",
      pivot: [skene.x - skene.thick / 2 - 0.14, maskY, -0.75],
      build: buildComedyMask,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.35,
        period: 1.1,
      },
    },
    {
      name: "tragedy mask",
      pivot: [skene.x - skene.thick / 2 - 0.14, maskY, 0.35],
      build: buildTragedyMask,
      motion: {
        kind: "nod",
        axis: "x",
        reach: 7,
        amplitude: 0.3,
        period: 1.6,
        phase: 1.5,
      },
    },
  ],
  decks: [
    seatsDeck,
    buildFlatDeck(
      {
        minX: stage.minX,
        maxX: skene.x - skene.thick / 2,
        minZ: stage.minZ,
        maxZ: stage.maxZ,
      },
      stage.height,
      "ground",
    ),
  ],
  blockers: [
    { x: orchestra.x, z: orchestra.z, radius: 0.35 },
    ...[-1.8, -1.4, -0.2, 1.0, 1.2].map((z) => ({
      x: stage.maxX - 0.15,
      z,
      radius: 0.2,
    })),
    ...Array.from({ length: 10 }, (_, index) => ({
      x: skene.x,
      z: skene.minZ + ((skene.maxZ - skene.minZ) * index) / 9,
      radius: 0.35,
    })),
    { x: 3.6, z: 3.2, radius: 0.3 },
    { x: 4.05, z: 2.4, radius: 0.4 },
  ] satisfies LocalBlocker[],
  tune: [64, 67, 69, 71, 69, 67, 64, 62, 64],
  play: {
    label: "Take a bow",
    news: "You stepped onto the stage and bowed low. The stone seats carried the applause all round: clap, clap, CLAP!",
    tune: [72, 76, 79, 84],
  },
};
