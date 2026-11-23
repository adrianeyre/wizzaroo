import { describe, expect, it } from "vitest";
import { InvalidCurriculumFileError } from "./curriculum-file.js";
import {
  buildLabSkillFiles,
  findLabGame,
  longestAskCharacters,
  longestChoiceCharacters,
  parseLabGames,
  labGames,
  labStations,
} from "./lab-games.js";
import { subjectLabGameFiles } from "./lab-game-files.js";
import { skills } from "./skills.js";
import { yearGroups } from "./year-groups.js";

const subjectLabGameIds = new Set(
  parseLabGames([], subjectLabGameFiles).map(({ id }) => id),
);

const buildGame = (station: string, id: string) => ({
  id,
  title: "Animal Groups",
  station,
  prop: "egg",
  skillName: "Sorting animals into groups",
  strand: "animals-including-humans",
  statutoryRequirement:
    "Identify and name a variety of common animals including fish, amphibians, reptiles, birds and mammals",
  instruction: "Tap the group each animal belongs to.",
  hint: "Think about how the animal is covered.",
  questions: Array.from({ length: 6 }, (_, index) =>
    station === "true-false"
      ? {
          ask: `A frog is an amphibian, number ${String(index)}`,
          answer: "True",
          distractors: ["False"],
        }
      : {
          ask: `A frog, number ${String(index)}`,
          answer: "Amphibian",
          distractors: ["Fish", "Reptile", "Mammal"],
        },
  ),
});

const buildYearFile = (yearGroup: number, prefix = "first") => ({
  yearGroup,
  games: labStations.map((station) =>
    buildGame(station, `${prefix}-${station}`),
  ),
});

const replaceFirstQuestion = (question: object) => {
  const yearFile = buildYearFile(1);
  const [firstGame, ...otherGames] = yearFile.games;
  const [, ...otherQuestions] = firstGame.questions;
  return {
    ...yearFile,
    games: [
      { ...firstGame, questions: [question, ...otherQuestions] },
      ...otherGames,
    ],
  };
};

