import type { SoundSettings } from "../game-sound.js";
import { playOpeningSound } from "../opening-sounds.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  CylinderGeometry,
  FrontSide,
  LatheGeometry,
  Object3D,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type PointLight,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rewardRules } from "../../curriculum/rewards.js";
import { ModalDialog } from "../modal-dialog.js";
import { buildPaletteUniform } from "../pixel-pipeline.js";
import { getMotionScale } from "../reduced-motion.js";
import { StudioReflections, useDisposedOnUnmount } from "../studio-stage.js";

type TreasureKind = "coin" | "gem";

interface TreasurePiece {
  kind: TreasureKind;
  launchAtSeconds: number;
  position: [number, number, number];
  velocity: [number, number, number];
  spin: [number, number, number];
  turn: [number, number, number];
  isLaunched: boolean;
  isResting: boolean;
}

export const chestPalette = {
  backdropCentre: "#1c2433",
  backdropEdge: "#07090e",
  floor: "#0d1118",
  wood: "#4a2a17",
  woodGrain: "#2a160b",
  woodHighlight: "#6b3d22",
  brass: "#c9a24e",
  gold: "#e3b55b",
  velvet: "#2a0f1a",
  keyhole: "#0a0606",
  glow: "#ffcf7a",
  keyLight: "#ffe8c4",
  rimLight: "#8fb4ff",
  fillLight: "#d9e2ff",
  gems: ["#9b111e", "#0f52ba", "#046307", "#5b2a86"],
} as const;

const chestWidth = 1.6;
const chestDepth = 1;
const chestHeight = 0.9;
const lidOpenTurn = -1.95;
const rattleSeconds = 0.45;
const lidOpenSeconds = 0.8;
const spillStartSeconds = rattleSeconds + 0.3;
const spillSpreadSeconds = 1.4;
const gravity = 9.8;
const bounceKeep = 0.35;
const slideKeep = 0.55;
const restingSpeed = 0.6;
const coinRadius = 0.105;
const coinThickness = 0.026;
const gemRadius = 0.09;
const gemsPerCoins = 5;
const mostGems = 6;
const settleStepSeconds = 1 / 60;
const settleSeconds = 6;
const bandInset = 0.55;
const woodTextureSize = 256;
const cameraTarget = new Vector3(0, 0.55, 0.3);
const cameraDistance = 5.1;
const cameraHeight = 2.2;
const cameraArrivalSeconds = 2.2;
const orbitReach = 0.22;
const orbitSpeed = 0.22;

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const easeOutBack = (progress: number) => {
  const overshoot = 1.2;
  const shifted = progress - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
};

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

const countSpilledGems = (coinCount: number): number =>
  Math.min(mostGems, Math.ceil(coinCount / gemsPerCoins));

const buildTreasurePieces = (coinCount: number): TreasurePiece[] => {
  const random = buildSeededRandom(coinCount + 1);
  const kinds: TreasureKind[] = [
    ...Array.from({ length: coinCount }, (): TreasureKind => "coin"),
    ...Array.from(
      { length: countSpilledGems(coinCount) },
      (): TreasureKind => "gem",
    ),
  ];
  return kinds.map((kind, index) => {
    const heading = (random() - 0.5) * Math.PI * 1.6;
    const outwardSpeed = 0.5 + random() * 0.9;
    return {
      kind,
      launchAtSeconds:
        spillStartSeconds + (index / kinds.length) * spillSpreadSeconds,
      position: [(random() - 0.5) * 0.8, chestHeight, (random() - 0.5) * 0.4],
      velocity: [
        Math.sin(heading) * outwardSpeed,
        3.2 + random() * 1.2,
        Math.cos(heading) * outwardSpeed + 0.4,
      ],
      spin: [random() * 12 - 6, random() * 12 - 6, random() * 12 - 6],
      turn: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
      isLaunched: false,
      isResting: false,
    };
  });
};

