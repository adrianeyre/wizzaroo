import {
  defineMusicGame,
  findChoiceCountFor,
  pickChoices,
  pickOne,
  pickWholeNumber,
  shuffleValues,
  type MusicDifficulty,
} from "./music-game.js";
import {
  moods,
  type ChangeOverTime,
  type ChoiceArt,
  type Mood,
  type MusicModel,
} from "./music-prompts.js";
import {
  buildChord,
  buildClip,
  buildMelody,
  buildNote,
  buildRest,
  buildRhythmClip,
  buildRhythmNotes,
  buildScale,
  buildVoice,
  legatoLength,
  loudnessLevels,
  majorScaleSteps,
  normalLength,
  parseRhythm,
  staccatoLength,
  type Instrument,
  type MusicClip,
  type MusicNote,
  type Swell,
} from "./music-theory.js";
import {
  buildTune,
  composerThemes,
  takeBeats,
  traditionalTuneNames,
  traditionalTunes,
  transposeNotes,
} from "./music-tunes.js";

const buildTraditionalNotes = (
  largestBeats: number,
  random: () => number,
): MusicNote[] =>
  takeBeats(
    buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)]),
    largestBeats,
  );

const collectDistractors = (
  answer: string,
  buildCandidate: () => string,
  isAcceptable: (candidate: string) => boolean,
  count: number,
): string[] => {
  const distractors = new Set<string>();
  for (let attempt = 0; distractors.size < count && attempt < 80; attempt++) {
    const candidate = buildCandidate();
    if (candidate !== answer && isAcceptable(candidate)) {
      distractors.add(candidate);
    }
  }
  return [...distractors];
};

const buildPattern = (
  length: number,
  palette: readonly string[],
  random: () => number,
): string[] => Array.from({ length }, () => pickOne(palette, random));

const changeOnePlace = (
  pattern: readonly string[],
  palette: readonly string[],
  random: () => number,
): string[] => {
  const position = pickWholeNumber(0, pattern.length - 1, random);
  const others = palette.filter((value) => value !== pattern[position]);
  return pattern.map((value, index) =>
    index === position ? pickOne(others, random) : value,
  );
};

const countDifferences = (first: string, second: string): number => {
  const secondWords = second.split(" ");
  return first.split(" ").filter((word, index) => word !== secondWords[index])
    .length;
};

const rhythmBeatCount = 4;
const soundedSyllables = ["ta", "ti-ti"] as const;

const rhythmTempos: Record<MusicDifficulty, number> = {
  1: 80,
  2: 96,
  3: 104,
};

const rhythmPalettes: Record<MusicDifficulty, readonly string[]> = {
  1: soundedSyllables,
  2: soundedSyllables,
  3: [...soundedSyllables, "sh"],
};

const buildAnswerRhythm = (
  difficulty: MusicDifficulty,
  random: () => number,
): string[] => {
  const sounded = buildPattern(rhythmBeatCount, soundedSyllables, random);
  if (difficulty !== 3) {
    return sounded;
  }
  const restPosition = pickWholeNumber(0, rhythmBeatCount - 1, random);
  return sounded.map((syllable, index) =>
    index === restPosition ? "sh" : syllable,
  );
};

