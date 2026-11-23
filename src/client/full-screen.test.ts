import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enterFullScreen,
  enterFullScreenOnTouchDevice,
  leaveFullScreen,
} from "./full-screen.js";

const usePointer = (pointer: "coarse" | "fine") => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === `(pointer: ${pointer})`,
  }));
};

const showFullScreen = (isShown: boolean) => {
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => (isShown ? document.documentElement : null),
  });
};

describe("full screen", () => {
  afterEach(() => {
    ["fullscreenElement", "fullscreenEnabled", "exitFullscreen"].forEach(
      (property) => {
        Reflect.deleteProperty(document, property);
      },
    );
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    vi.unstubAllGlobals();
  });

  it("asks the browser for full screen where it can, and copes when it says no", () => {
    const requestFullscreen = vi.fn(() => Promise.reject(new Error("no")));
    Reflect.set(document, "fullscreenEnabled", true);
    Reflect.set(
      document.documentElement,
      "requestFullscreen",
      requestFullscreen,
    );
    showFullScreen(false);

    enterFullScreen();

    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  it("asks for nothing where the browser can't show full screen, or already is", () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Reflect.set(
      document.documentElement,
      "requestFullscreen",
      requestFullscreen,
    );

    enterFullScreen();
    Reflect.set(document, "fullscreenEnabled", true);
    showFullScreen(true);
    enterFullScreen();

    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it("leaves full screen only when it is showing", () => {
    const exitFullscreen = vi.fn(() => Promise.resolve());
    Reflect.set(document, "exitFullscreen", exitFullscreen);

    showFullScreen(false);
    leaveFullScreen();
    expect(exitFullscreen).not.toHaveBeenCalled();

    showFullScreen(true);
    leaveFullScreen();
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });

  it("fills the screen of a phone or tablet, whose pointer is a finger, but not a desktop's", () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Reflect.set(document, "fullscreenEnabled", true);
    Reflect.set(
      document.documentElement,
      "requestFullscreen",
      requestFullscreen,
    );
    showFullScreen(false);

    usePointer("fine");
    enterFullScreenOnTouchDevice();
    expect(requestFullscreen).not.toHaveBeenCalled();

    usePointer("coarse");
    enterFullScreenOnTouchDevice();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });
});
