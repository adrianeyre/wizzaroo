import { BoxGeometry, ConeGeometry } from "three";
import {
  addFence,
  addGableRoof,
  addWindow,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

/** The Firework Tower's colours: basalt, bronze, ash and bright paper. */
export const fireworkColours = {
  basalt: "#2f2a2b",
  basaltLight: "#4a4140",
  basaltEdge: "#3b3433",
  ash: "#6b625d",
  ashPaving: "#57504c",
  bronze: "#b37a3c",
  bronzeDark: "#7c5226",
  lava: "#ff8a1f",
  ember: "#ffc15a",
  red: "#d6342c",
  blue: "#2f5fc4",
  gold: "#e8b730",
  green: "#3fae5a",
  purple: "#8a4fc7",
  paper: "#efe2c4",
  crate: "#9a6a3c",
  crateDark: "#6e4a28",
  roof: "#3b3536",
  white: "#f4efe6",
} as const;

const colours = fireworkColours;

/* ------------------------------------------------------------------ */
/* Rockets                                                             */
/* ------------------------------------------------------------------ */

/** A stick rocket, its stick's foot at the pivot, nose upwards. */
export const buildStickRocket =
  (body: string, stripe: string) => (builder: AttractionBuilder) => {
    const segments = builder.segments(14, 8);
    builder.cylinder("matte", "#c9a676", {
      radius: 0.025,
      length: 1.25,
      at: [0.1, 0.62, 0],
      segments: 6,
    });
    builder.lathe(
      "paint",
      body,
      [
        [0, 1.1],
        [0.1, 1.1],
        [0.12, 1.16],
        [0.12, 1.9],
        [0.11, 1.92],
      ],
      [0, 0, 0],
      "y",
      segments,
    );
    builder.lathe(
      "paint",
      stripe,
      [
        [0.11, 1.92],
        [0.13, 1.94],
        [0.1, 2.08],
        [0.05, 2.22],
        [0, 2.28],
      ],
      [0, 0, 0],
      "y",
      segments,
    );
    builder.cylinder("paint", stripe, {
      radius: 0.125,
      length: 0.08,
      at: [0, 1.5, 0],
      segments,
      isOpen: true,
    });
    builder.cylinder("metal", colours.bronzeDark, {
      radius: 0.07,
      radiusEnd: 0.1,
      length: 0.08,
      at: [0, 1.07, 0],
      segments: 10,
    });
    if (builder.isFar) {
      return;
    }
    builder.cylinder("paint", colours.white, {
      radius: 0.125,
      length: 0.05,
      at: [0, 1.35, 0],
      segments,
      isOpen: true,
    });
    builder.cylinder("paint", colours.white, {
      radius: 0.125,
      length: 0.05,
      at: [0, 1.65, 0],
      segments,
      isOpen: true,
    });
    builder.box("paint", colours.gold, [0.12, 0.12, 0.01], [0, 1.78, 0.122]);
    builder.cylinder("glow", colours.ember, {
      radius: 0.012,
      length: 0.14,
      at: [0, 1.0, 0],
      segments: 4,
    });
  };

/** A wooden launch rail with a bronze cradle for a stick rocket. */
const addLaunchRail = (builder: AttractionBuilder, x: number, z: number) => {
  builder.box("matte", colours.basaltLight, [0.7, 0.18, 0.7], [x, 0.09, z]);
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      colours.crateDark,
      [x + side * 0.3, 0.18, z + 0.25],
      [x + side * 0.04, 2.0, z],
      0.07,
      6,
    );
    builder.bar(
      "matte",
      colours.crateDark,
      [x + side * 0.3, 0.18, z - 0.25],
      [x + side * 0.04, 2.0, z],
      0.07,
      6,
    );
  });
  builder.bar(
    "metal",
    colours.bronze,
    [x + 0.16, 0.25, z],
    [x + 0.16, 2.1, z],
    0.04,
    6,
  );
};

