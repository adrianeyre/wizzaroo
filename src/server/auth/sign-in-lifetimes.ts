import type { UserRole } from "../schema.js";

// How long a sign-in lasts, recorded in ADR 0049 and reviewed on 31 March 2027 (#244). The figures live only here.
const secondsPerHour = 3_600;
const secondsPerDay = 86_400;

export interface SignInLifetime {
  /** How long a sign-in may sit unused before it is refused. */
  idleSeconds: number;
  /** How long a sign-in lasts from being made, used or not. */
  lifetimeSeconds: number;
}

/** A Parent's sign-in: 14 days unused, 30 days in all. */
export const parentSignInLifetime: SignInLifetime = {
  idleSeconds: 14 * secondsPerDay,
  lifetimeSeconds: 30 * secondsPerDay,
};

/** The Admin's and a Teacher's sign-in, which reach many Families' Children: 12 hours unused, 7 days in all. */
export const staffSignInLifetime: SignInLifetime = {
  idleSeconds: 12 * secondsPerHour,
  lifetimeSeconds: 7 * secondsPerDay,
};

/** Using a sign-in moves its last use on at most this often, so a sign-in isn't written on every request. */
export const lastUsedRefreshSeconds = 60;

/** Any adult whose roles include the Admin or a Teacher is held to the staff figures, whatever else they are. */
export const findSignInLifetime = (
  roles: readonly UserRole[],
): SignInLifetime =>
  roles.includes("admin") || roles.includes("teacher")
    ? staffSignInLifetime
    : parentSignInLifetime;

interface SignInAge {
  roles: readonly UserRole[];
  /** Seconds since the sign-in was made, by the database's clock. */
  ageSeconds: number;
  /** Seconds since the sign-in was last used, by the database's clock. */
  idleSeconds: number;
}

export const isSignInLive = ({
  roles,
  ageSeconds,
  idleSeconds,
}: SignInAge): boolean => {
  const lifetime = findSignInLifetime(roles);
  return (
    ageSeconds < lifetime.lifetimeSeconds && idleSeconds < lifetime.idleSeconds
  );
};
