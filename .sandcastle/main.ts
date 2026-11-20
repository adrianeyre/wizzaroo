import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import type { MountConfig } from "@ai-hero/sandcastle";

const claudeSettingsFile = join(
  process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"),
  "settings.json",
);

const isStringEntry = (entry: [string, unknown]): entry is [string, string] =>
  typeof entry[1] === "string";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const loadClaudeSettingsEnv = (path: string): Record<string, string> => {
  if (!existsSync(path)) return {};
  const settings: unknown = JSON.parse(readFileSync(path, "utf8"));
  const env = isRecord(settings) ? settings.env : undefined;
  if (!isRecord(env)) return {};
  return Object.fromEntries(Object.entries(env).filter(isStringEntry));
};

const claudeSettingsEnv = loadClaudeSettingsEnv(claudeSettingsFile);

const hostCaCert =
  claudeSettingsEnv.NODE_EXTRA_CA_CERTS ?? process.env.NODE_EXTRA_CA_CERTS;
const caCertInSandbox = "/home/agent/ca-certificates.pem";
const shouldForwardCaCert = Boolean(hostCaCert && existsSync(hostCaCert));

const mounts: MountConfig[] =
  shouldForwardCaCert && hostCaCert
    ? [{ hostPath: hostCaCert, sandboxPath: caCertInSandbox, readonly: true }]
    : [];

const sandboxSetupHooks = [
  {
    command: "pnpm install --frozen-lockfile",
    timeoutMs: 600_000,
  },
] as const;

const promptDir = "./.sandcastle";
const defaultPrompt = "prompt.md";

const printUsage = (): void => {
  console.error(
    "Usage:\n" +
      "  pnpm sandcastle <issue>                # ./.sandcastle/prompt.md, against that issue\n" +
      "  pnpm sandcastle <prompt.md> <issue>    # a prompt beside it\n" +
      "  pnpm sandcastle                        # only for a prompt naming no issue\n\n" +
      `Prompts live in ${promptDir}/. Copy ${defaultPrompt} rather than editing it:\n` +
      `  cp ${promptDir}/${defaultPrompt} ${promptDir}/prompt-issue-9.md\n`,
  );
};

const args = process.argv.slice(2);
const isFirstArgIssue = args[0] !== undefined && /^\d+$/.test(args[0]);
const promptArg = isFirstArgIssue ? defaultPrompt : (args[0] ?? defaultPrompt);
const issueArg = isFirstArgIssue ? args[0] : args[1];

const promptFile = promptArg.includes("/")
  ? promptArg
  : `${promptDir}/${promptArg}`;

if (!existsSync(promptFile)) {
  console.error(`No prompt at "${promptFile}".\n`);
  printUsage();
  process.exit(1);
}

const promptBody = readFileSync(promptFile, "utf8");
const needsIssue = promptBody.includes("{{ISSUE}}");

if (needsIssue && issueArg === undefined) {
  console.error(
    `"${promptFile}" contains {{ISSUE}}, so it needs an issue number.\n`,
  );
  printUsage();
  process.exit(1);
}

const promptArgs: Record<string, string> = {};
if (needsIssue && issueArg !== undefined) promptArgs.ISSUE = issueArg;

const targetBranch = execFileSync(
  "git",
  ["rev-parse", "--abbrev-ref", "HEAD"],
  {
    encoding: "utf8",
  },
).trim();

if (targetBranch === "main") {
  console.error(
    "Refusing to run on `main`: `merge-to-head` would merge unreviewed agent\n" +
      "commits onto the trunk. Cut a branch first, e.g.\n\n" +
      `  git checkout -b issue-9-walking-skeleton origin/main\n`,
  );
  process.exit(1);
}

console.log("Sandcastle run");
console.log(`  prompt   ${promptFile}`);
console.log(`  issue    ${issueArg === undefined ? "none" : `#${issueArg}`}`);
console.log(`  branch   ${targetBranch} (via merge-to-head)`);
console.log(
  `  CA       ${shouldForwardCaCert ? hostCaCert : "none forwarded"}`,
);
console.log(
  `  settings ${Object.keys(claudeSettingsEnv).join(", ") || "no env"} (${claudeSettingsFile})`,
);

const result = await run({
  agent: claudeCode("claude-opus-5-5", { effort: "high" }),
  sandbox: docker({
    mounts,
    env: {
      ...claudeSettingsEnv,
      ...(shouldForwardCaCert ? { NODE_EXTRA_CA_CERTS: caCertInSandbox } : {}),
    },
  }),
  promptFile,
  promptArgs,
  branchStrategy: { type: "merge-to-head" },
  maxIterations: 6,
  idleTimeoutSeconds: 1_800,
  hooks: {
    sandbox: {
      onSandboxReady: [...sandboxSetupHooks],
    },
  },
});

console.log(`\nDone. ${result.commits.length} commit(s) on ${targetBranch}.`);
console.log(
  `  signal   ${result.completionSignal ?? "none — hit maxIterations or the idle timeout"}`,
);
if (result.logFilePath) console.log(`  log      ${result.logFilePath}`);
if (result.preservedWorktreePath) {
  console.log(
    `  kept     ${result.preservedWorktreePath} — uncommitted changes; \`git worktree remove\` when done`,
  );
}
