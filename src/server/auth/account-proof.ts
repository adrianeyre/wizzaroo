import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import type { ReachDatabase } from "../reach.js";
import { totpSecrets, users, type UserRole } from "../schema.js";
import {
  passkeyAssertionSchema,
  verifyOwnPasskeyAssertion,
  type RelyingParty,
} from "./passkey-routes.js";
import {
  isCurrentPasswordRight,
  WrongCurrentPasswordError,
} from "./password-change-routes.js";
import type { TotpSecretKey } from "./totp-secret-box.js";
import {
  redeemTwoFactorCode,
  WrongTwoFactorCodeError,
} from "./two-factor-routes.js";

export class AccountProofRequiredError extends Error {
  override readonly name = "AccountProofRequiredError";
  readonly statusCode = 403;
  readonly code = "account-proof-required";

  constructor() {
    super(
      "Prove it's you first: enter your password or a code from your authenticator app, or use a passkey",
    );
  }
}

export class SecondFactorProofRequiredError extends Error {
  override readonly name = "SecondFactorProofRequiredError";
  readonly statusCode = 403;
  readonly code = "second-factor-proof-required";

  constructor() {
    super(
      "Teachers and the Admin prove it's them with a passkey or a code from their authenticator app, not a password alone",
    );
  }
}

/** The proof an adult gives with a change that moves their account, such as a new email address. */
export interface AccountProofBody {
  currentPassword?: string;
  code?: string;
  passkey?: AuthenticationResponseJSON;
}

export type AccountProof =
  | { kind: "password"; currentPassword: string }
  | { kind: "code"; code: string }
  | { kind: "passkey"; response: AuthenticationResponseJSON };

/** For a route's body schema: each way to prove it's them, of which the route takes exactly one. */
export const accountProofSchemaProperties = {
  currentPassword: { type: "string", minLength: 1 },
  code: { type: "string", minLength: 1, maxLength: 40 },
  passkey: passkeyAssertionSchema,
} as const;

/** Teachers and the Admin see many Families' Children, so their password alone never proves it's them. */
export const isStaffRole = (roles: readonly UserRole[]): boolean =>
  roles.includes("admin") || roles.includes("teacher");

/** Reads the one proof a body gives, refusing none, more than one, or a staff password with no second factor. */
export const readAccountProof = (
  { currentPassword, code, passkey }: AccountProofBody,
  roles: readonly UserRole[],
): AccountProof => {
  const proofs: AccountProof[] = [
    ...(currentPassword === undefined
      ? []
      : [{ kind: "password", currentPassword } as const]),
    ...(code === undefined ? [] : [{ kind: "code", code } as const]),
    ...(passkey === undefined
      ? []
      : [{ kind: "passkey", response: passkey } as const]),
  ];
  const [proof] = proofs;
  if (proofs.length !== 1) {
    throw new AccountProofRequiredError();
  }
  if (proof.kind === "password" && isStaffRole(roles)) {
    throw new SecondFactorProofRequiredError();
  }
  return proof;
};

interface AccountProofCheck {
  userId: string;
  relyingParty: RelyingParty;
  /** Opens the adult's sealed TOTP secret to check a code (#254). */
  totpSecretKey: TotpSecretKey;
}

/**
 * Checks the proof against the signed-in adult's own account, inside their reach's transaction.
 * A two-factor code is spent once it's checked, as at sign-in, so a code that signed in can't prove it again.
 */
export const checkAccountProof = async (
  reachDatabase: ReachDatabase,
  proof: AccountProof,
  { userId, relyingParty, totpSecretKey }: AccountProofCheck,
): Promise<void> => {
  if (proof.kind === "passkey") {
    await verifyOwnPasskeyAssertion(
      reachDatabase,
      userId,
      proof.response,
      relyingParty,
    );
    return;
  }

  const [user] = await reachDatabase
    .select({
      passwordHash: users.passwordHash,
      totpSecret: totpSecrets.secret,
    })
    .from(users)
    .leftJoin(totpSecrets, eq(totpSecrets.userId, users.id))
    .where(eq(users.id, userId));
  if (proof.kind === "password") {
    if (
      !(await isCurrentPasswordRight(user.passwordHash, proof.currentPassword))
    ) {
      throw new WrongCurrentPasswordError();
    }
    return;
  }
  const isCodeRedeemed =
    user.totpSecret !== null &&
    (await redeemTwoFactorCode(reachDatabase, {
      userId,
      sealedTotpSecret: user.totpSecret,
      totpSecretKey,
      code: proof.code,
    }));
  if (!isCodeRedeemed) {
    throw new WrongTwoFactorCodeError();
  }
};
