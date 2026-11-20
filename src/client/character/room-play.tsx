import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MovablePopup } from "../movable-popup.js";
import {
  catalogue,
  findShownOffItem,
  type CharacterLoadout,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { Trophy } from "../../curriculum/rewards.js";
import { playRoomSound, type SoundSettings } from "../game-sound.js";
import {
  BackToMapIcon,
  CameraViewButtons,
  combineDirections,
  ExploreIcon,
  findNextRoomCameraView,
  isButtonTarget,
  isTypingTarget,
  isWalkKey,
  Joystick,
  JumpIcon,
  roomCameraViews,
  type ExploreInput,
  type RoomCameraView,
} from "../islands/island-explore-hud.js";
import {
  describeRoomAction,
  getUpInRoom,
  playWithRoomThing,
  startingRoomPlayState,
  strokeRoomPet,
  type RoomPlayFacts,
  type RoomPlayOutcome,
  type RoomPlayState,
  type RoomThing,
} from "./room-play-actions.js";
import type { RoomPlaySceneProps } from "./room-play-scene.js";
import { findFurnitureItems } from "./room-scene.js";

export interface RoomPlayProps {
  characterName: string;
  room: RoomLoadout;
  trophies: Trophy[];
  loadout: CharacterLoadout;
  soundSettings: SoundSettings;
  renderScene: (sceneProps: RoomPlaySceneProps) => ReactNode;
  onLeave: () => void;
}

const HandIcon = () => (
  <ExploreIcon>
    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
    <path d="M14 10V4a2 2 0 0 0-4 0v6" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </ExploreIcon>
);

const HeartIcon = () => (
  <ExploreIcon>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </ExploreIcon>
);

const findRestingThing = (state: RoomPlayState): RoomThing | undefined => {
  if (state.pose === "lying") {
    return "bed";
  }
  return state.pose === "sitting" ? "seat" : undefined;
};

export const RoomPlay = ({
  characterName,
  room,
  trophies,
  loadout,
  soundSettings,
  renderScene,
  onLeave,
}: RoomPlayProps) => {
  const inputRef = useRef<ExploreInput>({
    right: 0,
    forward: 0,
    wantsJump: false,
  });
  const pressedKeys = useRef(new Set<string>());
  const stick = useRef({ right: 0, forward: 0 });
  const [playState, setPlayState] = useState(startingRoomPlayState);
  const [nearby, setNearby] = useState<RoomThing>();
  const [message, setMessage] = useState("");
  const [isHelpShown, setIsHelpShown] = useState(true);
  const [cameraView, setCameraView] = useState<RoomCameraView>("behind");
  const furniture = useMemo(
    () => new Map(findFurnitureItems(room, catalogue)),
    [room],
  );
  const petName = findShownOffItem(loadout, "pet")?.name;
  const buildFacts = (): RoomPlayFacts => ({
    furniture,
    petName,
    trophyCount: trophies.length,
    time: new Date(),
  });
  const shownThing = findRestingThing(playState) ?? nearby;

  const showOutcome = (outcome: RoomPlayOutcome) => {
    setIsHelpShown(false);
    setPlayState(outcome.state);
    setMessage(outcome.message);
    if (outcome.sound !== undefined) {
      playRoomSound(outcome.sound, soundSettings);
    }
  };

  const playWith = (thing: RoomThing) => {
    showOutcome(playWithRoomThing(thing, playState, buildFacts()));
    if (thing === "rug") {
      inputRef.current.wantsJump = true;
    }
  };

  const strokePet = () => {
    showOutcome(strokeRoomPet(playState, buildFacts()));
  };

  const getUp = () => {
    setPlayState(getUpInRoom);
  };

  const updateInput = () => {
    const { right, forward } = combineDirections(
      pressedKeys.current,
      stick.current,
    );
    inputRef.current.right = right;
    inputRef.current.forward = forward;
  };

  const latestKeyActions = useRef({ shownThing, playWith, getUp });
  useEffect(() => {
    latestKeyActions.current = { shownThing, playWith, getUp };
  });

  useEffect(() => {
    const keys = pressedKeys.current;
    const pressKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }
      const actions = latestKeyActions.current;
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
        setCameraView(findNextRoomCameraView);
        return;
      }
      if (event.code === "KeyE" && actions.shownThing !== undefined) {
        actions.playWith(actions.shownThing);
        return;
      }
      if (event.code === "Escape") {
        setIsHelpShown(false);
        actions.getUp();
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

  const facts = buildFacts();
  const petActions =
    petName !== undefined && playState.isPetHeld ? (
      <>
        <button type="button" className="explore-action" onClick={strokePet}>
          <HeartIcon />
          Stroke your {petName}
        </button>
        <button
          type="button"
          className="explore-action"
          onClick={() => {
            playWith("pet");
          }}
        >
          <HandIcon />
          {describeRoomAction("pet", playState, facts)}
        </button>
      </>
    ) : null;

  return (
    <section
      className="room-play"
      aria-label={`Playing in ${characterName}'s Room`}
    >
      {renderScene({
        room,
        trophies,
        loadout,
        inputRef,
        playState,
        cameraView,
        onNearbyChanged: setNearby,
        onThingReached: playWith,
        onPetStroked: strokePet,
        onGotUp: getUp,
      })}
      <header className="explore-bar">
        <button
          type="button"
          className="explore-leave"
          aria-label="Back to my Room"
          onClick={onLeave}
        >
          <BackToMapIcon />
          <span>My Room</span>
        </button>
        <h1 className="explore-title">{characterName}&apos;s Room</h1>
      </header>
      <CameraViewButtons
        views={roomCameraViews}
        cameraView={cameraView}
        onViewChosen={setCameraView}
      />
      <p className="explore-status" role="status" aria-live="polite">
        {message}
      </p>
      {isHelpShown ? (
        <MovablePopup
          positionKey="room-help"
          className="explore-help"
          aria-label="How to play in your Room"
        >
          <h2>Play in your Room!</h2>
          <ul>
            <li>Walk with the arrow keys, W A S D or the joystick.</li>
            <li>
              Tap the floor to walk there, or tap anything to play with it.
            </li>
            <li>Tap your bed to lie down on it, and your seat to sit on it.</li>
            {petName === undefined ? (
              <li>Get a Pet from your Wardrobe and it will play here too.</li>
            ) : (
              <li>
                Tap your {petName} to pick it up, then stroke it by tapping or
                rubbing it.
              </li>
            )}
            <li>Drag a finger, or right-drag, to look around.</li>
            <li>Press V or the camera buttons to change your view.</li>
            <li>
              Choose Map to see your whole Room from above, then tap anywhere to
              walk there.
            </li>
          </ul>
          <button
            type="button"
            onClick={() => {
              setIsHelpShown(false);
            }}
          >
            Let&apos;s play!
          </button>
        </MovablePopup>
      ) : null}
      <Joystick
        onStickMoved={(moved) => {
          stick.current = moved;
          updateInput();
        }}
      />
      <div className="explore-actions" role="group" aria-label="Things to do">
        {petActions}
        {shownThing === undefined ||
        (shownThing === "pet" && playState.isPetHeld) ? null : (
          <button
            type="button"
            className="explore-action"
            onClick={() => {
              playWith(shownThing);
            }}
          >
            <HandIcon />
            {describeRoomAction(shownThing, playState, facts)}
          </button>
        )}
        <button
          type="button"
          className="explore-jump"
          aria-label="Jump"
          onPointerDown={() => {
            inputRef.current.wantsJump = true;
          }}
          onClick={(event) => {
            if (event.detail === 0) {
              inputRef.current.wantsJump = true;
            }
          }}
        >
          <JumpIcon />
        </button>
      </div>
    </section>
  );
};
