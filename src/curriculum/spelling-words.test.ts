import { describe, expect, it } from "vitest";
import { skills, yearGroups } from "./skills.js";
import {
  spellingSkillByYear,
  spellingSkillIds,
  spellingWordLists,
} from "./spelling-words.js";

const fewestWordsInAList = 20;

describe("spellingWordLists", () => {
  it.each(spellingSkillIds)(
    "holds at least 20 words for %s, each a whole word of small letters with a clue",
    (skillId) => {
      const words = spellingWordLists[skillId];

      expect(words.length).toBeGreaterThanOrEqual(fewestWordsInAList);
      for (const { word, clue } of words) {
        expect(word).toMatch(/^[a-z]{3,11}$/);
        expect(clue.trim()).not.toBe("");
        expect(clue.toLowerCase()).not.toContain(word);
      }
    },
  );

  it.each(spellingSkillIds)("never lists a word twice in %s", (skillId) => {
    const words = spellingWordLists[skillId].map(({ word }) => word);

    expect(new Set(words).size).toBe(words.length);
  });

  it("takes Year 1 words from the Year 1 common exception words", () => {
    expect(
      spellingWordLists["english.common-exception-words"].map(
        ({ word }) => word,
      ),
    ).toEqual(expect.arrayContaining(["said", "friend", "school", "once"]));
  });
});

describe("spellingSkillByYear", () => {
  it("gives Years 1 and 2 their own list, and each pair of junior years the list the curriculum shares between them", () => {
    for (const yearGroup of yearGroups) {
      const skill = skills.find(
        ({ id }) => id === spellingSkillByYear[yearGroup],
      );

      expect(skill?.subject).toBe("english");
      expect(skill?.strand).toBe("spelling");
      expect(skill?.yearGroup).toBe(
        yearGroup <= 2 ? yearGroup : yearGroup - ((yearGroup - 1) % 2),
      );
    }
  });
});
