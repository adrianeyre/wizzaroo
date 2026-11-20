# One package with client, server and curriculum folders

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The repo is a single package: `src/client` (React and the 3D world, built by Vite into `dist/`), `src/server` (Fastify, which serves that build from the same origin, with the Drizzle schema and migrations), and `src/curriculum` (Skills, generators and mastery rules, which both of the others import).

## Considered Options

- **A pnpm workspace** with `apps/web`, `apps/api` and `packages/curriculum`, as in ai-office. Rejected: the standards' layout already fits, and shared code is just an import. Revisit if build times or diverging dependencies start to hurt.
- **A shared database package**, as the estate standards assume. Rejected: Wizzaroo has no sibling service to share a schema with, so the Drizzle schema lives in `src/server`.
