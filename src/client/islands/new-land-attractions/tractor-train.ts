import { ConeGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import {
  addBench,
  addBush,
  addFence,
  addLampPost,
  addSignBoard,
  addTree,
  addWindow,
  findMotionPose,
  moveWithPose,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { NewLandAttractionModel } from "./new-land-attraction-kit.js";
import { addFlowerClump, meadowColours } from "./village-fete-parts.js";

const tractorRed = "#c8302a";
const tyreBlack = "#25272b";
const hubYellow = "#f2c12e";
const barrelColours = ["#2f6fc0", "#f2b51d", "#3f9a4a"];
const hayGold = "#e2c069";
const hayEnd = "#c9a24a";
const stationGreen = "#2f5d43";
const stationCream = "#efe2bf";
const trackBrown = "#a8916a";
const signColour = "#c8302a";

/* The track: a ring of farm track round a sheep paddock */
const ringCentre = { x: 0, z: -0.8 };
const ringRadius = 5.6;
const trackHalf = 0.6;

/* The train: a little tractor towing three barrel carriages, rigidly round the ring */
const trainPivot: Triple = [ringCentre.x, 0, ringCentre.z];
const trainMotion: Motion = {
  kind: "orbit",
  axis: "y",
  radius: ringRadius,
  count: 1,
  speed: -0.3,
  isFacingAlong: true,
};
const carriageGap = 1.45;
const carriageAngles = [1, 2, 3].map(
  (index) => (carriageGap * index + 0.15) / ringRadius,
);
const barrelSeat = 0.42;

/** Where something trailing `angle` behind the tractor sits, in the train's own frame. */
const trailing = (angle: number): Triple => [
  ringRadius * Math.cos(angle) - ringRadius,
  0,
  -ringRadius * Math.sin(angle),
];

/* The station halt at the front */
const platform = { minX: -2.2, maxX: 2.2, minZ: 5.55, maxZ: 6.55 };
const platformHeight = 0.3;
const rampLength = 1.0;
const boardAt = { x: 0, z: 5.8 };
const alightAt = { x: -1.7, z: 6.1 };

const paddockRadius = 3.0;
const windpumpAt: Triple = [1.3, 0, -2.0];
const tunnelAngle = Math.PI;
const signalAt: Triple = [2.6, platformHeight, 6.3];
const signAt = { x: -4.6, z: 7.3 };

const ringPoint = (angle: number, radius = ringRadius): Triple => [
  ringCentre.x + Math.sin(angle) * radius,
  0,
  ringCentre.z + Math.cos(angle) * radius,
];

const buildTrack = (builder: AttractionBuilder) => {
  const segments = builder.segments(64, 28);
  builder.add(
    "matte",
    trackBrown,
    new LatheGeometry(
      [
        new Vector2(ringRadius + trackHalf, 0.025),
        new Vector2(ringRadius - trackHalf, 0.025),
      ],
      segments,
    ),
    { at: [ringCentre.x, 0, ringCentre.z] },
  );
  if (builder.isFar) {
    return;
  }
  /* Two worn wheel ruts, and white marker posts round the outside */
  [-0.3, 0.3].forEach((offset) => {
    builder.add(
      "matte",
      shade(trackBrown, 0.8),
      new LatheGeometry(
        [
          new Vector2(ringRadius + offset + 0.1, 0.03),
          new Vector2(ringRadius + offset - 0.1, 0.03),
        ],
        segments,
      ),
      { at: [ringCentre.x, 0, ringCentre.z] },
    );
  });
  const markers = 14;
  for (let marker = 0; marker < markers; marker++) {
    const angle = (marker / markers) * Math.PI * 2 + 0.2;
    if (
      Math.abs(Math.cos(angle) - 1) < 0.15 ||
      Math.abs(angle - tunnelAngle) < 0.45
    ) {
      continue;
    }
    const [x, , z] = ringPoint(angle, ringRadius + trackHalf + 0.15);
    builder.box("paint", palette.white, [0.08, 0.4, 0.08], [x, 0.2, z]);
    builder.box("paint", tractorRed, [0.085, 0.07, 0.085], [x, 0.34, z]);
  }
};

const buildPaddock = (builder: AttractionBuilder) => {
  /* Post-and-rail fence round the sheep, with a gap at the front for a gate */
  if (builder.isFar) {
    return;
  }
  const sides = 18;
  for (let side = 0; side < sides; side++) {
    const from = (side / sides) * Math.PI * 2;
    const to = ((side + 1) / sides) * Math.PI * 2;
    if (Math.cos((from + to) / 2) > 0.97) {
      continue;
    }
    const [x0, , z0] = ringPoint(from, paddockRadius);
    const [x1, , z1] = ringPoint(to, paddockRadius);
    addFence(
      builder,
      { x: x0, z: z0 },
      { x: x1, z: z1 },
      {
        isPicket: false,
        colour: palette.paleTimber,
        height: 0.7,
        finish: "matte",
      },
    );
  }
  /* A stone water trough and a round bale for the sheep */
  builder.box("matte", palette.stone, [1.0, 0.35, 0.4], [-1.2, 0.18, -1.9]);
  builder.box("water", palette.water, [0.86, 0.02, 0.28], [-1.2, 0.33, -1.9]);
  builder.cylinder("matte", hayGold, {
    radius: 0.5,
    length: 0.8,
    at: [-1.4, 0.4, 0.4],
    segments: 16,
  });
  [0.2, 0.36].forEach((ring) => {
    builder.torus("matte", hayEnd, ring, 0.02, [-1.4, 0.81, 0.4], "y", 14);
  });
};

const buildWindpumpTower = (builder: AttractionBuilder) => {
  const [x, , z] = windpumpAt;
  const height = 3.4;
  const spread = 0.55;
  [0, 1, 2, 3].forEach((leg) => {
    const angle = (leg / 4) * Math.PI * 2 + Math.PI / 4;
    builder.bar(
      "metal",
      palette.steel,
      [x + Math.sin(angle) * spread, 0, z + Math.cos(angle) * spread],
      [x + Math.sin(angle) * 0.1, height, z + Math.cos(angle) * 0.1],
      0.06,
      builder.isFar ? 4 : 6,
    );
  });
  if (!builder.isFar) {
    [0.9, 1.8, 2.6].forEach((y) => {
      const reach = spread - (spread - 0.1) * (y / height);
      for (let side = 0; side < 4; side++) {
        const a = (side / 4) * Math.PI * 2 + Math.PI / 4;
        const b = ((side + 1) / 4) * Math.PI * 2 + Math.PI / 4;
        builder.bar(
          "metal",
          palette.steel,
          [x + Math.sin(a) * reach, y, z + Math.cos(a) * reach],
          [x + Math.sin(b) * reach, y, z + Math.cos(b) * reach],
          0.03,
          4,
        );
      }
    });
    /* The pump rod and a tank beside it */
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.03,
      length: height,
      at: [x, height / 2, z],
      segments: 6,
    });
    builder.cylinder("metal", "#8a9aa6", {
      radius: 0.45,
      length: 0.7,
      at: [x + 1.0, 0.35, z - 0.4],
      segments: 16,
    });
  }
  builder.box(
    "metal",
    palette.darkSteel,
    [0.24, 0.24, 0.4],
    [x, height + 0.1, z],
  );
  /* The tail vane that keeps it facing into the wind */
  builder.box(
    "metal",
    palette.darkSteel,
    [0.04, 0.04, 0.9],
    [x, height + 0.12, z - 0.6],
  );
  builder.box(
    "paint",
    tractorRed,
    [0.03, 0.5, 0.5],
    [x, height + 0.2, z - 1.05],
  );
};

