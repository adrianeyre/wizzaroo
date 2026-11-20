import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  buildMonoWav,
  readMonoWav,
  resampleSound,
  type VoiceOverEngine,
} from "./voice-over-files.js";

const piperVoicesRevision = "6b9cfaacb4fb2e02a9621227e3c1a48bec9710c3";
const piperVoiceName = "en_GB-cori-high";
const piperVoiceFolder = `https://huggingface.co/rhasspy/piper-voices/resolve/${piperVoicesRevision}/en/en_GB/cori/high`;
const piperVoiceCache = resolve(
  "node_modules/.cache/piper-voices",
  piperVoicesRevision,
);

export const voiceOverSampleRate = 16_000;

export const piperVoice = `piper ${piperVoiceName} rhasspy/piper-voices@${piperVoicesRevision} at ${String(voiceOverSampleRate)} Hz`;

const downloadPiperVoiceFile = async (fileName: string): Promise<string> => {
  const path = join(piperVoiceCache, fileName);
  if (existsSync(path)) {
    return path;
  }

  const response = await fetch(`${piperVoiceFolder}/${fileName}`);
  if (!response.ok) {
    throw new Error(
      `Downloading the Piper voice file ${fileName} failed with HTTP ${String(response.status)}`,
    );
  }
  const partialPath = `${path}.partial`;
  await mkdir(piperVoiceCache, { recursive: true });
  try {
    await writeFile(partialPath, new Uint8Array(await response.arrayBuffer()));
    await rename(partialPath, path);
  } finally {
    await rm(partialPath, { force: true });
  }
  return path;
};

const isMissingCommand = (error: Error): boolean =>
  "code" in error && error.code === "ENOENT";

const runPiper = async (
  modelPath: string,
  text: string,
  wavPath: string,
): Promise<void> => {
  const piper = spawn(
    "piper",
    ["--model", modelPath, "--output-file", wavPath],
    {
      stdio: ["pipe", "ignore", "inherit"],
    },
  );
  const exited = new Promise<number | null>((resolveExit, rejectExit) => {
    piper.once("error", (error) => {
      rejectExit(
        isMissingCommand(error)
          ? new Error(
              "Piper isn't installed: install it with `pipx install piper-tts`, then run pnpm generate:voice-over again",
              { cause: error },
            )
          : error,
      );
    });
    piper.once("close", (exitCode) => {
      resolveExit(exitCode);
    });
  });
  piper.stdin.end(text);
  const exitCode = await exited;
  if (exitCode !== 0) {
    throw new Error(
      `Piper stopped with exit code ${String(exitCode)} while saying "${text}"`,
    );
  }
};

export const preparePiperEngine = async (): Promise<VoiceOverEngine> => {
  const modelPath = await downloadPiperVoiceFile(`${piperVoiceName}.onnx`);
  await downloadPiperVoiceFile(`${piperVoiceName}.onnx.json`);

  return {
    voice: piperVoice,
    speakLine: async (text, wavPath) => {
      await runPiper(modelPath, text, wavPath);
      const spoken = readMonoWav(new Uint8Array(await readFile(wavPath)));
      await writeFile(
        wavPath,
        buildMonoWav(resampleSound(spoken, voiceOverSampleRate)),
      );
    },
  };
};
