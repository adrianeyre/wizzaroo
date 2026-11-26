import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Matrix4,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import {
  buildAirfoilLoft,
  buildPaintedLoft,
  paintFaces,
  type AirfoilSection,
} from "./island-lofts.js";
import { buildLiveryGeometry, type LiveryDecal } from "./island-livery.js";
import {
  windsurferBoomHeight,
  windsurferDeck,
  windsurferHalfWidth,
  windsurferHands,
  windsurferLength,
  windsurferMastFoot,
  windsurferMastHeight,
} from "./island-sea-craft.js";

// A freeride windsurfer in the Wizzaroo purple and gold: a wide, flat-decked
// board with footstraps, a mast track, a daggerboard and fin, and a rig of a
// slightly raked mast, a big cambered monofilm sail with battens and a clear
// window, and a curved wishbone boom. The rider stands on the centreline
// facing +x, leaning back and holding the boom, with the sail on their +x
// (leeward) side.

export const windsurferTail = -windsurferLength / 2;
export const windsurferNose = windsurferLength / 2;
const widestZ = -0.2;
const tailHalfWidth = 0.27;
const tailCorner = 0.09;
const middleThickness = 0.13;

const paint = {
  white: new Color("#fbfbfd"),
  underside: new Color("#f1edfb"),
  purple: new Color("#4c1d95"),
  violet: new Color("#6d28d9"),
  lilac: new Color("#a78bfa"),
  gold: new Color("#f5c542"),
  pad: new Color("#3a3156"),
  padGroove: new Color("#5b4a8c"),
  track: new Color("#111018"),
  cloth: new Color("#f7f5ff"),
  seam: new Color("#e2dcf3"),
  window: new Color("#bfe3f2"),
  windowEdge: new Color("#8fb9cc"),
  pocket: new Color("#d6cdef"),
};

const clamp = (value: number, low = 0, high = 1): number =>
  Math.min(high, Math.max(low, value));

const toVector = ([x, y, z]: Triple): Vector3 => new Vector3(x, y, z);
const toTriple = ({ x, y, z }: Vector3): Triple => [x, y, z];

// ---------------------------------------------------------------- the board

export const findWindsurferHalfWidth = (z: number): number => {
  if (z >= widestZ) {
    const share = clamp((z - widestZ) / (windsurferNose - widestZ));
    return windsurferHalfWidth * Math.max(0, 1 - share ** 2.5) ** 0.55;
  }
  const share = clamp((widestZ - z) / (widestZ - windsurferTail));
  const outline =
    windsurferHalfWidth - (windsurferHalfWidth - tailHalfWidth) * share ** 2.1;
  const intoCorner = windsurferTail + tailCorner - z;
  if (intoCorner <= 0) {
    return outline;
  }
  return Math.min(
    outline,
    tailHalfWidth -
      tailCorner +
      Math.sqrt(Math.max(0, tailCorner ** 2 - intoCorner ** 2)),
  );
};

const findThickness = (z: number): number => {
  const middle = -0.25;
  const away =
    z > middle
      ? (z - middle) / (windsurferNose - middle)
      : (middle - z) / (middle - windsurferTail);
  const end = z > middle ? 0.04 : 0.075;
  return end + (middleThickness - end) * (1 - away ** 2.4);
};

const findTop = (z: number): number => {
  const towardsNose = clamp((z - 0.35) / (windsurferNose - 0.35));
  return windsurferDeck + 0.13 * towardsNose ** 2.3;
};

const findBottom = (z: number): number => findTop(z) - findThickness(z);
const findApex = (z: number): number => findBottom(z) + 0.42 * findThickness(z);

export const findWindsurferDeck = (x: number, z: number): number => {
  const width = Math.max(0.001, findWindsurferHalfWidth(z));
  const apex = findApex(z);
  const across = Math.min(1, Math.abs(x) / width);
  return apex + (findTop(z) - apex) * (1 - across ** 4) ** 0.3;
};

const railShares = [
  1, 0.996, 0.985, 0.967, 0.94, 0.9, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2,
  0.12, 0.05,
];

