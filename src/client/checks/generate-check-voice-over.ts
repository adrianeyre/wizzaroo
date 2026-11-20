import { readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildSpellingCheckLine,
  spellingCheckWords,
} from "../../curriculum/spelling-check.js";
import { checkVoiceOverFolder } from "../offline/caching-rules.js";
import { preparePiperEngine } from "../voice-over/piper.js";
import {
  planVoiceOver,
  type VoiceOverEngine,
  type VoiceOverLine,
} from "../voice-over/voice-over-files.js";

const checkVoiceOverDirectory = join(
  import.meta.dirname,
  "..",
  "public",
  checkVoiceOverFolder,
);
const checkVoiceOverFilesPath = join(
  import.meta.dirname,
  "check-voice-over-files.json",
);

export const listCheckVoiceOverLines = (): VoiceOverLine[] =>
  spellingCheckWords.map(({ word }) => ({
    key: `spelling-check.${word}`,
    text: buildSpellingCheckLine(word),
  }));

const generateCheckVoiceOver = async (
  engine: VoiceOverEngine,
): Promise<void> => {
  const lines = listCheckVoiceOverLines();
  const existingFileNames = await readdir(checkVoiceOverDirectory);
  const { linesToSpeak, fileNamesToDelete } = await planVoiceOver({
    lines,
    voice: engine.voice,
    existingFileNames: existingFileNames.filter((fileName) =>
      fileName.endsWith(".wav"),
    ),
  });
  for (const { key, text, fileName } of linesToSpeak) {
    const wavPath = join(checkVoiceOverDirectory, fileName);
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
    await rm(join(checkVoiceOverDirectory, fileName));
  }
  const keptFileNames = (await readdir(checkVoiceOverDirectory)).filter(
    (fileName) => fileName.endsWith(".wav"),
  );
  const fileNamesByKey = Object.fromEntries(
    lines.flatMap(({ key }) => {
      const fileName = keptFileNames.find((kept) => kept.startsWith(`${key}.`));
      return fileName === undefined ? [] : [[key, fileName]];
    }),
  );
  await writeFile(
    checkVoiceOverFilesPath,
    `${JSON.stringify(fileNamesByKey, undefined, 2)}\n`,
  );
  process.stdout.write(
    `Check voice-over is up to date: ${String(Object.keys(fileNamesByKey).length)} of ${String(lines.length)} words have audio.\n`,
  );
};

await generateCheckVoiceOver(await preparePiperEngine());
