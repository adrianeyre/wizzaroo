import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { piperVoice } from "./piper.js";
import {
  getVoiceOverUrl,
  isVoiceOverKey,
  recordedPhonemeSounds,
} from "./voice-over.js";
import {
  buildMonoWav,
  buildVoiceOverFileName,
  findKeyOfVoiceOverFile,
  findSoundOfPhonemeFile,
  parseVoiceOverLines,
  planVoiceOver,
  readMonoWav,
  resampleSound,
  UnreadableWavError,
} from "./voice-over-files.js";
import voiceOverLines from "./voice-over-lines.json" with { type: "json" };
import { phonicsGames } from "../../curriculum/phonics-games.js";
import { musicGames } from "../../curriculum/music-games.js";
import { skills } from "../../curriculum/skills.js";

const voice = "piper en_GB-test-voice";
const popTheBond = {
  key: "bubbles.pop-the-bond",
  text: "Pop the bubble that makes ten.",
};
const wellDone = { key: "bubbles.well-done", text: "Well done!" };

describe("parseVoiceOverLines", () => {
  it("reads each key and the words it says, in the order they are written", () => {
    const linesFile = JSON.stringify({
      [popTheBond.key]: popTheBond.text,
      [wellDone.key]: wellDone.text,
    });

    expect(parseVoiceOverLines(linesFile)).toEqual([popTheBond, wellDone]);
  });

  it("rejects two lines with the same key, which JSON would otherwise quietly merge", () => {
    const linesFile = `{\n  "bubbles.well-done": "Well done!",\n  "bubbles.well-done": "Brilliant!"\n}\n`;

    expect(() => parseVoiceOverLines(linesFile)).toThrow(
      'Two voice-over lines have the key "bubbles.well-done"',
    );
  });

  it("allows a line whose words look like a key", () => {
    const linesFile = `{\n  "mission.finished": "You did it!",\n  "mission.again": "\\"mission.finished\\": again"\n}\n`;

    expect(parseVoiceOverLines(linesFile)).toHaveLength(2);
  });

  it.each([
    ["lines that aren't an object", "[]", "must be one object"],
    [
      "a key with capitals",
      '{ "Bubbles.PopTheBond": "Pop!" }',
      'key "Bubbles.PopTheBond" needs to be shaped like',
    ],
    [
      "a key with spaces",
      '{ "pop the bond": "Pop!" }',
      'key "pop the bond" needs to be shaped like',
    ],
    [
      "a key ending in a dot",
      '{ "bubbles.": "Pop!" }',
      'key "bubbles." needs to be shaped like',
    ],
    [
      "a line with no words",
      '{ "bubbles.pop": "  " }',
      'line "bubbles.pop" needs words to say',
    ],
    [
      "a line that isn't words",
      '{ "bubbles.pop": 10 }',
      'line "bubbles.pop" needs words to say',
    ],
  ])("rejects %s", (_, linesFile, message) => {
    expect(() => parseVoiceOverLines(linesFile)).toThrow(message);
  });
});

describe("buildVoiceOverFileName", () => {
  it("names the audio after its key and a fingerprint of the voice and words", async () => {
    expect(await buildVoiceOverFileName(popTheBond, voice)).toMatch(
      /^bubbles\.pop-the-bond\.[0-9a-f]{12}\.wav$/,
    );
  });

  it("gives the same line in the same voice the same name every time", async () => {
    expect(await buildVoiceOverFileName(popTheBond, voice)).toBe(
      await buildVoiceOverFileName({ ...popTheBond }, voice),
    );
  });

  it("gives a line a new name when its words change", async () => {
    expect(await buildVoiceOverFileName(popTheBond, voice)).not.toBe(
      await buildVoiceOverFileName(
        { ...popTheBond, text: "Pop the bubble that makes 10!" },
        voice,
      ),
    );
  });

  it("gives a line a new name when the voice changes", async () => {
    expect(await buildVoiceOverFileName(popTheBond, voice)).not.toBe(
      await buildVoiceOverFileName(popTheBond, "azure en-GB-SoniaNeural"),
    );
  });
});

describe("findKeyOfVoiceOverFile", () => {
  it.each(["bubbles.pop-the-bond", "mission.one-more-go", "hello", "a.b.c-1"])(
    'finds the key "%s" in the name of its audio',
    async (key) => {
      const fileName = await buildVoiceOverFileName({ key, text: "Hi" }, voice);

      expect(findKeyOfVoiceOverFile(fileName)).toBe(key);
    },
  );

  it.each([
    "voice-over.ts",
    "voice-over-lines.json",
    "bubbles.pop-the-bond.wav",
    "bubbles.pop-the-bond.fea67e2cc614.wav.partial",
    "bubbles.pop-the-bond.FEA67E2CC614.wav",
  ])('finds no key in "%s"', (fileName) => {
    expect(findKeyOfVoiceOverFile(fileName)).toBeUndefined();
  });
});

