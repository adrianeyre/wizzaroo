import { useId, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  buildYearCoverage,
  isGapStatus,
  listCurriculumYears,
  pointStatuses,
  type PointCoverage,
  type PointStatus,
  type SkillCoverage,
  type SubjectCoverage,
} from "../../curriculum/curriculum-coverage.js";
import type { CurriculumProgramme } from "../../curriculum/curriculum-points.js";
import type { SkillMastery } from "../../curriculum/mastery.js";
import {
  nationalCurriculumUrl,
  subjectsWithoutGames,
} from "../../curriculum/national-curriculum.js";
import {
  subjectNames,
  type Subject,
  type YearGroup,
} from "../../curriculum/skills.js";
import { findHomeIsland } from "../../curriculum/world-map.js";
import {
  listSkillGames,
  type SkillGame,
} from "../mission/game-card-content.js";

const percentWhole = 100;

const OpensInNewTab = () => (
  <span className="visually-hidden"> (opens in a new tab)</span>
);

const helpNextLength = 5;

export const pointStatusNames: Record<PointStatus, string> = {
  complete: "Complete",
  learning: "Learning",
  "needs-help": "Needs help",
  "not-started": "Not started",
};

const pointStatusHints: Record<PointStatus, string> = {
  complete: "Every Skill here is Mastered.",
  learning: "On the way to Mastery.",
  "needs-help":
    "Right first time is below what a good day needs on at least one Skill.",
  "not-started": "Not played yet. This is a gap.",
};

const keyStageNames: Record<YearGroup, string> = {
  1: "Key Stage 1",
  2: "Key Stage 1",
  3: "Key Stage 2",
  4: "Key Stage 2",
  5: "Key Stage 2",
  6: "Key Stage 2",
};

const describeProgramme = (
  programme: CurriculumProgramme,
  yearGroup: YearGroup,
) =>
  programme === "year"
    ? `Year ${String(yearGroup)} programme of study`
    : `${keyStageNames[yearGroup]} programme of study, taught in Year ${String(yearGroup)}`;

interface GameCoverage {
  game: SkillGame;
  percentComplete: number;
  isTricky: boolean;
}

const getAverage = (values: readonly number[]) =>
  values.length === 0
    ? 0
    : Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      );

const buildGameCoverage = (
  skillCoverage: readonly SkillCoverage[],
): GameCoverage[] => {
  const games = new Map<string, { game: SkillGame; skills: SkillCoverage[] }>();
  for (const coverage of skillCoverage) {
    for (const game of listSkillGames(coverage.skill.id)) {
      const listed = games.get(game.key);
      games.set(game.key, {
        game,
        skills: [...(listed?.skills ?? []), coverage],
      });
    }
  }
  return [...games.values()].map(({ game, skills }) => ({
    game,
    percentComplete: getAverage(
      skills.map(({ percentComplete }) => percentComplete),
    ),
    isTricky: skills.some(({ isTricky }) => isTricky),
  }));
};

const countStatuses = (points: readonly PointCoverage[]) =>
  pointStatuses.map((status) => ({
    status,
    count: points.filter((point) => point.status === status).length,
  }));

const helpNextOrder: Record<PointStatus, number> = {
  "needs-help": 0,
  "not-started": 1,
  learning: 2,
  complete: 3,
};

const listHelpNext = (subjects: readonly SubjectCoverage[]) =>
  subjects
    .flatMap(({ points }) => points)
    .filter(({ status }) => isGapStatus(status))
    .toSorted(
      (first, second) =>
        helpNextOrder[first.status] - helpNextOrder[second.status] ||
        first.percentComplete - second.percentComplete,
    )
    .slice(0, helpNextLength);

const buildPointElementId = (
  idPrefix: string,
  { point }: Pick<PointCoverage, "point">,
) => `${idPrefix}-${point.subject}-${point.id}`;

