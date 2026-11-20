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
