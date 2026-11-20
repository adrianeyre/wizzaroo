import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  adminAccessLogs,
  auditLogEntries,
  characters,
  children,
  deletionRequests,
  emailAddressChecks,
  families,
  familyChestCoinAwards,
  familyDevices,
  familyJoinRequests,
  familyParents,
  invites,
  keptGameUnlocks,
  childTeacherLocks,
  schoolParents,
  passkeyChallenges,
  passkeyHandOffs,
  passkeys,
  passwordResets,
  pendingSignIns,
  playEvents,
  roomShowcases,
  recoveryCodes,
  schools,
  signIns,
  starAwards,
  totpSecrets,
  totpSetups,
  users,
} from "../schema.js";

interface FamilyExportOwner {
  userId: string;
  familyId: string;
}

/**
 * The downloading adult's own Audit Log entries, taken by them or about them, with the IP address a sign-in came from
 * (#285). The Audit Log is read only by the Admin within reach (ADR 0041), so this reads it on the server's own path,
 * for this one adult. An entry another adult took about them, such as staff sending an Invite, keeps the actor's role
 * but not who they were, so no one else's id is in the file.
 */
export const loadOwnAuditLogEntries = async (
  database: Database,
  userId: string,
) =>
  (
    await database
      .select({
        happenedAt: auditLogEntries.happenedAt,
        action: auditLogEntries.action,
        actorType: auditLogEntries.actorType,
        actorId: auditLogEntries.actorId,
        actorRoles: auditLogEntries.actorRoles,
        targetType: auditLogEntries.targetType,
        targetId: auditLogEntries.targetId,
        detail: auditLogEntries.detail,
        ipAddress: auditLogEntries.ipAddress,
      })
      .from(auditLogEntries)
      .where(
        or(
          eq(auditLogEntries.actorId, userId),
          and(
            eq(auditLogEntries.targetType, "user"),
            eq(auditLogEntries.targetId, userId),
          ),
        ),
      )
      .orderBy(asc(auditLogEntries.happenedAt), asc(auditLogEntries.id))
  ).map((entry) => ({
    ...entry,
    actorId: entry.actorId === userId ? userId : null,
  }));

