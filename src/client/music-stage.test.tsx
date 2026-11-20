import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { musicDifficulties } from "../curriculum/music-game.js";
import {
  findMusicGame,
  musicGames,
  type MusicGameType,
} from "../curriculum/music-games.js";
import type { MusicPrompt } from "../curriculum/music-prompts.js";
import {
  findBatonPoint,
  listChantStones,
  listKeySpots,
  MusicGameWorld,
} from "./music-stage.js";

const triangleBudget = 10_000;
const meshBudget = 40;

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

const buildSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const renderMusicGame = async ({
  gameType,
  prompt,
  choices,
  hiddenChoiceIndexes = [],
  poppedChoiceIndex,
  isEffectsOn = true,
}: {
  gameType: MusicGameType;
  prompt: MusicPrompt | undefined;
  choices: string[];
  hiddenChoiceIndexes?: number[];
  poppedChoiceIndex?: number;
  isEffectsOn?: boolean;
}) => {
  const renderer = await ReactThreeTestRenderer.create(
    <MusicGameWorld
      gameType={gameType}
      game={findMusicGame(gameType)}
      prompt={prompt}
      choices={choices}
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

const everyGameAndDifficulty = musicGames.flatMap(({ gameType }) =>
  musicDifficulties.map((difficulty) => ({ gameType, difficulty })),
);

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("MusicGameWorld", () => {
  it.each(everyGameAndDifficulty)(
    `draws $gameType at difficulty $difficulty, with a right answer bursting, within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async ({ gameType, difficulty }) => {
      const { prompt, choices } = findMusicGame(gameType).buildQuestion(
        difficulty,
        buildSeededRandom(difficulty * 31 + 7),
      );
      const renderer = await renderMusicGame({
        gameType,
        prompt,
        choices,
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

  it("sets every music game on the canyon stage, beside the Companion", async () => {
    const renderer = await renderMusicGame({
      gameType: "big-drum-little-drum",
      prompt: {
        ask: "Loud or quiet?",
        clips: [],
        stage: { kind: "gramophone" },
      },
      choices: ["loud", "quiet"],
    });

    expect(findNamed(renderer, "canyon-stage")).toHaveLength(1);
    expect(findNamed(renderer, "companion")).toHaveLength(1);
    expect(findNamed(renderer, "gramophone")).toHaveLength(1);
    await renderer.unmount();
  });

  it("draws each choice as its own model, leaving out those a Child already got wrong", async () => {
    const renderer = await renderMusicGame({
      gameType: "percussion-detective",
      prompt: {
        ask: "Which instrument?",
        clips: [],
        stage: { kind: "gramophone" },
      },
      choices: ["drum", "triangle", "maracas", "woodblock"],
      hiddenChoiceIndexes: [2],
    });

    expect(findNamed(renderer, "model-big-drum")).toHaveLength(1);
    expect(findNamed(renderer, "model-triangle")).toHaveLength(1);
    expect(findNamed(renderer, "model-maracas")).toHaveLength(0);
    expect(findNamed(renderer, "model-woodblock")).toHaveLength(1);
    await renderer.unmount();
  });

  it("puts notation on a music stand and on cards", async () => {
    const renderer = await renderMusicGame({
      gameType: "ta-and-ti-ti",
      prompt: {
        ask: "Which rhythm?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: { kind: "rhythm", rhythm: "ta ti-ti ta ta" },
        },
      },
      choices: ["ta ti-ti ta ta", "ta ta ta ta", "ti-ti ti-ti ta ta"],
    });

    expect(findNamed(renderer, "music-stand")).toHaveLength(1);
    expect(findNamed(renderer, "choice-card")).toHaveLength(3);
    await renderer.unmount();
  });

  it("lines up a canyon stone for every sound of a chant, under its syllables", async () => {
    const renderer = await renderMusicGame({
      gameType: "chant-along",
      prompt: {
        ask: "Which rhythm matches the chant?",
        clips: [],
        stage: {
          kind: "chant-stones",
          rhythm: "ti-ti ti-ti ta sh",
          syllables: ["Jel", "ly", "on", "a", "plate"],
        },
      },
      choices: ["ti-ti ti-ti ta sh", "ta ta ta sh"],
    });

    expect(findNamed(renderer, "chant-stones")).toHaveLength(1);
    const [stones] = findNamed(renderer, "chant-stone");
    expect(stones.instance).toBeInstanceOf(InstancedMesh);
    expect(
      stones.instance instanceof InstancedMesh && stones.instance.count,
    ).toBe(6);
    expect(findNamed(renderer, "choice-card")).toHaveLength(2);
    await renderer.unmount();
  });

  it("bursts golden notes where a right answer was tapped, but only while effects are on", async () => {
    const choices = ["loud", "quiet"];
    const prompt: MusicPrompt = {
      ask: "Loud or quiet?",
      clips: [],
      stage: { kind: "drum", beatLamps: 4 },
    };
    const withEffects = await renderMusicGame({
      gameType: "big-drum-little-drum",
      prompt,
      choices,
      poppedChoiceIndex: 1,
    });
    expect(findNamed(withEffects, "note-burst")).toHaveLength(1);
    expect(findNamed(withEffects, "beat-lamps")).toHaveLength(1);
    await withEffects.unmount();

    const withoutEffects = await renderMusicGame({
      gameType: "big-drum-little-drum",
      prompt,
      choices,
      poppedChoiceIndex: 1,
      isEffectsOn: false,
    });
    expect(findNamed(withoutEffects, "note-burst")).toHaveLength(0);
    await withoutEffects.unmount();
  });
});

describe("listKeySpots", () => {
  it("lays out an octave from C as seven white keys and five black keys between them", () => {
    const spots = listKeySpots(60, 71);
    const white = spots.filter(({ isBlack }) => !isBlack);
    const black = spots.filter(({ isBlack }) => isBlack);

    expect(white).toHaveLength(7);
    expect(black).toHaveLength(5);
    const [cSharp] = black;
    expect(cSharp.x).toBeGreaterThan(white[0].x);
    expect(cSharp.x).toBeLessThan(white[1].x);
  });
});

describe("listChantStones", () => {
  it("spaces the stones by the beat in a centred row, so a ti-ti pair sits closer together than two tas", () => {
    const [firstTi, secondTi, firstTa, secondTa] =
      listChantStones("ti-ti ta ta");

    expect(secondTi.x - firstTi.x).toBeCloseTo(0.4);
    expect(secondTa.x - firstTa.x).toBeCloseTo(0.8);
    expect(firstTa.radius).toBeGreaterThan(firstTi.radius);
    expect(firstTi.x - 0.2).toBeCloseTo(-(secondTa.x + 0.4));
  });

  it("leaves a small dark stone for a rest", () => {
    const stones = listChantStones("ta ta ta sh");

    expect(stones.map(({ isRest }) => isRest)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(stones[3].radius).toBeLessThan(stones[0].radius);
  });
});

describe("findBatonPoint", () => {
  it("brings the baton down to the bottom on beat one, and up to the top before the next bar", () => {
    for (const beatsPerBar of [2, 3, 4, 6]) {
      const [, downbeatHeight] = findBatonPoint(beatsPerBar, 0);
      const [, upbeatHeight] = findBatonPoint(beatsPerBar, beatsPerBar - 1);
      expect(downbeatHeight).toBe(-1);
      expect(upbeatHeight).toBeGreaterThan(0.5);
    }
  });
});
