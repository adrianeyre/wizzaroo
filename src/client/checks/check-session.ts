import {
  isCheckAnswerRight,
  type CheckFormat,
  type CheckOutcome,
  type CheckPaper,
  type CheckAnswerTiming,
  type CheckQuestion,
  type CheckWay,
} from "../../curriculum/checks.js";

export type PracticeFeedback = "none" | "right" | "wrong" | "answer-shown";

export type CheckStage =
  | { kind: "warming-up"; index: number; feedback: PracticeFeedback }
  | { kind: "ready-to-start" }
  | {
      kind: "answering";
      index: number;
      startedAt: number;
      wrongAnswerCount: number;
      feedback: PracticeFeedback;
    }
  | { kind: "pausing"; nextIndex: number; endsAt: number }
  | { kind: "finished"; finishedAt: number };

export interface CheckSession {
  format: CheckFormat;
  way: CheckWay;
  isClockOff: boolean;
  paper: CheckPaper;
  warmUp: CheckQuestion[];
  stage: CheckStage;
  outcomes: CheckOutcome[];
  paperStartedAt: number;
}

export interface AnsweredCheckQuestion {
  question: CheckQuestion;
  isRightFirstTime: boolean;
  wrongAnswerCount: number;
  checkAnswer: CheckAnswerTiming;
}

export interface CheckStep {
  session: CheckSession;
  answered: AnsweredCheckQuestion | undefined;
}

const millisecondsPerSecond = 1000;
export const wrongAnswersBeforeShowing = 2;

export const isCheckClockRunning = ({
  way,
  isClockOff,
  format,
}: Pick<CheckSession, "way" | "isClockOff" | "format">): boolean =>
  way === "timed" && !isClockOff && format.clock.kind !== "none";

const buildAnsweringStage = (index: number, now: number): CheckStage => ({
  kind: "answering",
  index,
  startedAt: now,
  wrongAnswerCount: 0,
  feedback: "none",
});

export const startCheckSession = (
  format: CheckFormat,
  way: CheckWay,
  isClockOff: boolean,
  paper: CheckPaper,
  warmUp: readonly CheckQuestion[],
  now: number,
): CheckSession => {
  const isWarmingUp = way === "timed" && warmUp.length > 0;
  return {
    format,
    way,
    isClockOff,
    paper,
    warmUp: isWarmingUp ? [...warmUp] : [],
    stage: isWarmingUp
      ? { kind: "warming-up", index: 0, feedback: "none" }
      : buildAnsweringStage(0, now),
    outcomes: [],
    paperStartedAt: now,
  };
};

export const findCurrentCheckQuestion = (
  session: CheckSession,
): CheckQuestion | undefined => {
  const { stage, paper, warmUp } = session;
  if (stage.kind === "warming-up") {
    return warmUp.at(stage.index);
  }
  return stage.kind === "answering"
    ? paper.questions.at(stage.index)
    : undefined;
};

export const findCheckDeadline = (
  session: CheckSession,
): number | undefined => {
  if (!isCheckClockRunning(session)) {
    return undefined;
  }
  const { clock } = session.format;
  if (clock.kind === "whole-paper") {
    return session.stage.kind === "finished"
      ? undefined
      : session.paperStartedAt + clock.seconds * millisecondsPerSecond;
  }
  if (clock.kind === "per-question" && session.stage.kind === "answering") {
    return (
      session.stage.startedAt + clock.secondsPerQuestion * millisecondsPerSecond
    );
  }
  return undefined;
};

const findPauseMilliseconds = ({ format }: CheckSession): number =>
  format.clock.kind === "per-question"
    ? format.clock.pauseSeconds * millisecondsPerSecond
    : 0;

const moveOnFromQuestion = (
  session: CheckSession,
  outcomes: CheckOutcome[],
  index: number,
  now: number,
): CheckSession => {
  const nextIndex = index + 1;
  if (nextIndex >= session.paper.questions.length) {
    return {
      ...session,
      outcomes,
      stage: { kind: "finished", finishedAt: now },
    };
  }
  const pauseMilliseconds = isCheckClockRunning(session)
    ? findPauseMilliseconds(session)
    : 0;
  return {
    ...session,
    outcomes,
    stage:
      pauseMilliseconds > 0
        ? { kind: "pausing", nextIndex, endsAt: now + pauseMilliseconds }
        : buildAnsweringStage(nextIndex, now),
  };
};

const buildOutcome = (
  question: CheckQuestion,
  isRight: boolean,
  isInTime: boolean,
  millisecondsTaken: number,
): CheckOutcome => ({
  key: question.key,
  questionType: question.questionType,
  skillId: question.skillId,
  isRight,
  isInTime,
  millisecondsTaken: Math.max(0, Math.round(millisecondsTaken)),
});

const isPastDeadline = (session: CheckSession, now: number): boolean => {
  const deadline = findCheckDeadline(session);
  return deadline !== undefined && now > deadline;
};

const answerWarmUp = (
  session: CheckSession,
  index: number,
  isRight: boolean,
): CheckSession => {
  if (!isRight) {
    return {
      ...session,
      stage: { kind: "warming-up", index, feedback: "wrong" },
    };
  }
  const nextIndex = index + 1;
  return {
    ...session,
    stage:
      nextIndex >= session.warmUp.length
        ? { kind: "ready-to-start" }
        : { kind: "warming-up", index: nextIndex, feedback: "right" },
  };
};

