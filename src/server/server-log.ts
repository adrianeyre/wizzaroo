import {
  LogController,
  type FastifyLoggerOptions,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

// The server's log is the container log Docker keeps, which no export holds and no deletion reaches (pen-test H14, #282).
// So it holds bare ids and fixed words alone. An error's message, its stack's header and its own fields can hold what was
// being written: Drizzle's `Failed query: … params: …`, Postgres's `Key (email)=(…)`, a JSON parse error's slice of the
// body, a mail server's refusal naming the address. None of them is logged. A request is logged by its method, its path
// with no query string, and its route, and not by the caller's address.

// What a logged error says in place of its message, so that whoever reads the log knows it was left out on purpose.
export const withheldErrorMessage = "withheld from the log";

const sqlStatePattern = /^[0-9A-Z]{5}$/;
const errorCodePattern = /^[\w.-]{1,64}$/;
const stackFramePattern = /^\s+at /;
const deepestLoggedCause = 4;

interface LoggedValidationError {
  instancePath: string;
  keyword: string;
}

export interface LoggedError {
  type: string;
  message: string;
  stack: string;
  code?: string;
  statusCode?: number;
  validationContext?: string;
  validation?: LoggedValidationError[];
  cause?: LoggedError;
}

export interface LoggedRequest {
  method?: string;
  url?: string;
  route?: string;
}

const readField = (value: object, key: string): unknown =>
  Reflect.get(value, key);

const readString = (value: object, key: string): string | undefined => {
  const field = readField(value, key);
  return typeof field === "string" ? field : undefined;
};

// A Postgres error, as node-postgres raises it, carries its SQLSTATE as `code` beside a `severity`.
const readOwnSqlState = (error: object): string | undefined => {
  const code = readString(error, "code");
  return code !== undefined &&
    sqlStatePattern.test(code) &&
    readString(error, "severity") !== undefined
    ? code
    : undefined;
};

export const readSqlState = (error: unknown): string | undefined => {
  let current: unknown = error;
  for (let depth = 0; depth <= deepestLoggedCause; depth += 1) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    const sqlState = readOwnSqlState(current);
    if (sqlState !== undefined) {
      return sqlState;
    }
    current = readField(current, "cause");
  }
  return undefined;
};

// The stack is logged as its frames alone, which name files and functions. Its header is the error's name and message, so it is cut off, and a stack
// that doesn't start with exactly that header, or holds anything but frames after it, isn't logged at all.
const readFrames = (error: Error): string | undefined => {
  const { stack } = error;
  const header =
    error.message === "" ? error.name : `${error.name}: ${error.message}`;
  if (stack?.startsWith(`${header}\n`) !== true) {
    return undefined;
  }
  const frames = stack.slice(header.length + 1);
  return frames
    .split("\n")
    .every((frame) => stackFramePattern.test(frame) && !frame.includes("\r"))
    ? frames
    : undefined;
};

const readValidation = (error: Error): LoggedValidationError[] | undefined => {
  const validation = readField(error, "validation");
  if (!Array.isArray(validation)) {
    return undefined;
  }
  return validation.flatMap((issue: unknown) => {
    if (typeof issue !== "object" || issue === null) {
      return [];
    }
    const instancePath = readString(issue, "instancePath");
    const keyword = readString(issue, "keyword");
    return instancePath === undefined || keyword === undefined
      ? []
      : [{ instancePath, keyword }];
  });
};

const serializeErrorAt = (error: unknown, depth: number): LoggedError => {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: withheldErrorMessage, stack: "" };
  }
  const code = readString(error, "code");
  const statusCode = readField(error, "statusCode");
  const validationContext = readString(error, "validationContext");
  const validation = readValidation(error);
  const frames = readFrames(error);
  const { cause } = error;
  return {
    type: error.constructor.name || "Error",
    message: withheldErrorMessage,
    stack: frames ?? "",
    ...(code !== undefined && errorCodePattern.test(code) ? { code } : {}),
    ...(typeof statusCode === "number" ? { statusCode } : {}),
    ...(validationContext !== undefined &&
    errorCodePattern.test(validationContext)
      ? { validationContext }
      : {}),
    ...(validation === undefined ? {} : { validation }),
    ...(cause !== undefined && depth < deepestLoggedCause
      ? { cause: serializeErrorAt(cause, depth + 1) }
      : {}),
  };
};

export const serializeLoggedError = (error: unknown): LoggedError =>
  serializeErrorAt(error, 0);

// Fastify hands its request to the `req` serializer, and the raw one in a few of its own lines.
export const serializeLoggedRequest = (request: object): LoggedRequest => {
  const method = readString(request, "method");
  const url = readString(request, "url");
  const routeOptions = readField(request, "routeOptions");
  const route =
    typeof routeOptions === "object" && routeOptions !== null
      ? readString(routeOptions, "url")
      : undefined;
  return {
    ...(method === undefined ? {} : { method }),
    ...(url === undefined ? {} : { url: url.split("?", 1).at(0) }),
    ...(route === undefined ? {} : { route }),
  };
};

// Fastify's own lines put an error's message, or the request's URL with its query string, in the line's `msg`, where no
// serializer reaches. These write a fixed message instead, and Fastify's default error handler still sends its reply.
class ServerLogController extends LogController {
  override defaultErrorLog(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    if (this.isLogDisabled(request)) {
      return;
    }
    const sqlState = readSqlState(error);
    const fields = {
      req: request,
      res: reply,
      err: error,
      ...(sqlState === undefined ? {} : { sqlState }),
    };
    if (reply.statusCode >= 500) {
      reply.log.error(fields, "server.request.failed");
    } else {
      reply.log.info(fields, "server.request.refused");
    }
  }

  override routeNotFound(request: FastifyRequest): void {
    if (this.isLogDisabled(request)) {
      return;
    }
    request.log.info({ req: request }, "server.route.not-found");
  }

  override writeHeadError(
    error: Error,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    if (this.isLogDisabled(request)) {
      return;
    }
    reply.log.warn(
      { req: request, res: reply, err: error },
      "server.reply.head-failed",
    );
  }
}

export const buildServerLogging = (
  stream?: FastifyLoggerOptions["stream"],
): { logger: FastifyLoggerOptions; logController: LogController } => ({
  logger: {
    // Spread, so that each line's fields are a plain object as pino's serializer types want.
    serializers: {
      req: (request) => ({ ...serializeLoggedRequest(request) }),
      err: (error) => ({ ...serializeLoggedError(error) }),
    },
    ...(stream === undefined ? {} : { stream }),
  },
  logController: new ServerLogController(),
});
