import { describe, expect, it } from "vitest";
import {
  checkFormats,
  type CheckFormat,
  type CheckPaper,
  type CheckQuestion,
} from "../../curriculum/checks.js";
import {
  answerCheckQuestion,
  expireCheckClock,
  findCheckDeadline,
  findCurrentCheckQuestion,
  findMainCheckSkillId,
  finishCheckPause,
  markReadAloudQuestion,
  moveOnFromShownAnswer,
  startCheckAfterWarmUp,
  startCheckSession,
  type CheckSession,
} from "./check-session.js";

const buildQuestion = (
  answer: number,
  skillId = "maths.times-tables-to-12",
): CheckQuestion => ({
  key: `q${String(answer)}`,
  skillId,
  questionType: "fact",
  prompt: `? = ${String(answer)}`,
  passage: undefined,
  spokenWord: undefined,
  answerShape: "number",
  choices: [],
  acceptedAnswers: [String(answer)],
});

const paper: CheckPaper = {
  passageTitle: undefined,
  passage: undefined,
  questions: [buildQuestion(1), buildQuestion(2), buildQuestion(3)],
};

const timesTables = checkFormats["times-tables-check"];
const wholePaper: CheckFormat = {
  ...checkFormats["arithmetic-check"],
  clock: { kind: "whole-paper", seconds: 60 },
};

const start = (
  format: CheckFormat,
  way: "practice" | "timed",
  isClockOff = false,
  warmUp: CheckQuestion[] = [],
): CheckSession => startCheckSession(format, way, isClockOff, paper, warmUp, 0);

describe("a Timed Check with a clock for each question", () => {
  it("records each answer without hints, pauses 3 seconds, then starts the next question's 6 seconds", () => {
    const session = start(timesTables, "timed");

    expect(findCheckDeadline(session)).toBe(6000);
    const wrong = answerCheckQuestion(session, "9", 2000);
    expect(wrong.answered).toMatchObject({
      isRightFirstTime: false,
      wrongAnswerCount: 1,
    });
    expect(wrong.session.outcomes[0]).toMatchObject({
      isRight: false,
      isInTime: true,
      millisecondsTaken: 2000,
    });
    expect(wrong.session.stage).toEqual({
      kind: "pausing",
      nextIndex: 1,
      endsAt: 5000,
    });
    expect(finishCheckPause(wrong.session, 4999).stage.kind).toBe("pausing");
    const next = finishCheckPause(wrong.session, 5000);
    expect(findCurrentCheckQuestion(next)?.key).toBe("q2");
    expect(findCheckDeadline(next)).toBe(11_000);
  });

  it("marks a question the clock runs out on as not in time and moves on, failing nothing", () => {
    const session = start(timesTables, "timed");

    expect(expireCheckClock(session, 6000).session).toBe(session);
    const expired = expireCheckClock(session, 6001);
    expect(expired.session.outcomes[0]).toMatchObject({
      isRight: false,
      isInTime: false,
    });
    expect(expired.session.stage.kind).toBe("pausing");
    expect(expired.answered?.isRightFirstTime).toBe(false);
  });

  it("finishes after the last question", () => {
    let session = start(timesTables, "timed");
    let now = 0;
    for (const answer of ["1", "2", "3"]) {
      session = answerCheckQuestion(session, answer, now + 1000).session;
      now =
        session.stage.kind === "pausing" ? session.stage.endsAt : now + 1000;
      session = finishCheckPause(session, now);
    }

    expect(session.stage.kind).toBe("finished");
    expect(session.outcomes.every(({ isRight }) => isRight)).toBe(true);
  });

  it("keeps the format but stops the clock when a Parent has taken it away", () => {
    const session = start(timesTables, "timed", true);

    expect(findCheckDeadline(session)).toBeUndefined();
    const answered = answerCheckQuestion(session, "1", 60_000);
    expect(answered.session.outcomes[0].isInTime).toBe(true);
    expect(answered.session.stage.kind).toBe("answering");
  });

  it("warms up first, with no score, then starts the clock when the Child is ready", () => {
    const warmUp = [buildQuestion(5)];
    const session = start(timesTables, "timed", false, warmUp);

    expect(findCurrentCheckQuestion(session)?.key).toBe("q5");
    expect(answerCheckQuestion(session, "4", 100).session.stage).toEqual({
      kind: "warming-up",
      index: 0,
      feedback: "wrong",
    });
    const warmedUp = answerCheckQuestion(session, "5", 100);
    expect(warmedUp.answered).toBeUndefined();
    expect(warmedUp.session.stage.kind).toBe("ready-to-start");
    const started = startCheckAfterWarmUp(warmedUp.session, 10_000);
    expect(findCheckDeadline(started)).toBe(16_000);
    expect(started.outcomes).toEqual([]);
  });
});

