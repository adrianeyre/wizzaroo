import { describe, expect, it } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  areNeighbours,
  buildNumberTrail,
  describeTrailRule,
  findLongestBlankRun,
  formatTrailNumber,
  numberTrailPlans,
  parseTrailNumber,
  shortTrailLength,
  type NumberTrail,
} from "./number-trail.js";

const hundredths = 100;
const years: YearGroup[] = [1, 2, 3, 4, 5, 6];
const seeds = Array.from({ length: 300 }, (_, seed) => seed + 1);

const buildMany = (yearGroup: YearGroup): NumberTrail[] =>
  seeds.map((seed) => buildNumberTrail(yearGroup, buildRandom(seed * 31)));

const stepSizes = (trails: NumberTrail[]) =>
  new Set(trails.map(({ sequence }) => Math.abs(sequence.step)));

describe("buildNumberTrail", () => {
  it.each(years)(
    "lays a Year %i trail of touching squares through the grid, every play",
    (yearGroup) => {
      const plan = numberTrailPlans[yearGroup];
      for (const trail of buildMany(yearGroup)) {
        const length = trail.path.length;
        expect(length).toBe(shortTrailLength(yearGroup, trail.sequence.step));
        expect(length).toBeLessThanOrEqual(plan.length);
        const keys = new Set(
          trail.path.map(({ row, column }) => row * plan.columns + column),
        );
        expect(keys.size).toBe(length);
        for (const { row, column } of trail.path) {
          expect(row).toBeGreaterThanOrEqual(0);
          expect(row).toBeLessThan(plan.rows);
          expect(column).toBeGreaterThanOrEqual(0);
          expect(column).toBeLessThan(plan.columns);
        }
        for (let index = 1; index < length; index++) {
          expect(areNeighbours(trail.path[index - 1], trail.path[index])).toBe(
            true,
          );
        }
      }
    },
  );

  it.each(years)(
    "gives the start, the next square and the ring in Year %i, so the step can always be worked out",
    (yearGroup) => {
      const plan = numberTrailPlans[yearGroup];
      for (const trail of buildMany(yearGroup)) {
        const length = trail.path.length;
        const blankCount = plan.blankCount - (plan.length - length);
        expect(blankCount).toBeGreaterThanOrEqual(5);
        expect(trail.blanks).toHaveLength(blankCount);
        expect(new Set(trail.blanks).size).toBe(blankCount);
        expect(trail.blanks).not.toContain(0);
        expect(trail.blanks).not.toContain(1);
        expect(trail.blanks).not.toContain(length - 1);
        expect(findLongestBlankRun(trail.blanks, length)).toBeLessThanOrEqual(
          plan.maxBlankRun,
        );
        expect(trail.values[1] - trail.values[0]).toBe(trail.sequence.step);
        trail.values.forEach((value, index) => {
          expect(value).toBe(
            trail.sequence.start + trail.sequence.step * index,
          );
          expect(Number.isInteger(value)).toBe(true);
          expect(parseTrailNumber(formatTrailNumber(value))).toBe(value);
        });
      }
    },
  );

  it("counts in 2s, 5s and 10s from zero or a multiple in Year 1, up to 110", () => {
    const trails = buildMany(1);
    expect(stepSizes(trails)).toEqual(new Set([200, 500, 1000]));
    for (const { values, sequence } of trails) {
      expect(sequence.step).toBeGreaterThan(0);
      for (const value of values) {
        expect(value % sequence.step).toBe(0);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(10_000);
      }
    }
  });

  it("counts in 3s from zero, and in tens from any number both ways in Year 2", () => {
    const trails = buildMany(2);
    expect(stepSizes(trails)).toEqual(new Set([300, 1000]));
    expect(trails.some(({ sequence }) => sequence.step === -1000)).toBe(true);
    for (const { values, sequence } of trails) {
      if (Math.abs(sequence.step) === 1000) {
        expect(sequence.start % 1000).not.toBe(0);
      } else {
        expect(values.every((value) => value % 300 === 0)).toBe(true);
      }
      expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...values)).toBeLessThanOrEqual(10_000);
    }
  });

  it.each<YearGroup>([1, 2])(
    "keeps every Year %i trail within 0 to 100",
    (yearGroup) => {
      for (const { values } of buildMany(yearGroup)) {
        expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...values)).toBeLessThanOrEqual(100 * hundredths);
      }
    },
  );

  it("counts in multiples of 4, 8 and 50 in Year 3", () => {
    const trails = buildMany(3);
    expect(stepSizes(trails)).toEqual(new Set([400, 800, 5000]));
    for (const { values, sequence } of trails) {
      expect(
        values.every(
          (value) => value >= 0 && value % Math.abs(sequence.step) === 0,
        ),
      ).toBe(true);
    }
  });

  it("counts in 6s, 7s and 25s, and sometimes back through zero, in Year 4", () => {
    const trails = buildMany(4);
    expect(stepSizes(trails)).toEqual(new Set([600, 700, 2500]));
    const backwards = trails.filter(({ sequence }) => sequence.step < 0);
    expect(backwards.length).toBeGreaterThan(0);
    for (const { values } of backwards) {
      expect(values).toContain(0);
      expect(Math.min(...values)).toBeLessThan(0);
    }
    expect(
      describeTrailRule(backwards[0].sequence, numberTrailPlans[4].length),
    ).toMatch(/^You counted back in \d+s, back through zero!$/);
  });

  it("counts in tenths and in powers of 10 below a million in Year 5", () => {
    const trails = buildMany(5);
    expect(stepSizes(trails)).toEqual(
      new Set([10, 1000, 10_000, 100_000, 1_000_000]),
    );
    for (const { values } of trails) {
      expect(Math.min(...values)).toBeGreaterThan(0);
      expect(Math.max(...values)).toBeLessThan(100_000_000);
    }
    const tenths = trails.find(({ sequence }) => sequence.step === 10);
    expect(
      tenths && describeTrailRule(tenths.sequence, numberTrailPlans[5].length),
    ).toBe("You counted on in tenths!");
  });

  it("continues linear sequences with decimal steps and into negatives in Year 6", () => {
    const trails = buildMany(6);
    expect(trails.every(({ sequence }) => sequence.isRule)).toBe(true);
    expect(
      trails.some(({ sequence }) => sequence.step % hundredths !== 0),
    ).toBe(true);
    const intoNegatives = trails.filter(
      ({ sequence, values }) => sequence.start > 0 && Math.min(...values) < 0,
    );
    expect(intoNegatives.length).toBeGreaterThan(0);
    expect(
      describeTrailRule(intoNegatives[0].sequence, numberTrailPlans[6].length),
    ).toMatch(/^The rule was subtract \d+ each time, back through zero!$/);
  });

  it("is the same trail for the same seed", () => {
    expect(buildNumberTrail(6, buildRandom(9))).toEqual(
      buildNumberTrail(6, buildRandom(9)),
    );
  });
});

describe("formatTrailNumber and parseTrailNumber", () => {
  it.each([
    [0, "0"],
    [350, "3.5"],
    [425, "4.25"],
    [-600, "−6"],
    [-25, "−0.25"],
    [123_400, "1,234"],
    [12_345_600, "123,456"],
  ])("writes %i hundredths as %s", (value, text) => {
    expect(formatTrailNumber(value)).toBe(text);
    expect(parseTrailNumber(text)).toBe(value);
  });

  it("reads what a Child types, and turns away what isn't a number yet", () => {
    expect(parseTrailNumber("-12")).toBe(-1200);
    expect(parseTrailNumber("0.3")).toBe(30);
    expect(parseTrailNumber(".3")).toBe(30);
    expect(parseTrailNumber("4.")).toBe(400);
    expect(parseTrailNumber("1000")).toBe(100_000);
    expect(parseTrailNumber("-")).toBeUndefined();
    expect(parseTrailNumber(".")).toBeUndefined();
    expect(parseTrailNumber("")).toBeUndefined();
    expect(parseTrailNumber("1.234")).toBeUndefined();
  });
});
