import checkVoiceOverFiles from "./check-voice-over-files.json" with { type: "json" };
import { checkVoiceOverFolder } from "../offline/caching-rules.js";
import type { CheckSpokenWord } from "./check-play.js";
const checkVoiceOverCacheName = "wizzaroo-check-voice-over";

const findSpokenWordFileNames = (): Map<string, string> =>
  new Map(Object.entries(checkVoiceOverFiles));

export const findSpokenWordUrl = (
  spokenWord: string,
  fileNames: ReadonlyMap<string, string> = findSpokenWordFileNames(),
): string | undefined => {
  const fileName = fileNames.get(spokenWord);
  return fileName === undefined
    ? undefined
    : `/${checkVoiceOverFolder}/${fileName}`;
};

const loadSpokenWordResponse = async (
  cache: Cache,
  url: string,
): Promise<Response | undefined> => {
  const cached = await cache.match(url);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }
    await cache.put(url, response.clone());
    return response;
  } catch {
    return undefined;
  }
};

const prepareSpokenWords = async (
  spokenWords: readonly string[],
  onProgress?: (readyCount: number, wordCount: number) => void,
): Promise<boolean> => {
  const urls = spokenWords.map((spokenWord) => findSpokenWordUrl(spokenWord));
  if (urls.some((url) => url === undefined)) {
    return false;
  }
  const cache = await caches.open(checkVoiceOverCacheName);
  let readyCount = 0;
  onProgress?.(readyCount, urls.length);
  const responses = await Promise.all(
    urls.flatMap((url) =>
      url === undefined
        ? []
        : [
            loadSpokenWordResponse(cache, url).then((response) => {
              readyCount += 1;
              onProgress?.(readyCount, urls.length);
              return response;
            }),
          ],
    ),
  );
  return responses.every((response) => response !== undefined);
};

let spokenWordSpeaker: HTMLAudioElement | undefined;

const playSpokenWord = async (spokenWord: string): Promise<boolean> => {
  const url = findSpokenWordUrl(spokenWord);
  if (url === undefined) {
    return false;
  }
  const cache = await caches.open(checkVoiceOverCacheName);
  const response = await loadSpokenWordResponse(cache, url);
  if (response === undefined) {
    return false;
  }
  spokenWordSpeaker ??= new Audio();
  spokenWordSpeaker.src = URL.createObjectURL(await response.blob());
  try {
    await spokenWordSpeaker.play();
    return true;
  } catch {
    return false;
  }
};

export const checkSpokenWord: CheckSpokenWord = {
  playSpokenWord,
  prepareSpokenWords,
};
