import { describe, expect, it } from "vitest";
import {
  findSignInLifetime,
  isSignInLive,
  parentSignInLifetime,
  staffSignInLifetime,
} from "./sign-in-lifetimes.js";

const hour = 3_600;
const day = 86_400;

describe("findSignInLifetime", () => {
  it("holds a Parent to 14 days unused and 30 in all", () => {
    expect(findSignInLifetime(["parent"])).toEqual({
      idleSeconds: 14 * day,
      lifetimeSeconds: 30 * day,
    });
  });

  it.each([
    [["admin"]],
    [["teacher"]],
    [["admin", "parent"]],
    [["parent", "teacher"]],
  ] as const)("holds %j to 12 hours unused and 7 days in all", (roles) => {
    expect(findSignInLifetime(roles)).toEqual({
      idleSeconds: 12 * hour,
      lifetimeSeconds: 7 * day,
    });
  });
});

describe("isSignInLive", () => {
  it("keeps a Parent's sign-in used within 14 days, up to 30 days after it was made", () => {
    expect(
      isSignInLive({
        roles: ["parent"],
        ageSeconds: 29 * day,
        idleSeconds: 13 * day,
      }),
    ).toBe(true);
  });

  it("refuses a Parent's sign-in left unused for 14 days", () => {
    expect(
      isSignInLive({
        roles: ["parent"],
        ageSeconds: 14 * day,
        idleSeconds: parentSignInLifetime.idleSeconds,
      }),
    ).toBe(false);
  });

  it("refuses a Parent's sign-in 30 days after it was made, however recently it was used", () => {
    expect(
      isSignInLive({
        roles: ["parent"],
        ageSeconds: parentSignInLifetime.lifetimeSeconds,
        idleSeconds: 0,
      }),
    ).toBe(false);
  });

  it("refuses a Teacher's sign-in left unused for 12 hours, and keeps one used just before", () => {
    expect(
      isSignInLive({
        roles: ["teacher"],
        ageSeconds: day,
        idleSeconds: staffSignInLifetime.idleSeconds,
      }),
    ).toBe(false);
    expect(
      isSignInLive({
        roles: ["teacher"],
        ageSeconds: day,
        idleSeconds: staffSignInLifetime.idleSeconds - 1,
      }),
    ).toBe(true);
  });

  it("refuses the Admin's sign-in 7 days after it was made, however recently it was used", () => {
    expect(
      isSignInLive({
        roles: ["admin", "parent"],
        ageSeconds: staffSignInLifetime.lifetimeSeconds,
        idleSeconds: 0,
      }),
    ).toBe(false);
  });
});
