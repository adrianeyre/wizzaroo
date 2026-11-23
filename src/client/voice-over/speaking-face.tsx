import { useEffect, useState, useSyncExternalStore } from "react";
import { CharacterPortrait } from "../character/character-preview.js";
import {
  findMouthOpenness,
  findSpeakingCharacter,
  isVoiceOnStage,
  subscribeToSpeaking,
} from "./speaking-voice.js";
import { voiceCharacters, type VoiceCharacterId } from "./voice-characters.js";

/** Long enough to bridge the gap between two sentences or lines, so the face doesn't flicker. */
const lingerMilliseconds = 450;

const findShownVoice = (): VoiceCharacterId | undefined => {
  const speaking = findSpeakingCharacter();
  return speaking === undefined || isVoiceOnStage(speaking.voice)
    ? undefined
    : speaking.voice;
};

/** The voice whose face shows now: the one speaking, kept a moment after it stops. */
export const useShownVoice = (): {
  voice: VoiceCharacterId | undefined;
  isSpeaking: boolean;
} => {
  const speakingVoice = useSyncExternalStore(
    subscribeToSpeaking,
    findShownVoice,
    () => undefined,
  );
  const [lastVoice, setLastVoice] = useState<VoiceCharacterId>();
  const [isLingering, setIsLingering] = useState(false);
  if (speakingVoice !== undefined && speakingVoice !== lastVoice) {
    setLastVoice(speakingVoice);
  }
  if (speakingVoice !== undefined && !isLingering) {
    setIsLingering(true);
  }
  useEffect(() => {
    if (speakingVoice !== undefined) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsLingering(false);
    }, lingerMilliseconds);
    return () => {
      clearTimeout(timer);
    };
  }, [speakingVoice]);
  return {
    voice: speakingVoice ?? (isLingering ? lastVoice : undefined),
    isSpeaking: speakingVoice !== undefined,
  };
};

/**
 * The face of whichever voice is speaking, wherever it speaks: a Game's
 * line, Read it to me, a sound, a voice's hello (ADR 0077). Its mouth moves
 * with the words. It is drawn only once a voice has spoken, and stays ready
 * after, so the next line's face appears at once.
 */
export const SpeakingFace = () => {
  const { voice, isSpeaking } = useShownVoice();
  const [drawnVoice, setDrawnVoice] = useState<VoiceCharacterId>();
  if (voice !== undefined && voice !== drawnVoice) {
    setDrawnVoice(voice);
  }
  if (drawnVoice === undefined) {
    return null;
  }
  return (
    <div
      className="speaking-face"
      data-shown={voice === undefined ? undefined : ""}
      data-voice={drawnVoice}
      aria-hidden
    >
      <CharacterPortrait
        loadout={voiceCharacters[drawnVoice].loadout}
        readMouthOpenness={isSpeaking ? findMouthOpenness : undefined}
      />
    </div>
  );
};