/** A rack of mortar tubes in a basalt-edged crate, for the big shells. */
const addMortarRack = (
  builder: AttractionBuilder,
  x: number,
  z: number,
  tilt: number,
) => {
  builder.box("matte", colours.crate, [1.5, 0.45, 1.0], [x, 0.225, z]);
  builder.box("matte", colours.crateDark, [1.56, 0.06, 1.06], [x, 0.47, z]);
  builder.box("matte", colours.crateDark, [1.56, 0.06, 1.06], [x, 0.04, z]);
  const columns = builder.isFar ? 2 : 3;
  const rows = builder.isFar ? 1 : 2;
  const tubes = [colours.red, colours.blue, colours.gold, colours.green];
  for (let column = 0; column < columns; column++) {
    for (let row = 0; row < rows; row++) {
      const tubeX = x - 0.6 + (column + 0.5) * (1.2 / columns);
      const tubeZ = z - 0.2 + (rows === 1 ? 0.2 : row * 0.4);
      const top: Triple = [tubeX + tilt * 0.2, 1.05, tubeZ];
      builder.bar(
        "paint",
        tubes[(column + row) % tubes.length],
        [tubeX, 0.45, tubeZ],
        top,
        0.15,
        6,
      );
      if (!builder.isFar) {
        builder.cylinder("matte", colours.basalt, {
          radius: 0.055,
          length: 0.02,
          at: [top[0], top[1] + 0.005, top[2]],
          segments: 6,
        });
      }
    }
  }
};

/** A warning board: a yellow triangle on a post. */
const addWarningSign = (builder: AttractionBuilder, at: Triple, turn = 0) => {
  const [x, , z] = at;
  builder.box("matte", colours.crateDark, [0.06, 1.3, 0.06], [x, 0.65, z]);
  builder.add(
    "paint",
    colours.gold,
    new ConeGeometry(0.3, 0.05, 3).rotateX(Math.PI / 2).rotateZ(Math.PI),
    { at: [x, 1.25, z + 0.05], rotation: [0, turn, 0] },
    undefined,
  );
  builder.box(
    "paint",
    colours.basalt,
    [0.04, 0.16, 0.02],
    [x + Math.sin(turn) * 0.08, 1.22, z + Math.cos(turn) * 0.08],
    [0, turn, 0],
  );
};

export const launchField = {
  minX: -8.0,
  maxX: -3.6,
  minZ: -4.6,
  maxZ: -0.2,
  rockets: [
    { x: -6.9, z: -3.4 },
    { x: -5.0, z: -1.5 },
  ],
} as const;

/** The fenced launch field, with its rails and racks of mortar tubes. */
export const buildLaunchField = (builder: AttractionBuilder) => {
  const { minX, maxX, minZ, maxZ } = launchField;
  builder.box(
    "matte",
    colours.ash,
    [maxX - minX, 0.03, maxZ - minZ],
    [(minX + maxX) / 2, 0.015, (minZ + maxZ) / 2],
  );
  const fence = {
    colour: colours.bronze,
    height: 0.95,
    isPicket: false,
    finish: "metal" as const,
  };
  if (!builder.isFar) {
    addFence(builder, { x: minX, z: minZ }, { x: maxX, z: minZ }, fence);
    addFence(builder, { x: minX, z: minZ }, { x: minX, z: maxZ }, fence);
    addFence(builder, { x: maxX, z: minZ }, { x: maxX, z: maxZ }, fence);
    addFence(builder, { x: minX, z: maxZ }, { x: maxX, z: maxZ }, fence);
  }
  [
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
  ].forEach(([x, z]) => {
    builder.box(
      "matte",
      colours.basaltLight,
      [0.24, 1.15, 0.24],
      [x, 0.575, z],
    );
    builder.sphere("metal", colours.bronze, 0.13, [x, 1.22, z], [1, 1, 1], 6);
  });
  launchField.rockets.forEach(({ x, z }) => {
    addLaunchRail(builder, x, z);
  });
  if (!builder.isFar) {
    addMortarRack(builder, -6.7, -1.25, 1);
    addMortarRack(builder, -4.9, -3.6, -1);
  }
  addWarningSign(builder, [-4.4, 0, maxZ + 0.35]);
  addWarningSign(builder, [-7.4, 0, maxZ + 0.35]);
  if (builder.isFar) {
    return;
  }
  /* Spent tubes and soot marks on the ash */
  [
    [-7.4, -2.3, 0.4],
    [-5.9, -2.4, 1.3],
    [-4.3, -2.2, 2.2],
  ].forEach(([x, z, turn]) => {
    builder.cylinder("matte", "#262122", {
      radius: 0.45,
      length: 0.01,
      at: [x, 0.035, z],
      segments: 12,
    });
    builder.add(
      "matte",
      shade(colours.paper, 0.6),
      new BoxGeometry(0.1, 0.1, 0.36),
      { at: [x + 0.2, 0.06, z + 0.1], rotation: [0, turn, 0] },
      undefined,
    );
  });
  /* A coil of fuse on a drum */
  builder.cylinder("matte", colours.crate, {
    radius: 0.28,
    length: 0.4,
    at: [-7.4, 0.2, -0.7],
    axis: "x",
    segments: 14,
  });
  builder.torus("matte", colours.paper, 0.22, 0.04, [-7.4, 0.2, -0.7], "x", 14);
};

