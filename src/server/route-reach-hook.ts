import type {
  FastifyInstance,
  FastifyRequest,
  onRequestAsyncHookHandler,
} from "fastify";
import { checkSignedInUserReach } from "./auth/signed-in-parent.js";
import type { Database } from "./database.js";
import { checkSignedInFamilyDeviceReach } from "./family-devices/signed-in-family-device.js";
import { isRouteReach, type RouteReach } from "./route-reach.js";

export interface DeclaredRouteReach {
  method: string;
  url: string;
  reach: RouteReach | undefined;
}

export class UndeclaredRouteReachError extends Error {
  override readonly name = "UndeclaredRouteReachError";
}

const declaredRouteReaches = new WeakMap<
  FastifyInstance,
  DeclaredRouteReach[]
>();

/** Every route the server registered, HEAD included, with the reach it declared: the wrapper table of B1, as the code has it. */
export const listDeclaredRouteReaches = (
  server: FastifyInstance,
): DeclaredRouteReach[] => [...(declaredRouteReaches.get(server) ?? [])];

const buildReachCheck = (
  database: Database,
  reach: Exclude<RouteReach, "none">,
): onRequestAsyncHookHandler =>
  reach === "family-device"
    ? (request: FastifyRequest) =>
        checkSignedInFamilyDeviceReach(database, request)
    : (request: FastifyRequest) =>
        checkSignedInUserReach(database, request, reach);

/**
 * A route under /api/ is registered with its reach declared, or the server doesn't start.
 * The declared reach's check runs as the route's first onRequest hook, so a caller below it is refused
 * before the route parses, validates or works on anything the request holds.
 */
export const requireDeclaredRouteReach = (
  server: FastifyInstance,
  database: Database,
): void => {
  const declared: DeclaredRouteReach[] = [];
  declaredRouteReaches.set(server, declared);

  server.addHook("onRoute", (routeOptions) => {
    const { url } = routeOptions;
    const reach: unknown = routeOptions.config?.reach;
    const routeName = `${[routeOptions.method].flat().join(",")} ${url}`;
    if (reach !== undefined && !isRouteReach(reach)) {
      throw new UndeclaredRouteReachError(
        `${routeName} declares a reach Wizzaroo doesn't have: ${JSON.stringify(reach)}`,
      );
    }
    for (const method of [routeOptions.method].flat()) {
      declared.push({ method, url, reach });
    }
    if (reach === undefined) {
      if (url.startsWith("/api/")) {
        throw new UndeclaredRouteReachError(
          `${routeName} declares no reach. Give it config.reach, the wrapper it runs under, or "none" with config.noReachReason`,
        );
      }
      return;
    }
    if (reach === "none") {
      if ((routeOptions.config?.noReachReason ?? "").trim() === "") {
        throw new UndeclaredRouteReachError(
          `${routeName} declares the reach "none" with no config.noReachReason`,
        );
      }
      return;
    }
    const existingChecks = routeOptions.onRequest ?? [];
    routeOptions.onRequest = [
      buildReachCheck(database, reach),
      ...[existingChecks].flat(),
    ];
  });
};
