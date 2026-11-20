import { describe, expect, it } from "vitest";
import { buildOwnerSeed, type OwnerAnswers } from "./owner-seed.js";

const answers: OwnerAnswers = {
  email: "  Owner@Example.COM ",
  password: "a long enough password",
  repeatedPassword: "a long enough password",
  familyName: "  The Eyres ",
};

describe("buildOwnerSeed", () => {
  it("keeps the email address in lower case and the Family's name without the spaces around it", () => {
    expect(buildOwnerSeed(answers)).toEqual({
      email: "owner@example.com",
      password: "a long enough password",
      familyName: "The Eyres",
    });
  });

  it("keeps the password exactly as typed, spaces and all", () => {
    const password = " a password with spaces ";

    expect(
      buildOwnerSeed({ ...answers, password, repeatedPassword: password })
        .password,
    ).toBe(password);
  });

  it.each(["owner", "owner@", "@example.com", "owner@example", "own er@x.com"])(
    'refuses "%s" as the email address',
    (email) => {
      expect(() => buildOwnerSeed({ ...answers, email })).toThrow(
        "isn't an email address, so nothing was created",
      );
    },
  );

  it("refuses a password shorter than 12 characters", () => {
    expect(() =>
      buildOwnerSeed({
        ...answers,
        password: "elevenchars",
        repeatedPassword: "elevenchars",
      }),
    ).toThrow("The password needs at least 12 characters");
  });

  it("refuses two passwords that don't match", () => {
    expect(() =>
      buildOwnerSeed({
        ...answers,
        repeatedPassword: "a long enough passwerd",
      }),
    ).toThrow("The two passwords don't match");
  });

  it("refuses a Family with no name", () => {
    expect(() => buildOwnerSeed({ ...answers, familyName: "   " })).toThrow(
      "The Family needs a name",
    );
  });
});
