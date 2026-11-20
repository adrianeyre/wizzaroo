import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
  type MeshBasicMaterial,
} from "three";
import {
  landUses,
  settlementSizes,
  type GeographyShowOf,
  type LandUse,
  type SettlementSize,
  type SettlementTile,
  type UrbanZone,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  findPulse,
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import { buildBroadleafParts, findScatter } from "./miniature-parts.js";

const boardHalf = 1.55;
const boardTop = -1.2;
const mostHouses = 90;

interface HouseSpot {
  x: number;
  z: number;
  size: number;
  turn: number;
}

interface TileLayout {
  houses: HouseSpot[];
  parts: ModelPart[];
}

const box = (
  size: Triple,
  colour: string,
  at: Triple,
  turn = 0,
): ModelPart => ({
  geometry: new BoxGeometry(...size),
  colour,
  position: [at[0], boardTop + at[1] + size[1] / 2, at[2]],
  rotation: [0, turn, 0],
});

const buildChurchParts = (x: number, z: number, scale = 1): ModelPart[] => [
  box([0.16 * scale, 0.14 * scale, 0.3 * scale], "#d8d2c4", [x, 0, z]),
  box([0.1 * scale, 0.28 * scale, 0.1 * scale], "#cfc8b8", [
    x,
    0,
    z - 0.17 * scale,
  ]),
  {
    geometry: new ConeGeometry(0.07 * scale, 0.24 * scale, 4),
    colour: "#5b6270",
    position: [x, boardTop + 0.4 * scale, z - 0.17 * scale],
    rotation: [0, Math.PI / 4, 0],
  },
];

const buildFieldParts = (
  centreX: number,
  centreZ: number,
  across: number,
  deep: number,
): ModelPart[] =>
  [0, 1, 2, 3].map((patch) =>
    box(
      [across / 2 - 0.02, 0.02, deep / 2 - 0.02],
      ["#9cc95a", "#d9c65a", "#7fb34a", "#b9d36b"][patch],
      [
        centreX + ((patch % 2) - 0.5) * (across / 2),
        0,
        centreZ + (Math.floor(patch / 2) - 0.5) * (deep / 2),
      ],
    ),
  );

const buildTreeParts = (x: number, z: number, height = 0.28): ModelPart[] =>
  buildBroadleafParts([x, boardTop, z], height);

const buildTowerParts = (x: number, z: number, height: number): ModelPart[] => [
  box(
    [0.2, height, 0.2],
    findScatter(x * 10, z * 10) > 0.5 ? "#8fb3d9" : "#a9c4e0",
    [x, 0, z],
  ),
  box([0.12, 0.04, 0.12], "#5b6270", [x, height, z]),
];

const buildFactoryParts = (x: number, z: number): ModelPart[] => [
  box([0.42, 0.18, 0.26], "#9aa1ab", [x, 0, z]),
  {
    geometry: new CylinderGeometry(0.035, 0.045, 0.4, 8),
    colour: "#7a3b2e",
    position: [x + 0.12, boardTop + 0.2, z - 0.06],
  },
  {
    geometry: new CylinderGeometry(0.035, 0.045, 0.32, 8),
    colour: "#7a3b2e",
    position: [x - 0.08, boardTop + 0.16, z - 0.06],
  },
];

const buildRoadParts = (
  from: [number, number],
  to: [number, number],
  width = 0.08,
): ModelPart[] => {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const turn = Math.atan2(to[0] - from[0], to[1] - from[1]);
  return [
    box(
      [width, 0.012, length],
      "#4b5059",
      [(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2],
      turn,
    ),
  ];
};

const scatterHouses = (
  count: number,
  radius: number,
  salt: number,
  size = 1,
  innerRadius = 0,
): HouseSpot[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = index * 2.399 + salt;
    const share = Math.sqrt((index + 0.5) / count);
    const reach = innerRadius + share * (radius - innerRadius);
    return {
      x: Math.cos(angle) * reach,
      z: Math.sin(angle) * reach,
      size: size * (0.85 + findScatter(index, salt) * 0.3),
      turn: findScatter(index, salt + 3) * Math.PI,
    };
  });

const buildSizeLayout = (size: SettlementSize): TileLayout => {
  switch (size) {
    case "isolated-dwelling":
      return {
        houses: [{ x: 0.1, z: 0, size: 1.5, turn: 0.3 }],
        parts: [
          ...buildFieldParts(-0.8, -0.6, 1.2, 1),
          ...buildFieldParts(0.8, 0.7, 1.1, 1),
          ...buildTreeParts(0.45, -0.25),
          ...buildRoadParts([0.1, 0.15], [-0.4, 1.4], 0.05),
        ],
      };
    case "hamlet":
      return {
        houses: scatterHouses(4, 0.45, 1, 1.3),
        parts: [
          ...buildFieldParts(-0.9, 0.8, 1, 0.9),
          ...buildFieldParts(0.9, -0.8, 1, 0.9),
          ...buildRoadParts([-1.4, 0], [1.4, 0.1], 0.06),
          ...buildTreeParts(0.8, 0.6),
        ],
      };
    case "village":
      return {
        houses: scatterHouses(16, 0.95, 2, 1.1, 0.35),
        parts: [
          box([0.5, 0.012, 0.5], "#6fbf5e", [0, 0, 0]),
          ...buildChurchParts(-0.1, -0.05),
          box([0.2, 0.12, 0.14], "#f3d27a", [0.2, 0, 0.18]),
          ...buildRoadParts([-1.5, 0.3], [1.5, 0.3]),
          ...buildFieldParts(1.1, -1.1, 0.8, 0.7),
        ],
      };
    case "town":
      return {
        houses: scatterHouses(46, 1.4, 3, 0.9, 0.45),
        parts: [
          box([0.5, 0.012, 0.4], "#cdbf9c", [0, 0, 0]),
          ...buildChurchParts(-0.15, -0.1, 1.2),
          box([0.3, 0.2, 0.18], "#e7b45c", [0.22, 0, 0.12]),
          box([0.26, 0.24, 0.2], "#c98b6b", [0.25, 0, -0.2]),
          ...buildRoadParts([-1.5, 0], [1.5, 0], 0.1),
          ...buildRoadParts([0, -1.5], [0, 1.5], 0.1),
        ],
      };
    case "city":
      return {
        houses: scatterHouses(mostHouses, 1.5, 4, 0.75, 0.62),
        parts: [
          ...[
            [0, 0, 1.1],
            [0.3, 0.1, 0.8],
            [-0.28, 0.15, 0.9],
            [0.12, -0.32, 0.7],
            [-0.15, -0.3, 0.6],
            [0.38, -0.25, 0.55],
            [-0.4, -0.1, 0.5],
          ].flatMap(([x = 0, z = 0, height = 0.5]) =>
            buildTowerParts(x, z, height),
          ),
          ...buildChurchParts(0.05, 0.42, 1.5),
          ...buildRoadParts([-1.55, 0.25], [1.55, 0.25], 0.1),
          ...buildRoadParts([0.6, -1.55], [0.6, 1.55], 0.1),
        ],
      };
  }
};

const landUseZones: Record<LandUse, [number, number]> = {
  residential: [-1, -0.5],
  commercial: [0, -0.5],
  industrial: [1, -0.5],
  agricultural: [-1, 0.5],
  recreational: [0, 0.5],
  transport: [1, 0.5],
};

const zoneSpan = 0.98;

const buildLandUseParts = (landUse: LandUse, lift: number): TileLayout => {
  const [column, row] = landUseZones[landUse];
  const cx = column * zoneSpan;
  const cz = row * zoneSpan * 1.3;
  const raise = (parts: ModelPart[]) =>
    parts.map((part) => ({
      ...part,
      position: [
        part.position?.[0] ?? 0,
        (part.position?.[1] ?? 0) + lift,
        part.position?.[2] ?? 0,
      ] satisfies Triple,
    }));
  const ground = box(
    [zoneSpan - 0.06, 0.03 + lift, zoneSpan * 1.3 - 0.06],
    "#8fbf6a",
    [cx, 0, cz],
  );
  switch (landUse) {
    case "residential":
      return {
        houses: scatterHouses(9, 0.38, 5, 1.1).map((spot) => ({
          ...spot,
          x: spot.x + cx,
          z: spot.z + cz,
        })),
        parts: [ground],
      };
    case "commercial":
      return {
        houses: [],
        parts: [
          ground,
          ...raise([
            box([0.3, 0.42, 0.3], "#8fb3d9", [cx - 0.15, 0.03, cz - 0.15]),
            box([0.26, 0.3, 0.26], "#a9c4e0", [cx + 0.18, 0.03, cz - 0.1]),
            box([0.5, 0.14, 0.2], "#f3a35c", [cx, 0.03, cz + 0.28]),
            box([0.52, 0.03, 0.08], "#e2483d", [cx, 0.17, cz + 0.4]),
          ]),
        ],
      };
    case "industrial":
      return {
        houses: [],
        parts: [
          box(
            [zoneSpan - 0.06, 0.03 + lift, zoneSpan * 1.3 - 0.06],
            "#a3a39a",
            [cx, 0, cz],
          ),
          ...raise([
            ...buildFactoryParts(cx, cz - 0.15),
            ...buildFactoryParts(cx, cz + 0.3),
          ]),
        ],
      };
    case "agricultural":
      return {
        houses: [{ x: cx + 0.25, z: cz - 0.35, size: 1.1, turn: 0 }],
        parts: [
          ground,
          ...raise([
            ...buildFieldParts(cx - 0.1, cz + 0.1, 0.7, 0.8),
            box([0.18, 0.18, 0.24], "#b33a2e", [cx - 0.25, 0.03, cz - 0.4]),
            {
              geometry: new CylinderGeometry(0.06, 0.06, 0.32, 10),
              colour: "#cfd4da",
              position: [cx - 0.05, boardTop + 0.19, cz - 0.45],
            },
          ]),
        ],
      };
    case "recreational":
      return {
        houses: [],
        parts: [
          ground,
          ...raise([
            box([0.5, 0.012, 0.32], "#4fae4a", [cx, 0.03, cz - 0.2]),
            box([0.5, 0.014, 0.012], "#ffffff", [cx, 0.03, cz - 0.2]),
            {
              geometry: new CylinderGeometry(0.16, 0.16, 0.012, 20),
              colour: "#3a8fd8",
              position: [cx + 0.15, boardTop + 0.04, cz + 0.28],
            },
            ...buildTreeParts(cx - 0.25, cz + 0.25, 0.3),
          ]),
        ],
      };
    case "transport":
      return {
        houses: [],
        parts: [
          box(
            [zoneSpan - 0.06, 0.03 + lift, zoneSpan * 1.3 - 0.06],
            "#9a9a92",
            [cx, 0, cz],
          ),
          ...raise([
            ...buildRoadParts(
              [cx - 0.45, cz - 0.3],
              [cx + 0.45, cz - 0.3],
              0.12,
            ),
            ...[-0.05, 0.05].map((offset) =>
              box([0.9, 0.02, 0.015], "#3b3f46", [cx, 0.03, cz + 0.1 + offset]),
            ),
            box([0.3, 0.14, 0.14], "#d9a441", [cx + 0.2, 0.03, cz + 0.32]),
            box([0.26, 0.012, 0.22], "#5f6670", [cx - 0.25, 0.03, cz + 0.35]),
          ]),
        ],
      };
  }
};

const isSettlementSize = (tile: SettlementTile): tile is SettlementSize =>
  settlementSizes.some((size) => size === tile);

const isLandUse = (tile: SettlementTile): tile is LandUse =>
  landUses.some((landUse) => landUse === tile);

const buildLandUseLayout = (asked: LandUse): TileLayout => {
  const layouts = landUses.map((landUse) =>
    buildLandUseParts(landUse, landUse === asked ? 0.08 : 0),
  );
  return {
    houses: layouts.flatMap(({ houses }) => houses),
    parts: layouts.flatMap(({ parts }) => parts),
  };
};

const urbanRings: Record<UrbanZone, [number, number]> = {
  "central-business-district": [0, 0.38],
  "inner-city": [0.38, 0.78],
  suburbs: [0.78, 1.22],
  "rural-urban-fringe": [1.22, 1.55],
};

const buildUrbanLayout = (): TileLayout => ({
  houses: [
    ...scatterHouses(34, 0.74, 6, 0.72, 0.44),
    ...scatterHouses(22, 1.16, 7, 1.05, 0.86),
  ],
  parts: [
    ...[
      [0, 0, 1.1],
      [0.2, 0.12, 0.85],
      [-0.18, 0.14, 0.75],
      [0.06, -0.22, 0.95],
      [-0.2, -0.12, 0.65],
    ].flatMap(([x = 0, z = 0, height = 0.6]) => buildTowerParts(x, z, height)),
    ...buildFactoryParts(0.55, -0.35),
    ...buildFactoryParts(-0.55, 0.38),
    box([0.5, 0.1, 0.3], "#d6d0c4", [1.32, 0, -0.55], 0.4),
    box([0.45, 0.012, 0.35], "#6fbf5e", [-1.25, 0, -0.6], -0.3),
    ...buildFieldParts(-0.5, 1.32, 0.7, 0.3),
    ...buildFieldParts(0.75, 1.25, 0.6, 0.3),
    ...buildTreeParts(-1.3, 0.55, 0.26),
    ...buildTreeParts(1.25, 0.6, 0.26),
  ],
});

const buildTileLayout = (tile: SettlementTile): TileLayout => {
  if (isSettlementSize(tile)) {
    return buildSizeLayout(tile);
  }
  if (isLandUse(tile)) {
    return buildLandUseLayout(tile);
  }
  return buildUrbanLayout();
};

const buildHouseGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.1, 0.08, 0.12),
      colour: "#f1e8d8",
      position: [0, 0.04, 0],
    },
    {
      geometry: new ConeGeometry(0.09, 0.07, 4),
      colour: "#b5523b",
      position: [0, 0.115, 0],
      rotation: [0, Math.PI / 4, 0],
      scale: [1, 1, 1.25],
    },
  ]);

