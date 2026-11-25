import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type SubmitEvent,
} from "react";
import type {
  CharacterLoadout,
  RoomLoadout,
} from "../../curriculum/catalogue.js";
import type {
  CheckAnswerTiming,
  CheckResult,
} from "../../curriculum/checks.js";
import { getLocalDate } from "../../curriculum/mastery.js";
import type { GamePlace } from "../../curriculum/world-map.js";
import {
  applyPlayRecords,
  findChildRewards,
  type ChildRewards,
  type FamilyRewards,
  type Outfit,
  type PlayRecord,
} from "../../curriculum/rewards.js";
import { usePageTitle } from "../page-title.js";
import { useHashView } from "../site-header/hash-view.js";
import { HomeIcon, ParentsIcon, SignOutIcon } from "../site-header/icons.js";
import { SettingsPage } from "../site-header/settings-page.js";
import {
  SiteHeader,
  settingsView,
  type SiteMenuEntry,
} from "../site-header/site-header.js";
import { isPicturePasswordRight } from "../../server/children/picture-password.js";
import { CharacterPortrait } from "../character/character-preview.js";
import type {
  PlayEvent,
  PlayEventContent,
} from "../../server/family-devices/play-event-routes.js";
import {
  isPicturePasswordComplete,
  PicturePasswordPicker,
  usePicturePasswordChoice,
} from "../picture-password-picker.js";
import { FairytaleBackdrop } from "./fairytale-backdrop.js";
import { FirstOpenSetup, NewPlayerPortrait } from "./first-open.js";
import { HomePage } from "./home-page.js";
import {
  openPlayEventOutbox,
  type PlayEventOutbox,
} from "./play-event-outbox.js";
import { addSecondsPlayedToday, findSecondsPlayedToday } from "./play-time.js";
import {
  deleteStoredPlayableFamily,
  fetchPlayableFamily,
  findStoredPlayableFamily,
  isSetUpChild,
  storePlayableFamily,
  type FamilyChild,
  type PlayableChild,
  type PlayableFamily,
  type PlayableFamilyAnswer,
} from "./playable-family.js";
import {
  appendUnsyncedPlay,
  deleteUnsyncedPlay,
  keepPlayStillWaitingIn,
  listUnsyncedPlayRecords,
} from "./unsynced-play.js";
import { ReadAloudButton } from "../read-aloud-button.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  enterFullScreenOnTouchDevice,
  leaveFullScreen,
} from "../full-screen.js";

type PlayableFamilyView =
  | { kind: "loading" }
  | { kind: "listed"; playableFamily: PlayableFamily }
  | { kind: "signed-out" }
  | { kind: "unreachable" };

type Turn =
  | { kind: "choosing" }
  | { kind: "setting-up"; child: FamilyChild }
  | { kind: "entering-picture-password"; child: PlayableChild }
  | { kind: "playing"; child: PlayableChild };

export type PracticeRecord =
  | {
      kind: "question-answered";
      activityId: string;
      skillId: string;
      isRightFirstTime: boolean;
      wrongAnswerCount: number;
      checkAnswer?: CheckAnswerTiming;
    }
  | {
      kind: "activity-finished";
      activityId: string;
      skillId: string;
      secondsSpent: number;
    };

export interface Sibling {
  id: string;
  characterName: string;
  heldItemIds: string[];
  rewards: ChildRewards;
}

export interface PlayingChild {
  child: PlayableChild;
  rewards: ChildRewards;
  familyChestActivityCount: number;
  siblings: Sibling[];
  recordPractice: (practiceRecord: PracticeRecord, place: GamePlace) => void;
  buyItem: (itemId: string, giftForChildId: string | null) => void;
  dressCharacter: (loadout: CharacterLoadout) => void;
  saveOutfit: (outfit: Outfit) => void;
  wearOutfit: (outfitId: string) => void;
  furnishRoom: (room: RoomLoadout) => void;
  pickUpQuestFind: (islandId: string, findId: string) => void;
  solveQuestPuzzle: (islandId: string, puzzleId: string) => void;
  recordCheck: (checkResult: CheckResult, place: GamePlace) => void;
  finishPlaying: () => void;
}

