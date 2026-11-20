/**
 * The things explore mode draws on an Island beyond the land itself:
 * trails, trail bridges, watchtowers, fact signs, hideaways, trail lamps,
 * bounce pads, treasure and race rings. Explore mode and the World Map
 * both draw them, so they live apart from either.
 */
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  TorusGeometry,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import {
  buildModelGeometry,
  buildRibbonGeometry,
  type ModelPart,
  type Triple,
} from "../world-map-models.js";
import {
  clickSlopPixels,
  GrainedMaterial,
  InstancedModel,
} from "../world-map-scene.js";
import { surfaceGrains } from "../world-map-shaders.js";
import type { MapPoint, ScatteredThing } from "../world-map-terrain.js";
import {
  findTreasureHeight,
  findWalkSurface,
  type AdventureBridge,
  type AdventureWorld,
  type FactSign,
  type Hideaway,
  type IslandAdventure,
  type Lookout,
} from "./island-adventures.js";
import { findRingTurn, type RaceRun } from "./island-races.js";
import { islands as curriculumIslands } from "../../curriculum/islands.js";
import type { TimeOfDay } from "../world-map-sky.js";

export const propSink = 0.05;

/** How dark the Island is, from 0 by day to 1 at night, so lit windows and lamps glow. */
export const findDarkness = (
  islandId: string,
  timeOfDay: TimeOfDay,
): number => {
  const sky = curriculumIslands.find(({ id }) => id === islandId)?.sky;
  if (sky === "starlit-night" || timeOfDay === "night") {
    return 1;
  }
  return timeOfDay === "twilight" ? 0.6 : 0;
};

/**
 * A click on one of an instanced set of things, or nothing on the World
 * Map, where they are only to look at and a click falls through to the
 * Region underneath.
 */
export const chooseInstance = <Thing,>(
  things: readonly Thing[],
  onChosen: ((thing: Thing) => void) | undefined,
) =>
  onChosen === undefined
    ? undefined
    : (event: ThreeEvent<MouseEvent>) => {
        const thing =
          event.instanceId === undefined ? undefined : things[event.instanceId];
        if (event.delta > clickSlopPixels || thing === undefined) {
          return;
        }
        event.stopPropagation();
        onChosen(thing);
      };

const trailSegmentLength = 1.1;

const findTrailLength = (trail: readonly MapPoint[]): number =>
  trail
    .slice(1)
    .reduce(
      (total, end, index) =>
        total + Math.hypot(end.x - trail[index].x, end.z - trail[index].z),
      0,
    );

const buildTrailsGeometry = (adventure: IslandAdventure): BufferGeometry =>
  mergeGeometries(
    adventure.trails.map((trail) =>
      buildRibbonGeometry(
        trail,
        Math.max(12, Math.round(findTrailLength(trail) / trailSegmentLength)),
        () => 0.42,
        (point) => adventure.findHeight(point) + 0.07,
      ),
    ),
  );

