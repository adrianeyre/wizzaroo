import { BoxGeometry, CylinderGeometry, Vector3 } from "three";
import type { SurfaceKind } from "../island-adventures.js";
import {
  FinishedModelBuilder,
  type Axis,
  type FinishLook,
  type Triple,
} from "../trains/train-kit.js";

export type { Axis, Triple };

/**
 * Every Attraction is drawn with these finishes, one material each:
 * - `paint`: glossy painted wood, metal or plastic (clear-coated).
 * - `matte`: stone, brick, timber, thatch, hedges, grass and cloth.
 * - `metal`: bare or galvanised steel, brass and chrome.
 * - `glass`: windows, which reflect the sky.
 * - `water`: ponds, pools and splashes, see-through.
 * - `glow`: lamps, flames and lit windows, unlit and brighter after dark.
 */
export const attractionFinishes = [
  "paint",
  "matte",
  "metal",
  "glass",
  "water",
  "glow",
] as const;

export type AttractionFinish = (typeof attractionFinishes)[number];

export const attractionFinishLooks: Readonly<
  Record<Exclude<AttractionFinish, "glow">, FinishLook>
> = {
  paint: { roughness: 0.4, metalness: 0.05, clearcoat: 0.5 },
  matte: { roughness: 0.9, metalness: 0, clearcoat: 0 },
  metal: { roughness: 0.32, metalness: 0.8, clearcoat: 0.2 },
  glass: { roughness: 0.05, metalness: 0.3, clearcoat: 1 },
  water: { roughness: 0.04, metalness: 0.1, clearcoat: 1 },
};

export const waterOpacity = 0.78;

/** `near` is seen close up; `far` keeps the silhouette and drops small parts. */
export type AttractionDetail = "near" | "far";

/**
 * Builds an Attraction, or one of its moving parts, as one geometry
 * with a group per finish. It has every shape `VehicleBuilder` has:
 * `box`, `roundedBox`, `cylinder`, `bar`, `sphere`, `torus`, `lathe`,
 * `sidePlate`, `endPlate`, `loft`, `painted` and `add`.
 */
export class AttractionBuilder extends FinishedModelBuilder<AttractionFinish> {
  constructor(readonly attractionDetail: AttractionDetail) {
    super(attractionFinishes, attractionDetail === "near" ? "explore" : "map");
  }

  get isFar(): boolean {
    return this.attractionDetail === "far";
  }
}

export interface LocalPoint {
  x: number;
  z: number;
}

/** A circle the Character and Vehicles can't walk into, in local units. */
export interface LocalBlocker {
  x: number;
  z: number;
  radius: number;
}

/** Something to stand on, such as a deck, a ramp or a sheet of ice. */
export interface DeckSurface {
  height: number;
  kind: Extract<SurfaceKind, "ground" | "trail" | "bridge" | "ice">;
}

/**
 * Finds the deck under a local point, or undefined off the deck. The
 * Character steps onto a deck up to 0.8 above where it stands, so a
 * ramp should rise gently and a high platform needs a ride (a ladder).
 */
export type Deck = (point: LocalPoint) => DeckSurface | undefined;

export interface LocalSpot {
  x: number;
  y: number;
  z: number;
  /** The way the Character faces: 0 faces local +z. */
  heading: number;
}

/**
 * A go on something: when the Character walks within `reach` of
 * `start`, it is carried along `follow` for `seconds`, then put down at
 * `finish`. `follow` is given the progress (0 to 1) and the scene clock
 * in seconds, the same clock the moving parts are animated with, so a
 * Character on a swing or a roundabout moves with it.
 */
export interface PlayRide {
  id: string;
  /** Reads after "Had a go on", such as "the swings". */
  name: string;
  start: LocalPoint;
  reach: number;
  seconds: number;
  finish: LocalPoint;
  follow: (progress: number, clockSeconds: number) => LocalSpot;
}

/**
 * How a moving part moves, about its pivot. Every motion is worked out
 * from the scene clock alone, so it can be shared with rides.
 */
