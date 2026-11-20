// Every Attraction, Curiosity and Quest site on every Island, drawn one by one: minutes an Island, so these
// run in the Island sweeps workflow (pnpm test:sweeps), not on every pull request.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { findExploreAdventure } from "./island-adventures.js";
import { listAttractionInteractions } from "./island-attractions.js";
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
  "the Attractions and Curiosities on %s",
  (islandId) => {
    it("draws each one in full beside the Character, within the explore budget", async () => {
      const adventure = findExploreAdventure(islandId);
      for (const interaction of listAttractionInteractions(adventure)) {
        const { renderer } = await renderExplore(islandId, {
          start: interaction.position,
        });
        await renderer.advanceFrames(90, frameSeconds);
        const kind = interaction.id.slice(islandId.length + 1);
        const near = findNamed(renderer, `attraction-${kind}-near`);
        expect(near.length, kind).toBe(1);
        expect(near[0].instance.visible, kind).toBe(true);
        const meshes = listMeshes(renderer);
        expect(meshes.length, kind).toBeLessThanOrEqual(exploreMeshBudget);
        expect(
          meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
          kind,
        ).toBeLessThanOrEqual(exploreTriangleBudget);
        await renderer.unmount();
      }
    });
  },
);

describe.each(islandsOnMap.map(({ id }) => [id] as const))(
  "the Quest on %s",
  (islandId) => {
    it("draws the Islanders, things and Finds near the Character, within the explore budget", async () => {
      const sites = questSites[islandId] ?? [];
      const sampled = (["thing", "islander", "find"] as const).flatMap((kind) =>
        sites.filter((site) => site.kind === kind).slice(0, 3),
      );
      for (const site of sampled) {
        const { renderer } = await renderExplore(islandId, {
          start: { x: site.centre.x + 2.4, z: site.centre.z },
        });
        await renderer.advanceFrames(30, frameSeconds);
        const name =
          site.kind === "thing"
            ? "quest-things"
            : site.kind === "islander"
              ? "quest-islanders"
              : "quest-finds";
        expect(findNamed(renderer, name).length, site.id).toBe(1);
        const meshes = listMeshes(renderer);
        expect(meshes.length, site.id).toBeLessThanOrEqual(exploreMeshBudget);
        expect(
          meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
          site.id,
        ).toBeLessThanOrEqual(exploreTriangleBudget);
        await renderer.unmount();
      }
    });
  },
);
