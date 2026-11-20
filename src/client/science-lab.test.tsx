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
  labGames,
  labProps,
  labStations,
  type LabGame,
  type LabProp,
  type LabStation,
} from "../curriculum/lab-games.js";
import { ScienceLabWorld } from "./science-lab.js";

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

const listGameChoices = ({ station, questions }: LabGame): string[] => {
  const [{ answer, distractors }] = questions;
  return station === "true-false"
    ? ["True", "False"]
    : [answer, ...distractors];
};

const renderScienceLab = async (
  game: LabGame | undefined,
  { poppedChoiceIndex }: { poppedChoiceIndex?: number } = {},
) => {
  const renderer = await ReactThreeTestRenderer.create(
    <ScienceLabWorld
      prompt={
        game === undefined
          ? undefined
          : {
              kind: "lab",
              station: game.station,
              prop: game.prop,
              ask: game.questions[0].ask,
            }
      }
      choices={game === undefined ? [] : listGameChoices(game)}
      hiddenChoiceIndexes={[]}
      companionMood="waiting"
      poppedChoiceIndex={poppedChoiceIndex}
      popCount={1}
      isEffectsOn
    />,
  );
  await renderer.advanceFrames(1, 1 / 60);
  return renderer;
};

const buildGameWith = (
  station: LabStation,
  prop: LabProp = labGames[0].prop,
): LabGame => ({ ...labGames[0], station, prop });

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("ScienceLabWorld", () => {
  it.each(labGames.map((game) => [game.yearGroup, game.title, game]))(
    `draws Year %i's %s within ${String(triangleBudget)} triangles and ${String(meshBudget)} meshes`,
    async (_yearGroup, _title, game) => {
      const renderer = await renderScienceLab(game, { poppedChoiceIndex: 0 });
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

  it("sets out the lab bench, its shelf of glassware and the Companion in every game", async () => {
    const renderer = await renderScienceLab(labGames[0]);

    expect(findNamed(renderer, "lab-bench")).toHaveLength(1);
    expect(findNamed(renderer, "shelf-glassware")).toHaveLength(1);
    expect(findNamed(renderer, "companion")).toHaveLength(1);
    await renderer.unmount();
  });

  it("turns the game's prop on a turntable above the choices", async () => {
    for (const prop of labProps) {
      const renderer = await renderScienceLab(buildGameWith("sort", prop));

      expect(findNamed(renderer, `prop-${prop}`)).toHaveLength(1);
      await renderer.unmount();
    }
  });

  it("draws each station's own 3D choices, one for every choice offered", async () => {
    const choiceNames = {
      sort: "sample-tray",
      "odd-one-out": "specimen-jar",
      "true-false": "illuminated-key",
      "fill-gap": "glass-tile",
      sequence: "hex-tile",
      mystery: "petri-dish",
      predict: "conical-flask",
      vocabulary: "data-card",
      compare: "graduated-cylinder",
      investigate: "instrument-case",
    } as const;

    for (const station of labStations) {
      const game = buildGameWith(station);
      const renderer = await renderScienceLab(game);

      expect(findNamed(renderer, choiceNames[station])).toHaveLength(
        listGameChoices(game).length,
      );
      await renderer.unmount();
    }
  });

  it("shows only the lab and the Companion while the Mission is being celebrated", async () => {
    const renderer = await renderScienceLab(undefined);

    expect(findNamed(renderer, "lab-bench")).toHaveLength(1);
    expect(
      labProps.flatMap((prop) => findNamed(renderer, `prop-${prop}`)),
    ).toHaveLength(0);
    await renderer.unmount();
  });
});