export const taAndTiTi = defineMusicGame({
  gameType: "ta-and-ti-ti",
  title: "Ta and ti-ti",
  skillId: "music.crotchets-and-quavers",
  instruction: "Listen, then find the matching rhythm.",
  hint: "Not quite. Say the rhythm with the music: ta for one sound, ti-ti for two quick sounds, sh for a rest.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const palette = rhythmPalettes[difficulty];
    const answerSyllables = buildAnswerRhythm(difficulty, random);
    const answer = answerSyllables.join(" ");
    const distractors = collectDistractors(
      answer,
      () =>
        (difficulty === 3
          ? changeOnePlace(answerSyllables, palette, random)
          : buildPattern(rhythmBeatCount, palette, random)
        ).join(" "),
      (candidate) =>
        difficulty !== 1 || countDifferences(answer, candidate) > 1,
      2,
    );
    return {
      prompt: {
        ask: "Which rhythm?",
        clips: [
          buildRhythmClip(
            answer,
            pickOne<Instrument>(
              ["woodblock", "hand-drum", "snare-drum"],
              random,
            ),
            rhythmTempos[difficulty],
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
    face: { kind: "rhythm", rhythm: choice },
  }),
  describeChoice: (choice) => parseRhythm(choice).join(", "),
  findChoiceSound: (choice) => buildRhythmClip(choice, "woodblock", 92),
});

const volumeChanges = new Map<string, ChangeOverTime>(
  Object.entries({
    "getting louder": "rising",
    "getting quieter": "falling",
    "staying the same": "steady",
  }),
);

const volumeChoices: Record<MusicDifficulty, string[]> = {
  1: ["getting louder", "getting quieter"],
  2: ["getting louder", "getting quieter", "staying the same"],
  3: ["getting louder", "getting quieter", "staying the same"],
};

const findVolumeChange = (choice: string): ChangeOverTime =>
  volumeChanges.get(choice) ?? "steady";

const swellLimits: Record<MusicDifficulty, { soft: number; strong: number }> = {
  1: { soft: 0.1, strong: 1 },
  2: { soft: 0.15, strong: 1 },
  3: { soft: 0.3, strong: 0.9 },
};

const buildSwell = (
  change: ChangeOverTime,
  { soft, strong }: { soft: number; strong: number },
): Swell => {
  if (change === "rising") {
    return { from: soft, to: strong };
  }
  if (change === "falling") {
    return { from: strong, to: soft };
  }
  const middle = (soft + strong) / 2;
  return { from: middle, to: middle };
};

export const volumeRollercoaster = defineMusicGame({
  gameType: "volume-rollercoaster",
  title: "Volume rollercoaster",
  skillId: "music.getting-louder-and-quieter",
  instruction: "Is the music getting louder or quieter?",
  hint: "Not quite. Listen again: does the sound grow bigger, shrink smaller, or stay the same all the way through?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const choices = volumeChoices[difficulty];
    const answer = pickOne(choices, random);
    const instrument = pickOne<Instrument>(
      ["piano", "xylophone", "trumpet", "violin", "flute", "marimba"],
      random,
    );
    return {
      prompt: {
        ask:
          difficulty === 1 ? "Louder or quieter?" : "Louder, quieter or same?",
        clips: [
          buildClip(
            {
              tempo: pickWholeNumber(108, 128, random),
              swell: buildSwell(
                findVolumeChange(answer),
                swellLimits[difficulty],
              ),
            },
            [buildVoice(instrument, buildTraditionalNotes(10, random))],
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...choices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "hairpin", change: findVolumeChange(choice) },
  }),
  findChoiceSound: (choice) =>
    buildClip(
      {
        tempo: 120,
        swell: buildSwell(findVolumeChange(choice), swellLimits[1]),
      },
      [buildVoice("hand-drum", buildRhythmNotes("ta ta ta ta ta ta"))],
    ),
});

const tempoChanges = new Map<string, ChangeOverTime>(
  Object.entries({
    "getting faster": "rising",
    "getting slower": "falling",
    "staying steady": "steady",
  }),
);

const tempoChoices: Record<MusicDifficulty, string[]> = {
  1: ["getting faster", "getting slower"],
  2: ["getting faster", "getting slower", "staying steady"],
  3: ["getting faster", "getting slower", "staying steady"],
};

const findTempoChange = (choice: string): ChangeOverTime =>
  tempoChanges.get(choice) ?? "steady";

const tempoLimits: Record<MusicDifficulty, { slow: number; fast: number }> = {
  1: { slow: 66, fast: 168 },
  2: { slow: 72, fast: 150 },
  3: { slow: 84, fast: 136 },
};

const trainBeatCount = 12;

const findTempoJourney = (
  change: ChangeOverTime,
  { slow, fast }: { slow: number; fast: number },
  random: () => number,
): { tempo: number; finalTempo: number } => {
  if (change === "rising") {
    return { tempo: slow, finalTempo: fast };
  }
  if (change === "falling") {
    return { tempo: fast, finalTempo: slow };
  }
  const steadyTempo = pickWholeNumber(slow + 16, fast - 16, random);
  return { tempo: steadyTempo, finalTempo: steadyTempo };
};

const buildDrumBeats = (count: number, loudness: number): MusicNote[] =>
  Array.from({ length: count }, () => buildNote([], 1, { loudness }));

export const musicTrain = defineMusicGame({
  gameType: "music-train",
  title: "The music train",
  skillId: "music.getting-faster-and-slower",
  instruction: "Is the music getting faster or slower?",
  hint: "Not quite. Tap along with the drum. Do your taps speed up, slow down, or stay the same?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const choices = tempoChoices[difficulty];
    const answer = pickOne(choices, random);
    const journey = findTempoJourney(
      findTempoChange(answer),
      tempoLimits[difficulty],
      random,
    );
    return {
      prompt: {
        ask:
          difficulty === 1 ? "Faster or slower?" : "Faster, slower or steady?",
        clips: [
          buildClip(journey, [
            buildVoice(
              pickOne<Instrument>(
                ["piano", "xylophone", "flute", "marimba"],
                random,
              ),
              buildTraditionalNotes(trainBeatCount, random),
            ),
            buildVoice(
              "hand-drum",
              buildDrumBeats(trainBeatCount, loudnessLevels.forte),
              { loudness: 0.7 },
            ),
          ]),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...choices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "tempo-dots", change: findTempoChange(choice) },
  }),
  findChoiceSound: (choice) =>
    buildClip(
      findTempoJourney(findTempoChange(choice), tempoLimits[1], () => 0.5),
      [buildVoice("hand-drum", buildDrumBeats(8, loudnessLevels.forte))],
    ),
});

const frogDotLevels = new Map<string, number[]>(
  Object.entries({
    step: [0, 1],
    leap: [0, 3],
    same: [1, 1],
  }),
);

const frogExamples = new Map<string, number[]>(
  Object.entries({ step: [60, 62], leap: [60, 67], same: [64, 64] }),
);

const frogChoices: Record<MusicDifficulty, string[]> = {
  1: ["step", "leap"],
  2: ["step", "leap", "same"],
  3: ["step", "leap", "same"],
};

const leapSizes: Record<MusicDifficulty, [number, number]> = {
  1: [4, 7],
  2: [3, 5],
  3: [3, 5],
};

const buildTwoOctaveScale = (tonic: number): number[] => [
  ...buildScale(tonic, majorScaleSteps, false),
  ...buildScale(tonic + 12, majorScaleSteps, true),
];

const pickDirection = (random: () => number): number =>
  pickOne([-1, 1], random);

const buildFrogMoves = (
  answer: string,
  difficulty: MusicDifficulty,
  random: () => number,
): number[] => {
  const [smallestLeap, largestLeap] = leapSizes[difficulty];
  const moveCount = difficulty === 3 ? 2 : 1;
  const leapPosition = pickWholeNumber(0, moveCount - 1, random);
  return Array.from({ length: moveCount }, (_, position) => {
    if (answer === "same") {
      return 0;
    }
    const size =
      answer === "leap" && position === leapPosition
        ? pickWholeNumber(smallestLeap, largestLeap, random)
        : 1;
    return size * pickDirection(random);
  });
};

const buildFrogPitches = (
  moves: readonly number[],
  random: () => number,
): number[] => {
  const scale = buildTwoOctaveScale(pickOne([60, 62, 65, 67], random));
  const offsets = moves.reduce<number[]>(
    (reached, move) => [...reached, (reached.at(-1) ?? 0) + move],
    [0],
  );
  const start = pickWholeNumber(
    -Math.min(...offsets),
    scale.length - 1 - Math.max(...offsets),
    random,
  );
  return offsets.map((offset) => scale[start + offset]);
};

export const frogStepsAndLeaps = defineMusicGame({
  gameType: "frog-steps-and-leaps",
  title: "Frog steps and leaps",
  skillId: "music.steps-and-leaps",
  instruction: "Does the tune step, leap, or stay?",
  hint: "Not quite. A step goes to the very next note. A leap jumps a long way. Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const choices = frogChoices[difficulty];
    const answer = pickOne(choices, random);
    const pitches = buildFrogPitches(
      buildFrogMoves(answer, difficulty, random),
      random,
    );
    return {
      prompt: {
        ask: difficulty === 1 ? "Step or leap?" : "Step, leap or same?",
        clips: [
          buildClip({ tempo: 84 }, [
            buildVoice(
              pickOne<Instrument>(
                ["piano", "marimba", "xylophone", "recorder"],
                random,
              ),
              buildMelody(pitches),
            ),
          ]),
        ],
        stage: { kind: "lily-pads" },
      },
      choices: [...choices],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "dots", levels: frogDotLevels.get(choice) ?? [1, 1] },
  }),
  findChoiceSound: (choice) =>
    buildClip({ tempo: 84 }, [
      buildVoice("piano", buildMelody(frogExamples.get(choice) ?? [64, 64])),
    ]),
});

interface GlockenspielBar {
  pitch: number;
  letter: string;
}

const glockenspielBars = new Map<string, GlockenspielBar>(
  Object.entries({
    C: { pitch: 72, letter: "C" },
    D: { pitch: 74, letter: "D" },
    E: { pitch: 76, letter: "E" },
    G: { pitch: 79, letter: "G" },
    A: { pitch: 81, letter: "A" },
    "high C": { pitch: 84, letter: "C" },
  }),
);

const lowC: GlockenspielBar = { pitch: 72, letter: "C" };

const findBar = (choice: string): GlockenspielBar =>
  glockenspielBars.get(choice) ?? lowC;

const barPools: Record<MusicDifficulty, string[]> = {
  1: ["C", "E", "G"],
  2: ["C", "D", "E", "G"],
  3: ["C", "D", "E", "G", "A", "high C"],
};

const buildBarClip = (choice: string): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice("glockenspiel", [buildNote([findBar(choice).pitch], 2)]),
  ]);

