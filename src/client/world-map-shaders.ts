import {
  AdditiveBlending,
  BackSide,
  Color,
  DataTexture,
  LinearFilter,
  MeshStandardMaterial,
  RGBAFormat,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from "three";
import { findTerrainHeight, type MapPoint } from "./world-map-terrain.js";

export const deepestShownWater = 4;

export interface WeatherUniforms {
  daylight: { value: number };
  windStrength: { value: number };
  windTime: { value: number };
  snowCover: { value: number };
}

export interface WeatherSettings {
  daylight: number;
  windStrength: number;
  snowCover: number;
}

export const applyWeatherSettings = (
  weatherUniforms: WeatherUniforms,
  { daylight, windStrength, snowCover }: WeatherSettings,
) => {
  weatherUniforms.daylight.value = daylight;
  weatherUniforms.windStrength.value = windStrength;
  weatherUniforms.snowCover.value = snowCover;
};

export const advanceWindTime = (
  weatherUniforms: WeatherUniforms,
  seconds: number,
) => {
  weatherUniforms.windTime.value += seconds;
};

export const advanceShaderClock = (
  material: ShaderMaterial,
  seconds: number,
) => {
  const elapsed: unknown = material.uniforms.time.value;
  material.uniforms.time.value =
    (typeof elapsed === "number" ? elapsed : 0) + seconds;
};

export const buildWeatherUniforms = (): WeatherUniforms => ({
  daylight: { value: 1 },
  windStrength: { value: 0.15 },
  windTime: { value: 0 },
  snowCover: { value: 0 },
});

export const buildSeaDepthTexture = (
  width: number,
  depth: number,
  columns: number,
  rows: number,
  findHeight: (point: MapPoint) => number = findTerrainHeight,
): DataTexture => {
  const texels = new Uint8Array(columns * rows * 4);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const height = findHeight({
        x: ((column + 0.5) / columns - 0.5) * width,
        z: ((row + 0.5) / rows - 0.5) * depth,
      });
      const waterDepth = Math.min(deepestShownWater, Math.max(0, -height));
      const texel = (row * columns + column) * 4;
      texels[texel] = Math.round((waterDepth / deepestShownWater) * 255);
      texels[texel + 1] = height > 0 ? 255 : 0;
      texels[texel + 3] = 255;
    }
  }
  const texture = new DataTexture(texels, columns, rows, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const noiseFunctions = `
float hashAt(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 within = fract(point);
  vec2 blend = within * within * (3.0 - 2.0 * within);
  return mix(
    mix(hashAt(cell), hashAt(cell + vec2(1.0, 0.0)), blend.x),
    mix(hashAt(cell + vec2(0.0, 1.0)), hashAt(cell + vec2(1.0, 1.0)), blend.x),
    blend.y
  );
}

float layeredNoise(vec2 point) {
  float total = 0.0;
  float strength = 0.5;
  for (int layer = 0; layer < 4; layer++) {
    total += strength * smoothNoise(point);
    point = point * 2.03 + vec2(13.1, 7.7);
    strength *= 0.5;
  }
  return total;
}
`;

const seaVertexShader = `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const seaFragmentShader = `
#include <common>
#include <fog_pars_fragment>
uniform float time;
uniform sampler2D depthMap;
uniform vec2 terrainSize;
uniform float deepestWater;
uniform vec3 shallowColour;
uniform vec3 midColour;
uniform vec3 deepColour;
uniform vec3 skyColour;
uniform vec3 sunDirection;
uniform vec3 sunColour;
uniform float daylight;
uniform float windStrength;
varying vec3 vWorldPosition;
${noiseFunctions}

float findWaveHeight(vec2 point) {
  float swell = sin(dot(point, vec2(0.21, 0.13)) + time * 0.9) * 0.5
    + sin(dot(point, vec2(-0.17, 0.27)) + time * 1.3) * 0.35;
  float chop = layeredNoise(point * 0.9 + vec2(time * 0.35, time * 0.22));
  return swell * 0.25 + chop * (0.45 + windStrength * 0.5);
}

void main() {
  vec2 mapUv = vWorldPosition.xz / terrainSize + 0.5;
  vec2 clampedUv = clamp(mapUv, vec2(0.001), vec2(0.999));
  float sampledDepth = texture2D(depthMap, clampedUv).r * deepestWater;
  float fromMiddle = length((mapUv - 0.5) * 2.0);
  float depth = mix(sampledDepth, deepestWater, smoothstep(0.82, 1.15, fromMiddle));

  vec2 point = vWorldPosition.xz;
  float step = 0.12;
  float here = findWaveHeight(point);
  vec3 normal = normalize(vec3(
    here - findWaveHeight(point + vec2(step, 0.0)),
    step * 3.2,
    here - findWaveHeight(point + vec2(0.0, step))
  ));

  vec3 toCamera = normalize(cameraPosition - vWorldPosition);
  float facing = max(dot(toCamera, normal), 0.0);
  float fresnel = 0.03 + 0.6 * pow(1.0 - facing, 4.0);

  vec3 water = mix(shallowColour, midColour, smoothstep(0.0, 0.9, depth));
  water = mix(water, deepColour, smoothstep(1.0, 3.8, depth));
  water *= mix(0.16, 1.0, daylight);
  float lit = 0.75 + 0.25 * max(dot(normal, sunDirection), 0.0);
  vec3 colour = mix(water * lit, skyColour, fresnel);

  vec3 reflected = reflect(-sunDirection, normal);
  float glint = pow(max(dot(reflected, toCamera), 0.0), 220.0);
  colour += sunColour * glint * mix(0.05, 2.2, daylight * daylight);

  float shore = 1.0 - smoothstep(0.0, 0.32, depth);
  float lapping = 0.5 + 0.5 * sin(depth * 38.0 - time * 2.2 + smoothNoise(point * 1.5) * 6.0);
  float foamNoise = smoothNoise(point * 4.0 + vec2(time * 0.5, -time * 0.3));
  float foam = shore * smoothstep(0.55, 0.85, lapping * 0.6 + foamNoise * 0.6);
  foam = max(foam, smoothstep(0.06, 0.0, depth) * 0.85);
  colour = mix(colour, vec3(0.97, 0.98, 1.0) * mix(0.3, 1.0, daylight), foam);

  float opacity = mix(0.5, 1.0, smoothstep(0.0, 2.4, depth));
  opacity = max(opacity, foam);
  gl_FragColor = vec4(colour, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface SeaLook {
  sunDirection: Vector3;
  sunColour: string;
  skyColour: string;
  weatherUniforms: WeatherUniforms;
  terrainWidth: number;
  terrainDepth: number;
}

export const buildSeaMaterial = (
  depthMap: DataTexture,
  {
    sunDirection,
    sunColour,
    skyColour,
    weatherUniforms,
    terrainWidth,
    terrainDepth,
  }: SeaLook,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      time: { value: 0 },
      depthMap: { value: depthMap },
      terrainSize: { value: new Vector2(terrainWidth, terrainDepth) },
      deepestWater: { value: deepestShownWater },
      shallowColour: { value: new Color("#63d8c6") },
      midColour: { value: new Color("#1f9bb0") },
      deepColour: { value: new Color("#0c4a78") },
      skyColour: { value: new Color(skyColour) },
      sunDirection: { value: sunDirection.clone().normalize() },
      sunColour: { value: new Color(sunColour) },
      daylight: weatherUniforms.daylight,
      windStrength: weatherUniforms.windStrength,
    },
    vertexShader: seaVertexShader,
    fragmentShader: seaFragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });

const ribbonVertexShader = `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vec4 mvPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const flowingWaterFragmentShader = `
#include <common>
#include <fog_pars_fragment>
uniform float time;
uniform float daylight;
uniform float flowSpeed;
uniform float streakLength;
uniform float whiteness;
uniform float bodyOpacity;
varying vec2 vUv;
varying vec3 vWorldPosition;
${noiseFunctions}

void main() {
  float acrossEdge = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float ripples = layeredNoise(vec2(vUv.x * 5.0, vUv.y * streakLength - time * flowSpeed));
  float streaks = smoothstep(0.62 - whiteness * 0.3, 0.78 - whiteness * 0.2, ripples);
  float banks = smoothstep(0.0, 0.25, acrossEdge);
  float mouth = 1.0 - smoothstep(0.8, 0.95, vUv.y);
  vec3 colour = mix(vec3(0.1, 0.45, 0.55), vec3(0.9, 0.97, 1.0), max(streaks, whiteness * 0.55));
  colour *= mix(0.25, 1.0, daylight);
  gl_FragColor = vec4(colour, banks * mouth * (bodyOpacity + streaks * 0.5));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface WaterFlow {
  flowSpeed: number;
  streakLength: number;
  whiteness: number;
  bodyOpacity: number;
}

export const waterFlows = {
  river: { flowSpeed: 2.4, streakLength: 60, whiteness: 0, bodyOpacity: 0.22 },
  waterfall: {
    flowSpeed: 9,
    streakLength: 26,
    whiteness: 0.75,
    bodyOpacity: 0.55,
  },
} as const satisfies Record<string, WaterFlow>;

export const buildFlowingWaterMaterial = (
  { flowSpeed, streakLength, whiteness, bodyOpacity }: WaterFlow,
  weatherUniforms: WeatherUniforms,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      time: { value: 0 },
      daylight: weatherUniforms.daylight,
      flowSpeed: { value: flowSpeed },
      streakLength: { value: streakLength },
      whiteness: { value: whiteness },
      bodyOpacity: { value: bodyOpacity },
    },
    vertexShader: ribbonVertexShader,
    fragmentShader: flowingWaterFragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });

