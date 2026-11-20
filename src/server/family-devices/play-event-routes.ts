import { isDeepStrictEqual } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  catalogue,
  characterSlots,
  furnitureSlots,
  wearableSlots,
} from "../../curriculum/catalogue.js";
import { checkGameTypes, checkWays } from "../../curriculum/checks.js";
import {
  listQuestIslandIds,
  listQuestLyingFindIds,
  listQuestPuzzleIds,
} from "../../curriculum/island-quests.js";
import { longestOutfitName } from "../../curriculum/rewards.js";
import { skills } from "../../curriculum/skills.js";
import { worldMap } from "../../curriculum/world-map.js";
import type { Database } from "../database.js";
import {
  children,
  playEvents,
  type ActivityFinishedPayload,
  type CharacterDressedPayload,
  type CheckFinishedPayload,
  type ItemBoughtPayload,
  type OutfitSavedPayload,
  type OutfitWornPayload,
  type QuestFindPickedUpPayload,
  type QuestPuzzleSolvedPayload,
  type QuestionAnsweredPayload,
  type RoomFurnishedPayload,
  type SessionEventPayload,
} from "../schema.js";
import { refreshRoomShowcases } from "../children/room-showcases.js";
import { largeBodyLimit } from "../http-hardening.js";
import { isPlayEventPlausible } from "./play-event-plausibility.js";
import {
  runAsSignedInFamilyDevice,
  setFamilyDeviceCookie,
} from "./signed-in-family-device.js";

interface PlayEventBasics {
  id: string;
  childId: string;
  happenedAt: string;
}

export type PlayEventContent =
  | { type: "session-started" | "session-ended"; payload: SessionEventPayload }
  | { type: "question-answered"; payload: QuestionAnsweredPayload }
  | { type: "activity-finished"; payload: ActivityFinishedPayload }
  | { type: "item-bought"; payload: ItemBoughtPayload }
  | { type: "character-dressed"; payload: CharacterDressedPayload }
  | { type: "outfit-saved"; payload: OutfitSavedPayload }
  | { type: "outfit-worn"; payload: OutfitWornPayload }
  | { type: "room-furnished"; payload: RoomFurnishedPayload }
  | { type: "check-finished"; payload: CheckFinishedPayload }
  | { type: "quest-find-picked-up"; payload: QuestFindPickedUpPayload }
  | { type: "quest-puzzle-solved"; payload: QuestPuzzleSolvedPayload };

export type PlayEvent = PlayEventBasics & PlayEventContent;

interface PlayEventBatchBody {
  playEvents: PlayEvent[];
}

const largestPlayEventBatch = 100;

const activityPayloadRequired = ["activityId", "skillId", "localDate"];

const placeFields = ["islandId", "regionId", "gameId"];

const activityPayloadProperties = {
  activityId: { type: "string", format: "uuid" },
  skillId: { type: "string", enum: skills.map(({ id }) => id) },
  localDate: { type: "string", format: "date" },
  islandId: { type: "string", enum: worldMap.islands.map(({ id }) => id) },
  regionId: {
    type: "string",
    enum: [...new Set(worldMap.regions.map(({ id }) => id))],
  },
  gameId: {
    type: "string",
    enum: [
      ...new Set(
        worldMap.regions.flatMap(({ games, extraGames }) =>
          [...games, ...extraGames].map(({ id }) => id),
        ),
      ),
    ],
  },
};

// Events from before Islands carry no place, so a place is optional but
// always whole.
const placeDependencies = Object.fromEntries(
  placeFields.map((field) => [field, placeFields]),
);

const itemIdSchema = { type: "string", enum: catalogue.map(({ id }) => id) };

const loadoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    characterSlots.map((slot) => [slot, itemIdSchema]),
  ),
};

const outfitLoadoutSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    wearableSlots.map((slot) => [slot, itemIdSchema]),
  ),
};

const roomSchema = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    furnitureSlots.map((slot) => [slot, itemIdSchema]),
  ),
};

const outfitIdSchema = { type: "string", format: "uuid" };

const questIslandIdSchema = { type: "string", enum: listQuestIslandIds() };

const mostCheckOutcomes = 50;
const longestCheckLabel = 64;

const checkLabelSchema = {
  type: "string",
  minLength: 1,
  maxLength: longestCheckLabel,
};

