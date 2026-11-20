import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { build, defineConfig, type Plugin } from "vite";
import {
  buildPrecacheUrls,
  listPiperEngineUrls,
  piperEngineFolder,
  serviceWorkerFileName,
} from "./src/client/offline/caching-rules.js";
import { readReleaseVersion } from "./src/release-version.js";

const clientDirectory = resolve("dist/client");

const listBuiltFileNames = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(directory, join(entry.parentPath, entry.name))
        .split(sep)
        .join("/"),
    )
    .toSorted();
};

const hashBuiltFiles = async (
  directory: string,
  builtFileNames: readonly string[],
): Promise<string> => {
  const hash = createHash("sha256");
  for (const fileName of builtFileNames) {
    hash.update(fileName);
    hash.update(await readFile(join(directory, fileName)));
  }
  return hash.digest("hex").slice(0, 12);
};

const buildServiceWorkerPlugin = (): Plugin => ({
  name: "wizzaroo:build-service-worker",
  apply: "build",
  closeBundle: {
    sequential: true,
    handler: async () => {
      const builtFileNames = await listBuiltFileNames(clientDirectory);
      const appVersion = await hashBuiltFiles(clientDirectory, builtFileNames);
      await build({
        configFile: false,
        logLevel: "warn",
        publicDir: false,
        define: {
          builtAppVersion: JSON.stringify(appVersion),
          builtPrecacheUrls: JSON.stringify(buildPrecacheUrls(builtFileNames)),
          builtPiperEngineUrls: JSON.stringify(
            listPiperEngineUrls(builtFileNames),
          ),
        },
        build: {
          outDir: clientDirectory,
          emptyOutDir: false,
          lib: {
            entry: resolve("src/client/offline/service-worker.ts"),
            formats: ["iife"],
            name: "wizzarooServiceWorker",
            fileName: () => serviceWorkerFileName,
          },
        },
      });
    },
  },
});

export default defineConfig({
  root: "src/client",
  define: {
    __APP_VERSION__: JSON.stringify(readReleaseVersion()),
  },
  plugins: [buildServiceWorkerPlugin()],
  // The Piper worker is a module, as onnxruntime-web is, and it and its
  // engine are built into their own folder, fetched only with the first
  // voice a device uses (ADR 0062).
  worker: {
    format: "es",
    rolldownOptions: {
      output: {
        entryFileNames: `${piperEngineFolder}/[name]-[hash].js`,
        chunkFileNames: `${piperEngineFolder}/[name]-[hash].js`,
        assetFileNames: `${piperEngineFolder}/[name]-[hash][extname]`,
      },
    },
  },
  build: {
    outDir: clientDirectory,
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        game: resolve("src/client/index.html"),
        parent: resolve("src/client/parent/index.html"),
      },
    },
  },
});
