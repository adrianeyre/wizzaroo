import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import type {
  FastifyInstance,
  InjectOptions,
  RouteShorthandOptions,
} from "fastify";
import pg from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  NotSignedInError,
  runAsSignedInAdmin,
  runAsSignedInParent,
  runAsSignedInUser,
  signInCookieName,
} from "./auth/signed-in-parent.js";
import { openDatabase, type Database } from "./database.js";
import { NotAFamilyDeviceError } from "./family-devices/signed-in-family-device.js";
import { buildHttpServer } from "./http-server.js";
import { NulByteError } from "./nul-bytes.js";
import {
  perIpAddressLimitedRoutes,
  TooManyRequestsError,
} from "./rate-limit/request-rate-limit.js";
import { loadRequestRatePolicy } from "./rate-limit/request-rate-policy.js";
import {
  listDeclaredRouteReaches,
  UndeclaredRouteReachError,
} from "./route-reach-hook.js";
import { RouteReachMismatchError, type RouteReach } from "./route-reach.js";

const unreachableDatabaseUrl = "postgres://wizzaroo_app@127.0.0.1:1/wizzaroo";
const clientPage = "<!doctype html><title>Wizzaroo</title>";
const parentPage = "<!doctype html><title>Wizzaroo for Parents</title>";

const passkeyAnswer = {
  id: "Y3JlZGVudGlhbA",
  rawId: "Y3JlZGVudGlhbA",
  type: "public-key",
  clientExtensionResults: {},
  response: {
    clientDataJSON: "e30",
    authenticatorData: "YXV0aA",
    signature: "c2lnbmF0dXJl",
  },
};