const buildBoardRing = (z: number): Triple[] => {
  const width = Math.max(0.0015, findWindsurferHalfWidth(z));
  const bottom = findBottom(z);
  const apex = findApex(z);
  const top = findTop(z);
  const findDeckHeight = (share: number) =>
    apex + (top - apex) * (1 - Math.abs(share) ** 4) ** 0.3;
  const findUnder = (share: number) =>
    apex -
    (apex - bottom) * (1 - Math.abs(share) ** 6) ** 0.25 +
    0.008 * Math.abs(share);
  const deck = [
    ...railShares,
    ...railShares.toReversed().map((share) => -share),
  ].map((share): Triple => [share * width, findDeckHeight(share), z]);
  const under = [
    ...railShares.slice(1).map((share) => -share),
    ...railShares.slice(1).toReversed(),
  ].map((share): Triple => [share * width, findUnder(share), z]);
  return [...deck, ...under];
};

const boardStations = Array.from({ length: 90 }, (_, station) => {
  const share = station / 89;
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * share);
  return windsurferTail + (windsurferNose - 0.002 - windsurferTail) * eased;
});

const padBack = windsurferTail + 0.1;
const padFront = 0.22;
const mastFoot = toVector([
  windsurferMastFoot.x,
  windsurferMastFoot.y,
  windsurferMastFoot.z,
]);
const trackBack = mastFoot.z - 0.17;
const trackFront = mastFoot.z + 0.17;

const paintBoard = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const width = Math.max(0.001, findWindsurferHalfWidth(z));
  const across = Math.abs(x) / width;
  const isDeck = y > findApex(z) + 0.004;
  if (across > 0.93) {
    return paint.purple;
  }
  if (!isDeck) {
    if (across > 0.84) {
      return paint.violet;
    }
    return z < windsurferTail + 0.3 ? paint.violet : paint.underside;
  }
  if (Math.abs(x) < 0.03 && z > trackBack && z < trackFront) {
    return paint.track;
  }
  if (z > padBack && z < padFront && across < 0.8) {
    const isEdge = across > 0.75 || z > padFront - 0.04 || z < padBack + 0.04;
    return isEdge ? paint.padGroove : paint.pad;
  }
  if (across > 0.86) {
    return paint.violet;
  }
  if (across > 0.81 && across < 0.84) {
    return paint.gold;
  }
  if (z > windsurferNose - 0.2) {
    return z > windsurferNose - 0.17 ? paint.violet : paint.gold;
  }
  return paint.white;
};

const buildBoardShell = (): BufferGeometry =>
  buildPaintedLoft(boardStations.map(buildBoardRing), paintBoard);

interface FootStrap {
  x: number;
  z: number;
}

const footStraps: FootStrap[] = [
  { x: 0.15, z: -0.66 },
  { x: -0.15, z: -0.66 },
  { x: 0.22, z: -1.06 },
  { x: -0.22, z: -1.06 },
];

const buildStrapParts = ({ x, z }: FootStrap): ModelPart[] => {
  const deck = findWindsurferDeck(x, z);
  return [
    {
      geometry: new TorusGeometry(0.075, 0.012, 8, 20, Math.PI),
      colour: "#1c1830",
      position: [x, deck, z],
      rotation: [0, Math.PI / 2, 0],
      scale: [1, 0.75, 1],
    },
    {
      geometry: new TorusGeometry(0.075, 0.024, 10, 14, Math.PI * 0.5),
      colour: "#6d28d9",
      position: [x, deck, z],
      rotation: [0, Math.PI / 2, Math.PI * 0.25],
      scale: [1, 0.75, 1.15],
    },
    ...[-1, 1].map((end): ModelPart => ({
      geometry: new CylinderGeometry(0.018, 0.018, 0.008, 10),
      colour: "#f5c542",
      position: [x, deck + 0.003, z + end * 0.075],
    })),
  ];
};

const buildTrackParts = (): ModelPart[] => [
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new CylinderGeometry(0.008, 0.008, trackFront - trackBack, 8),
    colour: "#334155",
    position: [
      side * 0.028,
      findWindsurferDeck(0.028, mastFoot.z) + 0.003,
      mastFoot.z,
    ],
    rotation: [Math.PI / 2, 0, 0],
  })),
];

interface FoilSpec {
  leadingEdge: number;
  chord: number;
  depth: number;
  sweep: number;
  taper: number;
  colour: Color;
  tip: Color;
}

const foils: FoilSpec[] = [
  {
    leadingEdge: windsurferTail + 0.3,
    chord: 0.15,
    depth: 0.26,
    sweep: 0.12,
    taper: 0.6,
    colour: new Color("#1f1b2e"),
    tip: new Color("#4c1d95"),
  },
  {
    leadingEdge: 0.2,
    chord: 0.2,
    depth: 0.42,
    sweep: 0.06,
    taper: 0.35,
    colour: new Color("#e9e5f5"),
    tip: new Color("#6d28d9"),
  },
];

