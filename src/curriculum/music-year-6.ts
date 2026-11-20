import {
  defineMusicGame,
  findChoiceCountFor,
  pickChoices,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type MusicDifficulty,
} from "./music-game.js";
import type {
  Articulation,
  ChoiceArt,
  Clef,
  NotationFace,
  PictureIcon,
  StaffChord,
  TimeSignature,
} from "./music-prompts.js";
import {
  buildChord,
  buildClip,
  buildMelody,
  buildMelodyOf,
  buildNote,
  buildRest,
  buildRhythmNotes,
  buildVoice,
  countRhythmBeats,
  findPitchOf,
  legatoLength,
  loudnessLevels,
  majorScaleSteps,
  majorTriadSteps,
  minorScaleSteps,
  normalLength,
  staccatoLength,
  buildScale,
  type Instrument,
  type MusicClip,
  type MusicNote,
  type MusicVoice,
} from "./music-theory.js";
import {
  buildTune,
  type ComposerTheme,
  composerThemes,
  takeBeats,
  traditionalTuneNames,
  traditionalTunes,
} from "./music-tunes.js";

const semitonesPerOctave = 12;

const findScalePitch = (
  tonic: number,
  steps: readonly number[],
  degree: number,
): number => {
  const octave = Math.floor(degree / steps.length);
  return (
    tonic + octave * semitonesPerOctave + steps[degree - octave * steps.length]
  );
};

type TimedDegree = readonly [degree: number, beats: number];

const buildDegreeNotes = (
  tonic: number,
  steps: readonly number[],
  degrees: readonly TimedDegree[],
  loudness: number,
  length: number,
): MusicNote[] =>
  degrees.map(([degree, beats]) =>
    buildNote([findScalePitch(tonic, steps, degree)], beats, {
      loudness,
      length,
    }),
  );

const describeAccidentals = (name: string): string =>
  name.replaceAll("♭", " flat").replaceAll("♯", " sharp");

const buildWordCard = (lines: string[]): ChoiceArt => ({
  kind: "card",
  face: { kind: "word", lines },
});

interface BaroqueKey {
  tonic: number;
  steps: readonly number[];
}

const baroqueKeys: readonly BaroqueKey[] = [
  { tonic: 60, steps: majorScaleSteps },
  { tonic: 62, steps: majorScaleSteps },
  { tonic: 65, steps: majorScaleSteps },
  { tonic: 57, steps: minorScaleSteps },
  { tonic: 62, steps: minorScaleSteps },
];

const baroqueFigures = [
  [0, 2, 1, 2],
  [0, -1, 0, 2],
  [0, 2, 4, 2],
  [0, 1, 2, 0],
] as const;

const sequenceBeats = 8;

const buildBaroquePastiche = (random: () => number): MusicClip => {
  const { tonic, steps } = pickOne(baroqueKeys, random);
  const figure = pickOne(baroqueFigures, random);
  const sequenceStarts = Array.from(
    { length: sequenceBeats },
    (_, beat) => 9 - beat,
  );
  const trill = Array.from({ length: 8 }, (_, index): TimedDegree => [
    index % 2 === 0 ? 9 : 8,
    0.125,
  ]);
  const melody: TimedDegree[] = [
    ...sequenceStarts.flatMap((start) =>
      figure.map((step): TimedDegree => [start + step, 0.25]),
    ),
    [9, 1],
    ...trill,
    [7, 2],
  ];
  const bass: TimedDegree[] = [
    ...sequenceStarts.flatMap((start): TimedDegree[] => [
      [start - 16, 0.5],
      [start - 9, 0.5],
    ]),
    [-3, 0.5],
    [-10, 0.5],
    [-3, 0.5],
    [-10, 0.5],
    [-7, 2],
  ];
  return buildClip({ tempo: 96 }, [
    buildVoice(
      "harpsichord",
      buildDegreeNotes(tonic, steps, melody, loudnessLevels.forte, 0.9),
    ),
    buildVoice(
      "harpsichord",
      buildDegreeNotes(tonic, steps, bass, loudnessLevels.mezzo, 0.8),
    ),
  ]);
};

interface ClassicalTune {
  chordRoots: readonly number[];
  melody: readonly TimedDegree[];
}

const classicalTunes: readonly ClassicalTune[] = [
  {
    chordRoots: [0, -3, -3, 0],
    melody: [
      [0, 1],
      [2, 1],
      [4, 1],
      [7, 1],
      [6, 1.5],
      [4, 0.5],
      [1, 2],
      [4, 1],
      [6, 1],
      [8, 1],
      [6, 1],
      [9, 1],
      [8, 1],
      [7, 2],
    ],
  },
  {
    chordRoots: [0, -4, -3, 0],
    melody: [
      [7, 1.5],
      [4, 0.5],
      [2, 1],
      [4, 1],
      [5, 1.5],
      [3, 0.5],
      [7, 2],
      [6, 1],
      [8, 1],
      [4, 1],
      [6, 1],
      [9, 0.5],
      [8, 0.5],
      [7, 1],
      [7, 2],
    ],
  },
  {
    chordRoots: [0, 0, -3, 0],
    melody: [
      [2, 0.5],
      [4, 0.5],
      [7, 1],
      [7, 1],
      [9, 1],
      [9, 1],
      [7, 1],
      [4, 2],
      [1, 1],
      [4, 1],
      [6, 1],
      [8, 1],
      [7, 1],
      [4, 1],
      [7, 2],
    ],
  },
];

const classicalTonics = [72, 67, 74] as const;

const buildAlbertiBar = (root: number): TimedDegree[] =>
  [0, 1].flatMap(() =>
    [root, root + 4, root + 2, root + 4].map((degree): TimedDegree => [
      degree,
      0.5,
    ]),
  );

const buildClassicalPastiche = (random: () => number): MusicClip => {
  const { chordRoots, melody } = pickOne(classicalTunes, random);
  const tonic = pickOne(classicalTonics, random);
  return buildClip({ tempo: 120 }, [
    buildVoice(
      "piano",
      buildDegreeNotes(
        tonic,
        majorScaleSteps,
        melody,
        loudnessLevels.forte,
        normalLength,
      ),
    ),
    buildVoice(
      "piano",
      buildDegreeNotes(
        tonic - 2 * semitonesPerOctave,
        majorScaleSteps,
        chordRoots.flatMap(buildAlbertiBar),
        loudnessLevels.piano,
        normalLength,
      ),
    ),
  ]);
};

