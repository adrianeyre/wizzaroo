import { DrizzleQueryError } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildServerLogging,
  readSqlState,
  serializeLoggedError,
  serializeLoggedRequest,
  withheldErrorMessage,
} from "./server-log.js";

const childId = "e2000000-0000-4000-8000-c10000000001";
const nickname = "Ada\u0000";
const birthYear = 2018;
const email = "parent.a1@wizzaroo.example";

// node-postgres raises a refusal as an Error carrying its SQLSTATE as `code`, beside a `severity` and a `detail`.
const buildPostgresError = (code: string, detail: string): Error =>
  Object.assign(new Error(`invalid byte sequence: ${detail}`), {
    code,
    severity: "ERROR",
    detail,
  });

const buildFailedRename = (): DrizzleQueryError =>
  new DrizzleQueryError(
    'update "children" set "nickname" = $1, "birth_year" = $2 where "children"."id" = $3',
    [nickname, birthYear, childId],
    buildPostgresError("22021", `Key (nickname)=(${nickname})`),
  );

describe("serializeLoggedError", () => {
  it("logs a failing query by its type and SQLSTATE, with no SQL, parameters, message or detail", () => {
    const logged = serializeLoggedError(buildFailedRename());
    const text = JSON.stringify(logged);

    expect(logged).toMatchObject({
      type: "DrizzleQueryError",
      message: withheldErrorMessage,
      cause: { type: "Error", code: "22021", message: withheldErrorMessage },
    });
    for (const needle of [
      "Ada",
      String(birthYear),
      childId,
      "Failed query",
      "params",
      "children",
      "Key (",
    ]) {
      expect(text).not.toContain(needle);
    }
  });

  it("keeps the stack's frames and cuts off its header, which holds the message", () => {
    const logged = serializeLoggedError(buildFailedRename());

    expect(logged.stack).not.toBe("");
    for (const frame of logged.stack.split("\n")) {
      expect(frame).toMatch(/^\s+at /);
    }
  });

  it("cuts off a header of many lines whole, and leaves out a stack that doesn't start with the error's own header, or holds more than frames", () => {
    const multiLine = new Error(`first line\n${email}\n    at ${email}`);
    const rewritten = new Error("a message");
    rewritten.stack = `Something else: ${email}\n    at somewhere (file.js:1:1)`;
    const injected = new Error("short");
    injected.stack = `Error: short\n    at somewhere (file.js:1:1)\n${email}`;

    expect(serializeLoggedError(multiLine).stack).not.toBe("");
    expect(JSON.stringify(serializeLoggedError(multiLine))).not.toContain(
      email,
    );
    for (const error of [rewritten, injected]) {
      expect(serializeLoggedError(error).stack).toBe("");
      expect(JSON.stringify(serializeLoggedError(error))).not.toContain(email);
    }
  });

  it("keeps a validation error's paths and keywords, and nothing that was sent", () => {
    const refused = Object.assign(new Error(`body/email ${email}`), {
      code: "FST_ERR_VALIDATION",
      statusCode: 400,
      validationContext: "body",
      validation: [
        {
          instancePath: "/email",
          keyword: "format",
          params: { format: "email" },
          message: 'must match format "email"',
          data: email,
        },
      ],
    });

    const { stack, ...logged } = serializeLoggedError(refused);

    expect(stack).not.toContain(email);
    expect(logged).toEqual({
      type: "Error",
      message: withheldErrorMessage,
      code: "FST_ERR_VALIDATION",
      statusCode: 400,
      validationContext: "body",
      validation: [{ instancePath: "/email", keyword: "format" }],
    });
  });

  it("leaves out a code that isn't a bare identifier, and logs what isn't an Error by its type alone", () => {
    const coded = Object.assign(new Error("refused"), { code: email });

    expect(serializeLoggedError(coded)).not.toHaveProperty("code");
    expect(serializeLoggedError(email)).toEqual({
      type: "string",
      message: withheldErrorMessage,
      stack: "",
    });
  });
});

