import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  LatheGeometry,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import {
  findMotionPose,
  shade,
  type AttractionBuilder,
  type AttractionFinish,
  type LocalPoint,
  type LocalSpot,
  type Motion,
  type Triple,
} from "../attractions/attraction-kit.js";

/**
 * Shapes shared by Sunscorch Sands' new Attractions (ADR 0068): the
 * date palms, the sands and rocks, round houses, pots and baskets,
 * the people who work there, and a go riding in a moving part.
 */

export const sands = {
  sand: "#e3c690",
  paleSand: "#ecd6a6",
  dampSand: "#c7a46e",
  sandstone: "#c99a62",
  paleStone: "#dcbb88",
  darkStone: "#a77a4c",
  mudBrick: "#b98a5a",
  terracotta: "#b5653a",
  deepTerracotta: "#8f4527",
  linen: "#efe6cf",
  lapis: "#2f4f9e",
  turquoise: "#3aa6a0",
  gold: "#d9a92e",
  ochre: "#c98b2b",
  palmTrunk: "#8a6a45",
  palmTrunkDark: "#6c5034",
  frond: "#4f8236",
  frondLight: "#62953e",
  frondDry: "#a88a4f",
  dates: "#b5612a",
  reed: "#6f8f3a",
  thatch: "#c8a25a",
  wattle: "#8b6b45",
  daub: "#b49a76",
  hide: "#9c7a55",
  skin: "#b07a52",
  skinDark: "#8a5a3a",
  skinLight: "#d2a07a",
  hair: "#2b211b",
} as const;

/** Turns a point given in a part's own frame (facing +z) to local units. */
export const placeBy =
  (at: Triple, turn: number) =>
  (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];

const upright = new Vector3(0, 1, 0);

/** A tapered round bar from one point to another. */
export const addTaperedBar = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  from: Triple,
  to: Triple,
  radiusFrom: number,
  radiusTo: number,
  segments = 8,
): void => {
  const start = new Vector3(...from);
  const direction = new Vector3(...to).sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(upright, direction.clone().normalize()),
  );
  const middle = start.add(direction.clone().multiplyScalar(0.5));
  builder.add(
    finish,
    colour,
    new CylinderGeometry(
      radiusTo,
      radiusFrom,
      direction.length(),
      builder.segments(segments, Math.max(4, Math.round(segments / 2))),
    ),
    { at: [middle.x, middle.y, middle.z], rotation: [turn.x, turn.y, turn.z] },
  );
};

/** A geometry from points and triangles, drawn from both sides. */
export const makeTwoSided = (
  points: readonly Triple[],
  triangles: readonly [number, number, number][],
): BufferGeometry => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(points.flat()), 3),
  );
  geometry.setIndex(
    triangles.flatMap(([first, second, third]) => [
      first,
      second,
      third,
      first,
      third,
      second,
    ]),
  );
  return geometry;
};

/** A flat two-sided triangle or four-sided sheet, such as a sail or a hide. */
export const addSheet = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  corners: readonly Triple[],
): void => {
  const triangles: [number, number, number][] =
    corners.length === 3
      ? [[0, 1, 2]]
      : [
          [0, 1, 2],
          [0, 2, 3],
        ];
  builder.add(finish, colour, makeTwoSided(corners, triangles));
};

/** A knobbly rock or boulder. */
export const addLump = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: Triple,
  seed: number,
  detail = 1,
): void => {
  const geometry = new IcosahedronGeometry(1, builder.isFar ? 0 : detail);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lump =
      1 +
      0.14 * Math.sin(x * 3.9 + seed) * Math.cos(z * 3.3 + seed * 1.4) +
      0.08 * Math.sin(y * 5.1 + seed * 0.6);
    positions.setXYZ(index, x * lump, y * lump, z * lump);
  }
  builder.add("matte", colour, geometry, {
    at,
    rotation: [0, seed * 1.7, 0],
    scale: size,
  });
};

