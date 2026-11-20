# Configuration refuses weak and development secrets

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Superseded in part by [0069](./0069-emails-are-sent-through-the-email-platform.md): the `SMTP_` variables, and the rules below about `SMTP_SECURE` and `SMTP_ALLOW_PLAIN_TEXT`, are gone. `EMAIL_API_KEY` is the secret that takes `SMTP_PASSWORD`'s place, under the same rules.

Section 9 of `wizzaroo.md` keeps the database passwords, the tunnel token and the SMTP credentials in `.env`, and [ADR 0002](0002-self-hosted-behind-a-cloudflare-tunnel.md) leaves Wizzaroo's own configuration as the only thing that checks them. The server and Compose asked only whether a secret was empty, so one character or a few spaces started the stack. `SMTP_SECURE=false` sent the SMTP login and reset links in plain text to a server that offered no `STARTTLS`. And the server took `.env.example`'s development values as given, since nothing told development from production (pen-test I3: #306, #307, #308).

## Decision

- **The server refuses a short secret.** `SMTP_PASSWORD`, and the password in `DATABASE_URL` or `DATABASE_OWNER_URL`, must be at least 8 characters, not counting spaces at either end. The refusal names the variable, never the value. A database URL with no password is left to Postgres, which refuses it unless it trusts the connection, as only development's does. `TOTP_SECRET_KEY` keeps its own, stricter shape ([ADR 0051](0051-totp-secrets-are-sealed-with-a-key-the-database-never-holds.md)).
- **Compose refuses a blank or one-character secret before any container starts.** Compose's interpolation can say only whether a variable is set. So `docker-compose.yml` has a `check-<NAME>` service for each of `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `BACKUP_POSTGRES_PASSWORD`, `SMTP_PASSWORD` and `CLOUDFLARE_TUNNEL_TOKEN`, in a profile nothing turns on, whose container name is that secret. Compose checks every service's container name, started or not, for a letter or digit followed by another or by `_`, `.` or `-`, and refuses the file otherwise. The error names the service, and so the variable. Its value appears in the error only when it is that weak.
- **`SMTP_SECURE=false` means `STARTTLS`, required.** Nodemailer is given `requireTLS`, so without `STARTTLS` it sends neither the login nor the email. Plain text is a separate switch, `SMTP_ALLOW_PLAIN_TEXT=true`, for a mail catcher: `.env.example` sets it for development's Mailpit, and `docker-compose.pen-test.yml` for the pen-test deployment's. `docker-compose.yml` never passes it to the app, and refuses a `.env` that holds it.
- **Development is an entry point, not a variable.** `src/server/development.ts` runs the same composition root as `src/server/index.ts`, but accepts `.env.example`'s own secrets, `SMTP_PASSWORD=anything` and its `TOTP_SECRET_KEY`, which anyone can read. `pnpm run:local`, `pnpm migrate` and `pnpm seed:owner` run it. `index.ts`, which `pnpm start` and every container run, refuses them by name. A unit test keeps the list in step with `.env.example`.

## Considered options

- **A `WIZZAROO_ENV=development` variable in `.env.example`:** a server started on the example alone would then be in development, which is exactly the case to refuse. A variable set by the `pnpm` scripts instead would need a shell to set it on every platform.
- **Refusing `SMTP_SECURE=false` outside development:** it would close port 587 to providers that need `STARTTLS`. Requiring `STARTTLS` keeps it open and still sends nothing in plain text.
- **Allowing plain text to a loopback host only:** a stripped `STARTTLS` on `127.0.0.1` is the pen test's own probe, and the pen-test deployment's Mailpit is on another host.
- **Passing secrets to containers as Compose secrets, checked by a service the others wait for:** a real refusal only at `docker compose up`, with the weak value still accepted by `docker compose config`, and each image would need to read its secret from a file.
- **A longer minimum, such as 32 characters:** the deployment guide's `openssl rand -hex 32` passes any minimum, but SMTP providers' keys vary, and 8 already refuses every placeholder short of a deliberate one.

## Consequences

- A developer's `.env` from before `SMTP_ALLOW_PLAIN_TEXT` needs the line added, or development email fails to reach Mailpit.
- Compose's check rests on the Compose file format's container-name pattern. If that ever changes, the I3 probes in the gated run fail.
- An unset `CLOUDFLARE_TUNNEL_TOKEN` is still accepted, so the stack runs without the tunnel; refusing it within the `tunnel` profile is #309's.
