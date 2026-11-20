import { CylinderGeometry, ExtrudeGeometry, Shape, TorusGeometry } from "three";
import {
  addBench,
  addLampPost,
  addSignBoard,
  addTree,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

/* The K6's own red, a warm "currant red" */
const kioskRed = "#c8102e";
const kioskShadow = shade(kioskRed, 0.8);
const signWhite = "#fbf6e4";
const crownGold = "#d8b04a";
const glassTint = "#a9c8d8";
const pavingStone = "#c4beb2";
const signColour = "#c8102e";

const kiosk = { x: 0, z: -0.6 };
const halfWidth = 0.48;
const plinthHeight = 0.12;
const bodyTop = 2.05;
const signBand = 0.2;
const vaultBase = bodyTop + signBand + 0.04;
const vaultRise = 0.2;
const doorWidth = 0.74;
const doorHeight = 1.85;
const doorOpen = -0.6;
const hingeAt: Triple = [
  kiosk.x - doorWidth / 2,
  plinthHeight + 0.02,
  kiosk.z + halfWidth + 0.01,
];
const pillarBox = { x: -1.6, z: 0.2 };
const benchAt: Triple = [1.55, 0, -0.3];

/** A point beside the kiosk, `out` from its middle on the side facing `turn`. */
const onSide = (
  turn: number,
  across: number,
  y: number,
  out: number,
): Triple => [
  kiosk.x + across * Math.cos(turn) + out * Math.sin(turn),
  y,
  kiosk.z - across * Math.sin(turn) + out * Math.cos(turn),
];

const sides = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/* ------------------------------------------------------------------ */
/* The kiosk                                                           */
/* ------------------------------------------------------------------ */

/** Small square panes: a glass sheet behind, and glazing bars in front. */
const addGlazing = (
  builder: AttractionBuilder,
  place: (across: number, y: number, out: number) => Triple,
  rotation: Triple,
  width: number,
  bottom: number,
  top: number,
) => {
  const height = top - bottom;
  builder.box(
    "glass",
    glassTint,
    [width, height, 0.015],
    place(0, (bottom + top) / 2, 0),
    rotation,
  );
  if (builder.isFar) {
    return;
  }
  /* Three panes across and eight up, as on the real kiosk */
  [-1, 1].forEach((step) => {
    builder.box(
      "paint",
      kioskRed,
      [0.025, height, 0.03],
      place((step * width) / 6, (bottom + top) / 2, 0.012),
      rotation,
    );
  });
  for (let row = 1; row < 8; row++) {
    builder.box(
      "paint",
      kioskRed,
      [width, 0.025, 0.03],
      place(0, bottom + (row * height) / 8, 0.012),
      rotation,
    );
  }
};

const buildKiosk = (builder: AttractionBuilder) => {
  const { x, z } = kiosk;
  /* The plinth, and (far off) the box itself; near, it is hollow */
  builder.box(
    "paint",
    kioskShadow,
    [halfWidth * 2 + 0.1, plinthHeight, halfWidth * 2 + 0.1],
    [x, plinthHeight / 2, z],
  );
  if (builder.isFar) {
    builder.box(
      "paint",
      kioskRed,
      [halfWidth * 2 - 0.06, bodyTop - plinthHeight, halfWidth * 2 - 0.06],
      [x, (bodyTop + plinthHeight) / 2, z],
    );
  } else {
    /* A tiled floor inside, and a header over each side */
    builder.box(
      "matte",
      "#3a3a3e",
      [0.8, 0.01, 0.8],
      [x, plinthHeight + 0.005, z],
    );
    sides.forEach((turn) => {
      const bottom = turn === 0 ? plinthHeight + doorHeight : 1.9;
      builder.box(
        "paint",
        kioskRed,
        [0.8, bodyTop - bottom, 0.04],
        onSide(turn, 0, (bodyTop + bottom) / 2, halfWidth),
        [0, turn, 0],
      );
    });
  }
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        kioskRed,
        [0.12, bodyTop - plinthHeight + 0.05, 0.12],
        [
          x + sideX * (halfWidth - 0.04),
          (bodyTop + plinthHeight) / 2,
          z + sideZ * (halfWidth - 0.04),
        ],
      );
    });
  });
  /* The sign band and cornice */
  builder.box(
    "paint",
    kioskRed,
    [halfWidth * 2 + 0.04, signBand + 0.04, halfWidth * 2 + 0.04],
    [x, bodyTop + signBand / 2 + 0.02, z],
  );
  builder.box(
    "paint",
    kioskShadow,
    [halfWidth * 2 + 0.1, 0.05, halfWidth * 2 + 0.1],
    [x, bodyTop + 0.01, z],
  );
  /* The roof: two crossing arches, so every face has a curved top */
  const arch = new Shape();
  const span = halfWidth + 0.03;
  arch.moveTo(-span, 0);
  arch.lineTo(span, 0);
  arch.quadraticCurveTo(0, vaultRise * 2, -span, 0);
  [0, Math.PI / 2].forEach((turn) => {
    const vault = new ExtrudeGeometry(arch, {
      depth: span * 2,
      bevelEnabled: false,
      curveSegments: builder.isFar ? 4 : 10,
    });
    vault.translate(0, 0, -span);
    builder.add(
      "paint",
      kioskRed,
      vault,
      { at: [x, vaultBase, z], rotation: [0, turn, 0] },
      0.6,
    );
  });
  builder.box(
    "paint",
    kioskShadow,
    [halfWidth * 2 + 0.08, 0.04, halfWidth * 2 + 0.08],
    [x, vaultBase, z],
  );
  /* A little finial dome on the very top */
  builder.lathe(
    "paint",
    kioskRed,
    [
      [0, 0],
      [0.14, 0],
      [0.12, 0.06],
      [0.05, 0.1],
      [0, 0.11],
    ],
    [x, vaultBase + vaultRise - 0.01, z],
    "y",
    builder.isFar ? 6 : 12,
  );
  sides.forEach((turn) => {
    const rotation: Triple = [0, turn, 0];
    const place = (across: number, y: number, out: number) =>
      onSide(turn, across, y, halfWidth + 0.03 + out);
    /* The glowing TELEPHONE sign on all four sides */
    builder.box(
      "glow",
      signWhite,
      [halfWidth * 1.4, signBand * 0.6, 0.02],
      place(0, bodyTop + signBand / 2 + 0.02, 0),
      rotation,
    );
    if (turn !== 0) {
      addGlazing(builder, place, rotation, 0.62, 0.5, 1.9);
      if (!builder.isFar) {
        builder.box(
          "paint",
          kioskRed,
          [0.72, 0.36, 0.03],
          place(0, 0.32, -0.01),
          rotation,
        );
      }
    }
    if (builder.isFar) {
      return;
    }
    /* Letters on the sign, picked out in dark blocks */
    for (let letter = 0; letter < 9; letter++) {
      builder.box(
        "paint",
        "#2a2a2e",
        [0.04, 0.06, 0.01],
        place(-0.27 + letter * 0.0675, bodyTop + signBand / 2 + 0.02, 0.012),
        rotation,
      );
    }
    /* The crown in the arch above */
    builder.sphere(
      "paint",
      crownGold,
      0.06,
      place(0, vaultBase + 0.09, 0.0),
      [1.1, 0.8, 0.4],
      8,
    );
    builder.box(
      "paint",
      crownGold,
      [0.12, 0.03, 0.03],
      place(0, vaultBase + 0.04, 0.0),
      rotation,
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Inside: a shelf with the telephone and a coin box */
  builder.box(
    "paint",
    "#2a2a2e",
    [0.5, 0.04, 0.25],
    [x, 1.1, z - halfWidth + 0.18],
  );
  builder.box(
    "metal",
    palette.darkSteel,
    [0.22, 0.3, 0.12],
    [x + 0.12, 1.35, z - halfWidth + 0.1],
  );
  builder.roundedBox("paint", "#1f2023", [0.18, 0.1, 0.14], 0.03, [
    x - 0.12,
    1.17,
    z - halfWidth + 0.16,
  ]);
  builder.box(
    "paint",
    "#d8d0b4",
    [0.14, 0.05, 0.2],
    [x - 0.05, 1.145, z - halfWidth + 0.27],
    [0, 0.4, 0],
  );
  /* The ceiling */
  builder.box(
    "paint",
    kioskShadow,
    [0.84, 0.03, 0.84],
    [x, bodyTop - 0.015, z],
  );
  /* A card with the number, stuck inside the back pane */
  builder.box(
    "paint",
    palette.white,
    [0.12, 0.08, 0.005],
    [x - 0.12, 1.45, z - halfWidth + 0.035],
  );
};

/** The lamp in the ceiling, which comes on as someone steps up. */
const buildLamp = (builder: AttractionBuilder) => {
  builder.cylinder("glow", palette.warmLight, {
    radius: 0.1,
    length: 0.06,
    at: [0, -0.03, 0],
    segments: 12,
  });
  builder.sphere(
    "glow",
    palette.warmLight,
    0.07,
    [0, -0.06, 0],
    [1, 0.6, 1],
    8,
  );
};

/** The door, hinged on its left, standing a little open. */
const buildDoor = (builder: AttractionBuilder) => {
  const rotation: Triple = [0, doorOpen, 0];
  const place = (across: number, y: number, out: number): Triple => [
    across * Math.cos(doorOpen) + out * Math.sin(doorOpen),
    y,
    -across * Math.sin(doorOpen) + out * Math.cos(doorOpen),
  ];
  const middle = doorWidth / 2;
  /* The frame round the glazing, and a solid kick panel */
  builder.box(
    "paint",
    kioskRed,
    [doorWidth, 0.36, 0.05],
    place(middle, 0.18, 0),
    rotation,
  );
  builder.box(
    "paint",
    kioskRed,
    [doorWidth, 0.1, 0.05],
    place(middle, doorHeight - 0.05, 0),
    rotation,
  );
  [0.04, doorWidth - 0.04].forEach((across) => {
    builder.box(
      "paint",
      kioskRed,
      [0.08, doorHeight, 0.05],
      place(across, doorHeight / 2, 0),
      rotation,
    );
  });
  addGlazing(
    builder,
    (across, y, out) => place(middle + across, y, out),
    rotation,
    doorWidth - 0.12,
    0.36,
    doorHeight - 0.1,
  );
  /* A raised panel on the kick plate and a brass handle */
  builder.box(
    "paint",
    kioskShadow,
    [doorWidth - 0.2, 0.22, 0.02],
    place(middle, 0.18, 0.03),
    rotation,
  );
  builder.box(
    "metal",
    palette.brass,
    [0.04, 0.22, 0.04],
    place(doorWidth - 0.1, 1.0, 0.05),
    rotation,
  );
};

/** The handset, jiggling on its cradle when the telephone rings. */
const buildHandset = (builder: AttractionBuilder) => {
  builder.cylinder("paint", "#1f2023", {
    radius: 0.018,
    length: 0.2,
    at: [0, 0.02, 0],
    axis: "x",
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", "#1f2023", {
      radius: 0.035,
      radiusEnd: 0.03,
      length: 0.05,
      at: [side * 0.1, 0.0, 0],
      segments: 10,
    });
  });
};