export type Motion =
  | { kind: "spin"; axis: Axis; speed: number; phase?: number }
  | {
      kind: "swing";
      axis: Axis;
      amplitude: number;
      period: number;
      phase?: number;
    }
  | { kind: "bob"; height: number; period: number; phase?: number }
  | {
      /** Copies of the part ride round a circle, staying upright. */
      kind: "orbit";
      axis: Axis;
      radius: number;
      count: number;
      speed: number;
      /** Turns each copy to face along the circle, like carousel horses. */
      isFacingAlong?: boolean;
      bob?: number;
    }
  | {
      /** The rocket: waits, climbs away, and comes back down to land. */
      kind: "launch";
      period: number;
      height: number;
      /** `engine` parts show only while the engine burns. */
      role: "body" | "engine";
    }
  | {
      /** Water jets: low, and leaping up while the Character is near. */
      kind: "splash";
      reach: number;
      period: number;
      phase?: number;
    }
  | {
      /** A flame: flickers its size. */
      kind: "flicker";
      period: number;
      phase?: number;
    }
  | {
      /**
       * Turns slowly by itself, and speeds up to `speed` while the
       * Character is within `reach`, like windmill sails in a gust.
       */
      kind: "whirl";
      axis: Axis;
      idle: number;
      speed: number;
      reach: number;
      phase?: number;
    }
  | {
      /**
       * Rises `height` out of its hiding place while the Character is
       * within `reach`, bobbing a little once up, like a rabbit
       * popping out of its burrow.
       */
      kind: "rise";
      reach: number;
      height: number;
      period: number;
      phase?: number;
    }
  | {
      /** Rocks to and fro, but only while the Character is within `reach`. */
      kind: "nod";
      axis: Axis;
      reach: number;
      amplitude: number;
      period: number;
      phase?: number;
    }
  | {
      /** Grows from nothing while the Character is within `reach`, like a lamp coming on. */
      kind: "wake";
      reach: number;
    };

/** The motions that react to the Character coming near. */
export type ReactingMotion = Extract<Motion, { reach: number }>;

export const isReactingMotion = (motion: Motion): motion is ReactingMotion =>
  "reach" in motion;

/** How fast a whirl turns, in radians a second, at a nearness from 0 to 1. */
export const findWhirlSpeed = (
  motion: Extract<Motion, { kind: "whirl" }>,
  nearness: number,
): number => motion.idle + (motion.speed - motion.idle) * nearness;

export type MovingLook =
  /** Drawn with the Attraction's own finishes. */
  | "finished"
  /** A see-through, glowing beam, shown only after dark. */
  | "beam"
  /** A soft glowing halo, shown only after dark. */
  | "halo";

export interface MovingPart {
  name: string;
  /** Where the part's own origin sits, in the Attraction's local units. */
  pivot: Triple;
  build: (builder: AttractionBuilder) => void;
  motion: Motion;
  look?: MovingLook;
}

/** Animals or other small things that wander about inside a circle. */
export interface Wanderers {
  name: string;
  /** One of them, facing local +z, standing on y = 0. */
  build: (builder: AttractionBuilder) => void;
  count: number;
  centre: LocalPoint;
  radius: number;
  /** About how fast they wander, in units a second. */
  speed: number;
  /** How high above the Attraction's ground they go (fly or float). */
  height?: number;
  /** How far up and down they bob as they go. */
  bob?: number;
}

/** A plume of smoke or steam that keeps puffing from one spot. */
export interface SmokeSource {
  at: Triple;
  colour: string;
  /** Puffs at once; each lives `rise / speed` seconds. */
  puffs: number;
  size: number;
  rise: number;
  spread: number;
}

/**
 * Where an Attraction can stand. `inland` needs flat dry land under
 * every one of `landSamples` (the default fills its footprint).
 * `shore` also needs the sea (below sea level) under every one of
 * `seaSamples`; it is turned so local -z faces out to sea.
 */
export type AttractionSetting = "inland" | "shore";

/**
 * What every model placed on an Island has, whether an Attraction or a
 * Curiosity: its words, where it can stand, and what it is built from.
 */
