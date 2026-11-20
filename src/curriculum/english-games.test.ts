import { describe, expect, it } from "vitest";
import { englishGames, englishGameTypes } from "./english-games.js";
import { gapMark, type EnglishQuestion } from "./english-questions.js";
import { skills, yearGroups } from "./skills.js";

const smallestQuestionBank = 8;
const longestPassageWords = 70;

const countWords = (text: string): number =>
  text.split(/\s+/).filter((word) => word !== "").length;

const describePrompt = ({ prompt }: EnglishQuestion): string =>
  JSON.stringify(prompt);

const listSentenceWords = (sentence: string): string[] =>
  sentence.split(/[\s.,!?;:"]+/).filter((word) => word !== "");

const everyGameYear = englishGameTypes.flatMap((gameType) =>
  yearGroups.map((yearGroup) => ({
    gameType,
    yearGroup,
    gameYear: englishGames[gameType][yearGroup],
  })),
);

describe("the English games", () => {
  it("gives every one of the 12 games its own Skill in each of Years 1 to 6, 72 in all", () => {
    const skillIds = everyGameYear.map(({ gameYear }) => gameYear.skillId);

    expect(skillIds).toHaveLength(72);
    expect(new Set(skillIds).size).toBe(72);
  });

  it("teaches Reading comprehension through story scrolls and Writing composition through story builder in every Year", () => {
    const listStrands = (gameType: "story-scrolls" | "story-builder") =>
      yearGroups.map(
        (yearGroup) =>
          skills.find(
            ({ id }) => id === englishGames[gameType][yearGroup].skillId,
          )?.strand,
      );

    expect(new Set(listStrands("story-scrolls"))).toEqual(
      new Set(["reading-comprehension"]),
    );
    expect(new Set(listStrands("story-builder"))).toEqual(
      new Set(["writing-composition"]),
    );
  });

  describe.each(everyGameYear)(
    "$gameType in Year $yearGroup",
    ({ yearGroup, gameYear }) => {
      it("plays an English Skill placed in that Year Group", () => {
        const skill = skills.find(({ id }) => id === gameYear.skillId);

        expect(skill?.subject).toBe("english");
        expect(skill?.yearGroup).toBe(yearGroup);
      });

      it(`asks at least ${String(smallestQuestionBank)} different questions, each with its own words to read`, () => {
        const prompts = gameYear.questions.map(describePrompt);

        expect(gameYear.questions.length).toBeGreaterThanOrEqual(
          smallestQuestionBank,
        );
        expect(new Set(prompts).size).toBe(prompts.length);
        expect(gameYear.ask.trim()).not.toBe("");
        expect(gameYear.hint.trim()).not.toBe("");
      });

      it("never offers the answer as a wrong choice, and always offers one wrong choice or more", () => {
        for (const { answer, slips } of gameYear.questions) {
          expect(answer.trim()).not.toBe("");
          expect(slips.length).toBeGreaterThan(0);
          expect(slips).not.toContain(answer);
        }
      });

      it("shapes each prompt so the scene can show it", () => {
        for (const { prompt, answer, slips } of gameYear.questions) {
          if (prompt.kind === "sequence") {
            expect(
              prompt.items.filter((item) => item === gapMark),
            ).toHaveLength(1);
          }
          if (prompt.kind === "word-class") {
            const words = listSentenceWords(prompt.sentence);
            for (const choice of [answer, ...slips]) {
              expect(words).toContain(choice);
            }
          }
          if (prompt.kind === "sentence-gap") {
            expect(`${prompt.before}${prompt.after}`).not.toContain(gapMark);
          }
          if (prompt.kind === "story-plan") {
            expect(
              prompt.steps.filter((step) => step === gapMark),
            ).toHaveLength(1);
            expect(prompt.steps.length).toBeGreaterThan(1);
          }
          if (prompt.kind === "passage") {
            expect(prompt.paragraphs.length).toBeGreaterThan(0);
            expect(countWords(prompt.paragraphs.join(" "))).toBeLessThanOrEqual(
              longestPassageWords,
            );
          }
        }
      });
    },
  );
});
