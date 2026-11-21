import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { islands } from "../../curriculum/islands.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  findDistanceToNewLandRivers,
  meadowNewLands,
  smoothStep,
  type MapPoint,
  type NewLands,
  type ScatteredThing,
  buildPlaceGrid,
} from "../world-map-terrain.js";
import { emberIsle } from "./ember-isle.js";
import { attractionSites } from "./island-attraction-sites.js";
import { frostIsle } from "./frost-isle.js";
import {
  exploreScale,
  findIslandAdventure,
  isClearOfTrailsAndAirfield,
  isInsideFirstLands,
  listAdventurePlaces,
  type IslandAdventure,
} from "./island-adventures.js";
import type { IslandLandform } from "./island-landform.js";
import { listTransportPlaces } from "./island-transport.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

export type WonderKind =
  | "windmill"
  | "stone-circle"
  | "balloon"
  | "snowman-family"
  | "pyramid"
  | "walk-behind-falls"
  | "giant-mushrooms"
  | "lantern-cave"
  | "crystal-arch";

export interface Wonder {
  kind: WonderKind;
  position: MapPoint;
}

export type GroveLook = "oak" | "pine" | "palm" | "kapok" | "ember" | "crystal";

export interface WonderTheme {
  grove: GroveLook;
  groveCount: number;
  flowers: [string, string, string];
  mushroom: { cap: string; spots: string; stem: string };
  balloon: [string, string];
}

export const wonderFootprints: Record<WonderKind, number> = {
  windmill: 1.1,
  "stone-circle": 1.5,
  balloon: 0.8,
  "snowman-family": 1.1,
  pyramid: 1.8,
  "walk-behind-falls": 2.4,
  "giant-mushrooms": 1.2,
  "lantern-cave": 2,
  "crystal-arch": 1.4,
};

export const islandWonders: Record<string, Wonder[]> = {
  "meadow-isle": [
    { kind: "windmill", position: { x: 55.5, z: 14 } },
    { kind: "stone-circle", position: { x: 43.5, z: -13 } },
    { kind: "balloon", position: { x: -56, z: -12 } },
  ],
  "frost-isle": [
    { kind: "snowman-family", position: { x: 57, z: 8 } },
    { kind: "stone-circle", position: { x: -43.5, z: 4.5 } },
    { kind: "balloon", position: { x: -71, z: 0 } },
  ],
  "sunscorch-sands": [
    { kind: "pyramid", position: { x: 55, z: 13.5 } },
    { kind: "windmill", position: { x: -52, z: -16 } },
    { kind: "balloon", position: { x: 51.5, z: -16 } },
  ],
  "jungle-reach": [
    { kind: "walk-behind-falls", position: { x: 55.5, z: 13.5 } },
    { kind: "giant-mushrooms", position: { x: -43, z: 12 } },
    { kind: "balloon", position: { x: 50, z: -16 } },
  ],
  "ember-isle": [
    { kind: "lantern-cave", position: { x: 39, z: -9.5 } },
    { kind: "giant-mushrooms", position: { x: -55, z: -6 } },
    { kind: "balloon", position: { x: 67.5, z: -3.5 } },
  ],
  "starfall-isle": [
    { kind: "crystal-arch", position: { x: 54.5, z: 13.5 } },
    { kind: "giant-mushrooms", position: { x: 43.5, z: -13.5 } },
    { kind: "balloon", position: { x: -56, z: -12 } },
  ],
};

export const wonderThemes: Record<string, WonderTheme> = {
  "meadow-isle": {
    grove: "oak",
    groveCount: 55,
    flowers: ["#f472b6", "#facc15", "#a78bfa"],
    mushroom: { cap: "#dc2626", spots: "#fef2f2", stem: "#f5f0e1" },
    balloon: ["#ef4444", "#facc15"],
  },
  "frost-isle": {
    grove: "pine",
    groveCount: 70,
    flowers: ["#bae6fd", "#e0f2fe", "#c4b5fd"],
    mushroom: { cap: "#60a5fa", spots: "#eff6ff", stem: "#e2e8f0" },
    balloon: ["#2563eb", "#f8fafc"],
  },
  "sunscorch-sands": {
    grove: "palm",
    groveCount: 60,
    flowers: ["#fb923c", "#facc15", "#f43f5e"],
    mushroom: { cap: "#ea580c", spots: "#fff7ed", stem: "#fde68a" },
    balloon: ["#f97316", "#0ea5e9"],
  },
  "jungle-reach": {
    grove: "kapok",
    groveCount: 75,
    flowers: ["#f43f5e", "#fbbf24", "#e879f9"],
    mushroom: { cap: "#e11d48", spots: "#fff1f2", stem: "#f5f5dc" },
    balloon: ["#16a34a", "#fde047"],
  },
  "ember-isle": {
    grove: "ember",
    groveCount: 65,
    flowers: ["#f97316", "#fbbf24", "#ef4444"],
    mushroom: { cap: "#f97316", spots: "#fde68a", stem: "#44403c" },
    balloon: ["#b91c1c", "#1c1917"],
  },
  "starfall-isle": {
    grove: "crystal",
    groveCount: 80,
    flowers: ["#a78bfa", "#22d3ee", "#f0abfc"],
    mushroom: { cap: "#7c3aed", spots: "#a5f3fc", stem: "#ddd6fe" },
    balloon: ["#7c3aed", "#22d3ee"],
  },
};

const landforms = new Map<string, IslandLandform>([
  ["frost-isle", frostIsle],
  ["sunscorch-sands", sunscorchSands],
  ["jungle-reach", jungleReach],
  ["ember-isle", emberIsle],
  ["starfall-isle", starfallIsle],
]);

const findNewLands = (islandId: string): NewLands =>
  landforms.get(islandId)?.newLands ?? meadowNewLands;

export const listIslandWonders = (islandId: string): Wonder[] =>
  islandWonders[islandId] ?? [];

export const findWonderTheme = (islandId: string): WonderTheme =>
  wonderThemes[islandId] ?? wonderThemes["meadow-isle"];

