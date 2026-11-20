import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadMinimisedGroups,
  minimisedGroupsStorageKey,
  storeMinimisedGroups,
} from "./minimised-groups.js";

const buildMemoryStorage = () => {
  const stored = new Map<string, string>();
  return {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
  };
};

describe("minimised groups", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", buildMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers nothing minimised until a group is minimised", () => {
    expect(loadMinimisedGroups()).toStrictEqual([]);
  });

  it("remembers which groups were minimised, and forgets one maximised again", () => {
    storeMinimisedGroups(["regions", "map"]);
    expect(loadMinimisedGroups()).toStrictEqual(["regions", "map"]);

    storeMinimisedGroups(["map"]);
    expect(loadMinimisedGroups()).toStrictEqual(["map"]);
  });

  it("ignores anything stored that isn't a list of group names", () => {
    localStorage.setItem(minimisedGroupsStorageKey, JSON.stringify({ a: 1 }));
    expect(loadMinimisedGroups()).toStrictEqual([]);
    localStorage.setItem(
      minimisedGroupsStorageKey,
      JSON.stringify(["map", 3, null, "map"]),
    );
    expect(loadMinimisedGroups()).toStrictEqual(["map"]);
    localStorage.setItem(minimisedGroupsStorageKey, "not json");
    expect(loadMinimisedGroups()).toStrictEqual([]);
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
      storeMinimisedGroups(["map"]);
    }).not.toThrow();
    expect(loadMinimisedGroups()).toStrictEqual([]);
  });
});
