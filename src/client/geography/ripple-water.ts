import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  DataTexture,
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshPhysicalMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  type ColorRepresentation,
} from "three";
import { useMotionScale } from "./geography-kit.js";

const rippleTextureSize = 64;
const rippleOffset = new Vector2();

const findRippleBrightness = (u: number, v: number): number => {
  const turn = Math.PI * 2;
  const wobble = 0.12 * Math.sin(turn * (2 * v + u));
  const swell = 0.5 + 0.5 * Math.sin(turn * (3 * u + wobble + 2 * v));
  const crest = swell ** 8;
  const cross = 0.5 + 0.5 * Math.sin(turn * (4 * v - u));
  return Math.min(1, 0.74 + 0.08 * cross + 0.26 * crest);
};

export const buildRippleTexture = (): DataTexture => {
  const texels = new Uint8Array(rippleTextureSize * rippleTextureSize * 4);
  for (let row = 0; row < rippleTextureSize; row++) {
    for (let column = 0; column < rippleTextureSize; column++) {
      const brightness = Math.round(
        255 *
          findRippleBrightness(
            column / rippleTextureSize,
            row / rippleTextureSize,
          ),
      );
      texels.set(
        [brightness, brightness, brightness, 255],
        (row * rippleTextureSize + column) * 4,
      );
    }
  }
  const ripples = new DataTexture(texels, rippleTextureSize, rippleTextureSize);
  ripples.wrapS = RepeatWrapping;
  ripples.wrapT = RepeatWrapping;
  ripples.magFilter = LinearFilter;
  ripples.minFilter = LinearMipmapLinearFilter;
  ripples.generateMipmaps = true;
  ripples.colorSpace = SRGBColorSpace;
  ripples.needsUpdate = true;
  return ripples;
};

export interface RippleWaterLook {
  colour: ColorRepresentation;
  opacity?: number;
  repeat?: number;
  flowSpeed?: number;
}

export const useRippleWaterMaterial = ({
  colour,
  opacity = 0.92,
  repeat = 3,
  flowSpeed = 0.03,
}: RippleWaterLook): MeshPhysicalMaterial => {
  const motionScale = useMotionScale();
  const material = useMemo(() => {
    const ripples = buildRippleTexture();
    ripples.repeat.set(repeat, repeat);
    ripples.offset = rippleOffset;
    return new MeshPhysicalMaterial({
      color: colour,
      map: ripples,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: opacity < 1,
      opacity,
      side: DoubleSide,
    });
  }, [colour, opacity, repeat]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  useFrame((_state, deltaSeconds) => {
    rippleOffset.x =
      (rippleOffset.x + deltaSeconds * flowSpeed * 0.6 * motionScale) % 1;
    rippleOffset.y =
      (rippleOffset.y - deltaSeconds * flowSpeed * motionScale) % 1;
  });

  return material;
};
