import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  FrontSide,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  Matrix3,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  type Camera,
  Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CharacterModel } from "../character/character-model.js";
import type { CharacterLook } from "../character/character-look.js";
import {
  applyStance,
  exploreCharacterScale,
} from "../character/character-stance.js";
import { isMotionReduced } from "../reduced-motion.js";
import type { Triple } from "../world-map-models.js";
import { findSmoothNoise, smoothStep } from "../world-map-terrain.js";
import { buildLoftGeometry } from "./island-lofts.js";
import { buildLiveryGeometry } from "./island-livery.js";
import { LiveryDecals } from "./island-livery-models.js";

// Scuba diving between Islands, seen under the water. The Character, kitted
// out from the dive locker, swims from the first Island's sandy slope, past
// the wooden pilings of its pier, out over coral gardens, kelp forests and
// rippled dunes, through shoals of fish that swirl away as they pass, under
// a shimmering ceiling of light, to the next Island's pier and its ladder.

/** The water's surface, seen from below. */
export const underwaterSurfaceY = 0;

const waterColours = {
  fog: "#0c6683",
  hemisphereSky: "#bdf4ff",
  hemisphereGround: "#164e63",
  sun: "#dcfbff",
} as const;
const fogDensity = 0.072;

const shortestCrossing = 18;
const longestCrossing = 42;
const crossingSpeed = 3.3;

/** How far the diver swims, in scene units, in a crossing taking `seconds`. */
export const findUnderwaterCrossingLength = (seconds: number): number =>
  Math.min(
    longestCrossing,
    Math.max(shortestCrossing, seconds * crossingSpeed),
  );

const endDepth = -3.7;
const middleDepth = -5.6;
const shoreRise = 0.34;
const shallowest = -0.4;

/** The height of the sea bed: shallow by each Island, deeper between. */
export const findSeabedHeight = (
  x: number,
  z: number,
  length: number,
): number => {
  const fromEnd = Math.min(x, length - x);
  const base =
    endDepth +
    (middleDepth - endDepth) * smoothStep(0, 9, fromEnd) +
    Math.max(0, -fromEnd) * shoreRise;
  const dunes =
    0.38 * Math.sin(x * 0.42 + z * 0.18) * Math.cos(z * 0.31 - x * 0.07) +
    0.7 * (findSmoothNoise(x * 0.13 + 40, z * 0.13 + 7) - 0.5) +
    0.1 * Math.sin(x * 1.3 + z * 0.6);
  const sides = 0.025 * Math.max(0, Math.abs(z) - 8) ** 1.3;
  return Math.min(shallowest, base + dunes - sides);
};

export interface DiverPlacement {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
}

const findProgress = (share: number): number => {
  const clamped = Math.min(1, Math.max(0, share));
  return 0.55 * clamped + 0.45 * clamped * clamped * (3 - 2 * clamped);
};

const findDiverSpot = (progress: number, length: number): Triple => {
  const x = progress * length;
  const envelope = Math.sin(Math.PI * progress);
  const z =
    envelope * (0.9 * Math.sin(x * 0.13) + 0.35 * Math.sin(x * 0.31 + 1));
  const settled = smoothStep(0, 5, x) * smoothStep(0, 5, length - x);
  const y = -1.55 - 0.95 * settled + 0.22 * Math.sin(x * 0.55) * settled;
  return [x, y, z];
};

/**
 * Where the diver is `share` of the way through the crossing: always
 * between 1.5 and 3 below the surface, facing the way they swim.
 */
export const findDiverPlacement = (
  share: number,
  length: number,
): DiverPlacement => {
  const progress = findProgress(share);
  const [x, y, z] = findDiverSpot(progress, length);
  const step = 0.004;
  const [aheadX, aheadY, aheadZ] = findDiverSpot(progress + step, length);
  const [behindX, behindY, behindZ] = findDiverSpot(progress - step, length);
  const along = Math.hypot(aheadX - behindX, aheadZ - behindZ);
  return {
    x,
    y,
    z,
    heading: Math.atan2(aheadX - behindX, aheadZ - behindZ),
    pitch: Math.atan2(aheadY - behindY, Math.max(along, 0.0001)),
  };
};

export interface CameraSpot {
  position: Triple;
  target: Triple;
}

const findCameraSwing = (share: number, isReduced: boolean): number => {
  if (isReduced) {
    return 1.15;
  }
  const intro = smoothStep(0.03, 0.26, share);
  const outro = smoothStep(0.8, 0.97, share);
  const drift = 0.12 * Math.sin(share * 9);
  return 2.75 + (1.15 + drift - 2.75) * intro + (0.5 - 1.15 - drift) * outro;
};

/**
 * Where the camera watches the diver from: in front of them looking back
 * at the pier as they set off, then alongside, then behind looking on to
 * the next Island's pier, always under the surface and above the sea bed.
 */
export const findCrossingCameraSpot = (
  share: number,
  length: number,
  isReduced: boolean,
): CameraSpot => {
  const diver = findDiverPlacement(share, length);
  const swing = findCameraSwing(share, isReduced);
  const distance = 3.3 - 0.3 * smoothStep(0.15, 0, share);
  const forward = { x: Math.sin(diver.heading), z: Math.cos(diver.heading) };
  const side = { x: Math.cos(diver.heading), z: -Math.sin(diver.heading) };
  const x =
    diver.x -
    forward.x * Math.cos(swing) * distance +
    side.x * Math.sin(swing) * distance;
  const z =
    diver.z -
    forward.z * Math.cos(swing) * distance +
    side.z * Math.sin(swing) * distance;
  const y = Math.min(
    underwaterSurfaceY - 0.45,
    Math.max(findSeabedHeight(x, z, length) + 0.7, diver.y + 0.8),
  );
  return {
    position: [x, y, z],
    target: [
      diver.x + forward.x * 0.7,
      diver.y - 0.3,
      diver.z + forward.z * 0.7,
    ],
  };
};

// ---------------------------------------------------------------------------
// Shading: every lit thing under the water shares a clock, dappled caustic
// light on its upward faces, and an optional way of moving in the current.

const causticGlsl = /* glsl */ `
float seaCausticLayer(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.0;
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 3; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 2.0);
}
float seaCaustic(vec2 at, float time) {
  return seaCausticLayer(at * 0.15, time * 0.45) * 0.65
    + seaCausticLayer(at * 0.21 + vec2(0.37, 0.11), time * 0.33) * 0.45;
}
`;

type Deform = "none" | "sway" | "wiggle" | "flap" | "pulse" | "undulate";

const deformGlsl: Record<Deform, string> = {
  none: "",
  sway: /* glsl */ `
    float swayHeight = max(position.y, 0.0);
    transformed.x += sin(uSeaTime * uDeform.y + seaPhase + swayHeight * uDeform.z) * uDeform.x * swayHeight * swayHeight;
    transformed.z += cos(uSeaTime * uDeform.y * 0.77 + seaPhase * 1.7 + swayHeight * uDeform.z * 0.8) * uDeform.x * 0.7 * swayHeight * swayHeight;
  `,
  wiggle: /* glsl */ `
    float tailward = clamp(0.2 - position.z, 0.0, 1.0);
    transformed.x += sin(uSeaTime * uDeform.y + seaPhase - position.z * 5.0) * uDeform.x * (tailward * tailward + 0.04);
  `,
  flap: /* glsl */ `
    float reach = max(abs(position.x) - uDeform.z, 0.0);
    float stroke = position.z > uDeform.w ? 1.0 : 0.3;
    transformed.y += pow(reach, 1.3) * uDeform.x * sin(uSeaTime * uDeform.y - reach * 1.2 + seaPhase) * stroke;
  `,
  pulse: /* glsl */ `
    float beat = sin(uSeaTime * uDeform.y + seaPhase);
    if (position.y > -0.01) {
      transformed.xz *= 1.0 + uDeform.x * beat;
      transformed.y *= 1.0 - uDeform.x * 0.7 * beat;
    } else {
      transformed.x += sin(uSeaTime * 2.0 + position.y * 5.0 + seaPhase) * 0.06 * (-position.y);
      transformed.z += cos(uSeaTime * 1.7 + position.y * 4.0 + seaPhase) * 0.06 * (-position.y);
      transformed.xz *= 1.0 + uDeform.x * 0.6 * sin(uSeaTime * uDeform.y + seaPhase - 1.2 + position.y * 2.0);
    }
  `,
  undulate: /* glsl */ `
    float flukeward = clamp(0.2 - position.z, 0.0, 1.2);
    transformed.y += sin(uSeaTime * uDeform.y - position.z * 2.5) * uDeform.x * flukeward * flukeward;
  `,
};

interface SeaUniforms {
  uSeaTime: { value: number };
}

interface SeaMaterialOptions {
  clock: SeaUniforms;
  deform?: Deform;
  deformShape?: [number, number, number, number];
  caustics?: number;
  selfLight?: number;
  isSand?: boolean;
  roughness?: number;
  metalness?: number;
  isDoubleSided?: boolean;
  opacity?: number;
  emissive?: string;
}

const buildSeaMaterial = ({
  clock,
  deform = "none",
  deformShape = [0, 0, 0, 0],
  caustics = 1,
  selfLight = 0,
  isSand = false,
  roughness = 0.8,
  metalness = 0,
  isDoubleSided = false,
  opacity = 1,
  emissive = "#000000",
}: SeaMaterialOptions): MeshStandardMaterial => {
  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness,
    metalness,
    envMapIntensity: 0.35,
    side: isDoubleSided ? DoubleSide : FrontSide,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    emissive: new Color(emissive),
  });
  const deformUniform = { value: deformShape };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSeaTime = clock.uSeaTime;
    shader.uniforms.uDeform = deformUniform;
    shader.uniforms.uCaustics = { value: caustics };
    shader.uniforms.uSelfLight = { value: selfLight };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
uniform float uSeaTime;
uniform vec4 uDeform;
varying vec3 vSeaWorld;
varying float vSeaUp;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
#ifdef USE_INSTANCING
  float seaPhase = float(gl_InstanceID) * 1.618 + instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
#else
  float seaPhase = 0.0;
#endif
${deformGlsl[deform]}`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `#include <project_vertex>
  vec4 seaWorld = vec4(transformed, 1.0);
  vec3 seaNormal = objectNormal;
#ifdef USE_INSTANCING
  seaWorld = instanceMatrix * seaWorld;
  seaNormal = mat3(instanceMatrix) * seaNormal;
#endif
  seaWorld = modelMatrix * seaWorld;
  vSeaWorld = seaWorld.xyz;
  vSeaUp = normalize(mat3(modelMatrix) * seaNormal).y;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uSeaTime;
