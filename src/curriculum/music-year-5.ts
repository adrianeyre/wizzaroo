import {
  defineMusicGame,
  findChoiceCountFor,
  pickChoices,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type MusicDifficulty,
} from "./music-game.js";
import type { StaffChord } from "./music-prompts.js";
import {
  bluesScaleSteps,
  buildChord,
  buildClip,
  buildMelody,
  buildMelodyOf,
  buildNote,
  buildRest,
  buildRhythmClip,
  buildRhythmNotes,
  buildScale,
  buildVoice,
  countRhythmBeats,
  legatoLength,
  listRhythmSounds,
  loudnessLevels,
  majorScaleSteps,
  majorTriadSteps,
  minorScaleSteps,
  nameNoteOf,
  pentatonicScaleSteps,
  type Instrument,
  type MusicClip,
  type MusicNote,
} from "./music-theory.js";
import {
  buildTune,
  type ComposerThemeName,
  composerThemes,
  takeBeats,
} from "./music-tunes.js";

const fillRhythmPieces = (
  firstPieces: readonly string[],
  pieces: readonly string[],
  totalBeats: number,
  random: () => number,
): string[] => {
  const filled = [...firstPieces];
  let remainingBeats =
    totalBeats -
    firstPieces.reduce((total, piece) => total + countRhythmBeats(piece), 0);
  while (remainingBeats > 0) {
    const fitting = pieces.filter(
      (piece) => countRhythmBeats(piece) <= remainingBeats,
    );
    const piece = pickOne(fitting, random);
    filled.push(piece);
    remainingBeats -= countRhythmBeats(piece);
  }
  return filled;
};

const describeRhythm = (rhythm: string) => rhythm.split(" ").join(", ");

const dottedRhythmPieces: Record<
  MusicDifficulty,
  { dotted: string[]; plain: string[] }
> = {
  1: { dotted: ["ta-i-ti"], plain: ["ta", "ta-a"] },
  2: { dotted: ["ta-i-ti", "tim-ka"], plain: ["ta", "ti-ti", "ta-a"] },
  3: { dotted: ["ta-i-ti", "tim-ka"], plain: ["ta", "ti-ti", "ta-a"] },
};

const evenVersionsOfDottedFigures = new Map(
  Object.entries({ "ta-i-ti": "ta ti-ti", "tim-ka": "ti-ti" }),
);

const dottedRhythmBeats = 4;

const buildDottedRhythm = (
  difficulty: MusicDifficulty,
  random: () => number,
): string => {
  const { dotted, plain } = dottedRhythmPieces[difficulty];
  return shuffleValues(
    fillRhythmPieces(
      [pickOne(dotted, random)],
      [...dotted, ...plain],
      dottedRhythmBeats,
      random,
    ),
    random,
  ).join(" ");
};

const listEvenedRhythms = (rhythm: string): string[] => {
  const pieces = rhythm.split(" ");
  const evened = pieces.flatMap((piece, position) => {
    const evenVersion = evenVersionsOfDottedFigures.get(piece);
    return evenVersion === undefined
      ? []
      : [pieces.with(position, evenVersion).join(" ")];
  });
  const allEvened = pieces
    .map((piece) => evenVersionsOfDottedFigures.get(piece) ?? piece)
    .join(" ");
  return [...evened, allEvened];
};

const buildDottedRhythmClip = (
  rhythm: string,
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 84 }, [
    buildVoice(
      "tick",
      buildRhythmNotes("ta ta ta ta", [], { loudness: loudnessLevels.piano }),
    ),
    buildVoice(instrument, buildRhythmNotes(rhythm)),
  ]);