interface RomanticChord {
  bass: number;
  upper: readonly number[];
}

interface RomanticPhrase {
  tonics: readonly number[];
  chords: readonly RomanticChord[];
  melody: readonly TimedDegree[];
}

const romanticPhrases: readonly RomanticPhrase[] = [
  {
    tonics: [60, 62, 58],
    chords: [
      { bass: -12, upper: [0, 4, 7, 11] },
      { bass: -15, upper: [0, 4, 7, 9] },
      { bass: -10, upper: [2, 5, 9, 12] },
      { bass: -17, upper: [2, 5, 7, 11] },
      { bass: -12, upper: [0, 4, 7, 12] },
    ],
    melody: [
      [7, 1],
      [16, 1],
      [17, 1.5],
      [16, 0.5],
      [14, 1],
      [17, 1],
      [16, 1.5],
      [14, 0.5],
      [12, 2],
    ],
  },
  {
    tonics: [57, 60, 62],
    chords: [
      { bass: -12, upper: [0, 3, 7] },
      { bass: -16, upper: [0, 3, 8] },
      { bass: -19, upper: [0, 5, 8] },
      { bass: -17, upper: [-1, 2, 5, 7] },
      { bass: -12, upper: [0, 3, 7, 12] },
    ],
    melody: [
      [7, 1],
      [15, 1],
      [20, 1],
      [19, 1],
      [17, 1.5],
      [15, 0.5],
      [14, 1],
      [11, 1],
      [12, 2],
    ],
  },
  {
    tonics: [60, 58, 63],
    chords: [
      { bass: -12, upper: [0, 4, 7, 14] },
      { bass: -19, upper: [4, 5, 9, 12] },
      { bass: -10, upper: [2, 5, 9, 12] },
      { bass: -17, upper: [2, 5, 7, 11] },
      { bass: -12, upper: [0, 4, 7, 12] },
    ],
    melody: [
      [16, 1],
      [19, 1],
      [21, 1.5],
      [16, 0.5],
      [17, 1],
      [14, 1],
      [19, 1],
      [17, 1],
      [16, 2],
    ],
  },
];

const romanticChordBeats = 2;

const buildRomanticPastiche = (random: () => number): MusicClip => {
  const { tonics, chords, melody } = pickOne(romanticPhrases, random);
  const tonic = pickOne(tonics, random);
  const smooth = { length: legatoLength };
  return buildClip({ tempo: 72, finalTempo: 58, swell: { from: 0.4, to: 1 } }, [
    buildVoice(
      "violin",
      melody.map(([offset, beats]) =>
        buildNote([tonic + offset], beats, {
          ...smooth,
          loudness: loudnessLevels.forte,
        }),
      ),
    ),
    buildVoice(
      "strings",
      chords.map(({ upper }) =>
        buildNote(
          upper.map((offset) => tonic + offset),
          romanticChordBeats,
          { ...smooth, loudness: loudnessLevels.piano },
        ),
      ),
    ),
    buildVoice(
      "cello",
      chords.map(({ bass }) =>
        buildNote([tonic + bass], romanticChordBeats, {
          ...smooth,
          loudness: loudnessLevels.mezzo,
        }),
      ),
    ),
  ]);
};

const minimalistPatterns = [
  [0, 4, 7, 4, 11, 7],
  [0, 7, 2, 9, 4, 7],
  [12, 7, 4, 7, 2, 7],
  [0, 2, 7, 9, 7, 2],
] as const;

const minimalistSwaps = [0, 2, 4, 7, 9, 11, 12, 14] as const;
const minimalistRepeats = 4;

const buildChangingPattern = (
  pattern: readonly number[],
  random: () => number,
): number[] => {
  let current = [...pattern];
  return Array.from({ length: minimalistRepeats }, (_, repeat) => {
    if (repeat > 0) {
      const position = pickWholeNumber(1, current.length - 1, random);
      const swaps = minimalistSwaps.filter(
        (offset) => offset !== current[position],
      );
      const swapped = pickOne(swaps, random);
      current = current.map((offset, index) =>
        index === position ? swapped : offset,
      );
    }
    return current;
  }).flat();
};

const buildGrowingPattern = (pattern: readonly number[]): number[] =>
  Array.from({ length: minimalistRepeats }, (_, repeat) =>
    pattern.slice(0, 3 + repeat),
  ).flat();

const minimalistTonics = [60, 62, 57, 64] as const;

const buildModernPastiche = (random: () => number): MusicClip => {
  const tonic = pickOne(minimalistTonics, random);
  const pattern = pickOne(minimalistPatterns, random);
  const offsets =
    random() < 0.5
      ? buildChangingPattern(pattern, random)
      : buildGrowingPattern(pattern);
  const pulseBeats = Math.ceil(offsets.length / 2);
  return buildClip({ tempo: 152 }, [
    buildVoice(
      "marimba",
      buildMelody(
        offsets.map((offset) => tonic + offset),
        0.5,
        { loudness: loudnessLevels.mezzo },
      ),
    ),
    buildVoice(
      "marimba",
      buildMelody(
        Array.from({ length: pulseBeats }, () => tonic - semitonesPerOctave),
        1,
        { loudness: loudnessLevels.piano },
      ),
    ),
  ]);
};

interface MusicPeriod {
  dates: string;
  spokenDates: string;
  buildPastiche: (random: () => number) => MusicClip;
}

const musicPeriods = new Map<string, MusicPeriod>(
  Object.entries({
    Baroque: {
      dates: "1600–1750",
      spokenDates: "1600 to 1750",
      buildPastiche: buildBaroquePastiche,
    },
    Classical: {
      dates: "1750–1820",
      spokenDates: "1750 to 1820",
      buildPastiche: buildClassicalPastiche,
    },
    Romantic: {
      dates: "1820–1900",
      spokenDates: "1820 to 1900",
      buildPastiche: buildRomanticPastiche,
    },
    Modern: {
      dates: "1900–today",
      spokenDates: "1900 to today",
      buildPastiche: buildModernPastiche,
    },
  }),
);

