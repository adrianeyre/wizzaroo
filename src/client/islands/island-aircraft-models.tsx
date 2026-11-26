import { useFrame } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  DoubleSide,
  type BufferGeometry,
  type Group,
  type Matrix4,
  type Mesh,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { GrainedMaterial } from "../world-map-scene.js";
import { surfaceGrains, type SurfaceGrain } from "../world-map-shaders.js";
import {
  buildAeroplaneDoorGeometry,
  buildAeroplaneGeometry,
  buildAeroplaneLiveryGeometry,
  buildAirstairGeometry,
  placeAeroplaneDoor,
  placeAirstair,
} from "./island-aeroplane-design.js";
import {
  buildBalloonDoorGeometry,
  buildBalloonGeometry,
  buildBalloonLiveryGeometry,
  buildBurnerFlameGeometry,
  placeBalloonDoor,
  placeBurnerFlame,
} from "./island-balloon-design.js";
import type { CraftPlacement } from "./island-flight.js";
import {
  buildHelicopterDoorGeometry,
  buildHelicopterGeometry,
  buildHelicopterLiveryGeometry,
  buildMainRotorGeometry,
  buildTailRotorGeometry,
  placeHelicopterDoor,
  placeMainRotor,
  placeTailRotor,
} from "./island-helicopter-design.js";
import {
  buildHovercraftGeometry,
  buildHovercraftLiveryGeometry,
  buildHovercraftPropellerGeometry,
  buildHovercraftRadarGeometry,
  buildHovercraftRampGeometry,
  buildSkirtGeometry,
  placeHovercraftPropeller,
  placeHovercraftRadar,
  placeHovercraftRamp,
  placeHovercraftSkirt,
} from "./island-hovercraft-design.js";
import {
  buildJetskiGeometry,
  buildJetskiHandlebarGeometry,
  buildJetskiLiveryGeometry,
  buildJetskiSprayGeometry,
  placeJetskiHandlebar,
  placeJetskiSpray,
} from "./island-jetski-design.js";
import { LiveryDecals } from "./island-livery-models.js";
import {
  buildPortalGeometry,
  buildPortalGlowGeometry,
  buildPortalLiveryGeometry,
  buildPortalOrbitGeometry,
  findPortalScale,
  placePortalGlow,
  placePortalOrbit,
  portalGrowthCentre,
} from "./island-portal-design.js";
import type { Triple } from "../world-map-models.js";
import {
  buildRocketFlameGeometry,
  buildRocketGeometry,
  buildRocketHatchGeometry,
  buildRocketLiveryGeometry,
  buildRocketStairGeometry,
  placeRocketFlame,
  placeRocketHatch,
  placeRocketStair,
} from "./island-rocket-design.js";
import {
  buildBlimpGeometry,
  buildBlimpLiveryGeometry,
  buildBlimpMovingPartsGeometry,
  placeBlimpMovingParts,
} from "./island-blimp-design.js";
import {
  buildDragonGeometry,
  buildDragonLiveryGeometry,
  buildDragonMovingPartsGeometry,
  placeDragonMovingParts,
} from "./island-dragon-design.js";
import { placeDragonBody } from "./island-flight.js";
import {
  buildScubaLockerGeometry,
  buildScubaLockerLiveryGeometry,
  buildScubaLockerMovingPartsGeometry,
  placeScubaLockerMovingParts,
  scubaLockerGrowthCentre,
} from "./island-scuba-design.js";
import {
  buildSurfboardGeometry,
  buildSurfboardLiveryGeometry,
  buildSurfboardMovingPartsGeometry,
  buildSurfWaveGeometry,
  placeSurfboardMovingParts,
  placeSurfWave,
} from "./island-surfboard-design.js";
import {
  buildWindsurferGeometry,
  buildWindsurferLiveryGeometry,
  buildWindsurferMovingPartsGeometry,
  placeWindsurferMovingParts,
} from "./island-windsurfer-design.js";
import {
  buildMovingPartsModel,
  moveParts,
  type MovingPartsModel,
} from "./island-moving-parts.js";
import {
  buildSubmarineBrowGeometry,
  buildSubmarineGeometry,
  buildSubmarineHatchGeometry,
  buildSubmarineLiveryGeometry,
  buildSubmarinePropellerGeometry,
  placeSubmarineBrow,
  placeSubmarineHatch,
  placeSubmarinePropeller,
} from "./island-submarine-design.js";