/* ------------------------------------------------------------------ */
/* The firework maker's hut                                            */
/* ------------------------------------------------------------------ */

export const hut = { x: 5.4, z: -3.1, width: 3.0, depth: 2.4, height: 2.0 };

/** A wooden crate, with a painted star on its front. */
const addCrate = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  star: string,
  turn = 0,
) => {
  const [x, y, z] = at;
  builder.box(
    "matte",
    colours.crate,
    [size, size, size],
    [x, y + size / 2, z],
    [0, turn, 0],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      colours.crateDark,
      [size + 0.02, 0.05, 0.05],
      [
        x + Math.sin(turn) * (size / 2),
        y + size / 2 + side * size * 0.35,
        z + Math.cos(turn) * (size / 2),
      ],
      [0, turn, 0],
    );
  });
  builder.add(
    "paint",
    star,
    new ConeGeometry(size * 0.2, 0.02, 5).rotateX(Math.PI / 2),
    {
      at: [
        x + Math.sin(turn) * (size / 2 + 0.01),
        y + size / 2,
        z + Math.cos(turn) * (size / 2 + 0.01),
      ],
      rotation: [0, turn, 0],
    },
    undefined,
  );
};

/** A barrel with bronze hoops. */
const addBarrel = (builder: AttractionBuilder, at: Triple) => {
  const [x, y, z] = at;
  builder.lathe(
    "matte",
    colours.crate,
    [
      [0, 0],
      [0.26, 0],
      [0.31, 0.3],
      [0.26, 0.62],
      [0, 0.62],
    ],
    [x, y, z],
    "y",
    builder.segments(14, 8),
  );
  if (!builder.isFar) {
    [0.1, 0.52].forEach((up) => {
      builder.cylinder("metal", colours.bronzeDark, {
        radius: 0.285,
        length: 0.04,
        at: [x, y + up, z],
        segments: 14,
        isOpen: true,
      });
    });
  }
};

