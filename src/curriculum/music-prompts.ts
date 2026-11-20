import type { MusicClip } from "./music-theory.js";

export const musicModels = [
  "big-drum",
  "little-drum",
  "triangle",
  "maracas",
  "tambourine",
  "woodblock",
  "cymbal",
  "timpani",
  "xylophone",
  "piano",
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
  "french-horn",
  "trombone",
  "tuba",
  "metronome",
  "elephant",
  "bird",
  "snake",
  "kangaroo",
  "hare",
  "tortoise",
  "bear",
  "sun",
  "rain-cloud",
  "stairs-up",
  "stairs-down",
  "flat-path",
] as const;

export type MusicModel = (typeof musicModels)[number];

export const moods = ["happy", "sad", "scary", "sleepy"] as const;
export type Mood = (typeof moods)[number];

export type PictureIcon =
  | "house"
  | "question"
  | "same"
  | "different"
  | "blown"
  | "bowed"
  | "plucked"
  | "struck"
  | "chase"
  | "sneaking"
  | "triumph"
  | "spooky"
  | "unison"
  | "harmony"
  | "round";

export type Clef = "treble" | "bass";

export interface TimeSignature {
  top: number;
  bottom: number;
}

export interface StaffChord {
  notes: string[];
  beats: number;
}

export type BodyAction = "clap" | "stamp" | "click";
export type SoundLength = "long" | "short";
export type Articulation = "legato" | "staccato" | "accent";
export type ChangeOverTime = "rising" | "falling" | "steady";

export type NotationFace =
  | {
      kind: "rhythm";
      rhythm: string;
      timeSignature?: TimeSignature;
      gapBeats?: number;
      isSum?: boolean;
    }
  | {
      kind: "staff";
      clef: Clef;
      chords: StaffChord[];
      keySignature: number;
      timeSignature?: TimeSignature;
    }
  | { kind: "dots"; levels: number[] }
  | { kind: "lengths"; lengths: SoundLength[] }
  | { kind: "actions"; actions: BodyAction[] }
  | { kind: "symbol"; text: string }
  | { kind: "word"; lines: string[] }
  | { kind: "hairpin"; change: ChangeOverTime }
  | {
      kind: "dynamics-journey";
      from: string;
      to: string;
      isGradual: boolean;
    }
  | { kind: "picture"; icon: PictureIcon }
  | { kind: "beat-groups"; beatsPerBar: number }
  | { kind: "tempo-dots"; change: ChangeOverTime }
  | { kind: "beat-grid"; isSyncopated: boolean }
  | { kind: "time-signature"; signature: TimeSignature }
  | { kind: "articulation"; articulation: Articulation };

export type ChoiceArt =
  | { kind: "pad" }
  | { kind: "card"; face: NotationFace }
  | { kind: "model"; model: MusicModel }
  | { kind: "mask"; mood: Mood }
  | { kind: "bar"; pitch: number; name: string }
  | { kind: "blocks"; sections: string }
  | { kind: "cake"; layers: number };

export type StageProp =
  | { kind: "gramophone" }
  | { kind: "drum"; beatLamps: number }
  | { kind: "keyboard"; lowest: string; highest: string; marked: string[] }
  | { kind: "music-stand"; face: NotationFace }
  | { kind: "conductor"; beatsPerBar: number }
  | { kind: "ladder"; rungs: string[] }
  | { kind: "lily-pads" }
  | { kind: "chant-stones"; rhythm: string; syllables: string[] }
  | { kind: "instrument"; model: MusicModel };

export interface MusicPrompt {
  ask: string;
  clips: MusicClip[];
  stage: StageProp;
  reward?: MusicClip;
}
