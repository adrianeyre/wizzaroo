import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  Curve,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import {
  buildAirfoilLoft,
  buildPaintedLoft,
  paintFaces,
  type AirfoilSection,
} from "./island-lofts.js";
import { buildLiveryGeometry } from "./island-livery.js";
import {
  surfRiderZ,
  surfWaveBehind,
  surfWaveHalfWidth,
  surfWaveHeight,
  surfRideLift,
  surfboardDeck,
  surfboardHalfWidth,
  surfboardLength,
} from "./island-sea-craft.js";

// A white fun-board in the Wizzaroo purple and gold: a pointed, rounded nose,
// a squash tail with a kicked traction pad, soft rails, a gold stringer and a
// thruster set of fins underneath. The Character lies on it to paddle out,
// then stands up and rides a massive curling wave to the next Island.

export const surfboardTail = -surfboardLength / 2;
export const surfboardNose = surfboardLength / 2;
const widestZ = -0.05;
const tailHalfWidth = 0.125;
const tailCorner = 0.05;
const middleThickness = 0.08;
const bottomLevel = surfboardDeck - middleThickness;

const paint = {
  white: new Color("#fbfbf9"),
  wax: new Color("#f3eee3"),
  underside: new Color("#f4f1fb"),
  purple: new Color("#4c1d95"),
  violet: new Color("#6d28d9"),
  lilac: new Color("#8b5cf6"),
  gold: new Color("#f5c542"),
  pad: new Color("#1c1830"),
  padGroove: new Color("#2e2550"),
  padSeam: new Color("#0f0c1a"),
  fin: new Color("#5b21b6"),
  finTip: new Color("#a78bfa"),
};

const clamp = (value: number, low = 0, high = 1): number =>
  Math.min(high, Math.max(low, value));

export const findSurfboardHalfWidth = (z: number): number => {
  if (z >= widestZ) {
    const share = clamp((z - widestZ) / (surfboardNose - widestZ));
    return surfboardHalfWidth * Math.max(0, 1 - share ** 2.1) ** 0.62;
  }
  const share = clamp((widestZ - z) / (widestZ - surfboardTail));
  const outline =
    surfboardHalfWidth - (surfboardHalfWidth - tailHalfWidth) * share ** 2.3;
  const intoCorner = surfboardTail + tailCorner - z;
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

const findBottom = (z: number): number => {
  const towardsNose = clamp((z - 0.1) / (surfboardNose - 0.1));
  const towardsTail = clamp((-0.3 - z) / (-0.3 - surfboardTail));
  return bottomLevel + 0.17 * towardsNose ** 2.2 + 0.05 * towardsTail ** 2;
};

const findThickness = (z: number): number => {
  const away =
    z > surfRiderZ
      ? (z - surfRiderZ) / (surfboardNose - surfRiderZ)
      : (surfRiderZ - z) / (surfRiderZ - surfboardTail);
  const end = z > surfRiderZ ? 0.028 : 0.034;
  return end + (middleThickness - end) * (1 - away ** 2.2);
};

const findApex = (z: number): number => findBottom(z) + 0.3 * findThickness(z);

export const findSurfboardDeck = (x: number, z: number): number => {
  const width = Math.max(0.001, findSurfboardHalfWidth(z));
  const apex = findApex(z);
  const top = findBottom(z) + findThickness(z);
  const across = Math.min(1, Math.abs(x) / width);
  return apex + (top - apex) * (1 - across ** 2.6) ** 0.42;
};

const railShares = [
  1, 0.997, 0.988, 0.972, 0.95, 0.92, 0.88, 0.83, 0.77, 0.7, 0.62, 0.53, 0.44,
  0.35, 0.26, 0.18, 0.11, 0.05,
];

const buildBoardRing = (z: number): Triple[] => {
  const width = Math.max(0.0015, findSurfboardHalfWidth(z));
  const bottom = findBottom(z);
  const apex = findApex(z);
  const top = bottom + findThickness(z);
  const stringer = Math.min(0.03, 0.007 / width);
  const shares = [...railShares, stringer];
  const findTop = (share: number) =>
    apex + (top - apex) * (1 - Math.abs(share) ** 2.6) ** 0.42;
  const findUnder = (share: number) =>
    apex - (apex - bottom) * (1 - Math.abs(share) ** 5) ** 0.3;
  const deck = [...shares, ...shares.toReversed().map((share) => -share)].map(
    (share): Triple => [share * width, findTop(share), z],
  );
  const under = [
    ...shares.slice(1).map((share) => -share),
    ...shares.slice(1).toReversed(),
  ].map((share): Triple => [share * width, findUnder(share), z]);
  return [...deck, ...under];
};

const boardStations = Array.from({ length: 64 }, (_, station) => {
  const share = station / 63;
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * share);
  return surfboardTail + (surfboardNose - 0.002 - surfboardTail) * eased;
});

