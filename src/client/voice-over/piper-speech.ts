import {
  findPiperFilePath,
  piperModels,
  type PiperModel,
} from "../../curriculum/piper-voice-models.js";
import {
  piperVoiceCacheName,
  type PiperRequest,
  type PiperResponse,
} from "./piper-messages.js";
import type { ReadAloudVoice } from "./read-aloud-voices.js";

/**
 * Speaks with a Piper voice on the device (ADR 0062). The model runs in a
 * worker; this plays what it sends back, a sentence at a time, and keeps
 * track of which voices the device has downloaded.
 */

type AudioContextMaker = new () => AudioContext;

const findAudioContextMaker = (): AudioContextMaker | undefined =>
  typeof AudioContext === "undefined" ? undefined : AudioContext;

/** Whether this device can speak with a Piper voice at all. */
export const isPiperOffered = (): boolean =>
  typeof Worker !== "undefined" &&
  typeof WebAssembly !== "undefined" &&
  typeof caches !== "undefined" &&
  findAudioContextMaker() !== undefined;

export const findModelPath = (model: PiperModel): string =>
  findPiperFilePath(model.model);

const findConfigPath = (model: PiperModel): string =>
  findPiperFilePath(model.config);

let worker: Worker | undefined;
const responseListeners = new Set<(response: PiperResponse) => void>();

const findWorker = (): Worker => {
  worker ??= (() => {
    const made = new Worker(new URL("./piper-worker.ts", import.meta.url), {
      type: "module",
      name: "piper",
    });
    made.onmessage = ({ data }: MessageEvent<PiperResponse>) => {
      for (const listener of responseListeners) {
        listener(data);
      }
    };
    return made;
  })();
  return worker;
};

const send = (request: PiperRequest): void => {
  findWorker().postMessage(request);
};

/* ------------------------------------------------------------------ */
/* Which voices the device has                                         */
/* ------------------------------------------------------------------ */

export type VoiceDownload =
  | { state: "not-downloaded" }
  | { state: "downloading"; share: number }
  | { state: "downloaded" }
  | { state: "failed" };

const downloads = new Map<string, VoiceDownload>();
const downloadListeners = new Set<() => void>();

const setDownload = (model: PiperModel, download: VoiceDownload): void => {
  downloads.set(model.id, download);
  for (const listener of downloadListeners) {
    listener();
  }
};

const notDownloaded: VoiceDownload = { state: "not-downloaded" };

/** The same object until it changes, as React's external stores need. */
export const findVoiceDownload = (model: PiperModel): VoiceDownload =>
  downloads.get(model.id) ?? notDownloaded;

export const subscribeToVoiceDownloads = (
  listener: () => void,
): (() => void) => {
  downloadListeners.add(listener);
  return () => {
    downloadListeners.delete(listener);
  };
};

const findModelByPath = (modelPath: string): PiperModel | undefined =>
  piperModels.find((model) => findModelPath(model) === modelPath);

responseListeners.add((response) => {
  if (response.kind === "progress") {
    const model = findModelByPath(response.modelPath);
    if (model !== undefined) {
      setDownload(model, {
        state: "downloading",
        share: Math.min(1, response.received / model.model.bytes),
      });
    }
  } else if (response.kind === "downloaded") {
    const model = findModelByPath(response.modelPath);
    if (model !== undefined) {
      setDownload(model, { state: "downloaded" });
    }
  } else if (response.kind === "download-failed") {
    const model = findModelByPath(response.modelPath);
    if (model !== undefined) {
      setDownload(model, { state: "failed" });
    }
  }
});

/**
 * Finds which voices the device already keeps, and lets go of any file a
 * voice no longer uses, such as one from before a voice was changed.
 */
export const checkDownloadedVoices = async (): Promise<void> => {
  if (!isPiperOffered()) {
    return;
  }
  try {
    const cache = await caches.open(piperVoiceCacheName);
    const kept = new Set(
      (await cache.keys()).map((request) => new URL(request.url).pathname),
    );
    const used = new Set(
      piperModels.flatMap((model) => [
        findModelPath(model),
        findConfigPath(model),
      ]),
    );
    await Promise.all(
      [...kept]
        .filter((path) => path.startsWith("/voices/") && !used.has(path))
        .map((path) => cache.delete(path)),
    );
    for (const model of piperModels) {
      if (
        kept.has(findModelPath(model)) &&
        kept.has(findConfigPath(model)) &&
        findVoiceDownload(model).state === "not-downloaded"
      ) {
        setDownload(model, { state: "downloaded" });
      }
    }
  } catch {
    // Without the cache, every voice downloads again when it is used.
  }
};

