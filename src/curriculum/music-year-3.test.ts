import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import {
  buildSoundSchedule,
  countRhythmBeats,
  findClipSeconds,
  findPitchOf,
} from "./music-theory.js";
import {
  allegroOrAdagio,
  barBuilder,
  forteOrPiano,
  layerCake,
  loopCounter,
  marchOrWaltz,
  orchestraFamilies,
  solfaLadder,
  staffClimbers,
  yearThreeMusicGames,
} from "./music-year-3.js";

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

describe("the Year 3 music games", () => {
  it("has ten games, each with its own Game Type and Skill", () => {
    expect(yearThreeMusicGames).toHaveLength(10);
    expect(
      new Set(yearThreeMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(10);
    expect(
      new Set(yearThreeMusicGames.map(({ skillId }) => skillId)).size,
    ).toBe(10);
  });

  it.each(
    yearThreeMusicGames.flatMap((game) =>
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
          ...(prompt.reward === undefined ? [] : [prompt.reward]),
        ]) {
          expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
          expect(findClipSeconds(clip)).toBeLessThan(12);
        }
      }
    },
  );

  it.each(yearThreeMusicGames)(
    "gives every choice of $gameType a sound that fits in a few seconds",
    (game) => {
      const choices = musicDifficulties.flatMap((difficulty) =>
        askMany(game, difficulty, 20).flatMap((question) => question.choices),
      );
      for (const choice of new Set(choices)) {
        const sound = game.findChoiceSound(choice);
        if (sound !== undefined) {
          expect(findClipSeconds(sound)).toBeLessThan(12);
        }
      }
    },
  );
});

describe("march or waltz", () => {
  it("puts the strong beat at the start of every bar of the answer's length", () => {
    for (const { prompt, answer } of askMany(marchOrWaltz, 3)) {
      const [clip] = prompt.clips;
      const beatsPerBar = Number(answer.split(" ")[0]);
      const strongBeats = buildSoundSchedule(clip)
        .filter(({ loudness }) => loudness === 1)
        .map(({ startSeconds }) => (startSeconds * clip.tempo) / 60);
      expect(strongBeats.length).toBeGreaterThan(2);
      strongBeats.forEach((beat, index) => {
        expect(beat).toBeCloseTo(index * beatsPerBar);
      });
    }
  });
});

describe("forte or piano", () => {
  it("plays fortissimo louder than forte, forte than piano, and piano than pianissimo", () => {
    const questions = askMany(forteOrPiano, 2, 120);
    const findLoudestOf = (answer: string) =>
      Math.max(
        ...questions
          .filter((question) => question.answer === answer)
          .flatMap(({ prompt }) => buildSoundSchedule(prompt.clips[0]))
          .map(({ loudness }) => loudness),
      );
    const loudest = ["fortissimo", "forte", "piano", "pianissimo"].map(
      findLoudestOf,
    );
    loudest.slice(1).forEach((loudness, index) => {
      expect(loudness).toBeLessThan(loudest[index]);
    });
  });
});

describe("allegro or adagio", () => {
  it("plays each tempo word at its usual speed", () => {
    const expectedTempos = new Map(
      Object.entries({ adagio: 60, andante: 88, allegro: 140, presto: 184 }),
    );
    for (const { prompt, answer } of askMany(allegroOrAdagio, 3)) {
      const expectedTempo = expectedTempos.get(answer) ?? 0;
      expect(Math.abs(prompt.clips[0].tempo - expectedTempo)).toBeLessThan(10);
    }
  });
});

describe("allegro or adagio's pictures", () => {
  it("draws each tempo word as a creature moving at its speed, so no two choices look alike", () => {
    const pictures = ["adagio", "andante", "allegro", "presto"].map((choice) =>
      allegroOrAdagio.findChoiceArt(choice),
    );

    expect(pictures).toEqual([
      { kind: "model", model: "tortoise" },
      { kind: "model", model: "bear" },
      { kind: "model", model: "kangaroo" },
      { kind: "model", model: "hare" },
    ]);
  });
});