/** A soft mound of sand, round in plan and stretched along x. */
export const addMound = (
  builder: AttractionBuilder,
  colour: string,
  at: Triple,
  size: number,
  height: number,
  stretch = 1.5,
  turn = 0,
): void => {
  const profile: readonly [number, number][] = [
    [1, 0],
    [0.82, 0.32],
    [0.55, 0.78],
    [0.25, 0.97],
    [0, 1],
  ];
  builder.add(
    "matte",
    colour,
    new LatheGeometry(
      profile.map(([radius, up]) => new Vector2(radius * size, up * height)),
      builder.segments(14, 8),
    ),
    { at, rotation: [0, turn, 0], scale: [stretch, 1, 1] },
  );
};

/** A lathe turned about an upright axis, open over an arc (for doorways). */
export const addArcLathe = (
  builder: AttractionBuilder,
  finish: AttractionFinish,
  colour: string,
  profile: readonly (readonly [number, number])[],
  at: Triple,
  segments: number,
  phiStart = 0,
  phiLength = Math.PI * 2,
): void => {
  builder.add(
    finish,
    colour,
    new LatheGeometry(
      profile.map(([radius, height]) => new Vector2(radius, height)),
      builder.segments(segments),
      phiStart,
      phiLength,
    ),
    { at },
  );
};

/* ------------------------------------------------------------------ */
/* Date palms                                                          */
/* ------------------------------------------------------------------ */

export interface Palm {
  x: number;
  z: number;
  height: number;
  /** Which way it leans. */
  lean: number;
  curve: number;
}

export const findTrunkPoint = (palm: Palm, share: number): Triple => {
  const bend = palm.curve * share * share;
  return [
    palm.x + Math.sin(palm.lean) * bend,
    palm.height * share * (1 - 0.05 * palm.curve),
    palm.z + Math.cos(palm.lean) * bend,
  ];
};

export const addPalmTrunk = (
  builder: AttractionBuilder,
  palm: Palm,
  index: number,
): void => {
  const sections = builder.isFar ? 3 : 7;
  for (let section = 0; section < sections; section++) {
    const from = findTrunkPoint(palm, section / sections);
    const to = findTrunkPoint(palm, (section + 1) / sections);
    const radius = 0.2 - (section / sections) * 0.07;
    addTaperedBar(
      builder,
      "matte",
      section % 2 === index % 2 ? sands.palmTrunk : sands.palmTrunkDark,
      from,
      to,
      radius * 0.86,
      radius * 1.06,
      7,
    );
  }
  builder.cylinder("matte", sands.palmTrunkDark, {
    radius: 0.3,
    radiusEnd: 0.2,
    length: 0.22,
    at: [palm.x, 0.1, palm.z],
    segments: 8,
  });
};

/** One drooping frond with leaflet edges, from `origin`. */
const addFrond = (
  builder: AttractionBuilder,
  origin: Triple,
  heading: number,
  rise: number,
  length: number,
  colour: string,
): void => {
  const stations = builder.isFar ? 3 : 5;
  const flat = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const side = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const points: Triple[] = [];
  const triangles: [number, number, number][] = [];
  for (let station = 0; station <= stations; station++) {
    const share = station / stations;
    const out = length * share;
    const lift = length * (rise * share - 0.75 * share * share);
    const envelope = Math.sin(Math.PI * Math.min(1, share * 1.15)) * 0.34;
    const width =
      envelope * (builder.isFar || station % 2 === 0 ? 1 : 0.5) + 0.02;
    const centre = flat.clone().multiplyScalar(out).setY(lift);
    const fold = width * 0.35;
    points.push(
      [
        origin[0] + centre.x - side.x * width,
        origin[1] + centre.y - fold,
        origin[2] + centre.z - side.z * width,
      ],
      [origin[0] + centre.x, origin[1] + centre.y, origin[2] + centre.z],
      [
        origin[0] + centre.x + side.x * width,
        origin[1] + centre.y - fold,
        origin[2] + centre.z + side.z * width,
      ],
    );
    if (station > 0) {
      const here = station * 3;
      const back = here - 3;
      triangles.push(
        [back, here, back + 1],
        [back + 1, here, here + 1],
        [back + 1, here + 1, back + 2],
        [back + 2, here + 1, here + 2],
      );
    }
  }
  builder.add("matte", colour, makeTwoSided(points, triangles));
};

