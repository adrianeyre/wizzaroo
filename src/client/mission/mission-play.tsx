import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MovablePopup } from "../movable-popup.js";
import {
  loadMinimisedGroups,
  storeMinimisedGroups,
} from "../minimised-groups.js";
import { loadPopupPosition, storePopupPosition } from "../popup-positions.js";
import { catalogue } from "../../curriculum/catalogue.js";
import {
  buildMastery,
  buildSkillMastery,
  getLocalDate,
  type SkillMastery,
} from "../../curriculum/mastery.js";
import {
  phonicsProgrammes,
  type PhonicsProgramme,
} from "../../curriculum/phonics-programmes.js";
import type { PhonicsSound } from "../../curriculum/phonics-sounds.js";
import { rewardRules, type ChildRewards } from "../../curriculum/rewards.js";
import {
  buildIslandsOnMap,
  buildRegionsOnMap,
  canExploreIsland,
  listGamesOnMap,
  type ChildLimits,
  type GameOnMap,
  type RegionOnMap,
} from "../../curriculum/island-access.js";
import {
  getEnglishGameYear,
  isEnglishGameType,
} from "../../curriculum/english-games.js";
import {
  gapMark,
  type EnglishPrompt,
} from "../../curriculum/english-questions.js";
import type { LabStation } from "../../curriculum/lab-games.js";
import { skills, type Skill, type YearGroup } from "../../curriculum/skills.js";
import {
  findHomeIsland,
  findIsland,
  isPuzzleGameType,
  worldMap,
  isBigTop,
  type GamePlace,
  type GameType,
  type PuzzleGameType,
  type QuestionGameType,
  type Region,
} from "../../curriculum/world-map.js";
import { PuzzlePlay } from "../puzzles/puzzle-play.js";
import { findPuzzleSkillId, puzzleTitles } from "../puzzles/puzzle-skills.js";
import {
  findGameCardContent,
  type MissionContent,
} from "./game-card-content.js";
import {
  checkFormats,
  isCheckGameType,
  type CheckGameType,
} from "../../curriculum/checks.js";
import { CheckPlay } from "../checks/check-play.js";
import { checkSpokenWord } from "../checks/check-spoken-words.js";
import {
  findComputingGame,
  isComputingGameType,
} from "../../curriculum/computing-games.js";
import {
  describeArrowsInWords,
  directionArrows,
} from "../../curriculum/computing-scenes.js";
import {
  findMusicGame,
  isMusicGameType,
  type MusicGameType,
} from "../../curriculum/music-games.js";
import { useMusicCues, type MusicCue } from "./music-cues.js";
import {
  playSoundEffect,
  useRegionTune,
  type SoundEffect,
  type SoundSettings,
} from "../game-sound.js";
import { toggleFullScreen, useFullScreen } from "../full-screen.js";
import {
  CharacterPortrait,
  CharacterPreview,
} from "../character/character-preview.js";
import { Wardrobe } from "../character/wardrobe.js";
import { Room } from "./room.js";
import { FamilyChest } from "./family-chest.js";
import { StarFireworks } from "./star-fireworks.js";
import { isMotionReduced } from "../reduced-motion.js";
import {
  FinishPlayingButton,
  type PlayingChild,
} from "../family-device/family-device-page.js";
import { SettingsPage } from "../site-header/settings-page.js";
import {
  CogIcon,
  EyeIcon,
  GlobeIcon,
  SignOutIcon,
} from "../site-header/icons.js";
import { PlayMenu, PlaySidePanel, type PlayMenuOption } from "./play-menu.js";
import {
  findComputingVoiceOverKey,
  isVoiceOverKey,
  playPhoneme,
  playVoiceOver,
  type VoiceOverKey,
} from "../voice-over/voice-over.js";
import { usePageTitle } from "../page-title.js";
import { findRegionHeading } from "../region-heading.js";
import type {
  CameraCommand,
  MapVoyagePlan,
  WalkerDrop,
  WorldMapSceneProps,
} from "../world-map-islands.js";
import { chooseWeather, weatherKinds, type Weather } from "../world-map-sky.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { CompanionMood } from "../studio-stage.js";
import {
  chooseTransport,
  type JourneyArrival,
} from "../islands/island-journey.js";
import {
  canSailTo,
  describeMapJourney,
  FastForwardIcon,
  IslandExplore,
  type IslandExploreSceneProps,
} from "../islands/island-explore-hud.js";
import type { MissionSceneProps } from "../world.js";
import {
  describeFraction,
  describeFractionPicture,
} from "../../curriculum/fractions.js";
import { formatNumber } from "../../curriculum/number-format.js";
import { describePolygon, isPolygonName } from "../../curriculum/polygons.js";
import { describeShapeProperty } from "../../curriculum/shape-properties.js";
import { AwardsButton } from "../awards/awards-dialog.js";
import {
  describeClockTime,
  type ClockQuestion,
} from "../../curriculum/telling-the-time.js";
import {
  answerQuestion,
  buildLetterMatchMission,
  buildListenAndPickMission,
  buildEnglishMission,
  buildComputingMission,
  buildMusicMission,
  buildGeographyGameMission,
  buildHistoryQuestMission,
  buildPhonicsGameMission,
  buildLabMission,
  describeAddition,
  describeMoreOrLess,
  describeNumberBond,
  describeOneMoreOneLess,
  describePhonicsWord,
  describeSequence,
  describeTakingAway,
  getChoicePositions,
  getChoiceSizePixels,
  getComputingKeySizePixels,
  getCurrentQuestion,
  listListenAndPickSkills,
  startMission,
  type Mission,
  type MissionProgress,
  type MissionQuestion,
} from "./mission.js";
import {
  buildMathsExtraMission,
  buildMathsMission,
  isMathsExtraGameType,
  isMathsGameType,
} from "./maths-missions.js";
import { ReadAloudButton } from "../read-aloud-button.js";
import {
  describeHint,
  describePartOfDay,
  describeQuestionAloud,
  describeWordClass,
  findMissionWords,
  findSpokenPrompt,
  wordLinkPhrases,
} from "./mission-text.js";

interface MissionPlayProps extends PlayingChild {
  renderScene: (sceneProps: MissionSceneProps) => ReactNode;
  renderWorldMap: (worldMapProps: WorldMapSceneProps) => ReactNode;
  renderIslandExplore: (sceneProps: IslandExploreSceneProps) => ReactNode;
  recordedSounds: ReadonlySet<PhonicsSound>;
}

interface Exploring {
  islandId: string;
  enteredRegionId: string | undefined;
  arrival?: JourneyArrival;
  startAt?: MapPoint;
}

type Feedback =
  | { kind: "none" }
  | { kind: "right"; fact: string | undefined }
  | { kind: "wrong"; hint: string };

interface PlayingView {
  kind: "playing";
  mission: Mission;
  missionGame: MissionGame;
  rewardsAtStart: ChildRewards;
  progress: MissionProgress;
  feedback: Feedback;
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
}

interface PuzzlingView {
  kind: "puzzling";
  gameType: PuzzleGameType;
  missionGame: MissionGame;
  rewardsAtStart: ChildRewards;
  round: number;
}

interface CheckingView {
  kind: "checking";
  gameType: CheckGameType;
  missionGame: MissionGame;
  rewardsAtStart: ChildRewards;
  round: number;
}

interface CelebratingView {
  kind: "celebrating";
  missionGame: MissionGame;
  skillIds: string[];
  rewardsAtStart: ChildRewards;
}

interface ChoosingView {
  kind: "choosing";
  /** The Game just left, whose Region panel opens again so another Game can be chosen. */
  leftPlace?: GamePlace;
}

type MissionView =
  | ChoosingView
  | { kind: "dressing" }
  | { kind: "furnishing" }
  | { kind: "settings" }
  | PlayingView
  | PuzzlingView
  | CheckingView
  | CelebratingView;

/**
 * The Island a Child starts exploring from, when they press Explore away
 * from the World Map: their home Island, or the first they may explore
 * if a Parent has locked it. None when every Island is locked.
 */
const findFirstExplorableIsland = (
  yearGroup: YearGroup | null,
  limits: ChildLimits,
) => {
  const home = findHomeIsland(yearGroup);
  const explorable = buildIslandsOnMap(yearGroup, limits).filter(
    (island) => canSailTo(island) && canExploreIsland(limits, island.id),
  );
  return explorable.find(({ id }) => id === home.id) ?? explorable.at(0);
};

const describeMasteryForChild = ({
  state,
  goodDayCount,
  goodDaysNeeded,
}: SkillMastery): string => {
  switch (state) {
    case "not-started":
      return "New!";
    case "learning":
      return `Learning: ${String(goodDayCount)} of ${String(goodDaysNeeded)} great days`;
    case "mastered":
    case "due-for-review":
      return "Mastered!";
  }
};

const playQuestionPrompt = (question: MissionQuestion): boolean => {
  if (question.prompt.kind === "sound") {
    void playPhoneme(question.prompt.sound);
    return true;
  }
  const spokenPrompt = findSpokenPrompt(question);
  if (spokenPrompt === undefined) {
    return false;
  }
  void playVoiceOver(spokenPrompt);
  return true;
};

const readTapTime = () => Date.now();

const missionParts = {
  random: Math.random,
  buildId: () => crypto.randomUUID(),
};

const readViewportSize = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const useViewportSize = (): { width: number; height: number } => {
  const [viewportSize, setViewportSize] = useState(readViewportSize);
  useEffect(() => {
    const measure = () => {
      setViewportSize(readViewportSize());
    };
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
    };
  }, []);
  return viewportSize;
};

const describeChoice = (choice: string, question: MissionQuestion): string => {
  if (question.prompt.kind === "fraction") {
    return `Pick the shape with ${describeFractionPicture(choice)}`;
  }
  if (question.prompt.kind === "height-extreme") {
    return `Pick the coral ${choice} blocks tall`;
  }
  if (isPolygonName(choice)) {
    return `Pick the ${describePolygon(choice)}`;
  }
  return `Pick the ${choice}`;
};

const isPictureChoice = (gameType: GameType, question: MissionQuestion) =>
  gameType === "shape-hunt" ||
  question.prompt.kind === "fraction" ||
  question.prompt.kind === "height-extreme";

const arrowGlyphs = Object.values(directionArrows).join("");
const arrowsOnlyPattern = new RegExp(
  `^\\s*[${arrowGlyphs}][${arrowGlyphs}\\s]*$`,
  "u",
);

const isArrowsOnly = (choice: string) => arrowsOnlyPattern.test(choice);

const findLabelLength = (choice: string) => {
  if (choice.length > 7) {
    return "long";
  }
  return choice.length > 4 ? "medium" : "short";
};

const punctuationNames: Partial<Record<string, string>> = {
  ".": "a full stop",
  ",": "a comma",
  "?": "a question mark",
  "!": "an exclamation mark",
  ":": "a colon",
  ";": "a semi-colon",
  "-": "a hyphen",
  "–": "a dash",
  "(": "an opening bracket",
  ")": "a closing bracket",
  "“": "opening inverted commas",
  "”": "closing inverted commas",
  "'": "an apostrophe",
  "’": "an apostrophe",
};

const describeChoiceAloud = (choice: string): string =>
  punctuationNames[choice] ?? choice;

const plaqueGameTypes: readonly GameType[] = [
  "history-quest",
  "story-scrolls",
  "story-builder",
];

const tallChoiceShare = 1.5;
const plaqueHeightShare = 0.5;
const wordChoiceWidthShare = 1.7;

interface ChoiceLayerProps {
  question: MissionQuestion;
  remainingChoices: string[];
  gameType: QuestionGameType;
  isShaking: boolean;
  onChosen: (choice: string, index: number) => void;
}

