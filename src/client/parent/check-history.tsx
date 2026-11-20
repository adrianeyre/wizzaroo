import { describeCheckScore } from "../../curriculum/check-attempts.js";
import { findCheckQuestionTypeName } from "../../curriculum/check-papers.js";
import {
  buildQuestionTypeScores,
  checkFormats,
  listFactsToPractise,
  type CheckAttempt,
} from "../../curriculum/checks.js";
import {
  buildTimesTablesGrid,
  parseFactKey,
  timesTablesFactStatuses,
  type TimesTablesFactStatus,
} from "../../curriculum/times-tables-check.js";

const checkDayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const factStatusNames: Record<TimesTablesFactStatus, string> = {
  "not-asked": "Not asked",
  right: "Right in time",
  slow: "Right but slow",
  "not-in-time": "Not in time",
  missed: "Missed",
};

const factStatusMarks: Record<TimesTablesFactStatus, string> = {
  "not-asked": "",
  right: "✓",
  slow: "~",
  "not-in-time": "…",
  missed: "✗",
};

const factStatusColours: Record<TimesTablesFactStatus, string> = {
  "not-asked": "var(--chart-not-started)",
  right: "var(--chart-mastered)",
  slow: "var(--chart-learning)",
  "not-in-time": "var(--chart-due-for-review)",
  missed: "var(--chart-history)",
};

const readLocalDate = (localDate: string) => new Date(`${localDate}T00:00:00`);

export const describeCheckAttempt = (attempt: CheckAttempt): string =>
  `${describeCheckScore(attempt)}${attempt.isClockOff ? " (no time limit)" : ""}`;

const FactStatusLegend = () => (
  <ul className="chart-legend inline">
    {timesTablesFactStatuses.map((status) => (
      <li key={status}>
        <span
          className="legend-swatch fact-swatch"
          style={{ background: factStatusColours[status] }}
          aria-hidden="true"
        >
          {factStatusMarks[status]}
        </span>
        <span className="legend-label">{factStatusNames[status]}</span>
      </li>
    ))}
  </ul>
);

const TimesTablesGrid = ({
  checkHistory,
}: {
  checkHistory: readonly CheckAttempt[];
}) => {
  const grid = buildTimesTablesGrid(checkHistory);
  const tables = grid.map(([{ first }]) => first);
  const caption =
    "Times tables facts across the latest Multiplication Tables Checks";
  return (
    <>
      <h4>{caption}</h4>
      <p className="form-hint">
        Each fact shows the answer that most needs practice in the last five
        Timed Checks, either way round.
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <table className="times-tables-grid">
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">×</th>
              {tables.map((table) => (
                <th key={table} scope="col">
                  {table}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row[0].first}>
                <th scope="row">{row[0].first}</th>
                {row.map(({ first, second, status }) => (
                  <td
                    key={second}
                    className={`fact-${status}`}
                    style={{ background: factStatusColours[status] }}
                  >
                    <span aria-hidden="true">{factStatusMarks[status]}</span>
                    <span className="visually-hidden">
                      {`${String(first)} × ${String(second)}: ${factStatusNames[status]}`}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FactStatusLegend />
    </>
  );
};

const QuestionTypeScores = ({ attempt }: { attempt: CheckAttempt }) => (
  <table className="mastery">
    <caption>Score by question type</caption>
    <thead>
      <tr>
        <th scope="col">Question type</th>
        <th scope="col">Score</th>
      </tr>
    </thead>
    <tbody>
      {buildQuestionTypeScores(attempt.outcomes).map((questionTypeScore) => (
        <tr key={questionTypeScore.questionType}>
          <th scope="row">
            {findCheckQuestionTypeName(
              attempt.checkGameType,
              questionTypeScore.questionType,
            )}
          </th>
          <td>{describeCheckScore(questionTypeScore)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const WordsMissed = ({ attempt }: { attempt: CheckAttempt }) => {
  const wordsMissed = listFactsToPractise(attempt.outcomes);
  return (
    <p>
      {wordsMissed.length === 0
        ? "No words missed."
        : `Words missed: ${wordsMissed.join(", ")}.`}
    </p>
  );
};

const describeFact = (key: string): string => {
  const pair = parseFactKey(key);
  return pair === undefined
    ? key
    : `${String(pair.first)} × ${String(pair.second)}`;
};

const FactsToPractise = ({ attempt }: { attempt: CheckAttempt }) => {
  const facts = listFactsToPractise(attempt.outcomes);
  return (
    <p>
      {facts.length === 0
        ? "Every fact right and in time."
        : `Facts to practise: ${facts.map(describeFact).join(", ")}.`}
    </p>
  );
};

const CheckAttemptDetails = ({ attempt }: { attempt: CheckAttempt }) => {
  if (attempt.checkGameType === "times-tables-check") {
    return <FactsToPractise attempt={attempt} />;
  }
  return (
    <>
      <QuestionTypeScores attempt={attempt} />
      {attempt.checkGameType === "spelling-check" ? (
        <WordsMissed attempt={attempt} />
      ) : null}
    </>
  );
};

interface CheckHistoryProps {
  nickname: string;
  checkHistory: readonly CheckAttempt[];
}

export const CheckHistory = ({ nickname, checkHistory }: CheckHistoryProps) => (
  <section className="check-history" aria-label={`${nickname}'s Check History`}>
    <h3>Check History</h3>
    {checkHistory.length === 0 ? (
      <p className="chart-empty">
        No Timed Checks yet. When {nickname} takes a Timed Check in the
        Challenge Arena, the score shows here.
      </p>
    ) : (
      <>
        {checkHistory.some(
          ({ checkGameType }) => checkGameType === "times-tables-check",
        ) ? (
          <TimesTablesGrid checkHistory={checkHistory} />
        ) : null}
        <ol className="check-attempts">
          {checkHistory.map((attempt) => (
            <li key={`${attempt.finishedAt} ${attempt.checkGameType}`}>
              <h4>{checkFormats[attempt.checkGameType].paperName}</h4>
              <p>
                {checkDayFormat.format(readLocalDate(attempt.localDate))}:{" "}
                <strong>{describeCheckAttempt(attempt)}</strong>
              </p>
              <CheckAttemptDetails attempt={attempt} />
            </li>
          ))}
        </ol>
      </>
    )}
  </section>
);
