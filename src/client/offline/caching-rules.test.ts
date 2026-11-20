import { describe, expect, it } from "vitest";
import {
  buildAppCacheName,
  buildPrecacheUrls,
  findPrecachedUrl,
  isOutdatedAppCache,
  isOutdatedPiperEngineUrl,
  isPiperEngineRequest,
  listPiperEngineUrls,
  type AppRequest,
} from "./caching-rules.js";

const origin = "https://wizzaroo.adrianeyre.co.uk";

const precachedApp = {
  origin,
  precacheUrls: [
    "/",
    "/assets/game-Bk3x9a.js",
    "/manifest.webmanifest",
    "/parent/",
  ],
};

const buildRequest = (overrides: Partial<AppRequest>): AppRequest => ({
  url: `${origin}/`,
  method: "GET",
  mode: "no-cors",
  ...overrides,
});

describe("buildPrecacheUrls", () => {
  it("caches each page under the address it is opened at, and every other built file under its own", () => {
    const urls = buildPrecacheUrls([
      "index.html",
      "parent/index.html",
      "assets/game-Bk3x9a.js",
      "assets/bubbles.pop-the-bond.fea67e2cc614-Cq1.wav",
      "manifest.webmanifest",
    ]);

    expect(urls).toEqual([
      "/",
      "/assets/bubbles.pop-the-bond.fea67e2cc614-Cq1.wav",
      "/assets/game-Bk3x9a.js",
      "/manifest.webmanifest",
      "/parent/",
    ]);
  });

  it("only treats a file named exactly index.html as a page", () => {
    expect(buildPrecacheUrls(["assets/not-index.html"])).toEqual([
      "/assets/not-index.html",
    ]);
  });

  it("never caches the service worker itself, so the browser can always find a new version", () => {
    expect(buildPrecacheUrls(["index.html", "service-worker.js"])).toEqual([
      "/",
    ]);
  });

  it("leaves the Spelling paper's spoken words out, since they are fetched the first time the paper is played", () => {
    expect(
      buildPrecacheUrls([
        "index.html",
        "check-voice-over/spelling-check.accommodate.0123456789ab.wav",
      ]),
    ).toEqual(["/"]);
  });

  it("leaves the home page's pictures out, since only a signed-out browser that is online sees them", () => {
    expect(
      buildPrecacheUrls(["index.html", "home/world-map-meadow-isle.webp"]),
    ).toEqual(["/"]);
  });
});

describe("findPrecachedUrl", () => {
  it("answers a built file from the cache", () => {
    const request = buildRequest({ url: `${origin}/assets/game-Bk3x9a.js` });

    expect(findPrecachedUrl(request, precachedApp)).toBe(
      "/assets/game-Bk3x9a.js",
    );
  });

  it("opens the game and the Parent page from the cache, whatever query they are opened with", () => {
    const game = buildRequest({
      url: `${origin}/?from=home-screen`,
      mode: "navigate",
    });
    const parent = buildRequest({ url: `${origin}/parent/`, mode: "navigate" });

    expect(findPrecachedUrl(game, precachedApp)).toBe("/");
    expect(findPrecachedUrl(parent, precachedApp)).toBe("/parent/");
  });

  it("opens the Parent page from the cache when its address is typed without the closing slash", () => {
    const request = buildRequest({ url: `${origin}/parent`, mode: "navigate" });

    expect(findPrecachedUrl(request, precachedApp)).toBe("/parent/");
  });

  it("only adds the closing slash for a page being opened, not for a file being fetched", () => {
    const request = buildRequest({ url: `${origin}/parent` });

    expect(findPrecachedUrl(request, precachedApp)).toBeUndefined();
  });

  it.each([
    { what: "the Family", url: `${origin}/api/family`, mode: "cors" },
    { what: "the sign-in", url: `${origin}/api/sign-in`, mode: "cors" },
    { what: "the health check", url: `${origin}/health`, mode: "navigate" },
  ] as const)(
    "always asks the server for $what, never the cache",
    ({ url, mode }) => {
      expect(
        findPrecachedUrl(buildRequest({ url, mode }), precachedApp),
      ).toBeUndefined();
    },
  );

  it("never answers a request that changes something from the cache", () => {
    const request = buildRequest({ url: `${origin}/`, method: "POST" });

    expect(findPrecachedUrl(request, precachedApp)).toBeUndefined();
  });

  it("leaves requests to other sites alone, even for a path that is cached", () => {
    const request = buildRequest({
      url: "https://elsewhere.example/assets/game-Bk3x9a.js",
    });

    expect(findPrecachedUrl(request, precachedApp)).toBeUndefined();
  });
});

describe("isOutdatedAppCache", () => {
  const currentCacheName = buildAppCacheName("5d41402abc4b");

  it("drops the app cache of an earlier version", () => {
    expect(
      isOutdatedAppCache(buildAppCacheName("0cc175b9c0f1"), currentCacheName),
    ).toBe(true);
  });

  it("keeps the current version's app cache", () => {
    expect(isOutdatedAppCache(currentCacheName, currentCacheName)).toBe(false);
  });

  it("keeps caches the app cache doesn't own, such as the voice-over's", () => {
    expect(isOutdatedAppCache("wizzaroo-voice-over", currentCacheName)).toBe(
      false,
    );
  });
});

describe("the Piper engine (ADR 0062)", () => {
  const built = [
    "index.html",
    "assets/game-Bk3x9a.js",
    "piper/piper-worker-Ab12.js",
    "piper/ort-wasm-simd-threaded-Cd34.wasm",
  ];

  it("is left out of the offline download, and fetched with the first voice used", () => {
    expect(buildPrecacheUrls(built)).toEqual(["/", "/assets/game-Bk3x9a.js"]);
    expect(listPiperEngineUrls(built)).toEqual([
      "/piper/ort-wasm-simd-threaded-Cd34.wasm",
      "/piper/piper-worker-Ab12.js",
    ]);
  });

  it("is kept by the service worker once fetched, from this origin only", () => {
    expect(
      isPiperEngineRequest(
        buildRequest({ url: `${origin}/piper/piper-worker-Ab12.js` }),
        origin,
      ),
    ).toBe(true);
    expect(
      isPiperEngineRequest(
        buildRequest({ url: "https://elsewhere.example/piper/x.js" }),
        origin,
      ),
    ).toBe(false);
    expect(
      isPiperEngineRequest(
        buildRequest({ url: `${origin}/piper/x.js`, method: "POST" }),
        origin,
      ),
    ).toBe(false);
  });

  it("lets go of an engine a newer build replaced, but never of a voice", () => {
    const current = listPiperEngineUrls(built);
    expect(
      isOutdatedPiperEngineUrl(`${origin}/piper/piper-worker-Old1.js`, current),
    ).toBe(true);
    expect(
      isOutdatedPiperEngineUrl(`${origin}/piper/piper-worker-Ab12.js`, current),
    ).toBe(false);
    expect(
      isOutdatedPiperEngineUrl(`${origin}/voices/abc/john.onnx`, current),
    ).toBe(false);
  });
});