const Houses = ({ spots }: { spots: HouseSpot[] }) => {
  const geometry = useMemo(() => buildHouseGeometry(), []);
  useDisposedOnUnmount(geometry);
  const instances = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = instances.current;
    if (mesh === null) {
      return;
    }
    const placer = new Object3D();
    spots.forEach(({ x, z, size, turn }, index) => {
      placer.position.set(x, boardTop, z);
      placer.rotation.set(0, turn, 0);
      placer.scale.setScalar(size);
      placer.updateMatrix();
      mesh.setMatrixAt(index, placer.matrix);
    });
    mesh.count = spots.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [spots]);

  return (
    <instancedMesh
      ref={instances}
      args={[geometry, undefined, Math.max(1, spots.length)]}
      count={spots.length}
      name="houses"
    >
      <meshStandardMaterial vertexColors roughness={0.6} />
    </instancedMesh>
  );
};

const HighlightRing = ({ inner, outer }: { inner: number; outer: number }) => {
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (material.current !== null) {
      material.current.opacity =
        0.25 + 0.3 * findPulse(age.current, motionScale);
    }
  });
  return (
    <mesh
      position={[0, boardTop + 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      name="asked-zone"
    >
      <ringGeometry args={[Math.max(inner, 0.001), outer, 48]} />
      <meshBasicMaterial
        ref={material}
        color={geographyPalette.highlight}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const HighlightPad = ({ landUse }: { landUse: LandUse }) => {
  const [column, row] = landUseZones[landUse];
  const material = useRef<MeshBasicMaterial>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();
  useFrame(() => {
    if (material.current !== null) {
      material.current.opacity =
        0.35 + 0.35 * findPulse(age.current, motionScale);
    }
  });
  return (
    <mesh
      position={[column * zoneSpan, boardTop + 0.015, row * zoneSpan * 1.3]}
      rotation={[-Math.PI / 2, 0, 0]}
      name="asked-zone"
    >
      <planeGeometry args={[zoneSpan + 0.04, zoneSpan * 1.3 + 0.04]} />
      <meshBasicMaterial
        ref={material}
        color={geographyPalette.highlight}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

const AskedHighlight = ({ tile }: { tile: SettlementTile }) => {
  if (isSettlementSize(tile)) {
    return null;
  }
  if (isLandUse(tile)) {
    return <HighlightPad landUse={tile} />;
  }
  const [inner, outer] = urbanRings[tile];
  return <HighlightRing inner={inner} outer={outer} />;
};

export const SettlementBoardScene = ({
  show,
}: {
  show: GeographyShowOf<"settlement-board">;
}) => {
  const layout = useMemo(() => buildTileLayout(show.tile), [show.tile]);
  const details = useMemo(
    () =>
      buildModelGeometry([
        box([boardHalf * 2, 0.08, boardHalf * 2], "#7fb35a", [0, -0.08, 0]),
        ...layout.parts,
      ]),
    [layout],
  );
  const base = useMemo(
    () =>
      buildModelGeometry([
        box(
          [boardHalf * 2 + 0.12, 0.14, boardHalf * 2 + 0.12],
          geographyPalette.woodDark,
          [0, -0.22, 0],
        ),
      ]),
    [],
  );
  useDisposedOnUnmount(details);
  useDisposedOnUnmount(base);
  const turner = useRef<Object3D>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (turner.current !== null) {
      turner.current.rotation.y =
        -0.35 + Math.sin(age.current * 0.3) * 0.12 * motionScale;
    }
  });

  return (
    <group
      rotation={[0.55, 0, 0]}
      position={[0, 0.25, -0.2]}
      name="settlement-board"
    >
      <group ref={turner}>
        <mesh geometry={base}>
          <meshStandardMaterial vertexColors roughness={0.7} />
        </mesh>
        <mesh geometry={details}>
          <meshStandardMaterial vertexColors roughness={0.65} />
        </mesh>
        <Houses spots={layout.houses} />
        <AskedHighlight tile={show.tile} />
      </group>
    </group>
  );
};