export const dottedRhythmDetective = defineMusicGame({
  gameType: "dotted-rhythm-detective",
  title: "Dotted rhythm detective",
  skillId: "music.dotted-rhythms",
  instruction: "Find the card that shows the rhythm.",
  hint: "Not quite. Listen for the long-short skip of the dotted notes, then look again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const answer = buildDottedRhythm(difficulty, random);
    const distractors = new Set<string>();
    const evened = difficulty === 3 ? listEvenedRhythms(answer) : [];
    for (const candidate of shuffleValues(evened, random)) {
      if (candidate !== answer && distractors.size < 2) {
        distractors.add(candidate);
      }
    }
    for (let attempt = 0; distractors.size < 2 && attempt < 40; attempt++) {
      const candidate = buildDottedRhythm(difficulty, random);
      if (candidate !== answer) {
        distractors.add(candidate);
      }
    }
    return {
      prompt: {
        ask: "Which rhythm did you hear?",
        clips: [
          buildDottedRhythmClip(
            answer,
            pickOne<Instrument>(["woodblock", "clap", "snare-drum"], random),
          ),
        ],
        stage: { kind: "gramophone" },
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
  describeChoice: describeRhythm,
  findChoiceSound: (choice) => buildDottedRhythmClip(choice, "woodblock"),
});

const chordNumerals = ["I", "IV", "V"] as const;
type ChordNumeral = (typeof chordNumerals)[number];

const chordRootSteps: Record<ChordNumeral, number> = { I: 0, IV: 5, V: 7 };

const chordDescriptions = new Map(
  Object.entries({
    I: "chord one (I)",
    IV: "chord four (IV)",
    V: "chord five (V)",
  }),
);

const isChordNumeral = (value: string): value is ChordNumeral =>
  chordNumerals.some((numeral) => numeral === value);

const findChordRootSteps = (choice: string): number =>
  isChordNumeral(choice) ? chordRootSteps[choice] : 0;

const chordKeyTonics: Record<MusicDifficulty, number[]> = {
  1: [60, 55],
  2: [60, 55, 53],
  3: [60, 55, 53],
};

const semitonesPerOctave = 12;

const buildChordPitches = (
  tonic: number,
  rootSteps: number,
  isInverted: boolean,
): number[] => {
  const root = tonic + rootSteps;
  const triad = buildChord(root, majorTriadSteps);
  const upper = isInverted
    ? triad
        .map((pitch) =>
          pitch >= tonic + semitonesPerOctave
            ? pitch - semitonesPerOctave
            : pitch,
        )
        .toSorted((first, second) => first - second)
    : triad;
  return [root - semitonesPerOctave, ...upper];
};

const buildChordsClip = (
  chords: readonly number[][],
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice(
      instrument,
      chords.map((pitches) => buildNote(pitches, 2, { length: legatoLength })),
    ),
  ]);

export const chordCastle = defineMusicGame({
  gameType: "chord-castle",
  title: "Chord castle",
  skillId: "music.chords-one-four-five",
  instruction: "Is the mystery chord one, four or five?",
  hint: "Not quite. Hum the home note under the mystery chord. Does it feel at home, or does it pull away?",
  hintKind: "listen",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(chordNumerals, random);
    const tonic = pickOne(chordKeyTonics[difficulty], random);
    const isCadence = difficulty === 3;
    const home = buildChordPitches(tonic, 0, false);
    const mystery = buildChordPitches(tonic, chordRootSteps[answer], isCadence);
    const instrument = pickOne<Instrument>(
      ["piano", "organ", "strings"],
      random,
    );
    return {
      prompt: {
        ask: isCadence
          ? "Which chord is in the middle?"
          : "Which chord is the mystery chord?",
        clips: isCadence
          ? [buildChordsClip([home, mystery, home], instrument)]
          : [
              buildChordsClip([home], instrument),
              buildChordsClip([mystery], instrument),
            ],
        stage: { kind: "gramophone" },
      },
      choices: [...chordNumerals],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "word", lines: [choice] },
  }),
  describeChoice: (choice) => chordDescriptions.get(choice) ?? choice,
  findChoiceSound: (choice) =>
    buildChordsClip(
      [
        buildChordPitches(60, 0, false),
        buildChordPitches(60, findChordRootSteps(choice), false),
      ],
      "piano",
    ),
});

const intervalSemitones = new Map(
  Object.entries({ "2nd": 2, "3rd": 4, "4th": 5, "5th": 7, octave: 12 }),
);

const intervalDescriptions = new Map(
  Object.entries({
    "2nd": "a major 2nd",
    "3rd": "a major 3rd",
    "4th": "a perfect 4th",
    "5th": "a perfect 5th",
    octave: "an octave",
  }),
);

const intervalNames = [...intervalSemitones.keys()];

const intervalPools: Record<MusicDifficulty, string[]> = {
  1: ["2nd", "5th", "octave"],
  2: intervalNames,
  3: intervalNames,
};

export const findIntervalSemitones = (choice: string): number =>
  intervalSemitones.get(choice) ?? semitonesPerOctave;