describe("labGames", () => {
  it("holds 10 different Science games at the stations for each Year Group from 1 to 6", () => {
    const scienceStationGames = labGames.filter(
      ({ id }) => !subjectLabGameIds.has(id),
    );
    expect(scienceStationGames).toHaveLength(60);
    for (const yearGroup of yearGroups) {
      const gamesInYear = scienceStationGames.filter(
        (game) => game.yearGroup === yearGroup,
      );
      expect(gamesInYear.map(({ station }) => station)).toEqual([
        ...labStations,
      ]);
      expect(new Set(gamesInYear.map(({ title }) => title)).size).toBe(10);
    }
  });

  it("names every game's statutory requirement and gives it enough questions for a Mission", () => {
    for (const game of labGames) {
      expect(game.statutoryRequirement.length).toBeGreaterThan(20);
      expect(game.questions.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("offers exactly one right answer among choices short enough for the 3D labels", () => {
    for (const { questions } of labGames) {
      for (const { ask, answer, distractors } of questions) {
        const choices = [answer, ...distractors];
        expect(new Set(choices).size).toBe(choices.length);
        expect(ask.length).toBeLessThanOrEqual(longestAskCharacters);
        for (const choice of choices) {
          expect(choice.length).toBeLessThanOrEqual(longestChoiceCharacters);
        }
      }
    }
  });

  it("gives every game its own Skill, in the game's own Subject", () => {
    const skillIds = labGames.map(({ skillId }) => skillId);

    expect(new Set(skillIds).size).toBe(skillIds.length);
    for (const { skillId, subject } of labGames) {
      expect(skillId.startsWith(`${subject}.`), skillId).toBe(true);
    }
  });
});

describe("Habitat Homes", () => {
  it("shows each animal as itself, not the game's tree", () => {
    const game = findLabGame("second-habitat-homes");

    expect(game?.questions.map(({ ask, model }) => [ask, model])).toEqual([
      ["A snowy owl", "snowy-owl"],
      ["A camel", "camel"],
      ["A shark", "shark"],
      ["A squirrel", "squirrel"],
      ["An arctic fox", "arctic-fox"],
      ["A fennec fox", "fennec-fox"],
      ["A jellyfish", "jellyfish"],
      ["A badger", "badger"],
    ]);
  });
});

describe("findLabGame", () => {
  it("finds a game by its ID, and nothing for an ID it doesn't know", () => {
    const [firstGame] = labGames;

    expect(findLabGame(firstGame.id)).toBe(firstGame);
    expect(findLabGame("not-a-game")).toBeUndefined();
  });
});

describe("buildLabSkillFiles", () => {
  it("turns each game into a Skill file in its Year Group and strand", () => {
    const [game] = parseLabGames([buildYearFile(2)]);

    expect(buildLabSkillFiles([game])).toEqual([
      {
        id: "science.first-sort",
        name: "Sorting animals into groups",
        subject: "science",
        yearGroup: 2,
        strand: "animals-including-humans",
        prerequisites: [],
      },
    ]);
  });
});

describe("parseLabGames", () => {
  it("reads a valid year of games", () => {
    expect(parseLabGames([buildYearFile(1)])).toHaveLength(10);
  });

  it.each([
    ["a Year Group of 7", { ...buildYearFile(1), yearGroup: 7 }],
    [
      "a year missing a station",
      { ...buildYearFile(1), games: buildYearFile(1).games.slice(1) },
    ],
    [
      "a station it doesn't know",
      {
        ...buildYearFile(1),
        games: buildYearFile(1).games.with(
          0,
          buildGame("guess", "first-guess"),
        ),
      },
    ],
    [
      "a question with only two distractors",
      replaceFirstQuestion({
        ask: "A frog",
        answer: "Amphibian",
        distractors: ["Fish", "Reptile"],
      }),
    ],
    [
      "a choice too long for its label",
      replaceFirstQuestion({
        ask: "A frog",
        answer: "An amphibian with smooth skin",
        distractors: ["Fish", "Reptile", "Mammal"],
      }),
    ],
    [
      "the answer offered again as a distractor",
      replaceFirstQuestion({
        ask: "A frog",
        answer: "Amphibian",
        distractors: ["Amphibian", "Reptile", "Mammal"],
      }),
    ],
    [
      "an ask too long to read",
      replaceFirstQuestion({
        ask: "A".repeat(longestAskCharacters + 1),
        answer: "Amphibian",
        distractors: ["Fish", "Reptile", "Mammal"],
      }),
    ],
    [
      "a question showing a model it doesn't know",
      replaceFirstQuestion({
        ask: "A frog",
        answer: "Amphibian",
        distractors: ["Fish", "Reptile", "Mammal"],
        model: "dragon",
      }),
    ],
    [
      "a question with a field it doesn't know",
      replaceFirstQuestion({
        ask: "A frog",
        answer: "Amphibian",
        distractors: ["Fish", "Reptile", "Mammal"],
        explanation: "Frogs live on land and in water",
      }),
    ],
  ])("refuses %s", (_, yearFile) => {
    expect(() => parseLabGames([yearFile])).toThrow(InvalidCurriculumFileError);
  });

  it("reads the model a question shows, an item or one of the props, and none when it names none", () => {
    const yearFile = replaceFirstQuestion({
      ask: "A jellyfish",
      answer: "Ocean",
      distractors: ["Desert", "Polar", "Woodland"],
      model: "jellyfish",
    });
    const [firstGame, ...otherGames] = yearFile.games;
    const games = [
      {
        ...firstGame,
        questions: firstGame.questions.with(1, {
          ask: "The Moon",
          answer: "Space",
          distractors: ["Desert", "Polar", "Woodland"],
          model: "moon",
        }),
      },
      ...otherGames,
    ];

    const [{ questions }] = parseLabGames([{ ...yearFile, games }]);

    expect(questions[0].model).toBe("jellyfish");
    expect(questions[1].model).toBe("moon");
    expect(questions[2].model).toBeUndefined();
  });

  it("reads a game whose prop is a lab item, and refuses one it doesn't know", () => {
    const yearFile = buildYearFile(1);
    const withProp = (prop: string) => ({
      ...yearFile,
      games: yearFile.games.with(0, { ...yearFile.games[0], prop }),
    });

    expect(parseLabGames([withProp("camel")])[0].prop).toBe("camel");
    expect(() => parseLabGames([withProp("dragon")])).toThrow("needs a prop");
  });

  it("refuses a true-or-false question with any choice but True and False", () => {
    const yearFile = buildYearFile(1);
    const trueFalseGame = yearFile.games[2];
    const games = yearFile.games.with(2, {
      ...trueFalseGame,
      questions: trueFalseGame.questions.with(0, {
        ask: "A frog is a fish",
        answer: "False",
        distractors: ["Maybe"],
      }),
    });

    expect(() => parseLabGames([{ ...yearFile, games }])).toThrow(
      "needs True and False as its only choices",
    );
  });

  it("refuses two games with the same ID", () => {
    expect(() => parseLabGames([buildYearFile(1), buildYearFile(2)])).toThrow(
      'Two lab games have the ID "first-sort"',
    );
  });

  it("refuses two files for the same Year Group", () => {
    expect(() =>
      parseLabGames([buildYearFile(1), buildYearFile(1, "second")]),
    ).toThrow("Two Science games files are for Year 1");
  });

  it("refuses a game that asks the same thing twice", () => {
    const yearFile = buildYearFile(1);
    const [firstGame, ...otherGames] = yearFile.games;
    const [firstQuestion] = firstGame.questions;
    const games = [
      {
        ...firstGame,
        questions: firstGame.questions.with(1, firstQuestion),
      },
      ...otherGames,
    ];

    expect(() => parseLabGames([{ ...yearFile, games }])).toThrow("asks");
  });

  it("reads a Subject's lab games file, each game its own Skill in that Subject", () => {
    const [game] = parseLabGames(
      [],
      [
        {
          subject: "maths",
          yearGroup: 2,
          games: [buildGame("compare", "coin-counter")],
        },
      ],
    );

    expect(game).toMatchObject({
      id: "coin-counter",
      subject: "maths",
      yearGroup: 2,
      skillId: "maths.coin-counter",
      isOwnSkill: true,
    });
    expect(buildLabSkillFiles([game])).toEqual([
      {
        id: "maths.coin-counter",
        name: "Sorting animals into groups",
        subject: "maths",
        yearGroup: 2,
        strand: "animals-including-humans",
        prerequisites: [],
      },
    ]);
  });

  it("lets a lab game play a Skill that already exists, without making a new one", () => {
    const [game] = parseLabGames(
      [],
      [
        {
          subject: "maths",
          yearGroup: 6,
          games: [
            {
              ...buildGame("compare", "unit-converter"),
              skillId: "maths.convert-units",
            },
          ],
        },
      ],
    );

    expect(game).toMatchObject({
      skillId: "maths.convert-units",
      isOwnSkill: false,
    });
    expect(buildLabSkillFiles([game])).toEqual([]);
  });

  it("refuses a lab game that plays another Subject's Skill", () => {
    expect(() =>
      parseLabGames(
        [],
        [
          {
            subject: "maths",
            yearGroup: 6,
            games: [
              {
                ...buildGame("compare", "unit-converter"),
                skillId: "english.verb-tenses",
              },
            ],
          },
        ],
      ),
    ).toThrow("can only play a Maths Skill");
  });

  it("keeps other Subjects to the stations whose spoken lines name no Subject", () => {
    expect(() =>
      parseLabGames(
        [],
        [
          {
            subject: "english",
            yearGroup: 3,
            games: [buildGame("vocabulary", "word-meanings")],
          },
        ],
      ),
    ).toThrow("needs a station, one of sort, odd-one-out");
  });

  it("refuses two lab games that play the same Skill", () => {
    const existingSkillGame = (id: string) => ({
      ...buildGame("compare", id),
      skillId: "maths.convert-units",
    });

    expect(() =>
      parseLabGames(
        [],
        [
          {
            subject: "maths",
            yearGroup: 6,
            games: [existingSkillGame("one-way"), existingSkillGame("another")],
          },
        ],
      ),
    ).toThrow('Two lab games play the Skill "maths.convert-units"');
  });

  it("plays only Skills that exist, in the lab game's own Subject and Year", () => {
    for (const game of labGames) {
      const skill = skills.find(({ id }) => id === game.skillId);
      expect(skill, game.id).toMatchObject({
        subject: game.subject,
        yearGroup: game.yearGroup,
      });
    }
  });
});
