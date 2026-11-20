import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildPlaySummariesQuery,
  largestTimeSpentSeconds,
  longestCountedSessionSeconds,
} from "./child-progress.js";

const unreachableDatabaseUrl = "postgres://wizzaroo@127.0.0.1:1/wizzaroo";

describe("the time spent a Child's progress shows", () => {
  const database = drizzle({
    connection: { connectionString: unreachableDatabaseUrl },
  });

  afterAll(async () => {
    await database.$client.end();
  });

  it("counts each Session for no more than a day, sums them as numeric, and caps the sum before casting it to the answer's integer (#325)", () => {
    const { sql, params } = buildPlaySummariesQuery(database, [
      "a Child's id",
    ]).toSQL();

    expect(sql).toMatch(
      /least\(greatest\(extract\(epoch from "ended_at" - "started_at"\)::numeric, 0\), \$\d+::numeric\)/,
    );
    expect(sql).toMatch(
      /least\(coalesce\(floor\(sum\(least\(.*\)\)\), 0\), \$\d+::numeric\)::integer/,
    );
    expect(sql).not.toMatch(/sum\([^)]*::integer/);
    expect(params).toEqual(
      expect.arrayContaining([
        longestCountedSessionSeconds,
        largestTimeSpentSeconds,
        "a Child's id",
      ]),
    );
  });

  it("caps a Session at a day and the sum at the largest integer Postgres holds", () => {
    expect(longestCountedSessionSeconds).toBe(86_400);
    expect(largestTimeSpentSeconds).toBe(2 ** 31 - 1);
  });
});
