import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";
import {
  buildIslandsOnMap,
  findGameLock,
  findRegionTurnOff,
  getParentChoices,
  lockGames,
  lockIslandForTeacher,
  openEveryGame,
  switchIsland,
  turnRegionsOn,
  type ChildLimits,
  type IslandOnMap,
} from "../../curriculum/island-access.js";
import {
  subjectNames,
  subjects,
  type Subject,
  type YearGroup,
} from "../../curriculum/skills.js";
import {
  findGameKey,
  findRegionKey,
  hasEveryGameOpen,
  isBigTop,
  isChallengeArena,
  listIslandRegions,
  listRegionGames,
  worldMap,
  type Region,
  type RegionGame,
  type RegionLandmark,
} from "../../curriculum/world-map.js";
import { findGameCardContent } from "../mission/game-card-content.js";
import {
  CheckIcon,
  LockIcon,
  regionLandmarkIcons,
  StarIcon,
} from "../site-header/icons.js";
import {
  ChildTiles,
  fetchChildrenView,
  sendChildChange,
  type ChildrenView,
} from "./children-panel.js";

export type LockMode = "parent" | "teacher";

export interface IslandsChild {
  id: string;
  nickname: string;
  yearGroup: YearGroup | null;
  limits: ChildLimits;
}

// `busyLabel` says what is happening while the change saves, and `news` what happened once it has.
type LimitsChange = (
  limits: ChildLimits,
  news: string,
  busyLabel: string,
) => void;

type IslandAccess =
  "open" | "above-year" | "locked-by-you" | "locked-by-teacher";

const findIslandAccess = ({
  isUnlocked,
  isUnlockedByDefault,
  isLockedByTeacher,
}: IslandOnMap): IslandAccess => {
  if (isLockedByTeacher) {
    return "locked-by-teacher";
  }
  if (isUnlocked) {
    return "open";
  }
  return isUnlockedByDefault ? "locked-by-you" : "above-year";
};

const describeOpenIsland = (
  { isHome, isUnlockedByDefault }: IslandOnMap,
  nickname: string,
): string => {
  if (isHome) {
    return `Open: ${nickname}'s own Year`;
  }
  return isUnlockedByDefault ? "Open" : "Opened early";
};

const islandAccessBadges: Record<
  IslandAccess,
  {
    icon: ReactNode;
    describe: (island: IslandOnMap, nickname: string, mode: LockMode) => string;
  }
> = {
  open: {
    icon: <StarIcon />,
    describe: describeOpenIsland,
  },
  "above-year": {
    icon: <LockIcon />,
    describe: (_island, nickname, mode) =>
      mode === "parent"
        ? `Locked: above ${nickname}'s Year`
        : `Locked at home: above ${nickname}'s Year`,
  },
  "locked-by-you": {
    icon: <LockIcon />,
    describe: (_island, _nickname, mode) =>
      mode === "parent" ? "Locked by you" : "Locked at home",
  },
  "locked-by-teacher": {
    icon: <LockIcon />,
    describe: (_island, _nickname, mode) =>
      mode === "parent" ? "Locked by their Teacher" : "Locked by you",
  },
};

const teacherLockNote = "Locked by their Teacher";
const parentLockNote = "Off at home";

const isIslandOnFor = (mode: LockMode, island: IslandOnMap) =>
  mode === "teacher" ? !island.isLockedByTeacher : island.isUnlocked;

const switchIslandFor = (
  mode: LockMode,
  limits: ChildLimits,
  island: IslandOnMap,
): ChildLimits =>
  mode === "teacher"
    ? {
        ...limits,
        teacherLocks: lockIslandForTeacher(
          limits.teacherLocks,
          island.id,
          !island.isLockedByTeacher,
        ),
      }
    : switchIsland(limits, island);

const isRegionOnFor = (
  mode: LockMode,
  limits: ChildLimits,
  region: Region,
): boolean =>
  mode === "teacher"
    ? !limits.teacherLocks.turnedOffRegionKeys.includes(findRegionKey(region))
    : findRegionTurnOff(limits, region) === undefined;

