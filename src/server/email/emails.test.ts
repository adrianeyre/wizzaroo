import { describe, expect, it } from "vitest";
import {
  buildEmailAddressChangedNotice,
  buildEmailAddressChangeRequestedNotice,
  buildEmailAddressCheckEmail,
  buildEmailAddressInUseNote,
  buildFamilyDeviceNotice,
  buildPasskeyAddedNotice,
  buildPasskeyRemovedNotice,
  maskEmailAddress,
  buildFamilyJoinedNotice,
  buildFamilyJoinRequestNotice,
  buildParentInviteEmail,
  buildTeacherInviteEmail,
  buildPasswordChangedNotice,
  buildPasswordResetEmail,
  buildSignInCodesPausedNotice,
  buildTwoFactorTurnedOffNotice,
  type Email,
} from "./emails.js";
import {
  buildEmailQueue,
  buildEmailSender,
  createEmailPlatformClient,
} from "./send-email.js";

const parentEmail = "parent@example.com";

const november = new Date("2026-11-14T13:52:00Z");
const july = new Date("2026-07-14T13:52:00Z");
const novemberInUkTime = "14 November 2026 at 13:52 (UK time)";
const inviteUrl = new URL(
  "https://wizzaroo.example/parent/#accept-invite=a-secret-token",
);
const parentPageUrl = new URL("https://wizzaroo.example/parent/");

interface PinnedEmail {
  name: string;
  email: Email;
  expected: Email;
}

