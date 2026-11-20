import { describe, expect, it } from "vitest";
import { musicDifficulties, type MusicGame } from "./music-game.js";
import {
  buildSoundSchedule,
  countClipBeats,
  countRhythmBeats,
  findClipSeconds,
  listRhythmSounds,
} from "./music-theory.js";
import {
  bigDrumLittleDrum,
  chantAlong,
  clapStampClick,
  drumBeatCounter,
  echoMountain,
  longAndShort,
  upDownOrStay,
  yearOneMusicGames,
} from "./music-year-1.js";

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

describe("the Year 1 music games", () => {
  it("has ten games and Chant along, each with its own Game Type and Skill", () => {
    expect(yearOneMusicGames).toHaveLength(11);
    expect(
      new Set(yearOneMusicGames.map(({ gameType }) => gameType)).size,
    ).toBe(11);
    expect(new Set(yearOneMusicGames.map(({ skillId }) => skillId)).size).toBe(
      11,
    );
  });

  it.each(
    yearOneMusicGames.flatMap((game) =>
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
        for (const clip of prompt.clips) {
          expect(buildSoundSchedule(clip).length).toBeGreaterThan(0);
          expect(findClipSeconds(clip)).toBeLessThan(12);
        }
      }
    },
  );
});

describe("big drum, little drum", () => {
  it("plays loud music far louder than quiet music", () => {
    const questions = askMany(bigDrumLittleDrum, 1);
    const loudnessOf = (answer: string) =>
      questions
        .filter((question) => question.answer === answer)
        .flatMap(({ prompt }) => buildSoundSchedule(prompt.clips[0]))
        .map(({ loudness }) => loudness);

    expect(Math.min(...loudnessOf("loud"))).toBeGreaterThan(
      Math.max(...loudnessOf("quiet")) * 4,
    );
  });
});

describe("drum beat counter", () => {
  it("plays exactly as many drum beats as the answer", () => {
    for (const { prompt, answer } of askMany(drumBeatCounter, 3)) {
      expect(buildSoundSchedule(prompt.clips[0])).toHaveLength(Number(answer));
    }
  });
});

describe("clap, stamp, click", () => {
  it("plays the claps, stamps and clicks in the order of the answer", () => {
    for (const { prompt, answer } of askMany(clapStampClick, 2)) {
      const heard = buildSoundSchedule(prompt.clips[0])
        .toSorted((first, second) => first.startSeconds - second.startSeconds)
        .map(({ instrument }) => instrument)
        .join(" ");
      expect(heard).toBe(answer);
    }
  });
});

describe("long and short sounds", () => {
  it("holds long sounds several times longer than short ones", () => {
    const [long, short] = buildSoundSchedule(
      longAndShort.findChoiceSound("long short") ??
        expect.fail("long and short has no choice sound"),
    );
    expect(long.durationSeconds).toBeGreaterThan(short.durationSeconds * 4);
  });
});

describe("echo mountain", () => {
  it("echoes the very same tune when the answer is same, and changes one note otherwise", () => {
    for (const { prompt, answer } of askMany(echoMountain, 3)) {
      const [call, echo] = prompt.clips.map((clip) =>
        buildSoundSchedule(clip).map(({ pitches }) => pitches.join()),
      );
      const changedNotes = call.filter((pitch, index) => pitch !== echo[index]);
      expect(changedNotes).toHaveLength(answer === "same" ? 0 : 1);
    }
  });
});

describe("up, down or stay", () => {
  it("plays a tune that only ever moves the way the answer says", () => {
    for (const { prompt, answer } of askMany(upDownOrStay, 3)) {
      const pitches = buildSoundSchedule(prompt.clips[0]).map(
        ({ pitches: [pitch] }) => pitch,
      );
      const moves = pitches
        .slice(1)
        .map((pitch, index) => Math.sign(pitch - pitches[index]));
      const expectedMove = { up: 1, down: -1, stay: 0 }[answer];
      expect(
        moves.every((move) => move === expectedMove),
        answer,
      ).toBe(true);
      expect(countClipBeats(prompt.clips[0])).toBe(pitches.length);
    }
  });
});

describe("chant along", () => {
  const countSyllables = (words: string) =>
    words.split(/[\s-]+/).filter((syllable) => syllable !== "").length;
  const countSounds = (rhythm: string) =>
    listRhythmSounds(rhythm).filter(({ isRest }) => !isRest).length;

  it("claps one sound for each syllable of the answer, two beats long at first and four beats long after", () => {
    for (const difficulty of [1, 2] as const) {
      for (const { prompt, answer } of askMany(chantAlong, difficulty)) {
        const [clip] = prompt.clips;
        expect(buildSoundSchedule(clip)).toHaveLength(countSyllables(answer));
        expect(countClipBeats(clip)).toBe(difficulty === 1 ? 2 : 4);
      }
    }
  });

  it("only offers words whose rhythms differ from the answer's and from each other", () => {
    const describeChantedRhythm = (choice: string) => {
      const sound = chantAlong.findChoiceSound(choice);
      return sound === undefined
        ? expect.fail(`"${choice}" has no chant to play`)
        : buildSoundSchedule(sound)
            .map(({ startSeconds }) => startSeconds.toFixed(2))
            .join();
    };
    for (const difficulty of [1, 2] as const) {
      for (const { choices } of askMany(chantAlong, difficulty)) {
        const rhythms = choices.map(describeChantedRhythm);
        expect(new Set(rhythms).size).toBe(choices.length);
      }
    }
  });

  it("chants a four-beat line on the stones, one syllable to a sound, and asks for its rhythm", () => {
    for (const { prompt, answer, choices } of askMany(chantAlong, 3)) {
      expect(prompt.stage.kind).toBe("chant-stones");
      if (prompt.stage.kind !== "chant-stones") {
        continue;
      }
      expect(prompt.stage.rhythm).toBe(answer);
      expect(prompt.stage.syllables).toHaveLength(countSounds(answer));
      expect(buildSoundSchedule(prompt.clips[0])).toHaveLength(
        countSounds(answer),
      );
      expect(choices).toHaveLength(4);
      for (const choice of choices) {
        expect(countRhythmBeats(choice)).toBe(4);
      }
    }
  });
});
