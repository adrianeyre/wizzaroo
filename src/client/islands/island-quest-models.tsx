import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { BufferGeometry, Matrix4, Quaternion, Vector3, type Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  findIslandQuest,
  findPuzzleAt,
  type IslandQuest,
  type QuestProgress,
} from "../../curriculum/island-quests.js";
import { isMotionReduced } from "../reduced-motion.js";
import { useBuiltGeometry } from "../world-map-hooks.js";
import { buildModelGeometry } from "../world-map-models.js";
import { clickSlopPixels, GrainedMaterial } from "../world-map-scene.js";
import { surfaceGrains } from "../world-map-shaders.js";
import type { MapPoint } from "../world-map-terrain.js";
import type { ExploreInteraction } from "./island-adventures.js";
import { listFindsInReach, listQuestSites } from "./island-quest.js";
import type { QuestSite } from "./island-quest-sites.js";
import { buildFindGeometry } from "./quest-find-models.js";
import {
  buildIslanderGeometry,
  islanderHeight,
} from "./quest-islander-models.js";
import { gem, ring } from "./quest-model-kit.js";
import { buildThingGeometry } from "./quest-thing-models.js";

/**
 * The Quest's people, things and Finds on the Island (ADR 0058). Only
 * those within `questDrawReach` of the Character are drawn, each kind
 * merged into one mesh, so the Quest adds three meshes and a few
 * thousand triangles to the exploring budget wherever the Character is.
 */
export const questDrawReach = 32;
const nearCheckSeconds = 0.4;
const findScale = 0.5;
const findLift = 0.25;
const markerColour = "#facc15";

const findNearSiteIds = (
  sites: readonly QuestSite[],
  spot: MapPoint | undefined,
): string[] =>
  spot === undefined
    ? []
    : sites
        .filter(
          ({ centre }) =>
            Math.hypot(centre.x - spot.x, centre.z - spot.z) <= questDrawReach,
        )
        .map(({ id }) => id);

const placeGeometry = (
  geometry: BufferGeometry,
  site: QuestSite,
  scale = 1,
  lift = 0,
): BufferGeometry =>
  geometry.applyMatrix4(
    new Matrix4().compose(
      new Vector3(site.centre.x, site.ground + lift, site.centre.z),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), site.turn),
      new Vector3(scale, scale, scale),
    ),
  );

const mergePlaced = (geometries: BufferGeometry[]): BufferGeometry => {
  const merged =
    geometries.length === 0 ? null : mergeGeometries(geometries, false);
  for (const geometry of geometries) {
    geometry.dispose();
  }
  return merged ?? new BufferGeometry();
};

const hasOwnPuzzleOpen = (
  quest: IslandQuest,
  progress: QuestProgress,
  islanderId: string,
): boolean => {
  const puzzle = findPuzzleAt(quest, { kind: "islander", id: islanderId });
  return puzzle !== undefined && !progress.solvedPuzzleIds.includes(puzzle.id);
};

const buildIslandersGeometry = (
  quest: IslandQuest,
  progress: QuestProgress,
  sites: readonly QuestSite[],
): BufferGeometry =>
  mergePlaced(
    sites.flatMap((site) => {
      const islander = quest.islanders.find(({ id }) => id === site.id);
      if (islander === undefined) {
        return [];
      }
      const figure = placeGeometry(buildIslanderGeometry(islander.look), site);
      return hasOwnPuzzleOpen(quest, progress, islander.id)
        ? [
            figure,
            placeGeometry(
              buildModelGeometry([
                gem(0.16, markerColour, {
                  at: [0, islanderHeight + 0.35, 0],
                  scale: [1, 1.5, 1],
                }),
              ]),
              site,
            ),
          ]
        : [figure];
    }),
  );

const buildThingsGeometry = (
  quest: IslandQuest,
  progress: QuestProgress,
  sites: readonly QuestSite[],
): BufferGeometry =>
  mergePlaced(
    sites.flatMap((site) => {
      const thing = quest.things.find(({ id }) => id === site.id);
      const puzzle = findPuzzleAt(quest, { kind: "thing", id: site.id });
      return thing === undefined || puzzle === undefined
        ? []
        : [
            placeGeometry(
              buildThingGeometry(
                thing,
                progress.solvedPuzzleIds.includes(puzzle.id),
              ),
              site,
            ),
          ];
    }),
  );

const buildFindsGeometry = (
  quest: IslandQuest,
  sites: readonly QuestSite[],
): BufferGeometry =>
  mergePlaced(
    sites.flatMap((site) => {
      const find = quest.finds.find(({ id }) => id === site.id);
      return find === undefined
        ? []
        : [
            placeGeometry(
              buildFindGeometry(find.look),
              site,
              findScale,
              findLift,
            ),
            placeGeometry(
              buildModelGeometry([
                ring(0.5, 0.05, markerColour, {
                  at: [0, 0.05, 0],
                  turn: [Math.PI / 2, 0, 0],
                }),
              ]),
              site,
            ),
          ];
    }),
  );

const findNearestSite = (
  sites: readonly QuestSite[],
  point: { x: number; z: number },
): QuestSite | undefined =>
  sites
    .map((site) => ({
      site,
      distance: Math.hypot(site.centre.x - point.x, site.centre.z - point.z),
    }))
    .toSorted((first, second) => first.distance - second.distance)
    .at(0)?.site;

