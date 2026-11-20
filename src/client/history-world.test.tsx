import {
  islandStagePropMeshes,
  islandStagePropTriangleBudget,
} from "./islands/island-stage-props.js";
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  historyChoiceProps,
  historyQuests,
  historyScenes,
  type HistoryQuest,
} from "../curriculum/history-quests.js";
import { historyPropKinds, historyPropSets } from "./history-props.js";
import { historySceneLooks } from "./history-scenes.js";
import { HistoryQuestWorld } from "./history-world.js";
import type { QuestionPrompt } from "./mission/mission.js";

const triangleBudget = 10_000 - islandStagePropTriangleBudget;
const meshBudget = 40 - islandStagePropMeshes;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  renderer.scene
    .findAll(({ instance }) => isMesh(instance))
    .map(({ instance }) => instance)
    .filter(isMesh);

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const countDrawnTriangles = (mesh: Mesh): number =>
  countTriangles(mesh.geometry) *
  (mesh instanceof InstancedMesh ? mesh.count : 1);

const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

const busiestTimeline: QuestionPrompt = {
  kind: "history",
  play: "timeline",
  ask: "Which came next?",
  fact: "A fact.",
  hint: "A hint.",
  placedEvents: [
    { label: "First", date: "c. 3000 BC" },
    { label: "Second", date: "AD 43" },
    { label: "Third", date: "1066" },
    { label: "Fourth", date: "1666" },
  ],
};

const renderQuestWorld = async (
  historyQuest: HistoryQuest,
  prompt: QuestionPrompt = busiestTimeline,
) => {
  const renderer = await ReactThreeTestRenderer.create(
    <HistoryQuestWorld
      historyQuest={historyQuest}
      prompt={prompt}
      choices={["One", "Two", "Three", "Four"]}
      hiddenChoiceIndexes={[]}
      companionMood="waiting"
      poppedChoiceIndex={0}
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

const findQuestIn = (scene: (typeof historyScenes)[number]): HistoryQuest => {
  const quest = historyQuests.find((candidate) => candidate.scene === scene);
  return {
    ...(quest ?? historyQuests[0]),
    scene,
  };
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("historySceneLooks", () => {
  it("draws every History scene, and every quest's scene and choice prop is one it can draw", () => {
    expect(Object.keys(historySceneLooks).toSorted()).toEqual(
      [...historyScenes].toSorted(),
    );
    for (const quest of historyQuests) {
      expect(historyScenes).toContain(quest.scene);
      expect(historyChoiceProps).toContain(quest.choiceProp);
    }
  });

  it("never gives two props the same name, so one can't replace another", () => {
    const everyName = Object.values(historyPropSets).flat();

    expect(new Set(everyName).size).toBe(everyName.length);
  });

  it("places only props it knows how to build, behind the choices and in front of the backdrop", () => {
    for (const look of Object.values(historySceneLooks)) {
      for (const placement of look.props) {
        expect(historyPropKinds).toContain(placement.kind);
        expect(placement.z).toBeLessThan(-3);
        expect(placement.z).toBeGreaterThan(-look.backdropDistance);
      }
    }
  });
});

describe("HistoryQuestWorld", () => {
  it.each(historyScenes)(
    `draws %s with a full timeline and four choices within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (scene) => {
      const renderer = await renderQuestWorld(findQuestIn(scene));
      const meshes = listMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );

      expect(triangles).toBeLessThanOrEqual(triangleBudget);
      expect(meshes.length).toBeLessThanOrEqual(meshBudget);
      await renderer.unmount();
    },
  );

  it.each(historyChoiceProps)(
    "draws the %s choice prop under every answer",
    async (choiceProp) => {
      const renderer = await renderQuestWorld({
        ...historyQuests[0],
        choiceProp,
      });

      expect(findNamed(renderer, `choice-${choiceProp}`)).toHaveLength(4);
      await renderer.unmount();
    },
  );

  it("hangs one card on the timeline for each event already placed", async () => {
    const renderer = await renderQuestWorld(historyQuests[0]);

    expect(findNamed(renderer, "timeline-card")).toHaveLength(4);
    await renderer.unmount();
  });

  it("shows the thing to sort on a card, and no timeline, in a sort quest", async () => {
    const renderer = await renderQuestWorld(historyQuests[0], {
      ...busiestTimeline,
      play: "sort",
      ask: "A wooden spinning top",
      placedEvents: [],
    });

    expect(findNamed(renderer, "sort-item-card")).toHaveLength(1);
    expect(findNamed(renderer, "timeline-rail")).toHaveLength(0);
    await renderer.unmount();
  });
});
