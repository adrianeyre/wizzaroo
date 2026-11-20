import { createRoot, extend, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box3,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import {
  catalogue,
  findItem,
  isFeatureSlot,
  isFurnitureSlot,
  isOneOf,
  isShowOffSlot,
  isVehicleSlot,
  emoteModels,
  mountModels,
  petModels,
  spellEffectModels,
  vehicleModels,
  type CharacterLoadout,
  type ItemSlot,
  type WearableSlot,
} from "../../curriculum/catalogue.js";
import { BackGear, Hat, HeldGear } from "./character-gear.js";
import {
  buildCharacterLook,
  type CharacterLook,
  type EmoteModel,
  type MountModel,
  type PartLook,
  type PetModel,
  type SpellEffectModel,
} from "./character-look.js";
import { Body, CharacterModel, Head } from "./character-model.js";
import type { Vector } from "./character-parts.js";
import { StudioLights } from "./character-preview.js";
import {
  findStillEmotePose,
  MountFigure,
  PetFigure,
  ShowOffFigure,
  SpellEffectGlow,
} from "./character-show-off.js";
import { Furniture, type FurnitureLook } from "./room-furniture.js";
import type { FindLook } from "../../curriculum/island-quests.js";
import { QuestFindFigure } from "../islands/quest-find-figure.js";
import { VehicleFigure, type VehicleLook } from "../vehicles/vehicle-figure.js";

type HeadSlot = "hairStyle" | "eyes" | "eyebrows" | "mouth" | "facialHair";

type GearSlot = Exclude<WearableSlot, "accessory">;

interface StillShowOff {
  emote: EmoteModel | undefined;
  spellEffect: PartLook<SpellEffectModel> | undefined;
}

interface CharacterShot {
  subject: "character" | "head" | GearSlot;
  focusPartNames: string[];
  look: CharacterLook;
  stillShowOff?: StillShowOff;
}

interface PetShot {
  subject: "pet";
  pet: PartLook<PetModel>;
}

interface MountShot {
  subject: "mount";
  mount: PartLook<MountModel>;
}

interface VehicleShot {
  subject: "vehicle";
  vehicle: VehicleLook;
}

interface FurnitureShot {
  subject: "furniture";
  furniture: FurnitureLook;
}

/** A Quest Find in the rucksack, turned to one of its turntable angles (ADR 0058). */
export interface QuestFindShot {
  subject: "quest-find";
  look: FindLook;
  turn: number;
}

export type ItemShot =
  | CharacterShot
  | PetShot
  | MountShot
  | VehicleShot
  | FurnitureShot
  | QuestFindShot;

interface Pose {
  turn: number;
  viewFrom: Vector;
}

interface TakenPicture {
  url: string | undefined;
}

const headFocusPartNames: Record<HeadSlot, string[]> = {
  hairStyle: [],
  eyes: ["eyes"],
  eyebrows: ["eyebrows"],
  mouth: ["mouth"],
  facialHair: ["facial-hair"],
};

const accessoryPartNames = ["face-accessory", "neck-accessory"];

const isHeadSlot = (slot: ItemSlot): slot is HeadSlot =>
  Object.hasOwn(headFocusPartNames, slot);

const pictureSize = 192;
const fieldOfView = 30;
const framePadding = 1.12;
const smallestFocusSize = 0.46;
const smallestAccessoryFocusSize = 0.7;
const mostPicturesKept = 240;
const quarterTurn = 0.45;

const poses: Record<
  GearSlot | "character" | "pet" | "mount" | "vehicle",
  Pose
> = {
  character: { turn: 0.35, viewFrom: [0, 0.12, 1] },
  vehicle: { turn: 0.75, viewFrom: [0, 0.4, 1] },
  pet: { turn: 0.55, viewFrom: [0, 0.3, 1] },
  mount: { turn: 0.7, viewFrom: [0, 0.35, 1] },
  hat: { turn: quarterTurn, viewFrom: [0, 0.5, 1] },
  outfit: { turn: 0.35, viewFrom: [0, 0.12, 1] },
  back: { turn: Math.PI + quarterTurn, viewFrom: [0, 0.2, 1] },
  wand: { turn: -0.35, viewFrom: [0, 0.12, 1] },
};

const wallFurniturePose: Pose = { turn: 0, viewFrom: [0, 0.05, 1] };
const floorFurniturePose: Pose = { turn: 0.5, viewFrom: [0, 0.45, 1] };
const rugPose: Pose = { turn: 0.3, viewFrom: [0, 1, 0.55] };

const getFurniturePose = ({ slot }: FurnitureLook): Pose => {
  switch (slot) {
    case "wallpaper":
    case "wallPicture":
    case "window":
    case "shelf":
    case "clock":
      return wallFurniturePose;
    case "rug":
      return rugPose;
    case "bed":
    case "lamp":
    case "plant":
    case "desk":
    case "seat":
    case "toyBox":
    case "fishTank":
    case "softToy":
    case "instrument":
      return floorFurniturePose;
  }
};

const getPose = (shot: ItemShot): Pose => {
  if (shot.subject === "quest-find") {
    return { turn: shot.turn, viewFrom: [0, 0.5, 1] };
  }
  if (shot.subject === "furniture") {
    return getFurniturePose(shot.furniture);
  }
  if (
    shot.subject === "pet" ||
    shot.subject === "mount" ||
    shot.subject === "vehicle"
  ) {
    return poses[shot.subject];
  }
  if (shot.subject === "character" && shot.focusPartNames.length > 0) {
    return { turn: 0.3, viewFrom: [0, 0.1, 1] };
  }
  if (shot.subject !== "head") {
    return poses[shot.subject];
  }
  return shot.focusPartNames.length === 0
    ? { turn: quarterTurn, viewFrom: [0, 0.2, 1] }
    : { turn: 0.15, viewFrom: [0, 0.05, 1] };
};

const listFeaturesOnly = (loadout: CharacterLoadout): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(([slot]) => isFeatureSlot(slot)),
  );

