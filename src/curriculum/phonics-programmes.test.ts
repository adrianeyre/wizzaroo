import { describe, expect, it } from "vitest";
import {
  orderPhonicsSkills,
  parsePhonicsProgrammes,
  phonicsProgrammes,
  type PhonicsProgramme,
} from "./phonics-programmes.js";
import { phonicsSounds } from "./phonics-sounds.js";
import { parseSkills, skills } from "./skills.js";

const shortVowels = {
  id: "short-vowels-first",
  name: "Short Vowels First",
  sources: ["A made-up programme for this test: https://example.com/order"],
  soundOrder: [
    {
      term: "Step 1",
      graphemes: [
        { grapheme: "a", sounds: ["a"] },
        { grapheme: "t", sounds: ["t"] },
      ],
    },
    {
      term: "Step 2",
      graphemes: [
        { grapheme: "oo", sounds: ["oo-long"] },
        { grapheme: "oo", sounds: ["oo-short"] },
        { grapheme: "x", sounds: ["k", "s"] },
      ],
    },
  ],
};

const [stepOne, stepTwo] = shortVowels.soundOrder;
const [graphemeA] = stepOne.graphemes;

const findProgramme = (id: string): PhonicsProgramme => {
  const phonicsProgramme = phonicsProgrammes.find(
    (programme) => programme.id === id,
  );
  if (phonicsProgramme === undefined) {
    throw new Error(`there is no Phonics Programme "${id}"`);
  }
  return phonicsProgramme;
};

const littleWandle = findProgramme("little-wandle");
const readWriteInc = findProgramme("read-write-inc");

const listOfferedSounds = (phonicsProgramme: PhonicsProgramme) =>
  orderPhonicsSkills(phonicsProgramme, skills).map(({ sounds }) =>
    sounds.join("+"),
  );

const listOfferedSkillIds = (phonicsProgramme: PhonicsProgramme) =>
  orderPhonicsSkills(phonicsProgramme, skills).map(({ id }) => id);

const buildPhonicsSkillFile = (id: string, sounds: string[]) => ({
  id,
  name: `The sounds ${sounds.join(" and ")}`,
  subject: "phonics",
  yearGroup: 1,
  strand: "grapheme-phoneme-correspondences",
  prerequisites: [],
  sounds,
});

describe("phonicsSounds", () => {
  it("names each of the 44 sounds once", () => {
    expect(new Set(phonicsSounds).size).toBe(44);
    expect(phonicsSounds).toHaveLength(44);
  });
});

describe("phonicsProgrammes", () => {
  it("holds Little Wandle and Read Write Inc first, then the rest A to Z, each valid and each citing where its sound order comes from", () => {
    expect(phonicsProgrammes.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "little-wandle", name: "Little Wandle Letters and Sounds Revised" },
      { id: "read-write-inc", name: "Read Write Inc. Phonics" },
      {
        id: "essential-letters-and-sounds",
        name: "Essential Letters and Sounds",
      },
      { id: "jolly-phonics", name: "Jolly Phonics" },
      { id: "sounds-write", name: "Sounds-Write" },
      { id: "twinkl-phonics", name: "Twinkl Phonics" },
    ]);
    for (const { sources } of phonicsProgrammes) {
      expect(sources.length).toBeGreaterThan(0);
    }
  });

  it("uses each programme's own terms for its stages", () => {
    expect(littleWandle.soundOrder.map(({ term }) => term)).toEqual([
      "Phase 2",
      "Phase 3",
      "Phase 5",
    ]);
    expect(readWriteInc.soundOrder.map(({ term }) => term)).toEqual([
      "Set 1",
      "Set 2",
      "Set 3",
    ]);
  });

  it("writes each sound with the grapheme the programme teaches for it", () => {
    const findFirstGrapheme = (phonicsProgramme: PhonicsProgramme) =>
      phonicsProgramme.soundOrder
        .flatMap(({ graphemes }) => graphemes)
        .find(({ sounds }) => sounds.join() === "ai")?.grapheme;

    expect(findFirstGrapheme(littleWandle)).toBe("ai");
    expect(findFirstGrapheme(readWriteInc)).toBe("ay");
  });
});