/** The windpump's wheel of blades, which whirls round as you come near. */
const buildWindpumpWheel = (builder: AttractionBuilder) => {
  const blades = builder.isFar ? 6 : 12;
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.1,
    length: 0.12,
    at: [0, 0, 0],
    axis: "z",
    segments: 10,
  });
  for (let blade = 0; blade < blades; blade++) {
    const angle = (blade / blades) * Math.PI * 2;
    builder.box(
      "metal",
      blade % 3 === 0 ? tractorRed : palette.steel,
      [0.16, 0.55, 0.02],
      [Math.sin(angle) * 0.45, Math.cos(angle) * 0.45, 0],
      [0.35, 0, -angle],
    );
  }
  if (!builder.isFar) {
    builder.torus("metal", palette.darkSteel, 0.72, 0.02, [0, 0, 0], "z", 24);
    builder.torus("metal", palette.darkSteel, 0.2, 0.02, [0, 0, 0], "z", 12);
  }
};

const buildHayTunnel = (builder: AttractionBuilder) => {
  /* Straw bales stacked into a tunnel the train goes through */
  const arc = 0.3;
  const pieces = 3;
  for (let piece = 0; piece < pieces; piece++) {
    const angle = tunnelAngle - arc + ((arc * 2) / (pieces - 1)) * piece;
    [-1, 1].forEach((side) => {
      const radius = ringRadius + side * (trackHalf + 0.35);
      const [x, , z] = ringPoint(angle, radius);
      for (let layer = 0; layer < 3; layer++) {
        builder.box(
          "matte",
          shade(hayGold, 0.92 + ((layer + piece) % 3) * 0.06),
          [0.5, 0.48, 1.05],
          [x, 0.25 + layer * 0.5, z],
          [0, angle + Math.PI / 2, 0],
        );
        if (!builder.isFar) {
          builder.box(
            "matte",
            "#e07a2a",
            [0.52, 0.5, 0.03],
            [x, 0.25 + layer * 0.5, z],
            [0, angle, 0],
          );
        }
      }
    });
    const [x, , z] = ringPoint(angle);
    builder.box(
      "metal",
      "#7d8a92",
      [trackHalf * 2 + 1.4, 0.06, 1.1],
      [x, 1.52, z],
      [0, angle + Math.PI / 2, 0],
    );
    builder.box(
      "matte",
      hayGold,
      [trackHalf * 2 + 1.0, 0.45, 0.95],
      [x, 1.78, z],
      [0, angle + Math.PI / 2, 0],
    );
  }
};

