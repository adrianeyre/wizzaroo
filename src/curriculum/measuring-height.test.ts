import { describe, expect, it } from "vitest";
import {
  buildMeasuringHeightQuestions,
  listMeasuringHeightSlips,
  listMillimetreSlips,
  toMillimetres,
  measuringHeightDifficulties,
  rulerCentimetres,
} from "./measuring-height.js";

describe("buildMeasuringHeightQuestions", () => {
  it("fits every height on the ruler, starting from zero until the last Activity", () => {
    for (const difficulty of measuringHeightDifficulties) {
      for (const { startMark, centimetres } of buildMeasuringHeightQuestions(
        difficulty,
      )) {
        expect(startMark + centimetres).toBeLessThanOrEqual(rulerCentimetres);
        expect(startMark === 0).toBe(difficulty !== 3 && difficulty !== 6);
      }
    }
  });
});

describe("listMeasuringHeightSlips", () => {
  it("offers the mark at the top when the coral doesn't start at zero", () => {
    expect(listMeasuringHeightSlips({ startMark: 2, centimetres: 5 })).toEqual([
      7, 6, 4,
    ]);
  });
});

describe("listMillimetreSlips", () => {
  it("measures in millimetres, offering the reading at the top and a centimetre out", () => {
    expect(listMillimetreSlips({ startMark: 2, centimetres: 5.4 })).toEqual([
      74, 64, 53, 55, 50,
    ]);
    expect(toMillimetres(7.4)).toBe(74);
  });
});
