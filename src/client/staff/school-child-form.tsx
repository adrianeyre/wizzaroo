import { useState, type SubmitEvent } from "react";
import { readTextAnswer } from "../parent/account-changes.js";
import { PlusIcon } from "../site-header/icons.js";
import type { FamilyChoice } from "./families.js";
import {
  createSchoolChild,
  readProblemMessage,
  type School,
} from "./staff-api.js";
import { BusyProgress, useBusyAction } from "../busy/busy-progress.js";

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en-GB", { month: "long" }).format(
    new Date(Date.UTC(2000, index, 1)),
  ),
);

interface SchoolChildFormProps {
  families: readonly FamilyChoice[];
  schools?: readonly School[];
  onCreated: (nickname: string) => void;
}

/**
 * A Teacher adds a Child in their own Year Groups at their School; the Admin chooses the School.
 * The Child gets their Picture Password and Character the first time they're opened on a Family Device.
 */
export const SchoolChildForm = ({
  families,
  schools,
  onCreated,
}: SchoolChildFormProps) => {
  const [problem, setProblem] = useState<string>();
  const { busyLabel, isBusy, runBusy } = useBusyAction();
  const thisYear = new Date().getFullYear();

  const create = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const answers = new FormData(form);
    const nickname = readTextAnswer(answers, "nickname").trim();
    const familyId = readTextAnswer(answers, "familyId");
    const familyLabel = families.find(
      (family) => family.familyId === familyId,
    )?.label;
    runBusy(
      `Adding ${nickname} to ${familyLabel ?? "their Family"}…`,
      async () => {
        await createSchoolChild(familyId, {
          nickname,
          birthMonth: Number(readTextAnswer(answers, "birthMonth")),
          birthYear: Number(readTextAnswer(answers, "birthYear")),
          yearGroupAdjustment: Number(
            readTextAnswer(answers, "yearGroupAdjustment"),
          ),
          ...(schools === undefined
            ? {}
            : { schoolId: readTextAnswer(answers, "schoolId") }),
        });
        return true;
      },
    ).then(
      (isCreated) => {
        if (isCreated !== true) {
          return;
        }
        setProblem(undefined);
        form.reset();
        onCreated(nickname);
      },
      (error: unknown) => {
        setProblem(readProblemMessage(error));
      },
    );
  };

  return (
    <form onSubmit={create} aria-label="Add a Child" aria-busy={isBusy}>
      <h2>Add a Child</h2>
      {families.length === 0 ? (
        <p>
          Add their Parent first, then add the Child to that Parent's Family.
        </p>
      ) : null}
      <label>
        Their Family
        <select name="familyId" required>
          {families.map(({ familyId, label }) => (
            <option key={familyId} value={familyId}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        First name or nickname
        <input name="nickname" required maxLength={30} />
      </label>
      <label>
        Birth month
        <select name="birthMonth" required>
          {monthNames.map((monthName, index) => (
            <option key={monthName} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Birth year
        <input
          name="birthYear"
          type="number"
          required
          min={thisYear - 14}
          max={thisYear - 3}
          defaultValue={thisYear - 6}
        />
      </label>
      <label>
        Year Group
        <select name="yearGroupAdjustment" defaultValue="0">
          <option value="0">The year for their age</option>
          <option value="-1">One year below their age</option>
          <option value="1">One year above their age</option>
        </select>
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
      {problem === undefined ? null : <p role="alert">{problem}</p>}
      {busyLabel === undefined ? null : <BusyProgress label={busyLabel} />}
      <button type="submit" disabled={families.length === 0 || isBusy}>
        <PlusIcon />
        Add the Child
      </button>
    </form>
  );
};
