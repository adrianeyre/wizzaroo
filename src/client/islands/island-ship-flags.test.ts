import { describe, expect, it } from "vitest";
import { shipFlagHoists } from "./island-ship-design.js";
import { buildFlagCloth, waveFlagCloth } from "./island-ship-models.js";

const readCloth = () => {
  const cloth = buildFlagCloth(shipFlagHoists);
  const positions = cloth.geometry.getAttribute("position");
  const normals = cloth.geometry.getAttribute("normal");
  const uvs = cloth.geometry.getAttribute("uv");
  return { cloth, positions, normals, uvs };
};

describe("the ship's Wizzaroo flags", () => {
  it("flies a flag at the masthead and another at the stern, each with a front and a back", () => {
    const { positions, normals } = readCloth();
    const perSide = positions.count / (shipFlagHoists.length * 2);
    shipFlagHoists.forEach((_hoist, flag) => {
      const front = flag * 2 * perSide;
      const back = front + perSide;
      expect(normals.getX(front)).toBeGreaterThan(0.9);
      expect(normals.getX(back)).toBeLessThan(-0.9);
    });
  });

  it("reads the right way round from both sides of the ship", () => {
    const { positions, uvs } = readCloth();
    const perSide = positions.count / (shipFlagHoists.length * 2);
    const findHoistU = (first: number) => {
      const atHoist = Array.from(
        { length: perSide },
        (_, offset) => first + offset,
      ).filter((vertex) => positions.getZ(vertex) === positions.getZ(first));
      return uvs.getX(atHoist[0]);
    };
    expect(findHoistU(0)).toBe(0);
    expect(findHoistU(perSide)).toBe(1);
  });

  it("waves the loose end and keeps the edge on the pole still", () => {
    const { cloth, positions } = readCloth();
    const before = Array.from({ length: positions.count }, (_, vertex) =>
      positions.getX(vertex),
    );
    waveFlagCloth(cloth, 1.3);
    const hoistZ = positions.getZ(0);
    const moved = Array.from({ length: positions.count }, (_, vertex) => ({
      isAtHoist: positions.getZ(vertex) === hoistZ,
      shift: Math.abs(positions.getX(vertex) - before[vertex]),
    }));
    moved
      .filter(({ isAtHoist }) => isAtHoist)
      .forEach(({ shift }) => {
        expect(shift).toBeLessThan(1e-6);
      });
    expect(Math.max(...moved.map(({ shift }) => shift))).toBeGreaterThan(0.05);
  });
});