const turnRegionsOnFor = (
  mode: LockMode,
  limits: ChildLimits,
  regions: readonly Region[],
  isOn: boolean,
): ChildLimits =>
  mode === "teacher"
    ? {
        ...limits,
        teacherLocks: turnRegionsOn(limits.teacherLocks, regions, isOn),
      }
    : turnRegionsOn(limits, regions, isOn);

const isGameOnFor = (
  mode: LockMode,
  limits: ChildLimits,
  region: Region,
  game: RegionGame,
): boolean =>
  mode === "teacher"
    ? !limits.teacherLocks.lockedGameKeys.includes(findGameKey(region, game))
    : findGameLock(limits, region, game) === undefined;

const lockGameFor = (
  mode: LockMode,
  limits: ChildLimits,
  region: Region,
  game: RegionGame,
  isLocked: boolean,
): ChildLimits =>
  mode === "teacher"
    ? {
        ...limits,
        teacherLocks: lockGames(limits.teacherLocks, region, [game], isLocked),
      }
    : lockGames(limits, region, [game], isLocked);

const findOtherLayerNote = (
  mode: LockMode,
  lockOwner: "teacher" | "parent" | undefined,
  isParentLocked: boolean,
): string | undefined => {
  if (mode === "parent") {
    return lockOwner === "teacher" ? teacherLockNote : undefined;
  }
  return isParentLocked ? parentLockNote : undefined;
};

const findGameTitle = (game: RegionGame, yearGroup: YearGroup): string =>
  findGameCardContent(game, yearGroup)?.title ??
  game.id
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const listSubjectRegions = (subject: Subject): Region[] =>
  worldMap.regions.filter((region) => region.subject === subject);

interface SubjectShortcut {
  key: Subject | "games" | "checks";
  name: string;
  landmark: RegionLandmark;
  regions: Region[];
}

const bigTopRegions = worldMap.regions.filter((region) => isBigTop(region));
const challengeArenaRegions = worldMap.regions.filter((region) =>
  isChallengeArena(region),
);

const subjectShortcuts: SubjectShortcut[] = [
  ...subjects.flatMap((subject): SubjectShortcut[] => {
    const subjectRegions = listSubjectRegions(subject);
    const firstRegion = subjectRegions.at(0);
    return firstRegion === undefined
      ? []
      : [
          {
            key: subject,
            name: subjectNames[subject],
            landmark: firstRegion.landmark,
            regions: subjectRegions,
          },
        ];
  }),
  { key: "games", name: "Games", landmark: "big-top", regions: bigTopRegions },
  {
    key: "checks",
    name: "Checks",
    landmark: "challenge-arena",
    regions: challengeArenaRegions,
  },
];

interface SwitchProps {
  name: string;
  value: string;
  caption: string;
  detail: string;
  isOn: boolean;
  isDisabled: boolean;
  describedBy: string;
  onSwitched: () => void;
}

const Switch = ({
  name,
  value,
  caption,
  detail,
  isOn,
  isDisabled,
  describedBy,
  onSwitched,
}: SwitchProps) => (
  <label className="region-switch">
    <span className="region-switch-caption">
      {caption}
      <span className="visually-hidden">: {detail}</span>
    </span>
    <input
      type="checkbox"
      role="switch"
      name={name}
      value={value}
      checked={isOn}
      disabled={isDisabled}
      aria-describedby={describedBy}
      onChange={onSwitched}
    />
    <span className="region-switch-track" aria-hidden="true">
      <span className="region-switch-thumb">
        <CheckIcon />
      </span>
    </span>
  </label>
);

const LockNote = ({ note }: { note: string | undefined }) =>
  note === undefined ? null : (
    <span className="lock-note">
      <LockIcon />
      {note}
    </span>
  );