describe("planVoiceOver", () => {
  it("speaks every line when there is no audio yet", async () => {
    const plan = await planVoiceOver({
      lines: [popTheBond, wellDone],
      voice,
      existingFileNames: [],
    });

    expect(plan.linesToSpeak.map(({ key }) => key)).toEqual([
      popTheBond.key,
      wellDone.key,
    ]);
    expect(plan.fileNamesToDelete).toEqual([]);
  });

  it("speaks only the line whose words changed, and deletes its old audio", async () => {
    const changedWellDone = { ...wellDone, text: "Brilliant, well done!" };
    const oldWellDoneFile = await buildVoiceOverFileName(wellDone, voice);

    const plan = await planVoiceOver({
      lines: [popTheBond, changedWellDone],
      voice,
      existingFileNames: [
        await buildVoiceOverFileName(popTheBond, voice),
        oldWellDoneFile,
      ],
    });

    expect(plan.linesToSpeak).toEqual([
      {
        ...changedWellDone,
        fileName: await buildVoiceOverFileName(changedWellDone, voice),
      },
    ]);
    expect(plan.fileNamesToDelete).toEqual([oldWellDoneFile]);
  });

  it("speaks a line again when its audio has gone missing", async () => {
    const plan = await planVoiceOver({
      lines: [popTheBond, wellDone],
      voice,
      existingFileNames: [await buildVoiceOverFileName(popTheBond, voice)],
    });

    expect(plan.linesToSpeak.map(({ key }) => key)).toEqual([wellDone.key]);
  });

  it("speaks nothing and deletes nothing when every line's audio is current", async () => {
    const plan = await planVoiceOver({
      lines: [popTheBond, wellDone],
      voice,
      existingFileNames: [
        await buildVoiceOverFileName(popTheBond, voice),
        await buildVoiceOverFileName(wellDone, voice),
        "voice-over.ts",
        "voice-over-lines.json",
        "voice-licence.md",
      ],
    });

    expect(plan).toEqual({ linesToSpeak: [], fileNamesToDelete: [] });
  });

  it("deletes the audio of a line that was removed", async () => {
    const removedLineFile = await buildVoiceOverFileName(wellDone, voice);

    const plan = await planVoiceOver({
      lines: [popTheBond],
      voice,
      existingFileNames: [
        await buildVoiceOverFileName(popTheBond, voice),
        removedLineFile,
      ],
    });

    expect(plan).toEqual({
      linesToSpeak: [],
      fileNamesToDelete: [removedLineFile],
    });
  });

  it("speaks every line again in a new voice, deleting the old voice's audio", async () => {
    const oldVoiceFiles = [
      await buildVoiceOverFileName(popTheBond, voice),
      await buildVoiceOverFileName(wellDone, voice),
    ];

    const plan = await planVoiceOver({
      lines: [popTheBond, wellDone],
      voice: "azure en-GB-SoniaNeural",
      existingFileNames: oldVoiceFiles,
    });

    expect(plan.linesToSpeak).toHaveLength(2);
    expect(plan.fileNamesToDelete).toEqual(oldVoiceFiles);
  });
});

describe("findSoundOfPhonemeFile", () => {
  it("reads which of the 44 sounds a phoneme recording is", () => {
    expect(findSoundOfPhonemeFile("s.wav")).toBe("s");
    expect(findSoundOfPhonemeFile("oo-long.wav")).toBe("oo-long");
    expect(findSoundOfPhonemeFile("th-voiced.wav")).toBe("th-voiced");
  });

  it("refuses a recording named after anything other than one of the 44 sounds", () => {
    expect(findSoundOfPhonemeFile("em.wav")).toBeUndefined();
    expect(findSoundOfPhonemeFile("oo.wav")).toBeUndefined();
    expect(findSoundOfPhonemeFile("s.mp3")).toBeUndefined();
    expect(findSoundOfPhonemeFile("S.wav")).toBeUndefined();
  });
});

