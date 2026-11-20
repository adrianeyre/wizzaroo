import { describe, expect, it } from "vitest";
import { islands } from "../../curriculum/islands.js";
import { findTerrainHeight, seaLevel } from "../world-map-terrain.js";
import { emberIsle, emberVolcanoPosition, lavaRivers } from "./ember-isle.js";
import {
  findFrostHeight,
  frostIsle,
  frozenChannel,
  iceBridgeCrossing,
} from "./frost-isle.js";
import {
  findDistanceToCourse,
  type IslandLandform,
} from "./island-landform.js";
import {
  deltaFork,
  fallsBottom,
  fallsTop,
  jungleReach,
  jungleRivers,
} from "./jungle-reach.js";
import {
  findStarfallHeight,
  floatingRockPlaces,
  observatoryHill,
  starCraterPosition,
  starfallIsle,
} from "./starfall-isle.js";
import {
  findSandsHeight,
  mesaPosition,
  oasisPool,
  sunscorchSands,
} from "./sunscorch-sands.js";

const landforms = new Map<string, IslandLandform>([
  ["frost-isle", frostIsle],
  ["sunscorch-sands", sunscorchSands],
  ["jungle-reach", jungleReach],
  ["ember-isle", emberIsle],
  ["starfall-isle", starfallIsle],
]);

const findLandform = (islandId: string): IslandLandform => {
  const landform = landforms.get(islandId);
  if (landform === undefined) {
    throw new Error(`No landform for ${islandId}`);
  }
  return landform;
};

const sampleGrid = Array.from({ length: 24 }, (_, column) =>
  Array.from({ length: 16 }, (_, row) => ({
    x: -23 + column * 2,
    z: -15 + row * 2,
  })),
).flat();

describe.each(islands.map((island) => [island.name, island] as const))(
  "%s",
  (_, island) => {
    const landform = findLandform(island.id);

    it("rises from the sea as one land, with sea all round its edge", () => {
      expect(landform.findHeight({ x: 0, z: 0 })).toBeGreaterThan(seaLevel);
      for (const edge of [
        { x: 114, z: 0 },
        { x: -114, z: 0 },
        { x: 92, z: 22 },
        { x: -92, z: -22 },
        { x: 0, z: 22 },
        { x: 0, z: -22 },
      ]) {
        expect(landform.findHeight(edge)).toBeLessThan(seaLevel);
      }
    });

    it("keeps every Region and the Big Top on dry land, out of the water", () => {
      for (const { id, mapPosition } of island.regions) {
        expect(landform.findHeight(mapPosition), id).toBeGreaterThan(
          seaLevel + 0.2,
        );
        expect(landform.findDistanceToWater(mapPosition), id).toBeGreaterThan(
          1.5,
        );
      }
    });

    it("scatters the same things in the same places every visit, clear of every Region", () => {
      const regionPlaces = island.regions.map(({ mapPosition }) => mapPosition);
      const scatters = landform.listScatters(regionPlaces, []);

      expect(scatters).toEqual(landform.listScatters(regionPlaces, []));
      for (const { name, things } of scatters) {
        expect(things.length, name).toBeGreaterThan(0);
        for (const thing of things) {
          expect(thing.height, name).toBeGreaterThan(seaLevel - 0.6);
        }
      }
      const wildThings = scatters
        .filter(
          ({ name }) =>
            ![
              "igloos",
              "market-houses",
              "ruined-columns",
              "camel-caravan",
              "steam-vents",
            ].includes(name),
        )
        .flatMap(({ things }) => things);
      for (const thing of wildThings) {
        for (const place of regionPlaces) {
          expect(
            Math.hypot(thing.x - place.x, thing.z - place.z),
          ).toBeGreaterThan(2.5);
        }
      }
    });
  },
);

describe("every Island's landscape", () => {
  it("differs from every other Island's and from Meadow Isle's, so no two Islands look alike", () => {
    const heightFinders = [
      findTerrainHeight,
      ...islands.map((island) => findLandform(island.id).findHeight),
    ];
    for (const [index, findHeight] of heightFinders.entries()) {
      for (const other of heightFinders.slice(index + 1)) {
        const difference =
          sampleGrid.reduce(
            (total, point) =>
              total + Math.abs(findHeight(point) - other(point)),
            0,
          ) / sampleGrid.length;
        expect(difference).toBeGreaterThan(0.5);
      }
    }
  });
});

describe("Frost Isle", () => {
  it("raises snowy peaks along its north and freezes a channel crossed by an ice bridge", () => {
    expect(findFrostHeight({ x: -15, z: -12 })).toBeGreaterThan(6);
    expect(
      findDistanceToCourse(iceBridgeCrossing, frozenChannel.course),
    ).toBeLessThan(0.3);
    const channelBed = findFrostHeight(iceBridgeCrossing);
    expect(
      findFrostHeight({ x: iceBridgeCrossing.x + 3, z: 1 }),
    ).toBeGreaterThan(channelBed + 0.6);
    expect(
      findFrostHeight({ x: iceBridgeCrossing.x - 3, z: 1 }),
    ).toBeGreaterThan(channelBed + 0.6);
  });
});

describe("Sunscorch Sands", () => {
  it("sinks an oasis below the dunes and raises a flat-topped mesa", () => {
    expect(findSandsHeight(oasisPool.centre)).toBeLessThan(0);
    expect(
      findSandsHeight({ x: oasisPool.centre.x - 6, z: oasisPool.centre.z }),
    ).toBeGreaterThan(0.5);
    expect(findSandsHeight(mesaPosition)).toBeGreaterThan(4);
  });
});

describe("Jungle Reach", () => {
  it("drops its river over a waterfall from the plateau and splits it into a delta that reaches the sea", () => {
    expect(
      jungleReach.findHeight(fallsTop) - jungleReach.findHeight(fallsBottom),
    ).toBeGreaterThan(2.5);
    const deltaBranches = jungleRivers.filter(
      ({ course }) => course[0] === deltaFork,
    );
    expect(deltaBranches).toHaveLength(3);
    for (const { course } of deltaBranches) {
      expect(jungleReach.findHeight(course.at(-1) ?? deltaFork)).toBeLessThan(
        seaLevel,
      );
    }
  });
});

describe("Ember Isle", () => {
  it("raises the volcano above everything and runs its lava rivers from the crater to the sea", () => {
    const peak = emberIsle.findHeight({
      x: emberVolcanoPosition.x + 1.8,
      z: emberVolcanoPosition.z,
    });
    expect(peak).toBeGreaterThan(6);
    for (const { course } of lavaRivers) {
      const [source] = course;
      expect(
        Math.hypot(
          source.x - emberVolcanoPosition.x,
          source.z - emberVolcanoPosition.z,
        ),
      ).toBeLessThan(2.5);
      expect(emberIsle.findHeight(course.at(-1) ?? source)).toBeLessThan(
        seaLevel,
      );
    }
  });

  it("stands obsidian cliffs high above the sea along its east coast", () => {
    expect(emberIsle.findHeight({ x: 19, z: 0 })).toBeGreaterThan(2.5);
  });
});

describe("Starfall Isle", () => {
  it("lifts the observatory on a hill, dents a star crater and floats rocks high over the land", () => {
    expect(findStarfallHeight(observatoryHill)).toBeGreaterThan(3);
    expect(findStarfallHeight(starCraterPosition)).toBeLessThan(
      findStarfallHeight({
        x: starCraterPosition.x + 1.8,
        z: starCraterPosition.z,
      }),
    );
    for (const rock of floatingRockPlaces) {
      expect(rock.height).toBeGreaterThan(6);
    }
  });
});
