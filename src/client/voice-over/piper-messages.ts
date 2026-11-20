/** What the page and the Piper worker say to each other (ADR 0062). */

export { piperVoiceCacheName } from "../offline/caching-rules.js";

export type PiperRequest =
  | {
      kind: "speak";
      requestId: number;
      modelPath: string;
      configPath: string;
      speakerId: number;
      sentences: readonly string[];
    }
  | { kind: "download"; modelPath: string; configPath: string }
  | { kind: "stop" };

export type PiperResponse =
  | {
      kind: "sound";
      requestId: number;
      index: number;
      samples: Float32Array;
      sampleRate: number;
    }
  | { kind: "spoken"; requestId: number }
  | { kind: "failed"; requestId: number; reason: string }
  | { kind: "progress"; modelPath: string; received: number }
  | { kind: "downloaded"; modelPath: string }
  | { kind: "download-failed"; modelPath: string; reason: string };
