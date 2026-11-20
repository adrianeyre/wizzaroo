import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { describe, expect, it } from "vitest";
import {
  AccountProofRequiredError,
  isStaffRole,
  readAccountProof,
  SecondFactorProofRequiredError,
} from "./account-proof.js";

const passkeyResponse: AuthenticationResponseJSON = {
  id: "AA",
  rawId: "AA",
  type: "public-key",
  response: { clientDataJSON: "AA", authenticatorData: "AA", signature: "AA" },
  clientExtensionResults: {},
};

describe("readAccountProof", () => {
  it.each([
    {
      body: { currentPassword: "a-long-enough-password" },
      proof: { kind: "password", currentPassword: "a-long-enough-password" },
    },
    { body: { code: "123456" }, proof: { kind: "code", code: "123456" } },
    {
      body: { passkey: passkeyResponse },
      proof: { kind: "passkey", response: passkeyResponse },
    },
  ])("reads a Parent's $proof.kind as their proof", ({ body, proof }) => {
    expect(readAccountProof(body, ["parent"])).toEqual(proof);
  });

  it.each([["teacher"], ["admin"], ["parent", "teacher"]] as const)(
    "reads a code or a passkey as the proof of an adult whose roles are %j",
    (...roles) => {
      expect(readAccountProof({ code: "123456" }, roles)).toEqual({
        kind: "code",
        code: "123456",
      });
      expect(readAccountProof({ passkey: passkeyResponse }, roles)).toEqual({
        kind: "passkey",
        response: passkeyResponse,
      });
    },
  );

  it.each([["teacher"], ["admin"], ["parent", "teacher"]] as const)(
    "refuses a password alone from an adult whose roles are %j, since staff always prove a second factor",
    (...roles) => {
      expect(() =>
        readAccountProof({ currentPassword: "a-staff-password" }, roles),
      ).toThrow(SecondFactorProofRequiredError);
    },
  );

  it("refuses a body that gives no proof at all", () => {
    expect(() => readAccountProof({}, ["parent"])).toThrow(
      AccountProofRequiredError,
    );
    expect(() => readAccountProof({}, ["teacher"])).toThrow(
      AccountProofRequiredError,
    );
  });

  it("refuses a body that gives more than one proof, so no check is skipped for another", () => {
    expect(() =>
      readAccountProof(
        { currentPassword: "a-long-enough-password", code: "123456" },
        ["parent"],
      ),
    ).toThrow(AccountProofRequiredError);
    expect(() =>
      readAccountProof({ code: "123456", passkey: passkeyResponse }, [
        "teacher",
      ]),
    ).toThrow(AccountProofRequiredError);
  });

  it("answers 403 with a code the browser can tell apart, for either refusal", () => {
    expect(new AccountProofRequiredError()).toMatchObject({
      statusCode: 403,
      code: "account-proof-required",
    });
    expect(new SecondFactorProofRequiredError()).toMatchObject({
      statusCode: 403,
      code: "second-factor-proof-required",
    });
  });
});

describe("isStaffRole", () => {
  it.each([
    { roles: ["parent"], isStaff: false },
    { roles: ["teacher"], isStaff: true },
    { roles: ["admin"], isStaff: true },
    { roles: ["parent", "admin"], isStaff: true },
  ] as const)("says $roles is staff: $isStaff", ({ roles, isStaff }) => {
    expect(isStaffRole(roles)).toBe(isStaff);
  });
});
