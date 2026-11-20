import { describe, expect, it } from "vitest";
import {
  getRenderQuality,
  headroomWaitSeconds,
  renderQualityLevels,
  startRenderQualityTracker,
  trackFrame,
  type RenderQualityTracker,
} from "./render-quality.js";

const playFrames = (
  tracker: RenderQualityTracker,
  fps: number,
  seconds: number,
): RenderQualityTracker => {
  let tracked = tracker;
  for (let frame = 0; frame < Math.round(fps * seconds); frame++) {
    tracked = trackFrame(tracked, 1 / fps);
  }
  return tracked;
};

const lowestLevel = renderQualityLevels.length - 1;

describe("trackFrame", () => {
  it("starts at the sharpest resolution with effects on", () => {
    expect(getRenderQuality(startRenderQualityTracker())).toEqual({
      pixelSize: 4,
      isEffectsOn: true,
    });
  });

  it("keeps the quality while the game holds 30 fps or more", () => {
    const tracker = playFrames(startRenderQualityTracker(), 30, 20);

    expect(tracker.levelIndex).toBe(0);
    expect(tracker.fps).toBeCloseTo(30);
  });

  it("lowers the render resolution first when the game falls below 30 fps", () => {
    const tracker = playFrames(startRenderQualityTracker(), 20, 1);

    expect(getRenderQuality(tracker)).toEqual({
      pixelSize: 5,
      isEffectsOn: true,
    });
  });

  it("drops the effects only once the resolution is at its lowest", () => {
    const qualities = [];
    let tracker = startRenderQualityTracker();
    for (let second = 0; second < lowestLevel; second++) {
      tracker = playFrames(tracker, 15, 1);
      qualities.push(getRenderQuality(tracker));
    }

    expect(qualities).toEqual([
      { pixelSize: 5, isEffectsOn: true },
      { pixelSize: 6, isEffectsOn: true },
      { pixelSize: 8, isEffectsOn: true },
      { pixelSize: 8, isEffectsOn: false },
    ]);
  });

  it("never goes below the lowest quality", () => {
    const tracker = playFrames(startRenderQualityTracker(), 10, 30);

    expect(tracker.levelIndex).toBe(lowestLevel);
  });

  it(`raises the quality again one step after ${String(headroomWaitSeconds)} seconds with headroom`, () => {
    const slowed = playFrames(startRenderQualityTracker(), 15, 3);
    expect(slowed.levelIndex).toBe(3);

    const almost = playFrames(slowed, 60, headroomWaitSeconds - 1);
    expect(almost.levelIndex).toBe(3);

    const raised = playFrames(almost, 60, 1);
    expect(raised.levelIndex).toBe(2);
  });

  it("waits for headroom to last, so a frame rate between 30 and 50 fps changes nothing", () => {
    const slowed = playFrames(startRenderQualityTracker(), 15, 1);
    let tracker = slowed;
    for (let second = 0; second < 20; second++) {
      tracker = playFrames(tracker, second % 2 === 0 ? 60 : 40, 1);
    }

    expect(tracker.levelIndex).toBe(slowed.levelIndex);
  });

  it("ignores the long gap while the game was hidden, so coming back never counts as slow", () => {
    const tracker = trackFrame(startRenderQualityTracker(), 12);

    expect(tracker).toEqual(startRenderQualityTracker());
  });
});
