import { describe, expect, it } from "vitest";
import { toSpokenWords } from "./spoken-words.js";

describe("toSpokenWords", () => {
  it.each([
    ["9 + ? = 20", "9 plus what equals 20"],
    ["15 − 7 = ?", "15 minus 7 equals what"],
    ["12 × 3 =", "12 times 3 equals what?"],
    ["48 ÷ 6 = ?", "48 divided by 6 equals what"],
    ["2, 4, 6, ?", "2, 4, 6, what"],
    ["One more than 7 is ?", "One more than 7 is what"],
    ["Find 3/4.", "Find three quarters."],
    [
      "At midnight it was −6°C. It rose by 13°.",
      "At midnight it was minus 6 degrees Celsius. It rose by 13 degrees.",
    ],
    ["The cat ___ on the mat.", "The cat blank on the mat."],
    ["Which word fits?\nThe dog ___", "Which word fits? The dog blank"],
    ["Pick the verb\nShe ran home.", "Pick the verb. She ran home."],
  ])("reads %j as %j", (written, spoken) => {
    expect(toSpokenWords(written)).toBe(spoken);
  });

  it("leaves a question mark that ends a sentence, and words with hyphens, alone", () => {
    expect(toSpokenWords("How many fish?")).toBe("How many fish?");
    expect(toSpokenWords("Which 3-D shape does this net make?")).toBe(
      "Which 3-D shape does this net make?",
    );
  });
});
