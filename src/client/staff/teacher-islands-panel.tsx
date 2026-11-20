import { useEffect, useId, useState } from "react";
import type { ChildLimits } from "../../curriculum/island-access.js";
import { ChildIslands } from "../parent/islands-panel.js";
import { fetchSchoolChildren, type StaffChild } from "./staff-api.js";
import { describeYear, StaffPageHeader } from "./staff-parts.js";
import { BusyProgress } from "../busy/busy-progress.js";

type TeacherChildrenView =
  | { kind: "loading" }
  | { kind: "listed"; children: StaffChild[] }
  | { kind: "failed" };

const replaceChildLimits = (
  view: TeacherChildrenView,
  childId: string,
  limits: ChildLimits,
): TeacherChildrenView =>
  view.kind === "listed"
    ? {
        kind: "listed",
        children: view.children.map((child) =>
          child.id === childId ? { ...child, limits } : child,
        ),
      }
    : view;

export const TeacherIslandsPanel = () => {
  const [view, setView] = useState<TeacherChildrenView>({ kind: "loading" });
  const [chosenChildId, setChosenChildId] = useState<string>();
  const childChoiceId = useId();

  useEffect(() => {
    fetchSchoolChildren().then(
      (children) => {
        setView({ kind: "listed", children });
      },
      () => {
        setView({ kind: "failed" });
      },
    );
  }, []);

  const classChildren = view.kind === "listed" ? view.children : [];
  const chosenChild =
    classChildren.find(({ id }) => id === chosenChildId) ?? classChildren.at(0);

  return (
    <section className="regions-panel staff-panel">
      <StaffPageHeader
        area="teacher"
        title="Class Islands"
        intro="Lock an Island, turn a Region off, or turn off single Games for a Child in your Year Groups. Their Parents see that you turned it off and can't turn it back on, so it stays off until you do."
      />
      {view.kind === "loading" ? (
        <BusyProgress label="Loading the Children in your Year Groups…" />
      ) : null}
      {view.kind === "failed" ? (
        <p role="alert">
          Wizzaroo couldn't load the Children. Try again in a moment.
        </p>
      ) : null}
      {view.kind === "listed" && chosenChild === undefined ? (
        <p>No Children in your Year Groups yet.</p>
      ) : null}
      {chosenChild === undefined ? null : (
        <>
          <div className="staff-child-picker">
            <label htmlFor={childChoiceId}>Child</label>
            <select
              id={childChoiceId}
              value={chosenChild.id}
              onChange={(event) => {
                setChosenChildId(event.currentTarget.value);
              }}
            >
              {classChildren.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.nickname}, {describeYear(child.schoolYear)}
                </option>
              ))}
            </select>
          </div>
          <ChildIslands
            key={chosenChild.id}
            mode="teacher"
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
