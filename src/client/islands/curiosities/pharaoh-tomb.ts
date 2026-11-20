import { IcosahedronGeometry } from "three";
import {
  addSignBoard,
  listWallBlockers,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const sand = "#e2c48a";
const cliff = "#c9a06a";
const cliffLight = "#dab47c";
const cliffDark = "#a8814f";
const doorDark = "#24160c";
const plaster = "#efe0bc";
const gold = "#e3b23c";
const goldDeep = "#b8862a";
const lapis = "#2a4f9e";
const egyptRed = "#b8402a";
const egyptGreen = "#3a8a5a";
const granite = "#8a5a4a";
const linen = "#ece2c8";
const flame = "#ffb347";
const signColour = "#2a4f9e";

const cliffFront = -1.4;
const door = { width: 1.0, height: 1.75 };
const sarcophagus = {
  x: -0.1,
  z: 0.85,
  length: 2.0,
  width: 0.82,
  height: 0.62,
};
const lidPivot: Triple = [sarcophagus.x, sarcophagus.height, sarcophagus.z];
const torchSpots = [-2.15, 2.15].map((x) => ({ x, z: -0.95 }));
const flameHeight = 1.42;
const canopicAt = { x: 2.1, z: 0.35 };
const treasureAt = { x: -2.3, z: -0.1 };
const crateAt = { x: 2.6, z: 1.9 };

/* Hieroglyphs: little pictures in columns, painted on plaster */

const glyphPainters: ((builder: AttractionBuilder, at: Triple) => void)[] = [
  /* An ankh, the sign of life */
  (builder, [x, y, z]) => {
    builder.torus("paint", gold, 0.035, 0.012, [x, y + 0.04, z], "z", 8);
    builder.box("paint", gold, [0.025, 0.08, 0.015], [x, y - 0.03, z]);
    builder.box("paint", gold, [0.09, 0.022, 0.015], [x, y + 0.005, z]);
  },
  /* The eye of Horus */
  (builder, [x, y, z]) => {
    builder.sphere("paint", palette.white, 0.04, [x, y, z], [1.4, 0.7, 0.2], 6);
    builder.sphere(
      "paint",
      palette.black,
      0.018,
      [x, y, z + 0.006],
      [1, 1, 0.3],
      6,
    );
    builder.box("paint", palette.black, [0.1, 0.012, 0.012], [x, y + 0.04, z]);
    builder.box(
      "paint",
      palette.black,
      [0.012, 0.05, 0.012],
      [x - 0.01, y - 0.05, z],
    );
  },
  /* A bird */
  (builder, [x, y, z]) => {
    builder.sphere("paint", egyptGreen, 0.035, [x, y, z], [1.3, 0.9, 0.3], 6);
    builder.sphere(
      "paint",
      egyptGreen,
      0.018,
      [x + 0.04, y + 0.035, z],
      [1, 1, 0.4],
      6,
    );
    builder.box("paint", gold, [0.025, 0.01, 0.01], [x + 0.065, y + 0.035, z]);
    builder.box("paint", egyptRed, [0.01, 0.04, 0.01], [x, y - 0.045, z]);
  },
  /* Water: three zigzag lines */
  (builder, [x, y, z]) => {
    [-0.03, 0, 0.03].forEach((up) => {
      builder.box(
        "paint",
        lapis,
        [0.1, 0.014, 0.012],
        [x, y + up, z],
        [0, 0, up * 4],
      );
    });
  },
  /* A sun disc */
  (builder, [x, y, z]) => {
    builder.cylinder("paint", egyptRed, {
      radius: 0.035,
      length: 0.015,
      at: [x, y, z],
      axis: "z",
      segments: 10,
    });
  },
  /* A reed */
  (builder, [x, y, z]) => {
    builder.box("paint", egyptGreen, [0.015, 0.1, 0.012], [x, y, z]);
    builder.sphere(
      "paint",
      egyptGreen,
      0.025,
      [x + 0.015, y + 0.04, z],
      [0.6, 1.2, 0.3],
      6,
    );
  },
];

const buildGlyphPanel = (builder: AttractionBuilder, x: number) => {
  const width = 0.9;
  const height = 1.7;
  const face = cliffFront + 0.03;
  builder.box(
    "matte",
    plaster,
    [width, height, 0.04],
    [x, 0.3 + height / 2, face],
  );
  builder.box(
    "paint",
    gold,
    [width + 0.06, 0.05, 0.05],
    [x, 0.3 + height + 0.02, face + 0.01],
  );
  builder.box(
    "paint",
    gold,
    [width + 0.06, 0.05, 0.05],
    [x, 0.28, face + 0.01],
  );
  /* A cartouche at the top: the pharaoh's name in a rounded frame */
  builder.box(
    "paint",
    gold,
    [0.22, 0.42, 0.02],
    [x, 0.3 + height - 0.3, face + 0.03],
  );
  builder.box(
    "paint",
    plaster,
    [0.17, 0.36, 0.02],
    [x, 0.3 + height - 0.3, face + 0.035],
  );
  builder.box(
    "paint",
    gold,
    [0.3, 0.03, 0.02],
    [x, 0.3 + height - 0.53, face + 0.03],
  );
  [0.1, 0, -0.1].forEach((up, index) => {
    const paint =
      glyphPainters[(index + (x > 0 ? 3 : 0)) % glyphPainters.length];
    paint(builder, [x, 0.3 + height - 0.3 + up, face + 0.05]);
  });
  /* Columns of glyphs, divided by thin lines */
  [-0.3, 0.3].forEach((across, column) => {
    for (let row = 0; row < 4; row++) {
      const paint =
        glyphPainters[
          (row * 2 + column + (x > 0 ? 1 : 0)) % glyphPainters.length
        ];
      paint(builder, [x + across, 0.5 + row * 0.27, face + 0.03]);
    }
  });
  [-0.15, 0.15].forEach((across) => {
    builder.box(
      "paint",
      lapis,
      [0.012, height - 0.2, 0.01],
      [x + across, 0.3 + height / 2 - 0.05, face + 0.025],
    );
  });
};

/* The rock face, with the tomb's doorway cut into it */

const buildCliff = (builder: AttractionBuilder) => {
  const slabs: {
    x: number;
    width: number;
    height: number;
    depth: number;
    colour: string;
  }[] = [
    { x: -2.55, width: 1.0, height: 2.4, depth: 1.5, colour: cliffDark },
    { x: -1.6, width: 1.2, height: 3.0, depth: 1.7, colour: cliff },
    { x: 0, width: 2.2, height: 3.3, depth: 1.8, colour: cliffLight },
    { x: 1.6, width: 1.2, height: 2.85, depth: 1.7, colour: cliff },
    { x: 2.55, width: 1.0, height: 2.2, depth: 1.5, colour: cliffDark },
  ];
  slabs.forEach(({ x, width, height, depth, colour }, index) => {
    builder.box(
      "matte",
      colour,
      [width, height, depth],
      [x, height / 2, cliffFront - depth / 2],
      [0, (index - 2) * 0.05, 0],
    );
  });
  /* Boulders heaped along the top and the foot of the cliff */
  const boulders: [number, number, number, number][] = builder.isFar
    ? [
        [-1.0, 3.0, -2.2, 0.7],
        [1.1, 2.9, -2.3, 0.65],
      ]
    : [
        [-1.0, 3.0, -2.2, 0.7],
        [1.1, 2.9, -2.3, 0.65],
        [0.1, 3.35, -2.4, 0.55],
        [-2.4, 2.3, -2.1, 0.55],
        [2.5, 2.1, -2.0, 0.5],
        [-2.9, 0.3, -1.1, 0.42],
        [3.0, 0.25, -1.2, 0.38],
        [-1.7, 0.18, -1.15, 0.28],
      ];
  boulders.forEach(([x, y, z, radius], index) => {
    builder.add(
      "matte",
      index % 2 === 0 ? cliffDark : cliff,
      new IcosahedronGeometry(radius, builder.isFar ? 0 : 1).rotateY(index),
      { at: [x, y, z], scale: [1.3, 0.75, 1] },
      0.6,
    );
  });
  /* The doorway: a dark opening */
  builder.box(
    "matte",
    doorDark,
    [door.width, door.height, 0.05],
    [0, door.height / 2, cliffFront + 0.01],
  );
  if (builder.isFar) {
    return;
  }
  /* A sloping door frame and a cornice with the winged sun */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      plaster,
      [0.22, door.height + 0.1, 0.16],
      [
        side * (door.width / 2 + 0.11),
        (door.height + 0.1) / 2,
        cliffFront + 0.06,
      ],
      [0, 0, side * 0.04],
    );
  });
  builder.box(
    "matte",
    plaster,
    [door.width + 0.6, 0.3, 0.2],
    [0, door.height + 0.2, cliffFront + 0.08],
  );
  builder.box(
    "matte",
    shade(plaster, 0.92),
    [door.width + 0.8, 0.12, 0.3],
    [0, door.height + 0.4, cliffFront + 0.12],
    [0.3, 0, 0],
  );
  const sun: Triple = [0, door.height + 0.2, cliffFront + 0.19];
  builder.cylinder("paint", gold, {
    radius: 0.11,
    length: 0.04,
    at: sun,
    axis: "z",
    segments: 16,
  });
  [-1, 1].forEach((side) => {
    [0, 1, 2].forEach((row) => {
      builder.box(
        "paint",
        row === 1 ? egyptRed : lapis,
        [0.4 - row * 0.08, 0.04, 0.02],
        [side * (0.32 - row * 0.03), sun[1] + 0.06 - row * 0.055, sun[2]],
        [0, 0, -side * 0.12],
      );
    });
  });
  /* Steps worn into the sand down to the door */
  [0, 1, 2].forEach((step) => {
    builder.box(
      "matte",
      shade(cliffLight, 1 - step * 0.05),
      [door.width + 0.5, 0.08, 0.32],
      [0, 0.04, cliffFront + 0.25 + step * 0.32],
    );
  });
  buildGlyphPanel(builder, -1.32);
  buildGlyphPanel(builder, 1.32);
};

