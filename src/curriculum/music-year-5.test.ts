import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import {
  buildSoundSchedule,
  countRhythmBeats,
  findClipSeconds,
  spellNote,
  type MusicClip,
} from "./music-theory.js";
import {
  beatSums,
  chordCastle,
  dottedRhythmDetective,
  findIntervalSemitones,
  findScaleSteps,
  intervalLeap,
  noteWordPuzzle,
  offBeatParty,
  rondoRoundabout,
  scaleExplorer,
  sharpsAndFlats,
  yearFiveMusicGames,
} from "./music-year-5.js";

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

const listPitchesInOrder = (clips: readonly MusicClip[]): number[][] =>
  clips.flatMap((clip) =>
    buildSoundSchedule(clip)
      .toSorted((first, second) => first.startSeconds - second.startSeconds)
      .map(({ pitches }) => pitches),
  );

const listOnsetBeats = (clip: MusicClip, voiceIndex: number): number[] => {
  const voice = clip.voices[voiceIndex];
  let beat = 0;
  return voice.notes.flatMap((note) => {
    const startBeat = beat;
    beat += note.beats;
    return note.isRest ? [] : [startBeat];
  });
};

describe("the Year 5 music games", () => {
  it("has ten games, each with its own Game Type and Skill", () => {
    expect(yearFiveMusicGames).toHaveLength(10);
    expect(
      new Set(yearFiveMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(10);
    expect(new Set(yearFiveMusicGames.map(({ skillId }) => skillId)).size).toBe(
      10,
    );
  });

  it.each(
    yearFiveMusicGames.flatMap((game) =>
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
          ...(prompt.reward ? [prompt.reward] : []),
        ]) {
          expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
          expect(findClipSeconds(clip)).toBeLessThan(12);
        }
      }
    },
  );

  it.each(yearFiveMusicGames)(
    "plays a short sound for every choice of $gameType",
    (game) => {
      for (const { choices } of askMany(game, 3, 10)) {
        for (const choice of choices) {
          const sound = game.findChoiceSound(choice);
          if (sound !== undefined) {
            expect(findClipSeconds(sound)).toBeLessThan(12);
          }
        }
      }
    },
  );
});

describe("dotted rhythm detective", () => {
  it("plays four beats with a dotted figure, and offers the even version at difficulty 3", () => {
    for (const { prompt, answer, choices } of askMany(
      dottedRhythmDetective,
      3,
    )) {
      expect(countRhythmBeats(answer)).toBe(4);
      expect(answer).toMatch(/ta-i-ti|tim-ka/);
      const heardBeats = prompt.clips[0].voices[1].notes.map(
        ({ beats }) => beats,
      );
      expect(heardBeats.some((beats) => beats === 1.5 || beats === 0.75)).toBe(
        true,
      );
      const evenVersions = new Map(
        Object.entries({ "ta-i-ti": "ta ti-ti", "tim-ka": "ti-ti" }),
      );
      const pieces = answer.split(" ");
      const evenedRhythms = pieces.flatMap((piece, position) => {
        const evenVersion = evenVersions.get(piece);
        return evenVersion === undefined
          ? []
          : [pieces.with(position, evenVersion).join(" ")];
      });
      expect(choices).toHaveLength(3);
      expect(choices.some((choice) => evenedRhythms.includes(choice))).toBe(
        true,
      );
    }
  });
});

describe("chord castle", () => {
  it("roots the mystery chord 0, 5 or 7 semitones above the home chord for I, IV and V", () => {
    const rootSteps = new Map(Object.entries({ I: 0, IV: 5, V: 7 }));
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(chordCastle, difficulty)) {
        const [home, mystery] = listPitchesInOrder(prompt.clips);
        expect(Math.min(...mystery) - Math.min(...home)).toBe(
          rootSteps.get(answer),
        );
        const chordShape = mystery
          .slice(1)
          .map((pitch) => (pitch - Math.min(...mystery)) % 12)
          .toSorted((first, second) => first - second);
        expect(chordShape).toEqual([0, 4, 7]);
      }
    }
  });
});