const StatusIcon = ({ status }: { status: PointStatus }) => {
  switch (status) {
    case "complete":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "learning":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 16l5-5 4 4 7-8"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "needs-help":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 7v6M12 17h.01"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "not-started":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12"
            cy="12"
            r="6.5"
            fill="none"
            strokeWidth="3"
            strokeDasharray="3 3"
          />
        </svg>
      );
  }
};

const StatusBadge = ({ status }: { status: PointStatus }) => (
  <span className={`point-status ${status}`}>
    <StatusIcon status={status} />
    {pointStatusNames[status]}
  </span>
);

const ProgressMeter = ({
  label,
  percentComplete,
  status,
  isSmall = false,
}: {
  label: string;
  percentComplete: number;
  status: PointStatus;
  isSmall?: boolean;
}) => (
  <div className={isSmall ? "point-meter small" : "point-meter"}>
    <div
      className="point-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={percentWhole}
      aria-valuenow={percentComplete}
      aria-valuetext={`${String(percentComplete)}% complete`}
    >
      <span
        className={`point-fill ${status}`}
        style={{ width: `${String(percentComplete)}%` }}
      />
    </div>
    <span className="point-percent" aria-hidden="true">
      {percentComplete}%
    </span>
  </div>
);

const decideGameStatus = ({
  percentComplete,
  isTricky,
}: GameCoverage): PointStatus => {
  if (percentComplete === percentWhole) {
    return "complete";
  }
  if (isTricky) {
    return "needs-help";
  }
  return percentComplete > 0 ? "learning" : "not-started";
};

const PointGames = ({ coverage }: { coverage: PointCoverage }) => {
  const games = buildGameCoverage(coverage.skills);
  return (
    <ul
      className="point-games"
      aria-label={`Games that teach ${coverage.point.heading}`}
    >
      {games.map((gameCoverage) => (
        <li key={gameCoverage.game.key} className="point-game">
          <span className="point-game-name">
            <span className="point-game-title">{gameCoverage.game.title}</span>
            <span className="point-game-place">
              {gameCoverage.game.regionName}, {gameCoverage.game.islandName}
            </span>
          </span>
          <ProgressMeter
            isSmall
            label={`${gameCoverage.game.title}, for ${coverage.point.heading}`}
            percentComplete={gameCoverage.percentComplete}
            status={decideGameStatus(gameCoverage)}
          />
        </li>
      ))}
    </ul>
  );
};

const PointItem = ({
  coverage,
  elementId,
}: {
  coverage: PointCoverage;
  elementId: string;
}) => (
  <li className={`curriculum-point ${coverage.status}`}>
    <div className="point-heading">
      <h5 id={elementId} tabIndex={-1}>
        {coverage.point.heading}
      </h5>
      <StatusBadge status={coverage.status} />
    </div>
    <p className="point-summary">{coverage.point.summary}</p>
    <ProgressMeter
      label={coverage.point.heading}
      percentComplete={coverage.percentComplete}
      status={coverage.status}
    />
    <p className="point-hint">{pointStatusHints[coverage.status]}</p>
    <PointGames coverage={coverage} />
  </li>
);

const describeSubjectCounts = (points: readonly PointCoverage[]) => {
  const completeCount = points.filter(
    ({ status }) => status === "complete",
  ).length;
  const gapCount = points.filter(({ status }) => isGapStatus(status)).length;
  const gapWords =
    gapCount === 0
      ? "no gaps"
      : `${String(gapCount)} ${gapCount === 1 ? "gap" : "gaps"}`;
  return `${String(completeCount)} of ${String(points.length)} complete, ${gapWords}`;
};

