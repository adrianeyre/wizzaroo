import { and, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { findClientIpAddress } from "../audit/audit-log.js";
import { hashSecretToken } from "../auth/secret-token.js";
import { signInCookieOptions } from "../auth/sign-in-routes.js";
import type { Database } from "../database.js";
import { runWithinReach, type ReachDatabase } from "../reach.js";
import { assertRouteDeclaresReach } from "../route-reach.js";
import { familyDevices } from "../schema.js";

export const familyDeviceCookieName = "wizzaroo_family_device";

// How long a Family Device's credential lasts after its last contact: the
// cookie's Max-Age, and the limit the server holds every token to, whatever the
// browser presenting it was told (#301).
export const familyDeviceLifetimeDays = 400;
const secondsPerDay = 86_400;

// A Family Device that has been in contact within its lifetime, and that no
// Parent has signed out.
export const isFamilyDeviceSignedIn = (): SQL | undefined =>
  and(
    isNull(familyDevices.revokedAt),
    gt(
      familyDevices.lastSeenAt,
      sql`now() - make_interval(days => ${familyDeviceLifetimeDays})`,
    ),
  );

export class NotAFamilyDeviceError extends Error {
  override readonly name = "NotAFamilyDeviceError";
  readonly statusCode = 401;

  constructor() {
    super("This browser isn't a Family Device, or it has been signed out");
  }
}

export interface SignedInFamilyDevice {
  familyDeviceId: string;
  familyId: string;
  token: string;
}

export const setFamilyDeviceCookie = (
  reply: FastifyReply,
  token: string,
): void => {
  reply.setCookie(familyDeviceCookieName, token, {
    ...signInCookieOptions,
    path: "/api/play",
    maxAge: familyDeviceLifetimeDays * secondsPerDay,
  });
};

// A device's last contact is moved on at most once a minute from the same
// address, so a device isn't written on every request (#302), as a sign-in
// isn't (#244). A new address is recorded at once.
export const familyDeviceContactRefreshSeconds = 60;

// Finds the device a token belongs to, so a token whose device was signed out
// or hasn't been in contact for its lifetime finds nothing and stays refused,
// and whether this request's contact is already on record.
export const buildFamilyDeviceLookup = (
  database: Pick<Database, "select">,
  token: string,
  ipAddress: string | null,
) =>
  database
    .select({
      familyDeviceId: familyDevices.id,
      familyId: familyDevices.familyId,
      isContactRecorded: sql<boolean>`(${familyDevices.lastSeenAt} > now() - make_interval(secs => ${familyDeviceContactRefreshSeconds}) and ${familyDevices.lastSeenFrom} is not distinct from ${ipAddress}::inet)`,
    })
    .from(familyDevices)
    .where(
      and(
        eq(familyDevices.tokenHash, hashSecretToken(token)),
        isFamilyDeviceSignedIn(),
      ),
    );

// Records this request as the device's last contact, when and from where, as
// the database owner: a device's own reach can't change its row (#276).
export const buildFamilyDeviceContact = (
  database: Pick<Database, "update">,
  familyDeviceId: string,
  ipAddress: string | null,
) =>
  database
    .update(familyDevices)
    .set({ lastSeenAt: sql`now()`, lastSeenFrom: ipAddress })
    .where(and(eq(familyDevices.id, familyDeviceId), isFamilyDeviceSignedIn()));

export const loadSignedInFamilyDevice = async (
  database: Database,
  request: FastifyRequest,
): Promise<SignedInFamilyDevice> => {
  const token = request.cookies[familyDeviceCookieName];
  if (token === undefined) {
    throw new NotAFamilyDeviceError();
  }

  const ipAddress = findClientIpAddress(request) ?? null;
  const signedInFamilyDevice = (
    await buildFamilyDeviceLookup(database, token, ipAddress)
  ).at(0);
  if (signedInFamilyDevice === undefined) {
    throw new NotAFamilyDeviceError();
  }
  const { familyDeviceId, familyId, isContactRecorded } = signedInFamilyDevice;
  if (!isContactRecorded) {
    await buildFamilyDeviceContact(database, familyDeviceId, ipAddress);
  }
  return { familyDeviceId, familyId, token };
};

const checkedFamilyDevices = new WeakMap<
  FastifyRequest,
  SignedInFamilyDevice
>();

/** The onRequest check of a route that declares the reach "family-device", before anything reads the request. */
export const checkSignedInFamilyDeviceReach = async (
  database: Database,
  request: FastifyRequest,
): Promise<void> => {
  checkedFamilyDevices.set(
    request,
    await loadSignedInFamilyDevice(database, request),
  );
};

export const runAsSignedInFamilyDevice = async <Result>(
  database: Database,
  request: FastifyRequest,
  work: (
    signedInFamilyDevice: SignedInFamilyDevice,
    reachDatabase: ReachDatabase,
  ) => Promise<Result>,
): Promise<Result> => {
  assertRouteDeclaresReach(request, "family-device");
  const signedInFamilyDevice =
    checkedFamilyDevices.get(request) ??
    (await loadSignedInFamilyDevice(database, request));
  checkedFamilyDevices.delete(request);
  return runWithinReach(
    database,
    { userId: null, familyId: signedInFamilyDevice.familyId, isAdmin: false },
    (reachDatabase) => work(signedInFamilyDevice, reachDatabase),
  );
};
