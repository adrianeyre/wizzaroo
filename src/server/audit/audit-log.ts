import { isIP, isIPv4 } from "node:net";
import { and, eq, lt, notExists, sql } from "drizzle-orm";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
} from "fastify";
import type { SignedInUser } from "../auth/signed-in-parent.js";
import type { Database } from "../database.js";
import type { ReachDatabase } from "../reach.js";
import {
  adminAccessLogs,
  auditLogEntries,
  children,
  type UserRole,
} from "../schema.js";
import type { AuditAction, AuditTargetType } from "./audit-actions.js";

export type AuditActor =
  | { type: "user"; id: string; roles: UserRole[] }
  | { type: "family-device"; id: string }
  | { type: "none" };

export interface AuditTarget {
  type: AuditTargetType;
  id: string;
}

export interface AuditLogEntry {
  action: AuditAction;
  actor: AuditActor;
  target?: AuditTarget;
  detail?: string;
  ipAddress?: string;
}

export const auditLogRetentionMonths = 12;

const auditLogPurgeIntervalMilliseconds = 86_400_000;

const cloudflareClientIpHeader = "cf-connecting-ip";

type AuditLogWriter = Pick<ReachDatabase, "insert">;

export const buildUserActor = ({
  userId,
  roles,
}: Pick<SignedInUser, "userId" | "roles">): AuditActor => ({
  type: "user",
  id: userId,
  roles,
});

declare module "fastify" {
  interface FastifyInstance {
    /**
     * cloudflared's own address on the `tunnel` network (TUNNEL_PROXY_ADDRESS), the one socket `CF-Connecting-IP` is
     * believed from, or null where no proxy is named, as in development (#332).
     */
    tunnelProxyAddress: string | null;
  }
}

/** What finding a caller's address reads: the request's headers and socket, and the proxy its server names. */
export type ClientAddressRequest = Pick<FastifyRequest, "headers" | "ip"> & {
  server: Pick<FastifyInstance, "tunnelProxyAddress">;
};

const ipv4MappedPrefix = /^::ffff:/i;

/** One address however the socket writes it, so `::ffff:172.30.0.2` is the proxy `172.30.0.2` names. */
const unmapIpv4 = (address: string): string => {
  const unmapped = address.replace(ipv4MappedPrefix, "");
  return isIPv4(unmapped) ? unmapped : address;
};

/** Whether the socket is the named proxy's: never, while no proxy is named. */
export const isFromTunnelProxy = (
  socketAddress: string,
  tunnelProxyAddress: string | null,
): boolean =>
  tunnelProxyAddress !== null &&
  unmapIpv4(socketAddress) === unmapIpv4(tunnelProxyAddress);

/**
 * The caller's address as Cloudflare saw it when the request came through cloudflared, since behind the tunnel every
 * request comes from the tunnel itself. `CF-Connecting-IP` is believed only from the named proxy's socket, so a caller
 * that reaches the port another way is recorded, and limited, under its own socket's address (#332). The Audit Log and
 * the request-rate limits both read this.
 */
export const findClientIpAddress = ({
  headers,
  ip,
  server,
}: ClientAddressRequest): string | undefined => {
  const forwardedIpAddress = headers[cloudflareClientIpHeader];
  if (
    isFromTunnelProxy(ip, server.tunnelProxyAddress) &&
    typeof forwardedIpAddress === "string" &&
    isIP(forwardedIpAddress)
  ) {
    return forwardedIpAddress;
  }
  return isIP(ip) ? ip : undefined;
};

const buildAuditLogRow = ({
  action,
  actor,
  target,
  detail,
  ipAddress,
}: AuditLogEntry): typeof auditLogEntries.$inferInsert => ({
  action,
  actorType: actor.type,
  actorId: actor.type === "none" ? null : actor.id,
  actorRoles: actor.type === "user" ? actor.roles : null,
  targetType: target?.type ?? null,
  targetId: target?.id ?? null,
  detail: detail ?? null,
  ipAddress: ipAddress ?? null,
});

export const insertAuditLogEntries = async (
  database: AuditLogWriter,
  entries: AuditLogEntry[],
): Promise<void> => {
  if (entries.length === 0) {
    return;
  }
  await database.insert(auditLogEntries).values(entries.map(buildAuditLogRow));
};

export const insertAuditLogEntry = (
  database: AuditLogWriter,
  entry: AuditLogEntry,
): Promise<void> => insertAuditLogEntries(database, [entry]);

export const deleteExpiredAuditLogEntries = async (
  database: Database,
): Promise<number> => {
  const result = await database
    .delete(auditLogEntries)
    .where(
      lt(
        auditLogEntries.happenedAt,
        sql`now() - make_interval(months => ${auditLogRetentionMonths})`,
      ),
    );
  return result.rowCount ?? 0;
};

/**
 * A deleted Child's Admin access log rows outlive the deletion (#287), as the Audit Log's child.deleted entry does, and
 * go once they are older than the Audit Log keeps that entry. A Child who is still there keeps every row.
 */
export const deleteExpiredAdminAccessLogRowsOfDeletedChildren = async (
  database: Database,
): Promise<number> => {
  const result = await database
    .delete(adminAccessLogs)
    .where(
      and(
        lt(
          adminAccessLogs.openedAt,
          sql`now() - make_interval(months => ${auditLogRetentionMonths})`,
        ),
        notExists(
          database
            .select({ id: children.id })
            .from(children)
            .where(eq(children.id, adminAccessLogs.childId)),
        ),
      ),
    );
  return result.rowCount ?? 0;
};

/** Purges expired entries now and then once a day, giving a function that stops it. */
export const startAuditLogPurge = (
  database: Database,
  log: FastifyBaseLogger,
): (() => void) => {
  const purge = (): void => {
    deleteExpiredAuditLogEntries(database).then(
      (deletedCount) => {
        log.info({ deletedCount }, "audit.expired-entries.deleted");
      },
      (error: unknown) => {
        log.error({ err: error }, "audit.expired-entries.purge-failed");
      },
    );
    deleteExpiredAdminAccessLogRowsOfDeletedChildren(database).then(
      (deletedCount) => {
        log.info({ deletedCount }, "admin-access.expired-rows.deleted");
      },
      (error: unknown) => {
        log.error({ err: error }, "admin-access.expired-rows.purge-failed");
      },
    );
  };
  purge();
  const interval = setInterval(purge, auditLogPurgeIntervalMilliseconds);
  interval.unref();
  return () => {
    clearInterval(interval);
  };
};
