import { lt, sql } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import type { Database } from "../database.js";
import { passkeyChallenges } from "../schema.js";

/** Expired passkey challenges are swept at most this often by each server, however often challenges are made (#331). */
export const passkeyChallengeSweepIntervalMs = 60_000;

/** True the first time it is asked, then again only once the interval has passed since it last said true. */
export const buildOncePerInterval = (
  intervalMs: number,
  clock: () => number,
): (() => boolean) => {
  let lastTrueAt: number | undefined;
  return () => {
    const now = clock();
    if (lastTrueAt !== undefined && now - lastTrueAt < intervalMs) {
      return false;
    }
    lastTrueAt = now;
    return true;
  };
};

/** Deletes the expired challenges, through the index on `expires_at` (#331). */
export const deleteExpiredPasskeyChallenges = async (
  database: Pick<Database, "delete">,
): Promise<void> => {
  await database
    .delete(passkeyChallenges)
    .where(lt(passkeyChallenges.expiresAt, sql`now()`));
};

/**
 * Sweeps at most once an interval and off the request path: the call that finds a sweep due starts it and doesn't wait
 * for it. So a challenge costs one insert, however many are made a second, where a sweep before every insert read the
 * whole table each time (#331). The server's routes sweep as wizzaroo_server, whose policy sees every challenge, so a
 * sweep started from a signed-in adult's request still clears everyone's.
 */
export const buildPasskeyChallengeSweep = (
  sweep: () => Promise<void>,
  log: Pick<FastifyBaseLogger, "error">,
  clock: () => number,
): (() => void) => {
  const isSweepDue = buildOncePerInterval(
    passkeyChallengeSweepIntervalMs,
    clock,
  );
  return () => {
    if (!isSweepDue()) {
      return;
    }
    sweep().catch((error: unknown) => {
      log.error({ err: error }, "auth.passkey-challenges.sweep-failed");
    });
  };
};
