import type { BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  buildAeroplaneDoorGeometry,
  buildAeroplaneGeometry,
  buildAirstairGeometry,
  placeAeroplaneDoor,
  placeAirstair,
} from "./island-aeroplane-design.js";
import {
  balloonDoorway,
  buildBalloonDoorGeometry,
  buildBalloonGeometry,
  buildBalloonLiveryGeometry,
  buildBurnerFlameGeometry,
  buildEnvelopeGeometry,
  burnerHeight,
  envelopeEquatorHeight,
  envelopeMouthHeight,
  envelopeRadius,
  placeBalloonDoor,
  placeBurnerFlame,
} from "./island-balloon-design.js";
import {
  aeroplaneDoor,
  aeroplaneStairRun,
  balloonDoor,
  helicopterDoor,
  helicopterRotorRadius,
} from "./island-flight.js";
import {
  buildHelicopterDoorGeometry,
  buildHelicopterGeometry,
  buildMainRotorGeometry,
  placeHelicopterDoor,
  placeMainRotor,
} from "./island-helicopter-design.js";

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

const findLowest = (geometry: BufferGeometry): number =>
  Math.min(...listCorners(geometry).map(({ y }) => y));

describe("the aeroplane", () => {
  const body = buildAeroplaneGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(9000);
    expect(countTriangles(body)).toBeLessThan(15_000);
  });

  it("stands on its wheels on the runway", () => {
    expect(findLowest(body)).toBeGreaterThanOrEqual(0);
    expect(findLowest(body)).toBeLessThan(0.05);
  });

  it("leaves the way up the stairs to the doorway clear for the Character", () => {
    const stairSlope = aeroplaneDoor.y / aeroplaneStairRun;
    const inTheWay = listCorners(body).filter(({ x, y, z }) => {
      const out = x - aeroplaneDoor.x;
      const step = aeroplaneDoor.y - out * stairSlope;
      return (
        out > 0.05 &&
        out < aeroplaneStairRun + 0.6 &&
        y > Math.max(0, step) + 0.1 &&
        y < Math.max(0, step) + 1.3 &&
        Math.abs(z - aeroplaneDoor.z) < 0.4
      );
    });
    expect(inTheWay).toStrictEqual([]);
  });

  it("swings its door out of the way and folds its stairs down to the ground", () => {
    const closedDoor = buildAeroplaneDoorGeometry();
    const openDoor = buildAeroplaneDoorGeometry().applyMatrix4(
      placeAeroplaneDoor(1),
    );
    const isOverDoorway = ({ x, z }: { x: number; z: number }) =>
      x > aeroplaneDoor.x - 0.4 && Math.abs(z - aeroplaneDoor.z) < 0.3;
    expect(listCorners(closedDoor).some(isOverDoorway)).toBe(true);
    expect(listCorners(openDoor).filter(isOverDoorway)).toStrictEqual([]);

    const stairs = buildAirstairGeometry().applyMatrix4(placeAirstair(1));
    expect(findLowest(stairs)).toBeLessThan(0.05);
    expect(findLowest(stairs)).toBeGreaterThan(-0.15);
    const foot = Math.max(...listCorners(stairs).map(({ x }) => x));
    expect(foot).toBeCloseTo(aeroplaneDoor.x + aeroplaneStairRun, 0);

    const stowed = buildAirstairGeometry().applyMatrix4(placeAirstair(0));
    expect(
      listCorners(stowed).every(({ x, y, z }) => x === 0 && y === 0 && z === 0),
    ).toBe(true);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the helicopter", () => {
  const body = buildHelicopterGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(4000);
    expect(countTriangles(body)).toBeLessThan(10_000);
  });

  it("stands on its skids on the Helipad", () => {
    expect(findLowest(body)).toBeGreaterThan(-0.05);
    expect(findLowest(body)).toBeLessThan(0.05);
  });

  it("turns its rotor high above the Character's head, reaching out to its rotor radius", () => {
    const rotor = buildMainRotorGeometry().applyMatrix4(placeMainRotor(0.7));
    expect(findLowest(rotor)).toBeGreaterThan(2.6);
    const reach = Math.max(
      ...listCorners(rotor).map(({ x, z }) => Math.hypot(x, z - 0.15)),
    );
    expect(reach).toBeCloseTo(helicopterRotorRadius, 1);
  });

  it("slides its door back to open the cabin", () => {
    const isOverDoorway = ({ x, z }: { x: number; z: number }) =>
      x > helicopterDoor.x - 0.3 && Math.abs(z - helicopterDoor.z) < 0.4;
    const closed = buildHelicopterDoorGeometry();
    const open = buildHelicopterDoorGeometry().applyMatrix4(
      placeHelicopterDoor(1),
    );
    expect(listCorners(closed).some(isOverDoorway)).toBe(true);
    expect(listCorners(open).filter(isOverDoorway)).toStrictEqual([]);
  });

  it("leaves the way up to the doorway clear for the Character", () => {
    const inTheWay = listCorners(body).filter(
      ({ x, y, z }) =>
        x > helicopterDoor.x + 0.05 &&
        x < helicopterDoor.x + 1 &&
        y > helicopterDoor.y + 0.05 &&
        y < helicopterDoor.y + 1.2 &&
        Math.abs(z - helicopterDoor.z) < 0.5,
    );
    expect(inTheWay).toStrictEqual([]);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
  });
});

