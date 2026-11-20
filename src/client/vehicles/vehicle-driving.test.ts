import { describe, expect, it } from "vitest";
import {
  findExploreAdventure,
  findWalkSurface,
} from "../islands/island-adventures.js";
import {
  createObstacleGrid,
  markCylinder,
  toObstacles,
} from "../islands/island-obstacles.js";
import { buildExploreWorld } from "../islands/island-transport.js";
import { vehicleModels } from "../../curriculum/catalogue.js";
import { findVehicleDesign, vehicleDesigns } from "./vehicle-designs.js";
import {
  findStepOutSpot,
  isDrivableKind,
  placeVehicleNear,
  stepVehicle,
  type DrivenVehicle,
} from "./vehicle-driving.js";

const adventure = findExploreAdventure("meadow-isle");
const world = buildExploreWorld(adventure);
const car = vehicleDesigns["sports-car"];
const bicycle = vehicleDesigns.bicycle;

const longestTrail = adventure.trails
  .flatMap((trail) =>
    trail.slice(1).map((to, index) => ({ from: trail[index], to })),
  )
  .toSorted(
    (first, second) =>
      Math.hypot(second.to.x - second.from.x, second.to.z - second.from.z) -
      Math.hypot(first.to.x - first.from.x, first.to.z - first.from.z),
  )[0];
const trailHeading = Math.atan2(
  longestTrail.to.x - longestTrail.from.x,
  longestTrail.to.z - longestTrail.from.z,
);

const drive = (
  vehicle: DrivenVehicle,
  input: { right: number; forward: number },
  seconds: number,
  design = car,
): DrivenVehicle => {
  let driven = vehicle;
  for (let step = 0; step < seconds * 30; step++) {
    driven = stepVehicle(driven, input, 1 / 30, world, design);
  }
  return driven;
};

const startOnTrail = (design = car): DrivenVehicle =>
  placeVehicleNear(
    world,
    { ...longestTrail.from, heading: trailHeading },
    design,
  );

describe("placing a vehicle", () => {
  it("puts it on the map just in front of the Character, on ground it can drive on", () => {
    const placed = startOnTrail();
    const reach = Math.hypot(
      placed.x - longestTrail.from.x,
      placed.z - longestTrail.from.z,
    );
    expect(reach).toBeGreaterThan(1);
    expect(reach).toBeLessThan(car.length + 4);
    expect(isDrivableKind(findWalkSurface(world, placed, Infinity).kind)).toBe(
      true,
    );
    expect(placed.speed).toBe(0);
  });

  it("has a design for every vehicle in the Catalogue", () => {
    vehicleModels.forEach((model) => {
      expect(findVehicleDesign(model)).toBeDefined();
    });
  });
});

describe("driving a vehicle", () => {
  it("speeds up forwards, and a sports car is faster than a bicycle", () => {
    const fast = drive(startOnTrail(), { right: 0, forward: 1 }, 2);
    const slow = drive(
      startOnTrail(bicycle),
      { right: 0, forward: 1 },
      2,
      bicycle,
    );
    expect(fast.speed).toBeGreaterThan(slow.speed);
    expect(fast.speed).toBeGreaterThan(5);
  });

  it("steers left and right only while it is moving", () => {
    const parked = startOnTrail();
    expect(drive(parked, { right: 1, forward: 0 }, 1).heading).toBeCloseTo(
      parked.heading,
    );
    const moving = drive(parked, { right: 0, forward: 1 }, 1);
    expect(drive(moving, { right: 1, forward: 1 }, 0.5).heading).toBeLessThan(
      moving.heading,
    );
    expect(
      drive(moving, { right: -1, forward: 1 }, 0.5).heading,
    ).toBeGreaterThan(moving.heading);
  });

  it("slows to a stop when the stick is let go, and backs up slowly", () => {
    const moving = drive(startOnTrail(), { right: 0, forward: 1 }, 1.5);
    expect(drive(moving, { right: 0, forward: 0 }, 8).speed).toBeCloseTo(0);
    const reversing = drive(startOnTrail(), { right: 0, forward: -1 }, 3);
    expect(reversing.speed).toBeLessThan(0);
    expect(-reversing.speed).toBeLessThanOrEqual(car.topSpeed * 0.4 + 0.01);
  });

  it("stops at the sea rather than driving into it", () => {
    let vehicle: DrivenVehicle = {
      ...startOnTrail(),
      x: 0,
      z: -60,
      heading: Math.PI,
    };
    vehicle = {
      ...vehicle,
      y: findWalkSurface(world, vehicle, Infinity).height,
    };
    const driven = drive(vehicle, { right: 0, forward: 1 }, 20);
    expect(isDrivableKind(findWalkSurface(world, driven, Infinity).kind)).toBe(
      true,
    );
  });

  it("lets the Character step out beside it", () => {
    const parked = startOnTrail();
    const spot = findStepOutSpot(world, parked, car);
    expect(Math.hypot(spot.x - parked.x, spot.z - parked.z)).toBeCloseTo(
      car.width / 2 + 0.6,
    );
  });
});

describe("driving among solid things", () => {
  it("stops a Vehicle at a wall in its way, and puts it on the map clear of one", () => {
    const grid = createObstacleGrid();
    const ahead = {
      x: longestTrail.from.x + Math.sin(trailHeading) * 12,
      z: longestTrail.from.z + Math.cos(trailHeading) * 12,
    };
    const across = { x: Math.cos(trailHeading), z: -Math.sin(trailHeading) };
    for (let along = -6; along <= 6; along += 0.1) {
      markCylinder(
        grid,
        { x: ahead.x + across.x * along, z: ahead.z + across.z * along },
        0.2,
        -100,
        100,
      );
    }
    const obstacles = toObstacles(grid);
    let driven = placeVehicleNear(
      world,
      { ...longestTrail.from, heading: trailHeading },
      car,
      [],
      obstacles,
    );
    expect(obstacles.isBlocked(driven, driven.y, car.width / 2)).toBe(false);
    for (let step = 0; step < 8 * 30; step++) {
      driven = stepVehicle(
        driven,
        { right: 0, forward: 1 },
        1 / 30,
        world,
        car,
        [],
        obstacles,
      );
    }
    const travelled =
      (driven.x - longestTrail.from.x) * Math.sin(trailHeading) +
      (driven.z - longestTrail.from.z) * Math.cos(trailHeading);
    expect(travelled).toBeLessThan(12);
  });
});
