import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isHeldDate, isHeldDateTime, narrowDateFormats } from "./held-dates.js";

describe("isHeldDate", () => {
  it.each(["0001-01-01", "2026-11-18", "9999-12-31"])("holds %s", (date) => {
    expect(isHeldDate(date)).toBe(true);
  });

  it("doesn't hold the year 0000", () => {
    expect(isHeldDate("0000-01-01")).toBe(false);
  });
});

describe("isHeldDateTime", () => {
  it.each([
    "0001-01-01T00:00:00Z",
    "2026-11-18T09:30:00.123Z",
    "2026-11-18t09:30:00+01:00",
    "2026-11-18 09:30:00-0530",
    "9999-12-31T23:59:59Z",
    "9999-12-31T23:59:59+01:00",
    "2016-12-31T23:59:60Z",
  ])("holds %s", (dateTime) => {
    expect(isHeldDateTime(dateTime)).toBe(true);
  });

  it.each([
    ["the year 0000", "0000-01-01T00:00:00Z"],
    ["year 1 less an offset into year 0", "0001-01-01T00:00:00+01:00"],
    ["year 9999 plus an offset into year 10000", "9999-12-31T23:59:59-23:59"],
  ])("doesn't hold %s", (_label, dateTime) => {
    expect(isHeldDateTime(dateTime)).toBe(false);
  });
});

describe("narrowDateFormats", () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify({ ajv: { onCreate: narrowDateFormats } });
    server.get(
      "/moments",
      {
        schema: {
          querystring: {
            type: "object",
            properties: {
              date: { type: "string", format: "date" },
              dateTime: { type: "string", format: "date-time" },
            },
          },
        },
      },
      (request, reply) => {
        void reply.send(request.query);
      },
    );
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it.each([
    ["a date in the year 0000", "date=0000-01-01"],
    ["a date that doesn't exist", "date=2026-02-30"],
    ["a moment in the year 0000", "dateTime=0000-01-01T00:00:00Z"],
    [
      "a moment an offset carries into the year 10000",
      `dateTime=${encodeURIComponent("9999-12-31T23:59:59-23:59")}`,
    ],
    ["a moment with no offset", "dateTime=2026-11-18T09:30:00"],
  ])("refuses %s with a 400", async (_label, query) => {
    const response = await server.inject({
      method: "GET",
      url: `/moments?${query}`,
    });

    expect(response.statusCode).toBe(400);
  });

  it("takes a date and a moment Postgres can hold", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/moments?date=2026-11-18&dateTime=2026-11-18T09%3A30%3A00Z",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      date: "2026-11-18",
      dateTime: "2026-11-18T09:30:00Z",
    });
  });
});
