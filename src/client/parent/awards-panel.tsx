import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useState,
  type SubmitEvent,
} from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import { buildIslandsOnMap } from "../../curriculum/island-access.js";
import {
  findQuestProgress,
  isPuzzleWithinReach,
  isQuestComplete,
  islandQuests,
  type IslandQuest,
  type QuestProgress,
  type QuestPuzzle,
} from "../../curriculum/island-quests.js";
import {
  mostParentStarsADay,
  parentStarAwardSizes,
  rewardRules,
  type ParentStarAwardSize,
} from "../../curriculum/rewards.js";
import { findIsland } from "../../curriculum/world-map.js";
import {
  CheckIcon,
  LockIcon,
  StarIcon,
  TrophyIcon,
} from "../site-header/icons.js";
import {
  ChildTiles,
  fetchChildrenView,
  type Child,
  type ChildrenView,
} from "./children-panel.js";
import { canDrawWebGL } from "./webgl-support.js";

const StarsStage = lazy(async () => ({
  default: (await import("./award-stages.js")).StarsStage,
}));

const ChestStage = lazy(async () => ({
  default: (await import("./award-stages.js")).ChestStage,
}));

/** What the server says of one Child's Stars, their Family Chest and their Quests (ADR 0063). */
export interface ChildAwards {
  childId: string;
  stars: number;
  starsGivenToday: number;
  familyChestActivityCount: number;
  questProgress: QuestProgress[];
}

type AwardsView =
  | { kind: "loading" }
  | { kind: "shown"; awards: ChildAwards }
  | { kind: "failed" };

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isQuestProgress = (value: unknown): value is QuestProgress =>
  typeof value === "object" &&
  value !== null &&
  "islandId" in value &&
  typeof value.islandId === "string" &&
  "pickedUpFindIds" in value &&
  isStringList(value.pickedUpFindIds) &&
  "solvedPuzzleIds" in value &&
  isStringList(value.solvedPuzzleIds);

export const isChildAwards = (value: unknown): value is ChildAwards =>
  typeof value === "object" &&
  value !== null &&
  "childId" in value &&
  typeof value.childId === "string" &&
  "stars" in value &&
  isCount(value.stars) &&
  "starsGivenToday" in value &&
  isCount(value.starsGivenToday) &&
  "familyChestActivityCount" in value &&
  isCount(value.familyChestActivityCount) &&
  "questProgress" in value &&
  Array.isArray(value.questProgress) &&
  value.questProgress.every(isQuestProgress);

const readChildAwards = async (response: Response): Promise<ChildAwards> => {
  const awards: unknown = response.ok ? await response.json() : undefined;
  if (!isChildAwards(awards)) {
    throw new Error("Wizzaroo didn't send the Child's Awards");
  }
  return awards;
};

const fetchChildAwards = async (childId: string): Promise<ChildAwards> =>
  readChildAwards(await fetch(`/api/children/${childId}/awards`));

class DailyStarsGivenError extends Error {
  override readonly name = "DailyStarsGivenError";
}