describe("interval leap", () => {
  it("leaps exactly the number of semitones the interval names", () => {
    expect(
      ["2nd", "3rd", "4th", "5th", "octave"].map(findIntervalSemitones),
    ).toEqual([2, 4, 5, 7, 12]);
    for (const { prompt, answer } of askMany(intervalLeap, 3)) {
      const [[first], [second]] = listPitchesInOrder(prompt.clips);
      expect(Math.abs(second - first)).toBe(findIntervalSemitones(answer));
    }
  });
});

describe("note word puzzle", () => {
  it("spells the answer with the letters of the notes on the stave", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(noteWordPuzzle, difficulty)) {
        const { stage } = prompt;
        if (stage.kind !== "music-stand" || stage.face.kind !== "staff") {
          expect.fail("the note word puzzle shows a stave");
        }
        const letters = stage.face.chords
          .flatMap(({ notes }) => notes)
          .map((note) => spellNote(note).letter)
          .join("");
        expect(letters).toBe(answer);
        expect(answer.length).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe("sharps and flats", () => {
  it("marks one black key whose sharp or flat name is the answer", () => {
    for (const { prompt, answer } of askMany(sharpsAndFlats, 3)) {
      const { stage } = prompt;
      if (stage.kind !== "keyboard") {
        expect.fail("sharps and flats shows a keyboard");
      }
      const [marked] = stage.marked;
      const { letter } = spellNote(marked);
      expect(answer.startsWith(`${letter}♯ / `)).toBe(true);
    }
  });
});

describe("off-beat party", () => {
  it("only syncopates when the answer is syncopated", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(offBeatParty, difficulty)) {
        const onsets = listOnsetBeats(prompt.clips[0], 2);
        const isSyncopated = onsets.some(
          (beat) =>
            !Number.isInteger(beat) && !onsets.includes(Math.floor(beat)),
        );
        expect(isSyncopated).toBe(answer === "syncopated");
      }
    }
  });
});

describe("scale explorer", () => {
  it("climbs the steps of the answer's scale from the tonic to the octave", () => {
    for (const { prompt, answer } of askMany(scaleExplorer, 3)) {
      const pitches = listPitchesInOrder(prompt.clips).map(([pitch]) => pitch);
      const steps = findScaleSteps(answer);
      const [tonic] = pitches;
      expect(
        pitches.slice(0, steps.length + 1).map((pitch) => pitch - tonic),
      ).toEqual([...steps, 12]);
    }
  });
});

describe("beat sums", () => {
  it("answers with the total beats of the rhythm on the music stand", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer, choices } of askMany(beatSums, difficulty)) {
        const { stage } = prompt;
        if (stage.kind !== "music-stand" || stage.face.kind !== "rhythm") {
          expect.fail("beat sums shows a rhythm");
        }
        expect(Number(answer)).toBe(countRhythmBeats(stage.face.rhythm));
        expect(choices.map(Number)).toEqual(
          choices.map(Number).toSorted((first, second) => first - second),
        );
      }
    }
  });

  it("counts a dotted crotchet and quaver as 2 and a dotted minim as 3", () => {
    expect(countRhythmBeats("ta-i-ti")).toBe(2);
    expect(countRhythmBeats("ta-a-a")).toBe(3);
  });
});

describe("rondo roundabout", () => {
  it("plays the same music for the same letter and different music for different letters", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(rondoRoundabout, difficulty)) {
        const sections = prompt.clips[0].voices.map(
          ({ instrument, notes }) =>
            `${instrument}:${notes.map(({ pitches, beats }) => `${pitches.join()}/${String(beats)}`).join(" ")}`,
        );
        const letters = Array.from(answer);
        for (const [first, firstLetter] of letters.entries()) {
          for (const [second, secondLetter] of letters.entries()) {
            expect(sections[first] === sections[second]).toBe(
              firstLetter === secondLetter,
            );
          }
        }
      }
    }
  });
});
