import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import type { AuditAction } from "../audit/audit-actions.js";
import { phonicsProgrammeIds } from "../../curriculum/phonics-programmes.js";
import {
  buildChildLimits,
  buildParentChoices,
  buildTeacherLocks,
  type ParentChoices,
  type TeacherLocks,
} from "../../curriculum/island-access.js";
import {
  findGameKey,
  findRegionKey,
  listRegionGames,
  worldMap,
} from "../../curriculum/world-map.js";
import {
  findSchoolYear,
  isYearGroup,
  receptionYear,
  yearGroupAdjustments,
  type YearGroupAdjustment,
} from "../../curriculum/year-groups.js";
import {
  runAsSignedInAdmin,
  runAsSignedInAdult,
  runAsSignedInParent,
  runAsSignedInStaff,
  type SignedInUser,
} from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  assertFamilySeen,
  findParentSchoolId,
} from "../people/people-routes.js";
import {
  assertSchoolSeen,
  loadChangeableChild,
  loadLockableChild,
  loadSeenChild,
  loadOwnSchoolIds,
  loadSeenChildPlacements,
  type ChildPlacement,
} from "../reach-rules.js";
import {
  characters,
  childTeacherLocks,
  children,
  schools,
  type ChildLimits,
} from "../schema.js";
import {
  loadChild,
  loadChildProgress,
  loadFamilyChildIds,
  type Child,
  type ChildProgress,
} from "./child-progress.js";
import { logAdminAccess } from "./admin-access-log.js";
import { refreshRoomShowcases } from "./room-showcases.js";
import {
  hashPicturePassword,
  picturePasswordLength,
  picturePasswordPictures,
  type PicturePasswordPicture,
} from "./picture-password.js";

export class TooYoungForSchoolError extends Error {
  override readonly name = "TooYoungForSchoolError";
  readonly statusCode = 400;

  constructor() {
    super(
      "That birth month and year is too young for Reception, so Wizzaroo can't take this Child yet",
    );
  }
}

export class NotInYourYearGroupsError extends Error {
  override readonly name = "NotInYourYearGroupsError";
  readonly statusCode = 403;

  constructor() {
    super(
      "That Child's Year works out outside your Year Groups, so a Teacher of their Year or the Admin adds them",
    );
  }
}

export class ClassmateVisitsNotApprovedError extends Error {
  override readonly name = "ClassmateVisitsNotApprovedError";
  readonly statusCode = 409;

  constructor() {
    super(
      "This Child's School hasn't turned on Classmate visits yet, so they can't be turned on for this Child",
    );
  }
}

export class SchoolChoiceNeededError extends Error {
  override readonly name = "SchoolChoiceNeededError";
  readonly statusCode = 400;

  constructor() {
    super("Choose which of your Schools this Child attends");
  }
}

interface ChildBirthDetails {
  nickname: string;
  birthMonth: number;
  birthYear: number;
  yearGroupAdjustment: YearGroupAdjustment;
}

interface ParentChildDetails extends ChildBirthDetails {
  characterName?: string;
  phonicsProgrammeId: string;
}

interface PicturePasswordBody {
  picturePassword: PicturePasswordPicture[];
}

type NewChildBody = ParentChildDetails &
  PicturePasswordBody & { characterName: string; schoolId?: string };

interface NewSchoolChildBody extends ChildBirthDetails {
  phonicsProgrammeId?: string;
  schoolId?: string;
}

interface ChildParams {
  childId: string;
}

interface FamilyParams {
  familyId: string;
}

type ChildBirthBody = Omit<ChildBirthDetails, "nickname">;

interface ChildSchoolBody {
  schoolId: string;
}

interface ClassmateVisitsBody {
  classmateVisitsAllowed: boolean;
}

const longestNameLength = 30;
const shortestDailyMinutes = 5;
const longestDailyMinutes = 600;
const earliestBirthYear = 2000;
const latestBirthYear = 2100;

const uuidSchema = { type: "string", format: "uuid" } as const;

const nameSchema = {
  type: "string",
  maxLength: longestNameLength,
  pattern: "\\S",
} as const;

const birthProperties = {
  nickname: nameSchema,
  birthMonth: { type: "integer", minimum: 1, maximum: 12 },
  birthYear: {
    type: "integer",
    minimum: earliestBirthYear,
    maximum: latestBirthYear,
  },
  yearGroupAdjustment: { type: "integer", enum: yearGroupAdjustments },
} as const;

