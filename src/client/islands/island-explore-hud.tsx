import { BusyProgress } from "../busy/busy-progress.js";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { MovablePopup } from "../movable-popup.js";
import {
  CarIcon,
  listGarageVehicles,
  TrainPanel,
  VehicleGarage,
} from "./island-explore-rides.js";
import { findRailway, hasRailway } from "./island-railway.js";
import { buildExploreWorld } from "./island-transport.js";
import type { VehicleLook } from "../vehicles/vehicle-figure.js";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import {
  findIslandQuest,
  findQuestProgress,
  isQuestComplete,
  type QuestFind,
  type QuestProgress,
  type QuestPuzzle,
} from "../../curriculum/island-quests.js";
import {
  addQuestPlay,
  describeSolvedPuzzle,
  findQuestFind,
  listHeldFinds,
  tryFindOn,
} from "./island-quest.js";
import {
  HandIcon,
  IslanderCard,
  QuestProgressBar,
  QuestQuestionCard,
  QuestTrophyDialog,
  RucksackDialog,
  RucksackIcon,
  SpeechIcon,
  ThingCard,
} from "./island-quest-hud.js";
import type {
  IslandOnMap,
  RegionOnMap,
} from "../../curriculum/island-access.js";
import type { MapPoint } from "../world-map-terrain.js";
import {
  exploreScale,
  findExploreAdventure,
  findWalkSurface,
  isInsideExploreBounds,
  keepInsideExploreBounds,
  scalePlaceForExplore,
  hasIslandAdventure,
  type ExploreInteraction,
  type FactSign,
  type Friend,
  type Hideaway,
  type IslandAdventure,
} from "./island-adventures.js";
import {
  buildJourneyRoute,
  findJourneyArrivalHeading,
  findJourneyPhaseSeconds,
  findJourneyWaitingSpot,
  type JourneyArrival,
  type Transport,
} from "./island-journey.js";
import { pickTransport } from "./transport-choice.js";
import {
  findNextVoyagePhase,
  isCarriedByVoyage,
  type VoyagePhase,
} from "./island-voyage.js";
import { describeRaceProgress, type RaceProgress } from "./island-races.js";
import { playAttractionTune, type SoundSettings } from "../game-sound.js";
import {
  buildAttractionCard,
  describeDelivery,
  describeParcel,
  findAttractionTune,
  type Parcel,
} from "./island-attraction-visits.js";

export interface ExploreInput {
  right: number;
  forward: number;
  wantsJump: boolean;
}

export const cameraViews = [
  "behind",
  "first-person",
  "birds-eye",
  "wide",
] as const;

export type CameraView = (typeof cameraViews)[number];

export const roomCameraViews = [...cameraViews, "map"] as const;

export type RoomCameraView = (typeof roomCameraViews)[number];

export const cameraViewNames: Record<RoomCameraView, string> = {
  behind: "Behind",
  "first-person": "First person",
  "birds-eye": "Bird's eye",
  wide: "Wide",
  map: "Map",
};

const findNextView = <View extends RoomCameraView>(
  views: readonly View[],
  view: View,
): View => views[(views.indexOf(view) + 1) % views.length];

export const findNextCameraView = (view: CameraView): CameraView =>
  findNextView(cameraViews, view);

export const findNextRoomCameraView = (view: RoomCameraView): RoomCameraView =>
  findNextView(roomCameraViews, view);

export type WalkerStatus =
  "walking" | "swimming" | "sliding" | "too-hot" | "bouncing";

export interface VoyageView {
  phase: VoyagePhase;
  transport: Transport;
  fromIsland: IslandOnMap;
  toIsland: IslandOnMap;
  islands: IslandOnMap[];
  regions: RegionOnMap[];
}

export type Ride = "train" | "vehicle";

export interface VehicleChoice {
  itemId: string;
  name: string;
  look: VehicleLook;
  placedCount: number;
}

export type TrainReport =
  | { kind: "away" }
  | {
      kind: "at-station";
      stationIndex: number;
      isTrainWaiting: boolean;
      secondsUntilTrain: number;
    }
  | {
      kind: "riding";
      waitingAtStationIndex: number | undefined;
      nextStationIndex: number | undefined;
    };

/** What explore mode is getting ready before the Character can set off. */
export interface ExploreLoading {
  /** What it is doing now, such as "Drawing Meadow Isle for the first time". */
  step: string;
  /** How far it is through getting ready, from 0 to 1. */
  share: number;
}

export interface IslandExploreSceneProps {
  island: IslandOnMap;
  regions: RegionOnMap[];
  loadout: CharacterLoadout;
  start: MapPoint;
  startHeading: number;
  voyage: VoyageView | undefined;
  inputRef: RefObject<ExploreInput>;
  foundTreasureIds: readonly string[];
  climbedLookoutId: string | undefined;
  cameraView: CameraView;
  hoveredRegionId: string | undefined;
  onRegionHovered: (regionId: string | undefined) => void;
  onNearbyChanged: (interactions: ExploreInteraction[]) => void;
  onTreasureFound: (treasureId: string) => void;
  onRaceProgress: (progress: RaceProgress) => void;
  onStatusChanged: (status: WalkerStatus) => void;
  onInteractionReached: (interaction: ExploreInteraction) => void;
  ride?: Ride;
  vehicle?: VehicleChoice;
  onTrainChanged?: (report: TrainReport) => void;
  onNearVehicleChanged?: (isNear: boolean) => void;
  onPlayRideChanged?: (rideName: string | undefined) => void;
  questProgress?: QuestProgress;
  onQuestFindReached?: (findId: string) => void;
  /**
   * Told what the scene is getting ready, and undefined once the Character
   * can set off. Given it, the scene marks what is solid near the start a
   * little each frame rather than all at once.
   */
  onLoadingChanged?: (loading: ExploreLoading | undefined) => void;
}

export interface IslandExploreProps {
  island: IslandOnMap;
  islands: IslandOnMap[];
  regions: RegionOnMap[];
  everyRegion: RegionOnMap[];
  loadout: CharacterLoadout;
  startNearRegionId: string | undefined;
  startAt: MapPoint | undefined;
  arrival: JourneyArrival | undefined;
  foundTreasureIds: readonly string[];
  renderScene: (sceneProps: IslandExploreSceneProps) => ReactNode;
  onTreasureFound: (treasureId: string) => void;
  onRegionOpened: (regionId: string) => void;
  onSailed: (islandId: string, arrival: JourneyArrival) => void;
  onLeave: () => void;
  heldVehicleIds?: readonly string[];
  soundSettings?: SoundSettings;
  questProgress?: readonly QuestProgress[];
  onQuestFindPickedUp?: (islandId: string, findId: string) => void;
  onQuestPuzzleSolved?: (islandId: string, puzzleId: string) => void;
  /** Whether the Child may explore an Island; one a Parent has locked isn't offered. */
  canExploreIsland?: (islandId: string) => boolean;
}

interface Voyage {
  phase: VoyagePhase;
  toIslandId: string;
  transport: Transport;
}

// Every Island with an adventure can be sailed to and explored, even one that
// is locked: locking only keeps a Region's Missions shut, not the Island.
export const canSailTo = (island: IslandOnMap): boolean =>
  hasIslandAdventure(island.id);

