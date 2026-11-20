import {
  buildSoundSchedule,
  findClipSeconds,
  findFrequency,
  type Instrument,
  type MusicClip,
  type ScheduledSound,
} from "../curriculum/music-theory.js";

const startDelaySeconds = 0.08;
export const clipGapSeconds = 0.6;
const releaseSeconds = 0.09;
const loudnessRangeDecibels = 32;
const unpitchedFrequency = 196;

interface HeardSound {
  pitches: number[];
  startsAt: number;
  endsAt: number;
}

interface HeardClip {
  startsAt: number;
  endsAt: number;
  secondsPerBeat: number;
}

interface PlaybackTimeline {
  sounds: HeardSound[];
  clips: HeardClip[];
  endsAt: number;
}

interface MusicDesk {
  audio: AudioContext;
  master: GainNode;
  analyser: AnalyserNode;
  noise: AudioBuffer;
  levelSamples: Float32Array<ArrayBuffer>;
}

let desk: MusicDesk | undefined;
let playbackBus: GainNode | undefined;
let timeline: PlaybackTimeline = { sounds: [], clips: [], endsAt: 0 };
let smoothedLevel = 0;

const isAudioOffered = () => typeof AudioContext === "function";

const buildNoise = (audio: AudioContext): AudioBuffer => {
  const noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const samples = noise.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  return noise;
};

const openMusicDesk = (): MusicDesk => {
  if (desk !== undefined) {
    return desk;
  }
  const audio = new AudioContext();
  const master = audio.createGain();
  master.gain.value = 0.55;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  const analyser = audio.createAnalyser();
  analyser.fftSize = 256;
  master.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(audio.destination);
  desk = {
    audio,
    master,
    analyser,
    noise: buildNoise(audio),
    levelSamples: new Float32Array(analyser.fftSize),
  };
  return desk;
};

const findGain = (loudness: number) =>
  10 ** (((Math.max(0, loudness) - 1) * loudnessRangeDecibels) / 20);

interface NoteTarget {
  audio: AudioContext;
  output: AudioNode;
  noise: AudioBuffer;
  startsAt: number;
  durationSeconds: number;
  frequency: number;
  gain: number;
}

const buildEnvelope = (
  { audio, output, startsAt }: NoteTarget,
  peak: number,
  attackSeconds: number,
  holdSeconds: number,
  decaySeconds: number,
): GainNode => {
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0, startsAt);
  envelope.gain.linearRampToValueAtTime(peak, startsAt + attackSeconds);
  envelope.gain.setTargetAtTime(
    0,
    startsAt + attackSeconds + holdSeconds,
    decaySeconds / 4,
  );
  envelope.connect(output);
  return envelope;
};

const startOscillator = (
  target: NoteTarget,
  type: OscillatorType,
  frequency: number,
  destination: AudioNode,
  stopsAfter: number,
): OscillatorNode => {
  const oscillator = target.audio.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, target.startsAt);
  oscillator.connect(destination);
  oscillator.start(target.startsAt);
  oscillator.stop(target.startsAt + stopsAfter);
  return oscillator;
};

interface Overtone {
  ratio: number;
  level: number;
  decaySeconds: number;
}

const playStruckOvertones = (
  target: NoteTarget,
  overtones: readonly Overtone[],
  type: OscillatorType = "sine",
) => {
  for (const { ratio, level, decaySeconds } of overtones) {
    const ringsFor = Math.max(target.durationSeconds, decaySeconds) + 0.1;
    const envelope = buildEnvelope(
      target,
      target.gain * level,
      0.004,
      0,
      decaySeconds,
    );
    envelope.gain.setTargetAtTime(
      0,
      target.startsAt + target.durationSeconds + 0.02,
      releaseSeconds,
    );
    startOscillator(
      target,
      type,
      target.frequency * ratio,
      envelope,
      ringsFor + 0.4,
    );
  }
};

interface SustainedVoice {
  type: OscillatorType;
  cutoff: number;
  attackSeconds: number;
  vibratoDepth: number;
  detuneCents?: number;
  layers?: number;
  bandpass?: number;
  brassBite?: boolean;
  breath?: number;
  sub?: number;
}

