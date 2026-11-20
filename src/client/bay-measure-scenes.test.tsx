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
  findCoralBase,
  findHandAngles,
  findMarkHeight,
  findStoneSpot,
  listPartShares,
} from "./bay-measure-scenes.js";
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

const findNamed = (renderer: ReactThreeTest.Renderer, name: string) =>
  renderer.scene.findAll(({ instance }) => instance.name === name);

const findRotationZ = (renderer: ReactThreeTest.Renderer, name: string) => {
  const [found] = findNamed(renderer, name);
  return found.instance.rotation.z;
};

interface MeasureScene {
  gameType: BayGameType;
  prompt: QuestionPrompt;
  choices: string[];
}

const renderMeasureScene = async (
  { gameType, prompt, choices }: MeasureScene,
  hiddenChoiceIndexes: number[] = [],
  frames = 1,
) => {
  const renderer = await ReactThreeTestRenderer.create(
    <BayGameWorld
      gameType={gameType}
      prompt={prompt}
      choices={choices}
      hiddenChoiceIndexes={hiddenChoiceIndexes}
      companionMood="waiting"
      poppedChoiceIndex={undefined}
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(frames, 1 / 30);
  return renderer;
};

const steppingStones: MeasureScene = {
  gameType: "skip-count",
  prompt: {
    kind: "sequence",
    sequence: { step: 10, shown: [70, 80, 90], answer: 100 },
  },
  choices: ["100", "91", "110", "99"],
};
const tallestCoral: MeasureScene = {
  gameType: "coral-heights",
  prompt: { kind: "height-extreme", extreme: "tallest" },
  choices: ["2", "5", "7", "8"],
};
const measuredCoral: MeasureScene = {
  gameType: "coral-heights",
  prompt: {
    kind: "height-measure",
    measure: { startMark: 2, centimetres: 9 },
  },
  choices: ["9 cm", "11 cm", "8 cm", "10 cm"],
};
const measuredInMillimetres: MeasureScene = {
  gameType: "coral-heights",
  prompt: {
    kind: "height-measure",
    measure: { startMark: 3, centimetres: 9.4 },
  },
  choices: ["94 mm", "124 mm", "93 mm", "104 mm"],
};
const circleQuarters: MeasureScene = {
  gameType: "fraction-find",
  prompt: {
    kind: "fraction",
    fraction: {
      target: "1/4",
      outline: "circle",
      askedAs: "1/4",
      distractors: ["1/2", "3/4", "uneven-1/4"],
    },
  },
  choices: ["1/4", "1/2", "3/4", "uneven-1/4"],
};
const squareQuarters: MeasureScene = {
  ...circleQuarters,
  prompt: {
    kind: "fraction",
    fraction: {
      target: "1/4",
      outline: "square",
      askedAs: "1/4",
      distractors: ["1/2", "3/4", "uneven-1/4"],
    },
  },
};
const shipClock: MeasureScene = {
  gameType: "ship-clock",
  prompt: {
    kind: "clock",
    clock: {
      time: { hour: 3, minutes: 45 },
      dial: "roman",
      ask: { kind: "read" },
      answer: "quarter to 4",
      slips: ["quarter past 3", "quarter to 5", "quarter past 4"],
    },
  },
  choices: ["quarter to 4", "quarter past 3", "quarter to 5", "quarter past 4"],
};

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("the measuring and counting-in-steps scenes", () => {
  it.each([
    { label: "stepping stones", scene: steppingStones },
    { label: "tallest coral", scene: tallestCoral },
    { label: "measured coral", scene: measuredCoral },
    { label: "coral measured in millimetres", scene: measuredInMillimetres },
    { label: "circle fractions", scene: circleQuarters },
    { label: "square fractions", scene: squareQuarters },
    { label: "ship's clock", scene: shipClock },
  ])(
    `draws the $label scene within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async ({ scene }) => {
      const renderer = await renderMeasureScene(scene);
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

  it("lays four stepping stones, the last one asking for the next number", async () => {
    const renderer = await renderMeasureScene(steppingStones);

    expect(findNamed(renderer, "stepping-stones")).toHaveLength(1);
    expect(findNamed(renderer, "asked-stone")).toHaveLength(1);
    expect(findNamed(renderer, "hopper")).toHaveLength(1);
    await renderer.unmount();
  });

  it("stands a coral of each height on the choices, leaving out those already tried", async () => {
    const renderer = await renderMeasureScene(tallestCoral, [1]);

    expect(findNamed(renderer, "coral-2")).toHaveLength(1);
    expect(findNamed(renderer, "coral-5")).toHaveLength(0);
    expect(findNamed(renderer, "coral-7")).toHaveLength(1);
    expect(findNamed(renderer, "coral-8")).toHaveLength(1);
    await renderer.unmount();
  });

  it("stands the measured coral on a rock when it doesn't start at zero", async () => {
    const renderer = await renderMeasureScene(measuredCoral);

    expect(findNamed(renderer, "measured-coral")).toHaveLength(1);
    expect(findNamed(renderer, "pedestal")).toHaveLength(1);
    expect(findNamed(renderer, "choice-token")).toHaveLength(4);
    await renderer.unmount();
  });

  it("draws each fraction choice as its own tile, shaded and plain parts apart", async () => {
    const renderer = await renderMeasureScene(squareQuarters, [2]);

    expect(findNamed(renderer, "fraction-1/4")).toHaveLength(1);
    expect(findNamed(renderer, "fraction-3/4")).toHaveLength(0);
    expect(findNamed(renderer, "fraction-uneven-1/4")).toHaveLength(1);
    expect(findNamed(renderer, "shaded-parts")).toHaveLength(3);
    expect(findNamed(renderer, "plain-parts")).toHaveLength(3);
    await renderer.unmount();
  });

  it("sweeps the clock's hands round to the time asked", async () => {
    const renderer = await renderMeasureScene(shipClock, [], 60);

    expect(findRotationZ(renderer, "minute-hand")).toBeCloseTo(
      -1.5 * Math.PI,
      3,
    );
    expect(findRotationZ(renderer, "hour-hand")).toBeCloseTo(
      -(3.75 / 12) * 2 * Math.PI,
      3,
    );
    await renderer.unmount();
  });
});

describe("findHandAngles", () => {
  it("turns the hour hand part of the way to the next hour", () => {
    expect(findHandAngles({ hour: 12, minutes: 30 })).toEqual({
      hour: -Math.PI / 12,
      minute: -Math.PI,
    });
  });
});

describe("findCoralBase", () => {
  it("stands every coral on the same line, whatever its height", () => {
    expect(findCoralBase({ position: [1, -2, 0], radius: 0.5 })).toBeCloseTo(
      -2.7,
    );
  });
});

describe("findMarkHeight", () => {
  it("spaces the centimetres evenly up the ruler", () => {
    const gap = findMarkHeight(1) - findMarkHeight(0);

    expect(findMarkHeight(15) - findMarkHeight(14)).toBeCloseTo(gap);
    expect(findMarkHeight(15) - findMarkHeight(0)).toBeCloseTo(gap * 15);
  });
});

describe("findStoneSpot", () => {
  it("lays the stones left to right in a gentle arch", () => {
    const spots = [0, 1, 2, 3].map(findStoneSpot);

    expect(spots.map(([x]) => x)).toEqual(
      spots.map(([x]) => x).toSorted((first, second) => first - second),
    );
    expect(spots[1][1]).toBeGreaterThan(spots[0][1]);
    expect(spots[3][1]).toBeCloseTo(spots[0][1]);
  });
});

describe("listPartShares", () => {
  it("splits equal parts evenly and unequal parts clearly unevenly", () => {
    expect(listPartShares(4, true)).toEqual([0.25, 0.25, 0.25, 0.25]);
    const uneven = listPartShares(2, false);
    expect(uneven[1]).toBeGreaterThan(uneven[0] * 1.5);
    expect(uneven.reduce((total, share) => total + share, 0)).toBeCloseTo(1);
  });
});