const buildStation = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = platform;
  const middleZ = (minZ + maxZ) / 2;
  /* A brick-edged platform with ramps down at either end */
  builder.box(
    "matte",
    meadowColours.redBrick,
    [maxX - minX, platformHeight - 0.05, maxZ - minZ],
    [0, (platformHeight - 0.05) / 2, middleZ],
  );
  builder.box(
    "matte",
    palette.paving,
    [maxX - minX, 0.05, maxZ - minZ],
    [0, platformHeight - 0.025, middleZ],
  );
  builder.box(
    "paint",
    palette.white,
    [maxX - minX, 0.052, 0.12],
    [0, platformHeight - 0.024, minZ + 0.06],
  );
  [-1, 1].forEach((side) => {
    const angle = Math.atan2(platformHeight, rampLength);
    builder.box(
      "matte",
      palette.paving,
      [Math.hypot(rampLength, platformHeight), 0.05, maxZ - minZ],
      [side * (maxX + rampLength / 2), platformHeight / 2 - 0.02, middleZ],
      [0, 0, side * -angle],
    );
  });
  /* A canopy on cast-iron posts, with a fretted valance */
  const canopyHeight = 2.1;
  [-1.7, 0, 1.7].forEach((x) => {
    builder.cylinder("paint", stationGreen, {
      radius: 0.05,
      length: canopyHeight - platformHeight,
      at: [x, (canopyHeight + platformHeight) / 2, maxZ - 0.15],
      segments: 8,
    });
  });
  builder.box(
    "paint",
    stationCream,
    [4.0, 0.08, 1.3],
    [0, canopyHeight + 0.1, middleZ + 0.05],
    [-0.18, 0, 0],
  );
  builder.box(
    "paint",
    stationGreen,
    [4.05, 0.05, 1.32],
    [0, canopyHeight + 0.15, middleZ + 0.05],
    [-0.18, 0, 0],
  );
  if (!builder.isFar) {
    for (let tooth = 0; tooth < 20; tooth++) {
      builder.add(
        "paint",
        stationCream,
        new ConeGeometry(0.06, 0.14, 4).rotateX(Math.PI),
        {
          at: [-1.9 + tooth * 0.2, canopyHeight - 0.05, minZ - 0.07],
        },
      );
    }
    /* The station's name board, a bench and tubs of flowers */
    builder.box(
      "paint",
      stationGreen,
      [1.4, 0.32, 0.05],
      [0, canopyHeight - 0.3, maxZ - 0.12],
    );
    builder.box(
      "paint",
      palette.white,
      [1.2, 0.08, 0.02],
      [0, canopyHeight - 0.26, maxZ - 0.15],
    );
    builder.box(
      "paint",
      palette.white,
      [0.9, 0.05, 0.02],
      [0, canopyHeight - 0.38, maxZ - 0.15],
    );
    addBench(
      builder,
      [-1.0, platformHeight, maxZ - 0.35],
      Math.PI,
      stationGreen,
    );
    addBench(
      builder,
      [1.0, platformHeight, maxZ - 0.35],
      Math.PI,
      stationGreen,
    );
    [-2.0, 2.0].forEach((x) => {
      builder.cylinder("paint", stationGreen, {
        radius: 0.22,
        radiusEnd: 0.18,
        length: 0.3,
        at: [x, platformHeight + 0.15, maxZ - 0.25],
        segments: 12,
      });
      addFlowerClump(
        builder,
        [x, platformHeight + 0.3, maxZ - 0.25],
        [meadowColours.poppy, meadowColours.butter],
        5,
        0.2,
      );
    });
  }
  /* A little ticket hut at the end */
  const hut = { x: 4.0, z: 6.3 };
  builder.box("paint", stationCream, [1.2, 1.5, 1.0], [hut.x, 0.75, hut.z]);
  builder.box("paint", stationGreen, [1.3, 0.12, 1.1], [hut.x, 0.06, hut.z]);
  builder.add("matte", palette.slate, new ConeGeometry(0.95, 0.6, 4), {
    at: [hut.x, 1.8, hut.z],
    rotation: [0, Math.PI / 4, 0],
  });
  if (!builder.isFar) {
    addWindow(builder, {
      at: [hut.x - 0.61, 1.0, hut.z],
      width: 0.5,
      height: 0.45,
      frame: stationGreen,
      turn: -Math.PI / 2,
    });
    builder.box(
      "paint",
      stationGreen,
      [0.1, 0.06, 0.6],
      [hut.x - 0.66, 0.74, hut.z],
    );
  }
  addLampPost(builder, [-2.6, 0, 6.8]);
};