const SwitchKey = ({ mode }: { mode: LockMode }) => (
  <dl className="switch-key" aria-label="What the switches do">
    <div>
      <dt>Regions open</dt>
      <dd>
        On an Island: the Child can play its Regions and Games. They can travel
        to and explore every Island whatever this says.
      </dd>
    </div>
    <div>
      <dt>Can play</dt>
      <dd>
        On a Region or a Game: turn it off and the Child sees it locked on the
        map.
      </dd>
    </div>
    {mode === "parent" ? (
      <div>
        <dt>All Games open</dt>
        <dd>
          Every Game in the Region is open now, instead of opening one at a time
          as the Child earns Stars.
        </dd>
      </div>
    ) : null}
    <div>
      <dt>
        <LockIcon /> {mode === "parent" ? teacherLockNote : parentLockNote}
      </dt>
      <dd>
        {mode === "parent"
          ? "Their Teacher turned it off, so only their Teacher can turn it back on."
          : "Their Parents turned it off at home. Your switch adds your own lock, which their Parents can't undo."}
      </dd>
    </div>
  </dl>
);

interface GameRowProps {
  mode: LockMode;
  region: Region;
  game: RegionGame;
  island: IslandOnMap;
  limits: ChildLimits;
  nickname: string;
  isSaving: boolean;
  onChanged: LimitsChange;
}

const GameRow = ({
  mode,
  region,
  game,
  island,
  limits,
  nickname,
  isSaving,
  onChanged,
}: GameRowProps) => {
  const title = findGameTitle(game, island.yearGroup);
  const lockOwner = findGameLock(limits, region, game);
  const isOn = isGameOnFor(mode, limits, region, game);
  const titleId = `game-${island.id}-${region.id}-${game.id}`;
  const note = findOtherLayerNote(
    mode,
    lockOwner,
    limits.lockedGameKeys.includes(findGameKey(region, game)),
  );
  return (
    <li className="game-switch" data-state={isOn ? "on" : "off"}>
      <span className="game-switch-text">
        <span id={titleId} className="game-switch-name">
          {title}
        </span>
        <LockNote note={note} />
      </span>
      <Switch
        name="gameKeys"
        value={findGameKey(region, game)}
        caption="Can play"
        detail={`${title} in ${region.name} for ${nickname}`}
        isOn={isOn}
        isDisabled={isSaving || (mode === "parent" && lockOwner === "teacher")}
        describedBy={titleId}
        onSwitched={() => {
          onChanged(
            lockGameFor(mode, limits, region, game, isOn),
            isOn
              ? `${title} in ${region.name} is off for ${nickname}.`
              : `${title} in ${region.name} is on again for ${nickname}.`,
            `Turning ${title} in ${region.name} ${isOn ? "off" : "on again"} for ${nickname}…`,
          );
        }}
      />
    </li>
  );
};

interface RegionRowProps {
  mode: LockMode;
  region: Region;
  island: IslandOnMap;
  limits: ChildLimits;
  nickname: string;
  isSaving: boolean;
  onChanged: LimitsChange;
}