export const buildHut = (builder: AttractionBuilder) => {
  const { x, z, width, depth, height } = hut;
  builder.box(
    "matte",
    colours.basaltLight,
    [width + 0.2, 0.2, depth + 0.2],
    [x, 0.1, z],
  );
  builder.box(
    "matte",
    colours.basalt,
    [width, height, depth],
    [x, height / 2, z],
  );
  /* Bronze corner posts and a band under the eaves */
  [-1, 1].forEach((sideX) => {
    [-1, 1].forEach((sideZ) => {
      builder.box(
        "metal",
        colours.bronzeDark,
        [0.12, height, 0.12],
        [x + sideX * (width / 2), height / 2, z + sideZ * (depth / 2)],
      );
    });
  });
  builder.box(
    "metal",
    colours.bronze,
    [width + 0.06, 0.1, depth + 0.06],
    [x, height - 0.1, z],
  );
  addGableRoof(builder, {
    width,
    depth,
    rise: 0.85,
    at: [x, height, z],
    colour: colours.roof,
    overhang: 0.25,
    thickness: 0.1,
  });
  builder.box(
    "metal",
    colours.bronze,
    [width + 0.55, 0.08, 0.1],
    [x, height + 0.87, z],
  );
  /* Gable ends */
  [-1, 1].forEach((side) => {
    builder.add(
      "matte",
      colours.basaltEdge,
      new ConeGeometry(depth / 2 + 0.05, 0.85, 4, 1).scale(0.05, 1, 1),
      { at: [x + side * (width / 2), height + 0.42, z] },
      undefined,
    );
  });
  /* Chimney */
  builder.box(
    "matte",
    colours.basaltLight,
    [0.4, 1.3, 0.4],
    [x + 0.8, height + 0.75, z - 0.5],
  );
  builder.box(
    "metal",
    colours.bronzeDark,
    [0.48, 0.08, 0.48],
    [x + 0.8, height + 1.4, z - 0.5],
  );
  /* Front: door, lit window and a painted star board */
  const front = z + depth / 2;
  builder.box(
    "paint",
    colours.red,
    [0.62, 1.15, 0.05],
    [x - 0.6, 0.78, front + 0.01],
  );
  builder.box(
    "metal",
    colours.bronze,
    [0.74, 0.08, 0.08],
    [x - 0.6, 1.4, front + 0.03],
  );
  addWindow(builder, {
    at: [x + 0.65, 1.2, front + 0.01],
    width: 0.8,
    height: 0.55,
    frame: colours.bronze,
    isLit: true,
  });
  builder.box(
    "paint",
    colours.blue,
    [1.4, 0.3, 0.06],
    [x, height - 0.25, front + 0.08],
  );
  addWindow(builder, {
    at: [x - width / 2 - 0.01, 1.2, z],
    width: 0.7,
    height: 0.5,
    frame: colours.bronze,
    turn: -Math.PI / 2,
    isLit: true,
  });
  if (builder.isFar) {
    return;
  }
  /* Crates and barrels by the door */
  addCrate(builder, [x + 1.9, 0, front - 0.2], 0.6, colours.red, -0.2);
  addCrate(builder, [x + 1.85, 0.6, front - 0.25], 0.42, colours.gold, 0.3);
  addCrate(builder, [x + 1.9, 0, front - 1.0], 0.55, colours.blue, 0.1);
  addBarrel(builder, [x - 2.0, 0, front - 0.3]);
  addBarrel(builder, [x - 2.05, 0, front - 1.0]);
  builder.sphere(
    "metal",
    colours.bronze,
    0.04,
    [x - 0.4, 0.8, front + 0.06],
    [1, 1, 1],
    8,
  );
  [colours.red, colours.gold, colours.green, colours.purple].forEach(
    (star, index) => {
      builder.add(
        "paint",
        star,
        new ConeGeometry(0.09, 0.02, 5).rotateX(Math.PI / 2),
        { at: [x - 0.5 + index * 0.33, height - 0.25, front + 0.12] },
        undefined,
      );
    },
  );
  /* Paper tubes drying on a rack by the side wall */
  builder.box(
    "matte",
    colours.crateDark,
    [0.06, 0.9, 1.2],
    [x + width / 2 + 0.35, 0.45, z],
  );
  for (let tube = 0; tube < 5; tube++) {
    builder.cylinder(
      "paint",
      [colours.red, colours.blue, colours.gold, colours.green, colours.purple][
        tube
      ],
      {
        radius: 0.06,
        length: 0.5,
        at: [x + width / 2 + 0.35, 0.95, z - 0.45 + tube * 0.22],
        segments: 8,
      },
    );
  }
};

