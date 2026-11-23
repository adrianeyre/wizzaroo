import { describe, expect, it } from "vitest";
import { ukNations, ukSeas } from "../../curriculum/geography.js";
import { geographyGames } from "../../curriculum/geography-games.js";
import {
  getUkMapPoint,
  irelandRepublicOutlines,
  ukMapBounds,
  ukMapLongitudeScale,
  ukNationOutlines,
  ukSeaOutlines,
  type LonLat,
  type Outline,
} from "./uk-outlines.js";

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

const findNationsAt = (point: LonLat) =>
  ukNations.filter((nation) =>
    ukNationOutlines[nation].some((outline) => isInsideOutline(point, outline)),
  );

const isInIrelandRepublic = (point: LonLat) =>
  irelandRepublicOutlines.some((outline) => isInsideOutline(point, outline));

const findSeasAt = (point: LonLat) =>
  ukSeas.filter((sea) => isInsideOutline(point, ukSeaOutlines[sea]));

const places: [string, LonLat, string][] = [
  ["London", [-0.13, 51.51], "england"],
  ["Birmingham", [-1.9, 52.48], "england"],
  ["Manchester", [-2.24, 53.48], "england"],
  ["Liverpool", [-2.98, 53.41], "england"],
  ["Leeds", [-1.55, 53.8], "england"],
  ["Newcastle", [-1.61, 54.97], "england"],
  ["Bristol", [-2.59, 51.45], "england"],
  ["Carlisle", [-2.93, 54.89], "england"],
  ["Scafell Pike", [-3.21, 54.45], "england"],
  ["Cornwall", [-4.9, 50.4], "england"],
  ["Kent", [0.8, 51.2], "england"],
  ["Norwich", [1.3, 52.63], "england"],
  ["Plymouth", [-4.14, 50.38], "england"],
  ["Edinburgh", [-3.19, 55.95], "scotland"],
  ["Glasgow", [-4.25, 55.86], "scotland"],
  ["Aberdeen", [-2.1, 57.15], "scotland"],
  ["Inverness", [-4.23, 57.47], "scotland"],
  ["Dundee", [-2.97, 56.46], "scotland"],
  ["Ben Nevis", [-5.0, 56.8], "scotland"],
  ["Cardiff", [-3.18, 51.48], "wales"],
  ["Swansea", [-3.94, 51.62], "wales"],
  ["Snowdon", [-4.08, 53.07], "wales"],
  ["Aberystwyth", [-4.05, 52.41], "wales"],
  ["Belfast", [-5.93, 54.6], "northern-ireland"],
  ["Derry", [-7.32, 55.0], "northern-ireland"],
  ["Enniskillen", [-7.63, 54.34], "northern-ireland"],
];

const waters: [string, LonLat, string][] = [
  ["the sea off Norfolk", [2.5, 53.0], "north-sea"],
  ["the sea off Aberdeen", [0.0, 57.0], "north-sea"],
  ["the Wash", [0.3, 52.9], "north-sea"],
  ["the sea off the Isle of Wight", [-1.5, 50.3], "english-channel"],
  ["the sea off Dover", [1.6, 50.9], "english-channel"],
  ["the sea off the Isle of Man", [-5.0, 54.0], "irish-sea"],
  ["Liverpool Bay", [-3.6, 53.5], "irish-sea"],
  ["Cardigan Bay", [-4.5, 52.4], "irish-sea"],
  ["the sea off Galway", [-10.5, 53.0], "atlantic-ocean"],
  ["the sea off the Hebrides", [-8.0, 57.5], "atlantic-ocean"],
  ["the Celtic Sea", [-7.0, 51.0], "atlantic-ocean"],
];

describe("the UK outlines", () => {
  it.each(places)(
    "puts %s in its own nation and no other",
    (_, point, nation) => {
      expect(findNationsAt(point)).toEqual([nation]);
      expect(isInIrelandRepublic(point)).toBe(false);
    },
  );

  it("keeps Dublin in the Republic of Ireland, outside the UK", () => {
    expect(findNationsAt([-6.26, 53.35])).toEqual([]);
    expect(isInIrelandRepublic([-6.26, 53.35])).toBe(true);
  });

  it.each(waters)("puts %s in its own sea, off the land", (_, point, sea) => {
    expect(findSeasAt(point)).toEqual([sea]);
    expect(findNationsAt(point)).toEqual([]);
    expect(isInIrelandRepublic(point)).toBe(false);
  });

  const ukMapPins = geographyGames.flatMap(({ questions }) =>
    questions.flatMap(({ ask, show, answer }) =>
      show.scene === "uk-explorer" && show.pin !== undefined
        ? [{ ask, answer, pin: show.pin }]
        : [],
    ),
  );

  it.each(ukMapPins)(
    "stands the pin for $answer on the map, in what it answers ($ask)",
    ({ answer, pin: { longitude, latitude } }) => {
      const answeredSea = ukSeas.find(
        (sea) => sea === answer.toLowerCase().replaceAll(" ", "-"),
      );

      expect(longitude).toBeGreaterThan(ukMapBounds.west);
      expect(longitude).toBeLessThan(ukMapBounds.east);
      expect(latitude).toBeGreaterThan(ukMapBounds.south);
      expect(latitude).toBeLessThan(ukMapBounds.north);
      if (answeredSea !== undefined) {
        expect(findSeasAt([longitude, latitude])).toEqual([answeredSea]);
        expect(findNationsAt([longitude, latitude])).toEqual([]);
        expect(isInIrelandRepublic([longitude, latitude])).toBe(false);
      }
    },
  );

  it("squeezes longitude by the cosine of 54.5° so Britain keeps its shape", () => {
    const [londonX, londonY] = getUkMapPoint([-0.13, 51.51], 1);
    const [cardiffX, cardiffY] = getUkMapPoint([-3.18, 51.48], 1);

    expect(londonX - cardiffX).toBeCloseTo(3.05 * ukMapLongitudeScale);
    expect(londonY - cardiffY).toBeCloseTo(0.03);
  });
});