export const glockenspielEcho = defineMusicGame({
  gameType: "glockenspiel-echo",
  title: "Glockenspiel echo",
  skillId: "music.tuned-percussion",
  instruction: "First comes C. Find the mystery note's bar.",
  hint: "Not quite. Is the mystery note the same as C, a little higher, or a lot higher? Listen again.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const pool = barPools[difficulty];
    const answer = pickOne(
      difficulty === 3 ? pool.filter((bar) => bar !== "C") : pool,
      random,
    );
    return {
      prompt: {
        ask: "Which note?",
        clips: [buildBarClip("C"), buildBarClip(answer)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(answer, pool, random),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "bar",
    pitch: findBar(choice).pitch,
    name: findBar(choice).letter,
  }),
  findChoiceSound: buildBarClip,
});

const beatNumbers = ["1", "2", "3", "4"];

const restTempos: Record<MusicDifficulty, number> = { 1: 72, 2: 92, 3: 108 };
const restBarCounts: Record<MusicDifficulty, number> = { 1: 1, 2: 1, 3: 2 };

const buildRestBar = (silentBeat: number): MusicNote[] =>
  beatNumbers.map((_, index) =>
    index === silentBeat ? buildRest(1) : buildNote([], 1),
  );

export const findTheRest = defineMusicGame({
  gameType: "find-the-rest",
  title: "Shh! Find the rest",
  skillId: "music.hearing-rests",
  instruction: "Which beat is silent?",
  hint: "Not quite. Count 1, 2, 3, 4 along with the lights. Which number has no drum?",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(beatNumbers, random);
    const silentBeat = Number(answer) - 1;
    const barCount = restBarCounts[difficulty];
    return {
      prompt: {
        ask: "Which beat is silent?",
        clips: [
          buildClip({ tempo: restTempos[difficulty] }, [
            buildVoice(
              "tick",
              buildDrumBeats(beatNumbers.length * barCount, 1),
              { loudness: 0.25 },
            ),
            buildVoice(
              pickOne<Instrument>(
                ["hand-drum", "snare-drum", "bass-drum", "woodblock"],
                random,
              ),
              Array.from({ length: barCount }, () =>
                buildRestBar(silentBeat),
              ).flat(),
            ),
          ]),
        ],
        stage: { kind: "drum", beatLamps: beatNumbers.length },
      },
      choices: [...beatNumbers],
      answer,
    };
  },
  describeChoice: (choice) => `Beat ${choice}`,
});

