import { and, eq, isNull, sql } from "drizzle-orm";
import { insertAuditLogEntries, type AuditActor } from "../audit/audit-log.js";
import type { Database } from "../database.js";
import { familyDevices } from "../schema.js";

/** Why an adult's Family Devices were signed out with their other sign-ins, as the Audit Log's detail says it. */
export type FamilyDevicesSignedOutWith = "password change" | "password reset";

/**
 * Signs out every Family Device the adult's sign-ins made, with the sign-ins a password change or reset ends (#303): a
 * device made from a copied or stolen sign-in goes when the Parent takes their account back. Each is logged as signed
 * out, and its last address is cleared as signing it out on the Parent page clears it.
 */
export const signOutFamilyDevicesMadeBy = async (
  database: Pick<Database, "update" | "insert">,
  userId: string,
  actor: AuditActor,
  signedOutWith: FamilyDevicesSignedOutWith,
): Promise<string[]> => {
  const signedOutDevices = await database
    .update(familyDevices)
    .set({ revokedAt: sql`now()`, lastSeenFrom: null })
    .where(
      and(
        eq(familyDevices.createdByUserId, userId),
        isNull(familyDevices.revokedAt),
      ),
    )
    .returning({ id: familyDevices.id });
  await insertAuditLogEntries(
    database,
    signedOutDevices.map(({ id }) => ({
      action: "family-device.revoked",
      actor,
      target: { type: "family-device", id },
      detail: `with a ${signedOutWith}`,
    })),
  );
  return signedOutDevices.map(({ id }) => id);
};
