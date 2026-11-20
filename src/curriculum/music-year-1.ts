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
  BodyAction,
  ChoiceArt,
  MusicModel,
  SoundLength,
} from "./music-prompts.js";
import {
  buildClip,
  buildMelody,
  buildNote,
  buildRest,
  buildRhythmNotes,
  buildVoice,
  isRhythmSyllable,
  legatoLength,
  listRhythmSounds,
  loudnessLevels,
  staccatoLength,
  type Instrument,
  type MusicClip,
  type MusicNote,
} from "./music-theory.js";
import {
  buildTune,
  takeBeats,
  traditionalTuneNames,
  traditionalTunes,
} from "./music-tunes.js";

const buildTuneClip = (
  instrument: Instrument,
  tempo: number,
  largestBeats: number,
  random: () => number,
  loudness: number = loudnessLevels.forte,
): MusicClip =>
  buildClip({ tempo }, [
    buildVoice(
      instrument,
      takeBeats(
        buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)], {
          loudness,
        }),
        largestBeats,
      ),
    ),
  ]);

const loudnessByDifficulty: Record<
  MusicDifficulty,
  { loud: number; quiet: number }
> = {
  1: { loud: 1, quiet: 0.1 },
  2: { loud: 0.86, quiet: 0.2 },
  3: { loud: 0.74, quiet: 0.3 },
};

const loudOrQuiet = ["loud", "quiet"] as const;

const isLoud = (choice: string) => choice === "loud";

export const bigDrumLittleDrum = defineMusicGame({
  gameType: "big-drum-little-drum",
  title: "Big drum, little drum",
  skillId: "music.loud-and-quiet",
  instruction: "Loud? Tap the big drum. Quiet? The little drum.",
  hint: "Not quite. Listen again: is it big and booming, or soft and gentle?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(loudOrQuiet, random);
    const loudness = loudnessByDifficulty[difficulty][answer];
    const isDrummed = difficulty === 1;
    const clip = isDrummed
      ? buildClip({ tempo: 96 }, [
          buildVoice(
            "hand-drum",
            buildRhythmNotes("ta ta ti-ti ta", [], { loudness }),
          ),
        ])
      : buildTuneClip(
          pickOne(
            difficulty === 2
              ? ["piano", "xylophone", "recorder"]
              : ["trumpet", "violin", "piano", "flute"],
            random,
          ),
          112,
          6,
          random,
          loudness,
        );
    return {
      prompt: {
        ask: "Loud or quiet?",
        clips: [clip],
        stage: isDrummed
          ? { kind: "drum", beatLamps: 0 }
          : { kind: "gramophone" },
      },
      choices: [...loudOrQuiet],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: isLoud(choice) ? "big-drum" : "little-drum",
  }),
  describeChoice: (choice) =>
    isLoud(choice) ? "Loud: the big drum" : "Quiet: the little drum",
  findChoiceSound: (choice) =>
    buildClip({ tempo: 100 }, [
      buildVoice(
        "hand-drum",
        buildRhythmNotes("ta ta", [], {
          loudness: isLoud(choice) ? 1 : 0.1,
        }),
      ),
    ]),
});

const tempoByDifficulty: Record<
  MusicDifficulty,
  { fast: number; slow: number }
> = {
  1: { fast: 168, slow: 56 },
  2: { fast: 148, slow: 70 },
  3: { fast: 132, slow: 82 },
};

const fastOrSlow = ["fast", "slow"] as const;

