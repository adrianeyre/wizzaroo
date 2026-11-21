import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  OctahedronGeometry,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import type { FlagHoist } from "./island-ship-design.js";
import { buildPaintedLoft, paintFaces } from "./island-lofts.js";
import { buildLiveryGeometry, onBothSides } from "./island-livery.js";
import { shipBeam, shipDeckHeight } from "./island-voyage.js";

// A three-masted pirate galleon, built to the same berth, deck height and
// gangway as the ship so it docks, slides out its gangplank and carries the
// Character in just the same way. Its waist deck is at the ship's deck
// height, with a forecastle raised at the bow and a quarterdeck and poop deck
// stepping up to a carved stern gallery.

export const pirateStern = -8.4;
export const pirateBow = 8.4;
export const pirateHalfBeam = shipBeam / 2;
export const pirateEntryPort = { from: 1.95, to: 3.05 } as const;

const waterline = 0.3;
const bulwarkHeight = 0.72;
const railThickness = 0.14;
const tumblehome = 0.12;
const lowerRows = 7;
const upperRows = 7;
const deckPoints = 9;
const hullStationCount = 84;

const paint = {
  below: new Color("#5b2a1c"),
  plankLight: new Color("#5e3a22"),
  plankDark: new Color("#4f301c"),
  wale: new Color("#1d1611"),
  upperworks: new Color("#8e1f22"),
  upperworksDark: new Color("#741a1c"),
  gold: new Color("#d8a63a"),
  inside: new Color("#7b5434"),
  deckLight: new Color("#b48d5d"),
  deckDark: new Color("#a17a4c"),
  seam: new Color("#6d4c2c"),
  transom: new Color("#3e2414"),
};

export const findPirateHalfBeam = (z: number): number => {
  const bowStart = 3.2;
  const sternStart = -4;
  if (z > bowStart) {
    const towardsBow = Math.min(1, (z - bowStart) / (pirateBow - bowStart));
    return Math.max(0.05, pirateHalfBeam * (1 - towardsBow ** 1.9));
  }
  if (z < sternStart) {
    return (
      pirateHalfBeam *
      (0.76 + 0.24 * (1 - smoothStep(sternStart, pirateStern, z)))
    );
  }
  return pirateHalfBeam;
};

const findKeel = (z: number): number =>
  -1.15 +
  1.25 * smoothStep(5.2, pirateBow, z) +
  0.35 * smoothStep(-6.4, pirateStern, z);

const forecastle = { from: 4.75, to: 5.05, rise: 0.95 };
const quarterdeck = { from: -3.35, to: -3.65, rise: 0.95 };
const poopDeck = { from: -6.35, to: -6.65, rise: 0.7 };

export const findPirateDeckHeight = (z: number): number =>
  shipDeckHeight +
  forecastle.rise * smoothStep(forecastle.from, forecastle.to, z) +
  quarterdeck.rise * smoothStep(quarterdeck.from, quarterdeck.to, z) +
  poopDeck.rise * smoothStep(poopDeck.from, poopDeck.to, z);

const findBulwark = (z: number): number => {
  const entryPort =
    smoothStep(pirateEntryPort.from - 0.15, pirateEntryPort.from, z) *
    (1 - smoothStep(pirateEntryPort.to, pirateEntryPort.to + 0.15, z));
  return bulwarkHeight * (1 - entryPort);
};

export const findPirateSheer = (z: number): number =>
  findPirateDeckHeight(z) +
  findBulwark(z) +
  0.45 * smoothStep(6.2, pirateBow, z) ** 2;

const findSideHalfWidth = (z: number, y: number): number => {
  const widest = findPirateHalfBeam(z);
  const keel = findKeel(z);
  if (y < waterline) {
    const up = Math.max(0, (y - keel) / (waterline - keel));
    return widest * (1 - (1 - up) ** 2.6);
  }
  const sheer = findPirateSheer(z);
  const up = Math.min(1, (y - waterline) / Math.max(0.01, sheer - waterline));
  return widest * (1 - tumblehome * up ** 2);
};

