import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { insertAuditLogEntry, type AuditActor } from "../audit/audit-log.js";
import type { ReachDatabase } from "../reach.js";
import {
  children,
  confirmedDeletions,
  type ConfirmedDeletionTargetType,
  families,
  familyJoinRequests,
  familyParents,
  playEvents,
  users,
} from "../schema.js";

export class AdminFamilyNotDeletableError extends Error {
  override readonly name = "AdminFamilyNotDeletableError";
  readonly statusCode = 409;

  constructor() {
    super("The Admin's own Family can't be deleted while they are its Parent");
  }
}

// The ledger a restore reads, so a backup taken before this deletion never brings these ids back (#280).
const recordConfirmedDeletions = async (
  reachDatabase: ReachDatabase,
  deletions: { targetType: ConfirmedDeletionTargetType; targetId: string }[],
): Promise<void> => {
  await reachDatabase
    .insert(confirmedDeletions)
    .values(deletions)
    .onConflictDoNothing();
};

export const deleteChild = async (
  reachDatabase: ReachDatabase,
  childId: string,
  deletedBy: AuditActor,
): Promise<boolean> => {
  await reachDatabase
    .delete(playEvents)
    .where(sql`${playEvents.payload} ->> 'giftForChildId' = ${childId}`);
  const deletedChildren = await reachDatabase
    .delete(children)
    .where(eq(children.id, childId))
    .returning({ id: children.id });
  if (deletedChildren.length === 0) {
    return false;
  }
  await recordConfirmedDeletions(reachDatabase, [
    { targetType: "child", targetId: childId },
  ]);
  await insertAuditLogEntry(reachDatabase, {
    action: "child.deleted",
    actor: deletedBy,
    target: { type: "child", id: childId },
  });
  return true;
};

export const deleteFamily = async (
  reachDatabase: ReachDatabase,
  familyId: string,
  deletedBy: AuditActor,
): Promise<boolean> => {
  const parents = await reachDatabase
    .select({ userId: users.id, roles: users.roles })
    .from(familyParents)
    .innerJoin(users, eq(users.id, familyParents.userId))
    .where(eq(familyParents.familyId, familyId));
  if (parents.some(({ roles }) => roles.includes("admin"))) {
    throw new AdminFamilyNotDeletableError();
  }
  // An adult still waiting to join has no Family of their own, so they go with the Family they asked to join.
  const waitingAdults = await reachDatabase
    .select({ userId: familyJoinRequests.userId })
    .from(familyJoinRequests)
    .where(
      and(
        eq(familyJoinRequests.familyId, familyId),
        isNull(familyJoinRequests.agreedAt),
      ),
    );
  const familyChildren = await reachDatabase
    .select({ childId: children.id })
    .from(children)
    .where(eq(children.familyId, familyId));

  const deletedFamilies = await reachDatabase
    .delete(families)
    .where(eq(families.id, familyId))
    .returning({ id: families.id });
  if (deletedFamilies.length === 0) {
    return false;
  }
  await recordConfirmedDeletions(reachDatabase, [
    { targetType: "family", targetId: familyId },
    ...familyChildren.map(({ childId }) => ({
      targetType: "child" as const,
      targetId: childId,
    })),
    ...parents.map(({ userId }) => ({
      targetType: "user" as const,
      targetId: userId,
    })),
  ]);
  await insertAuditLogEntry(reachDatabase, {
    action: "family.deleted",
    actor: deletedBy,
    target: { type: "family", id: familyId },
  });
  const adultIds = [...parents, ...waitingAdults].map(({ userId }) => userId);
  if (adultIds.length > 0) {
    await reachDatabase.delete(users).where(inArray(users.id, adultIds));
  }
  return true;
};
