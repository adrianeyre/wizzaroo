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
  BayGameWorld,
  buildCounterLayout,
  findCounterSpot,
  isBayGameType,
  listFishSpots,
  type BayGameType,
} from "./bay-games.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { buildChartQuestions } from "../curriculum/chart-tower.js";
import { buildFairShareQuestions } from "../curriculum/fair-shares.js";
import {
  pictureQuestionDifficulties,
  type PictureQuestion,
} from "../curriculum/picture-questions.js";
import { buildTreasureMapQuestions } from "../curriculum/treasure-map.js";
import { buildSharePlan, listPairSpots } from "./bay-fair-shares.js";
import {
  buildChartLayout,
  findAxisTop,
  listPieWedges,
} from "./bay-chart-tower.js";
import {
  findCompassSpot,
  findFacingTurn,
  listOutlineEdges,
} from "./bay-treasure-map.js";

const triangleBudget = 10_000 - islandStagePropTriangleBudget;
const meshBudget = 40 - islandStagePropMeshes;

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;
const isInstancedMesh = (value: unknown): value is InstancedMesh =>
  value instanceof InstancedMesh;

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

const findInstanced = (renderer: ReactThreeTest.Renderer, name: string) => {
  const [found] = findNamed(renderer, name).map(({ instance }) => instance);
  if (!isInstancedMesh(found)) {
    throw new Error(`there is no instanced mesh named ${name}`);
  }
  return found;
};

