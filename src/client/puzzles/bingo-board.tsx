import { useRef, useState, type KeyboardEvent } from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import {
  buildBingoGame,
  formatBingoNumber,
  listCompletedLines,
  type BingoCall,
} from "./bingo.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type Feedback =
  | { kind: "start"; call: BingoCall }
  | { kind: "dabbed"; done: BingoCall; next: BingoCall; lines: number }
  | { kind: "wrong"; picked: number; call: BingoCall }
  | { kind: "already"; picked: number; call: BingoCall }
  | { kind: "hint"; call: BingoCall }
  | { kind: "bingo"; done: BingoCall };

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "start":
      return `Roll up! The ringmaster calls ${feedback.call.spoken}. Dab the answer on your card.`;
    case "dabbed": {
      const cheer =
        feedback.lines > 1
          ? `${String(feedback.lines)} lines at once! `
          : feedback.lines === 1
            ? "A line! The crowd cheers. "
            : "Dab! ";
      return `${cheer}${feedback.done.spoken} is ${formatBingoNumber(feedback.done.answer)}. Next call: ${feedback.next.spoken}.`;
    }
    case "wrong":
      return `${formatBingoNumber(feedback.picked)} isn't the answer to ${feedback.call.spoken}. Work it out and try another square.`;
    case "already":
      return `${formatBingoNumber(feedback.picked)} is already dabbed. Find the answer to ${feedback.call.spoken}.`;
    case "hint":
      return `Look for the glowing square: it holds the answer to ${feedback.call.spoken}.`;
    case "bingo":
      return `BINGO! ${feedback.done.spoken} is ${formatBingoNumber(feedback.done.answer)}, and that's a full house. Take a bow!`;
  }
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

const Ringmaster = () => (
  <svg viewBox="0 0 150 150" className="bingo-ringmaster" aria-hidden="true">
    <defs>
      <linearGradient id="bingo-coat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ef4444" />
        <stop offset="1" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="bingo-hat" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#111827" />
        <stop offset="0.45" stopColor="#374151" />
        <stop offset="1" stopColor="#0b0f19" />
      </linearGradient>
      <linearGradient id="bingo-horn" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fde68a" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <radialGradient id="bingo-face" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#fde4cf" />
        <stop offset="1" stopColor="#e9b48f" />
      </radialGradient>
    </defs>
    <ellipse cx="62" cy="144" rx="44" ry="5" fill="rgb(0 0 0 / 0.18)" />
    <path
      d="M22 144c0-34 14-52 40-52s40 18 40 52Z"
      fill="url(#bingo-coat)"
      stroke="#7f1d1d"
      strokeWidth="2"
    />
    <path d="M52 94l10 26 10-26Z" fill="#fffaf0" />
    <path d="M55 96l7 6 7-6-7 4Z" fill="#111827" />
    <path
      d="M62 120v24M50 100l-8 44M74 100l8 44"
      stroke="#7f1d1d"
      strokeWidth="2"
    />
    <circle cx="62" cy="126" r="2.6" fill="#fbbf24" />
    <circle cx="62" cy="136" r="2.6" fill="#fbbf24" />
    <path
      d="M24 112c-6 6-8 14-6 22M100 112c4 4 6 9 6 14"
      stroke="#fbbf24"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="62" cy="68" r="22" fill="url(#bingo-face)" stroke="#c98a63" />
    <circle cx="40" cy="70" r="5" fill="#e9b48f" />
    <circle cx="54" cy="64" r="2.4" fill="#1e1b4b" />
    <circle cx="70" cy="64" r="2.4" fill="#1e1b4b" />
    <circle cx="50" cy="73" r="3.6" fill="#fb7185" opacity="0.45" />
    <circle cx="75" cy="73" r="3.6" fill="#fb7185" opacity="0.45" />
    <path
      d="M48 77c5-5 10-4 14 0 4-4 9-5 14 0-4 3-9 4-14 0-5 4-10 3-14 0Z"
      fill="#3f2a1d"
    />
    <path
      d="M56 83c4 3 8 3 12 0"
      stroke="#9f1239"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="62" cy="49" rx="30" ry="5" fill="#111827" />
    <path d="M44 48 47 12h30l3 36Z" fill="url(#bingo-hat)" />
    <ellipse cx="62" cy="12" rx="15" ry="3" fill="#374151" />
    <path d="M45.4 38h33.2l.7 8H44.7Z" fill="#e11d48" />
    <circle cx="70" cy="42" r="2.5" fill="#fbbf24" />
    <path
      d="M100 112c6-4 12-10 14-18"
      stroke="url(#bingo-coat)"
      strokeWidth="11"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="114" cy="93" r="6" fill="#fffaf0" stroke="#c9a96e" />
    <g transform="rotate(-18 112 86)">
      <path
        d="M100 80h12l30-14v40l-30-14h-12Z"
        fill="url(#bingo-horn)"
        stroke="#92400e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse
        cx="142"
        cy="86"
        rx="4"
        ry="20"
        fill="#fef3c7"
        stroke="#92400e"
        strokeWidth="2"
      />
      <rect x="96" y="80" width="6" height="12" rx="2" fill="#92400e" />
    </g>
  </svg>
);