const buildFoilGeometry = ({
  leadingEdge,
  chord,
  depth,
  sweep,
  taper,
  colour,
  tip,
}: FoilSpec): BufferGeometry => {
  const base = findBottom(leadingEdge - chord / 2) + 0.015;
  const sections = Array.from({ length: 9 }, (_, step): AirfoilSection => {
    const share = step / 8;
    const length = chord * (1 - taper * share ** 1.4);
    return {
      leadingEdge: [
        0,
        base - share * depth,
        leadingEdge - sweep * share ** 1.3,
      ],
      chord: [0, 0, -length],
      thicknessAxis: [1, 0, 0],
      thickness: 0.1,
    };
  });
  return paintFaces(buildAirfoilLoft(sections), ({ y }) =>
    colour.clone().lerp(tip, smoothStep(0.55, 1, (base - y) / depth)),
  );
};

// ------------------------------------------------------------------ the rig

const mastRake = 0.12;
const mastHeel = 0.07;
const mastAxis = new Vector3(
  -Math.sin(mastHeel),
  Math.cos(mastRake) * Math.cos(mastHeel),
  -Math.sin(mastRake),
).normalize();
const mastBase = mastFoot.clone().add(new Vector3(0, 0.13, 0));

const findMastPoint = (along: number): Vector3 =>
  mastFoot.clone().addScaledVector(mastAxis, along);

const boomAlong = (windsurferHands.y - mastFoot.y) / mastAxis.y;
const boomHead = findMastPoint(boomAlong);
const clewZ = -1.4;
const boomSpread = 0.2;

const findBoomSpread = (share: number): number =>
  0.04 + boomSpread * Math.sin(Math.PI * clamp(share) ** 0.85) ** 0.8;

const findBoomFrame = (clewX: number) => {
  const clew = new Vector3(clewX, boomHead.y, clewZ);
  const chord = clew.clone().sub(boomHead);
  const windward = new Vector3(chord.z, 0, -chord.x).normalize();
  return { clew, chord, windward };
};

const findBoomPoint = (clewX: number, side: number, share: number) => {
  const { chord, windward } = findBoomFrame(clewX);
  return boomHead
    .clone()
    .addScaledVector(chord, share)
    .addScaledVector(windward, side * findBoomSpread(share));
};

const findShareAtZ = (clewX: number, z: number): number => {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    if (findBoomPoint(clewX, 1, middle).z > z) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
};

// Sheet the rig in until the windward tube of the wishbone passes through the
// rider's hands.
const clewX = (() => {
  let low = 0;
  let high = 2;
  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;
    const share = findShareAtZ(middle, windsurferHands.z);
    if (findBoomPoint(middle, 1, share).x < windsurferHands.x) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
})();

const boom = findBoomFrame(clewX);
const sailDirection = boom.chord.clone().normalize();

export const findWindsurferBoomPoint = (side: number, share: number): Triple =>
  toTriple(findBoomPoint(clewX, side, share));

export const findWindsurferBoomShareAtZ = (z: number): number =>
  findShareAtZ(clewX, z);

// The sail: chords run from the luff on the mast back to the leech, cambered
// to leeward (+x) and twisting open towards the head.
const luffBottom = 0.07;
const luffTop = windsurferMastHeight - 0.06;
const clewHeight = (boomAlong - luffBottom) / (luffTop - luffBottom);
const boomChord = boom.chord.length() - 0.05;
const headChord = 0.2;

const findSailChord = (height: number): number => {
  if (height <= clewHeight) {
    return boomChord * (height / clewHeight) ** 0.62;
  }
  const up = (height - clewHeight) / (1 - clewHeight);
  return (
    headChord +
    (boomChord - headChord) * (1 - up) ** 1.1 +
    0.36 * Math.sin(Math.PI * up) ** 1.4 * (1 - up) ** 0.15
  );
};

const findSailFrame = (height: number) => {
  const luff = findMastPoint(luffBottom + height * (luffTop - luffBottom));
  const twist = -0.32 * smoothStep(clewHeight, 1, height) ** 1.4;
  const along = sailDirection.clone().applyAxisAngle(mastAxis, twist);
  const leeward = mastAxis.clone().cross(along).normalize();
  if (leeward.x < 0) {
    leeward.negate();
  }
  const depth = 0.1 - 0.035 * height;
  return { luff, along, leeward, depth };
};

