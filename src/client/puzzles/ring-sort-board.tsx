import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";
import {
  buildRingSortPuzzle,
  describeCardQuestion,
  isRightRing,
  type RingSortCard,
  type RingSortRing,
} from "./ring-sort.js";

type Feedback =
  | { kind: "start" }
  | { kind: "sorted"; card: RingSortCard; left: number }
  | { kind: "wrong"; ring: RingSortRing }
  | { kind: "hint"; ring: RingSortRing };

const cheers = [
  "The crowd cheers!",
  "Ta-da!",
  "What a performance!",
  "Roll up for the next card!",
];

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "start":
      return "Roll up, roll up! Read the card on the cart, then send it to its ring.";
    case "sorted":
      return feedback.left === 0
        ? `${feedback.card.explanation} Every card is sorted. Take a bow, ringmaster!`
        : `${feedback.card.explanation} ${cheers[feedback.left % cheers.length]}`;
    case "wrong":
      return `The ${feedback.ring.label} ring sends the card back. Read it again and try another ring.`;
    case "hint":
      return `Look at the glowing ${feedback.ring.label} ring. ${feedback.ring.rule}`;
  }
};

const rimColours = ["#dc2626", "#2563eb", "#16a34a", "#9333ea"];
const dragThreshold = 12;

const RingFloor = ({ rim }: { rim: string }) => {
  const id = useId();
  return (
    <svg
      viewBox="0 0 200 136"
      className="ring-sort-floor"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id={`${id}-sand`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fff8dc" />
          <stop offset="55%" stopColor="#f8d796" />
          <stop offset="100%" stopColor="#d99a4e" />
        </radialGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rim} />
          <stop offset="100%" stopColor="#2a0710" />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
        <pattern
          id={`${id}-dust`}
          width="9"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="0.7" fill="#b7793a" opacity="0.35" />
          <circle cx="6.5" cy="5" r="0.55" fill="#ffffff" opacity="0.5" />
        </pattern>
        <radialGradient id={`${id}-rim-shade`} cx="50%" cy="50%" r="50%">
          <stop offset="80%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#5b2a07" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="84" rx="98" ry="50" fill="rgb(30 10 40 / 0.3)" />
      <ellipse cx="100" cy="76" rx="95" ry="54" fill={`url(#${id}-side)`} />
      <ellipse cx="100" cy="64" rx="95" ry="54" fill={rim} />
      <ellipse cx="100" cy="64" rx="95" ry="54" fill={`url(#${id}-top)`} />
      <ellipse
        cx="100"
        cy="64"
        rx="88"
        ry="47"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8"
        strokeDasharray="14.5 14.5"
        opacity="0.95"
      />
      <ellipse cx="100" cy="66" rx="80" ry="40" fill="#5b2a07" opacity="0.35" />
      <ellipse cx="100" cy="66" rx="79" ry="39" fill={`url(#${id}-sand)`} />
      <ellipse cx="100" cy="66" rx="79" ry="39" fill={`url(#${id}-dust)`} />
      <ellipse
        cx="100"
        cy="66"
        rx="79"
        ry="39"
        fill={`url(#${id}-rim-shade)`}
      />
      <ellipse
        cx="100"
        cy="67"
        rx="52"
        ry="24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        strokeDasharray="3 5"
        opacity="0.6"
      />
      <ellipse cx="78" cy="14" rx="34" ry="3.5" fill="#ffffff" opacity="0.4" />
    </svg>
  );
};

const CartIllustration = () => {
  const id = useId();
  return (
    <svg viewBox="0 0 220 74" className="ring-sort-cart-art" aria-hidden="true">
      <defs>
        <pattern
          id={`${id}-stripes`}
          width="22"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <rect width="11" height="40" fill="#e11d48" />
          <rect x="11" width="11" height="40" fill="#fff1d6" />
        </pattern>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
          <stop offset="35%" stopColor="#000000" stopOpacity="0" />
          <stop offset="75%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.32" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="68" rx="96" ry="6" fill="rgb(30 10 40 / 0.22)" />
      <rect
        x="22"
        y="10"
        width="176"
        height="38"
        rx="4"
        fill={`url(#${id}-stripes)`}
      />
      <rect
        x="22"
        y="10"
        width="176"
        height="38"
        rx="4"
        fill={`url(#${id}-shade)`}
      />
      <rect x="16" y="4" width="188" height="10" rx="5" fill="#fbbf24" />
      <rect x="16" y="44" width="188" height="8" rx="4" fill="#d97706" />
      {[56, 164].map((x) => (
        <g key={x}>
          <circle cx={x} cy="56" r="13" fill="#1e1b4b" />
          <circle cx={x} cy="56" r="9" fill="#fbbf24" />
          <circle cx={x} cy="56" r="3" fill="#1e1b4b" />
        </g>
      ))}
    </svg>
  );
};

