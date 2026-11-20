import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import {
  isYearGroup,
  yearGroups,
  type YearGroup,
} from "../../curriculum/year-groups.js";
import { readTextAnswer } from "../parent/account-changes.js";
import {
  CheckIcon,
  CloseIcon,
  InviteIcon,
  PencilIcon,
} from "../site-header/icons.js";
import { AdultActions } from "./adult-actions.js";
import { Pagination, usePagination } from "./pagination.js";
import {
  changeTeacher,
  createTeacher,
  fetchSchools,
  fetchTeachers,
  readProblemMessage,
  type CreatedInvite,
  type School,
  type Teacher,
} from "./staff-api.js";
import {
  countWhere,
  describeMoment,
  InviteLink,
  InviteStatusPill,
  matchesSearch,
  NamedAction,
  PersonCell,
  SearchBox,
  StaffPageHeader,
  StaffStats,
  StaffTable,
  StaffWorkspace,
} from "./staff-parts.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

type TeachersView =
  | { kind: "loading" }
  | { kind: "listed"; teachers: Teacher[]; schools: School[] }
  | { kind: "failed" };

const readYearGroups = (answers: FormData): YearGroup[] =>
  answers
    .getAll("yearGroups")
    .map(Number)
    .filter((yearGroup) => isYearGroup(yearGroup));

const describeYearGroups = (teacherYearGroups: readonly YearGroup[]): string =>
  teacherYearGroups.map((yearGroup) => `Year ${String(yearGroup)}`).join(", ");

interface SchoolAndYearsFieldsProps {
  schools: readonly School[];
  schoolId?: string;
  chosenYearGroups?: readonly YearGroup[];
}

const SchoolAndYearsFields = ({
  schools,
  schoolId,
  chosenYearGroups = [],
}: SchoolAndYearsFieldsProps) => (
  <>
    <label>
      School
      <select name="schoolId" defaultValue={schoolId} required>
        {schools
          .filter(({ name }) => name !== null)
          .map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
      </select>
    </label>
    <fieldset>
      <legend>Year Groups they teach</legend>
      {yearGroups.map((yearGroup) => (
        <label key={yearGroup}>
          <input
            type="checkbox"
            name="yearGroups"
            value={yearGroup}
            defaultChecked={chosenYearGroups.includes(yearGroup)}
          />
          Year {yearGroup}
        </label>
      ))}
    </fieldset>
  </>
);

interface TeacherFormProps {
  schools: readonly School[];
  onCreated: (invite: CreatedInvite, isEmailed: boolean) => void;
}

const NewTeacherForm = ({ schools, onCreated }: TeacherFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();

  const create = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answers = new FormData(event.currentTarget);
    const isEmailed = readTextAnswer(answers, "invite") === "email";
    const name = readTextAnswer(answers, "name").trim();
    runBusy(
      isEmailed
        ? `Adding ${name} and emailing their Invite…`
        : `Adding ${name} and making their Invite link…`,
      () =>
        createTeacher({
          name,
          email: readTextAnswer(answers, "email").trim(),
          schoolId: readTextAnswer(answers, "schoolId"),
          yearGroups: readYearGroups(answers),
          invite: isEmailed ? "email" : "link",
        }),
    ).then(
      (invite) => {
        if (invite === undefined) {
          return;
        }
        setProblem(undefined);
        onCreated(invite, isEmailed);
      },
      (error: unknown) => {
        setProblem(readProblemMessage(error));
      },
    );
  };

  return (
    <form onSubmit={create} aria-label="Add a Teacher" aria-busy={isBusy}>
      <h2>Add a Teacher</h2>
      <label>
        Their name
        <input name="name" required maxLength={60} />
      </label>
      <label>
        Their email address
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
        />
      </label>
      <SchoolAndYearsFields schools={schools} />
      <fieldset>
        <legend>Their Invite</legend>
        <label>
          <input type="radio" name="invite" value="email" defaultChecked />
          Email the Invite
        </label>
        <label>
          <input type="radio" name="invite" value="link" />
          Copy the link
        </label>
      </fieldset>
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        <InviteIcon />
        Add the Teacher
      </button>
    </form>
  );
};

interface TeacherChangeFormProps {
  teacher: Teacher;
  schools: readonly School[];
  onChanged: () => void;
  onCancelled: () => void;
}

const TeacherChangeForm = ({
  teacher,
  schools,
  onChanged,
  onCancelled,
}: TeacherChangeFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const name = teacher.name ?? teacher.email;

  return (
    <form
      className="row-edit-form"
      aria-label={`Change ${name}'s School and Year Groups`}
      aria-busy={isBusy}
      onSubmit={(event) => {
        event.preventDefault();
        const answers = new FormData(event.currentTarget);
        runBusy(`Saving ${name}'s School and Year Groups…`, async () => {
          await changeTeacher(
            teacher.userId,
            readTextAnswer(answers, "schoolId"),
            readYearGroups(answers),
          );
          return true;
        }).then(
          (isChanged) => {
            if (isChanged === true) {
              onChanged();
            }
          },
          (error: unknown) => {
            setProblem(readProblemMessage(error));
          },
        );
      }}
    >
      <SchoolAndYearsFields
        schools={schools}
        schoolId={teacher.schoolId}
        chosenYearGroups={teacher.yearGroups}
      />
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <div className="form-actions">
        <button type="submit" disabled={isBusy}>
          <CheckIcon />
          Save {name}'s School and Year Groups
        </button>
        <button
          type="button"
          className="quiet"
          disabled={isBusy}
          onClick={onCancelled}
        >
          <CloseIcon />
          Cancel
        </button>
      </div>
    </form>
  );
};

