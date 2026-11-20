import { useCallback, useEffect, useRef } from "react";
import type { MusicClip } from "../../curriculum/music-theory.js";
import { playMusicClips, stopMusic } from "../music-player.js";
import {
  playVoiceOver,
  waitForVoiceOverToEnd,
  type VoiceOverKey,
} from "../voice-over/voice-over.js";

export type MusicCue =
  | { kind: "voice"; key: VoiceOverKey }
  | { kind: "music"; clips: readonly MusicClip[] }
  | { kind: "pause"; seconds: number };

const waitSeconds = (seconds: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, Math.max(0, seconds) * 1000);
  });

const playMusicCues = async (
  cues: readonly MusicCue[],
  isStillWanted: () => boolean,
): Promise<void> => {
  for (const cue of cues) {
    if (!isStillWanted()) {
      return;
    }
    if (cue.kind === "voice") {
      await playVoiceOver(cue.key);
      await waitForVoiceOverToEnd();
    }
    if (cue.kind === "music") {
      await waitSeconds(playMusicClips(cue.clips));
    }
    if (cue.kind === "pause") {
      await waitSeconds(cue.seconds);
    }
  }
};

export const useMusicCues = (): ((cues: readonly MusicCue[]) => void) => {
  const latestCueList = useRef(0);

  useEffect(
    () => () => {
      latestCueList.current += 1;
      stopMusic();
    },
    [],
  );

  return useCallback((cues: readonly MusicCue[]) => {
    latestCueList.current += 1;
    const cueList = latestCueList.current;
    stopMusic();
    void playMusicCues(cues, () => latestCueList.current === cueList);
  }, []);
};
