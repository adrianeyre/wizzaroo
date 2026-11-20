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
  polygonNames,
  polygonProperties,
  shapesWithNets,
} from "../curriculum/polygons.js";
import { BayGameWorld, type BayGameType } from "./bay-games.js";
import { buildBlockLayout } from "./bay-block-measures.js";
import {
  buildPolygonPoints,
  countNetFaces,
  findNetPlan,
  listRightAngleCorners,
} from "./bay-shape-scenes.js";
import {
  describeTemperatureChange,
  findTemperatureHeight,
} from "./bay-thermometer.js";
import type { Shape3d } from "../curriculum/shapes-3d.js";
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

const renderScene = async ({
  gameType,
  prompt,
  choices = ["1", "2", "3", "4"],
  hiddenChoiceIndexes = [],
}: {
  gameType: BayGameType;
  prompt: QuestionPrompt;
  choices?: string[];
  hiddenChoiceIndexes?: number[];
}) => {
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
  await renderer.advanceFrames(1, 1 / 60);
  return renderer;
};

const measureScene = (renderer: ReactThreeTest.Renderer) => {
  const meshes = listMeshes(renderer);
  return {
    triangles: meshes.reduce(
      (total, mesh) => total + countDrawnTriangles(mesh),
      0,
    ),
    meshes: meshes.length,
  };
};