export interface PlacedWonder extends Wonder {
  centre: MapPoint;
  ground: number;
  turn: number;
}

export const placeWonder = (
  adventure: IslandAdventure,
  wonder: Wonder,
): PlacedWonder => {
  const centre = {
    x: wonder.position.x * exploreScale,
    z: wonder.position.z * exploreScale,
  };
  return {
    ...wonder,
    centre,
    ground: adventure.findHeight(centre),
    turn: Math.atan2(-centre.x, -centre.z),
  };
};

export const placeIslandWonders = (
  adventure: IslandAdventure,
): PlacedWonder[] =>
  listIslandWonders(adventure.islandId).map((wonder) =>
    placeWonder(adventure, wonder),
  );

export const placeOnWonder = (
  { centre, turn }: { centre: MapPoint; turn: number },
  local: MapPoint,
): MapPoint => ({
  x: centre.x + local.x * Math.cos(turn) + local.z * Math.sin(turn),
  z: centre.z - local.x * Math.sin(turn) + local.z * Math.cos(turn),
});

export interface Blocker {
  centre: MapPoint;
  radius: number;
}

export const fallsSheetHalfWidth = 2.6;
export const fallsBehindSpot: MapPoint = { x: 0, z: -2.4 };
export const fallsSideWay: MapPoint = { x: 4, z: 1.2 };
export const fallsLipHeight = 9.7;
const fallsLipFront = -0.9;
const fallsWallFront = -3.6;
const fallsPoolRadius = 4.2;

export const caveInnerRadius = 5.7;
export const caveOuterRadius = 6.4;
export const caveInnerHeight = 3.7;
const caveOuterHeight = 4.4;
export const caveDoorHalfWidth = 1.2;
const caveDoorAxis = 1.05;
const caveWallBlockAt = 6.5;
const caveWallBlockRadius = 0.95;
export const lanternReach = 8.2;

const listFallsBlockers = (wonder: PlacedWonder): Blocker[] => {
  const wall = Array.from({ length: 13 }, (_, index) => ({
    centre: placeOnWonder(wonder, { x: index - 6, z: fallsWallFront - 1.6 }),
    radius: 1.6,
  }));
  const buttresses = [1, -1].flatMap((side) =>
    [-5, -3.5, -2, -0.6].map((z) => ({
      centre: placeOnWonder(wonder, { x: side * 6.6, z }),
      radius: 1.55,
    })),
  );
  return [...wall, ...buttresses];
};

const listCaveBlockers = (wonder: PlacedWonder): Blocker[] =>
  Array.from({ length: 48 }, (_, index) => (index / 48) * Math.PI * 2)
    .map((angle) => ({
      x: Math.sin(angle) * caveWallBlockAt,
      z: Math.cos(angle) * caveWallBlockAt,
    }))
    .filter(
      ({ x, z }) =>
        z < 0 || Math.abs(x) > caveDoorHalfWidth + caveWallBlockRadius,
    )
    .map((local) => ({
      centre: placeOnWonder(wonder, local),
      radius: caveWallBlockRadius,
    }));

const solidWonderRadii: Partial<Record<WonderKind, number>> = {
  windmill: 1.8,
  pyramid: 5.8,
};

export const listWonderBlockers = (adventure: IslandAdventure): Blocker[] =>
  placeIslandWonders(adventure).flatMap((wonder): Blocker[] => {
    if (wonder.kind === "walk-behind-falls") {
      return listFallsBlockers(wonder);
    }
    if (wonder.kind === "lantern-cave") {
      return listCaveBlockers(wonder);
    }
    const radius = solidWonderRadii[wonder.kind];
    return radius === undefined ? [] : [{ centre: wonder.centre, radius }];
  });

export const findCave = (
  adventure: IslandAdventure,
): PlacedWonder | undefined =>
  placeIslandWonders(adventure).find(({ kind }) => kind === "lantern-cave");

export const findLanternGlow = (
  cave: PlacedWonder | undefined,
  point: MapPoint,
): number =>
  cave === undefined
    ? 0
    : 1 -
      smoothStep(
        caveInnerRadius - 0.6,
        lanternReach,
        Math.hypot(point.x - cave.centre.x, point.z - cave.centre.z),
      );

export const isInsideCave = (
  cave: PlacedWonder | undefined,
  point: MapPoint,
): boolean =>
  cave !== undefined &&
  Math.hypot(point.x - cave.centre.x, point.z - cave.centre.z) <
    caveInnerRadius - 0.4;

const placeGeometry = (
  geometry: BufferGeometry,
  { centre, ground, turn }: PlacedWonder,
  lift = 0,
): BufferGeometry =>
  geometry.rotateY(turn).translate(centre.x, ground + lift, centre.z);

const rock = (
  size: Triple,
  position: Triple,
  colour: string,
  roughen = 0.35,
): ModelPart => ({
  geometry: new IcosahedronGeometry(1, 2),
  colour,
  position,
  scale: size,
  roughen,
});

