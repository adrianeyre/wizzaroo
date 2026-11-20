import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** What one key may send: so many requests in a sliding window, and no more than a burst in any one minute of it. */
export interface RequestRateLimit {
  windowMs: number;
  requestsPerWindow: number;
  burst: number;
  burstWindowMs: number;
}

/** The figures from pen-testing.md's request-rate section, the only place they are written. */
export interface RequestRatePolicy {
  /** The sign-in, reset and Invite routes, counted together per caller's address. */
  perIpAddress: RequestRateLimit;
  /** Per normalised email address, or per adult for pending sign-ins. */
  perAccount: {
    failedSignIns: RequestRateLimit;
    pendingSignIns: RequestRateLimit;
    resetRequests: RequestRateLimit;
  };
}

export class RequestRatePolicyUnsetError extends Error {
  override readonly name = "RequestRatePolicyUnsetError";

  constructor(reason: string) {
    super(
      `The server won't start without a request-rate policy, and pen-testing.md's request-rate section ${reason}`,
    );
  }
}

/** Relative to the working directory, as dist/client is: the repo root, or /app in the image. */
export const requestRatePolicyPath = resolve(
  "docs/product-requirements-document/pen-testing.md",
);

const sectionHeadingStart = "## Pre-condition: the request-rate policy";

const millisecondsPerUnit = new Map([
  ["minute", 60_000],
  ["minutes", 60_000],
  ["hour", 3_600_000],
  ["hours", 3_600_000],
]);

const perAccountCountNames = {
  failedSignIns: "failed sign-ins",
  pendingSignIns: "pending sign-ins",
  resetRequests: "reset requests",
} as const;

interface PolicyColumns {
  perIp: string;
  perAccount: string;
}

const readSection = (markdown: string): string[] => {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.startsWith(sectionHeadingStart));
  if (start === -1) {
    throw new RequestRatePolicyUnsetError("is missing");
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(
    (line) => line.startsWith("## ") || line.trim() === "---",
  );
  return end === -1 ? rest : rest.slice(0, end);
};

const readTableRows = (section: string[]): Map<string, PolicyColumns> => {
  const rows = new Map<string, PolicyColumns>();
  for (const line of section) {
    const cells = line.trim().split("|").slice(1, -1);
    if (cells.length !== 3) {
      continue;
    }
    const [label, perIp, perAccount] = cells.map((cell) => cell.trim());
    rows.set(label, { perIp, perAccount });
  }
  return rows;
};

const readRow = (
  rows: Map<string, PolicyColumns>,
  label: string,
): PolicyColumns => {
  const row = rows.get(label);
  if (row === undefined) {
    throw new RequestRatePolicyUnsetError(`has no "${label}" row`);
  }
  return row;
};

const readCount = (text: string): number => {
  const count = Number(text);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new RequestRatePolicyUnsetError(`holds "${text}" as a count`);
  }
  return count;
};

const readWindowMs = (cell: string): number => {
  const window = /^(\d+) (minutes?|hours?), sliding$/.exec(cell);
  const unitMs = millisecondsPerUnit.get(window?.[2] ?? "");
  if (window === null || unitMs === undefined) {
    throw new RequestRatePolicyUnsetError(
      `gives "${cell}" as a window, not "<n> minutes, sliding" or "<n> hours, sliding"`,
    );
  }
  return readCount(window[1]) * unitMs;
};

const readBurst = (cell: string): { burst: number; burstWindowMs: number } => {
  const burst = /^(\d+) requests? in any one (minute|hour)$/.exec(cell);
  const unitMs = millisecondsPerUnit.get(burst?.[2] ?? "");
  if (burst === null || unitMs === undefined) {
    throw new RequestRatePolicyUnsetError(
      `gives "${cell}" as a burst, not "<n> requests in any one minute"`,
    );
  }
  return { burst: readCount(burst[1]), burstWindowMs: unitMs };
};

const readPerIpRequests = (cell: string): number => {
  const requests = /^(\d+) requests a window\b/.exec(cell);
  if (requests === null) {
    throw new RequestRatePolicyUnsetError(
      `gives "${cell}" per IP, not "<n> requests a window"`,
    );
  }
  return readCount(requests[1]);
};

const readPerAccountCounts = (
  cell: string,
): Record<keyof typeof perAccountCountNames, number> => {
  if (!cell.endsWith(" a window")) {
    throw new RequestRatePolicyUnsetError(
      `gives "${cell}" per account, not counts "a window"`,
    );
  }
  const readNamedCount = (name: string): number => {
    const named = new RegExp(
      `(?:^|, | and )(\\d+) ${name}(?:,| and| a window)`,
    ).exec(cell);
    if (named === null) {
      throw new RequestRatePolicyUnsetError(
        `gives no count of ${name} per account`,
      );
    }
    return readCount(named[1]);
  };
  return {
    failedSignIns: readNamedCount(perAccountCountNames.failedSignIns),
    pendingSignIns: readNamedCount(perAccountCountNames.pendingSignIns),
    resetRequests: readNamedCount(perAccountCountNames.resetRequests),
  };
};

/** Reads the section's table, and refuses anything it can't read rather than guessing a figure. */
export const parseRequestRatePolicy = (markdown: string): RequestRatePolicy => {
  const section = readSection(markdown);
  if (
    !section.some((line) => /^\*\*Set on \d{1,2} \w+ \d{4}\.\*\*/.test(line))
  ) {
    throw new RequestRatePolicyUnsetError(
      'records no "**Set on <date>.**" line, so its figures are not set',
    );
  }
  const rows = readTableRows(section);
  const windows = readRow(rows, "Window");
  const bursts = readRow(rows, "Burst");
  const routes = readRow(rows, "Sign-in, reset and Invite routes");
  const counters = readRow(rows, "Per process, or across the deployment");
  if (
    counters.perIp !== "per process" ||
    counters.perAccount !== "per process"
  ) {
    throw new RequestRatePolicyUnsetError(
      "asks for counters across the deployment, and the server keeps them per process only",
    );
  }

  const perIpBurst = readBurst(bursts.perIp);
  const perIpAddress: RequestRateLimit = {
    windowMs: readWindowMs(windows.perIp),
    requestsPerWindow: readPerIpRequests(routes.perIp),
    ...perIpBurst,
  };
  const perAccountWindowMs = readWindowMs(windows.perAccount);
  const perAccountBurst = readBurst(bursts.perAccount);
  const perAccountCounts = readPerAccountCounts(routes.perAccount);
  const buildPerAccountLimit = (
    requestsPerWindow: number,
  ): RequestRateLimit => ({
    windowMs: perAccountWindowMs,
    requestsPerWindow,
    ...perAccountBurst,
  });

  return {
    perIpAddress,
    perAccount: {
      failedSignIns: buildPerAccountLimit(perAccountCounts.failedSignIns),
      pendingSignIns: buildPerAccountLimit(perAccountCounts.pendingSignIns),
      resetRequests: buildPerAccountLimit(perAccountCounts.resetRequests),
    },
  };
};

/** Read once at start-up. A missing file or an unset policy stops the server: there is no default. */
export const loadRequestRatePolicy = (
  path = requestRatePolicyPath,
): RequestRatePolicy => {
  let markdown: string;
  try {
    markdown = readFileSync(path, "utf8");
  } catch (error) {
    throw new RequestRatePolicyUnsetError(
      `can't be read from ${path} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  return parseRequestRatePolicy(markdown);
};
