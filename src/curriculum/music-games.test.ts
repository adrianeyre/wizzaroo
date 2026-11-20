import { describe, expect, it } from "vitest";
import {
  findMusicGame,
  isMusicGameType,
  musicGames,
  musicGameTypes,
} from "./music-games.js";
import { skills, yearGroups } from "./skills.js";

const findSkill = (skillId: string) => skills.find(({ id }) => id === skillId);

describe("musicGames", () => {
  it("holds sixty-one games, each with its own Game Type and its own Skill", () => {
    expect(musicGames).toHaveLength(61);
    expect(new Set(musicGameTypes).size).toBe(61);
    expect(new Set(musicGames.map(({ skillId }) => skillId)).size).toBe(61);
  });

  it("gives every game a Music Skill from the curriculum", () => {
    for (const { gameType, skillId } of musicGames) {
      expect(findSkill(skillId)?.subject, gameType).toBe("music");
    }
  });

  it("has ten games for each Year Group from 1 to 6, and Chant along as an eleventh in Year 1", () => {
    for (const yearGroup of yearGroups) {
      expect(
        musicGames.filter(
          ({ skillId }) => findSkill(skillId)?.yearGroup === yearGroup,
        ),
        `Year ${String(yearGroup)}`,
      ).toHaveLength(yearGroup === 1 ? 11 : 10);
    }
  });

  it("gives every game a title, an instruction and a hint to show and say", () => {
    for (const { gameType, title, instruction, hint } of musicGames) {
      expect(title, gameType).not.toBe("");
      expect(instruction, gameType).not.toBe("");
      expect(hint, gameType).not.toBe("");
    }
  });
});

describe("findMusicGame", () => {
  it("finds a music game by its Game Type, and knows a Game Type that isn't music", () => {
    expect(findMusicGame("bird-or-bear").title).toBe("Bird or bear?");
    expect(isMusicGameType("bird-or-bear")).toBe(true);
    expect(isMusicGameType("popping-bubbles")).toBe(false);
  });
});