const checkOutcomeSchema = {
  type: "object",
  required: [
    "key",
    "questionType",
    "skillId",
    "isRight",
    "isInTime",
    "millisecondsTaken",
  ],
  additionalProperties: false,
  properties: {
    key: checkLabelSchema,
    questionType: checkLabelSchema,
    skillId: activityPayloadProperties.skillId,
    isRight: { type: "boolean" },
    isInTime: { type: "boolean" },
    millisecondsTaken: { type: "integer", minimum: 0 },
  },
};

interface PayloadSchemaParts {
  required: string[];
  properties: Record<string, object>;
  dependencies?: Record<string, string[]>;
}

const buildPlayEventSchema = (
  types: PlayEvent["type"][],
  { required, properties, dependencies = {} }: PayloadSchemaParts,
) => ({
  type: "object",
  required: ["id", "childId", "type", "happenedAt", "payload"],
  additionalProperties: false,
  properties: {
    id: { type: "string", format: "uuid" },
    childId: { type: "string", format: "uuid" },
    type: { type: "string", enum: types },
    happenedAt: { type: "string", format: "date-time" },
    payload: {
      type: "object",
      required: ["sessionId", ...required],
      dependencies,
      additionalProperties: false,
      properties: {
        sessionId: { type: "string", format: "uuid" },
        ...properties,
      },
    },
  },
});

const playEventBatchBodySchema = {
  type: "object",
  required: ["playEvents"],
  additionalProperties: false,
  properties: {
    playEvents: {
      type: "array",
      minItems: 1,
      maxItems: largestPlayEventBatch,
      items: {
        oneOf: [
          buildPlayEventSchema(["session-started", "session-ended"], {
            required: [],
            properties: {},
          }),
          buildPlayEventSchema(["question-answered"], {
            required: [
              ...activityPayloadRequired,
              "isRightFirstTime",
              "wrongAnswerCount",
            ],
            properties: {
              ...activityPayloadProperties,
              isRightFirstTime: { type: "boolean" },
              wrongAnswerCount: { type: "integer", minimum: 0 },
              checkWay: { type: "string", enum: checkWays },
              millisecondsTaken: { type: "integer", minimum: 0 },
            },
            dependencies: {
              ...placeDependencies,
              checkWay: ["millisecondsTaken"],
              millisecondsTaken: ["checkWay"],
            },
          }),
          buildPlayEventSchema(["activity-finished"], {
            required: [...activityPayloadRequired, "secondsSpent"],
            properties: {
              ...activityPayloadProperties,
              secondsSpent: { type: "integer", minimum: 0 },
            },
            dependencies: placeDependencies,
          }),
          buildPlayEventSchema(["item-bought"], {
            required: ["itemId", "localDate"],
            properties: {
              itemId: itemIdSchema,
              localDate: { type: "string", format: "date" },
              giftForChildId: { type: "string", format: "uuid" },
            },
          }),
          buildPlayEventSchema(["character-dressed"], {
            required: ["loadout"],
            properties: { loadout: loadoutSchema },
          }),
          buildPlayEventSchema(["outfit-saved"], {
            required: ["outfitId", "name", "loadout"],
            properties: {
              outfitId: outfitIdSchema,
              name: {
                type: "string",
                minLength: 1,
                maxLength: longestOutfitName,
                pattern: "\\S",
              },
              loadout: outfitLoadoutSchema,
            },
          }),
          buildPlayEventSchema(["outfit-worn"], {
            required: ["outfitId"],
            properties: { outfitId: outfitIdSchema },
          }),
          buildPlayEventSchema(["room-furnished"], {
            required: ["room"],
            properties: { room: roomSchema },
          }),
          buildPlayEventSchema(["quest-find-picked-up"], {
            required: ["islandId", "findId"],
            properties: {
              islandId: questIslandIdSchema,
              findId: { type: "string", enum: listQuestLyingFindIds() },
            },
          }),
          buildPlayEventSchema(["quest-puzzle-solved"], {
            required: ["islandId", "puzzleId", "localDate"],
            properties: {
              islandId: questIslandIdSchema,
              puzzleId: { type: "string", enum: listQuestPuzzleIds() },
              localDate: activityPayloadProperties.localDate,
            },
          }),
          buildPlayEventSchema(["check-finished"], {
            required: [
              "localDate",
              ...placeFields,
              "checkGameType",
              "isClockOff",
              "outcomes",
            ],
            properties: {
              localDate: activityPayloadProperties.localDate,
              islandId: activityPayloadProperties.islandId,
              regionId: activityPayloadProperties.regionId,
              gameId: activityPayloadProperties.gameId,
              checkGameType: { type: "string", enum: checkGameTypes },
              isClockOff: { type: "boolean" },
              outcomes: {
                type: "array",
                minItems: 1,
                maxItems: mostCheckOutcomes,
                items: checkOutcomeSchema,
              },
            },
          }),
        ],
      },
    },
  },
} as const;