uniform float uCaustics;
uniform float uSelfLight;
varying vec3 vSeaWorld;
varying float vSeaUp;
${causticGlsl}`,
      )
      .replace(
        "#include <color_fragment>",
        isSand
          ? /* glsl */ `#include <color_fragment>
  diffuseColor.rgb *= mix(vec3(0.58, 0.8, 0.9), vec3(1.0), smoothstep(-7.5, -1.0, vSeaWorld.y));
  float sandRipple = sin(dot(vSeaWorld.xz, vec2(0.83, 0.55)) * 8.0 + sin(vSeaWorld.x * 0.7) * 2.2 + sin(vSeaWorld.z * 1.1) * 1.6);
  diffuseColor.rgb *= 0.9 + 0.1 * sandRipple;`
          : /* glsl */ `#include <color_fragment>
  diffuseColor.rgb *= mix(vec3(0.62, 0.84, 0.92), vec3(1.0), smoothstep(-7.5, -1.0, vSeaWorld.y));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
  float seaLight = seaCaustic(vSeaWorld.xz + vSeaWorld.y * 0.3, uSeaTime);
  float seaFacing = clamp(vSeaUp * 0.8 + 0.25, 0.0, 1.0);
  float seaDepth = smoothstep(-14.0, -0.5, vSeaWorld.y);
  totalEmissiveRadiance += diffuseColor.rgb * (seaLight * uCaustics * seaFacing * seaDepth * 0.9 + uSelfLight);`,
      );
  };
  material.customProgramCacheKey = () =>
    `sea-${deform}-${isSand ? "sand" : "plain"}`;
  return material;
};

// ---------------------------------------------------------------------------
// Geometry helpers.

const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type Painter = (point: Vector3, normal: Vector3) => Color;

/** Gives a shape flat colours (or a painted pattern) and drops its uvs. */
const paintShape = (
  geometry: BufferGeometry,
  paint: Painter | string,
  isFlat = false,
): BufferGeometry => {
  if (!isFlat) {
    geometry.computeVertexNormals();
  }
  const flat = geometry.index === null ? geometry : geometry.toNonIndexed();
  flat.deleteAttribute("uv");
  if (isFlat) {
    flat.computeVertexNormals();
  }
  const positions = flat.getAttribute("position");
  const normals = flat.getAttribute("normal");
  const colours = new Float32Array(positions.count * 3);
  const point = new Vector3();
  const normal = new Vector3();
  const solid = typeof paint === "string" ? new Color(paint) : undefined;
  for (let index = 0; index < positions.count; index++) {
    point.fromBufferAttribute(positions, index);
    normal.fromBufferAttribute(normals, index);
    const colour =
      solid ?? (typeof paint === "string" ? new Color() : paint(point, normal));
    colour.toArray(colours, index * 3);
  }
  flat.setAttribute("color", new BufferAttribute(colours, 3));
  return flat;
};

const placeShape = (
  geometry: BufferGeometry,
  position: Triple,
  rotation: Triple = [0, 0, 0],
  scale: Triple | number = 1,
): BufferGeometry => {
  const sized: Triple =
    typeof scale === "number" ? [scale, scale, scale] : scale;
  return geometry.applyMatrix4(
    new Matrix4().compose(
      new Vector3(...position),
      new Quaternion().setFromEuler(new Euler(...rotation)),
      new Vector3(...sized),
    ),
  );
};

const joinShapes = (parts: BufferGeometry[]): BufferGeometry => {
  const merged = mergeGeometries(parts);
  parts.forEach((part) => {
    part.dispose();
  });
  return merged;
};

/** A rod from one point to another. */
const buildRod = (
  from: Vector3,
  to: Vector3,
  radiusFrom: number,
  radiusTo: number,
  sides = 6,
): BufferGeometry => {
  const along = to.clone().sub(from);
  const rod = new CylinderGeometry(radiusTo, radiusFrom, along.length(), sides);
  rod.applyQuaternion(
    new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      along.clone().normalize(),
    ),
  );
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return rod.translate(middle.x, middle.y, middle.z);
};

/** Gathers many copies of painted shapes into one geometry. */
class ShapeBatch {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colours: number[] = [];
  private readonly point = new Vector3();
  private readonly normal = new Vector3();
  private readonly normalMatrix = new Matrix3();

  add(shape: BufferGeometry, matrix?: Matrix4, tint?: Color): void {
    const positions = shape.getAttribute("position");
    const normals = shape.getAttribute("normal");
    const colours = shape.getAttribute("color");
    if (matrix !== undefined) {
      this.normalMatrix.getNormalMatrix(matrix);
    }
    for (let index = 0; index < positions.count; index++) {
      this.point.fromBufferAttribute(positions, index);
      this.normal.fromBufferAttribute(normals, index);
      if (matrix !== undefined) {
        this.point.applyMatrix4(matrix);
        this.normal.applyMatrix3(this.normalMatrix).normalize();
      }
      this.positions.push(this.point.x, this.point.y, this.point.z);
      this.normals.push(this.normal.x, this.normal.y, this.normal.z);
      this.colours.push(
        colours.getX(index) * (tint?.r ?? 1),
        colours.getY(index) * (tint?.g ?? 1),
        colours.getZ(index) * (tint?.b ?? 1),
      );
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(this.positions), 3),
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(this.normals), 3),
    );
    geometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(this.colours), 3),
    );
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const composeMatrix = (
  position: Triple,
  rotation: Triple,
  scale: Triple | number,
): Matrix4 => {
  const sized: Triple =
    typeof scale === "number" ? [scale, scale, scale] : scale;
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    new Vector3(...sized),
  );
};

// ---------------------------------------------------------------------------
// Reef pieces, each built once and copied about the sea bed.

const buildRockShape = (seed: number): BufferGeometry => {
  const rock = new IcosahedronGeometry(1, 2);
  const positions = rock.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const push =
      0.78 + 0.42 * findSmoothNoise(x * 1.7 + seed, z * 1.7 + y * 1.3 - seed);
    positions.setXYZ(index, x * push, y * push * 0.62, z * push);
  }
  return paintShape(
    rock,
    (point, normal) => {
      const moss = smoothStep(0.45, 0.85, normal.y);
      const speckle = findSmoothNoise(point.x * 6 + seed, point.z * 6);
      return new Color("#7b7f86")
        .lerp(new Color("#66707a"), speckle)
        .lerp(new Color("#5d7f4a"), moss * 0.75);
    },
    true,
  );
};

const buildBrainCoralShape = (): BufferGeometry => {
  const dome = new SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const positions = dome.getAttribute("position");
  const groove = (x: number, z: number, y: number) =>
    Math.sin(x * 11 + Math.sin(z * 7) * 1.6) *
    Math.sin(z * 11 + Math.sin(x * 6 + y * 4) * 1.6);
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const push = 1 + 0.035 * groove(x, z, y);
    positions.setXYZ(index, x * push, (y - 0.12) * push * 0.72, z * push);
  }
  return paintShape(dome, (point) => {
    const ridge = groove(point.x, point.z, point.y / 0.72 + 0.12);
    return new Color(1, 1, 1).multiplyScalar(0.62 + 0.38 * (0.5 + 0.5 * ridge));
  });
};

const buildBranchingCoralShape = (seed: number, isBushy: boolean) => {
  const random = makeRandom(seed);
  const parts: BufferGeometry[] = [];
  const grow = (
    from: Vector3,
    direction: Vector3,
    length: number,
    radius: number,
    depth: number,
  ) => {
    const to = from.clone().addScaledVector(direction, length);
    const tipRadius = radius * 0.72;
    parts.push(
      paintShape(buildRod(from, to, radius, tipRadius, 6), (point) =>
        new Color(1, 1, 1).multiplyScalar(0.7 + 0.12 * depth + point.y * 0.15),
      ),
    );
    const limit = 3;
    if (depth >= limit) {
      parts.push(
        paintShape(
          new SphereGeometry(tipRadius * 1.25, 5, 3).translate(
            to.x,
            to.y,
            to.z,
          ),
          () => new Color(1.25, 1.25, 1.2),
        ),
      );
      return;
    }
    const children = isBushy ? 2 + (random() < 0.35 ? 1 : 0) : 2;
    for (let child = 0; child < children; child++) {
      const spread = isBushy ? 0.55 : 0.42;
      const axis = new Vector3(random() - 0.5, 0, random() - 0.5).normalize();
      const turned = direction
        .clone()
        .applyAxisAngle(axis, spread * (0.6 + random() * 0.8))
        .lerp(new Vector3(0, 1, 0), 0.25)
        .normalize();
      grow(to, turned, length * (0.72 + random() * 0.12), tipRadius, depth + 1);
    }
  };
  const trunks = isBushy ? 3 : 2;
  for (let trunk = 0; trunk < trunks; trunk++) {
    const angle = (trunk / trunks) * Math.PI * 2 + random();
    grow(
      new Vector3(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08),
      new Vector3(
        Math.cos(angle) * 0.35,
        1,
        Math.sin(angle) * 0.35,
      ).normalize(),
      isBushy ? 0.34 : 0.42,
      isBushy ? 0.06 : 0.065,
      0,
    );
  }
  return joinShapes(parts);
};

const buildFanCoralShape = (seed: number): BufferGeometry => {
  const random = makeRandom(seed);
  const parts: BufferGeometry[] = [];
  const veins = 9;
  for (let vein = 0; vein < veins; vein++) {
    const angle = (vein / (veins - 1) - 0.5) * 2.3;
    const reach = 0.85 + random() * 0.25;
    const start = new Vector3(0, 0.08, 0);
    const middle = new Vector3(
      Math.sin(angle) * reach * 0.5,
      0.08 + Math.cos(angle) * reach * 0.5,
      0,
    );
    const end = new Vector3(
      Math.sin(angle) * reach,
      0.08 + Math.cos(angle) * reach,
      (random() - 0.5) * 0.06,
    );
    parts.push(buildRod(start, middle, 0.025, 0.016, 4));
    parts.push(buildRod(middle, end, 0.016, 0.008, 3));
    [-0.13, 0.13].forEach((fork) => {
      const forkEnd = new Vector3(
        Math.sin(angle + fork) * reach * 1.04,
        0.08 + Math.cos(angle + fork) * reach * 1.04,
        end.z,
      );
      parts.push(
        buildRod(middle.clone().lerp(end, 0.3), forkEnd, 0.011, 0.006, 3),
      );
    });
  }
  [0.35, 0.55, 0.75, 0.92].forEach((ring) => {
    const steps = 12;
    for (let step = 0; step < steps; step++) {
      const from = (step / steps - 0.5) * 2.4;
      const to = ((step + 1) / steps - 0.5) * 2.4;
      parts.push(
        buildRod(
          new Vector3(Math.sin(from) * ring, 0.08 + Math.cos(from) * ring, 0),
          new Vector3(Math.sin(to) * ring, 0.08 + Math.cos(to) * ring, 0),
          0.007,
          0.007,
          3,
        ),
      );
    }
  });
  parts.push(new CylinderGeometry(0.03, 0.05, 0.1, 6).translate(0, 0.05, 0));
  return paintShape(joinShapes(parts), (point) =>
    new Color(1, 1, 1).multiplyScalar(0.75 + 0.3 * point.y),
  );
};

const buildTubeSpongeShape = (seed: number): BufferGeometry => {
  const random = makeRandom(seed);
  const parts: BufferGeometry[] = [];
  const tubes = 4;
  for (let tube = 0; tube < tubes; tube++) {
    const angle = (tube / tubes) * Math.PI * 2 + random();
    const height = 0.45 + random() * 0.55;
    const radius = 0.07 + random() * 0.04;
    const lean = 0.15 + random() * 0.15;
    const outer = new CylinderGeometry(
      radius,
      radius * 0.8,
      height,
      12,
      3,
      true,
    );
    const hole = new CylinderGeometry(
      radius * 0.8,
      radius * 0.8,
      0.02,
      12,
    ).translate(0, height / 2 - 0.03, 0);
    const rim = new TorusGeometry(radius * 0.92, radius * 0.14, 5, 14)
      .rotateX(Math.PI / 2)
      .translate(0, height / 2, 0);
    const painted = joinShapes([
      paintShape(outer, (point) =>
        new Color(1, 1, 1).multiplyScalar(
          0.72 + 0.35 * (point.y / height + 0.5),
        ),
      ),
      paintShape(hole, () => new Color(0.22, 0.18, 0.2)),
      paintShape(rim, () => new Color(1.15, 1.15, 1.1)),
    ]);
    parts.push(
      placeShape(
        painted,
        [Math.cos(angle) * 0.1, height / 2 - 0.02, Math.sin(angle) * 0.1],
        [Math.sin(angle) * lean, 0, -Math.cos(angle) * lean],
      ),
    );
  }
  return joinShapes(parts);
};

const buildAnemoneShape = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    paintShape(
      new CylinderGeometry(0.12, 0.15, 0.12, 12).translate(0, 0.06, 0),
      () => new Color(0.7, 0.7, 0.7),
    ),
  ];
  const tentacles = 26;
  for (let tentacle = 0; tentacle < tentacles; tentacle++) {
    const angle = tentacle * 2.399;
    const ring = 0.03 + (tentacle % 3) * 0.04;
    const from = new Vector3(
      Math.cos(angle) * ring,
      0.11,
      Math.sin(angle) * ring,
    );
    const to = from
      .clone()
      .add(
        new Vector3(
          Math.cos(angle) * (0.06 + ring),
          0.24 - ring * 0.6,
          Math.sin(angle) * (0.06 + ring),
        ),
      );
    parts.push(
      paintShape(buildRod(from, to, 0.016, 0.006, 4), (point) =>
        new Color(1, 1, 1).multiplyScalar(0.8 + point.y * 1.4),
      ),
    );
  }
  return joinShapes(parts);
};

const buildStarfishShape = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    paintShape(
      new SphereGeometry(0.06, 10, 6).scale(1, 0.4, 1),
      () => new Color(1, 1, 1),
    ),
  ];
  for (let arm = 0; arm < 5; arm++) {
    const angle = (arm / 5) * Math.PI * 2;
    parts.push(
      paintShape(
        new ConeGeometry(0.055, 0.24, 6)
          .translate(0, 0.12, 0)
          .rotateZ(-Math.PI / 2)
          .scale(1, 0.45, 1)
          .rotateY(angle)
          .translate(0, 0.012, 0),
        (point) =>
          new Color(1, 1, 1).multiplyScalar(
            1.05 - Math.hypot(point.x, point.z) * 1.2,
          ),
      ),
    );
  }
  return joinShapes(parts);
};

const buildUrchinShape = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    paintShape(new IcosahedronGeometry(0.08, 1), () => new Color(1, 1, 1)),
  ];
  const directions = new IcosahedronGeometry(1, 1).getAttribute("position");
  const seen = new Set<string>();
  for (let index = 0; index < directions.count; index++) {
    const direction = new Vector3().fromBufferAttribute(directions, index);
    const key = direction
      .toArray()
      .map((value) => value.toFixed(2))
      .join();
    if (seen.has(key) || direction.y < -0.3) {
      continue;
    }
    seen.add(key);
    parts.push(
      paintShape(
        buildRod(
          direction.clone().multiplyScalar(0.06),
          direction.clone().multiplyScalar(0.21),
          0.009,
          0.002,
          3,
        ),
        () => new Color(0.85, 0.85, 0.9),
      ),
    );
  }
  return joinShapes(parts);
};

const buildShellShape = (): BufferGeometry => {
  const shell = new SphereGeometry(
    0.1,
    14,
    6,
    0,
    Math.PI,
    0,
    Math.PI / 2,
  ).scale(1, 0.4, 1.05);
  return paintShape(shell, (point) => {
    const angle = Math.atan2(point.z, point.x);
    return new Color(1, 1, 1).multiplyScalar(0.8 + 0.2 * Math.cos(angle * 16));
  });
};

const buildPebbleShape = (): BufferGeometry =>
  paintShape(
    new IcosahedronGeometry(1, 0).scale(1, 0.55, 0.85),
    "#ffffff",
    true,
  );

// ---------------------------------------------------------------------------
// Swaying plants: kelp fronds and tufts of sea grass, one unit tall, which
// grow taller by scaling.

const buildKelpShape = (): BufferGeometry => {
  const parts: BufferGeometry[] = [
    paintShape(
      new CylinderGeometry(0.01, 0.018, 1, 4, 14).translate(0, 0.5, 0),
      "#5c4f19",
    ),
  ];
  const blades = 16;
  for (let blade = 0; blade < blades; blade++) {
    const height = 0.05 + (blade / blades) * 0.92;
    const leaf = new PlaneGeometry(0.075, 0.2, 1, 4);
    const positions = leaf.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      const y = positions.getY(index);
      const taper = Math.sin((y / 0.2 + 0.5) * Math.PI) * 0.85 + 0.15;
      positions.setX(index, positions.getX(index) * taper);
      positions.setZ(index, Math.sin((y / 0.2 + 0.5) * Math.PI) * 0.012);
    }
    leaf
      .translate(0.045, 0.1, 0)
      .rotateZ(-0.35)
      .rotateY(blade * 2.4);
    parts.push(
      paintShape(leaf.translate(0, height, 0), (point) =>
        new Color("#7a6a1c").lerp(
          new Color("#d4b84a"),
          Math.min(1, point.y * 0.9 + 0.1),
        ),
      ),
    );
  }
  [0.32, 0.58, 0.82].forEach((height, float) => {
    parts.push(
      paintShape(
        new SphereGeometry(0.018, 6, 4).translate(
          Math.cos(float * 2) * 0.02,
          height,
          Math.sin(float * 2) * 0.02,
        ),
        "#b59a34",
      ),
    );
  });
  return joinShapes(parts);
};

const buildSeaGrassShape = (seed: number): BufferGeometry => {
  const random = makeRandom(seed);
  const parts: BufferGeometry[] = [];
  for (let blade = 0; blade < 9; blade++) {
    const angle = random() * Math.PI * 2;
    const height = 0.6 + random() * 0.4;
    const leaf = new PlaneGeometry(0.05, height, 1, 4);
    const positions = leaf.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      const share = positions.getY(index) / height + 0.5;
      positions.setX(index, positions.getX(index) * (1 - share * 0.85));
      positions.setZ(index, share * share * 0.18);
    }
    leaf
      .translate(0, height / 2, 0)
      .rotateY(angle)
      .translate(Math.cos(angle) * 0.05, 0, Math.sin(angle) * 0.05);
    parts.push(
      paintShape(leaf, (point) =>
        new Color("#2f6b33").lerp(new Color("#9ccc5a"), Math.min(1, point.y)),
      ),
    );
  }
  return joinShapes(parts);
};

// ---------------------------------------------------------------------------
// Fish, a turtle, a manta ray, a dolphin and jellyfish.

interface FishLook {
  body: (point: Vector3) => Color;
  tail: string;
  fins: string;
  height: number;
  width: number;
}

const fishStations = 12;
const fishRingPoints = 10;

const findFishHalfHeight = (z: number, height: number): number => {
  const along = (z - 0.06) / 0.44;
  return Math.max(
    0.025,
    height * 0.2 * Math.sqrt(Math.max(0, 1 - along * along)),
  );
};

const buildFishShape = (look: FishLook): BufferGeometry => {
  const rings = Array.from({ length: fishStations }, (_, station) => {
    const z = -0.34 + (station / (fishStations - 1)) * 0.83;
    const halfHeight = findFishHalfHeight(z, look.height);
    const halfWidth = halfHeight * look.width;
    return Array.from({ length: fishRingPoints }, (_unused, point): Triple => {
      const angle = (point / fishRingPoints) * Math.PI * 2;
      return [Math.sin(angle) * halfWidth, Math.cos(angle) * halfHeight, z];
    });
  });
  const body = paintShape(buildLoftGeometry(rings), (point) =>
    look.body(point),
  );
  const fin = (corners: Triple[]): BufferGeometry => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(corners.flat()), 3),
    );
    return geometry;
  };
  const tailHeight = 0.2 * look.height;
  const tail = paintShape(
    fin([
      [0, 0, -0.3],
      [0, tailHeight * 1.1, -0.56],
      [0, 0, -0.46],
      [0, 0, -0.3],
      [0, 0, -0.46],
      [0, -tailHeight * 1.1, -0.56],
    ]),
    look.tail,
    true,
  );
  const top = findFishHalfHeight(0.1, look.height);
  const dorsal = paintShape(
    fin([
      [0, top * 0.95, 0.26],
      [0, top + 0.09, 0.02],
      [0, findFishHalfHeight(-0.2, look.height) * 0.9, -0.22],
      [0, -top * 0.95, 0.12],
      [0, findFishHalfHeight(-0.2, look.height) * -0.9, -0.2],
      [0, -top - 0.05, -0.05],
    ]),
    look.fins,
    true,
  );
  const pectorals = [-1, 1].map((side) =>
    paintShape(
      fin([
        [
          side * findFishHalfHeight(0.25, look.height) * look.width * 0.9,
          -0.02,
          0.24,
        ],
        [
          side * (findFishHalfHeight(0.2, look.height) * look.width + 0.08),
          -0.07,
          0.1,
        ],
        [
          side * findFishHalfHeight(0.15, look.height) * look.width * 0.9,
          -0.05,
          0.14,
        ],
      ]),
      look.fins,
      true,
    ),
  );
  const eyeZ = 0.35;
  const eyeX = findFishHalfHeight(eyeZ, look.height) * look.width * 0.8;
  const eyes = [-1, 1].flatMap((side) => [
    paintShape(
      new IcosahedronGeometry(0.038, 0).translate(side * eyeX, 0.035, eyeZ),
      "#f8fafc",
    ),
    paintShape(
      new IcosahedronGeometry(0.024, 0).translate(
        side * (eyeX + 0.02),
        0.035,
        eyeZ + 0.008,
      ),
      "#0b0f19",
    ),
  ]);
  return joinShapes([body, tail, dorsal, ...pectorals, ...eyes]);
};

const fishLooks = {
  blueTang: {
    body: (point) => {
      const isMark =
        point.y > 0.03 + 0.12 * Math.cos((point.z + 0.02) * 4.2) &&
        point.z < 0.3 &&
        point.z > -0.26;
      if (point.z < -0.27) {
        return new Color("#facc15");
      }
      return isMark
        ? new Color("#0b1b4a")
        : new Color("#2563eb").lerp(
            new Color("#60a5fa"),
            point.y < -0.06 ? 0.4 : 0,
          );
    },
    tail: "#facc15",
    fins: "#1e3a8a",
    height: 1.45,
    width: 0.38,
  },
  clownfish: {
    body: (point) => {
      const bands = [0.27, -0.03, -0.27];
      const band = Math.min(
        ...bands.map((centre) => Math.abs(point.z - centre)),
      );
      if (band < 0.035) {
        return new Color("#fff7ed");
      }
      if (band < 0.05) {
        return new Color("#1c1917");
      }
      return new Color("#f97316");
    },
    tail: "#ea580c",
    fins: "#f97316",
    height: 1.1,
    width: 0.55,
  },
  yellowTang: {
    body: (point) =>
      new Color("#fde047").lerp(new Color("#facc15"), point.y > 0.05 ? 0.6 : 0),
    tail: "#fef08a",
    fins: "#facc15",
    height: 1.6,
    width: 0.32,
  },
  anthias: {
    body: (point) => {
      const isStripe =
        Math.abs(point.y - (0.02 - (0.38 - point.z) * 0.12)) < 0.018 &&
        point.z > 0.1;
      if (isStripe) {
        return new Color("#fde047");
      }
      return new Color("#db2777").lerp(
        new Color("#f9a8d4"),
        point.y < 0 ? 0.6 : 0,
      );
    },
    tail: "#e879f9",
    fins: "#f0abfc",
    height: 0.95,
    width: 0.45,
  },
  silverside: {
    body: (point) => {
      if (point.y > 0.035) {
        return new Color("#1e40af");
      }
      return point.y > -0.01 ? new Color("#cbd5e1") : new Color("#f8fafc");
    },
    tail: "#94a3b8",
    fins: "#cbd5e1",
    height: 0.7,
    width: 0.5,
  },
} as const satisfies Record<string, FishLook>;

type FishKind = keyof typeof fishLooks;

const fishKinds: readonly FishKind[] = [
  "blueTang",
  "clownfish",
  "yellowTang",
  "anthias",
  "silverside",
];

const buildTurtleShape = (): BufferGeometry => {
  const shellPattern = (point: Vector3) => {
    const cellX = point.x * 9;
    const cellZ = point.z * 7.5;
    const ridge =
      Math.abs(Math.sin(cellX + Math.sin(cellZ) * 0.6)) *
      Math.abs(Math.sin(cellZ + Math.cos(cellX) * 0.5));
    return new Color("#5b4423")
      .lerp(new Color("#a87b3e"), Math.min(1, ridge * 1.4))
      .lerp(new Color("#3a2c16"), ridge < 0.08 ? 0.7 : 0);
  };
  const skin = (point: Vector3) =>
    new Color("#6f7d45").lerp(
      new Color("#c9c48a"),
      0.5 + 0.5 * Math.sin(point.x * 40) * Math.sin(point.z * 40),
    );
  return joinShapes([
    paintShape(
      new SphereGeometry(0.45, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(
        1,
        0.55,
        1.3,
      ),
      shellPattern,
    ),
    paintShape(
      new SphereGeometry(0.45, 20, 8)
        .scale(0.95, 0.16, 1.22)
        .translate(0, 0.01, 0),
      "#e6d7a3",
    ),
    paintShape(
      new SphereGeometry(0.15, 14, 10)
        .scale(0.85, 0.75, 1.3)
        .translate(0, 0.04, 0.68),
      skin,
    ),
    ...[-1, 1].map((side) =>
      paintShape(
        new SphereGeometry(0.022, 6, 4).translate(side * 0.1, 0.08, 0.76),
        "#111111",
      ),
    ),
    ...[-1, 1].map((side) =>
      placeShape(
        paintShape(new SphereGeometry(0.5, 14, 6), skin),
        [side * 0.68, -0.02, 0.18],
        [0, side * 0.55, side * -0.12],
        [0.72, 0.05, 0.2],
      ),
    ),
    ...[-1, 1].map((side) =>
      placeShape(
        paintShape(new SphereGeometry(0.5, 10, 5), skin),
        [side * 0.32, -0.02, -0.56],
        [0, side * -0.5, 0],
        [0.22, 0.05, 0.13],
      ),
    ),
  ]);
};

const buildMantaShape = (): BufferGeometry => {
  const span = 1.35;
  const columns = 26;
  const rows = 10;
  const findEdges = (u: number) => {
    const across = Math.abs(u);
    return {
      lead: 0.36 - 0.2 * across - 0.42 * across ** 2.2,
      trail:
        -0.42 * (1 - across) -
        0.34 * across +
        0.26 * Math.sin(Math.PI * across) ** 0.8,
    };
  };
  const surface = (isTop: boolean): BufferGeometry => {
    const positions: number[] = [];
    const indices: number[] = [];
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const u = (column / columns) * 2 - 1;
        const w = row / rows;
        const { lead, trail } = findEdges(u);
        const z = trail + (lead - trail) * w;
        const thickness = 0.07 * (1 - u * u) * Math.sin(Math.PI * w) ** 0.7;
        positions.push(u * span, isTop ? thickness : -thickness * 0.6, z);
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const corner = row * (columns + 1) + column;
        const above = corner + columns + 1;
        indices.push(
          ...(isTop
            ? [corner, corner + 1, above + 1, corner, above + 1, above]
            : [corner, above + 1, corner + 1, corner, above, above + 1]),
        );
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setIndex(indices);
    return geometry;
  };
  return joinShapes([
    paintShape(surface(true), (point) =>
      new Color("#1f2937").lerp(
        new Color("#475569"),
        Math.abs(point.x) > 0.25 && Math.abs(point.x) < 0.5 && point.z > 0
          ? 0.6
          : 0,
      ),
    ),
    paintShape(surface(false), "#e2e8f0"),
    ...[-1, 1].map((side) =>
      paintShape(
        new ConeGeometry(0.035, 0.2, 6)
          .rotateX(Math.PI / 2)
          .scale(1, 0.5, 1)
          .rotateY(side * 0.15)
          .translate(side * 0.15, 0.01, 0.42),
        "#1f2937",
      ),
    ),
    paintShape(
      buildRod(
        new Vector3(0, 0, -0.32),
        new Vector3(0, 0.02, -1.25),
        0.025,
        0.004,
        4,
      ),
      "#1f2937",
    ),
  ]);
};

const buildDolphinShape = (): BufferGeometry => {
  const stations = 22;
  const around = 14;
  const findRadius = (z: number) => {
    if (z > 0.62) {
      return 0.05 + 0.08 * (1 - (z - 0.62) / 0.16);
    }
    if (z > 0.45) {
      return 0.13 + 0.06 * Math.sin(((z - 0.45) / 0.17) * Math.PI);
    }
    return 0.05 + 0.18 * Math.sin(((z + 0.8) / 1.25) * Math.PI * 0.5) ** 1.2;
  };
  const rings = Array.from({ length: stations }, (_, station) => {
    const z = -0.8 + (station / (stations - 1)) * 1.58;
    const radius = findRadius(z);
    return Array.from({ length: around }, (_unused, point): Triple => {
      const angle = (point / around) * Math.PI * 2;
      return [Math.sin(angle) * radius * 0.85, Math.cos(angle) * radius, z];
    });
  });
  const skin = (point: Vector3) => {
    const radius = findRadius(point.z);
    const height = point.y / Math.max(radius, 0.01);
    return new Color("#e9eef5")
      .lerp(new Color("#8b9db3"), smoothStep(-0.45, 0.1, height))
      .lerp(new Color("#4b5b70"), smoothStep(0.3, 0.8, height));
  };
  return joinShapes([
    paintShape(buildLoftGeometry(rings), skin),
    paintShape(
      new ConeGeometry(0.16, 0.28, 4)
        .scale(1, 1, 0.12)
        .rotateY(Math.PI / 2)
        .rotateX(-0.55)
        .translate(0, 0.27, -0.05),
      "#4b5b70",
      true,
    ),
    ...[-1, 1].map((side) =>
      placeShape(
        paintShape(new SphereGeometry(0.5, 10, 5), "#64748b"),
        [side * 0.2, -0.08, 0.25],
        [0.3, side * 0.6, side * 0.6],
        [0.2, 0.025, 0.08],
      ),
    ),
    ...[-1, 1].map((side) =>
      placeShape(
        paintShape(new SphereGeometry(0.5, 10, 5), "#5b6b80"),
        [side * 0.17, 0, -0.86],
        [0, side * 0.5, 0],
        [0.32, 0.025, 0.12],
      ),
    ),
    ...[-1, 1].map((side) =>
      paintShape(
        new SphereGeometry(0.02, 6, 4).translate(side * 0.11, 0.04, 0.52),
        "#0b0f19",
      ),
    ),
  ]);
};

const buildJellyfishShape = (): BufferGeometry => {
  const profile = [
    [0, 0.34],
    [0.1, 0.33],
    [0.2, 0.28],
    [0.27, 0.19],
    [0.31, 0.08],
    [0.32, 0.0],
    [0.27, 0.02],
    [0.18, 0.1],
    [0.0, 0.12],
  ].map(([x, y]) => new Vector2(x, y));
  const bell = paintShape(new LatheGeometry(profile, 18), (point) =>
    new Color("#f5d0fe").lerp(
      new Color("#fb7185"),
      smoothStep(0.15, 0.0, point.y),
    ),
  );
  const parts: BufferGeometry[] = [bell];
  for (let tentacle = 0; tentacle < 10; tentacle++) {
    const angle = (tentacle / 10) * Math.PI * 2;
    parts.push(
      paintShape(
        new CylinderGeometry(0.006, 0.003, 0.9, 3, 8).translate(
          Math.cos(angle) * 0.27,
          -0.45,
          Math.sin(angle) * 0.27,
        ),
        "#fbcfe8",
      ),
    );
  }
  for (let arm = 0; arm < 4; arm++) {
    const angle = (arm / 4) * Math.PI * 2 + 0.4;
    const ribbon = new PlaneGeometry(0.07, 0.55, 1, 8).translate(0, -0.28, 0);
    const positions = ribbon.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      const y = positions.getY(index);
      positions.setZ(index, Math.sin(y * 18) * 0.025);
    }
    parts.push(
      paintShape(
        ribbon
          .rotateY(angle)
          .translate(Math.cos(angle) * 0.05, 0.02, Math.sin(angle) * 0.05),
        "#f9a8d4",
      ),
    );
  }
  return joinShapes(parts);
};

const buildBubbleShape = (): BufferGeometry => {
  const bubble = new IcosahedronGeometry(1, 1);
  bubble.deleteAttribute("uv");
  return bubble;
};

const bubbleVertex = /* glsl */ `
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
  vec4 viewed = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vViewNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
  vViewPosition = viewed.xyz;
  gl_Position = projectionMatrix * viewed;
}
`;

const bubbleFragment = /* glsl */ `
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
  vec3 toEye = normalize(-vViewPosition);
  vec3 normal = normalize(vViewNormal);
  float facing = abs(dot(normal, toEye));
  float rim = pow(1.0 - facing, 2.2);
  float glint = pow(max(dot(normal, normalize(vec3(-0.4, 0.7, 0.6))), 0.0), 24.0);
  float alpha = clamp(0.08 + rim * 0.85 + glint, 0.0, 1.0);
  gl_FragColor = vec4(mix(vec3(0.7, 0.95, 1.0), vec3(1.0), glint), alpha);
}
`;

// ---------------------------------------------------------------------------
// Pier pilings, the ladder up, a sunken Wizzaroo treasure chest and an anchor.

const pilingRows = [-1.35, 1.35];

const listPilingSpots = (length: number): { x: number; z: number }[] => [
  ...[-2.6, -5.2, -7.8, -10.4].flatMap((x) =>
    pilingRows.map((z) => ({ x, z })),
  ),
  ...[1.6, 4.2, 6.8, 9.4].flatMap((x) =>
    pilingRows.map((z) => ({ x: length + x, z })),
  ),
];

const pierDeckHeight = 0.7;
const ladderX = (length: number) => length + 1.08;

const paintPiling = (point: Vector3, normal: Vector3, bed: number) => {
  const aboveBed = point.y - bed;
  const grain =
    0.85 + 0.15 * Math.sin(Math.atan2(normal.z, normal.x) * 9 + point.y * 0.8);
  const wood = new Color("#7a5634").multiplyScalar(grain);
  return wood
    .lerp(new Color("#42502a"), smoothStep(1.6, 0.2, aboveBed) * 0.8)
    .lerp(
      new Color("#2d4a3a"),
      smoothStep(-0.6, -0.05, point.y) * smoothStep(0.2, -0.2, point.y) * 0.6,
    );
};

const buildStructuresShape = (length: number): BufferGeometry => {
  const parts: BufferGeometry[] = [];
  const random = makeRandom(91);
  listPilingSpots(length).forEach(({ x, z }) => {
    const bed = findSeabedHeight(x, z, length) - 0.3;
    const top = pierDeckHeight - 0.05;
    const height = top - bed;
    parts.push(
      paintShape(
        new CylinderGeometry(0.13, 0.15, height, 12, 6).translate(
          x,
          bed + height / 2,
          z,
        ),
        (point, normal) => paintPiling(point, normal, bed),
      ),
    );
    for (let barnacle = 0; barnacle < 10; barnacle++) {
      const angle = random() * Math.PI * 2;
      const y = bed + 0.3 + random() * 1.2;
      parts.push(
        paintShape(
          new ConeGeometry(0.035, 0.04, 6)
            .rotateX(Math.PI / 2)
            .rotateY(angle + Math.PI / 2)
            .translate(
              x + Math.cos(angle) * 0.15,
              y,
              z - Math.sin(angle) * 0.15,
            ),
          barnacle % 3 === 0 ? "#2b2f4a" : "#e5e1d3",
        ),
      );
    }
  });
  // cross braces between each pair of pilings
  [-1, 1].forEach((end) => {
    const xs = end < 0 ? [-2.6, -5.2, -7.8] : [length + 4.2, length + 6.8];
    xs.forEach((x) => {
      parts.push(
        paintShape(
          buildRod(
            new Vector3(x, -0.5, pilingRows[0]),
            new Vector3(x, -2.3, pilingRows[1]),
            0.05,
            0.05,
            6,
          ),
          "#5b4029",
        ),
      );
    });
  });
  // the pier decks, dark against the light above
  [
    { from: -11.5, to: -1.9 },
    { from: length + 1.0, to: length + 11.5 },
  ].forEach(({ from, to }) => {
    parts.push(
      paintShape(
        new BoxGeometry(to - from, 0.14, 3.3).translate(
          (from + to) / 2,
          pierDeckHeight + 0.07,
          0,
        ),
        "#4a3524",
      ),
    );
    [-1.45, 1.45].forEach((z) => {
      parts.push(
        paintShape(
          new BoxGeometry(to - from, 0.18, 0.14).translate(
            (from + to) / 2,
            pierDeckHeight - 0.08,
            z,
          ),
          "#3d2c1e",
        ),
      );
    });
  });
  // the ladder up on to the next Island's pier
  const ladder = ladderX(length);
  const ladderBottom = -2.4;
  [-0.28, 0.28].forEach((z) => {
    parts.push(
      paintShape(
        new CylinderGeometry(
          0.03,
          0.03,
          pierDeckHeight + 0.4 - ladderBottom,
          8,
        ).translate(ladder, (pierDeckHeight + 0.4 + ladderBottom) / 2, z),
        (point) =>
          new Color("#cbd5e1").lerp(
            new Color("#5f7a6a"),
            smoothStep(-0.3, -2.2, point.y) * 0.6,
          ),
      ),
    );
  });
  for (let rung = 0; rung < 9; rung++) {
    const y = ladderBottom + 0.15 + rung * 0.36;
    parts.push(
      paintShape(
        new CylinderGeometry(0.022, 0.022, 0.56, 6)
          .rotateX(Math.PI / 2)
          .translate(ladder, y, 0),
        y < 0 ? "#9fb3a6" : "#e2e8f0",
      ),
    );
  }
  return joinShapes(parts);
};

interface ChestPlacement {
  matrix: Matrix4;
  rotation: Quaternion;
}

const findChestPlacement = (length: number): ChestPlacement => {
  const x = length * 0.56;
  const z = 1.6;
  const y = findSeabedHeight(x, z, length) - 0.06;
  const rotation = new Quaternion().setFromEuler(
    new Euler(0.05, Math.PI + 0.45, 0.06),
  );
  return {
    matrix: new Matrix4().compose(
      new Vector3(x, y, z),
      rotation,
      new Vector3(1, 1, 1),
    ),
    rotation,
  };
};

const chestSize = { width: 0.72, height: 0.36, depth: 0.44 } as const;

const buildChestBodyShape = (): BufferGeometry =>
  new BoxGeometry(chestSize.width, chestSize.height, chestSize.depth).translate(
    0,
    chestSize.height / 2,
    0,
  );

const buildChestShape = (length: number): BufferGeometry => {
  const { matrix } = findChestPlacement(length);
  const half = chestSize.depth / 2;
  const lidOpen = 0.75;
  const lid = joinShapes([
    paintShape(
      new CylinderGeometry(
        half,
        half,
        chestSize.width,
        14,
        1,
        false,
        0,
        Math.PI,
      ).rotateZ(Math.PI / 2),
      "#4c1d95",
    ),
    ...[-0.3, 0, 0.3].map((x) =>
      paintShape(
        new CylinderGeometry(
          half + 0.012,
          half + 0.012,
          0.045,
          14,
          1,
          true,
          0,
          Math.PI,
        )
          .rotateZ(Math.PI / 2)
          .translate(x, 0, 0),
        "#f5c542",
      ),
    ),
  ])
    .translate(0, 0, half)
    .rotateX(-lidOpen)
    .translate(0, chestSize.height, -half);
  const coins = Array.from({ length: 26 }, (_, coin) => {
    const angle = coin * 2.4;
    const reach = Math.sqrt(coin / 26) * 0.26;
    const inside = coin < 14;
    return paintShape(
      new CylinderGeometry(0.045, 0.045, 0.012, 10)
        .rotateX(coin * 0.7)
        .rotateZ(coin * 0.3)
        .translate(
          inside
            ? Math.cos(angle) * reach
            : 0.42 + Math.cos(angle) * reach * 1.4,
          inside ? chestSize.height - 0.01 + (coin % 3) * 0.02 : 0.02,
          inside
            ? Math.sin(angle) * reach * 0.6
            : 0.2 + Math.sin(angle) * reach,
        ),
      "#ffd54a",
    );
  });
  const gems = ["#ef4444", "#22c55e", "#38bdf8", "#e879f9"].map((colour, gem) =>
    paintShape(
      new OctahedronGeometry(0.045).translate(
        -0.15 + gem * 0.1,
        chestSize.height + 0.04,
        -0.05 + (gem % 2) * 0.08,
      ),
      colour,
      true,
    ),
  );
  const body = joinShapes([
    paintShape(buildChestBodyShape(), "#5b21b6"),
    ...[-0.3, 0, 0.3].map((x) =>
      paintShape(
        new BoxGeometry(
          0.045,
          chestSize.height + 0.01,
          chestSize.depth + 0.02,
        ).translate(x, chestSize.height / 2, 0),
        "#f5c542",
      ),
    ),
    paintShape(
      new BoxGeometry(
        chestSize.width + 0.02,
        0.04,
        chestSize.depth + 0.02,
      ).translate(0, 0.02, 0),
      "#d4a537",
    ),
    paintShape(
      new BoxGeometry(0.08, 0.1, 0.03).translate(
        0,
        chestSize.height - 0.07,
        half + 0.012,
      ),
      "#f5c542",
    ),
    lid,
    ...coins,
    ...gems,
  ]);
  return body.applyMatrix4(matrix);
};

const buildAnchorShape = (length: number): BufferGeometry => {
  const x = length * 0.3;
  const z = -2.2;
  const bed = findSeabedHeight(x, z, length);
  const iron = (point: Vector3) =>
    new Color("#3f4652").lerp(
      new Color("#8a4b2a"),
      smoothStep(
        0.45,
        0.8,
        findSmoothNoise(point.x * 9, point.y * 9 + point.z * 5),
      ),
    );
  const anchor = joinShapes([
    paintShape(
      new CylinderGeometry(0.045, 0.05, 1.3, 8).translate(0, 0.65, 0),
      iron,
    ),
    paintShape(
      new TorusGeometry(0.42, 0.045, 8, 20, Math.PI)
        .rotateZ(Math.PI)
        .translate(0, 0.42, 0),
      iron,
    ),
    ...[-1, 1].map((side) =>
      paintShape(
        new ConeGeometry(0.11, 0.24, 4)
          .scale(1, 1, 0.3)
          .rotateZ(side * -0.5)
          .translate(side * 0.42, 0.5, 0),
        iron,
        true,
      ),
    ),
    paintShape(
      new CylinderGeometry(0.035, 0.035, 0.75, 8)
        .rotateX(Math.PI / 2)
        .translate(0, 1.12, 0),
      iron,
    ),
    paintShape(
      new TorusGeometry(0.09, 0.025, 6, 14).translate(0, 1.38, 0),
      "#f5c542",
    ),
  ]).applyMatrix4(composeMatrix([x, bed + 0.12, z], [0.1, 0.8, 1.32], 0.9));
  const chain = Array.from({ length: 12 }, (_, link) => {
    const along = link * 0.11;
    const chainX = x - 0.6 - along * 0.9;
    const chainZ = z + along * 0.4;
    return paintShape(
      new TorusGeometry(0.06, 0.017, 5, 10)
        .scale(1.3, 1, 1)
        .rotateX(link % 2 === 0 ? Math.PI / 2 : 0)
        .rotateY(-0.42)
        .translate(
          chainX,
          findSeabedHeight(chainX, chainZ, length) + 0.03,
          chainZ,
        ),
      "#4b5563",
    );
  });
  return joinShapes([anchor, ...chain]);
};

// ---------------------------------------------------------------------------
// The sea bed and its reef, all in one geometry.

const buildSeabedShape = (length: number): BufferGeometry => {
  const width = length + 46;
  const depth = 58;
  const plane = new PlaneGeometry(
    width,
    depth,
    Math.round(width / 0.5),
    Math.round(depth / 0.55),
  );
  plane.rotateX(-Math.PI / 2).translate(length / 2, 0, 0);
  const positions = plane.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    positions.setY(index, findSeabedHeight(x, z, length));
  }
  return paintShape(plane, (point) => {
    const patch = findSmoothNoise(point.x * 0.3 + 3, point.z * 0.3 - 5);
    const algae = smoothStep(
      0.62,
      0.78,
      findSmoothNoise(point.x * 0.18 - 9, point.z * 0.18 + 2),
    );
    const trough = smoothStep(
      0.15,
      -0.35,
      point.y - findSeabedHeight(point.x, point.z, length) + 0.02,
    );
    return new Color("#cfb27a")
      .lerp(new Color("#a98a58"), patch)
      .lerp(new Color("#8a8a4c"), algae * 0.5)
      .multiplyScalar(1 - trough * 0.1);
  });
};

interface ReefPiece {
  shape: BufferGeometry;
  colours: readonly string[];
  size: [number, number];
  weight: number;
  sink?: number;
}

const buildReefShape = (
  length: number,
  random: () => number,
): BufferGeometry => {
  const pieces: ReefPiece[] = [
    {
      shape: buildRockShape(1),
      colours: ["#ffffff", "#e7e2da", "#d7dde2"],
      size: [0.35, 1.1],
      weight: 6,
      sink: 0.25,
    },
    {
      shape: buildRockShape(7),
      colours: ["#ffffff", "#ebe4dc"],
      size: [0.6, 1.6],
      weight: 2,
      sink: 0.35,
    },
    {
      shape: buildBrainCoralShape(),
      colours: ["#d9a441", "#b7c94a", "#e8a37a", "#c084fc"],
      size: [0.25, 0.55],
      weight: 4,
    },
    {
      shape: buildBranchingCoralShape(3, false),
      colours: ["#fb923c", "#f472b6", "#c084fc", "#fde047"],
      size: [0.6, 1.1],
      weight: 5,
    },
    {
      shape: buildBranchingCoralShape(11, true),
      colours: ["#f9a8d4", "#a78bfa", "#fdba74", "#67e8f9"],
      size: [0.6, 1.0],
      weight: 5,
    },
    {
      shape: buildFanCoralShape(5),
      colours: ["#c026d3", "#e11d48", "#f97316", "#a855f7"],
      size: [0.6, 1.0],
      weight: 4,
    },
    {
      shape: buildTubeSpongeShape(2),
      colours: ["#facc15", "#a855f7", "#fb923c", "#ec4899"],
      size: [0.7, 1.1],
      weight: 4,
    },
    {
      shape: buildAnemoneShape(),
      colours: ["#f472b6", "#a3e635", "#fb7185", "#c4b5fd"],
      size: [0.8, 1.3],
      weight: 3,
    },
    {
      shape: buildStarfishShape(),
      colours: ["#f97316", "#dc2626", "#a855f7", "#2563eb", "#facc15"],
      size: [0.8, 1.3],
      weight: 3,
    },
    {
      shape: buildUrchinShape(),
      colours: ["#3b0764", "#1e1b4b", "#831843"],
      size: [0.8, 1.3],
      weight: 2,
    },
    {
      shape: buildShellShape(),
      colours: ["#fde7d0", "#fbcfe8", "#fed7aa"],
      size: [0.8, 1.4],
      weight: 3,
    },
    {
      shape: buildPebbleShape(),
      colours: ["#a8a29e", "#d6d3d1", "#78716c"],
      size: [0.05, 0.12],
      weight: 5,
    },
  ];
  const totalWeight = pieces.reduce((total, piece) => total + piece.weight, 0);
  const choosePiece = (): ReefPiece => {
    let pick = random() * totalWeight;
    for (const piece of pieces) {
      pick -= piece.weight;
      if (pick <= 0) {
        return piece;
      }
    }
    return pieces[0];
  };
  const batch = new ShapeBatch();
  const placePiece = (piece: ReefPiece, x: number, z: number) => {
    const size = piece.size[0] + random() * (piece.size[1] - piece.size[0]);
    const bed = findSeabedHeight(x, z, length);
    const tint = new Color(
      piece.colours[Math.floor(random() * piece.colours.length)],
    ).multiplyScalar(0.9 + random() * 0.2);
    batch.add(
      piece.shape,
      composeMatrix(
        [x, bed - (piece.sink ?? 0.03) * size, z],
        [
          (random() - 0.5) * 0.2,
          random() * Math.PI * 2,
          (random() - 0.5) * 0.2,
        ],
        size,
      ),
      tint,
    );
  };
  // coral gardens: clusters of pieces along both sides of the way
  const gardens = Math.round(length * 0.75);
  for (let garden = 0; garden < gardens; garden++) {
    const x = -6 + random() * (length + 12);
    const side = random() < 0.62 ? 1 : -1;
    const z = side * (0.5 + random() ** 1.4 * 10);
    const count = 5 + Math.floor(random() * 7);
    for (let piece = 0; piece < count; piece++) {
      placePiece(
        choosePiece(),
        x + (random() - 0.5) * 2.4,
        z + (random() - 0.5) * 2.4,
      );
    }
  }
  // scattered shells, starfish and pebbles across the open sand
  const scattered = Math.round(length * 4);
  for (let piece = 0; piece < scattered; piece++) {
    const chosen = pieces[8 + Math.floor(random() * 4)];
    placePiece(chosen, -8 + random() * (length + 16), (random() - 0.5) * 26);
  }
  pieces.forEach(({ shape }) => {
    shape.dispose();
  });
  return batch.build();
};

// ---------------------------------------------------------------------------
// The water's surface seen from below, light shafts, and drifting specks.

const surfaceVertex = /* glsl */ `
uniform float uSeaTime;
varying vec3 vWorld;
float seaWave(vec2 p, float t) {
  return 0.07 * sin(p.x * 0.35 + t * 0.9)
    + 0.05 * sin(p.y * 0.42 - t * 0.75 + p.x * 0.12)
    + 0.03 * sin((p.x + p.y) * 0.9 + t * 1.6)
    + 0.02 * sin((p.x * 1.7 - p.y * 1.3) + t * 2.1);
}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += seaWave(world.xz, uSeaTime);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const surfaceFragment = /* glsl */ `
uniform float uSeaTime;
uniform vec3 uFogColour;
uniform float uFogDensity;
varying vec3 vWorld;
${causticGlsl}
float rippleHeight(vec2 p, float t) {
  return 0.05 * sin(p.x * 1.9 + t * 1.7 + sin(p.y * 0.8))
    + 0.04 * sin(p.y * 2.3 - t * 1.3 + sin(p.x * 0.9))
    + 0.025 * sin((p.x - p.y) * 3.7 + t * 2.4)
    + 0.015 * sin((p.x * 2.0 + p.y * 3.0) * 1.9 - t * 3.1);
}
void main() {
  vec2 p = vWorld.xz;
  float t = uSeaTime;
  float e = 0.05;
  float h = rippleHeight(p, t);
  vec2 slope = vec2(rippleHeight(p + vec2(e, 0.0), t) - h, rippleHeight(p + vec2(0.0, e), t) - h) / e;
  vec3 view = normalize(vWorld - cameraPosition);
  float upness = view.y + dot(slope, view.xz) * 0.35;
  float window = smoothstep(0.5, 0.82, upness);
  float pattern = seaCaustic(p * 1.4, t * 1.3);
  vec3 sky = mix(vec3(0.45, 0.88, 0.98), vec3(0.92, 1.0, 1.0), clamp(pattern * 0.7 + 0.15, 0.0, 1.0));
  vec3 under = mix(vec3(0.03, 0.3, 0.4), vec3(0.16, 0.62, 0.72), clamp(pattern * 0.6 + 0.25 + slope.x * 0.6, 0.0, 1.0));
  vec3 colour = mix(under, sky, window);
  vec3 sun = normalize(vec3(0.25, 1.0, 0.15));
  float glare = pow(max(dot(normalize(view + vec3(slope.x, 0.0, slope.y) * 0.25), sun), 0.0), 80.0);
  colour += vec3(1.0, 0.98, 0.9) * glare * 2.2;
  float distance = length(vWorld - cameraPosition);
  float fogged = 1.0 - exp(-pow(uFogDensity * distance * 0.85, 2.0));
  colour = mix(colour, uFogColour, fogged);
  gl_FragColor = vec4(colour, 0.96);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const buildSurfaceMaterial = (clock: SeaUniforms): ShaderMaterial =>
  new ShaderMaterial({
    uniforms: {
      uSeaTime: clock.uSeaTime,
      uFogColour: { value: new Color(waterColours.fog) },
      uFogDensity: { value: fogDensity },
    },
    vertexShader: surfaceVertex,
    fragmentShader: surfaceFragment,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
  });

const rayVertex = /* glsl */ `
uniform float uSeaTime;
varying vec2 vShaft;
varying float vWorldY;
varying float vDistance;
varying float vPhase;
void main() {
  float phase = instanceMatrix[3].x * 0.71 + instanceMatrix[3].z * 1.31;
  vec3 local = position;
  float down = -local.y;
  local.x += sin(uSeaTime * 0.35 + phase) * 0.18 * down;
  vec4 world = modelMatrix * instanceMatrix * vec4(local, 1.0);
  vShaft = vec2(uv.x, down);
  vWorldY = world.y;
  vPhase = phase;
  vec4 viewed = viewMatrix * world;
  vDistance = -viewed.z;
  gl_Position = projectionMatrix * viewed;
}
`;

const rayFragment = /* glsl */ `
uniform float uSeaTime;
uniform float uFogDensity;
uniform float uStrength;
varying vec2 vShaft;
varying float vWorldY;
varying float vDistance;
varying float vPhase;
void main() {
  float edge = sin(vShaft.x * 3.14159);
  edge *= edge;
  float fade = pow(1.0 - clamp(vShaft.y, 0.0, 1.0), 1.6);
  float shimmer = 0.6 + 0.4 * sin(uSeaTime * 0.8 + vPhase * 3.0);
  float near = smoothstep(0.8, 3.5, vDistance);
  float far = exp(-pow(uFogDensity * vDistance * 0.7, 2.0));
  float bed = smoothstep(-6.5, -3.0, vWorldY);
  float strength = edge * fade * shimmer * near * far * bed * uStrength;
  gl_FragColor = vec4(vec3(0.75, 0.97, 1.0) * strength, 1.0);
}
`;

const buildRayShape = (): BufferGeometry => {
  const plane = new PlaneGeometry(1, 1, 1, 6).translate(0, -0.5, 0);
  const crossed = plane.clone().rotateY(Math.PI / 2);
  const merged = mergeGeometries([plane, crossed]);
  plane.dispose();
  crossed.dispose();
  merged.deleteAttribute("normal");
  return merged;
};

const snowVertex = /* glsl */ `
uniform float uSeaTime;
uniform vec3 uCentre;
uniform vec3 uBox;
uniform float uScale;
varying float vFade;
void main() {
  vec3 drift = vec3(sin(uSeaTime * 0.13 + position.y) * 0.4, -uSeaTime * 0.06, cos(uSeaTime * 0.11 + position.x) * 0.3);
  vec3 wrapped = mod(position + drift - uCentre + uBox * 0.5, uBox) - uBox * 0.5 + uCentre;
  wrapped.y = min(wrapped.y, -0.2);
  vec4 viewed = viewMatrix * vec4(wrapped, 1.0);
  float distance = -viewed.z;
  gl_PointSize = uScale * (0.6 + fract(position.x * 13.7) * 0.9) / max(distance, 0.5);
  vFade = smoothstep(0.6, 2.0, distance) * (1.0 - smoothstep(9.0, 14.0, distance));
  gl_Position = projectionMatrix * viewed;
}
`;

const snowFragment = /* glsl */ `
varying float vFade;
void main() {
  vec2 at = gl_PointCoord - 0.5;
  float round = smoothstep(0.5, 0.1, length(at));
  gl_FragColor = vec4(vec3(0.85, 0.97, 1.0), round * vFade * 0.75);
}
`;

// ---------------------------------------------------------------------------
// Schools of fish that circle and flee from the diver.

interface School {
  kind: FishKind;
  centre: Vector3;
  radius: number;
  turnSpeed: number;
  spread: number;
  size: number;
  fish: { offset: Vector3; phase: number; speed: number }[];
}

const schoolPlans: {
  kind: FishKind;
  count: number;
  size: number;
  spread: number;
  radius: number;
}[] = [
  { kind: "silverside", count: 44, size: 0.2, spread: 0.9, radius: 1.6 },
  { kind: "blueTang", count: 10, size: 0.3, spread: 0.8, radius: 1.8 },
  { kind: "yellowTang", count: 9, size: 0.27, spread: 0.7, radius: 1.5 },
  { kind: "anthias", count: 14, size: 0.2, spread: 0.8, radius: 1.2 },
  { kind: "clownfish", count: 4, size: 0.17, spread: 0.3, radius: 0.4 },
];

const planSchools = (length: number, random: () => number): School[] => {
  const schools: School[] = [];
  const spots = Math.max(5, Math.round(length / 3.2));
  for (let spot = 0; spot < spots; spot++) {
    const plan = schoolPlans[spot % schoolPlans.length];
    const x =
      1.5 + ((spot + 0.5) / spots) * (length - 1) + (random() - 0.5) * 2;
    const side = spot % 3 === 1 ? -1 : 1;
    const z = side * (1.6 + random() * 3.5);
    const isLow = plan.kind === "clownfish" || plan.kind === "anthias";
    const bed = findSeabedHeight(x, z, length);
    const y = isLow
      ? bed + 0.7 + random() * 0.4
      : Math.min(-1.2, bed + 1.6 + random() * 1.6);
    schools.push({
      kind: plan.kind,
      centre: new Vector3(x, y, z),
      radius: plan.radius,
      turnSpeed: (0.35 + random() * 0.3) * (random() < 0.5 ? -1 : 1),
      spread: plan.spread,
      size: plan.size,
      fish: Array.from({ length: plan.count }, () => ({
        offset: new Vector3(
          random() - 0.5,
          (random() - 0.5) * 0.6,
          random() - 0.5,
        ).multiplyScalar(2),
        phase: random() * Math.PI * 2,
        speed: 0.85 + random() * 0.3,
      })),
    });
  }
  const bait = schoolPlans[0];
  const baitX = length * 0.38;
  schools.push({
    kind: bait.kind,
    centre: new Vector3(baitX, -2.1, 0.8),
    radius: 1.3,
    turnSpeed: 0.55,
    spread: 0.8,
    size: 0.19,
    fish: Array.from({ length: 50 }, () => ({
      offset: new Vector3(
        random() - 0.5,
        (random() - 0.5) * 0.7,
        random() - 0.5,
      ).multiplyScalar(2),
      phase: random() * Math.PI * 2,
      speed: 0.85 + random() * 0.3,
    })),
  });
  return schools;
};

const findFishSpot = (
  school: School,
  fish: School["fish"][number],
  seconds: number,
  diver: Vector3,
  calm: number,
  into: Vector3,
): Vector3 => {
  const angle =
    seconds * school.turnSpeed * fish.speed * calm + fish.phase * 0.25;
  const awayX = school.centre.x - diver.x;
  const awayZ = school.centre.z - diver.z;
  const away = Math.hypot(awayX, awayZ);
  const fleeing = smoothStep(
    5,
    1.4,
    Math.hypot(away, school.centre.y - diver.y),
  );
  const spread = school.spread * (1 + fleeing * 1.4);
  const ring = school.radius * (1 + 0.2 * Math.sin(seconds * 0.5 + fish.phase));
  const swirl = angle + fish.offset.x * 0.9;
  into.set(
    school.centre.x + Math.cos(swirl) * ring + fish.offset.x * spread * 0.5,
    school.centre.y +
      fish.offset.y * spread +
      Math.sin(seconds * 0.9 + fish.phase) * 0.12 * calm,
    school.centre.z + Math.sin(swirl) * ring + fish.offset.z * spread * 0.5,
  );
  const push = fleeing * 2.4;
  if (away > 0.001) {
    into.x += (awayX / away) * push;
    into.z += (awayZ / away) * push;
  }
  into.y += fleeing * 0.6;
  return into;
};

// ---------------------------------------------------------------------------
// The whole underwater world, built once for a crossing of a given length.

const bubbleCount = 64;

interface Bubble {
  position: Vector3;
  age: number;
  life: number;
  size: number;
  phase: number;
  isLive: boolean;
}

interface Creature {
  mesh: Mesh;
  place: (seconds: number, share: number, into: Object3D) => void;
}

interface AdvanceInput {
  elapsed: number;
  seconds: number;
  camera: Camera;
  diver: Group | null;
  pose: Group | null;
  isEffectsOn: boolean;
  isReduced: boolean;
}

class UnderwaterWorld {
  readonly root = new Group();
  readonly length: number;
  private readonly clock: SeaUniforms = { uSeaTime: { value: 0 } };
  private readonly disposables: { dispose: () => void }[] = [];
  private readonly surface: Mesh;
  private readonly rays: InstancedMesh;
  private readonly rayMaterial: ShaderMaterial;
  private readonly snow: Points;
  private readonly snowMaterial: ShaderMaterial;
  private readonly fishMeshes = new Map<FishKind, InstancedMesh>();
  private readonly schools: School[];
  private readonly bubbles: InstancedMesh;
  private readonly bubbleState: Bubble[];
  private readonly jellies: InstancedMesh;
  private readonly jellySpots: {
    position: Vector3;
    size: number;
    phase: number;
  }[];
  private readonly creatures: Creature[] = [];
  private readonly lamp = new PointLight("#fff3e0", 5, 9, 1.4);
  private readonly placement = new Object3D();
  private readonly spot = new Vector3();
  private readonly ahead = new Vector3();
  private readonly diverSpot = new Vector3();
  private readonly mouth = new Vector3();
  private readonly snowCentre = new Vector3();
  private nextBreath = 0.6;
  private nextBubble = 0;
  private lastElapsed = 0;

  constructor(length: number) {
    this.length = length;
    const random = makeRandom(Math.round(length * 1000) + 17);
    this.root.name = "underwater-world";
    this.root.add(this.lamp);

    const seabedMaterial = this.keep(
      buildSeaMaterial({
        clock: this.clock,
        isSand: true,
        roughness: 1,
        caustics: 1.1,
      }),
    );
    this.addMesh("underwater-seabed", buildSeabedShape(length), seabedMaterial);

    const reefMaterial = this.keep(
      buildSeaMaterial({
        clock: this.clock,
        roughness: 0.75,
        caustics: 0.9,
        selfLight: 0.1,
      }),
    );
    this.addMesh(
      "underwater-reef",
      buildReefShape(length, random),
      reefMaterial,
    );
    this.addMesh(
      "underwater-piers",
      joinShapes([
        buildStructuresShape(length),
        buildChestShape(length),
        buildAnchorShape(length),
      ]),
      this.keep(
        buildSeaMaterial({
          clock: this.clock,
          roughness: 0.7,
          caustics: 0.8,
          selfLight: 0.05,
        }),
      ),
    );

    const surfaceMaterial = this.keep(buildSurfaceMaterial(this.clock));
    this.surface = this.addMesh(
      "underwater-surface",
      new PlaneGeometry(150, 150, 90, 90).rotateX(Math.PI / 2),
      surfaceMaterial,
    );
    this.surface.renderOrder = 1;

    this.rayMaterial = this.keep(
      new ShaderMaterial({
        uniforms: {
          uSeaTime: this.clock.uSeaTime,
          uFogDensity: { value: fogDensity },
          uStrength: { value: 0.22 },
        },
        vertexShader: rayVertex,
        fragmentShader: rayFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    );
    const rayCount = Math.round(length * 1.1) + 12;
    this.rays = this.addInstanced(
      "underwater-light-shafts",
      buildRayShape(),
      this.rayMaterial,
      rayCount,
    );
    this.rays.renderOrder = 2;
    for (let ray = 0; ray < rayCount; ray++) {
      this.placement.position.set(
        -8 + random() * (length + 16),
        0.1,
        (random() - 0.5) * 22,
      );
      this.placement.rotation.set(0, random() * Math.PI, 0.32, "YXZ");
      this.placement.scale.set(0.5 + random() * 1.6, 7 + random() * 4, 1);
      this.placement.updateMatrix();
      this.rays.setMatrixAt(ray, this.placement.matrix);
    }

    this.addPlants(length, random);
    this.schools = planSchools(length, random);
    this.addFish();

    const bubbleMaterial = this.keep(
      new ShaderMaterial({
        vertexShader: bubbleVertex,
        fragmentShader: bubbleFragment,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.bubbles = this.addInstanced(
      "underwater-bubbles",
      buildBubbleShape(),
      bubbleMaterial,
      bubbleCount,
    );
    this.bubbles.renderOrder = 3;
    this.bubbleState = Array.from({ length: bubbleCount }, () => ({
      position: new Vector3(),
      age: 0,
      life: 1,
      size: 0,
      phase: 0,
      isLive: false,
    }));

    const jellyMaterial = this.keep(
      buildSeaMaterial({
        clock: this.clock,
        deform: "pulse",
        deformShape: [0.14, 2.2, 0, 0],
        opacity: 0.62,
        caustics: 0,
        selfLight: 0.55,
        isDoubleSided: true,
        roughness: 0.3,
      }),
    );
    this.jellySpots = Array.from(
      { length: Math.max(6, Math.round(length / 3.5)) },
      (_, jelly) => {
        const x =
          length *
            (0.25 + 0.6 * (jelly / Math.max(6, Math.round(length / 3.5)))) +
          (random() - 0.5) * 3;
        return {
          position: new Vector3(x, -1.4 - random() * 2.2, 2.6 + random() * 5),
          size: 0.35 + random() * 0.35,
          phase: random() * Math.PI * 2,
        };
      },
    );
    this.jellies = this.addInstanced(
      "underwater-jellyfish",
      buildJellyfishShape(),
      jellyMaterial,
      this.jellySpots.length,
    );
    this.jellies.renderOrder = 3;
    this.addCreatures();

    const snowCount = 900;
    const snowPositions = new Float32Array(snowCount * 3);
    for (let speck = 0; speck < snowCount; speck++) {
      snowPositions.set(
        [random() * 26, random() * 12, random() * 26],
        speck * 3,
      );
    }
    const snowGeometry = new BufferGeometry();
    snowGeometry.setAttribute(
      "position",
      new BufferAttribute(snowPositions, 3),
    );
    this.snowMaterial = this.keep(
      new ShaderMaterial({
        uniforms: {
          uSeaTime: this.clock.uSeaTime,
          uCentre: { value: this.snowCentre },
          uBox: { value: new Vector3(26, 12, 26) },
          uScale: { value: 60 },
        },
        vertexShader: snowVertex,
        fragmentShader: snowFragment,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.snow = new Points(this.keep(snowGeometry), this.snowMaterial);
    this.snow.name = "underwater-marine-snow";
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 4;
    this.root.add(this.snow);
  }

  private keep<Thing extends { dispose: () => void }>(thing: Thing): Thing {
    this.disposables.push(thing);
    return thing;
  }

  private addMesh(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial | ShaderMaterial,
  ): Mesh {
    const mesh = new Mesh(this.keep(geometry), material);
    mesh.name = name;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.root.add(mesh);
    return mesh;
  }

  private addInstanced(
    name: string,
    geometry: BufferGeometry,
    material: MeshStandardMaterial | ShaderMaterial,
    count: number,
  ): InstancedMesh {
    const mesh = new InstancedMesh(this.keep(geometry), material, count);
    mesh.name = name;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return mesh;
  }

  private addPlants(length: number, random: () => number): void {
    const kelpMaterial = this.keep(
      buildSeaMaterial({
        clock: this.clock,
        deform: "sway",
        deformShape: [0.42, 0.75, 2.2, 0],
        isDoubleSided: true,
        roughness: 0.6,
        caustics: 0.6,
        selfLight: 0.12,
      }),
    );
    const kelpSpots: { x: number; z: number; height: number }[] = [];
    const forests = Math.max(3, Math.round(length / 7));
    for (let forest = 0; forest < forests; forest++) {
      const x = ((forest + 0.5) / forests) * length + (random() - 0.5) * 4;
      const side = forest % 2 === 0 ? 1 : -1;
      const z = side === 1 ? 3 + random() * 5 : -(6.5 + random() * 5);
      for (let frond = 0; frond < 16; frond++) {
        kelpSpots.push({
          x: x + (random() - 0.5) * 5,
          z:
            side === 1
              ? Math.max(3, z + (random() - 0.5) * 3.5)
              : Math.min(-6, z + (random() - 0.5) * 3.5),
          height: 0,
        });
      }
    }
    listPilingSpots(length)
      .filter(({ x }) => Math.abs(x - ladderX(length)) > 1.5)
      .forEach(({ x, z }) => {
        kelpSpots.push(
          { x: x + 0.3, z: z + 0.25, height: 0 },
          { x: x - 0.25, z: z - 0.3, height: 0 },
        );
      });
    const kelp = this.addInstanced(
      "underwater-kelp",
      buildKelpShape(),
      kelpMaterial,
      kelpSpots.length,
    );
    kelpSpots.forEach(({ x, z }, frond) => {
      const bed = findSeabedHeight(x, z, length);
      const height = Math.min(-bed - 0.5, 2.6 + random() * 2.8);
      this.placement.position.set(x, bed - 0.05, z);
      this.placement.rotation.set(0, random() * Math.PI * 2, 0);
      this.placement.scale.set(
        1.5 + random() * 0.6,
        Math.max(0.8, height),
        1.5 + random() * 0.6,
      );
      this.placement.updateMatrix();
      kelp.setMatrixAt(frond, this.placement.matrix);
    });

    const grassMaterial = this.keep(
      buildSeaMaterial({
        clock: this.clock,
        deform: "sway",
        deformShape: [0.22, 1.3, 2.5, 0],
        isDoubleSided: true,
        roughness: 0.7,
        caustics: 0.8,
        selfLight: 0.08,
      }),
    );
    const grassCount = Math.round(length * 10) + 140;
    const grass = this.addInstanced(
      "underwater-sea-grass",
      buildSeaGrassShape(4),
      grassMaterial,
      grassCount,
    );
    const meadows = Array.from(
      { length: Math.round(length / 2.5) + 8 },
      (_, meadow) => {
        const isShore = meadow < 8;
        return {
          x: isShore
            ? meadow % 2 === 0
              ? -9 + random() * 9
              : length + random() * 9
            : -3 + random() * (length + 6),
          z: (random() - 0.5) * (isShore ? 10 : 24),
          radius: 1.4 + random() * 2.2,
          isShore,
        };
      },
    );
    for (let tuft = 0; tuft < grassCount; tuft++) {
      const meadow = meadows[Math.floor(random() * meadows.length)];
      const nearShore = meadow.isShore;
      const angle = random() * Math.PI * 2;
      const reach = meadow.radius * random() ** 0.7;
      const x = meadow.x + Math.cos(angle) * reach;
      const z = meadow.z + Math.sin(angle) * reach;
      const bed = findSeabedHeight(x, z, length);
      this.placement.position.set(x, bed - 0.02, z);
      this.placement.rotation.set(0, random() * Math.PI * 2, 0);
      const size = 0.35 + random() * 0.4;
      this.placement.scale.set(
        size * 1.3,
        size * (nearShore ? 1.3 : 1),
        size * 1.3,
      );
      this.placement.updateMatrix();
      grass.setMatrixAt(tuft, this.placement.matrix);
    }
  }

  private addFish(): void {
    fishKinds.forEach((kind) => {
      const count = this.schools
        .filter((school) => school.kind === kind)
        .reduce((total, school) => total + school.fish.length, 0);
      if (count === 0) {
        return;
      }
      const material = this.keep(
        buildSeaMaterial({
          clock: this.clock,
          deform: "wiggle",
          deformShape: [0.09, 11, 0, 0],
          isDoubleSided: true,
          roughness: kind === "silverside" ? 0.3 : 0.45,
          metalness: kind === "silverside" ? 0.35 : 0.05,
          caustics: 0.5,
          selfLight: 0.22,
        }),
      );
      this.fishMeshes.set(
        kind,
        this.addInstanced(
          `underwater-fish-${kind}`,
          buildFishShape(fishLooks[kind]),
          material,
          count,
        ),
      );
    });
  }

  private addCreatures(): void {
    const length = this.length;
    const turtle = new Mesh(
      this.keep(buildTurtleShape()),
      this.keep(
        buildSeaMaterial({
          clock: this.clock,
          deform: "flap",
          deformShape: [0.55, 1.5, 0.36, -0.1],
          roughness: 0.6,
          caustics: 0.7,
          selfLight: 0.12,
        }),
      ),
    );
    this.creatures.push({
      mesh: turtle,
      place: (seconds, share, into) => {
        const glide = share * length * 0.42;
        const x = length * 0.32 + glide;
        into.position.set(
          x,
          -3.5 + 0.25 * Math.sin(seconds * 0.6),
          4.6 + 0.5 * Math.sin(seconds * 0.25),
        );
        into.rotation.set(
          -0.05 + 0.08 * Math.sin(seconds * 1.5),
          Math.PI / 2 - 0.12,
          0.06 * Math.sin(seconds * 0.7),
          "YXZ",
        );
        into.scale.setScalar(0.62);
      },
    });
    const manta = new Mesh(
      this.keep(buildMantaShape()),
      this.keep(
        buildSeaMaterial({
          clock: this.clock,
          deform: "flap",
          deformShape: [0.42, 1.25, 0.12, -10],
          isDoubleSided: true,
          roughness: 0.5,
          caustics: 0.6,
          selfLight: 0.06,
        }),
      ),
    );
    this.creatures.push({
      mesh: manta,
      place: (seconds, share, into) => {
        const x = length * (1.02 - share * 0.62);
        const z = 5.2 - share * 1.4;
        const bed = findSeabedHeight(x, z, length);
        into.position.set(
          x,
          Math.max(bed + 1.2, -3.6) + 0.2 * Math.sin(seconds * 0.8),
          z,
        );
        into.rotation.set(
          0.04,
          -Math.PI / 2 + 0.25,
          0.08 * Math.sin(seconds * 0.6),
          "YXZ",
        );
        into.scale.setScalar(1.15);
      },
    });
    const dolphin = new Mesh(
      this.keep(buildDolphinShape()),
      this.keep(
        buildSeaMaterial({
          clock: this.clock,
          deform: "undulate",
          deformShape: [0.14, 5.5, 0, 0],
          roughness: 0.35,
          caustics: 0.6,
          selfLight: 0.1,
        }),
      ),
    );
    this.creatures.push({
      mesh: dolphin,
      place: (seconds, share, into) => {
        const pass = Math.min(1, Math.max(0, (share - 0.12) / 0.38));
        const diver = findDiverPlacement(share, length);
        const x = diver.x - 7 + pass * 22;
        const rise = pass ** 3;
        into.position.set(
          x,
          -2.6 + rise * 2.3 + 0.15 * Math.sin(seconds * 2.4),
          2.4 - Math.sin(pass * Math.PI) * 0.6,
        );
        into.rotation.set(
          -0.15 - rise * 0.6 + 0.08 * Math.cos(seconds * 2.4),
          Math.PI / 2 - 0.08,
          0,
          "YXZ",
        );
        into.scale.setScalar(pass <= 0 || pass >= 1 ? 0.0001 : 1.05);
      },
    });
    this.creatures.forEach(({ mesh }) => {
      mesh.frustumCulled = false;
      this.root.add(mesh);
    });
  }

  dispose(): void {
    this.disposables.forEach((thing) => {
      thing.dispose();
    });
    this.lamp.dispose();
  }

  private breathe(seconds: number, delta: number, isReduced: boolean): void {
    if (seconds < 0.05) {
      return;
    }
    const isEntrySplash = seconds < 0.9;
    if (seconds > this.nextBreath) {
      this.nextBreath = seconds + 2.4;
      this.nextBubble = 0.55;
    }
    this.nextBubble -= delta;
    const shouldEmit = isEntrySplash
      ? Math.random() < 0.7
      : this.nextBubble > 0 && Math.random() < 0.45;
    if (shouldEmit) {
      const free = this.bubbleState.find((bubble) => !bubble.isLive);
      if (free !== undefined) {
        free.isLive = true;
        free.age = 0;
        free.life = 6;
        free.size = isEntrySplash
          ? 0.02 + Math.random() * 0.035
          : 0.012 + Math.random() * 0.022;
        free.phase = Math.random() * Math.PI * 2;
        free.position.copy(isEntrySplash ? this.diverSpot : this.mouth);
        if (isEntrySplash) {
          free.position.add(
            new Vector3(
              (Math.random() - 0.5) * 0.8,
              Math.random() * 0.6,
              (Math.random() - 0.5) * 0.8,
            ),
          );
        }
      }
    }
    const wobble = isReduced ? 0.3 : 1;
    this.bubbleState.forEach((bubble, index) => {
      if (bubble.isLive) {
        bubble.age += delta;
        bubble.position.y += delta * (0.7 + bubble.size * 9);
        bubble.position.x +=
          Math.sin(bubble.age * 7 + bubble.phase) * delta * 0.25 * wobble;
        bubble.position.z +=
          Math.cos(bubble.age * 6 + bubble.phase) * delta * 0.25 * wobble;
        if (
          bubble.position.y > underwaterSurfaceY - 0.05 ||
          bubble.age > bubble.life
        ) {
          bubble.isLive = false;
        }
      }
      const size = bubble.isLive
        ? bubble.size * (1 + bubble.age * 0.12)
        : 0.00001;
      this.placement.position.copy(bubble.position);
      this.placement.rotation.set(0, 0, 0);
      this.placement.scale.set(
        size,
        size * (0.85 + 0.15 * Math.sin(bubble.age * 14)),
        size,
      );
      this.placement.updateMatrix();
      this.bubbles.setMatrixAt(index, this.placement.matrix);
    });
    this.bubbles.instanceMatrix.needsUpdate = true;
  }

  private swimFish(seconds: number, isEffectsOn: boolean, calm: number): void {
    const counts = new Map<FishKind, number>();
    this.schools.forEach((school, schoolIndex) => {
      const mesh = this.fishMeshes.get(school.kind);
      if (mesh === undefined) {
        return;
      }
      const isShown = isEffectsOn || schoolIndex % 2 === 0;
      school.fish.forEach((fish) => {
        const index = counts.get(school.kind) ?? 0;
        counts.set(school.kind, index + 1);
        if (!isShown) {
          this.placement.scale.setScalar(0.00001);
          this.placement.updateMatrix();
          mesh.setMatrixAt(index, this.placement.matrix);
          return;
        }
        findFishSpot(school, fish, seconds, this.diverSpot, calm, this.spot);
        findFishSpot(
          school,
          fish,
          seconds + 0.08,
          this.diverSpot,
          calm,
          this.ahead,
        );
        const bed = findSeabedHeight(this.spot.x, this.spot.z, this.length);
        this.spot.y = Math.min(-0.4, Math.max(bed + 0.25, this.spot.y));
        this.ahead.sub(this.spot);
        const heading = Math.atan2(this.ahead.x, this.ahead.z);
        const pitch = Math.atan2(
          this.ahead.y,
          Math.hypot(this.ahead.x, this.ahead.z),
        );
        this.placement.position.copy(this.spot);
        this.placement.rotation.set(
          -Math.max(-0.5, Math.min(0.5, pitch)),
          heading,
          0,
          "YXZ",
        );
        this.placement.scale.setScalar(
          school.size * (0.85 + (fish.speed - 0.85) * 1.2),
        );
        this.placement.updateMatrix();
        mesh.setMatrixAt(index, this.placement.matrix);
      });
    });
    this.fishMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  advance({
    elapsed,
    seconds,
    camera,
    diver,
    pose,
    isEffectsOn,
    isReduced,
  }: AdvanceInput): void {
    const delta = Math.max(0, elapsed - this.lastElapsed);
    this.lastElapsed = elapsed;
    const calm = isReduced ? 0.35 : 1;
    this.clock.uSeaTime.value = elapsed * (isReduced ? 0.5 : 1);
    const share = Math.min(1, elapsed / Math.max(seconds, 0.5));
    const placement = findDiverPlacement(share, this.length);
    const bob = isReduced ? 0 : 0.06 * Math.sin(elapsed * 1.7);
    this.diverSpot.set(placement.x, placement.y + bob, placement.z);
    const forward = new Vector3(
      Math.sin(placement.heading),
      0,
      Math.cos(placement.heading),
    );
    this.mouth
      .copy(this.diverSpot)
      .addScaledVector(forward, 0.66)
      .add(new Vector3(0, 0.22, 0));
    if (diver !== null) {
      diver.position.copy(this.diverSpot);
      diver.rotation.set(
        -placement.pitch * 0.6 +
          (isReduced ? 0 : 0.04 * Math.sin(elapsed * 1.3)),
        placement.heading + (isReduced ? 0 : 0.05 * Math.sin(elapsed * 0.7)),
        isReduced ? 0 : 0.05 * Math.sin(elapsed * 1.1),
        "YXZ",
      );
    }
    if (pose !== null) {
      applyStance(pose, "swimming", elapsed, isReduced ? 0.4 : 1);
    }

    const view = findCrossingCameraSpot(share, this.length, isReduced);
    const sway = isReduced ? 0 : 1;
    camera.position.set(
      view.position[0] + 0.05 * Math.sin(elapsed * 0.6) * sway,
      view.position[1] + 0.05 * Math.sin(elapsed * 0.8 + 1) * sway,
      view.position[2],
    );
    camera.lookAt(view.target[0], view.target[1] + bob * 0.5, view.target[2]);
    this.lamp.position.set(
      camera.position.x * 0.5 + this.diverSpot.x * 0.5,
      camera.position.y + 0.8,
      camera.position.z * 0.5 + this.diverSpot.z * 0.5,
    );

    this.surface.position.set(
      Math.round(camera.position.x / 4) * 4,
      underwaterSurfaceY,
      Math.round(camera.position.z / 4) * 4,
    );
    this.surface.updateMatrix();
    this.rays.visible = isEffectsOn;
    this.rayMaterial.uniforms.uStrength.value = isEffectsOn ? 0.24 : 0;
    this.snow.visible = true;
    this.snow.geometry.setDrawRange(0, isEffectsOn ? 900 : 380);
    this.snowCentre.copy(camera.position);

    this.swimFish(elapsed, isEffectsOn, calm);
    this.breathe(elapsed, delta, isReduced);

    this.jellySpots.forEach((jelly, index) => {
      const beat = Math.max(0, Math.sin(elapsed * 2.2 * calm + jelly.phase));
      this.placement.position.set(
        jelly.position.x + Math.sin(elapsed * 0.2 + jelly.phase) * 0.3,
        jelly.position.y +
          Math.sin(elapsed * 0.35 + jelly.phase) * 0.35 +
          beat * 0.05,
        jelly.position.z,
      );
      this.placement.rotation.set(
        0.15 * Math.sin(elapsed * 0.4 + jelly.phase),
        jelly.phase,
        0.1 * Math.cos(elapsed * 0.3 + jelly.phase),
      );
      this.placement.scale.setScalar(
        isEffectsOn || index % 2 === 0 ? jelly.size : 0.00001,
      );
      this.placement.updateMatrix();
      this.jellies.setMatrixAt(index, this.placement.matrix);
    });
    this.jellies.instanceMatrix.needsUpdate = true;

    this.creatures.forEach(({ mesh, place }) => {
      place(elapsed * calm, share, mesh);
    });
  }
}

/** Where the sunken treasure chest's Wizzaroo crest is painted. */
const buildChestLivery = (length: number): BufferGeometry => {
  const { matrix, rotation } = findChestPlacement(length);
  const outward = new Vector3(0, 0, 1).applyQuaternion(rotation);
  const up = new Vector3(0, 1, 0).applyQuaternion(rotation);
  const centre = new Vector3(
    0,
    chestSize.height * 0.42,
    chestSize.depth / 2,
  ).applyMatrix4(matrix);
  return buildLiveryGeometry([
    {
      surface: buildChestBodyShape().applyMatrix4(matrix),
      decals: [
        {
          face: "flag",
          centre: centre.toArray(),
          outward: outward.toArray(),
          up: up.toArray(),
          width: 0.4,
          height: 0.2,
        },
      ],
    },
  ]);
};

/**
 * Scuba diving to the next Island, shown under the water in place of the
 * World Map for the `seconds` the crossing takes.
 */
export const UnderwaterCrossingScene = ({
  look,
  seconds,
  isEffectsOn,
}: {
  look: CharacterLook;
  seconds: number;
  isEffectsOn: boolean;
}) => {
  const length = findUnderwaterCrossingLength(seconds);
  const world = useMemo(() => new UnderwaterWorld(length), [length]);
  useEffect(
    () => () => {
      world.dispose();
    },
    [world],
  );
  const buildLivery = useCallback(() => buildChestLivery(length), [length]);
  const [isReduced] = useState(isMotionReduced);
  const camera = useThree((state) => state.camera);
  const diver = useRef<Group>(null);
  const pose = useRef<Group>(null);
  const clock = useRef(0);
  useFrame((_state, deltaSeconds) => {
    clock.current += Math.min(deltaSeconds, 0.1);
    world.advance({
      elapsed: clock.current,
      seconds,
      camera,
      diver: diver.current,
      pose: pose.current,
      isEffectsOn,
      isReduced,
    });
  });
  return (
    <>
      <color attach="background" args={[waterColours.fog]} />
      <fogExp2 attach="fog" args={[waterColours.fog, fogDensity]} />
      <hemisphereLight
        args={[waterColours.hemisphereSky, waterColours.hemisphereGround, 1.6]}
      />
      <directionalLight
        color={waterColours.sun}
        intensity={2.2}
        position={[6, 30, 4]}
      />
      <primitive object={world.root} />
      <LiveryDecals
        buildGeometry={buildLivery}
        name="underwater-chest-livery"
      />
      <group ref={diver} name="underwater-diver">
        <group ref={pose} scale={exploreCharacterScale}>
          <CharacterModel look={look} gear="scuba" />
        </group>
      </group>
    </>
  );
};