const findWaxSpeckle = (x: number, z: number): number => {
  const seed = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return seed - Math.floor(seed);
};

const paintBoard = ({ x, y, z }: { x: number; y: number; z: number }) => {
  const width = Math.max(0.001, findSurfboardHalfWidth(z));
  const across = Math.abs(x) / width;
  const isDeck = y > findApex(z) + 0.002;
  if (across > 0.9) {
    return paint.purple;
  }
  if (Math.abs(x) < 0.0072) {
    return paint.gold;
  }
  if (across > 0.83) {
    return paint.violet;
  }
  if (across > 0.77 && across < 0.8) {
    return paint.gold;
  }
  if (z > surfboardNose - 0.14) {
    return paint.violet;
  }
  if (!isDeck) {
    return z < surfboardTail + 0.22 ? paint.lilac : paint.underside;
  }
  const isWaxed = z > -0.65 && z < 0.7 && across < 0.74;
  if (isWaxed && findWaxSpeckle(x, z) > 0.5) {
    return paint.wax;
  }
  return paint.white;
};

const buildBoardShell = (): BufferGeometry =>
  buildPaintedLoft(boardStations.map(buildBoardRing), paintBoard);

// The traction pad on the tail: grooved, in three pieces, with a kicked
// tail block and a raised arch bar down the middle.
const padBack = surfboardTail + 0.055;
const padFront = -0.74;

const findPadRise = (x: number, z: number): number => {
  const intoKick = clamp((z - padBack) / 0.2);
  const kick = 0.042 * Math.sin(Math.PI * intoKick ** 0.55) ** 1.4;
  const arch =
    z > -1.02 && Math.abs(x) < 0.11
      ? 0.008 * (1 - (x / 0.11) ** 2) * smoothStep(-1.02, -0.95, z)
      : 0;
  return 0.011 + kick + arch;
};

const padAcross = Array.from({ length: 37 }, (_, point) => point / 36);

const buildPadRing = (z: number): Triple[] => {
  const half = findSurfboardHalfWidth(z) * 0.86;
  const top = padAcross.map((share): Triple => {
    const x = half * (1 - 2 * share);
    const edge = 1 - smoothStep(0.94, 1, Math.abs(1 - 2 * share));
    return [
      x,
      findSurfboardDeck(x, z) + 0.003 + findPadRise(x, z) * (0.3 + 0.7 * edge),
      z,
    ];
  });
  const base = padAcross
    .filter((_, point) => point % 4 === 0)
    .toReversed()
    .map((share): Triple => {
      const x = half * (1 - 2 * share);
      return [x, findSurfboardDeck(x, z) - 0.004, z];
    });
  return [...top, ...base];
};

const padStations = Array.from({ length: 30 }, (_, station) => {
  const share = station / 29;
  return padBack + (padFront - padBack) * share;
});

const paintPad = ({ x, z }: { x: number; z: number }) => {
  if (Math.abs(Math.abs(x) - 0.1) < 0.008) {
    return paint.padSeam;
  }
  if (z < padBack + 0.2 && z > padBack + 0.16) {
    return paint.violet;
  }
  if (z > padFront - 0.02) {
    return paint.violet;
  }
  return Math.floor((x + 1) / 0.021) % 2 === 0 ? paint.pad : paint.padGroove;
};

const buildPadGeometry = (): BufferGeometry =>
  buildPaintedLoft(padStations.map(buildPadRing), paintPad);

interface FinSpec {
  x: number;
  leadingEdge: number;
  chord: number;
  depth: number;
  toe: number;
  cant: number;
}

