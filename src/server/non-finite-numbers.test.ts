import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  holdsNonFiniteNumber,
  NonFiniteNumberError,
  registerNonFiniteNumberRefusal,
} from "./non-finite-numbers.js";

describe("holdsNonFiniteNumber", () => {
  it.each([
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
    ["NaN", Number.NaN],
    ["an array's number", [1, Infinity]],
    ["a nested object's number", { payload: { secondsSpent: Infinity } }],
  ])("finds %s", (_label, value) => {
    expect(holdsNonFiniteNumber(value)).toBe(true);
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a number", 1000],
    ["the text Infinity", "Infinity"],
    ["an object of finite numbers", { stars: 16, coins: [0, -1, 1e3] }],
  ])("finds none in %s", (_label, value) => {
    expect(holdsNonFiniteNumber(value)).toBe(false);
  });
});

describe("registerNonFiniteNumberRefusal", () => {
  let server: FastifyInstance;
  let handled = 0;

  beforeAll(async () => {
    server = Fastify();
    registerNonFiniteNumberRefusal(server);
    server.post(
      "/awards/:count",
      {
        schema: {
          params: {
            type: "object",
            properties: { count: { type: "integer", minimum: 1 } },
          },
          querystring: {
            type: "object",
            properties: { page: { type: "integer", minimum: 1 } },
          },
          body: {
            type: "object",
            required: ["stars"],
            properties: {
              stars: { type: "integer", minimum: 1, maximum: 1000 },
              payload: {
                type: "object",
                properties: { secondsSpent: { type: "integer", minimum: 0 } },
              },
            },
          },
        },
      },
      (request, reply) => {
        handled += 1;
        void reply.send({ body: request.body, query: request.query });
      },
    );
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it.each([
    ["the body, as text", "/awards/1", '{"stars":"Infinity"}'],
    ["the body, as minus Infinity", "/awards/1", '{"stars":"-Infinity"}'],
    ["the body, as text too big to hold", "/awards/1", '{"stars":"1e400"}'],
    [
      "a nested payload",
      "/awards/1",
      '{"stars":1,"payload":{"secondsSpent":"Infinity"}}',
    ],
    ["the query string", "/awards/1?page=Infinity", '{"stars":1}'],
    ["a path parameter", "/awards/Infinity", '{"stars":1}'],
  ])(
    "refuses a number that isn't finite in %s with a 400 before the route runs",
    async (_label, url, payload) => {
      const before = handled;
      const response = await server.inject({
        method: "POST",
        url,
        headers: { "content-type": "application/json" },
        payload,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: new NonFiniteNumberError().message,
      });
      expect(handled).toBe(before);
    },
  );

  it("refuses a JSON number too big to hold, which Ajv's own integer check catches", async () => {
    const before = handled;
    const response = await server.inject({
      method: "POST",
      url: "/awards/1",
      headers: { "content-type": "application/json" },
      payload: '{"stars":1,"payload":{"secondsSpent":1e400}}',
    });

    expect(response.statusCode).toBe(400);
    expect(handled).toBe(before);
  });

  it("still turns ordinary numbers written as text into numbers", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/awards/2?page=0x10",
      headers: { "content-type": "application/json" },
      payload: '{"stars":"1e3"}',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      body: { stars: 1000 },
      query: { page: 16 },
    });
  });
});