const phonicsProgrammeSchema = {
  type: "string",
  enum: phonicsProgrammeIds,
} as const;

const birthRequired = [
  "nickname",
  "birthMonth",
  "birthYear",
  "yearGroupAdjustment",
] as const;

const picturePasswordProperties = {
  picturePassword: {
    type: "array",
    minItems: picturePasswordLength,
    maxItems: picturePasswordLength,
    items: { type: "string", enum: picturePasswordPictures },
  },
} as const;

const childDetailsBodySchema = {
  type: "object",
  required: [...birthRequired, "phonicsProgrammeId"],
  additionalProperties: false,
  properties: {
    ...birthProperties,
    characterName: nameSchema,
    phonicsProgrammeId: phonicsProgrammeSchema,
  },
} as const;

const newChildBodySchema = {
  type: "object",
  required: [
    ...birthRequired,
    "characterName",
    "phonicsProgrammeId",
    "picturePassword",
  ],
  additionalProperties: false,
  properties: {
    ...birthProperties,
    characterName: nameSchema,
    phonicsProgrammeId: phonicsProgrammeSchema,
    schoolId: uuidSchema,
    ...picturePasswordProperties,
  },
} as const;

const newSchoolChildBodySchema = {
  type: "object",
  required: [...birthRequired],
  additionalProperties: false,
  properties: {
    ...birthProperties,
    phonicsProgrammeId: phonicsProgrammeSchema,
    schoolId: uuidSchema,
  },
} as const;

const picturePasswordBodySchema = {
  type: "object",
  required: ["picturePassword"],
  additionalProperties: false,
  properties: picturePasswordProperties,
} as const;

const buildIdListSchema = (ids: readonly string[]) => ({
  type: "array",
  uniqueItems: true,
  items: { type: "string", enum: ids },
});

const islandIdListSchema = buildIdListSchema(
  worldMap.islands.map(({ id }) => id),
);

const regionKeyListSchema = buildIdListSchema(
  worldMap.regions.map(findRegionKey),
);

const gameKeyListSchema = buildIdListSchema(
  worldMap.regions.flatMap((region) =>
    listRegionGames(region).map((game) => findGameKey(region, game)),
  ),
);

type OptionalLimit =
  | "isMusicMuted"
  | "areSoundEffectsMuted"
  | "isCheckClockOff"
  | "isExploringLocked"
  | "exploreLockedIslandIds"
  | "lockedGameKeys";

type ChildLimitsBody = Omit<ParentChoices, OptionalLimit> &
  Partial<Pick<ParentChoices, OptionalLimit>>;

const teacherLocksBodySchema = {
  type: "object",
  required: ["lockedIslandIds", "turnedOffRegionKeys", "lockedGameKeys"],
  additionalProperties: false,
  properties: {
    lockedIslandIds: islandIdListSchema,
    turnedOffRegionKeys: regionKeyListSchema,
    lockedGameKeys: gameKeyListSchema,
  },
} as const;

const loadChildLimits = async (
  database: Pick<ReachDatabase, "select">,
  childId: string,
): Promise<ChildLimits> => {
  const [{ syncedLimits, teacherLocks }] = await database
    .select({
      syncedLimits: children.syncedLimits,
      teacherLocks: childTeacherLocks.locks,
    })
    .from(children)
    .leftJoin(childTeacherLocks, eq(childTeacherLocks.childId, children.id))
    .where(eq(children.id, childId));
  return buildChildLimits(syncedLimits, teacherLocks ?? {});
};

const childLimitsBodySchema = {
  type: "object",
  required: [
    "dailyMinutes",
    "unlockedIslandIds",
    "lockedIslandIds",
    "turnedOffRegionKeys",
    "openRegionKeys",
  ],
  additionalProperties: false,
  properties: {
    dailyMinutes: {
      type: ["integer", "null"],
      minimum: shortestDailyMinutes,
      maximum: longestDailyMinutes,
    },
    unlockedIslandIds: islandIdListSchema,
    lockedIslandIds: islandIdListSchema,
    turnedOffRegionKeys: regionKeyListSchema,
    openRegionKeys: regionKeyListSchema,
    lockedGameKeys: gameKeyListSchema,
    isMusicMuted: { type: "boolean" },
    areSoundEffectsMuted: { type: "boolean" },
    isCheckClockOff: { type: "boolean" },
    isExploringLocked: { type: "boolean" },
    exploreLockedIslandIds: islandIdListSchema,
  },
} as const;

