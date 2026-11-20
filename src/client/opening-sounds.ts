import { findFrequency } from "../curriculum/music-theory.js";
import { findNoise, openEffectsBus, type SoundSettings } from "./game-sound.js";

/**
 * The sounds for opening something special, each a little piece of its
 * own, layered like a film's sound effect and made in the browser:
 *
 * - **"Treasure!"**, for the Family Chest, in C major: the lid thunks
 *   and its hinge creaks, a harp sweeps up two octaves with a rush of
 *   air, brass blasts "ta… DAAA!" over a timpani boom and a cymbal
 *   shimmer, and gold coins clink and tumble out.
 * - **"WOW!"**, for the Awards, in D major: a slide whistle zooms up into
 *   a choir singing a swooping "wowww", then glockenspiel sparkles climb
 *   to a double "ding!" while a crowd claps.
 *
 * Every layer feeds one mixer with a compressor, so the piece hits hard
 * without clipping. Silent when a Parent has turned sound effects off.
 */

export const openingSounds = ["treasure", "wow"] as const;

/** "treasure" for the Family Chest, "wow" for the Awards. */
export type OpeningSound = (typeof openingSounds)[number];

/** A layer of a piece, kept so tests can follow what is played and when. */
export interface OpeningVoice {
  kind: "tone" | "noise";
  wave: OscillatorType | "noise";
  startsAt: number;
  stopsAt: number;
}

interface Stage {
  audio: AudioContext;
  out: AudioNode;
  random: () => number;
  voices: OpeningVoice[];
}

const silent = 0.0001;

const centsToRatio = (cents: number) => 2 ** (cents / 1200);

// Swells to its peak in `attack`, then dies away smoothly to nothing.
const shapeEnvelope = (
  audio: AudioContext,
  peak: number,
  startsAt: number,
  attack: number,
  seconds: number,
): GainNode => {
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(silent, startsAt);
  envelope.gain.exponentialRampToValueAtTime(peak, startsAt + attack);
  envelope.gain.exponentialRampToValueAtTime(silent, startsAt + seconds);
  return envelope;
};

const startVoice = (
  stage: Stage,
  source: AudioScheduledSourceNode,
  voice: OpeningVoice,
) => {
  stage.voices.push(voice);
  source.start(voice.startsAt);
  source.stop(voice.stopsAt);
};

interface ToneParts {
  wave: OscillatorType;
  /** A steady pitch, or a glide through each pitch in turn. */
  hertz: number | readonly number[];
  startsAt: number;
  seconds: number;
  peak: number;
  attack?: number;
  vibrato?: { rate: number; depth: number };
  out?: AudioNode;
}

const playTone = (
  stage: Stage,
  {
    wave,
    hertz,
    startsAt,
    seconds,
    peak,
    attack = 0.005,
    vibrato,
    out = stage.out,
  }: ToneParts,
) => {
  const { audio } = stage;
  const oscillator = audio.createOscillator();
  oscillator.type = wave;
  const glide = typeof hertz === "number" ? [hertz] : hertz;
  oscillator.frequency.setValueAtTime(glide[0], startsAt);
  glide.slice(1).forEach((pitch, step) => {
    oscillator.frequency.exponentialRampToValueAtTime(
      pitch,
      startsAt + (seconds * (step + 1)) / (glide.length - 1),
    );
  });
  if (vibrato !== undefined) {
    const wobble = audio.createOscillator();
    wobble.frequency.value = vibrato.rate;
    const depth = audio.createGain();
    depth.gain.setValueAtTime(0, startsAt);
    depth.gain.linearRampToValueAtTime(vibrato.depth, startsAt + seconds * 0.4);
    wobble.connect(depth);
    depth.connect(oscillator.frequency);
    wobble.start(startsAt);
    wobble.stop(startsAt + seconds);
  }
  const envelope = shapeEnvelope(audio, peak, startsAt, attack, seconds);
  oscillator.connect(envelope);
  envelope.connect(out);
  startVoice(stage, oscillator, {
    kind: "tone",
    wave,
    startsAt,
    stopsAt: startsAt + seconds,
  });
};

interface NoiseParts {
  filter: BiquadFilterType;
  /** The filter's frequency at the start and at the end. */
  sweep: readonly [number, number];
  q?: number;
  startsAt: number;
  seconds: number;
  peak: number;
  attack?: number;
}

const playNoise = (
  stage: Stage,
  { filter, sweep, q = 1, startsAt, seconds, peak, attack = 0.004 }: NoiseParts,
) => {
  const { audio } = stage;
  const source = audio.createBufferSource();
  source.buffer = findNoise(audio);
  const shaping = audio.createBiquadFilter();
  shaping.type = filter;
  shaping.Q.value = q;
  shaping.frequency.setValueAtTime(sweep[0], startsAt);
  shaping.frequency.exponentialRampToValueAtTime(sweep[1], startsAt + seconds);
  const envelope = shapeEnvelope(audio, peak, startsAt, attack, seconds);
  source.connect(shaping);
  shaping.connect(envelope);
  envelope.connect(stage.out);
  startVoice(stage, source, {
    kind: "noise",
    wave: "noise",
    startsAt,
    stopsAt: startsAt + seconds,
  });
};