const periodNames = [...musicPeriods.keys()];

const baroquePeriod: MusicPeriod = {
  dates: "1600–1750",
  spokenDates: "1600 to 1750",
  buildPastiche: buildBaroquePastiche,
};

const findPeriod = (choice: string): MusicPeriod =>
  musicPeriods.get(choice) ?? baroquePeriod;

export const musicTimeMachine = defineMusicGame({
  gameType: "music-time-machine",
  title: "Music time machine",
  skillId: "music.periods-of-music",
  instruction: "Which period of history is this music from?",
  hint: "Not quite. Listen for the instruments and the style: a busy harpsichord, a neat piano tune, swelling strings, or a repeating pattern?",
  hintKind: "listen",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(periodNames, random);
    return {
      prompt: {
        ask: "When was this written?",
        clips: [findPeriod(answer).buildPastiche(random)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        periodNames,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => buildWordCard([choice, findPeriod(choice).dates]),
  describeChoice: (choice) => `${choice}, ${findPeriod(choice).spokenDates}`,
});

interface RomanticComposer {
  theme: ComposerTheme;
  shortPiece: string;
  largestBeats: number;
}

const romanticComposers = new Map<string, RomanticComposer>(
  Object.entries({
    Grieg: {
      theme: composerThemes.mountainKing,
      shortPiece: "Mountain King",
      largestBeats: 8,
    },
    Brahms: {
      theme: composerThemes.lullaby,
      shortPiece: "Lullaby",
      largestBeats: 12,
    },
    Dvořák: {
      theme: composerThemes.largo,
      shortPiece: "New World",
      largestBeats: 8,
    },
    Tchaikovsky: {
      theme: composerThemes.swanLake,
      shortPiece: "Swan Lake",
      largestBeats: 11,
    },
  }),
);

const romanticComposerNames = [...romanticComposers.keys()];

const griegComposer: RomanticComposer = {
  theme: composerThemes.mountainKing,
  shortPiece: "Mountain King",
  largestBeats: 8,
};

const findRomanticComposer = (choice: string): RomanticComposer =>
  romanticComposers.get(choice) ?? griegComposer;

const buildComposerClip = (
  { theme, largestBeats }: RomanticComposer,
  melodyInstrument: Instrument,
): MusicClip =>
  buildClip({ tempo: theme.tempo }, [
    buildVoice(
      melodyInstrument,
      takeBeats(buildTune(theme.melody), largestBeats),
    ),
    buildVoice("cello", takeBeats(buildTune(theme.bass), largestBeats), {
      loudness: 0.6,
    }),
  ]);

export const romanticComposerGallery = defineMusicGame({
  gameType: "romantic-composer-gallery",
  title: "Romantic composer gallery",
  skillId: "music.romantic-composers",
  instruction: "Which Romantic composer wrote this tune?",
  hint: "Not quite. Tap each composer to hear their tune, then listen again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(romanticComposerNames, random);
    const composer = findRomanticComposer(answer);
    const melodyInstrument =
      difficulty === 3 ? "piano" : composer.theme.instrument;
    return {
      prompt: {
        ask: "Who wrote this?",
        clips: [buildComposerClip(composer, melodyInstrument)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        romanticComposerNames,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) =>
    buildWordCard([choice, findRomanticComposer(choice).shortPiece]),
  describeChoice: (choice) =>
    `${choice}: ${findRomanticComposer(choice).theme.piece}`,
  findChoiceSound: (choice) => {
    const composer = findRomanticComposer(choice);
    return buildComposerClip(composer, composer.theme.instrument);
  },
});

const bassClefNotes: Record<MusicDifficulty, string[]> = {
  1: ["G2", "B2", "D3", "F3", "A3"],
  2: ["G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3"],
  3: ["E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "C4"],
};

const bassClefLetterNotes = new Map<string, string>(
  Object.entries({
    A: "A2",
    B: "B2",
    C: "C3",
    D: "D3",
    E: "E3",
    F: "F3",
    G: "G3",
  }),
);

const alphabeticalLetters = [...bassClefLetterNotes.keys()];

const buildBassNoteClip = (note: string): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice("cello", buildMelodyOf([note], 2, { length: legatoLength })),
  ]);

export const bassClefBasement = defineMusicGame({
  gameType: "bass-clef-basement",
  title: "Bass clef basement",
  skillId: "music.bass-clef-notes",
  instruction: "Tap the letter name of the bass clef note.",
  hint: "Not quite. On the bass clef the lines from the bottom are G, B, D, F, A, and the spaces are A, C, E, G.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const note = pickOne(bassClefNotes[difficulty], random);
    const answer = note.charAt(0);
    return {
      prompt: {
        ask: "Which note is this?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: {
            kind: "staff",
            clef: "bass",
            chords: [{ notes: [note], beats: 4 }],
            keySignature: 0,
          },
        },
        reward: buildBassNoteClip(note),
      },
      choices: pickChoices(answer, alphabeticalLetters, random),
      answer,
    };
  },
  describeChoice: (choice) => `The note ${choice}`,
  findChoiceSound: (choice) => {
    const note = bassClefLetterNotes.get(choice);
    return note === undefined ? undefined : buildBassNoteClip(note);
  },
});

const articulations = ["legato", "staccato", "accent"] as const;

const isArticulation = (value: string): value is Articulation =>
  articulations.some((articulation) => articulation === value);

const articulationMeanings = new Map<string, string>(
  Object.entries({
    legato: "smooth and joined",
    staccato: "short and spiky",
    accent: "some notes punched out loudly",
  }),
);

const articulationPools: Record<MusicDifficulty, Articulation[]> = {
  1: ["legato", "staccato"],
  2: ["legato", "staccato", "accent"],
  3: ["legato", "staccato", "accent"],
};

const articulationInstruments: Record<MusicDifficulty, Instrument[]> = {
  1: ["piano", "violin"],
  2: ["piano", "violin", "flute", "clarinet"],
  3: ["piano", "violin", "flute", "clarinet", "trumpet", "oboe"],
};

const articulateNotes = (
  notes: readonly MusicNote[],
  articulation: Articulation,
  accentEvery: number,
): MusicNote[] =>
  notes.map((note, index) => {
    if (articulation === "legato") {
      return { ...note, length: legatoLength, loudness: loudnessLevels.mezzo };
    }
    if (articulation === "staccato") {
      return {
        ...note,
        length: staccatoLength,
        loudness: loudnessLevels.mezzo,
      };
    }
    return {
      ...note,
      length: normalLength,
      loudness:
        index % accentEvery === 0
          ? loudnessLevels.fortissimo
          : loudnessLevels.piano,
    };
  });

const buildPhraseNotes = (random: () => number): MusicNote[] =>
  takeBeats(
    buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)]),
    8,
  ).filter((note) => !note.isRest);

