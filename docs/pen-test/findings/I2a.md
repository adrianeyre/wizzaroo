# I2a: rate limiting, probed and quantified

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The findings note for scope issue #220 (I2a), which answers [H8](../../product-requirements-document/pen-testing.md#h8-nothing-is-rate-limited--medium). It names exploit chains, so it is kept private on the same terms as the PRD. Its figures go to I2b, which sets [the request-rate policy](../../product-requirements-document/pen-testing.md#pre-condition-the-request-rate-policy-before-a-second-school). This note sets no figure. It gives the rates an attacker gets today and what they buy.

- **Trust boundary:** the unauthenticated routes in front of a credential: `POST /api/sign-in`, the two-factor step after it, `POST /api/password-reset-requests` and `POST /api/password-resets`, `POST /api/invite-acceptances`, and `POST /api/passkey-sign-in-options`. Also the address any limit would key on behind cloudflared.
- **Code:** `src/server/auth/sign-in-routes.ts`, `password-reset-routes.ts`, `invite-routes.ts`, `passkey-routes.ts`, `findClientIpAddress` in `src/server/audit/audit-log.ts`, and the `Fastify({ … })` call in `src/server/http-server.ts`, which sets no `trustProxy`. Nothing in `src/server` registers a rate limit.
- **Documented behaviour:** [signing in](../../guide/signing-in.md) and [keeping data safe](../../guide/security-and-backups.md). Neither promises a rate limit. [ADR 0002](../../architectural-decision-record/0002-self-hosted-behind-a-cloudflare-tunnel.md) puts the server behind a Cloudflare Tunnel, and [ADR 0041](../../architectural-decision-record/0041-security-actions-are-kept-in-an-audit-log.md) records each caller's address in the Audit Log.
- **Probes:** the `pen test I2a: rate limiting, probed and quantified` block in `src/integration.test.ts`, in the gated run against a real Postgres. It loads [the fixtures](../fixtures.md) into a database of its own before every probe. Every request arrives as if through the tunnel: from a socket at `172.30.0.2`, with `CF-Connecting-IP: 203.0.113.20`. "In a row" means 101 requests, one more than any limit I2b is likely to set. Every route is probed the same way: a `today_…` test pins what happens, beside an `it.fails` that wants a `429` before the 101st request.

## Verdicts

