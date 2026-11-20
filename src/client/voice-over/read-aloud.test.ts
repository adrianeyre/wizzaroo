import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isReadAloudOffered,
  pickReadAloudVoice,
  readAloud,
  stopReadingAloud,
} from "./read-aloud.js";

class FakeUtterance {
  lang = "";
  pitch = 1;
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(readonly text: string) {}
}

const buildVoice = (
  lang: string,
  localService = true,
  name = lang,
): SpeechSynthesisVoice => ({
  lang,
  localService,
  name,
  default: false,
  voiceURI: name,
});

const offerSpeech = (voices: SpeechSynthesisVoice[] = []) => {
  const speech = {
    speak: vi.fn<(utterance: FakeUtterance) => void>(),
    cancel: vi.fn(),
    getVoices: () => voices,
  };
  vi.stubGlobal("window", { speechSynthesis: speech });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return speech;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readAloud", () => {
  it("says the question in words, in a British English voice", () => {
    const british = buildVoice("en-GB");
    const speech = offerSpeech([buildVoice("fr-FR"), british]);

    expect(readAloud("9 + ? = 20")).toBe(true);

    expect(speech.cancel).toHaveBeenCalled();
    const [utterance] = speech.speak.mock.calls[0];
    expect(utterance.text).toBe("9 plus what equals 20");
    expect(utterance.lang).toBe("en-GB");
    expect(utterance.voice).toBe(british);
  });

  it("can't read without the device's speech, or with nothing to say", () => {
    expect(isReadAloudOffered()).toBe(false);
    expect(readAloud("How many fish?")).toBe(false);

    const speech = offerSpeech();
    expect(isReadAloudOffered()).toBe(true);
    expect(readAloud(undefined)).toBe(false);
    expect(readAloud("  ")).toBe(false);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("stops reading when asked", () => {
    const speech = offerSpeech();
    stopReadingAloud();
    expect(speech.cancel).toHaveBeenCalledOnce();
  });
});

describe("pickReadAloudVoice", () => {
  it("prefers a British voice on the device, so it reads with no network", () => {
    const online = buildVoice("en-GB", false);
    const onDevice = buildVoice("en_GB");
    const american = buildVoice("en-US");
    expect(pickReadAloudVoice([american, online, onDevice])).toBe(onDevice);
    expect(pickReadAloudVoice([american, online])).toBe(online);
    expect(pickReadAloudVoice([buildVoice("de-DE"), american])).toBe(american);
    expect(pickReadAloudVoice([buildVoice("de-DE")])).toBeUndefined();
  });
});
