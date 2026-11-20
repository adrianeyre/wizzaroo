export const noteLetters = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type NoteLetter = (typeof noteLetters)[number];

export type Accidental = -1 | 0 | 1;

export interface SpelledNote {
  letter: NoteLetter;
  octave: number;
  accidental: Accidental;
}

export class InvalidMusicError extends Error {
  override name = "InvalidMusicError";
}

const semitonesAboveC: Record<NoteLetter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const notePattern = /^([A-G])([#b]?)(-?\d)$/;
const semitonesPerOctave = 12;
const lettersPerOctave = 7;
const middleAPitch = 69;
const middleAFrequency = 440;

const isNoteLetter = (value: string | undefined): value is NoteLetter =>
  noteLetters.some((letter) => letter === value);

const readAccidental = (sign: string | undefined): Accidental => {
  if (sign === "#") {
    return 1;
  }
  return sign === "b" ? -1 : 0;
};

export const spellNote = (text: string): SpelledNote => {
  const match = notePattern.exec(text);
  const letter = match?.[1];
  if (match === null || !isNoteLetter(letter)) {
    throw new InvalidMusicError(
      `"${text}" isn't a note written like "C4", "F#4" or "Bb3"`,
    );
  }
  return {
    letter,
    octave: Number(match[3]),
    accidental: readAccidental(match[2]),
  };
};

export const findPitch = ({
  letter,
  octave,
  accidental,
}: SpelledNote): number =>
  (octave + 1) * semitonesPerOctave + semitonesAboveC[letter] + accidental;

export const findPitchOf = (text: string): number => findPitch(spellNote(text));

export const findDiatonicStep = ({ letter, octave }: SpelledNote): number =>
  octave * lettersPerOctave + noteLetters.indexOf(letter);

const accidentalSigns: Record<Accidental, string> = {
  [-1]: "♭",
  0: "",
  1: "♯",
};

export const nameNote = ({ letter, accidental }: SpelledNote): string =>
  `${letter}${accidentalSigns[accidental]}`;

export const nameNoteOf = (text: string): string => nameNote(spellNote(text));

export const findFrequency = (pitch: number): number =>
  middleAFrequency * 2 ** ((pitch - middleAPitch) / semitonesPerOctave);

export const isBlackKey = (pitch: number): boolean =>
  [1, 3, 6, 8, 10].includes(
    ((pitch % semitonesPerOctave) + semitonesPerOctave) % semitonesPerOctave,
  );

export const majorScaleSteps = [0, 2, 4, 5, 7, 9, 11] as const;
export const minorScaleSteps = [0, 2, 3, 5, 7, 8, 10] as const;
export const pentatonicScaleSteps = [0, 2, 4, 7, 9] as const;
export const bluesScaleSteps = [0, 3, 5, 6, 7, 10] as const;

export const buildScale = (
  tonic: number,
  steps: readonly number[],
  hasTopNote = true,
): number[] => [
  ...steps.map((step) => tonic + step),
  ...(hasTopNote ? [tonic + semitonesPerOctave] : []),
];

export const instruments = [
  "piano",
  "glockenspiel",
  "xylophone",
  "marimba",
  "violin",
  "cello",
  "double-bass",
  "strings",
  "harp",
  "guitar",
  "flute",
  "recorder",
  "clarinet",
  "oboe",
  "bassoon",
  "trumpet",
  "french-horn",
  "trombone",
  "tuba",
  "harpsichord",
  "organ",
  "voice",
  "bass-drum",
  "snare-drum",
  "hand-drum",
  "timpani",
  "triangle",
  "maracas",
  "tambourine",
  "woodblock",
  "cymbal",
  "clap",
  "stamp",
  "click",
  "tick",
] as const;

export type Instrument = (typeof instruments)[number];

export const unpitchedInstruments = [
  "bass-drum",
  "snare-drum",
  "hand-drum",
  "triangle",
  "maracas",
  "tambourine",
  "woodblock",
  "cymbal",
  "clap",
  "stamp",
  "click",
  "tick",
] as const satisfies readonly Instrument[];

export const isUnpitched = (instrument: Instrument): boolean =>
  unpitchedInstruments.some((unpitched) => unpitched === instrument);

export interface MusicNote {
  beats: number;
  pitches: number[];
  isRest: boolean;
  loudness: number;
  length: number;
}

export interface MusicVoice {
  instrument: Instrument;
  notes: MusicNote[];
  loudness: number;
  startBeat: number;
}

export interface Swell {
  from: number;
  to: number;
}

export interface MusicClip {
  tempo: number;
  finalTempo: number;
  swell: Swell;
  voices: MusicVoice[];
}

export const loudnessLevels = {
  pianissimo: 0.12,
  piano: 0.28,
  mezzo: 0.55,
  forte: 0.8,
  fortissimo: 1,
} as const;

export const legatoLength = 1;
export const normalLength = 0.86;
export const staccatoLength = 0.3;

interface NoteShape {
  loudness?: number;
  length?: number;
}

export const buildNote = (
  pitches: readonly number[],
  beats: number,
  { loudness = loudnessLevels.forte, length = normalLength }: NoteShape = {},
): MusicNote => ({
  beats,
  pitches: [...pitches],
  isRest: false,
  loudness,
  length,
});

export const buildRest = (beats: number): MusicNote => ({
  beats,
  pitches: [],
  isRest: true,
  loudness: 0,
  length: 0,
});

export const buildMelody = (
  pitches: readonly (number | undefined)[],
  beats = 1,
  shape: NoteShape = {},
): MusicNote[] =>
  pitches.map((pitch) =>
    pitch === undefined ? buildRest(beats) : buildNote([pitch], beats, shape),
  );

export const buildMelodyOf = (
  notes: readonly string[],
  beats = 1,
  shape: NoteShape = {},
): MusicNote[] =>
  buildMelody(
    notes.map((note) => (note === "-" ? undefined : findPitchOf(note))),
    beats,
    shape,
  );

interface VoiceShape {
  loudness?: number;
  startBeat?: number;
}

export const buildVoice = (
  instrument: Instrument,
  notes: readonly MusicNote[],
  { loudness = 1, startBeat = 0 }: VoiceShape = {},
): MusicVoice => ({ instrument, notes: [...notes], loudness, startBeat });

interface ClipShape {
  tempo: number;
  finalTempo?: number;
  swell?: Swell;
}

export const buildClip = (
  { tempo, finalTempo = tempo, swell = { from: 1, to: 1 } }: ClipShape,
  voices: readonly MusicVoice[],
): MusicClip => ({ tempo, finalTempo, swell, voices: [...voices] });

export const countVoiceBeats = ({ notes, startBeat }: MusicVoice): number =>
  startBeat + notes.reduce((total, { beats }) => total + beats, 0);

export const countClipBeats = ({ voices }: MusicClip): number =>
  Math.max(0, ...voices.map(countVoiceBeats));

export const findSecondsAtBeat = (
  { tempo, finalTempo }: MusicClip,
  beat: number,
  totalBeats: number,
): number => {
  if (tempo === finalTempo || totalBeats === 0) {
    return (beat * 60) / tempo;
  }
  const tempoChangePerBeat = (finalTempo - tempo) / totalBeats;
  const tempoAtBeat = tempo + tempoChangePerBeat * beat;
  return (60 / tempoChangePerBeat) * Math.log(tempoAtBeat / tempo);
};

export const findClipSeconds = (clip: MusicClip): number => {
  const totalBeats = countClipBeats(clip);
  return findSecondsAtBeat(clip, totalBeats, totalBeats);
};

export interface ScheduledSound {
  instrument: Instrument;
  pitches: number[];
  startSeconds: number;
  durationSeconds: number;
  loudness: number;
}

const blend = (from: number, to: number, share: number) =>
  from + (to - from) * share;

export const buildSoundSchedule = (clip: MusicClip): ScheduledSound[] => {
  const totalBeats = countClipBeats(clip);
  const findSeconds = (beat: number) =>
    findSecondsAtBeat(clip, beat, totalBeats);
  return clip.voices.flatMap((voice) => {
    let beat = voice.startBeat;
    return voice.notes.flatMap((note) => {
      const startBeat = beat;
      beat += note.beats;
      if (note.isRest) {
        return [];
      }
      const startSeconds = findSeconds(startBeat);
      const endSeconds = findSeconds(startBeat + note.beats * note.length);
      const swell = blend(
        clip.swell.from,
        clip.swell.to,
        totalBeats === 0 ? 0 : startBeat / totalBeats,
      );
      return [
        {
          instrument: voice.instrument,
          pitches: note.pitches,
          startSeconds,
          durationSeconds: Math.max(0.04, endSeconds - startSeconds),
          loudness: Math.min(1, note.loudness * voice.loudness * swell),
        },
      ];
    });
  });
};

export const noteValues = [
  "semibreve",
  "dotted-minim",
  "minim",
  "dotted-crotchet",
  "crotchet",
  "quaver",
  "semiquaver",
] as const;

export type NoteValue = (typeof noteValues)[number];

export const noteValueBeats: Record<NoteValue, number> = {
  semibreve: 4,
  "dotted-minim": 3,
  minim: 2,
  "dotted-crotchet": 1.5,
  crotchet: 1,
  quaver: 0.5,
  semiquaver: 0.25,
};

export interface RhythmSound {
  beats: number;
  isRest: boolean;
}

const sound = (beats: number): RhythmSound => ({ beats, isRest: false });
const silence = (beats: number): RhythmSound => ({ beats, isRest: true });
const tripletBeats = 1 / 3;

export const rhythmSyllables = {
  ta: [sound(1)],
  "ti-ti": [sound(0.5), sound(0.5)],
  sh: [silence(1)],
  "ta-a": [sound(2)],
  "ta-a-a": [sound(3)],
  "ta-a-a-a": [sound(4)],
  "ti-ka-ti-ka": [sound(0.25), sound(0.25), sound(0.25), sound(0.25)],
  "ti-ti-ka": [sound(0.5), sound(0.25), sound(0.25)],
  "ti-ka-ti": [sound(0.25), sound(0.25), sound(0.5)],
  "ta-i-ti": [sound(1.5), sound(0.5)],
  "tim-ka": [sound(0.75), sound(0.25)],
  "syn-co-pa": [sound(0.5), sound(1), sound(0.5)],
  "tri-o-la": [sound(tripletBeats), sound(tripletBeats), sound(tripletBeats)],
  "sh-ti": [silence(0.5), sound(0.5)],
  "ti-sh": [sound(0.5), silence(0.5)],
} as const satisfies Record<string, readonly RhythmSound[]>;

export type RhythmSyllable = keyof typeof rhythmSyllables;

export const isRhythmSyllable = (value: string): value is RhythmSyllable =>
  Object.hasOwn(rhythmSyllables, value);

export const parseRhythm = (rhythm: string): RhythmSyllable[] =>
  rhythm
    .split(" ")
    .filter((syllable) => syllable !== "")
    .map((syllable) => {
      if (!isRhythmSyllable(syllable)) {
        throw new InvalidMusicError(
          `"${syllable}" in the rhythm "${rhythm}" isn't a rhythm syllable`,
        );
      }
      return syllable;
    });

export const listRhythmSounds = (rhythm: string): RhythmSound[] =>
  parseRhythm(rhythm).flatMap((syllable) => rhythmSyllables[syllable]);

export const countRhythmBeats = (rhythm: string): number =>
  listRhythmSounds(rhythm).reduce((total, { beats }) => total + beats, 0);

export const buildRhythmNotes = (
  rhythm: string,
  pitches: readonly number[] = [],
  shape: NoteShape = {},
): MusicNote[] =>
  listRhythmSounds(rhythm).map(({ beats, isRest }) =>
    isRest ? buildRest(beats) : buildNote(pitches, beats, shape),
  );

export const buildRhythmClip = (
  rhythm: string,
  instrument: Instrument,
  tempo: number,
  pitches: readonly number[] = [],
): MusicClip =>
  buildClip({ tempo }, [
    buildVoice(instrument, buildRhythmNotes(rhythm, pitches)),
  ]);

export const majorTriadSteps = [0, 4, 7] as const;
export const minorTriadSteps = [0, 3, 7] as const;

export const buildChord = (root: number, steps: readonly number[]): number[] =>
  steps.map((step) => root + step);