const isOverChest = ([x, , z]: TreasurePiece["position"]) =>
  Math.abs(x) < chestWidth / 2 && Math.abs(z) < chestDepth / 2;

const findRestingHeight = (piece: TreasurePiece) => {
  const pieceHeight = piece.kind === "coin" ? coinThickness / 2 : gemRadius;
  return isOverChest(piece.position) ? chestHeight + pieceHeight : pieceHeight;
};

const moveTreasurePiece = (
  piece: TreasurePiece,
  elapsedSeconds: number,
  stepSeconds: number,
) => {
  if (!piece.isLaunched) {
    piece.isLaunched = elapsedSeconds >= piece.launchAtSeconds;
    return;
  }
  if (piece.isResting) {
    return;
  }
  piece.velocity[1] -= gravity * stepSeconds;
  piece.position[0] += piece.velocity[0] * stepSeconds;
  piece.position[1] += piece.velocity[1] * stepSeconds;
  piece.position[2] += piece.velocity[2] * stepSeconds;
  piece.turn[0] += piece.spin[0] * stepSeconds;
  piece.turn[1] += piece.spin[1] * stepSeconds;
  piece.turn[2] += piece.spin[2] * stepSeconds;
  const restingHeight = findRestingHeight(piece);
  if (piece.position[1] > restingHeight || piece.velocity[1] > 0) {
    return;
  }
  piece.position[1] = restingHeight;
  piece.velocity[1] = -piece.velocity[1] * bounceKeep;
  piece.velocity[0] *= slideKeep;
  piece.velocity[2] *= slideKeep;
  piece.spin = [piece.spin[0] * slideKeep, 0, piece.spin[2] * slideKeep];
  if (piece.velocity[1] < restingSpeed) {
    piece.isResting = true;
    piece.turn[0] = 0;
    piece.turn[2] = 0;
  }
};

const settleTreasurePieces = (pieces: TreasurePiece[]) => {
  for (
    let elapsedSeconds = 0;
    elapsedSeconds < settleSeconds;
    elapsedSeconds += settleStepSeconds
  ) {
    for (const piece of pieces) {
      moveTreasurePiece(piece, elapsedSeconds, settleStepSeconds);
    }
  }
};

