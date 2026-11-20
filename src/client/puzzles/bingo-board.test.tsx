import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import { formatBingoNumber } from "./bingo.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const showBingo = (yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="bingo"
        yearGroup={yearGroup}
        random={buildRandom(yearGroup * 7)}
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

const listCells = () => [
  ...document.querySelectorAll<HTMLButtonElement>("button.bingo-cell"),
];

const findButton = (name: string) => {
  const button = [...document.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === name,
  );
  if (button === undefined) {
    throw new Error(`no ${name} button`);
  }
  return button;
};

const readNumber = (text: string) => Number(text.replaceAll(",", ""));

/** Works out the ringmaster's current call from the ball. */
const workOutCall = (): number => {
  const text =
    document.querySelector(".bingo-ball-text")?.textContent.trim() ?? "";
  const sum = /^([\d.,]+) ([−×÷]) ([\d.,]+)$/u.exec(text);
  if (sum) {
    const [first, second] = [readNumber(sum[1]), readNumber(sum[3])];
    switch (sum[2]) {
      case "−":
        return first - second;
      case "×":
        return Math.round(first * second * 100) / 100;
      default:
        return first / second;
    }
  }
  const power = /^(\d+)([²³])$/u.exec(text);
  if (power) {
    return Number(power[1]) ** (power[2] === "²" ? 2 : 3);
  }
  const percent = /^(\d+)% of (\d+)$/u.exec(text);
  if (percent) {
    return (Number(percent[1]) * Number(percent[2])) / 100;
  }
  throw new Error(`can't work out ${text}`);
};

const findAnswerCell = () => {
  const label = formatBingoNumber(workOutCall());
  const cell = listCells().find(
    (element) => element.getAttribute("aria-label") === label,
  );
  if (cell === undefined) {
    throw new Error(`${label} isn't on the card`);
  }
  return cell;
};

const listQuestionRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "question-answered");

const listFinishedRecords = () =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === "activity-finished");

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

describe("BingoBoard", () => {
  it.each<YearGroup>([1, 2, 3, 4, 5, 6])(
    "plays a Year %i card to a full house, counting wrong squares and hints",
    (yearGroup) => {
      showBingo(yearGroup);
      const squareCount = yearGroup <= 2 ? 9 : 16;
      expect(listCells()).toHaveLength(squareCount);

      const wrongCell = listCells().find((cell) => cell !== findAnswerCell());
      if (wrongCell === undefined) {
        throw new Error("no wrong square");
      }
      click(wrongCell);
      expect(readStatus()).toContain("isn't the answer");
      expect(wrongCell.className).toContain("wrong");
      expect(wrongCell.getAttribute("aria-pressed")).toBe("false");
      const firstAnswer = findAnswerCell();
      click(firstAnswer);
      expect(firstAnswer.getAttribute("aria-pressed")).toBe("true");
      expect(document.querySelector(".bingo-called-item")).not.toBeNull();

      click(findButton("Hint"));
      const hinted = document.querySelector("button.bingo-cell.hinted");
      expect(hinted).toBe(findAnswerCell());
      click(findAnswerCell());

      while (document.querySelector(".bingo-ball-text")?.textContent !== "★") {
        click(findAnswerCell());
      }

      const skillId = findPuzzleSkillId("bingo", yearGroup);
      const records = listQuestionRecords();
      expect(records).toHaveLength(squareCount);
      expect(records.every((record) => record.skillId === skillId)).toBe(true);
      expect(records.map(({ wrongAnswerCount }) => wrongAnswerCount)).toEqual([
        1,
        1,
        ...Array.from({ length: squareCount - 2 }, () => 0),
      ]);
      expect(onSolved).toHaveBeenCalledTimes(1);
      expect(listFinishedRecords()).toEqual([
        {
          kind: "activity-finished",
          activityId: "activity-1",
          skillId,
          secondsSpent: 30,
        },
      ]);
      expect(readStatus()).toContain("BINGO!");
      expect(document.querySelector(".bingo-finish")).not.toBeNull();
      expect(document.querySelectorAll(".bingo-called-item")).toHaveLength(
        squareCount,
      );
    },
  );

  it("doesn't count tapping a square that's already dabbed as a wrong try", () => {
    showBingo(1);
    const answer = findAnswerCell();
    click(answer);
    click(answer);
    expect(readStatus()).toContain("already dabbed");
    click(findAnswerCell());
    expect(
      listQuestionRecords().map(({ wrongAnswerCount }) => wrongAnswerCount),
    ).toEqual([0, 0]);
  });

  it("moves between squares with the arrow keys", () => {
    showBingo(3);
    const cells = listCells();
    act(() => {
      cells[0].focus();
    });
    press(cells[0], "ArrowRight");
    expect(document.activeElement).toBe(cells[1]);
    press(cells[1], "ArrowDown");
    expect(document.activeElement).toBe(cells[5]);
    press(cells[5], "ArrowUp");
    press(cells[1], "ArrowUp");
    expect(document.activeElement).toBe(cells[13]);
  });

  it("reads square and cube numbers aloud as words", () => {
    showBingo(5);
    const spoken = new Set<string>();
    while (document.querySelector(".bingo-ball-text")?.textContent !== "★") {
      spoken.add(
        document.querySelector(".bingo-ball .visually-hidden")?.textContent ??
          "",
      );
      click(findAnswerCell());
    }
    const powers = [...spoken].filter((text) => /squared|cubed/u.test(text));
    expect(powers.length).toBeGreaterThan(0);
    expect(powers.every((text) => /^\d+ (squared|cubed)$/u.test(text))).toBe(
      true,
    );
  });
});
