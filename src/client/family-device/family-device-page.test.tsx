import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  hashPicturePassword,
  type PicturePasswordPicture,
} from "../../server/children/picture-password.js";
import type { PlayEvent } from "../../server/family-devices/play-event-routes.js";
import type { PhonicsSound } from "../../curriculum/phonics-sounds.js";
import { buildChildLimits } from "../../curriculum/island-access.js";
import { catalogue } from "../../curriculum/catalogue.js";
import { subjectNames, subjects } from "../../curriculum/subjects.js";
import { getLocalDate } from "../../curriculum/mastery.js";
import { mathsSkillIds } from "../mission/maths-missions.js";
import { findIslandQuest } from "../../curriculum/island-quests.js";
import {
  buildStartingChildRewards,
  type ChildRewards,
} from "../../curriculum/rewards.js";
import { MissionPlay, movePanelLabel } from "../mission/mission-play.js";
import {
  buildClassmateRoomsPath,
  type ClassmateRoom,
} from "./classmate-rooms.js";
import { effectWave, tuneWave } from "../game-sound.js";
import type { MissionSceneProps } from "../world.js";
import type { WorldMapSceneProps } from "../world-map-islands.js";
import type { IslandExploreSceneProps } from "../islands/island-explore-hud.js";
import {
  findExploreAdventure,
  findIslandAdventure,
  type ExploreInteraction,
} from "../islands/island-adventures.js";
import {
  findPierWaitingSpot,
  voyagePhaseSeconds,
  type VoyagePhase,
} from "../islands/island-voyage.js";
import {
  findJourneyWaitingSpot,
  transports,
  type Transport,
} from "../islands/island-journey.js";
import { aircraftPhaseSeconds } from "../islands/island-flight.js";
import { playPhoneme, playVoiceOver } from "../voice-over/voice-over.js";
import {
  adultSignOutPath,
  FamilyDevicePage,
  playEventUploadRetryMs,
  type PlayingChild,
} from "./family-device-page.js";
import {
  largestPlayEventUpload,
  openPlayEventOutbox,
  playEventUploadPath,
} from "./play-event-outbox.js";
import {
  playableFamilyPath,
  type FamilyChild,
  type PlayableChild,
} from "./playable-family.js";

vi.mock("../voice-over/voice-over.js", () => ({
  isVoiceOverKey: (key: string) => key.startsWith("phonics-games."),
  playVoiceOver: vi.fn(() => Promise.resolve()),
  playPhoneme: vi.fn(() => Promise.resolve()),
  stopVoiceOver: vi.fn(),
  waitForVoiceOverToEnd: vi.fn(() => Promise.resolve()),
}));

// Lets a test hold the Picture Password check open, to see what shows while it runs.
const picturePasswordCheck = vi.hoisted(() => {
  const held: { until: Promise<void> | undefined } = { until: undefined };
  return held;
});

vi.mock("../../server/children/picture-password.js", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("../../server/children/picture-password.js")
    >();
  return {
    ...original,
    isPicturePasswordRight: async (
      ...args: Parameters<typeof original.isPicturePasswordRight>
    ) => {
      await picturePasswordCheck.until;
      return original.isPicturePasswordRight(...args);
    },
  };
});

const sparklePicturePassword: PicturePasswordPicture[] = ["cat", "moon", "cat"];
const thunderpawsPicturePassword: PicturePasswordPicture[] = [
  "rocket",
  "rocket",
  "tree",
];
const theGame = "The game is on";
const sparkleId = "0b0f7b1e-1111-4111-8111-111111111111";
const thunderpawsId = "0b0f7b1e-2222-4222-8222-222222222222";
const noLimits: PlayableChild["limits"] = buildChildLimits({});

const startedWaves: OscillatorType[] = [];

class FakeAudioParam {
  value = 0;
  setValueAtTime() {
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
}

class FakeAudioNode {
  connect() {
    return this;
  }
}

class FakeOscillator extends FakeAudioNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  start() {
    startedWaves.push(this.type);
  }
  stop() {
    return undefined;
  }
  addEventListener() {
    return undefined;
  }
}

class FakeAudioContext {
  currentTime = 0;
  destination = new FakeAudioNode();
  createGain() {
    return Object.assign(new FakeAudioNode(), { gain: new FakeAudioParam() });
  }
  createOscillator() {
    return new FakeOscillator();
  }
  resume() {
    return Promise.resolve();
  }
}

const withRewards = (
  child: PlayableChild,
  rewards: Partial<ChildRewards>,
): PlayableChild => ({ ...child, rewards: { ...child.rewards, ...rewards } });

type ServerAnswer = (path: string) => Promise<Response>;

const answerWithPlayableChildren =
  (
    playableChildren: PlayableChild[],
    familyChestActivityCount = 0,
  ): ServerAnswer =>
  (path) =>
    Promise.resolve(
      path === playEventUploadPath
        ? new Response(null, { status: 204 })
        : Response.json({ playableChildren, familyChestActivityCount }),
    );

const answerWithStatus =
  (status: number): ServerAnswer =>
  () =>
    Promise.resolve(Response.json({ statusCode: status }, { status }));

const networkOff: ServerAnswer = () =>
  Promise.reject(new TypeError("Failed to fetch"));

const unsyncedPlayStorageKey = "wizzaroo.family-device.unsynced-play";

const isPlayEvent = (value: unknown): value is PlayEvent =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "childId" in value &&
  typeof value.childId === "string" &&
  "type" in value &&
  typeof value.type === "string" &&
  "happenedAt" in value &&
  typeof value.happenedAt === "string" &&
  "payload" in value &&
  typeof value.payload === "object" &&
  value.payload !== null &&
  "sessionId" in value.payload &&
  typeof value.payload.sessionId === "string";

const readUploadedPlayEvents = (body: unknown): PlayEvent[] => {
  const batch: unknown =
    typeof body === "string" ? JSON.parse(body) : undefined;
  if (
    typeof batch !== "object" ||
    batch === null ||
    !("playEvents" in batch) ||
    !Array.isArray(batch.playEvents) ||
    !batch.playEvents.every(isPlayEvent)
  ) {
    throw new Error("the page uploaded something other than play events");
  }
  return batch.playEvents;
};

const startFakeServer = (answer: ServerAnswer) => {
  const requests: string[] = [];
  const uploads: PlayEvent[][] = [];
  vi.stubGlobal("fetch", (path: string, init: RequestInit = {}) => {
    requests.push(path);
    if (path === playEventUploadPath) {
      uploads.push(readUploadedPlayEvents(init.body));
    }
    return answer(path);
  });
  const findUploadedPlayEvents = (childId: string): PlayEvent[] => {
    const uploadedPlayEvents = uploads
      .flat()
      .filter((playEvent) => playEvent.childId === childId);
    return uploadedPlayEvents.filter(
      ({ id }, index) =>
        uploadedPlayEvents.findIndex((playEvent) => playEvent.id === id) ===
        index,
    );
  };
  return { requests, uploads, findUploadedPlayEvents };
};

const countChildrenRequests = (requests: string[]) =>
  requests.filter((path) => path === playableFamilyPath).length;

const setPageVisibility = (visibilityState: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibilityState,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

const getPageText = () => document.body.textContent;

const findButton = (label: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === label ||
      candidate.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`the page has no "${label}" button`);
  }
  return button;
};

// A menu item's accessible name comes from the element its aria-labelledby
// points at, with its hint as the description.
const findMenuItem = (label: string): HTMLButtonElement => {
  const item = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
  ).find(
    (candidate) =>
      document.getElementById(candidate.getAttribute("aria-labelledby") ?? "")
        ?.textContent === label,
  );
  if (item === undefined) {
    throw new Error(`the open menu has no "${label}" item`);
  }
  return item;
};

const listMenuItemNames = () =>
  Array.from(
    document.querySelectorAll('[role="menuitem"]'),
    (item) =>
      document.getElementById(item.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
  );

const findButtonTitled = (title: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent.startsWith(title),
  );
  if (button === undefined) {
    throw new Error(`the page has no button titled "${title}"`);
  }
  return button;
};

const readChosenPictures = (): string[] => {
  const chosenText =
    document.querySelector('[aria-live="polite"]')?.textContent ?? "";
  const chosenPictures = chosenText.replace("Chosen: ", "");
  return chosenPictures === "none yet" ? [] : chosenPictures.split(", ");
};

const tapPictures = async (pictures: PicturePasswordPicture[]) => {
  for (const [index, picture] of pictures.entries()) {
    findButton(picture).click();
    await vi.waitFor(() => {
      expect(readChosenPictures()).toHaveLength(index + 1);
    });
  }
};

const slowestPageChangeMs = 5000;

const getStarBalanceText = () =>
  document.querySelector(".star-balance")?.textContent.trim();

const waitForStarBalance = async (starBalanceText: string) => {
  await vi.waitFor(
    () => {
      expect(getStarBalanceText()).toBe(starBalanceText);
    },
    { timeout: slowestPageChangeMs },
  );
};

const waitForText = async (text: string) => {
  await vi.waitFor(
    () => {
      expect(getPageText()).toContain(text);
    },
    { timeout: slowestPageChangeMs },
  );
};

