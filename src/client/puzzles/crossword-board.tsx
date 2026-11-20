import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  spellingSkillByYear,
  spellingWordLists,
} from "../../curriculum/spelling-words.js";
import {
  buildCrossword,
  crosswordWordCounts,
  listEntryCells,
  type CrosswordEntry,
} from "./crossword.js";
import { ReadAloudButton, ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

const toKey = (row: number, column: number) =>
  `${String(row)},${String(column)}`;

const listEntryKeys = (entry: CrosswordEntry): string[] =>
  listEntryCells(entry).map(({ row, column }) => toKey(row, column));

const describeEntry = ({ number, direction }: CrosswordEntry) =>
  `${String(number)} ${direction === "across" ? "Across" : "Down"}`;

type Feedback =
  | { kind: "none" }
  | { kind: "right"; entry: CrosswordEntry; left: number }
  | { kind: "wrong"; entry: CrosswordEntry };

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Tap a square or a clue, then type the word.";
    case "right":
      return feedback.left === 0
        ? "Every word is spelled right. Crossword complete!"
        : `${describeEntry(feedback.entry)} is right! ${String(feedback.left)} to go.`;
    case "wrong":
      return `${describeEntry(feedback.entry)} isn't spelled right yet. The wrong letters have gone, so try again.`;
  }
};