const buildSignalPost = (builder: AttractionBuilder) => {
  const [x, y, z] = signalAt;
  builder.cylinder("paint", palette.white, {
    radius: 0.05,
    length: 2.0,
    at: [x, y + 1.0, z],
    segments: 8,
  });
  builder.sphere("paint", palette.black, 0.07, [x, y + 2.05, z], [1, 1, 1], 8);
  builder.box("paint", palette.darkSteel, [0.1, 0.4, 0.06], [x, y + 0.35, z]);
};

/** The signal arm, which drops to say "all clear" as you come near. */
const buildSignalArm = (builder: AttractionBuilder) => {
  builder.box("paint", tractorRed, [0.7, 0.12, 0.03], [0.38, 0, 0.06]);
  builder.box("paint", palette.white, [0.08, 0.1, 0.035], [0.58, 0, 0.06]);
  builder.cylinder("glow", "#f04a3a", {
    radius: 0.05,
    length: 0.03,
    at: [0.02, -0.08, 0.06],
    axis: "z",
    segments: 8,
  });
};

/** The little red tractor, facing +z, its driver waving. */
const addTractor = (builder: AttractionBuilder) => {
  const far = builder.isFar;
  /* Bonnet, cab and the exhaust stack */
  builder.box("paint", tractorRed, [0.5, 0.42, 0.9], [0, 0.55, 0.35]);
  builder.box(
    "paint",
    shade(tractorRed, 0.8),
    [0.62, 0.12, 1.5],
    [0, 0.32, 0.05],
  );
  builder.box("paint", tractorRed, [0.7, 0.25, 0.55], [0, 0.55, -0.4]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.035,
    length: 0.55,
    at: [0.15, 0.95, 0.55],
    segments: 8,
  });
  /* Big back wheels and little front ones */
  [-1, 1].forEach((side) => {
    builder.cylinder("matte", tyreBlack, {
      radius: 0.38,
      length: 0.2,
      at: [side * 0.45, 0.38, -0.4],
      axis: "x",
      segments: far ? 8 : 18,
    });
    builder.cylinder("matte", tyreBlack, {
      radius: 0.22,
      length: 0.14,
      at: [side * 0.34, 0.22, 0.6],
      axis: "x",
      segments: far ? 6 : 14,
    });
    if (far) {
      return;
    }
    builder.cylinder("paint", hubYellow, {
      radius: 0.22,
      length: 0.21,
      at: [side * 0.45, 0.38, -0.4],
      axis: "x",
      segments: 12,
    });
    builder.cylinder("paint", hubYellow, {
      radius: 0.12,
      length: 0.15,
      at: [side * 0.34, 0.22, 0.6],
      axis: "x",
      segments: 10,
    });
    /* Mudguards over the back wheels */
    builder.add(
      "paint",
      tractorRed,
      new CylinderGeometry(
        0.44,
        0.44,
        0.24,
        12,
        1,
        true,
        Math.PI * 1.5,
        Math.PI,
      ),
      { at: [side * 0.45, 0.38, -0.4], rotation: [0, 0, Math.PI / 2] },
    );
    builder.box(
      "glow",
      palette.warmLight,
      [0.1, 0.08, 0.03],
      [side * 0.17, 0.62, 0.81],
    );
    /* Tread lugs on the big tyres */
    for (let lug = 0; lug < 10; lug++) {
      const angle = (lug / 10) * Math.PI * 2;
      builder.box(
        "matte",
        tyreBlack,
        [0.22, 0.06, 0.05],
        [
          side * 0.45,
          0.38 + Math.sin(angle) * 0.38,
          -0.4 + Math.cos(angle) * 0.38,
        ],
        [angle, 0, 0],
      );
    }
  });
  if (far) {
    return;
  }
  builder.box("metal", palette.darkSteel, [0.44, 0.3, 0.02], [0, 0.55, 0.81]);
  for (let bar = 0; bar < 4; bar++) {
    builder.box(
      "metal",
      palette.steel,
      [0.4, 0.02, 0.025],
      [0, 0.44 + bar * 0.07, 0.82],
    );
  }
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.05,
    length: 0.04,
    at: [0.15, 1.24, 0.55],
    segments: 8,
  });
  /* The seat, steering wheel and the farmer in a flat cap */
  builder.box("paint", palette.black, [0.36, 0.08, 0.3], [0, 0.72, -0.5]);
  builder.bar(
    "metal",
    palette.black,
    [0, 0.62, -0.05],
    [0, 0.95, -0.25],
    0.04,
    6,
  );
  builder.torus("paint", palette.black, 0.13, 0.02, [0, 0.97, -0.26], "y", 12);
  builder.cylinder("matte", "#3f6a8a", {
    radius: 0.15,
    radiusEnd: 0.13,
    length: 0.4,
    at: [0, 0.95, -0.5],
    segments: 10,
  });
  builder.sphere(
    "matte",
    meadowColours.skin,
    0.11,
    [0, 1.25, -0.48],
    [1, 1.05, 1],
    10,
  );
  builder.cylinder("matte", "#6a5a4a", {
    radius: 0.12,
    length: 0.06,
    at: [0, 1.34, -0.47],
    segments: 10,
  });
  builder.box("matte", "#6a5a4a", [0.18, 0.02, 0.1], [0, 1.32, -0.36]);
  builder.bar(
    "matte",
    "#3f6a8a",
    [0.13, 1.08, -0.5],
    [0.28, 1.4, -0.44],
    0.07,
    5,
  );
  builder.sphere(
    "matte",
    meadowColours.skin,
    0.04,
    [0.29, 1.43, -0.44],
    [1, 1, 1],
    6,
  );
};

