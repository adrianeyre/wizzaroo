import {
  BoxGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
} from "three";
import {
  addGableRoof,
  shade,
  type AttractionBuilder,
  type Triple,
} from "../attractions/attraction-kit.js";

export const heath = "#5e6b3c";
export const sand = "#c9a874";
export const spoil = "#a98a5c";
export const rust = "#6e3b22";
export const oak = "#7a5434";
export const oakDark = "#4f3522";
export const thatch = "#b48f52";
export const iron = "#7c8086";
export const ironDark = "#4c5056";
export const bronze = "#b5793a";
export const gold = "#d9a93a";
export const garnet = "#9e1b2f";
export const basalt = "#3a3532";
export const lava = "#ff6a1f";
export const lavaCore = "#ffc04a";
export const rope = "#c8b48a";

/* ------------------------------------------------------------------ */
/* The burial mounds, which the Character can climb                     */
/* ------------------------------------------------------------------ */

export interface Mound {
  x: number;
  z: number;
  radius: number;
  height: number;
}

/** A mound's height a distance out from its middle: a gentle dome. */
export const findMoundHeight = (mound: Mound, distance: number): number => {
  const share = distance / mound.radius;
  return share >= 1 ? 0 : mound.height * (1 - share * share);
};

const latheOf = (profile: readonly [number, number][], segments: number) =>
  new LatheGeometry(
    profile.map(([radius, height]) => new Vector2(radius, height)),
    segments,
  );

export const addMound = (builder: AttractionBuilder, mound: Mound) => {
  const rings = builder.isFar ? 5 : 11;
  const profile: [number, number][] = Array.from(
    { length: rings + 1 },
    (_, index) => {
      /* Rings closer together towards the foot, where it is steepest */
      const share = Math.sqrt(index / rings);
      const distance = mound.radius * (1 - share) + 0.001;
      return [distance, findMoundHeight(mound, distance)];
    },
  );
  profile.unshift([mound.radius + 0.15, -0.02]);
  builder.painted(
    builder.isFar
      ? latheOf(profile, 14)
      : latheOf(profile, Math.round(14 + mound.radius * 4)),
    (centre, normal) => {
      const mottle =
        0.93 + 0.12 * Math.abs(Math.sin(centre.x * 3.1 + centre.z * 2.3));
      return shade(heath, mottle * (0.82 + normal.y * 0.22));
    },
    { at: [mound.x, 0, mound.z] },
    "matte",
  );
};

/* ------------------------------------------------------------------ */
/* The excavated ship: rows of rusty rivets in the sand                 */
/* ------------------------------------------------------------------ */

export const trench = {
  x: 3.4,
  minZ: -6.3,
  maxZ: 0.1,
  halfBeam: 0.85,
  depth: 0.45,
};

const trenchMiddleZ = (trench.minZ + trench.maxZ) / 2;
const trenchLength = trench.maxZ - trench.minZ;

/** How wide the ship is along its length, from 0 at the ends to 1. */
const beamAt = (share: number): number =>
  Math.max(0.06, Math.sin(Math.PI * share) ** 0.65);

/** A rib's shape across the ship, from one gunwale to the other. */
const ribPoints = (z: number, beam: number): Triple[] => {
  const across: [number, number][] = [
    [-1, 1],
    [-0.88, 0.62],
    [-0.62, 0.3],
    [0, 0.08],
    [0.62, 0.3],
    [0.88, 0.62],
    [1, 1],
  ];
  return across.map(([side, up]) => [
    trench.x + side * trench.halfBeam * beam,
    0.04 + up * (trench.depth - 0.04) * (0.55 + 0.45 * beam),
    z,
  ]);
};

