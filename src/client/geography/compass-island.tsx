import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  type MeshStandardMaterial,
  RingGeometry,
  Shape,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import type {
  CompassLandmark,
  CompassPointCount,
  GeographyShowOf,
} from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import {
  buildModelGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  buildLandmarkGeometry,
  buildSmokePuffGeometry,
  buildWindmillSailsGeometry,
  volcanoCraterHeight,
  windmillHubHeight,
} from "./compass-landmarks.js";
import {
  buildCompassPlacements,
  getCompassDirections,
  getDirectionAngle,
  type CompassPlacement,
} from "./compass-placement.js";
import {
  findPulse,
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import {
  buildBroadleafParts,
  buildBushParts,
  buildGeometryBundle,
  buildRockParts,
  placeAround,
} from "./miniature-parts.js";
import { useRippleWaterMaterial } from "./ripple-water.js";

const islandTilt = 0.68;
const islandLift = -0.3;
const groundHeight = 0.12;
const plinthTop = -1.5;
const standTop = -0.42;
const landmarkScale = 1.25;
const explorerScale = 1.35;

const islandColours = {
  sand: "#d9b765",
  wetSand: "#b8955a",
  grass: "#3f9a46",
  grassEdge: "#2f7d3a",
  foam: "#ffffff",
  tray: "#6b4426",
  brass: "#d6a548",
  parchment: "#e6cf98",
  northDark: "#d2453a",
  northLight: "#f39486",
  cardinalDark: "#2a3550",
  cardinalLight: "#fbf6e9",
  betweenDark: "#b8862f",
  betweenLight: "#ecc97f",
  ink: "#10213a",
} as const;

const buildIslandGeometry = (): BufferGeometry => {
  const treeAngles = [0.4, 1.95, 3.55, 5.1];
  const bushAngles = [1.18, 2.75, 4.3, 5.9];
  const rockAngles = [0.75, 3.95, 5.5];
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.5, 1.6, 0.12, 24),
      colour: islandColours.sand,
      position: [0, -0.01, 0],
    },
    {
      geometry: new RingGeometry(1.52, 1.62, 36),
      colour: islandColours.foam,
      position: [0, 0.014, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
    {
      geometry: new CylinderGeometry(1.38, 1.46, 0.08, 24),
      colour: islandColours.grass,
      position: [0, groundHeight - 0.04, 0],
    },
    ...treeAngles.flatMap((angle, tree) =>
      buildBroadleafParts(
        placeAround(1.18 + (tree % 2) * 0.06, angle, groundHeight),
        0.3,
        tree % 2 === 0 ? ["#3f8a3a", "#5aa64e"] : ["#4a9a40", "#3a7a34"],
      ),
    ),
    ...bushAngles.flatMap((angle) =>
      buildBushParts(placeAround(1.22, angle, groundHeight), 0.06),
    ),
    ...rockAngles.flatMap((angle, rock) =>
      buildRockParts(
        placeAround(1.47, angle, 0.06),
        0.05 + (rock % 2) * 0.025,
        islandColours.wetSand,
      ),
    ),
  ]);
};

const buildTrayGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(1.84, 1.6, 0.2, 24),
      colour: islandColours.tray,
      position: [0, -0.1, 0],
    },
    {
      geometry: new CylinderGeometry(1.84, 1.84, 0.05, 24, 1, true),
      colour: islandColours.brass,
      position: [0, 0.01, 0],
    },
  ]);

const buildStandGeometry = (): BufferGeometry => {
  const columnHeight = standTop - plinthTop;
  return buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.34, 0.38, 0.06, 20),
      colour: islandColours.tray,
      position: [0, plinthTop + 0.03, -0.1],
    },
    {
      geometry: new CylinderGeometry(0.08, 0.12, columnHeight, 12),
      colour: islandColours.brass,
      position: [0, plinthTop + columnHeight / 2, -0.1],
    },
    {
      geometry: new SphereGeometry(0.13, 8, 4),
      colour: islandColours.brass,
      position: [0, standTop - 0.04, -0.1],
    },
  ]);
};

const buildRoseHalfPart = (
  corners: readonly (readonly [number, number])[],
  colour: string,
): ModelPart => {
  const outline = new Shape();
  outline.moveTo(corners[0][0], corners[0][1]);
  corners.slice(1).forEach(([x, y]) => outline.lineTo(x, y));
  outline.closePath();
  return {
    geometry: new ExtrudeGeometry(outline, {
      depth: 0.012,
      bevelEnabled: false,
    }),
    colour,
    position: [0, groundHeight + 0.011, 0],
    rotation: [-Math.PI / 2, 0, 0],
  };
};