const childParamsSchema = {
  type: "object",
  required: ["childId"],
  properties: { childId: uuidSchema },
} as const;

const familyParamsSchema = {
  type: "object",
  required: ["familyId"],
  properties: { familyId: uuidSchema },
} as const;

const childBirthBodySchema = {
  type: "object",
  required: ["birthMonth", "birthYear", "yearGroupAdjustment"],
  additionalProperties: false,
  properties: {
    birthMonth: birthProperties.birthMonth,
    birthYear: birthProperties.birthYear,
    yearGroupAdjustment: birthProperties.yearGroupAdjustment,
  },
} as const;

const classmateVisitsBodySchema = {
  type: "object",
  required: ["classmateVisitsAllowed"],
  additionalProperties: false,
  properties: { classmateVisitsAllowed: { type: "boolean" } },
} as const;

const childSchoolBodySchema = {
  type: "object",
  required: ["schoolId"],
  additionalProperties: false,
  properties: { schoolId: uuidSchema },
} as const;

/** A Child's details as stored, after checking their worked-out Year is Reception or older. */
const readBirthDetails = (
  { nickname, birthMonth, birthYear, yearGroupAdjustment }: ChildBirthDetails,
  moment: Date,
): ChildBirthDetails & { schoolYear: number } => {
  const schoolYear = findSchoolYear(
    { birthMonth, birthYear, yearGroupAdjustment },
    moment,
  );
  if (schoolYear < receptionYear) {
    throw new TooYoungForSchoolError();
  }
  return {
    nickname: nickname.trim(),
    birthMonth,
    birthYear,
    yearGroupAdjustment,
    schoolYear,
  };
};

/** A Parent's Child attends one of the Parent's Schools; the Admin may choose any. */
const findParentChildSchoolId = async (
  database: ReachDatabase,
  parent: SignedInUser,
  requestedSchoolId: string | undefined,
): Promise<string> => {
  if (requestedSchoolId !== undefined) {
    await assertSchoolSeen(database, parent, requestedSchoolId);
    return requestedSchoolId;
  }
  const ownSchoolIds = await loadOwnSchoolIds(database, parent);
  if (ownSchoolIds.length !== 1) {
    throw new SchoolChoiceNeededError();
  }
  return ownSchoolIds[0];
};

/**
 * The Audit Log entry for the Admin's change to a Child of a Family that isn't the Admin's own, naming the action, the
 * Admin and the Child, and keeping no values (ADR 0041, #288). A Parent's or a Teacher's change, and the Admin's to
 * their own Family's Child, writes none.
 */
const logAdminChildChange = async (
  reachDatabase: ReachDatabase,
  caller: SignedInUser,
  action: Extract<
    AuditAction,
    | "child.changed"
    | "child.limits-changed"
    | "child.teacher-locks-changed"
    | "child.classmate-visits-changed"
    | "child.birth-given"
  >,
  child: Pick<ChildPlacement, "id" | "familyId">,
): Promise<void> => {
  if (!caller.isAdmin || child.familyId === caller.familyId) {
    return;
  }
  await insertAuditLogEntry(reachDatabase, {
    action,
    actor: buildUserActor(caller),
    target: { type: "child", id: child.id },
  });
};