const fins: FinSpec[] = [
  {
    x: 0,
    leadingEdge: -0.96,
    chord: 0.12,
    depth: 0.13,
    toe: 0,
    cant: 0,
  },
  ...[-1, 1].map((side): FinSpec => ({
    x: side * 0.19,
    leadingEdge: -0.74,
    chord: 0.12,
    depth: 0.125,
    toe: -side * 0.05,
    cant: side * 0.12,
  })),
];

const buildFinGeometry = ({
  x,
  leadingEdge,
  chord,
  depth,
  toe,
  cant,
}: FinSpec): BufferGeometry => {
  const sections = Array.from({ length: 9 }, (_, step): AirfoilSection => {
    const share = step / 8;
    const down = share * depth;
    const length = chord * (1 - 0.72 * share ** 1.6);
    const sweep = 0.085 * share ** 1.5;
    const start = leadingEdge - sweep;
    const base = findBottom(start - chord / 2) + 0.012;
    return {
      leadingEdge: [x + cant * down + toe * sweep, base - down, start],
      chord: [toe * length, 0, -length],
      thicknessAxis: [1, 0, 0],
      thickness: 0.11 - 0.03 * share,
    };
  });
  const base = findBottom(leadingEdge) - 0.02;
  return paintFaces(buildAirfoilLoft(sections), ({ y }) =>
    paint.fin.clone().lerp(paint.finTip, clamp((base - y) / depth) ** 1.5),
  );
};

const leashPlug: Triple = [
  0,
  findSurfboardDeck(0, surfboardTail + 0.03),
  surfboardTail + 0.03,
];

const buildFittingGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.02, 0.02, 0.012, 16),
      colour: "#1f1b2e",
      position: [leashPlug[0], leashPlug[1] + 0.002, leashPlug[2]],
    },
    {
      geometry: new TorusGeometry(0.018, 0.004, 6, 16),
      colour: "#f5c542",
      position: [leashPlug[0], leashPlug[1] + 0.008, leashPlug[2]],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

export const buildSurfboardGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildBoardShell(),
    buildPadGeometry(),
    ...fins.map(buildFinGeometry),
    buildFittingGeometry(),
  ]);

export const buildSurfboardLiveryGeometry = (): BufferGeometry => {
  const crestZ = 0.84;
  const nameZ = 0.36;
  return buildLiveryGeometry([
    {
      surface: buildBoardShell(),
      decals: [
        {
          face: "flag",
          centre: [0, findSurfboardDeck(0, crestZ), crestZ],
          outward: [0, 1, 0],
          up: [0, 0, 1],
          width: 0.34,
          height: 0.17,
        },
        {
          face: "name",
          centre: [0, findSurfboardDeck(0, nameZ), nameZ],
          outward: [0, 1, 0],
          up: [1, 0, 0],
          width: 0.66,
          height: 0.17,
        },
        {
          face: "name",
          centre: [0, findBottom(0.05), 0.05],
          outward: [0, -1, 0],
          up: [-1, 0, 0],
          width: 1.15,
          height: 0.29,
        },
        {
          face: "flag",
          centre: [0, findBottom(0.86), 0.86],
          outward: [0, -1, 0],
          up: [0, 0, 1],
          width: 0.32,
          height: 0.16,
        },
      ],
    },
  ]);
};

// The coiled leash trails from the plug on the tail into the water, swaying
// gently as the board rides.
class LeashPath extends Curve<Vector3> {
  public constructor() {
    super();
  }

  private readonly spine = new CatmullRomCurve3(
    [
      new Vector3(leashPlug[0], leashPlug[1] + 0.012, leashPlug[2]),
      new Vector3(0.02, leashPlug[1] + 0.03, surfboardTail - 0.08),
      new Vector3(0.08, 0.035, surfboardTail - 0.3),
      new Vector3(0.16, 0.012, surfboardTail - 0.55),
      new Vector3(0.2, 0.01, surfboardTail - 0.78),
    ],
    false,
    "centripetal",
  );

