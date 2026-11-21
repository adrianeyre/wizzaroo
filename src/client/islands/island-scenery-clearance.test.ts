import { describe, expect, it } from "vitest";
import { islands as curriculumIslands } from "../../curriculum/islands.js";
import { listIslandRegions } from "../../curriculum/world-map.js";
import { listMeadowScatters } from "../world-map-islands.js";
import {
  balloonFieldFlatRadius,
  findRunwayOffset,
  helipadFlatRadius,
  runwayApproachLength,
  runwayFlatHalfWidth,
  runwayHalfLength,
  type MapPoint,
} from "../world-map-terrain.js";
import {
  exploreScale,
  findDistanceToTrail,
  findExploreAdventure,
  findIslandAdventure,
  islandAdventures,
  trailHalfWidth,
} from "./island-adventures.js";
import { listIslandScatters } from "./island-scene.js";
import { scatterGrove } from "./island-wonders.js";

const islandIds = islandAdventures.map(({ islandId }) => [islandId] as const);

const trunkReach = 0.2;

const treeScatterNames: ReadonlySet<string> = new Set([
  "snowy-pines",
  "palms",
  "jungle-canopy",
  "ferns",
  "charred-trees",
  "night-pines",
]);

const listTrees = (islandId: string): MapPoint[] => {
  const grove = scatterGrove(findExploreAdventure(islandId)).map(
    ({ x, z }) => ({ x: x / exploreScale, z: z / exploreScale }),
  );
  if (islandId === "meadow-isle") {
    const { pines, broadleaves, bushes } = listMeadowScatters(
      listIslandRegions(islandId).map(({ mapPosition }) => mapPosition),
    );
    return [...pines, ...broadleaves, ...bushes, ...grove];
  }
  const island = curriculumIslands.find(({ id }) => id === islandId);
  if (island === undefined) {
    throw new Error(`No Island ${islandId}`);
  }
  return [
    ...listIslandScatters(island)
      .filter(({ name }) => treeScatterNames.has(name))
      .flatMap(({ things }) => things),
    ...grove,
  ];
};

const findDistance = (from: MapPoint, to: MapPoint): number =>
  Math.hypot(from.x - to.x, from.z - to.z);

describe.each(islandIds)("the trees of %s", (islandId) => {
  const adventure = findIslandAdventure(islandId);
  const trees = listTrees(islandId);

  it("grows plenty of trees", () => {
    expect(trees.length).toBeGreaterThan(50);
  });

  it("keeps every tree trunk off the trails", () => {
    const onTrails = trees.filter(
      (tree) =>
        findDistanceToTrail(adventure, tree) <= trailHalfWidth + trunkReach,
    );
    expect(onTrails).toEqual([]);
  });

  it("keeps every tree trunk off the Runway and the strips beyond its ends", () => {
    const onRunway = trees.filter((tree) => {
      const { along, across } = findRunwayOffset(
        adventure.airfield.runway,
        tree,
      );
      return (
        Math.abs(along) <= runwayHalfLength + runwayApproachLength &&
        Math.abs(across) <= runwayFlatHalfWidth + trunkReach
      );
    });
    expect(onRunway).toEqual([]);
  });

  it("keeps every tree trunk off the Helipad and the Balloon Field", () => {
    const { helipad, balloonField } = adventure.airfield;
    const onPads = trees.filter(
      (tree) =>
        findDistance(tree, helipad.centre) <= helipadFlatRadius + trunkReach ||
        findDistance(tree, balloonField.centre) <=
          balloonFieldFlatRadius + trunkReach,
    );
    expect(onPads).toEqual([]);
  });
});
