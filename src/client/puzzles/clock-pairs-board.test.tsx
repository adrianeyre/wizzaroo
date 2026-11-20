import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { yearGroups, type YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import {
  dealClockPairs,
  describeCardFace,
  findPartner,
  pairCountByYear,
  type ClockCard,
} from "./clock-pairs.js";
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
        gameType="clock-pairs"
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
  // The board deals from the same random numbers, so the test knows the deal.
  return dealClockPairs(yearGroup, buildRandom(seedFor(yearGroup)));
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

const listCardButtons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>(
    "button.clock-pairs-card-button",
  ),
];

const findCardButton = (card: ClockCard): HTMLButtonElement => {
  const button = listCardButtons().at(card.id);
  if (button === undefined) {
    throw new Error("no such card");
  }
  return button;
};

const turn = (card: ClockCard) => {
  click(findCardButton(card));
};

const findHintButton = () => {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>(".puzzle-tools button"),
  ].find(({ textContent }) => textContent.includes("Hint"));
  if (button === undefined) {
    throw new Error("no Hint button");
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

const requirePartner = (cards: readonly ClockCard[], card: ClockCard) => {
  const partner = findPartner(cards, card);
  if (partner === undefined) {
    throw new Error("no partner");
  }
  return partner;
};

const matchRemainingPairs = (cards: readonly ClockCard[]) => {
  const done = new Set(
    listCardButtons().flatMap((button, index) =>
      button.classList.contains("matched") ? [index] : [],
    ),
  );
  for (const card of cards) {
    if (done.has(card.id)) {
      continue;
    }
    const partner = requirePartner(cards, card);
    turn(card);
    turn(partner);
    done.add(card.id);
    done.add(partner.id);
  }
};

const expectSolvedOnce = (yearGroup: YearGroup) => {
  const skillId = findPuzzleSkillId("clock-pairs", yearGroup);
  expect(onSolved).toHaveBeenCalledTimes(1);
  expect(listQuestionRecords()).toHaveLength(pairCountByYear[yearGroup]);
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
  vi.useRealTimers();
});

describe("ClockPairsBoard", () => {
  it.each(yearGroups)(
    "plays a whole Year %i game, counting a remembered mismatch against the next pair found",
    (yearGroup) => {
      const cards = showPuzzle(yearGroup);
      expect(listCardButtons()).toHaveLength(pairCountByYear[yearGroup] * 2);
      expect(listCardButtons()[4].getAttribute("aria-label")).toBe(
        "Card 5, face down",
      );

      const [first] = cards;
      const partner = requirePartner(cards, first);
      const stranger = cards.find(
        (card) => card.id !== first.id && card.id !== partner.id,
      );
      if (stranger === undefined) {
        throw new Error("no other card");
      }

      // Two cards nobody has seen yet: exploring, not a mistake.
      turn(first);
      expect(findCardButton(first).getAttribute("aria-label")).toBe(
        `Card ${String(first.id + 1)}, ${describeCardFace(first.face)}`,
      );
      turn(stranger);
      expect(readStatus()).toContain("Not a pair");
      expect(findCardButton(stranger).classList).not.toContain("wrong");

      // Tapping on turns them back; the same mismatch again is a wrong try.
      turn(first);
      expect(findCardButton(first).getAttribute("aria-label")).toContain(
        "face down",
      );
      turn(first);
      turn(stranger);
      expect(readStatus()).toContain("Oops");
      expect(findCardButton(stranger).classList).toContain("wrong");

      turn(first);
      turn(first);
      turn(partner);
      expect(listQuestionRecords()[0]).toMatchObject({
        wrongAnswerCount: 1,
        isRightFirstTime: false,
      });
      expect(findCardButton(partner).getAttribute("aria-label")).toBe(
        `Card ${String(partner.id + 1)}, ${describeCardFace(partner.face)}, found`,
      );

      matchRemainingPairs(cards);

      expectSolvedOnce(yearGroup);
      expect(
        listQuestionRecords()
          .slice(1)
          .every(({ wrongAnswerCount }) => wrongAnswerCount === 0),
      ).toBe(true);
      expect(readStatus()).toContain("Bravo");
      expect(document.querySelector(".clock-pairs-finale")?.textContent).toBe(
        `★Every pair found in ${String(pairCountByYear[yearGroup] + 2)} turns!★`,
      );
    },
  );

  it("counts a hint as a wrong try for the pair it shows", () => {
    const cards = showPuzzle(3);
    click(findHintButton());
    const hinted = cards.filter((card) =>
      findCardButton(card).classList.contains("hinted"),
    );
    expect(hinted).toHaveLength(2);
    expect(hinted[0].pairKey).toBe(hinted[1].pairKey);
    expect(readStatus()).toContain("glowing");

    turn(hinted[0]);
    turn(hinted[1]);
    expect(listQuestionRecords()).toEqual([
      expect.objectContaining({ wrongAnswerCount: 1 }),
    ]);

    matchRemainingPairs(cards);
    expectSolvedOnce(3);
  });

  it("shows the partner of a card already turned over as the hint", () => {
    const cards = showPuzzle(6);
    const [first] = cards;
    turn(first);
    click(findHintButton());
    const partner = requirePartner(cards, first);
    expect(findCardButton(partner).classList).toContain("hinted");
    turn(partner);
    expect(listQuestionRecords()[0]).toMatchObject({ wrongAnswerCount: 1 });
  });

  it("turns a mismatch back by itself after a moment", () => {
    vi.useFakeTimers();
    const cards = showPuzzle(1);
    const [first] = cards;
    const stranger = cards.find((card) => card.pairKey !== first.pairKey);
    if (stranger === undefined) {
      throw new Error("no other card");
    }
    turn(first);
    turn(stranger);
    expect(findCardButton(stranger).classList).toContain("face-up");
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(findCardButton(stranger).classList).not.toContain("face-up");
    expect(findCardButton(first).getAttribute("aria-label")).toBe(
      `Card ${String(first.id + 1)}, face down`,
    );
  });

  it("moves between cards with the arrow keys", () => {
    showPuzzle(2);
    const buttons = listCardButtons();
    act(() => {
      buttons[0].focus();
    });
    press(buttons[0], "ArrowRight");
    expect(document.activeElement).toBe(buttons[1]);
    press(buttons[1], "ArrowDown");
    expect(document.activeElement).toBe(buttons[5]);
    press(buttons[5], "ArrowUp");
    expect(document.activeElement).toBe(buttons[1]);
  });
});
