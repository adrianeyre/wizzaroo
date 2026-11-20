import { Color } from "three";
import { describe, expect, it } from "vitest";
import { worldMap } from "../curriculum/world-map.js";
import {
  buildSkyLook,
  chooseWeather,
  findTimeOfDay,
  weatherKinds,
} from "./world-map-sky.js";

const [{ palette }] = worldMap.islands.map(({ theme }) => theme);

const atHour = (hour: number) => new Date(2026, 10, 14, hour, 30);

const findBrightness = (hex: string) =>
  new Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l;

describe("findTimeOfDay", () => {
  it("follows the device's own clock: night from 9pm to 6am, twilight around dawn and dusk, and day between", () => {
    expect(
      [0, 3, 5, 21, 23].map((hour) => findTimeOfDay(atHour(hour))),
    ).toEqual(["night", "night", "night", "night", "night"]);
    expect([6, 19, 20].map((hour) => findTimeOfDay(atHour(hour)))).toEqual([
      "twilight",
      "twilight",
      "twilight",
    ]);
    expect([7, 12, 18].map((hour) => findTimeOfDay(atHour(hour)))).toEqual([
      "day",
      "day",
      "day",
    ]);
  });
});

describe("chooseWeather", () => {
  it("can choose every kind of weather, with clear skies the most likely", () => {
    const chosen = Array.from({ length: 100 }, (_, roll) =>
      chooseWeather(() => roll / 100),
    );

    expect(new Set(chosen)).toEqual(new Set(weatherKinds));
    const clearCount = chosen.filter((weather) => weather === "clear").length;
    for (const weather of weatherKinds) {
      expect(clearCount).toBeGreaterThanOrEqual(
        chosen.filter((other) => other === weather).length,
      );
    }
  });
});

describe("buildSkyLook", () => {
  it("darkens the sky at night, brings out the stars and moon, and lights the cottage windows", () => {
    const day = buildSkyLook("day", "clear", palette);
    const night = buildSkyLook("night", "clear", palette);

    expect(findBrightness(night.zenith)).toBeLessThan(
      findBrightness(day.zenith),
    );
    expect(night.lightIntensity).toBeLessThan(day.lightIntensity);
    expect(night.daylight).toBeLessThan(day.daylight);
    expect(night).toMatchObject({
      isStarry: true,
      isMoonlit: true,
      areWindowsLit: true,
    });
    expect(day).toMatchObject({
      isStarry: false,
      isMoonlit: false,
      areWindowsLit: false,
    });
  });

  it("makes each weather look and feel different", () => {
    const clear = buildSkyLook("day", "clear", palette);
    const looks = Object.fromEntries(
      weatherKinds.map((weather) => [
        weather,
        buildSkyLook("day", weather, palette),
      ]),
    );

    expect(looks.rain).toMatchObject({ precipitation: "rain" });
    expect(looks.storm).toMatchObject({
      precipitation: "rain",
      hasLightning: true,
    });
    expect(looks.storm.precipitationAmount).toBeGreaterThan(
      looks.rain.precipitationAmount,
    );
    expect(looks.snow).toMatchObject({ precipitation: "snow" });
    expect(looks.snow.snowCover).toBe(1);
    expect(looks.wind).toMatchObject({ precipitation: "leaves" });
    expect(looks.wind.windStrength).toBeGreaterThan(clear.windStrength);
    expect(looks.fog.fogEnd).toBeLessThan(clear.fogEnd);
    expect(looks.cloudy.cloudCount).toBeGreaterThan(clear.cloudCount);
    for (const weather of ["cloudy", "rain", "storm", "snow", "fog"] as const) {
      expect(looks[weather].lightIntensity, weather).toBeLessThan(
        clear.lightIntensity,
      );
    }
  });

  it("hides the stars behind thick cloud at night", () => {
    expect(buildSkyLook("night", "rain", palette).isStarry).toBe(false);
    expect(buildSkyLook("night", "clear", palette).isStarry).toBe(true);
  });
});
