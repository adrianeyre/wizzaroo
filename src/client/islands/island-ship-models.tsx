import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type Group,
  type Mesh,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import {
  buildShipGeometry,
  shipFlagHoists,
  type FlagHoist,
} from "./island-ship-design.js";
import {
  buildIslandFlagpoleGeometry,
  findIslandFlagpole,
  islandFlagHoists,
} from "./island-flagpole.js";
import { buildHoverSlipwayGeometry } from "./island-hover-slipway.js";
import { useWizzarooFlagTexture } from "./island-livery-models.js";
import { buildMapHarbourGeometry } from "./island-map-harbour.js";
import { listOverheadLineGeometries } from "./island-overhead-line.js";
import { buildMapRailwayGeometry } from "./island-railway-design.js";
import type { Railway } from "./island-railway.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { buildAirfieldGeometry } from "./island-airfield-design.js";
import { VoyageCraft } from "./island-aircraft-models.js";
import {
  findCraftPlacement,
  findCraftPose,
  findLandPhaseSeconds,
  type Transport,
} from "./island-journey.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry, type ModelPart } from "../world-map-models.js";
import { GrainedMaterial } from "../world-map-scene.js";
import { surfaceGrains } from "../world-map-shaders.js";
import {
  buildDockPier,
  exploreScale,
  findExploreAdventure,
  type IslandAdventure,
} from "./island-adventures.js";
import {
  findGangway,
  findPlankReach,
  findShipPlacement,
  shipDeckHeight,
  voyagePhaseSeconds,
  type ShipPlacement,
  type VoyagePhase,
} from "./island-voyage.js";

export interface VoyageClock {
  phase: VoyagePhase | undefined;
  seconds: number;
}

export const advanceVoyageClock = (
  clock: { current: VoyageClock },
  phase: VoyagePhase | undefined,
  deltaSeconds: number,
) => {
  if (clock.current.phase !== phase) {
    clock.current = { phase, seconds: 0 };
    return;
  }
  clock.current.seconds += deltaSeconds;
};

const flagColumns = 12;
const flagRows = 4;
const flagBackGap = 0.006;
const flagWaveHeight = 0.14;
const flagWaveSpeed = 3.2;

interface FlagCloth {
  geometry: BufferGeometry;
  rest: Float32Array;
  flyShares: Float32Array;
  sides: Float32Array;
}

export const buildFlagCloth = (hoists: readonly FlagHoist[]): FlagCloth => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const flyShares: number[] = [];
  const sides: number[] = [];
  const indices: number[] = [];
  hoists.forEach(({ top, width, height }) => {
    [1, -1].forEach((side) => {
      const first = positions.length / 3;
      for (let row = 0; row <= flagRows; row++) {
        for (let column = 0; column <= flagColumns; column++) {
          const fly = column / flagColumns;
          const drop = row / flagRows;
          positions.push(
            top[0] + side * flagBackGap,
            top[1] - drop * height,
            top[2] - fly * width,
          );
          uvs.push(side > 0 ? fly : 1 - fly, 1 - drop);
          flyShares.push(fly * width);
          sides.push(side);
        }
      }
      for (let row = 0; row < flagRows; row++) {
        for (let column = 0; column < flagColumns; column++) {
          const corner = first + row * (flagColumns + 1) + column;
          const along = corner + 1;
          const below = corner + flagColumns + 1;
          const belowAlong = below + 1;
          if (side > 0) {
            indices.push(corner, below, along, along, below, belowAlong);
          } else {
            indices.push(corner, along, below, along, belowAlong, below);
          }
        }
      }
    });
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return {
    geometry,
    rest: new Float32Array(positions),
    flyShares: new Float32Array(flyShares),
    sides: new Float32Array(sides),
  };
};

export const waveFlagCloth = (cloth: FlagCloth, seconds: number): void => {
  const position = cloth.geometry.getAttribute("position");
  for (let vertex = 0; vertex < position.count; vertex++) {
    const fly = cloth.flyShares[vertex];
    const ripple =
      Math.sin(seconds * flagWaveSpeed - fly * 2.6) * flagWaveHeight * fly +
      Math.sin(seconds * flagWaveSpeed * 1.7 - fly * 4.1) *
        flagWaveHeight *
        0.35 *
        fly;
    position.setX(vertex, cloth.rest[vertex * 3] + ripple);
  }
  position.needsUpdate = true;
  cloth.geometry.computeVertexNormals();
};

const WizzarooFlags = ({
  hoists = shipFlagHoists,
  name = "wizzaroo-flags",
}: {
  hoists?: readonly FlagHoist[];
  name?: string;
}) => {
  const cloth = useMemo(() => buildFlagCloth(hoists), [hoists]);
  const texture = useWizzarooFlagTexture();
  const age = useRef(0);
  useEffect(
    () => () => {
      cloth.geometry.dispose();
    },
    [cloth],
  );
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    waveFlagCloth(cloth, age.current);
  });
  return (
    <mesh name={name} geometry={cloth.geometry} castShadow>
      <meshStandardMaterial map={texture} roughness={0.85} />
    </mesh>
  );
};