const playSustained = (
  target: NoteTarget,
  {
    type,
    cutoff,
    attackSeconds,
    vibratoDepth,
    detuneCents = 0,
    layers = 1,
    bandpass,
    brassBite = false,
    breath = 0,
    sub = 0,
  }: SustainedVoice,
) => {
  const { audio, startsAt, durationSeconds, frequency, gain } = target;
  const lastsFor = durationSeconds + releaseSeconds * 5;
  const envelope = audio.createGain();
  const level = gain / Math.sqrt(layers);
  envelope.gain.setValueAtTime(0, startsAt);
  envelope.gain.linearRampToValueAtTime(level, startsAt + attackSeconds);
  envelope.gain.setValueAtTime(level, startsAt + durationSeconds);
  envelope.gain.setTargetAtTime(0, startsAt + durationSeconds, releaseSeconds);
  envelope.connect(target.output);
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.7;
  if (brassBite) {
    filter.frequency.setValueAtTime(cutoff * 0.25, startsAt);
    filter.frequency.linearRampToValueAtTime(cutoff, startsAt + 0.06);
  } else {
    filter.frequency.value = cutoff;
  }
  if (bandpass === undefined) {
    filter.connect(envelope);
  } else {
    const colour = audio.createBiquadFilter();
    colour.type = "peaking";
    colour.frequency.value = bandpass;
    colour.gain.value = 9;
    colour.Q.value = 1.4;
    filter.connect(colour);
    colour.connect(envelope);
  }
  const vibrato = audio.createOscillator();
  const vibratoAmount = audio.createGain();
  vibrato.frequency.value = 5.4;
  vibratoAmount.gain.setValueAtTime(0, startsAt);
  vibratoAmount.gain.linearRampToValueAtTime(
    frequency * vibratoDepth,
    startsAt + Math.min(0.4, durationSeconds),
  );
  vibrato.connect(vibratoAmount);
  vibrato.start(startsAt);
  vibrato.stop(startsAt + lastsFor);
  for (let layer = 0; layer < layers; layer++) {
    const oscillator = startOscillator(
      target,
      type,
      frequency,
      filter,
      lastsFor,
    );
    oscillator.detune.value = (layer - (layers - 1) / 2) * detuneCents;
    vibratoAmount.connect(oscillator.frequency);
  }
  if (sub > 0) {
    const subLevel = audio.createGain();
    subLevel.gain.value = sub;
    subLevel.connect(filter);
    startOscillator(target, "sine", frequency / 2, subLevel, lastsFor);
  }
  if (breath > 0) {
    const breathSource = audio.createBufferSource();
    breathSource.buffer = target.noise;
    breathSource.loop = true;
    const breathFilter = audio.createBiquadFilter();
    breathFilter.type = "bandpass";
    breathFilter.frequency.value = frequency * 2;
    breathFilter.Q.value = 2;
    const breathLevel = audio.createGain();
    breathLevel.gain.value = breath;
    breathSource.connect(breathFilter);
    breathFilter.connect(breathLevel);
    breathLevel.connect(envelope);
    breathSource.start(startsAt);
    breathSource.stop(startsAt + lastsFor);
  }
};

interface NoiseHit {
  filterType: BiquadFilterType;
  filterFrequency: number;
  q?: number;
  level: number;
  decaySeconds: number;
  delaySeconds?: number;
}

const playNoiseHit = (
  target: NoteTarget,
  {
    filterType,
    filterFrequency,
    q = 0.8,
    level,
    decaySeconds,
    delaySeconds = 0,
  }: NoiseHit,
) => {
  const { audio } = target;
  const startsAt = target.startsAt + delaySeconds;
  const source = audio.createBufferSource();
  source.buffer = target.noise;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFrequency;
  filter.Q.value = q;
  const envelope = audio.createGain();
  envelope.gain.setValueAtTime(0, startsAt);
  envelope.gain.linearRampToValueAtTime(target.gain * level, startsAt + 0.002);
  envelope.gain.setTargetAtTime(0, startsAt + 0.002, decaySeconds / 4);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(target.output);
  source.start(startsAt);
  source.stop(startsAt + decaySeconds * 2 + 0.05);
};

const playPitchDrop = (
  target: NoteTarget,
  from: number,
  to: number,
  dropSeconds: number,
  level: number,
  decaySeconds: number,
) => {
  const envelope = buildEnvelope(
    target,
    target.gain * level,
    0.003,
    0,
    decaySeconds,
  );
  const oscillator = startOscillator(
    target,
    "sine",
    from,
    envelope,
    decaySeconds * 2 + 0.1,
  );
  oscillator.frequency.exponentialRampToValueAtTime(
    to,
    target.startsAt + dropSeconds,
  );
};

