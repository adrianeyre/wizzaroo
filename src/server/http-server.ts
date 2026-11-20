import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { eq, sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { registerAdminRoutes } from "./admin/admin-routes.js";
import { registerAuditLogRoutes } from "./audit/audit-log-routes.js";
import { registerEmailAddressCheckRoutes } from "./auth/email-address-check-routes.js";
import { registerInviteRoutes } from "./auth/invite-routes.js";
import { registerPasskeyHandOffRoutes } from "./auth/passkey-hand-off-routes.js";
import { registerPasskeyRoutes } from "./auth/passkey-routes.js";
import { registerPasswordChangeRoutes } from "./auth/password-change-routes.js";
import { registerPasswordResetRoutes } from "./auth/password-reset-routes.js";
import { registerOtherSignInsRoutes } from "./auth/other-sign-ins-routes.js";
import { registerSignInMethodsRoutes } from "./auth/sign-in-methods-routes.js";
import { registerSignInRoutes } from "./auth/sign-in-routes.js";
import { runAsSignedInParent } from "./auth/signed-in-parent.js";
import type { TotpSecretKey } from "./auth/totp-secret-box.js";
import { registerTwoFactorRoutes } from "./auth/two-factor-routes.js";
import { registerBulkRoutes } from "./bulk/bulk-routes.js";
import { registerAwardRoutes } from "./children/award-routes.js";
import { registerChildrenRoutes } from "./children/children-routes.js";
import { loadTotpSecretKey } from "./config/vars.js";
import { listPools, type Database } from "./database.js";
import {
  defaultEmailBatching,
  type EmailBatching,
  type SendEmail,
} from "./email/send-email.js";
import { registerClassmateRoomRoutes } from "./family-devices/classmate-room-routes.js";
import { registerFamilyDeviceRoutes } from "./family-devices/family-device-routes.js";
import { registerPlayEventRoutes } from "./family-devices/play-event-routes.js";
import { registerFamilyDataRoutes } from "./family-data/family-data-routes.js";
import { registerFamilyJoinRoutes } from "./people/family-joins.js";
import {
  answerUnexpectedErrorsPlainly,
  refuseOversizedBodies,
  sendSecurityHeaders,
  smallBodyLimit,
} from "./http-hardening.js";
import { narrowDateFormats } from "./held-dates.js";
import { registerNonFiniteNumberRefusal } from "./non-finite-numbers.js";
import { registerNulByteRefusal } from "./nul-bytes.js";
import { registerPeopleRoutes } from "./people/people-routes.js";
import {
  buildRequestRateLimits,
  limitRoutesPerIpAddress,
  type RequestRateClock,
} from "./rate-limit/request-rate-limit.js";
import {
  loadRequestRatePolicy,
  type RequestRatePolicy,
} from "./rate-limit/request-rate-policy.js";
import { requireDeclaredRouteReach } from "./route-reach-hook.js";
import { refuseOtherPageRequests } from "./same-origin-requests.js";
import { registerSchoolRoutes } from "./schools/school-routes.js";
import { families } from "./schema.js";
import { buildServerLogging } from "./server-log.js";
import {
  registerVoiceRoutes,
  type StreamVoiceFile,
} from "./voices/voice-files.js";

interface HttpServerParts {
  database: Database;
  clientDirectory: string;
  sendEmail: SendEmail;
  publicUrl: URL;
  isSecondSchoolGateMet: boolean;
  emailBatching?: EmailBatching;
  /** Read from pen-testing.md when not given, so a server can't be built without one. */
  requestRatePolicy?: RequestRatePolicy;
  /** When the request-rate limits think it is, in milliseconds; tests move it on. */
  requestRateClock?: RequestRateClock;
  /** Read from TOTP_SECRET_KEY when not given, so a server can't be built without one (#254). */
  totpSecretKey?: TotpSecretKey;
  /** The one socket `CF-Connecting-IP` is believed from (TUNNEL_PROXY_ADDRESS). None when not given, as in development (#332). */
  tunnelProxyAddress?: string | null;
  /** Where Read it to me's voices were downloaded to (VOICE_MODELS_DIRECTORY), ADR 0062. */
  voiceModelsDirectory?: string;
  /** Development only: fetches a voice file the folder hasn't got when a device asks for it (ADR 0067). */
  streamMissingVoiceFile?: StreamVoiceFile;
}

export const buildHttpServer = async ({
  database,
  clientDirectory,
  sendEmail,
  publicUrl,
  isSecondSchoolGateMet,
  emailBatching = defaultEmailBatching,
  requestRatePolicy = loadRequestRatePolicy(),
  requestRateClock = Date.now,
  totpSecretKey = loadTotpSecretKey(),
  tunnelProxyAddress = null,
  voiceModelsDirectory,
  streamMissingVoiceFile,
}: HttpServerParts): Promise<FastifyInstance> => {
  const requestRateLimits = buildRequestRateLimits(
    requestRatePolicy,
    requestRateClock,
  );
  const server = Fastify({
    ...buildServerLogging(),
    ajv: {
      customOptions: { removeAdditional: false },
      onCreate: narrowDateFormats,
    },
    // Each route reads a few kilobytes at most; the CSV uploads and a Family Device's upload say otherwise (#312).
    bodyLimit: smallBodyLimit,
  });
  // Before any hook reads a caller's address: the Audit Log and the request-rate limits both ask it of the server (#332).
  server.decorate("tunnelProxyAddress", tunnelProxyAddress);
  // Before any plugin or route, so every context inherits it (#310).
  answerUnexpectedErrorsPlainly(server);
  // Before the refusals, so they carry the headers too (#311).
  sendSecurityHeaders(server);
  // First, so another page's request is refused before any route's reach check or body parsing (#247).
  refuseOtherPageRequests(server, publicUrl);
  // Then a body too big for its route, before the reach check looks the caller up (#312).
  refuseOversizedBodies(server);
  requireDeclaredRouteReach(server, database);
  limitRoutesPerIpAddress(server, requestRateLimits);

  const pools = listPools(database);
  for (const pool of pools) {
    pool.on("error", (error) => {
      server.log.error({ err: error }, "server.database.idle-client-failed");
    });
  }
  server.addHook("onClose", async () => {
    await Promise.all(pools.map((pool) => pool.end()));
  });

  registerNulByteRefusal(server);
  registerNonFiniteNumberRefusal(server);
  await server.register(fastifyCookie);
  await server.register(fastifyStatic, {
    root: clientDirectory,
    redirect: true,
  });

  server.get(
    "/health",
    {
      config: {
        reach: "none",
        noReachReason:
          "Compose's health check reads it with no credential, and it answers nothing but its status",
      },
    },
    async () => {
      await database.execute(sql`select 1`);
      return { status: "ok" };
    },
  );

  registerVoiceRoutes(server, voiceModelsDirectory, {
    streamMissingFile: streamMissingVoiceFile,
  });

  await registerSignInRoutes(server, {
    database,
    sendEmail,
    requestRateLimits,
    totpSecretKey,
  });
  registerEmailAddressCheckRoutes(server, {
    database,
    sendEmail,
    publicUrl,
    totpSecretKey,
  });
  registerPasswordChangeRoutes(server, { database, sendEmail });
  registerPasswordResetRoutes(server, {
    database,
    sendEmail,
    publicUrl,
    requestRateLimits,
  });
  registerSignInMethodsRoutes(server, database);
  registerOtherSignInsRoutes(server, database);
  registerPasskeyRoutes(server, {
    database,
    sendEmail,
    publicUrl,
    clock: requestRateClock,
  });
  registerPasskeyHandOffRoutes(server, { database, sendEmail, publicUrl });
  registerTwoFactorRoutes(server, { database, sendEmail, totpSecretKey });
  registerInviteRoutes(server, { database, sendEmail, publicUrl });

  server.get("/api/family", { config: { reach: "parent" } }, async (request) =>
    runAsSignedInParent(
      database,
      request,
      async ({ familyId, isAdmin }, reachDatabase) => {
        const signedInFamilies = await reachDatabase
          .select({ name: families.name })
          .from(families)
          .where(eq(families.id, familyId));
        const family = signedInFamilies.at(0);
        if (family === undefined) {
          throw new Error("the signed-in Parent's Family has no row");
        }
        return { ...family, isAdmin };
      },
    ),
  );

  registerSchoolRoutes(server, { database, isSecondSchoolGateMet });
  registerPeopleRoutes(server, { database, sendEmail, publicUrl });
  registerFamilyJoinRoutes(server, { database, sendEmail, publicUrl });
  registerChildrenRoutes(server, database);
  registerAwardRoutes(server, database);
  registerBulkRoutes(server, { database, sendEmail, publicUrl, emailBatching });
  registerFamilyDeviceRoutes(server, {
    database,
    sendEmail,
    publicUrl,
    requestRateLimits,
    totpSecretKey,
  });
  registerPlayEventRoutes(server, database);
  registerClassmateRoomRoutes(server, database);
  registerFamilyDataRoutes(server, database);
  registerAdminRoutes(server, database);
  registerAuditLogRoutes(server, database);

  return server;
};