/* The sarcophagus, and the mummy inside it */

const buildSarcophagus = (builder: AttractionBuilder) => {
  const { x, z, length, width, height } = sarcophagus;
  builder.box("matte", granite, [length, height, width], [x, height / 2, z]);
  if (builder.isFar) {
    builder.box(
      "paint",
      gold,
      [length - 0.15, 0.2, width - 0.15],
      [x, height + 0.1, z],
    );
    return;
  }
  builder.box(
    "matte",
    shade(granite, 1.12),
    [length + 0.08, 0.08, width + 0.08],
    [x, 0.04, z],
  );
  builder.box(
    "matte",
    shade(granite, 1.12),
    [length + 0.06, 0.06, width + 0.06],
    [x, height - 0.03, z],
  );
  builder.box(
    "matte",
    doorDark,
    [length - 0.16, 0.02, width - 0.16],
    [x, height + 0.005, z],
  );
  /* Carved goddesses' wings along the side, and a band of glyphs */
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      gold,
      [length - 0.3, 0.05, 0.02],
      [x, height * 0.6, z + side * (width / 2 + 0.01)],
    );
    for (let feather = 0; feather < 6; feather++) {
      builder.box(
        "paint",
        feather % 2 === 0 ? lapis : egyptRed,
        [0.1, 0.16, 0.02],
        [x - 0.5 + feather * 0.2, height * 0.35, z + side * (width / 2 + 0.01)],
      );
    }
  });
  /* The wrapped mummy, waiting under the lid */
  builder.sphere(
    "matte",
    linen,
    0.28,
    [x - 0.15, height - 0.05, z],
    [2.4, 0.5, 0.95],
    14,
  );
  builder.sphere(
    "matte",
    linen,
    0.16,
    [x + 0.68, height - 0.02, z],
    [1.1, 0.8, 1],
    10,
  );
  for (let band = 0; band < 6; band++) {
    builder.box(
      "matte",
      shade(linen, 0.88),
      [0.03, 0.06, 0.4],
      [x - 0.65 + band * 0.2, height + 0.06, z],
      [0, 0, 0.3],
    );
  }
};