/* ------------------------------------------------------------------ */
/* The pavement, the pillar box, the bench and the lamp                */
/* ------------------------------------------------------------------ */

const buildPavement = (builder: AttractionBuilder) => {
  builder.box("matte", pavingStone, [4.6, 0.04, 2.6], [0, 0.02, -0.3]);
  if (builder.isFar) {
    return;
  }
  /* Paving slabs, with a kerb along the front */
  for (let column = 0; column < 7; column++) {
    for (let row = 0; row < 4; row++) {
      if ((column + row) % 2 === 0) {
        continue;
      }
      builder.box(
        "matte",
        shade(pavingStone, 0.93),
        [0.62, 0.006, 0.6],
        [-1.95 + column * 0.65, 0.042, -1.3 + row * 0.65],
      );
    }
  }
  builder.box(
    "matte",
    shade(pavingStone, 0.85),
    [4.7, 0.1, 0.16],
    [0, 0.05, 1.0],
  );
};

const buildPillarBox = (builder: AttractionBuilder) => {
  const { x, z } = pillarBox;
  builder.lathe(
    "paint",
    kioskRed,
    [
      [0, 0],
      [0.27, 0],
      [0.27, 0.12],
      [0.23, 0.16],
      [0.23, 1.05],
      [0.28, 1.1],
      [0.28, 1.15],
      [0.24, 1.18],
      [0.2, 1.3],
      [0.1, 1.37],
      [0, 1.39],
    ],
    [x, 0, z],
    "y",
    builder.isFar ? 8 : 20,
  );
  if (builder.isFar) {
    return;
  }
  /* A black base, the posting slot, and the collection plate */
  builder.cylinder("paint", palette.black, {
    radius: 0.275,
    length: 0.1,
    at: [x, 0.05, z],
    segments: 20,
  });
  builder.box("paint", palette.black, [0.24, 0.035, 0.06], [x, 0.93, z + 0.22]);
  builder.box("paint", kioskShadow, [0.3, 0.06, 0.08], [x, 0.98, z + 0.22]);
  builder.box("paint", palette.white, [0.16, 0.12, 0.02], [x, 0.72, z + 0.23]);
  builder.box("paint", "#2a2a2e", [0.1, 0.02, 0.01], [x, 0.74, z + 0.242]);
  builder.box("paint", "#2a2a2e", [0.12, 0.015, 0.01], [x, 0.7, z + 0.242]);
  builder.box("paint", kioskShadow, [0.2, 0.28, 0.03], [x, 0.45, z + 0.225]);
  builder.sphere(
    "metal",
    palette.brass,
    0.02,
    [x + 0.07, 0.45, z + 0.245],
    [1, 1, 1],
    6,
  );
};