export const buildTrench = (builder: AttractionBuilder) => {
  const outerHalf = trench.halfBeam + 0.55;
  /* The sandy floor of the dig */
  builder.box(
    "matte",
    sand,
    [outerHalf * 2, 0.04, trenchLength + 0.6],
    [trench.x, 0.02, trenchMiddleZ],
  );
  /* Spoil banks, the dug-out earth heaped round the hole */
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      spoil,
      [0.5, trench.depth, trenchLength + 1.6],
      [trench.x + side * (outerHalf + 0.2), trench.depth / 2, trenchMiddleZ],
    );
    builder.box(
      "matte",
      shade(spoil, 1.1),
      [0.62, 0.08, trenchLength + 1.7],
      [trench.x + side * (outerHalf + 0.2), trench.depth, trenchMiddleZ],
    );
  });
  [trench.minZ - 0.55, trench.maxZ + 0.55].forEach((z) => {
    builder.box(
      "matte",
      spoil,
      [outerHalf * 2 + 0.4, trench.depth, 0.5],
      [trench.x, trench.depth / 2, z],
    );
  });
  /* The keel line and the two gunwales */
  const stations = builder.isFar ? 6 : 14;
  const ribs = Array.from({ length: stations + 1 }, (_, index) => {
    const share = index / stations;
    return ribPoints(trench.minZ + share * trenchLength, beamAt(share));
  });
  [0, 3, 6].forEach((point) => {
    for (let rib = 0; rib < stations; rib++) {
      builder.bar(
        "matte",
        point === 3 ? oakDark : rust,
        ribs[rib][point],
        ribs[rib + 1][point],
        point === 3 ? 0.07 : 0.05,
        4,
      );
    }
  });
  /* The ribs, the ghostly shape left by rotted timbers */
  ribs.slice(1, -1).forEach((points, index) => {
    if (builder.isFar && index % 2 === 0) {
      return;
    }
    for (let point = 0; point < points.length - 1; point++) {
      builder.bar("matte", rust, points[point], points[point + 1], 0.045, 4);
    }
  });
  if (builder.isFar) {
    return;
  }
  /* Rows of iron rivets along the planks */
  [1, 2, 4, 5].forEach((point) => {
    for (let rib = 1; rib < stations; rib++) {
      const [ax, ay, az] = ribs[rib][point];
      const [bx, by, bz] = ribs[rib + 1][point];
      builder.box(
        "matte",
        shade(rust, 0.8),
        [0.05, 0.03, 0.05],
        [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2],
      );
    }
  });
  /* Darker sand where the hull lay */
  builder.box(
    "matte",
    shade(sand, 0.85),
    [trench.halfBeam * 1.4, 0.01, trenchLength * 0.8],
    [trench.x, 0.045, trenchMiddleZ],
  );
};

/** The burial chamber in the ship's middle, where the treasure lay. */
export const chamberZ = trenchMiddleZ;

export const buildChamber = (builder: AttractionBuilder) => {
  const x = trench.x;
  const z = chamberZ;
  /* A low timber frame, the outline of the chamber */
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.box(
        "matte",
        oakDark,
        [0.08, 0.5, 0.08],
        [x + side * 0.45, 0.27, z + end * 0.7],
      );
    });
    builder.box("matte", oak, [0.06, 0.06, 1.48], [x + side * 0.45, 0.52, z]);
  });
  builder.box("matte", oak, [0.96, 0.06, 0.06], [x, 0.52, z - 0.7]);
  /* Treasures: a shield, a cauldron, drinking horns and a gold buckle */
  builder.cylinder("metal", bronze, {
    radius: 0.24,
    length: 0.03,
    at: [x - 0.18, 0.08, z - 0.35],
    segments: builder.segments(14, 6),
  });
  builder.sphere(
    "metal",
    gold,
    0.06,
    [x - 0.18, 0.1, z - 0.35],
    [1, 0.6, 1],
    8,
  );
  if (builder.isFar) {
    return;
  }
  builder.lathe(
    "metal",
    bronze,
    [
      [0.001, 0],
      [0.12, 0.02],
      [0.18, 0.12],
      [0.17, 0.2],
    ],
    [x + 0.2, 0.04, z + 0.25],
    "y",
    10,
  );
  [-1, 1].forEach((side) => {
    builder.bar(
      "matte",
      "#e7d9b5",
      [x + side * 0.12, 0.06, z + 0.45],
      [x + side * 0.3, 0.1, z + 0.62],
      0.05,
      4,
    );
    builder.sphere(
      "metal",
      gold,
      0.03,
      [x + side * 0.12, 0.06, z + 0.45],
      [1, 1, 1],
      5,
    );
  });
  builder.box("metal", gold, [0.1, 0.03, 0.2], [x - 0.15, 0.06, z + 0.15]);
  builder.box(
    "paint",
    garnet,
    [0.06, 0.035, 0.08],
    [x - 0.15, 0.065, z + 0.15],
  );
};

