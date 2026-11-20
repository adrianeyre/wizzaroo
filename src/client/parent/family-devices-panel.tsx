import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import {
  ProblemToShowError,
  readProblem,
  readTextAnswer,
  sendAccountChange,
} from "./account-changes.js";
import { answerOwnPasskeyChallenge } from "./passkeys.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

interface FamilyDevice {
  id: string;
  name: string;
  createdAt: string;
  lastSeenAt: string;
  lastSeenFrom: string | null;
}

/** The ways a Parent can prove it's them before this browser becomes a Family Device (#303). */
interface ProofMethods {
  hasPassword: boolean;
  hasPasskey: boolean;
  isTwoFactorOn: boolean;
}

/** What a Parent gives to prove it's them, as the API takes it. */
type FamilyDeviceProof =
  { currentPassword: string } | { code: string } | { passkey: unknown };

type FamilyDevicesView =
  | { kind: "loading" }
  | { kind: "listed"; familyDevices: FamilyDevice[] }
  | { kind: "failed" };

const longestFamilyDeviceName = 40;

const familyDeviceCreationFailedMessage =
  "Wizzaroo couldn't make this browser a Family Device. Try again in a moment.";

const familyDeviceProofProblems = new Map([
  [
    "account-proof-required",
    "Prove it's you first: enter your password or a code, or use your passkey.",
  ],
  [
    "second-factor-proof-required",
    "Teachers and the Admin prove it's them with a passkey or a code from their authenticator app.",
  ],
]);

const wrongFamilyDeviceProofMessage =
  "That didn't prove it's you, so this browser isn't a Family Device. Try again.";

const tooManyFamilyDeviceProofsMessage =
  "Too many tries. Wait a while, then try again.";

const familyDeviceSignOutFailedMessage =
  "Wizzaroo couldn't sign that Family Device out. Try again in a moment.";

const isFamilyDevice = (value: unknown): value is FamilyDevice =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string" &&
  "createdAt" in value &&
  typeof value.createdAt === "string" &&
  "lastSeenAt" in value &&
  typeof value.lastSeenAt === "string" &&
  "lastSeenFrom" in value &&
  (value.lastSeenFrom === null || typeof value.lastSeenFrom === "string");

const isFamilyDeviceList = (value: unknown): value is FamilyDevice[] =>
  Array.isArray(value) && value.every(isFamilyDevice);

const formatSignedInDate = (date: string): string =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
    new Date(date),
  );