const buildIntervalClip = (
  firstPitch: number,
  secondPitch: number,
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice(instrument, buildMelody([firstPitch, secondPitch], 1.5)),
  ]);

export const intervalLeap = defineMusicGame({
  gameType: "interval-leap",
  title: "Interval leap",
  skillId: "music.intervals",
  instruction: "How big is the leap between the notes?",
  hint: "Not quite. Sing the two notes. A 2nd is a tiny step and an octave is a giant leap.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = intervalPools[difficulty];
    const answer = pickOne(pool, random);
    const semitones = findIntervalSemitones(answer);
    const isFalling = difficulty === 3 && pickOne([true, false], random);
    const firstPitch =
      difficulty === 3
        ? isFalling
          ? pickWholeNumber(67, 79, random)
          : pickWholeNumber(55, 67, random)
        : 60;
    const secondPitch = isFalling
      ? firstPitch - semitones
      : firstPitch + semitones;
    return {
      prompt: {
        ask: "How big is the leap?",
        clips: [
          buildIntervalClip(
            firstPitch,
            secondPitch,
            pickOne<Instrument>(["piano", "marimba", "flute"], random),
          ),
        ],
        stage: { kind: "lily-pads" },
      },
      choices: pickChoices(answer, pool, random),
      answer,
    };
  },
  describeChoice: (choice) => intervalDescriptions.get(choice) ?? choice,
  findChoiceSound: (choice) =>
    buildIntervalClip(60, 60 + findIntervalSemitones(choice), "piano"),
});

const shortNoteWords = [
  "BAG",
  "CAB",
  "BED",
  "EGG",
  "ADD",
  "DAB",
  "ACE",
  "AGE",
  "BEE",
  "FED",
  "BAD",
  "DAD",
];

const longNoteWords = [
  "FACE",
  "CAGE",
  "BEAD",
  "FADE",
  "CAFE",
  "DEAF",
  "FEED",
  "BEEF",
  "DEED",
  "AGED",
  "EDGE",
  "BADGE",
  "FACED",
  "CAGED",
  "FADED",
  "ADDED",
];

const noteWordPools: Record<MusicDifficulty, string[]> = {
  1: shortNoteWords,
  2: longNoteWords,
  3: [...shortNoteWords, ...longNoteWords],
};

const notesOnTheStave = new Map(
  Object.entries({
    A: ["A4"],
    B: ["B4"],
    C: ["C5"],
    D: ["D5"],
    E: ["E4", "E5"],
    F: ["F4", "F5"],
    G: ["G4"],
  }),
);

const notesAroundTheStave = new Map(
  Object.entries({
    A: ["A4", "A5"],
    B: ["B4"],
    C: ["C4", "C5"],
    D: ["D4", "D5"],
    E: ["E4", "E5"],
    F: ["F4", "F5"],
    G: ["G4", "G5"],
  }),
);

const countSharedLetters = (word: string, other: string): number => {
  const unmatched = Array.from(other);
  let shared = 0;
  for (const letter of word) {
    const position = unmatched.indexOf(letter);
    if (position >= 0) {
      unmatched.splice(position, 1);
      shared++;
    }
  }
  return shared;
};

const scoreLookAlikeWord = (word: string, other: string): number =>
  countSharedLetters(word, other) + (word.length === other.length ? 1 : 0);

const buildWordNotes = (
  word: string,
  difficulty: MusicDifficulty,
  random: () => number,
): string[] => {
  const notesByLetter =
    difficulty === 3 ? notesAroundTheStave : notesOnTheStave;
  return Array.from(word).map((letter) =>
    pickOne(notesByLetter.get(letter) ?? ["C5"], random),
  );
};

export const noteWordPuzzle = defineMusicGame({
  gameType: "note-word-puzzle",
  title: "Note word puzzle",
  skillId: "music.treble-clef-notes",
  instruction: "Which word do the notes spell?",
  hint: "Not quite. The lines are E, G, B, D, F and the spaces spell F, A, C, E. Read each note again.",
  hintKind: "look",
  labelStyle: "inside",
  buildQuestion: (difficulty, random) => {
    const pool = noteWordPools[difficulty];
    const answer = pickOne(pool, random);
    const lookAlikes = shuffleValues(
      pool.filter((word) => word !== answer),
      random,
    )
      .toSorted(
        (first, second) =>
          scoreLookAlikeWord(answer, second) -
          scoreLookAlikeWord(answer, first),
      )
      .slice(0, 5);
    const notes = buildWordNotes(answer, difficulty, random);
    const chords: StaffChord[] = notes.map((note) => ({
      notes: [note],
      beats: 1,
    }));
    return {
      prompt: {
        ask: "Which word do the notes spell?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: { kind: "staff", clef: "treble", chords, keySignature: 0 },
        },
        reward: buildClip({ tempo: 100 }, [
          buildVoice("piano", buildMelodyOf(notes)),
        ]),
      },
      choices: pickChoices(answer, [answer, ...lookAlikes], random),
      answer,
    };
  },
  describeChoice: (choice) => Array.from(choice).join(", "),
});

