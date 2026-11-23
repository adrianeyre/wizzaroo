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
  loadReadAloudVoiceName,
  readAloudVoices,
  readAloudVoiceStorageKey,
  storeReadAloudVoiceName,
} from "./read-aloud-voices.js";

describe("the reading voices", () => {
  it("are sixteen, all from the UK and Ireland but one US English female and one US English male voice", () => {
    expect(readAloudVoices).toHaveLength(16);
    const us = readAloudVoices.filter(({ accent }) => accent === "US English");
    expect(us.map(({ id, voice }) => `${id}:${voice}`)).toStrictEqual([
      "kristin:female",
      "john:male",
    ]);
    expect(
      readAloudVoices
        .filter(({ accent }) => accent !== "US English")
        .every(
          ({ accent }) =>
            accent.startsWith("UK English") || accent === "Irish English",
        ),
    ).toBe(true);
    expect(
      readAloudVoices.filter(({ accent }) => accent.startsWith("UK English")),
    ).toHaveLength(13);
  });

  it("are eight female and eight male voices", () => {
    expect(
      readAloudVoices.filter(({ voice }) => voice === "female"),
    ).toHaveLength(8);
    expect(
      readAloudVoices.filter(({ voice }) => voice === "male"),
    ).toHaveLength(8);
  });

  it("gives every voice its own id and name, and every reader of a model its own number in it", () => {
    expect(new Set(readAloudVoices.map(({ id }) => id)).size).toBe(16);
    expect(new Set(readAloudVoices.map(({ name }) => name)).size).toBe(16);
    for (const model of piperModels) {
      const speakerIds = readAloudVoices
        .filter((voice) => voice.model === model)
        .map(({ speakerId }) => speakerId);
      expect(speakerIds.length).toBeGreaterThan(0);
      expect(new Set(speakerIds).size).toBe(speakerIds.length);
    }
  });

  it("describes each voice by where it is from and whether it is female or male", () => {
    expect(findReadAloudVoice("seren").description).toBe(
      "UK English (Wales) · Female voice",
    );
    expect(findReadAloudVoice("adrian").description).toBe(
      "UK English (Northern England) · Male voice",
    );
  });

  it("pins every file by size and SHA-256, at an address with its fingerprint in it", () => {
    const files = listPiperFiles();
    expect(files).toHaveLength(16);
    for (const file of files) {
      expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(file.bytes).toBeGreaterThan(0);
      expect(file.url).toMatch(/^https:\/\/.+\/[^/]+$/);
      expect(file.url.endsWith(`/${file.name}`)).toBe(true);
      expect(findPiperFilePath(file)).toBe(
        `/voices/${file.sha256.slice(0, 16)}/${file.name}`,
      );
    }
  });

  it("fetches Piper's own voices at a pinned revision, never at whatever is newest", () => {
    for (const { model, config } of piperModels) {
      for (const { url } of [model, config]) {
        expect(url).not.toContain("/resolve/main/");
      }
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

  it("is Adrian by default, a UK English male voice", () => {
    expect(defaultReadAloudVoiceName).toBe("adrian");
    expect(loadReadAloudVoiceName()).toBe("adrian");
    expect(findReadAloudVoice("adrian")).toMatchObject({
      name: "Adrian",
      voice: "male",
      accent: "UK English (Northern England)",
    });
  });

  it("is kept on the device", () => {
    storeReadAloudVoiceName("seren");
    expect(localStorage.getItem(readAloudVoiceStorageKey)).toBe("seren");
    expect(loadReadAloudVoiceName()).toBe("seren");
  });

  it("goes back to the default for a voice that is gone, such as one of Clean 100's readers", () => {
    localStorage.setItem(readAloudVoiceStorageKey, "clean100-40");
    expect(isReadAloudVoiceName("clean100-40")).toBe(false);
    expect(loadReadAloudVoiceName()).toBe("adrian");
    expect(findReadAloudVoice("clean100-40").id).toBe("adrian");
  });

  it("keeps a voice a device chose before, if it is still offered, such as Cori", () => {
    localStorage.setItem(readAloudVoiceStorageKey, "cori-med");
    expect(loadReadAloudVoiceName()).toBe("cori-med");
  });
});
