import { useEffect, useRef, useState } from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";
import {
  describePattern,
  findPatternRange,
  isInPattern,
  isNextLetter,
  measureCrossing,
  pickTightropeWords,
  splitLetters,
  tightropeLetters,
  type TightropeWord,
} from "./tightrope-words.js";

type Feedback =
  | { kind: "start" }
  | { kind: "right"; letter: string; lettersLeft: number }
  | { kind: "wrong"; letter: string }
  | { kind: "hint"; letter: string; lettersLeft: number }
  | { kind: "spelled"; word: string; rule: string; wordsLeft: number }
  | { kind: "finished"; word: string; rule: string }
  | { kind: "next"; position: number };

const describeLettersLeft = (lettersLeft: number): string =>
  lettersLeft === 1
    ? "1 letter to go."
    : `${String(lettersLeft)} letters to go.`;

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "start":
      return "Roll up! Read the clue, then pick the first letter to help the acrobat onto the tightrope.";
    case "right":
      return `Yes, "${feedback.letter}"! A steady step along the rope. ${describeLettersLeft(feedback.lettersLeft)}`;
    case "wrong":
      return `Wobble! "${feedback.letter}" isn't the next letter. Hold the pole steady and try another.`;
    case "hint":
      return `The ringmaster whispers the next letter: "${feedback.letter}". ${describeLettersLeft(feedback.lettersLeft)}`;
    case "spelled":
      return `You spelled ${feedback.word}! ${feedback.rule} ${
        feedback.wordsLeft === 1
          ? "One more word to cross."
          : `${String(feedback.wordsLeft)} more words to cross.`
      }`;
    case "finished":
      return `You spelled ${feedback.word}! ${feedback.rule} The acrobat has crossed the whole tightrope. Take a bow!`;
    case "next":
      return `Word ${String(feedback.position)}. Read the clue, then pick the first letter.`;
  }
};

const ropeStartX = 72;
const ropeEndX = 328;
const ropeY = 100;
const firstStandX = 44;
const lastStandX = 352;

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

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="line-icon"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const starPath =
  "M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z";

const tentWedges = Array.from({ length: 14 }, (_, wedge) => wedge);
const valanceScallops = Array.from({ length: 17 }, (_, scallop) => scallop);
const crowdHeads = Array.from({ length: 29 }, (_, head) => head);
const confetti = [
  { x: -30, y: -58, colour: "#fbbf24", delay: 0 },
  { x: 26, y: -64, colour: "#f472b6", delay: 80 },
  { x: -18, y: -76, colour: "#5eead4", delay: 160 },
  { x: 34, y: -40, colour: "#fde68a", delay: 240 },
  { x: -38, y: -32, colour: "#a78bfa", delay: 120 },
  { x: 10, y: -84, colour: "#fb7185", delay: 200 },
  { x: 44, y: -70, colour: "#fbbf24", delay: 300 },
  { x: -44, y: -66, colour: "#5eead4", delay: 360 },
];