const findArmColours = (angle: number, isCardinal: boolean) => {
  if (angle === 0) {
    return [islandColours.northDark, islandColours.northLight] as const;
  }
  return isCardinal
    ? ([islandColours.cardinalDark, islandColours.cardinalLight] as const)
    : ([islandColours.betweenDark, islandColours.betweenLight] as const);
};

const buildRoseArmParts = (angle: number, isCardinal: boolean): ModelPart[] => {
  const reach = isCardinal ? 0.6 : 0.38;
  const halfWidth = isCardinal ? 0.085 : 0.06;
  const tip = [Math.sin(angle) * reach, Math.cos(angle) * reach] as const;
  const side = [
    Math.cos(angle) * halfWidth,
    -Math.sin(angle) * halfWidth,
  ] as const;
  const [dark, light] = findArmColours(angle, isCardinal);
  return [
    buildRoseHalfPart([[0, 0], tip, [-side[0], -side[1]]], dark),
    buildRoseHalfPart([[0, 0], side, tip], light),
  ];
};

const buildNorthLetterParts = (): ModelPart[] => {
  const plaque: Triple = [0, groundHeight + 0.02, -0.5];
  const letterHeight = plaque[1] + 0.012;
  const diagonal = Math.hypot(0.052, 0.08);
  return [
    {
      geometry: new CylinderGeometry(0.088, 0.088, 0.014, 14),
      colour: islandColours.brass,
      position: [plaque[0], plaque[1] - 0.004, plaque[2]],
    },
    {
      geometry: new CylinderGeometry(0.074, 0.074, 0.018, 14),
      colour: islandColours.cardinalLight,
      position: plaque,
    },
    ...[-0.026, 0.026].map((across) => ({
      geometry: new BoxGeometry(0.017, 0.01, 0.084),
      colour: islandColours.ink,
      position: [across, letterHeight, plaque[2]] satisfies Triple,
    })),
    {
      geometry: new BoxGeometry(0.017, 0.01, diagonal),
      colour: islandColours.ink,
      position: [0, letterHeight, plaque[2]],
      rotation: [0, Math.atan2(0.052, 0.08), 0],
    },
  ];
};

const buildRoseGeometry = (points: CompassPointCount): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.43, 0.44, 0.016, 20),
      colour: islandColours.brass,
      position: [0, groundHeight + 0.001, 0],
    },
    {
      geometry: new CylinderGeometry(0.4, 0.4, 0.02, 20),
      colour: islandColours.parchment,
      position: [0, groundHeight + 0.002, 0],
    },
    ...getCompassDirections(points).flatMap((direction) =>
      buildRoseArmParts(getDirectionAngle(direction), !direction.includes("-")),
    ),
    {
      geometry: new CylinderGeometry(0.035, 0.035, 0.03, 12),
      colour: islandColours.brass,
      position: [0, groundHeight + 0.02, 0],
    },
    ...buildNorthLetterParts(),
  ]);

const explorerColours = {
  coat: "#2bb3a3",
  skin: "#ffcf9e",
  cheek: "#f2a07b",
  hat: "#c9a86a",
  hatBand: "#7a4a2a",
  pack: "#e8743b",
  packPocket: "#c25a28",
  bedroll: "#5a7fc0",
  boots: "#5a3a20",
  scarf: "#e63946",
} as const;

