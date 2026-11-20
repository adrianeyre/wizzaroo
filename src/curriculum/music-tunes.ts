import {
  buildNote,
  buildRest,
  findPitchOf,
  InvalidMusicError,
  type MusicNote,
} from "./music-theory.js";

interface TuneShape {
  loudness?: number;
  length?: number;
}

const tuneNotePattern = /^(-|[A-G][#b]?-?\d)(?::(\d+(?:\.\d+)?))?$/;

export const buildTune = (tune: string, shape: TuneShape = {}): MusicNote[] =>
  tune
    .split(" ")
    .filter((written) => written !== "")
    .map((written) => {
      const match = tuneNotePattern.exec(written);
      const note = match?.[1];
      if (match === null || note === undefined) {
        throw new InvalidMusicError(
          `"${written}" in a tune isn't written like "C4", "F#4:2" or "-:1"`,
        );
      }
      const writtenBeats = match.at(2);
      const beats = writtenBeats === undefined ? 1 : Number(writtenBeats);
      return note === "-"
        ? buildRest(beats)
        : buildNote([findPitchOf(note)], beats, shape);
    });

export const takeBeats = (
  notes: readonly MusicNote[],
  largestBeats: number,
): MusicNote[] => {
  let beats = 0;
  return notes.filter((note) => {
    beats += note.beats;
    return beats <= largestBeats;
  });
};

export const transposeNotes = (
  notes: readonly MusicNote[],
  semitones: number,
): MusicNote[] =>
  notes.map((note) => ({
    ...note,
    pitches: note.pitches.map((pitch) => pitch + semitones),
  }));

export const traditionalTunes = {
  twinkle: "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2",
  hotCrossBuns:
    "E4 D4 C4:2 E4 D4 C4:2 C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5 E4 D4 C4:2",
  frereJacques: "C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2",
  maryLamb: "E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2",
  londonBridge: "G4:1.5 A4:0.5 G4 F4 E4 F4 G4:2 D4 E4 F4:2 E4 F4 G4:2",
  oldMacDonald: "C4 C4 C4 G3 A3 A3 G3:2 E4 E4 D4 D4 C4:2",
} as const;

export type TraditionalTune = keyof typeof traditionalTunes;
const isTraditionalTune = (name: string): name is TraditionalTune =>
  Object.hasOwn(traditionalTunes, name);

export const traditionalTuneNames: readonly TraditionalTune[] =
  Object.keys(traditionalTunes).filter(isTraditionalTune);

export interface ComposerTheme {
  composer: string;
  piece: string;
  period: "Baroque" | "Classical" | "Romantic";
  tempo: number;
  instrument: "strings" | "piano" | "violin" | "flute" | "oboe" | "harpsichord";
  melody: string;
  bass: string;
}

export const composerThemes = {
  spring: {
    composer: "Vivaldi",
    piece: "Spring, from The Four Seasons",
    period: "Baroque",
    tempo: 112,
    instrument: "violin",
    melody:
      "E4 G#4 G#4 G#4 F#4:0.5 E4:0.5 B4:3 B4:0.5 A4:0.5 G#4 G#4 G#4 F#4:0.5 E4:0.5 B4:3",
    bass: "E3:4 E3:4 E3:4 E3:4",
  },
  canon: {
    composer: "Pachelbel",
    piece: "Canon in D",
    period: "Baroque",
    tempo: 76,
    instrument: "strings",
    melody: "F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2",
    bass: "D3:2 A2:2 B2:2 F#2:2 G2:2 D2:2 G2:2 A2:2",
  },
  nachtmusik: {
    composer: "Mozart",
    piece: "Eine kleine Nachtmusik",
    period: "Classical",
    tempo: 132,
    instrument: "strings",
    melody: "G4 -:0.5 D4:0.5 G4 -:0.5 D4:0.5 G4:0.5 D4:0.5 G4:0.5 B4:0.5 D5:2",
    bass: "G2 -:0.5 D2:0.5 G2 -:0.5 D2:0.5 G2:2 G2:2",
  },
  odeToJoy: {
    composer: "Beethoven",
    piece: "Ode to Joy, from Symphony No. 9",
    period: "Classical",
    tempo: 116,
    instrument: "strings",
    melody: "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2",
    bass: "C3:2 G2:2 C3:2 G2:2 A2:2 F2:2 G2:2 G2:2",
  },
  surprise: {
    composer: "Haydn",
    piece: "the Surprise Symphony",
    period: "Classical",
    tempo: 104,
    instrument: "strings",
    melody: "C4 C4 E4 E4 G4 G4 E4:2 F4 F4 D4 D4 B3 B3 G3:2",
    bass: "C3:2 C3:2 C3:2 C3:2 G2:2 G2:2 G2:2 G2:2",
  },
  mountainKing: {
    composer: "Grieg",
    piece: "In the Hall of the Mountain King",
    period: "Romantic",
    tempo: 120,
    instrument: "strings",
    melody:
      "B3:0.5 C#4:0.5 D4:0.5 E4:0.5 F#4:0.5 D4:0.5 F#4 F4:0.5 C#4:0.5 F4 E4:0.5 C4:0.5 E4",
    bass: "B2:0.5 -:0.5 B2:0.5 -:0.5 B2:0.5 -:0.5 B2:0.5 -:0.5 B2:0.5 -:0.5 B2:0.5 -:0.5",
  },
  lullaby: {
    composer: "Brahms",
    piece: "Lullaby",
    period: "Romantic",
    tempo: 84,
    instrument: "piano",
    melody:
      "E4:0.5 E4:0.5 G4:2 E4:0.5 E4:0.5 G4:2 E4:0.5 G4:0.5 C5 B4:1.5 A4:0.5 A4 G4",
    bass: "C3:3 C3:3 C3:3 F3:1.5 G3:1.5",
  },
  largo: {
    composer: "Dvořák",
    piece: "the New World Symphony",
    period: "Romantic",
    tempo: 60,
    instrument: "oboe",
    melody:
      "E4:1.5 G4:0.5 G4:2 E4:1.5 D4:0.5 C4:2 D4:1.5 E4:0.5 G4:1.5 E4:0.5 D4:4",
    bass: "C3:4 C3:4 G2:4 G2:4",
  },
  swanLake: {
    composer: "Tchaikovsky",
    piece: "Swan Lake",
    period: "Romantic",
    tempo: 76,
    instrument: "oboe",
    melody:
      "F#5:3 B4:0.5 C#5:0.5 D5:0.5 E5:0.5 F#5:1.5 D5:0.5 F#5:1.5 D5:0.5 F#5:1.5 B4:0.5 D5:0.5 B4:0.5 G4:0.5 D5:0.5 B4:3",
    bass: "B2:4 B2:4 G2:4 B2:4",
  },
} as const satisfies Record<string, ComposerTheme>;

export type ComposerThemeName = keyof typeof composerThemes;
