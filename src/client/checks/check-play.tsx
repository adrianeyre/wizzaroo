import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  checkFormats,
  countCheckScore,
  isOutcomeScored,
  type CheckGameType,
  type CheckQuestion,
  type CheckResult,
  type CheckWay,
} from "../../curriculum/checks.js";
import {
  buildCheckPaper,
  buildCheckWarmUp,
} from "../../curriculum/check-papers.js";
import type { PhonicsProgramme } from "../../curriculum/phonics-programmes.js";
import type { YearGroup } from "../../curriculum/skills.js";
import type { PracticeRecord } from "../family-device/family-device-page.js";
import { ReadAloudButton, ReadAloudMessage } from "../read-aloud-button.js";
import { BusyProgress } from "../busy/busy-progress.js";
import {
  answerCheckQuestion,
  expireCheckClock,
  findCheckDeadline,
  findCheckSecondsSpent,
  findCurrentCheckQuestion,
  findMainCheckSkillId,
  finishCheckPause,
  isCheckClockRunning,
  markReadAloudQuestion,
  moveOnFromShownAnswer,
  startCheckAfterWarmUp,
  startCheckSession,
  type CheckSession,
  type CheckStep,
} from "./check-session.js";

export const checkClockTickMs = 200;
const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;

export interface CheckSpokenWord {
  playSpokenWord: (spokenWord: string) => Promise<boolean>;
  /** Gets every word ready to play, saying how many are ready as it goes. */
  prepareSpokenWords: (
    spokenWords: readonly string[],
    onProgress?: (readyCount: number, wordCount: number) => void,
  ) => Promise<boolean>;
}

/** How far getting a paper's spoken words ready has gone. */
interface SpokenWordsPreparing {
  readyCount: number;
  /** Undefined until the device knows how many words it needs. */
  wordCount: number | undefined;
}

const SpokenWordsProgress = ({
  preparing: { readyCount, wordCount },
}: {
  preparing: SpokenWordsPreparing;
}) => (
  <BusyProgress
    className="on-check-paper"
    label="Getting this paper's spoken words ready…"
    detail={
      wordCount === undefined
        ? "Downloading each word the first time, so the check can say them"
        : `${String(readyCount)} of ${String(wordCount)} words ready`
    }
    share={wordCount === undefined ? undefined : readyCount / wordCount}
  />
);

interface CheckPlayProps {
  gameType: CheckGameType;
  phonicsProgramme: PhonicsProgramme | undefined;
  yearGroup: YearGroup;
  isClockOff: boolean;
  random: () => number;
  buildId: () => string;
  readTime: () => number;
  spokenWord: CheckSpokenWord;
  recordPractice: (practiceRecord: PracticeRecord) => void;
  recordCheck: (checkResult: CheckResult) => void;
  onFinished: (skillIds: string[]) => void;
  leaveButton: ReactNode;
}

const describeClock = (gameType: CheckGameType): string => {
  const { clock } = checkFormats[gameType];
  switch (clock.kind) {
    case "per-question":
      return `${String(clock.secondsPerQuestion)} seconds for each question, like the real check.`;
    case "whole-paper":
      return `${String(Math.round(clock.seconds / secondsPerMinute))} minutes for the whole paper.`;
    case "none":
      return "No clock.";
  }
};

export const formatTimeLeft = (milliseconds: number): string => {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / millisecondsPerSecond),
  );
  const minutes = Math.floor(totalSeconds / secondsPerMinute);
  const seconds = totalSeconds % secondsPerMinute;
  return minutes > 0
    ? `${String(minutes)}:${String(seconds).padStart(2, "0")}`
    : `${String(seconds)}s`;
};

// Five keys a row, counting along: 1 to 5, then 6 to 0.
const numberPadKeys = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  ".",
  "/",
  "−",
];

const NumberPad = ({
  onKey,
  onDelete,
}: {
  onKey: (key: string) => void;
  onDelete: () => void;
}) => (
  <div className="check-number-pad" role="group" aria-label="Number pad">
    {numberPadKeys.map((key) => (
      <button
        key={key}
        type="button"
        onClick={() => {
          onKey(key);
        }}
        aria-label={
          key === "/"
            ? "fraction line"
            : key === "."
              ? "decimal point"
              : key === "−"
                ? "minus sign"
                : key
        }
      >
        {key}
      </button>
    ))}
    <button type="button" onClick={onDelete} aria-label="Delete">
      ⌫
    </button>
  </div>
);

