import {
  defineMusicGame,
  findChoiceCountFor,
  pickChoices,
  pickOne,
  pickWholeNumber,
  type MusicDifficulty,
} from "./music-game.js";
import type { MusicModel } from "./music-prompts.js";
import {
  buildClip,
  buildMelody,
  buildNote,
  buildRest,
  buildRhythmNotes,
  buildVoice,
  countRhythmBeats,
  findPitchOf,
  legatoLength,
  loudnessLevels,
  nameNoteOf,
  type Instrument,
  type MusicClip,
  type MusicNote,
  type MusicVoice,
} from "./music-theory.js";
import {
  buildTune,
  takeBeats,
  traditionalTuneNames,
  traditionalTunes,
  transposeNotes,
} from "./music-tunes.js";

const repeatNotes = (notes: readonly MusicNote[], times: number): MusicNote[] =>
  Array.from({ length: times }, () => [...notes]).flat();

const buildTraditionalTuneNotes = (
  largestBeats: number,
  semitones: number,
  random: () => number,
  loudness: number = loudnessLevels.forte,
): MusicNote[] =>
  transposeNotes(
    takeBeats(
      buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)], {
        loudness,
      }),
      largestBeats,
    ),
    semitones,
  );

interface AccentKit {
  strongInstrument: Instrument;
  weakInstrument: Instrument;
  findStrongPitches: (root: number) => number[];
  findWeakPitches: (root: number) => number[];
}

const drumAccentKit: AccentKit = {
  strongInstrument: "bass-drum",
  weakInstrument: "woodblock",
  findStrongPitches: () => [],
  findWeakPitches: () => [],
};

const pianoAccentKit: AccentKit = {
  strongInstrument: "piano",
  weakInstrument: "piano",
  findStrongPitches: (root) => [root - 12],
  findWeakPitches: (root) => [root + 4, root + 7, root + 12],
};

const bandAccentKit: AccentKit = {
  strongInstrument: "tuba",
  weakInstrument: "strings",
  findStrongPitches: (root) => [root - 24],
  findWeakPitches: (root) => [root + 4, root + 7],
};

const accentKits = [drumAccentKit, pianoAccentKit, bandAccentKit] as const;

interface MeterShape {
  beatsPerBar: number;
  barCount: number;
  kit: AccentKit;
  root: number;
  tempo: number;
  weakLoudness: number;
}

const buildMeterClip = ({
  beatsPerBar,
  barCount,
  kit,
  root,
  tempo,
  weakLoudness,
}: MeterShape): MusicClip => {
  const strongBar = [
    buildNote(kit.findStrongPitches(root), 1, {
      loudness: loudnessLevels.fortissimo,
    }),
    buildRest(beatsPerBar - 1),
  ];
  const weakBar = [
    buildRest(1),
    ...Array.from({ length: beatsPerBar - 1 }, () =>
      buildNote(kit.findWeakPitches(root), 1, { loudness: weakLoudness }),
    ),
  ];
  return buildClip({ tempo }, [
    buildVoice(kit.strongInstrument, repeatNotes(strongBar, barCount)),
    buildVoice(kit.weakInstrument, repeatNotes(weakBar, barCount)),
  ]);
};

const nameBeatsPerBar = (beatsPerBar: number): string =>
  `${String(beatsPerBar)} beats in a bar`;

const beatsPerBarChoices = new Map<string, number>(
  [2, 3, 4].map((beatsPerBar) => [nameBeatsPerBar(beatsPerBar), beatsPerBar]),
);

const findBeatsPerBar = (choice: string): number =>
  beatsPerBarChoices.get(choice) ?? 4;

const meterPools: Record<MusicDifficulty, number[]> = {
  1: [2, 3],
  2: [2, 3, 4],
  3: [2, 3, 4],
};

const weakLoudnessByDifficulty: Record<MusicDifficulty, number> = {
  1: loudnessLevels.piano,
  2: 0.4,
  3: loudnessLevels.mezzo,
};

const meterBeatsHeard = 12;

