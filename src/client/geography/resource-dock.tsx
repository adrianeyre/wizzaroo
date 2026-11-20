import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Group,
} from "three";
import type { GeographyShowOf } from "../../curriculum/geography.js";
import { useDisposedOnUnmount } from "../studio-stage.js";
import { buildModelGeometry, type Triple } from "../world-map-models.js";
import {
  geographyPalette,
  useMotionScale,
  useSceneAge,
} from "./geography-kit.js";
import {
  crateInside,
  resourceModels,
  type ResourceMovingPart,
} from "./resource-models.js";
import { useRippleWaterMaterial } from "./ripple-water.js";

const waterLevel = -1.42;
const deckTop = -1.12;
const crateFloor = deckTop + 0.07;
const crateWallHeight = 0.2;
const crateWallThickness = 0.05;
const crateColour = "#c2410c";
const crateRib = "#9a3412";

const buildDockGeometry = (): BufferGeometry =>
  buildModelGeometry([
    ...Array.from({ length: 9 }, (_, plank) => ({
      geometry: new BoxGeometry(0.34, 0.06, 1.7),
      colour: plank % 2 === 0 ? "#a0703f" : "#8c5f33",
      position: [-1.4 + plank * 0.35, deckTop - 0.03, 0] satisfies Triple,
    })),
    ...[-1.45, 0, 1.45].flatMap((x) =>
      [-0.75, 0.75].map((z) => ({
        geometry: new CylinderGeometry(0.07, 0.08, 0.5, 10),
        colour: geographyPalette.woodDark,
        position: [x, deckTop - 0.28, z] satisfies Triple,
      })),
    ),
    ...[-1.45, 1.45].map((x) => ({
      geometry: new CylinderGeometry(0.06, 0.07, 0.22, 10),
      colour: "#3b3f46",
      position: [x, deckTop + 0.11, 0.72] satisfies Triple,
    })),
  ]);

const buildCrateGeometry = (): BufferGeometry => {
  const width = crateInside.halfWidth * 2 + crateWallThickness * 2;
  const depth = crateInside.halfDepth * 2 + crateWallThickness * 2;
  const wallY = crateFloor + crateWallHeight / 2;
  return buildModelGeometry([
    {
      geometry: new BoxGeometry(width, 0.06, depth),
      colour: crateRib,
      position: [0, crateFloor - 0.03, 0],
    },
    {
      geometry: new BoxGeometry(
        width,
        crateWallHeight * 2.2,
        crateWallThickness,
      ),
      colour: crateColour,
      position: [0, crateFloor + crateWallHeight * 1.1, -depth / 2],
    },
    ...[-1, 1].map((side) => ({
      geometry: new BoxGeometry(crateWallThickness, crateWallHeight, depth),
      colour: crateColour,
      position: [(side * width) / 2, wallY, 0] satisfies Triple,
    })),
    {
      geometry: new BoxGeometry(width, 0.04, 0.32),
      colour: crateColour,
      position: [0, crateFloor - 0.02, depth / 2 + 0.16],
      rotation: [0.18, 0, 0],
    },
    ...[-0.45, 0, 0.45].map((x) => ({
      geometry: new BoxGeometry(0.04, crateWallHeight * 2.2, 0.02),
      colour: crateRib,
      position: [
        x,
        crateFloor + crateWallHeight * 1.1,
        -depth / 2 + 0.03,
      ] satisfies Triple,
    })),
  ]);
};

const buildCraneGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new BoxGeometry(0.14, 2.3, 0.14),
      colour: "#f2b705",
      position: [1.35, deckTop + 1.15, -0.55],
    },
    {
      geometry: new BoxGeometry(1.5, 0.1, 0.1),
      colour: "#f2b705",
      position: [0.65, deckTop + 2.25, -0.55],
    },
    {
      geometry: new BoxGeometry(0.3, 0.24, 0.3),
      colour: "#2f3640",
      position: [1.35, deckTop + 2.2, -0.55],
    },
  ]);

const buildHookGeometry = (): BufferGeometry =>
  buildModelGeometry([
    {
      geometry: new CylinderGeometry(0.008, 0.008, 0.55, 5),
      colour: "#2f3640",
      position: [0, -0.275, 0],
    },
    {
      geometry: new TorusGeometry(0.06, 0.016, 6, 14, Math.PI * 1.4),
      colour: "#8a8f99",
      position: [0, -0.6, 0],
    },
  ]);

const MovingPart = ({ moving }: { moving: ResourceMovingPart }) => {
  const geometry = useMemo(() => moving.buildPart(), [moving]);
  useDisposedOnUnmount(geometry);
  const holder = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    const body = holder.current;
    if (body === null) {
      return;
    }
    const time = age.current * motionScale;
    switch (moving.motion) {
      case "spin":
        body.rotation.z = time * 2.4;
        return;
      case "flicker":
        body.scale.set(1, 1 + Math.sin(time * 14) * 0.12, 1);
        return;
      case "rise":
        body.position.y = moving.pivot[1] + ((time * 0.25) % 0.3);
        return;
    }
  });

  return (
    <group ref={holder} position={moving.pivot}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
    </group>
  );
};

const SwingingHook = () => {
  const geometry = useMemo(() => buildHookGeometry(), []);
  useDisposedOnUnmount(geometry);
  const hook = useRef<Group>(null);
  const age = useSceneAge();
  const motionScale = useMotionScale();

  useFrame(() => {
    if (hook.current !== null) {
      hook.current.rotation.z =
        Math.sin(age.current * 1.3) * 0.12 * motionScale;
    }
  });

  return (
    <group ref={hook} position={[0.05, deckTop + 2.2, -0.55]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
};

export const ResourceDockScene = ({
  show,
}: {
  show: GeographyShowOf<"resource-dock">;
}) => {
  const model = resourceModels[show.resource];
  const props = useMemo(
    () => ({
      dock: buildDockGeometry(),
      crate: buildCrateGeometry(),
      crane: buildCraneGeometry(),
    }),
    [],
  );
  const body = useMemo(() => model.buildBody(), [model]);
  useDisposedOnUnmount(props.dock);
  useDisposedOnUnmount(props.crate);
  useDisposedOnUnmount(props.crane);
  useDisposedOnUnmount(body);
  const water = useRippleWaterMaterial({ colour: geographyPalette.sea });

  return (
    <group
      name="resource-dock"
      rotation={[0.26, -0.25, 0]}
      position={[0, 0.38, 0.1]}
    >
      <mesh
        position={[0, waterLevel, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={water}
      >
        <circleGeometry args={[1.95, 40]} />
      </mesh>
      <mesh geometry={props.dock}>
        <meshStandardMaterial vertexColors roughness={0.8} />
      </mesh>
      <mesh geometry={props.crane}>
        <meshStandardMaterial vertexColors roughness={0.45} metalness={0.2} />
      </mesh>
      <SwingingHook />
      <group position={[-0.15, 0, 0.1]}>
        <mesh geometry={props.crate}>
          <meshPhysicalMaterial vertexColors roughness={0.5} clearcoat={0.4} />
        </mesh>
        <group position={[0, crateFloor, 0]} name={`resource-${show.resource}`}>
          <mesh geometry={body}>
            <meshPhysicalMaterial
              vertexColors
              roughness={model.finish.roughness}
              metalness={model.finish.metalness}
              clearcoat={0.3}
            />
          </mesh>
          {model.moving === undefined ? null : (
            <MovingPart key={show.resource} moving={model.moving} />
          )}
        </group>
      </group>
    </group>
  );
};