interface BlackKey {
  sharpNote: string;
  flatNote: string;
}

const cSharpKey: BlackKey = { sharpNote: "C#", flatNote: "Db" };

const blackKeys: BlackKey[] = [
  cSharpKey,
  { sharpNote: "D#", flatNote: "Eb" },
  { sharpNote: "F#", flatNote: "Gb" },
  { sharpNote: "G#", flatNote: "Ab" },
  { sharpNote: "A#", flatNote: "Bb" },
];

const nameSharp = ({ sharpNote }: BlackKey) => nameNoteOf(`${sharpNote}4`);
const nameFlat = ({ flatNote }: BlackKey) => nameNoteOf(`${flatNote}4`);
const nameBothWays = (key: BlackKey) => `${nameSharp(key)} / ${nameFlat(key)}`;

const blackKeyNamers: Record<MusicDifficulty, (key: BlackKey) => string> = {
  1: nameSharp,
  2: nameFlat,
  3: nameBothWays,
};

const findBlackKey = (choice: string): BlackKey =>
  blackKeys.find((key) =>
    [nameSharp(key), nameFlat(key), nameBothWays(key)].includes(choice),
  ) ?? cSharpKey;

const buildKeyClip = (note: string): MusicClip =>
  buildClip({ tempo: 80 }, [buildVoice("piano", buildMelodyOf([note], 2))]);

export const sharpsAndFlats = defineMusicGame({
  gameType: "sharps-and-flats",
  title: "Sharps and flats",
  skillId: "music.sharps-and-flats",
  instruction: "Name the glowing black key.",
  hint: "Not quite. A sharp is the black key just to the right of a white key. A flat is just to the left.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const key = pickOne(blackKeys, random);
    const octave = pickOne([4, 5], random);
    const marked = `${difficulty === 2 ? key.flatNote : key.sharpNote}${String(octave)}`;
    const nameKey = blackKeyNamers[difficulty];
    const asks: Record<MusicDifficulty, string> = {
      1: "Which sharp is glowing?",
      2: "Which flat is glowing?",
      3: "What are this key's two names?",
    };
    return {
      prompt: {
        ask: asks[difficulty],
        clips: [],
        stage: {
          kind: "keyboard",
          lowest: "C4",
          highest: "B5",
          marked: [marked],
        },
        reward: buildKeyClip(marked),
      },
      choices: pickChoices(nameKey(key), blackKeys.map(nameKey), random),
      answer: nameKey(key),
    };
  },
  describeChoice: (choice) => {
    const key = findBlackKey(choice);
    const sharp = `${key.sharpNote.charAt(0)} sharp`;
    const flat = `${key.flatNote.charAt(0)} flat`;
    if (choice === nameSharp(key)) {
      return sharp;
    }
    return choice === nameFlat(key) ? flat : `${sharp} or ${flat}`;
  },
  findChoiceSound: (choice) =>
    buildKeyClip(`${findBlackKey(choice).sharpNote}4`),
});

const galleryThemeNames = [
  "spring",
  "canon",
  "nachtmusik",
  "odeToJoy",
  "surprise",
] as const satisfies readonly ComposerThemeName[];

type GalleryThemeName = (typeof galleryThemeNames)[number];

const galleryBassInstruments: Record<GalleryThemeName, Instrument> = {
  spring: "harpsichord",
  canon: "cello",
  nachtmusik: "double-bass",
  odeToJoy: "cello",
  surprise: "cello",
};

const galleryThemesByComposer = new Map<string, GalleryThemeName>(
  galleryThemeNames.map((name) => [composerThemes[name].composer, name]),
);

const galleryComposers = [...galleryThemesByComposer.keys()];

const galleryClipSeconds = 10;