const instrumentVoices: Record<Instrument, (target: NoteTarget) => void> = {
  piano: (target) => {
    playStruckOvertones(target, [
      { ratio: 1, level: 0.7, decaySeconds: 1.6 },
      { ratio: 2, level: 0.32, decaySeconds: 1 },
      { ratio: 3, level: 0.14, decaySeconds: 0.6 },
      { ratio: 4, level: 0.07, decaySeconds: 0.35 },
    ]);
  },
  glockenspiel: (target) => {
    playStruckOvertones(target, [
      { ratio: 1, level: 0.6, decaySeconds: 1.8 },
      { ratio: 2.76, level: 0.22, decaySeconds: 0.45 },
      { ratio: 5.4, level: 0.1, decaySeconds: 0.15 },
    ]);
  },
  xylophone: (target) => {
    playStruckOvertones(target, [
      { ratio: 1, level: 0.75, decaySeconds: 0.35 },
      { ratio: 3.93, level: 0.25, decaySeconds: 0.1 },
      { ratio: 9.2, level: 0.08, decaySeconds: 0.04 },
    ]);
  },
  marimba: (target) => {
    playStruckOvertones(target, [
      { ratio: 1, level: 0.8, decaySeconds: 0.7 },
      { ratio: 4, level: 0.18, decaySeconds: 0.12 },
    ]);
  },
  harp: (target) => {
    playStruckOvertones(
      target,
      [
        { ratio: 1, level: 0.6, decaySeconds: 1.4 },
        { ratio: 2, level: 0.2, decaySeconds: 0.7 },
        { ratio: 3, level: 0.08, decaySeconds: 0.3 },
      ],
      "triangle",
    );
  },
  guitar: (target) => {
    playStruckOvertones(
      target,
      [
        { ratio: 1, level: 0.45, decaySeconds: 1.1 },
        { ratio: 2, level: 0.25, decaySeconds: 0.6 },
        { ratio: 3, level: 0.15, decaySeconds: 0.3 },
        { ratio: 5, level: 0.06, decaySeconds: 0.12 },
      ],
      "triangle",
    );
    playNoiseHit(target, {
      filterType: "bandpass",
      filterFrequency: 3000,
      level: 0.08,
      decaySeconds: 0.02,
    });
  },
  harpsichord: (target) => {
    playStruckOvertones(
      target,
      [
        { ratio: 1, level: 0.28, decaySeconds: 0.9 },
        { ratio: 2, level: 0.2, decaySeconds: 0.7 },
        { ratio: 3, level: 0.16, decaySeconds: 0.5 },
        { ratio: 4, level: 0.12, decaySeconds: 0.35 },
        { ratio: 6, level: 0.06, decaySeconds: 0.2 },
      ],
      "square",
    );
  },
  violin: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 4200,
      attackSeconds: 0.07,
      vibratoDepth: 0.006,
      bandpass: 2600,
    });
  },
  cello: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 2200,
      attackSeconds: 0.09,
      vibratoDepth: 0.005,
      bandpass: 900,
    });
  },
  "double-bass": (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 900,
      attackSeconds: 0.08,
      vibratoDepth: 0.003,
      sub: 0.4,
    });
  },
  strings: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 3000,
      attackSeconds: 0.18,
      vibratoDepth: 0.004,
      detuneCents: 9,
      layers: 3,
    });
  },
  flute: (target) => {
    playSustained(target, {
      type: "sine",
      cutoff: 6000,
      attackSeconds: 0.06,
      vibratoDepth: 0.005,
      breath: 0.12,
    });
  },
  recorder: (target) => {
    playSustained(target, {
      type: "triangle",
      cutoff: 3500,
      attackSeconds: 0.03,
      vibratoDepth: 0,
      breath: 0.06,
    });
  },
  clarinet: (target) => {
    playSustained(target, {
      type: "square",
      cutoff: 2400,
      attackSeconds: 0.04,
      vibratoDepth: 0.001,
    });
  },
  oboe: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 5000,
      attackSeconds: 0.04,
      vibratoDepth: 0.004,
      bandpass: 1400,
    });
  },
  bassoon: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 1300,
      attackSeconds: 0.05,
      vibratoDepth: 0.002,
      bandpass: 500,
    });
  },
  trumpet: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 4200,
      attackSeconds: 0.03,
      vibratoDepth: 0.002,
      brassBite: true,
    });
  },
  "french-horn": (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 1100,
      attackSeconds: 0.08,
      vibratoDepth: 0.001,
      brassBite: true,
    });
  },
  trombone: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 1800,
      attackSeconds: 0.05,
      vibratoDepth: 0.001,
      brassBite: true,
    });
  },
  tuba: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 650,
      attackSeconds: 0.06,
      vibratoDepth: 0.001,
      sub: 0.5,
      brassBite: true,
    });
  },
  organ: (target) => {
    playSustained(target, {
      type: "sine",
      cutoff: 8000,
      attackSeconds: 0.02,
      vibratoDepth: 0,
      sub: 0.5,
    });
    playSustained(
      { ...target, frequency: target.frequency * 2, gain: target.gain * 0.4 },
      { type: "sine", cutoff: 8000, attackSeconds: 0.02, vibratoDepth: 0 },
    );
  },
  voice: (target) => {
    playSustained(target, {
      type: "sawtooth",
      cutoff: 1100,
      attackSeconds: 0.1,
      vibratoDepth: 0.007,
      bandpass: 400,
    });
  },
  "bass-drum": (target) => {
    playPitchDrop(target, 150, 46, 0.12, 1, 0.45);
    playNoiseHit(target, {
      filterType: "lowpass",
      filterFrequency: 1200,
      level: 0.15,
      decaySeconds: 0.03,
    });
  },
  stamp: (target) => {
    playPitchDrop(target, 110, 50, 0.08, 0.9, 0.22);
    playNoiseHit(target, {
      filterType: "lowpass",
      filterFrequency: 400,
      level: 0.6,
      decaySeconds: 0.12,
    });
  },
  "snare-drum": (target) => {
    playNoiseHit(target, {
      filterType: "highpass",
      filterFrequency: 1200,
      level: 0.7,
      decaySeconds: 0.22,
    });
    playPitchDrop(target, 220, 170, 0.05, 0.45, 0.12);
  },
  "hand-drum": (target) => {
    playPitchDrop(target, 240, 140, 0.09, 0.95, 0.38);
    playNoiseHit(target, {
      filterType: "bandpass",
      filterFrequency: 900,
      level: 0.2,
      decaySeconds: 0.04,
    });
  },
  timpani: (target) => {
    playPitchDrop(
      target,
      target.frequency * 1.02,
      target.frequency,
      0.08,
      0.9,
      1.6,
    );
    playStruckOvertones(target, [
      { ratio: 1.5, level: 0.25, decaySeconds: 0.9 },
      { ratio: 1.98, level: 0.15, decaySeconds: 0.6 },
    ]);
    playNoiseHit(target, {
      filterType: "lowpass",
      filterFrequency: 700,
      level: 0.25,
      decaySeconds: 0.08,
    });
  },
  triangle: (target) => {
    playStruckOvertones({ ...target, frequency: 4200, durationSeconds: 2 }, [
      { ratio: 1, level: 0.22, decaySeconds: 2.4 },
      { ratio: 1.34, level: 0.16, decaySeconds: 2 },
      { ratio: 1.71, level: 0.1, decaySeconds: 1.6 },
    ]);
  },
  maracas: (target) => {
    playNoiseHit(target, {
      filterType: "bandpass",
      filterFrequency: 6500,
      q: 1.2,
      level: 0.9,
      decaySeconds: 0.08,
    });
  },
  tambourine: (target) => {
    playNoiseHit(target, {
      filterType: "highpass",
      filterFrequency: 6500,
      level: 0.6,
      decaySeconds: 0.3,
    });
    for (const delaySeconds of [0, 0.018, 0.036]) {
      playNoiseHit(target, {
        filterType: "bandpass",
        filterFrequency: 9500,
        q: 6,
        level: 0.8,
        decaySeconds: 0.12,
        delaySeconds,
      });
    }
    playPitchDrop(target, 260, 200, 0.05, 0.3, 0.1);
  },
  woodblock: (target) => {
    playPitchDrop(target, 1000, 940, 0.02, 0.8, 0.07);
    playNoiseHit(target, {
      filterType: "bandpass",
      filterFrequency: 2200,
      q: 3,
      level: 0.3,
      decaySeconds: 0.02,
    });
  },
  cymbal: (target) => {
    playNoiseHit(target, {
      filterType: "highpass",
      filterFrequency: 5200,
      level: 0.6,
      decaySeconds: 1.8,
    });
    playStruckOvertones(
      { ...target, frequency: 520 },
      [
        { ratio: 1, level: 0.05, decaySeconds: 1.2 },
        { ratio: 2.37, level: 0.05, decaySeconds: 1 },
        { ratio: 3.91, level: 0.04, decaySeconds: 0.8 },
      ],
      "square",
    );
  },
  clap: (target) => {
    for (const delaySeconds of [0, 0.011, 0.022]) {
      playNoiseHit(target, {
        filterType: "bandpass",
        filterFrequency: 1400,
        q: 1.1,
        level: 0.9,
        decaySeconds: delaySeconds === 0.022 ? 0.16 : 0.02,
        delaySeconds,
      });
    }
  },
  click: (target) => {
    playPitchDrop(target, 2600, 2400, 0.01, 0.6, 0.03);
    playNoiseHit(target, {
      filterType: "highpass",
      filterFrequency: 3000,
      level: 0.4,
      decaySeconds: 0.015,
    });
  },
  tick: (target) => {
    playPitchDrop(target, 1900, 1850, 0.01, 0.5, 0.035);
  },
};

