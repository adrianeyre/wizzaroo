export const lastSignInMethodMessage =
  "That's your last way to sign in, so Wizzaroo kept it. Add a passkey or a password first.";

/** Shown when a Teacher or the Admin signed in with a password tries to add a second factor while they already have one. */
export const secondFactorFirstMessage =
  "You already have a passkey or two-factor authentication. Choose Use your passkey above to confirm it's you, then add another.";

/** Shown when a Teacher or the Admin with no second factor let the days for setting one up from a password pass (#243). */
export const secondFactorSetupClosedMessage =
  "Teachers and the Admin set up a passkey or two-factor authentication within 7 days of getting their login, and those days have passed. Ask the Admin to send you a password reset link, then set one up within 7 days of using it.";

export class ProblemToShowError extends Error {
  override readonly name = "ProblemToShowError";
}

/** The problem to show when Wizzaroo refuses a Teacher or the Admin a new passkey, QR code or two-factor setup. */
export const readSecondFactorRefusal = async (
  response: Response,
): Promise<ProblemToShowError> => {
  const body: unknown = await response.json().catch(() => undefined);
  const isSetupClosed =
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    body.code === "second-factor-setup-closed";
  return new ProblemToShowError(
    isSetupClosed ? secondFactorSetupClosedMessage : secondFactorFirstMessage,
  );
};

export const sendAccountChange = (
  method: "POST" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<Response> =>
  fetch(
    path,
    body === undefined
      ? { method }
      : {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );

export const readTextAnswer = (answers: FormData, name: string): string => {
  const answer = answers.get(name);
  return typeof answer === "string" ? answer : "";
};

export const readProblem = (error: unknown, fallback: string): string =>
  error instanceof ProblemToShowError ? error.message : fallback;