describe("FamilyDevicePage", () => {
  let sparkle: PlayableChild;
  let thunderpaws: PlayableChild;
  const roots: Root[] = [];

  const renderStubGame = ({ finishPlaying }: PlayingChild) => (
    <>
      <p>{theGame}</p>
      <button type="button" onClick={finishPlaying}>
        Finish playing
      </button>
    </>
  );

  const openPage = (
    renderGame: (playingChild: PlayingChild) => ReactNode = renderStubGame,
  ) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);
    root.render(<FamilyDevicePage renderGame={renderGame} />);
    return root;
  };

  const closePage = (root: Root) => {
    root.unmount();
    document.body.replaceChildren();
  };

  const openPageOnceOnline = async (playableChildren: PlayableChild[]) => {
    startFakeServer(answerWithPlayableChildren(playableChildren));
    const root = openPage();
    await waitForText(playableChildren[0].characterName);
    closePage(root);
  };

  const openSparkle = async () => {
    findButton("Sparkle").click();
    await waitForText("Hello, Sparkle!");
  };

  beforeAll(async () => {
    sparkle = {
      id: sparkleId,
      characterName: "Sparkle",
      classmateVisitsAllowed: false,
      newPlayerNickname: null,
      yearGroup: 1,
      picturePasswordHash: await hashPicturePassword(sparklePicturePassword),
      phonicsProgrammeId: "little-wandle",
      limits: noLimits,
      rewards: buildStartingChildRewards(sparkleId),
    };
    thunderpaws = {
      id: thunderpawsId,
      characterName: "Thunderpaws",
      classmateVisitsAllowed: false,
      newPlayerNickname: null,
      yearGroup: 2,
      picturePasswordHash: await hashPicturePassword(
        thunderpawsPicturePassword,
      ),
      phonicsProgrammeId: "read-write-inc",
      limits: noLimits,
      rewards: buildStartingChildRewards(thunderpawsId),
    };
  });

  const playAsSparkle = async (shownOnceOpen = theGame) => {
    await waitForText("Who's playing?");
    await openSparkle();
    await tapPictures(sparklePicturePassword);
    findButton("Let's play").click();
    await waitForText(shownOnceOpen);
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  const closedPageSettleMs = 50;

  afterEach(async () => {
    for (const root of roots.splice(0)) {
      root.unmount();
    }
    await new Promise((settled) => setTimeout(settled, closedPageSettleMs));
    document.body.replaceChildren();
    Reflect.deleteProperty(document, "visibilityState");
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("asks who's playing, with a portrait for each of the Family's Characters", async () => {
    const { requests } = startFakeServer(
      answerWithPlayableChildren([sparkle, thunderpaws]),
    );

    openPage();

    await waitForText("Who's playing?");
    expect(findButton("Sparkle").className).toBe("portrait");
    expect(findButton("Thunderpaws").className).toBe("portrait");
    expect(
      findButton("Sparkle").querySelector(
        ".character-portrait canvas, .character-portrait div",
      ),
    ).not.toBeNull();
    expect(requests).toEqual([playableFamilyPath, adultSignOutPath]);
    expect(getPageText()).not.toContain(theGame);
  });

  it("signs out any adult left signed in, so a Child can't open the Parent page without a password or passkey", async () => {
    const { requests } = startFakeServer(answerWithPlayableChildren([sparkle]));

    openPage();

    await waitForText("Who's playing?");
    await vi.waitFor(() => {
      expect(requests).toContain(adultSignOutPath);
    });
  });

  it("signs no one out on a browser that isn't a Family Device", async () => {
    const { requests } = startFakeServer(answerWithStatus(401));

    openPage();

    await waitForText("Learning that feels like an adventure");
    expect(requests).not.toContain(adultSignOutPath);
  });

  it("draws a quiet fairytale castle behind who's playing, hidden from screen readers", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle]));

    openPage();

    await waitForText("Who's playing?");
    const backdrop = document.querySelector(
      ".who-is-playing > svg.fairytale-backdrop",
    );
    expect(backdrop?.getAttribute("aria-hidden")).toBe("true");
    expect(
      document.querySelector(".who-is-playing > main h1")?.textContent,
    ).toBe("Who's playing?");
  });

  it("opens a Child's Character with their Picture Password while the network is off, from what it kept when it was last online", async () => {
    await openPageOnceOnline([sparkle, thunderpaws]);
    const { requests } = startFakeServer(networkOff);
    openPage();
    await waitForText("Who's playing?");

    await openSparkle();
    await tapPictures(sparklePicturePassword);
    findButton("Let's play").click();

    await waitForText(theGame);
    expect(countChildrenRequests(requests)).toBe(1);
    expect(getPageText()).not.toContain("Who's playing?");
  });

  it("refuses the wrong Picture Password while the network is off, and lets the Child try again", async () => {
    await openPageOnceOnline([sparkle, thunderpaws]);
    startFakeServer(networkOff);
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();

    await tapPictures(["moon", "cat", "cat"]);
    findButton("Let's play").click();

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]')?.textContent).toBe(
        "Those aren't the right pictures. Try again!",
      );
    });
    expect(getPageText()).not.toContain(theGame);
    expect(getPageText()).toContain("Chosen: none yet");

    await tapPictures(sparklePicturePassword);
    findButton("Let's play").click();

    await waitForText(theGame);
  });

  it("never opens one Child's Character with a sibling's Picture Password", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();

    await tapPictures(thunderpawsPicturePassword);
    findButton("Let's play").click();

    await waitForText("Those aren't the right pictures. Try again!");
    expect(getPageText()).not.toContain(theGame);
  });

  describe("full screen when a Child signs in", () => {
    const offerFullScreen = (pointer: "coarse" | "fine") => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === `(pointer: ${pointer})`,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      Object.defineProperties(document, {
        fullscreenEnabled: { configurable: true, get: () => true },
        fullscreenElement: { configurable: true, get: () => null },
      });
      const requestFullscreen = vi.fn(() => Promise.resolve());
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: requestFullscreen,
      });
      return requestFullscreen;
    };

    afterEach(() => {
      Reflect.deleteProperty(document, "fullscreenEnabled");
      Reflect.deleteProperty(document, "fullscreenElement");
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    });

    it("fills the whole screen of a phone or tablet as the Child taps Let's play", async () => {
      const requestFullscreen = offerFullScreen("coarse");
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage();
      await waitForText("Who's playing?");
      await openSparkle();
      await tapPictures(sparklePicturePassword);
      expect(requestFullscreen).not.toHaveBeenCalled();

      findButton("Let's play").click();

      expect(requestFullscreen).toHaveBeenCalledOnce();
      await waitForText(theGame);
    });

    it("leaves full screen when the Child finishes playing and Who's playing? shows again", async () => {
      offerFullScreen("coarse");
      let fullScreenElement: Element | null = null;
      const exitFullscreen = vi.fn(() => {
        fullScreenElement = null;
        return Promise.resolve();
      });
      Object.defineProperties(document, {
        fullscreenElement: { configurable: true, get: () => fullScreenElement },
        exitFullscreen: { configurable: true, value: exitFullscreen },
      });
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: vi.fn(() => {
          fullScreenElement = document.documentElement;
          return Promise.resolve();
        }),
      });
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage();
      await waitForText("Who's playing?");
      await openSparkle();
      await tapPictures(sparklePicturePassword);
      findButton("Let's play").click();
      await waitForText(theGame);
      expect(exitFullscreen).not.toHaveBeenCalled();

      findButton("Finish playing").click();

      await waitForText("Who's playing?");
      expect(exitFullscreen).toHaveBeenCalledOnce();
      Reflect.deleteProperty(document, "exitFullscreen");
    });

    it("leaves a desktop's screen as it is when a Child signs in", async () => {
      const requestFullscreen = offerFullScreen("fine");
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage();
      await waitForText("Who's playing?");
      await openSparkle();
      await tapPictures(sparklePicturePassword);

      findButton("Let's play").click();

      await waitForText(theGame);
      expect(requestFullscreen).not.toHaveBeenCalled();
    });
  });

  it("fits the Picture Password on one screen: a slot fills for each picture, and Let's play sits beside That's not me", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle]));
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();

    const actions = document.querySelector(".picture-password-actions");
    expect(
      [...(actions?.querySelectorAll("button") ?? [])].map(
        (button) => button.textContent,
      ),
    ).toEqual(["Let's play", "That's not me"]);
    const listSlots = () =>
      [...document.querySelectorAll(".picture-password-slots li")].map(
        (slot) =>
          `${slot.textContent}${slot.hasAttribute("data-filled") ? "*" : ""}`,
      );
    expect(listSlots()).toEqual(["1", "2", "3"]);

    await tapPictures(["moon", "cat"]);

    expect(listSlots()).toEqual(["🌙*", "🐱*", "3"]);
    findButton("Start the pictures again").click();
    await vi.waitFor(() => {
      expect(listSlots()).toEqual(["1", "2", "3"]);
    });
  });

  it("asks for 3 pictures before checking them", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle]));
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();

    await tapPictures(["cat", "moon"]);
    findButton("Let's play").click();

    await waitForText("Tap 3 pictures first.");
    expect(getPageText()).not.toContain(theGame);
  });

  it("says it is checking the Picture Password while it does, with Let's play pressed off, then opens the Character", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle]));
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();
    let finishChecking: () => void = () => undefined;
    picturePasswordCheck.until = new Promise((resolve) => {
      finishChecking = resolve;
    });

    try {
      await tapPictures(sparklePicturePassword);
      findButton("Let's play").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".busy-label")?.textContent).toBe(
          "Checking your Picture Password…",
        );
      });
      expect(findButton("Let's play").disabled).toBe(true);
      expect(
        document.querySelector("main.menu")?.getAttribute("aria-busy"),
      ).toBe("true");
    } finally {
      finishChecking();
      picturePasswordCheck.until = undefined;
    }

    await waitForText(theGame);
    expect(document.querySelector(".busy")).toBeNull();
  });

  it("says it is getting the Family's Characters, and which step it is on, until it knows who can play", async () => {
    let answerFamily: () => void = () => undefined;
    const familyAnswered = new Promise<void>((resolve) => {
      answerFamily = resolve;
    });
    const answer = answerWithPlayableChildren([sparkle]);
    startFakeServer(async (path) => {
      if (path === playableFamilyPath) {
        await familyAnswered;
      }
      return answer(path);
    });
    openPage();

    await vi.waitFor(() => {
      expect(document.querySelector(".busy-detail")?.textContent).toBe(
        "Asking Wizzaroo who can play",
      );
    });
    expect(document.querySelector(".busy-label")?.textContent).toBe(
      "Getting your Family's Characters…",
    );
    expect(document.querySelector("main.menu")?.getAttribute("aria-busy")).toBe(
      "true",
    );

    answerFamily();
    await waitForText("Who's playing?");
    expect(document.querySelector(".busy")).toBeNull();
  });

  it("goes back to who's playing when a Child taps That's not me, or finishes playing", async () => {
    startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
    openPage();
    await waitForText("Who's playing?");
    await openSparkle();

    findButton("That's not me").click();
    await waitForText("Who's playing?");
    await openSparkle();
    await tapPictures(sparklePicturePassword);
    findButton("Let's play").click();
    await waitForText(theGame);
    findButton("Finish playing").click();

    await waitForText("Who's playing?");
    expect(getPageText()).not.toContain(theGame);
  });

  it("welcomes a visitor on a signed-out device with the home page, inviting a Parent to get started", async () => {
    startFakeServer(answerWithStatus(401));
    openPage();

    await waitForText("Learning that feels like an adventure");
    const heroImage = document.querySelector("img.home-hero-image");
    expect(heroImage?.getAttribute("src")).toBe(
      "/home/world-map-meadow-isle-960.webp",
    );
    expect(heroImage?.getAttribute("alt")).toContain("Meadow Isle");
    expect(
      Array.from(
        document.querySelectorAll("a.button-link"),
        (link) => `${link.textContent} ${String(link.getAttribute("href"))}`,
      ),
    ).toEqual([
      "Get started as a Parent /parent/",
      "See how it works #how-it-works",
      "Get started as a Parent /parent/",
    ]);
    expect(document.getElementById("how-it-works")?.textContent).toContain(
      "Make a Family Device",
    );
  });

  it("names every Subject on the home page, each with the Region that teaches it", async () => {
    startFakeServer(answerWithStatus(401));
    openPage();

    await waitForText("Learning that feels like an adventure");
    const subjectHeadings = Array.from(
      document.querySelectorAll(
        ".home-subject:not(.home-subject-every-island) h3",
      ),
      (heading) => heading.textContent,
    );
    expect(subjectHeadings).toEqual(
      subjects.map((subject) => subjectNames[subject]),
    );
    expect(document.querySelector(".home-lead")?.textContent).toContain(
      "Design and technology, and Languages",
    );
    expect(getPageText()).toContain("Echo Well");
  });

  describe("the title bar", () => {
    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("sits above the home page with the menu, which leaves Settings to the cog, in place of a sign-in link of its own", async () => {
      startFakeServer(answerWithStatus(401));
      openPage();
      await waitForText("Learning that feels like an adventure");

      expect(document.querySelector("header.site-header")).not.toBeNull();
      expect(
        document.querySelector("a.site-header-settings")?.getAttribute("href"),
      ).toBe("#settings");
      findButton("Menu").click();
      await vi.waitFor(() => {
        expect(
          Array.from(document.querySelectorAll(".site-menu-list a"), (link) =>
            [link.textContent, link.getAttribute("href")].join(" "),
          ),
        ).toEqual(["Home #home", "Parent sign in /parent/"]);
      });
    });

    it("shows the Settings page in place of who's playing, and goes back home from the menu", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      window.history.replaceState(null, "", "#settings");
      openPage();

      await waitForText("Choose how Wizzaroo looks and sounds.");
      expect(getPageText()).not.toContain("Who's playing?");

      window.location.hash = "#home";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      await waitForText("Who's playing?");
    });

    it("steps out of the way while a Child plays", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage();
      await waitForText("Who's playing?");
      expect(document.querySelector("header.site-header")).not.toBeNull();

      await playAsSparkle();

      expect(document.querySelector("header.site-header")).toBeNull();
    });
  });

  it("shows a signed-out screen once a Parent has signed the device out, and forgets the Children, even with no network the next time", async () => {
    await openPageOnceOnline([sparkle, thunderpaws]);
    startFakeServer(answerWithStatus(401));
    const root = openPage();

    await waitForText("Wizzaroo is signed out on this device");
    expect(getPageText()).not.toContain("Sparkle");
    expect(document.querySelector('a[href="/parent/"]')).not.toBeNull();

    closePage(root);
    startFakeServer(networkOff);
    openPage();

    await waitForText("Wizzaroo can't reach its server");
    expect(getPageText()).not.toContain("Sparkle");
  });

  it.each([500, 502, 530])(
    "keeps letting the Children play when the server answers %i, as it does while the home server or the tunnel is down",
    async (status) => {
      await openPageOnceOnline([sparkle]);
      startFakeServer(answerWithStatus(status));
      openPage();
      await waitForText("Who's playing?");

      await openSparkle();
      await tapPictures(sparklePicturePassword);
      findButton("Let's play").click();

      await waitForText(theGame);
    },
  );

  it("picks up a Child added since the device was last opened", async () => {
    await openPageOnceOnline([sparkle]);
    startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));

    openPage();

    await waitForText("Thunderpaws");
  });

  it("uploads a finished Timed Check as one check-finished event in the Session, keeping no Stars of its own", async () => {
    const { findUploadedPlayEvents } = startFakeServer(
      answerWithPlayableChildren([sparkle]),
    );
    const checkPlace = {
      islandId: "jungle-reach",
      regionId: "challenge-arena",
      gameId: "multiplication-tables-check",
    };
    const rightOutcome = {
      key: "7x8",
      questionType: "8-times-table",
      skillId: "maths.times-tables-to-12",
      isRight: true,
      isInTime: true,
      millisecondsTaken: 2400.6,
    };
    openPage(({ recordCheck, rewards }) => (
      <>
        <p>{`${String(rewards.stars)} Stars held`}</p>
        <button
          type="button"
          onClick={() => {
            recordCheck(
              {
                checkGameType: "times-tables-check",
                isClockOff: true,
                outcomes: [rightOutcome],
              },
              checkPlace,
            );
          }}
        >
          Finish the Check
        </button>
      </>
    ));
    await playAsSparkle("Finish the Check");

    findButton("Finish the Check").click();

    await vi.waitFor(() => {
      expect(
        findUploadedPlayEvents(sparkle.id).filter(
          ({ type }) => type === "check-finished",
        ),
      ).toHaveLength(1);
    });
    const uploaded = findUploadedPlayEvents(sparkle.id);
    const started = uploaded.find(({ type }) => type === "session-started");
    const finished = uploaded.find(({ type }) => type === "check-finished");
    expect(finished?.payload).toEqual({
      sessionId: started?.payload.sessionId,
      localDate: getLocalDate(new Date()),
      ...checkPlace,
      checkGameType: "times-tables-check",
      isClockOff: true,
      outcomes: [{ ...rightOutcome, millisecondsTaken: 2401 }],
    });
    expect(getPageText()).toContain("0 Stars held");
  });

  it("says it can't reach Wizzaroo when the device has never had the Characters and the network is off", async () => {
    startFakeServer(networkOff);

    openPage();

    await waitForText(
      "Wizzaroo can't reach its server, and this device hasn't got the Characters yet.",
    );
  });

  it("says when the Family has no Children to play yet", async () => {
    startFakeServer(answerWithPlayableChildren([]));

    openPage();

    await waitForText("There are no Children to play yet.");
  });

  describe("a Child brought in by their School", () => {
    const newcomerId = "0b0f7b1e-3333-4333-8333-333333333333";
    const newcomerPicturePassword: PicturePasswordPicture[] = [
      "rocket",
      "tree",
      "fish",
    ];

    const buildNewcomer = (): FamilyChild => ({
      id: newcomerId,
      characterName: null,
      classmateVisitsAllowed: false,
      newPlayerNickname: "Newbie",
      yearGroup: 1,
      picturePasswordHash: null,
      phonicsProgrammeId: null,
      limits: noLimits,
      rewards: buildStartingChildRewards(newcomerId),
    });

    interface SetUpRequest {
      path: string;
      body: unknown;
    }

    /** A server that keeps what the Family Device sets up, and answers 503 to every write while it is down. */
    const startSetUpServer = (newcomer: FamilyChild) => {
      const setUpRequests: SetUpRequest[] = [];
      let isWritingDown = false;
      let shownNewcomer = newcomer;
      vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
        if (init.method !== "PUT") {
          return path === playEventUploadPath
            ? new Response(null, { status: 204 })
            : Response.json({
                playableChildren: [sparkle, shownNewcomer],
                familyChestActivityCount: 0,
              });
        }
        if (isWritingDown) {
          return new Response(null, { status: 503 });
        }
        const body: unknown =
          typeof init.body === "string" ? JSON.parse(init.body) : undefined;
        setUpRequests.push({ path, body });
        if (path.endsWith("/picture-password")) {
          shownNewcomer = {
            ...shownNewcomer,
            picturePasswordHash: await hashPicturePassword(
              newcomerPicturePassword,
            ),
          };
        } else {
          shownNewcomer = { ...shownNewcomer, characterName: "Zappo" };
        }
        return new Response(null, { status: 204 });
      });
      return {
        setUpRequests,
        takeWritingDown: () => {
          isWritingDown = true;
        },
      };
    };

    const typeCharacterName = (name: string) => {
      const input = document.querySelector('input[name="characterName"]');
      if (!(input instanceof HTMLInputElement)) {
        throw new Error("the page has no Character name box");
      }
      input.value = name;
    };

    it("calls a Child with no Character and no nickname from the server a New player", async () => {
      startSetUpServer({ ...buildNewcomer(), newPlayerNickname: null });
      openPage();

      await waitForText("New player");
      expect(
        findButton("New player").querySelector(".character-portrait svg"),
      ).not.toBeNull();
    });

    it("shows a friendly placeholder portrait for a Child with no Character yet, and leaves the other Children's portraits as they are", async () => {
      startSetUpServer(buildNewcomer());
      openPage();
      await waitForText("Newbie");

      expect(
        findButton("Newbie").querySelector(".character-portrait svg"),
      ).not.toBeNull();
      expect(
        findButton("Sparkle").querySelector(".character-portrait svg"),
      ).toBeNull();
      expect(
        findButton("Sparkle").querySelector(
          ".character-portrait canvas, .character-portrait div",
        ),
      ).not.toBeNull();
    });

    it("walks a Child created without a Picture Password through a Parent setting one, then making a Character, and starts playing", async () => {
      const { setUpRequests } = startSetUpServer(buildNewcomer());
      openPage();
      await waitForText("Newbie");

      findButton("Newbie").click();
      await waitForText("A Parent chooses the first Picture Password");
      await tapPictures(newcomerPicturePassword);
      findButton("Next").click();
      await waitForText("Now tap the same 3 pictures again");
      await tapPictures(newcomerPicturePassword);
      findButton("Save the Picture Password").click();
      await waitForText("Make your Character");
      typeCharacterName("  Zappo ");
      findButton("That's me!").click();

      await waitForText(theGame);
      expect(setUpRequests).toEqual([
        {
          path: `/api/play/children/${newcomerId}/picture-password`,
          body: { picturePassword: newcomerPicturePassword },
        },
        {
          path: `/api/play/children/${newcomerId}/character`,
          body: { name: "Zappo" },
        },
      ]);
    });

    it("says each step of making the Character while it happens, with That's me! pressed off, then starts playing", async () => {
      startSetUpServer({
        ...buildNewcomer(),
        picturePasswordHash: await hashPicturePassword(newcomerPicturePassword),
      });
      openPage();
      await waitForText("Newbie");
      findButton("Newbie").click();
      await waitForText("Make your Character");
      const setUpServer = globalThis.fetch;
      let saveName: () => void = () => undefined;
      let answerFamily: () => void = () => undefined;
      const nameSaved = new Promise<void>((resolve) => {
        saveName = resolve;
      });
      const familyAnswered = new Promise<void>((resolve) => {
        answerFamily = resolve;
      });
      vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
        if (init.method === "PUT") {
          await nameSaved;
        } else if (path === playableFamilyPath) {
          await familyAnswered;
        }
        return setUpServer(path, init);
      });
      const readBusy = (part: "label" | "detail") =>
        document.querySelector(`.busy-${part}`)?.textContent;

      typeCharacterName("Zappo");
      findButton("That's me!").click();
      await vi.waitFor(() => {
        expect(readBusy("label")).toBe("Making Zappo, your Character…");
      });
      expect(readBusy("detail")).toBe(
        "Step 1 of 2: saving their name with Wizzaroo",
      );
      expect(findButton("That's me!").disabled).toBe(true);
      expect(
        findButton("That's me!").closest("form")?.getAttribute("aria-busy"),
      ).toBe("true");

      saveName();
      await vi.waitFor(() => {
        expect(readBusy("label")).toBe("Getting Zappo ready to play…");
      });
      expect(readBusy("detail")).toBe(
        "Step 2 of 2: fetching your Character from Wizzaroo",
      );
      expect(findButton("That's me!").disabled).toBe(true);

      answerFamily();
      await waitForText(theGame);
      expect(document.querySelector(".busy")).toBeNull();
    });

    it("says it is saving the Picture Password with the button pressed off, and lets it be pressed again when it can't be saved", async () => {
      const { takeWritingDown } = startSetUpServer(buildNewcomer());
      openPage();
      await waitForText("Newbie");
      findButton("Newbie").click();
      await waitForText("A Parent chooses the first Picture Password");
      takeWritingDown();
      await tapPictures(newcomerPicturePassword);
      findButton("Next").click();
      await waitForText("Now tap the same 3 pictures again");
      await tapPictures(newcomerPicturePassword);
      const setUpServer = globalThis.fetch;
      let answerSave: () => void = () => undefined;
      const saveAnswered = new Promise<void>((resolve) => {
        answerSave = resolve;
      });
      vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
        if (init.method === "PUT") {
          await saveAnswered;
        }
        return setUpServer(path, init);
      });

      findButton("Save the Picture Password").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".busy-label")?.textContent).toBe(
          "Saving the Picture Password…",
        );
      });
      expect(findButton("Save the Picture Password").disabled).toBe(true);

      answerSave();
      await waitForText(
        "Wizzaroo couldn't save that. Check this device is online, then try again.",
      );
      expect(document.querySelector(".busy")).toBeNull();
      expect(findButton("Save the Picture Password").disabled).toBe(false);
    });

    it("asks for the same pictures twice, and starts again when they don't match", async () => {
      const { setUpRequests } = startSetUpServer(buildNewcomer());
      openPage();
      await waitForText("Newbie");
      findButton("Newbie").click();
      await waitForText("A Parent chooses the first Picture Password");

      await tapPictures(newcomerPicturePassword);
      findButton("Next").click();
      await waitForText("Now tap the same 3 pictures again");
      await tapPictures(["cat", "cat", "cat"]);
      findButton("Save the Picture Password").click();

      await waitForText("Those pictures didn't match. Choose them again.");
      expect(getPageText()).toContain("Parent, choose the 3 pictures");
      expect(setUpRequests).toEqual([]);
    });

    it("goes straight to making a Character when the Picture Password is already set", async () => {
      const newcomer = {
        ...buildNewcomer(),
        picturePasswordHash: await hashPicturePassword(newcomerPicturePassword),
      };
      startSetUpServer(newcomer);
      openPage();
      await waitForText("Newbie");

      findButton("Newbie").click();

      await waitForText("Make your Character");
      expect(getPageText()).not.toContain("first Picture Password");
    });

    it("says so, and keeps the Child's choice, when the Picture Password can't be saved", async () => {
      const { takeWritingDown } = startSetUpServer(buildNewcomer());
      openPage();
      await waitForText("Newbie");
      findButton("Newbie").click();
      await waitForText("A Parent chooses the first Picture Password");
      takeWritingDown();

      await tapPictures(newcomerPicturePassword);
      findButton("Next").click();
      await waitForText("Now tap the same 3 pictures again");
      await tapPictures(newcomerPicturePassword);
      findButton("Save the Picture Password").click();

      await waitForText(
        "Wizzaroo couldn't save that. Check this device is online, then try again.",
      );
      expect(getPageText()).toContain("Now tap the same 3 pictures again");
      expect(getPageText()).not.toContain(theGame);
    });

    it("keeps playing offline from a Family stored before new players' nicknames were sent", async () => {
      const sparkleStoredBefore = Object.fromEntries(
        Object.entries(sparkle).filter(
          ([field]) => field !== "newPlayerNickname",
        ),
      );
      localStorage.setItem(
        "wizzaroo.family-device.playable-family",
        JSON.stringify({
          playableChildren: [sparkleStoredBefore],
          familyChestActivityCount: 0,
        }),
      );
      startFakeServer(networkOff);
      openPage();

      await waitForText("Who's playing?");
      await openSparkle();
      expect(getPageText()).toContain("Hello, Sparkle!");
    });
  });

  describe("Missions", () => {
    const missionChoice = "Your World Map";
    const everyRegionsName = "Bubble Bay";
    const everyLittleWandleStartingSound = new Set<PhonicsSound>([
      "s",
      "a",
      "t",
      "p",
      "i",
      "n",
    ]);

    let shownWorldMap: WorldMapSceneProps | undefined;

    let shownExplore: IslandExploreSceneProps | undefined;

    let shownScene: MissionSceneProps | undefined;

    const renderMission =
      (recordedSounds: ReadonlySet<PhonicsSound> = new Set()) =>
      (playingChild: PlayingChild) => (
        <MissionPlay
          {...playingChild}
          recordedSounds={recordedSounds}
          renderScene={(sceneProps) => {
            shownScene = sceneProps;
            return <div className="scene" />;
          }}
          renderWorldMap={(worldMapProps) => {
            shownWorldMap = worldMapProps;
            return <div className="world-map-scene" />;
          }}
          renderIslandExplore={(exploreProps) => {
            shownExplore = exploreProps;
            return <div className="island-explore-scene" />;
          }}
        />
      );

    const openRegion = async (chipLabel = "Bubble Bay, Maths") => {
      await vi.waitFor(
        () => {
          findButton(chipLabel);
        },
        { timeout: slowestPageChangeMs },
      );
      findButton(chipLabel).click();
      await waitForText(missionChoice);
    };

    const playAsSparkleOnTheWorldMap = async () => {
      await playAsSparkle(everyRegionsName);
      await openRegion();
    };

    const readShownWorldMap = (): WorldMapSceneProps => {
      if (shownWorldMap === undefined) {
        throw new Error("the page showed no World Map");
      }
      return shownWorldMap;
    };

    const readText = (selector: string) =>
      document.querySelector(selector)?.textContent ?? "";

    const openMenuPanel = async (option: string) => {
      await vi.waitFor(
        () => {
          findButton("Menu");
        },
        { timeout: slowestPageChangeMs },
      );
      findButton("Menu").click();
      await vi.waitFor(() => {
        findMenuItem(option);
      });
      findMenuItem(option).click();
      await vi.waitFor(() => {
        expect(document.querySelector(".play-side-panel h2")?.textContent).toBe(
          option,
        );
      });
    };

    const chooseFromMenu = async (option: string, item: string) => {
      await openMenuPanel(option);
      findButton(item).click();
    };

    const findNumberBondAnswer = (numberSentence: string) => {
      const [left, , right] = numberSentence.split(" ");
      return String(10 - Number(left === "?" ? right : left));
    };

    const answerRight = async () => {
      const progressBefore = readText(".mission-progress");
      findButton(
        `Pop ${findNumberBondAnswer(readText(".number-sentence"))}`,
      ).click();
      await vi.waitFor(() => {
        expect(
          readText(".mission-progress") !== progressBefore ||
            getPageText().includes("You finished the Mission"),
        ).toBe(true);
      });
    };

    const playWholeNumberBondsMission = async () => {
      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3");
      while (!getPageText().includes("You finished the Mission")) {
        await answerRight();
      }
    };

    const findPractice = (playEvents: PlayEvent[]) =>
      playEvents.filter(
        ({ type }) =>
          type === "question-answered" || type === "activity-finished",
      );

    it("lets a Child play a whole popping-bubbles Mission with the network off, celebrates with one more go, and uploads every Question answered and Activity finished once back online", async () => {
      await openPageOnceOnline([sparkle]);
      const offline = startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      await playWholeNumberBondsMission();

      expect(getPageText()).toContain("Hooray! You finished the Mission!");
      expect(getPageText()).toContain("Would you like one more go?");
      expect(findButton("One more go")).toBeDefined();
      await vi.waitFor(() => {
        expect(
          findPractice(offline.findUploadedPlayEvents(sparkle.id)),
        ).toHaveLength(18);
      });

      const online = startFakeServer(answerWithPlayableChildren([sparkle]));
      window.dispatchEvent(new Event("online"));

      await vi.waitFor(() => {
        expect(
          findPractice(online.findUploadedPlayEvents(sparkle.id)),
        ).toHaveLength(18);
      });
      const practice = findPractice(online.findUploadedPlayEvents(sparkle.id));
      const answered = practice.filter(
        ({ type }) => type === "question-answered",
      );
      const finished = practice.filter(
        ({ type }) => type === "activity-finished",
      );
      expect(answered).toHaveLength(15);
      expect(finished).toHaveLength(3);
      const [sessionStarted] = online.findUploadedPlayEvents(sparkle.id);
      for (const { payload } of practice) {
        expect(payload).toMatchObject({
          sessionId: sessionStarted.payload.sessionId,
          skillId: "maths.number-bonds-10",
          islandId: "meadow-isle",
          regionId: "bubble-bay",
          gameId: "popping-bubbles",
        });
      }
      expect(answered[0].payload).toMatchObject({
        isRightFirstTime: true,
        wrongAnswerCount: 0,
      });
    });

    it("answers a wrong bubble with a gentle hint, takes it away and lets the Child try again, never a hard fail", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([sparkle]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      const numberSentence = readText(".number-sentence");
      const answer = findNumberBondAnswer(numberSentence);
      const wrongBubble = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button.choice"),
      ).find((bubble) => bubble.textContent !== answer);
      if (wrongBubble === undefined) {
        throw new Error("the Question has no wrong bubble");
      }
      const wrongLabel = wrongBubble.getAttribute("aria-label") ?? "";

      wrongBubble.click();

      await waitForText("Nearly! Count on from");
      expect(playVoiceOver).toHaveBeenLastCalledWith("bubbles.count-on");
      expect(getPageText()).toContain("Activity 1 of 3, question 1 of 5");
      expect(readText(".number-sentence")).toBe(numberSentence);
      expect(() => findButton(wrongLabel)).toThrow();

      findButton(`Pop ${answer}`).click();

      await waitForText("Activity 1 of 3, question 2 of 5");
      await vi.waitFor(() => {
        expect(findPractice(findUploadedPlayEvents(sparkle.id))).toHaveLength(
          1,
        );
      });
      expect(
        findPractice(findUploadedPlayEvents(sparkle.id))[0].payload,
      ).toMatchObject({ isRightFirstTime: false, wrongAnswerCount: 1 });
    });

    it("speaks the instruction from the Child's own tap when a Mission starts, and again whenever they ask", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3");
      expect(playVoiceOver).toHaveBeenLastCalledWith("bubbles.pop-the-bond");

      vi.mocked(playVoiceOver).mockClear();
      findButton("Read it to me").click();
      expect(playVoiceOver).toHaveBeenCalledWith("bubbles.pop-the-bond");
    });

    it("reads the question itself out loud when the Child asks, with the device's own voice", async () => {
      const spoken: string[] = [];
      vi.stubGlobal("speechSynthesis", {
        speak: ({ text }: SpeechSynthesisUtterance) => spoken.push(text),
        cancel: () => undefined,
        getVoices: () => [],
      });
      vi.stubGlobal(
        "SpeechSynthesisUtterance",
        class {
          constructor(readonly text: string) {}
        },
      );
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3");
      vi.mocked(playVoiceOver).mockClear();
      findButton("Read it to me").click();

      expect(spoken).toHaveLength(1);
      expect(spoken[0]).toMatch(
        /^\d+ plus what equals 10$|^what plus \d+ equals 10$/,
      );
      expect(playVoiceOver).not.toHaveBeenCalled();
    });

    it("shows the Mastery the device works out from its own play until the server's arrives", async () => {
      const goodDay = (localDate: string) => ({
        skillId: "maths.number-bonds-10",
        localDate,
        questionCount: 10,
        rightFirstTimeCount: 10,
        secondsSpent: 60,
      });
      const today = new Date();
      const daysAgo = (days: number) => {
        const day = new Date(today);
        day.setDate(day.getDate() - days);
        return `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      };
      const sparkleWithTwoGoodDays = withRewards(sparkle, {
        practiceDays: [goodDay(daysAgo(2)), goodDay(daysAgo(1))],
      });
      await openPageOnceOnline([sparkleWithTwoGoodDays]);
      startFakeServer(networkOff);
      const offlinePage = openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      expect(getPageText()).toContain("Learning: 2 of 3 great days");

      await playWholeNumberBondsMission();

      expect(getPageText()).toContain("Number bonds to 10: Mastered!");
      closePage(offlinePage);

      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { practiceDays: [goodDay(daysAgo(1))] }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      await waitForText("Learning: 1 of 3 great days");
      expect(localStorage.getItem("wizzaroo.family-device.unsynced-play")).toBe(
        "[]",
      );
    });

    it("offers listen-and-pick once the Child's sounds are recorded, playing the sounds in their Phonics Programme's order", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission(everyLittleWandleStartingSound));
      await playAsSparkleOnTheWorldMap();

      findButton("Crystal Caves, Phonics").click();
      await waitForText("Listen and pick");
      findButtonTitled("Listen and pick").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      expect(playVoiceOver).toHaveBeenLastCalledWith("listen.pick-the-letters");

      findButton("Play the sound").click();
      expect(playPhoneme).toHaveBeenLastCalledWith("s");

      findButton("Pick s").click();
      await waitForText("Activity 1 of 3, question 2 of 5");
      expect(playPhoneme).toHaveBeenLastCalledWith("s");
    });

    it("leaves listen-and-pick out while none of the Child's sounds has a recording", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Crystal Caves, Phonics").click();
      await waitForText("Crystal blend");
      expect(getPageText()).not.toContain("Listen and pick");
    });

    it("plays Year 1 Maths in Bubble Bay on Island 1 for a Year 3 Child, whatever their own Year", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([{ ...sparkle, yearGroup: 3 }]),
      );
      openPage(renderMission());
      await playAsSparkle("Oasis Pools");
      readShownWorldMap().onIslandInView("meadow-isle");
      await openRegion("Bubble Bay, Maths");

      expect(readText(".region-subject-name")).toBe("Maths");
      expect(readText(".region-subject-year")).toBe("Meadow Isle · Year 1");
      expect(document.querySelectorAll(".mission-card")).toHaveLength(19);
      expect(getPageText()).toContain("Fair shares");
      expect(getPageText()).toContain("Coin Counter");
      expect(getPageText()).toContain("Turtle turns");
      expect(getPageText()).toContain("Number bonds to 10");
      expect(getPageText()).not.toContain("The 3, 4 and 8 times tables");

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      findButton(
        `Pop ${findNumberBondAnswer(readText(".number-sentence"))}`,
      ).click();
      await vi.waitFor(() => {
        expect(findPractice(findUploadedPlayEvents(sparkle.id))).toHaveLength(
          1,
        );
      });
      expect(
        findPractice(findUploadedPlayEvents(sparkle.id))[0].payload,
      ).toMatchObject({
        skillId: "maths.number-bonds-10",
        islandId: "meadow-isle",
        regionId: "bubble-bay",
        gameId: "popping-bubbles",
      });
    });

    it("comes back from a Game to the Island the Child travelled to, not their home Island", async () => {
      startFakeServer(
        answerWithPlayableChildren([{ ...sparkle, yearGroup: 3 }]),
      );
      openPage(renderMission());
      await playAsSparkle("Oasis Pools");
      expect(readShownWorldMap().islandInViewId).not.toBe("meadow-isle");
      readShownWorldMap().onIslandInView("meadow-isle");
      await openRegion("Bubble Bay, Maths");

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      shownWorldMap = undefined;
      findButton("Back to the map").click();

      await vi.waitFor(() => {
        expect(shownWorldMap?.islandInViewId).toBe("meadow-isle");
      });
    });

    it("opens the Region's panel again when the Child goes back to the map from a Game, to choose another", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      findButton("Back to the map").click();

      await waitForText(missionChoice);
      expect(document.querySelector(".region-panel")?.textContent).toContain(
        "Pop the bubbles",
      );
      expect(findButton("Bubble Bay, Maths").getAttribute("aria-pressed")).toBe(
        "true",
      );
    });

    it("keeps the Region the Child came back to in its panel, not one under the resting pointer, until the pointer moves", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      findButton("Back to the map").click();
      await waitForText(missionChoice);

      const pointAtWoods = () => {
        findButton("Whispering Woods, English").dispatchEvent(
          new PointerEvent("pointerover", { bubbles: true }),
        );
      };
      pointAtWoods();
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
      expect(getPageText()).not.toContain("The owls have lost their voices.");

      window.dispatchEvent(new PointerEvent("pointermove"));
      await vi.waitFor(
        () => {
          pointAtWoods();
          expect(getPageText()).toContain("The owls have lost their voices.");
        },
        { timeout: slowestPageChangeMs },
      );
    });

    it("plays the Multiplication Tables Check in Jungle Reach's Challenge Arena and uploads the Timed Check for the Check History", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([
          {
            ...sparkle,
            yearGroup: 4,
            limits: buildChildLimits({ isCheckClockOff: true }),
          },
        ]),
      );
      openPage(renderMission());
      await playAsSparkle("Challenge Arena");
      await openRegion("Challenge Arena, Checks");

      expect(readText(".region-subject-name")).toBe("Checks");
      expect(readText(".region-subject-year")).toBe("Jungle Reach · Year 4");
      findButtonTitled("Times tables check").click();
      await waitForText("How would you like to play?");
      findButtonTitled("Timed check").click();
      await waitForText("Warm-up 1 of 3");
      const answerShownQuestion = async () => {
        const prompt = readText(".check-prompt");
        const [first, second] = prompt
          .replace("=", "")
          .split("×")
          .map((factor) => Number(factor.trim()));
        const input = document.querySelector<HTMLInputElement>("#check-answer");
        if (input === null) {
          throw new Error("the Check shows no answer box");
        }
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set?.call(input, String(first * second));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.form?.requestSubmit();
        await vi.waitFor(() => {
          expect(readText(".check-prompt")).not.toBe(prompt);
        });
      };
      for (let warmUp = 0; warmUp < 3; warmUp += 1) {
        await answerShownQuestion();
      }
      findButton("Start the check").click();
      await waitForText("Question 1 of 25");
      for (let question = 0; question < 25; question += 1) {
        await answerShownQuestion();
      }
      await waitForText("You scored 25 out of 25");

      await vi.waitFor(() => {
        expect(
          findUploadedPlayEvents(sparkle.id).filter(
            ({ type }) => type === "check-finished",
          ),
        ).toHaveLength(1);
      });
      const [checkFinished] = findUploadedPlayEvents(sparkle.id).filter(
        ({ type }) => type === "check-finished",
      );
      expect(checkFinished.payload).toMatchObject({
        islandId: "jungle-reach",
        regionId: "challenge-arena",
        gameId: "multiplication-tables-check",
        checkGameType: "times-tables-check",
        isClockOff: true,
      });
      const answeredInTheCheck = findUploadedPlayEvents(sparkle.id).filter(
        ({ type, payload }) =>
          type === "question-answered" &&
          "gameId" in payload &&
          payload.gameId === "multiplication-tables-check",
      );
      expect(answeredInTheCheck).toHaveLength(25);
      expect(
        answeredInTheCheck.every(
          ({ payload }) =>
            "checkWay" in payload &&
            payload.checkWay === "timed" &&
            typeof payload.millisecondsTaken === "number",
        ),
      ).toBe(true);
    });

    it("lists the Brainwave Big Top last among the Region chips under the map, after every Subject", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      const chipNames = [
        ...document.querySelectorAll(
          'nav[aria-label="Regions"] button.region-chip',
        ),
      ].map((chip) => chip.getAttribute("aria-label")?.split(", ")[0]);

      expect(chipNames.at(0)).toBe("Bubble Bay");
      expect(chipNames.at(-1)).toBe("Brainwave Big Top");
      expect(
        chipNames.filter((name) => name === "Brainwave Big Top"),
      ).toHaveLength(1);
    });

    it("plays Year 3 Maths on a Year 3 Child's own Island", async () => {
      startFakeServer(
        answerWithPlayableChildren([{ ...sparkle, yearGroup: 3 }]),
      );
      openPage(renderMission());
      await playAsSparkle("Oasis Pools");
      await openRegion("Oasis Pools, Maths");

      expect(readText(".region-subject-year")).toBe("Sunscorch Sands · Year 3");
      expect(getPageText()).toContain("The 3, 4 and 8 times tables");
      findButtonTitled("Times table bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      expect(playVoiceOver).toHaveBeenLastCalledWith("maths.read-then-tap");
    });

    const today = new Date();
    const daysAgo = (days: number) => {
      const day = new Date(today);
      day.setDate(day.getDate() - days);
      return `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    };
    const goodDayOn = (skillId: string, localDate: string) => ({
      skillId,
      localDate,
      questionCount: 10,
      rightFirstTimeCount: 10,
      secondsSpent: 60,
    });
    const masteredLongAgo = (skillId: string) =>
      [40, 39, 38].map((days) => goodDayOn(skillId, daysAgo(days)));

    const findUploadedOfType = (playEvents: PlayEvent[], type: string) =>
      playEvents.filter((playEvent) => playEvent.type === type);

    it("shows the Stars the device works out from its own play until the server's arrive, and celebrates the Stars a Mission earned", async () => {
      await openPageOnceOnline([sparkle]);
      startFakeServer(networkOff);
      const offlinePage = openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      expect(getStarBalanceText()).toBe("0 Stars");

      await playWholeNumberBondsMission();

      expect(getPageText()).toContain("You earned 9 Stars!");
      findButton("Back to the World Map").click();
      await waitForStarBalance("9 Stars");
      closePage(offlinePage);

      startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 9 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      expect(getStarBalanceText()).toBe("9 Stars");
      expect(localStorage.getItem("wizzaroo.family-device.unsynced-play")).toBe(
        "[]",
      );
    });

    const listRegionPanelCards = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          ".region-panel .mission-card",
        ),
      );

    it("opens only the first Game in each Region, and the next once 10 more Stars are earned there, from the device's own Stars until the server's arrive", async () => {
      await openPageOnceOnline([sparkle]);
      startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      expect(listRegionPanelCards().map(({ disabled }) => disabled)).toEqual([
        false,
        ...Array.from({ length: 9 }, () => true),
        ...Array.from({ length: 9 }, () => false),
      ]);
      expect(listRegionPanelCards()[1].textContent).toContain(
        "10 more Stars to open",
      );
      expect(listRegionPanelCards()[2].textContent).toContain(
        "20 more Stars to open",
      );

      await playWholeNumberBondsMission();
      findButton("Back to the World Map").click();
      await openRegion();
      expect(listRegionPanelCards()[1].textContent).toContain(
        "1 more Star to open",
      );

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3");
      await answerRight();
      while (!getPageText().includes("Activity 2 of 3")) {
        await answerRight();
      }
      findButton("Back to the map").click();
      await openRegion();

      expect(listRegionPanelCards()[1].disabled).toBe(false);
      expect(listRegionPanelCards()[2].textContent).toContain(
        "8 more Stars to open",
      );
      findButton("Whispering Woods, English").click();
      await waitForText("The owls have lost their voices.");
      expect(
        listRegionPanelCards().filter(({ disabled }) => !disabled),
      ).toHaveLength(10);
    });

    it("opens the World Map on a Year 2 Child's own Island, zoomed out with no Region chosen, and the Islands above their Year locked", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await waitForText("Who's playing?");
      findButton("Thunderpaws").click();
      await waitForText("Hello, Thunderpaws!");
      await tapPictures(thunderpawsPicturePassword);
      findButton("Let's play").click();
      await waitForText("Icicle Inlet");

      expect(readShownWorldMap()).toMatchObject({
        islandInViewId: "frost-isle",
        selectedRegionId: undefined,
        cameraCommand: { kind: "none" },
      });
      expect(
        readShownWorldMap().islands.map(({ id, isUnlocked }) => [
          id,
          isUnlocked,
        ]),
      ).toEqual([
        ["meadow-isle", true],
        ["frost-isle", true],
        ["sunscorch-sands", false],
        ["jungle-reach", false],
        ["ember-isle", false],
        ["starfall-isle", false],
      ]);
      expect(getPageText()).not.toContain(missionChoice);
    });

    it("plays a Frost Isle Game on its Meadow Isle stage, dressed with Frost Isle's props", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await waitForText("Who's playing?");
      findButton("Thunderpaws").click();
      await waitForText("Hello, Thunderpaws!");
      await tapPictures(thunderpawsPicturePassword);
      findButton("Let's play").click();
      await openRegion("Icicle Inlet, Maths");

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");

      expect(shownScene).toMatchObject({
        gameType: "popping-bubbles",
        islandId: "frost-isle",
      });
    });

    const listRegionPanelCardTitles = () =>
      Array.from(
        document.querySelectorAll(".region-panel .mission-card-title"),
      ).map(({ textContent }) => textContent);

    const playAsThunderpaws = async (chipLabel: string) => {
      await waitForText("Who's playing?");
      findButton("Thunderpaws").click();
      await waitForText("Hello, Thunderpaws!");
      await tapPictures(thunderpawsPicturePassword);
      findButton("Let's play").click();
      await openRegion(chipLabel);
    };

    const tapRegionOn = async (islandId: string, chipLabel: string) => {
      readShownWorldMap().onIslandInView(islandId);
      await vi.waitFor(
        () => {
          findButton(chipLabel);
        },
        { timeout: slowestPageChangeMs },
      );
      findButton(chipLabel).click();
      await waitForText(missionChoice);
    };

    it("shows a padlock and asks for a grown-up on an Island a Parent has locked, and opens no Game there", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          sparkle,
          {
            ...thunderpaws,
            limits: { ...noLimits, lockedIslandIds: ["sunscorch-sands"] },
          },
        ]),
      );
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");

      await tapRegionOn("sunscorch-sands", "Oasis Pools, Maths, locked");

      expect(readText(".region-panel h2")).toBe("Oasis Pools");
      expect(readText(".region-locked")).toBe(
        "Ask a grown-up to open this Island",
      );
      expect(document.querySelector(".region-panel .mission-card")).toBeNull();
      expect(
        document.querySelector(".region-panel .region-locked svg"),
      ).not.toBeNull();
    });

    it("lets a Year 2 Child play Island 3 once a Parent has opened it and the device has synced", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          sparkle,
          {
            ...thunderpaws,
            limits: { ...noLimits, unlockedIslandIds: ["sunscorch-sands"] },
          },
        ]),
      );
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");

      await tapRegionOn("sunscorch-sands", "Oasis Pools, Maths");

      expect(getPageText()).toContain("The 3, 4 and 8 times tables");
      findButtonTitled("Times table bubbles").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
    });

    it("hides a Region's Games on one Island only when a Parent turns it off, and a Subject turned off everywhere on every Island", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          sparkle,
          {
            ...thunderpaws,
            limits: {
              ...noLimits,
              turnedOffRegionKeys: [
                "meadow-isle/bubble-bay",
                "meadow-isle/whispering-woods",
                "frost-isle/snowdrift-library",
              ],
            },
          },
        ]),
      );
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      expect(listRegionPanelCards()).toHaveLength(21);

      findButton("Snowdrift Library, English, locked").click();
      await waitForText("A grown-up has closed this Region for now");
      expect(listRegionPanelCards()).toHaveLength(0);

      await tapRegionOn("meadow-isle", "Bubble Bay, Maths, locked");
      expect(readText(".region-locked")).toBe(
        "A grown-up has closed this Region for now",
      );
      expect(listRegionPanelCards()).toHaveLength(0);
    });

    it("heads Crystal Caves Phonics and offers a Year 1 Child the ten Year 1 Phonics games, without Pop the bubbles", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      await openRegion("Crystal Caves, Phonics");

      expect(readText(".region-subject-name")).toBe("Phonics");
      expect(readText(".region-panel h2")).toBe("Crystal Caves");
      const titles = listRegionPanelCardTitles();
      expect(titles).toContain("Crystal blend");
      expect(titles).toContain("Real or alien?");
      expect(titles).not.toContain("Edge or age");
      expect(titles).not.toContain("Pop the bubbles");
      expect(
        titles.filter((title) => title !== "Listen and pick"),
      ).toHaveLength(10);
      expect(findButton("Crystal Caves, Phonics")).toBeDefined();
    });

    it("offers the ten Year 2 Phonics games in Glacier Grotto on Island 2", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Glacier Grotto, Phonics");

      const titles = listRegionPanelCardTitles();
      expect(titles).toContain("Edge or age");
      expect(titles).toContain("Homophone hunt");
      expect(titles).not.toContain("Crystal blend");
      expect(
        titles.filter((title) => title !== "Listen and pick"),
      ).toHaveLength(10);
    });

    it("plays a Phonics game: asks its question, gives its own hint for a wrong answer, and moves on for a right one", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      await openRegion("Crystal Caves, Phonics");

      findButtonTitled("Crystal blend").click();
      await waitForText("Activity 1 of 3");
      expect(getPageText()).toContain("Which word do the sounds make?");
      const sounds = readText(".mission-ask .visually-hidden").trim();
      const answer = sounds.replaceAll(" ", "");
      const wrongChoice = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button.choice"),
      ).find((choice) => choice.textContent !== answer);
      wrongChoice?.click();
      await waitForText("Not quite. Say each sound slowly");

      findButton(`Pick ${answer}`).click();
      await waitForText("question 2 of 5");
    });

    it("keeps playing offline from a Family stored before Islands, keeping its daily limit and opening each Region's first Game", async () => {
      const limitsStoredBefore = {
        dailyMinutes: 45,
        allowedSubjects: ["maths"],
        unlockedRegionIds: ["crystal-caves"],
      };
      const rewardsStoredBefore = Object.fromEntries(
        Object.entries(sparkle.rewards).filter(
          ([field]) => field !== "regionProgress",
        ),
      );
      localStorage.setItem(
        "wizzaroo.family-device.playable-family",
        JSON.stringify({
          playableChildren: [
            {
              ...sparkle,
              limits: limitsStoredBefore,
              rewards: rewardsStoredBefore,
            },
          ],
          familyChestActivityCount: 0,
        }),
      );
      startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      expect(
        readShownWorldMap().regions.every(({ isUnlocked }) => isUnlocked),
      ).toBe(true);
      expect(
        listRegionPanelCards().filter(({ disabled }) => !disabled),
      ).toHaveLength(10);
    });

    it("keeps playing offline from a Family stored before the Year Group was sent, showing no Year until it syncs", async () => {
      const sparkleStoredBefore = Object.fromEntries(
        Object.entries(sparkle).filter(([field]) => field !== "yearGroup"),
      );
      localStorage.setItem(
        "wizzaroo.family-device.playable-family",
        JSON.stringify({
          playableChildren: [sparkleStoredBefore],
          familyChestActivityCount: 0,
        }),
      );
      startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      expect(document.querySelector(".year-badge")).toBeNull();
    });

    it("shows on the World Map which school Year the Child is in", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      expect(document.querySelector(".year-badge")?.textContent).toBe("Year 1");
    });

    it("fills the screen with shooting stars when the Child taps their Stars", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      expect(document.querySelector(".star-fireworks")).toBeNull();

      document.querySelector<HTMLButtonElement>("button.star-balance")?.click();

      await vi.waitFor(() => {
        expect(
          document.body.querySelector(":scope > canvas.star-fireworks"),
        ).not.toBeNull();
      });
    });

    it("opens the Family Chest to show the gold inside and what it is worth", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws], 12));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Open the Family Chest").click();
      await waitForText("Worth 12 gold coins");
      expect(
        document
          .querySelector('[role="img"][aria-label^="The Family Chest opens"]')
          ?.getAttribute("aria-label"),
      ).toBe("The Family Chest opens and 12 gold coins spill out");
      expect(
        document
          .querySelector("progress.family-chest-meter")
          ?.getAttribute("value"),
      ).toBe("12");

      findButton("Close the Family Chest").click();
      await vi.waitFor(() => {
        expect(getPageText()).not.toContain("Worth 12 gold coins");
      });
    });

    it("shows a Region's story and Missions when a Child taps its island on the 3D map, and moves the camera with the zoom buttons", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, {
            practiceDays: ["s", "a", "t", "p", "i"].flatMap((sound) =>
              masteredLongAgo(`phonics.sound-${sound}`),
            ),
          }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      expect(readShownWorldMap()).toMatchObject({
        islandInViewId: "meadow-isle",
        selectedRegionId: undefined,
        cameraCommand: { kind: "none" },
      });

      readShownWorldMap().onRegionChosen("bubble-bay");
      await waitForText("The bubble machine is jammed!");
      expect(findButton("Bubble Bay, Maths").getAttribute("aria-pressed")).toBe(
        "true",
      );
      findButton("Zoom in").click();
      await vi.waitFor(() => {
        expect(readShownWorldMap().cameraCommand).toEqual({
          kind: "zoom-in",
          sequence: 1,
        });
      });
      findButton("Zoom out").click();
      findButton("See the whole map").click();

      await vi.waitFor(() => {
        expect(readShownWorldMap().cameraCommand).toEqual({
          kind: "show-everything",
          sequence: 3,
        });
      });
      expect(readShownWorldMap().selectedRegionId).toBe("bubble-bay");

      pickTransport("balloon");
      await chooseFromMenu("Islands", "Frost Isle, Year 2, locked");
      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toStrictEqual({
          fromIslandId: "meadow-isle",
          toIslandId: "frost-isle",
          transport: "balloon",
        });
      });
    });

    it("starts exploring where the Child drags the walker onto the map, even on a locked Island, and asks for an Island when it misses them all", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const walker = findButton(
        "Drag the walker onto the map to start exploring from there",
      );

      walker.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 900,
          clientY: 120,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 600, clientY: 400 }),
      );
      await vi.waitFor(() => {
        expect(document.querySelector(".walker-ghost")).not.toBeNull();
      });
      window.dispatchEvent(
        new PointerEvent("pointerup", { clientX: 500, clientY: 420 }),
      );
      await vi.waitFor(() => {
        expect(readShownWorldMap().walkerDrop).toMatchObject({
          clientX: 500,
          clientY: 420,
          sequence: 1,
        });
      });
      expect(document.querySelector(".walker-ghost")).toBeNull();

      readShownWorldMap().onWalkerDropped("no-such-isle", { x: 0, z: 0 });
      await waitForText("Drop the walker on an Island you can explore.");

      const [frostSign] = findIslandAdventure("frost-isle").signs;
      readShownWorldMap().onWalkerDropped("frost-isle", frostSign.position);
      await vi.waitFor(
        () => {
          expect(readShownExplore().island.id).toBe("frost-isle");
        },
        { timeout: slowestPageChangeMs },
      );
      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Explore Frost Isle");
      });

      const [sign] = findIslandAdventure("meadow-isle").signs;
      readShownWorldMap().onWalkerDropped("meadow-isle", sign.position);
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      expect(readShownExplore().start).toStrictEqual({
        x: sign.position.x * 6,
        z: sign.position.z * 6,
      });
      expect(readShownWorldMap().walkerDrop).toBeUndefined();

      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Explore Meadow Isle");
      });
      expect(document.querySelector(".island-explore")).toBeNull();
    });

    it("minimises and maximises each group of buttons on the map: map buttons and Regions", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const isShown = (label: string) =>
        document.querySelector(`button[aria-label="${label}"]`) !== null;
      const groups = [
        ["map buttons", "Zoom in"],
        ["Region buttons", "Bubble Bay, Maths"],
      ];

      for (const [group, member] of groups) {
        expect(isShown(member)).toBe(true);
        findButton(`Minimise the ${group}`).click();
        await vi.waitFor(() => {
          expect(isShown(member)).toBe(false);
        });
        expect(
          findButton(`Maximise the ${group}`).getAttribute("aria-expanded"),
        ).toBe("false");
        findButton(`Maximise the ${group}`).click();
        await vi.waitFor(() => {
          expect(isShown(member)).toBe(true);
        });
      }
    });

    it("keeps the groups of buttons minimised on the map in this browser, so the map opens with them minimised next time", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      findButton("Minimise the Region buttons").click();
      await vi.waitFor(() => {
        findButton("Maximise the Region buttons");
      });
      expect(
        JSON.parse(localStorage.getItem("wizzaroo.minimised-groups") ?? "[]"),
      ).toStrictEqual(["regions"]);

      findButton("Minimise the map buttons").click();
      await vi.waitFor(() => {
        findButton("Maximise the map buttons");
      });
      findButton("Maximise the Region buttons").click();
      await vi.waitFor(() => {
        findButton("Minimise the Region buttons");
      });
      expect(
        JSON.parse(localStorage.getItem("wizzaroo.minimised-groups") ?? "[]"),
      ).toStrictEqual(["map"]);
    });

    it("opens the map with the groups of buttons minimised last time still minimised", async () => {
      localStorage.setItem(
        "wizzaroo.minimised-groups",
        JSON.stringify(["regions", "not-a-group"]),
      );
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await waitForText("Who's playing?");
      await openSparkle();
      await tapPictures(sparklePicturePassword);
      findButton("Let's play").click();
      await vi.waitFor(
        () => {
          findButton("Maximise the Region buttons");
        },
        { timeout: slowestPageChangeMs },
      );
      findButton("Minimise the map buttons");
      expect(
        document.querySelector('button[aria-label="Bubble Bay, Maths"]'),
      ).toBeNull();
    });

    it("keeps the Year and weather buttons off the map, and Finish playing in the Menu at the far right of the top bar", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      expect(document.querySelector(".island-guide")).toBeNull();
      expect(document.querySelector(".map-weather")).toBeNull();
      expect(document.querySelector("button.finish-playing")).toBeNull();
      expect(document.querySelector(".play-nav > :last-child")?.className).toBe(
        "play-menu",
      );

      findButton("Menu").click();
      await vi.waitFor(() => {
        expect(listMenuItemNames()).toStrictEqual([
          "Subject",
          "Islands",
          "Weather",
          "View",
          "Settings",
          "Finish playing",
        ]);
      });
      findMenuItem("Finish playing").click();

      await waitForText("Who's playing?");
    });

    it("lists each Region with its Subject from the Menu, and opens the Region chosen", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      await openMenuPanel("Subject");
      expect(
        document.querySelector(".play-side-panel-list button")?.textContent,
      ).toBe("Bubble BayMaths");

      document
        .querySelector<HTMLButtonElement>(".play-side-panel-list button")
        ?.click();

      await waitForText(missionChoice);
      expect(readShownWorldMap().selectedRegionId).toBe("bubble-bay");
      expect(document.querySelector(".play-side-panel")).toBeNull();
    });

    it("lists each Island with its Year from the Menu, and travels to the Island chosen, even one above the Child's Year", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      await openMenuPanel("Islands");
      expect(
        findButton("Meadow Isle, Year 1, your Island").getAttribute(
          "aria-pressed",
        ),
      ).toBe("true");
      expect(
        findButton("Meadow Isle, Year 1, your Island").textContent,
      ).toContain("Year 1");

      pickTransport("ship");
      findButton("Frost Isle, Year 2, locked").click();

      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toStrictEqual({
          fromIslandId: "meadow-isle",
          toIslandId: "frost-isle",
          transport: "ship",
        });
      });
      expect(document.querySelector(".play-side-panel")).toBeNull();
    });

    it("changes the Island's weather from the Menu's Weather panel, showing each icon and name and which is chosen", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      expect(readShownWorldMap().isWeatherChosen).toBe(false);

      await openMenuPanel("Weather");
      expect(
        document.querySelectorAll(".play-side-panel-list button svg"),
      ).toHaveLength(7);
      findButton("Snow").click();
      await vi.waitFor(() => {
        expect(readShownWorldMap().weather).toBe("snow");
      });
      expect(readShownWorldMap().isWeatherChosen).toBe(true);
      expect(findButton("Snow").getAttribute("aria-pressed")).toBe("true");
      expect(findButton("Sunny").getAttribute("aria-pressed")).toBe("false");

      findButton("Thunderstorm").click();
      await vi.waitFor(() => {
        expect(readShownWorldMap().weather).toBe("storm");
      });
      expect(findButton("Snow").getAttribute("aria-pressed")).toBe("false");

      findButton("Close Weather").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".play-side-panel")).toBeNull();
      });
    });

    it("keeps the Awards button, and the Menu with Finish playing in it, on the Wardrobe and the Room instead of a Finish playing button", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      for (const [tab, heading] of [
        ["Wardrobe", "Sparkle's wardrobe"],
        ["Room", "Furnish your Room"],
      ] as const) {
        findButton(tab).click();
        await waitForText(heading);
        expect(document.querySelector("button.finish-playing")).toBeNull();
        expect(
          document.querySelector(".play-nav-stats button.awards-button"),
        ).not.toBeNull();
        expect(
          document.querySelector(".play-nav > :last-child")?.className,
        ).toBe("play-menu");
        findButton("Menu").click();
        await vi.waitFor(() => {
          expect(listMenuItemNames()).toStrictEqual([
            "World Map",
            "Settings",
            "Finish playing",
          ]);
        });
        findMenuItem("World Map").click();
        await vi.waitFor(() => {
          expect(document.querySelector(".world-map")).not.toBeNull();
        });
      }

      findButton("Room").click();
      await waitForText("Furnish your Room");
      findButton("Menu").click();
      await vi.waitFor(() => {
        findMenuItem("Finish playing");
      });
      findMenuItem("Finish playing").click();
      await waitForText("Who's playing?");
    });

    it("goes to the Map, Explore, Wardrobe and Room from the Menu's View panel, with the Menu on the Wardrobe", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      await openMenuPanel("View");
      expect(
        Array.from(
          document.querySelectorAll(".play-side-panel-name"),
          ({ textContent }) => textContent,
        ),
      ).toStrictEqual(["Map", "Explore", "Wardrobe", "Room"]);
      findButtonTitled("Explore").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      expect(document.querySelector("button.finish-playing")).toBeNull();

      findButton("Back to the map").click();
      await chooseFromMenu("View", "Wardrobe");
      await waitForText("Sparkle's wardrobe");
      expect(document.querySelector("button.finish-playing")).toBeNull();
      expect(document.querySelector(".play-menu")).not.toBeNull();

      findButton("World Map").click();
      await chooseFromMenu("View", "Room");
      await vi.waitFor(() => {
        expect(document.title).toContain("Sparkle's Room");
      });
    });

    const pressKey = (target: Element | null, key: string) => {
      target?.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    };

    it("opens the Menu as a WAI-ARIA menu button, naming each item and describing it with a hint", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const toggle = findButton("Menu");
      expect(toggle.getAttribute("aria-haspopup")).toBe("menu");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");

      toggle.click();

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(findMenuItem("Subject"));
      });
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      const menu = document.querySelector('[role="menu"]');
      expect(toggle.getAttribute("aria-controls")).toBe(menu?.id);
      expect(
        Array.from(document.querySelectorAll('[role="menuitem"]'), (item) =>
          item.getAttribute("tabindex"),
        ).every((tabIndex) => tabIndex === "-1"),
      ).toBe(true);
      expect(
        document.getElementById(
          findMenuItem("Islands").getAttribute("aria-describedby") ?? "",
        )?.textContent,
      ).toBe("Every Island and its Year");
      expect(findMenuItem("Islands").getAttribute("aria-expanded")).toBe(
        "false",
      );
      expect(findMenuItem("Settings").hasAttribute("aria-expanded")).toBe(
        false,
      );
      expect(
        document.querySelectorAll('[role="menu"] > [role="separator"]'),
      ).toHaveLength(2);
    });

    it("moves through the Menu with the arrow keys, Home, End and a typed letter, and closes it onto its button with Escape", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const toggle = findButton("Menu");
      toggle.focus();

      pressKey(toggle, "ArrowUp");
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(findMenuItem("Finish playing"));
      });
      pressKey(document.activeElement, "ArrowDown");
      expect(document.activeElement).toBe(findMenuItem("Subject"));
      pressKey(document.activeElement, "ArrowUp");
      expect(document.activeElement).toBe(findMenuItem("Finish playing"));
      pressKey(document.activeElement, "Home");
      expect(document.activeElement).toBe(findMenuItem("Subject"));
      pressKey(document.activeElement, "End");
      expect(document.activeElement).toBe(findMenuItem("Finish playing"));
      pressKey(document.activeElement, "w");
      expect(document.activeElement).toBe(findMenuItem("Weather"));
      pressKey(document.activeElement, "s");
      expect(document.activeElement).toBe(findMenuItem("Settings"));
      pressKey(document.activeElement, "s");
      expect(document.activeElement).toBe(findMenuItem("Subject"));

      pressKey(document.activeElement, "Escape");

      await vi.waitFor(() => {
        expect(document.querySelector('[role="menu"]')).toBeNull();
      });
      expect(document.activeElement).toBe(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

    it("moves focus into a side panel opened from the Menu, onto its chosen item, and back to the Menu button when it closes", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      await openMenuPanel("Islands");

      await vi.waitFor(() => {
        expect(document.activeElement).toBe(
          findButton("Meadow Isle, Year 1, your Island"),
        );
      });
      const panel = document.querySelector(".play-side-panel");
      expect(
        document.getElementById(panel?.getAttribute("aria-labelledby") ?? "")
          ?.textContent,
      ).toBe("Islands");

      findButton("Menu").click();
      await vi.waitFor(() => {
        findMenuItem("Islands");
      });
      expect(findMenuItem("Islands").getAttribute("aria-expanded")).toBe(
        "true",
      );
      expect(findMenuItem("Islands").getAttribute("aria-controls")).toBe(
        panel?.id,
      );
      pressKey(document.activeElement, "Escape");
      await vi.waitFor(() => {
        expect(document.querySelector('[role="menu"]')).toBeNull();
      });
      expect(document.querySelector(".play-side-panel")).not.toBeNull();

      pressKey(document.body, "Escape");

      await vi.waitFor(() => {
        expect(document.querySelector(".play-side-panel")).toBeNull();
      });
      expect(document.activeElement).toBe(findButton("Menu"));
    });

    it("shows each Island's Year, and its Subject for each Region, as their own text beside the name", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      await openMenuPanel("Islands");
      const readRows = () =>
        Array.from(
          document.querySelectorAll(".play-side-panel-list button"),
          (row) => [
            row.querySelector(".play-side-panel-name")?.textContent,
            row.querySelector(".play-side-panel-detail")?.textContent,
          ],
        );
      expect(readRows()[0]).toStrictEqual(["Meadow Isle", "Your IslandYear 1"]);
      expect(readRows()[1]).toStrictEqual(["Frost Isle", "Year 2"]);

      await openMenuPanel("Subject");
      expect(readRows()[0]).toStrictEqual(["Bubble Bay", "Maths"]);
    });

    it("opens the Settings page from the Menu while playing, and goes back to the World Map", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      findButton("Menu").click();
      await vi.waitFor(() => {
        findMenuItem("Settings");
      });
      findMenuItem("Settings").click();

      await waitForText("Choose how Wizzaroo looks");
      expect(document.querySelector("button.finish-playing")).not.toBeNull();
      findButton("World Map").click();
      await vi.waitFor(() => {
        findButton("Menu");
      });
    });

    const readShownExplore = (): IslandExploreSceneProps => {
      if (shownExplore === undefined) {
        throw new Error("the page showed no Island to explore");
      }
      return shownExplore;
    };

    const exploreMeadowIsle = async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      findButton("Explore Meadow Isle").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
    };

    const readTreasureCount = () =>
      document
        .querySelector(".explore-treasure-count")
        ?.getAttribute("aria-label");

    it("hides every Explore button, the walker and the Menu's Explore when a Parent has locked exploring", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          { ...sparkle, limits: buildChildLimits({ isExploringLocked: true }) },
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      const tabs = Array.from(
        document.querySelectorAll(".play-nav-tabs button"),
      ).map((tab) => tab.getAttribute("aria-label"));
      expect(tabs).toEqual(["World Map", "Wardrobe", "Room"]);
      expect(document.querySelector("button.explore-island")).toBeNull();
      expect(document.querySelector("button.drop-walker")).toBeNull();
      expect(getPageText()).not.toContain("Explore Meadow Isle");
      await openMenuPanel("View");
      expect(
        Array.from(
          document.querySelectorAll(".play-side-panel-name"),
          ({ textContent }) => textContent,
        ),
      ).toStrictEqual(["Map", "Wardrobe", "Room"]);

      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      expect(
        Array.from(document.querySelectorAll(".play-nav-tabs button")).map(
          (tab) => tab.getAttribute("aria-label"),
        ),
      ).toEqual(["World Map", "Wardrobe", "Room"]);
    });

    describe("For parents", () => {
      const findDialogText = () =>
        document.querySelector("dialog[open]")?.textContent ?? "";

      it("opens what a Game practises in the National Curriculum from the small button on its card", async () => {
        startFakeServer(answerWithPlayableChildren([sparkle]));
        openPage(renderMission());
        await playAsSparkleOnTheWorldMap();

        findButton("For parents: what Pop the bubbles practises").click();

        await vi.waitFor(() => {
          expect(findDialogText()).toContain("For parents: Pop the bubbles");
        });
        expect(findDialogText()).toContain(
          "Mathematics programmes of study: key stages 1 and 2",
        );
        expect(findDialogText()).toContain("Key Stage 1");
        expect(findDialogText()).toContain("Year 1 programme of study");
        expect(findDialogText()).toContain("Number: addition and subtraction");
        expect(findDialogText()).toContain("Number bonds to 10");
        expect(findDialogText()).not.toContain("The Game is paused");
        const nationalCurriculum = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("dialog[open] a"),
        ).find(({ textContent }) => textContent === "View National Curriculum");
        expect(nationalCurriculum?.href).toBe(
          "https://www.gov.uk/government/collections/national-curriculum",
        );
        expect(nationalCurriculum?.target).toBe("_blank");
        expect(getPageText()).not.toContain("Activity 1 of 3");
      });

      it("pauses a Game for a Parent and carries on where it was once closed", async () => {
        startFakeServer(answerWithPlayableChildren([sparkle]));
        openPage(renderMission());
        await playAsSparkleOnTheWorldMap();
        findButtonTitled("Pop the bubbles").click();
        await waitForText("Activity 1 of 3, question 1 of 5");
        const numberSentence = readText(".number-sentence");

        findButton("For parents").click();

        await vi.waitFor(() => {
          expect(findDialogText()).toContain(
            "The Game is paused. Close this to carry on playing.",
          );
        });
        expect(findDialogText()).toContain("Number: addition and subtraction");
        findButton("Close and carry on playing").click();
        await vi.waitFor(() => {
          expect(document.querySelector("dialog[open]")).toBeNull();
        });
        expect(getPageText()).toContain("Activity 1 of 3, question 1 of 5");
        expect(readText(".number-sentence")).toBe(numberSentence);
      });

      it("shows For parents only while a Game is being played", async () => {
        startFakeServer(answerWithPlayableChildren([sparkle]));
        openPage(renderMission());
        await playAsSparkleOnTheWorldMap();

        expect(document.querySelector("button.for-parents-button")).toBeNull();
        findButtonTitled("Pop the bubbles").click();
        await waitForText("Activity 1 of 3");
        expect(
          document.querySelector("button.for-parents-button"),
        ).toBeInstanceOf(HTMLButtonElement);
      });
    });

    describe("Games first", () => {
      const oneMinuteOfGamesFirst = buildChildLimits({ gamesFirstMinutes: 1 });

      const findTabLabels = () =>
        Array.from(document.querySelectorAll(".play-nav-tabs button")).map(
          (tab) => tab.getAttribute("aria-label"),
        );

      it("locks the Wardrobe, Room and Explore until a Child has played a Parent's minutes of Games, counting only time in a Game", async () => {
        startFakeServer(
          answerWithPlayableChildren([
            { ...sparkle, limits: oneMinuteOfGamesFirst },
          ]),
        );
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
        openPage(renderMission());
        await playAsSparkle(everyRegionsName);

        expect(findTabLabels()).toEqual([
          "World Map",
          "Explore, locked: play 1 more minute of Games to open it",
          "Wardrobe, locked: play 1 more minute of Games to open it",
          "Room, locked: play 1 more minute of Games to open it",
        ]);
        findButton(
          "Wardrobe, locked: play 1 more minute of Games to open it",
        ).click();
        await waitForText("Games first!");
        expect(getPageText()).toContain(
          "Play 1 more minute of Games to open the Wardrobe, the Room and Explore.",
        );
        expect(getPageText()).not.toContain("Sparkle's wardrobe");
        findButton("Close").click();
        await vi.advanceTimersByTimeAsync(90_000);
        expect(findTabLabels()).toContain(
          "Room, locked: play 1 more minute of Games to open it",
        );

        await openRegion();
        findButtonTitled("Pop the bubbles").click();
        await waitForText("Activity 1 of 3");
        await vi.advanceTimersByTimeAsync(61_000);
        findButton("Back to the map").click();

        await vi.waitFor(() => {
          expect(findTabLabels()).toEqual([
            "World Map",
            "Explore",
            "Wardrobe",
            "Room",
          ]);
        });
        findButton("Wardrobe").click();
        await waitForText("Sparkle's wardrobe");
      });

      it("counts no Game time while For parents has the Game paused", async () => {
        startFakeServer(
          answerWithPlayableChildren([
            { ...sparkle, limits: oneMinuteOfGamesFirst },
          ]),
        );
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
        openPage(renderMission());
        await playAsSparkleOnTheWorldMap();
        findButtonTitled("Pop the bubbles").click();
        await waitForText("Activity 1 of 3");

        findButton("For parents").click();
        await waitForText("The Game is paused");
        await vi.advanceTimersByTimeAsync(120_000);
        findButton("Close and carry on playing").click();
        findButton("Back to the map").click();

        await vi.waitFor(() => {
          expect(findTabLabels()).toContain(
            "Room, locked: play 1 more minute of Games to open it",
          );
        });
      });

      it("opens everything from the start with no Games first set, or once today's minutes were played earlier on the device", async () => {
        localStorage.setItem(
          "wizzaroo.family-device.game-time",
          JSON.stringify({
            [sparkle.id]: {
              localDate: getLocalDate(new Date()),
              seconds: 60,
            },
          }),
        );
        startFakeServer(
          answerWithPlayableChildren([
            { ...sparkle, limits: oneMinuteOfGamesFirst },
          ]),
        );
        openPage(renderMission());
        await playAsSparkle(everyRegionsName);

        expect(findTabLabels()).toEqual([
          "World Map",
          "Explore",
          "Wardrobe",
          "Room",
        ]);
      });
    });

    it("says what explore mode is getting ready, in its help and over the Island once Let's go! is pressed early", async () => {
      await exploreMeadowIsle();
      const findProgress = () =>
        document.querySelector<HTMLElement>(".explore-getting-ready");

      readShownExplore().onLoadingChanged?.({
        step: "Making the things near you solid: 12 of 48",
        share: 0.475,
      });
      await vi.waitFor(() => {
        expect(findProgress()?.closest(".explore-help")).toBeInstanceOf(
          HTMLElement,
        );
      });
      expect(findProgress()?.querySelector(".busy-label")?.textContent).toBe(
        "Getting Meadow Isle ready…",
      );
      expect(findProgress()?.querySelector(".busy-detail")?.textContent).toBe(
        "Making the things near you solid: 12 of 48",
      );
      expect(
        findProgress()
          ?.querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow"),
      ).toBe("48");

      findButton("Let's go!").click();
      await vi.waitFor(() => {
        expect(findProgress()?.closest(".explore-loading")).toBeInstanceOf(
          HTMLElement,
        );
      });
      expect(document.querySelector(".explore-help")).toBeNull();

      readShownExplore().onLoadingChanged?.(undefined);
      await vi.waitFor(() => {
        expect(findProgress()).toBeNull();
      });
    });

    it("leaves an Island a Parent has locked for exploring out of every way to explore it", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          {
            ...sparkle,
            limits: buildChildLimits({
              exploreLockedIslandIds: ["meadow-isle", "sunscorch-sands"],
            }),
          },
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      expect(document.querySelector("button.explore-island")).toBeNull();
      expect(getPageText()).not.toContain("Explore Meadow Isle");
      await openMenuPanel("View");
      expect(
        Array.from(
          document.querySelectorAll(".play-side-panel-name"),
          ({ textContent }) => textContent,
        ),
      ).toStrictEqual(["Map", "Wardrobe", "Room"]);

      findButton("Explore").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      expect(readShownExplore().island.id).toBe("frost-isle");
      expect(
        Array.from(
          document.querySelectorAll(".explore-islands .island-chip"),
          (chip) => chip.textContent,
        ),
      ).toStrictEqual(["Y2", "Y4", "Y5", "Y6"]);
    });

    it("hides Explore everywhere when a Parent has locked every Island for exploring", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          {
            ...sparkle,
            limits: buildChildLimits({
              exploreLockedIslandIds: [
                "meadow-isle",
                "frost-isle",
                "sunscorch-sands",
                "jungle-reach",
                "ember-isle",
                "starfall-isle",
              ],
            }),
          },
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      expect(
        Array.from(document.querySelectorAll(".play-nav-tabs button")).map(
          (tab) => tab.getAttribute("aria-label"),
        ),
      ).toEqual(["World Map", "Wardrobe", "Room"]);
      expect(document.querySelector("button.drop-walker")).toBeNull();
    });

    it("starts exploring from the Explore tab, between Map and Wardrobe, on the World Map and from the wardrobe", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const tabs = Array.from(
        document.querySelectorAll(".play-nav-tabs button"),
      ).map((tab) => tab.getAttribute("aria-label"));
      expect(tabs).toEqual(["World Map", "Explore", "Wardrobe", "Room"]);

      findButton("Explore").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      expect(readShownExplore().island.id).toBe("meadow-isle");
      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Wardrobe");
      });

      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Explore").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      expect(readText(".explore-title")).toBe("Meadow Isle");
    });

    it("shows every Island's Award beside the Stars, turning in 3D, with those still to be won dulled", async () => {
      const meadowQuest = findIslandQuest("meadow-isle");
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, {
            questProgress: [
              {
                islandId: "meadow-isle",
                pickedUpFindIds: [],
                solvedPuzzleIds: meadowQuest?.puzzles.map(({ id }) => id) ?? [],
              },
            ],
          }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      const stats = document.querySelector(".play-nav-stats");
      expect(
        Array.from(stats?.querySelectorAll(":scope > button") ?? []).map(
          (stat) => stat.className,
        ),
      ).toEqual(["star-balance", "awards-button", "family-chest"]);

      findButton("Awards, 1 won").click();
      await waitForText("You have won 1 of 6 Awards.");
      const awards = Array.from(document.querySelectorAll("li.award"));
      expect(awards.map((award) => award.className)).toEqual([
        "award won",
        "award not-won",
        "award not-won",
        "award not-won",
        "award not-won",
        "award not-won",
      ]);
      expect(awards[0].textContent).toContain("Meadow Fair Hero");
      expect(awards[0].textContent).toContain("Meadow Isle");
      expect(awards[0].textContent).toContain("Won!");
      expect(awards[1].textContent).toContain("Northern Lights Hero");
      expect(awards[1].textContent).toContain("Finish the Quest on Frost Isle");
      expect(
        document
          .querySelector('li.award.not-won [role="img"]')
          ?.getAttribute("aria-label"),
      ).toBe("The Northern Lights Hero Award, not won yet");
      expect(document.querySelectorAll("li.award canvas")).toHaveLength(6);

      findButton("Close your Awards").click();
      await vi.waitFor(() => {
        expect(document.querySelector("li.award")).toBeNull();
      });
    });

    it("lets a Child explore their own Island on foot as their Character, and go back to the World Map", async () => {
      await exploreMeadowIsle();

      expect(readShownExplore().island.id).toBe("meadow-isle");
      expect(readShownExplore().loadout).toBeDefined();
      expect(readText(".explore-title")).toBe("Meadow Isle");
      expect(readTreasureCount()).toBe("Golden Acorns found: 0 of 104");
      expect(
        Array.from(document.querySelectorAll(".explore-bar [data-tip]")).map(
          (control) => control.getAttribute("data-tip"),
        ),
      ).toEqual(
        expect.arrayContaining([
          "Back to the World Map",
          "Golden Acorns found: 0 of 104",
          "Quest puzzles solved: 0 of 30",
          "Your rucksack: 0 things inside",
          "Your Vehicles: put one on the map to ride",
          "You are on Meadow Isle",
          "Travel to Frost Isle, Year 2",
        ]),
      );
      expect(getPageText()).toContain("Click the ground to walk there");
      expect(
        document.querySelector(".explore-help > .explore-help-body > ul"),
      ).not.toBeNull();
      findButton("Let's go!").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".explore-help")).toBeNull();
      });

      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Explore Meadow Isle");
      });
      expect(document.querySelector(".island-explore")).toBeNull();
    });

    it("offers exploring on an Island that is still locked", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      findButton("Explore Meadow Isle");

      readShownWorldMap().onIslandInView("frost-isle");

      await vi.waitFor(() => {
        findButton("Explore Frost Isle");
      });
    });

    it("puts a Vehicle the Child owns on the map, rides it, and gets on and off the train at Stations", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { heldItemIds: ["vehicle-bicycle"] }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      findButton("Explore Meadow Isle").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );

      findButton("Vehicles").click();
      await waitForText("Your vehicles");
      const garageCards = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button.garage-vehicle"),
      );
      expect(garageCards).toHaveLength(
        catalogue.filter(({ slot }) => slot === "vehicle").length,
      );
      expect(
        garageCards
          .filter(({ disabled }) => !disabled)
          .map((card) => card.getAttribute("aria-label")),
      ).toStrictEqual(["Put on the map: Red Bicycle"]);
      expect(findButton("Sports Car, not bought yet").disabled).toBe(true);
      expect(
        document.querySelectorAll("button.garage-vehicle.not-owned"),
      ).toHaveLength(garageCards.length - 1);
      findButton("Put on the map: Red Bicycle").click();
      await vi.waitFor(() => {
        expect(readShownExplore().vehicle).toMatchObject({
          itemId: "vehicle-bicycle",
          look: { model: "bicycle" },
          placedCount: 1,
        });
      });
      readShownExplore().onNearVehicleChanged?.(true);
      await vi.waitFor(() => {
        findButton("Ride the Red Bicycle");
      });
      findButton("Ride the Red Bicycle").click();
      await vi.waitFor(() => {
        expect(readShownExplore().ride).toBe("vehicle");
      });
      findButton("Get off the Red Bicycle").click();
      await vi.waitFor(() => {
        expect(readShownExplore().ride).toBeUndefined();
      });

      readShownExplore().onTrainChanged?.({
        kind: "at-station",
        stationIndex: 0,
        isTrainWaiting: false,
        secondsUntilTrain: 20,
      });
      await waitForText("The next train comes in about 20 seconds.");
      expect(findButton("Get on the train").disabled).toBe(true);
      readShownExplore().onTrainChanged?.({
        kind: "at-station",
        stationIndex: 0,
        isTrainWaiting: true,
        secondsUntilTrain: 0,
      });
      await waitForText("The Meadow Steam Express is waiting at the platform");
      findButton("Get on the train").click();
      await vi.waitFor(() => {
        expect(readShownExplore().ride).toBe("train");
      });
      readShownExplore().onTrainChanged?.({
        kind: "riding",
        waitingAtStationIndex: undefined,
        nextStationIndex: 1,
      });
      await waitForText("Next stop: Daisy Junction");
      readShownExplore().onTrainChanged?.({
        kind: "riding",
        waitingAtStationIndex: 1,
        nextStationIndex: undefined,
      });
      await vi.waitFor(() => {
        findButton("Get off at Daisy Junction");
      });
      findButton("Get off at Daisy Junction").click();
      await vi.waitFor(() => {
        expect(readShownExplore().ride).toBeUndefined();
      });
    });

    it("walks a Child with the arrow keys and jumps with the space bar", async () => {
      await exploreMeadowIsle();
      const input = readShownExplore().inputRef.current;

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyD" }));
      expect(input).toMatchObject({ forward: 1, right: 1 });
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyD" }));
      expect(input).toMatchObject({ forward: 0, right: 0 });

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
      expect(input.wantsJump).toBe(true);
      input.wantsJump = false;
      findButton("Jump").click();
      expect(input.wantsJump).toBe(true);
    });

    it("opens a Region's Games when the Child walks up to it and goes in", async () => {
      await exploreMeadowIsle();

      readShownExplore().onNearbyChanged([
        {
          kind: "region",
          id: "bubble-bay",
          name: "Bubble Bay",
          position: { x: -14, z: 9 },
        },
      ]);
      await vi.waitFor(() => {
        findButton("Go into Bubble Bay");
      });
      findButton("Go into Bubble Bay").click();

      await waitForText("The bubble machine is jammed!");
      expect(readText(".region-panel h2")).toBe("Bubble Bay");
      expect(document.querySelector(".island-explore")).not.toBeNull();
    });

    const exploreMeadowIsleAs = async (child: PlayableChild) => {
      const server = startFakeServer(answerWithPlayableChildren([child]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      findButton("Explore Meadow Isle").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
      return server;
    };

    const readQuestProgress = () =>
      document
        .querySelector(".explore-bar .explore-quest-progress")
        ?.getAttribute("aria-label");

    it("picks up a Find into the rucksack and uses it to solve a Quest Puzzle, recording both", async () => {
      const { findUploadedPlayEvents } = await exploreMeadowIsleAs(sparkle);
      expect(readQuestProgress()).toBe("Quest puzzles solved: 0 of 30");

      readShownExplore().onQuestFindReached?.("meadow-isle.rusty-key");
      await waitForText("You picked up the Rusty Key! It's in your rucksack.");
      expect(findButton("Rucksack, 1 things inside")).toBeDefined();

      readShownExplore().onNearbyChanged([
        {
          kind: "quest-thing",
          id: "meadow-isle.garden-shed",
          name: "Garden Shed",
          position: { x: 0, z: 0 },
        },
      ]);
      await vi.waitFor(() => {
        findButton("Look at the Garden Shed");
      });
      findButton("Look at the Garden Shed").click();
      await waitForText("The shed door is locked tight.");
      findButton("Use something").click();
      await vi.waitFor(() => {
        findButton("Use the Rusty Key on the Garden Shed");
      });
      findButton("Use the Rusty Key on the Garden Shed").click();

      await waitForText("The Police Whistle is in your rucksack.");
      expect(readQuestProgress()).toBe("Quest puzzles solved: 1 of 30");
      await vi.waitFor(() => {
        expect(
          findUploadedPlayEvents(sparkle.id)
            .filter(({ type }) => type.startsWith("quest-"))
            .map(({ type, payload }) => ({
              type,
              islandId: "islandId" in payload ? payload.islandId : undefined,
              named:
                "findId" in payload
                  ? payload.findId
                  : "puzzleId" in payload
                    ? payload.puzzleId
                    : undefined,
            })),
        ).toEqual([
          {
            type: "quest-find-picked-up",
            islandId: "meadow-isle",
            named: "meadow-isle.rusty-key",
          },
          {
            type: "quest-puzzle-solved",
            islandId: "meadow-isle",
            named: "meadow-isle.open-the-shed",
          },
        ]);
      });

      findButton("Rucksack, 1 things inside").click();
      await waitForText("The Great Meadow Fair");
      expect(findButton("Police Whistle: In your rucksack")).toBeDefined();
      expect(findButton("Rusty Key: Used")).toBeDefined();
    });

    it("carries on the Quest from where the server says the Child got to, and asks a question to finish a line", async () => {
      await exploreMeadowIsleAs({
        ...sparkle,
        rewards: {
          ...sparkle.rewards,
          questProgress: [
            {
              islandId: "meadow-isle",
              pickedUpFindIds: ["meadow-isle.rusty-key"],
              solvedPuzzleIds: [
                "meadow-isle.open-the-shed",
                "meadow-isle.whistle-for-officer-patel",
              ],
            },
          ],
        },
      });
      expect(readQuestProgress()).toBe("Quest puzzles solved: 2 of 30");

      readShownExplore().onInteractionReached({
        kind: "quest-thing",
        id: "meadow-isle.fairground-gate",
        name: "Fairground Gate",
        position: { x: 0, z: 0 },
      });
      await waitForText("GATE OPENS AT 9 O'CLOCK");
      findButton("Use something").click();
      await vi.waitFor(() => {
        findButton("Use the Fair Ticket on the Fairground Gate");
      });
      findButton("Use the Fair Ticket on the Fairground Gate").click();
      await waitForText("Where are the clock's hands at 9 o'clock?");
      await vi.waitFor(() => {
        findButton("Both hands point to 6");
      });
      findButton("Both hands point to 6").click();
      await waitForText("Not quite! Have another think and try again.");
      findButton(
        "The short hand points to 9 and the long hand points to 12",
      ).click();

      await waitForText("Welcome to the fair!");
      expect(readQuestProgress()).toBe("Quest puzzles solved: 3 of 30");
    });

    it("climbs the lighthouse to look over the whole Island, and climbs back down", async () => {
      await exploreMeadowIsle();

      readShownExplore().onInteractionReached({
        kind: "lookout",
        id: "lighthouse",
        name: "the Lighthouse",
        position: { x: 22, z: 8 },
      });

      await waitForText("You climbed to the top of the Lighthouse!");
      expect(readShownExplore().climbedLookoutId).toBe("lighthouse");
      expect(document.querySelector(".explore-joystick")).toBeNull();
      findButton("Climb down").click();
      await vi.waitFor(() => {
        expect(readShownExplore().climbedLookoutId).toBeUndefined();
      });
      expect(document.querySelector(".explore-joystick")).not.toBeNull();
    });

    it("reads a fact from a sign the Child walks up to", async () => {
      await exploreMeadowIsle();

      readShownExplore().onNearbyChanged([
        {
          kind: "sign",
          id: "meadow-lighthouse",
          name: "The Lighthouse",
          position: { x: 19.6, z: 6.6 },
        },
      ]);
      await vi.waitFor(() => {
        findButton("Read the sign: The Lighthouse");
      });
      findButton("Read the sign: The Lighthouse").click();

      await waitForText("ships can see the rocks and stay safe");
      findButton("Close the sign").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".explore-sign")).toBeNull();
      });
    });

    it("opens a hideaway the Child walks up to, and counts each one explored once", async () => {
      await exploreMeadowIsle();
      const readHideawayCount = () =>
        document
          .querySelector(".explore-hideaway-count")
          ?.getAttribute("aria-label");
      expect(readHideawayCount()).toBe("Hideaways explored: 0 of 20");

      const foxHollow: ExploreInteraction = {
        kind: "hideaway",
        id: "fox-hollow",
        name: "Fox Hollow",
        position: { x: 0, z: 0 },
      };
      readShownExplore().onNearbyChanged([foxHollow]);
      await vi.waitFor(() => {
        findButton("Explore Fox Hollow");
      });
      findButton("Explore Fox Hollow").click();

      await waitForText("You found Fox Hollow!");
      expect(getPageText()).toContain("Fresh pawprints lead in and out!");
      expect(readHideawayCount()).toBe("Hideaways explored: 1 of 20");
      findButton("Leave the hideaway").click();
      await vi.waitFor(() => {
        expect(document.querySelector(".explore-sign")).toBeNull();
      });
      readShownExplore().onInteractionReached(foxHollow);
      await waitForText("You found Fox Hollow!");
      expect(readHideawayCount()).toBe("Hideaways explored: 1 of 20");
    });

    it("counts each treasure once, earns no Stars for it, and remembers it after going back to the map", async () => {
      await exploreMeadowIsle();

      readShownExplore().onTreasureFound("acorn-islet");
      await waitForText("You found a Golden Acorn! 1 of 104");
      readShownExplore().onTreasureFound("acorn-islet");
      expect(readTreasureCount()).toBe("Golden Acorns found: 1 of 104");

      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Explore Meadow Isle");
      });
      expect(getStarBalanceText()).toBe("0 Stars");
      findButton("Explore Meadow Isle").click();
      await vi.waitFor(() => {
        expect(readTreasureCount()).toBe("Golden Acorns found: 1 of 104");
      });
      expect(readShownExplore().foundTreasureIds).toStrictEqual([
        "acorn-islet",
      ]);
    });

    it("switches between behind, first person, bird's eye and wide views with the buttons or the V key", async () => {
      await exploreMeadowIsle();
      expect(readShownExplore().cameraView).toBe("behind");

      findButton("First person").click();
      await vi.waitFor(() => {
        expect(readShownExplore().cameraView).toBe("first-person");
      });
      expect(findButton("First person").getAttribute("aria-pressed")).toBe(
        "true",
      );

      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
      await vi.waitFor(() => {
        expect(readShownExplore().cameraView).toBe("birds-eye");
      });
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyV" }));
      await vi.waitFor(() => {
        expect(readShownExplore().cameraView).toBe("behind");
      });
    });

    it("lets the Child drag every pop-up out of the way with the mouse, or move it with the arrow keys", async () => {
      await exploreMeadowIsle();
      const help = document.querySelector<HTMLElement>(".explore-help");
      expect(help?.classList.contains("movable-popup")).toBe(true);

      help?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 100,
          clientY: 100,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 160, clientY: 160 }),
      );
      window.dispatchEvent(new PointerEvent("pointerup", {}));
      await vi.waitFor(() => {
        expect(help?.style.translate).toBe("60px 60px");
      });

      const grip = help?.querySelector<HTMLButtonElement>("button.popup-move");
      grip?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }),
      );
      await vi.waitFor(() => {
        expect(help?.style.translate).toBe("60px 36px");
      });

      readShownExplore().onInteractionReached({
        kind: "dock",
        id: "dock",
        name: "the Dock",
        position: { x: 0, z: 0 },
      });
      await waitForText("The Dock on Meadow Isle");
      expect(
        document
          .querySelector(".explore-sign")
          ?.classList.contains("movable-popup"),
      ).toBe(true);
    });

    it("opens a moved pop-up where the Child left it the next time, kept in this browser", async () => {
      await exploreMeadowIsle();
      const help = document.querySelector<HTMLElement>(".explore-help");
      help
        ?.querySelector<HTMLButtonElement>("button.popup-move")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
        );
      await vi.waitFor(() => {
        expect(help?.style.translate).toBe("0px 24px");
      });
      expect(
        JSON.parse(localStorage.getItem("wizzaroo.popup-positions") ?? "{}"),
      ).toStrictEqual({ "explore-help": { x: 0, y: 24 } });

      findButton("Back to the map").click();
      await vi.waitFor(() => {
        findButton("Explore Meadow Isle");
      });
      findButton("Explore Meadow Isle").click();
      await vi.waitFor(() => {
        expect(
          document.querySelector<HTMLElement>(".explore-help")?.style.translate,
        ).toBe("0px 24px");
      });
    });

    it("tells the Child when they are swimming", async () => {
      await exploreMeadowIsle();

      readShownExplore().onStatusChanged("swimming");

      await waitForText("Splash! You're swimming.");
    });

    it("greets the Child from each friendly animal they walk up to, and counts each one met once", async () => {
      await exploreMeadowIsle();
      const readFriendCount = () =>
        document
          .querySelector(".explore-friend-count")
          ?.getAttribute("aria-label");
      expect(readFriendCount()).toBe("Lambs met: 0 of 12");
      const woolly: ExploreInteraction = {
        kind: "friend",
        id: "lamb-woolly",
        name: "Woolly the Lamb",
        position: { x: 0, z: 0 },
      };

      readShownExplore().onNearbyChanged([woolly]);
      await vi.waitFor(() => {
        findButton("Say hello to Woolly the Lamb");
      });
      findButton("Say hello to Woolly the Lamb").click();
      await waitForText("Farmers shear it off in summer");
      expect(readFriendCount()).toBe("Lambs met: 1 of 12");

      readShownExplore().onInteractionReached(woolly);
      expect(readFriendCount()).toBe("Lambs met: 1 of 12");
    });

    it("tells the Child at the Dock how to sail to another Island", async () => {
      await exploreMeadowIsle();

      readShownExplore().onInteractionReached({
        kind: "dock",
        id: "dock",
        name: "the Dock",
        position: { x: 0, z: 0 },
      });

      await waitForText("The Dock on Meadow Isle");
      expect(getPageText()).toContain(
        "a ship, an aeroplane, a helicopter, a hovercraft, a submarine, a hot-air balloon, a pirate ship, a jetski, a rocket, a dragon, a blimp, a surfboard or a windsurfer will come to take you there, you'll go scuba diving, or a magic portal will open",
      );
    });

    const pickTransport = (transport: Transport) =>
      vi
        .spyOn(Math, "random")
        .mockReturnValueOnce(transports.indexOf(transport) / transports.length);

    it("sails the ship from the Dock in view to another Island's Dock when the Child picks that Island's Year on the World Map, with Fast forward to skip", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      findButton("Close Your World Map").click();

      pickTransport("ship");
      await chooseFromMenu("Islands", "Meadow Isle, Year 1");
      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toStrictEqual({
          fromIslandId: "frost-isle",
          toIslandId: "meadow-isle",
          transport: "ship",
        });
      });
      expect(getPageText()).toContain("The ship is sailing to Meadow Isle");
      expect(
        document
          .querySelector(".map-voyage")
          ?.classList.contains("movable-popup"),
      ).toBe(true);
      expect(document.querySelector("button.explore-island")).toBeNull();

      findButton("Fast forward: go straight to Meadow Isle").click();
      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toBeUndefined();
      });
      expect(readShownWorldMap().islandInViewId).toBe("meadow-isle");
      expect(readShownWorldMap().cameraCommand).toMatchObject({
        kind: "show-island",
        islandId: "meadow-isle",
      });
    });

    it("ends the World Map voyage at the other Island when the ship has docked", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      findButton("Close Your World Map").click();
      await chooseFromMenu("Islands", "Meadow Isle, Year 1");
      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toBeDefined();
      });

      readShownWorldMap().onVoyageEnded();

      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toBeUndefined();
      });
      expect(readShownWorldMap().islandInViewId).toBe("meadow-isle");
      findButton("Explore Meadow Isle");
    });

    const exploreFrostIsle = async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      findButton("Close Your World Map").click();
      await vi.waitFor(() => {
        findButton("Explore Frost Isle");
      });
      findButton("Explore Frost Isle").click();
      await vi.waitFor(
        () => {
          findButton("Back to the map");
        },
        { timeout: slowestPageChangeMs },
      );
    };

    it("sends a ship into the Dock when the Child picks another Island's Year, sails them across and sets them down on its pier", async () => {
      await exploreFrostIsle();
      expect(
        findButton("Frost Isle, Year 2, you are here").getAttribute(
          "aria-pressed",
        ),
      ).toBe("true");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      pickTransport("ship");
      findButton("Travel to Meadow Isle, Year 1").click();
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("calling");
      });
      expect(getPageText()).toContain("Here comes the ship!");
      expect(document.querySelector(".explore-joystick")).toBeNull();
      expect(findButton("Travel to Meadow Isle, Year 1").disabled).toBe(true);

      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.calling * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("boarding");
      });
      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.boarding * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("departing");
      });
      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.departing * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("crossing");
      });
      expect(getPageText()).toContain("Sailing across the sea to Meadow Isle");

      await vi.advanceTimersByTimeAsync(12_000);
      await vi.waitFor(() => {
        expect(readShownExplore().island.id).toBe("meadow-isle");
      });
      expect(readShownExplore().voyage?.phase).toBe("docking");
      expect(readShownExplore().start).toStrictEqual(
        findPierWaitingSpot(findExploreAdventure("meadow-isle").dock),
      );
      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.docking * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("landing");
      });
      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.landing * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("leaving");
      });
      expect(document.querySelector(".explore-joystick")).not.toBeNull();
      await vi.advanceTimersByTimeAsync(voyagePhaseSeconds.leaving * 1000);
      await vi.waitFor(() => {
        expect(readShownExplore().voyage).toBeUndefined();
      });
      expect(readText(".explore-title")).toBe("Meadow Isle");
      vi.useRealTimers();
    });

    it("skips the voyage with Fast forward, going straight to the other Island's pier", async () => {
      await exploreFrostIsle();

      pickTransport("ship");
      findButton("Travel to Meadow Isle, Year 1").click();
      await vi.waitFor(() => {
        findButton("Fast forward: go straight to Meadow Isle");
      });
      findButton("Fast forward: go straight to Meadow Isle").click();

      await vi.waitFor(() => {
        expect(readShownExplore().island.id).toBe("meadow-isle");
      });
      expect(readShownExplore().voyage).toBeUndefined();
      expect(readShownExplore().start).toStrictEqual(
        findPierWaitingSpot(findExploreAdventure("meadow-isle").dock),
      );
      expect(document.querySelector(".explore-joystick")).not.toBeNull();
      expect(document.querySelector(".explore-help")).toBeNull();
    });

    it("skips the rest of the arrival with Fast forward once the ship is sailing in", async () => {
      await exploreFrostIsle();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      pickTransport("ship");
      findButton("Travel to Meadow Isle, Year 1").click();
      const departure: [VoyagePhase, number][] = [
        ["boarding", voyagePhaseSeconds.calling],
        ["departing", voyagePhaseSeconds.boarding],
        ["crossing", voyagePhaseSeconds.departing],
        ["docking", 12],
      ];
      for (const [phase, seconds] of departure) {
        await vi.advanceTimersByTimeAsync(seconds * 1000);
        await vi.waitFor(() => {
          expect(readShownExplore().voyage?.phase).toBe(phase);
        });
      }

      findButton("Fast forward: go straight to Meadow Isle").click();

      await vi.waitFor(() => {
        expect(readShownExplore().voyage?.phase).toBe("leaving");
      });
      expect(document.querySelector(".explore-joystick")).not.toBeNull();
      vi.useRealTimers();
    });

    it("flies an aeroplane between the Runways when the World Map picks one at random", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      findButton("Close Your World Map").click();

      pickTransport("aeroplane");
      await chooseFromMenu("Islands", "Meadow Isle, Year 1");

      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toStrictEqual({
          fromIslandId: "frost-isle",
          toIslandId: "meadow-isle",
          transport: "aeroplane",
        });
      });
      expect(getPageText()).toContain("The aeroplane is flying to Meadow Isle");
      findButton("Fast forward: go straight to Meadow Isle").click();
      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage).toBeUndefined();
      });
      expect(readShownWorldMap().islandInViewId).toBe("meadow-isle");
    });

    it("flies a helicopter between the Helipads when the World Map picks one at random", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws]));
      openPage(renderMission());
      await playAsThunderpaws("Icicle Inlet, Maths");
      findButton("Close Your World Map").click();

      pickTransport("helicopter");
      await chooseFromMenu("Islands", "Meadow Isle, Year 1");

      await vi.waitFor(() => {
        expect(readShownWorldMap().voyage?.transport).toBe("helicopter");
      });
      expect(getPageText()).toContain(
        "The helicopter is flying to Meadow Isle",
      );
    });

    it("lands an aeroplane on the Runway, flies the Child across and sets them down beside the other Island's Runway", async () => {
      await exploreFrostIsle();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const seconds = aircraftPhaseSeconds.aeroplane;

      pickTransport("aeroplane");
      findButton("Travel to Meadow Isle, Year 1").click();
      await vi.waitFor(() => {
        expect(readShownExplore().voyage).toMatchObject({
          phase: "calling",
          transport: "aeroplane",
        });
      });
      expect(getPageText()).toContain("Here comes the aeroplane!");

      const departure: [VoyagePhase, number, string][] = [
        ["boarding", seconds.calling, "Up the steps and all aboard!"],
        ["departing", seconds.boarding, "Taking off for Meadow Isle"],
        ["crossing", seconds.departing, "Flying high over the sea"],
      ];
      for (const [phase, phaseSeconds, message] of departure) {
        await vi.advanceTimersByTimeAsync(phaseSeconds * 1000);
        await vi.waitFor(() => {
          expect(readShownExplore().voyage?.phase).toBe(phase);
        });
        expect(getPageText()).toContain(message);
      }

      await vi.advanceTimersByTimeAsync(9_000);
      await vi.waitFor(() => {
        expect(readShownExplore().island.id).toBe("meadow-isle");
      });
      expect(readShownExplore().voyage).toMatchObject({
        phase: "docking",
        transport: "aeroplane",
      });
      expect(readShownExplore().start).toStrictEqual(
        findJourneyWaitingSpot(
          findExploreAdventure("meadow-isle"),
          "aeroplane",
        ),
      );
      expect(getPageText()).toContain("Coming in to land on the Runway");
      vi.useRealTimers();
    });

    it("skips a helicopter flight with Fast forward, setting the Child down beside the other Island's Helipad", async () => {
      await exploreFrostIsle();

      pickTransport("helicopter");
      findButton("Travel to Meadow Isle, Year 1").click();
      await vi.waitFor(() => {
        findButton("Fast forward: go straight to Meadow Isle");
      });
      expect(getPageText()).toContain("Here comes the helicopter!");
      findButton("Fast forward: go straight to Meadow Isle").click();

      await vi.waitFor(() => {
        expect(readShownExplore().island.id).toBe("meadow-isle");
      });
      expect(readShownExplore().voyage).toBeUndefined();
      expect(readShownExplore().start).toStrictEqual(
        findJourneyWaitingSpot(
          findExploreAdventure("meadow-isle"),
          "helicopter",
        ),
      );
    });

    it("heads Whispering Woods as English and plays its Island's Year, with Capital catch, Story scrolls and Story builder always open and no Year tabs", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      await openRegion("Whispering Woods, English");

      expect(readText(".region-subject-name")).toBe("English");
      expect(document.querySelector(".year-tabs")).toBeNull();
      expect(listRegionPanelCards()).toHaveLength(19);
      expect(
        listRegionPanelCards()
          .filter(({ disabled }) => !disabled)
          .map(
            (card) => card.querySelector(".mission-card-title")?.textContent,
          ),
      ).toEqual([
        "Alphabet train",
        "Capital catch",
        "Story scrolls",
        "Story builder",
        "Apostrophe Swap Shop",
        "Weekday Word Wizard",
        "Spelling Rule Rover",
        "Capital Space Patrol",
        "Fairy Tale Forest",
        "Silly Word Spotter",
      ]);
      expect(getPageText()).toContain("Saying the alphabet in order");
      expect(getPageText()).not.toContain(
        "Linking ideas with adverbials of time and number",
      );

      findButtonTitled("Alphabet train").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      expect(playVoiceOver).toHaveBeenLastCalledWith("woods.alphabet-train");
    });

    it("shows a Story scrolls passage as text a screen reader can reach, with its answers on plaques", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      await openRegion("Whispering Woods, English");

      findButtonTitled("Story scrolls").click();
      await waitForText("Activity 1 of 3, question 1 of 5");
      const passage = document.querySelector(".story-passage");
      const plaques = Array.from(
        document.querySelectorAll("button.choice.story-scrolls"),
      );

      expect(passage?.getAttribute("tabindex")).toBe("0");
      expect(passage?.querySelector("h2")?.textContent).not.toBe("");
      expect(plaques.length).toBeGreaterThan(1);
      for (const plaque of plaques) {
        expect(plaque.getAttribute("aria-label")).toBe(
          `Pick ${plaque.textContent}`,
        );
      }
    });

    it("keeps the Your World Map panel closed until the Child picks a Region on the map or in the Region list, and closes it again with its cross", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      expect(getPageText()).not.toContain(missionChoice);

      readShownWorldMap().onRegionChosen("bubble-bay");
      await waitForText(missionChoice);
      expect(readText(".region-panel h2")).toBe("Bubble Bay");

      findButton("Close Your World Map").click();
      await vi.waitFor(() => {
        expect(getPageText()).not.toContain(missionChoice);
      });

      findButton("Bubble Bay, Maths").click();
      await waitForText(missionChoice);
      expect(readText(".region-panel h2")).toBe("Bubble Bay");
    });

    it("closes the Your World Map panel with Escape, so nothing it covers stays hidden", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);

      readShownWorldMap().onRegionChosen("bubble-bay");
      await waitForText(missionChoice);

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await vi.waitFor(() => {
        expect(getPageText()).not.toContain(missionChoice);
      });
    });

    it("shows a Region's details in the Your World Map panel, and lights it up on the map, while the Child points at it on the map or in the Region list", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkle(everyRegionsName);
      await openRegion("Whispering Woods, English");
      await waitForText("The owls have lost their voices.");

      readShownWorldMap().onRegionHovered("bubble-bay");
      await waitForText("The bubble machine is jammed!");
      expect(readShownWorldMap()).toMatchObject({
        selectedRegionId: "whispering-woods",
        hoveredRegionId: "bubble-bay",
      });
      expect(
        findButton("Whispering Woods, English").getAttribute("aria-pressed"),
      ).toBe("true");

      readShownWorldMap().onRegionHovered(undefined);
      await waitForText("The owls have lost their voices.");
      expect(readShownWorldMap().hoveredRegionId).toBeUndefined();

      findButton("Cloud Castle, Science").focus();
      await waitForText(
        readShownWorldMap().regions.find(({ id }) => id === "cloud-castle")
          ?.story ?? "Cloud Castle's story",
      );
      expect(readShownWorldMap().hoveredRegionId).toBe("cloud-castle");
      findButton("Cloud Castle, Science").blur();
      await waitForText("The owls have lost their voices.");
    });

    it("lets a Child drag the Your World Map panel by its title bar, or move it with the arrow keys, and never off the screen", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      const panel = document.querySelector<HTMLElement>(".region-panel");
      const handle = document.querySelector<HTMLElement>(".panel-handle");
      if (panel === null || handle === null) {
        throw new Error("the World Map has no Region panel to move");
      }
      expect(panel.style.transform).toBe("translate(0px, 0px)");

      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 500,
          clientY: 100,
        }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 300, clientY: 160 }),
      );
      window.dispatchEvent(new PointerEvent("pointerup"));
      await vi.waitFor(() => {
        expect(panel.style.transform).toBe("translate(-200px, 60px)");
      });
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 0, clientY: 0 }),
      );

      const moveButton = findButton(movePanelLabel);
      moveButton.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
      );
      await vi.waitFor(() => {
        expect(panel.style.transform).toBe("translate(-200px, 84px)");
      });
      for (let press = 0; press < 20; press++) {
        moveButton.dispatchEvent(
          new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
        );
      }
      await vi.waitFor(() => {
        expect(panel.style.transform).toBe("translate(0px, 84px)");
      });

      vi.spyOn(panel, "offsetWidth", "get").mockReturnValue(300);
      moveButton.click();
      await vi.waitFor(() => {
        expect(panel.style.transform).toBe(
          `translate(${String(-(window.innerWidth - 300 - 32))}px, 84px)`,
        );
      });
      moveButton.click();
      await vi.waitFor(() => {
        expect(panel.style.transform).toBe("translate(0px, 84px)");
      });
    });

    it("offers to show the World Map full screen where the browser can, and to leave full screen again", async () => {
      let fullScreenElement: Element | null = null;
      const showFullScreen = (element: Element | null) => {
        fullScreenElement = element;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      };
      Object.defineProperties(document, {
        fullscreenEnabled: { configurable: true, get: () => true },
        fullscreenElement: { configurable: true, get: () => fullScreenElement },
        exitFullscreen: {
          configurable: true,
          value: () => showFullScreen(null),
        },
      });
      const requestFullscreen = vi.fn(() =>
        showFullScreen(document.documentElement),
      );
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: requestFullscreen,
      });
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Full screen").click();
      await vi.waitFor(() => {
        expect(findButton("Full screen").getAttribute("aria-pressed")).toBe(
          "true",
        );
      });
      findButton("Full screen").click();

      await vi.waitFor(() => {
        expect(findButton("Full screen").getAttribute("aria-pressed")).toBe(
          "false",
        );
      });
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
      for (const property of [
        "fullscreenEnabled",
        "fullscreenElement",
        "exitFullscreen",
      ]) {
        Reflect.deleteProperty(document, property);
      }
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    });

    it("offers Full screen from the Menu, so a tablet can fill its whole screen, and Leave full screen once it does", async () => {
      let fullScreenElement: Element | null = null;
      const showFullScreen = (element: Element | null) => {
        fullScreenElement = element;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      };
      const exitFullscreen = vi.fn(() => showFullScreen(null));
      Object.defineProperties(document, {
        fullscreenEnabled: { configurable: true, get: () => true },
        fullscreenElement: { configurable: true, get: () => fullScreenElement },
        exitFullscreen: { configurable: true, value: exitFullscreen },
      });
      const requestFullscreen = vi.fn(() =>
        showFullScreen(document.documentElement),
      );
      Object.defineProperty(document.documentElement, "requestFullscreen", {
        configurable: true,
        value: requestFullscreen,
      });
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Menu").click();
      await vi.waitFor(() => {
        expect(listMenuItemNames()).toContain("Full screen");
      });
      expect(
        document.getElementById(
          findMenuItem("Full screen").getAttribute("aria-describedby") ?? "",
        )?.textContent,
      ).toBe("Fill the whole screen");
      findMenuItem("Full screen").click();
      await vi.waitFor(() => {
        expect(requestFullscreen).toHaveBeenCalledOnce();
      });
      expect(document.querySelector('[role="menu"]')).toBeNull();

      findButton("Menu").click();
      await vi.waitFor(() => {
        expect(listMenuItemNames()).toContain("Leave full screen");
      });
      expect(listMenuItemNames()).not.toContain("Full screen");
      findMenuItem("Leave full screen").click();
      await vi.waitFor(() => {
        expect(exitFullscreen).toHaveBeenCalledOnce();
      });
      for (const property of [
        "fullscreenEnabled",
        "fullscreenElement",
        "exitFullscreen",
      ]) {
        Reflect.deleteProperty(document, property);
      }
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    });

    it("leaves Full screen out of the Menu where the browser can't show full screen", async () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        configurable: true,
        get: () => false,
      });
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Menu").click();
      await vi.waitFor(() => {
        expect(listMenuItemNames()).toContain("Settings");
      });
      expect(listMenuItemNames()).not.toContain("Full screen");
      Reflect.deleteProperty(document, "fullscreenEnabled");
    });

    it("leaves the Full screen button out where the browser can't show full screen", async () => {
      Object.defineProperty(document, "fullscreenEnabled", {
        configurable: true,
        get: () => false,
      });
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      expect(() => findButton("Full screen")).toThrow();
      Reflect.deleteProperty(document, "fullscreenEnabled");
    });

    it("lets a Child go between the World Map, the wardrobe and a Mission from the play bar, and leave a Mission part-way", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      expect(findButton("Wardrobe").getAttribute("aria-current")).toBe("page");
      findButton("World Map").click();
      await openRegion();
      expect(findButton("World Map").getAttribute("aria-current")).toBe("page");

      findButtonTitled("Pop the bubbles").click();
      await waitForText("Activity 1 of 3");
      findButton("Back to the map").click();

      await openRegion();
      expect(getPageText()).not.toContain("Activity 1 of 3");
    });

    it("marks a Game whose Skill is Due for review, and not one that is Mastered and not yet due", async () => {
      const masteredLately = (skillId: string) =>
        [3, 2, 1].map((days) => goodDayOn(skillId, daysAgo(days)));
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(
            {
              ...sparkle,
              limits: {
                ...noLimits,
                openRegionKeys: ["meadow-isle/bubble-bay"],
              },
            },
            {
              practiceDays: [
                ...masteredLongAgo("maths.number-bonds-10"),
                ...masteredLately(mathsSkillIds["fish-count"][1]),
              ],
            },
          ),
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();

      const [dueCard, masteredCard] = listRegionPanelCards();
      expect(dueCard.querySelector(".review-marker")?.textContent).toBe(
        "Review waiting",
      );
      expect(masteredCard.textContent).toContain("Mastered!");
      expect(masteredCard.querySelector(".review-marker")).toBeNull();
      expect(
        document.querySelectorAll(".region-panel .review-marker"),
      ).toHaveLength(1);
    });

    it("fills the Family Chest from the Activities a Child finishes, and celebrates the Item it gives them", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle, thunderpaws], 28));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      expect(getPageText()).toContain("Family Chest: 28 of 30 Activities");

      await playWholeNumberBondsMission();

      expect(getPageText()).toContain("New in your wardrobe: Treasure crown");
      findButton("Back to the World Map").click();
      await waitForText("Family Chest: 1 of 30 Activities");
    });

    it("buys an Item with the Stars the device knows about, lets the Child try it on and save the look, and uploads both", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 20 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Hats").click();
      await waitForText("Try on Pointy purple hat");
      expect(findButtonTitled("Buy Pirate hat for 30 Stars").disabled).toBe(
        true,
      );

      findButton("Buy Blue wizard hat for 15 Stars").click();
      await waitForStarBalance("5 Stars");
      findButton("Try on Blue wizard hat").click();
      await vi.waitFor(() => {
        expect(
          findButton("Try on Blue wizard hat").getAttribute("aria-pressed"),
        ).toBe("true");
      });
      findButton("Save my look").click();
      await waitForText("Sparkle looks wonderful!");

      await vi.waitFor(() => {
        expect(
          findUploadedOfType(
            findUploadedPlayEvents(sparkle.id),
            "character-dressed",
          ),
        ).toHaveLength(1);
      });
      const [bought] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "item-bought",
      );
      const [dressed] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "character-dressed",
      );
      expect(bought.payload).toMatchObject({ itemId: "hat-wizard-blue" });
      expect(bought.payload).not.toHaveProperty("giftForChildId");
      expect(dressed.payload).toMatchObject({
        loadout: { hat: "hat-wizard-blue" },
      });
    });

    it("saves what the Child is wearing as a named outfit and puts it back on in a tap, uploading both", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { loadout: { hat: "hat-pointy-purple" } }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Save what you're wearing");
      const nameInput = document.querySelector('input[name="outfitName"]');
      if (!(nameInput instanceof HTMLInputElement)) {
        throw new Error("the wardrobe has no outfit name box");
      }
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(nameInput, "Wizard day");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => {
        expect(findButton("Save as an outfit").disabled).toBe(false);
      });
      findButton("Save as an outfit").click();
      await waitForText("Saved your Wizard day outfit!");

      findButton("Hats").click();
      await waitForText("Try on Red cap");
      findButton("Try on Red cap").click();
      (await vi.waitFor(() => findButton("Wear Wizard day"))).click();

      await waitForText("Sparkle is wearing the Wizard day outfit!");
      expect(
        findButton("Try on Pointy purple hat").getAttribute("aria-pressed"),
      ).toBe("true");
      await vi.waitFor(() => {
        expect(
          findUploadedOfType(findUploadedPlayEvents(sparkle.id), "outfit-worn"),
        ).toHaveLength(1);
      });
      const [saved] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "outfit-saved",
      );
      const [worn] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "outfit-worn",
      );
      expect(saved.payload).toMatchObject({
        name: "Wizard day",
        loadout: { hat: "hat-pointy-purple" },
      });
      expect(worn.payload).toHaveProperty(
        "outfitId",
        "outfitId" in saved.payload ? saved.payload.outfitId : undefined,
      );
    });

    const answerWithClassmateRooms =
      (
        playableChildren: PlayableChild[],
        classmateRooms: ClassmateRoom[],
      ): ServerAnswer =>
      (path) =>
        path === buildClassmateRoomsPath(sparkleId)
          ? Promise.resolve(Response.json({ classmateRooms }))
          : answerWithPlayableChildren(playableChildren)(path);

    const describeShownRoom = () =>
      document.querySelector(".room-scene")?.getAttribute("aria-label") ?? "";

    const openRoom = async () => {
      findButton("Room").click();
      await waitForText("Furnish your Room");
    };

    it("furnishes the Room from the World Map with free starters and bought Furniture, saves it, and uploads both", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 20 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();
      expect(getPageText()).toContain("Sparkle's Room");
      expect(describeShownRoom()).toContain("Wooden Bed");

      findButton("Rug").click();
      await waitForText("Put in Round Rug");
      expect(findButtonTitled("Buy Treasure Map Rug").disabled).toBe(true);
      findButton("Buy Star Rug for 15 Stars").click();
      await waitForStarBalance("5 Stars");
      findButton("Put in Star Rug").click();
      await vi.waitFor(() => {
        expect(describeShownRoom()).toContain("Star Rug");
      });
      findButton("Save my Room").click();
      await waitForText("Your Room looks wonderful!");

      await vi.waitFor(() => {
        expect(
          findUploadedOfType(
            findUploadedPlayEvents(sparkle.id),
            "room-furnished",
          ),
        ).toHaveLength(1);
      });
      const [furnished] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "room-furnished",
      );
      expect(furnished.payload).toMatchObject({ room: { rug: "rug-star" } });
    });

    it("plays in the Room full screen, with the Furniture chosen so far, and comes back to furnish it", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      findButton("Toy Box").click();
      await waitForText("Put in Toy Basket");
      findButton("Put in Toy Basket").click();
      findButton("Play in my Room").click();
      await waitForText("Play in your Room!");
      expect(
        document.querySelector(".room-play")?.getAttribute("aria-label"),
      ).toBe("Playing in Sparkle's Room");
      expect(getPageText()).not.toContain("Furnish your Room");
      expect(
        document.querySelector(".wardrobe-screen .play-nav + .room-play"),
      ).not.toBeNull();

      findButton("Back to my Room").click();
      await waitForText("Furnish your Room");
      expect(describeShownRoom()).toContain("Toy Basket");
    });

    it("puts a Trophy on the shelf for each Region where the Child has earned the Stars to open every Game", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, {
            regionProgress: [
              {
                islandId: "meadow-isle",
                regionId: "bubble-bay",
                unlockedGameIds: [],
                starsSinceUnlock: 0,
                starsEarned: 90,
              },
            ],
          }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      expect(getPageText()).toContain("Bubble Bay on Meadow Isle");
      expect(describeShownRoom()).toContain("1 Trophy on the shelf");
    });

    it("visits a sibling's Room with the network off, only to look", async () => {
      await openPageOnceOnline([
        sparkle,
        withRewards(thunderpaws, { room: { bed: "bed-bunk" } }),
      ]);
      startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      findButton("Visit Thunderpaws's Room").click();
      await waitForText("Thunderpaws's Room");
      expect(describeShownRoom()).toContain("Bunk Bed");
      expect(getPageText()).not.toContain("Save my Room");
      expect(getPageText()).not.toContain("Furnish your Room");

      findButton("Back to my Room").click();
      await waitForText("Furnish your Room");
    });

    it("offers no Classmates' Rooms until a Parent has turned them on", async () => {
      const { requests } = startFakeServer(
        answerWithPlayableChildren([sparkle]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      expect(getPageText()).not.toContain("Classmates");
      expect(requests).not.toContain(buildClassmateRoomsPath(sparkleId));
    });

    it("visits a Classmate's Room online once a Parent has turned it on, showing their portrait and never a name, and keeps nothing of it", async () => {
      const classmateRoom: ClassmateRoom = {
        loadout: { pet: "pet-owl" },
        room: { rug: "rug-moon" },
        trophies: [{ islandId: "meadow-isle", regionId: "bubble-bay" }],
      };
      startFakeServer(
        answerWithClassmateRooms(
          [{ ...sparkle, classmateVisitsAllowed: true }],
          [classmateRoom],
        ),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      findButton("Visit your Classmates' Rooms").click();
      (await vi.waitFor(() => findButton("Visit Classmate 1's Room"))).click();
      await waitForText("A Classmate's Room");
      expect(describeShownRoom()).toContain("Moon Rug");
      expect(getPageText()).toContain("Bubble Bay on Meadow Isle");
      const storedValues = Array.from(
        { length: localStorage.length },
        (_, index) => localStorage.getItem(localStorage.key(index) ?? ""),
      );
      expect(storedValues.join()).not.toContain("rug-moon");
    });

    it("says it is finding the Classmates' Rooms while it asks, with the button pressed off until they come", async () => {
      let answerRooms: () => void = () => undefined;
      const roomsAnswered = new Promise<void>((resolve) => {
        answerRooms = resolve;
      });
      const answer = answerWithClassmateRooms(
        [{ ...sparkle, classmateVisitsAllowed: true }],
        [{ loadout: {}, room: {}, trophies: [] }],
      );
      startFakeServer(async (path) => {
        if (path === buildClassmateRoomsPath(sparkleId)) {
          await roomsAnswered;
        }
        return answer(path);
      });
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      findButton("Visit your Classmates' Rooms").click();
      await vi.waitFor(() => {
        expect(
          document.querySelector(".room-visits .busy-label")?.textContent,
        ).toBe("Finding your Classmates' Rooms…");
      });
      expect(findButton("Visit your Classmates' Rooms").disabled).toBe(true);
      expect(
        document.querySelector(".room-visits")?.getAttribute("aria-busy"),
      ).toBe("true");

      answerRooms();
      await vi.waitFor(() => findButton("Visit Classmate 1's Room"));
      expect(document.querySelector(".room-visits .busy")).toBeNull();
      expect(
        document.querySelector(".room-visits")?.hasAttribute("aria-busy"),
      ).toBe(false);
    });

    it("says visiting Classmates needs the internet when the network is off", async () => {
      await openPageOnceOnline([{ ...sparkle, classmateVisitsAllowed: true }]);
      startFakeServer(networkOff);
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      await openRoom();

      findButton("Visit your Classmates' Rooms").click();
      await waitForText("Visiting Classmates needs the internet");
    });

    it("buys a Pet in the wardrobe, puts it with the Character, and uploads the look", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 20 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Pets").click();
      await waitForText("No Pet");

      findButton("Buy Ginger Cat for 15 Stars").click();
      await waitForStarBalance("5 Stars");
      findButton("Try on Ginger Cat").click();
      await vi.waitFor(() => {
        expect(
          findButton("Try on Ginger Cat").getAttribute("aria-pressed"),
        ).toBe("true");
      });
      findButton("Show off!").click();
      findButton("Save my look").click();
      await waitForText("Sparkle looks wonderful!");

      await vi.waitFor(() => {
        expect(
          findUploadedOfType(
            findUploadedPlayEvents(sparkle.id),
            "character-dressed",
          ),
        ).toHaveLength(1);
      });
      const [dressed] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "character-dressed",
      );
      expect(dressed.payload).toMatchObject({ loadout: { pet: "pet-cat" } });
    });

    it("buys a Vehicle in the wardrobe's Vehicles tab, ready to ride when exploring", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 20 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Vehicles").click();
      await waitForText("Buy Red Bicycle");

      findButton("Buy Red Bicycle for 15 Stars").click();
      await waitForStarBalance("5 Stars");
      await waitForText("Yours! Ride it when you explore");
      await vi.waitFor(() => {
        expect(
          findUploadedOfType(
            findUploadedPlayEvents(sparkle.id),
            "item-bought",
          ).map(({ payload }) => payload),
        ).toEqual([expect.objectContaining({ itemId: "vehicle-bicycle" })]);
      });
    });

    it.each([
      { isMusicMuted: false, areSoundEffectsMuted: false },
      { isMusicMuted: true, areSoundEffectsMuted: false },
      { isMusicMuted: false, areSoundEffectsMuted: true },
    ])(
      "plays the Region's tune and the chiptune sound effects as the Parent's last synced sound settings say: %o",
      async (soundSettings) => {
        startedWaves.length = 0;
        vi.stubGlobal("AudioContext", FakeAudioContext);
        startFakeServer(
          answerWithPlayableChildren([
            { ...sparkle, limits: { ...noLimits, ...soundSettings } },
          ]),
        );
        openPage(renderMission());
        await playAsSparkleOnTheWorldMap();

        findButtonTitled("Pop the bubbles").click();
        await waitForText("Activity 1 of 3");
        await answerRight();

        expect(startedWaves.includes(tuneWave)).toBe(
          !soundSettings.isMusicMuted,
        );
        expect(startedWaves.includes(effectWave)).toBe(
          !soundSettings.areSoundEffectsMuted,
        );
      },
    );

    it("lets the Child choose a Character Type and Features for free, go back to the Character Type's own gear, and save the look", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { loadout: { hat: "hat-red-cap" } }),
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");

      findButton("Choose Knight").click();
      findButton("Facial hair").click();
      await waitForText("Choose Handlebar moustache");
      findButton("Choose Handlebar moustache").click();
      findButton("Eye colour").click();
      await waitForText("Choose Sky blue");
      findButton("Choose Sky blue").click();
      findButton("Hats").click();
      await waitForText("The Knight's own");
      findButton("The Knight's own").click();
      await vi.waitFor(() => {
        expect(
          findButton("The Knight's own").getAttribute("aria-pressed"),
        ).toBe("true");
      });
      expect(
        document
          .querySelector('.wardrobe [role="img"]')
          ?.getAttribute("aria-label"),
      ).toBe("Sparkle the Knight");
      findButton("Save my look").click();

      await vi.waitFor(() => {
        expect(
          findUploadedOfType(
            findUploadedPlayEvents(sparkle.id),
            "character-dressed",
          ),
        ).toHaveLength(1);
      });
      const [dressed] = findUploadedOfType(
        findUploadedPlayEvents(sparkle.id),
        "character-dressed",
      );
      expect(dressed.payload).toMatchObject({
        loadout: {
          characterType: "type-knight",
          facialHair: "facial-hair-handlebar",
          eyeColour: "eye-colour-sky-blue",
        },
      });
      expect(dressed.payload).not.toHaveProperty("loadout.hat");
    });

    it("won't sell a Skill-tied Item until its Skill is Mastered", async () => {
      startFakeServer(
        answerWithPlayableChildren([withRewards(sparkle, { stars: 100 })]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Hats").click();
      await waitForText("Try on Pointy purple hat");

      const numberBondsHat = findButtonTitled("Buy Number bonds hat");
      expect(numberBondsHat.disabled).toBe(true);
      expect(numberBondsHat.textContent).toContain(
        "Master Number bonds to 10 to buy this",
      );
    });

    it("sells a Gift only to give to a sibling, never to keep", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { stars: 20 }),
          thunderpaws,
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      expect(getPageText()).not.toContain("Buy Bow tie");

      findButton("Give Bow tie to Thunderpaws for 15 Stars").click();

      await waitForText("You gave the Bow tie to Thunderpaws!");
      expect(getStarBalanceText()).toBe("5 Stars");
      expect(getPageText()).not.toContain("Try on Bow tie");
      await vi.waitFor(() => {
        expect(
          findUploadedOfType(findUploadedPlayEvents(sparkle.id), "item-bought"),
        ).toHaveLength(1);
      });
      expect(
        findUploadedOfType(findUploadedPlayEvents(sparkle.id), "item-bought")[0]
          .payload,
      ).toMatchObject({
        itemId: "hat-gift-bow",
        giftForChildId: thunderpaws.id,
      });
    });

    it("lets a sibling try on a Gift they were given", async () => {
      startFakeServer(
        answerWithPlayableChildren([
          withRewards(sparkle, { heldItemIds: ["hat-gift-bow"] }),
          thunderpaws,
        ]),
      );
      openPage(renderMission());
      await playAsSparkleOnTheWorldMap();
      findButton("Wardrobe").click();
      await waitForText("Sparkle's wardrobe");
      findButton("Hats").click();
      await waitForText("Try on Pointy purple hat");

      findButton("Try on Bow tie").click();

      await vi.waitFor(() => {
        expect(findButton("Try on Bow tie").getAttribute("aria-pressed")).toBe(
          "true",
        );
      });
      expect(getPageText()).not.toContain("Buy Bow tie");
    });
  });

  describe("Parent limits", () => {
    const oneMinuteADay: PlayableChild["limits"] = {
      ...noLimits,
      dailyMinutes: 1,
    };

    const fakePlayClock = () => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    };

    const countPlayTimeFor = async (milliseconds: number) => {
      await vi.advanceTimersByTimeAsync(milliseconds);
    };

    it("stops play at the daily limit it last synced, with no network, ending the Session", async () => {
      await openPageOnceOnline([{ ...sparkle, limits: oneMinuteADay }]);
      const offline = startFakeServer(networkOff);
      fakePlayClock();
      openPage();
      await playAsSparkle();

      await countPlayTimeFor(30_000);
      expect(getPageText()).toContain(theGame);
      await countPlayTimeFor(31_000);

      await waitForText("That's all the playing for today!");
      expect(getPageText()).not.toContain(theGame);
      await vi.waitFor(() => {
        expect(
          offline.findUploadedPlayEvents(sparkle.id).map(({ type }) => type),
        ).toEqual(["session-started", "session-ended"]);
      });
      findButton("Finish playing").click();
      await waitForText("Who's playing?");
    });

    it("keeps a Child who has reached today's limit from starting again on the same device", async () => {
      await openPageOnceOnline([{ ...sparkle, limits: oneMinuteADay }]);
      startFakeServer(networkOff);
      fakePlayClock();
      openPage();
      await playAsSparkle();
      await countPlayTimeFor(61_000);
      await waitForText("That's all the playing for today!");
      findButton("Finish playing").click();
      await waitForText("Who's playing?");

      await playAsSparkle("That's all the playing for today!");

      expect(getPageText()).not.toContain(theGame);
    });

    it("counts no time while the game is hidden, and lets a Child with no limit play on", async () => {
      await openPageOnceOnline([
        { ...sparkle, limits: oneMinuteADay },
        thunderpaws,
      ]);
      startFakeServer(networkOff);
      fakePlayClock();
      const page = openPage();
      await playAsSparkle();
      setPageVisibility("hidden");
      await countPlayTimeFor(120_000);
      setPageVisibility("visible");

      expect(getPageText()).toContain(theGame);
      findButton("Finish playing").click();
      closePage(page);

      openPage();
      await waitForText("Who's playing?");
      findButton("Thunderpaws").click();
      await waitForText("Hello, Thunderpaws!");
      await tapPictures(thunderpawsPicturePassword);
      findButton("Let's play").click();
      await waitForText(theGame);
      await countPlayTimeFor(120_000);

      expect(getPageText()).toContain(theGame);
    });
  });

  describe("Sessions", () => {
    const now = new Date("2026-11-14T16:00:00.000Z");
    const minutesAfterNow = (minutes: number) =>
      new Date(now.getTime() + minutes * 60_000);

    // Mocks Date alone, not fake timers: with fake timers on, each vi.waitFor retry moves the clock on 50 ms,
    // so a busy runner recorded the Session's end late.
    const freezeClockAt = (frozenTime: Date) => {
      vi.setSystemTime(frozenTime);
    };

    const readSessionMoments = (playEvents: PlayEvent[]) =>
      playEvents.map(({ type, happenedAt }) => ({ type, happenedAt }));

    it("records a Session started when a Child opens their Character and ended when they finish playing, with the device's time and IDs made on the device, and uploads them", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([sparkle, thunderpaws]),
      );
      openPage();
      await playAsSparkle();
      await vi.waitFor(() => {
        expect(findUploadedPlayEvents(sparkle.id)).toHaveLength(1);
      });
      freezeClockAt(minutesAfterNow(12));

      findButton("Finish playing").click();

      await vi.waitFor(() => {
        expect(findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
      });
      const [started, ended] = findUploadedPlayEvents(sparkle.id);
      expect(started.type).toBe("session-started");
      expect(new Date(started.happenedAt).toISOString()).toBe(
        started.happenedAt,
      );
      expect(ended).toMatchObject({
        type: "session-ended",
        happenedAt: minutesAfterNow(12).toISOString(),
        payload: started.payload,
      });
      expect(started.id).not.toBe(ended.id);
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(started.id).toMatch(uuidPattern);
      expect(started.payload.sessionId).toMatch(uuidPattern);
      expect(findUploadedPlayEvents(thunderpaws.id)).toEqual([]);
    });

    it("keeps Sessions played with the network off, and uploads them once the device reconnects", async () => {
      await openPageOnceOnline([sparkle]);
      const offline = startFakeServer(networkOff);
      openPage();
      await playAsSparkle();
      freezeClockAt(minutesAfterNow(9));
      findButton("Finish playing").click();
      await waitForText("Who's playing?");
      await vi.waitFor(() => {
        expect(offline.findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
      });

      const online = startFakeServer(answerWithPlayableChildren([sparkle]));
      window.dispatchEvent(new Event("online"));

      await vi.waitFor(() => {
        expect(online.findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
      });
      expect(online.findUploadedPlayEvents(sparkle.id)).toEqual(
        offline.findUploadedPlayEvents(sparkle.id),
      );
      expect(
        readSessionMoments(online.findUploadedPlayEvents(sparkle.id)).at(-1),
      ).toEqual({
        type: "session-ended",
        happenedAt: minutesAfterNow(9).toISOString(),
      });
    });

    it("lets the play waiting on the device go once the server says the device is signed out, as when its Family is deleted, and uploads none of it later (#283)", async () => {
      startFakeServer(answerWithPlayableChildren([sparkle]));
      const firstPage = openPage();
      await waitForText("Who's playing?");
      const offline = startFakeServer((path) =>
        path === playEventUploadPath
          ? networkOff(path)
          : answerWithPlayableChildren([sparkle])(path),
      );
      await playAsSparkle();
      findButton("Finish playing").click();
      await vi.waitFor(() => {
        expect(offline.findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
      });
      closePage(firstPage);
      const outbox = openPlayEventOutbox();
      expect((await outbox.listWaitingPlayEventIds()).size).toBe(2);
      localStorage.setItem(unsyncedPlayStorageKey, "[]");

      startFakeServer(answerWithStatus(401));
      const signedOutPage = openPage();
      await waitForText("Learning that feels like an adventure");

      await vi.waitFor(async () => {
        expect((await outbox.listWaitingPlayEventIds()).size).toBe(0);
      });
      expect(localStorage.getItem(unsyncedPlayStorageKey)).toBeNull();
      closePage(signedOutPage);
      const reachable = startFakeServer(answerWithPlayableChildren([sparkle]));
      openPage();
      await waitForText("Who's playing?");
      expect(reachable.uploads).toEqual([]);
    });

    it.each([404, 500, 502, 530])(
      "keeps the events while the server answers %i, and uploads them the next time the page opens and it can be reached",
      async (status) => {
        startFakeServer(answerWithPlayableChildren([sparkle]));
        const firstPage = openPage();
        await waitForText("Who's playing?");
        const unreachable = startFakeServer((path) =>
          path === playEventUploadPath
            ? answerWithStatus(status)(path)
            : answerWithPlayableChildren([sparkle])(path),
        );
        await playAsSparkle();
        findButton("Finish playing").click();
        await vi.waitFor(() => {
          expect(unreachable.findUploadedPlayEvents(sparkle.id)).toHaveLength(
            2,
          );
        });
        closePage(firstPage);

        const reachable = startFakeServer(
          answerWithPlayableChildren([sparkle]),
        );
        openPage();

        await vi.waitFor(() => {
          expect(reachable.findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
        });
      },
    );

    it("tries again every minute while the server can't be reached, and stops asking once everything is uploaded", async () => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
      startFakeServer(networkOff);
      await openPageOnceOnline([sparkle]);
      startFakeServer(networkOff);
      openPage();
      await playAsSparkle();
      findButton("Finish playing").click();
      await waitForText("Who's playing?");
      const reachable = startFakeServer(answerWithPlayableChildren([sparkle]));

      await vi.advanceTimersByTimeAsync(playEventUploadRetryMs);

      await vi.waitFor(() => {
        expect(reachable.findUploadedPlayEvents(sparkle.id)).toHaveLength(2);
      });
      const uploadCount = reachable.uploads.length;
      await vi.advanceTimersByTimeAsync(playEventUploadRetryMs);
      expect(reachable.uploads).toHaveLength(uploadCount);
    });

    it("ends the Session while the device hides the game, and starts a new one when it comes back", async () => {
      const { findUploadedPlayEvents } = startFakeServer(
        answerWithPlayableChildren([sparkle]),
      );
      openPage();
      await playAsSparkle();

      freezeClockAt(minutesAfterNow(5));
      setPageVisibility("hidden");
      freezeClockAt(minutesAfterNow(65));
      setPageVisibility("visible");
      freezeClockAt(minutesAfterNow(70));
      findButton("Finish playing").click();

      await vi.waitFor(() => {
        expect(findUploadedPlayEvents(sparkle.id)).toHaveLength(4);
      });
      const sessions = Map.groupBy(
        findUploadedPlayEvents(sparkle.id),
        ({ payload }) => payload.sessionId,
      );
      const [firstSession, secondSession] = [...sessions.values()];
      expect(readSessionMoments(firstSession).at(-1)).toEqual({
        type: "session-ended",
        happenedAt: minutesAfterNow(5).toISOString(),
      });
      expect(readSessionMoments(secondSession)).toEqual([
        {
          type: "session-started",
          happenedAt: minutesAfterNow(65).toISOString(),
        },
        {
          type: "session-ended",
          happenedAt: minutesAfterNow(70).toISOString(),
        },
      ]);
    });

    it("uploads nothing when nothing has been played", async () => {
      const { requests } = startFakeServer(
        answerWithPlayableChildren([sparkle]),
      );

      openPage();
      await waitForText("Who's playing?");

      expect(requests).toEqual([playableFamilyPath, adultSignOutPath]);
    });
  });
});

