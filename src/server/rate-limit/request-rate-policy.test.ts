import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadRequestRatePolicy,
  parseRequestRatePolicy,
  RequestRatePolicyUnsetError,
} from "./request-rate-policy.js";

// Made-up figures, so this file carries no copy of the policy pen-testing.md sets.
interface SectionCells {
  setOn: string;
  window: [string, string];
  burst: [string, string];
  routes: [string, string];
  counters: [string, string];
}

const madeUpCells: SectionCells = {
  setOn: "**Set on 2 January 2030.** Made up for this test.",
  window: ["7 minutes, sliding", "2 hours, sliding"],
  burst: ["11 requests in any one minute", "4 requests in any one minute"],
  routes: [
    "60 requests a window, the six routes counted together",
    "9 failed sign-ins, 8 pending sign-ins and 2 reset requests a window",
  ],
  counters: ["per process", "per process"],
};

const buildPrd = (cells: Partial<SectionCells> = {}): string => {
  const { setOn, window, burst, routes, counters } = {
    ...madeUpCells,
    ...cells,
  };
  return [
    "# A PRD",
    "",
    "## Pre-condition: the request-rate policy, before a second School",
    "",
    "This section is the only home of the figures.",
    "",
    setOn,
    "",
    "|  | Per IP | Per account |",
    "| --- | --- | --- |",
    `| Window | ${window[0]} | ${window[1]} |`,
    `| Burst | ${burst[0]} | ${burst[1]} |`,
    `| Sign-in, reset and Invite routes | ${routes[0]} | ${routes[1]} |`,
    `| Per process, or across the deployment | ${counters[0]} | ${counters[1]} |`,
    "",
    "---",
    "",
    "## Another section",
    "",
    "| Window | 1 minute, sliding | 1 minute, sliding |",
  ].join("\n");
};

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;

describe("parseRequestRatePolicy", () => {
  it("reads the per-IP limit, and each per-account count with the account window and burst", () => {
    expect(parseRequestRatePolicy(buildPrd())).toEqual({
      perIpAddress: {
        windowMs: 7 * minuteMs,
        requestsPerWindow: 60,
        burst: 11,
        burstWindowMs: minuteMs,
      },
      perAccount: {
        failedSignIns: {
          windowMs: 2 * hourMs,
          requestsPerWindow: 9,
          burst: 4,
          burstWindowMs: minuteMs,
        },
        pendingSignIns: {
          windowMs: 2 * hourMs,
          requestsPerWindow: 8,
          burst: 4,
          burstWindowMs: minuteMs,
        },
        resetRequests: {
          windowMs: 2 * hourMs,
          requestsPerWindow: 2,
          burst: 4,
          burstWindowMs: minuteMs,
        },
      },
    });
  });

  it("reads a one-hour window in the singular", () => {
    const policy = parseRequestRatePolicy(
      buildPrd({ window: ["1 hour, sliding", "1 minute, sliding"] }),
    );

    expect(policy.perIpAddress.windowMs).toBe(hourMs);
    expect(policy.perAccount.resetRequests.windowMs).toBe(minuteMs);
  });

  it.each([
    {
      case: "a PRD with no request-rate section",
      markdown: "# A PRD\n\n## Something else\n",
    },
    {
      case: "a section with no date it was set",
      markdown: buildPrd({ setOn: "The figures are not set." }),
    },
    {
      case: "a window still to be set",
      markdown: buildPrd({ window: ["not set", "1 hour, sliding"] }),
    },
    {
      case: "a fixed window rather than a sliding one",
      markdown: buildPrd({ window: ["15 minutes, fixed", "1 hour, sliding"] }),
    },
    {
      case: "a burst of nought",
      markdown: buildPrd({
        burst: ["0 requests in any one minute", "4 requests in any one minute"],
      }),
    },
    {
      case: "a per-IP count that isn't a number",
      markdown: buildPrd({
        routes: ["some requests a window", madeUpCells.routes[1]],
      }),
    },
    {
      case: "a per-account cell with no reset requests",
      markdown: buildPrd({
        routes: [
          madeUpCells.routes[0],
          "9 failed sign-ins and 8 pending sign-ins a window",
        ],
      }),
    },
    {
      case: "counters across the deployment",
      markdown: buildPrd({
        counters: ["across the deployment", "per process"],
      }),
    },
  ])("refuses $case rather than guessing a figure", ({ markdown }) => {
    expect(() => parseRequestRatePolicy(markdown)).toThrow(
      RequestRatePolicyUnsetError,
    );
  });
});

describe("loadRequestRatePolicy", () => {
  it("reads the policy pen-testing.md sets, which the server starts on", () => {
    const policy = loadRequestRatePolicy();

    expect(policy.perIpAddress.requestsPerWindow).toBeGreaterThan(0);
    expect(policy.perAccount.resetRequests.requestsPerWindow).toBeGreaterThan(
      0,
    );
  });

  it("refuses a file it can't read, so the server doesn't start", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wizzaroo-policy-"));
    try {
      expect(() =>
        loadRequestRatePolicy(join(directory, "no-such-prd.md")),
      ).toThrow(RequestRatePolicyUnsetError);
    } finally {
      await rm(directory, { recursive: true });
    }
  });

  it("reads a policy from the file it is given", async () => {
    const directory = await mkdtemp(join(tmpdir(), "wizzaroo-policy-"));
    const path = join(directory, "pen-testing.md");
    try {
      await writeFile(path, buildPrd());

      expect(loadRequestRatePolicy(path)).toEqual(
        parseRequestRatePolicy(buildPrd()),
      );
    } finally {
      await rm(directory, { recursive: true });
    }
  });
});