const listHullStations = (): number[] => {
  const even = Array.from(
    { length: hullStationCount },
    (_, station) =>
      pirateStern +
      ((pirateBow - pirateStern) * station) / (hullStationCount - 1),
  );
  const steps = [forecastle, quarterdeck, poopDeck].flatMap(({ from, to }) =>
    [0, 0.25, 0.5, 0.75, 1].map((share) => from + (to - from) * share),
  );
  const port = [
    pirateEntryPort.from - 0.15,
    pirateEntryPort.from,
    pirateEntryPort.to,
    pirateEntryPort.to + 0.15,
  ];
  return [...even, ...steps, ...port]
    .toSorted((first, second) => first - second)
    .filter((z, index, sorted) => index === 0 || z - sorted[index - 1] > 0.015);
};

const buildHullRing = (z: number): Triple[] => {
  const keel = findKeel(z);
  const deck = findPirateDeckHeight(z);
  const sheer = findPirateSheer(z);
  const lower = Array.from({ length: lowerRows }, (_, row): Triple => {
    const y = keel + ((waterline - keel) * (row + 1)) / lowerRows;
    return [findSideHalfWidth(z, y), y, z];
  });
  const upper = Array.from({ length: upperRows }, (_, row): Triple => {
    const y = waterline + ((sheer - waterline) * (row + 1)) / upperRows;
    return [findSideHalfWidth(z, y), y, z];
  });
  const railOut = findSideHalfWidth(z, sheer);
  const railIn = Math.max(0.02, railOut - railThickness);
  const starboard: Triple[] = [
    ...lower,
    ...upper,
    [railIn, sheer, z],
    [railIn, deck, z],
  ];
  const across = Array.from({ length: deckPoints }, (_, point): Triple => [
    railIn * (1 - (2 * (point + 1)) / (deckPoints + 1)),
    deck,
    z,
  ]);
  const port = starboard
    .toReversed()
    .map(([x, y, pointZ]): Triple => [-x, y, pointZ]);
  return [[0, keel, z], ...starboard, ...across, ...port];
};

const deckPlankWidth = 0.32;

const paintHull = ({ x, y, z }: { x: number; y: number; z: number }): Color => {
  const deck = findPirateDeckHeight(z);
  const sheer = findPirateSheer(z);
  const railOut = findSideHalfWidth(z, Math.min(y, sheer));
  if (z < pirateStern + 0.01) {
    return y > deck - 0.2 ? paint.upperworksDark : paint.transom;
  }
  const isOutside = Math.abs(x) > railOut - railThickness * 0.5;
  if (!isOutside && y < deck + 0.02) {
    const plank = Math.floor((x + 10) / deckPlankWidth);
    return plank % 2 === 0 ? paint.deckLight : paint.deckDark;
  }
  if (!isOutside) {
    return y > sheer - 0.02 ? paint.gold : paint.inside;
  }
  if (y > sheer - 0.07) {
    return paint.gold;
  }
  if (y < -0.05) {
    return paint.below;
  }
  if (Math.abs(y - 0.62) < 0.07 || Math.abs(y - 1.08) < 0.06) {
    return paint.wale;
  }
  if (y > shipDeckHeight - 0.05) {
    if (Math.abs(y - (shipDeckHeight + 0.02)) < 0.05) {
      return paint.gold;
    }
    return Math.floor(z / 1.4) % 2 === 0
      ? paint.upperworks
      : paint.upperworksDark;
  }
  return Math.floor((y + 2) / 0.21) % 2 === 0
    ? paint.plankLight
    : paint.plankDark;
};

export const buildPirateHullGeometry = (): BufferGeometry =>
  buildPaintedLoft(listHullStations().map(buildHullRing), paintHull);

const up = new Vector3(0, 1, 0);

