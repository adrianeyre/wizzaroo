import { describe, expect, it } from "vitest";
import { splitPhonemes } from "./piper-phonemes.js";

describe("splitPhonemes", () => {
  it("splits phonemes into code points, as an older Piper voice was trained", () => {
    expect(splitPhonemes("haɪ")).toEqual(["h", "a", "ɪ"]);
  });

  it("splits an accented letter into the letter and its accent, as Piper does", () => {
    expect(splitPhonemes("é")).toEqual(["e", "́"]);
  });

  it("joins each vowel pair a Piper 1.5 voice lists back into one phoneme", () => {
    const clusters = [
      ["a", "ɪ"],
      ["a", "ʊ"],
      ["e", "ɪ"],
    ];
    expect(splitPhonemes("haɪ naʊ", clusters)).toEqual([
      "h",
      "aɪ",
      " ",
      "n",
      "aʊ",
    ]);
    expect(splitPhonemes("ɪa", clusters)).toEqual(["ɪ", "a"]);
  });
});
