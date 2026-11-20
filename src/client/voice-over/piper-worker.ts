/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { phonemize } from "phonemizer";
import {
  piperVoiceCacheName,
  type PiperRequest,
  type PiperResponse,
} from "./piper-messages.js";

/**
 * Speaks with a Piper voice, off the page's thread (ADR 0062): turns each
 * sentence into phonemes with eSpeak NG, runs the voice's model with ONNX
 * Runtime, and sends back the sound, a sentence at a time, so the first is
 * heard while the next is still being made. A voice's files come from the
 * device's cache, or are fetched once from Wizzaroo's own origin and kept.
 */

declare const self: DedicatedWorkerGlobalScope;

ort.env.wasm.wasmPaths = { wasm: ortWasmUrl };
ort.env.wasm.numThreads = 1;

interface PiperConfig {
  audio: { sample_rate: number };
  espeak: { voice: string };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  num_speakers: number;
  phoneme_id_map: Partial<Record<string, number[]>>;
}

const isPiperConfig = (value: unknown): value is PiperConfig =>
  typeof value === "object" &&
  value !== null &&
  "audio" in value &&
  "espeak" in value &&
  "inference" in value &&
  "num_speakers" in value &&
  "phoneme_id_map" in value;

const parseConfig = (bytes: ArrayBuffer): PiperConfig => {
  const config: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!isPiperConfig(config)) {
    throw new Error("not a Piper voice's config");
  }
  return config;
};

interface LoadedVoice {
  modelPath: string;
  session: ort.InferenceSession;
  config: PiperConfig;
}

const post = (message: PiperResponse, transfer: Transferable[] = []): void => {
  self.postMessage(message, transfer);
};

const fetching = new Map<string, Promise<ArrayBuffer>>();

/** A file from the device's cache, or fetched once and kept, however many ask for it at once. */
const readFile = (
  path: string,
  onProgress?: (received: number) => void,
): Promise<ArrayBuffer> => {
  const known = fetching.get(path);
  if (known !== undefined) {
    return known;
  }
  const reading = readOrFetchFile(path, onProgress).finally(() => {
    fetching.delete(path);
  });
  fetching.set(path, reading);
  return reading;
};

