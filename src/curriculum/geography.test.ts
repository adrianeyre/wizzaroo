import { describe, expect, it } from "vitest";
import {
  buildGridReference,
  findGridOrigin,
  parseGeographyGames,
  type GeographyShowOf,
} from "./geography.js";

const buildQuestion = (overrides: Record<string, unknown> = {}) => ({
  ask: "Which continent is glowing?",
  show: { highlight: "africa" },
  answer: "Africa",
  wrongAnswers: ["Asia", "Europe", "Oceania"],
  ...overrides,
});

const buildQuestions = (
  count: number,
  overrides: Record<string, unknown> = {},
) =>
  Array.from({ length: count }, (_, index) =>
    buildQuestion({
      ask: `Which continent is glowing? (${String(index)})`,
      ...overrides,
    }),
  );

const buildGame = (overrides: Record<string, unknown> = {}) => ({
  skillId: "geography.test-continents",
  title: "Test continents",
  skillName: "The seven continents",
  strand: "locational-knowledge",
  scene: "globe-spinner",
  instruction: "Look at the globe, then tap the continent.",
  questions: buildQuestions(10),
  ...overrides,
});

const parseOneGame = (overrides: Record<string, unknown> = {}) =>
  parseGeographyGames([{ yearGroup: 2, games: [buildGame(overrides)] }]);

describe("parseGeographyGames", () => {
  it("reads a game with its Year Group, scene and questions", () => {
    const [game] = parseOneGame();

    expect(game).toMatchObject({
      skillId: "geography.test-continents",
      yearGroup: 2,
      scene: "globe-spinner",
      strand: "locational-knowledge",
    });
    expect(game.questions[0]).toEqual({
      ask: "Which continent is glowing? (0)",
      show: { scene: "globe-spinner", highlight: "africa" },
      answer: "Africa",
      wrongAnswers: ["Asia", "Europe", "Oceania"],
    });
  });

  it.each([
    ["a scene it doesn't know", { scene: "moon-base" }, "scene"],
    ["a strand outside the National Curriculum", { strand: "space" }, "strand"],
    [
      "fewer than ten questions",
      { questions: buildQuestions(9) },
      "at least 10 questions",
    ],
    [
      "a skill ID outside geography",
      { skillId: "maths.continents" },
      "skillId",
    ],
    [
      "a question with too few wrong answers",
      { questions: buildQuestions(10, { wrongAnswers: ["Asia", "Europe"] }) },
      "at least 3 wrong answers",
    ],
    [
      "a question that lists its answer as wrong",
      {
        questions: buildQuestions(10, {
          wrongAnswers: ["Asia", "Africa", "Europe"],
        }),
      },
      'lists its answer "Africa" as a wrong answer',
    ],
    [
      "a globe question that shows nothing",
      { questions: buildQuestions(10, { show: {} }) },
      "needs a highlight or a pin",
    ],
    [
      "a pin off the Earth",
      {
        questions: buildQuestions(10, {
          show: { pin: { latitude: 95, longitude: 0 } },
        }),
      },
      "latitude",
    ],
    [
      "a show field the scene doesn't draw",
      { questions: buildQuestions(10, { show: { biome: "desert" } }) },
      'field "biome"',
    ],
  ])("rejects %s", (_, overrides, message) => {
    expect(() => parseOneGame(overrides)).toThrow(message);
  });

  it("rejects a diagonal direction on a four-point compass", () => {
    expect(() =>
      parseOneGame({
        scene: "compass-island",
        questions: buildQuestions(10, {
          show: { target: "cave", direction: "north-east", points: 4 },
          answer: "North-east",
          wrongAnswers: ["South", "West", "East"],
        }),
      }),
    ).toThrow("north-east on a four-point compass");
  });

  it("tours all three regions side by side, or spotlights one of them, but never a region it can't draw", () => {
    const [game] = parseOneGame({
      scene: "region-tour",
      questions: buildQuestions(10, {
        show: { region: "swiss-alps" },
        answer: "Swiss franc",
        wrongAnswers: ["Euro", "Pound", "Brazilian real"],
      }).map((question, index) =>
        index === 0 ? { ...question, show: {} } : question,
      ),
    });

    expect(game.questions[0].show).toEqual({ scene: "region-tour" });
    expect(game.questions[1].show).toEqual({
      scene: "region-tour",
      region: "swiss-alps",
    });
    expect(() =>
      parseOneGame({
        scene: "region-tour",
        questions: buildQuestions(10, { show: { region: "the-sahara" } }),
      }),
    ).toThrow("region must be one of lake-district, swiss-alps");
  });

  it("rejects a grid answer that doesn't match where the pin is", () => {
    expect(() =>
      parseOneGame({
        scene: "grid-hunt",
        questions: buildQuestions(10, {
          show: { style: "four-figure", x: 22, y: 43 },
          answer: "4322",
          wrongAnswers: ["2243", "2343", "2143"],
        }),
      }),
    ).toThrow('answers "4322", but its pin is at 2243');
  });

  it("rejects two games with the same title", () => {
    expect(() =>
      parseGeographyGames([
        {
          yearGroup: 1,
          games: [buildGame(), buildGame({ skillId: "geography.other-game" })],
        },
      ]),
    ).toThrow('Two geography games have the title "Test continents"');
  });

  it("rejects a Year Group outside primary school", () => {
    expect(() => parseGeographyGames([{ yearGroup: 7, games: [] }])).toThrow(
      "yearGroup",
    );
  });
});

describe("buildGridReference", () => {
  const gridShow = (
    style: GeographyShowOf<"grid-hunt">["style"],
    x: number,
    y: number,
  ): GeographyShowOf<"grid-hunt"> => ({ scene: "grid-hunt", style, x, y });

  it.each([
    [gridShow("letters", 2, 4), "C4"],
    [gridShow("four-figure", 22, 43), "2243"],
    [gridShow("four-figure", 5, 8), "0508"],
    [gridShow("six-figure", 23.4, 45.7), "234457"],
    [gridShow("six-figure", 7.8, 22.3), "078223"],
  ])("reads %o as %s, eastings first", (show, reference) => {
    expect(buildGridReference(show)).toBe(reference);
  });

  it("starts a numbered board on the multiple of five at or below the pin", () => {
    expect(findGridOrigin(gridShow("four-figure", 22, 43))).toEqual({
      x: 20,
      y: 40,
    });
    expect(findGridOrigin(gridShow("six-figure", 97.5, 3.2))).toEqual({
      x: 94,
      y: 0,
    });
    expect(findGridOrigin(gridShow("letters", 4, 6))).toEqual({ x: 0, y: 1 });
  });
});
