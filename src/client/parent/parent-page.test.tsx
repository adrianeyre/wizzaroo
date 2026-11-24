import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import {
  buildChildLimits,
  getParentChoices,
  isParentChoices,
  type ChildLimits,
} from "../../curriculum/island-access.js";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckAttempt } from "../../curriculum/checks.js";
import type { DailyPractice, SkillMastery } from "../../curriculum/mastery.js";
import {
  findSchoolYear,
  isYearGroupAdjustment,
} from "../../curriculum/year-groups.js";
import {
  secondFactorFirstMessage,
  secondFactorSetupClosedMessage,
} from "./account-changes.js";
import { meadowIsleQuest } from "../../curriculum/island-quests/meadow-isle.js";
import { idleSignOutMs } from "./idle-sign-out.js";
import { takeLinkToken } from "./link-token.js";
import { ParentPage } from "./parent-page.js";

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));

interface ApiRequest {
  method: string;
  path: string;
  body: unknown;
}

const ownerEmail = "owner@example.com";
const ownerPassword = "the-owner's-long-password";

const iPhoneUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const macUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";
const androidUserAgent =
  "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

interface FakeDevice {
  userAgent?: string;
  maxTouchPoints?: number;
  isShownStandalone?: boolean;
  isSafariHomeScreenApp?: boolean;
  isStoragePersistent?: boolean;
  grantsPersistentStorage?: boolean;
  clipboardTexts?: string[];
}

const stubDevice = ({
  userAgent = androidUserAgent,
  maxTouchPoints = 0,
  isShownStandalone = false,
  isSafariHomeScreenApp = false,
  isStoragePersistent = true,
  grantsPersistentStorage = false,
  clipboardTexts,
}: FakeDevice) => {
  const storage = { persistRequests: 0 };
  vi.stubGlobal("navigator", {
    userAgent,
    maxTouchPoints,
    ...(isSafariHomeScreenApp ? { standalone: true } : {}),
    ...(clipboardTexts === undefined
      ? {}
      : {
          clipboard: {
            writeText: (text: string) => {
              clipboardTexts.push(text);
              return Promise.resolve();
            },
          },
        }),
    storage: {
      persisted: () => Promise.resolve(isStoragePersistent),
      persist: () => {
        storage.persistRequests += 1;
        return Promise.resolve(grantsPersistentStorage);
      },
    },
  });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: isShownStandalone && query === "(display-mode: standalone)",
  }));
  return storage;
};

const homeScreenStep = "tap Add to Home Screen";

interface FakeChild {
  id: string;
  nickname: string;
  birthMonth: number | null;
  birthYear: number | null;
  yearGroupAdjustment: -1 | 0 | 1;
  schoolYear: number | null;
  yearGroup: number | null;
  schoolId: string;
  schoolName: string | null;
  characterName: string | null;
  phonicsProgrammeId: string | null;
  classmateVisitsAllowed: boolean;
  classmateVisitsApproved: boolean;
  timeSpentSeconds: number;
  mastery: SkillMastery[];
  dailyPractice: DailyPractice[];
  stars: number;
  limits: ChildLimits;
  checkHistory: CheckAttempt[];
}

const noLimits: ChildLimits = buildChildLimits({});

interface FakeChildAwards {
  childId: string;
  stars: number;
  starsGivenToday: number;
  familyChestActivityCount: number;
  questProgress: {
    islandId: string;
    pickedUpFindIds: string[];
    solvedPuzzleIds: string[];
  }[];
}

const fakeSchool = {
  id: "0b0f7b1e-5555-4555-8555-555555555555",
  name: "Hillside Primary",
  town: "Leeds",
};

/** A March birth that works out, today, as the given school year. */
const bornInYear = (schoolYear: number) => {
  const today = new Date();
  for (
    let birthYear = today.getFullYear() - 20;
    birthYear <= today.getFullYear();
    birthYear += 1
  ) {
    const birth = { birthMonth: 3, birthYear, yearGroupAdjustment: 0 } as const;
    if (findSchoolYear(birth, today) === schoolYear) {
      return birth;
    }
  }
  throw new Error(`no March birth works out as Year ${String(schoolYear)}`);
};

const inSchoolYear = (schoolYear: number) => ({
  ...bornInYear(schoolYear),
  schoolYear,
  yearGroup: Math.min(Math.max(schoolYear, 1), 6),
  schoolId: fakeSchool.id,
  schoolName: fakeSchool.name,
});

const bea: FakeChild = {
  id: "0b0f7b1e-1111-4111-8111-111111111111",
  nickname: "Bea",
  ...inSchoolYear(1),
  characterName: "Sparkle",
  phonicsProgrammeId: "little-wandle",
  classmateVisitsAllowed: false,
  classmateVisitsApproved: true,
  timeSpentSeconds: 0,
  mastery: [],
  dailyPractice: [],
  stars: 0,
  limits: noLimits,
  checkHistory: [],
};

const readFakeLimits = (
  body: unknown,
  { teacherLocks }: ChildLimits,
): FakeChild["limits"] => {
  if (!isParentChoices(body)) {
    throw new Error("the page sent something other than a Parent's limits");
  }
  return { ...body, teacherLocks };
};

const readFakeChildDetails = (body: unknown) => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("nickname" in body) ||
    typeof body.nickname !== "string" ||
    !("birthMonth" in body) ||
    typeof body.birthMonth !== "number" ||
    !("birthYear" in body) ||
    typeof body.birthYear !== "number" ||
    !("yearGroupAdjustment" in body) ||
    !isYearGroupAdjustment(body.yearGroupAdjustment) ||
    !("phonicsProgrammeId" in body) ||
    typeof body.phonicsProgrammeId !== "string"
  ) {
    throw new Error("the page sent a Child without all of their details");
  }
  const birth = {
    birthMonth: body.birthMonth,
    birthYear: body.birthYear,
    yearGroupAdjustment: body.yearGroupAdjustment,
  };
  const schoolYear = findSchoolYear(birth, new Date());
  return {
    nickname: body.nickname,
    ...birth,
    schoolYear,
    yearGroup: Math.min(Math.max(schoolYear, 1), 6),
    schoolId: fakeSchool.id,
    schoolName: fakeSchool.name,
    characterName:
      "characterName" in body && typeof body.characterName === "string"
        ? body.characterName
        : null,
    phonicsProgrammeId: body.phonicsProgrammeId,
  };
};

interface FakeEmailAddress {
  email: string;
  isConfirmed: boolean;
}

interface FakePasskey {
  id: string;
  name: string;
  createdAt: string;
}

interface FakeSignInMethods {
  hasPassword: boolean;
  passkeys: FakePasskey[];
  isTwoFactorOn: boolean;
  recoveryCodesLeft: number;
}

const rightTwoFactorCode = "123456";

const fakeRecoveryCodes = Array.from(
  { length: 10 },
  (_, index) => `recovery-code-${String(index + 1)}`,
);

const fakePasskeySignIn: AuthenticationResponseJSON = {
  id: "cGhvbmU",
  rawId: "cGhvbmU",
  type: "public-key",
  response: {
    clientDataJSON: "Y2xpZW50LWRhdGE",
    authenticatorData: "YXV0aGVudGljYXRvcg",
    signature: "c2lnbmF0dXJl",
  },
  clientExtensionResults: {},
};

const fakePasskeyRegistration: RegistrationResponseJSON = {
  id: "cGhvbmU",
  rawId: "cGhvbmU",
  type: "public-key",
  response: {
    clientDataJSON: "Y2xpZW50LWRhdGE",
    attestationObject: "YXR0ZXN0YXRpb24",
  },
  clientExtensionResults: {},
};

const fakeSignInCode = "7KQ2M-X9TPA";

const readFakeCode = (body: unknown): string | undefined =>
  typeof body === "object" &&
  body !== null &&
  "code" in body &&
  typeof body.code === "string"
    ? body.code
    : undefined;

const readFakePasskeyName = (body: unknown): string => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    throw new Error("the page sent a passkey without a name");
  }
  return body.name;
};

interface FakeFamilyDevice {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  lastSeenFrom: string | null;
}

const kitchenTablet: FakeFamilyDevice = {
  id: "0b0f7b1e-3333-4333-8333-333333333333",
  name: "Kitchen tablet",
  createdAt: "2026-11-01T09:00:00.000Z",
  lastSeenAt: "2026-11-14T15:30:00.000Z",
  lastSeenFrom: "203.0.113.41",
};

const readFakeFamilyDeviceName = (body: unknown): string => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("name" in body) ||
    typeof body.name !== "string"
  ) {
    throw new Error("the page sent a Family Device without a name");
  }
  return body.name;
};

const fakeParentMe = {
  email: ownerEmail,
  name: null,
  roles: ["parent"],
  needsSecondFactor: false,
  familyName: "The Eyres",
  teaching: null,
  unnamedSchoolIds: [],
};

interface FakeDeletionRequest {
  id: string;
  childId: string | null;
  childNickname: string | null;
  createdAt: string;
}

interface FakeWaitingAdult {
  userId: string;
  name: string | null;
  email: string;
  requestedAt: string;
}

interface FakeAdminDeletionRequest {
  id: string;
  familyName: string;
  childId: string | null;
  childNickname: string | null;
  requestedBy: string;
  createdAt: string;
}

interface FakeAdminFamily {
  id: string;
  name: string;
  children: { id: string; nickname: string }[];
}

const readFakeDeletionChoice = (body: unknown): string | null => {
  if (typeof body !== "object" || body === null) {
    throw new Error("the page sent a deletion request without a body");
  }
  return "childId" in body && typeof body.childId === "string"
    ? body.childId
    : null;
};

const startFakeApi = ({
  isSignedIn,
  roles = ["parent"],
  needsSecondFactor = false,
  hasSecondFactorToProve = false,
  isFirstSecondFactorSetupClosed = false,
  familyStatus = 200,
  familyChildren = [],
  childChangeStatus,
  emailAddress = { email: ownerEmail, isConfirmed: false },
  emailAddressCheckStatus = 204,
  emailAddressConfirmationStatus = 200,
  passwordChangeStatus = 204,
  signInMethods = {
    hasPassword: true,
    passkeys: [],
    isTwoFactorOn: false,
    recoveryCodesLeft: 0,
  },
  asksForTwoFactorCode = false,
  limitedSignInStep,
  passkeySignInStatus = 204,
  passkeyHandOffStatus = 201,
  signInMethodRemovalStatus = 204,
  otherSignInsRemovalStatus = 204,
  passwordResetRequestStatus = 204,
  passwordResetStatus = 204,
  inviteAcceptanceStatus = 204,
  familyDevices = [],
  familyDevicesStatus = 200,
  familyDeviceCreationStatus = 201,
  familyDeviceSignOutStatus = 204,
  isAdmin = false,
  deletionRequests = [],
  waitingAdults = [],
  adminDeletionRequests = [],
  adminFamilies = [],
  isHeld = () => false,
  childAwards = {},
  starAwardStatus,
}: {
  isSignedIn: boolean;
  roles?: string[];
  needsSecondFactor?: boolean;
  hasSecondFactorToProve?: boolean;
  isFirstSecondFactorSetupClosed?: boolean;
  familyStatus?: number;
  familyChildren?: FakeChild[];
  childChangeStatus?: number;
  emailAddress?: FakeEmailAddress;
  emailAddressCheckStatus?: number;
  emailAddressConfirmationStatus?: number;
  passwordChangeStatus?: number;
  signInMethods?: FakeSignInMethods;
  asksForTwoFactorCode?: boolean;
  limitedSignInStep?: "password" | "two-factor-code";
  passkeySignInStatus?: number;
  passkeyHandOffStatus?: number;
  signInMethodRemovalStatus?: number;
  otherSignInsRemovalStatus?: number;
  passwordResetRequestStatus?: number;
  passwordResetStatus?: number;
  inviteAcceptanceStatus?: number;
  familyDevices?: FakeFamilyDevice[];
  familyDevicesStatus?: number;
  familyDeviceCreationStatus?: number;
  familyDeviceSignOutStatus?: number;
  isAdmin?: boolean;
  deletionRequests?: FakeDeletionRequest[];
  waitingAdults?: FakeWaitingAdult[];
  adminDeletionRequests?: FakeAdminDeletionRequest[];
  adminFamilies?: FakeAdminFamily[];
  /** Requests the fake API holds unanswered until `answerHeldRequests` is called, to see what the page shows meanwhile. */
  isHeld?: (method: string, path: string) => boolean;
  childAwards?: Record<string, Partial<FakeChildAwards>>;
  starAwardStatus?: number;
}) => {
  const requests: ApiRequest[] = [];
  const heldAnswers: (() => void)[] = [];
  const answerHeldRequests = () => {
    for (const answer of heldAnswers.splice(0)) {
      answer();
    }
  };
  let handOffCount = 0;
  const fakeRoles =
    isAdmin && !roles.includes("admin") ? ["admin", ...roles] : roles;
  let listedDeletionRequests = deletionRequests;
  let listedWaitingAdults = waitingAdults;

  const answerFamilyJoinRequest = (method: string, path: string) => {
    if (method === "GET") {
      return Response.json(listedWaitingAdults);
    }
    const userId = path.split("/")[3];
    if (!listedWaitingAdults.some((adult) => adult.userId === userId)) {
      return new Response(null, { status: 404 });
    }
    listedWaitingAdults = listedWaitingAdults.filter(
      (adult) => adult.userId !== userId,
    );
    return new Response(null, { status: 204 });
  };

  const answerFamilyDataRequest = (
    method: string,
    path: string,
    body: unknown,
  ) => {
    if (method === "GET" && path === "/api/deletion-requests") {
      return Response.json(listedDeletionRequests);
    }
    if (method === "POST" && path === "/api/deletion-requests") {
      const childId = readFakeDeletionChoice(body);
      const deletionRequest = {
        id: `deletion-request-${String(listedDeletionRequests.length + 1)}`,
        childId,
        childNickname:
          listedChildren.find(({ id }) => id === childId)?.nickname ?? null,
        createdAt: "2026-11-16T10:00:00.000Z",
      };
      listedDeletionRequests = [...listedDeletionRequests, deletionRequest];
      return Response.json(
        { id: deletionRequest.id, childId },
        { status: 201 },
      );
    }
    return new Response(null, { status: 404 });
  };

  const answerAdminRequest = (method: string, path: string) => {
    if (!fakeRoles.includes("admin")) {
      return new Response(null, { status: 403 });
    }
    if (method === "GET" && path === "/api/admin/deletion-requests") {
      return Response.json(adminDeletionRequests);
    }
    if (method === "GET" && path === "/api/admin/families") {
      return Response.json(adminFamilies);
    }
    return new Response(null, { status: 204 });
  };
  let signedIn = isSignedIn;
  let mustSetUpSecondFactor = needsSecondFactor;

  const answerInviteAcceptance = () => {
    signedIn = signedIn || inviteAcceptanceStatus === 204;
    return new Response(null, { status: inviteAcceptanceStatus });
  };
  let listedFamilyDevices = familyDevices;

  const answerFamilyDeviceRequest = (
    method: string,
    path: string,
    body: unknown,
  ) => {
    if (method === "GET") {
      return familyDevicesStatus === 200
        ? Response.json(listedFamilyDevices)
        : new Response(null, { status: familyDevicesStatus });
    }
    if (method === "POST") {
      if (familyDeviceCreationStatus !== 201) {
        return new Response(null, { status: familyDeviceCreationStatus });
      }
      const familyDevice = {
        id: `family-device-${String(listedFamilyDevices.length + 1)}`,
        name: readFakeFamilyDeviceName(body),
        createdAt: "2026-11-14T15:00:00.000Z",
        lastSeenAt: "2026-11-14T15:00:00.000Z",
        lastSeenFrom: null,
      };
      listedFamilyDevices = [...listedFamilyDevices, familyDevice];
      signedIn = false;
      return Response.json(familyDevice, { status: 201 });
    }
    if (familyDeviceSignOutStatus === 204) {
      listedFamilyDevices = listedFamilyDevices.filter(
        ({ id }) => path !== `/api/family-devices/${id}`,
      );
    }
    return new Response(null, { status: familyDeviceSignOutStatus });
  };
  let listedChildren = familyChildren;
  let parentEmailAddress = emailAddress;
  let parentSignInMethods = signInMethods;

  const answerSignInMethodsRequest = (
    method: string,
    path: string,
    body: unknown,
  ): Response | undefined => {
    if (path === "/api/sign-in-methods") {
      return Response.json(parentSignInMethods);
    }
    if (path === "/api/passkey-sign-in-options") {
      return Response.json({ challenge: "a-sign-in-challenge" });
    }
    if (path === "/api/passkey-sign-ins") {
      signedIn = passkeySignInStatus === 204;
      return new Response(null, { status: passkeySignInStatus });
    }
    if (path === "/api/passkey-confirmation-options") {
      return Response.json({ challenge: "a-confirmation-challenge" });
    }
    if (method === "POST" && path === "/api/sign-in-codes") {
      const isProved =
        typeof body === "object" &&
        body !== null &&
        (("currentPassword" in body &&
          body.currentPassword === ownerPassword) ||
          readFakeCode(body) === rightTwoFactorCode ||
          "passkey" in body);
      return isProved
        ? Response.json(
            {
              code: fakeSignInCode,
              url: `https://wizzaroo.example/parent/#sign-in-code=${fakeSignInCode}`,
              expiresAt: "2026-11-14T15:10:00.000Z",
            },
            { status: 201 },
          )
        : Response.json({ code: "wrong-proof" }, { status: 403 });
    }
    if (method === "POST" && path === "/api/sign-in-code-sign-ins") {
      const typedCode = readFakeCode(body)
        ?.toUpperCase()
        .replaceAll(/[\s-]/gu, "");
      signedIn = typedCode === fakeSignInCode.replace("-", "");
      return new Response(null, { status: signedIn ? 204 : 401 });
    }
    if (path === "/api/passkey-confirmations") {
      mustSetUpSecondFactor = false;
      return new Response(null, { status: 204 });
    }
    if (
      path === "/api/sign-in/two-factor-code" &&
      limitedSignInStep === "two-factor-code"
    ) {
      return new Response(null, { status: 429 });
    }
    if (path === "/api/sign-in/two-factor-code") {
      const isRightCode = readFakeCode(body) === rightTwoFactorCode;
      signedIn = isRightCode;
      return new Response(null, { status: isRightCode ? 204 : 401 });
    }
    const isNewSecondFactorRefused =
      mustSetUpSecondFactor &&
      (hasSecondFactorToProve || isFirstSecondFactorSetupClosed);
    if (
      isNewSecondFactorRefused &&
      [
        "/api/totp-setups",
        "/api/passkey-registration-options",
        "/api/passkey-hand-offs",
      ].includes(path)
    ) {
      return Response.json(
        {
          statusCode: 403,
          code: hasSecondFactorToProve
            ? "second-factor-required"
            : "second-factor-setup-closed",
        },
        { status: 403 },
      );
    }
    if (path === "/api/passkey-registration-options") {
      return Response.json({
        challenge: "a-registration-challenge",
        rp: { name: "Wizzaroo", id: "localhost" },
        user: { id: "dXNlcg", name: ownerEmail, displayName: "" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      });
    }
    if (method === "POST" && path === "/api/passkey-hand-offs") {
      handOffCount += 1;
      return Response.json(
        {
          url: `http://localhost/parent/#add-passkey=hand-off-${String(handOffCount)}`,
          expiresAt: "2026-11-14T15:10:00.000Z",
        },
        { status: 201 },
      );
    }
    if (path === "/api/passkey-hand-off-registration-options") {
      return passkeyHandOffStatus === 404
        ? new Response(null, { status: 404 })
        : Response.json({
            challenge: "a-hand-off-challenge",
            rp: { name: "Wizzaroo", id: "localhost" },
            user: { id: "dXNlcg", name: ownerEmail, displayName: "" },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          });
    }
    if (path === "/api/passkey-hand-off-passkeys") {
      return passkeyHandOffStatus === 404
        ? new Response(null, { status: 404 })
        : Response.json(
            {
              id: "hand-off-passkey",
              name: readFakePasskeyName(body),
              createdAt: "2026-11-14T15:00:00.000Z",
            },
            { status: 201 },
          );
    }
    if (method === "POST" && path === "/api/passkeys") {
      const passkey = {
        id: `passkey-${String(parentSignInMethods.passkeys.length + 1)}`,
        name: readFakePasskeyName(body),
        createdAt: "2026-11-14T15:00:00.000Z",
      };
      parentSignInMethods = {
        ...parentSignInMethods,
        passkeys: [...parentSignInMethods.passkeys, passkey],
      };
      return Response.json(passkey, { status: 201 });
    }
    if (method === "DELETE" && path.startsWith("/api/passkeys/")) {
      if (signInMethodRemovalStatus === 204) {
        parentSignInMethods = {
          ...parentSignInMethods,
          passkeys: parentSignInMethods.passkeys.filter(
            ({ id }) => path !== `/api/passkeys/${id}`,
          ),
        };
      }
      return new Response(null, { status: signInMethodRemovalStatus });
    }
    if (method === "POST" && path === "/api/password") {
      parentSignInMethods = { ...parentSignInMethods, hasPassword: true };
      return new Response(null, { status: 204 });
    }
    if (method === "DELETE" && path === "/api/other-sign-ins") {
      return new Response(null, { status: otherSignInsRemovalStatus });
    }
    if (method === "DELETE" && path === "/api/password") {
      if (signInMethodRemovalStatus === 204) {
        parentSignInMethods = { ...parentSignInMethods, hasPassword: false };
      }
      return new Response(null, { status: signInMethodRemovalStatus });
    }
    if (path === "/api/totp-setups") {
      return Response.json({
        setupKey: "ABCD EFGH IJKL MNOP",
        setupUri: "otpauth://totp/Wizzaroo:owner%40example.com?secret=ABCD",
      });
    }
    if (path === "/api/two-factor") {
      if (readFakeCode(body) !== rightTwoFactorCode) {
        return new Response(null, { status: 403 });
      }
      const isTurningOn = method === "POST";
      mustSetUpSecondFactor = mustSetUpSecondFactor && !isTurningOn;
      parentSignInMethods = {
        ...parentSignInMethods,
        isTwoFactorOn: isTurningOn,
        recoveryCodesLeft: isTurningOn ? fakeRecoveryCodes.length : 0,
      };
      return isTurningOn
        ? Response.json({ recoveryCodes: fakeRecoveryCodes }, { status: 201 })
        : new Response(null, { status: 204 });
    }
    return undefined;
  };

  const answerAccountRequest = (path: string) => {
    if (path === "/api/email-address") {
      return Response.json(parentEmailAddress);
    }
    if (path === "/api/email-address-checks") {
      return new Response(null, { status: emailAddressCheckStatus });
    }
    if (path === "/api/password") {
      return new Response(null, { status: passwordChangeStatus });
    }
    if (emailAddressConfirmationStatus !== 200) {
      return new Response(null, { status: emailAddressConfirmationStatus });
    }
    parentEmailAddress = { ...parentEmailAddress, isConfirmed: true };
    return Response.json({ email: parentEmailAddress.email });
  };

  const findFakeAwards = (childId: string): FakeChildAwards => ({
    childId,
    stars: listedChildren.find(({ id }) => id === childId)?.stars ?? 0,
    starsGivenToday: 0,
    familyChestActivityCount: 0,
    questProgress: [],
    ...childAwards[childId],
  });

  const answerAwardsRequest = (
    method: string,
    path: string,
    body: unknown,
  ): Response | undefined => {
    const childId = /^\/api\/children\/([^/]+)\/(?:awards|star-awards)$/
      .exec(path)
      ?.at(1);
    if (childId === undefined) {
      return undefined;
    }
    if (method === "GET") {
      return Response.json(findFakeAwards(childId));
    }
    if (starAwardStatus !== undefined) {
      return new Response(null, { status: starAwardStatus });
    }
    const stars =
      typeof body === "object" && body !== null && "stars" in body
        ? Number(body.stars)
        : 0;
    const awards = findFakeAwards(childId);
    if (awards.starsGivenToday + stars > 15) {
      return new Response(null, { status: 409 });
    }
    childAwards[childId] = {
      ...awards,
      stars: awards.stars + stars,
      starsGivenToday: awards.starsGivenToday + stars,
    };
    return Response.json(findFakeAwards(childId));
  };

  const answerChildrenRequest = (
    method: string,
    path: string,
    body: unknown,
  ) => {
    const awardsAnswer = answerAwardsRequest(method, path, body);
    if (awardsAnswer !== undefined) {
      return awardsAnswer;
    }
    if (childChangeStatus !== undefined && method !== "GET") {
      return new Response(null, { status: childChangeStatus });
    }
    if (method === "GET" && path === "/api/children") {
      return Response.json(listedChildren);
    }
    if (method === "POST" && path === "/api/children") {
      const child = {
        id: `child-${String(listedChildren.length + 1)}`,
        ...readFakeChildDetails(body),
        classmateVisitsAllowed: false,
        classmateVisitsApproved: true,
        timeSpentSeconds: 0,
        mastery: [],
        dailyPractice: [],
        stars: 0,
        limits: noLimits,
        checkHistory: [],
      };
      listedChildren = [...listedChildren, child];
      return Response.json(child, { status: 201 });
    }
    const childId = /^\/api\/children\/([^/]+)/.exec(path)?.at(1);
    if (method === "PUT" && path.endsWith("/limits")) {
      listedChildren = listedChildren.map((listedChild) =>
        listedChild.id === childId
          ? { ...listedChild, limits: readFakeLimits(body, listedChild.limits) }
          : listedChild,
      );
      return Response.json(body);
    }
    if (method === "PUT" && path.endsWith("/picture-password")) {
      return new Response(null, { status: 204 });
    }
    if (method === "PUT" && path.endsWith("/classmate-visits")) {
      const classmateVisitsAllowed =
        typeof body === "object" &&
        body !== null &&
        "classmateVisitsAllowed" in body &&
        body.classmateVisitsAllowed === true;
      listedChildren = listedChildren.map((listedChild) =>
        listedChild.id === childId
          ? { ...listedChild, classmateVisitsAllowed }
          : listedChild,
      );
      return Response.json(
        listedChildren.find((listedChild) => listedChild.id === childId),
      );
    }
    if (method === "PUT" && childId !== undefined) {
      const child = { id: childId, ...readFakeChildDetails(body) };
      listedChildren = listedChildren.map((listedChild) =>
        listedChild.id === childId ? { ...listedChild, ...child } : listedChild,
      );
      return Response.json(child);
    }
    return new Response(null, { status: 404 });
  };

  const answerRequest = (method: string, path: string, body: unknown) => {
    if (path.startsWith("/api/admin/")) {
      return answerAdminRequest(method, path);
    }
    if (path === "/api/deletion-requests") {
      return answerFamilyDataRequest(method, path, body);
    }
    if (path.startsWith("/api/family-join-requests")) {
      return answerFamilyJoinRequest(method, path);
    }
    if (path.startsWith("/api/family-devices")) {
      return answerFamilyDeviceRequest(method, path, body);
    }
    if (path === "/api/invite-acceptances") {
      return answerInviteAcceptance();
    }
    if (method === "GET" && path === "/api/schools") {
      return Response.json([fakeSchool]);
    }
    const signInMethodsAnswer = answerSignInMethodsRequest(method, path, body);
    if (signInMethodsAnswer !== undefined) {
      return signInMethodsAnswer;
    }
    if (path.startsWith("/api/children")) {
      return answerChildrenRequest(method, path, body);
    }
    if (path === "/api/password-reset-requests") {
      return new Response(null, { status: passwordResetRequestStatus });
    }
    if (path === "/api/password-resets") {
      if (passwordResetStatus === 204) {
        signedIn = false;
      }
      return new Response(null, { status: passwordResetStatus });
    }
    if (path.startsWith("/api/email-address") || path === "/api/password") {
      return answerAccountRequest(path);
    }
    if (path === "/api/me") {
      if (!signedIn) {
        return Response.json({ statusCode: 401 }, { status: 401 });
      }
      return Response.json(
        {
          ...fakeParentMe,
          roles: fakeRoles,
          needsSecondFactor: mustSetUpSecondFactor,
          ...(roles.includes("teacher")
            ? {
                familyName: null,
                teaching: {
                  schoolId: fakeSchool.id,
                  schoolName: fakeSchool.name,
                  yearGroups: [2],
                },
              }
            : {}),
        },
        { status: familyStatus },
      );
    }
    if (path === "/api/sign-in") {
      const isOwner =
        typeof body === "object" &&
        body !== null &&
        "email" in body &&
        "password" in body &&
        body.email === ownerEmail &&
        body.password === ownerPassword;
      // Once the owner's address is limited, every try is refused unchecked, the right password included (#246).
      const isOwnerAddress =
        typeof body === "object" &&
        body !== null &&
        "email" in body &&
        body.email === ownerEmail;
      if (isOwnerAddress && limitedSignInStep === "password") {
        return new Response(null, { status: 429 });
      }
      if (isOwner && asksForTwoFactorCode) {
        return Response.json(
          { secondStep: "two-factor-code" },
          { status: 202 },
        );
      }
      signedIn = isOwner;
      return new Response(null, { status: isOwner ? 204 : 401 });
    }
    if (method === "POST" && path === "/api/sign-out") {
      signedIn = false;
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 404 });
  };

  vi.stubGlobal(
    "fetch",
    (path: string, init: RequestInit = {}): Promise<Response> => {
      const method = init.method ?? "GET";
      const body: unknown =
        typeof init.body === "string" ? JSON.parse(init.body) : undefined;
      requests.push({ method, path, body });
      if (isHeld(method, path)) {
        return new Promise((resolve) => {
          heldAnswers.push(() => {
            resolve(answerRequest(method, path, body));
          });
        });
      }
      return Promise.resolve(answerRequest(method, path, body));
    },
  );

  return { requests, answerHeldRequests };
};

