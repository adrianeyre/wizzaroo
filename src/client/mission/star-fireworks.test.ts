import { describe, expect, it } from "vitest";
import {
  buildStarFireworksShow,
  listFireworkSoundCues,
  listStarSparks,
  rocketRiseSeconds,
  starFireworksColours,
} from "./star-fireworks.js";

const viewport = { width: 1200, height: 800 };

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const buildShow = () => buildStarFireworksShow(buildSeededRandom(7));

describe("buildStarFireworksShow", () => {
  it("fills the screen with stars partway through the show", () => {
    const show = buildShow();

    const sparks = listStarSparks(show, show.durationSeconds / 2, viewport);

    expect(sparks.length).toBeGreaterThan(50);
    const sparkXs = sparks.map((spark) => spark.x);
    expect(Math.max(...sparkXs) - Math.min(...sparkXs)).toBeGreaterThan(
      viewport.width / 2,
    );
  });

  it("starts with rockets rising from below the screen", () => {
    const show = buildShow();

    const risingSparks = listStarSparks(show, 0.15, viewport).filter(
      (spark) => spark.tailY > spark.y,
    );

    expect(risingSparks.length).toBeGreaterThan(0);
  });

  it("leaves the screen clear once the show ends", () => {
    const show = buildShow();

    expect(listStarSparks(show, show.durationSeconds, viewport)).toEqual([]);
    expect(show.durationSeconds).toBeGreaterThan(3);
    expect(show.durationSeconds).toBeLessThan(7);
  });

  it("keeps every star visible, sized and in the palette", () => {
    const show = buildShow();

    for (
      let seconds = 0;
      seconds < show.durationSeconds;
      seconds += show.durationSeconds / 20
    ) {
      for (const spark of listStarSparks(show, seconds, viewport)) {
        expect(spark.opacity).toBeGreaterThan(0);
        expect(spark.opacity).toBeLessThanOrEqual(1);
        expect(spark.size).toBeGreaterThan(0);
        expect(starFireworksColours).toContain(spark.colour);
      }
    }
  });

  it("cues a whistle as each rocket rises, a bang as it bursts and a twinkle for each shooting star, in order", () => {
    const show = buildShow();

    const cues = listFireworkSoundCues(show);

    expect(cues.filter(({ kind }) => kind === "launch")).toHaveLength(
      show.rockets.length,
    );
    expect(
      cues
        .filter(({ kind }) => kind === "burst")
        .map(({ atSeconds }) => atSeconds),
    ).toEqual(
      show.rockets
        .map(({ launchAtSeconds }) => launchAtSeconds + rocketRiseSeconds)
        .sort((first, second) => first - second),
    );
    expect(cues.filter(({ kind }) => kind === "shooting-star")).toHaveLength(
      show.shootingStars.length,
    );
    expect(cues.map(({ atSeconds }) => atSeconds)).toEqual(
      [...cues.map(({ atSeconds }) => atSeconds)].sort(
        (first, second) => first - second,
      ),
    );
    expect(
      cues.every(({ atSeconds }) => atSeconds < show.durationSeconds),
    ).toBe(true);
  });
});