const placeInstances = (
  mesh: InstancedMesh | null,
  pieces: TreasurePiece[],
  placer: Object3D,
) => {
  if (mesh === null) {
    return;
  }
  pieces.forEach((piece, index) => {
    placer.position.set(...piece.position);
    placer.rotation.set(...piece.turn);
    placer.scale.setScalar(piece.isLaunched ? 1 : 0);
    placer.updateMatrix();
    mesh.setMatrixAt(index, placer.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
};

const drawWoodGrain = (context: CanvasRenderingContext2D) => {
  const random = buildSeededRandom(7);
  const plankCount = 4;
  const plankHeight = woodTextureSize / plankCount;
  context.fillStyle = chestPalette.wood;
  context.fillRect(0, 0, woodTextureSize, woodTextureSize);
  for (let plank = 0; plank < plankCount; plank++) {
    const top = plank * plankHeight;
    context.globalAlpha = 0.18 + random() * 0.12;
    context.fillStyle =
      plank % 2 === 0 ? chestPalette.woodHighlight : chestPalette.woodGrain;
    context.fillRect(0, top, woodTextureSize, plankHeight);
    context.globalAlpha = 0.35;
    context.strokeStyle = chestPalette.woodGrain;
    context.lineWidth = 1;
    for (let line = 0; line < 9; line++) {
      const height = top + 4 + random() * (plankHeight - 8);
      const wave = 1 + random() * 3;
      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= woodTextureSize; x += 16) {
        context.lineTo(x, height + Math.sin(x / 40 + line) * wave);
      }
      context.stroke();
    }
    context.globalAlpha = 0.85;
    context.fillStyle = chestPalette.woodGrain;
    context.fillRect(0, top, woodTextureSize, 2);
  }
  context.globalAlpha = 1;
};

const buildWoodTexture = (): CanvasTexture | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }
  const canvas = document.createElement("canvas");
  canvas.width = woodTextureSize;
  canvas.height = woodTextureSize;
  const context = canvas.getContext("2d");
  if (context === null) {
    return undefined;
  }
  drawWoodGrain(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

const useWoodTexture = () => {
  const texture = useMemo(() => buildWoodTexture(), []);
  useEffect(
    () => () => {
      texture?.dispose();
    },
    [texture],
  );
  return texture;
};

const useChestGeometries = () => {
  const geometries = useMemo(
    () => ({
      body: new RoundedBoxGeometry(
        chestWidth,
        chestHeight,
        chestDepth,
        3,
        0.05,
      ),
      velvet: new RoundedBoxGeometry(
        chestWidth - 0.14,
        0.04,
        chestDepth - 0.14,
        2,
        0.015,
      ),
      band: new RoundedBoxGeometry(
        0.12,
        chestHeight + 0.03,
        chestDepth + 0.04,
        2,
        0.02,
      ),
      bracket: new RoundedBoxGeometry(0.16, chestHeight + 0.04, 0.16, 2, 0.03),
      rimFront: new RoundedBoxGeometry(chestWidth + 0.04, 0.06, 0.06, 2, 0.02),
      rimSide: new RoundedBoxGeometry(0.06, 0.06, chestDepth + 0.04, 2, 0.02),
      plinth: new RoundedBoxGeometry(
        chestWidth + 0.08,
        0.08,
        chestDepth + 0.08,
        2,
        0.03,
      ),
      lockPlate: new RoundedBoxGeometry(0.26, 0.32, 0.05, 3, 0.03),
      lid: new CylinderGeometry(
        chestDepth / 2,
        chestDepth / 2,
        chestWidth,
        40,
        1,
        false,
        0,
        Math.PI,
      ),
      lidBand: new CylinderGeometry(
        chestDepth / 2 + 0.018,
        chestDepth / 2 + 0.018,
        0.12,
        40,
        1,
        false,
        0,
        Math.PI,
      ),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => {
        geometry.dispose();
      });
    },
    [geometries],
  );
  return geometries;
};

type ChestGeometries = ReturnType<typeof useChestGeometries>;

const BrassMaterial = () => (
  <meshPhysicalMaterial
    color={chestPalette.brass}
    metalness={1}
    roughness={0.32}
    clearcoat={0.4}
    clearcoatRoughness={0.25}
  />
);

const WoodMaterial = ({
  wood,
  side = FrontSide,
}: {
  wood: CanvasTexture | undefined;
  side?: typeof FrontSide | typeof BackSide;
}) => (
  <meshPhysicalMaterial
    color={wood === undefined ? chestPalette.wood : "#ffffff"}
    map={wood ?? null}
    roughness={0.5}
    clearcoat={0.85}
    clearcoatRoughness={0.18}
    side={side}
  />
);

const VelvetMaterial = ({
  side = FrontSide,
}: {
  side?: typeof FrontSide | typeof BackSide;
}) => (
  <meshPhysicalMaterial
    color={chestPalette.velvet}
    roughness={0.95}
    sheen={1}
    sheenRoughness={0.4}
    sheenColor="#a8485e"
    side={side}
  />
);

const ChestBody = ({
  geometries,
  wood,
}: {
  geometries: ChestGeometries;
  wood: CanvasTexture | undefined;
}) => (
  <group name="chest-body">
    <mesh geometry={geometries.body} position={[0, chestHeight / 2, 0]}>
      <WoodMaterial wood={wood} />
    </mesh>
    <mesh geometry={geometries.velvet} position={[0, chestHeight - 0.005, 0]}>
      <VelvetMaterial />
    </mesh>
    <mesh geometry={geometries.plinth} position={[0, 0.04, 0]}>
      <BrassMaterial />
    </mesh>
    {[-bandInset, bandInset].map((x) => (
      <mesh
        key={x}
        geometry={geometries.band}
        position={[x, chestHeight / 2, 0]}
      >
        <BrassMaterial />
      </mesh>
    ))}
    {[-1, 1].flatMap((side) =>
      [-1, 1].map((front) => (
        <mesh
          key={`${String(side)}-${String(front)}`}
          geometry={geometries.bracket}
          position={[
            side * (chestWidth / 2 - 0.05),
            chestHeight / 2,
            front * (chestDepth / 2 - 0.05),
          ]}
        >
          <BrassMaterial />
        </mesh>
      )),
    )}
    {[-1, 1].map((front) => (
      <mesh
        key={`rim-${String(front)}`}
        geometry={geometries.rimFront}
        position={[0, chestHeight - 0.01, front * (chestDepth / 2 + 0.005)]}
      >
        <BrassMaterial />
      </mesh>
    ))}
    {[-1, 1].map((side) => (
      <mesh
        key={`rim-side-${String(side)}`}
        geometry={geometries.rimSide}
        position={[side * (chestWidth / 2 + 0.005), chestHeight - 0.01, 0]}
      >
        <BrassMaterial />
      </mesh>
    ))}
    <group position={[0, chestHeight - 0.2, chestDepth / 2 + 0.03]}>
      <mesh geometry={geometries.lockPlate}>
        <meshPhysicalMaterial
          color={chestPalette.gold}
          metalness={1}
          roughness={0.22}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0, 0.04, 0.026]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.01, 20]} />
        <meshStandardMaterial color={chestPalette.keyhole} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.01, 0.026]}>
        <boxGeometry args={[0.022, 0.07, 0.01]} />
        <meshStandardMaterial color={chestPalette.keyhole} roughness={0.9} />
      </mesh>
    </group>
  </group>
);