describe("readSqlState", () => {
  it("finds a Postgres refusal's SQLSTATE in the error or its causes", () => {
    expect(readSqlState(buildFailedRename())).toBe("22021");
    expect(readSqlState(buildPostgresError("23505", "unique"))).toBe("23505");
  });

  it("finds none in an error that isn't Postgres's, even with a five-letter code", () => {
    const refusedConnection = Object.assign(new Error("connect"), {
      code: "ECONNREFUSED",
    });
    const mailRefusal = Object.assign(new Error(email), { code: "EAUTH" });

    expect(readSqlState(refusedConnection)).toBeUndefined();
    expect(readSqlState(mailRefusal)).toBeUndefined();
    expect(readSqlState(undefined)).toBeUndefined();
  });
});

describe("serializeLoggedRequest", () => {
  it("logs the method, the path with no query string, and the route, and not the caller's address", () => {
    expect(
      serializeLoggedRequest({
        method: "PUT",
        url: `/api/children/${childId}?email=${email}`,
        ip: "198.51.100.23",
        host: "wizzaroo.example",
        routeOptions: { url: "/api/children/:childId" },
      }),
    ).toEqual({
      method: "PUT",
      url: `/api/children/${childId}`,
      route: "/api/children/:childId",
    });
  });
});

describe("buildServerLogging", () => {
  let server: FastifyInstance | undefined;
  const logLines: string[] = [];

  const buildServer = async (): Promise<FastifyInstance> => {
    logLines.length = 0;
    const built = Fastify(
      buildServerLogging({
        write: (line: string) => {
          logLines.push(line);
        },
      }),
    );
    built.put("/api/children/:childId", () => {
      throw buildFailedRename();
    });
    built.post("/api/sign-in", () => ({ isSignedIn: true }));
    await built.ready();
    server = built;
    return built;
  };

  const readLogLines = (): Record<string, unknown>[] =>
    logLines.map((line): Record<string, unknown> => {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error(`a log line isn't an object: ${line}`);
      }
      return Object.fromEntries(Object.entries(parsed));
    });

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  it("logs a 500 from a failing query by its SQLSTATE and route, with none of what was being written", async () => {
    const built = await buildServer();

    const response = await built.inject({
      method: "PUT",
      url: `/api/children/${childId}?nickname=Ada`,
      payload: { nickname, birthYear },
    });
    const failed = readLogLines().filter(
      ({ msg }) => msg === "server.request.failed",
    );

    expect(response.statusCode).toBe(500);
    expect(failed).toHaveLength(1);
    expect(failed.at(0)).toMatchObject({
      level: 50,
      sqlState: "22021",
      req: {
        method: "PUT",
        url: `/api/children/${childId}`,
        route: "/api/children/:childId",
      },
      res: { statusCode: 500 },
      err: { type: "DrizzleQueryError", message: withheldErrorMessage },
    });
    const logText = logLines.join("");
    for (const needle of ["Ada", "Failed query", "params", 'children\\"']) {
      expect(logText).not.toContain(needle);
    }
  });

  it("logs a refused body by the refusal alone, not the slice of the body a parse error quotes", async () => {
    const built = await buildServer();

    const response = await built.inject({
      method: "POST",
      url: "/api/sign-in",
      headers: { "content-type": "application/json" },
      payload: `{"email":"${email}","password":"a guess`,
    });
    const refused = readLogLines().filter(
      ({ msg }) => msg === "server.request.refused",
    );

    expect(response.statusCode).toBe(400);
    expect(refused).toHaveLength(1);
    expect(refused.at(0)).toMatchObject({
      level: 30,
      res: { statusCode: 400 },
      err: { message: withheldErrorMessage, statusCode: 400 },
    });
    expect(logLines.join("")).not.toContain(email);
    expect(logLines.join("")).not.toContain("a guess");
  });

  it("logs a route that isn't found with no query string, and a request with no caller's address", async () => {
    const built = await buildServer();

    const response = await built.inject({
      method: "GET",
      url: `/api/nowhere?email=${email}`,
      remoteAddress: "198.51.100.23",
    });

    expect(response.statusCode).toBe(404);
    expect(readLogLines().map(({ msg }) => msg)).toContain(
      "server.route.not-found",
    );
    expect(logLines.join("")).not.toContain(email);
    expect(logLines.join("")).not.toContain("198.51.100.23");
  });
});