const ChoiceLayer = ({
  question,
  remainingChoices,
  gameType,
  isShaking,
  onChosen,
}: ChoiceLayerProps) => {
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const choiceSize = getChoiceSizePixels(viewportHeight);
  const isComputing = isComputingGameType(gameType);
  const keySize = getComputingKeySizePixels(viewportWidth, viewportHeight);
  const positions = getChoicePositions(question.choices.length, gameType);
  const verb = gameType === "popping-bubbles" ? "Pop" : "Pick";
  const isLabelShown = !isPictureChoice(gameType, question);
  const isTall = question.prompt.kind === "height-extreme";
  const isPlaque = plaqueGameTypes.includes(gameType);
  const isWordChoice =
    gameType === "phonics-games" || (isEnglishGameType(gameType) && !isPlaque);
  const musicGame = isMusicGameType(gameType)
    ? findMusicGame(gameType)
    : undefined;
  const findChoiceClassName = (choice: string) => {
    if (musicGame !== undefined) {
      const longLabel = choice.length > 3 ? " long-label" : "";
      return `choice music ${musicGame.labelStyle}${longLabel}`;
    }
    if (isComputing) {
      return isArrowsOnly(choice)
        ? "choice computing arrows"
        : "choice computing";
    }
    return isWordChoice && choice.length > 2
      ? `choice ${gameType} wordy`
      : `choice ${gameType}`;
  };
  const describeChoiceLabel = (choice: string) => {
    if (musicGame !== undefined) {
      return `Pick ${musicGame.describeChoice(choice)}`;
    }
    const spokenChoice = isComputing ? describeArrowsInWords(choice) : choice;
    return isLabelShown
      ? `${verb} ${describeChoiceAloud(spokenChoice)}`
      : describeChoice(choice, question);
  };
  const showMusicChoice = (choice: string) => {
    if (musicGame?.labelStyle === "inside") {
      return choice;
    }
    return musicGame?.labelStyle === "caption" ? (
      <span className="choice-caption" aria-hidden="true">
        {choice}
      </span>
    ) : null;
  };
  const isPlainLabelShown =
    musicGame === undefined &&
    isLabelShown &&
    !isWordChoice &&
    gameType !== "science-lab";

  return (
    <div className={isShaking ? "choice-layer shaking" : "choice-layer"}>
      {question.choices.map((choice, index) =>
        remainingChoices.includes(choice) ? (
          <button
            key={choice}
            type="button"
            className={findChoiceClassName(choice)}
            data-label-length={
              isMathsGameType(gameType) || isMathsExtraGameType(gameType)
                ? findLabelLength(choice)
                : undefined
            }
            aria-label={describeChoiceLabel(choice)}
            style={{
              left: `${String(((positions[index].x + 1) / 2) * 100)}%`,
              top: `${String(((1 - positions[index].y) / 2) * 100)}%`,
              ...(isPlaque
                ? { minHeight: choiceSize * plaqueHeightShare }
                : gameType === "geography-games"
                  ? {}
                  : {
                      width: isComputing
                        ? keySize.width
                        : isWordChoice
                          ? choiceSize * wordChoiceWidthShare
                          : choiceSize,
                      height: isComputing
                        ? keySize.height
                        : isTall
                          ? choiceSize * tallChoiceShare
                          : choiceSize,
                    }),
            }}
            onClick={() => {
              onChosen(choice, index);
            }}
          >
            {isWordChoice ? (
              <span
                className={
                  choice.length === 1 ? "choice-word single" : "choice-word"
                }
              >
                {choice}
              </span>
            ) : null}
            {gameType === "science-lab" ? (
              <span className="choice-label">{choice}</span>
            ) : null}
            {isPlainLabelShown ? choice : null}
            {showMusicChoice(choice)}
          </button>
        ) : null,
      )}
    </div>
  );
};

const LineIcon = ({ children }: { children: ReactNode }) => (
  <svg
    className="line-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const MapIcon = () => (
  <LineIcon>
    <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
    <path d="M15 5.764v15" />
    <path d="M9 3.236v15" />
  </LineIcon>
);

const SpeakerIcon = () => (
  <LineIcon>
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
    <path d="M16 9a5 5 0 0 1 0 6" />
    <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
  </LineIcon>
);

const ReplayIcon = () => (
  <LineIcon>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </LineIcon>
);

export const ShirtIcon = () => (
  <LineIcon>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </LineIcon>
);

export const BedIcon = () => (
  <LineIcon>
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <path d="M6 8v9" />
  </LineIcon>
);

const ChestIcon = () => (
  <LineIcon>
    <path d="M4 10a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M4 11h16" />
    <path d="M10 11v3h4v-3" />
  </LineIcon>
);

const LockIcon = () => (
  <LineIcon>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </LineIcon>
);

const PinIcon = () => (
  <LineIcon>
    <path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </LineIcon>
);

const MinimiseIcon = () => (
  <LineIcon>
    <path d="M4 20h16" />
    <path d="m8 11 4 4 4-4" />
  </LineIcon>
);

const MaximiseIcon = () => (
  <LineIcon>
    <path d="M4 4h16" />
    <path d="m8 13 4-4 4 4" />
  </LineIcon>
);

type MapButtonGroup = "map" | "regions";

const mapButtonGroupNames: Record<MapButtonGroup, string> = {
  map: "map buttons",
  regions: "Region buttons",
};

const isMapButtonGroup = (group: string): group is MapButtonGroup =>
  Object.hasOwn(mapButtonGroupNames, group);

const MinimisableButtons = ({
  group,
  isMinimised,
  onToggled,
  children,
}: {
  group: MapButtonGroup;
  isMinimised: boolean;
  onToggled: (group: MapButtonGroup) => void;
  children: ReactNode;
}) => (
  <>
    <button
      type="button"
      className="group-toggle"
      aria-expanded={!isMinimised}
      aria-label={`${isMinimised ? "Maximise" : "Minimise"} the ${mapButtonGroupNames[group]}`}
      title={`${isMinimised ? "Maximise" : "Minimise"} the ${mapButtonGroupNames[group]}`}
      onClick={() => {
        onToggled(group);
      }}
    >
      {isMinimised ? <MaximiseIcon /> : <MinimiseIcon />}
    </button>
    {isMinimised ? null : children}
  </>
);

const ZoomInIcon = () => (
  <LineIcon>
    <path d="M12 5v14M5 12h14" />
  </LineIcon>
);

const ZoomOutIcon = () => (
  <LineIcon>
    <path d="M5 12h14" />
  </LineIcon>
);

const WholeMapIcon = () => (
  <LineIcon>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <circle cx="12" cy="12" r="3" />
  </LineIcon>
);

const SunnyIcon = () => (
  <LineIcon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </LineIcon>
);

const CloudyIcon = () => (
  <LineIcon>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </LineIcon>
);

const RainIcon = () => (
  <LineIcon>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 14v6M8 14v6M12 16v6" />
  </LineIcon>
);

const StormIcon = () => (
  <LineIcon>
    <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973" />
    <path d="m13 12-3 5h4l-3 5" />
  </LineIcon>
);

const SnowIcon = () => (
  <LineIcon>
    <path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4" />
  </LineIcon>
);

const WindIcon = () => (
  <LineIcon>
    <path d="M12.8 19.6A2 2 0 1 0 14 16H2" />
    <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
    <path d="M9.8 4.4A2 2 0 1 1 11 8H2" />
  </LineIcon>
);

const FogIcon = () => (
  <LineIcon>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 17H7M17 21H9" />
  </LineIcon>
);

const weatherButtons: Record<Weather, { label: string; icon: ReactNode }> = {
  clear: { label: "Sunny", icon: <SunnyIcon /> },
  cloudy: { label: "Cloudy", icon: <CloudyIcon /> },
  rain: { label: "Rain", icon: <RainIcon /> },
  storm: { label: "Thunderstorm", icon: <StormIcon /> },
  snow: { label: "Snow", icon: <SnowIcon /> },
  wind: { label: "Windy", icon: <WindIcon /> },
  fog: { label: "Fog", icon: <FogIcon /> },
};

const FullScreenIcon = () => (
  <LineIcon>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
  </LineIcon>
);

const ExitFullScreenIcon = () => (
  <LineIcon>
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
  </LineIcon>
);

// Full screen hides the browser's bars and the tablet's own, so a Game fills
// the whole screen. It is a Menu item on every screen that has the Menu, left
// out where the browser can't show full screen (an iPhone, for one).
const fullScreenMenuOptions = (
  isFullScreen: boolean,
  isFullScreenOffered: boolean,
): PlayMenuOption[] =>
  isFullScreenOffered
    ? [
        {
          label: isFullScreen ? "Leave full screen" : "Full screen",
          hint: isFullScreen
            ? "Show the browser bars again"
            : "Fill the whole screen",
          icon: isFullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />,
          group: "pages",
          onChoose: () => {
            toggleFullScreen().catch(() => undefined);
          },
        },
      ]
    : [];

const MovePanelIcon = () => (
  <LineIcon>
    <path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
  </LineIcon>
);

const CloseIcon = () => (
  <LineIcon>
    <path d="M18 6 6 18M6 6l12 12" />
  </LineIcon>
);

const MusicNoteIcon = () => (
  <LineIcon>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </LineIcon>
);

const StarIcon = () => (
  <svg
    className="star-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </svg>
);

interface QuestionMissionContent extends MissionContent {
  gameType: QuestionGameType;
}

interface MissionGame extends MissionContent {
  yearGroup: YearGroup;
  place: GamePlace;
}

const labStationKeys: Record<LabStation, VoiceOverKey> = {
  sort: "science.sort",
  "odd-one-out": "science.odd-one-out",
  "true-false": "science.true-false",
  "fill-gap": "science.fill-gap",
  sequence: "science.sequence",
  mystery: "science.mystery",
  predict: "science.predict",
  vocabulary: "science.vocabulary",
  compare: "science.compare",
  investigate: "science.investigate",
};
interface QuestionMissionGame extends MissionGame {
  gameType: QuestionGameType;
}

const findEnglishGameYear = ({ gameType, englishYear }: MissionContent) =>
  isEnglishGameType(gameType) && englishYear !== undefined
    ? getEnglishGameYear(gameType, englishYear)
    : undefined;

const findInstructionKey = (
  { gameType, phonicsGame, labGame }: QuestionMissionContent,
  level: YearGroup,
): VoiceOverKey => {
  if (isComputingGameType(gameType)) {
    return findComputingVoiceOverKey(gameType);
  }
  if (isMusicGameType(gameType)) {
    return findMusicInstructionKey(gameType);
  }
  if (labGame !== undefined) {
    return labStationKeys[labGame.station];
  }
  const instructionVoice = findMissionWords(gameType, level).instructionVoice;
  if (phonicsGame === undefined) {
    return instructionVoice;
  }
  const phonicsGameKey = `phonics-games.${phonicsGame.id}`;
  return isVoiceOverKey(phonicsGameKey) ? phonicsGameKey : instructionVoice;
};

const findMissionTitle = (
  {
    gameType,
    phonicsGame,
    labGame,
    geographyGame,
    historyQuest,
  }: MissionContent,
  level: YearGroup,
): string => {
  if (isPuzzleGameType(gameType)) {
    return puzzleTitles[gameType];
  }
  if (isCheckGameType(gameType)) {
    return checkFormats[gameType].title;
  }
  if (isMusicGameType(gameType)) {
    return findMusicGame(gameType).title;
  }
  if (isComputingGameType(gameType)) {
    return findComputingGame(gameType).title;
  }
  return (
    phonicsGame?.title ??
    labGame?.title ??
    geographyGame?.title ??
    historyQuest?.title ??
    findMissionWords(gameType, level).title
  );
};

const findMusicInstructionKey = (gameType: MusicGameType): VoiceOverKey => {
  const ownKey = `music.${gameType}`;
  if (isVoiceOverKey(ownKey)) {
    return ownKey;
  }
  return findMusicGame(gameType).hintKind === "listen"
    ? "music.listen-and-tap"
    : "music.look-and-tap";
};

const findHintKey = (
  gameType: QuestionGameType,
  level: YearGroup,
): VoiceOverKey => {
  if (isComputingGameType(gameType)) {
    return "computing.try-again";
  }
  if (!isMusicGameType(gameType)) {
    return findMissionWords(gameType, level).hintVoice;
  }
  return findMusicGame(gameType).hintKind === "listen"
    ? "music.listen-again"
    : "music.look-again";
};

