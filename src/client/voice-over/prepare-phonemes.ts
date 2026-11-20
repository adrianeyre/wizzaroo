import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  getSoundSeconds,
  phonemeLongestSeconds,
  phonemeSampleRate,
  planPhonemeTakes,
  preparePhonemeSound,
} from "./phoneme-takes.js";
import { buildMonoWav, readMonoWav } from "./voice-over-files.js";

const phonemesDirectory = join(import.meta.dirname, "phonemes");
const defaultTakesDirectory = join(homedir(), "phoneme-takes");

const isMissingCommand = (error: Error): boolean =>
  "code" in error && error.code === "ENOENT";

const decodeTakeWithFfmpeg = async (
  takePath: string,
  wavPath: string,
): Promise<void> => {
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-nostdin",
      "-loglevel",
      "error",
      "-y",
      "-i",
      takePath,
      "-af",
      "highpass=f=80",
      "-ac",
      "1",
      "-ar",
      String(phonemeSampleRate),
      "-c:a",
      "pcm_s16le",
      wavPath,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  const exitCode = await new Promise<number | null>(
    (resolveExit, rejectExit) => {
      ffmpeg.once("error", (error) => {
        rejectExit(
          isMissingCommand(error)
            ? new Error(
                "ffmpeg isn't installed: install it with `brew install ffmpeg`, then run pnpm prepare:phonemes again",
                { cause: error },
              )
            : error,
        );
      });
      ffmpeg.once("close", resolveExit);
    },
  );
  if (exitCode !== 0) {
    throw new Error(
      `ffmpeg stopped with exit code ${String(exitCode)} while reading ${takePath}`,
    );
  }
};

const preparePhonemes = async (takesDirectory: string): Promise<void> => {
  const { takes, missingSounds } = planPhonemeTakes(
    await readdir(takesDirectory),
  );
  await mkdir(phonemesDirectory, { recursive: true });
  const workDirectory = await mkdtemp(join(tmpdir(), "phonemes-"));

  try {
    for (const { sound, fileName } of takes) {
      const decodedPath = join(workDirectory, `${sound}.wav`);
      await decodeTakeWithFfmpeg(join(takesDirectory, fileName), decodedPath);
      const prepared = preparePhonemeSound(
        readMonoWav(new Uint8Array(await readFile(decodedPath))),
      );

      const wavPath = join(phonemesDirectory, `${sound}.wav`);
      const partialPath = `${wavPath}.partial`;
      try {
        await writeFile(partialPath, buildMonoWav(prepared));
        await rename(partialPath, wavPath);
      } finally {
        await rm(partialPath, { force: true });
      }

      const seconds = getSoundSeconds(prepared);
      const tooLong =
        seconds > phonemeLongestSeconds
          ? `, longer than ${String(phonemeLongestSeconds)} s: say it shorter and take it again`
          : "";
      process.stdout.write(
        `Prepared ${fileName} into ${sound}.wav (${seconds.toFixed(2)} s${tooLong})\n`,
      );
    }
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }

  process.stdout.write(
    missingSounds.length === 0
      ? `All 44 phonemes are prepared.\n`
      : `Prepared ${String(takes.length)} of 44. Still to record: ${missingSounds.join(", ")}\n`,
  );
};

await preparePhonemes(resolve(process.argv[2] ?? defaultTakesDirectory));