export const marchOrWaltz = defineMusicGame({
  gameType: "march-or-waltz",
  title: "March or waltz?",
  skillId: "music.beats-in-a-bar",
  instruction: "How many beats are in each bar?",
  hint: "Not quite. Say ONE loudly on the big strong sound, then count the quiet beats after it.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = meterPools[difficulty];
    const beatsPerBar = pickOne(pool, random);
    return {
      prompt: {
        ask: "How many beats in a bar?",
        clips: [
          buildMeterClip({
            beatsPerBar,
            barCount: meterBeatsHeard / beatsPerBar,
            kit: pickOne(accentKits, random),
            root: pickOne([57, 60, 62, 65], random),
            tempo: pickOne([104, 116, 128], random),
            weakLoudness: weakLoudnessByDifficulty[difficulty],
          }),
        ],
        stage: { kind: "drum", beatLamps: 0 },
      },
      choices: pool.map(nameBeatsPerBar),
      answer: nameBeatsPerBar(beatsPerBar),
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "beat-groups", beatsPerBar: findBeatsPerBar(choice) },
  }),
  findChoiceSound: (choice) => {
    const beatsPerBar = findBeatsPerBar(choice);
    return buildMeterClip({
      beatsPerBar,
      barCount: 2,
      kit: pianoAccentKit,
      root: 60,
      tempo: 116,
      weakLoudness: loudnessLevels.piano,
    });
  },
});

const noteValuePools: Record<MusicDifficulty, string[]> = {
  1: ["ta", "ta-a", "ta-a-a-a"],
  2: ["ta", "ta-a", "ta-a-a-a", "ti-ti", "sh"],
  3: ["ta", "ta-a", "ta-a-a", "ta-a-a-a", "ti-ti", "sh"],
};

const noteValueChoices: Record<MusicDifficulty, string[]> = {
  1: ["1", "2", "4"],
  2: ["1", "2", "4"],
  3: ["1", "2", "3", "4"],
};

const noteValueAsks = new Map<string, string>(
  Object.entries({
    "ti-ti": "How many beats for both notes?",
    sh: "How many beats of silence?",
  }),
);

const describeBeatCount = (choice: string): string =>
  choice === "1" ? "1 beat" : `${choice} beats`;

export const howManyBeats = defineMusicGame({
  gameType: "how-many-beats",
  title: "How many beats?",
  skillId: "music.note-values",
  instruction: "How many beats does this note last?",
  hint: "Not quite. A crotchet is 1 beat, a minim is 2 and a semibreve is 4. Look again.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const rhythm = pickOne(noteValuePools[difficulty], random);
    const beats = countRhythmBeats(rhythm);
    const pitch = pickOne([60, 64, 67, 72], random);
    return {
      prompt: {
        ask: noteValueAsks.get(rhythm) ?? "How many beats?",
        clips: [],
        stage: { kind: "music-stand", face: { kind: "rhythm", rhythm } },
        reward: buildClip({ tempo: 76 }, [
          buildVoice(
            pickOne(["piano", "recorder", "violin"], random),
            buildRhythmNotes(rhythm, [pitch], { length: legatoLength }),
          ),
          buildVoice(
            "tick",
            Array.from({ length: beats }, () =>
              buildNote([], 1, { loudness: loudnessLevels.piano }),
            ),
          ),
        ]),
      },
      choices: noteValueChoices[difficulty],
      answer: String(beats),
    };
  },
  describeChoice: describeBeatCount,
});

interface DynamicMarking {
  symbol: string;
  loudness: number;
  meaning: string;
}

const dynamicMarkings = new Map<string, DynamicMarking>(
  Object.entries({
    fortissimo: {
      symbol: "ff",
      loudness: loudnessLevels.fortissimo,
      meaning: "very loud",
    },
    forte: { symbol: "f", loudness: loudnessLevels.forte, meaning: "loud" },
    piano: { symbol: "p", loudness: loudnessLevels.piano, meaning: "quiet" },
    pianissimo: {
      symbol: "pp",
      loudness: loudnessLevels.pianissimo,
      meaning: "very quiet",
    },
  }),
);