export const hareAndTortoise = defineMusicGame({
  gameType: "hare-and-tortoise",
  title: "The hare and the tortoise",
  skillId: "music.fast-and-slow",
  instruction: "Is the music fast like the hare, or slow?",
  hint: "Not quite. Tap your knee in time with the music. Is your hand rushing or strolling?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(fastOrSlow, random);
    const tempo = tempoByDifficulty[difficulty][answer];
    return {
      prompt: {
        ask: "Fast or slow?",
        clips: [
          buildTuneClip(
            pickOne(["piano", "xylophone", "flute", "marimba"], random),
            tempo,
            answer === "fast" ? 12 : 6,
            random,
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...fastOrSlow],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: choice === "fast" ? "hare" : "tortoise",
  }),
  describeChoice: (choice) =>
    choice === "fast" ? "Fast: the hare" : "Slow: the tortoise",
});

const highOrLow = ["high", "low"] as const;

const pitchRanges: Record<
  MusicDifficulty,
  { high: [number, number]; low: [number, number] }
> = {
  1: { high: [84, 91], low: [36, 43] },
  2: { high: [72, 79], low: [48, 55] },
  3: { high: [72, 79], low: [48, 55] },
};

const motifSteps = [
  [0, 2, 4],
  [4, 2, 0],
  [0, 4, 7],
  [7, 4, 0],
  [0, 0, 4],
] as const;

export const birdOrBear = defineMusicGame({
  gameType: "bird-or-bear",
  title: "Bird or bear?",
  skillId: "music.high-and-low",
  instruction: "High sound? Tap the bird. Low sound? The bear.",
  hint: "Not quite. High sounds are thin and squeaky, low sounds are deep and growly. Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(highOrLow, random);
    const [lowest, highest] = pitchRanges[difficulty][answer];
    const start = pickWholeNumber(lowest, highest, random);
    const pitches =
      difficulty === 3
        ? pickOne(motifSteps, random).map((step) => start + step)
        : [start, start, start];
    return {
      prompt: {
        ask: "High or low?",
        clips: [
          buildClip({ tempo: 90 }, [
            buildVoice(
              pickOne(["piano", "marimba"], random),
              buildMelody(pitches),
            ),
          ]),
        ],
        stage: { kind: "keyboard", lowest: "C2", highest: "C7", marked: [] },
      },
      choices: [...highOrLow],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: choice === "high" ? "bird" : "bear",
  }),
  describeChoice: (choice) =>
    choice === "high" ? "High: the bird" : "Low: the bear",
  findChoiceSound: (choice) =>
    buildClip({ tempo: 90 }, [
      buildVoice("piano", buildMelody([choice === "high" ? 86 : 38])),
    ]),
});

const beatCountRanges: Record<
  MusicDifficulty,
  { fewest: number; most: number; tempo: number }
> = {
  1: { fewest: 2, most: 5, tempo: 80 },
  2: { fewest: 3, most: 7, tempo: 96 },
  3: { fewest: 4, most: 9, tempo: 116 },
};

export const drumBeatCounter = defineMusicGame({
  gameType: "drum-beat-counter",
  title: "Drum beat counter",
  skillId: "music.steady-beat",
  instruction: "Count the drum beats, then tap the number.",
  hint: "Not quite. Count out loud with each beat of the drum, then have another go.",
  hintKind: "listen",
  labelStyle: "inside",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const { fewest, most, tempo } = beatCountRanges[difficulty];
    const count = pickWholeNumber(fewest, most, random);
    const nearby = Array.from({ length: 5 }, (_, offset) => count - 2 + offset)
      .filter((candidate) => candidate >= 1)
      .map(String);
    return {
      prompt: {
        ask: "How many beats?",
        clips: [
          buildClip({ tempo }, [
            buildVoice(
              "hand-drum",
              Array.from({ length: count }, () => buildNote([], 1)),
            ),
          ]),
        ],
        stage: { kind: "drum", beatLamps: 0 },
      },
      choices: pickChoices(String(count), nearby, random),
      answer: String(count),
    };
  },
  describeChoice: (choice) => `${choice} beats`,
});

const bodyActionInstruments: Record<BodyAction, Instrument> = {
  clap: "clap",
  stamp: "stamp",
  click: "click",
};