export const AdventureTrails = ({
  adventure,
}: {
  adventure: IslandAdventure;
}) => {
  const geometry = useBuiltGeometry(
    useCallback(() => buildTrailsGeometry(adventure), [adventure]),
  );
  return (
    <mesh geometry={geometry} receiveShadow name="trails">
      <meshStandardMaterial
        color={adventure.trailColour}
        roughness={0.95}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
};

const bridgeColours: Record<
  AdventureBridge["material"],
  { deck: string; rail: string }
> = {
  timber: { deck: "#9c7149", rail: "#6b4a2f" },
  iron: { deck: "#4b5563", rail: "#1f2937" },
  stone: { deck: "#a59c8d", rail: "#8a8174" },
  ice: { deck: "#d6f0fa", rail: "#7cc4e4" },
};

const plankSpacing = 0.3;

const buildTrailBridgeGeometry = (bridge: AdventureBridge): BufferGeometry => {
  const length = Math.hypot(
    bridge.to.x - bridge.from.x,
    bridge.to.z - bridge.from.z,
  );
  const colours = bridgeColours[bridge.material];
  const plankCount = Math.max(3, Math.round(length / plankSpacing));
  const findDeckHeight = (along: number) =>
    bridge.endHeight +
    (bridge.middleHeight - bridge.endHeight) * (1 - (2 * along - 1) ** 2);
  const planks = Array.from({ length: plankCount }, (_, plank): ModelPart => {
    const along = (plank + 0.5) / plankCount;
    return {
      geometry: new BoxGeometry(
        length / plankCount - 0.03,
        0.08,
        bridge.halfWidth * 2,
      ),
      colour: plank % 2 === 0 ? colours.deck : colours.rail,
      position: [(along - 0.5) * length, findDeckHeight(along) - 0.04, 0],
    };
  });
  const posts = [0, 0.5, 1].flatMap((along) =>
    [-1, 1].map((side): ModelPart => ({
      geometry: new CylinderGeometry(0.05, 0.06, 1.6, 6),
      colour: colours.rail,
      position: [
        (along - 0.5) * length,
        findDeckHeight(along) - 0.35,
        side * (bridge.halfWidth - 0.04),
      ],
    })),
  );
  const rails = [-1, 1].flatMap((side) =>
    Array.from({ length: 4 }, (_, piece): ModelPart => {
      const along = (piece + 0.5) / 4;
      return {
        geometry: new BoxGeometry(length / 4 + 0.02, 0.05, 0.05),
        colour: colours.rail,
        position: [
          (along - 0.5) * length,
          findDeckHeight(along) + 0.4,
          side * (bridge.halfWidth - 0.04),
        ] satisfies Triple,
        rotation: [
          0,
          0,
          (-(bridge.middleHeight - bridge.endHeight) * 4 * (2 * along - 1)) /
            length,
        ] satisfies Triple,
      };
    }),
  );
  return buildModelGeometry([...planks, ...posts, ...rails]);
};

export const buildPlacedBridgeGeometry = (
  bridge: AdventureBridge,
): BufferGeometry =>
  buildTrailBridgeGeometry(bridge)
    .rotateY(
      Math.atan2(-(bridge.to.z - bridge.from.z), bridge.to.x - bridge.from.x),
    )
    .translate(
      (bridge.from.x + bridge.to.x) / 2,
      0,
      (bridge.from.z + bridge.to.z) / 2,
    );

export const TrailBridges = ({ bridges }: { bridges: AdventureBridge[] }) => {
  const geometry = useBuiltGeometry(
    useCallback(
      () => mergeGeometries(bridges.map(buildPlacedBridgeGeometry)),
      [bridges],
    ),
  );
  return (
    <mesh name="trail-bridges" geometry={geometry} castShadow receiveShadow>
      <GrainedMaterial grain={surfaceGrains.timber} />
    </mesh>
  );
};

export const buildWatchtowerGeometry = (
  height: number,
  roofColour: string,
): BufferGeometry =>
  buildModelGeometry([
    ...[
      [-0.55, -0.55],
      [0.55, -0.55],
      [-0.55, 0.55],
      [0.55, 0.55],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.07, 0.1, height, 6),
      colour: "#6b4a2f",
      position: [x, height / 2, z],
    })),
    ...[0.3, 0.55, 0.8].map((share): ModelPart => ({
      geometry: new BoxGeometry(1.2, 0.06, 0.06),
      colour: "#7a5236",
      position: [0, height * share, 0.55],
      rotation: [0, 0, share * 0.6 - 0.25],
    })),
    ...Array.from(
      { length: Math.round(height / 0.35) },
      (_, rung): ModelPart => ({
        geometry: new BoxGeometry(0.4, 0.04, 0.04),
        colour: "#c8a26a",
        position: [0, 0.3 + rung * 0.35, 0.72],
      }),
    ),
    ...[-0.18, 0.18].map((x): ModelPart => ({
      geometry: new BoxGeometry(0.05, height, 0.05),
      colour: "#8b6440",
      position: [x, height / 2, 0.72],
    })),
    {
      geometry: new BoxGeometry(1.6, 0.14, 1.6),
      colour: "#8b6440",
      position: [0, height, 0],
    },
    ...[0, 1, 2, 3].map((side): ModelPart => ({
      geometry: new BoxGeometry(1.6, 0.45, 0.06),
      colour: "#9c7149",
      position: [
        Math.sin((side * Math.PI) / 2) * 0.77,
        height + 0.3,
        Math.cos((side * Math.PI) / 2) * 0.77,
      ],
      rotation: [0, (side * Math.PI) / 2, 0],
    })),
    ...[
      [-0.72, -0.72],
      [0.72, -0.72],
      [-0.72, 0.72],
      [0.72, 0.72],
    ].map(([x, z]): ModelPart => ({
      geometry: new CylinderGeometry(0.05, 0.05, 1.1, 5),
      colour: "#6b4a2f",
      position: [x, height + 0.6, z],
    })),
    {
      geometry: new ConeGeometry(1.35, 0.8, 4),
      colour: roofColour,
      position: [0, height + 1.5, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new CylinderGeometry(0.02, 0.02, 0.7, 4),
      colour: "#e2e8f0",
      position: [0, height + 2.2, 0],
    },
    {
      geometry: new BoxGeometry(0.4, 0.24, 0.02),
      colour: "#ef4444",
      position: [0.2, height + 2.4, 0],
    },
  ]);

