import {
  isPhonicsSound,
  type PhonicsSound,
} from "../../curriculum/phonics-sounds.js";

export interface VoiceOverLine {
  key: string;
  text: string;
}

export interface VoiceOverEngine {
  voice: string;
  speakLine: (text: string, wavPath: string) => Promise<void>;
}

export interface PlannedVoiceOverLine extends VoiceOverLine {
  fileName: string;
}

export interface VoiceOverPlan {
  linesToSpeak: PlannedVoiceOverLine[];
  fileNamesToDelete: string[];
}

interface VoiceOverPlanParts {
  lines: readonly VoiceOverLine[];
  voice: string;
  existingFileNames: readonly string[];
}

export class InvalidVoiceOverLinesError extends Error {
  override name = "InvalidVoiceOverLinesError";
}

const voiceOverKeyShape = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const voiceOverFileShape =
  /^(?<key>[a-z0-9]+(?:[.-][a-z0-9]+)*)\.[0-9a-f]{12}\.wav$/;
const keyInLinesFile = /^\s*"(?<key>(?:[^"\\]|\\.)*)"\s*:/gm;
const fingerprintLength = 12;
const audioExtension = ".wav";

const findDuplicateKey = (linesFile: string): string | undefined => {
  const seenKeys = new Set<string>();
  for (const { groups } of linesFile.matchAll(keyInLinesFile)) {
    const key = groups?.key ?? "";
    if (seenKeys.has(key)) {
      return key;
    }
    seenKeys.add(key);
  }
  return undefined;
};

export const parseVoiceOverLines = (linesFile: string): VoiceOverLine[] => {
  const parsed: unknown = JSON.parse(linesFile);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new InvalidVoiceOverLinesError(
      "The voice-over lines must be one object of keys and the words to say",
    );
  }
  const duplicateKey = findDuplicateKey(linesFile);
  if (duplicateKey !== undefined) {
    throw new InvalidVoiceOverLinesError(
      `Two voice-over lines have the key "${duplicateKey}"`,
    );
  }

  return Object.entries(parsed).map(([key, text]: [string, unknown]) => {
    if (!voiceOverKeyShape.test(key)) {
      throw new InvalidVoiceOverLinesError(
        `The voice-over key "${key}" needs to be shaped like "bubbles.pop-the-bond"`,
      );
    }
    if (typeof text !== "string" || text.trim() === "") {
      throw new InvalidVoiceOverLinesError(
        `The voice-over line "${key}" needs words to say`,
      );
    }
    return { key, text };
  });
};

const buildFingerprint = async (voice: string, text: string) => {
  const spoken = new TextEncoder().encode(JSON.stringify([voice, text]));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spoken));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0"));
  return hex.join("").slice(0, fingerprintLength);
};

export const buildVoiceOverFileName = async (
  { key, text }: VoiceOverLine,
  voice: string,
): Promise<string> =>
  `${key}.${await buildFingerprint(voice, text)}${audioExtension}`;

export const findKeyOfVoiceOverFile = (fileName: string): string | undefined =>
  voiceOverFileShape.exec(fileName)?.groups?.key;

const phonemeFileShape = /^(?<sound>[a-z]+(?:-[a-z]+)?)\.wav$/;

export const findSoundOfPhonemeFile = (
  fileName: string,
): PhonicsSound | undefined => {
  const sound = phonemeFileShape.exec(fileName)?.groups?.sound;
  return isPhonicsSound(sound) ? sound : undefined;
};

export const planVoiceOver = async ({
  lines,
  voice,
  existingFileNames,
}: VoiceOverPlanParts): Promise<VoiceOverPlan> => {
  const plannedLines = await Promise.all(
    lines.map(async (line) => ({
      ...line,
      fileName: await buildVoiceOverFileName(line, voice),
    })),
  );
  const existingAudio = new Set(
    existingFileNames.filter((fileName) => fileName.endsWith(audioExtension)),
  );
  const wantedAudio = new Set(plannedLines.map(({ fileName }) => fileName));

  return {
    linesToSpeak: plannedLines.filter(
      ({ fileName }) => !existingAudio.has(fileName),
    ),
    fileNamesToDelete: [...existingAudio].filter(
      (fileName) => !wantedAudio.has(fileName),
    ),
  };
};

