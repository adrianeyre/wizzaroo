import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import {
  applyPlayRecords,
  buildKeptRegionProgress,
  buildStartingChildRewards,
  type FamilyRewards,
  type PlayRecord,
} from "../../curriculum/rewards.js";
import type { GamePlace } from "../../curriculum/world-map.js";
import type { ReachDatabase } from "../reach.js";
import {
  characters,
  children,
  families,
  familyChestCoinAwards,
  keptGameUnlocks,
  playEvents,
  starAwards,
  type PlayEventPayload,
  type PlayEventType,
} from "../schema.js";

interface StoredPlayEvent {
  childId: string;
  type: PlayEventType;
  payload: PlayEventPayload;
}

const rewardedPlayEventTypes: PlayEventType[] = [
  "question-answered",
  "activity-finished",
  "item-bought",
  "character-dressed",
  "outfit-saved",
  "outfit-worn",
  "room-furnished",
  "quest-find-picked-up",
  "quest-puzzle-solved",
];

const findGamePlace = (payload: PlayEventPayload): GamePlace | undefined =>
  "islandId" in payload &&
  payload.islandId !== undefined &&
  "regionId" in payload &&
  payload.regionId !== undefined &&
  "gameId" in payload &&
  payload.gameId !== undefined
    ? {
        islandId: payload.islandId,
        regionId: payload.regionId,
        gameId: payload.gameId,
      }
    : undefined;

const findPlayRecord = ({
  childId,
  type,
  payload,
}: StoredPlayEvent): PlayRecord | undefined => {
  if (type === "question-answered" && "isRightFirstTime" in payload) {
    return {
      kind: type,
      childId,
      skillId: payload.skillId,
      localDate: payload.localDate,
      isRightFirstTime: payload.isRightFirstTime,
      place: findGamePlace(payload),
    };
  }
  if (type === "activity-finished" && "secondsSpent" in payload) {
    return {
      kind: type,
      childId,
      skillId: payload.skillId,
      localDate: payload.localDate,
      secondsSpent: payload.secondsSpent,
      place: findGamePlace(payload),
    };
  }
  if (type === "item-bought" && "itemId" in payload) {
    return {
      kind: type,
      childId,
      itemId: payload.itemId,
      localDate: payload.localDate,
      giftForChildId: payload.giftForChildId ?? null,
    };
  }
  if (type === "character-dressed" && "loadout" in payload) {
    return { kind: type, childId, loadout: payload.loadout };
  }
  if (type === "outfit-saved" && "outfitId" in payload && "name" in payload) {
    return {
      kind: type,
      childId,
      outfitId: payload.outfitId,
      name: payload.name,
      loadout: payload.loadout,
    };
  }
  if (type === "outfit-worn" && "outfitId" in payload) {
    return { kind: type, childId, outfitId: payload.outfitId };
  }
  if (type === "room-furnished" && "room" in payload) {
    return { kind: type, childId, room: payload.room };
  }
  if (
    type === "quest-find-picked-up" &&
    "findId" in payload &&
    "islandId" in payload
  ) {
    return {
      kind: type,
      childId,
      islandId: payload.islandId,
      findId: payload.findId,
    };
  }
  if (
    type === "quest-puzzle-solved" &&
    "puzzleId" in payload &&
    "islandId" in payload
  ) {
    return {
      kind: type,
      childId,
      islandId: payload.islandId,
      puzzleId: payload.puzzleId,
    };
  }
  return undefined;
};

interface ReplayRecord {
  sequence: number;
  playRecord: PlayRecord;
}

/** What a Family's replay has worked out from every record numbered up to throughSequence, from its starting point. */
interface KeptReplay {
  startingPoint: string;
  throughSequence: number;
  rewards: FamilyRewards;
}

// Pen test F4 (#318, #319, #320), ADR 0055: the replay is kept, per Family, and each request replays only the records
// numbered since, so what one request costs doesn't grow with the Family's history. It is kept in the server's memory,
// since the server is one process, and a restart replays each Family once more from the start. Only committed records
// are kept, so a transaction that is rolled back leaves nothing behind. At most this many Families are kept, the least
// recently replayed dropped first.
export const mostKeptReplays = 1_000;

const keptReplays = new Map<string, KeptReplay>();

const keepReplay = (familyId: string, replay: KeptReplay): void => {
  const kept = keptReplays.get(familyId);
  if (
    kept?.startingPoint === replay.startingPoint &&
    kept.throughSequence > replay.throughSequence
  ) {
    return;
  }
  keptReplays.delete(familyId);
  keptReplays.set(familyId, replay);
  if (keptReplays.size > mostKeptReplays) {
    const leastRecent = keptReplays.keys().next().value;
    if (leastRecent !== undefined) {
      keptReplays.delete(leastRecent);
    }
  }
};

/** Forgets every kept replay, as a restart of the server would. */
export const forgetKeptReplays = (): void => {
  keptReplays.clear();
};

