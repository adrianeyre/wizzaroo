import {
  errorCodes,
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type HookHandlerDoneFunction,
} from "fastify";
import { readSqlState } from "./server-log.js";

// Pen test I1 (#310, #311, #312): what every answer carries, how much of a body each route reads, and what an
// unexpected error tells the caller.

/** Every route's body limit but the few below: room for a sign-in, a code, a token, a name or a passkey response. */
export const smallBodyLimit = 16 * 1024;

/** Only for a CSV of up to 1,000,000 characters, its preview, and a Family Device's batch of up to 100 events (#312). */
export const largeBodyLimit = 1024 * 1024;

// Scripts come from Wizzaroo's own origin only and no page can be framed. Styles allow `unsafe-inline` for the
// pages' one inline <style>; voice-over audio plays from blob: URLs; the service worker is the origin's own (#311).
// Read it to me's Piper voices compile WebAssembly, which `wasm-unsafe-eval` allows and nothing else: JavaScript's own
// eval stays refused (ADR 0062).
export const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Set by the app itself, so they hold wherever it is served from: nothing in front of it adds any (ADR 0002).
// HSTS is ignored by browsers over plain http, as on localhost in development and the pen-test deployment.
export const securityHeaders = {
  "content-security-policy": contentSecurityPolicy,
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
} as const;

const addSecurityHeaders = (
  _request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void => {
  reply.headers(securityHeaders);
  done();
};

/** Every answer, a refusal, a 404 and a 500 included, carries the security headers (#311). */
export const sendSecurityHeaders = (server: FastifyInstance): void => {
  server.addHook("onRequest", addSecurityHeaders);
};

const readContentLength = (request: FastifyRequest): number | undefined => {
  const header = request.headers["content-length"];
  if (header === undefined || !/^\d+$/.test(header)) {
    return undefined;
  }
  return Number(header);
};

/**
 * Refuses a body its Content-Length says is over the route's own limit with 413 before anything else reads the
 * request, so a route that wants a credential refuses an oversized body before looking the caller up (#312).
 * Fastify's body parser holds a chunked body, which has no Content-Length, to the same limit.
 */
export const refuseOversizedBodies = (server: FastifyInstance): void => {
  server.addHook("onRequest", (request, _reply, done) => {
    const contentLength = readContentLength(request);
    if (
      contentLength !== undefined &&
      contentLength > request.routeOptions.bodyLimit
    ) {
      done(new errorCodes.FST_ERR_CTP_BODY_TOO_LARGE());
      return;
    }
    done();
  });
};

/** The one body every unexpected error answers with, whatever the route or the cause (#310). */
export const unexpectedErrorBody = {
  statusCode: 500,
  error: "Internal Server Error",
  message: "Something went wrong. Please try again.",
} as const;

const readClientErrorStatusCode = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const statusCode: unknown =
    Reflect.get(error, "statusCode") ?? Reflect.get(error, "status");
  return typeof statusCode === "number" && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
};

/**
 * A refusal (4xx) is answered as Fastify answers it. Anything else, a failed query, a driver error, an unreachable
 * database or a bug, answers 500 with one fixed body that holds no query, parameter, table, driver message, SQLSTATE
 * or database user. The error goes to the log only, which keeps what server-log.ts lets it (D3, #282).
 */
export const answerUnexpectedErrorsPlainly = (
  server: FastifyInstance,
): void => {
  server.setErrorHandler(
    (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      if (readClientErrorStatusCode(error) !== undefined) {
        // Sent on to Fastify's own handler, which sets the status and the error's headers and logs the refusal.
        reply.send(error);
        return;
      }
      reply.code(unexpectedErrorBody.statusCode);
      const sqlState = readSqlState(error);
      reply.log.error(
        {
          req: request,
          res: reply,
          err: error,
          ...(sqlState === undefined ? {} : { sqlState }),
        },
        "server.request.failed",
      );
      reply.send(unexpectedErrorBody);
    },
  );
};
