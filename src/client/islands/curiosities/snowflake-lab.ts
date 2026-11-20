import { BoxGeometry, CylinderGeometry } from "three";
import {
  addDoor,
  addGableRoof,
  addSignBoard,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type LocalBlocker,
  type MovingPart,
  type Triple,
} from "../attractions/attraction-kit.js";
import type { CuriosityModel } from "./curiosity-kit.js";

const snowPad = "#e8eef2";
const snowWhite = "#fbfdff";
const snowShadow = "#d9e4ec";
const hutRed = "#c7432f";
const hutTrim = "#f2efe8";
const iceGlass = "#cfeaf8";
const iceDeep = "#9fd0ec";
const microscopeBody = "#e9edf1";
const microscopeDark = "#2c3238";
const signColour = "#2f6f9a";

const hut = { x: -1.75, z: -1.7, width: 2.5, depth: 2.0, height: 1.95 };
const hutFloor = 0.32;
const bench = { x: 1.0, z: -0.25, width: 1.7, depth: 0.75, height: 0.78 };
const microscopeAt: Triple = [bench.x + 0.1, bench.height, bench.z - 0.05];
const lampAt: Triple = [
  microscopeAt[0],
  microscopeAt[1] + 0.42,
  microscopeAt[2],
];
const screenAt: Triple = [3.15, 0, -1.75];
const balloonStake: Triple = [-3.45, 0, 0.6];
const balloonAt: Triple = [-3.0, 4.3, 0.2];
const boardAt: Triple = [-0.55, 0, 1.25];
const signAt: Triple = [1.5, 0, 4.15];

interface Flake {
  name: string;
  x: number;
  z: number;
  height: number;
  radius: number;
  pattern: "fern" | "plate" | "star";
  phase: number;
}

const flakes: readonly Flake[] = [
  {
    name: "fern",
    x: -2.95,
    z: 2.0,
    height: 2.35,
    radius: 0.78,
    pattern: "fern",
    phase: 0,
  },
  {
    name: "plate",
    x: 0.55,
    z: -3.25,
    height: 3.2,
    radius: 0.92,
    pattern: "plate",
    phase: 0.4,
  },
  {
    name: "star",
    x: 3.25,
    z: 1.25,
    height: 2.6,
    radius: 0.82,
    pattern: "star",
    phase: 0.8,
  },
];

const flakeCentre = ({ x, z, height }: Flake): Triple => [x, height, z];

/* ------------------------------------------------------------------ */
/* The hut                                                             */
/* ------------------------------------------------------------------ */

