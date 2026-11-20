import { describe, expect, it } from "vitest";
import { yearGroups, type YearGroup } from "../../curriculum/skills.js";
import { formatTwentyFourHour } from "../../curriculum/telling-the-time.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildClockPairs,
  dealClockCards,
  dealClockPairs,
  describeCardFace,
  describeClockHands,
  findMinuteOfDay,
  findPartner,
  formatDigital,
  formatLongDuration,
  formatTwelveHour,
  isWrongTry,
  pairCountByYear,
  type CardFace,
  type ClockPair,
} from "./clock-pairs.js";

const keyStageOneYears: YearGroup[] = [1, 2];

const seeds = Array.from({ length: 60 }, (_, index) => index + 1);

const parseTwelveHour = (text: string): number => {
  const match = /^(\d{1,2}):(\d{2}) (am|pm)$/.exec(text);
  if (match === null) {
    throw new Error(`${text} isn't a 12-hour time`);
  }
  const [, hour, minutes, partOfDay] = match;
  return findMinuteOfDay(
    { hour: Number(hour), minutes: Number(minutes) },
    partOfDay === "pm" ? "pm" : "am",
  );
};

const parseTwentyFourHour = (text: string): number => {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (match === null) {
    throw new Error(`${text} isn't a 24-hour time`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

const parseAnyTime = (text: string): number =>
  text.endsWith("m") ? parseTwelveHour(text) : parseTwentyFourHour(text);

const parseDuration = (text: string): number => {
  const hours = /(\d+) hours?/.exec(text);
  const minutes = /(\d+) minutes?/.exec(text);
  return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
};

// Works out each card's value from what it shows, independently of the key
// the deal stored, so the tests prove the content is right.
const readFaceValue = (face: CardFace): number => {
  switch (face.kind) {
    case "clock": {
      const minuteOfDay = findMinuteOfDay(face.time, face.partOfDay ?? "am");
      return minuteOfDay + (face.minutesLater ?? 0);
    }
    case "words":
      return Number.NaN;
    case "digital":
      return parseAnyTime(face.text);
    case "later":
      return parseTwelveHour(face.start) + face.minutesLater;
    case "span":
      return parseAnyTime(face.to) - parseAnyTime(face.from);
    case "duration":
      return parseDuration(face.text);
  }
};

const dealFor = (yearGroup: YearGroup, seed: number) =>
  buildClockPairs(yearGroup, buildRandom(seed));

const listFaces = (pairs: readonly ClockPair[]) =>
  pairs.flatMap(({ faces }) => faces);

describe("buildClockPairs", () => {
  it.each(yearGroups)(
    "gives Year %i the right number of pairs, all different, every card matching exactly one other",
    (yearGroup) => {
      for (const seed of seeds) {
        const pairs = dealFor(yearGroup, seed);
        expect(pairs).toHaveLength(pairCountByYear[yearGroup]);
        expect(new Set(pairs.map(({ key }) => key)).size).toBe(pairs.length);
        const labels = listFaces(pairs).map(describeCardFace);
        expect(new Set(labels).size).toBe(labels.length);
      }
    },
  );

  it("gives Year 1 o'clock and half past times on a clock, matched to words", () => {
    for (const seed of seeds) {
      const pairs = dealFor(1, seed);
      const words = pairs.map(({ faces }) => faces[1]);
      expect(
        words.filter(
          (face) => face.kind === "words" && face.text.endsWith("o'clock"),
        ),
      ).toHaveLength(3);
      for (const { key, faces } of pairs) {
        const [clock, wordFace] = faces;
        expect(clock.kind).toBe("clock");
        expect([0, 30]).toContain(key % 60);
        expect(readFaceValue(clock)).toBe(key);
        expect(wordFace.kind).toBe("words");
      }
    }
  });

  it("words Year 1 and Year 2 times the way the Ship's clock does", () => {
    const texts = seeds.flatMap((seed) =>
      keyStageOneYears.flatMap((year) =>
        dealFor(year, seed).map(({ faces }) =>
          faces[1].kind === "words" ? faces[1].text : "",
        ),
      ),
    );
    expect(texts).toContain("half past 3");
    expect(texts).toContain("7 o'clock");
    expect(texts.some((text) => /^quarter to \d+$/.test(text))).toBe(true);
    expect(texts.some((text) => /^quarter past \d+$/.test(text))).toBe(true);
    expect(texts.some((text) => /^20 past \d+$/.test(text))).toBe(true);
    expect(texts.some((text) => /^25 to \d+$/.test(text))).toBe(true);
  });

  it("gives Year 2 times in five-minute steps other than o'clock and half past", () => {
    for (const seed of seeds) {
      for (const { key, faces } of dealFor(2, seed)) {
        expect(key % 5).toBe(0);
        expect([0, 30]).not.toContain(key % 60);
        expect(readFaceValue(faces[0])).toBe(key);
      }
    }
  });

  it("gives Year 3 Roman numeral clocks to the minute, matched to a digital time", () => {
    for (const seed of seeds) {
      for (const { key, faces } of dealFor(3, seed)) {
        const [clock, digital] = faces;
        expect(clock.kind === "clock" && clock.dial).toBe("roman");
        expect(key % 5).not.toBe(0);
        expect(readFaceValue(clock)).toBe(key);
        expect(digital).toEqual({
          kind: "digital",
          text: clock.kind === "clock" ? formatDigital(clock.time) : "",
        });
        expect(digital.kind === "digital" && digital.text).toMatch(
          /^([1-9]|1[0-2]):[0-5]\d$/,
        );
      }
    }
  });

  it("matches each Year 4 12-hour time to its 24-hour time, mornings and afternoons", () => {
    for (const seed of seeds) {
      const pairs = dealFor(4, seed);
      expect(pairs.filter(({ key }) => key >= 720)).toHaveLength(4);
      for (const { key, faces } of pairs) {
        const [twelveHour, twentyFourHour] = faces;
        expect(readFaceValue(twelveHour)).toBe(key);
        expect(twentyFourHour).toEqual({
          kind: "digital",
          text: formatTwentyFourHour(key),
        });
      }
      expect(
        pairs.filter(({ faces }) => faces[0].kind === "clock"),
      ).toHaveLength(4);
    }
  });

  it("matches each Year 5 starting time and minutes later to the later time, with every time different", () => {
    for (const seed of seeds) {
      const pairs = dealFor(5, seed);
      const times = new Set<number>();
      for (const { key, faces } of pairs) {
        const [question, answer] = faces;
        expect(["later", "clock"]).toContain(question.kind);
        expect(readFaceValue(question)).toBe(key);
        expect(readFaceValue(answer)).toBe(key);
        times.add(key);
        times.add(
          question.kind === "later"
            ? parseTwelveHour(question.start)
            : question.kind === "clock"
              ? findMinuteOfDay(question.time, question.partOfDay ?? "am")
              : Number.NaN,
        );
      }
      expect(times.size).toBe(pairs.length * 2);
    }
  });

  it("matches each Year 6 span of time to how long it lasts", () => {
    for (const seed of seeds) {
      for (const { key, faces } of dealFor(6, seed)) {
        const [span, duration] = faces;
        expect(span.kind).toBe("span");
        expect(readFaceValue(span)).toBe(key);
        expect(readFaceValue(duration)).toBe(key);
      }
    }
  });
});

describe("dealClockCards", () => {
  it.each(yearGroups)(
    "lays out both cards of every Year %i pair",
    (yearGroup) => {
      for (const seed of seeds.slice(0, 15)) {
        const cards = dealClockPairs(yearGroup, buildRandom(seed));
        expect(cards).toHaveLength(pairCountByYear[yearGroup] * 2);
        expect(cards.map(({ id }) => id)).toEqual(
          cards.map((_, index) => index),
        );
        for (const card of cards) {
          const partners = cards.filter(
            (other) => other.id !== card.id && other.pairKey === card.pairKey,
          );
          expect(partners).toHaveLength(1);
          expect(findPartner(cards, card)).toBe(partners[0]);
        }
      }
    },
  );

  it("shuffles the cards differently each play", () => {
    const pairs = dealFor(3, 4);
    const first = dealClockCards(pairs, buildRandom(1)).map(
      ({ pairKey }) => pairKey,
    );
    const second = dealClockCards(pairs, buildRandom(2)).map(
      ({ pairKey }) => pairKey,
    );
    expect(first).not.toEqual(second);
  });
});

describe("isWrongTry", () => {
  const cards = dealClockPairs(1, buildRandom(3));
  const [first] = cards;
  const partner = findPartner(cards, first);
  const others = cards.filter(({ pairKey }) => pairKey !== first.pairKey);
  const [stranger] = others;

  it("never counts a match", () => {
    if (partner === undefined) {
      throw new Error("no partner");
    }
    expect(isWrongTry(cards, first, partner, new Set([partner.id]))).toBe(
      false,
    );
  });

  it("doesn't count two cards nobody has seen yet", () => {
    expect(isWrongTry(cards, first, stranger, new Set())).toBe(false);
    expect(isWrongTry(cards, first, stranger, new Set([first.id]))).toBe(false);
  });

  it("counts picking a card already seen that isn't the match", () => {
    expect(isWrongTry(cards, first, stranger, new Set([stranger.id]))).toBe(
      true,
    );
  });

  it("counts missing a partner the Child has already seen", () => {
    if (partner === undefined) {
      throw new Error("no partner");
    }
    expect(isWrongTry(cards, first, stranger, new Set([partner.id]))).toBe(
      true,
    );
  });
});

describe("describing cards", () => {
  it("says where the hands point, not the time", () => {
    expect(describeClockHands({ hour: 3, minutes: 30 }, "arabic")).toBe(
      "the short hour hand is halfway between 3 and 4, the long minute hand is pointing at 6",
    );
    expect(describeClockHands({ hour: 12, minutes: 0 }, "arabic")).toBe(
      "the short hour hand is pointing at 12, the long minute hand is pointing at 12",
    );
    expect(describeClockHands({ hour: 4, minutes: 37 }, "roman")).toBe(
      "the short hour hand is between IV and V, the long minute hand is 2 minutes past VII",
    );
    expect(describeClockHands({ hour: 11, minutes: 1 }, "roman")).toBe(
      "the short hour hand is between XI and XII, the long minute hand is 1 minute past XII",
    );
  });

  it("reads out every kind of card", () => {
    expect(
      describeCardFace({
        kind: "clock",
        time: { hour: 2, minutes: 35 },
        dial: "arabic",
        partOfDay: "pm",
        minutesLater: 40,
      }),
    ).toBe(
      "a clock marked pm: the short hour hand is between 2 and 3, the long minute hand is pointing at 7. Add 40 minutes",
    );
    expect(
      describeCardFace({ kind: "later", start: "2:35 pm", minutesLater: 40 }),
    ).toBe("40 minutes after 2:35 pm");
    expect(
      describeCardFace({ kind: "span", from: "2:45 pm", to: "4:10 pm" }),
    ).toBe("from 2:45 pm to 4:10 pm");
  });

  it("writes times and lengths of time in full", () => {
    expect(formatTwelveHour(15 * 60 + 45)).toBe("3:45 pm");
    expect(formatTwelveHour(5)).toBe("12:05 am");
    expect(formatTwelveHour(12 * 60 + 5)).toBe("12:05 pm");
    expect(formatLongDuration(85)).toBe("1 hour 25 minutes");
    expect(formatLongDuration(45)).toBe("45 minutes");
    expect(formatLongDuration(120)).toBe("2 hours");
    expect(formatLongDuration(65)).toBe("1 hour 5 minutes");
  });
});
