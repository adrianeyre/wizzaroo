import { describe, expect, it } from "vitest";
import {
  isCodePaused,
  recordPendingSignInStart,
  recordWrongCode,
} from "./sign-in-code-limits.js";

const now = new Date("2026-11-17T12:00:00.000Z");

const minutesBefore = (minutes: number): Date =>
  new Date(now.getTime() - minutes * 60_000);

const minutesAfter = (minutes: number): Date => minutesBefore(-minutes);

describe("isCodePaused", () => {
  it("pauses codes only until the pause ends", () => {
    expect(isCodePaused(null, now)).toBe(false);
    expect(isCodePaused(minutesAfter(1), now)).toBe(true);
    expect(isCodePaused(now, now)).toBe(false);
    expect(isCodePaused(minutesBefore(1), now)).toBe(false);
  });
});

describe("recordWrongCode", () => {
  it("counts a wrong code against the adult while fewer than five have been given in the hour", () => {
    const earlier = [minutesBefore(30), minutesBefore(20), minutesBefore(10)];

    expect(recordWrongCode(earlier, now)).toEqual({
      wrongCodesAt: [...earlier, now],
      codePauseEndsAt: null,
    });
  });

  it("pauses codes for an hour at the fifth wrong code in the hour, and starts the count again", () => {
    const earlier = [
      minutesBefore(40),
      minutesBefore(30),
      minutesBefore(20),
      minutesBefore(10),
    ];

    expect(recordWrongCode(earlier, now)).toEqual({
      wrongCodesAt: [],
      codePauseEndsAt: minutesAfter(60),
    });
  });

  it("forgets wrong codes given an hour or more ago", () => {
    const earlier = [
      minutesBefore(90),
      minutesBefore(60),
      minutesBefore(20),
      minutesBefore(10),
    ];

    expect(recordWrongCode(earlier, now)).toEqual({
      wrongCodesAt: [minutesBefore(20), minutesBefore(10), now],
      codePauseEndsAt: null,
    });
  });
});

describe("recordPendingSignInStart", () => {
  const spreadOverTheHour = (count: number): Date[] =>
    Array.from({ length: count }, (_, index) => minutesBefore(55 - index * 5));

  it("starts a pending sign-in while fewer than ten have started in the hour", () => {
    const earlier = spreadOverTheHour(9);

    expect(recordPendingSignInStart(earlier, now)).toEqual([...earlier, now]);
  });

  it("refuses an eleventh pending sign-in in the hour", () => {
    expect(recordPendingSignInStart(spreadOverTheHour(10), now)).toBe(
      undefined,
    );
  });

  it("refuses a sixth pending sign-in in one minute, though the hour has room", () => {
    const inTheLastMinute = [0.9, 0.7, 0.5, 0.3, 0.1].map(minutesBefore);

    expect(recordPendingSignInStart(inTheLastMinute, now)).toBe(undefined);
    expect(recordPendingSignInStart(inTheLastMinute.slice(1), now)).toEqual([
      ...inTheLastMinute.slice(1),
      now,
    ]);
  });

  it("forgets pending sign-ins started an hour or more ago", () => {
    const earlier = [
      minutesBefore(61),
      minutesBefore(60),
      ...spreadOverTheHour(8),
    ];

    expect(recordPendingSignInStart(earlier, now)).toEqual([
      ...spreadOverTheHour(8),
      now,
    ]);
  });
});
