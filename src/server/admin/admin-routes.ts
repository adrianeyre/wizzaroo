import { and, asc, eq, isNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  buildUserActor,
  insertAuditLogEntry,
  type AuditActor,
} from "../audit/audit-log.js";
import { runAsSignedInAdmin } from "../auth/signed-in-parent.js";
import { ChildNotFoundError } from "../reach-rules.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  mostCoinsInOneAward,
  mostStarsInOneAward,
} from "../../curriculum/rewards.js";
import { logAdminAccess } from "../children/admin-access-log.js";
import { resetChildProgress } from "../children/child-progress-reset.js";
import { loadFamilyRewards } from "../children/family-rewards.js";
import { deleteChild, deleteFamily } from "../family-data/family-deletion.js";
import {
  children,
  deletionRequests,
  families,
  familyChestCoinAwards,
  starAwards,
  users,
} from "../schema.js";

export class FamilyNotFoundError extends Error {
  override readonly name = "FamilyNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("Wizzaroo has no such Family");
  }
}

export class DeletionRequestNotFoundError extends Error {
  override readonly name = "DeletionRequestNotFoundError";
  readonly statusCode = 404;

  constructor() {
    super("Wizzaroo has no such deletion request");
  }
}

export class DeletionNotRequestedError extends Error {
  override readonly name = "DeletionNotRequestedError";
  readonly statusCode = 409;

  constructor() {
    super("A Parent of this Family has to ask for this deletion first");
  }
}

interface PendingDeletion {
  id: string;
  familyId: string;
  childId: string | null;
}

const pendingDeletionColumns = {
  id: deletionRequests.id,
  familyId: deletionRequests.familyId,
  childId: deletionRequests.childId,
};

/**
 * Carries out a Parent's deletion request: the Admin's confirmation in the Audit Log, then the deletion itself. The
 * Admin deletes a Child or a Family only once one of its Parents has asked, so this is the only way either goes (#284).
 */
const confirmDeletionRequest = async (
  reachDatabase: ReachDatabase,
  { id, familyId, childId }: PendingDeletion,
  admin: AuditActor,
): Promise<void> => {
  await insertAuditLogEntry(reachDatabase, {
    action: "deletion-request.confirmed",
    actor: admin,
    target: { type: "deletion-request", id },
  });
  await (childId === null
    ? deleteFamily(reachDatabase, familyId, admin)
    : deleteChild(reachDatabase, childId, admin));
};

interface AdminFamily {
  id: string;
  name: string;
  children: { id: string; nickname: string }[];
}

interface AdminDeletionRequest {
  id: string;
  familyId: string;
  familyName: string;
  childId: string | null;
  childNickname: string | null;
  requestedBy: string;
  createdAt: Date;
}

interface FamilyChestCoins {
  familyChestActivityCount: number;
}

const buildAwardBodySchema = <Name extends string>(
  name: Name,
  mostInOneAward: number,
) =>
  ({
    type: "object",
    required: [name],
    additionalProperties: false,
    properties: {
      [name]: { type: "integer", minimum: 1, maximum: mostInOneAward },
    },
  }) as const;

const buildIdParamsSchema = <Name extends string>(name: Name) =>
  ({
    type: "object",
    required: [name],
    properties: { [name]: { type: "string", format: "uuid" } },
  }) as const;

