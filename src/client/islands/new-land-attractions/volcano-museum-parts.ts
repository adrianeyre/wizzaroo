import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  addDoor,
  addWindow,
  palette,
  shade,
  type AttractionBuilder,
  type Deck,
  type LocalPoint,
  type Triple,
} from "../attractions/attraction-kit.js";

/* Colours: dark basalt, ash grey, glowing lava and polished bronze */

export const basalt = "#3e3836";
export const darkBasalt = "#2a2624";
export const ash = "#8e8780";
export const paleAsh = "#a39c94";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";
export const bronze = "#b5793a";
export const darkBronze = "#7f5325";
export const paving = "#8a827a";
export const darkPaving = "#625b55";
export const signColour = "#8c2f1b";

const tuff = "#a0674a";

export const hash = (a: number, b: number, c: number): number => {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43_758.5453;
  return value - Math.floor(value);
};

/* ------------------------------------------------------------------ */
/* The model volcano: a cone with a quarter cut away                   */
/* ------------------------------------------------------------------ */

export const volcanoAt = { x: -2.6, z: -3.0 };

/** The cone's outline, [radius, height], from its foot up into the crater. */
const coneProfile: readonly (readonly [number, number])[] = [
  [3.15, 0],
  [3.05, 0.1],
  [2.75, 0.35],
  [2.4, 0.7],
  [2.05, 1.1],
  [1.75, 1.55],
  [1.48, 2.05],
  [1.25, 2.55],
  [1.07, 3.05],
  [0.93, 3.5],
  [0.86, 3.78],
  [0.78, 3.84],
  [0.66, 3.7],
  [0.45, 3.48],
  [0.001, 3.4],
];

export const craterFloor = 3.4;
const lipIndex = 10;

/** How high the cone's surface is at a distance from its middle. */
export const findConeTop = (radius: number): number => {
  if (radius >= coneProfile[0][0]) {
    return 0;
  }
  for (let index = 1; index < coneProfile.length; index++) {
    const [outer, outerY] = coneProfile[index - 1];
    const [inner, innerY] = coneProfile[index];
    if (radius >= inner) {
      const share = (radius - inner) / (outer - inner);
      return innerY + (outerY - innerY) * share;
    }
  }
  return craterFloor;
};

/** How far the cone's outside reaches at a height. */
const findConeRadius = (height: number): number => {
  for (let index = 1; index <= lipIndex; index++) {
    const [lower, lowerY] = coneProfile[index - 1];
    const [upper, upperY] = coneProfile[index];
    if (height <= upperY) {
      const share = (height - lowerY) / (upperY - lowerY);
      return lower + (upper - lower) * Math.max(0, share);
    }
  }
  return coneProfile[lipIndex][0];
};

/** The quarter cut away faces the front left, from local -x round to +z. */
const cutStart = Math.PI * 1.5;
const lavaStreams = [0.55, 1.25, 2.55, 3.4, 4.25];

const paintCone = (centre: { x: number; y: number; z: number }) => {
  const x = centre.x - volcanoAt.x;
  const z = centre.z - volcanoAt.z;
  const radius = Math.hypot(x, z);
  const y = centre.y;
  if (y > craterFloor - 0.1 && radius < 0.74) {
    return {
      colour: radius < 0.4 ? lavaCore : lava,
      finish: "glow" as const,
    };
  }
  const angle = (Math.atan2(x, z) + Math.PI * 2) % (Math.PI * 2);
  const isStream = lavaStreams.some((stream) => {
    const wiggle = stream + 0.14 * Math.sin(y * 2.6 + stream * 3);
    const across = Math.abs(angle - wiggle) * radius;
    const width = 0.1 + 0.08 * (1 - y / 3.8);
    return across < width && y > 0.18 && y < 3.75;
  });
  if (isStream) {
    return {
      colour: y > 2.4 ? lavaCore : lava,
      finish: "glow" as const,
    };
  }
  const mottle = 0.9 + hash(centre.x, centre.y, centre.z) * 0.2;
  const rock = y > 2.9 ? paleAsh : y > 1.7 ? ash : basalt;
  return { colour: shade(rock, mottle), finish: "matte" as const };
};