export const playEventUploadRetryMs = 60_000;
export const playTimeTickMs = 1000;
export const adultSignOutPath = "/api/sign-out";

const longestCountedTickMs = 5000;
const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;

const loadStoredPlayableFamilyView = (): PlayableFamilyView => {
  const playableFamily = findStoredPlayableFamily();
  return playableFamily === undefined
    ? { kind: "loading" }
    : { kind: "listed", playableFamily };
};

interface PlayingSessionProps {
  child: PlayableChild;
  playableFamily: PlayableFamily;
  renderGame: (playingChild: PlayingChild) => ReactNode;
  playEventOutbox: PlayEventOutbox;
  onFinished: () => void;
}

const buildPracticePlayRecord = (
  practiceRecord: PracticeRecord,
  place: GamePlace,
  childId: string,
  localDate: string,
): PlayRecord =>
  practiceRecord.kind === "question-answered"
    ? {
        kind: practiceRecord.kind,
        childId,
        skillId: practiceRecord.skillId,
        localDate,
        isRightFirstTime: practiceRecord.isRightFirstTime,
        place,
      }
    : {
        kind: practiceRecord.kind,
        childId,
        skillId: practiceRecord.skillId,
        localDate,
        secondsSpent: practiceRecord.secondsSpent,
        place,
      };

const buildPracticePlayEvent = (
  practiceRecord: PracticeRecord,
  place: GamePlace,
  sessionId: string,
  localDate: string,
): PlayEventContent => {
  const activityPayload = {
    sessionId,
    activityId: practiceRecord.activityId,
    skillId: practiceRecord.skillId,
    localDate,
    ...place,
  };
  return practiceRecord.kind === "question-answered"
    ? {
        type: practiceRecord.kind,
        payload: {
          ...activityPayload,
          isRightFirstTime: practiceRecord.isRightFirstTime,
          wrongAnswerCount: practiceRecord.wrongAnswerCount,
          ...practiceRecord.checkAnswer,
        },
      }
    : {
        type: practiceRecord.kind,
        payload: {
          ...activityPayload,
          secondsSpent: practiceRecord.secondsSpent,
        },
      };
};

