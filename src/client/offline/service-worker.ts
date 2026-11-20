import {
  buildAppCacheName,
  findPrecachedUrl,
  isOutdatedAppCache,
  isOutdatedPiperEngineUrl,
  isPiperEngineRequest,
  piperVoiceCacheName,
  skipWaitingMessage,
} from "./caching-rules.js";

declare const self: ServiceWorkerGlobalScope;
declare const builtAppVersion: string;
declare const builtPrecacheUrls: string[];
declare const builtPiperEngineUrls: string[];

const appCacheName = buildAppCacheName(builtAppVersion);
const precachedApp = {
  origin: self.location.origin,
  precacheUrls: builtPrecacheUrls,
};

const precacheApp = async (): Promise<void> => {
  const cache = await caches.open(appCacheName);
  const freshRequests = precachedApp.precacheUrls.map(
    (url) => new Request(url, { cache: "reload" }),
  );
  await cache.addAll(freshRequests);
};

const deleteOutdatedAppCaches = async (): Promise<void> => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => isOutdatedAppCache(cacheName, appCacheName))
      .map((cacheName) => caches.delete(cacheName)),
  );
};

const respondFromAppCache = async (
  request: Request,
  precachedUrl: string,
): Promise<Response> => {
  const cache = await caches.open(appCacheName);
  return (await cache.match(precachedUrl)) ?? fetch(request);
};

/** The Piper engine: from the voices' cache, or fetched once and kept there (ADR 0062). */
const respondWithPiperEngine = async (request: Request): Promise<Response> => {
  const cache = await caches.open(piperVoiceCacheName);
  const cached = await cache.match(request);
  if (cached !== undefined) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApp());
});

/** Lets go of a Piper engine an older build fetched; the voices themselves stay. */
const deleteOutdatedPiperEngine = async (): Promise<void> => {
  const cache = await caches.open(piperVoiceCacheName);
  const requests = await cache.keys();
  await Promise.all(
    requests
      .filter(({ url }) => isOutdatedPiperEngineUrl(url, builtPiperEngineUrls))
      .map((request) => cache.delete(request)),
  );
};

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([deleteOutdatedAppCaches(), deleteOutdatedPiperEngine()]),
  );
});

self.addEventListener("fetch", (event) => {
  const precachedUrl = findPrecachedUrl(event.request, precachedApp);
  if (precachedUrl !== undefined) {
    event.respondWith(respondFromAppCache(event.request, precachedUrl));
  } else if (isPiperEngineRequest(event.request, precachedApp.origin)) {
    event.respondWith(respondWithPiperEngine(event.request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data === skipWaitingMessage) {
    event.waitUntil(self.skipWaiting());
  }
});
