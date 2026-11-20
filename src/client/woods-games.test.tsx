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
  englishGames,
  englishGameTypes,
  type EnglishGameType,
} from "../curriculum/english-games.js";
import type { EnglishQuestion } from "../curriculum/english-questions.js";
import { yearGroups } from "../curriculum/skills.js";
import type { TextBlock } from "./canvas-text.js";
import {
  listTreeSpots,
  stackTextBlocks,
  WoodsGameWorld,
} from "./woods-games.js";

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

const renderWoodsGame = async ({
  gameType,
  question,
  hiddenChoiceIndexes = [],
  poppedChoiceIndex,
  isEffectsOn = true,
}: {
  gameType: EnglishGameType;
  question: EnglishQuestion | undefined;
  hiddenChoiceIndexes?: number[];
  poppedChoiceIndex?: number;
  isEffectsOn?: boolean;
}) => {
  const renderer = await ReactThreeTestRenderer.create(
    <WoodsGameWorld
      gameType={gameType}
      prompt={
        question === undefined
          ? undefined
          : { kind: "english", english: question.prompt }
      }
      choices={
        question === undefined
          ? []
          : [question.answer, ...question.slips].slice(0, 4)
      }
      hiddenChoiceIndexes={hiddenChoiceIndexes}
      companionMood="waiting"
      poppedChoiceIndex={poppedChoiceIndex}
      popCount={1}
      isEffectsOn={isEffectsOn}
    />,
  );
  await renderer.advanceFrames(1, 1 / 60);
  return renderer;
};

const findLongestQuestion = (gameType: EnglishGameType): EnglishQuestion =>
  yearGroups
    .flatMap((yearGroup) => englishGames[gameType][yearGroup].questions)
    .reduce((longest, question) =>
      JSON.stringify(question.prompt).length + question.slips.length >
      JSON.stringify(longest.prompt).length + longest.slips.length
        ? question
        : longest,
    );

const promptObjectNames: Record<EnglishGameType, string> = {
  "alphabet-train": "alphabet-train",
  "word-lanterns": "signpost",
  "one-or-many": "balance-scales",
  "word-workshop": "workshop-board",
  "punctuation-stones": "stone-tablet",
  "suffix-potions": "cauldron",
  "word-squeeze": "treasure-chest",
  "sound-alikes": "hanging-scroll",
  "bridge-builder": "rope-bridge",
  "word-detectives": "detective-book",
  "story-scrolls": "story-scroll",
  "story-builder": "story-book",
};