const buildSessionRecorder = (
  childId: string,
  playEventOutbox: PlayEventOutbox,
) => {
  let openSessionId: string | undefined;

  const recordPlayEvent = (unsentPlayEvent: PlayEventContent): string => {
    const id = crypto.randomUUID();
    const playEvent: PlayEvent = {
      id,
      childId,
      happenedAt: new Date().toISOString(),
      ...unsentPlayEvent,
    };
    void playEventOutbox
      .appendPlayEvent(playEvent)
      .then(playEventOutbox.uploadWaitingPlayEvents);
    return id;
  };
  const startSession = () => {
    if (openSessionId !== undefined) {
      return openSessionId;
    }
    const sessionId = crypto.randomUUID();
    openSessionId = sessionId;
    recordPlayEvent({ type: "session-started", payload: { sessionId } });
    return sessionId;
  };
  const endSession = () => {
    if (openSessionId === undefined) {
      return;
    }
    recordPlayEvent({
      type: "session-ended",
      payload: { sessionId: openSessionId },
    });
    openSessionId = undefined;
  };
  const followPageVisibility = () => {
    if (document.visibilityState === "hidden") {
      endSession();
      return;
    }
    startSession();
  };
  const recordPlay = (
    playEventContent: PlayEventContent,
    playRecord: PlayRecord,
  ) => {
    appendUnsyncedPlay({
      playEventId: recordPlayEvent(playEventContent),
      playRecord,
    });
  };
  const recordPractice = (practiceRecord: PracticeRecord, place: GamePlace) => {
    const localDate = getLocalDate(new Date());
    recordPlay(
      buildPracticePlayEvent(practiceRecord, place, startSession(), localDate),
      buildPracticePlayRecord(practiceRecord, place, childId, localDate),
    );
  };
  const buyItem = (itemId: string, giftForChildId: string | null) => {
    const localDate = getLocalDate(new Date());
    const sessionId = startSession();
    recordPlay(
      {
        type: "item-bought",
        payload:
          giftForChildId === null
            ? { sessionId, itemId, localDate }
            : { sessionId, itemId, localDate, giftForChildId },
      },
      { kind: "item-bought", childId, itemId, localDate, giftForChildId },
    );
  };
  const dressCharacter = (loadout: CharacterLoadout) => {
    recordPlay(
      {
        type: "character-dressed",
        payload: { sessionId: startSession(), loadout },
      },
      { kind: "character-dressed", childId, loadout },
    );
  };
  const saveOutfit = ({ id: outfitId, name, loadout }: Outfit) => {
    recordPlay(
      {
        type: "outfit-saved",
        payload: { sessionId: startSession(), outfitId, name, loadout },
      },
      { kind: "outfit-saved", childId, outfitId, name, loadout },
    );
  };
  const wearOutfit = (outfitId: string) => {
    recordPlay(
      {
        type: "outfit-worn",
        payload: { sessionId: startSession(), outfitId },
      },
      { kind: "outfit-worn", childId, outfitId },
    );
  };

  const furnishRoom = (room: RoomLoadout) => {
    recordPlay(
      { type: "room-furnished", payload: { sessionId: startSession(), room } },
      { kind: "room-furnished", childId, room },
    );
  };

  const pickUpQuestFind = (islandId: string, findId: string) => {
    recordPlay(
      {
        type: "quest-find-picked-up",
        payload: { sessionId: startSession(), islandId, findId },
      },
      { kind: "quest-find-picked-up", childId, islandId, findId },
    );
  };

  const solveQuestPuzzle = (islandId: string, puzzleId: string) => {
    recordPlay(
      {
        type: "quest-puzzle-solved",
        payload: {
          sessionId: startSession(),
          islandId,
          puzzleId,
          localDate: getLocalDate(new Date()),
        },
      },
      { kind: "quest-puzzle-solved", childId, islandId, puzzleId },
    );
  };

  const recordCheck = (
    { checkGameType, isClockOff, outcomes }: CheckResult,
    place: GamePlace,
  ) => {
    recordPlayEvent({
      type: "check-finished",
      payload: {
        sessionId: startSession(),
        localDate: getLocalDate(new Date()),
        ...place,
        checkGameType,
        isClockOff,
        outcomes: outcomes.map(
          ({
            key,
            questionType,
            skillId,
            isRight,
            isInTime,
            millisecondsTaken,
          }) => ({
            key,
            questionType,
            skillId,
            isRight,
            isInTime,
            millisecondsTaken: Math.max(0, Math.round(millisecondsTaken)),
          }),
        ),
      },
    });
  };

  return {
    startSession,
    endSession,
    followPageVisibility,
    recordPractice,
    buyItem,
    dressCharacter,
    saveOutfit,
    wearOutfit,
    furnishRoom,
    pickUpQuestFind,
    solveQuestPuzzle,
    recordCheck,
  };
};

const buildServerFamilyRewards = ({
  playableChildren,
  familyChestActivityCount,
}: PlayableFamily): FamilyRewards => ({
  children: playableChildren.map(({ rewards }) => rewards),
  familyChestActivityCount,
});

const buildProvisionalFamilyRewards = (
  playableFamily: PlayableFamily,
): FamilyRewards =>
  applyPlayRecords(
    buildServerFamilyRewards(playableFamily),
    listUnsyncedPlayRecords(),
  );

const isOverDailyLimit = (child: PlayableChild, secondsPlayed: number) =>
  child.limits.dailyMinutes !== null &&
  secondsPlayed >= child.limits.dailyMinutes * secondsPerMinute;

const TimeUpScreen = ({ onFinished }: { onFinished: () => void }) => {
  usePageTitle("Time's up for today");
  return (
    <main className="menu" data-read-aloud-section>
      <h1>That&apos;s all the playing for today!</h1>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <p>You can play again tomorrow. Well done for all your hard work.</p>
      <button type="button" onClick={onFinished}>
        Finish playing
      </button>
    </main>
  );
};

