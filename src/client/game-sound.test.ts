import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { worldMap, type ThemeMusic } from "../curriculum/world-map.js";

interface StartedOscillator {
  wave: OscillatorType | "noise";
  startsAt: number;
  isStopped: boolean;
}

const started: StartedOscillator[] = [];
const fetchSpy = vi.fn();
let audioClock = 0;

class FakeAudioParam {
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

class FakeAudioNode {
  connect() {
    return this;
  }
}

class FakeOscillator extends FakeAudioNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  private started: StartedOscillator | undefined;
  start(startsAt: number) {
    this.started = { wave: this.type, startsAt, isStopped: false };
    started.push(this.started);
  }
  stop(stopsAt?: number) {
    if (stopsAt === undefined && this.started !== undefined) {
      this.started.isStopped = true;
    }
  }
  addEventListener() {
    return undefined;
  }
}

class FakeNoiseSource extends FakeAudioNode {
  buffer: unknown = null;
  private started: StartedOscillator | undefined;
  start(startsAt: number) {
    this.started = { wave: "noise", startsAt, isStopped: false };
    started.push(this.started);
  }
  stop(stopsAt?: number) {
    if (stopsAt === undefined && this.started !== undefined) {
      this.started.isStopped = true;
    }
  }
  addEventListener() {
    return undefined;
  }
}

class FakeAudioContext {
  destination = new FakeAudioNode();
  sampleRate = 8000;
  createBuffer(_channels: number, length: number) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }
  createBufferSource() {
    return new FakeNoiseSource();
  }
  createBiquadFilter() {
    return Object.assign(new FakeAudioNode(), {
      type: "lowpass",
      frequency: new FakeAudioParam(),
      Q: new FakeAudioParam(),
    });
  }
  decodeAudioData = vi.fn();
  get currentTime() {
    return audioClock;
  }
  createGain() {
    return Object.assign(new FakeAudioNode(), { gain: new FakeAudioParam() });
  }
  createOscillator() {
    return new FakeOscillator();
  }
  resume() {
    return Promise.resolve();
  }
}

const loadGameSound = () => import("./game-sound.js");

const music: ThemeMusic = {
  id: "test-chiptune",
  beatsPerMinute: 120,
  regionTunes: { "bubble-bay": [72, null, 76, 79] },
};
const stepSeconds = 0.25;
const loopSeconds = stepSeconds * 4;
const sounded = { isMusicMuted: false, areSoundEffectsMuted: false };