/** A palm's crown of fronds, with bunches of dates, centred on `origin`. */
export const addPalmCrown = (
  builder: AttractionBuilder,
  origin: Triple,
  index: number,
  { size = 1, bunches = 2 }: { size?: number; bunches?: number } = {},
): void => {
  const fronds = builder.isFar ? 5 : 8;
  for (let frond = 0; frond < fronds; frond++) {
    const heading = (frond / fronds) * Math.PI * 2 + index * 0.6;
    const isLower = frond % 3 === 0;
    const isDry = !builder.isFar && frond === 4;
    addFrond(
      builder,
      origin,
      heading,
      isLower ? 0.15 : 0.55,
      size * (isLower ? 1.9 : 1.6 + 0.25 * Math.sin(frond * 1.7)),
      isDry ? sands.frondDry : frond % 2 === 0 ? sands.frond : sands.frondLight,
    );
  }
  builder.sphere("matte", sands.palmTrunkDark, 0.22, origin, [1, 0.8, 1], 8);
  if (builder.isFar) {
    return;
  }
  for (let bunch = 0; bunch < bunches; bunch++) {
    const angle = 0.9 + (bunch * Math.PI * 2) / bunches + index;
    const along: Triple = [
      origin[0] + Math.sin(angle) * 0.24,
      origin[1] - 0.34,
      origin[2] + Math.cos(angle) * 0.24,
    ];
    addTaperedBar(
      builder,
      "matte",
      "#c79a3c",
      [origin[0], origin[1] - 0.05, origin[2]],
      along,
      0.025,
      0.02,
      4,
    );
    [0, 1, 2].forEach((berry) => {
      builder.sphere(
        "matte",
        berry === 1 ? shade(sands.dates, 0.85) : sands.dates,
        0.08,
        [along[0] + (berry - 1) * 0.07, along[1] - 0.06 * berry, along[2]],
        [1, 1.3, 1],
        5,
      );
    });
  }
};

/** A whole palm, trunk and crown, standing still. */
export const addPalm = (
  builder: AttractionBuilder,
  palm: Palm,
  index: number,
): void => {
  addPalmTrunk(builder, palm, index);
  addPalmCrown(builder, findTrunkPoint(palm, 1), index);
};

/* ------------------------------------------------------------------ */
/* Pots, baskets and grass                                             */
/* ------------------------------------------------------------------ */

/** A round-bellied clay pot or jar, standing at `at`. */
export const addPot = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  colour: string = sands.terracotta,
): void => {
  builder.lathe(
    "matte",
    colour,
    [
      [0, 0],
      [size * 0.7, 0.02],
      [size * 1.2, size * 1.0],
      [size * 0.9, size * 1.9],
      [size * 0.45, size * 2.2],
      [size * 0.55, size * 2.45],
      [size * 0.4, size * 2.45],
      [0, size * 2.2],
    ],
    at,
    "y",
    builder.isFar ? 6 : 10,
  );
};

/** A woven basket, open at the top, maybe heaped with something. */
export const addBasket = (
  builder: AttractionBuilder,
  at: Triple,
  size: number,
  heap?: string,
): void => {
  builder.lathe(
    "matte",
    "#b8894f",
    [
      [0, 0],
      [size * 0.8, 0],
      [size, size * 0.8],
      [size * 0.92, size * 0.8],
      [size * 0.74, size * 0.06],
      [0, size * 0.06],
    ],
    at,
    "y",
    10,
  );
  if (builder.isFar) {
    return;
  }
  builder.torus(
    "matte",
    "#8e6538",
    size * 0.97,
    size * 0.06,
    [at[0], at[1] + size * 0.8, at[2]],
    "y",
    8,
  );
  if (heap !== undefined) {
    builder.sphere(
      "matte",
      heap,
      size * 0.9,
      [at[0], at[1] + size * 0.7, at[2]],
      [1, 0.35, 1],
      8,
    );
  }
};