export interface PlaceModel {
  /** "Playground", used in "the Playground". */
  name: string;
  /** The card's words when the Character reaches its sign. */
  fact: string;
  /** The National Curriculum link the fact supports, if any. */
  curriculumLink?: string;
  /** How far the Attraction reaches from its centre, in local units. */
  footprint: number;
  setting: AttractionSetting;
  /** Local spots that must be dry and nearly level. */
  landSamples?: readonly LocalPoint[];
  /** Local spots that must be sea, for `shore` Attractions. */
  seaSamples?: readonly LocalPoint[];
  /** Where its sign stands, which the Character walks up to. */
  signSpot: LocalPoint;
  /** Builds everything that doesn't move, on a local ground at y = 0. */
  build: (builder: AttractionBuilder) => void;
  moving?: readonly MovingPart[];
  wanderers?: readonly Wanderers[];
  smoke?: readonly SmokeSource[];
  blockers?: readonly LocalBlocker[];
  decks?: readonly Deck[];
  rides?: readonly PlayRide[];
  /** Notes (MIDI numbers) played as the Character comes near. */
  tune?: readonly number[];
  /** Whether its ground pad is drawn (some, like the pier, have none). */
  hasGroundPad?: boolean;
  /** The ground pad's colour, grass by default. */
  padColour?: string;
}

export interface AttractionModel extends PlaceModel {
  kind: AttractionKind;
}

export const attractionKinds = [
  "playground",
  "adventure-playground",
  "skate-park",
  "hedge-maze",
  "bandstand",
  "crazy-golf",
  "splash-pool",
  "seaside-pier",
  "funfair",
  "ice-rink",
  "village-green",
  "post-office",
  "bakery",
  "fire-station",
  "lighthouse",
  "school",
  "library",
  "allotments",
  "farm",
  "treehouse",
  "campsite",
  "rock-pools",
  "hot-springs",
  "oasis",
  "bird-hide",
  "beehives",
  "castle",
  "shipwreck",
  "volcano-lookout",
  "rocket-launch-pad",
] as const;

export type AttractionKind = (typeof attractionKinds)[number];

/* ------------------------------------------------------------------ */
/* Motions                                                             */
/* ------------------------------------------------------------------ */

export interface MotionPose {
  position: Triple;
  rotation: Triple;
  scale: Triple;
  isShown: boolean;
}

const still: MotionPose = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  isShown: true,
};

const turnAbout = (axis: Axis, angle: number): Triple => [
  axis === "x" ? angle : 0,
  axis === "y" ? angle : 0,
  axis === "z" ? angle : 0,
];

export interface LaunchState {
  /** Height above the pad. */
  lift: number;
  isEngineOn: boolean;
}

const launchClimbShare = 0.16;
const launchAwayShare = 0.08;

/**
 * The rocket's cycle: on the pad, a climb that speeds up, a while out
 * of sight, then a slowing descent back onto the pad, engine burning.
 */
export const findLaunchState = (
  seconds: number,
  period: number,
  height: number,
): LaunchState => {
  const progress = (((seconds / period) % 1) + 1) % 1;
  const waitShare = 1 - launchClimbShare * 2 - launchAwayShare;
  if (progress < waitShare) {
    return { lift: 0, isEngineOn: progress > waitShare - 0.015 };
  }
  const climb = (progress - waitShare) / launchClimbShare;
  if (climb < 1) {
    return { lift: height * climb * climb, isEngineOn: true };
  }
  const away = (progress - waitShare - launchClimbShare) / launchAwayShare;
  if (away < 1) {
    return { lift: height * 2, isEngineOn: false };
  }
  const descent =
    (progress - waitShare - launchClimbShare - launchAwayShare) /
    launchClimbShare;
  const left = 1 - descent;
  return { lift: height * left * left, isEngineOn: true };
};

/**
 * Where a moving part is at a moment. `nearness` is 1 when the
 * Character stands at the part and 0 when far away (for splashes).
 * For an orbit, `copy` picks which of its copies.
 */
