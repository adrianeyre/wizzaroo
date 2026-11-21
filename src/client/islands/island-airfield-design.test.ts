import { describe, expect, it } from "vitest";
import { islands } from "../../curriculum/islands.js";
import {
  balloonFieldFlatRadius,
  findRunwayOffset,
  helipadFlatRadius,
  isClearOfProps,
  mirrorOntoNewLands,
  runwayFlatHalfWidth,
  runwayHalfLength,
  type MapPoint,
} from "../world-map-terrain.js";
import {
  findExploreAdventure,
  findIslandAdventure,
  isInsideExploreBounds,
  islandAdventures,
  listAdventurePlaces,
} from "./island-adventures.js";
import {
  buildAirfieldGeometry,
  findRunwayNumber,
} from "./island-airfield-design.js";
import { emberIsle } from "./ember-isle.js";
import { frostIsle } from "./frost-isle.js";
import type { IslandLandform } from "./island-landform.js";
import { jungleReach } from "./jungle-reach.js";
import { starfallIsle } from "./starfall-isle.js";
import { sunscorchSands } from "./sunscorch-sands.js";

const landforms: Record<string, IslandLandform> = {
  "frost-isle": frostIsle,
  "sunscorch-sands": sunscorchSands,
  "jungle-reach": jungleReach,
  "ember-isle": emberIsle,
  "starfall-isle": starfallIsle,
};

const islandIds = islandAdventures.map(({ islandId }) => [islandId] as const);

const listRunwayPoints = (islandId: string): MapPoint[] => {
  const { runway } = findIslandAdventure(islandId).airfield;
  return Array.from({ length: 31 }, (_, step) => step / 15 - 1).flatMap(
    (along) =>
      [-1, -0.5, 0, 0.5, 1].map((across) => {
        const forward = along * runwayHalfLength;
        const sideways = across * runwayFlatHalfWidth;
        return {
          x:
            runway.centre.x +
            Math.sin(runway.heading) * forward +
            Math.cos(runway.heading) * sideways,
          z:
            runway.centre.z +
            Math.cos(runway.heading) * forward -
            Math.sin(runway.heading) * sideways,
        };
      }),
  );
};

const listHelipadPoints = (islandId: string): MapPoint[] => {
  const { helipad } = findIslandAdventure(islandId).airfield;
  return Array.from({ length: 5 }, (_, ring) =>
    Array.from({ length: 12 }, (_, spoke) => ({
      x:
        helipad.centre.x +
        Math.cos((spoke * Math.PI) / 6) * helipadFlatRadius * (ring / 4),
      z:
        helipad.centre.z +
        Math.sin((spoke * Math.PI) / 6) * helipadFlatRadius * (ring / 4),
    })),
  ).flat();
};

const listBalloonFieldPoints = (islandId: string): MapPoint[] => {
  const { balloonField } = findIslandAdventure(islandId).airfield;
  return Array.from({ length: 5 }, (_, ring) =>
    Array.from({ length: 16 }, (_, spoke) => ({
      x:
        balloonField.centre.x +
        Math.cos((spoke * Math.PI) / 8) * balloonFieldFlatRadius * (ring / 4),
      z:
        balloonField.centre.z +
        Math.sin((spoke * Math.PI) / 8) * balloonFieldFlatRadius * (ring / 4),
    })),
  ).flat();
};

const isOnAirfield = (islandId: string, point: MapPoint, margin: number) => {
  const { runway, helipad, balloonField } =
    findIslandAdventure(islandId).airfield;
  const { along, across } = findRunwayOffset(runway, point);
  const isOnRunway =
    Math.abs(along) < runwayHalfLength + margin &&
    Math.abs(across) < runwayFlatHalfWidth + margin;
  const isOnHelipad =
    Math.hypot(point.x - helipad.centre.x, point.z - helipad.centre.z) <
    helipadFlatRadius + margin;
  const isOnBalloonField =
    Math.hypot(
      point.x - balloonField.centre.x,
      point.z - balloonField.centre.z,
    ) <
    balloonFieldFlatRadius + margin;
  return isOnRunway || isOnHelipad || isOnBalloonField;
};

