import { isEmailAddress, normaliseEmail } from "../auth/email-address.js";
import {
  isPasswordLongEnough,
  shortestPasswordLength,
} from "../auth/password.js";

export class OwnerSeedRefusedError extends Error {
  override name = "OwnerSeedRefusedError";
}

export interface OwnerAnswers {
  email: string;
  password: string;
  repeatedPassword: string;
  familyName: string;
}

export interface OwnerSeed {
  email: string;
  password: string;
  familyName: string;
}

export const buildOwnerSeed = ({
  email,
  password,
  repeatedPassword,
  familyName,
}: OwnerAnswers): OwnerSeed => {
  const ownerEmail = normaliseEmail(email);
  const ownerFamilyName = familyName.trim();

  if (!isEmailAddress(ownerEmail)) {
    throw new OwnerSeedRefusedError(
      `"${ownerEmail}" isn't an email address, so nothing was created`,
    );
  }
  if (!isPasswordLongEnough(password)) {
    throw new OwnerSeedRefusedError(
      `The password needs at least ${String(shortestPasswordLength)} characters, so nothing was created`,
    );
  }
  if (password !== repeatedPassword) {
    throw new OwnerSeedRefusedError(
      "The two passwords don't match, so nothing was created",
    );
  }
  if (ownerFamilyName === "") {
    throw new OwnerSeedRefusedError(
      "The Family needs a name, so nothing was created",
    );
  }

  return { email: ownerEmail, password, familyName: ownerFamilyName };
};