/** A little hand cart with a crate of rockets, by the hut. */
export const buildCart = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
) => {
  const [x, , z] = at;
  const rotation: Triple = [0, turn, 0];
  const place = (dx: number, y: number, dz: number): Triple => [
    x + dx * Math.cos(turn) + dz * Math.sin(turn),
    y,
    z - dx * Math.sin(turn) + dz * Math.cos(turn),
  ];
  builder.box(
    "paint",
    colours.red,
    [1.0, 0.3, 0.7],
    place(0, 0.55, 0),
    rotation,
  );
  builder.box(
    "matte",
    colours.crateDark,
    [0.9, 0.04, 0.6],
    place(0, 0.71, 0),
    rotation,
  );
  [-1, 1].forEach((side) => {
    builder.add(
      "metal",
      colours.bronzeDark,
      new BoxGeometry(0.06, 0.06, 0.06),
      { at: place(0, 0.32, side * 0.38), rotation },
      undefined,
    );
    builder.torus(
      "matte",
      colours.basalt,
      0.26,
      0.05,
      place(0, 0.3, side * 0.4),
      "z",
      10,
    );
    builder.bar(
      "metal",
      colours.bronzeDark,
      place(0.5, 0.6, side * 0.25),
      place(1.15, 0.75, side * 0.25),
      0.04,
      6,
    );
  });
  builder.bar(
    "metal",
    colours.bronzeDark,
    place(1.15, 0.75, -0.25),
    place(1.15, 0.75, 0.25),
    0.05,
    6,
  );
  if (builder.isFar) {
    return;
  }
  for (let rocket = 0; rocket < 5; rocket++) {
    const colour = [
      colours.red,
      colours.blue,
      colours.gold,
      colours.green,
      colours.purple,
    ][rocket];
    const spot = place(-0.3 + rocket * 0.15, 0.95, -0.1 + (rocket % 2) * 0.2);
    builder.cylinder("paint", colour, {
      radius: 0.06,
      length: 0.4,
      at: spot,
      segments: 8,
    });
    builder.cylinder("paint", colours.white, {
      radius: 0.065,
      radiusEnd: 0,
      length: 0.12,
      at: [spot[0], spot[1] + 0.26, spot[2]],
      segments: 8,
    });
  }
};

/* ------------------------------------------------------------------ */
/* Moving parts                                                        */
/* ------------------------------------------------------------------ */

/**
 * A Catherine wheel facing +z, its hub at the pivot: a spiral of
 * paper tube with sparks streaming off its rim.
 */
export const buildCatherineWheel =
  (first: string, second: string) => (builder: AttractionBuilder) => {
    const steps = builder.isFar ? 6 : 14;
    const turns = 2.2;
    let previous: Triple | undefined;
    for (let step = 0; step <= steps; step++) {
      const share = step / steps;
      const angle = share * turns * Math.PI * 2;
      const radius = 0.08 + share * 0.38;
      const point: Triple = [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      ];
      if (previous !== undefined) {
        builder.bar(
          "paint",
          step % 2 === 0 ? first : second,
          previous,
          point,
          0.07,
          5,
        );
      }
      previous = point;
    }
    builder.cylinder("metal", colours.bronze, {
      radius: 0.09,
      length: 0.14,
      at: [0, 0, 0],
      axis: "z",
      segments: 12,
    });
    builder.cylinder("glow", colours.ember, {
      radius: 0.04,
      length: 0.16,
      at: [0, 0, 0.02],
      axis: "z",
      segments: 8,
    });
    const sparks = builder.isFar ? 3 : 6;
    for (let spark = 0; spark < sparks; spark++) {
      const angle = (spark / sparks) * Math.PI * 2;
      const rim: Triple = [Math.cos(angle) * 0.46, Math.sin(angle) * 0.46, 0];
      /* Sparks trail behind the rim as the wheel turns anticlockwise */
      const back = angle - Math.PI / 2;
      builder.add(
        "glow",
        spark % 2 === 0 ? colours.ember : colours.gold,
        new ConeGeometry(0.07, 0.5, 6).translate(0, 0.25, 0),
        { at: rim, rotation: [0, 0, back - Math.PI / 2] },
        undefined,
      );
      if (!builder.isFar) {
        builder.sphere(
          "glow",
          colours.white,
          0.035,
          [rim[0] + Math.cos(back) * 0.55, rim[1] + Math.sin(back) * 0.55, 0],
          [1, 1, 1],
          4,
        );
      }
    }
  };

/** Evenly spread directions over a sphere. */
const listBurstDirections = (count: number): Triple[] =>
  Array.from({ length: count }, (_, index) => {
    const y = 1 - ((index + 0.5) / count) * 2;
    const ring = Math.sqrt(1 - y * y);
    const angle = index * 2.39996;
    return [Math.cos(angle) * ring, y, Math.sin(angle) * ring];
  });

