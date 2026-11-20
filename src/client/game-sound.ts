import { useEffect } from "react";
import type { ChildLimits } from "../curriculum/island-access.js";
import { findFrequency } from "../curriculum/music-theory.js";
import type { ThemeMusic, TuneStep } from "../curriculum/world-map.js";
import { isMusicPlaying } from "./music-player.js";
import { isMotionReduced } from "./reduced-motion.js";

export const soundEffects = ["right", "wrong", "star", "unlock"] as const;

export type SoundEffect = (typeof soundEffects)[number];

export type SoundSettings = Pick<
  ChildLimits,
  "isMusicMuted" | "areSoundEffectsMuted"
>;

export const effectWave = "square";
export const tuneWave = "triangle";

interface Blip {
  pitch: TuneStep;
  seconds: number;
}

interface ChipDesk {
  audio: AudioContext;
  effects: GainNode;
  music: GainNode;
}

const effectsLoudness = 0.18;
const musicLoudness = 0.06;
const attackSeconds = 0.005;
const startDelaySeconds = 0.02;
const tuneStartDelaySeconds = 0.1;
const secondsPerMinute = 60;
const stepsPerBeat = 2;
const millisecondsPerSecond = 1000;

const buildBlips = (pitches: readonly number[], seconds: number): Blip[] =>
  pitches.map((pitch) => ({ pitch, seconds }));

const effectBlips: Record<SoundEffect, Blip[]> = {
  right: buildBlips([72, 76, 79, 84], 0.07),
  wrong: buildBlips([55, 51], 0.14),
  star: buildBlips([88, 95, 88, 95], 0.05),
  unlock: buildBlips([72, 79, 84, 88, 91, 96], 0.08),
};

let desk: ChipDesk | undefined;

const isAudioOffered = (): boolean => typeof AudioContext === "function";

const followSilentSwitch = (): void => {
  if (
    "audioSession" in navigator &&
    typeof navigator.audioSession === "object" &&
    navigator.audioSession !== null
  ) {
    Reflect.set(navigator.audioSession, "type", "ambient");
  }
};

const openChipDesk = (): ChipDesk | undefined => {
  if (desk !== undefined || !isAudioOffered()) {
    return desk;
  }
  followSilentSwitch();
  const audio = new AudioContext();
  const effects = audio.createGain();
  effects.gain.value = effectsLoudness;
  effects.connect(audio.destination);
  const music = audio.createGain();
  music.gain.value = musicLoudness;
  music.connect(audio.destination);
  desk = { audio, effects, music };
  return desk;
};

const playBlips = (
  { audio }: ChipDesk,
  bus: GainNode,
  blips: readonly Blip[],
  wave: OscillatorType,
  startsAt: number,
  sounding: Set<OscillatorNode> = new Set(),
): void => {
  let blipStartsAt = startsAt;
  for (const { pitch, seconds } of blips) {
    if (pitch !== null) {
      const oscillator = audio.createOscillator();
      oscillator.type = wave;
      oscillator.frequency.value = findFrequency(pitch);
      const envelope = audio.createGain();
      envelope.gain.setValueAtTime(0, blipStartsAt);
      envelope.gain.linearRampToValueAtTime(1, blipStartsAt + attackSeconds);
      envelope.gain.linearRampToValueAtTime(0, blipStartsAt + seconds);
      oscillator.connect(envelope);
      envelope.connect(bus);
      sounding.add(oscillator);
      oscillator.addEventListener("ended", () => {
        sounding.delete(oscillator);
      });
      oscillator.start(blipStartsAt);
      oscillator.stop(blipStartsAt + seconds);
    }
    blipStartsAt += seconds;
  }
};

export const playSoundEffect = (
  effect: SoundEffect,
  { areSoundEffectsMuted }: SoundSettings,
): void => {
  if (areSoundEffectsMuted) {
    return;
  }
  const openedDesk = openChipDesk();
  if (openedDesk === undefined) {
    return;
  }
  void openedDesk.audio.resume();
  playBlips(
    openedDesk,
    openedDesk.effects,
    effectBlips[effect],
    effectWave,
    openedDesk.audio.currentTime + startDelaySeconds,
  );
};

export interface RoomSound {
  pitches: readonly number[];
  seconds: number;
  wave: OscillatorType;
}

export const playRoomSound = (
  { pitches, seconds, wave }: RoomSound,
  { areSoundEffectsMuted }: SoundSettings,
): void => {
  if (areSoundEffectsMuted) {
    return;
  }
  const openedDesk = openChipDesk();
  if (openedDesk === undefined) {
    return;
  }
  void openedDesk.audio.resume();
  playBlips(
    openedDesk,
    openedDesk.effects,
    buildBlips(pitches, seconds),
    wave,
    openedDesk.audio.currentTime + startDelaySeconds,
  );
};

