import { useEffect, useState } from "react";

const isFullScreenShown = () => document.fullscreenElement instanceof Element;

export const toggleFullScreen = async (): Promise<void> => {
  if (isFullScreenShown()) {
    await document.exitFullscreen();
    return;
  }
  await document.documentElement.requestFullscreen();
};

export const enterFullScreen = (): void => {
  if (!document.fullscreenEnabled || isFullScreenShown()) {
    return;
  }
  document.documentElement.requestFullscreen().catch(() => undefined);
};

// A phone's or tablet's main pointer is a finger; a desktop's is a mouse or trackpad, even with a touch screen.
const isTouchDevice = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

/**
 * Fills the whole screen of a phone or tablet, leaving a desktop as it is.
 * Call it from the tap itself: a browser grants full screen only then.
 */
export const enterFullScreenOnTouchDevice = (): void => {
  if (isTouchDevice()) {
    enterFullScreen();
  }
};

export const leaveFullScreen = (): void => {
  if (!isFullScreenShown()) {
    return;
  }
  document.exitFullscreen().catch(() => undefined);
};

export const useFullScreen = () => {
  const [isFullScreen, setIsFullScreen] = useState(isFullScreenShown);
  useEffect(() => {
    const followFullScreen = () => {
      setIsFullScreen(isFullScreenShown());
    };
    document.addEventListener("fullscreenchange", followFullScreen);
    return () => {
      document.removeEventListener("fullscreenchange", followFullScreen);
    };
  }, []);
  return { isFullScreen, isFullScreenOffered: document.fullscreenEnabled };
};
