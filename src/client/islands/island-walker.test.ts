import { describe, expect, it } from "vitest";
import { worldMap } from "../../curriculum/world-map.js";
import {
  buildAdventureWorld,
  findExploreAdventure,
  findIslandAdventure,
  findWalkSurface,
  isWithinReachOf,
  listExploreBlockers,
  listExploreInteractions,
  scalePlaceForExplore,
  swimSink,
} from "./island-adventures.js";
import {
  buildStartingWalker,
  findIntentTowards,
  isCameraTurningPointer,
  isMouseWalkingPointer,
  stepWalker,
  turnIntentToCamera,
  walkSpeed,
  type WalkIntent,
  type Walker,
} from "./island-walker.js";

const frameSeconds = 1 / 60;

const still: WalkIntent = { x: 0, z: 0, wantsJump: false };

const walkFor = (
  walker: Walker,
  intent: WalkIntent,
  seconds: number,
  world: ReturnType<typeof buildAdventureWorld>,
): Walker[] =>
  Array.from({ length: Math.round(seconds / frameSeconds) }).reduce<Walker[]>(
    (steps, _frame, index) => [
      ...steps,
      stepWalker(
        steps.at(-1) ?? walker,
        index === 0 ? intent : { ...intent, wantsJump: false },
        frameSeconds,
        world,
      ),
    ],
    [],
  );

const meadow = buildAdventureWorld(findIslandAdventure("meadow-isle"));