const scheduleSound = (
  { audio, noise }: MusicDesk,
  output: AudioNode,
  sound: ScheduledSound,
  startsAt: number,
) => {
  const frequencies =
    sound.pitches.length === 0
      ? [unpitchedFrequency]
      : sound.pitches.map(findFrequency);
  const gain = findGain(sound.loudness) / Math.sqrt(frequencies.length);
  for (const frequency of frequencies) {
    instrumentVoices[sound.instrument]({
      audio,
      output,
      noise,
      startsAt: startsAt + sound.startSeconds,
      durationSeconds: sound.durationSeconds,
      frequency,
      gain,
    });
  }
};

export const stopMusic = (): void => {
  if (desk !== undefined && playbackBus !== undefined) {
    const { audio } = desk;
    playbackBus.gain.setTargetAtTime(0, audio.currentTime, 0.02);
    const fadingBus = playbackBus;
    window.setTimeout(() => {
      fadingBus.disconnect();
    }, 200);
  }
  playbackBus = undefined;
  timeline = { sounds: [], clips: [], endsAt: 0 };
};

export const playMusicClips = (clips: readonly MusicClip[]): number => {
  stopMusic();
  if (!isAudioOffered() || clips.length === 0) {
    return 0;
  }
  const musicDesk = openMusicDesk();
  const { audio } = musicDesk;
  void audio.resume();
  const bus = audio.createGain();
  bus.connect(musicDesk.master);
  playbackBus = bus;
  let clipStartsAt = audio.currentTime + startDelaySeconds;
  const sounds: HeardSound[] = [];
  const heardClips: HeardClip[] = [];
  for (const clip of clips) {
    for (const sound of buildSoundSchedule(clip)) {
      scheduleSound(musicDesk, bus, sound, clipStartsAt);
      sounds.push({
        pitches: sound.pitches,
        startsAt: clipStartsAt + sound.startSeconds,
        endsAt: clipStartsAt + sound.startSeconds + sound.durationSeconds,
      });
    }
    const clipSeconds = findClipSeconds(clip);
    heardClips.push({
      startsAt: clipStartsAt,
      endsAt: clipStartsAt + clipSeconds,
      secondsPerBeat: 60 / clip.tempo,
    });
    clipStartsAt += clipSeconds + clipGapSeconds;
  }
  const endsAt = clipStartsAt - clipGapSeconds;
  timeline = { sounds, clips: heardClips, endsAt };
  return endsAt - audio.currentTime;
};