const buildStrut = (
  from: Triple,
  to: Triple,
  radius: number,
  colour: string,
  sides = 5,
): ModelPart => {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const along = end.clone().sub(start);
  const turn = new Euler().setFromQuaternion(
    new Quaternion().setFromUnitVectors(up, along.clone().normalize()),
  );
  const middle = start.clone().add(end).multiplyScalar(0.5);
  return {
    geometry: new CylinderGeometry(radius, radius, along.length(), sides),
    colour,
    position: [middle.x, middle.y, middle.z],
    rotation: [turn.x, turn.y, turn.z],
  };
};

const timber = "#5a3a22";
const darkTimber = "#3b2616";
const rope = "#3a2c1f";
const iron = "#22252b";
const gold = "#d8a63a";
const brass = "#c9973a";
const glow = "#ffd987";

interface Mast {
  z: number;
  foot: number;
  top: number;
  radius: number;
  yards: { y: number; halfSpan: number }[];
  topAt: number;
}

const masts: Record<"fore" | "main" | "mizzen", Mast> = {
  fore: {
    z: 5.7,
    foot: findPirateDeckHeight(5.7),
    top: 11.6,
    radius: 0.17,
    yards: [
      { y: 7.4, halfSpan: 3 },
      { y: 10.6, halfSpan: 2.2 },
    ],
    topAt: 7.9,
  },
  main: {
    z: -0.7,
    foot: shipDeckHeight,
    top: 13.2,
    radius: 0.21,
    yards: [
      { y: 7.9, halfSpan: 3.5 },
      { y: 11.9, halfSpan: 2.6 },
    ],
    topAt: 8.5,
  },
  mizzen: {
    z: -5.6,
    foot: findPirateDeckHeight(-5.6),
    top: 10,
    radius: 0.15,
    yards: [],
    topAt: 7.2,
  },
};

const allMasts: Mast[] = [masts.fore, masts.main, masts.mizzen];

const buildMastParts = ({ z, foot, top, radius, yards, topAt }: Mast) => {
  const parts: ModelPart[] = [
    {
      geometry: new CylinderGeometry(
        radius * 0.8,
        radius,
        topAt - foot + 0.3,
        12,
      ),
      colour: timber,
      position: [0, (topAt + foot) / 2, z],
    },
    {
      geometry: new CylinderGeometry(
        radius * 0.45,
        radius * 0.7,
        top - topAt,
        10,
      ),
      colour: timber,
      position: [0, (top + topAt) / 2, z],
    },
    {
      geometry: new SphereGeometry(radius * 0.7, 10, 6),
      colour: gold,
      position: [0, top + 0.05, z],
    },
    {
      geometry: new CylinderGeometry(radius * 1.6, radius * 1.6, 0.18, 12),
      colour: darkTimber,
      position: [0, foot + 0.09, z],
    },
  ];
  const crowsNest: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.75, 0.6, 0.12, 16),
      colour: darkTimber,
      position: [0, topAt, z],
    },
    {
      geometry: new CylinderGeometry(0.78, 0.78, 0.5, 18, 1, true),
      colour: timber,
      position: [0, topAt + 0.3, z],
    },
    {
      geometry: new TorusGeometry(0.78, 0.04, 5, 22),
      colour: gold,
      position: [0, topAt + 0.56, z],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];
  const yardParts = yards.flatMap(({ y, halfSpan }): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.07, 0.1, halfSpan * 2, 8),
      colour: timber,
      position: [0, y, z + radius + 0.08],
      rotation: [0, 0, Math.PI / 2],
    },
    ...[-1, 1].map((side): ModelPart => ({
      geometry: new SphereGeometry(0.08, 6, 4),
      colour: gold,
      position: [side * halfSpan, y, z + radius + 0.08],
    })),
  ]);
  return [...parts, ...crowsNest, ...yardParts];
};

