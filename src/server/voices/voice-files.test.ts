import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  findPiperFilePath,
  listPiperFiles,
  type PiperFile,
} from "../../curriculum/piper-voice-models.js";
import {
  checkVoiceFile,
  downloadVoices,
  registerVoiceRoutes,
  VoiceFileMismatchError,
} from "./voice-files.js";

const makeFile = (text: string): { file: PiperFile; bytes: Uint8Array } => {
  const bytes = new TextEncoder().encode(text);
  return {
    bytes,
    file: {
      name: "made.onnx.json",
      url: "https://voices.example/made.onnx.json",
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
};

describe("checkVoiceFile", () => {
  it("accepts the pinned bytes and refuses anything else", () => {
    const { file, bytes } = makeFile("{}");
    expect(() => {
      checkVoiceFile(file, bytes);
    }).not.toThrow();
    expect(() => {
      checkVoiceFile(file, new TextEncoder().encode("[]"));
    }).toThrow(VoiceFileMismatchError);
    expect(() => {
      checkVoiceFile(file, new TextEncoder().encode("{ }"));
    }).toThrow(/bytes/);
  });
});

describe("downloadVoices", () => {
  it("fetches every pinned file from the page's bucket, and refuses one that doesn't match", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const asked: string[] = [];
    await expect(
      downloadVoices({
        directory,
        fetchFile: (url) => {
          asked.push(url);
          return Promise.resolve(new Uint8Array([1, 2, 3]));
        },
        log: () => undefined,
      }),
    ).rejects.toThrow(VoiceFileMismatchError);
    expect(asked).toStrictEqual([listPiperFiles()[0].url]);
    expect(await readdir(directory)).toStrictEqual([]);
  });
});

describe("the voice route", () => {
  const buildServer = async (directory: string) => {
    const server = Fastify();
    registerVoiceRoutes(server, directory);
    await server.ready();
    return server;
  };

  it("serves a pinned file that has been downloaded, for a device to keep for good", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const [file] = listPiperFiles().filter(({ name }) =>
      name.endsWith(".json"),
    );
    await writeFile(join(directory, file.name), new Uint8Array(file.bytes));
    const server = await buildServer(directory);

    const answer = await server.inject(findPiperFilePath(file));

    expect(answer.statusCode).toBe(200);
    expect(answer.headers["cache-control"]).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(answer.rawPayload.byteLength).toBe(file.bytes);
    await server.close();
  });

  it("answers 404 for a file not yet downloaded, a wrong fingerprint or anything else", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const [file] = listPiperFiles();
    await writeFile(join(directory, "secret.txt"), "not a voice");
    const server = await buildServer(directory);

    for (const url of [
      findPiperFilePath(file),
      `/voices/0000000000000000/${file.name}`,
      `/voices/${file.sha256.slice(0, 16)}/secret.txt`,
      "/voices/..%2F..%2Fpackage.json/x",
    ]) {
      expect((await server.inject(url)).statusCode).toBe(404);
    }
    expect(await readFile(join(directory, "secret.txt"), "utf8")).toBe(
      "not a voice",
    );
    await server.close();
  });

  const streamOf = (...chunks: Uint8Array[]) =>
    Promise.resolve(Readable.from(chunks));

  it("in development, passes a missing file on as it arrives, fetching it once however many ask, and keeps it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const { file, bytes } = makeFile('{"made": true}');
    const asked: string[] = [];
    const server = Fastify();
    registerVoiceRoutes(server, directory, {
      files: [file],
      streamMissingFile: (url) => {
        asked.push(url);
        return streamOf(bytes.slice(0, 5), bytes.slice(5));
      },
    });
    await server.ready();

    const answers = await Promise.all([
      server.inject(findPiperFilePath(file)),
      server.inject(findPiperFilePath(file)),
    ]);
    const again = await server.inject(findPiperFilePath(file));

    expect(answers.map(({ statusCode }) => statusCode)).toEqual([200, 200]);
    expect(answers.map(({ body }) => body)).toEqual([
      '{"made": true}',
      '{"made": true}',
    ]);
    expect(answers[0].headers["content-length"]).toBe(String(file.bytes));
    expect(again.body).toBe('{"made": true}');
    expect(asked).toEqual([file.url]);
    expect(await readdir(directory)).toEqual([file.name]);
    await server.close();
  });

  it("in development, cuts off and never keeps a fetched file that isn't the pinned one", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const { file } = makeFile('{"made": true}');
    const server = Fastify();
    registerVoiceRoutes(server, directory, {
      files: [file],
      streamMissingFile: () =>
        streamOf(new TextEncoder().encode('{"made": 0000}')),
    });
    await server.ready();

    const answer = await server
      .inject(findPiperFilePath(file))
      .then(({ body }) => body)
      .catch((error: unknown) => error);

    expect(answer).not.toBe('{"made": true}');
    expect(await readdir(directory)).toEqual([]);
    await server.close();
  });

  it("in development, answers 502 when the bucket can't be reached", async () => {
    const directory = await mkdtemp(join(tmpdir(), "voices-"));
    const { file } = makeFile('{"made": true}');
    const server = Fastify();
    registerVoiceRoutes(server, directory, {
      files: [file],
      streamMissingFile: () => Promise.reject(new Error("offline")),
    });
    await server.ready();

    expect((await server.inject(findPiperFilePath(file))).statusCode).toBe(502);
    expect(await readdir(directory)).toEqual([]);
    await server.close();
  });
});