const forteMarking: DynamicMarking = {
  symbol: "f",
  loudness: loudnessLevels.forte,
  meaning: "loud",
};

const findDynamicMarking = (choice: string): DynamicMarking =>
  dynamicMarkings.get(choice) ?? forteMarking;

const dynamicPools: Record<MusicDifficulty, string[]> = {
  1: ["forte", "piano"],
  2: ["fortissimo", "forte", "piano", "pianissimo"],
  3: ["fortissimo", "forte", "piano", "pianissimo"],
};

const dynamicInstrumentPools: Record<MusicDifficulty, Instrument[]> = {
  1: ["piano", "trumpet", "xylophone"],
  2: ["piano"],
  3: ["piano", "violin", "flute", "clarinet", "trumpet"],
};

export const forteOrPiano = defineMusicGame({
  gameType: "forte-or-piano",
  title: "Forte or piano?",
  skillId: "music.forte-and-piano",
  instruction: "Is it forte, loud, or piano, quiet?",
  hint: "Not quite. Fortissimo is very loud, forte is loud, piano is quiet and pianissimo is very quiet. Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = dynamicPools[difficulty];
    const answer = pickOne(pool, random);
    const { loudness } = findDynamicMarking(answer);
    return {
      prompt: {
        ask: difficulty === 1 ? "Forte or piano?" : "How loud is it?",
        clips: [
          buildClip({ tempo: pickOne([100, 112, 120], random) }, [
            buildVoice(
              pickOne(dynamicInstrumentPools[difficulty], random),
              buildTraditionalTuneNotes(
                7,
                pickOne([0, 2, 5, -3], random),
                random,
                loudness,
              ),
            ),
          ]),
        ],
        stage: { kind: "gramophone" },
      },
      choices: pool,
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "symbol", text: findDynamicMarking(choice).symbol },
  }),
  describeChoice: (choice) => {
    const { symbol, meaning } = findDynamicMarking(choice);
    return `${choice} (${symbol}): ${meaning}`;
  },
  findChoiceSound: (choice) =>
    buildClip({ tempo: 112 }, [
      buildVoice(
        "piano",
        buildTune("C4 E4 G4 C5:2", {
          loudness: findDynamicMarking(choice).loudness,
        }),
      ),
    ]),
});

interface TempoMarking {
  tempo: number;
  meaning: string;
}

const tempoMarkings = new Map<string, TempoMarking>(
  Object.entries({
    adagio: { tempo: 60, meaning: "slow" },
    andante: { tempo: 88, meaning: "at a walking pace" },
    allegro: { tempo: 140, meaning: "fast and lively" },
    presto: { tempo: 184, meaning: "very fast" },
  }),
);

const allegroMarking: TempoMarking = { tempo: 140, meaning: "fast and lively" };

const findTempoMarking = (choice: string): TempoMarking =>
  tempoMarkings.get(choice) ?? allegroMarking;

const tempoPools: Record<MusicDifficulty, string[]> = {
  1: ["adagio", "allegro"],
  2: ["adagio", "andante", "allegro"],
  3: ["adagio", "andante", "allegro", "presto"],
};

const tempoTuneSeconds = 5.5;

export const allegroOrAdagio = defineMusicGame({
  gameType: "allegro-or-adagio",
  title: "Allegro or adagio?",
  skillId: "music.tempo-words",
  instruction: "Which word matches the speed?",
  hint: "Not quite. Tap along with the music. Adagio strolls, andante walks, allegro runs and presto races.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = tempoPools[difficulty];
    const answer = pickOne(pool, random);
    const tempo =
      findTempoMarking(answer).tempo + pickWholeNumber(-4, 4, random);
    return {
      prompt: {
        ask: "Which tempo?",
        clips: [
          buildClip({ tempo }, [
            buildVoice(
              pickOne(["piano", "xylophone", "flute", "violin"], random),
              buildTraditionalTuneNotes(
                Math.round((tempo * tempoTuneSeconds) / 60),
                pickOne([0, 2, 5, -3], random),
                random,
              ),
            ),
          ]),
        ],
        stage: { kind: "instrument", model: "metronome" },
      },
      choices: pool,
      answer,
    };
  },
  findChoiceArt: () => ({ kind: "model", model: "metronome" }),
  describeChoice: (choice) => `${choice}: ${findTempoMarking(choice).meaning}`,
  findChoiceSound: (choice) =>
    buildClip({ tempo: findTempoMarking(choice).tempo }, [
      buildVoice(
        "tick",
        Array.from({ length: 4 }, () => buildNote([], 1)),
      ),
    ]),
});