export const findMotionPose = (
  motion: Motion,
  seconds: number,
  {
    nearness = 0,
    copy = 0,
    spun,
  }: {
    nearness?: number;
    copy?: number;
    /** How far a whirl has turned so far, which its drawer keeps count of. */
    spun?: number;
  } = {},
): MotionPose => {
  if (motion.kind === "whirl") {
    return {
      ...still,
      rotation: turnAbout(
        motion.axis,
        (motion.phase ?? 0) + (spun ?? seconds * motion.idle),
      ),
    };
  }
  if (motion.kind === "rise") {
    const up = nearness * nearness * (3 - 2 * nearness);
    const bob =
      0.06 *
      motion.height *
      up *
      Math.sin((seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0));
    return { ...still, position: [0, motion.height * up + bob, 0] };
  }
  if (motion.kind === "nod") {
    return {
      ...still,
      rotation: turnAbout(
        motion.axis,
        motion.amplitude *
          nearness *
          Math.sin(
            (seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0),
          ),
      ),
    };
  }
  if (motion.kind === "wake") {
    const size = Math.max(0.001, nearness);
    return {
      ...still,
      scale: [size, size, size],
      isShown: nearness > 0.02,
    };
  }
  if (motion.kind === "spin") {
    return {
      ...still,
      rotation: turnAbout(
        motion.axis,
        (motion.phase ?? 0) + seconds * motion.speed,
      ),
    };
  }
  if (motion.kind === "swing") {
    return {
      ...still,
      rotation: turnAbout(
        motion.axis,
        motion.amplitude *
          Math.sin(
            (seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0),
          ),
      ),
    };
  }
  if (motion.kind === "bob") {
    return {
      ...still,
      position: [
        0,
        motion.height *
          Math.sin(
            (seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0),
          ),
        0,
      ],
    };
  }
  if (motion.kind === "orbit") {
    const angle = seconds * motion.speed + (copy / motion.count) * Math.PI * 2;
    const along = Math.cos(angle) * motion.radius;
    const out = Math.sin(angle) * motion.radius;
    const bob = (motion.bob ?? 0) * Math.sin(seconds * 2.2 + copy * 1.7);
    const facing = motion.isFacingAlong === true ? angle : 0;
    if (motion.axis === "y") {
      return {
        ...still,
        position: [along, bob, -out],
        rotation: [0, facing, 0],
      };
    }
    if (motion.axis === "x") {
      return {
        ...still,
        position: [bob, out, along],
        rotation: [motion.isFacingAlong === true ? -angle : 0, 0, 0],
      };
    }
    return {
      ...still,
      position: [along, out, bob],
      rotation: [0, 0, motion.isFacingAlong === true ? angle : 0],
    };
  }
  if (motion.kind === "launch") {
    const { lift, isEngineOn } = findLaunchState(
      seconds,
      motion.period,
      motion.height,
    );
    const flare =
      motion.role === "engine"
        ? 0.85 + 0.15 * Math.sin(seconds * 37) * Math.sin(seconds * 23)
        : 1;
    return {
      ...still,
      position: [0, lift, 0],
      scale: [flare, motion.role === "engine" ? flare * 1.1 : 1, flare],
      isShown:
        lift < motion.height * 1.5 && (motion.role === "body" || isEngineOn),
    };
  }
  if (motion.kind === "splash") {
    const pulse =
      0.5 +
      0.5 *
        Math.sin((seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0));
    const leap = 0.12 + nearness * (0.55 + 0.45 * pulse);
    return {
      ...still,
      scale: [1, Math.max(0.05, leap), 1],
      isShown: true,
    };
  }
  const flicker =
    1 +
    0.12 *
      Math.sin((seconds / motion.period) * Math.PI * 2 + (motion.phase ?? 0)) +
    0.06 * Math.sin(seconds * 13.7 + (motion.phase ?? 0));
  return { ...still, scale: [flicker, flicker * 1.08, flicker] };
};

/** How many copies a moving part is drawn with. */
export const countMotionCopies = (motion: Motion): number =>
  motion.kind === "orbit" ? motion.count : 1;

/**
 * Turns a local point by a motion pose about its pivot, for rides that
 * move with a part (a swing seat, a roundabout).
 */
export const moveWithPose = (
  pivot: Triple,
  local: Triple,
  pose: MotionPose,
): Triple => {
  const point = new Vector3(
    local[0] - pivot[0],
    local[1] - pivot[1],
    local[2] - pivot[2],
  );
  point.multiply(new Vector3(...pose.scale));
  point.applyAxisAngle(new Vector3(1, 0, 0), pose.rotation[0]);
  point.applyAxisAngle(new Vector3(0, 1, 0), pose.rotation[1]);
  point.applyAxisAngle(new Vector3(0, 0, 1), pose.rotation[2]);
  return [
    point.x + pivot[0] + pose.position[0],
    point.y + pivot[1] + pose.position[1],
    point.z + pivot[2] + pose.position[2],
  ];
};

/* ------------------------------------------------------------------ */
/* Wanderers                                                           */
/* ------------------------------------------------------------------ */

