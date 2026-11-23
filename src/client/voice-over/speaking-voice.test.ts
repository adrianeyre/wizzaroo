import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLoudness,
  findMouthOpenness,
  findSpeakingCharacter,
  isVoiceOnStage,
  showVoiceOnStage,
  startSpeaking,
  subscribeToSpeaking,
} from "./speaking-voice.js";

const sampleRate = 1000;

/** Silence, then a loud stretch, then silence: a tenth of a second each. */
const buildWord = (): Float32Array => {
  const samples = new Float32Array(300);
  for (let index = 100; index < 200; index++) {
    samples[index] = Math.sin(index) * 0.8;
  }
  return samples;
};

afterEach(() => {
  findSpeakingCharacter()?.stop();
});

describe("buildLoudness", () => {
  it("is near nothing in silence and near full while the voice is loud", () => {
    const loudness = buildLoudness(buildWord(), sampleRate);

    expect(loudness.readAt(0.05)).toBeLessThan(0.1);
    expect(loudness.readAt(0.15)).toBeGreaterThan(0.7);
    expect(loudness.readAt(0.25)).toBeLessThan(0.1);
    expect(loudness.readAt(5)).toBe(0);
  });

  it("is nothing all through a silent sound, rather than dividing by zero", () => {
    const loudness = buildLoudness(new Float32Array(300), sampleRate);

    expect(loudness.readAt(0.15)).toBe(0);
  });
});

describe("startSpeaking", () => {
  it("names who is speaking until they stop, telling listeners each time", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSpeaking(listener);

    const speaking = startSpeaking("adrian", () => 0);
    expect(findSpeakingCharacter()?.voice).toBe("adrian");
    speaking.stop();
    expect(findSpeakingCharacter()).toBeUndefined();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("opens the mouth as loud as the sound playing at the speaker's clock", () => {
    let clock = 0;
    const speaking = startSpeaking("cori-med", () => clock);
    speaking.hear(10, buildLoudness(buildWord(), sampleRate));

    clock = 10.05;
    expect(findMouthOpenness()).toBeLessThan(0.1);
    clock = 10.15;
    expect(findMouthOpenness()).toBeGreaterThan(0.7);
    clock = 9;
    expect(findMouthOpenness()).toBe(0);
  });

  it("lets a new speaker take over, and an old one stopping late leaves them be", () => {
    const first = startSpeaking("adrian", () => 0);
    startSpeaking("kofi", () => 0);

    first.stop();

    expect(findSpeakingCharacter()?.voice).toBe("kofi");
  });

  it("keeps the mouth closed when no one is speaking", () => {
    expect(findMouthOpenness()).toBe(0);
  });

  it("moves the mouth word by word for a voice whose sound it can't hear", () => {
    let clock = 0;
    const speaking = startSpeaking("alba", () => clock);
    speaking.chatter();
    const openings = Array.from({ length: 40 }, (_, index) => {
      clock = index * 0.025;
      return findMouthOpenness();
    });

    expect(Math.max(...openings)).toBeGreaterThan(0.6);
    expect(Math.min(...openings)).toBeLessThan(0.2);
  });
});

describe("showVoiceOnStage", () => {
  it("marks a voice as shown on a page's own stage until every page lets go of it", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSpeaking(listener);

    const takeOff = showVoiceOnStage("seren");
    const takeOffAgain = showVoiceOnStage("seren");
    takeOff();
    expect(isVoiceOnStage("seren")).toBe(true);
    takeOffAgain();

    expect(isVoiceOnStage("seren")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });
});
