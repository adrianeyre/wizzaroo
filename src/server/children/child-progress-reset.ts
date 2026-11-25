import { and, eq, sql } from "drizzle-orm";
import { insertAuditLogEntry, type AuditActor } from "../audit/audit-log.js";
import type { ReachDatabase } from "../reach.js";
import { playEvents, starAwards } from "../schema.js";
import { refreshRoomShowcases } from "./room-showcases.js";

/**
 * Takes a Child back to where they started, keeping the Child, their Character and their Picture Password: every event
 * they played and every Star award given them goes, so their Mastery, Stars, Items, outfits, Room, Checks and Quests
 * start again. A Gift they bought a sibling stays, as it is now the sibling's.
 *
 * It runs as wizzaroo_server, since no reach may delete a Star award. Deleting the records restarts the Family's
 * replay (ADR 0055), and the Room Classmates see is shown again from what is left.
 */
export const resetChildProgress = async (
  serverDatabase: ReachDatabase,
  { childId, familyId }: { childId: string; familyId: string },
  resetBy: AuditActor,
): Promise<void> => {
  await serverDatabase
    .delete(playEvents)
    .where(
      and(
        eq(playEvents.childId, childId),
        sql`coalesce(${playEvents.payload} ->> 'giftForChildId', ${childId}) = ${childId}`,
      ),
    );
  await serverDatabase
    .delete(starAwards)
    .where(eq(starAwards.childId, childId));
  await refreshRoomShowcases(serverDatabase, familyId, new Date());
  // child.changed, as the audit log keeps no values: the Admin changed this Child (#288).
  await insertAuditLogEntry(serverDatabase, {
    action: "child.changed",
    actor: resetBy,
    target: { type: "child", id: childId },
  });
};
