interface PlayTimeToday {
  localDate: string;
  seconds: number;
}

const playTimeStorageKey = "wizzaroo.family-device.play-time";

const isPlayTimeToday = (value: unknown): value is PlayTimeToday =>
  typeof value === "object" &&
  value !== null &&
  "localDate" in value &&
  typeof value.localDate === "string" &&
  "seconds" in value &&
  typeof value.seconds === "number";

const loadPlayTimeByChild = (): Map<string, PlayTimeToday> => {
  const stored = localStorage.getItem(playTimeStorageKey);
  const playTimeByChild: unknown = stored === null ? {} : JSON.parse(stored);
  if (typeof playTimeByChild !== "object" || playTimeByChild === null) {
    return new Map();
  }
  return new Map(
    Object.entries(playTimeByChild).filter(
      (entry): entry is [string, PlayTimeToday] => isPlayTimeToday(entry[1]),
    ),
  );
};

export const findSecondsPlayedToday = (
  childId: string,
  today: string,
): number => {
  const playTime = loadPlayTimeByChild().get(childId);
  return playTime?.localDate === today ? playTime.seconds : 0;
};

export const addSecondsPlayedToday = (
  childId: string,
  today: string,
  seconds: number,
): number => {
  const playTimeByChild = loadPlayTimeByChild();
  const secondsPlayed = findSecondsPlayedToday(childId, today) + seconds;
  playTimeByChild.set(childId, { localDate: today, seconds: secondsPlayed });
  localStorage.setItem(
    playTimeStorageKey,
    JSON.stringify(Object.fromEntries(playTimeByChild)),
  );
  return secondsPlayed;
};
