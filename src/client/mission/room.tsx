import { useState } from "react";
import {
  catalogue,
  findChosenFurniture,
  furnitureSlots,
  type CharacterLoadout,
  type FurnitureSlot,
  type Item,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import {
  isItemHeld,
  listQuestTrophies,
  listTrophies,
  type QuestTrophy,
  type ChildRewards,
  type Trophy,
} from "../../curriculum/rewards.js";
import { findIsland, findRegion } from "../../curriculum/world-map.js";
import { CharacterPortrait } from "../character/character-preview.js";
import { buildItemShot, ItemPicture } from "../character/item-picture.js";
import { RoomPlay } from "../character/room-play.js";
import { RoomPlayCanvas } from "../character/room-play-scene.js";
import { RoomScene } from "../character/room-scene.js";
import {
  describeShopProblem,
  findShopProblem,
  ItemPrice,
} from "../character/wardrobe.js";
import {
  fetchClassmateRooms,
  type ClassmateRoom,
} from "../family-device/classmate-rooms.js";
import type { Sibling } from "../family-device/family-device-page.js";
import type { SoundSettings } from "../game-sound.js";
import { BusyProgress } from "../busy/busy-progress.js";

interface RoomProps {
  childId: string;
  characterName: string;
  rewards: ChildRewards;
  siblings: Sibling[];
  canVisitClassmates: boolean;
  today: string;
  soundSettings: SoundSettings;
  onBuy: (itemId: string, giftForChildId: string | null) => void;
  onFurnish: (room: RoomLoadout) => void;
  onClose: () => void;
}

interface VisitedRoom {
  heading: string;
  characterLabel: string;
  room: RoomLoadout;
  loadout: CharacterLoadout;
  trophies: Trophy[];
}

type ClassmatesView =
  | { kind: "closed" }
  | { kind: "loading" }
  | { kind: "offline" }
  | { kind: "listed"; classmateRooms: ClassmateRoom[] };

const placeNames: Record<FurnitureSlot, string> = {
  bed: "Bed",
  rug: "Rug",
  wallpaper: "Walls",
  wallPicture: "Picture",
  shelf: "Shelf",
  lamp: "Lamp",
  window: "Window",
  plant: "Plant",
  desk: "Desk",
  seat: "Seat",
  toyBox: "Toy Box",
  clock: "Clock",
  fishTank: "Fish Tank",
  softToy: "Soft Toy",
  instrument: "Instrument",
};

const classmateLabel = "A Classmate";

export const describeTrophy = ({ islandId, regionId }: Trophy): string => {
  const regionName = findRegion(islandId, regionId)?.name ?? regionId;
  const islandName = findIsland(islandId)?.name ?? islandId;
  return `${regionName} on ${islandName}`;
};

export const describeQuestTrophy = ({
  islandId,
  trophyName,
}: QuestTrophy): string =>
  `${trophyName}, for the Quest on ${findIsland(islandId)?.name ?? islandId}`;

const TrophyList = ({
  trophies,
  questTrophies = [],
}: {
  trophies: Trophy[];
  questTrophies?: QuestTrophy[];
}) => (
  <section className="wardrobe-slot room-trophies">
    <h2>Trophies</h2>
    {trophies.length === 0 && questTrophies.length === 0 ? (
      <p>
        Earn enough Stars in a Region to open all its Games, or solve every
        puzzle in an Island&apos;s Quest, and a Trophy goes on the shelf.
      </p>
    ) : (
      <ul>
        {trophies.map((trophy) => (
          <li key={`${trophy.islandId}-${trophy.regionId}`}>
            {describeTrophy(trophy)}
          </li>
        ))}
        {questTrophies.map((trophy) => (
          <li key={`quest-${trophy.islandId}`}>
            {describeQuestTrophy(trophy)}
          </li>
        ))}
      </ul>
    )}
  </section>
);

const VisitedRoomView = ({
  visitedRoom,
  onBack,
}: {
  visitedRoom: VisitedRoom;
  onBack: () => void;
}) => {
  const [showOffCount, setShowOffCount] = useState(0);
  return (
    <main className="menu wardrobe room">
      <h1>{visitedRoom.heading}</h1>
      <div className="wardrobe-layout">
        <aside className="wardrobe-stage room-stage" aria-label="The Room">
          <RoomScene
            room={visitedRoom.room}
            trophies={visitedRoom.trophies}
            loadout={visitedRoom.loadout}
            characterLabel={visitedRoom.characterLabel}
            showOffCount={showOffCount}
          />
          <div className="wardrobe-stage-actions">
            <button
              type="button"
              className="show-off"
              onClick={() => {
                setShowOffCount((count) => count + 1);
              }}
            >
              Wave hello!
            </button>
          </div>
        </aside>
        <div className="wardrobe-options">
          <TrophyList trophies={visitedRoom.trophies} />
          <button type="button" className="wardrobe-back" onClick={onBack}>
            Back to my Room
          </button>
        </div>
      </div>
    </main>
  );
};

const ClassmateRooms = ({
  classmatesView,
  onOpen,
  onVisit,
}: {
  classmatesView: ClassmatesView;
  onOpen: () => void;
  onVisit: (classmateRoom: ClassmateRoom) => void;
}) => {
  if (classmatesView.kind === "closed" || classmatesView.kind === "loading") {
    const isLoading = classmatesView.kind === "loading";
    return (
      <>
        <button type="button" onClick={onOpen} disabled={isLoading}>
          Visit your Classmates&apos; Rooms
        </button>
        {isLoading ? (
          <BusyProgress
            label="Finding your Classmates' Rooms…"
            detail="Asking Wizzaroo for the Rooms your Classmates have made"
          />
        ) : null}
      </>
    );
  }
  if (classmatesView.kind === "offline") {
    return (
      <p role="status">
        Visiting Classmates needs the internet. Try again when you&apos;re
        online.
      </p>
    );
  }
  if (classmatesView.classmateRooms.length === 0) {
    return (
      <p role="status">There are no Classmates&apos; Rooms to visit yet.</p>
    );
  }
  return (
    <div className="portraits room-classmates">
      {classmatesView.classmateRooms.map((classmateRoom, index) => (
        <button
          key={String(index)}
          type="button"
          className="portrait"
          aria-label={`Visit Classmate ${String(index + 1)}'s Room`}
          onClick={() => {
            onVisit(classmateRoom);
          }}
        >
          <CharacterPortrait loadout={classmateRoom.loadout} isPetShown />
        </button>
      ))}
    </div>
  );
};

export const Room = ({
  childId,
  characterName,
  rewards,
  siblings,
  canVisitClassmates,
  today,
  soundSettings,
  onBuy,
  onFurnish,
  onClose,
}: RoomProps) => {
  const [room, setRoom] = useState(rewards.room);
  const [shownPlace, setShownPlace] = useState<FurnitureSlot>("bed");
  const [showOffCount, setShowOffCount] = useState(0);
  const [announcement, setAnnouncement] = useState<string>();
  const [visitedRoom, setVisitedRoom] = useState<VisitedRoom>();
  const [classmatesView, setClassmatesView] = useState<ClassmatesView>({
    kind: "closed",
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const trophies = listTrophies(rewards);

  if (isPlaying) {
    return (
      <RoomPlay
        characterName={characterName}
        room={room}
        trophies={trophies}
        loadout={rewards.loadout}
        soundSettings={soundSettings}
        renderScene={(sceneProps) => <RoomPlayCanvas {...sceneProps} />}
        onLeave={() => {
          setIsPlaying(false);
        }}
      />
    );
  }

  if (visitedRoom !== undefined) {
    return (
      <VisitedRoomView
        visitedRoom={visitedRoom}
        onBack={() => {
          setVisitedRoom(undefined);
        }}
      />
    );
  }

  const openClassmateRooms = () => {
    setClassmatesView({ kind: "loading" });
    void fetchClassmateRooms(childId).then(
      (classmateRooms) => {
        setClassmatesView(
          classmateRooms === undefined
            ? { kind: "offline" }
            : { kind: "listed", classmateRooms },
        );
      },
      () => {
        setClassmatesView({ kind: "offline" });
      },
    );
  };

  const renderFurniture = (item: Item) => {
    const isChosen = findChosenFurniture(room, shownPlace).id === item.id;
    const picture = (
      <ItemPicture
        shot={buildItemShot(item.slot, item.id, rewards.loadout)}
        colour={item.colour}
      />
    );
    if (isItemHeld(rewards, item)) {
      return (
        <button
          key={item.id}
          type="button"
          className="wardrobe-item"
          aria-pressed={isChosen}
          onClick={() => {
            setRoom({ ...room, [shownPlace]: item.id });
          }}
        >
          {picture}
          <span className="wardrobe-item-name">
            <span className="visually-hidden">Put in </span>
            {item.name}
          </span>
        </button>
      );
    }
    const problem = findShopProblem(rewards, item, today);
    return (
      <button
        key={item.id}
        type="button"
        className="wardrobe-item"
        disabled={problem !== undefined}
        onClick={() => {
          onBuy(item.id, null);
          setAnnouncement(`You bought the ${item.name}! Tap it to put it in.`);
        }}
      >
        {picture}
        <span className="wardrobe-item-name">
          <span className="visually-hidden">Buy </span>
          {item.name}
        </span>
        <ItemPrice starCost={item.starCost} />
        {problem === undefined ? null : (
          <span className="wardrobe-problem">
            {describeShopProblem(problem, item, "your Room")}
          </span>
        )}
      </button>
    );
  };

  return (
    <main className="menu wardrobe room">
      <h1>{characterName}&apos;s Room</h1>
      <div className="wardrobe-layout">
        <aside className="wardrobe-stage room-stage" aria-label="Your Room">
          <RoomScene
            room={room}
            trophies={trophies}
            loadout={rewards.loadout}
            characterLabel={characterName}
            showOffCount={showOffCount}
          />
          <div className="wardrobe-stage-actions">
            <button
              type="button"
              className="room-play-start"
              onClick={() => {
                setIsPlaying(true);
              }}
            >
              Play in my Room
            </button>
            <button
              type="button"
              className="show-off"
              onClick={() => {
                setShowOffCount((count) => count + 1);
              }}
            >
              Show off!
            </button>
            <button
              type="button"
              className="wardrobe-save"
              onClick={() => {
                onFurnish(room);
                setAnnouncement("Your Room looks wonderful!");
              }}
            >
              Save my Room
            </button>
            <p role="status">{announcement}</p>
          </div>
        </aside>
        <div className="wardrobe-options">
          <nav className="wardrobe-tabs" aria-label="Furnish your Room">
            <h2>Furnish your Room</h2>
            {furnitureSlots.map((place) => (
              <button
                key={place}
                type="button"
                aria-pressed={shownPlace === place}
                onClick={() => {
                  setShownPlace(place);
                }}
              >
                {placeNames[place]}
              </button>
            ))}
          </nav>
          <section className="wardrobe-slot">
            <h2>{placeNames[shownPlace]}</h2>
            <div className="wardrobe-items">
              {catalogue
                .filter(({ slot }) => slot === shownPlace)
                .map(renderFurniture)}
            </div>
          </section>
          <TrophyList
            trophies={trophies}
            questTrophies={listQuestTrophies(rewards)}
          />
          {siblings.length === 0 && !canVisitClassmates ? null : (
            <section
              className="wardrobe-slot room-visits"
              aria-busy={classmatesView.kind === "loading" ? true : undefined}
            >
              <h2>Visit a Room</h2>
              <div className="wardrobe-outfit-list">
                {siblings.map((sibling) => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => {
                      setVisitedRoom({
                        heading: `${sibling.characterName}'s Room`,
                        characterLabel: sibling.characterName,
                        room: sibling.rewards.room,
                        loadout: sibling.rewards.loadout,
                        trophies: listTrophies(sibling.rewards),
                      });
                    }}
                  >
                    Visit {sibling.characterName}&apos;s Room
                  </button>
                ))}
              </div>
              {canVisitClassmates ? (
                <ClassmateRooms
                  classmatesView={classmatesView}
                  onOpen={openClassmateRooms}
                  onVisit={(classmateRoom) => {
                    setVisitedRoom({
                      heading: `${classmateLabel}'s Room`,
                      characterLabel: classmateLabel,
                      room: classmateRoom.room,
                      loadout: classmateRoom.loadout,
                      trophies: classmateRoom.trophies,
                    });
                  }}
                />
              ) : null}
            </section>
          )}
          <button type="button" className="wardrobe-back" onClick={onClose}>
            Back to the World Map
          </button>
        </div>
      </div>
    </main>
  );
};
