import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  IcosahedronGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Material,
} from "three";
import { isMotionReduced } from "../reduced-motion.js";
import type { MapPoint } from "../world-map-terrain.js";
import {
  AttractionBuilder,
  addGroundPad,
  attractionFinishes,
  attractionFinishLooks,
  countMotionCopies,
  findMotionPose,
  findWandererSpot,
  findWhirlSpeed,
  isReactingMotion,
  waterOpacity,
  type AttractionDetail,
  type MovingPart,
  type SmokeSource,
  type Wanderers,
} from "./attractions/attraction-kit.js";
import type { IslandAdventure } from "./island-adventures.js";
import {
  placeIslandAttractions,
  toIslandPoint,
  type PlacedAttraction,
} from "./island-attractions.js";

/** Within this, an Attraction is drawn in full; beyond, in far detail. Distances are from the Character. */
export const attractionNearReach = 40;
/** Beyond this, an Attraction isn't drawn at all. */
export const attractionFarReach = 300;
/**
 * A Curiosity is drawn in full within this, with its moving parts,
 * wanderers and smoke; beyond, as one still far mesh.
 */
export const curiosityNearReach = 30;
/** Beyond this, a Curiosity isn't drawn at all. */
export const curiosityFarReach = 130;

const glowByDay = 1;
const glowAfterDark = 2.2;

export type AttractionDetailShown = AttractionDetail | "hidden";

export const findAttractionDetail = (
  distance: number,
  isCuriosity = false,
): AttractionDetailShown => {
  if (distance <= (isCuriosity ? curiosityNearReach : attractionNearReach)) {
    return "near";
  }
  return distance <= (isCuriosity ? curiosityFarReach : attractionFarReach)
    ? "far"
    : "hidden";
};

export interface AttractionLooks {
  finished: Material[];
  beam: MeshBasicMaterial;
  halo: MeshBasicMaterial;
  glow: MeshBasicMaterial;
}

const buildAttractionLooks = (): AttractionLooks => {
  const glow = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const finished = attractionFinishes.map((finish): Material => {
    if (finish === "glow") {
      return glow;
    }
    const isWater = finish === "water";
    return new MeshPhysicalMaterial({
      vertexColors: true,
      ...attractionFinishLooks[finish],
      transparent: isWater,
      opacity: isWater ? waterOpacity : 1,
      depthWrite: !isWater,
    });
  });
  const beam = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.32,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const halo = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  return { finished, beam, halo, glow };
};

const useAttractionLooks = (darkness: number): AttractionLooks => {
  const looks = useMemo(() => buildAttractionLooks(), []);
  useEffect(
    () => () => {
      for (const material of [...looks.finished, looks.beam, looks.halo]) {
        material.dispose();
      }
    },
    [looks],
  );
  useEffect(() => {
    looks.glow.color.setScalar(
      glowByDay + (glowAfterDark - glowByDay) * darkness,
    );
  }, [looks, darkness]);
  return looks;
};

const buildStatic = (
  attraction: PlacedAttraction,
  detail: AttractionDetail,
): BufferGeometry => {
  const builder = new AttractionBuilder(detail);
  if (attraction.model.hasGroundPad !== false) {
    addGroundPad(
      builder,
      attraction.model.footprint,
      attraction.padColour,
      attraction.padDepth,
    );
  }
  attraction.model.build(builder);
  return builder.build();
};

const buildPart = (
  build: (builder: AttractionBuilder) => void,
  detail: AttractionDetail,
): BufferGeometry => {
  const builder = new AttractionBuilder(detail);
  build(builder);
  return builder.build();
};

interface DetailPair {
  near: BufferGeometry;
  far: BufferGeometry;
}

const useDetailPair = (
  build: (detail: AttractionDetail) => BufferGeometry,
): DetailPair => {
  const pair = useMemo(
    () => ({ near: build("near"), far: build("far") }),
    [build],
  );
  useEffect(
    () => () => {
      pair.near.dispose();
      pair.far.dispose();
    },
    [pair],
  );
  return pair;
};

interface ExplorerSpot {
  current: MapPoint | undefined;
}