export type Craft =
  | "aeroplane"
  | "helicopter"
  | "hovercraft"
  | "submarine"
  | "balloon"
  | "jetski"
  | "rocket"
  | "portal"
  | "dragon"
  | "blimp"
  | "surfboard"
  | "windsurfer"
  | "scuba";

export interface CraftPose {
  placement: CraftPlacement;
  opening: number;
  lift?: number;
  side?: number;
  burn?: number;
}

const rotorSpeed = 21;
const reducedRotorSpeed = 3;

interface CraftGlow {
  build: () => BufferGeometry;
  place: (pose: CraftPose, turn: number) => Matrix4;
  opacity?: number;
  /** Shaded by the sun, like water, rather than glowing like a flame. */
  isLit?: boolean;
}

interface CraftDesign {
  scaleBody?: { centre: Triple; find: (pose: CraftPose) => number };
  /** Moves the body and its livery, as the dragon lies down to be boarded. */
  placeBody?: (pose: CraftPose) => Matrix4;
  buildBody: () => BufferGeometry;
  buildLivery: () => BufferGeometry;
  buildMovingParts: () => BufferGeometry[];
  placeMovingParts: (pose: CraftPose, turn: number) => Matrix4[];
  grain?: SurfaceGrain;
  glow?: CraftGlow;
}

