import { describe, expect, it } from "vitest";
import { phonicsSounds } from "../../curriculum/phonics-sounds.js";
import {
  getRmsDecibels,
  getSoundSeconds,
  normalisePhonemeLoudness,
  phonemePeakCeilingDecibels,
  phonemeTargetRmsDecibels,
  planPhonemeTakes,
  preparePhonemeSound,
  trimPhonemeSilence,
  UnusablePhonemeTakesError,
} from "./phoneme-takes.js";
import type { MonoSound } from "./voice-over-files.js";

const sampleRate = 1_000;

const buildTone = (length: number, amplitude: number): Int16Array =>
  Int16Array.from({ length }, (_, index) =>
    Math.round(amplitude * Math.sin(index / 3)),
  );

const buildSound = (...parts: Int16Array[]): MonoSound => {
  const samples = new Int16Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    samples.set(part, offset);
    offset += part.length;
  }
  return { sampleRate, samples };
};

const findPeakDecibels = ({ samples }: MonoSound): number =>
  20 *
  Math.log10(
    samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0) /
      32_767,
  );

describe("planPhonemeTakes", () => {
  it("matches each take to its sound and lists the sounds still to record", () => {
    const plan = planPhonemeTakes(["m.wav", "oo-long.m4a", "notes.txt"]);

    expect(plan.takes).toEqual([
      { sound: "m", fileName: "m.wav" },
      { sound: "oo-long", fileName: "oo-long.m4a" },
    ]);
    expect(plan.missingSounds).toHaveLength(42);
    expect(plan.missingSounds).not.toContain("m");
    expect(plan.missingSounds).not.toContain("oo-long");
  });

  it("finds nothing missing once every sound has a take", () => {
    const plan = planPhonemeTakes(phonicsSounds.map((sound) => `${sound}.wav`));

    expect(plan.takes).toHaveLength(44);
    expect(plan.missingSounds).toEqual([]);
  });

  it("refuses a take named after a letter or anything that isn't one of the 44 sounds", () => {
    expect(() => planPhonemeTakes(["m.wav", "em.wav", "oo.mp3"])).toThrow(
      new UnusablePhonemeTakesError(
        "These takes aren't named after one of the 44 sounds: em.wav, oo.mp3. Rename each to its sound, such as m.wav or oo-long.m4a",
      ),
    );
  });

  it("refuses two takes of the same sound, so the best one is chosen by ear", () => {
    expect(() => planPhonemeTakes(["m.wav", "m.m4a"])).toThrow(
      "Keep only your best take of each sound; these have more than one: m",
    );
  });
});

describe("trimPhonemeSilence", () => {
  it("cuts the quiet before and after the sound down to 50 ms each side", () => {
    const take = buildSound(
      buildTone(400, 5),
      buildTone(300, 10_000),
      buildTone(600, 5),
    );

    expect(getSoundSeconds(trimPhonemeSilence(take))).toBeCloseTo(0.4, 2);
  });

  it("keeps all of a sound that starts and ends at the edges", () => {
    const take = buildSound(buildTone(300, 10_000));

    expect(trimPhonemeSilence(take).samples).toHaveLength(300);
  });

  it("refuses a silent take", () => {
    expect(() => trimPhonemeSilence(buildSound(new Int16Array(100)))).toThrow(
      "The take is silent",
    );
  });
});

describe("normalisePhonemeLoudness", () => {
  it("brings a quiet, steady sound up to the voice-over's loudness", () => {
    const normalised = normalisePhonemeLoudness(
      buildSound(buildTone(1_000, 500)),
    );

    expect(getRmsDecibels(normalised)).toBeCloseTo(phonemeTargetRmsDecibels, 1);
  });

  it("turns a loud sound down to the same loudness", () => {
    const normalised = normalisePhonemeLoudness(
      buildSound(buildTone(1_000, 30_000)),
    );

    expect(getRmsDecibels(normalised)).toBeCloseTo(phonemeTargetRmsDecibels, 1);
  });

  it("stops a short, spiky sound such as /t/ short of clipping", () => {
    const click = buildSound(buildTone(5, 20_000), buildTone(995, 20));

    const normalised = normalisePhonemeLoudness(click);

    expect(findPeakDecibels(normalised)).toBeCloseTo(
      phonemePeakCeilingDecibels,
      1,
    );
  });
});

describe("preparePhonemeSound", () => {
  it("trims, then sets the loudness of what is heard", () => {
    const take = buildSound(
      buildTone(500, 3),
      buildTone(500, 800),
      buildTone(500, 3),
    );

    const prepared = preparePhonemeSound(take);

    expect(getSoundSeconds(prepared)).toBeCloseTo(0.6, 2);
    expect(prepared.sampleRate).toBe(sampleRate);
  });
});