const buildExplorerGeometry = (): BufferGeometry => {
  const pointing: Triple = [0, Math.cos(-1.27), Math.sin(-1.27)];
  const shoulder: Triple = [0.06, 0.125, -0.04];
  return buildModelGeometry([
    ...[-1, 1].map((side) => ({
      geometry: new IcosahedronGeometry(0.024, 0),
      colour: explorerColours.boots,
      position: [side * 0.032, 0.015, -0.012] satisfies Triple,
      scale: [1, 0.7, 1.3] satisfies Triple,
    })),
    {
      geometry: new SphereGeometry(0.07, 8, 6),
      colour: explorerColours.coat,
      position: [0, 0.085, 0],
      scale: [1, 1.12, 0.95],
    },
    {
      geometry: new CylinderGeometry(0.05, 0.058, 0.022, 10),
      colour: explorerColours.scarf,
      position: [0, 0.15, 0],
    },
    {
      geometry: new SphereGeometry(0.056, 10, 6),
      colour: explorerColours.skin,
      position: [0, 0.198, 0],
    },
    ...[-1, 1].map((side) => ({
      geometry: new IcosahedronGeometry(0.01, 0),
      colour: islandColours.ink,
      position: [side * 0.021, 0.205, -0.05] satisfies Triple,
    })),
    {
      geometry: new IcosahedronGeometry(0.013, 0),
      colour: explorerColours.cheek,
      position: [0, 0.192, -0.057],
    },
    {
      geometry: new CylinderGeometry(0.088, 0.088, 0.012, 10),
      colour: explorerColours.hat,
      position: [0, 0.236, 0],
    },
    {
      geometry: new SphereGeometry(
        0.052,
        10,
        3,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ),
      colour: explorerColours.hat,
      position: [0, 0.238, 0],
      scale: [1, 1.15, 1],
    },
    {
      geometry: new CylinderGeometry(0.053, 0.053, 0.013, 10),
      colour: explorerColours.hatBand,
      position: [0, 0.249, 0],
    },
    {
      geometry: new BoxGeometry(0.088, 0.1, 0.05),
      colour: explorerColours.pack,
      position: [0, 0.1, 0.066],
    },
    {
      geometry: new BoxGeometry(0.056, 0.036, 0.016),
      colour: explorerColours.packPocket,
      position: [0, 0.075, 0.096],
    },
    {
      geometry: new CylinderGeometry(0.022, 0.022, 0.106, 8),
      colour: explorerColours.bedroll,
      position: [0, 0.162, 0.07],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      geometry: new CylinderGeometry(0.014, 0.014, 0.08, 6),
      colour: explorerColours.coat,
      position: [
        shoulder[0],
        shoulder[1] + pointing[1] * 0.04,
        shoulder[2] + pointing[2] * 0.04,
      ],
      rotation: [-1.27, 0, 0],
    },
    {
      geometry: new IcosahedronGeometry(0.017, 0),
      colour: explorerColours.skin,
      position: [
        shoulder[0],
        shoulder[1] + pointing[1] * 0.085,
        shoulder[2] + pointing[2] * 0.085,
      ],
    },
    {
      geometry: new CylinderGeometry(0.014, 0.014, 0.075, 6),
      colour: explorerColours.coat,
      position: [-0.075, 0.09, 0],
      rotation: [0, 0, -0.35],
    },
  ]);
};

const buildCompassModels = (
  points: CompassPointCount,
  landmarks: readonly CompassLandmark[],
) =>
  buildGeometryBundle({
    island: buildIslandGeometry(),
    tray: buildTrayGeometry(),
    stand: buildStandGeometry(),
    rose: buildRoseGeometry(points),
    explorer: buildExplorerGeometry(),
    sea: new CircleGeometry(1.79, 44).rotateX(-Math.PI / 2),
    targetRing: new RingGeometry(0.2, 0.26, 28).rotateX(-Math.PI / 2),
    sails: buildWindmillSailsGeometry(),
    smoke: buildSmokePuffGeometry(),
    landmarks: landmarks.map((landmark) => buildLandmarkGeometry(landmark)),
  });

const WindmillSails = ({ geometry }: { geometry: BufferGeometry }) => {
  const motionScale = useMotionScale();
  const sails = useRef<Mesh>(null);
  useFrame((_state, deltaSeconds) => {
    if (sails.current !== null) {
      sails.current.rotation.z -= deltaSeconds * 1.1 * motionScale;
    }
  });
  return (
    <mesh
      ref={sails}
      geometry={geometry}
      position={[0, windmillHubHeight, 0.11]}
      rotation={[0, 0, 0.4]}
    >
      <meshPhysicalMaterial vertexColors roughness={0.6} clearcoat={0.3} />
    </mesh>
  );
};

const smokePuffs = [0, 1] as const;

