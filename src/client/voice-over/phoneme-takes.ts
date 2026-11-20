import {
  isPhonicsSound,
  phonicsSounds,
  type PhonicsSound,
} from "../../curriculum/phonics-sounds.js";
import type { MonoSound } from "./voice-over-files.js";

export interface PhonemeTake {
  sound: PhonicsSound;
  fileName: string;
}

export interface PhonemeTakePlan {
  takes: PhonemeTake[];
  missingSounds: PhonicsSound[];
}

export class UnusablePhonemeTakesError extends Error {
  override name = "UnusablePhonemeTakesError";
}

export const phonemeTakeExtensions = [
  ".wav",
  ".m4a",
  ".mp3",
  ".aif",
  ".aiff",
  ".flac",
  ".caf",
] as const;

export const phonemeSampleRate = 16_000;
export const phonemeTargetRmsDecibels = -15;
export const phonemePeakCeilingDecibels = -1;
export const phonemeLongestSeconds = 1.5;
const phonemePaddingSeconds = 0.05;
const phonemeSilenceBelowPeakDecibels = -40;
const largestSampleValue = 32_767;

const takeFileShape = /^(?<name>[^.]+)(?<extension>\.[A-Za-z0-9]+)$/;

const isTakeExtension = (extension: string): boolean =>
  phonemeTakeExtensions.some(
    (takeExtension) => takeExtension === extension.toLowerCase(),
  );

export const planPhonemeTakes = (
  fileNames: readonly string[],
): PhonemeTakePlan => {
  const audioFileNames = fileNames.filter((fileName) => {
    const extension = takeFileShape.exec(fileName)?.groups?.extension;
    return extension !== undefined && isTakeExtension(extension);
  });
  const takes: PhonemeTake[] = [];
  const unknownFileNames: string[] = [];
  for (const fileName of audioFileNames) {
    const sound = takeFileShape.exec(fileName)?.groups?.name;
    if (isPhonicsSound(sound)) {
      takes.push({ sound, fileName });
    } else {
      unknownFileNames.push(fileName);
    }
  }
  if (unknownFileNames.length > 0) {
    throw new UnusablePhonemeTakesError(
      `These takes aren't named after one of the 44 sounds: ${unknownFileNames.join(", ")}. Rename each to its sound, such as m.wav or oo-long.m4a`,
    );
  }

  const repeatedSounds = phonicsSounds.filter(
    (sound) => takes.filter((take) => take.sound === sound).length > 1,
  );
  if (repeatedSounds.length > 0) {
    throw new UnusablePhonemeTakesError(
      `Keep only your best take of each sound; these have more than one: ${repeatedSounds.join(", ")}`,
    );
  }

  return {
    takes,
    missingSounds: phonicsSounds.filter(
      (sound) => !takes.some((take) => take.sound === sound),
    ),
  };
};

const convertDecibelsToRatio = (decibels: number): number =>
  10 ** (decibels / 20);

const findPeak = (samples: Int16Array): number =>
  samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);

const findRms = (samples: Int16Array): number => {
  const sumOfSquares = samples.reduce(
    (total, sample) => total + sample * sample,
    0,
  );
  return Math.sqrt(sumOfSquares / samples.length);
};

export const trimPhonemeSilence = ({
  sampleRate,
  samples,
}: MonoSound): MonoSound => {
  const threshold =
    findPeak(samples) * convertDecibelsToRatio(phonemeSilenceBelowPeakDecibels);
  const isHeard = (sample: number) => Math.abs(sample) > threshold;
  const firstHeard = samples.findIndex(isHeard);
  if (firstHeard === -1) {
    throw new UnusablePhonemeTakesError("The take is silent");
  }
  const lastHeard = samples.findLastIndex(isHeard);
  const padding = Math.round(sampleRate * phonemePaddingSeconds);
  return {
    sampleRate,
    samples: samples.slice(
      Math.max(0, firstHeard - padding),
      Math.min(samples.length, lastHeard + 1 + padding),
    ),
  };
};

export const normalisePhonemeLoudness = ({
  sampleRate,
  samples,
}: MonoSound): MonoSound => {
  const rmsGain =
    (largestSampleValue * convertDecibelsToRatio(phonemeTargetRmsDecibels)) /
    findRms(samples);
  const peakGain =
    (largestSampleValue * convertDecibelsToRatio(phonemePeakCeilingDecibels)) /
    findPeak(samples);
  const gain = Math.min(rmsGain, peakGain);
  return {
    sampleRate,
    samples: samples.map((sample) => Math.round(sample * gain)),
  };
};

export const preparePhonemeSound = (take: MonoSound): MonoSound =>
  normalisePhonemeLoudness(trimPhonemeSilence(take));

export const getSoundSeconds = ({ sampleRate, samples }: MonoSound): number =>
  samples.length / sampleRate;

export const getRmsDecibels = ({ samples }: MonoSound): number =>
  20 * Math.log10(findRms(samples) / largestSampleValue);
