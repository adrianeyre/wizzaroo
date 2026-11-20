import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import { smoothStep } from "../world-map-terrain.js";
import { paintFaces } from "./island-lofts.js";

export const shipStern = -8.6;
export const shipBow = 9.8;
export const shipHalfBeam = 2.8;
export const shipMainDeck = 1.25;
export const gangwayGap = { from: 1.4, to: 3.6 };

const keelDepth = -1;
const sternTaperStart = -5;
const bowTaperStart = 3.8;
const transomShare = 0.82;
const bowSheerRise = 0.75;
const sternSheerRise = 0.25;
const hullStations = 56;
const sectionRows = [
  0, 0.08, 0.18, 0.3, 0.42, 0.52, 0.6, 0.66, 0.72, 0.78, 0.84, 0.88, 0.92, 0.96,
  1,
];
const deckStrips = 12;

const hullColours = {
  antifouling: new Color("#9f1d1d"),
  bootTop: new Color("#111827"),
  topsides: new Color("#1d3a8a"),
  trim: new Color("#e0a526"),
  bulwark: new Color("#f1f5f9"),
};

const deckColours = [new Color("#b8875a"), new Color("#a77a4f")];

export const findShipHalfWidth = (z: number): number => {
  if (z > bowTaperStart) {
    const towardsBow = Math.min(
      1,
      (z - bowTaperStart) / (shipBow - bowTaperStart),
    );
    return Math.max(0.02, shipHalfBeam * (1 - towardsBow ** 1.3));
  }
  if (z < sternTaperStart) {
    const towardsStern = (sternTaperStart - z) / (sternTaperStart - shipStern);
    return (
      shipHalfBeam *
      (transomShare + (1 - transomShare) * (1 - smoothStep(0, 1, towardsStern)))
    );
  }
  return shipHalfBeam;
};

export const findShipDeckHeight = (z: number): number => {
  const bowRise = z > 4 ? bowSheerRise * ((z - 4) / (shipBow - 4)) ** 2 : 0;
  const sternRise =
    z < -6 ? sternSheerRise * ((-6 - z) / (-6 - shipStern)) ** 2 : 0;
  return shipMainDeck + bowRise + sternRise;
};

const findKeelHeight = (z: number): number =>
  keelDepth +
  1.6 * smoothStep(6, shipBow, z) +
  0.45 * smoothStep(-6.5, shipStern, z);

const findSectionFullness = (z: number): number =>
  3 -
  1.4 * smoothStep(bowTaperStart, shipBow, z) -
  0.5 * smoothStep(-5, shipStern, z);

const findStationZ = (station: number): number =>
  shipStern + ((shipBow - shipStern) * station) / (hullStations - 1);

interface HullBand {
  colour: Color;
  findBottom: (keel: number, deck: number) => number;
  findTop: (keel: number, deck: number) => number;
  rows: number;
}

const hullBands: readonly HullBand[] = [
  {
    colour: hullColours.antifouling,
    findBottom: (keel) => keel,
    findTop: () => -0.12,
    rows: 7,
  },
  {
    colour: hullColours.bootTop,
    findBottom: () => -0.12,
    findTop: () => 0.08,
    rows: 2,
  },
  {
    colour: hullColours.topsides,
    findBottom: () => 0.08,
    findTop: (_keel, deck) => deck - 0.34,
    rows: 5,
  },
  {
    colour: hullColours.trim,
    findBottom: (_keel, deck) => deck - 0.34,
    findTop: (_keel, deck) => deck - 0.2,
    rows: 2,
  },
  {
    colour: hullColours.bulwark,
    findBottom: (_keel, deck) => deck - 0.2,
    findTop: (_keel, deck) => deck,
    rows: 2,
  },
];

const findBandColour = (height: number, z: number): Color => {
  const keel = findKeelHeight(z);
  const deck = findShipDeckHeight(z);
  return (
    hullBands.find((band) => height < band.findTop(keel, deck))?.colour ??
    hullColours.bulwark
  );
};