const buildArticulationClip = (
  notes: readonly MusicNote[],
  articulation: Articulation,
  instrument: Instrument,
  tempo: number,
  accentEvery: number,
): MusicClip =>
  buildClip({ tempo }, [
    buildVoice(instrument, articulateNotes(notes, articulation, accentEvery)),
  ]);

export const smoothOrSpiky = defineMusicGame({
  gameType: "smooth-or-spiky",
  title: "Smooth or spiky?",
  skillId: "music.articulation",
  instruction: "Smooth, spiky, or accented?",
  hint: "Not quite. Smooth notes join up, spiky notes are short with gaps, and accents make some notes jump out. Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = articulationPools[difficulty];
    const answer = pickOne(pool, random);
    return {
      prompt: {
        ask: "Legato, staccato or accent?",
        clips: [
          buildArticulationClip(
            buildPhraseNotes(random),
            answer,
            pickOne(articulationInstruments[difficulty], random),
            difficulty === 3 ? 126 : 104,
            difficulty === 3 ? 3 : 2,
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...pool],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: {
      kind: "articulation",
      articulation: isArticulation(choice) ? choice : "legato",
    },
  }),
  describeChoice: (choice) =>
    `${choice}: ${articulationMeanings.get(choice) ?? choice}`,
  findChoiceSound: (choice) =>
    isArticulation(choice)
      ? buildArticulationClip(
          buildMelodyOf(["C4", "D4", "E4", "F4", "G4"]),
          choice,
          "piano",
          104,
          2,
        )
      : undefined,
});

type TriadQuality = "major" | "minor";

interface Triad {
  root: string;
  quality: TriadQuality;
  notes: string[];
}

const triads = new Map<string, Triad>(
  Object.entries({
    "C major": { root: "C", quality: "major", notes: ["C4", "E4", "G4"] },
    "D minor": { root: "D", quality: "minor", notes: ["D4", "F4", "A4"] },
    "E minor": { root: "E", quality: "minor", notes: ["E4", "G4", "B4"] },
    "F major": { root: "F", quality: "major", notes: ["F4", "A4", "C5"] },
    "G major": { root: "G", quality: "major", notes: ["G4", "B4", "D5"] },
    "A minor": { root: "A", quality: "minor", notes: ["A4", "C5", "E5"] },
    "D major": { root: "D", quality: "major", notes: ["D4", "F#4", "A4"] },
    "B♭ major": { root: "B♭", quality: "major", notes: ["Bb3", "D4", "F4"] },
  }),
);

const triadPools: Record<MusicDifficulty, string[]> = {
  1: ["C major", "G major", "A minor", "D minor"],
  2: ["C major", "F major", "G major", "A minor", "D minor", "E minor"],
  3: [
    "C major",
    "F major",
    "G major",
    "A minor",
    "D minor",
    "E minor",
    "D major",
    "B♭ major",
  ],
};

const readChordName = (name: string): string[] => name.split(" ");

const findOppositeQuality = (name: string): string => {
  const [root, quality] = readChordName(name);
  return `${root} ${quality === "major" ? "minor" : "major"}`;
};

const findTriadNotes = (name: string): string[] =>
  triads.get(name)?.notes ?? ["C4", "E4", "G4"];

const buildTriadChoices = (
  answer: string,
  difficulty: MusicDifficulty,
  random: () => number,
): string[] => {
  const answerRoot = readChordName(answer)[0];
  const otherRoots = triadPools[difficulty].filter(
    (name) => readChordName(name)[0] !== answerRoot,
  );
  if (difficulty !== 3) {
    const others = shuffleValues(otherRoots, random).slice(0, difficulty);
    return shuffleValues([answer, ...others], random);
  }
  const others = shuffleValues(otherRoots, random).slice(0, 2);
  return shuffleValues(
    [answer, findOppositeQuality(answer), ...others],
    random,
  );
};

export const triadTower = defineMusicGame({
  gameType: "triad-tower",
  title: "Triad tower",
  skillId: "music.triads",
  instruction: "Name the triad.",
  hint: "Not quite. The bottom note names the triad. A major triad has a big gap of four semitones at the bottom, a minor triad has three.",
  hintKind: "look",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(triadPools[difficulty], random);
    const notes = findTriadNotes(answer);
    return {
      prompt: {
        ask: "Which triad is this?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: {
            kind: "staff",
            clef: "treble",
            chords: [{ notes, beats: 4 }],
            keySignature: 0,
          },
        },
        reward: buildClip({ tempo: 60 }, [
          buildVoice("piano", [
            buildNote(notes.map(findPitchOf), 3, { length: legatoLength }),
          ]),
        ]),
      },
      choices: buildTriadChoices(answer, difficulty, random),
      answer,
    };
  },
  findChoiceArt: (choice) => buildWordCard(readChordName(choice)),
  describeChoice: describeAccidentals,
});

interface MajorKey {
  keySignature: number;
  tonic: string;
}

const majorKeys = new Map<string, MajorKey>(
  Object.entries({
    "E♭ major": { keySignature: -3, tonic: "Eb4" },
    "B♭ major": { keySignature: -2, tonic: "Bb3" },
    "F major": { keySignature: -1, tonic: "F4" },
    "C major": { keySignature: 0, tonic: "C4" },
    "G major": { keySignature: 1, tonic: "G4" },
    "D major": { keySignature: 2, tonic: "D4" },
    "A major": { keySignature: 3, tonic: "A4" },
  }),
);

const keysInCircleOrder = [...majorKeys.keys()];

const keyPools: Record<MusicDifficulty, string[]> = {
  1: ["F major", "C major", "G major"],
  2: ["B♭ major", "F major", "C major", "G major", "D major"],
  3: keysInCircleOrder,
};

