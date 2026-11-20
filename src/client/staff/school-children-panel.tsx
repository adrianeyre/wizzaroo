import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import {
  checkFormats,
  findLatestCheckAttempt,
  type CheckAttempt,
} from "../../curriculum/checks.js";
import {
  mostCoinsInOneAward,
  mostStarsInOneAward,
  rewardRules,
} from "../../curriculum/rewards.js";
import { skills } from "../../curriculum/skills.js";
import { challengeArenaYears } from "../../curriculum/world-map.js";
import { yearGroups } from "../../curriculum/year-groups.js";
import { describeCheckAttempt } from "../parent/check-history.js";
import { describeLimits } from "../parent/children-panel.js";
import { ChildProgress } from "../parent/child-progress.js";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  CoinsIcon,
  EyeIcon,
  StarIcon,
} from "../site-header/icons.js";
import { listFamilyChoices, type FamilyChoice } from "./families.js";
import { IslandsAndGames } from "./islands-and-games.js";
import { Pagination, usePagination } from "./pagination.js";
import { SchoolChildForm } from "./school-child-form.js";
import {
  awardFamilyChestCoins,
  awardStars,
  fetchChildProgress,
  fetchParents,
  fetchSchoolChildren,
  fetchSchools,
  giveBirthMonthAndYear,
  moveChild,
  readProblemMessage,
  type School,
  type StaffChild,
} from "./staff-api.js";
import {
  ActionNewsLine,
  countWhere,
  describeMoment,
  describeYear,
  matchesSearch,
  NamedAction,
  PersonCell,
  SearchBox,
  StaffPageHeader,
  StaffStats,
  StaffTable,
  StaffWorkspace,
  StatusPill,
  type ActionNews,
} from "./staff-parts.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

const skillNames = new Map(skills.map(({ id, name }) => [id, name]));

const describeWeakSpots = (weakSkillIds: readonly string[]): string =>
  weakSkillIds.length === 0
    ? "None"
    : weakSkillIds
        .map((skillId) => skillNames.get(skillId) ?? skillId)
        .join(", ");

const describeLatestCheck = (checkHistory: readonly CheckAttempt[]): string => {
  const latest = findLatestCheckAttempt(checkHistory);
  return latest === undefined
    ? "–"
    : `${checkFormats[latest.checkGameType].paperName}: ${describeCheckAttempt(latest)}`;
};

type ChildrenView =
  | { kind: "loading" }
  | {
      kind: "listed";
      children: StaffChild[];
      families: FamilyChoice[];
      schools: School[];
    }
  | { kind: "failed" };

type OpenedChild =
  | { kind: "none" }
  | { kind: "loading"; nickname: string }
  | { kind: "opened"; child: StaffChild }
  | { kind: "failed"; message: string };

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, index, 1)),
  ),
);

interface BirthFormProps {
  child: StaffChild;
  onGiven: () => void;
}

