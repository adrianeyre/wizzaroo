import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import {
  buildNumberPyramid,
  describeWorking,
  findBrickIndex,
  findEasiestBlank,
  findLongestEntry,
  findWorking,
  formatPyramidNumber,
  numberPyramidPlans,
  parsePyramidNumber,
  type KnownValues,
  type NumberPyramidBrick,
} from "./number-pyramid.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type Feedback =
  | { kind: "none" }
  | { kind: "right"; shown: string; left: number }
  | { kind: "wrong"; shown: string }
  | { kind: "hint"; working: string; isMoved: boolean }
  | { kind: "given" }
  | { kind: "no-entry" };

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Pick an empty brick, then type the number that belongs on it.";
    case "right":
      return feedback.left === 0
        ? "Ta-da! The pyramid reaches the top and the acrobats take a bow!"
        : `Yes, ${feedback.shown}! The brick holds steady. ${String(feedback.left)} ${feedback.left === 1 ? "brick" : "bricks"} to go.`;
    case "wrong":
      return `${feedback.shown} wobbles off! Add the two bricks underneath, or take a neighbour away from the brick above.`;
    case "hint":
      return feedback.isMoved
        ? `Ringmaster's hint: try this brick first. ${feedback.working}`
        : `Ringmaster's hint: ${feedback.working}`;
    case "given":
      return "That brick is already in place. Pick an empty brick.";
    case "no-entry":
      return "Type a number first, then press Check.";
  }
};

const arrowSteps: Record<string, [number, number] | undefined> = {
  ArrowUp: [1, 0],
  ArrowDown: [-1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const padKeys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

const describeBrick = (
  brick: NumberPyramidBrick,
  rows: number,
  shown: string | undefined,
  draft: string,
) => {
  const place =
    brick.row === rows - 1
      ? "Top brick"
      : `Row ${String(brick.row + 1)} from the bottom, brick ${String(brick.position + 1)}`;
  if (shown !== undefined) {
    return `${place}, ${shown}`;
  }
  return draft === "" ? `${place}, empty` : `${place}, empty, typed ${draft}`;
};

const BulbIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
);

const BackspaceIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
    <path d="m16 9-5 6" />
    <path d="m11 9 5 6" />
  </svg>
);

