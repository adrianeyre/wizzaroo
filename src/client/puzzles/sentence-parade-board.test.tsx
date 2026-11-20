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
  buildParade,
  describeWagon,
  isRightNextWagon,
  sentenceCountByYear,
} from "./sentence-parade.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const seedFor = (yearGroup: YearGroup) => yearGroup * 7;

const showPuzzle = (yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="sentence-parade"
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

const listStationWagons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>(
    ".sentence-parade-station button",
  ),
];

const findButton = (name: string): HTMLButtonElement => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent.trim() === name,
  );
  if (button === undefined) {
    throw new Error(`No ${name} button`);
  }
  return button;
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

const coupleWagon = (text: string) => {
  const wagon = listStationWagons().find(
    (button) =>
      button.getAttribute("aria-label") === `Wagon: ${describeWagon(text)}`,
  );
  if (wagon === undefined) {
    throw new Error(`No ${text} wagon in the station`);
  }
  click(wagon);
};

/** Builds every sentence through the board; a wrong try or hint where asked. */
const playParade = (
  yearGroup: YearGroup,
  {
    wrongInRound,
    hintInRound,
  }: { wrongInRound?: number; hintInRound?: number },
) => {
  const rounds = buildParade(yearGroup, buildRandom(seedFor(yearGroup)));
  for (const [index, round] of rounds.entries()) {
    expect(document.querySelector(".sentence-parade-prompt")?.textContent).toBe(
      round.prompt,
    );
    const texts = (round.orders[0] ?? []).map(({ text }) => text);
    if (index === wrongInRound) {
      const wrong = round.wagons.find(
        ({ text }) => !isRightNextWagon(round, [], text),
      );
      if (wrong === undefined) {
        throw new Error("Every wagon could come first");
      }
      coupleWagon(wrong.text);
      expect(readStatus()).toContain("doesn't come next");
      expect(
        document.querySelectorAll(".sentence-parade-train li.coupled"),
      ).toHaveLength(0);
    }
    let start = 0;
    if (index === hintInRound) {
      click(findButton("Hint"));
      expect(readStatus()).toContain("coupled the");
      start = 1;
    }
    for (const text of texts.slice(start)) {
      coupleWagon(text);
    }
    expect(
      document.querySelector(".sentence-parade-built mark"),
    ).not.toBeNull();
    if (index < rounds.length - 1) {
      expect(readStatus()).toContain("Toot toot!");
      click(findButton("Next sentence"));
    }
  }
};

const expectSolvedOnce = (yearGroup: YearGroup) => {
  const skillId = findPuzzleSkillId("sentence-parade", yearGroup);
  expect(onSolved).toHaveBeenCalledTimes(1);
  expect(listQuestionRecords()).toHaveLength(sentenceCountByYear[yearGroup]);
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

beforeAll(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

beforeEach(() => {
  recordPractice = vi.fn<(record: PracticeRecord) => void>();
  onSolved = vi.fn<() => void>();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
});

describe("Sentence Parade", () => {
  it.each(yearGroups)(
    "plays every Year %i sentence through to a grand parade",
    (yearGroup) => {
      showPuzzle(yearGroup);
      playParade(yearGroup, { wrongInRound: 1 });

      expectSolvedOnce(yearGroup);
      const wrongCounts = listQuestionRecords().map(
        ({ wrongAnswerCount }) => wrongAnswerCount,
      );
      expect(wrongCounts[0]).toBe(0);
      expect(wrongCounts[1]).toBe(1);
      expect(readStatus()).toContain("grand parade");
      expect(document.body.textContent).toContain("Grand parade!");
      expect(document.querySelector(".sentence-parade-next")).toBeNull();
    },
  );

  it("counts a hint as a wrong try for that sentence", () => {
    showPuzzle(6);
    playParade(6, { hintInRound: 0 });

    expectSolvedOnce(6);
    const [first, second] = listQuestionRecords();
    expect(first).toMatchObject({
      wrongAnswerCount: 1,
      isRightFirstTime: false,
    });
    expect(second).toMatchObject({
      wrongAnswerCount: 0,
      isRightFirstTime: true,
    });
  });

  it("shows the ringmaster's call and wagons with readable names", () => {
    showPuzzle(4);
    const labels = listStationWagons().map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(labels.length).toBeGreaterThan(3);
    expect(labels.every((label) => label?.startsWith("Wagon: "))).toBe(true);
    expect(document.body.textContent).toContain("Sentence 1 of 6");
    expect(document.body.textContent).toContain("0 of 6 sentences paraded");
  });

  it("moves between station wagons with the arrow keys", () => {
    showPuzzle(1);
    const [first, second] = listStationWagons();
    first.focus();
    act(() => {
      first.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(second);
  });
});
