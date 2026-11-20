import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import { describe, expect, it } from "vitest";
import { findSchoolYear } from "../../curriculum/year-groups.js";
import { isPasswordLongEnough } from "../auth/password.js";
import { familyDeviceLifetimeDays } from "../family-devices/signed-in-family-device.js";
import { findInviteStatus, inviteStatuses } from "../people/invites.js";
import { playEventTypes, userRoles } from "../schema.js";
import { buildPenTestFixtureCredentials } from "./fixture-credentials.js";
import {
  buildPenTestFixturePlan,
  penTestFixtureEmailDomain,
  penTestFixtureIds,
  type PenTestFixturePlan,
} from "./fixture-plan.js";

const ids = penTestFixtureIds;
const roundMoment = new Date("2026-11-17T10:30:00.000Z");
const plan = buildPenTestFixturePlan(roundMoment);
const seed = "0123456789abcdef".repeat(4);
const otherSeed = "fedcba9876543210".repeat(4);
const credentials = buildPenTestFixtureCredentials(plan, seed);

const fixtureIdShape = /^e2000000-0000-4000-8000-[0-9a-f]{2}[0-9]{10}$/;
const recoveryCodeShape = /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/;

const findSchoolYearOf = (
  fixturePlan: PenTestFixturePlan,
  childId: string,
): number => {
  const child = fixturePlan.children.find(({ id }) => id === childId);
  if (child === undefined) {
    throw new Error(`the plan has no Child ${childId}`);
  }
  return findSchoolYear(child, fixturePlan.day);
};

const listClass = (schoolId: string, schoolYear: number) =>
  plan.children.filter(
    (child) =>
      child.schoolId === schoolId &&
      findSchoolYear(child, plan.day) === schoolYear,
  );

const findAdult = (userId: string) => {
  const adult = plan.adults.find(({ id }) => id === userId);
  if (adult === undefined) {
    throw new Error(`the plan has no adult ${userId}`);
  }
  return adult;
};

const listInviteStatuses = (moment: Date) =>
  plan.adults.map((adult) => {
    const unacceptedExpiries = plan.invites
      .filter(
        ({ userId, acceptedAt }) => userId === adult.id && acceptedAt === null,
      )
      .map(({ expiresAt }) => expiresAt.getTime());
    const hasAcceptedInvite = plan.invites.some(
      ({ userId, acceptedAt }) => userId === adult.id && acceptedAt !== null,
    );
    return findInviteStatus(
      {
        hasLogin: adult.hasPassword || adult.hasPasskey || hasAcceptedInvite,
        latestInvite:
          unacceptedExpiries.length === 0
            ? null
            : {
                expiresAt: new Date(Math.max(...unacceptedExpiries)),
                isEmailFailed: false,
              },
      },
      moment,
    );
  });

const listEveryFixtureId = (fixturePlan: PenTestFixturePlan): string[] => [
  ...fixturePlan.schools.map(({ id }) => id),
  ...fixturePlan.adults.map(({ id }) => id),
  ...fixturePlan.families.map(({ id }) => id),
  ...fixturePlan.children.map(({ id }) => id),
  ...fixturePlan.familyDevices.map(({ id }) => id),
  ...fixturePlan.invites.map(({ id }) => id),
  ...fixturePlan.deletionRequests.map(({ id }) => id),
  ...fixturePlan.playEvents.map(({ id }) => id),
];

