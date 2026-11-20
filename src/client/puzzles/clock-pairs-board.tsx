import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { YearGroup } from "../../curriculum/skills.js";
import type {
  ClockDial,
  ClockTime,
} from "../../curriculum/telling-the-time.js";
import { ReadAloudMessage } from "../read-aloud-button.js";
import {
  boardColumns,
  dealClockPairs,
  describeCardFace,
  findPartner,
  isClockPair,
  isWrongTry,
  romanNumerals,
  type CardFace,
  type ClockCard,
  type PartOfDay,
} from "./clock-pairs.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";

type Feedback =
  | { kind: "none" }
  | { kind: "first"; face: CardFace }
  | { kind: "explored" }
  | { kind: "wrong" }
  | { kind: "matched"; left: number }
  | { kind: "solved"; turns: number }
  | { kind: "already-found" }
  | { kind: "hint" }
  | { kind: "hint-partner" };

const matchRuleByYear: Record<YearGroup, string> = {
  1: "Match each clock to its time in words.",
  2: "Match each clock to its time in words.",
  3: "Match each Roman numeral clock to its digital time.",
  4: "Match each 12-hour time to the same time on the 24-hour clock.",
  5: "Match each starting time and the minutes added to the later time.",
  6: "Match each pair of times to how long it is from one to the other.",
};

const describeFeedback = (feedback: Feedback, yearGroup: YearGroup): string => {
  switch (feedback.kind) {
    case "none":
      return `Turn over any two cards. ${matchRuleByYear[yearGroup]}`;
    case "first":
      return `You turned over ${describeCardFace(feedback.face)}. Now find the card that goes with it.`;
    case "explored":
      return "Not a pair, but now you know two more cards. Remember where they hide!";
    case "wrong":
      return "Oops, not a pair. Those two don't show the same time. Have another think.";
    case "matched":
      return `A pair! The crowd cheers. ${String(feedback.left)} ${feedback.left === 1 ? "pair" : "pairs"} to go.`;
    case "solved":
      return `Bravo! Every pair found in ${String(feedback.turns)} turns. Take a bow!`;
    case "already-found":
      return "That pair is already found. Pick a card that's still face down.";
    case "hint":
      return "Look! These two glowing cards are a pair. Remember where they are.";
    case "hint-partner":
      return "The glowing card goes with the card you turned over.";
  }
};

const mismatchShowMilliseconds = 1600;
const hintShowMilliseconds = 1800;
const sparkleCount = 6;

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

const formatNumber = (value: number) => String(Math.round(value * 100) / 100);

interface DefIds {
  face: string;
  rim: string;
  stars: string;
  ticket: string;
}

const BoardDefs = ({ ids }: { ids: DefIds }) => (
  <svg className="clock-pairs-defs" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={ids.face} cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#fffaf0" />
        <stop offset="100%" stopColor="#f3e3c0" />
      </radialGradient>
      <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="45%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id={ids.ticket} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="55%" stopColor="#4338ca" />
        <stop offset="100%" stopColor="#312e81" />
      </linearGradient>
      <pattern
        id={ids.stars}
        width="20"
        height="20"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M5 1.5l1 2.3 2.4.2-1.8 1.6.6 2.4L5 6.7 2.8 8l.6-2.4L1.6 4l2.4-.2z"
          fill="rgb(253 230 138 / 0.5)"
        />
        <circle cx="15" cy="14" r="1" fill="rgb(255 255 255 / 0.4)" />
      </pattern>
    </defs>
  </svg>
);

const CardBack = ({ ids }: { ids: DefIds }) => (
  <svg viewBox="0 0 80 100" className="clock-pairs-back-art">
    <rect
      x="1"
      y="1"
      width="78"
      height="98"
      rx="9"
      fill={`url(#${ids.ticket})`}
    />
    <rect
      x="1"
      y="1"
      width="78"
      height="98"
      rx="9"
      fill={`url(#${ids.stars})`}
    />
    <rect
      x="6"
      y="6"
      width="68"
      height="88"
      rx="6"
      fill="none"
      stroke="#fbbf24"
      strokeWidth="1.6"
      strokeDasharray="3 2"
    />
    <circle cx="40" cy="50" r="17" fill="#e11d48" stroke="#fbbf24" />
    <path
      d="M40 37.5l3.6 7.6 8.3.9-6.2 5.6 1.8 8.2L40 55.6l-7.5 4.2 1.8-8.2-6.2-5.6 8.3-.9z"
      fill="#fde68a"
      stroke="#b45309"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <circle cx="1" cy="50" r="5" fill="var(--puzzle-paper)" />
    <circle cx="79" cy="50" r="5" fill="var(--puzzle-paper)" />
  </svg>
);