const buildActionClip = (actions: readonly BodyAction[]): MusicClip =>
  buildClip(
    { tempo: 92 },
    (["clap", "stamp", "click"] as const)
      .filter((action) => actions.includes(action))
      .map((action) =>
        buildVoice(
          bodyActionInstruments[action],
          actions.map((played) =>
            played === action ? buildNote([], 1) : buildRest(1),
          ),
        ),
      ),
  );

const readActions = (choice: string): BodyAction[] =>
  choice
    .split(" ")
    .flatMap((word) =>
      word === "clap" || word === "stamp" || word === "click" ? [word] : [],
    );

const buildActionPattern = (
  length: number,
  palette: readonly BodyAction[],
  random: () => number,
): BodyAction[] => Array.from({ length }, () => pickOne(palette, random));

const changeOneAction = (
  actions: readonly BodyAction[],
  palette: readonly BodyAction[],
  random: () => number,
): BodyAction[] => {
  const position = pickWholeNumber(0, actions.length - 1, random);
  const others = palette.filter((action) => action !== actions[position]);
  return actions.map((action, index) =>
    index === position ? pickOne(others, random) : action,
  );
};

const actionPatternLengths: Record<MusicDifficulty, number> = {
  1: 3,
  2: 4,
  3: 4,
};

export const clapStampClick = defineMusicGame({
  gameType: "clap-stamp-click",
  title: "Clap, stamp, click",
  skillId: "music.body-percussion-patterns",
  instruction: "Listen to the pattern, then find its picture.",
  hint: "Not quite. Copy the pattern with your own hands and feet, then look again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const palette: readonly BodyAction[] =
      difficulty === 1 ? ["clap", "stamp"] : ["clap", "stamp", "click"];
    const length = actionPatternLengths[difficulty];
    const answerActions = buildActionPattern(length, palette, random);
    const answer = answerActions.join(" ");
    const distractors = new Set<string>();
    for (let attempt = 0; distractors.size < 2 && attempt < 40; attempt++) {
      const candidate = (
        difficulty === 3
          ? changeOneAction(answerActions, palette, random)
          : buildActionPattern(length, palette, random)
      ).join(" ");
      if (candidate !== answer) {
        distractors.add(candidate);
      }
    }
    return {
      prompt: {
        ask: "Which pattern did you hear?",
        clips: [buildActionClip(answerActions)],
        stage: { kind: "gramophone" },
      },
      choices: shuffleValues([answer, ...distractors], random),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "actions", actions: readActions(choice) },
  }),
  describeChoice: (choice) => readActions(choice).join(", "),
  findChoiceSound: (choice) => buildActionClip(readActions(choice)),
});

interface PercussionChoice {
  instrument: Instrument;
  model: MusicModel;
}

const percussionChoices = new Map<string, PercussionChoice>(
  Object.entries({
    drum: { instrument: "hand-drum", model: "big-drum" },
    triangle: { instrument: "triangle", model: "triangle" },
    maracas: { instrument: "maracas", model: "maracas" },
    woodblock: { instrument: "woodblock", model: "woodblock" },
    tambourine: { instrument: "tambourine", model: "tambourine" },
    cymbal: { instrument: "cymbal", model: "cymbal" },
  }),
);

const drumChoice: PercussionChoice = {
  instrument: "hand-drum",
  model: "big-drum",
};

const percussionPools: Record<MusicDifficulty, string[]> = {
  1: ["drum", "triangle", "maracas", "woodblock"],
  2: ["drum", "triangle", "maracas", "woodblock", "tambourine"],
  3: ["drum", "triangle", "maracas", "woodblock", "tambourine", "cymbal"],
};

const findPercussion = (choice: string): PercussionChoice =>
  percussionChoices.get(choice) ?? drumChoice;

const buildPercussionClip = (choice: string): MusicClip =>
  buildClip({ tempo: 100 }, [
    buildVoice(
      findPercussion(choice).instrument,
      buildRhythmNotes("ta ti-ti ta ta"),
    ),
  ]);

