import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import {
  answerOwnPasskeyChallenge,
  isParentPasskey,
  PasskeyForm,
  PasskeyList,
  type ParentPasskey,
} from "./passkeys.js";
import {
  NewPasswordForm,
  PasswordForm,
  PasswordRemovalForm,
} from "./password-forms.js";
import {
  startTotpSetup,
  TwoFactorRemovalForm,
  TwoFactorSetupForm,
  type TotpSetup,
} from "./two-factor-forms.js";

interface ParentEmailAddress {
  email: string;
  isConfirmed: boolean;
}

interface SignInMethods {
  hasPassword: boolean;
  passkeys: ParentPasskey[];
  isTwoFactorOn: boolean;
  recoveryCodesLeft: number;
}

interface ParentAccount {
  emailAddress: ParentEmailAddress;
  signInMethods: SignInMethods;
}

type AccountView =
  | { kind: "loading" }
  | { kind: "shown"; account: ParentAccount }
  | { kind: "failed" };

type AccountTask =
  | { kind: "none" }
  | { kind: "changing-email" }
  | { kind: "changing-password" }
  | { kind: "setting-password" }
  | { kind: "removing-password" }
  | { kind: "adding-passkey" }
  | { kind: "turning-on-two-factor"; setup: TotpSetup }
  | { kind: "turning-off-two-factor" };

const isParentEmailAddress = (value: unknown): value is ParentEmailAddress =>
  typeof value === "object" &&
  value !== null &&
  "email" in value &&
  typeof value.email === "string" &&
  "isConfirmed" in value &&
  typeof value.isConfirmed === "boolean";

const isSignInMethods = (value: unknown): value is SignInMethods =>
  typeof value === "object" &&
  value !== null &&
  "hasPassword" in value &&
  typeof value.hasPassword === "boolean" &&
  "passkeys" in value &&
  Array.isArray(value.passkeys) &&
  value.passkeys.every(isParentPasskey) &&
  "isTwoFactorOn" in value &&
  typeof value.isTwoFactorOn === "boolean" &&
  "recoveryCodesLeft" in value &&
  typeof value.recoveryCodesLeft === "number";

const sendingFailedMessage =
  "Wizzaroo couldn't send the link. Try again in a moment.";

const emailAddressCheckProblems = new Map([
  [400, "That isn't an email address."],
]);

const emailProofProblems = new Map([
  [
    "second-factor-required",
    "Sign in with a passkey or two-factor authentication first, then change your email address.",
  ],
  [
    "second-factor-proof-required",
    "Teachers and the Admin prove it's them with a passkey or a code from their authenticator app.",
  ],
  [
    "account-proof-required",
    "Prove it's you first: enter your password or a code, or use your passkey.",
  ],
]);

const wrongEmailProofMessage =
  "That didn't prove it's you, so Wizzaroo sent nothing. Try again.";

/** What an adult gives to prove it's them before their email address moves. */
type EmailAddressProof =
  { currentPassword: string } | { code: string } | { passkey: unknown };

const readErrorCode = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json().catch(() => undefined);
  return typeof body === "object" && body !== null && "code" in body
    ? body.code
    : undefined;
};

const buildLinkSentNews = (email: string): string =>
  `Wizzaroo has sent a link to ${email}. Your email address is confirmed once you open it.`;

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(path);
  return response.ok ? response.json() : undefined;
};

const fetchAccountView = async (): Promise<AccountView> => {
  const [emailAddress, signInMethods] = await Promise.all([
    fetchJson("/api/email-address"),
    fetchJson("/api/sign-in-methods"),
  ]);
  return isParentEmailAddress(emailAddress) && isSignInMethods(signInMethods)
    ? { kind: "shown", account: { emailAddress, signInMethods } }
    : { kind: "failed" };
};

const askForEmailAddressCheck = async (
  email: string,
  proof?: EmailAddressProof,
): Promise<void> => {
  const response = await sendAccountChange(
    "POST",
    "/api/email-address-checks",
    { email, ...proof },
  );
  if (response.status === 403) {
    const code = await readErrorCode(response);
    throw new ProblemToShowError(
      (typeof code === "string" ? emailProofProblems.get(code) : undefined) ??
        wrongEmailProofMessage,
    );
  }
  if (!response.ok) {
    throw new ProblemToShowError(
      emailAddressCheckProblems.get(response.status) ?? sendingFailedMessage,
    );
  }
};

