import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import { isMotionReduced } from "../reduced-motion.js";
import { StudioReflections } from "../studio-stage.js";
import { awardDesigns, findAwardDesign } from "./award-designs.js";
import {
  buildAwardMaterials,
  buildAwardMeshes,
  findAwardHeight,
} from "./award-model.js";

/** Seconds for an Award to turn once all the way round: slow and steady. */
export const awardTurnSeconds = 14;

/** Where each Award starts turned to, so a row of them isn't in step. */
const findStartingTurn = (islandId: string) =>
  awardDesigns.findIndex((design) => design.islandId === islandId) * 1.1;

/** One Island's Award, turning slowly round and round unless motion is reduced. */
export const AwardFigure = ({
  islandId,
  isTurning,
}: {
  islandId: string;
  isTurning: boolean;
}) => {
  const design = findAwardDesign(islandId);
  const meshes = useMemo(() => buildAwardMeshes(design), [design]);
  const materials = useMemo(() => buildAwardMaterials(design), [design]);
  const turntable = useRef<Group>(null);

  useEffect(
    () => () => {
      meshes.forEach(({ geometry }) => {
        geometry.dispose();
      });
      Object.values(materials).forEach((material) => {
        material.dispose();
      });
    },
    [meshes, materials],
  );

  useFrame((_, delta) => {
    if (!isTurning || turntable.current === null) {
      return;
    }
    turntable.current.rotation.y += (delta * Math.PI * 2) / awardTurnSeconds;
  });

  const shadow = meshes.find(({ finish }) => finish === "shadow");
  return (
    <group name={`award-${islandId}`}>
      {shadow === undefined ? null : (
        <mesh
          name={shadow.name}
          geometry={shadow.geometry}
          material={materials.shadow}
          renderOrder={-1}
        />
      )}
      <group
        ref={turntable}
        name="award-turntable"
        rotation={[0, findStartingTurn(islandId), 0]}
      >
        {meshes
          .filter(({ finish }) => finish !== "shadow")
          .map(({ name, finish, geometry }) => (
            <mesh
              key={name}
              name={name}
              geometry={geometry}
              material={materials[finish]}
            />
          ))}
      </group>
    </group>
  );
};

const AwardLights = () => (
  <>
    <ambientLight intensity={0.25} />
    <directionalLight position={[2.5, 4, 3.5]} intensity={2.6} />
    <directionalLight
      position={[-3.5, 2.5, -2]}
      intensity={1.6}
      color="#cfe3ff"
    />
    <directionalLight position={[0, 1.2, 4]} intensity={0.5} color="#fff1d6" />
  </>
);

/**
 * An Award drawn live in 3D, at up to twice the screen's resolution, on
 * its own small stage (ADR 0059).
 */
export const AwardStage = ({
  islandId,
  label,
}: {
  islandId: string;
  label: string;
}) => {
  const isTurning = !isMotionReduced();
  const middle = findAwardHeight(findAwardDesign(islandId)) / 2;
  return (
    <div className="award-stage" role="img" aria-label={label}>
      <Canvas
        dpr={[1, 2]}
        frameloop={isTurning ? "always" : "demand"}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, middle + 0.45, 5.6], fov: 30 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, middle, 0);
        }}
      >
        <StudioReflections intensity={1} />
        <AwardLights />
        <AwardFigure islandId={islandId} isTurning={isTurning} />
      </Canvas>
    </div>
  );
};