export class UnreadableWavError extends Error {
  override name = "UnreadableWavError";
}

export interface MonoSound {
  sampleRate: number;
  samples: Int16Array;
}

const wavHeaderBytes = 44;
const bytesPerSample = 2;
const resampleTaps = 12;

const readChunkName = (view: DataView, offset: number): string =>
  String.fromCharCode(
    ...[0, 1, 2, 3].map((index) => view.getUint8(offset + index)),
  );

export const readMonoWav = (wav: Uint8Array): MonoSound => {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  if (readChunkName(view, 0) !== "RIFF" || readChunkName(view, 8) !== "WAVE") {
    throw new UnreadableWavError("The voice-over file isn't a WAV file");
  }
  let sampleRate: number | undefined;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const chunkName = readChunkName(view, offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkName === "fmt ") {
      const format = view.getUint16(chunkStart, true);
      const channels = view.getUint16(chunkStart + 2, true);
      const bitsPerSample = view.getUint16(chunkStart + 14, true);
      if (format !== 1 || channels !== 1 || bitsPerSample !== 16) {
        throw new UnreadableWavError(
          "The voice-over file needs to be 16-bit mono PCM",
        );
      }
      sampleRate = view.getUint32(chunkStart + 4, true);
    }
    if (chunkName === "data" && sampleRate !== undefined) {
      const sampleCount = Math.floor(
        Math.min(chunkSize, view.byteLength - chunkStart) / bytesPerSample,
      );
      const samples = Int16Array.from({ length: sampleCount }, (_, index) =>
        view.getInt16(chunkStart + index * bytesPerSample, true),
      );
      return { sampleRate, samples };
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }
  throw new UnreadableWavError("The voice-over file has no sound in it");
};

export const buildMonoWav = ({
  sampleRate,
  samples,
}: MonoSound): Uint8Array => {
  const dataBytes = samples.length * bytesPerSample;
  const wav = new Uint8Array(wavHeaderBytes + dataBytes);
  const view = new DataView(wav.buffer);
  const writeName = (offset: number, name: string) => {
    for (let index = 0; index < name.length; index++) {
      view.setUint8(offset + index, name.charCodeAt(index));
    }
  };
  writeName(0, "RIFF");
  view.setUint32(4, wavHeaderBytes - 8 + dataBytes, true);
  writeName(8, "WAVE");
  writeName(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeName(36, "data");
  view.setUint32(40, dataBytes, true);
  samples.forEach((sample, index) => {
    view.setInt16(wavHeaderBytes + index * bytesPerSample, sample, true);
  });
  return wav;
};

const findWindowedSinc = (distance: number): number => {
  if (Math.abs(distance) >= resampleTaps) {
    return 0;
  }
  const window = 0.5 + 0.5 * Math.cos((Math.PI * distance) / resampleTaps);
  const phase = Math.PI * distance;
  return (phase === 0 ? 1 : Math.sin(phase) / phase) * window;
};

export const resampleSound = (
  sound: MonoSound,
  targetRate: number,
): MonoSound => {
  const { sampleRate, samples } = sound;
  if (targetRate >= sampleRate) {
    return sound;
  }
  const step = sampleRate / targetRate;
  const cutoff = targetRate / sampleRate;
  const outputLength = Math.floor(samples.length / step);
  const resampled = Int16Array.from({ length: outputLength }, (_, index) => {
    const centre = index * step;
    const first = Math.max(0, Math.ceil(centre - resampleTaps / cutoff));
    const last = Math.min(
      samples.length - 1,
      Math.floor(centre + resampleTaps / cutoff),
    );
    let total = 0;
    for (let source = first; source <= last; source++) {
      total +=
        samples[source] * findWindowedSinc((source - centre) * cutoff) * cutoff;
    }
    return Math.max(-32_768, Math.min(32_767, Math.round(total)));
  });
  return { sampleRate: targetRate, samples: resampled };
};