const findCamber = (share: number): number =>
  (27 / 4) * share * (1 - share) ** 2;

export const findWindsurferSailPoint = (
  share: number,
  height: number,
): Vector3 => {
  const { luff, along, leeward, depth } = findSailFrame(height);
  const chord = findSailChord(height);
  return luff
    .clone()
    .addScaledVector(along, chord * share)
    .addScaledVector(leeward, chord * depth * findCamber(share));
};

const battenHeights = [0.27, 0.39, 0.51, 0.63, 0.75, 0.87];

// The sail's graphics run in diagonal bands of constant "sweep" (height less
// a share of the way back along the chord), so the cloth is gridded along
// the same diagonals and every band edge is crisp.
const sweepSlope = 0.38;
const sailColumns = 40;
const sailRows = 84;

const findSweepShare = (row: number): number =>
  -sweepSlope + ((1 + sweepSlope) * row) / sailRows;

const findColumnShare = (column: number): number =>
  (1 - Math.cos((Math.PI * column) / sailColumns)) / 2;

const findSailHeight = (share: number, sweep: number): number =>
  clamp(sweep + sweepSlope * share);

const isBetween = (value: number, low: number, high: number): boolean =>
  value > low && value < high;

const paintSail = (share: number, sweep: number): Color => {
  const height = findSailHeight(share, sweep);
  if (share < 0.045) {
    return paint.purple;
  }
  if (share > 0.97 || (height < clewHeight && share > 0.95)) {
    return paint.violet;
  }
  if (sweep > 0.8) {
    return paint.purple;
  }
  if (
    isBetween(sweep, 0.775, 0.8) ||
    isBetween(sweep, 0.135, 0.16) ||
    isBetween(sweep, 0.26, 0.285)
  ) {
    return paint.gold;
  }
  if (isBetween(sweep, 0.16, 0.26)) {
    return paint.violet;
  }
  if (sweep < -0.2) {
    return paint.purple;
  }
  if (isBetween(sweep, -0.225, -0.2)) {
    return paint.gold;
  }
  if (isBetween(share, 0.1, 0.52) && isBetween(sweep, -0.07, 0.11)) {
    const isEdge =
      !isBetween(share, 0.12, 0.5) || !isBetween(sweep, -0.06, 0.1);
    return isEdge ? paint.windowEdge : paint.window;
  }
  if (share > 0.8 && sweep > 0.285) {
    return paint.lilac;
  }
  return Math.floor(sweep * 10 + 10) % 2 === 0 ? paint.cloth : paint.seam;
};

const sailThickness = 0.004;

