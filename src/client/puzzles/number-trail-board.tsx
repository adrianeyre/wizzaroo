import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import {
  buildNumberTrail,
  describeTrailDirection,
  describeTrailRule,
  formatTrailNumber,
  numberTrailKeys,
  parseTrailNumber,
} from "./number-trail.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type Feedback =
  | { kind: "none" }
  | { kind: "given"; value: number }
  | { kind: "filled"; value: number }
  | { kind: "nothing-typed" }
  | { kind: "right"; value: number; left: number }
  | { kind: "wrong"; typed: number }
  | { kind: "hint"; direction: string; previous: number }
  | { kind: "solved"; rule: string };

const capitalise = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Pick an empty square on the trail, then type its number.";
    case "given":
      return `The ringmaster already chalked ${formatTrailNumber(feedback.value)} here. Pick an empty square.`;
    case "filled":
      return `You've already filled this square with ${formatTrailNumber(feedback.value)}.`;
    case "nothing-typed":
      return "Type a number first, then press Check.";
    case "right":
      return `Yes, ${formatTrailNumber(feedback.value)}! The elephant stomps on. ${String(feedback.left)} ${feedback.left === 1 ? "square" : "squares"} to go.`;
    case "wrong":
      return `${formatTrailNumber(feedback.typed)} doesn't fit there. Look at the squares on either side and try again.`;
    case "hint":
      return `Hint: ${feedback.direction}. The square before this one is ${formatTrailNumber(feedback.previous)}.`;
    case "solved":
      return `The elephant reached the ring! ${feedback.rule}`;
  }
};

const arrowSteps: Record<string, [number, number] | undefined> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const longestEntry = 9;

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