export const VoyageShip = ({
  findPlacement,
  scale = 1,
  name = "voyage-ship",
}: {
  findPlacement: (deltaSeconds: number) => ShipPlacement | undefined;
  scale?: number;
  name?: string;
}) => {
  const geometry = useBuiltGeometry(buildShipGeometry);
  const ship = useRef<Group>(null);
  const age = useRef(0);
  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    const placement = findPlacement(deltaSeconds);
    if (ship.current === null) {
      return;
    }
    ship.current.visible = placement !== undefined;
    if (placement === undefined) {
      return;
    }
    ship.current.position.set(
      placement.x,
      Math.sin(age.current * 1.4) * 0.08 * scale,
      placement.z,
    );
    ship.current.rotation.set(
      Math.sin(age.current * 1.1) * 0.025,
      placement.heading,
      Math.sin(age.current * 0.9) * 0.035,
    );
  });
  return (
    <group ref={ship} name={name} scale={scale} visible={false}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <GrainedMaterial grain={surfaceGrains.metal} />
      </mesh>
      <WizzarooFlags />
    </group>
  );
};

const pileSpacing = 3.2;

export const buildDockGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const pier = buildDockPier(adventure);
  const { from, to, berthSide } = adventure.dock;
  const length = Math.hypot(to.x - from.x, to.z - from.z);
  const width = pier.halfWidth * 2;
  const deck = pier.endHeight;
  const plankCount = Math.round(length / 0.9);
  const planks = Array.from({ length: plankCount }, (_, plank): ModelPart => ({
    geometry: new BoxGeometry(length / plankCount - 0.06, 0.18, width),
    colour: plank % 2 === 0 ? "#a77b4f" : "#93683f",
    position: [((plank + 0.5) / plankCount) * length, deck - 0.09, 0],
  }));
  const pileCount = Math.floor(length / pileSpacing) + 1;
  const piles = Array.from({ length: pileCount }, (_, pile) =>
    [-1, 1].map((side): ModelPart => ({
      geometry: new CylinderGeometry(0.2, 0.24, deck + 4, 7),
      colour: "#5b3a22",
      position: [
        Math.min(length - 0.25, 0.25 + pile * pileSpacing),
        (deck - 4) / 2 + 0.25,
        side * (pier.halfWidth - 0.15),
      ],
    })),
  ).flat();
  const berthEdge = -berthSide * (pier.halfWidth - 0.2);
  const bollards = [0.55, 0.85].map((share): ModelPart => ({
    geometry: new CylinderGeometry(0.16, 0.2, 0.45, 8),
    colour: "#1f2937",
    position: [length * share, deck + 0.2, berthEdge],
  }));
  const lamp: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.07, 0.09, 2.6, 6),
      colour: "#27272a",
      position: [length - 0.4, deck + 1.3, -berthEdge],
    },
    {
      geometry: new SphereGeometry(0.22, 8, 6),
      colour: "#fde68a",
      position: [length - 0.4, deck + 2.7, -berthEdge],
    },
  ];
  const turn = Math.atan2(-(to.z - from.z), to.x - from.x);
  const findStandingHeight = (along: number, aside: number): number =>
    Math.max(
      deck,
      adventure.findHeight({
        x: from.x + along * Math.cos(turn) + aside * Math.sin(turn),
        z: from.z - along * Math.sin(turn) + aside * Math.cos(turn),
      }),
    );
  const hutAlong = length * 0.3;
  const hutSide = -berthSide * (pier.halfWidth + 2.2);
  const hutFloor = findStandingHeight(hutAlong, hutSide) - 0.3;
  const hut: ModelPart[] = [
    {
      geometry: new BoxGeometry(3, 2.2 + hutFloor + 4, 2.6),
      colour: "#f1f5f9",
      position: [hutAlong, (hutFloor + 2.2 - 4) / 2, hutSide],
    },
    {
      geometry: new ConeGeometry(2.3, 1.2, 4),
      colour: "#dc2626",
      position: [hutAlong, hutFloor + 2.8, hutSide],
      rotation: [0, Math.PI / 4, 0],
    },
    {
      geometry: new BoxGeometry(0.7, 1.3, 0.05),
      colour: "#1e3a8a",
      position: [hutAlong, hutFloor + 0.65, hutSide + berthSide * 1.31],
    },
  ];
  const crates = [0, 1, 2].map((crate): ModelPart => {
    const along = length * 0.45 + (crate % 2) * 0.9;
    return {
      geometry: new BoxGeometry(0.8, 0.8, 0.8),
      colour: crate === 1 ? "#b45309" : "#a16207",
      position: [
        along,
        findStandingHeight(along, -berthEdge * 0.75) +
          0.4 +
          (crate === 2 ? 0.8 : 0),
        -berthEdge * 0.75,
      ],
      rotation: [0, crate * 0.3, 0],
    };
  });
  const sign: ModelPart[] = [
    {
      geometry: new CylinderGeometry(0.06, 0.06, 1.8, 5),
      colour: "#6b4a2f",
      position: [length * 0.5, deck + 0.9, berthEdge],
    },
    {
      geometry: new BoxGeometry(0.1, 0.7, 1.4),
      colour: "#1e3a8a",
      position: [length * 0.5, deck + 1.7, berthEdge],
    },
    {
      geometry: new TorusGeometry(0.18, 0.05, 5, 10),
      colour: "#facc15",
      position: [length * 0.5 + 0.06, deck + 1.72, berthEdge],
      rotation: [0, Math.PI / 2, 0],
    },
  ];
  return buildModelGeometry([
    ...planks,
    ...piles,
    ...bollards,
    ...lamp,
    ...hut,
    ...crates,
    ...sign,
  ])
    .rotateY(turn)
    .translate(from.x, 0, from.z);
};

