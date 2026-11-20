import { isRoomLoadout } from "../../curriculum/catalogue.js";
import { isLocalDate } from "../../curriculum/mastery.js";
import type { PlayRecord } from "../../curriculum/rewards.js";
import { isCharacterLoadout } from "./playable-family.js";

interface UnsyncedPlay {
  playEventId: string;
  playRecord: PlayRecord;
}

const unsyncedPlayStorageKey = "wizzaroo.family-device.unsynced-play";

const isGamePlace = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  "islandId" in value &&
  typeof value.islandId === "string" &&
  "regionId" in value &&
  typeof value.regionId === "string" &&
  "gameId" in value &&
  typeof value.gameId === "string";

const isPlayRecord = (value: unknown): value is PlayRecord => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("childId" in value) ||
    typeof value.childId !== "string" ||
    !("kind" in value)
  ) {
    return false;
  }
  if (value.kind === "character-dressed") {
    return "loadout" in value && isCharacterLoadout(value.loadout);
  }
  if (value.kind === "outfit-saved") {
    return (
      "outfitId" in value &&
      typeof value.outfitId === "string" &&
      "name" in value &&
      typeof value.name === "string" &&
      "loadout" in value &&
      isCharacterLoadout(value.loadout)
    );
  }
  if (value.kind === "room-furnished") {
    return "room" in value && isRoomLoadout(value.room);
  }
  if (value.kind === "outfit-worn") {
    return "outfitId" in value && typeof value.outfitId === "string";
  }
  if (value.kind === "quest-find-picked-up") {
    return (
      "islandId" in value &&
      typeof value.islandId === "string" &&
      "findId" in value &&
      typeof value.findId === "string"
    );
  }
  if (value.kind === "quest-puzzle-solved") {
    return (
      "islandId" in value &&
      typeof value.islandId === "string" &&
      "puzzleId" in value &&
      typeof value.puzzleId === "string"
    );
  }
  if (!("localDate" in value) || !isLocalDate(value.localDate)) {
    return false;
  }
  if (value.kind === "item-bought") {
    return (
      "itemId" in value &&
      typeof value.itemId === "string" &&
      "giftForChildId" in value &&
      (value.giftForChildId === null ||
        typeof value.giftForChildId === "string")
    );
  }
  if (
    !("skillId" in value) ||
    typeof value.skillId !== "string" ||
    ("place" in value && value.place !== undefined && !isGamePlace(value.place))
  ) {
    return false;
  }
  if (value.kind === "question-answered") {
    return (
      "isRightFirstTime" in value && typeof value.isRightFirstTime === "boolean"
    );
  }
  return (
    value.kind === "activity-finished" &&
    "secondsSpent" in value &&
    typeof value.secondsSpent === "number"
  );
};

const isUnsyncedPlay = (value: unknown): value is UnsyncedPlay =>
  typeof value === "object" &&
  value !== null &&
  "playEventId" in value &&
  typeof value.playEventId === "string" &&
  "playRecord" in value &&
  isPlayRecord(value.playRecord);

const loadUnsyncedPlay = (): UnsyncedPlay[] => {
  const stored = localStorage.getItem(unsyncedPlayStorageKey);
  const unsyncedPlay: unknown = stored === null ? [] : JSON.parse(stored);
  return Array.isArray(unsyncedPlay) ? unsyncedPlay.filter(isUnsyncedPlay) : [];
};

const storeUnsyncedPlay = (unsyncedPlay: UnsyncedPlay[]) => {
  localStorage.setItem(unsyncedPlayStorageKey, JSON.stringify(unsyncedPlay));
};

export const appendUnsyncedPlay = (unsyncedPlay: UnsyncedPlay): void => {
  storeUnsyncedPlay([...loadUnsyncedPlay(), unsyncedPlay]);
};

export const listUnsyncedPlayRecords = (): PlayRecord[] =>
  loadUnsyncedPlay().map(({ playRecord }) => playRecord);

/** A signed-out device's play will never be taken, so it goes with the outbox (#283). */
export const deleteUnsyncedPlay = (): void => {
  localStorage.removeItem(unsyncedPlayStorageKey);
};

/** Play whose event the outbox gave a new id, because the server said its id was taken, follows it (#326). */
export const renameUnsyncedPlayEvents = (
  renamedPlayEventIds: ReadonlyMap<string, string>,
): void => {
  if (renamedPlayEventIds.size === 0) {
    return;
  }
  storeUnsyncedPlay(
    loadUnsyncedPlay().map((unsyncedPlay) => ({
      ...unsyncedPlay,
      playEventId:
        renamedPlayEventIds.get(unsyncedPlay.playEventId) ??
        unsyncedPlay.playEventId,
    })),
  );
};

export const keepPlayStillWaitingIn = (
  waitingPlayEventIds: ReadonlySet<string>,
): void => {
  storeUnsyncedPlay(
    loadUnsyncedPlay().filter(({ playEventId }) =>
      waitingPlayEventIds.has(playEventId),
    ),
  );
};