const buildExtras = (builder: AttractionBuilder) => {
  addBench(builder, benchAt, 0, palette.paleTimber);
  addLampPost(builder, [1.9, 0, -1.4], 2.4);
  addTree(builder, [-2.6, 0, -2.1], 1.0);
  /* A ginger cat dozing on the bench */
  const cat: Triple = [benchAt[0] + 0.35, 0.38, benchAt[2] - 0.05];
  const ginger = "#e08a3a";
  builder.sphere(
    "matte",
    ginger,
    0.14,
    [cat[0], cat[1] + 0.08, cat[2]],
    [1.3, 0.7, 0.9],
    10,
  );
  builder.sphere(
    "matte",
    ginger,
    0.08,
    [cat[0] - 0.17, cat[1] + 0.1, cat[2] + 0.05],
    [1, 0.9, 1],
    8,
  );
  [-1, 1].forEach((side) => {
    builder.add("matte", ginger, new CylinderGeometry(0, 0.03, 0.06, 4), {
      at: [cat[0] - 0.18, cat[1] + 0.19, cat[2] + 0.05 + side * 0.04],
    });
  });
  builder.add(
    "matte",
    shade(ginger, 0.85),
    new TorusGeometry(0.1, 0.022, 5, 10, Math.PI),
    {
      at: [cat[0] + 0.12, cat[1] + 0.03, cat[2] + 0.08],
      rotation: [Math.PI / 2, 0, 0],
    },
  );
  /* Window boxes of red geraniums either side of the kiosk */
  [-1, 1].forEach((side) => {
    const planter: Triple = [kiosk.x + side * 0.9, 0, kiosk.z + 0.2];
    builder.box(
      "matte",
      palette.darkTimber,
      [0.32, 0.3, 0.6],
      [planter[0], 0.15, planter[2]],
    );
    builder.box(
      "matte",
      palette.soil,
      [0.28, 0.02, 0.56],
      [planter[0], 0.3, planter[2]],
    );
    [-0.18, 0, 0.18].forEach((along, index) => {
      builder.sphere(
        "matte",
        palette.leaf,
        0.12,
        [planter[0], 0.38, planter[2] + along],
        [1, 0.8, 1],
        7,
      );
      builder.sphere(
        "paint",
        index === 1 ? "#f29ab0" : "#d8263a",
        0.06,
        [planter[0] + 0.03, 0.48, planter[2] + along],
        [1, 0.8, 1],
        6,
      );
    });
  });
  /* A dog-eared phone book on the shelf of the pillar box's plinth */
  builder.box(
    "paint",
    "#f2d23a",
    [0.2, 0.05, 0.28],
    [pillarBox.x + 0.45, 0.065, pillarBox.z + 0.1],
    [0, 0.4, 0],
  );
};

