import type { FurnitureSlot, Item } from "../../curriculum/catalogue.js";
import type { RoomSound } from "../game-sound.js";

export type RoomThing = FurnitureSlot | "pet";

type RoomPose = "standing" | "lying" | "sitting";

export interface RoomPlayState {
  pose: RoomPose;
  isPetHeld: boolean;
  isLampOn: boolean;
  isNight: boolean;
  pokes: Partial<Record<RoomThing, number>>;
  strokes: number;
}

export interface RoomPlayFacts {
  furniture: ReadonlyMap<FurnitureSlot, Item>;
  petName: string | undefined;
  trophyCount: number;
  time: Date;
}

export interface RoomPlayOutcome {
  state: RoomPlayState;
  message: string;
  sound: RoomSound | undefined;
}

export const startingRoomPlayState: RoomPlayState = {
  pose: "standing",
  isPetHeld: false,
  isLampOn: true,
  isNight: false,
  pokes: {},
  strokes: 0,
};

const blip = (
  pitches: readonly number[],
  seconds: number,
  wave: OscillatorType = "triangle",
): RoomSound => ({ pitches, seconds, wave });

const instrumentSounds: Partial<Record<string, RoomSound>> = {
  drum: blip([40, 40, 43, 40], 0.14, "square"),
  "drum-kit": blip([36, 43, 36, 48, 36, 43], 0.11, "square"),
  tambourine: blip([96, 98, 96, 98, 96], 0.06, "square"),
  xylophone: blip([72, 74, 76, 77, 79, 81, 83, 84], 0.09),
  trumpet: blip([67, 72, 76, 79, 76, 79], 0.13, "sawtooth"),
  guitar: blip([52, 57, 62, 67, 71, 76], 0.12, "sawtooth"),
  cello: blip([48, 55, 52, 48], 0.24, "sawtooth"),
  harp: blip([72, 76, 79, 84, 88, 91, 96], 0.07, "sine"),
  keyboard: blip([60, 64, 67, 72, 67, 64, 60], 0.1, "square"),
  piano: blip([60, 62, 64, 65, 67, 67, 69, 67], 0.14),
};

const thingSounds: Partial<Record<FurnitureSlot, RoomSound>> = {
  bed: blip([72, 67, 64, 60], 0.22, "sine"),
  rug: blip([60, 67, 72], 0.08, "square"),
  wallpaper: blip([45, 45], 0.1, "square"),
  shelf: blip([88, 95, 88, 95], 0.05, "square"),
  lamp: blip([96], 0.04, "square"),
  window: blip([72, 79], 0.15, "sine"),
  plant: blip([67, 72, 76], 0.1),
  desk: blip([76, 74, 72], 0.08),
  seat: blip([64, 60], 0.12, "sine"),
  toyBox: blip([72, 76, 79, 84], 0.08, "square"),
  clock: blip([84, 79, 84, 79], 0.12, "square"),
  fishTank: blip([79, 84, 88], 0.08, "sine"),
  softToy: blip([76, 79, 84], 0.1, "sine"),
};

const petSounds = {
  pickUp: blip([67, 72, 79], 0.08),
  putDown: blip([79, 72, 67], 0.08),
  stroke: blip([55, 57, 55, 57], 0.12, "sine"),
};

const findThingSound = (
  slot: FurnitureSlot,
  item: Item | undefined,
): RoomSound | undefined =>
  slot === "instrument"
    ? instrumentSounds[item?.model ?? ""]
    : thingSounds[slot];

const describeTrophyShine = (trophyCount: number): string =>
  trophyCount === 1
    ? "You polish your Trophy. It sparkles!"
    : `You polish your ${String(trophyCount)} Trophies. They sparkle!`;

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const findItemName = (facts: RoomPlayFacts, slot: FurnitureSlot): string =>
  facts.furniture.get(slot)?.name ?? "furniture";

export const describeRoomAction = (
  thing: RoomThing,
  state: RoomPlayState,
  facts: RoomPlayFacts,
): string => {
  if (thing === "pet") {
    const petName = facts.petName ?? "your Pet";
    return state.isPetHeld
      ? `Put your ${petName} down`
      : `Pick up your ${petName}`;
  }
  const name = findItemName(facts, thing);
  switch (thing) {
    case "bed":
      return state.pose === "lying" ? "Get up" : `Lie down on the ${name}`;
    case "seat":
      return state.pose === "sitting" ? "Stand up" : `Sit on the ${name}`;
    case "rug":
      return `Jump on the ${name}`;
    case "wallpaper":
      return "Knock on the wall";
    case "wallPicture":
      return `Look at the ${name}`;
    case "shelf":
      return facts.trophyCount > 0
        ? "Polish your Trophies"
        : `Dust the ${name}`;
    case "lamp":
      return state.isLampOn ? `Turn off the ${name}` : `Turn on the ${name}`;
    case "window":
      return `Look out of the ${name}`;
    case "plant":
      return `Water the ${name}`;
    case "desk":
      return `Draw at the ${name}`;
    case "toyBox":
      return `Open the ${name}`;
    case "clock":
      return `Check the ${name}`;
    case "fishTank":
      return "Feed the fish";
    case "softToy":
      return `Hug the ${name}`;
    case "instrument":
      return `Play the ${name}`;
  }
};

