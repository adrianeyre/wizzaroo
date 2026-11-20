import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";

export class NulByteError extends Error {
  override readonly name = "NulByteError";
  readonly statusCode = 400;

  constructor() {
    super("Text can't hold a NUL byte");
  }
}

const nulByte = "\u0000";

export const holdsNulByte = (value: unknown): boolean => {
  const unread: unknown[] = [value];
  while (unread.length > 0) {
    const next = unread.pop();
    if (typeof next === "string") {
      if (next.includes(nulByte)) {
        return true;
      }
    } else if (Array.isArray(next)) {
      const items: unknown[] = next;
      for (const item of items) {
        unread.push(item);
      }
    } else if (typeof next === "object" && next !== null) {
      for (const [key, entry] of Object.entries(next)) {
        if (key.includes(nulByte)) {
          return true;
        }
        unread.push(entry);
      }
    }
  }
  return false;
};

const refuseNulBytes = (
  { body, query, params }: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void => {
  if (holdsNulByte(body) || holdsNulByte(query) || holdsNulByte(params)) {
    done(new NulByteError());
    return;
  }
  done();
};

/**
 * Postgres can't hold a NUL byte in `text` or `jsonb`, so every request's
 * body, query string and path parameters are read for one before validation
 * and refused with a 400, before any route reads them or opens a query.
 */
export const registerNulByteRefusal = (server: FastifyInstance): void => {
  server.addHook("preValidation", refuseNulBytes);
};
