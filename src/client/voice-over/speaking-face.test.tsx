import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeakingFace } from "./speaking-face.js";
import {
  findSpeakingCharacter,
  showVoiceOnStage,
  startSpeaking,
  type SpeakingCharacter,
} from "./speaking-voice.js";

vi.mock("../character/character-preview.js", () => ({
  CharacterHead: ({
    readMouthOpenness,
  }: {
    readMouthOpenness?: () => number;
  }) => (
    <span
      className="character-portrait"
      data-talking={readMouthOpenness === undefined ? undefined : ""}
    />
  ),
}));

let root: Root;

const findFace = () => document.querySelector<HTMLElement>(".speaking-face");

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML = "<div id=root></div>";
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("no root");
  }
  root = createRoot(container);
  act(() => {
    root.render(<SpeakingFace />);
  });
});

afterEach(() => {
  act(() => {
    findSpeakingCharacter()?.stop();
    root.unmount();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SpeakingFace", () => {
  it("shows nothing until a voice speaks", () => {
    expect(findFace()).toBeNull();
  });

  it("shows the speaking voice's face, talking, and hides it a moment after they stop", () => {
    let speaking: SpeakingCharacter | undefined;
    act(() => {
      speaking = startSpeaking("kofi", () => 0);
    });

    expect(findFace()?.dataset.voice).toBe("kofi");
    expect(findFace()?.hasAttribute("data-shown")).toBe(true);
    expect(findFace()?.querySelector("[data-talking]")).not.toBeNull();

    act(() => {
      speaking?.stop();
    });
    expect(findFace()?.hasAttribute("data-shown")).toBe(true);
    expect(findFace()?.querySelector("[data-talking]")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(findFace()?.hasAttribute("data-shown")).toBe(false);
  });

  it("changes face when another voice speaks, as when a Game's recording follows Read it to me", () => {
    act(() => {
      startSpeaking("adrian", () => 0);
    });
    act(() => {
      startSpeaking("cori-med", () => 0);
    });

    expect(findFace()?.dataset.voice).toBe("cori-med");
  });

  it("leaves a voice to the page's own stage when it shows that voice there", () => {
    const takeOff = showVoiceOnStage("seren");
    act(() => {
      startSpeaking("seren", () => 0);
    });

    expect(findFace()).toBeNull();
    act(() => {
      takeOff();
    });
  });
});
