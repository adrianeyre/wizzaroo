import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildRewards } from "../../curriculum/rewards.js";
import type { ReadAloudVoice } from "../voice-over/read-aloud-voices.js";
import {
  findSpeakingCharacter,
  isVoiceOnStage,
  startSpeaking,
  type SpeakingCharacter,
} from "../voice-over/speaking-voice.js";
import { Wardrobe } from "./wardrobe.js";

interface FakePiper {
  isOffered: boolean;
  said: { voice: string; words: string }[];
  finish?: () => void;
  speaking?: SpeakingCharacter;
}

const piper = vi.hoisted((): FakePiper => ({ isOffered: true, said: [] }));

vi.mock("../voice-over/piper-speech.js", async () => {
  const speakingVoice = await import("../voice-over/speaking-voice.js");
  return {
    isPiperOffered: () => piper.isOffered,
    checkDownloadedVoices: () => Promise.resolve(),
    findVoiceDownload: () => ({ state: "downloaded" }),
    downloadVoice: vi.fn(),
    speakWithPiper: (
      voice: ReadAloudVoice,
      words: string,
      onFinished: () => void,
    ) => {
      piper.said.push({ voice: voice.id, words });
      piper.speaking = speakingVoice.startSpeaking(voice.id, () => 0);
      piper.finish = () => {
        piper.speaking?.stop();
        onFinished();
      };
      return true;
    },
    stopPiper: () => {
      piper.speaking?.stop();
    },
    subscribeToVoiceDownloads: () => () => undefined,
  };
});

vi.mock("./character-preview.js", () => ({
  CharacterPreview: ({
    readMouthOpenness,
    stageAction,
  }: {
    readMouthOpenness?: () => number;
    stageAction?: ReactNode;
  }) => (
    <figure
      className="character-preview"
      data-talking={readMouthOpenness === undefined ? undefined : ""}
    >
      {stageAction}
    </figure>
  ),
}));

vi.mock("./item-picture.js", () => ({
  buildItemShot: () => ({}),
  buildPortraitShot: () => ({}),
  useItemPictureUrl: () => undefined,
  ItemPicture: () => null,
}));

const rewards: ChildRewards = {
  childId: "child-1",
  stars: 0,
  heldItemIds: [],
  loadout: {},
  room: {},
  outfits: [],
  masteryBonusSkillIds: [],
  lastPlayedDate: null,
  practiceDays: [],
  regionProgress: [],
  questProgress: [],
};

let root: Root;

const mountRoot = () => {
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("no root");
  }
  root = createRoot(container);
};