/** Only the Admin creates, invites, moves and deactivates Teachers. */
export const TeachersPanel = () => {
  const [view, setView] = useState<TeachersView>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [changingId, setChangingId] = useState<string>();
  const [created, setCreated] = useState<{
    invite: CreatedInvite;
    isEmailed: boolean;
  }>();

  const showTeachers = useCallback(() => {
    Promise.all([fetchTeachers(), fetchSchools()]).then(
      ([teachers, schools]) => {
        setView({ kind: "listed", teachers, schools });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, []);

  useEffect(showTeachers, [showTeachers]);

  const listedTeachers = view.kind === "listed" ? view.teachers : [];
  const shownTeachers = listedTeachers.filter((teacher) =>
    matchesSearch(search, [teacher.name, teacher.email, teacher.schoolName]),
  );
  const pagination = usePagination(shownTeachers, search);

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area="admin"
        title="Teachers"
        intro="A Teacher belongs to one School and sees the Children in their Year Groups there, read-only. They must sign in with a passkey or two-factor authentication."
      />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the Teachers and Schools…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load the Teachers. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <StaffStats
            label="Teachers at a glance"
            stats={[
              { label: "Teachers", value: listedTeachers.length },
              {
                label: "Signed up",
                value: countWhere(
                  listedTeachers,
                  ({ inviteStatus }) => inviteStatus === "accepted",
                ),
                tone: "good",
              },
              {
                label: "Still to sign up",
                value: countWhere(
                  listedTeachers,
                  ({ inviteStatus, deactivatedAt }) =>
                    inviteStatus !== "accepted" && deactivatedAt === null,
                ),
                tone: "waiting",
              },
            ]}
          />
          {created === undefined ? null : (
            <InviteLink
              url={created.invite.url}
              isEmailed={created.isEmailed}
            />
          )}
          <StaffWorkspace
            addLabel="Add a Teacher"
            isEmpty={listedTeachers.length === 0}
            list={
              <>
                <SearchBox
                  label="Search the Teachers"
                  value={search}
                  onChange={setSearch}
                  shownCount={shownTeachers.length}
                  totalCount={listedTeachers.length}
                  noun={{ one: "Teacher", other: "Teachers" }}
                />
                <Pagination pagination={pagination} itemsName="Teachers">
                  <StaffTable
                    caption="Every Teacher"
                    headings={[
                      "Teacher",
                      "School",
                      "Year Groups",
                      "Last login",
                      "Invite",
                      "",
                    ]}
                    rowCount={shownTeachers.length}
                    emptyMessage={
                      listedTeachers.length === 0
                        ? "No Teachers yet. Add the first one."
                        : "No Teacher matches that search."
                    }
                  >
                    {pagination.pageItems.map((teacher) => {
                      const name = teacher.name ?? teacher.email;
                      return (
                        <tr key={teacher.userId}>
                          <th scope="row" data-label="Teacher">
                            <PersonCell name={name} detail={teacher.email} />
                          </th>
                          <td data-label="School">
                            {teacher.schoolName ?? "Not named yet"}
                          </td>
                          <td data-label="Year Groups">
                            {describeYearGroups(teacher.yearGroups)}
                          </td>
                          <td data-label="Last login">
                            {describeMoment(teacher.lastLoginAt, "Never")}
                          </td>
                          <td data-label="Invite">
                            <InviteStatusPill status={teacher.inviteStatus} />
                          </td>
                          <td className="row-actions-cell">
                            <div className="row-actions">
                              {changingId === teacher.userId ? (
                                <TeacherChangeForm
                                  teacher={teacher}
                                  schools={view.schools}
                                  onChanged={() => {
                                    setChangingId(undefined);
                                    showTeachers();
                                  }}
                                  onCancelled={() => {
                                    setChangingId(undefined);
                                  }}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="row-action"
                                  onClick={() => {
                                    setChangingId(teacher.userId);
                                  }}
                                >
                                  <PencilIcon />
                                  <NamedAction
                                    verb="Change"
                                    name={`${name}'s School or Year Groups`}
                                  />
                                </button>
                              )}
                              <AdultActions
                                userId={teacher.userId}
                                name={name}
                                inviteStatus={teacher.inviteStatus}
                                isDeactivated={teacher.deactivatedAt !== null}
                                canDeactivate
                                onChanged={showTeachers}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </StaffTable>
                </Pagination>
              </>
            }
            addForm={
              <NewTeacherForm
                schools={view.schools}
                onCreated={(invite, isEmailed) => {
                  setCreated({ invite, isEmailed });
                  showTeachers();
                }}
              />
            }
          />
        </>
      ) : null}
    </section>
  );
};