const findWellDoneKey = (
  gameType: QuestionGameType,
  level: YearGroup,
): VoiceOverKey =>
  isMusicGameType(gameType) || isComputingGameType(gameType)
    ? "mission.well-done"
    : findMissionWords(gameType, level).wellDoneVoice;

const findEnglishHint = (missionGame: MissionContent): string | undefined => {
  const englishGameYear = findEnglishGameYear(missionGame);
  return englishGameYear === undefined
    ? undefined
    : `Not quite. ${englishGameYear.hint}`;
};

const findInstructionText = (
  missionGame: QuestionMissionContent,
  level: YearGroup,
): string => {
  const { gameType, phonicsGame, labGame, geographyGame, historyQuest } =
    missionGame;
  if (isMusicGameType(gameType)) {
    return findMusicGame(gameType).instruction;
  }
  if (isComputingGameType(gameType)) {
    return findComputingGame(gameType).instruction;
  }
  if (geographyGame !== undefined) {
    return geographyGame.instruction;
  }
  if (historyQuest !== undefined) {
    return historyQuest.instruction;
  }
  if (phonicsGame !== undefined) {
    return phonicsGame.instruction;
  }
  if (labGame !== undefined) {
    return labGame.instruction;
  }
  return isEnglishGameType(gameType)
    ? (findEnglishGameYear(missionGame)?.ask ?? "")
    : findMissionWords(gameType, level).instruction;
};

interface MissionCardDetails extends MissionGame {
  title: string;
  skillName: string;
  mastery: SkillMastery | undefined;
  isReviewDue: boolean;
  isUnlocked: boolean;
  isTurnedOff: boolean;
  starsToUnlock: number;
}

type PlayNavScreen = "world-map" | "wardrobe" | "room" | "settings";

/** The screens whose play bar has the Awards button beside the Stars. */
const screensWithAwards: readonly PlayNavScreen[] = [
  "world-map",
  "wardrobe",
  "room",
];

interface PlayNavProps {
  characterName: string;
  yearGroup: YearGroup | null;
  rewards: ChildRewards;
  familyChestActivityCount: number;
  shownScreen: PlayNavScreen;
  onWorldMap: () => void;
  // Left out when a Parent has locked exploring, which hides the Explore tab.
  onExplore: (() => void) | undefined;
  onDressing: () => void;
  onFurnishing: () => void;
  soundSettings: SoundSettings;
  menu?: ReactNode;
}

const PlayNav = ({
  characterName,
  yearGroup,
  rewards,
  familyChestActivityCount,
  shownScreen,
  onWorldMap,
  onExplore,
  onDressing,
  onFurnishing,
  soundSettings,
  menu,
}: PlayNavProps) => {
  const [starFireworksShowId, setStarFireworksShowId] = useState<number>();

  const startStarFireworks = () => {
    if (isMotionReduced()) {
      return;
    }
    setStarFireworksShowId((showId) => (showId ?? 0) + 1);
  };

  return (
    <nav
      className={menu === undefined ? "play-nav" : "play-nav has-play-menu"}
      aria-label="Where to go"
    >
      <div className="play-nav-identity">
        <CharacterPortrait
          characterName={characterName}
          loadout={rewards.loadout}
        />
        <span className="play-nav-name" aria-hidden="true">
          {characterName}
        </span>
        {shownScreen === "world-map" && yearGroup !== null ? (
          <p className="year-badge">Year {yearGroup}</p>
        ) : null}
      </div>
      <div className="play-nav-tabs">
        <button
          type="button"
          aria-label="World Map"
          aria-current={shownScreen === "world-map" ? "page" : undefined}
          onClick={onWorldMap}
        >
          <MapIcon />
          <span className="play-nav-tab-label">Map</span>
        </button>
        {onExplore === undefined ? null : (
          <button type="button" aria-label="Explore" onClick={onExplore}>
            <WalkIcon />
            <span className="play-nav-tab-label">Explore</span>
          </button>
        )}
        <button
          type="button"
          aria-label="Wardrobe"
          aria-current={shownScreen === "wardrobe" ? "page" : undefined}
          onClick={onDressing}
        >
          <ShirtIcon />
          <span className="play-nav-tab-label">Wardrobe</span>
        </button>
        <button
          type="button"
          aria-label="Room"
          aria-current={shownScreen === "room" ? "page" : undefined}
          onClick={onFurnishing}
        >
          <BedIcon />
          <span className="play-nav-tab-label">Room</span>
        </button>
      </div>
      <div className="play-nav-stats">
        <button
          type="button"
          className="star-balance"
          title="Celebrate your Stars"
          onClick={startStarFireworks}
        >
          <StarIcon /> {rewards.stars}
          <span className="star-balance-label"> Stars</span>
        </button>
        {screensWithAwards.includes(shownScreen) ? (
          <AwardsButton rewards={rewards} soundSettings={soundSettings} />
        ) : null}
        <FamilyChest
          familyChestActivityCount={familyChestActivityCount}
          icon={<ChestIcon />}
          soundSettings={soundSettings}
        />
      </div>
      {menu}
      {starFireworksShowId === undefined ? null : (
        <StarFireworks
          soundSettings={soundSettings}
          key={starFireworksShowId}
          onFinished={() => {
            setStarFireworksShowId(undefined);
          }}
        />
      )}
    </nav>
  );
};

type SidePanelKind = "subject" | "islands" | "weather" | "view";

const sidePanelTitles: Record<SidePanelKind, string> = {
  subject: "Subject",
  islands: "Islands",
  weather: "Weather",
  view: "View",
};

interface WorldMapScreenProps extends Omit<
  PlayNavProps,
  "shownScreen" | "onWorldMap" | "menu"
> {
  onSettings: () => void;
  onFinishPlaying: () => void;
  limits: ChildLimits;
  listRegionCards: (region: Region) => MissionCardDetails[];
  renderWorldMap: (worldMapProps: WorldMapSceneProps) => ReactNode;
  renderIslandExplore: (sceneProps: IslandExploreSceneProps) => ReactNode;
  exploring: Exploring | undefined;
  /** The Island the map last showed, so coming back from a Game returns there. */
  lastIslandInViewId: string | undefined;
  /** The Game just left, whose Region panel opens again. */
  leftPlace: GamePlace | undefined;
  onIslandInViewChanged: (islandId: string) => void;
  foundTreasureIds: readonly string[];
  onExploringChanged: (exploring: Exploring | undefined) => void;
  onTreasureFound: (treasureId: string) => void;
  onQuestFindPickedUp: (islandId: string, findId: string) => void;
  onQuestPuzzleSolved: (islandId: string, puzzleId: string) => void;
  onStarted: (missionGame: MissionGame) => void;
}

const WalkIcon = () => (
  <LineIcon>
    <circle cx="13" cy="4" r="2" />
    <path d="m9 20 3-6 3 2v5" />
    <path d="m6 12 3-3 4 1 3 4 3 1" />
    <path d="m12 14-1-4" />
  </LineIcon>
);

const walkerDragStartPixels = 8;

const WalkerButton = ({
  onDropped,
  onTapped,
}: {
  onDropped: (clientX: number, clientY: number) => void;
  onTapped: () => void;
}) => {
  const [ghost, setGhost] = useState<{ x: number; y: number }>();
  const startDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const startedAt = { x: event.clientX, y: event.clientY };
    let isDragging = false;
    const followPointer = (moved: PointerEvent) => {
      isDragging =
        isDragging ||
        Math.hypot(moved.clientX - startedAt.x, moved.clientY - startedAt.y) >
          walkerDragStartPixels;
      if (isDragging) {
        setGhost({ x: moved.clientX, y: moved.clientY });
      }
    };
    const stopDragging = (released: PointerEvent) => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerup", stopDragging);
      setGhost(undefined);
      if (isDragging) {
        onDropped(released.clientX, released.clientY);
        return;
      }
      onTapped();
    };
    window.addEventListener("pointermove", followPointer);
    window.addEventListener("pointerup", stopDragging);
  };
  return (
    <>
      <button
        type="button"
        className="drop-walker"
        aria-label="Drag the walker onto the map to start exploring from there"
        title="Drag me onto the map to start exploring from there"
        onPointerDown={startDragging}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onTapped();
          }
        }}
      >
        <WalkIcon />
      </button>
      {ghost === undefined ? null : (
        <span
          className="walker-ghost"
          aria-hidden="true"
          style={{
            left: `${String(ghost.x)}px`,
            top: `${String(ghost.y)}px`,
          }}
        >
          <WalkIcon />
        </span>
      )}
    </>
  );
};

const describeStarsToUnlock = (starsToUnlock: number) =>
  `${String(starsToUnlock)} more ${starsToUnlock === 1 ? "Star" : "Stars"} to open`;

const ReviewIcon = () => (
  <LineIcon>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </LineIcon>
);

const MissionCard = ({
  missionCard,
  onStarted,
}: {
  missionCard: MissionCardDetails;
  onStarted: (missionGame: MissionGame) => void;
}) => (
  <button
    type="button"
    className={missionCard.isUnlocked ? "mission-card" : "mission-card locked"}
    disabled={!missionCard.isUnlocked}
    onClick={() => {
      onStarted(missionCard);
    }}
  >
    <span className="mission-card-title">{missionCard.title}</span>
    <span className="mission-card-skill">{missionCard.skillName}</span>
    {missionCard.isUnlocked ? null : (
      <span className="mission-card-lock">
        <LockIcon />
        {missionCard.isTurnedOff
          ? "Turned off by a grown-up"
          : describeStarsToUnlock(missionCard.starsToUnlock)}
      </span>
    )}
    {missionCard.isUnlocked && missionCard.mastery !== undefined ? (
      <span className="mastery-badge">
        {describeMasteryForChild(missionCard.mastery)}
      </span>
    ) : null}
    {missionCard.isUnlocked && missionCard.isReviewDue ? (
      <span className="review-marker">
        <ReviewIcon />
        Review waiting
      </span>
    ) : null}
  </button>
);

const describeClosedRegion = ({ access }: RegionOnMap): string =>
  access === "island-locked"
    ? "Ask a grown-up to open this Island"
    : "A grown-up has closed this Region for now";

interface PanelOffset {
  x: number;
  y: number;
}

const panelNudgePixels = 24;
const panelSideGapPixels = 16;
const panelEdgeLeftShowing = 160;
const panelTopLeftShowing = 60;

export const movePanelLabel =
  "Move this panel: tap to swap sides, or use the arrow keys";

const panelNudges: Record<string, PanelOffset | undefined> = {
  ArrowLeft: { x: -panelNudgePixels, y: 0 },
  ArrowRight: { x: panelNudgePixels, y: 0 },
  ArrowUp: { x: 0, y: -panelNudgePixels },
  ArrowDown: { x: 0, y: panelNudgePixels },
};

const keepPanelOnScreen = ({ x, y }: PanelOffset): PanelOffset => ({
  x: Math.min(0, Math.max(-(window.innerWidth - panelEdgeLeftShowing), x)),
  y: Math.min(
    window.innerHeight - panelEdgeLeftShowing,
    Math.max(-panelTopLeftShowing, y),
  ),
});

const regionPanelPositionKey = "region-panel";

