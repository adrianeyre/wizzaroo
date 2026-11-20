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
  ChoiceArt,
  MusicModel,
  NotationFace,
  PictureIcon,
} from "./music-prompts.js";
import {
  buildChord,
  buildClip,
  buildMelody,
  buildMelodyOf,
  buildNote,
  buildRhythmClip,
  buildRhythmNotes,
  buildScale,
  buildVoice,
  countRhythmBeats,
  findPitchOf,
  legatoLength,
  majorScaleSteps,
  majorTriadSteps,
  minorScaleSteps,
  minorTriadSteps,
  noteLetters,
  type Instrument,
  type MusicClip,
  type MusicNote,
  type RhythmSyllable,
} from "./music-theory.js";
import {
  buildTune,
  takeBeats,
  traditionalTuneNames,
  traditionalTunes,
  transposeNotes,
} from "./music-tunes.js";

const beatsInSpotTheMistakeBar = 4;

const spotTheMistakePalettes: Record<
  MusicDifficulty,
  readonly RhythmSyllable[]
> = {
  1: ["ta", "ti-ti", "sh"],
  2: ["ta", "ti-ti", "sh", "ti-ka-ti-ka", "ti-ti-ka", "ti-ka-ti"],
  3: ["ta", "ti-ti", "ti-ka-ti-ka", "ti-ti-ka", "ti-ka-ti"],
};

const spotTheMistakeTempos: Record<MusicDifficulty, number> = {
  1: 84,
  2: 92,
  3: 100,
};

const pickBeatSyllable = (
  palette: readonly RhythmSyllable[],
  chosen: readonly RhythmSyllable[],
  random: () => number,
): RhythmSyllable =>
  pickOne(
    chosen.includes("sh")
      ? palette.filter((syllable) => syllable !== "sh")
      : palette,
    random,
  );

const buildSpotTheMistakeRhythm = (
  palette: readonly RhythmSyllable[],
  random: () => number,
): RhythmSyllable[] => {
  const longNoteBeat =
    random() < 0.35 ? pickWholeNumber(0, 2, random) : undefined;
  const syllables: RhythmSyllable[] = [];
  for (let beat = 0; beat < beatsInSpotTheMistakeBar;) {
    if (beat === longNoteBeat) {
      syllables.push("ta-a");
      beat += 2;
    } else {
      syllables.push(pickBeatSyllable(palette, syllables, random));
      beat += 1;
    }
  }
  return syllables;
};

const spotTheMistakeBeats = ["1", "2", "3", "4"] as const;

export const spotTheMistake = defineMusicGame({
  gameType: "spot-the-mistake",
  title: "Spot the mistake",
  skillId: "music.rhythm-dictation",
  instruction: "Which beat was played differently?",
  hint: "Not quite. Point to each beat as you listen, and say the rhythm names in your head.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const palette = spotTheMistakePalettes[difficulty];
    const written = buildSpotTheMistakeRhythm(palette, random);
    const changeable = written.flatMap((syllable, index) =>
      syllable === "ta-a" ? [] : [index],
    );
    const changedIndex = pickOne(changeable, random);
    const replacement = pickOne(
      palette.filter((syllable) => syllable !== written[changedIndex]),
      random,
    );
    const played = written.map((syllable, index) =>
      index === changedIndex ? replacement : syllable,
    );
    const changedBeat =
      countRhythmBeats(written.slice(0, changedIndex).join(" ")) + 1;
    const tempo = spotTheMistakeTempos[difficulty];
    const instrument = pickOne<Instrument>(
      ["woodblock", "hand-drum", "snare-drum", "clap"],
      random,
    );
    return {
      prompt: {
        ask: "Which beat was different?",
        clips: [
          buildClip({ tempo }, [
            buildVoice(
              "tick",
              buildRhythmNotes("ta ta ta ta ta ta ta ta", [], {
                loudness: 0.35,
              }),
            ),
            buildVoice(instrument, buildRhythmNotes(played.join(" ")), {
              startBeat: beatsInSpotTheMistakeBar,
            }),
          ]),
        ],
        stage: {
          kind: "music-stand",
          face: {
            kind: "rhythm",
            rhythm: written.join(" "),
            timeSignature: { top: 4, bottom: 4 },
          },
        },
      },
      choices: [...spotTheMistakeBeats],
      answer: String(changedBeat),
    };
  },
  describeChoice: (choice) => `Beat ${choice}`,
});

const majorOrMinor = ["major", "minor"] as const;

const isMajor = (choice: string) => choice === "major";

