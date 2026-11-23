import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
  findPiperFilePath,
  listPiperFiles,
  type PiperFile,
} from "../../curriculum/piper-voice-models.js";

/**
 * Read it to me's Piper voices (ADR 0062). The `download-voices` command
 * fetches every pinned file from its own address into a folder and
 * refuses any that doesn't match its size and SHA-256; the app only ever
 * reads that folder, so it needs no way out to the internet. In Compose a
 * one-shot `voices` service runs the command into a volume the app mounts
 * read-only.
 */

const voiceModelsDirectoryName = "VOICE_MODELS_DIRECTORY";

/** Where the voices are kept: VOICE_MODELS_DIRECTORY, or `voice-models` in the working folder. */
export const findVoiceModelsDirectory = (): string =>
  resolve(process.env[voiceModelsDirectoryName] ?? "voice-models");

const sha256Of = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export class VoiceFileMismatchError extends Error {
  override readonly name = "VoiceFileMismatchError";

  constructor(file: PiperFile, reason: string) {
    super(`${file.name} isn't the pinned file: ${reason}`);
  }
}

/** Refuses bytes that aren't the pinned file. */
export const checkVoiceFile = (file: PiperFile, bytes: Uint8Array): void => {
  if (bytes.byteLength !== file.bytes) {
    throw new VoiceFileMismatchError(
      file,
      `${String(bytes.byteLength)} bytes, not ${String(file.bytes)}`,
    );
  }
  const sha256 = sha256Of(bytes);
  if (sha256 !== file.sha256) {
    throw new VoiceFileMismatchError(file, `SHA-256 ${sha256}`);
  }
};

const isKeptAlready = async (
  directory: string,
  file: PiperFile,
): Promise<boolean> => {
  try {
    checkVoiceFile(file, await readFile(join(directory, file.name)));
    return true;
  } catch {
    return false;
  }
};

export type FetchVoiceFile = (url: string) => Promise<Uint8Array>;