const ChestLid = ({
  geometries,
  wood,
  lidRef,
}: {
  geometries: ChestGeometries;
  wood: CanvasTexture | undefined;
  lidRef: RefObject<Group | null>;
}) => (
  <group ref={lidRef} position={[0, chestHeight, -chestDepth / 2]}>
    <group position={[0, 0, chestDepth / 2]} rotation={[0, 0, Math.PI / 2]}>
      <mesh geometry={geometries.lid}>
        <WoodMaterial wood={wood} />
      </mesh>
      <mesh geometry={geometries.lid} scale={[0.985, 0.995, 0.985]}>
        <VelvetMaterial side={BackSide} />
      </mesh>
      {[-bandInset, bandInset].map((offset) => (
        <mesh
          key={offset}
          geometry={geometries.lidBand}
          position={[0, offset, 0]}
        >
          <BrassMaterial />
        </mesh>
      ))}
    </group>
    <mesh
      geometry={geometries.rimFront}
      position={[0, 0.03, chestDepth + 0.005]}
    >
      <BrassMaterial />
    </mesh>
  </group>
);

const coinProfile = [
  [0, -0.5],
  [0.94, -0.5],
  [1, -0.38],
  [1, 0.38],
  [0.94, 0.5],
  [0.84, 0.5],
  [0.8, 0.3],
  [0, 0.3],
];

const gemProfile = [
  [0, -1],
  [1, 0.05],
  [1, 0.2],
  [0.62, 0.62],
  [0, 0.62],
];

const useTreasureGeometries = () => {
  const geometries = useMemo(
    () => ({
      coin: new LatheGeometry(
        coinProfile.map(
          ([across, along]) =>
            new Vector2(across * coinRadius, along * coinThickness),
        ),
        28,
      ),
      gem: new LatheGeometry(
        gemProfile.map(
          ([across, along]) =>
            new Vector2(across * gemRadius, along * gemRadius),
        ),
        8,
      ),
    }),
    [],
  );
  useDisposedOnUnmount(geometries.coin);
  useDisposedOnUnmount(geometries.gem);
  return geometries;
};

const glowVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const glowFragmentShader = `
uniform vec3 glow;
uniform float strength;
varying vec2 vUv;

void main() {
  float reach = length(vUv - 0.5) * 2.0;
  float fade = pow(clamp(1.0 - reach, 0.0, 1.0), 2.2);
  gl_FragColor = vec4(glow * fade * strength, fade * strength);
}
`;

const buildGlowMaterial = () => {
  const [glow] = buildPaletteUniform([chestPalette.glow]);
  return new ShaderMaterial({
    uniforms: { glow: { value: glow }, strength: { value: 0 } },
    vertexShader: glowVertexShader,
    fragmentShader: glowFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
};

const useCameraDrift = (motionScale: number) => {
  const camera = useThree((state) => state.camera);
  const age = useRef(motionScale === 0 ? cameraArrivalSeconds : 0);

  useFrame((_state, deltaSeconds) => {
    age.current += Math.min(deltaSeconds, 1 / 20);
    const arrival = easeOutCubic(
      Math.min(1, age.current / cameraArrivalSeconds),
    );
    const distance = cameraDistance + (1 - arrival) * 1.4;
    const angle =
      Math.sin(age.current * orbitSpeed) * orbitReach * motionScale +
      (1 - arrival) * 0.35;
    camera.position.set(
      Math.sin(angle) * distance,
      cameraHeight + (1 - arrival) * 0.5,
      cameraTarget.z + Math.cos(angle) * distance,
    );
    camera.lookAt(cameraTarget);
  });
};

export const SpillingChest = ({ coinCount }: { coinCount: number }) => {
  const [motionScale] = useState(getMotionScale);
  const pieces = useMemo(() => {
    const builtPieces = buildTreasurePieces(coinCount);
    if (motionScale === 0) {
      settleTreasurePieces(builtPieces);
    }
    return builtPieces;
  }, [coinCount, motionScale]);
  const coins = useMemo(
    () => pieces.filter(({ kind }) => kind === "coin"),
    [pieces],
  );
  const gems = useMemo(
    () => pieces.filter(({ kind }) => kind === "gem"),
    [pieces],
  );
  const placer = useMemo(() => new Object3D(), []);
  const wood = useWoodTexture();
  const geometries = useChestGeometries();
  const treasure = useTreasureGeometries();
  const glowMaterial = useMemo(() => buildGlowMaterial(), []);
  useDisposedOnUnmount(glowMaterial);
  const chestRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const glowLightRef = useRef<PointLight>(null);
  const glowRef = useRef<Mesh>(null);
  const coinMeshRef = useRef<InstancedMesh>(null);
  const gemMeshRef = useRef<InstancedMesh>(null);
  const age = useRef(motionScale === 0 ? settleSeconds : 0);

  useLayoutEffect(() => {
    const gemMesh = gemMeshRef.current;
    if (gemMesh === null) {
      return;
    }
    gems.forEach((_gem, index) => {
      gemMesh.setColorAt(
        index,
        new Color(chestPalette.gems[index % chestPalette.gems.length]),
      );
    });
    if (gemMesh.instanceColor !== null) {
      gemMesh.instanceColor.needsUpdate = true;
    }
  }, [gems]);

  useFrame(({ camera }, deltaSeconds) => {
    const stepSeconds = Math.min(deltaSeconds, 1 / 20) * motionScale;
    age.current += stepSeconds;
    const elapsedSeconds = age.current;
    for (const piece of pieces) {
      moveTreasurePiece(piece, elapsedSeconds, stepSeconds);
    }
    const lidProgress = Math.min(
      1,
      Math.max(0, (elapsedSeconds - rattleSeconds) / lidOpenSeconds),
    );
    if (lidRef.current !== null) {
      lidRef.current.rotation.x = lidOpenTurn * easeOutBack(lidProgress);
    }
    if (chestRef.current !== null) {
      const isRattling = elapsedSeconds < rattleSeconds;
      chestRef.current.rotation.z = isRattling
        ? Math.sin(elapsedSeconds * 55) * 0.025
        : 0;
    }
    const shimmer = 0.92 + Math.sin(elapsedSeconds * 2.4) * 0.08 * motionScale;
    if (glowLightRef.current !== null) {
      glowLightRef.current.intensity = 4 * lidProgress * shimmer;
    }
    const glow = glowRef.current;
    if (glow !== null) {
      glow.lookAt(camera.position);
      glow.position.y = chestHeight + 0.15 + lidProgress * 0.25;
      if (glow.material instanceof ShaderMaterial) {
        glow.material.uniforms.strength.value = 0.55 * lidProgress * shimmer;
      }
    }
    placeInstances(coinMeshRef.current, coins, placer);
    placeInstances(gemMeshRef.current, gems, placer);
  });

  return (
    <>
      <group ref={chestRef}>
        <ChestBody geometries={geometries} wood={wood} />
        <ChestLid geometries={geometries} wood={wood} lidRef={lidRef} />
      </group>
      <pointLight
        ref={glowLightRef}
        position={[0, chestHeight + 0.3, 0.1]}
        color={chestPalette.glow}
        intensity={0}
        distance={3.5}
        decay={1.6}
      />
      <mesh
        ref={glowRef}
        material={glowMaterial}
        position={[0, chestHeight + 0.15, 0.05]}
        renderOrder={2}
      >
        <planeGeometry args={[2.4, 1.6]} />
      </mesh>
      {coins.length === 0 ? null : (
        <instancedMesh
          ref={coinMeshRef}
          name="chest-coins"
          args={[treasure.coin, undefined, coins.length]}
          frustumCulled={false}
        >
          <meshPhysicalMaterial
            color={chestPalette.gold}
            metalness={1}
            roughness={0.24}
            clearcoat={0.5}
            clearcoatRoughness={0.15}
          />
        </instancedMesh>
      )}
      {gems.length === 0 ? null : (
        <instancedMesh
          ref={gemMeshRef}
          name="chest-gems"
          args={[treasure.gem, undefined, gems.length]}
          frustumCulled={false}
        >
          <meshPhysicalMaterial
            metalness={0}
            roughness={0.04}
            clearcoat={1}
            clearcoatRoughness={0.02}
            ior={2.2}
            specularIntensity={1}
            envMapIntensity={2.2}
            flatShading
          />
        </instancedMesh>
      )}
    </>
  );
};

const backdropFragmentShader = `
uniform vec3 centre;
uniform vec3 edge;
varying vec2 vUv;

void main() {
  float reach = distance(vUv, vec2(0.5, 0.58)) * 1.6;
  vec3 colour = mix(centre, edge, smoothstep(0.0, 1.0, reach));
  gl_FragColor = vec4(colour, 1.0);
}
`;

const contactShadowFragmentShader = `
varying vec2 vUv;

void main() {
  float reach = length((vUv - 0.5) * vec2(1.0, 1.6)) * 2.0;
  float shade = pow(clamp(1.0 - reach, 0.0, 1.0), 1.8);
  gl_FragColor = vec4(0.0, 0.0, 0.0, shade * 0.75);
}
`;

const buildBackdropMaterial = () => {
  const [centre, edge] = buildPaletteUniform([
    chestPalette.backdropCentre,
    chestPalette.backdropEdge,
  ]);
  return new ShaderMaterial({
    uniforms: { centre: { value: centre }, edge: { value: edge } },
    vertexShader: glowVertexShader,
    fragmentShader: backdropFragmentShader,
    depthWrite: false,
  });
};

const buildContactShadowMaterial = () =>
  new ShaderMaterial({
    vertexShader: glowVertexShader,
    fragmentShader: contactShadowFragmentShader,
    transparent: true,
    depthWrite: false,
  });

export const ChestScene = ({ coinCount }: { coinCount: number }) => {
  const [motionScale] = useState(getMotionScale);
  useCameraDrift(motionScale);
  const backdrop = useMemo(() => buildBackdropMaterial(), []);
  const contactShadow = useMemo(() => buildContactShadowMaterial(), []);
  useDisposedOnUnmount(backdrop);
  useDisposedOnUnmount(contactShadow);

  return (
    <>
      <color attach="background" args={[chestPalette.backdropEdge]} />
      <mesh position={[0, 1.6, -4]} material={backdrop} renderOrder={-1}>
        <planeGeometry args={[22, 12]} />
      </mesh>
      <hemisphereLight
        args={[chestPalette.fillLight, chestPalette.floor, 0.35]}
      />
      <directionalLight
        position={[-3, 5, 4]}
        intensity={2.6}
        color={chestPalette.keyLight}
      />
      <directionalLight
        position={[4, 3, -4]}
        intensity={1.8}
        color={chestPalette.rimLight}
      />
      <directionalLight
        position={[3, 1.5, 5]}
        intensity={0.6}
        color={chestPalette.fillLight}
      />
      <mesh position={[0, -0.001, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial
          color={chestPalette.floor}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      <mesh
        position={[0, 0.002, 0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={contactShadow}
      >
        <planeGeometry args={[3.4, 2.6]} />
      </mesh>
      <SpillingChest coinCount={coinCount} />
    </>
  );
};

const FamilyChestStage = ({ coinCount }: { coinCount: number }) => (
  <div className="family-chest-stage">
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{
        position: [0, cameraHeight, cameraTarget.z + cameraDistance],
        fov: 38,
      }}
    >
      <StudioReflections />
      <ChestScene coinCount={coinCount} />
    </Canvas>
  </div>
);

const CoinIcon = () => (
  <svg
    className="family-chest-coin"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6.5" />
    <path d="M12 8.5v7" />
  </svg>
);

const describeCoins = (coinCount: number) =>
  `${String(coinCount)} gold ${coinCount === 1 ? "coin" : "coins"}`;

export const FamilyChest = ({
  familyChestActivityCount,
  icon,
  soundSettings,
}: {
  familyChestActivityCount: number;
  icon: ReactNode;
  soundSettings: SoundSettings;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeChest = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="family-chest"
        aria-label="Open the Family Chest"
        data-short={`${String(familyChestActivityCount)}/${String(rewardRules.familyChestActivities)}`}
        onClick={() => {
          setIsOpen(true);
          playOpeningSound("treasure", soundSettings);
        }}
      >
        {icon}
        <span>
          Family Chest:{" "}
          <strong>
            {familyChestActivityCount} of {rewardRules.familyChestActivities}
          </strong>{" "}
          Activities
        </span>
      </button>
      <ModalDialog
        isOpen={isOpen}
        onClose={closeChest}
        title="Family Chest"
        closeLabel="Close the Family Chest"
      >
        <div
          role="img"
          aria-label={`The Family Chest opens and ${describeCoins(familyChestActivityCount)} spill out`}
        >
          <FamilyChestStage coinCount={familyChestActivityCount} />
        </div>
        <p className="family-chest-value">
          <CoinIcon /> Worth {describeCoins(familyChestActivityCount)}
        </p>
        <progress
          className="family-chest-meter"
          aria-label="How full the Family Chest is"
          max={rewardRules.familyChestActivities}
          value={familyChestActivityCount}
        />
        <p>
          Every Activity anyone in your family finishes adds a gold coin. At{" "}
          {rewardRules.familyChestActivities} coins the chest gives each Child a
          new Item.
        </p>
      </ModalDialog>
    </>
  );
};