const SubjectSection = ({
  coverage,
  yearGroup,
  isOpen,
  isShowingGapsOnly,
  idPrefix,
  onToggled,
}: {
  coverage: SubjectCoverage;
  yearGroup: YearGroup;
  isOpen: boolean;
  isShowingGapsOnly: boolean;
  idPrefix: string;
  onToggled: (isOpen: boolean) => void;
}) => {
  const shownPoints = isShowingGapsOnly
    ? coverage.points.filter(({ status }) => isGapStatus(status))
    : coverage.points;
  const subjectName = subjectNames[coverage.subject];
  return (
    <details
      className={`curriculum-subject subject-${coverage.subject}`}
      open={isOpen}
      onToggle={(event) => {
        onToggled(event.currentTarget.open);
      }}
    >
      <summary>
        <span className="subject-summary-text">
          <h4 className="subject-name">{subjectName}</h4>
          <span className="subject-counts">
            {describeSubjectCounts(coverage.points)}
          </span>
        </span>
        <ProgressMeter
          label={`${subjectName}, Year ${String(yearGroup)}`}
          percentComplete={coverage.percentComplete}
          status={
            coverage.percentComplete === percentWhole ? "complete" : "learning"
          }
        />
      </summary>
      <p className="subject-programme">
        {describeProgramme(coverage.programme, yearGroup)}.{" "}
        <a href={coverage.programmeOfStudyUrl} target="_blank" rel="noreferrer">
          Read the {subjectName} programme of study on GOV.UK
          <OpensInNewTab />
        </a>
      </p>
      {shownPoints.length === 0 ? (
        <p className="chart-empty">No gaps in {subjectName} this Year.</p>
      ) : (
        <ul className="curriculum-points">
          {shownPoints.map((point) => (
            <PointItem
              key={point.point.id}
              coverage={point}
              elementId={buildPointElementId(idPrefix, point)}
            />
          ))}
        </ul>
      )}
    </details>
  );
};

const YearPicker = ({
  childYear,
  chosenYear,
  onYearChosen,
}: {
  childYear: YearGroup | null;
  chosenYear: YearGroup;
  onYearChosen: (yearGroup: YearGroup) => void;
}) => (
  <div className="year-picker" role="group" aria-label="Choose a Year">
    {listCurriculumYears().map((yearGroup) => (
      <button
        key={yearGroup}
        type="button"
        aria-pressed={yearGroup === chosenYear}
        onClick={() => {
          onYearChosen(yearGroup);
        }}
      >
        Year {yearGroup}
        {yearGroup === childYear ? (
          <>
            {" "}
            <span className="year-now">now</span>
          </>
        ) : undefined}
      </button>
    ))}
  </div>
);

const StatusTotals = ({ points }: { points: readonly PointCoverage[] }) => (
  <ul className="status-totals" aria-label="Curriculum Points by status">
    {countStatuses(points).map(({ status, count }) => (
      <li key={status} className={`status-total ${status}`}>
        <StatusIcon status={status} />
        <span className="status-total-count">{count}</span>
        <span className="status-total-name">{pointStatusNames[status]}</span>
      </li>
    ))}
  </ul>
);

