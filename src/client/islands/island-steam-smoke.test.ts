import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  findPuffLook,
  smokePuffCount,
  SteamSmokeTrail,
} from "./island-steam-smoke.js";

const run = (trail: SteamSmokeTrail, seconds: number, speed: number) => {
  const chimney = new Vector3(0, 2.2, 0);
  for (let step = 0; step < seconds * 60; step++) {
    chimney.z += speed / 60;
    trail.advance(1 / 60, chimney, speed);
  }
  return chimney;
};

const listLivePuffs = (trail: SteamSmokeTrail) =>
  trail.puffs.filter((puff) => findPuffLook(puff).radius > 0);

describe("a steam engine's smoke", () => {
  it("puffs from the chimney even while the train waits at a Station", () => {
    const trail = new SteamSmokeTrail();
    run(trail, 3, 0);
    const puffs = listLivePuffs(trail);
    expect(puffs.length).toBeGreaterThanOrEqual(3);
    for (const puff of puffs) {
      expect(puff.y).toBeGreaterThan(2.2);
      expect(Math.hypot(puff.x, puff.z)).toBeLessThan(1);
    }
  });

  it("chuffs faster when the train is moving, leaving a trail behind it", () => {
    const waiting = new SteamSmokeTrail();
    const moving = new SteamSmokeTrail();
    run(waiting, 2, 0);
    const chimney = run(moving, 2, 6);
    expect(listLivePuffs(moving).length).toBeGreaterThan(
      listLivePuffs(waiting).length * 1.5,
    );
    expect(listLivePuffs(moving).length).toBeLessThanOrEqual(smokePuffCount);
    const behind = listLivePuffs(moving).filter(
      (puff) => puff.z < chimney.z - 3,
    );
    expect(behind.length).toBeGreaterThan(0);
  });

  it("swells and fades each puff away as it rises", () => {
    const trail = new SteamSmokeTrail();
    run(trail, 0.1, 0);
    const [puff] = listLivePuffs(trail);
    const young = findPuffLook({ ...puff, age: puff.life * 0.2 });
    const old = findPuffLook({ ...puff, age: puff.life * 0.9 });
    expect(old.radius).toBeGreaterThan(young.radius);
    expect(old.opacity).toBeLessThan(young.opacity);
    expect(findPuffLook({ ...puff, age: puff.life }).radius).toBe(0);
  });

  it("doesn't puff while the chimney is inside a tunnel", () => {
    const trail = new SteamSmokeTrail();
    for (let step = 0; step < 120; step++) {
      trail.advance(1 / 60, new Vector3(0, 2.2, step / 10), 6, false);
    }
    expect(listLivePuffs(trail)).toHaveLength(0);
  });
});
