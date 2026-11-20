import { describe, expect, it } from "vitest";
import { isPlainName, toOneLine } from "./plain-names.js";

describe("isPlainName", () => {
  it.each([
    "Sam",
    "Sam O'Brien-Smith",
    "Zoë Ångström",
    "محمد",
    "Mehr\u200Cnaz", // a zero-width non-joiner, as some scripts need
    "St Mary's C of E Primary",
    "Weston-super-Mare",
    "Dr. J. Smith",
    "Mrs Www",
  ])("takes %s", (name) => {
    expect(isPlainName(name)).toBe(true);
  });

  it.each([
    ["a line feed", "Sam\nHi"],
    ["a carriage return", "Sam\rHi"],
    ["a tab", "Sam\tHi"],
    ["a NUL byte", "Sam\u0000"],
    ["a C1 control", "Sam\u0085Hi"],
    ["a line separator", "Sam Hi"],
    ["a paragraph separator", "Sam Hi"],
    ["an Arabic letter mark", "Sam؜"],
    ["a left-to-right mark", "Sam‎"],
    ["a right-to-left mark", "Sam‏"],
    ["a left-to-right embedding", "Sam‪"],
    ["a right-to-left override", "Sam‮"],
    ["a pop directional formatting", "Sam‬"],
    ["a first-strong isolate", "Sam⁨"],
    ["a pop directional isolate", "Sam⁩"],
    ["a zero-width space", "Sam​Hi"],
    ["a byte order mark", "﻿Sam"],
    ["a soft hyphen", "Sam­Hi"],
    ["an https link", "Sam https://i5-phish.example"],
    ["an http link", "http://i5-phish.example"],
    ["a link in capitals", "HTTPS://I5-PHISH.EXAMPLE"],
    ["another scheme", "Sam ftp://i5-phish.example"],
    ["a web address", "Sam www.i5-phish.example"],
    ["a web address in capitals", "WWW.I5-PHISH.EXAMPLE"],
    ["a web address in full-width letters", "ｗｗｗ．i5-phish.example"],
    ["a web address split by a joiner", "www‍.i5-phish.example"],
    [
      "the form name from #321",
      "Sam,\n\nLog in at https://i5-phish.example now\n\nHi Sam",
    ],
    ["the CSV name from #321", "Sam‮\nLog in at https://i5-phish.example"],
    [
      "the School name from #321",
      "I5 School\n\nPay the trip at https://i5-phish.example",
    ],
  ])("refuses a name with %s", (_label, name) => {
    expect(isPlainName(name)).toBe(false);
  });
});

describe("toOneLine", () => {
  it("leaves a plain name as it is", () => {
    expect(toOneLine("Sam O'Brien")).toBe("Sam O'Brien");
  });

  it("makes every run of line breaks, controls and spaces one space", () => {
    expect(
      toOneLine("Sam,\n\nLog in at https://i5-phish.example now\r\n\t Hi Sam"),
    ).toBe("Sam, Log in at https://i5-phish.example now Hi Sam");
    expect(toOneLine("I5 School  Trip\u0085Day")).toBe("I5 School Trip Day");
  });

  it("drops bidirectional and other format controls, keeping the joiners", () => {
    expect(toOneLine("‮Sam⁦‎​‌‍Lee‬")).toBe("Sam‌‍Lee");
  });

  it("trims what the line starts and ends with", () => {
    expect(toOneLine("\n Sam ‮\n")).toBe("Sam");
  });
});
