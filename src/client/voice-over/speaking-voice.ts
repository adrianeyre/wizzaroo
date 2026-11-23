import type { VoiceCharacterId } from "./voice-characters.js";

/**
 * Who is speaking, and how loud they are right now, so their character's
 * face can show and its mouth move with the words (ADR 0077). Each speaker,
 * Piper, a recorded line or the device's own voice, says when it starts
 * and stops, and hands over the loudness of what it plays on its own clock.
 */

/** How often the loudness is measured: a mouth can't move faster than this. */
const stepSeconds = 1 / 30;

/** Below this share of a sound's loudest moment, the mouth is closed. */
const quietShare = 0.12;

export interface Loudness {
  /** From nothing to full, at a time in seconds from the sound's start. */
  readAt: (seconds: number) => number;
  seconds: number;
}

export const buildLoudness = (
  samples: Float32Array,
  sampleRate: number,
): Loudness => {
  const samplesPerStep = Math.max(1, Math.round(sampleRate * stepSeconds));
  const steps = Math.ceil(samples.length / samplesPerStep);
  const levels = new Float32Array(steps);
  for (let step = 0; step < steps; step++) {
    let sum = 0;
    const from = step * samplesPerStep;
    const to = Math.min(samples.length, from + samplesPerStep);
    for (let index = from; index < to; index++) {
      sum += samples[index] * samples[index];
    }
    levels[step] = Math.sqrt(sum / Math.max(1, to - from));
  }
  const loudest = Math.max(0, ...levels);
  for (let step = 0; step < steps; step++) {
    const share = loudest === 0 ? 0 : levels[step] / loudest;
    levels[step] = share < quietShare ? 0 : Math.min(1, share * 1.15);
  }
  return {
    seconds: samples.length / sampleRate,
    readAt: (seconds) => {
      const step = Math.floor(seconds / stepSeconds);
      return step < 0 || step >= steps ? 0 : levels[step];
    },
  };
};

interface Heard {
  startsAt: number;
  loudness: Loudness;
}

export interface SpeakingCharacter {
  voice: VoiceCharacterId;
  /** Adds a sound that starts at this time on the speaker's clock, ending any chatter. */
  hear: (startsAt: number, loudness: Loudness) => void;
  /** For a voice whose sound can't be measured: the mouth moves word by word. */
  chatter: () => void;
  stop: () => void;
}

interface Speaker {
  character: SpeakingCharacter;
  readClock: () => number;
  heard: Heard[];
  isChattering: boolean;
}

let speaker: Speaker | undefined;
const listeners = new Set<() => void>();

const tellListeners = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeToSpeaking = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const findSpeakingCharacter = (): SpeakingCharacter | undefined =>
  speaker?.character;

/** About three syllables a second, each a quick open and close. */
const chatterOpenness = (seconds: number): number => {
  const syllable = Math.sin(seconds * Math.PI * 2 * 3.2);
  const phrase = Math.sin(seconds * Math.PI * 2 * 0.45);
  return phrase < -0.75 ? 0 : Math.max(0, syllable) * 0.85;
};

/** How far the speaking character's mouth is open now, from 0 to 1. */
export const findMouthOpenness = (): number => {
  if (speaker === undefined) {
    return 0;
  }
  const now = speaker.readClock();
  if (speaker.isChattering) {
    return chatterOpenness(now);
  }
  const playing = speaker.heard.find(
    ({ startsAt, loudness }) =>
      now >= startsAt && now < startsAt + loudness.seconds,
  );
  return playing === undefined
    ? 0
    : playing.loudness.readAt(now - playing.startsAt);
};

/**
 * Says that a voice has started speaking, its sound timed by `readClock`.
 * A new speaker takes over from any before; stopping one that has already
 * been taken over from does nothing.
 */
export const startSpeaking = (
  voice: VoiceCharacterId,
  readClock: () => number,
): SpeakingCharacter => {
  const started: Speaker = {
    readClock,
    heard: [],
    isChattering: false,
    character: {
      voice,
      hear: (startsAt, loudness) => {
        started.heard.push({ startsAt, loudness });
        started.isChattering = false;
      },
      chatter: () => {
        started.isChattering = true;
      },
      stop: () => {
        if (speaker === started) {
          speaker = undefined;
          tellListeners();
        }
      },
    },
  };
  speaker = started;
  tellListeners();
  return started.character;
};

const stagedVoices = new Map<VoiceCharacterId, number>();

/**
 * Says a page already shows this voice's character, as Settings does on its
 * stage, so it talks there rather than in a face of its own. Returns how to
 * take it off again.
 */
export const showVoiceOnStage = (voice: VoiceCharacterId): (() => void) => {
  stagedVoices.set(voice, (stagedVoices.get(voice) ?? 0) + 1);
  tellListeners();
  return () => {
    const count = (stagedVoices.get(voice) ?? 1) - 1;
    if (count === 0) {
      stagedVoices.delete(voice);
    } else {
      stagedVoices.set(voice, count);
    }
    tellListeners();
  };
};

export const isVoiceOnStage = (voice: VoiceCharacterId): boolean =>
  stagedVoices.has(voice);
