import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import {
  spellingSkillByYear,
  spellingWordLists,
} from "../../curriculum/spelling-words.js";
import type { PuzzleGameType } from "../../curriculum/world-map.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const showPuzzle = (gameType: PuzzleGameType, yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType={gameType}
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

const press = (element: Element, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const click = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const typeInto = (input: HTMLInputElement, text: string) => {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const listButtons = (selector: string): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>(selector),
];

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

const expectSolvedOnce = (
  gameType: PuzzleGameType,
  yearGroup: YearGroup,
  stepCount: number,
) => {
  const skillId = findPuzzleSkillId(gameType, yearGroup);
  expect(onSolved).toHaveBeenCalledTimes(1);
  expect(listQuestionRecords()).toHaveLength(stepCount);
  expect(
    listQuestionRecords().every(
      (record) =>
        record.skillId === skillId && record.activityId === "activity-1",
    ),
  ).toBe(true);
  expect(listFinishedRecords()).toEqual([
    {
      kind: "activity-finished",
      activityId: "activity-1",
      skillId,
      secondsSpent: 30,
    },
  ]);
};

const directions = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [1, -1],
  [-1, -1],
];

const findWordEnds = (word: string) => {
  const rows = [...document.querySelectorAll(".word-grid-row")].map((row) =>
    [...row.querySelectorAll("button")].map((cell) => cell.textContent),
  );
  for (const [row, letters] of rows.entries()) {
    for (const column of letters.keys()) {
      for (const [rowStep, columnStep] of directions) {
        const spelled = Array.from(
          word,
          (_, step) => rows[row + rowStep * step]?.[column + columnStep * step],
        ).join("");
        if (spelled === word) {
          const end = word.length - 1;
          return [
            [row, column],
            [row + rowStep * end, column + columnStep * end],
          ];
        }
      }
    }
  }
  throw new Error(`${word} isn't in the grid`);
};

