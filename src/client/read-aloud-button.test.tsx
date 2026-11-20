import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModalDialog } from "./modal-dialog.js";
import { MovablePopup } from "./movable-popup.js";
import { ReadAloudButton, ReadAloudMessage } from "./read-aloud-button.js";
import {
  downloadVoice,
  speakWithPiper,
  type VoiceDownload,
} from "./voice-over/piper-speech.js";
import {
  findReadAloudVoice,
  loadReadAloudVoiceName,
} from "./voice-over/read-aloud-voices.js";

const piper = vi.hoisted(() => {
  const shown: {
    isOffered: boolean;
    download: VoiceDownload;
    listeners: Set<() => void>;
  } = {
    isOffered: false,
    download: { state: "not-downloaded" },
    listeners: new Set(),
  };
  return shown;
});

const setVoiceDownload = (download: VoiceDownload) => {
  piper.download = download;
  for (const listener of [...piper.listeners]) {
    listener();
  }
};

vi.mock("./voice-over/piper-speech.js", () => ({
  isPiperOffered: () => piper.isOffered,
  checkDownloadedVoices: () => Promise.resolve(),
  findVoiceDownload: () => piper.download,
  downloadVoice: vi.fn(() => {
    if (piper.download.state === "not-downloaded") {
      setVoiceDownload({ state: "downloading", share: 0 });
    }
  }),
  speakWithPiper: vi.fn(() => true),
  stopPiper: vi.fn(),
  subscribeToVoiceDownloads: (listener: () => void) => {
    piper.listeners.add(listener);
    return () => {
      piper.listeners.delete(listener);
    };
  },
}));

let root: Root;
let spoken: string[];

const offerSpeech = () => {
  vi.stubGlobal("speechSynthesis", {
    speak: ({ text }: { text: string }) => spoken.push(text),
    cancel: () => undefined,
    getVoices: () => [],
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(readonly text: string) {}
    },
  );
};

const show = (element: React.ReactNode) => {
  act(() => {
    root.render(element);
  });
};

const pressReadAloud = (index = 0) => {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].filter(
    (button) =>
      button.textContent === "Read it to me" ||
      button.getAttribute("aria-label") === "Read it to me",
  );
  act(() => {
    buttons[index].click();
  });
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  spoken = [];
  document.body.innerHTML = "<div id=root></div>";
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("no root");
  }
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  vi.unstubAllGlobals();
});

describe("ReadAloudButton", () => {
  it("reads its question in words", () => {
    offerSpeech();
    show(<ReadAloudButton text="9 + ? = 20" />);
    pressReadAloud();
    expect(spoken).toEqual(["9 plus what equals 20"]);
  });

  it("reads the words of its section, but not its buttons, fields or hidden parts", () => {
    offerSpeech();
    show(
      <section>
        <h2>Your rucksack</h2>
        <p>
          You found a <strong>golden key</strong>
        </p>
        <span aria-hidden="true">🔑</span>
        <ul>
          <li>A shell</li>
        </ul>
        <label>
          Name
          <input defaultValue="secret" />
        </label>
        <button type="button">Close</button>
        <ReadAloudButton readsSection />
      </section>,
    );
    pressReadAloud();
    expect(spoken).toEqual([
      "Your rucksack. You found a golden key. A shell. Name",
    ]);
  });

  it("reads only the message beside it", () => {
    offerSpeech();
    show(
      <section>
        <h2>Crossword</h2>
        <ReadAloudMessage>
          <p>3 Across is right! 4 to go.</p>
        </ReadAloudMessage>
      </section>,
    );
    pressReadAloud();
    expect(spoken).toEqual(["3 Across is right! 4 to go."]);
  });

  it("isn't shown on a device that can't speak, unless it has a recording to play", () => {
    const fallback = vi.fn();
    show(
      <>
        <ReadAloudButton text="How many fish?" />
        <ReadAloudButton
          text="How many fish?"
          isLabelShown={false}
          fallback={fallback}
        />
      </>,
    );
    expect(document.querySelectorAll("button")).toHaveLength(1);
    pressReadAloud();
    expect(fallback).toHaveBeenCalledOnce();
  });

  it("is on every popup and dialog, reading what they say", () => {
    offerSpeech();
    show(
      <>
        <MovablePopup positionKey="test-popup" aria-label="Hello">
          <h2>Pip the fisher</h2>
          <p>Have you seen my net?</p>
        </MovablePopup>
        <ModalDialog
          isOpen
          onClose={() => undefined}
          title="Family Chest"
          closeLabel="Close the Family Chest"
        >
          <p>It holds 12 coins.</p>
        </ModalDialog>
      </>,
    );
    pressReadAloud(0);
    // The popup's button now says Stop reading, so the dialog's is the first.
    pressReadAloud(0);
    expect(spoken).toEqual([
      "Pip the fisher. Have you seen my net?",
      "Family Chest. It holds 12 coins.",
    ]);
  });

  it("becomes Stop reading while it reads, stops when pressed again, and comes back when the words end", () => {
    const utterances: { text: string; onend?: () => void }[] = [];
    let cancelCount = 0;
    vi.stubGlobal("speechSynthesis", {
      speak: (utterance: { text: string; onend?: () => void }) =>
        utterances.push(utterance),
      cancel: () => {
        cancelCount += 1;
      },
      getVoices: () => [],
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        onend?: () => void;
        constructor(readonly text: string) {}
      },
    );
    show(
      <>
        <ReadAloudButton text="First" />
        <ReadAloudButton text="Second" />
      </>,
    );
    const [first, second] = document.querySelectorAll("button");

    act(() => {
      first.click();
    });
    expect(first.textContent).toBe("Stop reading");
    expect(first.hasAttribute("data-speaking")).toBe(true);
    expect(second.textContent).toBe("Read it to me");

    act(() => {
      second.click();
    });
    expect(first.textContent).toBe("Read it to me");
    expect(second.textContent).toBe("Stop reading");

    const cancelsBeforeStop = cancelCount;
    act(() => {
      second.click();
    });
    expect(cancelCount).toBe(cancelsBeforeStop + 1);
    expect(second.textContent).toBe("Read it to me");
    expect(utterances.map(({ text }) => text)).toEqual(["First", "Second"]);

    act(() => {
      first.click();
    });
    act(() => {
      utterances.at(-1)?.onend?.();
    });
    expect(first.textContent).toBe("Read it to me");
    expect(first.hasAttribute("data-speaking")).toBe(false);
  });
});

