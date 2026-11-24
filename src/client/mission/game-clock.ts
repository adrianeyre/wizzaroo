/**
 * The time a Game reads, in milliseconds, which stands still while the Game
 * is paused: an answer's time, a Check's clock and a puzzle's seconds all
 * leave out the time a Parent spent reading For parents.
 */
export interface GameClock {
  read: () => number;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
}

export const buildGameClock = (readNow: () => number = Date.now): GameClock => {
  let pausedMs = 0;
  let pausedAt: number | undefined;
  return {
    read: () => (pausedAt ?? readNow()) - pausedMs,
    pause: () => {
      pausedAt ??= readNow();
    },
    resume: () => {
      if (pausedAt === undefined) {
        return;
      }
      pausedMs += readNow() - pausedAt;
      pausedAt = undefined;
    },
    isPaused: () => pausedAt !== undefined,
  };
};
