export const serviceWorkerFileName = "service-worker.js";
export const skipWaitingMessage = "wizzaroo.service-worker.skip-waiting";

const appCachePrefix = "wizzaroo-app-";
const pageFileName = "index.html";

export interface AppRequest {
  url: string;
  method: string;
  mode: RequestMode;
}

export interface PrecachedApp {
  origin: string;
  precacheUrls: readonly string[];
}

export const buildAppCacheName = (version: string): string =>
  `${appCachePrefix}${version}`;

const isPageFile = (fileName: string): boolean =>
  fileName === pageFileName || fileName.endsWith(`/${pageFileName}`);

const buildPrecacheUrl = (fileName: string): string => {
  const path = isPageFile(fileName)
    ? fileName.slice(0, -pageFileName.length)
    : fileName;
  return `/${path}`;
};

export const checkVoiceOverFolder = "check-voice-over";
export const homePicturesFolder = "home";
/** The Piper engine, about 15 MB, fetched with the first voice a device uses (ADR 0062). */
export const piperEngineFolder = "piper";
/** The cache keeping the Piper engine and every voice a device has used. */
export const piperVoiceCacheName = "wizzaroo-voices";

const foldersFetchedOnDemand = [
  checkVoiceOverFolder,
  homePicturesFolder,
  piperEngineFolder,
];

const isFetchedOnDemand = (fileName: string): boolean =>
  foldersFetchedOnDemand.some((folder) => fileName.startsWith(`${folder}/`));

export const buildPrecacheUrls = (
  builtFileNames: readonly string[],
): string[] =>
  builtFileNames
    .filter(
      (fileName) =>
        fileName !== serviceWorkerFileName && !isFetchedOnDemand(fileName),
    )
    .map(buildPrecacheUrl)
    .toSorted();

export const findPrecachedUrl = (
  request: AppRequest,
  precachedApp: PrecachedApp,
): string | undefined => {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== precachedApp.origin) {
    return undefined;
  }
  const pathsToTry =
    request.mode === "navigate"
      ? [url.pathname, `${url.pathname}/`]
      : [url.pathname];
  return pathsToTry.find((path) => precachedApp.precacheUrls.includes(path));
};

export const isOutdatedAppCache = (
  cacheName: string,
  currentCacheName: string,
): boolean =>
  cacheName.startsWith(appCachePrefix) && cacheName !== currentCacheName;

/**
 * Whether a request is for the Piper engine, which the service worker keeps
 * in the voices' cache once it has been fetched, so a voice reads offline.
 */
export const isPiperEngineRequest = (
  request: AppRequest,
  origin: string,
): boolean => {
  const url = new URL(request.url);
  return (
    request.method === "GET" &&
    url.origin === origin &&
    url.pathname.startsWith(`/${piperEngineFolder}/`)
  );
};

/** The Piper engine's built files, which the service worker lets go of once a newer build replaces them. */
export const listPiperEngineUrls = (
  builtFileNames: readonly string[],
): string[] =>
  builtFileNames
    .filter((fileName) => fileName.startsWith(`${piperEngineFolder}/`))
    .map((fileName) => `/${fileName}`)
    .toSorted();

export const isOutdatedPiperEngineUrl = (
  url: string,
  currentEngineUrls: readonly string[],
): boolean => {
  const { pathname } = new URL(url);
  return (
    pathname.startsWith(`/${piperEngineFolder}/`) &&
    !currentEngineUrls.includes(pathname)
  );
};