const RegionRow = ({
  mode,
  region,
  island,
  limits,
  nickname,
  isSaving,
  onChanged,
}: RegionRowProps) => {
  const turnOff = findRegionTurnOff(limits, region);
  const isOn = isRegionOnFor(mode, limits, region);
  const areGamesOpen = limits.openRegionKeys.includes(findRegionKey(region));
  const headingId = `region-card-${island.id}-${region.id}`;
  const games = listRegionGames(region);
  const gamesOffCount = games.filter(
    (game) => findGameLock(limits, region, game) !== undefined,
  ).length;
  const note = findOtherLayerNote(
    mode,
    turnOff,
    limits.turnedOffRegionKeys.includes(findRegionKey(region)),
  );
  return (
    <li
      className="region-card"
      data-access={turnOff === undefined ? "earned" : "locked"}
      data-region-key={findRegionKey(region)}
    >
      <span
        className="region-card-art"
        data-landmark={region.landmark}
        aria-hidden="true"
      >
        {regionLandmarkIcons[region.landmark]}
      </span>
      <div className="region-card-body">
        <h4 id={headingId}>{region.name}</h4>
        <p className="region-card-badge">
          {isChallengeArena(region)
            ? "Checks, every Game open"
            : region.subject === undefined
              ? "Puzzles, every Game open"
              : subjectNames[region.subject]}
        </p>
        <LockNote note={note} />
      </div>
      <div className="region-card-switches">
        <Switch
          name="turnedOnRegionKeys"
          value={findRegionKey(region)}
          caption="Can play"
          detail={`${region.name} on ${island.name} for ${nickname}`}
          isOn={isOn}
          isDisabled={isSaving || (mode === "parent" && turnOff === "teacher")}
          describedBy={headingId}
          onSwitched={() => {
            onChanged(
              turnRegionsOnFor(mode, limits, [region], !isOn),
              isOn
                ? `${region.name} on ${island.name} is off for ${nickname}.`
                : `${region.name} on ${island.name} is on again for ${nickname}.`,
              `Turning ${region.name} on ${island.name} ${isOn ? "off" : "on again"} for ${nickname}…`,
            );
          }}
        />
        {mode === "teacher" ? null : hasEveryGameOpen(region) ? (
          <div className="region-switch region-switch-fixed">
            <span className="region-switch-caption">All Games open</span>
            <span className="region-switch-always">
              <CheckIcon />
              Always
            </span>
          </div>
        ) : (
          <Switch
            name="openRegionKeys"
            value={findRegionKey(region)}
            caption="All Games open"
            detail={`every Game in ${region.name} for ${nickname}`}
            isOn={areGamesOpen}
            isDisabled={isSaving}
            describedBy={headingId}
            onSwitched={() => {
              onChanged(
                openEveryGame(limits, region, !areGamesOpen),
                areGamesOpen
                  ? `${region.name}'s Games open with Stars again. ${nickname} keeps every Game and Star already earned.`
                  : `Every Game in ${region.name} is open for ${nickname}.`,
                areGamesOpen
                  ? `Making ${region.name}'s Games open with Stars again for ${nickname}…`
                  : `Opening every Game in ${region.name} for ${nickname}…`,
              );
            }}
          />
        )}
      </div>
      <details className="region-games">
        <summary>
          Games in {region.name}
          <span className="region-games-count">
            {gamesOffCount === 0
              ? `${String(games.length)} on`
              : `${String(gamesOffCount)} of ${String(games.length)} off`}
          </span>
        </summary>
        <ol className="game-switches">
          {games.map((game) => (
            <GameRow
              key={game.id}
              mode={mode}
              region={region}
              game={game}
              island={island}
              limits={limits}
              nickname={nickname}
              isSaving={isSaving}
              onChanged={onChanged}
            />
          ))}
        </ol>
      </details>
    </li>
  );
};

interface IslandCardProps {
  mode: LockMode;
  island: IslandOnMap;
  limits: ChildLimits;
  nickname: string;
  isSaving: boolean;
  onChanged: LimitsChange;
}

const IslandCard = ({
  mode,
  island,
  limits,
  nickname,
  isSaving,
  onChanged,
}: IslandCardProps) => {
  const access = findIslandAccess(island);
  const badge = islandAccessBadges[access];
  const headingId = `island-card-${island.id}`;
  const isOn = isIslandOnFor(mode, island);
  return (
    <li className="island-card" data-access={access}>
      <header className="island-card-header">
        <div>
          <h3 id={headingId}>
            {island.name}, Year {island.yearGroup}
          </h3>
          <p className="region-card-badge">
            {badge.icon}
            {badge.describe(island, nickname, mode)}
          </p>
        </div>
        <Switch
          name="unlockedIslandIds"
          value={island.id}
          caption="Regions open"
          detail={`${island.name} for ${nickname}`}
          isOn={isOn}
          isDisabled={
            isSaving || (mode === "parent" && island.isLockedByTeacher)
          }
          describedBy={headingId}
          onSwitched={() => {
            onChanged(
              switchIslandFor(mode, limits, island),
              isOn
                ? `${island.name} is locked for ${nickname}. Each Family Device locks it once it next goes online.`
                : `${island.name} is open for ${nickname}. Each Family Device opens it once it next goes online.`,
              `${isOn ? "Locking" : "Opening"} ${island.name} for ${nickname}…`,
            );
          }}
        />
      </header>
      <details>
        <summary>Regions on {island.name}</summary>
        <ol className="region-cards">
          {listIslandRegions(island.id).map((region) => (
            <RegionRow
              key={region.id}
              mode={mode}
              region={region}
              island={island}
              limits={limits}
              nickname={nickname}
              isSaving={isSaving}
              onChanged={onChanged}
            />
          ))}
        </ol>
      </details>
    </li>
  );
};

