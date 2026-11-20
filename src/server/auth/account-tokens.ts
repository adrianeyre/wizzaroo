import { and, eq, ne } from "drizzle-orm";
import type { Database } from "../database.js";
import { emailAddressChecks, passwordResets, signIns } from "../schema.js";

type Deleter = Pick<Database, "delete">;

/**
 * Ends an adult's sign-ins, keeping the one that asked when there is one. Changing how an account is reached ends the
 * sign-ins made before it (#245).
 */
export const deleteOtherSignIns = async (
  database: Deleter,
  userId: string,
  keptSignInTokenHash?: string,
): Promise<void> => {
  await database
    .delete(signIns)
    .where(
      keptSignInTokenHash === undefined
        ? eq(signIns.userId, userId)
        : and(
            eq(signIns.userId, userId),
            ne(signIns.tokenHash, keptSignInTokenHash),
          ),
    );
};

/**
 * Cancels every reset link and email address check the adult has outstanding, so none outlives a change to their
 * password or email address (#252). Within a reach the policies let an adult delete only their own.
 */
export const deleteOutstandingAccountTokens = async (
  database: Deleter,
  userId: string,
): Promise<void> => {
  await database
    .delete(passwordResets)
    .where(eq(passwordResets.userId, userId));
  await database
    .delete(emailAddressChecks)
    .where(eq(emailAddressChecks.userId, userId));
};