const sailCloth = new Color("#efe5cc");
const sailSeam = new Color("#e6dbbf");
const sailEdge = new Color("#c7b791");
const sailBand = new Color("#8e1f22");

interface SquareSail {
  z: number;
  top: number;
  bottom: number;
  topHalfWidth: number;
  bottomHalfWidth: number;
  billow: number;
  hasBand?: boolean;
}

const sailColumns = 16;
const sailRows = 12;

const buildSquareSail = ({
  z,
  top,
  bottom,
  topHalfWidth,
  bottomHalfWidth,
  billow,
  hasBand = false,
}: SquareSail): BufferGeometry => {
  const sheet = new BoxGeometry(1, 1, 0.05, sailColumns, sailRows, 1);
  const positions = sheet.getAttribute("position");
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const across = positions.getX(vertex) * 2;
    const height = positions.getY(vertex) + 0.5;
    const halfWidth =
      bottomHalfWidth + (topHalfWidth - bottomHalfWidth) * height;
    const belly =
      billow * (1 - across ** 2) * Math.sin(Math.PI * (0.15 + 0.85 * height));
    positions.setXYZ(
      vertex,
      across * halfWidth,
      bottom + (top - bottom) * height,
      z + positions.getZ(vertex) + belly,
    );
  }
  sheet.computeVertexNormals();
  return paintFaces(sheet, ({ x, y }) => {
    const height = (y - bottom) / (top - bottom);
    const halfWidth =
      bottomHalfWidth + (topHalfWidth - bottomHalfWidth) * height;
    const row = Math.floor(height * sailRows);
    const column = Math.floor(((x / halfWidth + 1) / 2) * sailColumns);
    if (row <= 0 || row >= sailRows - 1) {
      return sailEdge;
    }
    if (hasBand && row === 1) {
      return sailBand;
    }
    return column % 2 === 0 ? sailCloth : sailSeam;
  });
};

export const mainCourse: SquareSail = {
  z: masts.main.z + 0.42,
  top: 7.75,
  bottom: 3.5,
  topHalfWidth: 3.3,
  bottomHalfWidth: 3.6,
  billow: 0.7,
  hasBand: true,
};

const squareSails: SquareSail[] = [
  mainCourse,
  {
    z: masts.main.z + 0.36,
    top: 11.75,
    bottom: 8.75,
    topHalfWidth: 2.4,
    bottomHalfWidth: 3.1,
    billow: 0.5,
  },
  {
    z: masts.fore.z + 0.38,
    top: 7.25,
    bottom: 3.85,
    topHalfWidth: 2.8,
    bottomHalfWidth: 3.1,
    billow: 0.6,
    hasBand: true,
  },
  {
    z: masts.fore.z + 0.32,
    top: 10.45,
    bottom: 8.1,
    topHalfWidth: 2,
    bottomHalfWidth: 2.65,
    billow: 0.42,
  },
];

const buildFlatSail = (
  outline: [number, number][],
  colour: Color,
): BufferGeometry => {
  const shape = new Shape();
  outline.forEach(([z, y], index) => {
    if (index === 0) {
      shape.moveTo(z, y);
    } else {
      shape.lineTo(z, y);
    }
  });
  shape.closePath();
  const sheet = new ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: 1,
  })
    .translate(0, 0, -0.025)
    .rotateY(-Math.PI / 2);
  const flat = paintFaces(sheet, () => colour);
  flat.computeVertexNormals();
  return flat;
};

const bowspritFoot: Triple = [0, 2.75, 7.6];
const bowspritTip: Triple = [0, 4.35, 12.2];

const buildHeadsails = (): BufferGeometry[] => [
  buildFlatSail(
    [
      [masts.fore.z + 0.3, 10.2],
      [11.4, 4.1],
      [8.4, 3.4],
    ],
    sailCloth,
  ),
  buildFlatSail(
    [
      [masts.mizzen.z - 0.25, 8.6],
      [masts.mizzen.z - 0.25, 3.6],
      [-8.9, 3.9],
      [-8.4, 7],
    ],
    sailCloth,
  ),
];

