import type { BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import { vehicleModels } from "../../curriculum/catalogue.js";
import {
  findVehicleDesign,
  vehicleDesigns,
  type VehicleModel,
} from "./vehicle-designs.js";

const listCorners = (geometry: BufferGeometry) => {
  const positions = geometry.getAttribute("position");
  return Array.from({ length: positions.count }, (_, index) => ({
    x: positions.getX(index),
    y: positions.getY(index),
    z: positions.getZ(index),
  }));
};

const countTriangles = (geometry: BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;

const isEveryFacePainted = (geometry: BufferGeometry): boolean => {
  const colours = geometry.getAttribute("color");
  return Array.from({ length: colours.count }, (_, index) =>
    Math.max(colours.getX(index), colours.getY(index), colours.getZ(index)),
  ).every((brightest) => brightest > 0);
};

const findExtent = (geometry: BufferGeometry) => {
  const corners = listCorners(geometry);
  const along = (axis: "x" | "y" | "z") => {
    const values = corners.map((corner) => corner[axis]);
    return { lowest: Math.min(...values), highest: Math.max(...values) };
  };
  return { x: along("x"), y: along("y"), z: along("z") };
};

const builtVehicles = vehicleModels.map((model) => {
  const design = vehicleDesigns[model];
  return { model, design, geometry: design.buildGeometry("#3366cc") };
});

const pedalled: VehicleModel[] = [
  "bicycle",
  "tandem-bicycle",
  "penny-farthing",
  "tricycle",
  "kick-scooter",
  "skateboard",
];

const cars: VehicleModel[] = [
  "family-car",
  "sports-car",
  "taxi",
  "police-car",
  "jeep",
  "pickup-truck",
  "racing-car",
  "dune-buggy",
];

describe("the vehicle designs", () => {
  it("gives every vehicle in the catalogue a design of its own", () => {
    expect(Object.keys(vehicleDesigns).toSorted()).toStrictEqual(
      [...vehicleModels].toSorted(),
    );
    for (const model of vehicleModels) {
      expect(vehicleDesigns[model].model).toBe(model);
      expect(findVehicleDesign(model)).toBe(vehicleDesigns[model]);
    }
  });

  it("finds no design for a vehicle that is not in the catalogue", () => {
    expect(findVehicleDesign("hovercraft")).toBeUndefined();
    expect(findVehicleDesign("")).toBeUndefined();
  });

  it.each(builtVehicles)(
    "stands the $model on the ground, centred and facing along z",
    ({ design, geometry }) => {
      const extent = findExtent(geometry);
      expect(extent.y.lowest).toBeGreaterThanOrEqual(0);
      expect(extent.y.lowest).toBeLessThan(0.03);
      expect(Math.abs(extent.x.lowest + extent.x.highest) / 2).toBeLessThan(
        0.03,
      );
      expect(Math.abs(extent.z.lowest + extent.z.highest) / 2).toBeLessThan(
        0.05,
      );
      expect(extent.z.highest - extent.z.lowest).toBeGreaterThan(
        extent.x.highest - extent.x.lowest,
      );
      expect(extent.z.highest - extent.z.lowest).toBeCloseTo(design.length, 1);
      expect(extent.x.highest - extent.x.lowest).toBeCloseTo(design.width, 1);
      expect(extent.y.highest).toBeCloseTo(design.height, 1);
    },
  );

  it.each(builtVehicles)(
    "keeps the $model detailed but within its share of the scene's triangles",
    ({ geometry }) => {
      expect(countTriangles(geometry)).toBeGreaterThan(400);
      expect(countTriangles(geometry)).toBeLessThan(6000);
    },
  );

  it.each(builtVehicles)(
    "paints every face of the $model with the same attributes throughout",
    ({ geometry }) => {
      expect(isEveryFacePainted(geometry)).toBe(true);
      expect(Object.keys(geometry.attributes).toSorted()).toStrictEqual([
        "color",
        "normal",
        "position",
      ]);
    },
  );

  it("paints the body in the Item's colour", () => {
    const red = vehicleDesigns.taxi.buildGeometry("#ff0000");
    const green = vehicleDesigns.taxi.buildGeometry("#00ff00");
    const colours = red.getAttribute("color");
    const reddest = Array.from(
      { length: colours.count },
      (_, index) => colours.getX(index) - colours.getY(index),
    );
    expect(Math.max(...reddest)).toBeGreaterThan(0.6);
    const otherColours = green.getAttribute("color");
    const greenest = Array.from(
      { length: otherColours.count },
      (_, index) => otherColours.getY(index) - otherColours.getX(index),
    );
    expect(Math.max(...greenest)).toBeGreaterThan(0.6);
  });

  it.each(builtVehicles.filter(({ design }) => design.rider.pose === "seated"))(
    "leaves the head and shoulders of the $model's rider clear of the bodywork",
    ({ design, geometry }) => {
      const [riderX, riderY, riderZ] = design.rider.position;
      const overHead = listCorners(geometry).filter(
        ({ x, y, z }) =>
          y > riderY + 0.5 && Math.hypot(x - riderX, z - riderZ) < 0.2,
      );
      expect(overHead).toStrictEqual([]);
    },
  );

  it.each(builtVehicles.filter(({ design }) => design.rider.pose !== "hidden"))(
    "seats or stands the $model's rider on the vehicle itself",
    ({ design, geometry }) => {
      const [riderX, riderY, riderZ] = design.rider.position;
      const extent = findExtent(geometry);
      expect(riderX).toBeGreaterThan(extent.x.lowest);
      expect(riderX).toBeLessThan(extent.x.highest);
      expect(riderZ).toBeGreaterThan(extent.z.lowest);
      expect(riderZ).toBeLessThan(extent.z.highest);
      const seatHeight =
        design.rider.pose === "seated" ? riderY + 0.25 : riderY;
      const underRider = listCorners(geometry).filter(
        ({ x, y, z }) =>
          Math.abs(x - riderX) < 0.2 &&
          Math.abs(z - riderZ) < 0.2 &&
          Math.abs(y - seatHeight) < 0.06,
      );
      expect(underRider.length).toBeGreaterThan(0);
    },
  );

  it("hides the rider only inside tall enclosed cabs", () => {
    const hidden = vehicleModels.filter(
      (model) => vehicleDesigns[model].rider.pose === "hidden",
    );
    expect(hidden.toSorted()).toStrictEqual(
      [
        "ambulance",
        "camper-van",
        "double-decker-bus",
        "fire-engine",
        "ice-cream-van",
        "van",
      ].toSorted(),
    );
    expect(vehicleDesigns.skateboard.rider.pose).toBe("standing");
    expect(vehicleDesigns["kick-scooter"].rider.pose).toBe("standing");
  });

  it("drives faster than walking, with bikes slower than cars and sports cars fastest", () => {
    for (const model of vehicleModels) {
      const { topSpeed, acceleration, turnRate } = vehicleDesigns[model];
      expect(topSpeed).toBeGreaterThan(3.4);
      expect(topSpeed).toBeLessThanOrEqual(20);
      expect(acceleration).toBeGreaterThanOrEqual(3);
      expect(acceleration).toBeLessThanOrEqual(12);
      expect(turnRate).toBeGreaterThanOrEqual(1.6);
      expect(turnRate).toBeLessThanOrEqual(3.2);
    }
    const fastestPedalled = Math.max(
      ...pedalled.map((model) => vehicleDesigns[model].topSpeed),
    );
    const slowestCar = Math.min(
      ...cars.map((model) => vehicleDesigns[model].topSpeed),
    );
    expect(fastestPedalled).toBeLessThan(slowestCar);
    expect(vehicleDesigns["sports-car"].topSpeed).toBeGreaterThan(
      vehicleDesigns["family-car"].topSpeed,
    );
    expect(vehicleDesigns["racing-car"].topSpeed).toBeGreaterThan(
      vehicleDesigns["family-car"].topSpeed,
    );
    expect(vehicleDesigns.skateboard.turnRate).toBeGreaterThan(
      vehicleDesigns["double-decker-bus"].turnRate,
    );
  });
});
