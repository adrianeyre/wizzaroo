import { createHash } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  onRequestHookHandler,
} from "fastify";
import {
  type ClientAddressRequest,
  findClientIpAddress,
} from "../audit/audit-log.js";
import type {
  RequestRateLimit,
  RequestRatePolicy,
} from "./request-rate-policy.js";

/** One answer whichever limit fired, so a refusal can't tell a caller which it was. */
export class TooManyRequestsError extends Error {
  override readonly name = "TooManyRequestsError";
  readonly statusCode = 429;

  constructor() {
    super("Too many requests. Please wait a while and try again");
  }
}

export type RequestRateAnswer = "allowed" | "refused" | "first-refusal";

interface KeyRequests {
  /** When each request let through in the window was made, oldest first. */
  takenAtMs: number[];
  /** Whether a request has been refused since the last one let through. */
  hasRefused: boolean;
}

export type RequestRateClock = () => number;

/** A sliding-window log per key, held in the process. Only requests let through are counted. */
export class SlidingWindowLimiter {
  readonly #limit: RequestRateLimit;
  readonly #clock: RequestRateClock;
  readonly #requestsByKey = new Map<string, KeyRequests>();
  #lastSweepMs: number;

  constructor(limit: RequestRateLimit, clock: RequestRateClock) {
    this.#limit = limit;
    this.#clock = clock;
    this.#lastSweepMs = clock();
  }

  /** Counts a request against the key if the limit allows it. "first-refusal" is the first refusal since the key's last request let through. */
  take(key: string): RequestRateAnswer {
    const nowMs = this.#clock();
    this.#sweep(nowMs);
    const { windowMs, requestsPerWindow, burst, burstWindowMs } = this.#limit;
    const requests = this.#requestsByKey.get(key) ?? {
      takenAtMs: [],
      hasRefused: false,
    };
    const windowStartMs = nowMs - windowMs;
    while (
      requests.takenAtMs.length > 0 &&
      requests.takenAtMs[0] <= windowStartMs
    ) {
      requests.takenAtMs.shift();
    }
    const burstStartMs = nowMs - burstWindowMs;
    const inBurst = requests.takenAtMs.filter(
      (takenAtMs) => takenAtMs > burstStartMs,
    ).length;

    if (requests.takenAtMs.length >= requestsPerWindow || inBurst >= burst) {
      const answer = requests.hasRefused ? "refused" : "first-refusal";
      requests.hasRefused = true;
      this.#requestsByKey.set(key, requests);
      return answer;
    }
    requests.takenAtMs.push(nowMs);
    requests.hasRefused = false;
    this.#requestsByKey.set(key, requests);
    return "allowed";
  }

  /**
   * Takes back the key's newest request, for a request that turned out not to count, such as a right password. It is
   * taken before the work it guards so requests sent at once can't all pass the check before any is counted.
   */
  giveBack(key: string): void {
    this.#requestsByKey.get(key)?.takenAtMs.pop();
  }

  /** How many keys are held, for tests of the sweep. */
  get keyCount(): number {
    return this.#requestsByKey.size;
  }

  /** Once a window, forgets every key with nothing left in it, so the map holds only a window's keys. */
  #sweep(nowMs: number): void {
    if (nowMs - this.#lastSweepMs < this.#limit.windowMs) {
      return;
    }
    this.#lastSweepMs = nowMs;
    const windowStartMs = nowMs - this.#limit.windowMs;
    for (const [key, { takenAtMs }] of this.#requestsByKey) {
      if ((takenAtMs.at(-1) ?? Number.NEGATIVE_INFINITY) <= windowStartMs) {
        this.#requestsByKey.delete(key);
      }
    }
  }
}

const ipv6Hextets = 8;
const ipv6PrefixHextets = 4;

const expandIpv6 = (address: string): string[] => {
  const [withoutZone] = address.split("%");
  const embeddedIpv4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(withoutZone);
  const hexOnly =
    embeddedIpv4 === null
      ? withoutZone
      : withoutZone.slice(0, embeddedIpv4.index) +
        [
          (Number(embeddedIpv4[1]) << 8) | Number(embeddedIpv4[2]),
          (Number(embeddedIpv4[3]) << 8) | Number(embeddedIpv4[4]),
        ]
          .map((hextet) => hextet.toString(16))
          .join(":");
  const halves = hexOnly.split("::");
  const [head] = halves;
  const tail = halves.at(1);
  const headHextets = head === "" ? [] : head.split(":");
  const tailHextets = tail === undefined || tail === "" ? [] : tail.split(":");
  const zeros = Array.from(
    { length: ipv6Hextets - headHextets.length - tailHextets.length },
    () => "0",
  );
  return [
    ...headHextets,
    ...(tail === undefined ? [] : zeros),
    ...tailHextets,
  ].map((hextet) => Number.parseInt(hextet, 16).toString(16));
};