export const percussionDetective = defineMusicGame({
  gameType: "percussion-detective",
  title: "Percussion detective",
  skillId: "music.untuned-percussion",
  instruction: "Which instrument is playing?",
  hint: "Not quite. Is it a boom, a ting, a shake or a tock? Listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const pool = percussionPools[difficulty];
    const answer = pickOne(pool, random);
    return {
      prompt: {
        ask: "Which instrument?",
        clips: [buildPercussionClip(answer)],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(answer, pool, random),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: findPercussion(choice).model,
  }),
  findChoiceSound: buildPercussionClip,
});

interface AnimalTheme {
  model: MusicModel;
  build: () => MusicClip;
}

const animalThemes = new Map<string, AnimalTheme>(
  Object.entries({
    elephant: {
      model: "elephant",
      build: () =>
        buildClip({ tempo: 72 }, [
          buildVoice("tuba", buildTune("C2:2 G2 G2 C2:2 G2 G2")),
        ]),
    },
    bird: {
      model: "bird",
      build: () =>
        buildClip({ tempo: 132 }, [
          buildVoice(
            "flute",
            buildTune(
              "C6:0.25 D6:0.25 C6:0.25 D6:0.25 G6:0.5 E6:0.5 C6:0.25 D6:0.25 C6:0.25 D6:0.25 A6:1",
            ),
          ),
        ]),
    },
    snake: {
      model: "snake",
      build: () =>
        buildClip({ tempo: 84 }, [
          buildVoice(
            "clarinet",
            buildTune("E3 F3 F#3 G3 F#3 F3 E3 D#3:2", {
              length: legatoLength,
              loudness: loudnessLevels.piano,
            }),
          ),
        ]),
    },
    kangaroo: {
      model: "kangaroo",
      build: () =>
        buildClip({ tempo: 120 }, [
          buildVoice(
            "piano",
            buildTune("C4 C5 G4 G5 E4 E5 C5:2", { length: staccatoLength }),
          ),
        ]),
    },
  }),
);

const animalNames = [...animalThemes.keys()];
const elephantTheme: AnimalTheme = {
  model: "elephant",
  build: () =>
    buildClip({ tempo: 72 }, [buildVoice("tuba", buildTune("C2:2 G2 G2"))]),
};

const findAnimal = (choice: string): AnimalTheme =>
  animalThemes.get(choice) ?? elephantTheme;

export const carnivalOfTheAnimals = defineMusicGame({
  gameType: "carnival-of-the-animals",
  title: "Carnival of the animals",
  skillId: "music.music-describes-animals",
  instruction: "Which animal does the music sound like?",
  hint: "Not quite. Think about how the animal moves, then listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(animalNames, random);
    return {
      prompt: {
        ask: "Which animal?",
        clips: [findAnimal(answer).build()],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(
        answer,
        animalNames,
        random,
        findChoiceCountFor(difficulty),
      ),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: findAnimal(choice).model,
  }),
  findChoiceSound: (choice) => findAnimal(choice).build(),
});

const isSoundLength = (word: string): word is SoundLength =>
  word === "long" || word === "short";

const readLengths = (choice: string): SoundLength[] =>
  choice.split(" ").filter(isSoundLength);

const buildLengthsClip = (
  lengths: readonly SoundLength[],
  instrument: Instrument,
): MusicClip =>
  buildClip({ tempo: 80 }, [
    buildVoice(
      instrument,
      lengths.map((length) =>
        length === "long"
          ? buildNote([67], 2.5, { length: legatoLength })
          : buildNote([67], 1, { length: staccatoLength }),
      ),
    ),
  ]);

const listLengthPatterns = (soundCount: number): string[] =>
  Array.from({ length: 2 ** soundCount }, (_, pattern) =>
    Array.from({ length: soundCount }, (_unused, position) =>
      (pattern >> (soundCount - 1 - position)) % 2 === 0 ? "long" : "short",
    ).join(" "),
  );

