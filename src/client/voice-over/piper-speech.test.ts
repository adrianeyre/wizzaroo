import { describe, expect, it } from "vitest";
import { isPiperOffered, splitIntoSentences } from "./piper-speech.js";

describe("splitIntoSentences", () => {
  it("splits words into sentences, so the first is heard while the next is made", () => {
    expect(
      splitIntoSentences("Hello! I'm Cori. Can you count the fish?  "),
    ).toStrictEqual(["Hello!", "I'm Cori.", "Can you count the fish?"]);
  });

  it("splits a long sentence at its commas", () => {
    const clause = "a long part of a long sentence that keeps on going";
    const sentence = Array.from({ length: 10 }, () => clause).join(", ");
    const pieces = splitIntoSentences(sentence);
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((piece) => piece.length <= 280)).toBe(true);
    expect(pieces.join(" ")).toBe(sentence);
  });

  it("says nothing for no words", () => {
    expect(splitIntoSentences("   ")).toStrictEqual([]);
  });
});

describe("isPiperOffered", () => {
  it("is false where there is no worker, WebAssembly cache or sound", () => {
    expect(isPiperOffered()).toBe(false);
  });
});
