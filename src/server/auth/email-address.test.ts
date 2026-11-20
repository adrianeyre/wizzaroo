import { describe, expect, it } from "vitest";
import {
  isEmailAddress,
  longestEmailAddressLength,
  normaliseEmail,
} from "./email-address.js";

describe("isEmailAddress", () => {
  it.each([
    "parent@example.com",
    "parent.a1+test@pen-test.example",
    "o'brien@school.example.co.uk",
    "Parent@Example.com",
  ])("takes %s", (email) => {
    expect(isEmailAddress(email)).toBe(true);
  });

  it.each([
    ["a NUL byte", "parent-a1\u0000@pen-test.example"],
    ["a NUL byte after the dot", "parent@example.com\u0000"],
    ["another control character", "parent\u0007@example.com"],
    ["a space", "parent a1@example.com"],
    ["no @", "parent.example.com"],
    ["no dot after the @", "parent@example"],
  ])("refuses an address with %s", (_label, email) => {
    expect(isEmailAddress(email)).toBe(false);
  });

  // Each of these Nodemailer delivers to a mailbox other than the address stored (#322).
  it.each([
    ["a comma", "i5-shadow-1,parent-a1@pen-test.example"],
    ["a comma before another mailbox", "x,attacker@evil.example"],
    ["a group's colon and semicolon", "x:attacker@evil.example;"],
    ["angle brackets", "a<attacker@evil.example>"],
    ["a semicolon after the domain", "parent@home.example;attacker.example"],
    ["a semicolon in the local part", "x;attacker@evil.example"],
    ["round brackets", "parent(attacker)@home.example"],
    ["square brackets", "parent@[127.0.0.1]"],
    ["a backslash", "par\\ent@home.example"],
    ["quotes", '"x,y"@home.example'],
    ["a colon in the domain", "parent@home.example:25"],
    ["a tab", "parent\t@home.example"],
    ["a line break", "parent@home.example\nBcc: attacker@evil.example"],
    ["two @", "parent@attacker@evil.example"],
    ["a leading dot", ".parent@home.example"],
    ["two dots in a row", "par..ent@home.example"],
    ["a trailing dot in the local part", "parent.@home.example"],
    ["an empty domain label", "parent@home..example"],
    ["an underscore in the domain", "parent@home_page.example"],
    ["a hyphen ending a domain label", "parent@home-.example"],
    ["a letter outside ASCII", "pärent@home.example"],
    ["a right-to-left override", "parent\u202E@home.example"],
  ])("refuses an address with %s", (_label, email) => {
    expect(isEmailAddress(email)).toBe(false);
  });

  it("takes an address as long as a mailbox's can be, and refuses one a character longer", () => {
    const buildAddress = (length: number) =>
      `${"a".repeat(length - "@example.com".length)}@example.com`;

    expect(longestEmailAddressLength).toBe(254);
    expect(isEmailAddress(buildAddress(254))).toBe(true);
    expect(isEmailAddress(buildAddress(255))).toBe(false);
  });

  it("refuses a NUL byte that normalising keeps", () => {
    expect(normaliseEmail(" Parent\u0000@Example.com ")).toBe(
      "parent\u0000@example.com",
    );
    expect(isEmailAddress(normaliseEmail(" Parent\u0000@Example.com "))).toBe(
      false,
    );
  });
});