interface OstinatoLevel {
  riffs: string[];
  fewestRepeats: number;
  mostRepeats: number;
  tempo: number;
  choices: string[];
}

const oneBarRiffs = [
  "C4 E4 G4 E4",
  "C4:0.5 C4:0.5 G4 A4 G4",
  "E4 G4:0.5 G4:0.5 A4 -:1",
  "C4 G3 A3:0.5 B3:0.5 C4",
];

const twoBarRiffs = [
  "C4 E4 G4 A4:2 G4",
  "C4:0.5 D4:0.5 E4 G4 E4:2 D4",
  "G3 C4 E4 D4 B3 G3",
];

const ostinatoLevels: Record<MusicDifficulty, OstinatoLevel> = {
  1: {
    riffs: oneBarRiffs,
    fewestRepeats: 2,
    mostRepeats: 4,
    tempo: 120,
    choices: ["2", "3", "4"],
  },
  2: {
    riffs: oneBarRiffs,
    fewestRepeats: 2,
    mostRepeats: 5,
    tempo: 132,
    choices: ["2", "3", "4", "5"],
  },
  3: {
    riffs: twoBarRiffs,
    fewestRepeats: 2,
    mostRepeats: 4,
    tempo: 150,
    choices: ["2", "3", "4", "5"],
  },
};

const buildDroneVoice = (
  root: number,
  totalBeats: number,
  instrument: Instrument,
): MusicVoice =>
  buildVoice(instrument, [
    buildNote([root - 12, root - 5], totalBeats, {
      length: legatoLength,
      loudness: loudnessLevels.piano,
    }),
  ]);

const heldMelodySteps = [12, 14, 16, 19, 21] as const;
const heldMelodyBeats = 3;

const buildHeldMelodyVoice = (
  root: number,
  totalBeats: number,
  random: () => number,
): MusicVoice =>
  buildVoice(
    pickOne(["flute", "violin", "oboe"], random),
    buildMelody(
      Array.from(
        { length: Math.floor(totalBeats / heldMelodyBeats) },
        () => root + pickOne(heldMelodySteps, random),
      ),
      heldMelodyBeats,
      { length: legatoLength, loudness: loudnessLevels.mezzo },
    ),
  );

export const loopCounter = defineMusicGame({
  gameType: "loop-counter",
  title: "Loop counter",
  skillId: "music.ostinato",
  instruction: "How many times does the pattern play?",
  hint: "Not quite. Listen for the start of the pattern each time it comes back, and count on your fingers.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const { riffs, fewestRepeats, mostRepeats, tempo, choices } =
      ostinatoLevels[difficulty];
    const repeats = pickWholeNumber(fewestRepeats, mostRepeats, random);
    const semitones = pickOne([0, 2, -3, 5], random);
    const root = 60 + semitones;
    const riff = transposeNotes(buildTune(pickOne(riffs, random)), semitones);
    const ostinato = repeatNotes(riff, repeats);
    const totalBeats = ostinato.reduce((total, { beats }) => total + beats, 0);
    const ostinatoVoice = buildVoice(
      pickOne(["xylophone", "marimba", "glockenspiel", "piano"], random),
      ostinato,
    );
    const overVoices =
      difficulty === 1
        ? []
        : [
            difficulty === 2
              ? buildDroneVoice(
                  root,
                  totalBeats,
                  pickOne(["strings", "organ", "cello"], random),
                )
              : buildHeldMelodyVoice(root, totalBeats, random),
          ];
    return {
      prompt: {
        ask: "How many times?",
        clips: [buildClip({ tempo }, [ostinatoVoice, ...overVoices])],
        stage: { kind: "gramophone" },
      },
      choices,
      answer: String(repeats),
    };
  },
  describeChoice: (choice) => `${choice} times`,
});