const attractionNoteSeconds = 0.18;

/** Plays a short tune once, such as the bandstand's, on the music bus. */
export const playAttractionTune = (
  pitches: readonly number[],
  { isMusicMuted }: SoundSettings,
): void => {
  if (isMusicMuted || isMusicPlaying()) {
    return;
  }
  const openedDesk = openChipDesk();
  if (openedDesk === undefined) {
    return;
  }
  void openedDesk.audio.resume();
  playBlips(
    openedDesk,
    openedDesk.music,
    buildBlips(pitches, attractionNoteSeconds),
    tuneWave,
    openedDesk.audio.currentTime + startDelaySeconds,
  );
};

const stopSounding = (sounding: ReadonlySet<OscillatorNode>): void => {
  for (const oscillator of sounding) {
    oscillator.stop();
  }
};

export const startRegionTune = (
  music: ThemeMusic,
  regionId: string,
  isMusicMuted: boolean,
): (() => void) => {
  const tune: TuneStep[] | undefined = Object.hasOwn(
    music.regionTunes,
    regionId,
  )
    ? music.regionTunes[regionId]
    : undefined;
  const openedDesk =
    tune === undefined || isMusicMuted || isMotionReduced()
      ? undefined
      : openChipDesk();
  if (tune === undefined || openedDesk === undefined) {
    return () => undefined;
  }
  void openedDesk.audio.resume();
  const stepSeconds = secondsPerMinute / music.beatsPerMinute / stepsPerBeat;
  const blips = tune.map((pitch) => ({ pitch, seconds: stepSeconds }));
  const loopSeconds = stepSeconds * tune.length;
  const sounding = new Set<OscillatorNode>();
  let nextLoopAt = openedDesk.audio.currentTime + tuneStartDelaySeconds;

  const keepOneLoopAhead = () => {
    while (nextLoopAt < openedDesk.audio.currentTime + loopSeconds) {
      if (!isMusicPlaying()) {
        playBlips(
          openedDesk,
          openedDesk.music,
          blips,
          tuneWave,
          nextLoopAt,
          sounding,
        );
      }
      nextLoopAt += loopSeconds;
    }
  };

  keepOneLoopAhead();
  const timer = setInterval(
    keepOneLoopAhead,
    (loopSeconds * millisecondsPerSecond) / 2,
  );
  return () => {
    clearInterval(timer);
    stopSounding(sounding);
  };
};

export const useRegionTune = (
  music: ThemeMusic | undefined,
  regionId: string | undefined,
  isMusicMuted: boolean,
): void => {
  useEffect(
    () =>
      music === undefined || regionId === undefined
        ? undefined
        : startRegionTune(music, regionId, isMusicMuted),
    [music, regionId, isMusicMuted],
  );
};

/** One sound of the Stars' fireworks, at the moment it is drawn (ADR 0059). */
export interface FireworkSoundCue {
  kind: "launch" | "burst" | "shooting-star";
  /** From the start of the show. */
  atSeconds: number;
  /** How long what is drawn lasts: a rocket's rise, a burst's sparks or a shooting star. */
  seconds: number;
}

export interface FireworkSounds {
  /** How long after now the show's sounds start, so the drawing can wait the same. */
  delaySeconds: number;
  stop: () => void;
}

const fireworkLoudness = {
  whistle: 0.22,
  bang: 0.9,
  crackle: 0.32,
  twinkle: 0.18,
};
const cracklesPerBurst = 9;
const silent = 0.0001;

let noise: AudioBuffer | undefined;

// One second of white noise, made once, that every bang and crackle plays from.
export const findNoise = (audio: AudioContext): AudioBuffer => {
  if (noise !== undefined) {
    return noise;
  }
  const made = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const samples = made.getChannelData(0);
  for (let sample = 0; sample < samples.length; sample += 1) {
    samples[sample] = Math.random() * 2 - 1;
  }
  noise = made;
  return made;
};

type Sounding = Set<AudioScheduledSourceNode>;

const startSource = (
  source: AudioScheduledSourceNode,
  startsAt: number,
  stopsAt: number,
  sounding: Sounding,
) => {
  sounding.add(source);
  source.addEventListener("ended", () => {
    sounding.delete(source);
  });
  source.start(startsAt);
  source.stop(stopsAt);
};

const fadeOut = (
  audio: AudioContext,
  loudness: number,
  startsAt: number,
  seconds: number,
): GainNode => {
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(silent, startsAt);
  envelope.gain.exponentialRampToValueAtTime(loudness, startsAt + 0.006);
  envelope.gain.exponentialRampToValueAtTime(silent, startsAt + seconds);
  return envelope;
};