const loadReplayRecords = async (
  database: ReachDatabase,
  familyId: string,
  afterSequence: number,
): Promise<ReplayRecord[]> => {
  const storedPlayEvents = await database
    .select({
      sequence: playEvents.replaySequence,
      childId: playEvents.childId,
      type: playEvents.type,
      payload: playEvents.payload,
    })
    .from(playEvents)
    .where(
      and(
        eq(playEvents.familyId, familyId),
        gt(playEvents.replaySequence, afterSequence),
        inArray(playEvents.type, rewardedPlayEventTypes),
      ),
    )
    .orderBy(asc(playEvents.replaySequence));
  const familyStarAwards = await database
    .select({
      sequence: starAwards.replaySequence,
      childId: starAwards.childId,
      stars: starAwards.stars,
    })
    .from(starAwards)
    .innerJoin(children, eq(children.id, starAwards.childId))
    .where(
      and(
        eq(children.familyId, familyId),
        gt(starAwards.replaySequence, afterSequence),
      ),
    );
  const familyCoinAwards = await database
    .select({
      sequence: familyChestCoinAwards.replaySequence,
      coins: familyChestCoinAwards.coins,
    })
    .from(familyChestCoinAwards)
    .where(
      and(
        eq(familyChestCoinAwards.familyId, familyId),
        gt(familyChestCoinAwards.replaySequence, afterSequence),
      ),
    );

  return [
    ...storedPlayEvents.flatMap((storedPlayEvent) => {
      const playRecord = findPlayRecord(storedPlayEvent);
      return playRecord === undefined
        ? []
        : [{ sequence: storedPlayEvent.sequence, playRecord }];
    }),
    ...familyStarAwards.map(({ sequence, childId, stars }) => ({
      sequence,
      playRecord: { kind: "stars-awarded" as const, childId, stars },
    })),
    ...familyCoinAwards.map(({ sequence, coins }) => ({
      sequence,
      playRecord: { kind: "family-chest-coins-awarded" as const, coins },
    })),
  ].toSorted((first, second) => first.sequence - second.sequence);
};

const replay = (
  rewards: FamilyRewards,
  records: readonly ReplayRecord[],
): FamilyRewards =>
  records.length === 0
    ? rewards
    : applyPlayRecords(
        rewards,
        records.map(({ playRecord }) => playRecord),
      );

/**
 * Works out a Family's Stars, Items, Mastery and Family Chest by replaying its records in the order they were numbered,
 * picking up from the replay kept for the Family when its starting point, its Children's Characters and kept Games,
 * hasn't changed and none of the records it read has been changed or deleted since.
 */
export const loadFamilyRewards = async (
  database: ReachDatabase,
  familyId: string,
): Promise<FamilyRewards> => {
  const family = (
    await database
      .select({
        createdAt: sql<string>`${families.createdAt}::text`,
        replayRestartedAt: families.replayRestartedAt,
        // The first number this transaction handed out, if it has written a record; it and those after aren't committed.
        writtenFrom: sql<
          string | null
        >`nullif(current_setting('wizzaroo.replay_written_from', true), '')`,
      })
      .from(families)
      .where(eq(families.id, familyId))
  ).at(0);
  const familyCharacters = await database
    .select({ childId: characters.childId, loadout: characters.loadout })
    .from(characters)
    .innerJoin(children, eq(children.id, characters.childId))
    .where(eq(children.familyId, familyId))
    .orderBy(asc(characters.childId));
  const keptGamePlaces = await database
    .select({
      childId: keptGameUnlocks.childId,
      islandId: keptGameUnlocks.islandId,
      regionId: keptGameUnlocks.regionId,
      gameId: keptGameUnlocks.gameId,
    })
    .from(keptGameUnlocks)
    .innerJoin(children, eq(children.id, keptGameUnlocks.childId))
    .where(eq(children.familyId, familyId))
    .orderBy(
      asc(keptGameUnlocks.childId),
      asc(keptGameUnlocks.islandId),
      asc(keptGameUnlocks.regionId),
      asc(keptGameUnlocks.gameId),
    );

  const startingPoint = JSON.stringify([
    family?.createdAt ?? null,
    family?.replayRestartedAt ?? null,
    familyCharacters,
    keptGamePlaces,
  ]);
  const kept = keptReplays.get(familyId);
  const base: KeptReplay =
    kept?.startingPoint === startingPoint
      ? kept
      : {
          startingPoint,
          throughSequence: 0,
          rewards: {
            children: familyCharacters.map(({ childId, loadout }) =>
              buildStartingChildRewards(
                childId,
                loadout,
                buildKeptRegionProgress(
                  keptGamePlaces.filter((place) => place.childId === childId),
                ),
              ),
            ),
            familyChestActivityCount: 0,
          },
        };

  const records = await loadReplayRecords(
    database,
    familyId,
    base.throughSequence,
  );
  const writtenFrom =
    family?.writtenFrom === undefined || family.writtenFrom === null
      ? Number.POSITIVE_INFINITY
      : Number(family.writtenFrom);
  const committedRecords = records.filter(
    ({ sequence }) => sequence < writtenFrom,
  );
  const unCommittedRecords = records.filter(
    ({ sequence }) => sequence >= writtenFrom,
  );
  const committedRewards = replay(base.rewards, committedRecords);
  // A Family whose row this caller can't read has no starting point to check a kept replay against.
  if (family !== undefined) {
    keepReplay(familyId, {
      startingPoint,
      throughSequence:
        committedRecords.at(-1)?.sequence ?? base.throughSequence,
      rewards: committedRewards,
    });
  }
  return replay(committedRewards, unCommittedRecords);
};