/** A town pigeon, pecking about the pavement. */
const buildPigeon = (builder: AttractionBuilder) => {
  const grey = "#8a8f9a";
  builder.sphere("paint", grey, 0.09, [0, 0.11, 0], [0.85, 0.8, 1.3], 8);
  builder.sphere("paint", "#6a7a8a", 0.06, [0, 0.12, 0.08], [1, 1, 0.8], 7);
  builder.sphere("paint", shade(grey, 0.85), 0.05, [0, 0.2, 0.1], [1, 1, 1], 7);
  builder.add("paint", "#3a3226", new CylinderGeometry(0, 0.014, 0.04, 4), {
    at: [0, 0.2, 0.16],
    rotation: [Math.PI / 2, 0, 0],
  });
  builder.box(
    "paint",
    shade(grey, 0.7),
    [0.07, 0.015, 0.12],
    [0, 0.12, -0.13],
    [-0.3, 0, 0],
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      "#d8606a",
      [side * 0.03, 0.05, 0],
      [side * 0.03, 0, 0.01],
      0.012,
      3,
    );
  });
};

export const telephoneBoxModel: CuriosityModel = {
  kind: "telephone-box",
  islandId: "meadow-isle",
  name: "Red Telephone Box",
  fact: 'Alexander Graham Bell invented the telephone in 1876. The first words he spoke into it were to his helper: "Mr Watson, come here, I want to see you." Red telephone boxes like this one were designed by Sir Giles Gilbert Scott in 1935, and people went inside to make calls before mobile phones were invented.',
  curriculumLink:
    "History, Key Stage 1: the lives of significant individuals in the past who have contributed to national and international achievements, such as Alexander Graham Bell.",
  footprint: 3.8,
  setting: "inland",
  signSpot: { x: 1.3, z: 2.0 },
  build: (builder) => {
    buildPavement(builder);
    buildKiosk(builder);
    buildPillarBox(builder);
    if (builder.isFar) {
      builder.box(
        "paint",
        kioskRed,
        [doorWidth, doorHeight, 0.05],
        [kiosk.x, plinthHeight + doorHeight / 2, kiosk.z + halfWidth + 0.02],
      );
    } else {
      buildExtras(builder);
    }
    addSignBoard(builder, [1.3, 0, 2.0], signColour);
  },
  moving: [
    {
      name: "ceiling lamp",
      pivot: [kiosk.x, bodyTop - 0.03, kiosk.z],
      build: buildLamp,
      motion: { kind: "wake", reach: 5 },
    },
    {
      name: "door",
      pivot: hingeAt,
      build: buildDoor,
      motion: { kind: "nod", axis: "y", reach: 6, amplitude: 0.6, period: 3.6 },
    },
    {
      name: "handset",
      pivot: [kiosk.x - 0.12, 1.25, kiosk.z - halfWidth + 0.16],
      build: buildHandset,
      motion: {
        kind: "nod",
        axis: "z",
        reach: 7,
        amplitude: 0.08,
        period: 0.18,
      },
    },
  ],
  blockers: [
    { x: kiosk.x, z: kiosk.z, radius: 0.62 },
    { x: pillarBox.x, z: pillarBox.z, radius: 0.35 },
    { x: benchAt[0], z: benchAt[2], radius: 0.6 },
    { x: 1.9, z: -1.4, radius: 0.15 },
    { x: -2.6, z: -2.1, radius: 0.3 },
    { x: kiosk.x - 0.9, z: kiosk.z + 0.2, radius: 0.35 },
    { x: kiosk.x + 0.9, z: kiosk.z + 0.2, radius: 0.35 },
  ] satisfies LocalBlocker[],
  wanderers: [
    {
      name: "pigeons",
      build: buildPigeon,
      count: 3,
      centre: { x: 0.4, z: 0.75 },
      radius: 0.6,
      height: 0.04,
      speed: 0.3,
      bob: 0.04,
    },
  ],
  tune: [84, 88, 84, 88, 84, 88],
  play: {
    label: "Make a phone call",
    news: "Brring brring! You dialled a number and a friendly voice said hello, just like Alexander Graham Bell's very first call.",
    tune: [76, 79, 74, 81, 77],
  },
};
