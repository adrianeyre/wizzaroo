import { sql } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { Database } from "./database.js";

export type ReachDatabase = PgDatabase<NodePgQueryResultHKT>;

export interface CallerReach {
  userId: string | null;
  familyId: string | null;
  isAdmin: boolean;
  /**
   * The caller's own Family and account alone, with the Admin's and a Teacher's reach off, as on a Parent route or the
   * Family export (ADR 0027). Without it a Teacher's reads follow their user id, whatever the route.
   */
  isOwnFamilyOnly?: boolean;
}

export const reachRole = "wizzaroo_reach";

const ukDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
});

/** Runs work in one transaction on the reach's own pool, whose login holds no more than the reach even after RESET ROLE. */
export const runWithinReach = <Result>(
  database: Pick<Database, "$reach">,
  { userId, familyId, isAdmin, isOwnFamilyOnly = false }: CallerReach,
  work: (reachDatabase: ReachDatabase) => Promise<Result>,
): Promise<Result> =>
  database.$reach.transaction(async (transaction) => {
    // The policies work out a Child's Year from today's UK date as the server's clock has it, the same day the API uses.
    await transaction.execute(
      sql`select
        set_config('role', ${reachRole}, true),
        set_config('wizzaroo.user_id', ${userId ?? ""}, true),
        set_config('wizzaroo.family_id', ${familyId ?? ""}, true),
        set_config('wizzaroo.is_admin', ${String(isAdmin && !isOwnFamilyOnly)}, true),
        set_config('wizzaroo.own_family_only', ${String(isOwnFamilyOnly)}, true),
        set_config('wizzaroo.today', ${ukDateFormat.format(new Date())}, true)`,
    );
    return work(transaction);
  });
