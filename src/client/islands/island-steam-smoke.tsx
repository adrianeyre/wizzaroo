import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  Color,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type InstancedMesh,
} from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useMotionScale } from "../world-map-hooks.js";
import type { Triple } from "./trains/train-kit.js";

export interface SmokePuff {
  x: number;
  y: number;
  z: number;
  age: number;
  life: number;
  size: number;
  driftX: number;
  driftZ: number;
}

export const smokePuffCount = 54;
const puffsPerChuff = 3;
const idleChuffsPerSecond = 3;
const mostChuffsPerSecond = 6;
const chuffsPerDistance = 0.9;
const puffLifeSeconds = 2.4;
const riseSpeed = 1.7;

const restingPuff = (): SmokePuff => ({
  x: 0,
  y: 0,
  z: 0,
  age: 0,
  life: 0,
  size: 0,
  driftX: 0,
  driftZ: 0,
});

/**
 * A steam locomotive's exhaust: a puff leaves the chimney with every
 * chuff, faster as the train speeds up and lazily while it stands, then
 * rises, swells and fades where it was left, so a moving train trails
 * its smoke behind it.
 */
export class SteamSmokeTrail {
  readonly puffs: SmokePuff[] = Array.from(
    { length: smokePuffCount },
    restingPuff,
  );
  private nextPuff = 0;
  private sinceLastChuff = Infinity;
  private chuffs = 0;

  constructor(private readonly scale = 1) {}

  advance(
    seconds: number,
    chimney: Vector3,
    speed: number,
    canPuff = true,
  ): void {
    for (const puff of this.puffs) {
      if (puff.age >= puff.life) {
        continue;
      }
      puff.age += seconds;
      const share = Math.min(1, puff.age / puff.life);
      const lift = riseSpeed * (1 - share * 0.55) * seconds * this.scale;
      puff.y += lift;
      puff.x += puff.driftX * seconds * this.scale;
      puff.z += puff.driftZ * seconds * this.scale;
    }
    const chuffRate = Math.min(
      mostChuffsPerSecond,
      idleChuffsPerSecond + Math.abs(speed) * chuffsPerDistance,
    );
    this.sinceLastChuff += seconds;
    if (canPuff && this.sinceLastChuff >= 1 / chuffRate) {
      this.sinceLastChuff = 0;
      this.chuff(chimney, speed);
    }
  }

  private chuff(chimney: Vector3, speed: number): void {
    this.chuffs += 1;
    const isWorking = Math.abs(speed) > 0.5;
    for (let part = 0; part < puffsPerChuff; part++) {
      const seed = this.chuffs * puffsPerChuff + part;
      const wobble = Math.sin(seed * 2.39);
      const turn = seed * 2.17;
      this.puffs[this.nextPuff] = {
        x: chimney.x + Math.cos(turn) * 0.06 * this.scale,
        y: chimney.y + part * 0.12 * this.scale,
        z: chimney.z + Math.sin(turn) * 0.06 * this.scale,
        age: part * 0.08,
        life: puffLifeSeconds * (isWorking ? 1 : 1.4) * (1 + wobble * 0.18),
        size: (isWorking ? 0.62 : 0.48) * (1 + wobble * 0.25),
        driftX: Math.cos(turn) * 0.28,
        driftZ: Math.sin(turn) * 0.28,
      };
      this.nextPuff = (this.nextPuff + 1) % this.puffs.length;
    }
  }
}

export const findPuffLook = (
  puff: SmokePuff,
): { radius: number; opacity: number; whiteness: number } => {
  if (puff.age >= puff.life || puff.life === 0) {
    return { radius: 0, opacity: 0, whiteness: 1 };
  }
  const share = puff.age / puff.life;
  return {
    radius: puff.size * (0.3 + 1.1 * Math.sqrt(share)),
    opacity: 0.92 * Math.min(1, share * 30) * (1 - share) ** 1.6,
    whiteness: 0.35 + 0.65 * share,
  };
};

