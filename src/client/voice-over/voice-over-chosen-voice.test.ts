import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceDownload } from "./piper-speech.js";
import voiceOverLines from "./voice-over-lines.json" with { type: "json" };

const piper = vi.hoisted(() => ({
  isOffered: true,
  speakWithPiper: vi.fn(
    (_voice: { id: string }, _words: string, onFinished: () => void) => {
      piper.finish = onFinished;
      return true;
    },
  ),
  downloadVoice: vi.fn(),
  stopPiper: vi.fn(),
  finish: (): void => undefined,
}));

const shown: { download: VoiceDownload } = {
  download: { state: "downloaded" },
};

vi.mock("./piper-speech.js", () => ({
  isPiperOffered: () => piper.isOffered,
  checkDownloadedVoices: () => Promise.resolve(),
  findVoiceDownload: () => shown.download,
  downloadVoice: piper.downloadVoice,
  speakWithPiper: piper.speakWithPiper,
  stopPiper: piper.stopPiper,
  subscribeToVoiceDownloads: () => () => undefined,
}));

class FakeAudio {
  static played: string[] = [];
  src = "";
  paused = true;
  ended = false;
  play(): Promise<void> {
    FakeAudio.played.push(this.src);
    this.paused = false;
    return Promise.resolve();
  }
  pause(): void {
    this.paused = true;
  }
  addEventListener(): void {
    // A recording that is never heard to end.
  }
  removeEventListener(): void {
    // Nothing to remove.
  }
}

vi.stubGlobal("Audio", FakeAudio);

const { playVoiceOver, waitForVoiceOverToEnd } =
  await import("./voice-over.js");
const { stopReadingAloud } = await import("./read-aloud.js");

const chooseVoice = (voiceName: string) => {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "wizzaroo.read-aloud-voice" ? voiceName : null,
    setItem: () => undefined,
  });
};

beforeEach(() => {
  piper.isOffered = true;
  shown.download = { state: "downloaded" };
  FakeAudio.played = [];
  chooseVoice("spike");
});

afterEach(() => {
  stopReadingAloud();
  vi.clearAllMocks();
  vi.stubGlobal("Audio", FakeAudio);
});

describe("a Game's lines", () => {
  it("open in the voice chosen on Settings, not the recording, once the device has it", async () => {
    await playVoiceOver("mission.choose");

    expect(piper.speakWithPiper).toHaveBeenCalledOnce();
    const [voice, words] = piper.speakWithPiper.mock.calls[0];
    expect(voice).toMatchObject({ id: "spike" });
    expect(words).toBe(voiceOverLines["mission.choose"]);
    expect(FakeAudio.played).toEqual([]);
  });

  it("are waited for until the chosen voice has finished saying them", async () => {
    await playVoiceOver("mission.finished");
    let hasEnded = false;
    const ending = waitForVoiceOverToEnd().then(() => {
      hasEnded = true;
    });

    await Promise.resolve();
    expect(hasEnded).toBe(false);
    piper.finish();
    await ending;
    expect(hasEnded).toBe(true);
  });

  it("play their recording while the chosen voice downloads, never sitting silent, and start that download", async () => {
    shown.download = { state: "not-downloaded" };

    await playVoiceOver("mission.choose");

    expect(piper.speakWithPiper).not.toHaveBeenCalled();
    expect(FakeAudio.played).toHaveLength(1);
    expect(piper.downloadVoice).toHaveBeenCalledOnce();
    expect(piper.downloadVoice.mock.calls[0][0]).toMatchObject({
      id: "semaine",
    });
  });

  it("don't try again and again to download a voice that failed, as when offline", async () => {
    shown.download = { state: "failed" };

    await playVoiceOver("mission.choose");

    expect(piper.downloadVoice).not.toHaveBeenCalled();
    expect(FakeAudio.played).toHaveLength(1);
  });

  it("play their recording on a device that can't run Piper", async () => {
    piper.isOffered = false;

    await playVoiceOver("mission.choose");

    expect(piper.speakWithPiper).not.toHaveBeenCalled();
    expect(FakeAudio.played).toHaveLength(1);
  });
});