const useMovablePanel = () => {
  const [offset, setStoredOffset] = useState<PanelOffset>(() =>
    keepPanelOnScreen(
      loadPopupPosition(regionPanelPositionKey) ?? { x: 0, y: 0 },
    ),
  );
  const setOffset = (
    nextOffset: PanelOffset | ((previous: PanelOffset) => PanelOffset),
  ) => {
    setStoredOffset((previous) => {
      const moved =
        typeof nextOffset === "function" ? nextOffset(previous) : nextOffset;
      storePopupPosition(regionPanelPositionKey, moved);
      return moved;
    });
  };

  const startDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    const grabbedAt = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
    const followPointer = (moved: PointerEvent) => {
      setOffset(
        keepPanelOnScreen({
          x: moved.clientX - grabbedAt.x,
          y: moved.clientY - grabbedAt.y,
        }),
      );
    };
    const stopDragging = () => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerup", stopDragging);
    };
    window.addEventListener("pointermove", followPointer);
    window.addEventListener("pointerup", stopDragging);
  };

  const nudgePanel = (event: ReactKeyboardEvent<HTMLElement>) => {
    const nudge = panelNudges[event.key];
    if (nudge === undefined) {
      return;
    }
    event.preventDefault();
    setOffset((previous) =>
      keepPanelOnScreen({ x: previous.x + nudge.x, y: previous.y + nudge.y }),
    );
  };

  const swapPanelSide = (event: ReactMouseEvent<HTMLElement>) => {
    const panel = event.currentTarget.closest("section");
    if (panel === null) {
      return;
    }
    const leftSideX = -(
      window.innerWidth -
      panel.offsetWidth -
      panelSideGapPixels * 2
    );
    setOffset((previous) =>
      keepPanelOnScreen({
        x: previous.x === 0 ? leftSideX : 0,
        y: previous.y,
      }),
    );
  };

  return { offset, startDragging, nudgePanel, swapPanelSide };
};

const mapDockHeightProperty = "--map-dock-height";

// The Region chips wrap onto as many rows as the screen needs, so the
// Region panel reads the dock's real height to stay clear of it.
const useMapDockHeight = () => {
  const worldMapRef = useRef<HTMLElement>(null);
  const mapDockRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const worldMap = worldMapRef.current;
    const mapDock = mapDockRef.current;
    if (worldMap === null || mapDock === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      worldMap.style.setProperty(
        mapDockHeightProperty,
        `${String(mapDock.offsetHeight)}px`,
      );
    });
    observer.observe(mapDock);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { worldMapRef, mapDockRef };
};

