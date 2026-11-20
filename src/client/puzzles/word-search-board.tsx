import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  spellingSkillByYear,
  spellingWordLists,
} from "../../curriculum/spelling-words.js";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";
import { isSameCell, type GridCell } from "./shuffle.js";
import {
  buildStraightLine,
  buildWordSearch,
  findWordOnLine,
  wordSearchPlans,
  type PlacedWord,
} from "./word-search.js";

export const foundWordColours = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#a855f7",
  "#eab308",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
];

type Feedback =
  | { kind: "none" }
  | { kind: "found"; word: string }
  | { kind: "again"; word: string }
  | { kind: "wrong" }
  | { kind: "not-straight" };

const describeFeedback = (feedback: Feedback, wordsLeft: number): string => {
  switch (feedback.kind) {
    case "none":
      return "Tap or drag across a hidden word.";
    case "found":
      return wordsLeft === 0
        ? `You found ${feedback.word}! That's every word.`
        : `You found ${feedback.word}! ${String(wordsLeft)} to go.`;
    case "again":
      return `You've already found ${feedback.word}.`;
    case "wrong":
      return "That's not one of the words. Keep looking!";
    case "not-straight":
      return "Words go in straight lines: across, down or corner to corner.";
  }
};

const readCellFromPoint = (clientX: number, clientY: number) => {
  const element = document.elementFromPoint(clientX, clientY);
  const cell = element?.closest<HTMLElement>("[data-row]");
  if (cell === null || cell === undefined) {
    return undefined;
  }
  return { row: Number(cell.dataset.row), column: Number(cell.dataset.column) };
};

const arrowSteps: Record<string, GridCell | undefined> = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

const LineMark = ({
  cells,
  colour,
  className,
}: {
  cells: readonly GridCell[];
  colour: string;
  className: string;
}) => {
  const first = cells[0];
  const last = cells[cells.length - 1];
  return (
    <line
      className={className}
      x1={first.column + 0.5}
      y1={first.row + 0.5}
      x2={last.column + 0.5}
      y2={last.row + 0.5}
      stroke={colour}
    />
  );
};