  override getPoint(share: number, target = new Vector3()): Vector3 {
    const centre = this.spine.getPoint(share);
    const along = this.spine.getTangent(share);
    const side = new Vector3(0, 1, 0).cross(along).normalize();
    const up = along.clone().cross(side).normalize();
    const coil = smoothStep(0.06, 0.16, share) * smoothStep(1, 0.9, share);
    const angle = share * Math.PI * 2 * 26;
    return target
      .copy(centre)
      .addScaledVector(side, Math.cos(angle) * 0.013 * coil)
      .addScaledVector(up, Math.sin(angle) * 0.013 * coil);
  }
}

const leashEnd: Triple = [0.2, 0.01, surfboardTail - 0.8];

const buildLeashGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new TubeGeometry(new LeashPath(), 320, 0.0045, 5, false),
      colour: "#312e81",
    },
    {
      geometry: new TorusGeometry(0.045, 0.014, 6, 18),
      colour: "#6d28d9",
      position: leashEnd,
      rotation: [Math.PI / 2, 0, 0.4],
      scale: [1, 1, 1.6],
    },
    {
      geometry: new CylinderGeometry(0.0065, 0.0065, 0.05, 6),
      colour: "#f5c542",
      position: [0, leashPlug[1] + 0.016, leashPlug[2] - 0.02],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

export const buildSurfboardMovingPartsGeometry = (): BufferGeometry[] => [
  buildLeashGeometry(),
];

const aboutPoint = (point: Triple, turn: Matrix4): Matrix4 =>
  new Matrix4()
    .makeTranslation(...point)
    .multiply(turn)
    .multiply(new Matrix4().makeTranslation(-point[0], -point[1], -point[2]));

export const placeSurfboardMovingParts = (turn: number): Matrix4[] => [
  aboutPoint(
    leashPlug,
    new Matrix4().makeRotationY(
      0.22 * Math.sin(turn * 0.11) + 0.08 * Math.sin(turn * 0.37),
    ),
  ),
];

// The massive wave: a cross-section that rises from its foot behind the board
// up a concave face, curls over into a barrel and pitches its lip forward high
// above the rider, then falls away down its long back. Towards its ends it is
// lower and only rolls, without breaking.
const curlProfile: [number, number][] = [
  [0.15, -0.08],
  [-0.55, 0.45],
  [-1.35, 1.55],
  [-1.95, 2.95],
  [-2.2, 4.25],
  [-2.05, 5.25],
  [-1.4, 5.9],
  [-0.35, 5.6],
  [0.45, 4.7],
  [0.95, 3.75],
  [1.1, 3.35],
  [1.12, 3.72],
  [0.75, 4.75],
  [-0.2, 5.95],
  [-1.5, 6.55],
  [-3.0, 6.2],
  [-5.2, 4.4],
  [-8.4, 1.9],
  [-12.2, 0.4],
  [-15.5, -0.08],
];

const swellProfile: [number, number][] = [
  [0.15, -0.08],
  [-0.9, 0.5],
  [-1.9, 1.45],
  [-2.9, 2.55],
  [-3.7, 3.5],
  [-4.3, 4.3],
  [-4.7, 4.85],
  [-5.0, 5.2],
  [-5.2, 5.45],
  [-5.35, 5.6],
  [-5.45, 5.68],
  [-5.55, 5.75],
  [-5.75, 5.85],
  [-6.1, 5.95],
  [-6.6, 5.95],
  [-7.4, 5.6],
  [-8.8, 4.3],
  [-10.8, 2.3],
  [-13.2, 0.6],
  [-15.5, -0.08],
];

const lastProfilePoint = curlProfile.length - 1;
const waveColumns = 84;
const waveRows = 104;
const waveFullHeight = 6.55;

const findWaveHeight = (x: number): number => {
  const away = Math.abs(x) / surfWaveHalfWidth;
  const taper = 1 - smoothStep(0.22, 1, away);
  const ripple = 1 + 0.05 * Math.sin(x * 0.61 + 0.4) * Math.sin(x * 0.23);
  return Math.max(0.012, taper ** 1.3 * ripple);
};

const findWaveCurl = (x: number): number =>
  smoothStep(-12.5, -5, x) * (1 - smoothStep(3.5, 10, x));

const findWaveFoot = (x: number): number =>
  -surfWaveBehind - 0.008 * x * x - 0.04 * x;

interface WaveSample {
  point: Vector3;
  station: number;
  height: number;
  curl: number;
}

const buildWaveColumn = (x: number): WaveSample[] => {
  const height = findWaveHeight(x);
  const curl = findWaveCurl(x);
  const reach = 0.4 + 0.6 * height;
  const foot = findWaveFoot(x);
  const scale = (surfWaveHeight / waveFullHeight) * height;
  const spine = new CatmullRomCurve3(
    curlProfile.map(([along, up], index) => {
      const [swellAlong, swellUp] = swellProfile[index];
      const blendedAlong = swellAlong + (along - swellAlong) * curl;
      const blendedUp = swellUp + (up - swellUp) * curl;
      return new Vector3(x, blendedUp * scale, foot + blendedAlong * reach);
    }),
    false,
    "centripetal",
  );
  return Array.from({ length: waveRows + 1 }, (_, row) => {
    const share = row / waveRows;
    return {
      point: spine.getPoint(share),
      station: share * lastProfilePoint,
      height,
      curl,
    };
  });
};

const findStreak = (x: number, station: number): number => {
  const wobble = Math.sin(x * 2.3 + station * 0.9) * 0.5 + 0.5;
  const fine =
    Math.sin(x * 7.7 - station * 2.1 + Math.sin(x * 0.7)) * 0.5 + 0.5;
  return wobble * 0.6 + fine * 0.4;
};

const water = {
  deep: new Color("#06344f"),
  face: new Color("#0a6588"),
  bright: new Color("#12a5bd"),
  glass: new Color("#1fc2cc"),
  lipGlow: new Color("#6fe9e1"),
  back: new Color("#0b5274"),
  foam: new Color("#f6feff"),
  foamShade: new Color("#d3f1f7"),
};

const paintWave = (
  { point, station, height, curl }: WaveSample,
  x: number,
): Color => {
  const rise = point.y / (surfWaveHeight * Math.max(height, 0.05));
  const streak = findStreak(x, station);
  const colour = new Color();
  if (station < 5) {
    colour
      .copy(water.deep)
      .lerp(water.face, smoothStep(0, 0.4, rise))
      .lerp(water.bright, smoothStep(0.35, 0.8, rise))
      .lerp(water.glass, smoothStep(0.7, 1, rise) * (0.5 + 0.5 * curl));
    const runnel =
      (0.5 + 0.5 * Math.sin(x * 1.9 + Math.sin(x * 0.37) * 3)) ** 6 *
      smoothStep(0.1, 0.5, rise) *
      (1 - smoothStep(0.75, 0.95, rise));
    colour.lerp(water.lipGlow, 0.1 * streak * smoothStep(0.2, 0.7, rise));
    colour.lerp(water.bright, 0.35 * runnel);
  } else if (station < 10) {
    colour
      .copy(water.bright)
      .lerp(water.glass, 0.6)
      .lerp(water.lipGlow, smoothStep(7, 10, station) * 0.7);
  } else if (station < 15) {
    const edge = 1 - smoothStep(10.3, 11.1, station);
    const crest = smoothStep(12.8, 13.9, station);
    const foam =
      curl *
      Math.min(1, edge * (0.6 + 0.5 * streak) + crest * (0.3 + 0.8 * streak));
    colour
      .copy(water.lipGlow)
      .lerp(water.glass, smoothStep(11.5, 13.5, station) * 0.8)
      .lerp(water.foam, Math.min(1, foam));
  } else {
    const down = smoothStep(15, lastProfilePoint, station);
    colour
      .copy(water.glass)
      .lerp(
        water.foam,
        curl * 0.6 * (1 - smoothStep(15, 15.6, station)) * streak,
      )
      .lerp(water.bright, smoothStep(0, 0.2, down))
      .lerp(water.back, smoothStep(0.15, 0.7, down));
  }
  const footFoam =
    (1 - smoothStep(0.005, 0.05, rise)) * (station < 3 ? 1 : 0.4);
  colour.lerp(water.foam, footFoam * (0.3 + 0.6 * height));
  return colour;
};

interface Sheet {
  positions: number[];
  colours: number[];
  columns: number;
  rows: number;
}

// Rows are emitted band by band (all columns of a row before the next row)
// so that, drawn without depth writes, the face is laid down before the lip
// that pitches out in front of it, and the back last of all.
const buildSheetGeometry = ({
  positions,
  colours,
  columns,
  rows,
}: Sheet): BufferGeometry => {
  const indices: number[] = [];
  const across = rows + 1;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const here = column * across + row;
      const next = here + across;
      indices.push(here, next, next + 1, here, next + 1, here + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(colours), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry.toNonIndexed();
};

const waveColumnXs = Array.from({ length: waveColumns + 1 }, (_, column) => {
  const share = column / waveColumns;
  const eased = Math.sin((share - 0.5) * Math.PI) * 0.35 + (share - 0.5);
  return (eased / 1.35) * 2 * surfWaveHalfWidth;
});

const buildWaveSheet = (): BufferGeometry => {
  const positions: number[] = [];
  const colours: number[] = [];
  waveColumnXs.forEach((x) => {
    buildWaveColumn(x).forEach((sample) => {
      positions.push(sample.point.x, sample.point.y, sample.point.z);
      paintWave(sample, x).toArray(colours, colours.length);
    });
  });
  return buildSheetGeometry({
    positions,
    colours,
    columns: waveColumns,
    rows: waveRows,
  });
};

const findHash = (seed: number): number => {
  const value = Math.sin(seed * 91.345 + 17.17) * 43758.5453;
  return value - Math.floor(value);
};

const buildDroplet = (
  centre: Vector3,
  radius: number,
  colour: Color,
  stretch: Triple = [1.2, 0.9, 1],
  lift = 1.5,
  detail = 0,
): BufferGeometry => {
  const droplet = new IcosahedronGeometry(1, detail);
  droplet.deleteAttribute("uv");
  const positions = droplet.getAttribute("position");
  const normals = new Float32Array(positions.count * 3);
  const colours = new Float32Array(positions.count * 3);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const direction = new Vector3()
      .fromBufferAttribute(positions, vertex)
      .normalize();
    new Vector3(
      direction.x / stretch[0],
      direction.y / stretch[1] + lift,
      direction.z / stretch[2] + lift * 0.4,
    )
      .normalize()
      .toArray(normals, vertex * 3);
    colour.toArray(colours, vertex * 3);
    positions.setXYZ(
      vertex,
      centre.x + direction.x * radius * stretch[0],
      centre.y + direction.y * radius * stretch[1],
      centre.z + direction.z * radius * stretch[2],
    );
  }
  droplet.setAttribute("normal", new BufferAttribute(normals, 3));
  droplet.setAttribute("color", new BufferAttribute(colours, 3));
  return droplet;
};

// Spray droplets flung off the pitching lip.
const buildSprayGeometry = (): BufferGeometry[] =>
  Array.from({ length: 130 }, (_, index) => {
    const x = (findHash(index) - 0.5) * 2 * 10 - 1.5;
    const curl = findWaveCurl(x);
    const column = buildWaveColumn(x);
    const station = 9.8 + findHash(index + 0.5) * 0.7;
    const sample = column[Math.round((station / lastProfilePoint) * waveRows)];
    const fling = findHash(index + 0.25);
    const centre = sample.point
      .clone()
      .add(
        new Vector3(
          (findHash(index + 0.6) - 0.5) * 0.3,
          -fling * 0.5 * curl,
          (0.04 + 0.3 * findHash(index + 0.8) * (1 - fling)) * curl,
        ),
      );
    const radius =
      (0.018 + 0.045 * findHash(index + 0.33) ** 2) *
      (0.3 + 0.7 * curl) *
      (1 - 0.5 * fling);
    return buildDroplet(
      centre,
      radius,
      water.foam.clone().lerp(water.lipGlow, findHash(index + 0.9) * 0.3),
    );
  });

// Spray feathering up and back off the top of the breaking crest.
const buildCrestSprayGeometry = (): BufferGeometry[] =>
  Array.from({ length: 140 }, (_, index) => {
    const x = (findHash(index + 0.11) - 0.5) * 2 * 10 - 1.5;
    const curl = findWaveCurl(x);
    const station = 13.2 + findHash(index + 0.21) * 1.6;
    const sample =
      buildWaveColumn(x)[Math.round((station / lastProfilePoint) * waveRows)];
    const fling = findHash(index + 0.31);
    const centre = sample.point
      .clone()
      .add(new Vector3(0, (0.05 + fling * 0.7) * curl, -fling * 0.8 * curl));
    const radius =
      (0.02 + 0.05 * findHash(index + 0.41) ** 2) *
      (0.3 + 0.7 * curl) *
      (1 - 0.6 * fling);
    return buildDroplet(centre, radius, water.foam);
  });

// Billows of whitewater churning along the foot of the face.
const buildFoamBallGeometry = (): BufferGeometry[] =>
  Array.from({ length: 130 }, (_, index) => {
    const x = (findHash(index + 0.13) - 0.5) * 2 * 13.5;
    const height = findWaveHeight(x);
    const size = findHash(index + 0.53) ** 1.6;
    const centre = new Vector3(
      x,
      0.01 + findHash(index + 0.23) * 0.1 * height,
      findWaveFoot(x) - 0.05 + findHash(index + 0.43) * 0.7 * height,
    );
    const radius = (0.07 + 0.3 * size) * (0.25 + 0.75 * height);
    return buildDroplet(
      centre,
      radius,
      water.foam.clone().lerp(water.foamShade, findHash(index + 0.63) * 0.6),
      [1.4, 0.5 + 0.2 * findHash(index + 0.73), 1.1],
      0.8,
      1,
    );
  });

export const buildSurfWaveGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildWaveSheet(),
    ...buildFoamBallGeometry(),
    ...buildSprayGeometry(),
    ...buildCrestSprayGeometry(),
  ]);

