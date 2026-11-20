import { describe, expect, it } from "vitest";
import { englishGames } from "./english-games.js";
import { geographyGames } from "./geography-games.js";
import { phonicsSounds } from "./phonics-sounds.js";
import { labGames } from "./lab-games.js";
import {
  parseSkills,
  skills,
  soundStrand,
  yearGroups,
  type PhonicsSkill,
} from "./skills.js";

const countingTo20 = {
  id: "maths.counting-to-20",
  name: "Counting to 20",
  subject: "maths",
  yearGroup: 1,
  strand: "number-and-place-value",
  prerequisites: [],
};

const numberBonds10 = {
  id: "maths.number-bonds-10",
  name: "Number bonds to 10",
  subject: "maths",
  yearGroup: 1,
  strand: "addition-and-subtraction",
  prerequisites: ["maths.counting-to-20"],
};

const soundAi = {
  id: "phonics.sound-ai",
  name: "The /ai/ sound, as in rain",
  subject: "phonics",
  yearGroup: 1,
  strand: "grapheme-phoneme-correspondences",
  prerequisites: [],
  sounds: ["ai"],
};

const labSkillIds = new Set(
  labGames.filter(({ isOwnSkill }) => isOwnSkill).map(({ skillId }) => skillId),
);

describe("skills", () => {
  it("holds ten music Skills for each Year Group from 1 to 6, and one more in Year 1 for its chants and rhymes", () => {
    const musicSkills = skills.filter(
      ({ subject, id }) => subject === "music" && !labSkillIds.has(id),
    );

    expect(musicSkills).toHaveLength(61);
    for (const yearGroup of yearGroups) {
      expect(
        musicSkills.filter((skill) => skill.yearGroup === yearGroup),
        `Year ${String(yearGroup)}`,
      ).toHaveLength(yearGroup === 1 ? 11 : 10);
    }
    expect(
      musicSkills.find(({ id }) => id === "music.chants-and-rhymes")?.name,
    ).toBe("Keeping the rhythm of chants and rhymes");
  });

  it("holds every Skill file in the curriculum, each one valid", () => {
    const englishGameSkillIds = Object.values(englishGames).flatMap(
      (gameYears) => Object.values(gameYears).map(({ skillId }) => skillId),
    );

    expect(
      skills.filter(
        ({ subject, id }) =>
          subject !== "phonics" &&
          subject !== "science" &&
          subject !== "music" &&
          subject !== "geography" &&
          subject !== "history" &&
          subject !== "computing" &&
          !englishGameSkillIds.includes(id) &&
          !labSkillIds.has(id),
      ),
    ).toEqual([
      {
        id: "maths.number-bonds-10",
        name: "Number bonds to 10",
        subject: "maths",
        yearGroup: 1,
        strand: "addition-and-subtraction",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-objects-to-20",
        name: "Counting objects to 20",
        subject: "maths",
        yearGroup: 1,
        strand: "number-and-place-value",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.one-more-one-less",
        name: "One more and one less",
        subject: "maths",
        yearGroup: 1,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-objects-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.name-3d-shapes",
        name: "Naming 3-D shapes",
        subject: "maths",
        yearGroup: 1,
        strand: "geometry-properties-of-shapes",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.capital-letters",
        name: "Matching capital letters to small letters",
        subject: "english",
        yearGroup: 1,
        strand: "spelling",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-subtract-facts-to-20",
        name: "Addition and subtraction facts to 20",
        subject: "maths",
        yearGroup: 2,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.number-bonds-10"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.times-tables-3-4-8",
        name: "The 3, 4 and 8 times tables",
        subject: "maths",
        yearGroup: 3,
        strand: "multiplication-and-division",
        prerequisites: ["maths.add-subtract-facts-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.times-tables-to-12",
        name: "Times tables up to 12 × 12",
        subject: "maths",
        yearGroup: 4,
        strand: "multiplication-and-division",
        prerequisites: ["maths.times-tables-3-4-8"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.multiply-divide-by-10-100-1000",
        name: "Multiplying and dividing by 10, 100 and 1,000",
        subject: "maths",
        yearGroup: 5,
        strand: "multiplication-and-division",
        prerequisites: ["maths.times-tables-to-12"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.order-of-operations",
        name: "Using the order of operations",
        subject: "maths",
        yearGroup: 6,
        strand: "addition-subtraction-multiplication-and-division",
        prerequisites: ["maths.multiply-divide-by-10-100-1000"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.fractions-of-shapes",
        name: "Halves, thirds and quarters of shapes",
        subject: "maths",
        yearGroup: 2,
        strand: "fractions",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.equivalent-fractions",
        name: "Equivalent fractions",
        subject: "maths",
        yearGroup: 3,
        strand: "fractions",
        prerequisites: ["maths.fractions-of-shapes"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.fractions-as-decimals",
        name: "Tenths and hundredths as decimals",
        subject: "maths",
        yearGroup: 4,
        strand: "fractions-including-decimals",
        prerequisites: ["maths.equivalent-fractions"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.fractions-decimals-percentages",
        name: "Fractions, decimals and percentages",
        subject: "maths",
        yearGroup: 5,
        strand: "fractions-including-decimals-and-percentages",
        prerequisites: ["maths.fractions-as-decimals"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.fractions-as-decimal-equivalents",
        name: "Decimal equivalents of fractions such as 3/8",
        subject: "maths",
        yearGroup: 6,
        strand: "fractions-including-decimals-and-percentages",
        prerequisites: ["maths.fractions-decimals-percentages"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.common-exception-words",
        name: "Spelling Year 1 common exception words",
        subject: "english",
        yearGroup: 1,
        strand: "spelling",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.more-common-exception-words",
        name: "Spelling Year 2 common exception words",
        subject: "english",
        yearGroup: 2,
        strand: "spelling",
        prerequisites: ["english.common-exception-words"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.word-list-lower-key-stage-2",
        name: "Spelling the Years 3 and 4 word list",
        subject: "english",
        yearGroup: 3,
        strand: "spelling",
        prerequisites: ["english.more-common-exception-words"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.word-list-upper-key-stage-2",
        name: "Spelling the Years 5 and 6 word list",
        subject: "english",
        yearGroup: 5,
        strand: "spelling",
        prerequisites: ["english.word-list-lower-key-stage-2"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-within-20",
        name: "Adding to 20",
        subject: "maths",
        yearGroup: 1,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.count-objects-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-within-20",
        name: "Taking away within 20",
        subject: "maths",
        yearGroup: 1,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.count-objects-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-in-steps",
        name: "Counting in twos, fives and tens",
        subject: "maths",
        yearGroup: 1,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-objects-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.compare-heights",
        name: "Comparing heights: tallest and shortest",
        subject: "maths",
        yearGroup: 1,
        strand: "measurement",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.halves-and-quarters",
        name: "Finding halves and quarters",
        subject: "maths",
        yearGroup: 1,
        strand: "fractions",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.tell-the-time",
        name: "Telling the time to the hour and half past",
        subject: "maths",
        yearGroup: 1,
        strand: "measurement",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.tens-and-ones",
        name: "Tens and ones to 100",
        subject: "maths",
        yearGroup: 2,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-objects-to-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.ten-more-ten-less",
        name: "Counting on and back in tens",
        subject: "maths",
        yearGroup: 2,
        strand: "number-and-place-value",
        prerequisites: ["maths.one-more-one-less"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.shape-properties",
        name: "Faces, edges and vertices of 3-D shapes",
        subject: "maths",
        yearGroup: 2,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.name-3d-shapes"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-two-digit",
        name: "Adding to a two-digit number",
        subject: "maths",
        yearGroup: 2,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.add-within-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-two-digit",
        name: "Taking away from a two-digit number",
        subject: "maths",
        yearGroup: 2,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.subtract-within-20"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-in-threes-and-tens",
        name: "Counting in threes, and in tens from any number",
        subject: "maths",
        yearGroup: 2,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-in-steps"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.measure-in-centimetres",
        name: "Measuring height in centimetres",
        subject: "maths",
        yearGroup: 2,
        strand: "measurement",
        prerequisites: ["maths.compare-heights"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.time-to-five-minutes",
        name: "Telling the time to five minutes",
        subject: "maths",
        yearGroup: 2,
        strand: "measurement",
        prerequisites: ["maths.tell-the-time"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.squares-cubes-and-powers-of-ten",
        name: "Square and cube numbers, and multiplying by 10, 100 and 1000",
        subject: "maths",
        yearGroup: 5,
        strand: "multiplication-and-division",
        prerequisites: ["maths.times-tables-to-12"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.hundreds-tens-and-ones",
        name: "Place value in three-digit numbers",
        subject: "maths",
        yearGroup: 3,
        strand: "number-and-place-value",
        prerequisites: ["maths.tens-and-ones"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.thousands-hundreds-tens-and-ones",
        name: "Place value in four-digit numbers",
        subject: "maths",
        yearGroup: 4,
        strand: "number-and-place-value",
        prerequisites: ["maths.hundreds-tens-and-ones"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.decimal-place-value",
        name: "Place value with tenths and hundredths",
        subject: "maths",
        yearGroup: 5,
        strand: "fractions-including-decimals",
        prerequisites: ["maths.thousands-hundreds-tens-and-ones"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.numbers-to-ten-million",
        name: "Reading numbers up to 10,000,000",
        subject: "maths",
        yearGroup: 6,
        strand: "number-and-place-value",
        prerequisites: ["maths.decimal-place-value"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.ten-or-hundred-more-or-less",
        name: "Finding 10 or 100 more or less",
        subject: "maths",
        yearGroup: 3,
        strand: "number-and-place-value",
        prerequisites: ["maths.ten-more-ten-less"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.thousand-more-or-less",
        name: "Finding 1000 more or less",
        subject: "maths",
        yearGroup: 4,
        strand: "number-and-place-value",
        prerequisites: ["maths.ten-or-hundred-more-or-less"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.powers-of-ten-more-or-less",
        name: "Counting on and back in powers of 10",
        subject: "maths",
        yearGroup: 5,
        strand: "number-and-place-value",
        prerequisites: ["maths.thousand-more-or-less"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.negative-numbers",
        name: "Calculating intervals across zero",
        subject: "maths",
        yearGroup: 6,
        strand: "number-and-place-value",
        prerequisites: ["maths.powers-of-ten-more-or-less"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.right-angles-and-sides",
        name: "Right angles and sides of 2-D shapes",
        subject: "maths",
        yearGroup: 3,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.shape-properties"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.classify-triangles-and-quadrilaterals",
        name: "Classifying triangles and quadrilaterals",
        subject: "maths",
        yearGroup: 4,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.right-angles-and-sides"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.regular-and-irregular-polygons",
        name: "Regular and irregular polygons",
        subject: "maths",
        yearGroup: 5,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.classify-triangles-and-quadrilaterals"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.nets-of-3d-shapes",
        name: "Nets of 3-D shapes",
        subject: "maths",
        yearGroup: 6,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.regular-and-irregular-polygons"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-three-digit",
        name: "Adding three-digit numbers",
        subject: "maths",
        yearGroup: 3,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.add-two-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-four-digit",
        name: "Adding four-digit numbers",
        subject: "maths",
        yearGroup: 4,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.add-three-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-decimals",
        name: "Adding decimals",
        subject: "maths",
        yearGroup: 5,
        strand: "fractions-including-decimals",
        prerequisites: ["maths.add-four-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-large-numbers",
        name: "Adding large numbers",
        subject: "maths",
        yearGroup: 6,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.add-decimals"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-three-digit",
        name: "Taking away three-digit numbers",
        subject: "maths",
        yearGroup: 3,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.subtract-two-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-four-digit",
        name: "Taking away four-digit numbers",
        subject: "maths",
        yearGroup: 4,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.subtract-three-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-decimals",
        name: "Taking away decimals",
        subject: "maths",
        yearGroup: 5,
        strand: "fractions-including-decimals",
        prerequisites: ["maths.subtract-four-digit"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.subtract-large-numbers",
        name: "Taking away large numbers",
        subject: "maths",
        yearGroup: 6,
        strand: "addition-and-subtraction",
        prerequisites: ["maths.subtract-decimals"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-in-fours-eights-and-fifties",
        name: "Counting in 4s, 8s and 50s",
        subject: "maths",
        yearGroup: 3,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-in-threes-and-tens"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-in-sixes-sevens-and-twenty-fives",
        name: "Counting in 6s, 7s and 25s, and back through zero",
        subject: "maths",
        yearGroup: 4,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-in-fours-eights-and-fifties"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.count-in-powers-of-ten-and-tenths",
        name: "Counting in powers of 10 and in tenths",
        subject: "maths",
        yearGroup: 5,
        strand: "number-and-place-value",
        prerequisites: ["maths.count-in-sixes-sevens-and-twenty-fives"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.linear-sequences",
        name: "Continuing linear number sequences",
        subject: "maths",
        yearGroup: 6,
        strand: "algebra",
        prerequisites: ["maths.count-in-powers-of-ten-and-tenths"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.measure-in-millimetres",
        name: "Measuring height in millimetres",
        subject: "maths",
        yearGroup: 3,
        strand: "measurement",
        prerequisites: ["maths.measure-in-centimetres"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.perimeter-of-rectangles",
        name: "Finding the perimeter of rectangles",
        subject: "maths",
        yearGroup: 4,
        strand: "measurement",
        prerequisites: ["maths.measure-in-millimetres"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.area-of-rectangles",
        name: "Finding the area of rectangles",
        subject: "maths",
        yearGroup: 5,
        strand: "measurement",
        prerequisites: ["maths.perimeter-of-rectangles"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.volume-of-cuboids",
        name: "Finding the volume of cuboids",
        subject: "maths",
        yearGroup: 6,
        strand: "measurement",
        prerequisites: ["maths.area-of-rectangles"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.unit-and-non-unit-fractions",
        name: "Unit and non-unit fractions",
        subject: "maths",
        yearGroup: 3,
        strand: "fractions",
        prerequisites: ["maths.fractions-of-shapes"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.families-of-equivalent-fractions",
        name: "Families of equivalent fractions",
        subject: "maths",
        yearGroup: 4,
        strand: "fractions",
        prerequisites: ["maths.equivalent-fractions"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.time-to-the-minute",
        name: "Telling the time to the minute, with Roman numerals",
        subject: "maths",
        yearGroup: 3,
        strand: "measurement",
        prerequisites: ["maths.time-to-five-minutes"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.twenty-four-hour-clock",
        name: "Converting to the 24-hour clock",
        subject: "maths",
        yearGroup: 4,
        strand: "measurement",
        prerequisites: ["maths.time-to-the-minute"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.later-times",
        name: "Working out a later time",
        subject: "maths",
        yearGroup: 5,
        strand: "measurement",
        prerequisites: ["maths.twenty-four-hour-clock"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.durations",
        name: "Working out how long until a time",
        subject: "maths",
        yearGroup: 6,
        strand: "measurement",
        prerequisites: ["maths.later-times"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.multiply-and-divide-with-objects",
        name: "Multiplying and dividing with groups and arrays",
        subject: "maths",
        yearGroup: 1,
        strand: "multiplication-and-division",
        prerequisites: ["maths.count-in-steps"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.times-tables-2-5-10",
        name: "The 2, 5 and 10 times tables and dividing",
        subject: "maths",
        yearGroup: 2,
        strand: "multiplication-and-division",
        prerequisites: ["maths.multiply-and-divide-with-objects"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.ratio-and-scale",
        name: "Ratio, proportion and scale",
        subject: "maths",
        yearGroup: 6,
        strand: "ratio-and-proportion",
        prerequisites: ["maths.times-tables-to-12"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.position-and-turns",
        name: "Position words and whole, half and quarter turns",
        subject: "maths",
        yearGroup: 1,
        strand: "geometry-position-and-direction",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.clockwise-turns",
        name: "Turning clockwise and anticlockwise in right angles",
        subject: "maths",
        yearGroup: 2,
        strand: "geometry-position-and-direction",
        prerequisites: ["maths.position-and-turns"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.coordinates-first-quadrant",
        name: "Plotting coordinates and translations on a grid",
        subject: "maths",
        yearGroup: 4,
        strand: "geometry-position-and-direction",
        prerequisites: ["maths.clockwise-turns"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.reflection-and-translation",
        name: "Reflecting and translating shapes",
        subject: "maths",
        yearGroup: 5,
        strand: "geometry-position-and-direction",
        prerequisites: ["maths.coordinates-first-quadrant"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.coordinates-four-quadrants",
        name: "Coordinates in all four quadrants",
        subject: "maths",
        yearGroup: 6,
        strand: "geometry-position-and-direction",
        prerequisites: [
          "maths.reflection-and-translation",
          "maths.negative-numbers",
        ],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.tally-charts-and-pictograms",
        name: "Reading tally charts, pictograms and block diagrams",
        subject: "maths",
        yearGroup: 2,
        strand: "statistics",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.bar-charts-and-tables",
        name: "Reading bar charts, pictograms and tables",
        subject: "maths",
        yearGroup: 3,
        strand: "statistics",
        prerequisites: ["maths.tally-charts-and-pictograms"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.line-graphs",
        name: "Reading bar charts and time graphs",
        subject: "maths",
        yearGroup: 4,
        strand: "statistics",
        prerequisites: ["maths.bar-charts-and-tables"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.tables-and-timetables",
        name: "Reading line graphs, tables and timetables",
        subject: "maths",
        yearGroup: 5,
        strand: "statistics",
        prerequisites: ["maths.line-graphs"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.pie-charts-and-mean",
        name: "Reading pie charts and finding the mean",
        subject: "maths",
        yearGroup: 6,
        strand: "statistics",
        prerequisites: ["maths.tables-and-timetables"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.multiply-large-numbers",
        name: "Short and long multiplication",
        subject: "maths",
        yearGroup: 6,
        strand: "multiplication-and-division",
        prerequisites: ["maths.times-tables-to-12"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.divide-large-numbers",
        name: "Short and long division",
        subject: "maths",
        yearGroup: 6,
        strand: "multiplication-and-division",
        prerequisites: ["maths.times-tables-to-12"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.add-subtract-fractions",
        name: "Adding and taking away fractions and mixed numbers",
        subject: "maths",
        yearGroup: 6,
        strand: "fractions-including-decimals-and-percentages",
        prerequisites: ["maths.families-of-equivalent-fractions"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.multiply-divide-fractions",
        name: "Multiplying fractions, and dividing them by whole numbers",
        subject: "maths",
        yearGroup: 6,
        strand: "fractions-including-decimals-and-percentages",
        prerequisites: ["maths.add-subtract-fractions"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.percentages-of-amounts",
        name: "Finding percentages of amounts",
        subject: "maths",
        yearGroup: 6,
        strand: "ratio-and-proportion",
        prerequisites: ["maths.fractions-decimals-percentages"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.simple-formulae",
        name: "Using simple formulae and missing numbers",
        subject: "maths",
        yearGroup: 6,
        strand: "algebra",
        prerequisites: ["maths.order-of-operations"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.mean-and-tables",
        name: "Reading tables and finding the mean",
        subject: "maths",
        yearGroup: 6,
        strand: "statistics",
        prerequisites: ["maths.add-large-numbers"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.missing-angles",
        name: "Finding missing angles",
        subject: "maths",
        yearGroup: 6,
        strand: "geometry-properties-of-shapes",
        prerequisites: ["maths.right-angles-and-sides"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "maths.convert-units",
        name: "Converting units of measure",
        subject: "maths",
        yearGroup: 6,
        strand: "measurement",
        prerequisites: ["maths.multiply-divide-by-10-100-1000"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.verb-tenses",
        name: "Choosing verb tenses, like the present perfect and past progressive",
        subject: "english",
        yearGroup: 3,
        strand: "grammar-and-punctuation",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.active-and-passive-voice",
        name: "The active and passive voice",
        subject: "english",
        yearGroup: 6,
        strand: "grammar-and-punctuation",
        prerequisites: ["english.subject-and-object"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.reading-retrieval",
        name: "Finding information in a text",
        subject: "english",
        yearGroup: 6,
        strand: "reading",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.reading-inference",
        name: "Working out what a text suggests",
        subject: "english",
        yearGroup: 6,
        strand: "reading",
        prerequisites: ["english.reading-retrieval"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.reading-vocabulary",
        name: "Explaining words in the context of a text",
        subject: "english",
        yearGroup: 6,
        strand: "reading",
        prerequisites: [],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
      {
        id: "english.reading-summarising-and-sequencing",
        name: "Summarising a text and putting its events in order",
        subject: "english",
        yearGroup: 6,
        strand: "reading",
        prerequisites: ["english.reading-retrieval"],
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
    ]);
  });

  it("holds one Phonics Skill for each of the 44 sounds, named after it", () => {
    const phonicsSkills = skills.filter(
      (skill): skill is PhonicsSkill =>
        skill.subject === "phonics" && skill.strand === soundStrand,
    );

    expect(phonicsSkills.map(({ sounds }) => sounds)).toEqual(
      phonicsSounds.map((sound) => [sound]),
    );
    expect(phonicsSkills.map(({ id }) => id)).toEqual(
      phonicsSounds.map((sound) => `phonics.sound-${sound}`),
    );
  });

  it("holds ten Computing Skills for each Year Group from 1 to 6", () => {
    const computingSkills = skills.filter(
      ({ subject, id }) => subject === "computing" && !labSkillIds.has(id),
    );

    expect(
      yearGroups.map(
        (yearGroup) =>
          computingSkills.filter((skill) => skill.yearGroup === yearGroup)
            .length,
      ),
    ).toEqual([10, 10, 10, 10, 10, 10]);
  });

  it("only asks for Computing Skills from the same or an earlier Year Group", () => {
    const yearGroupById = new Map(
      skills.map(({ id, yearGroup }) => [id, yearGroup]),
    );

    for (const { id, yearGroup, prerequisites } of skills) {
      for (const prerequisite of prerequisites) {
        expect(yearGroupById.get(prerequisite), id).toBeLessThanOrEqual(
          yearGroup,
        );
      }
    }
  });
});

describe("Science Skills", () => {
  it("holds one Science Skill for every Science game, in that game's Year Group", () => {
    expect(
      skills
        .filter(({ subject }) => subject === "science")
        .map(({ id, yearGroup }) => ({ id, yearGroup })),
    ).toEqual(
      labGames
        .filter(({ subject }) => subject === "science")
        .map(({ skillId, yearGroup }) => ({
          id: skillId,
          yearGroup,
        })),
    );
  });
});

describe("Geography Skills", () => {
  it("holds one Geography Skill for every geography game, in that game's Year Group and strand", () => {
    expect(
      skills
        .filter(
          ({ subject, id }) => subject === "geography" && !labSkillIds.has(id),
        )
        .map(({ id, yearGroup, strand }) => ({ id, yearGroup, strand })),
    ).toEqual(
      geographyGames.map(({ skillId, yearGroup, strand }) => ({
        id: skillId,
        yearGroup,
        strand,
      })),
    );
  });
});

describe("parseSkills", () => {
  it("gives a Skill that states no mastery rule the default of 80% on 3 separate days", () => {
    expect(parseSkills([countingTo20])).toEqual([
      {
        ...countingTo20,
        masteryRule: { percentCorrect: 80, separateDays: 3 },
      },
    ]);
  });

  it("keeps the mastery rule a Skill states", () => {
    const masteryRule = { percentCorrect: 90, separateDays: 2 };

    expect(parseSkills([{ ...countingTo20, masteryRule }])[0]).toEqual({
      ...countingTo20,
      masteryRule,
    });
  });

  it("keeps the sounds a Phonics Skill refers to", () => {
    expect(parseSkills([soundAi])).toEqual([
      { ...soundAi, masteryRule: { percentCorrect: 80, separateDays: 3 } },
    ]);
  });

  it("accepts a prerequisite whichever order the Skill files come in", () => {
    expect(
      parseSkills([numberBonds10, countingTo20]).map(({ id }) => id),
    ).toEqual(["maths.number-bonds-10", "maths.counting-to-20"]);
  });

  it("rejects two Skills with the same ID", () => {
    expect(() =>
      parseSkills([countingTo20, { ...countingTo20, yearGroup: 2 }]),
    ).toThrow('Two Skills have the ID "maths.counting-to-20"');
  });

  it("rejects a prerequisite that isn't a Skill", () => {
    expect(() => parseSkills([numberBonds10])).toThrow(
      'Skill "maths.number-bonds-10" needs "maths.counting-to-20", which isn\'t a Skill',
    );
  });

  it.each([
    "maths.y1.number-bonds-10",
    "maths.y1-number-bonds-10",
    "maths.number-bonds-10-y1",
    "maths.yr2-times-tables",
    "maths.year2-times-tables",
    "maths.year-2-times-tables",
    "maths.times-tables-year-4",
  ])('rejects "%s" because its ID contains a Year Group', (id) => {
    expect(() => parseSkills([{ ...countingTo20, id }])).toThrow(
      `Skill "${id}" has a Year Group in its ID`,
    );
  });

  it.each([
    "maths.number-bonds-10",
    "maths.days-of-the-year",
    "maths.year-and-month",
    "maths.y-axis",
  ])('accepts "%s", which contains no Year Group', (id) => {
    expect(parseSkills([{ ...countingTo20, id }])[0]?.id).toBe(id);
  });

  it.each([
    "maths",
    "Maths.number-bonds-10",
    "maths.number bonds 10",
    "maths.number_bonds_10",
    "maths.number-bonds-10.",
    "maths..number-bonds-10",
  ])('rejects "%s" as a Skill ID', (id) => {
    expect(() => parseSkills([{ ...countingTo20, id }])).toThrow(
      'needs an ID shaped like "maths.number-bonds-10"',
    );
  });

  it("rejects an ID that starts with a different Subject from the Skill's", () => {
    expect(() =>
      parseSkills([{ ...countingTo20, id: "phonics.counting-to-20" }]),
    ).toThrow('needs an ID that starts with its Subject, "maths."');
  });

  it.each([
    ["a Skill file that isn't an object", [], "A Skill file must be an object"],
    [
      "a field a Skill doesn't have",
      { ...countingTo20, year: 1 },
      'has a field "year" it doesn\'t know',
    ],
    [
      "a missing ID",
      { ...countingTo20, id: undefined },
      "A Skill must have an ID",
    ],
    [
      "a missing name",
      { ...countingTo20, name: undefined },
      'Skill "maths.counting-to-20" needs a name a Parent can read',
    ],
    [
      "a blank name",
      { ...countingTo20, name: "  " },
      'Skill "maths.counting-to-20" needs a name a Parent can read',
    ],
    [
      "an unknown Subject",
      { ...countingTo20, subject: "latin" },
      "needs a Subject, one of maths, phonics, english, science, music, geography, history, computing",
    ],
    [
      "a Year Group of 0",
      { ...countingTo20, yearGroup: 0 },
      "needs a Year Group from 1 to 6",
    ],
    [
      "a Year Group of 7",
      { ...countingTo20, yearGroup: 7 },
      "needs a Year Group from 1 to 6",
    ],
    [
      "a Year Group written as text",
      { ...countingTo20, yearGroup: "1" },
      "needs a Year Group from 1 to 6",
    ],
    [
      "a missing strand",
      { ...countingTo20, strand: undefined },
      "needs a strand",
    ],
    [
      "a strand that isn't kebab-case",
      { ...countingTo20, strand: "Number and place value" },
      "needs a strand",
    ],
    [
      "missing prerequisites",
      { ...countingTo20, prerequisites: undefined },
      "needs its prerequisites as a list of Skill IDs",
    ],
    [
      "a prerequisite that isn't an ID",
      { ...countingTo20, prerequisites: [1] },
      "needs its prerequisites as a list of Skill IDs",
    ],
    [
      "a mastery rule that isn't an object",
      { ...countingTo20, masteryRule: 80 },
      'The mastery rule of Skill "maths.counting-to-20" must be an object',
    ],
    [
      "a mastery rule with a field it doesn't have",
      {
        ...countingTo20,
        masteryRule: { percentCorrect: 80, separateDays: 3, hours: 1 },
      },
      'has a field "hours" it doesn\'t know',
    ],
    [
      "a mastery rule above 100%",
      {
        ...countingTo20,
        masteryRule: { percentCorrect: 101, separateDays: 3 },
      },
      "needs a mastery rule percentCorrect from 1 to 100",
    ],
    [
      "a mastery rule of 0%",
      { ...countingTo20, masteryRule: { percentCorrect: 0, separateDays: 3 } },
      "needs a mastery rule percentCorrect from 1 to 100",
    ],
    [
      "a mastery rule of no separate days",
      { ...countingTo20, masteryRule: { percentCorrect: 80, separateDays: 0 } },
      "needs a mastery rule of at least 1 separate day",
    ],
    [
      "a mastery rule of part of a day",
      {
        ...countingTo20,
        masteryRule: { percentCorrect: 80, separateDays: 1.5 },
      },
      "needs a mastery rule of at least 1 separate day",
    ],
    [
      "a Phonics Skill with no sounds",
      { ...soundAi, sounds: [] },
      'Phonics Skill "phonics.sound-ai" needs its sounds as a list',
    ],
    [
      "a Phonics Skill that leaves out its sounds",
      { ...soundAi, sounds: undefined },
      'Phonics Skill "phonics.sound-ai" needs its sounds as a list',
    ],
    [
      "a Phonics Skill with a sound that isn't one of the 44",
      { ...soundAi, sounds: ["ay"] },
      'Phonics Skill "phonics.sound-ai" needs its sounds as a list',
    ],
    [
      "a Phonics Skill that names a sound twice",
      { ...soundAi, sounds: ["ai", "ai"] },
      'lists the sound "ai" twice',
    ],
    [
      "sounds on a Skill that isn't Phonics",
      { ...countingTo20, sounds: ["s"] },
      'Skill "maths.counting-to-20" has sounds, which only a Phonics Skill has',
    ],
  ])("rejects %s", (_, skillFile, message) => {
    expect(() => parseSkills([skillFile])).toThrow(message);
  });
});