const buildRiggingParts = (): ModelPart[] => {
  const shrouds = allMasts.flatMap((mast) =>
    [-1, 1].flatMap((side) =>
      [-0.9, -0.3, 0.3].map((along) => {
        const z = mast.z + along;
        const sheer = findPirateSheer(z);
        return buildStrut(
          [side * mast.radius, mast.topAt - 0.1, mast.z],
          [side * (findSideHalfWidth(z, sheer) + 0.12), sheer - 0.15, z],
          0.025,
          rope,
          4,
        );
      }),
    ),
  );
  const ratlines = allMasts.flatMap((mast) =>
    [-1, 1].flatMap((side) =>
      Array.from({ length: 6 }, (_, rung) => {
        const share = (rung + 1) / 7;
        const z = mast.z - 0.3;
        const sheer = findPirateSheer(z);
        const outer = findSideHalfWidth(z, sheer) + 0.12;
        const y = sheer - 0.15 + (mast.topAt - sheer) * share;
        const x = side * (outer + (mast.radius - outer) * share);
        return buildStrut(
          [x, y, mast.z - 0.9 + 0.6 * share],
          [x, y, mast.z + 0.3 - 0.3 * share],
          0.015,
          rope,
          3,
        );
      }),
    ),
  );
  const stays = [
    buildStrut(
      [0, masts.main.top - 0.6, masts.main.z],
      [0, masts.fore.foot + 0.3, masts.fore.z - 0.2],
      0.03,
      rope,
    ),
    buildStrut(
      [0, masts.fore.top - 0.5, masts.fore.z],
      bowspritTip,
      0.03,
      rope,
    ),
    buildStrut([0, masts.fore.topAt, masts.fore.z], [0, 3.3, 9.2], 0.03, rope),
    buildStrut(
      [0, masts.mizzen.top - 0.4, masts.mizzen.z],
      [0, masts.main.topAt, masts.main.z],
      0.03,
      rope,
    ),
    buildStrut(
      [0, masts.mizzen.top - 0.4, masts.mizzen.z],
      [0, findPirateSheer(-8.2), -8.2],
      0.03,
      rope,
    ),
  ];
  return [...shrouds, ...ratlines, ...stays];
};

const findHullSide = (z: number, y: number): number => findSideHalfWidth(z, y);

const gunportZs = [-2.6, -1.2, 0.2, 4];

const buildCannonParts = (): ModelPart[] =>
  [-1, 1].flatMap((side) =>
    gunportZs.flatMap((z): ModelPart[] => {
      const y = 0.86;
      const x = findHullSide(z, y);
      return [
        {
          geometry: new BoxGeometry(0.1, 0.42, 0.46),
          colour: "#141012",
          position: [side * (x + 0.01), y, z],
        },
        {
          geometry: new BoxGeometry(0.06, 0.52, 0.56),
          colour: gold,
          position: [side * (x - 0.01), y, z],
        },
        {
          geometry: new BoxGeometry(0.06, 0.06, 0.5),
          colour: "#8e1f22",
          position: [side * (x + 0.22), y + 0.42, z],
          rotation: [0, 0, side * 0.9],
        },
        {
          geometry: new CylinderGeometry(0.07, 0.1, 0.75, 10),
          colour: iron,
          position: [side * (x + 0.3), y, z],
          rotation: [0, 0, Math.PI / 2],
        },
        {
          geometry: new TorusGeometry(0.085, 0.025, 5, 10),
          colour: iron,
          position: [side * (x + 0.66), y, z],
          rotation: [0, Math.PI / 2, 0],
        },
      ];
    }),
  );