describe("orderPhonicsSkills", () => {
  it("offers phonics in the order of the Child's Phonics Programme", () => {
    expect(listOfferedSounds(littleWandle).slice(0, 8)).toEqual([
      "s",
      "a",
      "t",
      "p",
      "i",
      "n",
      "m",
      "d",
    ]);
    expect(listOfferedSounds(readWriteInc).slice(0, 8)).toEqual([
      "m",
      "a",
      "s",
      "d",
      "t",
      "i",
      "n",
      "p",
    ]);
  });

  it("changes the order phonics is offered in when a Child changes programme, keeping every sound Skill by the same ID so their Mastery carries over", () => {
    const offeredUnderLittleWandle = listOfferedSkillIds(littleWandle);
    const offeredUnderReadWriteInc = listOfferedSkillIds(readWriteInc);
    const everyPhonicsSkillId = skills
      .filter((skill) => skill.subject === "phonics" && skill.sounds.length > 0)
      .map(({ id }) => id)
      .toSorted();

    expect(offeredUnderReadWriteInc).not.toEqual(offeredUnderLittleWandle);
    expect(offeredUnderLittleWandle.toSorted()).toEqual(everyPhonicsSkillId);
    expect(offeredUnderReadWriteInc.toSorted()).toEqual(everyPhonicsSkillId);
  });

  it("offers a sound once its programme first teaches a grapheme for it", () => {
    expect(listOfferedSounds(readWriteInc).indexOf("oa")).toBeLessThan(
      listOfferedSounds(readWriteInc).indexOf("ow"),
    );
    expect(listOfferedSounds(littleWandle).indexOf("ow")).toBeLessThan(
      listOfferedSounds(littleWandle).indexOf("schwa"),
    );
  });

  it("offers a Phonics Skill once the programme has taught every one of its sounds", () => {
    const [programme] = parsePhonicsProgrammes([shortVowels]);
    const phonicsSkills = parseSkills([
      buildPhonicsSkillFile("phonics.blend-at", ["a", "t"]),
      buildPhonicsSkillFile("phonics.sound-oo-short", ["oo-short"]),
      buildPhonicsSkillFile("phonics.sound-a", ["a"]),
    ]);

    expect(
      orderPhonicsSkills(programme, phonicsSkills).map(({ id }) => id),
    ).toEqual([
      "phonics.sound-a",
      "phonics.blend-at",
      "phonics.sound-oo-short",
    ]);
  });

  it("offers the Phonics Skills a programme never teaches last, in the order of the Skill files", () => {
    expect(listOfferedSounds(littleWandle).at(-1)).toBe("ure");
    expect(listOfferedSounds(readWriteInc).at(-1)).toBe("zh");

    const [programme] = parsePhonicsProgrammes([shortVowels]);
    const phonicsSkills = parseSkills([
      buildPhonicsSkillFile("phonics.sound-zh", ["zh"]),
      buildPhonicsSkillFile("phonics.sound-ure", ["ure"]),
      buildPhonicsSkillFile("phonics.sound-t", ["t"]),
    ]);

    expect(
      orderPhonicsSkills(programme, phonicsSkills).map(({ id }) => id),
    ).toEqual(["phonics.sound-t", "phonics.sound-zh", "phonics.sound-ure"]);
  });

  it("offers no Skill that isn't Phonics", () => {
    expect(listOfferedSkillIds(littleWandle)).not.toContain(
      "maths.number-bonds-10",
    );
  });

  it("leaves out the Phonics game Skills, which practise words rather than one sound", () => {
    expect(listOfferedSkillIds(littleWandle)).not.toContain(
      "phonics.blend-sounds-into-words",
    );
  });
});