const craftDesigns: Record<Craft, CraftDesign> = {
  aeroplane: {
    buildBody: buildAeroplaneGeometry,
    buildLivery: buildAeroplaneLiveryGeometry,
    buildMovingParts: () => [
      buildAeroplaneDoorGeometry(),
      buildAirstairGeometry(),
    ],
    placeMovingParts: ({ opening }) => [
      placeAeroplaneDoor(opening),
      placeAirstair(opening),
    ],
  },
  helicopter: {
    buildBody: buildHelicopterGeometry,
    buildLivery: buildHelicopterLiveryGeometry,
    buildMovingParts: () => [
      buildMainRotorGeometry(),
      buildTailRotorGeometry(),
      buildHelicopterDoorGeometry(),
    ],
    placeMovingParts: ({ opening }, turn) => [
      placeMainRotor(turn),
      placeTailRotor(turn * 2.3),
      placeHelicopterDoor(opening),
    ],
  },
  hovercraft: {
    buildBody: buildHovercraftGeometry,
    buildLivery: buildHovercraftLiveryGeometry,
    buildMovingParts: () => [
      buildSkirtGeometry(),
      buildHovercraftRampGeometry(),
      buildHovercraftPropellerGeometry(),
      buildHovercraftPropellerGeometry(),
      buildHovercraftRadarGeometry(),
    ],
    placeMovingParts: ({ opening, lift = 0 }, turn) => [
      placeHovercraftSkirt(lift),
      placeHovercraftRamp(opening),
      placeHovercraftPropeller(0, turn * (0.25 + 0.75 * lift)),
      placeHovercraftPropeller(1, turn * (0.25 + 0.75 * lift)),
      placeHovercraftRadar(turn),
    ],
  },
  submarine: {
    buildBody: buildSubmarineGeometry,
    buildLivery: buildSubmarineLiveryGeometry,
    buildMovingParts: () => [
      buildSubmarinePropellerGeometry(),
      buildSubmarineHatchGeometry(),
      buildSubmarineBrowGeometry(),
    ],
    placeMovingParts: ({ opening, side = 1 }, turn) => [
      placeSubmarinePropeller(turn * 0.35),
      placeSubmarineHatch(opening),
      placeSubmarineBrow(opening, side),
    ],
  },
  balloon: {
    buildBody: buildBalloonGeometry,
    buildLivery: buildBalloonLiveryGeometry,
    buildMovingParts: () => [buildBalloonDoorGeometry()],
    placeMovingParts: ({ opening }) => [placeBalloonDoor(opening)],
    grain: surfaceGrains.fabric,
    glow: {
      build: buildBurnerFlameGeometry,
      place: ({ burn = 0 }, turn) => placeBurnerFlame(burn, turn),
    },
  },
  jetski: {
    buildBody: buildJetskiGeometry,
    buildLivery: buildJetskiLiveryGeometry,
    buildMovingParts: () => [buildJetskiHandlebarGeometry()],
    placeMovingParts: ({ placement }) => [
      placeJetskiHandlebar(-placement.roll * 2.5),
    ],
    glow: {
      build: buildJetskiSprayGeometry,
      place: ({ burn = 0 }, turn) => placeJetskiSpray(burn, turn),
      opacity: 0.6,
    },
  },
  rocket: {
    buildBody: buildRocketGeometry,
    buildLivery: buildRocketLiveryGeometry,
    buildMovingParts: () => [
      buildRocketHatchGeometry(),
      buildRocketStairGeometry(),
    ],
    placeMovingParts: ({ opening }) => [
      placeRocketHatch(opening),
      placeRocketStair(opening),
    ],
    glow: {
      build: buildRocketFlameGeometry,
      place: ({ burn = 0 }, turn) => placeRocketFlame(burn, turn),
    },
  },
  dragon: {
    placeBody: ({ opening }) => placeDragonBody(opening),
    buildBody: buildDragonGeometry,
    buildLivery: buildDragonLiveryGeometry,
    buildMovingParts: buildDragonMovingPartsGeometry,
    placeMovingParts: ({ opening, burn = 0 }, turn) =>
      placeDragonMovingParts(opening, burn, turn),
    grain: surfaceGrains.stone,
  },
  blimp: {
    buildBody: buildBlimpGeometry,
    buildLivery: buildBlimpLiveryGeometry,
    buildMovingParts: buildBlimpMovingPartsGeometry,
    placeMovingParts: ({ opening }, turn) =>
      placeBlimpMovingParts(opening, turn),
    grain: surfaceGrains.fabric,
  },
  surfboard: {
    buildBody: buildSurfboardGeometry,
    buildLivery: buildSurfboardLiveryGeometry,
    buildMovingParts: buildSurfboardMovingPartsGeometry,
    placeMovingParts: (_pose, turn) => placeSurfboardMovingParts(turn),
    glow: {
      build: buildSurfWaveGeometry,
      place: ({ burn = 0, placement }, turn) =>
        placeSurfWave(burn, turn, placement),
      opacity: 0.94,
      isLit: true,
    },
  },
  windsurfer: {
    buildBody: buildWindsurferGeometry,
    buildLivery: buildWindsurferLiveryGeometry,
    buildMovingParts: buildWindsurferMovingPartsGeometry,
    placeMovingParts: (_pose, turn) => placeWindsurferMovingParts(turn),
  },
  scuba: {
    scaleBody: {
      centre: scubaLockerGrowthCentre,
      find: ({ burn = 0 }) => Math.max(0.001, burn),
    },
    buildBody: buildScubaLockerGeometry,
    buildLivery: buildScubaLockerLiveryGeometry,
    buildMovingParts: buildScubaLockerMovingPartsGeometry,
    placeMovingParts: ({ opening, lift = 0, burn = 0 }) =>
      placeScubaLockerMovingParts(opening, lift, burn),
    grain: surfaceGrains.stone,
  },
  portal: {
    scaleBody: {
      centre: portalGrowthCentre,
      find: ({ opening }) => findPortalScale(opening),
    },
    buildBody: buildPortalGeometry,
    buildLivery: buildPortalLiveryGeometry,
    buildMovingParts: () => [buildPortalOrbitGeometry()],
    placeMovingParts: ({ opening }, turn) => [placePortalOrbit(opening, turn)],
    grain: surfaceGrains.stone,
    glow: {
      build: buildPortalGlowGeometry,
      place: ({ opening }, turn) => placePortalGlow(opening, turn),
      opacity: 0.85,
    },
  },
};

