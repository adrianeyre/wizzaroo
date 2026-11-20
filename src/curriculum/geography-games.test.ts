import { describe, expect, it } from "vitest";
import { fewestQuestionsPerGame } from "./geography.js";
import {
  buildGeographySkillFiles,
  findGeographyGame,
  geographyGames,
} from "./geography-games.js";
import { gamesPerRegion, listIslandRegions, worldMap } from "./world-map.js";

const longestAsk = 90;
const longestChoice = 24;
const longestInstruction = 110;

describe("geographyGames", () => {
  it.each(worldMap.islands.map(({ id, yearGroup }) => [yearGroup, id]))(
    "has a game for each of the ten Games in order on Island %i (%s), then one for each of its extra Games",
    (yearGroup, islandId) => {
      const region = listIslandRegions(islandId).find(
        ({ subject }) => subject === "geography",
      );
      const regionGameIds = (region?.games ?? []).map(({ id }) => id);
      const extraGameIds = (region?.extraGames ?? [])
        .filter(({ gameType }) => gameType !== "science-lab")
        .map(({ id }) => id);

      expect(regionGameIds).toHaveLength(gamesPerRegion);
      expect(
        geographyGames
          .filter((game) => game.yearGroup === yearGroup)
          .map(({ skillId }) => skillId),
      ).toEqual(
        [...regionGameIds, ...extraGameIds].map((id) => `geography.${id}`),
      );
    },
  );

  it("teaches the Key Stage 2 place knowledge comparison of a UK, a European and an American region in Year 5", () => {
    expect(findGeographyGame("geography.comparing-regions")).toMatchObject({
      title: "Three Regions Tour",
      skillName: "Comparing a UK, European and American region",
      yearGroup: 5,
      strand: "place-knowledge",
      scene: "region-tour",
    });
  });

  it("gives every game enough questions for a whole Mission without repeats", () => {
    for (const { questions } of geographyGames) {
      expect(questions.length).toBeGreaterThanOrEqual(fewestQuestionsPerGame);
    }
  });

  it("keeps every ask short enough to read in the Mission panel", () => {
    const longAsks = geographyGames.flatMap(({ questions }) =>
      questions.map(({ ask }) => ask).filter((ask) => ask.length > longestAsk),
    );

    expect(longAsks).toEqual([]);
  });

  it("keeps every answer short enough to fit on a choice button", () => {
    const longChoices = geographyGames.flatMap(({ questions }) =>
      questions
        .flatMap(({ answer, wrongAnswers }) => [answer, ...wrongAnswers])
        .filter((choice) => choice.length > longestChoice),
    );

    expect(longChoices).toEqual([]);
  });

  it("keeps every instruction to one short line", () => {
    for (const { instruction } of geographyGames) {
      expect(instruction.length).toBeLessThanOrEqual(longestInstruction);
    }
  });

  it("finds a game by its Skill", () => {
    const [firstGame] = geographyGames;

    expect(findGeographyGame(firstGame.skillId)).toBe(firstGame);
    expect(findGeographyGame("geography.no-such-game")).toBeUndefined();
  });

  it("builds one geography Skill file for each game", () => {
    const skillFiles = buildGeographySkillFiles(geographyGames);

    expect(skillFiles).toHaveLength(geographyGames.length);
    expect(skillFiles[0]).toEqual({
      id: geographyGames[0].skillId,
      name: geographyGames[0].skillName,
      subject: "geography",
      yearGroup: geographyGames[0].yearGroup,
      strand: geographyGames[0].strand,
      prerequisites: [],
    });
  });
});