const DeleteIcon = () => (
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
    <path d="m17 9-6 6" />
    <path d="m11 9 6 6" />
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
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const Elephant = () => (
  <svg
    viewBox="0 0 64 52"
    className="number-trail-elephant-art"
    aria-hidden="true"
  >
    <defs>
      <linearGradient
        id="number-trail-elephant-skin"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop offset="0" stopColor="#c4c9d8" />
        <stop offset="1" stopColor="#8b93ab" />
      </linearGradient>
    </defs>
    <ellipse cx="32" cy="50" rx="22" ry="2.5" fill="rgb(30 27 75 / 0.18)" />
    <rect x="12" y="34" width="7" height="15" rx="3" fill="#7d859e" />
    <rect x="34" y="34" width="7" height="15" rx="3" fill="#7d859e" />
    <path
      d="M8 28c-4 2-5 6-4 9"
      stroke="#7d859e"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse
      cx="26"
      cy="29"
      rx="19"
      ry="14"
      fill="url(#number-trail-elephant-skin)"
    />
    <rect
      x="18"
      y="34"
      width="7"
      height="15"
      rx="3"
      fill="url(#number-trail-elephant-skin)"
    />
    <rect
      x="40"
      y="33"
      width="7"
      height="16"
      rx="3"
      fill="url(#number-trail-elephant-skin)"
    />
    <path d="M14 18h24l-3 8H17Z" fill="#e11d48" />
    <path d="M14 18h24" stroke="#fbbf24" strokeWidth="2" />
    <circle cx="20" cy="22" r="1.4" fill="#fbbf24" />
    <circle cx="26" cy="22" r="1.4" fill="#fbbf24" />
    <circle cx="32" cy="22" r="1.4" fill="#fbbf24" />
    <circle cx="46" cy="22" r="12" fill="url(#number-trail-elephant-skin)" />
    <path
      d="M55 26c6 3 7 10 4 16-1 2 1 3 2 2"
      stroke="#a3aac0"
      strokeWidth="5.5"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M42 13c-8-2-12 4-10 11 1 5 6 6 9 3Z"
      fill="#9aa1b8"
      stroke="#7d859e"
      strokeWidth="1"
    />
    <path
      d="M38 17c-3 1-4 4-3 7"
      stroke="#f9a8d4"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="50" cy="19" r="2" fill="#1e1b4b" />
    <circle cx="50.7" cy="18.3" r="0.6" fill="#ffffff" />
    <path d="M44 9l4-7 4 7" fill="#fbbf24" />
    <circle cx="48" cy="2.5" r="2.2" fill="#e11d48" />
  </svg>
);

const RingTent = () => (
  <svg
    viewBox="0 0 24 24"
    className="number-trail-badge-art"
    aria-hidden="true"
  >
    <path d="M12 2v4" stroke="#1e1b4b" strokeWidth="1.5" />
    <path d="M12 2l5 2-5 2Z" fill="#e11d48" />
    <path
      d="M12 6 3 20h18Z"
      fill="#fff1d6"
      stroke="#1e1b4b"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path d="M12 6 7.5 20h3Z M12 6l1.5 14h3Z" fill="#e11d48" />
    <path d="M10.5 20 12 14l1.5 6Z" fill="#1e1b4b" />
  </svg>
);

const StartFlag = () => (
  <svg
    viewBox="0 0 24 24"
    className="number-trail-badge-art"
    aria-hidden="true"
  >
    <path d="M6 22V3" stroke="#1e1b4b" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M6 3h13l-3 4 3 4H6Z"
      fill="#16a34a"
      stroke="#14532d"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  </svg>
);

const describeLength = (text: string) =>
  text.length >= 7 ? "very-long" : text.length >= 5 ? "long" : "";

export const NumberTrailBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [trail] = useState(() => buildNumberTrail(yearGroup, random));
  const { rows, columns, path, values, blanks, sequence } = trail;
  const keys = numberTrailKeys[yearGroup];
  const [known, setKnown] = useState<boolean[]>(() =>
    path.map((_, index) => !blanks.includes(index)),
  );
  const [selected, setSelected] = useState(blanks[0]);
  const [typed, setTyped] = useState("");
  const [wrongCounts, setWrongCounts] = useState<number[]>(() =>
    path.map(() => 0),
  );
  const [shake, setShake] = useState<{ index: number; tick: number }>();
  const [justFilled, setJustFilled] = useState<number>();
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });

  const pathIndexAt = new Map(
    path.map(({ row, column }, index) => [row * columns + column, index]),
  );
  const leftToFill = known.filter((isKnown) => !isKnown).length;
  const isSolved = leftToFill === 0;
  const isSelectedOpen = !isSolved && !known[selected];
  const firstGap = known.indexOf(false);
  const elephantAt = firstGap === -1 ? path.length - 1 : firstGap - 1;

  useEffect(() => {
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      focused.dataset.numberTrailSquare !== undefined &&
      focused.dataset.numberTrailSquare !== String(selected)
    ) {
      document
        .querySelector<HTMLElement>(
          `[data-number-trail-square="${String(selected)}"]`,
        )
        ?.focus();
    }
  }, [selected]);

  const selectSquare = (index: number) => {
    if (index === selected) {
      return;
    }
    setSelected(index);
    setTyped("");
    setShake(undefined);
    if (isSolved) {
      return;
    }
    if (!blanks.includes(index)) {
      setFeedback({ kind: "given", value: values[index] });
    } else if (known[index]) {
      setFeedback({ kind: "filled", value: values[index] });
    } else {
      setFeedback({ kind: "none" });
    }
  };

  const typeKey = (key: string) => {
    if (!isSelectedOpen) {
      return;
    }
    setShake(undefined);
    setTyped((current) => {
      if (key === "-") {
        return current.startsWith("-") ? current.slice(1) : `-${current}`;
      }
      if (key === "." && current.includes(".")) {
        return current;
      }
      return current.length >= longestEntry ? current : `${current}${key}`;
    });
  };

  const deleteKey = () => {
    setShake(undefined);
    setTyped((current) => current.slice(0, -1));
  };

  const checkEntry = () => {
    if (!isSelectedOpen) {
      return;
    }
    const answer = parseTrailNumber(typed);
    if (answer === undefined) {
      setFeedback({ kind: "nothing-typed" });
      return;
    }
    if (answer !== values[selected]) {
      setWrongCounts((counts) =>
        counts.map((count, index) => (index === selected ? count + 1 : count)),
      );
      setShake((current) => ({
        index: selected,
        tick: (current?.tick ?? 0) + 1,
      }));
      setTyped("");
      setFeedback({ kind: "wrong", typed: answer });
      return;
    }
    const nowKnown = known.map(
      (isKnown, index) => isKnown || index === selected,
    );
    setKnown(nowKnown);
    setTyped("");
    setShake(undefined);
    setJustFilled(selected);
    onStepAnswered(wrongCounts[selected]);
    const stillToFill = nowKnown.filter((isKnown) => !isKnown).length;
    if (stillToFill === 0) {
      setFeedback({
        kind: "solved",
        rule: describeTrailRule(sequence, path.length),
      });
      onSolved();
      return;
    }
    setFeedback({ kind: "right", value: answer, left: stillToFill });
    const nextBlank =
      blanks.find((index) => index > selected && !nowKnown[index]) ??
      blanks.find((index) => !nowKnown[index]);
    if (nextBlank !== undefined) {
      setSelected(nextBlank);
    }
  };

  const showHint = () => {
    if (!isSelectedOpen) {
      return;
    }
    setWrongCounts((counts) =>
      counts.map((count, index) => (index === selected ? count + 1 : count)),
    );
    setFeedback({
      kind: "hint",
      direction: capitalise(describeTrailDirection(sequence)),
      previous: values[selected - 1],
    });
  };

  const focusSquare = (index: number) => {
    document
      .querySelector<HTMLElement>(
        `[data-number-trail-square="${String(index)}"]`,
      )
      ?.focus();
  };

  const handleGridKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = arrowSteps[event.key];
    if (step !== undefined) {
      event.preventDefault();
      let row = path[selected].row + step[0];
      let column = path[selected].column + step[1];
      while (row >= 0 && row < rows && column >= 0 && column < columns) {
        const next = pathIndexAt.get(row * columns + column);
        if (next !== undefined) {
          selectSquare(next);
          focusSquare(next);
          return;
        }
        row += step[0];
        column += step[1];
      }
      return;
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      typeKey(event.key);
    } else if (event.key === "-" && keys.hasMinus) {
      event.preventDefault();
      typeKey("-");
    } else if ((event.key === "." || event.key === ",") && keys.hasPoint) {
      event.preventDefault();
      typeKey(".");
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      deleteKey();
    } else if (event.key === "Enter" && isSelectedOpen) {
      event.preventDefault();
      checkEntry();
    }
  };

  const describeSquare = (index: number) => {
    const place = `Trail square ${String(index + 1)} of ${String(path.length)}`;
    const landmark =
      index === 0 ? ", start" : index === path.length - 1 ? ", the ring" : "";
    if (known[index]) {
      return `${place}${landmark}, ${formatTrailNumber(values[index])}`;
    }
    return index === selected && typed !== ""
      ? `${place}${landmark}, empty, you typed ${typed}`
      : `${place}${landmark}, empty`;
  };

  const segments = path.slice(1).map((cell, offset) => ({
    from: path[offset],
    to: cell,
    isWalked: offset < elephantAt,
  }));

  const padKeys = [7, 8, 9, 4, 5, 6, 1, 2, 3].map(String);

  return (
    <div className="puzzle-play-area">
      <div
        className={`puzzle-board-card number-trail-card${isSolved ? " solved" : ""}`}
      >
        <div
          className="number-trail-grid"
          role="group"
          aria-label={`Number trail of ${String(path.length)} squares`}
          style={{
            "--number-trail-rows": rows,
            "--number-trail-columns": columns,
          }}
          onKeyDown={handleGridKey}
        >
          <svg
            className="number-trail-line"
            viewBox={`0 0 ${String(columns)} ${String(rows)}`}
            aria-hidden="true"
          >
            {segments.map(({ from, to, isWalked }, offset) => {
              const x1 = from.column + 0.5;
              const y1 = from.row + 0.5;
              const x2 = to.column + 0.5;
              const y2 = to.row + 0.5;
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              return (
                <g key={offset} className={isWalked ? "walked" : ""}>
                  <line
                    className="number-trail-path"
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                  <path
                    className="number-trail-arrow"
                    d="M-0.07 -0.09 L0.07 0 L-0.07 0.09"
                    transform={`translate(${String((x1 + x2) / 2)} ${String((y1 + y2) / 2)}) rotate(${String(angle)})`}
                  />
                </g>
              );
            })}
          </svg>
          {Array.from({ length: rows * columns }, (_, square) => {
            const index = pathIndexAt.get(square);
            const row = Math.floor(square / columns);
            const column = square % columns;
            const gridPlace = {
              gridRow: row + 1,
              gridColumn: column + 1,
            };
            if (index === undefined) {
              return (
                <span
                  key={square}
                  className="number-trail-sawdust"
                  style={gridPlace}
                  aria-hidden="true"
                />
              );
            }
            const isGiven = !blanks.includes(index);
            const isKnown = known[index];
            const isSelected = index === selected;
            const shown = isKnown
              ? formatTrailNumber(values[index])
              : isSelected && typed !== ""
                ? typed.replace("-", "−")
                : "?";
            return (
              <button
                key={square}
                type="button"
                className={[
                  "number-trail-square",
                  isGiven ? "given" : isKnown ? "filled" : "open",
                  index === 0 ? "start" : "",
                  index === path.length - 1 ? "ring" : "",
                  isSelected && !isSolved ? "selected" : "",
                  justFilled === index ? "just-filled" : "",
                  shake?.index === index
                    ? `wrong wrong-${String(shake.tick % 2)}`
                    : "",
                  describeLength(shown),
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={gridPlace}
                data-number-trail-square={index}
                tabIndex={isSelected ? 0 : -1}
                aria-pressed={isSelected}
                aria-label={describeSquare(index)}
                onClick={() => {
                  selectSquare(index);
                }}
              >
                {index === 0 ? (
                  <span className="number-trail-badge">
                    <StartFlag />
                  </span>
                ) : null}
                {index === path.length - 1 ? (
                  <span className="number-trail-badge">
                    <RingTent />
                  </span>
                ) : null}
                <span className="number-trail-value">{shown}</span>
              </button>
            );
          })}
          <span
            className="number-trail-elephant"
            style={{
              "--number-trail-x": path[Math.max(0, elephantAt)].column,
              "--number-trail-y": path[Math.max(0, elephantAt)].row,
            }}
            aria-hidden="true"
          >
            <Elephant />
          </span>
          {isSolved ? (
            <span
              className="number-trail-sparkles"
              style={{
                "--number-trail-x": path[path.length - 1].column,
                "--number-trail-y": path[path.length - 1].row,
              }}
              aria-hidden="true"
            >
              {Array.from({ length: 8 }, (_, sparkle) => (
                <span key={sparkle} className="number-trail-sparkle" />
              ))}
            </span>
          ) : null}
        </div>
        {isSolved ? (
          <p className="number-trail-finale">
            <strong>Ta-da!</strong> {describeTrailRule(sequence, path.length)}
          </p>
        ) : null}
      </div>
      <aside className="puzzle-side-card" aria-label="Number trail tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{blanks.length - leftToFill}</strong> of {blanks.length}{" "}
          squares filled
        </p>
        <p className="number-trail-entry">
          <span className="number-trail-entry-label">
            Square {selected + 1}
          </span>
          <output className="number-trail-entry-value" aria-label="Your number">
            {isSelectedOpen
              ? typed.replace("-", "−") || "?"
              : formatTrailNumber(values[selected])}
          </output>
        </p>
        <div
          className={[
            "number-trail-pad",
            keys.hasMinus || keys.hasPoint ? "has-signs" : "",
          ]
            .filter((name) => name !== "")
            .join(" ")}
          role="group"
          aria-label="Number pad"
        >
          {padKeys.map((key) => (
            <button
              key={key}
              type="button"
              className={`number-trail-key key-${key}`}
              disabled={!isSelectedOpen}
              onClick={() => {
                typeKey(key);
              }}
            >
              {key}
            </button>
          ))}
          {keys.hasMinus ? (
            <button
              type="button"
              className="number-trail-key key-minus"
              aria-label="Minus"
              disabled={!isSelectedOpen}
              onClick={() => {
                typeKey("-");
              }}
            >
              −
            </button>
          ) : (
            <span
              className="number-trail-key-gap key-minus"
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            className="number-trail-key key-0"
            disabled={!isSelectedOpen}
            onClick={() => {
              typeKey("0");
            }}
          >
            0
          </button>
          {keys.hasPoint ? (
            <button
              type="button"
              className="number-trail-key key-point"
              aria-label="Decimal point"
              disabled={!isSelectedOpen}
              onClick={() => {
                typeKey(".");
              }}
            >
              .
            </button>
          ) : (
            <span
              className="number-trail-key-gap key-point"
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            className="number-trail-key delete"
            aria-label="Delete"
            disabled={!isSelectedOpen || typed === ""}
            onClick={deleteKey}
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            className="number-trail-key check"
            disabled={!isSelectedOpen}
            onClick={checkEntry}
          >
            <CheckIcon />
            Check
          </button>
        </div>
        <div className="puzzle-tools number-trail-tools">
          <button type="button" disabled={!isSelectedOpen} onClick={showHint}>
            <BulbIcon />
            Hint
          </button>
        </div>
        <p className="puzzle-tip">
          Tip: count on from the square before, or count back from the square
          after.
        </p>
      </aside>
    </div>
  );
};
