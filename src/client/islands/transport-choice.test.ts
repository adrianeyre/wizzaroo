import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transports } from "./island-journey.js";
import {
  loadTransportChoice,
  pickTransport,
  storeTransportChoice,
  transportChoiceNames,
  transportChoices,
  transportChoiceStorageKey,
} from "./transport-choice.js";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Transport choice", () => {
  it("offers Random first and then every craft, each with a name", () => {
    expect(transportChoices).toStrictEqual(["random", ...transports]);
    expect(new Set(Object.values(transportChoiceNames)).size).toBe(
      transportChoices.length,
    );
  });

  it("is Random until a craft is picked, and remembers the craft picked", () => {
    expect(loadTransportChoice()).toBe("random");
    storeTransportChoice("dragon");
    expect(store.get(transportChoiceStorageKey)).toBe("dragon");
    expect(loadTransportChoice()).toBe("dragon");
    storeTransportChoice("random");
    expect(store.has(transportChoiceStorageKey)).toBe(false);
    expect(loadTransportChoice()).toBe("random");
  });

  it("goes back to Random when what is kept is not a craft, or can't be read", () => {
    store.set(transportChoiceStorageKey, "flying-carpet");
    expect(loadTransportChoice()).toBe("random");
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadTransportChoice()).toBe("random");
    expect(() => {
      storeTransportChoice("ship");
    }).not.toThrow();
  });

  it("sends the chosen craft every time, and one at random when Random is chosen", () => {
    transports.forEach((transport) => {
      expect(pickTransport(transport, () => 0)).toBe(transport);
      expect(pickTransport(transport, () => 0.99)).toBe(transport);
    });
    expect(pickTransport("random", () => 0)).toBe("ship");
    expect(pickTransport("random", () => 0.999)).toBe("windsurfer");
  });

  it("uses the kept choice when none is given", () => {
    storeTransportChoice("blimp");
    expect(pickTransport()).toBe("blimp");
  });
});
