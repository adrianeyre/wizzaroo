# The pen-test credentials package

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

What a tester is given to sign in to [the pen-test deployment](./deployment.md) as each of [the fixtures](./fixtures.md), how it reaches them, and what they are not given. Testers get the fixture identities and nothing more; anything else they reach is a finding ([the brief](../product-requirements-document/pen-testing.md#engagement-shape)). This page names how the round is run, so it is kept private on the same terms as the PRD. It holds no credential: those are in the package, which is never committed.

## What testers get

- **The deployment's origin,** `http://localhost:43310`, and its mail at `http://localhost:43380`, reached over SSH from another machine as [the deployment page](./deployment.md#who-can-reach-it) says.
- **The credentials package:** every credential of every fixture identity, as environment variables. Every one is derived from the fixture seed, so it is synthetic and works only on this deployment, and only until it is torn down.
- **The sign-in harness,** `pnpm pen-test:sign-in`, which signs in as a named identity with the package's credentials and hands back its cookies.
- **The source, read-only,** at the commit the round runs against.
- **An external tester also gets the out-of-band contact** the [rules of engagement](./rules-of-engagement.md#the-out-of-band-channel) settle on, given with the package and never written in this repository.

## What testers don't get

None of these is in the package, and a tester who reaches one anyway has a finding, filed as [the rules of engagement](./rules-of-engagement.md#how-testers-behave) say:

- **the database password,** or any connection string to the deployment's Postgres. A probe of row-level security and privilege (D1, D5) runs against its own Postgres in the gated run, `src/integration.test.ts`, as [the checks every scope issue carries](../product-requirements-document/pen-testing.md#checks-every-scope-issue-carries) ask. A probe that needs the deployment's own database is run by the owner;
- **the tunnel token,** production's or any other;
- **email platform credentials:** production's `EMAIL_API_KEY` and any login to its email platform or Resend, or the email platform stand-in's key in the deployment's `.env`;
- **rclone and B2 credentials:** production's `rclone.conf` and B2 keys, and the deployment's stand-in bucket key;
- **the age key:** production's, and the deployment's `age-identity.txt`;
- **the CI secrets** and the repository's settings;
- **write access to the repository,** beyond an agent's own branch;
- **the fixture seed,** `.pen-test-deployment/fixture-seed.txt`, which every fixture credential comes from, and everything else in `.pen-test-deployment/` but the package.

## Making the package

The owner makes it on the machine running the deployment, once the fixtures are loaded:

```bash
pnpm pen-test:seed
pnpm pen-test:credentials
```

`pnpm pen-test:credentials` reads the fixture seed and writes `.pen-test-deployment/credentials-package.env`, readable only by the owner, and prints none of it. It ends:

```text
Wrote the credentials package for 15 fixture identities to /path/to/wizzaroo/.pen-test-deployment/credentials-package.env, readable only by you. None of it is printed.
```

The same seed always gives the same package, so loading the fixtures again doesn't change it. Teardown deletes it with the seed.

## Handing it over

The package goes to each tester as a file, and only by these routes:

| Tester                                     | How the package reaches them                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The owner, on the machine running it       | It is already there                                                                                                                                                                      |
| The owner, on another machine              | Copied over SSH, as the ports are forwarded, into a file only they can read                                                                                                              |
| An agent (Sandcastle or the AI Office)     | Put into the agent's environment by whoever starts it. Never in its prompt, its issue or its branch. An agent that finds a credential in its prompt stops and says so on its scope issue |
| The external tester, in the external round | Over the end-to-end encrypted channel the rules of engagement agree for the external round. Never by email or in an issue                                                                |

A tester keeps the file outside every repository and deletes it when the round ends ([revoking it](#revoking-it-at-the-end)).

## Signing in with the harness

The harness takes every credential from the environment, never from the command line, where shell history and `ps` keep it. It is given one thing, the identity's handle, and refuses anything else, a flag such as `--password` included, without repeating what it was given. It refuses to write the cookies to a terminal too, because they are a credential.

Load the package into a subshell's environment, sign in, and keep the cookies in a file only you can read:

```bash
(
  umask 077
  set -a
  . .pen-test-deployment/credentials-package.env
  set +a
  pnpm --silent pen-test:sign-in parentA1 >parentA1.cookies
)
curl --cookie parentA1.cookies http://localhost:43310/api/me
```

The cookies are written as a cookie jar curl reads, kept to `localhost` and each cookie's path. curl treats `localhost` as secure, so it sends their `Secure` cookies over plain HTTP (checked with curl 7.88). To use them in a browser instead, add each one in its developer tools to `localhost`, with its path, `HttpOnly` and `Secure`. Never pass a variable's value as an argument to anything, including curl, and never run `env $(cat …)`: both put it in `ps`.

In a probe, the harness is `signInAsPenTestFixture` in `src/server/pen-test-credentials/sign-in-as-pen-test-fixture.ts`. It takes the handle, the environment, the origin and the fixture plan, and gives back the cookies. `buildCookieHeader` turns them into a `Cookie` header.

Each identity signs in the way it normally would:

| Identity                                            | How the harness signs in                                                            | What the deployment answers                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| `admin`, `teacherAYear3`, `parentA1`                | Password, then a code from their TOTP secret                                        | A two-step sign-in                             |
| `teacherBYear3`, `coParentA1`, `parentB`            | Password                                                                            | A sign-in that isn't two-step                  |
| `teacherAYears5And6`, `parentA2PasskeyOnly`         | Passkey, through a soft authenticator holding the fixture's private key             | A two-step sign-in                             |
| `coParentA2Invited`                                 | Accepts their pending Invite, setting the package's new password                    | A sign-in, once. The Invite is used up         |
| `familyDeviceA1`, `familyDeviceA2`, `familyDeviceB` | Sends the device token as the `wizzaroo_family_device` cookie to `/api/play/family` | The Family's Children                          |
| `teacherADeactivated`                               | Password                                                                            | Refused with 401, because they are deactivated |
| `coParentBInviteExpired`                            | Accepts their Invite                                                                | Refused with 404, because it has expired       |
| `familyDeviceA1Revoked`                             | Sends the device token                                                              | Refused with 401, because it is revoked        |

A refusal ends the harness with what refused it, such as `The deployment refused teacherADeactivated at the password step, with HTTP 401`, and no cookies. The three refusals above are what those fixtures are for. Any other refusal is worth reading: it is either a probe's own change ([below](#expected-state-changes)) or a finding.

- **A TOTP code works once.** Sign each TOTP identity in at most once every 30 seconds, and keep its cookies: a Parent's sign-in lasts 30 days, or 14 days unused, and a Teacher's or the Admin's 7 days, or 12 hours unused.
- **Signing in is rate limited.** The sign-in, code, reset, Invite and passkey sign-in routes count together per caller's address, 20 a minute and 100 in 15 minutes, and wrong passwords count per email address, 5 a minute and 10 an hour. Past either, the deployment answers `429`, and the harness says which step refused it.
- **`teacherAYears5And6` signs in with their passkey,** since staff need a second factor. Their password is in the package for probing a password-only staff sign-in (H1).
- **`coParentA2Invited` signs in by accepting their Invite only once.** After that, their Invite is accepted and refused; load the fixtures again to put it back.

`src/integration.test.ts` signs in as every identity this way against a real Postgres, and runs the harness with a credential passed as a flag to see it refused.

## Signing in by hand

Everything the harness does can be done in a browser at `http://localhost:43310/parent/`:

- **Password:** the identity's email address, from [the fixtures](./fixtures.md#the-identities), and its `…_PASSWORD`.
- **TOTP:** add `…_TOTP_SETUP_KEY` to an authenticator app as a time-based key, and enter its code. `…_TOTP_SECRET` is the same secret in hex, as it was issued. Wizzaroo stores it sealed under the deployment's `TOTP_SECRET_KEY` (#254), so the database column itself makes no code.
- **Recovery codes:** any of the ten in `…_RECOVERY_CODES`, comma-separated, in place of a TOTP code. Each works once.
- **Passkey:** only through the harness, since no browser holds the fixture's key. Sign in with the harness and put the cookies in the browser.
- **Invite:** open `http://localhost:43310/parent/#accept-invite=` followed by the Invite's `…_TOKEN`, and set a password at least as long as Wizzaroo asks for.
- **Family Device:** add a cookie named `wizzaroo_family_device` to `localhost`, path `/api/play`, `HttpOnly` and `Secure`, holding the device's `…_TOKEN`, then open `http://localhost:43310/`.
- **Picture Password:** the three pictures in a Child's `…_PICTURE_PASSWORD`, in order, on a Family Device of their Family.

## The variables

Every variable is `PEN_TEST_`, the handle in capitals with words split by `_`, and what the credential is. A list is comma-separated.

| Fixture                      | Variables                                                                                                                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`                      | `PEN_TEST_ADMIN_PASSWORD`, `PEN_TEST_ADMIN_TOTP_SECRET`, `PEN_TEST_ADMIN_TOTP_SETUP_KEY`, `PEN_TEST_ADMIN_RECOVERY_CODES`                                                                                                           |
| `teacherAYear3`              | `PEN_TEST_TEACHER_A_YEAR3_PASSWORD`, `PEN_TEST_TEACHER_A_YEAR3_TOTP_SECRET`, `PEN_TEST_TEACHER_A_YEAR3_TOTP_SETUP_KEY`, `PEN_TEST_TEACHER_A_YEAR3_RECOVERY_CODES`                                                                   |
| `teacherAYears5And6`         | `PEN_TEST_TEACHER_A_YEARS5_AND6_PASSWORD`, `PEN_TEST_TEACHER_A_YEARS5_AND6_PASSKEY_CREDENTIAL_ID`, `PEN_TEST_TEACHER_A_YEARS5_AND6_PASSKEY_PRIVATE_KEY_JWK`                                                                         |
| `teacherBYear3`              | `PEN_TEST_TEACHER_B_YEAR3_PASSWORD`                                                                                                                                                                                                 |
| `teacherADeactivated`        | `PEN_TEST_TEACHER_A_DEACTIVATED_PASSWORD`, `PEN_TEST_TEACHER_A_DEACTIVATED_TOTP_SECRET`, `PEN_TEST_TEACHER_A_DEACTIVATED_TOTP_SETUP_KEY`, `PEN_TEST_TEACHER_A_DEACTIVATED_RECOVERY_CODES`                                           |
| `parentA1`                   | `PEN_TEST_PARENT_A1_PASSWORD`, `PEN_TEST_PARENT_A1_TOTP_SECRET`, `PEN_TEST_PARENT_A1_TOTP_SETUP_KEY`, `PEN_TEST_PARENT_A1_RECOVERY_CODES`                                                                                           |
| `coParentA1`                 | `PEN_TEST_CO_PARENT_A1_PASSWORD`                                                                                                                                                                                                    |
| `parentA2PasskeyOnly`        | `PEN_TEST_PARENT_A2_PASSKEY_ONLY_PASSKEY_CREDENTIAL_ID`, `PEN_TEST_PARENT_A2_PASSKEY_ONLY_PASSKEY_PRIVATE_KEY_JWK`                                                                                                                  |
| `coParentA2Invited`          | `PEN_TEST_CO_PARENT_A2_INVITED_NEW_PASSWORD`, the password their Invite is accepted with                                                                                                                                            |
| `parentB`                    | `PEN_TEST_PARENT_B_PASSWORD`                                                                                                                                                                                                        |
| `coParentBInviteExpired`     | `PEN_TEST_CO_PARENT_B_INVITE_EXPIRED_NEW_PASSWORD`, the password the harness tries their expired Invite with                                                                                                                        |
| Invites                      | `PEN_TEST_INVITE_TEACHER_A_YEAR3_ACCEPTED_TOKEN`, `PEN_TEST_INVITE_PARENT_A1_ACCEPTED_TOKEN`, `PEN_TEST_INVITE_PARENT_A2_ACCEPTED_TOKEN`, `PEN_TEST_INVITE_CO_PARENT_A2_PENDING_TOKEN`, `PEN_TEST_INVITE_CO_PARENT_B_EXPIRED_TOKEN` |
| Family Devices               | `PEN_TEST_FAMILY_DEVICE_A1_TOKEN`, `PEN_TEST_FAMILY_DEVICE_A1_REVOKED_TOKEN`, `PEN_TEST_FAMILY_DEVICE_A2_TOKEN`, `PEN_TEST_FAMILY_DEVICE_B_TOKEN`                                                                                   |
| Children's Picture Passwords | `PEN_TEST_CHILD_A1_YEAR3_PICTURE_PASSWORD`, `PEN_TEST_CHILD_A1_YEAR5_PICTURE_PASSWORD`, `PEN_TEST_CHILD_A2_YEAR3_PICTURE_PASSWORD`, `PEN_TEST_CHILD_A2_YEAR3_TWIN_PICTURE_PASSWORD`, `PEN_TEST_CHILD_B_YEAR3_PICTURE_PASSWORD`      |

A passkey's private key is a JSON Web Key for P-256, and its credential id is base64url. A unit test fails if a variable the package holds is missing from this table.

## Expected state changes

Signing in and probing change the deployment. These changes are a tester's own, not findings. Anything else that changed, or any of these that didn't happen, is worth reading.

| What the tester did                     | What changes                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any sign-in that succeeds               | A row in `sign_ins`, the adult's `users.last_login_at`, and a `sign-in.succeeded` entry in the Audit Log naming the method                                                                                         |
| A request on a sign-in                  | That sign-in's `sign_ins.last_used_at`, moved on at most once a minute                                                                                                                                             |
| Too many wrong passwords for an address | Every try for it answered `429` unchecked, and one `sign-in.rate-limited` entry in the Audit Log for the run, if the address has an account                                                                        |
| A refused password, code or passkey     | A `sign-in.failed` entry in the Audit Log, naming the step. A refused code counts towards the pending sign-in's five tries and the adult's five an hour in `totp_secrets.wrong_codes_at`                           |
| A password sign-in that asks for a code | A row in `pending_sign_ins` for five minutes, deleted once the code is accepted or five are refused, and its start in `totp_secrets.pending_sign_ins_started_at`                                                   |
| Five wrong codes in one hour            | The adult's `totp_secrets.code_pause_ends_at`, an hour on: every code for them is answered `429` unchecked until then. If their address is confirmed, the codes-paused email in the email platform stand-in's list |
| A TOTP code accepted                    | The adult's `totp_secrets.last_used_step`, which refuses the same code again                                                                                                                                       |
| A recovery code used                    | That code's row in `recovery_codes` is deleted, so the adult has one fewer                                                                                                                                         |
| A refused code to turn TOTP off         | A `two-factor.turn-off-refused` entry in the Audit Log, and the code counts towards the adult's five an hour, as at the sign-in step. Turning TOTP off emails a confirmed address                                  |
| A passkey sign-in                       | A row in `passkey_challenges` per challenge asked for, deleted when answered or once expired, and the passkey's `last_used_at`. Its sign count stays 0, because the soft authenticator keeps none                  |
| `coParentA2Invited`'s Invite accepted   | Their `users.password_hash` set, `invites.accepted_at` set, and, because it was a copied link, an email address check row and its email in the email platform stand-in's list                                      |
| A Family Device's token sent            | The device's `family_devices.last_seen_at` and `last_seen_from`, at most once a minute from one address. The response sets the cookie again with a fresh 400 days                                                  |
| A password change or reset              | Every Family Device the adult made is signed out, with a `family-device.revoked` entry each. The fixtures' four devices record no maker, so they keep playing                                                      |
| Signing out                             | That sign-in's row in `sign_ins` is deleted, and a `sign-out` entry is written to the Audit Log                                                                                                                    |
| Signing out other browsers              | Every other row of the adult's in `sign_ins` is deleted, and a `sign-out.other-browsers` entry is written to the Audit Log                                                                                         |
| Adding or removing a passkey            | If the adult's address is confirmed, a security notice in the email platform stand-in's list naming the passkey                                                                                                    |
| Asking to change an email address       | If the adult's address is confirmed, a notice to it in the email platform stand-in's list, and another when the change is confirmed. An address another account has gets a note instead of a link                  |
| Anything a probe does through the API   | What that route does. Its own scope issue's findings note says what each probe changed                                                                                                                             |

**Loading the fixtures again** (`pnpm pen-test:seed`) puts every fixture back as the plan has it: a used Invite is pending again, a used recovery code comes back and any a probe made by turning TOTP on again are gone, a password a probe set is replaced. It doesn't remove rows a probe added, so `sign_ins`, `passkey_challenges`, Audit Log entries and anything a probe created stay. Testers in the same window share one deployment, so one tester's changes can look like a finding to another. The log below is how they are told apart.

## Log the fixture ids you used

Every probe records, in its scope issue's findings note (`docs/pen-test/findings/<ID>.md`):

- **the fixtures it used,** by handle and id, such as `parentA1` (`e2000000-0000-4000-8000-ad0000000011`), as [the fixtures](./fixtures.md#the-identities) name them;
- **when,** in UTC, from its first request to its last;
- **what it changed** beyond the table above, such as a Child it deleted or a device it revoked, and whether it loaded the fixtures again afterwards.

It names a fixture, never a credential: no password, code, token, key, cookie or connection string goes into a findings note, an issue, a commit, a log or a prompt. A finding whose steps need a credential says which variable, such as `PEN_TEST_PARENT_A1_PASSWORD`.

## Revoking it at the end

Every credential in the package dies with the deployment: `pnpm pen-test:down` destroys the database that holds their hashes, and deletes the seed and the package from `.pen-test-deployment/`. That is half of [sign-off condition 6](./statement-of-work.md#sign-off-conditions). The other half is every copy: each tester deletes their package file and their cookie files, and an agent's environment ends with its run.

The owner fills this in at sign-off, and posts it on the E3 issue:

| Credential                                                                 | Revoked by                                   | Date |
| -------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| Every adult's password, TOTP secret and recovery codes                     | `pnpm pen-test:down`                         |      |
| Both passkeys                                                              | `pnpm pen-test:down`                         |      |
| The Invite tokens and the new passwords                                    | `pnpm pen-test:down`                         |      |
| The four Family Device tokens                                              | `pnpm pen-test:down`                         |      |
| The five Picture Passwords                                                 | `pnpm pen-test:down`                         |      |
| Every sign-in a tester made, and its cookie                                | `pnpm pen-test:down`                         |      |
| The fixture seed and `credentials-package.env` on the deployment's machine | `pnpm pen-test:down`                         |      |
| Each tester's copy of the package, and their cookie files                  | Each tester, who confirms it on the E3 issue |      |
| The out-of-band contact, for the external tester                           | The owner, when the external round closes    |      |
