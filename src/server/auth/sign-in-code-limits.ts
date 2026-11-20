// The figures are the per-account row of the request-rate policy in docs/product-requirements-document/pen-testing.md:
// a one-hour sliding window, five a minute at most, and pending sign-ins keyed on the adult (#256).
// Wrong codes keep the five the code step has always allowed, now counted against the adult, not each pending sign-in.
const windowMilliseconds = 3_600_000;
const burstMilliseconds = 60_000;
export const mostWrongCodesAWindow = 5;
export const codePauseMilliseconds = windowMilliseconds;
export const mostPendingSignInsAWindow = 10;
export const mostPendingSignInsABurst = 5;

const keepWithin = (
  moments: readonly Date[],
  now: Date,
  milliseconds: number,
): Date[] =>
  moments.filter((moment) => moment.getTime() > now.getTime() - milliseconds);

export const isCodePaused = (
  codePauseEndsAt: Date | null,
  now: Date,
): boolean => codePauseEndsAt !== null && codePauseEndsAt > now;

interface WrongCodeOutcome {
  wrongCodesAt: Date[];
  codePauseEndsAt: Date | null;
}

/** Counts one more wrong code against the adult; the one that reaches the limit pauses codes and starts the count again. */
export const recordWrongCode = (
  wrongCodesAt: readonly Date[],
  now: Date,
): WrongCodeOutcome => {
  const recentWrongCodesAt = [
    ...keepWithin(wrongCodesAt, now, windowMilliseconds),
    now,
  ];
  return recentWrongCodesAt.length >= mostWrongCodesAWindow
    ? {
        wrongCodesAt: [],
        codePauseEndsAt: new Date(now.getTime() + codePauseMilliseconds),
      }
    : { wrongCodesAt: recentWrongCodesAt, codePauseEndsAt: null };
};

/** The adult's pending sign-in starts with this one added, or undefined when one more would pass a limit. */
export const recordPendingSignInStart = (
  pendingSignInsStartedAt: readonly Date[],
  now: Date,
): Date[] | undefined => {
  const recentStarts = keepWithin(
    pendingSignInsStartedAt,
    now,
    windowMilliseconds,
  );
  const isPastALimit =
    recentStarts.length >= mostPendingSignInsAWindow ||
    keepWithin(recentStarts, now, burstMilliseconds).length >=
      mostPendingSignInsABurst;
  return isPastALimit ? undefined : [...recentStarts, now];
};