interface AnswerAreaProps {
  question: CheckQuestion;
  isPractice: boolean;
  onAnswer: (givenAnswer: string) => void;
  onMarked: (isReadRight: boolean) => void;
}

const AnswerArea = ({
  question,
  isPractice,
  onAnswer,
  onMarked,
}: AnswerAreaProps) => {
  const [typed, setTyped] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, [question.key]);

  if (question.answerShape === "read-aloud") {
    return (
      <div className="check-marking" role="group" aria-label="For the grown-up">
        <p className="check-marking-note">
          {isPractice
            ? "Did you read it right?"
            : "Grown-up: did they read it right?"}
        </p>
        <button
          type="button"
          className="check-mark-right"
          onClick={() => {
            onMarked(true);
          }}
        >
          ✓ Read it right
        </button>
        <button
          type="button"
          className="check-mark-wrong"
          onClick={() => {
            onMarked(false);
          }}
        >
          ✗ Not this time
        </button>
      </div>
    );
  }

  if (question.answerShape === "choice") {
    return (
      <div className="check-choices" role="group" aria-label="Choose one">
        {question.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className="check-choice"
            onClick={() => {
              onAnswer(choice);
            }}
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (typed.trim() === "") {
      return;
    }
    onAnswer(typed);
    setTyped("");
  };
  const isNumber = question.answerShape === "number";
  return (
    <form className="check-answer-form" onSubmit={submit}>
      <label className="visually-hidden" htmlFor="check-answer">
        Your answer
      </label>
      <input
        id="check-answer"
        ref={input}
        className="check-answer-input"
        value={typed}
        inputMode={isNumber ? "decimal" : "text"}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
      />
      <button type="submit" className="check-submit" aria-label="Enter answer">
        ✓
      </button>
      {isNumber ? (
        <NumberPad
          onKey={(key) => {
            setTyped((previous) => previous + key);
          }}
          onDelete={() => {
            setTyped((previous) => previous.slice(0, -1));
          }}
        />
      ) : null}
    </form>
  );
};

const describePracticeFeedback = (
  session: CheckSession,
  question: CheckQuestion | undefined,
): string | undefined => {
  const { stage } = session;
  if (stage.kind !== "answering" && stage.kind !== "warming-up") {
    return undefined;
  }
  switch (stage.feedback) {
    case "right":
      return "Right! On to the next one.";
    case "wrong":
      return "Not quite. Have another go.";
    case "answer-shown":
      return question === undefined
        ? undefined
        : `The answer is ${question.acceptedAnswers[0] ?? ""}.`;
    case "none":
      return undefined;
  }
};

const ClockDisplay = ({
  session,
  now,
}: {
  session: CheckSession;
  now: number;
}) => {
  const deadline = findCheckDeadline(session);
  if (deadline === undefined) {
    return null;
  }
  const left = deadline - now;
  const { clock } = session.format;
  const total =
    clock.kind === "per-question"
      ? clock.secondsPerQuestion * millisecondsPerSecond
      : clock.kind === "whole-paper"
        ? clock.seconds * millisecondsPerSecond
        : 1;
  const share = Math.min(1, Math.max(0, left / total));
  return (
    <div className="check-clock">
      <div
        className="check-clock-bar"
        role="progressbar"
        aria-label="Time left"
        aria-valuemin={0}
        aria-valuemax={Math.round(total / millisecondsPerSecond)}
        aria-valuenow={Math.max(0, Math.ceil(left / millisecondsPerSecond))}
        aria-valuetext={formatTimeLeft(left)}
      >
        <span style={{ inlineSize: `${String(share * 100)}%` }} />
      </div>
      <span className="check-clock-text">{formatTimeLeft(left)}</span>
    </div>
  );
};

const listQuestionsToPractise = (session: CheckSession): CheckQuestion[] =>
  session.outcomes.flatMap((outcome, index) => {
    const question = session.paper.questions.at(index);
    return isOutcomeScored(outcome) || question === undefined ? [] : [question];
  });

const describeQuestionToPractise = (question: CheckQuestion): string =>
  question.answerShape === "read-aloud" || question.spokenWord !== undefined
    ? (question.acceptedAnswers[0] ?? question.prompt)
    : `${question.prompt} ${question.acceptedAnswers[0] ?? ""}`.trim();

/**
 * A check question as words to read out loud for a Child. The Phonics
 * Screening Check is the Child reading each word, and a spelling word has its
 * own recording, so neither is read out.
 */
export const describeCheckQuestionAloud = (
  gameType: CheckGameType,
  question: CheckQuestion,
): string | undefined =>
  gameType === "phonics-screening-check" ||
  question.answerShape === "read-aloud" ||
  question.spokenWord !== undefined
    ? undefined
    : question.prompt;

export const CheckPlay = ({
  gameType,
  phonicsProgramme,
  yearGroup,
  isClockOff,
  random,
  buildId,
  readTime,
  spokenWord,
  recordPractice,
  recordCheck,
  onFinished,
  leaveButton,
}: CheckPlayProps) => {
  const format = checkFormats[gameType];
  const [activityId] = useState(buildId);
  const [session, setSession] = useState<CheckSession>();
  const [now, setNow] = useState(readTime);
  const [preparing, setPreparing] = useState<SpokenWordsPreparing>();
  const isPreparing = preparing !== undefined;
  const [preparingProblem, setPreparingProblem] = useState<string>();
  const hasRecordedFinish = useRef(false);

  const recordFinishedCheck = (finished: CheckSession) => {
    if (hasRecordedFinish.current) {
      return;
    }
    hasRecordedFinish.current = true;
    recordPractice({
      kind: "activity-finished",
      activityId,
      skillId: findMainCheckSkillId(finished),
      secondsSpent: findCheckSecondsSpent(finished),
    });
    if (finished.way === "timed") {
      recordCheck({
        checkGameType: gameType,
        isClockOff: finished.isClockOff,
        outcomes: finished.outcomes,
      });
    }
  };

  const applyStep = ({ session: nextSession, answered }: CheckStep) => {
    if (answered !== undefined) {
      recordPractice({
        kind: "question-answered",
        activityId,
        skillId: answered.question.skillId,
        isRightFirstTime: answered.isRightFirstTime,
        wrongAnswerCount: answered.wrongAnswerCount,
        checkAnswer: answered.checkAnswer,
      });
    }
    if (nextSession.stage.kind === "finished") {
      recordFinishedCheck(nextSession);
    }
    setSession(nextSession);
  };

  const tickCheckClock = useEffectEvent(() => {
    const tickTime = readTime();
    setNow(tickTime);
    if (session === undefined) {
      return;
    }
    const step = expireCheckClock(session, tickTime);
    applyStep({
      session: finishCheckPause(step.session, tickTime),
      answered: step.answered,
    });
  });

  const isClockTicking =
    session !== undefined && session.stage.kind !== "finished";
  useEffect(() => {
    if (!isClockTicking) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      tickCheckClock();
    }, checkClockTickMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [isClockTicking]);

  const question =
    session === undefined ? undefined : findCurrentCheckQuestion(session);
  const questionKey = question?.key;
  const questionSpokenWord = question?.spokenWord;
  const playQuestionWord = useEffectEvent((word: string) => {
    void spokenWord.playSpokenWord(word);
  });
  useEffect(() => {
    if (questionSpokenWord !== undefined) {
      playQuestionWord(questionSpokenWord);
    }
  }, [questionKey, questionSpokenWord]);

  const startWay = async (way: CheckWay) => {
    const paper = buildCheckPaper(gameType, way, random, phonicsProgramme);
    const spokenWords = paper.questions.flatMap(({ spokenWord: word }) =>
      word === undefined ? [] : [word],
    );
    if (spokenWords.length > 0) {
      if (isPreparing) {
        return;
      }
      setPreparing({ readyCount: 0, wordCount: undefined });
      setPreparingProblem(undefined);
      const isReady = await spokenWord
        .prepareSpokenWords(spokenWords, (readyCount, wordCount) => {
          setPreparing({ readyCount, wordCount });
        })
        .catch(() => false)
        .finally(() => {
          setPreparing(undefined);
        });
      if (!isReady) {
        setPreparingProblem(
          "This paper's spoken words need the internet the first time you play it. Connect and try again.",
        );
        return;
      }
    }
    const startedAt = readTime();
    setNow(startedAt);
    setSession(
      startCheckSession(
        format,
        way,
        isClockOff,
        paper,
        buildCheckWarmUp(gameType, random),
        startedAt,
      ),
    );
  };

  const header = (
    <header className="check-header">
      <p className="check-kicker">Challenge Arena · Year {yearGroup}</p>
      <h1>{format.title}</h1>
      <p className="check-paper-name">{format.paperName}</p>
    </header>
  );

  if (session === undefined) {
    const hasClock = format.clock.kind !== "none";
    return (
      <div className={`check-stage ${gameType}`}>
        <div className="check-layout">
          {header}
          <section
            className="check-card"
            aria-labelledby="check-ways"
            aria-busy={isPreparing ? true : undefined}
          >
            <h2 id="check-ways">How would you like to play?</h2>
            <p>{format.instruction}</p>
            <ReadAloudButton className="check-read-aloud" readsSection />
            <div className="check-ways">
              <button
                type="button"
                className="check-way"
                disabled={isPreparing}
                onClick={() => {
                  void startWay("practice");
                }}
              >
                <strong>Practice</strong>
                <span>
                  {format.isParentMarked
                    ? "Tell the real words from the alien words, on your own."
                    : "No clock. Hints if you get stuck."}
                </span>
              </button>
              <button
                type="button"
                className="check-way timed"
                disabled={isPreparing}
                onClick={() => {
                  void startWay("timed");
                }}
              >
                <strong>
                  {format.isParentMarked
                    ? "Do this with a grown-up"
                    : "Timed check"}
                </strong>
                <span>
                  {format.isParentMarked
                    ? "Read each word out loud. Your grown-up taps whether you read it right."
                    : isClockOff && hasClock
                      ? "Just like the real thing, but your grown-up has turned the clock off."
                      : `Just like the real thing. ${describeClock(gameType)}`}
                </span>
              </button>
            </div>
            {preparing === undefined ? null : (
              <SpokenWordsProgress preparing={preparing} />
            )}
            {preparingProblem === undefined ? null : (
              <p className="check-note problem" role="alert">
                {preparingProblem}
              </p>
            )}
          </section>
        </div>
        {leaveButton}
      </div>
    );
  }

  const { stage } = session;

  if (stage.kind === "finished") {
    const score = countCheckScore(session.outcomes);
    const toPractise = listQuestionsToPractise(session);
    const skillIds = [
      ...new Set(session.paper.questions.map(({ skillId }) => skillId)),
    ];
    return (
      <div className={`check-stage ${gameType}`}>
        <div className="check-layout">
          {header}
          <section
            className="check-card check-result"
            aria-labelledby="check-result"
          >
            <ReadAloudButton className="check-read-aloud" readsSection />
            {session.way === "timed" ? (
              <>
                <h2 id="check-result">
                  You scored {score} out of {session.outcomes.length}
                </h2>
                <p>
                  {score === session.outcomes.length
                    ? "Every one right. Brilliant!"
                    : "Great effort! Every go makes the next one easier."}
                </p>
              </>
            ) : (
              <>
                <h2 id="check-result">Practice finished</h2>
                <p>
                  Well done for practising. You can try it timed whenever you
                  like.
                </p>
              </>
            )}
            {toPractise.length > 0 ? (
              <>
                <h3>
                  {gameType === "times-tables-check"
                    ? "Facts to practise"
                    : "To practise"}
                </h3>
                <ul className="check-practise-list">
                  {toPractise.map((practiseQuestion) => (
                    <li key={practiseQuestion.key}>
                      {describeQuestionToPractise(practiseQuestion)}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <button
              type="button"
              className="check-carry-on"
              onClick={() => {
                onFinished(session.format.isParentMarked ? [] : skillIds);
              }}
            >
              Carry on
            </button>
          </section>
        </div>
        {leaveButton}
      </div>
    );
  }

  if (stage.kind === "ready-to-start") {
    return (
      <div className={`check-stage ${gameType}`}>
        <div className="check-layout">
          {header}
          <section className="check-card" aria-labelledby="check-ready">
            <h2 id="check-ready">Warm-up done!</h2>
            <ReadAloudButton className="check-read-aloud" readsSection />
            <p>
              The real check starts now: {session.paper.questions.length}{" "}
              questions.{" "}
              {isCheckClockRunning(session)
                ? describeClock(gameType)
                : "No clock."}
            </p>
            <button
              type="button"
              className="check-carry-on"
              onClick={() => {
                const startedAt = readTime();
                setNow(startedAt);
                setSession(startCheckAfterWarmUp(session, startedAt));
              }}
            >
              Start the check
            </button>
          </section>
        </div>
        {leaveButton}
      </div>
    );
  }

  const isWarmingUp = stage.kind === "warming-up";
  const questionNumber =
    stage.kind === "pausing"
      ? stage.nextIndex
      : stage.kind === "answering"
        ? stage.index + 1
        : stage.index + 1;
  const questionTotal = isWarmingUp
    ? session.warmUp.length
    : session.paper.questions.length;
  const feedback = describePracticeFeedback(session, question);
  const feedbackTone =
    session.stage.kind === "answering" || session.stage.kind === "warming-up"
      ? session.stage.feedback
      : "none";

  return (
    <div className={`check-stage ${gameType}`}>
      <div
        className={
          session.paper.passage === undefined
            ? "check-layout"
            : "check-layout has-passage"
        }
      >
        {header}
        {session.paper.passage === undefined ? null : (
          <section
            className="check-card check-passage"
            aria-labelledby="check-passage"
          >
            <h2 id="check-passage">
              {session.paper.passageTitle ?? "The text"}
            </h2>
            {session.paper.passage.split("\n\n").map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </section>
        )}
        <section className="check-card check-question" aria-live="polite">
          <p className="check-progress">
            {isWarmingUp ? "Warm-up " : "Question "}
            {questionNumber} of {questionTotal}
          </p>
          <ClockDisplay session={session} now={now} />
          {stage.kind === "pausing" || question === undefined ? (
            <p className="check-pause" role="status">
              Get ready…
            </p>
          ) : (
            <>
              {question.passage === undefined ? null : (
                <blockquote className="check-question-passage">
                  {question.passage}
                </blockquote>
              )}
              <p
                className={
                  question.answerShape === "read-aloud"
                    ? "check-prompt check-read-word"
                    : "check-prompt"
                }
              >
                {question.prompt}
              </p>
              <ReadAloudButton
                className="check-read-aloud"
                text={describeCheckQuestionAloud(gameType, question)}
              />
              {question.soundNote === undefined ||
              question.answerShape !== "read-aloud" ? null : (
                <p className="check-sound-note">
                  For the grown-up: {question.soundNote}
                </p>
              )}
              {question.spokenWord === undefined ? null : (
                <button
                  type="button"
                  className="check-hear-again"
                  onClick={() => {
                    if (question.spokenWord !== undefined) {
                      void spokenWord.playSpokenWord(question.spokenWord);
                    }
                  }}
                >
                  Hear it again
                </button>
              )}
              {stage.kind === "answering" &&
              stage.feedback === "answer-shown" ? (
                <button
                  type="button"
                  className="check-carry-on"
                  onClick={() => {
                    applyStep(moveOnFromShownAnswer(session, readTime()));
                  }}
                >
                  Next question
                </button>
              ) : (
                <AnswerArea
                  key={`${String(questionNumber)}-${question.key}`}
                  question={question}
                  isPractice={session.way === "practice"}
                  onAnswer={(givenAnswer) => {
                    applyStep(
                      answerCheckQuestion(session, givenAnswer, readTime()),
                    );
                  }}
                  onMarked={(isReadRight) => {
                    applyStep(
                      markReadAloudQuestion(session, isReadRight, readTime()),
                    );
                  }}
                />
              )}
            </>
          )}
          {feedback === undefined ? null : (
            <ReadAloudMessage>
              <p className={`check-feedback ${feedbackTone}`} role="status">
                {feedback}
              </p>
            </ReadAloudMessage>
          )}
        </section>
      </div>
      {leaveButton}
    </div>
  );
};