const staffNotePools: Record<MusicDifficulty, string[]> = {
  1: ["C4", "D4", "E4"],
  2: ["C4", "D4", "E4", "F4", "G4"],
  3: ["C4", "D4", "E4", "F4", "G4", "A4"],
};

const staffLetterPools: Record<MusicDifficulty, string[]> = {
  1: ["C", "D", "E", "F"],
  2: ["C", "D", "E", "F", "G"],
  3: ["C", "D", "E", "F", "G", "A"],
};

const findStaffNote = (letter: string): string =>
  staffNotePools[3].find((note) => nameNoteOf(note) === letter) ?? "C4";

const buildStaffNoteClip = (note: string, instrument: Instrument): MusicClip =>
  buildClip({ tempo: 90 }, [
    buildVoice(instrument, buildMelody([findPitchOf(note)], 2)),
  ]);

export const staffClimbers = defineMusicGame({
  gameType: "staff-climbers",
  title: "Staff climbers",
  skillId: "music.notes-on-the-stave",
  instruction: "Tap the letter name of the note.",
  hint: "Not quite. Middle C sits on its own little line below the stave. Count up line, space, line from there.",
  hintKind: "look",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const note = pickOne(staffNotePools[difficulty], random);
    const answer = nameNoteOf(note);
    return {
      prompt: {
        ask: "Which note?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: {
            kind: "staff",
            clef: "treble",
            chords: [{ notes: [note], beats: 1 }],
            keySignature: 0,
          },
        },
        reward: buildStaffNoteClip(
          note,
          pickOne(["piano", "glockenspiel"], random),
        ),
      },
      choices: pickChoices(answer, staffLetterPools[difficulty], random),
      answer,
    };
  },
  findChoiceSound: (choice) =>
    buildStaffNoteClip(findStaffNote(choice), "piano"),
});

type SoundLayer = "melody" | "drone" | "drum";

const layerCombinations = new Map<number, SoundLayer[][]>([
  [1, [["melody"], ["drum"]]],
  [
    2,
    [
      ["melody", "drone"],
      ["melody", "drum"],
      ["drone", "drum"],
    ],
  ],
  [3, [["melody", "drone", "drum"]]],
]);

const nameLayerCount = (layerCount: number): string =>
  layerCount === 1 ? "1 layer" : `${String(layerCount)} layers`;

const layerCountChoices = new Map<string, number>(
  [1, 2, 3].map((layerCount) => [nameLayerCount(layerCount), layerCount]),
);

const findLayerCount = (choice: string): number =>
  layerCountChoices.get(choice) ?? 1;

const layerCountPools: Record<MusicDifficulty, number[]> = {
  1: [1, 3],
  2: [1, 2, 3],
  3: [1, 2, 3],
};

interface LayerInstruments {
  melody: Instrument[];
  drone: Instrument[];
  drum: Instrument[];
}

const layerInstrumentsByDifficulty: Record<MusicDifficulty, LayerInstruments> =
  {
    1: {
      melody: ["flute", "trumpet", "recorder"],
      drone: ["tuba", "organ"],
      drum: ["hand-drum", "woodblock"],
    },
    2: {
      melody: ["flute", "violin", "clarinet", "xylophone"],
      drone: ["cello", "organ", "bassoon"],
      drum: ["hand-drum", "snare-drum", "tambourine"],
    },
    3: {
      melody: ["violin", "clarinet", "piano"],
      drone: ["strings", "cello", "piano"],
      drum: ["snare-drum", "maracas", "tambourine"],
    },
  };

const drumOstinatos = [
  "ta ti-ti ta ta",
  "ti-ti ta ti-ti ta",
  "ta ta ti-ti ti-ti",
];
const layerBeats = 8;

