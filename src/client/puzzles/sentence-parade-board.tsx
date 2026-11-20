import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ReadAloudMessage } from "../read-aloud-button.js";
import type { PuzzleBoardProps } from "./puzzle-play.js";
import {
  buildParade,
  describeWagon,
  findHintWagon,
  findMatchingOrder,
  isPunctuationWagon,
  isRightNextWagon,
  isRoundComplete,
  joinTokens,
  type ParadeToken,
  type ParadeWagon,
} from "./sentence-parade.js";

type Feedback =
  | { kind: "none" }
  | { kind: "coupled"; text: string; left: number }
  | { kind: "wrong"; text: string }
  | { kind: "hint"; text: string }
  | { kind: "paraded"; left: number }
  | { kind: "finished" };

const nameWagon = (text: string): string =>
  isPunctuationWagon(text)
    ? `the ${describeWagon(text)} wagon`
    : `the “${text}” wagon`;

const capitalise = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

const describeFeedback = (feedback: Feedback): string => {
  switch (feedback.kind) {
    case "none":
      return "Read the ringmaster's call, then tap the wagon that comes first in the sentence.";
    case "coupled":
      return feedback.left === 1
        ? `Clank! ${capitalise(nameWagon(feedback.text))} is coupled. One wagon left to go!`
        : `Clank! ${capitalise(nameWagon(feedback.text))} is coupled. ${String(feedback.left)} wagons to go.`;
    case "wrong":
      return `Oops, ${nameWagon(feedback.text)} doesn't come next. It wobbles back to the station. Try another wagon.`;
    case "hint":
      return `The ringmaster coupled ${nameWagon(feedback.text)} for you.`;
    case "paraded":
      return feedback.left === 1
        ? "Toot toot! Your sentence chugs round the ring. One more sentence to build."
        : `Toot toot! Your sentence chugs round the ring. ${String(feedback.left)} more sentences to build.`;
    case "finished":
      return "What a grand parade! Every sentence is built and the crowd is cheering.";
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

const SteamEngine = () => (
  <svg
    viewBox="0 0 120 92"
    className="sentence-parade-engine-art"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="sentence-parade-boiler" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4ade80" />
        <stop offset="0.55" stopColor="#16a34a" />
        <stop offset="1" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="sentence-parade-cab" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fb7185" />
        <stop offset="1" stopColor="#be123c" />
      </linearGradient>
      <linearGradient id="sentence-parade-brass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fde68a" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <radialGradient id="sentence-parade-wheel" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#fde047" />
        <stop offset="1" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <g className="sentence-parade-smoke">
      <circle cx="24" cy="10" r="6" />
      <circle cx="16" cy="5" r="4.5" />
      <circle cx="9" cy="3" r="3" />
    </g>
    <rect
      x="18"
      y="14"
      width="12"
      height="20"
      rx="2"
      fill="#1e1b4b"
      stroke="url(#sentence-parade-brass)"
      strokeWidth="2"
    />
    <rect
      x="15"
      y="12"
      width="18"
      height="5"
      rx="2"
      fill="url(#sentence-parade-brass)"
    />
    <rect
      x="6"
      y="32"
      width="68"
      height="34"
      rx="16"
      fill="url(#sentence-parade-boiler)"
    />
    <rect
      x="12"
      y="38"
      width="56"
      height="5"
      rx="2.5"
      fill="#bbf7d0"
      opacity="0.5"
    />
    <circle
      cx="10"
      cy="49"
      r="9"
      fill="#1e1b4b"
      stroke="url(#sentence-parade-brass)"
      strokeWidth="3"
    />
    <path
      d="m10 43 1.7 3.6 3.9.4-2.9 2.6.8 3.8L10 51.5l-3.5 1.9.8-3.8-2.9-2.6 3.9-.4Z"
      fill="#fde047"
    />
    <circle cx="48" cy="30" r="5" fill="url(#sentence-parade-brass)" />
    <path d="M70 18h40a4 4 0 0 1 4 4v46H70Z" fill="url(#sentence-parade-cab)" />
    <path d="M66 14h50l-4 7H70Z" fill="#1e1b4b" />
    <rect x="78" y="26" width="26" height="18" rx="4" fill="#e0f2fe" />
    <rect
      x="78"
      y="26"
      width="26"
      height="6"
      rx="3"
      fill="#ffffff"
      opacity="0.7"
    />
    <rect x="2" y="64" width="114" height="6" rx="3" fill="#1e1b4b" />
    <path d="M0 74h14l-6 8H2Z" fill="#e11d48" />
    {[22, 50, 92].map((cx) => (
      <g key={cx} className="sentence-parade-engine-wheel">
        <circle
          cx={cx}
          cy="76"
          r={cx === 92 ? 14 : 11}
          fill="url(#sentence-parade-wheel)"
          stroke="#1e1b4b"
          strokeWidth="3"
        />
        <circle cx={cx} cy="76" r="3" fill="#1e1b4b" />
        <path
          d={`M${String(cx - 8)} 76h16M${String(cx)} 68v16`}
          stroke="#1e1b4b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ))}
    <rect x="22" y="72" width="70" height="4" rx="2" fill="#94a3b8" />
  </svg>
);

const WagonFace = ({ text }: { text: string }) => (
  <>
    <span className="sentence-parade-roof" aria-hidden="true" />
    <span
      className={[
        "sentence-parade-word",
        isPunctuationWagon(text) ? "punctuation" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {text}
    </span>
    <span className="sentence-parade-chassis" aria-hidden="true" />
    <span className="sentence-parade-wheel left" aria-hidden="true" />
    <span className="sentence-parade-wheel right" aria-hidden="true" />
  </>
);

const HighlightedSentence = ({
  tokens,
}: {
  tokens: readonly ParadeToken[];
}) => {
  const groups: { isKey: boolean; tokens: ParadeToken[] }[] = [];
  for (const token of tokens) {
    const last = groups.at(-1);
    if (last?.isKey === token.isKey) {
      last.tokens.push(token);
    } else {
      groups.push({ isKey: token.isKey, tokens: [token] });
    }
  }
  return (
    <>
      {groups.map((group, index) => {
        const previous = groups[index - 1]?.tokens.at(-1);
        const text = joinTokens(
          previous === undefined ? group.tokens : [previous, ...group.tokens],
        ).slice(previous === undefined ? 0 : previous.text.length);
        const leadingSpace = text.startsWith(" ") ? " " : "";
        const body = text.trimStart();
        return (
          <span key={index}>
            {leadingSpace}
            {group.isKey ? <mark>{body}</mark> : body}
          </span>
        );
      })}
    </>
  );
};

export const SentenceParadeBoard = ({
  yearGroup,
  random,
  onStepAnswered,
  onSolved,
}: PuzzleBoardProps) => {
  const [rounds] = useState(() => buildParade(yearGroup, random));
  const [roundIndex, setRoundIndex] = useState(0);
  const [coupled, setCoupled] = useState<readonly ParadeWagon[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [wobble, setWobble] = useState<{ id: number; tick: number }>();
  const [hintedId, setHintedId] = useState<number>();
  const [paraded, setParaded] = useState<readonly (readonly ParadeToken[])[]>(
    [],
  );
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const stationRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const focusIndex = useRef<number>(undefined);

  const round = rounds.at(roundIndex);
  const placedTexts = coupled.map(({ text }) => text);
  const station =
    round?.wagons.filter(
      ({ id }) => !coupled.some((wagon) => wagon.id === id),
    ) ?? [];
  const isDone = round !== undefined && isRoundComplete(round, placedTexts);
  const isFinished = isDone && roundIndex === rounds.length - 1;
  const builtOrder =
    round === undefined ? undefined : findMatchingOrder(round, placedTexts);

  useEffect(() => {
    const index = focusIndex.current;
    if (index === undefined) {
      return;
    }
    focusIndex.current = undefined;
    if (isDone) {
      nextButtonRef.current?.focus();
      return;
    }
    const buttons =
      stationRef.current?.querySelectorAll<HTMLButtonElement>("button");
    const target: HTMLButtonElement | undefined =
      buttons?.[Math.min(index, buttons.length - 1)];
    target?.focus();
  });

  const couple = (
    wagon: ParadeWagon,
    stationIndex: number,
    wrongSoFar: number,
    viaHint: boolean,
  ) => {
    if (round === undefined) {
      return;
    }
    const nextCoupled = [...coupled, wagon];
    const nextTexts = nextCoupled.map(({ text }) => text);
    setCoupled(nextCoupled);
    setWobble(undefined);
    setHintedId(viaHint ? wagon.id : undefined);
    focusIndex.current = stationIndex;
    if (!isRoundComplete(round, nextTexts)) {
      setFeedback(
        viaHint
          ? { kind: "hint", text: wagon.text }
          : {
              kind: "coupled",
              text: wagon.text,
              left: round.wagons.length - nextCoupled.length,
            },
      );
      return;
    }
    const order = findMatchingOrder(round, nextTexts);
    if (order !== undefined) {
      setParaded((list) => [...list, order]);
    }
    onStepAnswered(wrongSoFar);
    if (roundIndex === rounds.length - 1) {
      setFeedback({ kind: "finished" });
      onSolved();
      return;
    }
    setFeedback({ kind: "paraded", left: rounds.length - roundIndex - 1 });
  };

  const pickWagon = (wagon: ParadeWagon, stationIndex: number) => {
    if (round === undefined || isDone) {
      return;
    }
    if (!isRightNextWagon(round, placedTexts, wagon.text)) {
      setWrongCount((count) => count + 1);
      setWobble((last) => ({ id: wagon.id, tick: (last?.tick ?? 0) + 1 }));
      setHintedId(undefined);
      setFeedback({ kind: "wrong", text: wagon.text });
      return;
    }
    couple(wagon, stationIndex, wrongCount, false);
  };

  const showHint = () => {
    if (round === undefined || isDone) {
      return;
    }
    const wagon = findHintWagon(round, placedTexts, station);
    if (wagon === undefined) {
      return;
    }
    setWrongCount(wrongCount + 1);
    couple(wagon, station.indexOf(wagon), wrongCount + 1, true);
  };

  const nextSentence = () => {
    setRoundIndex((index) => index + 1);
    setCoupled([]);
    setWrongCount(0);
    setWobble(undefined);
    setHintedId(undefined);
    setFeedback({ kind: "none" });
    focusIndex.current = 0;
  };

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const buttons = [
      ...(stationRef.current?.querySelectorAll<HTMLButtonElement>("button") ??
        []),
    ];
    const index = buttons.indexOf(event.currentTarget);
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div className="puzzle-play-area">
      <div className="puzzle-board-card sentence-parade-card">
        <div className="sentence-parade-call">
          <span className="sentence-parade-call-label">
            Ringmaster's call · Sentence {roundIndex + 1} of {rounds.length}
          </span>
          <p className="sentence-parade-prompt">{round?.prompt}</p>
        </div>
        <ol
          className={[
            "sentence-parade-train",
            isDone && !isFinished ? "departing" : "",
            isFinished ? "finale" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={`The parade so far: ${coupled.length === 0 ? "just the engine" : joinTokens(coupled)}`}
        >
          <li className="sentence-parade-engine" aria-hidden="true">
            <SteamEngine />
          </li>
          {coupled.map((wagon, index) => (
            <li
              key={`${String(roundIndex)}-${String(wagon.id)}`}
              className={wagon.id === hintedId ? "coupled hinted" : "coupled"}
              style={{ "--sentence-parade-index": index }}
            >
              <span
                className={`sentence-parade-wagon colour-${String(wagon.colour)}`}
              >
                <WagonFace text={wagon.text} />
              </span>
            </li>
          ))}
        </ol>
        {isDone && builtOrder !== undefined ? (
          <div
            className={["sentence-parade-built", isFinished ? "finale" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {isFinished ? (
              <p className="sentence-parade-finale-title">Grand parade!</p>
            ) : null}
            <p className="sentence-parade-built-label">You built:</p>
            <p className="sentence-parade-built-sentence">
              <HighlightedSentence tokens={builtOrder} />
            </p>
            {isFinished ? null : (
              <button
                ref={nextButtonRef}
                type="button"
                className="sentence-parade-next"
                onClick={nextSentence}
              >
                Next sentence
                <ArrowIcon />
              </button>
            )}
          </div>
        ) : (
          <div
            ref={stationRef}
            className="sentence-parade-station"
            role="group"
            aria-label="Wagons waiting in the station"
          >
            {station.map((wagon, index) => (
              <button
                key={`${String(roundIndex)}-${String(wagon.id)}`}
                type="button"
                className={[
                  "sentence-parade-wagon",
                  `colour-${String(wagon.colour)}`,
                  wobble?.id === wagon.id
                    ? `wobble-${wobble.tick % 2 === 0 ? "even" : "odd"}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`Wagon: ${describeWagon(wagon.text)}`}
                onClick={() => {
                  pickWagon(wagon, index);
                }}
                onKeyDown={moveFocus}
              >
                <WagonFace text={wagon.text} />
              </button>
            ))}
          </div>
        )}
      </div>
      <aside className="puzzle-side-card" aria-label="Sentence Parade tools">
        <ReadAloudMessage>
          <p className="puzzle-status" role="status">
            {describeFeedback(feedback)}
          </p>
        </ReadAloudMessage>
        <p className="puzzle-count">
          <strong>{paraded.length}</strong> of {rounds.length} sentences paraded
        </p>
        <div className="puzzle-tools sentence-parade-tools">
          <button type="button" onClick={showHint} disabled={isDone}>
            <BulbIcon />
            Hint
          </button>
        </div>
        {paraded.length > 0 ? (
          <ol className="sentence-parade-log" aria-label="Sentences paraded">
            {paraded.map((tokens, index) => (
              <li key={index}>
                <HighlightedSentence tokens={tokens} />
              </li>
            ))}
          </ol>
        ) : null}
        <p className="puzzle-tip">
          Tip: a sentence starts with a capital letter. A hint couples the next
          wagon but counts as a wrong try.
        </p>
      </aside>
    </div>
  );
};