/** The Children a play event names: the Child who played, and the one a gift was bought for. */
const listNamedChildIds = ({ childId, payload }: PlayEvent): string[] =>
  "giftForChildId" in payload && payload.giftForChildId !== undefined
    ? [childId, payload.giftForChildId]
    : [childId];

/**
 * The answer to an upload holding events the server won't keep: every other event was stored, and these were let go,
 * so the device forgets the whole batch. An event is let go when it names a Child who isn't the Family's, or is no
 * longer (#283), or when the server can't stand behind it: dated by the device's clock too far from when it arrived,
 * or a Check no one could have finished (#324, #325, #327). It counts them and names no Child, so a Child deleted from
 * the Family and one that was never its are answered exactly alike.
 */
export interface PlayEventUploadAnswer {
  letGoPlayEventCount: number;
}

/** The answer to an upload holding an event whose id is already stored with another owner or another body (#326). */
export interface TakenPlayEventIdsAnswer {
  statusCode: 409;
  error: "Conflict";
  message: string;
  takenPlayEventIds: string[];
}

/**
 * An event id is a key across every Family. An id already stored with another owner, a row the device's reach can't
 * see, or with another body, is refused rather than dropped without a word, and nothing in the upload is stored.
 */
export class PlayEventIdsTakenError extends Error {
  override readonly name = "PlayEventIdsTakenError";
  readonly statusCode = 409;

  constructor(readonly takenPlayEventIds: string[]) {
    super(
      "These play event ids are already taken by other events: give them new ids and send them again",
    );
  }
}

interface StoredPlayEventBody {
  childId: string;
  type: string;
  happenedAt: Date;
  payload: unknown;
}

const isSamePlayEvent = (
  playEvent: PlayEvent,
  stored: StoredPlayEventBody,
): boolean =>
  stored.childId === playEvent.childId &&
  stored.type === playEvent.type &&
  stored.happenedAt.getTime() === new Date(playEvent.happenedAt).getTime() &&
  isDeepStrictEqual(stored.payload, playEvent.payload);

/** The ids one upload sends twice with different bodies. */
const findIdsSentTwiceApart = (uploadedPlayEvents: PlayEvent[]): string[] => {
  const firstById = new Map<string, PlayEvent>();
  const takenIds = new Set<string>();
  for (const playEvent of uploadedPlayEvents) {
    const first = firstById.get(playEvent.id);
    if (first === undefined) {
      firstById.set(playEvent.id, playEvent);
    } else if (
      !isSamePlayEvent(playEvent, {
        ...first,
        happenedAt: new Date(first.happenedAt),
      })
    ) {
      takenIds.add(playEvent.id);
    }
  }
  return [...takenIds];
};