export interface WandererSpot {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const wandererPath = (
  wanderers: Wanderers,
  index: number,
  seconds: number,
): LocalPoint => {
  const seed = index * 2.399 + wanderers.name.length * 0.71;
  const slow = (wanderers.speed / Math.max(0.5, wanderers.radius)) * 0.5;
  const first = seconds * slow * (0.8 + (index % 3) * 0.13) + seed;
  const second = seconds * slow * 0.53 * (1 + (index % 2) * 0.2) + seed * 1.7;
  const reach = wanderers.radius;
  return {
    x:
      wanderers.centre.x +
      reach * (0.62 * Math.sin(first) + 0.3 * Math.sin(second * 1.9 + 1)),
    z:
      wanderers.centre.z +
      reach * (0.62 * Math.cos(first * 0.83 + seed) + 0.3 * Math.cos(second)),
  };
};

/** Where one of a set of wanderers is, and which way it faces. */
export const findWandererSpot = (
  wanderers: Wanderers,
  index: number,
  seconds: number,
): WandererSpot => {
  const here = wandererPath(wanderers, index, seconds);
  const ahead = wandererPath(wanderers, index, seconds + 0.25);
  const bob =
    (wanderers.bob ?? 0) * Math.abs(Math.sin(seconds * 5 + index * 1.3));
  return {
    x: here.x,
    y: (wanderers.height ?? 0) + bob,
    z: here.z,
    heading: Math.atan2(ahead.x - here.x, ahead.z - here.z),
  };
};

/* ------------------------------------------------------------------ */
/* Shapes shared by many Attractions                                   */
/* ------------------------------------------------------------------ */

export const palette = {
  grass: "#5f9a3c",
  lawn: "#6aa846",
  path: "#cbb994",
  gravel: "#b8ad9c",
  paving: "#c9c3b6",
  tarmac: "#55585c",
  soil: "#6b4a2f",
  timber: "#8a5a35",
  darkTimber: "#5a3a22",
  paleTimber: "#c49a64",
  brick: "#a2513a",
  darkBrick: "#7d3b2a",
  stone: "#a59d8f",
  darkStone: "#7b7468",
  slate: "#4b5563",
  roofTile: "#9a4a32",
  thatch: "#c8a25a",
  white: "#f4f1ea",
  cream: "#efe4c8",
  black: "#1f2023",
  steel: "#9aa3ad",
  darkSteel: "#4b5259",
  brass: "#c9a24a",
  glass: "#7fa7c4",
  water: "#3d9fc2",
  hedge: "#2f6b2c",
  leaf: "#3f8a3a",
  postRed: "#c8102e",
  warmLight: "#ffd27a",
} as const;

/**
 * A round pad of ground the Attraction stands on, level at y = 0, with
 * a grassy bank sloping down `depth` (and a little more) all round so
 * it sits on a hillside like a terrace and no gap shows.
 */
/** How much further down a ground pad's bank goes than the pad is deep, so it never shows a gap. */
export const groundPadSkirt = 1;

export const addGroundPad = (
  builder: AttractionBuilder,
  radius: number,
  colour: string = palette.grass,
  depth = 0,
): AttractionBuilder => {
  const segments = builder.segments(40, 20);
  const skirt = depth + groundPadSkirt;
  builder.add(
    "matte",
    colour,
    new CylinderGeometry(
      radius,
      radius + skirt * terraceBankSlope,
      skirt,
      segments,
      2,
      false,
    ),
    { at: [0, -skirt / 2, 0] },
    undefined,
  );
  return builder;
};

/** How far out a terrace's grassy bank reaches for each unit it drops. */
export const terraceBankSlope = 1.6;

/** A simple gabled roof over a box, ridge along local x. */
export const addGableRoof = (
  builder: AttractionBuilder,
  {
    width,
    depth,
    rise,
    at,
    colour,
    overhang = 0.18,
    thickness = 0.08,
    finish = "matte",
    turn = 0,
  }: {
    width: number;
    depth: number;
    rise: number;
    at: Triple;
    colour: string;
    overhang?: number;
    thickness?: number;
    finish?: AttractionFinish;
    turn?: number;
  },
): AttractionBuilder => {
  const halfDepth = depth / 2 + overhang;
  const slope = Math.hypot(halfDepth, rise);
  const angle = Math.atan2(rise, halfDepth);
  const cosTurn = Math.cos(turn);
  const sinTurn = Math.sin(turn);
  [1, -1].forEach((side) => {
    const localZ = (side * halfDepth) / 2;
    builder.add(
      finish,
      colour,
      new BoxGeometry(width + overhang * 2, thickness, slope + 0.02)
        .rotateX(side * angle)
        .rotateY(turn),
      {
        at: [
          at[0] + localZ * sinTurn,
          at[1] + rise / 2,
          at[2] + localZ * cosTurn,
        ],
      },
      undefined,
    );
  });
  return builder;
};

/** A window with a frame, glazing bars, glass and a sill, facing +z. */
export const addWindow = (
  builder: AttractionBuilder,
  {
    at,
    width,
    height,
    frame = palette.white,
    glass = palette.glass,
    turn = 0,
    isLit = false,
  }: {
    at: Triple;
    width: number;
    height: number;
    frame?: string;
    glass?: string;
    turn?: number;
    isLit?: boolean;
  },
): AttractionBuilder => {
  const rotation: Triple = [0, turn, 0];
  const out = (distance: number): Triple => [
    at[0] + Math.sin(turn) * distance,
    at[1],
    at[2] + Math.cos(turn) * distance,
  ];
  builder.box(
    isLit ? "glow" : "glass",
    isLit ? palette.warmLight : glass,
    [width, height, 0.04],
    out(0),
    rotation,
  );
  if (builder.isFar) {
    return builder;
  }
  const bar = 0.05;
  builder.box("paint", frame, [width + bar, bar, 0.07], out(0.02), rotation);
  const [x, y, z] = out(0.02);
  builder.box(
    "paint",
    frame,
    [width + bar, bar, 0.07],
    [x, y + height / 2, z],
    rotation,
  );
  builder.box(
    "paint",
    frame,
    [width + bar, bar, 0.07],
    [x, y - height / 2, z],
    rotation,
  );
  const side: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
  [-1, 0, 1].forEach((step) => {
    builder.box(
      "paint",
      frame,
      [bar * (step === 0 ? 0.8 : 1), height, 0.07],
      [x + side[0] * step * (width / 2), y, z + side[2] * step * (width / 2)],
      rotation,
    );
  });
  const sill = out(0.07);
  builder.box(
    "paint",
    frame,
    [width + 0.14, 0.05, 0.12],
    [sill[0], y - height / 2 - 0.04, sill[2]],
    rotation,
  );
  return builder;
};

/** A panelled door in a frame, facing +z, its bottom at `at`. */
export const addDoor = (
  builder: AttractionBuilder,
  {
    at,
    width = 0.55,
    height = 1.05,
    colour,
    frame = palette.white,
    turn = 0,
  }: {
    at: Triple;
    width?: number;
    height?: number;
    colour: string;
    frame?: string;
    turn?: number;
  },
): AttractionBuilder => {
  const rotation: Triple = [0, turn, 0];
  const out = (distance: number, up: number): Triple => [
    at[0] + Math.sin(turn) * distance,
    at[1] + up,
    at[2] + Math.cos(turn) * distance,
  ];
  builder.box(
    "paint",
    colour,
    [width, height, 0.05],
    out(0.01, height / 2),
    rotation,
  );
  builder.box(
    "paint",
    frame,
    [width + 0.12, 0.08, 0.08],
    out(0.03, height + 0.04),
    rotation,
  );
  if (builder.isFar) {
    return builder;
  }
  const side: Triple = [Math.cos(turn), 0, -Math.sin(turn)];
  [-1, 1].forEach((step) => {
    const [x, y, z] = out(0.03, height / 2);
    builder.box(
      "paint",
      frame,
      [0.06, height, 0.08],
      [
        x + side[0] * step * (width / 2 + 0.03),
        y,
        z + side[2] * step * (width / 2 + 0.03),
      ],
      rotation,
    );
  });
  [0.3, 0.72].forEach((up) => {
    builder.box(
      "paint",
      colour,
      [width * 0.7, height * 0.28, 0.03],
      out(0.045, height * up),
      rotation,
    );
  });
  const [x, y, z] = out(0.06, height * 0.5);
  builder.sphere("metal", palette.brass, 0.03, [
    x + side[0] * width * 0.36,
    y,
    z + side[2] * width * 0.36,
  ]);
  return builder;
};

/** A leafy broadleaf tree, its trunk standing at `at`. */
export const addTree = (
  builder: AttractionBuilder,
  at: Triple,
  size = 1,
  leaf: string = palette.leaf,
): AttractionBuilder => {
  const [x, y, z] = at;
  builder.cylinder("matte", palette.darkTimber, {
    radius: 0.16 * size,
    radiusEnd: 0.1 * size,
    length: 1.8 * size,
    at: [x, y + 0.9 * size, z],
    segments: 8,
  });
  const clumps: [number, number, number, number][] = builder.isFar
    ? [[0, 2.3, 0, 1]]
    : [
        [0, 2.4, 0, 1],
        [0.55, 2.1, 0.2, 0.72],
        [-0.5, 2.15, -0.15, 0.7],
        [0.1, 2.0, -0.55, 0.66],
        [-0.15, 2.85, 0.25, 0.62],
      ];
  clumps.forEach(([dx, dy, dz, scale], index) => {
    builder.sphere(
      "matte",
      index % 2 === 0 ? leaf : shade(leaf, 0.88),
      0.85 * size * scale,
      [x + dx * size, y + dy * size, z + dz * size],
      [1, 0.9, 1],
      12,
    );
  });
  return builder;
};

/** A slatted park bench facing +z (turned by `turn`). */
export const addBench = (
  builder: AttractionBuilder,
  at: Triple,
  turn = 0,
  colour: string = palette.paleTimber,
): AttractionBuilder => {
  const rotation: Triple = [0, turn, 0];
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const slats = builder.isFar ? 1 : 3;
  for (let slat = 0; slat < slats; slat++) {
    builder.box(
      "paint",
      colour,
      [1.2, 0.04, slats === 1 ? 0.34 : 0.1],
      place(0, 0.34, -0.12 + slat * 0.12),
      rotation,
    );
    builder.box(
      "paint",
      colour,
      [1.2, slats === 1 ? 0.3 : 0.08, 0.04],
      place(0, 0.5 + slat * 0.11, -0.22),
      [-0.15, turn, 0],
    );
  }
  [-0.5, 0.5].forEach((side) => {
    builder.box(
      "metal",
      palette.black,
      [0.05, 0.34, 0.36],
      place(side, 0.17, 0),
      rotation,
    );
    builder.box(
      "metal",
      palette.black,
      [0.05, 0.36, 0.05],
      place(side, 0.52, -0.21),
      rotation,
    );
  });
  return builder;
};

/** A Victorian lamp post with a glowing lantern on top. */
export const addLampPost = (
  builder: AttractionBuilder,
  at: Triple,
  height = 2.2,
): AttractionBuilder => {
  const [x, y, z] = at;
  builder.cylinder("paint", palette.black, {
    radius: 0.08,
    length: 0.3,
    at: [x, y + 0.15, z],
    segments: 10,
  });
  builder.cylinder("paint", palette.black, {
    radius: 0.04,
    radiusEnd: 0.03,
    length: height,
    at: [x, y + height / 2, z],
    segments: 8,
  });
  builder.box(
    "glow",
    palette.warmLight,
    [0.18, 0.24, 0.18],
    [x, y + height + 0.1, z],
  );
  builder.cylinder("paint", palette.black, {
    radius: 0.16,
    radiusEnd: 0.02,
    length: 0.14,
    at: [x, y + height + 0.29, z],
    segments: 8,
  });
  return builder;
};

/** A run of picket or post-and-rail fence from one local point to another. */
export const addFence = (
  builder: AttractionBuilder,
  from: LocalPoint,
  to: LocalPoint,
  {
    colour = palette.white,
    height = 0.55,
    spacing = 0.22,
    isPicket = true,
    finish = "paint",
  }: {
    colour?: string;
    height?: number;
    spacing?: number;
    isPicket?: boolean;
    finish?: AttractionFinish;
  } = {},
): AttractionBuilder => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const turn = Math.atan2(to.x - from.x, to.z - from.z);
  const across: Triple = [0, turn + Math.PI / 2, 0];
  [0.3, 0.75].forEach((share) => {
    builder.box(
      finish,
      colour,
      [length, 0.05, 0.03],
      [(from.x + to.x) / 2, height * share, (from.z + to.z) / 2],
      across,
    );
  });
  const step = builder.isFar ? spacing * 4 : isPicket ? spacing : spacing * 4;
  const count = Math.max(1, Math.round(length / step));
  for (let index = 0; index <= count; index++) {
    const share = index / count;
    const isPost = index % 4 === 0 || !isPicket;
    builder.box(
      finish,
      colour,
      isPost ? [0.07, height + 0.05, 0.07] : [0.06, height, 0.025],
      [
        from.x + (to.x - from.x) * share,
        (height + (isPost ? 0.05 : 0)) / 2,
        from.z + (to.z - from.z) * share,
      ],
      across,
    );
  }
  return builder;
};