const buildLayerVoice = (
  layer: SoundLayer,
  root: number,
  instruments: LayerInstruments,
  random: () => number,
): MusicVoice => {
  if (layer === "melody") {
    return buildVoice(
      pickOne(instruments.melody, random),
      buildTraditionalTuneNotes(layerBeats, root - 60, random),
    );
  }
  if (layer === "drone") {
    return buildVoice(
      pickOne(instruments.drone, random),
      repeatNotes(
        [
          buildNote([root - 24, root - 17], layerBeats / 2, {
            length: legatoLength,
            loudness: loudnessLevels.mezzo,
          }),
        ],
        2,
      ),
    );
  }
  return buildVoice(
    pickOne(instruments.drum, random),
    repeatNotes(
      buildRhythmNotes(pickOne(drumOstinatos, random), [], {
        loudness: loudnessLevels.mezzo,
      }),
      2,
    ),
  );
};

export const layerCake = defineMusicGame({
  gameType: "layer-cake",
  title: "Layer cake",
  skillId: "music.layers-of-sound",
  instruction: "How many layers of sound can you hear?",
  hint: "Not quite. Listen for a tune, a long low hum and a drum pattern. Which ones are there?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = layerCountPools[difficulty];
    const layerCount = pickOne(pool, random);
    const layers = pickOne(layerCombinations.get(layerCount) ?? [], random);
    const root = pickOne([60, 62, 65, 67], random);
    const instruments = layerInstrumentsByDifficulty[difficulty];
    return {
      prompt: {
        ask: "How many layers?",
        clips: [
          buildClip(
            { tempo: pickOne([96, 108, 120], random) },
            layers.map((layer) =>
              buildLayerVoice(layer, root, instruments, random),
            ),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: pool.map(nameLayerCount),
      answer: nameLayerCount(layerCount),
    };
  },
  findChoiceArt: (choice) => ({
    kind: "cake",
    layers: findLayerCount(choice),
  }),
});

const orchestraFamilyNames = [
  "strings",
  "woodwind",
  "brass",
  "percussion",
] as const;
type OrchestraFamily = (typeof orchestraFamilyNames)[number];

interface OrchestraPlayer {
  instrument: Instrument;
  family: OrchestraFamily;
  buildNotes: (random: () => number) => MusicNote[];
}

const melodyShapes = [
  [0, 2, 4, 5, 7],
  [0, 4, 7, 4, 0],
  [7, 5, 4, 2, 0],
  [0, 2, 4, 2, 0],
] as const;

const buildMelodyPlayer = (
  instrument: Instrument,
  family: OrchestraFamily,
  lowestPitch: number,
): OrchestraPlayer => ({
  instrument,
  family,
  buildNotes: (random) => [
    ...buildMelody(
      pickOne(melodyShapes, random).map((step) => lowestPitch + step),
    ),
    buildNote([lowestPitch], 2),
  ],
});

const buildDrumPlayer = (instrument: Instrument): OrchestraPlayer => ({
  instrument,
  family: "percussion",
  buildNotes: (random) =>
    buildRhythmNotes(
      pickOne(["ta ti-ti ta ta ta-a", "ti-ti ti-ti ta ti-ka-ti-ka ta"], random),
    ),
});

const harpPlayer: OrchestraPlayer = {
  instrument: "harp",
  family: "strings",
  buildNotes: () => [
    ...buildMelody([48, 52, 55, 60, 64, 67, 72, 76], 0.5),
    buildNote([79], 2),
  ],
};

const timpaniPlayer: OrchestraPlayer = {
  instrument: "timpani",
  family: "percussion",
  buildNotes: () => [
    ...buildMelody([48, 43, 48, 43]),
    ...buildMelody([48, 48, 48, 48], 0.25),
    buildNote([43], 2),
  ],
};

const orchestraPlayers: Record<MusicDifficulty, OrchestraPlayer[]> = {
  1: [
    buildMelodyPlayer("violin", "strings", 67),
    buildMelodyPlayer("flute", "woodwind", 72),
    buildMelodyPlayer("trumpet", "brass", 62),
    buildDrumPlayer("hand-drum"),
  ],
  2: [
    buildMelodyPlayer("cello", "strings", 48),
    buildMelodyPlayer("clarinet", "woodwind", 58),
    buildMelodyPlayer("trombone", "brass", 46),
    timpaniPlayer,
  ],
  3: [
    buildMelodyPlayer("double-bass", "strings", 40),
    harpPlayer,
    buildMelodyPlayer("oboe", "woodwind", 64),
    buildMelodyPlayer("bassoon", "woodwind", 48),
    buildMelodyPlayer("tuba", "brass", 41),
    buildMelodyPlayer("french-horn", "brass", 53),
    buildMelodyPlayer("xylophone", "percussion", 72),
    buildDrumPlayer("snare-drum"),
  ],
};

interface FamilyLeader {
  model: MusicModel;
  instrument: Instrument;
  name: string;
  pitches: number[];
}

const familyLeaders = new Map<string, FamilyLeader>(
  Object.entries({
    strings: {
      model: "violin",
      instrument: "violin",
      name: "the violin",
      pitches: [67, 71, 74],
    },
    woodwind: {
      model: "flute",
      instrument: "flute",
      name: "the flute",
      pitches: [72, 76, 79],
    },
    brass: {
      model: "trumpet",
      instrument: "trumpet",
      name: "the trumpet",
      pitches: [60, 64, 67],
    },
    percussion: {
      model: "big-drum",
      instrument: "bass-drum",
      name: "the drum",
      pitches: [],
    },
  }),
);

const drumLeader: FamilyLeader = {
  model: "big-drum",
  instrument: "bass-drum",
  name: "the drum",
  pitches: [],
};

const findFamilyLeader = (choice: string): FamilyLeader =>
  familyLeaders.get(choice) ?? drumLeader;

export const orchestraFamilies = defineMusicGame({
  gameType: "orchestra-families",
  title: "Orchestra families",
  skillId: "music.instrument-families",
  instruction: "Which family does this instrument belong to?",
  hint: "Not quite. Strings are bowed or plucked, woodwind and brass are blown, and percussion is hit or shaken.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const player = pickOne(orchestraPlayers[difficulty], random);
    return {
      prompt: {
        ask: "Which family?",
        clips: [
          buildClip({ tempo: pickOne([92, 104], random) }, [
            buildVoice(player.instrument, player.buildNotes(random)),
          ]),
        ],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        player.family,
        orchestraFamilyNames,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer: player.family,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: findFamilyLeader(choice).model,
  }),
  describeChoice: (choice) =>
    `${choice}, like ${findFamilyLeader(choice).name}`,
  findChoiceSound: (choice) => {
    const { instrument, pitches } = findFamilyLeader(choice);
    return buildClip({ tempo: 100 }, [
      buildVoice(
        instrument,
        pitches.length === 0
          ? buildRhythmNotes("ta ta ta-a")
          : buildMelody(pitches),
      ),
    ]);
  },
});

const noteRhythmNames = new Map<string, string>(
  Object.entries({
    ta: "crotchet, 1 beat",
    "ti-ti": "two quavers, 1 beat",
    "ta-a": "minim, 2 beats",
    "ta-a-a": "dotted minim, 3 beats",
    "ta-a-a-a": "semibreve, 4 beats",
  }),
);

const noteRhythms = [...noteRhythmNames.keys()];

const barGapPools: Record<MusicDifficulty, number[]> = {
  1: [1, 2],
  2: [1, 2, 3],
  3: [1, 2, 3],
};

const barFillerPools: Record<MusicDifficulty, string[]> = {
  1: ["ta", "ta-a"],
  2: ["ta", "ti-ti", "ta-a"],
  3: ["ta", "ti-ti", "sh", "ta-a", "ta-a-a"],
};

const beatsInABar = 4;

const buildBarStart = (
  beats: number,
  fillers: readonly string[],
  random: () => number,
): string[] => {
  const fitting = fillers.filter((filler) => countRhythmBeats(filler) <= beats);
  if (beats <= 0 || fitting.length === 0) {
    return [];
  }
  const filler = pickOne(fitting, random);
  return [
    filler,
    ...buildBarStart(beats - countRhythmBeats(filler), fillers, random),
  ];
};

const pickGapFiller = (gapBeats: number, random: () => number): string =>
  pickOne(
    noteRhythms.filter((rhythm) => countRhythmBeats(rhythm) === gapBeats),
    random,
  );

export const barBuilder = defineMusicGame({
  gameType: "bar-builder",
  title: "Bar builder",
  skillId: "music.complete-the-bar",
  instruction: "Which note fills the gap in the bar?",
  hint: "Not quite. Count the beats already in the bar, then work out how many are missing.",
  hintKind: "look",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const gapBeats = pickOne(barGapPools[difficulty], random);
    const barStart = buildBarStart(
      beatsInABar - gapBeats,
      barFillerPools[difficulty],
      random,
    ).join(" ");
    const answer = pickGapFiller(gapBeats, random);
    const candidates = noteRhythms.filter(
      (rhythm) => rhythm === answer || countRhythmBeats(rhythm) !== gapBeats,
    );
    return {
      prompt: {
        ask: "Which note fills the gap?",
        clips: [],
        stage: {
          kind: "music-stand",
          face: {
            kind: "rhythm",
            rhythm: barStart,
            timeSignature: { top: 4, bottom: 4 },
            gapBeats,
          },
        },
        reward: buildClip({ tempo: 96 }, [
          buildVoice(
            pickOne(["woodblock", "hand-drum", "clap"], random),
            buildRhythmNotes(`${barStart} ${answer}`),
          ),
        ]),
      },
      choices: pickChoices(
        answer,
        candidates,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "rhythm", rhythm: choice },
  }),
  describeChoice: (choice) => noteRhythmNames.get(choice) ?? choice,
  findChoiceSound: (choice) =>
    buildClip({ tempo: 96 }, [
      buildVoice("woodblock", buildRhythmNotes(choice)),
    ]),
});

const solfaSteps = new Map<string, number>(
  Object.entries({ do: 0, re: 2, mi: 4, so: 7, la: 9 }),
);

const solfaNames = [...solfaSteps.keys()];

const findSolfaStep = (choice: string): number => solfaSteps.get(choice) ?? 0;

const solfaPools: Record<MusicDifficulty, string[]> = {
  1: ["do", "mi", "so"],
  2: ["do", "re", "mi", "so"],
  3: solfaNames,
};

const buildSingleNoteClip = (
  pitch: number,
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 90 }, [buildVoice(instrument, buildMelody([pitch], 2))]);