const giveStars = async (
  childId: string,
  stars: ParentStarAwardSize,
): Promise<ChildAwards> => {
  const response = await fetch(`/api/children/${childId}/star-awards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stars }),
  });
  if (response.status === 409) {
    throw new DailyStarsGivenError();
  }
  return readChildAwards(response);
};

const describeStars = (stars: number) =>
  `${String(stars)} ${stars === 1 ? "Star" : "Stars"}`;

/** A flat picture in place of the 3D one, for a browser that can't draw WebGL. */
const FlatStars = () => (
  <svg className="flat-stars" viewBox="0 0 120 80" aria-hidden="true">
    <path d="m60 6 7.6 15.4 17 2.5-12.3 12 2.9 16.9L60 44.8l-15.2 8 2.9-16.9-12.3-12 17-2.5z" />
    <path d="m22 36 4.4 8.9 9.8 1.4-7.1 6.9 1.7 9.8L22 58.4l-8.8 4.6 1.7-9.8-7.1-6.9 9.8-1.4z" />
    <path d="m98 34 4.4 8.9 9.8 1.4-7.1 6.9 1.7 9.8L98 56.4l-8.8 4.6 1.7-9.8-7.1-6.9 9.8-1.4z" />
  </svg>
);

const FlatChest = () => (
  <svg className="flat-chest" viewBox="0 0 120 80" aria-hidden="true">
    <path className="flat-chest-lid" d="M22 34c0-14 16-22 38-22s38 8 38 22z" />
    <rect className="flat-chest-body" x="22" y="34" width="76" height="36" />
    <rect className="flat-chest-band" x="22" y="34" width="76" height="6" />
    <rect className="flat-chest-lock" x="54" y="38" width="12" height="14" />
  </svg>
);

const StageLoading = ({ label }: { label: string }) => (
  <BusyProgress className="is-compact award-stage-busy" label={label} />
);

interface GiveStarsProps {
  nickname: string;
  awards: ChildAwards;
  onGiven: (stars: ParentStarAwardSize) => Promise<void>;
}

const GiveStars = ({ nickname, awards, onGiven }: GiveStarsProps) => {
  const hintId = useId();
  const starsLeftToday = Math.max(
    mostParentStarsADay - awards.starsGivenToday,
    0,
  );
  const givableSizes = parentStarAwardSizes.filter(
    (size) => size <= starsLeftToday,
  );
  const [chosenSize, setChosenSize] = useState<ParentStarAwardSize>();
  const { busyLabel, isBusy: isSaving, runBusy } = useBusyAction();
  const shownSize =
    chosenSize !== undefined && givableSizes.includes(chosenSize)
      ? chosenSize
      : givableSizes.at(0);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (shownSize === undefined) {
      return;
    }
    void runBusy(`Giving ${nickname} ${String(shownSize)} Stars…`, () =>
      onGiven(shownSize),
    );
  };

  return (
    <form
      className="give-stars"
      onSubmit={submit}
      aria-busy={isSaving ? "true" : undefined}
    >
      <fieldset className="star-amounts" aria-describedby={hintId}>
        <legend>Give {nickname} Stars</legend>
        <div className="star-amount-choices">
          {parentStarAwardSizes.map((size) => (
            <label key={size} className="star-amount">
              <input
                type="radio"
                name="stars"
                value={size}
                checked={size === shownSize}
                disabled={size > starsLeftToday || isSaving}
                onChange={() => {
                  setChosenSize(size);
                }}
              />
              <span className="star-amount-face">
                <StarIcon />
                {size}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="stars-today">
        <span className="stars-today-meter" aria-hidden="true">
          <span
            style={{
              width: `${String((awards.starsGivenToday * 100) / mostParentStarsADay)}%`,
            }}
          />
        </span>
        <p id={hintId} className="form-hint">
          {starsLeftToday === 0
            ? `You've given ${nickname} ${String(mostParentStarsADay)} Stars today, the most for one day. You can give more tomorrow.`
            : `Given today: ${String(awards.starsGivenToday)} of ${String(mostParentStarsADay)}. You can give ${nickname} ${describeStars(starsLeftToday)} more today; a new day starts at midnight, UK time.`}
        </p>
      </div>
      <button type="submit" disabled={shownSize === undefined || isSaving}>
        <StarIcon />
        {shownSize === undefined
          ? "No more Stars today"
          : `Give ${String(shownSize)} Stars to ${nickname}`}
      </button>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
    </form>
  );
};

interface StarsCardProps {
  child: Child;
  awards: ChildAwards;
  canDraw3D: boolean;
  onAwardsChanged: (awards: ChildAwards) => void;
}

const StarsCard = ({
  child,
  awards,
  canDraw3D,
  onAwardsChanged,
}: StarsCardProps) => {
  const headingId = useId();
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [news, setNews] = useState<string>();
  const [problem, setProblem] = useState<string>();

  const give = async (stars: ParentStarAwardSize) => {
    setNews(undefined);
    setProblem(undefined);
    try {
      const changedAwards = await giveStars(child.id, stars);
      onAwardsChanged(changedAwards);
      setCelebrationCount((count) => count + 1);
      setNews(
        `${child.nickname} has ${String(stars)} more Stars, ${describeStars(changedAwards.stars)} in all. Each Family Device gets them when it next goes online.`,
      );
    } catch (error) {
      setProblem(
        error instanceof DailyStarsGivenError
          ? `${child.nickname} has had the most Stars for one day already. You can give more tomorrow.`
          : `Wizzaroo couldn't give ${child.nickname} those Stars. Try again in a moment.`,
      );
      if (error instanceof DailyStarsGivenError) {
        fetchChildAwards(child.id).then(onAwardsChanged, () => undefined);
      }
    }
  };

  return (
    <section className="award-card" aria-labelledby={headingId}>
      <div
        className="award-card-stage award-card-stage-stars"
        role="img"
        aria-label={`Three gold Stars for ${child.nickname}'s ${describeStars(awards.stars)}`}
      >
        {canDraw3D ? (
          <Suspense
            fallback={
              <StageLoading
                label={`Getting ${child.nickname}'s Stars ready to show…`}
              />
            }
          >
            <StarsStage celebrationCount={celebrationCount} />
          </Suspense>
        ) : (
          <FlatStars />
        )}
      </div>
      <div className="award-card-body">
        <h3 id={headingId}>Stars</h3>
        <p className="award-figure">
          <strong>{awards.stars}</strong> Stars to spend
        </p>
        <p className="award-card-about">
          {child.nickname} earns Stars by finishing Activities and spends them
          on Items. Stars you give are to spend; they don't unlock Games.
        </p>
        <GiveStars nickname={child.nickname} awards={awards} onGiven={give} />
        <p role="status" className="award-news">
          {news}
        </p>
        {problem === undefined ? null : <p role="alert">{problem}</p>}
      </div>
    </section>
  );
};

