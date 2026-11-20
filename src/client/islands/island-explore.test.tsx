// Each Island's explore scene and Quest; the arrivals and the journeys are in island-explore-arrivals.test.tsx and
// island-explore-travel.test.tsx, so the three run side by side.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { findExploreAdventure } from "./island-adventures.js";
import { questSites } from "./island-quest-sites.js";
import {
  countDrawnTriangles,
  exploreMeshBudget,
  exploreTriangleBudget,
  findNamed,
  frameSeconds,
  islandsOnMap,
  listMeshes,
  renderExplore,
} from "./island-explore-scene.test-support.js";

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe.each(islandsOnMap.map(({ id }) => [id] as const))(
  "IslandExploreScene on %s",
  (islandId) => {
    it("draws the Child's Character on the Island with its trails, signs, bounce pads and treasures, within the explore budget", async () => {
      const { renderer } = await renderExplore(islandId);
      await renderer.advanceFrames(2, frameSeconds);

      [
        "explorer",
        "character",
        "trails",
        "fact-sign",
        "bounce-pad",
        "treasure-gems",
        "hideaway",
        "trail-lamps",
        "watchtower",
        "dock",
        "island-flag",
        "island-wonders",
        "wonder-grove",
        "attractions",
        "wonder-flowers",
        "hot-air-balloon",
        "railway-track",
        "railway-structures",
        "train-locomotive",
        "train-carriages",
        `friends-${findExploreAdventure(islandId).friendKind.look}`,
      ].forEach((name) => {
        expect(findNamed(renderer, name).length, name).toBeGreaterThan(0);
      });
      expect(findNamed(renderer, "island-adventure-on-map")).toEqual([]);
      expect(findNamed(renderer, "map-attractions")).toEqual([]);
      const meshes = listMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );
      expect(meshes.length).toBeLessThanOrEqual(exploreMeshBudget);
      expect(triangles).toBeLessThanOrEqual(exploreTriangleBudget);
    });
  },
);

describe.each(islandsOnMap.map(({ id }) => [id] as const))(
  "the Quest on %s",
  (islandId) => {
    it("picks up a Find the Character walks onto", async () => {
      const find = (questSites[islandId] ?? []).find(
        ({ kind }) => kind === "find",
      );
      expect(find).toBeDefined();
      const { renderer, record } = await renderExplore(islandId, {
        start: find?.centre,
      });
      await renderer.advanceFrames(5, frameSeconds);
      expect(record.questFindIds).toEqual([find?.id]);
      await renderer.unmount();
    });
  },
);