const readTypedProof = (answers: FormData): EmailAddressProof | undefined => {
  const currentPassword = readTextAnswer(answers, "currentPassword");
  if (currentPassword !== "") {
    return { currentPassword };
  }
  const code = readTextAnswer(answers, "code");
  return code === "" ? undefined : { code };
};

interface EmailAddressFormProps {
  signInMethods: SignInMethods;
  isStaff: boolean;
  onSent: (email: string) => void;
  onCancelled: () => void;
}

/**
 * The email address decides where every reset link goes, so moving it asks for a fresh proof:
 * a Parent's password, a code or a passkey, and for Teachers and the Admin a code or a passkey.
 */
const EmailAddressForm = ({
  signInMethods: { hasPassword, passkeys, isTwoFactorOn },
  isStaff,
  onSent,
  onCancelled,
}: EmailAddressFormProps) => {
  const [problem, setProblem] = useState<string>();
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();
  const isPasswordOffered = hasPassword && !isStaff;
  const isPasskeyOffered = passkeys.length > 0 && browserSupportsWebAuthn();

  const sendEmailAddressCheck = (
    emailForm: HTMLFormElement,
    readProof: (answers: FormData) => Promise<EmailAddressProof | undefined>,
  ) => {
    const answers = new FormData(emailForm);
    const email = readTextAnswer(answers, "email");
    setPasskeyStep(undefined);
    return runBusy(`Emailing a link to ${email} to confirm it…`, async () => {
      const proof = await readProof(answers);
      setPasskeyStep(undefined);
      await askForEmailAddressCheck(email, proof);
      onSent(email);
    });
  };
  const showProblem = (error: unknown) => {
    setProblem(readProblem(error, sendingFailedMessage));
  };

  return (
    <form
      ref={setForm}
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProblem(undefined);
        sendEmailAddressCheck(event.currentTarget, (answers) =>
          Promise.resolve(readTypedProof(answers)),
        ).catch(showProblem);
      }}
    >
      <h2>Change your email address</h2>
      <label>
        New email address
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <p>
        Your email address is where Wizzaroo sends password reset links, so
        prove it&apos;s you before it moves.
      </p>
      {isPasswordOffered ? (
        <label>
          Your password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
          />
        </label>
      ) : null}
      {isTwoFactorOn ? (
        <label>
          {isPasswordOffered ? "Or a code" : "A code"} from your authenticator
          app
          <input name="code" inputMode="numeric" autoComplete="one-time-code" />
        </label>
      ) : null}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : (
        <BusyProgress label={busyLabel} detail={passkeyStep} />
      )}
      {isPasswordOffered || isTwoFactorOn ? (
        <button type="submit" disabled={isBusy}>
          Send a link to confirm it
        </button>
      ) : null}
      {isPasskeyOffered ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (form?.reportValidity() !== true) {
              return;
            }
            setProblem(undefined);
            sendEmailAddressCheck(form, async () => ({
              passkey: await answerOwnPasskeyChallenge(
                "You have no passkeys yet.",
                setPasskeyStep,
              ),
            })).catch(showProblem);
          }}
        >
          Use your passkey and send a link
        </button>
      ) : null}
      {isPasswordOffered || isTwoFactorOn || isPasskeyOffered ? null : (
        <p role="alert">
          Set up a passkey or two-factor authentication first, then change your
          email address.
        </p>
      )}
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface EmailAddressSummaryProps {
  emailAddress: ParentEmailAddress;
  onLinkSent: (email: string) => void;
}

const EmailAddressSummary = ({
  emailAddress: { email, isConfirmed },
  onLinkSent,
}: EmailAddressSummaryProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  return (
    <div aria-busy={isBusy}>
      <p>
        Your email address is <strong>{email}</strong>
        {isConfirmed ? ", and it's confirmed." : ". It isn't confirmed yet."}
      </p>
      {isConfirmed ? null : (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            runBusy(`Emailing a link to ${email} to confirm it…`, async () => {
              await askForEmailAddressCheck(email);
              onLinkSent(email);
            }).catch((error: unknown) => {
              setProblem(readProblem(error, sendingFailedMessage));
            });
          }}
        >
          Send me a link to confirm it
        </button>
      )}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </div>
  );
};