/* Canopic jars, treasure and Howard Carter's kit */

const buildCanopicJars = (builder: AttractionBuilder) => {
  const { x, z } = canopicAt;
  builder.box("paint", shade(gold, 0.9), [0.9, 0.4, 0.9], [x, 0.2, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", gold, [0.96, 0.05, 0.96], [x, 0.42, z]);
  builder.box("paint", lapis, [0.7, 0.2, 0.01], [x, 0.22, z + 0.455]);
  const heads = [
    { colour: "#d8a878", ears: 0, beak: 0 },
    { colour: "#9a8a6a", ears: 0, beak: 0.04 },
    { colour: palette.black, ears: 0.1, beak: 0.06 },
    { colour: "#7a5a3a", ears: 0, beak: -0.04 },
  ];
  heads.forEach(({ colour, ears, beak }, index) => {
    const jarX = x + (index % 2 === 0 ? -0.2 : 0.2);
    const jarZ = z + (index < 2 ? -0.2 : 0.2);
    builder.lathe(
      "paint",
      plaster,
      [
        [0, 0],
        [0.08, 0],
        [0.13, 0.12],
        [0.12, 0.3],
        [0.07, 0.38],
        [0, 0.38],
      ],
      [jarX, 0.445, jarZ],
      "y",
      10,
    );
    builder.box("paint", lapis, [0.02, 0.14, 0.01], [jarX, 0.62, jarZ + 0.125]);
    const head: Triple = [jarX, 0.89, jarZ];
    builder.sphere("paint", colour, 0.085, head, [1, 1, 1], 8);
    if (beak !== 0) {
      builder.cylinder("paint", beak > 0 ? colour : gold, {
        radius: 0.035,
        radiusEnd: 0.012,
        length: Math.abs(beak) + 0.05,
        at: [head[0], head[1] - 0.02, head[2] + 0.09],
        axis: "z",
        segments: 6,
      });
    }
    if (ears > 0) {
      [-1, 1].forEach((side) => {
        builder.cylinder("paint", colour, {
          radius: 0.03,
          radiusEnd: 0,
          length: 0.12,
          at: [head[0] + side * 0.045, head[1] + 0.12, head[2]],
          segments: 4,
        });
      });
    }
  });
};

const buildTreasure = (builder: AttractionBuilder) => {
  const { x, z } = treasureAt;
  /* A gilded chest, lid open, spilling gold */
  builder.box("paint", goldDeep, [0.8, 0.45, 0.5], [x, 0.225, z]);
  if (builder.isFar) {
    return;
  }
  builder.box("paint", gold, [0.84, 0.06, 0.54], [x, 0.43, z]);
  builder.box(
    "paint",
    goldDeep,
    [0.8, 0.06, 0.4],
    [x, 0.62, z - 0.25],
    [1.2, 0, 0],
  );
  [-0.3, 0.3].forEach((dx) => {
    builder.box("paint", lapis, [0.06, 0.4, 0.52], [x + dx, 0.22, z]);
  });
  for (let coin = 0; coin < 7; coin++) {
    const angle = coin * 2.4;
    const reach = 0.1 + (coin % 3) * 0.12;
    builder.cylinder("metal", gold, {
      radius: 0.05,
      length: 0.015,
      at: [
        x + Math.sin(angle) * reach,
        coin < 4 ? 0.47 : 0.01,
        z + 0.35 + Math.cos(angle) * reach * 0.5,
      ],
      segments: 8,
    });
  }
  builder.sphere("metal", gold, 0.18, [x, 0.46, z], [1.6, 0.45, 1], 10);
  /* Jewels on top of the pile */
  [
    { dx: -0.15, colour: egyptRed },
    { dx: 0.1, colour: lapis },
    { dx: 0.25, colour: egyptGreen },
  ].forEach(({ dx, colour }) => {
    builder.sphere(
      "glass",
      colour,
      0.04,
      [x + dx, 0.53, z + 0.04],
      [1, 1, 1],
      8,
    );
  });
  /* A tall alabaster vase and a golden fan beside it */
  builder.lathe(
    "paint",
    "#f2ead8",
    [
      [0, 0],
      [0.1, 0],
      [0.16, 0.2],
      [0.12, 0.45],
      [0.07, 0.55],
      [0.11, 0.62],
      [0, 0.62],
    ],
    [x + 0.65, 0, z + 0.25],
    "y",
    14,
  );
  builder.bar(
    "paint",
    goldDeep,
    [x - 0.6, 0, z + 0.2],
    [x - 0.6, 0.85, z + 0.2],
    0.03,
    6,
  );
  builder.sphere(
    "paint",
    gold,
    0.22,
    [x - 0.6, 0.95, z + 0.2],
    [1, 0.8, 0.15],
    8,
  );
};

const buildCarterKit = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    return;
  }
  const { x, z } = crateAt;
  builder.box(
    "matte",
    palette.paleTimber,
    [0.7, 0.5, 0.5],
    [x, 0.25, z],
    [0, 0.3, 0],
  );
  [-0.15, 0.15].forEach((up) => {
    builder.box(
      "matte",
      palette.timber,
      [0.72, 0.06, 0.52],
      [x, 0.25 + up, z],
      [0, 0.3, 0],
    );
  });
  /* A lantern on the crate, and a pickaxe and brush leaning on it */
  builder.box("metal", palette.darkSteel, [0.16, 0.03, 0.16], [x, 0.515, z]);
  builder.box("glow", palette.warmLight, [0.12, 0.18, 0.12], [x, 0.62, z]);
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.1,
    radiusEnd: 0.02,
    length: 0.08,
    at: [x, 0.75, z],
    segments: 8,
  });
  builder.torus("metal", palette.darkSteel, 0.06, 0.01, [x, 0.82, z], "z", 10);
  builder.bar(
    "matte",
    palette.timber,
    [x - 0.5, 0, z + 0.25],
    [x - 0.42, 0.75, z + 0.1],
    0.05,
    6,
  );
  builder.bar(
    "metal",
    palette.darkSteel,
    [x - 0.62, 0.75, z + 0.12],
    [x - 0.22, 0.74, z + 0.08],
    0.04,
    6,
  );
  builder.bar(
    "matte",
    palette.paleTimber,
    [x + 0.45, 0, z + 0.2],
    [x + 0.38, 0.4, z + 0.05],
    0.03,
    5,
  );
  builder.box(
    "matte",
    "#3a2a1e",
    [0.08, 0.1, 0.05],
    [x + 0.46, 0.04, z + 0.22],
  );
  /* Rope barrier posts, keeping visitors off the dig */
  [
    [-1.2, 2.05],
    [0.0, 2.15],
    [1.2, 2.05],
  ].forEach(([px, pz]) => {
    builder.cylinder("paint", gold, {
      radius: 0.04,
      length: 0.75,
      at: [px, 0.375, pz],
      segments: 8,
    });
    builder.cylinder("paint", palette.darkTimber, {
      radius: 0.12,
      length: 0.05,
      at: [px, 0.025, pz],
      segments: 10,
    });
    builder.sphere("paint", gold, 0.06, [px, 0.78, pz], [1, 1, 1], 8);
  });
  [
    [-1.2, 2.05, 0.0, 2.15],
    [0.0, 2.15, 1.2, 2.05],
  ].forEach(([fromX, fromZ, toX, toZ]) => {
    builder.bar(
      "matte",
      egyptRed,
      [fromX, 0.68, fromZ],
      [(fromX + toX) / 2, 0.58, (fromZ + toZ) / 2],
      0.03,
      5,
    );
    builder.bar(
      "matte",
      egyptRed,
      [(fromX + toX) / 2, 0.58, (fromZ + toZ) / 2],
      [toX, 0.68, toZ],
      0.03,
      5,
    );
  });
};