export const watchtowerHeight = 4.2 - 0.6;

export const listWatchtowers = (adventure: IslandAdventure): Lookout[] =>
  adventure.lookouts.filter(({ look }) => look === "watchtower");

export const Watchtowers = ({
  watchtowers,
  world,
  onChosen,
}: {
  watchtowers: readonly Lookout[];
  world: AdventureWorld;
  onChosen?: (lookout: Lookout) => void;
}) => {
  const things = useMemo(
    () =>
      listPlacedThings(
        watchtowers.map(({ position }) => position),
        world.adventure.findHeight,
      ),
    [watchtowers, world],
  );
  const buildTowers = useCallback(
    () =>
      buildWatchtowerGeometry(watchtowerHeight, world.adventure.trailColour),
    [world.adventure.trailColour],
  );
  return (
    <group name="watchtowers" onClick={chooseInstance(watchtowers, onChosen)}>
      <InstancedModel
        name="watchtower"
        things={things}
        buildGeometry={buildTowers}
        sink={propSink}
        tintSpread={0}
        grain={surfaceGrains.timber}
      />
    </group>
  );
};

export const buildSignGeometry = (accent: string): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.05, 0.06, 1.1, 6),
      colour: "#6b4a2f",
      position: [0, 0.55, 0],
    },
    {
      geometry: new BoxGeometry(0.9, 0.5, 0.07),
      colour: "#e8d2a6",
      position: [0, 1.05, 0],
    },
    {
      geometry: new BoxGeometry(0.96, 0.08, 0.09),
      colour: "#8b6440",
      position: [0, 1.33, 0],
    },
    {
      geometry: new CylinderGeometry(0.12, 0.12, 0.03, 14),
      colour: accent,
      position: [0, 1.05, 0.05],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

export const listPlacedThings = (
  places: readonly MapPoint[],
  findHeight: (point: MapPoint) => number,
  turnTowardsMiddle = false,
): ScatteredThing[] =>
  places.map((place) => ({
    ...place,
    height: Math.max(0, findHeight(place)),
    scale: 1,
    turn: turnTowardsMiddle ? Math.atan2(-place.x, -place.z) : 0,
  }));

export const SignPosts = ({
  adventure,
  accent,
  onChosen,
}: {
  adventure: IslandAdventure;
  accent: string;
  onChosen?: (sign: FactSign) => void;
}) => {
  const things = useMemo(
    () =>
      listPlacedThings(
        adventure.signs.map(({ position }) => position),
        adventure.findHeight,
        true,
      ),
    [adventure],
  );
  const buildSigns = useCallback(() => buildSignGeometry(accent), [accent]);
  return (
    <group
      name="fact-signs"
      onClick={chooseInstance(adventure.signs, onChosen)}
    >
      <InstancedModel
        name="fact-sign"
        things={things}
        buildGeometry={buildSigns}
        sink={propSink}
        tintSpread={0}
        grain={surfaceGrains.timber}
      />
    </group>
  );
};

const buildBouncePadGeometry = (colour: string): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.62, 0.7, 0.22, 14),
      colour: "#57534e",
      position: [0, 0.11, 0],
    },
    {
      geometry: new CylinderGeometry(0.55, 0.55, 0.08, 14),
      colour,
      position: [0, 0.25, 0],
    },
    {
      geometry: new TorusGeometry(0.58, 0.05, 5, 16),
      colour: "#fafaf9",
      position: [0, 0.27, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ]);

