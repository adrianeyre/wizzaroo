// The shark, the sea lion and the dolphins met on the scuba crossing.
import { Box3, type BufferGeometry } from "three";
import { describe, expect, it } from "vitest";
import {
  buildDolphinGeometry,
  buildSeaLionBodyGeometry,
  buildSeaLionFlipperGeometry,
  buildSharkGeometry,
  dolphinNoseZ,
  findDolphinSection,
  findSeaLionSection,
  findSeaLionShoulder,
  findSharkSection,
  seaLionNoseZ,
  sharkNoseZ,
} from "./island-sea-life-design.js";

// The diving Character is about this long, nose to fins, in the crossing.
const diverLength = 0.7;

const findBounds = (geometry: BufferGeometry): Box3 => {
  geometry.computeBoundingBox();
  return geometry.boundingBox ?? new Box3();
};

const animals = [
  ["shark", buildSharkGeometry, sharkNoseZ, 2.6, 3.8],
  ["dolphin", buildDolphinGeometry, dolphinNoseZ, 2.2, 3],
  ["sea lion", buildSeaLionBodyGeometry, seaLionNoseZ, 1.4, 2.1],
] as const;

describe.each(animals)(
  "the %s",
  (_name, build, noseZ, fewestDivers, mostDivers) => {
    const geometry = build();
    const bounds = findBounds(geometry);

    it("is built in fine detail, smooth-shaded and painted, ready to merge", () => {
      const positions = geometry.getAttribute("position");
      expect(positions.count / 3).toBeGreaterThan(12_000);
      expect(geometry.index).toBeNull();
      expect(geometry.getAttribute("normal").count).toBe(positions.count);
      expect(geometry.getAttribute("color").count).toBe(positions.count);
      expect(geometry.getAttribute("uv")).toBeUndefined();
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    });

    it("faces +z with its back up, and is a few times the diver's length", () => {
      expect(bounds.max.z).toBeCloseTo(noseZ, 1);
      expect(bounds.max.x).toBeCloseTo(-bounds.min.x, 3);
      const length = bounds.max.z - bounds.min.z;
      expect(length / diverLength).toBeGreaterThan(fewestDivers);
      expect(length / diverLength).toBeLessThan(mostDivers);
      expect(bounds.max.y).toBeGreaterThan(-bounds.min.y);
    });
  },
);

describe("the animals' bodies", () => {
  const sections = [
    ["shark", findSharkSection],
    ["dolphin", findDolphinSection],
    ["sea lion", findSeaLionSection],
  ] as const;

  it.each(sections)(
    "taper the %s smoothly to a point at both ends, with no seams or gaps",
    (_name, findSection) => {
      const shares = Array.from({ length: 401 }, (_, step) => step / 400);
      const girths = shares.map((share) => {
        const { top, bottom, halfWidth } = findSection(share);
        [top, bottom, halfWidth].forEach((size) => {
          expect(Number.isFinite(size)).toBe(true);
          expect(size).toBeGreaterThan(0);
        });
        return top + bottom;
      });
      const thickest = Math.max(...girths);
      expect(girths[0]).toBeLessThan(thickest * 0.12);
      expect(girths.at(-1)).toBeLessThan(thickest * 0.2);
      // Rounded tips are steep at the very ends; between them, no step.
      girths.slice(13, -12).forEach((girth, index) => {
        expect(Math.abs(girth - girths[index + 12])).toBeLessThan(
          thickest * 0.03,
        );
      });
    },
  );
});

describe("the sea lion's front flippers", () => {
  it("join its body at the shoulders and reach well out to the sides", () => {
    const flipper = findBounds(buildSeaLionFlipperGeometry());
    expect(flipper.max.x).toBeGreaterThan(0.3);
    expect(flipper.min.x).toBeLessThan(0);
    const [x, y, z] = findSeaLionShoulder(1);
    const shoulder = findSeaLionSection(0.33);
    expect(x).toBeLessThan(shoulder.halfWidth);
    expect(x).toBeGreaterThan(shoulder.halfWidth * 0.5);
    expect(y).toBeLessThan(shoulder.centreY);
    expect(z).toBeCloseTo(shoulder.z);
    expect(findSeaLionShoulder(-1)[0]).toBeCloseTo(-x);
  });
});
