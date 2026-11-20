import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  isQuestComplete,
  type IslandQuest,
  type QuestFind,
  type QuestProgress,
  type QuestPuzzle,
} from "../../curriculum/island-quests.js";
import { rewardRules } from "../../curriculum/rewards.js";
import {
  useItemPictureUrl,
  usePictureUrls,
  type ItemShot,
} from "../character/item-picture.js";
import { AwardStage } from "../awards/award-stage.js";
import { ModalDialog } from "../modal-dialog.js";
import { MovablePopup } from "../movable-popup.js";
import { isMotionReduced } from "../reduced-motion.js";
import {
  countSolvedPuzzles,
  findFindState,
  findIslanderTalk,
  findThingLook,
  listHeldFinds,
  shuffleChoices,
  type FindState,
} from "./island-quest.js";

/**
 * What the Child sees of their Island's Quest (ADR 0058): the progress
 * bar and the rucksack in the explore bar, the rucksack's window with a
 * 3D picture of every Find, the cards for talking to Islanders and
 * looking at things, a Puzzle's question, and the Trophy at the end.
 */

const QuestIcon = ({ children }: { children: ReactNode }) => (
  <svg
    className="line-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const RucksackIcon = () => (
  <QuestIcon>
    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
    <rect x="5" y="7" width="14" height="14" rx="4" />
    <path d="M9 14h6v4H9z" />
    <path d="M5 12h14" />
  </QuestIcon>
);

export const SpeechIcon = () => (
  <QuestIcon>
    <path d="M4 5h16v10H9l-5 4z" />
  </QuestIcon>
);

export const HandIcon = () => (
  <QuestIcon>
    <path d="M8 12V5a1.5 1.5 0 0 1 3 0v6" />
    <path d="M11 11V4a1.5 1.5 0 0 1 3 0v7" />
    <path d="M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14" />
  </QuestIcon>
);

export const TrophyIcon = () => (
  <QuestIcon>
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a3 3 0 0 0 3 4" />
    <path d="M16 6h3a3 3 0 0 1-3 4" />
    <path d="M12 13v4" />
    <path d="M8 21h8l-1-4H9z" />
  </QuestIcon>
);

const LightbulbIcon = () => (
  <QuestIcon>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
  </QuestIcon>
);

const CloseIcon = () => (
  <QuestIcon>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </QuestIcon>
);

export const describeQuestProgress = (solved: number, total: number): string =>
  `Quest puzzles solved: ${String(solved)} of ${String(total)}`;

export const QuestProgressBar = ({
  quest,
  progress,
}: {
  quest: IslandQuest;
  progress: QuestProgress;
}) => {
  const solved = countSolvedPuzzles(quest, progress);
  const total = quest.puzzles.length;
  const isComplete = isQuestComplete(quest, progress);
  return (
    <div
      className={
        isComplete
          ? "explore-quest-progress complete"
          : "explore-quest-progress"
      }
      role="progressbar"
      aria-label={describeQuestProgress(solved, total)}
      data-tip={describeQuestProgress(solved, total)}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={solved}
    >
      {isComplete ? <TrophyIcon /> : <LightbulbIcon />}
      <span className="explore-quest-track" aria-hidden="true">
        <span
          className="explore-quest-fill"
          style={{ width: `${String((solved / total) * 100)}%` }}
        />
      </span>
      <span aria-hidden="true">
        {solved}/{total}
      </span>
    </div>
  );
};

const turntableFrames = 12;
const turntableFrameMs = 110;

const buildFindShot = (find: QuestFind, turn = 0.55): ItemShot => ({
  subject: "quest-find",
  look: find.look,
  turn,
});

/** A Find's 3D picture, taken in the shared studio, or its colours until it is. */
export const QuestFindPicture = ({
  find,
  state = "held",
}: {
  find: QuestFind;
  state?: FindState;
}) => {
  const shot = useMemo(() => buildFindShot(find), [find]);
  const url = useItemPictureUrl(state === "not-found" ? undefined : shot);
  return (
    <span className={`quest-find-picture ${state}`}>
      {state === "not-found" ? (
        <span className="quest-find-unknown" aria-hidden="true">
          ?
        </span>
      ) : url === undefined ? (
        <span
          className="quest-find-swatch"
          style={{
            background: `linear-gradient(135deg, ${find.look.colour}, ${find.look.trim})`,
          }}
        />
      ) : (
        <img src={url} alt="" width={96} height={96} draggable={false} />
      )}
    </span>
  );
};

/** A Find turning round and round, from twelve studio pictures. */
const TurningFind = ({ find }: { find: QuestFind }) => {
  const shots = useMemo(
    () =>
      Array.from({ length: turntableFrames }, (_, frame) =>
        buildFindShot(find, 0.55 + (frame / turntableFrames) * Math.PI * 2),
      ),
    [find],
  );
  const urls = usePictureUrls(shots);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (isMotionReduced()) {
      return;
    }
    const turn = setInterval(() => {
      setFrame((shown) => (shown + 1) % turntableFrames);
    }, turntableFrameMs);
    return () => {
      clearInterval(turn);
    };
  }, []);
  const url = urls[frame] ?? urls[0];
  return (
    <span className="quest-find-turntable" role="img" aria-label={find.name}>
      {url === undefined ? (
        <QuestFindPicture find={find} />
      ) : (
        <img src={url} alt="" width={192} height={192} draggable={false} />
      )}
    </span>
  );
};