const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  const wallY = hutFloor + height / 2;
  /* Skids it stands on, so it can be towed across the ice */
  [-0.7, 0.7].forEach((offset) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [width + 0.4, 0.2, 0.22],
      [x, 0.1, z + offset],
    );
  });
  builder.box("paint", hutRed, [width, height, depth], [x, wallY, z]);
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.6,
    at: [x, hutFloor + height, z],
    colour: snowWhite,
    overhang: 0.2,
    thickness: 0.16,
  });
  /* The gable ends filled in */
  builder.add(
    "paint",
    hutRed,
    new BoxGeometry(
      width - 0.04,
      (depth / 2) * Math.SQRT2,
      (depth / 2) * Math.SQRT2,
    )
      .rotateX(Math.PI / 4)
      .scale(1, 0.6 / (depth / 2), 1),
    { at: [x, hutFloor + height, z] },
    undefined,
  );
  if (builder.isFar) {
    return;
  }
  /* White corner trims and a skirting board */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "paint",
        hutTrim,
        [0.1, height, 0.1],
        [x + sideX * (width / 2), wallY, z + sideZ * (depth / 2)],
      );
    });
  });
  builder.box(
    "paint",
    hutTrim,
    [width + 0.06, 0.12, depth + 0.06],
    [x, hutFloor + 0.06, z],
  );
  /* Snow piled on the roof's edge, in soft lumps */
  for (let lump = 0; lump < 6; lump++) {
    builder.sphere(
      "matte",
      snowWhite,
      0.2,
      [
        x - width / 2 + 0.2 + lump * ((width - 0.4) / 5),
        hutFloor + height + 0.02,
        z + depth / 2 + 0.22,
      ],
      [1.4, 0.55, 0.8],
      6,
    );
  }
  addDoor(builder, {
    at: [x + 0.55, hutFloor, z + depth / 2 + 0.01],
    width: 0.7,
    height: 1.45,
    colour: shade(hutRed, 0.75),
    frame: hutTrim,
  });
  addWindow(builder, {
    at: [x - 0.55, hutFloor + 1.15, z + depth / 2 + 0.01],
    width: 0.65,
    height: 0.55,
    frame: hutTrim,
    isLit: true,
  });
  addWindow(builder, {
    at: [x + width / 2 + 0.01, hutFloor + 1.15, z],
    width: 0.6,
    height: 0.5,
    frame: hutTrim,
    turn: Math.PI / 2,
    isLit: true,
  });
  /* Steps up to the door */
  [0, 1].forEach((step) => {
    builder.box(
      "matte",
      palette.timber,
      [0.8, 0.12, 0.3 - step * 0.12],
      [x + 0.55, 0.06 + step * 0.13, z + depth / 2 + 0.2 - step * 0.06],
    );
  });
  /* A radio mast, its aerials and a little anemometer on top */
  const mast: Triple = [x - width / 2 + 0.25, 0, z - depth / 2 + 0.25];
  builder.bar(
    "metal",
    palette.steel,
    [mast[0], hutFloor + height, mast[2]],
    [mast[0], hutFloor + height + 1.7, mast[2]],
    0.05,
    6,
  );
  [0.9, 1.3].forEach((up) => {
    builder.box(
      "metal",
      palette.steel,
      [0.5, 0.025, 0.025],
      [mast[0], hutFloor + height + up, mast[2]],
    );
  });
  const top = hutFloor + height + 1.75;
  for (let cup = 0; cup < 3; cup++) {
    const angle = (cup / 3) * Math.PI * 2;
    const end: Triple = [
      mast[0] + Math.sin(angle) * 0.22,
      top,
      mast[2] + Math.cos(angle) * 0.22,
    ];
    builder.bar("metal", palette.steel, [mast[0], top, mast[2]], end, 0.02, 4);
    builder.sphere("paint", "#e05a3a", 0.06, end, [1, 1, 1], 8);
  }
  /* A flag of the research station, flying by the door */
  builder.box(
    "paint",
    "#f0b62e",
    [0.4, 0.26, 0.02],
    [x + width / 2 + 0.05, hutFloor + height + 0.35, z + depth / 2 + 0.1],
  );
  builder.bar(
    "metal",
    palette.steel,
    [x + width / 2 - 0.15, hutFloor + 1.4, z + depth / 2 + 0.1],
    [x + width / 2 - 0.15, hutFloor + height + 0.5, z + depth / 2 + 0.1],
    0.03,
    5,
  );
  /* Stacked crates of kit, stencilled */
  [
    [x - 1.0, 0.22, z + depth / 2 + 0.45, 0.1],
    [x - 0.45, 0.22, z + depth / 2 + 0.55, -0.15],
    [x - 0.78, 0.62, z + depth / 2 + 0.5, 0.25],
  ].forEach(([cx, cy, cz, turn], index) => {
    builder.box(
      "matte",
      index === 2 ? "#3f6f8f" : palette.paleTimber,
      [0.48, 0.4, 0.4],
      [cx, cy, cz],
      [0, turn, 0],
    );
    builder.box(
      "paint",
      index === 2 ? palette.white : palette.darkTimber,
      [0.3, 0.07, 0.01],
      [cx + Math.sin(turn) * 0.205, cy, cz + Math.cos(turn) * 0.205],
      [0, turn, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The bench and the microscope                                       */
/* ------------------------------------------------------------------ */

const buildBench = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = bench;
  builder.box(
    "matte",
    palette.paleTimber,
    [width, 0.08, depth],
    [x, height - 0.04, z],
  );
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "matte",
        palette.timber,
        [0.08, height - 0.08, 0.08],
        [
          x + sideX * (width / 2 - 0.08),
          (height - 0.08) / 2,
          z + sideZ * (depth / 2 - 0.08),
        ],
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.box("matte", palette.timber, [width - 0.2, 0.06, 0.06], [x, 0.25, z]);
  /* Black velvet cards for catching snowflakes, with flakes on them */
  [
    [x - 0.6, z + 0.1, 0.2],
    [x + 0.62, z + 0.05, -0.3],
  ].forEach(([cx, cz, turn]) => {
    builder.box(
      "matte",
      palette.black,
      [0.36, 0.015, 0.26],
      [cx, height + 0.008, cz],
      [0, turn, 0],
    );
    [
      [-0.08, -0.05],
      [0.07, 0.06],
      [0.1, -0.07],
      [-0.06, 0.07],
    ].forEach(([dx, dz]) => {
      for (let arm = 0; arm < 3; arm++) {
        builder.box(
          "glow",
          "#e8f6ff",
          [0.05, 0.006, 0.008],
          [cx + dx, height + 0.02, cz + dz],
          [0, (arm * Math.PI) / 3, 0],
        );
      }
    });
  });
  /* A magnifying glass and a notebook with a hexagon sketched in it */
  builder.torus(
    "metal",
    palette.brass,
    0.09,
    0.012,
    [x - 0.3, height + 0.015, z + 0.24],
    "y",
    16,
  );
  builder.cylinder("glass", iceGlass, {
    radius: 0.085,
    length: 0.01,
    at: [x - 0.3, height + 0.015, z + 0.24],
    segments: 14,
  });
  builder.bar(
    "matte",
    palette.darkTimber,
    [x - 0.21, height + 0.02, z + 0.27],
    [x - 0.02, height + 0.02, z + 0.33],
    0.03,
    5,
  );
  builder.box(
    "matte",
    palette.cream,
    [0.3, 0.02, 0.22],
    [x + 0.55, height + 0.01, z - 0.22],
    [0, 0.15, 0],
  );
  for (let side = 0; side < 6; side++) {
    const angle = (side / 6) * Math.PI * 2;
    builder.box(
      "matte",
      "#3b5f8a",
      [0.055, 0.005, 0.007],
      [
        x + 0.55 + Math.sin(angle) * 0.048,
        height + 0.022,
        z - 0.22 + Math.cos(angle) * 0.048,
      ],
      [0, angle + Math.PI / 2, 0],
    );
  }
  /* A stool to sit at the microscope */
  builder.cylinder("paint", "#3f6f8f", {
    radius: 0.22,
    length: 0.06,
    at: [microscopeAt[0], 0.55, z + 0.75],
    segments: 16,
  });
  [0, 1, 2].forEach((leg) => {
    const angle = (leg / 3) * Math.PI * 2;
    builder.bar(
      "metal",
      palette.steel,
      [
        microscopeAt[0] + Math.sin(angle) * 0.12,
        0.53,
        z + 0.75 + Math.cos(angle) * 0.12,
      ],
      [
        microscopeAt[0] + Math.sin(angle) * 0.22,
        0,
        z + 0.75 + Math.cos(angle) * 0.22,
      ],
      0.035,
      5,
    );
  });
};

/** A big cartoon microscope, its eyepiece leaning towards the visitor. */
const buildMicroscope = (builder: AttractionBuilder) => {
  const [x, y, z] = microscopeAt;
  builder.box(
    "paint",
    microscopeBody,
    [0.36, 0.08, 0.46],
    [x, y + 0.04, z - 0.04],
  );
  /* The curved arm behind, which holds the tube */
  builder.bar(
    "paint",
    microscopeBody,
    [x, y + 0.08, z - 0.2],
    [x, y + 0.6, z - 0.22],
    0.12,
    10,
  );
  builder.bar(
    "paint",
    microscopeBody,
    [x, y + 0.6, z - 0.22],
    [x, y + 0.82, z - 0.06],
    0.11,
    10,
  );
  if (builder.isFar) {
    return;
  }
  builder.roundedBox("paint", microscopeBody, [0.4, 0.1, 0.5], 0.04, [
    x,
    y + 0.05,
    z - 0.04,
  ]);
  /* The stage, with a glass slide and its clips */
  builder.box(
    "paint",
    microscopeDark,
    [0.3, 0.03, 0.26],
    [x, y + 0.36, z + 0.02],
  );
  builder.box("glass", iceGlass, [0.22, 0.008, 0.07], [x, y + 0.38, z + 0.04]);
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      palette.steel,
      [0.02, 0.012, 0.09],
      [x + side * 0.08, y + 0.385, z + 0.04],
    );
  });
  /* Focus knobs either side of the arm */
  [-1, 1].forEach((side) => {
    builder.cylinder("paint", microscopeDark, {
      radius: 0.07,
      length: 0.05,
      at: [x + side * 0.09, y + 0.48, z - 0.22],
      axis: "x",
      segments: 14,
    });
    builder.cylinder("paint", microscopeDark, {
      radius: 0.045,
      length: 0.04,
      at: [x + side * 0.135, y + 0.48, z - 0.22],
      axis: "x",
      segments: 12,
    });
  });
  /* The turret of lenses above the stage */
  builder.cylinder("metal", palette.steel, {
    radius: 0.1,
    length: 0.05,
    at: [x, y + 0.66, z + 0.02],
    segments: 16,
  });
  [0, 1, 2].forEach((lens) => {
    const angle = (lens / 3) * Math.PI * 2;
    builder.cylinder("metal", lens === 0 ? palette.brass : palette.steel, {
      radius: 0.025,
      radiusEnd: 0.035,
      length: 0.12,
      at: [
        x + Math.sin(angle) * 0.05,
        y + 0.58,
        z + 0.02 + Math.cos(angle) * 0.05,
      ],
      segments: 8,
    });
  });
  /* The body tube, and the eyepiece tipped towards the visitor */
  builder.cylinder("paint", microscopeBody, {
    radius: 0.07,
    length: 0.22,
    at: [x, y + 0.78, z + 0.02],
    segments: 16,
  });
  builder.bar(
    "paint",
    microscopeDark,
    [x, y + 0.86, z + 0.02],
    [x, y + 1.08, z + 0.16],
    0.1,
    14,
  );
  builder.cylinder("paint", microscopeDark, {
    radius: 0.06,
    length: 0.03,
    at: [x, y + 1.1, z + 0.17],
    segments: 14,
  });
  builder.torus(
    "paint",
    "#3a7fc2",
    0.07,
    0.015,
    [x, y + 0.72, z + 0.02],
    "y",
    16,
  );
};

