import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { readTextAnswer } from "../parent/account-changes.js";
import {
  CheckIcon,
  CloseIcon,
  LockIcon,
  PlusIcon,
  TrashIcon,
  UnlockIcon,
} from "../site-header/icons.js";
import {
  approveClassmateVisits,
  createSchool,
  deleteSchool,
  fetchSchools,
  nameSchool,
  readProblemMessage,
  type School,
} from "./staff-api.js";
import {
  ActionNewsLine,
  matchesSearch,
  NamedAction,
  SearchBox,
  StaffPageHeader,
  StaffStats,
  StaffTable,
  StaffWorkspace,
  StatusPill,
  type ActionNews,
} from "./staff-parts.js";
import {
  BusyProgress,
  useBusyAction,
  type BusyAction,
} from "../busy/busy-progress.js";

type SchoolsView =
  | { kind: "loading" }
  | { kind: "listed"; schools: School[] }
  | { kind: "failed" };

interface SchoolFormProps {
  heading: string;
  submitLabel: string;
  submitIcon: ReactNode;
  /** What is happening while it saves, such as "Adding Oak Primary…". */
  describeSaving: (name: string) => string;
  onSaved: (name: string, town: string) => Promise<void>;
}

const SchoolForm = ({
  heading,
  submitLabel,
  submitIcon,
  describeSaving,
  onSaved,
}: SchoolFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const save = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);
    const name = readTextAnswer(answers, "name").trim();
    const town = readTextAnswer(answers, "town").trim();
    runBusy(describeSaving(name), async () => {
      await onSaved(name, town);
      return true;
    }).then(
      (isSaved) => {
        if (isSaved === true) {
          setProblem(undefined);
        }
      },
      (error: unknown) => {
        setProblem(readProblemMessage(error));
      },
    );
  };

  return (
    <form onSubmit={save} aria-label={heading} aria-busy={isBusy}>
      <h2>{heading}</h2>
      <label>
        School name
        <input name="name" required maxLength={80} />
      </label>
      <label>
        Town
        <input name="town" required maxLength={80} />
      </label>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        {submitIcon}
        {submitLabel}
      </button>
    </form>
  );
};

interface ClassmateVisitsActionProps {
  school: School;
  busyAction: BusyAction;
  onChanged: (message: string) => void;
  onFailed: (message: string) => void;
}

/** Approving asks the Admin to confirm the School's data processing agreement names Classmates' Rooms first (ADR 0031); withdrawing needs no confirming. */
const ClassmateVisitsAction = ({
  school,
  busyAction: { isBusy, runBusy },
  onChanged,
  onFailed,
}: ClassmateVisitsActionProps) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const schoolName = school.name ?? "this School";

  const change = (classmateVisitsApproved: boolean) => {
    runBusy(
      classmateVisitsApproved
        ? `Turning on Classmate visits at ${schoolName}…`
        : `Turning off Classmate visits at ${schoolName}…`,
      async () => {
        await approveClassmateVisits(school.id, classmateVisitsApproved);
        return true;
      },
    ).then(
      (isChanged) => {
        if (isChanged !== true) {
          return;
        }
        setIsConfirming(false);
        onChanged(
          classmateVisitsApproved
            ? `Turned on Classmate visits at ${schoolName}.`
            : `Turned off Classmate visits at ${schoolName}.`,
        );
      },
      (error: unknown) => {
        onFailed(readProblemMessage(error));
      },
    );
  };

  if (school.classmateVisitsApproved) {
    return (
      <button
        type="button"
        disabled={isBusy}
        onClick={() => {
          change(false);
        }}
      >
        <LockIcon />
        <NamedAction verb="Turn off Classmate visits" name={schoolName} />
      </button>
    );
  }
  if (isConfirming) {
    return (
      <span className="confirm-actions">
        <button
          type="button"
          className="solid"
          disabled={isBusy}
          onClick={() => {
            change(true);
          }}
        >
          <CheckIcon />
          Yes, {schoolName}&apos;s data processing agreement names
          Classmates&apos; Rooms
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            setIsConfirming(false);
          }}
        >
          <CloseIcon />
          Not yet
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => {
        setIsConfirming(true);
      }}
    >
      <UnlockIcon />
      <NamedAction verb="Turn on Classmate visits" name={schoolName} />
    </button>
  );
};

interface SchoolActionsProps {
  school: School;
  onNews: (news: ActionNews) => void;
  onChanged: () => void;
}