const pulseSeconds = 1.6;

const PulsingRings = ({
  things,
  colour,
}: {
  things: ScatteredThing[];
  colour: string;
}) => {
  const rings = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const placement = useMemo(() => new Object3D(), []);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const mesh = rings.current;
    if (mesh === null) {
      return;
    }
    const pulse = (age.current % pulseSeconds) / pulseSeconds;
    things.forEach((thing, index) => {
      placement.position.set(thing.x, thing.height + 0.24, thing.z);
      placement.rotation.set(-Math.PI / 2, 0, 0);
      placement.scale.setScalar(0.6 + pulse * 0.8);
      placement.updateMatrix();
      mesh.setMatrixAt(index, placement.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (!Array.isArray(mesh.material)) {
      mesh.material.opacity = 0.6 * (1 - pulse);
    }
  });
  return (
    <instancedMesh
      ref={rings}
      name="bounce-pad-glow"
      args={[undefined, undefined, things.length]}
      frustumCulled={false}
    >
      <ringGeometry args={[0.5, 0.62, 28]} />
      <meshBasicMaterial color={colour} transparent depthWrite={false} />
    </instancedMesh>
  );
};

export const BouncePads = ({ adventure }: { adventure: IslandAdventure }) => {
  const { colour, places } = adventure.bouncePads;
  const things = useMemo(
    () => listPlacedThings(places, adventure.findHeight),
    [places, adventure],
  );
  const buildPads = useCallback(() => buildBouncePadGeometry(colour), [colour]);
  return (
    <group name="bounce-pads">
      <InstancedModel
        name="bounce-pad"
        things={things}
        buildGeometry={buildPads}
        sink={0.08}
        tintSpread={0}
        grain={surfaceGrains.stone}
      />
      <PulsingRings things={things} colour={colour} />
    </group>
  );
};

export const buildHideawayGeometry = (canvas: string): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new ConeGeometry(1, 1.4, 4),
      colour: canvas,
      position: [0, 0.7, 0],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new BoxGeometry(0.46, 0.7, 0.04),
      colour: "#3f2a1c",
      position: [0, 0.35, 0.56],
      rotation: [-0.42, 0, 0],
    },
    {
      geometry: new CylinderGeometry(0.03, 0.03, 0.9, 4),
      colour: "#6b4a2f",
      position: [0, 1.75, 0],
    },
    {
      geometry: new BoxGeometry(0.34, 0.2, 0.02),
      colour: "#facc15",
      position: [0.17, 2.08, 0],
    },
    {
      geometry: new TorusGeometry(0.3, 0.07, 5, 10),
      colour: "#78716c",
      position: [1.2, 0.05, 0.9],
      rotation: [Math.PI / 2, 0, 0],
    },
    ...[0, 1, 2].map((log): ModelPart => ({
      geometry: new CylinderGeometry(0.05, 0.05, 0.5, 5),
      colour: "#7a5236",
      position: [1.2, 0.1, 0.9],
      rotation: [Math.PI / 2, (log * Math.PI) / 3, 0],
    })),
    {
      geometry: new ConeGeometry(0.16, 0.42, 6),
      colour: "#fb923c",
      position: [1.2, 0.32, 0.9],
    },
    {
      geometry: new ConeGeometry(0.08, 0.26, 5),
      colour: "#fde047",
      position: [1.2, 0.3, 0.9],
    },
  ]);

