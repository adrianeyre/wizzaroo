import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import type { BufferGeometry, Group, Matrix4, Mesh } from "three";
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
import { LiveryDecals } from "./island-livery-models.js";
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
  "aeroplane" | "helicopter" | "hovercraft" | "submarine" | "balloon";

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
}

interface CraftDesign {
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
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export const VoyageCraft = ({
  craft,
  findPose,
  scale = 1,
  name,
}: {
  craft: Craft;
  findPose: (deltaSeconds: number) => CraftPose | undefined;
  scale?: number;
  name: string;
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
    if (design.glow !== undefined && glowMesh.current !== null) {
      glowMesh.current.matrix.copy(design.glow.place(pose, rotorTurn.current));
    }
  });
  const grain = design.grain ?? surfaceGrains.metal;
  return (
    <group ref={group} name={name} scale={scale} visible={false}>
      <mesh geometry={body} castShadow receiveShadow>
        <GrainedMaterial grain={grain} />
      </mesh>
      <mesh
        geometry={movingParts.geometry}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <GrainedMaterial grain={grain} />
      </mesh>
      <LiveryDecals
        buildGeometry={design.buildLivery}
        name={`${name}-livery`}
      />
      {design.glow === undefined ? null : (
        <CraftGlowMesh
          glow={design.glow}
          meshRef={glowMesh}
          name={`${name}-glow`}
        />
      )}
    </group>
  );
};
