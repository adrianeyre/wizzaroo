import { checkSkillIds } from "../../curriculum/check-papers.js";
import { checkFormats, isCheckGameType } from "../../curriculum/checks.js";
import {
  findComputingGame,
  isComputingGameType,
} from "../../curriculum/computing-games.js";
import {
  getEnglishGameYear,
  isEnglishGameType,
} from "../../curriculum/english-games.js";
import type { GeographyGame } from "../../curriculum/geography.js";
import { findGeographyGame } from "../../curriculum/geography-games.js";
import {
  historyQuests,
  type HistoryQuest,
} from "../../curriculum/history-quests.js";
import {
  findMusicGame,
  isMusicGameType,
} from "../../curriculum/music-games.js";
import {
  phonicsGames,
  type PhonicsGame,
} from "../../curriculum/phonics-games.js";
import { findLabGame, type LabGame } from "../../curriculum/lab-games.js";
import {
  skills,
  soundStrand,
  type YearGroup,
} from "../../curriculum/skills.js";
import {
  isPuzzleGameType,
  worldMap,
  type GameType,
  type RegionGame,
  type WorldMap,
} from "../../curriculum/world-map.js";
import { findPuzzleSkillId, puzzleTitles } from "../puzzles/puzzle-skills.js";
import {
  findMathsExtraLevel,
  isMathsExtraGameType,
  isMathsGameType,
  mathsSkillIds,
} from "./maths-missions.js";
import { letterMatchSkillId } from "./mission.js";
import { findMissionWords } from "./mission-text.js";
import { timesTablesCheckSkillId } from "../../curriculum/times-tables-check.js";

export interface MissionContent {
  gameType: GameType;
  phonicsGame: PhonicsGame | undefined;
  englishYear: YearGroup | undefined;
  labGame: LabGame | undefined;
  geographyGame: GeographyGame | undefined;
  historyQuest: HistoryQuest | undefined;
}

const buildMissionContent = (gameType: GameType): MissionContent => ({
  gameType,
  phonicsGame: undefined,
  englishYear: undefined,
  labGame: undefined,
  geographyGame: undefined,
  historyQuest: undefined,
});

export interface GameCardContent {
  content: MissionContent;
  skillId: string | undefined;
  title: string;
  skillName: string | undefined;
}

const findSkilledContent = (
  gameType: GameType,
  skillId: string,
  title: string,
): GameCardContent => ({
  content: buildMissionContent(gameType),
  skillId,
  title,
  skillName: undefined,
});

export const findGameCardContent = (
  { id, gameType }: RegionGame,
  yearGroup: YearGroup,
): GameCardContent | undefined => {
  if (isPuzzleGameType(gameType)) {
    return findSkilledContent(
      gameType,
      findPuzzleSkillId(gameType, yearGroup),
      puzzleTitles[gameType],
    );
  }
  if (isCheckGameType(gameType)) {
    return {
      content: buildMissionContent(gameType),
      skillId:
        gameType === "times-tables-check" ? timesTablesCheckSkillId : undefined,
      title: checkFormats[gameType].title,
      skillName: checkFormats[gameType].paperName,
    };
  }
  if (isMathsGameType(gameType)) {
    return findSkilledContent(
      gameType,
      mathsSkillIds[gameType][yearGroup],
      findMissionWords(gameType, yearGroup).title,
    );
  }
  if (isMathsExtraGameType(gameType)) {
    const extraLevel = findMathsExtraLevel(gameType, yearGroup);
    return extraLevel === undefined
      ? undefined
      : findSkilledContent(
          gameType,
          extraLevel.skillId,
          findMissionWords(gameType, yearGroup).title,
        );
  }
  if (isEnglishGameType(gameType) || gameType === "letter-match") {
    return {
      content: { ...buildMissionContent(gameType), englishYear: yearGroup },
      skillId: isEnglishGameType(gameType)
        ? getEnglishGameYear(gameType, yearGroup).skillId
        : letterMatchSkillId,
      title: findMissionWords(gameType, yearGroup).title,
      skillName: undefined,
    };
  }
  if (isMusicGameType(gameType)) {
    const { skillId, title } = findMusicGame(gameType);
    return findSkilledContent(gameType, skillId, title);
  }
  if (isComputingGameType(gameType)) {
    const { skillId, title } = findComputingGame(gameType);
    return findSkilledContent(gameType, skillId, title);
  }
  if (gameType === "listen-and-pick") {
    return {
      content: buildMissionContent(gameType),
      skillId: undefined,
      title: findMissionWords(gameType, yearGroup).title,
      skillName: "Letter sounds",
    };
  }
  const phonicsGame =
    gameType === "phonics-games"
      ? phonicsGames.find((game) => game.id === id)
      : undefined;
  const labGame = gameType === "science-lab" ? findLabGame(id) : undefined;
  const geographyGame =
    gameType === "geography-games"
      ? findGeographyGame(`geography.${id}`)
      : undefined;
  const historyQuest =
    gameType === "history-quest"
      ? historyQuests.find((quest) => quest.id === id)
      : undefined;
  const playedGame = phonicsGame ?? labGame ?? geographyGame ?? historyQuest;
  return playedGame === undefined
    ? undefined
    : {
        content: {
          ...buildMissionContent(gameType),
          phonicsGame,
          labGame,
          geographyGame,
          historyQuest,
        },
        skillId: playedGame.skillId,
        title: playedGame.title,
        skillName: phonicsGame?.skillName ?? labGame?.skillName,
      };
};

export interface SkillGame {
  key: string;
  title: string;
  regionName: string;
  islandName: string;
}

const listCardSkillIds = (
  game: RegionGame,
  yearGroup: YearGroup,
  cardContent: GameCardContent | undefined,
): string[] => {
  if (isCheckGameType(game.gameType)) {
    return [...checkSkillIds[game.gameType]];
  }
  if (cardContent?.skillId !== undefined) {
    return [cardContent.skillId];
  }
  return game.gameType === "listen-and-pick"
    ? skills
        .filter(
          (skill) =>
            skill.subject === "phonics" &&
            skill.strand === soundStrand &&
            skill.yearGroup === yearGroup,
        )
        .map(({ id }) => id)
    : [];
};

export const buildSkillGames = ({
  islands,
  regions,
}: WorldMap): ReadonlyMap<string, SkillGame[]> => {
  const skillGames = new Map<string, SkillGame[]>();
  for (const region of regions) {
    const island = islands.find(({ id }) => id === region.islandId);
    if (island === undefined) {
      continue;
    }
    for (const game of [...region.games, ...region.extraGames]) {
      const cardContent = findGameCardContent(game, island.yearGroup);
      const skillGame: SkillGame = {
        key: `${island.id}/${region.id}/${game.id}`,
        title: cardContent?.title ?? game.id,
        regionName: region.name,
        islandName: island.name,
      };
      for (const skillId of listCardSkillIds(
        game,
        island.yearGroup,
        cardContent,
      )) {
        skillGames.set(skillId, [
          ...(skillGames.get(skillId) ?? []),
          skillGame,
        ]);
      }
    }
  }
  return skillGames;
};

const skillGamesOnTheMap = buildSkillGames(worldMap);

export const listSkillGames = (skillId: string): SkillGame[] =>
  skillGamesOnTheMap.get(skillId) ?? [];
