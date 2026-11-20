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
  buildCounterLayout,
  buildMoreOrLessCounters,
  buildTakeAwayCounters,
  exchangeForTakingAway,
  listCounterColumns,
  splitIntoColumns,
} from "./bay-counters.js";
import { BayGameWorld, type BayGameType } from "./bay-games.js";
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

const countNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name).length;

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

const busiestScenes: { gameType: BayGameType; prompt: QuestionPrompt }[] = [
  {
    gameType: "fish-count",
    prompt: {
      kind: "place-value",
      columns: [
        { value: 1000, count: 9 },
        { value: 100, count: 19 },
        { value: 10, count: 19 },
        { value: 1, count: 9 },
      ],
    },
  },
  {
    gameType: "ten-frames",
    prompt: {
      kind: "more-or-less",
      moreOrLess: { start: 860_402, change: -100_000, answer: 760_402 },
    },
  },
  {
    gameType: "shell-sums",
    prompt: {
      kind: "addition",
      addition: { first: 3768, second: 2547, answer: 6315 },
    },
  },
  {
    gameType: "shell-sums",
    prompt: {
      kind: "addition",
      addition: { first: 3.47, second: 2.58, answer: 6.05 },
    },
  },
  {
    gameType: "crab-take-away",
    prompt: {
      kind: "taking-away",
      takingAway: { start: 6315, takenAway: 2547, answer: 3768 },
    },
  },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("the place-value counter scenes", () => {
  it.each(busiestScenes)(
    `draws the busiest $gameType $prompt.kind scene within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async ({ gameType, prompt }) => {
      const renderer = await renderBayGame(gameType, prompt);
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

  it("draws the counters in each column of a place-value number", async () => {
    const renderer = await renderBayGame("fish-count", {
      kind: "place-value",
      columns: [
        { value: 100, count: 3 },
        { value: 10, count: 14 },
        { value: 1, count: 2 },
      ],
    });

    expect(countNamed(renderer, "place-value-counters")).toBe(1);
    expect(countNamedInstances(renderer, "counters-100")).toBe(3);
    expect(countNamedInstances(renderer, "counters-10")).toBe(14);
    expect(countNamedInstances(renderer, "counters-1")).toBe(2);
    await renderer.unmount();
  });

  it("shows the counter being taken for 100,000 less", async () => {
    const renderer = await renderBayGame("ten-frames", busiestScenes[1].prompt);

    expect(countNamed(renderer, "counter-taken")).toBe(1);
    expect(countNamedInstances(renderer, "counters-100000")).toBe(7);
    await renderer.unmount();
  });

  it("shows the counter being added for 1000 more", async () => {
    const renderer = await renderBayGame("ten-frames", {
      kind: "more-or-less",
      moreOrLess: { start: 3456, change: 1000, answer: 4456 },
    });

    expect(countNamed(renderer, "counter-added")).toBe(1);
    expect(countNamedInstances(renderer, "counters-1000")).toBe(3);
    await renderer.unmount();
  });

  it("puts both numbers of a sum in the same columns, with a plus sign", async () => {
    const renderer = await renderBayGame("shell-sums", busiestScenes[2].prompt);

    expect(countNamed(renderer, "counters-sum")).toBe(1);
    expect(countNamed(renderer, "plus-sign")).toBe(1);
    expect(countNamedInstances(renderer, "counters-1000")).toBe(5);
    expect(countNamedInstances(renderer, "counters-1")).toBe(15);
    await renderer.unmount();
  });

  it("lifts away the counters being taken, after exchanging where a column runs short", async () => {
    const renderer = await renderBayGame(
      "crab-take-away",
      busiestScenes[4].prompt,
    );

    expect(countNamed(renderer, "counters-difference")).toBe(1);
    expect(countNamedInstances(renderer, "counters-leaving-1")).toBe(7);
    expect(countNamedInstances(renderer, "counters-1")).toBe(8);
    await renderer.unmount();
  });
});

describe("listCounterColumns", () => {
  it("spans from the highest place to the lowest non-zero place", () => {
    expect(listCounterColumns([245_000, 132_000])).toEqual([
      100_000, 10_000, 1000,
    ]);
    expect(listCounterColumns([3.47, 2.58])).toEqual([1, 0.1, 0.01]);
    expect(listCounterColumns([368, 257])).toEqual([100, 10, 1]);
    expect(listCounterColumns([0])).toEqual([1]);
  });
});

describe("splitIntoColumns", () => {
  it("counts each column without floating-point slips", () => {
    expect(splitIntoColumns(6.05, [1, 0.1, 0.01])).toEqual([6, 0, 5]);
    expect(splitIntoColumns(2_750_000, [1_000_000, 100_000, 10_000])).toEqual([
      2, 7, 5,
    ]);
  });
});

describe("exchangeForTakingAway", () => {
  it("borrows from the next column that has counters", () => {
    expect(exchangeForTakingAway([6, 3, 1, 5], [2, 5, 4, 7])).toEqual({
      shown: [5, 12, 10, 15],
      taken: [2, 5, 4, 7],
      exchangedColumns: [3, 2, 1],
    });
    expect(exchangeForTakingAway([4, 0, 8], [0, 1, 0]).shown).toEqual([
      3, 10, 8,
    ]);
  });

  it("works out the counters for a take-away and a more or less", () => {
    expect(
      buildTakeAwayCounters({ start: 47.5, takenAway: 2.5, answer: 45 })
        .columnValues,
    ).toEqual([10, 1, 0.1]);
    expect(
      buildMoreOrLessCounters({
        start: 408_765,
        change: -10_000,
        answer: 398_765,
      }).counts,
    ).toEqual([3, 10, 8, 7, 6, 5]);
  });
});

describe("buildCounterLayout", () => {
  it("keeps a column's counters in a grid five high and widens a column past ten", () => {
    const layout = buildCounterLayout([[3, 14]], 5, false);
    const [hundreds, tens] = layout.columnSpots[0];

    expect(hundreds).toHaveLength(3);
    expect(new Set(tens.map(([x]) => x)).size).toBe(3);
    expect(layout.headers[1].width).toBeGreaterThan(layout.headers[0].width);
  });
});
