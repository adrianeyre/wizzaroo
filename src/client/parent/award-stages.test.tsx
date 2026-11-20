import ReactThreeTestRenderer, {
  type ReactThreeTest,
} from "@react-three/test-renderer";
import { ExtrudeGeometry, Group, Mesh } from "three";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildStarGeometry,
  celebrationSeconds,
  placedStars,
  StarsCluster,
  starTurnSeconds,
} from "./award-stages.js";

const isGroup = (value: unknown): value is Group => value instanceof Group;

const findStar = (renderer: ReactThreeTest.Renderer, name: string): Group => {
  const star: unknown = renderer.scene.find(
    ({ instance }) => instance.name === name,
  ).instance;
  if (!isGroup(star)) {
    throw new Error(`the cluster has no ${name}`);
  }
  return star;
};

const renderStars = (celebrationCount: number) =>
  ReactThreeTestRenderer.create(
    <StarsCluster celebrationCount={celebrationCount} />,
  );

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

describe("buildStarGeometry", () => {
  it("builds a solid five-pointed Star, centred on its own middle", () => {
    const geometry = buildStarGeometry();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;

    expect(geometry).toBeInstanceOf(ExtrudeGeometry);
    expect(box?.max.x).toBeCloseTo(-(box?.min.x ?? 0), 5);
    expect(box?.max.z).toBeCloseTo(-(box?.min.z ?? 0), 5);
    expect((box?.max.y ?? 0) - (box?.min.y ?? 0)).toBeGreaterThan(1.5);
    geometry.dispose();
  });
});

describe("StarsCluster", () => {
  it("draws three gold Stars, the middle one the biggest", async () => {
    const renderer = await renderStars(0);

    expect(
      renderer.scene.findAllByType("Mesh").map(({ instance }) => instance),
    ).toHaveLength(3);
    expect(
      placedStars.map(({ name }) => findStar(renderer, name).scale.x),
    ).toEqual([1, 0.62, 0.7]);
    expect(
      renderer.scene
        .findAllByType("Mesh")
        .every(({ instance }) => instance instanceof Mesh),
    ).toBe(true);
    await renderer.unmount();
  });

  it("turns each Star slowly round", async () => {
    const renderer = await renderStars(0);
    const middle = findStar(renderer, "star-middle");
    const before = middle.rotation.y;

    await renderer.advanceFrames(30, 1 / 30);

    const turned = middle.rotation.y - before;
    expect(turned).toBeCloseTo((Math.PI * 2) / starTurnSeconds, 3);
    await renderer.unmount();
  });

  it("spins the Stars once more, and swells them, when Stars are given", async () => {
    const steady = await renderStars(0);
    const celebrating = await renderStars(0);
    await celebrating.update(<StarsCluster celebrationCount={1} />);
    const halfway = Math.round((celebrationSeconds * 30) / 2);

    await steady.advanceFrames(halfway, 1 / 30);
    await celebrating.advanceFrames(halfway, 1 / 30);

    const extraTurn =
      findStar(celebrating, "star-middle").rotation.y -
      findStar(steady, "star-middle").rotation.y;
    expect(extraTurn).toBeGreaterThan(Math.PI);
    expect(extraTurn).toBeLessThan(Math.PI * 2);
    expect(findStar(celebrating, "star-middle").scale.x).toBeGreaterThan(1);

    await steady.advanceFrames(halfway * 2, 1 / 30);
    await celebrating.advanceFrames(halfway * 2, 1 / 30);

    expect(findStar(celebrating, "star-middle").rotation.y).toBeCloseTo(
      findStar(steady, "star-middle").rotation.y,
      5,
    );
    expect(findStar(celebrating, "star-middle").scale.x).toBeCloseTo(1, 5);
    await steady.unmount();
    await celebrating.unmount();
  });

  it("keeps the Stars still when reduced motion is asked for", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    const renderer = await renderStars(0);
    const middle = findStar(renderer, "star-middle");
    const before = { turn: middle.rotation.y, height: middle.position.y };

    await renderer.update(<StarsCluster celebrationCount={1} />);
    await renderer.advanceFrames(60, 1 / 30);

    expect({ turn: middle.rotation.y, height: middle.position.y }).toEqual(
      before,
    );
    await renderer.unmount();
  });
});
