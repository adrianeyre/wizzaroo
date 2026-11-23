import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyAppearance,
  defaultAppearance,
  loadAppearance,
  storeAppearance,
} from "./appearance.js";
import { SettingsPage } from "./settings-page.js";
import { SiteHeader, type SiteMenuEntry } from "./site-header.js";
import type { VoiceDownload } from "../voice-over/piper-speech.js";
import {
  defaultReadAloudVoiceName,
  findReadAloudVoice,
} from "../voice-over/read-aloud-voices.js";

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

vi.mock("../voice-over/piper-speech.js", () => ({
  isPiperOffered: () => piper.isOffered,
  checkDownloadedVoices: () => Promise.resolve(),
  findVoiceDownload: () => piper.download,
  downloadVoice: vi.fn(() => {
    setVoiceDownload({ state: "downloading", share: 0 });
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

const findButtonNamed = (name: string): HTMLButtonElement => {
  const button = [...document.querySelectorAll("button")].find(
    (candidate) =>
      (candidate.getAttribute("aria-label") ?? candidate.textContent) === name,
  );
  if (button === undefined) {
    throw new Error(`no button named ${name}`);
  }
  return button;
};

const findRadio = (name: string, value: string): HTMLInputElement => {
  const radio = document.querySelector(
    `input[type="radio"][name="${name}"][value="${value}"]`,
  );
  if (!(radio instanceof HTMLInputElement)) {
    throw new Error(`no ${name} radio for ${value}`);
  }
  return radio;
};

const listMenuEntryNames = () =>
  [...document.querySelectorAll(".site-menu-list li")].map(
    (entry) => entry.textContent,
  );

const pressKey = (target: Element, key: string) => {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

describe("SiteHeader and SettingsPage", () => {
  let root: Root;

  const renderPage = (page: React.ReactNode) => {
    act(() => {
      root.render(page);
    });
  };

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.clear();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    delete document.documentElement.dataset.colourMode;
    delete document.documentElement.dataset.theme;
    localStorage.clear();
    piper.isOffered = false;
    piper.download = { state: "not-downloaded" };
  });

  describe("appearance", () => {
    it("starts in Dark mode in the Sky theme until a choice is kept", () => {
      expect(loadAppearance()).toEqual({
        colourMode: "dark",
        themeName: "sky",
      });
    });

    it("keeps the chosen mode and theme on this device", () => {
      storeAppearance({ colourMode: "dark", themeName: "lagoon" });

      expect(loadAppearance()).toEqual({
        colourMode: "dark",
        themeName: "lagoon",
      });
    });

    it("falls back to the default for anything it doesn't recognise", () => {
      localStorage.setItem(
        "wizzaroo.appearance",
        JSON.stringify({ colourMode: "sepia", themeName: "berry" }),
      );

      expect(loadAppearance()).toEqual({
        colourMode: "dark",
        themeName: "berry",
      });
    });

    it("marks the page with the mode and theme for the stylesheet to follow", () => {
      applyAppearance({ colourMode: "light", themeName: "grape" });

      expect(document.documentElement.dataset.colourMode).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("grape");
    });
  });

  describe("the title bar", () => {
    const signOut = vi.fn<() => void>();
    const menuEntries: SiteMenuEntry[] = [
      { label: "Children", icon: null, href: "#children", isCurrent: true },
      { label: "Your account", icon: null, href: "#account" },
      { label: "Sign out", icon: null, onChoose: signOut },
    ];

    beforeEach(() => {
      signOut.mockReset();
      renderPage(
        <SiteHeader
          brandHref="#children"
          subtitle="The Eyres"
          menuLabel="Parent menu"
          menuEntries={menuEntries}
          isSettingsOpen={false}
        />,
      );
    });

    it("is the page's banner, with the brand, a labelled menu and a Settings cog at the far end", () => {
      const header = document.querySelector("header.site-header");
      expect(header?.textContent).toContain("WizzarooThe Eyres");
      expect(header?.querySelector("nav")?.getAttribute("aria-label")).toBe(
        "Parent menu",
      );
      const settingsLink = header?.lastElementChild;
      expect(settingsLink?.getAttribute("href")).toBe("#settings");
      expect(settingsLink?.getAttribute("aria-label")).toBe("Settings");
    });

    it("keeps the menu closed until it's opened, then lists every entry and marks the current one", () => {
      const toggle = findButtonNamed("Menu");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(listMenuEntryNames()).toEqual([]);

      act(() => {
        toggle.click();
      });

      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(toggle.getAttribute("aria-controls")).toBe(
        document.querySelector(".site-menu-list")?.id,
      );
      expect(listMenuEntryNames()).toEqual([
        "Children",
        "Your account",
        "Sign out",
      ]);
      expect(
        document.querySelector('.site-menu-list a[aria-current="page"]')
          ?.textContent,
      ).toBe("Children");
    });

    it("closes on Escape and gives focus back to the Menu button", () => {
      const toggle = findButtonNamed("Menu");
      act(() => {
        toggle.click();
      });

      pressKey(toggle, "Escape");

      expect(listMenuEntryNames()).toEqual([]);
      expect(document.activeElement).toBe(toggle);
    });

    it("opens from the keyboard with the arrow keys, which then move through the entries", () => {
      const toggle = findButtonNamed("Menu");

      pressKey(toggle, "ArrowDown");
      expect(document.activeElement?.textContent).toBe("Children");

      pressKey(toggle, "ArrowDown");
      expect(document.activeElement?.textContent).toBe("Your account");

      pressKey(toggle, "ArrowUp");
      pressKey(toggle, "ArrowUp");
      expect(document.activeElement?.textContent).toBe("Sign out");
    });

    it("closes when the Parent taps outside it", () => {
      act(() => {
        findButtonNamed("Menu").click();
      });

      act(() => {
        document.body.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true }),
        );
      });

      expect(listMenuEntryNames()).toEqual([]);
    });

    it("closes, then does what an action entry says, when one is chosen", () => {
      act(() => {
        findButtonNamed("Menu").click();
      });

      act(() => {
        findButtonNamed("Sign out").click();
      });

      expect(signOut).toHaveBeenCalledOnce();
      expect(listMenuEntryNames()).toEqual([]);
    });
  });

  describe("the Settings page", () => {
    beforeEach(() => {
      renderPage(<SettingsPage />);
    });

    it("offers System, Light and Dark, with Dark chosen by default", () => {
      expect(document.querySelector("h1")?.textContent).toBe("Settings");
      expect(findRadio("colourMode", "system").checked).toBe(false);
      expect(findRadio("colourMode", "light").checked).toBe(false);
      expect(findRadio("colourMode", "dark").checked).toBe(true);
      expect(
        findRadio("colourMode", "dark").closest("label")?.textContent,
      ).toContain("Default");
      expect(
        findRadio("colourMode", "system").closest("label")?.textContent,
      ).not.toContain("Default");
    });

    it("offers sixteen voices in one section, each with their own fantasy character, with Adrian chosen by default", () => {
      const voiceRadios = [
        ...document.querySelectorAll<HTMLInputElement>(
          'input[type="radio"][name="readAloudVoice"]',
        ),
      ];
      expect(voiceRadios.map((radio) => radio.value)).toEqual([
        "adrian",
        "cori-med",
        "alba",
        "kofi",
        "seren",
        "ravi",
        "niamh",
        "hamish",
        "arlo",
        "prudence",
        "poppy",
        "spike",
        "obadiah",
        "jenny",
        "kristin",
        "john",
      ]);
      expect(document.querySelectorAll("fieldset.voice-choices")).toHaveLength(
        1,
      );
      expect(document.querySelectorAll("details")).toHaveLength(0);
      expect(document.querySelector(".voice-choices legend")?.textContent).toBe(
        "Voices",
      );
      expect(document.querySelectorAll(".voice-card-portrait")).toHaveLength(
        16,
      );
      expect(
        findRadio("readAloudVoice", "adrian").closest("label")?.textContent,
      ).toContain("AdrianDefaultthe Star WizardUK English (Northern England)");
      expect(findRadio("readAloudVoice", "adrian").checked).toBe(true);
      expect(document.querySelector("#voice-studio-heading")?.textContent).toBe(
        "Adrian",
      );
      expect(document.querySelector(".voice-studio-title")?.textContent).toBe(
        "Adrian the Star Wizard",
      );
    });

    it("waits for a chosen voice to download before saying hello, so it is never heard in the device's own voice", () => {
      const spoken: string[] = [];
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
      piper.isOffered = true;
      renderPage(<SettingsPage />);

      act(() => {
        findRadio("readAloudVoice", "john").click();
      });
      expect(spoken).toEqual([]);
      act(() => {
        setVoiceDownload({ state: "failed" });
      });
      expect(spoken).toEqual([]);
      vi.unstubAllGlobals();
      Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    });

    it("offers six themes, each with a preview drawn in its own colours", () => {
      const themeRadios = document.querySelectorAll(
        'input[type="radio"][name="themeName"]',
      );
      expect(
        [...themeRadios].map((radio) => radio.getAttribute("value")),
      ).toEqual(["sky", "grape", "forest", "sunset", "berry", "lagoon"]);
      expect(
        [...document.querySelectorAll(".theme-preview")].map((preview) =>
          preview.getAttribute("data-theme"),
        ),
      ).toEqual(["sky", "grape", "forest", "sunset", "berry", "lagoon"]);
      expect(findRadio("themeName", defaultAppearance.themeName).checked).toBe(
        true,
      );
    });

    it("shows the chosen voice, says hello in it and keeps it for next time", () => {
      const spoken: string[] = [];
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
      renderPage(<SettingsPage />);

      act(() => {
        findRadio("readAloudVoice", "seren").click();
      });

      expect(spoken).toEqual([
        "Hello! I'm Seren. I'll read your questions to you.",
      ]);
      expect(localStorage.getItem("wizzaroo.read-aloud-voice")).toBe("seren");
      expect(document.querySelector("#voice-studio-heading")?.textContent).toBe(
        "Seren",
      );
      expect(
        document.querySelector(".voice-studio-speaker figcaption")?.textContent,
      ).toBe("Seren");
      expect(
        document
          .querySelector(".voice-studio-speaker [role=img]")
          ?.getAttribute("aria-label"),
      ).toContain("Seren the Archer");
      vi.unstubAllGlobals();
      Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
    });

    it("shows the chosen voice downloading with a filling bar, keeps Hear pressed off until it has it, and starts again from Try again", () => {
      const voice = findReadAloudVoice(defaultReadAloudVoiceName);
      const megabytes = Math.round(voice.model.model.bytes / (1024 * 1024));
      const findProgress = () =>
        document.querySelector(".voice-studio-card .busy");
      const findBar = () => findProgress()?.querySelector("[role=progressbar]");
      const findCard = () => document.querySelector(".voice-studio-card");
      piper.isOffered = true;
      piper.download = { state: "downloading", share: 0.4 };
      renderPage(<SettingsPage />);

      expect(findProgress()?.querySelector(".busy-label")?.textContent).toBe(
        `Downloading the ${voice.name} voice (${String(megabytes)} MB) so it can read to you…`,
      );
      expect(findBar()?.getAttribute("aria-valuenow")).toBe("40");
      expect(findProgress()?.querySelector(".busy-detail")?.textContent).toBe(
        `${String(Math.round((voice.model.model.bytes * 0.4) / (1024 * 1024)))} MB of ${String(megabytes)} MB downloaded`,
      );
      expect(findButtonNamed(`Hear ${voice.name}`).disabled).toBe(true);
      expect(findCard()?.getAttribute("aria-busy")).toBe("true");

      act(() => {
        setVoiceDownload({ state: "failed" });
      });
      expect(findProgress()).toBeNull();
      expect(findButtonNamed(`Hear ${voice.name}`).disabled).toBe(false);
      act(() => {
        findButtonNamed("Try again").click();
      });
      expect(findBar()?.getAttribute("aria-valuenow")).toBe("0");
      expect(findButtonNamed(`Hear ${voice.name}`).disabled).toBe(true);

      act(() => {
        setVoiceDownload({ state: "downloaded" });
      });
      expect(findProgress()).toBeNull();
      expect(findCard()?.hasAttribute("aria-busy")).toBe(false);
      expect(findButtonNamed(`Hear ${voice.name}`).disabled).toBe(false);
    });

    it("switches to light straight away, and keeps it for next time", () => {
      act(() => {
        findRadio("colourMode", "light").click();
      });

      expect(document.documentElement.dataset.colourMode).toBe("light");
      expect(findRadio("colourMode", "light").checked).toBe(true);
      expect(loadAppearance().colourMode).toBe("light");
    });

    it("switches theme straight away without changing the mode, and keeps it for next time", () => {
      act(() => {
        findRadio("colourMode", "light").click();
      });
      act(() => {
        findRadio("themeName", "sunset").click();
      });

      expect(document.documentElement.dataset.theme).toBe("sunset");
      expect(loadAppearance()).toEqual({
        colourMode: "light",
        themeName: "sunset",
      });
    });
  });
});
