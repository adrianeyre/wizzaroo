import { startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState, type SubmitEvent } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  readProblem,
  readSecondFactorRefusal,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import {
  isPasskeyRegistrationOptions,
  longestPasskeyName,
  passkeySteps,
  type PasskeyStepTeller,
} from "./passkey-options.js";
import { QrCode } from "./qr-code.js";
import { ReadAloudButton } from "../read-aloud-button.js";

interface PasskeyHandOff {
  url: string;
  expiresAt: string;
}

const isPasskeyHandOff = (value: unknown): value is PasskeyHandOff =>
  typeof value === "object" &&
  value !== null &&
  "url" in value &&
  typeof value.url === "string" &&
  "expiresAt" in value &&
  typeof value.expiresAt === "string";

const handOffFailedMessage =
  "Wizzaroo couldn't make a code for your phone. Try again in a moment.";

const fetchPasskeyHandOff = async (): Promise<PasskeyHandOff> => {
  const response = await sendAccountChange("POST", "/api/passkey-hand-offs");
  if (response.status === 403) {
    throw await readSecondFactorRefusal(response);
  }
  const handOff: unknown = response.ok ? await response.json() : undefined;
  if (!isPasskeyHandOff(handOff)) {
    throw new Error(handOffFailedMessage);
  }
  return handOff;
};

const formatExpiryTime = (expiresAt: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(
    new Date(expiresAt),
  );

type HandOffView =
  | { kind: "making" }
  | { kind: "shown"; handOff: PasskeyHandOff }
  | { kind: "failed"; problem: string };

interface PhonePasskeySectionProps {
  onFinished: () => void;
}

export const PhonePasskeySection = ({
  onFinished,
}: PhonePasskeySectionProps) => {
  const [view, setView] = useState<HandOffView>({ kind: "making" });
  const [isCopied, setIsCopied] = useState(false);

  const [codeVersion, setCodeVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    fetchPasskeyHandOff().then(
      (handOff) => {
        if (isCurrent) {
          setView({ kind: "shown", handOff });
        }
      },
      (error: unknown) => {
        if (isCurrent) {
          setView({
            kind: "failed",
            problem: readProblem(error, handOffFailedMessage),
          });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [codeVersion]);

  const makeNewHandOff = () => {
    setIsCopied(false);
    setView({ kind: "making" });
    setCodeVersion((version) => version + 1);
  };

  return (
    <section
      className="passkey-hand-off"
      aria-labelledby="phone-passkey"
      aria-busy={view.kind === "making"}
    >
      <h3 id="phone-passkey">Add one on your phone</h3>
      <p>
        Scan this code with your phone's camera. It opens Wizzaroo on your
        phone, where you add a passkey kept on that phone. You don't need to
        sign in there first.
      </p>
      {view.kind === "making" ? (
        <BusyProgress label="Making a code for your phone to scan…" />
      ) : null}
      {view.kind === "failed" ? <p role="alert">{view.problem}</p> : null}
      {view.kind === "shown" ? (
        <>
          <QrCode
            text={view.handOff.url}
            label="QR code to add a passkey on your phone"
          />
          <p>
            The code works once, until{" "}
            {formatExpiryTime(view.handOff.expiresAt)}. Keep it to yourself:
            whoever scans it can add a passkey to your account.
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(view.handOff.url).then(() => {
                setIsCopied(true);
              });
            }}
          >
            Copy the link instead
          </button>
          <p role="status">{isCopied ? "Link copied." : ""}</p>
        </>
      ) : null}
      <button
        type="button"
        disabled={view.kind === "making"}
        onClick={makeNewHandOff}
      >
        Make a new code
      </button>
      <button type="button" onClick={onFinished}>
        I've added it on my phone
      </button>
    </section>
  );
};

type HandOffAddingView = "naming" | "added" | "refused";

const handOffAddingFailedMessage =
  "Wizzaroo couldn't add the passkey. Try again in a moment.";

const addHandedOffPasskey = async (
  token: string,
  name: string,
  tellStep: PasskeyStepTeller,
): Promise<HandOffAddingView> => {
  tellStep(passkeySteps.gettingReady);
  const optionsResponse = await sendAccountChange(
    "POST",
    "/api/passkey-hand-off-registration-options",
    { token },
  );
  if (optionsResponse.status === 404) {
    return "refused";
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
  const addedResponse = await sendAccountChange(
    "POST",
    "/api/passkey-hand-off-passkeys",
    { token, name, response },
  );
  if (addedResponse.status === 404) {
    return "refused";
  }
  if (!addedResponse.ok) {
    throw new Error("Wizzaroo didn't keep the passkey");
  }
  return "added";
};

interface PasskeyHandOffFormProps {
  token: string;
}

export const PasskeyHandOffForm = ({ token }: PasskeyHandOffFormProps) => {
  const [view, setView] = useState<HandOffAddingView>("naming");
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const [passkeyStep, setPasskeyStep] = useState<string>();

  const addNamedPasskey = async (name: string) => {
    setView(await addHandedOffPasskey(token, name, setPasskeyStep));
  };

  if (view === "added") {
    return (
      <section>
        <h2>Add a passkey on this phone</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="status">
          Passkey added. You can now sign in on this phone with it.
        </p>
        <a href="#sign-in">Sign in</a>
      </section>
    );
  }

  if (view === "refused") {
    return (
      <section>
        <h2>Add a passkey on this phone</h2>
        <ReadAloudButton className="read-aloud is-small" readsSection />
        <p role="alert">
          That code has expired or has already been used. Make a new one under
          "Your account" on the computer you're signed in on.
        </p>
      </section>
    );
  }

  return (
    <form
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProblem(undefined);
        setPasskeyStep(undefined);
        const name = readTextAnswer(
          new FormData(event.currentTarget),
          "passkeyName",
        ).trim();
        runBusy(`Adding your passkey on ${name}…`, () =>
          addNamedPasskey(name),
        ).catch(() => {
          setProblem(handOffAddingFailedMessage);
        });
      }}
    >
      <h2>Add a passkey on this phone</h2>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <p>
        A passkey lets you sign in to Wizzaroo on this phone with your
        fingerprint, face or screen lock.
      </p>
      <label>
        What is it on? For example, "My phone"
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