const takeOffHat = (look: CharacterLook): CharacterLook => ({
  ...look,
  hat: { model: "none", colour: look.hat.colour },
});

const listWithout = (
  loadout: CharacterLoadout,
  slot: ItemSlot,
): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(([chosenSlot]) => chosenSlot !== slot),
  );

const listWithoutShowingOff = (loadout: CharacterLoadout): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(([slot]) => !isShowOffSlot(slot)),
  );

const buildShowOffShot = (
  slot: ItemSlot,
  itemId: string | undefined,
  loadout: CharacterLoadout,
): ItemShot | undefined => {
  const item = itemId === undefined ? undefined : findItem(itemId, catalogue);
  if (item?.slot !== slot) {
    return undefined;
  }
  const { model, colour } = item;
  if (isFurnitureSlot(slot)) {
    return model === undefined
      ? undefined
      : { subject: "furniture", furniture: { slot, model, colour } };
  }
  if (slot === "pet" && isOneOf(petModels, model)) {
    return { subject: "pet", pet: { model, colour } };
  }
  if (slot === "mount" && isOneOf(mountModels, model)) {
    return { subject: "mount", mount: { model, colour } };
  }
  const look = buildCharacterLook(listWithoutShowingOff(loadout));
  if (slot === "emote" && isOneOf(emoteModels, model)) {
    return {
      subject: "character",
      focusPartNames: [],
      look,
      stillShowOff: { emote: model, spellEffect: undefined },
    };
  }
  if (slot === "spellEffect" && isOneOf(spellEffectModels, model)) {
    return {
      subject: "character",
      focusPartNames: [],
      look,
      stillShowOff: { emote: undefined, spellEffect: { model, colour } },
    };
  }
  return undefined;
};

