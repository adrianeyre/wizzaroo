import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import { formatTrailNumber, parseTrailNumber } from "./number-trail.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const showPuzzle = (yearGroup: YearGroup, seed = yearGroup * 7) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="number-trail"
        yearGroup={yearGroup}
        random={buildRandom(seed)}
        buildId={() => "activity-1"}
        readTime={() => (time += 30_000)}
        recordPractice={recordPractice}
        onSolved={onSolved}
        leaveButton={<button type="button">Back to the map</button>}
      />,
    );
  });
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

const readStatus = () =>
  document.querySelector("[role=status]")?.textContent ?? "";

const listQuestionRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "question-answered");

const listFinishedRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "activity-finished");

const findSquare = (index: number): HTMLButtonElement => {
  const square = document.querySelector<HTMLButtonElement>(
    `[data-number-trail-square="${String(index)}"]`,
  );
  if (square === null) {
    throw new Error(`no trail square ${String(index)}`);
  }
  return square;
};

const listSquares = () => [
  ...document.querySelectorAll<HTMLButtonElement>(".number-trail-square"),
];

const readSquareValue = (index: number): number => {
  const label = findSquare(index).getAttribute("aria-label") ?? "";
  const value = parseTrailNumber(label.slice(label.lastIndexOf(", ") + 2));
  if (value === undefined) {
    throw new Error(`square ${String(index)} has no number: ${label}`);
  }
  return value;
};

const findPadKey = (character: string): HTMLButtonElement => {
  const key = [
    ...document.querySelectorAll<HTMLButtonElement>(".number-trail-key"),
  ].find((button) =>
    character === "−"
      ? button.getAttribute("aria-label") === "Minus"
      : character === "."
        ? button.getAttribute("aria-label") === "Decimal point"
        : button.textContent === character,
  );
  if (key === undefined) {
    throw new Error(`no pad key ${character}`);
  }
  return key;
};

const typeOnPad = (value: number) => {
  for (const character of formatTrailNumber(value).replaceAll(",", "")) {
    click(findPadKey(character));
  }
  click(findPadKey("Check"));
};

const openSquareIndexes = () =>
  listSquares()
    .filter((square) => square.classList.contains("open"))
    .map((square) => Number(square.dataset.numberTrailSquare))
    .sort((first, second) => first - second);

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

describe("NumberTrailBoard", () => {
  it.each<YearGroup>([1, 2, 3, 4, 5, 6])(
    "counts each Year %i square filled as a Question, turning away a wrong number",
    (yearGroup) => {
      showPuzzle(yearGroup);
      const start = readSquareValue(0);
      const step = readSquareValue(1) - start;
      const blanks = openSquareIndexes();
      expect(blanks.length).toBeGreaterThanOrEqual(6);

      click(findSquare(blanks[0]));
      typeOnPad(start + step * blanks[0] + step * 2);
      expect(readStatus()).toContain("doesn't fit there");
      expect(findSquare(blanks[0]).classList.contains("open")).toBe(true);

      for (const index of blanks) {
        click(findSquare(index));
        typeOnPad(start + step * index);
      }

      const skillId = findPuzzleSkillId("number-trail", yearGroup);
      expect(onSolved).toHaveBeenCalledTimes(1);
      const questions = listQuestionRecords();
      expect(questions).toHaveLength(blanks.length);
      expect(
        questions.every(
          (record) =>
            record.skillId === skillId && record.activityId === "activity-1",
        ),
      ).toBe(true);
      expect(questions[0].wrongAnswerCount).toBe(1);
      expect(questions[0].isRightFirstTime).toBe(false);
      expect(
        questions.slice(1).every((record) => record.isRightFirstTime),
      ).toBe(true);
      expect(listFinishedRecords()).toEqual([
        {
          kind: "activity-finished",
          activityId: "activity-1",
          skillId,
          secondsSpent: 30,
        },
      ]);
      expect(readStatus()).toMatch(
        /^The elephant reached the ring! (You counted (on|back) in|The rule was)/,
      );
      expect(document.querySelector(".number-trail-finale")).not.toBeNull();
    },
  );

  it("counts a hint as a wrong try, and tells the step and the square before", () => {
    showPuzzle(4);
    const start = readSquareValue(0);
    const step = readSquareValue(1) - start;
    const [first] = openSquareIndexes();
    click(findSquare(first));

    click(
      [...document.querySelectorAll(".number-trail-tools button")].find(
        (button) => button.textContent === "Hint",
      ) ?? document.body,
    );

    expect(readStatus()).toMatch(/^Hint: The trail counts (on|back) in \d+s\./);
    expect(readStatus()).toContain(
      `The square before this one is ${formatTrailNumber(start + step * (first - 1))}.`,
    );
    typeOnPad(start + step * first);
    expect(listQuestionRecords()[0].wrongAnswerCount).toBe(1);
  });

  it("can be played with the keyboard alone", () => {
    showPuzzle(1);
    const start = readSquareValue(0);
    const step = readSquareValue(1) - start;
    const [first] = openSquareIndexes();
    const square = findSquare(first);
    expect(square.getAttribute("aria-pressed")).toBe("true");
    expect(square.tabIndex).toBe(0);

    for (const digit of String((start + step * first) / 100)) {
      press(square, digit);
    }
    expect(square.getAttribute("aria-label")).toContain("you typed");
    press(square, "Enter");

    expect(findSquare(first).classList.contains("filled")).toBe(true);
    expect(listQuestionRecords()).toHaveLength(1);
    expect(listQuestionRecords()[0].isRightFirstTime).toBe(true);
  });

  it("does not count Check with nothing typed as a wrong try", () => {
    showPuzzle(2);
    click(findPadKey("Check"));

    expect(readStatus()).toBe("Type a number first, then press Check.");
    expect(recordPractice).not.toHaveBeenCalled();
  });
});
