import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadPopupPosition,
  popupPositionsStorageKey,
  storePopupPosition,
} from "./popup-positions.js";

const buildMemoryStorage = () => {
  const stored = new Map<string, string>();
  return {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
  };
};

describe("popup positions", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", buildMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers where each box was moved, separately", () => {
    storePopupPosition("explore-help", { x: 120, y: -40 });
    storePopupPosition("map-voyage", { x: -30, y: 15 });

    expect(loadPopupPosition("explore-help")).toStrictEqual({ x: 120, y: -40 });
    expect(loadPopupPosition("map-voyage")).toStrictEqual({ x: -30, y: 15 });
    expect(loadPopupPosition("explore-card")).toBeUndefined();
  });

  it("ignores anything stored that isn't a position", () => {
    localStorage.setItem(
      popupPositionsStorageKey,
      JSON.stringify({ "explore-help": { x: "far", y: 2 } }),
    );
    expect(loadPopupPosition("explore-help")).toBeUndefined();
    localStorage.setItem(popupPositionsStorageKey, "not json");
    expect(loadPopupPosition("explore-help")).toBeUndefined();
  });

  it("carries on without remembering when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });

    expect(() => {
      storePopupPosition("explore-help", { x: 1, y: 2 });
    }).not.toThrow();
    expect(loadPopupPosition("explore-help")).toBeUndefined();
  });
});
