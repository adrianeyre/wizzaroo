import { describe, expect, it } from "vitest";
import { quickestRightCheckAnswerMilliseconds } from "../../curriculum/checks.js";
import {
  isPlayEventPlausible,
  oldestPlayEventDays,
  playEventClockSlackMilliseconds,
} from "./play-event-plausibility.js";
import type { PlayEvent } from "./play-event-routes.js";
import { familyDeviceLifetimeDays } from "./signed-in-family-device.js";

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const receivedAt = new Date("2026-11-18T12:00:00.000Z");
const ukToday = "2026-11-18";
const childId = "0b0f7b1e-1111-4111-8111-111111111111";
const sessionId = "0b0f7b1e-2222-4222-8222-222222222222";

const atOffset = (milliseconds: number): string =>
  new Date(receivedAt.getTime() + milliseconds).toISOString();

const buildSessionStarted = (happenedAt: string): PlayEvent => ({
  id: "0b0f7b1e-3333-4333-8333-333333333333",
  childId,
  type: "session-started",
  happenedAt,
  payload: { sessionId },
});

const buildAnswer = (localDate: string): PlayEvent => ({
  id: "0b0f7b1e-4444-4444-8444-444444444444",
  childId,
  type: "question-answered",
  happenedAt: receivedAt.toISOString(),
  payload: {
    sessionId,
    activityId: "0b0f7b1e-5555-4555-8555-555555555555",
    skillId: "maths.number-bonds-10",
    localDate,
    isRightFirstTime: true,
    wrongAnswerCount: 0,
  },
});

const buildCheck = (
  questionCount: number,
  millisecondsTaken = 2500,
): PlayEvent => ({
  id: "0b0f7b1e-6666-4666-8666-666666666666",
  childId,
  type: "check-finished",
  happenedAt: receivedAt.toISOString(),
  payload: {
    sessionId,
    localDate: ukToday,
    islandId: "jungle-reach",
    regionId: "challenge-arena",
    gameId: "multiplication-tables-check",
    checkGameType: "times-tables-check",
    isClockOff: false,
    outcomes: Array.from({ length: questionCount }, (_, index) => ({
      key: `${String(index + 1)}x8`,
      questionType: "8-times-table",
      skillId: "maths.times-tables-to-12",
      isRight: true,
      isInTime: true,
      millisecondsTaken,
    })),
  },
});

describe("isPlayEventPlausible", () => {
  it("looks back as far as a signed-in Family Device's credential lasts unused (#301)", () => {
    expect(oldestPlayEventDays).toBe(familyDeviceLifetimeDays);
  });

  it("keeps an event that happened up to the slack after it was received, and as long before as a device's outbox can hold it", () => {
    for (const happenedAt of [
      atOffset(0),
      atOffset(playEventClockSlackMilliseconds),
      atOffset(-oldestPlayEventDays * millisecondsPerDay),
      atOffset(-7 * millisecondsPerDay),
    ]) {
      expect(
        isPlayEventPlausible(buildSessionStarted(happenedAt), receivedAt),
      ).toBe(true);
    }
  });

  it("sets aside an event a device's clock dates after it was received, beyond the slack, or before any signed-in device could still hold it (#324, #325)", () => {
    for (const happenedAt of [
      atOffset(playEventClockSlackMilliseconds + 1),
      atOffset(-oldestPlayEventDays * millisecondsPerDay - 1),
      "9999-12-31T23:59:59.000Z",
      "2100-01-01T00:00:00.000Z",
      "1900-01-01T00:00:00.000Z",
    ]) {
      expect(
        isPlayEventPlausible(buildSessionStarted(happenedAt), receivedAt),
      ).toBe(false);
    }
  });

  it("keeps a local date a day either side of the UK's today, and as far back as a device's outbox can hold it", () => {
    for (const localDate of [
      ukToday,
      "2026-11-19",
      "2026-11-17",
      "2025-10-13",
    ]) {
      expect(isPlayEventPlausible(buildAnswer(localDate), receivedAt)).toBe(
        true,
      );
    }
  });

  it("sets aside a local date later than the UK's tomorrow, or before any signed-in device could still hold it (#324, #327)", () => {
    for (const localDate of [
      "2026-11-20",
      "2025-10-12",
      "9000-01-01",
      "9999-12-31",
      "1900-01-01",
    ]) {
      expect(isPlayEventPlausible(buildAnswer(localDate), receivedAt)).toBe(
        false,
      );
    }
  });

  it("sets aside a Check with more outcomes than its paper asks, or a right answer quicker than anyone could give one (#324)", () => {
    expect(isPlayEventPlausible(buildCheck(25), receivedAt)).toBe(true);
    expect(isPlayEventPlausible(buildCheck(26), receivedAt)).toBe(false);
    expect(isPlayEventPlausible(buildCheck(50, 1), receivedAt)).toBe(false);
    expect(
      isPlayEventPlausible(
        buildCheck(2, quickestRightCheckAnswerMilliseconds - 1),
        receivedAt,
      ),
    ).toBe(false);
  });
});