describe("game sound", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    started.length = 0;
    audioClock = 0;
    fetchSpy.mockClear();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("plays every sound effect as chiptune blips", async () => {
    const { playSoundEffect, soundEffects, effectWave } = await loadGameSound();

    for (const effect of soundEffects) {
      started.length = 0;
      playSoundEffect(effect, sounded);

      expect(started.length, effect).toBeGreaterThan(0);
      expect(started.every(({ wave }) => wave === effectWave)).toBe(true);
    }
  });

  it("plays the Stars' fireworks in step with them: a whistle as each rocket rises, a bang and crackles as it bursts, a twinkle for a shooting star", async () => {
    const { playFireworkSounds } = await loadGameSound();
    audioClock = 5;

    const sounds = playFireworkSounds(
      [
        { kind: "launch", atSeconds: 0.3, seconds: 0.8 },
        { kind: "burst", atSeconds: 1.1, seconds: 1.7 },
        { kind: "shooting-star", atSeconds: 2, seconds: 1.2 },
      ],
      sounded,
      () => 0.5,
    );
    const showStartsAt = 5 + sounds.delaySeconds;
    const startsOf = (wave: string) =>
      started
        .filter((sound) => sound.wave === wave)
        .map(({ startsAt }) => startsAt - showStartsAt);

    expect(startsOf("triangle")).toEqual([expect.closeTo(0.3)]);
    expect(startsOf("sine")).toEqual([expect.closeTo(1.1), expect.closeTo(2)]);
    const noises = startsOf("noise");
    expect(noises).toHaveLength(10);
    expect(noises[0]).toBeCloseTo(1.1);
    expect(noises.every((startsAt) => startsAt > 1.09 && startsAt < 2.8)).toBe(
      true,
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    sounds.stop();
    expect(started.every(({ isStopped }) => isStopped)).toBe(true);
  });

  it("plays no fireworks for a Child whose Parent turned sound effects off", async () => {
    const { playFireworkSounds } = await loadGameSound();

    const sounds = playFireworkSounds(
      [{ kind: "burst", atSeconds: 0, seconds: 1 }],
      { ...sounded, areSoundEffectsMuted: true },
    );

    expect(started).toEqual([]);
    expect(sounds.delaySeconds).toBe(0);
    sounds.stop();
  });

  it("plays no sound effect for a Child whose Parent turned sound effects off", async () => {
    const { playSoundEffect } = await loadGameSound();

    playSoundEffect("right", { ...sounded, areSoundEffectsMuted: true });

    expect(started).toEqual([]);
  });

  it("plays a Room sound note by note in its own wave, unless sound effects are off", async () => {
    const { playRoomSound } = await loadGameSound();
    const xylophone = {
      pitches: [72, 74, 76],
      seconds: 0.1,
      wave: "sine" as const,
    };

    playRoomSound(xylophone, { ...sounded, areSoundEffectsMuted: true });
    expect(started).toEqual([]);

    playRoomSound(xylophone, sounded);
    expect(started.map(({ wave }) => wave)).toEqual(["sine", "sine", "sine"]);
    expect(started[1].startsAt - started[0].startsAt).toBeCloseTo(0.1);
  });

  it("loops the Region's tune, a loop ahead, until it stops", async () => {
    const { startRegionTune, tuneWave } = await loadGameSound();

    const stopTune = startRegionTune(music, "bubble-bay", false);
    expect(started.map(({ wave }) => wave)).toEqual([
      tuneWave,
      tuneWave,
      tuneWave,
    ]);
    audioClock = loopSeconds;
    vi.advanceTimersByTime(loopSeconds * 1000);
    stopTune();

    expect(started).toHaveLength(6);
    expect(started[3].startsAt - started[0].startsAt).toBeCloseTo(loopSeconds);
    expect(started.every(({ isStopped }) => isStopped)).toBe(true);
    audioClock = loopSeconds * 4;
    vi.advanceTimersByTime(loopSeconds * 4000);
    expect(started).toHaveLength(6);
  });

  it.each([
    ["the Parent turned music off", "bubble-bay", true, false],
    ["the Region has no tune", "nowhere", false, false],
    ["the device asks for reduced motion", "bubble-bay", false, true],
  ])(
    "plays no tune when %s",
    async (_, regionId, isMusicMuted, isMotionReduced) => {
      vi.stubGlobal("matchMedia", () => ({ matches: isMotionReduced }));
      const { startRegionTune } = await loadGameSound();

      startRegionTune(music, regionId, isMusicMuted)();

      expect(started).toEqual([]);
    },
  );

  it("asks the browser for ambient audio, which the device's silent switch silences", async () => {
    const audioSession = { type: "auto" };
    vi.stubGlobal("navigator", { audioSession });
    const { playSoundEffect } = await loadGameSound();

    playSoundEffect("right", sounded);

    expect(audioSession.type).toBe("ambient");
  });

  it("makes every sound effect and every Region's tune in the browser, so sound adds nothing to the offline download", async () => {
    const { playSoundEffect, soundEffects, startRegionTune } =
      await loadGameSound();

    for (const effect of soundEffects) {
      playSoundEffect(effect, sounded);
    }
    for (const { islandId, id } of worldMap.regions) {
      const island = worldMap.islands.find(({ id: candidate }) => {
        return candidate === islandId;
      });
      if (island === undefined) {
        throw new Error(`Region "${id}" is on no Island`);
      }
      startRegionTune(island.theme.music, id, false)();
    }

    expect(started.length).toBeGreaterThan(worldMap.regions.length);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(
      JSON.stringify(worldMap.islands.map(({ theme }) => theme.music)).length,
    ).toBeLessThan(16_000);
  });
});