describe("the hot-air balloon", () => {
  const body = buildBalloonGeometry();

  it("is detailed but stays within its share of the scene's triangles", () => {
    expect(countTriangles(body)).toBeGreaterThan(9000);
    expect(countTriangles(body)).toBeLessThan(18_000);
  });

  it("stands its basket on the Balloon Field", () => {
    expect(findLowest(body)).toBeGreaterThan(-0.05);
    expect(findLowest(body)).toBeLessThan(0.05);
  });

  it("lifts its envelope high above the basket, the burners and the Character's head", () => {
    const envelope = listCorners(buildEnvelopeGeometry());
    expect(Math.min(...envelope.map(({ y }) => y))).toBeCloseTo(
      envelopeMouthHeight,
      1,
    );
    expect(Math.max(...envelope.map(({ y }) => y))).toBeGreaterThan(14);
    const widest = Math.max(...envelope.map(({ x, z }) => Math.hypot(x, z)));
    expect(widest).toBeCloseTo(envelopeRadius, 1);
    expect(envelopeMouthHeight).toBeGreaterThan(burnerHeight + 1);
  });

  it("prints the Wizzaroo crest and name on every side of its envelope", () => {
    const decals = listCorners(buildBalloonLiveryGeometry());
    const sides = [
      ({ z }: { z: number }) => z > envelopeRadius * 0.7,
      ({ z }: { z: number }) => z < -envelopeRadius * 0.7,
      ({ x }: { x: number }) => x > envelopeRadius * 0.7,
      ({ x }: { x: number }) => x < -envelopeRadius * 0.7,
    ];
    sides.forEach((isOnSide) => {
      expect(decals.some(isOnSide)).toBe(true);
    });
    decals.forEach(({ x, y, z }) => {
      expect(Math.abs(y - envelopeEquatorHeight)).toBeLessThan(1.5);
      expect(Math.hypot(x, z)).toBeGreaterThan(envelopeRadius * 0.75);
      expect(Math.hypot(x, z)).toBeLessThan(envelopeRadius + 0.05);
    });
  });

  it("swings its basket door outward to open the doorway", () => {
    const isInDoorway = ({ x, z }: { x: number; z: number }) =>
      Math.abs(x - balloonDoorway.x) < 0.15 &&
      Math.abs(z) < balloonDoorway.halfWidth - 0.05;
    const closed = buildBalloonDoorGeometry();
    const open = buildBalloonDoorGeometry().applyMatrix4(placeBalloonDoor(1));
    expect(listCorners(closed).some(isInDoorway)).toBe(true);
    expect(listCorners(open).filter(isInDoorway)).toStrictEqual([]);
  });

  it("leaves the way through the doorway into the basket clear for the Character", () => {
    const inTheWay = listCorners(body).filter(
      ({ x, y, z }) =>
        x > balloonDoor.x - 0.2 &&
        x < balloonDoor.x + 0.2 &&
        y > balloonDoor.y + 0.05 &&
        y < balloonDoorway.top - 0.05 &&
        Math.abs(z - balloonDoor.z) < balloonDoorway.halfWidth - 0.05,
    );
    expect(inTheWay).toStrictEqual([]);
  });

  it("lights its burner flame only while the burners blast", () => {
    const flame = buildBurnerFlameGeometry();
    const findTop = (burn: number) =>
      Math.max(
        ...listCorners(
          flame.clone().applyMatrix4(placeBurnerFlame(burn, 0)),
        ).map(({ y }) => y),
      );
    expect(findTop(1)).toBeGreaterThan(burnerHeight + 1.2);
    expect(findTop(0)).toBeLessThan(burnerHeight + 0.4);
  });

  it("paints every face", () => {
    expect(isEveryFacePainted(body)).toBe(true);
    expect(isEveryFacePainted(buildBalloonDoorGeometry())).toBe(true);
  });
});
