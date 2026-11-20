import { useMemo } from "react";
import {
  findQuestProgress,
  type QuestProgress,
} from "../../curriculum/island-quests.js";
import type { TimeOfDay } from "../world-map-sky.js";
import { exploreScale, findExploreAdventure } from "./island-adventures.js";
import { MapAttractions } from "./island-attractions-models.js";
import {
  AdventureTrails,
  BouncePads,
  findDarkness,
  HideawayDens,
  RaceRings,
  SignPosts,
  TrailBridges,
  TrailLamps,
  TreasureGems,
  Watchtowers,
} from "./island-explore-props.js";
import { IslandFriends } from "./island-friends.js";
import { IslandQuestScene } from "./island-quest-models.js";
import type { RaceRun } from "./island-races.js";
import { buildExploreWorld } from "./island-transport.js";
import { IslandWonders } from "./island-wonders-models.js";

const noRaceRunning: { current: RaceRun | undefined } = { current: undefined };

/**
 * Everything explore mode puts on an Island, drawn on the World Map in
 * miniature: trails and bridges, watchtowers, fact signs, hideaways,
 * lamps, bounce pads, treasure still to find, race rings, the Island's
 * Friends, its Wonders, every Attraction and Curiosity, and the Quest's
 * Islanders, Things and Finds. They are only to look at here, so a click
 * on one falls through to the Region underneath.
 */
export const IslandAdventureOnMap = ({
  islandId,
  accent,
  timeOfDay,
  foundTreasureIds,
  questProgress,
}: {
  islandId: string;
  /** The Island's accent, which colours its fact signs and hideaways as in explore mode. */
  accent: string;
  timeOfDay: TimeOfDay;
  foundTreasureIds: readonly string[];
  questProgress: readonly QuestProgress[];
}) => {
  const adventure = findExploreAdventure(islandId);
  const world = useMemo(() => buildExploreWorld(adventure), [adventure]);
  const trailBridges = useMemo(
    () => world.bridges.filter(({ isDrawnByIsland }) => !isDrawnByIsland),
    [world],
  );
  const watchtowers = useMemo(
    () => adventure.lookouts.filter(({ look }) => look === "watchtower"),
    [adventure],
  );
  return (
    <group name="island-adventure-on-map" scale={1 / exploreScale}>
      <AdventureTrails adventure={adventure} />
      {trailBridges.length === 0 ? null : (
        <TrailBridges bridges={trailBridges} />
      )}
      <Watchtowers watchtowers={watchtowers} world={world} />
      <SignPosts adventure={adventure} accent={accent} />
      <HideawayDens adventure={adventure} canvas={accent} />
      <IslandFriends adventure={adventure} />
      <IslandWonders adventure={adventure} />
      <MapAttractions
        adventure={adventure}
        darkness={findDarkness(islandId, timeOfDay)}
      />
      <IslandQuestScene
        islandId={islandId}
        progress={findQuestProgress(questProgress, islandId)}
        isWholeIslandShown
      />
      <TrailLamps world={world} glass={adventure.treasureKind.colour} />
      <BouncePads adventure={adventure} />
      <TreasureGems world={world} foundTreasureIds={foundTreasureIds} />
      <RaceRings world={world} raceRunRef={noRaceRunning} />
    </group>
  );
};
