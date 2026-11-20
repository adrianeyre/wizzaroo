import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import {
  buildSoundSchedule,
  findClipSeconds,
  listRhythmSounds,
  type MusicClip,
} from "./music-theory.js";
import {
  dotToDotTunes,
  findTheRest,
  frogStepsAndLeaps,
  glockenspielEcho,
  isItHome,
  musicTrain,
  taAndTiTi,
  tunedInstrumentDetective,
  volumeRollercoaster,
  yearTwoMusicGames,
} from "./music-year-2.js";

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

const listMelodyPitches = (clip: MusicClip): number[] =>
  buildSoundSchedule(clip)
    .toSorted((first, second) => first.startSeconds - second.startSeconds)
    .map(({ pitches: [pitch] }) => pitch);

describe("the Year 2 music games", () => {
  it("has ten games, each with its own Game Type and Skill", () => {
    expect(yearTwoMusicGames).toHaveLength(10);
    expect(
      new Set(yearTwoMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(10);
    expect(new Set(yearTwoMusicGames.map(({ skillId }) => skillId)).size).toBe(
      10,
    );
  });

  it.each(
    yearTwoMusicGames.flatMap((game) =>
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
        for (const clip of [
          ...prompt.clips,
          ...choices.flatMap((choice) => game.findChoiceSound(choice) ?? []),
        ]) {
          expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
          expect(findClipSeconds(clip)).toBeLessThan(12);
        }
      }
    },
  );
});

describe("ta and ti-ti", () => {
  it.each(musicDifficulties)(
    "plays sounds exactly where the answer's syllables put them at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(taAndTiTi, difficulty)) {
        const [clip] = prompt.clips;
        const heardBeats = buildSoundSchedule(clip).map(({ startSeconds }) =>
          Number(((startSeconds * clip.tempo) / 60).toFixed(3)),
        );
        let beat = 0;
        const expectedBeats = listRhythmSounds(answer).flatMap(
          ({ beats, isRest }) => {
            const startBeat = beat;
            beat += beats;
            return isRest ? [] : [startBeat];
          },
        );
        expect(heardBeats).toEqual(expectedBeats);
      }
    },
  );

  it("offers distractors that differ from the answer by exactly one beat at difficulty 3", () => {
    for (const { choices, answer } of askMany(taAndTiTi, 3)) {
      const answerWords = answer.split(" ");
      for (const choice of choices.filter((choice) => choice !== answer)) {
        const changed = choice
          .split(" ")
          .filter((word, index) => word !== answerWords[index]);
        expect(changed).toHaveLength(1);
      }
    }
  });
});

describe("volume rollercoaster", () => {
  it("plays music whose loudness moves the way the answer says", () => {
    for (const { prompt, answer } of askMany(volumeRollercoaster, 3)) {
      const loudness = buildSoundSchedule(prompt.clips[0]).map(
        (sound) => sound.loudness,
      );
      const change = loudness[loudness.length - 1] - loudness[0];
      const expectedSign = {
        "getting louder": 1,
        "getting quieter": -1,
        "staying the same": 0,
      }[answer];
      expect(Math.sign(Number(change.toFixed(6))), answer).toBe(expectedSign);
    }
  });
});

describe("the music train", () => {
  it("speeds up, slows down or holds the tempo as the answer says", () => {
    for (const { prompt, answer } of askMany(musicTrain, 3)) {
      const [{ tempo, finalTempo }] = prompt.clips;
      const expectedSign = {
        "getting faster": 1,
        "getting slower": -1,
        "staying steady": 0,
      }[answer];
      expect(Math.sign(finalTempo - tempo), answer).toBe(expectedSign);
    }
  });
});