const highlightFragmentShader = `
uniform float time;
uniform vec3 glowColour;
uniform float strength;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vec2 fromCentre = vUv * 2.0 - 1.0;
  float radius = length(fromCentre);
  if (radius > 1.0) {
    discard;
  }
  float angle = atan(fromCentre.y, fromCentre.x);
  float fill = (1.0 - smoothstep(0.1, 1.0, radius)) * 0.22;
  float rim = smoothstep(0.84, 0.93, radius) * (1.0 - smoothstep(0.95, 1.0, radius));
  float dashes = step(0.0, sin(angle * 18.0 + time * 1.5));
  float innerRing = smoothstep(0.7, 0.74, radius) * (1.0 - smoothstep(0.74, 0.78, radius)) * dashes;
  float pulse = 0.75 + 0.25 * sin(time * 3.0);
  vec3 surface = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
  float gentleness = smoothstep(0.35, 0.7, abs(surface.y));
  float glow = (fill + rim + innerRing * 0.7) * strength * pulse * gentleness;
  gl_FragColor = vec4(glowColour * glow, glow);
}
`;

export const buildRegionGlowMaterial = (
  glowColour: string,
  strength: number,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      glowColour: { value: new Color(glowColour) },
      strength: { value: strength },
    },
    vertexShader: ribbonVertexShader.replace(
      /#include <fog_(pars_)?vertex>/g,
      "",
    ),
    fragmentShader: highlightFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });

const skyVertexShader = `
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  vec4 placed = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * placed;
  gl_Position.z = gl_Position.w;
}
`;

const skyFragmentShader = `
uniform vec3 zenithColour;
uniform vec3 horizonColour;
uniform vec3 sunDirection;
uniform vec3 sunColour;
varying vec3 vDirection;

void main() {
  float up = max(vDirection.y, 0.0);
  vec3 colour = mix(horizonColour, zenithColour, pow(up, 0.55));
  float towardsSun = max(dot(normalize(vDirection), sunDirection), 0.0);
  colour += sunColour * (pow(towardsSun, 600.0) * 1.5 + pow(towardsSun, 12.0) * 0.18);
  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const buildSkyMaterial = (
  zenithColour: string,
  horizonColour: string,
  sunDirection: Vector3,
  sunColour: string,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      zenithColour: { value: new Color(zenithColour) },
      horizonColour: { value: new Color(horizonColour) },
      sunDirection: { value: sunDirection.clone().normalize() },
      sunColour: { value: new Color(sunColour) },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: BackSide,
    depthWrite: false,
  });

export interface SurfaceGrain {
  roughness: number;
  scale: number;
  strength: number;
  isSwaying: boolean;
}

const swayVertexChunk = `#include <begin_vertex>
  #ifdef USE_INSTANCING
    vec3 swayRoot = instanceMatrix[3].xyz;
  #else
    vec3 swayRoot = modelMatrix[3].xyz;
  #endif
  float swayHeight = max(transformed.y, 0.0);
  float gust = sin(windTime * 1.7 + swayRoot.x * 0.35 + swayRoot.z * 0.21) * 0.6
    + sin(windTime * 3.3 + swayRoot.x * 1.3) * 0.4;
  transformed.x += (0.5 + gust) * windStrength * swayHeight * 0.07;
  transformed.z += gust * windStrength * swayHeight * 0.035;`;

// Snow settles in patches on flat ground while snowCover is light, and once
// it nears full cover it blankets every upward-facing surface, slopes and
// treetops too, leaving only walls and the waterline showing.
export const buildGrainedMaterial = (
  { roughness, scale, strength, isSwaying }: SurfaceGrain,
  weatherUniforms: WeatherUniforms,
): MeshStandardMaterial => {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = weatherUniforms.windTime;
    shader.uniforms.windStrength = weatherUniforms.windStrength;
    shader.uniforms.snowCover = weatherUniforms.snowCover;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vGrainPosition;\nvarying float vGrainUpness;\nuniform float windTime;\nuniform float windStrength;",
      )
      .replace(
        "#include <begin_vertex>",
        isSwaying ? swayVertexChunk : "#include <begin_vertex>",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
  vec4 grainPosition = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    grainPosition = instanceMatrix * grainPosition;
  #endif
  vGrainPosition = (modelMatrix * grainPosition).xyz;
  vec3 grainNormal = objectNormal;
  #ifdef USE_INSTANCING
    grainNormal = mat3(instanceMatrix) * grainNormal;
  #endif
  vGrainUpness = normalize(mat3(modelMatrix) * grainNormal).y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vGrainPosition;
varying float vGrainUpness;
uniform float snowCover;
${noiseFunctions}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
  vec3 grainAt = vGrainPosition * ${scale.toFixed(3)};
  vec3 facing = abs(normalize(cross(dFdx(vGrainPosition), dFdy(vGrainPosition))));
  facing /= facing.x + facing.y + facing.z;
  float grain = layeredNoise(grainAt.xz) * facing.y + layeredNoise(grainAt.xy + 31.0) * facing.z + layeredNoise(grainAt.zy - 17.0) * facing.x;
  float speck = smoothNoise(grainAt.xz * 5.0 + grainAt.y * 3.0);
  diffuseColor.rgb *= 1.0 + (grain - 0.47) * ${(strength * 2).toFixed(3)} + (speck - 0.5) * ${strength.toFixed(3)};
  float snowBlanket = smoothstep(0.75, 1.0, snowCover);
  float settledSnow = snowCover
    * smoothstep(mix(0.55, 0.2, snowBlanket), mix(0.8, 0.45, snowBlanket), vGrainUpness)
    * smoothstep(0.02, 0.2, vGrainPosition.y)
    * mix(smoothstep(0.3, 0.5, grain + speck * 0.3), 1.0, snowBlanket);
  vec3 snowColour = vec3(0.94, 0.96, 1.0) * (0.96 + (grain - 0.47) * 0.12);
  diffuseColor.rgb = mix(diffuseColor.rgb, snowColour, settledSnow);`,
      );
  };
  material.customProgramCacheKey = () =>
    `grained-${String(scale)}-${String(strength)}-${String(isSwaying)}`;
  return material;
};

