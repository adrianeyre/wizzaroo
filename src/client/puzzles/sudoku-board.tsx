import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  buildNumberFact,
  numberFactSkillByYear,
} from "../../curriculum/number-facts.js";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";
import { buildSudoku, sudokuPlans, type Sudoku } from "./sudoku.js";

type Feedback =
  | { kind: "none" }
  | { kind: "right"; answer: number; leftToFill: number }
  | { kind: "wrong"; answer: number; fact: string | undefined };

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Pick an empty square, then choose its number.";
    case "right":
      return feedback.leftToFill === 0
        ? "Brilliant, the grid is complete!"
        : `Yes, ${String(feedback.answer)} fits! ${String(feedback.leftToFill)} squares to go.`;
    case "wrong":
      return feedback.fact === undefined
        ? `${String(feedback.answer)} doesn't fit there. Check its row, column and box.`
        : `Not quite. Work out ${feedback.fact} first.`;
  }
};

const arrowSteps: Record<string, [number, number] | undefined> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const isInSameBox = (
  first: number,
  second: number,
  { size, boxRows, boxColumns }: Sudoku,
) =>
  Math.floor(Math.floor(first / size) / boxRows) ===
    Math.floor(Math.floor(second / size) / boxRows) &&
  Math.floor((first % size) / boxColumns) ===
    Math.floor((second % size) / boxColumns);

const isPeerOf = (first: number, second: number, sudoku: Sudoku) =>
  Math.floor(first / sudoku.size) === Math.floor(second / sudoku.size) ||
  first % sudoku.size === second % sudoku.size ||
  isInSameBox(first, second, sudoku);

const describeCell = (
  index: number,
  sudoku: Sudoku,
  value: number | undefined,
): string => {
  const place = `row ${String(Math.floor(index / sudoku.size) + 1)}, column ${String((index % sudoku.size) + 1)}`;
  if (value !== undefined) {
    return `${String(value)}, ${place}`;
  }
  const fact = sudoku.cells[index].fact;
  return fact === undefined ? `Empty, ${place}` : `Empty, ${place}, ${fact}`;
};

export const SudokuBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [sudoku] = useState(() =>
    buildSudoku(
      sudokuPlans[yearGroup],
      (answer) =>
        buildNumberFact(numberFactSkillByYear[yearGroup], answer, random),
      random,
    ),
  );
  const { size, boxRows, boxColumns, cells } = sudoku;
  const [values, setValues] = useState<(number | undefined)[]>(() =>
    cells.map(({ solution, isGiven }) => (isGiven ? solution : undefined)),
  );
  const [selected, setSelected] = useState(() =>
    cells.findIndex(({ isGiven }) => !isGiven),
  );
  const [wrongCounts, setWrongCounts] = useState<number[]>(() =>
    cells.map(() => 0),
  );
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const [wrongCell, setWrongCell] = useState<number>();
  const blankCount = cells.filter(({ isGiven }) => !isGiven).length;
  const leftToFill = values.filter((value) => value === undefined).length;

  const placeNumber = (answer: number) => {
    if (selected < 0 || values[selected] !== undefined) {
      return;
    }
    const cell = cells[selected];
    if (answer !== cell.solution) {
      setWrongCounts((counts) =>
        counts.map((count, index) => (index === selected ? count + 1 : count)),
      );
      setWrongCell(selected);
      setFeedback({ kind: "wrong", answer, fact: cell.fact });
      return;
    }
    const nowValues = values.map((value, index) =>
      index === selected ? answer : value,
    );
    setValues(nowValues);
    setWrongCell(undefined);
    const stillToFill = nowValues.filter((value) => value === undefined).length;
    setFeedback({ kind: "right", answer, leftToFill: stillToFill });
    onStepAnswered(wrongCounts[selected]);
    if (stillToFill === 0) {
      onSolved();
      return;
    }
    const nextBlank = nowValues.findIndex(
      (value, index) => value === undefined && index > selected,
    );
    setSelected(nextBlank === -1 ? nowValues.indexOf(undefined) : nextBlank);
  };

  const moveSelection = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= size) {
      event.preventDefault();
      placeNumber(digit);
      return;
    }
    const step = arrowSteps[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const row = Math.min(
      size - 1,
      Math.max(0, Math.floor(selected / size) + step[0]),
    );
    const column = Math.min(size - 1, Math.max(0, (selected % size) + step[1]));
    const next = row * size + column;
    setSelected(next);
    document
      .querySelector<HTMLElement>(`[data-sudoku-cell="${String(next)}"]`)
      ?.focus();
  };

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card">
        <div
          className="sudoku-grid"
          role="grid"
          aria-label={`Sudoku, ${String(size)} by ${String(size)}`}
          style={{ "--grid-size": size }}
          onKeyDown={moveSelection}
        >
          {Array.from({ length: size }, (_, row) => (
            <div key={row} role="row" className="sudoku-row">
              {Array.from({ length: size }, (_, column) => {
                const index = row * size + column;
                const cell = cells[index];
                const value = values[index];
                const isSelected = index === selected;
                const classNames = [
                  "sudoku-cell",
                  cell.isGiven ? "given" : "",
                  !cell.isGiven && value !== undefined ? "solved" : "",
                  cell.fact !== undefined && value === undefined ? "fact" : "",
                  isSelected ? "selected" : "",
                  selected >= 0 &&
                  !isSelected &&
                  isPeerOf(index, selected, sudoku)
                    ? "peer"
                    : "",
                  value !== undefined &&
                  selected >= 0 &&
                  value === values[selected]
                    ? "same-number"
                    : "",
                  wrongCell === index ? "wrong" : "",
                  (column + 1) % boxColumns === 0 && column + 1 < size
                    ? "box-right"
                    : "",
                  (row + 1) % boxRows === 0 && row + 1 < size
                    ? "box-bottom"
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
                    data-sudoku-cell={index}
                    tabIndex={isSelected ? 0 : -1}
                    aria-selected={isSelected}
                    aria-label={describeCell(index, sudoku, value)}
                    onClick={() => {
                      setSelected(index);
                      setWrongCell(undefined);
                    }}
                  >
                    {value ?? <span className="sudoku-fact">{cell.fact}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Choose a number">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{blankCount - leftToFill}</strong> of {blankCount} squares
          filled
        </p>
        <div
          className={`number-pad number-pad-${String(size)}`}
          role="group"
          aria-label="Numbers"
        >
          {Array.from({ length: size }, (_, offset) => offset + 1).map(
            (answer) => (
              <button
                key={answer}
                type="button"
                className="number-pad-key"
                disabled={selected < 0 || values[selected] !== undefined}
                onClick={() => {
                  placeNumber(answer);
                }}
              >
                {answer}
              </button>
            ),
          )}
        </div>
      </aside>
    </div>
  );
};
