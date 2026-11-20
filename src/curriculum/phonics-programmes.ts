import {
  findRepeat,
  InvalidCurriculumFileError,
  isNonEmptyList,
  kebabCaseShape,
  readFields,
} from "./curriculum-file.js";
import essentialLettersAndSounds from "./essential-letters-and-sounds.phonics-programme.json" with { type: "json" };
import jollyPhonics from "./jolly-phonics.phonics-programme.json" with { type: "json" };
import littleWandle from "./little-wandle.phonics-programme.json" with { type: "json" };
import { isPhonicsSound, type PhonicsSound } from "./phonics-sounds.js";
import readWriteInc from "./read-write-inc.phonics-programme.json" with { type: "json" };
import soundsWrite from "./sounds-write.phonics-programme.json" with { type: "json" };
import twinklPhonics from "./twinkl-phonics.phonics-programme.json" with { type: "json" };
import type { PhonicsSkill, Skill } from "./skills.js";

export interface PhonicsGrapheme {
  grapheme: string;
  sounds: PhonicsSound[];
}

export interface PhonicsStage {
  term: string;
  graphemes: PhonicsGrapheme[];
}

export interface PhonicsProgramme {
  id: string;
  name: string;
  sources: string[];
  soundOrder: PhonicsStage[];
}

const phonicsProgrammeFields = ["id", "name", "sources", "soundOrder"];
const phonicsStageFields = ["term", "graphemes"];
const phonicsGraphemeFields = ["grapheme", "sounds"];

const graphemeShape = /^[a-z]+(?:-[a-z]+)?$/;
const citedLink = /https:\/\/\S+/;

const isWrittenText = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

const isCitedSource = (value: unknown): value is string =>
  typeof value === "string" && citedLink.test(value);

const parsePhonicsGrapheme = (
  phonicsGraphemeEntry: unknown,
  stageTerm: string,
  programmeId: string,
): PhonicsGrapheme => {
  const describedAs = `A grapheme in ${stageTerm} of Phonics Programme "${programmeId}"`;
  const fields = readFields(
    phonicsGraphemeEntry,
    phonicsGraphemeFields,
    describedAs,
  );
  const grapheme = fields.get("grapheme");
  const sounds = fields.get("sounds");

  if (typeof grapheme !== "string" || !graphemeShape.test(grapheme)) {
    throw new InvalidCurriculumFileError(
      `${describedAs} must be written in lower-case letters, like "igh" or "a-e"`,
    );
  }
  if (!isNonEmptyList(sounds) || !sounds.every(isPhonicsSound)) {
    throw new InvalidCurriculumFileError(
      `The grapheme "${grapheme}" in Phonics Programme "${programmeId}" needs the sounds it stands for, from the 44 Phonics sounds`,
    );
  }
  return { grapheme, sounds };
};

const parsePhonicsStage = (
  phonicsStage: unknown,
  programmeId: string,
): PhonicsStage => {
  const fields = readFields(
    phonicsStage,
    phonicsStageFields,
    `A stage of Phonics Programme "${programmeId}"`,
  );
  const term = fields.get("term");
  const graphemes = fields.get("graphemes");

  if (!isWrittenText(term)) {
    throw new InvalidCurriculumFileError(
      `Every stage of Phonics Programme "${programmeId}" needs the term the programme uses for it, like "Phase 2"`,
    );
  }
  if (!isNonEmptyList(graphemes)) {
    throw new InvalidCurriculumFileError(
      `${term} of Phonics Programme "${programmeId}" needs the graphemes it teaches, in order`,
    );
  }
  return {
    term,
    graphemes: graphemes.map((phonicsGrapheme) =>
      parsePhonicsGrapheme(phonicsGrapheme, term, programmeId),
    ),
  };
};

const describePhonicsGrapheme = ({ grapheme, sounds }: PhonicsGrapheme) =>
  `"${grapheme}" for ${sounds.join(" + ")}`;

const parsePhonicsProgramme = (
  phonicsProgrammeFile: unknown,
): PhonicsProgramme => {
  const fields = readFields(
    phonicsProgrammeFile,
    phonicsProgrammeFields,
    "A Phonics Programme file",
  );
  const id = fields.get("id");
  const name = fields.get("name");
  const sources = fields.get("sources");
  const soundOrder = fields.get("soundOrder");

  if (typeof id !== "string" || !kebabCaseShape.test(id)) {
    throw new InvalidCurriculumFileError(
      'A Phonics Programme needs an ID shaped like "little-wandle"',
    );
  }
  if (!isWrittenText(name)) {
    throw new InvalidCurriculumFileError(
      `Phonics Programme "${id}" needs a name`,
    );
  }
  if (!isNonEmptyList(sources) || !sources.every(isCitedSource)) {
    throw new InvalidCurriculumFileError(
      `Phonics Programme "${id}" needs the sources of its sound order, each with an https:// link`,
    );
  }
  if (!isNonEmptyList(soundOrder)) {
    throw new InvalidCurriculumFileError(
      `Phonics Programme "${id}" needs its sound order, as a list of stages`,
    );
  }

  const stages = soundOrder.map((phonicsStage) =>
    parsePhonicsStage(phonicsStage, id),
  );
  const repeatedGrapheme = findRepeat(
    stages.flatMap(({ graphemes }) => graphemes).map(describePhonicsGrapheme),
  );
  if (repeatedGrapheme !== undefined) {
    throw new InvalidCurriculumFileError(
      `Phonics Programme "${id}" teaches ${repeatedGrapheme} twice`,
    );
  }
  return { id, name, sources, soundOrder: stages };
};

export const parsePhonicsProgrammes = (
  phonicsProgrammeFiles: readonly unknown[],
): PhonicsProgramme[] => {
  const programmes = phonicsProgrammeFiles.map(parsePhonicsProgramme);
  const repeatedId = findRepeat(programmes.map(({ id }) => id));
  if (repeatedId !== undefined) {
    throw new InvalidCurriculumFileError(
      `Two Phonics Programmes have the ID "${repeatedId}"`,
    );
  }
  return programmes;
};

export const phonicsProgrammes = parsePhonicsProgrammes([
  littleWandle,
  readWriteInc,
  essentialLettersAndSounds,
  jollyPhonics,
  soundsWrite,
  twinklPhonics,
]);

export const phonicsProgrammeIds = phonicsProgrammes.map(({ id }) => id);

const findFirstTaughtPositions = ({
  soundOrder,
}: PhonicsProgramme): Map<PhonicsSound, number> => {
  const firstTaughtPositions = new Map<PhonicsSound, number>();
  const graphemesInOrder = soundOrder.flatMap(({ graphemes }) => graphemes);

  graphemesInOrder.forEach(({ sounds }, position) => {
    for (const sound of sounds) {
      if (!firstTaughtPositions.has(sound)) {
        firstTaughtPositions.set(sound, position);
      }
    }
  });
  return firstTaughtPositions;
};

export const orderPhonicsSkills = (
  phonicsProgramme: PhonicsProgramme,
  skills: readonly Skill[],
): PhonicsSkill[] => {
  const firstTaughtPositions = findFirstTaughtPositions(phonicsProgramme);
  const findWhenTaught = ({ sounds }: PhonicsSkill) =>
    Math.max(
      ...sounds.map(
        (sound) => firstTaughtPositions.get(sound) ?? Number.POSITIVE_INFINITY,
      ),
    );

  return skills
    .filter(
      (skill): skill is PhonicsSkill =>
        skill.subject === "phonics" && skill.sounds.length > 0,
    )
    .toSorted(
      (first, second) => findWhenTaught(first) - findWhenTaught(second),
    );
};