export const surfaceGrains = {
  ground: { roughness: 0.94, scale: 1.3, strength: 0.17, isSwaying: false },
  foliage: { roughness: 0.82, scale: 3.2, strength: 0.24, isSwaying: true },
  stone: { roughness: 0.9, scale: 3.4, strength: 0.12, isSwaying: false },
  timber: { roughness: 0.75, scale: 5, strength: 0.08, isSwaying: false },
  metal: { roughness: 0.45, scale: 6, strength: 0.05, isSwaying: false },
  fabric: { roughness: 0.68, scale: 9, strength: 0.04, isSwaying: false },
} as const satisfies Record<string, SurfaceGrain>;

export interface FallingArea {
  halfWidth: number;
  halfDepth: number;
  height: number;
}

const fallingHeadChunk = `
uniform float time;
uniform float fallSpeed;
uniform vec2 drift;
uniform vec3 areaSize;
attribute float seed;

vec3 findFallingHead() {
  float cycle = areaSize.y / fallSpeed;
  float age = mod(seed * cycle + time, cycle);
  vec3 head = vec3(position.x, areaSize.y, position.z)
    + vec3(drift.x, -fallSpeed, drift.y) * age;
  head.xz = mod(head.xz + areaSize.xz * 0.5, areaSize.xz) - areaSize.xz * 0.5;
  return head;
}
`;