const DabSplodge = () => (
  <svg viewBox="0 0 100 100" className="bingo-splodge" aria-hidden="true">
    <path d="M50 8c10 0 14 8 22 9s17 4 18 15-6 13-4 21 9 16 2 25-15 5-23 10-14 12-24 6-6-12-15-14-17-6-17-17 9-12 8-20-8-14-1-23 15-4 22-8 6-4 12-4Z" />
    <circle cx="90" cy="18" r="4" />
    <circle cx="12" cy="86" r="3" />
    <circle cx="86" cy="88" r="2.5" />
  </svg>
);

const cellTilts = ["-6deg", "4deg", "-2deg", "7deg", "-8deg", "3deg"];

export const BingoBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [game] = useState(() => buildBingoGame(yearGroup, random));
  const { size, card, calls } = game;
  const [callIndex, setCallIndex] = useState(0);
  const [dabbed, setDabbed] = useState<ReadonlySet<number>>(new Set());
  const [wrongTries, setWrongTries] = useState(0);
  const [wrong, setWrong] = useState<{ index: number; nonce: number }>();
  const [hinted, setHinted] = useState<number>();
  const [newLines, setNewLines] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "start",
    call: calls[0],
  });
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isSolved = callIndex >= calls.length;
  const call = isSolved ? undefined : calls[callIndex];
  const completedLines = listCompletedLines(size, dabbed);
  const lineCells = new Set(completedLines.flat());
  const calledSoFar = calls.slice(0, callIndex).reverse();

  const dabSquare = (index: number) => {
    if (call === undefined) {
      return;
    }
    const picked = card[index];
    setHinted(undefined);
    if (dabbed.has(index)) {
      setFeedback({ kind: "already", picked, call });
      return;
    }
    if (picked !== call.answer) {
      setWrongTries((count) => count + 1);
      setWrong((last) => ({ index, nonce: (last?.nonce ?? 0) + 1 }));
      setNewLines(0);
      setFeedback({ kind: "wrong", picked, call });
      return;
    }
    const nextDabbed = new Set(dabbed).add(index);
    const linesBefore = completedLines.length;
    const linesAfter = listCompletedLines(size, nextDabbed).length;
    setDabbed(nextDabbed);
    setWrong(undefined);
    setNewLines(linesAfter - linesBefore);
    onStepAnswered(wrongTries);
    setWrongTries(0);
    const nextIndex = callIndex + 1;
    setCallIndex(nextIndex);
    if (nextIndex >= calls.length) {
      setFeedback({ kind: "bingo", done: call });
      onSolved();
      return;
    }
    setFeedback({
      kind: "dabbed",
      done: call,
      next: calls[nextIndex],
      lines: linesAfter - linesBefore,
    });
  };

  const showHint = () => {
    if (call === undefined) {
      return;
    }
    setHinted(card.indexOf(call.answer));
    setWrongTries((count) => count + 1);
    setFeedback({ kind: "hint", call });
  };

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const row = Math.floor(index / size);
    const column = index % size;
    const moves: Partial<Record<string, readonly [number, number]>> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (move === undefined) {
      return;
    }
    event.preventDefault();
    const nextRow = (row + move[0] + size) % size;
    const nextColumn = (column + move[1] + size) % size;
    cellRefs.current[nextRow * size + nextColumn]?.focus();
  };

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card bingo-board-card">
        <section className="bingo-caller" aria-label="The ringmaster's call">
          <Ringmaster />
          <div className="bingo-call-panel">
            <p className="bingo-call-label">
              {call === undefined
                ? "Full house!"
                : `Call ${String(callIndex + 1)} of ${String(calls.length)}`}
            </p>
            <div
              key={callIndex}
              className={`bingo-ball${call === undefined ? " finished" : ""}`}
            >
              {call === undefined ? (
                <span className="bingo-ball-text">★</span>
              ) : (
                <>
                  <span
                    className={`bingo-ball-text${call.text.length > 9 ? " long" : ""}`}
                    aria-hidden="true"
                  >
                    {call.text}
                  </span>
                  <span className="visually-hidden">{call.spoken}</span>
                </>
              )}
            </div>
          </div>
        </section>
        <div className="bingo-ticket">
          <p className="bingo-ticket-title" aria-hidden="true">
            Big Top Bingo
          </p>
          <div
            className="bingo-grid"
            role="group"
            aria-label="Your bingo card"
            style={{ "--bingo-size": size }}
          >
            {card.map((answer, index) => {
              const isDabbed = dabbed.has(index);
              return (
                <button
                  key={answer}
                  ref={(element) => {
                    cellRefs.current[index] = element;
                  }}
                  type="button"
                  className={[
                    "bingo-cell",
                    isDabbed ? "dabbed" : "",
                    formatBingoNumber(answer).length > 4 ? "long" : "",
                    lineCells.has(index) ? "in-line" : "",
                    hinted === index ? "hinted" : "",
                    wrong?.index === index
                      ? `wrong wrong-${String(wrong.nonce % 2)}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    "--bingo-tilt": cellTilts[index % cellTilts.length],
                  }}
                  aria-label={`${formatBingoNumber(answer)}${isDabbed ? ", dabbed" : ""}`}
                  aria-pressed={isDabbed}
                  onClick={() => {
                    dabSquare(index);
                  }}
                  onKeyDown={(event) => {
                    moveFocus(event, index);
                  }}
                >
                  {isDabbed ? <DabSplodge /> : null}
                  <span className="bingo-cell-number">
                    {formatBingoNumber(answer)}
                  </span>
                </button>
              );
            })}
          </div>
          {newLines > 0 && !isSolved ? (
            <p
              key={`line-${String(callIndex)}`}
              className="bingo-line-flourish"
              aria-hidden="true"
            >
              {newLines > 1 ? `${String(newLines)} lines!` : "A line!"}
            </p>
          ) : null}
          {isSolved ? (
            <div className="bingo-finish" aria-hidden="true">
              <span className="bingo-finish-word">BINGO!</span>
              {Array.from({ length: 12 }, (_, sparkle) => (
                <span
                  key={sparkle}
                  className={`bingo-sparkle sparkle-${String(sparkle)}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Bingo tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{dabbed.size}</strong> of {card.length} squares dabbed
          {completedLines.length > 0
            ? ` · ${String(completedLines.length)} ${completedLines.length === 1 ? "line" : "lines"}`
            : ""}
        </p>
        <div className="puzzle-tools bingo-tools">
          <button type="button" onClick={showHint} disabled={isSolved}>
            <BulbIcon />
            Hint
          </button>
        </div>
        <section className="bingo-called" aria-label="Called so far">
          <h2 className="bingo-called-title">Called so far</h2>
          {calledSoFar.length === 0 ? (
            <p className="puzzle-tip">
              Each call you dab lands here, so you can check your answers.
            </p>
          ) : (
            <ol className="bingo-called-list">
              {calledSoFar.map((done) => (
                <li key={done.text} className="bingo-called-item">
                  <span aria-hidden="true">
                    {done.text} = {formatBingoNumber(done.answer)}
                  </span>
                  <span className="visually-hidden">
                    {done.spoken} is {formatBingoNumber(done.answer)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
};