const buildFallsRockParts = (): ModelPart[] => {
  const cliff = "#5b6b5a";
  const darkCliff = "#465446";
  const moss = "#3f7d3a";
  const wall: ModelPart[] = Array.from({ length: 7 }, (_, index) => {
    const x = (index - 3) * 2;
    return rock(
      [1.7, 5.4 + (index % 2) * 0.4, 2.4],
      [x, 4.4, fallsWallFront - 2],
      index % 2 === 0 ? cliff : darkCliff,
    );
  });
  const lip: ModelPart[] = [
    {
      geometry: new BoxGeometry(14, 1.6, 5.4, 14, 2, 6),
      colour: cliff,
      position: [0, fallsLipHeight - 0.7, fallsLipFront - 2.7],
      roughen: 0.06,
    },
    ...Array.from({ length: 9 }, (_, index): ModelPart => ({
      geometry: new ConeGeometry(0.22, 0.9, 6),
      colour: moss,
      position: [
        (index - 4) * 1.5 + (index % 2) * 0.3,
        fallsLipHeight - 1.75,
        fallsLipFront - 0.15,
      ],
      rotation: [Math.PI, 0, 0],
    })),
  ];
  const buttresses = [1, -1].flatMap((side): ModelPart[] => [
    rock([1.6, 4.6, 3.4], [side * 6.7, 4.2, -3.6], darkCliff),
    rock([1.4, 3.4, 1.6], [side * 6.4, 2.6, -0.6], cliff),
    rock([1.2, 2.2, 1.2], [side * 7.6, 7.8, -4.4], cliff, 0.3),
  ]);
  const rims = Array.from({ length: 11 }, (_, index): ModelPart => {
    const angle = (index / 10) * Math.PI - Math.PI / 2;
    return rock(
      [0.7, 0.45, 0.6],
      [
        Math.sin(angle) * fallsPoolRadius,
        0.1,
        Math.cos(angle) * fallsPoolRadius * 0.95 + 0.3,
      ],
      index % 2 === 0 ? "#8a8f86" : "#737a70",
      0.4,
    );
  });
  const steppingStones = [-2.8, -1.4, 0, 1.4, 2.8].map(
    (x, index): ModelPart => ({
      geometry: new CylinderGeometry(0.55, 0.62, 0.22, 10),
      colour: index % 2 === 0 ? "#a1a39a" : "#8d9087",
      position: [x, 0.05, fallsBehindSpot.z + (index % 2) * 0.25],
    }),
  );
  const ferns = [-4.6, -3.8, 3.9, 4.7, -5.2, 5.3].map(
    (x, index): ModelPart => ({
      geometry: new ConeGeometry(0.5, 1.1, 7),
      colour: index % 2 === 0 ? "#2f7d32" : "#3f9142",
      position: [x, 0.5, 2.4 + (index % 3) * 0.6],
      roughen: 0.3,
    }),
  );
  const topTrees = [-5, -2.5, 3, 5.5].flatMap((x, index): ModelPart[] => [
    {
      geometry: new CylinderGeometry(0.12, 0.18, 1.6, 6),
      colour: "#5b3a22",
      position: [x, fallsLipHeight + 0.8, -4.6 - (index % 2)],
    },
    {
      geometry: new IcosahedronGeometry(0.9, 1),
      colour: index % 2 === 0 ? "#2e7d32" : "#3b8f3e",
      position: [x, fallsLipHeight + 2, -4.6 - (index % 2)],
      roughen: 0.3,
    },
  ]);
  return [
    ...wall,
    ...lip,
    ...buttresses,
    ...rims,
    ...steppingStones,
    ...ferns,
    ...topTrees,
  ];
};

const fallsColumns = 18;
const fallsRows = 28;

export const buildFallsWaterGeometry = (
  wonder: PlacedWonder,
): BufferGeometry => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const addSheet = (
    columns: number,
    rows: number,
    place: (across: number, along: number) => Triple,
    alongFrom: number,
    alongTo: number,
  ) => {
    const first = positions.length / 3;
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const across = column / columns;
        const along = row / rows;
        positions.push(...place(across, along));
        uvs.push(across, alongFrom + (alongTo - alongFrom) * along);
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const corner = first + row * (columns + 1) + column;
        const below = corner + columns + 1;
        indices.push(corner, below, corner + 1, corner + 1, below, below + 1);
      }
    }
  };
  addSheet(
    fallsColumns,
    8,
    (across, along) => [
      (across * 2 - 1) * (fallsSheetHalfWidth - 0.4),
      fallsLipHeight + 0.12,
      fallsLipFront - 4.6 + along * 4.6,
    ],
    0,
    0.15,
  );
  addSheet(
    fallsColumns,
    fallsRows,
    (across, along) => {
      const spread = 1 + along * 0.18;
      return [
        (across * 2 - 1) * fallsSheetHalfWidth * spread,
        fallsLipHeight + 0.1 - (fallsLipHeight - 0.05) * along,
        fallsLipFront +
          0.2 +
          1.2 * along * along +
          Math.sin(across * 9 + along * 4) * 0.05,
      ];
    },
    0.15,
    1,
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return placeGeometry(geometry, wonder);
};

export const buildFallsPoolGeometry = (wonder: PlacedWonder): BufferGeometry =>
  placeGeometry(
    new CylinderGeometry(
      fallsPoolRadius,
      fallsPoolRadius,
      0.1,
      40,
      1,
      false,
      -Math.PI / 2,
      Math.PI,
    ).translate(0, 0.08, 0.3),
    wonder,
  );

const buildCaveShellGeometry = (): BufferGeometry => {
  const outerRock = "#3b302b";
  const innerRock = "#1c1714";
  const shell = buildModelGeometry([
    {
      geometry: new SphereGeometry(
        1,
        40,
        18,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.62,
      ),
      colour: outerRock,
      scale: [caveOuterRadius, caveOuterHeight, caveOuterRadius],
      roughen: 0.12,
    },
    {
      geometry: new SphereGeometry(
        1,
        40,
        18,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.62,
      ),
      colour: innerRock,
      scale: [-caveInnerRadius, caveInnerHeight, caveInnerRadius],
      roughen: 0.08,
    },
  ]);
  const positions = shell.getAttribute("position");
  const keep: number[] = [];
  for (let corner = 0; corner < positions.count; corner += 3) {
    const x =
      (positions.getX(corner) +
        positions.getX(corner + 1) +
        positions.getX(corner + 2)) /
      3;
    const y =
      (positions.getY(corner) +
        positions.getY(corner + 1) +
        positions.getY(corner + 2)) /
      3;
    const z =
      (positions.getZ(corner) +
        positions.getZ(corner + 1) +
        positions.getZ(corner + 2)) /
      3;
    const isDoorway =
      z > 0 &&
      Math.hypot(x / caveDoorHalfWidth, Math.max(0, y - caveDoorAxis) / 1.25) <
        1;
    if (!isDoorway) {
      keep.push(corner, corner + 1, corner + 2);
    }
  }
  const trimmed = new BufferGeometry();
  ["position", "normal", "color"].forEach((name) => {
    const attribute = shell.getAttribute(name);
    const values = new Float32Array(keep.length * attribute.itemSize);
    keep.forEach((vertex, index) => {
      for (let item = 0; item < attribute.itemSize; item++) {
        values[index * attribute.itemSize + item] = attribute.getComponent(
          vertex,
          item,
        );
      }
    });
    trimmed.setAttribute(name, new BufferAttribute(values, attribute.itemSize));
  });
  shell.dispose();
  return trimmed;
};

const buildCaveDetailGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(
        caveDoorHalfWidth,
        caveDoorHalfWidth,
        caveOuterRadius - caveInnerRadius + 1.4,
        20,
        1,
        true,
        -Math.PI / 2,
        Math.PI,
      ),
      colour: "#211a17",
      position: [0, caveDoorAxis, (caveOuterRadius + caveInnerRadius) / 2],
      rotation: [Math.PI / 2, 0, 0],
      scale: [-1, 1, 1],
    },
    {
      geometry: new TorusGeometry(
        caveDoorHalfWidth + 0.25,
        0.32,
        8,
        20,
        Math.PI,
      ),
      colour: "#57463c",
      position: [0, caveDoorAxis, caveOuterRadius + 0.3],
      roughen: 0.25,
    },
    ...[1, -1].map((side): ModelPart => ({
      geometry: new BoxGeometry(0.6, caveDoorAxis + 0.2, 0.7),
      colour: "#57463c",
      position: [
        side * (caveDoorHalfWidth + 0.25),
        (caveDoorAxis - 0.2) / 2,
        caveOuterRadius + 0.3,
      ],
      roughen: 0.2,
    })),
    ...Array.from({ length: 14 }, (_, index): ModelPart => {
      const angle = index * 2.4;
      const reach = 1.2 + (index % 5) * 0.8;
      return {
        geometry: new ConeGeometry(
          0.16 + (index % 3) * 0.05,
          0.7 + (index % 4) * 0.3,
          6,
        ),
        colour: index % 2 === 0 ? "#2a221e" : "#352b26",
        position: [
          Math.sin(angle) * reach,
          caveInnerHeight *
            Math.sqrt(Math.max(0, 1 - (reach / caveInnerRadius) ** 2)) -
            0.4,
          Math.cos(angle) * reach * 0.9 - 0.4,
        ],
        rotation: [Math.PI, 0, 0],
      };
    }),
    ...Array.from({ length: 9 }, (_, index): ModelPart => {
      const angle = Math.PI * 0.35 + index * 0.62;
      return rock(
        [0.55, 0.4 + (index % 3) * 0.2, 0.5],
        [
          Math.sin(angle) * (caveInnerRadius - 1),
          0.15,
          Math.cos(angle) * (caveInnerRadius - 1),
        ],
        "#2d2420",
        0.4,
      );
    }),
    {
      geometry: new BoxGeometry(1, 0.6, 0.65),
      colour: "#7c4a1e",
      position: [0, 0.3, -caveInnerRadius + 1.6],
    },
    {
      geometry: new CylinderGeometry(0.33, 0.33, 1, 12, 1, false, 0, Math.PI),
      colour: "#8b5a2b",
      position: [0, 0.6, -caveInnerRadius + 1.6],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new BoxGeometry(1.05, 0.12, 0.7),
      colour: "#facc15",
      position: [0, 0.62, -caveInnerRadius + 1.6],
    },
  ]);

export const buildCaveGlowGeometry = (wonder: PlacedWonder): BufferGeometry =>
  placeGeometry(
    buildModelGeometry(
      Array.from({ length: 11 }, (_, index): ModelPart => {
        const angle = Math.PI * 0.55 + index * 0.48;
        const reach = caveInnerRadius - 0.7 - (index % 2) * 0.3;
        return {
          geometry: new OctahedronGeometry(0.28 + (index % 3) * 0.08, 0),
          colour: ["#fb923c", "#fbbf24", "#f87171"][index % 3],
          position: [
            Math.sin(angle) * reach,
            0.4 + (index % 4) * 0.5,
            Math.cos(angle) * reach,
          ],
          rotation: [0.3 * (index % 3), index, 0.2],
          scale: [0.7, 1.8, 0.7],
        };
      }),
    ),
    wonder,
  );

const buildWindmillTowerParts = (): ModelPart[] => [
  {
    geometry: new CylinderGeometry(1.05, 1.6, 7, 16),
    colour: "#f1ede4",
    position: [0, 3.5, 0],
  },
  {
    geometry: new ConeGeometry(1.4, 1.8, 16),
    colour: "#7f1d1d",
    position: [0, 7.9, 0],
  },
  {
    geometry: new TorusGeometry(1.35, 0.08, 6, 24),
    colour: "#5b3a22",
    position: [0, 4.3, 0],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: new BoxGeometry(0.8, 1.4, 0.1),
    colour: "#5b3a22",
    position: [0, 0.7, 1.52],
  },
  ...[2.6, 5].map((y): ModelPart => ({
    geometry: new BoxGeometry(0.45, 0.6, 0.08),
    colour: "#1e3a8a",
    position: [0, y, 1.6 - (y / 7) * 0.55 + 0.02],
  })),
  {
    geometry: new CylinderGeometry(0.22, 0.22, 0.9, 10),
    colour: "#3f3f46",
    position: [0, 6.6, 1.2],
    rotation: [Math.PI / 2, 0, 0],
  },
];

export const windmillHub: Triple = [0, 6.6, 1.7];

export const buildWindmillSailsGeometry = (): BufferGeometry =>
  buildModelGeometry(
    [0, 1, 2, 3]
      .flatMap((sail): ModelPart[] => {
        const angle = (sail * Math.PI) / 2;
        const along = (reach: number, depth = 0): Triple => [
          Math.sin(angle) * reach,
          Math.cos(angle) * reach,
          depth,
        ];
        return [
          {
            geometry: new BoxGeometry(0.16, 4.6, 0.12),
            colour: "#5b3a22",
            position: along(2.4),
            rotation: [0, 0, -angle],
          },
          {
            geometry: new BoxGeometry(1.1, 3.6, 0.04),
            colour: sail % 2 === 0 ? "#fafaf9" : "#e7e5e4",
            position: along(2.8, -0.05),
            rotation: [0, 0, -angle],
          },
          ...[1.4, 2.4, 3.4, 4.3].map((reach): ModelPart => ({
            geometry: new BoxGeometry(1.2, 0.07, 0.06),
            colour: "#78350f",
            position: along(reach, 0.04),
            rotation: [0, 0, -angle],
          })),
        ];
      })
      .concat([
        {
          geometry: new SphereGeometry(0.32, 10, 8),
          colour: "#3f3f46",
        },
      ]),
  );

