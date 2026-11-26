// @vitest-environment happy-dom
// The scuba dive: the Wizzaroo dive locker on the pier, and the swim under
// the water between Islands.
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { createElement } from "react";
import {
  Box3,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
  type BufferGeometry,
} from "three";
import { describe, expect, it } from "vitest";
import { buildCharacterLook } from "../character/character-look.js";
import {
  buildScubaLockerGeometry,
  buildScubaLockerLiveryGeometry,
  buildScubaLockerMovingPartsGeometry,
  placeScubaLockerMovingParts,
  scubaLockerGrowthCentre,
} from "./island-scuba-design.js";
import {
  findCrossingCameraSpot,
  findDiverPlacement,
  findSeabedHeight,
  findUnderwaterCrossingLength,
  underwaterSurfaceY,
  UnderwaterCrossingScene,
} from "./island-underwater-crossing.js";

const findBounds = (geometry: BufferGeometry, matrix?: Matrix4): Box3 => {
  const placed = geometry.clone();
  if (matrix !== undefined) {
    placed.applyMatrix4(matrix);
  }
  placed.computeBoundingBox();
  return placed.boundingBox ?? new Box3();
};

describe("the dive locker", () => {
  it("stands on the pier deck about as big as a cabinet the Character can reach into", () => {
    const body = buildScubaLockerGeometry();
    const bounds = findBounds(body);

    expect(bounds.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(bounds.max.x - bounds.min.x).toBeGreaterThan(0.85);
    expect(bounds.max.x - bounds.min.x).toBeLessThan(1.3);
    expect(bounds.max.z - bounds.min.z).toBeGreaterThan(0.5);
    expect(bounds.max.z - bounds.min.z).toBeLessThan(0.8);
    expect(bounds.max.y).toBeGreaterThan(1.2);
    expect(bounds.max.y).toBeLessThan(1.8);
    expect(scubaLockerGrowthCentre).toEqual([0, 0, 0]);
  });

  it("is painted, lit and ready to merge, with the Wizzaroo crest and name on it", () => {
    const body = buildScubaLockerGeometry();
    const livery = buildScubaLockerLiveryGeometry();
    const parts = buildScubaLockerMovingPartsGeometry();

    [body, ...parts].forEach((geometry) => {
      expect(Object.keys(geometry.attributes).sort()).toEqual([
        "color",
        "normal",
        "position",
      ]);
    });
    expect(livery.getAttribute("position").count).toBeGreaterThan(0);
    expect(findBounds(livery).max.z).toBeGreaterThan(0.27);
  });

  it("swings its two doors open from their outer edges to the front", () => {
    const [leftDoor, rightDoor] = buildScubaLockerMovingPartsGeometry();
    const [closedLeft, closedRight] = placeScubaLockerMovingParts(0, 1, 1);
    const [openLeft, openRight] = placeScubaLockerMovingParts(1, 1, 1);

    const left = findBounds(leftDoor, closedLeft);
    const right = findBounds(rightDoor, closedRight);
    expect(left.max.x).toBeLessThanOrEqual(0.01);
    expect(right.min.x).toBeGreaterThanOrEqual(-0.01);
    expect(findBounds(leftDoor, openLeft).max.z).toBeGreaterThan(
      left.max.z + 0.25,
    );
    expect(findBounds(rightDoor, openRight).max.z).toBeGreaterThan(
      right.max.z + 0.25,
    );
    expect(findBounds(leftDoor, openLeft).min.x).toBeLessThan(-0.38);
  });

  it("shows the spare scuba set on the rack until it is taken", () => {
    const [, , gear] = buildScubaLockerMovingPartsGeometry();
    const shown = findBounds(gear, placeScubaLockerMovingParts(1, 1, 1)[2]);
    const taken = findBounds(gear, placeScubaLockerMovingParts(1, 0, 1)[2]);

    expect(shown.getSize(new Vector3()).y).toBeGreaterThan(0.4);
    expect(taken.getSize(new Vector3()).length()).toBeLessThan(0.01);
  });

  it("grows its doors and gear with the cabinet, from the deck", () => {
    const [, , gear] = buildScubaLockerMovingPartsGeometry();
    const tiny = placeScubaLockerMovingParts(1, 1, 0);
    tiny.forEach((matrix) => {
      expect(matrix.getMaxScaleOnAxis()).toBeLessThan(0.01);
    });
    const half = findBounds(gear, placeScubaLockerMovingParts(0, 1, 0.5)[2]);
    const full = findBounds(gear, placeScubaLockerMovingParts(0, 1, 1)[2]);
    expect(half.max.y).toBeCloseTo(full.max.y / 2, 5);
  });
});

describe("the swim under the water", () => {
  const crossings = [5, 8, 12];
  const shares = Array.from({ length: 101 }, (_, step) => step / 100);

  it.each(crossings)(
    "keeps the diver 1.5 to 3 below the surface and clear of the sea bed in %s seconds",
    (seconds) => {
      const length = findUnderwaterCrossingLength(seconds);
      shares.forEach((share) => {
        const diver = findDiverPlacement(share, length);
        expect(diver.y).toBeLessThanOrEqual(underwaterSurfaceY - 1.5 + 1e-6);
        expect(diver.y).toBeGreaterThanOrEqual(underwaterSurfaceY - 3);
        expect(diver.y).toBeGreaterThan(
          findSeabedHeight(diver.x, diver.z, length) + 0.9,
        );
      });
    },
  );

  it.each(crossings)(
    "swims from one pier to the next in %s seconds, always forwards",
    (seconds) => {
      const length = findUnderwaterCrossingLength(seconds);
      const spots = shares.map((share) => findDiverPlacement(share, length));
      expect(spots[0].x).toBeCloseTo(0, 5);
      expect(spots[100].x).toBeCloseTo(length, 5);
      spots.slice(1).forEach((spot, index) => {
        expect(spot.x).toBeGreaterThan(spots[index].x);
        expect(Math.abs(Math.sin(spot.heading))).toBeGreaterThan(0.85);
      });
    },
  );

  it.each([false, true])(
    "keeps the camera under the surface and above the sea bed, near the diver (calm: %s)",
    (isReduced) => {
      crossings.forEach((seconds) => {
        const length = findUnderwaterCrossingLength(seconds);
        shares.forEach((share) => {
          const {
            position: [x, y, z],
            target,
          } = findCrossingCameraSpot(share, length, isReduced);
          const diver = findDiverPlacement(share, length);
          expect(y).toBeLessThan(underwaterSurfaceY - 0.4);
          expect(y).toBeGreaterThan(findSeabedHeight(x, z, length) + 0.5);
          const distance = Math.hypot(x - diver.x, y - diver.y, z - diver.z);
          expect(distance).toBeGreaterThan(2.5);
          expect(distance).toBeLessThan(4.2);
          expect(
            Math.hypot(target[0] - diver.x, target[2] - diver.z),
          ).toBeLessThan(1);
        });
      });
    },
  );
});

const isMesh = (value: unknown): value is Mesh => value instanceof Mesh;

const listDrawn = (root: Object3D): Mesh[] => {
  const drawn: Mesh[] = [];
  root.traverseVisible((object) => {
    if (isMesh(object)) {
      drawn.push(object);
    }
  });
  return drawn;
};

const countTriangles = (mesh: Mesh): number => {
  const { geometry } = mesh;
  const corners =
    geometry.index?.count ?? geometry.getAttribute("position").count;
  return (corners / 3) * (mesh instanceof InstancedMesh ? mesh.count : 1);
};

describe("UnderwaterCrossingScene", () => {
  it("draws the diver swimming under the water to the next pier within a tablet's budget", async () => {
    const seconds = 12;
    const renderer = await ReactThreeTestRenderer.create(
      createElement(UnderwaterCrossingScene, {
        look: buildCharacterLook({}),
        seconds,
        isEffectsOn: true,
      }),
    );
    await renderer.advanceFrames(2, 1 / 60);

    const scene = renderer.scene.instance;
    expect(scene).toBeInstanceOf(Object3D);
    if (!(scene instanceof Object3D)) {
      return;
    }
    const diver = scene.getObjectByName("underwater-diver");
    expect(diver).toBeDefined();
    expect(diver?.getObjectByName("character")).toBeDefined();
    const ownMeshes = listDrawn(scene).filter(
      (mesh) => diver?.getObjectById(mesh.id) === undefined,
    );
    expect(ownMeshes.length).toBeLessThanOrEqual(30);
    expect(
      ownMeshes.reduce((total, mesh) => total + countTriangles(mesh), 0),
    ).toBeLessThanOrEqual(510_000);
    expect(diver?.position.y).toBeLessThan(-1.4);
    const listNamed = (name: string) => {
      const found: Object3D[] = [];
      scene.traverse((thing) => {
        if (thing.name === name) {
          found.push(thing);
        }
      });
      return found;
    };
    expect(listNamed("underwater-shark")).toHaveLength(1);
    expect(listNamed("underwater-sea-lion")).toHaveLength(1);
    expect(listNamed("underwater-dolphin")).toHaveLength(2);

    // A third of the way across, the two dolphins race by side by side and
    // the sea lion is circling the diver.
    await renderer.advanceFrames(seconds * 3, 0.1);
    const [first, second] = listNamed("underwater-dolphin");
    const [seaLion] = listNamed("underwater-sea-lion");
    const [shark] = listNamed("underwater-shark");
    expect(first.scale.x).toBe(1);
    expect(second.scale.x).toBe(1);
    expect(Math.abs(first.position.z - second.position.z)).toBeGreaterThan(0.6);
    expect(seaLion.scale.x).toBe(1);
    expect(shark.scale.x).toBeLessThan(0.001);
    expect(
      Math.hypot(
        seaLion.position.x - (diver?.position.x ?? 0),
        seaLion.position.z - (diver?.position.z ?? 0),
      ),
    ).toBeLessThan(18);

    // Later on, the shark cruises by further out than the diver swims.
    await renderer.advanceFrames(seconds * 4, 0.1);
    expect(shark.scale.x).toBeGreaterThan(0.5);
    expect(shark.position.z - (diver?.position.z ?? 0)).toBeGreaterThan(4);

    await renderer.advanceFrames(seconds * 3 + 5, 0.1);
    const length = findUnderwaterCrossingLength(seconds);
    expect(diver?.position.x).toBeCloseTo(length, 0);
    await renderer.unmount();
  });
});
