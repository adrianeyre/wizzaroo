interface PlayTimeToday {
  localDate: string;
  seconds: number;
}

// Every second the game is showing, for the daily limit.
const playTimeStorageKey = "wizzaroo.family-device.play-time";
// Only the seconds spent in a Game, for a Parent's Games first.
const gameTimeStorageKey = "wizzaroo.family-device.game-time";

const isPlayTimeToday = (value: unknown): value is PlayTimeToday =>
  typeof value === "object" &&
  value !== null &&
  "localDate" in value &&
  typeof value.localDate === "string" &&
  "seconds" in value &&
  typeof value.seconds === "number";

const loadTimeByChild = (storageKey: string): Map<string, PlayTimeToday> => {
  const stored = localStorage.getItem(storageKey);
  const timeByChild: unknown = stored === null ? {} : JSON.parse(stored);
  if (typeof timeByChild !== "object" || timeByChild === null) {
    return new Map();
  }
  return new Map(
    Object.entries(timeByChild).filter(
      (entry): entry is [string, PlayTimeToday] => isPlayTimeToday(entry[1]),
    ),
  );
};

const findSecondsToday = (
  storageKey: string,
  childId: string,
  today: string,
): number => {
  const time = loadTimeByChild(storageKey).get(childId);
  return time?.localDate === today ? time.seconds : 0;
};

const addSecondsToday = (
  storageKey: string,
  childId: string,
  today: string,
  seconds: number,
): number => {
  const timeByChild = loadTimeByChild(storageKey);
  const secondsToday = findSecondsToday(storageKey, childId, today) + seconds;
  timeByChild.set(childId, { localDate: today, seconds: secondsToday });
  localStorage.setItem(
    storageKey,
    JSON.stringify(Object.fromEntries(timeByChild)),
  );
  return secondsToday;
};

export const findSecondsPlayedToday = (
  childId: string,
  today: string,
): number => findSecondsToday(playTimeStorageKey, childId, today);

export const addSecondsPlayedToday = (
  childId: string,
  today: string,
  seconds: number,
): number => addSecondsToday(playTimeStorageKey, childId, today, seconds);

/** The seconds a Child has spent in Games today on this device. */
export const findGameSecondsToday = (childId: string, today: string): number =>
  findSecondsToday(gameTimeStorageKey, childId, today);

export const addGameSecondsToday = (
  childId: string,
  today: string,
  seconds: number,
): number => addSecondsToday(gameTimeStorageKey, childId, today, seconds);
