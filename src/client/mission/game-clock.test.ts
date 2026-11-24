import { describe, expect, it } from "vitest";
import { buildGameClock } from "./game-clock.js";

describe("the Game clock", () => {
  it("reads the time while the Game is playing", () => {
    let now = 1000;
    const clock = buildGameClock(() => now);
    now = 1500;

    expect(clock.read()).toBe(1500);
    expect(clock.isPaused()).toBe(false);
  });

  it("stands still while paused, and leaves the pause out once resumed", () => {
    let now = 1000;
    const clock = buildGameClock(() => now);
    clock.pause();
    now = 61_000;

    expect(clock.read()).toBe(1000);
    expect(clock.isPaused()).toBe(true);

    clock.resume();
    now = 62_000;

    expect(clock.read()).toBe(2000);
    expect(clock.isPaused()).toBe(false);
  });

  it("keeps the first pause when paused twice, and ignores a resume without a pause", () => {
    let now = 0;
    const clock = buildGameClock(() => now);
    clock.resume();
    clock.pause();
    now = 500;
    clock.pause();
    now = 1000;
    clock.resume();

    expect(clock.read()).toBe(0);
  });
});