const findElement = <Wanted extends Element>(
  selector: string,
  isWanted: (element: Element) => element is Wanted,
): Wanted => {
  const element = document.querySelector(selector);
  if (element === null || !isWanted(element)) {
    throw new Error(`the page has no ${selector}`);
  }
  return element;
};

const isInput = (element: Element) => element instanceof HTMLInputElement;
const isButton = (element: Element) => element instanceof HTMLButtonElement;
const isLink = (element: Element) => element instanceof HTMLAnchorElement;
const isHtmlElement = (element: Element) => element instanceof HTMLElement;

const isSelect = (element: Element) => element instanceof HTMLSelectElement;

const getPageText = () => document.body.textContent;

/** What the page says it is waiting on, from its BusyProgress, if anything. */
const getBusyLabels = () =>
  Array.from(document.querySelectorAll(".busy .busy-label")).map(
    ({ textContent }) => textContent,
  );

const findStatValue = (label: string) =>
  Array.from(document.querySelectorAll(".stat-tile"))
    .find(
      (statTile) =>
        statTile.querySelector(".stat-label")?.textContent === label,
    )
    ?.querySelector(".stat-value")?.textContent;

const findChildTile = (nickname: string): HTMLButtonElement => {
  const childTile = Array.from(
    document.querySelectorAll("button.child-tile"),
  ).find(
    (candidate) =>
      candidate.querySelector(".child-tile-name")?.textContent === nickname,
  );
  if (!(childTile instanceof HTMLButtonElement)) {
    throw new Error(`the page has no tile for ${nickname}`);
  }
  return childTile;
};

const findButton = (label: string): HTMLButtonElement => {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) =>
      candidate.getAttribute("aria-label") === label ||
      candidate.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`the page has no "${label}" button`);
  }
  return button;
};

const tapPictures = (pictures: string[]) => {
  for (const picture of pictures) {
    findButton(picture).click();
  }
};

const listSidebarGroups = () =>
  [...document.querySelectorAll(".parent-sidebar-group")].map((group) => ({
    heading: group.querySelector(".parent-sidebar-heading")?.textContent,
    entries: [...group.querySelectorAll("li")].map(
      (entry) => entry.textContent,
    ),
  }));

const findCurrentSidebarEntry = () =>
  document.querySelector('.parent-sidebar [aria-current="page"]')?.textContent;

const showSection = (section: string) => {
  window.history.replaceState(null, "", `#${section}`);
};

const chooseFromMenu = async (label: string) => {
  findButton("Menu").click();
  const menuEntry = await vi.waitFor(() => findButton(label));
  menuEntry.click();
};

const signInWith = (email: string, password: string) => {
  findElement('input[name="email"]', isInput).value = email;
  findElement('input[name="password"]', isInput).value = password;
  findElement('button[type="submit"]', isButton).click();
};

