import type { PhonicsSound } from "../../curriculum/phonics-sounds.js";
import {
  findKeyOfVoiceOverFile,
  findSoundOfPhonemeFile,
} from "./voice-over-files.js";
import voiceOverLines from "./voice-over-lines.json" with { type: "json" };
import {
  findSpeakingReader,
  readLineInChosenVoice,
  stopReadingAloud,
  subscribeToReadingAloud,
  whenReadingAloudStarts,
} from "./read-aloud.js";

export type VoiceOverKey = keyof typeof voiceOverLines;

export const isVoiceOverKey = (key: string): key is VoiceOverKey =>
  key in voiceOverLines;

export const findComputingVoiceOverKey = (gameType: string): VoiceOverKey => {
  const key = `computing.${gameType}`;
  return isVoiceOverKey(key) ? key : "computing.read-and-tap";
};

const voiceOverCacheName = "wizzaroo-voice-over";

const voiceOverFileUrls = import.meta.glob<string>("./*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});

const buildVoiceOverUrls = (
  fileUrls: Record<string, string>,
): Map<string, string> =>
  new Map(
    Object.entries(fileUrls).map(([path, url]) => {
      const key = findKeyOfVoiceOverFile(path.replace(/^\.\//, ""));
      if (key === undefined) {
        throw new Error(`${path} isn't named like a voice-over file`);
      }
      return [key, url];
    }),
  );

const phonemeFileUrls = import.meta.glob<string>("./phonemes/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});

const buildPhonemeUrls = (
  fileUrls: Record<string, string>,
): Map<PhonicsSound, string> =>
  new Map(
    Object.entries(fileUrls).map(([path, url]) => {
      const sound = findSoundOfPhonemeFile(path.replace(/^\.\/phonemes\//, ""));
      if (sound === undefined) {
        throw new Error(`${path} isn't named after one of the 44 sounds`);
      }
      return [sound, url];
    }),
  );

const voiceOverUrls = buildVoiceOverUrls(voiceOverFileUrls);
const phonemeUrls = buildPhonemeUrls(phonemeFileUrls);

export const recordedPhonemeSounds: ReadonlySet<PhonicsSound> = new Set(
  phonemeUrls.keys(),
);
const heldVoiceOverUrls = new Map<string, string>();
let voiceOverSpeaker: HTMLAudioElement | undefined;

export const getVoiceOverUrl = (key: VoiceOverKey): string => {
  const url = voiceOverUrls.get(key);
  if (url === undefined) {
    throw new Error(
      `The voice-over line "${key}" has no audio; run pnpm generate:voice-over`,
    );
  }
  return url;
};

const fetchVoiceOverIntoCache = async (
  cache: Cache,
  url: string,
): Promise<Response> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `The voice-over ${url} answered HTTP ${String(response.status)}`,
    );
  }
  await cache.put(url, response.clone());
  return response;
};

export const loadVoiceOver = async (): Promise<void> => {
  const cache = await caches.open(voiceOverCacheName);
  const urlsInUse = new Set(
    [...voiceOverUrls.values()].map(
      (url) => new URL(url, document.baseURI).href,
    ),
  );
  const cachedRequests = await cache.keys();
  await Promise.all(
    cachedRequests
      .filter((request) => !urlsInUse.has(request.url))
      .map((request) => cache.delete(request)),
  );

  await Promise.all(
    [...voiceOverUrls].map(async ([key, url]) => {
      if (heldVoiceOverUrls.has(key)) {
        return;
      }
      const response =
        (await cache.match(url)) ?? (await fetchVoiceOverIntoCache(cache, url));
      heldVoiceOverUrls.set(key, URL.createObjectURL(await response.blob()));
    }),
  );
};

const isCutOffByNextLine = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

whenReadingAloudStarts(() => {
  voiceOverSpeaker?.pause();
});

const playAudio = async (url: string): Promise<void> => {
  stopReadingAloud();
  voiceOverSpeaker ??= new Audio();
  voiceOverSpeaker.src = url;
  try {
    await voiceOverSpeaker.play();
  } catch (error) {
    if (!isCutOffByNextLine(error)) {
      throw error;
    }
  }
};

/** Marks a Game's line while the chosen voice says it, rather than a Read it to me button's words. */
const voiceOverReader = "voice-over";

/**
 * Says a Game's line, such as the question it opens with, in the voice the
 * Child chose on Settings when the device has it, or else plays the line's
 * recording (ADR 0075).
 */
export const playVoiceOver = (key: VoiceOverKey): Promise<void> => {
  if (readLineInChosenVoice(voiceOverLines[key], voiceOverReader)) {
    return Promise.resolve();
  }
  return playAudio(heldVoiceOverUrls.get(key) ?? getVoiceOverUrl(key));
};

export const playPhoneme = (sound: PhonicsSound): Promise<void> => {
  const url = phonemeUrls.get(sound);
  if (url === undefined) {
    throw new Error(`The sound "${sound}" has no recording yet`);
  }
  return playAudio(url);
};

const waitForChosenVoiceToEnd = (): Promise<void> =>
  new Promise((resolve) => {
    const unsubscribe = subscribeToReadingAloud(() => {
      if (findSpeakingReader() !== voiceOverReader) {
        unsubscribe();
        resolve();
      }
    });
  });

export const waitForVoiceOverToEnd = (): Promise<void> =>
  findSpeakingReader() === voiceOverReader
    ? waitForChosenVoiceToEnd()
    : waitForRecordingToEnd();

const waitForRecordingToEnd = (): Promise<void> =>
  new Promise((resolve) => {
    const speaker = voiceOverSpeaker;
    if (speaker === undefined || speaker.paused || speaker.ended) {
      resolve();
      return;
    }
    const finish = () => {
      for (const eventName of ["ended", "pause", "error"]) {
        speaker.removeEventListener(eventName, finish);
      }
      resolve();
    };
    for (const eventName of ["ended", "pause", "error"]) {
      speaker.addEventListener(eventName, finish);
    }
  });