const CraftGlowMesh = ({
  glow,
  meshRef,
  name,
}: {
  glow: CraftGlow;
  meshRef: RefObject<Mesh | null>;
  name: string;
}) => {
  const geometry = useBuiltGeometry(glow.build);
  return (
    <mesh
      ref={meshRef}
      name={name}
      geometry={geometry}
      frustumCulled={false}
      matrixAutoUpdate={false}
    >
      {glow.isLit === true ? (
        <meshStandardMaterial
          vertexColors
          transparent
          side={DoubleSide}
          opacity={glow.opacity ?? 0.9}
          roughness={0.18}
          metalness={0.05}
          depthWrite={false}
        />
      ) : (
        <meshBasicMaterial
          vertexColors
          transparent
          side={DoubleSide}
          opacity={glow.opacity ?? 0.9}
          depthWrite={false}
          toneMapped={false}
        />
      )}
    </mesh>
  );
};

export const VoyageCraft = ({
  craft,
  findPose,
  scale = 1,
  name,
  children,
}: {
  craft: Craft;
  findPose: (deltaSeconds: number) => CraftPose | undefined;
  scale?: number;
  name: string;
  /** Anything carried in view with the craft, such as its rider. */
  children?: ReactNode;
}) => {
  const design = craftDesigns[craft];
  const body = useBuiltGeometry(design.buildBody);
  const movingParts = useMemo(
    (): MovingPartsModel => buildMovingPartsModel(design.buildMovingParts()),
    [design],
  );
  useEffect(
    () => () => {
      movingParts.geometry.dispose();
    },
    [movingParts],
  );
  const group = useRef<Group>(null);
  const scaled = useRef<Group>(null);
  const glowMesh = useRef<Mesh>(null);
  const rotorTurn = useRef(0);
  useFrame((_state, deltaSeconds) => {
    const pose = findPose(deltaSeconds);
    const shown = group.current;
    if (shown === null) {
      return;
    }
    shown.visible = pose !== undefined;
    if (pose === undefined) {
      return;
    }
    rotorTurn.current +=
      deltaSeconds * (isMotionReduced() ? reducedRotorSpeed : rotorSpeed);
    const { placement } = pose;
    shown.position.set(placement.x, placement.y, placement.z);
    shown.rotation.set(
      -placement.pitch,
      placement.heading,
      placement.roll,
      "YXZ",
    );
    moveParts(movingParts, design.placeMovingParts(pose, rotorTurn.current));
    if (design.placeBody !== undefined && scaled.current !== null) {
      scaled.current.matrixAutoUpdate = false;
      scaled.current.matrix.copy(design.placeBody(pose));
      scaled.current.matrixWorldNeedsUpdate = true;
    }
    if (design.scaleBody !== undefined && scaled.current !== null) {
      const size = design.scaleBody.find(pose);
      const [x, y, z] = design.scaleBody.centre;
      scaled.current.scale.setScalar(size);
      scaled.current.position.set(
        x * (1 - size),
        y * (1 - size),
        z * (1 - size),
      );
    }
    if (design.glow !== undefined && glowMesh.current !== null) {
      glowMesh.current.matrix.copy(design.glow.place(pose, rotorTurn.current));
    }
  });
  const grain = design.grain ?? surfaceGrains.metal;
  return (
    <group ref={group} name={name} scale={scale} visible={false}>
      <group ref={scaled}>
        <mesh geometry={body} castShadow receiveShadow>
          <GrainedMaterial grain={grain} />
        </mesh>
        <LiveryDecals
          buildGeometry={design.buildLivery}
          name={`${name}-livery`}
        />
      </group>
      <mesh
        geometry={movingParts.geometry}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <GrainedMaterial grain={grain} />
      </mesh>
      {design.glow === undefined ? null : (
        <CraftGlowMesh
          glow={design.glow}
          meshRef={glowMesh}
          name={`${name}-glow`}
        />
      )}
      {children}
    </group>
  );
};