export const solfaLadder = defineMusicGame({
  gameType: "solfa-ladder",
  title: "Solfa ladder",
  skillId: "music.do-re-mi",
  instruction: "First comes do. Find the mystery note.",
  hint: "Not quite. Sing up from do: do, re, mi, so, la. Which one matches the mystery note?",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = solfaPools[difficulty];
    const answer = pickOne(pool, random);
    const doPitch = pickOne([60, 62, 65, 67], random);
    const instrument = pickOne<Instrument>(
      ["piano", "glockenspiel", "voice", "recorder", "xylophone"],
      random,
    );
    return {
      prompt: {
        ask: "Which note?",
        clips: [
          buildSingleNoteClip(doPitch, instrument),
          buildSingleNoteClip(doPitch + findSolfaStep(answer), instrument),
        ],
        stage: { kind: "ladder", rungs: solfaNames },
      },
      choices: pickChoices(answer, pool, random),
      answer,
    };
  },
  findChoiceSound: (choice) =>
    buildSingleNoteClip(60 + findSolfaStep(choice), "piano"),
});

export const yearThreeMusicGames = [
  marchOrWaltz,
  howManyBeats,
  forteOrPiano,
  allegroOrAdagio,
  loopCounter,
  staffClimbers,
  layerCake,
  orchestraFamilies,
  barBuilder,
  solfaLadder,
] as const;
