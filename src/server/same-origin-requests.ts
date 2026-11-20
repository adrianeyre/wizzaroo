import type { FastifyInstance, FastifyRequest } from "fastify";

/** One answer whichever header gave the request away, naming neither (#247). */
export class OtherPageRequestError extends Error {
  override readonly name = "OtherPageRequestError";
  readonly statusCode = 403;

  constructor() {
    super("Wizzaroo answers only its own pages");
  }
}

// A browser sends "none" for what the adult typed or bookmarked, and "same-origin" for Wizzaroo's own pages.
const ownFetchSites = new Set(["same-origin", "none"]);
// A browser sends Origin on these too, from its own pages, but they change nothing, so only Sec-Fetch-Site decides.
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

type CheckedRequest = Pick<FastifyRequest, "method" | "url" | "headers"> & {
  routeOptions: Pick<FastifyRequest["routeOptions"], "url">;
};

const isApiRequest = ({ url, routeOptions }: CheckedRequest): boolean =>
  url.startsWith("/api/") || (routeOptions.url ?? "").startsWith("/api/");

/**
 * Why a request under /api/ isn't one Wizzaroo's own pages sent, or undefined when it may be. `SameSite=Strict` lets
 * every other host of the same site send the sign-in cookie, so the browser's own word on where a request came from
 * decides. A request with neither header, as curl, the pen-test harness and the tests send, is let through.
 */
export const findOtherPageRefusal = (
  request: CheckedRequest,
  ownOrigin: string,
): OtherPageRequestError | undefined => {
  if (!isApiRequest(request)) {
    return undefined;
  }
  const fetchSite = request.headers["sec-fetch-site"];
  if (fetchSite !== undefined && !ownFetchSites.has(fetchSite)) {
    return new OtherPageRequestError();
  }
  const { origin } = request.headers;
  if (
    origin !== undefined &&
    !safeMethods.has(request.method) &&
    origin !== ownOrigin
  ) {
    return new OtherPageRequestError();
  }
  return undefined;
};

/**
 * Refuses another page's request before anything else runs: before the route's reach check and before its body is
 * read, so nothing changes and nothing reaches the Admin access log.
 */
export const refuseOtherPageRequests = (
  server: FastifyInstance,
  publicUrl: URL,
): void => {
  const ownOrigin = publicUrl.origin;
  server.addHook("onRequest", (request, _reply, done) => {
    const refusal = findOtherPageRefusal(request, ownOrigin);
    if (refusal === undefined) {
      done();
      return;
    }
    request.log.warn(
      {
        origin: request.headers.origin,
        fetchSite: request.headers["sec-fetch-site"],
      },
      "server.other-page-request-refused",
    );
    done(refusal);
  });
};
