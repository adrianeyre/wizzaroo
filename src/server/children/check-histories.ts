import { and, eq, inArray } from "drizzle-orm";
import {
  buildCheckHistory,
  type CheckAttempt,
  type FinishedCheck,
} from "../../curriculum/checks.js";
import type { ReachDatabase } from "../reach.js";
import { playEvents } from "../schema.js";

export const loadCheckHistories = async (
  database: Pick<ReachDatabase, "select">,
  childIds: string[],
): Promise<Map<string, CheckAttempt[]>> => {
  if (childIds.length === 0) {
    return new Map();
  }
  const checkEvents = await database
    .select({
      childId: playEvents.childId,
      payload: playEvents.payload,
      happenedAt: playEvents.happenedAt,
      receivedAt: playEvents.receivedAt,
    })
    .from(playEvents)
    .where(
      and(
        eq(playEvents.type, "check-finished"),
        inArray(playEvents.childId, childIds),
      ),
    );
  const finishedChecksByChild = new Map<string, FinishedCheck[]>(
    childIds.map((childId) => [childId, []]),
  );
  for (const { childId, payload, happenedAt, receivedAt } of checkEvents) {
    if (!("outcomes" in payload)) {
      continue;
    }
    finishedChecksByChild.get(childId)?.push({
      result: {
        checkGameType: payload.checkGameType,
        isClockOff: payload.isClockOff,
        outcomes: payload.outcomes,
      },
      // A Check can't have finished after the server received it, so one a device dated later, stored before the upload
      // let such events go, is listed by when it arrived and never stays the latest (#324).
      finishedAt: (happenedAt > receivedAt
        ? receivedAt
        : happenedAt
      ).toISOString(),
      localDate: payload.localDate,
    });
  }
  return new Map(
    [...finishedChecksByChild].map(([childId, finishedChecks]) => [
      childId,
      buildCheckHistory(finishedChecks),
    ]),
  );
};