const settleQuestion = (
  session: CheckSession,
  isRight: boolean,
  now: number,
): CheckStep => {
  const { stage } = session;
  if (stage.kind === "warming-up") {
    return {
      session: answerWarmUp(session, stage.index, isRight),
      answered: undefined,
    };
  }
  const question = findCurrentCheckQuestion(session);
  if (stage.kind !== "answering" || question === undefined) {
    return { session, answered: undefined };
  }
  const millisecondsTaken = now - stage.startedAt;
  if (session.way === "practice" && !isRight) {
    const wrongAnswerCount = stage.wrongAnswerCount + 1;
    return {
      session: {
        ...session,
        stage: {
          ...stage,
          wrongAnswerCount,
          feedback:
            wrongAnswerCount >= wrongAnswersBeforeShowing
              ? "answer-shown"
              : "wrong",
        },
      },
      answered: undefined,
    };
  }
  const isInTime = !isPastDeadline(session, now);
  const wrongAnswerCount =
    session.way === "practice" ? stage.wrongAnswerCount : isRight ? 0 : 1;
  const outcome = buildOutcome(
    question,
    isRight && wrongAnswerCount === 0,
    isInTime,
    millisecondsTaken,
  );
  const moved = moveOnFromQuestion(
    session,
    [...session.outcomes, outcome],
    stage.index,
    now,
  );
  const practiceFeedback: CheckSession =
    session.way === "practice" && moved.stage.kind === "answering"
      ? { ...moved, stage: { ...moved.stage, feedback: "right" } }
      : moved;
  return {
    session: practiceFeedback,
    answered: session.format.isParentMarked
      ? undefined
      : {
          question,
          isRightFirstTime: outcome.isRight && outcome.isInTime,
          wrongAnswerCount:
            outcome.isRight && outcome.isInTime
              ? 0
              : Math.max(1, wrongAnswerCount),
          checkAnswer: {
            checkWay: session.way,
            millisecondsTaken: outcome.millisecondsTaken,
          },
        },
  };
};

export const answerCheckQuestion = (
  session: CheckSession,
  givenAnswer: string,
  now: number,
): CheckStep => {
  const question = findCurrentCheckQuestion(session);
  if (question === undefined || givenAnswer.trim() === "") {
    return { session, answered: undefined };
  }
  return settleQuestion(
    session,
    isCheckAnswerRight(question, givenAnswer),
    now,
  );
};

export const markReadAloudQuestion = (
  session: CheckSession,
  isReadRight: boolean,
  now: number,
): CheckStep => settleQuestion(session, isReadRight, now);

export const moveOnFromShownAnswer = (
  session: CheckSession,
  now: number,
): CheckStep => {
  const { stage } = session;
  const question = findCurrentCheckQuestion(session);
  if (
    stage.kind !== "answering" ||
    stage.feedback !== "answer-shown" ||
    question === undefined
  ) {
    return { session, answered: undefined };
  }
  const outcome = buildOutcome(question, false, true, now - stage.startedAt);
  return {
    session: moveOnFromQuestion(
      session,
      [...session.outcomes, outcome],
      stage.index,
      now,
    ),
    answered: {
      question,
      isRightFirstTime: false,
      wrongAnswerCount: stage.wrongAnswerCount,
      checkAnswer: {
        checkWay: session.way,
        millisecondsTaken: outcome.millisecondsTaken,
      },
    },
  };
};

export const startCheckAfterWarmUp = (
  session: CheckSession,
  now: number,
): CheckSession =>
  session.stage.kind === "ready-to-start"
    ? { ...session, paperStartedAt: now, stage: buildAnsweringStage(0, now) }
    : session;

export const finishCheckPause = (
  session: CheckSession,
  now: number,
): CheckSession =>
  session.stage.kind === "pausing" && now >= session.stage.endsAt
    ? { ...session, stage: buildAnsweringStage(session.stage.nextIndex, now) }
    : session;

export const expireCheckClock = (
  session: CheckSession,
  now: number,
): CheckStep => {
  const { stage, format, paper } = session;
  if (!isPastDeadline(session, now) || format.clock.kind === "none") {
    return { session, answered: undefined };
  }
  if (format.clock.kind === "per-question") {
    const question = findCurrentCheckQuestion(session);
    if (stage.kind !== "answering" || question === undefined) {
      return { session, answered: undefined };
    }
    const outcome = buildOutcome(
      question,
      false,
      false,
      format.clock.secondsPerQuestion * millisecondsPerSecond,
    );
    return {
      session: moveOnFromQuestion(
        session,
        [...session.outcomes, outcome],
        stage.index,
        now,
      ),
      answered: {
        question,
        isRightFirstTime: false,
        wrongAnswerCount: 1,
        checkAnswer: {
          checkWay: session.way,
          millisecondsTaken: outcome.millisecondsTaken,
        },
      },
    };
  }
  const firstUnanswered = session.outcomes.length;
  const unanswered = paper.questions
    .slice(firstUnanswered)
    .map((question) => buildOutcome(question, false, false, 0));
  return {
    session: {
      ...session,
      outcomes: [...session.outcomes, ...unanswered],
      stage: { kind: "finished", finishedAt: now },
    },
    answered: undefined,
  };
};

export const findCheckSecondsSpent = (session: CheckSession): number =>
  session.stage.kind === "finished"
    ? Math.round(
        (session.stage.finishedAt - session.paperStartedAt) /
          millisecondsPerSecond,
      )
    : 0;

export const findMainCheckSkillId = ({ paper }: CheckSession): string => {
  const counts = new Map<string, number>();
  for (const { skillId } of paper.questions) {
    counts.set(skillId, (counts.get(skillId) ?? 0) + 1);
  }
  const [mainSkillId] = [...counts.entries()]
    .toSorted((first, second) => second[1] - first[1])
    .map(([skillId]) => skillId);
  return mainSkillId;
};
