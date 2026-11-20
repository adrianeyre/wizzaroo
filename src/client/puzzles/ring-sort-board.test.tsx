import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { buildRandom } from "../world-map-terrain.js";
import { PuzzlePlay } from "./puzzle-play.js";
import { findPuzzleSkillId } from "./puzzle-skills.js";
import { buildRingSortPuzzle, ringSortCardCounts } from "./ring-sort.js";

let root: Root;
let recordPractice: ReturnType<typeof vi.fn<(record: PracticeRecord) => void>>;
let onSolved: ReturnType<typeof vi.fn<() => void>>;

const seedFor = (yearGroup: YearGroup) => yearGroup * 7;

const showPuzzle = (yearGroup: YearGroup) => {
  let time = 0;
  act(() => {
    root.render(
      <PuzzlePlay
        gameType="ring-sort"
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

const press = (element: Element, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const findRing = (ringId: string) => {
  const ring = document.querySelector(`button[data-ring-id="${ringId}"]`);
  if (ring === null) {
    throw new Error(`No ${ringId} ring`);
  }
  return ring;
};

const findHintButton = () => {
  const button = [...document.querySelectorAll("button")].find(
    ({ textContent }) => textContent === "Hint",
  );
  if (button === undefined) {
    throw new Error("No Hint button");
  }
  return button;
};

const readStatus = () =>
  document.querySelector("[role=status]")?.textContent ?? "";

const readCardText = () =>
  document.querySelector(".ring-sort-card-text")?.textContent ?? "";

const listRecords = (kind: PracticeRecord["kind"]) =>
  recordPractice.mock.calls
    .map(([record]) => record)
    .filter((record) => record.kind === kind);

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
  document.body.innerHTML = "";
});

describe("RingSortBoard", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)(
    "plays a whole Year %i sort through the rings",
    (yearGroup) => {
      showPuzzle(yearGroup);
      const { rings, cards } = buildRingSortPuzzle(
        yearGroup,
        buildRandom(seedFor(yearGroup)),
      );
      expect(document.querySelectorAll("button[data-ring-id]")).toHaveLength(
        rings.length,
      );
      for (const [index, card] of cards.entries()) {
        expect(readCardText().replace("blank", "")).toContain(card.word);
        if (index === 0) {
          const wrongRing = rings.find(({ id }) => id !== card.ringId);
          if (wrongRing === undefined) {
            throw new Error("Only one ring");
          }
          click(findRing(wrongRing.id));
          expect(readStatus()).toContain("sends the card back");
          expect(readCardText().replace("blank", "")).toContain(card.word);
        }
        if (index === 1) {
          click(findHintButton());
          expect(
            findRing(card.ringId).classList.contains("ring-sort-ring-hinted"),
          ).toBe(true);
          expect(readStatus()).toContain("Look at the glowing");
        }
        if (index === 2) {
          const ringNumber = rings.findIndex(({ id }) => id === card.ringId);
          press(document.body, String(ringNumber + 1));
        } else {
          click(findRing(card.ringId));
        }
        expect(readStatus()).toContain(card.explanation);
        expect(findRing(card.ringId).textContent).toContain(card.sortedText);
      }

      const skillId = findPuzzleSkillId("ring-sort", yearGroup);
      const answered = listRecords("question-answered");
      expect(answered).toHaveLength(ringSortCardCounts[yearGroup]);
      expect(
        answered.every(
          (record) =>
            record.kind === "question-answered" &&
            record.skillId === skillId &&
            record.activityId === "activity-1",
        ),
      ).toBe(true);
      expect(
        answered.map((record) =>
          record.kind === "question-answered" ? record.wrongAnswerCount : -1,
        ),
      ).toEqual([1, 1, ...cards.slice(2).map(() => 0)]);
      expect(onSolved).toHaveBeenCalledTimes(1);
      expect(listRecords("activity-finished")).toEqual([
        {
          kind: "activity-finished",
          activityId: "activity-1",
          skillId,
          secondsSpent: 30,
        },
      ]);
      expect(readStatus()).toContain("Every card is sorted");
      expect(document.querySelectorAll(".ring-sort-ring-lit")).toHaveLength(
        rings.length,
      );

      click(findRing(rings[0].id));
      press(document.body, "1");
      expect(onSolved).toHaveBeenCalledTimes(1);
      expect(listRecords("question-answered")).toHaveLength(
        ringSortCardCounts[yearGroup],
      );
    },
  );

  it("names each ring and the cards it holds", () => {
    showPuzzle(1);
    const { cards } = buildRingSortPuzzle(1, buildRandom(seedFor(1)));
    const [first] = cards;
    click(findRing(first.ringId));
    expect(findRing(first.ringId).getAttribute("aria-label")).toContain(
      `holding ${first.sortedText}`,
    );
  });
});