const majorMinorMelodies = [
  [0, 1, 2, 3, 4, 2, 0],
  [4, 3, 2, 1, 0],
  [0, 2, 4, 7, 4, 2, 0],
  [0, 1, 2, 0, 2, 4],
  [0, 2, 4, 2, 0],
] as const;

const majorMinorRoots: Record<MusicDifficulty, [number, number]> = {
  1: [60, 65],
  2: [57, 67],
  3: [53, 67],
};

const majorMinorInstruments: Record<MusicDifficulty, readonly Instrument[]> = {
  1: ["piano"],
  2: ["piano", "flute", "violin", "clarinet", "recorder"],
  3: ["piano", "strings", "organ", "harp", "guitar"],
};

const buildMajorMinorNotes = (
  difficulty: MusicDifficulty,
  root: number,
  isMajorKey: boolean,
  degrees: readonly number[],
): MusicNote[] => {
  const triad = buildChord(
    root,
    isMajorKey ? majorTriadSteps : minorTriadSteps,
  );
  if (difficulty === 1) {
    return [
      ...buildMelody([...triad, root + 12]),
      buildNote([...triad, root + 12], 2),
    ];
  }
  if (difficulty === 2) {
    const scale = buildScale(
      root,
      isMajorKey ? majorScaleSteps : minorScaleSteps,
    );
    const pitches = degrees.map((degree) => scale[degree]);
    return [
      ...buildMelody(pitches.slice(0, -1)),
      ...buildMelody(pitches.slice(-1), 2),
    ];
  }
  return [buildNote(triad, 3, { length: legatoLength })];
};

const buildMajorMinorClip = (
  difficulty: MusicDifficulty,
  root: number,
  isMajorKey: boolean,
  instrument: Instrument,
  degrees: readonly number[],
): MusicClip =>
  buildClip({ tempo: 100 }, [
    buildVoice(
      instrument,
      buildMajorMinorNotes(difficulty, root, isMajorKey, degrees),
    ),
  ]);

export const sunshineOrRain = defineMusicGame({
  gameType: "sunshine-or-rain",
  title: "Sunshine or rain?",
  skillId: "music.major-and-minor",
  instruction: "Is the music major or minor?",
  hint: "Not quite. Sing the middle note back. Does it feel bright and happy, or dark and sad?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(majorOrMinor, random);
    const [lowestRoot, highestRoot] = majorMinorRoots[difficulty];
    const root = pickWholeNumber(lowestRoot, highestRoot, random);
    const instrument = pickOne(majorMinorInstruments[difficulty], random);
    return {
      prompt: {
        ask: "Major or minor?",
        clips: [
          buildMajorMinorClip(
            difficulty,
            root,
            isMajor(answer),
            instrument,
            pickOne(majorMinorMelodies, random),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...majorOrMinor],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: isMajor(choice) ? "sun" : "rain-cloud",
  }),
  describeChoice: (choice) =>
    isMajor(choice) ? "Major: the sunshine" : "Minor: the rain cloud",
  findChoiceSound: (choice) =>
    buildMajorMinorClip(1, 60, isMajor(choice), "piano", []),
});

const firstKeyboardKeys = ["C", "D", "E"] as const;

const buildKeySound = (note: string): MusicClip =>
  buildClip({ tempo: 90 }, [buildVoice("piano", buildMelodyOf([note], 2))]);

const pickMarkedKey = (difficulty: MusicDifficulty, random: () => number) => {
  if (difficulty === 1) {
    return { letter: pickOne(firstKeyboardKeys, random), octave: 4 };
  }
  return {
    letter: pickOne(noteLetters, random),
    octave: difficulty === 2 ? 4 : pickOne([3, 4], random),
  };
};

export const pianoKeyDetective = defineMusicGame({
  gameType: "piano-key-detective",
  title: "Piano key detective",
  skillId: "music.keyboard-letter-names",
  instruction: "What is the glowing key's letter name?",
  hint: "Not quite. Find a group of two black keys. C is the white key just to the left of them. Count up from C.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const { letter, octave } = pickMarkedKey(difficulty, random);
    const marked = `${letter}${String(octave)}`;
    return {
      prompt: {
        ask: "Which letter is this key?",
        clips: [],
        stage: {
          kind: "keyboard",
          lowest: "C3",
          highest: "B4",
          marked: [marked],
        },
        reward: buildKeySound(marked),
      },
      choices:
        difficulty === 1
          ? [...firstKeyboardKeys]
          : pickChoices(letter, noteLetters, random),
      answer: letter,
    };
  },
  describeChoice: (choice) => `The note ${choice}`,
  findChoiceSound: (choice) => buildKeySound(`${choice}4`),
});

interface DynamicsJourney {
  from: string;
  to: string;
  isGradual: boolean;
  description: string;
}

