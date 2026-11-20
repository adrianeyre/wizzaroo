import { readdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { preparePiperEngine } from "./piper.js";
import {
  parseVoiceOverLines,
  planVoiceOver,
  type VoiceOverEngine,
} from "./voice-over-files.js";

const voiceOverDirectory = import.meta.dirname;
const voiceOverLinesPath = join(voiceOverDirectory, "voice-over-lines.json");

const generateVoiceOver = async (engine: VoiceOverEngine): Promise<void> => {
  const lines = parseVoiceOverLines(await readFile(voiceOverLinesPath, "utf8"));
  const { linesToSpeak, fileNamesToDelete } = await planVoiceOver({
    lines,
    voice: engine.voice,
    existingFileNames: await readdir(voiceOverDirectory),
  });

  for (const { key, text, fileName } of linesToSpeak) {
    const wavPath = join(voiceOverDirectory, fileName);
    const partialPath = `${wavPath}.partial`;
    try {
      await engine.speakLine(text, partialPath);
      await rename(partialPath, wavPath);
    } finally {
      await rm(partialPath, { force: true });
    }
    process.stdout.write(`Spoke ${key} into ${fileName}\n`);
  }
  for (const fileName of fileNamesToDelete) {
    await rm(join(voiceOverDirectory, fileName));
    process.stdout.write(`Deleted ${fileName}, which no line says any more\n`);
  }

  const unchangedCount = lines.length - linesToSpeak.length;
  process.stdout.write(
    `Voice-over is up to date with ${engine.voice}. Lines spoken: ${String(linesToSpeak.length)}, unchanged: ${String(unchangedCount)}. Files deleted: ${String(fileNamesToDelete.length)}.\n`,
  );
};

await generateVoiceOver(await preparePiperEngine());
