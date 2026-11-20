import type { YearGroup } from "../../curriculum/skills.js";
import {
  describeClockTime,
  formatTwentyFourHour,
  type ClockDial,
  type ClockTime,
} from "../../curriculum/telling-the-time.js";
import { pickWholeNumber, shuffle } from "./shuffle.js";

// Clock pairs is a memory game: every card is face down, and the Child turns
// two at a time to find a pair that show the same time (or, in Years 5 and 6,
// a sum about time and its answer). Each pair found is one Question.

export type PartOfDay = "am" | "pm";

export type CardFace =
  | {
      kind: "clock";
      time: ClockTime;
      dial: ClockDial;
      partOfDay?: PartOfDay;
      minutesLater?: number;
    }
  | { kind: "words"; text: string }
  | { kind: "digital"; text: string }
  | { kind: "later"; start: string; minutesLater: number }
  | { kind: "span"; from: string; to: string }
  | { kind: "duration"; text: string };

export interface ClockPair {
  // The value both cards share: a minute of the day, or a length of time.
  key: number;
  faces: [CardFace, CardFace];
}

export interface ClockCard {
  id: number;
  pairKey: number;
  face: CardFace;
}

const minutesInAnHour = 60;
const hoursOnTheClock = 12;
const minutesInHalfADay = hoursOnTheClock * minutesInAnHour;

export const pairCountByYear: Record<YearGroup, number> = {
  1: 6,
  2: 6,
  3: 8,
  4: 8,
  5: 8,
  6: 8,
};

export const boardColumns = 4;

export const romanNumerals = [
  "XII",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
] as const;

const listWholeNumbers = (smallest: number, largest: number): number[] =>
  Array.from(
    { length: largest - smallest + 1 },
    (_, index) => smallest + index,
  );

const hoursOfTheClock = listWholeNumbers(1, hoursOnTheClock);

export const findMinuteOfDay = (
  { hour, minutes }: ClockTime,
  partOfDay: PartOfDay,
): number =>
  ((hour % hoursOnTheClock) + (partOfDay === "pm" ? hoursOnTheClock : 0)) *
    minutesInAnHour +
  minutes;

export const readClockTime = (minuteOfDay: number): ClockTime => {
  const hourOfDay = Math.floor(minuteOfDay / minutesInAnHour);
  return {
    hour: hourOfDay % hoursOnTheClock || hoursOnTheClock,
    minutes: minuteOfDay % minutesInAnHour,
  };
};

export const readPartOfDay = (minuteOfDay: number): PartOfDay =>
  minuteOfDay < minutesInHalfADay ? "am" : "pm";

// "4:37", the way a digital clock without am or pm shows it.
export const formatDigital = ({ hour, minutes }: ClockTime): string =>
  `${String(hour)}:${String(minutes).padStart(2, "0")}`;

// "3:45 pm"
export const formatTwelveHour = (minuteOfDay: number): string =>
  `${formatDigital(readClockTime(minuteOfDay))} ${readPartOfDay(minuteOfDay)}`;

const plural = (count: number, unit: string) =>
  `${String(count)} ${unit}${count === 1 ? "" : "s"}`;