/** One barrel carriage, its back to `at`, facing +z, turned by `turn`. */
const addBarrelCarriage = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  colour: string,
) => {
  const far = builder.isFar;
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  /* A big painted barrel lying down, a doorway cut in its side for riders */
  builder.add(
    "paint",
    colour,
    new CylinderGeometry(
      0.38,
      0.38,
      1.0,
      far ? 8 : 18,
      1,
      true,
      Math.PI * 1.25,
      Math.PI * 1.5,
    ).rotateX(Math.PI / 2),
    { at: place(0, 0.62, 0), rotation },
  );
  [-0.5, 0.5].forEach((end) => {
    builder.add(
      "paint",
      shade(colour, 0.85),
      new CylinderGeometry(0.39, 0.39, 0.04, far ? 8 : 18).rotateX(Math.PI / 2),
      { at: place(0, 0.62, end), rotation },
    );
    if (!far) {
      builder.add(
        "metal",
        palette.darkSteel,
        new CylinderGeometry(0.395, 0.395, 0.05, 18, 1, true).rotateX(
          Math.PI / 2,
        ),
        { at: place(0, 0.62, end * 0.6), rotation },
      );
    }
  });
  /* The chassis, four wheels and a tow bar */
  builder.box(
    "paint",
    palette.darkSteel,
    [0.5, 0.06, 1.1],
    place(0, 0.25, 0),
    rotation,
  );
  [-1, 1].forEach((side) => {
    [-0.32, 0.32].forEach((dz) => {
      builder.add(
        "matte",
        tyreBlack,
        new CylinderGeometry(0.15, 0.15, 0.08, far ? 6 : 12).rotateZ(
          Math.PI / 2,
        ),
        { at: place(side * 0.3, 0.15, dz), rotation },
      );
    });
  });
  builder.box(
    "metal",
    palette.darkSteel,
    [0.05, 0.05, 0.5],
    place(0, 0.25, 0.75),
    rotation,
  );
  if (!far) {
    builder.box(
      "paint",
      palette.paleTimber,
      [0.5, 0.05, 0.4],
      place(0, 0.4, 0),
      rotation,
    );
  }
};