describe("loop counter", () => {
  it("plays the very same ostinato as many times as the answer", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(loopCounter, difficulty)) {
        const repeats = Number(answer);
        const { notes } = prompt.clips[0].voices[0];
        expect(notes.length % repeats).toBe(0);
        const patternLength = notes.length / repeats;
        const pattern = JSON.stringify(notes.slice(0, patternLength));
        for (let repeat = 1; repeat < repeats; repeat++) {
          expect(
            JSON.stringify(
              notes.slice(repeat * patternLength, (repeat + 1) * patternLength),
            ),
          ).toBe(pattern);
        }
        expect(prompt.clips[0].voices).toHaveLength(difficulty === 1 ? 1 : 2);
      }
    }
  });
});

describe("staff climbers", () => {
  it("shows the note named by the answer and plays it as the reward", () => {
    for (const { prompt, answer } of askMany(staffClimbers, 3)) {
      if (prompt.stage.kind !== "music-stand") {
        expect.fail("staff climbers needs a music stand");
      }
      const { face } = prompt.stage;
      if (face.kind !== "staff") {
        expect.fail("staff climbers needs a staff");
      }
      const [shownNote] = face.chords[0].notes;
      expect(shownNote).toBe(`${answer}4`);
      const [reward] = buildSoundSchedule(
        prompt.reward ?? expect.fail("staff climbers has no reward"),
      );
      expect(reward.pitches).toEqual([findPitchOf(shownNote)]);
    }
  });
});

describe("layer cake", () => {
  it("plays as many layers together as the answer", () => {
    for (const { prompt, answer } of askMany(layerCake, 3)) {
      expect(prompt.clips[0].voices).toHaveLength(Number(answer.split(" ")[0]));
    }
  });
});

describe("orchestra families", () => {
  const families = new Map(
    Object.entries({
      violin: "strings",
      cello: "strings",
      "double-bass": "strings",
      harp: "strings",
      flute: "woodwind",
      clarinet: "woodwind",
      oboe: "woodwind",
      bassoon: "woodwind",
      trumpet: "brass",
      trombone: "brass",
      tuba: "brass",
      "french-horn": "brass",
      "hand-drum": "percussion",
      timpani: "percussion",
      xylophone: "percussion",
      "snare-drum": "percussion",
    }),
  );

  it("sorts every instrument it plays into its own orchestra family", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer } of askMany(orchestraFamilies, difficulty)) {
        const [{ instrument }] = prompt.clips[0].voices;
        expect(families.get(instrument), instrument).toBe(answer);
      }
    }
  });
});

describe("bar builder", () => {
  it("offers exactly one note that fills the bar to four beats", () => {
    for (const difficulty of musicDifficulties) {
      for (const { prompt, answer, choices } of askMany(
        barBuilder,
        difficulty,
      )) {
        if (prompt.stage.kind !== "music-stand") {
          expect.fail("bar builder needs a music stand");
        }
        const { face } = prompt.stage;
        if (face.kind !== "rhythm") {
          expect.fail("bar builder needs a rhythm");
        }
        const gapBeats = face.gapBeats ?? 0;
        expect(countRhythmBeats(face.rhythm) + gapBeats).toBe(4);
        const fillers = choices.filter(
          (choice) => countRhythmBeats(choice) === gapBeats,
        );
        expect(fillers).toEqual([answer]);
      }
    }
  });
});

describe("solfa ladder", () => {
  it("plays the mystery note the right number of semitones above do", () => {
    const semitonesAboveDo = new Map(
      Object.entries({ do: 0, re: 2, mi: 4, so: 7, la: 9 }),
    );
    for (const { prompt, answer } of askMany(solfaLadder, 3)) {
      const [[doNote], [mysteryNote]] = prompt.clips.map(buildSoundSchedule);
      expect(mysteryNote.pitches[0] - doNote.pitches[0]).toBe(
        semitonesAboveDo.get(answer),
      );
    }
  });
});