export const buildItemShot = (
  slot: ItemSlot,
  itemId: string | undefined,
  loadout: CharacterLoadout,
): ItemShot | undefined => {
  if (isVehicleSlot(slot)) {
    const item = itemId === undefined ? undefined : findItem(itemId, catalogue);
    return item?.slot === slot && isOneOf(vehicleModels, item.model)
      ? {
          subject: "vehicle",
          vehicle: { model: item.model, colour: item.colour },
        }
      : undefined;
  }
  if (isFurnitureSlot(slot) || isShowOffSlot(slot)) {
    return buildShowOffShot(slot, itemId, loadout);
  }
  const loadoutWithItem =
    itemId === undefined
      ? listWithout(loadout, slot)
      : { ...loadout, [slot]: itemId };
  if (slot === "characterType") {
    return {
      subject: "character",
      focusPartNames: [],
      look: buildCharacterLook(listFeaturesOnly(loadoutWithItem)),
    };
  }
  const look = buildCharacterLook(loadoutWithItem);
  if (isHeadSlot(slot)) {
    return {
      subject: "head",
      focusPartNames: headFocusPartNames[slot],
      look: {
        ...takeOffHat(look),
        accessory: { model: "none", colour: look.accessory.colour },
      },
    };
  }
  if (slot === "accessory") {
    return look.accessory.model === "none"
      ? undefined
      : {
          subject: "character",
          focusPartNames: accessoryPartNames,
          look: {
            ...takeOffHat(look),
            back: { model: "none", colour: look.back.colour },
            wand: { model: "none", colour: look.wand.colour },
          },
        };
  }
  if (isFeatureSlot(slot)) {
    return undefined;
  }
  return { subject: slot, focusPartNames: [], look };
};

const buildShotKey = (shot: ItemShot): string => {
  if (
    shot.subject === "character" ||
    shot.subject === "head" ||
    shot.subject === "pet" ||
    shot.subject === "mount" ||
    shot.subject === "vehicle" ||
    shot.subject === "furniture" ||
    shot.subject === "quest-find"
  ) {
    return JSON.stringify(shot);
  }
  const skinColour = shot.subject === "outfit" ? shot.look.skinColour : null;
  return JSON.stringify([shot.subject, shot.look[shot.subject], skinColour]);
};

const StillShowingOff = ({
  look,
  stillShowOff,
}: {
  look: CharacterLook;
  stillShowOff: StillShowOff;
}) => (
  <ShowOffFigure
    showOff={{
      pet: undefined,
      mount: undefined,
      emote: stillShowOff.emote,
      spellEffect: stillShowOff.spellEffect,
    }}
    pose={findStillEmotePose(stillShowOff.emote)}
    effect={
      stillShowOff.spellEffect === undefined ? undefined : (
        <SpellEffectGlow spellEffect={stillShowOff.spellEffect} />
      )
    }
  >
    <CharacterModel look={look} />
  </ShowOffFigure>
);

export const ShotSubject = ({ shot }: { shot: ItemShot }) => {
  if (shot.subject === "pet") {
    return <PetFigure pet={shot.pet} />;
  }
  if (shot.subject === "mount") {
    return <MountFigure mount={shot.mount} />;
  }
  if (shot.subject === "furniture") {
    return <Furniture look={shot.furniture} />;
  }
  if (shot.subject === "quest-find") {
    return <QuestFindFigure look={shot.look} />;
  }
  if (shot.subject === "vehicle") {
    return <VehicleFigure vehicle={shot.vehicle} />;
  }
  const { look } = shot;
  switch (shot.subject) {
    case "character":
      return shot.stillShowOff === undefined ? (
        <CharacterModel look={look} />
      ) : (
        <StillShowingOff look={look} stillShowOff={shot.stillShowOff} />
      );
    case "head":
      return <Head look={look} />;
    case "hat":
      return <Hat hat={look.hat} />;
    case "outfit":
      return <Body outfit={look.outfit} skinColour={look.skinColour} />;
    case "back":
      return <BackGear back={look.back} />;
    case "wand":
      return <HeldGear wand={look.wand} />;
  }
};