const buildTrain = (builder: AttractionBuilder) => {
  addTractor(builder);
  carriageAngles.forEach((angle, index) => {
    const [x, , z] = trailing(angle);
    addBarrelCarriage(builder, [x, 0, z], angle, barrelColours[index]);
  });
};

const buildSheep = (builder: AttractionBuilder) => {
  const fleece = "#eee8d8";
  const face = "#2b2622";
  builder.sphere("matte", fleece, 0.28, [0, 0.48, 0], [0.92, 0.82, 1.25], 9);
  builder.sphere(
    "matte",
    shade(fleece, 1.03),
    0.17,
    [0, 0.62, 0.16],
    [1.1, 0.85, 1],
    7,
  );
  builder.sphere("matte", face, 0.11, [0, 0.62, 0.4], [0.8, 0.95, 1.3], 8);
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      face,
      [0.11, 0.04, 0.05],
      [side * 0.11, 0.66, 0.34],
      [0, 0, side * -0.4],
    );
    [-0.18, 0.18].forEach((legZ) => {
      builder.cylinder("matte", face, {
        radius: 0.035,
        length: 0.3,
        at: [side * 0.11, 0.15, legZ],
        segments: 5,
      });
    });
  });
};

const buildHen = (builder: AttractionBuilder) => {
  const brown = "#b5652e";
  builder.sphere("matte", brown, 0.12, [0, 0.18, 0], [0.85, 0.85, 1.2], 8);
  builder.sphere("matte", brown, 0.07, [0, 0.3, 0.1], [1, 1, 1], 7);
  builder.sphere("matte", "#d0302a", 0.03, [0, 0.38, 0.1], [0.5, 1, 1.2], 5);
  builder.box("matte", hubYellow, [0.04, 0.03, 0.06], [0, 0.29, 0.18]);
  builder.box(
    "matte",
    shade(brown, 0.8),
    [0.08, 0.1, 0.06],
    [0, 0.26, -0.13],
    [-0.5, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      hubYellow,
      [side * 0.04, 0.09, 0],
      [side * 0.04, 0, 0.02],
      0.02,
      4,
    );
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box(
    "matte",
    palette.path,
    [1.4, 0.03, 2.2],
    [signAt.x + 0.3, 0.015, 6.6],
  );
  builder.box("matte", palette.path, [2.6, 0.03, 1.2], [-3.3, 0.016, 6.2]);
  addSignBoard(builder, [signAt.x, 0, signAt.z], signColour);
  addTree(builder, [-7.2, 0, -4.6], 1.15);
  addTree(builder, [7.0, 0, -5.0], 1.0, "#4a9440");
  if (builder.isFar) {
    return;
  }
  addBush(builder, [7.4, 0, 1.6], 0.55);
  addBush(builder, [-7.6, 0, 1.2], 0.5, "#3a7d34");
  addBush(builder, [5.8, 0, 5.0], 0.45);
  addFlowerClump(builder, [-6.2, 0, 4.4], [meadowColours.rose, palette.white]);
  addFlowerClump(
    builder,
    [6.4, 0, 3.4],
    [meadowColours.butter, meadowColours.cornflower],
  );
};

const platformDeck: Deck = ({ x, z }) => {
  if (z < platform.minZ || z > platform.maxZ) {
    return undefined;
  }
  const out = Math.abs(x) - platform.maxX;
  if (out <= 0) {
    return { height: platformHeight, kind: "ground" };
  }
  if (out <= rampLength) {
    return { height: platformHeight * (1 - out / rampLength), kind: "ground" };
  }
  return undefined;
};

/* Step from the platform into the first barrel, ride round the ring, and step back off */
const trainRide = (progress: number, seconds: number): LocalSpot => {
  const pose = findMotionPose(trainMotion, seconds);
  const [lx, , lz] = trailing(carriageAngles[0]);
  const [x, y, z] = moveWithPose(
    trainPivot,
    [trainPivot[0] + lx, barrelSeat, trainPivot[2] + lz],
    pose,
  );
  const share = Math.min(1, progress * 8, (1 - progress) * 8);
  const outside = progress < 0.5 ? boardAt : alightAt;
  return {
    x: outside.x + (x - outside.x) * share,
    y: platformHeight + (y - platformHeight) * share,
    z: outside.z + (z - outside.z) * share,
    heading: pose.rotation[1] + carriageAngles[0],
  };
};

export const tractorTrainModel: NewLandAttractionModel = {
  kind: "tractor-train",
  islandId: "meadow-isle",
  name: "Tractor Train",
  fact: "A farm is a place where people grow crops and keep animals, such as sheep for their wool. Farmers drive tractors, whose huge back wheels grip the muddy ground, to pull ploughs and trailers. Farms, villages and houses are all human features: things that people have built.",
  curriculumLink:
    "Geography, Key Stage 1: human and physical features. Use basic geographical vocabulary to refer to key human features, including farm, village and house.",
  footprint: 10,
  setting: "inland",
  signSpot: { x: signAt.x, z: signAt.z + 0.8 },
  build: (builder) => {
    buildTrack(builder);
    buildPaddock(builder);
    buildWindpumpTower(builder);
    buildHayTunnel(builder);
    buildStation(builder);
    buildSignalPost(builder);
    buildGrounds(builder);
  },
  moving: [
    {
      name: "train",
      pivot: trainPivot,
      build: buildTrain,
      motion: trainMotion,
    },
    {
      name: "windpump-wheel",
      pivot: [windpumpAt[0], 3.55, windpumpAt[2] + 0.3],
      build: buildWindpumpWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.4, speed: 5, reach: 7 },
    },
    {
      name: "signal-arm",
      pivot: [signalAt[0], signalAt[1] + 1.8, signalAt[2]],
      build: buildSignalArm,
      motion: { kind: "nod", axis: "z", reach: 6, amplitude: 0.5, period: 3 },
    },
  ],
  wanderers: [
    {
      name: "sheep",
      build: buildSheep,
      count: 4,
      centre: { x: -0.4, z: ringCentre.z + 0.4 },
      radius: 1.9,
      speed: 0.2,
    },
    {
      name: "hens",
      build: buildHen,
      count: 3,
      centre: { x: 5.6, z: 3.6 },
      radius: 0.9,
      speed: 0.3,
    },
  ],
  blockers: [{ x: windpumpAt[0], z: windpumpAt[2], radius: 0.6 }],
  decks: [platformDeck],
  rides: [
    {
      id: "tractor-train",
      name: "the tractor train",
      start: boardAt,
      reach: 0.6,
      seconds: 22,
      finish: alightAt,
      follow: trainRide,
    },
  ],
  play: {
    label: "Toot the horn",
    news: "Toot toot! The little red tractor set off round the meadow, pulling its barrel carriages through the hay-bale tunnel.",
    tune: [72, 72, 67, 72],
  },
};
