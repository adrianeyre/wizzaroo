import {
  islandStagePropMeshes,
  islandStagePropTriangleBudget,
} from "./islands/island-stage-props.js";
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { BayGameWorld, type BayGameType } from "./bay-games.js";
import {
  buildChangingTenLayout,
  listPlaceValueSpots,
} from "./bay-place-value.js";
import { buildTakeAwayPicture } from "./bay-sums-scenes.js";
import type { QuestionPrompt } from "./mission/mission.js";

const triangleBudget = 10_000 - islandStagePropTriangleBudget;
const meshBudget = 40 - islandStagePropMeshes;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listMeshes = (renderer: ReactThreeTest.Renderer): Mesh[] =>
  renderer.scene
    .findAllByType("Mesh")
    .map(({ instance }) => instance)
    .filter(isMesh);

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const countDrawnTriangles = (mesh: Mesh): number =>
  countTriangles(mesh.geometry) *
  (mesh instanceof InstancedMesh ? mesh.count : 1);

const countNamedInstances = (
  renderer: ReactThreeTest.Renderer,
  name: string,
): number =>
  renderer.scene
    .findAll(({ instance }) => instance.name === name)
    .map(({ instance }) => instance)
    .reduce(
      (total, instance) =>
        total + (instance instanceof InstancedMesh ? instance.count : 0),
      0,
    );