const minuteTicks = Array.from({ length: 60 }, (_, minute) => minute);
const hourNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

const ClockPicture = ({
  time,
  dial,
  ids,
}: {
  time: ClockTime;
  dial: ClockDial;
  ids: DefIds;
}) => {
  const minuteAngle = time.minutes * 6;
  const hourAngle = ((time.hour % 12) + time.minutes / 60) * 30;
  const isRoman = dial === "roman";
  return (
    <svg viewBox="-50 -50 100 100" className="clock-pairs-clock">
      <circle r="49" fill={`url(#${ids.rim})`} />
      <circle r="44" fill={`url(#${ids.face})`} />
      <circle r="44" fill="none" stroke="rgb(120 53 15 / 0.35)" />
      {minuteTicks.map((minute) => {
        const isHour = minute % 5 === 0;
        const angle = (minute / 60) * Math.PI * 2;
        const outer = 41;
        const inner = isHour ? 35.5 : 38.5;
        return (
          <line
            key={minute}
            x1={formatNumber(Math.sin(angle) * inner)}
            y1={formatNumber(-Math.cos(angle) * inner)}
            x2={formatNumber(Math.sin(angle) * outer)}
            y2={formatNumber(-Math.cos(angle) * outer)}
            stroke="#1e1b4b"
            strokeWidth={isHour ? 2.2 : 0.9}
            strokeLinecap="round"
          />
        );
      })}
      {hourNumbers.map((hour) => {
        const angle = (hour / 12) * Math.PI * 2;
        const reach = isRoman ? 27.5 : 28;
        return (
          <text
            key={hour}
            x={formatNumber(Math.sin(angle) * reach)}
            y={formatNumber(-Math.cos(angle) * reach)}
            className={
              isRoman ? "clock-pairs-numeral roman" : "clock-pairs-numeral"
            }
            textAnchor="middle"
            dominantBaseline="central"
          >
            {isRoman ? romanNumerals[hour % 12] : String(hour)}
          </text>
        );
      })}
      <g opacity="0.22" transform="translate(1.2 1.6)">
        <path
          d="M-2.6 5 L-1.4 -19 L0 -22 L1.4 -19 L2.6 5 Z"
          transform={`rotate(${formatNumber(hourAngle)})`}
        />
        <path
          d="M-1.8 6 L-0.9 -32 L0 -35 L0.9 -32 L1.8 6 Z"
          transform={`rotate(${formatNumber(minuteAngle)})`}
        />
      </g>
      <path
        className="clock-pairs-hour-hand"
        d="M-2.6 5 L-1.4 -19 L0 -22 L1.4 -19 L2.6 5 Z"
        transform={`rotate(${formatNumber(hourAngle)})`}
      />
      <path
        className="clock-pairs-minute-hand"
        d="M-1.8 6 L-0.9 -32 L0 -35 L0.9 -32 L1.8 6 Z"
        transform={`rotate(${formatNumber(minuteAngle)})`}
      />
      <circle r="3.6" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
      <circle r="1.3" fill="#1e1b4b" />
    </svg>
  );
};

const PartOfDayBadge = ({ partOfDay }: { partOfDay: PartOfDay }) => (
  <span className={`clock-pairs-badge ${partOfDay}`}>{partOfDay}</span>
);

const DigitalTime = ({ text }: { text: string }) => {
  const [digits, ...partOfDay] = text.split(" ");
  return (
    <span className="clock-pairs-digital">
      <span className="clock-pairs-digits">{digits}</span>
      {partOfDay.length === 0 ? null : (
        <span className="clock-pairs-digital-part">{partOfDay.join(" ")}</span>
      )}
    </span>
  );
};

const AddRibbon = ({ minutes }: { minutes: number }) => (
  <span className="clock-pairs-ribbon">+ {minutes} minutes</span>
);