interface FamilyChestCardProps {
  awards: ChildAwards;
  canDraw3D: boolean;
}

const FamilyChestCard = ({ awards, canDraw3D }: FamilyChestCardProps) => {
  const headingId = useId();
  const coins = awards.familyChestActivityCount;
  const coinsToFill = rewardRules.familyChestActivities;
  const coinsLeft = Math.max(coinsToFill - coins, 0);
  return (
    <section className="award-card" aria-labelledby={headingId}>
      <div
        className="award-card-stage award-card-stage-chest"
        role="img"
        aria-label={`The Family Chest, holding ${String(coins)} gold ${coins === 1 ? "coin" : "coins"}`}
      >
        {canDraw3D ? (
          <Suspense
            fallback={
              <StageLoading label="Getting the Family Chest ready to show…" />
            }
          >
            <ChestStage coinCount={coins} />
          </Suspense>
        ) : (
          <FlatChest />
        )}
      </div>
      <div className="award-card-body">
        <h3 id={headingId}>Family Chest</h3>
        <p className="award-figure">
          <strong>
            {coins} of {coinsToFill}
          </strong>{" "}
          gold coins
        </p>
        <progress
          className="family-chest-meter"
          aria-label="How full the Family Chest is"
          max={coinsToFill}
          value={coins}
        />
        <p className="award-card-about">
          Your Children fill the Family Chest together: every Activity any of
          them finishes adds a gold coin. When it holds {coinsToFill}, each
          Child gets a new Item and the Chest starts again.
        </p>
        <dl className="chest-facts">
          <div>
            <dt>In the Chest</dt>
            <dd>
              {coins} {coins === 1 ? "coin" : "coins"}
            </dd>
          </div>
          <div>
            <dt>To fill it</dt>
            <dd>
              {coinsLeft} {coinsLeft === 1 ? "Activity" : "Activities"}
            </dd>
          </div>
          <div>
            <dt>When it's full</dt>
            <dd>A new Item each</dd>
          </div>
        </dl>
      </div>
    </section>
  );
};

const findTargetName = (quest: IslandQuest, puzzle: QuestPuzzle): string => {
  const targets =
    puzzle.at.kind === "islander" ? quest.islanders : quest.things;
  return targets.find(({ id }) => id === puzzle.at.id)?.name ?? "";
};

const describeQuestion = (puzzle: QuestPuzzle): string | undefined =>
  puzzle.question === undefined
    ? undefined
    : `Ends with a question: ${puzzle.question.curriculumLink}`;

interface QuestStepProps {
  quest: IslandQuest;
  puzzle: QuestPuzzle;
  progress: QuestProgress;
  isSolved: boolean;
}

const QuestStep = ({ quest, puzzle, progress, isSolved }: QuestStepProps) => {
  const isReady = !isSolved && isPuzzleWithinReach(quest, progress, puzzle);
  const question = describeQuestion(puzzle);
  return (
    <li
      className="quest-step"
      data-state={isSolved ? "solved" : isReady ? "ready" : "waiting"}
    >
      <span className="quest-step-mark" aria-hidden="true">
        {isSolved ? <CheckIcon /> : isReady ? <StarIcon /> : <LockIcon />}
      </span>
      <span className="quest-step-text">
        <span className="quest-step-title">
          {puzzle.title}
          <span className="quest-step-where">
            {" "}
            · {findTargetName(quest, puzzle)}
          </span>
        </span>
        <span className="quest-step-about">
          {isSolved ? puzzle.solved : puzzle.hint}
        </span>
        {question === undefined ? null : (
          <span className="quest-step-question">{question}</span>
        )}
        {isSolved ? null : (
          <span className="quest-step-badge">
            {isReady ? "Ready to do now" : "Needs an earlier step first"}
          </span>
        )}
      </span>
    </li>
  );
};

