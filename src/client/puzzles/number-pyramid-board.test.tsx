import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { yearGroups, type YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  buildNumberPyramid,
  findEasiestBlank,
  formatPyramidNumber,
  numberPyramidPlans,
  type NumberPyramid,
} from "./number-pyramid.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const seedFor = (yearGroup: YearGroup) => yearGroup * 7;

const showPuzzle = (yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="number-pyramid"
        yearGroup={yearGroup}
        random={buildRandom(seedFor(yearGroup))}
        buildId={() => "activity-1"}
        readTime={() => (time += 30_000)}
        recordPractice={recordPractice}
        onSolved={onSolved}
        leaveButton={<button type="button">Back to the map</button>}
      />,
    );
  });
  // The board builds its pyramid from the same seeded random, first thing.
  return buildNumberPyramid(
    numberPyramidPlans[yearGroup],
    buildRandom(seedFor(yearGroup)),
  );
};

const click = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const press = (element: Element, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const findBrick = (index: number) => {
  const brick = document.querySelector<HTMLButtonElement>(
    `[data-number-pyramid-brick="${String(index)}"]`,
  );
  if (brick === null) {
    throw new Error(`no brick ${String(index)}`);
  }
  return brick;
};

const findPadKey = (key: string) => {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>(
      ".number-pyramid-pad button",
    ),
  ].find((pad) =>
    key === "."
      ? pad.getAttribute("aria-label") === "Decimal point"
      : pad.textContent === key,
  );
  if (button === undefined) {
    throw new Error(`no key ${key}`);
  }
  return button;
};

const findButton = (name: string) => {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>("aside button"),
  ].find((candidate) => candidate.textContent.trim() === name);
  if (button === undefined) {
    throw new Error(`no ${name} button`);
  }
  return button;
};

const readStatus = () =>
  document.querySelector("[role=status]")?.textContent ?? "";

const show = (pyramid: NumberPyramid, units: number) =>
  formatPyramidNumber(units, pyramid.unitsPerWhole).replaceAll(",", "");

const tapIn = (text: string) => {
  for (const key of text) {
    click(findPadKey(key));
  }
  click(findButton("Check"));
};

const listQuestionRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "question-answered");

const listFinishedRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "activity-finished");

/** Fills every blank in an order a Child could work them out. */
const buildRest = (pyramid: NumberPyramid, firstWrong: boolean) => {
  const known = pyramid.bricks.map(({ value, isGiven }) =>
    isGiven ? value : undefined,
  );
  let isFirst = true;
  for (;;) {
    const next = findEasiestBlank(pyramid.rows, known);
    if (next === undefined) {
      break;
    }
    const value = pyramid.bricks[next.index].value;
    click(findBrick(next.index));
    if (isFirst && firstWrong) {
      tapIn(show(pyramid, value + 1));
      expect(findBrick(next.index).className).toContain("wrong");
      expect(readStatus()).toContain("wobbles off");
    }
    isFirst = false;
    tapIn(show(pyramid, value));
    known[next.index] = value;
  }
  expect(known.every((value) => value !== undefined)).toBe(true);
};

beforeEach(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  recordPractice = vi.fn<(record: PracticeRecord) => void>();
  onSolved = vi.fn<() => void>();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.replaceChildren();
});

describe("NumberPyramidBoard", () => {
  it.each(yearGroups)(
    "builds the whole pyramid with the number pad in Year %i, counting a wrong try",
    (yearGroup) => {
      const pyramid = showPuzzle(yearGroup);
      const skillId = findPuzzleSkillId("number-pyramid", yearGroup);
      const blankCount = pyramid.bricks.filter(
        ({ isGiven }) => !isGiven,
      ).length;
      expect(document.querySelectorAll(".number-pyramid-brick")).toHaveLength(
        pyramid.bricks.length,
      );
      for (const [index, brick] of pyramid.bricks.entries()) {
        if (brick.isGiven) {
          expect(findBrick(index).textContent).toBe(
            formatPyramidNumber(brick.value, pyramid.unitsPerWhole),
          );
        }
      }

      buildRest(pyramid, true);

      const records = listQuestionRecords();
      expect(records).toHaveLength(blankCount);
      expect(
        records.every(
          (record) =>
            record.skillId === skillId && record.activityId === "activity-1",
        ),
      ).toBe(true);
      expect(records[0]).toMatchObject({
        isRightFirstTime: false,
        wrongAnswerCount: 1,
      });
      expect(records.slice(1).every((record) => record.isRightFirstTime)).toBe(
        true,
      );
      expect(onSolved).toHaveBeenCalledTimes(1);
      expect(listFinishedRecords()).toEqual([
        {
          kind: "activity-finished",
          activityId: "activity-1",
          skillId,
          secondsSpent: 30,
        },
      ]);
      expect(document.querySelector(".number-pyramid.solved")).not.toBeNull();
      expect(readStatus()).toContain("acrobats take a bow");
    },
  );

  it("shows big numbers with commas in Year 6", () => {
    const pyramid = showPuzzle(6);
    const given = pyramid.bricks.findIndex(({ isGiven }) => isGiven);
    expect(findBrick(given).textContent).toMatch(/^\d{2,3},\d{3}$/);
  });

  it("shows the working as a hint, and counts it as a wrong try", () => {
    const pyramid = showPuzzle(1);
    const known = pyramid.bricks.map(({ value, isGiven }) =>
      isGiven ? value : undefined,
    );
    const next = findEasiestBlank(pyramid.rows, known);
    if (next === undefined) {
      throw new Error("nothing to work out");
    }
    click(findButton("Hint"));
    expect(readStatus()).toMatch(/Ringmaster's hint: .*\d+ [+−] \d+ = \?/);
    expect(findBrick(next.index).className).toContain("hinted");

    tapIn(show(pyramid, pyramid.bricks[next.index].value));

    expect(listQuestionRecords()[0]).toMatchObject({ wrongAnswerCount: 1 });
  });

  it("takes typed numbers, a decimal point and Enter from the keyboard in Year 5", () => {
    const pyramid = showPuzzle(5);
    const known = pyramid.bricks.map(({ value, isGiven }) =>
      isGiven ? value : undefined,
    );
    const next = findEasiestBlank(pyramid.rows, known);
    if (next === undefined) {
      throw new Error("nothing to work out");
    }
    const brick = findBrick(next.index);
    click(brick);
    const answer = show(pyramid, pyramid.bricks[next.index].value);
    expect(answer).toContain(".");
    for (const key of `${answer}9`) {
      press(brick, key);
    }
    press(brick, "Backspace");
    expect(brick.textContent).toBe(answer);
    press(brick, "Enter");

    expect(findBrick(next.index).className).toContain("placed");
    expect(listQuestionRecords()).toEqual([
      expect.objectContaining({ isRightFirstTime: true }),
    ]);
  });

  it("moves between bricks with the arrow keys", () => {
    const pyramid = showPuzzle(3);
    const start = document.querySelector<HTMLButtonElement>(
      ".number-pyramid-brick[tabindex='0']",
    );
    if (start === null) {
      throw new Error("no selected brick");
    }
    const startIndex = Number(start.dataset.numberPyramidBrick);
    const startRow = pyramid.bricks[startIndex].row;
    press(start, startRow === pyramid.rows - 1 ? "ArrowDown" : "ArrowUp");
    const moved = document.querySelector<HTMLButtonElement>(
      ".number-pyramid-brick[tabindex='0']",
    );
    expect(moved).not.toBe(start);
    expect(document.activeElement).toBe(moved);
  });
});