export const longAndShort = defineMusicGame({
  gameType: "long-and-short",
  title: "Long and short sounds",
  skillId: "music.long-and-short",
  instruction: "Are the sounds long or short?",
  hint: "Not quite. Hum along with each sound. Do you run out of time or stop straight away?",
  hintKind: "listen",
  labelStyle: "hidden",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const patterns = listLengthPatterns(difficulty);
    const answer = pickOne(patterns, random);
    return {
      prompt: {
        ask: difficulty === 1 ? "Long or short?" : "Which sounds did you hear?",
        clips: [
          buildLengthsClip(
            readLengths(answer),
            pickOne(["recorder", "voice", "violin", "flute"], random),
          ),
        ],
        stage: { kind: "gramophone" },
      },
      choices: pickChoices(answer, patterns, random),
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: { kind: "lengths", lengths: readLengths(choice) },
  }),
  describeChoice: (choice) => readLengths(choice).join(", "),
  findChoiceSound: (choice) =>
    buildLengthsClip(readLengths(choice), "recorder"),
});

const sameOrDifferent = ["same", "different"] as const;

const changeOnePitch = (
  notes: readonly MusicNote[],
  smallestShift: number,
  largestShift: number,
  random: () => number,
): MusicNote[] => {
  const sounding = notes.flatMap((note, index) => (note.isRest ? [] : [index]));
  const changed = pickOne(sounding.slice(1), random);
  const shift =
    pickWholeNumber(smallestShift, largestShift, random) *
    pickOne([-1, 1], random);
  return notes.map((note, index) =>
    index === changed
      ? { ...note, pitches: note.pitches.map((pitch) => pitch + shift) }
      : note,
  );
};

const buildEchoTune = (random: () => number): MusicNote[] =>
  takeBeats(
    buildTune(traditionalTunes[pickOne(traditionalTuneNames, random)]),
    5,
  );

export const echoMountain = defineMusicGame({
  gameType: "echo-mountain",
  title: "Echo mountain",
  skillId: "music.same-or-different",
  instruction: "Is the echo the same tune, or different?",
  hint: "Not quite. Hum the first tune, then hum the echo. Did anything change?",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(sameOrDifferent, random);
    const call = buildEchoTune(random);
    const shifts: Record<MusicDifficulty, [number, number]> = {
      1: [5, 7],
      2: [3, 5],
      3: [1, 2],
    };
    const [smallestShift, largestShift] = shifts[difficulty];
    const echo =
      answer === "same"
        ? call
        : changeOnePitch(call, smallestShift, largestShift, random);
    const instrument = pickOne<Instrument>(
      ["piano", "xylophone", "recorder"],
      random,
    );
    return {
      prompt: {
        ask: "Same or different?",
        clips: [
          buildClip({ tempo: 108 }, [buildVoice(instrument, call)]),
          buildClip({ tempo: 108 }, [
            buildVoice(instrument, echo, { loudness: 0.8 }),
          ]),
        ],
        stage: { kind: "gramophone" },
      },
      choices: [...sameOrDifferent],
      answer,
    };
  },
  findChoiceArt: (choice): ChoiceArt => ({
    kind: "card",
    face: {
      kind: "picture",
      icon: choice === "same" ? "same" : "different",
    },
  }),
});

const directions = ["up", "down", "stay"] as const;

const directionModels: Record<(typeof directions)[number], MusicModel> = {
  up: "stairs-up",
  down: "stairs-down",
  stay: "flat-path",
};

const isDirection = (value: string): value is (typeof directions)[number] =>
  directions.some((direction) => direction === value);

const majorScale = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];