export const registerAdminRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get(
    "/api/admin/families",
    { config: { reach: "admin" } },
    async (request): Promise<AdminFamily[]> =>
      runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase) => {
          const allFamilies = await reachDatabase
            .select({ id: families.id, name: families.name })
            .from(families)
            .orderBy(asc(families.createdAt), asc(families.id));
          const allChildren = await reachDatabase
            .select({
              id: children.id,
              familyId: children.familyId,
              nickname: children.nickname,
            })
            .from(children)
            .orderBy(asc(children.createdAt), asc(children.id));
          const listedFamilies = allFamilies.map((family) => ({
            ...family,
            children: allChildren
              .filter(({ familyId }) => familyId === family.id)
              .map(({ id, nickname }) => ({ id, nickname })),
          }));
          await logAdminAccess(
            reachDatabase,
            request,
            { userId: adminUserId, isAdmin: true },
            "families.listed",
            listedFamilies.flatMap((family) =>
              family.children.map(({ id }) => id),
            ),
          );
          return listedFamilies;
        },
      ),
  );

  server.get(
    "/api/admin/deletion-requests",
    { config: { reach: "admin" } },
    async (request): Promise<AdminDeletionRequest[]> =>
      runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase) => {
          const requests = await reachDatabase
            .select({
              id: deletionRequests.id,
              familyId: deletionRequests.familyId,
              familyName: families.name,
              childId: deletionRequests.childId,
              childNickname: children.nickname,
              requestedBy: users.email,
              createdAt: deletionRequests.createdAt,
            })
            .from(deletionRequests)
            .innerJoin(families, eq(families.id, deletionRequests.familyId))
            .innerJoin(users, eq(users.id, deletionRequests.requestedByUserId))
            .leftJoin(children, eq(children.id, deletionRequests.childId))
            .orderBy(asc(deletionRequests.createdAt), asc(deletionRequests.id));
          await logAdminAccess(
            reachDatabase,
            request,
            { userId: adminUserId, isAdmin: true },
            "deletion-requests.listed",
            requests.flatMap(({ childId, childNickname }) =>
              childId === null || childNickname === null ? [] : [childId],
            ),
          );
          return requests;
        },
      ),
  );

  server.post<{ Params: { deletionRequestId: string } }>(
    "/api/admin/deletion-requests/:deletionRequestId/confirmation",
    {
      config: { reach: "admin" },
      schema: { params: buildIdParamsSchema("deletionRequestId") },
    },
    async (request, reply) => {
      const { deletionRequestId } = request.params;
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const deletionRequest = (
            await reachDatabase
              .select(pendingDeletionColumns)
              .from(deletionRequests)
              .where(eq(deletionRequests.id, deletionRequestId))
          ).at(0);
          if (deletionRequest === undefined) {
            throw new DeletionRequestNotFoundError();
          }
          await confirmDeletionRequest(
            reachDatabase,
            deletionRequest,
            buildUserActor(signedInAdmin),
          );
          const { familyId, childId } = deletionRequest;
          request.log.info(
            { adminUserId, deletionRequestId, familyId, childId },
            "admin.deletion-request.confirmed",
          );
        },
      );

      return reply.code(204).send();
    },
  );

  server.post<{ Params: { childId: string }; Body: { stars: number } }>(
    "/api/admin/children/:childId/star-awards",
    {
      config: { reach: "admin" },
      schema: {
        params: buildIdParamsSchema("childId"),
        body: buildAwardBodySchema("stars", mostStarsInOneAward),
      },
    },
    async (request, reply) => {
      const { childId } = request.params;
      const { stars } = request.body;
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const matchingChildren = await reachDatabase
            .select({ id: children.id })
            .from(children)
            .where(eq(children.id, childId));
          if (matchingChildren.length === 0) {
            throw new ChildNotFoundError();
          }
          await reachDatabase
            .insert(starAwards)
            .values({ childId, stars, awardedByUserId: adminUserId });
          // The entry names the Child, not how many Stars, as no Audit Log entry keeps a value (ADR 0041, #288).
          await insertAuditLogEntry(reachDatabase, {
            action: "child.stars-awarded",
            actor: buildUserActor(signedInAdmin),
            target: { type: "child", id: childId },
          });
          request.log.info(
            { adminUserId, childId, stars },
            "admin.stars.awarded",
          );
        },
      );

      return reply.code(204).send();
    },
  );

  // Starts a Child's play again from nothing: their progress, Stars, Items, Room, Checks and Quests, but not the Child.
  server.post<{ Params: { childId: string } }>(
    "/api/admin/children/:childId/progress-reset",
    {
      config: { reach: "admin" },
      schema: { params: buildIdParamsSchema("childId") },
    },
    async (request, reply) => {
      const { childId } = request.params;
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const child = (
            await reachDatabase
              .select({ id: children.id, familyId: children.familyId })
              .from(children)
              .where(eq(children.id, childId))
          ).at(0);
          if (child === undefined) {
            throw new ChildNotFoundError();
          }
          await database.transaction((serverDatabase) =>
            resetChildProgress(
              serverDatabase,
              { childId, familyId: child.familyId },
              buildUserActor(signedInAdmin),
            ),
          );
          request.log.info(
            { adminUserId, childId },
            "admin.child.progress-reset",
          );
        },
      );

      return reply.code(204).send();
    },
  );

  server.post<{ Params: { familyId: string }; Body: { coins: number } }>(
    "/api/admin/families/:familyId/family-chest-coin-awards",
    {
      config: { reach: "admin" },
      schema: {
        params: buildIdParamsSchema("familyId"),
        body: buildAwardBodySchema("coins", mostCoinsInOneAward),
      },
    },
    async (request): Promise<FamilyChestCoins> => {
      const { familyId } = request.params;
      const { coins } = request.body;
      return runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const matchingFamilies = await reachDatabase
            .select({ id: families.id })
            .from(families)
            .where(eq(families.id, familyId));
          if (matchingFamilies.length === 0) {
            throw new FamilyNotFoundError();
          }
          await reachDatabase
            .insert(familyChestCoinAwards)
            .values({ familyId, coins, awardedByUserId: adminUserId });
          await insertAuditLogEntry(reachDatabase, {
            action: "family-chest.coins-awarded",
            actor: buildUserActor(signedInAdmin),
            target: { type: "family", id: familyId },
          });
          request.log.info(
            { adminUserId, familyId, coins },
            "admin.family-chest-coins.awarded",
          );
          const { familyChestActivityCount } = await loadFamilyRewards(
            reachDatabase,
            familyId,
          );
          return { familyChestActivityCount };
        },
      );
    },
  );

  // Deletes a Child only on a Parent's request for it, confirming that request; with none it refuses (#284, #290).
  server.delete<{ Params: { childId: string } }>(
    "/api/admin/children/:childId",
    {
      config: { reach: "admin" },
      schema: { params: buildIdParamsSchema("childId") },
    },
    async (request, reply) => {
      const { childId } = request.params;
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const matchingChildren = await reachDatabase
            .select({ id: children.id })
            .from(children)
            .where(eq(children.id, childId));
          if (matchingChildren.length === 0) {
            throw new ChildNotFoundError();
          }
          const deletionRequest = (
            await reachDatabase
              .select(pendingDeletionColumns)
              .from(deletionRequests)
              .where(eq(deletionRequests.childId, childId))
          ).at(0);
          if (deletionRequest === undefined) {
            throw new DeletionNotRequestedError();
          }
          await confirmDeletionRequest(
            reachDatabase,
            deletionRequest,
            buildUserActor(signedInAdmin),
          );
          request.log.info({ adminUserId, childId }, "admin.child.deleted");
        },
      );

      return reply.code(204).send();
    },
  );

  // Deletes a Family only on a Parent's request for the whole Family, confirming that request; with none it refuses.
  server.delete<{ Params: { familyId: string } }>(
    "/api/admin/families/:familyId",
    {
      config: { reach: "admin" },
      schema: { params: buildIdParamsSchema("familyId") },
    },
    async (request, reply) => {
      const { familyId } = request.params;
      await runAsSignedInAdmin(
        database,
        request,
        async (adminUserId, reachDatabase, signedInAdmin) => {
          const matchingFamilies = await reachDatabase
            .select({ id: families.id })
            .from(families)
            .where(eq(families.id, familyId));
          if (matchingFamilies.length === 0) {
            throw new FamilyNotFoundError();
          }
          const deletionRequest = (
            await reachDatabase
              .select(pendingDeletionColumns)
              .from(deletionRequests)
              .where(
                and(
                  eq(deletionRequests.familyId, familyId),
                  isNull(deletionRequests.childId),
                ),
              )
          ).at(0);
          if (deletionRequest === undefined) {
            throw new DeletionNotRequestedError();
          }
          await confirmDeletionRequest(
            reachDatabase,
            deletionRequest,
            buildUserActor(signedInAdmin),
          );
          request.log.info({ adminUserId, familyId }, "admin.family.deleted");
        },
      );

      return reply.code(204).send();
    },
  );
};