/** A struck metal bar: a pure tone with the bright, quickly fading overtones of a glockenspiel or a coin. */
const playBell = (
  stage: Stage,
  hertz: number,
  startsAt: number,
  seconds: number,
  peak: number,
) => {
  playTone(stage, { wave: "sine", hertz, startsAt, seconds, peak });
  playTone(stage, {
    wave: "sine",
    hertz: hertz * 2.76,
    startsAt,
    seconds: seconds * 0.45,
    peak: peak * 0.45,
  });
  playTone(stage, {
    wave: "sine",
    hertz: hertz * 5.4,
    startsAt,
    seconds: seconds * 0.2,
    peak: peak * 0.2,
  });
};

/**
 * A brass note: two slightly detuned saws through a filter that bursts
 * open, as a trumpet's bright blat does, then settles, with vibrato
 * growing as the note is held.
 */
const playBrass = (
  stage: Stage,
  pitch: number,
  startsAt: number,
  seconds: number,
  peak: number,
) => {
  const { audio } = stage;
  const bell = audio.createBiquadFilter();
  bell.type = "lowpass";
  bell.Q.value = 2;
  bell.frequency.setValueAtTime(500, startsAt);
  bell.frequency.exponentialRampToValueAtTime(4200, startsAt + 0.05);
  bell.frequency.exponentialRampToValueAtTime(1800, startsAt + 0.3);
  bell.connect(stage.out);
  const hertz = findFrequency(pitch);
  for (const cents of [-7, 7]) {
    playTone(stage, {
      wave: "sawtooth",
      hertz: hertz * centsToRatio(cents),
      startsAt,
      seconds,
      peak,
      attack: 0.025,
      vibrato: seconds > 0.4 ? { rate: 5.6, depth: hertz * 0.012 } : undefined,
      out: bell,
    });
  }
};

const pickFrom = <Choice>(
  random: () => number,
  choices: readonly Choice[],
): Choice => choices[Math.floor(random() * choices.length)] ?? choices[0];

// C major pentatonic, two octaves up from middle C's octave above.
const harpRun = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];
const coinPitches = [84, 86, 88, 91, 93, 96];

const harpStepSeconds = 0.036;
/** When the "DAAA!" lands, from the start of "Treasure!". */
export const treasureHitSeconds = 0.7;
const coinCount = 14;

const playTreasure = (stage: Stage, startsAt: number) => {
  const { random } = stage;
  // The lid: a wooden thunk, and a creak from the old hinge.
  playNoise(stage, {
    filter: "lowpass",
    sweep: [900, 120],
    startsAt,
    seconds: 0.18,
    peak: 0.9,
  });
  playTone(stage, {
    wave: "sine",
    hertz: [140, 60],
    startsAt,
    seconds: 0.2,
    peak: 0.8,
  });
  playTone(stage, {
    wave: "sawtooth",
    hertz: [70, 95, 78],
    startsAt: startsAt + 0.03,
    seconds: 0.26,
    peak: 0.08,
    attack: 0.04,
  });
  // The magic: a harp sweeping up two octaves on a rush of air.
  harpRun.forEach((pitch, step) => {
    playTone(stage, {
      wave: "triangle",
      hertz: findFrequency(pitch),
      startsAt: startsAt + 0.12 + step * harpStepSeconds,
      seconds: 0.3,
      peak: 0.32,
    });
  });
  playNoise(stage, {
    filter: "bandpass",
    sweep: [500, 6000],
    q: 1.2,
    startsAt: startsAt + 0.12,
    seconds: 0.45,
    peak: 0.3,
    attack: 0.3,
  });
  // "Ta…": a short G major blast.
  const ta = startsAt + 0.55;
  for (const pitch of [67, 71, 74]) {
    playBrass(stage, pitch, ta, 0.12, 0.2);
  }
  // "…DAAA!": C major, held, on a timpani boom, a sub bass and a cymbal.
  const da = startsAt + treasureHitSeconds;
  for (const pitch of [60, 64, 67, 72]) {
    playBrass(stage, pitch, da, 1.3, 0.16);
  }
  playTone(stage, {
    wave: "triangle",
    hertz: findFrequency(36),
    startsAt: da,
    seconds: 1,
    peak: 0.7,
  });
  playTone(stage, {
    wave: "sine",
    hertz: [110, 55],
    startsAt: da,
    seconds: 0.45,
    peak: 0.9,
  });
  playNoise(stage, {
    filter: "highpass",
    sweep: [6000, 3500],
    startsAt: da,
    seconds: 1.3,
    peak: 0.28,
  });
  // The gold: coins clinking and tumbling out, fewer and softer as they settle.
  for (let coin = 0; coin < coinCount; coin += 1) {
    const settling = coin / coinCount;
    playBell(
      stage,
      findFrequency(pickFrom(random, coinPitches)) * (1 + random() * 0.02),
      da + 0.05 + settling ** 1.4 * 1.3 + random() * 0.05,
      0.35,
      0.22 * (1 - settling * 0.6),
    );
  }
};