const pokeThing = (state: RoomPlayState, thing: RoomThing): RoomPlayState => ({
  ...state,
  pokes: { ...state.pokes, [thing]: (state.pokes[thing] ?? 0) + 1 },
});

const describeFurnitureReaction = (
  slot: FurnitureSlot,
  state: RoomPlayState,
  facts: RoomPlayFacts,
): string => {
  const name = findItemName(facts, slot);
  switch (slot) {
    case "bed":
      return state.pose === "lying"
        ? `Ahh, comfy! You snuggle down on the ${name}. Zzz…`
        : "Good morning! You hop out of bed.";
    case "seat":
      return state.pose === "sitting"
        ? `You sit on the ${name}. So comfy!`
        : "You stand up and stretch.";
    case "rug":
      return `Boing! You jump on the ${name}.`;
    case "wallpaper":
      return `Knock knock! Who's there? It's your ${name}.`;
    case "wallPicture":
      return `What a lovely ${name}!`;
    case "shelf":
      return facts.trophyCount > 0
        ? describeTrophyShine(facts.trophyCount)
        : `You dust the ${name}. Earn Trophies to fill it up!`;
    case "lamp":
      return state.isLampOn
        ? `Click! The ${name} is on.`
        : `Click! The ${name} is off.`;
    case "window":
      return state.isNight
        ? `You look out of the ${name}. It's night time. Look at the stars!`
        : `You look out of the ${name}. Good morning, sunshine!`;
    case "plant":
      return `Glug glug! The ${name} loves a drink of water.`;
    case "desk":
      return `You draw a picture at the ${name}. Beautiful!`;
    case "toyBox":
      return `You open the ${name}. Toys everywhere!`;
    case "clock":
      return `Tick tock! The ${name} says it's ${timeFormat.format(facts.time)}.`;
    case "fishTank":
      return `You feed the fish in the ${name}. Blub blub!`;
    case "softToy":
      return `You give your ${name} a big hug!`;
    case "instrument":
      return `You play the ${name}. What a lovely tune!`;
  }
};

const changeFurnitureState = (
  slot: FurnitureSlot,
  state: RoomPlayState,
): RoomPlayState => {
  switch (slot) {
    case "bed":
      return { ...state, pose: state.pose === "lying" ? "standing" : "lying" };
    case "seat":
      return {
        ...state,
        pose: state.pose === "sitting" ? "standing" : "sitting",
      };
    case "lamp":
      return { ...state, isLampOn: !state.isLampOn };
    case "window":
      return { ...state, isNight: !state.isNight };
    default:
      return { ...state, pose: "standing" };
  }
};

export const playWithRoomThing = (
  thing: RoomThing,
  state: RoomPlayState,
  facts: RoomPlayFacts,
): RoomPlayOutcome => {
  if (thing === "pet") {
    const petName = facts.petName ?? "Pet";
    const isPetHeld = !state.isPetHeld;
    return {
      state: pokeThing({ ...state, isPetHeld }, "pet"),
      message: isPetHeld
        ? `You pick up your ${petName}. Hello! Stroke it to say you love it.`
        : `You put your ${petName} down gently.`,
      sound: isPetHeld ? petSounds.pickUp : petSounds.putDown,
    };
  }
  const changed = pokeThing(changeFurnitureState(thing, state), thing);
  return {
    state: changed,
    message: describeFurnitureReaction(thing, changed, facts),
    sound: findThingSound(thing, facts.furniture.get(thing)),
  };
};

export const strokeRoomPet = (
  state: RoomPlayState,
  facts: RoomPlayFacts,
): RoomPlayOutcome => {
  const petName = facts.petName ?? "Pet";
  return {
    state: { ...state, strokes: state.strokes + 1 },
    message: `You stroke your ${petName}. It wriggles happily. It loves you!`,
    sound: petSounds.stroke,
  };
};

export const getUpInRoom = (state: RoomPlayState): RoomPlayState =>
  state.pose === "standing" ? state : { ...state, pose: "standing" };