const pinnedEmails: PinnedEmail[] = [
  {
    name: "buildEmailAddressCheckEmail",
    email: buildEmailAddressCheckEmail({
      to: parentEmail,
      confirmationUrl: new URL(
        "https://wizzaroo.example/parent/#confirm-email=a-secret-token",
      ),
      lifetimeHours: 24,
    }),
    expected: {
      to: parentEmail,
      template: "confirmYourEmailAddress",
      variables: {
        email: parentEmail,
        confirmationUrl:
          "https://wizzaroo.example/parent/#confirm-email=a-secret-token",
        linkLifetime: "24 hours",
      },
    },
  },
  {
    name: "buildPasswordResetEmail",
    email: buildPasswordResetEmail({
      to: parentEmail,
      resetUrl: new URL(
        "https://wizzaroo.example/parent/#reset-password=a-secret-token",
      ),
      lifetimeHours: 1,
    }),
    expected: {
      to: parentEmail,
      template: "resetYourPassword",
      variables: {
        email: parentEmail,
        resetUrl:
          "https://wizzaroo.example/parent/#reset-password=a-secret-token",
        linkLifetime: "1 hour",
      },
    },
  },
  {
    name: "buildTeacherInviteEmail",
    email: buildTeacherInviteEmail({
      to: "teacher@school.example",
      name: "Sam Patel",
      schoolName: "Hillside Primary",
      inviteUrl,
      lifetimeDays: 7,
    }),
    expected: {
      to: "teacher@school.example",
      template: "teacherInvite",
      variables: {
        email: "teacher@school.example",
        name: "Sam Patel",
        schoolName: "Hillside Primary",
        inviteUrl: inviteUrl.href,
        inviteLifetime: "7 days",
      },
    },
  },
  {
    name: "buildParentInviteEmail",
    email: buildParentInviteEmail({
      to: parentEmail,
      name: "Jo Smith",
      schoolName: "Hillside Primary",
      inviteUrl,
      lifetimeDays: 7,
    }),
    expected: {
      to: parentEmail,
      template: "parentInvite",
      variables: {
        email: parentEmail,
        name: "Jo Smith",
        schoolName: "Hillside Primary",
        inviteUrl: inviteUrl.href,
        inviteLifetime: "7 days",
      },
    },
  },
  {
    name: "buildPasswordChangedNotice",
    email: buildPasswordChangedNotice({ to: parentEmail, changedAt: november }),
    expected: {
      to: parentEmail,
      template: "passwordChanged",
      variables: { email: parentEmail, changedAt: novemberInUkTime },
    },
  },
  {
    name: "buildPasskeyAddedNotice",
    email: buildPasskeyAddedNotice({
      to: parentEmail,
      passkeyName: "Probe laptop",
      addedAt: november,
      isFromHandOff: false,
    }),
    expected: {
      to: parentEmail,
      template: "passkeyAdded",
      variables: {
        email: parentEmail,
        passkeyName: "Probe laptop",
        addedAt: novemberInUkTime,
        isFromQrCode: false,
      },
    },
  },
  {
    name: "buildPasskeyRemovedNotice",
    email: buildPasskeyRemovedNotice({
      to: parentEmail,
      passkeyName: "Probe laptop",
      removedAt: november,
    }),
    expected: {
      to: parentEmail,
      template: "passkeyRemoved",
      variables: {
        email: parentEmail,
        passkeyName: "Probe laptop",
        removedAt: novemberInUkTime,
      },
    },
  },
  {
    name: "buildEmailAddressChangeRequestedNotice",
    email: buildEmailAddressChangeRequestedNotice({
      to: parentEmail,
      newEmail: "mallory@pen-test.example",
      happenedAt: november,
    }),
    expected: {
      to: parentEmail,
      template: "emailChangeRequested",
      variables: {
        email: parentEmail,
        newEmailMasked: "m•••@pen-test.example",
        requestedAt: novemberInUkTime,
      },
    },
  },
  {
    name: "buildEmailAddressChangedNotice",
    email: buildEmailAddressChangedNotice({
      to: parentEmail,
      newEmail: "mallory@pen-test.example",
      happenedAt: november,
    }),
    expected: {
      to: parentEmail,
      template: "emailAddressChanged",
      variables: {
        email: parentEmail,
        newEmailMasked: "m•••@pen-test.example",
        changedAt: novemberInUkTime,
      },
    },
  },
  {
    name: "buildEmailAddressInUseNote",
    email: buildEmailAddressInUseNote({ to: parentEmail }),
    expected: {
      to: parentEmail,
      template: "emailAddressAlreadyInUse",
      variables: { email: parentEmail },
    },
  },
  {
    name: "buildSignInCodesPausedNotice",
    email: buildSignInCodesPausedNotice({
      to: parentEmail,
      wrongCodes: 5,
      pausedAt: november,
      pauseEndsAt: new Date("2026-11-14T14:52:00Z"),
    }),
    expected: {
      to: parentEmail,
      template: "signInCodesPaused",
      variables: {
        email: parentEmail,
        wrongCodes: 5,
        pausedAt: novemberInUkTime,
        pauseEndsAt: "14 November 2026 at 14:52 (UK time)",
      },
    },
  },
  {
    name: "buildFamilyDeviceNotice",
    email: buildFamilyDeviceNotice({
      to: parentEmail,
      signedInAt: november,
      parentPageUrl,
    }),
    expected: {
      to: parentEmail,
      template: "familyDeviceSignedIn",
      variables: {
        email: parentEmail,
        signedInAt: novemberInUkTime,
        parentPageUrl: parentPageUrl.href,
      },
    },
  },
  {
    name: "buildFamilyJoinRequestNotice",
    email: buildFamilyJoinRequestNotice({
      to: parentEmail,
      schoolName: "Hillside Primary",
      parentPageUrl,
    }),
    expected: {
      to: parentEmail,
      template: "familyJoinRequest",
      variables: {
        email: parentEmail,
        schoolName: "Hillside Primary",
        parentPageUrl: parentPageUrl.href,
      },
    },
  },
  {
    name: "buildFamilyJoinedNotice",
    email: buildFamilyJoinedNotice({
      to: parentEmail,
      joinedEmail: "second-adult@example.com",
    }),
    expected: {
      to: parentEmail,
      template: "adultJoinedFamily",
      variables: {
        email: parentEmail,
        joinedEmail: "second-adult@example.com",
      },
    },
  },
  {
    name: "buildTwoFactorTurnedOffNotice",
    email: buildTwoFactorTurnedOffNotice({
      to: parentEmail,
      turnedOffAt: november,
    }),
    expected: {
      to: parentEmail,
      template: "twoFactorTurnedOff",
      variables: { email: parentEmail, turnedOffAt: novemberInUkTime },
    },
  },
];

describe.each(pinnedEmails)("$name", ({ email, expected }) => {
  it("names the email platform's built-in template and fills its variables", () => {
    expect(email).toEqual(expected);
  });
});