describe("parsePhonicsProgrammes", () => {
  it("keeps a programme's ID, name, sources and sound order, with the same grapheme taught for different sounds", () => {
    expect(parsePhonicsProgrammes([shortVowels])).toEqual([shortVowels]);
  });

  it("rejects two programmes with the same ID", () => {
    expect(() =>
      parsePhonicsProgrammes([
        shortVowels,
        { ...shortVowels, name: "Another" },
      ]),
    ).toThrow('Two Phonics Programmes have the ID "short-vowels-first"');
  });

  it.each([
    [
      "a Phonics Programme file that isn't an object",
      "Read Write Inc",
      "A Phonics Programme file must be an object",
    ],
    [
      "a field a Phonics Programme doesn't have",
      { ...shortVowels, mascot: "A made-up mascot" },
      'has a field "mascot" it doesn\'t know',
    ],
    [
      "a rhyme beside a grapheme",
      {
        ...shortVowels,
        soundOrder: [
          {
            ...stepOne,
            graphemes: [{ ...graphemeA, rhyme: "A made-up rhyme" }],
          },
        ],
      },
      'A grapheme in Step 1 of Phonics Programme "short-vowels-first" has a field "rhyme" it doesn\'t know',
    ],
    [
      "a picture beside a stage",
      {
        ...shortVowels,
        soundOrder: [{ ...stepOne, picture: "a-made-up-picture.png" }],
      },
      'has a field "picture" it doesn\'t know',
    ],
    [
      "an ID that isn't kebab-case",
      { ...shortVowels, id: "Short Vowels" },
      'needs an ID shaped like "little-wandle"',
    ],
    [
      "a missing name",
      { ...shortVowels, name: " " },
      'Phonics Programme "short-vowels-first" needs a name',
    ],
    [
      "no sources",
      { ...shortVowels, sources: [] },
      "needs the sources of its sound order, each with an https:// link",
    ],
    [
      "a source with no link",
      { ...shortVowels, sources: ["A book on a shelf"] },
      "needs the sources of its sound order, each with an https:// link",
    ],
    [
      "no sound order",
      { ...shortVowels, soundOrder: [] },
      "needs its sound order, as a list of stages",
    ],
    [
      "a stage without a term",
      { ...shortVowels, soundOrder: [{ ...stepOne, term: "" }] },
      "needs the term the programme uses for it",
    ],
    [
      "a stage that teaches nothing",
      { ...shortVowels, soundOrder: [{ ...stepOne, graphemes: [] }] },
      'Step 1 of Phonics Programme "short-vowels-first" needs the graphemes it teaches',
    ],
    [
      "a grapheme in capitals",
      {
        ...shortVowels,
        soundOrder: [
          { ...stepOne, graphemes: [{ grapheme: "AI", sounds: ["ai"] }] },
        ],
      },
      'must be written in lower-case letters, like "igh" or "a-e"',
    ],
    [
      "a split digraph written with an underscore",
      {
        ...shortVowels,
        soundOrder: [
          { ...stepOne, graphemes: [{ grapheme: "a_e", sounds: ["ai"] }] },
        ],
      },
      'must be written in lower-case letters, like "igh" or "a-e"',
    ],
    [
      "a grapheme for no sound",
      {
        ...shortVowels,
        soundOrder: [
          { ...stepOne, graphemes: [{ grapheme: "a", sounds: [] }] },
        ],
      },
      'The grapheme "a" in Phonics Programme "short-vowels-first" needs the sounds it stands for',
    ],
    [
      "a grapheme for a sound that isn't one of the 44",
      {
        ...shortVowels,
        soundOrder: [
          { ...stepOne, graphemes: [{ grapheme: "ay", sounds: ["ay"] }] },
        ],
      },
      "needs the sounds it stands for, from the 44 Phonics sounds",
    ],
    [
      "the same grapheme taught twice for the same sound",
      {
        ...shortVowels,
        soundOrder: [stepOne, { ...stepTwo, graphemes: [graphemeA] }],
      },
      'Phonics Programme "short-vowels-first" teaches "a" for a twice',
    ],
  ])("rejects %s", (_, phonicsProgrammeFile, message) => {
    expect(() => parsePhonicsProgrammes([phonicsProgrammeFile])).toThrow(
      message,
    );
  });
});