const PlayingSession = ({
  child,
  playableFamily,
  renderGame,
  playEventOutbox,
  onFinished,
}: PlayingSessionProps) => {
  const [sessionRecorder] = useState(() =>
    buildSessionRecorder(child.id, playEventOutbox),
  );
  const [familyRewards, setFamilyRewards] = useState(() =>
    buildProvisionalFamilyRewards(playableFamily),
  );
  const [isTimeUp, setIsTimeUp] = useState(() =>
    isOverDailyLimit(
      child,
      findSecondsPlayedToday(child.id, getLocalDate(new Date())),
    ),
  );

  useEffect(() => {
    if (isTimeUp) {
      return;
    }
    const { startSession, endSession, followPageVisibility } = sessionRecorder;
    startSession();
    document.addEventListener("visibilitychange", followPageVisibility);
    return () => {
      document.removeEventListener("visibilitychange", followPageVisibility);
      endSession();
    };
  }, [sessionRecorder, isTimeUp]);

  useEffect(() => {
    if (isTimeUp) {
      return;
    }
    let lastTickAt = Date.now();
    const countPlayTime = () => {
      const now = Date.now();
      const countedMs = Math.min(now - lastTickAt, longestCountedTickMs);
      lastTickAt = now;
      if (document.visibilityState === "hidden") {
        return;
      }
      const secondsPlayed = addSecondsPlayedToday(
        child.id,
        getLocalDate(new Date(now)),
        countedMs / millisecondsPerSecond,
      );
      if (isOverDailyLimit(child, secondsPlayed)) {
        setIsTimeUp(true);
      }
    };
    const playTimeTick = setInterval(countPlayTime, playTimeTickMs);
    return () => {
      clearInterval(playTimeTick);
    };
  }, [child, isTimeUp]);

  if (isTimeUp) {
    return <TimeUpScreen onFinished={onFinished} />;
  }

  const showRecordedPlay = () => {
    setFamilyRewards(buildProvisionalFamilyRewards(playableFamily));
  };

  return (
    <div className="play">
      {renderGame({
        child,
        rewards: findChildRewards(familyRewards, child.id),
        familyChestActivityCount: familyRewards.familyChestActivityCount,
        siblings: playableFamily.playableChildren
          .filter(isSetUpChild)
          .filter(({ id }) => id !== child.id)
          .map(({ id, characterName }) => {
            const siblingRewards = findChildRewards(familyRewards, id);
            return {
              id,
              characterName,
              heldItemIds: siblingRewards.heldItemIds,
              rewards: siblingRewards,
            };
          }),
        recordPractice: (practiceRecord, place) => {
          sessionRecorder.recordPractice(practiceRecord, place);
          showRecordedPlay();
        },
        buyItem: (itemId, giftForChildId) => {
          sessionRecorder.buyItem(itemId, giftForChildId);
          showRecordedPlay();
        },
        dressCharacter: (loadout) => {
          sessionRecorder.dressCharacter(loadout);
          showRecordedPlay();
        },
        saveOutfit: (outfit) => {
          sessionRecorder.saveOutfit(outfit);
          showRecordedPlay();
        },
        wearOutfit: (outfitId) => {
          sessionRecorder.wearOutfit(outfitId);
          showRecordedPlay();
        },
        furnishRoom: (room) => {
          sessionRecorder.furnishRoom(room);
          showRecordedPlay();
        },
        pickUpQuestFind: (islandId, findId) => {
          sessionRecorder.pickUpQuestFind(islandId, findId);
          showRecordedPlay();
        },
        solveQuestPuzzle: (islandId, puzzleId) => {
          sessionRecorder.solveQuestPuzzle(islandId, puzzleId);
          showRecordedPlay();
        },
        recordCheck: sessionRecorder.recordCheck,
        finishPlaying: () => {
          sessionRecorder.endSession();
          onFinished();
        },
      })}
    </div>
  );
};

// The game places this button itself: the World Map, exploring, the
// Wardrobe and the Room offer Finish playing from the Menu instead.
export const FinishPlayingButton = ({ onFinish }: { onFinish: () => void }) => (
  <button
    type="button"
    className="finish-playing"
    aria-label="Finish playing"
    onClick={onFinish}
  >
    <SignOutIcon />
    <span className="finish-playing-label">Finish playing</span>
  </button>
);

