import { EmailTimeoutError } from "@adrianeyre/email-client";
import { describe, expect, it, vi } from "vitest";
import type { Email } from "./emails.js";
import {
  buildEmailSender,
  createEmailPlatformClient,
  emailPlatformTimeoutMs,
  sendEmailAfterCommit,
  sendEmailsAfterCommit,
} from "./send-email.js";

describe("createEmailPlatformClient's timeout", () => {
  it("waits seconds, not minutes, on a slow email platform (#329)", async () => {
    expect(emailPlatformTimeoutMs).toBe(10_000);

    const neverAnswers: typeof globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    const sendEmail = buildEmailSender(
      createEmailPlatformClient(
        {
          baseUrl: new URL("https://mail.wizzaroo.example"),
          apiKey: "ek_a-test-api-key",
        },
        neverAnswers,
      ),
    );
    vi.useFakeTimers();
    try {
      const outcome = sendEmail(buildEmail("ada@example.com"));
      const settled = expect(outcome).rejects.toBeInstanceOf(EmailTimeoutError);
      await vi.advanceTimersByTimeAsync(emailPlatformTimeoutMs);
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });
});

const buildEmail = (to: string): Email => ({
  to,
  template: "emailAddressAlreadyInUse",
  variables: { email: to },
});

describe("sendEmailAfterCommit", () => {
  it("sends the email and undoes nothing when it is sent", async () => {
    const sent: Email[] = [];
    let undone = 0;

    await sendEmailAfterCommit(
      (email) => {
        sent.push(email);
        return Promise.resolve();
      },
      {
        email: buildEmail("ada@example.com"),
        undo: () => {
          undone += 1;
          return Promise.resolve();
        },
      },
    );

    expect(sent).toEqual([buildEmail("ada@example.com")]);
    expect(undone).toBe(0);
  });

  it("undoes what an email carried when it can't be sent, then throws the failure", async () => {
    const failure = new Error("the mail server is down");
    let undone = 0;

    await expect(
      sendEmailAfterCommit(() => Promise.reject(failure), {
        email: buildEmail("ada@example.com"),
        undo: () => {
          undone += 1;
          return Promise.resolve();
        },
      }),
    ).rejects.toBe(failure);
    expect(undone).toBe(1);
  });

  it("throws both failures when the undoing fails too", async () => {
    const failure = new Error("the mail server is down");
    const undoFailure = new Error("the database is down");

    const outcome = sendEmailAfterCommit(() => Promise.reject(failure), {
      email: buildEmail("ada@example.com"),
      undo: () => Promise.reject(undoFailure),
    });

    await expect(outcome).rejects.toBeInstanceOf(AggregateError);
    await expect(outcome).rejects.toMatchObject({
      errors: [failure, undoFailure],
    });
  });
});

describe("sendEmailsAfterCommit", () => {
  it("sends each in turn, and stops at the first that fails", async () => {
    const sent: string[] = [];
    const failure = new Error("the mail server refused this address");

    await expect(
      sendEmailsAfterCommit(
        (email) => {
          if (email.to === "refused@example.com") {
            return Promise.reject(failure);
          }
          sent.push(email.to);
          return Promise.resolve();
        },
        [
          { email: buildEmail("ada@example.com") },
          { email: buildEmail("refused@example.com") },
          { email: buildEmail("never-sent@example.com") },
        ],
      ),
    ).rejects.toBe(failure);
    expect(sent).toEqual(["ada@example.com"]);
  });
});