export const registerPlayEventRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.post<{ Body: PlayEventBatchBody }>(
    "/api/play/events",
    {
      config: { reach: "family-device" },
      schema: { body: playEventBatchBodySchema },
      bodyLimit: largeBodyLimit,
    },
    async (request, reply) => {
      const letGoPlayEventCount = await runAsSignedInFamilyDevice(
        database,
        request,
        async ({ familyDeviceId, familyId, token }, reachDatabase) => {
          const receivedAt = new Date();
          const uploadedPlayEvents = request.body.playEvents;
          const namedChildIds = [
            ...new Set(uploadedPlayEvents.flatMap(listNamedChildIds)),
          ];
          const familyChildIds = new Set(
            (
              await reachDatabase
                .select({ id: children.id })
                .from(children)
                .where(
                  and(
                    eq(children.familyId, familyId),
                    inArray(children.id, namedChildIds),
                  ),
                )
            ).map(({ id }) => id),
          );
          // An event naming a Child deleted since the device played, or an id that was never this Family's, is let go
          // alike, and the rest are stored, so one gone Child doesn't hold up their siblings' play (#283). So is an
          // event the server can't stand behind (#324, #325, #327).
          const keptPlayEvents = uploadedPlayEvents.filter(
            (playEvent) =>
              listNamedChildIds(playEvent).every((childId) =>
                familyChildIds.has(childId),
              ) && isPlayEventPlausible(playEvent, receivedAt),
          );

          // Numbered as they are stored, which is the order the replay reads them in: a batch in the order its events
          // happened, after every event the Family's devices uploaded before it (ADR 0055).
          const storedPlayEvents =
            keptPlayEvents.length === 0
              ? []
              : await reachDatabase
                  .insert(playEvents)
                  .values(
                    keptPlayEvents
                      .toSorted(
                        (first, second) =>
                          Date.parse(first.happenedAt) -
                            Date.parse(second.happenedAt) ||
                          first.id.localeCompare(second.id),
                      )
                      .map(({ id, childId, type, happenedAt, payload }) => ({
                        id,
                        familyId,
                        familyDeviceId,
                        childId,
                        type,
                        payload,
                        happenedAt: new Date(happenedAt),
                      })),
                  )
                  .onConflictDoNothing({ target: playEvents.id })
                  .returning({ id: playEvents.id });
          // An id already stored by this Family with the same body is the same event sent again, and stays harmless.
          // Any other id already taken is refused, and throwing rolls the whole upload back (#326).
          const storedIds = new Set(storedPlayEvents.map(({ id }) => id));
          const unstoredPlayEvents = keptPlayEvents.filter(
            ({ id }) => !storedIds.has(id),
          );
          const alreadyStoredById = new Map(
            (unstoredPlayEvents.length === 0
              ? []
              : await reachDatabase
                  .select({
                    id: playEvents.id,
                    childId: playEvents.childId,
                    type: playEvents.type,
                    happenedAt: playEvents.happenedAt,
                    payload: playEvents.payload,
                  })
                  .from(playEvents)
                  .where(
                    and(
                      eq(playEvents.familyId, familyId),
                      inArray(
                        playEvents.id,
                        unstoredPlayEvents.map(({ id }) => id),
                      ),
                    ),
                  )
            ).map((stored) => [stored.id, stored]),
          );
          const takenPlayEventIds = [
            ...new Set([
              ...findIdsSentTwiceApart(keptPlayEvents),
              ...unstoredPlayEvents
                .filter((playEvent) => {
                  const stored = alreadyStoredById.get(playEvent.id);
                  return (
                    stored === undefined || !isSamePlayEvent(playEvent, stored)
                  );
                })
                .map(({ id }) => id),
            ]),
          ];
          if (takenPlayEventIds.length > 0) {
            request.log.info(
              {
                familyDeviceId,
                uploadedCount: uploadedPlayEvents.length,
                takenCount: takenPlayEventIds.length,
              },
              "play-events.batch.ids-taken",
            );
            throw new PlayEventIdsTakenError(takenPlayEventIds);
          }
          const letGoCount = uploadedPlayEvents.length - keptPlayEvents.length;
          request.log.info(
            {
              familyDeviceId,
              uploadedCount: uploadedPlayEvents.length,
              storedCount: storedPlayEvents.length,
              letGoCount,
            },
            "play-events.batch.uploaded",
          );
          await refreshRoomShowcases(reachDatabase, familyId, new Date());

          setFamilyDeviceCookie(reply, token);
          return letGoCount;
        },
      ).catch((error: unknown) => {
        if (error instanceof PlayEventIdsTakenError) {
          return error;
        }
        throw error;
      });
      if (letGoPlayEventCount instanceof PlayEventIdsTakenError) {
        const { statusCode, message, takenPlayEventIds } = letGoPlayEventCount;
        const taken: TakenPlayEventIdsAnswer = {
          statusCode,
          error: "Conflict",
          message,
          takenPlayEventIds,
        };
        return reply.code(statusCode).send(taken);
      }
      const answer: PlayEventUploadAnswer = { letGoPlayEventCount };
      return letGoPlayEventCount === 0
        ? reply.code(204).send()
        : reply.code(200).send(answer);
    },
  );
};