const SchoolActions = ({ school, onNews, onChanged }: SchoolActionsProps) => {
  const busyAction = useBusyAction();
  const { busyLabel, isBusy, runBusy } = busyAction;
  return (
    <div className="row-actions" aria-busy={isBusy}>
      <ClassmateVisitsAction
        school={school}
        busyAction={busyAction}
        onChanged={(message) => {
          onNews({ kind: "done", message });
          onChanged();
        }}
        onFailed={(message) => {
          onNews({ kind: "failed", message });
        }}
      />
      <button
        type="button"
        className="danger"
        disabled={isBusy}
        onClick={() => {
          runBusy(`Deleting ${school.name ?? "the School"}…`, async () => {
            await deleteSchool(school.id);
            return true;
          }).then(
            (isDeleted) => {
              if (isDeleted !== true) {
                return;
              }
              onNews({
                kind: "done",
                message: `Deleted ${school.name ?? "the School"}.`,
              });
              onChanged();
            },
            (error: unknown) => {
              onNews({
                kind: "failed",
                message: readProblemMessage(error),
              });
            },
          );
        }}
      >
        <TrashIcon />
        <NamedAction verb="Delete" name={school.name ?? "this School"} />
      </button>
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
    </div>
  );
};

/** Only the Admin creates, names and deletes Schools; a School can go only once it has no Teachers or Children. */
export const SchoolsPanel = () => {
  const [view, setView] = useState<SchoolsView>({ kind: "loading" });
  const [news, setNews] = useState<ActionNews>({ kind: "none" });
  const [search, setSearch] = useState("");

  const showSchools = useCallback(() => {
    fetchSchools().then(
      (schools) => {
        setView({ kind: "listed", schools });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, []);

  useEffect(showSchools, [showSchools]);

  const listedSchools = view.kind === "listed" ? view.schools : [];
  const unnamedSchools = listedSchools.filter(({ name }) => name === null);
  const shownSchools = listedSchools.filter(({ name, town }) =>
    matchesSearch(search, [name, town]),
  );

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="admin"
        title="Schools"
        intro="A School is a name and a town. Teachers and Children each belong to one. Turn on Classmate visits at a School only once its data processing agreement names Classmates' Rooms."
      />
      {view.kind === "listed" ? (
        <StaffStats
          label="Schools at a glance"
          stats={[
            { label: "Schools", value: listedSchools.length },
            {
              label: "Teachers",
              value: listedSchools.reduce(
                (total, { teacherCount }) => total + teacherCount,
                0,
              ),
            },
            {
              label: "Children",
              value: listedSchools.reduce(
                (total, { childCount }) => total + childCount,
                0,
              ),
            },
          ]}
        />
      ) : null}
      {unnamedSchools.map((school) => (
        <SchoolForm
          key={school.id}
          heading="Name the School your own Children were moved into"
          submitLabel="Name this School"
          submitIcon={<CheckIcon />}
          describeSaving={(name) => `Naming the School ${name}…`}
          onSaved={async (name, town) => {
            await nameSchool(school.id, name, town);
            setNews({ kind: "done", message: `Named ${name}.` });
            showSchools();
          }}
        />
      ))}
      <ActionNewsLine news={news} />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the Schools…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load the Schools. Try again in a moment.
        </p>
      ) : null}
      <StaffWorkspace
        addLabel="Add a School"
        isEmpty={view.kind === "listed" && listedSchools.length === 0}
        list={
          view.kind === "listed" ? (
            <>
              <SearchBox
                label="Search the Schools"
                value={search}
                onChange={setSearch}
                shownCount={shownSchools.length}
                totalCount={listedSchools.length}
                noun={{ one: "School", other: "Schools" }}
              />
              <StaffTable
                caption="Every School"
                headings={[
                  "School",
                  "Town",
                  "Teachers",
                  "Children",
                  "Classmate visits",
                  "",
                ]}
                rowCount={shownSchools.length}
                emptyMessage={
                  listedSchools.length === 0
                    ? "No Schools yet. Add the first one."
                    : "No School matches that search."
                }
              >
                {shownSchools.map((school) => (
                  <tr key={school.id}>
                    <th scope="row" data-label="School">
                      {school.name ?? "Not named yet"}
                    </th>
                    <td data-label="Town">{school.town ?? ""}</td>
                    <td data-label="Teachers" className="numeric">
                      {school.teacherCount}
                    </td>
                    <td data-label="Children" className="numeric">
                      {school.childCount}
                    </td>
                    <td data-label="Classmate visits">
                      <StatusPill
                        tone={
                          school.classmateVisitsApproved ? "good" : "neutral"
                        }
                      >
                        {school.classmateVisitsApproved ? "On" : "Off"}
                      </StatusPill>
                    </td>
                    <td className="row-actions-cell">
                      <SchoolActions
                        school={school}
                        onNews={setNews}
                        onChanged={showSchools}
                      />
                    </td>
                  </tr>
                ))}
              </StaffTable>
            </>
          ) : null
        }
        addForm={
          <SchoolForm
            heading="Add a School"
            submitLabel="Add the School"
            submitIcon={<PlusIcon />}
            describeSaving={(name) => `Adding ${name}…`}
            onSaved={async (name, town) => {
              await createSchool(name, town);
              setNews({ kind: "done", message: `Added ${name}.` });
              showSchools();
            }}
          />
        }
      />
    </section>
  );
};
