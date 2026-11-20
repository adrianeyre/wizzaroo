import { describe, expect, it } from "vitest";
import {
  buildChartQuestions,
  formatClockMinutes,
  type ChartPicture,
} from "./chart-tower.js";
import { pictureQuestionDifficulties } from "./picture-questions.js";

const everyLevel = ([2, 3, 4, 5, 6] as const).flatMap((year) =>
  pictureQuestionDifficulties.map((difficulty) => ({ year, difficulty })),
);

const listPictureKinds = (year: 2 | 3 | 4 | 5 | 6) =>
  new Set(
    pictureQuestionDifficulties.flatMap((difficulty) =>
      buildChartQuestions(year, difficulty).map(({ picture }) => picture.kind),
    ),
  );

const findBars = (picture: ChartPicture) => {
  switch (picture.kind) {
    case "pictogram":
    case "tally":
    case "blocks":
    case "bar-chart":
      return picture.bars;
    case "line-graph":
      return picture.points;
    default:
      return [];
  }
};

describe("buildChartQuestions", () => {
  it.each(everyLevel)(
    "gives Year $year at difficulty $difficulty at least five questions, each with three different slips",
    ({ year, difficulty }) => {
      const questions = buildChartQuestions(year, difficulty);

      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { answer, slips } of questions) {
        expect(new Set(slips).size).toBe(slips.length);
        expect(slips).not.toContain(answer);
        expect(slips.length).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("reads pictograms, tally charts and block diagrams in Year 2, and bar charts in Year 3", () => {
    expect(listPictureKinds(2)).toEqual(
      new Set(["pictogram", "tally", "blocks"]),
    );
    expect(listPictureKinds(3)).toEqual(new Set(["pictogram", "bar-chart"]));
    expect(listPictureKinds(4)).toEqual(new Set(["bar-chart", "line-graph"]));
    expect(listPictureKinds(5)).toEqual(new Set(["line-graph", "timetable"]));
    expect(listPictureKinds(6)).toEqual(new Set(["pie", "bar-chart"]));
  });

  it("answers every reading question with the value the chart shows", () => {
    for (const { year, difficulty } of everyLevel) {
      for (const { ask, picture, answer } of buildChartQuestions(
        year,
        difficulty,
      )) {
        const read = findBars(picture).find(
          ({ label }) =>
            ask.endsWith(`chose ${label}?`) ||
            ask.endsWith(` ${label} were found?`) ||
            ask.endsWith(`at ${label}?`),
        );
        if (read !== undefined && !ask.startsWith("How many more")) {
          expect(Number.parseInt(answer, 10)).toBe(read.value);
        }
      }
    }
  });

  it("puts each bar chart's values on its scale, so a Child can read them", () => {
    for (const { year, difficulty } of everyLevel) {
      for (const { picture } of buildChartQuestions(year, difficulty)) {
        if (picture.kind === "bar-chart" || picture.kind === "line-graph") {
          for (const { value } of findBars(picture)) {
            expect((value * 2) % picture.scaleStep).toBe(0);
          }
        }
      }
    }
  });

  it("finds a whole-number mean, and the hidden value that gives that mean", () => {
    for (const { ask, picture, answer } of buildChartQuestions(6, 3)) {
      if (picture.kind !== "bar-chart") {
        throw new Error("the mean questions should show a bar chart");
      }
      const values = picture.bars.map(({ value }) => value);
      const mean =
        values.reduce((total, value) => total + value, 0) / values.length;
      expect(Number.isInteger(mean)).toBe(true);
      if (picture.hiddenLabel === undefined) {
        expect(Number(answer)).toBe(mean);
      } else {
        expect(ask).toContain(`The mean is ${String(mean)} shells`);
      }
    }
  });

  it("makes every pie chart slice a whole number of children, the slices filling the pie", () => {
    for (const difficulty of [1, 2] as const) {
      for (const { picture, answer } of buildChartQuestions(6, difficulty)) {
        if (picture.kind !== "pie") {
          throw new Error("the Year 6 pie questions should show a pie chart");
        }
        expect(
          picture.slices.reduce((total, { parts }) => total + parts, 0),
        ).toBe(picture.wholeParts);
        expect(Number.isInteger(Number(answer))).toBe(true);
      }
    }
  });

  it("reads a ferry's arrival time from the timetable", () => {
    const [question] = buildChartQuestions(5, 2);

    expect(question.ask).toBe(
      "When does the 09:10 ferry from Coral Cove reach Kelp Harbour?",
    );
    expect(question.answer).toBe("09:40");
    expect(formatClockMinutes(13 * 60 + 5)).toBe("13:05");
  });

  it("works out how long a ferry journey takes, in minutes", () => {
    const [journey] = buildChartQuestions(5, 3);

    expect(journey.ask).toBe(
      "How long does the ferry take from Coral Cove to Shell Beach?",
    );
    expect(journey.answer).toBe("45 minutes");
  });
});