| Probe                                         | Verdict                                                                                                                          | Finding   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Sign-in: password guessing and spraying       | Confirmed: no limit per address or per account; fixed, unverified (#246)                                                         | #246 (A1) |
| TOTP: pending sign-ins as fresh tries         | Confirmed: no limit on pending sign-ins per adult or per address; per adult fixed, unverified (#256)                             | #256 (A2) |
| Reset requests: emails to one adult           | Confirmed: one email per request, without limit and without an Audit Log entry                                                   | #328      |
| Reset requests: the connection held for email | Confirmed: each email holds a pool connection until it is sent, so a slow mail server stops the server; fixed, unverified (#329) | #329      |
| Resets and Invites: argon2 before the token   | Confirmed: one argon2 hash per request, no credential needed, nothing in the Audit Log; fixed, unverified (#330)                 | #330      |
| Resets and Invites: guessing a token          | Refuted: 256-bit tokens, so no rate buys one                                                                                     | —         |
| Passkey sign-in options                       | Confirmed: a row per call, and an unindexed sweep whose cost grows with the rate; fixed, unverified (#331)                       | #331      |
| The address a limit keys on                   | Confirmed: `CF-Connecting-IP` is believed from any socket. `X-Forwarded-For` is refuted as a lever; fixed, unverified (#332)     | #332      |

H8 is **confirmed** in all four of its bullets and two more: reset emails, and the address. Below, every rate is arithmetic, not load. The cost figures come from earlier notes in this round, measured in the sandbox: one argon2 hash with the library's defaults takes 7.6 ms of one core ([A2](A2.md)), about 400 a second across libuv's four threads ([A1](A1.md)). One Picture Password check takes 8.6 ms ([B4](B4.md)).

## Signing in with a password: confirmed (#246)

A1 measured guessing at one account. This probe sprays one wrong password across every fixture adult with a password, from one address. All 101 tries are answered `401`, all 101 `sign-in.failed` entries carry the caller's address, and a right password from the same address then signs in (`204`). So neither the address nor the account is counted.

- `today_ answers 101 failed sign-ins in a row from one address, one wrong password sprayed across every fixture adult with a password, with 401 each, then signs one of them in from the same address`
- `it.fails`: `answers 429 before the 101st failed sign-in in a row from one address`

**What the rate buys.** argon2 is the only bound, and it bounds every caller together, not each one. An unknown address costs the same, since it is checked against `absentUserPasswordHash`. So one caller gets about 400 tries a second, and with them:

- one common password against 400 accounts a second;
- A1's million-password list against one account in under an hour;
- about 34.6 million `sign-in.failed` entries a day, each written with no credential, burying the real ones (H21).

While a spray runs, every real sign-in waits behind it on the same four threads. The finding is #246, and this probe adds the spraying case to it.

**Fixed, unverified (#246).** The six routes this note probes now count together per caller's address, by the policy's figures, and wrong passwords also count per email address. The spray is answered `401` for its first 20 tries and `429` after, and the right password then signs in only from another address. The probes of wrong tokens and of passkey sign-in options now also see `429` past 20 a minute. The unindexed sweep (#331) and the argon2 before the token (#330) are since fixed too, unverified (below).

## The two-factor code: confirmed (#256)

With the password, `parentA1` (who has TOTP) can start 101 pending sign-ins in a row from one address. All are answered `202`, and 101 rows are written, each good for five codes. A2's arithmetic stands: 46,210 password checks give even odds of guessing the code. At 400 password checks a second that is about two minutes, since each new pending sign-in, and so each five guesses, needs the password again. The probe also finds that an expired pending sign-in is never deleted: a 102nd sign-in leaves all 101 expired rows in place. Nothing a limit decides depends on that, so it is left as a note for a later issue rather than filed here.

- `today_ starts 101 pending sign-ins in a row for one adult from one address, each with its own five tries at the code, and clears none of them once they expire`
- `it.fails`: `answers 429 before the 101st pending sign-in in a row for one adult`

## Asking for a password reset: confirmed (#328, #329)

**One email per request.** `POST /api/password-reset-requests` answers `204` at once and sends the email in the background, unawaited, so the answer can't reveal which addresses have accounts. For a confirmed address, each request replaces the adult's last reset and emails a new link. 101 requests in a row from one address send `coParentA1` 101 emails with 101 different links, and only the last one works: the first answers `404` and the last `204`. None of the 101 requests writes an Audit Log entry.

What the rate buys: no credential, only an address, and the fixtures' addresses are in the plan. The caller gets as many emails sent to that adult as the mail provider will take. The provider is the only bound. `defaultEmailBatching`'s comment says Resend allows "a few requests a second", and every request past that fails, visible only in the container log. So a few requests a second, kept up, spend the plan's sending quota on one inbox. Then the emails Wizzaroo needs stop too: Invites, address checks, other resets, and the "your password was changed" notice that tells an adult their account was taken. No Audit Log entry shows it happening. Filed as #328, _fixed, unverified (#328)_.

- `today_ emails one adult 101 reset links for 101 requests in a row from one address, writes no Audit Log entry for any, and leaves only the last link working`
- `it.fails`: `answers 429 before the 101st reset request in a row for one adult's address`

**A pool connection held for each email.** `sendPasswordReset` calls `sendEmail` inside the transaction that writes the reset. So each email holds one of the database pool's connections until the mail server answers, and the pool has node-postgres's default of 10. In the probe the mail server is held, and ten reset requests (each answered `204`) take every connection. `GET /health`, which runs `select 1`, then hasn't answered after a second. Neither has anything else that needs Postgres: every sign-in, every Family Device's play call, every page of every dashboard. The pool sets no `connectionTimeoutMillis`, so they wait for as long as the mail server does. Nodemailer's documented defaults allow that to be up to 2 minutes to connect, 30 seconds for the greeting and 10 minutes of socket silence.

What the rate buys: ten requests, once the mail server is slow. A caller can't make it slow, but whenever it is, during an outage, under its own rate limit or across a slow network, ten unauthenticated requests stop the whole service for as long as it stays slow. They are unawaited, so a thousand requests start a thousand background sends. Ten hold the pool, and the rest queue in memory with no bound. Filed as #329.

**Fixed, unverified (#329).** The reset is committed first and its email sent after, holding no connection; a link that can't be sent is deleted again. Every other route that emailed inside a transaction or a reach does the same: links and Invites are sent once committed, an Invite that can't be sent is marked as not sent, and the security notices that must go before their change (a password changed or reset, two-factor off, passkeys, Family Devices, an email address moving) are sent between two transactions, after the change is checked and before it is saved. The SMTP transport now gives up after 10 seconds to connect, 10 for the greeting and 30 of silence, and both pools fail a query that has waited 10 seconds for a connection. The bulk upload's queue already sent after its transaction. The per-email-address and per-address limits also bound how many reset sends one caller starts (#328, #246).

- `holds none of the database pool's connections while a reset email waits on the mail server, so a pool's worth of requests while the mail server is slow leaves /health answering (regression)`
- `answers /health while a pool's worth of reset emails wait on a slow mail server`, no longer `it.fails`

## Setting a password from a reset link or an Invite

**argon2 before the token: confirmed (#330).** `POST /api/password-resets` and `POST /api/invite-acceptances` check the new password's length, then `await hash(…)` it, and only then look up the token. The probe measures the process's CPU time over ten requests on each route, all with random tokens. It compares a 12-character password, which is hashed, with an 11-character one, refused `400` before the hash. On both routes the difference is more than half a measured argon2 hash, and every request is answered `404`.

What the rate buys: no credential, no address, no token, just a random string and twelve characters. About 400 requests a second from one caller hold all four of libuv's threads. Those threads also run every sign-in's argon2, B4's Picture Password checks and `@fastify/static`'s file reads, so sign-ins and the client's own files queue behind the flood. Memory stays bounded, since four hashes run at a time at 19 MiB each. The Audit Log records nothing, because a refused token writes no entry (the next probe). The sign-in route is the same lever at the same price, but it writes a `sign-in.failed` entry per request. This one leaves no trace. B4 filed the Picture Password case as #300 (low), since fixed, unverified, by #259's `onRequest` reach check, and this is filed at the same severity as #330.

**Fixed, unverified (#330).** Both routes now look the token up first and answer a wrong one `404` before any hash. The token is then used only while still live: a reset deletes its row on the condition that it hasn't expired, and an Invite acceptance finds its Invite again under a row lock, so two requests with one token still can't both set a password.

- `looks the token up before any argon2 hash, refusing a reset and an Invite acceptance whose token is wrong with 404 and spending no hash on either (regression)`
- `spends no argon2 hash on a reset or an Invite acceptance whose token is wrong`, no longer `it.fails`
- `lets one of two resets sent at once with one live link set the password, and refuses the other with 404, now the token is looked up before the hash`

**Guessing a token: refuted.** Reset and Invite tokens are `buildSecretToken()`: 32 bytes from Node's cryptographic random source, sent as base64url, and kept only as their SHA-256. 101 wrong tokens in a row on each route are each answered `404`, without limit and with no Audit Log entry. But a guess has a 2⁻²⁵⁶ chance for each live token. At A1's 400 a second, or at any rate a network carries, no number of guesses in any amount of time comes close. The missing limit on these routes costs CPU (above), not a token.

- `issues reset and Invite tokens of 32 random bytes and keeps only their SHA-256, so no request rate guesses one`
- `today_ answers 101 wrong tokens in a row from one address on each route with 404, and writes no Audit Log entry for any`
- `it.fails`: `answers 429 before the 101st wrong token in a row from one address`

## Passkey sign-in options: confirmed (#331)

`POST /api/passkey-sign-in-options` takes no body and no credential. Each call runs `DELETE FROM passkey_challenges WHERE expires_at < now()` and then inserts a challenge that lives 5 minutes. 101 calls in a row from one address are each answered `200` and leave 101 rows. The table's only index is its primary key, `challenge`, so each sweep reads the whole table.

What the rate buys, by arithmetic: at a steady R calls a second, the table holds 300 × R live rows, and each call's sweep reads all of them. So the sweeps read 300 × R² rows a second:

| Calls a second | Rows in the table | Rows swept a second |
| -------------- | ----------------- | ------------------- |
| 10             | 3,000             | 30,000              |
| 100            | 30,000            | 3,000,000           |
| 300            | 90,000            | 27,000,000          |
| 1,000          | 300,000           | 300,000,000         |

The cost per call grows with the rate, so the attack gets cheaper for the caller as it goes on. A sequential scan of a narrow table runs in the order of 10⁷ rows a second on one core. That is an assumption, not measured here. So somewhere between 100 and 300 calls a second from one caller, the sweep alone fills one of Postgres's cores. Every call also takes a pool connection twice, competing with the rest of the service. Filed as #331.

**Fixed, unverified (#331).** Migration `0057` indexes `passkey_challenges` on `expires_at`, and a call no longer sweeps before its insert. Each server sweeps expired challenges at most once a minute, through the index, started by whichever call finds a sweep due and not waited for. So a call costs one insert whatever the rate, and the table holds about six minutes of challenges. The per-address limit (#246) bounds the rate one caller gets.

- `stores a challenge for only a burst of 101 requests in a row from one address with no credential, answering the rest 429, in a table indexed on when a challenge expires (regression)`
- `sweeps expired challenges at most once a minute, apart from the insert, so a call's cost doesn't grow with how often it is called (#331)`

- `today_ stores a challenge for each of 101 requests in a row from one address with no credential, in a table with no index on when a challenge expires`
- `it.fails`: `answers 429 before the 101st passkey sign-in options request in a row from one address`

## The address a limit keys on: confirmed (#332)

There are two ways to find a caller's address behind cloudflared:

- `request.ip`, which is the tunnel's own socket while `trustProxy` is unset;
- `findClientIpAddress`, which the Audit Log uses and which reads `CF-Connecting-IP` when the header holds an IP.

**`X-Forwarded-For`: refuted as a lever.** With `trustProxy` unset, Fastify ignores it. Two callers arriving through the tunnel with two different `X-Forwarded-For` values and no `CF-Connecting-IP` are both recorded under the tunnel's address. That is safe from forgery, but it puts every caller in one bucket, which is the half of H12 that a limit keyed on `request.ip` would inherit.

- `ignores X-Forwarded-For, so two callers the tunnel brings without CF-Connecting-IP are both recorded under the tunnel's own address`

**`CF-Connecting-IP` from any socket: confirmed.** `findClientIpAddress` believes the header whatever socket brought it. Two requests from loopback naming two different addresses are recorded under those two addresses. Through the tunnel the header is Cloudflare's own: its documentation says the edge sets it, and that was not exercised here. But anything that reaches port 4310 another way can name any address. Today that means the host (Compose publishes the port on `127.0.0.1` only) and any container on the `tunnel` network. Today that makes the Audit Log's address forgeable by those callers. Once a limit keys on it, those callers get a fresh bucket per request, and can put someone else's address in a full one. Filed as #332, at low, since every such caller is already on the host.

**Fixed, unverified (#332).** `findClientIpAddress` believes `CF-Connecting-IP` only from the socket `TUNNEL_PROXY_ADDRESS` names, and records any other socket's own address. The variable is required outside development. Compose fixes the `tunnel` network's subnet at `10.43.10.0/24` and gives `cloudflared` `10.43.10.2`, which it names; the pen-test deployment gives its stand-in `10.43.11.2` on `10.43.11.0/24`. Development names no proxy, so the header is believed from no socket there. `trustProxy` stays unset. The rate limit and a Family Device's last address read the same function.

- `records a request from any socket but the named proxy's under that socket's address, whatever CF-Connecting-IP names, loopback included, and believes the header from the proxy alone (regression)`
- `believes CF-Connecting-IP from no socket but the named proxy's, so a caller that reaches the port another way can't choose the address it is recorded and limited under`, no longer `it.fails`
- `believes CF-Connecting-IP from no socket while no proxy is named, as in development`

## For I2b: the numbers and the key

I2b sets the figures. These are what this round measured or worked out, for it to set them against.

| Route                               | What one request costs today                              | What one caller gets with no limit                                          |
| ----------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| `POST /api/sign-in`                 | one argon2 hash (7.6 ms of a thread) and an Audit Log row | about 400 guesses a second, shared by every caller; a spray across accounts |
| `POST /api/sign-in/two-factor-code` | five codes per pending sign-in, each a sign-in's argon2   | even odds at a TOTP code in about 2 minutes                                 |
| `POST /api/password-reset-requests` | one email, and a pool connection until it is sent         | the mail provider's quota; the whole service, while mail is slow            |
| `POST /api/password-resets`         | one argon2 hash, then `404`, unlogged                     | all four libuv threads at about 400 a second                                |
| `POST /api/invite-acceptances`      | one argon2 hash, then `404`, unlogged                     | the same, on the same threads                                               |
| `POST /api/passkey-sign-in-options` | a row, and a sweep of 300 × R rows                        | a Postgres core somewhere between 100 and 300 a second                      |

**The key, for the one decision H12 and the policy's section ask for:**

- **Per address:** `CF-Connecting-IP`, believed only from the cloudflared container's address on the `tunnel` network. That means `trustProxy` set to that one address, or the same check in `findClientIpAddress`. From any other socket, use the socket's own address. Never `trustProxy: true`, and never `X-Forwarded-For`. The Audit Log and the limit should read the same function, so what is limited is what is logged. An IPv6 caller should be keyed on its /64, since one host commonly holds the whole prefix.
- **Per account:** the normalised email for sign-in and reset requests, counted whether or not the address has an account, so the limit can't reveal which addresses do. For pending sign-ins and TOTP codes, the user id (#256).
- **Routes with no account before the token:** per address only, for resets, Invite acceptances and passkey sign-in options. Checking the token before the hash (#330) and the sweep off the request path (#331) cut what each of those requests costs, whatever limit is set.
- **Per process or across the deployment:** Compose runs one app container, so counters held in the process cover the whole deployment today. If a second container is ever added, they no longer do.

## Findings filed

| Finding | Severity | Title                                                                        |
| ------- | -------- | ---------------------------------------------------------------------------- |
| #328    | medium   | Anyone can send an adult unlimited password reset emails, unlogged           |
| #329    | medium   | Each reset email holds a database connection until the mail server answers   |
| #330    | low      | Resets and Invite acceptances spend an argon2 hash before checking the token |
| #331    | medium   | Passkey sign-in options write a row per call and sweep an unindexed table    |
| #332    | low      | The Audit Log believes CF-Connecting-IP from any socket                      |

Sign-in guessing and the TOTP bound were already filed, as #246 and #256, so they are not filed again.

## What this round didn't run

The probes were written, typechecked and linted in a sandbox with no container runtime, so the gated run skipped them there. The verdicts above rest on reading the code and on the probes as written, until the gated run is executed on a host with Docker and its output posted on #220. Nothing was exercised against the pen-test deployment or through a real tunnel. Every rate is arithmetic, not load. The fixes since (#246, #256, #328, #329, #330, #331, #332) are unverified until a later round probes the pen-test deployment.