const buildDeckParts = (): ModelPart[] => {
  const wheelZ = -4.5;
  const wheelDeck = findPirateDeckHeight(wheelZ);
  const wheelSpokes = Array.from({ length: 8 }, (_, spoke): ModelPart => ({
    geometry: new CylinderGeometry(0.025, 0.025, 1.05, 5),
    colour: timber,
    position: [0, wheelDeck + 1.05, wheelZ],
    rotation: [(spoke * Math.PI) / 8, 0, 0],
  }));
  const wheel: ModelPart[] = [
    {
      geometry: new TorusGeometry(0.42, 0.04, 6, 24),
      colour: brass,
      position: [0, wheelDeck + 1.05, wheelZ],
      rotation: [0, Math.PI / 2, 0],
    },
    ...wheelSpokes,
    {
      geometry: new BoxGeometry(0.2, 0.9, 0.2),
      colour: darkTimber,
      position: [0, wheelDeck + 0.45, wheelZ - 0.12],
    },
  ];
  const capstan: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.34, 0.44, 0.7, 14),
      colour: darkTimber,
      position: [0, shipDeckHeight + 0.35, -2.4],
    },
    {
      geometry: new CylinderGeometry(0.5, 0.5, 0.1, 14),
      colour: brass,
      position: [0, shipDeckHeight + 0.72, -2.4],
    },
  ];
  const grating: ModelPart[] = Array.from({ length: 5 }, (_, bar) => ({
    geometry: new BoxGeometry(1.4, 0.06, 0.08),
    colour: darkTimber,
    position: [0, shipDeckHeight + 0.04, 0.35 + bar * 0.2],
  }));
  const barrels: ModelPart[] = [
    [1.4, 6.2],
    [1.0, 6.7],
    [-1.3, 6.3],
  ].flatMap(([x, z]): ModelPart[] => {
    const deck = findPirateDeckHeight(z);
    return [
      {
        geometry: new CylinderGeometry(0.28, 0.24, 0.62, 12),
        colour: "#7a4f2a",
        position: [x, deck + 0.31, z],
        isSmooth: true,
      },
      ...[0.12, 0.5].map((lift): ModelPart => ({
        geometry: new TorusGeometry(0.275, 0.025, 4, 14),
        colour: iron,
        position: [x, deck + lift, z],
        rotation: [Math.PI / 2, 0, 0],
      })),
    ];
  });
  const chestZ = -7.4;
  const chestDeck = findPirateDeckHeight(chestZ);
  const chest: ModelPart[] = [
    {
      geometry: new BoxGeometry(0.9, 0.42, 0.55),
      colour: "#6b3d1f",
      position: [1.2, chestDeck + 0.21, chestZ],
    },
    {
      geometry: new CylinderGeometry(
        0.275,
        0.275,
        0.9,
        12,
        1,
        false,
        0,
        Math.PI,
      ),
      colour: "#7a4524",
      position: [1.2, chestDeck + 0.42, chestZ],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(0.94, 0.06, 0.6),
      colour: gold,
      position: [1.2, chestDeck + 0.43, chestZ],
    },
    {
      geometry: new BoxGeometry(0.14, 0.16, 0.04),
      colour: gold,
      position: [1.2, chestDeck + 0.35, chestZ + 0.29],
    },
    ...[0, 1, 2, 3].map((coin): ModelPart => ({
      geometry: new CylinderGeometry(0.08, 0.08, 0.025, 10),
      colour: "#f2c94c",
      position: [0.85 + coin * 0.12, chestDeck + 0.02, chestZ + 0.45],
    })),
  ];
  const steps = [
    {
      z: quarterdeck.from + 0.35,
      deck: shipDeckHeight,
      rise: quarterdeck.rise,
      facing: 1,
    },
    {
      z: forecastle.from - 0.35,
      deck: shipDeckHeight,
      rise: forecastle.rise,
      facing: -1,
    },
  ].flatMap(({ z, deck, rise, facing }) =>
    [0, 1, 2].map((step): ModelPart => ({
      geometry: new BoxGeometry(0.9, ((step + 1) * rise) / 4, 0.24),
      colour: darkTimber,
      position: [
        -1.5,
        deck + ((step + 1) * rise) / 8,
        z + facing * (0.24 * (2 - step) - 0.1),
      ],
    })),
  );
  return [...wheel, ...capstan, ...grating, ...barrels, ...chest, ...steps];
};

