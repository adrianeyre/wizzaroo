import { describe, expect, it } from "vitest";
import {
  buildCheckHistory,
  buildQuestionTypeScores,
  checkFormats,
  checkGameTypes,
  countCheckScore,
  isCheckAnswerRight,
  isCheckResultPossible,
  listFactsToPractise,
  quickestRightCheckAnswerMilliseconds,
  parseCheckNumber,
  type CheckOutcome,
} from "./checks.js";

const buildOutcome = (
  key: string,
  isRight: boolean,
  isInTime = true,
  questionType = "7-times-table",
): CheckOutcome => ({
  key,
  questionType,
  skillId: "maths.times-tables-to-12",
  isRight,
  isInTime,
  millisecondsTaken: 2000,
});

describe("checkFormats", () => {
  it("copies the Multiplication Tables Check: 25 questions, 6 seconds each, 3 seconds between, after 3 warm-ups", () => {
    expect(checkFormats["times-tables-check"]).toMatchObject({
      questionCount: 25,
      warmUpCount: 3,
      clock: { kind: "per-question", secondsPerQuestion: 6, pauseSeconds: 3 },
    });
  });

  it("keeps every Check short enough to fit a Mission", () => {
    for (const gameType of checkGameTypes) {
      const { clock } = checkFormats[gameType];
      if (clock.kind === "whole-paper") {
        expect(clock.seconds, gameType).toBeLessThanOrEqual(12 * 60);
      }
    }
  });

  it("has the Phonics Screening Check marked by a Parent with no clock, and only the Spelling paper needing a connection", () => {
    expect(
      checkGameTypes.filter(
        (gameType) => checkFormats[gameType].isParentMarked,
      ),
    ).toEqual(["phonics-screening-check"]);
    expect(checkFormats["phonics-screening-check"].clock.kind).toBe("none");
    expect(
      checkGameTypes.filter(
        (gameType) => checkFormats[gameType].needsConnection,
      ),
    ).toEqual(["spelling-check"]);
  });
});

describe("parseCheckNumber", () => {
  it.each([
    ["56", 56],
    [" 1,234 ", 1234],
    ["0.75", 0.75],
    [".5", 0.5],
    ["3/4", 0.75],
    ["1 1/2", 1.5],
    ["−3", -3],
    ["25%", 25],
    ["£51", 51],
    ["£ 4.50", 4.5],
    ["2 500 000", 2500000],
  ])("reads %s as %d", (text, value) => {
    expect(parseCheckNumber(text)).toBeCloseTo(value);
  });

  it.each(["", "seven", "1/0", "1.2.3"])("refuses %s", (text) => {
    expect(parseCheckNumber(text)).toBeUndefined();
  });
});

describe("isCheckAnswerRight", () => {
  it("accepts any way of writing the same number, including an equivalent fraction", () => {
    const question = {
      answerShape: "number" as const,
      acceptedAnswers: ["3/4"],
    };

    expect(isCheckAnswerRight(question, "0.75")).toBe(true);
    expect(isCheckAnswerRight(question, "6/8")).toBe(true);
    expect(isCheckAnswerRight(question, "4/3")).toBe(false);
  });

  it("matches words whatever their case, spacing or closing full stop", () => {
    const question = {
      answerShape: "words" as const,
      acceptedAnswers: ["accommodate"],
    };

    expect(isCheckAnswerRight(question, "  Accommodate. ")).toBe(true);
    expect(isCheckAnswerRight(question, "acommodate")).toBe(false);
  });

  it("needs the exact choice", () => {
    const question = {
      answerShape: "choice" as const,
      acceptedAnswers: ["an adverb"],
    };

    expect(isCheckAnswerRight(question, "an adverb")).toBe(true);
    expect(isCheckAnswerRight(question, "an adjective")).toBe(false);
  });
});

describe("scoring", () => {
  const outcomes = [
    buildOutcome("7x8", true),
    buildOutcome("6x7", false),
    buildOutcome("9x9", true, false, "9-times-table"),
  ];

  it("scores only answers that were right and in time", () => {
    expect(countCheckScore(outcomes)).toBe(1);
    expect(listFactsToPractise(outcomes)).toEqual(["6x7", "9x9"]);
  });

  it("scores each question type", () => {
    expect(buildQuestionTypeScores(outcomes)).toEqual([
      { questionType: "7-times-table", score: 1, questionCount: 2 },
      { questionType: "9-times-table", score: 0, questionCount: 1 },
    ]);
  });

  it("lists the Check History newest first, with each score worked out", () => {
    const history = buildCheckHistory([
      {
        result: {
          checkGameType: "times-tables-check",
          isClockOff: false,
          outcomes,
        },
        finishedAt: "2026-11-01T10:00:00.000Z",
        localDate: "2026-11-01",
      },
      {
        result: {
          checkGameType: "times-tables-check",
          isClockOff: true,
          outcomes: outcomes.slice(0, 1),
        },
        finishedAt: "2026-11-02T10:00:00.000Z",
        localDate: "2026-11-02",
      },
    ]);

    expect(
      history.map(({ localDate, score, questionCount, isClockOff }) => [
        localDate,
        score,
        questionCount,
        isClockOff,
      ]),
    ).toEqual([
      ["2026-11-02", 1, 1, true],
      ["2026-11-01", 1, 3, false],
    ]);
  });
});

describe("isCheckResultPossible", () => {
  const buildOutcomes = (count: number, millisecondsTaken = 2000) =>
    Array.from({ length: count }, (_, index) => ({
      ...buildOutcome(`${String(index + 1)}x7`, true),
      millisecondsTaken,
    }));

  it("takes a Check with as many outcomes as its paper asks, or fewer, each right answer taking a human's time", () => {
    for (const checkGameType of checkGameTypes) {
      const { questionCount } = checkFormats[checkGameType];

      expect(
        isCheckResultPossible({
          checkGameType,
          outcomes: buildOutcomes(questionCount),
        }),
      ).toBe(true);
      expect(
        isCheckResultPossible({ checkGameType, outcomes: buildOutcomes(1) }),
      ).toBe(true);
    }
  });

  it("sets aside a Check with more outcomes than its paper asks (#324)", () => {
    for (const checkGameType of checkGameTypes) {
      const { questionCount } = checkFormats[checkGameType];

      expect(
        isCheckResultPossible({
          checkGameType,
          outcomes: buildOutcomes(questionCount + 1),
        }),
      ).toBe(false);
    }
  });

  it("sets aside a Check with a right answer quicker than anyone could give one, but keeps a question the clock ran out on at no time at all (#324)", () => {
    const tooQuick = [
      ...buildOutcomes(3),
      {
        ...buildOutcome("9x7", true),
        millisecondsTaken: quickestRightCheckAnswerMilliseconds - 1,
      },
    ];
    const ranOut = [
      ...buildOutcomes(3),
      { ...buildOutcome("9x7", false, false), millisecondsTaken: 0 },
    ];
    const justQuickEnough = buildOutcomes(
      3,
      quickestRightCheckAnswerMilliseconds,
    );

    expect(
      isCheckResultPossible({
        checkGameType: "times-tables-check",
        outcomes: tooQuick,
      }),
    ).toBe(false);
    expect(
      isCheckResultPossible({
        checkGameType: "arithmetic-check",
        outcomes: ranOut,
      }),
    ).toBe(true);
    expect(
      isCheckResultPossible({
        checkGameType: "times-tables-check",
        outcomes: justQuickEnough,
      }),
    ).toBe(true);
  });
});
