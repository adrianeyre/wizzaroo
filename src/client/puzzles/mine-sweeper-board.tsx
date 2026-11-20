import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  buildNumberFact,
  numberFactSkillByYear,
} from "../../curriculum/number-facts.js";
import {
  buildMineField,
  digFrom,
  isMineFieldCleared,
  mineFieldPlans,
  type MineField,
} from "./mine-sweeper.js";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type DigMode = "dig" | "flag";

type Feedback =
  | { kind: "none" }
  | { kind: "safe" }
  | { kind: "mine" }
  | { kind: "flagged-open" }
  | { kind: "cleared" };

const feedbackTexts: Record<Feedback["kind"], string> = {
  none: "Dig any square to start. Your first dig is always safe.",
  safe: "Safe! Work out each sum to see how many mines are next to it.",
  mine: "Oops, a mine! It's made safe now, but check the sums around it.",
  "flagged-open": "That square is already dug.",
  cleared: "Every safe square is dug. You cleared the field!",
};

const arrowSteps: Record<string, [number, number] | undefined> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const FlagIcon = () => (
  <svg viewBox="0 0 24 24" className="mine-icon" aria-hidden="true">
    <path
      d="M6 21V4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M6 4h11l-3 4 3 4H6z" fill="#ef4444" />
  </svg>
);

const MineIcon = () => (
  <svg viewBox="0 0 24 24" className="mine-icon" aria-hidden="true">
    <path
      d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="6" fill="currentColor" />
    <circle cx="10" cy="10" r="1.6" fill="#ffffff" />
  </svg>
);

const ShovelIcon = () => (
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
    <path d="M2 22l8-8" />
    <path d="M14.5 4.5l5 5-4 4a3.5 3.5 0 0 1-5 0 3.5 3.5 0 0 1 0-5z" />
  </svg>
);

const FlagOutlineIcon = () => (
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
    <path d="M4 22V4" />
    <path d="M4 4h12l-3 4 3 4H4" />
  </svg>
);

const buildClueFacts = (
  field: MineField,
  buildFact: (answer: number) => string,
): string[] =>
  field.clues.map((clue, index) =>
    field.mines[index] || clue === 0 ? "" : buildFact(clue),
  );