export const CrosswordBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [crossword] = useState(() =>
    buildCrossword(
      spellingWordLists[spellingSkillByYear[yearGroup]],
      crosswordWordCounts[yearGroup],
      random,
    ),
  );
  const { rows, columns, entries } = crossword;
  const answerLetters = new Map(
    entries.flatMap((entry) =>
      listEntryKeys(entry).map((key, position) => [
        key,
        entry.answer[position],
      ]),
    ),
  );
  const cellNumbers = new Map(
    entries.map((entry) => [toKey(entry.row, entry.column), entry.number]),
  );
  const [letters, setLetters] = useState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [solved, setSolved] = useState<readonly number[]>([]);
  const [wrongCounts, setWrongCounts] = useState<number[]>(() =>
    entries.map(() => 0),
  );
  const [wrongEntry, setWrongEntry] = useState<number>();
  const [activeEntry, setActiveEntry] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const wasCellFocused = useRef(false);
  const tappedClueEntry = useRef<number | undefined>(undefined);
  const lockedKeys = new Set(
    solved.flatMap((entryIndex) => listEntryKeys(entries[entryIndex])),
  );
  const activeKeys = listEntryKeys(entries[activeEntry]);

  const focusCell = (key: string) => {
    document
      .querySelector<HTMLInputElement>(`[data-crossword-cell="${key}"]`)
      ?.focus();
  };

  const checkEntries = (
    nowLetters: ReadonlyMap<string, string>,
    key: string,
  ) => {
    let nowSolved = [...solved];
    let nowLetterMap = new Map(nowLetters);
    const nowWrongCounts = [...wrongCounts];
    entries.forEach((entry, entryIndex) => {
      const keys = listEntryKeys(entry);
      if (!keys.includes(key) || nowSolved.includes(entryIndex)) {
        return;
      }
      const written = keys.map((cellKey) => nowLetterMap.get(cellKey) ?? "");
      if (written.some((letter) => letter === "")) {
        return;
      }
      if (written.join("") === entry.answer) {
        nowSolved = [...nowSolved, entryIndex];
        onStepAnswered(nowWrongCounts[entryIndex]);
        setFeedback({
          kind: "right",
          entry,
          left: entries.length - nowSolved.length,
        });
        return;
      }
      nowWrongCounts[entryIndex] += 1;
      setWrongEntry(entryIndex);
      setFeedback({ kind: "wrong", entry });
      nowLetterMap = new Map(
        [...nowLetterMap].filter(
          ([cellKey, letter]) =>
            !keys.includes(cellKey) || answerLetters.get(cellKey) === letter,
        ),
      );
    });
    setLetters(nowLetterMap);
    setSolved(nowSolved);
    setWrongCounts(nowWrongCounts);
    if (nowSolved.length === entries.length && solved.length < entries.length) {
      onSolved();
    }
    return nowSolved;
  };

  const writeLetter = (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const letter = event.target.value.slice(-1).toUpperCase();
    if (!/^[A-Z]$/.test(letter) || lockedKeys.has(key)) {
      return;
    }
    setWrongEntry(undefined);
    const nowLetters = new Map(letters).set(key, letter);
    const nowSolved = checkEntries(nowLetters, key);
    const position = activeKeys.indexOf(key);
    const nextKey = activeKeys
      .slice(position + 1)
      .find(
        (cellKey) =>
          !nowLetters.has(cellKey) &&
          !nowSolved.some((entryIndex) =>
            listEntryKeys(entries[entryIndex]).includes(cellKey),
          ),
      );
    if (nextKey !== undefined) {
      focusCell(nextKey);
    }
  };

  const eraseLetter = (
    key: string,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Backspace" || lockedKeys.has(key)) {
      return;
    }
    event.preventDefault();
    if (letters.has(key)) {
      const nowLetters = new Map(letters);
      nowLetters.delete(key);
      setLetters(nowLetters);
      return;
    }
    const previousKey = activeKeys
      .slice(0, Math.max(0, activeKeys.indexOf(key)))
      .findLast((cellKey) => !lockedKeys.has(cellKey));
    if (previousKey !== undefined) {
      const nowLetters = new Map(letters);
      nowLetters.delete(previousKey);
      setLetters(nowLetters);
      focusCell(previousKey);
    }
  };

  const listContainingEntries = (key: string) =>
    entries.flatMap((entry, entryIndex) =>
      listEntryKeys(entry).includes(key) ? [entryIndex] : [],
    );

  const followFocusedCell = (key: string) => {
    if (tappedClueEntry.current !== undefined) {
      tappedClueEntry.current = undefined;
      return;
    }
    if (activeKeys.includes(key)) {
      return;
    }
    const containing = listContainingEntries(key);
    setActiveEntry(
      containing.find(
        (entryIndex) =>
          entries[entryIndex].direction === entries[activeEntry].direction,
      ) ?? containing[0],
    );
  };

  const turnAtCell = (key: string) => {
    const otherEntry = listContainingEntries(key).find(
      (entryIndex) => entryIndex !== activeEntry,
    );
    if (otherEntry !== undefined) {
      setActiveEntry(otherEntry);
    }
  };

  const chooseClue = (entryIndex: number) => {
    setActiveEntry(entryIndex);
    tappedClueEntry.current = entryIndex;
    const keys = listEntryKeys(entries[entryIndex]);
    focusCell(keys.find((key) => !letters.has(key)) ?? keys[0]);
    tappedClueEntry.current = undefined;
  };

  const renderClues = (direction: CrosswordEntry["direction"]) => (
    <div className="clue-group">
      <h2>{direction === "across" ? "Across" : "Down"}</h2>
      <ol>
        {entries.map((entry, entryIndex) =>
          entry.direction === direction ? (
            <li key={entryIndex}>
              <button
                type="button"
                className={[
                  "clue",
                  entryIndex === activeEntry ? "active" : "",
                  solved.includes(entryIndex) ? "solved" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={entryIndex === activeEntry ? "true" : undefined}
                onClick={() => {
                  chooseClue(entryIndex);
                }}
              >
                <span className="clue-number">{entry.number}</span>
                <span>
                  {entry.clue}{" "}
                  <span className="clue-length">({entry.answer.length})</span>
                </span>
              </button>
            </li>
          ) : null,
        )}
      </ol>
    </div>
  );

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card">
        <div className="active-clue-row">
          <p className="active-clue">
            <strong>{describeEntry(entries[activeEntry])}</strong>{" "}
            {entries[activeEntry].clue}
          </p>
          <ReadAloudButton
            text={`${describeEntry(entries[activeEntry])}. ${entries[activeEntry].clue}`}
          />
        </div>
        <div
          className="crossword-grid"
          role="grid"
          aria-label="Crossword"
          style={{ "--grid-rows": rows, "--grid-columns": columns }}
        >
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} role="row" className="crossword-row">
              {Array.from({ length: columns }, (_, column) => {
                const key = toKey(row, column);
                if (!answerLetters.has(key)) {
                  return (
                    <span
                      key={column}
                      role="gridcell"
                      className="crossword-block"
                      aria-hidden="true"
                    />
                  );
                }
                const cellNumber = cellNumbers.get(key);
                const isWrong =
                  wrongEntry !== undefined &&
                  listEntryKeys(entries[wrongEntry]).includes(key);
                return (
                  <span
                    key={column}
                    role="gridcell"
                    className={[
                      "crossword-cell",
                      activeKeys.includes(key) ? "active" : "",
                      lockedKeys.has(key) ? "solved" : "",
                      isWrong ? "wrong" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cellNumber === undefined ? null : (
                      <span className="crossword-number" aria-hidden="true">
                        {cellNumber}
                      </span>
                    )}
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={2}
                      data-crossword-cell={key}
                      aria-label={`Row ${String(row + 1)}, column ${String(column + 1)}${cellNumber === undefined ? "" : `, clue ${String(cellNumber)}`}`}
                      value={letters.get(key) ?? ""}
                      readOnly={lockedKeys.has(key)}
                      onFocus={() => {
                        followFocusedCell(key);
                      }}
                      onPointerDown={(event) => {
                        wasCellFocused.current =
                          document.activeElement === event.currentTarget;
                      }}
                      onClick={() => {
                        if (wasCellFocused.current) {
                          turnAtCell(key);
                        }
                      }}
                      onChange={(event) => {
                        writeLetter(key, event);
                      }}
                      onKeyDown={(event) => {
                        eraseLetter(key, event);
                      }}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Clues">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{solved.length}</strong> of {entries.length} words spelled
        </p>
        {renderClues("across")}
        {renderClues("down")}
      </aside>
    </div>
  );
};