type QuestState = "finished" | "under-way" | "not-started";

const questStateLabels: Record<QuestState, string> = {
  finished: "Finished",
  "under-way": "Under way",
  "not-started": "Not started",
};

interface QuestCardProps {
  quest: IslandQuest;
  progress: QuestProgress;
  canVisit: boolean;
  nickname: string;
  isOpenAtFirst: boolean;
}

const QuestCard = ({
  quest,
  progress,
  canVisit,
  nickname,
  isOpenAtFirst,
}: QuestCardProps) => {
  const headingId = useId();
  const island = findIsland(quest.islandId);
  const solvedPuzzles = quest.puzzles.filter(({ id }) =>
    progress.solvedPuzzleIds.includes(id),
  );
  const unsolvedPuzzles = quest.puzzles.filter(
    ({ id }) => !progress.solvedPuzzleIds.includes(id),
  );
  const state: QuestState = isQuestComplete(quest, progress)
    ? "finished"
    : solvedPuzzles.length > 0 || progress.pickedUpFindIds.length > 0
      ? "under-way"
      : "not-started";
  const percent = Math.round(
    (solvedPuzzles.length * 100) / quest.puzzles.length,
  );
  return (
    <li className="quest-card" data-state={state}>
      <header className="quest-card-header">
        <span className="quest-card-year" aria-hidden="true">
          {island === undefined ? "?" : `Y${String(island.yearGroup)}`}
        </span>
        <div className="quest-card-titles">
          <h4 id={headingId}>
            {island === undefined
              ? quest.title
              : `${island.name}, Year ${String(island.yearGroup)}`}
          </h4>
          <p className="quest-card-title">{quest.title}</p>
        </div>
        <span className="quest-card-state">
          {state === "finished" ? <TrophyIcon /> : null}
          {questStateLabels[state]}
        </span>
      </header>
      <div className="quest-card-progress">
        <span className="quest-card-meter" aria-hidden="true">
          <span style={{ width: `${String(percent)}%` }} />
        </span>
        <span className="quest-card-count">
          {solvedPuzzles.length} of {quest.puzzles.length} steps done
        </span>
      </div>
      {canVisit ? null : (
        <p className="lock-note">
          <LockIcon />
          {island?.name ?? "This Island"} is locked for {nickname}, so this
          Quest waits until it's open again.
        </p>
      )}
      {state === "finished" ? (
        <p className="quest-card-trophy">
          <TrophyIcon />
          {nickname} won the {quest.trophyName} Trophy and{" "}
          {rewardRules.starsPerQuest} Stars.
        </p>
      ) : null}
      <details open={isOpenAtFirst}>
        <summary>See each step of {quest.title}</summary>
        {unsolvedPuzzles.length === 0 ? null : (
          <>
            <h5>Still to do ({unsolvedPuzzles.length})</h5>
            <ol className="quest-steps">
              {unsolvedPuzzles.map((puzzle) => (
                <QuestStep
                  key={puzzle.id}
                  quest={quest}
                  puzzle={puzzle}
                  progress={progress}
                  isSolved={false}
                />
              ))}
            </ol>
          </>
        )}
        {solvedPuzzles.length === 0 ? null : (
          <>
            <h5>Done ({solvedPuzzles.length})</h5>
            <ol className="quest-steps">
              {solvedPuzzles.map((puzzle) => (
                <QuestStep
                  key={puzzle.id}
                  quest={quest}
                  puzzle={puzzle}
                  progress={progress}
                  isSolved
                />
              ))}
            </ol>
          </>
        )}
      </details>
    </li>
  );
};

interface QuestsSectionProps {
  child: Child;
  awards: ChildAwards;
}

