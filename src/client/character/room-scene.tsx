import { Canvas } from "@react-three/fiber";
import {
  catalogue,
  findChosenFurniture,
  furnitureSlots,
  type CharacterLoadout,
  type FurnitureSlot,
  type Item,
  type RoomLoadout,
} from "../../curriculum/catalogue.js";
import type { Trophy } from "../../curriculum/rewards.js";
import { ShowingOffCharacter } from "./character-show-off.js";
import { Part, box, shadeColour, type Vector } from "./character-parts.js";
import { StudioLights } from "./character-preview.js";
import { MergedParts } from "./merged-parts.js";
import {
  Furniture,
  shelfRowGap,
  TrophyCup,
  WallpaperPanel,
  wallHeight,
  wallWidth,
} from "./room-furniture.js";
import {
  backWallZ,
  furniturePlacements,
  roomDepth,
  sideWallX,
} from "./room-layout.js";

const floorColour = "#c89f72";
const sharpestPixelRatio: [number, number] = [1, 2];
const cameraPosition: Vector = [0.4, 2.6, 7.4];
const lookAtPoint: Vector = [0, 1.3, -0.4];
const fieldOfView = 38;
const trophiesPerRow = 6;
const mostTrophiesShown = trophiesPerRow * 2;
const trophySpacing = 0.24;

const characterPosition: Vector = [0.35, 0.02, 0.5];

export const findFurnitureItems = (
  room: RoomLoadout,
  items: readonly Item[],
): [FurnitureSlot, Item][] =>
  furnitureSlots.map((slot) => [slot, findChosenFurniture(room, slot, items)]);

const describeTrophies = (count: number): string => {
  if (count === 0) {
    return "No Trophies on the shelf yet.";
  }
  return count === 1
    ? "1 Trophy on the shelf."
    : `${String(count)} Trophies on the shelf.`;
};

const furnitureList = new Intl.ListFormat("en-GB", {
  style: "long",
  type: "conjunction",
});

export const describeRoom = (
  characterLabel: string,
  room: RoomLoadout,
  trophies: readonly Trophy[],
  items: readonly Item[] = catalogue,
): string => {
  const furnitureNames = findFurnitureItems(room, items).map(
    ([, item]) => item.name,
  );
  return `${characterLabel}'s Room, with ${furnitureList.format(furnitureNames)}. ${describeTrophies(trophies.length)}`;
};

const RoomShell = ({ wallpaper }: { wallpaper: Item }) => {
  const model = wallpaper.model ?? "plain";
  return (
    <>
      <Part colour={floorColour} position={[0, -0.05, 0]}>
        {box(wallWidth, 0.1, roomDepth)}
      </Part>
      <MergedParts
        name="wallpaper-merged"
        mergeKey={`${model}-${wallpaper.colour}`}
      >
        <group position={[0, 0, backWallZ]}>
          <WallpaperPanel
            model={model}
            colour={wallpaper.colour}
            width={wallWidth}
            height={wallHeight}
          />
        </group>
        <group position={[sideWallX, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <WallpaperPanel
            model={model}
            colour={shadeColour(wallpaper.colour, -0.08)}
            width={roomDepth}
            height={wallHeight}
          />
        </group>
      </MergedParts>
    </>
  );
};

export const TrophyShelf = ({ trophies }: { trophies: readonly Trophy[] }) => (
  <>
    {trophies
      .slice(0, mostTrophiesShown)
      .map(({ islandId, regionId }, index) => {
        const row = Math.floor(index / trophiesPerRow);
        const column = index % trophiesPerRow;
        return (
          <group
            key={`${islandId}-${regionId}`}
            position={[
              (column - (trophiesPerRow - 1) / 2) * trophySpacing,
              row * shelfRowGap,
              0.02,
            ]}
          >
            <TrophyCup />
          </group>
        );
      })}
  </>
);

interface RoomSceneProps {
  room: RoomLoadout;
  trophies: Trophy[];
  loadout: CharacterLoadout;
  characterLabel: string;
  showOffCount?: number;
}

export const RoomScene = ({
  room,
  trophies,
  loadout,
  characterLabel,
  showOffCount = 0,
}: RoomSceneProps) => {
  const furniture = findFurnitureItems(room, catalogue);
  return (
    <div
      className="room-scene"
      role="img"
      aria-label={describeRoom(characterLabel, room, trophies)}
    >
      <Canvas
        flat
        dpr={sharpestPixelRatio}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
        camera={{ position: cameraPosition, fov: fieldOfView }}
        onCreated={({ camera }) => {
          camera.lookAt(...lookAtPoint);
        }}
      >
        <StudioLights />
        {furniture.map(([slot, item]) =>
          slot === "wallpaper" ? (
            <RoomShell key={slot} wallpaper={item} />
          ) : (
            <group
              key={slot}
              position={furniturePlacements[slot].position}
              rotation={furniturePlacements[slot].rotation}
              scale={furniturePlacements[slot].scale}
            >
              <Furniture
                look={{ slot, model: item.model ?? "", colour: item.colour }}
              />
              {slot === "shelf" ? <TrophyShelf trophies={trophies} /> : null}
            </group>
          ),
        )}
        <group position={characterPosition}>
          <ShowingOffCharacter loadout={loadout} showOffCount={showOffCount} />
        </group>
      </Canvas>
    </div>
  );
};