export const registerChildrenRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get(
    "/api/children",
    { config: { reach: "parent" } },
    async (request): Promise<ChildProgress[]> =>
      runAsSignedInParent(
        database,
        request,
        async ({ familyId }, reachDatabase) =>
          loadChildProgress(
            reachDatabase,
            await loadFamilyChildIds(reachDatabase, familyId),
            new Date(),
          ),
      ),
  );

  server.post<{ Body: NewChildBody }>(
    "/api/children",
    { config: { reach: "parent" }, schema: { body: newChildBodySchema } },
    async (request, reply) => {
      const moment = new Date();
      const details = readBirthDetails(request.body, moment);
      const picturePasswordHash = await hashPicturePassword(
        request.body.picturePassword,
      );
      const child = await runAsSignedInParent(
        database,
        request,
        async (parent, reachDatabase) => {
          const schoolId = await findParentChildSchoolId(
            reachDatabase,
            parent,
            request.body.schoolId,
          );
          const [{ id }] = await reachDatabase
            .insert(children)
            .values({
              familyId: parent.familyId,
              schoolId,
              nickname: details.nickname,
              birthMonth: details.birthMonth,
              birthYear: details.birthYear,
              yearGroupAdjustment: details.yearGroupAdjustment,
              phonicsProgrammeId: request.body.phonicsProgrammeId,
              picturePasswordHash,
            })
            .returning({ id: children.id });
          await reachDatabase
            .insert(characters)
            .values({ childId: id, name: request.body.characterName.trim() });
          await insertAuditLogEntry(reachDatabase, {
            action: "child.created",
            actor: buildUserActor(parent),
            target: { type: "child", id },
          });
          request.log.info({ childId: id, schoolId }, "children.child.created");
          return loadChild(reachDatabase, id, moment);
        },
      );
      return reply.code(201).send(child);
    },
  );

  server.post<{ Params: FamilyParams; Body: NewSchoolChildBody }>(
    "/api/families/:familyId/children",
    {
      config: { reach: "staff" },
      schema: { params: familyParamsSchema, body: newSchoolChildBodySchema },
    },
    async (request, reply) => {
      const moment = new Date();
      const details = readBirthDetails(request.body, moment);
      const child = await runAsSignedInStaff(
        database,
        request,
        async (staff, reachDatabase) => {
          const { familyId } = request.params;
          await assertFamilySeen(reachDatabase, staff, familyId, moment);
          const schoolId = findParentSchoolId(staff, request.body.schoolId);
          await assertSchoolSeen(reachDatabase, staff, schoolId);
          if (
            !staff.isAdmin &&
            !(
              isYearGroup(details.schoolYear) &&
              staff.teaching?.yearGroups.includes(details.schoolYear) === true
            )
          ) {
            throw new NotInYourYearGroupsError();
          }
          // A Teacher's connection only reads, so the Child is added as the owner once their reach is checked (ADR 0027).
          const id = await database.transaction(async (transaction) => {
            const [{ id: childId }] = await transaction
              .insert(children)
              .values({
                familyId,
                schoolId,
                nickname: details.nickname,
                birthMonth: details.birthMonth,
                birthYear: details.birthYear,
                yearGroupAdjustment: details.yearGroupAdjustment,
                phonicsProgrammeId: request.body.phonicsProgrammeId ?? null,
              })
              .returning({ id: children.id });
            await insertAuditLogEntry(transaction, {
              action: "child.created",
              actor: buildUserActor(staff),
              target: { type: "child", id: childId },
            });
            return childId;
          });
          request.log.info(
            { userId: staff.userId, childId: id, schoolId },
            "children.school-child.created",
          );
          return loadChild(reachDatabase, id, moment);
        },
      );
      return reply.code(201).send(child);
    },
  );

  server.put<{ Params: ChildParams; Body: ParentChildDetails }>(
    "/api/children/:childId",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: childDetailsBodySchema },
    },
    async (request): Promise<Child> => {
      const moment = new Date();
      const details = readBirthDetails(request.body, moment);
      return runAsSignedInAdult(
        database,
        request,
        async (caller, reachDatabase) => {
          const { childId } = request.params;
          const child = await loadChangeableChild(
            reachDatabase,
            caller,
            childId,
            moment,
          );
          const { characterName } = request.body;
          await reachDatabase
            .update(children)
            .set({
              nickname: details.nickname,
              birthMonth: details.birthMonth,
              birthYear: details.birthYear,
              yearGroupAdjustment: details.yearGroupAdjustment,
              phonicsProgrammeId: request.body.phonicsProgrammeId,
            })
            .where(eq(children.id, childId));
          if (characterName !== undefined) {
            await reachDatabase
              .insert(characters)
              .values({ childId, name: characterName.trim() })
              .onConflictDoUpdate({
                target: characters.childId,
                set: { name: characterName.trim() },
              });
          }
          request.log.info({ childId }, "children.child.updated");
          await logAdminChildChange(
            reachDatabase,
            caller,
            "child.changed",
            child,
          );
          await logAdminAccess(
            reachDatabase,
            request,
            caller,
            "child.changed",
            [childId],
          );
          return loadChild(reachDatabase, childId, moment);
        },
      );
    },
  );

  server.put<{ Params: ChildParams; Body: ChildLimitsBody }>(
    "/api/children/:childId/limits",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: childLimitsBodySchema },
    },
    async (request): Promise<ChildLimits> =>
      runAsSignedInAdult(database, request, async (caller, reachDatabase) => {
        const { childId } = request.params;
        const child = await loadChangeableChild(
          reachDatabase,
          caller,
          childId,
          new Date(),
        );
        await logAdminAccess(
          reachDatabase,
          request,
          caller,
          "child-limits.changed",
          [childId],
        );
        await logAdminChildChange(
          reachDatabase,
          caller,
          "child.limits-changed",
          child,
        );
        const storedLimits = await loadChildLimits(reachDatabase, childId);
        const parentChoices = buildParentChoices({
          lockedGameKeys: storedLimits.lockedGameKeys,
          isExploringLocked: storedLimits.isExploringLocked,
          exploreLockedIslandIds: storedLimits.exploreLockedIslandIds,
          ...request.body,
        });
        await reachDatabase
          .update(children)
          .set({ syncedLimits: parentChoices })
          .where(eq(children.id, childId));
        request.log.info(
          { childId, ...parentChoices },
          "children.limits.updated",
        );
        return { ...parentChoices, teacherLocks: storedLimits.teacherLocks };
      }),
  );

  server.put<{ Params: ChildParams; Body: TeacherLocks }>(
    "/api/children/:childId/teacher-locks",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: teacherLocksBodySchema },
    },
    async (request): Promise<ChildLimits> =>
      runAsSignedInAdult(database, request, async (caller, reachDatabase) => {
        const { childId } = request.params;
        const child = await loadLockableChild(
          reachDatabase,
          caller,
          childId,
          new Date(),
        );
        await logAdminAccess(
          reachDatabase,
          request,
          caller,
          "child-teacher-locks.changed",
          [childId],
        );
        await logAdminChildChange(
          reachDatabase,
          caller,
          "child.teacher-locks-changed",
          child,
        );
        const teacherLocks = buildTeacherLocks(request.body);
        await reachDatabase
          .insert(childTeacherLocks)
          .values({
            childId,
            locks: teacherLocks,
            updatedByUserId: caller.userId,
          })
          .onConflictDoUpdate({
            target: childTeacherLocks.childId,
            set: {
              locks: teacherLocks,
              updatedByUserId: caller.userId,
              updatedAt: sql`now()`,
            },
          });
        request.log.info(
          { childId, userId: caller.userId, ...teacherLocks },
          "children.teacher-locks.updated",
        );
        return loadChildLimits(reachDatabase, childId);
      }),
  );

  server.put<{ Params: ChildParams; Body: ClassmateVisitsBody }>(
    "/api/children/:childId/classmate-visits",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: classmateVisitsBodySchema },
    },
    async (request): Promise<Child> =>
      runAsSignedInAdult(database, request, async (caller, reachDatabase) => {
        const moment = new Date();
        const { childId } = request.params;
        const { classmateVisitsAllowed } = request.body;
        const child = await loadChangeableChild(
          reachDatabase,
          caller,
          childId,
          moment,
        );
        if (classmateVisitsAllowed) {
          const [{ classmateVisitsApproved }] = await reachDatabase
            .select({
              classmateVisitsApproved: schools.classmateVisitsApproved,
            })
            .from(schools)
            .where(eq(schools.id, child.schoolId));
          if (!classmateVisitsApproved) {
            throw new ClassmateVisitsNotApprovedError();
          }
        }
        await reachDatabase
          .update(children)
          .set({ classmateVisitsAllowed })
          .where(eq(children.id, childId));
        if (classmateVisitsAllowed) {
          await refreshRoomShowcases(reachDatabase, child.familyId, new Date());
        }
        request.log.info(
          { childId, classmateVisitsAllowed },
          "children.classmate-visits.updated",
        );
        await logAdminChildChange(
          reachDatabase,
          caller,
          "child.classmate-visits-changed",
          child,
        );
        await logAdminAccess(
          reachDatabase,
          request,
          caller,
          "child-classmate-visits.changed",
          [childId],
        );
        return loadChild(reachDatabase, childId, moment);
      }),
  );

  server.put<{ Params: ChildParams; Body: PicturePasswordBody }>(
    "/api/children/:childId/picture-password",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: picturePasswordBodySchema },
    },
    async (request, reply) => {
      const picturePasswordHash = await hashPicturePassword(
        request.body.picturePassword,
      );
      await runAsSignedInAdult(
        database,
        request,
        async (caller, reachDatabase) => {
          const { childId } = request.params;
          await loadChangeableChild(reachDatabase, caller, childId, new Date());
          await reachDatabase
            .update(children)
            .set({ picturePasswordHash })
            .where(eq(children.id, childId));
          await insertAuditLogEntry(reachDatabase, {
            action: "picture-password.set",
            actor: buildUserActor(caller),
            target: { type: "child", id: childId },
          });
          request.log.info({ childId }, "children.picture-password.updated");
        },
      );
      return reply.code(204).send();
    },
  );

  // A Child from before Year Groups were worked out is given a birth month and year the first time a Parent or the Admin opens them.
  server.put<{ Params: ChildParams; Body: ChildBirthBody }>(
    "/api/children/:childId/birth",
    {
      config: { reach: "adult" },
      schema: { params: childParamsSchema, body: childBirthBodySchema },
    },
    async (request): Promise<Child> => {
      const moment = new Date();
      const { birthMonth, birthYear, yearGroupAdjustment } = readBirthDetails(
        { ...request.body, nickname: "" },
        moment,
      );
      return runAsSignedInAdult(
        database,
        request,
        async (caller, reachDatabase) => {
          const { childId } = request.params;
          const child = await loadChangeableChild(
            reachDatabase,
            caller,
            childId,
            moment,
          );
          await reachDatabase
            .update(children)
            .set({ birthMonth, birthYear, yearGroupAdjustment })
            .where(eq(children.id, childId));
          request.log.info({ childId }, "children.birth.given");
          await logAdminChildChange(
            reachDatabase,
            caller,
            "child.birth-given",
            child,
          );
          await logAdminAccess(
            reachDatabase,
            request,
            caller,
            "child-birth.given",
            [childId],
          );
          return loadChild(reachDatabase, childId, moment);
        },
      );
    },
  );

  server.put<{ Params: ChildParams; Body: ChildSchoolBody }>(
    "/api/children/:childId/school",
    {
      config: { reach: "admin" },
      schema: { params: childParamsSchema, body: childSchoolBodySchema },
    },
    async (request): Promise<Child> =>
      runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const moment = new Date();
          const admin = {
            userId: adminUserId,
            isAdmin: true,
            familyId: null,
            teaching: null,
          };
          const { childId } = request.params;
          const { schoolId } = request.body;
          await loadSeenChild(reachDatabase, admin, childId, moment);
          await assertSchoolSeen(reachDatabase, admin, schoolId);
          await reachDatabase
            .update(children)
            .set({ schoolId })
            .where(eq(children.id, childId));
          await insertAuditLogEntry(reachDatabase, {
            action: "child.school-changed",
            actor: buildUserActor(signedInAdmin),
            target: { type: "child", id: childId },
            detail: schoolId,
          });
          request.log.info(
            { userId: adminUserId, childId, schoolId },
            "children.child.moved",
          );
          await logAdminAccess(
            reachDatabase,
            request,
            admin,
            "child-school.changed",
            [childId],
          );
          return loadChild(reachDatabase, childId, moment);
        },
      ),
  );

  server.get(
    "/api/school-children",
    { config: { reach: "staff" } },
    async (request): Promise<ChildProgress[]> =>
      runAsSignedInStaff(database, request, async (staff, reachDatabase) => {
        const moment = new Date();
        const seenChildIds = (
          await loadSeenChildPlacements(reachDatabase, staff, moment)
        ).map(({ id }) => id);
        const loggedChildren = await logAdminAccess(
          reachDatabase,
          request,
          staff,
          "school-children-progress.listed",
          seenChildIds,
        );
        if (loggedChildren > 0) {
          request.log.info(
            { userId: staff.userId, childCount: loggedChildren },
            "children.school-children.opened-by-admin",
          );
        }
        return loadChildProgress(reachDatabase, seenChildIds, moment);
      }),
  );

  server.get<{ Params: ChildParams }>(
    "/api/children/:childId/progress",
    { config: { reach: "adult" }, schema: { params: childParamsSchema } },
    async (request): Promise<ChildProgress> =>
      runAsSignedInAdult(database, request, async (caller, reachDatabase) => {
        const moment = new Date();
        const { childId } = request.params;
        await loadSeenChild(reachDatabase, caller, childId, moment);
        if (
          (await logAdminAccess(
            reachDatabase,
            request,
            caller,
            "child-progress.opened",
            [childId],
          )) > 0
        ) {
          request.log.info(
            { userId: caller.userId, childId },
            "children.progress.opened-by-admin",
          );
        }
        const [progress] = await loadChildProgress(
          reachDatabase,
          [childId],
          moment,
        );
        return progress;
      }),
  );
};
