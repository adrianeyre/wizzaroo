import { describe, expect, it } from "vitest";
import {
  buildOncePerInterval,
  buildPasskeyChallengeSweep,
  passkeyChallengeSweepIntervalMs,
} from "./passkey-challenge-sweep.js";

const buildClock = () => {
  let now = 1_000_000;
  return {
    clock: () => now,
    moveOn: (ms: number) => {
      now += ms;
    },
  };
};

describe("buildOncePerInterval", () => {
  it("says yes the first time, then no until the interval has passed", () => {
    const { clock, moveOn } = buildClock();
    const isDue = buildOncePerInterval(60_000, clock);

    const first = isDue();
    const soonAfter = [isDue(), isDue()];
    moveOn(59_999);
    const justBefore = isDue();
    moveOn(1);
    const onTheMinute = isDue();
    const afterThat = isDue();

    expect(first).toBe(true);
    expect(soonAfter).toEqual([false, false]);
    expect(justBefore).toBe(false);
    expect(onTheMinute).toBe(true);
    expect(afterThat).toBe(false);
  });
});

describe("buildPasskeyChallengeSweep", () => {
  const quietLog = { error: () => undefined };

  it("sweeps at most once a minute however many challenges are made, so a challenge's cost doesn't grow with the rate (#331)", () => {
    const { clock, moveOn } = buildClock();
    let sweeps = 0;
    const sweep = buildPasskeyChallengeSweep(
      () => {
        sweeps += 1;
        return Promise.resolve();
      },
      quietLog,
      clock,
    );

    for (let call = 0; call < 1_000; call += 1) {
      sweep();
    }
    const inTheFirstMinute = sweeps;
    moveOn(passkeyChallengeSweepIntervalMs);
    for (let call = 0; call < 1_000; call += 1) {
      sweep();
    }

    expect(inTheFirstMinute).toBe(1);
    expect(sweeps).toBe(2);
  });

  it("doesn't wait for the sweep, and logs one that fails rather than throwing at the caller", async () => {
    const { clock } = buildClock();
    const failure = new Error("the database is down");
    const errors: unknown[] = [];
    const sweep = buildPasskeyChallengeSweep(
      () => Promise.reject(failure),
      {
        error: (details: unknown, message?: string) => {
          errors.push([details, message]);
        },
      },
      clock,
    );

    sweep();
    const beforeItSettles = [...errors];
    await new Promise((resolve) => setImmediate(resolve));

    expect(beforeItSettles).toEqual([]);
    expect(errors).toEqual([
      [{ err: failure }, "auth.passkey-challenges.sweep-failed"],
    ]);
  });
});