const buildLamp = (builder: AttractionBuilder) => {
  builder.cylinder("glow", "#bfe8ff", {
    radius: 0.08,
    length: 0.04,
    at: [0, -0.1, 0],
    segments: 14,
  });
  builder.cylinder("glow", "#e6f6ff", {
    radius: 0.03,
    radiusEnd: 0.1,
    length: 0.12,
    at: [0, -0.02, 0],
    segments: 12,
    isOpen: true,
  });
};

/* ------------------------------------------------------------------ */
/* The snowflakes                                                      */
/* ------------------------------------------------------------------ */

/** Places a box along a direction in the flake's plane (x, y), at a distance. */
const addRay = (
  builder: AttractionBuilder,
  colour: string,
  angle: number,
  start: Triple,
  length: number,
  thickness: number,
) => {
  const centre: Triple = [
    start[0] + Math.sin(angle) * (length / 2),
    start[1] + Math.cos(angle) * (length / 2),
    start[2],
  ];
  builder.box("glass", colour, [thickness, length, 0.05], centre, [
    0,
    0,
    -angle,
  ]);
};

const buildFlake = (flake: Flake) => (builder: AttractionBuilder) => {
  const { radius, pattern } = flake;
  /* A six-sided plate in the middle */
  builder.add(
    "glass",
    iceDeep,
    new CylinderGeometry(radius * 0.2, radius * 0.2, 0.08, 6).rotateX(
      Math.PI / 2,
    ),
    { at: [0, 0, 0], rotation: [0, 0, Math.PI / 6] },
  );
  builder.add(
    "glow",
    "#eaf7ff",
    new CylinderGeometry(radius * 0.08, radius * 0.08, 0.1, 6).rotateX(
      Math.PI / 2,
    ),
    { at: [0, 0, 0] },
  );
  for (let arm = 0; arm < 6; arm++) {
    const angle = (arm / 6) * Math.PI * 2;
    const along = (distance: number): Triple => [
      Math.sin(angle) * distance,
      Math.cos(angle) * distance,
      0,
    ];
    addRay(builder, iceGlass, angle, along(radius * 0.15), radius * 0.85, 0.07);
    if (pattern === "fern") {
      /* Many little side branches, the fern-like "dendrite" */
      for (let branch = 0; branch < 5; branch++) {
        const distance = radius * (0.3 + branch * 0.13);
        const length = radius * (0.32 - branch * 0.05);
        [-1, 1].forEach((side) => {
          addRay(
            builder,
            iceGlass,
            angle + side * (Math.PI / 3),
            along(distance),
            length,
            0.04,
          );
        });
      }
    } else if (pattern === "plate") {
      /* Broad hexagonal plates along each arm, and one at the tip */
      [0.45, 0.72].forEach((share, index) => {
        builder.add(
          "glass",
          index === 0 ? iceDeep : iceGlass,
          new CylinderGeometry(radius * 0.12, radius * 0.12, 0.06, 6).rotateX(
            Math.PI / 2,
          ),
          { at: along(radius * share), rotation: [0, 0, -angle] },
        );
      });
      builder.add(
        "glass",
        iceGlass,
        new CylinderGeometry(radius * 0.16, radius * 0.16, 0.06, 6).rotateX(
          Math.PI / 2,
        ),
        { at: along(radius * 1.0), rotation: [0, 0, -angle + Math.PI / 6] },
      );
      [-1, 1].forEach((side) => {
        addRay(
          builder,
          iceGlass,
          angle + side * (Math.PI / 3),
          along(radius * 0.58),
          radius * 0.2,
          0.05,
        );
      });
    } else {
      /* A star: one big pair of branches, with a forked tip */
      [-1, 1].forEach((side) => {
        const branchAngle = angle + side * (Math.PI / 3);
        const from = along(radius * 0.5);
        addRay(builder, iceGlass, branchAngle, from, radius * 0.34, 0.05);
        const tip: Triple = [
          from[0] + Math.sin(branchAngle) * radius * 0.34,
          from[1] + Math.cos(branchAngle) * radius * 0.34,
          0,
        ];
        addRay(builder, iceDeep, angle, tip, radius * 0.14, 0.035);
        addRay(
          builder,
          iceGlass,
          angle + side * (Math.PI / 3),
          along(radius * 0.86),
          radius * 0.16,
          0.04,
        );
      });
      builder.add(
        "glass",
        iceDeep,
        new CylinderGeometry(radius * 0.07, radius * 0.07, 0.07, 6).rotateX(
          Math.PI / 2,
        ),
        { at: along(radius * 1.02) },
      );
    }
  }
};