/* ------------------------------------------------------------------ */
/* The great helmet                                                    */
/* ------------------------------------------------------------------ */

/** The helmet, standing on y = 0 and facing +z. */
export const buildHelmet = (builder: AttractionBuilder) => {
  /* The iron cap */
  builder.sphere(
    "metal",
    iron,
    0.18,
    [0, 0.26, 0],
    [1, 1.05, 1.1],
    builder.segments(14, 8),
  );
  /* The neck guard and cheek guards */
  builder.cylinder("metal", ironDark, {
    radius: 0.2,
    radiusEnd: 0.18,
    length: 0.14,
    at: [0, 0.14, -0.04],
    segments: builder.segments(14, 6),
    isOpen: true,
  });
  [-1, 1].forEach((side) => {
    builder.box(
      "metal",
      iron,
      [0.03, 0.18, 0.14],
      [side * 0.17, 0.12, 0.06],
      [0, side * 0.3, 0],
    );
  });
  /* The face mask */
  builder.box("metal", iron, [0.24, 0.2, 0.04], [0, 0.17, 0.17]);
  /* The crest, running over the top */
  builder.torus("metal", bronze, 0.19, 0.02, [0, 0.26, 0], "x", 14);
  if (builder.isFar) {
    return;
  }
  /* Eye holes, golden eyebrows set with garnets */
  [-1, 1].forEach((side) => {
    builder.sphere(
      "paint",
      "#141210",
      0.03,
      [side * 0.055, 0.22, 0.185],
      [1.3, 0.8, 0.5],
      6,
    );
    builder.bar(
      "metal",
      gold,
      [side * 0.015, 0.26, 0.19],
      [side * 0.11, 0.245, 0.18],
      0.025,
      4,
    );
    [0.04, 0.08].forEach((along) => {
      builder.box(
        "paint",
        garnet,
        [0.018, 0.014, 0.01],
        [side * along, 0.258, 0.2],
      );
    });
    /* The moustache: a dragon's wings */
    builder.bar(
      "metal",
      gold,
      [0, 0.14, 0.2],
      [side * 0.08, 0.125, 0.19],
      0.02,
      4,
    );
    /* Dragon heads at each end of the crest */
    builder.sphere(
      "metal",
      gold,
      0.028,
      [0, 0.3 + (side > 0 ? 0.13 : 0.12), side * 0.12],
      [0.8, 0.8, 1.4],
      6,
    );
  });
  /* The nose: the dragon's body, flying up to meet the crest */
  builder.box("metal", gold, [0.03, 0.12, 0.03], [0, 0.18, 0.2], [0.15, 0, 0]);
  builder.box("metal", bronze, [0.08, 0.02, 0.03], [0, 0.11, 0.195]);
  /* Tinned panels on the cap */
  [-0.5, 0, 0.5].forEach((turn) => {
    builder.box(
      "metal",
      "#a9acb0",
      [0.05, 0.08, 0.01],
      [Math.sin(turn) * 0.17, 0.3, 0.12 * Math.cos(turn)],
      [0, turn, 0],
    );
  });
};

/* ------------------------------------------------------------------ */
/* The replica ship, rocking on its cradle                             */
/* ------------------------------------------------------------------ */

