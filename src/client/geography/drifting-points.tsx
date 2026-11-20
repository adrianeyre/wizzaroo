import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearFilter,
  PointsMaterial,
  type ColorRepresentation,
} from "three";
import { useMotionScale, useSceneAge } from "./geography-kit.js";
import { findScatter } from "./miniature-parts.js";

const dotTextureSize = 32;

export const buildSoftDotTexture = (): DataTexture => {
  const texels = new Uint8Array(dotTextureSize * dotTextureSize * 4);
  const middle = (dotTextureSize - 1) / 2;
  for (let row = 0; row < dotTextureSize; row++) {
    for (let column = 0; column < dotTextureSize; column++) {
      const reach = Math.hypot(column - middle, row - middle) / middle;
      const alpha = Math.max(0, Math.min(1, (1 - reach) * 1.6)) ** 1.4;
      texels.set(
        [255, 255, 255, Math.round(alpha * 255)],
        (row * dotTextureSize + column) * 4,
      );
    }
  }
  const dot = new DataTexture(texels, dotTextureSize, dotTextureSize);
  dot.magFilter = LinearFilter;
  dot.minFilter = LinearFilter;
  dot.needsUpdate = true;
  return dot;
};

export interface DriftingBox {
  centre: readonly [number, number, number];
  size: readonly [number, number, number];
}

export interface DriftingPointsProps {
  count: number;
  box: DriftingBox;
  colour: ColorRepresentation;
  size: number;
  fallSpeed: number;
  sway?: number;
  opacity?: number;
  salt?: number;
}

interface DriftingCloud {
  geometry: BufferGeometry;
  material: PointsMaterial;
  restingX: Float32Array;
  phases: Float32Array;
}

const buildDriftingCloud = (
  count: number,
  box: DriftingBox,
  colour: ColorRepresentation,
  size: number,
  opacity: number,
  salt: number,
): DriftingCloud => {
  const positions = new Float32Array(count * 3);
  const restingX = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const x = box.centre[0] + (findScatter(index, salt) - 0.5) * box.size[0];
    const y =
      box.centre[1] + (findScatter(index, salt + 1) - 0.5) * box.size[1];
    const z =
      box.centre[2] + (findScatter(index, salt + 2) - 0.5) * box.size[2];
    positions.set([x, y, z], index * 3);
    restingX[index] = x;
    phases[index] = findScatter(index, salt + 3) * Math.PI * 2;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const material = new PointsMaterial({
    color: colour,
    size,
    map: buildSoftDotTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return { geometry, material, restingX, phases };
};

export const DriftingPoints = ({
  count,
  box,
  colour,
  size,
  fallSpeed,
  sway = 0.04,
  opacity = 0.9,
  salt = 1,
}: DriftingPointsProps) => {
  const motionScale = useMotionScale();
  const age = useSceneAge();
  const cloud = useMemo(
    () => buildDriftingCloud(count, box, colour, size, opacity, salt),
    [count, box, colour, size, opacity, salt],
  );

  useEffect(
    () => () => {
      cloud.geometry.dispose();
      cloud.material.map?.dispose();
      cloud.material.dispose();
    },
    [cloud],
  );

  useFrame((_state, deltaSeconds) => {
    if (motionScale === 0) {
      return;
    }
    const positions = cloud.geometry.getAttribute("position");
    const bottom = box.centre[1] - box.size[1] / 2;
    const height = box.size[1];
    for (let index = 0; index < count; index++) {
      const fallen = positions.getY(index) - fallSpeed * deltaSeconds - bottom;
      const y = bottom + (((fallen % height) + height) % height);
      const drift = Math.sin(age.current * 1.3 + cloud.phases[index]) * sway;
      positions.setXY(index, cloud.restingX[index] + drift, y);
    }
    positions.needsUpdate = true;
  });

  return (
    <points
      geometry={cloud.geometry}
      material={cloud.material}
      frustumCulled={false}
    />
  );
};