export const HideawayDens = ({
  adventure,
  canvas,
  onChosen,
}: {
  adventure: IslandAdventure;
  canvas: string;
  onChosen?: (hideaway: Hideaway) => void;
}) => {
  const things = useMemo(
    () =>
      listPlacedThings(
        adventure.hideaways.map(({ position }) => position),
        adventure.findHeight,
        true,
      ),
    [adventure],
  );
  const buildDens = useCallback(() => buildHideawayGeometry(canvas), [canvas]);
  return (
    <group
      name="hideaways"
      onClick={chooseInstance(adventure.hideaways, onChosen)}
    >
      <InstancedModel
        name="hideaway"
        things={things}
        buildGeometry={buildDens}
        sink={propSink}
        tintSpread={0}
        grain={surfaceGrains.timber}
      />
    </group>
  );
};

const trailLampSpacing = 13;
const trailLampSideStep = 0.85;

export const listTrailLampPlaces = (world: AdventureWorld): MapPoint[] =>
  world.adventure.trails
    .flatMap((trail) =>
      trail.slice(1).flatMap((end, index) => {
        const start = trail[index];
        const length = Math.hypot(end.x - start.x, end.z - start.z);
        const count = Math.floor(length / trailLampSpacing);
        return Array.from({ length: count }, (_, lamp) => {
          const along = (lamp + 0.5) / count;
          const side = lamp % 2 === 0 ? 1 : -1;
          return {
            x:
              start.x +
              (end.x - start.x) * along +
              (-(end.z - start.z) / length) * trailLampSideStep * side,
            z:
              start.z +
              (end.z - start.z) * along +
              ((end.x - start.x) / length) * trailLampSideStep * side,
          };
        });
      }),
    )
    .filter(
      (place) =>
        findWalkSurface(world, place, Infinity).kind === "ground" &&
        world.adventure.findHeight(place) > 0.15,
    );

export const buildTrailLampGeometry = (glass: string): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.04, 0.06, 1.2, 6),
      colour: "#3f3f46",
      position: [0, 0.6, 0],
    },
    {
      geometry: new BoxGeometry(0.2, 0.24, 0.2),
      colour: glass,
      position: [0, 1.32, 0],
    },
    {
      geometry: new ConeGeometry(0.18, 0.14, 4),
      colour: "#27272a",
      position: [0, 1.51, 0],
      rotation: [0, Math.PI / 4, 0],
    },
  ]);

export const TrailLamps = ({
  world,
  glass,
}: {
  world: AdventureWorld;
  glass: string;
}) => {
  const things = useMemo(
    () =>
      listPlacedThings(listTrailLampPlaces(world), world.adventure.findHeight),
    [world],
  );
  const buildLamps = useCallback(() => buildTrailLampGeometry(glass), [glass]);
  return things.length === 0 ? null : (
    <InstancedModel
      name="trail-lamps"
      things={things}
      buildGeometry={buildLamps}
      sink={propSink}
      tintSpread={0}
      grain={surfaceGrains.stone}
    />
  );
};

const treasureHover = 0.7;

const buildTreasureGeometry = (): BufferGeometry =>
  new OctahedronGeometry(0.26, 0);

