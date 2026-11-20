import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExtrudeGeometry, Shape, type Group } from "three";
import { ChestScene, chestPalette } from "../mission/family-chest.js";
import { getMotionScale } from "../reduced-motion.js";
import { StudioReflections, useDisposedOnUnmount } from "../studio-stage.js";

/**
 * The Awards page's 3D pictures (ADR 0063): a cluster of gold Stars for a Child's Stars, and the Family Chest, spilling
 * its coins. This module, and the Family Chest's scene, are loaded only when the Awards page draws them.
 */

export const starsPalette = {
  gold: "#f5c242",
  goldEdge: "#ffe08a",
  keyLight: "#fff1d6",
  rimLight: "#9cc4ff",
} as const;

const starPoints = 5;
const starOuterRadius = 1;
const starInnerRadius = 0.45;
const starDepth = 0.22;
/** Seconds for each Star to turn once all the way round. */
export const starTurnSeconds = 9;
const bobSeconds = 3.2;
const bobHeight = 0.08;
/** Seconds for the Stars' quick spin when a Parent gives some. */
export const celebrationSeconds = 1.1;

interface PlacedStar {
  name: string;
  position: [number, number, number];
  scale: number;
  /** Where in its turn and bob the Star starts, so the three aren't in step. */
  phase: number;
}

export const placedStars: readonly PlacedStar[] = [
  { name: "star-middle", position: [0, 0.15, 0], scale: 1, phase: 0 },
  {
    name: "star-left",
    position: [-1.55, -0.35, -0.6],
    scale: 0.62,
    phase: 1.9,
  },
  { name: "star-right", position: [1.5, -0.25, -0.5], scale: 0.7, phase: 3.7 },
];

export const buildStarGeometry = (): ExtrudeGeometry => {
  const outline = new Shape();
  for (let point = 0; point <= starPoints * 2; point += 1) {
    const radius = point % 2 === 0 ? starOuterRadius : starInnerRadius;
    const angle = Math.PI / 2 + (point * Math.PI) / starPoints;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) {
      outline.moveTo(x, y);
    } else {
      outline.lineTo(x, y);
    }
  }
  const geometry = new ExtrudeGeometry(outline, {
    depth: starDepth,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 1,
  });
  geometry.center();
  return geometry;
};

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

/** The three Stars, turning and bobbing gently, with a quick spin each time celebrationCount goes up. */
export const StarsCluster = ({
  celebrationCount,
}: {
  celebrationCount: number;
}) => {
  const [motionScale] = useState(getMotionScale);
  const geometry = useMemo(() => buildStarGeometry(), []);
  useDisposedOnUnmount(geometry);
  const starRefs = useRef<(Group | null)[]>([]);
  const age = useRef(0);
  const celebrationAge = useRef(Number.POSITIVE_INFINITY);

  useEffect(() => {
    if (celebrationCount > 0 && motionScale > 0) {
      celebrationAge.current = 0;
    }
  }, [celebrationCount, motionScale]);

  useFrame((_state, deltaSeconds) => {
    const step = Math.min(deltaSeconds, 1 / 20);
    age.current += step * motionScale;
    celebrationAge.current += step;
    const celebration =
      celebrationAge.current < celebrationSeconds
        ? easeOutCubic(celebrationAge.current / celebrationSeconds)
        : 0;
    starRefs.current.forEach((star, index) => {
      const placed = placedStars.at(index);
      if (star === null || placed === undefined) {
        return;
      }
      const turn =
        ((age.current + placed.phase) * Math.PI * 2) / starTurnSeconds;
      star.rotation.y = turn + celebration * Math.PI * 2;
      star.position.y =
        placed.position[1] +
        Math.sin(((age.current + placed.phase) * Math.PI * 2) / bobSeconds) *
          bobHeight;
      star.scale.setScalar(
        placed.scale * (1 + Math.sin(celebration * Math.PI) * 0.18),
      );
    });
  });

  return (
    <>
      {placedStars.map(({ name, position, scale, phase }, index) => (
        <group
          key={name}
          name={name}
          ref={(star) => {
            starRefs.current[index] = star;
          }}
          position={position}
          scale={scale}
          rotation={[0, (phase * Math.PI * 2) / starTurnSeconds, 0]}
        >
          <mesh geometry={geometry}>
            <meshPhysicalMaterial
              color={starsPalette.gold}
              emissive={starsPalette.goldEdge}
              emissiveIntensity={0.08}
              metalness={1}
              roughness={0.22}
              clearcoat={0.6}
              clearcoatRoughness={0.12}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

const StarsLights = () => (
  <>
    <ambientLight intensity={0.3} />
    <directionalLight
      position={[2.5, 3.5, 4]}
      intensity={2.4}
      color={starsPalette.keyLight}
    />
    <directionalLight
      position={[-3.5, 1.5, -2]}
      intensity={1.4}
      color={starsPalette.rimLight}
    />
  </>
);

/** A Child's Stars as three gold Stars in 3D, on a stage of their own. */
export const StarsStage = ({
  celebrationCount,
}: {
  celebrationCount: number;
}) => {
  const isTurning = getMotionScale() > 0;
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={isTurning ? "always" : "demand"}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0.2, 5.4], fov: 34 }}
    >
      <StudioReflections intensity={0.9} />
      <StarsLights />
      <StarsCluster celebrationCount={celebrationCount} />
    </Canvas>
  );
};

/** The Family Chest in 3D, as the Children see it, spilling one gold coin for each Activity in it. */
export const ChestStage = ({ coinCount }: { coinCount: number }) => (
  <Canvas
    dpr={[1, 2]}
    gl={{ antialias: true }}
    camera={{ position: [0, 2.2, 5.4], fov: 38 }}
    style={{ background: chestPalette.backdropEdge }}
  >
    <StudioReflections />
    <ChestScene coinCount={coinCount} />
  </Canvas>
);
