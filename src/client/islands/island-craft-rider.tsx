import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  BufferAttribute,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Group,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CharacterLook } from "../character/character-look.js";
import { CharacterModel } from "../character/character-model.js";
import {
  applyStance,
  exploreCharacterScale,
  type Stance,
} from "../character/character-stance.js";
import {
  findDoorOpening,
  findDragonSeat,
  type Spot3,
} from "./island-flight.js";
import type { Transport } from "./island-journey.js";
import { findBoardRiderSpot, findBoardStance } from "./island-sea-craft.js";
import type { VoyagePhase } from "./island-voyage.js";

// The Character riding a craft in view on the World Map: sitting on the
// dragon's saddle, standing on the surfboard or windsurfer, or swimming in
// scuba gear. Drawn inside the craft, so it moves, turns and tilts with it.

export interface RiderPose {
  spot: Spot3;
  stance: Stance;
}

const ridersInView = new Set<Transport>([
  "dragon",
  "surfboard",
  "windsurfer",
  "scuba",
]);

export const isRiderInView = (transport: Transport): boolean =>
  ridersInView.has(transport);

const isRiding = (phase: VoyagePhase): boolean =>
  phase === "departing" || phase === "crossing" || phase === "docking";

/** Where the Character rides on a craft at a moment of its journey, if in view. */
export const findRiderPose = (
  transport: Transport,
  phase: VoyagePhase,
  share: number,
): RiderPose | undefined => {
  if (!isRiding(phase)) {
    return undefined;
  }
  if (transport === "dragon") {
    return {
      spot: findDragonSeat(
        phase === "crossing" ? 0 : findDoorOpening(phase, share),
      ),
      stance: "sitting",
    };
  }
  if (transport === "surfboard" || transport === "windsurfer") {
    const stance = findBoardStance(transport, phase, share);
    return { spot: findBoardRiderSpot(transport, stance), stance };
  }
  if (transport === "scuba" && phase === "crossing") {
    return { spot: { x: 0, y: 0, z: -0.35 }, stance: "swimming" };
  }
  return undefined;
};

const isOpaquePart = (
  part: Object3D,
): part is Mesh<BufferGeometry, MeshStandardMaterial> =>
  part instanceof Mesh &&
  part.material instanceof MeshStandardMaterial &&
  !part.material.transparent;

/** Every opaque part of a figure, in one geometry coloured by its parts' colours. */
const mergeFigure = (figure: Group): BufferGeometry | null => {
  figure.updateWorldMatrix(true, true);
  const toFigure = new Matrix4().copy(figure.matrixWorld).invert();
  const parts: BufferGeometry[] = [];
  figure.traverse((part) => {
    if (!isOpaquePart(part)) {
      return;
    }
    const placed = (
      part.geometry.index === null
        ? part.geometry.clone()
        : part.geometry.toNonIndexed()
    ).applyMatrix4(new Matrix4().multiplyMatrices(toFigure, part.matrixWorld));
    placed.deleteAttribute("uv");
    const { count } = placed.getAttribute("position");
    const colours = new Float32Array(count * 3);
    for (let vertex = 0; vertex < count; vertex++) {
      part.material.color.toArray(colours, vertex * 3);
    }
    placed.setAttribute("color", new BufferAttribute(colours, 3));
    parts.push(placed);
  });
  const merged = parts.length === 0 ? null : mergeGeometries(parts);
  parts.forEach((part) => {
    part.dispose();
  });
  return merged;
};

/**
 * The rider, posed, then merged into a single mesh, as small on the World
 * Map as the craft it rides, so it costs the map one mesh. It is posed and
 * merged again only when its stance changes.
 */
const MergedFigure = ({
  look,
  stance,
  gear,
}: {
  look: CharacterLook;
  stance: Stance;
  gear?: "scuba";
}) => {
  const source = useRef<Group>(null);
  const pose = useRef<Group>(null);
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  useLayoutEffect(() => {
    const figure = source.current;
    if (figure === null || pose.current === null) {
      return undefined;
    }
    applyStance(pose.current, stance, 0, 0);
    const merged = mergeFigure(figure);
    setGeometry(merged);
    return () => {
      merged?.dispose();
    };
  }, [stance, gear, look]);
  return (
    <>
      <group ref={source} visible={geometry === null}>
        <group ref={pose} scale={exploreCharacterScale}>
          <CharacterModel look={look} gear={gear} />
        </group>
      </group>
      {geometry === null ? null : (
        <mesh name="craft-rider-figure" geometry={geometry} castShadow>
          <meshStandardMaterial vertexColors roughness={0.62} />
        </mesh>
      )}
    </>
  );
};

export const CraftRider = ({
  look,
  stance,
  gear,
  riderRef,
}: {
  look: CharacterLook;
  stance: Stance | undefined;
  gear?: "scuba";
  riderRef: RefObject<Group | null>;
}) => (
  <group ref={riderRef} name="craft-rider" visible={false}>
    {stance === undefined ? null : (
      <MergedFigure look={look} stance={stance} gear={gear} />
    )}
  </group>
);

/** Places the rider for this frame, returning the stance it now holds. */
export const placeRider = (
  rider: Group | null,
  pose: RiderPose | undefined,
): Stance | undefined => {
  if (rider !== null) {
    rider.visible = pose !== undefined;
    if (pose !== undefined) {
      rider.position.set(pose.spot.x, pose.spot.y, pose.spot.z);
    }
  }
  return pose?.stance;
};
