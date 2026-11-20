import type { ReactNode } from "react";
import {
  isMasteredState,
  type DailyPractice,
  type MasteryState,
  type SkillMastery,
} from "../../curriculum/mastery.js";
import {
  skills,
  subjectNames,
  subjects,
  type Subject,
} from "../../curriculum/skills.js";
import { CheckHistory } from "./check-history.js";
import type { Child } from "./children-panel.js";
import { CurriculumProgress } from "./curriculum-progress.js";
import {
  BarChart,
  ChartCard,
  ColumnChart,
  DonutChart,
  StackedBarChart,
  StatTile,
  type ChartBar,
  type ChartColumn,
  type ChartSegment,
  type StackedRow,
} from "./progress-charts.js";

const secondsPerMinute = 60;
const minutesPerHour = 60;
const percentWhole = 100;

const subjectColours: Record<Subject, string> = {
  maths: "var(--chart-maths)",
  phonics: "var(--chart-phonics)",
  english: "var(--chart-english)",
  science: "var(--chart-science)",
  music: "var(--chart-music)",
  geography: "var(--chart-geography)",
  history: "var(--chart-history)",
  computing: "var(--chart-computing)",
  art: "var(--chart-art)",
  design: "var(--chart-design)",
  languages: "var(--chart-languages)",
};

export const masteryStateNames: Record<MasteryState, string> = {
  "not-started": "Not started",
  learning: "Learning",
  mastered: "Mastered",
  "due-for-review": "Due for review",
};

const masteryStateColours: Record<MasteryState, string> = {
  mastered: "var(--chart-mastered)",
  "due-for-review": "var(--chart-due-for-review)",
  learning: "var(--chart-learning)",
  "not-started": "var(--chart-not-started)",
};

const shownMasteryStates: MasteryState[] = [
  "mastered",
  "due-for-review",
  "learning",
  "not-started",
];

const timeSpentFormat = new Intl.DurationFormat("en-GB", { style: "long" });
const shortTimeSpentFormat = new Intl.DurationFormat("en-GB", {
  style: "short",
});
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const reviewDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const readLocalDate = (localDate: string) => new Date(`${localDate}T00:00:00`);

const formatMinutes = (
  seconds: number,
  durationFormat: Intl.DurationFormat,
) => {
  const minutes = Math.floor(seconds / secondsPerMinute);
  if (seconds === 0) {
    return "none yet";
  }
  return minutes === 0
    ? "under a minute"
    : durationFormat.format({
        hours: Math.floor(minutes / minutesPerHour),
        minutes: minutes % minutesPerHour,
      });
};

export const describeMinutes = (seconds: number) =>
  formatMinutes(seconds, timeSpentFormat);

export const describeShortMinutes = (seconds: number) =>
  formatMinutes(seconds, shortTimeSpentFormat);

const describeMasteryState = ({
  state,
  goodDayCount,
  goodDaysNeeded,
}: SkillMastery) =>
  state === "learning"
    ? `Learning (${String(goodDayCount)} of ${String(goodDaysNeeded)} good days)`
    : masteryStateNames[state];

const buildNotStarted = (skillId: string): SkillMastery => ({
  skillId,
  state: "not-started",
  percentCorrect: null,
  timeSpentSeconds: 0,
  goodDayCount: 0,
  goodDaysNeeded: 0,
  reviewIntervalDays: null,
  nextReviewDate: null,
});

const findSkillName = (skillId: string) =>
  skills.find(({ id }) => id === skillId)?.name ?? skillId;

const findSkillMastery = (
  mastery: readonly SkillMastery[],
  skillId: string,
): SkillMastery =>
  mastery.find((skillMastery) => skillMastery.skillId === skillId) ??
  buildNotStarted(skillId);

const listShownMastery = (mastery: readonly SkillMastery[]): SkillMastery[] =>
  skills.flatMap(({ id, subject }) => {
    const skillMastery = mastery.find(({ skillId }) => skillId === id);
    if (skillMastery !== undefined) {
      return [skillMastery];
    }
    return subject === "phonics" ? [] : [buildNotStarted(id)];
  });

export const countMasteredSkills = (mastery: readonly SkillMastery[]) =>
  mastery.filter(({ state }) => isMasteredState(state)).length;

const buildMasterySegments = (
  states: readonly MasteryState[],
): ChartSegment[] =>
  shownMasteryStates.map((state) => ({
    key: state,
    label: masteryStateNames[state],
    value: states.filter((shownState) => shownState === state).length,
    colour: masteryStateColours[state],
  }));

