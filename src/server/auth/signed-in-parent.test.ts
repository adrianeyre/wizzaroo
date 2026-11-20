import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";
import {
  findSecondFactorAddingRefusal,
  mayAddSecondFactor,
  SecondFactorProofRequiredError,
  secondFactorSetupDays,
  SecondFactorSetupClosedError,
  selectAccountSecondFactors,
} from "./signed-in-parent.js";

describe("mayAddSecondFactor", () => {
  it("lets a Teacher or the Admin with no second factor yet set one up from a password-only sign-in, as documented", () => {
    expect(
      mayAddSecondFactor({ roles: ["teacher"], isTwoStep: false }, 0),
    ).toBe(true);
    expect(
      mayAddSecondFactor({ roles: ["admin", "parent"], isTwoStep: false }, 0),
    ).toBe(true);
  });

  it("refuses a Teacher's or the Admin's password-only sign-in a new second factor while the account has one it hasn't proved", () => {
    expect(
      mayAddSecondFactor({ roles: ["teacher"], isTwoStep: false }, 1),
    ).toBe(false);
    expect(
      mayAddSecondFactor({ roles: ["admin", "parent"], isTwoStep: false }, 2),
    ).toBe(false);
  });

  it("lets a sign-in that proved a second factor add another", () => {
    expect(mayAddSecondFactor({ roles: ["teacher"], isTwoStep: true }, 1)).toBe(
      true,
    );
    expect(mayAddSecondFactor({ roles: ["admin"], isTwoStep: true }, 3)).toBe(
      true,
    );
  });

  it("leaves a Parent free to add a passkey or TOTP from their password, since Parents need neither", () => {
    expect(mayAddSecondFactor({ roles: ["parent"], isTwoStep: false }, 1)).toBe(
      true,
    );
  });
});

describe("SecondFactorProofRequiredError", () => {
  it("answers 403 second-factor-required, as every staff route refuses a sign-in with no second factor", () => {
    const error = new SecondFactorProofRequiredError();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("second-factor-required");
    expect(error.message).toContain("Use it to confirm this sign-in");
  });
});

describe("selectAccountSecondFactors", () => {
  const userId = "e2000000-0000-4000-8000-ad0000000003";

  it("counts the account's own passkeys and its TOTP, naming each column with its table so Postgres reads the account's rows", () => {
    const queries = selectAccountSecondFactors(drizzle.mock(), userId);

    expect(queries.passkeys.toSQL()).toEqual({
      sql: 'select count(*) from "passkeys" where "passkeys"."user_id" = $1',
      params: [userId],
    });
    expect(queries.totp.toSQL()).toEqual({
      sql: 'select count(*) from "totp_secrets" where "totp_secrets"."user_id" = $1',
      params: [userId],
    });
  });
});

describe("findSecondFactorAddingRefusal", () => {
  const passwordOnlyTeacher = { roles: ["teacher" as const], isTwoStep: false };

  it("lets a Teacher with no second factor set one up from a password alone while their first setup is open, as documented for a new Teacher", () => {
    expect(
      findSecondFactorAddingRefusal(passwordOnlyTeacher, {
        count: 0,
        isFirstSetupOpen: true,
      }),
    ).toBeUndefined();
  });

  it("refuses a Teacher's or the Admin's password alone their first second factor once the setup has closed, so a password or a mailbox no longer leads to staff reach", () => {
    expect(
      findSecondFactorAddingRefusal(passwordOnlyTeacher, {
        count: 0,
        isFirstSetupOpen: false,
      }),
    ).toBeInstanceOf(SecondFactorSetupClosedError);
    expect(
      findSecondFactorAddingRefusal(
        { roles: ["admin", "parent"], isTwoStep: false },
        { count: 0, isFirstSetupOpen: false },
      ),
    ).toBeInstanceOf(SecondFactorSetupClosedError);
  });

  it("asks a staff sign-in to prove the second factor the account has, whether or not the first setup is open", () => {
    for (const isFirstSetupOpen of [true, false]) {
      expect(
        findSecondFactorAddingRefusal(passwordOnlyTeacher, {
          count: 1,
          isFirstSetupOpen,
        }),
      ).toBeInstanceOf(SecondFactorProofRequiredError);
    }
  });

  it("lets a sign-in that proved a second factor, and a Parent, add one whenever they like", () => {
    expect(
      findSecondFactorAddingRefusal(
        { roles: ["teacher"], isTwoStep: true },
        { count: 1, isFirstSetupOpen: false },
      ),
    ).toBeUndefined();
    expect(
      findSecondFactorAddingRefusal(
        { roles: ["parent"], isTwoStep: false },
        { count: 0, isFirstSetupOpen: false },
      ),
    ).toBeUndefined();
  });
});

describe("SecondFactorSetupClosedError", () => {
  it("answers 403 with its own code, and tells the Teacher to ask the Admin for a reset link", () => {
    const error = new SecondFactorSetupClosedError();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("second-factor-setup-closed");
    expect(error.message).toContain(
      "Ask the Admin to send you a password reset link",
    );
    expect(error.message).toContain(`${String(secondFactorSetupDays)} days`);
  });
});