const buildSailSheet = (side: number): BufferGeometry => {
  const positions: number[] = [];
  for (let row = 0; row <= sailRows; row++) {
    const sweep = findSweepShare(row);
    for (let column = 0; column <= sailColumns; column++) {
      const share = findColumnShare(column);
      const height = findSailHeight(share, sweep);
      const point = findWindsurferSailPoint(share, height).addScaledVector(
        findSailFrame(height).leeward,
        side * sailThickness,
      );
      positions.push(point.x, point.y, point.z);
    }
  }
  const indices: number[] = [];
  const across = sailColumns + 1;
  for (let row = 0; row < sailRows; row++) {
    for (let column = 0; column < sailColumns; column++) {
      const here = row * across + column;
      const above = here + across;
      indices.push(
        ...(side > 0
          ? [here, here + 1, above + 1, here, above + 1, above]
          : [here, above + 1, here + 1, here, above, above + 1]),
      );
    }
  }
  const sheet = new BufferGeometry();
  sheet.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  sheet.setIndex(indices);
  sheet.computeVertexNormals();
  const flat = sheet.toNonIndexed();
  const count = flat.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let triangle = 0; triangle < count / 3; triangle++) {
    const quad = Math.floor(triangle / 2);
    const row = Math.floor(quad / sailColumns);
    const column = quad % sailColumns;
    const colour = paintSail(
      (findColumnShare(column) + findColumnShare(column + 1)) / 2,
      findSweepShare(row + 0.5),
    );
    for (let corner = 0; corner < 3; corner++) {
      colour.toArray(colours, (triangle * 3 + corner) * 3);
    }
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const buildSailGeometry = (): BufferGeometry =>
  mergeGeometries([buildSailSheet(1), buildSailSheet(-1)]);

const buildTube = (
  points: readonly Vector3[],
  radius: number,
  colour: string,
  segments = 64,
  radial = 8,
): ModelPart => ({
  geometry: new TubeGeometry(
    new CatmullRomCurve3([...points], false, "centripetal"),
    segments,
    radius,
    radial,
    false,
  ),
  colour,
  isSmooth: true,
});

const buildBattenParts = (): ModelPart[] =>
  battenHeights.map((height) =>
    buildTube(
      Array.from({ length: 14 }, (_, step) =>
        findWindsurferSailPoint(0.06 + (0.92 * step) / 13, height),
      ),
      0.007,
      "#e2e8f0",
      48,
      6,
    ),
  );

const buildLuffSleeve = (): ModelPart =>
  buildTube(
    Array.from({ length: 12 }, (_, step) =>
      findMastPoint(luffBottom + ((luffTop - luffBottom) * step) / 11)
        .clone()
        .addScaledVector(sailDirection, 0.012),
    ),
    0.032,
    "#4c1d95",
    72,
    14,
  );

const buildMastParts = (): ModelPart[] => {
  const top = findMastPoint(windsurferMastHeight);
  return [
    buildTube([mastBase, findMastPoint(1.2), top], 0.021, "#e5e7eb", 48, 12),
    {
      geometry: new SphereGeometry(0.03, 12, 8),
      colour: "#f5c542",
      position: toTriple(top),
    },
    {
      geometry: new CylinderGeometry(0.045, 0.05, 0.03, 20),
      colour: "#1f1b2e",
      position: [
        mastFoot.x,
        findWindsurferDeck(0, mastFoot.z) + 0.015,
        mastFoot.z,
      ],
    },
    {
      geometry: new CylinderGeometry(0.022, 0.026, 0.06, 14),
      colour: "#111018",
      position: [mastFoot.x, mastFoot.y + 0.04, mastFoot.z],
    },
    {
      geometry: new CylinderGeometry(0.026, 0.026, 0.08, 14),
      colour: "#94a3b8",
      position: toTriple(findMastPoint(0.11)),
      rotation: [-mastRake, 0, mastHeel],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.025, 14),
      colour: "#f5c542",
      position: toTriple(findMastPoint(0.155)),
      rotation: [-mastRake, 0, mastHeel],
    },
  ];
};

const listBoomPoints = (side: number): Vector3[] =>
  Array.from({ length: 24 }, (_, step) =>
    findBoomPoint(clewX, side, step / 23),
  );

const buildBoomParts = (): ModelPart[] => {
  const forward = sailDirection.clone().negate();
  const gripStart = findShareAtZ(clewX, windsurferHands.z + 0.32);
  const gripEnd = findShareAtZ(clewX, windsurferHands.z - 0.42);
  const grips = [-1, 1].map((side) =>
    buildTube(
      Array.from({ length: 12 }, (_, step) =>
        findBoomPoint(
          clewX,
          side,
          gripStart + ((gripEnd - gripStart) * step) / 11,
        ),
      ),
      0.02,
      "#1c1830",
      40,
      10,
    ),
  );
  const head = buildTube(
    [
      findBoomPoint(clewX, 1, 0),
      boomHead
        .clone()
        .addScaledVector(forward, 0.06)
        .addScaledVector(boom.windward, 0.025),
      boomHead.clone().addScaledVector(forward, 0.075),
      boomHead
        .clone()
        .addScaledVector(forward, 0.06)
        .addScaledVector(boom.windward, -0.025),
      findBoomPoint(clewX, -1, 0),
    ],
    0.022,
    "#334155",
    20,
    10,
  );
  const tail = buildTube(
    [
      findBoomPoint(clewX, 1, 1),
      boom.clew
        .clone()
        .addScaledVector(sailDirection, 0.06)
        .addScaledVector(boom.windward, 0.02),
      boom.clew.clone().addScaledVector(sailDirection, 0.075),
      boom.clew
        .clone()
        .addScaledVector(sailDirection, 0.06)
        .addScaledVector(boom.windward, -0.02),
      findBoomPoint(clewX, -1, 1),
    ],
    0.018,
    "#334155",
    20,
    10,
  );
  const sailClew = findWindsurferSailPoint(1, clewHeight);
  const outhaul = buildTube(
    [
      sailClew,
      sailClew
        .clone()
        .lerp(boom.clew, 0.5)
        .add(new Vector3(0, 0.01, 0)),
      boom.clew.clone().addScaledVector(sailDirection, 0.07),
    ],
    0.005,
    "#f5c542",
    16,
    5,
  );
  const tack = findWindsurferSailPoint(0.02, 0);
  const downhaul = buildTube(
    [tack, tack.clone().lerp(mastBase, 0.5), mastBase],
    0.005,
    "#f5c542",
    12,
    5,
  );
  return [
    ...[-1, 1].map((side) =>
      buildTube(listBoomPoints(side), 0.016, "#6d28d9", 64, 10),
    ),
    ...grips,
    head,
    tail,
    outhaul,
    downhaul,
  ];
};