interface SubjectShortcutsProps {
  mode: LockMode;
  limits: ChildLimits;
  nickname: string;
  isSaving: boolean;
  onChanged: LimitsChange;
}

const SubjectShortcuts = ({
  mode,
  limits,
  nickname,
  isSaving,
  onChanged,
}: SubjectShortcutsProps) => (
  <fieldset className="subject-shortcuts">
    <legend>Turn a Subject off on every Island</legend>
    <ul className="subject-switches">
      {subjectShortcuts.map(({ key, name, landmark, regions }) => {
        const turnedOffCount = regions.filter(
          (region) => !isRegionOnFor(mode, limits, region),
        ).length;
        const teacherOffCount = regions.filter(
          (region) => findRegionTurnOff(limits, region) === "teacher",
        ).length;
        const isOffEverywhere = turnedOffCount === regions.length;
        const isTeacherOffEverywhere =
          mode === "parent" && teacherOffCount === regions.length;
        const nameId = `subject-switch-${key}`;
        const verb = key === "games" || key === "checks" ? "are" : "is";
        return (
          <li
            key={key}
            className="subject-switch"
            data-state={isOffEverywhere ? "off" : "on"}
          >
            <span
              className="region-card-art"
              data-landmark={landmark}
              aria-hidden="true"
            >
              {regionLandmarkIcons[landmark]}
            </span>
            <span className="subject-switch-text">
              <span id={nameId} className="subject-switch-name">
                {name}
              </span>
              {turnedOffCount > 0 && !isOffEverywhere ? (
                <span className="subject-switch-note">
                  Off on {turnedOffCount} of {regions.length} Islands
                </span>
              ) : null}
              {mode === "parent" && teacherOffCount > 0 ? (
                <span className="subject-switch-note">
                  {teacherLockNote} on {teacherOffCount} of {regions.length}{" "}
                  Islands
                </span>
              ) : null}
            </span>
            <Switch
              name="subjectsOnEveryIsland"
              value={key}
              caption="Can play"
              detail={`${name} on every Island for ${nickname}`}
              isOn={!isOffEverywhere}
              isDisabled={isSaving || isTeacherOffEverywhere}
              describedBy={nameId}
              onSwitched={() => {
                onChanged(
                  turnRegionsOnFor(mode, limits, regions, isOffEverywhere),
                  isOffEverywhere
                    ? `${name} ${verb} on again on every Island for ${nickname}.`
                    : `${name} ${verb} off on every Island for ${nickname}.`,
                  `Turning ${name} ${isOffEverywhere ? "on again" : "off"} on every Island for ${nickname}…`,
                );
              }}
            />
          </li>
        );
      })}
    </ul>
  </fieldset>
);

const saveChildLimits = (
  mode: LockMode,
  childId: string,
  limits: ChildLimits,
): Promise<void> =>
  mode === "teacher"
    ? sendChildChange(
        "PUT",
        `/api/children/${childId}/teacher-locks`,
        limits.teacherLocks,
      )
    : sendChildChange(
        "PUT",
        `/api/children/${childId}/limits`,
        getParentChoices(limits),
      );

interface ChildIslandsProps {
  mode: LockMode;
  child: IslandsChild;
  onLimitsSaved: (childId: string, limits: ChildLimits) => void;
}

