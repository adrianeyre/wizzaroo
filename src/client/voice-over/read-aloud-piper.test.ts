import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceDownload } from "./piper-speech.js";

const piper = vi.hoisted(() => {
  return {
    listeners: new Set<() => void>(),
    speakWithPiper: vi.fn(
      (_voice: { id: string }, _words: string, onFinished: () => void) => {
        piper.finish = onFinished;
        return true;
      },
    ),
    downloadVoice: vi.fn(),
    stopPiper: vi.fn(),
    finish: (): void => undefined,
  };
});

const shown: { download: VoiceDownload } = {
  download: { state: "not-downloaded" },
};

vi.mock("./piper-speech.js", () => ({
  isPiperOffered: () => true,
  checkDownloadedVoices: () => Promise.resolve(),
  findVoiceDownload: () => shown.download,
  downloadVoice: piper.downloadVoice,
  speakWithPiper: piper.speakWithPiper,
  stopPiper: piper.stopPiper,
  subscribeToVoiceDownloads: (listener: () => void) => {
    piper.listeners.add(listener);
    return () => {
      piper.listeners.delete(listener);
    };
  },
}));

const { findSpeakingReader, readAloud, stopReadingAloud } =
  await import("./read-aloud.js");

class FakeUtterance {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  constructor(readonly text: string) {}
}

const offerSpeech = () => {
  const speech = {
    speak: vi.fn<(utterance: FakeUtterance) => void>(),
    cancel: vi.fn(),
    getVoices: () => [],
  };
  vi.stubGlobal("window", { speechSynthesis: speech });
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  return speech;
};

const setDownload = (download: VoiceDownload) => {
  shown.download = download;
  for (const listener of [...piper.listeners]) {
    listener();
  }
};

beforeEach(() => {
  shown.download = { state: "not-downloaded" };
  piper.listeners.clear();
});

afterEach(() => {
  stopReadingAloud();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("reading aloud in a Piper voice", () => {
  it("reads in the chosen voice once the device has it, and says when it has finished", () => {
    shown.download = { state: "downloaded" };

    expect(readAloud("How many fish?", "john", "question")).toBe(true);

    expect(piper.speakWithPiper).toHaveBeenCalledOnce();
    const [voice, words] = piper.speakWithPiper.mock.calls[0];
    expect(voice.id).toBe("john");
    expect(words).toBe("How many fish?");
    expect(findSpeakingReader()).toBe("question");
    piper.finish();
    expect(findSpeakingReader()).toBeUndefined();
  });

  it("downloads a voice the device hasn't got and waits to read in it, never in the device's own voice meanwhile", () => {
    const speech = offerSpeech();

    expect(readAloud("How many fish?", "seren", "question")).toBe(true);

    expect(piper.downloadVoice).toHaveBeenCalledOnce();
    expect(piper.downloadVoice.mock.calls[0][0]).toMatchObject({
      id: "vctk",
    });
    expect(findSpeakingReader()).toBe("question");
    setDownload({ state: "downloading", share: 0.5 });
    expect(speech.speak).not.toHaveBeenCalled();
    setDownload({ state: "downloaded" });

    expect(speech.speak).not.toHaveBeenCalled();
    expect(piper.speakWithPiper).toHaveBeenCalledOnce();
    const [voice] = piper.speakWithPiper.mock.calls[0];
    expect(voice).toMatchObject({ id: "seren", speakerId: 88 });
  });

  it("reads in the device's own voice only when the chosen voice can't be downloaded", () => {
    const speech = offerSpeech();

    readAloud("How many fish?", "john", "question");
    setDownload({ state: "failed" });

    expect(speech.speak).toHaveBeenCalledOnce();
    expect(speech.speak.mock.calls[0][0].text).toBe("How many fish?");
    expect(piper.speakWithPiper).not.toHaveBeenCalled();
  });

  it("never says a voice's own sample in another voice, even when its download fails", () => {
    const speech = offerSpeech();

    readAloud("Hello! I'm John.", "john", "sample", {
      isDeviceVoiceAllowed: false,
    });
    setDownload({ state: "failed" });

    expect(speech.speak).not.toHaveBeenCalled();
    expect(findSpeakingReader()).toBeUndefined();
  });

  it("waits for the download on a device with no speech voice of its own, then reads", () => {
    expect(readAloud("How many fish?", "kristin", "question")).toBe(true);
    expect(findSpeakingReader()).toBe("question");

    setDownload({ state: "downloading", share: 0.5 });
    expect(piper.speakWithPiper).not.toHaveBeenCalled();
    setDownload({ state: "downloaded" });

    expect(piper.speakWithPiper).toHaveBeenCalledOnce();
    expect(piper.speakWithPiper.mock.calls[0][0].id).toBe("kristin");
  });

  it("gives up waiting when the download fails, or when the Child stops it", () => {
    readAloud("How many fish?", "kristin", "question");
    setDownload({ state: "failed" });
    expect(findSpeakingReader()).toBeUndefined();

    readAloud("How many fish?", "kristin", "question");
    stopReadingAloud();
    setDownload({ state: "downloaded" });
    expect(piper.speakWithPiper).not.toHaveBeenCalled();
    expect(piper.stopPiper).toHaveBeenCalled();
  });
});
