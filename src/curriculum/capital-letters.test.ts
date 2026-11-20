import { describe, expect, it } from "vitest";
import {
  buildCapitalLetterQuestions,
  listCapitalLetters,
} from "./capital-letters.js";

describe("buildCapitalLetterQuestions", () => {
  it("starts with the letters whose capital is the same shape, only bigger", () => {
    expect(
      buildCapitalLetterQuestions(1).map(({ smallLetter }) => smallLetter),
    ).toEqual(Array.from("cikopsuvwxz"));
  });

  it("moves on to the letters whose capital looks different", () => {
    const smallLetters = buildCapitalLetterQuestions(2).map(
      ({ smallLetter }) => smallLetter,
    );

    expect(smallLetters).toContain("a");
    expect(smallLetters).toContain("g");
    expect(smallLetters).not.toContain("o");
  });

  it("covers the whole alphabet once between the two Difficulties, each with its own capital", () => {
    const questions = [
      ...buildCapitalLetterQuestions(1),
      ...buildCapitalLetterQuestions(2),
    ];

    expect(questions).toHaveLength(26);
    expect(
      questions.map(({ capitalLetter }) => capitalLetter).toSorted(),
    ).toEqual(listCapitalLetters());
    expect(questions).toContainEqual({ smallLetter: "q", capitalLetter: "Q" });
  });
});