const buildSubjectRows = (mastery: readonly SkillMastery[]): StackedRow[] =>
  subjects.map((subject) => {
    const subjectStates = skills
      .filter((skill) => skill.subject === subject)
      .map(({ id }) => findSkillMastery(mastery, id).state);
    const masteredCount = subjectStates.filter(isMasteredState).length;
    return {
      key: subject,
      label: subjectNames[subject],
      segments: buildMasterySegments(subjectStates),
      summary:
        subjectStates.length === 0
          ? "No Skills yet"
          : `${String(masteredCount)} of ${String(subjectStates.length)} mastered`,
    };
  });

const listPractisedMastery = (mastery: readonly SkillMastery[]) =>
  skills.flatMap(({ id }) =>
    mastery.filter(
      (skillMastery) =>
        skillMastery.skillId === id && skillMastery.percentCorrect !== null,
    ),
  );

const buildAccuracyBars = (mastery: readonly SkillMastery[]): ChartBar[] =>
  listPractisedMastery(mastery).map(({ skillId, percentCorrect }) => ({
    key: skillId,
    label: findSkillName(skillId),
    value: percentCorrect ?? 0,
    largestValue: percentWhole,
    valueLabel: `${String(percentCorrect ?? 0)}%`,
    targetPercent: skills.find(({ id }) => id === skillId)?.masteryRule
      .percentCorrect,
  }));

const buildTimeBars = (mastery: readonly SkillMastery[]): ChartBar[] => {
  const practised = listPractisedMastery(mastery).toSorted(
    (first, second) => second.timeSpentSeconds - first.timeSpentSeconds,
  );
  const longest = Math.max(
    ...practised.map(({ timeSpentSeconds }) => timeSpentSeconds),
    1,
  );
  return practised.map(({ skillId, timeSpentSeconds }) => ({
    key: skillId,
    label: findSkillName(skillId),
    value: timeSpentSeconds,
    largestValue: longest,
    valueLabel: describeShortMinutes(timeSpentSeconds),
  }));
};

const buildGoodDayBars = (mastery: readonly SkillMastery[]): ChartBar[] =>
  listPractisedMastery(mastery)
    .filter(({ state }) => state === "learning")
    .map(({ skillId, goodDayCount, goodDaysNeeded }) => ({
      key: skillId,
      label: findSkillName(skillId),
      value: goodDayCount,
      largestValue: goodDaysNeeded,
      valueLabel: `${String(goodDayCount)} of ${String(goodDaysNeeded)} good days`,
    }));

const buildSubjectTimeSegments = (
  mastery: readonly SkillMastery[],
): ChartSegment[] =>
  subjects.map((subject) => ({
    key: subject,
    label: subjectNames[subject],
    value: Math.round(
      mastery
        .filter(
          ({ skillId }) =>
            skills.find(({ id }) => id === skillId)?.subject === subject,
        )
        .reduce((total, { timeSpentSeconds }) => total + timeSpentSeconds, 0) /
        secondsPerMinute,
    ),
    colour: subjectColours[subject],
  }));

const describePracticeDay = ({
  secondsSpent,
  questionCount,
  rightFirstTimeCount,
}: DailyPractice) => {
  if (questionCount === 0 && secondsSpent === 0) {
    return "No practice";
  }
  const rightFirstTime =
    questionCount === 0
      ? ""
      : `, ${String(Math.round((rightFirstTimeCount * percentWhole) / questionCount))}% right first time`;
  return `${describeMinutes(secondsSpent)}, ${String(questionCount)} questions${rightFirstTime}`;
};

const buildPracticeColumns = (
  dailyPractice: readonly DailyPractice[],
): ChartColumn[] =>
  dailyPractice.map((practiceDay) => {
    const day = readLocalDate(practiceDay.localDate);
    return {
      key: practiceDay.localDate,
      label: dayFormat.format(day),
      shortLabel: String(day.getDate()),
      value: practiceDay.secondsSpent,
      detail: describePracticeDay(practiceDay),
    };
  });

const sumDailyPractice = (
  dailyPractice: readonly DailyPractice[],
  field: "questionCount" | "rightFirstTimeCount" | "secondsSpent",
) =>
  dailyPractice.reduce((total, practiceDay) => total + practiceDay[field], 0);

const StarIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" />
    <path d="M12 7v5l3.5 2" fill="none" strokeWidth="2.5" />
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M7 3h10v5a5 5 0 01-10 0zM5 4H3v2a4 4 0 004 4M19 4h2v2a4 4 0 01-4 4M10 15h4v3h3v3H7v-3h3z" />
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="5" fill="none" strokeWidth="2.5" />
    <circle cx="12" cy="12" r="1.8" />
  </svg>
);

const ScrollingTable = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

type ProgressChild = Omit<
  Child,
  "classmateVisitsAllowed" | "classmateVisitsApproved"
>;

const MasteryTable = ({ child }: { child: ProgressChild }) => (
  <ScrollingTable label={`${child.nickname}'s Skills`}>
    <MasteryTableRows child={child} />
  </ScrollingTable>
);

const MasteryTableRows = ({ child }: { child: ProgressChild }) => (
  <table className="mastery">
    <caption>{child.nickname}'s Skills</caption>
    <thead>
      <tr>
        <th scope="col">Skill</th>
        <th scope="col">Mastery</th>
        <th scope="col">Right first time</th>
        <th scope="col">Time spent</th>
      </tr>
    </thead>
    <tbody>
      {listShownMastery(child.mastery).map((skillMastery) => (
        <tr key={skillMastery.skillId}>
          <th scope="row">{findSkillName(skillMastery.skillId)}</th>
          <td>{describeMasteryState(skillMastery)}</td>
          <td>
            {skillMastery.percentCorrect === null
              ? "–"
              : `${String(skillMastery.percentCorrect)}%`}
          </td>
          <td>{describeMinutes(skillMastery.timeSpentSeconds)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const PracticeTable = ({ child }: { child: ProgressChild }) => (
  <ScrollingTable label={`${child.nickname}'s last 14 days`}>
    <PracticeTableRows child={child} />
  </ScrollingTable>
);

const PracticeTableRows = ({ child }: { child: ProgressChild }) => (
  <table className="mastery">
    <caption>{child.nickname}'s last 14 days</caption>
    <thead>
      <tr>
        <th scope="col">Day</th>
        <th scope="col">Practice</th>
      </tr>
    </thead>
    <tbody>
      {child.dailyPractice.map((practiceDay) => (
        <tr key={practiceDay.localDate}>
          <th scope="row">
            {dayFormat.format(readLocalDate(practiceDay.localDate))}
          </th>
          <td>{describePracticeDay(practiceDay)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ReviewList = ({ mastery }: { mastery: readonly SkillMastery[] }) => {
  const reviews = mastery
    .filter(({ nextReviewDate }) => nextReviewDate !== null)
    .toSorted((first, second) =>
      (first.nextReviewDate ?? "").localeCompare(second.nextReviewDate ?? ""),
    );
  return reviews.length === 0 ? (
    <p className="chart-empty">
      No Reviews yet. A Skill comes back for a Review a week after it&apos;s
      Mastered.
    </p>
  ) : (
    <ul className="review-list">
      {reviews.map(({ skillId, state, nextReviewDate }) => (
        <li key={skillId}>
          <span className="review-skill">{findSkillName(skillId)}</span>
          <span
            className={
              state === "due-for-review" ? "review-badge due" : "review-badge"
            }
          >
            {state === "due-for-review"
              ? "Due now"
              : reviewDayFormat.format(readLocalDate(nextReviewDate ?? ""))}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const ChildProgress = ({ child }: { child: ProgressChild }) => {
  const { nickname, mastery, dailyPractice } = child;
  const skillStates = skills.map(
    ({ id }) => findSkillMastery(mastery, id).state,
  );
  const masteredCount = countMasteredSkills(mastery);
  const masteredPercent = Math.round(
    (masteredCount * percentWhole) / skills.length,
  );
  const fortnightQuestions = sumDailyPractice(dailyPractice, "questionCount");
  const fortnightRightFirstTime = sumDailyPractice(
    dailyPractice,
    "rightFirstTimeCount",
  );
  const fortnightSeconds = sumDailyPractice(dailyPractice, "secondsSpent");
  const daysPlayed = dailyPractice.filter(
    ({ questionCount, secondsSpent }) => questionCount > 0 || secondsSpent > 0,
  ).length;
  const accuracyBars = buildAccuracyBars(mastery);
  const timeBars = buildTimeBars(mastery);
  const goodDayBars = buildGoodDayBars(mastery);
  const subjectTimeSegments = buildSubjectTimeSegments(mastery);
  const practiceColumns = buildPracticeColumns(dailyPractice);
  const longestDaySeconds = Math.max(
    ...dailyPractice.map(({ secondsSpent }) => secondsSpent),
    0,
  );
  const hasPractised = accuracyBars.length > 0;
  const notYetPractised = `No practice yet. Once ${nickname} plays a Mission, it shows here.`;

  return (
    <div className="child-progress">
      <div className="stat-tiles">
        <StatTile
          icon={<StarIcon />}
          label="Stars to spend"
          value={String(child.stars)}
          detail="Earned through effort"
        />
        <StatTile
          icon={<ClockIcon />}
          label="Time spent playing"
          value={describeShortMinutes(child.timeSpentSeconds)}
          detail="Across every Family Device"
        />
        <StatTile
          icon={<TrophyIcon />}
          label="Skills mastered"
          value={`${String(masteredCount)} of ${String(skills.length)}`}
          detail={`${String(masteredPercent)}% of the curriculum so far`}
        />
        <StatTile
          icon={<TargetIcon />}
          label="Right first time"
          value={
            fortnightQuestions === 0
              ? "–"
              : `${String(Math.round((fortnightRightFirstTime * percentWhole) / fortnightQuestions))}%`
          }
          detail={`${String(fortnightQuestions)} questions in the last 14 days`}
        />
      </div>

      <CurriculumProgress
        nickname={nickname}
        yearGroup={child.yearGroup}
        mastery={mastery}
      />

      <div className="progress-grid">
        <ChartCard
          wide
          title="The last 14 days"
          summary={`Played on ${String(daysPlayed)} of the last 14 days, ${describeMinutes(fortnightSeconds)} in Activities.`}
        >
          <ColumnChart
            label={`Minutes in Activities each day: ${practiceColumns.map(({ label, detail }) => `${label}, ${detail}`).join("; ")}`}
            columns={practiceColumns}
            largestValueLabel={describeShortMinutes(longestDaySeconds)}
          />
          <details>
            <summary>See each day</summary>
            <PracticeTable child={child} />
          </details>
        </ChartCard>

        <ChartCard
          title="Mastery of every Skill"
          summary={`${String(masteredCount)} mastered, ${String(skillStates.filter((state) => state === "learning").length)} being learnt.`}
        >
          <DonutChart
            label={`${nickname}'s Mastery`}
            segments={buildMasterySegments(skillStates)}
            centreValue={`${String(masteredPercent)}%`}
            centreLabel="mastered"
          />
        </ChartCard>

        <ChartCard
          title="Mastery by Subject"
          summary="How far through each Subject's Skills they are."
        >
          <StackedBarChart
            rows={buildSubjectRows(mastery)}
            legend={buildMasterySegments([])}
          />
        </ChartCard>

        <ChartCard
          title="Right first time, by Skill"
          summary="Across every Question they've answered on each Skill."
        >
          {hasPractised ? (
            <BarChart
              bars={accuracyBars}
              targetLabel="The line is what a good day needs"
            />
          ) : (
            <p className="chart-empty">{notYetPractised}</p>
          )}
        </ChartCard>

        <ChartCard
          title="Time spent, by Skill"
          summary="Time in Activities on each Skill, longest first."
        >
          {hasPractised ? (
            <BarChart bars={timeBars} />
          ) : (
            <p className="chart-empty">{notYetPractised}</p>
          )}
        </ChartCard>

        <ChartCard
          title="Time spent, by Subject"
          summary="Minutes in Activities on each Subject."
        >
          {hasPractised ? (
            <DonutChart
              label={`${nickname}'s minutes by Subject`}
              segments={subjectTimeSegments}
              centreValue={String(
                subjectTimeSegments.reduce(
                  (total, { value }) => total + value,
                  0,
                ),
              )}
              centreLabel="minutes"
            />
          ) : (
            <p className="chart-empty">{notYetPractised}</p>
          )}
        </ChartCard>

        <ChartCard
          title="On the way to Mastery"
          summary="Good days so far on each Skill being learnt."
        >
          {goodDayBars.length === 0 ? (
            <p className="chart-empty">No Skills being learnt right now.</p>
          ) : (
            <BarChart bars={goodDayBars} />
          )}
        </ChartCard>

        <ChartCard
          title="Reviews coming up"
          summary="Mastered Skills come back so they stick."
        >
          <ReviewList mastery={mastery} />
        </ChartCard>
      </div>

      <CheckHistory nickname={nickname} checkHistory={child.checkHistory} />

      <details>
        <summary>Every Skill in a table</summary>
        <MasteryTable child={child} />
      </details>
    </div>
  );
};
