import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Group, Mesh } from "three";
import {
  catalogue,
  furnitureSlots,
  type CharacterLoadout,
  type FurnitureSlot,
  type Item,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { Trophy } from "../../curriculum/rewards.js";
import type {
  ExploreInput,
  RoomCameraView,
} from "../islands/island-explore-hud.js";
import {
  findIntentTowards,
  isCameraTurningPointer,
  pushOutOfBlockers,
} from "../islands/island-walker.js";
import { getMotionScale } from "../reduced-motion.js";
import { clickSlopPixels } from "../world-map-scene.js";
import type { MapPoint } from "../world-map-terrain.js";
import { buildCharacterLook, buildShowOffLook } from "./character-look.js";
import { CharacterModel } from "./character-model.js";
import {
  ball,
  box,
  HeartShape,
  Part,
  partColours,
  shadeColour,
  StarShape,
  type Vector,
} from "./character-parts.js";
import { PetFigure } from "./character-show-off.js";
import { MergedParts } from "./merged-parts.js";
import { findSeatHeight } from "./room-desk-and-seat.js";
import {
  findBedTopHeight,
  Furniture,
  WallpaperPanel,
  wallHeight,
  wallWidth,
} from "./room-furniture.js";
import {
  backWallZ,
  frontWallZ,
  furniturePlacements,
  keepInsideRoom,
  roomBlockers,
  otherSideWallX,
  roomDepth,
  sideWallX,
  type PlacedSlot,
} from "./room-layout.js";
import type { RoomPlayState, RoomThing } from "./room-play-actions.js";
import { findFurnitureItems, TrophyShelf } from "./room-scene.js";
import {
  buildStartingRoomWalker,
  canPlayFromAfar,
  findNearestRoomThing,
  findThingSpot,
  isThingInReach,
  stepRoomWalker,
  type RoomWalker,
} from "./room-walker.js";

export interface RoomPlaySceneProps {
  room: RoomLoadout;
  trophies: readonly Trophy[];
  loadout: CharacterLoadout;
  inputRef: { current: ExploreInput };
  playState: RoomPlayState;
  cameraView: RoomCameraView;
  onNearbyChanged: (thing: RoomThing | undefined) => void;
  onThingReached: (thing: RoomThing) => void;
  onPetStroked: () => void;
  onGotUp: () => void;
}

interface WalkTarget {
  point: MapPoint;
  thing: RoomThing | undefined;
  closest: number;
  stuckSeconds: number;
}

interface CameraAim {
  yaw: number;
  pitch: number;
}

const floorColour = "#c89f72";
const ceilingColour = "#fbf7ef";
const dayColour = "#bfe6ff";
const nightColour = "#0b1030";
const lampLightColour = "#ffd59a";
const characterScale = 0.8;
const fieldOfView = 60;
const followDistance = 2.7;
const restingPitch = 0.95;
const startingPitch = 0.45;
const lowestPitch = 0.15;
const highestPitch = 1.2;
const dragTurnPerPixel = 0.006;
const cameraFollowRate = 6;
const cameraWallGap = 0.18;
const lowestCamera = 0.5;
const highestCamera = wallHeight - 0.25;
const lookHeight = 0.9;
const firstPersonEyeHeight = 1.15;
const firstPersonTurnSpeed = 2.2;
const firstPersonLookAhead = 4;
const mapMargin = 1.1;
const arrivedWithin = 0.25;
const giveUpAfterSeconds = 0.8;
const petFollowRate = 3;
const petRestingGap = 0.45;
const petSideStep = 0.5;
const petBackStep = 0.3;
const strokePixels = 90;
const strokeGapSeconds = 0.6;
const reactionSeconds = 0.8;
const burstSeconds = 1.3;
const burstPieces = 7;
const lampBulbHeight = 0.62;
const bedLift = 0.22;
const bedFootReach = 0.8;
const seatSink = 0.2;
const heldPetPlace: Vector = [0, 0.95, 0.42];
const heldPetScale = 0.75;
const pi = Math.PI;

type BurstLook = "hearts" | "stars" | "bubbles" | "toys" | "leaves";

const burstLooks: Partial<Record<RoomThing, BurstLook>> = {
  pet: "hearts",
  softToy: "hearts",
  instrument: "stars",
  shelf: "stars",
  desk: "stars",
  clock: "stars",
  wallPicture: "stars",
  fishTank: "bubbles",
  toyBox: "toys",
  plant: "leaves",
  bed: "bubbles",
};

const burstColours: Record<BurstLook, readonly string[]> = {
  hearts: [partColours.red, "#f06292", "#ff8a80"],
  stars: [partColours.gold, partColours.sky, "#ab47bc", partColours.leaf],
  bubbles: ["#e1f5fe", "#b3e5fc", partColours.white],
  toys: [partColours.red, partColours.sky, partColours.gold, partColours.leaf],
  leaves: [partColours.leaf, "#7cb342", "#aed581"],
};

const burstHeights: Partial<Record<PlacedSlot, number>> = {
  bed: 0.8,
  desk: 1,
  toyBox: 0.6,
  fishTank: 1,
  softToy: 0.6,
  instrument: 0.9,
  plant: 1,
};

const findBurstPlace = (thing: FurnitureSlot): Vector | undefined => {
  if (thing === "wallpaper") {
    return undefined;
  }
  const [x, y, z] = furniturePlacements[thing].position;
  return [x, y + (burstHeights[thing] ?? 0.3), z];
};

const clampCamera = (x: number, y: number, z: number): Vector => [
  Math.min(
    otherSideWallX - cameraWallGap,
    Math.max(sideWallX + cameraWallGap, x),
  ),
  Math.min(highestCamera, Math.max(lowestCamera, y)),
  Math.min(frontWallZ - cameraWallGap, Math.max(backWallZ + cameraWallGap, z)),
];

export const findMapCameraHeight = (aspect: number): number => {
  const reach = Math.tan((fieldOfView * pi) / 360);
  return (
    Math.max(roomDepth / 2 / reach, wallWidth / 2 / (reach * aspect)) *
    mapMargin
  );
};

export const findRoomViewAim = (
  view: RoomCameraView,
  aimPitch: number,
  isResting: boolean,
): { pitch: number; distance: number } => {
  if (view === "birds-eye") {
    return { pitch: 1.35, distance: 4 };
  }
  if (view === "wide") {
    return { pitch: 0.75, distance: 7 };
  }
  return {
    pitch: isResting ? restingPitch : aimPitch,
    distance: followDistance,
  };
};

const isClick = (event: ThreeEvent<MouseEvent>): boolean =>
  event.delta <= clickSlopPixels;

const useCameraTurning = (
  aim: { current: CameraAim },
  strokingRef: { current: boolean },
) => {
  const domElement = useThree((state) => state.gl.domElement);
  useEffect(() => {
    let dragFrom: { x: number; y: number } | undefined;
    const startDrag = (event: PointerEvent) => {
      if (strokingRef.current || !isCameraTurningPointer(event)) {
        return;
      }
      dragFrom = { x: event.clientX, y: event.clientY };
    };
    const keepMenuClosed = (event: MouseEvent) => {
      event.preventDefault();
    };
    const drag = (event: PointerEvent) => {
      if (dragFrom === undefined) {
        return;
      }
      aim.current.yaw -= (event.clientX - dragFrom.x) * dragTurnPerPixel;
      aim.current.pitch = Math.min(
        highestPitch,
        Math.max(
          lowestPitch,
          aim.current.pitch + (event.clientY - dragFrom.y) * dragTurnPerPixel,
        ),
      );
      dragFrom = { x: event.clientX, y: event.clientY };
    };
    const stopDrag = () => {
      dragFrom = undefined;
      strokingRef.current = false;
    };
    domElement.addEventListener("pointerdown", startDrag);
    domElement.addEventListener("contextmenu", keepMenuClosed);
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      domElement.removeEventListener("pointerdown", startDrag);
      domElement.removeEventListener("contextmenu", keepMenuClosed);
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [aim, domElement, strokingRef]);
};

const useReaction = (count: number) => {
  const age = useRef(reactionSeconds);
  const shown = useRef(count);
  useFrame((_state, deltaSeconds) => {
    if (shown.current !== count) {
      shown.current = count;
      age.current = 0;
    }
    age.current = Math.min(reactionSeconds, age.current + deltaSeconds);
  });
  return age;
};

const ReactingThing = ({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) => {
  const group = useRef<Group>(null);
  const age = useReaction(count);
  const [motionScale] = useState(getMotionScale);
  useFrame(() => {
    if (group.current === null) {
      return;
    }
    const left = 1 - age.current / reactionSeconds;
    const wobble = Math.sin(age.current * pi * 6) * left * motionScale;
    group.current.scale.set(
      1 + wobble * 0.06,
      1 - wobble * 0.1,
      1 + wobble * 0.06,
    );
    group.current.rotation.z = wobble * 0.06;
  });
  return <group ref={group}>{children}</group>;
};

const BurstPiece = ({ look, colour }: { look: BurstLook; colour: string }) => {
  switch (look) {
    case "hearts":
      return <HeartShape colour={colour} position={[0, 0, 0]} size={0.07} />;
    case "stars":
      return <StarShape colour={colour} position={[0, 0, 0]} size={0.07} />;
    case "leaves":
      return (
        <Part colour={colour} scale={[1, 0.4, 1.6]}>
          {ball(0.06)}
        </Part>
      );
    case "bubbles":
      return (
        <Part colour={colour} isGlassy>
          {ball(0.06)}
        </Part>
      );
    case "toys":
      return <Part colour={colour}>{ball(0.08)}</Part>;
  }
};

const ReactionBurst = ({
  look,
  place,
  count,
}: {
  look: BurstLook;
  place: Vector;
  count: number;
}) => {
  const pieces = useRef<(Group | null)[]>([]);
  const age = useRef(burstSeconds);
  const shown = useRef(count);
  const [motionScale] = useState(getMotionScale);
  const colours = burstColours[look];
  useFrame((_state, deltaSeconds) => {
    if (shown.current !== count) {
      shown.current = count;
      age.current = 0;
    }
    age.current = Math.min(burstSeconds, age.current + deltaSeconds);
    const share = age.current / burstSeconds;
    pieces.current.forEach((piece, index) => {
      if (piece === null) {
        return;
      }
      const angle = (index / burstPieces) * pi * 2;
      const spread = look === "toys" ? 0.6 : 0.35;
      const rise = look === "toys" ? Math.sin(share * pi) * 0.9 : share * 1.1;
      piece.visible = motionScale > 0 && share < 1;
      piece.position.set(
        Math.cos(angle) * spread * share,
        rise,
        Math.sin(angle) * spread * share,
      );
      piece.scale.setScalar(1 - share * 0.5);
    });
  });
  return (
    <group position={place}>
      {Array.from({ length: burstPieces }, (_, index) => (
        <group
          key={index}
          visible={false}
          ref={(piece) => {
            pieces.current[index] = piece;
          }}
        >
          <BurstPiece look={look} colour={colours[index % colours.length]} />
        </group>
      ))}
    </group>
  );
};

const PlayRoomShell = ({
  wallpaper,
  isCeilingShown,
  onFloorTapped,
  onWallTapped,
}: {
  wallpaper: Item;
  isCeilingShown: boolean;
  onFloorTapped: (point: MapPoint) => void;
  onWallTapped: () => void;
}) => {
  const model = wallpaper.model ?? "plain";
  const walls: {
    key: string;
    position: Vector;
    turn: number;
    width: number;
  }[] = [
    { key: "back", position: [0, 0, backWallZ], turn: 0, width: wallWidth },
    {
      key: "left",
      position: [sideWallX, 0, 0],
      turn: pi / 2,
      width: roomDepth,
    },
    {
      key: "right",
      position: [otherSideWallX, 0, 0],
      turn: -pi / 2,
      width: roomDepth,
    },
    { key: "front", position: [0, 0, frontWallZ], turn: pi, width: wallWidth },
  ];
  return (
    <>
      <group
        name="floor"
        onClick={(event) => {
          if (!isClick(event)) {
            return;
          }
          event.stopPropagation();
          onFloorTapped({ x: event.point.x, z: event.point.z });
        }}
      >
        <Part colour={floorColour} position={[0, -0.05, 0]}>
          {box(wallWidth, 0.1, roomDepth)}
        </Part>
      </group>
      <group name="ceiling" visible={isCeilingShown}>
        <Part colour={ceilingColour} position={[0, wallHeight + 0.05, 0]}>
          {box(wallWidth, 0.1, roomDepth)}
        </Part>
      </group>
      <group
        name="walls"
        onClick={(event) => {
          if (!isClick(event)) {
            return;
          }
          event.stopPropagation();
          onWallTapped();
        }}
      >
        <MergedParts
          name="wallpaper-merged"
          mergeKey={`${model}-${wallpaper.colour}`}
        >
          {walls.map(({ key, position, turn, width }, index) => (
            <group key={key} position={position} rotation={[0, turn, 0]}>
              <WallpaperPanel
                model={model}
                colour={
                  index % 2 === 0
                    ? wallpaper.colour
                    : shadeColour(wallpaper.colour, -0.08)
                }
                width={width}
                height={wallHeight}
              />
            </group>
          ))}
        </MergedParts>
      </group>
    </>
  );
};

const StillFurniture = ({
  slot,
  item,
  trophies,
}: {
  slot: PlacedSlot;
  item: Item;
  trophies: readonly Trophy[];
}) => {
  const furniture = (
    <>
      <Furniture
        look={{ slot, model: item.model ?? "", colour: item.colour }}
      />
      {slot === "shelf" ? <TrophyShelf trophies={trophies} /> : null}
    </>
  );
  return slot === "fishTank" ? (
    furniture
  ) : (
    <MergedParts
      name={`merged-${slot}`}
      mergeKey={`${item.id}-${String(trophies.length)}`}
    >
      {furniture}
    </MergedParts>
  );
};

const RoomLights = ({
  isNight,
  isLampOn,
}: {
  isNight: boolean;
  isLampOn: boolean;
}) => {
  const [lampX, , lampZ] = furniturePlacements.lamp.position;
  return (
    <>
      <color attach="background" args={[isNight ? nightColour : dayColour]} />
      <hemisphereLight args={["#ffffff", "#b9a58a", isNight ? 0.35 : 1.4]} />
      <directionalLight
        position={[2.5, 4, 3.5]}
        intensity={isNight ? 0.2 : 1.6}
        color={isNight ? "#9fa8da" : "#fff4e6"}
      />
      {isLampOn ? (
        <>
          <pointLight
            position={[lampX, lampBulbHeight + 0.3, lampZ + 0.3]}
            intensity={isNight ? 4 : 1.5}
            distance={6}
            color={lampLightColour}
          />
          <mesh name="lamp-glow" position={[lampX, lampBulbHeight, lampZ]}>
            <sphereGeometry args={[0.2, 12, 8]} />
            <meshBasicMaterial
              color={lampLightColour}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}
    </>
  );
};

const findRestingPlace = (
  playState: RoomPlayState,
  furniture: ReadonlyMap<FurnitureSlot, Item>,
): { position: Vector; rotation: Vector } | undefined => {
  if (playState.pose === "lying") {
    const [x, , z] = furniturePlacements.bed.position;
    const scale = furniturePlacements.bed.scale ?? 1;
    const top = findBedTopHeight(furniture.get("bed")?.model ?? "") * scale;
    return {
      position: [x, top + bedLift, z + bedFootReach],
      rotation: [-pi / 2, 0, 0],
    };
  }
  if (playState.pose === "sitting") {
    const [x, , z] = furniturePlacements.seat.position;
    const height = findSeatHeight(furniture.get("seat")?.model ?? "");
    const turn = furniturePlacements.seat.rotation?.[1] ?? 0;
    return {
      position: [
        x + Math.sin(turn) * 0.1,
        height - seatSink,
        z + Math.cos(turn) * 0.1,
      ],
      rotation: [0, turn, 0],
    };
  }
  return undefined;
};

const findPetFollowPoint = (walker: RoomWalker): MapPoint => ({
  x:
    walker.x +
    Math.cos(walker.heading) * petSideStep -
    Math.sin(walker.heading) * petBackStep,
  z:
    walker.z -
    Math.sin(walker.heading) * petSideStep -
    Math.cos(walker.heading) * petBackStep,
});

export const RoomPlayScene = (sceneProps: RoomPlaySceneProps) => {
  const { room, trophies, loadout, playState } = sceneProps;
  const camera = useThree((state) => state.camera);
  const furnitureItems = useMemo(
    () => findFurnitureItems(room, catalogue),
    [room],
  );
  const furniture = useMemo(() => new Map(furnitureItems), [furnitureItems]);
  const look = useMemo(() => buildCharacterLook(loadout), [loadout]);
  const pet = useMemo(() => buildShowOffLook(loadout).pet, [loadout]);
  const walker = useRef(buildStartingRoomWalker());
  const petPlace = useRef<MapPoint>(
    findPetFollowPoint(buildStartingRoomWalker()),
  );
  const target = useRef<WalkTarget | undefined>(undefined);
  const aim = useRef<CameraAim>({ yaw: 0, pitch: startingPitch });
  const body = useRef<Group>(null);
  const model = useRef<Group>(null);
  const mapMarker = useRef<Mesh>(null);
  const groundPet = useRef<Group>(null);
  const heldPet = useRef<Group>(null);
  const stride = useRef(0);
  const reportedNearby = useRef<RoomThing | undefined>(undefined);
  const askedToGetUp = useRef(false);
  const stroking = useRef({ pixels: 0, sinceLast: strokeGapSeconds });
  const strokingRef = useRef(false);
  const petWiggle = useReaction(playState.strokes);
  const latest = useRef(sceneProps);
  const [motionScale] = useState(getMotionScale);
  useEffect(() => {
    latest.current = sceneProps;
  });
  useCameraTurning(aim, strokingRef);

  const findPetSpot = (): MapPoint | undefined =>
    pet === undefined || latest.current.playState.isPetHeld
      ? undefined
      : petPlace.current;

  const tapThing = (thing: RoomThing) => {
    const props = latest.current;
    if (thing === "pet" && props.playState.isPetHeld) {
      props.onPetStroked();
      return;
    }
    const isResting = props.playState.pose !== "standing";
    const petSpot = findPetSpot();
    if (
      canPlayFromAfar(thing) ||
      isThingInReach(thing, walker.current, petSpot) ||
      (isResting && thing === "bed") ||
      (isResting && thing === "seat")
    ) {
      target.current = undefined;
      props.onThingReached(thing);
      return;
    }
    const spot = findThingSpot(thing, petSpot);
    if (spot === undefined) {
      return;
    }
    target.current = { point: spot, thing, closest: Infinity, stuckSeconds: 0 };
  };

  useFrame((state, deltaSeconds) => {
    const props = latest.current;
    const input = props.inputRef.current;
    const isSteered = input.right !== 0 || input.forward !== 0;
    if (isSteered) {
      target.current = undefined;
    }
    const isResting = props.playState.pose !== "standing";
    if (!isResting) {
      askedToGetUp.current = false;
    }
    const wantsToMove =
      isSteered || target.current !== undefined || input.wantsJump;
    if (isResting && wantsToMove && !askedToGetUp.current) {
      askedToGetUp.current = true;
      props.onGotUp();
    }
    const isFirstPerson = props.cameraView === "first-person" && !isResting;
    if (isFirstPerson) {
      aim.current.yaw -= input.right * firstPersonTurnSpeed * deltaSeconds;
    }
    const isMap = props.cameraView === "map";
    const sideways = isFirstPerson ? 0 : input.right;
    const steerYaw = isMap ? 0 : aim.current.yaw;
    const steered = {
      x: sideways * Math.cos(steerYaw) - input.forward * Math.sin(steerYaw),
      z: -sideways * Math.sin(steerYaw) - input.forward * Math.cos(steerYaw),
    };
    const goal = target.current;
    const targetIntent =
      goal === undefined
        ? undefined
        : findIntentTowards(walker.current, goal.point, arrivedWithin);
    const intent = isResting
      ? { x: 0, z: 0, wantsJump: false }
      : { ...(targetIntent ?? steered), wantsJump: input.wantsJump };
    input.wantsJump = false;
    walker.current = stepRoomWalker(
      walker.current,
      intent,
      deltaSeconds,
      roomBlockers,
    );
    const now = walker.current;
    const petSpot =
      pet === undefined || props.playState.isPetHeld
        ? undefined
        : petPlace.current;

    if (goal !== undefined && !isResting) {
      const distance = Math.hypot(now.x - goal.point.x, now.z - goal.point.z);
      if (distance < goal.closest - 0.01) {
        goal.closest = distance;
        goal.stuckSeconds = 0;
      } else {
        goal.stuckSeconds += deltaSeconds;
      }
      const isReached =
        goal.thing === "pet"
          ? isThingInReach(goal.thing, now, petSpot)
          : targetIntent === undefined;
      if (isReached || goal.stuckSeconds > giveUpAfterSeconds) {
        target.current = undefined;
        if (goal.thing !== undefined) {
          props.onThingReached(goal.thing);
        }
      }
    }

    const nearby = props.playState.isPetHeld
      ? "pet"
      : findNearestRoomThing(now, petSpot);
    if (nearby !== reportedNearby.current) {
      reportedNearby.current = nearby;
      props.onNearbyChanged(nearby);
    }

    const speed = Math.hypot(now.velocityX, now.velocityZ);
    stride.current += deltaSeconds * speed * 4;
    const resting = findRestingPlace(props.playState, furniture);
    if (body.current !== null) {
      if (resting === undefined) {
        const bob =
          speed > 0.2
            ? Math.abs(Math.sin(stride.current)) * 0.05 * motionScale
            : 0;
        body.current.position.set(now.x, now.jumpHeight + bob, now.z);
        body.current.rotation.set(
          0,
          now.heading,
          speed > 0.2 ? Math.sin(stride.current) * 0.04 * motionScale : 0,
        );
      } else {
        body.current.position.set(...resting.position);
        body.current.rotation.set(...resting.rotation);
      }
    }

    stroking.current.sinceLast += deltaSeconds;
    if (pet !== undefined && !props.playState.isPetHeld && !isResting) {
      const follow = findPetFollowPoint(now);
      const gap = Math.hypot(
        follow.x - petPlace.current.x,
        follow.z - petPlace.current.z,
      );
      if (gap > petRestingGap) {
        const pull = 1 - Math.exp(-petFollowRate * deltaSeconds);
        petPlace.current = keepInsideRoom(
          pushOutOfBlockers(
            {
              x: petPlace.current.x + (follow.x - petPlace.current.x) * pull,
              z: petPlace.current.z + (follow.z - petPlace.current.z) * pull,
            },
            roomBlockers,
          ),
        );
      }
    }
    const wiggle =
      Math.sin(petWiggle.current * pi * 8) *
      (1 - petWiggle.current / reactionSeconds) *
      motionScale;
    if (groundPet.current !== null) {
      groundPet.current.visible = !props.playState.isPetHeld;
      groundPet.current.position.set(petPlace.current.x, 0, petPlace.current.z);
      groundPet.current.rotation.y = Math.atan2(
        now.x - petPlace.current.x,
        now.z - petPlace.current.z,
      );
    }
    if (heldPet.current !== null) {
      heldPet.current.visible = props.playState.isPetHeld;
      heldPet.current.rotation.z = wiggle * 0.25;
    }

    if (model.current !== null) {
      model.current.visible = !isFirstPerson;
    }
    if (mapMarker.current !== null) {
      mapMarker.current.visible = isMap;
      mapMarker.current.position.set(now.x, 0.02, now.z);
    }
    const follow = 1 - Math.exp(-cameraFollowRate * deltaSeconds);
    if (isMap) {
      const height = findMapCameraHeight(
        state.size.width / Math.max(1, state.size.height),
      );
      camera.position.lerp({ x: 0, y: height, z: 0.01 }, follow);
      camera.lookAt(0, 0, 0);
      return;
    }
    const { yaw } = aim.current;
    if (isFirstPerson) {
      const eyeY = now.jumpHeight + firstPersonEyeHeight;
      const lookDown = aim.current.pitch - startingPitch;
      camera.position.set(now.x, eyeY, now.z);
      camera.lookAt(
        now.x - Math.sin(yaw) * firstPersonLookAhead,
        eyeY - lookDown * firstPersonLookAhead,
        now.z - Math.cos(yaw) * firstPersonLookAhead,
      );
      return;
    }
    const [lookX, lookY, lookZ] = resting?.position ?? [now.x, 0, now.z];
    const { pitch, distance } = findRoomViewAim(
      props.cameraView,
      aim.current.pitch,
      isResting,
    );
    const flatReach = Math.cos(pitch) * distance;
    const wanted = clampCamera(
      lookX + Math.sin(yaw) * flatReach,
      lookY + lookHeight + Math.sin(pitch) * distance,
      lookZ + Math.cos(yaw) * flatReach,
    );
    camera.position.lerp({ x: wanted[0], y: wanted[1], z: wanted[2] }, follow);
    camera.lookAt(lookX, lookY + lookHeight * (isResting ? 0.3 : 1), lookZ);
  });

  const strokeHeldPet = (event: ThreeEvent<PointerEvent>) => {
    if (!latest.current.playState.isPetHeld || event.buttons === 0) {
      return;
    }
    stroking.current.pixels += Math.hypot(
      event.nativeEvent.movementX,
      event.nativeEvent.movementY,
    );
    if (
      stroking.current.pixels >= strokePixels &&
      stroking.current.sinceLast >= strokeGapSeconds
    ) {
      stroking.current = { pixels: 0, sinceLast: 0 };
      latest.current.onPetStroked();
    }
  };

  const wallpaper = furniture.get("wallpaper");
  return (
    <>
      <RoomLights isNight={playState.isNight} isLampOn={playState.isLampOn} />
      {wallpaper === undefined ? null : (
        <PlayRoomShell
          wallpaper={wallpaper}
          isCeilingShown={sceneProps.cameraView !== "map"}
          onFloorTapped={(point) => {
            target.current = {
              point,
              thing: undefined,
              closest: Infinity,
              stuckSeconds: 0,
            };
          }}
          onWallTapped={() => {
            tapThing("wallpaper");
          }}
        />
      )}
      {furnitureItems.map(([slot, item]) =>
        slot === "wallpaper" ? null : (
          <group
            key={slot}
            name={`play-${slot}`}
            position={furniturePlacements[slot].position}
            rotation={furniturePlacements[slot].rotation}
            scale={furniturePlacements[slot].scale}
            onClick={(event) => {
              if (!isClick(event)) {
                return;
              }
              event.stopPropagation();
              tapThing(slot);
            }}
          >
            <ReactingThing count={playState.pokes[slot] ?? 0}>
              <StillFurniture slot={slot} item={item} trophies={trophies} />
            </ReactingThing>
          </group>
        ),
      )}
      {furnitureSlots.map((slot) => {
        const burstLook = burstLooks[slot];
        const place = findBurstPlace(slot);
        return burstLook === undefined || place === undefined ? null : (
          <ReactionBurst
            key={slot}
            look={burstLook}
            place={place}
            count={playState.pokes[slot] ?? 0}
          />
        );
      })}
      <mesh
        ref={mapMarker}
        name="map-marker"
        rotation={[-pi / 2, 0, 0]}
        visible={false}
      >
        <ringGeometry args={[0.38, 0.5, 32]} />
        <meshBasicMaterial color={partColours.gold} />
      </mesh>
      <group ref={body} name="room-player">
        <group scale={characterScale}>
          <group ref={model} name="room-player-model">
            <CharacterModel look={look} />
          </group>
          {pet === undefined ? null : (
            <group
              ref={heldPet}
              name="held-pet"
              position={heldPetPlace}
              scale={heldPetScale}
              visible={playState.isPetHeld}
              onPointerDown={(event) => {
                if (latest.current.playState.isPetHeld) {
                  strokingRef.current = true;
                  event.stopPropagation();
                }
              }}
              onPointerMove={strokeHeldPet}
              onClick={(event) => {
                event.stopPropagation();
                tapThing("pet");
              }}
            >
              <PetFigure pet={pet} />
              <ReactionBurst
                look="hearts"
                place={[0, 0.5, 0]}
                count={playState.strokes}
              />
            </group>
          )}
        </group>
      </group>
      {pet === undefined ? null : (
        <group
          ref={groundPet}
          name="room-pet"
          onClick={(event) => {
            if (!isClick(event)) {
              return;
            }
            event.stopPropagation();
            tapThing("pet");
          }}
        >
          <group scale={characterScale}>
            <PetFigure pet={pet} />
          </group>
        </group>
      )}
    </>
  );
};

const startingCamera: Vector = [0.35, 2.1, 2.0];

export const RoomPlayCanvas = (sceneProps: RoomPlaySceneProps) => (
  <div className="room-play-scene">
    <Canvas
      flat
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{
        position: startingCamera,
        fov: fieldOfView,
        near: 0.05,
        far: 30,
      }}
    >
      <RoomPlayScene {...sceneProps} />
    </Canvas>
  </div>
);