const addBurst = (
  builder: AttractionBuilder,
  centre: Triple,
  radius: number,
  streakColour: string,
  starColour: string,
  stars: number,
  droop = 0,
) => {
  builder.sphere("glow", colours.white, radius * 0.14, centre, [1, 1, 1], 6);
  listBurstDirections(stars).forEach((direction, index) => {
    const tip: Triple = [
      centre[0] + direction[0] * radius,
      centre[1] + direction[1] * radius - droop * (1 + direction[1]) * 0.5,
      centre[2] + direction[2] * radius,
    ];
    const from: Triple = [
      centre[0] + direction[0] * radius * 0.3,
      centre[1] + direction[1] * radius * 0.3,
      centre[2] + direction[2] * radius * 0.3,
    ];
    builder.bar(
      "glow",
      index % 3 === 0 ? colours.white : streakColour,
      from,
      tip,
      0.05,
      3,
    );
    if (!builder.isFar && index % 2 === 0) {
      builder.sphere("glow", starColour, 0.12, tip, [1, 1, 1], 4);
    }
  });
};

/** Bursts of stars that bloom high over the tower, the pivot their middle. */
export const buildBursts = (builder: AttractionBuilder) => {
  const many = builder.isFar ? 0.4 : 1;
  addBurst(
    builder,
    [0, 0, 0],
    2.2,
    colours.red,
    colours.gold,
    Math.round(22 * many),
  );
  addBurst(
    builder,
    [-3.2, -1.4, 1.0],
    1.5,
    colours.blue,
    colours.white,
    Math.round(16 * many),
  );
  if (builder.isFar) {
    return;
  }
  addBurst(
    builder,
    [3.3, -2.0, -0.6],
    1.6,
    colours.gold,
    colours.ember,
    Math.round(16 * many),
    0.9,
  );
  addBurst(
    builder,
    [1.4, 1.6, 1.6],
    1.0,
    colours.green,
    colours.green,
    Math.round(12 * many),
  );
};

/** The fire basket's dancing flame, on top of the tower. */
export const buildCrownFlame = (builder: AttractionBuilder) => {
  const segments = builder.segments(12, 6);
  builder.lathe(
    "glow",
    colours.lava,
    [
      [0, 0],
      [0.4, 0.05],
      [0.36, 0.45],
      [0.18, 0.95],
      [0, 1.3],
    ],
    [0, 0, 0],
    "y",
    segments,
  );
  builder.lathe(
    "glow",
    colours.ember,
    [
      [0, 0.02],
      [0.24, 0.08],
      [0.2, 0.45],
      [0.08, 0.85],
      [0, 1.0],
    ],
    [0, 0.04, 0],
    "y",
    segments,
  );
  if (!builder.isFar) {
    [0, 2.1, 4.2].forEach((angle) => {
      builder.add(
        "glow",
        colours.gold,
        new ConeGeometry(0.1, 0.5, 6),
        { at: [Math.cos(angle) * 0.25, 0.55, Math.sin(angle) * 0.25] },
        undefined,
      );
    });
  }
};

/** A spectator with a sparkler, facing +z. */
export const buildSpectator = (builder: AttractionBuilder) => {
  const coat = colours.purple;
  if (!builder.isFar) {
    [-0.08, 0.08].forEach((x) => {
      builder.cylinder("paint", colours.basalt, {
        radius: 0.06,
        length: 0.4,
        at: [x, 0.2, 0],
        segments: 6,
      });
    });
  }
  builder.lathe(
    "matte",
    coat,
    [
      [0, 0.38],
      [0.2, 0.4],
      [0.17, 0.8],
      [0.09, 0.86],
      [0, 0.86],
    ],
    [0, 0, 0],
    "y",
    builder.segments(10, 6),
  );
  builder.sphere("matte", "#e0b48c", 0.13, [0, 0.98, 0], [1, 1, 1], 8);
  builder.sphere("matte", colours.red, 0.135, [0, 1.03, -0.01], [1, 0.6, 1], 8);
  if (builder.isFar) {
    return;
  }
  builder.bar("matte", coat, [0.17, 0.78, 0], [0.24, 1.05, 0.12], 0.07, 5);
  builder.bar(
    "metal",
    colours.ash,
    [0.24, 1.05, 0.12],
    [0.26, 1.35, 0.2],
    0.015,
    4,
  );
  builder.sphere("glow", colours.ember, 0.07, [0.26, 1.38, 0.2], [1, 1, 1], 6);
  builder.sphere("glow", colours.white, 0.035, [0.26, 1.38, 0.2], [1, 1, 1], 4);
};
