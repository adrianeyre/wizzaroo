import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  ProblemToShowError,
  readProblem,
  readSecondFactorRefusal,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";

export interface TotpSetup {
  setupKey: string;
  setupUri: string;
}

const twoFactorFailedMessage =
  "Wizzaroo couldn't change two-factor authentication. Try again in a moment.";

const wrongCodeMessage = "That code didn't work. Try the newest one.";

const isTotpSetup = (value: unknown): value is TotpSetup =>
  typeof value === "object" &&
  value !== null &&
  "setupKey" in value &&
  typeof value.setupKey === "string" &&
  "setupUri" in value &&
  typeof value.setupUri === "string";

const isRecoveryCodeList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((code) => typeof code === "string");

const readRecoveryCodes = (value: unknown): string[] | undefined =>
  typeof value === "object" &&
  value !== null &&
  "recoveryCodes" in value &&
  isRecoveryCodeList(value.recoveryCodes)
    ? value.recoveryCodes
    : undefined;

export const startTotpSetup = async (): Promise<TotpSetup> => {
  const response = await sendAccountChange("POST", "/api/totp-setups");
  if (response.status === 403) {
    throw await readSecondFactorRefusal(response);
  }
  const setup: unknown = response.ok ? await response.json() : undefined;
  if (!isTotpSetup(setup)) {
    throw new Error(
      "Wizzaroo didn't start setting up two-factor authentication",
    );
  }
  return setup;
};

const turnOnTwoFactor = async (code: string): Promise<string[]> => {
  const response = await sendAccountChange("POST", "/api/two-factor", {
    code,
  });
  if (response.status === 403) {
    throw new ProblemToShowError(wrongCodeMessage);
  }
  if (response.status === 404) {
    throw new ProblemToShowError(
      "That took too long. Cancel, then turn two-factor authentication on again.",
    );
  }
  const recoveryCodes = response.ok
    ? readRecoveryCodes(await response.json())
    : undefined;
  if (recoveryCodes === undefined) {
    throw new Error(twoFactorFailedMessage);
  }
  return recoveryCodes;
};

interface RecoveryCodesProps {
  recoveryCodes: string[];
  onSaved: () => void;
}

const RecoveryCodes = ({ recoveryCodes, onSaved }: RecoveryCodesProps) => (
  <section>
    <h2>Save your recovery codes</h2>
    <p>
      If you lose your authenticator app, each of these signs you in once in
      place of a code. Keep them somewhere safe: Wizzaroo won't show them again.
    </p>
    <ul>
      {recoveryCodes.map((recoveryCode) => (
        <li key={recoveryCode}>
          <code>{recoveryCode}</code>
        </li>
      ))}
    </ul>
    <button type="button" onClick={onSaved}>
      I've saved my recovery codes
    </button>
  </section>
);

interface TwoFactorSetupFormProps {
  setup: TotpSetup;
  onTurnedOn: () => void;
  onCancelled: () => void;
}

export const TwoFactorSetupForm = ({
  setup: { setupKey, setupUri },
  onTurnedOn,
  onCancelled,
}: TwoFactorSetupFormProps) => {
  const [problem, setProblem] = useState<string>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  if (recoveryCodes !== undefined) {
    return <RecoveryCodes recoveryCodes={recoveryCodes} onSaved={onTurnedOn} />;
  }

  const confirmCode = async (code: string) => {
    setRecoveryCodes(await turnOnTwoFactor(code));
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const code = readTextAnswer(new FormData(event.currentTarget), "code");
        runBusy(
          "Checking your code and turning on two-factor authentication…",
          () => confirmCode(code),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, twoFactorFailedMessage));
        });
      }}
    >
      <h2>Turn on two-factor authentication</h2>
      <p>
        In your authenticator app, add an account by typing in this key:{" "}
        <code>{setupKey}</code>
      </p>
      <p>
        <a href={setupUri}>Or open it in an authenticator app on this device</a>
      </p>
      <label>
        The 6-digit code your app now shows for Wizzaroo
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
        />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Turn on two-factor authentication
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface TwoFactorRemovalFormProps {
  onTurnedOff: () => void;
  onCancelled: () => void;
}

export const TwoFactorRemovalForm = ({
  onTurnedOff,
  onCancelled,
}: TwoFactorRemovalFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const turnOffTwoFactor = async (code: string) => {
    const response = await sendAccountChange("DELETE", "/api/two-factor", {
      code,
    });
    if (response.status === 403) {
      throw new ProblemToShowError(wrongCodeMessage);
    }
    if (!response.ok) {
      throw new Error(twoFactorFailedMessage);
    }
    onTurnedOff();
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const code = readTextAnswer(new FormData(event.currentTarget), "code");
        runBusy(
          "Checking your code and turning off two-factor authentication…",
          () => turnOffTwoFactor(code),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, twoFactorFailedMessage));
        });
      }}
    >
      <h2>Turn off two-factor authentication</h2>
      <label>
        A code from your authenticator app, or a recovery code
        <input name="code" autoComplete="one-time-code" required />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        Turn off two-factor authentication
      </button>
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};
