# PRD: Pen-testing Wizzaroo

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

**Status:** Draft v0.1: scope, opening register and issue index. The rules of engagement, statement of work, credentials package and fixtures are produced by the enablement issues (E1-E5), not by this file.
**Date:** 17 November 2026
**Owner:** Adi
**Label:** `prd:pen-test`

This file is the brief. The product canon stays [`wizzaroo.md`](./wizzaroo.md), and decisions stay in [`docs/architectural-decision-record/`](../architectural-decision-record/). Capitalised terms (Family, Child, Family Device, Picture Password, Teacher, Admin…) are used exactly as [`GLOSSARY.md`](../../GLOSSARY.md) defines them. Nothing here restates a product rule; a tester who needs one reads it there.

> **Keep this file private.** The opening register below names files, lines and exploit chains. It must not be published, and this repository must not be made public, while any hypothesis or finding here at `severity:high` or `severity:critical` is open.

---

## Terms used in this file

These are words about the engagement, not about Wizzaroo, so they live here and not in the glossary.

| Term                    | Meaning                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Round**               | One pen-test engagement: a window, a scope, a set of findings and a sign-off. This file describes the first.                                  |
| **Hypothesis**          | An entry in the opening register (H1, H2…): what the code reads like from outside, with the file that has to be disproved. Not yet a finding. |
| **Scope issue**         | A GitHub issue under `prd:pen-test` that partitions the surface (E1, A1, B1…) and lists what to probe there.                                  |
| **Finding**             | A confirmed weakness, filed as its own issue with one `severity:*` label and a pointer to its scope issue.                                    |
| **Verdict**             | What the round concluded about a hypothesis: confirmed (and filed as a finding), refuted, or confirmed as a documented decision.              |
| **Pen-test deployment** | The dedicated Compose stack the round runs against. Never production.                                                                         |

---

## Current state of play

Wizzaroo is a Fastify API serving an offline-first React PWA, with Postgres behind it, all in Docker Compose on the home server and reached through a Cloudflare Tunnel with no Cloudflare Access in front ([ADR 0002](../architectural-decision-record/0002-self-hosted-behind-a-cloudflare-tunnel.md)). Its own sign-in is therefore the only gate between the internet and the data.

What is built and so in scope:

- **Adults:** email and password (argon2), passkeys, TOTP two-factor with recovery codes, adding a passkey on a phone by QR code ([ADR 0036](../architectural-decision-record/0036-adding-a-passkey-on-a-phone-by-qr-code.md)), password resets, email address checks and Invites.
- **Schools and Teachers:** Schools, Teachers and their Year Groups, Admin- and Teacher-sent Invites, bulk creation by CSV, the Admin and Teacher dashboards, Teacher locks, and the rule that Teachers and the Admin need a second factor. Phase 9 is built (section 13 of `wizzaroo.md`): `src/server/schools/`, `src/server/people/`, `src/server/bulk/`, and the Teacher policies in `src/server/drizzle/0020_schools-and-teachers-reach.sql`.
- **Family Devices:** a long-lived device credential, Picture Passwords checked on the device ([ADR 0005](../architectural-decision-record/0005-family-devices-and-picture-passwords.md)), and the event outbox the server replays ([ADR 0004](../architectural-decision-record/0004-offline-play-records-events-the-server-decides.md)).
- **Separation:** API reach from the credential, then Postgres row-level security through the `wizzaroo_reach` role ([ADR 0026](../architectural-decision-record/0026-schools-and-teachers.md), [ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)).
- **Family data:** export, deletion requested by a Parent and confirmed by the Admin, the Admin access log, and Classmates visiting Rooms.
- **Audit:** the Audit Log of sign-ins, credential changes, and people, Schools and Families created or deleted, read by the Admin alone, append-only to the reach role and kept for twelve months ([ADR 0041](../architectural-decision-record/0041-security-actions-are-kept-in-an-audit-log.md)).
- **Operations:** nightly age-encrypted backups sent with rclone to the NAS and to a locked B2 bucket ([ADR 0028](../architectural-decision-record/0028-backups-are-age-encrypted-dumps-sent-with-rclone.md), [ADR 0030](../architectural-decision-record/0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md)), and the GitHub Actions PR checks.

**Nothing in this tree has ever been probed by anyone who did not write it.** Every review so far has been by its author or by agents working to the same brief. Integration tests prove that one Family can't read another's data, but a test written by the person who wrote the rule shows the rule was reviewed, not that it was attacked.

---

## Problem statement

**Before a second School is added, someone working against Wizzaroo rather than for it must probe this tree against a Wizzaroo-shaped scope and file what they find, so the owner can sign the separation of Families, Schools and Year Groups off against evidence rather than against the care of whoever built it.**

Three reasons to do it now:

1. **Separation is the product.** Section 11 of `wizzaroo.md` promises that Families, Schools and Year Groups are kept apart. Other people's children's data arrives with the second School, and a leak of it can't be taken back.
2. **The surface is still small.** Every route, migration and policy fits in one reading. This is the cheapest the round will ever be.
3. **Staff accounts see many Families.** A Teacher or the Admin taken over is many Families exposed at once, and the second factor that guards them is young.

---

## Engagement shape