export const replica = { x: 5.7, z: 3.9, halfLength: 1.8, halfBeam: 0.72 };
/** The pivot sits on the keel; the hull rocks about it. */
export const replicaPivot: Triple = [replica.x, 0.55, replica.z];
export const replicaSeat: Triple = [replica.x, 0.55 + 0.42, replica.z - 0.2];

const hullSection = (beam: number, rise: number): [number, number][] => [
  [-beam, 0.5 + rise],
  [-beam * 0.92, 0.3],
  [-beam * 0.6, 0.1],
  [0, 0],
  [beam * 0.6, 0.1],
  [beam * 0.92, 0.3],
  [beam, 0.5 + rise],
];

const shieldColours = [gold, "#2f5d8a", "#b23a2a", "#e6d5a8"];

/** The replica, round its pivot, facing +z. */
export const buildReplica = (builder: AttractionBuilder) => {
  const { halfLength, halfBeam } = replica;
  const count = builder.isFar ? 5 : 9;
  const stations = Array.from({ length: count }, (_, index) => {
    const share = index / (count - 1);
    const beam = halfBeam * Math.max(0.08, Math.sin(Math.PI * share) ** 0.6);
    const rise = 0.18 * (2 * share - 1) ** 2;
    return {
      z: -halfLength + share * halfLength * 2,
      points: hullSection(beam, rise),
    };
  });
  builder.loft({
    stations,
    paint: (centre) =>
      centre.y > 0.44
        ? shade(oak, 1.12)
        : Math.floor(centre.y / 0.1) % 2 === 0
          ? oak
          : shade(oak, 0.88),
    finish: "paint",
  });
  /* The tall stem and stern posts, the stem with a gold dragon's head */
  [-1, 1].forEach((end) => {
    builder.bar(
      "paint",
      oakDark,
      [0, 0.4, end * (halfLength - 0.05)],
      [0, 1.05, end * (halfLength + 0.25)],
      0.1,
      6,
    );
  });
  builder.sphere(
    "metal",
    gold,
    0.11,
    [0, 1.1, halfLength + 0.3],
    [0.8, 0.9, 1.4],
    builder.segments(10, 6),
  );
  if (builder.isFar) {
    return;
  }
  /* The dragon's jaw, eyes and curling tail */
  builder.box("metal", gold, [0.08, 0.04, 0.16], [0, 1.03, halfLength + 0.42]);
  [-1, 1].forEach((side) => {
    builder.sphere(
      "glow",
      lavaCore,
      0.02,
      [side * 0.06, 1.14, halfLength + 0.38],
      [1, 1, 1],
      5,
    );
  });
  builder.torus(
    "paint",
    oakDark,
    0.12,
    0.04,
    [0, 1.12, -halfLength - 0.32],
    "x",
    10,
  );
  /* Rowing benches */
  [-1.0, -0.4, 0.4, 1.0].forEach((z) => {
    builder.box(
      "paint",
      shade(oak, 1.2),
      [halfBeam * 1.6, 0.05, 0.16],
      [0, 0.5, z],
    );
  });
  /* Shields along both sides, and oars resting outwards */
  [-1, 1].forEach((side) => {
    [-1.1, -0.55, 0, 0.55, 1.1].forEach((z, index) => {
      const beam = halfBeam * Math.sin(Math.PI * (0.5 + z / (halfLength * 2)));
      builder.cylinder(
        "paint",
        shieldColours[(index + (side > 0 ? 1 : 0)) % shieldColours.length],
        {
          radius: 0.15,
          length: 0.03,
          at: [side * (beam + 0.03), 0.6, z],
          axis: "x",
          segments: 10,
        },
      );
      builder.sphere(
        "metal",
        bronze,
        0.04,
        [side * (beam + 0.05), 0.6, z],
        [1, 1, 1],
        5,
      );
    });
    [-0.7, 0.7].forEach((z) => {
      builder.bar(
        "paint",
        shade(oak, 1.25),
        [side * 0.3, 0.62, z],
        [side * (halfBeam + 0.45), 0.25, z + 0.15],
        0.04,
        4,
      );
    });
  });
};