const formatLastSeenAt = (date: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(new Date(date));

/** When, and from where, a device was last used, so a copy playing elsewhere stands out (#302). */
const describeLastUse = ({ lastSeenAt, lastSeenFrom }: FamilyDevice): string =>
  lastSeenFrom === null
    ? `last used ${formatLastSeenAt(lastSeenAt)}`
    : `last used ${formatLastSeenAt(lastSeenAt)} from ${lastSeenFrom}`;

const fetchFamilyDevicesView = async (): Promise<FamilyDevicesView> => {
  const response = await fetch("/api/family-devices");
  const familyDevices: unknown = response.ok
    ? await response.json()
    : undefined;
  return isFamilyDeviceList(familyDevices)
    ? { kind: "listed", familyDevices }
    : { kind: "failed" };
};

const fetchProofMethods = async (): Promise<ProofMethods | undefined> => {
  const response = await fetch("/api/sign-in-methods");
  const methods: unknown = response.ok ? await response.json() : undefined;
  if (
    typeof methods !== "object" ||
    methods === null ||
    !("hasPassword" in methods) ||
    typeof methods.hasPassword !== "boolean" ||
    !("passkeys" in methods) ||
    !Array.isArray(methods.passkeys) ||
    !("isTwoFactorOn" in methods) ||
    typeof methods.isTwoFactorOn !== "boolean"
  ) {
    return undefined;
  }
  return {
    hasPassword: methods.hasPassword,
    hasPasskey: methods.passkeys.length > 0,
    isTwoFactorOn: methods.isTwoFactorOn,
  };
};

const readErrorCode = async (response: Response): Promise<unknown> => {
  const body: unknown = await response.json().catch(() => undefined);
  return typeof body === "object" && body !== null && "code" in body
    ? body.code
    : undefined;
};

const readTypedProof = (answers: FormData): FamilyDeviceProof | undefined => {
  const currentPassword = readTextAnswer(answers, "currentPassword");
  if (currentPassword !== "") {
    return { currentPassword };
  }
  const code = readTextAnswer(answers, "code");
  return code === "" ? undefined : { code };
};

const readFamilyDeviceName = (answers: FormData): string => {
  const name = readTextAnswer(answers, "familyDeviceName").trim();
  if (name === "") {
    throw new ProblemToShowError("Give this browser a name first.");
  }
  return name;
};

const createFamilyDevice = async (
  name: string,
  proof: FamilyDeviceProof | undefined,
): Promise<void> => {
  const response = await sendAccountChange("POST", "/api/family-devices", {
    name,
    ...proof,
  });
  if (response.status === 403) {
    const code = await readErrorCode(response);
    throw new ProblemToShowError(
      (typeof code === "string"
        ? familyDeviceProofProblems.get(code)
        : undefined) ?? wrongFamilyDeviceProofMessage,
    );
  }
  if (response.status === 429) {
    throw new ProblemToShowError(tooManyFamilyDeviceProofsMessage);
  }
  if (!response.ok) {
    throw new Error(familyDeviceCreationFailedMessage);
  }
};

const signOutFamilyDevice = async (familyDeviceId: string): Promise<void> => {
  const response = await sendAccountChange(
    "DELETE",
    `/api/family-devices/${familyDeviceId}`,
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(familyDeviceSignOutFailedMessage);
  }
};

interface FamilyDeviceFormProps {
  proofMethods: ProofMethods;
  onCreated: (name: string) => void;
  onCancelled: () => void;
}

/**
 * A Family Device stays signed in long after the sign-in that makes it, so making one asks for a fresh proof (#303): the
 * Parent's password, a code from their authenticator app, or their passkey.
 */
const FamilyDeviceForm = ({
  proofMethods: { hasPassword, hasPasskey, isTwoFactorOn },
  onCreated,
  onCancelled,
}: FamilyDeviceFormProps) => {
  const [problem, setProblem] = useState<string>();
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const isPasskeyOffered = hasPasskey && browserSupportsWebAuthn();
  const isTypedProofOffered = hasPassword || isTwoFactorOn;

  const makeFamilyDevice = async (
    familyDeviceForm: HTMLFormElement,
    readProof: (answers: FormData) => Promise<FamilyDeviceProof | undefined>,
    describeWork: (name: string) => string,
  ) => {
    const answers = new FormData(familyDeviceForm);
    const name = readFamilyDeviceName(answers);
    const isMade = await runBusy(describeWork(name), async () => {
      await createFamilyDevice(name, await readProof(answers));
      return true;
    });
    if (isMade === true) {
      onCreated(name);
    }
  };
  const showProblem = (error: unknown) => {
    setProblem(readProblem(error, familyDeviceCreationFailedMessage));
  };

  return (
    <form
      ref={setForm}
      aria-busy={isBusy}
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProblem(undefined);
        makeFamilyDevice(
          event.currentTarget,
          (answers) => Promise.resolve(readTypedProof(answers)),
          (name) => `Checking it's you and making ${name} a Family Device…`,
        ).catch(showProblem);
      }}
    >
      <label>
        A name for this browser, such as Kitchen tablet
        <input
          name="familyDeviceName"
          maxLength={longestFamilyDeviceName}
          autoComplete="off"
        />
      </label>
      <p>
        Each Child then opens their Character here by tapping its portrait and
        their Picture Password. This signs you out of this browser, so the
        Children never use Wizzaroo as you.
      </p>
      <p>
        A Family Device stays signed in for a long time, so prove it&apos;s you
        first.
      </p>
      {hasPassword ? (
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
          {hasPassword ? "Or a code" : "A code"} from your authenticator app
          <input name="code" inputMode="numeric" autoComplete="one-time-code" />
        </label>
      ) : null}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {isTypedProofOffered ? (
        <button type="submit" disabled={isBusy}>
          Make it a Family Device
        </button>
      ) : null}
      {isPasskeyOffered ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (form === null) {
              return;
            }
            setProblem(undefined);
            makeFamilyDevice(
              form,
              async () => ({
                passkey: await answerOwnPasskeyChallenge(
                  "You have no passkeys yet.",
                ),
              }),
              (name) =>
                `Waiting for your passkey, then making ${name} a Family Device…`,
            ).catch(showProblem);
          }}
        >
          Use your passkey and make it a Family Device
        </button>
      ) : null}
      {isTypedProofOffered || isPasskeyOffered ? null : (
        <p role="alert">
          Set up a password, a passkey this browser can use, or two-factor
          authentication first, then make this browser a Family Device.
        </p>
      )}
      <button type="button" onClick={onCancelled}>
        Cancel
      </button>
    </form>
  );
};