const buildSternParts = (): ModelPart[] => {
  const z = pirateStern - 0.05;
  const windows = [-1.2, -0.6, 0, 0.6, 1.2].flatMap((x): ModelPart[] => [
    {
      geometry: new BoxGeometry(0.4, 0.5, 0.05),
      colour: glow,
      position: [x, 2.05, z],
    },
    {
      geometry: new BoxGeometry(0.5, 0.06, 0.08),
      colour: gold,
      position: [x, 2.33, z],
    },
    {
      geometry: new BoxGeometry(0.06, 0.6, 0.08),
      colour: gold,
      position: [x - 0.25, 2.05, z],
    },
  ]);
  const gallery: ModelPart[] = [
    {
      geometry: new BoxGeometry(3.3, 0.1, 0.5),
      colour: gold,
      position: [0, 1.74, z - 0.2],
    },
    {
      geometry: new BoxGeometry(3.3, 0.08, 0.08),
      colour: gold,
      position: [0, 2.32, z - 0.42],
    },
    ...[-1.55, -0.78, 0, 0.78, 1.55].map((x): ModelPart => ({
      geometry: new CylinderGeometry(0.03, 0.03, 0.56, 5),
      colour: gold,
      position: [x, 2.04, z - 0.42],
    })),
    {
      geometry: new BoxGeometry(3.6, 0.12, 0.12),
      colour: gold,
      position: [0, 2.55, z],
    },
    {
      geometry: new BoxGeometry(0.2, 2.2, 0.36),
      colour: darkTimber,
      position: [0, 0.5, z - 0.1],
    },
  ];
  const lanterns = [-1.35, 0, 1.35].flatMap((x): ModelPart[] => {
    const top = findPirateSheer(pirateStern + 0.2) + 0.9;
    return [
      {
        geometry: new CylinderGeometry(0.03, 0.03, 0.9, 5),
        colour: iron,
        position: [x, top - 0.45, pirateStern + 0.15],
      },
      {
        geometry: new CylinderGeometry(0.16, 0.12, 0.36, 8),
        colour: glow,
        position: [x, top + 0.18, pirateStern + 0.15],
      },
      {
        geometry: new ConeGeometry(0.2, 0.2, 8),
        colour: gold,
        position: [x, top + 0.46, pirateStern + 0.15],
      },
      {
        geometry: new SphereGeometry(0.05, 6, 4),
        colour: gold,
        position: [x, top + 0.6, pirateStern + 0.15],
      },
    ];
  });
  return [...windows, ...gallery, ...lanterns];
};

const buildBowParts = (): ModelPart[] => {
  const figurehead: ModelPart[] = [
    {
      geometry: new TorusGeometry(0.42, 0.11, 8, 18, Math.PI * 1.3),
      colour: gold,
      position: [0, 2.6, 8.55],
      rotation: [0, Math.PI / 2, -0.6],
    },
    {
      geometry: new SphereGeometry(0.17, 12, 8),
      colour: gold,
      position: [0, 3.02, 8.85],
    },
    {
      geometry: new OctahedronGeometry(0.14),
      colour: "#7c3aed",
      position: [0, 3.02, 9.02],
    },
  ];
  const anchor = [-1, 1].flatMap((side): ModelPart[] => {
    const z = 6.8;
    const x = side * (findHullSide(z, 1.4) + 0.12);
    return [
      {
        geometry: new BoxGeometry(0.08, 1.3, 0.08),
        colour: iron,
        position: [x, 1.25, z],
      },
      {
        geometry: new TorusGeometry(0.36, 0.06, 6, 14, Math.PI),
        colour: iron,
        position: [x, 0.66, z],
        rotation: [Math.PI, Math.PI / 2, 0],
      },
      {
        geometry: new BoxGeometry(0.08, 0.08, 0.6),
        colour: iron,
        position: [x, 1.75, z],
      },
    ];
  });
  return [
    buildStrut(bowspritFoot, bowspritTip, 0.13, timber, 10),
    {
      geometry: new SphereGeometry(0.11, 8, 6),
      colour: gold,
      position: bowspritTip,
    },
    ...figurehead,
    ...anchor,
  ];
};

