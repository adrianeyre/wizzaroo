import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { yearGroups, type YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";
import {
  pickTightropeWords,
  splitLetters,
  tightropeLetters,
  tightropeWordCounts,
} from "./tightrope-words.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const seedFor = (yearGroup: YearGroup) => yearGroup * 7;

const showPuzzle = (yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="tightrope-words"
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
};

const click = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const typeKey = (key: string) => {
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true }),
    );
  });
};

const findButton = (selector: string): HTMLButtonElement => {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (button === null) {
    throw new Error(`no button matches ${selector}`);
  }
  return button;
};

const findButtonByText = (text: string): HTMLButtonElement => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent.trim() === text,
  );
  if (button === undefined) {
    throw new Error(`no button says ${text}`);
  }
  return button;
};

const pressLetter = (letter: string) => {
  click(findButton(`[data-letter="${letter}"]`));
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

const wrongLetterFor = (letter: string) =>
  tightropeLetters.find((other) => other !== letter) ?? "a";

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

beforeEach(() => {
  recordPractice = vi.fn<(record: PracticeRecord) => void>();
  onSolved = vi.fn<() => void>();
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
});

describe("TightropeWordsBoard", () => {
  it.each(yearGroups)(
    "plays a whole Year %i crossing through the letter keys, typing and a hint",
    (yearGroup) => {
      showPuzzle(yearGroup);
      const words = pickTightropeWords(
        yearGroup,
        buildRandom(seedFor(yearGroup)),
      );
      expect(words).toHaveLength(tightropeWordCounts[yearGroup]);

      for (const [position, entry] of words.entries()) {
        expect(document.body.textContent).toContain(entry.clue);
        const letters = splitLetters(entry.word);
        if (position === 0) {
          pressLetter(wrongLetterFor(letters[0]));
          expect(readStatus()).toContain("Wobble!");
          expect(
            document.querySelectorAll(".tightrope-words-letter"),
          ).toHaveLength(0);
        }
        if (position === 2) {
          click(findButtonByText("Hint"));
          expect(readStatus()).toContain("ringmaster");
          letters.shift();
        }
        for (const letter of letters) {
          if (position === 1) {
            typeKey(letter.toUpperCase());
          } else {
            pressLetter(letter);
          }
        }
        expect(readStatus()).toContain(`You spelled ${entry.word}!`);
        expect(readStatus()).toContain(entry.rule);
        expect(document.querySelector("mark")?.textContent).toBe(entry.pattern);
        if (position < words.length - 1) {
          expect(onSolved).not.toHaveBeenCalled();
          click(findButtonByText("Next word"));
        }
      }

      const skillId = findPuzzleSkillId("tightrope-words", yearGroup);
      const records = listQuestionRecords();
      expect(records).toHaveLength(tightropeWordCounts[yearGroup]);
      expect(records.every((record) => record.skillId === skillId)).toBe(true);
      expect(records.map((record) => record.wrongAnswerCount)).toEqual(
        words.map((_, position) => (position === 0 || position === 2 ? 1 : 0)),
      );
      expect(records[0].isRightFirstTime).toBe(false);
      expect(records[1].isRightFirstTime).toBe(true);
      expect(onSolved).toHaveBeenCalledTimes(1);
      expect(listFinishedRecords()).toEqual([
        {
          kind: "activity-finished",
          activityId: "activity-1",
          skillId,
          secondsSpent: 30,
        },
      ]);
      expect(readStatus()).toContain("Take a bow!");
      expect(document.body.textContent).toContain("Bravo! Tightrope crossed!");
    },
  );

  it("counts every wrong try on a word, and ignores typing while a word is shown", () => {
    showPuzzle(1);
    const [first] = pickTightropeWords(1, buildRandom(seedFor(1)));
    const wrong = wrongLetterFor(first.word[0]);
    typeKey(wrong);
    pressLetter(wrong);
    for (const letter of first.word) {
      typeKey(letter);
    }
    typeKey("a");
    expect(listQuestionRecords()).toHaveLength(1);
    expect(listQuestionRecords()[0].wrongAnswerCount).toBe(2);
    expect(document.activeElement?.textContent).toContain("Next word");
  });

  it("shows the clue and root word, with the pattern's tiles outlined", () => {
    showPuzzle(2);
    const [first] = pickTightropeWords(2, buildRandom(seedFor(2)));
    expect(document.body.textContent).toContain(first.madeFrom ?? "");
    expect(document.querySelectorAll(".tightrope-words-tile")).toHaveLength(
      first.word.length,
    );
    expect(
      document.querySelectorAll(".tightrope-words-tile.pattern"),
    ).toHaveLength(first.pattern.length);
    expect(document.querySelectorAll("[data-letter]")).toHaveLength(26);
  });
});