interface IslandQuestSceneProps {
  islandId: string;
  progress: QuestProgress;
  /** Where the Character stands; the World Map has no Character, so leaves it out. */
  explorerSpot?: { current: MapPoint | undefined };
  /** Draws every Islander, Thing and Find at once, as the World Map does, rather than only those near the Character. */
  isWholeIslandShown?: boolean;
  onFindReached?: (findId: string) => void;
  onChosen?: (interaction: ExploreInteraction) => void;
  onWalkTo?: (point: MapPoint) => void;
}

const nobodyExploring: { current: MapPoint | undefined } = {
  current: undefined,
};

export const IslandQuestScene = ({
  islandId,
  progress,
  explorerSpot = nobodyExploring,
  isWholeIslandShown = false,
  onFindReached,
  onChosen,
  onWalkTo,
}: IslandQuestSceneProps) => {
  const quest = findIslandQuest(islandId);
  const sites = listQuestSites(islandId);
  const [nearIds, setNearIds] = useState(() =>
    isWholeIslandShown
      ? sites.map(({ id }) => id)
      : findNearSiteIds(sites, explorerSpot.current),
  );
  const nearKey = nearIds.join(",");
  const solvedKey = progress.solvedPuzzleIds.join(",");
  const pickedKey = progress.pickedUpFindIds.join(",");
  const checkTimer = useRef(0);
  const age = useRef(0);
  const reachedFindIds = useRef(new Set<string>());
  const findsMesh = useRef<Mesh>(null);
  const latest = useRef({ progress, onFindReached });
  useEffect(() => {
    latest.current = { progress, onFindReached };
  });

  const nearSites = useCallback(
    (kind: QuestSite["kind"]) =>
      sites.filter(
        (site) =>
          site.kind === kind &&
          nearKey.split(",").includes(site.id) &&
          (kind !== "find" || !pickedKey.split(",").includes(site.id)),
      ),
    [sites, nearKey, pickedKey],
  );

  const islanders = useBuiltGeometry(
    useCallback(
      () =>
        quest === undefined
          ? new BufferGeometry()
          : buildIslandersGeometry(quest, progress, nearSites("islander")),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt only when a Puzzle is solved or the Character moves on
      [quest, nearSites, solvedKey],
    ),
  );
  const things = useBuiltGeometry(
    useCallback(
      () =>
        quest === undefined
          ? new BufferGeometry()
          : buildThingsGeometry(quest, progress, nearSites("thing")),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt only when a Puzzle is solved or the Character moves on
      [quest, nearSites, solvedKey],
    ),
  );
  const finds = useBuiltGeometry(
    useCallback(
      () =>
        quest === undefined
          ? new BufferGeometry()
          : buildFindsGeometry(quest, nearSites("find")),
      [quest, nearSites],
    ),
  );

  useFrame((_state, deltaSeconds) => {
    const spot = explorerSpot.current;
    checkTimer.current += deltaSeconds;
    if (!isWholeIslandShown && checkTimer.current >= nearCheckSeconds) {
      checkTimer.current = 0;
      const ids = findNearSiteIds(sites, spot);
      if (ids.join(",") !== nearKey) {
        setNearIds(ids);
      }
    }
    if (spot !== undefined) {
      for (const { id } of listFindsInReach(
        islandId,
        latest.current.progress,
        spot,
      )) {
        if (!reachedFindIds.current.has(id)) {
          reachedFindIds.current.add(id);
          latest.current.onFindReached?.(id);
        }
      }
    }
    age.current += deltaSeconds * (isMotionReduced() ? 0 : 1);
    if (findsMesh.current !== null) {
      findsMesh.current.position.y = Math.sin(age.current * 2.4) * 0.08;
    }
  });

  if (quest === undefined) {
    return null;
  }

  const choose = (kind: "islander" | "thing" | "find") =>
    onChosen === undefined || onWalkTo === undefined
      ? undefined
      : (event: ThreeEvent<MouseEvent>) => {
          if (event.delta > clickSlopPixels) {
            return;
          }
          const site = findNearestSite(nearSites(kind), event.point);
          if (site === undefined) {
            return;
          }
          event.stopPropagation();
          if (kind === "find") {
            onWalkTo(site.centre);
            return;
          }
          const name =
            kind === "islander"
              ? quest.islanders.find(({ id }) => id === site.id)?.name
              : quest.things.find(({ id }) => id === site.id)?.name;
          onChosen({
            kind: kind === "islander" ? "islander" : "quest-thing",
            id: site.id,
            name: name ?? site.id,
            position: site.centre,
          });
        };

  return (
    <group name="island-quest">
      {nearSites("islander").length === 0 ? null : (
        <mesh
          name="quest-islanders"
          geometry={islanders}
          castShadow
          onClick={choose("islander")}
        >
          <GrainedMaterial grain={surfaceGrains.ground} />
        </mesh>
      )}
      {nearSites("thing").length === 0 ? null : (
        <mesh
          name="quest-things"
          geometry={things}
          castShadow
          onClick={choose("thing")}
        >
          <GrainedMaterial grain={surfaceGrains.ground} />
        </mesh>
      )}
      {nearSites("find").length === 0 ? null : (
        <mesh
          ref={findsMesh}
          name="quest-finds"
          geometry={finds}
          onClick={choose("find")}
        >
          <GrainedMaterial grain={surfaceGrains.ground} />
        </mesh>
      )}
    </group>
  );
};