describe("walking around an Island", () => {
  it("walks the Child the way the stick points", () => {
    const start = buildStartingWalker(meadow, { x: -4, z: 2 }, 0);
    const end = walkFor(start, { x: 1, z: 0, wantsJump: false }, 1, meadow).at(
      -1,
    );
    expect(end?.x).toBeGreaterThan(start.x + walkSpeed * 0.6);
    expect(end?.z).toBeCloseTo(start.z, 1);
    expect(end?.heading).toBeCloseTo(Math.PI / 2, 1);
  });

  it("stays put with nothing pressed", () => {
    const start = buildStartingWalker(meadow, { x: -4, z: 2 }, 0);
    const end = walkFor(start, still, 1, meadow).at(-1);
    expect(end?.x).toBeCloseTo(start.x, 5);
    expect(end?.z).toBeCloseTo(start.z, 5);
  });

  it("climbs a mountain more slowly than it walks on the flat, and ends up higher", () => {
    const flatStart = buildStartingWalker(meadow, { x: -4, z: 2 }, 0);
    const slopeStart = buildStartingWalker(meadow, { x: 15, z: -3 }, 0);
    const uphill = { x: 0, z: -1, wantsJump: false };
    const flatEnd = walkFor(flatStart, uphill, 1, meadow).at(-1);
    const slopeEnd = walkFor(slopeStart, uphill, 1, meadow).at(-1);
    const flatDistance = Math.abs((flatEnd?.z ?? 0) - flatStart.z);
    const slopeDistance = Math.abs((slopeEnd?.z ?? 0) - slopeStart.z);
    expect(slopeDistance).toBeLessThan(flatDistance);
    expect(slopeEnd?.y).toBeGreaterThan(slopeStart.y + 0.5);
  });

  it("swims in the sea, lower in the water and slower than walking", () => {
    const start = buildStartingWalker(meadow, { x: 0, z: 19 }, 0);
    expect(start.surface).toBe("water");
    expect(start.y).toBeCloseTo(-swimSink, 5);
    const end = walkFor(start, { x: 1, z: 0, wantsJump: false }, 1, meadow).at(
      -1,
    );
    expect(end?.x).toBeLessThan(start.x + walkSpeed * 0.7);
    expect(end?.surface).toBe("water");
  });

  it("will not jump while swimming", () => {
    const start = buildStartingWalker(meadow, { x: 0, z: 19 }, 0);
    const [first] = walkFor(
      start,
      { ...still, wantsJump: true },
      frameSeconds,
      meadow,
    );
    expect(first.isAirborne).toBe(false);
  });

  it("jumps up and lands back on the ground", () => {
    const start = buildStartingWalker(meadow, { x: -4, z: 2 }, 0);
    const steps = walkFor(start, { ...still, wantsJump: true }, 1.5, meadow);
    expect(Math.max(...steps.map(({ y }) => y))).toBeGreaterThan(start.y + 0.5);
    expect(steps.at(-1)?.isAirborne).toBe(false);
    expect(steps.at(-1)?.y).toBeCloseTo(start.y, 2);
  });

  it("jumps higher and longer on Starfall Isle's low gravity", () => {
    const starfall = buildAdventureWorld(findIslandAdventure("starfall-isle"));
    const onEarth = walkFor(
      buildStartingWalker(meadow, { x: -4, z: 2 }, 0),
      { ...still, wantsJump: true },
      3,
      meadow,
    );
    const onStarfall = walkFor(
      buildStartingWalker(starfall, { x: -12, z: 1 }, 0),
      { ...still, wantsJump: true },
      3,
      starfall,
    );
    const airborneFrames = (steps: Walker[]) =>
      steps.filter(({ isAirborne }) => isAirborne).length;
    expect(airborneFrames(onStarfall)).toBeGreaterThan(
      airborneFrames(onEarth) * 2,
    );
  });

  it("bounces the Child high off a bounce pad", () => {
    const [pad] = meadow.adventure.bouncePads.places;
    const start = buildStartingWalker(meadow, pad, 0);
    const steps = walkFor(start, still, 1, meadow);
    expect(Math.max(...steps.map(({ y }) => y))).toBeGreaterThan(start.y + 2);
  });

  it("walks over the stone bridge rather than dropping into the river", () => {
    const [bridge] = meadow.bridges;
    const start = buildStartingWalker(
      meadow,
      { x: bridge.from.x - 0.6, z: bridge.from.z - 0.2 },
      0,
    );
    const across = {
      x: bridge.to.x - bridge.from.x,
      z: bridge.to.z - bridge.from.z,
    };
    const length = Math.hypot(across.x, across.z);
    const steps = walkFor(
      start,
      { x: across.x / length, z: across.z / length, wantsJump: false },
      2,
      meadow,
    );
    expect(steps.some(({ surface }) => surface === "bridge")).toBe(true);
    expect(steps.some(({ surface }) => surface === "water")).toBe(false);
  });

  it("holds the Child back from Ember Isle's lava", () => {
    const ember = buildAdventureWorld(findIslandAdventure("ember-isle"));
    const lavaBank = { x: 16, z: -11 };
    const lava = { x: 16, z: -12 };
    expect(findWalkSurface(ember, lava, 10).kind).toBe("lava");
    const start = buildStartingWalker(ember, lavaBank, 0);
    const steps = walkFor(start, { x: 0, z: -1, wantsJump: false }, 1, ember);
    expect(steps.some(({ isHeldBackByLava }) => isHeldBackByLava)).toBe(true);
    expect(steps.every(({ surface }) => surface !== "lava")).toBe(true);
  });

  it("slides on Frost Isle's ice, taking longer to stop", () => {
    const frost = buildAdventureWorld(findIslandAdventure("frost-isle"));
    const onIce = buildStartingWalker(frost, { x: 12.4, z: 6 }, 0);
    expect(onIce.surface).toBe("ice");
    const sliding = { ...onIce, velocityX: 0, velocityZ: 3 };
    const onSnow = {
      ...buildStartingWalker(frost, { x: -4, z: 2 }, 0),
      velocityZ: 3,
    };
    const [iceStep] = walkFor(sliding, still, frameSeconds * 2, frost);
    const [snowStep] = walkFor(onSnow, still, frameSeconds * 2, frost);
    expect(iceStep.velocityZ).toBeGreaterThan(snowStep.velocityZ);
  });

  it("stops walking towards a tapped spot once it arrives", () => {
    expect(
      findIntentTowards({ x: 0, z: 0 }, { x: 4, z: 0 }, 0.3),
    ).toStrictEqual({
      x: 1,
      z: 0,
      wantsJump: false,
    });
    expect(
      findIntentTowards({ x: 0, z: 0 }, { x: 0.2, z: 0 }, 0.3),
    ).toBeUndefined();
  });

  it("turns the stick so that forward always walks away from the camera", () => {
    const fromBehind = turnIntentToCamera({ right: 0, forward: 1 }, 0);
    expect(fromBehind.x).toBeCloseTo(0, 5);
    expect(fromBehind.z).toBeCloseTo(-1, 5);
    const fromTheSide = turnIntentToCamera(
      { right: 1, forward: 0 },
      Math.PI / 2,
    );
    expect(fromTheSide.x).toBeCloseTo(0, 5);
    expect(fromTheSide.z).toBeCloseTo(-1, 5);
  });

  it("walks with the left mouse button, turns the camera with the right one, and lets a finger drag the camera", () => {
    expect(isMouseWalkingPointer({ pointerType: "mouse", button: 0 })).toBe(
      true,
    );
    expect(isCameraTurningPointer({ pointerType: "mouse", button: 0 })).toBe(
      false,
    );
    expect(isMouseWalkingPointer({ pointerType: "mouse", button: 2 })).toBe(
      false,
    );
    expect(isCameraTurningPointer({ pointerType: "mouse", button: 2 })).toBe(
      true,
    );
    expect(isMouseWalkingPointer({ pointerType: "touch", button: 0 })).toBe(
      false,
    );
    expect(isCameraTurningPointer({ pointerType: "touch", button: 0 })).toBe(
      true,
    );
  });

  it("slides round a Region's landmark rather than getting stuck, all the way from the start to Meadow Isle's lighthouse", () => {
    const explored = buildAdventureWorld(findExploreAdventure("meadow-isle"));
    const regions = worldMap.regions
      .filter(({ islandId }) => islandId === "meadow-isle")
      .map(scalePlaceForExplore);
    const blockers = listExploreBlockers(explored.adventure, regions);
    const lighthouse = listExploreInteractions(
      explored.adventure,
      regions,
    ).find(({ id }) => id === "lighthouse");
    expect(lighthouse).toBeDefined();
    let walker = buildStartingWalker(explored, explored.adventure.start, 0);
    let frames = 0;
    while (
      lighthouse !== undefined &&
      !isWithinReachOf(lighthouse, walker) &&
      frames < 60 * 120
    ) {
      const intent =
        findIntentTowards(walker, lighthouse.position, 0.35) ?? still;
      walker = stepWalker(walker, intent, frameSeconds, explored, blockers);
      frames += 1;
    }
    expect(
      lighthouse !== undefined && isWithinReachOf(lighthouse, walker),
    ).toBe(true);
    blockers.forEach(({ centre, radius }) => {
      expect(
        Math.hypot(walker.x - centre.x, walker.z - centre.z),
      ).toBeGreaterThanOrEqual(radius - 0.01);
    });
  });

  it("slides round a landmark it walks straight at, head on, and carries on past it", () => {
    const centre = { x: -4, z: 2 };
    const blockers = [{ centre, radius: 2.4 }];
    const goal = { x: centre.x + 5, z: centre.z };
    let walker = buildStartingWalker(
      meadow,
      { x: centre.x - 5, z: centre.z },
      0,
    );
    for (let frame = 0; frame < 60 * 8; frame += 1) {
      const intent = findIntentTowards(walker, goal, 0.35) ?? still;
      walker = stepWalker(walker, intent, frameSeconds, meadow, blockers);
    }
    expect(Math.hypot(walker.x - goal.x, walker.z - goal.z)).toBeLessThan(0.6);
  });
});
