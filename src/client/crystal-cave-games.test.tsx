import {
  islandStagePropMeshes,
  islandStagePropTriangleBudget,
} from "./islands/island-stage-props.js";
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { phonicsGames, type PhonicsGame } from "../curriculum/phonics-games.js";
import {
  CaveGameWorld,
  findCrystalColour,
  wrapWords,
} from "./crystal-cave-games.js";

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

const findGame = (id: string): PhonicsGame => {
  const game = phonicsGames.find((phonicsGame) => phonicsGame.id === id);
  if (game === undefined) {
    throw new Error(`there is no Phonics game "${id}"`);
  }
  return game;
};

const findLongestQuestion = ({ questions }: PhonicsGame) =>
  questions.reduce((longest, question) =>
    question.prompt.length > longest.prompt.length ? question : longest,
  );

const renderCaveGame = async ({
  phonicsGame,
  promptText,
  choices,
  hiddenChoiceIndexes = [],
  poppedChoiceIndex,
  isEffectsOn = true,
}: {
  phonicsGame: PhonicsGame;
  promptText: string;
  choices: string[];
  hiddenChoiceIndexes?: number[];
  poppedChoiceIndex?: number;
  isEffectsOn?: boolean;
}) => {
  const renderer = await ReactThreeTestRenderer.create(
    <CaveGameWorld
      phonicsGame={phonicsGame}
      prompt={{ kind: "phonics-word", ask: phonicsGame.ask, text: promptText }}
      choices={choices}
      hiddenChoiceIndexes={hiddenChoiceIndexes}
      companionMood="waiting"
      poppedChoiceIndex={poppedChoiceIndex}
      popCount={1}
      isEffectsOn={isEffectsOn}
    />,
  );
  await renderer.advanceFrames(2, 1 / 60);
  return renderer;
};

const renderLongestQuestion = (phonicsGame: PhonicsGame) => {
  const { prompt, answer, distractors } = findLongestQuestion(phonicsGame);
  return renderCaveGame({
    phonicsGame,
    promptText: prompt,
    choices: [answer, ...distractors],
  });
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("CaveGameWorld", () => {
  it.each(phonicsGames.map((game) => [game.id, game] as const))(
    `draws %s with its longest prompt within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (_, phonicsGame) => {
      const renderer = await renderLongestQuestion(phonicsGame);
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

  it.each(phonicsGames.map((game) => [game.id, game] as const))(
    "shows the %s prompt on its own scene object, inside the crystal cave",
    async (_, phonicsGame) => {
      const renderer = await renderLongestQuestion(phonicsGame);

      expect(findNamed(renderer, "crystal-cave")).toHaveLength(1);
      expect(findNamed(renderer, `prompt-${phonicsGame.scene}`)).toHaveLength(
        1,
      );
      expect(findNamed(renderer, "companion")).toHaveLength(1);
      await renderer.unmount();
    },
  );

  it("lays one crystal tile for each sound in a Crystal blend word", async () => {
    const renderer = await renderCaveGame({
      phonicsGame: findGame("crystal-blend"),
      promptText: "s|t|r|ee|t",
      choices: ["street", "sweet", "steep", "treat"],
    });

    expect(findNamed(renderer, "crystal-tile")).toHaveLength(5);
    await renderer.unmount();
  });

  it("puts the game's choice prop behind each answer, leaving out those a Child already got wrong", async () => {
    const phonicsGame = findGame("tricky-words");
    const renderer = await renderCaveGame({
      phonicsGame,
      promptText: "I went ___ school.",
      choices: ["to", "do", "of", "he"],
      hiddenChoiceIndexes: [1, 3],
    });

    expect(
      findNamed(renderer, `choice-${phonicsGame.choiceProp}`),
    ).toHaveLength(2);
    await renderer.unmount();
  });

  it("sparkles where a right answer was tapped, but only while effects are on", async () => {
    const phonicsGame = findGame("real-or-alien");
    const withEffects = await renderCaveGame({
      phonicsGame,
      promptText: "frog",
      choices: ["real word", "alien word"],
      poppedChoiceIndex: 0,
    });
    const burstPoints = withEffects.scene.findAllByType("Points").length;
    await withEffects.unmount();

    const withoutEffects = await renderCaveGame({
      phonicsGame,
      promptText: "frog",
      choices: ["real word", "alien word"],
      poppedChoiceIndex: 0,
      isEffectsOn: false,
    });

    expect(burstPoints).toBe(
      withoutEffects.scene.findAllByType("Points").length + 1,
    );
    await withoutEffects.unmount();
  });
});

describe("findCrystalColour", () => {
  it("lights the cave a different colour for Year 1 and Year 2", () => {
    expect(findCrystalColour(1)).not.toBe(findCrystalColour(2));
  });
});

describe("wrapWords", () => {
  it("fits as many words on each line as the line allows", () => {
    const fitsTenLetters = (line: string) => line.length <= 10;

    expect(wrapWords("The bird is over ___.", fitsTenLetters)).toEqual([
      "The bird",
      "is over",
      "___.",
    ]);
  });

  it("keeps a word longer than the line on a line of its own", () => {
    expect(wrapWords("extraordinary word", (line) => line.length <= 5)).toEqual(
      ["extraordinary", "word"],
    );
  });
});