interface TunedInstrument {
  instrument: Instrument;
  model: MusicModel;
  tonic: number;
  length: number;
}

const tunedInstruments = new Map<string, TunedInstrument>(
  Object.entries({
    piano: {
      instrument: "piano",
      model: "piano",
      tonic: 60,
      length: normalLength,
    },
    violin: {
      instrument: "violin",
      model: "violin",
      tonic: 67,
      length: legatoLength,
    },
    trumpet: {
      instrument: "trumpet",
      model: "trumpet",
      tonic: 60,
      length: normalLength,
    },
    flute: {
      instrument: "flute",
      model: "flute",
      tonic: 72,
      length: legatoLength,
    },
    guitar: {
      instrument: "guitar",
      model: "guitar",
      tonic: 52,
      length: normalLength,
    },
    xylophone: {
      instrument: "xylophone",
      model: "xylophone",
      tonic: 72,
      length: staccatoLength,
    },
  }),
);

const pianoInstrument: TunedInstrument = {
  instrument: "piano",
  model: "piano",
  tonic: 60,
  length: normalLength,
};

const findTunedInstrument = (choice: string): TunedInstrument =>
  tunedInstruments.get(choice) ?? pianoInstrument;

const tunedInstrumentPools: Record<MusicDifficulty, string[]> = {
  1: ["piano", "violin", "trumpet"],
  2: ["piano", "violin", "trumpet", "flute", "guitar"],
  3: ["piano", "violin", "trumpet", "flute", "guitar", "xylophone"],
};