interface FamilyDeviceListProps {
  familyDevices: FamilyDevice[];
  onSignedOut: () => void;
}

const FamilyDeviceList = ({
  familyDevices,
  onSignedOut,
}: FamilyDeviceListProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  return familyDevices.length === 0 ? (
    <p>No Family Devices are signed in.</p>
  ) : (
    <>
      <ul aria-busy={isBusy}>
        {familyDevices.map((familyDevice) => (
          <li key={familyDevice.id}>
            <p>
              {familyDevice.name}, signed in{" "}
              {formatSignedInDate(familyDevice.createdAt)},{" "}
              {describeLastUse(familyDevice)}
            </p>
            <button
              type="button"
              aria-label={`Sign out ${familyDevice.name}`}
              disabled={isBusy}
              onClick={() => {
                runBusy(`Signing out ${familyDevice.name}…`, async () => {
                  await signOutFamilyDevice(familyDevice.id);
                  return true;
                }).then(
                  (isSignedOut) => {
                    if (isSignedOut === true) {
                      setProblem(undefined);
                      onSignedOut();
                    }
                  },
                  () => {
                    setProblem(familyDeviceSignOutFailedMessage);
                  },
                );
              }}
            >
              Sign out
            </button>
          </li>
        ))}
      </ul>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
    </>
  );
};

interface FamilyDevicesPanelProps {
  onThisBrowserMadeFamilyDevice: (name: string) => void;
}

export const FamilyDevicesPanel = ({
  onThisBrowserMadeFamilyDevice,
}: FamilyDevicesPanelProps) => {
  const [view, setView] = useState<FamilyDevicesView>({ kind: "loading" });
  const [proofMethods, setProofMethods] = useState<ProofMethods>();
  const [isFormFailed, setIsFormFailed] = useState(false);
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const showFamilyDevices = useCallback(() => {
    void fetchFamilyDevicesView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showFamilyDevices, [showFamilyDevices]);

  return (
    <section aria-busy={isBusy}>
      <h1>Family Devices</h1>
      <p>
        A Family Device is a tablet or computer your Children play on, even with
        no network.
      </p>
      {proofMethods === undefined ? (
        <>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              setIsFormFailed(false);
              runBusy("Checking how you can prove it's you…", async () => ({
                methods: await fetchProofMethods(),
              })).then(
                (answer) => {
                  if (answer !== undefined) {
                    setProofMethods(answer.methods);
                    setIsFormFailed(answer.methods === undefined);
                  }
                },
                () => {
                  setIsFormFailed(true);
                },
              );
            }}
          >
            Make this browser a Family Device
          </button>
          {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
        </>
      ) : (
        <FamilyDeviceForm
          proofMethods={proofMethods}
          onCreated={onThisBrowserMadeFamilyDevice}
          onCancelled={() => {
            setProofMethods(undefined);
          }}
        />
      )}
      {isFormFailed ? (
        <p role="alert">{familyDeviceCreationFailedMessage}</p>
      ) : null}
      <h2>Signed-in Family Devices</h2>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading your signed-in Family Devices…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load your Family Devices. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <FamilyDeviceList
          familyDevices={view.familyDevices}
          onSignedOut={showFamilyDevices}
        />
      ) : null}
    </section>
  );
};
