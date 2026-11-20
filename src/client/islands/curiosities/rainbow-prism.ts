import { CylinderGeometry, TorusGeometry } from "three";
import {
  addSignBoard,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const pedestalStone = "#c9c6d8";
const pedestalDark = "#8d89a3";
const prismGlass = "#d8ecff";
const brass = "#d1a84a";
const lampBody = "#2b2f6b";
const screenWhite = "#f4f3f8";
const beamWhite = "#fffbe8";
const nightBlue = "#1f2a5c";
const signColour = "#3a2a6b";

/* Red, orange, yellow, green, blue, indigo and violet */
const rainbow: readonly string[] = [
  "#ff3b3b",
  "#ff8a2a",
  "#ffe23a",
  "#4fdc5a",
  "#3a8bff",
  "#5b4adc",
  "#b05cff",
];

const beamHeight = 1.45;
const prismAt = { x: -0.2, z: -0.7 };
const prismRadius = 0.72;
const prismHeight = 1.0;
const pedestalTop = beamHeight - prismHeight / 2;
const lampAt = { x: -3.3, z: -0.95 };
const screenX = 3.2;
/* Where the light goes into the prism and comes out of it */
const entry: Triple = [prismAt.x - 0.36, beamHeight, prismAt.z - 0.2];
const exit: Triple = [prismAt.x + 0.34, beamHeight, prismAt.z - 0.05];
/* Each colour bends a little more than the one before: red least, violet most */
const bendOf = (index: number) => 0.32 + index * 0.075;

/** Where a colour's ray lands on the screen. */
const landingOf = (index: number): Triple => [
  screenX - 0.06,
  beamHeight,
  exit[2] + (screenX - 0.06 - exit[0]) * Math.tan(bendOf(index)),
];

const buildPedestal = (builder: AttractionBuilder) => {
  const { x, z } = prismAt;
  const segments = builder.isFar ? 8 : 32;
  builder.cylinder("matte", pedestalDark, {
    radius: 0.7,
    radiusEnd: 0.6,
    length: 0.22,
    at: [x, 0.11, z],
    segments,
  });
  builder.cylinder("matte", pedestalStone, {
    radius: 0.38,
    radiusEnd: 0.32,
    length: pedestalTop - 0.38,
    at: [x, 0.22 + (pedestalTop - 0.38) / 2, z],
    segments,
  });
  builder.cylinder("matte", pedestalDark, {
    radius: 0.72,
    radiusEnd: 0.6,
    length: 0.16,
    at: [x, pedestalTop - 0.08, z],
    segments,
  });
  /* The prism: a glass bar with three sides, its point to the back */
  builder.add(
    "glass",
    prismGlass,
    new CylinderGeometry(prismRadius, prismRadius, prismHeight, 3).rotateY(
      Math.PI,
    ),
    { at: [x, beamHeight, z] },
  );
  if (builder.isFar) {
    return;
  }
  /* Fluting on the column, and a brass cradle round the prism's foot */
  for (let flute = 0; flute < 10; flute++) {
    const angle = (flute / 10) * Math.PI * 2;
    builder.box(
      "matte",
      shade(pedestalStone, 0.9),
      [0.06, pedestalTop - 0.6, 0.04],
      [
        x + Math.sin(angle) * 0.35,
        0.22 + (pedestalTop - 0.38) / 2,
        z + Math.cos(angle) * 0.35,
      ],
      [0, angle, 0],
    );
  }
  builder.add(
    "metal",
    brass,
    new CylinderGeometry(
      prismRadius + 0.06,
      prismRadius + 0.06,
      0.08,
      3,
    ).rotateY(Math.PI),
    { at: [x, pedestalTop + 0.04, z] },
  );
  builder.add(
    "metal",
    brass,
    new CylinderGeometry(
      prismRadius + 0.05,
      prismRadius + 0.05,
      0.05,
      3,
      1,
      true,
    ).rotateY(Math.PI),
    { at: [x, beamHeight + prismHeight / 2, z] },
  );
  /* A glint along each edge of the glass */
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => {
    const edge = angle + Math.PI;
    builder.box(
      "glow",
      "#ffffff",
      [0.025, prismHeight, 0.025],
      [
        x + Math.sin(edge) * prismRadius,
        beamHeight,
        z + Math.cos(edge) * prismRadius,
      ],
    );
  });
};

