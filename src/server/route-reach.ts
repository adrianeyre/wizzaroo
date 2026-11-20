import type { FastifyRequest } from "fastify";

/** The rungs a route can run under, weakest first, as docs/pen-test/findings/B1.md names them. */
export const routeReaches = [
  "none",
  "user",
  "adult",
  "parent",
  "staff",
  "admin",
  "family-device",
] as const;

export type RouteReach = (typeof routeReaches)[number];

/** The rungs a sign-in cookie answers, as opposed to a Family Device's. */
export type SignedInReach = Exclude<RouteReach, "none" | "family-device">;

declare module "fastify" {
  interface FastifyContextConfig {
    /** Who the route is for. Every route under /api/ declares one, and its check runs before anything reads the request. */
    reach?: RouteReach;
    /** Why a route with the reach "none" needs no credential: it is checked as the database owner, before anyone is known. */
    noReachReason?: string;
  }
}

export const isRouteReach = (value: unknown): value is RouteReach =>
  routeReaches.some((reach) => reach === value);

export class RouteReachMismatchError extends Error {
  override readonly name = "RouteReachMismatchError";

  constructor(declared: RouteReach | undefined, called: RouteReach) {
    super(
      `a route that declares the reach ${declared ?? "nothing"} called the ${called} wrapper`,
    );
  }
}

/** A wrapper runs only on a route that declared its rung, so a handler can't call a weaker one than its check. */
export const assertRouteDeclaresReach = (
  request: FastifyRequest,
  reach: RouteReach,
): void => {
  const declared = request.routeOptions.config.reach;
  if (declared !== reach) {
    throw new RouteReachMismatchError(declared, reach);
  }
};