export const MineSweeperBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const plan = mineFieldPlans[yearGroup];
  const cellCount = plan.rows * plan.columns;
  const [field, setField] = useState<MineField>();
  const [clueFacts, setClueFacts] = useState<string[]>([]);
  const [opened, setOpened] = useState<ReadonlySet<number>>(new Set());
  const [flagged, setFlagged] = useState<ReadonlySet<number>>(new Set());
  const [dugMines, setDugMines] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<DigMode>("dig");
  const [focused, setFocused] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const isCleared = field !== undefined && isMineFieldCleared(field, opened);

  const finishIfCleared = (
    nowField: MineField,
    nowOpened: ReadonlySet<number>,
    nowDugMines: ReadonlySet<number>,
  ) => {
    if (!isMineFieldCleared(nowField, nowOpened)) {
      return;
    }
    nowField.mines.forEach((isMine, index) => {
      if (isMine && !nowDugMines.has(index)) {
        onStepAnswered(0);
      }
    });
    setFlagged(
      new Set(
        nowField.mines.flatMap((isMine, index) =>
          isMine && !nowDugMines.has(index) ? [index] : [],
        ),
      ),
    );
    setFeedback({ kind: "cleared" });
    onSolved();
  };

  const dig = (index: number) => {
    if (flagged.has(index) || isCleared) {
      return;
    }
    if (opened.has(index)) {
      setFeedback({ kind: "flagged-open" });
      return;
    }
    const nowField = field ?? buildMineField(plan, index, random);
    if (field === undefined) {
      setField(nowField);
      setClueFacts(
        buildClueFacts(nowField, (answer) =>
          buildNumberFact(numberFactSkillByYear[yearGroup], answer, random),
        ),
      );
    }
    const nowOpened = digFrom(nowField, opened, flagged, index);
    setOpened(nowOpened);
    let nowDugMines = dugMines;
    if (nowField.mines[index]) {
      nowDugMines = new Set([...dugMines, index]);
      setDugMines(nowDugMines);
      setFeedback({ kind: "mine" });
      onStepAnswered(1);
    } else {
      setFeedback({ kind: "safe" });
    }
    finishIfCleared(nowField, nowOpened, nowDugMines);
  };

  const toggleFlag = (index: number) => {
    if (opened.has(index) || isCleared) {
      return;
    }
    const nowFlagged = new Set(flagged);
    if (nowFlagged.has(index)) {
      nowFlagged.delete(index);
    } else {
      nowFlagged.add(index);
    }
    setFlagged(nowFlagged);
  };

  const tapCell = (index: number) => {
    setFocused(index);
    if (mode === "flag") {
      toggleFlag(index);
      return;
    }
    dig(index);
  };

  const moveFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "f" || event.key === "F") {
      event.preventDefault();
      toggleFlag(focused);
      return;
    }
    const step = arrowSteps[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const row = Math.min(
      plan.rows - 1,
      Math.max(0, Math.floor(focused / plan.columns) + step[0]),
    );
    const column = Math.min(
      plan.columns - 1,
      Math.max(0, (focused % plan.columns) + step[1]),
    );
    const next = row * plan.columns + column;
    setFocused(next);
    document
      .querySelector<HTMLElement>(`[data-mine-cell="${String(next)}"]`)
      ?.focus();
  };

  const describeCell = (index: number): string => {
    const place = `row ${String(Math.floor(index / plan.columns) + 1)}, column ${String((index % plan.columns) + 1)}`;
    if (dugMines.has(index)) {
      return `Mine, ${place}`;
    }
    if (flagged.has(index)) {
      return `Flagged, ${place}`;
    }
    if (!opened.has(index) || field === undefined) {
      return `Not dug, ${place}`;
    }
    return field.clues[index] === 0
      ? `Clear, ${place}`
      : `${clueFacts[index]}, ${place}`;
  };

  const minesLeft = plan.mineCount - flagged.size - dugMines.size;

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card">
        <div
          className="mine-grid"
          role="grid"
          aria-label={`Mine field, ${String(plan.rows)} rows by ${String(plan.columns)} columns`}
          style={{ "--grid-rows": plan.rows, "--grid-columns": plan.columns }}
          onKeyDown={moveFocus}
        >
          {Array.from({ length: plan.rows }, (_, row) => (
            <div key={row} role="row" className="mine-row">
              {Array.from({ length: plan.columns }, (_, column) => {
                const index = row * plan.columns + column;
                const isOpen = opened.has(index);
                const isDugMine = dugMines.has(index);
                const clue = field?.clues[index] ?? 0;
                const classNames = [
                  "mine-cell",
                  isOpen ? "open" : "",
                  isDugMine ? "dug-mine" : "",
                  isOpen && !isDugMine && clue > 0
                    ? `clue-${String(clue)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={column}
                    type="button"
                    role="gridcell"
                    className={classNames}
                    data-mine-cell={index}
                    tabIndex={index === focused ? 0 : -1}
                    aria-label={describeCell(index)}
                    onClick={() => {
                      tapCell(index);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setFocused(index);
                      toggleFlag(index);
                    }}
                  >
                    {isDugMine ? <MineIcon /> : null}
                    {!isOpen && flagged.has(index) ? <FlagIcon /> : null}
                    {isOpen && !isDugMine && clue > 0 ? (
                      <span className="mine-fact">{clueFacts[index]}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Mine sweeper tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {feedbackTexts[feedback.kind]}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{Math.max(0, minesLeft)}</strong> of {plan.mineCount} mines
          left to find
        </p>
        <div className="dig-mode" role="group" aria-label="What a tap does">
          <button
            type="button"
            aria-pressed={mode === "dig"}
            onClick={() => {
              setMode("dig");
            }}
          >
            <ShovelIcon />
            Dig
          </button>
          <button
            type="button"
            aria-pressed={mode === "flag"}
            onClick={() => {
              setMode("flag");
            }}
          >
            <FlagOutlineIcon />
            Flag
          </button>
        </div>
        <p className="puzzle-tip">
          Tip: right-click, or press F, to flag a square.{" "}
          {cellCount - plan.mineCount} squares are safe.
        </p>
      </aside>
    </div>
  );
};