const findGalleryTheme = (choice: string): GalleryThemeName =>
  galleryThemesByComposer.get(choice) ?? "spring";

const buildComposerClip = (name: GalleryThemeName): MusicClip => {
  const { tempo, instrument, melody, bass } = composerThemes[name];
  const largestBeats = Math.floor((galleryClipSeconds * tempo) / 60);
  return buildClip({ tempo }, [
    buildVoice(instrument, takeBeats(buildTune(melody), largestBeats)),
    buildVoice(
      galleryBassInstruments[name],
      takeBeats(
        buildTune(bass, { loudness: loudnessLevels.mezzo }),
        largestBeats,
      ),
    ),
  ]);
};

export const composerGallery = defineMusicGame({
  gameType: "composer-gallery",
  title: "Composer gallery",
  skillId: "music.baroque-and-classical-composers",
  instruction: "Which composer wrote this music?",
  hint: "Not quite. Listen for the instruments, the speed and the shape of the tune, then try again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(galleryComposers, random);
    return {
      prompt: {
        ask: "Who composed this music?",
        clips: [buildComposerClip(findGalleryTheme(answer))],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        galleryComposers,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => {
    const { composer, period } = composerThemes[findGalleryTheme(choice)];
    return { kind: "card", face: { kind: "word", lines: [composer, period] } };
  },
  describeChoice: (choice) => {
    const { composer, period } = composerThemes[findGalleryTheme(choice)];
    return `${composer}, ${period}`;
  },
  findChoiceSound: (choice) => buildComposerClip(findGalleryTheme(choice)),
});

const offBeatChoices = ["on the beat", "syncopated"] as const;

const syncopatedFigures = ["syn-co-pa", "sh-ti"];

const offBeatLevels: Record<
  MusicDifficulty,
  {
    tempo: number;
    syncopatedFigureCount: number;
    plainPieces: string[];
    instrument: Instrument;
  }
> = {
  1: {
    tempo: 84,
    syncopatedFigureCount: 4,
    plainPieces: ["ta", "ta-a"],
    instrument: "clap",
  },
  2: {
    tempo: 100,
    syncopatedFigureCount: 2,
    plainPieces: ["ta", "ta-a", "ti-ti"],
    instrument: "woodblock",
  },
  3: {
    tempo: 116,
    syncopatedFigureCount: 1,
    plainPieces: ["ta", "ti-ti", "ta-a", "ti-ti"],
    instrument: "piano",
  },
};

const offBeatRhythmBeats = 8;
const offBeatCountInBeats = 4;
const offBeatMelodyPitches = [60, 62, 64, 67, 69, 72];

const buildOffBeatRhythm = (
  isSyncopated: boolean,
  difficulty: MusicDifficulty,
  random: () => number,
): string => {
  const { syncopatedFigureCount, plainPieces } = offBeatLevels[difficulty];
  const figures = isSyncopated
    ? Array.from({ length: syncopatedFigureCount }, () =>
        pickOne(syncopatedFigures, random),
      )
    : [];
  return shuffleValues(
    fillRhythmPieces(figures, plainPieces, offBeatRhythmBeats, random),
    random,
  ).join(" ");
};

const buildRhythmMelody = (rhythm: string, random: () => number): MusicNote[] =>
  listRhythmSounds(rhythm).map(({ beats, isRest }) =>
    isRest
      ? buildRest(beats)
      : buildNote([pickOne(offBeatMelodyPitches, random)], beats),
  );

const buildOffBeatClip = (
  rhythmNotes: readonly MusicNote[],
  instrument: Instrument,
  tempo: number,
): MusicClip => {
  const pulseBeats = offBeatCountInBeats + offBeatRhythmBeats;
  const barCount = pulseBeats / offBeatCountInBeats;
  return buildClip({ tempo }, [
    buildVoice(
      "bass-drum",
      Array.from({ length: barCount }, () => [
        buildNote([], 1),
        buildRest(offBeatCountInBeats - 1),
      ]).flat(),
    ),
    buildVoice(
      "tick",
      Array.from({ length: pulseBeats }, () => buildNote([], 1)),
      { loudness: loudnessLevels.piano },
    ),
    buildVoice(instrument, rhythmNotes, { startBeat: offBeatCountInBeats }),
  ]);
};

const offBeatExamples = new Map(
  Object.entries({
    "on the beat": "ta ta ti-ti ta ta ta ta-a",
    syncopated: "ta syn-co-pa ta ta syn-co-pa ta",
  }),
);

export const offBeatParty = defineMusicGame({
  gameType: "off-beat-party",
  title: "Off-beat party",
  skillId: "music.syncopation",
  instruction: "On the beat, or syncopated?",
  hint: "Not quite. Tap the steady beat on your knee. Do the notes land with your taps, or in between them?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(offBeatChoices, random);
    const { tempo, instrument } = offBeatLevels[difficulty];
    const rhythm = buildOffBeatRhythm(
      answer === "syncopated",
      difficulty,
      random,
    );
    const rhythmNotes =
      instrument === "piano"
        ? buildRhythmMelody(rhythm, random)
        : buildRhythmNotes(rhythm);
    return {
      prompt: {
        ask: "On the beat or syncopated?",
        clips: [buildOffBeatClip(rhythmNotes, instrument, tempo)],
        stage: { kind: "drum", beatLamps: 4 },
      },
      choices: [...offBeatChoices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "beat-grid", isSyncopated: choice === "syncopated" },
  }),
  findChoiceSound: (choice) =>
    buildOffBeatClip(
      buildRhythmNotes(offBeatExamples.get(choice) ?? "ta ta ta ta"),
      "clap",
      96,
    ),
});

const scaleSteps = new Map<string, readonly number[]>(
  Object.entries({
    major: majorScaleSteps,
    minor: minorScaleSteps,
    pentatonic: pentatonicScaleSteps,
    blues: bluesScaleSteps,
  }),
);

export const findScaleSteps = (choice: string): readonly number[] =>
  scaleSteps.get(choice) ?? majorScaleSteps;

const scalePools: Record<MusicDifficulty, string[]> = {
  1: ["major", "minor"],
  2: ["major", "minor", "pentatonic"],
  3: ["major", "minor", "pentatonic", "blues"],
};

const buildScaleClip = (
  pitches: readonly number[],
  tempo: number,
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo }, [
    buildVoice(instrument, [
      ...buildMelody(pitches.slice(0, -1)),
      buildNote([pitches[pitches.length - 1]], 2),
    ]),
  ]);

