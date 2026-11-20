import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { BufferGeometry, ShaderMaterial } from "three";
import { getMotionScale } from "./reduced-motion.js";
import {
  advanceShaderClock,
  buildWeatherUniforms,
  type WeatherUniforms,
} from "./world-map-shaders.js";

export const useBuiltGeometry = (
  buildGeometry: () => BufferGeometry,
): BufferGeometry => {
  const geometry = useMemo(() => buildGeometry(), [buildGeometry]);
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  return geometry;
};

export const useBuiltMaterial = <Material extends { dispose: () => void }>(
  buildMaterial: () => Material,
): Material => {
  const material = useMemo(() => buildMaterial(), [buildMaterial]);
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  return material;
};

export const useMotionScale = (): number => useState(getMotionScale)[0];

export const useShaderClock = (material: ShaderMaterial) => {
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    advanceShaderClock(material, deltaSeconds * motionScale);
  });
};

export const WeatherUniformsContext = createContext<WeatherUniforms>(
  buildWeatherUniforms(),
);

export const useWeatherUniforms = (): WeatherUniforms =>
  useContext(WeatherUniformsContext);