const SmokePuff = ({
  geometry,
  puffIndex,
}: {
  geometry: BufferGeometry;
  puffIndex: number;
}) => {
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const puff = useRef<Mesh<BufferGeometry, MeshStandardMaterial>>(null);

  useFrame(() => {
    const cloud = puff.current;
    if (cloud === null) {
      return;
    }
    const rise =
      motionScale === 0
        ? 0.3 + puffIndex * 0.4
        : (age.current * 0.3 + puffIndex / smokePuffs.length) % 1;
    cloud.position.y = volcanoCraterHeight + 0.04 + rise * 0.32;
    cloud.position.x = rise * 0.05;
    cloud.scale.setScalar(0.7 + rise * 1.1);
    cloud.material.opacity = 0.85 * (1 - rise * 0.85);
  });

  return (
    <mesh
      ref={puff}
      geometry={geometry}
      position={[0, volcanoCraterHeight + 0.1, 0]}
    >
      <meshStandardMaterial
        vertexColors
        roughness={1}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

const VolcanoSmoke = ({ geometry }: { geometry: BufferGeometry }) => (
  <>
    {smokePuffs.map((puffIndex) => (
      <SmokePuff key={puffIndex} geometry={geometry} puffIndex={puffIndex} />
    ))}
  </>
);

const TargetRing = ({ geometry }: { geometry: BufferGeometry }) => {
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const ring = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null);
  useFrame(() => {
    const glow = ring.current;
    if (glow === null) {
      return;
    }
    const pulse = findPulse(age.current * 0.6, motionScale);
    glow.scale.setScalar(1 + 0.12 * pulse);
    glow.material.opacity = 0.45 + 0.4 * pulse;
  });
  return (
    <mesh ref={ring} geometry={geometry} position={[0, 0.008, 0]}>
      <meshBasicMaterial
        color={geographyPalette.highlight}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </mesh>
  );
};

const Landmark = ({
  placement,
  geometry,
  sails,
  smoke,
  targetRing,
}: {
  placement: CompassPlacement;
  geometry: BufferGeometry;
  sails: BufferGeometry;
  smoke: BufferGeometry;
  targetRing: BufferGeometry;
}) => (
  <group
    position={placeAround(placement.radius, placement.angle, groundHeight)}
    name={placement.isTarget ? "compass-target" : placement.direction}
  >
    {placement.isTarget ? <TargetRing geometry={targetRing} /> : null}
    <group scale={landmarkScale}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.6}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
        />
      </mesh>
      {placement.landmark === "windmill" ? (
        <WindmillSails geometry={sails} />
      ) : null}
      {placement.landmark === "volcano" ? (
        <VolcanoSmoke geometry={smoke} />
      ) : null}
    </group>
  </group>
);

const Explorer = ({ geometry }: { geometry: BufferGeometry }) => {
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const explorer = useRef<Group>(null);
  useFrame(() => {
    const body = explorer.current;
    if (body === null) {
      return;
    }
    body.position.y =
      groundHeight +
      0.012 +
      Math.abs(Math.sin(age.current * 2.2)) * 0.012 * motionScale;
    body.rotation.z = Math.sin(age.current * 1.1) * 0.05 * motionScale;
  });
  return (
    <group
      ref={explorer}
      position={[0, groundHeight + 0.012, 0]}
      scale={explorerScale}
      name="explorer"
    >
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.45}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
        />
      </mesh>
    </group>
  );
};

export const CompassIslandScene = ({
  show,
}: {
  show: GeographyShowOf<"compass-island">;
}) => {
  const placements = useMemo(
    () =>
      buildCompassPlacements({
        target: show.target,
        direction: show.direction,
        points: show.points,
        distance: show.distance,
      }),
    [show.target, show.direction, show.points, show.distance],
  );
  const models = useMemo(
    () =>
      buildCompassModels(
        show.points,
        placements.map((placement) => placement.landmark),
      ),
    [show.points, placements],
  );
  useDisposedOnUnmount(models);
  const sea = useRippleWaterMaterial({ colour: "#5fb8ec", opacity: 1 });
  const { geometries } = models;

  return (
    <group name={show.scene}>
      <mesh geometry={geometries.stand}>
        <meshPhysicalMaterial
          vertexColors
          metalness={0.55}
          roughness={0.32}
          clearcoat={0.6}
        />
      </mesh>
      <group position={[0, islandLift, 0]} rotation={[islandTilt, 0, 0]}>
        <mesh geometry={geometries.tray}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.45}
            clearcoat={0.7}
            clearcoatRoughness={0.25}
          />
        </mesh>
        <mesh
          geometry={geometries.sea}
          material={sea}
          position={[0, 0.005, 0]}
        />
        <mesh geometry={geometries.island}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.75}
            clearcoat={0.15}
          />
        </mesh>
        <mesh geometry={geometries.rose}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.35}
            metalness={0.15}
            clearcoat={0.8}
            clearcoatRoughness={0.15}
          />
        </mesh>
        <Explorer geometry={geometries.explorer} />
        {placements.map((placement, index) => (
          <Landmark
            key={placement.direction}
            placement={placement}
            geometry={geometries.landmarks[index]}
            sails={geometries.sails}
            smoke={geometries.smoke}
            targetRing={geometries.targetRing}
          />
        ))}
      </group>
    </group>
  );
};
