import {
  createEmailClient,
  type BuiltInEmailSenders,
  type EmailClient,
} from "@adrianeyre/email-client";
import type { EmailPlatformVars } from "../config/vars.js";
import type { Email, EmailTemplate, EmailVariables } from "./emails.js";

export type SendEmail = (email: Email) => Promise<void>;

/**
 * Sends each email through the email platform, by the slug of its built-in template. The platform renders it, with
 * Wizzaroo's header, footer and from address, and queues it for its SMTP provider (ADR 0069).
 */
const sendBuiltIn = async <Template extends EmailTemplate>(
  client: EmailClient,
  template: Template,
  to: string,
  variables: EmailVariables<Template>,
): Promise<void> => {
  const send: BuiltInEmailSenders[Template] = client.builtIn[template];
  await send({ to, variables });
};

export const buildEmailSender =
  (client: EmailClient): SendEmail =>
  ({ to, template, variables }) =>
    sendBuiltIn(client, template, to, variables);

/**
 * How long the server waits on the email platform for each send, in milliseconds (#329). No send holds a database
 * connection, but each still holds its request, so a stalled platform fails it soon.
 */
export const emailPlatformTimeoutMs = 10_000;

/** A client for the email platform at EMAIL_BASE_URL, signed in with EMAIL_API_KEY. */
export const createEmailPlatformClient = (
  { baseUrl, apiKey }: EmailPlatformVars,
  fetch?: typeof globalThis.fetch,
): EmailClient =>
  createEmailClient({
    baseUrl: baseUrl.href,
    apiKey,
    timeoutMs: emailPlatformTimeoutMs,
    ...(fetch === undefined ? {} : { fetch }),
  });

/**
 * An email made inside a transaction, sent once the transaction has committed, so no send holds a database connection
 * while the email platform answers (#329). `undo` takes back what the email carried, such as a link no one received.
 */
export interface EmailAfterCommit {
  email: Email;
  undo?: () => Promise<void>;
}

/** Sends an email whose transaction has committed. One that can't be sent is undone, then the failure is thrown. */
export const sendEmailAfterCommit = async (
  sendEmail: SendEmail,
  { email, undo }: EmailAfterCommit,
): Promise<void> => {
  try {
    await sendEmail(email);
  } catch (error) {
    if (undo !== undefined) {
      await undo().catch((undoError: unknown) => {
        throw new AggregateError(
          [error, undoError],
          "An email couldn't be sent, and what it carried couldn't be taken back",
        );
      });
    }
    throw error;
  }
};

/** Sends each email in turn, after its transaction has committed. The first that fails stops the rest and is thrown. */
export const sendEmailsAfterCommit = async (
  sendEmail: SendEmail,
  emails: readonly EmailAfterCommit[],
): Promise<void> => {
  for (const email of emails) {
    await sendEmailAfterCommit(sendEmail, email);
  }
};

export interface EmailBatching {
  batchSize: number;
  pauseMs: number;
}

/** Resend allows a few requests a second, so bulk emails go out a batch at a time with a pause after each. */
export const defaultEmailBatching: EmailBatching = {
  batchSize: 2,
  pauseMs: 1_000,
};

export interface QueuedEmail {
  email: Email;
  /** Called when this email can't be sent; the rest of the queue goes on regardless (#293). */
  onFailure: (error: unknown) => Promise<void>;
}

export interface EmailQueue {
  /** Adds emails to the back of the queue. The first batch starts at once when nothing is being sent. */
  enqueue: (emails: readonly QueuedEmail[]) => void;
  /** Resolves once every email queued so far has been sent or has failed. */
  whenIdle: () => Promise<void>;
}

/**
 * One queue for every bulk email the deployment sends, since the provider's limit is the account's and not one
 * upload's (#292): at most one batch is in flight, with a pause after each, however many uploads add to it.
 * A failed email doesn't stop the others: each is settled on its own, and its `onFailure` is told (#293).
 */
export const buildEmailQueue = (
  sendEmail: SendEmail,
  { batchSize, pauseMs }: EmailBatching,
): EmailQueue => {
  const waiting: QueuedEmail[] = [];
  let sending: Promise<void> | null = null;

  const sendBatch = async (batch: readonly QueuedEmail[]): Promise<void> => {
    const outcomes = await Promise.allSettled(
      batch.map(({ email }) => sendEmail(email)),
    );
    await Promise.allSettled(
      outcomes.map((outcome, index) =>
        outcome.status === "rejected"
          ? batch[index].onFailure(outcome.reason)
          : Promise.resolve(),
      ),
    );
  };

  const drain = async (): Promise<void> => {
    while (waiting.length > 0) {
      await sendBatch(waiting.splice(0, batchSize));
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
    sending = null;
  };

  return {
    enqueue: (emails) => {
      waiting.push(...emails);
      if (sending === null && waiting.length > 0) {
        sending = drain();
      }
    },
    whenIdle: async () => {
      while (sending !== null) {
        await sending;
      }
    },
  };
};
