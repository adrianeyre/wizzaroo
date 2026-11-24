import type { CurriculumPoint } from "./curriculum-points.js";
import type { Subject, YearGroup } from "./skills.js";

/**
 * Where a Curriculum Point sits in the National Curriculum in England's own
 * documents, so a Parent can find the very words it comes from: the
 * programme of study's title, the part of it for the Child's Year or Key
 * Stage, and the statutory heading the point falls under.
 */
export interface CurriculumPointLocation {
  /** The title gov.uk gives the programme of study, such as "Mathematics programmes of study: key stages 1 and 2". */
  programmeOfStudy: string;
  keyStage: string;
  /** The part of the programme of study, such as "Year 2 programme of study". */
  programmePart: string;
  /** The statutory heading the point falls under, as the programme of study words it. */
  statutoryHeading: string;
}

const programmeOfStudyTitles: Record<Subject, string> = {
  maths: "Mathematics programmes of study: key stages 1 and 2",
  phonics: "English programmes of study: key stages 1 and 2",
  english: "English programmes of study: key stages 1 and 2",
  science: "Science programmes of study: key stages 1 and 2",
  music: "Music programmes of study: key stages 1 and 2",
  geography: "Geography programmes of study: key stages 1 and 2",
  history: "History programmes of study: key stages 1 and 2",
  computing: "Computing programmes of study: key stages 1 and 2",
  art: "Art and design programmes of study: key stages 1 and 2",
  design: "Design and technology programmes of study: key stages 1 and 2",
  languages: "Languages programmes of study: key stage 2",
};

export const keyStageNames: Record<YearGroup, string> = {
  1: "Key Stage 1",
  2: "Key Stage 1",
  3: "Key Stage 2",
  4: "Key Stage 2",
  5: "Key Stage 2",
  6: "Key Stage 2",
};

// English groups Years 3 and 4, and Years 5 and 6, into one programme each.
const englishProgrammeParts: Record<YearGroup, string> = {
  1: "Year 1 programme of study",
  2: "Year 2 programme of study",
  3: "Lower key stage 2: Years 3 and 4 programme of study",
  4: "Lower key stage 2: Years 3 and 4 programme of study",
  5: "Upper key stage 2: Years 5 and 6 programme of study",
  6: "Upper key stage 2: Years 5 and 6 programme of study",
};

const wordReading = "Reading: word reading";
const transcriptionSpelling = "Writing: transcription (spelling)";

// Phonics is taught through English's word reading and spelling, so each
// point is named by the English heading it comes under.
const phonicsHeadings: Partial<Record<string, string>> = {
  "grapheme-phoneme-correspondences": wordReading,
  blending: wordReading,
  "common-exception-words": wordReading,
  "word-endings": wordReading,
  "alternative-spellings": wordReading,
  suffixes: transcriptionSpelling,
  contractions: transcriptionSpelling,
  homophones: transcriptionSpelling,
};

const englishHeadings: Partial<Record<string, string>> = {
  "letter-names": transcriptionSpelling,
  spelling: transcriptionSpelling,
  "word-reading": wordReading,
  "reading-comprehension": "Reading: comprehension",
  "writing-composition": "Writing: composition",
  "vocabulary-grammar-and-punctuation":
    "Writing: vocabulary, grammar and punctuation",
};

const mathsNumberPointIds = new Set([
  "number-and-place-value",
  "addition-and-subtraction",
  "multiplication-and-division",
  "four-operations",
  "fractions",
]);

const findMathsHeading = ({ id, heading }: CurriculumPoint): string => {
  if (mathsNumberPointIds.has(id)) {
    return `Number: ${heading.charAt(0).toLowerCase()}${heading.slice(1)}`;
  }
  return heading;
};

const findStatutoryHeading = (point: CurriculumPoint): string => {
  switch (point.subject) {
    case "phonics":
      return phonicsHeadings[point.id] ?? wordReading;
    case "english":
      return englishHeadings[point.id] ?? point.heading;
    case "maths":
      return findMathsHeading(point);
    default:
      return point.heading;
  }
};

const findProgrammePart = ({
  subject,
  programme,
  yearGroup,
}: CurriculumPoint): string => {
  if (programme === "key-stage") {
    return `${keyStageNames[yearGroup]} programme of study (subject content), taught here in Year ${String(yearGroup)}`;
  }
  return subject === "english" || subject === "phonics"
    ? englishProgrammeParts[yearGroup]
    : `Year ${String(yearGroup)} programme of study`;
};

export const findCurriculumPointLocation = (
  point: CurriculumPoint,
): CurriculumPointLocation => ({
  programmeOfStudy: programmeOfStudyTitles[point.subject],
  keyStage: keyStageNames[point.yearGroup],
  programmePart: findProgrammePart(point),
  statutoryHeading: findStatutoryHeading(point),
});