const FinaleStars = () => (
  <svg viewBox="0 0 240 90" className="ring-sort-finale-art" aria-hidden="true">
    {[
      [30, 30, 14, "#fbbf24"],
      [80, 18, 9, "#f472b6"],
      [120, 40, 18, "#fde047"],
      [162, 16, 10, "#60a5fa"],
      [210, 32, 14, "#34d399"],
    ].map(([cx, cy, r, fill]) => {
      const x = Number(cx);
      const y = Number(cy);
      const size = Number(r);
      const points = Array.from({ length: 10 }, (_, point) => {
        const angle = (point * Math.PI) / 5 - Math.PI / 2;
        const reach = point % 2 === 0 ? size : size * 0.45;
        return `${String(x + Math.cos(angle) * reach)},${String(y + Math.sin(angle) * reach)}`;
      }).join(" ");
      return (
        <polygon
          key={`${String(x)}-${String(y)}`}
          className="ring-sort-finale-star"
          points={points}
          fill={String(fill)}
        />
      );
    })}
  </svg>
);

const CardText = ({ card }: { card: RingSortCard }) => {
  const [beforeGap, ...afterGaps] = card.before.split("___");
  const afterGap = afterGaps.join("___");
  return (
    <>
      {afterGaps.length === 0 ? (
        beforeGap
      ) : (
        <>
          {beforeGap}
          <span className="ring-sort-gap">
            <span aria-hidden="true">___</span>
            <span className="visually-hidden">blank</span>
          </span>
          {afterGap}
        </>
      )}
      <strong>{card.word}</strong>
      {card.after}
    </>
  );
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

const findRingIdAt = (x: number, y: number): string | undefined =>
  document
    .elementsFromPoint(x, y)
    .map((element) => element.closest<HTMLElement>("[data-ring-id]"))
    .find((element) => element !== null)?.dataset.ringId;

export const RingSortBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [puzzle] = useState(() => buildRingSortPuzzle(yearGroup, random));
  const { rings, cards } = puzzle;
  const [position, setPosition] = useState(0);
  const [wrongSinceLastCard, setWrongSinceLastCard] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "start" });
  const [hintRingId, setHintRingId] = useState<string>();
  const [shake, setShake] = useState<{ ringId: string; nonce: number }>();
  const [drag, setDrag] = useState<{ x: number; y: number }>();
  const [dragRingId, setDragRingId] = useState<string>();
  const dragStart = useRef<{ x: number; y: number }>(undefined);
  const card = cards.at(position);
  const isFinished = card === undefined;
  const lastSortedRingId = cards.at(position - 1)?.ringId;

  const sortInto = (ringId: string) => {
    if (card === undefined) {
      return;
    }
    const ring = rings.find(({ id }) => id === ringId);
    if (ring === undefined) {
      return;
    }
    setHintRingId(undefined);
    if (!isRightRing(card, ringId)) {
      setWrongSinceLastCard((count) => count + 1);
      setShake((previous) => ({
        ringId,
        nonce: (previous?.nonce ?? 0) + 1,
      }));
      setFeedback({ kind: "wrong", ring });
      return;
    }
    const left = cards.length - position - 1;
    onStepAnswered(wrongSinceLastCard);
    setWrongSinceLastCard(0);
    setShake(undefined);
    setPosition(position + 1);
    setFeedback({ kind: "sorted", card, left });
    if (left === 0) {
      onSolved();
    }
  };

  const showHint = () => {
    if (card === undefined) {
      return;
    }
    const ring = rings.find(({ id }) => id === card.ringId);
    if (ring === undefined) {
      return;
    }
    setWrongSinceLastCard((count) => count + 1);
    setHintRingId(ring.id);
    setFeedback({ kind: "hint", ring });
  };

  useEffect(() => {
    const pickRingByNumber = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select") !== null)
      ) {
        return;
      }
      const ring = rings.at(Number(event.key) - 1);
      if (/^[1-4]$/.test(event.key) && ring !== undefined) {
        event.preventDefault();
        sortInto(ring.id);
      }
    };
    document.addEventListener("keydown", pickRingByNumber);
    return () => {
      document.removeEventListener("keydown", pickRingByNumber);
    };
  });

  const endDrag = () => {
    dragStart.current = undefined;
    setDrag(undefined);
    setDragRingId(undefined);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (isFinished || !event.isPrimary) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY };
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (start === undefined) {
      return;
    }
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (drag === undefined && Math.hypot(x, y) < dragThreshold) {
      return;
    }
    setDrag({ x, y });
    setDragRingId(findRingIdAt(event.clientX, event.clientY));
  };

  const dropCard = (event: PointerEvent<HTMLDivElement>) => {
    const wasDragging = drag !== undefined;
    endDrag();
    if (!wasDragging) {
      return;
    }
    const ringId = findRingIdAt(event.clientX, event.clientY);
    if (ringId !== undefined) {
      sortInto(ringId);
    }
  };

  const shakeClass =
    shake === undefined
      ? ""
      : shake.nonce % 2 === 0
        ? "ring-sort-shake-a"
        : "ring-sort-shake-b";

  return (
    <div className="puzzle-play-area">
      <div
        className={[
          "puzzle-board-card",
          "ring-sort-board",
          isFinished ? "ring-sort-finished" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="ring-sort-cart-zone">
          {card === undefined ? (
            <div className="ring-sort-finale">
              <FinaleStars />
              <p className="ring-sort-finale-title">Bravo!</p>
              <p className="ring-sort-finale-text">
                Every card is in its ring.
              </p>
            </div>
          ) : (
            <div className="ring-sort-cart" key={card.id}>
              <p className="ring-sort-question">
                <span className="ring-sort-card-number">
                  Card {position + 1} of {cards.length}
                </span>
                {describeCardQuestion(yearGroup, card)}
              </p>
              <div
                className={[
                  "ring-sort-card",
                  drag === undefined ? "" : "ring-sort-dragging",
                  shakeClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  drag === undefined
                    ? undefined
                    : {
                        "--ring-sort-drag-x": `${String(drag.x)}px`,
                        "--ring-sort-drag-y": `${String(drag.y)}px`,
                      }
                }
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={dropCard}
                onPointerCancel={endDrag}
              >
                <p className="ring-sort-card-text">
                  <CardText card={card} />
                </p>
              </div>
              <CartIllustration />
            </div>
          )}
        </div>
        <div
          className={`ring-sort-rings ring-sort-rings-${String(rings.length)}`}
          role="group"
          aria-label="Circus rings"
        >
          {rings.map((ring, index) => {
            const sorted = cards
              .slice(0, position)
              .filter(({ ringId }) => ringId === ring.id);
            return (
              <button
                key={ring.id}
                type="button"
                data-ring-id={ring.id}
                className={[
                  "ring-sort-ring",
                  hintRingId === ring.id ? "ring-sort-ring-hinted" : "",
                  dragRingId === ring.id ? "ring-sort-ring-target" : "",
                  shake?.ringId === ring.id ? shakeClass : "",
                  lastSortedRingId === ring.id && !isFinished
                    ? `ring-sort-cheer-${position % 2 === 0 ? "a" : "b"}`
                    : "",
                  isFinished ? "ring-sort-ring-lit" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--ring-sort-rim": rimColours[index] }}
                aria-label={`${ring.label} ring, key ${String(index + 1)}${
                  sorted.length === 0
                    ? ""
                    : `, holding ${sorted.map(({ sortedText }) => sortedText).join(", ")}`
                }`}
                aria-disabled={isFinished}
                onClick={() => {
                  sortInto(ring.id);
                }}
              >
                <span className="ring-sort-banner">
                  <span className="ring-sort-key" aria-hidden="true">
                    {index + 1}
                  </span>
                  {ring.label}
                </span>
                <span className="ring-sort-arena">
                  <RingFloor rim={rimColours[index]} />
                  <span className="ring-sort-chips">
                    {sorted.map((sortedCard) => (
                      <span key={sortedCard.id} className="ring-sort-chip">
                        {sortedCard.sortedText}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Ring sort tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{position}</strong> of {cards.length} cards sorted
        </p>
        <div className="puzzle-tools ring-sort-tools">
          <button type="button" onClick={showHint} disabled={isFinished}>
            <BulbIcon />
            Hint
          </button>
        </div>
        <p className="puzzle-tip">
          Tap a ring, drag the card onto it, or press 1 to{" "}
          {String(rings.length)}.
        </p>
      </aside>
    </div>
  );
};
