# Keeping data safe

[← Back to the README](../../README.md) · [All guides](README.md)

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

## Keeping Families apart in Postgres

The API takes every caller's reach from their credential, and Postgres row-level security checks it again ([ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)). Every table holding a Child's or an adult's data has row-level security on, with a policy for the `wizzaroo_reach` role. Each request made for a signed-in Parent, the Admin or a Family Device runs in one transaction that switches to that role and records who is calling (`wizzaroo.user_id`, `wizzaroo.family_id`, `wizzaroo.is_admin`), and both end with the transaction. A Parent route, and the Family export, also set `wizzaroo.own_family_only`: they run within the Parent's own Family alone, with the Admin's reach and a Teacher's reads off, even for the owner, who is both Admin and Parent.

- **A Parent** reaches their own Family's rows, their co-Parents' accounts, and their own sign-ins, passkeys and codes, but not their co-Parents'. They read the adults a Teacher asked to add to their Family (`family_join_requests`); agreeing or turning one down runs as the owner once the API has checked the Family is theirs. They see a co-Parent's account but change only their own. They read who is in their Family (`family_parents`) but never change it: no reach does, the Admin's included, so an adult joins or leaves a Family only on `wizzaroo_server`'s paths, once the API has checked the caller's reach.
- **A Family Device** reaches its Family's rows and no adult's, and writes play only for its own Family's Children. It reads its Family's devices but changes none of them: signing a device in and revoking it are a Parent's of that Family.
- **A Teacher** reads, and never changes, the Children in their Year Groups at their School, with their Characters, play and Families, those Children's Parents, and the School's Parents who have no Children yet. Nothing from another School, and no sign-ins, Family Devices, Invites or requests to join a Family. A deactivated Teacher's reach reads none of it, since the Teacher policies check `users.deactivated_at` as well as the API.
- **The Admin** reaches everything except another adult's second factors, and adds to the Admin access log (`admin_access_logs`) only in their own name and can't change or remove a row of it, as with the [audit log](#the-audit-log).
- **On an adult's account** (`users`), a reach changes only what the API changes within one: an adult's own password, and the Admin's deactivating someone, which a trigger keeps to the Admin. No reach, the Admin's included, is granted `roles` or `email`: an email address changes only when its emailed check is confirmed, as `wizzaroo_server`, and roles never change within a reach.
- **Deleting** a Family, a Child or their play is the Admin's alone in Postgres too: a Parent's or a Family Device's reach that tries it deletes nothing, so a Family or a Child goes only through the Admin's routes, which write its Audit Log entry in the same transaction.
- **An adult's second factors**, their TOTP secret (`totp_secrets`), a secret being set up, their recovery codes and their passkeys, are within their own reach alone: not a co-Parent's, a Teacher's or the Admin's. So a query run in another adult's reach can't read a secret or turn a second factor off, and the Admin's reach can't strip a Teacher of their last one.
- **A Picture Password hash** is read by no adult's reach, a Parent's, a Teacher's or the Admin's: the reach role isn't granted that column of `children`. A Family Device's reach is handed its own Family's hashes by a function made for it, which answers null for any other reach or Child. Everyone else reads `has_picture_password`.
- **Grants** are table by table, and only for the commands a route makes on that table within a reach, so a query bug can't make a write no route makes. The functions the policies call read the real tables alone, with `pg_temp` last on their `search_path`, and the reach role can't make a temporary table.
- **Nobody yet known** reaches nothing. Signing in, reset links, Invites and a Family Device's cookie are checked as `wizzaroo_server` before anyone is known, and so is whether an email address is already used.

The app never logs in as the database's owner, which only the `migrate` step uses. It logs in as `wizzaroo_app`, which isn't a superuser, can't skip row-level security and owns no table, and the server refuses to start on a login that is or can become any of those.

- **Inside a reach**, the queries run on a pool of their own whose login holds the `wizzaroo_reach` role's grants and policies and nothing more, so a `RESET ROLE` gives back no more than the reach.
- **Outside any reach**, the credential checks above and staff writes once the API has checked the Teacher's reach run as `wizzaroo_server`. Its grants and policies are written down in migrations 0031 and 0045: every row of every table, but no `TRUNCATE`, no table changes and no programs, and the audit log only read, added to, and purged once an entry is twelve months old.

The tests read every table through each kind of reach with no filter in the query, prove a Parent and a Teacher get nothing from another Family or School, and fail if any table lacks row-level security or a policy. The data holds Schools (`schools`), each Child's School (`children.school_id`, empty until a School is set), Teachers with their School and Year Groups (`teachers`, `teacher_year_groups`), and the School that invited a Parent (`school_parents`); creating Schools and Teachers, and the screens for them, come with their own issues.

Every route under `/api/` declares who it is for in its `config.reach`: `none`, `user`, `adult`, `parent`, `staff`, `admin` or `family-device`, one for each `runAs…` wrapper. The server won't start with an `/api/` route that declares none, and a route that declares `none` gives its reason in `config.noReachReason`. The declared reach's check runs as the route's first `onRequest` hook, so a caller below it is refused before the route reads anything the request holds, and a handler that calls a different wrapper from the one its route declares answers 500 instead of running. `src/server/http-server.test.ts` lists every route's reach and fails when a route is added without an entry, or with a different one.

## Text Postgres can't hold

Postgres refuses a NUL byte (`\u0000`) in `text` and `jsonb`. So before any route validates or reads a request, the server looks through its body, query string and path parameters, every string and every object key, and answers one holding a NUL byte with a 400 and "Text can't hold a NUL byte" (`src/server/nul-bytes.ts`). Sign-in, a reset request, every name, nickname, town and email, both CSV uploads and a Family Device's play events are all refused there, with or without a credential, before a query is built. An email address read from a CSV, or typed for a new adult or an email change, is refused as not an email address if it holds any control character or anything Nodemailer would read as a list, a group or a display name (a comma, semicolon, colon, angle or other bracket, quote, backslash or space), if Nodemailer's own parser doesn't read it as exactly that one mailbox (#322), or if it is longer than 254 characters, the longest a mailbox can have (`isEmailAddress` in `src/server/auth/email-address.ts`). So a long address is never kept as a pending email change or sent mail, and a CSV row with one is a row problem at preview and upload.

## Numbers and dates Postgres can't hold

Fastify's Ajv turns a number written as text into a number, so `?page=2` and `"stars": "5"` work. It also turns `"Infinity"`, `"-Infinity"` and `"1e400"` into numbers that aren't finite, and its checks skip `minimum` and `maximum` for those. So once a route's schema has run, a `preHandler` hook on every route looks through the body, query string and path parameters, and answers any number that isn't finite with a 400 and "That number is too big for Wizzaroo" (`src/server/non-finite-numbers.ts`), before the handler runs. That covers every integer field, a Family Device's play events included, so none reaches a query or is kept in `jsonb` as `null`.

Ajv's `date` and `date-time` formats take any four-digit year, but Postgres has no year 0000. The server narrows both formats when it builds its validator (`src/server/held-dates.ts`): a `date` must be in year 1 or later, and a `date-time`, once its offset is applied, must fall from year 1 to year 9999 in UTC. Any other is refused with a 400 by the route's schema, before any query.

## What every answer carries

Every answer, a page, a script, an API reply, a refusal, a 404 or a 500, carries the browser protections nothing in front of the app adds (pen test I1, `src/server/http-hardening.ts`):

- a content security policy that runs scripts from Wizzaroo's own origin alone and lets no page be framed (`frame-ancestors 'none'`, and `X-Frame-Options: DENY` beside it);
- `Strict-Transport-Security` for a year, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`;
- a permissions policy that refuses the camera, microphone, location, payment and USB, and `same-origin` opener and resource policies.

An unexpected error, a failed query, a database that can't be reached or a bug, answers `500` with one body, the same for every route: `{"statusCode": 500, "error": "Internal Server Error", "message": "Something went wrong. Please try again."}`. What went wrong goes to the server's log alone, which keeps only what [its serializer](../../src/server/server-log.ts) lets it. A refusal (`4xx`) is answered as before.

Each route reads a body of 16 KiB at most. The CSV uploads, their previews and a Family Device's upload of up to 100 events read up to 1 MiB. A body that says it is bigger is refused `413` before anything looks the caller up.

## The audit log

Sign-ins and changes that matter for security are kept in `audit_log_entries` ([ADR 0041](../architectural-decision-record/0041-security-actions-are-kept-in-an-audit-log.md)), and the Admin reads them in the Admin dashboard's **Audit log** section. That covers:

- sign-ins that worked or failed, signing out, and signing out every other browser;
- two-factor, passkeys, passwords and email addresses changing;
- Family Devices and Picture Passwords;
- Schools, Teachers, Parents and Children created, moved, deactivated or deleted, and Families deleted;
- a Parent agreeing to, or turning down, an adult a Teacher asked to add to their Family;
- Deletion Requests made and confirmed;
- a reset link emailed because someone asked for one, and the first refusal when an adult's address has been asked for too often;
- the first refusal when an adult's address has had too many wrong passwords;
- the Admin giving Stars or Family Chest coins, renaming a School, and changing another Family's Child's details, limits, Teacher locks, Classmate visits or birth.

- **What an entry holds:** when it happened, the action, who did it (an adult's id and roles, a Family Device's id, or no one), what it was done to (a type and an id), and one short detail. A sign-in also keeps the caller's IP address ([below](#the-address-a-request-comes-from)). Nothing else: no names, email addresses or nicknames, so a deleted Child or Family is only an id here.
- **Written with the action:** each entry goes in the same transaction as the change it records, so a change that can't be logged doesn't happen. The ids aren't foreign keys, so deleting a Family keeps the record that it was deleted.
- **Append-only:** the `wizzaroo_reach` role can read (the Admin only) and add (in its own name only), never change or remove. `wizzaroo_server` can read and add, never change, and remove only an entry older than twelve months, which the server does when it starts and every day after. Neither may `TRUNCATE` it.
- **Reading it:** `GET /api/admin/audit-log-entries?page=&action=&from=&to=` gives the Admin 50 entries a page, newest first, with the total. `from` and `to` are UK dates, both included. A date that doesn't exist, or one in the year 0000, is refused with a 400, as is a `page` that isn't a whole number from 1 to 10,000. Each adult's own entries, with their sign-ins' IP addresses, are also in their [Family's export](family-data-and-admin.md#your-familys-data).

## Request-rate limits

The routes in front of a credential are limited per process, with the figures set in [the request-rate policy](../product-requirements-document/pen-testing.md#pre-condition-the-request-rate-policy-before-a-second-school), the only place they are written. The server reads that section of `pen-testing.md` when it starts, and won't start if the file is missing or the section's figures can't be read or aren't set: there is no default. The Docker image carries the file for that reason.

- **Per caller's address:** every request counts, before its body is read, against the address the Audit Log records ([below](#the-address-a-request-comes-from)), with an IPv6 caller counted by its /64. The routes the policy names share one count.
- **Per email address:** a reset request also counts against the normalised email address asked for, whether or not it has an account, so a refusal says nothing about which addresses do. So does a wrong password: each try counts before the password is checked, so tries sent at once can't all be checked, and a right password gives its try back.
- **Refusals** answer `429` with one body, whichever limit fired. Only requests let through are counted, and a restart clears the counts.
- **Covered:** the six routes the policy names count together per caller's address: `POST /api/sign-in`, `POST /api/sign-in/two-factor-code`, `POST /api/password-reset-requests`, `POST /api/password-resets`, `POST /api/invite-acceptances` and `POST /api/passkey-sign-in-options`. The list is `perIpAddressLimitedRoutes` in `src/server/rate-limit/request-rate-limit.ts`. Reset requests and wrong passwords also count per email address. The first refusal in a run for an adult's address writes a `password-reset.rate-limited` or `sign-in.rate-limited` Audit Log entry, and each emailed reset link a `password-reset.requested` one.

- **What a request costs, whatever the limits:** a reset or an Invite acceptance looks its token up before it hashes the new password, so a wrong token costs one indexed lookup and is answered `404` with no argon2 hash (#330); the token is then used only while still live, so two requests with one link can't both set a password. A passkey sign-in's options cost one insert: expired challenges are found through an index on `expires_at` and swept at most once a minute, apart from any request (#331). No email is sent while a database connection is held, a slow mail server gives up within seconds rather than minutes, and a query waits at most 10 seconds for a connection (#329; [email](email.md#when-an-email-is-sent)).

### The address a request comes from

Behind the tunnel every request reaches the app from `cloudflared`'s socket, so the caller's own address comes from Cloudflare's `CF-Connecting-IP` header. The app believes that header only from the one socket `TUNNEL_PROXY_ADDRESS` names: `cloudflared`'s fixed address, `10.43.10.2`, on the `tunnel` network, whose subnet `docker-compose.yml` fixes at `10.43.10.0/24` (#332). A request from any other socket, such as the server's own loopback or another container, is recorded under that socket's address, whatever header it sends, so nobody who reaches the port without the tunnel can choose the address they are logged and limited under. A request from `cloudflared` without a valid header is recorded under `cloudflared`'s address. `X-Forwarded-For` is never read, and Fastify's `trustProxy` stays unset. The Audit Log, the request-rate limits and a Family Device's last address all read the same function, `findClientIpAddress` in `src/server/audit/audit-log.ts`.

Production must name the proxy: the server won't start without `TUNNEL_PROXY_ADDRESS`, or with anything but an IP address. Development has no tunnel and names none, so it believes the header from no socket.

## The server's log

What the server writes to standard output is the `app` container's log, which no export holds and no deletion reaches, so it keeps bare ids and fixed words alone (`src/server/server-log.ts`):

- **A request** is logged by its method, its path without the query string, and its route, such as `/api/children/:childId`. The caller's address isn't logged; a sign-in's is in the audit log.
- **A failing or refused request** is logged as `server.request.failed` (5xx) or `server.request.refused` (4xx), with its route, its status, the error's type, code and stack frames, and a failing query's SQLSTATE as `sqlState`. Its message is "withheld from the log": no SQL, no query parameters, no request body, no driver or mail server text, and a refused body is logged by the path and keyword its schema refused alone.
- **Routes' own lines** name the adults, Children, Family Devices and Families they touch by id, with counts such as Stars awarded or events stored, and nothing else.

Both Compose files rotate every container's log at 10 MB and keep three files, so each container keeps at most 30 MB of log, oldest first out, and loses all of it when the container is recreated, as a deploy with a new image does. A Docker daemon's own `daemon.json` can't loosen this: a service's `logging:` overrides the daemon's default.

## Backups

The `backup` container in `docker-compose.yml` takes a `pg_dump` every night, encrypts it with age to a public key whose private half never lives on the home server, and copies it with rclone to the target set in `.env`, keeping a set number of nights ([ADR 0028](../architectural-decision-record/0028-backups-are-age-encrypted-dumps-sent-with-rclone.md)). It logs in to Postgres as `wizzaroo_backup`, a role of its own with a password of its own (`BACKUP_POSTGRES_PASSWORD`), which reads every table past row-level security (`BYPASSRLS` and `pg_read_all_data`) and can't write, change roles or run programs. The one-shot `backup-role` container sets that role up as the superuser before `backup` starts, on the internal database network only, so the one container with a way out holds a reader's password, not the database's. A failed upload exits with an error and turns the container unhealthy. Every Family, Child and adult the Admin deletes is kept by id alone in `confirmed_deletions`, written by the Admin's reach in the deletion's own transaction and read by no reach; `backup` sends each id to both targets within a minute, and `restore.sh` deletes every one again after restoring, so a backup taken before a deletion never brings it back. Setting it up is in [deploying to the home server](../processes/deploying-to-the-home-server.md#backups), and the tested restore is in [restoring a backup](../processes/restoring-a-backup.md).

Every TOTP secret in a backup is sealed under `TOTP_SECRET_KEY`, which no backup holds ([ADR 0051](../architectural-decision-record/0051-totp-secrets-are-sealed-with-a-key-the-database-never-holds.md)), so a backup and its age key alone make no two-factor code. The owner keeps that key apart from the backups, in the password manager beside the age key. A restore without it loses every adult's TOTP, and each signs in with a recovery code and sets it up again ([the TOTP secret key](../processes/deploying-to-the-home-server.md#the-totp-secret-key)).

Every night the backup also proves the off-site key can't delete what it sends. It sends a probe beside the backup, to `wizzaroo-lock-probes/`, deletes it for good, and checks it is still there, as a key that can only write, to a bucket with Object Lock on, leaves it ([ADR 0030](../architectural-decision-record/0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md)). If the probe is gone, or the check can't tell, it logs `backup.offsite.delete-allowed`, the night fails and the container goes unhealthy (pen test I4, #317).

## The containers

Every container in `docker-compose.yml` runs on a read-only filesystem, with a tmpfs where it must write, drops every Linux capability, and can't gain privileges through a setuid binary. Postgres and the drill's Postgres add back only what their entrypoint needs to own the data directory and become the `postgres` user. Every image is named by its digest, and the builds check pnpm against its published hash and install the backup's `age` and `rclone` at exact versions, so a build runs what the repository names and nothing a moved tag points at (pen test I4, #313, #314). The tunnel serves the routes in `docker-compose.yml` alone, one hostname to the app and a 404 for anything else, and `cloudflared` and the app share only an internal network (#316).