describe("ParentPage", () => {
  let root: Root;

  beforeEach(() => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    stubDevice({});
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(true);
  });

  afterEach(() => {
    root.unmount();
    window.history.replaceState(null, "", "/");
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("asks a Parent who isn't signed in to sign in, and shows no Family", async () => {
    startFakeApi({ isSignedIn: false });

    root.render(<ParentPage />);

    await vi.waitFor(() => {
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });
    expect(getPageText()).not.toContain("The Eyres");
  });

  it("signs a Parent in with their email address and password, then shows their Family's name", async () => {
    const { requests } = startFakeApi({ isSignedIn: false });
    root.render(<ParentPage />);
    await vi.waitFor(() => {
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });

    signInWith(ownerEmail, ownerPassword);

    await vi.waitFor(() => {
      expect(getPageText()).toContain("The Eyres");
    });
    expect(requests).toContainEqual({
      method: "POST",
      path: "/api/sign-in",
      body: { email: ownerEmail, password: ownerPassword },
    });
    expect(getPageText()).not.toContain("Sign in to Wizzaroo");
  });

  it("says the email address and password don't match, without saying which was wrong", async () => {
    startFakeApi({ isSignedIn: false });
    root.render(<ParentPage />);
    await vi.waitFor(() => {
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });

    signInWith(ownerEmail, "not-the-password");

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alert"]')?.textContent).toBe(
        "That email address and password don't match. Try again.",
      );
    });
    expect(getPageText()).not.toContain("The Eyres");
  });

  it.each([
    {
      problem: "the server fails",
      answer: () => Promise.resolve(new Response(null, { status: 500 })),
    },
    {
      problem: "the server can't be reached",
      answer: () => Promise.reject(new TypeError("Failed to fetch")),
    },
  ])(
    "says Wizzaroo couldn't sign the Parent in when $problem",
    async ({ answer }) => {
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
      vi.stubGlobal("fetch", answer);

      signInWith(ownerEmail, ownerPassword);

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't sign you in. Try again in a moment.",
        );
      });
    },
  );

  it("shows the Family's name straight away to a Parent who is already signed in", async () => {
    startFakeApi({ isSignedIn: true });

    root.render(<ParentPage />);

    await vi.waitFor(() => {
      expect(getPageText()).toContain("The Eyres");
    });
  });

  it("signs a Parent out and asks them to sign in again", async () => {
    const { requests } = startFakeApi({ isSignedIn: true });
    root.render(<ParentPage />);
    await vi.waitFor(() => {
      expect(getPageText()).toContain("The Eyres");
    });

    await chooseFromMenu("Sign out");

    await vi.waitFor(() => {
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });
    expect(requests).toContainEqual({
      method: "POST",
      path: "/api/sign-out",
      body: undefined,
    });
    expect(getPageText()).not.toContain("The Eyres");
  });

  it.each([
    {
      problem: "the server fails",
      answer: () => Promise.resolve(new Response(null, { status: 500 })),
    },
    {
      problem: "the server can't be reached",
      answer: () => Promise.reject(new TypeError("Failed to fetch")),
    },
  ])(
    "keeps a Parent signed in, and says so, when signing out fails because $problem",
    async ({ answer }) => {
      startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });
      vi.stubGlobal("fetch", answer);

      await chooseFromMenu("Sign out");

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't sign you out. Try again in a moment.",
        );
      });
      expect(getPageText()).toContain("The Eyres");
    },
  );

  describe("on a Family Device that Children share", () => {
    beforeEach(() => {
      localStorage.setItem(
        "wizzaroo.family-device.playable-family",
        JSON.stringify({ playableChildren: [], familyChestActivityCount: 0 }),
      );
    });

    afterEach(() => {
      localStorage.clear();
      vi.useRealTimers();
    });

    it("says the Parent page asks for a password or passkey every time", async () => {
      startFakeApi({ isSignedIn: false });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
      expect(getPageText()).toContain(
        "you sign in with your password, a passkey or a sign-in code from another device each time you open the Parent page",
      );
    });

    it("signs the adult out once no one has used the Parent page for a while", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });

      await vi.advanceTimersByTimeAsync(idleSignOutMs);

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/sign-out",
        body: undefined,
      });
      expect(getPageText()).toContain(
        "Wizzaroo signed you out because no one had used the Parent page for a while.",
      );
      expect(getPageText()).not.toContain("The Eyres");
    });

    it("keeps an adult who is using the Parent page signed in", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });

      await vi.advanceTimersByTimeAsync(idleSignOutMs - 1000);
      window.dispatchEvent(new Event("pointerdown"));
      await vi.advanceTimersByTimeAsync(idleSignOutMs - 1000);

      expect(getPageText()).toContain("The Eyres");
      expect(requests.map(({ path }) => path)).not.toContain("/api/sign-out");
    });
  });

  it("keeps an adult signed in on their own browser however long it sits idle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { requests } = startFakeApi({ isSignedIn: true });
    root.render(<ParentPage />);
    await vi.waitFor(() => {
      expect(getPageText()).toContain("The Eyres");
    });

    await vi.advanceTimersByTimeAsync(idleSignOutMs * 2);

    expect(getPageText()).toContain("The Eyres");
    expect(requests.map(({ path }) => path)).not.toContain("/api/sign-out");
    vi.useRealTimers();
  });

  describe("the title bar and its menu", () => {
    const listMenuEntryNames = () =>
      [...document.querySelectorAll(".site-menu-list li")].map(
        (entry) => entry.textContent,
      );

    const listViewHeadings = () =>
      [...document.querySelectorAll("main h1")].map(
        (heading) => heading.textContent,
      );

    it("puts every part of the Parent page except the settings in the menu, with the Family's name in the title bar", async () => {
      startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(
          document.querySelector(".site-header-subtitle")?.textContent,
        ).toBe("The Eyres");
      });

      findButton("Menu").click();

      await vi.waitFor(() => {
        expect(listMenuEntryNames()).toEqual([
          "Children",
          "Awards",
          "Islands",
          "Family Devices",
          "Your Family's data",
          "Your account",
          "This device",
          "Wizzaroo home",
          "Sign out",
        ]);
      });
    });

    it("offers a Parent who isn't signed in only signing in and this device in the menu", async () => {
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });

      findButton("Menu").click();

      await vi.waitFor(() => {
        expect(listMenuEntryNames()).toEqual([
          "Sign in",
          "This device",
          "Wizzaroo home",
        ]);
      });
    });

    it("keeps the settings one tap away behind the cog in the title bar", async () => {
      startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(listViewHeadings()).toEqual(["Children"]);
      });

      expect(
        findElement("a.site-header-settings", isLink).getAttribute("href"),
      ).toBe("#settings");
    });

    it("opens on the Children, showing nothing else", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(listViewHeadings()).toEqual(["Children"]);
      });
    });

    it.each([
      { section: "islands", heading: "Islands" },
      { section: "family-devices", heading: "Family Devices" },
      { section: "account", heading: "Your account" },
      { section: "this-device", heading: "This device" },
      { section: "settings", heading: "Settings" },
    ])(
      "shows $heading on its own when the Parent chooses it, and focuses its heading",
      async ({ section, heading }) => {
        startFakeApi({ isSignedIn: true });
        root.render(<ParentPage />);
        await vi.waitFor(() => {
          expect(listViewHeadings()).toEqual(["Children"]);
        });

        window.location.hash = `#${section}`;
        window.dispatchEvent(new HashChangeEvent("hashchange"));

        await vi.waitFor(() => {
          expect(listViewHeadings()).toEqual([heading]);
          expect(document.activeElement?.textContent).toBe(heading);
        });
        expect(document.title).toBe(`Wizzaroo for Parents – ${heading}`);
      },
    );

    it("asks a Parent who isn't signed in to sign in before showing a signed-in part", async () => {
      startFakeApi({ isSignedIn: false });
      showSection("invites");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(listViewHeadings()).toEqual(["Sign in to Wizzaroo"]);
      });
    });

    it("lands on Your account when opened from a link to confirm the email address", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage emailConfirmationToken="a-confirmation-token" />);

      await vi.waitFor(() => {
        expect(listViewHeadings()).toEqual(["Your account"]);
      });
    });
  });

  describe("the sidebar", () => {
    const listSidebarFooter = () =>
      [...document.querySelectorAll(".parent-sidebar-footer li")].map(
        (entry) => entry.textContent,
      );

    it("opens every group as an accordion that the Parent can close and open again", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(listSidebarGroups().length).toBeGreaterThan(0);
      });
      const groups = [
        ...document.querySelectorAll<HTMLDetailsElement>(
          "details.parent-sidebar-group",
        ),
      ];
      expect(groups.map(({ open }) => open)).toEqual(groups.map(() => true));

      findElement(".parent-sidebar-summary", isHtmlElement).click();

      await vi.waitFor(() => {
        expect(groups[0].open).toBe(false);
      });
      expect(groups.slice(1).every(({ open }) => open)).toBe(true);
    });

    it("groups the Family's parts apart from the Parent's own, under the Family's name", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(
          document.querySelector(".parent-sidebar-family strong")?.textContent,
        ).toBe("The Eyres");
      });
      expect(listSidebarGroups()).toEqual([
        {
          heading: "Your Family",
          entries: [
            "Children",
            "Awards",
            "Islands",
            "Family Devices",
            "Your Family's data",
          ],
        },
        { heading: "You", entries: ["Your account", "This device"] },
      ]);
      expect(listSidebarFooter()).toEqual(["Wizzaroo home", "Sign out"]);
      expect(findCurrentSidebarEntry()).toBe("Children");
    });

    it("offers the Admin dashboard to the Admin alone", async () => {
      startFakeApi({ isSignedIn: true, isAdmin: true });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(listSidebarGroups()).toContainEqual({
          heading: "Running Wizzaroo",
          entries: [
            "Schools",
            "Teachers",
            "Parents",
            "Children",
            "Add people in bulk",
            "Audit log",
            "Admin",
          ],
        });
      });
    });

    it("shows a Parent who isn't the Admin their Children instead of the Admin dashboard", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      showSection("admin");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(findCurrentSidebarEntry()).toBe("Children");
      });
      expect(getPageText()).not.toContain("Deletion requests");
      expect(requests.map(({ path }) => path)).not.toContain(
        "/api/admin/families",
      );
    });

    it("marks the part being shown as the current one", async () => {
      startFakeApi({ isSignedIn: true });
      showSection("family-devices");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(findCurrentSidebarEntry()).toBe("Family Devices");
      });
    });

    it("offers a Parent who isn't signed in only signing in and this device, with no Family", async () => {
      startFakeApi({ isSignedIn: false });

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(listSidebarGroups()).toEqual([
          { heading: "Get started", entries: ["Sign in", "This device"] },
        ]);
      });
      expect(listSidebarFooter()).toEqual(["Wizzaroo home"]);
      expect(document.querySelector(".parent-sidebar-family")).toBeNull();
    });

    it("signs the Parent out from the sidebar", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(listSidebarFooter()).toContain("Sign out");
      });

      findElement(".parent-sidebar-action", isButton).click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/sign-out",
        body: undefined,
      });
    });
  });

  it("says so when the account can't be loaded", async () => {
    startFakeApi({ isSignedIn: true, familyStatus: 500 });

    root.render(<ParentPage />);

    await vi.waitFor(() => {
      expect(getPageText()).toContain("Wizzaroo couldn't load your account.");
    });
  });

  describe("signing in with a passkey or a two-factor code", () => {
    const waitForSignInForm = async () => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
    };

    const sendSignInCode = (code: string) => {
      findElement('input[name="code"]', isInput).value = code;
      findElement('button[type="submit"]', isButton).click();
    };

    it("signs a Parent in with a passkey, asking for neither their email address nor their password", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      vi.mocked(startAuthentication).mockResolvedValue(fakePasskeySignIn);
      root.render(<ParentPage />);
      await waitForSignInForm();

      findButton("Sign in with a passkey").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });
      expect(startAuthentication).toHaveBeenCalledWith({
        optionsJSON: { challenge: "a-sign-in-challenge" },
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/passkey-sign-ins",
        body: { response: fakePasskeySignIn },
      });
    });

    it("signs a tablet in with a sign-in code made on another device, however it's typed", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);
      await waitForSignInForm();

      findButton("Sign in with a code from another device").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Sign in with a code from another device",
        );
      });
      findElement('input[name="signInCode"]', isInput).value = "7kq2m x9tpa";
      findButton("Sign in").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/sign-in-code-sign-ins",
        body: { code: "7kq2m x9tpa" },
      });
    });

    it("fills in the code from a sign-in code's link, and says when a code didn't work", async () => {
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage signInCode="WRONG-CODE0" />);

      await vi.waitFor(() => {
        expect(findElement('input[name="signInCode"]', isInput).value).toBe(
          "WRONG-CODE0",
        );
      });
      findButton("Sign in").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "That code didn't work. It may have expired or been used: make a new one on your other device.",
        );
      });
      findButton("Sign in another way").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });
    });

    it("says a passkey Wizzaroo doesn't know belongs to no account, and keeps the password form", async () => {
      startFakeApi({ isSignedIn: false, passkeySignInStatus: 401 });
      vi.mocked(startAuthentication).mockResolvedValue(fakePasskeySignIn);
      root.render(<ParentPage />);
      await waitForSignInForm();

      findButton("Sign in with a passkey").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "That passkey doesn't belong to a Wizzaroo account. Try another, or use your password.",
        );
      });
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });

    it("says Wizzaroo couldn't use the passkey when the Parent cancels it, and sends nothing", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      vi.mocked(startAuthentication).mockRejectedValue(
        new DOMException("The operation was cancelled", "NotAllowedError"),
      );
      root.render(<ParentPage />);
      await waitForSignInForm();

      findButton("Sign in with a passkey").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't sign you in with a passkey. Try again, or use your password.",
        );
      });
      expect(requests.map(({ path }) => path)).not.toContain(
        "/api/passkey-sign-ins",
      );
    });

    it("offers no passkey on a browser that can't use one", async () => {
      vi.mocked(browserSupportsWebAuthn).mockReturnValue(false);
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);
      await waitForSignInForm();

      expect(() => findButton("Sign in with a passkey")).toThrow();
    });

    it("asks for a code after the right password when two-factor authentication is on, then shows the Family", async () => {
      const { requests } = startFakeApi({
        isSignedIn: false,
        asksForTwoFactorCode: true,
      });
      root.render(<ParentPage />);
      await waitForSignInForm();

      signInWith(ownerEmail, ownerPassword);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Enter your code");
      });
      expect(getPageText()).not.toContain("The Eyres");
      sendSignInCode(rightTwoFactorCode);

      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/sign-in/two-factor-code",
        body: { code: rightTwoFactorCode },
      });
    });

    it("says a wrong code didn't work, and lets the Parent start signing in again", async () => {
      startFakeApi({ isSignedIn: false, asksForTwoFactorCode: true });
      root.render(<ParentPage />);
      await waitForSignInForm();
      signInWith(ownerEmail, ownerPassword);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Enter your code");
      });

      sendSignInCode("000000");

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "That code didn't work. Try the newest one, or start again.",
        );
      });
      findButton("Start again").click();
      await waitForSignInForm();
    });

    it("says signing in with a code is paused when too many wrong codes have been given for the account", async () => {
      startFakeApi({
        isSignedIn: false,
        asksForTwoFactorCode: true,
        limitedSignInStep: "two-factor-code",
      });
      root.render(<ParentPage />);
      await waitForSignInForm();
      signInWith(ownerEmail, ownerPassword);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Enter your code");
      });

      sendSignInCode(rightTwoFactorCode);

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Too many tries for this account, so Wizzaroo has paused signing in with a code. Wait an hour, then sign in again, or use a passkey.",
        );
      });
      expect(getPageText()).not.toContain("The Eyres");
    });

    it("says signing in with a password is paused when the account has started too many sign-ins, after the right password", async () => {
      startFakeApi({
        isSignedIn: false,
        asksForTwoFactorCode: true,
        limitedSignInStep: "password",
      });
      root.render(<ParentPage />);
      await waitForSignInForm();

      signInWith(ownerEmail, ownerPassword);

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Too many tries to sign in, so Wizzaroo has paused signing in with a password for a while. Wait up to an hour, then try again, or use a passkey.",
        );
      });
      expect(getPageText()).not.toContain("Enter your code");
    });

    it("says signing in with a password is paused, not that the password is wrong, once too many wrong passwords have been given for the address", async () => {
      startFakeApi({ isSignedIn: false, limitedSignInStep: "password" });
      root.render(<ParentPage />);
      await waitForSignInForm();

      signInWith(ownerEmail, "a-wrong-password-guessed");

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Too many tries to sign in, so Wizzaroo has paused signing in with a password for a while. Wait up to an hour, then try again, or use a passkey.",
        );
      });
      expect(getPageText()).not.toContain("The Eyres");
    });
  });

  describe("Children", () => {
    const showDashboard = async () => {
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
        expect(document.querySelector(".busy")).toBeNull();
      });
    };

    const fillChildForm = ({
      nickname,
      yearGroup,
      characterName,
      phonicsProgrammeId,
    }: {
      nickname: string;
      yearGroup: string;
      characterName: string;
      phonicsProgrammeId: string;
    }) => {
      const { birthMonth, birthYear } = bornInYear(Number(yearGroup));
      findElement('input[name="nickname"]', isInput).value = nickname;
      findElement('select[name="birthMonth"]', isSelect).value =
        String(birthMonth);
      findElement('input[name="birthYear"]', isInput).value = String(birthYear);
      findElement('input[name="characterName"]', isInput).value = characterName;
      findElement('select[name="phonicsProgrammeId"]', isSelect).value =
        phonicsProgrammeId;
    };

    it("lists each Child with their Year Group, their Character's name and their Phonics Programme", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [bea] });

      await showDashboard();

      expect(getPageText()).toContain(
        "Bea, Year 1 at Hillside Primary, plays as Sparkle",
      );
      expect(getPageText()).toContain(
        "Learns phonics with Little Wandle Letters and Sounds Revised.",
      );
    });

    it("names each Child's School and tells the Parent which Teachers can see their progress", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          bea,
          {
            ...bea,
            id: "0b0f7b1e-2222-4222-8222-222222222222",
            nickname: "Tom",
            ...inSchoolYear(0),
          },
        ],
      });

      await showDashboard();

      expect(getPageText()).toContain(
        "Teachers for Year 1 at Hillside Primary can see this Child's progress.",
      );
      findChildTile("Tom").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "No Teacher at Hillside Primary can see this Child's progress, because Teachers on Wizzaroo follow Years 1 to 6.",
        );
      });
      expect(getPageText()).toContain("Tom, Reception at Hillside Primary");
    });

    it("asks for a Child's birth month and year the first time they're opened, if Wizzaroo doesn't have it yet", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [
          { ...bea, birthMonth: null, birthYear: null, schoolYear: null },
        ],
      });

      await showDashboard();

      expect(getPageText()).toContain(
        "Wizzaroo now works out Bea's Year from their birth month and year",
      );
      const { birthMonth, birthYear } = bornInYear(2);
      findElement('select[name="birthMonth"]', isSelect).value =
        String(birthMonth);
      findElement('input[name="birthYear"]', isInput).value = String(birthYear);
      findElement('select[name="yearGroupAdjustment"]', isSelect).value = "-1";
      findButton("Save").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Bea, Year 1 at Hillside Primary, plays as Sparkle",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}`,
        body: {
          nickname: "Bea",
          birthMonth,
          birthYear,
          yearGroupAdjustment: -1,
          characterName: "Sparkle",
          phonicsProgrammeId: "little-wandle",
        },
      });
    });

    it("shows each Child's time spent playing, as the server worked it out, in hours and minutes", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          { ...bea, timeSpentSeconds: 3 * 3600 + 25 * 60 + 59 },
          {
            ...bea,
            id: "0b0f7b1e-2222-4222-8222-222222222222",
            nickname: "Tom",
            timeSpentSeconds: 7 * 60,
          },
          {
            ...bea,
            id: "0b0f7b1e-3333-4333-8333-333333333333",
            nickname: "Ivy",
            timeSpentSeconds: 2 * 3600,
          },
          {
            ...bea,
            id: "0b0f7b1e-4444-4444-8444-444444444444",
            nickname: "Kit",
            timeSpentSeconds: 40,
          },
          {
            ...bea,
            id: "0b0f7b1e-5555-4555-8555-555555555555",
            nickname: "Moss",
            timeSpentSeconds: 0,
          },
        ],
      });

      await showDashboard();

      const timePlayedOnTiles = Array.from(
        document.querySelectorAll(".child-tile-stats > span:last-child"),
        (timePlayed) => timePlayed.textContent,
      );
      expect(timePlayedOnTiles).toEqual([
        "3 hrs, 25 mins played",
        "7 mins played",
        "2 hrs played",
        "under a minute played",
        "Not played yet",
      ]);
      expect(findStatValue("Time spent playing")).toBe("3 hrs, 25 mins");
      expect(getPageText()).toContain(
        "Time spent includes play on a Family Device that had no network once it's back online.",
      );
    });

    it("shows each Child's Stars to spend, as the server worked them out", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, stars: 47 }],
      });

      await showDashboard();

      expect(findStatValue("Stars to spend")).toBe("47");
      expect(findChildTile("Bea").textContent).toContain("47 Stars");
    });

    it("shows a tile for each Child, opens the first Child's progress, and another's when the Parent chooses their tile", async () => {
      const tom = {
        ...bea,
        id: "0b0f7b1e-2222-4222-8222-222222222222",
        nickname: "Tom",
        characterName: "Blaze",
      };
      startFakeApi({ isSignedIn: true, familyChildren: [bea, tom] });
      await showDashboard();

      expect(findChildTile("Bea").getAttribute("aria-pressed")).toBe("true");
      expect(findChildTile("Tom").getAttribute("aria-pressed")).toBe("false");
      expect(document.querySelector(".child-dashboard h2")?.textContent).toBe(
        "Bea's progress",
      );

      findChildTile("Tom").click();

      await vi.waitFor(() => {
        expect(document.querySelector(".child-dashboard h2")?.textContent).toBe(
          "Tom's progress",
        );
      });
      expect(findChildTile("Tom").getAttribute("aria-pressed")).toBe("true");
      expect(findChildTile("Bea").getAttribute("aria-pressed")).toBe("false");
      expect(getPageText()).toContain(
        "Tom, Year 1 at Hillside Primary, plays as Blaze",
      );
    });

    it("breaks a Child's Mastery down by state, by Subject and by Skill, with their Reviews coming up", async () => {
      const practisedSkill = {
        percentCorrect: 0,
        timeSpentSeconds: 0,
        goodDayCount: 0,
        goodDaysNeeded: 3,
        reviewIntervalDays: null,
        nextReviewDate: null,
      };
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          {
            ...bea,
            mastery: [
              {
                ...practisedSkill,
                skillId: "maths.number-bonds-10",
                state: "mastered",
                percentCorrect: 90,
                timeSpentSeconds: 270,
                goodDayCount: 3,
                reviewIntervalDays: 7,
                nextReviewDate: "2026-11-20",
              },
              {
                ...practisedSkill,
                skillId: "phonics.sound-m",
                state: "learning",
                percentCorrect: 75,
                timeSpentSeconds: 120,
                goodDayCount: 1,
              },
              {
                ...practisedSkill,
                skillId: "phonics.sound-s",
                state: "due-for-review",
                percentCorrect: 85,
                timeSpentSeconds: 60,
                goodDayCount: 3,
                reviewIntervalDays: 7,
                nextReviewDate: "2026-11-10",
              },
            ],
          },
        ],
      });

      await showDashboard();

      expect(findStatValue("Skills mastered")).toBe("2 of 788");
      expect(
        document
          .querySelector('svg[aria-label^="Bea\'s Mastery"]')
          ?.getAttribute("aria-label"),
      ).toBe(
        "Bea's Mastery: Mastered 1 (0%), Due for review 1 (0%), Learning 1 (0%), Not started 785 (100%)",
      );
      expect(
        Array.from(document.querySelectorAll(".stacked-row"), (row) =>
          Array.from(
            row.querySelectorAll(".bar-heading > span"),
            (part) => part.textContent,
          ),
        ),
      ).toEqual([
        ["Maths", "1 of 129 mastered"],
        ["Phonics", "1 of 64 mastered"],
        ["English", "0 of 118 mastered"],
        ["Science", "0 of 68 mastered"],
        ["Music", "0 of 64 mastered"],
        ["Geography", "0 of 63 mastered"],
        ["History", "0 of 60 mastered"],
        ["Computing", "0 of 62 mastered"],
        ["Art and design", "0 of 60 mastered"],
        ["Design and technology", "0 of 60 mastered"],
        ["Languages", "0 of 40 mastered"],
      ]);
      expect(
        Array.from(document.querySelectorAll(".bar-chart"), (barChart) =>
          Array.from(
            barChart.querySelectorAll(".bar-heading"),
            (heading) => heading.textContent,
          ),
        ),
      ).toEqual([
        [
          "Number bonds to 1090%",
          "The /m/ sound, as in man75%",
          "The /s/ sound, as in sun85%",
        ],
        [
          "Number bonds to 104 mins",
          "The /m/ sound, as in man2 mins",
          "The /s/ sound, as in sun1 min",
        ],
        ["The /m/ sound, as in man1 of 3 good days"],
      ]);
      expect(
        document
          .querySelector('svg[aria-label^="Bea\'s minutes by Subject"]')
          ?.getAttribute("aria-label"),
      ).toBe(
        "Bea's minutes by Subject: Maths 5 (63%), Phonics 3 (38%), English 0 (0%), Science 0 (0%), Music 0 (0%), Geography 0 (0%), History 0 (0%), Computing 0 (0%), Art and design 0 (0%), Design and technology 0 (0%), Languages 0 (0%)",
      );
      expect(
        Array.from(
          document.querySelectorAll(".review-list > li"),
          (review) => review.textContent,
        ),
      ).toEqual([
        "The /s/ sound, as in sunDue now",
        "Number bonds to 10Fri 20 Nov",
      ]);
    });

    describe("the National Curriculum", () => {
      const practisedSkill = {
        percentCorrect: 90,
        timeSpentSeconds: 60,
        goodDayCount: 0,
        goodDaysNeeded: 3,
        reviewIntervalDays: null,
        nextReviewDate: null,
      };
      const beaPlaying = {
        ...bea,
        mastery: [
          {
            ...practisedSkill,
            skillId: "maths.number-bonds-10",
            state: "mastered" as const,
            goodDayCount: 3,
          },
          {
            ...practisedSkill,
            skillId: "maths.add-within-20",
            state: "learning" as const,
            goodDayCount: 1,
          },
          {
            ...practisedSkill,
            skillId: "maths.count-objects-to-20",
            state: "learning" as const,
            percentCorrect: 40,
          },
        ],
      };

      const findCurriculumPoint = (subject: string, heading: string) => {
        const point = Array.from(
          document.querySelectorAll(
            `.curriculum-subject.subject-${subject} .curriculum-point`,
          ),
        ).find(
          (candidate) => candidate.querySelector("h5")?.textContent === heading,
        );
        if (point === undefined) {
          throw new Error(`there is no ${subject} point "${heading}"`);
        }
        return point;
      };

      const readMeter = (element: Element) =>
        element
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow");

      it("lists every Subject taught in the Child's own Year, each with how far they've got", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();

        expect(getPageText()).toContain("National Curriculum, Year 1");
        expect(
          Array.from(
            document.querySelectorAll(".curriculum-subject h4"),
            (heading) => heading.textContent,
          ),
        ).toEqual([
          "Maths",
          "Phonics",
          "English",
          "Science",
          "Music",
          "Geography",
          "History",
          "Computing",
          "Art and design",
          "Design and technology",
        ]);
        expect(findButton("Year 1 now").getAttribute("aria-pressed")).toBe(
          "true",
        );
      });

      it("shows each key point with a progress bar, its status and the Games that teach it", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();
        findButton("Show every point").click();

        const addition = await vi.waitFor(() =>
          findCurriculumPoint("maths", "Addition and subtraction"),
        );
        expect(readMeter(addition)).toBe("44");
        expect(addition.querySelector(".point-status")?.textContent).toBe(
          "Learning",
        );
        const games = Array.from(
          addition.querySelectorAll(".point-game"),
          (game) => game.querySelector(".point-game-place")?.textContent,
        );
        expect(games.length).toBeGreaterThanOrEqual(3);
        expect(games).toContain("Bubble Bay, Meadow Isle");
        const gameMeters = Array.from(
          addition.querySelectorAll(".point-game"),
          readMeter,
        );
        expect(gameMeters).toContain("100");
        expect(gameMeters).toContain("33");

        const geometry = findCurriculumPoint(
          "maths",
          "Geometry: position and direction",
        );
        expect(readMeter(geometry)).toBe("0");
        expect(geometry.querySelector(".point-status")?.textContent).toBe(
          "Not started",
        );
        expect(geometry.querySelectorAll(".point-game").length).toBeGreaterThan(
          0,
        );
      });

      it("puts the points a Child is finding tricky first in where to help next, and can show only the gaps", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();

        const helpNext = Array.from(
          document.querySelectorAll(".help-next-point"),
          (point) => point.querySelector(".help-next-heading")?.textContent,
        );
        expect(helpNext).toHaveLength(5);
        expect(helpNext[0]).toBe("Number and place value");
        expect(
          document.querySelector(".help-next-point .point-status")?.textContent,
        ).toBe("Needs help");

        findButton("Show every point").click();
        findButton("Show only gaps").click();

        await vi.waitFor(() => {
          expect(
            document.querySelectorAll(
              ".curriculum-point.learning, .curriculum-point.complete",
            ),
          ).toHaveLength(0);
        });
        expect(
          document.querySelectorAll(".curriculum-point.needs-help"),
        ).toHaveLength(1);
      });

      it("takes the Parent to a point when they choose it from where to help next", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();
        Array.from(
          document.querySelectorAll<HTMLButtonElement>(".help-next-point"),
        )[0].click();

        await vi.waitFor(() => {
          expect(document.activeElement?.textContent).toBe(
            "Number and place value",
          );
        });
      });

      it("shows the key points of any Year, so a Parent can look ahead or back", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();
        findButton("Year 3").click();

        await vi.waitFor(() => {
          expect(getPageText()).toContain("National Curriculum, Year 3");
        });
        const subjectNames = Array.from(
          document.querySelectorAll(".curriculum-subject h4"),
          (heading) => heading.textContent,
        );
        expect(subjectNames).not.toContain("Phonics");
        expect(subjectNames).toContain("History");
        expect(getPageText()).toContain(
          "Key Stage 2 programme of study, taught in Year 3",
        );
      });

      it("links each Subject to its programme of study on GOV.UK", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [beaPlaying] });

        await showDashboard();

        await vi.waitFor(() => {
          expect(
            document.querySelectorAll(".curriculum-subject"),
          ).not.toHaveLength(0);
        });
        const mathsLink = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(
            ".curriculum-subject .subject-programme a",
          ),
        ).find((link) => link.textContent.includes("Maths"));
        expect(mathsLink?.href).toBe(
          "https://www.gov.uk/government/publications/national-curriculum-in-england-mathematics-programmes-of-study",
        );
        expect(mathsLink?.target).toBe("_blank");
        const footerLinks = Array.from(
          document.querySelectorAll<HTMLAnchorElement>(".curriculum-links a"),
          ({ href }) => href,
        );
        expect(footerLinks).toEqual([
          "https://www.gov.uk/government/publications/national-curriculum-in-england-physical-education-programmes-of-study",
          "https://www.gov.uk/government/collections/national-curriculum",
        ]);
      });
    });

    it("charts the last 14 days' practice, with each day in a table too", async () => {
      const quietDays = Array.from({ length: 14 }, (_, index) => ({
        localDate: `2026-11-${String(index + 1).padStart(2, "0")}`,
        questionCount: 0,
        rightFirstTimeCount: 0,
        secondsSpent: 0,
      }));
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          {
            ...bea,
            dailyPractice: quietDays.map((quietDay) => {
              if (quietDay.localDate === "2026-11-12") {
                return {
                  ...quietDay,
                  questionCount: 5,
                  rightFirstTimeCount: 4,
                  secondsSpent: 90,
                };
              }
              if (quietDay.localDate === "2026-11-14") {
                return {
                  ...quietDay,
                  questionCount: 6,
                  rightFirstTimeCount: 4,
                  secondsSpent: 180,
                };
              }
              return quietDay;
            }),
          },
        ],
      });

      await showDashboard();

      expect(document.querySelectorAll(".column")).toHaveLength(14);
      expect(getPageText()).toContain(
        "Played on 2 of the last 14 days, 4 minutes in Activities.",
      );
      expect(findStatValue("Right first time")).toBe("73%");
      const practiceRows = Array.from(
        document.querySelectorAll("details table tbody tr"),
        (row) => row.textContent,
      );
      expect(practiceRows).toContain(
        "Saturday 14 November3 minutes, 6 questions, 67% right first time",
      );
      expect(practiceRows).toContain("Friday 13 NovemberNo practice");
    });

    it("tells the Parent there's nothing to chart yet for a Child who hasn't practised", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [bea] });

      await showDashboard();

      expect(getPageText()).toContain(
        "No practice yet. Once Bea plays a Mission, it shows here.",
      );
      expect(getPageText()).toContain("No Reviews yet.");
      expect(findStatValue("Skills mastered")).toBe("0 of 788");
      expect(findStatValue("Right first time")).toBe("–");
    });

    describe("Check History", () => {
      const timesTablesOutcome = (
        key: string,
        isRight: boolean,
        isInTime: boolean,
        millisecondsTaken: number,
      ) => ({
        key,
        questionType: "8-times-table",
        skillId: "maths.times-tables-to-12",
        isRight,
        isInTime,
        millisecondsTaken,
      });

      const timesTablesCheck: CheckAttempt = {
        checkGameType: "times-tables-check",
        isClockOff: false,
        outcomes: [
          timesTablesOutcome("7x8", true, true, 2000),
          timesTablesOutcome("8x3", true, true, 5000),
          timesTablesOutcome("6x8", false, true, 3000),
          timesTablesOutcome("8x9", false, false, 6000),
        ],
        finishedAt: "2026-11-10T16:00:00.000Z",
        localDate: "2026-11-10",
        score: 2,
        questionCount: 4,
      };

      const spellingCheck: CheckAttempt = {
        checkGameType: "spelling-check",
        isClockOff: true,
        outcomes: [
          {
            key: "necessary",
            questionType: "word-list",
            skillId: "english.word-list-upper-key-stage-2",
            isRight: false,
            isInTime: true,
            millisecondsTaken: 9000,
          },
          {
            key: "island",
            questionType: "word-list",
            skillId: "english.word-list-upper-key-stage-2",
            isRight: true,
            isInTime: true,
            millisecondsTaken: 7000,
          },
        ],
        finishedAt: "2026-11-12T16:00:00.000Z",
        localDate: "2026-11-12",
        score: 1,
        questionCount: 2,
      };

      const readGridCell = (first: number, second: number) => {
        const rows = Array.from(
          document.querySelectorAll("table.times-tables-grid tbody tr"),
        );
        const row = rows.find(
          (candidate) =>
            candidate.querySelector("th")?.textContent === String(first),
        );
        const columnIndex = Array.from(
          document.querySelectorAll("table.times-tables-grid thead th"),
        ).findIndex((heading) => heading.textContent === String(second));
        return row?.children.item(columnIndex)?.textContent;
      };

      it("says there are no Timed Checks yet", async () => {
        startFakeApi({ isSignedIn: true, familyChildren: [bea] });

        await showDashboard();

        expect(getPageText()).toContain("Check History");
        expect(getPageText()).toContain(
          "No Timed Checks yet. When Bea takes a Timed Check in the Challenge Arena, the score shows here.",
        );
      });

      it("lists each Timed Check newest first, with its score and a no-time-limit note", async () => {
        startFakeApi({
          isSignedIn: true,
          familyChildren: [
            { ...bea, checkHistory: [spellingCheck, timesTablesCheck] },
          ],
        });

        await showDashboard();

        expect(
          Array.from(
            document.querySelectorAll("ol.check-attempts > li > p"),
            (line) => line.textContent,
          ).slice(0, 1),
        ).toEqual(["12 November 2026: 1 out of 2 (no time limit)"]);
        expect(
          Array.from(
            document.querySelectorAll("ol.check-attempts > li > h4"),
            (heading) => heading.textContent,
          ),
        ).toEqual(["SATs English: Spelling", "Multiplication Tables Check"]);
        expect(getPageText()).toContain("10 November 2026: 2 out of 4");
        expect(getPageText()).toContain("Words missed: necessary.");
        expect(getPageText()).toContain("Years 5 and 6 word list1 out of 2");
      });

      it("shows a Multiplication Tables Check as a grid of every fact, with a status in words in each cell", async () => {
        startFakeApi({
          isSignedIn: true,
          familyChildren: [{ ...bea, checkHistory: [timesTablesCheck] }],
        });

        await showDashboard();

        expect(getPageText()).toContain("Facts to practise: 6 × 8, 8 × 9.");
        expect(
          document.querySelectorAll("table.times-tables-grid tbody tr"),
        ).toHaveLength(11);
        expect(
          document.querySelectorAll('table.times-tables-grid th[scope="col"]'),
        ).toHaveLength(12);
        expect(readGridCell(7, 8)).toBe("✓7 × 8: Right in time");
        expect(readGridCell(8, 7)).toBe("✓8 × 7: Right in time");
        expect(readGridCell(3, 8)).toBe("~3 × 8: Right but slow");
        expect(readGridCell(6, 8)).toBe("✗6 × 8: Missed");
        expect(readGridCell(9, 8)).toBe("…9 × 8: Not in time");
        expect(readGridCell(2, 2)).toBe("2 × 2: Not asked");
        expect(
          Array.from(
            document.querySelectorAll(
              ".check-history ul.chart-legend .legend-label",
            ),
            (label) => label.textContent,
          ),
        ).toEqual([
          "Not asked",
          "Right in time",
          "Right but slow",
          "Not in time",
          "Missed",
        ]);
      });
    });

    it("sets a Child's daily time, which each Family Device keeps to once it next syncs", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      expect(getPageText()).toContain("No daily time limit.");

      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(findElement('input[name="dailyMinutes"]', isInput).value).toBe(
          "",
        );
      });
      expect(getPageText()).toContain("Time is counted on each device");
      expect(
        document.querySelector('input[name="allowedSubjects"]'),
      ).toBeNull();
      findElement('input[name="dailyMinutes"]', isInput).value = "30";
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Up to 30 minutes a day on each Family Device.",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}/limits`,
        body: getParentChoices({ ...noLimits, dailyMinutes: 30 }),
      });
    });

    it("shows what it is saving, with the button pressed held, until the limits are saved", async () => {
      const { answerHeldRequests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
        isHeld: (method, path) => method === "PUT" && path.endsWith("/limits"),
      });
      await showDashboard();
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(findButton("Save the limits")).toBeDefined();
      });

      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual(["Saving Bea's limits…"]);
      });
      expect(
        document
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-label"),
      ).toBe("Saving Bea's limits…");
      expect(findButton("Save the limits").disabled).toBe(true);
      expect(
        findButton("Save the limits")
          .closest("form")
          ?.getAttribute("aria-busy"),
      ).toBe("true");

      answerHeldRequests();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Set Bea's limits");
      });
      expect(getBusyLabels()).toEqual([]);
    });

    it("keeps a Child's Room for the Family only until a Parent lets Classmates visit it", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      expect(getPageText()).toContain("Bea's Room is for the Family only.");

      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(
          findElement('input[name="classmateVisits"]', isInput).checked,
        ).toBe(false);
      });
      expect(getPageText()).toContain("never a name");
      findElement('input[name="classmateVisits"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Classmates can visit Bea's Room, and Bea can visit theirs.",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}/classmate-visits`,
        body: { classmateVisitsAllowed: true },
      });
    });

    it("disables Classmate visits until the Child's School turns them on, keeping the Parent's choice", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [
          {
            ...bea,
            classmateVisitsAllowed: true,
            classmateVisitsApproved: false,
          },
        ],
      });
      await showDashboard();
      expect(getPageText()).toContain(
        "Bea's Room is for the Family only. Your School hasn't turned on Classmate visits yet.",
      );

      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        const input = findElement('input[name="classmateVisits"]', isInput);
        expect(input.disabled).toBe(true);
        expect(input.checked).toBe(false);
      });
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests.some(({ path }) => path.endsWith("/limits"))).toBe(
          true,
        );
      });
      expect(
        requests.some(({ path }) => path.endsWith("/classmate-visits")),
      ).toBe(false);
    });

    it("leaves Classmate visits alone when a Parent saves other limits", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, classmateVisitsAllowed: true }],
      });
      await showDashboard();
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(
          findElement('input[name="classmateVisits"]', isInput).checked,
        ).toBe(true);
      });
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests.some(({ path }) => path.endsWith("/limits"))).toBe(
          true,
        );
      });
      expect(
        requests.some(({ path }) => path.endsWith("/classmate-visits")),
      ).toBe(false);
    });

    it("turns a Child's music off for every Family Device, leaving sound effects and voice-over on", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(findElement('input[name="music"]', isInput).checked).toBe(true);
      });
      expect(findElement('input[name="soundEffects"]', isInput).checked).toBe(
        true,
      );
      expect(getPageText()).toContain("Voice-over always plays");

      findElement('input[name="music"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, isMusicMuted: true }),
        });
      });
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Music is off.");
      });
      expect(getPageText()).not.toContain("Sound effects are off.");
    });

    it("takes the clock off a Child's Timed Checks, saying it mirrors the real checks' access arrangements", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      expect(getPageText()).not.toContain("No time limit in Checks.");
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(
          findElement('input[name="checkClockOff"]', isInput).checked,
        ).toBe(false);
      });
      expect(getPageText()).toContain(
        "mirrors the access arrangements the real checks allow",
      );

      findElement('input[name="checkClockOff"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, isCheckClockOff: true }),
        });
      });
      await vi.waitFor(() => {
        expect(getPageText()).toContain("No time limit in Checks.");
      });
    });

    it("locks exploring the Islands for a Child, saying every Explore button is hidden", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      expect(getPageText()).not.toContain("Exploring the Islands is locked.");
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(findElement('input[name="exploring"]', isInput).checked).toBe(
          true,
        );
      });
      expect(getPageText()).toContain("every Explore button is hidden");

      findElement('input[name="exploring"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, isExploringLocked: true }),
        });
      });
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Exploring the Islands is locked.");
      });
    });

    it("locks single Islands for exploring, every Island open until a Parent turns it off", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Islands Bea can explore");
      });
      const islandSwitches = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[name^="explore-"]'),
      );
      expect(islandSwitches.map(({ name }) => name)).toEqual([
        "explore-meadow-isle",
        "explore-frost-isle",
        "explore-sunscorch-sands",
        "explore-jungle-reach",
        "explore-ember-isle",
        "explore-starfall-isle",
      ]);
      expect(islandSwitches.every(({ checked }) => checked)).toBe(true);

      findElement('input[name="explore-frost-isle"]', isInput).click();
      findElement('input[name="explore-starfall-isle"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({
            ...noLimits,
            exploreLockedIslandIds: ["frost-isle", "starfall-isle"],
          }),
        });
      });
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Islands locked for exploring: Frost Isle, Starfall Isle.",
        );
      });
    });

    it("sets Games first from 2, 5, 10, 15 or 20 minutes, not set until a Parent chooses", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();
      expect(getPageText()).not.toContain("of Games first each day");
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Games before the Wardrobe, Room and Explore",
        );
      });
      const gamesFirstChoices = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[name="gamesFirst"]'),
      );
      expect(
        gamesFirstChoices.map(({ value, checked }) => [value, checked]),
      ).toEqual([
        ["none", true],
        ["2", false],
        ["5", false],
        ["10", false],
        ["15", false],
        ["20", false],
        ["own", false],
      ]);
      expect(
        document.querySelector('input[name="gamesFirstOwnMinutes"]'),
      ).toBeNull();

      findElement('input[name="gamesFirst"][value="10"]', isInput).click();
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, gamesFirstMinutes: 10 }),
        });
      });
      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "10 minutes of Games first each day before the Wardrobe, Room and Explore open.",
        );
      });
    });

    it("sets Games first to a Parent's own minutes, and turns it off again with Not set", async () => {
      const ownMinutesLimits = { ...noLimits, gamesFirstMinutes: 7 };
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, limits: ownMinutesLimits }],
      });
      await showDashboard();
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(
          findElement('input[name="gamesFirst"][value="own"]', isInput).checked,
        ).toBe(true);
      });
      expect(
        findElement('input[name="gamesFirstOwnMinutes"]', isInput).value,
      ).toBe("7");

      findElement('input[name="gamesFirstOwnMinutes"]', isInput).value = "25";
      findButton("Save the limits").click();
      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, gamesFirstMinutes: 25 }),
        });
      });

      await vi.waitFor(() => {
        expect(findButton("Set Bea's limits")).toBeDefined();
      });
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        findElement('input[name="gamesFirst"][value="none"]', isInput);
      });
      findElement('input[name="gamesFirst"][value="none"]', isInput).click();
      findButton("Save the limits").click();
      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...noLimits, gamesFirstMinutes: null }),
        });
      });
    });

    it("lifts the daily limit when the minutes are left empty, keeping the Island and Region switches", async () => {
      const switchedLimits = {
        ...noLimits,
        dailyMinutes: 20,
        unlockedIslandIds: ["jungle-reach"],
        lockedIslandIds: ["frost-isle"],
        turnedOffRegionKeys: ["meadow-isle/bubble-bay"],
      };
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, limits: switchedLimits }],
      });
      await showDashboard();
      expect(getPageText()).toContain(
        "Up to 20 minutes a day on each Family Device. Islands you've opened early: Jungle Reach. Islands you've locked: Frost Isle. Regions you've turned off: Bubble Bay on Meadow Isle.",
      );
      findButton("Set Bea's limits").click();
      await vi.waitFor(() => {
        expect(findElement('input[name="dailyMinutes"]', isInput).value).toBe(
          "20",
        );
      });

      findElement('input[name="dailyMinutes"]', isInput).value = "";
      findButton("Save the limits").click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "PUT",
          path: `/api/children/${bea.id}/limits`,
          body: getParentChoices({ ...switchedLimits, dailyMinutes: null }),
        });
      });
    });

    it("leads from a Child's progress to their Islands", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [bea] });
      await showDashboard();

      expect(
        findElement(".child-actions a.button-link", isLink).textContent,
      ).toBe("Choose Bea's Islands");
      expect(
        findElement(".child-actions a.button-link", isLink).getAttribute(
          "href",
        ),
      ).toBe("#islands");
    });

    it("asks the Parent to choose a Phonics Programme for a Child who has none yet", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, phonicsProgrammeId: null }],
      });

      await showDashboard();

      expect(getPageText()).toContain(
        "No Phonics Programme chosen yet. Edit them to choose their school's.",
      );
    });

    it("invites a Parent with no Children yet to add one", async () => {
      startFakeApi({ isSignedIn: true });

      await showDashboard();

      expect(getPageText()).toContain("No Children yet.");
      expect(findButton("Add a Child")).toBeDefined();
    });

    it("asks only for a nickname, a Year Group, a Character's name, a Phonics Programme and a Picture Password when adding a Child", async () => {
      startFakeApi({ isSignedIn: true });
      await showDashboard();

      findButton("Add a Child").click();

      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });
      const fieldNames = Array.from(
        document.querySelectorAll("form [name]"),
        (field) => field.getAttribute("name"),
      );
      expect(fieldNames).toEqual([
        "nickname",
        "birthMonth",
        "birthYear",
        "yearGroupAdjustment",
        "characterName",
        "phonicsProgrammeId",
      ]);
      expect(
        Array.from(
          findElement('select[name="phonicsProgrammeId"]', isSelect).options,
          ({ value, text }) => ({ value, text }),
        ),
      ).toEqual([
        { value: "", text: "Choose one" },
        {
          value: "little-wandle",
          text: "Little Wandle Letters and Sounds Revised",
        },
        { value: "read-write-inc", text: "Read Write Inc. Phonics" },
        {
          value: "essential-letters-and-sounds",
          text: "Essential Letters and Sounds",
        },
        { value: "jolly-phonics", text: "Jolly Phonics" },
        { value: "sounds-write", text: "Sounds-Write" },
        { value: "twinkl-phonics", text: "Twinkl Phonics" },
      ]);
      expect(getPageText()).toContain("never a surname, birthday or photo");
      expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
      expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
    });

    it("adds a Child with their Phonics Programme and Picture Password, then lists them", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showDashboard();
      findButton("Add a Child").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });

      fillChildForm({
        nickname: "Tom",
        yearGroup: "2",
        characterName: "Blaze",
        phonicsProgrammeId: "read-write-inc",
      });
      tapPictures(["sun", "dog", "sun"]);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Chosen: ☀️ sun, 🐶 dog, ☀️ sun");
      });
      findButton("Add this Child").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Tom, Year 2 at Hillside Primary, plays as Blaze",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/children",
        body: {
          nickname: "Tom",
          ...bornInYear(2),
          characterName: "Blaze",
          phonicsProgrammeId: "read-write-inc",
          picturePassword: ["sun", "dog", "sun"],
        },
      });
    });

    it("stops at three pictures, and lets the Parent start the pictures again", async () => {
      startFakeApi({ isSignedIn: true });
      await showDashboard();
      findButton("Add a Child").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });

      tapPictures(["cat", "dog", "fish", "star"]);

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Chosen: 🐱 cat, 🐶 dog, 🐟 fish");
      });
      expect(findButton("star").disabled).toBe(true);

      findButton("Start the pictures again").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Chosen: none yet");
      });
      expect(findButton("star").disabled).toBe(false);
    });

    it("won't add a Child until three pictures are chosen", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showDashboard();
      findButton("Add a Child").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });

      fillChildForm({
        nickname: "Tom",
        yearGroup: "2",
        characterName: "Blaze",
        phonicsProgrammeId: "little-wandle",
      });
      tapPictures(["sun"]);
      findButton("Add this Child").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Tap 3 pictures for the Picture Password first.",
        );
      });
      expect(requests.map(({ method }) => method)).not.toContain("POST");
    });

    it("edits a Child's details without touching their Picture Password", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();

      findButton("Edit Bea").click();
      await vi.waitFor(() => {
        expect(findElement('input[name="nickname"]', isInput).value).toBe(
          "Bea",
        );
      });
      expect(findElement('input[name="birthYear"]', isInput).value).toBe(
        String(bornInYear(1).birthYear),
      );
      expect(findElement('input[name="characterName"]', isInput).value).toBe(
        "Sparkle",
      );
      expect(
        findElement('select[name="phonicsProgrammeId"]', isSelect).value,
      ).toBe("little-wandle");
      expect(getPageText()).not.toContain("Picture Password");
      fillChildForm({
        nickname: "Beatrix",
        yearGroup: "2",
        characterName: "Glimmer",
        phonicsProgrammeId: "little-wandle",
      });
      findButton("Save").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Beatrix, Year 2 at Hillside Primary, plays as Glimmer",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}`,
        body: {
          nickname: "Beatrix",
          ...bornInYear(2),
          characterName: "Glimmer",
          phonicsProgrammeId: "little-wandle",
        },
      });
    });

    it("changes a Child's Phonics Programme when they move school", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();

      findButton("Edit Bea").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });
      findElement('select[name="phonicsProgrammeId"]', isSelect).value =
        "read-write-inc";
      findButton("Save").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Learns phonics with Read Write Inc. Phonics.",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}`,
        body: {
          nickname: "Bea",
          ...bornInYear(1),
          characterName: "Sparkle",
          phonicsProgrammeId: "read-write-inc",
        },
      });
    });

    it("won't save a Child until a Phonics Programme is chosen", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...bea, phonicsProgrammeId: null }],
      });
      await showDashboard();

      findButton("Edit Bea").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });
      const phonicsProgrammeChoice = findElement(
        'select[name="phonicsProgrammeId"]',
        isSelect,
      );
      findButton("Save").click();

      expect(phonicsProgrammeChoice.value).toBe("");
      expect(phonicsProgrammeChoice.validity.valueMissing).toBe(true);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Edit Bea");
      });
      expect(requests.map(({ method }) => method)).not.toContain("PUT");
    });

    it("resets a Child's Picture Password to three new pictures", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();

      findButton("Reset Bea's Picture Password").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("A new Picture Password for Bea");
      });
      tapPictures(["apple", "star", "tree"]);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Chosen: 🍎 apple, ⭐ star, 🌳 tree");
      });
      findButton("Save the Picture Password").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Bea, Year 1 at Hillside Primary, plays as Sparkle",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: `/api/children/${bea.id}/picture-password`,
        body: { picturePassword: ["apple", "star", "tree"] },
      });
    });

    it("goes back to the list, changing nothing, when the Parent cancels", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      await showDashboard();

      findButton("Edit Bea").click();
      await vi.waitFor(() => {
        expect(document.querySelector("form")).not.toBeNull();
      });
      findButton("Cancel").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Bea, Year 1 at Hillside Primary, plays as Sparkle",
        );
      });
      expect(requests.map(({ method }) => method)).not.toContain("PUT");
    });

    it("says Wizzaroo couldn't save, and keeps the form, when the server refuses a change", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
        childChangeStatus: 500,
      });
      await showDashboard();

      findButton("Reset Bea's Picture Password").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("A new Picture Password for Bea");
      });
      tapPictures(["apple", "star", "tree"]);
      await vi.waitFor(() => {
        expect(findButton("apple").disabled).toBe(true);
      });
      findButton("Save the Picture Password").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't save that. Try again in a moment.",
        );
      });
      expect(getPageText()).toContain("A new Picture Password for Bea");
    });

    it("says so when the Children can't be loaded", async () => {
      startFakeApi({ isSignedIn: true });
      const answerFamilyOnly = (path: string) =>
        Promise.resolve(
          path === "/api/me"
            ? Response.json(fakeParentMe)
            : new Response(null, { status: 500 }),
        );
      vi.stubGlobal("fetch", answerFamilyOnly);

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Wizzaroo couldn't load your Children.",
        );
      });
    });
  });

  describe("Islands", () => {
    const ali: FakeChild = {
      ...bea,
      id: "0b0f7b1e-2222-4222-8222-222222222222",
      nickname: "Ali",
      characterName: "Zoom",
      yearGroup: 2,
    };

    const findSwitch = (name: string, value: string) =>
      findElement(`input[name="${name}"][value="${value}"]`, isInput);

    const findIslandSwitch = (islandId: string) =>
      findSwitch("unlockedIslandIds", islandId);

    const findRegionSwitch = (regionKey: string) =>
      findSwitch("turnedOnRegionKeys", regionKey);

    const findGamesSwitch = (regionKey: string) =>
      findSwitch("openRegionKeys", regionKey);

    const findSubjectSwitch = (subjectKey: string) =>
      findSwitch("subjectsOnEveryIsland", subjectKey);

    const findIslandBadge = (islandId: string) =>
      findIslandSwitch(islandId)
        .closest(".island-card")
        ?.querySelector(".region-card-badge")?.textContent;

    const readStatus = () =>
      document.querySelector('[role="status"]')?.textContent;

    const islandIds = [
      "meadow-isle",
      "frost-isle",
      "sunscorch-sands",
      "jungle-reach",
      "ember-isle",
      "starfall-isle",
    ];

    const showIslands = async () => {
      showSection("islands");
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(document.querySelector(".island-cards")).not.toBeNull();
      });
    };

    const expectLimitsSent = async (
      requests: unknown[],
      childId: string,
      limits: ChildLimits,
    ) => {
      await vi.waitFor(() => {
        expect(requests.at(-1)).toEqual({
          method: "PUT",
          path: `/api/children/${childId}/limits`,
          body: getParentChoices(limits),
        });
      });
    };

    it("opens the Regions on a Child's own Island and the ones below, and locks those above their Year", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });

      await showIslands();

      expect(
        islandIds.map((islandId) => findIslandSwitch(islandId).checked),
      ).toEqual([true, true, false, false, false, false]);
      expect(findIslandBadge("meadow-isle")).toBe("Open");
      expect(findIslandBadge("frost-isle")).toBe("Open: Ali's own Year");
      expect(findIslandBadge("sunscorch-sands")).toBe(
        "Locked: above Ali's Year",
      );
      expect(getPageText()).toContain(
        "Ali is in Year 2 and can play the Regions on 2 of 6 Islands.",
      );
    });

    it("opens an Island above a Year 2 Child's Year early, and locks it again", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();

      findIslandSwitch("sunscorch-sands").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe(
          "Sunscorch Sands is open for Ali. Each Family Device opens it once it next goes online.",
        );
      });
      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        unlockedIslandIds: ["sunscorch-sands"],
      });
      expect(findIslandBadge("sunscorch-sands")).toBe("Opened early");

      findIslandSwitch("sunscorch-sands").click();

      await expectLimitsSent(requests, ali.id, noLimits);
      await vi.waitFor(() => {
        expect(findIslandSwitch("sunscorch-sands").checked).toBe(false);
      });
      expect(findIslandBadge("sunscorch-sands")).toBe(
        "Locked: above Ali's Year",
      );
    });

    it("locks a Child's own Island, and opens it again", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();

      findIslandSwitch("meadow-isle").click();

      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        lockedIslandIds: ["meadow-isle"],
      });
      await vi.waitFor(() => {
        expect(findIslandBadge("meadow-isle")).toBe("Locked by you");
      });

      findIslandSwitch("meadow-isle").click();

      await expectLimitsSent(requests, ali.id, noLimits);
    });

    it("turns a Region off on one Island only, and on again", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();

      findRegionSwitch("meadow-isle/bubble-bay").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe("Bubble Bay on Meadow Isle is off for Ali.");
      });
      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        turnedOffRegionKeys: ["meadow-isle/bubble-bay"],
      });
      expect(findRegionSwitch("meadow-isle/bubble-bay").checked).toBe(false);
      expect(findRegionSwitch("frost-isle/icicle-inlet").checked).toBe(true);

      findRegionSwitch("meadow-isle/bubble-bay").click();

      await expectLimitsSent(requests, ali.id, noLimits);
    });

    it("turns a Subject off on every Island at once and back on, leaving the Big Top to its own switch", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();
      const mathsRegionKeys = [
        "meadow-isle/bubble-bay",
        "frost-isle/icicle-inlet",
        "sunscorch-sands/oasis-pools",
        "jungle-reach/monkey-falls",
        "ember-isle/anvil-quarry",
        "starfall-isle/constellation-court",
      ];

      expect(findSubjectSwitch("maths").checked).toBe(true);

      findSubjectSwitch("maths").click();

      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        turnedOffRegionKeys: mathsRegionKeys,
      });
      await vi.waitFor(() => {
        for (const regionKey of mathsRegionKeys) {
          expect(findRegionSwitch(regionKey).checked).toBe(false);
        }
      });
      expect(findSubjectSwitch("maths").checked).toBe(false);
      expect(findRegionSwitch("meadow-isle/brainwave-big-top").checked).toBe(
        true,
      );
      expect(findSubjectSwitch("games").checked).toBe(true);

      findSubjectSwitch("maths").click();

      await expectLimitsSent(requests, ali.id, noLimits);
      await vi.waitFor(() => {
        expect(findRegionSwitch("frost-isle/brainwave-big-top").disabled).toBe(
          false,
        );
      });

      findRegionSwitch("frost-isle/brainwave-big-top").click();

      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        turnedOffRegionKeys: ["frost-isle/brainwave-big-top"],
      });
    });

    it("lists every Subject and Games, the Brainwave Big Top, each with its own switch", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      await showIslands();

      const subjectSwitches = [
        ...document.querySelectorAll<HTMLInputElement>(
          'input[role="switch"][name="subjectsOnEveryIsland"]',
        ),
      ];
      expect(subjectSwitches.map(({ value }) => value).slice(-2)).toEqual([
        "games",
        "checks",
      ]);
      expect(subjectSwitches.map(({ value }) => value)).toContain("maths");
      expect(subjectSwitches.every(({ checked }) => checked)).toBe(true);
      expect(
        document.querySelector(".subject-shortcuts")?.textContent,
      ).toContain("Games");
    });

    it("turns Games, the Brainwave Big Top, off on every Island at once, and says where a Subject is off on only some", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();

      findRegionSwitch("meadow-isle/bubble-bay").click();

      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        turnedOffRegionKeys: ["meadow-isle/bubble-bay"],
      });
      await vi.waitFor(() => {
        expect(
          document.querySelector(".subject-shortcuts")?.textContent,
        ).toContain("Off on 1 of 6 Islands");
      });
      expect(findSubjectSwitch("maths").checked).toBe(true);

      findSubjectSwitch("games").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe("Games are off on every Island for Ali.");
      });
      for (const islandId of [
        "meadow-isle",
        "frost-isle",
        "sunscorch-sands",
        "jungle-reach",
        "ember-isle",
        "starfall-isle",
      ]) {
        expect(findRegionSwitch(`${islandId}/brainwave-big-top`).checked).toBe(
          false,
        );
      }
    });

    it("turns Checks, the Challenge Arena, off on the three Islands that have one, with no switch to open its Games since they are always open", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      await showIslands();

      expect(
        document.querySelector(
          '[data-region-key="jungle-reach/challenge-arena"]',
        )?.textContent,
      ).toContain("Checks, every Game open");
      expect(
        document.querySelector(
          'input[name="openRegionKeys"][value="jungle-reach/challenge-arena"]',
        ),
      ).toBeNull();

      findSubjectSwitch("checks").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe("Checks are off on every Island for Ali.");
      });
      for (const islandId of ["meadow-isle", "jungle-reach", "starfall-isle"]) {
        expect(findRegionSwitch(`${islandId}/challenge-arena`).checked).toBe(
          false,
        );
      }
    });

    it("opens every Game in a Region, and closes them again so the Stars and Games already earned decide", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();

      findGamesSwitch("frost-isle/aurora-lab").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe("Every Game in Aurora Lab is open for Ali.");
      });
      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        openRegionKeys: ["frost-isle/aurora-lab"],
      });

      findGamesSwitch("frost-isle/aurora-lab").click();

      await vi.waitFor(() => {
        expect(readStatus()).toBe(
          "Aurora Lab's Games open with Stars again. Ali keeps every Game and Star already earned.",
        );
      });
      await expectLimitsSent(requests, ali.id, noLimits);
      expect(() => findGamesSwitch("frost-isle/brainwave-big-top")).toThrow();
    });

    it("keeps a Child's time limit when changing an Island", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [{ ...ali, limits: { ...noLimits, dailyMinutes: 20 } }],
      });
      await showIslands();

      findIslandSwitch("jungle-reach").click();

      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        dailyMinutes: 20,
        unlockedIslandIds: ["jungle-reach"],
      });
    });

    it("says so, and leaves the Island as it was, when the change can't be saved", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        childChangeStatus: 500,
      });
      await showIslands();

      findIslandSwitch("sunscorch-sands").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't save that change for Ali. Try again in a moment.",
        );
      });
      expect(findIslandSwitch("sunscorch-sands").checked).toBe(false);
      expect(findIslandSwitch("sunscorch-sands").disabled).toBe(false);
    });

    const findGameSwitch = (gameKey: string) => findSwitch("gameKeys", gameKey);

    it("shows the Brainwave Big Top and the Challenge Arena with every Game always open, in place of the switch", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      await showIslands();

      for (const regionKey of [
        "meadow-isle/brainwave-big-top",
        "starfall-isle/challenge-arena",
      ]) {
        const regionCard = document.querySelector(
          `.region-card[data-region-key="${regionKey}"]`,
        );
        expect(
          regionCard?.querySelector('input[name="openRegionKeys"]'),
        ).toBeNull();
        expect(
          regionCard?.querySelector(".region-switch-fixed")?.textContent,
        ).toBe("All Games openAlways");
      }
      expect(
        findGamesSwitch("meadow-isle/bubble-bay").closest(".region-card"),
      ).not.toBeNull();
    });

    it("says what each switch is for, beside it and in a key", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      await showIslands();

      const regionCard = findRegionSwitch("meadow-isle/bubble-bay").closest(
        ".region-card",
      );
      expect(
        [
          ...(regionCard?.querySelectorAll(
            ".region-card-switches .region-switch-caption",
          ) ?? []),
        ].map((caption) => caption.firstChild?.textContent),
      ).toEqual(["Can play", "All Games open"]);
      expect(
        [...document.querySelectorAll(".switch-key dt")].map((term) =>
          term.textContent.trim(),
        ),
      ).toEqual([
        "Regions open",
        "Can play",
        "All Games open",
        "Locked by their Teacher",
      ]);
    });

    it("turns a single Game off in a Region, and on again", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showIslands();
      const gameKey = "meadow-isle/bubble-bay/fish-count";

      findGameSwitch(gameKey).click();

      await vi.waitFor(() => {
        expect(readStatus()).toMatch(/ in Bubble Bay is off for Ali\.$/);
      });
      await expectLimitsSent(requests, ali.id, {
        ...noLimits,
        lockedGameKeys: [gameKey],
      });
      expect(findGameSwitch(gameKey).checked).toBe(false);
      expect(
        findGameSwitch("meadow-isle/bubble-bay/popping-bubbles").checked,
      ).toBe(true);

      findGameSwitch(gameKey).click();

      await expectLimitsSent(requests, ali.id, noLimits);
    });

    it("shows what their Teacher turned off as locked, and never lets the Parent turn it back on", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          {
            ...ali,
            limits: {
              ...noLimits,
              teacherLocks: {
                lockedIslandIds: ["frost-isle"],
                turnedOffRegionKeys: ["meadow-isle/bubble-bay"],
                lockedGameKeys: ["meadow-isle/whispering-woods/alphabet-train"],
              },
            },
          },
        ],
      });
      await showIslands();

      const teacherLocked = [
        findIslandSwitch("frost-isle"),
        findRegionSwitch("meadow-isle/bubble-bay"),
        findGameSwitch("meadow-isle/whispering-woods/alphabet-train"),
      ];
      expect(teacherLocked.map(({ checked }) => checked)).toEqual([
        false,
        false,
        false,
      ]);
      expect(teacherLocked.map(({ disabled }) => disabled)).toEqual([
        true,
        true,
        true,
      ]);
      expect(findIslandBadge("frost-isle")).toBe("Locked by their Teacher");
      expect(findRegionSwitch("frost-isle/icicle-inlet").disabled).toBe(false);
    });

    it("lets the Parent choose which Child to change Islands for, and remembers them on Children", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [bea, ali] });
      await showIslands();
      expect(getPageText()).toContain("Bea's Islands");
      expect(findIslandBadge("frost-isle")).toBe("Locked: above Bea's Year");

      findChildTile("Ali").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Ali's Islands");
      });
      expect(findIslandBadge("frost-isle")).toBe("Open: Ali's own Year");

      window.location.hash = "#children";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Ali's progress");
      });
    });

    it("asks a Parent with no Children yet to add one first", async () => {
      startFakeApi({ isSignedIn: true });
      showSection("islands");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "No Children yet. Add a Child to choose their Islands.",
        );
      });
    });

    it("says so when the Children can't be loaded", async () => {
      startFakeApi({ isSignedIn: true });
      vi.stubGlobal("fetch", (path: string) =>
        Promise.resolve(
          path === "/api/me"
            ? Response.json(fakeParentMe)
            : new Response(null, { status: 500 }),
        ),
      );
      showSection("islands");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't load your Children. Try again in a moment.",
        );
      });
    });
  });

  describe("Awards", () => {
    const ali: FakeChild = {
      ...bea,
      id: "0b0f7b1e-2222-4222-8222-222222222222",
      nickname: "Ali",
      characterName: "Zoom",
      ...inSchoolYear(2),
      stars: 36,
    };

    const meadowIsleUnderWay = {
      islandId: "meadow-isle",
      pickedUpFindIds: ["meadow-isle.rusty-key"],
      solvedPuzzleIds: [
        "meadow-isle.open-the-shed",
        "meadow-isle.whistle-for-officer-patel",
      ],
    };

    const showAwards = async () => {
      showSection("awards");
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(document.querySelector(".award-cards")).not.toBeNull();
      });
    };

    const findStarAmount = (stars: number) =>
      findElement(`input[name="stars"][value="${String(stars)}"]`, isInput);

    const findGiveButton = () =>
      findElement("form.give-stars button[type='submit']", isButton);

    const findQuestCard = (islandName: string): HTMLElement => {
      const questCard = [...document.querySelectorAll(".quest-card")].find(
        (candidate) =>
          candidate.querySelector("h4")?.textContent.startsWith(islandName),
      );
      if (!(questCard instanceof HTMLElement)) {
        throw new Error(`the page has no Quest for ${islandName}`);
      }
      return questCard;
    };

    const readAwardNews = () =>
      document.querySelector(".award-news")?.textContent;

    it("lists Awards after Children in the Family's part of the sidebar, and shows each Child's tile at the top", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali, bea] });

      await showAwards();

      expect(findCurrentSidebarEntry()).toBe("Awards");
      expect(document.querySelector("h1")?.textContent).toBe("Awards");
      expect(findChildTile("Ali").getAttribute("aria-pressed")).toBe("true");
      expect(findChildTile("Bea").getAttribute("aria-pressed")).toBe("false");
      expect(getPageText()).toContain("Ali's Awards");
    });

    it("shows a Child's Stars beside a picture of them, and the Family Chest's progress", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        childAwards: { [ali.id]: { familyChestActivityCount: 12 } },
      });

      await showAwards();

      const [starsCard, chestCard] = document.querySelectorAll(".award-card");
      expect(starsCard.querySelector(".award-figure")?.textContent).toBe(
        "36 Stars to spend",
      );
      expect(
        starsCard.querySelector('[role="img"]')?.getAttribute("aria-label"),
      ).toBe("Three gold Stars for Ali's 36 Stars");
      expect(chestCard.querySelector(".award-figure")?.textContent).toBe(
        "12 of 30 gold coins",
      );
      expect(
        findElement("progress.family-chest-meter", isHtmlElement).getAttribute(
          "value",
        ),
      ).toBe("12");
      expect(
        [...chestCard.querySelectorAll(".chest-facts > div")].map(
          (fact) =>
            `${fact.querySelector("dt")?.textContent ?? ""}: ${fact.querySelector("dd")?.textContent ?? ""}`,
        ),
      ).toEqual([
        "In the Chest: 12 coins",
        "To fill it: 18 Activities",
        "When it's full: A new Item each",
      ]);
    });

    it("says it is giving the Stars while it waits, with the Give button off", async () => {
      const { answerHeldRequests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        isHeld: (method, path) =>
          method === "POST" && path.endsWith("/star-awards"),
      });
      await showAwards();

      findGiveButton().click();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toContain("Giving Ali 5 Stars…");
      });
      expect(findGiveButton().disabled).toBe(true);
      expect(
        document.querySelector("form.give-stars")?.getAttribute("aria-busy"),
      ).toBe("true");

      answerHeldRequests();
      await vi.waitFor(() => {
        expect(getBusyLabels()).not.toContain("Giving Ali 5 Stars…");
      });
      expect(findGiveButton().disabled).toBe(false);
      expect(readAwardNews()).toContain("Ali has 5 more Stars");
    });

    it("gives a Child 5 Stars unless the Parent chooses 10 or 15", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      await showAwards();

      expect([5, 10, 15].map((stars) => findStarAmount(stars).checked)).toEqual(
        [true, false, false],
      );
      expect(findGiveButton().textContent).toBe("Give 5 Stars to Ali");

      findStarAmount(15).click();

      await vi.waitFor(() => {
        expect(findGiveButton().textContent).toBe("Give 15 Stars to Ali");
      });
    });

    it("gives a Child 10 Stars, shows their new total on the page and their tile, and says how many more they can have today", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
      });
      await showAwards();

      findStarAmount(10).click();
      await vi.waitFor(() => {
        expect(findGiveButton().textContent).toBe("Give 10 Stars to Ali");
      });
      findGiveButton().click();

      await vi.waitFor(() => {
        expect(readAwardNews()).toBe(
          "Ali has 10 more Stars, 46 Stars in all. Each Family Device gets them when it next goes online.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: `/api/children/${ali.id}/star-awards`,
        body: { stars: 10 },
      });
      expect(
        document.querySelector(".award-card .award-figure")?.textContent,
      ).toBe("46 Stars to spend");
      expect(
        findChildTile("Ali").querySelector(".child-tile-stats")?.textContent,
      ).toContain("46 Stars");
      expect(getPageText()).toContain(
        "Given today: 10 of 15. You can give Ali 5 Stars more today",
      );
      expect(
        [5, 10, 15].map((stars) => findStarAmount(stars).disabled),
      ).toEqual([false, true, true]);
      expect(findStarAmount(5).checked).toBe(true);
    });

    it("lets a Parent give no more once a Child has had 15 Stars today", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        childAwards: { [ali.id]: { starsGivenToday: 15 } },
      });

      await showAwards();

      expect(
        [5, 10, 15].map((stars) => findStarAmount(stars).disabled),
      ).toEqual([true, true, true]);
      expect(findGiveButton().disabled).toBe(true);
      expect(findGiveButton().textContent).toBe("No more Stars today");
      expect(getPageText()).toContain(
        "You've given Ali 15 Stars today, the most for one day. You can give more tomorrow.",
      );
    });

    it("says so when another Parent has already given the day's Stars", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        starAwardStatus: 409,
      });
      await showAwards();

      findGiveButton().click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Ali has had the most Stars for one day already. You can give more tomorrow.",
        );
      });
    });

    it("says so when the Stars can't be given", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        starAwardStatus: 500,
      });
      await showAwards();

      findGiveButton().click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't give Ali those Stars. Try again in a moment.",
        );
      });
      expect(
        document.querySelector(".award-card .award-figure")?.textContent,
      ).toBe("36 Stars to spend");
    });

    it("shows every Island's Quest by Year, with how far the Child has got", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [
          {
            ...ali,
            limits: {
              ...noLimits,
              exploreLockedIslandIds: ["sunscorch-sands"],
            },
          },
        ],
        childAwards: { [ali.id]: { questProgress: [meadowIsleUnderWay] } },
      });

      await showAwards();

      expect(
        [...document.querySelectorAll(".quest-card h4")].map(
          ({ textContent }) => textContent,
        ),
      ).toEqual([
        "Meadow Isle, Year 1",
        "Frost Isle, Year 2",
        "Sunscorch Sands, Year 3",
        "Jungle Reach, Year 4",
        "Ember Isle, Year 5",
        "Starfall Isle, Year 6",
      ]);
      const meadowIsle = findQuestCard("Meadow Isle");
      expect(meadowIsle.dataset.state).toBe("under-way");
      expect(meadowIsle.querySelector(".quest-card-title")?.textContent).toBe(
        "The Great Meadow Fair",
      );
      expect(meadowIsle.querySelector(".quest-card-count")?.textContent).toBe(
        "2 of 30 steps done",
      );
      expect(findQuestCard("Frost Isle").dataset.state).toBe("not-started");
      expect(findQuestCard("Jungle Reach").querySelector(".lock-note")).toBe(
        null,
      );
      expect(findQuestCard("Sunscorch Sands").textContent).toContain(
        "Sunscorch Sands is locked for Ali to explore, so this Quest waits until it's open again.",
      );
      expect(getPageText()).toContain("Ali has finished 0 of 6.");
    });

    it("opens the Quest under way, listing what is done and what is still to do, with a line about each step", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        childAwards: { [ali.id]: { questProgress: [meadowIsleUnderWay] } },
      });

      await showAwards();

      const meadowIsle = findQuestCard("Meadow Isle");
      expect(meadowIsle.querySelector("details")?.open).toBe(true);
      expect(findQuestCard("Frost Isle").querySelector("details")?.open).toBe(
        false,
      );
      expect(
        [...meadowIsle.querySelectorAll("h5")].map(
          ({ textContent }) => textContent,
        ),
      ).toEqual(["Still to do (28)", "Done (2)"]);
      const steps = [...meadowIsle.querySelectorAll(".quest-step")];
      const shed = steps.find(
        (step) =>
          step.querySelector(".quest-step-title")?.textContent ===
          "Open the garden shed · Garden Shed",
      );
      expect(shed?.getAttribute("data-state")).toBe("solved");
      expect(shed?.querySelector(".quest-step-about")?.textContent).toContain(
        "The rusty key turns and the door swings open.",
      );
      const gate = steps.find((step) =>
        step
          .querySelector(".quest-step-title")
          ?.textContent.startsWith("Open the fairground gate"),
      );
      expect(gate?.getAttribute("data-state")).toBe("ready");
      expect(gate?.querySelector(".quest-step-badge")?.textContent).toBe(
        "Ready to do now",
      );
      expect(gate?.querySelector(".quest-step-about")?.textContent).toBe(
        "You need a ticket to get through the fairground gate. Officer Patel hands them out to helpful people.",
      );
      expect(gate?.querySelector(".quest-step-question")?.textContent).toMatch(
        /^Ends with a question: /,
      );
    });

    it("shows a finished Quest's Trophy", async () => {
      startFakeApi({
        isSignedIn: true,
        familyChildren: [ali],
        childAwards: {
          [ali.id]: {
            questProgress: [
              {
                islandId: "meadow-isle",
                pickedUpFindIds: [],
                solvedPuzzleIds: meadowIsleQuest.puzzles.map(({ id }) => id),
              },
            ],
          },
        },
      });

      await showAwards();

      const meadowIsle = findQuestCard("Meadow Isle");
      expect(meadowIsle.dataset.state).toBe("finished");
      expect(meadowIsle.querySelector(".quest-card-state")?.textContent).toBe(
        "Finished",
      );
      expect(meadowIsle.querySelector(".quest-card-trophy")?.textContent).toBe(
        `Ali won the ${meadowIsleQuest.trophyName} Trophy and 50 Stars.`,
      );
      expect(getPageText()).toContain("Ali has finished 1 of 6.");
    });

    it("shows the Awards of the Child chosen from the tiles", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [ali, bea],
      });
      await showAwards();

      findChildTile("Bea").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Bea's Awards");
      });
      expect(requests).toContainEqual({
        method: "GET",
        path: `/api/children/${bea.id}/awards`,
        body: undefined,
      });
    });

    it("draws flat pictures of the Stars and the Family Chest where the browser can't draw 3D", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });

      await showAwards();

      expect(document.querySelector(".flat-stars")).not.toBeNull();
      expect(document.querySelector(".flat-chest")).not.toBeNull();
      expect(document.querySelector("canvas")).toBeNull();
    });

    it("asks a Parent with no Children yet to add one first", async () => {
      startFakeApi({ isSignedIn: true });
      showSection("awards");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "No Children yet. Add a Child to see their Awards.",
        );
      });
    });

    it("says so when a Child's Awards can't be loaded", async () => {
      startFakeApi({ isSignedIn: true, familyChildren: [ali] });
      const fakeFetch = vi.mocked(fetch);
      vi.stubGlobal("fetch", (path: string, init?: RequestInit) =>
        path.endsWith("/awards")
          ? Promise.resolve(new Response(null, { status: 500 }))
          : fakeFetch(path, init),
      );
      showSection("awards");

      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't load Ali's Awards. Try again in a moment.",
        );
      });
    });
  });

  describe("on this device", () => {
    beforeEach(() => {
      showSection("this-device");
    });

    const waitForDeviceReadiness = async () => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain("installed on this device.");
      });
    };

    it.each([
      { device: "an iPhone", userAgent: iPhoneUserAgent, maxTouchPoints: 5 },
      {
        device: "an iPad, which Safari presents as a Mac",
        userAgent: macUserAgent,
        maxTouchPoints: 5,
      },
    ])(
      "shows the Parent how to add Wizzaroo to the Home Screen on $device where it isn't installed",
      async ({ userAgent, maxTouchPoints }) => {
        stubDevice({ userAgent, maxTouchPoints });
        startFakeApi({ isSignedIn: true });

        root.render(<ParentPage />);

        await waitForDeviceReadiness();
        expect(getPageText()).toContain(
          "Wizzaroo isn't installed on this device.",
        );
        expect(getPageText()).toContain(
          "Safari deletes the play saved on this device after 7 days without a visit",
        );
        expect(getPageText()).toContain(homeScreenStep);
      },
    );

    it.each([
      { how: "from the Home Screen", device: { isSafariHomeScreenApp: true } },
      { how: "as a standalone app", device: { isShownStandalone: true } },
    ])(
      "says Wizzaroo is installed, without the Home Screen steps, on an iPhone that opened it $how",
      async ({ device }) => {
        stubDevice({
          userAgent: iPhoneUserAgent,
          maxTouchPoints: 5,
          ...device,
        });
        startFakeApi({ isSignedIn: true });

        root.render(<ParentPage />);

        await waitForDeviceReadiness();
        expect(getPageText()).toContain(
          "Wizzaroo is installed on this device.",
        );
        expect(getPageText()).not.toContain(homeScreenStep);
      },
    );

    it("doesn't show the Home Screen steps on a Mac, which keeps play saved without them", async () => {
      stubDevice({ userAgent: macUserAgent, maxTouchPoints: 0 });
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForDeviceReadiness();
      expect(getPageText()).not.toContain(homeScreenStep);
    });

    it("asks the browser to keep the play saved, and says so when it agrees", async () => {
      const storage = stubDevice({
        isStoragePersistent: false,
        grantsPersistentStorage: true,
      });
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForDeviceReadiness();
      expect(storage.persistRequests).toBe(1);
      expect(getPageText()).toContain(
        "This browser has agreed to keep the play saved on this device.",
      );
    });

    it("warns the Parent, and suggests installing Wizzaroo, when the browser won't keep the play saved", async () => {
      stubDevice({
        isStoragePersistent: false,
        grantsPersistentStorage: false,
      });
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForDeviceReadiness();
      expect(getPageText()).toContain(
        "This browser may delete the play saved on this device",
      );
      expect(getPageText()).toContain(
        "Installing Wizzaroo from the browser's menu",
      );
    });

    it("doesn't ask the browser again once it already keeps the play saved", async () => {
      const storage = stubDevice({ isStoragePersistent: true });
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForDeviceReadiness();
      expect(storage.persistRequests).toBe(0);
      expect(getPageText()).toContain(
        "This browser has agreed to keep the play saved on this device.",
      );
    });

    it("still shows the Parent how this device is set up when the server can't be reached", async () => {
      stubDevice({ userAgent: iPhoneUserAgent, maxTouchPoints: 5 });
      vi.stubGlobal("fetch", () =>
        Promise.reject(new TypeError("Failed to fetch")),
      );

      root.render(<ParentPage />);

      await waitForDeviceReadiness();
      expect(getPageText()).toContain("Wizzaroo couldn't load your account.");
      expect(getPageText()).toContain(homeScreenStep);
    });
  });

  describe("Your account", () => {
    beforeEach(() => {
      showSection("account");
    });

    const showAccount = async () => {
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Your email address is");
      });
    };

    const getStatusText = () =>
      document.querySelector('[role="status"]')?.textContent;

    const getAlertText = () =>
      document.querySelector('[role="alert"]')?.textContent;

    const fillPasswordForm = (answers: Record<string, string>) => {
      for (const [name, answer] of Object.entries(answers)) {
        findElement(`input[name="${name}"]`, isInput).value = answer;
      }
      findButton("Change my password").click();
    };

    it("shows a Parent their email address, says it isn't confirmed yet, and sends a link to confirm it", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showAccount();

      expect(getPageText()).toContain(
        "Your email address is owner@example.com. It isn't confirmed yet.",
      );
      findButton("Send me a link to confirm it").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Wizzaroo has sent a link to owner@example.com. Your email address is confirmed once you open it.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/email-address-checks",
        body: { email: ownerEmail },
      });
    });

    it("says a confirmed email address is confirmed, and offers no link for it", async () => {
      startFakeApi({
        isSignedIn: true,
        emailAddress: { email: ownerEmail, isConfirmed: true },
      });

      await showAccount();

      expect(getPageText()).toContain(
        "Your email address is owner@example.com, and it's confirmed.",
      );
      expect(() => findButton("Send me a link to confirm it")).toThrow();
    });

    it("sends a link to a new email address once the Parent gives their password, which becomes the Parent's once it's opened", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showAccount();

      findButton("Change your email address").click();
      await vi.waitFor(() => {
        expect(document.querySelector('input[name="email"]')).not.toBeNull();
      });
      findElement('input[name="email"]', isInput).value = "new@example.com";
      findElement('input[name="currentPassword"]', isInput).value =
        ownerPassword;
      findButton("Send a link to confirm it").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Wizzaroo has sent a link to new@example.com. Your email address is confirmed once you open it.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/email-address-checks",
        body: { email: "new@example.com", currentPassword: ownerPassword },
      });
    });

    it("asks a Teacher for a code rather than their password before their email address moves, and sends the code", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        roles: ["teacher"],
        signInMethods: {
          hasPassword: true,
          passkeys: [],
          isTwoFactorOn: true,
          recoveryCodesLeft: 10,
        },
      });
      await showAccount();

      findButton("Change your email address").click();
      await vi.waitFor(() => {
        expect(document.querySelector('input[name="email"]')).not.toBeNull();
      });
      expect(
        document.querySelector('input[name="currentPassword"]'),
      ).toBeNull();
      findElement('input[name="email"]', isInput).value = "new@example.com";
      findElement('input[name="code"]', isInput).value = rightTwoFactorCode;
      findButton("Send a link to confirm it").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Wizzaroo has sent a link to new@example.com. Your email address is confirmed once you open it.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/email-address-checks",
        body: { email: "new@example.com", code: rightTwoFactorCode },
      });
    });

    it("tells a Teacher with no second factor to set one up before their email address can move", async () => {
      startFakeApi({ isSignedIn: true, roles: ["teacher"] });
      await showAccount();

      findButton("Change your email address").click();
      await vi.waitFor(() => {
        expect(document.querySelector('input[name="email"]')).not.toBeNull();
      });

      expect(
        document.querySelector('input[name="currentPassword"]'),
      ).toBeNull();
      expect(() => findButton("Send a link to confirm it")).toThrow();
      expect(getAlertText()).toBe(
        "Set up a passkey or two-factor authentication first, then change your email address.",
      );
    });

    it.each([
      {
        status: 403,
        problem:
          "That didn't prove it's you, so Wizzaroo sent nothing. Try again.",
      },
      { status: 400, problem: "That isn't an email address." },
      {
        status: 500,
        problem: "Wizzaroo couldn't send the link. Try again in a moment.",
      },
    ])(
      'says "$problem" when the server answers $status to a new email address',
      async ({ status, problem }) => {
        startFakeApi({ isSignedIn: true, emailAddressCheckStatus: status });
        await showAccount();

        findButton("Change your email address").click();
        await vi.waitFor(() => {
          expect(document.querySelector('input[name="email"]')).not.toBeNull();
        });
        findElement('input[name="email"]', isInput).value = "taken@example.com";
        findButton("Send a link to confirm it").click();

        await vi.waitFor(() => {
          expect(getAlertText()).toBe(problem);
        });
      },
    );

    it("signs out the adult's other browsers, keeping this one, with no password asked for", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showAccount();

      findButton("Sign out your other browsers").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "You're signed out on every other browser. This one stays signed in.",
        );
      });
      expect(requests).toContainEqual({
        method: "DELETE",
        path: "/api/other-sign-ins",
        body: undefined,
      });
      expect(getPageText()).toContain("Your email address is");
    });

    it("says so when Wizzaroo couldn't sign out the other browsers", async () => {
      startFakeApi({ isSignedIn: true, otherSignInsRemovalStatus: 500 });
      await showAccount();

      findButton("Sign out your other browsers").click();

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't sign out your other browsers. Try again in a moment.",
        );
      });
    });

    it("changes the password, and says the notice went to the confirmed email address", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        emailAddress: { email: ownerEmail, isConfirmed: true },
      });
      await showAccount();

      findButton("Change your password").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Current password");
      });
      fillPasswordForm({
        currentPassword: ownerPassword,
        newPassword: "a-brand-new-long-password",
        repeatedPassword: "a-brand-new-long-password",
      });

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Your password is changed, and you're signed out on every other browser. Wizzaroo has emailed owner@example.com to say so.",
        );
      });
      expect(requests).toContainEqual({
        method: "PUT",
        path: "/api/password",
        body: {
          currentPassword: ownerPassword,
          newPassword: "a-brand-new-long-password",
        },
      });
    });

    it("doesn't claim to have emailed an address that isn't confirmed", async () => {
      startFakeApi({ isSignedIn: true });
      await showAccount();

      findButton("Change your password").click();
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Current password");
      });
      fillPasswordForm({
        currentPassword: ownerPassword,
        newPassword: "a-brand-new-long-password",
        repeatedPassword: "a-brand-new-long-password",
      });

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Your password is changed, and you're signed out on every other browser.",
        );
      });
    });

    it.each([
      {
        newPassword: "elevenchars",
        repeatedPassword: "elevenchars",
        problem: "The new password needs at least 12 characters.",
      },
      {
        newPassword: "a-brand-new-long-password",
        repeatedPassword: "a-brand-new-long-passwerd",
        problem: "The two new passwords don't match.",
      },
    ])(
      'says "$problem" and sends nothing',
      async ({ newPassword, repeatedPassword, problem }) => {
        const { requests } = startFakeApi({ isSignedIn: true });
        await showAccount();

        findButton("Change your password").click();
        await vi.waitFor(() => {
          expect(getPageText()).toContain("Current password");
        });
        fillPasswordForm({
          currentPassword: ownerPassword,
          newPassword,
          repeatedPassword,
        });

        await vi.waitFor(() => {
          expect(getAlertText()).toBe(problem);
        });
        expect(requests.map(({ path }) => path)).not.toContain("/api/password");
      },
    );

    it.each([
      { status: 403, problem: "That isn't your current password." },
      {
        status: 500,
        problem:
          "Wizzaroo couldn't change your password. Try again in a moment.",
      },
    ])(
      'says "$problem" when the server answers $status to a password change',
      async ({ status, problem }) => {
        startFakeApi({ isSignedIn: true, passwordChangeStatus: status });
        await showAccount();

        findButton("Change your password").click();
        await vi.waitFor(() => {
          expect(getPageText()).toContain("Current password");
        });
        fillPasswordForm({
          currentPassword: "not-the-password",
          newPassword: "a-brand-new-long-password",
          repeatedPassword: "a-brand-new-long-password",
        });

        await vi.waitFor(() => {
          expect(getAlertText()).toBe(problem);
        });
      },
    );
  });

  describe("passkeys, the password and two-factor authentication", () => {
    beforeEach(() => {
      showSection("account");
    });

    const phonePasskey = {
      id: "cGhvbmU",
      name: "My phone",
      createdAt: "2026-11-14T10:00:00.000Z",
    };

    const showSigningIn = async () => {
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Signing in");
      });
    };

    const getStatusText = () =>
      document.querySelector('[role="status"]')?.textContent;

    const getAlertText = () =>
      document.querySelector('[role="alert"]')?.textContent;

    const fillAnswers = (answers: Record<string, string>) => {
      for (const [name, answer] of Object.entries(answers)) {
        findElement(`input[name="${name}"]`, isInput).value = answer;
      }
    };

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    it("adds a passkey with the name the Parent gives it, then lists it", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      vi.mocked(startRegistration).mockResolvedValue(fakePasskeyRegistration);
      await showSigningIn();
      expect(getPageText()).toContain("You have no passkeys yet.");

      findButton("Add a passkey").click();
      await waitForText("What is it on?");
      fillAnswers({ passkeyName: " My phone " });
      findButton("Add the passkey").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Your passkey on My phone is added.");
      });
      await waitForText("My phone, added 14 November 2026");
      const [[{ optionsJSON }]] = vi.mocked(startRegistration).mock.calls;
      expect(optionsJSON.challenge).toBe("a-registration-challenge");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/passkeys",
        body: { name: "My phone", response: fakePasskeyRegistration },
      });
    });

    it("adds another passkey beside the first, then lists both", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      vi.mocked(startRegistration).mockResolvedValue(fakePasskeyRegistration);
      await showSigningIn();
      findButton("Add a passkey").click();
      await waitForText("What is it on?");
      fillAnswers({ passkeyName: "My phone" });
      findButton("Add the passkey").click();
      await waitForText("My phone, added 14 November 2026");

      findButton("Add another passkey").click();
      await waitForText("What is it on?");
      fillAnswers({ passkeyName: "My laptop" });
      findButton("Add the passkey").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Your passkey on My laptop is added.");
      });
      await waitForText("My phone, added 14 November 2026");
      await waitForText("My laptop, added 14 November 2026");
      expect(
        requests.filter(
          ({ method, path }) => method === "POST" && path === "/api/passkeys",
        ),
      ).toHaveLength(2);
    });

    it("says Wizzaroo couldn't add the passkey when the Parent cancels it, and keeps nothing", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      vi.mocked(startRegistration).mockRejectedValue(
        new DOMException("The operation was cancelled", "NotAllowedError"),
      );
      await showSigningIn();

      findButton("Add a passkey").click();
      await waitForText("What is it on?");
      fillAnswers({ passkeyName: "My phone" });
      findButton("Add the passkey").click();

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't add the passkey. Try again in a moment.",
        );
      });
      expect(requests).not.toContainEqual(
        expect.objectContaining({ method: "POST", path: "/api/passkeys" }),
      );
    });

    it("offers only the phone on a browser that can't keep a passkey", async () => {
      vi.mocked(browserSupportsWebAuthn).mockReturnValue(false);
      startFakeApi({ isSignedIn: true });
      await showSigningIn();

      findButton("Add a passkey").click();

      await waitForText(
        "This browser can't keep a passkey, but your phone can.",
      );
      expect(() => findButton("Add the passkey")).toThrow();
      await vi.waitFor(() => {
        expect(
          document.querySelector(
            'svg[aria-label="QR code to add a passkey on your phone"]',
          ),
        ).not.toBeNull();
      });
    });

    it("shows a QR code that adds a passkey on the Parent's phone, and makes a new one when asked", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showSigningIn();

      findButton("Add a passkey").click();

      await waitForText("Add one on your phone");
      await vi.waitFor(() => {
        expect(
          document
            .querySelector(
              'svg[aria-label="QR code to add a passkey on your phone"] path',
            )
            ?.getAttribute("d"),
        ).toMatch(/^M\d/);
      });
      expect(getPageText()).toContain("The code works once, until");
      findButton("Make a new code").click();
      await vi.waitFor(() => {
        expect(
          requests.filter(({ path }) => path === "/api/passkey-hand-offs"),
        ).toHaveLength(2);
      });
      findButton("I've added it on my phone").click();
      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Your passkeys are up to date.");
      });
    });

    it("adds a passkey on a phone that opened the QR code's link, without signing in", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      vi.mocked(startRegistration).mockResolvedValue(fakePasskeyRegistration);
      root.render(<ParentPage passkeyHandOffToken="a-hand-off-token" />);
      await waitForText("Add a passkey on this phone");

      fillAnswers({ passkeyName: " My phone " });
      findButton("Add the passkey").click();

      await waitForText(
        "Passkey added. You can now sign in on this phone with it.",
      );
      const [[{ optionsJSON }]] = vi.mocked(startRegistration).mock.calls;
      expect(optionsJSON.challenge).toBe("a-hand-off-challenge");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/passkey-hand-off-passkeys",
        body: {
          token: "a-hand-off-token",
          name: "My phone",
          response: fakePasskeyRegistration,
        },
      });
    });

    it("says a QR code's link has expired or been used", async () => {
      startFakeApi({ isSignedIn: false, passkeyHandOffStatus: 404 });
      root.render(<ParentPage passkeyHandOffToken="a-used-token" />);
      await waitForText("Add a passkey on this phone");

      fillAnswers({ passkeyName: "My phone" });
      findButton("Add the passkey").click();

      await waitForText("That code has expired or has already been used.");
      expect(startRegistration).not.toHaveBeenCalled();
    });

    it("removes a passkey while the Parent has a password", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: true,
          passkeys: [phonePasskey],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
      });
      await showSigningIn();

      findButton("Remove My phone").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Your passkey on My phone is removed.");
      });
      await waitForText("You have no passkeys yet.");
      expect(requests).toContainEqual({
        method: "DELETE",
        path: "/api/passkeys/cGhvbmU",
        body: undefined,
      });
    });

    it("says why Wizzaroo kept a Parent's last way to sign in", async () => {
      startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: false,
          passkeys: [phonePasskey],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
        signInMethodRemovalStatus: 409,
      });
      await showSigningIn();
      expect(getPageText()).toContain(
        "You have no password, so you sign in with a passkey.",
      );

      findButton("Remove My phone").click();

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That's your last way to sign in, so Wizzaroo kept it. Add a passkey or a password first.",
        );
      });
      expect(getPageText()).toContain("My phone, added 14 November 2026");
    });

    it("offers to remove the password only to a Parent who has a passkey", async () => {
      startFakeApi({ isSignedIn: true });

      await showSigningIn();

      expect(() => findButton("Remove your password")).toThrow();
    });

    it("removes the password of a Parent with a passkey, given the current one, then offers to set one", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: true,
          passkeys: [phonePasskey],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
      });
      await showSigningIn();

      findButton("Remove your password").click();
      await waitForText("Current password");
      fillAnswers({ currentPassword: ownerPassword });
      findButton("Remove my password").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Your password is removed, and you're signed out on every other browser. You sign in with a passkey now.",
        );
      });
      await vi.waitFor(() => {
        expect(findButton("Set a password")).toBeDefined();
      });
      expect(requests).toContainEqual({
        method: "DELETE",
        path: "/api/password",
        body: { currentPassword: ownerPassword },
      });
    });

    it("says why Wizzaroo kept the password when it's the last way to sign in", async () => {
      startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: true,
          passkeys: [phonePasskey],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
        signInMethodRemovalStatus: 409,
      });
      await showSigningIn();

      findButton("Remove your password").click();
      await waitForText("Current password");
      fillAnswers({ currentPassword: ownerPassword });
      findButton("Remove my password").click();

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That's your last way to sign in, so Wizzaroo kept it. Add a passkey or a password first.",
        );
      });
    });

    it("sets a password for a Parent who has none", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: false,
          passkeys: [phonePasskey],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
      });
      await showSigningIn();

      findButton("Set a password").click();
      await waitForText("The new password again");
      fillAnswers({
        newPassword: "a-brand-new-long-password",
        repeatedPassword: "a-brand-new-long-password",
      });
      findButton("Set my password").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Your password is set. You can sign in with it or with a passkey.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/password",
        body: { newPassword: "a-brand-new-long-password" },
      });
    });

    it("makes a sign-in code for another device once the Parent proves it's them, and shows it with a QR code", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showSigningIn();

      findButton("Sign in on another device").click();
      await waitForText("Prove it's you first");
      fillAnswers({ currentPassword: "not-the-password" });
      findButton("Make a sign-in code").click();
      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That didn't prove it's you, so Wizzaroo made no code. Try again.",
        );
      });
      fillAnswers({ currentPassword: ownerPassword });
      findButton("Make a sign-in code").click();

      await waitForText("7KQ2M-X9TPA");
      expect(getPageText()).toContain(
        "Choose Sign in with a code from another device",
      );
      expect(
        document
          .querySelector(
            'svg[aria-label="QR code to sign in on another device"] path',
          )
          ?.getAttribute("d"),
      ).toMatch(/^M\d/);
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/sign-in-codes",
        body: { currentPassword: ownerPassword },
      });
      findButton("Done").click();
      await waitForText("Sign in on another device");
    });

    it("turns two-factor authentication on with a code from the app, then shows the recovery codes only once", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      await showSigningIn();
      expect(getPageText()).toContain("Two-factor authentication is off.");

      findButton("Turn on two-factor authentication").click();
      await waitForText("ABCD EFGH IJKL MNOP");
      expect(
        findElement('a[href^="otpauth:"]', isLink).getAttribute("href"),
      ).toBe("otpauth://totp/Wizzaroo:owner%40example.com?secret=ABCD");
      expect(
        document
          .querySelector(
            'svg[aria-label="QR code to add Wizzaroo to your authenticator app"] path',
          )
          ?.getAttribute("d"),
      ).toMatch(/^M\d/);
      fillAnswers({ code: "000000" });
      findButton("Turn on two-factor authentication").click();
      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That code didn't work. Try the newest one.",
        );
      });
      fillAnswers({ code: rightTwoFactorCode });
      findButton("Turn on two-factor authentication").click();

      await waitForText("Save your recovery codes");
      for (const recoveryCode of fakeRecoveryCodes) {
        expect(getPageText()).toContain(recoveryCode);
      }
      findButton("I've saved my recovery codes").click();
      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Two-factor authentication is on.");
      });
      await waitForText("You have 10 recovery codes left.");
      expect(getPageText()).not.toContain(fakeRecoveryCodes[0]);
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/two-factor",
        body: { code: rightTwoFactorCode },
      });
    });

    it("turns two-factor authentication off with a code", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: true,
          passkeys: [],
          isTwoFactorOn: true,
          recoveryCodesLeft: 7,
        },
      });
      await showSigningIn();
      expect(getPageText()).toContain("You have 7 recovery codes left.");

      findButton("Turn off two-factor authentication").click();
      await waitForText(
        "A code from your authenticator app, or a recovery code",
      );
      fillAnswers({ code: rightTwoFactorCode });
      findButton("Turn off two-factor authentication").click();

      await vi.waitFor(() => {
        expect(getStatusText()).toBe("Two-factor authentication is off.");
      });
      await waitForText("Two-factor authentication is off. Turn it on");
      expect(requests).toContainEqual({
        method: "DELETE",
        path: "/api/two-factor",
        body: { code: rightTwoFactorCode },
      });
    });
  });

  describe("where each adult lands after signing in", () => {
    it("lands the owner on the Admin dashboard, with their Family's dashboard one tap away", async () => {
      startFakeApi({ isSignedIn: true, roles: ["admin", "parent"] });
      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(findCurrentSidebarEntry()).toBe("Schools");
      });
      expect(listSidebarGroups().map(({ heading }) => heading)).toEqual([
        "Running Wizzaroo",
        "Your Family",
        "You",
      ]);
      expect(document.querySelector('a[href="#children"]')).not.toBeNull();
    });

    it("lands a Teacher on their Year Groups, with no Family of their own to show", async () => {
      startFakeApi({ isSignedIn: true, roles: ["teacher"] });
      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(findCurrentSidebarEntry()).toBe("Your Year Groups");
      });
      expect(listSidebarGroups().map(({ heading }) => heading)).toEqual([
        "Your class",
        "You",
      ]);
    });

    it("keeps a Parent on their Family's dashboard, with no Admin or Teacher parts", async () => {
      startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(findCurrentSidebarEntry()).toBe("Children");
      });
      expect(listSidebarGroups().map(({ heading }) => heading)).toEqual([
        "Your Family",
        "You",
      ]);
    });
  });

  describe("the second factor Teachers and the Admin must have", () => {
    it("shows only their account until they turn on two-factor authentication, then their Family", async () => {
      startFakeApi({
        isSignedIn: true,
        roles: ["admin", "parent"],
        needsSecondFactor: true,
      });
      showSection("children");
      root.render(<ParentPage />);

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "they sign in with a passkey or two-factor authentication. Use a passkey you already have to carry on. If you have neither yet, add one below.",
        );
      });
      expect(getPageText()).not.toContain("Islands");
      expect(document.querySelector("h1")?.textContent).toBe("Your account");

      findButton("Turn on two-factor authentication").click();
      const codeInput = await vi.waitFor(() =>
        findElement('input[name="code"]', isInput),
      );
      codeInput.value = rightTwoFactorCode;
      findButton("Turn on two-factor authentication").click();
      const savedButton = await vi.waitFor(() =>
        findButton("I've saved my recovery codes"),
      );
      savedButton.click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Islands");
      });
      expect(getPageText()).not.toContain(
        "If you have neither yet, add one below.",
      );
    });

    it("lets them use a passkey they already have instead of adding another", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        roles: ["admin", "parent"],
        needsSecondFactor: true,
      });
      vi.mocked(startAuthentication).mockResolvedValue(fakePasskeySignIn);
      showSection("children");
      root.render(<ParentPage />);

      const useButton = await vi.waitFor(() => findButton("Use your passkey"));
      useButton.click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain("Islands");
      });
      expect(startAuthentication).toHaveBeenCalledWith({
        optionsJSON: { challenge: "a-confirmation-challenge" },
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/passkey-confirmations",
        body: { response: fakePasskeySignIn },
      });
      expect(getPageText()).not.toContain(
        "If you have neither yet, add one below.",
      );
    });
  });

  describe("a second factor a Teacher already has", () => {
    it("tells a Teacher who signed in with a password to use the passkey they have before adding another, then lets them in", async () => {
      startFakeApi({
        isSignedIn: true,
        roles: ["teacher"],
        needsSecondFactor: true,
        hasSecondFactorToProve: true,
      });
      vi.mocked(startAuthentication).mockResolvedValue(fakePasskeySignIn);
      root.render(<ParentPage />);

      const turnOnButton = await vi.waitFor(() =>
        findButton("Turn on two-factor authentication"),
      );
      turnOnButton.click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(secondFactorFirstMessage);
      });
      findButton("Use your passkey").click();
      await vi.waitFor(() => {
        expect(getPageText()).not.toContain(
          "If you have neither yet, add one below.",
        );
      });
    });
  });

  describe("a first second factor set up too late", () => {
    it("tells a Teacher whose days for setting one up from a password have passed to ask the Admin for a reset link", async () => {
      startFakeApi({
        isSignedIn: true,
        roles: ["teacher"],
        needsSecondFactor: true,
        isFirstSecondFactorSetupClosed: true,
      });
      root.render(<ParentPage />);

      const turnOnButton = await vi.waitFor(() =>
        findButton("Turn on two-factor authentication"),
      );
      turnOnButton.click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(secondFactorSetupClosedMessage);
      });
      expect(getPageText()).not.toContain(secondFactorFirstMessage);
      expect(getPageText()).not.toContain("Islands");
    });
  });

  describe("resetting a forgotten password", () => {
    const getStatusText = () =>
      document.querySelector('[role="status"]')?.textContent;

    const getAlertText = () =>
      document.querySelector('[role="alert"]')?.textContent;

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    const askForResetLink = async (email: string) => {
      await waitForText("Sign in to Wizzaroo");
      findButton("Forgot your password?").click();
      await waitForText("Reset your password");
      findElement('input[name="email"]', isInput).value = email;
      findButton("Email me a link").click();
    };

    const fillNewPassword = (newPassword: string, repeatedPassword: string) => {
      findElement('input[name="newPassword"]', isInput).value = newPassword;
      findElement('input[name="repeatedPassword"]', isInput).value =
        repeatedPassword;
      findButton("Reset my password").click();
    };

    it("asks for an email address from the sign-in form, and says a link is on its way without saying whether it has an account", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);

      await askForResetLink(ownerEmail);

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "If owner@example.com is the confirmed email address of a Wizzaroo account, a link to reset its password is on its way. The link works once, for 1 hour.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/password-reset-requests",
        body: { email: ownerEmail },
      });
    });

    it("goes back to signing in, sending nothing, when the Parent changes their mind", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      root.render(<ParentPage />);
      await waitForText("Sign in to Wizzaroo");
      findButton("Forgot your password?").click();
      await waitForText("Reset your password");

      findButton("Back to signing in").click();

      await waitForText("Sign in to Wizzaroo");
      expect(requests.map(({ path }) => path)).not.toContain(
        "/api/password-reset-requests",
      );
    });

    it("says Wizzaroo couldn't send a link when the server can't, and keeps the form", async () => {
      startFakeApi({ isSignedIn: false, passwordResetRequestStatus: 500 });
      root.render(<ParentPage />);

      await askForResetLink(ownerEmail);

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't send a link. Try again in a moment.",
        );
      });
      expect(findButton("Email me a link")).toBeDefined();
    });

    it("resets the password from the link with a new one typed twice, then asks the Parent to sign in with it", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      root.render(<ParentPage passwordResetToken="a-reset-token" />);
      await waitForText("Choose a new password");

      fillNewPassword("a-brand-new-long-password", "a-brand-new-long-password");

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Your password is changed, and every browser that was signed in to your account is signed out. Sign in with your new password.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/password-resets",
        body: {
          token: "a-reset-token",
          newPassword: "a-brand-new-long-password",
        },
      });
      expect(getPageText()).toContain("Sign in to Wizzaroo");
    });

    it("shows this browser signed out too once the password is reset", async () => {
      startFakeApi({ isSignedIn: true });
      root.render(<ParentPage passwordResetToken="a-reset-token" />);
      await waitForText("The Eyres");

      fillNewPassword("a-brand-new-long-password", "a-brand-new-long-password");

      await waitForText("Sign in to Wizzaroo");
      expect(getPageText()).not.toContain("The Eyres");
    });

    it.each([
      {
        newPassword: "elevenchars",
        repeatedPassword: "elevenchars",
        problem: "The new password needs at least 12 characters.",
      },
      {
        newPassword: "a-brand-new-long-password",
        repeatedPassword: "a-different-long-password",
        problem: "The two new passwords don't match.",
      },
    ])(
      "won't spend the link on a new password when $problem",
      async ({ newPassword, repeatedPassword, problem }) => {
        const { requests } = startFakeApi({ isSignedIn: false });
        root.render(<ParentPage passwordResetToken="a-reset-token" />);
        await waitForText("Choose a new password");

        fillNewPassword(newPassword, repeatedPassword);

        await vi.waitFor(() => {
          expect(getAlertText()).toBe(problem);
        });
        expect(requests.map(({ path }) => path)).not.toContain(
          "/api/password-resets",
        );
      },
    );

    it("says a link that has expired or was already used can't reset anything", async () => {
      startFakeApi({ isSignedIn: false, passwordResetStatus: 404 });
      root.render(<ParentPage passwordResetToken="a-used-token" />);
      await waitForText("Choose a new password");

      fillNewPassword("a-brand-new-long-password", "a-brand-new-long-password");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          'That link has expired or has already been used. Ask for a new one with "Forgot your password?".',
        );
      });
      expect(document.querySelector('input[name="newPassword"]')).toBeNull();
    });

    it("lets the Parent try again when the server can't reset the password", async () => {
      startFakeApi({ isSignedIn: false, passwordResetStatus: 500 });
      root.render(<ParentPage passwordResetToken="a-reset-token" />);
      await waitForText("Choose a new password");

      fillNewPassword("a-brand-new-long-password", "a-brand-new-long-password");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't reset your password. Try again in a moment.",
        );
      });
      expect(findButton("Reset my password")).toBeDefined();
    });
  });

  describe("Family Devices", () => {
    beforeEach(() => {
      showSection("family-devices");
    });

    const getAlertText = () =>
      document.querySelector('[role="alert"]')?.textContent;

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    const openFamilyDeviceForm = async () => {
      await waitForText("Signed-in Family Devices");
      findButton("Make this browser a Family Device").click();
      await waitForText("prove it's you first");
    };

    const makeThisBrowserAFamilyDevice = async (
      name: string,
      currentPassword = "the Parent's password",
    ) => {
      await openFamilyDeviceForm();
      findElement('input[name="familyDeviceName"]', isInput).value = name;
      findElement('input[name="currentPassword"]', isInput).value =
        currentPassword;
      findButton("Make it a Family Device").click();
    };

    it("lists the Family Devices that are signed in, with when each was signed in, and when and from where each was last used", async () => {
      startFakeApi({ isSignedIn: true, familyDevices: [kitchenTablet] });

      root.render(<ParentPage />);

      await waitForText(
        "Kitchen tablet, signed in 1 November 2026, last used 14 November 2026 at 15:30 from 203.0.113.41",
      );
      expect(findButton("Sign out Kitchen tablet")).toBeDefined();
    });

    it("says only when a Family Device was last used when it has no address on record", async () => {
      startFakeApi({
        isSignedIn: true,
        familyDevices: [{ ...kitchenTablet, lastSeenFrom: null }],
      });

      root.render(<ParentPage />);

      await waitForText(
        "Kitchen tablet, signed in 1 November 2026, last used 14 November 2026 at 15:30",
      );
      expect(getPageText()).not.toContain(" from ");
    });

    it("shows what it is doing while it makes this browser a Family Device, with its buttons held", async () => {
      const { answerHeldRequests } = startFakeApi({
        isSignedIn: true,
        isHeld: (method, path) =>
          (method === "GET" && path === "/api/sign-in-methods") ||
          (method === "POST" && path === "/api/family-devices"),
      });
      root.render(<ParentPage />);
      await waitForText("Signed-in Family Devices");

      findButton("Make this browser a Family Device").click();
      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual([
          "Checking how you can prove it's you…",
        ]);
      });
      expect(findButton("Make this browser a Family Device").disabled).toBe(
        true,
      );
      answerHeldRequests();
      await waitForText("prove it's you first");
      expect(getBusyLabels()).toEqual([]);

      findElement('input[name="familyDeviceName"]', isInput).value =
        "Kitchen tablet";
      findElement('input[name="currentPassword"]', isInput).value =
        "the Parent's password";
      findButton("Make it a Family Device").click();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual([
          "Checking it's you and making Kitchen tablet a Family Device…",
        ]);
      });
      expect(findButton("Make it a Family Device").disabled).toBe(true);
      expect(
        findButton("Make it a Family Device")
          .closest("form")
          ?.getAttribute("aria-busy"),
      ).toBe("true");

      answerHeldRequests();

      await waitForText("Sign in to Wizzaroo");
      expect(getBusyLabels()).toEqual([]);
    });

    it("shows which Family Device it is signing out until it has", async () => {
      const { answerHeldRequests } = startFakeApi({
        isSignedIn: true,
        familyDevices: [kitchenTablet],
        isHeld: (method, path) =>
          method === "DELETE" && path.startsWith("/api/family-devices/"),
      });
      root.render(<ParentPage />);
      await waitForText("Kitchen tablet, signed in");

      findButton("Sign out Kitchen tablet").click();

      await vi.waitFor(() => {
        expect(getBusyLabels()).toEqual(["Signing out Kitchen tablet…"]);
      });
      expect(findButton("Sign out Kitchen tablet").disabled).toBe(true);

      answerHeldRequests();

      await waitForText("No Family Devices are signed in.");
      expect(getBusyLabels()).toEqual([]);
    });

    it("says so when no Family Devices are signed in", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForText("No Family Devices are signed in.");
    });

    it("makes this browser a Family Device under the name the Parent gives, then shows the Parent they're signed out and where the Children play", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);

      await makeThisBrowserAFamilyDevice("  Kitchen tablet ");

      await waitForText("Sign in to Wizzaroo");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/family-devices",
        body: {
          name: "Kitchen tablet",
          currentPassword: "the Parent's password",
        },
      });
      expect(document.querySelector('[role="status"]')?.textContent).toBe(
        "This browser is now the Family Device Kitchen tablet, and you're signed out of it. Let the Children play",
      );
      expect(findElement('main a[href="/"]', isLink).textContent).toBe(
        "Let the Children play",
      );
      expect(getPageText()).not.toContain("The Eyres");
    });

    it("asks for a name before making this browser a Family Device", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);

      await makeThisBrowserAFamilyDevice("   ");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe("Give this browser a name first.");
      });
      expect(requests.map(({ method }) => method)).not.toContain("POST");
    });

    it("keeps the Parent signed in, and says so, when this browser can't be made a Family Device", async () => {
      startFakeApi({ isSignedIn: true, familyDeviceCreationStatus: 500 });
      root.render(<ParentPage />);

      await makeThisBrowserAFamilyDevice("Kitchen tablet");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't make this browser a Family Device. Try again in a moment.",
        );
      });
      expect(getPageText()).toContain("The Eyres");
    });

    it("asks a Parent with two-factor authentication for their password or a code, and sends the code they give", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: true,
          passkeys: [],
          isTwoFactorOn: true,
          recoveryCodesLeft: 8,
        },
      });
      root.render(<ParentPage />);
      await openFamilyDeviceForm();

      findElement('input[name="familyDeviceName"]', isInput).value =
        "Kitchen tablet";
      findElement('input[name="code"]', isInput).value = "123456";
      findButton("Make it a Family Device").click();

      await waitForText("Sign in to Wizzaroo");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/family-devices",
        body: { name: "Kitchen tablet", code: "123456" },
      });
    });

    it("lets a Parent with only a passkey prove it's them with it", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        signInMethods: {
          hasPassword: false,
          passkeys: [
            {
              id: "cGhvbmU",
              name: "My phone",
              createdAt: "2026-11-14T10:00:00.000Z",
            },
          ],
          isTwoFactorOn: false,
          recoveryCodesLeft: 0,
        },
      });
      vi.mocked(startAuthentication).mockResolvedValue(fakePasskeySignIn);
      root.render(<ParentPage />);
      await openFamilyDeviceForm();
      expect(document.querySelector('input[name="currentPassword"]')).toBe(
        null,
      );
      expect(getPageText()).not.toContain("Make it a Family Device");

      findElement('input[name="familyDeviceName"]', isInput).value =
        "Kitchen tablet";
      findButton("Use your passkey and make it a Family Device").click();

      await waitForText("Sign in to Wizzaroo");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/family-devices",
        body: { name: "Kitchen tablet", passkey: fakePasskeySignIn },
      });
    });

    it("keeps the Parent signed in, and says so, when their proof is wrong", async () => {
      startFakeApi({ isSignedIn: true, familyDeviceCreationStatus: 403 });
      root.render(<ParentPage />);

      await makeThisBrowserAFamilyDevice("Kitchen tablet", "a wrong password");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That didn't prove it's you, so this browser isn't a Family Device. Try again.",
        );
      });
      expect(getPageText()).toContain("The Eyres");
    });

    it("says to wait when too many proofs have been tried", async () => {
      startFakeApi({ isSignedIn: true, familyDeviceCreationStatus: 429 });
      root.render(<ParentPage />);

      await makeThisBrowserAFamilyDevice("Kitchen tablet");

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Too many tries. Wait a while, then try again.",
        );
      });
    });

    it("signs a Family Device out and stops listing it", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyDevices: [kitchenTablet],
      });
      root.render(<ParentPage />);
      await waitForText("Kitchen tablet, signed in");

      findButton("Sign out Kitchen tablet").click();

      await waitForText("No Family Devices are signed in.");
      expect(requests).toContainEqual({
        method: "DELETE",
        path: `/api/family-devices/${kitchenTablet.id}`,
        body: undefined,
      });
    });

    it("keeps listing a Family Device, and says so, when it can't be signed out", async () => {
      startFakeApi({
        isSignedIn: true,
        familyDevices: [kitchenTablet],
        familyDeviceSignOutStatus: 500,
      });
      root.render(<ParentPage />);
      await waitForText("Kitchen tablet, signed in");

      findButton("Sign out Kitchen tablet").click();

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't sign that Family Device out. Try again in a moment.",
        );
      });
      expect(getPageText()).toContain("Kitchen tablet, signed in");
    });

    it("puts the form away when the Parent cancels", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage />);
      await waitForText("Signed-in Family Devices");
      findButton("Make this browser a Family Device").click();
      await waitForText("Make it a Family Device");

      findButton("Cancel").click();

      await vi.waitFor(() => {
        expect(getPageText()).not.toContain("Make it a Family Device");
      });
      expect(requests.map(({ method }) => method)).not.toContain("POST");
    });

    it("says so when the Family Devices can't be loaded", async () => {
      startFakeApi({ isSignedIn: true, familyDevicesStatus: 500 });

      root.render(<ParentPage />);

      await waitForText(
        "Wizzaroo couldn't load your Family Devices. Try again in a moment.",
      );
    });
  });

  describe("no Invites from Parents", () => {
    it("offers a Parent no way to invite anyone, and never asks the API to", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      showSection("invites");
      root.render(<ParentPage />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("The Eyres");
        expect(document.querySelector(".busy")).toBeNull();
      });

      expect(getPageText()).not.toContain("Invite a Parent");
      expect(document.querySelector('a[href="#invites"]')).toBeNull();
      expect(
        Array.from(
          document.querySelectorAll("button"),
          (button) => button.textContent,
        ).filter((label) => /invite/i.test(label)),
      ).toEqual([]);
      expect(
        requests.filter(
          ({ path }) =>
            path.startsWith("/api/invites") ||
            path.startsWith("/api/parents") ||
            path.startsWith("/api/teachers") ||
            path.includes("/invites"),
        ),
      ).toEqual([]);
    });
  });

  describe("setting up a login from an Invite", () => {
    const newPassword = "jo's-own-long-password";

    const getStatusText = () =>
      document.querySelector('[role="status"]')?.textContent;

    const getAlertText = () =>
      document.querySelector('[role="alert"]')?.textContent;

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    const fillInviteAcceptance = (
      password: string,
      repeatedPassword = password,
    ) => {
      const { form } = findButton("Set up my login");
      if (form === null) {
        throw new Error("the Set up my login button is outside a form");
      }
      const findInviteInput = (name: string) => {
        const input = form.querySelector(`input[name="${name}"]`);
        if (!(input instanceof HTMLInputElement)) {
          throw new Error(`the Invite form has no ${name} input`);
        }
        return input;
      };
      findInviteInput("newPassword").value = password;
      findInviteInput("repeatedPassword").value = repeatedPassword;
      findButton("Set up my login").click();
    };

    it("asks only for a password, since the Invite already names the email address, then signs in", async () => {
      const { requests } = startFakeApi({ isSignedIn: false });
      root.render(<ParentPage inviteToken="an-invite-token" />);
      await waitForText("Set up your Wizzaroo login");

      expect(
        findButton("Set up my login").form?.querySelector(
          'input[name="email"]',
        ),
      ).toBeNull();
      fillInviteAcceptance(newPassword);

      await vi.waitFor(() => {
        expect(getStatusText()).toBe(
          "Welcome to Wizzaroo. Your login is set up and you're signed in.",
        );
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/invite-acceptances",
        body: { token: "an-invite-token", password: newPassword },
      });
      await waitForText("The Eyres");
    });

    it.each([
      {
        password: "elevenchars",
        repeatedPassword: "elevenchars",
        problem: "The new password needs at least 12 characters.",
      },
      {
        password: newPassword,
        repeatedPassword: "jo's-other-long-password",
        problem: "The two new passwords don't match.",
      },
    ])(
      "won't spend the Invite when $problem",
      async ({ password, repeatedPassword, problem }) => {
        const { requests } = startFakeApi({ isSignedIn: false });
        root.render(<ParentPage inviteToken="an-invite-token" />);
        await waitForText("Set up your Wizzaroo login");

        fillInviteAcceptance(password, repeatedPassword);

        await vi.waitFor(() => {
          expect(getAlertText()).toBe(problem);
        });
        expect(requests.map(({ path }) => path)).not.toContain(
          "/api/invite-acceptances",
        );
      },
    );

    it("says an Invite that has expired, been used or been replaced can't be used", async () => {
      startFakeApi({ isSignedIn: false, inviteAcceptanceStatus: 404 });
      root.render(<ParentPage inviteToken="a-used-invite-token" />);
      await waitForText("Set up your Wizzaroo login");

      fillInviteAcceptance(newPassword);

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "That Invite has expired, been used or been replaced by a newer one. Ask whoever invited you to send a new one.",
        );
      });
      expect(document.querySelector('input[name="newPassword"]')).toBeNull();
    });

    it("keeps the form when the server can't set up the login", async () => {
      startFakeApi({ isSignedIn: false, inviteAcceptanceStatus: 500 });
      root.render(<ParentPage inviteToken="an-invite-token" />);
      await waitForText("Set up your Wizzaroo login");

      fillInviteAcceptance(newPassword);

      await vi.waitFor(() => {
        expect(getAlertText()).toBe(
          "Wizzaroo couldn't set up your login. Try again in a moment.",
        );
      });
      expect(findButton("Set up my login")).toBeDefined();
    });
  });

  describe("a Family's data", () => {
    beforeEach(() => {
      showSection("family-data");
    });

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    it("offers the Family's data as a file to download", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      const downloadLink = await vi.waitFor(() =>
        findElement('a[href="/api/family-export"]', isLink),
      );
      expect(downloadLink.hasAttribute("download")).toBe(true);
      expect(downloadLink.textContent).toBe("Download your Family's data");
    });

    it("asks the Admin to delete a Child, and lists the request as waiting", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      root.render(<ParentPage />);
      await waitForText("Nothing waiting to be deleted.");

      findElement('select[name="deletionChoice"]', isSelect).value = bea.id;
      findButton("Ask for it to be deleted").click();

      await waitForText(
        "Your request is with the Admin, who will delete it soon.",
      );
      await waitForText("Everything about Bea, asked for on 16 November 2026");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/deletion-requests",
        body: { childId: bea.id },
      });
    });

    const waitingAdult: FakeWaitingAdult = {
      userId: "waiting-adult-1",
      name: "Sam Second",
      email: "sam.second@example.com",
      requestedAt: "2026-11-16T10:00:00.000Z",
    };

    it("says no one is waiting to join the Family when no Teacher has asked", async () => {
      startFakeApi({ isSignedIn: true });

      root.render(<ParentPage />);

      await waitForText("No one is waiting to join your Family.");
    });

    it("shows who a Teacher asked to add to the Family, with the address their Invite would go to, and lets them in only when the Parent agrees", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        waitingAdults: [waitingAdult],
      });
      root.render(<ParentPage />);
      await waitForText(
        "Sam Second, sam.second@example.com, asked for on 16 November 2026. Their Invite would go to sam.second@example.com.",
      );
      expect(
        requests.filter(({ path }) =>
          path.startsWith("/api/family-join-requests/"),
        ),
      ).toEqual([]);

      findButton("Let them join").click();

      await waitForText(
        "sam.second@example.com has joined your Family, and Wizzaroo has emailed them their Invite.",
      );
      await waitForText("No one is waiting to join your Family.");
      expect(requests).toContainEqual({
        method: "PUT",
        path: "/api/family-join-requests/waiting-adult-1/agreement",
        body: undefined,
      });
    });

    it("turns down an adult the Parent doesn't know", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        waitingAdults: [waitingAdult],
      });
      root.render(<ParentPage />);
      await waitForText("Sam Second, sam.second@example.com");

      findButton("Turn it down").click();

      await waitForText("sam.second@example.com won't join your Family.");
      expect(requests).toContainEqual({
        method: "DELETE",
        path: "/api/family-join-requests/waiting-adult-1",
        body: undefined,
      });
    });

    it("asks for the whole Family to be deleted when that is what the Parent chooses", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        familyChildren: [bea],
      });
      root.render(<ParentPage />);
      await waitForText("Nothing waiting to be deleted.");

      findButton("Ask for it to be deleted").click();

      await waitForText("Everything about your Family, asked for on");
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/deletion-requests",
        body: {},
      });
    });
  });

  describe("the Admin dashboard", () => {
    beforeEach(() => {
      showSection("admin");
    });

    const waitForText = async (text: string) => {
      await vi.waitFor(() => {
        expect(getPageText()).toContain(text);
      });
    };

    const smithsRequest: FakeAdminDeletionRequest = {
      id: "deletion-request-1",
      familyName: "The Smiths",
      childId: "child-smithling",
      childNickname: "Smithling",
      requestedBy: "parent@another-family.example",
      createdAt: "2026-11-16T10:00:00.000Z",
    };

    const smiths: FakeAdminFamily = {
      id: "family-smiths",
      name: "The Smiths",
      children: [{ id: "child-smithling", nickname: "Smithling" }],
    };

    it("confirms a Parent's deletion request only once the Admin says yes", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        isAdmin: true,
        adminDeletionRequests: [smithsRequest],
        adminFamilies: [smiths],
      });
      root.render(<ParentPage />);
      await waitForText(
        "parent@another-family.example asked to delete Smithling in The Smiths",
      );

      findButton("Delete Smithling in The Smiths").click();
      const confirmationPath =
        "/api/admin/deletion-requests/deletion-request-1/confirmation";
      expect(requests.map(({ path }) => path)).not.toContain(confirmationPath);
      (
        await vi.waitFor(() =>
          findButton("Yes, delete Smithling in The Smiths for good"),
        )
      ).click();

      await vi.waitFor(() => {
        expect(requests).toContainEqual({
          method: "POST",
          path: confirmationPath,
          body: undefined,
        });
      });
    });

    it("lists every Family and Child but offers to delete none that no Parent has asked to delete (#284)", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        isAdmin: true,
        adminFamilies: [smiths],
      });
      root.render(<ParentPage />);
      await waitForText("No Parent is waiting for anything to be deleted.");
      await waitForText("Smithling");

      expect(getPageText()).toContain("The Smiths");
      expect(
        Array.from(document.querySelectorAll("button")).filter(
          ({ textContent }) => textContent.includes("Delete"),
        ),
      ).toEqual([]);
      expect(requests.map(({ method }) => method)).not.toContain("DELETE");
    });

    it("keeps everything when the Admin changes their mind", async () => {
      const { requests } = startFakeApi({
        isSignedIn: true,
        isAdmin: true,
        adminDeletionRequests: [smithsRequest],
        adminFamilies: [smiths],
      });
      root.render(<ParentPage />);
      await waitForText("The Smiths");

      (
        await vi.waitFor(() => findButton("Delete Smithling in The Smiths"))
      ).click();
      (await vi.waitFor(() => findButton("Keep it"))).click();

      await vi.waitFor(() => findButton("Delete Smithling in The Smiths"));
      expect(requests.map(({ path }) => path)).not.toContain(
        "/api/admin/deletion-requests/deletion-request-1/confirmation",
      );
    });

    it("lists the Families 25 to a page", async () => {
      const families = Array.from(
        { length: 30 },
        (_, index): FakeAdminFamily => ({
          id: `family-${String(index + 1)}`,
          name: `Family ${String(index + 1)}`,
          children: [],
        }),
      );
      startFakeApi({
        isSignedIn: true,
        isAdmin: true,
        adminFamilies: families,
      });
      root.render(<ParentPage />);
      await waitForText("1–25 of 30 Families");
      const listFamilyNames = () =>
        Array.from(document.querySelectorAll(".admin-families h3")).map(
          ({ textContent }) => textContent,
        );
      expect(listFamilyNames()).toHaveLength(25);
      expect(listFamilyNames().at(-1)).toBe("Family 25");

      findButton("Next page").click();

      await waitForText("26–30 of 30 Families");
      expect(listFamilyNames()).toEqual([
        "Family 26",
        "Family 27",
        "Family 28",
        "Family 29",
        "Family 30",
      ]);
    });
  });

  describe("confirming an email address from its link", () => {
    it("confirms the address only once the Parent taps to, then shows it confirmed", async () => {
      const { requests } = startFakeApi({ isSignedIn: true });
      root.render(<ParentPage emailConfirmationToken="a-confirmation-token" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("It isn't confirmed yet.");
      });
      expect(requests.map(({ path }) => path)).not.toContain(
        "/api/email-address-confirmations",
      );

      findButton("Confirm my email address").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Thank you. owner@example.com is confirmed.",
        );
        expect(getPageText()).toContain("and it's confirmed.");
      });
      expect(requests).toContainEqual({
        method: "POST",
        path: "/api/email-address-confirmations",
        body: { token: "a-confirmation-token" },
      });
    });

    it("confirms the address on a browser that isn't signed in", async () => {
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage emailConfirmationToken="a-confirmation-token" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Sign in to Wizzaroo");
      });

      findButton("Confirm my email address").click();

      await vi.waitFor(() => {
        expect(getPageText()).toContain(
          "Thank you. owner@example.com is confirmed.",
        );
      });
    });

    it("says a link that has expired or was already used can't confirm anything", async () => {
      startFakeApi({
        isSignedIn: false,
        emailAddressConfirmationStatus: 404,
      });
      root.render(<ParentPage emailConfirmationToken="a-used-token" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Confirm your email address");
      });

      findButton("Confirm my email address").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "That link has expired or has already been used. Sign in and ask for a new one.",
        );
      });
    });

    it("lets the Parent try again when the server can't be reached", async () => {
      startFakeApi({ isSignedIn: false });
      root.render(<ParentPage emailConfirmationToken="a-confirmation-token" />);
      await vi.waitFor(() => {
        expect(getPageText()).toContain("Confirm your email address");
      });
      vi.stubGlobal("fetch", () =>
        Promise.reject(new TypeError("Failed to fetch")),
      );

      findButton("Confirm my email address").click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alert"]')?.textContent).toBe(
          "Wizzaroo couldn't confirm your email address. Try again in a moment.",
        );
      });
      expect(findButton("Confirm my email address")).toBeDefined();
    });
  });
});

