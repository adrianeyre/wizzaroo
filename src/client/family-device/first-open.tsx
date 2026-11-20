import { useState, type SubmitEvent } from "react";
import type { PicturePasswordPicture } from "../../server/children/picture-password.js";
import { CharacterPortrait } from "../character/character-preview.js";
import {
  isPicturePasswordComplete,
  PicturePasswordPicker,
  usePicturePasswordChoice,
} from "../picture-password-picker.js";
import type { FamilyChild } from "./playable-family.js";
import { ReadAloudButton } from "../read-aloud-button.js";
import { BusyProgress } from "../busy/busy-progress.js";

const longestCharacterName = 30;
const conflictStatus = 409;

/** Shown in place of a Character's portrait until the Child has made one. */
export const NewPlayerPortrait = () => (
  <span className="character-portrait" aria-hidden="true">
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <circle cx="50" cy="42" r="18" fill="#93c5fd" />
      <path d="M22 88 C22 66 78 66 78 88 Z" fill="#93c5fd" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        fontSize="22"
        fontWeight="bold"
        fill="#1e3a8a"
      >
        ?
      </text>
    </svg>
  </span>
);

const putFirstOpenStep = async (
  path: string,
  body: object,
): Promise<"done" | "failed"> => {
  const response = await fetch(path, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // Another Family Device may have set it up first, which is just as good.
  return response.ok || response.status === conflictStatus ? "done" : "failed";
};

const offlineProblem =
  "Wizzaroo couldn't save that. Check this device is online, then try again.";

/** The setting-up step a form is waiting on, in words. */
interface SetUpStep {
  label: string;
  detail: string;
}

/**
 * Keeps which setting-up step a form is waiting on, so it can say so and
 * isn't sent twice meanwhile.
 */
const useSetUpSteps = () => {
  const [step, setStep] = useState<SetUpStep>();
  const runSteps = async (
    steps: (showStep: (shownStep: SetUpStep) => void) => Promise<void>,
  ): Promise<void> => {
    if (step !== undefined) {
      return;
    }
    try {
      await steps(setStep);
    } finally {
      setStep(undefined);
    }
  };
  return { step, isBusy: step !== undefined, runSteps };
};

const SetUpStepProgress = ({ step }: { step: SetUpStep | undefined }) =>
  step === undefined ? null : (
    <BusyProgress
      label={step.label}
      detail={step.detail}
      className="is-centred"
    />
  );

interface FirstPicturePasswordProps {
  childId: string;
  /** The Child's Character, when they already have one and play next. */
  characterName: string | null;
  onSet: () => Promise<void>;
  onBack: () => void;
}

const FirstPicturePassword = ({
  childId,
  characterName,
  onSet,
  onBack,
}: FirstPicturePasswordProps) => {
  const picturePasswordChoice = usePicturePasswordChoice();
  const { picturePassword, clearPictures } = picturePasswordChoice;
  const [firstChoice, setFirstChoice] = useState<PicturePasswordPicture[]>();
  const [problem, setProblem] = useState<string>();
  const { step, isBusy, runSteps } = useSetUpSteps();
  const stepCount = characterName === null ? 1 : 2;

  const savePicturePassword = () =>
    runSteps(async (showStep) => {
      showStep({
        label: "Saving the Picture Password…",
        detail: `Step 1 of ${String(stepCount)}: sending it to Wizzaroo`,
      });
      const outcome = await putFirstOpenStep(
        `/api/play/children/${childId}/picture-password`,
        { picturePassword },
      );
      if (outcome !== "done") {
        setProblem(offlineProblem);
        return;
      }
      if (characterName !== null) {
        showStep({
          label: `Getting ${characterName} ready to play…`,
          detail: "Step 2 of 2: fetching their Character from Wizzaroo",
        });
      }
      await onSet();
    });

  const choose = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }
    if (!isPicturePasswordComplete(picturePassword)) {
      setProblem("Tap 3 pictures first.");
      return;
    }
    setProblem(undefined);
    if (firstChoice === undefined) {
      setFirstChoice(picturePassword);
      clearPictures();
      return;
    }
    if (firstChoice.join() !== picturePassword.join()) {
      setFirstChoice(undefined);
      clearPictures();
      setProblem("Those pictures didn't match. Choose them again.");
      return;
    }
    savePicturePassword().catch(() => {
      setProblem(offlineProblem);
    });
  };

  return (
    <form
      onSubmit={choose}
      data-read-aloud-section
      aria-busy={isBusy ? true : undefined}
    >
      <h1>A Parent chooses the first Picture Password</h1>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <p>
        {firstChoice === undefined
          ? "This Child is new here. Parent, choose the 3 pictures they will tap to start playing."
          : "Now tap the same 3 pictures again, in the same order."}
      </p>
      <PicturePasswordPicker {...picturePasswordChoice} />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      <button type="submit" disabled={isBusy}>
        {firstChoice === undefined ? "Next" : "Save the Picture Password"}
      </button>
      <SetUpStepProgress step={step} />
      <button type="button" onClick={onBack} disabled={isBusy}>
        Not now
      </button>
    </form>
  );
};