/** The timber cradle the replica rocks on, with wooden waves. */
export const buildCradle = (builder: AttractionBuilder) => {
  const { x, z, halfLength } = replica;
  [-0.9, 0.9].forEach((along) => {
    [-1, 1].forEach((side) => {
      builder.bar(
        "matte",
        oakDark,
        [x + side * 0.6, 0, z + along],
        [x + side * 0.12, 0.52, z + along],
        0.1,
        5,
      );
    });
    builder.box("matte", oak, [0.4, 0.08, 0.16], [x, 0.52, z + along]);
  });
  /* Blue painted waves at its feet */
  builder.box(
    "paint",
    "#2f5d8a",
    [1.8, 0.04, halfLength * 2 + 0.8],
    [x, 0.02, z],
  );
  if (builder.isFar) {
    return;
  }
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 5; index++) {
      builder.sphere(
        "paint",
        index % 2 === 0 ? "#3f7fb3" : "#e9f1f5",
        0.16,
        [x + side * 0.8, 0.05, z - halfLength + index * 0.9],
        [1, 0.5, 2],
        8,
      );
    }
  });
};

/* ------------------------------------------------------------------ */
/* The Anglo-Saxon hall                                                */
/* ------------------------------------------------------------------ */

export const hall = {
  x: -4.7,
  z: 4.3,
  halfWidth: 1.2,
  halfLength: 1.8,
  wall: 1.3,
  rise: 1.55,
};

export const hallRidge: Triple = [hall.x, hall.wall + hall.rise + 0.08, hall.z];

const gableShape = (halfWidth: number, rise: number, base: number): Shape => {
  const shape = new Shape();
  shape.moveTo(-halfWidth, base);
  shape.lineTo(halfWidth, base);
  shape.lineTo(0, base + rise);
  shape.lineTo(-halfWidth, base);
  return shape;
};

const builderBox = (
  width: number,
  height: number,
  depth: number,
  isFar: boolean,
) =>
  new BoxGeometry(
    width,
    height,
    depth,
    isFar ? 1 : Math.round(width / 0.22),
    1,
    isFar ? 1 : Math.round(depth / 0.22),
  );