const dynamicsJourneyNames = [
  "crescendo",
  "diminuendo",
  "suddenly loud",
  "suddenly quiet",
] as const;

const crescendoJourney: DynamicsJourney = {
  from: "p",
  to: "f",
  isGradual: true,
  description: "Crescendo: getting louder bit by bit",
};

const dynamicsJourneys = new Map<string, DynamicsJourney>(
  Object.entries({
    crescendo: crescendoJourney,
    diminuendo: {
      from: "f",
      to: "p",
      isGradual: true,
      description: "Diminuendo: getting quieter bit by bit",
    },
    "suddenly loud": {
      from: "p",
      to: "f",
      isGradual: false,
      description: "Suddenly loud: quiet, then loud all at once",
    },
    "suddenly quiet": {
      from: "f",
      to: "p",
      isGradual: false,
      description: "Suddenly quiet: loud, then quiet all at once",
    },
  }),
);

const findDynamicsJourney = (choice: string): DynamicsJourney =>
  dynamicsJourneys.get(choice) ?? crescendoJourney;

const dynamicsQuietLoudness: Record<MusicDifficulty, number> = {
  1: 0.1,
  2: 0.15,
  3: 0.2,
};

const dynamicsJourneyBeats = 12;

const buildDynamicsJourneyClip = (
  journey: DynamicsJourney,
  quietLoudness: number,
  instrument: Instrument,
  notes: readonly MusicNote[],
): MusicClip => {
  const isGettingLouder = journey.to === "f";
  const startLoudness = isGettingLouder ? quietLoudness : 1;
  const endLoudness = isGettingLouder ? 1 : quietLoudness;
  if (journey.isGradual) {
    return buildClip(
      { tempo: 120, swell: { from: startLoudness, to: endLoudness } },
      [
        buildVoice(
          instrument,
          notes.map((note) => ({ ...note, loudness: 1 })),
        ),
      ],
    );
  }
  const halfwayBeat = notes.reduce((total, { beats }) => total + beats, 0) / 2;
  let beat = 0;
  const shapedNotes = notes.map((note) => {
    const startBeat = beat;
    beat += note.beats;
    return {
      ...note,
      loudness: startBeat < halfwayBeat ? startLoudness : endLoudness,
    };
  });
  return buildClip({ tempo: 120 }, [buildVoice(instrument, shapedNotes)]);
};

const buildDynamicsTune = (random: () => number): MusicNote[] =>
  takeBeats(
    buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)]),
    dynamicsJourneyBeats,
  );

