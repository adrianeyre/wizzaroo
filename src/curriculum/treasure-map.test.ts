import { describe, expect, it } from "vitest";
import { pictureQuestionDifficulties } from "./picture-questions.js";
import {
  buildTreasureMapQuestions,
  formatPoint,
  type TreasureMapQuestion,
} from "./treasure-map.js";

const everyLevel = ([1, 2, 4, 5, 6] as const).flatMap((year) =>
  pictureQuestionDifficulties.map((difficulty) => ({ year, difficulty })),
);

const readPoint = (written: string) => {
  const [, x, y] = /^\((−?\d+), (−?\d+)\)$/.exec(written) ?? [];
  return { x: Number(x.replace("−", "-")), y: Number(y.replace("−", "-")) };
};

const findGrid = ({ picture }: TreasureMapQuestion) => {
  if (picture.kind !== "grid") {
    throw new Error("this question should be on the treasure grid");
  }
  return picture;
};

describe("buildTreasureMapQuestions", () => {
  it.each(everyLevel)(
    "gives Year $year at difficulty $difficulty at least five questions, each with three different slips",
    ({ year, difficulty }) => {
      const questions = buildTreasureMapQuestions(year, difficulty);

      expect(questions.length).toBeGreaterThanOrEqual(5);
      for (const { answer, slips } of questions) {
        expect(new Set(slips).size).toBe(slips.length);
        expect(slips).not.toContain(answer);
        expect(slips.length).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it("turns the turtle a half turn to face what is behind it", () => {
    const halfTurn = buildTreasureMapQuestions(1, 1).find(({ ask }) =>
      ask.startsWith("The turtle faces the shell. It makes a half turn."),
    );

    expect(halfTurn?.answer).toBe("crab");
  });

  it("turns clockwise to the right and anticlockwise to the left", () => {
    const questions = buildTreasureMapQuestions(2, 1);
    const clockwise = questions.find(({ ask }) =>
      ask.startsWith(
        "The turtle faces the shell. It turns a quarter turn clockwise.",
      ),
    );
    const anticlockwise = questions.find(({ ask }) =>
      ask.startsWith(
        "The turtle faces the shell. It turns a quarter turn anticlockwise.",
      ),
    );

    expect(clockwise?.answer).toBe("starfish");
    expect(anticlockwise?.answer).toBe("anchor");
  });

  it("never offers the landmark a position question names as one of its slips", () => {
    for (const { ask, slips } of buildTreasureMapQuestions(1, 3)) {
      for (const slip of slips) {
        expect(ask).not.toContain(`the ${slip}`);
      }
    }
  });

  it("writes coordinates across then up, with a true minus sign below zero", () => {
    expect(formatPoint({ x: 3, y: 5 })).toBe("(3, 5)");
    expect(formatPoint({ x: -2, y: 4 })).toBe("(−2, 4)");
  });

  it("asks for the coordinates of the treasure marked on the grid, every slip on the grid too", () => {
    for (const year of [4, 6] as const) {
      for (const question of buildTreasureMapQuestions(year, 1).filter(
        ({ ask }) => ask === "What are the coordinates of the treasure?",
      )) {
        const grid = findGrid(question);
        expect(grid.treasure).toEqual(readPoint(question.answer));
        for (const slip of question.slips) {
          const { x, y } = readPoint(slip);
          expect(Math.min(x, y)).toBeGreaterThanOrEqual(grid.low);
          expect(Math.max(x, y)).toBeLessThanOrEqual(grid.high);
        }
      }
    }
  });

  it("names the flag standing at the coordinates asked for", () => {
    const flagQuestions = buildTreasureMapQuestions(4, 1).filter(({ ask }) =>
      ask.startsWith("Which flag"),
    );

    expect(flagQuestions.length).toBeGreaterThan(0);
    for (const question of flagQuestions) {
      const { flags } = findGrid(question);
      const flag = flags.find(({ label }) => label === question.answer);
      expect(question.ask).toContain(formatPoint(flag ?? { x: -1, y: -1 }));
    }
  });

  it("completes the rectangle from its three corners", () => {
    for (const question of buildTreasureMapQuestions(4, 3)) {
      const [first, second, third] = findGrid(question).outline;
      const fourth = readPoint(question.answer);
      expect(fourth.x + second.x).toBe(first.x + third.x);
      expect(fourth.y + second.y).toBe(first.y + third.y);
    }
  });

  it("reflects a point to the same distance on the other side of the mirror", () => {
    for (const year of [5, 6] as const) {
      for (const question of [
        ...buildTreasureMapQuestions(year, 2),
        ...buildTreasureMapQuestions(year, 3),
      ].filter(({ ask }) => ask.startsWith("The pearl"))) {
        const { treasure, mirror } = findGrid(question);
        const image = readPoint(question.answer);
        if (treasure === undefined || mirror === undefined) {
          throw new Error("a reflection needs a pearl and a mirror line");
        }
        const [along, across] =
          mirror.axis === "x"
            ? [treasure.x + image.x, treasure.y - image.y]
            : [treasure.y + image.y, treasure.x - image.x];
        expect(along).toBe(2 * mirror.at);
        expect(across).toBe(0);
      }
    }
  });

  it("describes a translation as squares right or left, then up or down", () => {
    const [question] = buildTreasureMapQuestions(5, 1);

    expect(question.ask).toBe(
      "The submarine sails from (2, 3) to the treasure at (6, 1). How did it move?",
    );
    expect(question.answer).toBe("4 right, 2 down");
  });

  it("keeps Year 6 on a grid with all four quadrants", () => {
    for (const difficulty of pictureQuestionDifficulties) {
      for (const question of buildTreasureMapQuestions(6, difficulty)) {
        expect(findGrid(question).low).toBeLessThan(0);
      }
    }
  });
});
