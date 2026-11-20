import { asc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import { yearGroups, type YearGroup } from "../../curriculum/year-groups.js";
import { deleteOutstandingAccountTokens } from "../auth/account-tokens.js";
import { createPasswordReset } from "../auth/password-reset-routes.js";
import {
  needsSecondFactor,
  runAsSignedInAdmin,
  runAsSignedInStaff,
  runAsSignedInUser,
  type SignedInUser,
} from "../auth/signed-in-parent.js";
import { logAdminAccess } from "../children/admin-access-log.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  type EmailAfterCommit,
  type SendEmail,
  sendEmailAfterCommit,
  sendEmailsAfterCommit,
} from "../email/send-email.js";
import {
  assertParentSeen,
  assertSchoolSeen,
  findChildSchoolYear,
  loadSeenChildPlacements,
  loadSeenParentIds,
  PersonNotFoundError,
  SchoolNotFoundError,
} from "../reach-rules.js";
import {
  children,
  families,
  familyParents,
  schoolParents,
  pendingSignIns,
  schools,
  signIns,
  teacherYearGroups,
  teachers,
  users,
  type UserRole,
} from "../schema.js";
import {
  buildFamilyJoinedNotice,
  buildFamilyJoinRequestNotice,
} from "../email/emails.js";
import {
  createParent,
  createParentAskingToJoin,
  createTeacher,
  loadNamedSchool,
  readEmailAddress,
  readPersonName,
  longestPersonNameLength,
} from "./create-people.js";
import {
  buildInviteEmailAfterCommit,
  createInvite,
  FamilyJoinNotAgreedError,
  findInviteStatus,
  loadLatestInvites,
  userHasLoginWithinReach,
  type InviteStatus,
  type InvitedRole,
} from "./invites.js";
import {
  FamilyJoinNeedsEmailedInviteError,
  hasFamilyJoinRequest,
  isWaitingToJoinAFamily,
  loadFamilyAdultEmails,
} from "./family-joins.js";

export class CantDeactivateYourselfError extends Error {
  override readonly name = "CantDeactivateYourselfError";
  readonly statusCode = 409;

  constructor() {
    super("The Admin can't deactivate their own account");
  }
}

export class FamilyNotFoundError extends Error {
  override readonly name = "FamilyNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("There's no such Family within your reach");
  }
}

type InviteDelivery = "email" | "link";

interface Me {
  email: string;
  name: string | null;
  roles: UserRole[];
  needsSecondFactor: boolean;
  familyName: string | null;
  teaching: {
    schoolId: string;
    schoolName: string | null;
    yearGroups: YearGroup[];
  } | null;
  unnamedSchoolIds: string[];
}

interface ListedAdult {
  userId: string;
  name: string | null;
  email: string;
  lastLoginAt: Date | null;
  inviteStatus: InviteStatus;
  deactivatedAt: Date | null;
}

interface ListedTeacher extends ListedAdult {
  schoolId: string;
  schoolName: string | null;
  yearGroups: YearGroup[];
}

interface ListedParent extends ListedAdult {
  familyId: string | null;
  familyName: string | null;
  schoolIds: string[];
  seenChildren: { id: string; nickname: string; schoolYear: number | null }[];
}

interface NewTeacherBody {
  name: string;
  email: string;
  schoolId: string;
  yearGroups: YearGroup[];
  invite: InviteDelivery;
}

interface TeacherChangeBody {
  schoolId: string;
  yearGroups: YearGroup[];
}

interface NewParentBody {
  name: string;
  email: string;
  schoolId?: string;
  familyId?: string;
  invite: InviteDelivery;
}

interface InviteDeliveryBody {
  invite: InviteDelivery;
}

interface PersonParams {
  userId: string;
}

const uuidSchema = { type: "string", format: "uuid" } as const;

const nameSchema = {
  type: "string",
  pattern: "\\S",
  maxLength: longestPersonNameLength,
} as const;

const inviteDeliverySchema = {
  type: "string",
  enum: ["email", "link"],
} as const;

const yearGroupsSchema = {
  type: "array",
  minItems: 1,
  uniqueItems: true,
  items: { type: "integer", enum: yearGroups },
} as const;