const cMajorKey: MajorKey = { keySignature: 0, tonic: "C4" };

const findMajorKey = (name: string): MajorKey =>
  majorKeys.get(name) ?? cMajorKey;

const buildMajorScaleClip = ({ tonic }: MajorKey): MusicClip =>
  buildClip({ tempo: 160 }, [
    buildVoice(
      "piano",
      buildMelody(buildScale(findPitchOf(tonic), majorScaleSteps)),
    ),
  ]);

export const keySignatureCodebreaker = defineMusicGame({
  gameType: "key-signature-codebreaker",
  title: "Key signature codebreaker",
  skillId: "music.key-signatures",
  instruction: "Which major key is this?",
  hint: "Not quite. No sharps or flats is C major. One sharp is G, two is D, three is A. One flat is F, two is B flat, three is E flat.",
  hintKind: "look",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = keyPools[difficulty];
    const answer = pickOne(pool, random);
    const key = findMajorKey(answer);
    const chords: StaffChord[] =
      difficulty === 1 ? [{ notes: [key.tonic], beats: 4 }] : [];
    return {
      prompt: {
        ask: "Which major key?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: {
            kind: "staff",
            clef:
              difficulty === 3
                ? pickOne<Clef>(["treble", "bass"], random)
                : "treble",
            chords,
            keySignature: key.keySignature,
          },
        },
        reward: buildMajorScaleClip(key),
      },
      choices: pickChoices(answer, pool, random),
      answer,
    };
  },
  findChoiceArt: (choice) => buildWordCard(readChordName(choice)),
  describeChoice: describeAccidentals,
  findChoiceSound: (choice) =>
    majorKeys.has(choice)
      ? buildMajorScaleClip(findMajorKey(choice))
      : undefined,
});

type Slot = number | undefined;

const chaseRiffs: readonly (readonly number[])[] = [
  [0, 0, 3, 0, 7, 0, 3, 0],
  [0, 1, 0, 3, 0, 1, 0, 7],
  [0, 3, 5, 3, 0, 3, 6, 5],
  [0, 0, 7, 0, 0, 8, 0, 7],
];

const buildChaseCue = (random: () => number): MusicClip => {
  const tonic = pickOne([50, 52, 45], random);
  const riff = pickOne(chaseRiffs, random);
  const barShifts = pickOne(
    [
      [0, 0, 1],
      [0, 3, 0],
      [0, 0, 5],
    ],
    random,
  );
  const riffPitches = barShifts.flatMap((shift) =>
    riff.map((offset) => tonic + semitonesPerOctave + offset + shift),
  );
  const bars = barShifts.length;
  return buildClip({ tempo: pickOne([160, 168, 176], random) }, [
    buildVoice(
      "strings",
      buildMelody(riffPitches, 0.5, {
        length: staccatoLength,
        loudness: loudnessLevels.forte,
      }),
    ),
    buildVoice(
      "bass-drum",
      buildRhythmNotes("ta ta ta ta ".repeat(bars), [], {
        loudness: loudnessLevels.forte,
      }),
    ),
    buildVoice(
      "snare-drum",
      buildRhythmNotes("ti-ti ti-ti ti-ti ti-ti ".repeat(bars), [], {
        loudness: loudnessLevels.mezzo,
      }),
    ),
    buildVoice(
      "trombone",
      barShifts.map((shift) =>
        buildNote([tonic + shift], 4, {
          length: staccatoLength,
          loudness: loudnessLevels.forte,
        }),
      ),
    ),
  ]);
};

const sneakingSteps: readonly (readonly Slot[])[] = [
  [0, undefined, 1, undefined, 2, undefined, 3, undefined],
  [0, undefined, undefined, 1, undefined, undefined, 2, undefined],
  [0, undefined, 0, 1, undefined, undefined, 0, undefined],
  [0, undefined, 3, undefined, 2, undefined, 1, undefined],
];

const buildSneakingCue = (random: () => number): MusicClip => {
  const tonic = pickOne([40, 43, 45], random);
  const instrument = pickOne<Instrument>(
    ["double-bass", "cello", "harp"],
    random,
  );
  const opening = pickOne(sneakingSteps, random);
  const answering = pickOne(sneakingSteps, random);
  const slots: Slot[] = [
    ...opening,
    ...answering.map((step) => (step === undefined ? undefined : step + 3)),
    undefined,
    undefined,
    6,
    undefined,
  ];
  return buildClip({ tempo: pickOne([92, 100, 108], random) }, [
    buildVoice(
      instrument,
      buildMelody(
        slots.map((step) => (step === undefined ? undefined : tonic + step)),
        0.5,
        { length: staccatoLength, loudness: loudnessLevels.piano },
      ),
    ),
    buildVoice(
      "woodblock",
      buildRhythmNotes("sh ta sh ta sh ta sh ta sh ta", [], {
        loudness: loudnessLevels.pianissimo,
      }),
    ),
  ]);
};

const fanfares: readonly (readonly TimedDegree[])[] = [
  [
    [0, 0.75],
    [0, 0.25],
    [0, 1],
    [7, 2],
    [4, 0.75],
    [4, 0.25],
    [4, 1],
    [12, 2],
  ],
  [
    [0, 0.5],
    [4, 0.5],
    [7, 1],
    [12, 0.75],
    [7, 0.25],
    [12, 1],
    [16, 0.75],
    [14, 0.25],
    [12, 1],
    [7, 1],
    [12, 1],
  ],
  [
    [7, 1],
    [7, 0.75],
    [7, 0.25],
    [12, 2],
    [9, 0.75],
    [11, 0.25],
    [12, 1],
    [16, 2],
  ],
];