const MovingPartModel = ({
  attraction,
  part,
  looks,
  detailRef,
  explorerSpot,
  darkness,
  isNearOnly,
}: {
  attraction: PlacedAttraction;
  part: MovingPart;
  looks: AttractionLooks;
  detailRef: { current: AttractionDetailShown };
  explorerSpot: ExplorerSpot;
  darkness: number;
  /** Drawn only in near detail, as a Curiosity's moving parts are. */
  isNearOnly: boolean;
}) => {
  const build = useMemo(
    () => (detail: AttractionDetail) => buildPart(part.build, detail),
    [part],
  );
  const geometries = useDetailPair(build);
  const copies = countMotionCopies(part.motion);
  const holders = useRef<(Group | null)[]>([]);
  const meshes = useRef<{ near: Object3D | null; far: Object3D | null }[]>([]);
  const pivotOnIsland = useMemo(
    () => toIslandPoint(attraction, { x: part.pivot[0], z: part.pivot[2] }),
    [attraction, part],
  );
  const look = part.look ?? "finished";
  const material =
    look === "beam"
      ? looks.beam
      : look === "halo"
        ? looks.halo
        : looks.finished;
  const isShownInLight = look === "finished" || darkness > 0.3;
  const spun = useRef(0);
  useFrame((state, delta) => {
    const detail = detailRef.current;
    const isReduced = isMotionReduced();
    const seconds = isReduced ? 0 : state.clock.elapsedTime;
    const spot = explorerSpot.current;
    const nearness =
      isReactingMotion(part.motion) && spot !== undefined
        ? Math.max(
            0,
            1 -
              Math.hypot(spot.x - pivotOnIsland.x, spot.z - pivotOnIsland.z) /
                part.motion.reach,
          )
        : 0;
    const closeness = Math.min(1, nearness * 1.6);
    if (part.motion.kind === "whirl" && !isReduced) {
      spun.current +=
        Math.min(delta, 0.1) * findWhirlSpeed(part.motion, closeness);
    }
    const isDrawn = isNearOnly ? detail === "near" : detail !== "hidden";
    for (let copy = 0; copy < copies; copy++) {
      const holder = holders.current.at(copy);
      if (holder === null || holder === undefined) {
        continue;
      }
      const pose = findMotionPose(part.motion, seconds, {
        nearness: closeness,
        copy,
        spun: spun.current,
      });
      holder.visible = isDrawn && pose.isShown && isShownInLight;
      holder.position.set(...pose.position);
      holder.rotation.set(...pose.rotation);
      holder.scale.set(...pose.scale);
      const pair = meshes.current.at(copy);
      if (pair?.near) {
        pair.near.visible = detail === "near";
      }
      if (pair?.far) {
        pair.far.visible = detail === "far";
      }
    }
  });
  return (
    <group position={part.pivot}>
      {Array.from({ length: copies }, (_, copy) => (
        <group
          key={copy}
          ref={(holder) => {
            holders.current[copy] = holder;
          }}
        >
          {(["near", "far"] as const).map((detail) => (
            <mesh
              key={detail}
              name={`attraction-${attraction.kind}-${part.name}`}
              ref={(mesh) => {
                const pair = meshes.current[copy] ?? { near: null, far: null };
                pair[detail] = mesh;
                meshes.current[copy] = pair;
              }}
              geometry={geometries[detail]}
              material={material}
              visible={detail === "near"}
              castShadow={look === "finished"}
            />
          ))}
        </group>
      ))}
    </group>
  );
};

const wanderMatrix = new Object3D();