const findNow = () => desk?.audio.currentTime ?? 0;

export const isMusicPlaying = (): boolean => findNow() < timeline.endsAt;

export const findSoundingPitches = (): number[] => {
  const now = findNow();
  return timeline.sounds
    .filter(({ startsAt, endsAt }) => startsAt <= now && now < endsAt)
    .flatMap(({ pitches }) => pitches);
};

export const findSecondsSinceOnset = (): number => {
  const now = findNow();
  const latestOnset = timeline.sounds.reduce(
    (latest, { startsAt }) =>
      startsAt <= now && startsAt > latest ? startsAt : latest,
    Number.NEGATIVE_INFINITY,
  );
  return now - latestOnset;
};

export const findPlayingBeat = (): number | undefined => {
  const now = findNow();
  const clip = timeline.clips.find(
    ({ startsAt, endsAt }) => startsAt <= now && now < endsAt,
  );
  return clip === undefined
    ? undefined
    : (now - clip.startsAt) / clip.secondsPerBeat;
};

export const readMusicLevel = (): number => {
  if (desk === undefined || !isMusicPlaying()) {
    smoothedLevel *= 0.9;
    return smoothedLevel;
  }
  const { analyser, levelSamples } = desk;
  analyser.getFloatTimeDomainData(levelSamples);
  const meanSquare =
    levelSamples.reduce((total, sample) => total + sample * sample, 0) /
    levelSamples.length;
  const level = Math.min(1, Math.sqrt(meanSquare) * 4);
  smoothedLevel += (level - smoothedLevel) * 0.3;
  return smoothedLevel;
};
