import { listWholeNumbers } from "./counting-to-20.js";

export const tellingTheTimeDifficulties = [1, 2, 3] as const;
export type TellingTheTimeDifficulty =
  (typeof tellingTheTimeDifficulties)[number];

export type ClockYear = 1 | 2;

export interface ClockTime {
  hour: number;
  minutes: number;
}

const hoursOnTheClock = 12;
const minutesInAnHour = 60;
const halfHour = 30;

const minutesByYear: Record<
  ClockYear,
  Record<TellingTheTimeDifficulty, readonly number[]>
> = {
  1: { 1: [0], 2: [30], 3: [0, 30] },
  2: { 1: [15, 45], 2: [5, 10, 20, 25], 3: [35, 40, 50, 55] },
};

export const buildTellingTheTimeQuestions = (
  year: ClockYear,
  difficulty: TellingTheTimeDifficulty,
): ClockTime[] =>
  minutesByYear[year][difficulty].flatMap((minutes) =>
    listWholeNumbers(1, hoursOnTheClock).map((hour) => ({ hour, minutes })),
  );

const moveHour = (hour: number, by: number) =>
  ((hour - 1 + by + hoursOnTheClock) % hoursOnTheClock) + 1;

const describeMinutesPast = (minutes: number) => {
  if (minutes === 15) {
    return "quarter";
  }
  return minutes % 5 === 0
    ? String(minutes)
    : `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;
};

export const describeClockTime = ({ hour, minutes }: ClockTime): string => {
  if (minutes === 0) {
    return `${String(hour)} o'clock`;
  }
  if (minutes === halfHour) {
    return `half past ${String(hour)}`;
  }
  if (minutes < halfHour) {
    return `${describeMinutesPast(minutes)} past ${String(hour)}`;
  }
  return `${describeMinutesPast(minutesInAnHour - minutes)} to ${String(moveHour(hour, 1))}`;
};

const mirrorMinutes = (minutes: number) =>
  minutes === 0 || minutes === halfHour
    ? halfHour - minutes
    : minutesInAnHour - minutes;

export const listClockTimeSlips = ({
  hour,
  minutes,
}: ClockTime): ClockTime[] => [
  { hour, minutes: mirrorMinutes(minutes) },
  { hour: moveHour(hour, 1), minutes },
  {
    hour: moveHour(hour, minutes >= halfHour ? 1 : -1),
    minutes: mirrorMinutes(minutes),
  },
  { hour: moveHour(hour, -1), minutes },
];

export type ClockDial = "arabic" | "roman";

export type ClockAsk =
  | { kind: "read" }
  | { kind: "twenty-four-hour"; isAfternoon: boolean }
  | { kind: "later"; minutesLater: number; isAfternoon: boolean }
  | { kind: "until"; untilTime: string; isAfternoon: boolean };

export interface ClockQuestion {
  time: ClockTime;
  dial: ClockDial;
  ask: ClockAsk;
  answer: string;
  slips: string[];
}

export type ClockQuestionYear = 1 | 2 | 3 | 4 | 5 | 6;

const minutesInADay = 24 * minutesInAnHour;

const findMinuteOfDay = ({ hour, minutes }: ClockTime, isAfternoon: boolean) =>
  ((hour % hoursOnTheClock) + (isAfternoon ? hoursOnTheClock : 0)) *
    minutesInAnHour +
  minutes;

export const formatTwentyFourHour = (minuteOfDay: number): string => {
  const wrapped =
    ((minuteOfDay % minutesInADay) + minutesInADay) % minutesInADay;
  const hours = Math.floor(wrapped / minutesInAnHour);
  const minutes = wrapped % minutesInAnHour;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const formatDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / minutesInAnHour);
  const minutes = totalMinutes % minutesInAnHour;
  if (hours === 0) {
    return `${String(minutes)} min`;
  }
  return minutes === 0
    ? `${String(hours)} h`
    : `${String(hours)} h ${String(minutes)} min`;
};

const keepDistinct = (answer: string, slips: readonly string[]) =>
  slips.filter(
    (slip, position) => slip !== answer && slips.indexOf(slip) === position,
  );

const buildReadQuestion = (time: ClockTime, dial: ClockDial): ClockQuestion => {
  const answer = describeClockTime(time);
  return {
    time,
    dial,
    ask: { kind: "read" },
    answer,
    slips: keepDistinct(
      answer,
      listClockTimeSlips(time).map(describeClockTime),
    ),
  };
};

const listMinutes = (
  smallest: number,
  largest: number,
  isFiveMinute: boolean,
) =>
  listWholeNumbers(smallest, largest).filter(
    (minutes) => (minutes % 5 === 0) === isFiveMinute,
  );