/** A brass lantern on a stand, shining light through a slit. */
const buildLamp = (builder: AttractionBuilder) => {
  const { x, z } = lampAt;
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.06,
    length: beamHeight - 0.3,
    at: [x, (beamHeight - 0.3) / 2, z],
    segments: 8,
  });
  builder.roundedBox("paint", lampBody, [0.7, 0.55, 0.55], 0.08, [
    x,
    beamHeight,
    z,
  ]);
  if (builder.isFar) {
    return;
  }
  [0, 2.1, 4.2].forEach((angle) => {
    builder.bar(
      "metal",
      palette.darkSteel,
      [x, 0.4, z],
      [x + Math.sin(angle) * 0.45, 0, z + Math.cos(angle) * 0.45],
      0.05,
      6,
    );
  });
  /* The lens and slit facing the prism */
  builder.cylinder("metal", brass, {
    radius: 0.2,
    radiusEnd: 0.16,
    length: 0.25,
    at: [x + 0.45, beamHeight, z],
    axis: "x",
    segments: 18,
  });
  builder.cylinder("glow", beamWhite, {
    radius: 0.15,
    length: 0.02,
    at: [x + 0.58, beamHeight, z],
    axis: "x",
    segments: 18,
  });
  builder.box(
    "paint",
    palette.black,
    [0.02, 0.3, 0.05],
    [x + 0.59, beamHeight, z + 0.09],
  );
  builder.box(
    "paint",
    palette.black,
    [0.02, 0.3, 0.05],
    [x + 0.59, beamHeight, z - 0.09],
  );
  /* Chimney and vents on top */
  builder.cylinder("metal", brass, {
    radius: 0.1,
    length: 0.25,
    at: [x, beamHeight + 0.4, z],
    segments: 12,
  });
  builder.cylinder("metal", brass, {
    radius: 0.16,
    radiusEnd: 0.02,
    length: 0.1,
    at: [x, beamHeight + 0.57, z],
    segments: 12,
  });
  [-0.12, 0, 0.12].forEach((offset) => {
    builder.box(
      "glow",
      "#ffe58a",
      [0.25, 0.03, 0.01],
      [x, beamHeight + 0.1 + offset, z + 0.28],
    );
  });
};

/** The white screen that catches the colours. */
const buildScreen = (builder: AttractionBuilder) => {
  const first = landingOf(0)[2];
  const last = landingOf(rainbow.length - 1)[2];
  const middle = (first + last) / 2;
  const width = last - first + 1.0;
  builder.box(
    "paint",
    screenWhite,
    [0.06, 1.3, width],
    [screenX, beamHeight, middle],
  );
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      nightBlue,
      [0.1, beamHeight + 0.75, 0.1],
      [
        screenX + 0.04,
        (beamHeight + 0.75) / 2,
        middle + side * (width / 2 + 0.05),
      ],
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.box(
    "paint",
    nightBlue,
    [0.12, 0.1, width + 0.2],
    [screenX + 0.04, beamHeight + 0.7, middle],
  );
  builder.box(
    "paint",
    nightBlue,
    [0.12, 0.1, width + 0.2],
    [screenX + 0.04, beamHeight - 0.7, middle],
  );
  /* Faint painted bands, so the colours show by day too */
  rainbow.forEach((colour, index) => {
    const [, , z] = landingOf(index);
    builder.box(
      "paint",
      shade(colour, 1.05),
      [0.01, 0.7, 0.1],
      [screenX - 0.035, beamHeight, z],
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      nightBlue,
      [0.5, 0.06, 0.3],
      [screenX + 0.04, 0.03, middle + side * (width / 2 + 0.05)],
    );
  });
};

/** The white light from the lamp to the prism, and its path through the glass. */
const buildWhiteBeam = (builder: AttractionBuilder) => {
  const start: Triple = [0, 0, 0];
  const end: Triple = [entry[0] - (lampAt.x + 0.6), 0, entry[2] - lampAt.z];
  builder.bar("glow", beamWhite, start, end, 0.11, 8);
  builder.bar(
    "glow",
    beamWhite,
    end,
    [exit[0] - (lampAt.x + 0.6), 0, exit[2] - lampAt.z],
    0.07,
    6,
  );
};