const buildTriumphCue = (random: () => number): MusicClip => {
  const tonic = pickOne([60, 62, 58], random);
  const fanfare = pickOne(fanfares, random);
  const tonicChord = buildChord(tonic - semitonesPerOctave, majorTriadSteps);
  return buildClip({ tempo: pickOne([112, 116, 120], random) }, [
    buildVoice(
      "trumpet",
      fanfare.map(([offset, beats]) =>
        buildNote([tonic + offset], beats, {
          loudness: loudnessLevels.fortissimo,
        }),
      ),
    ),
    buildVoice(
      "french-horn",
      Array.from({ length: 8 }, () =>
        buildNote(tonicChord, 1, { loudness: loudnessLevels.forte }),
      ),
    ),
    buildVoice(
      "snare-drum",
      buildRhythmNotes("tim-ka ta tim-ka ta tim-ka ta ti-ti ta", [], {
        loudness: loudnessLevels.forte,
      }),
    ),
    buildVoice(
      "timpani",
      buildMelody(
        [0, -5, 0, -5, 0, -5, 0, 0].map(
          (offset) => tonic - semitonesPerOctave + offset,
        ),
        1,
        { loudness: loudnessLevels.forte },
      ),
    ),
  ]);
};

const spookyChordPaths: readonly (readonly number[])[] = [
  [0, -1, -2],
  [0, 1, 0],
  [0, -1, 0],
  [0, 3, 6],
];

const diminishedTriadSteps = [0, 3, 6] as const;
const tremoloBeats = 0.125;
const spookyChordBeats = 2;

const buildSpookyCue = (random: () => number): MusicClip => {
  const tonic = pickOne([71, 72, 73], random);
  const path = pickOne(spookyChordPaths, random);
  const tremolo = path.flatMap((shift) =>
    Array.from({ length: spookyChordBeats / tremoloBeats }, () =>
      buildNote(buildChord(tonic + shift, diminishedTriadSteps), tremoloBeats, {
        loudness: loudnessLevels.piano,
        length: legatoLength,
      }),
    ),
  );
  return buildClip({ tempo: 60 }, [
    buildVoice("strings", tremolo),
    buildVoice("double-bass", [
      buildNote(
        [tonic - 3 * semitonesPerOctave],
        path.length * spookyChordBeats,
        {
          loudness: loudnessLevels.piano,
          length: legatoLength,
        },
      ),
    ]),
  ]);
};

interface FilmCue {
  icon: PictureIcon;
  buildCue: (random: () => number) => MusicClip;
}

const filmCues = new Map<string, FilmCue>(
  Object.entries({
    chase: { icon: "chase", buildCue: buildChaseCue },
    sneaking: { icon: "sneaking", buildCue: buildSneakingCue },
    triumph: { icon: "triumph", buildCue: buildTriumphCue },
    spooky: { icon: "spooky", buildCue: buildSpookyCue },
  }),
);

const filmCueNames = [...filmCues.keys()];
const chaseCue: FilmCue = { icon: "chase", buildCue: buildChaseCue };

const findFilmCue = (choice: string): FilmCue =>
  filmCues.get(choice) ?? chaseCue;

export const movieScoreStudio = defineMusicGame({
  gameType: "movie-score-studio",
  title: "Movie score studio",
  skillId: "music.music-for-film",
  instruction: "Which film scene is this music for?",
  hint: "Not quite. Is the music fast and driving, quiet and creeping, loud and proud, or shivery and strange? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(filmCueNames, random);
    return {
      prompt: {
        ask: "Which scene fits?",
        clips: [findFilmCue(answer).buildCue(random)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        filmCueNames,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "picture", icon: findFilmCue(choice).icon },
  }),
});

const trailCells: Record<MusicDifficulty, string[]> = {
  1: ["ta", "ti-ti", "tri-o-la"],
  2: ["ta", "ti-ti", "tri-o-la", "syn-co-pa", "ti-ka-ti-ka"],
  3: ["ta", "ti-ti", "tri-o-la", "syn-co-pa", "ti-ka-ti-ka"],
};

const trailBeats = 4;
const fallbackTrail = "tri-o-la ta ti-ti ta";

const hasTripletOrSyncopation = (rhythm: string): boolean =>
  rhythm.split(" ").some((cell) => cell === "tri-o-la" || cell === "syn-co-pa");

const buildAnyTrailRhythm = (
  cells: readonly string[],
  random: () => number,
): string => {
  const chosen: string[] = [];
  let beat = 0;
  while (beat < trailBeats) {
    const startBeat = beat;
    const fitting = cells.filter(
      (cell) => cell !== "syn-co-pa" || startBeat % 2 === 0,
    );
    const cell = pickOne(fitting, random);
    chosen.push(cell);
    beat += countRhythmBeats(cell);
  }
  return chosen.join(" ");
};

const buildTrailRhythm = (
  cells: readonly string[],
  random: () => number,
): string => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rhythm = buildAnyTrailRhythm(cells, random);
    if (hasTripletOrSyncopation(rhythm)) {
      return rhythm;
    }
  }
  return fallbackTrail;
};

const cellSwaps = new Map<string, string[]>(
  Object.entries({
    "tri-o-la": ["ti-ti"],
    "ti-ti": ["tri-o-la"],
    "syn-co-pa": ["ti-ti ta", "ta ti-ti"],
  }),
);

const listSwappedRhythms = (rhythm: string): string[] => {
  const cells = rhythm.split(" ");
  return [
    ...new Set(
      cells.flatMap((cell, position) =>
        (cellSwaps.get(cell) ?? []).map((swap) =>
          cells
            .map((original, index) => (index === position ? swap : original))
            .join(" "),
        ),
      ),
    ),
  ];
};

const distractorCount = 2;

const buildTrailQuestionRhythms = (
  difficulty: MusicDifficulty,
  random: () => number,
): { answer: string; distractors: string[] } => {
  const cells = trailCells[difficulty];
  if (difficulty === 3) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const answer = buildTrailRhythm(cells, random);
      const swapped = listSwappedRhythms(answer);
      if (swapped.length >= distractorCount) {
        return {
          answer,
          distractors: shuffleValues(swapped, random).slice(0, distractorCount),
        };
      }
    }
  }
  const answer = buildTrailRhythm(cells, random);
  const distractors = new Set<string>();
  for (
    let attempt = 0;
    distractors.size < distractorCount && attempt < 60;
    attempt++
  ) {
    const candidate = buildAnyTrailRhythm(cells, random);
    if (candidate !== answer) {
      distractors.add(candidate);
    }
  }
  return { answer, distractors: [...distractors] };
};

const buildTrailClip = (rhythm: string, instrument: Instrument): MusicClip =>
  buildClip({ tempo: 76 }, [
    buildVoice(
      instrument,
      buildRhythmNotes(rhythm, [], { loudness: loudnessLevels.forte }),
    ),
    buildVoice(
      "tick",
      buildRhythmNotes("ta ta ta ta", [], { loudness: loudnessLevels.piano }),
    ),
  ]);