const fetchVoiceFile: FetchVoiceFile = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}`);
  }
  return new Uint8Array(await response.arrayBuffer());
};

/**
 * Fetches one pinned file from its own address, checks it and moves it
 * into place, so a half-written or wrong file is never served.
 */
const fetchAndKeepVoiceFile = async (
  directory: string,
  file: PiperFile,
  fetchFile: FetchVoiceFile,
): Promise<void> => {
  const bytes = await fetchFile(file.url);
  checkVoiceFile(file, bytes);
  await mkdir(directory, { recursive: true });
  const partial = join(directory, `${file.name}.partial`);
  await writeFile(partial, bytes);
  await rename(partial, join(directory, file.name));
};

/**
 * Fetches every voice file the folder hasn't a good copy of, checks it and
 * moves it into place, so a half-written file is never served.
 */
export const downloadVoices = async ({
  directory = findVoiceModelsDirectory(),
  fetchFile = fetchVoiceFile,
  log = (line: string) => {
    process.stdout.write(`${line}\n`);
  },
}: {
  directory?: string;
  fetchFile?: FetchVoiceFile;
  log?: (line: string) => void;
} = {}): Promise<void> => {
  await mkdir(directory, { recursive: true });
  for (const file of listPiperFiles()) {
    if (await isKeptAlready(directory, file)) {
      log(`${file.name}: kept already`);
      continue;
    }
    log(`${file.name}: downloading ${String(file.bytes)} bytes`);
    await fetchAndKeepVoiceFile(directory, file, fetchFile);
    log(`${file.name}: checked and kept`);
  }
};

const isKeptWhole = async (
  directory: string,
  file: PiperFile,
): Promise<boolean> => {
  try {
    return (await stat(join(directory, file.name))).size === file.bytes;
  } catch {
    return false;
  }
};

/** A file's bytes as they arrive, so they can be passed on before the last one has. */
export type StreamVoiceFile = (
  url: string,
) => Promise<AsyncIterable<Uint8Array>>;

export const streamVoiceFile: StreamVoiceFile = async (url) => {
  const response = await fetch(url);
  if (!response.ok || response.body === null) {
    throw new Error(`${url} answered ${String(response.status)}`);
  }
  return response.body;
};

/**
 * Passes a file's bytes on to the device as they arrive from the bucket,
 * and writes them to a partial file beside, hashing as it goes. Only a file
 * that matches its pin is moved into place; any other is deleted, and the
 * device's copy is cut off, so neither keeps it.
 */
const relayAndKeep = async (
  directory: string,
  file: PiperFile,
  chunks: AsyncIterable<Uint8Array>,
  relay: PassThrough,
): Promise<void> => {
  await mkdir(directory, { recursive: true });
  const partial = join(directory, `${file.name}.partial`);
  const kept = createWriteStream(partial);
  const hash = createHash("sha256");
  let size = 0;
  try {
    for await (const chunk of chunks) {
      size += chunk.byteLength;
      if (size > file.bytes) {
        throw new VoiceFileMismatchError(file, "more bytes than pinned");
      }
      hash.update(chunk);
      kept.write(chunk);
      // A device that has gone away doesn't stop the server keeping the file.
      if (!relay.destroyed) {
        relay.write(chunk);
      }
    }
    kept.end();
    await finished(kept);
    if (size !== file.bytes) {
      throw new VoiceFileMismatchError(
        file,
        `${String(size)} bytes, not ${String(file.bytes)}`,
      );
    }
    const sha256 = hash.digest("hex");
    if (sha256 !== file.sha256) {
      throw new VoiceFileMismatchError(file, `SHA-256 ${sha256}`);
    }
    await rename(partial, join(directory, file.name));
    relay.end();
  } catch (error) {
    kept.destroy();
    await rm(partial, { force: true });
    relay.destroy(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};

export interface VoiceRouteOptions {
  /**
   * Development only (ADR 0067): fetches a pinned file the folder hasn't
   * got the first time a device asks for it, passing it on as it arrives,
   * so a fresh checkout reads in every voice without `pnpm download:voices`
   * first. Production passes none, and the app keeps no way out to the
   * internet.
   */
  streamMissingFile?: StreamVoiceFile;
  /** The files it serves: every pinned voice file, unless a test names its own. */
  files?: readonly PiperFile[];
}

const sendVoiceFile = (
  reply: FastifyReply,
  file: PiperFile,
  body: NodeJS.ReadableStream,
) =>
  reply
    .header(
      "content-type",
      file.name.endsWith(".json")
        ? "application/json; charset=utf-8"
        : "application/octet-stream",
    )
    .header("content-length", String(file.bytes))
    .header("cache-control", "public, max-age=31536000, immutable")
    .send(body);

/**
 * Serves each pinned voice file at an address with its fingerprint in it,
 * so a device may keep it for good. Anything else under /voices/ is a 404.
 */
export const registerVoiceRoutes = (
  server: FastifyInstance,
  directory = findVoiceModelsDirectory(),
  { streamMissingFile, files = listPiperFiles() }: VoiceRouteOptions = {},
): void => {
  const filesByPath = new Map(
    files.map((file) => [findPiperFilePath(file), file]),
  );
  // A file being fetched, so a second device waits for it rather than fetching it again.
  const fetching = new Map<string, Promise<void>>();

  server.get<{ Params: { fingerprint: string; name: string } }>(
    "/voices/:fingerprint/:name",
    {
      config: {
        reach: "none",
        noReachReason:
          "Read it to me's voices are public-domain or openly licensed files, served to whoever loads the app, as its scripts are",
      },
    },
    async (request, reply) => {
      const file = filesByPath.get(
        `/voices/${request.params.fingerprint}/${request.params.name}`,
      );
      if (file === undefined) {
        return reply.code(404).send({ message: "There's no such voice" });
      }
      const path = join(directory, file.name);
      if (await isKeptWhole(directory, file)) {
        return sendVoiceFile(reply, file, createReadStream(path));
      }
      if (streamMissingFile === undefined) {
        return reply.code(404).send({
          message: "That voice hasn't been downloaded to the server",
        });
      }
      const couldNotFetch = () =>
        reply.code(502).send({ message: "That voice couldn't be fetched" });
      const known = fetching.get(file.name);
      if (known !== undefined) {
        try {
          await known;
        } catch {
          return couldNotFetch();
        }
        return sendVoiceFile(reply, file, createReadStream(path));
      }
      request.log.info(`fetching the missing voice file ${file.name}`);
      const relay = new PassThrough();
      let tellOpened: (isOpened: boolean) => void = () => undefined;
      const isOpened = new Promise<boolean>((resolve) => {
        tellOpened = resolve;
      });
      const keeping = (async () => {
        let chunks: AsyncIterable<Uint8Array>;
        try {
          chunks = await streamMissingFile(file.url);
        } catch (error) {
          tellOpened(false);
          throw error;
        }
        tellOpened(true);
        await relayAndKeep(directory, file, chunks, relay);
      })().finally(() => {
        fetching.delete(file.name);
      });
      keeping.catch((error: unknown) => {
        request.log.warn({ err: error }, `couldn't fetch ${file.name}`);
      });
      fetching.set(file.name, keeping);
      if (!(await isOpened)) {
        return couldNotFetch();
      }
      return sendVoiceFile(reply, file, relay);
    },
  );
};