/** A tuft of dry desert grass. */
export const addGrassTuft = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
): void => {
  if (builder.isFar) {
    return;
  }
  for (let blade = 0; blade < 5; blade++) {
    const angle = blade * 1.26 + at[0];
    builder.bar(
      "matte",
      blade % 2 === 0 ? "#9aa84a" : "#7a8a3a",
      at,
      [
        at[0] + Math.sin(angle) * 0.2 * size,
        at[1] + (0.36 + (blade % 3) * 0.08) * size,
        at[2] + Math.cos(angle) * 0.2 * size,
      ],
      0.025,
      3,
    );
  }
};

/* ------------------------------------------------------------------ */
/* Round houses                                                        */
/* ------------------------------------------------------------------ */

export interface RoundHouse {
  x: number;
  z: number;
  radius: number;
  wallHeight: number;
  /** The roof's peak above the ground. */
  peak: number;
  /** Which way its doorway faces, 0 being local +z. */
  door: number;
  wall: string;
  roof: string;
  /** Stone walls are drawn in courses; wattle walls with stakes. */
  isStone?: boolean;
}

/** Half the angle a doorway 1.1 wide takes out of a round house's wall. */
export const findDoorHalfAngle = (house: RoundHouse): number =>
  0.55 / house.radius;

/** A round house: a thick wall with a doorway, and a tall cone roof. */
export const addRoundHouse = (
  builder: AttractionBuilder,
  house: RoundHouse,
): void => {
  const { x, z, radius, wallHeight, peak, door } = house;
  const gap = findDoorHalfAngle(house);
  const segments = builder.isFar ? 10 : 18;
  const courses = builder.isFar || house.isStone !== true ? 1 : 2;
  for (let course = 0; course < courses; course++) {
    const bottom = (wallHeight / courses) * course;
    const top = (wallHeight / courses) * (course + 1);
    const out = radius + (course % 2 === 0 ? 0.03 : 0);
    addArcLathe(
      builder,
      "matte",
      course % 2 === 0 ? house.wall : shade(house.wall, 0.9),
      [
        [out, bottom],
        [out, top],
        [radius - 0.25, top],
        [radius - 0.25, bottom],
      ],
      [x, 0, z],
      segments,
      door + gap,
      Math.PI * 2 - gap * 2,
    );
  }
  const eave = radius + 0.45;
  const eaveHeight = wallHeight + 0.05;
  addArcLathe(
    builder,
    "matte",
    house.roof,
    [
      [eave, eaveHeight - 0.12],
      [eave * 0.55, eaveHeight + (peak - eaveHeight) * 0.5],
      [0.05, peak],
      [0, peak],
    ],
    [x, 0, z],
    segments,
  );
  addArcLathe(
    builder,
    "matte",
    shade(house.roof, 0.6),
    [
      [0, peak - 0.1],
      [eave - 0.05, eaveHeight - 0.16],
    ],
    [x, 0, z],
    segments,
  );
  /* Door posts and a lintel. */
  const doorX = x + Math.sin(door) * radius;
  const doorZ = z + Math.cos(door) * radius;
  const across = Math.PI / 2 + door;
  [-1, 1].forEach((side) => {
    builder.box(
      "matte",
      sands.palmTrunkDark,
      [0.12, wallHeight + 0.05, 0.12],
      [
        doorX + Math.sin(across) * side * 0.6,
        (wallHeight + 0.05) / 2,
        doorZ + Math.cos(across) * side * 0.6,
      ],
      [0, door, 0],
    );
  });
  if (builder.isFar) {
    return;
  }
  /* Thatch bands round the roof and a twist of thatch at the peak. */
  [0.45].forEach((share) => {
    const ringRadius = eave * (1 - share) + 0.05 * share;
    const ringHeight =
      eaveHeight - 0.12 + (peak - eaveHeight + 0.12) * share + 0.02;
    builder.torus(
      "matte",
      shade(house.roof, 0.82),
      ringRadius,
      0.04,
      [x, ringHeight, z],
      "y",
      segments,
    );
  });
  builder.cylinder("matte", shade(house.roof, 0.75), {
    radius: 0.12,
    radiusEnd: 0.03,
    length: 0.35,
    at: [x, peak + 0.12, z],
    segments: 6,
  });
  if (house.isStone !== true) {
    /* Wattle stakes showing through the daub. */
    const stakes = 10;
    for (let stake = 0; stake < stakes; stake++) {
      const angle = door + gap + 0.2 + (stake / stakes) * (Math.PI * 2 - 0.8);
      builder.box(
        "matte",
        sands.wattle,
        [0.06, wallHeight * 0.92, 0.04],
        [
          x + Math.sin(angle) * (radius + 0.035),
          wallHeight * 0.46,
          z + Math.cos(angle) * (radius + 0.035),
        ],
        [0, angle, 0],
      );
    }
  }
  /* A hide hanging half across the doorway. */
  addSheet(builder, "matte", sands.hide, [
    [
      doorX + Math.sin(across) * 0.55,
      wallHeight,
      doorZ + Math.cos(across) * 0.55,
    ],
    [
      doorX + Math.sin(across) * 0.15,
      wallHeight,
      doorZ + Math.cos(across) * 0.15,
    ],
    [
      doorX + Math.sin(across) * 0.25 + Math.sin(door) * 0.05,
      wallHeight * 0.35,
      doorZ + Math.cos(across) * 0.25 + Math.cos(door) * 0.05,
    ],
    [
      doorX + Math.sin(across) * 0.55,
      wallHeight * 0.3,
      doorZ + Math.cos(across) * 0.55,
    ],
  ]);
};

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export interface PersonLook {
  skin: string;
  cloth: string;
  hair?: string;
  /** A headdress, a cap, or bare hair. */
  head?: "hair" | "nemes" | "cap" | "wrap";
  headColour?: string;
  /** Arms raised, as if cheering. */
  isCheering?: boolean;
  /** Sitting cross-legged, as a scribe does. */
  isSitting?: boolean;
}

