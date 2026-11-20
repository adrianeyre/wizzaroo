import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findPiperFilePath,
  listPiperFiles,
  piperModels,
} from "../../curriculum/piper-voice-models.js";
import {
  defaultReadAloudVoiceName,
  findReadAloudVoice,
  isReadAloudVoiceName,
  listModelReadAloudVoices,
  loadReadAloudVoiceName,
  readAloudVoices,
  readAloudVoiceStorageKey,
  storeReadAloudVoiceName,
} from "./read-aloud-voices.js";

describe("the reading voices", () => {
  it("are every voice on Bryce Beattie's page, and every reader of its many-speaker voices", () => {
    expect(piperModels.map(({ id }) => id)).toStrictEqual([
      "lj-med",
      "ljspeech",
      "jenny",
      "cori-high",
      "cori-med",
      "kristin",
      "john",
      "bryce",
      "norman",
      "mv2",
      "clean100",
    ]);
    expect(listModelReadAloudVoices("mv2")).toHaveLength(16);
    expect(listModelReadAloudVoices("clean100")).toHaveLength(245);
    expect(readAloudVoices).toHaveLength(9 + 16 + 245);
  });

  it("gives every voice its own id, and every reader of a model its own number in it", () => {
    expect(new Set(readAloudVoices.map(({ id }) => id)).size).toBe(
      readAloudVoices.length,
    );
    for (const model of piperModels) {
      const speakerIds = listModelReadAloudVoices(model.id).map(
        ({ speakerId }) => speakerId,
      );
      expect(new Set(speakerIds).size).toBe(speakerIds.length);
    }
  });

  it("calls only the one-speaker voices female or male, as the page does", () => {
    expect(
      readAloudVoices
        .filter(({ voice }) => voice !== undefined)
        .map(({ id, voice }) => `${id}:${String(voice)}`),
    ).toStrictEqual([
      "lj-med:female",
      "ljspeech:female",
      "jenny:female",
      "cori-high:female",
      "cori-med:female",
      "kristin:female",
      "john:male",
      "bryce:male",
      "norman:male",
    ]);
  });

  it("names ManyVoice's readers as LibriVox credits them, and Clean 100's by number", () => {
    expect(findReadAloudVoice("mv2-cori-samuel").name).toBe("Cori Samuel");
    expect(findReadAloudVoice("mv2-james-k-white").name).toBe("James K. White");
    expect(findReadAloudVoice("clean100-6209")).toMatchObject({
      name: "Reader 6209",
      speakerId: 0,
    });
  });

  it("pins every file by size and SHA-256, at an address with its fingerprint in it", () => {
    const files = listPiperFiles();
    expect(files).toHaveLength(22);
    for (const file of files) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
      expect(findPiperFilePath(file)).toBe(
        `/voices/${file.sha256.slice(0, 16)}/${file.name}`,
      );
    }
  });
});

describe("the chosen voice", () => {
  beforeEach(() => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => kept.get(key) ?? null,
      setItem: (key: string, value: string) => kept.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is Cori by default, the voice of Wizzaroo's own recordings", () => {
    expect(defaultReadAloudVoiceName).toBe("cori-med");
    expect(loadReadAloudVoiceName()).toBe("cori-med");
  });

  it("is kept on the device", () => {
    storeReadAloudVoiceName("clean100-40");
    expect(localStorage.getItem(readAloudVoiceStorageKey)).toBe("clean100-40");
    expect(loadReadAloudVoiceName()).toBe("clean100-40");
  });

  it("goes back to the default for a voice that is gone, such as one of the old Speakers", () => {
    localStorage.setItem(readAloudVoiceStorageKey, "helen");
    expect(isReadAloudVoiceName("helen")).toBe(false);
    expect(loadReadAloudVoiceName()).toBe("cori-med");
    expect(findReadAloudVoice("helen").id).toBe("cori-med");
  });
});
