import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  findOtherPageRefusal,
  OtherPageRequestError,
  refuseOtherPageRequests,
} from "./same-origin-requests.js";

const ownOrigin = "https://wizzaroo.example";
const siblingOrigin = "https://blog.wizzaroo.example";

const buildRequest = (
  method: string,
  headers: Record<string, string>,
  url = "/api/people/1/deactivation",
) => ({ method, url, headers, routeOptions: { url: undefined } });

describe("findOtherPageRefusal", () => {
  it.each(["same-site", "cross-site"])(
    "refuses a request whose Sec-Fetch-Site is %s, whatever its method",
    (fetchSite) => {
      for (const method of ["GET", "POST"]) {
        expect(
          findOtherPageRefusal(
            buildRequest(method, { "sec-fetch-site": fetchSite }),
            ownOrigin,
          ),
        ).toEqual(new OtherPageRequestError());
      }
    },
  );

  it.each(["same-origin", "none"])(
    "lets through a request whose Sec-Fetch-Site is %s",
    (fetchSite) => {
      expect(
        findOtherPageRefusal(
          buildRequest("POST", {
            "sec-fetch-site": fetchSite,
            origin: ownOrigin,
          }),
          ownOrigin,
        ),
      ).toBeUndefined();
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "refuses a %s from another origin, or from an opaque one, when no Sec-Fetch-Site is sent",
    (method) => {
      for (const origin of [siblingOrigin, "null", `${ownOrigin}.evil`]) {
        expect(
          findOtherPageRefusal(buildRequest(method, { origin }), ownOrigin),
        ).toEqual(new OtherPageRequestError());
      }
    },
  );

  it("lets through a GET, HEAD or OPTIONS carrying another Origin, since only Sec-Fetch-Site decides for those", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        findOtherPageRefusal(
          buildRequest(method, { origin: siblingOrigin }),
          ownOrigin,
        ),
      ).toBeUndefined();
    }
  });

  it("lets through a request with neither header, as curl and the pen-test harness send", () => {
    expect(
      findOtherPageRefusal(buildRequest("POST", {}), ownOrigin),
    ).toBeUndefined();
  });

  it("leaves requests outside /api/ alone", () => {
    expect(
      findOtherPageRefusal(
        buildRequest(
          "GET",
          { "sec-fetch-site": "cross-site" },
          "/parent/index.html",
        ),
        ownOrigin,
      ),
    ).toBeUndefined();
  });

  it("refuses by the matched route too, however the URL was written", () => {
    expect(
      findOtherPageRefusal(
        {
          method: "POST",
          url: "/%61pi/sign-out",
          headers: { origin: siblingOrigin },
          routeOptions: { url: "/api/sign-out" },
        },
        ownOrigin,
      ),
    ).toEqual(new OtherPageRequestError());
  });
});

describe("refuseOtherPageRequests", () => {
  let server: FastifyInstance;
  let handled = 0;

  beforeAll(async () => {
    server = Fastify();
    refuseOtherPageRequests(server, new URL(ownOrigin));
    server.post(
      "/api/things",
      {
        onRequest: (_request, _reply, done) => {
          handled += 1;
          done();
        },
      },
      () => {
        handled += 1;
        return { done: true };
      },
    );
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("answers another page's request 403 before the route's own onRequest hook or handler runs", async () => {
    const before = handled;

    const response = await server.inject({
      method: "POST",
      url: "/api/things",
      headers: {
        origin: siblingOrigin,
        "sec-fetch-site": "same-site",
        "content-type": "text/plain",
      },
      payload: "",
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      message: "Wizzaroo answers only its own pages",
    });
    expect(handled).toBe(before);
  });

  it("serves Wizzaroo's own page's request", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/things",
      headers: { origin: ownOrigin, "sec-fetch-site": "same-origin" },
    });

    expect(response.statusCode).toBe(200);
  });
});