- **Who runs it:** this round is run by the owner and by agents (Sandcastle and the AI Office) working each scope issue against this file. **A second round by an external tester is a pre-condition of adding a second School** (see [the pre-condition](#pre-condition-an-external-round-before-a-second-school)).
- **Type: grey-box.** Testers get read-only source, the pen-test deployment's URL, the fixture Families and their credentials, and one account per role. They do **not** get the database password, the tunnel token, the email platform's API key, rclone or B2 credentials, the age key, the CI secrets or write access to the repository. Finding any of those anyway is itself a finding.
- **Target: a dedicated pen-test deployment.** Its own Compose project, its own Postgres volume, its own `.env`, reachable only by the testers. Never `wizzaroo.adrianeyre.co.uk`, not even passive scanning through the tunnel, because production holds real Children's data. Teardown destroys the volume, not just the containers.
- **Backups are tested against throwaway targets:** a scratch directory standing in for the NAS and a throwaway bucket standing in for B2. Never the real NAS or the real bucket.
- **Data: synthetic only,** generated by a seed script that ships with the deployment (E2). The deployment sets `SECOND_SCHOOL_GATE_MET=true` so it can hold two Schools; that flag is set on the pen-test deployment only and never in production.
- **Rules of engagement** (E3) are codified before the window opens: the window in dates, the in-scope hosts, no destructive testing outside the pen-test deployment, an out-of-band channel for a critical finding, and the remediation targets below.

### Explicitly out of scope

- **Cloudflare, Resend and Backblaze as platforms.** How Wizzaroo _uses_ them (the tunnel's routing, the email platform's address and key, the bucket's lock and key) is in scope; the platforms themselves are not.
- **Denial of service and volume testing.** Not a pen-test activity. A missing rate limit is in scope as a finding, worked out by arithmetic; exercising it is not.
- **Social engineering, phishing, and physical access** to the home server, the NAS or a Family Device.
- **Production data**, and anything reached through `wizzaroo.adrianeyre.co.uk`.
- **Picture Passwords as a security boundary.** [ADR 0005](../architectural-decision-record/0005-family-devices-and-picture-passwords.md) says they keep siblings apart and are not a boundary. A device credential, or a Picture Password hash, that escapes the device _is_ in scope.
- **The 3D client's game logic,** except where it produces events the server accepts.

---

## The tester's opening register

This is the reconnaissance a tester would do on day one, done in advance so the round starts from hypotheses rather than from a directory listing. **Each entry is a hypothesis, not a confirmed finding.** It says what the code reads like from outside and names the file that has to be disproved. Where a behaviour is deliberate and documented, that is said plainly; a documented decision is still a finding when nothing records when it has to stop being true.

Severities are the **opening** estimate, for triage order only. File and line references are as of commit `35cd990`.

### H1: A staff password alone enrols a second factor · critical

Teachers and the Admin must use two-factor authentication or a passkey (section 8 of `wizzaroo.md`). `needsSecondFactor` (`src/server/auth/signed-in-parent.ts:90`) refuses staff routes to a sign-in that isn't two-step. But a password sign-in by a user with no TOTP secret is created with `isTwoStep: false` and a full session cookie (`src/server/auth/sign-in-routes.ts:213-222`), and the routes that enrol a second factor run under `runAsSignedInUser`, which skips the second-factor check: `POST /api/totp-setups` and `POST /api/two-factor` (`src/server/auth/two-factor-routes.ts:119,151`), passkey registration (`src/server/auth/passkey-routes.ts:347-367`) and the passkey hand-off. Turning TOTP on then marks the session two-step.

Consequence: anyone with a staff member's password, whose account has passkeys but no TOTP, can enrol their own TOTP or passkey and hold full staff reach. A reset link gives the same chain (`src/server/auth/password-reset-routes.ts`), so controlling a Teacher's mailbox is enough. ADR 0036 makes a password-only first sign-in deliberate for a _new_ Teacher; probe whether it is also open to an _established_ one.

**Verdict (A5, #201): confirmed, critical, as #242, and confirmed as a documented decision for a new Teacher, as #243 (low).** A password-only staff sign-in is refused every staff route. It opens 17 account routes, five of which add a second factor, and adding either one marks that sign-in two-step. Nothing tells a new Teacher from an established one, so a Teacher with a passkey and no TOTP is opened by their password, or by a reset link to their mailbox, exactly as a new Teacher is. An Invite opens the same chain for an established Teacher only once they have removed their password, which is H2. Refuted for staff with TOTP: after a reset, the sign-in still asks for a code. The probes, and the 17 routes, are in [`docs/pen-test/findings/A5.md`](../pen-test/findings/A5.md). #242 is fixed, unverified: a staff sign-in that hasn't proved a second factor the account already has can't add one. #243 is fixed, unverified: a staff account with none sets up its first from a password alone only for 7 days after its login is made, its Invite accepted or an Admin's reset link used.

### H2: An Invite takes over a passkey-only account · critical

An adult can remove their password and keep only passkeys (`DELETE /api/password`, `src/server/auth/password-change-routes.ts:191`), leaving `password_hash` null. `createInvite` refuses only when `password_hash` is not null (`src/server/people/invites.ts:77`), and `findLiveInvite` accepts an Invite for any user whose `password_hash` is null (`src/server/people/invites.ts:168`). Staff can create a copy-link Invite that isn't emailed (`src/server/people/people-routes.ts:608-626`), and accepting it sets a password and signs in as that adult (`src/server/auth/invite-routes.ts:65-95`).

Probe: can a Teacher take over a passkey-only Parent in their reach, and the Admin a passkey-only Teacher? Teacher reach is read-only by design ([ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)); this would turn it into a Parent's full write reach over that Family.

**Verdict (A4, #202): confirmed**, filed as #249 (critical), _fixed, unverified_. `teacherAYear3` copied an Invite for `parentA2PasskeyOnly`, accepted it with a password of their own and signed in as that Parent; the Admin did the same to `teacherAYears5And6` once they had removed their password. The adult is told only to confirm their address, which is marked unconfirmed. Evidence in [`docs/pen-test/findings/A4.md`](../pen-test/findings/A4.md).

**Found under B2 (#207), not this entry's verdict, which is A4's:** a Teacher reaches the same consequence without a passkey-only Parent. They make a Family's next adult with a copy-link Invite, accept it themselves, and hold a Parent's write reach over every Child in the Family: #264 (critical), fixed, unverified. See [`docs/pen-test/findings/B2.md`](../pen-test/findings/B2.md).

### H3: A session or a mailbox becomes a permanent takeover · high

Changing an email address needs only a session: no re-entered password, no second factor even for staff, and no notice to the old address (`src/server/auth/email-address-check-routes.ts:148-176`). Followed by a reset, a stolen session becomes the account. Separately:

- sessions last a fixed 30 days with no idle timeout (`src/server/auth/sign-in-routes.ts:42`);
- signing out ends only the current session;
- accepting an Invite or confirming an email change revokes no other session;
- the email-change refusal "Another Parent already uses that email address" tells any signed-in adult which emails have accounts.

Probe the whole chain, and whether any security notice reaches the real owner of the account in time.

**A1 verdict (#203), on session lifetime and revocation:** confirmed. A sign-in lasts a fixed 30 days with no idle timeout, for staff too (#244, fixed, unverified). Changing a password ends every other sign-in and a reset ends them all, as documented; signing out ends only that browser's, a documented decision. Setting a password, accepting an Invite and confirming an email change end none, and an adult has no way to end their other sign-ins short of a password change (#245, fixed, unverified). The email-change chain, the notices and the email oracle are A4's. [Findings note](../pen-test/findings/A1.md).

**Verdict (A4, #202): the email-change chain is confirmed.** A bare session changes the address, for Parents and for staff whether or not their sign-in used a second factor, and a reset then takes the account for good: #250 (high), _fixed, unverified_. The old address is told nothing, and every notice after the change goes to the new one: #251 (medium), _fixed, unverified_. A reset link outlives a password change and an email change, and a pending email change outlives the owner's reset: #252 (medium), _fixed, unverified_. The refusal tells any signed-in adult which emails have accounts, staff ones included: #253 (low), _fixed, unverified_. Every token works once and expires, which is refuted. The session-lifetime and sign-out bullets are A1's. Evidence in [`docs/pen-test/findings/A4.md`](../pen-test/findings/A4.md).

### H4: The app connects to Postgres as its superuser · high

`docker-compose.yml` creates the database with `POSTGRES_USER: wizzaroo`, which the official image makes a superuser, and `DATABASE_URL` connects as that same user. The app runs the migrations at boot (`src/server/database.ts`), owns every table, and is granted `wizzaroo_reach` (`src/server/drizzle/0018_row-level-security.sql`). Row-level security is enabled but not forced, so every query run as the owner bypasses it. That includes, by design, the credential checks and every staff-initiated write ([ADR 0027](../architectural-decision-record/0027-row-level-security-through-a-reach-role.md)).

Consequence: the second wall holds against a query that forgets its filter inside a reach transaction, and not at all against any bug on an owner path. A superuser can also `RESET ROLE`, `ALTER TABLE … DISABLE ROW LEVEL SECURITY`, and run `COPY … PROGRAM` inside the Postgres container. The backup container uses the same credentials. Probe: with the app's own connection string, what can't a tester do?

`docs/guide/security-and-backups.md` says the owner is used only before anyone is known; ADR 0027 says staff writes run as the owner too. The documents disagree, and the ADR matches the code.

**Found under B2 (#207), not this entry's verdict, which is D1's:** one such bug on an owner path. A Teacher's bulk upload accepts an existing Parent at the Teacher's School who is outside their reach, and the owner then adds a Child and adults to that Family: #265 (high), fixed, unverified. See [`docs/pen-test/findings/B2.md`](../pen-test/findings/B2.md). B3 (#208) found the same hole, a new adult with an Invite and full Parent reach included, as #286 (critical), _fixed, unverified_ by #265's upload check. See [`docs/pen-test/findings/B3.md`](../pen-test/findings/B3.md).

**Verdict (D1, #210): confirmed**, filed as #273 (high), now fixed, unverified. The app's connection is a superuser that bypasses row-level security. Inside a Parent's reach, `RESET ROLE` reads every Family's Children. The app's connection turns row-level security off, runs `id -un` in the database container with `COPY … PROGRAM` (`postgres`), and empties the Audit Log with `TRUNCATE`. `TRUNCATE` through any reach, even the Admin's, is refused, which is refuted. Owner paths bypassing row-level security is confirmed as ADR 0027's documented decision, and is folded into #273. Every owner-path query was read, and the credential checks and single staff writes can't be steered (probed). A Teacher's CSV upload can: it adds a Child to a Family at the Teacher's School outside their reach, #277 (high), fixed, unverified, and its preview tells them which emails belong to staff or to another School's Parents, #278 (low), _fixed, unverified_. The backup container logs in with the app's user and password, the superuser, on a network with a way out: #279 (medium), fixed, unverified. Evidence in [`docs/pen-test/findings/D1.md`](../pen-test/findings/D1.md).

### H5: Row-level security checks rows, not columns · high

The policies decide which rows a reach can touch, not which columns it may change. As written:

- `users_within_reach` (`src/server/drizzle/0018_row-level-security.sql:41`) lets an adult UPDATE their own row and their co-Parents' rows, including `roles`, `password_hash` and `email`;
- a Parent's reach can INSERT into `family_parents` for its own Family;
- a Family Device's reach can UPDATE its own `family_devices` row, including `revoked_at`.

Each needs an API bug to reach, which is the point: these rules are enforced in the API alone, and the second wall promises otherwise. Probe each against the policies directly.

**Verdict (D1, #210): confirmed** for every bullet. As `wizzaroo_reach` with `parentA1`'s settings, a co-Parent's `roles`, `password_hash` and `email` each change, and the planted password signs in as them. A Parent's own `roles` also change, to the Admin's, and their next sign-in is served the Admin's routes: #274 (high), now fixed, unverified. `parentB`'s reach inserts the Admin into `family_parents` for Family B, after which it can change the Admin's `password_hash` and clear their TOTP, and the planted password signs in: #275 (high), fixed, unverified. A Family Device's reach clears `revoked_at` on itself and on its Family's revoked device, whose token then plays again: #276 (medium), fixed, unverified. Evidence in [`docs/pen-test/findings/D1.md`](../pen-test/findings/D1.md).

### H6: Some Admin reads are not logged, and the log can be changed · high

The Admin access log is written for `GET /api/children/:id/progress`, inside the transaction and before the read (`src/server/children/children-routes.ts:730-744`), which is the right shape. But:

- `GET /api/school-children` (`src/server/children/children-routes.ts:704`) returns the progress of every Child in the Admin's reach, which is every Child, and writes no log row;
- `GET /api/admin/families` (`src/server/admin/admin-routes.ts:95`) lists every Family's Children with no log row;
- the reach role holds `SELECT, INSERT, UPDATE, DELETE` on `admin_access_logs` (`src/server/drizzle/0021_schools-and-teachers.sql:106`), so the Admin's own reach can change or erase the record of what the Admin looked at.

"Logged Admin access" is an item on the second-School gate. Probe every reply path an Admin can take to a Child's data, and assert exactly one log row per read that was _served_, not attempted.

**Verdict (D2, #211): confirmed.** The progress route is the right shape: one row per read served, naming the Admin and the Child, and none for a refusal. A `HEAD` on it is the exception: it writes a row and serves no progress (#271, low; fixed, unverified). `/api/school-children` serves the Admin every Child's progress with no row (#267, high; fixed, unverified). So do nine more reply paths: `/api/admin/families`, `/api/parents`, `/api/admin/deletion-requests`, and six Child writes that reply with the Child (#268, high; fixed, unverified). The Admin's reach rewrites rows, writes them in another adult's name and erases them (#269, high; fixed, unverified). Every other reach is refused any change, and no reach holds `TRUNCATE`. A row holds who, which Child and when, and nothing that says what was read (#270, low; fixed, unverified). Probes: [`docs/pen-test/findings/D2.md`](../pen-test/findings/D2.md).

**Verdict (B3, #208), for the Admin's routes: confirmed, as #287 (high; _fixed, unverified_) and #288 (medium; _fixed, unverified_).** `GET /api/children/:childId/progress` writes exactly one row per read it serves and none for a refused one. `GET /api/school-children` serves every Child's progress, and `GET /api/admin/families` and `GET /api/parents` every Child's nickname, with no row. Deleting a Child directly erases that Child's rows, since `admin_access_logs.child_id` cascades (#287). Every Admin change in ADR 0041's list writes its Audit Log entry. Stars, Family Chest coins, a School's name, and a Child's details, limits, Teacher locks, Classmate visits and birth write none (#288). The reach role's grants on the log are D2's. See [`docs/pen-test/findings/B3.md`](../pen-test/findings/B3.md).

### H7: Unexpected errors return the failing SQL and its parameters · medium

There is no `setErrorHandler` (`src/server/http-server.ts`). Fastify's default handler sends `error.message` on a 5xx, and Drizzle's `DrizzleQueryError` message is `Failed query: <SQL>\nparams: <values>`. A plausible unauthenticated trigger is a NUL byte, which the JSON schemas allow and Postgres refuses: for example `POST /api/sign-in` with `"email": "a\u0000"`, or a Character or device name containing `\u0000`. Probe every route for driver text, SQLSTATE codes, table names, parameters or file paths in a response body.

**Verdict (I1, #219): confirmed**, filed as #310 (medium), fixed, unverified: every unexpected error now answers one fixed body, and the detail goes to the log alone. A NUL byte at `POST /api/sign-in`, with no credential, answers 500 with the whole sign-in query, `"users"."password_hash"` and `"totp_secret"` among its columns, and the typed email. A Parent's new Child gets back the server's Picture Password hash among its parameters. With Postgres refusing the app's password, 78 of the 80 routes answer 500. 72 bodies carry the failing query and its parameters, the credential lookups among them, which show that sign-in and device tokens are kept as unsalted SHA-256. The 6 routes that open a transaction first send the driver's message, the database user and SQLSTATE `28P01`. No answer carries a file path, a stack, a version or a commit, and no answer below 500 names a table. See [`docs/pen-test/findings/I1.md`](../pen-test/findings/I1.md).

### H8: Nothing is rate-limited · medium

There is no rate-limit plugin anywhere in `src/server`. Consequences to quantify by arithmetic, not by load:

- password guessing on `/api/sign-in` is unlimited, and there is no account lockout;
- TOTP allows 5 tries per pending sign-in, but pending sign-ins can be created without limit once the password is known;
- `/api/password-resets` and `/api/invite-acceptances` hash the new password with argon2 before checking the token, so an unauthenticated caller can spend the server's CPU;
- `/api/passkey-sign-in-options` writes a database row per call with no authentication.

The figures belong to [the request-rate pre-condition](#pre-condition-the-request-rate-policy-before-a-second-school) and are not set.

**A1 verdict (#203), on password guessing:** confirmed (#246, fixed, unverified). 101 wrong passwords in a row are each answered 401, and the right one still signs in. Only argon2 bounds the rate: about 400 guesses a second on four libuv threads where it was measured, so a million-password list for one account takes under an hour, and each guess writes an Audit Log entry. The other bullets are I2a's. [Findings note](../pen-test/findings/A1.md).

**B4 verdict (#209), on work done before the sign-in check:** confirmed, a fifth case beside the bullets above (#300, low), _fixed, unverified_ by #259's `onRequest` reach check, which now refuses a caller with no sign-in before any schema check or hash. Three routes hash a Picture Password with no credential, before refusing it 401: `POST /api/children`, `PUT /api/children/:childId/picture-password` and `PUT /api/play/children/:childId/picture-password`. The hash is 100,000 rounds of PBKDF2, about 8.6 ms of a worker thread each where it was measured, or about 465 requests a second to hold every worker thread argon2 also uses. The same finding records that 43 routes answer a request with no sign-in with its schema error before refusing it. The rate figures stay I2a's. [Findings note](../pen-test/findings/B4.md).

**I2a verdict (#220), on every bullet and the key:** confirmed. Every route below answers 101 requests in a row from one address with no `429`.

- Sign-in is #246 again: one wrong password sprayed across every account is also unlimited. Fixed, unverified (#246).
- The TOTP bullet is #256: even odds at a code take about 2 minutes of password checks. Fixed, unverified (#256).
- Reset requests send one adult one email each, without limit and unlogged, until the mail provider's quota is spent (#328, medium); #328 is fixed, unverified.
- Each reset email holds one of the 10 pool connections until the mail server answers, so ten requests while mail is slow stop `/health` and everything else (#329, medium); #329 is fixed, unverified.
- Resets and Invite acceptances spend an argon2 hash before the token check, with no credential and nothing in the Audit Log. About 400 a second hold all four libuv threads (#330, low); #330 is fixed, unverified.
- Guessing their 256-bit tokens is refuted.
- `/api/passkey-sign-in-options` writes a row per call and sweeps the unindexed table each time, so the sweeps read 300 × R² rows a second and fill a Postgres core somewhere between 100 and 300 calls a second (#331, medium); #331 is fixed, unverified.
- For the key, `X-Forwarded-For` is ignored, but `CF-Connecting-IP` is believed from any socket, so a caller who reaches port 4310 without the tunnel chooses its address (#332, low); #332 is fixed, unverified.

The numbers for I2b, and the key it should take, are in the [findings note](../pen-test/findings/I2a.md).

### H9: A Family Device credential lives for ever, and carries every Picture Password hash · medium

The device cookie `wizzaroo_family_device` has a 400-day max-age that slides on every play call, and the server keeps no expiry or last-used time (`src/server/family-devices/signed-in-family-device.ts`); revocation is checked on every request, which is right. `GET /api/play/family` sends every Child's Picture Password hash to the device (`src/server/family-devices/family-device-routes.ts:307,338`), which keeps it in `localStorage` (`src/client/family-device/playable-family.ts`). The hash covers 729 combinations, so it falls to an offline search at once, and the check isn't constant-time (`src/server/children/picture-password.ts`).

The Picture Password half is deliberate (ADR 0005) and is recorded here so the round confirms it as a documented decision rather than re-finding it. The credential half is not documented: probe what a copied device cookie can do, for how long, and whether the Parent can tell.

**Verdict (F1, #215), on the credential half: confirmed.** A copied cookie opens the five play routes for its own Family from any address, which is ADR 0005's play-only credential and is confirmed as a documented decision. It works for ever: the server keeps no expiry, so the 400 days binds only the browser that was told it (#301, medium; fixed, unverified). The Parent can't see when or where a device was last used, so a copy playing elsewhere looks like the tablet at home (#302, medium), _fixed, unverified_. A Parent's sign-in alone makes a device, with no password or second factor asked again, and the device outlives a password change and a reset (#303, medium), _fixed, unverified_. Revocation is refuted as a weakness: it is immediate on all five routes under `/api/play`. The Picture Password half is F2's. Probes: [`docs/pen-test/findings/F1.md`](../pen-test/findings/F1.md).

**F2 verdict (#216), on the Picture Password half: confirmed as a documented decision.** Each active Family Device is sent its own Family's hashes, exactly as stored, and no other Family's. A search of all 729 combinations finds a Child's Picture Password in about 1.6 s. The non-constant-time check runs only on the device, so it adds nothing. ADR 0005 records no condition under which keeping the hashes on the device stops being acceptable, such as a School device or a Picture Password guarding more than a Child's own play: #305 (low), _fixed, unverified_. Refuted through the API: no other Family's device, Classmate's Room visit, export, Audit Log entry or reply to any other fixture identity carries a hash. A sweep of every `GET` route as every identity found it only in `/api/play/family`, sent to its own Family's devices. Behind the API, a Teacher's reach and the Admin's read the hash of every Child they can see in Postgres, which only the API keeps from them: #304 (low), _fixed, unverified_. The credential half is F1's. [Findings note](../pen-test/findings/F2.md).

### H10: A device can write any event its Family could have earned · medium

The outbox schema is strict: closed enums, no extra properties, at most 100 events per upload, and `childId` and `giftForChildId` must belong to the device's Family (`src/server/family-devices/play-event-routes.ts:57-317`). The server recomputes rewards from events. But `question-answered` and `activity-finished` are taken as stated, so a device can mint Stars and Mastery for its own Family's Children. The device's `happenedAt` and `localDate` decide ordering and daily limits, and can be any date. The idempotency key is the event's own id as a global primary key, inserted with `onConflictDoNothing` (`:334`), so a known id from another Family would be silently dropped. Every upload and every `/api/play/family` re-reads all of a Family's events, so cost grows without bound.

Forging within one's own Family is a Child cheating their own game, and ADR 0004 accepts it. Probe the parts that cross a boundary: another Family's event ids, Check History a Teacher relies on, and cost.

**Verdict (F4, #218), for the cost: confirmed.** Every upload and every `/api/play/family` re-reads and replays all of a Family's rewarded events, with nothing to bound it: a documented replay (ADR 0004) with no recorded end, #318 (low), fixed, unverified. A Family Device dates each event, and a history of events each on a day of its own makes the replay grow with the square of its length, so about ten seconds of back-to-back uploads make every one of the Family's requests slow and a few minutes stall them, #319 (medium), fixed, unverified. The server has one thread, so one Family's replay holds it and every other Family's requests wait behind it, #320 (medium), fixed, unverified. The server now keeps each Family's replay and replays only the records it hasn't seen, in the order they reached it ([ADR 0055](../architectural-decision-record/0055-the-server-keeps-each-familys-replay-and-picks-it-up.md)). Measured at 1k, 10k and 100k events; the forging, dates and idempotency-key halves are F3's. See [`docs/pen-test/findings/F4.md`](../pen-test/findings/F4.md).

**Verdict (F3, #217), on forging, device clocks and the idempotency key: confirmed.** An upload naming another Family's Child or gift recipient is refused whole with 404, which is refuted; since #283 those events are let go and the rest of the upload is stored, and still none naming another Family's Child is. But a Family Device's reach in Postgres inserts an event naming one, and that Child's Teacher and the Admin then read it in its Check History while its Parents don't: #323 (high), fixed, unverified. Forged `question-answered` and `activity-finished` events move no Check History, which is refuted. A forged `check-finished` puts any score and date in the Check History a Teacher reads, and one dated 9999 stays the latest: #324 (medium), _fixed, unverified_: the upload lets go of an event dated more than an hour after it arrived or more than 400 days before, a local date beyond the UK's tomorrow or 401 days back, and a Check no one could have finished. One Session from 1900 to 2100 overflows time spent, so the Teacher's and the Admin's lists of Children answer 500 for every Child in them: #325 (medium), _fixed, unverified_: such a Session is let go, and time spent counts each Session for at most a day in a sum that can't overflow. An event id already used by another Family, or by the same one with another body, is answered 204 and dropped: #326 (low), _fixed, unverified_: it is refused with 409 naming the id, and the device sends it again with a new one. Forged play giving Stars, Mastery and Trophies Classmates see, and the device's clock deciding local dates, review dates and daily limits, are ADR 0004's decision with no recorded end: #327 (low), fixed: ADR 0004 now holds only until a second School is added, names what replaces it and is reviewed on 31 March 2027, and local dates are bounded with #324. Classmate visits from a Child or Family that hasn't opted in are refuted. The cost of the growing history is F4's. Evidence in [`docs/pen-test/findings/F3.md`](../pen-test/findings/F3.md).

### H11: CSRF defence is SameSite alone · medium

There are no CSRF tokens; the sign-in cookie is `SameSite=Strict` (`src/server/auth/sign-in-routes.ts:50-55`). Every subdomain of `adrianeyre.co.uk` is the same _site_, so a page on any of them can send a request with the cookie attached. Bodiless state-changing routes are the targets, for example the Admin's deletion confirmation, `DELETE /api/admin/families/:id`, and `POST /api/totp-setups`. Probe what the other subdomains are and who controls them.

**A1 verdict (#203):** confirmed (#247, fixed, unverified). A same-site page can't send a `DELETE`, `PUT` or `PATCH`, since no preflight is granted, or a JSON body, but it drives all nine bodiless `POST` routes on the signed-in adult's cookie, among them the Admin's deletion confirmation and deactivation, and makes the Admin's access log record a progress read with an `<img>`. The cookie has no `__Host-` prefix either, so such a page can plant its own sign-in in front of the victim's (#248, fixed, unverified). The repository names only `wizzaroo.adrianeyre.co.uk`; listing the other names from public records waits on the owner in the rules of engagement. [Findings note](../pen-test/findings/A1.md).

### H12: HTTP hardening is absent · medium

The server registers no helmet, sets no CSP, HSTS or `X-Frame-Options`, no `nosniff`, no CORS policy (correct for one origin, but unrecorded), keeps Fastify's 1 MiB body limit everywhere, and leaves `trustProxy` unset (`src/server/http-server.ts:49-65`). Behind cloudflared that means every request's IP is the tunnel's, so the logs can't tell callers apart and a future rate limit keyed on IP would put everyone in one bucket. Setting `trustProxy` carelessly would make the key forgeable instead. These are one decision. Probe the headers at the pen-test deployment's origin, and with E1 decide how the tunnel's real origin is reproduced.

**Verdict (I1, #219), for the headers and the body limit: confirmed**, as #311 (medium) and #312 (low), both fixed, unverified. At the E1 origin, whose stand-in adds and hides no header, no page, script or API answer carries a content security policy, HSTS, `X-Frame-Options`, `nosniff`, or a referrer, permissions or cross-origin policy, so a same-site page can frame the signed-in Admin dashboard (#311). All 58 routes that take a body keep Fastify's 1 MiB limit, sign-in and the bodiless `POST /api/sign-out` included (#312). No CORS policy is refuted as a weakness: no other origin, a same-site one included, is granted a read or a preflight, and section 9 of `wizzaroo.md` records "one origin and no CORS". `trustProxy` is I4's. See [`docs/pen-test/findings/I1.md`](../pen-test/findings/I1.md).

**I4 verdict (#223), on what reaches the origin:** the app's port is published on the server's loopback only, and nothing else is published, so the LAN reaches no container directly: refuted. Every request through the tunnel reaches `app` from `cloudflared`'s address. The server's loopback and the containers on the database network reach `app` without the tunnel, and can send any header, which is D6's to probe for the Audit Log. The tunnel's routes live only in Cloudflare's dashboard, and `cloudflared` and `app` sit on a network that reaches the LAN, the NAS included: #316 (medium), fixed, unverified for the routes. The LAN half rests on the home server's firewall, which the owner sets and reads. The headers and `trustProxy` are I1's. [Findings note](../pen-test/findings/I4.md).

### H13: Secrets and containers are fail-closed but not hardened · medium

Good, and to be confirmed rather than retested:

- missing variables refuse to start (`src/server/config/vars.ts:20-26`);
- Compose uses `:?` for every secret;
- the app port binds to `127.0.0.1:4310`;
- the database network is internal;
- the app runs as `node` and backups as `postgres`;
- the age private key never lives on the server.

Weaker:

- nothing enforces a minimum secret length;
- `SMTP_SECURE` can be turned off;
- `node:26-slim` and `postgres:18-alpine` aren't pinned by digest;
- no container sets `read_only`, `cap_drop` or `no-new-privileges`;
- the `restore-drill` Postgres uses `POSTGRES_HOST_AUTH_METHOD: trust` on the database network (`docker-compose.yml:91`);
- `TUNNEL_TOKEN` defaults to empty;
- the B2 key being write-only and the bucket's Object Lock are documented and verified by nothing in the repo.

Probe: unset or weaken each variable in turn. A warning alone is a fail.

**Verdict (I3, #222), on secrets and fail-closed configuration: confirmed.** Missing variables fail closed, which is refuted as a weakness: the server refuses each required one by name, Compose each `:?` one, and every optional one falls back to its safe value. Weak ones don't: the server and Compose ask only whether a secret is empty, so one character or three spaces starts the server on its SMTP and database passwords, and Compose passes all three secrets on (#306, medium; _fixed, unverified_). `SMTP_SECURE=false` sends the SMTP login and a live reset link in plain text to a server that offers no `STARTTLS`, with no warning; unset, it speaks TLS from the first byte (#307, medium; _fixed, unverified_). The server starts on `.env.example`'s development SMTP settings, and Compose passes them to the production app once its own lines are added (#308, low; _fixed, unverified_); the example's database URL, with no password, is refused by Postgres, and the example alone by Compose. "Compose uses `:?` for every secret" is refuted for the tunnel token: an unset one starts the `tunnel` profile with an empty `TUNNEL_TOKEN` (#309, low; _fixed, unverified_). The digests, container hardening, the `restore-drill`'s `trust` and the B2 key are I4's. [Findings note](../pen-test/findings/I3.md).

**I4 verdict (#223), on the containers and the backup targets: confirmed.** The app runs as `node` and the backup as `postgres`, the app's port binds to loopback, and the database network is internal: each refuted as a weakness. Confirmed:

- no image is pinned by digest, and the builds fetch pnpm and Alpine's age and rclone by name: #313 (low), fixed, unverified;
- no container sets `read_only`, `cap_drop` or `no-new-privileges`: #314 (low), fixed, unverified;
- `restore-drill` lets `app`, `backup` and `postgres` in as its superuser with a wrong password, from `--profile drill` until it is removed or the server reboots, while it holds a whole restore. It adds no reach while those containers hold the live superuser's password (#273, #279), and becomes a way around #273's fix: #315 (low), fixed, unverified;
- the backup never deletes off-site, which is refuted. But against the throwaway bucket its credential deletes what it sent, and `backup.sh` counts the night as backed up all the same. The real key's capabilities and the bucket's lock can only be read by the owner, in Backblaze, and nothing in the repo or the drill reads them again: #317 (low), fixed, unverified: each night's backup now proves the off-site key can't delete what it sent, or fails.

The variables are I3's. [Findings note](../pen-test/findings/I4.md).

### H14: Deletion leaves copies behind · medium

Deleting a Family or Child removes their rows. It does not remove:

- the nightly backups, which B2 keeps for 90 days by design under Object Lock ([ADR 0030](../architectural-decision-record/0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md));
- the container logs, where `logger: true` records user, Child and device ids, and the full SQL parameters whenever a query fails (H7).

The Admin can also delete a Family or Child directly (`src/server/admin/admin-routes.ts:256-294`), with no deletion request. The backups half is deliberate; nothing records how a deleted Family is kept out of a restore, or how long logs are kept. Probe: list every place a Child's data is copied, and run a deletion, then a restore, end to end.

**Verdict (D3, #212): confirmed.** A deletion reaches every row but the Audit Log's bare ids and sign-in addresses, which ADR 0041 keeps for twelve months. It doesn't reach the copies outside Postgres:

- the container log keeps Child ids and a failing query's parameters, such as a nickname and birth month and year, with no bound in either Compose file: #282 (medium), fixed, unverified;
- a Family Device keeps a deleted Child's unsent play for good, and every later upload from it, a sibling's included, is refused behind it: #283 (medium), _fixed, unverified_;
- the NAS keeps each backup for 30 nights and B2 for 90 days, as ADR 0030 decides, and restoring one taken before a deletion brings the Family back whole, Parents' passwords and the waiting deletion request included, with nothing to say it was deleted: #280 (medium), fixed, unverified.

The Admin deleting with no request is documented, with no recorded end and no notice to the Family: #284 (low), _fixed, unverified_: the Admin now deletes only on a Parent's request. The probe also found that a Parent's or a Family Device's own reach deletes its Children and its Family in Postgres, with no confirmation and no Audit Log entry: #281 (high), fixed, unverified. The export is complete for every table it lists, holds nothing of another Family's and no secret, but leaves out the Parent's own Audit Log entries and their IP addresses: #285 (low), _fixed, unverified_. Evidence in [`docs/pen-test/findings/D3.md`](../pen-test/findings/D3.md).

**Verdict (B3, #208), for the Admin's direct deletion: confirmed as a documented decision, as #290 (low), _fixed, unverified_.** `DELETE /api/admin/families/:familyId` and `DELETE /api/admin/children/:childId` delete with no deletion request, write `family.deleted` or `child.deleted`, and tell no Parent. The guide documents it, and nothing records when it should be looked at again. The backups, logs and restore halves are D3's. See [`docs/pen-test/findings/B3.md`](../pen-test/findings/B3.md).

### H15: The supply chain trusts tags and has no advisory gate · medium

`.github/workflows/pr-checks.yml` and `lint-pr-title.yml` pin `actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7` and `amannn/action-semantic-pull-request@v6` to tags, not commit SHAs. There is no Dependabot or Renovate, no `pnpm audit`, no dependency review and no code scanning. Good and to confirm: `permissions: contents: read`, `pull_request` rather than `pull_request_target`, `--frozen-lockfile`, and `allowBuilds` limiting install scripts in `pnpm-workspace.yaml`. CODEOWNERS is GitHub's template with one live line, `* @adrianeyre`, which is correct.

**Verdict (I6, #225): confirmed in part.** Four `uses:` lines are pinned to a tag: `actions/checkout@v7`, `pnpm/action-setup@v6` and `actions/setup-node@v7` in the `pr-checks` job, and `amannn/action-semantic-pull-request@v6`. Code a publisher moves those tags to runs with the private source, this file included, and decides the job's result: #333 (medium), _fixed, unverified_: every `uses:` in every workflow is now pinned by commit SHA. The advisory gate is refuted as missing: #227 added `pnpm audit --audit-level=high` and dependency review, each action pinned by SHA, and the gate fails on a high advisory, a missing lockfile and an unreachable endpoint. `pnpm audit` lists no high or critical advisory, and two moderate ones in development packages (`glob` through `testcontainers`, `minimatch` through `eslint` and `typescript-eslint`), below the documented level. Nothing audits or updates between pull requests: no scheduled audit, no Dependabot or Renovate, and nothing to move the SHA-pinned actions: #334 (low), _fixed, unverified_ by `.github/dependabot.yml` (`npm` and `github-actions`, daily) and a daily `pnpm audit --audit-level=high` in `.github/workflows/scheduled-audit.yml`. Refuted: read-only permissions, `pull_request` and `workflow_dispatch` only, no secret but `GITHUB_TOKEN` and no expression in a `run`, `--frozen-lockfile` in CI and the image, every package by sha512 integrity, `allowBuilds` naming all four packages with install scripts and allowing only `esbuild`'s, and CODEOWNERS. Code scanning is absent and is refuted as a weakness, since nothing in the canon asks for it. [Findings note](../pen-test/findings/I6.md). Since #28, a fourth workflow, `release.yml`, writes to the repo: on a merge to `main`, semantic-release tags the merge and makes a GitHub Release with the workflow's own `GITHUB_TOKEN`, the one token in any workflow granted `contents: write`. It commits nothing, so `main`'s ruleset has no bypass. A later round's I6 probes that job.

### H16: The passkey hand-off answers anyone holding the code · low

`/api/passkey-hand-off-registration-options` is unauthenticated, doesn't consume the token, can be called again and again within its 10 minutes, and returns the account's email as `userName` (`src/server/auth/passkey-hand-off-routes.ts:129-138`). No email is sent when a passkey is added. The token itself is 32 bytes, kept hashed, travels in the URL fragment and is consumed with the registration, which is right.

**Verdict (A3, #205): confirmed.** The options answer anyone holding the code, as often as they ask, writing a challenge row each time. They give back the account's email address, its id and its passkeys' ids: #238 (low), _fixed, unverified_. Adding or removing a passkey sends the owner no notice, either way: #239 (medium), _fixed, unverified_. Refuted:

- the rpID and origin checks;
- challenge expiry and single use;
- the sign count;
- the code's lifetime, replacement and consumption with the registration;
- refusals of a wrong code, which give nothing away.

See [`docs/pen-test/findings/A3.md`](../pen-test/findings/A3.md).

### H17: Second-factor secrets are stored in the clear · low

The TOTP secret is stored in plain text in `users.totp_secret`, and recovery codes are unsalted SHA-256 (`src/server/auth/two-factor.ts`). Both are harmless until the database is read (H4, H7), and then they are a second factor for every adult who has one.

**Verdict (A2, #204, 17 November 2026): confirmed.** The TOTP secret is kept as issued in `users.totp_secret` and `totp_setups.secret` (#254, low; fixed, unverified). Recovery codes are one unsalted SHA-256 of a 59.45-bit code: offline-guessable in GPU-days rather than read directly, and the weakest stored second factor once the secret is protected (#255, low; fixed, unverified). Replay, the drift window, single use, entropy and the five tries per pending sign-in are refuted, and so is staff turning TOTP off through the API. The probe also found three confirmed weaknesses:

- new pending sign-ins give five fresh tries each, so a password holder guesses the code without limit (#256, medium; it measures H8's second bullet; fixed, unverified);
- `DELETE /api/two-factor` checks wrong codes without limit or log (#257, medium; fixed, unverified);
- a co-Parent's, a Teacher's and the Admin's reach read another adult's TOTP secret in Postgres, and the co-Parent's and the Admin's clear it (#258, high; an instance of H5; fixed, unverified).

Probes and arithmetic: [`docs/pen-test/findings/A2.md`](../pen-test/findings/A2.md).

### H18: Staff-supplied names reach email headers · low

Email subjects include the School's name (`src/server/email/emails.ts:103,119`), and a School name may contain any characters except all-whitespace, CR and LF included. Nodemailer should fold headers. Probe header injection, and what a hostile School or Teacher name can put in front of a Parent.

**Verdict (I5, #224): confirmed for what a name puts in front of a Parent, refuted for header injection.** No staff-supplied field adds a header or a recipient: Nodemailer folds a School name's CR and LF into spaces, leaving one `Subject`, and the address shape refuses CR and LF in `To`. But a Parent's name, typed by a Teacher in the form or a CSV, and a School's name, typed by the Admin, reach the Parent's Invite verbatim, its body as much as its subject. Line breaks, a link placed ahead of Wizzaroo's and a right-to-left override all get through: #321 (low; _fixed, unverified_). The address shape also lets through `…,parent-a1@pen-test.example`, a new login that Nodemailer delivers to parentA1's mailbox, past the one-address-one-account check, and that is marked confirmed once it is opened there: #322 (low; _fixed, unverified_). Refuted: a Teacher's name reaches no Parent's email, and every link in the ten emails the probe sent, and the copied Invite link, is built from `PUBLIC_URL` whatever `Host`, `X-Forwarded-Host` or `Forwarded` say. [Findings note](../pen-test/findings/I5.md).

### H19: Query construction is clean; sweep it anyway · low

The only `sql.raw` calls take constants (`src/server/schema.ts`), there is no `dangerouslySetInnerHTML`, no file upload (CSV arrives as a length-capped JSON string, `src/server/bulk/bulk-routes.ts`), no server-side fetch of a URL, and no open redirect. This entry exists so a tester sweeps every builder rather than trusting one reading.

**Verdict (B3, #208), for the CSV upload: confirmed, as #289 (medium), _fixed, unverified_.** Both caps hold: 1,000,001 characters and 1,001 rows are each refused with 400. Neither bounds the work, because every column of every row is held and rows are counted only after all are read. A file within both caps can hold 166 million cells, about 5 GB of heap. Formula injection in the skipped-rows report is refuted. The sweep of every builder is D4's. See [`docs/pen-test/findings/B3.md`](../pen-test/findings/B3.md).

**Verdict (D4, #213): refuted for query construction, confirmed for odd input.** All 65 `sql` templates bind what a request carries as parameters, the two `sql.raw` take the constant 1000 and the one `sql.identifier` a schema column, no route orders by anything a request says, and both JSON paths have constant keys. `0x10` and `1e3` become 16 and 1000 inside each field's range before any query, and `1.5` is refused. But input the schemas let through still reaches Postgres and makes it fail:

- a NUL byte in any text field, so 11 fields on 9 routes answer 500, `POST /api/sign-in` among them with no credential: #294 (medium), fixed, unverified;
- an email address of any length, kept as a pending email change, or a 500 for a new Parent: #295 (low), fixed, unverified;
- an integer written as `"Infinity"`, which passes every range check, so a Star award and the Audit Log's page answer 500, and a daily limit and an activity's seconds are stored as `null`: #296 (low), fixed, unverified;
- a date or time in the year 0000, which Postgres doesn't have, so the Audit Log's filters and a Family Device's upload answer 500: #297 (low), fixed, unverified.

While H7 is open, each of those 500s also returns its query and parameters. See [`docs/pen-test/findings/D4.md`](../pen-test/findings/D4.md).

### H20: Screenshots in the docs show a second factor · low

`docs/images/installation/first-run/` shows a TOTP setup key and recovery codes. Confirm they were made on a throwaway account and never on production.

**Verdict (I6, #225): refuted.** The key and codes belong to `you@example.com`, a reserved address, in "The Example Family", on a database with no Teachers or Children, and the set's Mailpit email was sent by a server whose `PUBLIC_URL` was `http://localhost:4399`. The key gives the code typed beside it at 20:45 UTC on 16 November 2026, ten minutes before the screenshots were committed. A test pins the nine images, so a new one is read again. Only the owner can confirm on production that no account holds that key; the query is in the [findings note](../pen-test/findings/I6.md).

### H21: The Audit Log is append-only to the app, but not to everything that feeds it · medium

The Audit Log (`src/server/audit/`, `src/server/drizzle/0030_audit-log.sql`, [ADR 0041](../architectural-decision-record/0041-security-actions-are-kept-in-an-audit-log.md)) is written in the same transaction as each action. The reach role holds only `SELECT` (the Admin) and `INSERT` (in the caller's own name) on it. The integration tests pin each of those properties. The weaker edges:

- the IP address on a sign-in entry comes from `CF-Connecting-IP`, which only Cloudflare should set; anyone who reaches the origin without the tunnel can write any address they like into the log (H12, H13);
- the database owner bypasses row-level security and every grant (H4), so the log is append-only against the app, not against someone holding the database password;
- every failed sign-in writes a row with no authentication and no rate limit (H8), so an attacker can grow the table, and bury real failures, at the cost of one argon2 check per row;
- completeness depends on each route remembering to write its entry; a new route that creates or deletes people, or a reply path that skips the write, leaves no trace;
- entries for a deleted Family keep bare ids for twelve months, and the nightly backups keep purged entries for 90 days more (H14).

Probe:

- the header from outside the tunnel and through it;
- every route that should write an entry, as every fixture identity, asserting exactly one entry per action that succeeded and none per refusal;
- an entry written in another adult's or another Family's device's name;
- `UPDATE`, `DELETE` and `TRUNCATE` through every reach;
- the read route as each role, with odd `page`, `action`, `from` and `to` values;
- every column of every entry for names, email addresses, nicknames or anything typed into a form;
- the rows-per-hour arithmetic for failed sign-ins.

---

## Scope partition

Child issues under `prd:pen-test` partition the surface along Wizzaroo's own lines. Each names its trust boundary, links the ADRs and `wizzaroo.md` sections that govern it, points at the code, lists the hypotheses it answers, and says what to probe. Each produces a committed findings note at `docs/pen-test/findings/<ID>.md` with a verdict per probe, probe tests in the gated run (an `it.fails` for the property that should hold beside a `today_…` test pinning what happens now), one finding issue per confirmed weakness, and its H entries here amended with their verdicts. A scope issue probes and never fixes; each fix is its own issue against its finding.

- **Enablement (E1-E5)**
  - **E1** the pen-test deployment: its own Compose project, volume and `.env`, reachable only by the testers, with the tunnel's origin reproduced, and torn down with its volume.
  - **E2** fixtures: two Schools; Teachers on different Year Groups, one deactivated; three Families, two in the same class at School A and one at School B; co-Parents; a passkey-only Parent; staff with and without TOTP; a revoked Family Device; pending, expired and accepted Invites; a Family with a pending deletion request; Classmates who have and haven't opted in. Built by a pure plan and a separate loader, committed, synthetic.
  - **E3** rules of engagement and statement of work.
  - **E4** the credentials package, and how its secrets are delivered.
  - **E5** the findings workflow: labels, issue template, triage note.
- **Adult sign-in (A1-A5)**
  - **A1** passwords and sessions (H3, H8, H11, H21).
  - **A2** TOTP and recovery codes (H17).
  - **A3** passkeys and the QR hand-off (H16).
  - **A4** password resets, Invites and email changes (H2, H3).
  - **A5** the staff second-factor rule (H1).
- **Reach and authorisation (B1-B4)**
  - **B1** every route compared with the wrapper it should have (`runAsSignedInUser`, `Adult`, `Parent`, `Staff`, `Admin`, `FamilyDevice`), and a test that fails when a route is added without one. **Worked in #206, 17 November 2026; it answers no H entry.** No route runs under a weaker wrapper than it should, and each of the 13 with none needs none ([findings note](../pen-test/findings/B1.md)). Confirmed: nothing ties a route to its wrapper, so the test that would catch one added without it is filed as #259 (medium), _fixed, unverified_; a route reads and hashes the request before its wrapper checks the caller, #260 (low), _fixed, unverified_ by #259's hook; and the Parent wrapper keeps an Admin's reach to every Family's rows, #261 (low), _fixed, unverified_.
  - **B2** Teacher reach: Schools, Year Groups, the cohort moving on 1 September, Teacher locks, and the owner-run staff writes.

  - **B1** every route compared with the wrapper it should have (`runAsSignedInUser`, `Adult`, `Parent`, `Staff`, `Admin`, `FamilyDevice`), and a test that fails when a route is added without one.
  - **B2** Teacher reach: Schools, Year Groups, the cohort moving on 1 September, Teacher locks, and the owner-run staff writes. **Verdict (#207):** reading and changing outside a School and its Year Groups, the cohort's move, Teacher locks, a deactivated Teacher's session, and the single owner-run writes aimed outside reach are refuted, in the API and the policies alike. Confirmed: a Teacher can make a Family's next adult and become its Parent, #264 (critical); a Teacher's upload adds to a Family outside their reach, #265 (high), _fixed, unverified_; the policies don't check that a Teacher is deactivated, #266 (medium), _fixed, unverified_. See [`docs/pen-test/findings/B2.md`](../pen-test/findings/B2.md).
  - **B3** Admin reach and bulk creation by CSV.
  - **B4** authenticated-but-unauthorised probes: every route, as every fixture identity.
- **Data and audit (D1-D5)**
  - **D1** row-level security and database privilege (H4, H5).
  - **D2** the Admin access log (H6).
  - **D3** export and deletion, including logs and backups as copies (H14).
  - **D4** the query-construction sweep (H19).
  - **D5** a whole-schema sweep, read from `pg_catalog` rather than from migration text, that every table has RLS, a policy, and only the grants it needs. **Worked in #214, 17 November 2026; it answers no H entry.** All 29 tables have row-level security and a policy for every command they grant, to the reach role alone. The six `SECURITY DEFINER` functions fix their `search_path` and answer only what the caller's own policies show. Confirmed: the reach role holds writes no route makes on 20 tables, #298 (medium; 19 once #275's fix took `family_parents` off it), _fixed, unverified_, beside `admin_access_logs`' (#269); and a reach's temporary tables stand in for the tables the policies' functions read, #299 (low), _fixed, unverified_. Row-level security is forced on no table, as ADR 0027 decides (part of #273). [Findings note](../pen-test/findings/D5.md).
  - **D6** the Audit Log: completeness against the action list, append-only through every reach, what it holds, and the twelve-month purge (H21).
- **Family Devices and sync (F1-F4)**
  - **F1** the device credential (H9).
  - **F2** Picture Passwords as a non-boundary (H9).
  - **F3** events: forging, device clocks and the idempotency key's scope (H10).
  - **F4** the cost of a Family's growing event history (H10).
- **Infrastructure and delivery (I1-I6)**
  - **I1** HTTP hardening and the error handler (H7, H12).
  - **I2a** rate limiting, probed and quantified by arithmetic (H8).
  - **I2b** the owner sets the figures in [the request-rate pre-condition](#pre-condition-the-request-rate-policy-before-a-second-school).
  - **I3** secrets and fail-closed configuration (H13).
  - **I4** containers, Compose, the tunnel and `trustProxy` (H12, H13).
  - **I5** email (H18).
  - **I6** the CI supply chain and dependency currency (H15, H20).

Two issues in the set **build rather than probe**:

- **Add the pen test to the second-School gate in code:** add "a penetration test with every finding above low remediated or waived" to `secondSchoolGateItems` in `src/server/schools/second-school-gate.ts`, so the gate the code enforces matches section 11 of `wizzaroo.md`.
- **Gate dependencies in CI:** `pnpm audit` and dependency review on every pull request, so a package with a known advisory fails the build. Read advisories from the lockfile, not GitHub's dependency graph, which reads manifests and can miss most of a pnpm tree.

---

## Checks every scope issue carries

These are general checks, learned from an earlier round on another codebase, that apply across Wizzaroo's surface. A scope issue lists the ones that apply to it.

- **Refusals give nothing away.** An unauthenticated caller gets the same status, body and length whether the thing they asked about exists or not. Look for oracles in 404 against 409, 414 or 413 before authentication, and a 503 that names which setting is missing.
- **Every refusal comes from a closed set.** No route answers a well-formed request with a 500, and no error message, driver text or stack reaches the caller.
- **Odd input stops above the database:** NUL bytes, numbers written as `0x10`, `1e3` or `1.5`, very long strings, and path segments past the router's limit.
- **An idempotency key is bound to its payload and its owner.** The same key with a different body is refused, and one caller's key never returns another caller's result.
- **Nothing is left to a collaborator to bound.** Every retry loop and every list has its own limit.
- **A rule enforced in one layer is a finding.** Each separation rule is proved in the API alone and in the database alone.
- **The audit records what was served, on every reply path,** including streamed and errored ones, and names a natural person.
- **Logs are a copy of the data.** Sweep them for personal data, and count them in erasure.
- **Internal headers are trusted only when the server set them.** Send each `x-*` header the server reads, from outside.
- **Middleware that matches by path matches by segment.** Try `/apiX`, `//api`, encoded slashes and trailing dots.
- **Configuration fails closed.** Unset each variable in turn; a one-character, whitespace or `.env.example` secret is refused at boot.
- **Run the probes against a real Postgres,** not a mock. Driver behaviour, type coercion and constraint text differ.
- **A test that passes either way proves nothing.** Pin the observed outcome. Name a probe `today_…` while a gap is open, and rename it `(regression)` once it is fixed; turn tests, never delete them.

---

## Findings workflow

Every finding is its own GitHub issue carrying `prd:pen-test`, exactly one of `severity:critical`, `severity:high`, `severity:medium` or `severity:low`, and a pointer to the scope issue it was found under. It states the rule it breaks (section and ADR), the steps to reproduce it, what happened against what should have, and the test that would have caught it. That test joins the gated run with the fix.

Remediation targets, in working days after triage confirms the finding. Triage happens the same working day a finding is filed.

| Severity | Target      | What it means here                                                                                               |
| -------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| critical | 2           | One Family, School or Year Group can read or change another's Children's data, or any adult can be impersonated. |
| high     | 10          | A separation or audit rule is enforced in one layer only, or Admin access can go unlogged.                       |
| medium   | 30          | A control is weaker than its documentation says, or a boundary has no defence in depth.                          |
| low      | best effort | Hygiene, disclosure, or a documented decision with no recorded expiry.                                           |

- **In the external round, a critical finding never starts life as a GitHub issue.** It goes to the owner by the out-of-band channel E3 names, with no exploit detail in the first message; the issue is filed once a fix is in hand. If the owner doesn't acknowledge within 30 minutes, testing pauses. **In this first round** the testers report to the owner, the repository is private and the data is synthetic, so a critical finding is filed as an issue straight away.
- **`wontfix` needs a written rationale from the owner in the issue before the label goes on.**
- **Fixed is not verified.** A finding is "fixed, unverified" until the probe that found it has been run again and passes.
- **A decision is not a fix.** A finding answered by a new ADR stays open until the code matches the ADR, unless the ADR's decision is to accept the finding.
- **This file is amended in place** as hypotheses get verdicts and findings are fixed, so the next round doesn't start from stale text.
- Closing keywords are written plainly (`Fixes #123`), never inside bold or code, so they work.
- An issue that waits on the owner's decision carries `owner`.
- A credential that expires (a token, a key) has its expiry date recorded and a rotation issue filed a week before it.

---

## Pre-condition: the request-rate policy, before a second School

This section is the only home of Wizzaroo's request-rate figures. Configuration reads them from here; no other file, comment, test or environment variable carries a copy.

**Set on 17 November 2026.** The owner adopted every figure below, as I2b (#221) proposed them, together with [the reasoning](#the-reasoning) beside them.

|                                       | Per IP                                                 | Per account                                                           |
| ------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Window                                | 15 minutes, sliding                                    | 1 hour, sliding                                                       |
| Burst                                 | 20 requests in any one minute                          | 5 requests in any one minute                                          |
| Sign-in, reset and Invite routes      | 100 requests a window, the six routes counted together | 10 failed sign-ins, 10 pending sign-ins and 3 reset requests a window |
| Per process, or across the deployment | per process                                            | per process                                                           |

- The figures are set by the owner while I2 is worked, and recorded here with the date.
- **Until they are set, an unset policy is a closed door, not "no limit":** once rate limiting is built, a production server with no policy refuses to start. A development policy may be named explicitly; there is no implicit production default.
- The IP the limit keys on and the `trustProxy` setting behind cloudflared are **one decision** (H12), made together and recorded here. `trustProxy: true` with no named proxy is never acceptable.
- Refusals answer `429` the same way whichever limit fired.

**Review:** re-read on **31 March 2027**, whether or not a second School has been proposed. Record the answer in this section; "no change" is a valid answer, and silence is not.

### The reasoning

Proposed on 17 November 2026 by I2b (#221), from the numbers and the key in [I2a's findings note](../pen-test/findings/I2a.md#for-i2b-the-numbers-and-the-key), and adopted by the owner the same day. Every rate is arithmetic, not load, as I2a's are.

**What the rows mean.** The window is how long a key's requests are counted. The burst is the most one key may send in any one minute inside it, so a window's allowance can't be spent at once. The routes row is what each key may send in a window. The last row is where the counters live. The six routes are the ones I2a probed: `POST /api/sign-in`, `POST /api/sign-in/two-factor-code`, `POST /api/password-reset-requests`, `POST /api/password-resets`, `POST /api/invite-acceptances` and `POST /api/passkey-sign-in-options`.

**Per IP: 15 minutes, 20 a minute, 100 a window.** Today one caller gets about 400 requests a second on the argon2 routes, bounded only by four libuv threads (A1, #246). 100 a window is 400 an hour, 3,600 times less. One address then:

- writes at most 9,600 `sign-in.failed` entries a day, against about 34.6 million today (H21);
- spends at most 100 argon2 hashes a window on resets and Invite acceptances, about 0.76 s of one thread (#330), so holding all four threads takes about 3,600 addresses;
- calls passkey sign-in options at most about 0.11 times a second, leaving about 33 live rows, so the sweep that fills a Postgres core between 100 and 300 calls a second needs about 900 addresses or more (#331).

Wizzaroo's legitimate traffic on these routes is a handful of adults signing in. A School's staff share one address, so 100 leaves room for a staff room signing in on one morning, and the burst of 20 a minute for most of them in the same minute. I2a's probes send 101 in a row, so each of its `it.fails` would be answered `429` under these figures.

**Per account: 1 hour, 5 a minute, 10 failed sign-ins, 10 pending sign-ins and 3 reset requests.** The address bounds one caller. Only the account bounds many callers aiming at one adult. The account is the normalised email for sign-ins and reset requests, counted whether or not the address has an account, so the limit can't tell a caller which addresses do. For pending sign-ins it is the user id (#256).

- Password guessing: 10 failures an hour is 240 a day, so A1's million-password list against one account takes about 11.4 years instead of under an hour.
- The two-factor code: 10 pending sign-ins an hour, each with its five codes, puts A2's even odds (46,210 password checks) at about 6 months instead of about 2 minutes, for a caller who already has the password.
- Reset emails: 3 an hour is at most 72 a day to one inbox (#328). It doesn't protect the mail provider's quota from a caller spread across many addresses and many adults. Only the provider's own limit does.
- The cost: anyone who knows an adult's email can use up its 10 failures and stop that adult signing in with a password for up to an hour, again and again. A passkey and an open session still work. Keying failures on the pair of account and address would avoid that, but it would no longer bound guessing spread across many addresses. The proposal accepts the lockout.

**`trustProxy` and what the limit keys on, as one decision (H12).** I2a confirmed that `X-Forwarded-For` is ignored today and that `CF-Connecting-IP` is believed from any socket (#332). Fastify's `trustProxy` takes the address from `X-Forwarded-For`, which I2a says never to key on. So:

- **`trustProxy` stays unset**, and `request.ip` stays the socket's address.
- **The key is the address `findClientIpAddress` returns**: `CF-Connecting-IP`, believed only when the socket is cloudflared's own address on the `tunnel` network, and otherwise the socket's address. That is #332's fix, _fixed, unverified_: the address is `TUNNEL_PROXY_ADDRESS`, required outside development. The limit and the Audit Log read the same function, so what is limited is what is logged.
- cloudflared needs a fixed address on the `tunnel` network for that check to name. Compose now fixes the network's subnet at `10.43.10.0/24` and gives cloudflared `10.43.10.2`; the pen-test deployment's stand-in has `10.43.11.2` on `10.43.11.0/24`, so the two deployments can share a host. Development names no proxy, so the header is believed from no socket there.
- An IPv6 caller is keyed on its /64, since one host commonly holds the whole prefix.
- A request from cloudflared without a valid `CF-Connecting-IP` is keyed on cloudflared's address, which puts all such requests in one bucket. Cloudflare's edge sets the header on every request, so none is expected.

**Per process.** Compose runs one app container, so counters held in the process cover the whole deployment (I2a). A restart clears them, which happens at a deploy and isn't in a caller's hands. If a second app container is ever added, this row has to change before it is.

**What these figures don't fix:**

- Ten reset requests while the mail server is slow still take every database connection (#329). Ten is inside one address's burst, and two addresses get twenty. Only #329's own fix answers it. _Fixed, unverified (#329)_: no email is sent while a connection is held, the SMTP transport times out in seconds, and a query waits at most 10 seconds for a connection.
- Checking the token before the hash (#330) and taking the sweep off the request path (#331) cut what each request costs, whatever the figures. Both _fixed, unverified (#330, #331)_.
- The three routes B4 found hashing a Picture Password before the sign-in check (#300, _fixed, unverified_) are not among the six routes. Since #259's `onRequest` reach check they refuse a caller with no sign-in before hashing, so only a signed-in adult or a Family Device makes them hash. Whether they join the six is for the owner.

**Adopted:** by the owner, Adi, on 17 November 2026: every figure in the table and this reasoning, as proposed.

---

## Pre-condition: an external round before a second School

This first round is run by the people and agents who built Wizzaroo, working against a brief written by reading the tree from outside. That is better than nothing and is not independent. **Before a second School is added**, a second round is run by someone outside the project, against this file as amended by the first round, and its findings above `severity:low` are remediated or waived in writing. This is part of the gate in section 11 of `wizzaroo.md`.

---

## Success criteria

1. Every scope issue is filed, labelled and anchored to this file before the window opens, so the round works against a Wizzaroo-shaped scope and not a copy of a generic checklist.
2. The pen-test deployment is stood up, seeded and reachable only by the testers, and destroyed with its volume at the end.
3. Every finding is filed as a labelled issue within one working day of being found.
4. Every hypothesis in the opening register has a verdict, recorded here.
5. **H1 and H2 have a dated answer** before the round closes: fixed, or a recorded decision naming the date they stop being true.
6. Every finding above `severity:low` is remediated, or waived in writing by the owner, **before a second School is added**, and the external round in the pre-condition above has done the same.
7. Every credential issued for the round is revoked when it ends.
