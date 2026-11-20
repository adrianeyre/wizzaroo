import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import type { StageProp } from "./music-prompts.js";
import {
  buildRhythmNotes,
  buildSoundSchedule,
  countRhythmBeats,
  findClipSeconds,
  type MusicClip,
  type MusicNote,
} from "./music-theory.js";
import {
  dynamicsJourney,
  howIsItPlayed,
  noteStack,
  roundAndRound,
  shapeOfTheSong,
  spotTheMistake,
  sunshineOrRain,
  timeSignatureTiles,
  yearFourMusicGames,
} from "./music-year-4.js";

const buildSeededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

const askMany = (game: MusicGame, difficulty: 1 | 2 | 3, count = 60) => {
  const random = buildSeededRandom(difficulty * 97 + 13);
  return Array.from({ length: count }, () =>
    game.buildQuestion(difficulty, random),
  );
};

const expectPlayable = (clip: MusicClip) => {
  expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
  expect(findClipSeconds(clip)).toBeLessThan(12);
};

const findRhythmOnStand = (stage: StageProp): string =>
  stage.kind === "music-stand" && stage.face.kind === "rhythm"
    ? stage.face.rhythm
    : expect.fail("the stage doesn't show a rhythm");

const describeBeat = (notes: readonly MusicNote[], beat: number): string => {
  let start = 0;
  return notes
    .flatMap((note) => {
      const noteStart = start;
      start += note.beats;
      return noteStart >= beat && noteStart < beat + 1
        ? [
            `${String(noteStart - beat)}:${String(note.beats)}:${String(note.isRest)}`,
          ]
        : [];
    })
    .join(" ");
};

describe("the Year 4 music games", () => {
  it("has ten games, each with its own Game Type and Skill", () => {
    expect(yearFourMusicGames).toHaveLength(10);
    expect(
      new Set(yearFourMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(10);
    expect(new Set(yearFourMusicGames.map(({ skillId }) => skillId)).size).toBe(
      10,
    );
  });

  it.each(
    yearFourMusicGames.flatMap((game) =>
      musicDifficulties.map((difficulty) => ({ game, difficulty })),
    ),
  )(
    "asks $game.gameType at difficulty $difficulty with the answer among 2 to 4 different choices",
    ({ game, difficulty }) => {
      for (const { choices, answer, prompt } of askMany(game, difficulty)) {
        expect(choices).toContain(answer);
        expect(new Set(choices).size).toBe(choices.length);
        expect(choices.length).toBeGreaterThanOrEqual(2);
        expect(choices.length).toBeLessThanOrEqual(4);
        expect(prompt.ask).not.toBe("");
        expect(prompt.clips.length > 0 || prompt.reward !== undefined).toBe(
          true,
        );
        for (const clip of prompt.clips) {
          expectPlayable(clip);
        }
        if (prompt.reward !== undefined) {
          expectPlayable(prompt.reward);
        }
        for (const choice of choices) {
          expect(game.describeChoice(choice)).not.toBe("");
          const choiceSound = game.findChoiceSound(choice);
          if (choiceSound !== undefined) {
            expectPlayable(choiceSound);
          }
        }
      }
    },
  );
});

describe("spot the mistake", () => {
  it.each(musicDifficulties)(
    "plays the written rhythm with only the answer's beat changed at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(spotTheMistake, difficulty)) {
        const written = buildRhythmNotes(findRhythmOnStand(prompt.stage));
        const played =
          prompt.clips[0].voices.find(({ instrument }) => instrument !== "tick")
            ?.notes ?? expect.fail("no rhythm voice");
        const changedBeats = [0, 1, 2, 3].filter(
          (beat) => describeBeat(written, beat) !== describeBeat(played, beat),
        );
        expect(changedBeats).toEqual([Number(answer) - 1]);
      }
    },
  );
});

describe("sunshine or rain", () => {
  it.each(musicDifficulties)(
    "puts a major third above the lowest note for major and a minor third for minor at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(sunshineOrRain, difficulty)) {
        const pitches = buildSoundSchedule(prompt.clips[0]).flatMap(
          ({ pitches: sounding }) => sounding,
        );
        const root = Math.min(...pitches);
        expect(pitches.includes(root + 4)).toBe(answer === "major");
        expect(pitches.includes(root + 3)).toBe(answer === "minor");
      }
    },
  );
});

