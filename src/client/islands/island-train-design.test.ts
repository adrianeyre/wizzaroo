import { Color, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  findFirstCarriageIndex,
  findIslandTrain,
  listTrainVehicles,
  trainDesigns,
  trainStyleByIsland,
  trainStyles,
  UnknownIslandTrainError,
} from "./island-train-design.js";
import {
  finishes,
  type TrainDetail,
  type TrainVehicleModel,
} from "./trains/train-kit.js";

const islandIds = [
  "meadow-isle",
  "frost-isle",
  "sunscorch-sands",
  "jungle-reach",
  "ember-isle",
  "starfall-isle",
];

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const findExtent = (geometry: BufferGeometry) => {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box === null) {
    throw new Error("The vehicle has no size");
  }
  return {
    lowest: box.min.y,
    highest: box.max.y,
    widest: Math.max(-box.min.x, box.max.x),
    front: box.max.z,
    back: box.min.z,
  };
};

const findMainPaint = (geometry: BufferGeometry): string => {
  const [paint] = geometry.groups;
  const colours = geometry.getAttribute("color");
  const counts = new Map<string, number>();
  const colour = new Color();
  for (let vertex = paint.start; vertex < paint.start + paint.count; vertex++) {
    const key = colour
      .fromBufferAttribute(colours, vertex)
      .getHexString()
      .slice(0, 5);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].toSorted(
    (first, second) => second[1] - first[1],
  )[0][0];
};

const budgets: Record<
  "locomotive" | "tender" | "carriage",
  Record<TrainDetail, number>
> = {
  locomotive: { explore: 14_000, map: 3000 },
  tender: { explore: 5000, map: 1000 },
  carriage: { explore: 7000, map: 1500 },
};

const builtVehicles = new Map<string, BufferGeometry>();

const buildOnce = (
  model: TrainVehicleModel,
  detail: TrainDetail,
  key: string,
): BufferGeometry => {
  const known = builtVehicles.get(`${key}-${detail}`);
  if (known !== undefined) {
    return known;
  }
  const built = model.build(detail);
  builtVehicles.set(`${key}-${detail}`, built);
  return built;
};

