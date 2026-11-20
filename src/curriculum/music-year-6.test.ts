import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import type { MusicPrompt, NotationFace } from "./music-prompts.js";
import {
  buildSoundSchedule,
  countClipBeats,
  countRhythmBeats,
  findClipSeconds,
  findPitchOf,
  isBlackKey,
  legatoLength,
  listRhythmSounds,
  loudnessLevels,
  nameNoteOf,
  spellNote,
  staccatoLength,
} from "./music-theory.js";
import {
  bassClefBasement,
  conductorsChallenge,
  keySignatureCodebreaker,
  melodyDictation,
  movieScoreStudio,
  smoothOrSpiky,
  triadTower,
  tripletTrail,
  yearSixMusicGames,
} from "./music-year-6.js";

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

const findStaffFace = ({
  stage,
}: MusicPrompt): Extract<NotationFace, { kind: "staff" }> => {
  if (stage.kind !== "music-stand" || stage.face.kind !== "staff") {
    return expect.fail("the stage doesn't show a staff");
  }
  return stage.face;
};

describe("the Year 6 music games", () => {
  it("has ten games, each with its own Game Type and Skill", () => {
    expect(yearSixMusicGames).toHaveLength(10);
    expect(
      new Set(yearSixMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(10);
    expect(new Set(yearSixMusicGames.map(({ skillId }) => skillId)).size).toBe(
      10,
    );
  });

  it.each(
    yearSixMusicGames.flatMap((game) =>
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
        expect(
          new Set(choices.map((choice) => game.describeChoice(choice))).size,
        ).toBe(choices.length);
        for (const clip of [
          ...prompt.clips,
          ...(prompt.reward === undefined ? [] : [prompt.reward]),
        ]) {
          expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
          expect(findClipSeconds(clip)).toBeLessThan(12);
        }
      }
    },
  );
});

describe("bass clef basement", () => {
  it("asks for the letter of the note drawn on a bass stave", () => {
    for (const { prompt, answer } of askMany(bassClefBasement, 3)) {
      const face = findStaffFace(prompt);
      expect(face.clef).toBe("bass");
      expect(spellNote(face.chords[0].notes[0]).letter).toBe(answer);
    }
  });
});

describe("smooth or spiky", () => {
  it("joins legato notes, cuts staccato notes short, and makes accents far louder", () => {
    for (const { prompt, answer } of askMany(smoothOrSpiky, 3)) {
      const notes = prompt.clips[0].voices[0].notes;
      const lengths = notes.map(({ length }) => length);
      const loudnesses = notes.map(({ loudness }) => loudness);
      if (answer === "legato") {
        expect(lengths.every((length) => length === legatoLength)).toBe(true);
      }
      if (answer === "staccato") {
        expect(lengths.every((length) => length === staccatoLength)).toBe(true);
      }
      if (answer === "accent") {
        expect(Math.max(...loudnesses)).toBeGreaterThan(
          Math.min(...loudnesses) * 3,
        );
      }
    }
  });
});

describe("triad tower", () => {
  it("draws a root-position triad whose root and thirds match the answer", () => {
    for (const { prompt, answer } of askMany(triadTower, 3)) {
      const notes = findStaffFace(prompt).chords[0].notes;
      const [root, third, fifth] = notes.map((note) => findPitchOf(note));
      const [rootName, quality] = answer.split(" ");
      expect(nameNoteOf(notes[0])).toBe(rootName);
      expect(third - root).toBe(quality === "major" ? 4 : 3);
      expect(fifth - root).toBe(7);
    }
  });
});

describe("key signature codebreaker", () => {
  it("draws as many sharps or flats as the answer's major scale has", () => {
    for (const { prompt, answer } of askMany(keySignatureCodebreaker, 3)) {
      const { keySignature } = findStaffFace(prompt);
      const scale = buildSoundSchedule(
        prompt.reward ?? expect.fail("the key has no scale to play"),
      ).map(({ pitches: [pitch] }) => pitch);
      const blackKeys = new Set(
        scale.filter(isBlackKey).map((pitch) => pitch % 12),
      );
      const isFlatKey = answer.includes("♭") || answer === "F major";
      expect(Math.abs(keySignature)).toBe(blackKeys.size);
      expect(keySignature < 0).toBe(isFlatKey);
    }
  });
});

describe("movie score studio", () => {
  it("plays triumph music loud and sneaking music quiet", () => {
    const questions = askMany(movieScoreStudio, 3, 120);
    const loudnessOf = (answer: string) =>
      questions
        .filter((question) => question.answer === answer)
        .flatMap(({ prompt }) => buildSoundSchedule(prompt.clips[0]))
        .map(({ loudness }) => loudness);

    expect(Math.max(...loudnessOf("sneaking"))).toBeLessThanOrEqual(
      loudnessLevels.piano,
    );
    expect(Math.max(...loudnessOf("triumph"))).toBeGreaterThanOrEqual(
      loudnessLevels.fortissimo,
    );
  });
});

describe("triplet trail", () => {
  it("plays the rhythm of the answer, always with a triplet or syncopation", () => {
    for (const { prompt, answer } of askMany(tripletTrail, 3)) {
      const heard = buildSoundSchedule(prompt.clips[0]).filter(
        ({ instrument }) => instrument !== "tick",
      );
      const sounds = listRhythmSounds(answer).filter(({ isRest }) => !isRest);
      expect(heard).toHaveLength(sounds.length);
      expect(answer).toMatch(/tri-o-la|syn-co-pa/);
    }
  });

  it("fills every rhythm card with exactly four beats", () => {
    for (const difficulty of musicDifficulties) {
      for (const { choices } of askMany(tripletTrail, difficulty)) {
        for (const choice of choices) {
          expect(countRhythmBeats(choice)).toBeCloseTo(4);
        }
      }
    }
  });
});

describe("melody dictation", () => {
  it("draws the answer's stave with exactly the pitches the child hears", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(melodyDictation, difficulty)) {
        const art = melodyDictation.findChoiceArt(answer);
        if (art.kind !== "card" || art.face.kind !== "staff") {
          expect.fail("the melody isn't drawn on a stave");
        }
        const drawn = art.face.chords.flatMap(({ notes }) =>
          notes.map((note) => findPitchOf(note)),
        );
        const heard = buildSoundSchedule(prompt.clips[0]).map(
          ({ pitches: [pitch] }) => pitch,
        );
        expect(heard).toEqual(drawn);
        expect(drawn).toHaveLength(difficulty === 3 ? 5 : 4);
      }
    }
  });
});

describe("conductor's challenge", () => {
  it("conducts the answer's beats per bar and accents only the first beat of each bar", () => {
    for (const { prompt, answer } of askMany(conductorsChallenge, 3)) {
      const beatsPerBar = Number(answer.split("/")[0]);
      expect(prompt.stage).toEqual({ kind: "conductor", beatsPerBar });
      const clip = prompt.clips[0];
      expect(countClipBeats(clip) % beatsPerBar).toBe(0);
      const secondsPerBar = (beatsPerBar * 60) / clip.tempo;
      const schedule = buildSoundSchedule(clip);
      const loudest = Math.max(...schedule.map(({ loudness }) => loudness));
      for (const { startSeconds, loudness } of schedule) {
        const isBarStart =
          Math.abs(
            startSeconds / secondsPerBar -
              Math.round(startSeconds / secondsPerBar),
          ) < 1e-6;
        if (loudness === loudest) {
          expect(isBarStart).toBe(true);
        }
      }
    }
  });
});