/** An IPv4 address as it is, and an IPv6 one as its /64, since one host commonly holds the whole prefix. */
export const buildIpAddressKey = (address: string): string => {
  const mappedIpv4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mappedIpv4 !== null && isIPv4(mappedIpv4[1])) {
    return mappedIpv4[1];
  }
  if (!isIPv6(address)) {
    return address;
  }
  return `${expandIpv6(address).slice(0, ipv6PrefixHextets).join(":")}::/64`;
};

/** The address the Audit Log records, so what is limited is what is logged. */
export const findRequestRateKey = (request: ClientAddressRequest): string =>
  buildIpAddressKey(findClientIpAddress(request) ?? request.ip);

/** A normalised email address as its hash, so the counters hold no addresses and a long one costs no more than a short one. */
export const buildEmailAddressKey = (normalisedEmail: string): string =>
  createHash("sha256").update(normalisedEmail).digest("hex");

/** The counters for the routes in front of a credential, one set per server. */
export interface RequestRateLimits {
  /** Shared by the sign-in, reset and Invite routes, which the policy counts together. */
  perIpAddress: SlidingWindowLimiter;
  resetRequestsPerAccount: SlidingWindowLimiter;
  /** Wrong passwords for one email address, with an account or without (#246). */
  failedSignInsPerAccount: SlidingWindowLimiter;
}

export const buildRequestRateLimits = (
  policy: RequestRatePolicy,
  clock: RequestRateClock,
): RequestRateLimits => ({
  perIpAddress: new SlidingWindowLimiter(policy.perIpAddress, clock),
  resetRequestsPerAccount: new SlidingWindowLimiter(
    policy.perAccount.resetRequests,
    clock,
  ),
  failedSignInsPerAccount: new SlidingWindowLimiter(
    policy.perAccount.failedSignIns,
    clock,
  ),
});

type LimitedRequest = ClientAddressRequest & {
  log: Pick<FastifyBaseLogger, "warn">;
};

/** Counts the request against its caller's address, giving the refusal to answer with once the address is over the limit. */
export const checkPerIpAddressLimit = (
  limits: RequestRateLimits,
  request: LimitedRequest,
): TooManyRequestsError | undefined => {
  if (limits.perIpAddress.take(findRequestRateKey(request)) === "allowed") {
    return undefined;
  }
  request.log.warn("request-rate.ip-address-limited");
  return new TooManyRequestsError();
};

/** Runs before the body is read, so a refused request costs no parsing. */
export const buildPerIpAddressLimit =
  (limits: RequestRateLimits): onRequestHookHandler =>
  (request, _reply, done) => {
    const refusal = checkPerIpAddressLimit(limits, request);
    if (refusal === undefined) {
      done();
      return;
    }
    done(refusal);
  };

/** The six routes the policy counts together per caller's address: every way in front of a credential (#246). */
export const perIpAddressLimitedRoutes: readonly string[] = [
  "POST /api/sign-in",
  "POST /api/sign-in/two-factor-code",
  "POST /api/password-reset-requests",
  "POST /api/password-resets",
  "POST /api/invite-acceptances",
  "POST /api/passkey-sign-in-options",
];

/**
 * Puts the per-address limit first on each of the six routes as it is registered, so the list lives in one place and a
 * refused request costs no parsing. Added before the routes are, since an onRoute hook sees only routes after it.
 */
export const limitRoutesPerIpAddress = (
  server: FastifyInstance,
  limits: RequestRateLimits,
): void => {
  const limit = buildPerIpAddressLimit(limits);
  server.addHook("onRoute", (routeOptions) => {
    const isLimited = [routeOptions.method]
      .flat()
      .some((method) =>
        perIpAddressLimitedRoutes.includes(`${method} ${routeOptions.url}`),
      );
    if (!isLimited) {
      return;
    }
    routeOptions.onRequest = [limit, ...[routeOptions.onRequest ?? []].flat()];
  });
};