/** A person about 1.05 tall, facing +z (turned by `turn`), standing at `at`. */
export const addPerson = (
  builder: AttractionBuilder,
  at: Triple,
  turn: number,
  look: PersonLook,
): void => {
  const place = placeBy(at, turn);
  const segments = builder.isFar ? 5 : 8;
  const sit = look.isSitting === true ? 0.42 : 0;
  if (look.isSitting === true) {
    builder.sphere(
      "matte",
      look.cloth,
      0.24,
      place(0, 0.12, 0.05),
      [1.3, 0.5, 1],
      segments,
    );
  } else {
    [-1, 1].forEach((side) => {
      addTaperedBar(
        builder,
        "matte",
        look.skin,
        place(side * 0.07, 0.48, 0),
        place(side * 0.08, 0.03, 0.02),
        0.055,
        0.04,
        segments,
      );
      builder.box(
        "matte",
        sands.palmTrunkDark,
        [0.08, 0.04, 0.16],
        place(side * 0.08, 0.02, 0.05),
        [0, turn, 0],
      );
    });
  }
  /* Kilt or tunic, then the body. */
  builder.lathe(
    "matte",
    look.cloth,
    [
      [0, 0.38 - sit],
      [0.17, 0.38 - sit],
      [0.14, 0.62 - sit],
      [0, 0.62 - sit],
    ],
    place(0, 0, 0),
    "y",
    builder.isFar ? 5 : 8,
  );
  builder.sphere(
    "matte",
    look.head === "nemes" ? look.skin : look.cloth,
    0.15,
    place(0, 0.74 - sit, 0),
    [1, 1.25, 0.75],
    segments,
  );
  const shoulder = 0.84 - sit;
  [-1, 1].forEach((side) => {
    const hand: Triple =
      look.isCheering === true
        ? place(side * 0.3, shoulder + 0.32, 0.04)
        : place(side * 0.2, shoulder - 0.34, 0.08);
    addTaperedBar(
      builder,
      "matte",
      look.skin,
      place(side * 0.15, shoulder, 0),
      hand,
      0.04,
      0.032,
      segments,
    );
  });
  const headAt = place(0, 1.0 - sit, 0);
  builder.sphere("matte", look.skin, 0.11, headAt, [1, 1.08, 1], segments);
  if (builder.isFar) {
    return;
  }
  const head = look.head ?? "hair";
  const headColour = look.headColour ?? look.hair ?? sands.hair;
  if (head === "nemes") {
    /* A striped headcloth falling to the shoulders. */
    builder.sphere(
      "paint",
      sands.gold,
      0.125,
      place(0, 1.03 - sit, -0.01),
      [1, 1, 1.05],
      8,
    );
    [-1, 1].forEach((side) => {
      builder.box(
        "paint",
        sands.lapis,
        [0.05, 0.22, 0.07],
        place(side * 0.11, 0.9 - sit, 0.02),
        [0, turn, 0],
      );
    });
  } else if (head === "cap" || head === "wrap") {
    builder.sphere(
      "matte",
      headColour,
      0.12,
      place(0, 1.04 - sit, -0.01),
      head === "wrap" ? [1.15, 0.75, 1.15] : [1, 0.7, 1],
      8,
    );
  } else {
    builder.sphere(
      "matte",
      headColour,
      0.115,
      place(0, 1.03 - sit, -0.025),
      [1, 0.95, 1],
      8,
    );
  }
  [-1, 1].forEach((side) => {
    builder.sphere(
      "matte",
      "#1d1a17",
      0.015,
      place(side * 0.04, 1.01 - sit, 0.1),
      [1, 1, 1],
      4,
    );
  });
};