const showWardrobe = () => {
  act(() => {
    root.render(
      <Wardrobe
        characterName="Sparkle"
        rewards={rewards}
        siblings={[]}
        today="2026-11-24"
        onBuy={vi.fn()}
        onDress={vi.fn()}
        onSaveOutfit={vi.fn()}
        onWearOutfit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
  });
};

const findTalkButton = () =>
  document.querySelector<HTMLButtonElement>("button.wardrobe-talk");

const findDialog = () => document.querySelector<HTMLDialogElement>("dialog");

const findWords = () =>
  document.querySelector<HTMLTextAreaElement>("textarea[name=talkWords]");

const findSayButton = () =>
  document.querySelector<HTMLButtonElement>("button.wardrobe-talk-say");

const isTalking = () =>
  document.querySelector(".character-preview")?.hasAttribute("data-talking") ??
  false;

const typeWords = (words: string) => {
  const textarea = findWords();
  if (textarea === null) {
    throw new Error("no words box");
  }
  act(() => {
    // Through the element's own setter, as React watches for typing that way.
    Reflect.set(HTMLTextAreaElement.prototype, "value", words, textarea);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const openTalk = () => {
  act(() => {
    findTalkButton()?.click();
  });
};

const chooseVoice = (voiceId: string) => {
  act(() => {
    document
      .querySelector<HTMLInputElement>(
        `input[name=wardrobeTalkVoice][value=${voiceId}]`,
      )
      ?.click();
  });
};

const pressSay = () => {
  act(() => {
    findSayButton()?.click();
  });
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  piper.isOffered = true;
  piper.said = [];
  piper.finish = undefined;
  piper.speaking = undefined;
  document.body.innerHTML = "<div id=root></div>";
  mountRoot();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  findSpeakingCharacter()?.stop();
  vi.unstubAllGlobals();
});

describe("Talk in the Wardrobe", () => {
  it("shows a Talk speech bubble on the Character's stage", () => {
    showWardrobe();

    expect(findTalkButton()?.textContent).toBe("Talk");
    expect(findTalkButton()?.closest(".character-preview")?.className).toBe(
      "character-preview",
    );
  });

  it("leaves Talk out on a device with no voice to talk in", () => {
    piper.isOffered = false;
    showWardrobe();

    expect(findTalkButton()).toBeNull();
  });

  it("opens a box to type words in, with every voice's character to choose from", () => {
    showWardrobe();
    openTalk();

    expect(findDialog()?.open).toBe(true);
    expect(findDialog()?.textContent).toContain("Make Sparkle talk");
    expect(document.activeElement).toBe(findWords());
    expect(
      document.querySelectorAll("input[name=wardrobeTalkVoice]").length,
    ).toBe(16);
    expect(
      document.querySelector<HTMLInputElement>(
        "input[name=wardrobeTalkVoice]:checked",
      )?.value,
    ).toBe("adrian");
    expect(findSayButton()?.disabled).toBe(true);
  });

  it("closes the box and says the words in the chosen voice, the Character's mouth moving until it finishes", () => {
    showWardrobe();
    openTalk();
    chooseVoice("kofi");
    typeWords("I love my new hat!");
    pressSay();

    expect(findDialog()?.open).toBe(false);
    expect(piper.said).toStrictEqual([
      { voice: "kofi", words: "I love my new hat!" },
    ]);
    expect(isTalking()).toBe(true);
    expect(findTalkButton()?.hasAttribute("data-talking")).toBe(true);
    // The Character talks on its own stage, so the voice's face doesn't pop up too.
    expect(isVoiceOnStage("kofi")).toBe(true);

    act(() => {
      piper.finish?.();
    });

    expect(isTalking()).toBe(false);
    expect(findTalkButton()?.hasAttribute("data-talking")).toBe(false);
    expect(isVoiceOnStage("kofi")).toBe(false);
  });

  it("keeps the Child's chosen voice for next time", () => {
    showWardrobe();
    openTalk();
    chooseVoice("kofi");
    act(() => {
      root.unmount();
    });
    mountRoot();
    showWardrobe();
    openTalk();

    expect(
      document.querySelector<HTMLInputElement>(
        "input[name=wardrobeTalkVoice]:checked",
      )?.value,
    ).toBe("kofi");
  });

  it("fills the box with an idea, and says it on Enter", () => {
    showWardrobe();
    openTalk();
    act(() => {
      [...document.querySelectorAll<HTMLButtonElement>("dialog button")]
        .find(({ textContent }) => textContent === "Do you like my outfit?")
        ?.click();
    });

    expect(findWords()?.value).toBe("Do you like my outfit?");

    act(() => {
      findWords()?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(findDialog()?.open).toBe(false);
    expect(piper.said.map(({ words }) => words)).toStrictEqual([
      "Do you like my outfit?",
    ]);
  });

  it("stops talking when the Wardrobe closes", () => {
    showWardrobe();
    openTalk();
    typeWords("Goodbye");
    pressSay();
    act(() => {
      root.unmount();
    });
    mountRoot();

    expect(findSpeakingCharacter()).toBeUndefined();
    expect(isVoiceOnStage("adrian")).toBe(false);
  });

  it("lets another voice cut it off, and gives the stage back", () => {
    showWardrobe();
    openTalk();
    typeWords("Hello");
    pressSay();
    act(() => {
      startSpeaking("cori-med", () => 0);
    });

    expect(isTalking()).toBe(false);
    expect(isVoiceOnStage("adrian")).toBe(false);
  });
});
