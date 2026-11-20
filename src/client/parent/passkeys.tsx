import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import { useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  lastSignInMethodMessage,
  ProblemToShowError,
  readProblem,
  readSecondFactorRefusal,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { PhonePasskeySection } from "./passkey-hand-off.js";
import {
  isPasskeyRegistrationOptions,
  isPasskeySignInOptions,
  longestPasskeyName,
  passkeySteps,
  type PasskeyStepTeller,
} from "./passkey-options.js";

export interface ParentPasskey {
  id: string;
  name: string;
  createdAt: string;
}

const passkeyAddingFailedMessage =
  "Wizzaroo couldn't add the passkey. Try again in a moment.";

const passkeyRemovalFailedMessage =
  "Wizzaroo couldn't remove the passkey. Try again in a moment.";

export const isParentPasskey = (value: unknown): value is ParentPasskey =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "createdAt" in value &&
  typeof value.createdAt === "string";

const formatAddedDate = (createdAt: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(createdAt),
  );

const addPasskey = async (
  name: string,
  tellStep: PasskeyStepTeller,
): Promise<void> => {
  tellStep(passkeySteps.gettingReady);
  const optionsResponse = await sendAccountChange(
    "POST",
    "/api/passkey-registration-options",
  );
  if (optionsResponse.status === 403) {
    throw await readSecondFactorRefusal(optionsResponse);
  }
  const optionsJSON: unknown = optionsResponse.ok
    ? await optionsResponse.json()
    : undefined;
  if (!isPasskeyRegistrationOptions(optionsJSON)) {
    throw new Error("Wizzaroo didn't send the passkey's options");
  }
  tellStep(passkeySteps.waiting);
  const response = await startRegistration({ optionsJSON });
  tellStep(passkeySteps.saving);
  const addedResponse = await sendAccountChange("POST", "/api/passkeys", {
    name,
    response,
  });
  if (!addedResponse.ok) {
    throw new Error("Wizzaroo didn't keep the passkey");
  }
};

interface PasskeyFormProps {
  onAdded: (name: string) => void;
  onPhoneFinished: () => void;
  onCancelled: () => void;
}

const ThisDevicePasskeyForm = ({
  onAdded,
}: Pick<PasskeyFormProps, "onAdded">) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();

  const addNamedPasskey = async (name: string) => {
    await addPasskey(name, setPasskeyStep);
    onAdded(name);
  };

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = readTextAnswer(
          new FormData(event.currentTarget),
          "passkeyName",
        ).trim();
        setPasskeyStep(undefined);
        runBusy(`Adding your passkey on ${name}…`, () =>
          addNamedPasskey(name),
        ).catch((error: unknown) => {
          setProblem(readProblem(error, passkeyAddingFailedMessage));
        });
      }}
    >
      <h3>Add one on this device</h3>
      <label>
        What is it on? For example, "My laptop"
        <input
          name="passkeyName"
          maxLength={longestPasskeyName}
          pattern=".*\S.*"
          required
        />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : (
        <BusyProgress label={busyLabel} detail={passkeyStep} />
      )}
      <button type="submit" disabled={isBusy}>
        Add the passkey
      </button>
    </form>
  );
};

export const PasskeyForm = ({
  onAdded,
  onPhoneFinished,
  onCancelled,
}: PasskeyFormProps) => (
  <section className="passkey-adding" aria-labelledby="add-a-passkey">
    <h2 id="add-a-passkey">Add a passkey</h2>
    <p>
      A passkey lets you sign in with your fingerprint, face or screen lock
      instead of a password.
    </p>
    <div className="passkey-adding-ways">
      {browserSupportsWebAuthn() ? (
        <ThisDevicePasskeyForm onAdded={onAdded} />
      ) : (
        <p>This browser can't keep a passkey, but your phone can.</p>
      )}
      <PhonePasskeySection onFinished={onPhoneFinished} />
    </div>
    <button type="button" onClick={onCancelled}>
      Cancel
    </button>
  </section>
);