const waveFoot: Triple = [0, 0, -surfWaveBehind];

// Where, in the wave's own build, the board rides: on the open shoulder
// just ahead of the curling section, so the barrel breaks behind the rider
// and the lip never hides them, partway up the concave face.
const waveRideX = 8;
const waveRideFaceZ = (() => {
  const column = buildWaveColumn(waveRideX);
  const above = column.findIndex(({ point }) => point.y >= surfRideLift);
  const upper = column[Math.max(1, above)].point;
  const lower = column[Math.max(0, above - 1)].point;
  const share = (surfRideLift - lower.y) / Math.max(upper.y - lower.y, 1e-6);
  return lower.z + (upper.z - lower.z) * share;
})();

// The wave is built with its crest along x and its face towards +z; it
// stands on the board's +x side with its crest running the way the board
// rides, so the Character carves along its face.
const waveTurn = -0.8;

/**
 * Where the massive wave is, relative to the surfboard: grown to `size` (0
 * to 1), with the board up on its face. The board leans into the face and
 * dips its nose; `tilt` undoes that, so the wave stands level on the sea.
 */
export const placeSurfWave = (
  size: number,
  turn: number,
  tilt: { pitch: number; roll: number } = { pitch: 0, roll: 0 },
): Matrix4 => {
  const grown = clamp(size);
  const breathe = 1 + 0.018 * Math.sin(turn * 0.21) * grown;
  const surge = 1 + 0.025 * Math.sin(turn * 0.13 + 1.1) * grown;
  const tall = Math.max(0.001, grown * breathe);
  const deep = Math.max(0.05, (0.3 + 0.7 * grown) * surge);
  const grow = new Matrix4()
    .makeTranslation(waveFoot[0], waveFoot[1] - 0.12 * (1 - grown), waveFoot[2])
    .multiply(new Matrix4().makeRotationZ(0.012 * Math.sin(turn * 0.09)))
    .multiply(new Matrix4().makeScale(1, tall, deep))
    .multiply(
      new Matrix4().makeTranslation(-waveFoot[0], -waveFoot[1], -waveFoot[2]),
    );
  const face = new Vector3(waveRideX, surfRideLift, waveRideFaceZ).applyMatrix4(
    grow,
  );
  return new Matrix4()
    .makeRotationZ(-tilt.roll)
    .multiply(new Matrix4().makeRotationX(tilt.pitch))
    .multiply(new Matrix4().makeRotationY(waveTurn))
    .multiply(
      new Matrix4().makeTranslation(-face.x, -surfRideLift * grown, -face.z),
    )
    .multiply(grow);
};