export const scaleExplorer = defineMusicGame({
  gameType: "scale-explorer",
  title: "Scale explorer",
  skillId: "music.scales",
  instruction: "Which kind of scale is it?",
  hint: "Not quite. Major sounds bright, minor sounds sad, pentatonic has just five notes, and blues has a crunchy blue note.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = scalePools[difficulty];
    const answer = pickOne(pool, random);
    const isTricky = difficulty === 3;
    const tonic = isTricky ? pickOne([60, 62, 65, 67], random) : 60;
    const ascending = buildScale(tonic, findScaleSteps(answer));
    const isReturning = isTricky && pickOne([true, false], random);
    const pitches = isReturning
      ? [...ascending, ...ascending.slice(0, -1).toReversed()]
      : ascending;
    return {
      prompt: {
        ask: "Which scale?",
        clips: [
          buildScaleClip(
            pitches,
            isReturning ? 150 : 120,
            pickOne<Instrument>(["piano", "marimba", "harp"], random),
          ),
        ],
        stage: { kind: "keyboard", lowest: "C4", highest: "C6", marked: [] },
      },
      choices: [...pool],
      answer,
    };
  },
  findChoiceSound: (choice) =>
    buildScaleClip(buildScale(60, findScaleSteps(choice)), 160, "piano"),
});

const beatSumLevels: Record<
  MusicDifficulty,
  { terms: string[]; mustHave: string[]; fewest: number; most: number }
> = {
  1: { terms: ["ta", "ti-ti", "ta-a"], mustHave: [], fewest: 2, most: 3 },
  2: {
    terms: ["ta", "ti-ti", "ta-a", "sh", "ta-a-a-a", "ti-ka-ti-ka"],
    mustHave: [],
    fewest: 3,
    most: 4,
  },
  3: {
    terms: ["ta", "ti-ti", "ta-a", "ta-a-a", "ta-i-ti", "tim-ka"],
    mustHave: ["ta-i-ti", "ta-a-a", "tim-ka"],
    fewest: 3,
    most: 4,
  },
};