interface PicturePasswordEntryProps {
  child: PlayableChild;
  onOpened: () => void;
  onBack: () => void;
}

const PicturePasswordEntry = ({
  child,
  onOpened,
  onBack,
}: PicturePasswordEntryProps) => {
  const picturePasswordChoice = usePicturePasswordChoice();
  const { picturePassword, clearPictures } = picturePasswordChoice;
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const openCharacter = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPicturePasswordComplete(picturePassword)) {
      setProblem("Tap 3 pictures first.");
      return;
    }
    setProblem(undefined);
    const isRight = await runBusy("Checking your Picture Password…", () =>
      isPicturePasswordRight(picturePassword, child.picturePasswordHash),
    );
    if (isRight === undefined) {
      return;
    }
    if (isRight) {
      onOpened();
      return;
    }
    clearPictures();
    setProblem("Those aren't the right pictures. Try again!");
  };

  return (
    <div className="who-is-playing picture-password-screen">
      <FairytaleBackdrop />
      <main
        className="menu picture-password-entry"
        data-read-aloud-section
        aria-busy={isBusy ? true : undefined}
      >
        <form
          onSubmit={(event) => {
            // Asked for during the tap, as a browser requires, not once the slow check has finished.
            if (isPicturePasswordComplete(picturePassword)) {
              enterFullScreenOnTouchDevice();
            }
            openCharacter(event).catch(() => {
              setProblem(
                "Wizzaroo couldn't check those pictures. Ask a Parent for help.",
              );
            });
          }}
        >
          <div className="picture-password-greeting">
            <h1>Hello, {child.characterName}!</h1>
            <ReadAloudButton className="read-aloud is-small" readsSection />
          </div>
          <PicturePasswordPicker {...picturePasswordChoice} />
          {problem === undefined ? null : <p role="alert">{problem}</p>}
          {/* Both choices sit side by side, so the whole screen fits without scrolling. */}
          <div className="picture-password-actions">
            <button
              type="submit"
              className="picture-password-play"
              disabled={isBusy}
            >
              Let&apos;s play
            </button>
            <button
              type="button"
              className="picture-password-back"
              onClick={onBack}
            >
              That&apos;s not me
            </button>
          </div>
          {busyLabel === undefined ? null : (
            <BusyProgress label={busyLabel} className="is-centred" />
          )}
        </form>
      </main>
    </div>
  );
};

interface WhoIsPlayingProps {
  playableFamily: PlayableFamily;
  onChosen: (child: FamilyChild) => void;
}

const newPlayerName = "New player";