/** Colours the inside of the cut: rock layers, the vent and the magma chamber. */
const paintSection = (centre: { x: number; y: number; z: number }) => {
  const x = centre.x - volcanoAt.x;
  const z = centre.z - volcanoAt.z;
  const radius = Math.hypot(x, z);
  const y = centre.y;
  if (radius < 0.22 && y > 0.5) {
    return { colour: lavaCore, finish: "glow" as const };
  }
  const chamber = (radius / 1.35) ** 2 + ((y - 0.62) / 0.5) ** 2;
  if (chamber < 1) {
    return {
      colour: chamber < 0.45 ? lavaCore : lava,
      finish: "glow" as const,
    };
  }
  if (radius < 0.36 && y > 0.5) {
    return { colour: "#c2441a", finish: "matte" as const };
  }
  const depth = findConeRadius(y) - radius;
  if (depth < 0.12) {
    return { colour: darkBasalt, finish: "matte" as const };
  }
  const layer = Math.floor((depth + y * 0.08) / 0.3) % 3;
  const colour = [paleAsh, basalt, tuff][layer];
  return {
    colour: shade(colour, 0.94 + hash(centre.x, centre.y, centre.z) * 0.1),
    finish: "matte" as const,
  };
};

/** One flat face of the cut, finely divided so its layers show. */
const buildSection = (
  builder: AttractionBuilder,
  direction: LocalPoint,
  facing: Vector3,
) => {
  const across = builder.isFar ? 5 : 14;
  const up = builder.isFar ? 5 : 16;
  const outer = 3.0;
  const point = (column: number, row: number): Vector3 => {
    const radius = (outer * column) / across;
    const top = findConeTop(radius);
    return new Vector3(
      volcanoAt.x + direction.x * radius,
      (top * row) / up,
      volcanoAt.z + direction.z * radius,
    );
  };
  const positions: number[] = [];
  const addTriangle = (a: Vector3, b: Vector3, c: Vector3) => {
    const normal = new Vector3()
      .subVectors(b, a)
      .cross(new Vector3().subVectors(c, a));
    const [second, third] = normal.dot(facing) >= 0 ? [b, c] : [c, b];
    positions.push(a.x, a.y, a.z, second.x, second.y, second.z);
    positions.push(third.x, third.y, third.z);
  };
  for (let column = 0; column < across; column++) {
    for (let row = 0; row < up; row++) {
      const a = point(column, row);
      const b = point(column + 1, row);
      const c = point(column + 1, row + 1);
      const d = point(column, row + 1);
      addTriangle(a, b, c);
      addTriangle(a, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.computeVertexNormals();
  builder.painted(geometry, paintSection, {}, "matte", undefined);
};

const boulderSpots: readonly [number, number, number][] = [
  [1.65, 3.35, 0.32],
  [2.2, 3.45, 0.24],
  [2.95, 3.4, 0.36],
  [3.7, 3.35, 0.28],
  [4.45, 3.4, 0.3],
  [4.05, 3.7, 0.18],
  [1.95, 3.85, 0.2],
];

export const buildVolcano = (builder: AttractionBuilder) => {
  builder.painted(
    new LatheGeometry(
      coneProfile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(48, 16),
      0,
      cutStart,
    ),
    paintCone,
    { at: [volcanoAt.x, 0, volcanoAt.z] },
    "matte",
  );
  buildSection(builder, { x: 0, z: 1 }, new Vector3(-1, 0, 0));
  buildSection(builder, { x: -1, z: 0 }, new Vector3(0, 0, 1));
  if (builder.isFar) {
    return;
  }
  /* Lumps of lava rock round the foot */
  boulderSpots.forEach(([angle, radius, size], index) => {
    builder.sphere(
      "matte",
      shade(darkBasalt, 0.9 + hash(index, 2, 5) * 0.3),
      size,
      [
        volcanoAt.x + Math.sin(angle) * radius,
        size * 0.45,
        volcanoAt.z + Math.cos(angle) * radius,
      ],
      [1.2, 0.75, 1],
      9,
    );
  });
  /* A glowing pool where a lava stream reaches the ground */
  const poolAngle = 1.25;
  const pool: Triple = [
    volcanoAt.x + Math.sin(poolAngle) * 3.45,
    0.03,
    volcanoAt.z + Math.cos(poolAngle) * 3.45,
  ];
  builder.cylinder("glow", lava, {
    radius: 0.55,
    length: 0.04,
    at: pool,
    segments: 16,
  });
  builder.cylinder("glow", lavaCore, {
    radius: 0.3,
    length: 0.05,
    at: [pool[0] + 0.05, 0.035, pool[2]],
    segments: 12,
  });
  for (let stone = 0; stone < 7; stone++) {
    const angle = (stone / 7) * Math.PI * 2;
    builder.sphere(
      "matte",
      shade(darkBasalt, 0.9 + hash(stone, 9, 1) * 0.25),
      0.13,
      [
        pool[0] + Math.sin(angle) * 0.62,
        0.06,
        pool[2] + Math.cos(angle) * 0.62,
      ],
      [1.2, 0.6, 1],
      6,
    );
  }
  /* Bronze plaques naming the layers of the cut */
  [
    { radius: 2.4, height: 0.45 },
    { radius: 1.4, height: 1.3 },
  ].forEach(({ radius, height }) => {
    builder.box(
      "metal",
      bronze,
      [0.04, 0.16, 0.42],
      [volcanoAt.x - 0.02, height, volcanoAt.z + radius],
    );
    builder.box(
      "metal",
      bronze,
      [0.42, 0.16, 0.04],
      [volcanoAt.x - radius, height, volcanoAt.z + 0.02],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The eruption slide: a bronze chute spiralling down the cone         */
/* ------------------------------------------------------------------ */

const chuteFirstAngle = cutStart - 0.18;
const chuteLastAngle = Math.PI / 4;
const chuteNearRadius = 1.0;
const chuteFarRadius = 3.6;

/** A point on the slide's floor, from its top (0) to its foot (1). */
export const findChutePoint = (share: number): Vector3 => {
  const radius = chuteNearRadius + (chuteFarRadius - chuteNearRadius) * share;
  const angle = chuteFirstAngle + (chuteLastAngle - chuteFirstAngle) * share;
  return new Vector3(
    volcanoAt.x + Math.sin(angle) * radius,
    findConeTop(radius) + 0.24,
    volcanoAt.z + Math.cos(angle) * radius,
  );
};

/** A box stretched from one point to another, lifted and slid sideways. */
const addStrut = (
  builder: AttractionBuilder,
  finish: "paint" | "metal",
  colour: string,
  from: Vector3,
  to: Vector3,
  [width, height]: [number, number],
  [aside, lift]: [number, number],
) => {
  const length = from.distanceTo(to) + 0.05;
  const flat = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const tilt = Math.atan2(-(to.y - from.y), flat);
  const side = new Vector3(Math.cos(turn), 0, -Math.sin(turn));
  const middle = from.clone().add(to).multiplyScalar(0.5);
  builder.add(
    finish,
    colour,
    new BoxGeometry(width, height, length).rotateX(tilt).rotateY(turn),
    {
      at: [
        middle.x + side.x * aside,
        middle.y + lift,
        middle.z + side.z * aside,
      ],
    },
    undefined,
  );
};

export const buildChute = (builder: AttractionBuilder) => {
  const pieces = builder.isFar ? 8 : 30;
  for (let piece = 0; piece < pieces; piece++) {
    const from = findChutePoint(piece / pieces);
    const to = findChutePoint((piece + 1) / pieces);
    addStrut(builder, "paint", "#e0832f", from, to, [0.62, 0.06], [0, -0.03]);
    [-1, 1].forEach((side) => {
      addStrut(
        builder,
        "metal",
        piece % 2 === 0 ? bronze : shade(bronze, 0.9),
        from,
        to,
        [0.05, 0.24],
        [side * 0.32, 0.08],
      );
    });
  }
  /* The launch pad at the top, by the crater's lip */
  const top = findChutePoint(0);
  builder.cylinder("metal", darkBronze, {
    radius: 0.42,
    length: 0.08,
    at: [top.x, top.y - 0.04, top.z],
    segments: 14,
  });
  if (builder.isFar) {
    return;
  }
  /* Posts holding up the run-out over the ground */
  [0.84, 0.92, 0.98].forEach((share) => {
    const point = findChutePoint(share);
    builder.cylinder("metal", darkBronze, {
      radius: 0.04,
      length: point.y,
      at: [point.x, point.y / 2, point.z],
      segments: 6,
    });
  });
  const foot = findChutePoint(1);
  builder.cylinder("matte", "#c9a97a", {
    radius: 0.55,
    length: 0.06,
    at: [foot.x + 0.35, 0.03, foot.z + 0.35],
    segments: 16,
  });
};

/* ------------------------------------------------------------------ */
/* The museum hall: a six-sided pavilion of basalt and bronze          */
/* ------------------------------------------------------------------ */

export const hallAt = { x: 4.4, z: -2.8 };
const hallRadius = 2.2;
const hallHeight = 2.3;
const hallApothem = hallRadius * Math.cos(Math.PI / 6);
export const hallFront = hallAt.z + hallApothem;

const hexagon = (
  builder: AttractionBuilder,
  finish: "matte" | "paint" | "metal" | "glass" | "glow",
  colour: string,
  radius: number,
  height: number,
  at: Triple,
  radiusTop = radius,
) => {
  builder.add(
    finish,
    colour,
    new CylinderGeometry(radiusTop, radius, height, 6),
    { at, rotation: [0, Math.PI / 6, 0] },
    undefined,
  );
};

const buildHallWalls = (builder: AttractionBuilder) => {
  for (let side = 0; side < 6; side++) {
    const turn = (side * Math.PI) / 3;
    const out = (distance: number, up: number): Triple => [
      hallAt.x + Math.sin(turn) * distance,
      up,
      hallAt.z + Math.cos(turn) * distance,
    ];
    if (side === 0) {
      /* The glass front, with a bronze door in the middle */
      builder.box(
        "glass",
        "#5f88a3",
        [hallRadius - 0.2, hallHeight - 0.35, 0.06],
        out(hallApothem - 0.08, 0.2 + (hallHeight - 0.35) / 2),
        [0, turn, 0],
      );
      builder.box(
        "matte",
        basalt,
        [hallRadius, 0.3, 0.3],
        out(hallApothem - 0.15, hallHeight - 0.15),
        [0, turn, 0],
      );
      addDoor(builder, {
        at: out(hallApothem - 0.04, 0.2),
        width: 0.7,
        height: 1.3,
        colour: darkBronze,
        frame: bronze,
        turn,
      });
      if (!builder.isFar) {
        [-0.75, -0.45, 0.45, 0.75].forEach((along) => {
          builder.box(
            "metal",
            bronze,
            [0.05, hallHeight - 0.35, 0.08],
            [
              hallAt.x + Math.cos(turn) * along,
              0.2 + (hallHeight - 0.35) / 2,
              hallAt.z + hallApothem - 0.04,
            ],
          );
        });
        builder.box(
          "metal",
          bronze,
          [hallRadius - 0.2, 0.05, 0.08],
          out(hallApothem - 0.04, 1.65),
        );
        /* The name board over the door */
        builder.box(
          "paint",
          signColour,
          [1.5, 0.28, 0.06],
          out(hallApothem + 0.04, 1.86),
        );
        [-0.45, -0.15, 0.15, 0.45].forEach((along, index) => {
          builder.box(
            "paint",
            palette.cream,
            [0.22, 0.1, 0.02],
            [hallAt.x + along, 1.86 + (index % 2) * 0.02, hallFront + 0.08],
          );
        });
      }
      continue;
    }
    builder.box(
      "matte",
      shade(basalt, side % 2 === 0 ? 1 : 0.92),
      [hallRadius, hallHeight, 0.3],
      out(hallApothem - 0.15, hallHeight / 2),
      [0, turn, 0],
    );
    if (side === 1 || side === 5) {
      addWindow(builder, {
        at: out(hallApothem + 0.01, 1.25),
        width: 1.2,
        height: 0.9,
        frame: bronze,
        turn,
        isLit: true,
      });
      continue;
    }
    if (builder.isFar) {
      continue;
    }
    /* Ribs, like the joints between basalt columns */
    [-0.75, -0.4, -0.05, 0.3, 0.65].forEach((along, index) => {
      const lift = 0.15 * hash(side, index, 3);
      builder.add(
        "matte",
        shade(darkBasalt, 1 + hash(index, side, 1) * 0.2),
        new CylinderGeometry(0.17, 0.17, hallHeight - 0.4 - lift, 6),
        {
          at: [
            hallAt.x +
              Math.sin(turn) * (hallApothem + 0.02) +
              Math.cos(turn) * along,
            (hallHeight - 0.4 - lift) / 2 + 0.2,
            hallAt.z +
              Math.cos(turn) * (hallApothem + 0.02) -
              Math.sin(turn) * along,
          ],
        },
        undefined,
      );
    });
  }
  /* Corner columns, capped with bronze */
  for (let corner = 0; corner < 6; corner++) {
    const turn = (corner * Math.PI) / 3 + Math.PI / 6;
    const x = hallAt.x + Math.sin(turn) * hallRadius;
    const z = hallAt.z + Math.cos(turn) * hallRadius;
    builder.cylinder("matte", darkBasalt, {
      radius: 0.2,
      length: hallHeight + 0.2,
      at: [x, (hallHeight + 0.2) / 2, z],
      segments: 8,
    });
    builder.cylinder("metal", bronze, {
      radius: 0.24,
      length: 0.1,
      at: [x, hallHeight + 0.25, z],
      segments: 8,
    });
  }
};

const buildHallRoof = (builder: AttractionBuilder) => {
  hexagon(builder, "matte", darkPaving, hallRadius + 0.2, 0.2, [
    hallAt.x,
    0.1,
    hallAt.z,
  ]);
  hexagon(builder, "glow", lava, hallRadius + 0.32, 0.06, [
    hallAt.x,
    hallHeight - 0.02,
    hallAt.z,
  ]);
  hexagon(builder, "matte", "#3a3330", hallRadius + 0.38, 0.2, [
    hallAt.x,
    hallHeight + 0.1,
    hallAt.z,
  ]);
  hexagon(
    builder,
    "matte",
    "#4a423e",
    1.3,
    0.35,
    [hallAt.x, hallHeight + 0.37, hallAt.z],
    hallRadius + 0.2,
  );
  hexagon(builder, "glass", "#e09a4a", 0.95, 0.55, [
    hallAt.x,
    hallHeight + 0.82,
    hallAt.z,
  ]);
  hexagon(builder, "metal", bronze, 1.1, 0.1, [
    hallAt.x,
    hallHeight + 0.845,
    hallAt.z,
  ]);
  /* A little bronze volcano on top, lava glowing in its crater */
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0],
      [0.42, 0],
      [0.3, 0.2],
      [0.14, 0.45],
      [0.09, 0.42],
      [0.001, 0.4],
    ],
    [hallAt.x, hallHeight + 0.9, hallAt.z],
    "y",
    16,
  );
  builder.sphere("glow", lavaCore, 0.09, [
    hallAt.x,
    hallHeight + 1.32,
    hallAt.z,
  ]);
  if (builder.isFar) {
    return;
  }
  for (let side = 0; side < 6; side++) {
    const turn = (side * Math.PI) / 3 + Math.PI / 6;
    builder.box(
      "metal",
      bronze,
      [0.04, 0.55, 0.04],
      [
        hallAt.x + Math.sin(turn) * 0.95,
        hallHeight + 0.82,
        hallAt.z + Math.cos(turn) * 0.95,
      ],
    );
  }
};

export const buildHall = (builder: AttractionBuilder) => {
  buildHallWalls(builder);
  buildHallRoof(builder);
  /* The path up to the door, and its step */
  builder.box(
    "matte",
    paving,
    [1.3, 0.04, 2.0],
    [hallAt.x, 0.02, hallFront + 1],
  );
  builder.box(
    "matte",
    darkPaving,
    [1.1, 0.12, 0.35],
    [hallAt.x, 0.06, hallFront + 0.2],
  );
};

/* ------------------------------------------------------------------ */
/* The causeway: basalt columns to climb, like the Giant's Causeway    */
/* ------------------------------------------------------------------ */

const causewayAt = { x: 4.3, z: 3.4 };
const columnRadius = 0.42;
const columnRings = 3;

interface BasaltColumn {
  x: number;
  z: number;
  height: number;
}

const hexDistance = (q: number, r: number): number =>
  (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

const columnKey = (q: number, r: number) => `${String(q)},${String(r)}`;

const planCauseway = (): Map<string, BasaltColumn> => {
  const columns = new Map<string, BasaltColumn>();
  for (let q = -columnRings; q <= columnRings; q++) {
    for (let r = -columnRings; r <= columnRings; r++) {
      const ring = hexDistance(q, r);
      if (ring > columnRings) {
        continue;
      }
      if (ring === columnRings && hash(q, r, 4) < 0.3) {
        continue;
      }
      columns.set(columnKey(q, r), {
        x: causewayAt.x + Math.sqrt(3) * columnRadius * (q + r / 2),
        z: causewayAt.z + 1.5 * columnRadius * r,
        height: 0.24 + 0.2 * (columnRings - ring) + 0.04 * hash(q, r, 8),
      });
    }
  }
  return columns;
};

const causeway = planCauseway();

export const buildCauseway = (builder: AttractionBuilder) => {
  if (builder.isFar) {
    /* From afar, the columns read as a stepped mound */
    for (let ring = columnRings; ring >= 0; ring--) {
      const height = 0.26 + 0.2 * (columnRings - ring);
      builder.add(
        "matte",
        ring % 2 === 0 ? basalt : shade(basalt, 0.88),
        new CylinderGeometry(
          (ring + 0.6) * columnRadius * 1.6,
          (ring + 0.6) * columnRadius * 1.6,
          height,
          6,
        ),
        { at: [causewayAt.x, height / 2, causewayAt.z] },
        undefined,
      );
    }
    return;
  }
  let index = 0;
  causeway.forEach(({ x, z, height }) => {
    const side = shade(basalt, 0.85 + hash(index, 1, 2) * 0.3);
    const top = shade(ash, 0.8 + hash(index, 3, 1) * 0.25);
    builder.painted(
      new CylinderGeometry(columnRadius * 0.95, columnRadius, height, 6),
      (_, normal) => ({
        colour: normal.y > 0.5 ? top : side,
        finish: "matte",
      }),
      { at: [x, height / 2, z] },
      "matte",
      undefined,
    );
    index++;
  });
};

/** Where the Character stands on the causeway's columns. */
export const causewayDeck: Deck = ({ x, z }) => {
  const r = (z - causewayAt.z) / (1.5 * columnRadius);
  const q = (x - causewayAt.x) / (Math.sqrt(3) * columnRadius) - r / 2;
  const s = -q - r;
  let roundQ = Math.round(q);
  let roundR = Math.round(r);
  const roundS = Math.round(s);
  const missQ = Math.abs(roundQ - q);
  const missR = Math.abs(roundR - r);
  const missS = Math.abs(roundS - s);
  if (missQ > missR && missQ > missS) {
    roundQ = -roundR - roundS;
  } else if (missR > missS) {
    roundR = -roundQ - roundS;
  }
  const column = causeway.get(columnKey(roundQ, roundR));
  return column === undefined
    ? undefined
    : { height: column.height, kind: "ground" };
};

/* ------------------------------------------------------------------ */
/* Rock samples on plinths                                             */
/* ------------------------------------------------------------------ */

export const plinthSpots: readonly LocalPoint[] = [
  { x: -7.4, z: 3.0 },
  { x: -6.2, z: 3.4 },
  { x: -5.0, z: 3.7 },
  { x: -3.8, z: 3.9 },
];

const buildRockSample = (
  builder: AttractionBuilder,
  kind: number,
  [x, y, z]: Triple,
) => {
  if (kind === 0) {
    /* Obsidian: black volcanic glass, shiny with sharp edges */
    builder.add(
      "glass",
      "#17141c",
      new IcosahedronGeometry(0.2, builder.isFar ? 0 : 1),
      { at: [x, y + 0.14, z], scale: [1.25, 0.75, 1], rotation: [0.3, 0.5, 0] },
      undefined,
    );
    return;
  }
  if (kind === 1) {
    /* Pumice: so full of gas bubbles it floats */
    builder.sphere(
      "matte",
      "#d8d0bf",
      0.2,
      [x, y + 0.15, z],
      [1.2, 0.8, 1],
      12,
    );
    if (!builder.isFar) {
      for (let hole = 0; hole < 8; hole++) {
        const angle = hole * 2.4;
        builder.sphere(
          "matte",
          "#8c8476",
          0.028,
          [
            x + Math.sin(angle) * 0.2,
            y + 0.13 + (hole % 3) * 0.05,
            z + Math.cos(angle) * 0.16,
          ],
          [1, 1, 1],
          6,
        );
      }
    }
    return;
  }
  if (kind === 2) {
    /* Granite: big crystals, cooled slowly underground */
    builder.box(
      "matte",
      "#c7a39b",
      [0.36, 0.26, 0.28],
      [x, y + 0.13, z],
      [0, 0.4, 0],
    );
    if (!builder.isFar) {
      for (let fleck = 0; fleck < 10; fleck++) {
        builder.box(
          "matte",
          fleck % 2 === 0 ? "#2b2523" : "#f2ece2",
          [0.04, 0.04, 0.02],
          [
            x - 0.13 + hash(fleck, 1, 0) * 0.26,
            y + 0.05 + hash(fleck, 2, 0) * 0.17,
            z + 0.13,
          ],
        );
      }
    }
    return;
  }
  /* Basalt: lava that cooled fast, often into six-sided columns */
  [
    [-0.08, 0, 0.34],
    [0.1, 0.04, 0.26],
    [0.01, -0.12, 0.2],
  ].forEach(([dx, dz, height]) => {
    builder.add(
      "matte",
      shade(basalt, 1 + dx),
      new CylinderGeometry(0.09, 0.09, height, 6),
      { at: [x + dx, y + height / 2, z + dz] },
      undefined,
    );
  });
};

export const buildPlinths = (builder: AttractionBuilder) => {
  plinthSpots.forEach(({ x, z }, kind) => {
    builder.box("matte", darkBasalt, [0.6, 0.66, 0.6], [x, 0.33, z]);
    builder.box("matte", basalt, [0.66, 0.06, 0.66], [x, 0.03, z]);
    builder.box("metal", bronze, [0.68, 0.05, 0.68], [x, 0.745, z]);
    buildRockSample(builder, kind, [x, 0.77, z]);
    if (!builder.isFar) {
      builder.box(
        "paint",
        palette.cream,
        [0.36, 0.14, 0.02],
        [x, 0.5, z + 0.31],
        [-0.2, 0, 0],
      );
      builder.box(
        "paint",
        palette.black,
        [0.26, 0.02, 0.01],
        [x, 0.52, z + 0.325],
        [-0.2, 0, 0],
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The seismograph, which draws the ground's shaking                   */
/* ------------------------------------------------------------------ */

export const seismographAt = { x: -4.2, z: 6.6 };
export const drumPivot: Triple = [seismographAt.x, 1.0, seismographAt.z - 0.08];
export const pendulumPivot: Triple = [
  seismographAt.x,
  1.82,
  seismographAt.z + 0.16,
];

export const buildSeismograph = (builder: AttractionBuilder) => {
  const { x, z } = seismographAt;
  builder.box("paint", "#5a3a26", [1.4, 0.76, 0.7], [x, 0.38, z]);
  builder.box("metal", bronze, [1.46, 0.05, 0.76], [x, 0.785, z]);
  [-0.55, 0.55].forEach((side) => {
    builder.cylinder("metal", darkBronze, {
      radius: 0.04,
      length: 1.1,
      at: [x + side, 1.35, z + 0.16],
      segments: 8,
    });
    builder.box(
      "metal",
      darkBronze,
      [0.08, 0.3, 0.08],
      [x + side * 0.88, 0.95, z - 0.08],
    );
  });
  builder.cylinder("metal", bronze, {
    radius: 0.045,
    length: 1.2,
    at: [x, 1.88, z + 0.16],
    axis: "x",
    segments: 8,
  });
  /* A board behind: the zigzag of an earthquake */
  builder.box("paint", lava, [1.3, 0.6, 0.05], [x, 1.4, z - 0.4]);
  if (builder.isFar) {
    return;
  }
  for (let step = 0; step < 10; step++) {
    const fromX = x - 0.55 + step * 0.11;
    const swing = step >= 3 && step <= 6 ? 0.2 : 0.05;
    const from = new Vector3(fromX, 1.4 + (step % 2 === 0 ? swing : -swing), z);
    const to = new Vector3(
      fromX + 0.11,
      1.4 + (step % 2 === 0 ? -swing : swing),
      z,
    );
    builder.bar(
      "paint",
      palette.cream,
      [from.x, from.y, z - 0.37],
      [to.x, to.y, z - 0.37],
      0.03,
      4,
    );
  }
  builder.box("paint", palette.cream, [0.5, 0.1, 0.02], [x, 0.55, z + 0.36]);
};

export const buildDrum = (builder: AttractionBuilder) => {
  builder.cylinder("paint", palette.white, {
    radius: 0.17,
    length: 0.9,
    at: [0, 0, 0],
    axis: "x",
    segments: 18,
  });
  [-0.47, 0.47].forEach((side) => {
    builder.cylinder("metal", bronze, {
      radius: 0.19,
      length: 0.04,
      at: [side, 0, 0],
      axis: "x",
      segments: 18,
    });
  });
  if (builder.isFar) {
    return;
  }
  for (let mark = 0; mark < 16; mark++) {
    const angle = (mark / 16) * Math.PI * 2;
    const wobble = 0.16 * Math.sin(mark * 1.9) * (mark % 6 < 3 ? 1 : 0.3);
    builder.box(
      "paint",
      palette.black,
      [0.02 + Math.abs(wobble) * 0.6, 0.012, 0.05],
      [wobble, Math.cos(angle) * 0.172, Math.sin(angle) * 0.172],
      [angle, 0, 0],
    );
  }
};

export const buildPendulum = (builder: AttractionBuilder) => {
  builder.cylinder("metal", darkBronze, {
    radius: 0.018,
    length: 0.62,
    at: [0, -0.31, 0],
    segments: 6,
  });
  builder.sphere("metal", bronze, 0.11, [0, -0.66, 0], [1, 1, 1], 14);
  builder.bar(
    "metal",
    palette.steel,
    [0, -0.66, 0],
    [0, -0.78, -0.05],
    0.02,
    5,
  );
  builder.cylinder("paint", palette.postRed, {
    radius: 0.012,
    radiusEnd: 0.003,
    length: 0.06,
    at: [0, -0.79, -0.08],
    axis: "z",
    segments: 5,
  });
};

/* ------------------------------------------------------------------ */
/* Smaller things                                                      */
/* ------------------------------------------------------------------ */

/** The lava bubbling up out of the crater when the Character comes near. */
export const buildEruption = (builder: AttractionBuilder) => {
  builder.lathe(
    "glow",
    lava,
    [
      [0.001, 0],
      [0.42, 0.05],
      [0.3, 0.3],
      [0.18, 0.62],
      [0.001, 0.75],
    ],
    [0, 0, 0],
    "y",
    14,
  );
  const blobs: [number, number, number, number][] = builder.isFar
    ? [[0, 0.85, 0, 0.18]]
    : [
        [0, 0.85, 0, 0.18],
        [0.28, 0.62, 0.1, 0.12],
        [-0.24, 0.7, -0.12, 0.13],
        [0.1, 1.1, -0.2, 0.1],
        [-0.12, 1.25, 0.16, 0.08],
        [0.3, 1.05, 0.25, 0.07],
      ];
  blobs.forEach(([x, y, z, size], index) => {
    builder.sphere(
      "glow",
      index % 2 === 0 ? lavaCore : lava,
      size,
      [x, y, z],
      [1, 1.1, 1],
      10,
    );
  });
};

export const brazierSpots: readonly LocalPoint[] = [
  { x: hallAt.x - 1.15, z: hallFront + 0.55 },
  { x: hallAt.x + 1.15, z: hallFront + 0.55 },
];

export const buildBraziers = (builder: AttractionBuilder) => {
  brazierSpots.forEach(({ x, z }) => {
    if (builder.isFar) {
      builder.cylinder("metal", bronze, {
        radius: 0.25,
        radiusEnd: 0.06,
        length: 0.96,
        at: [x, 0.48, z],
        segments: 8,
      });
      return;
    }
    [0, 1, 2].forEach((leg) => {
      const angle = (leg / 3) * Math.PI * 2;
      builder.bar(
        "metal",
        darkBronze,
        [x + Math.sin(angle) * 0.24, 0, z + Math.cos(angle) * 0.24],
        [x + Math.sin(angle) * 0.08, 0.8, z + Math.cos(angle) * 0.08],
        0.04,
        5,
      );
    });
    builder.lathe(
      "metal",
      bronze,
      [
        [0.001, 0],
        [0.1, 0],
        [0.24, 0.12],
        [0.28, 0.2],
        [0.25, 0.21],
      ],
      [x, 0.78, z],
      "y",
      14,
    );
    builder.cylinder("glow", lava, {
      radius: 0.22,
      length: 0.04,
      at: [x, 0.96, z],
      segments: 12,
    });
  });
};

export const buildFlame = (builder: AttractionBuilder) => {
  builder.lathe(
    "glow",
    lava,
    [
      [0.001, 0],
      [0.17, 0.04],
      [0.13, 0.22],
      [0.05, 0.42],
      [0.001, 0.5],
    ],
    [0, 0, 0],
    "y",
    10,
  );
  builder.lathe(
    "glow",
    lavaCore,
    [
      [0.001, 0],
      [0.09, 0.03],
      [0.06, 0.18],
      [0.001, 0.3],
    ],
    [0, 0.02, 0.02],
    "y",
    8,
  );
};

/** A museum visitor in a bright hard hat. */
export const buildVisitor = (builder: AttractionBuilder) => {
  [-0.065, 0.065].forEach((side) => {
    builder.box("matte", "#2d3a4f", [0.09, 0.36, 0.1], [side, 0.18, 0]);
  });
  builder.cylinder("matte", "#2f8a86", {
    radius: 0.15,
    radiusEnd: 0.12,
    length: 0.38,
    at: [0, 0.55, 0],
    segments: 8,
  });
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#2f8a86",
      [side * 0.16, 0.68, 0],
      [side * 0.2, 0.42, 0.05],
      0.07,
      5,
    );
  });
  builder.sphere("matte", "#e8b894", 0.12, [0, 0.84, 0], [1, 1, 1], 10);
  builder.sphere(
    "paint",
    "#f2a51c",
    0.13,
    [0, 0.9, 0],
    [1, 0.7, 1.05],
    builder.isFar ? 6 : 10,
  );
  if (!builder.isFar) {
    builder.cylinder("paint", "#f2a51c", {
      radius: 0.16,
      length: 0.02,
      at: [0, 0.89, 0.02],
      segments: 10,
    });
    builder.box("matte", "#5a3a26", [0.2, 0.16, 0.08], [0, 0.56, -0.12]);
  }
};