const spreadHours = (minutesList: readonly number[]): ClockTime[] =>
  minutesList.map((minutes, index) => ({
    hour: ((index * 5) % hoursOnTheClock) + 1,
    minutes,
  }));

const buildTwentyFourHourQuestion = (
  time: ClockTime,
  isAfternoon: boolean,
): ClockQuestion => {
  const minuteOfDay = findMinuteOfDay(time, isAfternoon);
  const answer = formatTwentyFourHour(minuteOfDay);
  return {
    time,
    dial: "arabic",
    ask: { kind: "twenty-four-hour", isAfternoon },
    answer,
    slips: keepDistinct(answer, [
      formatTwentyFourHour(
        minuteOfDay + (isAfternoon ? -12 : 12) * minutesInAnHour,
      ),
      formatTwentyFourHour(minuteOfDay + minutesInAnHour),
      formatTwentyFourHour(
        findMinuteOfDay(
          { hour: time.hour, minutes: mirrorMinutes(time.minutes) },
          isAfternoon,
        ),
      ),
      formatTwentyFourHour(minuteOfDay - minutesInAnHour),
    ]),
  };
};

const buildLaterQuestion = (
  time: ClockTime,
  minutesLater: number,
  isAfternoon: boolean,
): ClockQuestion => {
  const minuteOfDay = findMinuteOfDay(time, isAfternoon);
  const answer = formatTwentyFourHour(minuteOfDay + minutesLater);
  const hourOfDay = Math.floor(minuteOfDay / minutesInAnHour);
  return {
    time,
    dial: "arabic",
    ask: { kind: "later", minutesLater, isAfternoon },
    answer,
    slips: keepDistinct(answer, [
      formatTwentyFourHour(
        hourOfDay * minutesInAnHour +
          ((time.minutes + minutesLater) % minutesInAnHour),
      ),
      formatTwentyFourHour(minuteOfDay + minutesLater + 5),
      formatTwentyFourHour(minuteOfDay + minutesLater - 5),
      formatTwentyFourHour(minuteOfDay + minutesLater + minutesInAnHour),
    ]),
  };
};

const buildUntilQuestion = (
  time: ClockTime,
  minutesUntil: number,
  isAfternoon: boolean,
): ClockQuestion => {
  const minuteOfDay = findMinuteOfDay(time, isAfternoon);
  const answer = formatDuration(minutesUntil);
  return {
    time,
    dial: "arabic",
    ask: {
      kind: "until",
      untilTime: formatTwentyFourHour(minuteOfDay + minutesUntil),
      isAfternoon,
    },
    answer,
    slips: keepDistinct(answer, [
      formatDuration(minutesUntil + 10),
      formatDuration(Math.max(5, minutesUntil - 10)),
      formatDuration(minutesUntil + minutesInAnHour),
      formatDuration(minutesUntil + 40),
      formatDuration(minutesUntil + 5),
    ]),
  };
};

const laterMinutes = [15, 20, 25, 35, 40, 45, 50, 70, 90, 105];
const untilMinutes = [25, 40, 55, 75, 85, 95, 110, 125, 140, 165];

export const buildClockQuestions = (
  year: ClockQuestionYear,
  difficulty: TellingTheTimeDifficulty,
): ClockQuestion[] => {
  if (year === 1 || year === 2) {
    return buildTellingTheTimeQuestions(year, difficulty).map((time) =>
      buildReadQuestion(time, "arabic"),
    );
  }
  if (year === 3) {
    const minutesList = {
      1: [5, 10, 20, 25, 35, 40, 50, 55],
      2: listMinutes(1, 29, false),
      3: listMinutes(31, 59, false),
    }[difficulty];
    return spreadHours(minutesList).map((time) =>
      buildReadQuestion(time, "roman"),
    );
  }
  if (year === 4) {
    const minutesList = {
      1: [0, 30, 0, 30, 0, 30],
      2: [15, 45, 15, 45, 15, 45],
      3: [5, 10, 20, 25, 35, 40, 50, 55],
    }[difficulty];
    return spreadHours(minutesList).map((time, index) =>
      buildTwentyFourHourQuestion(time, difficulty === 1 || index % 2 === 0),
    );
  }
  const minutesList = {
    1: [0, 15, 30, 45, 0, 30],
    2: [5, 20, 35, 50, 10, 25],
    3: [10, 25, 40, 55, 5, 50],
  }[difficulty];
  const times = spreadHours(minutesList);
  return times.map((time, index) => {
    const offsets = year === 5 ? laterMinutes : untilMinutes;
    const minutes = offsets[(index + difficulty * 3) % offsets.length];
    const isAfternoon = index % 2 === 1;
    return year === 5
      ? buildLaterQuestion(time, minutes, isAfternoon)
      : buildUntilQuestion(time, minutes, isAfternoon);
  });
};