const findHullPointAt = (
  z: number,
  height: number,
  side: number,
): [number, number, number] => {
  const keel = findKeelHeight(z);
  const deck = findShipDeckHeight(z);
  const clamped = Math.min(deck, Math.max(keel, height));
  const shape = 2 / findSectionFullness(z);
  const share = (clamped - keel) / (deck - keel);
  const cosine = (1 - share) ** (1 / shape);
  const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  return [side * findShipHalfWidth(z) * sine ** shape, clamped, z];
};

const findBandHeight = (band: HullBand, z: number, row: number): number => {
  const keel = findKeelHeight(z);
  const deck = findShipDeckHeight(z);
  const bottom = Math.min(deck, Math.max(keel, band.findBottom(keel, deck)));
  const top = Math.min(deck, Math.max(bottom, band.findTop(keel, deck)));
  return bottom + ((top - bottom) * row) / band.rows;
};

const findHullPoint = (
  z: number,
  row: number,
  side: number,
): [number, number, number] =>
  findHullPointAt(
    z,
    findKeelHeight(z) +
      (findShipDeckHeight(z) - findKeelHeight(z)) *
        (row / (sectionRows.length - 1)),
    side,
  );

const buildHullBandGeometry = (
  band: HullBand,
  side: number,
): BufferGeometry => {
  const positions: number[] = [];
  const indices: number[] = [];
  const rows = band.rows + 1;
  for (let station = 0; station < hullStations; station++) {
    const z = findStationZ(station);
    for (let row = 0; row < rows; row++) {
      positions.push(...findHullPointAt(z, findBandHeight(band, z, row), side));
    }
  }
  for (let station = 0; station < hullStations - 1; station++) {
    for (let row = 0; row < rows - 1; row++) {
      const here = station * rows + row;
      const along = here + rows;
      const up = here + 1;
      const alongUp = along + 1;
      if (side > 0) {
        indices.push(here, alongUp, along, here, up, alongUp);
      } else {
        indices.push(here, along, alongUp, here, alongUp, up);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const buildTransomGeometry = (): BufferGeometry => {
  const rows = sectionRows.length;
  const outline = [
    ...Array.from({ length: rows }, (_, row) =>
      findHullPoint(shipStern, row, 1),
    ),
    ...Array.from({ length: rows }, (_, row) =>
      findHullPoint(shipStern, rows - 1 - row, -1),
    ),
  ];
  const middle: Triple = [
    0,
    (findKeelHeight(shipStern) + findShipDeckHeight(shipStern)) / 2,
    shipStern,
  ];
  const positions = outline.flatMap((corner, index) => {
    const next = outline[(index + 1) % outline.length];
    return [...middle, ...next, ...corner];
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.computeVertexNormals();
  return geometry;
};

const buildDeckGeometry = (): BufferGeometry => {
  const positions: number[] = [];
  const indices: number[] = [];
  const across = deckStrips + 1;
  for (let station = 0; station < hullStations; station++) {
    const z = findStationZ(station);
    const halfWidth = findShipHalfWidth(z);
    for (let strip = 0; strip < across; strip++) {
      const share = (strip / deckStrips) * 2 - 1;
      const camber = 0.05 * (1 - share * share);
      positions.push(share * halfWidth, findShipDeckHeight(z) + camber, z);
    }
  }
  for (let station = 0; station < hullStations - 1; station++) {
    for (let strip = 0; strip < deckStrips; strip++) {
      const here = station * across + strip;
      const along = here + across;
      indices.push(here, along, here + 1, here + 1, along, along + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const findPlankColour = (x: number, z: number): Color => {
  const halfWidth = Math.max(0.02, findShipHalfWidth(z));
  const strip = Math.floor(((x / halfWidth + 1) / 2) * deckStrips);
  return deckColours[Math.abs(strip) % 2];
};

const railPostSpacing = 0.75;
const railHeight = 0.72;
const railInset = 0.08;

const listRailStations = (): number[] => {
  const stations: number[] = [];
  for (let z = sternRailZ; z <= 8.2; z += railPostSpacing) {
    const isInGangway = z > gangwayGap.from && z < gangwayGap.to;
    if (!isInGangway) {
      stations.push(z);
    }
  }
  return [...stations, gangwayGap.from, gangwayGap.to].toSorted(
    (first, second) => first - second,
  );
};

const findRailFoot = (z: number, side: number): Triple => [
  side * (findShipHalfWidth(z) - railInset),
  findShipDeckHeight(z),
  z,
];

const sternRailZ = shipStern + 0.15;
const sternRailPosts = 5;

const buildSternParts = (): ModelPart[] => {
  const deck = findShipDeckHeight(sternRailZ);
  const halfWidth = findShipHalfWidth(sternRailZ) - railInset;
  const posts = Array.from(
    { length: sternRailPosts },
    (_, post): ModelPart => ({
      geometry: new CylinderGeometry(0.035, 0.035, railHeight, 5),
      colour: "#e2e8f0",
      position: [
        -halfWidth + (halfWidth * 2 * post) / (sternRailPosts - 1),
        deck + railHeight / 2,
        sternRailZ,
      ],
    }),
  );
  const rails = [railHeight, railHeight * 0.5].map((lift): ModelPart => ({
    geometry: new BoxGeometry(halfWidth * 2 + 0.03, 0.06, 0.06),
    colour: lift === railHeight ? "#c8a26a" : "#e2e8f0",
    position: [0, deck + lift, sternRailZ],
  }));
  const transomDeck = findShipDeckHeight(shipStern);
  const nameBoard: ModelPart = {
    geometry: new BoxGeometry(2.4, 0.34, 0.05),
    colour: "#e0a526",
    position: [0, transomDeck - 0.55, shipStern - 0.03],
  };
  const sternLights = [-1, 1].map((side): ModelPart => ({
    geometry: new SphereGeometry(0.11, 8, 6),
    colour: "#fde047",
    position: [side * 1.6, transomDeck - 0.55, shipStern - 0.06],
  }));
  return [...posts, ...rails, nameBoard, ...sternLights];
};

const buildRailParts = (): ModelPart[] =>
  [-1, 1].flatMap((side) => {
    const stations = listRailStations();
    const posts = stations.map((z): ModelPart => {
      const [x, y] = findRailFoot(z, side);
      return {
        geometry: new CylinderGeometry(0.035, 0.035, railHeight, 5),
        colour: "#e2e8f0",
        position: [x, y + railHeight / 2, z],
      };
    });
    const rails = stations.slice(1).flatMap((z, index): ModelPart[] => {
      const previous = stations[index];
      const isGangway = previous === gangwayGap.from && z === gangwayGap.to;
      if (isGangway) {
        return [];
      }
      const [fromX, fromY] = findRailFoot(previous, side);
      const [toX, toY] = findRailFoot(z, side);
      const length = Math.hypot(toX - fromX, toY - fromY, z - previous);
      const turn = Math.atan2(toX - fromX, z - previous);
      const rise = Math.atan2(
        toY - fromY,
        Math.hypot(toX - fromX, z - previous),
      );
      return [railHeight, railHeight * 0.5].map((lift): ModelPart => ({
        geometry: new BoxGeometry(0.06, 0.06, length + 0.03),
        colour: lift === railHeight ? "#c8a26a" : "#e2e8f0",
        position: [
          (fromX + toX) / 2,
          (fromY + toY) / 2 + lift,
          (previous + z) / 2,
        ],
        rotation: [-rise, turn, 0],
      }));
    });
    return [...posts, ...rails];
  });

const portholeHeight = shipMainDeck - 0.72;

const buildPortholeParts = (): ModelPart[] =>
  [-1, 1].flatMap((side) =>
    [-5.6, -4.3, -3, -1.7, -0.4, 0.9, 4.4].flatMap((z): ModelPart[] => {
      const x = side * (findShipHalfWidth(z) + 0.01);
      return [
        {
          geometry: new CylinderGeometry(0.2, 0.2, 0.05, 10),
          colour: "#d4a017",
          position: [x, portholeHeight, z],
          rotation: [0, 0, Math.PI / 2],
        },
        {
          geometry: new CylinderGeometry(0.14, 0.14, 0.06, 10),
          colour: "#93c5fd",
          position: [x + side * 0.01, portholeHeight, z],
          rotation: [0, 0, Math.PI / 2],
        },
      ];
    }),
  );

const deckhouse = { stern: -6.6, bow: -2.6, halfWidth: 2, height: 1.5 };
const wheelhouse = { stern: -5.6, bow: -3.4, halfWidth: 1.5, height: 1.1 };
const windowColour = "#0f2a4a";
const whitePaint = "#f8fafc";

const buildWindowRow = (
  box: { stern: number; bow: number; halfWidth: number },
  sill: number,
  count: number,
  height: number,
): ModelPart[] => {
  const length = box.bow - box.stern;
  const sideWindows = [-1, 1].flatMap((side) =>
    Array.from({ length: count }, (_, pane): ModelPart => ({
      geometry: new BoxGeometry(0.04, height, (length / count) * 0.7),
      colour: windowColour,
      position: [
        side * (box.halfWidth + 0.01),
        sill + height / 2,
        box.stern + (length * (pane + 0.5)) / count,
      ],
    })),
  );
  const frontWindows = Array.from({ length: 3 }, (_, pane): ModelPart => ({
    geometry: new BoxGeometry(((box.halfWidth * 2) / 3) * 0.75, height, 0.04),
    colour: windowColour,
    position: [
      -box.halfWidth + (box.halfWidth * 2 * (pane + 0.5)) / 3,
      sill + height / 2,
      box.bow + 0.01,
    ],
  }));
  return [...sideWindows, ...frontWindows];
};

const buildSuperstructureParts = (): ModelPart[] => {
  const deckhouseLength = deckhouse.bow - deckhouse.stern;
  const deckhouseMiddle = (deckhouse.bow + deckhouse.stern) / 2;
  const wheelhouseFloor = shipMainDeck + deckhouse.height + 0.12;
  const wheelhouseLength = wheelhouse.bow - wheelhouse.stern;
  const wheelhouseMiddle = (wheelhouse.bow + wheelhouse.stern) / 2;
  return [
    {
      geometry: new BoxGeometry(
        deckhouse.halfWidth * 2,
        deckhouse.height,
        deckhouseLength,
      ),
      colour: whitePaint,
      position: [0, shipMainDeck + deckhouse.height / 2, deckhouseMiddle],
    },
    {
      geometry: new BoxGeometry(
        deckhouse.halfWidth * 2 + 0.06,
        0.16,
        deckhouseLength + 0.06,
      ),
      colour: "#1d3a8a",
      position: [0, shipMainDeck + 0.08, deckhouseMiddle],
    },
    ...buildWindowRow(deckhouse, shipMainDeck + 0.65, 5, 0.5),
    {
      geometry: new BoxGeometry(
        deckhouse.halfWidth * 2 + 0.4,
        0.12,
        deckhouseLength + 0.4,
      ),
      colour: "#cbd5e1",
      position: [0, shipMainDeck + deckhouse.height + 0.06, deckhouseMiddle],
    },
    {
      geometry: new BoxGeometry(
        wheelhouse.halfWidth * 2,
        wheelhouse.height,
        wheelhouseLength,
      ),
      colour: whitePaint,
      position: [0, wheelhouseFloor + wheelhouse.height / 2, wheelhouseMiddle],
    },
    ...buildWindowRow(wheelhouse, wheelhouseFloor + 0.45, 3, 0.5),
    {
      geometry: new BoxGeometry(
        wheelhouse.halfWidth * 2 + 1.6,
        0.1,
        wheelhouseLength + 0.3,
      ),
      colour: "#1d3a8a",
      position: [
        0,
        wheelhouseFloor + wheelhouse.height + 0.05,
        wheelhouseMiddle,
      ],
    },
    {
      geometry: new CylinderGeometry(0.05, 0.06, 1.6, 6),
      colour: "#e2e8f0",
      position: [
        0,
        wheelhouseFloor + wheelhouse.height + 0.85,
        wheelhouseMiddle - 0.3,
      ],
    },
    {
      geometry: new BoxGeometry(1.1, 0.08, 0.16),
      colour: "#334155",
      position: [
        0,
        wheelhouseFloor + wheelhouse.height + 1.25,
        wheelhouseMiddle - 0.3,
      ],
    },
    {
      geometry: new SphereGeometry(0.22, 10, 8),
      colour: "#f8fafc",
      position: [
        0,
        wheelhouseFloor + wheelhouse.height + 1.7,
        wheelhouseMiddle - 0.3,
      ],
    },
  ];
};

export const radarMastTop: Triple = [
  0,
  shipMainDeck + deckhouse.height + 0.12 + wheelhouse.height + 1.7,
  (wheelhouse.bow + wheelhouse.stern) / 2 - 0.3,
];

const funnelZ = -6.4;
const funnelBase = shipMainDeck + deckhouse.height + 0.12;

const buildFunnelParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.62, 0.72, 2.1, 18),
    colour: "#dc2626",
    position: [0, funnelBase + 1.05, funnelZ],
    rotation: [-0.14, 0, 0],
    scale: [0.78, 1, 1],
  },
  {
    geometry: new CylinderGeometry(0.64, 0.64, 0.36, 18),
    colour: "#111827",
    position: [0, funnelBase + 2.05, funnelZ - 0.29],
    rotation: [-0.14, 0, 0],
    scale: [0.78, 1, 1],
  },
  {
    geometry: new CylinderGeometry(0.69, 0.69, 0.3, 18),
    colour: whitePaint,
    position: [0, funnelBase + 1.25, funnelZ - 0.17],
    rotation: [-0.14, 0, 0],
    scale: [0.78, 1, 1],
  },
  ...[-1, 1].map((side): ModelPart => ({
    geometry: new OctahedronGeometry(0.2, 0),
    colour: "#e0a526",
    position: [side * 0.55, funnelBase + 1.25, funnelZ - 0.17],
    scale: [0.3, 1, 1],
  })),
];

const buildLifeboatParts = (): ModelPart[] =>
  [-1, 1].flatMap((side): ModelPart[] => {
    const x = side * (deckhouse.halfWidth - 0.45);
    const y = shipMainDeck + deckhouse.height + 0.42;
    return [
      {
        geometry: new SphereGeometry(0.5, 14, 8),
        colour: "#f97316",
        position: [x, y, -4.6],
        scale: [0.62, 0.42, 2.2],
      },
      {
        geometry: new SphereGeometry(
          0.46,
          14,
          6,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ),
        colour: whitePaint,
        position: [x, y + 0.05, -4.6],
        scale: [0.6, 0.45, 2],
      },
      ...[-5.4, -3.8].map((z): ModelPart => ({
        geometry: new BoxGeometry(0.5, 0.22, 0.12),
        colour: "#475569",
        position: [x, y - 0.25, z],
      })),
    ];
  });

const buildLifeRingParts = (): ModelPart[] =>
  [-1, 1].flatMap((side) =>
    [-5.8, -3.4].flatMap((z): ModelPart[] => [
      {
        geometry: new TorusGeometry(0.28, 0.08, 6, 16),
        colour: "#f97316",
        position: [side * (deckhouse.halfWidth + 0.06), shipMainDeck + 0.95, z],
        rotation: [0, Math.PI / 2, 0],
      },
      ...[0, 1, 2, 3].map((quarter): ModelPart => ({
        geometry: new BoxGeometry(0.06, 0.1, 0.18),
        colour: whitePaint,
        position: [
          side * (deckhouse.halfWidth + 0.08),
          shipMainDeck + 0.95 + Math.sin((quarter * Math.PI) / 2) * 0.28,
          z + Math.cos((quarter * Math.PI) / 2) * 0.28,
        ],
      })),
    ]),
  );

const foremastZ = 4.4;
const foremastHeight = 9;
const mastheadPoleHeight = 1.6;

export const foremastTop: Triple = [
  0,
  shipMainDeck + foremastHeight,
  foremastZ,
];

const sailBillowRadius = 6;

const buildSailParts = ({
  bottom,
  top,
  width,
  colour,
}: {
  bottom: number;
  top: number;
  width: number;
  colour: string;
}): ModelPart[] => {
  const sweep = 2 * Math.asin(width / 2 / sailBillowRadius);
  const height = top - bottom;
  const middle = (bottom + top) / 2;
  const centreZ = foremastZ + 0.25 - sailBillowRadius;
  const sail = (mirror: number): ModelPart => ({
    geometry: new CylinderGeometry(
      sailBillowRadius,
      sailBillowRadius,
      height,
      12,
      1,
      true,
      -sweep / 2,
      sweep,
    ),
    colour,
    position: [0, middle, centreZ],
    scale: [mirror, 1, 1],
  });
  return [
    sail(1),
    sail(-1),
    {
      geometry: new CylinderGeometry(0.06, 0.06, width + 0.4, 6),
      colour: "#7c4a21",
      position: [0, top + 0.05, foremastZ + 0.2],
      rotation: [0, 0, Math.PI / 2],
    },
  ];
};

const buildForemastParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.1, 0.17, foremastHeight, 10),
    colour: "#7c4a21",
    position: [0, shipMainDeck + foremastHeight / 2, foremastZ],
  },
  {
    geometry: new CylinderGeometry(0.42, 0.36, 0.42, 14),
    colour: "#8b5a2b",
    position: [0, shipMainDeck + foremastHeight * 0.72, foremastZ],
  },
  ...buildSailParts({ bottom: 3.4, top: 6.9, width: 4.6, colour: "#fbf3df" }),
  ...buildSailParts({ bottom: 7.9, top: 9.7, width: 3.2, colour: "#dc2626" }),
  {
    geometry: new SphereGeometry(0.12, 8, 6),
    colour: "#fde047",
    position: [0, shipMainDeck + foremastHeight + 0.1, foremastZ],
  },
  {
    geometry: new CylinderGeometry(0.035, 0.045, mastheadPoleHeight, 6),
    colour: "#e2e8f0",
    position: [
      0,
      shipMainDeck + foremastHeight + mastheadPoleHeight / 2,
      foremastZ,
    ],
  },
];

const buildForedeckParts = (): ModelPart[] => [
  {
    geometry: new BoxGeometry(1.6, 0.3, 1.1),
    colour: "#8b6440",
    position: [0, shipMainDeck + 0.15, 6],
  },
  {
    geometry: new CylinderGeometry(0.22, 0.22, 1.1, 12),
    colour: "#334155",
    position: [0, findShipDeckHeight(7.4) + 0.3, 7.4],
    rotation: [0, 0, Math.PI / 2],
  },
  ...[-1, 1].flatMap((side): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.12, 0.14, 0.32, 8),
      colour: "#1f2937",
      position: [side * 1.5, findShipDeckHeight(6.8) + 0.16, 6.8],
    },
    {
      geometry: new TorusGeometry(0.2, 0.05, 5, 10),
      colour: "#1f2937",
      position: [
        side * (findShipHalfWidth(8.2) + 0.03),
        findShipDeckHeight(8.2) - 0.7,
        8.2,
      ],
      rotation: [0, Math.PI / 2, 0],
    },
  ]),
  {
    geometry: new OctahedronGeometry(0.32, 0),
    colour: "#e0a526",
    position: [0, findShipDeckHeight(shipBow) + 0.15, shipBow - 0.1],
    scale: [0.5, 1, 1],
  },
];

const flagstaffZ = -8.2;
export const flagstaffTop: Triple = [
  0,
  findShipDeckHeight(flagstaffZ) + 2.2,
  flagstaffZ,
];

const buildFlagstaffParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(0.04, 0.05, 2.2, 6),
    colour: "#e2e8f0",
    position: [0, findShipDeckHeight(flagstaffZ) + 1.1, flagstaffZ],
  },
];