describe("the voice-over in the repo", () => {
  it("names every phoneme recording after one of the 44 sounds, so the game can offer it", async () => {
    const phonemeFileNames = await readdir(
      join(import.meta.dirname, "phonemes"),
    ).catch(() => []);
    const recordings = phonemeFileNames.filter((fileName) =>
      fileName.endsWith(".wav"),
    );

    expect(recordings.map(findSoundOfPhonemeFile)).not.toContain(undefined);
    expect(recordedPhonemeSounds.size).toBe(recordings.length);
  });

  it("has audio made by Piper from the current words of every line, and no other audio", async () => {
    const voiceOverDirectory = import.meta.dirname;
    const linesFile = await readFile(
      join(voiceOverDirectory, "voice-over-lines.json"),
      "utf8",
    );

    const plan = await planVoiceOver({
      lines: parseVoiceOverLines(linesFile),
      voice: piperVoice,
      existingFileNames: await readdir(voiceOverDirectory),
    });

    expect(plan).toEqual({ linesToSpeak: [], fileNamesToDelete: [] });
  });

  it("says every Phonics game's instruction, word for word", () => {
    const lines = new Map(Object.entries(voiceOverLines));
    for (const { id, instruction } of phonicsGames) {
      expect(lines.get(`phonics-games.${id}`)).toBe(instruction);
    }
  });

  it("says each Year 1 and Year 2 music game's instruction word for word, from its own line or a shared line with the same words, and has a shared line for the older years", () => {
    const lines = new Map(Object.entries(voiceOverLines));
    for (const { gameType, skillId, instruction, hintKind } of musicGames) {
      const yearGroup = skills.find(({ id }) => id === skillId)?.yearGroup;
      const ownLine = lines.get(`music.${gameType}`);
      const sharedLine = lines.get(
        hintKind === "listen" ? "music.listen-and-tap" : "music.look-and-tap",
      );
      if (yearGroup !== undefined && yearGroup <= 2) {
        expect(ownLine ?? sharedLine, gameType).toBe(instruction);
        expect(instruction.length, gameType).toBeLessThanOrEqual(60);
      } else {
        expect(ownLine, gameType).toBeUndefined();
      }
    }
    for (const key of [
      "music.listen-again",
      "music.look-again",
      "music.listen-and-tap",
      "music.look-and-tap",
    ]) {
      expect(lines.has(key), key).toBe(true);
    }
  });

  it("gives the client a URL to play for every line", () => {
    const keys = Object.keys(voiceOverLines).filter(isVoiceOverKey);

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(getVoiceOverUrl(key)).toMatch(
        new RegExp(`/${key.replaceAll(".", "\\.")}\\.[0-9a-f]{12}\\.wav$`),
      );
    }
  });
});

describe("readMonoWav and buildMonoWav", () => {
  it("reads back the sound it writes, sample for sample", () => {
    const sound = {
      sampleRate: 22_050,
      samples: Int16Array.from([0, 120, -340, 32_767, -32_768]),
    };

    expect(readMonoWav(buildMonoWav(sound))).toEqual(sound);
  });

  it("refuses a file that isn't a WAV", () => {
    expect(() =>
      readMonoWav(new TextEncoder().encode("not a wav file at all, honestly")),
    ).toThrow(UnreadableWavError);
  });
});

describe("resampleSound", () => {
  const buildTone = (
    frequency: number,
    sampleRate: number,
    seconds: number,
  ) => ({
    sampleRate,
    samples: Int16Array.from(
      { length: Math.round(sampleRate * seconds) },
      (_, index) =>
        Math.round(
          Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 10_000,
        ),
    ),
  });
  const findLoudness = (samples: Int16Array) =>
    Math.sqrt(
      samples.reduce((total, sample) => total + sample ** 2, 0) /
        samples.length,
    );

  it("keeps a speech-range tone at the same length and loudness at the lower rate", () => {
    const tone = buildTone(440, 22_050, 0.5);
    const resampled = resampleSound(tone, 16_000);

    expect(resampled.sampleRate).toBe(16_000);
    expect(resampled.samples.length).toBe(8000);
    expect(findLoudness(resampled.samples.slice(200, -200))).toBeCloseTo(
      findLoudness(tone.samples),
      -2,
    );
  });

  it("filters out a tone too high for the lower rate, rather than folding it back as noise", () => {
    const resampled = resampleSound(buildTone(10_000, 22_050, 0.5), 16_000);

    expect(findLoudness(resampled.samples.slice(200, -200))).toBeLessThan(1500);
  });

  it("leaves a sound already at or below the rate alone", () => {
    const tone = buildTone(440, 16_000, 0.1);

    expect(resampleSound(tone, 16_000)).toBe(tone);
  });
});