const CardFront = ({ face, ids }: { face: CardFace; ids: DefIds }) => {
  switch (face.kind) {
    case "clock":
      return (
        <span className="clock-pairs-face-stack">
          <ClockPicture time={face.time} dial={face.dial} ids={ids} />
          {face.partOfDay === undefined ? null : (
            <PartOfDayBadge partOfDay={face.partOfDay} />
          )}
          {face.minutesLater === undefined ? null : (
            <AddRibbon minutes={face.minutesLater} />
          )}
        </span>
      );
    case "words":
      return <span className="clock-pairs-words">{face.text}</span>;
    case "digital":
      return <DigitalTime text={face.text} />;
    case "later":
      return (
        <span className="clock-pairs-face-stack">
          <DigitalTime text={face.start} />
          <AddRibbon minutes={face.minutesLater} />
        </span>
      );
    case "span":
      return (
        <span className="clock-pairs-face-stack span">
          <span className="clock-pairs-span-time">{face.from}</span>
          <span className="clock-pairs-span-to">to</span>
          <span className="clock-pairs-span-time">{face.to}</span>
        </span>
      );
    case "duration":
      return (
        <span className="clock-pairs-face-stack">
          <svg
            viewBox="0 0 24 24"
            className="clock-pairs-timer"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="14" r="8" />
            <path d="M12 10v4l2.5 2" />
            <path d="M10 2h4" />
            <path d="M12 2v4" />
          </svg>
          <span className="clock-pairs-duration">{face.text}</span>
        </span>
      );
  }
};

const Sparkles = () => (
  <span className="clock-pairs-sparkles" aria-hidden="true">
    {Array.from({ length: sparkleCount }, (_, index) => (
      <span
        key={index}
        className="clock-pairs-sparkle"
        style={{ "--clock-pairs-sparkle": index }}
      />
    ))}
  </span>
);

const arrowSteps = new Map([
  ["ArrowLeft", -1],
  ["ArrowRight", 1],
  ["ArrowUp", -boardColumns],
  ["ArrowDown", boardColumns],
]);