const newTeacherBodySchema = {
  type: "object",
  required: ["name", "email", "schoolId", "yearGroups", "invite"],
  additionalProperties: false,
  properties: {
    name: nameSchema,
    email: { type: "string", minLength: 1 },
    schoolId: uuidSchema,
    yearGroups: yearGroupsSchema,
    invite: inviteDeliverySchema,
  },
} as const;

const teacherChangeBodySchema = {
  type: "object",
  required: ["schoolId", "yearGroups"],
  additionalProperties: false,
  properties: { schoolId: uuidSchema, yearGroups: yearGroupsSchema },
} as const;

const newParentBodySchema = {
  type: "object",
  required: ["name", "email", "invite"],
  additionalProperties: false,
  properties: {
    name: nameSchema,
    email: { type: "string", minLength: 1 },
    schoolId: uuidSchema,
    familyId: uuidSchema,
    invite: inviteDeliverySchema,
  },
} as const;

const inviteDeliveryBodySchema = {
  type: "object",
  required: ["invite"],
  additionalProperties: false,
  properties: { invite: inviteDeliverySchema },
} as const;

const personParamsSchema = {
  type: "object",
  required: ["userId"],
  properties: { userId: uuidSchema },
} as const;

interface PeopleRouteParts {
  database: Database;
  sendEmail: SendEmail;
  publicUrl: URL;
}

/** A Teacher's Parents are always at their own School; the Admin names the School. */
export const findParentSchoolId = (
  staff: SignedInUser,
  requestedSchoolId: string | undefined,
): string => {
  if (staff.teaching !== null && !staff.isAdmin) {
    if (
      requestedSchoolId !== undefined &&
      requestedSchoolId !== staff.teaching.schoolId
    ) {
      throw new SchoolNotFoundError();
    }
    return staff.teaching.schoolId;
  }
  if (requestedSchoolId === undefined) {
    throw new SchoolNotFoundError();
  }
  return requestedSchoolId;
};

/** A Family the staff member may add a Parent or Child to: one whose Parent is within their reach. */
export const assertFamilySeen = async (
  database: Pick<ReachDatabase, "select">,
  staff: SignedInUser,
  familyId: string,
  moment: Date,
): Promise<void> => {
  const parents = await database
    .select({ userId: familyParents.userId })
    .from(familyParents)
    .where(eq(familyParents.familyId, familyId));
  const seenParentIds = await loadSeenParentIds(database, staff, moment);
  const family = (
    await database
      .select({ id: families.id })
      .from(families)
      .where(eq(families.id, familyId))
  ).at(0);
  if (
    family === undefined ||
    (!staff.isAdmin && !parents.some(({ userId }) => seenParentIds.has(userId)))
  ) {
    throw new FamilyNotFoundError();
  }
};

const loadInvitedAdult = async (
  database: Pick<ReachDatabase, "select">,
  userId: string,
): Promise<{
  role: InvitedRole;
  name: string;
  email: string;
  schoolId: string;
}> => {
  const adult = (
    await database
      .select({
        name: users.name,
        email: users.email,
        roles: users.roles,
        teacherSchoolId: teachers.schoolId,
      })
      .from(users)
      .leftJoin(teachers, eq(teachers.userId, users.id))
      .where(eq(users.id, userId))
  ).at(0);
  if (adult === undefined) {
    throw new PersonNotFoundError();
  }
  const name = adult.name ?? adult.email;
  if (adult.teacherSchoolId !== null) {
    return {
      role: "teacher",
      name,
      email: adult.email,
      schoolId: adult.teacherSchoolId,
    };
  }
  const membership = (
    await database
      .select({ schoolId: schoolParents.schoolId })
      .from(schoolParents)
      .where(eq(schoolParents.userId, userId))
      .limit(1)
  ).at(0);
  if (membership === undefined) {
    throw new PersonNotFoundError();
  }
  return {
    role: "parent",
    name,
    email: adult.email,
    schoolId: membership.schoolId,
  };
};

/** The Admin reaches every adult; a Teacher only the Parents within their reach. */
const assertAdultSeen = async (
  database: Pick<ReachDatabase, "select">,
  staff: SignedInUser,
  userId: string,
  moment: Date,
): Promise<void> => {
  if (staff.isAdmin) {
    return;
  }
  await assertParentSeen(database, staff, userId, moment);
};