const rainVertexShader = `
#include <common>
#include <fog_pars_vertex>
${fallingHeadChunk}
uniform float streakLength;
attribute float streakEnd;

void main() {
  vec3 velocity = normalize(vec3(drift.x, -fallSpeed, drift.y));
  vec3 point = findFallingHead() - velocity * streakLength * streakEnd;
  vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const rainFragmentShader = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 dropColour;
uniform float opacity;

void main() {
  gl_FragColor = vec4(dropColour, opacity);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const flakeVertexShader = `
#include <common>
#include <fog_pars_vertex>
${fallingHeadChunk}
uniform float flakeSize;
uniform float flutter;
varying float vSeed;

void main() {
  vec3 point = findFallingHead();
  point.x += sin(time * 1.3 + seed * 40.0) * flutter;
  point.z += cos(time * 1.1 + seed * 23.0) * flutter;
  vSeed = seed;
  vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = flakeSize * (0.6 + fract(seed * 7.13) * 0.8) * (300.0 / -mvPosition.z);
  #include <fog_vertex>
}
`;

const flakeFragmentShader = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 flakeColour;
uniform vec3 otherFlakeColour;
uniform float opacity;
varying float vSeed;

void main() {
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  if (fromCentre > 1.0) {
    discard;
  }
  vec3 colour = mix(flakeColour, otherFlakeColour, step(0.5, fract(vSeed * 13.7)));
  gl_FragColor = vec4(colour, opacity * (1.0 - smoothstep(0.4, 1.0, fromCentre)));
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const buildFallingUniforms = (
  { halfWidth, halfDepth, height }: FallingArea,
  fallSpeed: number,
  drift: Vector2,
) => ({
  ...UniformsUtils.clone(UniformsLib.fog),
  time: { value: 0 },
  fallSpeed: { value: fallSpeed },
  drift: { value: drift },
  areaSize: { value: new Vector3(halfWidth * 2, height, halfDepth * 2) },
});

export const buildRainMaterial = (
  area: FallingArea,
  drift: Vector2,
  brightness: number,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      ...buildFallingUniforms(area, 26, drift),
      streakLength: { value: 0.9 },
      dropColour: { value: new Color("#c9d8ea").multiplyScalar(brightness) },
      opacity: { value: 0.42 },
    },
    vertexShader: rainVertexShader,
    fragmentShader: rainFragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });

export interface FlakeLook {
  fallSpeed: number;
  flakeSize: number;
  flutter: number;
  colour: string;
  otherColour: string;
  opacity: number;
}

export const flakeLooks = {
  snow: {
    fallSpeed: 2.2,
    flakeSize: 0.22,
    flutter: 0.5,
    colour: "#ffffff",
    otherColour: "#eef4ff",
    opacity: 0.9,
  },
  leaves: {
    fallSpeed: 1.4,
    flakeSize: 0.2,
    flutter: 0.9,
    colour: "#d98a2b",
    otherColour: "#9cbf3e",
    opacity: 0.95,
  },
} as const satisfies Record<string, FlakeLook>;

export const buildFlakeMaterial = (
  area: FallingArea,
  drift: Vector2,
  { fallSpeed, flakeSize, flutter, colour, otherColour, opacity }: FlakeLook,
  brightness: number,
): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      ...buildFallingUniforms(area, fallSpeed, drift),
      flakeSize: { value: flakeSize },
      flutter: { value: flutter },
      flakeColour: { value: new Color(colour).multiplyScalar(brightness) },
      otherFlakeColour: {
        value: new Color(otherColour).multiplyScalar(brightness),
      },
      opacity: { value: opacity },
    },
    vertexShader: flakeVertexShader,
    fragmentShader: flakeFragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
  });

const starVertexShader = `
uniform float time;
attribute float seed;
varying float vTwinkle;

void main() {
  vTwinkle = 0.55 + 0.45 * sin(time * (1.0 + seed * 2.0) + seed * 60.0);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_Position.z = gl_Position.w * 0.9999;
  gl_PointSize = 1.2 + fract(seed * 9.7) * 2.2;
}
`;

const starFragmentShader = `
varying float vTwinkle;

void main() {
  float fromCentre = length(gl_PointCoord - 0.5) * 2.0;
  if (fromCentre > 1.0) {
    discard;
  }
  gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), vTwinkle * (1.0 - fromCentre));
}
`;

export const buildStarMaterial = (): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