export const ClockPairsBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const idPrefix = useId();
  const ids: DefIds = {
    face: `${idPrefix}-face`,
    rim: `${idPrefix}-rim`,
    stars: `${idPrefix}-stars`,
    ticket: `${idPrefix}-ticket`,
  };
  const [cards] = useState<readonly ClockCard[]>(() =>
    dealClockPairs(yearGroup, random),
  );
  const [matchedIds, setMatchedIds] = useState<readonly number[]>([]);
  const [turnedIds, setTurnedIds] = useState<readonly number[]>([]);
  const [seenIds, setSeenIds] = useState<ReadonlySet<number>>(new Set());
  const [hintIds, setHintIds] = useState<readonly number[]>([]);
  const [isWrongShowing, setIsWrongShowing] = useState(false);
  const [turns, setTurns] = useState(0);
  const [wrongSinceLastPair, setWrongSinceLastPair] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const pairCount = cards.length / 2;
  const pairsFound = matchedIds.length / 2;
  const isSolved = pairsFound === pairCount;

  useEffect(() => {
    if (turnedIds.length < 2) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setTurnedIds([]);
      setIsWrongShowing(false);
    }, mismatchShowMilliseconds);
    return () => {
      clearTimeout(timer);
    };
  }, [turnedIds]);

  useEffect(() => {
    if (hintIds.length === 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setHintIds([]);
    }, hintShowMilliseconds);
    return () => {
      clearTimeout(timer);
    };
  }, [hintIds]);

  const turnCard = (card: ClockCard) => {
    if (isSolved) {
      return;
    }
    setHintIds([]);
    if (matchedIds.includes(card.id)) {
      setFeedback({ kind: "already-found" });
      return;
    }
    const waiting = turnedIds.length === 2 ? [] : turnedIds;
    if (turnedIds.length === 2) {
      // Tapping on turns the last two cards back before the timer does.
      setTurnedIds([]);
      setIsWrongShowing(false);
      if (turnedIds.includes(card.id)) {
        setFeedback({ kind: "none" });
        return;
      }
    }
    const [firstId] = waiting;
    const first = cards.find(({ id }) => id === firstId);
    if (first === undefined) {
      setTurnedIds([card.id]);
      setFeedback({ kind: "first", face: card.face });
      return;
    }
    if (first.id === card.id) {
      return;
    }
    setTurns((count) => count + 1);
    setSeenIds(new Set([...seenIds, first.id, card.id]));
    if (isClockPair(first, card)) {
      const nowMatched = [...matchedIds, first.id, card.id];
      setMatchedIds(nowMatched);
      setTurnedIds([]);
      onStepAnswered(wrongSinceLastPair);
      setWrongSinceLastPair(0);
      const left = pairCount - nowMatched.length / 2;
      if (left === 0) {
        setFeedback({ kind: "solved", turns: turns + 1 });
        onSolved();
        return;
      }
      setFeedback({ kind: "matched", left });
      return;
    }
    const isWrong = isWrongTry(cards, first, card, seenIds);
    setTurnedIds([first.id, card.id]);
    setIsWrongShowing(isWrong);
    if (isWrong) {
      setWrongSinceLastPair((count) => count + 1);
    }
    setFeedback({ kind: isWrong ? "wrong" : "explored" });
  };

  const showHint = () => {
    if (isSolved) {
      return;
    }
    const waiting = turnedIds.length === 1 ? turnedIds : [];
    if (turnedIds.length === 2) {
      setTurnedIds([]);
      setIsWrongShowing(false);
    }
    const waitingCard = cards.find(({ id }) => id === waiting[0]);
    const partner =
      waitingCard === undefined ? undefined : findPartner(cards, waitingCard);
    const unmatched = cards.filter(({ id }) => !matchedIds.includes(id));
    const chosen = unmatched[Math.floor(random() * unmatched.length)];
    const chosenPartner = findPartner(cards, chosen);
    const revealed =
      partner === undefined
        ? [chosen, chosenPartner].flatMap((card) =>
            card === undefined ? [] : [card.id],
          )
        : [partner.id];
    setHintIds(revealed);
    setSeenIds(new Set([...seenIds, ...revealed]));
    setWrongSinceLastPair((count) => count + 1);
    setFeedback({ kind: partner === undefined ? "hint" : "hint-partner" });
  };

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = arrowSteps.get(event.key);
    if (step === undefined) {
      return;
    }
    const current = cardButtons.current.findIndex(
      (button) => button === document.activeElement,
    );
    if (current === -1) {
      return;
    }
    const next = current + step;
    if (next < 0 || next >= cards.length) {
      return;
    }
    event.preventDefault();
    cardButtons.current[next]?.focus();
  };

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card clock-pairs-card">
        <BoardDefs ids={ids} />
        {isSolved ? (
          <p className="clock-pairs-finale">
            <span className="clock-pairs-finale-star" aria-hidden="true">
              ★
            </span>
            Every pair found in {turns} turns!
            <span className="clock-pairs-finale-star" aria-hidden="true">
              ★
            </span>
          </p>
        ) : null}
        <div
          className={`clock-pairs-grid year-${String(yearGroup)}`}
          role="group"
          aria-label="Clock pairs cards"
          style={{ "--clock-pairs-columns": boardColumns }}
          onKeyDown={moveFocus}
        >
          {cards.map((card, index) => {
            const isMatched = matchedIds.includes(card.id);
            const isTurned = turnedIds.includes(card.id);
            const isHinted = hintIds.includes(card.id);
            const isFaceUp = isMatched || isTurned || isHinted;
            const number = String(index + 1);
            return (
              <button
                key={card.id}
                ref={(button) => {
                  cardButtons.current[index] = button;
                }}
                type="button"
                className={[
                  "clock-pairs-card-button",
                  isFaceUp ? "face-up" : "",
                  isMatched ? "matched" : "",
                  isHinted ? "hinted" : "",
                  isTurned && isWrongShowing ? "wrong" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  isFaceUp
                    ? `Card ${number}, ${describeCardFace(card.face)}${isMatched ? ", found" : ""}`
                    : `Card ${number}, face down`
                }
                onClick={() => {
                  turnCard(card);
                }}
              >
                <span className="clock-pairs-card-inner" aria-hidden="true">
                  <span className="clock-pairs-back">
                    <CardBack ids={ids} />
                  </span>
                  <span className="clock-pairs-front">
                    <CardFront face={card.face} ids={ids} />
                  </span>
                </span>
                {isMatched ? <Sparkles /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="puzzle-side-card" aria-label="Clock pairs tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback, yearGroup)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{pairsFound}</strong> of {pairCount} pairs found
        </p>
        <p className="puzzle-count clock-pairs-turns">
          <strong>{turns}</strong> {turns === 1 ? "turn" : "turns"}
        </p>
        <div className="puzzle-tools clock-pairs-tools">
          <button type="button" onClick={showHint} disabled={isSolved}>
            <BulbIcon />
            Hint
          </button>
        </div>
        <p className="puzzle-tip">
          A hint counts as a wrong try, and so does turning over a card you have
          already seen that isn&apos;t the pair.
        </p>
      </aside>
    </div>
  );
};