export const describeVoyagePhase = (
  transport: Transport,
  phase: VoyagePhase,
  toIslandName: string,
): string | undefined => {
  const descriptions: Record<
    Transport,
    Record<VoyagePhase, string | undefined>
  > = {
    ship: {
      calling:
        "Here comes the ship! It's sailing into the Dock to pick you up.",
      boarding: "All aboard!",
      departing: `Anchors up! Setting sail for ${toIslandName}.`,
      crossing: `Sailing across the sea to ${toIslandName}...`,
      docking: `Land ahoy! Sailing into the Dock on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    aeroplane: {
      calling:
        "Here comes the aeroplane! It's landing on the Runway to pick you up.",
      boarding: "Up the steps and all aboard!",
      departing: `Seatbelts on! Taking off for ${toIslandName}.`,
      crossing: `Flying high over the sea to ${toIslandName}...`,
      docking: `Coming in to land on the Runway on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    helicopter: {
      calling:
        "Here comes the helicopter! It's landing on the Helipad to pick you up.",
      boarding: "Climb aboard!",
      departing: `Lifting off! Flying to ${toIslandName}.`,
      crossing: `Whirring over the sea to ${toIslandName}...`,
      docking: `Landing on the Helipad on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    hovercraft: {
      calling:
        "Here comes the hovercraft! It's riding up the slipway onto the land to pick you up.",
      boarding: "Up the ramp and all aboard!",
      departing: `Skirt puffed up! Hovering off to ${toIslandName}.`,
      crossing: `Hovering over the waves to ${toIslandName}...`,
      docking: `Riding up the slipway onto ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    submarine: {
      calling:
        "Here comes the submarine! It's surfacing beside the Dock to pick you up.",
      boarding: "Across the deck and down the hatch!",
      departing: `Hatch shut! Diving under the sea to ${toIslandName}.`,
      crossing: `Gliding deep under the waves to ${toIslandName}...`,
      docking: `Surfacing beside the Dock on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    balloon: {
      calling:
        "Here comes the hot-air balloon! It's floating down onto the Balloon Field to pick you up.",
      boarding: "Through the little door and into the basket!",
      departing: `Burners on! Floating up and away to ${toIslandName}.`,
      crossing: `Drifting high over the sea to ${toIslandName}...`,
      docking: `Floating gently down onto the Balloon Field on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    pirateShip: {
      calling:
        "Ahoy! Here comes the pirate ship! It's sailing into the Dock to pick you up.",
      boarding: "Up the gangplank, me hearty!",
      departing: `Hoist the Jolly Roger! Setting sail for ${toIslandName}.`,
      crossing: `Sailing the high seas to ${toIslandName}...`,
      docking: `Land ho! The pirate ship is sailing into the Dock on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}, me hearty!`,
      leaving: undefined,
    },
    jetski: {
      calling:
        "Here comes the jetski! It's zooming in beside the Dock to pick you up.",
      boarding: "Step down from the pier and hold on tight!",
      departing: `Full throttle! Zooming off to ${toIslandName}.`,
      crossing: `Skimming over the waves to ${toIslandName}...`,
      docking: `Slowing down beside the Dock on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    rocket: {
      calling:
        "Here comes the rocket! It's landing on the Helipad to pick you up.",
      boarding: "Up the steps and through the hatch!",
      departing: `3, 2, 1... blast off! Rocketing to ${toIslandName}.`,
      crossing: `Rocketing high above the clouds to ${toIslandName}...`,
      docking: `Coming down engine first onto the Helipad on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    dragon: {
      calling:
        "Look up! A dragon is flying in to land on the Balloon Field and pick you up.",
      boarding: "The dragon bows down. Climb up onto the saddle and sit tight!",
      departing: `Hold on! The dragon spreads its wings and flies off to ${toIslandName}.`,
      crossing: `Soaring on the dragon's back to ${toIslandName}...`,
      docking: `The dragon is gliding down onto the Balloon Field on ${toIslandName}.`,
      landing: `The dragon bows down so you can climb off. Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    blimp: {
      calling:
        "Here comes the Wizzaroo blimp! It's floating down onto the Runway to pick you up.",
      boarding: "Up the step and in through the gondola door!",
      departing: `Engines on! The blimp is rising up and floating off to ${toIslandName}.`,
      crossing: `Floating gently above the sea to ${toIslandName}...`,
      docking: `The blimp is settling down onto the Runway on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    scuba: {
      calling:
        "Time to dive! A Wizzaroo dive locker is popping up at the end of the Dock.",
      boarding: "Put on your wetsuit, fins, mask and air tank, then jump in!",
      departing: `Splash! Swimming down under the sea to ${toIslandName}.`,
      crossing: `Swimming under the sea to ${toIslandName}...`,
      docking: `Swimming up to the Dock on ${toIslandName}.`,
      landing: `Climb out and hang up your gear. Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    surfboard: {
      calling:
        "Surf's up! A surfboard is gliding in beside the Dock to pick you up.",
      boarding: "Step down onto the surfboard and lie down to paddle!",
      departing: `Paddle, paddle... here comes a massive wave! Stand up and ride it to ${toIslandName}!`,
      crossing: `Riding a massive wave all the way to ${toIslandName}...`,
      docking: `The wave is carrying you in to the Dock on ${toIslandName}.`,
      landing: `What a ride! Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    windsurfer: {
      calling:
        "Here comes a windsurfer! It's sailing in beside the Dock to pick you up.",
      boarding: "Step onto the board and grab the boom!",
      departing: `The wind fills the sail! Windsurfing off to ${toIslandName}.`,
      crossing: `Windsurfing over the waves to ${toIslandName}...`,
      docking: `Sailing in beside the Dock on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
    portal: {
      calling:
        "Look! A magic portal is opening on the Balloon Field to take you.",
      boarding: "Walk through the swirling light!",
      departing: `Whoosh! The portal is whisking you away to ${toIslandName}.`,
      crossing: `Zooming through the portal to ${toIslandName}...`,
      docking: `A portal is opening on the Balloon Field on ${toIslandName}.`,
      landing: `Welcome to ${toIslandName}!`,
      leaving: undefined,
    },
  };
  return descriptions[transport][phase];
};

export const describeMapJourney = (
  transport: Transport,
  toIslandName: string,
): string =>
  ({
    ship: `All aboard! The ship is sailing to ${toIslandName}.`,
    aeroplane: `All aboard! The aeroplane is flying to ${toIslandName}.`,
    helicopter: `All aboard! The helicopter is flying to ${toIslandName}.`,
    hovercraft: `All aboard! The hovercraft is hovering to ${toIslandName}.`,
    submarine: `All aboard! The submarine is diving to ${toIslandName}.`,
    balloon: `All aboard! The hot-air balloon is floating to ${toIslandName}.`,
    pirateShip: `All aboard! The pirate ship is sailing to ${toIslandName}.`,
    jetski: `Hold on tight! The jetski is zooming to ${toIslandName}.`,
    rocket: `All aboard! The rocket is blasting off to ${toIslandName}.`,
    portal: `Step through! The magic portal is taking you to ${toIslandName}.`,
    dragon: `Hold on tight! The dragon is flying you to ${toIslandName}.`,
    blimp: `All aboard! The Wizzaroo blimp is floating to ${toIslandName}.`,
    scuba: `Deep breath! You're scuba diving to ${toIslandName}.`,
    surfboard: `Surf's up! A massive wave is carrying you to ${toIslandName}.`,
    windsurfer: `Hold on to the boom! You're windsurfing to ${toIslandName}.`,
  })[transport];

const dockStory =
  "Big ships sail from this Dock to every Island. Press an Island's Year at the top and a ship, an aeroplane, a helicopter, a hovercraft, a submarine, a hot-air balloon, a pirate ship, a jetski, a rocket, a dragon, a blimp, a surfboard or a windsurfer will come to take you there, you'll go scuba diving, or a magic portal will open!";

const statusMessages: Record<WalkerStatus, string | undefined> = {
  walking: undefined,
  swimming: "Splash! You're swimming.",
  sliding: "Wheee! The ice is slippery.",
  "too-hot": "Too hot! Find a bridge to cross the lava.",
  bouncing: "Boing!",
};

const keyDirections: Partial<
  Record<string, { right: number; forward: number }>
> = {
  ArrowUp: { right: 0, forward: 1 },
  KeyW: { right: 0, forward: 1 },
  ArrowDown: { right: 0, forward: -1 },
  KeyS: { right: 0, forward: -1 },
  ArrowLeft: { right: -1, forward: 0 },
  KeyA: { right: -1, forward: 0 },
  ArrowRight: { right: 1, forward: 0 },
  KeyD: { right: 1, forward: 0 },
};

const joystickReachPixels = 44;

export const isWalkKey = (code: string): boolean => code in keyDirections;
const regionDoorstep = 3 * exploreScale;

export const findExploreStart = (
  adventure: IslandAdventure,
  region: { mapPosition: MapPoint } | undefined,
): MapPoint => {
  if (region === undefined) {
    return adventure.start;
  }
  const { x, z } = region.mapPosition;
  const towardsX = adventure.start.x - x;
  const towardsZ = adventure.start.z - z;
  const distance = Math.hypot(towardsX, towardsZ);
  return distance < regionDoorstep
    ? adventure.start
    : {
        x: x + (towardsX / distance) * regionDoorstep,
        z: z + (towardsZ / distance) * regionDoorstep,
      };
};

const dropSearchStep = 2;
const dropSearchReach = 160;
const dropSearchDirections = 16;
const standableKinds: readonly string[] = ["ground", "trail", "bridge"];

export const findDropStart = (
  adventure: IslandAdventure,
  droppedAt: MapPoint,
): MapPoint => {
  const world = buildExploreWorld(adventure);
  const centre = keepInsideExploreBounds({
    x: droppedAt.x * exploreScale,
    z: droppedAt.z * exploreScale,
  });
  const isStandable = (point: MapPoint) =>
    isInsideExploreBounds(point) &&
    standableKinds.includes(findWalkSurface(world, point, Infinity).kind);
  if (isStandable(centre)) {
    return centre;
  }
  for (
    let reach = dropSearchStep;
    reach <= dropSearchReach;
    reach += dropSearchStep
  ) {
    const found = Array.from(
      { length: dropSearchDirections },
      (_, direction) => {
        const angle = (direction / dropSearchDirections) * Math.PI * 2;
        return {
          x: centre.x + Math.cos(angle) * reach,
          z: centre.z + Math.sin(angle) * reach,
        };
      },
    ).find(isStandable);
    if (found !== undefined) {
      return found;
    }
  }
  return adventure.start;
};

export const describeInteraction = (
  interaction: ExploreInteraction,
): string => {
  if (interaction.kind === "region") {
    return `Go into ${interaction.name}`;
  }
  if (interaction.kind === "lookout") {
    return `Climb ${interaction.name}`;
  }
  if (interaction.kind === "hideaway") {
    return `Explore ${interaction.name}`;
  }
  if (interaction.kind === "friend") {
    return `Say hello to ${interaction.name}`;
  }
  if (interaction.kind === "dock") {
    return "Visit the Dock";
  }
  if (interaction.kind === "attraction") {
    return `Visit ${interaction.name}`;
  }
  if (interaction.kind === "islander") {
    return `Talk to ${interaction.name}`;
  }
  if (interaction.kind === "quest-thing") {
    return `Look at the ${interaction.name}`;
  }
  return `Read the sign: ${interaction.name}`;
};

export const describeHideawayCount = (found: number, total: number): string =>
  `Hideaways explored: ${String(found)} of ${String(total)}`;

export const describeFriendCount = (
  met: number,
  total: number,
  plural: string,
): string => `${plural} met: ${String(met)} of ${String(total)}`;

export const describeRaceCount = (won: number, total: number): string =>
  `Ring Races won: ${String(won)} of ${String(total)}`;

export const describeTreasureCount = (
  found: number,
  total: number,
  plural: string,
): string => `${plural} found: ${String(found)} of ${String(total)}`;

export const ExploreIcon = ({ children }: { children: ReactNode }) => (
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

export const BackToMapIcon = () => (
  <ExploreIcon>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </ExploreIcon>
);

const GemIcon = () => (
  <ExploreIcon>
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M2 9h20" />
    <path d="m12 21-4-12 4-6 4 6z" />
  </ExploreIcon>
);

export const JumpIcon = () => (
  <ExploreIcon>
    <path d="m6 14 6-6 6 6" />
    <path d="M5 20h14" />
  </ExploreIcon>
);

const ClimbIcon = () => (
  <ExploreIcon>
    <path d="M8 21V3" />
    <path d="M16 21V3" />
    <path d="M8 7h8" />
    <path d="M8 12h8" />
    <path d="M8 17h8" />
  </ExploreIcon>
);

const DoorIcon = () => (
  <ExploreIcon>
    <path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17" />
    <path d="M3 21h18" />
    <path d="M14 12h.01" />
  </ExploreIcon>
);

const TentIcon = () => (
  <ExploreIcon>
    <path d="M3 20 12 4l9 16z" />
    <path d="m12 20-3-6h6z" />
  </ExploreIcon>
);

const PawIcon = () => (
  <ExploreIcon>
    <circle cx="11" cy="4" r="2" />
    <circle cx="18" cy="8" r="2" />
    <circle cx="4" cy="8" r="2" />
    <path d="M8 14a4 4 0 0 1 8 0c0 2.5 2 3 2 5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2c0-2 2-2.5 2-5z" />
  </ExploreIcon>
);

const AnchorIcon = () => (
  <ExploreIcon>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v14" />
    <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    <path d="M8 10h8" />
  </ExploreIcon>
);

const FlagIcon = () => (
  <ExploreIcon>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </ExploreIcon>
);

export const FastForwardIcon = () => (
  <ExploreIcon>
    <path d="m4 6 8 6-8 6z" />
    <path d="m12 6 8 6-8 6z" />
  </ExploreIcon>
);

const SignIcon = () => (
  <ExploreIcon>
    <path d="M12 21v-8" />
    <path d="M4 5h14l3 4-3 4H4z" />
  </ExploreIcon>
);

const StarIcon = () => (
  <ExploreIcon>
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </ExploreIcon>
);

const cameraViewIconPaths: Record<RoomCameraView, ReactNode> = {
  behind: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M7 21v-3a5 5 0 0 1 10 0v3" />
    </>
  ),
  "first-person": (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "birds-eye": (
    <>
      <path d="M12 3v4" />
      <path d="m9 5 3 2 3-2" />
      <rect x="4" y="12" width="16" height="9" rx="2" />
    </>
  ),
  wide: (
    <>
      <path d="m3 20 6-9 4 5 3-4 5 8z" />
      <circle cx="17" cy="6" r="2" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
};

const CameraViewIcon = ({ view }: { view: RoomCameraView }) => (
  <ExploreIcon>{cameraViewIconPaths[view]}</ExploreIcon>
);

export const CameraViewButtons = <View extends RoomCameraView>({
  views,
  cameraView,
  onViewChosen,
}: {
  views: readonly View[];
  cameraView: View;
  onViewChosen: (view: View) => void;
}) => (
  <div
    className="explore-views"
    role="group"
    aria-label="Camera view (press V to change)"
  >
    {views.map((view) => (
      <button
        key={view}
        type="button"
        aria-pressed={view === cameraView}
        onClick={() => {
          onViewChosen(view);
        }}
      >
        <CameraViewIcon view={view} />
        <span>{cameraViewNames[view]}</span>
      </button>
    ))}
  </div>
);

const CloseIcon = () => (
  <ExploreIcon>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </ExploreIcon>
);

const interactionIcons: Record<ExploreInteraction["kind"], () => ReactNode> = {
  region: DoorIcon,
  lookout: ClimbIcon,
  sign: SignIcon,
  hideaway: TentIcon,
  friend: PawIcon,
  dock: AnchorIcon,
  attraction: StarIcon,
  islander: SpeechIcon,
  "quest-thing": HandIcon,
};

const ExploreCard = ({
  title,
  text,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  text: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
}) => (
  <MovablePopup
    positionKey="explore-card"
    className="explore-sign"
    role="dialog"
    aria-labelledby="explore-sign-title"
  >
    <header>
      <h2 id="explore-sign-title">{title}</h2>
      <button
        type="button"
        className="explore-sign-close"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </header>
    <p>{text}</p>
    {children}
  </MovablePopup>
);

export const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

export const isButtonTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLButtonElement;

export const combineDirections = (
  pressedKeys: ReadonlySet<string>,
  stick: { right: number; forward: number },
): { right: number; forward: number } => {
  const fromKeys = [...pressedKeys].reduce(
    (total, code) => {
      const direction = keyDirections[code];
      return direction === undefined
        ? total
        : {
            right: total.right + direction.right,
            forward: total.forward + direction.forward,
          };
    },
    { right: 0, forward: 0 },
  );
  const right = Math.max(-1, Math.min(1, fromKeys.right + stick.right));
  const forward = Math.max(-1, Math.min(1, fromKeys.forward + stick.forward));
  return { right, forward };
};

export const Joystick = ({
  onStickMoved,
}: {
  onStickMoved: (stick: { right: number; forward: number }) => void;
}) => {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const centre = useRef<{ x: number; y: number }>(undefined);

  const moveKnob = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (centre.current === undefined) {
      return;
    }
    const pullX = event.clientX - centre.current.x;
    const pullY = event.clientY - centre.current.y;
    const pull = Math.hypot(pullX, pullY);
    const share = pull > joystickReachPixels ? joystickReachPixels / pull : 1;
    const x = pullX * share;
    const y = pullY * share;
    setKnob({ x, y });
    onStickMoved({
      right: x / joystickReachPixels,
      forward: -y / joystickReachPixels,
    });
  };

  const letGo = () => {
    centre.current = undefined;
    setKnob({ x: 0, y: 0 });
    onStickMoved({ right: 0, forward: 0 });
  };

  return (
    <div
      className="explore-joystick"
      role="img"
      aria-label="Joystick: drag to walk. You can also use the arrow keys."
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        centre.current = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        moveKnob(event);
      }}
      onPointerMove={moveKnob}
      onPointerUp={letGo}
      onPointerCancel={letGo}
    >
      <span
        className="explore-joystick-knob"
        style={{
          transform: `translate(${String(knob.x)}px, ${String(knob.y)}px)`,
        }}
      />
    </div>
  );
};

export const IslandExplore = ({
  island,
  islands,
  regions,
  everyRegion,
  loadout,
  startNearRegionId,
  startAt,
  arrival,
  foundTreasureIds,
  renderScene,
  onTreasureFound,
  onRegionOpened,
  onSailed,
  onLeave,
  heldVehicleIds = [],
  soundSettings,
  questProgress = [],
  onQuestFindPickedUp,
  onQuestPuzzleSolved,
  canExploreIsland = () => true,
}: IslandExploreProps) => {
  const adventure = findExploreAdventure(island.id);
  const { treasureKind, treasures, hideaways, friends, friendKind } = adventure;
  const [start] = useState(() => {
    if (arrival !== undefined) {
      return findJourneyWaitingSpot(adventure, arrival.transport);
    }
    if (startAt !== undefined) {
      return findDropStart(adventure, startAt);
    }
    const region = regions.find(({ id }) => id === startNearRegionId);
    return findExploreStart(
      adventure,
      region === undefined ? undefined : scalePlaceForExplore(region),
    );
  });
  const startHeading =
    arrival === undefined
      ? adventure.startHeading
      : findJourneyArrivalHeading(adventure, arrival.transport);
  const [voyage, setVoyage] = useState<Voyage | undefined>(() =>
    arrival === undefined || arrival.isSkipped
      ? undefined
      : {
          phase: "docking",
          toIslandId: island.id,
          transport: arrival.transport,
        },
  );
  const isCarried = isCarriedByVoyage(voyage?.phase);
  const voyageIsland =
    voyage === undefined
      ? undefined
      : islands.find(({ id }) => id === voyage.toIslandId);
  const [metFriendIds, setMetFriendIds] = useState<readonly string[]>([]);
  const [greetingFriend, setGreetingFriend] = useState<Friend>();
  const [isDockStoryShown, setIsDockStoryShown] = useState(false);
  const [openAttractionId, setOpenAttractionId] = useState<string>();
  const [parcel, setParcel] = useState<Parcel>();
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [attractionNews, setAttractionNews] = useState<string>();
  const [playRideName, setPlayRideName] = useState<string>();
  const tunedAttractionIds = useRef(new Set<string>());
  const inputRef = useRef<ExploreInput>({
    right: 0,
    forward: 0,
    wantsJump: false,
  });
  const pressedKeys = useRef(new Set<string>());
  const stick = useRef({ right: 0, forward: 0 });
  const [nearby, setNearby] = useState<ExploreInteraction[]>([]);
  const [status, setStatus] = useState<WalkerStatus>("walking");
  const [climbedLookoutId, setClimbedLookoutId] = useState<string>();
  const [readSign, setReadSign] = useState<FactSign>();
  const [openHideaway, setOpenHideaway] = useState<Hideaway>();
  const [exploredHideawayIds, setExploredHideawayIds] = useState<
    readonly string[]
  >([]);
  const [treasureNews, setTreasureNews] = useState<string>();
  const [runningRace, setRunningRace] = useState<RaceProgress>();
  const [raceNews, setRaceNews] = useState<string>();
  const [wonRaceIds, setWonRaceIds] = useState<readonly string[]>([]);
  const [isHelpShown, setIsHelpShown] = useState(arrival === undefined);
  const [sceneLoading, setSceneLoading] = useState<ExploreLoading>();
  const gettingReadyLabel = `Getting ${island.name} ready…`;
  const [cameraView, setCameraView] = useState<CameraView>("behind");
  const [ride, setRide] = useState<Ride>();
  const [vehicle, setVehicle] = useState<VehicleChoice>();
  const [trainReport, setTrainReport] = useState<TrainReport>({
    kind: "away",
  });
  const [isNearVehicle, setIsNearVehicle] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const railway = hasRailway(island.id) ? findRailway(island.id) : undefined;
  const garageVehicles = listGarageVehicles(heldVehicleIds);
  const [hoveredRegionId, setHoveredRegionId] = useState<string>();
  const climbedLookout = adventure.lookouts.find(
    ({ id }) => id === climbedLookoutId,
  );
  const foundCount = treasures.filter(({ id }) =>
    foundTreasureIds.includes(id),
  ).length;
  const quest = findIslandQuest(island.id);
  const [questPlay, setQuestPlay] = useState<Omit<QuestProgress, "islandId">>({
    pickedUpFindIds: [],
    solvedPuzzleIds: [],
  });
  const progress = addQuestPlay(
    findQuestProgress(questProgress, island.id),
    questPlay,
  );
  const [openIslanderId, setOpenIslanderId] = useState<string>();
  const [openThingId, setOpenThingId] = useState<string>();
  const [questReply, setQuestReply] = useState<string>();
  const [askingPuzzle, setAskingPuzzle] = useState<QuestPuzzle>();
  const [isRucksackOpen, setIsRucksackOpen] = useState(false);
  const [isTrophyShown, setIsTrophyShown] = useState(false);
  const [questNews, setQuestNews] = useState<string>();

  const pickUpFind = (findId: string) => {
    const find = quest === undefined ? undefined : findQuestFind(quest, findId);
    if (find === undefined || progress.pickedUpFindIds.includes(findId)) {
      return;
    }
    setQuestPlay((play) => ({
      ...play,
      pickedUpFindIds: [...play.pickedUpFindIds, findId],
    }));
    setQuestNews(`You picked up the ${find.name}! It's in your rucksack.`);
    onQuestFindPickedUp?.(island.id, findId);
  };

  const solvePuzzle = (puzzle: QuestPuzzle) => {
    if (quest === undefined || progress.solvedPuzzleIds.includes(puzzle.id)) {
      return;
    }
    const solvedNow = {
      ...progress,
      solvedPuzzleIds: [...progress.solvedPuzzleIds, puzzle.id],
    };
    setQuestPlay((play) => ({
      ...play,
      solvedPuzzleIds: [...play.solvedPuzzleIds, puzzle.id],
    }));
    setAskingPuzzle(undefined);
    setQuestReply(describeSolvedPuzzle(quest, puzzle));
    onQuestPuzzleSolved?.(island.id, puzzle.id);
    if (isQuestComplete(quest, solvedNow)) {
      setIsTrophyShown(true);
    }
  };

  const offerFind = (
    target: { kind: "islander" | "thing"; id: string },
    targetName: string,
    find: QuestFind,
  ) => {
    if (quest === undefined) {
      return;
    }
    const use = tryFindOn(quest, progress, target, targetName, find);
    if (use.kind === "solved") {
      solvePuzzle(use.puzzle);
      return;
    }
    if (use.kind === "asks-a-question") {
      setQuestReply(undefined);
      setAskingPuzzle(use.puzzle);
      return;
    }
    setQuestReply(use.message);
  };

  const updateInput = () => {
    const { right, forward } = combineDirections(
      pressedKeys.current,
      stick.current,
    );
    inputRef.current.right = right;
    inputRef.current.forward = forward;
  };

  const startInteraction = (interaction: ExploreInteraction) => {
    setIsHelpShown(false);
    if (interaction.kind === "region") {
      onRegionOpened(interaction.id);
      return;
    }
    setReadSign(undefined);
    setOpenHideaway(undefined);
    setGreetingFriend(undefined);
    setIsDockStoryShown(false);
    setOpenAttractionId(undefined);
    setOpenIslanderId(undefined);
    setOpenThingId(undefined);
    setQuestReply(undefined);
    setAskingPuzzle(undefined);
    if (interaction.kind === "islander") {
      setOpenIslanderId(interaction.id);
      return;
    }
    if (interaction.kind === "quest-thing") {
      setOpenThingId(interaction.id);
      return;
    }
    if (interaction.kind === "attraction") {
      setOpenAttractionId(interaction.id);
      return;
    }
    if (interaction.kind === "dock") {
      setIsDockStoryShown(true);
      return;
    }
    if (interaction.kind === "friend") {
      setGreetingFriend(friends.find(({ id }) => id === interaction.id));
      setMetFriendIds((met) =>
        met.includes(interaction.id) ? met : [...met, interaction.id],
      );
      return;
    }
    if (interaction.kind === "lookout") {
      setClimbedLookoutId(interaction.id);
      return;
    }
    if (interaction.kind === "hideaway") {
      setOpenHideaway(hideaways.find(({ id }) => id === interaction.id));
      setExploredHideawayIds((explored) =>
        explored.includes(interaction.id)
          ? explored
          : [...explored, interaction.id],
      );
      return;
    }
    setReadSign(adventure.signs.find(({ id }) => id === interaction.id));
  };

  const climbDown = () => {
    setClimbedLookoutId(undefined);
  };

  const closeCards = () => {
    setOpenIslanderId(undefined);
    setOpenThingId(undefined);
    setQuestReply(undefined);
    setAskingPuzzle(undefined);
    setOpenAttractionId(undefined);
    setReadSign(undefined);
    setOpenHideaway(undefined);
    setGreetingFriend(undefined);
    setIsDockStoryShown(false);
  };

  const sailTo = (islandId: string) => {
    if (
      voyage !== undefined ||
      islandId === island.id ||
      !canExploreIsland(islandId)
    ) {
      return;
    }
    closeCards();
    climbDown();
    setIsHelpShown(false);
    setVoyage({
      phase: "calling",
      toIslandId: islandId,
      transport: pickTransport(),
    });
  };

  const fastForward = () => {
    if (voyage === undefined) {
      return;
    }
    if (voyage.toIslandId === island.id) {
      setVoyage({ ...voyage, phase: "leaving" });
      return;
    }
    onSailed(voyage.toIslandId, {
      transport: voyage.transport,
      isSkipped: true,
    });
  };

  const latestSailing = useRef({ island, islands, onSailed });
  useEffect(() => {
    latestSailing.current = { island, islands, onSailed };
  });

  useEffect(() => {
    if (voyage === undefined) {
      return;
    }
    const { island: fromIsland, islands: everyIsland } = latestSailing.current;
    const toIsland = everyIsland.find(({ id }) => id === voyage.toIslandId);
    const route = buildJourneyRoute(
      { islandId: fromIsland.id, seaPosition: fromIsland.seaPosition },
      {
        islandId: voyage.toIslandId,
        seaPosition: toIsland?.seaPosition ?? fromIsland.seaPosition,
      },
      voyage.transport,
    );
    const nextStep = setTimeout(
      () => {
        if (voyage.phase === "crossing") {
          latestSailing.current.onSailed(voyage.toIslandId, {
            transport: voyage.transport,
            isSkipped: false,
          });
          return;
        }
        const nextPhase = findNextVoyagePhase(voyage.phase);
        setVoyage(
          nextPhase === undefined ? undefined : { ...voyage, phase: nextPhase },
        );
      },
      findJourneyPhaseSeconds(voyage.transport, voyage.phase, route) * 1000,
    );
    return () => {
      clearTimeout(nextStep);
    };
  }, [voyage]);

  const startJump = () => {
    inputRef.current.wantsJump = true;
  };

  const latestKeyActions = useRef({
    nearby,
    startInteraction,
    climbDown,
    closeSign: closeCards,
    isClimbed: climbedLookoutId !== undefined,
    isCarried,
  });
  useEffect(() => {
    latestKeyActions.current = {
      nearby,
      startInteraction,
      climbDown,
      closeSign: closeCards,
      isClimbed: climbedLookoutId !== undefined,
      isCarried,
    };
  });

  useEffect(() => {
    const keys = pressedKeys.current;
    const pressKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      const actions = latestKeyActions.current;
      if (actions.isCarried) {
        return;
      }
      if (isWalkKey(event.code)) {
        event.preventDefault();
        keys.add(event.code);
        updateInput();
        return;
      }
      if (event.code === "Space" && !isButtonTarget(event.target)) {
        event.preventDefault();
        inputRef.current.wantsJump = true;
        return;
      }
      if (event.code === "KeyV") {
        setCameraView(findNextCameraView);
        return;
      }
      if (event.code === "KeyE" && actions.nearby.length > 0) {
        actions.startInteraction(actions.nearby[0]);
        return;
      }
      if (event.code === "Escape") {
        actions.closeSign();
        if (actions.isClimbed) {
          actions.climbDown();
        }
      }
    };
    const releaseKey = (event: KeyboardEvent) => {
      keys.delete(event.code);
      updateInput();
    };
    const releaseEveryKey = () => {
      keys.clear();
      updateInput();
    };
    window.addEventListener("keydown", pressKey);
    window.addEventListener("keyup", releaseKey);
    window.addEventListener("blur", releaseEveryKey);
    return () => {
      window.removeEventListener("keydown", pressKey);
      window.removeEventListener("keyup", releaseKey);
      window.removeEventListener("blur", releaseEveryKey);
    };
  }, []);

  const findTreasure = (treasureId: string) => {
    if (foundTreasureIds.includes(treasureId)) {
      return;
    }
    const nowFound = foundCount + 1;
    setTreasureNews(
      nowFound === treasures.length
        ? `Amazing! You found all ${String(treasures.length)} ${treasureKind.plural} on ${island.name}!`
        : `You found a ${treasureKind.singular}! ${String(nowFound)} of ${String(treasures.length)}`,
    );
    onTreasureFound(treasureId);
  };

  const followRace = (progress: RaceProgress) => {
    if (progress.kind === "running") {
      setRunningRace(progress);
      return;
    }
    setRunningRace(undefined);
    setRaceNews(describeRaceProgress(progress));
    if (progress.kind === "won") {
      setWonRaceIds((won) =>
        won.includes(progress.raceId) ? won : [...won, progress.raceId],
      );
    }
  };

  useEffect(() => {
    if (raceNews === undefined) {
      return;
    }
    const fade = setTimeout(() => {
      setRaceNews(undefined);
    }, 5000);
    return () => {
      clearTimeout(fade);
    };
  }, [raceNews]);

  useEffect(() => {
    if (questNews === undefined) {
      return;
    }
    const fade = setTimeout(() => {
      setQuestNews(undefined);
    }, 4000);
    return () => {
      clearTimeout(fade);
    };
  }, [questNews]);

  useEffect(() => {
    if (treasureNews === undefined) {
      return;
    }
    const fade = setTimeout(() => {
      setTreasureNews(undefined);
    }, 3500);
    return () => {
      clearTimeout(fade);
    };
  }, [treasureNews]);

  const noticeNearby = (interactions: ExploreInteraction[]) => {
    setNearby(interactions);
    const nearIds = new Set(
      interactions
        .filter(({ kind }) => kind === "attraction")
        .map(({ id }) => id),
    );
    for (const id of tunedAttractionIds.current) {
      if (!nearIds.has(id)) {
        tunedAttractionIds.current.delete(id);
      }
    }
    for (const id of nearIds) {
      const tune = findAttractionTune(island.id, id);
      if (tune !== undefined && !tunedAttractionIds.current.has(id)) {
        tunedAttractionIds.current.add(id);
        playAttractionTune(tune, {
          isMusicMuted: soundSettings?.isMusicMuted ?? true,
          areSoundEffectsMuted: soundSettings?.areSoundEffectsMuted ?? true,
        });
      }
    }
    if (parcel !== undefined && nearIds.has(parcel.targetId)) {
      setAttractionNews(describeDelivery(parcel));
      setParcel(undefined);
      setDeliveredCount((count) => count + 1);
    }
  };

  useEffect(() => {
    if (attractionNews === undefined) {
      return;
    }
    const fade = setTimeout(() => {
      setAttractionNews(undefined);
    }, 5000);
    return () => {
      clearTimeout(fade);
    };
  }, [attractionNews]);

  const openAttraction =
    openAttractionId === undefined
      ? undefined
      : buildAttractionCard(
          island.id,
          openAttractionId,
          regions,
          deliveredCount,
          parcel,
        );
  const statusMessage = statusMessages[status];
  const voyageMessage =
    voyage === undefined || voyageIsland === undefined
      ? undefined
      : describeVoyagePhase(voyage.transport, voyage.phase, voyageIsland.name);
  const sailingIslands = islands.filter(
    (each) =>
      canSailTo(each) && (each.id === island.id || canExploreIsland(each.id)),
  );

  const treasureCountLabel = describeTreasureCount(
    foundCount,
    treasures.length,
    treasureKind.plural,
  );
  const hideawayCountLabel = describeHideawayCount(
    exploredHideawayIds.length,
    hideaways.length,
  );
  const friendCountLabel = describeFriendCount(
    metFriendIds.length,
    friends.length,
    friendKind.plural,
  );
  const raceCountLabel = describeRaceCount(
    wonRaceIds.length,
    adventure.races.length,
  );
  return (
    <section className="island-explore" aria-label={`Exploring ${island.name}`}>
      {renderScene({
        onLoadingChanged: setSceneLoading,
        island,
        regions,
        loadout,
        start,
        startHeading,
        voyage:
          voyage === undefined || voyageIsland === undefined
            ? undefined
            : {
                phase: voyage.phase,
                transport: voyage.transport,
                fromIsland: island,
                toIsland: voyageIsland,
                islands,
                regions: everyRegion,
              },
        inputRef,
        foundTreasureIds,
        climbedLookoutId,
        cameraView,
        hoveredRegionId,
        onRegionHovered: setHoveredRegionId,
        onNearbyChanged: noticeNearby,
        onTreasureFound: findTreasure,
        onRaceProgress: followRace,
        onStatusChanged: setStatus,
        onInteractionReached: startInteraction,
        ride,
        vehicle,
        onTrainChanged: (report) => {
          setTrainReport(report);
          if (report.kind !== "riding" && ride === "train") {
            setRide(undefined);
          }
        },
        onNearVehicleChanged: setIsNearVehicle,
        onPlayRideChanged: setPlayRideName,
        questProgress: progress,
        onQuestFindReached: pickUpFind,
      })}
      <header className="explore-bar">
        <button
          type="button"
          className="explore-leave"
          aria-label="Back to the map"
          data-tip="Back to the World Map"
          onClick={onLeave}
        >
          <BackToMapIcon />
          <span>Map</span>
        </button>
        <h1 className="explore-title">{island.name}</h1>
        <p
          className="explore-treasure-count"
          aria-label={treasureCountLabel}
          data-tip={treasureCountLabel}
          style={{ color: treasureKind.colour }}
        >
          <GemIcon />
          <span aria-hidden="true">
            {foundCount}/{treasures.length}
          </span>
        </p>
        <p
          className="explore-treasure-count explore-hideaway-count"
          aria-label={hideawayCountLabel}
          data-tip={hideawayCountLabel}
        >
          <TentIcon />
          <span aria-hidden="true">
            {exploredHideawayIds.length}/{hideaways.length}
          </span>
        </p>
        <p
          className="explore-treasure-count explore-friend-count"
          aria-label={friendCountLabel}
          data-tip={friendCountLabel}
        >
          <PawIcon />
          <span aria-hidden="true">
            {metFriendIds.length}/{friends.length}
          </span>
        </p>
        <p
          className="explore-treasure-count explore-race-count"
          aria-label={raceCountLabel}
          data-tip={raceCountLabel}
        >
          <FlagIcon />
          <span aria-hidden="true">
            {wonRaceIds.length}/{adventure.races.length}
          </span>
        </p>
        {quest === undefined ? null : (
          <>
            <QuestProgressBar quest={quest} progress={progress} />
            <button
              type="button"
              className="explore-leave explore-rucksack-button"
              aria-haspopup="dialog"
              aria-label={`Rucksack, ${String(listHeldFinds(quest, progress).length)} things inside`}
              data-tip={`Your rucksack: ${String(listHeldFinds(quest, progress).length)} things inside`}
              onClick={() => {
                setIsRucksackOpen(true);
              }}
            >
              <RucksackIcon />
              <span aria-hidden="true">Rucksack</span>
              <span className="explore-rucksack-count" aria-hidden="true">
                {listHeldFinds(quest, progress).length}
              </span>
            </button>
          </>
        )}
        <button
          type="button"
          className="explore-leave explore-garage-button"
          aria-label="Vehicles"
          data-tip="Your Vehicles: put one on the map to ride"
          aria-expanded={isGarageOpen}
          onClick={() => {
            setIsGarageOpen((isOpen) => !isOpen);
          }}
        >
          <CarIcon />
          <span>Vehicles</span>
        </button>
        <nav className="explore-islands" aria-label="Travel to another Island">
          {sailingIslands.map((sailingIsland) => (
            <button
              key={sailingIsland.id}
              type="button"
              className="island-chip"
              aria-pressed={sailingIsland.id === island.id}
              aria-label={
                sailingIsland.id === island.id
                  ? `${sailingIsland.name}, Year ${String(sailingIsland.yearGroup)}, you are here`
                  : `Travel to ${sailingIsland.name}, Year ${String(sailingIsland.yearGroup)}`
              }
              data-tip={
                sailingIsland.id === island.id
                  ? `You are on ${sailingIsland.name}`
                  : `Travel to ${sailingIsland.name}, Year ${String(sailingIsland.yearGroup)}`
              }
              disabled={voyage !== undefined}
              onClick={() => {
                sailTo(sailingIsland.id);
              }}
            >
              <AnchorIcon />
              <span aria-hidden="true">Y{sailingIsland.yearGroup}</span>
            </button>
          ))}
        </nav>
      </header>
      {isCarried && voyageIsland !== undefined ? (
        <MovablePopup
          positionKey="explore-voyage"
          className="explore-voyage"
          aria-label="Voyage"
        >
          <p role="status" aria-live="polite">
            {voyageMessage}
          </p>
          <button
            type="button"
            className="explore-action explore-fast-forward"
            aria-label={`Fast forward: go straight to ${voyageIsland.name}`}
            onClick={fastForward}
          >
            <FastForwardIcon />
            Fast forward
          </button>
        </MovablePopup>
      ) : null}
      {isCarried ? null : climbedLookout === undefined ? (
        <CameraViewButtons
          views={cameraViews}
          cameraView={cameraView}
          onViewChosen={setCameraView}
        />
      ) : null}
      {isGarageOpen ? (
        <VehicleGarage
          vehicles={garageVehicles}
          chosenItemId={vehicle?.itemId}
          isRiding={ride === "vehicle"}
          onChosen={(owned) => {
            setIsGarageOpen(false);
            setRide(undefined);
            setVehicle((placed) => ({
              ...owned,
              placedCount: (placed?.placedCount ?? 0) + 1,
            }));
          }}
          onPutAway={() => {
            setIsGarageOpen(false);
            setRide(undefined);
            setVehicle(undefined);
          }}
          onClose={() => {
            setIsGarageOpen(false);
          }}
        />
      ) : null}
      {railway === undefined || isCarried ? null : (
        <TrainPanel
          railway={railway}
          report={trainReport}
          isWanted={ride === "train"}
          onGetOn={() => {
            closeCards();
            setRide("train");
          }}
          onGetOff={() => {
            setRide(undefined);
          }}
        />
      )}
      <p className="explore-status" role="status" aria-live="polite">
        {isCarried
          ? ""
          : (raceNews ??
            (playRideName === undefined
              ? undefined
              : `Wheee! You're having a go on ${playRideName}!`) ??
            attractionNews ??
            questNews ??
            (runningRace === undefined
              ? undefined
              : describeRaceProgress(runningRace)) ??
            treasureNews ??
            (parcel === undefined ? undefined : describeParcel(parcel)) ??
            statusMessage ??
            "")}
      </p>
      {isHelpShown && !isCarried ? (
        <MovablePopup
          positionKey="explore-help"
          className="explore-help"
          aria-label="How to explore"
        >
          <h2>Explore {island.name}!</h2>
          <div className="explore-help-body">
            <ul>
              <li>Walk with the arrow keys, W A S D or the joystick.</li>
              <li>
                Click the ground to walk there, or hold the mouse button to keep
                walking towards the pointer.
              </li>
              <li>Right-drag, or drag a finger, to look around.</li>
              <li>Press V or the camera buttons to change your view.</li>
              <li>
                Wait at a Station to ride the train, or press Vehicles to put
                one of your Vehicles on the map and drive it.
              </li>
            </ul>
            {quest === undefined ? null : (
              <p>
                <strong>{quest.title}:</strong> talk to the people of{" "}
                {island.name}, pick up things for your rucksack, and use them to
                solve all {quest.puzzles.length} puzzles and win a Trophy!
              </p>
            )}
            <p>
              Find all {treasures.length} {treasureKind.plural}, explore{" "}
              {hideaways.length} hidden hideaways, say hello to {friends.length}{" "}
              {friendKind.plural}, climb up high, swim the rivers and bounce on
              the {adventure.bouncePads.name}s! Run through the glowing rings of
              a Ring Race before the time runs out ({wonRaceIds.length} of{" "}
              {adventure.races.length} won). Press an Island&apos;s Year at the
              top to sail there from the Dock.
            </p>
          </div>
          {sceneLoading === undefined ? null : (
            <BusyProgress
              className="explore-getting-ready"
              label={gettingReadyLabel}
              detail={sceneLoading.step}
              share={sceneLoading.share}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setIsHelpShown(false);
            }}
          >
            Let&apos;s go!
          </button>
        </MovablePopup>
      ) : null}
      {sceneLoading === undefined || (isHelpShown && !isCarried) ? null : (
        <div className="explore-loading" aria-busy="true">
          <BusyProgress
            className="explore-getting-ready"
            label={gettingReadyLabel}
            detail={sceneLoading.step}
            share={sceneLoading.share}
          />
        </div>
      )}
      {climbedLookout === undefined ? null : (
        <MovablePopup
          positionKey="explore-lookout"
          className="explore-lookout"
          aria-label={`At the top of ${climbedLookout.name}`}
        >
          <p>
            You climbed to the top of {climbedLookout.name}! Drag to look all
            around {island.name}.
          </p>
          <button type="button" className="explore-action" onClick={climbDown}>
            <ClimbIcon />
            Climb down
          </button>
        </MovablePopup>
      )}
      {readSign === undefined ? null : (
        <ExploreCard
          title={readSign.title}
          text={readSign.fact}
          closeLabel="Close the sign"
          onClose={() => {
            setReadSign(undefined);
          }}
        />
      )}
      {openAttraction === undefined ? null : (
        <ExploreCard
          title={openAttraction.title}
          text={openAttraction.text}
          closeLabel={`Leave ${openAttraction.title}`}
          onClose={() => {
            setOpenAttractionId(undefined);
          }}
        >
          {openAttraction.actions.map((action) => (
            <button
              key={action.kind}
              type="button"
              className="explore-action"
              onClick={() => {
                setOpenAttractionId(undefined);
                if (action.kind === "story") {
                  onRegionOpened(action.regionId);
                  return;
                }
                if (action.kind === "play") {
                  setAttractionNews(action.news);
                  if (action.tune !== undefined) {
                    playAttractionTune(action.tune, {
                      isMusicMuted: soundSettings?.isMusicMuted ?? true,
                      areSoundEffectsMuted:
                        soundSettings?.areSoundEffectsMuted ?? true,
                    });
                  }
                  return;
                }
                if (openAttractionId !== undefined) {
                  setParcel({
                    fromId: openAttractionId,
                    targetId: action.targetId,
                    targetName: action.targetName,
                  });
                }
              }}
            >
              <StarIcon />
              {action.label}
            </button>
          ))}
        </ExploreCard>
      )}
      {openHideaway === undefined ? null : (
        <ExploreCard
          title={`You found ${openHideaway.name}!`}
          text={openHideaway.discovery}
          closeLabel="Leave the hideaway"
          onClose={() => {
            setOpenHideaway(undefined);
          }}
        />
      )}
      {quest === undefined ||
      openIslanderId === undefined ||
      askingPuzzle !== undefined ? null : (
        <IslanderCard
          key={openIslanderId}
          quest={quest}
          progress={progress}
          islanderId={openIslanderId}
          reply={questReply}
          onGive={(find) => {
            offerFind(
              { kind: "islander", id: openIslanderId },
              quest.islanders.find(({ id }) => id === openIslanderId)?.name ??
                "them",
              find,
            );
          }}
          onClose={closeCards}
        />
      )}
      {quest === undefined ||
      openThingId === undefined ||
      askingPuzzle !== undefined ? null : (
        <ThingCard
          key={openThingId}
          quest={quest}
          progress={progress}
          thingId={openThingId}
          reply={questReply}
          onUse={(find) => {
            offerFind(
              { kind: "thing", id: openThingId },
              quest.things.find(({ id }) => id === openThingId)?.name ?? "it",
              find,
            );
          }}
          onClose={closeCards}
        />
      )}
      {askingPuzzle === undefined ? null : (
        <QuestQuestionCard
          key={askingPuzzle.id}
          puzzle={askingPuzzle}
          onAnswered={() => {
            solvePuzzle(askingPuzzle);
          }}
          onClose={() => {
            setAskingPuzzle(undefined);
          }}
        />
      )}
      {quest === undefined ? null : (
        <>
          <RucksackDialog
            quest={quest}
            progress={progress}
            islandName={island.name}
            isOpen={isRucksackOpen}
            onClose={() => {
              setIsRucksackOpen(false);
            }}
          />
          <QuestTrophyDialog
            quest={quest}
            isOpen={isTrophyShown}
            onClose={() => {
              setIsTrophyShown(false);
            }}
          />
        </>
      )}
      {greetingFriend === undefined ? null : (
        <ExploreCard
          title={greetingFriend.name}
          text={greetingFriend.greeting}
          closeLabel={`Say goodbye to ${greetingFriend.name}`}
          onClose={() => {
            setGreetingFriend(undefined);
          }}
        />
      )}
      {isDockStoryShown ? (
        <ExploreCard
          title={`The Dock on ${island.name}`}
          text={dockStory}
          closeLabel="Leave the Dock"
          onClose={() => {
            setIsDockStoryShown(false);
          }}
        />
      ) : null}
      {climbedLookout === undefined &&
      !isCarried &&
      trainReport.kind !== "riding" ? (
        <>
          <Joystick
            onStickMoved={(moved) => {
              stick.current = moved;
              updateInput();
            }}
          />
          <div
            className="explore-actions"
            role="group"
            aria-label="Things to do"
          >
            {vehicle !== undefined && (ride === "vehicle" || isNearVehicle) ? (
              <button
                type="button"
                className="explore-action explore-ride-vehicle"
                onClick={() => {
                  setRide(ride === "vehicle" ? undefined : "vehicle");
                }}
              >
                <CarIcon />
                {ride === "vehicle"
                  ? `Get off the ${vehicle.name}`
                  : `Ride the ${vehicle.name}`}
              </button>
            ) : null}
            {nearby.slice(0, 2).map((interaction) => {
              const Icon = interactionIcons[interaction.kind];
              return (
                <button
                  key={`${interaction.kind}-${interaction.id}`}
                  type="button"
                  className="explore-action"
                  onClick={() => {
                    startInteraction(interaction);
                  }}
                >
                  <Icon />
                  {describeInteraction(interaction)}
                </button>
              );
            })}
            <button
              type="button"
              className="explore-jump"
              aria-label="Jump"
              onPointerDown={startJump}
              onClick={(event) => {
                if (event.detail === 0) {
                  startJump();
                }
              }}
            >
              <JumpIcon />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
};