const IslandFlag = ({ adventure }: { adventure: IslandAdventure }) => {
  const { x, y, z, heading } = findIslandFlagpole(adventure);
  return (
    <group position={[x, y, z]} rotation={[0, heading, 0]}>
      <WizzarooFlags hoists={islandFlagHoists} name="island-flag" />
    </group>
  );
};

export const IslandDock = ({
  islandId,
  hasFlag = false,
  isOnMap = false,
  mapRailway,
}: {
  islandId: string;
  hasFlag?: boolean;
  isOnMap?: boolean;
  mapRailway?: Railway;
}) => {
  const adventure = findExploreAdventure(islandId);
  const geometry = useBuiltGeometry(
    useCallback(() => {
      const built = findExploreAdventure(islandId);
      return mergeGeometries([
        buildDockGeometry(built),
        buildAirfieldGeometry(built),
        buildHoverSlipwayGeometry(built),
        ...(hasFlag ? [buildIslandFlagpoleGeometry(built)] : []),
        ...(isOnMap ? [buildMapHarbourGeometry(built)] : []),
        ...(mapRailway === undefined
          ? []
          : [
              buildMapRailwayGeometry(mapRailway, built),
              ...listOverheadLineGeometries(mapRailway, "map"),
            ]),
      ]).scale(1 / exploreScale, 1 / exploreScale, 1 / exploreScale);
    }, [islandId, hasFlag, isOnMap, mapRailway]),
  );
  return (
    <>
      <mesh name="dock" geometry={geometry} castShadow receiveShadow>
        <GrainedMaterial grain={surfaceGrains.timber} />
      </mesh>
      {hasFlag ? (
        <group scale={1 / exploreScale}>
          <IslandFlag adventure={adventure} />
        </group>
      ) : null}
    </>
  );
};