describe("buildPenTestFixturePlan", () => {
  it("seeds every role an adult can hold", () => {
    const seededRoles = new Set(plan.adults.flatMap(({ roles }) => roles));

    expect([...seededRoles].sort()).toEqual([...userRoles].sort());
  });

  it("records every kind of play event for every Child, on a Family Device that isn't revoked", () => {
    const activeFamilyDeviceIds = plan.familyDevices
      .filter(({ revokedAt }) => revokedAt === null)
      .map(({ id }) => id);

    for (const child of plan.children) {
      const recordedKinds = new Set(
        plan.playEvents
          .filter(
            ({ childId, familyDeviceId }) =>
              childId === child.id &&
              activeFamilyDeviceIds.includes(familyDeviceId),
          )
          .map(({ type }) => type),
      );

      expect([...recordedKinds].sort()).toEqual([...playEventTypes].sort());
    }
  });

  // The passkey-only Parent was the fixtures' "not sent" adult until #249, which shows any adult with a login as accepted.
  // An Invite whose email failed comes only from a bulk upload's email going wrong (#293), which the fixtures don't load.
  it("leaves an adult in every Invite state staff can see but not sent or failed, all through the day it is built for", () => {
    const endOfDay = new Date(plan.day.getTime() + 24 * 60 * 60 * 1000 - 1);

    for (const moment of [plan.day, roundMoment, endOfDay]) {
      expect([...new Set(listInviteStatuses(moment))].sort()).toEqual(
        inviteStatuses
          .filter(
            (status) => status !== "not-sent" && status !== "email-failed",
          )
          .sort(),
      );
    }
  });

  it("names the adult in each state of Invite after it", () => {
    const statusesByAdult = new Map(
      plan.adults.map(({ id }, index) => [
        id,
        listInviteStatuses(roundMoment)[index],
      ]),
    );

    expect(statusesByAdult.get(ids.coParentA2Invited)).toBe("pending");
    expect(statusesByAdult.get(ids.coParentBInviteExpired)).toBe("expired");
    expect(statusesByAdult.get(ids.parentA1)).toBe("accepted");
    expect(statusesByAdult.get(ids.parentA2PasskeyOnly)).toBe("accepted");
  });

  it("puts two Families in one class at School A and the third Family at School B", () => {
    const classAYear3Families = new Set(
      listClass(ids.schoolA, 3).map(({ familyId }) => familyId),
    );
    const schoolBFamilies = new Set(
      plan.children
        .filter(({ schoolId }) => schoolId === ids.schoolB)
        .map(({ familyId }) => familyId),
    );

    expect(plan.schools.map(({ id }) => id)).toEqual([
      ids.schoolA,
      ids.schoolB,
    ]);
    expect(plan.families).toHaveLength(3);
    expect([...classAYear3Families]).toEqual([ids.familyA1, ids.familyA2]);
    expect([...schoolBFamilies]).toEqual([ids.familyB]);
  });

  it("gives every Family two Parents", () => {
    for (const family of plan.families) {
      expect(family.parentIds).toHaveLength(2);
      for (const parentId of family.parentIds) {
        expect(findAdult(parentId).roles).toEqual(["parent"]);
      }
    }
  });

  it("has a Parent who signs in with a passkey alone", () => {
    const parentA2 = findAdult(ids.parentA2PasskeyOnly);

    expect(parentA2).toMatchObject({
      hasPassword: false,
      hasTotp: false,
      hasPasskey: true,
    });
  });

  it("has staff with TOTP and without, Teachers on different Year Groups, and one Teacher deactivated", () => {
    const staff = plan.adults.filter(({ roles }) =>
      roles.some((role) => role !== "parent"),
    );
    const teacherYearGroups = plan.teachers.map(({ yearGroups }) =>
      yearGroups.join(","),
    );
    const deactivated = plan.adults.filter(
      ({ deactivatedAt }) => deactivatedAt !== null,
    );

    expect(staff.some(({ hasTotp }) => hasTotp)).toBe(true);
    expect(staff.some(({ hasTotp }) => !hasTotp)).toBe(true);
    expect(new Set(teacherYearGroups).size).toBeGreaterThan(1);
    expect(deactivated.map(({ id }) => id)).toEqual([ids.teacherADeactivated]);
    expect(
      plan.teachers.some(({ userId }) => userId === ids.teacherADeactivated),
    ).toBe(true);
  });

  it.each([
    new Date("2026-11-17T10:30:00.000Z"),
    new Date("2027-08-31T22:59:00.000Z"),
    new Date("2027-08-31T23:30:00.000Z"),
    new Date("2027-09-01T12:00:00.000Z"),
    new Date("2031-02-14T08:00:00.000Z"),
  ])(
    "keeps every Child in their intended Year, and every Teacher's Year Groups full, on %s",
    (moment) => {
      const datedPlan = buildPenTestFixturePlan(moment);

      expect(
        [
          ids.childA1Year3,
          ids.childA1Year5,
          ids.childA2Year3,
          ids.childA2Year3Twin,
          ids.childBYear3,
        ].map((childId) => findSchoolYearOf(datedPlan, childId)),
      ).toEqual([3, 5, 3, 3, 3]);
      for (const { schoolId, yearGroups } of datedPlan.teachers) {
        const taughtChildren = datedPlan.children.filter(
          (child) =>
            child.schoolId === schoolId &&
            yearGroups.some(
              (yearGroup) => findSchoolYear(child, datedPlan.day) === yearGroup,
            ),
        );
        expect(taughtChildren.length).toBeGreaterThan(0);
      }
    },
  );

  it("has a revoked Family Device that recorded play before it was revoked", () => {
    const revoked = plan.familyDevices.find(
      ({ id }) => id === ids.familyDeviceA1Revoked,
    );
    const revokedDevicePlay = plan.playEvents.filter(
      ({ familyDeviceId }) => familyDeviceId === ids.familyDeviceA1Revoked,
    );

    expect(revoked?.revokedAt).not.toBeNull();
    expect(revokedDevicePlay.length).toBeGreaterThan(0);
    for (const { happenedAt } of revokedDevicePlay) {
      expect(happenedAt.getTime()).toBeLessThan(
        revoked?.revokedAt?.getTime() ?? 0,
      );
    }
  });

  it("gives every Family Device a last contact after its creation and its last play, no later than its revocation or loading, and within the 400 days it lasts", () => {
    for (const familyDevice of plan.familyDevices) {
      const lastPlayedAt = Math.max(
        ...plan.playEvents
          .filter(({ familyDeviceId }) => familyDeviceId === familyDevice.id)
          .map(({ happenedAt }) => happenedAt.getTime()),
      );

      expect(familyDevice.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
        familyDevice.createdAt.getTime(),
      );
      expect(familyDevice.lastSeenAt.getTime()).toBeLessThanOrEqual(
        familyDevice.revokedAt?.getTime() ?? plan.day.getTime(),
      );
      expect(familyDevice.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
        lastPlayedAt,
      );
      expect(
        plan.day.getTime() - familyDevice.lastSeenAt.getTime(),
      ).toBeLessThan(familyDeviceLifetimeDays * 86_400_000);
    }
  });

  it("has a Family with a pending deletion request made by one of its Parents", () => {
    const familyB = plan.families.find(({ id }) => id === ids.familyB);

    expect(plan.deletionRequests).toEqual([
      expect.objectContaining({ familyId: ids.familyB, childId: null }),
    ]);
    expect(familyB?.parentIds).toContain(
      plan.deletionRequests[0].requestedByUserId,
    );
  });

  it("has classmates who have opted in and one who hasn't, at a School that approves visits, and a Child opted in at a School that doesn't", () => {
    const schoolA = plan.schools.find(({ id }) => id === ids.schoolA);
    const schoolB = plan.schools.find(({ id }) => id === ids.schoolB);
    const classAYear3 = listClass(ids.schoolA, 3);

    expect(schoolA?.classmateVisitsApproved).toBe(true);
    expect(schoolB?.classmateVisitsApproved).toBe(false);
    expect(
      classAYear3
        .filter(({ classmateVisitsAllowed }) => classmateVisitsAllowed)
        .map(({ id }) => id),
    ).toEqual([ids.childA1Year3, ids.childA2Year3]);
    expect(
      classAYear3
        .filter(({ classmateVisitsAllowed }) => !classmateVisitsAllowed)
        .map(({ id }) => id),
    ).toEqual([ids.childA2Year3Twin]);
    expect(
      plan.children.find(({ id }) => id === ids.childBYear3)
        ?.classmateVisitsAllowed,
    ).toBe(true);
  });

  it("is the same plan at every moment of one day", () => {
    expect(
      buildPenTestFixturePlan(new Date("2026-11-17T00:00:00.000Z")),
    ).toEqual(buildPenTestFixturePlan(new Date("2026-11-17T23:59:59.999Z")));
  });

  it("gives every fixture its own fixed id", () => {
    const everyId = listEveryFixtureId(plan);

    expect(new Set(everyId).size).toBe(everyId.length);
    for (const id of everyId) {
      expect(id).toMatch(fixtureIdShape);
    }
    expect(
      listEveryFixtureId(
        buildPenTestFixturePlan(new Date("2030-03-03T03:03:03.000Z")),
      ),
    ).toEqual(everyId);
  });

  it("uses only synthetic email addresses, at a domain reserved for examples", () => {
    for (const { email } of plan.adults) {
      expect(email.endsWith(`@${penTestFixtureEmailDomain}`)).toBe(true);
    }
    for (const { emailedTo } of plan.invites) {
      expect(
        emailedTo === null ||
          emailedTo.endsWith(`@${penTestFixtureEmailDomain}`),
      ).toBe(true);
    }
  });

  it("names every fixture identity in docs/pen-test/fixtures.md", async () => {
    const fixturesPage = await readFile(
      new URL("../../../docs/pen-test/fixtures.md", import.meta.url),
      "utf8",
    );

    for (const [handle, id] of Object.entries(penTestFixtureIds)) {
      expect(fixturesPage).toContain(`\`${handle}\``);
      expect(fixturesPage).toContain(id);
    }
  });
});

