import { islandStagePropTriangleBudget } from "./islands/island-stage-props.js";
import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { BufferGeometry, InstancedMesh, Mesh, Points, Vector3 } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { QuestionGameType } from "../curriculum/world-map.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { buildPaletteUniform, retroPalette } from "./pixel-pipeline.js";
import type { CompanionMood } from "./studio-stage.js";
import { MissionWorld } from "./world.js";

const sliceOneTriangleBudget = 10_000 - islandStagePropTriangleBudget;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;
const isPoints = (value: unknown): value is Points => value instanceof Points;

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

const renderWorld = ({
  gameType = "popping-bubbles",
  prompt,
  choices = ["1", "2", "3", "4"],
  hiddenChoiceIndexes = [],
  companionMood = "waiting",
  poppedChoiceIndex,
  isEffectsOn = true,
}: {
  gameType?: QuestionGameType;
  prompt?: QuestionPrompt;
  choices?: string[];
  hiddenChoiceIndexes?: number[];
  companionMood?: CompanionMood;
  poppedChoiceIndex?: number;
  isEffectsOn?: boolean;
} = {}) =>
  ReactThreeTestRenderer.create(
    <MissionWorld
      gameType={gameType}
      phonicsGame={undefined}
      geographyGame={undefined}
      historyQuest={undefined}
      prompt={prompt}
      choices={choices}
      hiddenChoiceIndexes={hiddenChoiceIndexes}
      companionMood={companionMood}
      poppedChoiceIndex={poppedChoiceIndex}
      popCount={1}
      isEffectsOn={isEffectsOn}
    />,
  );

const expectComponents = (actual: Vector3 | undefined, expected: Vector3) => {
  expect(actual?.x).toBeCloseTo(expected.x);
  expect(actual?.y).toBeCloseTo(expected.y);
  expect(actual?.z).toBeCloseTo(expected.z);
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("MissionWorld", () => {
  it.each<QuestionGameType>(["popping-bubbles", "listen-and-pick"])(
    `draws the %s scene within the starting budget of ${String(sliceOneTriangleBudget)} triangles`,
    async (gameType) => {
      const renderer = await renderWorld({ gameType });

      const triangles = listMeshes(renderer).reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );

      expect(triangles).toBeGreaterThan(0);
      expect(triangles).toBeLessThanOrEqual(sliceOneTriangleBudget);
      await renderer.unmount();
    },
  );

  it("draws one object for each choice, leaving out those a Child already got wrong", async () => {
    const everyChoice = await renderWorld();
    const meshesWithEveryChoice = listMeshes(everyChoice).length;
    await everyChoice.unmount();

    const twoTakenAway = await renderWorld({ hiddenChoiceIndexes: [0, 2] });

    expect(listMeshes(twoTakenAway)).toHaveLength(meshesWithEveryChoice - 2);
    await twoTakenAway.unmount();
  });

  it("bursts sparkles where a bubble popped, but only while effects are on", async () => {
    const withEffects = await renderWorld({ poppedChoiceIndex: 1 });
    expect(
      withEffects.scene
        .findAllByType("Points")
        .map(({ instance }) => instance)
        .filter(isPoints),
    ).toHaveLength(1);
    await withEffects.unmount();

    const withoutEffects = await renderWorld({
      poppedChoiceIndex: 1,
      isEffectsOn: false,
    });
    expect(withoutEffects.scene.findAllByType("Points")).toHaveLength(0);
    await withoutEffects.unmount();
  });

  it("makes the Companion jump when it cheers, and stay near the ground while it waits", async () => {
    const findHighestCompanionLift = async (companionMood: CompanionMood) => {
      const renderer = await renderWorld({ companionMood });
      const companion = renderer.scene.find(
        ({ instance }) => instance.name === "companion",
      );
      const restingHeight = companion.instance.position.y;
      let highest = restingHeight;
      for (let frame = 0; frame < 30; frame++) {
        await renderer.advanceFrames(1, 1 / 30);
        highest = Math.max(highest, companion.instance.position.y);
      }
      await renderer.unmount();
      return highest - restingHeight;
    };

    expect(await findHighestCompanionLift("cheering")).toBeGreaterThan(0.2);
    expect(await findHighestCompanionLift("waiting")).toBeLessThan(0.1);
  });
});

describe("the popping-bubbles scene", () => {
  it("grows a fresh bubble in after each pop rather than leaving the popped one in place", async () => {
    const renderer = await renderWorld();
    const findBubbleScales = () =>
      renderer.scene
        .findAll(({ instance }) => instance.name === "bubble")
        .map(({ instance }) => instance.scale.x);

    await renderer.advanceFrames(1, 1 / 60);
    const justGrowing = findBubbleScales();
    await renderer.advanceFrames(60, 1 / 60);
    const fullyGrown = findBubbleScales();
    await renderer.unmount();

    expect(justGrowing).toHaveLength(4);
    justGrowing.forEach((scale) => {
      expect(scale).toBeLessThan(0.5);
    });
    fullyGrown.forEach((scale) => {
      expect(scale).toBeCloseTo(1, 1);
    });
  });
});

describe("buildPaletteUniform", () => {
  it("passes each palette colour to the shader as its sRGB components", () => {
    const uniform = buildPaletteUniform(["#000000", "#ffffff", "#ff8000"]);

    expectComponents(uniform[0], new Vector3(0, 0, 0));
    expectComponents(uniform[1], new Vector3(1, 1, 1));
    expectComponents(uniform[2], new Vector3(1, 128 / 255, 0));
  });

  it("keeps the retro palette small, as 8-bit machines did", () => {
    expect(buildPaletteUniform(Object.values(retroPalette))).toHaveLength(16);
  });
});