const findFocusBox = (subject: Group, shot: ItemShot): Box3 => {
  const focusBox = new Box3();
  const focusPartNames = "focusPartNames" in shot ? shot.focusPartNames : [];
  for (const partName of focusPartNames) {
    const part = subject.getObjectByName(partName);
    if (part !== undefined) {
      focusBox.expandByObject(part);
    }
  }
  if (focusBox.isEmpty()) {
    return new Box3().setFromObject(subject);
  }
  const smallestSize =
    shot.subject === "character"
      ? smallestAccessoryFocusSize
      : smallestFocusSize;
  const centre = focusBox.getCenter(new Vector3());
  const size = focusBox.getSize(new Vector3());
  return focusBox.setFromCenterAndSize(
    centre,
    new Vector3(
      Math.max(size.x, smallestSize),
      Math.max(size.y, smallestSize),
      size.z,
    ),
  );
};

const listBoxCorners = ({ min, max }: Box3): Vector3[] =>
  [min.x, max.x].flatMap((x) =>
    [min.y, max.y].flatMap((y) =>
      [min.z, max.z].map((z) => new Vector3(x, y, z)),
    ),
  );

const frameCameraOnBox = (
  camera: PerspectiveCamera,
  box: Box3,
  viewFrom: Vector,
) => {
  const centre = box.getCenter(new Vector3());
  const towardsCamera = new Vector3(...viewFrom).normalize();
  camera.position.copy(centre).add(towardsCamera);
  camera.lookAt(centre);
  camera.updateMatrixWorld();
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const halfViewSlope = Math.tan((camera.fov * Math.PI) / 360);
  const distance = Math.max(
    ...listBoxCorners(box).map((corner) => {
      const offset = corner.sub(centre);
      const halfExtent =
        Math.max(Math.abs(offset.dot(right)), Math.abs(offset.dot(up))) *
        framePadding;
      return halfExtent / halfViewSlope + offset.dot(towardsCamera);
    }),
  );
  camera.position.copy(centre).addScaledVector(towardsCamera, distance);
  camera.near = distance / 100;
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
};

const PhotographedShot = ({
  shot,
  onTaken,
}: {
  shot: ItemShot;
  onTaken: (url: string | undefined) => void;
}) => {
  const subject = useRef<Group>(null);
  const { gl, scene } = useThree();
  const camera = useMemo(() => new PerspectiveCamera(fieldOfView, 1), []);
  const { turn, viewFrom } = getPose(shot);

  useLayoutEffect(() => {
    if (subject.current === null) {
      return;
    }
    subject.current.updateWorldMatrix(true, true);
    const box = findFocusBox(subject.current, shot);
    if (box.isEmpty()) {
      onTaken(undefined);
      return;
    }
    frameCameraOnBox(camera, box, viewFrom);
    gl.render(scene, camera);
    onTaken(gl.domElement.toDataURL("image/png"));
  }, [camera, gl, onTaken, scene, shot, viewFrom]);

  return (
    <>
      <StudioLights />
      <group ref={subject} rotation={[0, turn, 0]}>
        <ShotSubject shot={shot} />
      </group>
    </>
  );
};

const openStudio = async () => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (context === null) {
    return undefined;
  }
  extend({
    BoxGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    DirectionalLight,
    Group,
    HemisphereLight,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    OctahedronGeometry,
    SphereGeometry,
    TorusGeometry,
  });
  const studio = createRoot(canvas);
  await studio.configure({
    gl: { canvas, context, alpha: true, antialias: true },
    size: { width: pictureSize, height: pictureSize, top: 0, left: 0 },
    dpr: 1,
    flat: true,
    frameloop: "never",
  });
  return studio;
};

let studio: ReturnType<typeof openStudio> | undefined;
let lastPicture: Promise<unknown> = Promise.resolve();
let shotCount = 0;
const takenPictures = new Map<string, TakenPicture>();
const pictures = new Map<string, Promise<string | undefined>>();

