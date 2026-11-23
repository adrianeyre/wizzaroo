import {
  checkDownloadedVoices,
  downloadVoice,
  findVoiceDownload,
  isPiperOffered,
  speakWithPiper,
  stopPiper,
  subscribeToVoiceDownloads,
} from "./piper-speech.js";
import {
  findReadAloudVoice,
  loadReadAloudVoiceName,
  type ReadAloudVoiceName,
} from "./read-aloud-voices.js";
import { toSpokenWords } from "./spoken-words.js";

/**
 * Reads a question out loud, so a Child who can't read it yet can still
 * play. The recorded voice-over covers the fixed lines; this covers every
 * question, whatever its numbers or words. It speaks in the Child's chosen
 * Piper voice (ADR 0062); a voice the device hasn't got yet is downloaded
 * first, and the device's own speech voice reads only if that fails, so no
 * voice is ever heard as another (ADR 0067).
 */

void checkDownloadedVoices();

const findSpeech = (): SpeechSynthesis | undefined =>
  typeof window === "undefined" ||
  !("speechSynthesis" in window) ||
  typeof SpeechSynthesisUtterance === "undefined"
    ? undefined
    : window.speechSynthesis;

export const isReadAloudOffered = (): boolean =>
  isPiperOffered() || findSpeech() !== undefined;

const isBritishEnglish = ({ lang }: SpeechSynthesisVoice) =>
  /^en[-_]GB$/i.test(lang);

const isEnglish = ({ lang }: SpeechSynthesisVoice) => /^en\b/i.test(lang);

export const pickReadAloudVoice = (
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined =>
  voices.find((voice) => isBritishEnglish(voice) && voice.localService) ??
  voices.find(isBritishEnglish) ??
  voices.find((voice) => isEnglish(voice) && voice.localService) ??
  voices.find(isEnglish);

const startListeners = new Set<() => void>();

/** Lets other speakers, such as the recorded voice-over, fall quiet. */
export const whenReadingAloudStarts = (listener: () => void): void => {
  startListeners.add(listener);
};

let currentUtterance: SpeechSynthesisUtterance | undefined;
let speakingReader: string | undefined;
const speakingListeners = new Set<() => void>();

const setSpeakingReader = (reader: string | undefined): void => {
  if (speakingReader === reader) {
    return;
  }
  speakingReader = reader;
  for (const listener of speakingListeners) {
    listener();
  }
};

/** Tells a Read it to me button when it starts or stops being heard. */
export const subscribeToReadingAloud = (listener: () => void): (() => void) => {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
};

/** Which button's words are being read out loud now, if any. */
export const findSpeakingReader = (): string | undefined => speakingReader;

export const stopReadingAloud = (): void => {
  currentUtterance = undefined;
  setSpeakingReader(undefined);
  waitingFor = undefined;
  stopPiper();
  findSpeech()?.cancel();
};

let waitingFor: { reader: string | undefined } | undefined;

const speakWithDevice = (
  speech: SpeechSynthesis,
  words: string,
  reader: string | undefined,
): void => {
  const utterance = new SpeechSynthesisUtterance(words);
  const voice = pickReadAloudVoice(speech.getVoices());
  utterance.lang = voice?.lang ?? "en-GB";
  if (voice !== undefined) {
    utterance.voice = voice;
  }
  const finish = () => {
    if (currentUtterance === utterance) {
      currentUtterance = undefined;
      setSpeakingReader(undefined);
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  currentUtterance = utterance;
  setSpeakingReader(reader);
  speech.speak(utterance);
};

export interface ReadAloudOptions {
  /**
   * Whether the device's own speech voice may read when the chosen voice
   * couldn't be downloaded. A voice's own sample, which says its name,
   * passes false, so it is never heard in another voice.
   */
  isDeviceVoiceAllowed?: boolean;
}

/**
 * Says the text in the Child's chosen voice, cutting off anything still
 * being read. False if it can't. A voice the device hasn't got yet is
 * downloaded first and then reads, so every voice sounds like itself; the
 * device's own speech voice reads only when the download fails (ADR 0067).
 */
export const readAloud = (
  text: string | undefined,
  voiceName: ReadAloudVoiceName = loadReadAloudVoiceName(),
  reader?: string,
  { isDeviceVoiceAllowed = true }: ReadAloudOptions = {},
): boolean => {
  const speech = findSpeech();
  const words = text === undefined ? "" : toSpokenWords(text);
  if ((speech === undefined && !isPiperOffered()) || words === "") {
    return false;
  }
  for (const listener of startListeners) {
    listener();
  }
  stopReadingAloud();
  if (!isPiperOffered()) {
    if (speech === undefined) {
      return false;
    }
    speakWithDevice(speech, words, reader);
    return true;
  }
  const voice = findReadAloudVoice(voiceName);
  const ask = { reader };
  waitingFor = ask;
  setSpeakingReader(reader);
  const finish = () => {
    if (waitingFor === ask) {
      waitingFor = undefined;
      setSpeakingReader(undefined);
    }
  };
  const speakInVoice = (): boolean => {
    if (speakWithPiper(voice, words, finish)) {
      return true;
    }
    finish();
    return false;
  };
  if (findVoiceDownload(voice.model).state === "downloaded") {
    return speakInVoice();
  }
  downloadVoice(voice.model);
  const unsubscribe = subscribeToVoiceDownloads(() => {
    const { state } = findVoiceDownload(voice.model);
    if (waitingFor !== ask) {
      unsubscribe();
    } else if (state === "downloaded") {
      unsubscribe();
      speakInVoice();
    } else if (state === "failed") {
      unsubscribe();
      waitingFor = undefined;
      if (speech !== undefined && isDeviceVoiceAllowed) {
        speakWithDevice(speech, words, reader);
      } else {
        setSpeakingReader(undefined);
      }
    }
  });
  return true;
};

/**
 * Says one of a Game's recorded lines, such as its opening question, in the
 * Child's chosen voice, when the device already has that voice (ADR 0075).
 * False when it can't, so the line's recording plays instead: on a device
 * that can't run Piper, or before the chosen voice has arrived. A voice the
 * device hasn't got yet starts downloading then, so the lines after it are
 * heard in it, and a Game never sits silent while one downloads.
 */
export const readLineInChosenVoice = (
  text: string,
  reader: string,
  voiceName: ReadAloudVoiceName = loadReadAloudVoiceName(),
): boolean => {
  const words = toSpokenWords(text);
  if (!isPiperOffered() || words === "") {
    return false;
  }
  const voice = findReadAloudVoice(voiceName);
  const { state } = findVoiceDownload(voice.model);
  if (state !== "downloaded") {
    if (state === "not-downloaded") {
      downloadVoice(voice.model);
    }
    return false;
  }
  for (const listener of startListeners) {
    listener();
  }
  stopReadingAloud();
  const ask = { reader };
  waitingFor = ask;
  setSpeakingReader(reader);
  const finish = () => {
    if (waitingFor === ask) {
      waitingFor = undefined;
      setSpeakingReader(undefined);
    }
  };
  if (speakWithPiper(voice, words, finish)) {
    return true;
  }
  finish();
  return false;
};