const playNoise = (
  { audio, effects }: ChipDesk,
  filter: { type: BiquadFilterType; from: number; to: number },
  loudness: number,
  startsAt: number,
  seconds: number,
  sounding: Sounding,
) => {
  const source = audio.createBufferSource();
  source.buffer = findNoise(audio);
  const shaping = audio.createBiquadFilter();
  shaping.type = filter.type;
  shaping.frequency.setValueAtTime(filter.from, startsAt);
  shaping.frequency.exponentialRampToValueAtTime(filter.to, startsAt + seconds);
  const envelope = fadeOut(audio, loudness, startsAt, seconds);
  source.connect(shaping);
  shaping.connect(envelope);
  envelope.connect(effects);
  startSource(source, startsAt, startsAt + seconds, sounding);
};

const playSweep = (
  { audio, effects }: ChipDesk,
  wave: OscillatorType,
  [fromHertz, toHertz]: [number, number],
  loudness: number,
  startsAt: number,
  seconds: number,
  sounding: Sounding,
) => {
  const oscillator = audio.createOscillator();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(fromHertz, startsAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    toHertz,
    startsAt + seconds,
  );
  const envelope = fadeOut(audio, loudness, startsAt, seconds);
  oscillator.connect(envelope);
  envelope.connect(effects);
  startSource(oscillator, startsAt, startsAt + seconds, sounding);
};

const playFireworkCue = (
  openedDesk: ChipDesk,
  { kind, atSeconds, seconds }: FireworkSoundCue,
  showStartsAt: number,
  random: () => number,
  sounding: Sounding,
) => {
  const startsAt = showStartsAt + atSeconds;
  switch (kind) {
    // A thin whistle climbing as the rocket rises, gone as it bursts.
    case "launch":
      playSweep(
        openedDesk,
        "triangle",
        [520 + random() * 120, 1500 + random() * 400],
        fireworkLoudness.whistle,
        startsAt,
        seconds,
        sounding,
      );
      return;
    // A deep thump and a boom of noise as the stars burst out, then
    // crackles while they fade.
    case "burst": {
      playSweep(
        openedDesk,
        "sine",
        [110, 38],
        fireworkLoudness.bang,
        startsAt,
        0.35,
        sounding,
      );
      playNoise(
        openedDesk,
        { type: "lowpass", from: 2400, to: 160 },
        fireworkLoudness.bang,
        startsAt,
        0.9,
        sounding,
      );
      for (let crackle = 0; crackle < cracklesPerBurst; crackle += 1) {
        playNoise(
          openedDesk,
          { type: "highpass", from: 3200, to: 2400 },
          fireworkLoudness.crackle * (0.5 + random() * 0.5),
          startsAt + 0.2 + random() * seconds * 0.7,
          0.03,
          sounding,
        );
      }
      return;
    }
    // A soft, high twinkle as a shooting star streaks across.
    case "shooting-star":
      playSweep(
        openedDesk,
        "sine",
        [findFrequency(96), findFrequency(103)],
        fireworkLoudness.twinkle,
        startsAt,
        Math.min(seconds, 0.45),
        sounding,
      );
  }
};

/**
 * Plays the Stars' fireworks: each sound scheduled on the audio clock at
 * the moment its rocket rises, bursts or shooting star appears, so the
 * sound keeps in step with what is drawn. Silent when a Parent has turned
 * sound effects off.
 */
export const playFireworkSounds = (
  cues: readonly FireworkSoundCue[],
  { areSoundEffectsMuted }: SoundSettings,
  random: () => number = Math.random,
): FireworkSounds => {
  const openedDesk = areSoundEffectsMuted ? undefined : openChipDesk();
  if (openedDesk === undefined) {
    return { delaySeconds: 0, stop: () => undefined };
  }
  void openedDesk.audio.resume();
  const sounding: Sounding = new Set();
  const showStartsAt = openedDesk.audio.currentTime + startDelaySeconds;
  for (const cue of cues) {
    playFireworkCue(openedDesk, cue, showStartsAt, random, sounding);
  }
  return {
    delaySeconds: startDelaySeconds,
    stop: () => {
      for (const source of sounding) {
        source.stop();
      }
      sounding.clear();
    },
  };
};

/**
 * The effects bus, ready to play on, and when a sound scheduled now
 * should start; undefined when sound effects are off or there is no audio.
 */
export const openEffectsBus = ({
  areSoundEffectsMuted,
}: SoundSettings):
  { audio: AudioContext; effects: GainNode; startsAt: number } | undefined => {
  const openedDesk = areSoundEffectsMuted ? undefined : openChipDesk();
  if (openedDesk === undefined) {
    return undefined;
  }
  void openedDesk.audio.resume();
  return {
    audio: openedDesk.audio,
    effects: openedDesk.effects,
    startsAt: openedDesk.audio.currentTime + startDelaySeconds,
  };
};