describe("buildPenTestFixtureCredentials", () => {
  it("derives the same credentials from the same seed, and different ones from another", () => {
    const again = buildPenTestFixtureCredentials(
      buildPenTestFixturePlan(new Date("2026-11-17T23:00:00.000Z")),
      seed,
    );
    const other = buildPenTestFixtureCredentials(plan, otherSeed);

    expect(again).toEqual(credentials);
    expect(other.passwords.get(ids.admin)).not.toBe(
      credentials.passwords.get(ids.admin),
    );
    expect(other.familyDeviceTokens.get(ids.familyDeviceA1)).not.toBe(
      credentials.familyDeviceTokens.get(ids.familyDeviceA1),
    );
  });

  it("gives each adult only the credentials their sign-in methods call for", () => {
    const adultsWith = (
      signInMethod: "hasPassword" | "hasTotp" | "hasPasskey",
    ) => plan.adults.filter((adult) => adult[signInMethod]).map(({ id }) => id);

    expect([...credentials.passwords.keys()]).toEqual(
      adultsWith("hasPassword"),
    );
    expect([...credentials.totpSecrets.keys()]).toEqual(adultsWith("hasTotp"));
    expect([...credentials.recoveryCodes.keys()]).toEqual(
      adultsWith("hasTotp"),
    );
    expect([...credentials.passkeys.keys()]).toEqual(adultsWith("hasPasskey"));
    expect(credentials.passwords.has(ids.parentA2PasskeyOnly)).toBe(false);
    expect(credentials.passwords.has(ids.coParentA2Invited)).toBe(false);
  });

  it("derives passwords long enough to sign in with, and a different one for each adult", () => {
    const passwords = [...credentials.passwords.values()];

    expect(new Set(passwords).size).toBe(passwords.length);
    for (const password of passwords) {
      expect(isPasswordLongEnough(password)).toBe(true);
    }
  });

  it("derives TOTP secrets and recovery codes in the shapes Wizzaroo issues", () => {
    for (const totpSecret of credentials.totpSecrets.values()) {
      expect(totpSecret).toMatch(/^[0-9a-f]{40}$/);
    }
    for (const codes of credentials.recoveryCodes.values()) {
      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10);
      for (const code of codes) {
        expect(code).toMatch(recoveryCodeShape);
      }
    }
  });

  it("derives a passkey whose stored public key verifies what the tester's private key signs", () => {
    for (const passkey of credentials.passkeys.values()) {
      const coseKey = isoCBOR.decodeFirst<Map<number, unknown>>(
        isoBase64URL.toBuffer(passkey.publicKey),
      );
      const coordinate = (label: number): string => {
        const value = coseKey.get(label);
        if (!(value instanceof Uint8Array)) {
          throw new Error("the COSE key has no coordinate there");
        }
        return Buffer.from(value).toString("base64url");
      };
      const publicKey = createPublicKey({
        key: { kty: "EC", crv: "P-256", x: coordinate(-2), y: coordinate(-3) },
        format: "jwk",
      });
      const privateKey = createPrivateKey({
        key: passkey.privateKeyJwk,
        format: "jwk",
      });
      const signed = Buffer.from("a pen-test challenge");

      expect(coseKey.get(3)).toBe(-7);
      expect(
        verify("sha256", signed, publicKey, sign("sha256", signed, privateKey)),
      ).toBe(true);
    }
  });

  it("derives a Picture Password of three pictures for every Child, and a token for every Family Device and Invite", () => {
    expect([...credentials.picturePasswords.keys()]).toEqual(
      plan.children.map(({ id }) => id),
    );
    for (const picturePassword of credentials.picturePasswords.values()) {
      expect(picturePassword).toHaveLength(3);
    }
    expect([...credentials.familyDeviceTokens.keys()]).toEqual(
      plan.familyDevices.map(({ id }) => id),
    );
    expect([...credentials.inviteTokens.keys()]).toEqual(
      plan.invites.map(({ id }) => id),
    );
  });

  it("keeps every secret out of the plan, which is committed", () => {
    const committed = JSON.stringify(plan);
    const secrets = [
      seed,
      ...credentials.passwords.values(),
      ...credentials.totpSecrets.values(),
      ...[...credentials.recoveryCodes.values()].flat(),
      ...[...credentials.passkeys.values()].map(
        ({ privateKeyJwk }) => privateKeyJwk.d ?? "",
      ),
      ...credentials.familyDeviceTokens.values(),
      ...credentials.inviteTokens.values(),
    ];

    for (const secret of secrets) {
      expect(secret).not.toBe("");
      expect(committed).not.toContain(secret);
    }
  });
});