const photographShot = async (shot: ItemShot) => {
  studio ??= openStudio();
  const openedStudio = await studio;
  if (openedStudio === undefined) {
    return undefined;
  }
  shotCount += 1;
  const shotNumber = shotCount;
  return new Promise<string | undefined>((resolve) => {
    openedStudio.render(
      <PhotographedShot key={shotNumber} shot={shot} onTaken={resolve} />,
    );
  });
};

const forgetOldestPicture = () => {
  const [oldestKey] = pictures.keys();
  pictures.delete(oldestKey);
  takenPictures.delete(oldestKey);
};

const takeItemPicture = (shot: ItemShot): Promise<string | undefined> => {
  const key = buildShotKey(shot);
  const knownPicture = pictures.get(key);
  if (knownPicture !== undefined) {
    return knownPicture;
  }
  const picture = lastPicture.then(() => photographShot(shot));
  lastPicture = picture;
  pictures.set(key, picture);
  void picture.then((url) => {
    takenPictures.set(key, { url });
  });
  if (pictures.size > mostPicturesKept) {
    forgetOldestPicture();
  }
  return picture;
};

/**
 * A Character's portrait: the whole Character, without a wand, pet,
 * mount or show-off, framed on their head and hat.
 */
export const buildPortraitShot = (loadout: CharacterLoadout): ItemShot => {
  const look = buildCharacterLook(listWithoutShowingOff(loadout));
  return {
    subject: "character",
    focusPartNames: ["head", "hat"],
    look: { ...look, wand: { model: "none", colour: look.wand.colour } },
  };
};

/** The picture of a shot once it's taken, from one shared studio. */
export const useItemPictureUrl = (
  shot: ItemShot | undefined,
): string | undefined => {
  const shotKey = shot === undefined ? undefined : buildShotKey(shot);
  const [shownUrl, setShownUrl] = useState(() =>
    shotKey === undefined ? undefined : takenPictures.get(shotKey)?.url,
  );

  useEffect(() => {
    if (shot === undefined) {
      return;
    }
    let isShown = true;
    void takeItemPicture(shot).then((url) => {
      if (isShown) {
        setShownUrl(url);
      }
    });
    return () => {
      isShown = false;
    };
  }, [shot]);

  const takenPicture =
    shotKey === undefined ? undefined : takenPictures.get(shotKey);
  return takenPicture === undefined ? shownUrl : takenPicture.url;
};

/**
 * The pictures of several shots, such as one Find from every side for
 * a turntable, taken one after another in the shared studio.
 */
export const usePictureUrls = (
  shots: readonly ItemShot[],
): (string | undefined)[] => {
  const [urls, setUrls] = useState<(string | undefined)[]>(() =>
    shots.map((shot) => takenPictures.get(buildShotKey(shot))?.url),
  );

  useEffect(() => {
    let isShown = true;
    shots.forEach((shot, index) => {
      void takeItemPicture(shot).then((url) => {
        if (isShown) {
          setUrls((taken) => {
            const next = [...taken];
            next[index] = url;
            return next;
          });
        }
      });
    });
    return () => {
      isShown = false;
    };
  }, [shots]);

  return urls;
};

export const ItemPicture = ({
  shot,
  colour,
}: {
  shot: ItemShot | undefined;
  colour?: string;
}) => {
  const pictureUrl = useItemPictureUrl(shot);
  return (
    <span className="wardrobe-item-picture">
      {shot === undefined || pictureUrl === undefined ? (
        <span
          className={colour === undefined ? "swatch own-gear" : "swatch"}
          style={colour === undefined ? undefined : { background: colour }}
        />
      ) : (
        <img
          src={pictureUrl}
          alt=""
          width={pictureSize}
          height={pictureSize}
          draggable={false}
        />
      )}
    </span>
  );
};