const buildTorchStands = (builder: AttractionBuilder) => {
  torchSpots.forEach(({ x, z }) => {
    builder.cylinder("matte", cliffDark, {
      radius: 0.18,
      radiusEnd: 0.12,
      length: 0.2,
      at: [x, 0.1, z],
      segments: 8,
    });
    builder.cylinder("matte", palette.darkTimber, {
      radius: 0.05,
      length: 1.1,
      at: [x, 0.75, z],
      segments: 8,
    });
    builder.cylinder("metal", palette.darkSteel, {
      radius: 0.07,
      radiusEnd: 0.14,
      length: 0.16,
      at: [x, flameHeight - 0.08, z],
      segments: builder.isFar ? 6 : 12,
    });
    if (builder.isFar) {
      builder.sphere(
        "glow",
        flame,
        0.1,
        [x, flameHeight + 0.1, z],
        [1, 1.6, 1],
        6,
      );
    }
  });
};

/* The moving parts */

const buildLid = (builder: AttractionBuilder) => {
  /* A golden coffin lid shaped like the pharaoh, head towards +x */
  builder.sphere("paint", gold, 0.36, [-0.12, 0.06, 0], [2.25, 0.32, 1], 14);
  builder.sphere("paint", gold, 0.17, [-0.86, 0.1, 0], [0.8, 0.8, 1.1], 8);
  /* The striped nemes headdress, its lappets falling either side of the face */
  const head: Triple = [0.72, 0.12, 0];
  builder.sphere("paint", lapis, 0.24, head, [1, 0.65, 1.05], 12);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      lapis,
      [0.3, 0.08, 0.1],
      [head[0] - 0.14, head[1] + 0.06, side * 0.2],
    );
    [-0.1, 0, 0.1].forEach((along) => {
      builder.box(
        "paint",
        gold,
        [0.03, 0.085, 0.105],
        [head[0] - 0.14 + along, head[1] + 0.06, side * 0.2],
      );
    });
  });
  /* The golden face, looking up, with a cobra on the brow and a beard */
  builder.sphere(
    "paint",
    shade(gold, 1.1),
    0.15,
    [head[0] + 0.02, head[1] + 0.1, head[2]],
    [1, 0.55, 0.85],
    10,
  );
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      palette.black,
      0.025,
      [head[0] + 0.06, head[1] + 0.17, side * 0.05],
      [1, 0.6, 1.4],
      6,
    );
  });
  builder.bar(
    "paint",
    lapis,
    [head[0] - 0.1, head[1] + 0.15, 0],
    [head[0] - 0.24, head[1] + 0.13, 0],
    0.045,
    6,
  );
  builder.sphere(
    "paint",
    gold,
    0.04,
    [head[0] + 0.17, head[1] + 0.14, 0],
    [1, 1.2, 1],
    6,
  );
  /* A broad collar of coloured beads */
  [0, 1].forEach((row) => {
    builder.torus(
      "paint",
      row === 1 ? egyptRed : lapis,
      0.2 + row * 0.04,
      0.025,
      [0.4 - row * 0.05, 0.14, 0],
      "x",
      12,
    );
  });
  /* Crossed arms holding the crook and flail */
  [-1, 1].forEach((side) => {
    builder.bar(
      "paint",
      shade(gold, 0.9),
      [0.32, 0.17, side * 0.22],
      [0.08, 0.2, -side * 0.08],
      0.08,
      8,
    );
    builder.sphere(
      "paint",
      shade(gold, 1.05),
      0.05,
      [0.08, 0.21, -side * 0.08],
      [1, 0.8, 1],
      6,
    );
  });
  builder.bar("paint", lapis, [0.0, 0.24, 0.08], [0.42, 0.24, -0.18], 0.03, 6);
  builder.torus("paint", lapis, 0.04, 0.012, [0.44, 0.24, -0.22], "y", 10);
  builder.bar("paint", gold, [0.0, 0.25, -0.08], [0.42, 0.25, 0.18], 0.03, 6);
  [-0.02, 0.02, 0.06].forEach((spread) => {
    builder.bar(
      "paint",
      egyptRed,
      [0.42, 0.25, 0.18],
      [0.5, 0.24, 0.22 + spread],
      0.02,
      4,
    );
  });
  /* Feathered wings across the body */
  for (let row = 0; row < 3; row++) {
    for (let feather = 0; feather < 5; feather++) {
      builder.box(
        "paint",
        (row + feather) % 2 === 0 ? lapis : egyptRed,
        [0.08, 0.02, 0.14],
        [-0.15 - feather * 0.13, 0.17 - row * 0.012, -0.22 + row * 0.22],
        [0, 0, 0.1],
      );
    }
  }
};