describe("openPlayEventOutbox", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads waiting events in the order they were recorded, at most 100 at a time, and forgets each batch once the server has it", async () => {
    const { uploads } = startFakeServer(answerWithPlayableChildren([]));
    const outbox = openPlayEventOutbox();
    const recordedPlayEvents: PlayEvent[] = Array.from(
      { length: largestPlayEventUpload + 30 },
      (_, index) => ({
        id: crypto.randomUUID(),
        childId: "0b0f7b1e-1111-4111-8111-111111111111",
        type: index % 2 === 0 ? "session-started" : "session-ended",
        happenedAt: new Date(Date.UTC(2026, 10, 14, 9, index)).toISOString(),
        payload: { sessionId: crypto.randomUUID() },
      }),
    );
    for (const playEvent of recordedPlayEvents) {
      await outbox.appendPlayEvent(playEvent);
    }

    await outbox.uploadWaitingPlayEvents();
    await outbox.uploadWaitingPlayEvents();

    expect(uploads.map((upload) => upload.length)).toEqual([
      largestPlayEventUpload,
      30,
    ]);
    expect(uploads.flat()).toEqual(recordedPlayEvents);
  });

  it("keeps every event when the server doesn't take the batch, and sends the same events again next time", async () => {
    const refused = startFakeServer(answerWithStatus(500));
    const outbox = openPlayEventOutbox();
    const playEvent: PlayEvent = {
      id: crypto.randomUUID(),
      childId: "0b0f7b1e-1111-4111-8111-111111111111",
      type: "session-started",
      happenedAt: "2026-11-14T09:00:00.000Z",
      payload: { sessionId: crypto.randomUUID() },
    };
    await outbox.appendPlayEvent(playEvent);

    await outbox.uploadWaitingPlayEvents();
    const accepted = startFakeServer(answerWithPlayableChildren([]));
    await outbox.uploadWaitingPlayEvents();
    await outbox.uploadWaitingPlayEvents();

    expect(refused.uploads).toEqual([[playEvent]]);
    expect(accepted.uploads).toEqual([[playEvent]]);
  });

  const buildSessionStart = (childId: string, minute: number): PlayEvent => ({
    id: crypto.randomUUID(),
    childId,
    type: "session-started",
    happenedAt: new Date(Date.UTC(2026, 10, 14, 9, minute)).toISOString(),
    payload: { sessionId: crypto.randomUUID() },
  });

  it("forgets a batch the server takes having let go of a deleted Child's events, and goes on to the next (#283)", async () => {
    const deletedChildId = "0b0f7b1e-1111-4111-8111-111111111111";
    const siblingId = "0b0f7b1e-2222-4222-8222-222222222222";
    const { uploads } = startFakeServer((path) =>
      Promise.resolve(
        path === playEventUploadPath
          ? Response.json({ letGoPlayEventCount: 51 }, { status: 200 })
          : Response.json({ playableChildren: [] }),
      ),
    );
    const outbox = openPlayEventOutbox();
    const recordedPlayEvents = Array.from(
      { length: largestPlayEventUpload + 1 },
      (_, index) =>
        buildSessionStart(index % 2 === 0 ? deletedChildId : siblingId, index),
    );
    for (const playEvent of recordedPlayEvents) {
      await outbox.appendPlayEvent(playEvent);
    }

    await outbox.uploadWaitingPlayEvents();

    expect(uploads.map((upload) => upload.length)).toEqual([
      largestPlayEventUpload,
      1,
    ]);
    expect(await outbox.listWaitingPlayEventIds()).toEqual(new Set());
  });

  it("lets every waiting event go when the server answers that the device is signed out, as when its Family is deleted (#283)", async () => {
    const signedOut = startFakeServer(answerWithStatus(401));
    const outbox = openPlayEventOutbox();
    const recordedPlayEvents = Array.from(
      { length: largestPlayEventUpload + 1 },
      (_, index) =>
        buildSessionStart("0b0f7b1e-1111-4111-8111-111111111111", index),
    );
    for (const playEvent of recordedPlayEvents) {
      await outbox.appendPlayEvent(playEvent);
    }

    await outbox.uploadWaitingPlayEvents();
    const reachable = startFakeServer(answerWithPlayableChildren([]));
    await outbox.uploadWaitingPlayEvents();

    expect(signedOut.uploads).toHaveLength(1);
    expect(reachable.uploads).toEqual([]);
    expect(await outbox.listWaitingPlayEventIds()).toEqual(new Set());
  });

  const answerTakenIdsOnce = (takenPlayEventIds: string[]) => {
    let hasAnsweredTaken = false;
    return startFakeServer((path) => {
      if (path !== playEventUploadPath) {
        return Promise.resolve(Response.json({ playableChildren: [] }));
      }
      if (hasAnsweredTaken) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      hasAnsweredTaken = true;
      return Promise.resolve(
        Response.json(
          {
            statusCode: 409,
            error: "Conflict",
            message: "These play event ids are already taken",
            takenPlayEventIds,
          },
          { status: 409 },
        ),
      );
    });
  };

  it("gives the events whose ids the server says are taken new ids and sends the batch again at once, keeping every event's play (#326)", async () => {
    const childId = "0b0f7b1e-1111-4111-8111-111111111111";
    const recordedPlayEvents = [0, 1, 2].map((minute) =>
      buildSessionStart(childId, minute),
    );
    const [, takenEvent] = recordedPlayEvents;
    const { uploads } = answerTakenIdsOnce([takenEvent.id]);
    const outbox = openPlayEventOutbox();
    for (const playEvent of recordedPlayEvents) {
      await outbox.appendPlayEvent(playEvent);
    }

    await outbox.uploadWaitingPlayEvents();

    expect(uploads).toHaveLength(2);
    expect(uploads[0]).toEqual(recordedPlayEvents);
    const [firstEvent, renewedEvent, lastEvent] = uploads[1];
    expect(firstEvent).toEqual(recordedPlayEvents[0]);
    expect(lastEvent).toEqual(recordedPlayEvents[2]);
    expect(renewedEvent.id).not.toBe(takenEvent.id);
    expect(renewedEvent.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect({ ...renewedEvent, id: takenEvent.id }).toEqual(takenEvent);
    expect(await outbox.listWaitingPlayEventIds()).toEqual(new Set());
  });

  it("moves the play the device shows before syncing onto an event's new id, so it isn't dropped while the event still waits (#326)", async () => {
    const childId = "0b0f7b1e-1111-4111-8111-111111111111";
    const takenEvent = buildSessionStart(childId, 0);
    const playRecord = {
      kind: "activity-finished",
      childId,
      skillId: "maths.number-bonds-10",
      localDate: "2026-11-14",
      secondsSpent: 60,
    };
    localStorage.setItem(
      unsyncedPlayStorageKey,
      JSON.stringify([{ playEventId: takenEvent.id, playRecord }]),
    );
    let uploadCount = 0;
    startFakeServer((path) => {
      if (path !== playEventUploadPath) {
        return Promise.resolve(Response.json({ playableChildren: [] }));
      }
      uploadCount += 1;
      return uploadCount === 1
        ? Promise.resolve(
            Response.json(
              { takenPlayEventIds: [takenEvent.id] },
              { status: 409 },
            ),
          )
        : answerWithStatus(503)(path);
    });
    const outbox = openPlayEventOutbox();
    await outbox.appendPlayEvent(takenEvent);

    await outbox.uploadWaitingPlayEvents();
    const waitingIds = await outbox.listWaitingPlayEventIds();

    expect(uploadCount).toBe(2);
    expect(waitingIds.size).toBe(1);
    expect(waitingIds.has(takenEvent.id)).toBe(false);
    const [renewedId] = [...waitingIds];
    expect(
      JSON.parse(localStorage.getItem(unsyncedPlayStorageKey) ?? "[]"),
    ).toEqual([{ playEventId: renewedId, playRecord }]);
    localStorage.removeItem(unsyncedPlayStorageKey);
  });

  it("leaves the batch waiting, unchanged, when the server answers 409 without naming any taken id", async () => {
    const playEvent = buildSessionStart(
      "0b0f7b1e-1111-4111-8111-111111111111",
      0,
    );
    const refused = startFakeServer(answerWithStatus(409));
    const outbox = openPlayEventOutbox();
    await outbox.appendPlayEvent(playEvent);

    await outbox.uploadWaitingPlayEvents();

    expect(refused.uploads).toEqual([[playEvent]]);
    expect(await outbox.listWaitingPlayEventIds()).toEqual(
      new Set([playEvent.id]),
    );
  });

  it("stops giving new ids after a few 409s in a row, so a server that keeps refusing doesn't hold the device in a loop", async () => {
    const playEvent = buildSessionStart(
      "0b0f7b1e-1111-4111-8111-111111111111",
      0,
    );
    const outbox = openPlayEventOutbox();
    await outbox.appendPlayEvent(playEvent);
    const { uploads } = startFakeServer((path) =>
      Promise.resolve(
        path === playEventUploadPath
          ? Response.json(
              { takenPlayEventIds: uploads.at(-1)?.map(({ id }) => id) ?? [] },
              { status: 409 },
            )
          : Response.json({ playableChildren: [] }),
      ),
    );

    await outbox.uploadWaitingPlayEvents();

    expect(uploads).toHaveLength(4);
    expect(new Set(uploads.map(([{ id }]) => id)).size).toBe(4);
    expect((await outbox.listWaitingPlayEventIds()).size).toBe(1);
  });
});
