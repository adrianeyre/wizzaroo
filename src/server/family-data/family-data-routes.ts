import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildUserActor, insertAuditLogEntry } from "../audit/audit-log.js";
import {
  loadSignedInParent,
  runAsSignedInParent,
} from "../auth/signed-in-parent.js";
import { ChildNotFoundError } from "../reach-rules.js";
import type { Database } from "../database.js";
import { runWithinReach } from "../reach.js";
import { children, deletionRequests } from "../schema.js";
import { loadFamilyExport, loadOwnAuditLogEntries } from "./family-export.js";

export const familyExportFileName = "wizzaroo-family-data.json";

export interface PendingDeletionRequest {
  id: string;
  childId: string | null;
  childNickname: string | null;
  createdAt: Date;
}

interface DeletionRequestBody {
  childId?: string;
}

const deletionRequestBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: { childId: { type: "string", format: "uuid" } },
} as const;

export const registerFamilyDataRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get(
    "/api/family-export",
    { config: { reach: "parent" } },
    async (request, reply) => {
      const { userId, familyId } = await loadSignedInParent(database, request);
      const familyExport = await runWithinReach(
        database,
        { userId, familyId, isAdmin: false, isOwnFamilyOnly: true },
        (reachDatabase) =>
          loadFamilyExport(reachDatabase, { userId, familyId }),
      );
      const auditLogEntries = await loadOwnAuditLogEntries(database, userId);
      request.log.info({ userId }, "family-data.export.downloaded");

      return reply
        .header(
          "content-disposition",
          `attachment; filename="${familyExportFileName}"`,
        )
        .type("application/json; charset=utf-8")
        .send(JSON.stringify({ ...familyExport, auditLogEntries }, null, 2));
    },
  );

  server.get(
    "/api/deletion-requests",
    { config: { reach: "parent" } },
    async (request): Promise<PendingDeletionRequest[]> =>
      runAsSignedInParent(database, request, ({ familyId }, reachDatabase) =>
        reachDatabase
          .select({
            id: deletionRequests.id,
            childId: deletionRequests.childId,
            childNickname: children.nickname,
            createdAt: deletionRequests.createdAt,
          })
          .from(deletionRequests)
          .leftJoin(children, eq(children.id, deletionRequests.childId))
          .where(eq(deletionRequests.familyId, familyId))
          .orderBy(asc(deletionRequests.createdAt), asc(deletionRequests.id)),
      ),
  );

  server.post<{ Body: DeletionRequestBody }>(
    "/api/deletion-requests",
    {
      config: { reach: "parent" },
      schema: { body: deletionRequestBodySchema },
    },
    async (request, reply) => {
      const childId = request.body.childId ?? null;
      const deletionRequestId = await runAsSignedInParent(
        database,
        request,
        async (parent, reachDatabase) => {
          const { userId, familyId } = parent;
          if (childId !== null) {
            const familyChildren = await reachDatabase
              .select({ id: children.id })
              .from(children)
              .where(
                and(eq(children.id, childId), eq(children.familyId, familyId)),
              );
            if (familyChildren.length === 0) {
              throw new ChildNotFoundError();
            }
          }
          const [{ id }] = await reachDatabase
            .insert(deletionRequests)
            .values({ familyId, childId, requestedByUserId: userId })
            .onConflictDoUpdate({
              target: [deletionRequests.familyId, deletionRequests.childId],
              set: { familyId },
            })
            .returning({ id: deletionRequests.id });
          await insertAuditLogEntry(reachDatabase, {
            action: "deletion-request.created",
            actor: buildUserActor(parent),
            target: { type: "deletion-request", id },
          });
          request.log.info(
            { userId, deletionRequestId: id, childId },
            "family-data.deletion-request.created",
          );
          return id;
        },
      );

      return reply.code(201).send({ id: deletionRequestId, childId });
    },
  );
};