describe("the Island trains", () => {
  it("gives every Island its own style of train", () => {
    const styles = islandIds.map((islandId) => findIslandTrain(islandId).style);
    expect(new Set(styles).size).toBe(trainStyles.length);
    expect(styles.toSorted()).toStrictEqual([...trainStyles].toSorted());
    for (const islandId of islandIds) {
      expect(findIslandTrain(islandId)).toBe(
        trainDesigns[trainStyleByIsland[islandId]],
      );
    }
  });

  it("refuses to find a train for an unknown Island", () => {
    expect(() => findIslandTrain("nowhere-isle")).toThrow(
      UnknownIslandTrainError,
    );
    expect(() => findIslandTrain("toString")).toThrow(UnknownIslandTrainError);
  });

  it("has one steam engine that puffs smoke and one electric engine under the wires", () => {
    const designs = Object.values(trainDesigns);
    expect(designs.filter((design) => design.chimney !== undefined)).toEqual([
      trainDesigns.steam,
    ]);
    expect(designs.filter((design) => design.pantograph !== undefined)).toEqual(
      [trainDesigns.electric],
    );
    expect(trainDesigns.steam.tender).toBeDefined();
  });

  it("paints every Island's engine and carriages in its own livery", () => {
    const engines = islandIds.map((islandId) =>
      findMainPaint(
        buildOnce(findIslandTrain(islandId).locomotive, "explore", islandId),
      ),
    );
    const carriages = islandIds.map((islandId) =>
      findMainPaint(
        buildOnce(
          findIslandTrain(islandId).carriage,
          "explore",
          `${islandId}-carriage`,
        ),
      ),
    );
    expect(new Set(engines).size).toBe(islandIds.length);
    expect(new Set(carriages).size).toBe(islandIds.length);
    const carriageBuilders = new Set(
      islandIds.map((islandId) => findIslandTrain(islandId).carriage.build),
    );
    expect(carriageBuilders.size).toBe(islandIds.length);
  });

  describe.each(trainStyles)("the %s train", (style) => {
    const design = trainDesigns[style];
    const vehicles = listTrainVehicles(design)
      .filter(
        (vehicle, index, all) =>
          all.findIndex((other) => other.kind === vehicle.kind) === index,
      )
      .flatMap(({ kind, model }) =>
        (["explore", "map"] as const).map((detail) => ({
          kind,
          detail,
          model,
          geometry: buildOnce(model, detail, `${style}-${kind}`),
        })),
      );

    it("has a name and engine for children to read and a sensible make-up", () => {
      expect(design.style).toBe(style);
      expect(design.name).toMatch(/^the /);
      expect(design.engine.length).toBeGreaterThan(10);
      expect(design.carriageCount).toBeGreaterThanOrEqual(2);
      expect(design.carriageCount).toBeLessThanOrEqual(4);
      expect(design.locomotive.length).toBeGreaterThanOrEqual(5);
      expect(design.locomotive.length).toBeLessThanOrEqual(7.2);
      expect(design.carriage.length).toBeGreaterThanOrEqual(5.6);
      expect(design.carriage.length).toBeLessThanOrEqual(7);
      expect(listTrainVehicles(design)[findFirstCarriageIndex(design)]).toEqual(
        { kind: "carriage", model: design.carriage },
      );
    });

    it.each(vehicles)(
      "stands its $kind ($detail) on the rails within the loading gauge, buffers to the ends",
      ({ kind, model, geometry }) => {
        const extent = findExtent(geometry);
        expect(extent.lowest).toBeGreaterThanOrEqual(-0.06);
        expect(extent.lowest).toBeLessThanOrEqual(0.02);
        expect(extent.widest).toBeLessThanOrEqual(0.76);
        expect(extent.front).toBeCloseTo(model.length / 2, 1);
        expect(extent.back).toBeCloseTo(-model.length / 2, 1);
        const tallest =
          kind === "locomotive" && design.pantograph !== undefined
            ? design.pantograph.top + 0.01
            : kind === "locomotive" && design.chimney !== undefined
              ? 2.31
              : 2.26;
        expect(extent.highest).toBeLessThanOrEqual(tallest);
      },
    );

    it.each(vehicles)(
      "builds its $kind ($detail) in detail within its triangle budget, in paint, glass and metal",
      ({ kind, detail, geometry }) => {
        const triangles = countTriangles(geometry);
        expect(triangles).toBeLessThanOrEqual(budgets[kind][detail]);
        expect(triangles).toBeGreaterThan(budgets[kind][detail] / 6);
        expect(
          geometry.groups.map(({ materialIndex }) => materialIndex),
        ).toEqual(finishes.map((_, index) => index));
        expect(geometry.groups[0].count).toBeGreaterThan(0);
        expect(geometry.getAttribute("normal").count).toBe(
          geometry.getAttribute("position").count,
        );
        expect(geometry.hasAttribute("uv")).toBe(false);
      },
    );

    it("draws its World Map vehicles lighter than its exploring ones", () => {
      for (const kind of ["locomotive", "carriage"] as const) {
        const [explore, map] = vehicles
          .filter((vehicle) => vehicle.kind === kind)
          .map(({ geometry }) => countTriangles(geometry));
        expect(map).toBeLessThan(explore / 2);
      }
    });
  });

  it("puts the steam engine's chimney on top of its boiler, at the front", () => {
    const { chimney, locomotive } = trainDesigns.steam;
    const extent = findExtent(
      buildOnce(locomotive, "explore", "steam-locomotive"),
    );
    expect(chimney).toBeDefined();
    const [x, y, z] = chimney ?? [0, 0, 0];
    expect(Math.abs(x)).toBeLessThan(0.05);
    expect(y).toBeGreaterThan(1.8);
    expect(y).toBeLessThanOrEqual(extent.highest + 0.01);
    expect(z).toBeGreaterThan(0.6);
  });

  it("raises the electric engine's pantograph to the overhead wire", () => {
    const { pantograph, locomotive } = trainDesigns.electric;
    const extent = findExtent(
      buildOnce(locomotive, "explore", "electric-locomotive"),
    );
    expect(pantograph).toBeDefined();
    expect(pantograph?.top).toBeGreaterThanOrEqual(2.45);
    expect(pantograph?.top).toBeLessThanOrEqual(2.6);
    expect(extent.highest).toBeCloseTo(pantograph?.top ?? 0, 1);
    expect(Math.abs(pantograph?.z ?? 99)).toBeLessThan(locomotive.length / 2);
  });
});
