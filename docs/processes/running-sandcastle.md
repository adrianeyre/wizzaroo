# Running Sandcastle

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

[Sandcastle](https://github.com/mattpocock/sandcastle) runs a coding agent
against this repository inside a Docker container and brings the commits it
makes back to a branch. It is how Wizzaroo's issues get worked without somebody
at the keyboard: an agent picks up an issue in a sandbox, and a person reviews
and lands the result.

`.sandcastle/` holds the configuration. This file explains how to use it **in
this project**. The upstream README is the reference for `run()`, the providers
and the hooks. This file covers the parts that are specific to us.

`main.ts` has no comments. This file is where its reasoning is written down.

---

## What is in `.sandcastle/`

| Path           | What it is                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `Dockerfile`   | The sandbox image: Node 26.10.0, pnpm 12.21.0, `git`, `gh`, `claude`             |
| `main.ts`      | The orchestration entrypoint: prompt selection, branch guard, hooks, sandbox     |
| `prompt.md`    | The committed prompt template, with the parts every brief here must have         |
| `prompt-*.md`  | Your working briefs. Ignored, so they stay out of the branch's diff              |
| `.env.example` | Every variable a run needs, with the reason it exists and no values              |
| `.gitignore`   | Keeps `.env`, `logs/`, `worktrees/` and every prompt but the template out of git |

The harness also relies on three things at the root:

| Path                  | What it adds                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`        | The `sandcastle` script, `@ai-hero/sandcastle` and `tsx`, `engines.node` beside the app's own scripts and dependencies           |
| `pnpm-workspace.yaml` | `allowBuilds`, so the binary `tsx` depends on gets installed and the optional native builds Testcontainers pulls in are declined |
| `pnpm-lock.yaml`      | The lockfile that `pnpm install --frozen-lockfile` installs from                                                                 |

`logs/` and `worktrees/` appear the first time you run something. Both are
ignored, and so is `.env`. **Never commit a credential.**

---

## One-time setup

### 1. Docker

Docker must be running: `docker info` should print rather than fail.

### 2. Dependencies at this checkout

```bash
pnpm install
```

`@ai-hero/sandcastle` and `tsx` are root devDependencies. An
`ERR_MODULE_NOT_FOUND` naming `@ai-hero/…` means this step was skipped.

### 3. Credentials

```bash
cp .sandcastle/.env.example .sandcastle/.env
```

**A key named with no value is filled from your shell.** Sandcastle forwards
exactly the keys `.sandcastle/.env` names. It uses the file's value when there
is one and the value from `process.env` when there isn't. That means you can
leave secrets out of the file and export them from your shell instead.

The catch is a silent failure: **a variable your shell exports but `.env` does
not name is not forwarded.** The agent starts unauthenticated, and nothing in
the log says a variable was dropped. If you add a variable to your environment,
add its name to `.env` too.

- `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token` on the host) runs the
  agent on your Claude subscription. You can set `ANTHROPIC_API_KEY` instead.
- `GH_TOKEN` is a
  [fine-grained token](https://github.com/settings/personal-access-tokens/new)
  scoped to this repository, with **Issues: read and write**, **Metadata: read**
  and **Contents: read**. The agent uses it to read the issue and the docs the
  issue cites, and to post its verification back on the issue. It deliberately
  has no `Contents: write` and no `Pull requests: write`. The commits come back
  over the bind mount, and a person pushes them and opens the pull request.

**The `env` from your Claude Code settings is forwarded too.** Every string in
the `env` block of `~/.claude/settings.json` (or the one under
`CLAUDE_CONFIG_DIR`, if you set it) reaches the agent the same way it reaches
`claude` on the host. Examples are `ANTHROPIC_API_KEY`, and `ANTHROPIC_BASE_URL`
and `ANTHROPIC_CUSTOM_HEADERS` for a gateway. These override the same keys in
`.sandcastle/.env`. A run prints the names it forwarded, never the values. Any
address in there must be reachable from a container on Docker's default bridge,
where `localhost` means the container itself. If the settings file exists but
isn't valid JSON, the run stops with a parse error rather than starting without
your settings.

If you reach Anthropic through a gateway that has its own certificate
authority, set `NODE_EXTRA_CA_CERTS` in those settings or export it on the host
as usual. `main.ts` mounts that file into the container and points the variable
at the mounted copy. Forwarding only the host path fails with
`unable to verify the first certificate`.

### 4. Build the image

```bash
pnpm exec sandcastle docker build-image
```

This builds `.sandcastle/Dockerfile` as `sandcastle:<repo-directory-name>` and
passes in your UID/GID, so files written by the image and files written through
the bind mount have the same owner. Rebuild after any change to the Dockerfile.
`pnpm exec sandcastle docker remove-image` deletes the image. Use `pnpm exec`
rather than `npx`, because `devEngines` names pnpm as the package manager.

---

## The image has to match the project

The root `package.json` requires Node 26 or later (`engines`) and pins pnpm to
12.21.0 (`packageManager` and `devEngines`). The image pins matching versions
(Node 26.10.0, pnpm 12.21.0) so every sandbox is the same. If either changes,
change the Dockerfile in the same pull request. A sandbox on the wrong Node or
pnpm usually installs fine and fails later, where the cause is much harder to
find.

Whatever else you add, keep the four things Sandcastle itself needs: the
non-root `agent` user (Claude Code refuses to run as root), `git`, `gh`, and
`claude` on `PATH`. pnpm is this project's own addition.

---

## Dependencies are installed by a hook, not baked into the image

The image installs no workspace dependencies, because they would go stale at
the next lockfile change. `main.ts` installs them when the sandbox comes up:

```ts
onSandboxReady: [
  { command: "pnpm install --frozen-lockfile", timeoutMs: 600_000 },
];
```

`--frozen-lockfile` is deliberate. A slice that genuinely adds a dependency has
to commit the lockfile change with it, which keeps the lockfile reviewable.
pnpm 12 won't run a dependency's install scripts unless the package is listed
under `allowBuilds` in `pnpm-workspace.yaml`. `esbuild` (which `tsx` pulls in)
is listed there for this reason. `ssh2`, `cpu-features` and `protobufjs`
(pulled in by Testcontainers) are listed as `false`: their builds are optional
speed-ups, and pnpm refuses to install while a build script is undecided.

Docker is a bind-mount provider, so the worktree the agent works in sits on
your disk under `.sandcastle/worktrees/…`. You can see the agent's edits on the
host as soon as it makes them.

**`onSandboxReady` hooks run in parallel.** A hook that needs `node_modules`
must not be a separate entry alongside the one that installs them. Chain the
commands with `&&` in a single entry instead, for example
`pnpm install --frozen-lockfile && pnpm build`. If you get this wrong, you'll
see a "command not found" for a tool the install hadn't provided yet.

---

## Running it

```bash
pnpm sandcastle 9                      # .sandcastle/prompt.md, against issue #9
pnpm sandcastle prompt-issue-9.md 9    # a prompt you wrote beside it
pnpm sandcastle                        # only for a prompt that names no issue
```

| Invocation                            | Prompt                          | Issue |
| ------------------------------------- | ------------------------------- | ----- |
| `pnpm sandcastle 9`                   | `.sandcastle/prompt.md`         | #9    |
| `pnpm sandcastle prompt-issue-9.md 9` | `.sandcastle/prompt-issue-9.md` | #9    |
| `pnpm sandcastle`                     | `.sandcastle/prompt.md`         | none  |

A bare number is read as the issue. A bare file name is looked up inside
`.sandcastle/`, unless it contains a `/`. If the prompt file doesn't exist, the
script prints the usage and exits. The committed `prompt.md` contains
`{{ISSUE}}`, so running it without an issue number is refused on the host,
before any container is built.

Progress streams to the terminal, and a full log is written under
`.sandcastle/logs/`. When the run finishes, `main.ts` prints the commit count,
the completion signal, the log path, and any worktree it had to keep.

The agent is `claudeCode("claude-opus-5-5", { effort: "high" })`, with
`maxIterations: 6` and a 30-minute idle timeout. If you set `permissionMode` in
`claudeCode()`, it **replaces** Sandcastle's default
`--dangerously-skip-permissions`, which is what lets a run proceed unattended.

### One prompt is tracked; the rest are yours

`.sandcastle/prompt.md` is the committed template. Every other `prompt*.md` is
ignored, so a brief written for one issue never ends up in a commit. Copy the
template rather than editing it:

```bash
cp .sandcastle/prompt.md .sandcastle/prompt-issue-9.md
$EDITOR .sandcastle/prompt-issue-9.md
pnpm sandcastle prompt-issue-9.md 9
```

---

## Branch strategy: `merge-to-head`

| Strategy        | Where the commits land                                           |
| --------------- | ---------------------------------------------------------------- |
| `head`          | Straight into this working directory, with no worktree or branch |
| `merge-to-head` | A temporary worktree branch, merged back to HEAD                 |
| `branch`        | A named branch in a worktree, kept                               |

`head` is Sandcastle's default for bind-mount providers, which means the agent
edits the same files you're looking at. This project uses `merge-to-head`
instead: the agent gets its own worktree, and its commits are merged back onto
the branch you launched from.

**Launch from a fresh branch cut from `origin/main`. Never launch from `main`
itself, or from the previous run's branch.** `main.ts` refuses to start on
`main`. If you build on the last run's branch, its commits end up in your pull
request too, and the review then covers two issues instead of one.

```bash
git fetch origin
git checkout -b issue-9-walking-skeleton origin/main
pnpm sandcastle 9
```

Work through issues in dependency order. The prompt tells the agent to stop and
say so if any issue under "Blocked by" is still open.

---

## Writing a prompt

Three pieces of syntax do the work:

- <code>!&#96;command&#96;</code> is replaced by the command's output **before**
  the agent sees the prompt. These commands run inside the sandbox, after the
  `onSandboxReady` hooks have finished. If one exits non-zero, the run fails
  straight away.
- `{{KEY}}` is filled in from `promptArgs` on the host before any of those
  commands run, so `{{ISSUE}}` is already substituted by the time
  `gh issue view` runs. `{{SOURCE_BRANCH}}` and `{{TARGET_BRANCH}}` are built
  in.
- `<promise>COMPLETE</promise>` ends the iteration loop early. Sandcastle never
  adds it for you. If the prompt doesn't ask the agent to output it, the run
  keeps going until `maxIterations` or the idle timeout.

### What a prompt here must include

`prompt.md` has these parts, and any brief you write should keep them:

1. **The reading, before the task:** `README.md` and the `docs/guide/` pages
   it links to, the PRD
   (`docs/product-requirements-document/wizzaroo.md`) and each ADR, named
   individually.
2. **The brief, fetched live** with <code>!&#96;gh issue view {{ISSUE}}&#96;</code>
   rather than pasted in, so it can't drift from the issue. The comments are
   fetched by a second <code>!&#96;gh issue view {{ISSUE}} --comments&#96;</code>.
   Don't merge the two: when its output isn't a terminal, `--comments` prints
   only the comments, so an issue with none would reach the agent empty.
3. **What already exists and must survive.** In particular, the root
   `package.json` contains the harness that is running the agent. An agent
   given a scaffolding task will otherwise rewrite it from scratch.
4. **The invariants:** every ADR is binding, no credential ever appears in a prompt, log or commit, and nothing
   collects a child's personal data unless the issue and the PRD both ask for
   it.
5. **Verification:** the exact commands to run, an instruction to paste their
   real output back on the issue, and an instruction never to get to green by
   weakening a test.

Point 5 matters most. An agent that grades its own work will report success
based on the same wrong assumptions it built with. The pasted output is what a
person checks before opening the pull request.

---

## What a sandbox here cannot do

- **It has no Docker of its own.** The sandbox is itself a container, so it
  can't start other containers, such as a database from `docker compose`.
  `src/integration.test.ts`, the one suite that needs Postgres, starts its own
  through Testcontainers, so in a sandbox it skips with a warning and
  `pnpm test` is green without having touched Postgres. That suite, and
  anything else that can only be checked against a real compose stack, is
  listed on the pull request as unverified.
- **It has no GPU or display.** The 3D game world can be built and
  unit-tested, but how it looks, how it sounds and how smoothly it plays can
  only be judged in a real browser on the host. Say so on the pull request.
- **It must not reach real accounts, real children's data, or GitHub
  repositories other than this one.** Anything that talks to an outside service
  is tested against fakes.
- **It cannot push or open a pull request.** This is by design: `GH_TOKEN` has
  no write access to contents. A person lands the work.

A pull request should list each test that was skipped or couldn't run in the
sandbox, so the reviewer knows exactly what still has to be proven on the host
or in CI.

---

## Landing a run

A run isn't finished when the agent stops. It's finished when the work is on
the remote, behind a pull request, on a branch that contains this issue and
nothing else. Do these steps on the host:

```bash
# 1. The gate. Run every check that exists.
pnpm lint && pnpm typecheck && pnpm test

# 2. Commit anything the agent left uncommitted, as coherent commits.
git add -A && git commit

# 3. Bring main in, and resolve any conflicts here rather than in the PR.
git fetch origin && git merge origin/main

# 4. Re-run the gate on the merged result. A clean merge doesn't mean a passing build.
pnpm lint && pnpm typecheck && pnpm test

# 5. Push and open the pull request, closing the issue.
git push -u origin HEAD
gh pr create --base main --fill
```

Run the gate with Docker running, so `src/integration.test.ts` runs against
Postgres instead of skipping, and run anything the issue's acceptance criteria
name as well.

Then check that the diff covers only this issue: `git diff origin/main --stat`
should list this issue's files and nothing from an earlier run.

### What the pull request should say

1. **What the slice does**, in the PRD's terms, and `Closes #<issue>`.
2. **Which acceptance criteria are met, and how each was verified.**
3. **The verification output, pasted:** the real output from step 4, not a
   claim that it passed.
4. **What wasn't verified here**, such as how the 3D world looks and plays in a
   browser, and **what is deliberately left out**, with the reason.

---

## Cleaning up

Worktrees live under `.sandcastle/worktrees/`. A clean worktree is deleted when
the run ends. A worktree with uncommitted changes is **kept**, so that work
survives a crash, and `main.ts` prints its path. Remove it with
`git worktree remove` once you've dealt with it.
`pnpm exec sandcastle docker remove-image` deletes the image.

---

## Troubleshooting

| Symptom                                             | Cause                                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ERR_MODULE_NOT_FOUND` for `@ai-hero/…`             | `pnpm install` hasn't been run at this checkout                                                      |
| The agent exits asking to authenticate              | `.sandcastle/.env` is missing, or it names no working credential                                     |
| The agent is unauthenticated despite a set variable | `.sandcastle/.env` doesn't name that key, so it was never forwarded                                  |
| `unable to verify the first certificate`            | A private CA the container can't reach. Set `NODE_EXTRA_CA_CERTS` on the host so `main.ts` mounts it |
| A JSON parse error before anything else happens     | `~/.claude/settings.json` isn't valid JSON                                                           |
| `gh` says it cannot read the issue                  | `GH_TOKEN` doesn't have **Issues: read** on this repository                                          |
| Permission errors on files the agent wrote          | The image was built without your UID. Rebuild with `pnpm exec sandcastle docker build-image`         |
| ``Refusing to run on `main` ``                      | Working as intended. Cut a branch; the message prints the command                                    |
| The run hangs long after the work is done           | The prompt never asked for `<promise>COMPLETE</promise>`                                             |
| A tool is "not found" in an `onSandboxReady` hook   | Hooks run in parallel and it raced the install. Chain them with `&&`                                 |
| `ERR_PNPM_IGNORED_BUILDS`                           | pnpm 12 needs the package listed under `allowBuilds` in `pnpm-workspace.yaml`                        |
| A usage message instead of a run                    | No prompt at that path, or the prompt contains `{{ISSUE}}` and no issue was given                    |

---

## See also

- [Sandcastle](https://github.com/mattpocock/sandcastle): the upstream
  reference for `run()`, providers and hooks
- [`docs/product-requirements-document/wizzaroo.md`](../product-requirements-document/wizzaroo.md):
  the requirements every issue cites
- [`docs/architectural-decision-record/`](../architectural-decision-record/):
  the decisions an agent must not quietly reverse