/** The fan of seven colours spreading from the prism to the screen. */
const buildRainbowFan = (builder: AttractionBuilder) => {
  rainbow.forEach((colour, index) => {
    const landing = landingOf(index);
    const to: Triple = [landing[0] - exit[0], 0, landing[2] - exit[2]];
    const length = Math.hypot(to[0], to[2]);
    builder.box(
      "glow",
      colour,
      [length, 0.1 + index * 0.012, 0.035],
      [to[0] / 2, 0, to[2] / 2],
      [0, -bendOf(index), 0],
    );
    /* The bright patch where it lands */
    builder.box("glow", colour, [0.012, 0.6, 0.12], [to[0] + 0.02, 0, to[2]]);
  });
};

/** Newton's colour wheel: spun fast, its seven colours mix back into white. */
const wheelAt: Triple = [-2.55, 1.05, 1.75];
const buildColourWheel = (builder: AttractionBuilder) => {
  const slice = (Math.PI * 2) / rainbow.length;
  rainbow.forEach((colour, index) => {
    builder.add(
      "paint",
      colour,
      new CylinderGeometry(
        0.42,
        0.42,
        0.03,
        4,
        1,
        false,
        index * slice,
        slice,
      ).rotateX(Math.PI / 2),
    );
  });
  builder.cylinder("metal", brass, {
    radius: 0.05,
    length: 0.08,
    at: [0, 0, 0.03],
    axis: "z",
    segments: 10,
  });
};

const buildGrounds = (builder: AttractionBuilder) => {
  builder.box("matte", palette.paving, [8.2, 0.03, 1.2], [0, 0.015, -0.85]);
  builder.box("matte", palette.paving, [1.2, 0.03, 3.6], [-0.6, 0.015, 2.3]);
  if (builder.isFar) {
    return;
  }
  /* The colour wheel's stand */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: wheelAt[1],
    at: [wheelAt[0], wheelAt[1] / 2, wheelAt[2] - 0.06],
    segments: 8,
  });
  builder.cylinder("matte", pedestalDark, {
    radius: 0.25,
    length: 0.08,
    at: [wheelAt[0], 0.04, wheelAt[2] - 0.06],
    segments: 14,
  });
  /* A crank handle on the back of the wheel */
  builder.box(
    "metal",
    brass,
    [0.25, 0.04, 0.04],
    [wheelAt[0] + 0.1, wheelAt[1], wheelAt[2] - 0.1],
  );
  /* A little row of coloured glass pebbles and a bench */
  rainbow.forEach((colour, index) => {
    builder.sphere(
      "glass",
      colour,
      0.09,
      [1.0 + index * 0.28, 0.06, 2.3],
      [1, 0.6, 1],
      8,
    );
  });
  builder.box("paint", nightBlue, [1.4, 0.08, 0.42], [2.2, 0.45, 3.0]);
  [-0.6, 0.6].forEach((offset) => {
    builder.box(
      "metal",
      palette.darkSteel,
      [0.06, 0.45, 0.36],
      [2.2 + offset, 0.22, 3.0],
    );
  });
  builder.box("paint", nightBlue, [1.4, 0.35, 0.06], [2.2, 0.68, 3.2]);
  /* A poster of the spectrum on a post */
  builder.cylinder("metal", palette.darkSteel, {
    radius: 0.04,
    length: 1.2,
    at: [-2.9, 0.6, 2.95],
    segments: 8,
  });
  builder.box("paint", screenWhite, [0.75, 0.45, 0.04], [-2.9, 1.35, 2.95]);
  rainbow.forEach((colour, index) => {
    builder.box(
      "paint",
      colour,
      [0.08, 0.3, 0.01],
      [-3.17 + index * 0.09, 1.35, 2.98],
    );
  });
};