describe("a Timed Check with a clock for the whole paper", () => {
  it("marks every question left as not in time when the paper's clock runs out", () => {
    const answered = answerCheckQuestion(start(wholePaper, "timed"), "1", 1000);

    expect(answered.session.stage.kind).toBe("answering");
    expect(findCheckDeadline(answered.session)).toBe(60_000);
    const expired = expireCheckClock(answered.session, 60_001);
    expect(expired.session.stage.kind).toBe("finished");
    expect(expired.session.outcomes.map(({ isInTime }) => isInTime)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("Practice", () => {
  it("has no clock, gives a hint after a wrong answer, and shows the answer after two", () => {
    const session = start(timesTables, "practice");

    expect(findCheckDeadline(session)).toBeUndefined();
    const once = answerCheckQuestion(session, "7", 100);
    expect(once.answered).toBeUndefined();
    expect(once.session.stage).toMatchObject({
      feedback: "wrong",
      wrongAnswerCount: 1,
    });
    const twice = answerCheckQuestion(once.session, "8", 200);
    expect(twice.session.stage).toMatchObject({ feedback: "answer-shown" });
    const movedOn = moveOnFromShownAnswer(twice.session, 300);
    expect(movedOn.answered).toMatchObject({
      isRightFirstTime: false,
      wrongAnswerCount: 2,
    });
    expect(movedOn.session.outcomes[0].isRight).toBe(false);
    expect(findCurrentCheckQuestion(movedOn.session)?.key).toBe("q2");
  });

  it("counts a right answer after a wrong one as practised, not right first time", () => {
    const once = answerCheckQuestion(start(timesTables, "practice"), "7", 100);
    const right = answerCheckQuestion(once.session, "1", 200);

    expect(right.answered).toMatchObject({
      isRightFirstTime: false,
      wrongAnswerCount: 1,
    });
    expect(right.session.stage).toMatchObject({
      kind: "answering",
      index: 1,
      feedback: "right",
    });
  });

  it("ignores an empty answer", () => {
    const session = start(timesTables, "practice");

    expect(answerCheckQuestion(session, "  ", 100).session).toBe(session);
  });
});

describe("a Check a Parent marks", () => {
  it("scores what the Parent taps, but never reports it towards Mastery", () => {
    const phonics = checkFormats["phonics-screening-check"];
    const session = start(phonics, "timed");

    expect(findCheckDeadline(session)).toBeUndefined();
    const marked = markReadAloudQuestion(session, true, 100);
    expect(marked.answered).toBeUndefined();
    expect(marked.session.outcomes[0].isRight).toBe(true);
    expect(
      markReadAloudQuestion(marked.session, false, 200).session.outcomes[1]
        .isRight,
    ).toBe(false);
  });
});

describe("findMainCheckSkillId", () => {
  it("names the Skill most of the paper plays", () => {
    const session = startCheckSession(
      wholePaper,
      "timed",
      false,
      {
        ...paper,
        questions: [
          buildQuestion(1, "maths.a"),
          buildQuestion(2, "maths.b"),
          buildQuestion(3, "maths.b"),
        ],
      },
      [],
      0,
    );

    expect(findMainCheckSkillId(session)).toBe("maths.b");
  });
});