const QuestsSection = ({ child, awards }: QuestsSectionProps) => {
  const headingId = useId();
  const visitableIslandIds = buildIslandsOnMap(child.yearGroup, child.limits)
    .filter(({ isUnlocked }) => isUnlocked)
    .map(({ id }) => id);
  const questProgress = islandQuests.map((quest) =>
    findQuestProgress(awards.questProgress, quest.islandId),
  );
  const finishedCount = islandQuests.filter((quest, index) =>
    isQuestComplete(quest, questProgress[index]),
  ).length;
  const firstUnderWay = islandQuests.findIndex(
    (quest, index) =>
      !isQuestComplete(quest, questProgress[index]) &&
      questProgress[index].solvedPuzzleIds.length > 0,
  );
  return (
    <section className="quests-section" aria-labelledby={headingId}>
      <header className="child-regions-header">
        <h3 id={headingId}>{child.nickname}'s Quests</h3>
        <p>
          Each Island has a Quest of {islandQuests[0].puzzles.length} steps,
          solved by using Finds on its Islanders and things. {child.nickname}{" "}
          has finished {finishedCount} of {islandQuests.length}.
        </p>
      </header>
      <ol className="quest-cards">
        {islandQuests.map((quest, index) => (
          <QuestCard
            key={quest.islandId}
            quest={quest}
            progress={questProgress[index]}
            canVisit={visitableIslandIds.includes(quest.islandId)}
            nickname={child.nickname}
            isOpenAtFirst={index === firstUnderWay}
          />
        ))}
      </ol>
    </section>
  );
};

interface ChildAwardsViewProps {
  child: Child;
  onStarsChanged: (childId: string, stars: number) => void;
}

const ChildAwardsView = ({ child, onStarsChanged }: ChildAwardsViewProps) => {
  const [view, setView] = useState<AwardsView>({ kind: "loading" });
  const [canDraw3D] = useState(canDrawWebGL);

  useEffect(() => {
    fetchChildAwards(child.id).then(
      (awards) => {
        setView({ kind: "shown", awards });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, [child.id]);

  const showAwards = (awards: ChildAwards) => {
    setView({ kind: "shown", awards });
    onStarsChanged(child.id, awards.stars);
  };

  return (
    <article
      className="child-awards"
      aria-labelledby={`child-awards-${child.id}`}
    >
      <header className="child-regions-header">
        <h2 id={`child-awards-${child.id}`}>{child.nickname}'s Awards</h2>
      </header>
      {view.kind === "loading" ? (
        <div aria-busy="true">
          <BusyProgress label={`Loading ${child.nickname}'s Awards…`} />
        </div>
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load {child.nickname}'s Awards. Try again in a
          moment.
        </p>
      ) : null}
      {view.kind === "shown" ? (
        <>
          <div className="award-cards">
            <StarsCard
              child={child}
              awards={view.awards}
              canDraw3D={canDraw3D}
              onAwardsChanged={showAwards}
            />
            <FamilyChestCard awards={view.awards} canDraw3D={canDraw3D} />
          </div>
          <QuestsSection child={child} awards={view.awards} />
        </>
      ) : null}
    </article>
  );
};

const replaceChildStars = (
  view: ChildrenView,
  childId: string,
  stars: number,
): ChildrenView =>
  view.kind === "listed"
    ? {
        kind: "listed",
        children: view.children.map((child) =>
          child.id === childId ? { ...child, stars } : child,
        ),
      }
    : view;

interface AwardsPanelProps {
  chosenChildId: string | undefined;
  onChildChosen: (childId: string) => void;
}

export const AwardsPanel = ({
  chosenChildId,
  onChildChosen,
}: AwardsPanelProps) => {
  const [view, setView] = useState<ChildrenView>({ kind: "loading" });

  const showChildren = useCallback(() => {
    void fetchChildrenView().then(setView, () => {
      setView({ kind: "failed" });
    });
  }, []);

  useEffect(showChildren, [showChildren]);

  const familyChildren = view.kind === "listed" ? view.children : [];
  const chosenChild =
    familyChildren.find(({ id }) => id === chosenChildId) ??
    familyChildren.at(0);

  return (
    <section className="awards-panel">
      <div className="view-intro">
        <h1>Awards</h1>
        <p>
          See each Child's Stars, give them a few for something they've done
          well, and follow your Family Chest and every Island's Quest.
        </p>
      </div>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading your Children…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load your Children. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" && chosenChild === undefined ? (
        <p>
          No Children yet. <a href="#children">Add a Child</a> to see their
          Awards.
        </p>
      ) : null}
      {chosenChild === undefined ? null : (
        <>
          <ChildTiles
            label="Choose a Child to see the Awards of"
            familyChildren={familyChildren}
            chosenChildId={chosenChild.id}
            onChildChosen={onChildChosen}
          />
          <ChildAwardsView
            key={chosenChild.id}
            child={chosenChild}
            onStarsChanged={(childId, stars) => {
              setView((shownView) =>
                replaceChildStars(shownView, childId, stars),
              );
            }}
          />
        </>
      )}
    </section>
  );
};