const WhoIsPlaying = ({ playableFamily, onChosen }: WhoIsPlayingProps) => {
  const { playableChildren } = playableFamily;
  const familyRewards = useMemo(
    () => buildProvisionalFamilyRewards(playableFamily),
    [playableFamily],
  );
  return (
    <div className="who-is-playing">
      <FairytaleBackdrop />
      <main className="menu" data-read-aloud-section>
        <h1>Who&apos;s playing?</h1>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        {playableChildren.length === 0 ? (
          <p>There are no Children to play yet. A Parent adds them first.</p>
        ) : (
          <div className="portraits">
            {playableChildren.map((child) => (
              <button
                key={child.id}
                type="button"
                className="portrait"
                aria-label={
                  child.characterName ??
                  child.newPlayerNickname ??
                  newPlayerName
                }
                onClick={() => {
                  onChosen(child);
                }}
              >
                {child.characterName === null ? (
                  <NewPlayerPortrait />
                ) : (
                  <CharacterPortrait
                    loadout={findChildRewards(familyRewards, child.id).loadout}
                    isFidgeting
                  />
                )}
                {child.characterName ??
                  child.newPlayerNickname ??
                  newPlayerName}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const findFamilyDevicePageTitle = (
  view: PlayableFamilyView,
  turn: Turn,
): string | undefined => {
  if (view.kind === "signed-out") {
    return "Learning adventures for Years 1 to 6";
  }
  if (view.kind === "loading") {
    return "Loading";
  }
  if (view.kind === "unreachable") {
    return "Can't reach the server";
  }
  if (turn.kind === "entering-picture-password") {
    return `Hello, ${turn.child.characterName}`;
  }
  if (turn.kind === "setting-up") {
    return "Getting ready to play";
  }
  return turn.kind === "choosing" ? "Who's playing?" : undefined;
};

const familyDeviceViews = ["home", settingsView] as const;

interface FamilyDeviceViewProps {
  view: PlayableFamilyView;
  turn: Turn;
  loadingStep: string;
  onTurnChanged: (turn: Turn) => void;
  onChildSetUp: (childId: string) => Promise<void>;
}

/** What a Family Device does before it knows who can play. */
const loadingFamilyLabel = "Getting your Family's Characters…";
const sendingWaitingPlayStep =
  "Sending any play saved on this device to Wizzaroo";
const fetchingFamilyStep = "Asking Wizzaroo who can play";

const FamilyDeviceView = ({
  view,
  turn,
  loadingStep,
  onTurnChanged,
  onChildSetUp,
}: FamilyDeviceViewProps) => {
  if (view.kind === "signed-out") {
    return <HomePage />;
  }
  if (view.kind === "loading") {
    return (
      <main className="menu" aria-busy="true">
        <BusyProgress
          label={loadingFamilyLabel}
          detail={loadingStep}
          className="is-centred"
        />
      </main>
    );
  }
  if (view.kind === "unreachable") {
    return (
      <main className="menu">
        <p role="alert">
          Wizzaroo can&apos;t reach its server, and this device hasn&apos;t got
          the Characters yet. Try again when it&apos;s online.
        </p>
      </main>
    );
  }
  if (turn.kind === "entering-picture-password") {
    return (
      <PicturePasswordEntry
        key={turn.child.id}
        child={turn.child}
        onOpened={() => {
          onTurnChanged({ kind: "playing", child: turn.child });
        }}
        onBack={() => {
          onTurnChanged({ kind: "choosing" });
        }}
      />
    );
  }
  if (turn.kind === "setting-up") {
    return (
      <FirstOpenSetup
        key={turn.child.id}
        child={turn.child}
        onSetUp={() => onChildSetUp(turn.child.id)}
        onBack={() => {
          onTurnChanged({ kind: "choosing" });
        }}
      />
    );
  }
  return (
    <WhoIsPlaying
      playableFamily={view.playableFamily}
      onChosen={(child) => {
        onTurnChanged(
          isSetUpChild(child)
            ? { kind: "entering-picture-password", child }
            : { kind: "setting-up", child },
        );
      }}
    />
  );
};

interface FamilyDevicePageProps {
  renderGame: (playingChild: PlayingChild) => ReactNode;
}

const fetchPlayableFamilyAfterSyncing = async (
  playEventOutbox: PlayEventOutbox,
  onStep: (step: string) => void,
): Promise<{
  answer: PlayableFamilyAnswer;
  waitingPlayEventIds: Set<string> | undefined;
}> => {
  const waitingPlayEventIds = await playEventOutbox
    .uploadWaitingPlayEvents()
    .then(playEventOutbox.listWaitingPlayEventIds)
    .catch(() => undefined);
  onStep(fetchingFamilyStep);
  return { answer: await fetchPlayableFamily(), waitingPlayEventIds };
};

export const FamilyDevicePage = ({ renderGame }: FamilyDevicePageProps) => {
  const [view, setView] = useState<PlayableFamilyView>(
    loadStoredPlayableFamilyView,
  );
  const [turn, setTurn] = useState<Turn>({ kind: "choosing" });
  const [playEventOutbox] = useState(openPlayEventOutbox);
  const [loadingStep, setLoadingStep] = useState(sendingWaitingPlayStep);

  useEffect(() => {
    const uploadWaitingPlayEvents = () => {
      void playEventOutbox.uploadWaitingPlayEvents();
    };
    uploadWaitingPlayEvents();
    window.addEventListener("online", uploadWaitingPlayEvents);
    const retry = setInterval(uploadWaitingPlayEvents, playEventUploadRetryMs);
    return () => {
      window.removeEventListener("online", uploadWaitingPlayEvents);
      clearInterval(retry);
    };
  }, [playEventOutbox]);

  useEffect(() => {
    const showAnswer = (
      answer: PlayableFamilyAnswer,
      waitingPlayEventIds?: Set<string>,
    ) => {
      if (answer.kind === "signed-in") {
        // Children share this browser, so an adult left signed in here would let them straight into the Parent page.
        void fetch(adultSignOutPath, { method: "POST" }).catch(() => undefined);
        storePlayableFamily(answer.playableFamily);
        if (waitingPlayEventIds !== undefined) {
          keepPlayStillWaitingIn(waitingPlayEventIds);
        }
        setView({ kind: "listed", playableFamily: answer.playableFamily });
        return;
      }
      if (answer.kind === "signed-out") {
        // A device told it is signed out, as when its Family is deleted, lets its waiting play go with the Family (#283).
        deleteStoredPlayableFamily();
        deleteUnsyncedPlay();
        void playEventOutbox.deleteWaitingPlayEvents().catch(() => undefined);
        setView({ kind: "signed-out" });
        return;
      }
      setView((shownView) =>
        shownView.kind === "loading" ? { kind: "unreachable" } : shownView,
      );
    };
    void fetchPlayableFamilyAfterSyncing(playEventOutbox, setLoadingStep).then(
      ({ answer, waitingPlayEventIds }) => {
        showAnswer(answer, waitingPlayEventIds);
      },
      () => {
        showAnswer({ kind: "unreachable" });
      },
    );
  }, [playEventOutbox]);

  // Once a new Child is set up, the server's copy of the Family has their Picture Password and Character, so play starts.
  const continueAfterSetUp = (childId: string): Promise<void> =>
    fetchPlayableFamily().then(
      (answer) => {
        if (answer.kind !== "signed-in") {
          setTurn({ kind: "choosing" });
          return;
        }
        storePlayableFamily(answer.playableFamily);
        setView({ kind: "listed", playableFamily: answer.playableFamily });
        const setUpChild = answer.playableFamily.playableChildren.find(
          ({ id }) => id === childId,
        );
        setTurn(
          setUpChild !== undefined && isSetUpChild(setUpChild)
            ? { kind: "playing", child: setUpChild }
            : { kind: "choosing" },
        );
      },
      () => {
        setTurn({ kind: "choosing" });
      },
    );

  const hashView = useHashView(familyDeviceViews);
  const isSettingsOpen = hashView === settingsView;
  const isPlaying = view.kind === "listed" && turn.kind === "playing";
  usePageTitle(
    isSettingsOpen && !isPlaying
      ? "Settings"
      : findFamilyDevicePageTitle(view, turn),
  );

  // A phone or tablet fills its screen while a Child plays; back on Who's playing? it shows the browser again.
  useEffect(() => {
    if (!isPlaying) {
      leaveFullScreen();
    }
  }, [isPlaying]);

  if (view.kind === "listed" && turn.kind === "playing") {
    return (
      <PlayingSession
        key={turn.child.id}
        child={turn.child}
        playableFamily={view.playableFamily}
        renderGame={renderGame}
        playEventOutbox={playEventOutbox}
        onFinished={() => {
          setTurn({ kind: "choosing" });
        }}
      />
    );
  }

  const menuEntries: SiteMenuEntry[] = [
    {
      label: "Home",
      icon: <HomeIcon />,
      href: "#home",
      isCurrent: !isSettingsOpen,
    },
    {
      label: "Parent sign in",
      icon: <ParentsIcon />,
      href: "/parent/",
    },
  ];

  return (
    <>
      <SiteHeader
        brandHref="#home"
        menuLabel="Main menu"
        menuEntries={menuEntries}
        isSettingsOpen={isSettingsOpen}
      />
      {isSettingsOpen ? (
        <main className="settings">
          <div className="full-view">
            <SettingsPage />
          </div>
        </main>
      ) : (
        <FamilyDeviceView
          view={view}
          turn={turn}
          loadingStep={loadingStep}
          onTurnChanged={setTurn}
          onChildSetUp={continueAfterSetUp}
        />
      )}
    </>
  );
};