const buildPuffGeometry = () => {
  const shape = new IcosahedronGeometry(1, 2);
  shape.deleteAttribute("normal");
  shape.deleteAttribute("uv");
  const smooth = mergeVertices(shape);
  const positions = smooth.getAttribute("position");
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lump =
      1 + 0.14 * Math.sin(x * 5.1 + y * 3.3) * Math.cos(z * 4.7 - y * 2.1);
    positions.setXYZ(index, x * lump, y * lump * 0.92, z * lump);
  }
  smooth.computeVertexNormals();
  shape.dispose();
  return smooth;
};

const buildPuffMaterial = () => {
  const material = new MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#3a3836",
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.2,
    transparent: true,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float puffOpacity;\nvarying float vPuffOpacity;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPuffOpacity = puffOpacity;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPuffOpacity;",
      )
      .replace(
        "#include <alphatest_fragment>",
        "diffuseColor.a *= vPuffOpacity;\n#include <alphatest_fragment>",
      );
  };
  return material;
};

const smokeGrey = new Color("#4f4c49");
const steamWhite = new Color("#f2efea");

class SteamSmokeRig {
  readonly geometry = buildPuffGeometry();
  readonly material = buildPuffMaterial();
  private readonly opacities = new InstancedBufferAttribute(
    new Float32Array(smokePuffCount),
    1,
  );
  private readonly trail: SteamSmokeTrail;
  private readonly placement = new Object3D();
  private readonly tint = new Color();
  private readonly chimneySpot = new Vector3();

  constructor(
    private readonly chimney: Triple,
    private readonly scale: number,
  ) {
    this.trail = new SteamSmokeTrail(scale);
    this.geometry.setAttribute("puffOpacity", this.opacities);
  }

  advance(
    mesh: InstancedMesh,
    engine: Object3D,
    seconds: number,
    speed: number,
    canPuff: boolean,
  ): void {
    engine.updateMatrix();
    this.chimneySpot.set(...this.chimney).applyMatrix4(engine.matrix);
    this.trail.advance(seconds, this.chimneySpot, speed, canPuff);
    this.trail.puffs.forEach((puff, index) => {
      const look = findPuffLook(puff);
      this.placement.position.set(puff.x, puff.y + look.radius * 0.6, puff.z);
      this.placement.scale.setScalar(
        Math.max(0.0001, look.radius * this.scale),
      );
      this.placement.updateMatrix();
      mesh.setMatrixAt(index, this.placement.matrix);
      mesh.setColorAt(
        index,
        this.tint.copy(smokeGrey).lerp(steamWhite, look.whiteness),
      );
      this.opacities.setX(index, look.opacity);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor !== null) {
      mesh.instanceColor.needsUpdate = true;
    }
    this.opacities.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export const SteamSmoke = ({
  name,
  chimney,
  locomotive,
  speed,
  isChimneyInside,
  scale = 1,
}: {
  name: string;
  chimney: Triple;
  locomotive: RefObject<Object3D | null>;
  speed: RefObject<number>;
  isChimneyInside: RefObject<boolean>;
  scale?: number;
}) => {
  const [x, y, z] = chimney;
  const rig = useMemo(
    () => new SteamSmokeRig([x, y, z], scale),
    [x, y, z, scale],
  );
  useEffect(
    () => () => {
      rig.dispose();
    },
    [rig],
  );
  const puffs = useRef<InstancedMesh>(null);
  const motionScale = useMotionScale();
  useFrame((_state, deltaSeconds) => {
    const mesh = puffs.current;
    const engine = locomotive.current;
    if (mesh === null || engine === null) {
      return;
    }
    rig.advance(
      mesh,
      engine,
      Math.min(deltaSeconds, 0.1) * motionScale,
      speed.current,
      !isChimneyInside.current,
    );
  });
  return (
    <instancedMesh
      ref={puffs}
      name={name}
      args={[rig.geometry, rig.material, smokePuffCount]}
      frustumCulled={false}
      renderOrder={2}
    />
  );
};