const choiceObjectNames: Record<EnglishGameType, string> = {
  "alphabet-train": "choice-crate",
  "word-lanterns": "choice-lantern",
  "one-or-many": "choice-acorn",
  "word-workshop": "choice-tile",
  "punctuation-stones": "choice-stone",
  "suffix-potions": "choice-flask",
  "word-squeeze": "choice-key-tag",
  "sound-alikes": "choice-leaf",
  "bridge-builder": "choice-plank",
  "word-detectives": "choice-badge",
  "story-scrolls": "choice-lantern",
  "story-builder": "choice-story-stone",
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("WoodsGameWorld", () => {
  it.each(englishGameTypes)(
    `draws its busiest %s scene within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (gameType) => {
      const renderer = await renderWoodsGame({
        gameType,
        question: findLongestQuestion(gameType),
        poppedChoiceIndex: 0,
      });
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

  it.each(englishGameTypes)(
    "shows the %s prompt as its own 3D object, with one object behind each choice still on offer",
    async (gameType) => {
      const renderer = await renderWoodsGame({
        gameType,
        question: findLongestQuestion(gameType),
        hiddenChoiceIndexes: [1],
      });
      const offered = Math.min(
        4,
        findLongestQuestion(gameType).slips.length + 1,
      );

      expect(findNamed(renderer, promptObjectNames[gameType])).toHaveLength(1);
      expect(findNamed(renderer, choiceObjectNames[gameType])).toHaveLength(
        offered - 1,
      );
      await renderer.unmount();
    },
  );

  it("sets every game in the moonlit wood, with fireflies and the Companion", async () => {
    const renderer = await renderWoodsGame({
      gameType: "word-lanterns",
      question: undefined,
    });

    expect(findNamed(renderer, "woods")).toHaveLength(1);
    expect(findNamed(renderer, "fireflies")).toHaveLength(1);
    expect(findNamed(renderer, "companion")).toHaveLength(1);
    await renderer.unmount();
  });

  it("puts every carriage of the alphabet train on the track, one for the gap", async () => {
    const renderer = await renderWoodsGame({
      gameType: "alphabet-train",
      question: englishGames["alphabet-train"][1].questions[0],
    });
    const [carriages] = findNamed(renderer, "carriages").map(
      ({ instance }) => instance,
    );

    expect(carriages).toBeInstanceOf(InstancedMesh);
    expect(carriages instanceof InstancedMesh ? carriages.count : 0).toBe(4);
    await renderer.unmount();
  });

  it("sparks where a right answer was tapped, but only while effects are on", async () => {
    const question = englishGames["sound-alikes"][2].questions[0];
    const withEffects = await renderWoodsGame({
      gameType: "sound-alikes",
      question,
      poppedChoiceIndex: 0,
    });
    expect(withEffects.scene.findAllByType("Points")).toHaveLength(2);
    await withEffects.unmount();

    const withoutEffects = await renderWoodsGame({
      gameType: "sound-alikes",
      question,
      poppedChoiceIndex: 0,
      isEffectsOn: false,
    });
    expect(withoutEffects.scene.findAllByType("Points")).toHaveLength(1);
    await withoutEffects.unmount();
  });

  it("lays one stone on the story path for every step, with the glowing ring over the gap", async () => {
    const question = englishGames["story-builder"][1].questions[0];
    const renderer = await renderWoodsGame({
      gameType: "story-builder",
      question,
    });
    const [pathStones] = findNamed(renderer, "path-stones").map(
      ({ instance }) => instance,
    );
    const stepCount =
      question.prompt.kind === "story-plan" ? question.prompt.steps.length : 0;

    expect(pathStones).toBeInstanceOf(InstancedMesh);
    expect(pathStones instanceof InstancedMesh ? pathStones.count : 0).toBe(
      stepCount,
    );
    expect(stepCount).toBeGreaterThan(1);
    await renderer.unmount();
  });

  it("unrolls the story scroll as it appears, but shows it fully unrolled at once when motion is reduced", async () => {
    const question = englishGames["story-scrolls"][4].questions[0];
    const findSheetHeight = (renderer: ReactThreeTest.Renderer) =>
      findNamed(renderer, "scroll-sheet")[0]?.instance.scale.y;

    const unrolling = await renderWoodsGame({
      gameType: "story-scrolls",
      question,
    });
    expect(findSheetHeight(unrolling)).toBeLessThan(1);
    await unrolling.unmount();

    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const stillScroll = await renderWoodsGame({
      gameType: "story-scrolls",
      question,
    });
    expect(findSheetHeight(stillScroll)).toBe(1);
    await stillScroll.unmount();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });
});

describe("stackTextBlocks", () => {
  const lines = [
    { text: "A short line." },
    {
      text: "A much longer line that needs a good deal more room on the page.",
    },
  ];

  it("stacks the lines from top to bottom without overlapping, inside the space given", () => {
    const [first, second] = stackTextBlocks(lines, 0.2, 0.9);
    const findTop = ({ centre, size }: TextBlock) => centre[1] - size[1] / 2;
    const findBottom = ({ centre, size }: TextBlock) => centre[1] + size[1] / 2;

    expect(findTop(first)).toBeGreaterThanOrEqual(0.2);
    expect(findBottom(first)).toBeLessThanOrEqual(findTop(second));
    expect(findBottom(second)).toBeLessThanOrEqual(0.9);
  });

  it("gives a longer line more room than a shorter one", () => {
    const [first, second] = stackTextBlocks(lines, 0, 1);

    expect(second.size[1]).toBeGreaterThan(first.size[1]);
  });
});

describe("listTreeSpots", () => {
  it("keeps the near trees out of the middle, where the prompt stands", () => {
    for (const { x } of listTreeSpots(10, -4.4, 15)) {
      expect(Math.abs(x)).toBeGreaterThan(1.2);
    }
  });

  it("fills the far tree line right across the wood", () => {
    expect(listTreeSpots(16, -7, 22)).toHaveLength(16);
  });
});