interface CharacterNamingProps {
  childId: string;
  onMade: () => Promise<void>;
}

const CharacterNaming = ({ childId, onMade }: CharacterNamingProps) => {
  const [problem, setProblem] = useState<string>();
  const { step, isBusy, runSteps } = useSetUpSteps();

  const makeCharacter = (name: string) =>
    runSteps(async (showStep) => {
      showStep({
        label: `Making ${name}, your Character…`,
        detail: "Step 1 of 2: saving their name with Wizzaroo",
      });
      const outcome = await putFirstOpenStep(
        `/api/play/children/${childId}/character`,
        { name },
      );
      if (outcome !== "done") {
        setProblem(offlineProblem);
        return;
      }
      showStep({
        label: `Getting ${name} ready to play…`,
        detail: "Step 2 of 2: fetching your Character from Wizzaroo",
      });
      await onMade();
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isBusy) {
          return;
        }
        const typedName = new FormData(event.currentTarget).get(
          "characterName",
        );
        const name = typeof typedName === "string" ? typedName.trim() : "";
        if (name === "") {
          setProblem("Give your Character a name first.");
          return;
        }
        setProblem(undefined);
        makeCharacter(name).catch(() => {
          setProblem(offlineProblem);
        });
      }}
      data-read-aloud-section
      aria-busy={isBusy ? true : undefined}
    >
      <h1>Make your Character</h1>
      <ReadAloudButton className="read-aloud is-small" readsSection />
      <CharacterPortrait loadout={{}} />
      <p>
        You can dress your Character in the wardrobe once you&apos;re playing.
      </p>
      <label>
        Your Character&apos;s name
        <input
          name="characterName"
          maxLength={longestCharacterName}
          autoComplete="off"
        />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      <button type="submit" disabled={isBusy}>
        That&apos;s me!
      </button>
      <SetUpStepProgress step={step} />
    </form>
  );
};

interface FirstOpenSetupProps {
  child: FamilyChild;
  /** Fetches the set-up Child from the server and starts their play. */
  onSetUp: () => Promise<void>;
  onBack: () => void;
}

/** A Child brought in by their School: a Parent sets the Picture Password, then the Child makes and names their Character. */
export const FirstOpenSetup = ({
  child,
  onSetUp,
  onBack,
}: FirstOpenSetupProps) => {
  const [hasPicturePassword, setHasPicturePassword] = useState(
    child.picturePasswordHash !== null,
  );

  return (
    <main className="menu">
      {hasPicturePassword ? (
        child.characterName === null ? (
          <CharacterNaming childId={child.id} onMade={onSetUp} />
        ) : null
      ) : (
        <FirstPicturePassword
          childId={child.id}
          characterName={child.characterName}
          onSet={async () => {
            if (child.characterName === null) {
              setHasPicturePassword(true);
              return;
            }
            await onSetUp();
          }}
          onBack={onBack}
        />
      )}
    </main>
  );
};