export const tripletTrail = defineMusicGame({
  gameType: "triplet-trail",
  title: "Triplet trail",
  skillId: "music.triplets-and-syncopation",
  instruction: "Find the card that shows the rhythm.",
  hint: "Not quite. A triplet squeezes three notes into one beat, and syncopation puts a long note between the beats. Listen again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const { answer, distractors } = buildTrailQuestionRhythms(
      difficulty,
      random,
    );
    return {
      prompt: {
        ask: "Which rhythm did you hear?",
        clips: [
          buildTrailClip(
            answer,
            pickOne<Instrument>(["woodblock", "hand-drum", "clap"], random),
          ),
        ],
        stage: { kind: "drum", beatLamps: trailBeats },
      },
      choices: shuffleValues([answer, ...distractors], random),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: {
      kind: "rhythm",
      rhythm: choice,
      timeSignature: { top: 4, bottom: 4 },
    },
  }),
  describeChoice: (choice) => choice.split(" ").join(", "),
  findChoiceSound: (choice) => buildTrailClip(choice, "woodblock"),
});

const dictationScale = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
] as const;

interface DictationShape {
  noteCount: number;
  highestIndex: number;
  starts: readonly number[];
  moves: readonly number[];
  changedNotes: number;
  changeShifts: readonly number[];
}

const dictationShapes: Record<MusicDifficulty, DictationShape> = {
  1: {
    noteCount: 4,
    highestIndex: 7,
    starts: [0, 2, 4],
    moves: [-1, 1],
    changedNotes: 2,
    changeShifts: [-3, -2, 2, 3],
  },
  2: {
    noteCount: 4,
    highestIndex: 7,
    starts: [0, 1, 2, 3, 4],
    moves: [-2, -1, 1, 2],
    changedNotes: 1,
    changeShifts: [-3, -2, 2, 3],
  },
  3: {
    noteCount: 5,
    highestIndex: 9,
    starts: [0, 1, 2, 3, 4, 5],
    moves: [-1, 1],
    changedNotes: 1,
    changeShifts: [-1, 1],
  },
};

const leapMoves = [-5, -4, -3, 3, 4, 5] as const;

const isInDictationRange = (index: number, highestIndex: number): boolean =>
  index >= 0 && index <= highestIndex;

const buildDictationIndexes = (
  { noteCount, highestIndex, starts, moves }: DictationShape,
  hasLeap: boolean,
  random: () => number,
): number[] => {
  const leapAt = hasLeap ? pickWholeNumber(1, noteCount - 1, random) : -1;
  const indexes = [pickOne(starts, random)];
  for (let position = 1; position < noteCount; position++) {
    const previous = indexes[position - 1];
    const allowed: readonly number[] = position === leapAt ? leapMoves : moves;
    const fitting = allowed.filter((move) =>
      isInDictationRange(previous + move, highestIndex),
    );
    indexes.push(previous + pickOne(fitting, random));
  }
  return indexes;
};

const changeDictationNotes = (
  indexes: readonly number[],
  { changedNotes, changeShifts, highestIndex }: DictationShape,
  random: () => number,
): number[] => {
  const positions = shuffleValues(
    indexes.map((_, position) => position),
    random,
  ).slice(0, changedNotes);
  return indexes.map((index, position) => {
    if (!positions.includes(position)) {
      return index;
    }
    const fitting = changeShifts.filter((shift) =>
      isInDictationRange(index + shift, highestIndex),
    );
    return index + pickOne(fitting, random);
  });
};

const nameDictationMelody = (indexes: readonly number[]): string =>
  indexes.map((index) => dictationScale[index]).join(" ");

const readMelodyNotes = (choice: string): string[] =>
  choice.split(" ").filter((note) => note !== "");

const buildDictationClip = (choice: string): MusicClip =>
  buildClip({ tempo: 84 }, [
    buildVoice("piano", buildMelodyOf(readMelodyNotes(choice))),
  ]);

export const melodyDictation = defineMusicGame({
  gameType: "melody-dictation",
  title: "Melody dictation",
  skillId: "music.melody-dictation",
  instruction: "Find the stave that shows the melody.",
  hint: "Not quite. Trace the notes with your finger as you listen. Where does the tune go up or down?",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const shape = dictationShapes[difficulty];
    const indexes = buildDictationIndexes(shape, difficulty === 3, random);
    const answer = nameDictationMelody(indexes);
    const distractors = new Set<string>();
    for (
      let attempt = 0;
      distractors.size < distractorCount && attempt < 60;
      attempt++
    ) {
      const candidate = nameDictationMelody(
        changeDictationNotes(indexes, shape, random),
      );
      if (candidate !== answer) {
        distractors.add(candidate);
      }
    }
    return {
      prompt: {
        ask: "Which stave matches?",
        clips: [buildDictationClip(answer)],
        stage: { kind: "gramophone" },
      },
      choices: shuffleValues([answer, ...distractors], random),
      answer,
    };
  },
  findChoiceArt: (choice) => {
    const notes = readMelodyNotes(choice);
    const face: NotationFace = {
      kind: "staff",
      clef: "treble",
      chords: notes.map((note) => ({ notes: [note], beats: 1 })),
      keySignature: 0,
      ...(notes.length === 4 ? { timeSignature: { top: 4, bottom: 4 } } : {}),
    };
    return { kind: "card", face };
  },
  describeChoice: (choice) =>
    readMelodyNotes(choice)
      .map((note) => note.charAt(0))
      .join(", "),
  findChoiceSound: buildDictationClip,
});

interface AccompanimentBeat {
  part: "bass" | "chord" | "rest";
  loudness: number;
}

interface Metre {
  signature: TimeSignature;
  tempos: readonly number[];
  barRhythms: readonly (readonly number[])[];
  accompaniment: readonly AccompanimentBeat[];
  melodyInstruments: readonly Instrument[];
  bassInstrument: Instrument;
  chordInstrument: Instrument;
}