const buildFlame = (builder: AttractionBuilder) => {
  builder.sphere("glow", flame, 0.11, [0, 0.1, 0], [1, 1.6, 1], 8);
  builder.sphere("glow", "#ffe08a", 0.06, [0, 0.08, 0], [1, 1.5, 1], 6);
  builder.cylinder("glow", "#ff7a2a", {
    radius: 0.05,
    radiusEnd: 0,
    length: 0.16,
    at: [0.02, 0.3, 0],
    segments: 8,
  });
};

const buildScarab = (builder: AttractionBuilder) => {
  builder.sphere("metal", "#2a5a4a", 0.07, [0, 0.05, 0], [1, 0.6, 1.3], 10);
  builder.box("metal", "#1a3a30", [0.005, 0.02, 0.15], [0, 0.085, -0.01]);
  builder.sphere("metal", "#1a3a30", 0.035, [0, 0.04, 0.09], [1.2, 0.7, 1], 6);
  [-1, 1].forEach((side) => {
    [0.04, -0.01, -0.06].forEach((z) => {
      builder.bar(
        "matte",
        palette.black,
        [side * 0.05, 0.03, z],
        [side * 0.1, 0, z + 0.02],
        0.012,
        3,
      );
    });
  });
};

export const pharaohTombModel: CuriosityModel = {
  kind: "pharaoh-tomb",
  islandId: "sunscorch-sands",
  name: "Pharaoh's Tomb",
  fact: "In 1922 the archaeologist Howard Carter found the tomb of the boy pharaoh Tutankhamun in the Valley of the Kings in Egypt. It was packed with treasure, including a coffin of solid gold and a famous golden mask. The Ancient Egyptians wrote in picture signs called hieroglyphs, and kept a mummy's organs in four canopic jars.",
  curriculumLink:
    "History, Key Stage 2: the achievements of the earliest civilisations, with a depth study of Ancient Egypt.",
  footprint: 5,
  setting: "inland",
  signSpot: { x: 1.6, z: 3.7 },
  padColour: sand,
  build: (builder) => {
    buildCliff(builder);
    buildSarcophagus(builder);
    buildCanopicJars(builder);
    buildTreasure(builder);
    buildCarterKit(builder);
    buildTorchStands(builder);
    addSignBoard(builder, [1.6, 0, 3.7], signColour);
  },
  moving: [
    {
      name: "coffin lid",
      pivot: lidPivot,
      build: buildLid,
      motion: { kind: "rise", reach: 5.5, height: 0.5, period: 2.6 },
    },
    {
      name: "left torch flame",
      pivot: [torchSpots[0].x, flameHeight, torchSpots[0].z],
      build: buildFlame,
      motion: { kind: "flicker", period: 0.6 },
    },
    {
      name: "right torch flame",
      pivot: [torchSpots[1].x, flameHeight, torchSpots[1].z],
      build: buildFlame,
      motion: { kind: "flicker", period: 0.77, phase: 1.3 },
    },
  ],
  wanderers: [
    {
      name: "scarabs",
      build: buildScarab,
      count: 2,
      centre: { x: 0.2, z: 2.9 },
      radius: 1.2,
      speed: 0.3,
    },
  ],
  blockers: [
    ...listWallBlockers({ x: -2.9, z: -2.0 }, { x: 2.9, z: -2.0 }, 0.65, 0.6),
    { x: sarcophagus.x - 0.55, z: sarcophagus.z, radius: 0.5 },
    { x: sarcophagus.x + 0.55, z: sarcophagus.z, radius: 0.5 },
    ...torchSpots.map(({ x, z }) => ({ x, z, radius: 0.22 })),
    { x: canopicAt.x, z: canopicAt.z, radius: 0.6 },
    { x: treasureAt.x, z: treasureAt.z, radius: 0.6 },
    { x: crateAt.x, z: crateAt.z, radius: 0.45 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Peek in the sarcophagus",
    news: "Creeeak! The golden lid lifted, and inside lay a mummy wrapped in linen, sleeping for over 3,000 years.",
  },
};