describe("the security notices", () => {
  it.each(
    pinnedEmails.filter(({ expected }) =>
      [
        "passwordChanged",
        "passkeyAdded",
        "passkeyRemoved",
        "emailChangeRequested",
        "emailAddressChanged",
        "signInCodesPaused",
        "twoFactorTurnedOff",
      ].includes(expected.template),
    ),
  )(
    "$name carries no link, so it can't be used to change anything",
    ({ email }) => {
      expect(JSON.stringify(email.variables)).not.toMatch(/https?:\/\//u);
    },
  );
});

describe("the UK time in a notice", () => {
  it("is British Summer Time during the summer", () => {
    const { variables } = buildTwoFactorTurnedOffNotice({
      to: parentEmail,
      turnedOffAt: july,
    });

    expect(variables).toEqual({
      email: parentEmail,
      turnedOffAt: "14 July 2026 at 14:52 (UK time)",
    });
  });
});

describe("buildPasskeyAddedNotice", () => {
  it("says when the passkey came from a QR code scanned on another device", () => {
    const { variables } = buildPasskeyAddedNotice({
      to: parentEmail,
      passkeyName: "Phone",
      addedAt: july,
      isFromHandOff: true,
    });

    expect(variables).toMatchObject({ isFromQrCode: true });
  });
});

describe("a name stored before #321", () => {
  const hostileName =
    "Sam,\n\nLog in at https://i5-phish.example now\r\n\r\nHi Sam\u202E";
  const hostileSchool = "I5 School\n\nPay the trip\u2028at\u2066 the office";

  it("reaches a Teacher's Invite only as one line", () => {
    const { variables } = buildTeacherInviteEmail({
      to: "teacher@school.example",
      name: "Mr I5\n\nLog in elsewhere",
      schoolName: "I5 School\r\nBcc: i5-bcc@attacker.example",
      inviteUrl,
      lifetimeDays: 7,
    });

    expect(variables).toMatchObject({
      name: "Mr I5 Log in elsewhere",
      schoolName: "I5 School Bcc: i5-bcc@attacker.example",
    });
  });

  it("reaches a Parent's Invite only as one line, with no bidirectional control", () => {
    const { variables } = buildParentInviteEmail({
      to: parentEmail,
      name: hostileName,
      schoolName: hostileSchool,
      inviteUrl,
      lifetimeDays: 7,
    });

    expect(variables).toMatchObject({
      name: "Sam, Log in at https://i5-phish.example now Hi Sam",
      schoolName: "I5 School Pay the trip at the office",
    });
    expect(JSON.stringify(variables)).not.toMatch(
      /[\u202E\u2066\u2028]|\\n|\\r/u,
    );
  });

  it("reaches a passkey notice only as one line", () => {
    const { variables } = buildPasskeyRemovedNotice({
      to: parentEmail,
      passkeyName: "Laptop\n\nClick here",
      removedAt: november,
    });

    expect(variables).toMatchObject({ passkeyName: "Laptop Click here" });
  });
});

describe("maskEmailAddress", () => {
  it.each([
    { email: "mallory@pen-test.example", masked: "m•••@pen-test.example" },
    { email: "a@example.com", masked: "a•••@example.com" },
    { email: "not-an-address", masked: "•••" },
  ])("shows $email as $masked", ({ email, masked }) => {
    expect(maskEmailAddress(email)).toBe(masked);
  });
});

const startRecordingFetch = (answer: () => Response) => {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  const fetch: typeof globalThis.fetch = (input, init) => {
    requests.push({
      url: input instanceof Request ? input.url : String(input),
      init,
    });
    return Promise.resolve(answer());
  };
  return { fetch, requests };
};

const queuedMessage = () =>
  Response.json(
    { id: "a-message-id", status: "queued", to: [parentEmail] },
    { status: 202 },
  );

describe("buildEmailSender", () => {
  const vars = {
    baseUrl: new URL("https://mail.wizzaroo.example/"),
    apiKey: "ek_a-test-api-key",
  };

  it("sends each email through the email platform, by its built-in template's slug, with its variables", async () => {
    const { fetch, requests } = startRecordingFetch(queuedMessage);
    const sendEmail = buildEmailSender(createEmailPlatformClient(vars, fetch));

    await sendEmail(
      buildPasswordChangedNotice({ to: parentEmail, changedAt: november }),
    );

    expect(requests).toHaveLength(1);
    const [{ url, init }] = requests;
    expect(url).toBe("https://mail.wizzaroo.example/v1/messages");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer ek_a-test-api-key",
    });
    expect(
      JSON.parse(typeof init?.body === "string" ? init.body : ""),
    ).toMatchObject({
      to: [parentEmail],
      templateSlug: "wizzaroo-password-changed",
      variables: { email: parentEmail, changedAt: novemberInUkTime },
    });
  });

  it("leaves the from address to the template's configuration in the email platform", async () => {
    const { fetch, requests } = startRecordingFetch(queuedMessage);
    const sendEmail = buildEmailSender(createEmailPlatformClient(vars, fetch));

    await sendEmail(buildEmailAddressInUseNote({ to: parentEmail }));

    expect(
      JSON.parse(
        typeof requests[0].init?.body === "string" ? requests[0].init.body : "",
      ),
    ).not.toHaveProperty("from");
  });

  it("fails the send when the email platform refuses it", async () => {
    const { fetch } = startRecordingFetch(() =>
      Response.json(
        { error: "validation_failed", message: "A variable is missing" },
        { status: 422 },
      ),
    );
    const sendEmail = buildEmailSender(createEmailPlatformClient(vars, fetch));

    await expect(
      sendEmail(buildEmailAddressInUseNote({ to: parentEmail })),
    ).rejects.toMatchObject({ status: 422, code: "validation_failed" });
  });
});