/** Downloads a voice's model, unless the device has it or is getting it. */
export const downloadVoice = (model: PiperModel): void => {
  const { state } = findVoiceDownload(model);
  if (!isPiperOffered() || state === "downloaded" || state === "downloading") {
    return;
  }
  setDownload(model, { state: "downloading", share: 0 });
  send({
    kind: "download",
    modelPath: findModelPath(model),
    configPath: findConfigPath(model),
  });
};

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

let audioContext: AudioContext | undefined;
let requestCount = 0;
let playing:
  | {
      requestId: number;
      sources: AudioBufferSourceNode[];
      nextStart: number;
      sentenceCount: number;
      heard: number;
      onFinished: () => void;
    }
  | undefined;

const findAudioContext = (): AudioContext | undefined => {
  const Maker = findAudioContextMaker();
  if (Maker === undefined) {
    return undefined;
  }
  audioContext ??= new Maker();
  return audioContext;
};

const finishPlaying = (requestId: number): void => {
  if (playing?.requestId !== requestId) {
    return;
  }
  const { onFinished } = playing;
  playing = undefined;
  onFinished();
};

responseListeners.add((response) => {
  if (
    (response.kind !== "sound" &&
      response.kind !== "spoken" &&
      response.kind !== "failed") ||
    playing?.requestId !== response.requestId
  ) {
    return;
  }
  if (response.kind === "failed") {
    finishPlaying(response.requestId);
    return;
  }
  if (response.kind === "spoken") {
    if (playing.heard === playing.sentenceCount) {
      finishPlaying(response.requestId);
    }
    return;
  }
  const context = findAudioContext();
  if (context === undefined) {
    finishPlaying(response.requestId);
    return;
  }
  const buffer = context.createBuffer(
    1,
    response.samples.length,
    response.sampleRate,
  );
  buffer.copyToChannel(Float32Array.from(response.samples), 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  const startAt = Math.max(context.currentTime + 0.02, playing.nextStart);
  source.start(startAt);
  playing.nextStart = startAt + buffer.duration;
  playing.sources.push(source);
  const { requestId } = response;
  source.onended = () => {
    if (playing?.requestId !== requestId) {
      return;
    }
    playing.heard += 1;
    if (playing.heard === playing.sentenceCount) {
      finishPlaying(requestId);
    }
  };
});

const longestPiece = 280;

/** Splits words into sentences, and a long sentence at its commas, so each is quick to make. */
export const splitIntoSentences = (words: string): string[] =>
  words
    .split(/(?<=[.!?])\s+/)
    .flatMap((sentence) => {
      if (sentence.length <= longestPiece) {
        return [sentence];
      }
      const pieces: string[] = [];
      let piece = "";
      for (const part of sentence.split(/(?<=[,;:])\s+/)) {
        if (piece !== "" && piece.length + part.length > longestPiece) {
          pieces.push(piece);
          piece = part;
        } else {
          piece = piece === "" ? part : `${piece} ${part}`;
        }
      }
      return [...pieces, piece];
    })
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");

/** Stops whatever a Piper voice is saying. */
export const stopPiper = (): void => {
  if (playing === undefined) {
    return;
  }
  const stopped = playing;
  playing = undefined;
  send({ kind: "stop" });
  for (const source of stopped.sources) {
    try {
      source.stop();
    } catch {
      // It had already finished.
    }
  }
};

/**
 * Says the words in a downloaded Piper voice. Called straight from a tap,
 * as iPhones and iPads only let sound start in answer to one.
 */
export const speakWithPiper = (
  voice: ReadAloudVoice,
  words: string,
  onFinished: () => void,
): boolean => {
  const context = findAudioContext();
  const sentences = splitIntoSentences(words);
  if (context === undefined || sentences.length === 0) {
    return false;
  }
  void context.resume();
  stopPiper();
  requestCount += 1;
  const requestId = requestCount;
  playing = {
    requestId,
    sources: [],
    nextStart: 0,
    sentenceCount: sentences.length,
    heard: 0,
    onFinished,
  };
  send({
    kind: "speak",
    requestId,
    modelPath: findModelPath(voice.model),
    configPath: findConfigPath(voice.model),
    speakerId: voice.speakerId,
    sentences,
  });
  return true;
};
