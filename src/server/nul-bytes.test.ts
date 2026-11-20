import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  holdsNulByte,
  NulByteError,
  registerNulByteRefusal,
} from "./nul-bytes.js";

const nulByte = "\u0000";

describe("holdsNulByte", () => {
  it.each([
    ["a string", `Ada${nulByte}`],
    ["a string that is only a NUL", nulByte],
    ["an array's string", ["Ada", `Ben${nulByte}`]],
    [
      "a nested object's string",
      { payload: { loadout: { hat: `x${nulByte}` } } },
    ],
    ["an object's key", { [`hat${nulByte}`]: "rainbow-scarf" }],
    ["a CSV's cell", `name,email\nD4,d4${nulByte}@example.com\n`],
  ])("finds a NUL byte in %s", (_label, value) => {
    expect(holdsNulByte(value)).toBe(true);
  });

  it.each([
    ["nothing", undefined],
    ["null", null],
    ["a number", 0],
    ["a boolean", false],
    [
      "text with quotes, comments and escapes",
      "'); drop table children; -- \\u0000",
    ],
    ["other control characters", "\u0001\t\n\u007f"],
    [
      "an object and an array of plain text",
      { names: ["Ada", "Ben"], town: "Probeton" },
    ],
  ])("finds none in %s", (_label, value) => {
    expect(holdsNulByte(value)).toBe(false);
  });

  it("reads a body nested far deeper than the call stack without overflowing it", () => {
    const depth = 100_000;
    const nested: unknown = JSON.parse(
      `${"[".repeat(depth)}"\\u0000"${"]".repeat(depth)}`,
    );

    expect(holdsNulByte(nested)).toBe(true);
  });

  it("reads an array longer than a call can take as arguments", () => {
    const long: unknown[] = Array.from({ length: 600_000 }, () => 0);
    long.push("\u0000");

    expect(holdsNulByte(long)).toBe(true);
  });
});

describe("registerNulByteRefusal", () => {
  let server: FastifyInstance;
  let handled = 0;

  beforeAll(async () => {
    server = Fastify();
    registerNulByteRefusal(server);
    server.post(
      "/echo/:word",
      {
        schema: {
          body: {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", pattern: "\\S" } },
          },
        },
      },
      (request, reply) => {
        handled += 1;
        void reply.send(request.body);
      },
    );
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it.each([
    ["the body", "/echo/word", { name: `Ada${nulByte}` }],
    ["a key in the body", "/echo/word", { name: "Ada", [`x${nulByte}`]: 1 }],
    ["the query string", "/echo/word?town=%00", { name: "Ada" }],
    ["a path parameter", "/echo/wo%00rd", { name: "Ada" }],
  ])(
    "refuses a NUL byte in %s with a 400 before the route runs",
    async (_label, url, payload) => {
      const before = handled;
      const response = await server.inject({ method: "POST", url, payload });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        message: new NulByteError().message,
      });
      expect(handled).toBe(before);
    },
  );

  it("refuses a NUL byte before the schema, whatever else is wrong", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/echo/word",
      payload: { name: nulByte, surplus: [nulByte] },
    });

    expect(response.json()).toMatchObject({
      message: new NulByteError().message,
    });
  });

  it("lets a request with no NUL byte through to its schema and route", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/echo/word?town=Probeton",
      payload: { name: "Ada \\u0000" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ name: "Ada \\u0000" });
  });
});