describe("buildEmailQueue", () => {
  const buildEmails = (label: string, howMany: number) =>
    Array.from({ length: howMany }, (_, index) =>
      buildPasswordChangedNotice({
        to: `${label}-${String(index)}@example.com`,
        changedAt: new Date("2026-11-14T13:52:00Z"),
      }),
    );
  const ignoreFailure = () => Promise.resolve();

  it("sends a batch at a time, pausing after each, so a big upload stays within the provider's limits", async () => {
    const sentAt: number[] = [];
    const queue = buildEmailQueue(
      () => {
        sentAt.push(Date.now());
        return Promise.resolve();
      },
      { batchSize: 2, pauseMs: 30 },
    );

    queue.enqueue(
      buildEmails("parent", 5).map((email) => ({
        email,
        onFailure: ignoreFailure,
      })),
    );
    await queue.whenIdle();

    expect(sentAt).toHaveLength(5);
    expect(sentAt[2] - sentAt[1]).toBeGreaterThanOrEqual(25);
    expect(sentAt[4] - sentAt[3]).toBeGreaterThanOrEqual(25);
    expect(sentAt[1] - sentAt[0]).toBeLessThan(25);
  });

  it("keeps one batch in flight however many uploads add to it, since the provider's limit is the deployment's (#292)", async () => {
    let inFlight = 0;
    let mostInFlight = 0;
    const sent: string[] = [];
    const queue = buildEmailQueue(
      async ({ to }) => {
        inFlight += 1;
        mostInFlight = Math.max(mostInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        sent.push(to);
      },
      { batchSize: 2, pauseMs: 1 },
    );

    for (const label of ["first", "second", "third"]) {
      queue.enqueue(
        buildEmails(label, 3).map((email) => ({
          email,
          onFailure: ignoreFailure,
        })),
      );
    }
    expect(inFlight).toBe(2);
    await queue.whenIdle();

    expect(mostInFlight).toBe(2);
    expect(sent).toHaveLength(9);
    expect(sent.slice(0, 3)).toEqual(
      buildEmails("first", 3).map(({ to }) => to),
    );
  });

  it("still sends every other email when one fails, and tells that one's caller (#293)", async () => {
    const emails = buildEmails("parent", 5);
    const sent: string[] = [];
    const failed: string[] = [];
    const queue = buildEmailQueue(
      ({ to }) => {
        if (to === emails[0].to) {
          return Promise.reject(new Error("refused"));
        }
        sent.push(to);
        return Promise.resolve();
      },
      { batchSize: 2, pauseMs: 1 },
    );

    queue.enqueue(
      emails.map((email) => ({
        email,
        onFailure: () => {
          failed.push(email.to);
          return Promise.reject(new Error("and marking it failed too"));
        },
      })),
    );
    await queue.whenIdle();

    expect(failed).toEqual([emails[0].to]);
    expect(sent).toEqual(emails.slice(1).map(({ to }) => to));
  });
});