describe("buildHttpServer", () => {
  let clientDirectory: string;
  let server: FastifyInstance;
  // Each test starts with fresh request-rate counters, since many of them post to the sign-in and reset routes.
  let clockMs = Date.now();

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-client-"));
    await writeFile(join(clientDirectory, "index.html"), clientPage);
    await mkdir(join(clientDirectory, "parent"));
    await writeFile(join(clientDirectory, "parent", "index.html"), parentPage);
    const database = openDatabase(unreachableDatabaseUrl);
    server = await buildHttpServer({
      database,
      clientDirectory,
      sendEmail: () => Promise.resolve(),
      publicUrl: new URL("https://wizzaroo.example"),
      isSecondSchoolGateMet: false,
      requestRateClock: () => clockMs,
    });
  });

  afterEach(() => {
    clockMs += 86_400_000;
  });

  afterAll(async () => {
    await server.close();
    await rm(clientDirectory, { recursive: true });
  });

  it("serves the built client from the same origin", async () => {
    const response = await server.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^text\/html/);
    expect(response.body).toBe(clientPage);
  });

  it("serves the Parent page at /parent/, and sends /parent there", async () => {
    const redirect = await server.inject({ method: "GET", url: "/parent" });
    const page = await server.inject({ method: "GET", url: "/parent/" });

    expect(redirect.statusCode).toBe(301);
    expect(redirect.headers.location).toBe("/parent/");
    expect(page.body).toBe(parentPage);
  });

  it("reports an error from /health when Postgres cannot be reached", async () => {
    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(500);
  });

  it("refuses the Family to a request that isn't signed in", async () => {
    const response = await server.inject({ method: "GET", url: "/api/family" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "Sign in to Wizzaroo first",
    });
  });

  it("refuses the Children to a request that isn't signed in", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/children",
    });

    expect(response.statusCode).toBe(401);
  });

  it.each([
    { email: "owner@example.com" },
    { password: "a password" },
    { email: "", password: "a password" },
  ])("refuses a sign-in of %j before looking anyone up", async (payload) => {
    const response = await server.inject({
      method: "POST",
      url: "/api/sign-in",
      payload,
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([
    { method: "GET", url: "/api/email-address" },
    {
      method: "POST",
      url: "/api/email-address-checks",
      payload: { email: "parent@example.com" },
    },
    {
      method: "PUT",
      url: "/api/password",
      payload: {
        currentPassword: "the-old-password",
        newPassword: "a-new-long-password",
      },
    },
    {
      method: "POST",
      url: "/api/password",
      payload: { newPassword: "a-new-long-password" },
    },
    {
      method: "DELETE",
      url: "/api/password",
      payload: { currentPassword: "the-old-password" },
    },
    { method: "GET", url: "/api/sign-in-methods" },
    { method: "POST", url: "/api/passkey-registration-options" },
    { method: "DELETE", url: "/api/passkeys/a-passkey-id" },
    { method: "POST", url: "/api/totp-setups" },
    { method: "POST", url: "/api/two-factor", payload: { code: "123456" } },
    { method: "DELETE", url: "/api/two-factor", payload: { code: "123456" } },
  ] as const)(
    "refuses $method $url to a request that isn't signed in",
    async (request) => {
      const response = await server.inject(request);

      expect(response.statusCode).toBe(401);
    },
  );

  it.each([
    { url: "/api/email-address-confirmations", payload: {} },
    { url: "/api/email-address-confirmations", payload: { token: "" } },
    { url: "/api/password-reset-requests", payload: {} },
    { url: "/api/password-reset-requests", payload: { email: "" } },
    {
      url: "/api/password-reset-requests",
      payload: { email: "parent@example.com", userId: "someone-else" },
    },
    { url: "/api/password-resets", payload: { token: "a-reset-token" } },
    {
      url: "/api/password-resets",
      payload: { token: "", newPassword: "a-new-long-password" },
    },
    {
      url: "/api/password-resets",
      payload: { token: "a-reset-token", newPassword: "elevenchars" },
    },
  ])(
    "refuses POST $url with $payload before looking anyone up",
    async ({ url, payload }) => {
      const response = await server.inject({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
    },
  );

  it("asks for the password again when a two-factor code arrives without one", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/sign-in/two-factor-code",
      payload: { code: "123456" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "Sign in with your email address and password again",
    });
  });

  it.each([
    {
      url: "/api/sign-in",
      payload: { email: "owner\u0000@example.com", password: "a password" },
    },
    {
      url: "/api/password-reset-requests",
      payload: { email: "owner\u0000@example.com" },
    },
    {
      url: "/api/invite-acceptances",
      payload: { token: "a-token\u0000", password: "a long enough password" },
    },
  ])(
    "refuses a NUL byte sent to $url with a 400, before Postgres is asked",
    async ({ url, payload }) => {
      const response = await server.inject({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: new NulByteError().message,
      });
    },
  );

  it.each([
    { payload: {} },
    { payload: { response: { ...passkeyAnswer, type: "password" } } },
    {
      payload: {
        response: { ...passkeyAnswer, response: { clientDataJSON: "e30" } },
      },
    },
    { payload: { response: passkeyAnswer, userId: "someone-else" } },
  ])(
    "refuses a passkey sign-in of $payload before looking anyone up",
    async ({ payload }) => {
      const response = await server.inject({
        method: "POST",
        url: "/api/passkey-sign-ins",
        payload,
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it.each([
    { clientDataJSON: "not base64url!", problem: "isn't base64url" },
    { clientDataJSON: "bm90IGpzb24", problem: "isn't JSON" },
    { clientDataJSON: "e30", problem: "holds no challenge" },
  ])(
    "refuses a passkey answer whose client data $problem, before looking anyone up",
    async ({ clientDataJSON }) => {
      const response = await server.inject({
        method: "POST",
        url: "/api/passkey-sign-ins",
        payload: {
          response: {
            ...passkeyAnswer,
            response: { ...passkeyAnswer.response, clientDataJSON },
          },
        },
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it.each([
    { url: "/api/sign-in/two-factor-code", payload: {} },
    { url: "/api/sign-in/two-factor-code", payload: { code: "" } },
    {
      url: "/api/sign-in/two-factor-code",
      payload: { code: "123456", userId: "someone-else" },
    },
  ])(
    "refuses POST $url with $payload before looking anyone up",
    async ({ url, payload }) => {
      const response = await server.inject({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
    },
  );

  it.each([
    { method: "GET", url: "/api/me" },
    { method: "GET", url: "/api/schools" },
    { method: "GET", url: "/api/teachers" },
    { method: "GET", url: "/api/parents" },
    { method: "GET", url: "/api/school-children" },
    { method: "GET", url: "/api/bulk/teachers/template" },
    {
      method: "POST",
      url: "/api/people/0b0f7b1e-1111-4111-8111-111111111111/password-resets",
    },
    { method: "GET", url: "/api/family-join-requests" },
    {
      method: "PUT",
      url: "/api/family-join-requests/0b0f7b1e-1111-4111-8111-111111111111/agreement",
    },
    {
      method: "DELETE",
      url: "/api/family-join-requests/0b0f7b1e-1111-4111-8111-111111111111",
    },
  ] as const)(
    "refuses $method $url to a request that isn't signed in",
    async (request) => {
      const response = await server.inject(request);

      expect(response.statusCode).toBe(401);
    },
  );

  it("no longer has the route Parents used to invite other Parents", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/invites",
      payload: {},
    });

    expect(response.statusCode).toBe(404);
  });

  const inviteAcceptance = {
    token: "an-invite-token",
    password: "a-new-parent's-long-password",
  };

  it.each([
    { url: "/api/invite-acceptances", payload: {} },
    {
      url: "/api/invite-acceptances",
      payload: { ...inviteAcceptance, token: "" },
    },
    {
      url: "/api/invite-acceptances",
      payload: { ...inviteAcceptance, email: "someone-else@example.com" },
    },
    {
      url: "/api/invite-acceptances",
      payload: { ...inviteAcceptance, password: "elevenchars" },
    },
    {
      url: "/api/invite-acceptances",
      payload: { ...inviteAcceptance, roles: ["admin", "parent"] },
    },
    {
      url: "/api/invite-acceptances",
      payload: {
        ...inviteAcceptance,
        familyId: "0b0f7b1e-1111-4111-8111-111111111111",
      },
    },
  ])(
    "refuses POST $url with $payload before looking anyone up",
    async ({ url, payload }) => {
      const response = await server.inject({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
    },
  );

  it("refuses play to a browser that isn't a Family Device, before looking anything up", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/play/family",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      message: "This browser isn't a Family Device, or it has been signed out",
    });
  });

  it("signs out a browser that isn't signed in by clearing its cookie anyway", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/sign-out",
    });

    expect(response.statusCode).toBe(204);
    expect(response.cookies).toMatchObject([
      { name: signInCookieName, value: "", httpOnly: true, secure: true },
    ]);
  });
});

describe("buildHttpServer's request-rate limits on reset requests", () => {
  const policy = loadRequestRatePolicy();
  const resetLimit = policy.perAccount.resetRequests;
  const ipLimit = policy.perIpAddress;
  const allowedForOneAddress = Math.min(
    resetLimit.requestsPerWindow,
    resetLimit.burst,
  );
  const allowedFromOneCaller = Math.min(
    ipLimit.requestsPerWindow,
    ipLimit.burst,
  );
  let clientDirectory: string;
  let server: FastifyInstance;
  let clockMs = Date.now();

  const askFrom = (clientAddress: string, payload: object) =>
    server.inject({
      method: "POST",
      url: "/api/password-reset-requests",
      remoteAddress: "172.30.0.2",
      headers: { "cf-connecting-ip": clientAddress },
      payload,
    });

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-client-"));
    server = await buildHttpServer({
      database: openDatabase(unreachableDatabaseUrl),
      clientDirectory,
      sendEmail: () => Promise.resolve(),
      publicUrl: new URL("https://wizzaroo.example"),
      isSecondSchoolGateMet: false,
      requestRateClock: () => clockMs,
      // The address every request below arrives from, as cloudflared's does, so its CF-Connecting-IP is believed (#332).
      tunnelProxyAddress: "172.30.0.2",
    });
  });

  afterEach(() => {
    clockMs += Math.max(ipLimit.windowMs, resetLimit.windowMs);
  });

  afterAll(async () => {
    await server.close();
    await rm(clientDirectory, { recursive: true });
  });

  it("refuses one email address, however it is written, once it has been asked for its limit, from any number of callers", async () => {
    const asked = allowedForOneAddress + 1;
    const statuses = [];
    for (let caller = 0; caller < asked; caller += 1) {
      const response = await askFrom(`198.51.100.${String(caller + 1)}`, {
        email: caller % 2 === 0 ? "parent@example.com" : " PARENT@Example.com ",
      });
      statuses.push(response.statusCode);
    }

    expect(statuses).toEqual(
      Array.from({ length: asked }, (_, caller) =>
        caller < allowedForOneAddress ? 204 : 429,
      ),
    );
  });

  it("refuses one caller's address once it is over its limit, before reading the body", async () => {
    const asked = allowedFromOneCaller + 1;
    const statuses = [];
    for (let request = 0; request < asked; request += 1) {
      statuses.push((await askFrom("203.0.113.20", {})).statusCode);
    }
    const anotherCaller = await askFrom("203.0.113.21", {});

    expect(statuses).toEqual(
      Array.from({ length: asked }, (_, request) =>
        request < allowedFromOneCaller ? 400 : 429,
      ),
    );
    expect(anotherCaller.statusCode).toBe(400);
  });

  it("answers 429 the same way whichever limit fired", async () => {
    let accountRefusal;
    for (let caller = 0; caller <= allowedForOneAddress; caller += 1) {
      accountRefusal = await askFrom(`198.51.100.${String(caller + 1)}`, {
        email: "parent@example.com",
      });
    }
    let callerRefusal;
    for (let request = 0; request <= allowedFromOneCaller; request += 1) {
      callerRefusal = await askFrom("203.0.113.20", {
        email: `someone-${String(request)}@example.com`,
      });
    }

    expect(accountRefusal?.statusCode).toBe(429);
    expect(callerRefusal?.statusCode).toBe(429);
    expect(callerRefusal?.body).toBe(accountRefusal?.body);
    expect(callerRefusal?.headers["content-type"]).toBe(
      accountRefusal?.headers["content-type"],
    );
    expect(accountRefusal?.json()).toEqual({
      statusCode: 429,
      error: "Too Many Requests",
      message: new TooManyRequestsError().message,
    });
  });

  it("counts the seven sign-in, reset and Invite routes together for one caller's address, refusing each before reading its body (#246)", async () => {
    const routes = perIpAddressLimitedRoutes.map((route) =>
      route.replace(/^POST /, ""),
    );
    const asked = allowedFromOneCaller + routes.length;
    const answers = [];
    for (let request = 0; request < asked; request += 1) {
      const url = routes[request % routes.length];
      const response = await server.inject({
        method: "POST",
        url,
        remoteAddress: "172.30.0.2",
        headers: { "cf-connecting-ip": "203.0.113.30" },
        payload: { anUnexpectedField: true },
      });
      answers.push({ url, statusCode: response.statusCode });
    }

    expect(routes).toHaveLength(7);
    expect(answers.slice(allowedFromOneCaller)).toEqual(
      expect.arrayContaining(routes.map((url) => ({ url, statusCode: 429 }))),
    );
    expect(
      answers
        .slice(0, allowedFromOneCaller)
        .every(({ statusCode }) => statusCode !== 429),
    ).toBe(true);
  });
});

const unknownId = "0b0f7b1e-1111-4111-8111-111111111111";

/** The wrapper table in docs/pen-test/findings/B1.md, one row per route. Each GET answers HEAD too, under the same wrapper. */
const wrapperTable: Record<string, RouteReach> = {
  "GET /health": "none",
  "GET /voices/:fingerprint/:name": "none",
  "POST /api/sign-in": "none",
  "POST /api/sign-in/two-factor-code": "none",
  "POST /api/sign-out": "none",
  "POST /api/passkey-sign-in-options": "none",
  "POST /api/passkey-sign-ins": "none",
  "POST /api/password-reset-requests": "none",
  "POST /api/password-resets": "none",
  "POST /api/email-address-confirmations": "none",
  "POST /api/invite-acceptances": "none",
  "POST /api/passkey-hand-off-registration-options": "none",
  "POST /api/passkey-hand-off-passkeys": "none",
  "POST /api/sign-in-code-sign-ins": "none",
  "GET /api/me": "user",
  "GET /api/sign-in-methods": "user",
  "GET /api/email-address": "user",
  "POST /api/email-address-checks": "adult",
  "PUT /api/password": "user",
  "POST /api/password": "user",
  "DELETE /api/password": "user",
  "DELETE /api/other-sign-ins": "user",
  "POST /api/totp-setups": "user",
  "POST /api/two-factor": "user",
  "DELETE /api/two-factor": "user",
  "POST /api/passkey-registration-options": "user",
  "POST /api/passkeys": "user",
  "POST /api/passkey-confirmation-options": "user",
  "POST /api/passkey-confirmations": "user",
  "DELETE /api/passkeys/:passkeyId": "user",
  "POST /api/passkey-hand-offs": "user",
  "POST /api/sign-in-codes": "user",
  "GET /api/schools": "adult",
  "PUT /api/children/:childId": "adult",
  "PUT /api/children/:childId/limits": "adult",
  "PUT /api/children/:childId/teacher-locks": "adult",
  "PUT /api/children/:childId/classmate-visits": "adult",
  "PUT /api/children/:childId/picture-password": "adult",
  "PUT /api/children/:childId/birth": "adult",
  "GET /api/children/:childId/progress": "adult",
  "GET /api/children/:childId/awards": "parent",
  "POST /api/children/:childId/star-awards": "parent",
  "GET /api/family": "parent",
  "GET /api/children": "parent",
  "POST /api/children": "parent",
  "GET /api/family-devices": "parent",
  "POST /api/family-devices": "parent",
  "DELETE /api/family-devices/:familyDeviceId": "parent",
  "GET /api/family-join-requests": "parent",
  "PUT /api/family-join-requests/:userId/agreement": "parent",
  "DELETE /api/family-join-requests/:userId": "parent",
  "GET /api/family-export": "parent",
  "GET /api/deletion-requests": "parent",
  "POST /api/deletion-requests": "parent",
  "GET /api/parents": "staff",
  "POST /api/parents": "staff",
  "POST /api/people/:userId/invites": "staff",
  "POST /api/people/:userId/password-resets": "staff",
  "POST /api/families/:familyId/children": "staff",
  "GET /api/school-children": "staff",
  "GET /api/bulk/families/template": "staff",
  "POST /api/bulk/families/preview": "staff",
  "POST /api/bulk/families": "staff",
  "GET /api/teachers": "admin",
  "POST /api/teachers": "admin",
  "PUT /api/teachers/:userId": "admin",
  "POST /api/people/:userId/deactivation": "admin",
  "PUT /api/children/:childId/school": "admin",
  "POST /api/schools": "admin",
  "PUT /api/schools/:schoolId": "admin",
  "PUT /api/schools/:schoolId/classmate-visits": "admin",
  "DELETE /api/schools/:schoolId": "admin",
  "GET /api/bulk/teachers/template": "admin",
  "POST /api/bulk/teachers/preview": "admin",
  "POST /api/bulk/teachers": "admin",
  "GET /api/admin/families": "admin",
  "GET /api/admin/deletion-requests": "admin",
  "POST /api/admin/deletion-requests/:deletionRequestId/confirmation": "admin",
  "POST /api/admin/children/:childId/star-awards": "admin",
  "POST /api/admin/children/:childId/progress-reset": "admin",
  "POST /api/admin/families/:familyId/family-chest-coin-awards": "admin",
  "DELETE /api/admin/children/:childId": "admin",
  "DELETE /api/admin/families/:familyId": "admin",
  "GET /api/admin/audit-log-entries": "admin",
  "GET /api/play/family": "family-device",
  "PUT /api/play/children/:childId/picture-password": "family-device",
  "PUT /api/play/children/:childId/character": "family-device",
  "GET /api/play/children/:childId/classmate-rooms": "family-device",
  "POST /api/play/events": "family-device",
};

const buildServer = (
  database: Database,
  clientDirectory: string,
): Promise<FastifyInstance> =>
  buildHttpServer({
    database,
    clientDirectory,
    sendEmail: () => Promise.resolve(),
    publicUrl: new URL("https://wizzaroo.example"),
    isSecondSchoolGateMet: false,
  });

const buildUnreachableDatabase = (): Database =>
  openDatabase(unreachableDatabaseUrl);

const ownerUserId = "0b0f7b1e-2222-4222-8222-222222222222";
const ownerFamilyId = "0b0f7b1e-3333-4333-8333-333333333333";

const readsTheSignIn = (query: unknown): boolean =>
  typeof query === "object" &&
  query !== null &&
  "text" in query &&
  typeof query.text === "string" &&
  query.text.includes('from "sign_ins"');

/**
 * Postgres as it answers the sign-in lookup for the owner, an Admin and a Parent signed in with a second factor,
 * so every adult rung lets them through. Every other query, and every connection a transaction asks for, fails.
 */
const buildOwnerSignedInDatabase = (): Database => {
  const pool = new pg.Pool({ connectionString: unreachableDatabaseUrl });
  Object.defineProperty(pool, "query", {
    value: (query: unknown) =>
      readsTheSignIn(query)
        ? Promise.resolve({
            rows: [
              [
                ownerUserId,
                ["admin", "parent"],
                ownerFamilyId,
                null,
                null,
                true,
                // Made and last used just now, so it is live and isn't written.
                0,
                0,
              ],
            ],
          })
        : Promise.reject(
            new Error("this stand-in for Postgres answers only the sign-in"),
          ),
  });
  // The reach's own connections reach nothing, as every query but the sign-in fails.
  return Object.assign(drizzle({ client: pool }), {
    $reach: drizzle({
      client: new pg.Pool({ connectionString: unreachableDatabaseUrl }),
    }),
  });
};

const buildRouteUrl = (url: string, id: string): string =>
  url.replaceAll(/:[A-Za-z]+/g, id);

describe("the reach every route declares (B1, #259)", () => {
  let clientDirectory: string;
  let server: FastifyInstance;

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-client-"));
    await writeFile(join(clientDirectory, "index.html"), clientPage);
    server = await buildServer(buildUnreachableDatabase(), clientDirectory);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await rm(clientDirectory, { recursive: true });
  });

  it("declares on every route the wrapper B1's table gives it, and registers no route under /api/ or /voices/ the table doesn't name", () => {
    const declared = listDeclaredRouteReaches(server).filter(
      ({ url }) =>
        url.startsWith("/api/") ||
        url === "/health" ||
        url.startsWith("/voices/"),
    );
    const expected = Object.entries(wrapperTable).flatMap(
      ([route, reach]): [string, RouteReach][] =>
        route.startsWith("GET ")
          ? [
              [route, reach],
              [route.replace(/^GET /, "HEAD "), reach],
            ]
          : [[route, reach]],
    );

    expect(
      declared.map(({ method, url, reach }) => [`${method} ${url}`, reach]),
    ).toHaveLength(expected.length);
    expect(
      Object.fromEntries(
        declared.map(({ method, url, reach }) => [`${method} ${url}`, reach]),
      ),
    ).toEqual(Object.fromEntries(expected));
  });

  it("leaves no reach undeclared but on the client files, which need none", () => {
    const undeclared = listDeclaredRouteReaches(server)
      .filter(({ reach }) => reach === undefined)
      .map(({ method, url }) => `${method} ${url}`);

    expect(undeclared.toSorted()).toEqual(["GET /*", "HEAD /*"]);
  });

  it("refuses a caller with no credential on every route with a wrapper, with that wrapper's refusal, before any query and before reading the request", async () => {
    const answers: string[] = [];
    const expectedAnswers: string[] = [];
    for (const { method, url, reach } of listDeclaredRouteReaches(server)) {
      if (reach === undefined || reach === "none") {
        continue;
      }
      const hasBody = method !== "GET" && method !== "HEAD";
      const response = await server.inject({
        method,
        url: buildRouteUrl(url, "not-an-id"),
        ...(hasBody
          ? {
              headers: { "content-type": "application/json" },
              payload: "{ this is not JSON",
            }
          : {}),
      });
      const message =
        method === "HEAD"
          ? ""
          : String(response.json<{ message: unknown }>().message);
      answers.push(
        `${method} ${url}: ${String(response.statusCode)} ${message}`,
      );
      const refusal =
        reach === "family-device"
          ? new NotAFamilyDeviceError()
          : new NotSignedInError();
      expectedAnswers.push(
        `${method} ${url}: ${String(refusal.statusCode)} ${method === "HEAD" ? "" : refusal.message}`,
      );
    }

    expect(answers).toHaveLength(
      Object.entries(wrapperTable)
        .filter(([, reach]) => reach !== "none")
        .reduce(
          (count, [route]) => count + (route.startsWith("GET ") ? 2 : 1),
          0,
        ),
    );
    expect(answers).toEqual(expectedAnswers);
  });

  it("refuses to start a server with a route under /api/ that declares no reach, so it can't run as the database owner", async () => {
    const unwrappedServer = await buildServer(
      buildUnreachableDatabase(),
      clientDirectory,
    );
    try {
      expect(() =>
        unwrappedServer.get("/api/unwrapped-children", () => ({
          isServed: true,
        })),
      ).toThrow(UndeclaredRouteReachError);
      expect(
        (await unwrappedServer.inject({ url: "/api/unwrapped-children" }))
          .statusCode,
      ).toBe(404);
    } finally {
      await unwrappedServer.close();
    }
  });

  const unexplainedOptions: RouteShorthandOptions[] = [
    { config: { reach: "none" } },
    { config: { reach: "none", noReachReason: "   " } },
  ];

  it.each(unexplainedOptions)(
    "refuses to start a server with a route under /api/ that declares %j, with no reason it needs no credential",
    async (options) => {
      const unexplainedServer = await buildServer(
        buildUnreachableDatabase(),
        clientDirectory,
      );
      try {
        expect(() =>
          unexplainedServer.get("/api/unexplained", options, () => ({
            isServed: true,
          })),
        ).toThrow(UndeclaredRouteReachError);
      } finally {
        await unexplainedServer.close();
      }
    },
  );
});

describe("a signed-in caller who passes every adult rung, as the owner does", () => {
  let clientDirectory: string;
  let signedInDatabase: Database;
  let server: FastifyInstance;

  const injectAsOwner = (options: InjectOptions) =>
    server.inject({
      ...options,
      cookies: { [signInCookieName]: "the-owner's-sign-in-token" },
    });

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-client-"));
    await writeFile(join(clientDirectory, "index.html"), clientPage);
    signedInDatabase = buildOwnerSignedInDatabase();
    server = await buildServer(signedInDatabase, clientDirectory);

    const readRefusal = async (runWrapper: () => Promise<unknown>) => {
      try {
        await runWrapper();
        return { refusal: "none" };
      } catch (error) {
        return {
          refusal:
            error instanceof RouteReachMismatchError
              ? "a different wrapper from the declared one"
              : "something else",
        };
      }
    };
    const work = () => Promise.resolve();
    server.get(
      "/api/probe/declares-parent-calls-user",
      { config: { reach: "parent" } },
      (request) =>
        readRefusal(() => runAsSignedInUser(signedInDatabase, request, work)),
    );
    server.get(
      "/api/probe/declares-user-calls-admin",
      { config: { reach: "user" } },
      (request) =>
        readRefusal(() => runAsSignedInAdmin(signedInDatabase, request, work)),
    );
    server.get(
      "/api/probe/declares-parent-calls-parent",
      { config: { reach: "parent" } },
      (request) =>
        readRefusal(() => runAsSignedInParent(signedInDatabase, request, work)),
    );
  });

  afterAll(async () => {
    await server.close();
    await rm(clientDirectory, { recursive: true });
  });

  it("won't run a handler under a wrapper other than the one its route declares, weaker or stronger", async () => {
    const answers = await Promise.all(
      [
        "/api/probe/declares-parent-calls-user",
        "/api/probe/declares-user-calls-admin",
        "/api/probe/declares-parent-calls-parent",
      ].map(async (url) => (await injectAsOwner({ url })).json<unknown>()),
    );

    expect(answers).toEqual([
      { refusal: "a different wrapper from the declared one" },
      { refusal: "a different wrapper from the declared one" },
      { refusal: "something else" },
    ]);
  });

  it.each([
    { url: "/api/email-address-checks", payload: {} },
    { url: "/api/email-address-checks", payload: { email: "" } },
    {
      url: "/api/email-address-checks",
      payload: { email: "parent@example.com", familyId: "a-family" },
    },
    { url: "/api/two-factor", payload: { code: "" } },
    { url: "/api/password", payload: {} },
    { url: "/api/passkeys", payload: { name: "   ", response: passkeyAnswer } },
    {
      url: "/api/passkeys",
      payload: { name: "a".repeat(41), response: passkeyAnswer },
    },
    {
      url: "/api/teachers",
      payload: {
        name: "Sam",
        email: "sam@school.example",
        schoolId: unknownId,
        yearGroups: [7],
        invite: "email",
      },
    },
    {
      url: "/api/parents",
      payload: { name: "Jo", email: "jo@example.com", invite: "post" },
    },
    { url: "/api/bulk/families", payload: { csv: "" } },
  ])(
    "refuses POST $url with $payload once the sign-in is checked, before the route's own work",
    async ({ url, payload }) => {
      const response = await injectAsOwner({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
    },
  );

  const newChild = {
    nickname: "Bea",
    birthMonth: 3,
    birthYear: 2020,
    yearGroupAdjustment: 0,
    characterName: "Sparkle",
    phonicsProgrammeId: "little-wandle",
    picturePassword: ["cat", "moon", "cat"],
  };

  it.each([
    { surname: "Eyre" },
    { birthday: "2020-03-01" },
    { photo: "data:image/png;base64,AAAA" },
    { familyId: "0b0f7b1e-1111-4111-8111-111111111111" },
  ])(
    "refuses to collect %j about a Child, once the sign-in is checked, before the route's own work",
    async (extraDetail) => {
      const response = await injectAsOwner({
        method: "POST",
        url: "/api/children",
        payload: { ...newChild, ...extraDetail },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: "body must NOT have additional properties",
      });
    },
  );

  it.each([
    { nickname: "   " },
    { nickname: "a nickname far too long for a Child" },
    { birthMonth: 0 },
    { birthMonth: 13 },
    { birthYear: 1999 },
    { yearGroupAdjustment: 2 },
    { yearGroup: 2 },
    { characterName: "" },
    { phonicsProgrammeId: "" },
    { phonicsProgrammeId: "a-programme-wizzaroo-does-not-have" },
    { picturePassword: ["cat", "moon"] },
    { picturePassword: ["cat", "moon", "cat", "sun"] },
    { picturePassword: ["cat", "moon", "unicorn"] },
  ])(
    "refuses a new Child with %j, once the sign-in is checked",
    async (wrongDetail) => {
      const response = await injectAsOwner({
        method: "POST",
        url: "/api/children",
        payload: { ...newChild, ...wrongDetail },
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it("refuses to change a Child whose ID isn't one Wizzaroo could have made, once the sign-in is checked", async () => {
    const response = await injectAsOwner({
      method: "PUT",
      url: "/api/children/not-a-child/picture-password",
      payload: { picturePassword: ["cat", "moon", "cat"] },
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([
    { newPassword: "a-new-long-password" },
    { currentPassword: "", newPassword: "a-new-long-password" },
    { currentPassword: "the-old-password" },
  ])(
    "refuses a password change of %j once the sign-in is checked, before the route's own work",
    async (payload) => {
      const response = await injectAsOwner({
        method: "PUT",
        url: "/api/password",
        payload,
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it.each([
    {},
    { name: "" },
    { name: "   " },
    { name: "a".repeat(41) },
    {
      name: "Kitchen tablet",
      familyId: "0b0f7b1e-1111-4111-8111-111111111111",
    },
  ])(
    "refuses a Family Device named with %j once the sign-in is checked, before the route's own work",
    async (payload) => {
      const response = await injectAsOwner({
        method: "POST",
        url: "/api/family-devices",
        payload,
      });

      expect(response.statusCode).toBe(400);
    },
  );

  it("refuses to sign out a Family Device whose ID isn't one Wizzaroo could have made, once the sign-in is checked", async () => {
    const response = await injectAsOwner({
      method: "DELETE",
      url: "/api/family-devices/not-a-family-device",
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("buildHttpServer's log", () => {
  let clientDirectory: string;
  let server: FastifyInstance;
  let stdoutWrite: MockInstance<typeof process.stdout.write>;

  beforeAll(async () => {
    clientDirectory = await mkdtemp(join(tmpdir(), "wizzaroo-client-"));
    await writeFile(join(clientDirectory, "index.html"), clientPage);
    // Pino writes to standard output, which Docker keeps as the container log, through process.stdout once it's watched.
    stdoutWrite = vi.spyOn(process.stdout, "write");
    server = await buildHttpServer({
      database: openDatabase(unreachableDatabaseUrl),
      clientDirectory,
      sendEmail: () => Promise.resolve(),
      publicUrl: new URL("https://wizzaroo.example"),
      isSecondSchoolGateMet: false,
    });
  });

  afterAll(async () => {
    await server.close();
    stdoutWrite.mockRestore();
    await rm(clientDirectory, { recursive: true });
  });

  it("logs a failing query by its route, with no SQL and no Drizzle message (#282)", async () => {
    const mark = stdoutWrite.mock.calls.length;

    const response = await server.inject({
      method: "GET",
      url: "/health?probe=parent.a1@wizzaroo.example",
    });
    const logText = stdoutWrite.mock.calls
      .slice(mark)
      .map(([chunk]) =>
        typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
      )
      .join("");
    const failedLines = logText
      .split("\n")
      .filter((line) => line.includes('"msg":"server.request.failed"'));

    expect(response.statusCode).toBe(500);
    expect(failedLines).toHaveLength(1);
    expect(failedLines.join("")).toContain('"route":"/health"');
    expect(logText).not.toContain("Failed query");
    expect(logText).not.toContain("select 1");
    expect(logText).not.toContain("parent.a1@wizzaroo.example");
  });
});
