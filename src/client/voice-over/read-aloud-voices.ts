import {
  piperModels,
  type PiperModel,
} from "../../curriculum/piper-voice-models.js";

/**
 * Every voice a Child can choose on the Settings page to read questions and
 * messages out loud (ADR 0062): every voice on Bryce Beattie's page, and
 * every reader in its two many-speaker voices, ManyVoice's 16 and Clean 100's
 * 245. Each is spoken on the device by Piper, from its model. Only the
 * one-speaker voices are called female or male, as the page says; the
 * readers of the many-speaker voices aren't labelled.
 */

export type SpeakerVoice = "female" | "male";

export interface ReadAloudVoice {
  /** Never changes, as it is what a device keeps. */
  id: string;
  name: string;
  model: PiperModel;
  /** Which reader of a many-speaker model; 0 in a one-speaker model. */
  speakerId: number;
  voice?: SpeakerVoice;
  description: string;
}

/** ManyVoice's readers, named as LibriVox credits them. */
const manyVoiceReaderNames: Readonly<Record<string, string>> = {
  James_K_White: "James K. White",
  Steve_C: "Steve C.",
};

const toReaderName = (reader: string): string =>
  manyVoiceReaderNames[reader] ?? reader.replaceAll("_", " ");

const voiceLabels: Record<SpeakerVoice, string> = {
  female: "Female voice",
  male: "Male voice",
};

const describe = (model: PiperModel, voice: SpeakerVoice | undefined) =>
  [model.accent, voice === undefined ? undefined : voiceLabels[voice]]
    .filter((part) => part !== undefined)
    .join(" · ");

const toSlug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const listModelVoices = (model: PiperModel): ReadAloudVoice[] => {
  if (model.speakers === undefined) {
    return [
      {
        id: model.id,
        name: model.label,
        model,
        speakerId: 0,
        voice: model.voice,
        description: describe(model, model.voice),
      },
    ];
  }
  return model.speakers.map(([reader, speakerId]) => ({
    id: `${model.id}-${toSlug(reader)}`,
    name: model.id === "clean100" ? `Reader ${reader}` : toReaderName(reader),
    model,
    speakerId,
    description: model.accent,
  }));
};

export const readAloudVoices: readonly ReadAloudVoice[] =
  piperModels.flatMap(listModelVoices);

const voicesById = new Map(readAloudVoices.map((voice) => [voice.id, voice]));

export type ReadAloudVoiceName = string;

/** Cori, the voice of Wizzaroo's own recordings, in the smaller of her two models. */
export const defaultReadAloudVoiceName: ReadAloudVoiceName = "cori-med";

export const readAloudVoiceStorageKey = "wizzaroo.read-aloud-voice";

export const isReadAloudVoiceName = (
  value: unknown,
): value is ReadAloudVoiceName =>
  typeof value === "string" && voicesById.has(value);

const defaultVoice = readAloudVoices.find(
  ({ id }) => id === defaultReadAloudVoiceName,
);
if (defaultVoice === undefined) {
  throw new Error(`The default voice, ${defaultReadAloudVoiceName}, is gone`);
}
const fallbackVoice: ReadAloudVoice = defaultVoice;

export const findReadAloudVoice = (name: ReadAloudVoiceName): ReadAloudVoice =>
  voicesById.get(name) ?? fallbackVoice;

/** The voices from one model, in the order the model lists them. */
export const listModelReadAloudVoices = (modelId: string): ReadAloudVoice[] =>
  readAloudVoices.filter(({ model }) => model.id === modelId);

export const loadReadAloudVoiceName = (): ReadAloudVoiceName => {
  try {
    const stored = localStorage.getItem(readAloudVoiceStorageKey);
    return isReadAloudVoiceName(stored) ? stored : defaultReadAloudVoiceName;
  } catch {
    return defaultReadAloudVoiceName;
  }
};

export const storeReadAloudVoiceName = (name: ReadAloudVoiceName): void => {
  try {
    localStorage.setItem(readAloudVoiceStorageKey, name);
  } catch {
    // The choice still holds until the page is closed.
  }
};