const phraseShapes = [
  [0, 2, 4, 5, 4, 2, 0],
  [0, 4, 7, 4, 0],
  [4, 2, 0, 2, 4, 4, 4],
  [0, 2, 4, 7, 4],
] as const;

const buildInstrumentPhrase = (
  choice: string,
  shape: readonly number[],
): MusicClip => {
  const { instrument, tonic, length } = findTunedInstrument(choice);
  const pitches = shape.map((step) => tonic + step);
  return buildClip({ tempo: 100 }, [
    buildVoice(
      instrument,
      pitches.map((pitch, index) =>
        buildNote([pitch], index === pitches.length - 1 ? 2 : 1, { length }),
      ),
    ),
  ]);
};

export const tunedInstrumentDetective = defineMusicGame({
  gameType: "tuned-instrument-detective",
  title: "Instrument detective",
  skillId: "music.tuned-instruments",
  instruction: "Which instrument is playing the tune?",
  hint: "Not quite. Is the sound plucked, bowed, blown or hit? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const pool = tunedInstrumentPools[difficulty];
    const answer = pickOne(pool, random);
    return {
      prompt: {
        ask: "Which instrument?",
        clips: [buildInstrumentPhrase(answer, pickOne(phraseShapes, random))],
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
  findChoiceArt: (choice) => ({
    kind: "model",
    model: findTunedInstrument(choice).model,
  }),
  findChoiceSound: (choice) => buildInstrumentPhrase(choice, phraseShapes[0]),
});

interface MoodPart {
  notes: MusicNote[];
  instruments: readonly Instrument[];
  loudness: number;
}

interface MoodPiece {
  tempo: number;
  shifts: readonly number[];
  parts: MoodPart[];
}

const happyShape = { loudness: loudnessLevels.forte, length: staccatoLength };
const sadShape = { loudness: loudnessLevels.mezzo, length: legatoLength };
const sleepyShape = { loudness: loudnessLevels.piano, length: legatoLength };
const diminishedSteps = [0, 3, 6, 9] as const;

const buildTremolo = (pitches: readonly number[], beats: number): MusicNote[] =>
  Array.from({ length: beats * 4 }, () =>
    buildNote(pitches, 0.25, { length: legatoLength }),
  );

const buildStabs = (roots: readonly number[]): MusicNote[] =>
  roots.flatMap((root) => [
    buildRest(1),
    buildNote(buildChord(root, diminishedSteps), 1, {
      length: staccatoLength,
    }),
  ]);

const happyMelodyInstruments: readonly Instrument[] = [
  "xylophone",
  "flute",
  "piano",
  "trumpet",
];
const sadMelodyInstruments: readonly Instrument[] = [
  "oboe",
  "violin",
  "clarinet",
];
const sleepyMelodyInstruments: readonly Instrument[] = [
  "harp",
  "flute",
  "piano",
  "glockenspiel",
];

const moodPieces: Record<Mood, readonly MoodPiece[]> = {
  happy: [
    {
      tempo: 152,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune(
            "C5 E5 G5 E5 C5 E5 G5:2 A5 G5 F5 E5 D5 E5 C5:2",
            happyShape,
          ),
          instruments: happyMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune(
            "C3 G3 C3 G3 C3 G3 C3 G3 F3 C3 F3 C3 G3 D3 C3:2",
            happyShape,
          ),
          instruments: ["piano"],
          loudness: 0.6,
        },
      ],
    },
    {
      tempo: 152,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune(
            "D5:0.5 B4:0.5 D5:0.5 G5:0.5 B5 G5 A5:0.5 G5:0.5 F#5:0.5 E5:0.5 D5:2 E5:0.5 F#5:0.5 G5 D5 B4 G4:2",
            happyShape,
          ),
          instruments: happyMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune(
            "G3 D3 G3 D3 D3 A3 D3 A3 G3 D3 G3 D3 G2:2",
            happyShape,
          ),
          instruments: ["piano"],
          loudness: 0.6,
        },
      ],
    },
    {
      tempo: 144,
      shifts: [-3, 0, 2],
      parts: [
        {
          notes: buildTune(
            "F5 A5 C6 A5 F5:0.5 G5:0.5 A5:0.5 Bb5:0.5 C6:2 A5 F5 G5 E5 F5:2",
            happyShape,
          ),
          instruments: happyMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune(
            "F3 C3 F3 C3 F3 C3 F3 C3 F3 C3 C3 G3 F3:2",
            happyShape,
          ),
          instruments: ["piano"],
          loudness: 0.6,
        },
      ],
    },
  ],
  sad: [
    {
      tempo: 60,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune("C5:1.5 B4:0.5 A4:2 E4 F4 E4:2", sadShape),
          instruments: sadMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune("A2:4 F2:2 E2:2", sadShape),
          instruments: ["strings", "cello"],
          loudness: 0.6,
        },
      ],
    },
    {
      tempo: 63,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune("A4 C5 B4 A4 G#4:2 A4:2", sadShape),
          instruments: sadMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune("A2:2 D3:2 E2:2 A2:2", sadShape),
          instruments: ["strings", "cello"],
          loudness: 0.6,
        },
      ],
    },
    {
      tempo: 60,
      shifts: [-2, 0, 3],
      parts: [
        {
          notes: buildTune("D5 C5 Bb4 A4 G4:2 A4:2", sadShape),
          instruments: sadMelodyInstruments,
          loudness: 1,
        },
        {
          notes: buildTune("D3:2 G2:2 Bb2:2 A2:2", sadShape),
          instruments: ["strings", "cello"],
          loudness: 0.6,
        },
      ],
    },
  ],
  scary: [
    {
      tempo: 92,
      shifts: [-1, 0, 1],
      parts: [
        {
          notes: [40, 41, 42, 43].flatMap((pitch) => buildTremolo([pitch], 2)),
          instruments: ["double-bass", "cello"],
          loudness: 0.9,
        },
        {
          notes: buildStabs([52, 53, 54, 55]),
          instruments: ["piano", "organ"],
          loudness: 0.8,
        },
      ],
    },
    {
      tempo: 100,
      shifts: [-1, 0, 1],
      parts: [
        {
          notes: buildTune("E2 F2 E2 D#2 E2 F2 F#2 G2 Bb2:4", {
            loudness: loudnessLevels.forte,
            length: legatoLength,
          }),
          instruments: ["bassoon", "tuba"],
          loudness: 1,
        },
        {
          notes: buildTremolo(buildChord(52, diminishedSteps), 12),
          instruments: ["strings"],
          loudness: 0.4,
        },
      ],
    },
    {
      tempo: 84,
      shifts: [-1, 0, 1],
      parts: [
        {
          notes: [59, 58, 57, 56].map((root) =>
            buildNote(buildChord(root, diminishedSteps), 2, {
              length: legatoLength,
            }),
          ),
          instruments: ["organ", "strings"],
          loudness: 0.8,
        },
        {
          notes: buildTremolo([40], 8),
          instruments: ["timpani"],
          loudness: 0.6,
        },
      ],
    },
  ],
  sleepy: [
    {
      tempo: 76,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune(composerThemes.lullaby.melody, sleepyShape),
          instruments: sleepyMelodyInstruments,
          loudness: 0.8,
        },
        {
          notes: buildTune(composerThemes.lullaby.bass, sleepyShape),
          instruments: ["harp", "piano"],
          loudness: 0.5,
        },
      ],
    },
    {
      tempo: 80,
      shifts: [-2, 0, 2],
      parts: [
        {
          notes: buildTune("G4:2 E4 G4:2 E4 F4 E4 D4 C4:3", sleepyShape),
          instruments: sleepyMelodyInstruments,
          loudness: 0.8,
        },
        {
          notes: buildTune("C3:3 C3:3 G2:3 C3:3", sleepyShape),
          instruments: ["harp", "piano"],
          loudness: 0.5,
        },
      ],
    },
    {
      tempo: 66,
      shifts: [0, 5, 7],
      parts: [
        {
          notes: buildTune("C4 C4 G4 G4 A4 A4 G4:2", sleepyShape),
          instruments: sleepyMelodyInstruments,
          loudness: 0.8,
        },
        {
          notes: buildTune("C3:2 C3:2 F3:2 C3:2", sleepyShape),
          instruments: ["harp", "piano"],
          loudness: 0.5,
        },
      ],
    },
  ],
};