const WanderersModel = ({
  attraction,
  wanderers,
  looks,
  detailRef,
  isNearOnly,
}: {
  attraction: PlacedAttraction;
  wanderers: Wanderers;
  looks: AttractionLooks;
  detailRef: { current: AttractionDetailShown };
  isNearOnly: boolean;
}) => {
  const build = useMemo(
    () => (detail: AttractionDetail) => buildPart(wanderers.build, detail),
    [wanderers],
  );
  const geometries = useDetailPair(build);
  const near = useRef<InstancedMesh>(null);
  const far = useRef<InstancedMesh>(null);
  useFrame((state) => {
    const detail = detailRef.current;
    const seconds = isMotionReduced() ? 0 : state.clock.elapsedTime;
    for (const [mesh, meshDetail] of [
      [near.current, "near"],
      [far.current, "far"],
    ] as const) {
      if (mesh === null) {
        continue;
      }
      mesh.visible =
        detail === meshDetail && (!isNearOnly || meshDetail === "near");
      if (!mesh.visible) {
        continue;
      }
      for (let index = 0; index < wanderers.count; index++) {
        const spot = findWandererSpot(wanderers, index, seconds);
        wanderMatrix.position.set(spot.x, spot.y, spot.z);
        wanderMatrix.rotation.set(0, spot.heading, 0);
        wanderMatrix.updateMatrix();
        mesh.setMatrixAt(index, wanderMatrix.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      {(["near", "far"] as const).map((detail) => (
        <instancedMesh
          key={detail}
          ref={detail === "near" ? near : far}
          name={`attraction-${attraction.kind}-${wanderers.name}`}
          args={[geometries[detail], looks.finished, wanderers.count]}
          frustumCulled={false}
          visible={false}
          castShadow
        />
      ))}
    </>
  );
};

const puffMatrix = new Object3D();
const puffColour = new Color();

const SmokeModel = ({
  attraction,
  smoke,
  detailRef,
  isNearOnly,
}: {
  attraction: PlacedAttraction;
  smoke: SmokeSource;
  detailRef: { current: AttractionDetailShown };
  isNearOnly: boolean;
}) => {
  const geometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: smoke.colour,
        roughness: 1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [smoke],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const mesh = useRef<InstancedMesh>(null);
  const lifeSeconds = 5;
  useFrame((state) => {
    const instanced = mesh.current;
    if (instanced === null) {
      return;
    }
    instanced.visible = isNearOnly
      ? detailRef.current === "near"
      : detailRef.current !== "hidden";
    if (!instanced.visible) {
      return;
    }
    const seconds = isMotionReduced() ? 1.5 : state.clock.elapsedTime;
    for (let index = 0; index < smoke.puffs; index++) {
      const age = (((seconds / lifeSeconds + index / smoke.puffs) % 1) + 1) % 1;
      const drift = Math.sin(index * 2.31) * smoke.spread * age;
      const swirl = Math.cos(index * 1.73) * smoke.spread * age;
      const size = smoke.size * (0.45 + age * 1.3) * (1 - age * age * 0.6);
      puffMatrix.position.set(
        smoke.at[0] + drift,
        smoke.at[1] + age * smoke.rise,
        smoke.at[2] + swirl,
      );
      puffMatrix.rotation.set(index, index * 0.7, 0);
      puffMatrix.scale.setScalar(Math.max(0.001, size));
      puffMatrix.updateMatrix();
      instanced.setMatrixAt(index, puffMatrix.matrix);
      puffColour.set(smoke.colour).multiplyScalar(1 - age * 0.15);
      instanced.setColorAt(index, puffColour);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor !== null) {
      instanced.instanceColor.needsUpdate = true;
    }
  });
  return (
    <instancedMesh
      ref={mesh}
      name={`attraction-${attraction.kind}-smoke`}
      args={[geometry, material, smoke.puffs]}
      frustumCulled={false}
    />
  );
};

const AttractionModelView = ({
  attraction,
  looks,
  explorerSpot,
  darkness,
}: {
  attraction: PlacedAttraction;
  looks: AttractionLooks;
  explorerSpot: ExplorerSpot;
  darkness: number;
}) => {
  const build = useMemo(
    () => (detail: AttractionDetail) => buildStatic(attraction, detail),
    [attraction],
  );
  const geometries = useDetailPair(build);
  const detailRef = useRef<AttractionDetailShown>("hidden");
  const group = useRef<Group>(null);
  const near = useRef<Object3D>(null);
  const far = useRef<Object3D>(null);
  useFrame((state) => {
    const viewer = explorerSpot.current ?? state.camera.position;
    const detail = findAttractionDetail(
      Math.hypot(
        viewer.x - attraction.centre.x,
        viewer.z - attraction.centre.z,
      ) - attraction.model.footprint,
      attraction.isCuriosity,
    );
    detailRef.current = detail;
    if (group.current !== null) {
      group.current.visible = detail !== "hidden";
    }
    if (near.current !== null) {
      near.current.visible = detail === "near";
    }
    if (far.current !== null) {
      far.current.visible = detail === "far";
    }
  });
  return (
    <group
      ref={group}
      name={`attraction-${attraction.kind}`}
      position={[attraction.centre.x, attraction.ground, attraction.centre.z]}
      rotation={[0, attraction.turn, 0]}
    >
      <mesh
        ref={near}
        name={`attraction-${attraction.kind}-near`}
        geometry={geometries.near}
        material={looks.finished}
        castShadow
        receiveShadow
      />
      <mesh
        ref={far}
        name={`attraction-${attraction.kind}-far`}
        geometry={geometries.far}
        material={looks.finished}
        visible={false}
        receiveShadow
      />
      {(attraction.model.moving ?? []).map((part) => (
        <MovingPartModel
          key={part.name}
          attraction={attraction}
          part={part}
          looks={looks}
          detailRef={detailRef}
          explorerSpot={explorerSpot}
          darkness={darkness}
          isNearOnly={attraction.isCuriosity}
        />
      ))}
      {(attraction.model.wanderers ?? []).map((wanderers) => (
        <WanderersModel
          key={wanderers.name}
          attraction={attraction}
          wanderers={wanderers}
          looks={looks}
          detailRef={detailRef}
          isNearOnly={attraction.isCuriosity}
        />
      ))}
      {(attraction.model.smoke ?? []).map((smoke, index) => (
        <SmokeModel
          key={index}
          attraction={attraction}
          smoke={smoke}
          detailRef={detailRef}
          isNearOnly={attraction.isCuriosity}
        />
      ))}
    </group>
  );
};

/**
 * Draws every Attraction and Curiosity on the Island: in full near the
 * camera, in far detail further off and not at all beyond
 * `attractionFarReach` (or `curiosityFarReach`).
 */
export const IslandAttractions = ({
  adventure,
  darkness,
  explorerSpot,
}: {
  adventure: IslandAdventure;
  darkness: number;
  explorerSpot: ExplorerSpot;
}) => {
  const attractions = useMemo(
    () => placeIslandAttractions(adventure),
    [adventure],
  );
  const looks = useAttractionLooks(darkness);
  return (
    <group name="attractions">
      {attractions.map((attraction) => (
        <AttractionModelView
          key={attraction.id}
          attraction={attraction}
          looks={looks}
          explorerSpot={explorerSpot}
          darkness={darkness}
        />
      ))}
    </group>
  );
};

const upright = new Vector3(0, 1, 0);

const placeMatrix = (at: [number, number, number], turn: number): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...at),
    new Quaternion().setFromAxisAngle(upright, turn),
    new Vector3(1, 1, 1),
  );

/**
 * Adds a built model, finish by finish, to another builder, moved by
 * `matrix`, so many models can share one mesh and its materials.
 */
const addBuiltModel = (
  builder: AttractionBuilder,
  model: BufferGeometry,
  matrix: Matrix4,
) => {
  for (const group of model.groups) {
    if (group.count === 0 || group.materialIndex === undefined) {
      continue;
    }
    const piece = new BufferGeometry();
    for (const name of ["position", "normal", "color"] as const) {
      const attribute = model.getAttribute(name);
      piece.setAttribute(
        name,
        new BufferAttribute(
          attribute.array.slice(
            group.start * attribute.itemSize,
            (group.start + group.count) * attribute.itemSize,
          ),
          attribute.itemSize,
        ),
      );
    }
    piece.applyMatrix4(matrix);
    builder.addPainted(attractionFinishes[group.materialIndex], piece);
  }
  model.dispose();
};

/**
 * Every Attraction and Curiosity on an Island in far detail, standing
 * still as one geometry for the World Map: each one's model, its moving
 * parts where they rest and the people and animals that wander about
 * it, where they stand at the start of their walk. Lights, beams and
 * smoke are left off.
 */
export const buildMapAttractionsGeometry = (
  adventure: IslandAdventure,
): BufferGeometry => {
  const builder = new AttractionBuilder("far");
  for (const attraction of placeIslandAttractions(adventure)) {
    const placement = placeMatrix(
      [attraction.centre.x, attraction.ground, attraction.centre.z],
      attraction.turn,
    );
    addBuiltModel(builder, buildStatic(attraction, "far"), placement);
    for (const part of attraction.model.moving ?? []) {
      if ((part.look ?? "finished") !== "finished") {
        continue;
      }
      addBuiltModel(
        builder,
        buildPart(part.build, "far"),
        placement.clone().multiply(placeMatrix(part.pivot, 0)),
      );
    }
    for (const wanderers of attraction.model.wanderers ?? []) {
      for (let index = 0; index < wanderers.count; index++) {
        const spot = findWandererSpot(wanderers, index, 0);
        addBuiltModel(
          builder,
          buildPart(wanderers.build, "far"),
          placement
            .clone()
            .multiply(placeMatrix([spot.x, spot.y, spot.z], spot.heading)),
        );
      }
    }
  }
  return builder.build();
};

/**
 * The World Map's Attractions and Curiosities: every one on the Island,
 * still and in far detail, drawn as one mesh.
 */
export const MapAttractions = ({
  adventure,
  darkness,
}: {
  adventure: IslandAdventure;
  darkness: number;
}) => {
  const geometry = useMemo(
    () => buildMapAttractionsGeometry(adventure),
    [adventure],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  const looks = useAttractionLooks(darkness);
  return (
    <mesh
      name="map-attractions"
      geometry={geometry}
      material={looks.finished}
      receiveShadow
    />
  );
};
