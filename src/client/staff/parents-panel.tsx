import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { readTextAnswer } from "../parent/account-changes.js";
import { InviteIcon } from "../site-header/icons.js";
import { AdultActions } from "./adult-actions.js";
import { listFamilyChoices, type FamilyChoice } from "./families.js";
import { Pagination, usePagination } from "./pagination.js";
import {
  createParent,
  fetchParents,
  fetchSchools,
  readProblemMessage,
  type CreatedInvite,
  type CreatedParent,
  type Parent,
  type School,
} from "./staff-api.js";
import {
  countWhere,
  describeMoment,
  describeYear,
  InviteLink,
  InviteStatusPill,
  matchesSearch,
  PersonCell,
  SearchBox,
  StaffPageHeader,
  StaffStats,
  StaffTable,
  StaffWorkspace,
} from "./staff-parts.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

type ParentsView =
  | { kind: "loading" }
  | { kind: "listed"; parents: Parent[]; schools: School[] }
  | { kind: "failed" };

interface NewParentFormProps {
  families: readonly FamilyChoice[];
  schools?: readonly School[];
  onCreated: (created: CreatedParent, isEmailed: boolean) => void;
}

const NewParentForm = ({
  families,
  schools,
  onCreated,
}: NewParentFormProps) => {
  const [problem, setProblem] = useState<string>();
  const [chosenFamilyId, setChosenFamilyId] = useState("");
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  // Only the Admin's form names a School. A Teacher's next adult for a Family waits for its Parents to agree (#264).
  const waitsForTheFamily = schools === undefined && chosenFamilyId !== "";

  const create = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const answers = new FormData(form);
    const familyId = readTextAnswer(answers, "familyId");
    const isEmailed =
      waitsForTheFamily || readTextAnswer(answers, "invite") === "email";
    const name = readTextAnswer(answers, "name").trim();
    const familyLabel = families.find(
      (family) => family.familyId === familyId,
    )?.label;
    runBusy(
      waitsForTheFamily
        ? `Asking the Parents of ${familyLabel ?? "the Family"} to agree to ${name} joining…`
        : isEmailed
          ? `Adding ${name} and emailing their Invite…`
          : `Adding ${name} and making their Invite link…`,
      () =>
        createParent({
          name,
          email: readTextAnswer(answers, "email").trim(),
          ...(schools === undefined
            ? {}
            : { schoolId: readTextAnswer(answers, "schoolId") }),
          ...(familyId === "" ? {} : { familyId }),
          invite: isEmailed ? "email" : "link",
        }),
    ).then(
      (created) => {
        if (created === undefined) {
          return;
        }
        setProblem(undefined);
        form.reset();
        setChosenFamilyId("");
        onCreated(created, isEmailed);
      },
      (error: unknown) => {
        setProblem(readProblemMessage(error));
      },
    );
  };

  return (
    <form onSubmit={create} aria-label="Add a Parent" aria-busy={isBusy}>
      <h2>Add a Parent</h2>
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
      {schools === undefined ? null : (
        <label>
          School
          <select name="schoolId" required>
            {schools
              .filter(({ name }) => name !== null)
              .map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <label>
        Their Family
        <select
          name="familyId"
          value={chosenFamilyId}
          onChange={(event) => {
            setChosenFamilyId(event.currentTarget.value);
          }}
        >
          <option value="">A new Family of their own</option>
          {families.map(({ familyId, label }) => (
            <option key={familyId} value={familyId}>
              The second adult in {label}
            </option>
          ))}
        </select>
      </label>
      {waitsForTheFamily ? (
        <p>
          The Family&apos;s Parents are asked to agree first. Once one of them
          does, Wizzaroo emails this adult their Invite.
        </p>
      ) : (
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
      )}
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={isBusy}>
        <InviteIcon />
        Add the Parent
      </button>
    </form>
  );
};

interface ParentsPanelProps {
  isAdmin: boolean;
}

/**
 * The Admin sees every Parent; a Teacher the Parents of the Children in their Year Groups, and their School's
 * Parents with no Children yet. Both bring in Parents and help them sign in, never seeing their passwords.
 */
export const ParentsPanel = ({ isAdmin }: ParentsPanelProps) => {
  const [view, setView] = useState<ParentsView>({ kind: "loading" });
  const [search, setSearch] = useState("");
  const [created, setCreated] = useState<
    | { kind: "invited"; invite: CreatedInvite; isEmailed: boolean }
    | { kind: "awaiting-family" }
  >();

  const showParents = useCallback(() => {
    Promise.all([
      fetchParents(),
      isAdmin ? fetchSchools() : Promise.resolve([]),
    ]).then(
      ([parents, schools]) => {
        setView({ kind: "listed", parents, schools });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, [isAdmin]);

  useEffect(showParents, [showParents]);

  const listedParents = view.kind === "listed" ? view.parents : [];
  const shownParents = listedParents.filter((parent) =>
    matchesSearch(search, [
      parent.name,
      parent.email,
      parent.familyName,
      ...parent.seenChildren.map(({ nickname }) => nickname),
    ]),
  );
  const pagination = usePagination(shownParents, search);

  return (
    <section className="staff-panel">
      <StaffPageHeader
        area={isAdmin ? "admin" : "teacher"}
        title="Parents"
        intro={
          isAdmin
            ? "Every Parent in Wizzaroo, with their Family and when they last signed in."
            : "The Parents of the Children in your Year Groups, and your School's Parents who have no Children yet."
        }
      />
      {view.kind === "loading" ? (
        <BusyProgress
          label={isAdmin ? "Loading every Parent…" : "Loading your Parents…"}
        />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load the Parents. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" ? (
        <>
          <StaffStats
            label="Parents at a glance"
            stats={[
              { label: "Parents", value: listedParents.length },
              {
                label: "Signed up",
                value: countWhere(
                  listedParents,
                  ({ inviteStatus }) => inviteStatus === "accepted",
                ),
                tone: "good",
              },
              {
                label: "Still to sign up",
                value: countWhere(
                  listedParents,
                  ({ inviteStatus, deactivatedAt }) =>
                    inviteStatus !== "accepted" && deactivatedAt === null,
                ),
                tone: "waiting",
              },
            ]}
          />
          {created?.kind === "invited" ? (
            <InviteLink
              url={created.invite.url}
              isEmailed={created.isEmailed}
            />
          ) : null}
          {created?.kind === "awaiting-family" ? (
            <p role="status">
              Wizzaroo has asked the Family&apos;s Parents to agree. Once one of
              them does, it emails the new adult their Invite.
            </p>
          ) : null}
          <StaffWorkspace
            addLabel="Add a Parent"
            isEmpty={listedParents.length === 0}
            list={
              <>
                <SearchBox
                  label="Search the Parents"
                  value={search}
                  onChange={setSearch}
                  shownCount={shownParents.length}
                  totalCount={listedParents.length}
                  noun={{ one: "Parent", other: "Parents" }}
                />
                <Pagination pagination={pagination} itemsName="Parents">
                  <StaffTable
                    caption={isAdmin ? "Every Parent" : "Your Parents"}
                    headings={[
                      "Parent",
                      isAdmin ? "Family" : "Their Children in your Year Groups",
                      "Last login",
                      "Invite",
                      "",
                    ]}
                    rowCount={shownParents.length}
                    emptyMessage={
                      listedParents.length === 0
                        ? "No Parents yet. Add the first one."
                        : "No Parent matches that search."
                    }
                  >
                    {pagination.pageItems.map((parent) => {
                      const name = parent.name ?? parent.email;
                      return (
                        <tr key={parent.userId}>
                          <th scope="row" data-label="Parent">
                            <PersonCell name={name} detail={parent.email} />
                          </th>
                          <td data-label={isAdmin ? "Family" : "Children"}>
                            {isAdmin
                              ? (parent.familyName ?? "")
                              : parent.seenChildren.length === 0
                                ? "No Children yet"
                                : parent.seenChildren
                                    .map(
                                      ({ nickname, schoolYear }) =>
                                        `${nickname} (${describeYear(schoolYear)})`,
                                    )
                                    .join(", ")}
                          </td>
                          <td data-label="Last login">
                            {describeMoment(parent.lastLoginAt, "Never")}
                          </td>
                          <td data-label="Invite">
                            <InviteStatusPill status={parent.inviteStatus} />
                          </td>
                          <td className="row-actions-cell">
                            <AdultActions
                              userId={parent.userId}
                              name={name}
                              inviteStatus={parent.inviteStatus}
                              isDeactivated={parent.deactivatedAt !== null}
                              canDeactivate={isAdmin}
                              onChanged={showParents}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </StaffTable>
                </Pagination>
              </>
            }
            addForm={
              <NewParentForm
                families={listFamilyChoices(view.parents)}
                schools={isAdmin ? view.schools : undefined}
                onCreated={(createdParent, isEmailed) => {
                  setCreated(
                    createdParent.kind === "invited"
                      ? { ...createdParent, isEmailed }
                      : { kind: "awaiting-family" },
                  );
                  showParents();
                }}
              />
            }
          />
        </>
      ) : null}
    </section>
  );
};