interface SignInMethodsSummaryProps {
  signInMethods: SignInMethods;
  onTaskChosen: (task: AccountTask) => void;
  onPasskeyRemoved: (name: string) => void;
}

const SignInMethodsSummary = ({
  signInMethods: { hasPassword, passkeys, isTwoFactorOn, recoveryCodesLeft },
  onTaskChosen,
  onPasskeyRemoved,
}: SignInMethodsSummaryProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  return (
    <>
      <h2>Signing in</h2>
      <p>
        {hasPassword
          ? "You sign in with your email address and password."
          : "You have no password, so you sign in with a passkey."}
      </p>
      {hasPassword ? (
        <button
          type="button"
          onClick={() => {
            onTaskChosen({ kind: "changing-password" });
          }}
        >
          Change your password
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            onTaskChosen({ kind: "setting-password" });
          }}
        >
          Set a password
        </button>
      )}
      {hasPassword && passkeys.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            onTaskChosen({ kind: "removing-password" });
          }}
        >
          Remove your password
        </button>
      ) : null}
      <h3>Passkeys</h3>
      <PasskeyList passkeys={passkeys} onRemoved={onPasskeyRemoved} />
      <button
        type="button"
        onClick={() => {
          onTaskChosen({ kind: "adding-passkey" });
        }}
      >
        {passkeys.length === 0 ? "Add a passkey" : "Add another passkey"}
      </button>
      <h3>Two-factor authentication</h3>
      {isTwoFactorOn ? (
        <>
          <p>
            Two-factor authentication is on: after your password, Wizzaroo asks
            for a code from your authenticator app. You have {recoveryCodesLeft}{" "}
            recovery codes left.
          </p>
          <button
            type="button"
            onClick={() => {
              onTaskChosen({ kind: "turning-off-two-factor" });
            }}
          >
            Turn off two-factor authentication
          </button>
        </>
      ) : (
        <div aria-busy={isBusy}>
          <p>
            Two-factor authentication is off. Turn it on to have Wizzaroo ask
            for a code from an authenticator app after your password.
          </p>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setProblem(undefined);
              runBusy(
                "Getting a key for your authenticator app from Wizzaroo…",
                async () => {
                  const setup = await startTotpSetup();
                  onTaskChosen({ kind: "turning-on-two-factor", setup });
                },
              ).catch((error: unknown) => {
                setProblem(
                  readProblem(
                    error,
                    "Wizzaroo couldn't start setting up two-factor authentication. Try again in a moment.",
                  ),
                );
              });
            }}
          >
            Turn on two-factor authentication
          </button>
          {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
        </div>
      )}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </>
  );
};

const otherSignInsProblem =
  "Wizzaroo couldn't sign out your other browsers. Try again in a moment.";

/** Ends every other sign-in of the adult's, keeping this one, with no password to change (#245). */
const OtherBrowsersSignOut = ({ onSignedOut }: { onSignedOut: () => void }) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  return (
    <div aria-busy={isBusy}>
      <h3>Other browsers</h3>
      <p>
        If you signed in somewhere you no longer use, or think someone else is
        signed in as you, sign out everywhere but here.
      </p>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => {
          setProblem(undefined);
          runBusy("Signing out your other browsers…", async () => {
            const response = await sendAccountChange(
              "DELETE",
              "/api/other-sign-ins",
            );
            if (response.ok) {
              onSignedOut();
            } else {
              setProblem(otherSignInsProblem);
            }
          }).catch(() => {
            setProblem(otherSignInsProblem);
          });
        }}
      >
        Sign out your other browsers
      </button>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </div>
  );
};

interface AccountTaskFormProps {
  task: AccountTask;
  account: ParentAccount;
  isStaff: boolean;
  onFinished: (news: string) => void;
  onCancelled: () => void;
}

