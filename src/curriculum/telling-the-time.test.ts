import { describe, expect, it } from "vitest";
import {
  buildClockQuestions,
  buildTellingTheTimeQuestions,
  formatDuration,
  formatTwentyFourHour,
  describeClockTime,
  listClockTimeSlips,
} from "./telling-the-time.js";

describe("buildTellingTheTimeQuestions", () => {
  it("reads o'clock and half past in Year 1", () => {
    expect(
      buildTellingTheTimeQuestions(1, 1).every(({ minutes }) => minutes === 0),
    ).toBe(true);
    expect(
      buildTellingTheTimeQuestions(1, 2).every(({ minutes }) => minutes === 30),
    ).toBe(true);
    expect(buildTellingTheTimeQuestions(1, 3)).toHaveLength(24);
  });

  it("reads quarter past and to, then five minutes past and to, in Year 2", () => {
    expect(
      new Set(buildTellingTheTimeQuestions(2, 1).map(({ minutes }) => minutes)),
    ).toEqual(new Set([15, 45]));
    expect(
      buildTellingTheTimeQuestions(2, 2).every(
        ({ minutes }) => minutes % 5 === 0 && minutes < 30,
      ),
    ).toBe(true);
    expect(
      buildTellingTheTimeQuestions(2, 3).every(({ minutes }) => minutes > 30),
    ).toBe(true);
  });
});

describe("describeClockTime", () => {
  it("says the time the way a class does", () => {
    expect(describeClockTime({ hour: 3, minutes: 0 })).toBe("3 o'clock");
    expect(describeClockTime({ hour: 12, minutes: 30 })).toBe("half past 12");
    expect(describeClockTime({ hour: 3, minutes: 15 })).toBe("quarter past 3");
    expect(describeClockTime({ hour: 12, minutes: 45 })).toBe("quarter to 1");
    expect(describeClockTime({ hour: 4, minutes: 10 })).toBe("10 past 4");
    expect(describeClockTime({ hour: 4, minutes: 35 })).toBe("25 to 5");
  });
});

describe("listClockTimeSlips", () => {
  it("includes reading the hour hand as the next hour at half past, wrapping round 12", () => {
    expect(
      listClockTimeSlips({ hour: 12, minutes: 30 }).map(describeClockTime),
    ).toEqual(["12 o'clock", "half past 1", "1 o'clock", "half past 11"]);
  });

  it("includes muddling past and to", () => {
    expect(
      listClockTimeSlips({ hour: 3, minutes: 45 }).map(describeClockTime),
    ).toEqual([
      "quarter past 3",
      "quarter to 5",
      "quarter past 4",
      "quarter to 3",
    ]);
  });
});

describe("buildClockQuestions", () => {
  it("has enough Questions with at least three slips in every year and difficulty", () => {
    for (const year of [1, 2, 3, 4, 5, 6] as const) {
      for (const difficulty of [1, 2, 3] as const) {
        const questions = buildClockQuestions(year, difficulty);
        expect(questions.length).toBeGreaterThanOrEqual(5);
        for (const { answer, slips } of questions) {
          expect(slips.length).toBeGreaterThanOrEqual(3);
          expect(slips).not.toContain(answer);
        }
      }
    }
  });

  it("reads Roman numerals to the minute in Year 3", () => {
    const [first] = buildClockQuestions(3, 2);
    expect(first.dial).toBe("roman");
    expect(first.answer).toBe("1 minute past 1");
  });

  it("converts to the 24-hour clock in Year 4", () => {
    expect(buildClockQuestions(4, 2)[0]).toMatchObject({
      time: { hour: 1, minutes: 15 },
      answer: "13:15",
      ask: { kind: "twenty-four-hour", isAfternoon: true },
    });
  });

  it("works out a later time in Year 5 and a duration in Year 6", () => {
    expect(formatTwentyFourHour(23 * 60 + 50 + 20)).toBe("00:10");
    expect(formatDuration(85)).toBe("1 h 25 min");
    expect(formatDuration(40)).toBe("40 min");
    const [later] = buildClockQuestions(5, 1);
    expect(later.ask.kind).toBe("later");
    const [until] = buildClockQuestions(6, 1);
    expect(until.ask.kind).toBe("until");
  });
});