const HelpNext = ({
  nickname,
  points,
  onPointChosen,
}: {
  nickname: string;
  points: readonly PointCoverage[];
  onPointChosen: (point: PointCoverage) => void;
}): ReactNode =>
  points.length === 0 ? (
    <p className="help-next-none">
      No gaps this Year. Every Curriculum Point {nickname} has been taught is on
      its way.
    </p>
  ) : (
    <div className="help-next">
      <h4>Where to help {nickname} next</h4>
      <ol>
        {points.map((point) => (
          <li key={`${point.point.subject}-${point.point.id}`}>
            <button
              type="button"
              className="help-next-point"
              onClick={() => {
                onPointChosen(point);
              }}
            >
              <span className="help-next-subject">
                {subjectNames[point.point.subject]}
              </span>
              <span className="help-next-heading">{point.point.heading}</span>
              <StatusBadge status={point.status} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );

const CurriculumLinks = () => (
  <footer className="curriculum-links">
    {subjectsWithoutGames.map(({ name, reason, programmeOfStudyUrl }) => (
      <p key={name}>
        <strong>{name}</strong> is part of the National Curriculum too. {reason}{" "}
        <a href={programmeOfStudyUrl} target="_blank" rel="noreferrer">
          Read the {name} programme of study on GOV.UK
          <OpensInNewTab />
        </a>
      </p>
    ))}
    <p>
      <a href={nationalCurriculumUrl} target="_blank" rel="noreferrer">
        The whole National Curriculum in England on GOV.UK
        <OpensInNewTab />
      </a>
    </p>
  </footer>
);

export interface CurriculumProgressProps {
  nickname: string;
  yearGroup: YearGroup | null;
  mastery: readonly SkillMastery[];
}

export const CurriculumProgress = ({
  nickname,
  yearGroup,
  mastery,
}: CurriculumProgressProps) => {
  const idPrefix = useId();
  const [chosenYear, setChosenYear] = useState<YearGroup>(
    findHomeIsland(yearGroup).yearGroup,
  );
  const [isShowingGapsOnly, setShowingGapsOnly] = useState(false);
  const [openSubjects, setOpenSubjects] = useState<ReadonlySet<Subject>>(
    new Set(),
  );
  const subjects = buildYearCoverage(chosenYear, mastery);
  const points = subjects.flatMap((subject) => subject.points);
  const headingId = `${idPrefix}-heading`;

  const changeSubjectOpen = (subject: Subject, isOpen: boolean) => {
    setOpenSubjects((current) => {
      if (current.has(subject) === isOpen) {
        return current;
      }
      const next = new Set(current);
      if (isOpen) {
        next.add(subject);
      } else {
        next.delete(subject);
      }
      return next;
    });
  };

  return (
    <section className="curriculum-progress" aria-labelledby={headingId}>
      <header className="curriculum-header">
        <h3 id={headingId}>National Curriculum, Year {chosenYear}</h3>
        <p className="chart-summary">
          The key points of each Subject, the Games that teach them, and how far{" "}
          {nickname} has got with each.
        </p>
      </header>
      <YearPicker
        childYear={yearGroup}
        chosenYear={chosenYear}
        onYearChosen={(year) => {
          setChosenYear(year);
          setOpenSubjects(new Set());
        }}
      />
      <StatusTotals points={points} />
      <HelpNext
        nickname={nickname}
        points={listHelpNext(subjects)}
        onPointChosen={(point) => {
          flushSync(() => {
            setShowingGapsOnly(false);
            changeSubjectOpen(point.point.subject, true);
          });
          const pointHeading = document.getElementById(
            buildPointElementId(idPrefix, point),
          );
          pointHeading?.scrollIntoView({ block: "center" });
          pointHeading?.focus();
        }}
      />
      <div className="curriculum-tools">
        <button
          type="button"
          className="gaps-only"
          aria-pressed={isShowingGapsOnly}
          onClick={() => {
            setShowingGapsOnly((isShowing) => !isShowing);
          }}
        >
          Show only gaps
        </button>
        <div className="curriculum-expand">
          <button
            type="button"
            onClick={() => {
              setOpenSubjects(new Set(subjects.map(({ subject }) => subject)));
            }}
          >
            Show every point
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenSubjects(new Set());
            }}
          >
            Hide every point
          </button>
        </div>
      </div>
      <div className="curriculum-subjects">
        {subjects.map((coverage) => (
          <SubjectSection
            key={`${String(chosenYear)}-${coverage.subject}`}
            coverage={coverage}
            yearGroup={chosenYear}
            isOpen={openSubjects.has(coverage.subject)}
            isShowingGapsOnly={isShowingGapsOnly}
            idPrefix={idPrefix}
            onToggled={(isOpen) => {
              changeSubjectOpen(coverage.subject, isOpen);
            }}
          />
        ))}
      </div>
      <CurriculumLinks />
    </section>
  );
};