// "1 hour 25 minutes", "45 minutes", "2 hours"
export const formatLongDuration = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / minutesInAnHour);
  const minutes = totalMinutes % minutesInAnHour;
  if (hours === 0) {
    return plural(minutes, "minute");
  }
  return minutes === 0
    ? plural(hours, "hour")
    : `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
};

const describeNumeral = (hour: number, dial: ClockDial) =>
  dial === "roman"
    ? romanNumerals[hour % hoursOnTheClock]
    : String(hour % hoursOnTheClock || hoursOnTheClock);

// Describes where the hands point rather than saying the time, so a Child
// using a screen reader still reads the clock for themselves.
export const describeClockHands = (
  { hour, minutes }: ClockTime,
  dial: ClockDial,
): string => {
  const nextHour = (hour % hoursOnTheClock) + 1;
  const hourHand =
    minutes === 0
      ? `pointing at ${describeNumeral(hour, dial)}`
      : `${minutes === 30 ? "halfway " : ""}between ${describeNumeral(hour, dial)} and ${describeNumeral(nextHour, dial)}`;
  const markNumber = Math.floor(minutes / 5);
  const extraMinutes = minutes % 5;
  const minuteNumeral = describeNumeral(markNumber, dial);
  const minuteHand =
    extraMinutes === 0
      ? `pointing at ${minuteNumeral}`
      : `${plural(extraMinutes, "minute")} past ${minuteNumeral}`;
  return `the short hour hand is ${hourHand}, the long minute hand is ${minuteHand}`;
};

export const describeCardFace = (face: CardFace): string => {
  switch (face.kind) {
    case "clock": {
      const clock = `${face.dial === "roman" ? "a Roman numeral clock" : "a clock"}${face.partOfDay === undefined ? "" : ` marked ${face.partOfDay}`}: ${describeClockHands(face.time, face.dial)}`;
      return face.minutesLater === undefined
        ? clock
        : `${clock}. Add ${plural(face.minutesLater, "minute")}`;
    }
    case "words":
    case "digital":
    case "duration":
      return face.text;
    case "later":
      return `${plural(face.minutesLater, "minute")} after ${face.start}`;
    case "span":
      return `from ${face.from} to ${face.to}`;
  }
};

const listFiveMinuteSteps = (smallest: number, largest: number) =>
  listWholeNumbers(smallest / 5, largest / 5).map((step) => step * 5);

const zipTimes = (
  hours: readonly number[],
  minutesList: readonly number[],
): ClockTime[] =>
  minutesList.map((minutes, index) => ({ hour: hours[index], minutes }));

const buildYearOnePairs = (random: () => number): ClockPair[] => {
  const hours = shuffle(hoursOfTheClock, random);
  const oClocks = hours.slice(0, 3).map((hour) => ({ hour, minutes: 0 }));
  const halfPasts = hours.slice(3, 6).map((hour) => ({ hour, minutes: 30 }));
  return [...oClocks, ...halfPasts].map((time) => ({
    key: findMinuteOfDay(time, "am"),
    faces: [
      { kind: "clock", time, dial: "arabic" },
      { kind: "words", text: describeClockTime(time) },
    ],
  }));
};

const fiveMinuteSteps = [5, 10, 15, 20, 25, 35, 40, 45, 50, 55];

const buildYearTwoPairs = (random: () => number): ClockPair[] =>
  zipTimes(
    shuffle(hoursOfTheClock, random),
    shuffle(fiveMinuteSteps, random).slice(0, pairCountByYear[2]),
  ).map((time) => ({
    key: findMinuteOfDay(time, "am"),
    faces: [
      { kind: "clock", time, dial: "arabic" },
      { kind: "words", text: describeClockTime(time) },
    ],
  }));

const buildYearThreePairs = (random: () => number): ClockPair[] =>
  zipTimes(
    shuffle(hoursOfTheClock, random),
    shuffle(
      listWholeNumbers(1, 59).filter((minutes) => minutes % 5 !== 0),
      random,
    ).slice(0, pairCountByYear[3]),
  ).map((time) => ({
    key: findMinuteOfDay(time, "am"),
    faces: [
      { kind: "clock", time, dial: "roman" },
      { kind: "digital", text: formatDigital(time) },
    ],
  }));

const buildYearFourPairs = (random: () => number): ClockPair[] => {
  const count = pairCountByYear[4];
  const partsOfDay = shuffle(
    Array.from({ length: count }, (_, index): PartOfDay =>
      index % 2 === 0 ? "am" : "pm",
    ),
    random,
  );
  const minutesSteps = listFiveMinuteSteps(0, 55);
  return shuffle(hoursOfTheClock, random)
    .slice(0, count)
    .map((hour, index) => {
      const time = {
        hour,
        minutes: minutesSteps[pickWholeNumber(0, 11, random)],
      };
      const minuteOfDay = findMinuteOfDay(time, partsOfDay[index]);
      const twelveHour: CardFace =
        index % 2 === 0
          ? {
              kind: "clock",
              time,
              dial: "arabic",
              partOfDay: partsOfDay[index],
            }
          : { kind: "digital", text: formatTwelveHour(minuteOfDay) };
      return {
        key: minuteOfDay,
        faces: [
          twelveHour,
          { kind: "digital", text: formatTwentyFourHour(minuteOfDay) },
        ],
      };
    });
};

export const laterMinuteChoices = [
  15, 20, 25, 35, 40, 45, 50, 55, 65, 70, 80, 90, 105,
];

const earliestStart = 7 * minutesInAnHour;
const latestStart = 20 * minutesInAnHour;
const pickTries = 400;

const pickStartTime = (random: () => number) =>
  pickWholeNumber(earliestStart / 5, latestStart / 5, random) * 5;

const buildYearFivePairs = (random: () => number): ClockPair[] => {
  const pairs: ClockPair[] = [];
  const timesUsed = new Set<number>();
  for (
    let attempt = 0;
    attempt < pickTries && pairs.length < pairCountByYear[5];
    attempt++
  ) {
    const start = pickStartTime(random);
    const minutesLater =
      laterMinuteChoices[
        pickWholeNumber(0, laterMinuteChoices.length - 1, random)
      ];
    const end = start + minutesLater;
    if (timesUsed.has(start) || timesUsed.has(end)) {
      continue;
    }
    timesUsed.add(start);
    timesUsed.add(end);
    const question: CardFace =
      pairs.length % 2 === 0
        ? { kind: "later", start: formatTwelveHour(start), minutesLater }
        : {
            kind: "clock",
            time: readClockTime(start),
            dial: "arabic",
            partOfDay: readPartOfDay(start),
            minutesLater,
          };
    pairs.push({
      key: end,
      faces: [question, { kind: "digital", text: formatTwelveHour(end) }],
    });
  }
  return pairs;
};

export const durationChoices = listFiveMinuteSteps(20, 170);

const buildYearSixPairs = (random: () => number): ClockPair[] => {
  const pairs: ClockPair[] = [];
  const timesUsed = new Set<number>();
  const durations = shuffle(durationChoices, random).slice(
    0,
    pairCountByYear[6],
  );
  for (const duration of durations) {
    for (let attempt = 0; attempt < pickTries; attempt++) {
      const start = pickStartTime(random);
      const end = start + duration;
      if (timesUsed.has(start) || timesUsed.has(end)) {
        continue;
      }
      timesUsed.add(start);
      timesUsed.add(end);
      const format =
        pairs.length % 2 === 0 ? formatTwelveHour : formatTwentyFourHour;
      pairs.push({
        key: duration,
        faces: [
          { kind: "span", from: format(start), to: format(end) },
          { kind: "duration", text: formatLongDuration(duration) },
        ],
      });
      break;
    }
  }
  return pairs;
};

export const buildClockPairs = (
  yearGroup: YearGroup,
  random: () => number,
): ClockPair[] => {
  switch (yearGroup) {
    case 1:
      return buildYearOnePairs(random);
    case 2:
      return buildYearTwoPairs(random);
    case 3:
      return buildYearThreePairs(random);
    case 4:
      return buildYearFourPairs(random);
    case 5:
      return buildYearFivePairs(random);
    case 6:
      return buildYearSixPairs(random);
  }
};

export const dealClockCards = (
  pairs: readonly ClockPair[],
  random: () => number,
): ClockCard[] =>
  shuffle(
    pairs.flatMap(({ key, faces }) =>
      faces.map((face) => ({ pairKey: key, face })),
    ),
    random,
  ).map((card, id) => ({ id, ...card }));

export const dealClockPairs = (
  yearGroup: YearGroup,
  random: () => number,
): ClockCard[] => dealClockCards(buildClockPairs(yearGroup, random), random);

export const isClockPair = (first: ClockCard, second: ClockCard): boolean =>
  first.id !== second.id && first.pairKey === second.pairKey;

export const findPartner = (
  cards: readonly ClockCard[],
  card: ClockCard,
): ClockCard | undefined => cards.find((other) => isClockPair(card, other));

// A mismatch only counts as a wrong try when the Child could have known
// better: the second card had been seen before (so they chose a card they
// knew, and it wasn't the match), or the first card's partner had been seen
// before (so they could have remembered where it was). Turning over two
// cards nobody has seen yet is exploring, not a mistake.
export const isWrongTry = (
  cards: readonly ClockCard[],
  first: ClockCard,
  second: ClockCard,
  seenIds: ReadonlySet<number>,
): boolean => {
  if (isClockPair(first, second)) {
    return false;
  }
  const partner = findPartner(cards, first);
  return (
    seenIds.has(second.id) || (partner !== undefined && seenIds.has(partner.id))
  );
};
