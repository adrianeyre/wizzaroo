import { describe, expect, it } from "vitest";
import {
  checkPaperBuilders,
  checkPracticePaperBuilders,
  checkQuestionTypeNames,
  checkSkillIds,
  findCheckQuestionTypeName,
} from "./check-papers.js";
import {
  checkFormats,
  checkGameTypes,
  isCheckAnswerRight,
  type CheckPaper,
  type CheckQuestion,
} from "./checks.js";
import { skills } from "./skills.js";

const seeds = [1, 7, 42, 2024, 99_991];

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const skillIds = new Set(skills.map(({ id }) => id));

const listWrongChoices = ({ choices, acceptedAnswers }: CheckQuestion) =>
  choices.filter((choice) => !acceptedAnswers.includes(choice));

const checkPapersToTest = checkGameTypes.flatMap((gameType) =>
  seeds.map((seed) => ({
    gameType,
    seed,
    paper: checkPaperBuilders[gameType](buildSeededRandom(seed)),
  })),
);

const expectQuestionsAnswerable = (paper: CheckPaper) => {
  for (const question of paper.questions) {
    expect(question.acceptedAnswers.length, question.key).toBeGreaterThan(0);
    if (question.answerShape === "read-aloud") {
      expect(question.acceptedAnswers, question.key).toEqual([question.prompt]);
      continue;
    }
    for (const acceptedAnswer of question.acceptedAnswers) {
      expect(isCheckAnswerRight(question, acceptedAnswer), question.key).toBe(
        true,
      );
    }
    if (question.answerShape === "choice") {
      expect(new Set(question.choices).size, question.key).toBe(
        question.choices.length,
      );
      expect(listWrongChoices(question).length, question.key).toBeGreaterThan(
        0,
      );
      for (const wrongChoice of listWrongChoices(question)) {
        expect(isCheckAnswerRight(question, wrongChoice), question.key).toBe(
          false,
        );
      }
    } else {
      expect(question.choices, question.key).toEqual([]);
      expect(isCheckAnswerRight(question, "")).toBe(false);
    }
  }
};

describe("the Check papers", () => {
  describe.each(checkPapersToTest)(
    "the $gameType paper from seed $seed",
    ({ gameType, paper }) => {
      it("asks exactly the number of questions its format gives", () => {
        expect(paper.questions).toHaveLength(
          checkFormats[gameType].questionCount,
        );
      });

      it("plays only Skills in the curriculum", () => {
        for (const { skillId } of paper.questions) {
          expect(skillIds.has(skillId), skillId).toBe(true);
        }
      });

      it("never repeats a key", () => {
        const keys = paper.questions.map(({ key }) => key);

        expect(new Set(keys).size).toBe(keys.length);
      });

      it("accepts every answer it lists, and turns down wrong ones", () => {
        expectQuestionsAnswerable(paper);
      });

      it("names every question type it asks", () => {
        for (const { questionType } of paper.questions) {
          expect(
            Object.hasOwn(checkQuestionTypeNames[gameType], questionType),
            questionType,
          ).toBe(true);
          expect(findCheckQuestionTypeName(gameType, questionType)).not.toBe(
            questionType,
          );
        }
      });

      it("only reads aloud on the Parent-marked Check", () => {
        const readsAloud = paper.questions.some(
          ({ answerShape }) => answerShape === "read-aloud",
        );

        expect(readsAloud).toBe(checkFormats[gameType].isParentMarked);
      });
    },
  );

  it.each(checkGameTypes)(
    "builds the same %s paper from the same seed",
    (gameType) => {
      const first = checkPaperBuilders[gameType](buildSeededRandom(5));
      const second = checkPaperBuilders[gameType](buildSeededRandom(5));
      const other = checkPaperBuilders[gameType](buildSeededRandom(6));

      expect(second).toEqual(first);
      expect(other).not.toEqual(first);
    },
  );

  it("carries a passage only on the Reading paper", () => {
    for (const { gameType, paper } of checkPapersToTest) {
      const hasPassage = paper.passage !== undefined;

      expect(hasPassage, gameType).toBe(gameType === "reading-check");
      expect(paper.passageTitle !== undefined, gameType).toBe(hasPassage);
    }
  });

  it("gives the Phonics check a Practice paper of its own that the Child answers alone", () => {
    const build = checkPracticePaperBuilders["phonics-screening-check"];

    expect(build).toBeDefined();
    for (const seed of seeds) {
      const paper = build?.(buildSeededRandom(seed));

      expect(paper?.questions).toHaveLength(10);
      expect(
        paper?.questions.every(({ answerShape }) => answerShape === "choice"),
      ).toBe(true);
      if (paper !== undefined) {
        expectQuestionsAnswerable(paper);
      }
    }
  });

  it("has no Practice paper of its own for the other Checks", () => {
    expect(Object.keys(checkPracticePaperBuilders)).toEqual([
      "phonics-screening-check",
    ]);
  });
});

describe("checkSkillIds", () => {
  it("lists every Skill each Check's papers can play, so the World Map knows where each Skill is taught", () => {
    for (const gameType of checkGameTypes) {
      for (const seed of seeds) {
        for (const { skillId } of checkPaperBuilders[gameType](
          buildSeededRandom(seed),
        ).questions) {
          expect(checkSkillIds[gameType], gameType).toContain(skillId);
        }
      }
      for (const skillId of checkSkillIds[gameType]) {
        expect(
          skills.some(({ id }) => id === skillId),
          skillId,
        ).toBe(true);
      }
    }
  });
});