const renderBayGame = async ({
  gameType,
  prompt,
  choices = ["1", "2", "3", "4"],
  hiddenChoiceIndexes = [],
  poppedChoiceIndex,
  isEffectsOn = true,
}: {
  gameType: BayGameType;
  prompt?: QuestionPrompt;
  choices?: string[];
  hiddenChoiceIndexes?: number[];
  poppedChoiceIndex?: number;
  isEffectsOn?: boolean;
}) => {
  const renderer = await ReactThreeTestRenderer.create(
    <BayGameWorld
      gameType={gameType}
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

const heaviestScenes: {
  gameType: BayGameType;
  prompt: QuestionPrompt;
  choices: string[];
}[] = [
  {
    gameType: "fish-count",
    prompt: { kind: "count", count: 20 },
    choices: ["17", "18", "19", "20"],
  },
  {
    gameType: "ten-frames",
    prompt: {
      kind: "one-more-one-less",
      oneMoreOneLess: { start: 19, step: "one-more", answer: 20 },
    },
    choices: ["18", "19", "20", "21"],
  },
  {
    gameType: "shape-hunt",
    prompt: { kind: "shape", shape: "sphere" },
    choices: ["sphere", "cylinder", "cone", "cube"],
  },
  {
    gameType: "letter-match",
    prompt: { kind: "capital-letter", smallLetter: "g" },
    choices: ["G", "Q", "C", "O"],
  },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("isBayGameType", () => {
  it("knows the four Bubble Bay games from the older two", () => {
    expect(isBayGameType("fish-count")).toBe(true);
    expect(isBayGameType("letter-match")).toBe(true);
    expect(isBayGameType("popping-bubbles")).toBe(false);
    expect(isBayGameType("listen-and-pick")).toBe(false);
  });
});

describe("BayGameWorld", () => {
  it.each(heaviestScenes)(
    `draws its busiest $gameType scene within ${String(triangleBudget)} triangles`,
    async (scene) => {
      const renderer = await renderBayGame(scene);

      const triangles = listMeshes(renderer).reduce(
        (total, mesh) => total + countDrawnTriangles(mesh),
        0,
      );

      expect(triangles).toBeGreaterThan(0);
      expect(triangles).toBeLessThanOrEqual(triangleBudget);
      await renderer.unmount();
    },
  );

  it("lays the underwater seabed under every Bubble Bay game", async () => {
    const renderer = await renderBayGame({
      gameType: "fish-count",
      prompt: { kind: "count", count: 3 },
    });

    expect(findNamed(renderer, "seabed")).toHaveLength(1);
    expect(findNamed(renderer, "companion")).toHaveLength(1);
    await renderer.unmount();
  });

  it("draws exactly as many fish as the Child has to count", async () => {
    const renderer = await renderBayGame({
      gameType: "fish-count",
      prompt: { kind: "count", count: 13 },
    });

    expect(findInstanced(renderer, "fish-bodies").count).toBe(13);
    await renderer.unmount();
  });

  it("puts a sea-glass token behind each number, leaving out those a Child already got wrong", async () => {
    const renderer = await renderBayGame({
      gameType: "fish-count",
      prompt: { kind: "count", count: 5 },
      hiddenChoiceIndexes: [1],
    });

    expect(findNamed(renderer, "choice-token")).toHaveLength(3);
    await renderer.unmount();
  });

  it("fills the ten frame with the starting counters and shows the one being added", async () => {
    const renderer = await renderBayGame({
      gameType: "ten-frames",
      prompt: {
        kind: "one-more-one-less",
        oneMoreOneLess: { start: 7, step: "one-more", answer: 8 },
      },
    });

    expect(findInstanced(renderer, "counters").count).toBe(7);
    expect(findNamed(renderer, "counter-added")).toHaveLength(1);
    await renderer.unmount();
  });

  it("lifts away the counter being taken for one less", async () => {
    const renderer = await renderBayGame({
      gameType: "ten-frames",
      prompt: {
        kind: "one-more-one-less",
        oneMoreOneLess: { start: 12, step: "one-less", answer: 11 },
      },
    });

    expect(findInstanced(renderer, "counters").count).toBe(11);
    expect(findNamed(renderer, "counter-taken")).toHaveLength(1);
    await renderer.unmount();
  });

  it("draws each choice as the 3-D shape it names, on its own plinth", async () => {
    const renderer = await renderBayGame({
      gameType: "shape-hunt",
      prompt: { kind: "shape", shape: "cone" },
      choices: ["cone", "cube", "pyramid", "cylinder"],
      hiddenChoiceIndexes: [2],
    });

    expect(findNamed(renderer, "shape-cone")).toHaveLength(1);
    expect(findNamed(renderer, "shape-cube")).toHaveLength(1);
    expect(findNamed(renderer, "shape-pyramid")).toHaveLength(0);
    expect(findNamed(renderer, "shape-cylinder")).toHaveLength(1);
    expect(renderer.scene.findAllByType("LineSegments").length).toBe(3);
    await renderer.unmount();
  });

  it("floats the small letter on a block, with a life ring for each capital", async () => {
    const renderer = await renderBayGame({
      gameType: "letter-match",
      prompt: { kind: "capital-letter", smallLetter: "b" },
      choices: ["B", "D", "P", "R"],
    });

    expect(findNamed(renderer, "letter-block")).toHaveLength(1);
    expect(findNamed(renderer, "life-ring")).toHaveLength(4);
    await renderer.unmount();
  });

  it("splashes where a right answer was tapped, but only while effects are on", async () => {
    const withEffects = await renderBayGame({
      gameType: "letter-match",
      prompt: { kind: "capital-letter", smallLetter: "b" },
      poppedChoiceIndex: 2,
    });
    expect(withEffects.scene.findAllByType("Points")).toHaveLength(1);
    await withEffects.unmount();

    const withoutEffects = await renderBayGame({
      gameType: "letter-match",
      prompt: { kind: "capital-letter", smallLetter: "b" },
      poppedChoiceIndex: 2,
      isEffectsOn: false,
    });
    expect(withoutEffects.scene.findAllByType("Points")).toHaveLength(0);
    await withoutEffects.unmount();
  });
});

describe("listFishSpots", () => {
  it("lines the fish up in rows of five, so a Child can count in fives", () => {
    const spots = listFishSpots(7);

    expect(spots).toHaveLength(7);
    expect(new Set(spots.slice(0, 5).map(([, y]) => y)).size).toBe(1);
    expect(spots[5][1]).toBeLessThan(spots[0][1]);
    expect(spots[5][0]).toBeCloseTo(spots[0][0]);
  });

  it("leaves a wider gap after the first ten fish", () => {
    const rowHeights = [...new Set(listFishSpots(20).map(([, y]) => y))];
    const gaps = rowHeights
      .slice(1)
      .map((height, index) => rowHeights[index] - height);

    expect(gaps[1]).toBeGreaterThan(gaps[0]);
    expect(gaps[2]).toBeCloseTo(gaps[0]);
  });
});

describe("buildCounterLayout", () => {
  it("uses one ten frame within 10 and a second one past 10", () => {
    expect(
      buildCounterLayout({ start: 9, step: "one-more", answer: 10 }),
    ).toEqual({ frameCount: 1, settledCount: 9, changingIndex: 9 });
    expect(
      buildCounterLayout({ start: 10, step: "one-more", answer: 11 }),
    ).toEqual({ frameCount: 2, settledCount: 10, changingIndex: 10 });
    expect(
      buildCounterLayout({ start: 11, step: "one-less", answer: 10 }),
    ).toEqual({ frameCount: 2, settledCount: 10, changingIndex: 10 });
  });

  it("fills a frame's top row of five before its bottom row", () => {
    const [firstX, firstY] = findCounterSpot(0, 1);
    const [, fifthY] = findCounterSpot(4, 1);
    const [sixthX, sixthY] = findCounterSpot(5, 1);

    expect(fifthY).toBeCloseTo(firstY);
    expect(sixthY).toBeLessThan(firstY);
    expect(sixthX).toBeCloseTo(firstX);
  });
});

interface ExtraScene {
  name: string;
  gameType: BayGameType;
  prompt: QuestionPrompt;
  choices: string[];
}

const busiestPerLevel = 3;

const pickBusiest = <Picture,>(
  questions: readonly PictureQuestion<Picture>[],
  measure: (picture: Picture) => number,
): PictureQuestion<Picture>[] =>
  questions
    .toSorted(
      (first, second) => measure(second.picture) - measure(first.picture),
    )
    .slice(0, busiestPerLevel);

const listChoices = ({ answer, slips }: PictureQuestion<unknown>) => [
  answer,
  ...slips.slice(0, 3),
];

const countSharePieces = (picture: Parameters<typeof buildSharePlan>[0]) => {
  const plan = buildSharePlan(picture);
  return (
    plan.pearls.length * 36 +
    plan.ghostPearls.length * 36 +
    plan.fish.length * 60 +
    plan.plates.length * 96 +
    plan.blocks.length +
    plan.ghostBlocks.length
  );
};

const extraScenes: ExtraScene[] = [
  ...([1, 2, 6] as const).flatMap((year) =>
    pictureQuestionDifficulties.flatMap((difficulty) =>
      pickBusiest(
        buildFairShareQuestions(year, difficulty),
        countSharePieces,
      ).map((question): ExtraScene => ({
        name: `Year ${String(year)} fair shares: ${question.ask}`,
        gameType: "fair-shares",
        prompt: {
          kind: "fair-share",
          ask: question.ask,
          picture: question.picture,
        },
        choices: listChoices(question),
      })),
    ),
  ),
  ...([1, 2, 4, 5, 6] as const).flatMap((year) =>
    pictureQuestionDifficulties.flatMap((difficulty) =>
      pickBusiest(
        buildTreasureMapQuestions(year, difficulty),
        (picture) => JSON.stringify(picture).length,
      ).map((question): ExtraScene => ({
        name: `Year ${String(year)} treasure map: ${question.ask}`,
        gameType: "treasure-map",
        prompt: {
          kind: "treasure-map",
          ask: question.ask,
          picture: question.picture,
        },
        choices: listChoices(question),
      })),
    ),
  ),
  ...([2, 3, 4, 5, 6] as const).flatMap((year) =>
    pictureQuestionDifficulties.flatMap((difficulty) =>
      pickBusiest(buildChartQuestions(year, difficulty), (picture) => {
        if (picture.kind === "pie") {
          return picture.slices.length;
        }
        const layout = buildChartLayout(picture);
        return (
          layout.bars.length +
          layout.symbols.length +
          layout.sticks.length +
          layout.points.length
        );
      }).map((question): ExtraScene => ({
        name: `Year ${String(year)} chart tower: ${question.ask}`,
        gameType: "chart-tower",
        prompt: { kind: "chart", ask: question.ask, picture: question.picture },
        choices: listChoices(question),
      })),
    ),
  ),
];

describe("the fair shares, treasure map and chart tower scenes", () => {
  it.each(extraScenes)(
    `draws $name within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (scene) => {
      const renderer = await renderBayGame(scene);
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

  it("puts one pearl on the plates for every pearl in the groups", async () => {
    const renderer = await renderBayGame({
      gameType: "fair-shares",
      prompt: {
        kind: "fair-share",
        ask: "3 groups of 4 make ?",
        picture: { kind: "groups", groupCount: 3, perGroup: 4 },
      },
      choices: ["12", "7", "11", "13"],
    });

    expect(findInstanced(renderer, "share-plates").count).toBe(3);
    expect(findInstanced(renderer, "share-pearls").count).toBe(12);
    await renderer.unmount();
  });

  it("swims one fish for every place in the array", async () => {
    const renderer = await renderBayGame({
      gameType: "fair-shares",
      prompt: {
        kind: "fair-share",
        ask: "3 rows of 5 fish. How many fish?",
        picture: { kind: "array", rows: 3, columns: 5 },
      },
      choices: ["15", "8", "16", "14"],
    });

    expect(findInstanced(renderer, "share-fish").count).toBe(15);
    await renderer.unmount();
  });

  it("lays each odd or even number out in pairs on its own tray", async () => {
    const renderer = await renderBayGame({
      gameType: "fair-shares",
      prompt: {
        kind: "fair-share",
        ask: "Which number is even?",
        picture: { kind: "pairs" },
      },
      choices: ["8", "7", "9", "11"],
    });

    expect(findNamed(renderer, "pair-tray")).toHaveLength(4);
    expect(
      findNamed(renderer, "pair-pearls")
        .map(({ instance }) => instance)
        .filter(isInstancedMesh)
        .map(({ count }) => count),
    ).toEqual([8, 7, 9, 11]);
    await renderer.unmount();
  });

  it("puts the turtle in the middle of the four landmarks it turns between", async () => {
    const renderer = await renderBayGame({
      gameType: "treasure-map",
      prompt: {
        kind: "treasure-map",
        ask: "The turtle faces the shell. It makes a half turn. What does it face now?",
        picture: {
          kind: "turn",
          around: ["shell", "starfish", "crab", "anchor"],
          facing: 0,
        },
      },
      choices: ["shell", "starfish", "crab", "anchor"],
    });

    expect(findNamed(renderer, "turtle")).toHaveLength(1);
    expect(findNamed(renderer, "landmark-crab")).toHaveLength(1);
    await renderer.unmount();
  });

  it("marks the treasure and draws the mirror line on the grid", async () => {
    const renderer = await renderBayGame({
      gameType: "treasure-map",
      prompt: {
        kind: "treasure-map",
        ask: "The pearl at (2, 3) is reflected in the mirror line x = 5. Where does it land?",
        picture: {
          kind: "grid",
          low: 0,
          high: 10,
          treasure: { x: 2, y: 3 },
          submarine: undefined,
          flags: [],
          outline: [],
          isOutlineClosed: false,
          mirror: { axis: "x", at: 5 },
        },
      },
      choices: ["(8, 3)", "(2, 7)", "(3, 2)", "(7, 3)"],
    });

    expect(findNamed(renderer, "treasure")).toHaveLength(1);
    expect(findNamed(renderer, "mirror-line")).toHaveLength(1);
    await renderer.unmount();
  });

  it("raises a bar for every category but the one the Child must work out", async () => {
    const renderer = await renderBayGame({
      gameType: "chart-tower",
      prompt: {
        kind: "chart",
        ask: "The mean is 5 shells. How many shells did Mo find?",
        picture: {
          kind: "bar-chart",
          bars: [
            { label: "Sid", value: 4 },
            { label: "Pip", value: 6 },
            { label: "Kit", value: 3 },
            { label: "Mo", value: 7 },
          ],
          scaleStep: 2,
          hiddenLabel: "Mo",
        },
      },
      choices: ["7", "5", "6", "8"],
    });

    expect(findInstanced(renderer, "chart-bars").count).toBe(3);
    expect(findInstanced(renderer, "chart-hidden-bar").count).toBe(1);
    await renderer.unmount();
  });

  it("cuts the sand-dollar pie into one slice for each answer", async () => {
    const renderer = await renderBayGame({
      gameType: "chart-tower",
      prompt: {
        kind: "chart",
        ask: "How many chose turtles?",
        picture: {
          kind: "pie",
          slices: [
            { label: "dolphins", parts: 2 },
            { label: "turtles", parts: 1 },
            { label: "sharks", parts: 1 },
          ],
          wholeParts: 4,
          total: 24,
        },
      },
      choices: ["6", "12", "4", "8"],
    });

    expect(findNamed(renderer, "pie-slice")).toHaveLength(3);
    await renderer.unmount();
  });
});

describe("the fair shares, treasure map and chart tower layouts", () => {
  it("never writes or splits out the scale factor a Child is asked to find", () => {
    const factorQuestions = buildFairShareQuestions(6, 2).filter(({ ask }) =>
      ask.endsWith("What is the scale factor?"),
    );

    expect(factorQuestions.length).toBeGreaterThan(0);
    for (const { picture, answer } of factorQuestions) {
      const { label, ghostBlocks } = buildSharePlan(picture);
      expect(label?.text).toBe("× ?");
      expect(ghostBlocks).toHaveLength(1);
      expect(label?.text).not.toContain(answer);
    }
  });

  it("writes the scale factor a Child is given, one segment for each time bigger", () => {
    const [scaleUp] = buildFairShareQuestions(6, 2).filter(({ ask }) =>
      ask.includes("scaled by a factor of 4"),
    );
    const { label, ghostBlocks } = buildSharePlan(scaleUp.picture);

    expect(label?.text).toBe("× 4");
    expect(ghostBlocks).toHaveLength(4);
  });

  it("lays pearls out two by two, so an odd number leaves one pearl without a partner", () => {
    const spots = listPairSpots(7, 0.5);
    const columns = spots.map(([x]) => x.toFixed(3));

    expect(spots).toHaveLength(7);
    expect(columns.filter((column) => column === columns[6])).toHaveLength(1);
    expect(columns.filter((column) => column === columns[0])).toHaveLength(2);
  });

  it("turns the turtle to look straight at the landmark it faces", () => {
    for (const direction of [0, 1, 2, 3]) {
      const [x, , z] = findCompassSpot(direction);
      const turn = findFacingTurn(direction);
      expect(Math.sin(turn)).toBeCloseTo(x / Math.hypot(x, z));
      expect(Math.cos(turn)).toBeCloseTo(z / Math.hypot(x, z));
    }
  });

  it("joins three corners with two sides, and closes a triangle with three", () => {
    const corners = [
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 3 },
    ];

    expect(listOutlineEdges(corners, false)).toHaveLength(2);
    expect(listOutlineEdges(corners, true).at(-1)).toEqual([
      corners[2],
      corners[0],
    ]);
  });

  it("tops the value axis at the first step above the tallest bar", () => {
    expect(findAxisTop([15, 30, 45], 5)).toBe(45);
    expect(findAxisTop([7, 12], 5)).toBe(15);
    expect(findAxisTop([0], 2)).toBe(2);
  });

  it("cuts the pie so each slice's angle matches its share of the whole", () => {
    const wedges = listPieWedges(
      [
        { label: "dolphins", parts: 90 },
        { label: "turtles", parts: 270 },
      ],
      360,
    );

    expect(wedges[0].length).toBeCloseTo(Math.PI / 2);
    expect(wedges[1].start).toBeCloseTo(Math.PI / 2);
    expect(wedges[1].start + wedges[1].length).toBeCloseTo(Math.PI * 2);
  });
});