const readOrFetchFile = async (
  path: string,
  onProgress?: (received: number) => void,
): Promise<ArrayBuffer> => {
  const cache = await caches.open(piperVoiceCacheName);
  const cached = await cache.match(path);
  if (cached !== undefined) {
    return cached.arrayBuffer();
  }
  const response = await fetch(path);
  if (!response.ok || response.body === null) {
    throw new Error(`${path} answered ${String(response.status)}`);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    received += value.byteLength;
    onProgress?.(received);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  await cache.put(
    path,
    new Response(bytes, {
      headers: { "content-type": "application/octet-stream" },
    }),
  );
  return bytes.buffer;
};

let loaded: LoadedVoice | undefined;

const loadVoice = async (
  modelPath: string,
  configPath: string,
): Promise<LoadedVoice> => {
  if (loaded?.modelPath === modelPath) {
    return loaded;
  }
  const [model, config] = await Promise.all([
    readFile(modelPath),
    readFile(configPath),
  ]);
  const previous = loaded;
  loaded = {
    modelPath,
    session: await ort.InferenceSession.create(new Uint8Array(model)),
    config: parseConfig(config),
  };
  await previous?.session.release();
  return loaded;
};

const clauseBreak = /([,;:.!?])/;

/** Phoneme numbers for a sentence, keeping its punctuation for the tune of the voice. */
const findPhonemeIds = async (
  sentence: string,
  config: PiperConfig,
): Promise<number[]> => {
  const map = config.phoneme_id_map;
  const pad = map._ ?? [];
  const ids = [...(map["^"] ?? [])];
  for (const piece of sentence.split(clauseBreak)) {
    const text = piece.trim();
    if (text === "") {
      continue;
    }
    const phonemes = clauseBreak.test(text)
      ? text
      : (await phonemize(text, config.espeak.voice)).join(" ");
    for (const symbol of [
      ...Array.from(phonemes),
      ...(clauseBreak.test(text) ? [] : [" "]),
    ]) {
      const symbolIds = map[symbol];
      if (symbolIds !== undefined) {
        ids.push(...symbolIds, ...pad);
      }
    }
  }
  ids.push(...(map.$ ?? []));
  return ids;
};

const loudestPeak = 0.9;
const greatestGain = 3;

const speakSentence = async (
  { session, config }: LoadedVoice,
  sentence: string,
  speakerId: number,
): Promise<Float32Array> => {
  const ids = await findPhonemeIds(sentence, config);
  const feeds: Record<string, ort.Tensor> = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [
      1,
      ids.length,
    ]),
    input_lengths: new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(ids.length)]),
      [1],
    ),
    scales: new ort.Tensor(
      "float32",
      Float32Array.from([
        config.inference.noise_scale,
        config.inference.length_scale,
        config.inference.noise_w,
      ]),
      [3],
    ),
  };
  if (config.num_speakers > 1) {
    feeds.sid = new ort.Tensor(
      "int64",
      BigInt64Array.from([BigInt(speakerId)]),
      [1],
    );
  }
  const output = await session.run(feeds);
  const sound = output[session.outputNames[0]].data;
  if (!(sound instanceof Float32Array)) {
    throw new Error("the voice's model made no sound");
  }
  const samples = Float32Array.from(sound);
  const peak = samples.reduce(
    (loudest, sample) => Math.max(loudest, Math.abs(sample)),
    0,
  );
  const gain = peak === 0 ? 1 : Math.min(greatestGain, loudestPeak / peak);
  return samples.map((sample) => sample * gain);
};

let currentRequest = 0;

const speak = async (
  request: Extract<PiperRequest, { kind: "speak" }>,
): Promise<void> => {
  currentRequest = request.requestId;
  try {
    const voice = await loadVoice(request.modelPath, request.configPath);
    for (const [index, sentence] of request.sentences.entries()) {
      if (currentRequest !== request.requestId) {
        return;
      }
      const samples = await speakSentence(voice, sentence, request.speakerId);
      if (currentRequest !== request.requestId) {
        return;
      }
      post(
        {
          kind: "sound",
          requestId: request.requestId,
          index,
          samples,
          sampleRate: voice.config.audio.sample_rate,
        },
        [samples.buffer],
      );
    }
    post({ kind: "spoken", requestId: request.requestId });
  } catch (error) {
    post({
      kind: "failed",
      requestId: request.requestId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Keeps this worker and ONNX Runtime's WebAssembly in the voices' cache
 * too, so a voice reads offline even when it was first downloaded before
 * the service worker had taken charge of the page.
 */
const keepEngine = async (): Promise<void> => {
  const cache = await caches.open(piperVoiceCacheName);
  await Promise.all(
    [self.location.href, new URL(ortWasmUrl, self.location.href).href].map(
      async (url) => {
        if ((await cache.match(url)) === undefined) {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        }
      },
    ),
  );
};

const download = async (
  request: Extract<PiperRequest, { kind: "download" }>,
): Promise<void> => {
  try {
    await keepEngine();
    await readFile(request.configPath);
    await readFile(request.modelPath, (received) => {
      post({ kind: "progress", modelPath: request.modelPath, received });
    });
    post({ kind: "downloaded", modelPath: request.modelPath });
  } catch (error) {
    post({
      kind: "download-failed",
      modelPath: request.modelPath,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};

self.onmessage = ({ data }: MessageEvent<PiperRequest>) => {
  if (data.kind === "speak") {
    void speak(data);
  } else if (data.kind === "download") {
    void download(data);
  } else {
    currentRequest = 0;
  }
};
