import { Color } from "three";
import { describe, expect, it } from "vitest";
import {
  islands,
  islandSkies,
  type IslandSky,
} from "../../curriculum/islands.js";
import { buildSkyLook, weatherKinds } from "../world-map-sky.js";
import { buildIslandSkyLook } from "./island-sky.js";

const findPalette = (sky: IslandSky) => {
  const island = islands.find((candidate) => candidate.sky === sky);
  if (island === undefined) {
    throw new Error(`No Island has the ${sky} sky`);
  }
  return island.theme.palette;
};

const findWarmth = (colour: string): number => {
  const { r, b } = new Color(colour);
  return r - b;
};

describe("buildIslandSkyLook", () => {
  it("keeps Starfall Isle under a starry night sky whatever the clock says", () => {
    for (const timeOfDay of ["day", "twilight", "night"] as const) {
      const look = buildIslandSkyLook(
        "starlit-night",
        timeOfDay,
        "clear",
        findPalette("starlit-night"),
      );
      expect(look.isStarry).toBe(true);
      expect(look.isMoonlit).toBe(true);
      expect(look.daylight).toBeLessThan(0.5);
    }
  });

  it("lights Starfall Isle more brightly than an ordinary night", () => {
    const palette = findPalette("starlit-night");
    const starfall = buildIslandSkyLook(
      "starlit-night",
      "night",
      "clear",
      palette,
    );
    const night = buildSkyLook("night", "clear", palette);

    expect(starfall.lightIntensity).toBeGreaterThan(night.lightIntensity);
    expect(starfall.hemisphereIntensity).toBeGreaterThan(
      night.hemisphereIntensity,
    );
    expect(
      new Color(starfall.horizon).getHSL({ h: 0, s: 0, l: 0 }).l,
    ).toBeGreaterThan(new Color(night.horizon).getHSL({ h: 0, s: 0, l: 0 }).l);
  });

  it("never lets rain or snow fall on Sunscorch Sands", () => {
    for (const weather of weatherKinds) {
      const look = buildIslandSkyLook(
        "desert-haze",
        "day",
        weather,
        findPalette("desert-haze"),
      );
      expect(look.precipitation, weather).toBe("none");
    }
  });

  it("lets snow a Child chooses fall and cover every Island, whatever its theme", () => {
    for (const sky of islandSkies) {
      const look = buildIslandSkyLook(
        sky,
        "day",
        "snow",
        findPalette(sky),
        true,
      );
      expect(look.precipitation, sky).toBe("snow");
      expect(look.snowCover, sky).toBe(1);
    }
  });

  it("keeps each Island's theme for other weather a Child chooses", () => {
    expect(
      buildIslandSkyLook(
        "desert-haze",
        "day",
        "rain",
        findPalette("desert-haze"),
        true,
      ).precipitation,
    ).toBe("none");
  });

  it("turns Frost Isle's rain to snow and keeps snow lying on its roofs", () => {
    for (const weather of weatherKinds) {
      const look = buildIslandSkyLook(
        "aurora",
        "day",
        weather,
        findPalette("aurora"),
      );
      expect(look.precipitation, weather).not.toBe("rain");
      expect(look.snowCover, weather).toBeGreaterThan(0.5);
    }
  });

  it("hangs mist over Jungle Reach, closer than over Meadow Isle", () => {
    const palette = findPalette("rainforest-mist");
    const jungle = buildIslandSkyLook(
      "rainforest-mist",
      "day",
      "clear",
      palette,
    );
    const meadow = buildSkyLook("day", "clear", palette);

    expect(jungle.fogEnd).toBeLessThan(meadow.fogEnd);
    expect(
      buildIslandSkyLook("rainforest-mist", "day", "snow", palette)
        .precipitation,
    ).toBe("rain");
  });

  it("warms Ember Isle's horizon with volcanic smoke", () => {
    const palette = findPalette("volcanic-smoke");
    const ember = buildIslandSkyLook("volcanic-smoke", "day", "clear", palette);
    const meadow = buildSkyLook("day", "clear", palette);

    expect(findWarmth(ember.horizon)).toBeGreaterThan(
      findWarmth(meadow.horizon),
    );
  });
});