const renderBayGame = async (gameType: BayGameType, prompt: QuestionPrompt) => {
  const renderer = await ReactThreeTestRenderer.create(
    <BayGameWorld
      gameType={gameType}
      prompt={prompt}
      choices={["1", "2", "3", "4"]}
      hiddenChoiceIndexes={[]}
      companionMood="waiting"
      poppedChoiceIndex={undefined}
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

const heaviestScenes: { gameType: BayGameType; prompt: QuestionPrompt }[] = [
  {
    gameType: "shell-sums",
    prompt: {
      kind: "addition",
      addition: { first: 10, second: 10, answer: 20 },
    },
  },
  {
    gameType: "shell-sums",
    prompt: {
      kind: "addition",
      addition: { first: 89, second: 9, answer: 98 },
    },
  },
  {
    gameType: "shell-sums",
    prompt: {
      kind: "addition",
      addition: { first: 39, second: 50, answer: 89 },
    },
  },
  {
    gameType: "crab-take-away",
    prompt: {
      kind: "taking-away",
      takingAway: { start: 20, takenAway: 5, answer: 15 },
    },
  },
  {
    gameType: "crab-take-away",
    prompt: {
      kind: "taking-away",
      takingAway: { start: 89, takenAway: 9, answer: 80 },
    },
  },
  {
    gameType: "crab-take-away",
    prompt: {
      kind: "taking-away",
      takingAway: { start: 88, takenAway: 9, answer: 79 },
    },
  },
  { gameType: "fish-count", prompt: { kind: "count", count: 99 } },
  {
    gameType: "ten-frames",
    prompt: {
      kind: "one-more-one-less",
      oneMoreOneLess: { start: 89, step: "ten-more", answer: 99 },
    },
  },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("the sums and place-value scenes", () => {
  it.each(heaviestScenes)(
    `draw the busiest $gameType scenes within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async ({ gameType, prompt }) => {
      const renderer = await renderBayGame(gameType, prompt);
      const meshes = listMeshes(renderer);
      const triangles = meshes.reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );

      expect(triangles).toBeGreaterThan(0);
      expect(triangles).toBeLessThanOrEqual(triangleBudget);
      expect(meshes.length).toBeLessThanOrEqual(meshBudget);
      await renderer.unmount();
    },
  );

  it("puts one pearl in the clams for each one being added", async () => {
    const renderer = await renderBayGame("shell-sums", {
      kind: "addition",
      addition: { first: 3, second: 6, answer: 9 },
    });

    expect(countNamedInstances(renderer, "pearls")).toBe(9);
    expect(countNamedInstances(renderer, "ten-rods")).toBe(0);
    await renderer.unmount();
  });

  it("shows a two-digit part as ten-rods and pearls", async () => {
    const renderer = await renderBayGame("shell-sums", {
      kind: "addition",
      addition: { first: 34, second: 20, answer: 54 },
    });

    expect(countNamedInstances(renderer, "ten-rods")).toBe(5);
    expect(countNamedInstances(renderer, "pearls")).toBe(4);
    await renderer.unmount();
  });

  it("draws every crab at the start, with the ones taken away scuttling off", async () => {
    const renderer = await renderBayGame("crab-take-away", {
      kind: "taking-away",
      takingAway: { start: 13, takenAway: 4, answer: 9 },
    });

    expect(countNamedInstances(renderer, "crabs")).toBe(9);
    expect(countNamedInstances(renderer, "crabs-leaving")).toBe(4);
    await renderer.unmount();
  });

  it("lifts whole ten-rods away when tens are taken", async () => {
    const renderer = await renderBayGame("crab-take-away", {
      kind: "taking-away",
      takingAway: { start: 67, takenAway: 30, answer: 37 },
    });

    expect(countNamedInstances(renderer, "ten-rods")).toBe(3);
    expect(countNamedInstances(renderer, "ten-rods-leaving")).toBe(3);
    expect(countNamedInstances(renderer, "crabs")).toBe(7);
    await renderer.unmount();
  });

  it("counts tens as rods and ones as fish past 20", async () => {
    const renderer = await renderBayGame("fish-count", {
      kind: "count",
      count: 47,
    });

    expect(countNamedInstances(renderer, "ten-rods")).toBe(4);
    expect(countNamedInstances(renderer, "one-fish")).toBe(7);
    await renderer.unmount();
  });

  it("adds a glowing rod for ten more, and lifts one away for ten less", async () => {
    const more = await renderBayGame("ten-frames", {
      kind: "one-more-one-less",
      oneMoreOneLess: { start: 34, step: "ten-more", answer: 44 },
    });
    expect(countNamedInstances(more, "ten-rods")).toBe(3);
    expect(countNamedInstances(more, "ten-rod-added")).toBe(1);
    expect(countNamedInstances(more, "one-cubes")).toBe(4);
    await more.unmount();

    const less = await renderBayGame("ten-frames", {
      kind: "one-more-one-less",
      oneMoreOneLess: { start: 52, step: "ten-less", answer: 42 },
    });
    expect(countNamedInstances(less, "ten-rods")).toBe(4);
    expect(countNamedInstances(less, "ten-rod-taken")).toBe(1);
    await less.unmount();
  });
});

describe("buildTakeAwayPicture", () => {
  it("exchanges a ten for ten ones when more ones are taken than are shown", () => {
    expect(
      buildTakeAwayPicture({ start: 43, takenAway: 7, answer: 36 }),
    ).toEqual({
      tens: 3,
      ones: 13,
      leavingTens: 0,
      leavingOnes: 7,
    });
  });
});

describe("listPlaceValueSpots", () => {
  it("puts the tens left to right with the ones to their right, bottom up", () => {
    const { rodSpots, oneSpots } = listPlaceValueSpots(3, 6, {
      unit: 0.1,
      rodGap: 0.15,
      oneGap: 0.12,
      groupGap: 0.16,
    });

    expect(rodSpots).toHaveLength(3);
    expect(oneSpots).toHaveLength(6);
    expect(Math.min(...oneSpots.map(([x]) => x))).toBeGreaterThan(
      Math.max(...rodSpots.map(([x]) => x)),
    );
    expect(oneSpots[1][1]).toBeGreaterThan(oneSpots[0][1]);
  });
});

describe("buildChangingTenLayout", () => {
  it("keeps the rods still while one ten arrives or leaves", () => {
    expect(
      buildChangingTenLayout({ start: 34, step: "ten-more", answer: 44 }),
    ).toEqual({ settledTens: 3, ones: 4, changingRodIndex: 3, slotCount: 4 });
    expect(
      buildChangingTenLayout({ start: 52, step: "ten-less", answer: 42 }),
    ).toEqual({ settledTens: 4, ones: 2, changingRodIndex: 4, slotCount: 5 });
  });
});