describe("takeLinkToken", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("takes the token from the link's fragment, and removes it from the address bar", () => {
    window.history.replaceState(
      null,
      "",
      "/parent/#confirm-email=fV3y87LnJ8Ad_KujD9-y9U",
    );

    expect(takeLinkToken("confirm-email")).toBe("fV3y87LnJ8Ad_KujD9-y9U");
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/parent/");
  });

  it("takes a password reset link's token only when asked for that link", () => {
    window.history.replaceState(
      null,
      "",
      "/parent/#reset-password=a-reset-token",
    );

    expect(takeLinkToken("confirm-email")).toBeUndefined();
    expect(window.location.hash).toBe("#reset-password=a-reset-token");
    expect(takeLinkToken("reset-password")).toBe("a-reset-token");
    expect(window.location.hash).toBe("");
  });

  it("takes an Invite link's token only when asked for that link", () => {
    window.history.replaceState(null, "", "/parent/#accept-invite=an-invite");

    expect(takeLinkToken("reset-password")).toBeUndefined();
    expect(takeLinkToken("accept-invite")).toBe("an-invite");
    expect(window.location.hash).toBe("");
  });

  it("finds no token on the Parent page opened normally", () => {
    window.history.replaceState(null, "", "/parent/");

    expect(takeLinkToken("confirm-email")).toBeUndefined();
  });
});