const Acrobat = ({ isCheering }: { isCheering: boolean }) => (
  <svg
    viewBox="0 0 120 110"
    className={`number-pyramid-acrobat${isCheering ? " cheering" : ""}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="number-pyramid-leotard" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f43f5e" />
        <stop offset="1" stopColor="#be123c" />
      </linearGradient>
      <radialGradient id="number-pyramid-skin" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#fde4c8" />
        <stop offset="1" stopColor="#e7b48a" />
      </radialGradient>
    </defs>
    <g className="number-pyramid-sparkles">
      <path d="M14 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fbbf24" />
      <path
        d="M104 22l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z"
        fill="#fde047"
      />
      <path
        d="M98 66l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z"
        fill="#f472b6"
      />
      <path
        d="M22 70l1.8 4 4 1.8-4 1.8-1.8 4-1.8-4-4-1.8 4-1.8z"
        fill="#38bdf8"
      />
    </g>
    <g className="number-pyramid-acrobat-body">
      <g className="number-pyramid-arm left">
        <path
          d="M52 50 L30 40"
          stroke="url(#number-pyramid-skin)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="29" cy="39.5" r="4.5" fill="#fde4c8" />
      </g>
      <g className="number-pyramid-arm right">
        <path
          d="M68 50 L90 40"
          stroke="url(#number-pyramid-skin)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle cx="91" cy="39.5" r="4.5" fill="#fde4c8" />
      </g>
      <path
        d="M54 84 L50 104 M66 84 L70 104"
        stroke="#1e1b4b"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M48 50 Q60 42 72 50 L69 86 Q60 90 51 86 Z"
        fill="url(#number-pyramid-leotard)"
      />
      <path
        d="M52 58 L68 58 M51 68 L69 68 M51 78 L69 78"
        stroke="#fbbf24"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
      <circle cx="60" cy="32" r="12" fill="url(#number-pyramid-skin)" />
      <path
        d="M48 28 Q60 12 72 28 Q66 22 60 23 Q54 22 48 28 Z"
        fill="#7c2d12"
      />
      <circle cx="55.5" cy="32" r="1.6" fill="#1e1b4b" />
      <circle cx="64.5" cy="32" r="1.6" fill="#1e1b4b" />
      <path
        d="M55 37 Q60 41 65 37"
        fill="none"
        stroke="#9f1239"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="52" cy="36" r="2.2" fill="#fda4af" opacity="0.8" />
      <circle cx="68" cy="36" r="2.2" fill="#fda4af" opacity="0.8" />
    </g>
  </svg>
);

const RingFloor = () => (
  <svg
    viewBox="0 0 400 40"
    className="number-pyramid-floor"
    aria-hidden="true"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id="number-pyramid-ring" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fcd34d" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <ellipse
      cx="200"
      cy="18"
      rx="198"
      ry="16"
      fill="url(#number-pyramid-ring)"
    />
    <ellipse cx="200" cy="15" rx="184" ry="11" fill="#7f1d1d" />
    <ellipse cx="200" cy="13" rx="176" ry="8" fill="#b91c1c" />
  </svg>
);

const listBlanks = (values: KnownValues) =>
  values.flatMap((value, index) => (value === undefined ? [index] : []));

export const NumberPyramidBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [pyramid] = useState(() =>
    buildNumberPyramid(numberPyramidPlans[yearGroup], random),
  );
  const { rows, unitsPerWhole, bricks } = pyramid;
  const [values, setValues] = useState<KnownValues>(() =>
    bricks.map(({ value, isGiven }) => (isGiven ? value : undefined)),
  );
  const [selected, setSelected] = useState(
    () => findEasiestBlank(rows, values)?.index ?? 0,
  );
  const [draft, setDraft] = useState("");
  const [wrongCounts, setWrongCounts] = useState<readonly number[]>(() =>
    bricks.map(() => 0),
  );
  const [wrongShake, setWrongShake] = useState<{
    index: number;
    odd: boolean;
  }>();
  const [hinted, setHinted] = useState<number>();
  const [lastPlaced, setLastPlaced] = useState<number>();
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const blankCount = bricks.filter(({ isGiven }) => !isGiven).length;
  const leftToFill = listBlanks(values).length;
  const isSolved = leftToFill === 0;
  const isSelectedBlank = values[selected] === undefined;
  const longestEntry = findLongestEntry(pyramid);
  const show = (units: number) => formatPyramidNumber(units, unitsPerWhole);

  const selectBrick = (index: number) => {
    setSelected(index);
    setDraft("");
    setWrongShake(undefined);
    if (values[index] !== undefined && !isSolved) {
      setFeedback({ kind: "given" });
    } else if (feedback.kind === "given" || feedback.kind === "no-entry") {
      setFeedback({ kind: "none" });
    }
  };

  const typeKey = (key: string) => {
    if (!isSelectedBlank || isSolved) {
      return;
    }
    setWrongShake(undefined);
    if (key === "." && (unitsPerWhole === 1 || draft.includes("."))) {
      return;
    }
    if (draft.replace(".", "").length >= longestEntry) {
      return;
    }
    setDraft(draft + key);
  };

  const eraseKey = () => {
    setDraft(draft.slice(0, -1));
  };

  const checkEntry = () => {
    if (!isSelectedBlank || isSolved) {
      return;
    }
    const answer = parsePyramidNumber(draft, unitsPerWhole);
    if (answer === undefined) {
      setFeedback({ kind: "no-entry" });
      return;
    }
    setDraft("");
    if (answer !== bricks[selected].value) {
      setWrongCounts((counts) =>
        counts.map((count, index) => (index === selected ? count + 1 : count)),
      );
      setWrongShake({ index: selected, odd: !(wrongShake?.odd ?? false) });
      setFeedback({ kind: "wrong", shown: show(answer) });
      return;
    }
    const nowValues = values.map((value, index) =>
      index === selected ? answer : value,
    );
    setValues(nowValues);
    setLastPlaced(selected);
    setHinted(undefined);
    setWrongShake(undefined);
    const stillToFill = listBlanks(nowValues).length;
    setFeedback({ kind: "right", shown: show(answer), left: stillToFill });
    onStepAnswered(wrongCounts[selected]);
    if (stillToFill === 0) {
      onSolved();
      return;
    }
    setSelected(
      findEasiestBlank(rows, nowValues)?.index ?? nowValues.indexOf(undefined),
    );
  };

  const showHint = () => {
    if (isSolved) {
      return;
    }
    const ownWorking = isSelectedBlank
      ? findWorking(rows, values, selected)
      : undefined;
    const easiest = findEasiestBlank(rows, values);
    const target =
      ownWorking === undefined
        ? easiest
        : { index: selected, working: ownWorking };
    if (target === undefined) {
      return;
    }
    if (target.index !== selected) {
      setSelected(target.index);
      setDraft("");
    }
    setHinted(target.index);
    setWrongShake(undefined);
    setWrongCounts((counts) =>
      counts.map((count, index) =>
        index === target.index ? count + 1 : count,
      ),
    );
    setFeedback({
      kind: "hint",
      working: describeWorking(target.working, unitsPerWhole),
      isMoved: target.index !== selected,
    });
  };

  const handleKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const isOnBrick =
      event.target instanceof HTMLElement &&
      event.target.dataset.numberPyramidBrick !== undefined;
    if (/^\d$/.test(event.key) || event.key === ".") {
      event.preventDefault();
      typeKey(event.key);
      return;
    }
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      eraseKey();
      return;
    }
    if (event.key === "Enter" && isOnBrick && draft !== "") {
      event.preventDefault();
      checkEntry();
      return;
    }
    const step = arrowSteps[event.key];
    if (step === undefined || !isOnBrick) {
      return;
    }
    event.preventDefault();
    const brick = bricks[selected];
    const row = Math.min(rows - 1, Math.max(0, brick.row + step[0]));
    const rowLength = rows - row;
    const position = Math.min(
      rowLength - 1,
      Math.max(
        0,
        step[0] === 1
          ? brick.position - (brick.position === rowLength ? 1 : 0)
          : brick.position + step[1],
      ),
    );
    const next = findBrickIndex(rows, row, position) ?? selected;
    selectBrick(next);
    document
      .querySelector<HTMLElement>(
        `[data-number-pyramid-brick="${String(next)}"]`,
      )
      ?.focus();
  };

  const rowsTopFirst = Array.from(
    { length: rows },
    (_, offset) => rows - 1 - offset,
  );

  return (
    <div className="puzzle-play-area" onKeyDown={handleKeys}>
      <div className="puzzle-board-card number-pyramid-card">
        <div
          className={`number-pyramid${isSolved ? " solved" : ""}`}
          role="group"
          aria-label={`Number pyramid, ${String(rows)} rows`}
          style={{ "--number-pyramid-rows": rows }}
        >
          <Acrobat isCheering={isSolved} />
          {rowsTopFirst.map((row) => (
            <div
              key={row}
              className="number-pyramid-row"
              style={{ "--number-pyramid-row": rows - 1 - row }}
            >
              {bricks.map((brick, index) => {
                if (brick.row !== row) {
                  return null;
                }
                const value = values[index];
                const shown = value === undefined ? undefined : show(value);
                const isSelected = index === selected;
                const typed = isSelected && value === undefined ? draft : "";
                const text = shown ?? typed;
                return (
                  <button
                    key={index}
                    type="button"
                    className={[
                      "number-pyramid-brick",
                      brick.isGiven ? "given" : "blank",
                      !brick.isGiven && value !== undefined ? "placed" : "",
                      lastPlaced === index ? "just-placed" : "",
                      row === rows - 1 ? "top" : "",
                      isSelected && !isSolved ? "selected" : "",
                      hinted === index && value === undefined ? "hinted" : "",
                      wrongShake?.index === index
                        ? `wrong ${wrongShake.odd ? "wrong-odd" : "wrong-even"}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-number-pyramid-brick={index}
                    data-row={row}
                    tabIndex={isSelected ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-label={describeBrick(brick, rows, shown, typed)}
                    style={{
                      "--number-pyramid-chars": Math.max(3, text.length),
                    }}
                    onClick={() => {
                      selectBrick(index);
                    }}
                  >
                    <span className="number-pyramid-label">
                      {text === "" && !(isSelected && !isSolved) ? (
                        <span className="number-pyramid-question">?</span>
                      ) : (
                        text
                      )}
                      {isSelected && value === undefined && !isSolved ? (
                        <span className="number-pyramid-caret" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          <RingFloor />
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Type a number">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{blankCount - leftToFill}</strong> of {blankCount} bricks
          built
        </p>
        <div className="number-pyramid-progress" aria-hidden="true">
          <span
            style={{
              width: `${String(((blankCount - leftToFill) / blankCount) * 100)}%`,
            }}
          />
        </div>
        <p className="number-pyramid-entry" aria-hidden="true">
          {isSelectedBlank && !isSolved ? draft || "…" : ""}
        </p>
        <div
          className={`number-pyramid-pad${unitsPerWhole === 100 ? " has-point" : ""}`}
          role="group"
          aria-label="Number keys"
        >
          {padKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={`number-pyramid-key key-${key}`}
              disabled={!isSelectedBlank || isSolved}
              onClick={() => {
                typeKey(key);
              }}
            >
              {key}
            </button>
          ))}
          {unitsPerWhole === 100 ? (
            <button
              type="button"
              className="number-pyramid-key key-point"
              aria-label="Decimal point"
              disabled={!isSelectedBlank || isSolved}
              onClick={() => {
                typeKey(".");
              }}
            >
              .
            </button>
          ) : null}
          <button
            type="button"
            className={`number-pyramid-key key-0${unitsPerWhole === 100 ? "" : " wide"}`}
            disabled={!isSelectedBlank || isSolved}
            onClick={() => {
              typeKey("0");
            }}
          >
            0
          </button>
          <button
            type="button"
            className="number-pyramid-key erase"
            aria-label="Rub out"
            disabled={!isSelectedBlank || isSolved || draft === ""}
            onClick={eraseKey}
          >
            <BackspaceIcon />
          </button>
        </div>
        <button
          type="button"
          className="number-pyramid-check"
          disabled={!isSelectedBlank || isSolved || draft === ""}
          onClick={checkEntry}
        >
          <CheckIcon />
          Check
        </button>
        <div className="puzzle-tools number-pyramid-tools">
          <button type="button" disabled={isSolved} onClick={showHint}>
            <BulbIcon />
            Hint
          </button>
        </div>
        <p className="puzzle-tip">
          You can type on a keyboard too: numbers, Backspace and Enter, with the
          arrow keys to move between bricks.
        </p>
      </aside>
    </div>
  );
};