const downbeat: AccompanimentBeat = {
  part: "bass",
  loudness: loudnessLevels.fortissimo,
};
const offbeatChord: AccompanimentBeat = {
  part: "chord",
  loudness: loudnessLevels.piano,
};
const silentBeat: AccompanimentBeat = { part: "rest", loudness: 0 };

const metres = new Map<string, Metre>(
  Object.entries({
    "2/4": {
      signature: { top: 2, bottom: 4 },
      tempos: [108, 116, 120],
      barRhythms: [
        [1, 1],
        [0.5, 0.5, 1],
        [0.75, 0.25, 1],
      ],
      accompaniment: [downbeat, offbeatChord],
      melodyInstruments: ["trumpet", "clarinet"],
      bassInstrument: "tuba",
      chordInstrument: "french-horn",
    },
    "3/4": {
      signature: { top: 3, bottom: 4 },
      tempos: [138, 152, 160],
      barRhythms: [[2, 1], [1, 1, 1], [3]],
      accompaniment: [downbeat, offbeatChord, offbeatChord],
      melodyInstruments: ["violin", "flute"],
      bassInstrument: "cello",
      chordInstrument: "strings",
    },
    "4/4": {
      signature: { top: 4, bottom: 4 },
      tempos: [96, 104, 112],
      barRhythms: [
        [1, 1, 2],
        [2, 1, 1],
        [1, 1, 1, 1],
        [1.5, 0.5, 2],
      ],
      accompaniment: [
        downbeat,
        offbeatChord,
        { part: "bass", loudness: loudnessLevels.mezzo },
        offbeatChord,
      ],
      melodyInstruments: ["piano", "oboe"],
      bassInstrument: "piano",
      chordInstrument: "piano",
    },
    "6/8": {
      signature: { top: 6, bottom: 8 },
      tempos: [168, 184, 200],
      barRhythms: [
        [2, 1, 2, 1],
        [1, 1, 1, 1, 1, 1],
        [3, 3],
        [3, 2, 1],
      ],
      accompaniment: [
        downbeat,
        silentBeat,
        offbeatChord,
        { part: "bass", loudness: loudnessLevels.mezzo },
        silentBeat,
        offbeatChord,
      ],
      melodyInstruments: ["flute", "violin"],
      bassInstrument: "cello",
      chordInstrument: "guitar",
    },
  }),
);

const fallbackMetre: Metre = {
  signature: { top: 4, bottom: 4 },
  tempos: [100],
  barRhythms: [[1, 1, 1, 1]],
  accompaniment: [downbeat, offbeatChord, offbeatChord, offbeatChord],
  melodyInstruments: ["piano"],
  bassInstrument: "piano",
  chordInstrument: "piano",
};

const findMetre = (choice: string): Metre =>
  metres.get(choice) ?? fallbackMetre;

const metrePools: Record<MusicDifficulty, string[]> = {
  1: ["2/4", "3/4"],
  2: ["2/4", "3/4", "4/4"],
  3: ["2/4", "3/4", "4/4", "6/8"],
};

const conductorProgressions = [
  [0, 4, 0],
  [0, 3, 0],
  [0, 0, 4],
  [0, 3, 4],
] as const;
const conductorTonics = [60, 62, 65, 67] as const;
const melodyChordTones = [0, 2, 4, 7] as const;

const buildAccompanimentVoices = (
  { accompaniment, bassInstrument, chordInstrument }: Metre,
  tonic: number,
  chordRoots: readonly number[],
): MusicVoice[] => {
  const findBassPitch = (root: number) =>
    findScalePitch(tonic - 2 * semitonesPerOctave, majorScaleSteps, root);
  const findChordPitches = (root: number) =>
    [0, 2, 4].map((step) =>
      findScalePitch(tonic - semitonesPerOctave, majorScaleSteps, root + step),
    );
  const buildPartNotes = (part: AccompanimentBeat["part"]) =>
    chordRoots.flatMap((root) =>
      accompaniment.map((beat) =>
        beat.part === part
          ? buildNote(
              part === "bass" ? [findBassPitch(root)] : findChordPitches(root),
              1,
              { loudness: beat.loudness, length: normalLength },
            )
          : buildRest(1),
      ),
    );
  return [
    buildVoice(bassInstrument, buildPartNotes("bass")),
    buildVoice(chordInstrument, buildPartNotes("chord")),
  ];
};

const buildConductorClip = (metre: Metre, random: () => number): MusicClip => {
  const tonic = pickOne(conductorTonics, random);
  const chordRoots = pickOne(conductorProgressions, random);
  const melody = chordRoots.flatMap((root) =>
    pickOne(metre.barRhythms, random).map((beats, index) =>
      buildNote(
        [
          findScalePitch(
            tonic,
            majorScaleSteps,
            root + pickOne(melodyChordTones, random),
          ),
        ],
        beats,
        {
          loudness:
            index === 0 ? loudnessLevels.fortissimo : loudnessLevels.piano,
        },
      ),
    ),
  );
  return buildClip({ tempo: pickOne(metre.tempos, random) }, [
    buildVoice(pickOne(metre.melodyInstruments, random), melody),
    ...buildAccompanimentVoices(metre, tonic, chordRoots),
  ]);
};

export const conductorsChallenge = defineMusicGame({
  gameType: "conductors-challenge",
  title: "Conductor's challenge",
  skillId: "music.conducting-patterns",
  instruction: "Which time signature is the conductor beating?",
  hint: "Not quite. Count from each loud first beat to the next one. Two beats is 2 4, three is 3 4, four is 4 4, and six quick beats is 6 8.",
  hintKind: "listen",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = metrePools[difficulty];
    const answer = pickOne(pool, random);
    const metre = findMetre(answer);
    return {
      prompt: {
        ask: "Which time signature?",
        clips: [buildConductorClip(metre, random)],
        stage: { kind: "conductor", beatsPerBar: metre.signature.top },
      },
      choices: [...pool],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "time-signature", signature: findMetre(choice).signature },
  }),
  describeChoice: (choice) => `${choice.replace("/", " ")} time`,
});

export const yearSixMusicGames = [
  musicTimeMachine,
  romanticComposerGallery,
  bassClefBasement,
  smoothOrSpiky,
  triadTower,
  keySignatureCodebreaker,
  movieScoreStudio,
  tripletTrail,
  melodyDictation,
  conductorsChallenge,
] as const;