describe.each(islandIds)("the airfield on %s", (islandId) => {
  const adventure = findIslandAdventure(islandId);

  it("has a Runway on dry ground levelled flat along its whole length", () => {
    listRunwayPoints(islandId).forEach((point) => {
      expect(adventure.findHeight(point)).toBeCloseTo(
        adventure.airfield.runway.level,
        5,
      );
      expect(adventure.findCourseKind(point)).toBeUndefined();
      expect(isInsideExploreBounds({ x: point.x * 6, z: point.z * 6 })).toBe(
        true,
      );
    });
    expect(adventure.airfield.runway.level).toBeGreaterThan(0.5);
  });

  it("has a Helipad on dry, level ground", () => {
    listHelipadPoints(islandId).forEach((point) => {
      expect(adventure.findHeight(point)).toBeCloseTo(
        adventure.airfield.helipad.level,
        5,
      );
      expect(adventure.findCourseKind(point)).toBeUndefined();
    });
  });

  it("has a Balloon Field on dry, level ground", () => {
    listBalloonFieldPoints(islandId).forEach((point) => {
      expect(adventure.findHeight(point)).toBeCloseTo(
        adventure.airfield.balloonField.level,
        5,
      );
      expect(adventure.findCourseKind(point)).toBeUndefined();
      expect(isInsideExploreBounds({ x: point.x * 6, z: point.z * 6 })).toBe(
        true,
      );
    });
    expect(adventure.airfield.balloonField.level).toBeGreaterThan(0.5);
  });

  it("keeps the Island's own places and sights off the Runway, the Helipad and the Balloon Field", () => {
    const places = listAdventurePlaces({
      ...adventure,
      airfield: {
        runway: { ...adventure.airfield.runway, centre: { x: 999, z: 999 } },
        helipad: { ...adventure.airfield.helipad, centre: { x: 999, z: 999 } },
        balloonField: {
          ...adventure.airfield.balloonField,
          centre: { x: 999, z: 999 },
        },
      },
    });
    places.forEach((place) => {
      expect(isOnAirfield(islandId, place, 0.5)).toBe(false);
    });
    const island = islands.find(({ id }) => id === islandId);
    island?.regions.forEach(({ mapPosition }) => {
      expect(isOnAirfield(islandId, mapPosition, 3)).toBe(false);
    });
  });

  it("clears the Island's scenery from the Runway, the Helipad and the Balloon Field", () => {
    const landform = new Map(Object.entries(landforms)).get(islandId);
    if (landform === undefined) {
      return;
    }
    const island = islands.find(({ id }) => id === islandId);
    const keepClearOf = [
      ...(island?.regions ?? []).map(({ mapPosition }) => mapPosition),
      ...landform.features.map(({ position }) => position),
    ];
    const propPlaces = listAdventurePlaces(adventure);
    landform
      .listScatters(keepClearOf, propPlaces, () => true)
      .forEach((scatter) => {
        const things = [
          ...scatter.things,
          ...mirrorOntoNewLands(scatter.things, {
            keepEvery: 1,
            findHeight: landform.findHeight,
            isClear: (point) => isClearOfProps(point, propPlaces),
          }),
        ];
        things.forEach((thing) => {
          expect(isOnAirfield(islandId, thing, 0.5), scatter.name).toBe(false);
        });
      });
    landform.features.forEach(({ name, position }) => {
      expect(isOnAirfield(islandId, position, 2.5), name).toBe(false);
    });
  });

  it("draws the Runway, the Helipad and the Balloon Field in a few thousand triangles", () => {
    const geometry = buildAirfieldGeometry(findExploreAdventure(islandId));
    const triangles = geometry.getAttribute("position").count / 3;
    expect(triangles).toBeGreaterThan(1500);
    expect(triangles).toBeLessThan(7000);
  });
});

describe("runway numbers", () => {
  it("names each end of a Runway after the compass bearing it points along", () => {
    expect(findRunwayNumber(-Math.PI / 2)).toBe(27);
    expect(findRunwayNumber(Math.PI / 2)).toBe(9);
    expect(findRunwayNumber(Math.PI)).toBe(36);
    expect(findRunwayNumber(0)).toBe(18);
  });
});