/** A low round bush. */
export const addBush = (
  builder: AttractionBuilder,
  at: Triple,
  size = 0.5,
  colour: string = palette.hedge,
): AttractionBuilder => {
  builder.sphere(
    "matte",
    colour,
    size,
    [at[0], at[1] + size * 0.6, at[2]],
    [1.15, 0.8, 1],
    10,
  );
  if (!builder.isFar) {
    builder.sphere(
      "matte",
      shade(colour, 1.12),
      size * 0.6,
      [at[0] + size * 0.45, at[1] + size * 0.75, at[2] + size * 0.2],
      [1, 0.85, 1],
      8,
    );
  }
  return builder;
};

/**
 * The Attraction's sign: a painted board on two posts, its face
 * towards +z (turned by `turn`), standing at `at`.
 */
export const addSignBoard = (
  builder: AttractionBuilder,
  at: Triple,
  colour: string,
  turn = 0,
): AttractionBuilder => {
  const place = (x: number, y: number, z: number): Triple => [
    at[0] + x * Math.cos(turn) + z * Math.sin(turn),
    at[1] + y,
    at[2] - x * Math.sin(turn) + z * Math.cos(turn),
  ];
  const rotation: Triple = [0, turn, 0];
  [-0.38, 0.38].forEach((side) => {
    builder.box(
      "matte",
      palette.darkTimber,
      [0.07, 1.25, 0.07],
      place(side, 0.62, 0),
      rotation,
    );
  });
  builder.roundedBox(
    "paint",
    colour,
    [0.95, 0.5, 0.06],
    0.03,
    place(0, 1.0, 0.04),
    rotation,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.78, 0.07, 0.02],
    place(0, 1.1, 0.08),
    rotation,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.6, 0.05, 0.02],
    place(0, 0.98, 0.08),
    rotation,
  );
  builder.box(
    "paint",
    palette.cream,
    [0.68, 0.05, 0.02],
    place(0, 0.88, 0.08),
    rotation,
  );
  return builder;
};