export const buildHall = (builder: AttractionBuilder) => {
  const { x, z, halfWidth, halfLength, wall, rise } = hall;
  /* Plank walls on a sill of stones */
  builder.box(
    "matte",
    basalt,
    [halfWidth * 2 + 0.16, 0.14, halfLength * 2 + 0.16],
    [x, 0.07, z],
  );
  builder.painted(
    builderBox(halfWidth * 2, wall, halfLength * 2, builder.isFar),
    (centre, normal) => {
      const along = Math.abs(normal.x) > 0.5 ? centre.z : centre.x;
      const plank = Math.floor((along + 10) / 0.22) % 2 === 0;
      return plank ? oak : shade(oak, 0.86);
    },
    { at: [x, 0.14 + wall / 2, z] },
    "matte",
  );
  /* The gable ends, planked too */
  [-1, 1].forEach((end) => {
    const front = z + end * halfLength;
    builder.add(
      "matte",
      shade(oak, 0.92),
      new ExtrudeGeometry(gableShape(halfWidth, rise, 0), {
        depth: 0.06,
        bevelEnabled: false,
      }),
      { at: [x, 0.14 + wall, front - 0.03] },
      undefined,
    );
  });
  addGableRoof(builder, {
    width: halfLength * 2 + 0.3,
    depth: halfWidth * 2,
    rise,
    at: [x, 0.14 + wall, z],
    colour: thatch,
    overhang: 0.35,
    thickness: 0.22,
    turn: Math.PI / 2,
  });
  /* The doorway, in the front gable, with carved door posts */
  const door = z + halfLength;
  builder.box("paint", oakDark, [0.6, 1.0, 0.04], [x, 0.64, door + 0.02]);
  [-1, 1].forEach((side) => {
    builder.box(
      "paint",
      shade(oakDark, 0.9),
      [0.12, 1.2, 0.12],
      [x + side * 0.38, 0.74, door + 0.06],
    );
    /* Crossed gable horns at the ridge ends, carved like dragons */
    [-1, 1].forEach((end) => {
      builder.bar(
        "paint",
        oakDark,
        [x, hallRidge[1] - 0.15, z + end * (halfLength + 0.15)],
        [x + side * 0.35, hallRidge[1] + 0.45, z + end * (halfLength + 0.2)],
        0.07,
        5,
      );
    });
  });
  if (builder.isFar) {
    return;
  }
  builder.box("paint", oakDark, [0.95, 0.12, 0.14], [x, 1.32, door + 0.06]);
  /* Iron studs and a ring handle */
  builder.torus(
    "metal",
    ironDark,
    0.06,
    0.012,
    [x + 0.16, 0.66, door + 0.05],
    "z",
    10,
  );
  /* Little shuttered windows down each side */
  [-1, 1].forEach((side) => {
    [-0.8, 0.8].forEach((along) => {
      builder.box(
        "glow",
        "#ffb45a",
        [0.04, 0.26, 0.34],
        [x + side * (halfWidth + 0.01), 0.95, z + along],
      );
      builder.box(
        "paint",
        oakDark,
        [0.05, 0.32, 0.06],
        [x + side * (halfWidth + 0.03), 0.95, z + along - 0.2],
      );
    });
  });
  /* Corner posts and a carved band */
  [-1, 1].forEach((side) => {
    [-1, 1].forEach((end) => {
      builder.box(
        "paint",
        oakDark,
        [0.14, wall + 0.1, 0.14],
        [x + side * halfWidth, 0.14 + wall / 2, z + end * halfLength],
      );
    });
  });
  /* Thatch ridge roll */
  builder.cylinder("matte", shade(thatch, 0.85), {
    radius: 0.12,
    length: halfLength * 2 + 0.7,
    at: [x, hallRidge[1] - 0.04, z],
    axis: "z",
    segments: 8,
  });
  /* Firewood stacked by the wall */
  for (let log = 0; log < 6; log++) {
    builder.cylinder("matte", log % 2 === 0 ? oak : shade(oak, 1.2), {
      radius: 0.07,
      length: 0.7,
      at: [
        x + halfWidth + 0.18 + (log % 2) * 0.13,
        0.07 + Math.floor(log / 2) * 0.12,
        z - 0.9,
      ],
      axis: "z",
      segments: 6,
    });
  }
};

/** A dragon weather vane, turning above the hall's ridge. */
export const buildVane = (builder: AttractionBuilder) => {
  builder.cylinder("metal", ironDark, {
    radius: 0.025,
    length: 0.7,
    at: [0, 0.35, 0],
    segments: 6,
  });
  builder.box("metal", gold, [0.04, 0.22, 0.55], [0, 0.6, 0.12]);
  builder.sphere(
    "metal",
    gold,
    0.07,
    [0, 0.68, 0.42],
    [0.6, 0.9, 1.3],
    builder.segments(8, 5),
  );
  if (builder.isFar) {
    return;
  }
  /* The dragon's tail, swishing behind */
  builder.box("metal", gold, [0.03, 0.16, 0.22], [0, 0.66, -0.25], [0.5, 0, 0]);
  [-0.05, 0.1, 0.25].forEach((z) => {
    builder.box(
      "metal",
      shade(gold, 0.85),
      [0.045, 0.07, 0.06],
      [0, 0.74, z],
      [0.4, 0, 0],
    );
  });
  builder.sphere("glow", lava, 0.018, [0.03, 0.71, 0.47], [1, 1, 1], 5);
  /* North, south, east and west arms */
  builder.box("metal", ironDark, [0.5, 0.02, 0.02], [0, 0.22, 0]);
  builder.box("metal", ironDark, [0.02, 0.02, 0.5], [0, 0.22, 0]);
};
