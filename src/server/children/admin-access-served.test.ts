import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adminAccessServedKinds } from "./admin-access-served.js";

describe("what an Admin access log row says was served", () => {
  it("is a closed set with one value per reply path, none repeated", () => {
    expect(new Set(adminAccessServedKinds).size).toBe(
      adminAccessServedKinds.length,
    );
  });

  it("names a progress read apart from every list and every change", () => {
    const [progressRead, ...everyOther] = adminAccessServedKinds;

    expect(progressRead).toBe("child-progress.opened");
    expect(everyOther).not.toContain(progressRead);
    expect(
      everyOther.every(
        (kind) =>
          kind.endsWith(".listed") ||
          kind.endsWith(".changed") ||
          kind.endsWith(".given"),
      ),
    ).toBe(true);
  });

  it("matches the values the schema gives Postgres's admin_access_served type, in order", () => {
    const schema = readFileSync(
      new URL("../schema.sql", import.meta.url),
      "utf8",
    );
    const values =
      /CREATE TYPE public\.admin_access_served AS ENUM \(([^)]*)\)/u
        .exec(schema)?.[1]
        .split(",")
        .map((value) => value.trim().replace(/^'|'$/gu, ""));

    expect(values).toEqual([...adminAccessServedKinds]);
  });
});