/** Lightens (above 1) or darkens (below 1) a hex colour. */
export const shade = (colour: string, by: number): string => {
  const value = Number.parseInt(colour.slice(1), 16);
  const channel = (shift: number) =>
    Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * by)));
  return `#${[16, 8, 0]
    .map((shift) => channel(shift).toString(16).padStart(2, "0"))
    .join("")}`;
};

/** Points round a circle, for land samples. */
export const listRingPoints = (
  radius: number,
  count: number,
  centre: LocalPoint = { x: 0, z: 0 },
): LocalPoint[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      x: centre.x + Math.sin(angle) * radius,
      z: centre.z + Math.cos(angle) * radius,
    };
  });

/** A deck that is flat at `height` inside a local rectangle. */
export const buildFlatDeck =
  (
    {
      minX,
      maxX,
      minZ,
      maxZ,
    }: { minX: number; maxX: number; minZ: number; maxZ: number },
    height: number,
    kind: DeckSurface["kind"] = "bridge",
  ): Deck =>
  ({ x, z }) =>
    x >= minX && x <= maxX && z >= minZ && z <= maxZ
      ? { height, kind }
      : undefined;

/** Blocker circles every `spacing` along a wall from one point to another. */
export const listWallBlockers = (
  from: LocalPoint,
  to: LocalPoint,
  radius: number,
  spacing = radius,
): LocalBlocker[] => {
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const count = Math.max(1, Math.ceil(length / spacing));
  return Array.from({ length: count + 1 }, (_, index) => ({
    x: from.x + ((to.x - from.x) * index) / count,
    z: from.z + ((to.z - from.z) * index) / count,
    radius,
  }));
};