const findMood = (choice: string): Mood =>
  moods.find((mood) => mood === choice) ?? "happy";

const buildMoodClip = (
  { tempo, shifts, parts }: MoodPiece,
  random: () => number,
): MusicClip => {
  const shift = pickOne(shifts, random);
  return buildClip(
    { tempo },
    parts.map(({ notes, instruments, loudness }) =>
      buildVoice(pickOne(instruments, random), transposeNotes(notes, shift), {
        loudness,
      }),
    ),
  );
};

export const feelingsTheatre = defineMusicGame({
  gameType: "feelings-theatre",
  title: "Feelings theatre",
  skillId: "music.music-and-mood",
  instruction: "How does the music feel? Pick a mask.",
  hint: "Not quite. Is it bouncy and bright, slow and sad, dark and creepy, or soft and dreamy? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(moods, random);
    return {
      prompt: {
        ask: "How does it feel?",
        clips: [buildMoodClip(pickOne(moodPieces[answer], random), random)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        moods,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => ({ kind: "mask", mood: findMood(choice) }),
  findChoiceSound: (choice) =>
    buildMoodClip(moodPieces[findMood(choice)][0], () => 0.5),
});

const solfaNames = ["mi", "so", "la"] as const;
type Solfa = (typeof solfaNames)[number];

const isSolfa = (word: string): word is Solfa =>
  solfaNames.some((name) => name === word);

const readSolfa = (choice: string): Solfa[] =>
  choice.split(" ").filter(isSolfa);

const solfaAboveSo: Record<Solfa, number> = { mi: -3, so: 0, la: 2 };

const solfaPalettes: Record<MusicDifficulty, readonly Solfa[]> = {
  1: ["so", "mi"],
  2: ["so", "mi", "la"],
  3: ["so", "mi", "la"],
};

const solfaNoteCounts: Record<MusicDifficulty, number> = { 1: 3, 2: 3, 3: 4 };

const buildSolfaClip = (
  choice: string,
  instrument: Instrument,
  soPitch: number,
): MusicClip => {
  const pitches = readSolfa(choice).map((name) => soPitch + solfaAboveSo[name]);
  return buildClip({ tempo: 84 }, [
    buildVoice(
      instrument,
      pitches.map((pitch, index) =>
        buildNote([pitch], index === pitches.length - 1 ? 2 : 1),
      ),
    ),
  ]);
};

export const dotToDotTunes = defineMusicGame({
  gameType: "dot-to-dot-tunes",
  title: "Dot-to-dot tunes",
  skillId: "music.dot-notation",
  instruction: "Find the dots that match the tune.",
  hint: "Not quite. Sing along: mi is the lowest dot, so is in the middle and la is the highest. Listen again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const palette = solfaPalettes[difficulty];
    const noteCount = solfaNoteCounts[difficulty];
    const answerNames = buildPattern(noteCount, palette, random);
    const answer = answerNames.join(" ");
    const distractors = collectDistractors(
      answer,
      () =>
        (difficulty === 3
          ? changeOnePlace(answerNames, palette, random)
          : buildPattern(noteCount, palette, random)
        ).join(" "),
      () => true,
      2,
    );
    return {
      prompt: {
        ask: "Which dots?",
        clips: [
          buildSolfaClip(
            answer,
            pickOne<Instrument>(
              ["voice", "recorder", "xylophone", "piano"],
              random,
            ),
            pickOne([67, 72, 74], random),
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
      kind: "dots",
      levels: readSolfa(choice).map((name) => solfaNames.indexOf(name)),
    },
  }),
  describeChoice: (choice) => readSolfa(choice).join(", "),
  findChoiceSound: (choice) => buildSolfaClip(choice, "recorder", 67),
});

const homeEndings = ["finished", "not finished"] as const;

interface HomeOpening {
  melody: number[];
  bass: number[];
}

const homeOpenings: readonly HomeOpening[] = [
  { melody: [0, 2, 4, 2, 1, -1], bass: [0, 0, -3] },
  { melody: [2, 1, 0, 2, 1, 4], bass: [0, 0, -3] },
  { melody: [4, 4, 5, 5, 4, 1], bass: [0, 3, -3] },
  { melody: [2, 3, 4, 2, 3, 1], bass: [0, 0, -3] },
];

const unfinishedEndings: Record<MusicDifficulty, readonly number[]> = {
  1: [1, -1],
  2: [1, -1, 4],
  3: [4, 4, 1],
};

const homeTempos: Record<MusicDifficulty, number> = { 1: 88, 2: 100, 3: 108 };
const homeDegree = 0;
const dominantBassDegree = -3;
const degreesPerOctave = 7;

const findDegreePitch = (tonic: number, degree: number): number => {
  const octave = Math.floor(degree / degreesPerOctave);
  return (
    tonic + 12 * octave + majorScaleSteps[degree - octave * degreesPerOctave]
  );
};

const buildHomeClip = (
  opening: HomeOpening,
  isFinished: boolean,
  endingDegree: number,
  tonic: number,
  tempo: number,
  instrument: Instrument,
): MusicClip => {
  const melody = [...opening.melody, endingDegree].map((degree, index) =>
    buildNote(
      [findDegreePitch(tonic, degree)],
      index === opening.melody.length ? 2 : 1,
    ),
  );
  const bass = [
    ...opening.bass,
    isFinished ? homeDegree : dominantBassDegree,
  ].map((degree) => buildNote([findDegreePitch(tonic - 12, degree)], 2));
  return buildClip({ tempo }, [
    buildVoice(instrument, melody),
    buildVoice("cello", bass, { loudness: 0.55 }),
  ]);
};

export const isItHome = defineMusicGame({
  gameType: "is-it-home",
  title: "Is it home?",
  skillId: "music.finished-or-not",
  instruction: "Does the tune sound finished?",
  hint: "Not quite. Sing the last note. Does it feel like you can stop, or do you want to keep going?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(homeEndings, random);
    const isFinished = answer === "finished";
    return {
      prompt: {
        ask: "Finished or not?",
        clips: [
          buildHomeClip(
            pickOne(homeOpenings, random),
            isFinished,
            isFinished
              ? homeDegree
              : pickOne(unfinishedEndings[difficulty], random),
            pickOne([60, 65, 67], random),
            homeTempos[difficulty],
            pickOne<Instrument>(
              ["piano", "recorder", "violin", "flute"],
              random,
            ),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...homeEndings],
      answer,
    };
  },
  findChoiceArt: (choice): ChoiceArt => ({
    kind: "card",
    face: {
      kind: "picture",
      icon: choice === "finished" ? "house" : "question",
    },
  }),
  findChoiceSound: (choice) =>
    buildHomeClip(
      homeOpenings[0],
      choice === "finished",
      choice === "finished" ? homeDegree : 1,
      60,
      96,
      "piano",
    ),
});

export const yearTwoMusicGames = [
  taAndTiTi,
  volumeRollercoaster,
  musicTrain,
  frogStepsAndLeaps,
  glockenspielEcho,
  findTheRest,
  tunedInstrumentDetective,
  feelingsTheatre,
  dotToDotTunes,
  isItHome,
] as const;
