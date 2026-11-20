# Emails are sent through the email platform

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Supersedes [0055](./0055-emails-are-html-with-a-plain-text-part.md). Supersedes in part [0054](./0054-configuration-refuses-weak-and-development-secrets.md).

Wizzaroo rendered its own emails, from `src/server/email/email-layout.ts` ([0055](./0055-emails-are-html-with-a-plain-text-part.md)), and sent them over SMTP with Nodemailer, to Resend in production and to a Mailpit in `docker-compose.dev.yml` in development. The owner now runs a self-hosted [email platform](https://github.com/adrianeyre/email-platform): a service of its own that keeps templates, renders them, queues each email, delivers it through one SMTP provider and logs it. It comes with Wizzaroo's 15 emails as built-in templates, keeping their wording and layout. Two copies of the same emails, one in each repo, would drift apart.

## Decision

- **Every email is sent through the email platform.** The server sends with the `@adrianeyre/email-client` package, by the slug of one of the email platform's built-in Wizzaroo templates, such as `wizzaroo-reset-your-password`, through its typed helper on `email.builtIn`. A missing or misspelt variable fails at compile time.
- **Wizzaroo chooses the template and fills its variables, and nothing else.** `src/server/email/emails.ts` decides which template, to whom, and the values: links, names reduced to one plain line (#321), dates and times written out in UK time ("14 November 2026 at 13:52 (UK time)"), lifetimes as words ("24 hours") and new addresses masked (`m•••@example.com`). The subjects, wording, HTML and plain-text parts, header, footer and from address all live in the email platform's templates and their Wizzaroo configuration. `email-layout.ts` and the Mailpit test are deleted.
- **Two variables replace the six `SMTP_` ones.** `EMAIL_BASE_URL` is where the email platform runs, an `http` or `https` URL, `http://localhost:4320` in development. `EMAIL_API_KEY` is the API key the email platform made for Wizzaroo, starting `ek_`. It is a secret, held to the rules of [0054](./0054-configuration-refuses-weak-and-development-secrets.md): at least 8 characters, and `.env.example`'s `ek_development_key_from_the_local_email_platform` is refused outside development. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_ALLOW_PLAIN_TEXT`, `SMTP_USERNAME` and `SMTP_PASSWORD` are gone, with the rules about TLS and plain text that went with them: how the email platform reaches its provider is its own concern.
- **A send waits at most 10 seconds.** The client's `timeoutMs` replaces the SMTP connection, greeting and socket timeouts. No send holds a database connection (#329), as before.
- **Mailpit leaves this repo.** `docker-compose.dev.yml` runs only Postgres. In development the email platform runs from its own repo, with its own Mailpit on 1025 and 8025 and its UI on <http://localhost:4320>; its built-in templates are added with `pnpm cli templates:add-built-ins`, and a key made in it goes in `.env`. The pen-test deployment has no Mailpit either: its `EMAIL_BASE_URL` and `EMAIL_API_KEY` name `email-platform-stand-in`, on its internal `mail` network, which takes each send as the email platform's API does, delivers nothing, and lists every send's template slug and variables on `127.0.0.1:43380` for testers to read.
- **The package comes from GitHub Packages.** The repo's `.npmrc` takes the `@adrianeyre` scope from `https://npm.pkg.github.com`. pnpm takes no token from a repo's own `.npmrc`, so the login is a user-level one naming `${GITHUB_TOKEN}`, a token with `read:packages`: in each developer's `~/.npmrc`, in CI the one `actions/setup-node` writes for `NODE_AUTH_TOKEN`, and in the Docker build one on a tmpfs, given the token as a BuildKit secret, `github_token`, which `docker compose build` passes from `GITHUB_TOKEN`, so it stays out of the image.

## Considered options

- **Keep rendering and sending in Wizzaroo:** no new service to run, but two copies of every email, and a change to the layout made twice.
- **Render in Wizzaroo and send through the email platform's raw-content API:** keeps the wording here, but loses the email platform's templates, preview and gallery, and still keeps a layout in each repo.
- **Vendor the client into this repo instead of installing it:** no GitHub token needed, but a copy of the client to keep in step by hand, and its typed list of templates with it.

## Consequences

- Wizzaroo depends on another service. If the email platform is down or slow, or refuses the key, every send fails within 10 seconds, and so does what it guards: a reset link isn't left waiting, and a security notice that can't be sent stops its change, as before.
- A send succeeds once the email platform has queued the email, not once it is delivered. The email platform retries a failed delivery and then marks it `failed` in its Logs; a security notice that fails then still lets its change stand.
- Changing what an email says, or how it looks, is a change in the email platform, not in this repo. Its built-in template slugs and variables are a contract: renaming or restyling a template there is fine, changing a slug or a variable breaks Wizzaroo's sends.
- Installing the packages and building the image need a GitHub token with `read:packages`, on every developer's machine, in CI and on the home server.
- Running Wizzaroo locally with email means running the email platform too. Without it, Wizzaroo still runs, but nothing that sends an email works.
- The screenshots in `docs/images/emails/` were taken from Wizzaroo's own renderer, and are taken again from the email platform when its templates change.