/** The Admin, like a Parent, is asked for a Child's birth month and year the first time they open a Child without them. */
const BirthForm = ({ child, onGiven }: BirthFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);
    runBusy(`Saving ${child.nickname}'s birth month and year…`, async () => {
      await giveBirthMonthAndYear(child.id, {
        birthMonth: Number(answers.get("birthMonth")),
        birthYear: Number(answers.get("birthYear")),
        yearGroupAdjustment: Number(answers.get("yearGroupAdjustment")),
      });
      return true;
    }).then(
      (isGiven) => {
        if (isGiven === true) {
          onGiven();
        }
      },
      (error: unknown) => {
        setProblem(readProblemMessage(error));
      },
    );
  };
  return (
    <form onSubmit={save} aria-busy={isBusy}>
      <p role="status">
        Wizzaroo now works out {child.nickname}&apos;s Year from their birth
        month and year. Add them to carry on.
      </p>
      <label>
        Birth month
        <select name="birthMonth" required defaultValue="">
          <option value="">Choose a month</option>
          {monthNames.map((monthName, index) => (
            <option key={monthName} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Birth year
        <input name="birthYear" type="number" required />
      </label>
      <label>
        Their school year
        <select name="yearGroupAdjustment" defaultValue="0">
          <option value="0">In the usual year for their age</option>
          <option value="-1">One year below</option>
          <option value="1">One year above</option>
        </select>
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        <CheckIcon />
        Save their birth month and year
      </button>
    </form>
  );
};

interface ReadOnlyProgressProps {
  opened: OpenedChild;
  onClosed: () => void;
  onBirthGiven?: (child: StaffChild) => void;
}

/** A Child's progress exactly as their Parents see it, with nothing that changes how they play. */
const ReadOnlyProgress = ({
  opened,
  onClosed,
  onBirthGiven,
}: ReadOnlyProgressProps) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openedChildId = opened.kind === "opened" ? opened.child.id : undefined;

  useEffect(() => {
    if (openedChildId !== undefined) {
      headingRef.current?.focus();
    }
  }, [openedChildId]);

  if (opened.kind === "none") {
    return null;
  }
  return (
    <section
      className="staff-progress"
      aria-label="A Child's progress"
      aria-busy={opened.kind === "loading"}
    >
      {opened.kind === "loading" ? (
        <BusyProgress label={`Loading ${opened.nickname}'s progress…`} />
      ) : null}
      {opened.kind === "failed" ? <p role="alert">{opened.message}</p> : null}
      {opened.kind === "opened" ? (
        <>
          <h2 ref={headingRef} tabIndex={-1}>
            {opened.child.nickname}, {describeYear(opened.child.schoolYear)} at{" "}
            {opened.child.schoolName ?? "their School"}
          </h2>
          {onBirthGiven !== undefined && opened.child.birthMonth === null ? (
            <BirthForm
              child={opened.child}
              onGiven={() => {
                onBirthGiven(opened.child);
              }}
            />
          ) : null}
          <p className="staff-progress-limits">
            What they can play: {describeLimits(opened.child.limits)}
          </p>
          <IslandsAndGames child={opened.child} />
          <ChildProgress child={opened.child} />
        </>
      ) : null}
      <button type="button" className="staff-progress-close" onClick={onClosed}>
        <CloseIcon />
        Close the progress
      </button>
    </section>
  );
};

const useChildren = (isAdmin: boolean) => {
  const [view, setView] = useState<ChildrenView>({ kind: "loading" });

  const showChildren = useCallback(() => {
    Promise.all([
      fetchSchoolChildren(),
      fetchParents(),
      isAdmin ? fetchSchools() : Promise.resolve([]),
    ]).then(
      ([children, parents, schools]) => {
        setView({
          kind: "listed",
          children,
          families: listFamilyChoices(parents),
          schools,
        });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, [isAdmin]);

  useEffect(showChildren, [showChildren]);
  return { view, showChildren };
};

const useOpenedChild = () => {
  const [opened, setOpened] = useState<OpenedChild>({ kind: "none" });
  const open = (child: StaffChild) => {
    setOpened({ kind: "loading", nickname: child.nickname });
    fetchChildProgress(child.id).then(
      (progress) => {
        setOpened({ kind: "opened", child: progress });
      },
      (error: unknown) => {
        setOpened({ kind: "failed", message: readProblemMessage(error) });
      },
    );
  };
  const close = () => {
    setOpened({ kind: "none" });
  };
  return { opened, open, close, isOpening: opened.kind === "loading" };
};

const loadingFailedMessage =
  "Wizzaroo couldn't load the Children. Try again in a moment.";

interface MoveChildFormProps {
  child: StaffChild;
  schools: readonly School[];
  onMoved: (news: ActionNews) => void;
}

const MoveChildForm = ({ child, schools, onMoved }: MoveChildFormProps) => {
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  return (
    <form
      className="row-input-group move-child-form"
      aria-label={`Move ${child.nickname} to another School`}
      aria-busy={isBusy}
      onSubmit={(event) => {
        event.preventDefault();
        const schoolId = new FormData(event.currentTarget).get("schoolId");
        if (typeof schoolId !== "string") {
          return;
        }
        const schoolName =
          schools.find((school) => school.id === schoolId)?.name ??
          "another School";
        runBusy(`Moving ${child.nickname} to ${schoolName}…`, async () => {
          await moveChild(child.id, schoolId);
          return true;
        }).then(
          (isMoved) => {
            if (isMoved !== true) {
              return;
            }
            onMoved({
              kind: "done",
              message: `Moved ${child.nickname}, keeping all their progress.`,
            });
          },
          (error: unknown) => {
            onMoved({ kind: "failed", message: readProblemMessage(error) });
          },
        );
      }}
    >
      <label>
        <span className="visually-hidden">Move {child.nickname} to</span>
        <select name="schoolId" defaultValue={child.schoolId}>
          {schools
            .filter(({ name }) => name !== null)
            .map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
        </select>
      </label>
      <button type="submit" className="row-action" disabled={isBusy}>
        <ArrowRightIcon />
        <NamedAction verb="Move" name={child.nickname} />
      </button>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
    </form>
  );
};

const describeAmount = (count: number, one: string, other: string): string =>
  `${String(count)} ${count === 1 ? one : other}`;

const readWholeNumber = (form: HTMLFormElement, name: string): number =>
  Number(new FormData(form).get(name));

interface StarAwardFormProps {
  child: StaffChild;
  onAwarded: (news: ActionNews) => void;
}

const StarAwardForm = ({ child, onAwarded }: StarAwardFormProps) => {
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  return (
    <form
      className="row-input-group star-award-form"
      aria-label={`Give ${child.nickname} Stars`}
      aria-busy={isBusy}
      onSubmit={(event) => {
        event.preventDefault();
        const stars = readWholeNumber(event.currentTarget, "stars");
        runBusy(
          `Giving ${child.nickname} ${describeAmount(stars, "Star", "Stars")}…`,
          async () => {
            await awardStars(child.id, stars);
            return true;
          },
        ).then(
          (isAwarded) => {
            if (isAwarded !== true) {
              return;
            }
            onAwarded({
              kind: "done",
              message: `Gave ${child.nickname} ${describeAmount(stars, "Star", "Stars")}.`,
            });
          },
          (error: unknown) => {
            onAwarded({ kind: "failed", message: readProblemMessage(error) });
          },
        );
      }}
    >
      <label>
        <span className="visually-hidden">Stars for {child.nickname}</span>
        <input
          name="stars"
          type="number"
          inputMode="numeric"
          min={1}
          max={mostStarsInOneAward}
          step={1}
          defaultValue={10}
          required
        />
      </label>
      <button type="submit" className="row-action" disabled={isBusy}>
        <StarIcon />
        <NamedAction verb="Give Stars" name={`to ${child.nickname}`} />
      </button>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
    </form>
  );
};

interface FamilyChestCoinFormProps {
  families: readonly FamilyChoice[];
  onAwarded: (news: ActionNews) => void;
}

/** Gold coins fill a Family Chest just as finished Activities do, so a full chest still gives each Child an Item. */
const FamilyChestCoinForm = ({
  families,
  onAwarded,
}: FamilyChestCoinFormProps) => {
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  return (
    <form
      className="family-chest-coin-form"
      aria-label="Add gold coins to a Family Chest"
      aria-busy={isBusy}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const familyId = new FormData(form).get("familyId");
        const coins = readWholeNumber(form, "coins");
        const family = families.find((choice) => choice.familyId === familyId);
        if (family === undefined) {
          return;
        }
        runBusy(
          `Adding ${describeAmount(coins, "gold coin", "gold coins")} to the Family Chest of ${family.label.replace(/^The Family of /u, "")}…`,
          () => awardFamilyChestCoins(family.familyId, coins),
        ).then(
          (familyChestActivityCount) => {
            if (familyChestActivityCount === undefined) {
              return;
            }
            onAwarded({
              kind: "done",
              message: `${family.label}: added ${describeAmount(coins, "gold coin", "gold coins")}, so their Family Chest now holds ${String(familyChestActivityCount)} of ${String(rewardRules.familyChestActivities)}.`,
            });
          },
          (error: unknown) => {
            onAwarded({ kind: "failed", message: readProblemMessage(error) });
          },
        );
      }}
    >
      <h2>Add gold coins to a Family Chest</h2>
      <p>
        Each gold coin counts as one finished Activity. At{" "}
        {rewardRules.familyChestActivities} coins the chest gives each Child in
        the Family a new Item.
      </p>
      <label>
        Family
        <select name="familyId" required defaultValue="">
          <option value="">Choose a Family</option>
          {families.map((family) => (
            <option key={family.familyId} value={family.familyId}>
              {family.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Gold coins
        <input
          name="coins"
          type="number"
          inputMode="numeric"
          min={1}
          max={mostCoinsInOneAward}
          step={1}
          defaultValue={5}
          required
        />
      </label>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        <CoinsIcon />
        Add the gold coins
      </button>
    </form>
  );
};

/** The Admin's list of every Child, each opened read-only, and logged by the server each time. */
export const AdminChildrenPanel = () => {
  const { view, showChildren } = useChildren(true);
  const { opened, open, close, isOpening } = useOpenedChild();
  const [search, setSearch] = useState("");
  const [news, setNews] = useState<ActionNews>({ kind: "none" });

  const listedChildren = view.kind === "listed" ? view.children : [];
  const shownChildren = listedChildren.filter((child) =>
    matchesSearch(search, [
      child.nickname,
      child.schoolName,
      describeYear(child.schoolYear),
    ]),
  );
  const pagination = usePagination(shownChildren, search);

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="admin"
        title="Children"
        intro="Every Child at every School. Each time you open a Child's progress, Wizzaroo logs it."
      />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading every Child, their Families and Schools…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">{loadingFailedMessage}</p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <StaffStats
            label="Children at a glance"
            stats={[
              { label: "Children", value: listedChildren.length },
              {
                label: "Have played",
                value: countWhere(
                  listedChildren,
                  ({ lastPlayedAt }) => lastPlayedAt !== null,
                ),
                tone: "good",
              },
              {
                label: "Not played yet",
                value: countWhere(
                  listedChildren,
                  ({ lastPlayedAt }) => lastPlayedAt === null,
                ),
                tone: "waiting",
              },
            ]}
          />
          <ReadOnlyProgress
            opened={opened}
            onClosed={close}
            onBirthGiven={(child) => {
              open(child);
              showChildren();
            }}
          />
          <ActionNewsLine news={news} />
          {view.families.length === 0 ? null : (
            <FamilyChestCoinForm families={view.families} onAwarded={setNews} />
          )}
          <StaffWorkspace
            addLabel="Add a Child"
            isEmpty={listedChildren.length === 0}
            addForm={
              <SchoolChildForm
                families={view.families}
                schools={view.schools}
                onCreated={(nickname) => {
                  setNews({ kind: "done", message: `Added ${nickname}.` });
                  showChildren();
                }}
              />
            }
            list={
              <>
                <SearchBox
                  label="Search the Children"
                  value={search}
                  onChange={setSearch}
                  shownCount={shownChildren.length}
                  totalCount={listedChildren.length}
                  noun={{ one: "Child", other: "Children" }}
                />
                <Pagination pagination={pagination} itemsName="Children">
                  <StaffTable
                    caption="Every Child"
                    headings={[
                      "Child",
                      "School",
                      "Year",
                      "Last played",
                      "Stars",
                      "",
                    ]}
                    rowCount={shownChildren.length}
                    emptyMessage={
                      listedChildren.length === 0
                        ? "No Children yet. Add the first one below."
                        : "No Child matches that search."
                    }
                  >
                    {pagination.pageItems.map((child) => (
                      <tr key={child.id}>
                        <th scope="row" data-label="Child">
                          <PersonCell
                            name={child.nickname}
                            loadout={child.loadout ?? null}
                          />
                        </th>
                        <td data-label="School">
                          {child.schoolName ?? "Not named yet"}
                        </td>
                        <td data-label="Year">
                          {describeYear(child.schoolYear)}
                        </td>
                        <td data-label="Last played">
                          {describeMoment(child.lastPlayedAt, "Not yet")}
                        </td>
                        <td data-label="Stars">{child.stars}</td>
                        <td className="row-actions-cell">
                          <div className="row-actions child-row-actions">
                            {child.characterName === null ? (
                              <p className="star-award-waiting">
                                Stars once {child.nickname} sets up their
                                Character
                              </p>
                            ) : (
                              <StarAwardForm
                                child={child}
                                onAwarded={(starNews) => {
                                  setNews(starNews);
                                  showChildren();
                                }}
                              />
                            )}
                            <MoveChildForm
                              child={child}
                              schools={view.schools}
                              onMoved={(moveNews) => {
                                setNews(moveNews);
                                showChildren();
                              }}
                            />
                            <button
                              type="button"
                              className="row-action"
                              disabled={isOpening}
                              onClick={() => {
                                open(child);
                              }}
                            >
                              <EyeIcon />
                              <span>
                                Open
                                <span className="visually-hidden">
                                  {` ${child.nickname}'s`}
                                </span>{" "}
                                progress
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </StaffTable>
                </Pagination>
              </>
            }
          />
        </>
      ) : null}
    </section>
  );
};

interface YearGroupSummaryPanelProps {
  teachingYearGroups: readonly number[];
}

/** A Teacher's class at a glance: every Child in each of their Year Groups, read-only. */
export const YearGroupSummaryPanel = ({
  teachingYearGroups,
}: YearGroupSummaryPanelProps) => {
  const { view, showChildren } = useChildren(false);
  const { opened, open, close, isOpening } = useOpenedChild();
  const [news, setNews] = useState<ActionNews>({ kind: "none" });

  const classChildren = view.kind === "listed" ? view.children : [];

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="teacher"
        title="Your Year Groups"
        intro="Every Child in your Year Groups, with when they last played and the Skills they find hardest. You can see their progress, but only their Parents change how they play."
      />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the Children in your Year Groups…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">{loadingFailedMessage}</p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <StaffStats
            label="Your class at a glance"
            stats={[
              { label: "Children", value: classChildren.length },
              {
                label: "Not played yet",
                value: countWhere(
                  classChildren,
                  ({ lastPlayedAt }) => lastPlayedAt === null,
                ),
                tone: "waiting",
              },
              {
                label: "With weak spots",
                value: countWhere(
                  classChildren,
                  ({ weakSkillIds }) => weakSkillIds.length > 0,
                ),
                tone: "bad",
              },
            ]}
          />
          <ReadOnlyProgress opened={opened} onClosed={close} />
          <ActionNewsLine news={news} />
          <StaffWorkspace
            addLabel="Add a Child"
            isEmpty={classChildren.length === 0}
            addForm={
              <SchoolChildForm
                families={view.families}
                onCreated={(nickname) => {
                  setNews({ kind: "done", message: `Added ${nickname}.` });
                  showChildren();
                }}
              />
            }
            list={
              <>
                {yearGroups
                  .filter((yearGroup) => teachingYearGroups.includes(yearGroup))
                  .map((yearGroup) => {
                    const yearChildren = classChildren.filter(
                      ({ schoolYear }) => schoolYear === yearGroup,
                    );
                    const hasChecks = challengeArenaYears.includes(yearGroup);
                    const headings = [
                      "Child",
                      "Last played",
                      "Weak spots",
                      ...(hasChecks ? ["Latest Check"] : []),
                      "",
                    ];
                    return (
                      <StaffTable
                        key={yearGroup}
                        caption={`Year ${String(yearGroup)}`}
                        headings={headings}
                        rowCount={yearChildren.length}
                        emptyMessage={`No Children in Year ${String(yearGroup)} yet.`}
                      >
                        {yearChildren.map((child) => (
                          <tr key={child.id}>
                            <th scope="row" data-label="Child">
                              <PersonCell
                                name={child.nickname}
                                loadout={child.loadout ?? null}
                              />
                            </th>
                            <td data-label="Last played">
                              {describeMoment(child.lastPlayedAt, "Not yet")}
                            </td>
                            <td data-label="Weak spots">
                              {child.weakSkillIds.length === 0 ? (
                                <StatusPill tone="good">
                                  {describeWeakSpots(child.weakSkillIds)}
                                </StatusPill>
                              ) : (
                                describeWeakSpots(child.weakSkillIds)
                              )}
                            </td>
                            {hasChecks ? (
                              <td data-label="Latest Check">
                                {describeLatestCheck(child.checkHistory)}
                              </td>
                            ) : null}
                            <td className="row-actions-cell">
                              <button
                                type="button"
                                className="row-action"
                                disabled={isOpening}
                                onClick={() => {
                                  open(child);
                                }}
                              >
                                <EyeIcon />
                                See {child.nickname}'s progress
                              </button>
                            </td>
                          </tr>
                        ))}
                      </StaffTable>
                    );
                  })}
              </>
            }
          />
        </>
      ) : null}
    </section>
  );
};