/* ------------------------------------------------------------------ */
/* A go riding in a moving part                                        */
/* ------------------------------------------------------------------ */

/**
 * Follows the Character into a seat that moves with a moving part (a
 * chariot, a yacht or a raft going round), then back out to `finish`.
 * The seat is given in the part's own frame, about its pivot.
 */
export const followMovingSeat =
  ({
    pivot,
    motion,
    copy = 0,
    seat,
    start,
    finish,
    boarding = 0.08,
    leaving = 0.08,
  }: {
    pivot: Triple;
    motion: Motion;
    copy?: number;
    seat: Triple;
    start: LocalPoint;
    finish: LocalPoint;
    boarding?: number;
    leaving?: number;
  }) =>
  (progress: number, clockSeconds: number): LocalSpot => {
    const pose = findMotionPose(motion, clockSeconds, { copy });
    const turn = pose.rotation[1];
    const seatSpot = {
      x:
        pivot[0] +
        pose.position[0] +
        seat[0] * Math.cos(turn) +
        seat[2] * Math.sin(turn),
      y: pivot[1] + pose.position[1] + seat[1],
      z:
        pivot[2] +
        pose.position[2] -
        seat[0] * Math.sin(turn) +
        seat[2] * Math.cos(turn),
    };
    const between = (from: LocalPoint, share: number, fromY: number) => {
      const smooth = share * share * (3 - 2 * share);
      return {
        x: from.x + (seatSpot.x - from.x) * smooth,
        y:
          fromY +
          (seatSpot.y - fromY) * smooth +
          Math.sin(share * Math.PI) * 0.3,
        z: from.z + (seatSpot.z - from.z) * smooth,
      };
    };
    if (progress < boarding) {
      const spot = between(start, progress / boarding, 0);
      return {
        ...spot,
        heading: Math.atan2(seatSpot.x - start.x, seatSpot.z - start.z),
      };
    }
    if (progress > 1 - leaving) {
      const spot = between(finish, (1 - progress) / leaving, 0);
      return {
        ...spot,
        heading: Math.atan2(finish.x - seatSpot.x, finish.z - seatSpot.z),
      };
    }
    return { ...seatSpot, heading: turn };
  };