const buildStoneCircleParts = (): ModelPart[] => {
  const stones = Array.from({ length: 10 }, (_, index): ModelPart => {
    const angle = (index / 10) * Math.PI * 2;
    const height = 2.6 + (index % 3) * 0.35;
    return {
      geometry: new BoxGeometry(1, height, 0.6, 2, 4, 2),
      colour: index % 2 === 0 ? "#9ca3af" : "#8b9099",
      position: [
        Math.sin(angle) * 4.4,
        height / 2 - 0.3,
        Math.cos(angle) * 4.4,
      ],
      rotation: [0, angle, (index % 2) * 0.04],
      roughen: 0.12,
    };
  });
  const lintels = [0, 4, 7].map((index): ModelPart => {
    const angle = ((index + 0.5) / 10) * Math.PI * 2;
    return {
      geometry: new BoxGeometry(2.9, 0.5, 0.7, 4, 1, 2),
      colour: "#a3a8b0",
      position: [Math.sin(angle) * 4.3, 2.75, Math.cos(angle) * 4.3],
      rotation: [0, angle + Math.PI / 2, 0],
      roughen: 0.08,
    };
  });
  return [
    ...stones,
    ...lintels,
    {
      geometry: new BoxGeometry(1.8, 0.7, 1, 3, 1, 2),
      colour: "#6b7280",
      position: [0, 0.2, 0],
      roughen: 0.1,
    },
    ...[0.6, -0.5].map((x): ModelPart => ({
      geometry: new SphereGeometry(0.12, 6, 4),
      colour: "#f472b6",
      position: [x, 0.62, 0.1],
    })),
  ];
};

const buildSnowmanParts = (
  scale: number,
  x: number,
  z: number,
  scarf: string,
): ModelPart[] => {
  const place = (y: number, dz = 0): Triple => [x, y * scale, z + dz * scale];
  return [
    {
      geometry: new SphereGeometry(1, 18, 12),
      colour: "#f8fafc",
      position: place(0.9),
      scale: scale,
      isSmooth: true,
    },
    {
      geometry: new SphereGeometry(0.72, 18, 12),
      colour: "#f8fafc",
      position: place(2.2),
      scale: scale,
      isSmooth: true,
    },
    {
      geometry: new SphereGeometry(0.5, 16, 10),
      colour: "#ffffff",
      position: place(3.2),
      scale: scale,
      isSmooth: true,
    },
    {
      geometry: new ConeGeometry(0.09, 0.55, 8),
      colour: "#f97316",
      position: place(3.2, 0.72),
      rotation: [Math.PI / 2, 0, 0],
      scale,
    },
    ...[-0.17, 0.17].map((eye): ModelPart => ({
      geometry: new SphereGeometry(0.06, 6, 4),
      colour: "#111827",
      position: [x + eye * scale, 3.33 * scale, z + 0.43 * scale],
      scale,
    })),
    ...[2.4, 2.1, 1.8].map((y): ModelPart => ({
      geometry: new SphereGeometry(0.07, 6, 4),
      colour: "#111827",
      position: place(y, 0.7),
      scale,
    })),
    {
      geometry: new TorusGeometry(0.45, 0.1, 6, 18),
      colour: scarf,
      position: place(2.78),
      rotation: [Math.PI / 2, 0, 0],
      scale,
    },
    {
      geometry: new BoxGeometry(0.16, 0.6, 0.06),
      colour: scarf,
      position: place(2.5, 0.42),
      rotation: [0.2, 0, 0.15],
      scale,
    },
    {
      geometry: new CylinderGeometry(0.42, 0.42, 0.06, 16),
      colour: "#1f2937",
      position: place(3.62),
      scale,
    },
    {
      geometry: new CylinderGeometry(0.3, 0.3, 0.5, 16),
      colour: "#1f2937",
      position: place(3.9),
      scale,
    },
    ...[1, -1].map((side): ModelPart => ({
      geometry: new CylinderGeometry(0.04, 0.05, 1.3, 5),
      colour: "#5b3a22",
      position: [x + side * 1.15 * scale, 2.45 * scale, z],
      rotation: [0, 0, side * 1.0],
      scale,
    })),
  ];
};

