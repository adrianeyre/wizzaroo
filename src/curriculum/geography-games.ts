import { parseGeographyGames, type GeographyGame } from "./geography.js";
import yearOneGames from "./geography.year-1.games.json" with { type: "json" };
import yearTwoGames from "./geography.year-2.games.json" with { type: "json" };
import yearThreeGames from "./geography.year-3.games.json" with { type: "json" };
import yearFourGames from "./geography.year-4.games.json" with { type: "json" };
import yearFiveGames from "./geography.year-5.games.json" with { type: "json" };
import yearSixGames from "./geography.year-6.games.json" with { type: "json" };

export const geographyGames = parseGeographyGames([
  yearOneGames,
  yearTwoGames,
  yearThreeGames,
  yearFourGames,
  yearFiveGames,
  yearSixGames,
]);

export const findGeographyGame = (skillId: string): GeographyGame | undefined =>
  geographyGames.find((game) => game.skillId === skillId);

export const buildGeographySkillFiles = (games: readonly GeographyGame[]) =>
  games.map(({ skillId, skillName, yearGroup, strand }) => ({
    id: skillId,
    name: skillName,
    subject: "geography",
    yearGroup,
    strand,
    prerequisites: [],
  }));