const buildDirectionPitches = (
  direction: (typeof directions)[number],
  noteCount: number,
  hasLeaps: boolean,
  random: () => number,
): number[] => {
  const largestStep = hasLeaps ? 2 : 1;
  const steps = Array.from({ length: noteCount - 1 }, () =>
    pickWholeNumber(1, largestStep, random),
  );
  const climb = steps.reduce((total, step) => total + step, 0);
  if (direction === "stay") {
    const pitch = pickOne(majorScale.slice(0, 8), random);
    return Array.from({ length: noteCount }, () => pitch);
  }
  const startIndex =
    direction === "up"
      ? pickWholeNumber(0, majorScale.length - 1 - climb, random)
      : pickWholeNumber(climb, majorScale.length - 1, random);
  let index = startIndex;
  return [
    majorScale[startIndex],
    ...steps.map((step) => {
      index += direction === "up" ? step : -step;
      return majorScale[index];
    }),
  ];
};

export const upDownOrStay = defineMusicGame({
  gameType: "up-down-or-stay",
  title: "Up, down or stay?",
  skillId: "music.melody-direction",
  instruction: "Does the tune go up, down, or stay?",
  hint: "Not quite. Move your hand up or down with each note, then listen again.",
  hintKind: "listen",
  labelStyle: "caption",
  hasFixedChoiceOrder: true,
  buildQuestion: (difficulty, random) => {
    const answer = pickOne(directions, random);
    const pitches = buildDirectionPitches(
      answer,
      difficulty + 2,
      difficulty === 3,
      random,
    );
    return {
      prompt: {
        ask: "Up, down or stay?",
        clips: [
          buildClip({ tempo: 96 }, [
            buildVoice(
              pickOne(["piano", "xylophone", "glockenspiel"], random),
              buildMelody(pitches),
            ),
          ]),
        ],
        stage: { kind: "keyboard", lowest: "C4", highest: "G5", marked: [] },
      },
      choices: [...directions],
      answer,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "model",
    model: isDirection(choice) ? directionModels[choice] : "flat-path",
  }),
});

interface Chant {
  words: string;
  rhythm: string;
}

const twoBeatChants: readonly Chant[] = [
  { words: "Big drum", rhythm: "ta ta" },
  { words: "Tick tock", rhythm: "ta ta" },
  { words: "Jel-ly bean", rhythm: "ti-ti ta" },
  { words: "Hon-ey bee", rhythm: "ti-ti ta" },
  { words: "Red ap-ple", rhythm: "ta ti-ti" },
  { words: "Blue pen-cil", rhythm: "ta ti-ti" },
  { words: "Cat-er-pil-lar", rhythm: "ti-ti ti-ti" },
  { words: "Wa-ter-mel-on", rhythm: "ti-ti ti-ti" },
];

const fourBeatChants: readonly Chant[] = [
  { words: "Hot cross buns", rhythm: "ta ta ta sh" },
  { words: "Pease por-ridge hot", rhythm: "ta ti-ti ta sh" },
  { words: "Jel-ly on a plate", rhythm: "ti-ti ti-ti ta sh" },
  { words: "Rain, rain, go a-way", rhythm: "ta ta ti-ti ta" },
  { words: "Snail, snail, go a-round", rhythm: "ta ta ti-ti ta" },
  { words: "Two lit-tle dick-y birds", rhythm: "ta ti-ti ti-ti ta" },
  { words: "Cob-bler, cob-bler, mend my shoe", rhythm: "ti-ti ti-ti ti-ti ta" },
  { words: "Bounce high, bounce low", rhythm: "ta ta ta ta" },
  { words: "Star light, star bright", rhythm: "ta ta ta ta" },
  { words: "Ted-dy bear, ted-dy bear", rhythm: "ti-ti ta ti-ti ta" },
  { words: "En-gine, en-gine, num-ber nine", rhythm: "ti-ti ti-ti ti-ti ta" },
  { words: "Once I caught a fish a-live", rhythm: "ti-ti ti-ti ti-ti ta" },
];

const chantsByWords = new Map(
  [...twoBeatChants, ...fourBeatChants].map((chant) => [chant.words, chant]),
);