const Acrobat = ({
  wobbles,
  isBowing,
}: {
  wobbles: number;
  isBowing: boolean;
}) => (
  <g
    key={wobbles}
    className={[
      "tightrope-words-acrobat",
      wobbles > 0 ? "wobbling" : "",
      isBowing ? "bowing" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <g className="tightrope-words-sway">
      <path
        d="M-2.4 -20 L-3.2 -1"
        stroke="#fff7ed"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M2.4 -20 L3.2 -1"
        stroke="#fff7ed"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <ellipse cx="-3.8" cy="-0.6" rx="3" ry="1.5" fill="#be123c" />
      <ellipse cx="3.8" cy="-0.6" rx="3" ry="1.5" fill="#be123c" />
      <g className="tightrope-words-upper">
        <path
          d="M-6 -19 Q-8.4 -27 -7.2 -34 Q0 -37.4 7.2 -34 Q8.4 -27 6 -19 Z"
          fill="url(#tightrope-leotard)"
        />
        <path d="M-9.5 -18.4 L9.5 -18.4 L6.4 -23 L-6.4 -23 Z" fill="#fbbf24" />
        <path
          d={starPath}
          transform="translate(0 -28.5) scale(0.5)"
          fill="#fde68a"
        />
        <path
          d={
            isBowing
              ? "M-7 -33 L-13 -59 M7 -33 L13 -59"
              : "M-7 -33 L-16 -30.4 M7 -33 L16 -30.4"
          }
          stroke="#fcd9b6"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <g className="tightrope-words-pole">
          <path
            d={isBowing ? "M-34 -60 L34 -60" : "M-48 -30 L48 -30"}
            stroke="#7c2d12"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle
            cx={isBowing ? -34 : -48}
            cy={isBowing ? -60 : -30}
            r="2.8"
            fill="#e11d48"
          />
          <circle
            cx={isBowing ? 34 : 48}
            cy={isBowing ? -60 : -30}
            r="2.8"
            fill="#e11d48"
          />
        </g>
        <rect x="-1.6" y="-38.4" width="3.2" height="3.6" fill="#f5c6a0" />
        <circle cx="0" cy="-43" r="6.4" fill="#fcd9b6" />
        <path
          d="M-6.6 -43.4 Q-6.4 -50.6 0 -50.4 Q6.6 -50.6 6.6 -43.4 Q3.4 -47 -6.6 -43.4 Z"
          fill="#7c2d12"
        />
        <circle cx="0" cy="-51.6" r="2.6" fill="#7c2d12" />
        <circle cx="-2.3" cy="-42.6" r="0.75" fill="#1e1b4b" />
        <circle cx="2.3" cy="-42.6" r="0.75" fill="#1e1b4b" />
        <path
          d="M-2.2 -39.8 Q0 -38 2.2 -39.8"
          stroke="#9f1239"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="-4" cy="-40.6" r="1.1" fill="#fb7185" opacity="0.5" />
        <circle cx="4" cy="-40.6" r="1.1" fill="#fb7185" opacity="0.5" />
      </g>
    </g>
  </g>
);

const TightropeScene = ({
  crossing,
  wobbles,
  lettersPlaced,
  isFinished,
}: {
  crossing: number;
  wobbles: number;
  lettersPlaced: number;
  isFinished: boolean;
}) => {
  const x = firstStandX + crossing * (lastStandX - firstStandX);
  return (
    <svg
      className="tightrope-words-scene"
      viewBox="0 0 400 210"
      role="img"
      aria-label={
        isFinished
          ? "The acrobat has crossed the tightrope and takes a bow on the far platform."
          : `The acrobat is ${String(Math.round(crossing * 100))}% of the way across the tightrope, high above the safety net.`
      }
    >
      <defs>
        <linearGradient id="tightrope-tent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="0.6" stopColor="#2e1065" />
          <stop offset="1" stopColor="#1e0b3d" />
        </linearGradient>
        <radialGradient id="tightrope-glow" cx="0.5" cy="0.15" r="0.7">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tightrope-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbeb" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="tightrope-leotard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="tightrope-platform" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <pattern
          id="tightrope-pole-stripes"
          width="8"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="skewY(-30)"
        >
          <rect width="8" height="12" fill="#fff1d6" />
          <rect width="8" height="6" fill="#e11d48" />
        </pattern>
        <pattern
          id="tightrope-net"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path
            d="M0 0 H8 M0 0 V8"
            stroke="#e9d5ff"
            strokeOpacity="0.55"
            strokeWidth="0.8"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="400" height="210" fill="url(#tightrope-tent)" />
      {tentWedges.map((wedge) => (
        <path
          key={wedge}
          d={`M200 -30 L${String(wedge * 32 - 24)} 210 L${String(wedge * 32 - 8)} 210 Z`}
          fill="#ffffff"
          opacity={wedge % 2 === 0 ? 0.045 : 0}
        />
      ))}
      <rect width="400" height="210" fill="url(#tightrope-glow)" />
      {valanceScallops.map((scallop) => (
        <path
          key={scallop}
          d={`M${String(scallop * 25 - 4)} 0 h25 v6 a12.5 9 0 0 1 -25 0 Z`}
          fill={scallop % 2 === 0 ? "#e11d48" : "#fff1d6"}
        />
      ))}
      <path
        d="M40 0 V96 M360 0 V96"
        stroke="#c4b5fd"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <path
        d="M36 168 Q200 196 364 168 L364 176 Q200 206 36 176 Z"
        fill="url(#tightrope-net)"
        stroke="#e9d5ff"
        strokeOpacity="0.5"
        strokeWidth="0.8"
      />
      <path
        d="M36 168 Q200 196 364 168"
        stroke="#fde68a"
        strokeWidth="1.6"
        fill="none"
      />
      <rect
        x="36"
        y="100"
        width="8"
        height="110"
        fill="url(#tightrope-pole-stripes)"
      />
      <rect
        x="356"
        y="100"
        width="8"
        height="110"
        fill="url(#tightrope-pole-stripes)"
      />
      <g
        className="tightrope-words-beam"
        style={{ "--tightrope-words-x": `${String(x)}px` }}
      >
        <path d="M-8 -6 L8 -6 L46 106 L-46 106 Z" fill="url(#tightrope-beam)" />
        <ellipse cx="0" cy="104" rx="36" ry="5" fill="#fef3c7" opacity="0.28" />
      </g>
      <path
        d={`M${String(ropeStartX)} ${String(ropeY + 1)} H${String(ropeEndX)}`}
        stroke="#7c2d12"
        strokeOpacity="0.55"
        strokeWidth="2.6"
      />
      <path
        d={`M${String(ropeStartX)} ${String(ropeY)} H${String(ropeEndX)}`}
        stroke="#fef3c7"
        strokeWidth="1.6"
      />
      <rect
        x="14"
        y="98"
        width="60"
        height="9"
        rx="3"
        fill="url(#tightrope-platform)"
      />
      <rect
        x="326"
        y="98"
        width="60"
        height="9"
        rx="3"
        fill="url(#tightrope-platform)"
      />
      <path
        d="M16 107 h56 M328 107 h56"
        stroke="#78350f"
        strokeOpacity="0.5"
        strokeWidth="1.4"
      />
      <g
        className="tightrope-words-walker"
        style={{ "--tightrope-words-x": `${String(x)}px` }}
      >
        <g transform="scale(1.3)">
          <Acrobat wobbles={wobbles} isBowing={isFinished} />
        </g>
        {lettersPlaced > 0 ? (
          <g key={lettersPlaced} className="tightrope-words-sparkle">
            <path
              d={starPath}
              transform="translate(-22 -74) scale(0.8)"
              fill="#fde68a"
            />
            <path
              d={starPath}
              transform="translate(22 -64) scale(0.6)"
              fill="#ffffff"
            />
          </g>
        ) : null}
        {isFinished
          ? confetti.map((piece) => (
              <g
                key={`${String(piece.x)} ${String(piece.y)}`}
                transform={`translate(${String(piece.x)} ${String(piece.y)}) scale(0.6)`}
              >
                <path
                  className="tightrope-words-confetti"
                  d={starPath}
                  fill={piece.colour}
                  style={{ animationDelay: `${String(piece.delay)}ms` }}
                />
              </g>
            ))
          : null}
      </g>
      {crowdHeads.map((head) => (
        <circle
          key={head}
          cx={head * 14 + (head % 2) * 3 - 4}
          cy={208 + (head % 3) * 2}
          r={7 + (head % 4)}
          fill="#12062a"
          opacity="0.9"
        />
      ))}
    </svg>
  );
};

const PatternWord = ({ entry }: { entry: TightropeWord }) => {
  const range = findPatternRange(entry);
  return (
    <span className="tightrope-words-reveal-word">
      <span>{entry.word.slice(0, range.start)}</span>
      <mark>{entry.word.slice(range.start, range.end)}</mark>
      <span>{entry.word.slice(range.end)}</span>
    </span>
  );
};

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

export const TightropeWordsBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [words] = useState(() => pickTightropeWords(yearGroup, random));
  const [wordIndex, setWordIndex] = useState(0);
  const [filled, setFilled] = useState(0);
  const [wrongTries, setWrongTries] = useState(0);
  const [wobbles, setWobbles] = useState(0);
  const [lettersPlaced, setLettersPlaced] = useState(0);
  const [wrongLetter, setWrongLetter] = useState<string>();
  const [isRevealing, setIsRevealing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ kind: "start" });
  const nextButton = useRef<HTMLButtonElement>(null);
  const clue = useRef<HTMLDivElement>(null);
  const entry = words[wordIndex];
  const { word } = entry;
  const range = findPatternRange(entry);
  const isFinished = isRevealing && wordIndex === words.length - 1;
  const wordsDone = wordIndex + (isRevealing ? 1 : 0);
  const crossing = measureCrossing(
    wordIndex,
    filled,
    word.length,
    words.length,
  );

  useEffect(() => {
    if (isRevealing) {
      nextButton.current?.focus();
    }
  }, [isRevealing]);

  useEffect(() => {
    if (wordIndex > 0) {
      clue.current?.focus();
    }
  }, [wordIndex]);

  const addLetter = (wrongTotal: number, isHint: boolean) => {
    const letter = word[filled];
    const nowFilled = filled + 1;
    setFilled(nowFilled);
    setLettersPlaced((count) => count + 1);
    setWrongLetter(undefined);
    if (nowFilled < word.length) {
      const lettersLeft = word.length - nowFilled;
      setFeedback(
        isHint
          ? { kind: "hint", letter, lettersLeft }
          : { kind: "right", letter, lettersLeft },
      );
      return;
    }
    onStepAnswered(wrongTotal);
    setIsRevealing(true);
    if (wordIndex === words.length - 1) {
      setFeedback({ kind: "finished", word, rule: entry.rule });
      onSolved();
      return;
    }
    setFeedback({
      kind: "spelled",
      word,
      rule: entry.rule,
      wordsLeft: words.length - wordIndex - 1,
    });
  };

  const pickLetter = (letter: string) => {
    if (isRevealing) {
      return;
    }
    if (isNextLetter(word, filled, letter)) {
      addLetter(wrongTries, false);
      return;
    }
    setWrongTries((count) => count + 1);
    setWobbles((count) => count + 1);
    setWrongLetter(letter);
    setFeedback({ kind: "wrong", letter });
  };

  const showHint = () => {
    if (isRevealing) {
      return;
    }
    const wrongTotal = wrongTries + 1;
    setWrongTries(wrongTotal);
    addLetter(wrongTotal, true);
  };

  const goToNextWord = () => {
    if (!isRevealing || isFinished) {
      return;
    }
    setWordIndex(wordIndex + 1);
    setFilled(0);
    setWrongTries(0);
    setWrongLetter(undefined);
    setIsRevealing(false);
    setFeedback({ kind: "next", position: wordIndex + 2 });
  };

  useEffect(() => {
    const typeLetter = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.repeat ||
        isTypingTarget(event.target)
      ) {
        return;
      }
      const letter = event.key.toLowerCase();
      if (letter.length === 1 && tightropeLetters.includes(letter)) {
        event.preventDefault();
        pickLetter(letter);
      }
    };
    document.addEventListener("keydown", typeLetter);
    return () => {
      document.removeEventListener("keydown", typeLetter);
    };
  });

  const spokenSoFar =
    filled === 0
      ? `${String(word.length)} empty letters`
      : `${splitLetters(word.slice(0, filled)).join(" ")}, then ${String(word.length - filled)} more`;

  return (
    <div className="puzzle-play-area">
      <div
        className={[
          "puzzle-board-card",
          "tightrope-words-card",
          isFinished ? "finished" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <TightropeScene
          crossing={crossing}
          wobbles={wobbles}
          lettersPlaced={lettersPlaced}
          isFinished={isFinished}
        />
        <div className="tightrope-words-clue" ref={clue} tabIndex={-1}>
          <p className="tightrope-words-clue-text">
            <span className="tightrope-words-label">
              Word {wordIndex + 1} of {words.length}
            </span>
            {entry.clue}
          </p>
          {entry.madeFrom === undefined ? null : (
            <p className="tightrope-words-made-from">
              Made from <strong>{entry.madeFrom}</strong>
            </p>
          )}
        </div>
        <div
          className="tightrope-words-tiles"
          role="group"
          aria-label={`The word so far: ${spokenSoFar}. The outlined tiles spell ${describePattern(entry)}.`}
          style={{ "--tightrope-words-length": word.length }}
        >
          {splitLetters(word).map((letter, index) => {
            const isFilled = index < filled;
            const isCurrent = !isRevealing && index === filled;
            return (
              <span
                key={isCurrent ? `current-${String(wobbles)}` : index}
                aria-hidden="true"
                className={[
                  "tightrope-words-tile",
                  isFilled ? "filled" : "",
                  isInPattern(range, index) ? "pattern" : "",
                  isCurrent ? "current" : "",
                  isCurrent && wrongLetter !== undefined ? "wrong" : "",
                  isRevealing && isInPattern(range, index) ? "revealed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isFilled ? (
                  <span className="tightrope-words-letter">{letter}</span>
                ) : null}
              </span>
            );
          })}
        </div>
        {isRevealing ? (
          <div className="tightrope-words-reveal">
            {isFinished ? (
              <p className="tightrope-words-finale">
                Bravo! Tightrope crossed!
              </p>
            ) : null}
            <PatternWord entry={entry} />
            <p className="tightrope-words-rule">{entry.rule}</p>
            {isFinished ? null : (
              <button
                type="button"
                ref={nextButton}
                className="tightrope-words-next"
                onClick={goToNextWord}
              >
                Next word
                <ArrowIcon />
              </button>
            )}
          </div>
        ) : (
          <div
            className="tightrope-words-keyboard"
            role="group"
            aria-label="Letters"
          >
            {tightropeLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                className={[
                  "tightrope-words-key",
                  wrongLetter === letter ? "wrong" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-letter={letter}
                aria-label={`Letter ${letter}`}
                onClick={() => {
                  pickLetter(letter);
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="puzzle-side-card" aria-label="Tightrope tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{wordsDone}</strong> of {words.length} words spelled
        </p>
        <p className="puzzle-tip">
          The outlined tiles spell{" "}
          <strong className="tightrope-words-tip-pattern">
            {describePattern(entry)}
          </strong>
          . Type on your keyboard or tap the letters.
        </p>
        <div className="puzzle-tools">
          <button type="button" onClick={showHint} disabled={isRevealing}>
            <BulbIcon />
            Hint
          </button>
        </div>
      </aside>
    </div>
  );
};
