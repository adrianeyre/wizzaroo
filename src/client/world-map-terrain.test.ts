import { describe, expect, it } from "vitest";
import { findSailingBoatPlacement } from "./world-map-scene.js";
import { listIslandRegions } from "../curriculum/world-map.js";
import {
  buildFarmHamletHouses,
  buildVillageHouses,
  findDistanceToRiver,
  findGroundColourKind,
  findTerrainHeight,
  mountainPosition,
  riverBedDepth,
  riverCourse,
  scatterAcrossLand,
  seaLevel,
  snowLine,
  volcanoPosition,
} from "./world-map-terrain.js";

describe("findTerrainHeight", () => {
  it("makes one land surrounded by sea", () => {
    expect(findTerrainHeight({ x: 0, z: 0 })).toBeGreaterThan(seaLevel);
    for (const edge of [
      { x: 114, z: 0 },
      { x: -114, z: 0 },
      { x: 92, z: 22 },
      { x: -92, z: -22 },
      { x: 0, z: 22 },
      { x: 0, z: -22 },
    ]) {
      expect(findTerrainHeight(edge)).toBeLessThan(seaLevel);
    }
  });

  it("raises snowy mountains and a volcano well above the grassland", () => {
    expect(findTerrainHeight(mountainPosition)).toBeGreaterThan(snowLine);
    expect(findTerrainHeight(volcanoPosition)).toBeGreaterThan(
      findTerrainHeight({ x: -6, z: 4 }) + 2,
    );
  });

  it("carves the river below its banks all the way from the mountains to the sea", () => {
    for (const point of riverCourse.slice(0, -1)) {
      expect(findTerrainHeight(point)).toBeLessThanOrEqual(riverBedDepth);
      expect(findDistanceToRiver(point)).toBe(0);
    }
    expect(findTerrainHeight({ x: -2, z: 8 })).toBeGreaterThan(seaLevel);
  });

  it("keeps every Region on Meadow Isle on dry land", () => {
    for (const { mapPosition } of listIslandRegions("meadow-isle")) {
      expect(findTerrainHeight(mapPosition)).toBeGreaterThan(seaLevel);
    }
  });
});

describe("findGroundColourKind", () => {
  it("colours beaches, grass, rock and snow by height", () => {
    expect(findGroundColourKind(0.1)).toBe("sand");
    expect(findGroundColourKind(1.5)).toBe("grass");
    expect(findGroundColourKind(4)).toBe("rock");
    expect(findGroundColourKind(snowLine + 1)).toBe("snow");
  });
});

describe("scatterAcrossLand", () => {
  const rules = {
    count: 80,
    seed: 7,
    lowest: 0.5,
    highest: 3.4,
    keepClearOf: [volcanoPosition],
    clearance: 4,
  };

  it("scatters the same things in the same places every time, so the map never changes between visits", () => {
    expect(scatterAcrossLand(rules)).toEqual(scatterAcrossLand(rules));
    expect(scatterAcrossLand(rules)).toHaveLength(80);
  });

  it("keeps scattered things on land at the heights asked for, out of the river and clear of other places", () => {
    for (const thing of scatterAcrossLand(rules)) {
      expect(thing.height).toBeGreaterThanOrEqual(rules.lowest);
      expect(thing.height).toBeLessThanOrEqual(rules.highest);
      expect(findDistanceToRiver(thing)).toBeGreaterThan(2);
      expect(
        Math.hypot(thing.x - volcanoPosition.x, thing.z - volcanoPosition.z),
      ).toBeGreaterThan(rules.clearance);
    }
  });
});

describe("buildFarmHamletHouses", () => {
  it("builds seven farm hamlets of houses on dry land, four of them on the new lands", () => {
    const houses = buildFarmHamletHouses();

    expect(houses).toHaveLength(28);
    expect(houses.filter(({ x }) => Math.abs(x) > 30)).toHaveLength(16);
    expect(houses.every(({ height }) => height > seaLevel)).toBe(true);
  });
});

describe("buildVillageHouses", () => {
  it("builds three villages of houses on dry land", () => {
    const houses = buildVillageHouses();

    expect(houses).toHaveLength(21);
    expect(houses.every(({ height }) => height > seaLevel)).toBe(true);
  });
});

describe("the sailing boat round Meadow Isle", () => {
  it("sails all the way round the Island, new lands and all, without crossing land", () => {
    const loopSeconds = (Math.PI * 2) / 0.022;
    Array.from({ length: 721 }, (_, step) =>
      findSailingBoatPlacement((loopSeconds * step) / 720),
    ).forEach(({ x, z }) => {
      expect(
        findTerrainHeight({ x, z }),
        `${String(x)}, ${String(z)}`,
      ).toBeLessThan(-0.5);
    });
  });

  it("points its bow the way it is sailing", () => {
    const now = findSailingBoatPlacement(100);
    const soon = findSailingBoatPlacement(101);
    expect(Math.atan2(soon.x - now.x, soon.z - now.z)).toBeCloseTo(
      now.heading,
      1,
    );
  });
});