const AccountTaskForm = ({
  task,
  account: { emailAddress, signInMethods },
  isStaff,
  onFinished,
  onCancelled,
}: AccountTaskFormProps) => {
  switch (task.kind) {
    case "none":
      return null;
    case "changing-email":
      return (
        <EmailAddressForm
          signInMethods={signInMethods}
          isStaff={isStaff}
          onSent={(email) => {
            onFinished(buildLinkSentNews(email));
          }}
          onCancelled={onCancelled}
        />
      );
    case "changing-password":
      return (
        <PasswordForm
          onChanged={() => {
            onFinished(
              emailAddress.isConfirmed
                ? `Your password is changed, and you're signed out on every other browser. Wizzaroo has emailed ${emailAddress.email} to say so.`
                : "Your password is changed, and you're signed out on every other browser.",
            );
          }}
          onCancelled={onCancelled}
        />
      );
    case "setting-password":
      return (
        <NewPasswordForm
          onSet={() => {
            onFinished(
              "Your password is set. You can sign in with it or with a passkey.",
            );
          }}
          onCancelled={onCancelled}
        />
      );
    case "removing-password":
      return (
        <PasswordRemovalForm
          onRemoved={() => {
            onFinished(
              "Your password is removed, and you're signed out on every other browser. You sign in with a passkey now.",
            );
          }}
          onCancelled={onCancelled}
        />
      );
    case "adding-passkey":
      return (
        <PasskeyForm
          onAdded={(name) => {
            onFinished(`Your passkey on ${name} is added.`);
          }}
          onPhoneFinished={() => {
            onFinished("Your passkeys are up to date.");
          }}
          onCancelled={onCancelled}
        />
      );
    case "turning-on-two-factor":
      return (
        <TwoFactorSetupForm
          setup={task.setup}
          onTurnedOn={() => {
            onFinished("Two-factor authentication is on.");
          }}
          onCancelled={onCancelled}
        />
      );
    case "turning-off-two-factor":
      return (
        <TwoFactorRemovalForm
          onTurnedOff={() => {
            onFinished("Two-factor authentication is off.");
          }}
          onCancelled={onCancelled}
        />
      );
  }
};

interface AccountPanelProps {
  isStaff?: boolean;
  onSignInMethodsChanged?: () => void;
}

export const AccountPanel = ({
  isStaff = false,
  onSignInMethodsChanged,
}: AccountPanelProps) => {
  const [view, setView] = useState<AccountView>({ kind: "loading" });
  const [task, setTask] = useState<AccountTask>({ kind: "none" });
  const [news, setNews] = useState<string>();

  const showAccount = useCallback(() => {
    void fetchAccountView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showAccount, [showAccount]);

  const finishTask = (taskNews: string) => {
    setTask({ kind: "none" });
    setNews(taskNews);
    showAccount();
    onSignInMethodsChanged?.();
  };
  const chooseTask = (chosenTask: AccountTask) => {
    setNews(undefined);
    setTask(chosenTask);
  };

  return (
    <section>
      <h1>Your account</h1>
      {view.kind === "loading" ? <p>Loading…</p> : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load your account. Try again in a moment.
        </p>
      ) : null}
      <p role="status">{news}</p>
      {view.kind === "shown" && task.kind === "none" ? (
        <>
          <EmailAddressSummary
            emailAddress={view.account.emailAddress}
            onLinkSent={(email) => {
              finishTask(buildLinkSentNews(email));
            }}
          />
          <button
            type="button"
            onClick={() => {
              chooseTask({ kind: "changing-email" });
            }}
          >
            Change your email address
          </button>
          <SignInMethodsSummary
            signInMethods={view.account.signInMethods}
            onTaskChosen={chooseTask}
            onPasskeyRemoved={(name) => {
              finishTask(`Your passkey on ${name} is removed.`);
            }}
          />
          <OtherBrowsersSignOut
            onSignedOut={() => {
              finishTask(
                "You're signed out on every other browser. This one stays signed in.",
              );
            }}
          />
        </>
      ) : null}
      {view.kind === "shown" ? (
        <AccountTaskForm
          task={task}
          account={view.account}
          isStaff={isStaff}
          onFinished={finishTask}
          onCancelled={() => {
            setTask({ kind: "none" });
          }}
        />
      ) : null}
    </section>
  );
};