const flagPoleHeight = 1.1;

export const pirateFlagHoists: readonly FlagHoist[] = [
  {
    top: [0, masts.fore.top + flagPoleHeight, masts.fore.z],
    width: 1.9,
    height: 0.95,
  },
  {
    top: [0, masts.mizzen.top + flagPoleHeight, masts.mizzen.z],
    width: 1.7,
    height: 0.85,
  },
];

export const jollyRogerHoists: readonly FlagHoist[] = [
  {
    top: [0, masts.main.top + flagPoleHeight, masts.main.z],
    width: 2.6,
    height: 1.3,
  },
  {
    top: [0, findPirateSheer(pirateStern + 0.4) + 2.4, pirateStern + 0.35],
    width: 1.8,
    height: 0.9,
  },
];

const buildFlagPoleParts = (): ModelPart[] => [
  ...[masts.fore, masts.main, masts.mizzen].map((mast): ModelPart => ({
    geometry: new CylinderGeometry(0.035, 0.045, flagPoleHeight + 0.1, 6),
    colour: timber,
    position: [0, mast.top + flagPoleHeight / 2, mast.z],
  })),
  buildStrut(
    [0, findPirateSheer(pirateStern + 0.35) - 0.2, pirateStern + 0.35],
    [0, findPirateSheer(pirateStern + 0.35) + 2.45, pirateStern + 0.35],
    0.04,
    timber,
    6,
  ),
];

export const buildPirateSailsGeometry = (): BufferGeometry =>
  mergeGeometries(squareSails.map(buildSquareSail));

export const buildPirateShipGeometry = (): BufferGeometry =>
  mergeGeometries([
    buildPirateHullGeometry(),
    buildPirateSailsGeometry(),
    ...buildHeadsails(),
    buildModelGeometry([
      ...allMasts.flatMap(buildMastParts),
      ...buildRiggingParts(),
      ...buildCannonParts(),
      ...buildDeckParts(),
      ...buildSternParts(),
      ...buildBowParts(),
      ...buildFlagPoleParts(),
    ]),
  ]);

export const buildPirateShipLiveryGeometry = (): BufferGeometry =>
  buildLiveryGeometry([
    {
      surface: buildPirateHullGeometry(),
      decals: [
        ...onBothSides({
          face: "name",
          centre: [findSideHalfWidth(0.4, 1.6), 1.62, 0.4],
          outward: [1, 0, 0],
          up: [0, 1, 0],
          width: 2.6,
          height: 0.62,
        }),
        {
          face: "flag",
          centre: [0, 3.05, pirateStern],
          outward: [0, 0, -1],
          up: [0, 1, 0],
          width: 1.6,
          height: 0.8,
        },
      ],
    },
    {
      surface: buildSquareSail(mainCourse),
      decals: [
        {
          face: "flag",
          centre: [0, 5.55, mainCourse.z + mainCourse.billow],
          outward: [0, 0, 1],
          up: [0, 1, 0],
          width: 4.6,
          height: 2.3,
        },
        {
          face: "flag",
          centre: [0, 5.55, mainCourse.z + mainCourse.billow],
          outward: [0, 0, -1],
          up: [0, 1, 0],
          width: 4.6,
          height: 2.3,
        },
      ],
    },
  ]);