const buildSumRhythm = (
  difficulty: MusicDifficulty,
  random: () => number,
): string => {
  const { terms, mustHave, fewest, most } = beatSumLevels[difficulty];
  const termCount = pickWholeNumber(fewest, most, random);
  const firstTerms = mustHave.length === 0 ? [] : [pickOne(mustHave, random)];
  return shuffleValues(
    [
      ...firstTerms,
      ...Array.from({ length: termCount - firstTerms.length }, () =>
        pickOne(terms, random),
      ),
    ],
    random,
  ).join(" ");
};

export const beatSums = defineMusicGame({
  gameType: "beat-sums",
  title: "Beat sums",
  skillId: "music.adding-note-values",
  instruction: "How many beats altogether?",
  hint: "Not quite. A crotchet is 1 beat, two quavers make 1 and a minim is 2. A dot adds half as much again.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const rhythm = buildSumRhythm(difficulty, random);
    const total = countRhythmBeats(rhythm);
    const nearby = Array.from({ length: 5 }, (_, offset) => total - 2 + offset)
      .filter((candidate) => candidate >= 1)
      .map(String);
    return {
      prompt: {
        ask: "How many beats altogether?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: { kind: "rhythm", rhythm, isSum: true },
        },
        reward: buildRhythmClip(rhythm, "woodblock", 100),
      },
      choices: pickChoices(String(total), nearby, random),
      answer: String(total),
    };
  },
  describeChoice: (choice) => `${choice} beats`,
});

interface RondoTheme {
  instrument: Instrument;
  notes: MusicNote[];
}

const pianoRondoTheme: RondoTheme = {
  instrument: "piano",
  notes: buildTune("C5 E5 G5 E5"),
};

const pitchedRondoThemes: RondoTheme[] = [
  pianoRondoTheme,
  { instrument: "trumpet", notes: buildTune("G4:0.5 G4:0.5 G4 C5:2") },
  {
    instrument: "cello",
    notes: buildTune("C3:2 G2:2", { length: legatoLength }),
  },
  {
    instrument: "xylophone",
    notes: buildTune("E5:0.5 D5:0.5 C5:0.5 D5:0.5 E5 E5"),
  },
  { instrument: "flute", notes: buildTune("G5:1.5 A5:0.5 G5 E5") },
];

const rondoThemes: RondoTheme[] = [
  ...pitchedRondoThemes,
  { instrument: "woodblock", notes: buildRhythmNotes("ti-ti ti-ti ta sh") },
];

const rondoSectionBeats = 4;
const rondoSectionLetters = "ABC";

const sectionPlans = ["ABACA", "ABABA", "AABBA", "ABCBA", "AABAC"];

const buildRondoClip = (
  plan: string,
  sectionThemes: readonly RondoTheme[],
): MusicClip =>
  buildClip(
    { tempo: 126 },
    Array.from(plan).map((letter, position) => {
      const { instrument, notes } =
        sectionThemes.at(rondoSectionLetters.indexOf(letter)) ??
        pianoRondoTheme;
      return buildVoice(instrument, notes, {
        startBeat: position * rondoSectionBeats,
      });
    }),
  );

export const rondoRoundabout = defineMusicGame({
  gameType: "rondo-roundabout",
  title: "Rondo roundabout",
  skillId: "music.rondo-form",
  instruction: "Which plan of sections did you hear?",
  hint: "Not quite. Each time the first tune comes back, that is A. Listen for when a new tune arrives.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(sectionPlans, random);
    const themes = shuffleValues(
      difficulty === 3 ? pitchedRondoThemes : rondoThemes,
      random,
    ).slice(0, rondoSectionLetters.length);
    const sectionThemes =
      difficulty === 3
        ? themes.map(({ notes }): RondoTheme => ({
            instrument: "piano",
            notes,
          }))
        : themes;
    return {
      prompt: {
        ask: "Which plan did you hear?",
        clips: [buildRondoClip(answer, sectionThemes)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        sectionPlans,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => ({ kind: "blocks", sections: choice }),
  describeChoice: (choice) => Array.from(choice).join(", "),
  findChoiceSound: (choice) =>
    buildRondoClip(choice, rondoThemes.slice(0, rondoSectionLetters.length)),
});

export const yearFiveMusicGames = [
  dottedRhythmDetective,
  chordCastle,
  intervalLeap,
  noteWordPuzzle,
  sharpsAndFlats,
  composerGallery,
  offBeatParty,
  scaleExplorer,
  beatSums,
  rondoRoundabout,
] as const;