export interface FlagHoist {
  top: Triple;
  width: number;
  height: number;
}

export const shipFlagHoists: readonly FlagHoist[] = [
  {
    top: [
      0,
      shipMainDeck + foremastHeight + mastheadPoleHeight - 0.05,
      foremastZ,
    ],
    width: 2.6,
    height: 1.3,
  },
  {
    top: [0, flagstaffTop[1] - 0.05, flagstaffZ],
    width: 2,
    height: 1,
  },
];

const pennantColours = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];
const pennantSpacing = 0.85;

const buildBuntingParts = (): ModelPart[] => {
  const bowTop: Triple = [0, findShipDeckHeight(shipBow) + 0.5, shipBow - 0.2];
  const lines: [Triple, Triple][] = [
    [bowTop, foremastTop],
    [foremastTop, radarMastTop],
    [radarMastTop, flagstaffTop],
  ];
  let pennant = 0;
  return lines.flatMap(([from, to]) => {
    const length = Math.hypot(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    );
    const rise = Math.atan2(to[1] - from[1], to[2] - from[2]);
    const sag = 0.25;
    const line: ModelPart = {
      geometry: new CylinderGeometry(0.015, 0.015, length, 4),
      colour: "#334155",
      position: [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2 - sag / 2,
        (from[2] + to[2]) / 2,
      ],
      rotation: [Math.PI / 2 - rise, 0, 0],
    };
    const count = Math.floor(length / pennantSpacing);
    const pennants = Array.from({ length: count }, (_, index): ModelPart => {
      const along = (index + 0.5) / count;
      const droop = sag * 4 * along * (1 - along);
      pennant += 1;
      return {
        geometry: new ConeGeometry(0.16, 0.38, 3),
        colour: pennantColours[pennant % pennantColours.length],
        position: [
          from[0] + (to[0] - from[0]) * along,
          from[1] + (to[1] - from[1]) * along - droop - 0.2,
          from[2] + (to[2] - from[2]) * along,
        ],
        rotation: [Math.PI, 0, 0],
        scale: [1, 1, 0.25],
      };
    });
    return [line, ...pennants];
  });
};

export const buildShipGeometry = (): BufferGeometry => {
  const hull = mergeGeometries([
    ...hullBands.flatMap((band) =>
      [-1, 1].map((side) =>
        paintFaces(buildHullBandGeometry(band, side), () => band.colour),
      ),
    ),
    paintFaces(buildTransomGeometry(), ({ y }) => findBandColour(y, shipStern)),
    paintFaces(buildDeckGeometry(), ({ x, z }) => findPlankColour(x, z)),
  ]);
  const fittings = buildModelGeometry([
    ...buildRailParts(),
    ...buildSternParts(),
    ...buildPortholeParts(),
    ...buildSuperstructureParts(),
    ...buildFunnelParts(),
    ...buildLifeboatParts(),
    ...buildLifeRingParts(),
    ...buildForemastParts(),
    ...buildForedeckParts(),
    ...buildFlagstaffParts(),
    ...buildBuntingParts(),
  ]);
  return mergeGeometries([hull, fittings]);
};