const buildFlakePoles = (builder: AttractionBuilder) => {
  flakes.forEach((flake) => {
    const { x, z, height, radius } = flake;
    builder.cylinder("matte", snowShadow, {
      radius: 0.32,
      radiusEnd: 0.24,
      length: 0.18,
      at: [x, 0.09, z],
      segments: 12,
    });
    builder.cylinder("paint", "#3a6f9e", {
      radius: 0.06,
      length: height - 0.05,
      at: [x, height / 2, z],
      segments: 10,
    });
    if (builder.isFar) {
      /* A still hexagon stands in for the turning flake */
      builder.add(
        "glass",
        iceGlass,
        new CylinderGeometry(radius, radius, 0.06, 6).rotateX(Math.PI / 2),
        { at: [x, height, z] },
        undefined,
      );
      return;
    }
    builder.cylinder("metal", palette.steel, {
      radius: 0.09,
      length: 0.16,
      at: [x, height, z - 0.1],
      axis: "z",
      segments: 12,
    });
    builder.box("paint", palette.white, [0.4, 0.18, 0.02], [x, 0.85, z + 0.07]);
    /* A label: how many arms, drawn as six little strokes */
    for (let stroke = 0; stroke < 6; stroke++) {
      builder.box(
        "paint",
        "#3a6f9e",
        [0.02, 0.1, 0.01],
        [x - 0.13 + stroke * 0.052, 0.85, z + 0.085],
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The weather kit and the yard                                       */
/* ------------------------------------------------------------------ */

/** A white slatted Stevenson screen on a post, with a big thermometer beside it. */
const buildWeather = (builder: AttractionBuilder) => {
  const [x, , z] = screenAt;
  builder.box("paint", palette.white, [0.12, 1.15, 0.12], [x, 0.575, z]);
  builder.box("paint", palette.white, [0.6, 0.5, 0.45], [x, 1.4, z]);
  builder.box("paint", palette.white, [0.7, 0.06, 0.55], [x, 1.68, z]);
  /* The giant thermometer beside it, reading below freezing */
  if (builder.isFar) {
    return;
  }
  const tx = x - 0.75;
  builder.box("paint", palette.white, [0.24, 1.9, 0.06], [tx, 0.95, z]);
  for (let slat = 0; slat < 5; slat++) {
    builder.box(
      "paint",
      shade(palette.white, 0.9),
      [0.62, 0.03, 0.02],
      [x, 1.2 + slat * 0.09, z + 0.235],
      [0.4, 0, 0],
    );
  }
  builder.cylinder("glass", "#e8f4fa", {
    radius: 0.035,
    length: 1.45,
    at: [tx, 1.05, z + 0.05],
    segments: 10,
  });
  builder.sphere(
    "paint",
    "#d8282e",
    0.075,
    [tx, 0.27, z + 0.05],
    [1, 1, 1],
    12,
  );
  builder.cylinder("paint", "#d8282e", {
    radius: 0.018,
    length: 0.42,
    at: [tx, 0.52, z + 0.05],
    segments: 6,
  });
  for (let mark = 0; mark < 9; mark++) {
    builder.box(
      "paint",
      mark === 4 ? "#3a7fc2" : palette.black,
      [mark % 2 === 0 ? 0.08 : 0.05, 0.012, 0.01],
      [tx + 0.07, 0.45 + mark * 0.14, z + 0.035],
    );
  }
};

/** A weather balloon tied to a stake, with its little radio box hanging below. */
const buildBalloon = (builder: AttractionBuilder) => {
  builder.sphere(
    "paint",
    "#f6f2ea",
    0.55,
    balloonAt,
    [1, 1.1, 1],
    builder.isFar ? 8 : 18,
  );
  if (builder.isFar) {
    return;
  }
  const knot: Triple = [balloonAt[0], balloonAt[1] - 0.62, balloonAt[2]];
  builder.cylinder("paint", "#f6f2ea", {
    radius: 0.03,
    radiusEnd: 0.1,
    length: 0.12,
    at: [knot[0], knot[1] + 0.05, knot[2]],
    segments: 8,
  });
  const radio: Triple = [knot[0] - 0.05, knot[1] - 0.75, knot[2] + 0.02];
  builder.bar(
    "matte",
    palette.white,
    knot,
    [radio[0], radio[1] + 0.1, radio[2]],
    0.012,
    4,
  );
  builder.box("paint", "#e86a2a", [0.18, 0.2, 0.14], radio);
  builder.box(
    "glow",
    "#7dff9a",
    [0.04, 0.03, 0.01],
    [radio[0], radio[1] + 0.04, radio[2] + 0.075],
  );
  builder.bar(
    "matte",
    palette.white,
    [radio[0], radio[1] - 0.1, radio[2]],
    [balloonStake[0], 0.3, balloonStake[2]],
    0.012,
    4,
  );
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.04,
    length: 0.35,
    at: [balloonStake[0], 0.17, balloonStake[2]],
    segments: 6,
  });
};

/** A chalkboard on an easel: a hexagon with a dashed line of symmetry. */
const buildBoard = (builder: AttractionBuilder) => {
  const [x, , z] = boardAt;
  builder.box("matte", "#26443a", [0.9, 0.7, 0.04], [x, 1.05, z]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      palette.timber,
      [x + side * 0.42, 0, z + 0.18],
      [x + side * 0.4, 1.45, z - 0.02],
      0.05,
      5,
    );
  });
  if (builder.isFar) {
    return;
  }
  builder.bar(
    "matte",
    palette.timber,
    [x, 0, z - 0.4],
    [x, 1.35, z - 0.04],
    0.05,
    5,
  );
  builder.box(
    "matte",
    palette.paleTimber,
    [0.98, 0.05, 0.08],
    [x, 0.69, z + 0.04],
  );
  builder.box("matte", palette.paleTimber, [0.98, 0.05, 0.06], [x, 1.42, z]);
  for (let side = 0; side < 6; side++) {
    const angle = (side / 6) * Math.PI * 2 + Math.PI / 6;
    const centreAngle = angle + Math.PI / 6;
    builder.box(
      "matte",
      palette.white,
      [0.2, 0.014, 0.01],
      [
        x + Math.cos(centreAngle) * 0.173,
        1.05 + Math.sin(centreAngle) * 0.173,
        z + 0.025,
      ],
      [0, 0, centreAngle + Math.PI / 2],
    );
  }
  for (let dash = 0; dash < 6; dash++) {
    builder.box(
      "matte",
      "#f0b62e",
      [0.012, 0.05, 0.01],
      [x, 0.78 + dash * 0.1, z + 0.027],
    );
  }
  builder.box(
    "matte",
    palette.white,
    [0.05, 0.015, 0.02],
    [x + 0.2, 0.73, z + 0.06],
  );
};

const buildYard = (builder: AttractionBuilder) => {
  /* A path of packed snow from the sign to the hut door */
  builder.box(
    "matte",
    snowShadow,
    [1.0, 0.02, 3.6],
    [0.6, 0.01, 2.2],
    [0, 0.35, 0],
  );
  if (builder.isFar) {
    return;
  }
  [
    [-3.5, -2.6, 0.8],
    [2.0, -3.6, 0.7],
    [-1.8, 3.6, 0.65],
    [3.9, -0.3, 0.5],
  ].forEach(([x, z, size]) => {
    builder.sphere("matte", snowWhite, size, [x, 0, z], [1.5, 0.45, 1], 10);
  });
  /* Boot prints from the bench to the snowflakes */
  for (let step = 0; step < 6; step++) {
    const side = step % 2 === 0 ? -1 : 1;
    builder.box(
      "matte",
      shade(snowShadow, 0.95),
      [0.12, 0.012, 0.22],
      [1.9 + step * 0.22 + side * 0.08, 0.008, 0.45 + step * 0.13],
      [0, -1.0, 0],
    );
  }
  /* A shovel stuck in the snow */
  builder.bar(
    "matte",
    palette.paleTimber,
    [-0.2, 0.1, -0.6],
    [-0.15, 1.1, -0.65],
    0.045,
    5,
  );
  builder.box("metal", palette.steel, [0.22, 0.28, 0.03], [-0.2, 0.1, -0.6]);
};

export const snowflakeLabModel: CuriosityModel = {
  kind: "snowflake-lab",
  islandId: "frost-isle",
  name: "Snowflake Lab",
  fact: "A snowflake is a tiny crystal of ice, and nearly every one has six arms, because frozen water joins up in six-sided shapes called hexagons. Fold a snowflake down the middle and the two halves match like a mirror: that fold is a line of symmetry. A snowflake has six lines of symmetry, just like a hexagon has six sides!",
  curriculumLink:
    "Mathematics, Year 2: identify and describe the properties of 2-D shapes, including the number of sides and line symmetry in a vertical line.",
  footprint: 4.6,
  setting: "inland",
  padColour: snowPad,
  signSpot: { x: signAt[0], z: signAt[2] },
  build: (builder) => {
    buildHut(builder);
    buildBench(builder);
    buildMicroscope(builder);
    buildFlakePoles(builder);
    buildWeather(builder);
    buildBalloon(builder);
    buildBoard(builder);
    buildYard(builder);
    addSignBoard(builder, signAt, signColour);
  },
  moving: [
    ...flakes.map((flake): MovingPart => ({
      name: `${flake.name} snowflake`,
      pivot: flakeCentre(flake),
      build: buildFlake(flake),
      motion: {
        kind: "whirl",
        axis: "z",
        idle: 0.25,
        speed: 1.6,
        reach: 7,
        phase: flake.phase,
      },
    })),
    {
      name: "microscope lamp",
      pivot: lampAt,
      build: buildLamp,
      motion: { kind: "wake", reach: 5 },
    },
  ],
  blockers: [
    { x: hut.x - 0.6, z: hut.z, radius: 1.15 },
    { x: hut.x + 0.6, z: hut.z, radius: 1.15 },
    { x: bench.x - 0.45, z: bench.z, radius: 0.5 },
    { x: bench.x + 0.45, z: bench.z, radius: 0.5 },
    ...flakes.map(({ x, z }) => ({ x, z, radius: 0.35 })),
    { x: screenAt[0] - 0.35, z: screenAt[2], radius: 0.5 },
    { x: boardAt[0], z: boardAt[2] - 0.1, radius: 0.5 },
    { x: balloonStake[0], z: balloonStake[2], radius: 0.25 },
  ] satisfies LocalBlocker[],
  play: {
    label: "Look at a snowflake",
    news: "Wow! Under the microscope the snowflake had six sparkly arms, and both halves matched like a mirror.",
    tune: [84, 88, 91, 96],
  },
};