const plankWidth = 1;
const plankThickness = 0.12;

const Gangplank = ({
  adventure,
  clock,
}: {
  adventure: IslandAdventure;
  clock: RefObject<VoyageClock>;
}) => {
  const plank = useRef<Mesh>(null);
  useFrame(() => {
    const mesh = plank.current;
    if (mesh === null) {
      return;
    }
    const { phase, seconds } = clock.current;
    if (phase === undefined || phase === "crossing") {
      mesh.visible = false;
      return;
    }
    const share = Math.min(1, seconds / voyagePhaseSeconds[phase]);
    const reach = findPlankReach(phase, share);
    mesh.visible = reach > 0.01;
    const ship = findShipPlacement(adventure.dock, phase, share);
    const { shipEnd, heading, length } = findGangway(adventure.dock, ship);
    const shown = length * reach;
    mesh.position.set(
      shipEnd.x + Math.sin(heading) * (shown / 2),
      shipDeckHeight - plankThickness / 2,
      shipEnd.z + Math.cos(heading) * (shown / 2),
    );
    mesh.rotation.set(0, heading, 0);
    mesh.scale.set(1, 1, Math.max(0.01, shown));
  });
  return (
    <mesh ref={plank} name="gangplank" visible={false} castShadow receiveShadow>
      <boxGeometry args={[plankWidth, plankThickness, 1]} />
      <GrainedMaterial grain={surfaceGrains.timber} />
    </mesh>
  );
};

const IslandDockShip = ({
  adventure,
  clock,
}: {
  adventure: IslandAdventure;
  clock: RefObject<VoyageClock>;
}) => {
  const findPlacement = () => {
    const { phase, seconds } = clock.current;
    return phase === undefined || phase === "crossing"
      ? undefined
      : findShipPlacement(
          adventure.dock,
          phase,
          Math.min(1, seconds / voyagePhaseSeconds[phase]),
        );
  };
  return (
    <>
      <VoyageShip findPlacement={findPlacement} />
      <Gangplank adventure={adventure} clock={clock} />
    </>
  );
};

export const IslandJourneyCraft = ({
  adventure,
  transport,
  clock,
}: {
  adventure: IslandAdventure;
  transport: Transport;
  clock: RefObject<VoyageClock>;
}) => {
  if (transport === "ship") {
    return <IslandDockShip adventure={adventure} clock={clock} />;
  }
  const findPose = () => {
    const { phase, seconds } = clock.current;
    if (phase === undefined || phase === "crossing") {
      return undefined;
    }
    const share = Math.min(1, seconds / findLandPhaseSeconds(transport, phase));
    return findCraftPose(
      adventure,
      transport,
      phase,
      share,
      findCraftPlacement(adventure, transport, phase, share),
    );
  };
  return (
    <VoyageCraft
      craft={transport}
      findPose={findPose}
      name={`voyage-${transport}`}
    />
  );
};