describe("dynamics journey", () => {
  it("swells smoothly for crescendo and diminuendo, and jumps between two levels for sudden changes", () => {
    for (const { prompt, answer } of askMany(dynamicsJourney, 3)) {
      const levels = buildSoundSchedule(prompt.clips[0]).map(
        ({ loudness }) => loudness,
      );
      const first = levels[0];
      const last = levels[levels.length - 1];
      if (answer.startsWith("suddenly")) {
        expect(new Set(levels).size).toBe(2);
      } else {
        expect(new Set(levels).size).toBeGreaterThan(2);
      }
      if (answer === "crescendo" || answer === "suddenly loud") {
        expect(last).toBeGreaterThan(first * 3);
      } else {
        expect(first).toBeGreaterThan(last * 3);
      }
    }
  });
});

describe("shape of the song", () => {
  it("repeats a section exactly where the shape repeats its letter", () => {
    for (const { prompt, answer } of askMany(shapeOfTheSong, 3)) {
      const { voices } = prompt.clips[0];
      expect(voices).toHaveLength(answer.length);
      const playedBy = new Map<string, string>();
      voices.forEach((voice, index) => {
        const notes = JSON.stringify(voice.notes);
        const letter = answer.charAt(index);
        expect(playedBy.get(letter) ?? notes).toBe(notes);
        playedBy.set(letter, notes);
      });
      expect(playedBy.get("A")).not.toBe(playedBy.get("B"));
    }
  });
});

describe("time signature tiles", () => {
  it.each(musicDifficulties)(
    "shows a bar whose beats add up to the answer's top number at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(
        timeSignatureTiles,
        difficulty,
      )) {
        expect(countRhythmBeats(findRhythmOnStand(prompt.stage))).toBe(
          Number(answer.charAt(0)),
        );
      }
    },
  );
});

describe("note stack", () => {
  it("plays exactly as many different pitches at once as the answer", () => {
    for (const { prompt, answer } of askMany(noteStack, 3)) {
      for (const { pitches } of buildSoundSchedule(prompt.clips[0])) {
        expect(new Set(pitches).size).toBe(Number(answer.charAt(0)));
      }
    }
  });
});

describe("round and round", () => {
  it("starts the second part later only in a round, and keeps the parts a third or sixth apart in harmony", () => {
    for (const { prompt, answer } of askMany(roundAndRound, 3)) {
      const [first, second] = prompt.clips[0].voices;
      const intervals = first.notes.map((note, index) =>
        Math.abs(note.pitches[0] - second.notes[index].pitches[0]),
      );
      expect(second.startBeat > 0).toBe(answer === "round");
      if (answer === "harmony") {
        expect(
          intervals.every((interval) => [3, 4, 8, 9].includes(interval)),
        ).toBe(true);
      } else {
        expect(intervals.every((interval) => interval === 0)).toBe(true);
      }
    }
  });
});

describe("how is it played?", () => {
  const playingMethods = new Map(
    Object.entries({
      violin: "bowed",
      cello: "bowed",
      "double-bass": "bowed",
      harp: "plucked",
      guitar: "plucked",
      flute: "blown",
      clarinet: "blown",
      oboe: "blown",
      recorder: "blown",
      trumpet: "blown",
      trombone: "blown",
      tuba: "blown",
      "french-horn": "blown",
      piano: "struck",
      xylophone: "struck",
      timpani: "struck",
      triangle: "struck",
      "big-drum": "struck",
    }),
  );

  it("gives the right way of playing the instrument on the stage", () => {
    for (const { prompt, answer } of askMany(howIsItPlayed, 3, 200)) {
      const model =
        prompt.stage.kind === "instrument"
          ? prompt.stage.model
          : expect.fail("the stage doesn't show an instrument");
      expect(playingMethods.get(model), model).toBe(answer);
    }
  });
});