export const dynamicsJourney = defineMusicGame({
  gameType: "dynamics-journey",
  title: "Dynamics journey",
  skillId: "music.crescendo-and-diminuendo",
  instruction: "How does the loudness change?",
  hint: "Not quite. Listen to the start and the end. Then listen for the moment it changes. Is it slow or sudden?",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const pool =
      difficulty === 1
        ? dynamicsJourneyNames.slice(0, 2)
        : [...dynamicsJourneyNames];
    const answer = pickOne(pool, random);
    const instrument = pickOne<Instrument>(
      ["piano", "strings", "trumpet", "flute", "clarinet", "violin"],
      random,
    );
    return {
      prompt: {
        ask: "How does the loudness change?",
        clips: [
          buildDynamicsJourneyClip(
            findDynamicsJourney(answer),
            dynamicsQuietLoudness[difficulty],
            instrument,
            buildDynamicsTune(random),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        pool,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => {
    const { from, to, isGradual } = findDynamicsJourney(choice);
    return {
      kind: "card",
      face: { kind: "dynamics-journey", from, to, isGradual },
    };
  },
  describeChoice: (choice) => findDynamicsJourney(choice).description,
  findChoiceSound: (choice) =>
    buildDynamicsJourneyClip(
      findDynamicsJourney(choice),
      0.1,
      "piano",
      takeBeats(buildTune(traditionalTunes.twinkle), 8),
    ),
});

interface SongSection {
  tune: string;
  instrument: Instrument;
}

const songSections: readonly SongSection[] = [
  { tune: "C4 E4 G4 C5", instrument: "trumpet" },
  {
    tune: "C5:0.5 B4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:0.5 D4:0.5 C4:0.5",
    instrument: "xylophone",
  },
  { tune: "G4:0.5 G4:0.5 G4 G4:2", instrument: "piano" },
  { tune: "C3:2 G2:2", instrument: "cello" },
  { tune: "E5:0.5 G5:0.5 E5:0.5 G5:0.5 C6:2", instrument: "flute" },
  { tune: "A4 F4 D4 F4", instrument: "clarinet" },
];

const songShapes: Record<MusicDifficulty, readonly string[]> = {
  1: ["AB", "ABA"],
  2: ["AB", "ABA", "AAB"],
  3: ["AB", "ABA", "AAB", "ABB"],
};

const listSectionLetters = (shape: string): string[] =>
  Array.from(shape.matchAll(/[AB]/g), ([letter]) => letter);

const buildSectionNotes = (
  section: SongSection,
  difficulty: MusicDifficulty,
): MusicNote[] => {
  const notes = buildTune(section.tune);
  return difficulty === 3
    ? notes.map((note) => ({ ...note, beats: note.beats / 2 }))
    : notes;
};

export const shapeOfTheSong = defineMusicGame({
  gameType: "shape-of-the-song",
  title: "Shape of the song",
  skillId: "music.binary-and-ternary",
  instruction: "Which shape does the song make?",
  hint: "Not quite. Say A or B each time a new part starts, then listen again.",
  hintKind: "listen",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const shapes = songShapes[difficulty];
    const answer = pickOne(shapes, random);
    const [sectionA, sectionB] = shuffleValues(songSections, random);
    const sectionBeats = difficulty === 3 ? 2 : 4;
    const sharedInstrument =
      difficulty === 3
        ? pickOne<Instrument>(["piano", "marimba"], random)
        : undefined;
    const voices = listSectionLetters(answer).map((letter, index) => {
      const section = letter === "A" ? sectionA : sectionB;
      return buildVoice(
        sharedInstrument ?? section.instrument,
        buildSectionNotes(section, difficulty),
        { startBeat: index * sectionBeats },
      );
    });
    return {
      prompt: {
        ask: "What shape is the song?",
        clips: [buildClip({ tempo: 120 }, voices)],
        stage: { kind: "gramophone" },
      },
      choices: [...shapes],
      answer,
    };
  },
  findChoiceArt: (choice) => ({ kind: "blocks", sections: choice }),
  describeChoice: (choice) => listSectionLetters(choice).join(", "),
});

const timeSignatureChoices = ["2/4", "3/4", "4/4"] as const;

const timeSignaturePalettes: Record<
  MusicDifficulty,
  readonly RhythmSyllable[]
> = {
  1: ["ta", "ti-ti", "sh", "ta-a"],
  2: ["ta", "ti-ti", "sh", "ta-a", "ta-a-a", "ti-ka-ti-ka"],
  3: [
    "ta",
    "ti-ti",
    "sh",
    "ta-a",
    "ta-a-a",
    "ta-a-a-a",
    "ti-ka-ti-ka",
    "ti-ti-ka",
    "ti-ka-ti",
    "ta-i-ti",
    "syn-co-pa",
  ],
};

const readBeatsInBar = (choice: string): number => Number(choice.charAt(0));

const beatWords = new Map<number, string>(
  Object.entries({ 2: "two", 3: "three", 4: "four" }).map(([beats, word]) => [
    Number(beats),
    word,
  ]),
);

const buildBarRhythm = (
  beatsInBar: number,
  palette: readonly RhythmSyllable[],
  random: () => number,
): string => {
  const syllables: RhythmSyllable[] = [];
  let remaining = beatsInBar;
  while (remaining > 0) {
    const fitting = palette.filter(
      (syllable) =>
        countRhythmBeats(syllable) <= remaining &&
        !(syllable === "sh" && syllables.includes("sh")),
    );
    const syllable = pickOne(fitting, random);
    syllables.push(syllable);
    remaining -= countRhythmBeats(syllable);
  }
  return syllables.join(" ");
};

export const timeSignatureTiles = defineMusicGame({
  gameType: "time-signature-tiles",
  title: "Time signature tiles",
  skillId: "music.time-signatures",
  instruction: "Which time signature fits this bar?",
  hint: "Not quite. Clap the rhythm slowly and count the beats on your fingers. Remember a minim lasts two beats.",
  hintKind: "look",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(timeSignatureChoices, random);
    const rhythm = buildBarRhythm(
      readBeatsInBar(answer),
      timeSignaturePalettes[difficulty],
      random,
    );
    return {
      prompt: {
        ask: "How many beats in this bar?",
        clips: [],
        stage: { kind: "music-stand", face: { kind: "rhythm", rhythm } },
        reward: buildRhythmClip(rhythm, "woodblock", 96),
      },
      choices: [...timeSignatureChoices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: {
      kind: "time-signature",
      signature: { top: readBeatsInBar(choice), bottom: 4 },
    },
  }),
  describeChoice: (choice) => {
    const beatsInBar = readBeatsInBar(choice);
    return `${String(beatsInBar)} 4 time: ${beatWords.get(beatsInBar) ?? String(beatsInBar)} crotchet beats in a bar`;
  },
});

const noteStackChoices = ["1 note", "2 notes", "3 notes", "4 notes"] as const;

const readNoteCount = (choice: string): number => Number(choice.split(" ")[0]);

const noteStackShapes = new Map<number, readonly (readonly number[])[]>([
  [1, [[0]]],
  [
    2,
    [
      [0, 3],
      [0, 4],
      [0, 7],
      [0, 9],
      [0, 12],
    ],
  ],
  [
    3,
    [
      [0, 4, 7],
      [0, 3, 7],
      [0, 3, 8],
      [0, 5, 9],
    ],
  ],
  [
    4,
    [
      [0, 4, 7, 12],
      [0, 3, 7, 12],
      [0, 4, 7, 10],
      [0, 4, 7, 11],
    ],
  ],
]);

const noteStackCardNotes = ["F4", "A4", "C5", "F5"] as const;

const buildNoteStackFace = (choice: string): NotationFace => ({
  kind: "staff",
  clef: "treble",
  chords: [
    {
      notes: noteStackCardNotes.slice(0, readNoteCount(choice)),
      beats: 4,
    },
  ],
  keySignature: 0,
});

const buildNoteStackClip = (
  pitches: readonly number[],
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice(instrument, [
      buildNote(pitches, 2, { length: legatoLength }),
      buildNote(pitches, 2, { length: legatoLength }),
    ]),
  ]);

const noteStackInstruments: Record<MusicDifficulty, readonly Instrument[]> = {
  1: ["piano"],
  2: ["piano", "organ"],
  3: ["piano", "organ", "strings"],
};

export const noteStack = defineMusicGame({
  gameType: "note-stack",
  title: "Note stack",
  skillId: "music.chords-and-single-notes",
  instruction: "How many notes play at once?",
  hint: "Not quite. Hum the lowest note, then listen for any notes sitting on top of it.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const choices = noteStackChoices.slice(0, difficulty === 3 ? 4 : 3);
    const answer = pickOne(choices, random);
    const steps = pickOne(
      noteStackShapes.get(readNoteCount(answer)) ?? [[0]],
      random,
    );
    const root = pickWholeNumber(55, 67, random);
    return {
      prompt: {
        ask: "How many notes at once?",
        clips: [
          buildNoteStackClip(
            buildChord(root, steps),
            pickOne(noteStackInstruments[difficulty], random),
          ),
        ],
        stage:
          difficulty === 1
            ? { kind: "keyboard", lowest: "C3", highest: "B5", marked: [] }
            : { kind: "gramophone" },
      },
      choices: [...choices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: buildNoteStackFace(choice),
  }),
  findChoiceSound: (choice) =>
    buildNoteStackClip(
      noteStackCardNotes.slice(0, readNoteCount(choice)).map(findPitchOf),
      "piano",
    ),
});

type PlayerFigure = "melody" | "arpeggio" | "timpani" | "rhythm";

interface InstrumentPlayer {
  instrument: Instrument;
  model: MusicModel;
  lowestRoot: number;
  highestRoot: number;
  figure: PlayerFigure;
  tempo: number;
}

const violinPlayer: InstrumentPlayer = {
  instrument: "violin",
  model: "violin",
  lowestRoot: 67,
  highestRoot: 74,
  figure: "melody",
  tempo: 112,
};

const instrumentPlayers = new Map<string, InstrumentPlayer>(
  Object.entries({
    violin: violinPlayer,
    cello: {
      instrument: "cello",
      model: "cello",
      lowestRoot: 48,
      highestRoot: 55,
      figure: "melody",
      tempo: 96,
    },
    "double-bass": {
      instrument: "double-bass",
      model: "double-bass",
      lowestRoot: 36,
      highestRoot: 43,
      figure: "melody",
      tempo: 88,
    },
    harp: {
      instrument: "harp",
      model: "harp",
      lowestRoot: 48,
      highestRoot: 55,
      figure: "arpeggio",
      tempo: 112,
    },
    guitar: {
      instrument: "guitar",
      model: "guitar",
      lowestRoot: 52,
      highestRoot: 57,
      figure: "arpeggio",
      tempo: 104,
    },
    flute: {
      instrument: "flute",
      model: "flute",
      lowestRoot: 72,
      highestRoot: 79,
      figure: "melody",
      tempo: 116,
    },
    recorder: {
      instrument: "recorder",
      model: "recorder",
      lowestRoot: 72,
      highestRoot: 77,
      figure: "melody",
      tempo: 108,
    },
    clarinet: {
      instrument: "clarinet",
      model: "clarinet",
      lowestRoot: 55,
      highestRoot: 62,
      figure: "melody",
      tempo: 104,
    },
    oboe: {
      instrument: "oboe",
      model: "oboe",
      lowestRoot: 65,
      highestRoot: 72,
      figure: "melody",
      tempo: 100,
    },
    trumpet: {
      instrument: "trumpet",
      model: "trumpet",
      lowestRoot: 62,
      highestRoot: 69,
      figure: "melody",
      tempo: 112,
    },
    "french-horn": {
      instrument: "french-horn",
      model: "french-horn",
      lowestRoot: 53,
      highestRoot: 60,
      figure: "melody",
      tempo: 92,
    },
    trombone: {
      instrument: "trombone",
      model: "trombone",
      lowestRoot: 43,
      highestRoot: 50,
      figure: "melody",
      tempo: 92,
    },
    tuba: {
      instrument: "tuba",
      model: "tuba",
      lowestRoot: 34,
      highestRoot: 41,
      figure: "melody",
      tempo: 84,
    },
    timpani: {
      instrument: "timpani",
      model: "timpani",
      lowestRoot: 45,
      highestRoot: 50,
      figure: "timpani",
      tempo: 100,
    },
    piano: {
      instrument: "piano",
      model: "piano",
      lowestRoot: 60,
      highestRoot: 67,
      figure: "melody",
      tempo: 112,
    },
    xylophone: {
      instrument: "xylophone",
      model: "xylophone",
      lowestRoot: 72,
      highestRoot: 79,
      figure: "melody",
      tempo: 120,
    },
    triangle: {
      instrument: "triangle",
      model: "triangle",
      lowestRoot: 0,
      highestRoot: 0,
      figure: "rhythm",
      tempo: 100,
    },
    drum: {
      instrument: "bass-drum",
      model: "big-drum",
      lowestRoot: 0,
      highestRoot: 0,
      figure: "rhythm",
      tempo: 100,
    },
  }),
);

const findInstrumentPlayer = (name: string): InstrumentPlayer =>
  instrumentPlayers.get(name) ?? violinPlayer;

const playerMelodies = [
  "C4 D4 E4 F4 G4:2",
  "G4 E4 C4 E4 G4:2",
  "C4 E4 D4 F4 E4:2",
  "E4 D4 C4 D4 E4 E4 E4:2",
] as const;

const playerArpeggio =
  "C4:0.5 E4:0.5 G4:0.5 C5:0.5 E5:0.5 C5:0.5 G4:0.5 E4:0.5 C4:2";
const playerTimpaniFigure = "C4 G3 C4 G3 C4:0.25 C4:0.25 C4:0.25 C4:0.25 C4:2";
const playerRhythm = "ta ti-ti ta ta-a";

const buildPlayerNotes = (
  player: InstrumentPlayer,
  root: number,
  melody: string,
): MusicNote[] => {
  if (player.figure === "rhythm") {
    return buildRhythmNotes(playerRhythm);
  }
  const figureByKind: Record<Exclude<PlayerFigure, "rhythm">, string> = {
    melody,
    arpeggio: playerArpeggio,
    timpani: playerTimpaniFigure,
  };
  return transposeNotes(buildTune(figureByKind[player.figure]), root - 60);
};

const buildPlayerClip = (
  player: InstrumentPlayer,
  root: number,
  melody: string,
): MusicClip =>
  buildClip({ tempo: player.tempo }, [
    buildVoice(player.instrument, buildPlayerNotes(player, root, melody)),
  ]);

const buildRandomPlayerClip = (
  name: string,
  random: () => number,
): MusicClip => {
  const player = findInstrumentPlayer(name);
  return buildPlayerClip(
    player,
    pickWholeNumber(player.lowestRoot, player.highestRoot, random),
    pickOne(playerMelodies, random),
  );
};

const buildPlayerSound = (name: string): MusicClip => {
  const player = findInstrumentPlayer(name);
  return buildPlayerClip(
    player,
    Math.round((player.lowestRoot + player.highestRoot) / 2),
    playerMelodies[0],
  );
};

type OrchestraFamily = "strings" | "woodwind" | "brass" | "percussion";

const orchestraFamilies = new Map<string, OrchestraFamily>(
  Object.entries({
    violin: "strings",
    cello: "strings",
    "double-bass": "strings",
    harp: "strings",
    flute: "woodwind",
    clarinet: "woodwind",
    oboe: "woodwind",
    trumpet: "brass",
    "french-horn": "brass",
    trombone: "brass",
    tuba: "brass",
    timpani: "percussion",
  }),
);

const orchestraInstruments = [...orchestraFamilies.keys()];

const firstOrchestraInstruments = [
  "violin",
  "double-bass",
  "harp",
  "flute",
  "trumpet",
  "tuba",
  "timpani",
];

const pickFamilyChoices = (answer: string, random: () => number): string[] => {
  const family = orchestraFamilies.get(answer);
  const others = orchestraInstruments.filter(
    (instrument) => instrument !== answer,
  );
  const sameFamily = others.filter(
    (instrument) => orchestraFamilies.get(instrument) === family,
  );
  const otherFamilies = others.filter(
    (instrument) => orchestraFamilies.get(instrument) !== family,
  );
  const distractors = [
    ...shuffleValues(sameFamily, random),
    ...shuffleValues(otherFamilies, random),
  ].slice(0, 3);
  return [answer, ...distractors];
};

export const orchestraSeatingPlan = defineMusicGame({
  gameType: "orchestra-seating-plan",
  title: "Orchestra seating plan",
  skillId: "music.orchestral-instruments",
  instruction: "Which instrument of the orchestra is playing?",
  hint: "Not quite. Is it high or low? Is it a string, woodwind, brass or percussion sound? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const pool =
      difficulty === 1 ? firstOrchestraInstruments : orchestraInstruments;
    const answer = pickOne(pool, random);
    return {
      prompt: {
        ask: "Which instrument?",
        clips: [buildRandomPlayerClip(answer, random)],
        stage: { kind: "gramophone" },
      },
      choices:
        difficulty === 3
          ? pickFamilyChoices(answer, random)
          : pickChoices(answer, pool, random, difficulty === 1 ? 3 : 4),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: findInstrumentPlayer(choice).model,
  }),
  describeChoice: (choice) => choice.replace("-", " "),
  findChoiceSound: buildPlayerSound,
});

const textures = ["unison", "harmony", "round"] as const;
type Texture = (typeof textures)[number];

const isTexture = (value: string): value is Texture =>
  textures.some((texture) => texture === value);

const textureDescriptions: Record<Texture, string> = {
  unison: "Unison: both parts play the same notes together",
  harmony: "Harmony: the parts play different notes that fit together",
  round: "Round: the second part starts the same tune later",
};

interface RoundTune {
  tune: string;
  entryBeats: number;
  tempo: number;
}

const roundTunes: readonly RoundTune[] = [
  { tune: traditionalTunes.frereJacques, entryBeats: 8, tempo: 160 },
  {
    tune: "C4:1.5 C4:1.5 C4 D4:0.5 E4:1.5 E4 D4:0.5 E4 F4:0.5 G4:3",
    entryBeats: 6,
    tempo: 132,
  },
];

const cMajorPitchClasses = [0, 2, 4, 5, 7, 9, 11] as const;

const shiftWithinCMajor = (pitch: number, steps: number): number => {
  const octave = Math.floor(pitch / 12);
  const degree = cMajorPitchClasses.findIndex(
    (pitchClass) => pitchClass === pitch % 12,
  );
  if (degree === -1) {
    return pitch;
  }
  const shifted = degree + steps;
  const octaveShift = Math.floor(shifted / 7);
  const shiftedDegree = shifted - octaveShift * 7;
  return (octave + octaveShift) * 12 + cMajorPitchClasses[shiftedDegree];
};

const harmonyShifts = [2, -5] as const;

const buildHarmonyNotes = (
  notes: readonly MusicNote[],
  steps: number,
): MusicNote[] =>
  notes.map((note) => ({
    ...note,
    pitches: note.pitches.map((pitch) => shiftWithinCMajor(pitch, steps)),
  }));

const roundKeyShifts = [0, 2, 5, -3] as const;

const pickTextureInstruments = (
  difficulty: MusicDifficulty,
  random: () => number,
): [Instrument, Instrument] => {
  const melodic: readonly Instrument[] = [
    "flute",
    "violin",
    "recorder",
    "clarinet",
    "oboe",
  ];
  if (difficulty === 1) {
    return [
      pickOne<Instrument>(["piano", "xylophone", "marimba"], random),
      pickOne(melodic, random),
    ];
  }
  if (difficulty === 2) {
    const [first, second] = shuffleValues(melodic, random);
    return [first, second];
  }
  const shared = pickOne(melodic, random);
  return [shared, shared];
};

const buildTextureClip = (
  texture: Texture,
  roundTune: RoundTune,
  keyShift: number,
  harmonyShift: number,
  [firstInstrument, secondInstrument]: [Instrument, Instrument],
): MusicClip => {
  const tune = buildTune(roundTune.tune, { length: legatoLength });
  const secondNotes =
    texture === "harmony" ? buildHarmonyNotes(tune, harmonyShift) : tune;
  return buildClip({ tempo: roundTune.tempo }, [
    buildVoice(firstInstrument, transposeNotes(tune, keyShift)),
    buildVoice(secondInstrument, transposeNotes(secondNotes, keyShift), {
      loudness: 0.85,
      startBeat: texture === "round" ? roundTune.entryBeats : 0,
    }),
  ]);
};

export const roundAndRound = defineMusicGame({
  gameType: "round-and-round",
  title: "Round and round",
  skillId: "music.unison-harmony-and-rounds",
  instruction: "Unison, harmony, or a round?",
  hint: "Not quite. Do both parts start together? Do they play the very same notes? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(textures, random);
    return {
      prompt: {
        ask: "Unison, harmony or round?",
        clips: [
          buildTextureClip(
            answer,
            pickOne(roundTunes, random),
            pickOne(roundKeyShifts, random),
            pickOne(harmonyShifts, random),
            pickTextureInstruments(difficulty, random),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...textures],
      answer,
    };
  },
  findChoiceArt: (choice): ChoiceArt => ({
    kind: "card",
    face: { kind: "picture", icon: isTexture(choice) ? choice : "unison" },
  }),
  describeChoice: (choice) =>
    isTexture(choice) ? textureDescriptions[choice] : choice,
  findChoiceSound: (choice) =>
    isTexture(choice)
      ? buildTextureClip(choice, roundTunes[1], 0, 2, ["recorder", "violin"])
      : undefined,
});

const playingMethods = ["blown", "bowed", "plucked", "struck"] as const;
type PlayingMethod = (typeof playingMethods)[number];

const isPlayingMethod = (value: string): value is PlayingMethod =>
  playingMethods.some((method) => method === value);

const playingMethodDescriptions: Record<PlayingMethod, string> = {
  blown: "Blown: you blow into it",
  bowed: "Bowed: you draw a bow across the strings",
  plucked: "Plucked: you pluck the strings with your fingers",
  struck: "Struck: you hit it",
};

const playingMethodsByInstrument = new Map<string, PlayingMethod>(
  Object.entries({
    violin: "bowed",
    cello: "bowed",
    "double-bass": "bowed",
    harp: "plucked",
    guitar: "plucked",
    flute: "blown",
    clarinet: "blown",
    oboe: "blown",
    recorder: "blown",
    trumpet: "blown",
    trombone: "blown",
    tuba: "blown",
    "french-horn": "blown",
    piano: "struck",
    xylophone: "struck",
    timpani: "struck",
    triangle: "struck",
    drum: "struck",
  }),
);

const howIsItPlayedPools: Record<MusicDifficulty, readonly string[]> = {
  1: [
    "violin",
    "cello",
    "harp",
    "guitar",
    "flute",
    "recorder",
    "trumpet",
    "drum",
    "triangle",
    "xylophone",
  ],
  2: [
    "violin",
    "cello",
    "double-bass",
    "harp",
    "guitar",
    "flute",
    "recorder",
    "clarinet",
    "oboe",
    "trumpet",
    "trombone",
    "drum",
    "triangle",
    "xylophone",
    "timpani",
  ],
  3: [...playingMethodsByInstrument.keys()],
};

export const howIsItPlayed = defineMusicGame({
  gameType: "how-is-it-played",
  title: "How is it played?",
  skillId: "music.how-instruments-make-sound",
  instruction: "Is it blown, bowed, plucked or struck?",
  hint: "Not quite. Imagine playing it. Would you blow, use a bow, pluck with your fingers, or hit it?",
  hintKind: "look",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const instrumentName = pickOne(howIsItPlayedPools[difficulty], random);
    const answer = playingMethodsByInstrument.get(instrumentName) ?? "struck";
    return {
      prompt: {
        ask: "How is it played?",
        clips: [buildRandomPlayerClip(instrumentName, random)],
        stage: {
          kind: "instrument",
          model: findInstrumentPlayer(instrumentName).model,
        },
      },
      choices: pickChoices(
        answer,
        playingMethods,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => {
    const icon: PictureIcon = isPlayingMethod(choice) ? choice : "struck";
    return { kind: "card", face: { kind: "picture", icon } };
  },
  describeChoice: (choice) =>
    isPlayingMethod(choice) ? playingMethodDescriptions[choice] : choice,
});

export const yearFourMusicGames = [
  spotTheMistake,
  sunshineOrRain,
  pianoKeyDetective,
  dynamicsJourney,
  shapeOfTheSong,
  timeSignatureTiles,
  noteStack,
  orchestraSeatingPlan,
  roundAndRound,
  howIsItPlayed,
] as const;
