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
  computingGames,
  type ComputingGameType,
} from "../curriculum/computing-games.js";
import type {
  ComputingQuestion,
  ComputingScene,
} from "../curriculum/computing-scenes.js";
import { findTextureScale } from "./computing-lab-text.js";
import { ComputingLabWorld } from "./computing-lab.js";

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

const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const listSampleQuestions = (
  game: (typeof computingGames)[number],
): ComputingQuestion[] => {
  const { questions } = game;
  if (questions.kind === "bank") {
    return questions.questions;
  }
  return [3, 9].flatMap((seed) =>
    questions.generate(3, buildSeededRandom(seed)),
  );
};

const renderLab = async ({
  gameType,
  scene,
  choices = ["One", "Two", "Three", "Four"],
  hiddenChoiceIndexes = [],
  poppedChoiceIndex,
}: {
  gameType: ComputingGameType;
  scene: ComputingScene;
  choices?: string[];
  hiddenChoiceIndexes?: number[];
  poppedChoiceIndex?: number;
}) => {
  const renderer = await ReactThreeTestRenderer.create(
    <ComputingLabWorld
      gameType={gameType}
      prompt={{ kind: "computing", ask: "Which one?", scene }}
      choices={choices}
      hiddenChoiceIndexes={hiddenChoiceIndexes}
      companionMood="waiting"
      poppedChoiceIndex={poppedChoiceIndex}
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("ComputingLabWorld", () => {
  it.each(computingGames.map((game) => [game.gameType, game] as const))(
    `draws every %s scene within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (gameType, game) => {
      for (const { scene } of listSampleQuestions(game)) {
        const renderer = await renderLab({ gameType, scene });
        const meshes = listMeshes(renderer);
        const triangles = meshes.reduce(
          (total, mesh) => total + countDrawnTriangles(mesh),
          0,
        );

        expect(triangles, `${gameType} ${scene.kind}`).toBeLessThanOrEqual(
          triangleBudget,
        );
        expect(meshes.length, `${gameType} ${scene.kind}`).toBeLessThanOrEqual(
          meshBudget,
        );
        expect(findNamed(renderer, "computing-stage")).toHaveLength(1);
        await renderer.unmount();
      }
    },
    60_000,
  );

  it("sets the lab around every game: backdrop, circuit floor and the Companion", async () => {
    const renderer = await renderLab({
      gameType: "tech-spotter",
      scene: { kind: "device", device: "laptop" },
    });

    expect(findNamed(renderer, "lab-backdrop")).toHaveLength(1);
    expect(findNamed(renderer, "lab-circuit-floor")).toHaveLength(1);
    expect(findNamed(renderer, "companion")).toHaveLength(1);
    expect(findNamed(renderer, "device-laptop")).toHaveLength(1);
    await renderer.unmount();
  });

  it("puts a keycap under each choice, leaving out those a Child already got wrong", async () => {
    const renderer = await renderLab({
      gameType: "word-wizard",
      scene: { kind: "device", device: "keyboard" },
      hiddenChoiceIndexes: [0, 2],
    });

    expect(findNamed(renderer, "keycap")).toHaveLength(2);
    await renderer.unmount();
  });

  it("drives Bolt to the star, with a rock for each obstacle", async () => {
    const renderer = await renderLab({
      gameType: "robot-steps",
      scene: {
        kind: "robot-grid",
        columns: 5,
        rows: 5,
        robot: { column: 0, row: 4 },
        goal: { column: 3, row: 1 },
        obstacles: [
          { column: 1, row: 1 },
          { column: 2, row: 2 },
        ],
        path: ["up", "right"],
      },
    });

    expect(findNamed(renderer, "bolt-robot")).toHaveLength(1);
    expect(findNamed(renderer, "grid-star")).toHaveLength(1);
    const [rocks] = findNamed(renderer, "grid-rocks").map(
      ({ instance }) => instance,
    );
    expect(rocks instanceof InstancedMesh && rocks.count).toBe(2);
    await renderer.unmount();
  });

  it("stacks one coloured block for each line of code, with its gadget beside it", async () => {
    const renderer = await renderLab({
      gameType: "jump-and-go",
      scene: {
        kind: "code-stack",
        blocks: [
          { text: "Start on green flag", category: "event" },
          { text: "Move right 2", category: "motion" },
          { text: "Say hello", category: "looks" },
        ],
        gadget: { kind: "lamp", isOn: true },
      },
    });

    const [blocks] = findNamed(renderer, "code-blocks").map(
      ({ instance }) => instance,
    );
    expect(blocks instanceof InstancedMesh && blocks.count).toBe(3);
    expect(findNamed(renderer, "lamp-on")).toHaveLength(1);
    await renderer.unmount();
  });

  it("sends a packet along the route when a network has one", async () => {
    const renderer = await renderLab({
      gameType: "packet-path",
      scene: {
        kind: "network-map",
        nodes: [
          { id: "a", device: "computer", label: "Home", column: 0, row: 1 },
          { id: "b", device: "router", label: "Router", column: 2, row: 1 },
          { id: "c", device: "server", label: "School", column: 4, row: 1 },
        ],
        links: [
          ["a", "b"],
          ["b", "c"],
        ],
        route: ["a", "b", "c"],
      },
    });

    expect(findNamed(renderer, "network-packet")).toHaveLength(1);
    expect(findNamed(renderer, "network-route")).toHaveLength(1);
    await renderer.unmount();
  });

  it("stands a tent's triangular prism on its flat face, ridge up, on the turntable", async () => {
    const renderer = await renderLab({
      gameType: "model-maker",
      scene: {
        kind: "model-workbench",
        parts: [{ shape: "prism", colour: "green", position: [0, 0, 0] }],
      },
    });
    const [prism] = findNamed(renderer, "part-prism")
      .map(({ instance }) => instance)
      .filter(isMesh);
    const position = prism.geometry.getAttribute("position");
    const corners = Array.from({ length: position.count }, (_, index) => ({
      y: Number(position.getY(index).toFixed(3)),
      z: Number(position.getZ(index).toFixed(3)),
    }));
    const lowest = Math.min(...corners.map(({ y }) => y));
    const highest = Math.max(...corners.map(({ y }) => y));
    const countEdges = (height: number) =>
      new Set(corners.filter(({ y }) => y === height).map(({ z }) => z)).size;

    expect(countEdges(lowest)).toBe(2);
    expect(countEdges(highest)).toBe(1);
    expect(lowest).toBeCloseTo(-0.5);
    await renderer.unmount();
  });

  it("bursts where a right answer was tapped", async () => {
    const renderer = await renderLab({
      gameType: "tech-spotter",
      scene: { kind: "device", device: "mouse" },
      poppedChoiceIndex: 1,
    });

    expect(
      renderer.scene
        .findAllByType("Points")
        .filter(({ instance }) => instance.name !== "data-motes"),
    ).toHaveLength(1);
    await renderer.unmount();
  });
});

describe("findTextureScale", () => {
  it("shrinks a painted texture to 512 pixels on its longest side, and never enlarges one", () => {
    expect(findTextureScale(1024, 640)).toBe(0.5);
    expect(findTextureScale(512, 672) * 672).toBe(512);
    expect(findTextureScale(256, 320)).toBe(1);
  });
});