const WorldMapScreen = ({
  limits,
  listRegionCards,
  renderWorldMap,
  renderIslandExplore,
  exploring,
  lastIslandInViewId,
  leftPlace,
  onIslandInViewChanged,
  foundTreasureIds,
  onExploringChanged,
  onTreasureFound,
  onQuestFindPickedUp,
  onQuestPuzzleSolved,
  onStarted,
  onSettings,
  onFinishPlaying,
  ...navProps
}: WorldMapScreenProps) => {
  const islands = buildIslandsOnMap(navProps.yearGroup, limits);
  const homeIsland = findHomeIsland(navProps.yearGroup);
  const [islandInViewId, setIslandInViewId] = useState(
    exploring?.islandId ??
      leftPlace?.islandId ??
      lastIslandInViewId ??
      homeIsland.id,
  );
  const islandInView =
    islands.find(({ id }) => id === islandInViewId) ?? islands[0];
  useEffect(() => {
    onIslandInViewChanged(islandInView.id);
  }, [islandInView.id, onIslandInViewChanged]);
  const everyRegion = buildRegionsOnMap(islands, limits);
  const regions = everyRegion.filter(
    ({ islandId }) => islandId === islandInView.id,
  );
  const guideRegions = [
    ...regions.filter((guideRegion) => !isBigTop(guideRegion)),
    ...regions.filter((guideRegion) => isBigTop(guideRegion)),
  ];
  const { palette } = islandInView.theme;
  const [chosenRegionId, setChosenRegionId] = useState<string | undefined>(
    leftPlace?.islandId === islandInViewId ? leftPlace.regionId : undefined,
  );
  const [hoveredRegionId, setHoveredRegionId] = useState<string>();
  const { isFullScreen, isFullScreenOffered } = useFullScreen();
  const { offset, startDragging, nudgePanel, swapPanelSide } =
    useMovablePanel();
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({
    kind: "none",
  });
  const [weather, setWeather] = useState(() => chooseWeather(Math.random));
  const [isWeatherChosen, setIsWeatherChosen] = useState(false);
  const { worldMapRef, mapDockRef } = useMapDockHeight();
  const [sidePanel, setSidePanel] = useState<SidePanelKind>();
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sidePanelId = useId();
  const closeSidePanel = useCallback(() => {
    setSidePanel(undefined);
  }, []);
  const isRegionPanelOpen = chosenRegionId !== undefined;
  // Back from a Game, the pointer still rests where Back to the map was,
  // often over another Region's chip. Until it moves, it previews nothing,
  // so the panel shows the Region the Child came back to.
  const [hasPointerMoved, setHasPointerMoved] = useState(
    leftPlace === undefined,
  );
  useEffect(() => {
    if (hasPointerMoved) {
      return;
    }
    const notePointerMoved = () => {
      setHasPointerMoved(true);
    };
    window.addEventListener("pointermove", notePointerMoved, { once: true });
    return () => {
      window.removeEventListener("pointermove", notePointerMoved);
    };
  }, [hasPointerMoved]);
  const previewRegion = useCallback(
    (regionId: string | undefined) => {
      if (regionId === undefined || hasPointerMoved) {
        setHoveredRegionId(regionId);
      }
    },
    [hasPointerMoved],
  );

  useEffect(() => {
    if (!isRegionPanelOpen) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("dialog[open]") !== null
      ) {
        return;
      }
      setChosenRegionId(undefined);
      setHoveredRegionId(undefined);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isRegionPanelOpen]);

  const chosenRegion = regions.find(({ id }) => id === chosenRegionId);
  const region =
    regions.find(({ id }) => id === hoveredRegionId) ?? chosenRegion;
  const nextSequence = (previous: CameraCommand) =>
    previous.kind === "none" ? 1 : previous.sequence + 1;
  const sendCameraCommand = (
    kind: "zoom-in" | "zoom-out" | "show-everything",
  ) => {
    setCameraCommand((previous) => ({
      kind,
      sequence: nextSequence(previous),
    }));
  };
  const showIsland = (islandId: string) => {
    setCameraCommand((previous) => ({
      kind: "show-island",
      islandId,
      sequence: nextSequence(previous),
    }));
  };
  const followIslandInView = (islandId: string) => {
    setIslandInViewId(islandId);
    setChosenRegionId(undefined);
    setHoveredRegionId(undefined);
  };
  const [mapVoyage, setMapVoyage] = useState<MapVoyagePlan>();
  const [minimisedGroups, setMinimisedGroups] = useState<
    readonly MapButtonGroup[]
  >(() => loadMinimisedGroups().filter(isMapButtonGroup));
  const [walkerDrop, setWalkerDrop] = useState<WalkerDrop>();
  const [walkerTip, setWalkerTip] = useState<string>();
  const startExploringAt = (islandId: string, point: MapPoint) => {
    setWalkerDrop(undefined);
    setSidePanel(undefined);
    if (limits.isExploringLocked) {
      return;
    }
    const island = islands.find(({ id }) => id === islandId);
    if (
      island === undefined ||
      !canSailTo(island) ||
      !canExploreIsland(limits, island.id)
    ) {
      setWalkerTip("Drop the walker on an Island you can explore.");
      return;
    }
    setWalkerTip(undefined);
    setIslandInViewId(islandId);
    setChosenRegionId(undefined);
    setHoveredRegionId(undefined);
    onExploringChanged({
      islandId,
      enteredRegionId: undefined,
      startAt: point,
    });
  };
  const dropWalker = (clientX: number, clientY: number) => {
    setWalkerDrop((previous) => ({
      clientX,
      clientY,
      sequence: (previous?.sequence ?? 0) + 1,
    }));
  };
  const toggleButtonGroup = (group: MapButtonGroup) => {
    const minimised = minimisedGroups.includes(group)
      ? minimisedGroups.filter((each) => each !== group)
      : [...minimisedGroups, group];
    setMinimisedGroups(minimised);
    storeMinimisedGroups(minimised);
  };
  const mapVoyageIsland = islands.find(
    ({ id }) => id === mapVoyage?.toIslandId,
  );
  const chooseIslandOnMap = (islandId: string) => {
    if (mapVoyage !== undefined) {
      return;
    }
    const chosen = islands.find(({ id }) => id === islandId);
    const isSailable =
      chosen !== undefined &&
      chosen.id !== islandInView.id &&
      canSailTo(chosen) &&
      canSailTo(islandInView);
    if (!isSailable) {
      showIsland(islandId);
      return;
    }
    setChosenRegionId(undefined);
    setHoveredRegionId(undefined);
    setMapVoyage({
      fromIslandId: islandInView.id,
      toIslandId: islandId,
      transport: chooseTransport(),
    });
  };
  const endMapVoyage = () => {
    if (mapVoyage === undefined) {
      return;
    }
    setMapVoyage(undefined);
    setIslandInViewId(mapVoyage.toIslandId);
    showIsland(mapVoyage.toIslandId);
  };

  const exploredIsland =
    exploring === undefined || !canExploreIsland(limits, exploring.islandId)
      ? undefined
      : islands.find(({ id }) => id === exploring.islandId);
  const explorableIslands = islands.filter(
    (island) => canSailTo(island) && canExploreIsland(limits, island.id),
  );
  const canExplore = explorableIslands.some(({ id }) => id === islandInView.id);
  const firstExplorableIsland =
    explorableIslands.find(({ id }) => id === homeIsland.id) ??
    explorableIslands.at(0);
  const exploreIslandInView = () => {
    setChosenRegionId(undefined);
    setHoveredRegionId(undefined);
    onExploringChanged({
      islandId: islandInView.id,
      enteredRegionId: undefined,
    });
  };
  const regionPanel =
    chosenRegion === undefined || region === undefined ? null : (
      <section
        className={region.isUnlocked ? "region-panel" : "region-panel locked"}
        aria-live="polite"
        style={{
          borderColor: palette.accent,
          transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)`,
        }}
      >
        <header className="panel-handle" onPointerDown={startDragging}>
          <h1>Your World Map</h1>
          <button
            type="button"
            className="panel-move"
            aria-label={movePanelLabel}
            onKeyDown={nudgePanel}
            onClick={swapPanelSide}
          >
            <MovePanelIcon />
          </button>
          <button
            type="button"
            className="panel-close"
            aria-label="Close Your World Map"
            onClick={() => {
              setChosenRegionId(undefined);
              setHoveredRegionId(undefined);
            }}
          >
            <CloseIcon />
          </button>
        </header>
        <h2>{region.name}</h2>
        <p className="region-subject">
          {findRegionHeading(region) === undefined ? null : (
            <span className="region-subject-name">
              {findRegionHeading(region)}
            </span>
          )}
          <span className="region-subject-year">
            {islandInView.name} · Year {islandInView.yearGroup}
          </span>
        </p>
        {region.isUnlocked ? (
          <>
            <p className="region-story">{region.story}</p>
            <div className="mission-cards">
              {listRegionCards(region).map((missionCard) => (
                <MissionCard
                  key={missionCard.place.gameId}
                  missionCard={missionCard}
                  onStarted={onStarted}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="region-locked">
            <LockIcon />
            {describeClosedRegion(region)}
          </p>
        )}
        <ReadAloudButton
          className="hear-again"
          readsSection
          fallback={() => {
            void playVoiceOver("mission.choose");
          }}
        />
      </section>
    );

  const openSidePanel = (kind: SidePanelKind) => {
    setChosenRegionId(undefined);
    setHoveredRegionId(undefined);
    setSidePanel((shown) => (shown === kind ? undefined : kind));
  };
  const panelOption = (
    kind: SidePanelKind,
    hint: string,
    icon: ReactNode,
  ): PlayMenuOption => ({
    label: sidePanelTitles[kind],
    hint,
    icon,
    group: "panels",
    sidePanel: { id: sidePanelId, isOpen: sidePanel === kind },
    onChoose: () => {
      openSidePanel(kind);
    },
  });
  const menuOptions: PlayMenuOption[] = [
    panelOption("subject", "Regions and their Subjects", <PinIcon />),
    panelOption("islands", "Every Island and its Year", <GlobeIcon />),
    panelOption("weather", "Change the sky", weatherButtons[weather].icon),
    panelOption("view", "Map, Explore, Wardrobe or Room", <EyeIcon />),
    {
      label: "Settings",
      hint: "Colours and themes",
      icon: <CogIcon />,
      group: "pages",
      onChoose: onSettings,
    },
    ...fullScreenMenuOptions(isFullScreen, isFullScreenOffered),
    {
      label: "Finish playing",
      hint: "End your turn for now",
      icon: <SignOutIcon />,
      group: "finish",
      onChoose: onFinishPlaying,
    },
  ];
  const findSidePanelItems = (kind: SidePanelKind): ReactNode => {
    switch (kind) {
      case "subject":
        return guideRegions.map((guideRegion) => (
          <li key={guideRegion.id}>
            <button
              type="button"
              aria-label={[
                guideRegion.name,
                ...(findRegionHeading(guideRegion) === undefined
                  ? []
                  : [findRegionHeading(guideRegion)]),
                ...(guideRegion.isUnlocked ? [] : ["locked"]),
              ].join(", ")}
              aria-pressed={guideRegion.id === chosenRegion?.id}
              onClick={() => {
                setSidePanel(undefined);
                setChosenRegionId(guideRegion.id);
              }}
            >
              {guideRegion.isUnlocked ? <PinIcon /> : <LockIcon />}
              <span className="play-side-panel-name">{guideRegion.name}</span>
              {findRegionHeading(guideRegion) === undefined ? null : (
                <span className="play-side-panel-detail">
                  {findRegionHeading(guideRegion)}
                </span>
              )}
            </button>
          </li>
        ));
      case "islands":
        return islands.map((island) => (
          <li key={island.id}>
            <button
              type="button"
              aria-label={[
                island.name,
                `Year ${String(island.yearGroup)}`,
                ...(island.isHome ? ["your Island"] : []),
                ...(island.isUnlocked ? [] : ["locked"]),
              ].join(", ")}
              aria-pressed={island.id === islandInView.id}
              disabled={mapVoyage !== undefined}
              onClick={() => {
                setSidePanel(undefined);
                chooseIslandOnMap(island.id);
              }}
            >
              {island.isUnlocked ? <PinIcon /> : <LockIcon />}
              <span className="play-side-panel-name">{island.name}</span>
              <span className="play-side-panel-detail">
                {island.isHome ? (
                  <span className="play-side-panel-tag">Your Island</span>
                ) : null}
                Year {island.yearGroup}
              </span>
            </button>
          </li>
        ));
      case "weather":
        return weatherKinds.map((weatherKind) => (
          <li key={weatherKind}>
            <button
              type="button"
              aria-pressed={weatherKind === weather}
              onClick={() => {
                setWeather(weatherKind);
                setIsWeatherChosen(true);
              }}
            >
              {weatherButtons[weatherKind].icon}
              <span className="play-side-panel-name">
                {weatherButtons[weatherKind].label}
              </span>
            </button>
          </li>
        ));
      case "view":
        return (
          [
            {
              label: "Map",
              icon: <MapIcon />,
              isCurrent: true,
              isOffered: true,
              onChoose: () => {
                showIsland(homeIsland.id);
              },
            },
            {
              label: "Explore",
              icon: <WalkIcon />,
              isCurrent: false,
              isOffered: canExplore && mapVoyage === undefined,
              onChoose: exploreIslandInView,
            },
            {
              label: "Wardrobe",
              icon: <ShirtIcon />,
              isCurrent: false,
              isOffered: true,
              onChoose: navProps.onDressing,
            },
            {
              label: "Room",
              icon: <BedIcon />,
              isCurrent: false,
              isOffered: true,
              onChoose: navProps.onFurnishing,
            },
          ]
            // A Parent's explore locks hide Explore rather than greying it out.
            .filter(({ label }) => label !== "Explore" || canExplore)
            .map(({ label, icon, isCurrent, isOffered, onChoose }) => (
              <li key={label}>
                <button
                  type="button"
                  aria-current={isCurrent ? "page" : undefined}
                  disabled={!isOffered}
                  onClick={() => {
                    setSidePanel(undefined);
                    onChoose();
                  }}
                >
                  {icon}
                  <span className="play-side-panel-name">{label}</span>
                  {label === "Explore" ? (
                    <span className="play-side-panel-detail">
                      {islandInView.name}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
        );
    }
  };
  const sidePanelItems =
    sidePanel === undefined ? null : findSidePanelItems(sidePanel);

  if (exploredIsland !== undefined && exploring !== undefined) {
    return (
      <main className="world-map exploring" ref={worldMapRef}>
        <IslandExplore
          key={exploredIsland.id}
          island={exploredIsland}
          islands={islands}
          regions={regions}
          everyRegion={everyRegion}
          loadout={navProps.rewards.loadout}
          heldVehicleIds={navProps.rewards.heldItemIds}
          soundSettings={limits}
          startNearRegionId={exploring.enteredRegionId}
          startAt={exploring.startAt}
          arrival={exploring.arrival}
          foundTreasureIds={foundTreasureIds}
          renderScene={renderIslandExplore}
          onTreasureFound={onTreasureFound}
          questProgress={navProps.rewards.questProgress}
          onQuestFindPickedUp={onQuestFindPickedUp}
          onQuestPuzzleSolved={onQuestPuzzleSolved}
          onRegionOpened={(regionId) => {
            setChosenRegionId(regionId);
            onExploringChanged({
              islandId: exploredIsland.id,
              enteredRegionId: regionId,
            });
          }}
          canExploreIsland={(islandId) => canExploreIsland(limits, islandId)}
          onSailed={(islandId, arrival) => {
            setIslandInViewId(islandId);
            setChosenRegionId(undefined);
            setHoveredRegionId(undefined);
            onExploringChanged({
              islandId,
              enteredRegionId: undefined,
              arrival,
            });
          }}
          onLeave={() => {
            setChosenRegionId(undefined);
            onExploringChanged(undefined);
          }}
        />
        {regionPanel}
      </main>
    );
  }

  return (
    <main className="world-map" ref={worldMapRef}>
      {renderWorldMap({
        islands,
        islandInViewId: islandInView.id,
        regions,
        selectedRegionId: chosenRegion?.id,
        hoveredRegionId,
        cameraCommand,
        weather,
        isWeatherChosen,
        onRegionChosen: setChosenRegionId,
        onRegionHovered: previewRegion,
        onIslandChosen: chooseIslandOnMap,
        onIslandInView: followIslandInView,
        voyage: mapVoyage,
        onVoyageEnded: endMapVoyage,
        walkerDrop,
        onWalkerDropped: startExploringAt,
        foundTreasureIds,
        questProgress: navProps.rewards.questProgress,
      })}
      <PlayNav
        {...navProps}
        shownScreen="world-map"
        onWorldMap={() => {
          showIsland(homeIsland.id);
        }}
        onExplore={
          firstExplorableIsland === undefined
            ? undefined
            : () => {
                setMapVoyage(undefined);
                if (canExplore) {
                  exploreIslandInView();
                  return;
                }
                setIslandInViewId(firstExplorableIsland.id);
                onExploringChanged({
                  islandId: firstExplorableIsland.id,
                  enteredRegionId: undefined,
                });
              }
        }
        menu={<PlayMenu options={menuOptions} toggleRef={menuToggleRef} />}
      />
      {regionPanel}
      {sidePanel === undefined ? null : (
        <PlaySidePanel
          key={sidePanel}
          id={sidePanelId}
          title={sidePanelTitles[sidePanel]}
          returnFocusRef={menuToggleRef}
          onClose={closeSidePanel}
        >
          {sidePanelItems}
        </PlaySidePanel>
      )}
      <div className="map-dock" ref={mapDockRef}>
        <nav className="region-guide" aria-label="Regions">
          <MinimisableButtons
            group="regions"
            isMinimised={minimisedGroups.includes("regions")}
            onToggled={toggleButtonGroup}
          >
            {guideRegions.map((guideRegion) => (
              <button
                key={guideRegion.id}
                type="button"
                className="region-chip"
                aria-pressed={guideRegion.id === chosenRegion?.id}
                aria-label={[
                  guideRegion.name,
                  ...(findRegionHeading(guideRegion) === undefined
                    ? []
                    : [findRegionHeading(guideRegion)]),
                  ...(guideRegion.isUnlocked ? [] : ["locked"]),
                ].join(", ")}
                onClick={() => {
                  setChosenRegionId(guideRegion.id);
                }}
                onPointerEnter={() => {
                  previewRegion(guideRegion.id);
                }}
                onPointerLeave={() => {
                  setHoveredRegionId(undefined);
                }}
                onFocus={(event) => {
                  event.currentTarget.scrollIntoView({
                    block: "nearest",
                    inline: "nearest",
                  });
                  setHoveredRegionId(guideRegion.id);
                }}
                onBlur={() => {
                  setHoveredRegionId(undefined);
                }}
              >
                {guideRegion.isUnlocked ? <PinIcon /> : <LockIcon />}
                {guideRegion.name}
                {findRegionHeading(guideRegion) === undefined ? null : (
                  <span className="region-chip-subject" aria-hidden="true">
                    {findRegionHeading(guideRegion)}
                  </span>
                )}
              </button>
            ))}
          </MinimisableButtons>
        </nav>
      </div>
      {mapVoyage === undefined || mapVoyageIsland === undefined ? null : (
        <MovablePopup
          positionKey="map-voyage"
          className="explore-voyage map-voyage"
          aria-label="Voyage"
        >
          <p role="status" aria-live="polite">
            {describeMapJourney(mapVoyage.transport, mapVoyageIsland.name)}
          </p>
          <button
            type="button"
            className="explore-action explore-fast-forward"
            aria-label={`Fast forward: go straight to ${mapVoyageIsland.name}`}
            onClick={endMapVoyage}
          >
            <FastForwardIcon />
            Fast forward
          </button>
        </MovablePopup>
      )}
      {mapVoyage === undefined ? (
        <div className="explore-launchers">
          {firstExplorableIsland === undefined ? null : (
            <WalkerButton
              onDropped={dropWalker}
              onTapped={() => {
                setWalkerTip(
                  "Drag the walker onto the map to start exploring from there.",
                );
              }}
            />
          )}
          {canExplore ? (
            <button
              type="button"
              className="explore-island"
              onClick={exploreIslandInView}
            >
              <WalkIcon />
              <span>Explore {islandInView.name}</span>
            </button>
          ) : null}
        </div>
      ) : null}
      {walkerTip === undefined ? null : (
        <p className="walker-tip" role="status" aria-live="polite">
          {walkerTip}
        </p>
      )}
      <div className="map-controls">
        <div className="map-zoom" role="group" aria-label="Move around the map">
          <MinimisableButtons
            group="map"
            isMinimised={minimisedGroups.includes("map")}
            onToggled={toggleButtonGroup}
          >
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => {
                sendCameraCommand("zoom-in");
              }}
            >
              <ZoomInIcon />
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => {
                sendCameraCommand("zoom-out");
              }}
            >
              <ZoomOutIcon />
            </button>
            <button
              type="button"
              aria-label="See the whole map"
              onClick={() => {
                sendCameraCommand("show-everything");
              }}
            >
              <WholeMapIcon />
            </button>
            {isFullScreenOffered ? (
              <button
                type="button"
                aria-label="Full screen"
                aria-pressed={isFullScreen}
                onClick={() => {
                  void toggleFullScreen();
                }}
              >
                {isFullScreen ? <ExitFullScreenIcon /> : <FullScreenIcon />}
              </button>
            ) : null}
          </MinimisableButtons>
        </div>
      </div>
    </main>
  );
};

interface MissionHudProps {
  view: PlayingView;
  question: MissionQuestion;
  level: YearGroup;
  onListenAgain: () => void;
}

const NumberSentence = ({
  sentence,
  isWordy = false,
}: {
  sentence: string;
  isWordy?: boolean;
}) => (
  <p className={isWordy ? "number-sentence wordy" : "number-sentence"}>
    {sentence.split(" ").flatMap((token, index) => [
      index === 0 ? null : " ",
      <span
        key={index}
        className={token === "?" ? "number-token missing" : "number-token"}
      >
        {token}
      </span>,
    ])}
  </p>
);

const ProgressTrack = ({
  activityCount,
  questionCount,
  progress,
}: {
  activityCount: number;
  questionCount: number;
  progress: MissionProgress;
}) => (
  <div className="progress-track" aria-hidden="true">
    {Array.from({ length: activityCount }, (_, activityIndex) => (
      <span key={activityIndex} className="progress-activity">
        {Array.from({ length: questionCount }, (_, questionIndex) => {
          const isDone =
            activityIndex < progress.activityIndex ||
            (activityIndex === progress.activityIndex &&
              questionIndex < progress.questionIndex);
          const isCurrent =
            activityIndex === progress.activityIndex &&
            questionIndex === progress.questionIndex;
          return (
            <span
              key={questionIndex}
              className={
                isDone
                  ? "progress-step done"
                  : isCurrent
                    ? "progress-step current"
                    : "progress-step"
              }
            />
          );
        })}
      </span>
    ))}
  </div>
);

const PlaySoundButton = ({ question }: { question: MissionQuestion }) => (
  <button
    type="button"
    className="play-sound"
    onClick={() => {
      playQuestionPrompt(question);
    }}
  >
    <SpeakerIcon />
    Play the sound
  </button>
);

const GapToken = () => (
  <span className="number-token missing" aria-label="gap">
    ?
  </span>
);

const startsWithPunctuation = (text: string) => /^[.,!?;:”)]/.test(text);

const SentenceWithGap = ({
  before,
  after,
}: {
  before: string;
  after: string;
}) => (
  <p className="mission-ask sentence">
    {before === "" ? null : `${before} `}
    <GapToken />
    {after === "" || startsWithPunctuation(after) ? after : ` ${after}`}
  </p>
);

const EnglishAsk = ({ prompt }: { prompt: EnglishPrompt }) => {
  switch (prompt.kind) {
    case "sequence":
      return (
        <p className="mission-ask">
          {prompt.items.map((item, index) =>
            item === gapMark ? (
              <GapToken key={index} />
            ) : (
              <span key={index} className="number-token">
                {item}
              </span>
            ),
          )}
        </p>
      );
    case "word-link":
      return (
        <p className="mission-ask">
          {wordLinkPhrases[prompt.link]}{" "}
          <strong className="asked-word">{prompt.word}</strong>
        </p>
      );
    case "clue":
      return (
        <p className="mission-ask">
          <strong className="asked-word">{prompt.clue}</strong>
        </p>
      );
    case "word-sum":
      return (
        <p className="mission-ask">
          {prompt.parts.map((part, index) => (
            <span key={index} className="word-sum-part">
              {index === 0 ? null : <span aria-hidden="true">+ </span>}
              <span className="number-token">{part}</span>
            </span>
          ))}
        </p>
      );
    case "sentence-gap":
      return <SentenceWithGap before={prompt.before} after={prompt.after} />;
    case "word-class":
      return (
        <div className="mission-ask-stack">
          <p className="mission-ask">
            Find the{" "}
            <strong className="asked-word">
              {describeWordClass(prompt.wordClass)}
            </strong>
          </p>
          <p className="mission-ask sentence">{prompt.sentence}</p>
        </div>
      );
    case "passage":
      return (
        <div className="mission-ask-stack">
          <section
            className="story-passage"
            aria-label={prompt.title}
            tabIndex={0}
          >
            <h2 className="story-title">{prompt.title}</h2>
            {prompt.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>
          <p className="mission-ask story-question">{prompt.question}</p>
        </div>
      );
    case "story-plan":
      return (
        <div className="mission-ask-stack">
          <p className="mission-ask story-question">{prompt.task}</p>
          <ol className="story-steps">
            {prompt.steps.map((step, index) => (
              <li key={index}>{step === gapMark ? <GapToken /> : step}</li>
            ))}
          </ol>
        </div>
      );
  }
};

const MissionAsk = ({ question }: { question: MissionQuestion }) => {
  const { prompt } = question;
  switch (prompt.kind) {
    case "number-bond":
      return <NumberSentence sentence={describeNumberBond(prompt)} />;
    case "sound":
      return <PlaySoundButton question={question} />;
    case "count":
      return <p className="mission-ask">How many fish?</p>;
    case "one-more-one-less":
      return (
        <NumberSentence sentence={describeOneMoreOneLess(prompt)} isWordy />
      );
    case "shape":
      return (
        <p className="mission-ask">
          Find the <strong className="asked-word">{prompt.shape}</strong>
        </p>
      );
    case "capital-letter":
      return (
        <p className="mission-ask">
          Capital of{" "}
          <span className="number-token asked-letter">
            {prompt.smallLetter}
          </span>
        </p>
      );
    case "english":
      return <EnglishAsk prompt={prompt.english} />;
    case "music":
      return <p className="mission-ask">{prompt.music.ask}</p>;
    case "computing":
      return <p className="mission-ask computing-ask">{prompt.ask}</p>;
    case "geography":
      return <p className="mission-ask geography-ask">{prompt.ask}</p>;
    case "lab":
      return (
        <p className="mission-ask science-ask">
          {prompt.station === "true-false" ? (
            <span className="science-ask-tag">True or false?</span>
          ) : null}
          {prompt.ask}
        </p>
      );
    case "phonics-word":
      return (
        <p className="mission-ask">
          {prompt.ask}
          <span className="visually-hidden">
            {" "}
            {describePhonicsWord(prompt)}
          </span>
        </p>
      );
    case "history":
      return prompt.play === "sort" ? (
        <p className="mission-ask history-ask">
          Where does this go?{" "}
          <strong className="asked-word">{prompt.ask}</strong>
        </p>
      ) : (
        <p className="mission-ask history-ask">{prompt.ask}</p>
      );
    case "shape-property":
      return (
        <p className="mission-ask">
          Find the shape with{" "}
          <strong className="asked-word">
            {describeShapeProperty(prompt)}
          </strong>
        </p>
      );
    case "addition":
      return <NumberSentence sentence={describeAddition(prompt)} />;
    case "taking-away":
      return <NumberSentence sentence={describeTakingAway(prompt)} />;
    case "sequence":
      return <NumberSentence sentence={describeSequence(prompt)} />;
    case "missing-number":
      return <NumberSentence sentence={prompt.sentence} />;
    case "more-or-less":
      return <NumberSentence sentence={describeMoreOrLess(prompt)} isWordy />;
    case "height-extreme":
      return (
        <p className="mission-ask">
          Find the <strong className="asked-word">{prompt.extreme}</strong>{" "}
          coral
        </p>
      );
    case "height-measure":
      return (
        <p className="mission-ask">
          How tall is the coral
          {Number.isInteger(prompt.measure.centimetres)
            ? "?"
            : ", in millimetres?"}
        </p>
      );
    case "fraction":
      return (
        <p className="mission-ask">
          Find{" "}
          <strong className="asked-word">
            {prompt.fraction.askedAs === prompt.fraction.target
              ? describeFraction(prompt.fraction.target)
              : prompt.fraction.askedAs}
          </strong>
        </p>
      );
    case "clock":
      return <ClockAsk clock={prompt.clock} />;
    case "place-value":
      return <p className="mission-ask">What number do the counters make?</p>;
    case "temperature":
      return (
        <p className="mission-ask">
          It is {formatNumber(prompt.temperature.start)}°C. It{" "}
          {prompt.temperature.change > 0 ? "rises" : "falls"} by{" "}
          <strong className="asked-word">
            {Math.abs(prompt.temperature.change)}°
          </strong>
          . What is it now?
        </p>
      );
    case "polygon-clue":
      return <p className="mission-ask">{prompt.clue}</p>;
    case "net":
      return <p className="mission-ask">Which 3-D shape does this net make?</p>;
    case "fair-share":
    case "treasure-map":
    case "chart":
      return <p className="mission-ask story-ask">{prompt.ask}</p>;
    case "block-measure":
      return (
        <p className="mission-ask">
          What is the{" "}
          <strong className="asked-word">{prompt.block.kind}</strong>?
        </p>
      );
  }
};

const ClockAsk = ({ clock }: { clock: ClockQuestion }) => {
  const { ask } = clock;
  switch (ask.kind) {
    case "read":
      return <p className="mission-ask">What time is it?</p>;
    case "twenty-four-hour":
      return (
        <p className="mission-ask">
          It is {describePartOfDay(ask.isAfternoon, clock.time)}. What is the{" "}
          <strong className="asked-word">24-hour</strong> time?
        </p>
      );
    case "later":
      return (
        <p className="mission-ask">
          It is {describeClockTime(clock.time)}{" "}
          {describePartOfDay(ask.isAfternoon, clock.time)}. What time will it be
          in <strong className="asked-word">{ask.minutesLater} minutes</strong>?
        </p>
      );
    case "until":
      return (
        <p className="mission-ask">
          How long from the clock until{" "}
          <strong className="asked-word">{ask.untilTime}</strong>?
        </p>
      );
  }
};

const MissionHud = ({
  view,
  question,
  level,
  onListenAgain,
}: MissionHudProps) => {
  const { mission, progress, feedback } = view;
  const feedbackText =
    feedback.kind === "right"
      ? `Well done! ${feedback.fact ?? `That's ${String(view.popCount)} right.`}`
      : feedback.kind === "wrong"
        ? feedback.hint
        : undefined;
  const activityCount = mission.activities.length;
  const questionCount =
    mission.activities[progress.activityIndex].questions.length;

  return (
    <div className="mission-hud">
      <div className="mission-prompt">
        <MissionAsk question={question} />
        <ReadAloudButton
          className="hear-again"
          isLabelShown={false}
          text={describeQuestionAloud(question)}
          fallback={() => {
            void playVoiceOver(
              findSpokenPrompt(question) ?? findInstructionKey(mission, level),
            );
          }}
        />
      </div>
      {question.prompt.kind === "music" &&
      question.prompt.music.clips.length > 0 ? (
        <button type="button" className="play-sound" onClick={onListenAgain}>
          <MusicNoteIcon />
          Listen again
        </button>
      ) : null}
      <p className="mission-instruction">
        {findInstructionText(mission, level)}
      </p>
      <div className="mission-feedback-row">
        <p className={`mission-feedback ${feedback.kind}`} role="status">
          {feedbackText}
        </p>
        {feedbackText === undefined ? null : (
          <ReadAloudButton
            className="read-aloud is-small"
            text={feedbackText}
          />
        )}
      </div>
      <ProgressTrack
        activityCount={activityCount}
        questionCount={questionCount}
        progress={progress}
      />
      <p className="mission-progress">
        Activity {progress.activityIndex + 1} of {activityCount}, question{" "}
        {progress.questionIndex + 1} of {questionCount}
      </p>
    </div>
  );
};

interface CelebrationProps {
  characterName: string;
  soundSettings: SoundSettings;
  skillIds: readonly string[];
  rewards: ChildRewards;
  rewardsAtStart: ChildRewards;
  onOneMoreGo: () => void;
  onChooseAgain: () => void;
}

const Celebration = ({
  characterName,
  soundSettings,
  skillIds,
  rewards,
  rewardsAtStart,
  onOneMoreGo,
  onChooseAgain,
}: CelebrationProps) => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [celebrationEffect] = useState(() =>
    findCelebrationEffect(rewards, rewardsAtStart),
  );
  const [soundSettingsAtStart] = useState(soundSettings);
  useEffect(() => {
    if (celebrationEffect !== undefined) {
      playSoundEffect(celebrationEffect, soundSettingsAtStart);
    }
  }, [celebrationEffect, soundSettingsAtStart]);
  const today = getLocalDate(new Date());
  const starsEarned = rewards.stars - rewardsAtStart.stars;
  const newItems = catalogue.filter(
    ({ id }) =>
      rewards.heldItemIds.includes(id) &&
      !rewardsAtStart.heldItemIds.includes(id),
  );

  return (
    <div className="celebration">
      <div className="celebration-card" data-read-aloud-section>
        <div className="celebration-medal">
          <StarIcon />
        </div>
        <h1 ref={heading} tabIndex={-1}>
          Hooray! You finished the Mission!
        </h1>
        <div className="celebration-character">
          <CharacterPreview
            characterName={characterName}
            loadout={rewards.loadout}
            showOffCount={1}
          />
        </div>
        <ReadAloudButton readsSection />
        <p className="stars-earned">
          <StarIcon /> You earned {starsEarned}{" "}
          {starsEarned === 1 ? "Star" : "Stars"}!
        </p>
        {newItems.length === 0 ? null : (
          <p className="new-items">
            New in your wardrobe: {newItems.map(({ name }) => name).join(", ")}
          </p>
        )}
        <ul className="mission-mastery-list">
          {skills
            .filter(({ id }) => skillIds.includes(id))
            .map((skill) => (
              <li key={skill.id} className="mission-mastery">
                {skill.name}:{" "}
                {describeMasteryForChild(
                  buildSkillMastery(skill, rewards.practiceDays, today),
                )}
              </li>
            ))}
        </ul>
        <p className="celebration-question">Would you like one more go?</p>
        <div className="celebration-actions">
          <button
            type="button"
            className="celebration-again"
            onClick={onOneMoreGo}
          >
            <ReplayIcon />
            One more go
          </button>
          <button
            type="button"
            className="celebration-map"
            onClick={onChooseAgain}
          >
            <MapIcon />
            Back to the World Map
          </button>
        </div>
      </div>
    </div>
  );
};

const findSkill = (skillId: string): Skill => {
  const skill = skills.find(({ id }) => id === skillId);
  if (skill === undefined) {
    throw new Error(`the curriculum has no Skill "${skillId}"`);
  }
  return skill;
};

interface RegionCardParts {
  rewards: ChildRewards;
  limits: ChildLimits;
  listenAndPickSkills: readonly Skill[];
  today: string;
}

const listRegionCards = (
  region: Region,
  { rewards, limits, listenAndPickSkills, today }: RegionCardParts,
): MissionCardDetails[] => {
  const yearGroup = findIslandYear(region);
  const listenAndPickMastery = buildMastery(
    listenAndPickSkills,
    rewards.practiceDays,
    today,
  );
  return listGamesOnMap(
    region,
    rewards.regionProgress,
    limits,
    rewardRules.starsPerGameUnlock,
  ).flatMap((gameOnMap: GameOnMap): MissionCardDetails[] => {
    const cardContent = findGameCardContent(gameOnMap, yearGroup);
    if (
      cardContent === undefined ||
      (gameOnMap.gameType === "listen-and-pick" &&
        listenAndPickSkills.length === 0)
    ) {
      return [];
    }
    const skill =
      cardContent.skillId === undefined
        ? undefined
        : findSkill(cardContent.skillId);
    const mastery =
      skill === undefined
        ? undefined
        : buildSkillMastery(skill, rewards.practiceDays, today);
    return [
      {
        ...cardContent.content,
        yearGroup,
        place: {
          islandId: region.islandId,
          regionId: region.id,
          gameId: gameOnMap.id,
        },
        title: cardContent.title,
        skillName: cardContent.skillName ?? skill?.name ?? "",
        mastery,
        isReviewDue:
          skill === undefined
            ? gameOnMap.gameType === "listen-and-pick" &&
              listenAndPickMastery.some(
                ({ state }) => state === "due-for-review",
              )
            : mastery?.state === "due-for-review",
        isUnlocked: gameOnMap.isUnlocked,
        isTurnedOff: gameOnMap.isTurnedOff,
        starsToUnlock: gameOnMap.starsToUnlock,
      },
    ];
  });
};

const findIslandYear = ({ islandId }: Pick<Region, "islandId">): YearGroup =>
  (worldMap.islands.find(({ id }) => id === islandId) ?? findHomeIsland(null))
    .yearGroup;

const listPlayableListenAndPickSkills = (
  phonicsProgramme: PhonicsProgramme | undefined,
  recordedSounds: ReadonlySet<PhonicsSound>,
) =>
  phonicsProgramme === undefined
    ? []
    : listListenAndPickSkills({ phonicsProgramme, skills, recordedSounds });

const findViewYear = (view: MissionView, homeYear: YearGroup): YearGroup =>
  view.kind === "playing" ||
  view.kind === "puzzling" ||
  view.kind === "checking" ||
  view.kind === "celebrating"
    ? view.missionGame.yearGroup
    : homeYear;

const findViewPlace = (view: MissionView): GamePlace | undefined =>
  view.kind === "playing" ||
  view.kind === "puzzling" ||
  view.kind === "checking" ||
  view.kind === "celebrating"
    ? view.missionGame.place
    : undefined;

const findCelebrationEffect = (
  rewards: ChildRewards,
  rewardsAtStart: ChildRewards,
): SoundEffect | undefined => {
  const countUnlocks = ({ heldItemIds, regionProgress }: ChildRewards) =>
    heldItemIds.length +
    regionProgress.reduce(
      (unlocks, { unlockedGameIds }) => unlocks + unlockedGameIds.length,
      0,
    );
  if (countUnlocks(rewards) > countUnlocks(rewardsAtStart)) {
    return "unlock";
  }
  return rewards.stars > rewardsAtStart.stars ? "star" : undefined;
};

const findMissionPageTitle = (
  view: MissionView,
  characterName: string,
  level: YearGroup,
) => {
  if (view.kind === "choosing") {
    return "Your World Map";
  }
  if (view.kind === "dressing") {
    return `${characterName}'s wardrobe`;
  }
  if (view.kind === "furnishing") {
    return `${characterName}'s Room`;
  }
  if (view.kind === "settings") {
    return "Settings";
  }
  if (view.kind === "celebrating") {
    return "Mission finished";
  }
  if (view.kind === "checking") {
    return checkFormats[view.gameType].title;
  }
  return view.kind === "puzzling"
    ? puzzleTitles[view.gameType]
    : findMissionTitle(view.mission, level);
};