export const ChildIslands = ({
  mode,
  child,
  onLimitsSaved,
}: ChildIslandsProps) => {
  const { busyLabel, isBusy: isSaving, runBusy } = useBusyAction();
  const [news, setNews] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const islands = buildIslandsOnMap(child.yearGroup, child.limits);
  const openIslandCount = islands.filter(({ isUnlocked }) => isUnlocked).length;

  const saveLimits = async (limits: ChildLimits, changeNews: string) => {
    await saveChildLimits(mode, child.id, limits);
    onLimitsSaved(child.id, limits);
    setNews(changeNews);
  };

  const changeLimits = (
    limits: ChildLimits,
    changeNews: string,
    changeBusyLabel: string,
  ) => {
    setNews(undefined);
    setProblem(undefined);
    runBusy(changeBusyLabel, () => saveLimits(limits, changeNews)).catch(() => {
      setProblem(
        `Wizzaroo couldn't save that change for ${child.nickname}. Try again in a moment.`,
      );
    });
  };

  return (
    <article
      className="child-regions"
      aria-labelledby={`child-islands-${child.id}`}
      aria-busy={isSaving}
    >
      <header className="child-regions-header">
        <h2 id={`child-islands-${child.id}`}>{child.nickname}'s Islands</h2>
        <p>
          {child.nickname} is in{" "}
          {child.yearGroup === null
            ? "no Year yet"
            : `Year ${String(child.yearGroup)}`}{" "}
          and can play the Regions on {openIslandCount} of {islands.length}{" "}
          Islands.
        </p>
      </header>
      <p role="status">{news}</p>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      <SwitchKey mode={mode} />
      <SubjectShortcuts
        mode={mode}
        limits={child.limits}
        nickname={child.nickname}
        isSaving={isSaving}
        onChanged={changeLimits}
      />
      <ol className="island-cards">
        {islands.map((island) => (
          <IslandCard
            key={island.id}
            mode={mode}
            island={island}
            limits={child.limits}
            nickname={child.nickname}
            isSaving={isSaving}
            onChanged={changeLimits}
          />
        ))}
      </ol>
    </article>
  );
};

const replaceChildLimits = (
  view: ChildrenView,
  childId: string,
  limits: ChildLimits,
): ChildrenView =>
  view.kind === "listed"
    ? {
        kind: "listed",
        children: view.children.map((child) =>
          child.id === childId ? { ...child, limits } : child,
        ),
      }
    : view;

interface IslandsPanelProps {
  chosenChildId: string | undefined;
  onChildChosen: (childId: string) => void;
}

export const IslandsPanel = ({
  chosenChildId,
  onChildChosen,
}: IslandsPanelProps) => {
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
    <section className="regions-panel">
      <div className="view-intro">
        <h1>Islands</h1>
        <p>
          Each Island teaches one Year. A Child can travel to and explore every
          Island, and plays the Regions on the Islands for their own Year and
          below. Open an Island above their Year early, lock an Island, turn a
          Region or a single Game off, or open every Game in a Region at once.
          Every switch can be turned back, and a Child keeps the Stars and Games
          they have already earned. Anything their Teacher has turned off stays
          off until their Teacher turns it back on.
        </p>
      </div>
      {view.kind === "loading" ? (
        <BusyProgress label="Loading your Children's Islands…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load your Children. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" && chosenChild === undefined ? (
        <p>
          No Children yet. <a href="#children">Add a Child</a> to choose their
          Islands.
        </p>
      ) : null}
      {chosenChild === undefined ? null : (
        <>
          <ChildTiles
            label="Choose a Child to change Islands for"
            familyChildren={familyChildren}
            chosenChildId={chosenChild.id}
            onChildChosen={onChildChosen}
          />
          <ChildIslands
            key={chosenChild.id}
            mode="parent"
            child={chosenChild}
            onLimitsSaved={(childId, limits) => {
              setView((shownView) =>
                replaceChildLimits(shownView, childId, limits),
              );
            }}
          />
        </>
      )}
    </section>
  );
};
