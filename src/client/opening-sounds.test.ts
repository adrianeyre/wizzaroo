import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchSpy = vi.fn();
const connections: string[] = [];

class FakeParam {
  value = 0;
  setValueAtTime() {
    return this;
  }
  linearRampToValueAtTime() {
    return this;
  }
  exponentialRampToValueAtTime() {
    return this;
  }
}

class FakeNode {
  constructor(readonly name: string) {}
  connect(target: FakeNode | FakeParam) {
    connections.push(
      `${this.name}->${target instanceof FakeNode ? target.name : "param"}`,
    );
    return target;
  }
}

class FakeSource extends FakeNode {
  type = "sine";
  frequency = new FakeParam();
  buffer: unknown = null;
  start() {
    return undefined;
  }
  stop() {
    return undefined;
  }
  addEventListener() {
    return undefined;
  }
}

class FakeAudioContext {
  destination = new FakeNode("speakers");
  sampleRate = 8000;
  currentTime = 3;
  createGain() {
    return Object.assign(new FakeNode("gain"), { gain: new FakeParam() });
  }
  createOscillator() {
    return new FakeSource("oscillator");
  }
  createBufferSource() {
    return new FakeSource("noise");
  }
  createBuffer(_channels: number, length: number) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }
  createBiquadFilter() {
    return Object.assign(new FakeNode("filter"), {
      type: "lowpass",
      frequency: new FakeParam(),
      Q: new FakeParam(),
    });
  }
  createDynamicsCompressor() {
    return Object.assign(new FakeNode("compressor"), {
      threshold: new FakeParam(),
      knee: new FakeParam(),
      ratio: new FakeParam(),
      attack: new FakeParam(),
      release: new FakeParam(),
    });
  }
  resume() {
    return Promise.resolve();
  }
}

const loadOpeningSounds = () => import("./opening-sounds.js");

const sounded = { isMusicMuted: false, areSoundEffectsMuted: false };

const buildSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe("opening sounds", () => {
  beforeEach(() => {
    vi.resetModules();
    connections.length = 0;
    fetchSpy.mockClear();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the Family Chest with a thunk, a harp run, a brass ta-DAAA with a boom and cymbal, and tumbling coins", async () => {
    const { playOpeningSound, treasureHitSeconds } = await loadOpeningSounds();

    const voices = playOpeningSound("treasure", sounded, buildSeededRandom(3));
    const [first] = voices;
    const from = (seconds: number) => first.startsAt + seconds;

    expect(first).toMatchObject({ kind: "noise", startsAt: first.startsAt });
    const harp = voices.filter(({ wave }) => wave === "triangle");
    expect(harp.length).toBeGreaterThanOrEqual(11);
    const brass = voices.filter(({ wave }) => wave === "sawtooth");
    const hit = brass.filter(
      ({ startsAt }) => Math.abs(startsAt - from(treasureHitSeconds)) < 1e-9,
    );
    expect(hit).toHaveLength(8);
    expect(brass.filter(({ startsAt }) => startsAt < hit[0].startsAt)).toEqual(
      expect.arrayContaining([expect.objectContaining({ wave: "sawtooth" })]),
    );
    const coins = voices.filter(
      ({ wave, startsAt }) =>
        wave === "sine" && startsAt > from(treasureHitSeconds),
    );
    expect(coins.length).toBeGreaterThanOrEqual(14 * 3);
    const end = Math.max(...voices.map(({ stopsAt }) => stopsAt));
    expect(end - first.startsAt).toBeGreaterThan(1.8);
    expect(end - first.startsAt).toBeLessThan(2.6);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("opens the Awards with a slide whistle, a choir singing wowww, glockenspiel sparkles and clapping", async () => {
    const { playOpeningSound, wowSingsSeconds } = await loadOpeningSounds();

    const voices = playOpeningSound("wow", sounded, buildSeededRandom(5));
    const [whistle] = voices;

    expect(whistle).toMatchObject({ kind: "tone", wave: "sine" });
    const choir = voices.filter(({ wave }) => wave === "sawtooth");
    expect(choir).toHaveLength(3);
    expect(choir[0].startsAt - whistle.startsAt).toBeCloseTo(wowSingsSeconds);
    const sparkles = voices.filter(
      ({ wave, startsAt }) => wave === "sine" && startsAt > choir[0].startsAt,
    );
    expect(sparkles.length).toBeGreaterThanOrEqual(9 * 3);
    const claps = voices.filter(
      ({ kind, startsAt }) => kind === "noise" && startsAt > choir[0].startsAt,
    );
    expect(claps).toHaveLength(60);
    const end = Math.max(...voices.map(({ stopsAt }) => stopsAt));
    expect(end - whistle.startsAt).toBeGreaterThan(1.6);
    expect(end - whistle.startsAt).toBeLessThan(2.6);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("plays every layer through one compressed mixer onto the effects bus", async () => {
    const { playOpeningSound, openingSounds } = await loadOpeningSounds();

    for (const sound of openingSounds) {
      connections.length = 0;
      playOpeningSound(sound, sounded);

      expect(connections).toContain("gain->compressor");
      expect(connections).toContain("compressor->gain");
      expect(
        connections.filter((link) => link === "compressor->gain"),
      ).toHaveLength(1);
    }
  });

  it("plays nothing for a Child whose Parent turned sound effects off", async () => {
    const { playOpeningSound, openingSounds } = await loadOpeningSounds();

    for (const sound of openingSounds) {
      expect(
        playOpeningSound(sound, { ...sounded, areSoundEffectsMuted: true }),
      ).toEqual([]);
    }
    expect(connections.filter((link) => link.startsWith("oscillator"))).toEqual(
      [],
    );
  });
});
