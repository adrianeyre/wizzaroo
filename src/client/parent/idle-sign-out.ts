import { useEffect } from "react";

export const idleSignOutMs = 5 * 60_000;

const activityEventNames = ["pointerdown", "keydown", "wheel"] as const;

export const useIdleSignOut = (
  isWatching: boolean,
  signOutIdleAdult: () => void,
): void => {
  useEffect(() => {
    if (!isWatching) {
      return;
    }
    let idleTimer = setTimeout(signOutIdleAdult, idleSignOutMs);
    const restartIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(signOutIdleAdult, idleSignOutMs);
    };
    for (const activityEventName of activityEventNames) {
      window.addEventListener(activityEventName, restartIdleTimer, {
        passive: true,
      });
    }
    return () => {
      clearTimeout(idleTimer);
      for (const activityEventName of activityEventNames) {
        window.removeEventListener(activityEventName, restartIdleTimer);
      }
    };
  }, [isWatching, signOutIdleAdult]);
};
