import { describe, expect, it } from "vitest";
import { continents, oceans } from "../../curriculum/geography.js";
import type { LonLat, Outline } from "./uk-outlines.js";
import {
  continentOutlines,
  lakeOutlines,
  oceanOutlines,
} from "./world-outlines.js";

const isInsideOutline = ([longitude, latitude]: LonLat, outline: Outline) => {
  let isInside = false;
  for (
    let index = 0, previous = outline.length - 1;
    index < outline.length;
    previous = index++
  ) {
    const [startLongitude, startLatitude] = outline[index];
    const [endLongitude, endLatitude] = outline[previous];
    const isCrossing =
      startLatitude > latitude !== endLatitude > latitude &&
      longitude <
        ((endLongitude - startLongitude) * (latitude - startLatitude)) /
          (endLatitude - startLatitude) +
          startLongitude;
    if (isCrossing) {
      isInside = !isInside;
    }
  }
  return isInside;
};

const isInsideAny = (point: LonLat, outlines: Outline[]) =>
  outlines.some((outline) => isInsideOutline(point, outline));

const findContinentsAt = (point: LonLat) =>
  continents.filter(
    (continent) =>
      isInsideAny(point, continentOutlines[continent]) &&
      !isInsideAny(point, lakeOutlines),
  );

const findOceansAt = (point: LonLat) =>
  oceans.filter((ocean) => isInsideAny(point, oceanOutlines[ocean]));

const cities: [string, LonLat, string][] = [
  ["Nairobi", [36.82, -1.29], "africa"],
  ["Cairo", [31.24, 30.04], "africa"],
  ["Cape Town", [18.6, -33.95], "africa"],
  ["Lagos", [3.6, 6.6], "africa"],
  ["Antananarivo", [47.52, -18.88], "africa"],
  ["Lima", [-77.03, -12.05], "south-america"],
  ["Brasília", [-47.88, -15.79], "south-america"],
  ["Buenos Aires", [-58.6, -34.6], "south-america"],
  ["Bogotá", [-74.07, 4.71], "south-america"],
  ["Paris", [2.35, 48.86], "europe"],
  ["Madrid", [-3.7, 40.42], "europe"],
  ["Rome", [12.5, 41.9], "europe"],
  ["Moscow", [37.62, 55.75], "europe"],
  ["Oslo", [10.75, 59.91], "europe"],
  ["London", [-0.13, 51.51], "europe"],
  ["Dublin", [-6.3, 53.35], "europe"],
  ["Reykjavík", [-21.0, 64.1], "europe"],
  ["Beijing", [116.4, 39.9], "asia"],
  ["Delhi", [77.2, 28.6], "asia"],
  ["Tokyo", [139.69, 35.69], "asia"],
  ["Riyadh", [46.7, 24.7], "asia"],
  ["Jakarta", [106.85, -6.21], "asia"],
  ["Colombo", [79.95, 6.93], "asia"],
  ["Singapore", [103.85, 1.35], "asia"],
  ["Novosibirsk", [82.9, 55.0], "asia"],
  ["Chicago", [-87.9, 41.88], "north-america"],
  ["Mexico City", [-99.13, 19.43], "north-america"],
  ["Toronto", [-79.38, 43.8], "north-america"],
  ["Havana", [-82.37, 23.0], "north-america"],
  ["Panama City", [-79.52, 9.0], "north-america"],
  ["Nuuk", [-51.0, 64.5], "north-america"],
  ["Anchorage", [-149.9, 61.4], "north-america"],
  ["Sydney", [151.0, -33.87], "oceania"],
  ["Alice Springs", [133.88, -23.7], "oceania"],
  ["Perth", [115.95, -31.95], "oceania"],
  ["Wellington", [174.9, -41.25], "oceania"],
  ["Christchurch", [172.4, -43.53], "oceania"],
  ["Port Moresby", [147.3, -9.3], "oceania"],
  ["the South Pole", [0, -89], "antarctica"],
  ["Vostok", [106.8, -78.5], "antarctica"],
];

const seas: [string, LonLat, string][] = [
  ["the middle of the Atlantic", [-30, 10], "atlantic-ocean"],
  ["the Bay of Biscay", [-4, 45.5], "atlantic-ocean"],
  ["the Gulf of Mexico", [-90, 25], "atlantic-ocean"],
  ["the Caribbean", [-75, 15], "atlantic-ocean"],
  ["the North Sea", [3, 56], "atlantic-ocean"],
  ["the South Atlantic", [-20, -40], "atlantic-ocean"],
  ["the middle of the Pacific", [-150, 0], "pacific-ocean"],
  ["the western Pacific", [160, 10], "pacific-ocean"],
  ["the South China Sea", [113, 12], "pacific-ocean"],
  ["the Gulf of California", [-111, 27.5], "pacific-ocean"],
  ["the Tasman Sea", [160, -38], "pacific-ocean"],
  ["the Bering Sea", [-175, 58], "pacific-ocean"],
  ["the middle of the Indian Ocean", [75, -15], "indian-ocean"],
  ["the Bay of Bengal", [88, 15], "indian-ocean"],
  ["the Arabian Sea", [63, 15], "indian-ocean"],
  ["the Red Sea", [38, 20], "indian-ocean"],
  ["the Persian Gulf", [51, 27], "indian-ocean"],
  ["the North Pole", [0, 89], "arctic-ocean"],
  ["Hudson Bay", [-86, 60], "arctic-ocean"],
  ["the Barents Sea", [40, 73], "arctic-ocean"],
  ["the sea off Antarctica", [-100, -65], "southern-ocean"],
];

describe("the world outlines", () => {
  it.each(cities)(
    "puts %s on its own continent and no other",
    (_, point, continent) => {
      expect(findContinentsAt(point)).toEqual([continent]);
    },
  );

  it.each(seas)("puts %s in its own ocean, off the land", (_, point, ocean) => {
    expect(findOceansAt(point)).toEqual([ocean]);
    expect(findContinentsAt(point)).toEqual([]);
  });

  it("keeps the Mediterranean and the Black Sea out of every ocean", () => {
    expect(findOceansAt([18, 35])).toEqual([]);
    expect(findOceansAt([34, 43])).toEqual([]);
  });

  it("keeps the Caspian Sea a lake, off every continent and out of every ocean", () => {
    expect(findContinentsAt([51, 42])).toEqual([]);
    expect(findOceansAt([51, 42])).toEqual([]);
  });
});
