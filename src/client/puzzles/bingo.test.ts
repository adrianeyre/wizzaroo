import { describe, expect, it } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildBingoGame,
  formatBingoNumber,
  listBingoLines,
  listCompletedLines,
  type BingoCall,
} from "./bingo.js";

const yearGroups: readonly YearGroup[] = [1, 2, 3, 4, 5, 6];
const seeds = Array.from({ length: 150 }, (_, seed) => seed + 1);

const readNumber = (text: string): number => Number(text.replaceAll(",", ""));

/** Works the call out again from its printed text, checking the Year's Skill on the way. */
const workOut = (yearGroup: YearGroup, { text, spoken }: BingoCall): number => {
  const sum = /^([\d.,]+) ([−×÷]) ([\d.,]+)$/u.exec(text);
  const power = /^(\d+)([²³])$/u.exec(text);
  const percent = /^(\d+)% of (\d+)$/u.exec(text);
  if (yearGroup === 1 && sum?.[2] === "−") {
    const [start, taken] = [readNumber(sum[1]), readNumber(sum[3])];
    expect(start).toBeLessThanOrEqual(20);
    expect(spoken).toBe(`${sum[1]} take away ${sum[3]}`);
    return start - taken;
  }
  if ((yearGroup === 2 || yearGroup === 3 || yearGroup === 4) && sum) {
    const tables: readonly number[] = { 2: [2, 5, 10], 3: [3, 4, 8], 4: [] }[
      yearGroup
    ];
    const [first, second] = [readNumber(sum[1]), readNumber(sum[3])];
    if (sum[2] === "×") {
      expect(first).toBeLessThanOrEqual(12);
      expect(second).toBeLessThanOrEqual(12);
      if (tables.length > 0) {
        expect(tables.includes(first) || tables.includes(second)).toBe(true);
      }
      expect(spoken).toBe(`${sum[1]} times ${sum[3]}`);
      return first * second;
    }
    expect(sum[2]).toBe("÷");
    expect(tables).toContain(second);
    expect(first / second).toBeLessThanOrEqual(12);
    expect(spoken).toBe(`${sum[1]} divided by ${sum[3]}`);
    return first / second;
  }
  if (yearGroup === 5 && power) {
    const base = Number(power[1]);
    const isSquare = power[2] === "²";
    expect(spoken).toBe(`${power[1]} ${isSquare ? "squared" : "cubed"}`);
    expect(base).toBeLessThanOrEqual(isSquare ? 12 : 5);
    return base ** (isSquare ? 2 : 3);
  }
  if (yearGroup === 5 && sum?.[2] === "×") {
    const multiplier = readNumber(sum[3]);
    expect([10, 100, 1000]).toContain(multiplier);
    expect(spoken).toBe(`${sum[1]} times ${sum[3]}`);
    return Math.round(readNumber(sum[1]) * multiplier * 100) / 100;
  }
  if (yearGroup === 6 && percent) {
    expect(spoken).toBe(`${percent[1]} percent of ${percent[2]}`);
    expect(Number(percent[2])).toBeLessThanOrEqual(400);
    return (Number(percent[1]) * Number(percent[2])) / 100;
  }
  throw new Error(`Year ${String(yearGroup)} can't call ${text}`);
};

describe("buildBingoGame", () => {
  it.each(yearGroups)(
    "deals a Year %i card where every call has exactly one answer on the card",
    (yearGroup) => {
      for (const seed of seeds) {
        const { size, card, calls } = buildBingoGame(
          yearGroup,
          buildRandom(seed * 31 + yearGroup),
        );
        expect(size).toBe(yearGroup <= 2 ? 3 : 4);
        expect(card).toHaveLength(size * size);
        expect(new Set(card).size).toBe(card.length);
        expect(calls).toHaveLength(card.length);
        expect(new Set(calls.map(({ text }) => text)).size).toBe(calls.length);
        for (const call of calls) {
          expect(workOut(yearGroup, call)).toBe(call.answer);
          expect(Number.isInteger(call.answer)).toBe(true);
          expect(call.answer).toBeGreaterThanOrEqual(0);
          expect(card.filter((answer) => answer === call.answer)).toHaveLength(
            1,
          );
        }
        expect([...card].sort((a, b) => a - b)).toEqual(
          calls.map(({ answer }) => answer).sort((a, b) => a - b),
        );
      }
    },
  );

  it("mixes the kinds of call a Year practises", () => {
    const textsFor = (yearGroup: YearGroup) =>
      seeds.flatMap((seed) =>
        buildBingoGame(yearGroup, buildRandom(seed)).calls.map(
          ({ text }) => text,
        ),
      );
    const year2 = textsFor(2);
    expect(year2.some((text) => text.includes("×"))).toBe(true);
    expect(year2.some((text) => text.includes("÷"))).toBe(true);
    const year5 = textsFor(5);
    expect(year5.some((text) => text.endsWith("²"))).toBe(true);
    expect(year5.some((text) => text.endsWith("³"))).toBe(true);
    expect(year5.some((text) => text.includes("× 1,000"))).toBe(true);
    expect(year5.some((text) => /^\d+\.\d × /u.test(text))).toBe(true);
    expect(textsFor(6).some((text) => text.startsWith("25% of"))).toBe(true);
  });

  it("deals the same game for the same random numbers", () => {
    expect(buildBingoGame(4, buildRandom(9))).toEqual(
      buildBingoGame(4, buildRandom(9)),
    );
  });
});

describe("bingo lines", () => {
  it("lists every row, column and both diagonals", () => {
    expect(listBingoLines(3)).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]);
    expect(listBingoLines(4)).toHaveLength(10);
  });

  it("finds the lines that are fully dabbed", () => {
    expect(listCompletedLines(3, new Set([0, 4, 8, 1]))).toEqual([[0, 4, 8]]);
    expect(listCompletedLines(3, new Set([0, 1]))).toEqual([]);
  });
});

describe("formatBingoNumber", () => {
  it("writes thousands with a comma and keeps decimals short", () => {
    expect(formatBingoNumber(4500)).toBe("4,500");
    expect(formatBingoNumber(3.4)).toBe("3.4");
  });
});