// D major, the choir's chord, and the glockenspiel's climb to the top.
const choir = [50, 54, 57];
const sparkleRun = [74, 78, 81, 86, 90, 93, 98];
const sparkleStepSeconds = 0.055;
/** When the choir starts singing "wowww", from the start of "WOW!". */
export const wowSingsSeconds = 0.3;
const wowSeconds = 1;
const clapCount = 60;

// The choir sings through two formant filters, as a mouth does: their
// frequencies move from "oo" to "ah" and back, "w-ah-w".
const openMouth = (stage: Stage, startsAt: number): AudioNode => {
  const { audio } = stage;
  const mouth = audio.createGain();
  for (const [formant, q, loudness] of [
    [[300, 800, 330], 6, 1],
    [[800, 1250, 750], 8, 0.6],
  ] as const) {
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(formant[0], startsAt);
    filter.frequency.exponentialRampToValueAtTime(formant[1], startsAt + 0.35);
    filter.frequency.exponentialRampToValueAtTime(
      formant[2],
      startsAt + wowSeconds,
    );
    const level = audio.createGain();
    level.gain.value = loudness;
    mouth.connect(filter);
    filter.connect(level);
    level.connect(stage.out);
  }
  return mouth;
};

const playWow = (stage: Stage, startsAt: number) => {
  const { random } = stage;
  // The slide whistle zooming up, on a whoosh.
  playTone(stage, {
    wave: "sine",
    hertz: [350, 1400],
    startsAt,
    seconds: 0.32,
    peak: 0.35,
    attack: 0.03,
  });
  playNoise(stage, {
    filter: "bandpass",
    sweep: [400, 4000],
    q: 1.5,
    startsAt,
    seconds: 0.32,
    peak: 0.2,
    attack: 0.25,
  });
  // The choir: "wowww", swooping up and settling down.
  const sings = startsAt + wowSingsSeconds;
  const mouth = openMouth(stage, sings);
  choir.forEach((pitch, singer) => {
    const hertz = findFrequency(pitch) * centsToRatio((singer - 1) * 6);
    playTone(stage, {
      wave: "sawtooth",
      hertz: [hertz * 0.92, hertz * 1.06, hertz * 0.97],
      startsAt: sings,
      seconds: wowSeconds,
      peak: 0.85,
      attack: 0.08,
      vibrato: { rate: 5.2 + singer * 0.3, depth: hertz * 0.015 },
      out: mouth,
    });
  });
  // The glockenspiel climbing, then a double "ding!" at the top.
  const sparkles = sings + 0.7;
  sparkleRun.forEach((pitch, step) => {
    playBell(
      stage,
      findFrequency(pitch),
      sparkles + step * sparkleStepSeconds,
      0.6,
      0.24,
    );
  });
  const ding = sparkles + sparkleRun.length * sparkleStepSeconds + 0.06;
  playBell(stage, findFrequency(98), ding, 1, 0.3);
  playBell(stage, findFrequency(105), ding + 0.09, 0.9, 0.24);
  // The crowd clapping, loudest at first and dying away.
  for (let clap = 0; clap < clapCount; clap += 1) {
    const lateness = (clap / clapCount) ** 1.3;
    const centre = 1500 + random() * 1200;
    playNoise(stage, {
      filter: "bandpass",
      sweep: [centre, centre * 0.9],
      q: 2,
      startsAt: sings + 0.35 + lateness * 1.25 + random() * 0.04,
      seconds: 0.016,
      peak: (0.12 + random() * 0.14) * (1 - lateness * 0.7),
      attack: 0.001,
    });
  }
};

const pieces: Record<OpeningSound, (stage: Stage, startsAt: number) => void> = {
  treasure: playTreasure,
  wow: playWow,
};

/**
 * Plays an opening sound once, through its own compressed mixer, and
 * returns every layer it scheduled (none when sound effects are off).
 */
export const playOpeningSound = (
  sound: OpeningSound,
  soundSettings: SoundSettings,
  random: () => number = Math.random,
): OpeningVoice[] => {
  const bus = openEffectsBus(soundSettings);
  if (bus === undefined) {
    return [];
  }
  const { audio, effects, startsAt } = bus;
  const glue = audio.createDynamicsCompressor();
  glue.threshold.value = -16;
  glue.knee.value = 10;
  glue.ratio.value = 4;
  glue.attack.value = 0.003;
  glue.release.value = 0.2;
  glue.connect(effects);
  const mixer = audio.createGain();
  mixer.gain.value = 1.6;
  mixer.connect(glue);
  const stage: Stage = { audio, out: mixer, random, voices: [] };
  pieces[sound](stage, startsAt);
  return stage.voices;
};