export const TreasureGems = ({
  world,
  foundTreasureIds,
}: {
  world: AdventureWorld;
  foundTreasureIds: readonly string[];
}) => {
  const { treasureKind, treasures } = world.adventure;
  const hidden = useMemo(
    () =>
      treasures
        .filter(({ id }) => !foundTreasureIds.includes(id))
        .map((treasure) => ({
          ...treasure.position,
          height: findTreasureHeight(world, treasure),
        })),
    [treasures, foundTreasureIds, world],
  );
  const gems = useRef<InstancedMesh>(null);
  const glows = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const placement = useMemo(() => new Object3D(), []);
  const gemGeometry = useBuiltGeometry(buildTreasureGeometry);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const gemMesh = gems.current;
    const glowMesh = glows.current;
    if (gemMesh === null || glowMesh === null) {
      return;
    }
    hidden.forEach(({ x, z, height }, index) => {
      const phase = age.current + x + z;
      placement.position.set(
        x,
        height + treasureHover + Math.sin(phase * 2.4) * 0.12,
        z,
      );
      placement.rotation.set(0, phase * 1.6, 0);
      placement.scale.set(1, 1.4, 1);
      placement.updateMatrix();
      gemMesh.setMatrixAt(index, placement.matrix);
      placement.position.set(x, height + 0.06, z);
      placement.rotation.set(-Math.PI / 2, 0, 0);
      placement.scale.setScalar(1);
      placement.updateMatrix();
      glowMesh.setMatrixAt(index, placement.matrix);
    });
    gemMesh.count = hidden.length;
    glowMesh.count = hidden.length;
    gemMesh.instanceMatrix.needsUpdate = true;
    glowMesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="treasures">
      <instancedMesh
        ref={gems}
        name="treasure-gems"
        args={[gemGeometry, undefined, treasures.length]}
        castShadow
        frustumCulled={false}
      >
        <meshStandardMaterial
          color={treasureKind.colour}
          emissive={treasureKind.colour}
          emissiveIntensity={0.9}
          metalness={0.3}
          roughness={0.2}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={glows}
        name="treasure-glows"
        args={[undefined, undefined, treasures.length]}
        frustumCulled={false}
      >
        <circleGeometry args={[0.45, 20]} />
        <meshBasicMaterial
          color={treasureKind.colour}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
};

const ringLift = 1.3;
const startRingColour = "#facc15";
const raceRingColour = "#f472b6";

export const RaceRings = ({
  world,
  raceRunRef,
}: {
  world: AdventureWorld;
  raceRunRef: { current: RaceRun | undefined };
}) => {
  const { races } = world.adventure;
  const rings = useMemo(
    () =>
      races.flatMap((race) =>
        race.rings.map((ring, ringIndex) => ({
          raceId: race.id,
          ringIndex,
          x: ring.x,
          z: ring.z,
          height: findWalkSurface(world, ring, Infinity).height + ringLift,
          turn: findRingTurn(race, ringIndex),
        })),
      ),
    [races, world],
  );
  const mesh = useRef<InstancedMesh>(null);
  const age = useRef(0);
  const placement = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const ringMesh = mesh.current;
    if (ringMesh === null) {
      return;
    }
    const colour = new Color();
    rings.forEach(({ ringIndex }, index) => {
      ringMesh.setColorAt(
        index,
        colour.set(ringIndex === 0 ? startRingColour : raceRingColour),
      );
    });
    if (ringMesh.instanceColor !== null) {
      ringMesh.instanceColor.needsUpdate = true;
    }
  }, [rings]);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const ringMesh = mesh.current;
    if (ringMesh === null) {
      return;
    }
    const run = raceRunRef.current;
    const pulse = 1 + Math.sin(age.current * 4) * 0.08;
    rings.forEach(({ raceId, ringIndex, x, z, height, turn }, index) => {
      const isThisRace = run?.race.id === raceId;
      const isPassed = isThisRace && ringIndex < run.ringsPassed;
      const isNext = isThisRace
        ? ringIndex === run.ringsPassed
        : run === undefined && ringIndex === 0;
      placement.position.set(x, height, z);
      placement.rotation.set(0, turn, 0);
      placement.scale.setScalar(isPassed ? 0.001 : isNext ? 1.25 * pulse : 1);
      placement.updateMatrix();
      ringMesh.setMatrixAt(index, placement.matrix);
    });
    ringMesh.instanceMatrix.needsUpdate = true;
  });
  return rings.length === 0 ? null : (
    <instancedMesh
      ref={mesh}
      name="race-rings"
      args={[undefined, undefined, rings.length]}
      frustumCulled={false}
    >
      <torusGeometry args={[1.25, 0.12, 8, 28]} />
      <meshStandardMaterial
        emissive="#ffffff"
        emissiveIntensity={0.35}
        roughness={0.4}
      />
    </instancedMesh>
  );
};