const busiestScenes: {
  name: string;
  gameType: BayGameType;
  prompt: QuestionPrompt;
  choices: string[];
}[] = [
  {
    name: "four-sided polygon tiles",
    gameType: "shape-hunt",
    prompt: { kind: "polygon-clue", clue: "Find the kite" },
    choices: ["kite", "rhombus", "trapezium", "parallelogram"],
  },
  {
    name: "many-sided polygon tiles",
    gameType: "shape-hunt",
    prompt: { kind: "polygon-clue", clue: "Find the regular octagon" },
    choices: [
      "regular-octagon",
      "irregular-hexagon",
      "irregular-pentagon",
      "right-angled-trapezium",
    ],
  },
  {
    name: "pyramid net",
    gameType: "shape-hunt",
    prompt: { kind: "net", shape: "pyramid" },
    choices: ["pyramid", "cube", "cone", "cylinder"],
  },
  {
    name: "cylinder net",
    gameType: "shape-hunt",
    prompt: { kind: "net", shape: "cylinder" },
    choices: ["cylinder", "cube", "cone", "sphere"],
  },
  {
    name: "thermometer",
    gameType: "ten-frames",
    prompt: {
      kind: "temperature",
      temperature: { start: 3, change: -7, answer: -4 },
    },
    choices: ["−4", "4", "−3", "10"],
  },
  {
    name: "volume block",
    gameType: "coral-heights",
    prompt: {
      kind: "block-measure",
      block: { kind: "volume", length: 6, width: 6, height: 4, answer: 144 },
    },
    choices: ["144 cm³", "36 cm³", "140 cm³", "24 cm³"],
  },
  {
    name: "perimeter block",
    gameType: "coral-heights",
    prompt: {
      kind: "block-measure",
      block: { kind: "perimeter", length: 7, width: 6, height: 1, answer: 26 },
    },
    choices: ["26 cm", "42 cm", "13 cm", "27 cm"],
  },
  {
    name: "area block",
    gameType: "coral-heights",
    prompt: {
      kind: "block-measure",
      block: { kind: "area", length: 7, width: 6, height: 1, answer: 42 },
    },
    choices: ["42 cm²", "26 cm²", "13 cm²", "43 cm²"],
  },
];

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("the Year 3 to 6 Bubble Bay scenes", () => {
  it.each(busiestScenes)(
    `draws the $name within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (scene) => {
      const renderer = await renderScene(scene);
      const { triangles, meshes } = measureScene(renderer);

      expect(triangles).toBeGreaterThan(0);
      expect(triangles).toBeLessThanOrEqual(triangleBudget);
      expect(meshes).toBeLessThanOrEqual(meshBudget);
      await renderer.unmount();
    },
  );

  it("draws each polygon choice as its own tile, leaving out those already got wrong", async () => {
    const renderer = await renderScene({
      gameType: "shape-hunt",
      prompt: { kind: "polygon-clue", clue: "Find the kite" },
      choices: ["kite", "rhombus", "trapezium", "parallelogram"],
      hiddenChoiceIndexes: [1],
    });

    expect(findNamed(renderer, "polygon-kite")).toHaveLength(1);
    expect(findNamed(renderer, "polygon-rhombus")).toHaveLength(0);
    expect(findNamed(renderer, "polygon-trapezium")).toHaveLength(1);
    await renderer.unmount();
  });

  it("lays out the net of the named shape, with the 3-D shapes as choices", async () => {
    const renderer = await renderScene({
      gameType: "shape-hunt",
      prompt: { kind: "net", shape: "pyramid" },
      choices: ["pyramid", "cube", "cone", "cylinder"],
    });

    expect(findNamed(renderer, "net-pyramid")).toHaveLength(1);
    expect(findNamed(renderer, "net-face")).toHaveLength(5);
    expect(findNamed(renderer, "shape-cube")).toHaveLength(1);
    await renderer.unmount();
  });

  it("fills the thermometer to the starting temperature", async () => {
    const renderer = await renderScene({
      gameType: "ten-frames",
      prompt: {
        kind: "temperature",
        temperature: { start: 3, change: -7, answer: -4 },
      },
    });

    expect(findNamed(renderer, "thermometer")).toHaveLength(1);
    expect(findNamed(renderer, "thermometer-liquid")).toHaveLength(1);
    expect(findNamed(renderer, "temperature-change")).toHaveLength(1);
    await renderer.unmount();
  });

  it.each([
    { kind: "volume", length: 6, width: 6, height: 4, answer: 144, cubes: 144 },
    { kind: "area", length: 7, width: 6, height: 1, answer: 42, cubes: 42 },
    {
      kind: "perimeter",
      length: 5,
      width: 3,
      height: 1,
      answer: 16,
      cubes: 15,
    },
  ] as const)(
    "builds the $kind block from one unit cube per cubic or square centimetre",
    async ({ cubes, ...block }) => {
      const renderer = await renderScene({
        gameType: "coral-heights",
        prompt: { kind: "block-measure", block },
      });

      const [unitCubes] = findNamed(renderer, "unit-cubes").map(
        ({ instance }) => instance,
      );
      expect(unitCubes).toBeInstanceOf(InstancedMesh);
      expect(unitCubes instanceof InstancedMesh ? unitCubes.count : 0).toBe(
        cubes,
      );
      expect(findNamed(renderer, "measure-block")).toHaveLength(1);
      expect(findNamed(renderer, "perimeter-outline")).toHaveLength(
        block.kind === "perimeter" ? 1 : 0,
      );
      await renderer.unmount();
    },
  );
});

describe("buildPolygonPoints", () => {
  it.each(polygonNames)(
    "draws the %s with the sides and right angles its properties say",
    (polygon) => {
      const points = buildPolygonPoints(polygon);

      expect(points).toHaveLength(polygonProperties[polygon].sides);
      expect(listRightAngleCorners(points)).toHaveLength(
        polygonProperties[polygon].rightAngles,
      );
      for (const [x, y] of points) {
        expect(Math.max(Math.abs(x), Math.abs(y))).toBeLessThanOrEqual(1);
      }
    },
  );

  const listSideLengths = (points: readonly [number, number][]) =>
    points.map(([x, y], index) => {
      const [nextX, nextY] = points[(index + 1) % points.length];
      return Math.hypot(nextX - x, nextY - y);
    });

  it("draws regular shapes with equal sides and irregular ones without", () => {
    for (const polygon of polygonNames) {
      const sides = listSideLengths(buildPolygonPoints(polygon));
      const isEqual = sides.every((side) => Math.abs(side - sides[0]) < 1e-6);
      if (polygonProperties[polygon].isRegular) {
        expect(isEqual).toBe(true);
      }
      if (
        [
          "rectangle",
          "isosceles-triangle",
          "scalene-triangle",
          "irregular-hexagon",
          "irregular-pentagon",
        ].includes(polygon)
      ) {
        expect(isEqual).toBe(false);
      }
    }
    const scalene = listSideLengths(buildPolygonPoints("scalene-triangle"));
    expect(new Set(scalene.map((side) => side.toFixed(3))).size).toBe(3);
    const rhombus = listSideLengths(buildPolygonPoints("rhombus"));
    expect(rhombus.every((side) => Math.abs(side - rhombus[0]) < 1e-6)).toBe(
      true,
    );
    expect(listRightAngleCorners(buildPolygonPoints("rhombus"))).toHaveLength(
      0,
    );
  });
});

describe("findNetPlan", () => {
  it("has one face for each face of the shape, and no net for a sphere", () => {
    const faceCounts: Record<Shape3d, number> = {
      cube: 6,
      cuboid: 6,
      pyramid: 5,
      cylinder: 3,
      cone: 2,
      sphere: 0,
    };
    for (const shape of shapesWithNets) {
      const plan = findNetPlan(shape);
      expect(plan === undefined ? 0 : countNetFaces(plan.root)).toBe(
        faceCounts[shape],
      );
    }
    expect(findNetPlan("sphere")).toBeUndefined();
  });
});

describe("the thermometer scale", () => {
  it("puts zero halfway between −10 and 10, and labels the change with its sign", () => {
    expect(findTemperatureHeight(0)).toBeCloseTo(
      (findTemperatureHeight(-10) + findTemperatureHeight(10)) / 2,
    );
    expect(describeTemperatureChange(5)).toBe("+5°");
    expect(describeTemperatureChange(-7)).toBe("−7°");
  });
});

describe("buildBlockLayout", () => {
  it("stacks the volume in layers and lays area and perimeter flat", () => {
    expect(
      buildBlockLayout({
        kind: "volume",
        length: 3,
        width: 2,
        height: 4,
        answer: 24,
      }).spots,
    ).toHaveLength(24);
    expect(
      buildBlockLayout({
        kind: "area",
        length: 3,
        width: 2,
        height: 1,
        answer: 6,
      }).layers,
    ).toBe(1);
  });
});