export const registerPeopleRoutes = (
  server: FastifyInstance,
  { database, sendEmail, publicUrl }: PeopleRouteParts,
): void => {
  const parentPageUrl = new URL("/parent/", publicUrl);

  server.get(
    "/api/me",
    { config: { reach: "user" } },
    async (request): Promise<Me> =>
      runAsSignedInUser(
        database,
        request,
        async (signedInUser, reachDatabase) => {
          const [user] = await reachDatabase
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, signedInUser.userId));
          const family =
            signedInUser.familyId === null
              ? undefined
              : (
                  await reachDatabase
                    .select({ name: families.name })
                    .from(families)
                    .where(eq(families.id, signedInUser.familyId))
                ).at(0);
          const { teaching } = signedInUser;
          const teachingSchool =
            teaching === null
              ? undefined
              : (
                  await reachDatabase
                    .select({ name: schools.name })
                    .from(schools)
                    .where(eq(schools.id, teaching.schoolId))
                ).at(0);
          const unnamedSchools = signedInUser.isAdmin
            ? await reachDatabase
                .select({ id: schools.id })
                .from(schools)
                .where(sql`${schools.name} is null`)
            : [];
          return {
            email: user.email,
            name: user.name,
            roles: signedInUser.roles,
            needsSecondFactor: needsSecondFactor(signedInUser),
            familyName: family?.name ?? null,
            teaching:
              teaching === null
                ? null
                : { ...teaching, schoolName: teachingSchool?.name ?? null },
            unnamedSchoolIds: unnamedSchools.map(({ id }) => id),
          };
        },
      ),
  );

  server.get(
    "/api/teachers",
    { config: { reach: "admin" } },
    async (request): Promise<ListedTeacher[]> =>
      runAsSignedInAdmin(
        database,
        request,
        async (_adminUserId, reachDatabase) => {
          const moment = new Date();
          const latestInvites = await loadLatestInvites(reachDatabase);
          const teacherRows = await reachDatabase
            .select({
              userId: users.id,
              name: users.name,
              email: users.email,
              lastLoginAt: users.lastLoginAt,
              deactivatedAt: users.deactivatedAt,
              hasLogin: userHasLoginWithinReach(users.id),
              schoolId: teachers.schoolId,
              schoolName: schools.name,
              yearGroups: sql<
                YearGroup[]
              >`coalesce((select array_agg(${teacherYearGroups.yearGroup} order by ${teacherYearGroups.yearGroup}) from ${teacherYearGroups} where ${teacherYearGroups.userId} = ${teachers.userId}), '{}')`,
            })
            .from(teachers)
            .innerJoin(users, eq(users.id, teachers.userId))
            .innerJoin(schools, eq(schools.id, teachers.schoolId))
            .orderBy(asc(users.name), asc(users.email));
          return teacherRows.map(({ hasLogin, ...teacher }) => ({
            ...teacher,
            inviteStatus: findInviteStatus(
              {
                hasLogin,
                latestInvite: latestInvites.get(teacher.userId) ?? null,
              },
              moment,
            ),
          }));
        },
      ),
  );

  server.post<{ Body: NewTeacherBody }>(
    "/api/teachers",
    { config: { reach: "admin" }, schema: { body: newTeacherBodySchema } },
    async (request, reply) => {
      const name = readPersonName(request.body.name);
      const email = readEmailAddress(request.body.email);
      const { schoolId, yearGroups: newYearGroups } = request.body;
      const { created, emails } = await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const school = await loadNamedSchool(reachDatabase, schoolId);
          const userId = await createTeacher(reachDatabase, database, {
            name,
            email,
            schoolId,
            yearGroups: newYearGroups,
            createdBy: buildUserActor(signedInAdmin),
          });
          const createdInvite = await createInvite(reachDatabase, publicUrl, {
            userId,
            role: "teacher",
            name,
            email,
            schoolName: school.name,
            createdByUserId: adminUserId,
            isEmailed: request.body.invite === "email",
          });
          request.log.info(
            { userId: adminUserId, teacherUserId: userId, schoolId },
            "people.teacher.created",
          );
          return {
            created: { userId, invite: createdInvite.invite },
            emails: buildInviteEmailAfterCommit(database, createdInvite),
          };
        },
      );
      // Once the Teacher and their Invite have committed, so the send holds no database connection (#329).
      await sendEmailsAfterCommit(sendEmail, emails);
      return reply.code(201).send(created);
    },
  );

  server.put<{ Params: PersonParams; Body: TeacherChangeBody }>(
    "/api/teachers/:userId",
    {
      config: { reach: "admin" },
      schema: { params: personParamsSchema, body: teacherChangeBodySchema },
    },
    async (request, reply) => {
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, admin) => {
          const { userId } = request.params;
          const { schoolId, yearGroups: newYearGroups } = request.body;
          await assertSchoolSeen(reachDatabase, admin, schoolId);
          const changed = await reachDatabase
            .update(teachers)
            .set({ schoolId })
            .where(eq(teachers.userId, userId))
            .returning({ userId: teachers.userId });
          if (changed.length === 0) {
            throw new PersonNotFoundError();
          }
          await reachDatabase
            .delete(teacherYearGroups)
            .where(eq(teacherYearGroups.userId, userId));
          await reachDatabase
            .insert(teacherYearGroups)
            .values(newYearGroups.map((yearGroup) => ({ userId, yearGroup })));
          await insertAuditLogEntry(reachDatabase, {
            action: "teacher.year-groups-changed",
            actor: buildUserActor(admin),
            target: { type: "user", id: userId },
            detail: `school ${schoolId} years ${newYearGroups.join(",")}`,
          });
          request.log.info(
            { userId: adminUserId, teacherUserId: userId, schoolId },
            "people.teacher.changed",
          );
        },
      );
      return reply.code(204).send();
    },
  );

  server.get(
    "/api/parents",
    { config: { reach: "staff" } },
    async (request): Promise<ListedParent[]> =>
      runAsSignedInStaff(database, request, async (staff, reachDatabase) => {
        const moment = new Date();
        const seenParentIds = [
          ...(await loadSeenParentIds(reachDatabase, staff, moment)),
        ];
        if (seenParentIds.length === 0) {
          return [];
        }
        const latestInvites = await loadLatestInvites(reachDatabase);
        const parentRows = await reachDatabase
          .select({
            userId: users.id,
            name: users.name,
            email: users.email,
            lastLoginAt: users.lastLoginAt,
            deactivatedAt: users.deactivatedAt,
            hasLogin: userHasLoginWithinReach(users.id),
            familyId: familyParents.familyId,
            familyName: families.name,
          })
          .from(users)
          .leftJoin(familyParents, eq(familyParents.userId, users.id))
          .leftJoin(families, eq(families.id, familyParents.familyId))
          .where(inArray(users.id, seenParentIds))
          .orderBy(asc(users.name), asc(users.email));
        const memberships = await reachDatabase
          .select({
            userId: schoolParents.userId,
            schoolId: schoolParents.schoolId,
          })
          .from(schoolParents)
          .where(inArray(schoolParents.userId, seenParentIds));
        const seenChildren = await loadSeenChildPlacements(
          reachDatabase,
          staff,
          moment,
        );
        const seenChildNicknames = new Map(
          (seenChildren.length === 0
            ? []
            : await reachDatabase
                .select({ id: children.id, nickname: children.nickname })
                .from(children)
                .where(
                  inArray(
                    children.id,
                    seenChildren.map(({ id }) => id),
                  ),
                )
          ).map(({ id, nickname }) => [id, nickname]),
        );
        const listedFamilyIds = new Set(
          parentRows.map(({ familyId }) => familyId),
        );
        await logAdminAccess(
          reachDatabase,
          request,
          staff,
          "parents.listed",
          seenChildren
            .filter(({ familyId }) => listedFamilyIds.has(familyId))
            .map(({ id }) => id),
        );
        return parentRows.map(({ hasLogin, ...parent }) => ({
          ...parent,
          schoolIds: memberships
            .filter(({ userId }) => userId === parent.userId)
            .map(({ schoolId }) => schoolId),
          seenChildren: seenChildren
            .filter(({ familyId }) => familyId === parent.familyId)
            .map((child) => ({
              id: child.id,
              nickname: seenChildNicknames.get(child.id) ?? "",
              schoolYear: findChildSchoolYear(child, moment),
            })),
          inviteStatus: findInviteStatus(
            {
              hasLogin,
              latestInvite: latestInvites.get(parent.userId) ?? null,
            },
            moment,
          ),
        }));
      }),
  );

  server.post<{ Body: NewParentBody }>(
    "/api/parents",
    { config: { reach: "staff" }, schema: { body: newParentBodySchema } },
    async (request, reply) => {
      const name = readPersonName(request.body.name);
      const email = readEmailAddress(request.body.email);
      const { created, emails } = await runAsSignedInStaff(
        database,
        request,
        async (staff, reachDatabase) => {
          const moment = new Date();
          const schoolId = findParentSchoolId(staff, request.body.schoolId);
          const school = await loadNamedSchool(reachDatabase, schoolId);
          const familyId = request.body.familyId ?? null;
          if (familyId !== null) {
            await assertFamilySeen(reachDatabase, staff, familyId, moment);
          }
          if (familyId !== null && !staff.isAdmin) {
            // A Teacher's reach is read-only, so their new adult joins the Family only once one of its Parents agrees,
            // and gets their Invite by email then, never as a link the Teacher holds (#264).
            if (request.body.invite === "link") {
              throw new FamilyJoinNeedsEmailedInviteError();
            }
            const { userId, familyAdultEmails } = await database.transaction(
              async (ownerTransaction) => ({
                userId: await createParentAskingToJoin(
                  ownerTransaction,
                  ownerTransaction,
                  {
                    name,
                    email,
                    schoolId,
                    familyId,
                    requestedByUserId: staff.userId,
                    createdBy: buildUserActor(staff),
                  },
                ),
                familyAdultEmails: await loadFamilyAdultEmails(
                  ownerTransaction,
                  familyId,
                ),
              }),
            );
            request.log.info(
              { userId: staff.userId, parentUserId: userId, schoolId },
              "people.parent.asked-to-join-family",
            );
            return {
              created: {
                userId,
                invite: null,
                familyJoinRequest: { familyId },
              },
              emails: familyAdultEmails.map((to): EmailAfterCommit => ({
                email: buildFamilyJoinRequestNotice({
                  to,
                  schoolName: school.name,
                  parentPageUrl,
                }),
              })),
            };
          }
          // Once the reach is checked, the new login, its Family and its Invite are made as the owner (ADR 0027).
          const { parent, createdInvite, familyAdultEmails } =
            await database.transaction(async (ownerTransaction) => {
              const familyAdultEmails =
                familyId === null
                  ? []
                  : await loadFamilyAdultEmails(ownerTransaction, familyId, [
                      staff.userId,
                    ]);
              const createdParent = await createParent(
                ownerTransaction,
                ownerTransaction,
                {
                  name,
                  email,
                  schoolId,
                  familyId,
                  createdBy: buildUserActor(staff),
                },
              );
              const createdInvite = await createInvite(
                ownerTransaction,
                publicUrl,
                {
                  userId: createdParent.userId,
                  role: "parent",
                  name,
                  email,
                  schoolName: school.name,
                  createdByUserId: staff.userId,
                  isEmailed: request.body.invite === "email",
                },
              );
              return {
                parent: createdParent,
                createdInvite,
                familyAdultEmails,
              };
            });
          request.log.info(
            {
              userId: staff.userId,
              parentUserId: parent.userId,
              schoolId,
              isEmailed: createdInvite.email !== null,
            },
            "people.parent.created",
          );
          return {
            created: { ...parent, invite: createdInvite.invite },
            emails: [
              ...buildInviteEmailAfterCommit(database, createdInvite),
              // The Admin links a household's next adult at once, and the Family's Parents are told it happened.
              ...familyAdultEmails.map((to): EmailAfterCommit => ({
                email: buildFamilyJoinedNotice({ to, joinedEmail: email }),
              })),
            ],
          };
        },
      );
      // Once the adult, their Invite and the Family's link have committed, so no send holds a connection (#329).
      await sendEmailsAfterCommit(sendEmail, emails);
      return reply.code(201).send(created);
    },
  );

  server.post<{ Params: PersonParams; Body: InviteDeliveryBody }>(
    "/api/people/:userId/invites",
    {
      config: { reach: "staff" },
      schema: { params: personParamsSchema, body: inviteDeliveryBodySchema },
    },
    async (request, reply) => {
      const created = await runAsSignedInStaff(
        database,
        request,
        async (staff, reachDatabase) => {
          const { userId } = request.params;
          await assertAdultSeen(reachDatabase, staff, userId, new Date());
          const adult = await loadInvitedAdult(reachDatabase, userId);
          const school = await loadNamedSchool(reachDatabase, adult.schoolId);
          // A Teacher's connection can't see Invites, so the new one is made as the owner (ADR 0027).
          const created = await database.transaction(
            async (ownerTransaction) => {
              // An adult a Teacher brought into a Family gets their Invite at the address its Parents agreed to (#264).
              if (
                !staff.isAdmin &&
                request.body.invite === "link" &&
                (await hasFamilyJoinRequest(ownerTransaction, userId))
              ) {
                throw new FamilyJoinNeedsEmailedInviteError();
              }
              const replacement = await createInvite(
                ownerTransaction,
                publicUrl,
                {
                  userId,
                  role: adult.role,
                  name: adult.name,
                  email: adult.email,
                  schoolName: school.name,
                  createdByUserId: staff.userId,
                  isEmailed: request.body.invite === "email",
                },
              );
              await insertAuditLogEntry(ownerTransaction, {
                action: "invite.sent",
                actor: buildUserActor(staff),
                target: { type: "user", id: userId },
              });
              return replacement;
            },
          );
          request.log.info(
            { userId: staff.userId, invitedUserId: userId },
            "people.invite.resent",
          );
          return created;
        },
      );
      // Once the Invite has committed, so the send holds no database connection (#329).
      await sendEmailsAfterCommit(
        sendEmail,
        buildInviteEmailAfterCommit(database, created),
      );
      return reply.code(201).send(created.invite);
    },
  );

  server.post<{ Params: PersonParams }>(
    "/api/people/:userId/password-resets",
    { config: { reach: "staff" }, schema: { params: personParamsSchema } },
    async (request, reply) => {
      const resetEmail = await runAsSignedInStaff(
        database,
        request,
        async (staff, reachDatabase) => {
          const { userId } = request.params;
          await assertAdultSeen(reachDatabase, staff, userId, new Date());
          const adult = (
            await reachDatabase
              .select({
                email: users.email,
                deactivatedAt: users.deactivatedAt,
              })
              .from(users)
              .where(eq(users.id, userId))
          ).at(0);
          if (adult?.deactivatedAt !== null) {
            throw new PersonNotFoundError();
          }
          // An adult waiting to join a Family holds no credential until one of its Parents agrees (#264).
          if (await isWaitingToJoinAFamily(database, userId)) {
            throw new FamilyJoinNotAgreedError();
          }
          await insertAuditLogEntry(reachDatabase, {
            action: "password-reset.sent-by-staff",
            actor: buildUserActor(staff),
            target: { type: "user", id: userId },
          });
          // A reset link is a credential, made as the owner once the reach is checked (ADR 0027). The Admin's also
          // reopens a staff account's first second-factor setup, the way back for a Teacher who let it close (#243).
          const createdReset = await createPasswordReset(
            { database, publicUrl },
            {
              userId,
              email: adult.email,
              opensSecondFactorSetup: staff.isAdmin,
            },
          );
          request.log.info(
            { userId: staff.userId, resetUserId: userId },
            "people.password-reset.sent",
          );
          return createdReset;
        },
      );
      // Once the staff member's reach has committed, so the send holds no database connection (#329).
      await sendEmailAfterCommit(sendEmail, resetEmail);
      return reply.code(204).send();
    },
  );

  server.post<{ Params: PersonParams }>(
    "/api/people/:userId/deactivation",
    { config: { reach: "admin" }, schema: { params: personParamsSchema } },
    async (request, reply) => {
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const { userId } = request.params;
          if (userId === adminUserId) {
            throw new CantDeactivateYourselfError();
          }
          const deactivated = await reachDatabase
            .update(users)
            .set({
              deactivatedAt: sql`coalesce(${users.deactivatedAt}, now())`,
            })
            .where(eq(users.id, userId))
            .returning({ id: users.id });
          if (deactivated.length === 0) {
            throw new PersonNotFoundError();
          }
          await reachDatabase.delete(signIns).where(eq(signIns.userId, userId));
          await reachDatabase
            .delete(pendingSignIns)
            .where(eq(pendingSignIns.userId, userId));
          await deleteOutstandingAccountTokens(reachDatabase, userId);
          await insertAuditLogEntry(reachDatabase, {
            action: "adult.deactivated",
            actor: buildUserActor(signedInAdmin),
            target: { type: "user", id: userId },
          });
          request.log.info(
            { userId: adminUserId, deactivatedUserId: userId },
            "people.adult.deactivated",
          );
        },
      );
      return reply.code(204).send();
    },
  );
};
