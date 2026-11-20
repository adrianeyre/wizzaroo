import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { runAsSignedInAdmin } from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import { auditLogEntries, users, type UserRole } from "../schema.js";
import {
  auditActions,
  type AuditAction,
  type AuditActorType,
  type AuditTargetType,
} from "./audit-actions.js";

export const auditLogPageSize = 50;

const mostAuditLogPages = 10_000;

interface AuditLogQuery {
  page?: number;
  action?: AuditAction;
  from?: string;
  to?: string;
}

const auditLogQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: { type: "integer", minimum: 1, maximum: mostAuditLogPages },
    action: { type: "string", enum: auditActions },
    from: { type: "string", format: "date" },
    to: { type: "string", format: "date" },
  },
} as const;

export interface ListedAuditLogEntry {
  id: string;
  happenedAt: Date;
  action: AuditAction;
  actorType: AuditActorType;
  actorId: string | null;
  actorRoles: UserRole[] | null;
  actorName: string | null;
  targetType: AuditTargetType | null;
  targetId: string | null;
  detail: string | null;
  ipAddress: string | null;
}

export interface AuditLogPage {
  entries: ListedAuditLogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
}

const ukTimeZone = "Europe/London";

const buildAuditLogFilter = ({
  action,
  from,
  to,
}: AuditLogQuery): SQL | undefined =>
  and(
    action === undefined ? undefined : eq(auditLogEntries.action, action),
    from === undefined
      ? undefined
      : gte(
          auditLogEntries.happenedAt,
          sql`(${from}::date::timestamp at time zone ${ukTimeZone})`,
        ),
    to === undefined
      ? undefined
      : lt(
          auditLogEntries.happenedAt,
          sql`((${to}::date + 1)::timestamp at time zone ${ukTimeZone})`,
        ),
  );

export const registerAuditLogRoutes = (
  server: FastifyInstance,
  database: Database,
): void => {
  server.get<{ Querystring: AuditLogQuery }>(
    "/api/admin/audit-log-entries",
    {
      config: { reach: "admin" },
      schema: { querystring: auditLogQuerySchema },
    },
    async (request): Promise<AuditLogPage> =>
      runAsSignedInAdmin(
        database,
        request,
        async (_adminUserId, reachDatabase) => {
          const page = request.query.page ?? 1;
          const filter = buildAuditLogFilter(request.query);
          const [{ totalCount }] = await reachDatabase
            .select({ totalCount: count() })
            .from(auditLogEntries)
            .where(filter);
          const entries = await reachDatabase
            .select({
              id: auditLogEntries.id,
              happenedAt: auditLogEntries.happenedAt,
              action: auditLogEntries.action,
              actorType: auditLogEntries.actorType,
              actorId: auditLogEntries.actorId,
              actorRoles: auditLogEntries.actorRoles,
              actorName: sql<
                string | null
              >`coalesce(${users.name}, ${users.email})`,
              targetType: auditLogEntries.targetType,
              targetId: auditLogEntries.targetId,
              detail: auditLogEntries.detail,
              ipAddress: auditLogEntries.ipAddress,
            })
            .from(auditLogEntries)
            .leftJoin(
              users,
              and(
                eq(auditLogEntries.actorType, "user"),
                eq(users.id, auditLogEntries.actorId),
              ),
            )
            .where(filter)
            .orderBy(desc(auditLogEntries.happenedAt), desc(auditLogEntries.id))
            .limit(auditLogPageSize)
            .offset((page - 1) * auditLogPageSize);
          return { entries, page, pageSize: auditLogPageSize, totalCount };
        },
      ),
  );
};
