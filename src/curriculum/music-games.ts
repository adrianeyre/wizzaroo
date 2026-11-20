import type { MusicGame } from "./music-game.js";
import { yearOneMusicGames } from "./music-year-1.js";
import { yearTwoMusicGames } from "./music-year-2.js";
import { yearThreeMusicGames } from "./music-year-3.js";
import { yearFourMusicGames } from "./music-year-4.js";
import { yearFiveMusicGames } from "./music-year-5.js";
import { yearSixMusicGames } from "./music-year-6.js";

export const musicGames = [
  ...yearOneMusicGames,
  ...yearTwoMusicGames,
  ...yearThreeMusicGames,
  ...yearFourMusicGames,
  ...yearFiveMusicGames,
  ...yearSixMusicGames,
] as const;

export type MusicGameType = (typeof musicGames)[number]["gameType"];

export const musicGameTypes: readonly MusicGameType[] = musicGames.map(
  ({ gameType }) => gameType,
);

export const isMusicGameType = (value: unknown): value is MusicGameType =>
  musicGameTypes.some((gameType) => gameType === value);

const musicGamesByType = new Map<string, MusicGame>(
  musicGames.map((game) => [game.gameType, game]),
);

export class UnknownMusicGameError extends Error {
  override name = "UnknownMusicGameError";
}

export const findMusicGame = (gameType: MusicGameType): MusicGame => {
  const game = musicGamesByType.get(gameType);
  if (game === undefined) {
    throw new UnknownMusicGameError(`There is no music game "${gameType}"`);
  }
  return game;
};
