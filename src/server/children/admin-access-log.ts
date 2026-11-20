import type { FastifyRequest } from "fastify";
import type { ReachDatabase } from "../reach.js";
import type { Caller } from "../reach-rules.js";
import { adminAccessLogs } from "../schema.js";
import type { AdminAccessServed } from "./admin-access-served.js";

/**
 * The Admin access log rows for a reply that serves the caller these Children's data: one per Child, however many
 * times the reply names them, naming the signed-in Admin and what the reply served them, and none for anyone else,
 * whose reads aren't logged (ADR 0001, ADR 0026).
 */
export const listAdminAccessLogRows = (
  caller: Pick<Caller, "userId" | "isAdmin">,
  served: AdminAccessServed,
  childIds: Iterable<string>,
): { adminUserId: string; childId: string; served: AdminAccessServed }[] =>
  caller.isAdmin
    ? [...new Set(childIds)].map((childId) => ({
        adminUserId: caller.userId,
        childId,
        served,
      }))
    : [];

/**
 * Logs the Admin being served these Children's data, on every reply path that serves it: a Child's progress, the
 * dashboard's lists of Families, Parents and deletion requests, and the Child or limits a change replies with. Each
 * path names what it served, its own value of `AdminAccessServed`. Call it within the reply's own reach transaction,
 * after the reach check, so a refused read writes nothing and a failed read rolls its rows back. A `HEAD` request is
 * answered with no body, so it serves no Child's data and writes no row (#271).
 */
export const logAdminAccess = async (
  reachDatabase: ReachDatabase,
  request: Pick<FastifyRequest, "method">,
  caller: Pick<Caller, "userId" | "isAdmin">,
  served: AdminAccessServed,
  childIds: Iterable<string>,
): Promise<number> => {
  const rows =
    request.method === "HEAD"
      ? []
      : listAdminAccessLogRows(caller, served, childIds);
  if (rows.length > 0) {
    await reachDatabase.insert(adminAccessLogs).values(rows);
  }
  return rows.length;
};