const buildSnowmanFamilyParts = (): ModelPart[] => [
  ...buildSnowmanParts(1, -1.8, 0, "#dc2626"),
  ...buildSnowmanParts(0.82, 1.5, 0.4, "#2563eb"),
  ...buildSnowmanParts(0.55, 0, 1.6, "#16a34a"),
  ...[-3.5, 3.4, 0.5].map((x, index): ModelPart => ({
    geometry: new SphereGeometry(
      1.1 + index * 0.2,
      14,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    colour: "#eef6fc",
    position: [x, -0.1, -1.6 + index * 0.4],
    scale: [1.4, 0.45, 1],
  })),
];

const buildPyramidParts = (): ModelPart[] => [
  ...Array.from({ length: 6 }, (_, tier): ModelPart => {
    const width = 11 - tier * 1.8;
    return {
      geometry: new BoxGeometry(width, 1.05, width),
      colour: tier % 2 === 0 ? "#d9b46a" : "#cfa95e",
      position: [0, tier * 1.05 + 0.5, 0],
    };
  }),
  {
    geometry: new ConeGeometry(1.2, 1.4, 4),
    colour: "#facc15",
    position: [0, 7, 0],
    rotation: [0, Math.PI / 4, 0],
  },
  {
    geometry: new BoxGeometry(1.4, 2, 0.4),
    colour: "#3b2f20",
    position: [0, 1, 5.4],
  },
  {
    geometry: new BoxGeometry(1.2, 0.6, 2.4),
    colour: "#c79f55",
    position: [0, 0.2, 6.6],
  },
  ...[1, -1].flatMap((side): ModelPart[] => [
    {
      geometry: new BoxGeometry(0.7, 4.6, 0.7),
      colour: "#e2c27c",
      position: [side * 3, 2.3, 8],
    },
    {
      geometry: new ConeGeometry(0.5, 0.8, 4),
      colour: "#facc15",
      position: [side * 3, 5, 8],
      rotation: [0, Math.PI / 4, 0],
    },
  ]),
];

const buildMushroomParts = ({
  cap,
  spots,
  stem,
}: WonderTheme["mushroom"]): ModelPart[] =>
  [
    { x: 0, z: 0, size: 1.5 },
    { x: 2.4, z: 1, size: 1 },
    { x: -2.1, z: 1.3, size: 0.85 },
    { x: 1, z: -2.2, size: 0.7 },
    { x: -1.4, z: -1.6, size: 1.15 },
    { x: 3.2, z: -1.4, size: 0.5 },
  ].flatMap(({ x, z, size }, index): ModelPart[] => {
    const height = 2.6 * size;
    const capRadius = 1.6 * size;
    return [
      {
        geometry: new CylinderGeometry(0.28 * size, 0.42 * size, height, 12),
        colour: stem,
        position: [x, height / 2, z],
        rotation: [0, 0, (index % 3) * 0.05 - 0.05],
      },
      {
        geometry: new SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        colour: cap,
        position: [x, height - 0.1 * size, z],
        scale: [capRadius, capRadius * 0.62, capRadius],
        isSmooth: true,
      },
      ...Array.from({ length: 6 }, (_, spot): ModelPart => {
        const angle = spot * 1.05 + index;
        const reach = capRadius * (spot === 0 ? 0 : 0.62);
        const rise = Math.sqrt(Math.max(0, 1 - (reach / capRadius) ** 2));
        return {
          geometry: new SphereGeometry(0.2 * size, 8, 6),
          colour: spots,
          position: [
            x + Math.sin(angle) * reach,
            height - 0.1 * size + capRadius * 0.62 * rise,
            z + Math.cos(angle) * reach,
          ],
          scale: [1, 0.35, 1],
        };
      }),
    ];
  });

const buildCrystalArchParts = (): ModelPart[] => {
  const colours = ["#a78bfa", "#67e8f9", "#c084fc", "#818cf8"];
  const arch = Array.from({ length: 15 }, (_, index): ModelPart => {
    const angle = (index / 14) * Math.PI;
    return {
      geometry: new OctahedronGeometry(0.7, 0),
      colour: colours[index % colours.length],
      position: [Math.cos(angle) * 4, Math.sin(angle) * 4.6 + 0.3, 0],
      rotation: [0, index * 0.7, angle - Math.PI / 2],
      scale: [0.9, 1.7 + (index % 3) * 0.3, 0.9],
    };
  });
  const clusters = [1, -1].flatMap((side) =>
    Array.from({ length: 5 }, (_, index): ModelPart => ({
      geometry: new OctahedronGeometry(0.45, 0),
      colour: colours[(index + 2) % colours.length],
      position: [side * (4.6 + (index % 2) * 0.6), 0.5, (index - 2) * 0.6],
      rotation: [index * 0.3, 0, side * 0.3],
      scale: [0.8, 2 + (index % 3) * 0.4, 0.8],
    })),
  );
  return [...arch, ...clusters];
};

const buildBalloonEnvelope = ([
  first,
  second,
]: WonderTheme["balloon"]): BufferGeometry => {
  const profile = Array.from({ length: 22 }, (_, index) => {
    const share = index / 21;
    const angle = share * Math.PI;
    const radius =
      Math.sin(angle) ** 0.85 * 3.2 * (1 - 0.55 * (1 - share) ** 3);
    return new Vector2(Math.max(0.35, radius), 3.6 - Math.cos(angle) * 3.6);
  });
  const lathe = new LatheGeometry(profile, 24).toNonIndexed();
  const positions = lathe.getAttribute("position");
  const colours = new Float32Array(positions.count * 3);
  const firstColour = new Color(first);
  const secondColour = new Color(second);
  for (let corner = 0; corner < positions.count; corner += 3) {
    const x =
      positions.getX(corner) +
      positions.getX(corner + 1) +
      positions.getX(corner + 2);
    const z =
      positions.getZ(corner) +
      positions.getZ(corner + 1) +
      positions.getZ(corner + 2);
    const gore = Math.floor(
      ((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 12,
    );
    const colour = gore % 2 === 0 ? firstColour : secondColour;
    for (let vertex = corner; vertex < corner + 3; vertex++) {
      colour.toArray(colours, vertex * 3);
    }
  }
  lathe.setAttribute("color", new BufferAttribute(colours, 3));
  lathe.deleteAttribute("uv");
  return lathe.translate(0, 2.2, 0);
};

export const buildBalloonGeometry = (theme: WonderTheme): BufferGeometry =>
  mergeGeometries([
    buildBalloonEnvelope(theme.balloon),
    buildModelGeometry([
      {
        geometry: new CylinderGeometry(0.75, 0.65, 0.9, 12),
        colour: "#92400e",
        position: [0, -0.45, 0],
      },
      {
        geometry: new TorusGeometry(0.75, 0.07, 6, 16),
        colour: "#78350f",
        position: [0, 0, 0],
        rotation: [Math.PI / 2, 0, 0],
      },
      ...[0, 1, 2, 3].map((rope): ModelPart => {
        const angle = (rope * Math.PI) / 2 + Math.PI / 4;
        return {
          geometry: new CylinderGeometry(0.025, 0.025, 2.3, 4),
          colour: "#44403c",
          position: [Math.cos(angle) * 0.62, 1.1, Math.sin(angle) * 0.62],
          rotation: [Math.sin(angle) * -0.08, 0, Math.cos(angle) * 0.08],
        };
      }),
      {
        geometry: new ConeGeometry(0.22, 0.6, 8),
        colour: "#fbbf24",
        position: [0, 1.4, 0],
      },
    ]),
  ]);

export const balloonHover = 13;

const buildStaticParts = (
  kind: WonderKind,
  theme: WonderTheme,
): ModelPart[] => {
  if (kind === "windmill") {
    return buildWindmillTowerParts();
  }
  if (kind === "stone-circle") {
    return buildStoneCircleParts();
  }
  if (kind === "snowman-family") {
    return buildSnowmanFamilyParts();
  }
  if (kind === "pyramid") {
    return buildPyramidParts();
  }
  if (kind === "walk-behind-falls") {
    return buildFallsRockParts();
  }
  if (kind === "giant-mushrooms") {
    return buildMushroomParts(theme.mushroom);
  }
  if (kind === "lantern-cave") {
    return [];
  }
  if (kind === "crystal-arch") {
    return buildCrystalArchParts();
  }
  return [];
};

export const buildWondersGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const theme = findWonderTheme(adventure.islandId);
  const pieces = placeIslandWonders(adventure).flatMap((wonder) => {
    const parts = buildStaticParts(wonder.kind, theme);
    const built =
      parts.length === 0
        ? []
        : [placeGeometry(buildModelGeometry(parts), wonder)];
    if (wonder.kind === "lantern-cave") {
      return [
        ...built,
        placeGeometry(buildCaveShellGeometry(), wonder, -0.05),
        placeGeometry(buildCaveDetailGeometry(), wonder),
      ];
    }
    return built;
  });
  return pieces.length === 0 ? new BufferGeometry() : mergeGeometries(pieces);
};

const buildOakGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.28, 0.45, 3.2, 7),
      colour: "#5b3a22",
      position: [0, 1.6, 0],
    },
    {
      geometry: new IcosahedronGeometry(2.2, 1),
      colour: "#3f8a3a",
      position: [0, 4.4, 0],
      roughen: 0.3,
    },
    {
      geometry: new IcosahedronGeometry(1.5, 1),
      colour: "#4d9a43",
      position: [1.3, 3.8, 0.4],
      roughen: 0.3,
    },
  ]);

const buildPineGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.22, 0.4, 2, 6),
      colour: "#4a3324",
      position: [0, 1, 0],
    },
    ...[0, 1, 2].flatMap((tier): ModelPart[] => [
      {
        geometry: new ConeGeometry(2.4 - tier * 0.6, 2.6, 8),
        colour: ["#1f4a37", "#25543e", "#2c6046"][tier],
        position: [0, 2.4 + tier * 1.6, 0],
        roughen: 0.15,
      },
      {
        geometry: new ConeGeometry(1.6 - tier * 0.45, 0.9, 8),
        colour: "#f5f9fd",
        position: [0, 3.3 + tier * 1.6, 0],
      },
    ]),
  ]);

const buildPalmGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 4 }, (_, segment): ModelPart => ({
      geometry: new CylinderGeometry(0.22, 0.3, 1.55, 6, 1, true),
      colour: segment % 2 === 0 ? "#8b6b47" : "#7a5c3c",
      position: [segment * segment * 0.06, 0.75 + segment * 1.45, 0],
      rotation: [0, 0, -segment * 0.07],
    })),
    ...Array.from({ length: 6 }, (_, frond): ModelPart => {
      const angle = (frond / 6) * Math.PI * 2;
      return {
        geometry: new BoxGeometry(0.75, 0.06, 3),
        colour: frond % 2 === 0 ? "#3f8f3a" : "#2f7a2f",
        position: [0.55 + Math.sin(angle) * 1.3, 6, Math.cos(angle) * 1.3],
        rotation: [0.45, angle, 0],
      };
    }),
    ...[0, 3].map((nut): ModelPart => ({
      geometry: new IcosahedronGeometry(0.2, 0),
      colour: "#6b4423",
      position: [0.55 + Math.sin(nut) * 0.3, 5.8, Math.cos(nut) * 0.3],
    })),
  ]);

const buildKapokGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.35, 0.6, 7, 7),
      colour: "#6b4f35",
      position: [0, 3.5, 0],
    },
    ...[0, 1, 2].map((root): ModelPart => ({
      geometry: new BoxGeometry(0.15, 1.6, 1.2),
      colour: "#5f452e",
      position: [Math.sin(root * 2.1) * 0.55, 0.7, Math.cos(root * 2.1) * 0.55],
      rotation: [0, root * 2.1, 0],
    })),
    {
      geometry: new SphereGeometry(3, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      colour: "#2d7a2f",
      position: [0, 7, 0],
      scale: [1, 0.55, 1],
      roughen: 0.15,
    },
    {
      geometry: new IcosahedronGeometry(1.6, 0),
      colour: "#3b8f3e",
      position: [1.2, 7.6, 0.6],
      roughen: 0.3,
    },
    {
      geometry: new CylinderGeometry(0.04, 0.04, 4, 3, 1, true),
      colour: "#4d7c0f",
      position: [2.2, 5.2, 0.4],
    },
  ]);

const buildEmberTreeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.22, 0.4, 3.4, 6),
      colour: "#292524",
      position: [0, 1.7, 0],
    },
    {
      geometry: new CylinderGeometry(0.08, 0.14, 1.6, 4, 1, true),
      colour: "#292524",
      position: [0.6, 3.3, 0],
      rotation: [0, 0, -0.7],
    },
    {
      geometry: new IcosahedronGeometry(1.6, 1),
      colour: "#ea580c",
      position: [0, 4.4, 0],
      roughen: 0.35,
    },
    {
      geometry: new IcosahedronGeometry(1.1, 0),
      colour: "#f59e0b",
      position: [1.1, 4, 0.3],
      roughen: 0.35,
    },
    {
      geometry: new IcosahedronGeometry(1, 0),
      colour: "#b91c1c",
      position: [-1, 4.1, -0.3],
      roughen: 0.35,
    },
  ]);

const buildCrystalTreeGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.2, 0.36, 3.2, 6),
      colour: "#4c1d95",
      position: [0, 1.6, 0],
    },
    ...Array.from({ length: 6 }, (_, index): ModelPart => {
      const angle = index * 1.05;
      return {
        geometry: new OctahedronGeometry(0.75, 0),
        colour: ["#a78bfa", "#67e8f9", "#f0abfc"][index % 3],
        position: [
          Math.sin(angle) * 1.1,
          3.8 + (index % 2) * 0.8,
          Math.cos(angle) * 1.1,
        ],
        scale: [0.8, 1.6, 0.8],
        rotation: [0.3, angle, 0.2],
      };
    }),
    {
      geometry: new OctahedronGeometry(0.9, 0),
      colour: "#c4b5fd",
      position: [0, 5, 0],
      scale: [0.8, 1.8, 0.8],
    },
  ]);

export const groveBuilders: Record<GroveLook, () => BufferGeometry> = {
  oak: buildOakGeometry,
  pine: buildPineGeometry,
  palm: buildPalmGeometry,
  kapok: buildKapokGeometry,
  ember: buildEmberTreeGeometry,
  crystal: buildCrystalTreeGeometry,
};

export const buildFlowerGeometry = ([
  first,
  second,
  third,
]: WonderTheme["flowers"]): BufferGeometry =>
  buildModelGeometry(
    [
      { x: 0, z: 0, colour: first, height: 0.55 },
      { x: 0.32, z: 0.18, colour: second, height: 0.42 },
      { x: -0.25, z: 0.26, colour: third, height: 0.48 },
    ].flatMap(({ x, z, colour, height }): ModelPart[] => [
      {
        geometry: new CylinderGeometry(0.025, 0.03, height, 3, 1, true),
        colour: "#3f7d3a",
        position: [x, height / 2, z],
      },
      {
        geometry: new OctahedronGeometry(0.14, 0),
        colour,
        position: [x, height + 0.03, z],
        scale: [1, 0.5, 1],
      },
    ]),
  );

const buildRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const islandSeeds: Record<string, number> = {
  "meadow-isle": 11,
  "frost-isle": 23,
  "sunscorch-sands": 37,
  "jungle-reach": 41,
  "ember-isle": 53,
  "starfall-isle": 67,
};

const groveLowest = 0.45 * exploreScale;
const groveHighest = 3.8 * exploreScale;

const buildSceneryClearance = (
  adventure: IslandAdventure,
  wonderClearance: number,
): ((point: MapPoint) => boolean) => {
  const isNearPlace = buildPlaceGrid(
    [
      ...listAdventurePlaces(adventure),
      ...listTransportPlaces(adventure.islandId).map(({ x, z, reach }) => ({
        x: x * exploreScale,
        z: z * exploreScale,
        reach: reach === undefined ? undefined : reach * exploreScale,
      })),
    ],
    1.4 * exploreScale,
  );
  const sights = [
    ...(islands.find(({ id }) => id === adventure.islandId)?.regions ?? []).map(
      ({ mapPosition }) => ({ centre: mapPosition, reach: 3 }),
    ),
    ...(landforms.get(adventure.islandId)?.features ?? []).map(
      ({ position }) => ({ centre: position, reach: 2.2 }),
    ),
    ...listIslandWonders(adventure.islandId).map(({ kind, position }) => ({
      centre: position,
      reach: wonderFootprints[kind] + wonderClearance,
    })),
    ...(attractionSites[adventure.islandId] ?? []).map(
      ({ centre, footprint }) => ({
        centre: { x: centre.x / exploreScale, z: centre.z / exploreScale },
        reach: footprint / exploreScale + wonderClearance * 0.6,
      }),
    ),
  ];
  const newLands = findNewLands(adventure.islandId);
  const mapAdventure = findIslandAdventure(adventure.islandId);
  return (point) => {
    const mapPoint = { x: point.x / exploreScale, z: point.z / exploreScale };
    if (
      Math.abs(mapPoint.x) <= 34 ||
      !isInsideFirstLands(point) ||
      sights.some(
        ({ centre, reach }) =>
          Math.hypot(centre.x - mapPoint.x, centre.z - mapPoint.z) <= reach,
      ) ||
      isNearPlace(point)
    ) {
      return false;
    }
    const height = adventure.findHeight(point);
    return (
      height >= groveLowest &&
      height <= groveHighest &&
      findDistanceToNewLandRivers(mapPoint, newLands) > 0.9 &&
      adventure.findCourseKind(point) === undefined &&
      isClearOfTrailsAndAirfield(mapAdventure, mapPoint)
    );
  };
};

const scatterWonderScenery = (
  adventure: IslandAdventure,
  count: number,
  seed: number,
  wonderClearance: number,
  scale: [number, number],
): ScatteredThing[] => {
  const random = buildRandom(seed);
  const isClear = buildSceneryClearance(adventure, wonderClearance);
  const scattered: ScatteredThing[] = [];
  for (
    let attempt = 0;
    attempt < count * 30 && scattered.length < count;
    attempt++
  ) {
    const side = random() < 0.5 ? -1 : 1;
    const point = {
      x: side * (34 + random() * 42) * exploreScale,
      z: (random() * 40 - 20) * exploreScale,
    };
    if (isClear(point)) {
      scattered.push({
        ...point,
        height: adventure.findHeight(point),
        scale: scale[0] + random() * (scale[1] - scale[0]),
        turn: random() * Math.PI * 2,
      });
    }
  }
  return scattered;
};

/** How far each tree of a Wonder grove is sunk into the ground. */
export const groveSink = 0.2;

export const scatterGrove = (adventure: IslandAdventure): ScatteredThing[] =>
  scatterWonderScenery(
    adventure,
    findWonderTheme(adventure.islandId).groveCount,
    islandSeeds[adventure.islandId] ?? 7,
    1.4,
    [0.75, 1.25],
  );

export const scatterFlowers = (adventure: IslandAdventure): ScatteredThing[] =>
  scatterWonderScenery(
    adventure,
    160,
    (islandSeeds[adventure.islandId] ?? 7) + 1000,
    0.6,
    [1.4, 2.4],
  );
