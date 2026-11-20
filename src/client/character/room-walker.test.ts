import { describe, expect, it } from "vitest";
import { findClockHandTurns } from "./room-clock-and-fish-tank.js";
import { findIntentTowards } from "../islands/island-walker.js";
import {
  furnitureReaches,
  keepInsideRoom,
  roomBlockers,
} from "./room-layout.js";
import {
  buildStartingRoomWalker,
  canPlayFromAfar,
  findNearestRoomThing,
  isThingInReach,
  stepRoomWalker,
  type RoomWalker,
} from "./room-walker.js";

const frameSeconds = 1 / 60;

const walkFor = (
  frames: number,
  intent: { x: number; z: number; wantsJump?: boolean },
  from: RoomWalker = buildStartingRoomWalker(),
): RoomWalker =>
  Array.from({ length: frames }).reduce<RoomWalker>(
    (walker, _frame, index) =>
      stepRoomWalker(
        walker,
        {
          x: intent.x,
          z: intent.z,
          wantsJump: index === 0 && intent.wantsJump === true,
        },
        frameSeconds,
        roomBlockers,
      ),
    from,
  );

describe("walking around the Room", () => {
  it("walks the way the Child steers and faces that way", () => {
    const start = buildStartingRoomWalker();
    const walked = walkFor(30, { x: 1, z: 0 });

    expect(walked.x).toBeGreaterThan(start.x + 0.5);
    expect(walked.heading).toBeCloseTo(Math.PI / 2, 1);
  });

  it("stops at the walls", () => {
    const walked = walkFor(600, { x: 0, z: 1 });

    expect(walked.z).toBeCloseTo(1.9);
    expect(walkFor(600, { x: -1, z: 0 }).x).toBeCloseTo(-2.7);
  });

  it("never walks through the bed", () => {
    const besideBed = { ...buildStartingRoomWalker(), x: -0.6, z: -1.1 };
    const walked = walkFor(240, { x: -1, z: 0 }, besideBed);

    expect(walked.x).toBeGreaterThan(-1.45);
  });

  it("jumps and lands again", () => {
    const start = buildStartingRoomWalker();
    const midJump = walkFor(10, { x: 0, z: 0, wantsJump: true });
    expect(midJump.jumpHeight).toBeGreaterThan(0.2);

    const landed = walkFor(80, { x: 0, z: 0 }, midJump);
    expect(landed.jumpHeight).toBe(0);
    expect(landed.jumpSpeed).toBe(0);
    expect(start.jumpHeight).toBe(0);
  });

  it("finds the nearest thing to play with, which may be the Pet", () => {
    const { spot } = furnitureReaches.toyBox;

    expect(findNearestRoomThing(spot, undefined)).toBe("toyBox");
    expect(findNearestRoomThing(spot, { x: spot.x + 0.3, z: spot.z })).toBe(
      "toyBox",
    );
    expect(findNearestRoomThing({ x: 0.4, z: 1.9 }, { x: 0.8, z: 1.7 })).toBe(
      "pet",
    );
    expect(findNearestRoomThing({ x: 0.4, z: 1.9 }, undefined)).toBeUndefined();
  });

  it("can always knock on the walls, but must walk up to everything else", () => {
    const farAway = { x: 2.5, z: 1.9 };

    expect(isThingInReach("wallpaper", farAway, undefined)).toBe(true);
    expect(isThingInReach("bed", farAway, undefined)).toBe(false);
    expect(isThingInReach("bed", furnitureReaches.bed.spot, undefined)).toBe(
      true,
    );
    expect(isThingInReach("pet", farAway, undefined)).toBe(false);
  });
});

describe("the Room's layout", () => {
  it.each(Object.entries(furnitureReaches))(
    "leaves room to stand at the %s, and the Character can walk there from the start",
    (slot, { spot }) => {
      expect(keepInsideRoom(spot)).toEqual(spot);
      roomBlockers.forEach(({ centre, radius }) => {
        expect(
          Math.hypot(spot.x - centre.x, spot.z - centre.z),
          `${slot} spot is inside a blocker`,
        ).toBeGreaterThan(radius);
      });

      const walked = Array.from({ length: 600 }).reduce<RoomWalker>(
        (walker) =>
          stepRoomWalker(
            walker,
            findIntentTowards(walker, spot, 0.1) ?? {
              x: 0,
              z: 0,
              wantsJump: false,
            },
            frameSeconds,
            roomBlockers,
          ),
        buildStartingRoomWalker(),
      );
      expect(Math.hypot(walked.x - spot.x, walked.z - spot.z)).toBeLessThan(
        0.3,
      );
    },
  );

  it("lets the Child play with things on the walls without walking over", () => {
    expect(canPlayFromAfar("window")).toBe(true);
    expect(canPlayFromAfar("clock")).toBe(true);
    expect(canPlayFromAfar("bed")).toBe(false);
    expect(canPlayFromAfar("pet")).toBe(false);
  });
});

describe("findClockHandTurns", () => {
  it("turns the hands to the time", () => {
    expect(findClockHandTurns(new Date(2026, 0, 1, 3, 0))).toEqual({
      hour: 0.25,
      minute: 0,
    });
    expect(findClockHandTurns(new Date(2026, 0, 1, 18, 30))).toEqual({
      hour: 0.5 + 0.5 / 12,
      minute: 0.5,
    });
  });
});