const listChantSyllables = (words: string): string[] =>
  words
    .split(/[\s-]+/)
    .map((syllable) => syllable.replaceAll(/[^A-Za-z']/g, ""))
    .filter((syllable) => syllable !== "");

const isChantRhythm = (choice: string): boolean =>
  choice.split(" ").every(isRhythmSyllable);

const soPitch = 67;
const miPitch = 64;

const buildChantedClip = (rhythm: string): MusicClip =>
  buildClip({ tempo: 96 }, [
    buildVoice(
      "voice",
      listRhythmSounds(rhythm).map(({ beats, isRest }, index) =>
        isRest
          ? buildRest(beats)
          : buildNote([index % 2 === 0 ? soPitch : miPitch], beats),
      ),
    ),
  ]);

const buildClappedClip = (rhythm: string, tempo: number): MusicClip =>
  buildClip({ tempo }, [buildVoice("clap", buildRhythmNotes(rhythm))]);

const pickChantsWithDifferentRhythms = (
  answer: Chant,
  pool: readonly Chant[],
  count: number,
  random: () => number,
): Chant[] =>
  shuffleValues(pool, random).reduce(
    (picked, chant) =>
      picked.length < count &&
      picked.every(({ rhythm }) => rhythm !== chant.rhythm)
        ? [...picked, chant]
        : picked,
    [answer],
  );

const chantTempos: Record<MusicDifficulty, number> = { 1: 84, 2: 96, 3: 96 };

export const chantAlong = defineMusicGame({
  gameType: "chant-along",
  title: "Chant along",
  skillId: "music.chants-and-rhymes",
  instruction: "Listen carefully, then tap your answer.",
  hint: "Not quite. Say the words and clap once for every syllable, then listen again.",
  hintKind: "listen",
  labelStyle: "hidden",
  buildQuestion: (difficulty, random) => {
    const pool = difficulty === 1 ? twoBeatChants : fourBeatChants;
    const chant = pickOne(pool, random);
    const choiceChants = pickChantsWithDifferentRhythms(
      chant,
      pool,
      difficulty === 3 ? 4 : findChoiceCountFor(difficulty),
      random,
    );
    if (difficulty === 3) {
      return {
        prompt: {
          ask: "Which rhythm matches the chant?",
          clips: [buildChantedClip(chant.rhythm)],
          stage: {
            kind: "chant-stones",
            rhythm: chant.rhythm,
            syllables: listChantSyllables(chant.words),
          },
        },
        choices: shuffleValues(
          choiceChants.map(({ rhythm }) => rhythm),
          random,
        ),
        answer: chant.rhythm,
      };
    }
    return {
      prompt: {
        ask: "Which words fit the claps?",
        clips: [buildClappedClip(chant.rhythm, chantTempos[difficulty])],
        stage: { kind: "chant-stones", rhythm: chant.rhythm, syllables: [] },
      },
      choices: shuffleValues(
        choiceChants.map(({ words }) => words),
        random,
      ),
      answer: chant.words,
    };
  },
  findChoiceArt: (choice) => ({
    kind: "card",
    face: isChantRhythm(choice)
      ? { kind: "rhythm", rhythm: choice }
      : { kind: "word", lines: [choice] },
  }),
  describeChoice: (choice) =>
    isChantRhythm(choice)
      ? `the rhythm ${choice}`
      : `the words ${choice.replaceAll("-", "")}`,
  findChoiceSound: (choice) => {
    if (isChantRhythm(choice)) {
      return buildClappedClip(choice, chantTempos[3]);
    }
    const chant = chantsByWords.get(choice);
    return chant === undefined ? undefined : buildChantedClip(chant.rhythm);
  },
});

export const yearOneMusicGames = [
  bigDrumLittleDrum,
  hareAndTortoise,
  birdOrBear,
  drumBeatCounter,
  clapStampClick,
  percussionDetective,
  carnivalOfTheAnimals,
  longAndShort,
  echoMountain,
  upDownOrStay,
  chantAlong,
] as const;