export const loadFamilyExport = async (
  reachDatabase: ReachDatabase,
  { userId, familyId }: FamilyExportOwner,
) => {
  const familyChildIds = reachDatabase
    .select({ id: children.id })
    .from(children)
    .where(eq(children.familyId, familyId));
  const familyParentUserIds = reachDatabase
    .select({ userId: familyParents.userId })
    .from(familyParents)
    .where(eq(familyParents.familyId, familyId));

  return {
    adminAccessLogs: await reachDatabase
      .select({
        childId: adminAccessLogs.childId,
        openedAt: adminAccessLogs.openedAt,
        served: adminAccessLogs.served,
      })
      .from(adminAccessLogs)
      .where(inArray(adminAccessLogs.childId, familyChildIds))
      .orderBy(asc(adminAccessLogs.openedAt)),
    families: await reachDatabase
      .select({
        id: families.id,
        name: families.name,
        createdAt: families.createdAt,
      })
      .from(families)
      .where(eq(families.id, familyId)),
    familyParents: await reachDatabase
      .select({
        userId: familyParents.userId,
        familyId: familyParents.familyId,
      })
      .from(familyParents)
      .where(eq(familyParents.familyId, familyId)),
    familyJoinRequests: await reachDatabase
      .select({
        userId: familyJoinRequests.userId,
        familyId: familyJoinRequests.familyId,
        requestedAt: familyJoinRequests.requestedAt,
        agreedAt: familyJoinRequests.agreedAt,
      })
      .from(familyJoinRequests)
      .where(eq(familyJoinRequests.familyId, familyId))
      .orderBy(asc(familyJoinRequests.requestedAt)),
    users: await reachDatabase
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        roles: users.roles,
        emailConfirmedAt: users.emailConfirmedAt,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(inArray(users.id, familyParentUserIds))
      .orderBy(asc(users.createdAt)),
    children: await reachDatabase
      .select({
        id: children.id,
        familyId: children.familyId,
        schoolId: children.schoolId,
        nickname: children.nickname,
        birthMonth: children.birthMonth,
        birthYear: children.birthYear,
        yearGroupAdjustment: children.yearGroupAdjustment,
        phonicsProgrammeId: children.phonicsProgrammeId,
        syncedLimits: children.syncedLimits,
        classmateVisitsAllowed: children.classmateVisitsAllowed,
        createdAt: children.createdAt,
      })
      .from(children)
      .where(eq(children.familyId, familyId))
      .orderBy(asc(children.createdAt)),
    characters: await reachDatabase
      .select({
        childId: characters.childId,
        name: characters.name,
        loadout: characters.loadout,
      })
      .from(characters)
      .where(inArray(characters.childId, familyChildIds)),
    roomShowcases: await reachDatabase
      .select({
        childId: roomShowcases.childId,
        loadout: roomShowcases.loadout,
        room: roomShowcases.room,
        trophies: roomShowcases.trophies,
        updatedAt: roomShowcases.updatedAt,
      })
      .from(roomShowcases)
      .where(inArray(roomShowcases.childId, familyChildIds)),
    keptGameUnlocks: await reachDatabase
      .select({
        childId: keptGameUnlocks.childId,
        islandId: keptGameUnlocks.islandId,
        regionId: keptGameUnlocks.regionId,
        gameId: keptGameUnlocks.gameId,
      })
      .from(keptGameUnlocks)
      .where(inArray(keptGameUnlocks.childId, familyChildIds)),
    childTeacherLocks: await reachDatabase
      .select({
        childId: childTeacherLocks.childId,
        locks: childTeacherLocks.locks,
        updatedAt: childTeacherLocks.updatedAt,
      })
      .from(childTeacherLocks)
      .where(inArray(childTeacherLocks.childId, familyChildIds)),
    starAwards: await reachDatabase
      .select({
        childId: starAwards.childId,
        stars: starAwards.stars,
        awardedAt: starAwards.awardedAt,
      })
      .from(starAwards)
      .where(inArray(starAwards.childId, familyChildIds))
      .orderBy(asc(starAwards.awardedAt)),
    familyChestCoinAwards: await reachDatabase
      .select({
        familyId: familyChestCoinAwards.familyId,
        coins: familyChestCoinAwards.coins,
        awardedAt: familyChestCoinAwards.awardedAt,
      })
      .from(familyChestCoinAwards)
      .where(eq(familyChestCoinAwards.familyId, familyId))
      .orderBy(asc(familyChestCoinAwards.awardedAt)),
    playEvents: await reachDatabase
      .select({
        id: playEvents.id,
        familyId: playEvents.familyId,
        familyDeviceId: playEvents.familyDeviceId,
        childId: playEvents.childId,
        type: playEvents.type,
        payload: playEvents.payload,
        happenedAt: playEvents.happenedAt,
        receivedAt: playEvents.receivedAt,
      })
      .from(playEvents)
      .where(eq(playEvents.familyId, familyId))
      .orderBy(asc(playEvents.happenedAt), asc(playEvents.id)),
    familyDevices: await reachDatabase
      .select({
        id: familyDevices.id,
        familyId: familyDevices.familyId,
        name: familyDevices.name,
        createdAt: familyDevices.createdAt,
        createdByUserId: familyDevices.createdByUserId,
        lastSeenAt: familyDevices.lastSeenAt,
        lastSeenFrom: familyDevices.lastSeenFrom,
        revokedAt: familyDevices.revokedAt,
      })
      .from(familyDevices)
      .where(eq(familyDevices.familyId, familyId))
      .orderBy(asc(familyDevices.createdAt)),
    invites: await reachDatabase
      .select({
        id: invites.id,
        userId: invites.userId,
        emailedTo: invites.emailedTo,
        createdAt: invites.createdAt,
        expiresAt: invites.expiresAt,
        acceptedAt: invites.acceptedAt,
      })
      .from(invites)
      .where(inArray(invites.userId, familyParentUserIds))
      .orderBy(asc(invites.createdAt)),
    schools: await reachDatabase
      .select({ id: schools.id, name: schools.name, town: schools.town })
      .from(schools)
      .where(
        or(
          inArray(
            schools.id,
            reachDatabase
              .select({ schoolId: children.schoolId })
              .from(children)
              .where(eq(children.familyId, familyId)),
          ),
          inArray(
            schools.id,
            reachDatabase
              .select({ schoolId: schoolParents.schoolId })
              .from(schoolParents)
              .where(eq(schoolParents.userId, userId)),
          ),
        ),
      ),
    schoolParents: await reachDatabase
      .select({
        userId: schoolParents.userId,
        schoolId: schoolParents.schoolId,
      })
      .from(schoolParents)
      .where(eq(schoolParents.userId, userId)),
    deletionRequests: await reachDatabase
      .select({
        id: deletionRequests.id,
        familyId: deletionRequests.familyId,
        childId: deletionRequests.childId,
        requestedByUserId: deletionRequests.requestedByUserId,
        createdAt: deletionRequests.createdAt,
      })
      .from(deletionRequests)
      .where(eq(deletionRequests.familyId, familyId))
      .orderBy(asc(deletionRequests.createdAt)),
    signIns: await reachDatabase
      .select({
        userId: signIns.userId,
        createdAt: signIns.createdAt,
        expiresAt: signIns.expiresAt,
        lastUsedAt: signIns.lastUsedAt,
      })
      .from(signIns)
      .where(eq(signIns.userId, userId))
      .orderBy(asc(signIns.createdAt)),
    emailAddressChecks: await reachDatabase
      .select({
        userId: emailAddressChecks.userId,
        email: emailAddressChecks.email,
        createdAt: emailAddressChecks.createdAt,
        expiresAt: emailAddressChecks.expiresAt,
      })
      .from(emailAddressChecks)
      .where(eq(emailAddressChecks.userId, userId)),
    passwordResets: await reachDatabase
      .select({
        userId: passwordResets.userId,
        createdAt: passwordResets.createdAt,
        expiresAt: passwordResets.expiresAt,
      })
      .from(passwordResets)
      .where(eq(passwordResets.userId, userId)),
    passkeys: await reachDatabase
      .select({
        id: passkeys.id,
        userId: passkeys.userId,
        name: passkeys.name,
        publicKey: passkeys.publicKey,
        signCount: passkeys.signCount,
        transports: passkeys.transports,
        createdAt: passkeys.createdAt,
        lastUsedAt: passkeys.lastUsedAt,
      })
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(asc(passkeys.createdAt)),
    passkeyChallenges: await reachDatabase
      .select({
        userId: passkeyChallenges.userId,
        expiresAt: passkeyChallenges.expiresAt,
      })
      .from(passkeyChallenges)
      .where(eq(passkeyChallenges.userId, userId)),
    passkeyHandOffs: await reachDatabase
      .select({
        userId: passkeyHandOffs.userId,
        createdAt: passkeyHandOffs.createdAt,
        expiresAt: passkeyHandOffs.expiresAt,
      })
      .from(passkeyHandOffs)
      .where(eq(passkeyHandOffs.userId, userId)),
    totpSetups: await reachDatabase
      .select({
        userId: totpSetups.userId,
        expiresAt: totpSetups.expiresAt,
      })
      .from(totpSetups)
      .where(eq(totpSetups.userId, userId)),
    totpSecrets: await reachDatabase
      .select({
        userId: totpSecrets.userId,
        wrongCodesAt: totpSecrets.wrongCodesAt,
        codePauseEndsAt: totpSecrets.codePauseEndsAt,
        pendingSignInsStartedAt: totpSecrets.pendingSignInsStartedAt,
      })
      .from(totpSecrets)
      .where(eq(totpSecrets.userId, userId)),
    recoveryCodes: await reachDatabase
      .select({ userId: recoveryCodes.userId })
      .from(recoveryCodes)
      .where(eq(recoveryCodes.userId, userId)),
    pendingSignIns: await reachDatabase
      .select({
        userId: pendingSignIns.userId,
        failedAttempts: pendingSignIns.failedAttempts,
        expiresAt: pendingSignIns.expiresAt,
      })
      .from(pendingSignIns)
      .where(eq(pendingSignIns.userId, userId)),
  };
};