const removePasskey = async (passkeyId: string): Promise<void> => {
  const response = await sendAccountChange(
    "DELETE",
    `/api/passkeys/${encodeURIComponent(passkeyId)}`,
  );
  if (response.status === 409) {
    throw new ProblemToShowError(lastSignInMethodMessage);
  }
  if (!response.ok) {
    throw new Error(passkeyRemovalFailedMessage);
  }
};

interface PasskeyListProps {
  passkeys: ParentPasskey[];
  onRemoved: (name: string) => void;
}

export const PasskeyList = ({ passkeys, onRemoved }: PasskeyListProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  if (passkeys.length === 0) {
    return <p>You have no passkeys yet.</p>;
  }

  return (
    <div aria-busy={isBusy}>
      <ul>
        {passkeys.map(({ id, name, createdAt }) => (
          <li key={id}>
            {name}, added {formatAddedDate(createdAt)}{" "}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              disabled={isBusy}
              onClick={() => {
                setProblem(undefined);
                runBusy(`Removing your passkey on ${name}…`, async () => {
                  await removePasskey(id);
                  onRemoved(name);
                }).catch((error: unknown) => {
                  setProblem(readProblem(error, passkeyRemovalFailedMessage));
                });
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </div>
  );
};

const passkeyConfirmationFailedMessage =
  "Wizzaroo couldn't check your passkey. Try again, or add a new one below.";

/** Asks for a challenge only the signed-in adult's own passkeys may answer, and answers it with one. */
export const answerOwnPasskeyChallenge = async (
  noPasskeysProblem: string,
  tellStep: PasskeyStepTeller = () => undefined,
): Promise<AuthenticationResponseJSON> => {
  tellStep(passkeySteps.gettingReady);
  const optionsResponse = await sendAccountChange(
    "POST",
    "/api/passkey-confirmation-options",
  );
  if (optionsResponse.status === 404) {
    throw new ProblemToShowError(noPasskeysProblem);
  }
  const optionsJSON: unknown = optionsResponse.ok
    ? await optionsResponse.json()
    : undefined;
  if (!isPasskeySignInOptions(optionsJSON)) {
    throw new Error("Wizzaroo didn't send the passkey's options");
  }
  tellStep(passkeySteps.waiting);
  return startAuthentication({ optionsJSON });
};

const confirmSignInWithPasskey = async (
  tellStep: PasskeyStepTeller,
): Promise<void> => {
  const response = await answerOwnPasskeyChallenge(
    "You have no passkeys yet. Add one below to carry on.",
    tellStep,
  );
  tellStep(passkeySteps.checking);
  const confirmedResponse = await sendAccountChange(
    "POST",
    "/api/passkey-confirmations",
    { response },
  );
  if (confirmedResponse.status === 401) {
    throw new ProblemToShowError(
      "That passkey isn't one of yours. Try another, or add a new one below.",
    );
  }
  if (!confirmedResponse.ok) {
    throw new Error(passkeyConfirmationFailedMessage);
  }
};

interface PasskeyConfirmationProps {
  onConfirmed: () => void;
}

/** Lets someone who signed in with a password prove it's them with a passkey they already have. */
export const PasskeyConfirmation = ({
  onConfirmed,
}: PasskeyConfirmationProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();

  if (!browserSupportsWebAuthn()) {
    return null;
  }

  return (
    <div aria-busy={isBusy}>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => {
          setProblem(undefined);
          setPasskeyStep(undefined);
          runBusy("Checking it's you with your passkey…", async () => {
            await confirmSignInWithPasskey(setPasskeyStep);
            onConfirmed();
          }).catch((error: unknown) => {
            setProblem(readProblem(error, passkeyConfirmationFailedMessage));
          });
        }}
      >
        Use your passkey
      </button>
      {busyLabel === undefined ? null : (
        <BusyProgress label={busyLabel} detail={passkeyStep} />
      )}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </div>
  );
};
