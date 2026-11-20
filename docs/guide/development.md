# Development

[← Back to the README](../../README.md) · [All guides](README.md)

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Setting up a computer to run Wizzaroo, on Windows, macOS or Linux, is in [Installing and setting up](../installation/README.md). This page is what to run once it is.

## Running it

```bash
pnpm dev
```

This builds the client with Vite into `dist/client`, then starts the Fastify server from source with `.env` loaded. The server applies the schema to an empty database as `DATABASE_OWNER_URL`'s owner, logs in as `DATABASE_URL`'s `wizzaroo_app`, refusing to start if that login is or can become a superuser, a role that skips row-level security or a table's owner, serves the scene at <http://localhost:4310> and answers `GET /health`, which is OK while Postgres answers and an error while it doesn't. There is no hot reload: run `pnpm dev` again after changing the client, or `pnpm run:local` to restart only the server.

`pnpm run:local`, `pnpm migrate` and `pnpm seed:owner` run development's entry point, `src/server/development.ts`. It is the same server as production's `src/server/index.ts` but for one thing: it accepts `.env.example`'s own secrets, its `EMAIL_API_KEY` and its `TOTP_SECRET_KEY`, which anyone can read. `index.ts`, which `pnpm start` and every container run, refuses them by name, and no variable changes that. Both refuse an `EMAIL_API_KEY`, or a password in a database URL, under 8 characters. A database URL with no password, as the development one, is left to Postgres. Email goes through the email platform at `EMAIL_BASE_URL`, run from its own repo; `.env.example`'s key is a placeholder that the email platform itself refuses, so put a key made in it in `.env` ([email](email.md#running-it-locally)). A `.env` from before the email platform needs its `SMTP_` lines swapped for `EMAIL_BASE_URL` and `EMAIL_API_KEY`. A browser that has opened Wizzaroo before shows a rebuilt client on the second reload, not the first; see [Installing and playing offline](offline-and-link-previews.md#installing-and-playing-offline).

| Script                                 | What it does                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm dev`                             | Builds the client, then runs the server from source                                                    |
| `pnpm migrate`                         | Applies the schema as `DATABASE_OWNER_URL`, and sets up the `wizzaroo_app` login, then exits           |
| `pnpm seed:owner`                      | Creates the owner's account and Family, once; see [Signing in](signing-in.md)                          |
| `pnpm generate:voice-over`             | Speaks every new or changed voice-over line with Piper; see [Voice-over](voice-over.md)                |
| `pnpm run:local`                       | Runs the server from source, using the client already in `dist/client`                                 |
| `pnpm build`                           | Compiles the server into `dist/src` and the client into `dist/client`                                  |
| `pnpm start`                           | Runs the built server as production does; it reads its variables from the environment, not from `.env` |
| `pnpm typecheck`                       | Type-checks everything in `src`                                                                        |
| `pnpm lint`, `pnpm lint:fix`           | ESLint, failing on any warning                                                                         |
| `pnpm prettier`, `pnpm prettier:write` | Checks or rewrites formatting                                                                          |
| `pnpm format`                          | `lint:fix`, then `prettier:write`                                                                      |
| `pnpm test`, `pnpm test:watch`         | Vitest with coverage, or in watch mode, without the Island sweeps                                      |
| `pnpm test:sweeps`                     | The Island sweeps (`*.sweep.test.tsx`): every model on every Island, drawn one by one; slow            |
| `pnpm sandcastle`                      | Runs an issue through the agent harness; see [running Sandcastle](../processes/running-sandcastle.md)  |
| `pnpm pen-test:up`                     | Stands up the pen-test deployment; see [its runbook](../pen-test/deployment.md)                        |
| `pnpm pen-test:seed`                   | Loads the pen-test fixtures, or puts them back; see [the fixtures](../pen-test/fixtures.md)            |
| `pnpm pen-test:credentials`            | Writes the testers' credentials package; see [its page](../pen-test/credentials-package.md)            |
| `pnpm pen-test:sign-in`                | Signs in as a fixture identity from the package, and writes its cookies                                |
| `pnpm pen-test:down`                   | Tears the pen-test deployment down, its volumes and secrets included                                   |

## Changing the database

Wizzaroo isn't in production, so the database has no migrations. It is one schema, `src/server/schema.sql`, with its tables typed for queries in `src/server/schema.ts` beside it. Change both in place. `pnpm migrate`, and `pnpm dev` as it starts, apply the schema in one transaction to a database with no tables, and leave a database that has tables as it is, so after changing the schema make the development database again:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
pnpm seed:owner
```

`seed:owner` applies the schema before it makes the owner's account, as `pnpm dev` would.

`src/integration.test.ts` and `src/backup-restore.test.ts` are the suites that need Postgres. They start their own with Testcontainers, and the backup suite also builds the `backup` image, so they need Docker running; without a container runtime they skip with a warning rather than failing. The pen-test deployment's Compose checks need only the `docker compose` command, and skip with a warning without it. A green run without Docker has verified nothing against Postgres.

The workflows in `.github/workflows/` run on every pull request to `main`, and can still be started by hand: `pr-checks.yml` runs the build, typecheck, lint and Prettier in one job and the tests beside them in another, and `lint-pr-title.yml` checks the title is a conventional commit. `pr-checks.yml` has `packages: read`, so its own `GITHUB_TOKEN` can install `@adrianeyre/email-client` from GitHub Packages, as a developer's classic token with `read:packages` does through their user-level `.npmrc`. `actions/setup-node` writes that file for CI, with `registry-url` and `scope`, and the install step passes the token as `NODE_AUTH_TOKEN` ([installing](../installation/README.md#1-install-the-tools-for-your-computer)).

`pr-checks.yml` also fails a pull request that brings in a package with a known advisory, at the level set in [the local standards](../standards/local.md#dependency-advisories). Its `dependency-advisories` job runs `pnpm audit`, which reads every package in `pnpm-lock.yaml`; run `pnpm audit --audit-level=high` to see the same answer locally. Its `dependency-review` job runs GitHub's dependency review action on the pull request's changes, which sees only what GitHub's dependency graph reads, so it doesn't run when the workflow is started by hand.

`island-sweeps.yml` runs `pnpm test:sweeps` every day at 05:47 UTC, and by hand on any branch: the checks that draw every model on every Island one by one (every model solid, and every Attraction, Curiosity and Quest site within the explore budget). They take minutes an Island, so they stay out of `pnpm test` and the pull request's checks; run them by hand on a branch that changes an Island's models.

`scheduled-audit.yml` runs the same `pnpm audit --audit-level=high` every day at 06:17 UTC, and by hand, so an advisory published against a package already merged fails that run instead of waiting for the next pull request. Dependabot (`.github/dependabot.yml`) opens a pull request each day a package in `pnpm-lock.yaml`, or an action a workflow uses, has an update. Every action is pinned by its full commit SHA, with its release in a comment beside it (`uses: actions/checkout@<sha> # v7.0.1`), never by a tag its publisher could move; Dependabot moves the SHA and the comment together.
