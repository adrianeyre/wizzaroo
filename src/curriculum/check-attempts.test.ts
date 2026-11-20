import { describe, expect, it } from "vitest";
import {
  describeCheckScore,
  isCheckAttempt,
  isCheckHistory,
  isCheckOutcome,
} from "./check-attempts.js";
import { buildCheckHistory, type CheckOutcome } from "./checks.js";
import { buildChildLimits, isChildLimits } from "./island-access.js";

const rightOutcome: CheckOutcome = {
  key: "7x8",
  questionType: "8-times-table",
  skillId: "maths.times-tables-to-12",
  isRight: true,
  isInTime: true,
  millisecondsTaken: 2000,
};

const [attempt] = buildCheckHistory([
  {
    result: {
      checkGameType: "times-tables-check",
      isClockOff: false,
      outcomes: [rightOutcome, { ...rightOutcome, key: "6x9", isRight: false }],
    },
    finishedAt: "2026-11-14T16:00:00.000Z",
    localDate: "2026-11-14",
  },
]);

describe("a Check attempt sent to a dashboard", () => {
  it("accepts an attempt the server built", () => {
    expect(isCheckAttempt(JSON.parse(JSON.stringify(attempt)))).toBe(true);
    expect(isCheckHistory([attempt, attempt])).toBe(true);
    expect(isCheckHistory([])).toBe(true);
  });

  it("refuses an attempt of a Check that doesn't exist, or with a broken outcome", () => {
    expect(isCheckAttempt({ ...attempt, checkGameType: "pop-quiz" })).toBe(
      false,
    );
    expect(isCheckAttempt({ ...attempt, score: -1 })).toBe(false);
    expect(
      isCheckAttempt({
        ...attempt,
        outcomes: [{ ...rightOutcome, isInTime: "yes" }],
      }),
    ).toBe(false);
    expect(isCheckHistory({ attempt })).toBe(false);
  });

  it("refuses an outcome whose time taken isn't a whole number of milliseconds", () => {
    expect(isCheckOutcome(rightOutcome)).toBe(true);
    expect(isCheckOutcome({ ...rightOutcome, millisecondsTaken: 1.5 })).toBe(
      false,
    );
    expect(isCheckOutcome({ ...rightOutcome, millisecondsTaken: -1 })).toBe(
      false,
    );
  });

  it("describes a score the way the real check gives it", () => {
    expect(describeCheckScore(attempt)).toBe("1 out of 2");
    expect(describeCheckScore({ score: 21, questionCount: 25 })).toBe(
      "21 out of 25",
    );
  });
});

describe("the no-time-limit switch in a Child's limits", () => {
  it("is off until a Parent turns it on", () => {
    expect(buildChildLimits({}).isCheckClockOff).toBe(false);
    expect(buildChildLimits({ isCheckClockOff: true }).isCheckClockOff).toBe(
      true,
    );
  });

  it("is part of every whole set of limits", () => {
    const { isCheckClockOff, ...limitsWithoutSwitch } = buildChildLimits({});

    expect(isCheckClockOff).toBe(false);
    expect(isChildLimits(limitsWithoutSwitch)).toBe(false);
    expect(isChildLimits({ ...limitsWithoutSwitch, isCheckClockOff: 1 })).toBe(
      false,
    );
  });
});
