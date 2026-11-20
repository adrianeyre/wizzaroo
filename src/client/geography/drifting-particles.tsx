import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  ShaderMaterial,
} from "three";
import { buildPaletteUniform } from "../pixel-pipeline.js";
import { cameraFieldOfView, useDisposedOnUnmount } from "../studio-stage.js";
import type { Triple } from "../world-map-models.js";
import { useMotionScale } from "./geography-kit.js";

export interface ParticleStream {
  from: Triple;
  spread: Triple;
  travel: Triple;
  count: number;
}

export type ParticleLook = "vapour" | "rain" | "drop";

const particleShapes: Record<ParticleLook, number> = {
  vapour: 0,
  rain: 1,
  drop: 2,
};

export const findScatter = (index: number, salt: number): number => {
  const wave = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return wave - Math.floor(wave);
};

export interface ParticleCloud {
  starts: Float32Array;
  travels: Float32Array;
  seeds: Float32Array;
}

export const buildParticleCloud = (
  streams: readonly ParticleStream[],
): ParticleCloud => {
  const total = streams.reduce((sum, stream) => sum + stream.count, 0);
  const starts = new Float32Array(total * 3);
  const travels = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  let particle = 0;
  for (const stream of streams) {
    for (let index = 0; index < stream.count; index++) {
      for (let axis = 0; axis < 3; axis++) {
        const jitter = findScatter(particle, axis + 1) * 2 - 1;
        starts[particle * 3 + axis] =
          stream.from[axis] + jitter * stream.spread[axis];
        travels[particle * 3 + axis] = stream.travel[axis];
      }
      seeds[particle] = findScatter(particle, 9);
      particle++;
    }
  }
  return { starts, travels, seeds };
};

const buildParticleGeometry = (
  streams: readonly ParticleStream[],
): BufferGeometry => {
  const { starts, travels, seeds } = buildParticleCloud(streams);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(starts, 3));
  geometry.setAttribute("travel", new BufferAttribute(travels, 3));
  geometry.setAttribute("seed", new BufferAttribute(seeds, 1));
  return geometry;
};

const particleVertexShader = `
attribute vec3 travel;
attribute float seed;
uniform float time;
uniform float speed;
uniform float size;
uniform float pixelsPerUnit;
uniform float sway;
varying float vFade;

void main() {
  float progress = fract(seed + time * speed);
  vec3 moved = position + travel * progress;
  moved.x += sin(progress * 9.0 + seed * 31.0) * sway;
  moved.z += cos(progress * 7.0 + seed * 23.0) * sway * 0.6;
  vFade = sin(progress * 3.14159);
  vec4 viewed = modelViewMatrix * vec4(moved, 1.0);
  float worldScale = length(modelMatrix[0].xyz);
  gl_PointSize = size * worldScale * pixelsPerUnit / max(0.1, -viewed.z);
  gl_Position = projectionMatrix * viewed;
}
`;

const particleFragmentShader = `
uniform vec3 colour;
uniform float shape;
uniform float opacity;
varying float vFade;

void main() {
  vec2 point = gl_PointCoord - 0.5;
  float alpha = 1.0 - smoothstep(0.12, 0.5, length(point));
  if (shape > 0.5 && shape < 1.5) {
    alpha = (1.0 - smoothstep(0.04, 0.1, abs(point.x))) * (1.0 - smoothstep(0.28, 0.48, abs(point.y)));
  }
  if (shape > 1.5) {
    vec2 bead = vec2(point.x * 1.25, point.y + 0.06);
    float body = length(bead) - 0.26 + max(0.0, -point.y) * 0.5;
    alpha = 1.0 - smoothstep(-0.02, 0.03, body);
  }
  alpha *= vFade * opacity;
  if (alpha < 0.02) {
    discard;
  }
  gl_FragColor = vec4(colour, alpha);
}
`;

export const particleTime = { value: 0 };

const findPixelsPerUnit = (heightPixels: number) =>
  heightPixels / (2 * Math.tan(((cameraFieldOfView / 2) * Math.PI) / 180));

export interface ParticleStyle {
  colour: string;
  look: ParticleLook;
  size: number;
  speed: number;
  sway: number;
  opacity: number;
}

const buildParticleMaterial = (style: ParticleStyle, pixelsPerUnit: number) => {
  const [colour] = buildPaletteUniform([style.colour]);
  return new ShaderMaterial({
    uniforms: {
      time: particleTime,
      colour: { value: colour },
      shape: { value: particleShapes[style.look] },
      size: { value: style.size },
      speed: { value: style.speed },
      sway: { value: style.sway },
      opacity: { value: style.opacity },
      pixelsPerUnit: { value: pixelsPerUnit },
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
};

export const DriftingParticles = ({
  streams,
  style,
}: {
  streams: readonly ParticleStream[];
  style: ParticleStyle;
}) => {
  const motionScale = useMotionScale();
  const heightPixels = useThree(
    (state) => state.size.height * state.viewport.dpr,
  );
  const geometry = useMemo(() => buildParticleGeometry(streams), [streams]);
  const material = useMemo(
    () => buildParticleMaterial(style, findPixelsPerUnit(heightPixels)),
    [style, heightPixels],
  );
  useDisposedOnUnmount(geometry);
  useDisposedOnUnmount(material);
  useFrame((state) => {
    particleTime.value = state.clock.elapsedTime * motionScale;
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={4}
      name="drifting-particles"
    />
  );
};