describe("frog steps and leaps", () => {
  it.each(musicDifficulties)(
    "moves by steps of a tone or semitone, leaps of a fourth or more, or not at all at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(frogStepsAndLeaps, difficulty)) {
        const pitches = listMelodyPitches(prompt.clips[0]);
        const moves = pitches
          .slice(1)
          .map((pitch, index) => Math.abs(pitch - pitches[index]));
        const steps = moves.filter((move) => move === 1 || move === 2);
        const leaps = moves.filter((move) => move >= 5);
        if (answer === "same") {
          expect(moves.every((move) => move === 0)).toBe(true);
        } else if (answer === "step") {
          expect(steps).toHaveLength(moves.length);
        } else {
          expect(leaps).toHaveLength(1);
          expect(steps).toHaveLength(moves.length - 1);
        }
      }
    },
  );
});

describe("glockenspiel echo", () => {
  it("plays C first, then the note of the answer's bar", () => {
    for (const { prompt, answer } of askMany(glockenspielEcho, 3)) {
      const [reference, mystery] = prompt.clips.map(listMelodyPitches);
      const art = glockenspielEcho.findChoiceArt(answer);
      expect(reference).toEqual([72]);
      expect(art.kind === "bar" ? [art.pitch] : []).toEqual(mystery);
    }
  });
});

describe("shh! find the rest", () => {
  it.each(musicDifficulties)(
    "silences the drum on the answer's beat in every bar at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(findTheRest, difficulty)) {
        const [clip] = prompt.clips;
        const drumBeats = buildSoundSchedule(clip)
          .filter(({ instrument }) => instrument !== "tick")
          .map(({ startSeconds }) =>
            Math.round((startSeconds * clip.tempo) / 60),
          );
        const tickCount = buildSoundSchedule(clip).filter(
          ({ instrument }) => instrument === "tick",
        ).length;
        const silentBeats = Array.from({ length: tickCount }, (_, beat) => beat)
          .filter((beat) => !drumBeats.includes(beat))
          .map((beat) => String((beat % 4) + 1));
        expect(silentBeats.length).toBe(tickCount / 4);
        expect(new Set(silentBeats)).toEqual(new Set([answer]));
      }
    },
  );
});

describe("instrument detective", () => {
  it("plays the tune on the instrument of the answer", () => {
    for (const { prompt, answer } of askMany(tunedInstrumentDetective, 3)) {
      const instruments = new Set(
        buildSoundSchedule(prompt.clips[0]).map(({ instrument }) => instrument),
      );
      expect(instruments).toEqual(new Set([answer]));
    }
  });
});

describe("dot-to-dot tunes", () => {
  it("plays a tune whose ups and downs match the answer's dots", () => {
    for (const { prompt, answer } of askMany(dotToDotTunes, 3)) {
      const pitches = listMelodyPitches(prompt.clips[0]);
      const art = dotToDotTunes.findChoiceArt(answer);
      const levels =
        art.kind === "card" && art.face.kind === "dots" ? art.face.levels : [];
      expect(levels).toHaveLength(pitches.length);
      for (const [index, pitch] of pitches.entries()) {
        for (const [otherIndex, otherPitch] of pitches.entries()) {
          expect(Math.sign(pitch - otherPitch)).toBe(
            Math.sign(levels[index] - levels[otherIndex]),
          );
        }
      }
    }
  });
});

describe("is it home?", () => {
  it.each(musicDifficulties)(
    "ends finished tunes on the home note over a falling-fifth bass, and others away from home at difficulty %i",
    (difficulty) => {
      for (const { prompt, answer } of askMany(isItHome, difficulty)) {
        const [melody, bass] = prompt.clips[0].voices.map(({ notes }) =>
          notes.map(({ pitches: [pitch] }) => pitch),
        );
        const pitchClassOf = (pitch: number) => ((pitch % 12) + 12) % 12;
        const lastMelody = melody[melody.length - 1];
        const lastBass = bass[bass.length - 1];
        const bassMove = pitchClassOf(lastBass - bass[bass.length - 2]);
        const isHome =
          pitchClassOf(lastMelody) === pitchClassOf(lastBass) && bassMove === 5;
        expect(isHome, answer).toBe(answer === "finished");
      }
    },
  );
});
