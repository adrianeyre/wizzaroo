import {
  piperModels,
  type PiperModel,
} from "../../curriculum/piper-voice-models.js";
import {
  voiceCharacters,
  type VoiceCharacter,
  type VoiceCharacterId,
} from "./voice-characters.js";

/**
 * The sixteen voices a Child can choose on the Settings page to read
 * questions and messages out loud (ADR 0074): thirteen from around the UK,
 * Jenny from Ireland, and one US English female and one US English male
 * voice. Each is spoken on the device by Piper, from its model, and each has
 * a 3D fantasy character of its own. Adrian, a UK English male voice, is the
 * default.
 */

export type SpeakerVoice = "female" | "male";

export interface ReadAloudVoice {
  /** Never changes, as it is what a device keeps. */
  id: VoiceCharacterId;
  name: string;
  model: PiperModel;
  /** Which reader of a many-speaker model; 0 in a one-speaker model. */
  speakerId: number;
  voice: SpeakerVoice;
  /** Where the voice is from, such as "UK English (Wales)". */
  accent: string;
  description: string;
  character: VoiceCharacter;
}

interface VoiceChoice {
  id: VoiceCharacterId;
  name: string;
  modelId: string;
  speakerId?: number;
  voice: SpeakerVoice;
  accent: string;
}

/**
 * The voices, in the order Settings shows them: UK voices first, then
 * Ireland's, then the two from the US. A many-speaker model's reader is
 * named here, as its model knows them only by a code: SEMAINE's actors by
 * the characters they played, and each VCTK reader by a name of our own.
 */
const voiceChoices: readonly VoiceChoice[] = [
  {
    id: "adrian",
    name: "Adrian",
    modelId: "northern-english-male",
    voice: "male",
    accent: "UK English (Northern England)",
  },
  {
    id: "cori-med",
    name: "Cori",
    modelId: "cori-med",
    voice: "female",
    accent: "UK English (Southern England)",
  },
  {
    id: "alba",
    name: "Alba",
    modelId: "alba",
    voice: "female",
    accent: "UK English (Scotland)",
  },
  {
    id: "kofi",
    name: "Kofi",
    modelId: "vctk",
    speakerId: 81,
    voice: "male",
    accent: "UK English (London)",
  },
  {
    id: "seren",
    name: "Seren",
    modelId: "vctk",
    speakerId: 88,
    voice: "female",
    accent: "UK English (Wales)",
  },
  {
    id: "ravi",
    name: "Ravi",
    modelId: "vctk",
    speakerId: 104,
    voice: "male",
    accent: "UK English (Birmingham)",
  },
  {
    id: "niamh",
    name: "Niamh",
    modelId: "vctk",
    speakerId: 17,
    voice: "female",
    accent: "UK English (Northern Ireland)",
  },
  {
    id: "hamish",
    name: "Hamish",
    modelId: "vctk",
    speakerId: 79,
    voice: "male",
    accent: "UK English (Edinburgh)",
  },
  {
    id: "arlo",
    name: "Arlo",
    modelId: "vctk",
    speakerId: 12,
    voice: "male",
    accent: "UK English (Yorkshire)",
  },
  {
    id: "prudence",
    name: "Prudence",
    modelId: "semaine",
    speakerId: 0,
    voice: "female",
    accent: "UK English",
  },
  {
    id: "poppy",
    name: "Poppy",
    modelId: "semaine",
    speakerId: 3,
    voice: "female",
    accent: "UK English",
  },
  {
    id: "spike",
    name: "Spike",
    modelId: "semaine",
    speakerId: 1,
    voice: "male",
    accent: "UK English",
  },
  {
    id: "obadiah",
    name: "Obadiah",
    modelId: "semaine",
    speakerId: 2,
    voice: "male",
    accent: "UK English",
  },
  {
    id: "jenny",
    name: "Jenny",
    modelId: "jenny",
    voice: "female",
    accent: "Irish English",
  },
  {
    id: "kristin",
    name: "Kristin",
    modelId: "kristin",
    voice: "female",
    accent: "US English",
  },
  {
    id: "john",
    name: "John",
    modelId: "john",
    voice: "male",
    accent: "US English",
  },
];

const voiceLabels: Record<SpeakerVoice, string> = {
  female: "Female voice",
  male: "Male voice",
};

const findModel = (modelId: string): PiperModel => {
  const model = piperModels.find(({ id }) => id === modelId);
  if (model === undefined) {
    throw new Error(`No Piper model is called ${modelId}`);
  }
  return model;
};

export const readAloudVoices: readonly ReadAloudVoice[] = voiceChoices.map(
  ({ id, name, modelId, speakerId = 0, voice, accent }) => ({
    id,
    name,
    model: findModel(modelId),
    speakerId,
    voice,
    accent,
    description: `${accent} · ${voiceLabels[voice]}`,
    character: voiceCharacters[id],
  }),
);

const voicesById = new Map<string, ReadAloudVoice>(
  readAloudVoices.map((voice) => [voice.id, voice]),
);

export type ReadAloudVoiceName = string;

/** Adrian, a UK English male voice. */
export const defaultReadAloudVoiceName: ReadAloudVoiceName = "adrian";

export const readAloudVoiceStorageKey = "wizzaroo.read-aloud-voice";

export const isReadAloudVoiceName = (
  value: unknown,
): value is ReadAloudVoiceName =>
  typeof value === "string" && voicesById.has(value);

const defaultVoice = voicesById.get(defaultReadAloudVoiceName);
if (defaultVoice === undefined) {
  throw new Error(`The default voice, ${defaultReadAloudVoiceName}, is gone`);
}
const fallbackVoice: ReadAloudVoice = defaultVoice;

/** A voice by its id; a voice no longer offered reads as the default, Adrian. */
export const findReadAloudVoice = (name: ReadAloudVoiceName): ReadAloudVoice =>
  voicesById.get(name) ?? fallbackVoice;

/** "Adrian the Star Wizard". */
export const describeVoiceCharacter = (voice: ReadAloudVoice): string =>
  `${voice.name} the ${voice.character.title}`;

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
