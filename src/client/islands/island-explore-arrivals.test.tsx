// Arriving on an Island: the ship at the Dock, and each craft coming in to land.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { findExploreAdventure } from "./island-adventures.js";
import { IslandExploreScene } from "./island-explore.js";
import { findPierWaitingSpot, type VoyagePhase } from "./island-voyage.js";
import {
  findJourneyCarriedSpot,
  findJourneyWaitingSpot,
  findLandPhaseSeconds,
  type Transport,
} from "./island-journey.js";
import type { VoyageView } from "./island-explore-hud.js";
import {
  countDrawnTriangles,
  exploreMeshBudget,
  exploreTriangleBudget,
  findExplorer,
  findIslandOnMap,
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
  "the ship at the Dock on %s",
  (islandId) => {
    const voyageTo = (phase: VoyagePhase): VoyageView => {
      const island = findIslandOnMap(islandId);
      return {
        phase,
        transport: "ship",
        fromIsland: island,
        toIsland: island,
        islands: islandsOnMap,
        regions: [],
      };
    };

    it("sails in and stays within the explore budget, the Character waiting on the pier", async () => {
      const { renderer } = await renderExplore(islandId, {
        voyage: voyageTo("calling"),
      });
      await renderer.advanceFrames(3, frameSeconds);

      const meshes = listMeshes(renderer);
      expect(findNamed(renderer, "voyage-ship")).toHaveLength(1);
      expect(findNamed(renderer, "wizzaroo-flags")).toHaveLength(1);
      expect(meshes.length).toBeLessThanOrEqual(exploreMeshBudget);
      expect(
        meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
      ).toBeLessThanOrEqual(exploreTriangleBudget);
      const waiting = findPierWaitingSpot(findExploreAdventure(islandId).dock);
      const explorer = findExplorer(renderer);
      expect(explorer.position.x).toBeCloseTo(waiting.x);
      expect(explorer.position.z).toBeCloseTo(waiting.z);
    });
  },
);

describe.each(
  islandsOnMap.flatMap(({ id }) =>
    (["aeroplane", "helicopter", "hovercraft", "submarine"] as const).map(
      (transport) => [transport, id] as const,
    ),
  ),
)("the %s at its landing place on %s", (transport, islandId) => {
  const journeyTo = (phase: VoyagePhase): VoyageView => {
    const island = findIslandOnMap(islandId);
    return {
      phase,
      transport,
      fromIsland: island,
      toIsland: island,
      islands: islandsOnMap,
      regions: [],
    };
  };

  it("comes in to land within the explore budget, the Character waiting beside it", async () => {
    const { renderer } = await renderExplore(islandId, {
      voyage: journeyTo("calling"),
    });
    await renderer.advanceFrames(3, frameSeconds);

    expect(findNamed(renderer, `voyage-${transport}`)).toHaveLength(1);
    expect(findNamed(renderer, `voyage-${transport}-livery`)).toHaveLength(1);
    const meshes = listMeshes(renderer);
    expect(meshes.length).toBeLessThanOrEqual(exploreMeshBudget);
    expect(
      meshes.reduce((total, mesh) => total + countDrawnTriangles(mesh), 0),
    ).toBeLessThanOrEqual(exploreTriangleBudget);
    const waiting = findJourneyWaitingSpot(
      findExploreAdventure(islandId),
      transport,
    );
    const explorer = findExplorer(renderer);
    expect(explorer.position.x).toBeCloseTo(waiting.x);
    expect(explorer.position.z).toBeCloseTo(waiting.z);
    expect(explorer.visible).toBe(true);
  });
});

describe("carrying the Character by hot-air balloon", () => {
  it("shows them riding in the basket, with the balloon and its burner flame, then sets them down beside it", async () => {
    const adventure = findExploreAdventure("ember-isle");
    const island = findIslandOnMap("ember-isle");
    const journey = (phase: VoyagePhase): VoyageView => ({
      phase,
      transport: "balloon",
      fromIsland: island,
      toIsland: island,
      islands: islandsOnMap,
      regions: [],
    });
    const { renderer, sceneProps } = await renderExplore("ember-isle", {
      voyage: journey("docking"),
    });
    await renderer.advanceFrames(30, frameSeconds);
    expect(findNamed(renderer, "voyage-balloon")).toHaveLength(1);
    expect(findNamed(renderer, "voyage-balloon-livery")).toHaveLength(1);
    expect(findNamed(renderer, "voyage-balloon-glow")).toHaveLength(1);
    const onBoard = findJourneyCarriedSpot(
      adventure,
      "balloon",
      "docking",
      (30 * frameSeconds) / findLandPhaseSeconds("balloon", "docking"),
    );
    expect(onBoard.isInside).toBe(false);
    expect(findExplorer(renderer).visible).toBe(true);
    expect(findExplorer(renderer).position.y).toBeCloseTo(onBoard.y, 0);

    await renderer.update(
      <IslandExploreScene
        sceneProps={{ ...sceneProps, voyage: journey("leaving") }}
        isEffectsOn
        timeOfDay="day"
        weather="clear"
      />,
    );
    await renderer.advanceFrames(3, frameSeconds);

    const waiting = findJourneyWaitingSpot(adventure, "balloon");
    expect(findExplorer(renderer).visible).toBe(true);
    expect(findExplorer(renderer).position.x).toBeCloseTo(waiting.x, 0);
    expect(findExplorer(renderer).position.z).toBeCloseTo(waiting.z, 0);
  });
});

describe.each(["aeroplane", "helicopter"] as const satisfies Transport[])(
  "carrying the Character by %s",
  (transport) => {
    it("hides them inside while it flies, then sets them down beside it", async () => {
      const adventure = findExploreAdventure("ember-isle");
      const island = findIslandOnMap("ember-isle");
      const journey = (phase: VoyagePhase): VoyageView => ({
        phase,
        transport,
        fromIsland: island,
        toIsland: island,
        islands: islandsOnMap,
        regions: [],
      });
      const { renderer, sceneProps } = await renderExplore("ember-isle", {
        voyage: journey("docking"),
      });
      await renderer.advanceFrames(30, frameSeconds);
      const onBoard = findJourneyCarriedSpot(
        adventure,
        transport,
        "docking",
        30 * frameSeconds,
      );
      expect(onBoard.isInside).toBe(true);
      expect(findExplorer(renderer).visible).toBe(false);

      await renderer.update(
        <IslandExploreScene
          sceneProps={{ ...sceneProps, voyage: journey("leaving") }}
          isEffectsOn
          timeOfDay="day"
          weather="clear"
        />,
      );
      await renderer.advanceFrames(3, frameSeconds);

      const waiting = findJourneyWaitingSpot(adventure, transport);
      expect(findExplorer(renderer).visible).toBe(true);
      expect(findExplorer(renderer).position.x).toBeCloseTo(waiting.x, 0);
      expect(findExplorer(renderer).position.z).toBeCloseTo(waiting.z, 0);
    });
  },
);
