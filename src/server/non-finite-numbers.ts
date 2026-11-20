import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";

export class NonFiniteNumberError extends Error {
  override readonly name = "NonFiniteNumberError";
  readonly statusCode = 400;

  constructor() {
    super("That number is too big for Wizzaroo");
  }
}

export const holdsNonFiniteNumber = (value: unknown): boolean => {
  const unread: unknown[] = [value];
  while (unread.length > 0) {
    const next = unread.pop();
    if (typeof next === "number") {
      if (!Number.isFinite(next)) {
        return true;
      }
    } else if (Array.isArray(next)) {
      const items: unknown[] = next;
      for (const item of items) {
        unread.push(item);
      }
    } else if (typeof next === "object" && next !== null) {
      for (const entry of Object.values(next)) {
        unread.push(entry);
      }
    }
  }
  return false;
};

const refuseNonFiniteNumbers = (
  { body, query, params }: FastifyRequest,
  _reply: FastifyReply,
  done: HookHandlerDoneFunction,
): void => {
  if (
    holdsNonFiniteNumber(body) ||
    holdsNonFiniteNumber(query) ||
    holdsNonFiniteNumber(params)
  ) {
    done(new NonFiniteNumberError());
    return;
  }
  done();
};

/**
 * Ajv turns `"Infinity"`, `"-Infinity"` and `"1e400"` into numbers that aren't
 * finite, and its generated checks skip `minimum` and `maximum` for them, so
 * they pass every integer field's range (#296). `JSON.parse` makes `1e400`
 * one too. Every request's body, query string and path parameters are read
 * for one once validation has coerced them, and refused with a 400 before
 * the handler runs, so none reaches a query or a `jsonb` column as `null`.
 */
export const registerNonFiniteNumberRefusal = (
  server: FastifyInstance,
): void => {
  server.addHook("preHandler", refuseNonFiniteNumbers);
};