const findCell = ([row, column]: number[]) => {
  const cell = document.querySelector(
    `[data-row="${String(row)}"][data-column="${String(column)}"]`,
  );
  if (cell === null) {
    throw new Error("no such cell");
  }
  return cell;
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

describe("PuzzlePlay", () => {
  it("names the Region, the Child's Year, the puzzle and the Skill it practises", () => {
    showPuzzle("word-search", 2);

    expect(document.querySelector("h1")?.textContent).toBe("Word search");
    expect(document.querySelector(".puzzle-kicker")?.textContent).toBe(
      "Brainwave Big Top · Year 2",
    );
    expect(document.querySelector(".puzzle-skill")?.textContent).toBe(
      "Spelling Year 2 common exception words",
    );
  });

  it("practises a Skill from the Child's own year for every puzzle", () => {
    expect(findPuzzleSkillId("word-search", 1)).toBe(
      "english.common-exception-words",
    );
    expect(findPuzzleSkillId("crossword", 6)).toBe(
      "english.word-list-upper-key-stage-2",
    );
    expect(findPuzzleSkillId("sudoku", 3)).toBe("maths.times-tables-3-4-8");
    expect(findPuzzleSkillId("mine-sweeper", 6)).toBe(
      "maths.order-of-operations",
    );
    expect(findPuzzleSkillId("mahjong", 4)).toBe("maths.fractions-as-decimals");
  });
});

describe("WordSearchBoard", () => {
  it.each<YearGroup>([1, 6])(
    "counts each Year %i word found as a Question, and a wrong line against the next word found",
    (yearGroup) => {
      showPuzzle("word-search", yearGroup);
      const words = [...document.querySelectorAll(".word-list li")].map(
        (item) =>
          (item.firstChild?.nextSibling?.textContent ?? "").toUpperCase(),
      );

      press(findCell([0, 0]), "Enter");
      press(findCell([0, 1]), "Enter");
      const firstFeedback = readStatus();
      for (const word of words) {
        const [start, end] = findWordEnds(word);
        press(findCell(start), "Enter");
        press(findCell(end), "Enter");
      }

      expectSolvedOnce("word-search", yearGroup, words.length);
      const isFirstLineAWord = !firstFeedback.startsWith("That's not");
      expect(listQuestionRecords()[0].isRightFirstTime).toBe(isFirstLineAWord);
      expect(readStatus()).toContain("That's every word.");
    },
  );

  it("tells the Child that words run in straight lines", () => {
    showPuzzle("word-search", 3);

    press(findCell([0, 0]), "Enter");
    press(findCell([1, 3]), "Enter");

    expect(readStatus()).toBe(
      "Words go in straight lines: across, down or corner to corner.",
    );
    expect(recordPractice).not.toHaveBeenCalled();
  });
});

describe("SudokuBoard", () => {
  it.each<YearGroup>([1, 6])(
    "takes only the right number in each Year %i square, counting the wrong tries",
    (yearGroup) => {
      showPuzzle("sudoku", yearGroup);
      const blankCount = listButtons(".sudoku-cell:not(.given)").length;
      let wrongTries = 0;

      for (const cell of listButtons(".sudoku-cell:not(.given)")) {
        click(cell);
        for (const key of listButtons(".number-pad-key")) {
          if (cell.classList.contains("solved")) {
            break;
          }
          click(key);
          if (!cell.classList.contains("solved")) {
            wrongTries++;
          }
        }
      }

      expectSolvedOnce("sudoku", yearGroup, blankCount);
      expect(
        listQuestionRecords().reduce(
          (total, record) => total + record.wrongAnswerCount,
          0,
        ),
      ).toBe(wrongTries);
      expect(readStatus()).toBe("Brilliant, the grid is complete!");
    },
  );

  it("shows a sum from the Child's year in some empty squares", () => {
    showPuzzle("sudoku", 3);

    const facts = [...document.querySelectorAll(".sudoku-fact")]
      .map(({ textContent }) => textContent)
      .filter(Boolean);

    expect(facts).toHaveLength(5);
    for (const fact of facts) {
      expect(fact).toMatch(/[÷×] [348]$|^[348] ×/);
    }
  });
});

describe("MineSweeperBoard", () => {
  it.each<YearGroup>([1, 6])(
    "counts each Year %i mine as a Question, wrong if the Child dug it up",
    (yearGroup) => {
      showPuzzle("mine-sweeper", yearGroup);
      const cells = listButtons(".mine-cell");
      click(cells[Math.floor(cells.length / 2)]);
      const clues = [...document.querySelectorAll(".mine-fact")];
      let minesDug = 0;

      for (const cell of listButtons(".mine-cell")) {
        if (onSolved.mock.calls.length > 0) {
          break;
        }
        if (!cell.classList.contains("open")) {
          click(cell);
          if (cell.classList.contains("dug-mine")) {
            minesDug++;
          }
        }
      }

      const mineCount = [5, 7, 9, 11, 13, 16][yearGroup - 1];
      expect(clues.length).toBeGreaterThan(0);
      expectSolvedOnce("mine-sweeper", yearGroup, mineCount);
      expect(
        listQuestionRecords().filter(
          ({ isRightFirstTime }) => !isRightFirstTime,
        ),
      ).toHaveLength(minesDug);
      expect(readStatus()).toBe(
        "Every safe square is dug. You cleared the field!",
      );
    },
  );

  it("flags a square in Flag mode instead of digging it", () => {
    showPuzzle("mine-sweeper", 2);
    const [firstCell] = listButtons(".mine-cell");

    click(listButtons(".dig-mode button")[1]);
    click(firstCell);

    expect(firstCell.getAttribute("aria-label")).toBe(
      "Flagged, row 1, column 1",
    );
    expect(recordPractice).not.toHaveBeenCalled();
  });
});

const findAnswerForClue = (
  clueButton: HTMLButtonElement,
  yearGroup: YearGroup,
): string => {
  const number = clueButton.querySelector(".clue-number")?.textContent ?? "";
  const word = spellingWordLists[spellingSkillByYear[yearGroup]].find(
    ({ word: answer, clue }) =>
      clueButton.textContent === `${number}${clue} (${String(answer.length)})`,
  );
  if (word === undefined) {
    throw new Error(`no word has the clue ${clueButton.textContent}`);
  }
  return word.word.toUpperCase();
};

const findEmptyFocusedSquare = () => {
  const focused = document.activeElement;
  return focused instanceof HTMLInputElement &&
    !focused.readOnly &&
    focused.value === ""
    ? focused
    : undefined;
};

const fillActiveWord = (answer: string, wrongAt?: number) => {
  let square = findEmptyFocusedSquare();
  let typedCount = 0;
  while (square !== undefined && typedCount < answer.length) {
    const position = [
      ...document.querySelectorAll(".crossword-cell.active input"),
    ].indexOf(square);
    const letter = answer[position];
    typeInto(
      square,
      position === wrongAt ? (letter === "Z" ? "Y" : "Z") : letter,
    );
    typedCount++;
    square = findEmptyFocusedSquare();
  }
};

describe("CrosswordBoard", () => {
  it.each<YearGroup>([1, 5])(
    "turns a Year %i word green when it's spelled right, and clears the wrong letters when it isn't",
    (yearGroup) => {
      showPuzzle("crossword", yearGroup);
      const clues = listButtons(".clue");

      click(clues[0]);
      fillActiveWord(findAnswerForClue(clues[0], yearGroup), 0);
      expect(readStatus()).toContain("isn't spelled right yet");

      for (const clue of listButtons(".clue")) {
        click(clue);
        fillActiveWord(findAnswerForClue(clue, yearGroup));
      }

      expectSolvedOnce("crossword", yearGroup, clues.length);
      expect(
        listQuestionRecords()
          .map(({ wrongAnswerCount }) => wrongAnswerCount)
          .toSorted()
          .at(-1),
      ).toBe(1);
      expect(readStatus()).toBe(
        "Every word is spelled right. Crossword complete!",
      );
    },
  );

  it("keeps the clue the Child tapped as the word being filled", () => {
    showPuzzle("crossword", 3);

    for (const clue of listButtons(".clue")) {
      click(clue);

      expect(clue.getAttribute("aria-current")).toBe("true");
    }
  });
});

describe("MahjongBoard", () => {
  it.each<YearGroup>([2, 6])(
    "clears every Year %i pair, counting a mismatched pick against the next pair",
    (yearGroup) => {
      showPuzzle("mahjong", yearGroup);
      const pairCount = listButtons(".mahjong-tile").length / 2;
      let tries = 0;

      while (listButtons(".mahjong-tile").length > 0 && tries < 2000) {
        tries++;
        const free = listButtons(".mahjong-tile.free");
        let matched = false;
        for (const [position, first] of free.entries()) {
          for (const second of free.slice(position + 1)) {
            const tilesBefore = listButtons(".mahjong-tile").length;
            click(first);
            click(second);
            if (listButtons(".mahjong-tile").length < tilesBefore) {
              matched = true;
              break;
            }
          }
          if (matched) {
            break;
          }
        }
        if (!matched) {
          click(listButtons(".puzzle-tools button")[1]);
        }
      }

      expectSolvedOnce("mahjong", yearGroup, pairCount);
      expect(readStatus()).toBe("Every pair matched. Board cleared!");
    },
  );

  it("won't pick a tile that is stuck under or between others", () => {
    showPuzzle("mahjong", 3);
    const [stuck] = listButtons(".mahjong-tile.blocked");

    click(stuck);

    expect(readStatus()).toBe(
      "That tile is stuck. Pick one with nothing on top and a free side.",
    );
    expect(stuck.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("reading a Puzzle out loud", () => {
  it("reads the Puzzle's instruction when the Child presses Read it to me", () => {
    const spoken: string[] = [];
    vi.stubGlobal("speechSynthesis", {
      speak: ({ text }: { text: string }) => spoken.push(text),
      cancel: () => undefined,
      getVoices: () => [],
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        constructor(readonly text: string) {}
      },
    );
    showPuzzle("sudoku", 3);

    const readButton = listButtons("button.read-aloud").find(
      (button) => button.textContent === "Read it to me",
    );
    if (readButton === undefined) {
      throw new Error("no Read it to me button");
    }
    click(readButton);

    expect(spoken).toEqual([
      "Fill the grid so every row, column and box has each number once. Work out the sums to crack the tricky squares.",
    ]);
    vi.unstubAllGlobals();
  });
});