export const buildWindsurferGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildBoardShell(),
    ...foils.map(buildFoilGeometry),
    buildSailGeometry(),
    buildModelGeometry([
      ...footStraps.flatMap(buildStrapParts),
      ...buildTrackParts(),
      ...buildMastParts(),
      buildLuffSleeve(),
      ...buildBattenParts(),
      ...buildBoomParts(),
    ]),
  ]);

const buildSailDecals = (): LiveryDecal[] => {
  const name = { share: 0.47, height: 0.57, width: 1.2, height2: 0.3 };
  const crest = { share: 0.45, height: 0.77, width: 0.62, height2: 0.31 };
  return [name, crest].flatMap(({ share, height, width, height2 }, index) => {
    const centre = findWindsurferSailPoint(share, height);
    const { leeward } = findSailFrame(height);
    return [1, -1].map((side): LiveryDecal => ({
      face: index === 0 ? "name" : "flag",
      centre: toTriple(centre),
      outward: toTriple(leeward.clone().multiplyScalar(side)),
      up: toTriple(mastAxis),
      width,
      height: height2,
    }));
  });
};

export const buildWindsurferLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildSailGeometry(),
      decals: buildSailDecals(),
    },
    {
      surface: buildBoardShell(),
      decals: [
        {
          face: "name",
          centre: [0, findWindsurferDeck(0, 0.88), 0.88],
          outward: [0, 1, 0],
          up: [1, 0, 0],
          width: 0.62,
          height: 0.17,
        },
        {
          face: "name",
          centre: [0, findBottom(-0.2), -0.2],
          outward: [0, -1, 0],
          up: [-1, 0, 0],
          width: 1.2,
          height: 0.3,
        },
      ],
    },
  ]);

// The uphaul rope hangs from the front of the boom down to the mast base and
// swings gently as the board sails.
const uphaulTop = boomHead
  .clone()
  .addScaledVector(sailDirection, -0.075)
  .add(new Vector3(0, -0.02, 0));
const uphaulBottom = mastBase.clone().add(new Vector3(0, 0.03, 0.03));

const buildUphaulGeometry = (): BufferGeometry => {
  const middle = uphaulTop
    .clone()
    .lerp(uphaulBottom, 0.55)
    .add(new Vector3(0.01, 0, 0.1));
  const rope = new CatmullRomCurve3(
    [
      uphaulTop,
      uphaulTop
        .clone()
        .lerp(middle, 0.5)
        .add(new Vector3(0, 0, 0.03)),
      middle,
      middle
        .clone()
        .lerp(uphaulBottom, 0.5)
        .add(new Vector3(0, 0, 0.03)),
      uphaulBottom,
    ],
    false,
    "centripetal",
  );
  const knots = [0.25, 0.45, 0.65].map((share): ModelPart => ({
    geometry: new SphereGeometry(0.014, 8, 6),
    colour: "#f5c542",
    position: toTriple(rope.getPoint(share)),
  }));
  return buildModelGeometry([
    {
      geometry: new TubeGeometry(rope, 40, 0.008, 6, false),
      colour: "#7c3aed",
      isSmooth: true,
    },
    ...knots,
  ]);
};

export const buildWindsurferMovingPartsGeometry = (): BufferGeometry[] => [
  buildUphaulGeometry(),
];

const uphaulAxis = uphaulBottom.clone().sub(uphaulTop).normalize();

export const placeWindsurferMovingParts = (turn: number): Matrix4[] => [
  new Matrix4()
    .makeTranslation(uphaulTop.x, uphaulTop.y, uphaulTop.z)
    .multiply(
      new Matrix4().makeRotationAxis(
        uphaulAxis,
        0.35 * Math.sin(turn * 0.13) + 0.1 * Math.sin(turn * 0.41),
      ),
    )
    .multiply(
      new Matrix4().makeTranslation(-uphaulTop.x, -uphaulTop.y, -uphaulTop.z),
    ),
];

export const windsurferBoomGrip = {
  height: windsurferBoomHeight,
  clewX,
} as const;