const findStateLabels: Record<FindState, string> = {
  held: "In your rucksack",
  used: "Used",
  "not-found": "Not found yet",
};

export const RucksackDialog = ({
  quest,
  progress,
  islandName,
  isOpen,
  onClose,
}: {
  quest: IslandQuest;
  progress: QuestProgress;
  islandName: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [chosenFindId, setChosenFindId] = useState<string>();
  const held = listHeldFinds(quest, progress);
  const chosen =
    quest.finds.find(({ id }) => id === chosenFindId) ?? held.at(0);
  const chosenState =
    chosen === undefined
      ? undefined
      : findFindState(quest, progress, chosen.id);
  const solved = countSolvedPuzzles(quest, progress);
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Your rucksack"
      closeLabel="Close your rucksack"
    >
      <div className="rucksack">
        <section className="rucksack-quest" aria-label={quest.title}>
          <h3>{quest.title}</h3>
          <p>{quest.story}</p>
          <QuestProgressBar quest={quest} progress={progress} />
          <p className="rucksack-counts">
            {held.length === 0
              ? `Your rucksack is empty. Explore ${islandName} to find things to pick up!`
              : `${String(held.length)} ${held.length === 1 ? "thing" : "things"} in your rucksack, and ${String(solved)} of ${String(quest.puzzles.length)} puzzles solved.`}
          </p>
        </section>
        {chosen === undefined || chosenState === "not-found" ? null : (
          <section className="rucksack-chosen" aria-live="polite">
            <TurningFind key={chosen.id} find={chosen} />
            <div>
              <h3>{chosen.name}</h3>
              <p>{chosen.about}</p>
              <p className="rucksack-state">
                {chosenState === undefined ? "" : findStateLabels[chosenState]}
              </p>
            </div>
          </section>
        )}
        <ul className="rucksack-finds" aria-label="Everything on the Quest">
          {quest.finds.map((find) => {
            const state = findFindState(quest, progress, find.id);
            const label =
              state === "not-found"
                ? "Something still to find"
                : `${find.name}: ${findStateLabels[state]}`;
            return (
              <li key={find.id}>
                <button
                  type="button"
                  className={`rucksack-find ${state}`}
                  aria-label={label}
                  aria-pressed={chosen?.id === find.id}
                  disabled={state === "not-found"}
                  onClick={() => {
                    setChosenFindId(find.id);
                  }}
                >
                  <QuestFindPicture find={find} state={state} />
                  <span className="rucksack-find-name" aria-hidden="true">
                    {state === "not-found" ? "?" : find.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ModalDialog>
  );
};

const QuestCard = ({
  title,
  subtitle,
  text,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  text: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
}) => (
  <MovablePopup
    positionKey="explore-card"
    className="explore-sign quest-card"
    role="dialog"
    aria-labelledby="quest-card-title"
  >
    <header>
      <h2 id="quest-card-title">
        {title}
        {subtitle === undefined ? null : (
          <span className="quest-card-role">{subtitle}</span>
        )}
      </h2>
      <button
        type="button"
        className="explore-sign-close"
        aria-label={closeLabel}
        onClick={onClose}
      >
        <CloseIcon />
      </button>
    </header>
    <p>{text}</p>
    {children}
  </MovablePopup>
);

/** The Finds in the rucksack to choose one from, to give or to use. */
const FindPicker = ({
  finds,
  verb,
  targetName,
  onChosen,
}: {
  finds: QuestFind[];
  verb: "Give" | "Use";
  targetName: string;
  onChosen: (find: QuestFind) => void;
}) =>
  finds.length === 0 ? (
    <p className="quest-card-empty">
      Your rucksack is empty. Explore to find things to pick up!
    </p>
  ) : (
    <ul
      className="quest-find-picker"
      aria-label={`${verb} something from your rucksack`}
    >
      {finds.map((find) => (
        <li key={find.id}>
          <button
            type="button"
            className="quest-find-choice"
            aria-label={
              verb === "Give"
                ? `Give the ${find.name} to ${targetName}`
                : `Use the ${find.name} on the ${targetName}`
            }
            onClick={() => {
              onChosen(find);
            }}
          >
            <QuestFindPicture find={find} />
            <span aria-hidden="true">{find.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );

export const IslanderCard = ({
  quest,
  progress,
  islanderId,
  reply,
  onGive,
  onClose,
}: {
  quest: IslandQuest;
  progress: QuestProgress;
  islanderId: string;
  reply: string | undefined;
  onGive: (find: QuestFind) => void;
  onClose: () => void;
}) => {
  const [hintIndex, setHintIndex] = useState<number>();
  const [isGiving, setIsGiving] = useState(false);
  const talk = findIslanderTalk(quest, progress, islanderId);
  if (talk === undefined) {
    return null;
  }
  const { islander, says, puzzle, hints } = talk;
  const hint =
    hintIndex === undefined ? undefined : hints[hintIndex % hints.length];
  return (
    <QuestCard
      title={islander.name}
      subtitle={islander.role}
      text={reply ?? hint ?? says}
      closeLabel={`Say goodbye to ${islander.name}`}
      onClose={onClose}
    >
      <div className="quest-card-actions">
        {hints.length === 0 ? null : (
          <button
            type="button"
            className="explore-action"
            onClick={() => {
              setIsGiving(false);
              setHintIndex((shown) =>
                shown === undefined ? 0 : (shown + 1) % hints.length,
              );
            }}
          >
            <LightbulbIcon />
            {hintIndex === undefined ? "Ask for a hint" : "Another hint"}
          </button>
        )}
        {puzzle === undefined ? null : (
          <button
            type="button"
            className="explore-action"
            aria-expanded={isGiving}
            onClick={() => {
              setIsGiving((isShown) => !isShown);
            }}
          >
            <HandIcon />
            Give something
          </button>
        )}
      </div>
      {isGiving && puzzle !== undefined ? (
        <FindPicker
          finds={listHeldFinds(quest, progress)}
          verb="Give"
          targetName={islander.name}
          onChosen={(find) => {
            setHintIndex(undefined);
            onGive(find);
          }}
        />
      ) : null}
    </QuestCard>
  );
};

export const ThingCard = ({
  quest,
  progress,
  thingId,
  reply,
  onUse,
  onClose,
}: {
  quest: IslandQuest;
  progress: QuestProgress;
  thingId: string;
  reply: string | undefined;
  onUse: (find: QuestFind) => void;
  onClose: () => void;
}) => {
  const [isUsing, setIsUsing] = useState(false);
  const look = findThingLook(quest, progress, thingId);
  if (look === undefined) {
    return null;
  }
  const { thing, says, isSolved } = look;
  return (
    <QuestCard
      title={thing.name}
      text={reply ?? says}
      closeLabel={`Leave the ${thing.name}`}
      onClose={onClose}
    >
      {isSolved ? null : (
        <>
          <div className="quest-card-actions">
            <button
              type="button"
              className="explore-action"
              aria-expanded={isUsing}
              onClick={() => {
                setIsUsing((isShown) => !isShown);
              }}
            >
              <RucksackIcon />
              Use something
            </button>
          </div>
          {isUsing ? (
            <FindPicker
              finds={listHeldFinds(quest, progress)}
              verb="Use"
              targetName={thing.name}
              onChosen={onUse}
            />
          ) : null}
        </>
      )}
    </QuestCard>
  );
};

export const QuestQuestionCard = ({
  puzzle,
  onAnswered,
  onClose,
}: {
  puzzle: QuestPuzzle;
  onAnswered: () => void;
  onClose: () => void;
}) => {
  const [wrongChoices, setWrongChoices] = useState<readonly string[]>([]);
  const choices = shuffleChoices(puzzle);
  if (puzzle.question === undefined) {
    return null;
  }
  return (
    <QuestCard
      title={puzzle.title}
      text={puzzle.question.prompt}
      closeLabel="Come back to this later"
      onClose={onClose}
    >
      <div
        className="quest-question-choices"
        role="group"
        aria-label="Choose an answer"
      >
        {choices.map(({ text, isRight }) => (
          <button
            key={text}
            type="button"
            className="explore-action quest-question-choice"
            disabled={wrongChoices.includes(text)}
            onClick={() => {
              if (isRight) {
                onAnswered();
                return;
              }
              setWrongChoices((wrong) => [...wrong, text]);
            }}
          >
            {text}
          </button>
        ))}
      </div>
      <p className="quest-question-feedback" role="status" aria-live="polite">
        {wrongChoices.length === 0
          ? ""
          : "Not quite! Have another think and try again."}
      </p>
    </QuestCard>
  );
};

export const QuestTrophyDialog = ({
  quest,
  isOpen,
  onClose,
}: {
  quest: IslandQuest;
  isOpen: boolean;
  onClose: () => void;
}) => (
  <ModalDialog
    isOpen={isOpen}
    onClose={onClose}
    title={`You finished ${quest.title}!`}
    closeLabel="Close"
  >
    <div className="quest-trophy">
      <AwardStage
        islandId={quest.islandId}
        label={`The ${quest.trophyName} Award`}
      />
      <p>
        You solved all {quest.puzzles.length} puzzles! You have won the{" "}
        <strong>{quest.trophyName}</strong> Trophy, and{" "}
        <strong>{rewardRules.starsPerQuest} Stars</strong>.
      </p>
      <p>
        Your Trophy is on the shelf in your Room, and in your Awards on the
        World Map.
      </p>
      <button type="button" onClick={onClose}>
        Hooray!
      </button>
    </div>
  </ModalDialog>
);
