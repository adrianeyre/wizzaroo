import {
  isRoomLoadout,
  type CharacterLoadout,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { Trophy } from "../../curriculum/rewards.js";
import { isCharacterLoadout } from "./playable-family.js";

export interface ClassmateRoom {
  loadout: CharacterLoadout;
  room: RoomLoadout;
  trophies: Trophy[];
}

const isTrophy = (value: unknown): value is Trophy =>
  typeof value === "object" &&
  value !== null &&
  "islandId" in value &&
  typeof value.islandId === "string" &&
  "regionId" in value &&
  typeof value.regionId === "string";

const isClassmateRoom = (value: unknown): value is ClassmateRoom =>
  typeof value === "object" &&
  value !== null &&
  "loadout" in value &&
  isCharacterLoadout(value.loadout) &&
  "room" in value &&
  isRoomLoadout(value.room) &&
  "trophies" in value &&
  Array.isArray(value.trophies) &&
  value.trophies.every(isTrophy);

const isClassmateRoomList = (
  value: unknown,
): value is {
  classmateRooms: ClassmateRoom[];
} =>
  typeof value === "object" &&
  value !== null &&
  "classmateRooms" in value &&
  Array.isArray(value.classmateRooms) &&
  value.classmateRooms.every(isClassmateRoom);

export const buildClassmateRoomsPath = (childId: string): string =>
  `/api/play/children/${childId}/classmate-rooms`;

export const fetchClassmateRooms = async (
  childId: string,
): Promise<ClassmateRoom[] | undefined> => {
  const response = await fetch(buildClassmateRoomsPath(childId), {
    cache: "no-store",
  }).catch(() => undefined);
  if (response?.ok !== true) {
    return undefined;
  }
  const answer: unknown = await response.json().catch(() => undefined);
  return isClassmateRoomList(answer) ? answer.classmateRooms : undefined;
};
