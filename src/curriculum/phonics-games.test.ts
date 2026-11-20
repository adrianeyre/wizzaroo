import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  parsePhonicsGames,
  phonicsGames,
  phonicsGameScenes,
  splitTiles,
} from "./phonics-games.js";
import { skills } from "./skills.js";

const crystalBlend = {
  id: "crystal-blend",
  title: "Crystal blend",
  skillId: "phonics.blend-sounds-into-words",
  skillName: "Blending sounds to read words",
  strand: "word-reading",
  curriculumObjective: "Apply phonic knowledge and skills to decode words",
  scene: "crystal-tiles",
  choiceProp: "gem",
  ask: "Which word do the sounds make?",
  instruction: "Blend the sounds, then tap the word.",
  hint: "Not quite. Say each sound, then blend them.",
  questions: Array.from({ length: 12 }, (_, index) => ({
    prompt: `sh|i|p${String(index)}`,
    answer: `ship${String(index)}`,
    distractors: ["shop", "chip", "sip"],
  })),
};

const buildYearFile = (games: unknown[], yearGroup: unknown = 1) => ({
  yearGroup,
  games,
});

const changeQuestion = (change: Record<string, unknown>) => ({
  ...crystalBlend,
  questions: [{ ...crystalBlend.questions[0], ...change }].concat(
    crystalBlend.questions.slice(1),
  ),
});

describe("phonicsGames", () => {
  it("holds ten games for Year 1 and ten for Year 2, the years the National Curriculum teaches phonics, and none for later years", () => {
    const countForYear = (yearGroup: number) =>
      phonicsGames.filter((game) => game.yearGroup === yearGroup).length;

    expect(countForYear(1)).toBe(10);
    expect(countForYear(2)).toBe(10);
    expect(phonicsGames).toHaveLength(20);
  });

  it("sets each game in a Year Group in a different scene, so every game looks different", () => {
    for (const yearGroup of [1, 2]) {
      const scenes = phonicsGames
        .filter((game) => game.yearGroup === yearGroup)
        .map(({ scene }) => scene);

      expect(scenes.toSorted()).toEqual([...phonicsGameScenes].toSorted());
    }
  });

  it("makes each game its own Phonics Skill, in the game's Year Group", () => {
    for (const game of phonicsGames) {
      expect(skills.find(({ id }) => id === game.skillId)).toMatchObject({
        subject: "phonics",
        yearGroup: game.yearGroup,
        name: game.skillName,
        sounds: [],
      });
    }
  });

  it("offers each answer as one of the choices, with no choice twice", () => {
    for (const game of phonicsGames) {
      for (const { answer, distractors } of game.questions) {
        expect(distractors).not.toContain(answer);
        expect(new Set(distractors).size).toBe(distractors.length);
      }
    }
  });

  it("spells each Crystal blend word with exactly its sound tiles", () => {
    const blend = phonicsGames.find(({ id }) => id === "crystal-blend");

    expect(blend?.questions.length).toBeGreaterThanOrEqual(12);
    for (const { prompt, answer } of blend?.questions ?? []) {
      expect(splitTiles(prompt).join("")).toBe(answer);
    }
  });

  it("only offers a real or alien choice in Real or alien?", () => {
    const realOrAlien = phonicsGames.find(({ id }) => id === "real-or-alien");

    for (const { answer, distractors } of realOrAlien?.questions ?? []) {
      expect([answer, ...distractors].toSorted()).toEqual([
        "alien word",
        "real word",
      ]);
    }
  });
});

describe("parsePhonicsGames", () => {
  it("keeps a game's fields and adds the Year Group of its file", () => {
    expect(parsePhonicsGames([buildYearFile([crystalBlend], 2)])).toEqual([
      { ...crystalBlend, yearGroup: 2 },
    ]);
  });

  it.each([
    ["a file with no Year Group", buildYearFile([crystalBlend], 7)],
    ["a file with no games", buildYearFile([])],
    [
      "two games in one year in the same scene",
      buildYearFile([
        crystalBlend,
        {
          ...crystalBlend,
          id: "other",
          title: "Other",
          skillId: "phonics.other",
        },
      ]),
    ],
    [
      "a scene it can't draw",
      buildYearFile([{ ...crystalBlend, scene: "volcano" }]),
    ],
    [
      "a choice prop it can't draw",
      buildYearFile([{ ...crystalBlend, choiceProp: "bubble" }]),
    ],
    [
      "fewer than 12 questions",
      buildYearFile([
        { ...crystalBlend, questions: crystalBlend.questions.slice(1) },
      ]),
    ],
    [
      "the same prompt twice",
      buildYearFile([
        changeQuestion({ prompt: crystalBlend.questions[1].prompt }),
      ]),
    ],
    [
      "the answer offered again as a distractor",
      buildYearFile([changeQuestion({ distractors: ["ship0"] })]),
    ],
    [
      "more than three distractors",
      buildYearFile([changeQuestion({ distractors: ["a", "b", "c", "d"] })]),
    ],
    [
      "a choice too long for its button",
      buildYearFile([changeQuestion({ answer: "extraordinarily" })]),
    ],
    [
      "too many sound tiles",
      buildYearFile([changeQuestion({ prompt: "s|p|l|a|s|h" })]),
    ],
    [
      "a prompt too long for a compact scene",
      buildYearFile([
        {
          ...crystalBlend,
          scene: "lantern",
          questions: crystalBlend.questions.map((question, index) => ({
            ...question,
            prompt: `a much too long prompt ${String(index)}`,
          })),
        },
      ]),
    ],
    ["an empty hint", buildYearFile([{ ...crystalBlend, hint: " " }])],
  ])("refuses %s", (_, content) => {
    expect(() => parsePhonicsGames([content])).toThrow(
      InvalidCurriculumFileError,
    );
  });

  it("refuses two games with the same title across Year Groups", () => {
    const secondYear = {
      ...crystalBlend,
      id: "second-blend",
      skillId: "phonics.second-blend",
    };

    expect(() =>
      parsePhonicsGames([
        buildYearFile([crystalBlend], 1),
        buildYearFile([secondYear], 2),
      ]),
    ).toThrow('Two Phonics games share the title "Crystal blend"');
  });
});