interface MissionScreenProps extends MissionPlayProps {
  view: MissionView;
  setView: Dispatch<SetStateAction<MissionView>>;
}

// Finish playing has its own button everywhere but the World Map,
// exploring, the Wardrobe and the Room, which offer it from the Menu.
const isFinishPlayingInMenu = (view: MissionView): boolean =>
  view.kind === "choosing" ||
  view.kind === "dressing" ||
  view.kind === "furnishing";

export const MissionPlay = (missionPlayProps: MissionPlayProps) => {
  const [view, setView] = useState<MissionView>({ kind: "choosing" });
  return (
    <>
      <MissionScreen {...missionPlayProps} view={view} setView={setView} />
      {isFinishPlayingInMenu(view) ? null : (
        <FinishPlayingButton onFinish={missionPlayProps.finishPlaying} />
      )}
    </>
  );
};

const MissionScreen = ({
  view,
  setView,
  child,
  rewards,
  familyChestActivityCount,
  siblings,
  recordPractice,
  recordCheck,
  buyItem,
  dressCharacter,
  saveOutfit,
  wearOutfit,
  furnishRoom,
  pickUpQuestFind,
  solveQuestPuzzle,
  renderScene,
  renderWorldMap,
  renderIslandExplore,
  recordedSounds,
  finishPlaying,
}: MissionScreenProps) => {
  const [exploring, setExploring] = useState<Exploring>();
  const pageMenuToggleRef = useRef<HTMLButtonElement>(null);
  const [lastIslandInViewId, setLastIslandInViewId] = useState<string>();
  const [foundTreasureIds, setFoundTreasureIds] = useState<string[]>([]);
  const level = findViewYear(view, findHomeIsland(child.yearGroup).yearGroup);
  const cueMusic = useMusicCues();
  usePageTitle(findMissionPageTitle(view, child.characterName, level));
  const viewPlace = findViewPlace(view);
  useRegionTune(
    viewPlace === undefined
      ? undefined
      : findIsland(viewPlace.islandId)?.theme.music,
    viewPlace?.regionId,
    child.limits.isMusicMuted,
  );
  const today = getLocalDate(new Date());
  const phonicsProgramme = phonicsProgrammes.find(
    ({ id }) => id === child.phonicsProgrammeId,
  );

  const buildMission = ({
    gameType,
    phonicsGame,
    yearGroup,
    labGame,
    geographyGame,
    historyQuest,
  }: QuestionMissionGame): Mission | undefined => {
    if (isComputingGameType(gameType)) {
      return buildComputingMission(gameType, missionParts);
    }
    if (gameType === "geography-games") {
      return geographyGame === undefined
        ? undefined
        : buildGeographyGameMission(geographyGame, missionParts);
    }
    if (isMusicGameType(gameType)) {
      return buildMusicMission(gameType, missionParts);
    }
    if (gameType === "history-quest") {
      return historyQuest === undefined
        ? undefined
        : buildHistoryQuestMission(historyQuest, missionParts);
    }
    if (isEnglishGameType(gameType)) {
      return buildEnglishMission(gameType, yearGroup, missionParts);
    }
    if (gameType === "science-lab") {
      return labGame === undefined
        ? undefined
        : buildLabMission(labGame, missionParts);
    }
    if (gameType === "phonics-games") {
      return phonicsGame === undefined
        ? undefined
        : buildPhonicsGameMission(phonicsGame, missionParts);
    }
    if (isMathsGameType(gameType)) {
      return buildMathsMission(gameType, {
        ...missionParts,
        level: yearGroup,
      });
    }
    if (isMathsExtraGameType(gameType)) {
      return buildMathsExtraMission(gameType, {
        ...missionParts,
        level: yearGroup,
      });
    }
    if (gameType === "letter-match") {
      return buildLetterMatchMission(missionParts);
    }
    return phonicsProgramme === undefined
      ? undefined
      : buildListenAndPickMission({
          ...missionParts,
          phonicsProgramme,
          skills,
          practiceDays: rewards.practiceDays,
          recordedSounds,
          today,
        });
  };

  const startPlaying = (missionGame: MissionGame) => {
    const { gameType } = missionGame;
    if (isCheckGameType(gameType)) {
      setView((previous) => ({
        kind: "checking",
        gameType,
        missionGame,
        rewardsAtStart: rewards,
        round: previous.kind === "celebrating" ? 1 : 0,
      }));
      return;
    }
    if (isPuzzleGameType(gameType)) {
      setView((previous) => ({
        kind: "puzzling",
        gameType,
        missionGame,
        rewardsAtStart: rewards,
        round: previous.kind === "celebrating" ? 1 : 0,
      }));
      return;
    }
    const mission = buildMission({ ...missionGame, gameType });
    if (mission === undefined) {
      return;
    }
    const [firstActivity] = mission.activities;
    const [firstQuestion] = firstActivity.questions;
    const missionYear = missionGame.yearGroup;
    if (firstQuestion.prompt.kind === "music") {
      cueMusic([
        { kind: "voice", key: findInstructionKey(mission, missionYear) },
        { kind: "pause", seconds: 0.3 },
        { kind: "music", clips: firstQuestion.prompt.music.clips },
      ]);
    } else {
      void playVoiceOver(
        findSpokenPrompt(firstQuestion) ??
          findInstructionKey(mission, missionYear),
      );
    }
    setView({
      kind: "playing",
      mission,
      missionGame,
      rewardsAtStart: rewards,
      progress: startMission(readTapTime()),
      feedback: { kind: "none" },
      companionMood: "waiting",
      poppedChoiceIndex: undefined,
      popCount: 0,
    });
  };

  const childStartIsland = findFirstExplorableIsland(
    child.yearGroup,
    child.limits,
  );
  const navProps = {
    characterName: child.characterName,
    yearGroup: child.yearGroup,
    rewards,
    familyChestActivityCount,
    soundSettings: child.limits,
    onExplore:
      childStartIsland === undefined
        ? undefined
        : () => {
            cueMusic([]);
            setExploring({
              islandId: childStartIsland.id,
              enteredRegionId: undefined,
            });
            setView({ kind: "choosing" });
          },
    onDressing: () => {
      setView({ kind: "dressing" });
    },
    onFurnishing: () => {
      setView({ kind: "furnishing" });
    },
  };
  const showWorldMap = () => {
    cueMusic([]);
    setView({ kind: "choosing" });
  };
  // Leaving a Game opens its Region's panel again, to choose another Game.
  const leaveGame = () => {
    cueMusic([]);
    setView({ kind: "choosing", leftPlace: findViewPlace(view) });
  };
  const leaveButton = (
    <button
      type="button"
      className="leave-mission"
      aria-label="Back to the map"
      onClick={leaveGame}
    >
      <MapIcon />
      <span>Back to the map</span>
    </button>
  );

  const { isFullScreen, isFullScreenOffered } = useFullScreen();
  const pageMenu = (
    <PlayMenu
      options={[
        {
          label: "World Map",
          hint: "Back to the Islands",
          icon: <MapIcon />,
          group: "pages",
          onChoose: showWorldMap,
        },
        {
          label: "Settings",
          hint: "Colours and themes",
          icon: <CogIcon />,
          group: "pages",
          onChoose: () => {
            setView({ kind: "settings" });
          },
        },
        ...fullScreenMenuOptions(isFullScreen, isFullScreenOffered),
        {
          label: "Finish playing",
          hint: "End your turn for now",
          icon: <SignOutIcon />,
          group: "finish",
          onChoose: finishPlaying,
        },
      ]}
      toggleRef={pageMenuToggleRef}
    />
  );

  if (view.kind === "dressing") {
    return (
      <div className="wardrobe-screen">
        <PlayNav
          {...navProps}
          shownScreen="wardrobe"
          onWorldMap={showWorldMap}
          menu={pageMenu}
        />
        <Wardrobe
          characterName={child.characterName}
          rewards={rewards}
          siblings={siblings}
          today={today}
          onBuy={buyItem}
          onDress={dressCharacter}
          onSaveOutfit={saveOutfit}
          onWearOutfit={wearOutfit}
          onClose={showWorldMap}
        />
      </div>
    );
  }

  if (view.kind === "furnishing") {
    return (
      <div className="wardrobe-screen">
        <PlayNav
          {...navProps}
          shownScreen="room"
          onWorldMap={showWorldMap}
          menu={pageMenu}
        />
        <Room
          childId={child.id}
          characterName={child.characterName}
          rewards={rewards}
          siblings={siblings}
          canVisitClassmates={child.classmateVisitsAllowed}
          today={today}
          soundSettings={child.limits}
          onBuy={buyItem}
          onFurnish={furnishRoom}
          onClose={showWorldMap}
        />
      </div>
    );
  }

  if (view.kind === "settings") {
    return (
      <div className="wardrobe-screen settings-screen">
        <PlayNav
          {...navProps}
          shownScreen="settings"
          onWorldMap={showWorldMap}
        />
        <main className="settings">
          <div className="full-view">
            <SettingsPage />
          </div>
        </main>
      </div>
    );
  }

  if (view.kind === "choosing") {
    return (
      <WorldMapScreen
        {...navProps}
        onSettings={() => {
          setView({ kind: "settings" });
        }}
        onFinishPlaying={finishPlaying}
        limits={child.limits}
        renderWorldMap={renderWorldMap}
        renderIslandExplore={renderIslandExplore}
        exploring={exploring}
        lastIslandInViewId={lastIslandInViewId}
        leftPlace={view.leftPlace}
        onIslandInViewChanged={setLastIslandInViewId}
        foundTreasureIds={foundTreasureIds}
        onExploringChanged={setExploring}
        onTreasureFound={(treasureId) => {
          setFoundTreasureIds((found) =>
            found.includes(treasureId) ? found : [...found, treasureId],
          );
        }}
        onQuestFindPickedUp={pickUpQuestFind}
        onQuestPuzzleSolved={solveQuestPuzzle}
        listRegionCards={(region) =>
          listRegionCards(region, {
            rewards,
            limits: child.limits,
            listenAndPickSkills: listPlayableListenAndPickSkills(
              phonicsProgramme,
              recordedSounds,
            ),
            today,
          })
        }
        onStarted={startPlaying}
      />
    );
  }

  if (view.kind === "puzzling") {
    return (
      <main className="mission puzzle-mission">
        <PuzzlePlay
          key={`${view.gameType}-${String(view.round)}`}
          gameType={view.gameType}
          yearGroup={level}
          random={missionParts.random}
          buildId={missionParts.buildId}
          readTime={readTapTime}
          recordPractice={(practiceRecord) => {
            recordPractice(practiceRecord, view.missionGame.place);
          }}
          leaveButton={leaveButton}
          onSolved={() => {
            void playVoiceOver("mission.finished");
            setView({
              kind: "celebrating",
              missionGame: view.missionGame,
              skillIds: [findPuzzleSkillId(view.gameType, level)],
              rewardsAtStart: view.rewardsAtStart,
            });
          }}
        />
      </main>
    );
  }

  if (view.kind === "checking") {
    const { place } = view.missionGame;
    return (
      <main className="mission puzzle-mission check-mission">
        <CheckPlay
          key={`${view.gameType}-${String(view.round)}`}
          gameType={view.gameType}
          phonicsProgramme={phonicsProgramme}
          yearGroup={level}
          isClockOff={child.limits.isCheckClockOff}
          random={missionParts.random}
          buildId={missionParts.buildId}
          readTime={readTapTime}
          spokenWord={checkSpokenWord}
          recordPractice={(practiceRecord) => {
            recordPractice(practiceRecord, place);
          }}
          recordCheck={(checkResult) => {
            recordCheck(checkResult, place);
          }}
          leaveButton={leaveButton}
          onFinished={(skillIds) => {
            void playVoiceOver("mission.finished");
            setView({
              kind: "celebrating",
              missionGame: view.missionGame,
              skillIds,
              rewardsAtStart: view.rewardsAtStart,
            });
          }}
        />
      </main>
    );
  }

  if (view.kind === "celebrating") {
    const { gameType, phonicsGame, historyQuest, geographyGame } =
      view.missionGame;
    return (
      <main className="mission">
        {isCheckGameType(gameType) ? (
          <div className={`check-stage ${gameType}`} aria-hidden="true" />
        ) : isPuzzleGameType(gameType) ? (
          <div className={`puzzle-stage ${gameType}`} aria-hidden="true">
            <div className="puzzle-canopy" />
          </div>
        ) : (
          renderScene({
            gameType,
            phonicsGame,
            geographyGame,
            historyQuest,
            islandId: view.missionGame.place.islandId,
            prompt: undefined,
            choices: [],
            hiddenChoiceIndexes: [],
            companionMood: "celebrating",
            poppedChoiceIndex: undefined,
            popCount: 0,
          })
        )}
        <Celebration
          characterName={child.characterName}
          soundSettings={child.limits}
          skillIds={view.skillIds}
          rewards={rewards}
          rewardsAtStart={view.rewardsAtStart}
          onOneMoreGo={() => {
            if (!isPuzzleGameType(gameType) && !isCheckGameType(gameType)) {
              void playVoiceOver(
                findInstructionKey({ ...view.missionGame, gameType }, level),
              );
            }
            startPlaying(view.missionGame);
          }}
          onChooseAgain={leaveGame}
        />
      </main>
    );
  }

  const { mission, progress } = view;
  const { question, remainingChoices } = getCurrentQuestion(mission, progress);

  const musicGame = isMusicGameType(mission.gameType)
    ? findMusicGame(mission.gameType)
    : undefined;
  const listenAgain = () => {
    if (question.prompt.kind === "music") {
      cueMusic([{ kind: "music", clips: question.prompt.music.clips }]);
    }
  };

  const chooseAnswer = (choice: string, index: number) => {
    const outcome = answerQuestion(mission, progress, choice, readTapTime());
    const choiceSound = musicGame?.findChoiceSound(choice);
    playSoundEffect(outcome.kind === "wrong" ? "wrong" : "right", child.limits);
    if (outcome.kind === "wrong") {
      const choiceCues: MusicCue[] =
        choiceSound === undefined
          ? []
          : [
              { kind: "music", clips: [choiceSound] },
              { kind: "pause", seconds: 0.2 },
            ];
      cueMusic([
        ...choiceCues,
        { kind: "voice", key: findHintKey(mission.gameType, level) },
      ]);
      setView({
        ...view,
        progress: outcome.progress,
        feedback: {
          kind: "wrong",
          hint:
            mission.phonicsGame?.hint ??
            mission.labGame?.hint ??
            musicGame?.hint ??
            findEnglishHint(mission) ??
            describeHint(question),
        },
        companionMood: "thinking",
      });
      return;
    }

    const { place } = view.missionGame;
    recordPractice(
      { kind: "question-answered", ...outcome.answeredQuestion },
      place,
    );
    if (outcome.finishedActivity !== undefined) {
      recordPractice(
        {
          kind: "activity-finished",
          ...outcome.finishedActivity,
        },
        place,
      );
    }
    if (outcome.progress.isFinished) {
      cueMusic([{ kind: "voice", key: "mission.finished" }]);
      setView({
        kind: "celebrating",
        missionGame: view.missionGame,
        skillIds: [
          ...new Set(mission.activities.map(({ skillId }) => skillId)),
        ],
        rewardsAtStart: view.rewardsAtStart,
      });
      return;
    }
    const next = getCurrentQuestion(mission, outcome.progress);
    if (next.question.prompt.kind === "music") {
      const celebration =
        question.prompt.kind === "music"
          ? (question.prompt.music.reward ?? choiceSound)
          : undefined;
      const celebrationCues: MusicCue[] =
        celebration === undefined
          ? []
          : [{ kind: "music", clips: [celebration] }];
      const instructionCues: MusicCue[] =
        outcome.finishedActivity === undefined
          ? []
          : [{ kind: "voice", key: findInstructionKey(mission, level) }];
      cueMusic([
        ...celebrationCues,
        { kind: "pause", seconds: 0.5 },
        ...instructionCues,
        { kind: "music", clips: next.question.prompt.music.clips },
      ]);
    } else if (!playQuestionPrompt(next.question)) {
      void playVoiceOver(
        outcome.finishedActivity === undefined
          ? findWellDoneKey(mission.gameType, level)
          : findInstructionKey(mission, level),
      );
    }
    setView({
      ...view,
      progress: outcome.progress,
      feedback: {
        kind: "right",
        fact:
          question.prompt.kind === "history" ? question.prompt.fact : undefined,
      },
      companionMood: "cheering",
      poppedChoiceIndex: index,
      popCount: view.popCount + 1,
    });
  };

  return (
    <main className="mission">
      <h1 className="visually-hidden">{findMissionTitle(mission, level)}</h1>
      {renderScene({
        gameType: mission.gameType,
        phonicsGame: mission.phonicsGame,
        geographyGame: mission.geographyGame,
        historyQuest: mission.historyQuest,
        islandId: view.missionGame.place.islandId,
        prompt: question.prompt,
        choices: question.choices,
        hiddenChoiceIndexes: question.choices.flatMap((choice, index) =>
          remainingChoices.includes(choice) ? [] : [index],
        ),
        companionMood: view.companionMood,
        poppedChoiceIndex: view.poppedChoiceIndex,
        popCount: view.popCount,
      })}
      <p className="turn-sideways">Turn your device sideways to play.</p>
      <MissionHud
        view={view}
        question={question}
        level={level}
        onListenAgain={listenAgain}
      />
      {leaveButton}
      <ChoiceLayer
        key={`${String(progress.activityIndex)}-${String(progress.questionIndex)}`}
        question={question}
        remainingChoices={remainingChoices}
        gameType={mission.gameType}
        isShaking={view.feedback.kind === "wrong"}
        onChosen={chooseAnswer}
      />
    </main>
  );
};