/** A rainbow arch over the path in, its colours in the right order: red outside. */
const archAt = { x: -0.6, z: 3.35 };
const buildArch = (builder: AttractionBuilder) => {
  const around = builder.isFar ? 6 : 28;
  const bands = builder.isFar ? ["#ff3b3b"] : rainbow;
  bands.forEach((colour, index) => {
    builder.add(
      "paint",
      colour,
      new TorusGeometry(
        1.32 - index * 0.065,
        builder.isFar ? 0.2 : 0.035,
        builder.isFar ? 3 : 6,
        around,
        Math.PI,
      ),
      { at: [archAt.x, 0.9, archAt.z] },
    );
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      nightBlue,
      [0.5, 0.9, 0.2],
      [archAt.x + side * 1.12, 0.45, archAt.z],
    );
  });
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      brass,
      [0.56, 0.06, 0.26],
      [archAt.x + side * 1.12, 0.92, archAt.z],
    );
    builder.box(
      "metal",
      brass,
      [0.56, 0.06, 0.26],
      [archAt.x + side * 1.12, 0.03, archAt.z],
    );
    builder.sphere(
      "glow",
      "#ffe58a",
      0.06,
      [archAt.x + side * 1.12, 0.6, archAt.z + 0.11],
      [1, 1, 0.4],
      8,
    );
  });
  /* A cloud at each end of the rainbow */
  [-1, 1].forEach((side) => {
    [
      [0, 0.12, 0.2],
      [0.16, 0.05, 0.15],
      [-0.16, 0.05, 0.15],
    ].forEach(([dx, dy, size]) => {
      builder.sphere(
        "matte",
        palette.white,
        size,
        [archAt.x + side * 1.12 + dx, 1.0 + dy, archAt.z + 0.05],
        [1, 0.8, 0.8],
        10,
      );
    });
  });
};

export const rainbowPrismModel: CuriosityModel = {
  kind: "rainbow-prism",
  islandId: "starfall-isle",
  name: "Rainbow Prism",
  fact: "Light travels in straight lines. White light is really a mixture of colours, and when it shines through a glass prism, each colour bends by a different amount. They spread out into a rainbow: red, orange, yellow, green, blue, indigo and violet. Spin the colour wheel fast and the colours mix back into white.",
  curriculumLink:
    "Science, Year 6: light. Recognise that light appears to travel in straight lines, and explore how light behaves.",
  footprint: 4.9,
  setting: "inland",
  signSpot: { x: 0.9, z: 4.2 },
  build: (builder) => {
    buildGrounds(builder);
    buildPedestal(builder);
    buildLamp(builder);
    buildScreen(builder);
    buildArch(builder);
    if (builder.isFar) {
      builder.cylinder("paint", "#ffe23a", {
        radius: 0.42,
        length: 0.03,
        at: wheelAt,
        axis: "z",
        segments: 8,
      });
    }
    addSignBoard(builder, [0.9, 0, 4.2], signColour);
  },
  moving: [
    {
      name: "white-beam",
      pivot: [lampAt.x + 0.6, beamHeight, lampAt.z],
      build: buildWhiteBeam,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "rainbow",
      pivot: exit,
      build: buildRainbowFan,
      motion: { kind: "wake", reach: 7 },
    },
    {
      name: "colour-wheel",
      pivot: wheelAt,
      build: buildColourWheel,
      motion: { kind: "whirl", axis: "z", idle: 0.5, speed: 18, reach: 6 },
    },
  ],
  blockers: [
    { x: prismAt.x, z: prismAt.z, radius: 0.8 },
    { x: lampAt.x, z: lampAt.z, radius: 0.5 },
    {
      x: screenX,
      z: (landingOf(0)[2] + landingOf(rainbow.length - 1)[2]) / 2 - 0.5,
      radius: 0.3,
    },
    {
      x: screenX,
      z: (landingOf(0)[2] + landingOf(rainbow.length - 1)[2]) / 2,
      radius: 0.3,
    },
    {
      x: screenX,
      z: (landingOf(0)[2] + landingOf(rainbow.length - 1)[2]) / 2 + 0.5,
      radius: 0.3,
    },
    { x: wheelAt[0], z: wheelAt[2], radius: 0.3 },
    { x: 2.2, z: 3.05, radius: 0.6 },
    { x: archAt.x - 1.12, z: archAt.z, radius: 0.3 },
    { x: archAt.x + 1.12, z: archAt.z, radius: 0.3 },
    { x: -2.9, z: 2.95, radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Split the light",
    news: "Whoosh! The white light went into the prism and came out as a rainbow: red, orange, yellow, green, blue, indigo and violet.",
  },
};