export const WordSearchBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [wordSearch] = useState(() =>
    buildWordSearch(
      spellingWordLists[spellingSkillByYear[yearGroup]].map(({ word }) => word),
      wordSearchPlans[yearGroup],
      random,
    ),
  );
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [wrongSinceLastWord, setWrongSinceLastWord] = useState(0);
  const [anchor, setAnchor] = useState<GridCell>();
  const [reach, setReach] = useState<GridCell>();
  const [isDragging, setIsDragging] = useState(false);
  const [focusedCell, setFocusedCell] = useState<GridCell>({
    row: 0,
    column: 0,
  });
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const [shakeCount, setShakeCount] = useState(0);
  const { size, letters, words } = wordSearch;

  const colourOf = (placedWord: PlacedWord) =>
    foundWordColours[words.indexOf(placedWord) % foundWordColours.length];

  const checkLine = (start: GridCell, end: GridCell) => {
    setAnchor(undefined);
    setReach(undefined);
    const line = buildStraightLine(start, end);
    if (line === undefined) {
      setFeedback({ kind: "not-straight" });
      return;
    }
    const placedWord = findWordOnLine(wordSearch, line);
    if (placedWord === undefined) {
      setWrongSinceLastWord((count) => count + 1);
      setFeedback({ kind: "wrong" });
      setShakeCount((count) => count + 1);
      return;
    }
    if (foundWords.includes(placedWord.word)) {
      setFeedback({ kind: "again", word: placedWord.word });
      return;
    }
    const nowFound = [...foundWords, placedWord.word];
    setFoundWords(nowFound);
    setFeedback({ kind: "found", word: placedWord.word });
    onStepAnswered(wrongSinceLastWord);
    setWrongSinceLastWord(0);
    if (nowFound.length === words.length) {
      onSolved();
    }
  };

  const chooseCell = (cell: GridCell) => {
    if (anchor === undefined) {
      setAnchor(cell);
      setReach(cell);
      return;
    }
    if (isSameCell(anchor, cell)) {
      setAnchor(undefined);
      setReach(undefined);
      return;
    }
    checkLine(anchor, cell);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const cell = readCellFromPoint(event.clientX, event.clientY);
    if (cell === undefined) {
      return;
    }
    event.preventDefault();
    setIsDragging(true);
    setFocusedCell(cell);
    if (anchor === undefined) {
      setAnchor(cell);
    }
    setReach(cell);
  };

  const followDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    const cell = readCellFromPoint(event.clientX, event.clientY);
    if (cell !== undefined) {
      setReach(cell);
    }
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
    const cell = readCellFromPoint(event.clientX, event.clientY) ?? reach;
    if (anchor === undefined || cell === undefined) {
      return;
    }
    if (!isSameCell(anchor, cell)) {
      checkLine(anchor, cell);
    }
  };

  const moveFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = arrowSteps[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = {
      row: Math.min(size - 1, Math.max(0, focusedCell.row + step.row)),
      column: Math.min(size - 1, Math.max(0, focusedCell.column + step.column)),
    };
    setFocusedCell(next);
    if (anchor !== undefined) {
      setReach(next);
    }
    document
      .querySelector<HTMLElement>(
        `[data-row="${String(next.row)}"][data-column="${String(next.column)}"]`,
      )
      ?.focus();
  };

  const selection =
    anchor === undefined || reach === undefined
      ? undefined
      : buildStraightLine(anchor, reach);
  const wordsLeft = words.length - foundWords.length;

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card">
        <div
          key={shakeCount}
          className={
            shakeCount > 0 && feedback.kind === "wrong"
              ? "word-grid shaking"
              : "word-grid"
          }
          role="grid"
          aria-label={`Word search, ${String(size)} by ${String(size)} letters`}
          style={{ "--grid-size": size }}
          onPointerDown={startDrag}
          onPointerMove={followDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => {
            setIsDragging(false);
          }}
          onKeyDown={moveFocus}
        >
          <svg
            className="word-grid-marks"
            viewBox={`0 0 ${String(size)} ${String(size)}`}
            aria-hidden="true"
          >
            {words
              .filter(({ word }) => foundWords.includes(word))
              .map((placedWord) => (
                <LineMark
                  key={placedWord.word}
                  className="found-mark"
                  cells={placedWord.cells}
                  colour={colourOf(placedWord)}
                />
              ))}
            {selection === undefined ? null : (
              <LineMark
                className="selection-mark"
                cells={selection}
                colour="#fbbf24"
              />
            )}
          </svg>
          {letters.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="word-grid-row">
              {row.map((letter, columnIndex) => {
                const cell = { row: rowIndex, column: columnIndex };
                const isAnchor =
                  anchor !== undefined && isSameCell(anchor, cell);
                return (
                  <button
                    key={columnIndex}
                    type="button"
                    role="gridcell"
                    className={isAnchor ? "word-cell anchor" : "word-cell"}
                    data-row={rowIndex}
                    data-column={columnIndex}
                    tabIndex={isSameCell(focusedCell, cell) ? 0 : -1}
                    aria-label={`${letter}, row ${String(rowIndex + 1)}, column ${String(columnIndex + 1)}`}
                    aria-pressed={isAnchor}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        chooseCell(cell);
                      }
                    }}
                    onFocus={() => {
                      setFocusedCell(cell);
                    }}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Words to find">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback, wordsLeft)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{foundWords.length}</strong> of {words.length} words found
        </p>
        <ul className="word-list">
          {words.map((placedWord) => {
            const isFound = foundWords.includes(placedWord.word);
            return (
              <li
                key={placedWord.word}
                className={isFound ? "found" : undefined}
                style={{ "--word-colour": colourOf(placedWord) }}
              >
                <span className="word-dot" aria-hidden="true" />
                {placedWord.word.toLowerCase()}
                {isFound ? (
                  <span className="visually-hidden">, found</span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
};