describe("ReadAloudButton while its voice downloads", () => {
  const voice = findReadAloudVoice(loadReadAloudVoiceName());
  const megabytes = Math.round(voice.model.model.bytes / (1024 * 1024));
  const findProgress = () => document.querySelector(".read-aloud-busy .busy");
  const findBar = () => findProgress()?.querySelector("[role=progressbar]");

  beforeEach(() => {
    piper.isOffered = true;
    piper.download = { state: "not-downloaded" };
  });

  afterEach(() => {
    piper.isOffered = false;
    vi.clearAllMocks();
  });

  it("says it is downloading the voice, filling its bar as the download goes, then reads once it has it", () => {
    show(<ReadAloudButton text="Hello there" />);
    pressReadAloud();

    expect(downloadVoice).toHaveBeenCalledOnce();
    expect(findProgress()?.querySelector(".busy-label")?.textContent).toBe(
      `Downloading the ${voice.name} voice (${String(megabytes)} MB) so it can read to you…`,
    );
    expect(findBar()?.getAttribute("aria-valuenow")).toBe("0");

    act(() => {
      setVoiceDownload({ state: "downloading", share: 0.5 });
    });
    expect(findBar()?.getAttribute("aria-valuenow")).toBe("50");
    expect(findProgress()?.querySelector(".busy-detail")?.textContent).toBe(
      `${String(Math.round(voice.model.model.bytes / 2 / (1024 * 1024)))} MB of ${String(megabytes)} MB downloaded`,
    );
    const button = document.querySelector("button");
    // Nothing reads meanwhile, so the button stops the wait.
    expect(button?.textContent).toBe("Stop reading");
    expect(button?.getAttribute("aria-busy")).toBe("true");

    act(() => {
      setVoiceDownload({ state: "downloaded" });
    });
    expect(findProgress()).toBeNull();
    expect(button?.hasAttribute("aria-busy")).toBe(false);
    expect(speakWithPiper).toHaveBeenCalledOnce();
  });

  it("waits for the chosen voice even on a device with a speech voice of its own, which reads only if the download fails", () => {
    const utterances: { text: string; onend?: () => void }[] = [];
    vi.stubGlobal("speechSynthesis", {
      speak: (utterance: { text: string; onend?: () => void }) =>
        utterances.push(utterance),
      cancel: () => undefined,
      getVoices: () => [],
    });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        onend?: () => void;
        constructor(readonly text: string) {}
      },
    );
    show(<ReadAloudButton text="Hello there" />);
    pressReadAloud();
    const button = document.querySelector("button");

    expect(utterances).toEqual([]);
    expect(button?.textContent).toBe("Stop reading");
    expect(button?.disabled).toBe(false);
    expect(findProgress()).not.toBeNull();

    act(() => {
      setVoiceDownload({ state: "failed" });
    });
    expect(utterances.map(({ text }) => text)).toEqual(["Hello there"]);
    expect(speakWithPiper).not.toHaveBeenCalled();
    expect(findProgress()).toBeNull();
  });

  it("shows nothing extra once the device has the voice", () => {
    piper.download = { state: "downloaded" };
    show(<ReadAloudButton text="Hello there" />);
    pressReadAloud();

    expect(speakWithPiper).toHaveBeenCalledOnce();
    expect(document.querySelector(".busy")).toBeNull();
  });
});
