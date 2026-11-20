# The pen-test fixtures

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The synthetic world a pen-test round probes, loaded into [the pen-test deployment](./deployment.md): two Schools, their staff, three Families and their Children, Family Devices, Invites and play. Every value is made up. Every id is fixed, so a probe, a findings note or a finding names a fixture by its handle or id, never by a credential ([rules of engagement](./rules-of-engagement.md#how-testers-behave)). Keep this page private on the same terms as the PRD.

The plan is `src/server/pen-test-fixtures/fixture-plan.ts`, pure data, with the handles below exported as `penTestFixtureIds`. The loader is `src/server/pen-test-fixtures/seed-pen-test-fixtures.ts`.

## Loading them

With the deployment up:

```bash
pnpm pen-test:seed
```

The first time, it generates the fixture seed into `.pen-test-deployment/fixture-seed.txt`, readable only by you. Then it hands the seed, on standard input, to `node dist/src/server/index.js seed-pen-test-fixtures` in the running `app` container, which loads every fixture in one transaction. It ends:

```text
Loaded the pen-test fixtures for 2026-11-17: 2 Schools, 11 adults, 3 Families, 5 Children, 4 Family Devices, 5 Invites and 94 play events. Their credentials come from the seed, and none is printed.
```

- **Loading again puts every fixture back as the plan has it,** whatever a probe did to it, by id: a revoked device stays revoked, a password a probe removed comes back, and a deleted Family is made again. It doesn't remove rows a probe added. This is how a tester recovers after destructive testing.
- **It loads only into a pen-test database.** It refuses, and writes nothing, unless `SECOND_SCHOOL_GATE_MET` is true, since the fixtures hold two Schools, and unless every adult already in the database has an email address at `pen-test.example`. Production fails the second check even once it meets the gate, because it holds the owner. So a probe that makes an adult uses an address at `pen-test.example`, or the fixtures can't be loaded again.
- **Times are relative to the day it loads,** worked out on the UK date. Each Child is born so that they are in their Year below on that day, which keeps every Teacher's Year Groups full after 1 September. The pending Invite expires six days later, so load again if a round runs longer than that.
- Loading twice on one day gives the same rows. To see that on the deployment, compare two dumps. The rows are sorted, because an update can move a row within its table, and the `\restrict` lines pg_dump writes with a fresh random key each time are dropped:

  ```bash
  pen_test_compose exec -T postgres pg_dump --username=wizzaroo --dbname=wizzaroo --data-only --schema=public | grep -Ev '^\\(un)?restrict ' | sort >first-load.sql
  pnpm pen-test:seed
  pen_test_compose exec -T postgres pg_dump --username=wizzaroo --dbname=wizzaroo --data-only --schema=public | grep -Ev '^\\(un)?restrict ' | sort >second-load.sql
  diff first-load.sql second-load.sql && echo "Same rows"
  ```

  Delete both files afterwards: they hold the fixtures' password hashes.

Don't run `seed-owner` on a deployment holding the fixtures: `admin` is its Admin, and `seed-owner` refuses once there is one.

## Credentials

No credential is in the repository. Every password, TOTP secret, recovery code, passkey key pair, Family Device token, Invite token and Picture Password is derived from the fixture seed by `buildPenTestFixtureCredentials` (`src/server/pen-test-fixtures/fixture-credentials.ts`). So the same seed gives the same hashes and the same rows, and a different seed gives every fixture new credentials. The seed is one of the deployment's secrets: teardown deletes `.pen-test-deployment/` and the seed with it. Testers get their credentials from the credentials package (E4), never the seed.

Passkeys are P-256 key pairs. The deployment stores the public key, and the private key, as a JWK, is for a soft authenticator, since there is no device to hold it. Its credential id is derived too.

## The identities

Email addresses are at `pen-test.example`, a domain reserved for examples, so nothing would ever be delivered; on the deployment, email goes only to the email platform stand-in. Every id starts `e2000000-0000-4000-8000-`, and its next two characters say what kind of fixture it is: `5c` a School, `ad` an adult, `fa` a Family, `c1` a Child, `de` a Family Device, `1a` an Invite and `d0` a deletion request.

### Schools

| Handle    | Id                                     | What it is                                                    | What it is for                                                                            |
| --------- | -------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `schoolA` | `e2000000-0000-4000-8000-5c0000000001` | Pen-test Primary A, Fixtureton; Classmate visits approved     | The School with two Families in one class, and a Teacher on other Year Groups beside them |
| `schoolB` | `e2000000-0000-4000-8000-5c0000000002` | Pen-test Primary B, Sampleford; Classmate visits not approved | Cross-School probes: the same Year Group as School A's class, at another School           |

### Staff

| Handle                | Id                                     | What it is                                                                  | What it is for                                                                                                                                                                              |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`               | `e2000000-0000-4000-8000-ad0000000001` | The Admin, `admin@pen-test.example`: password, TOTP and recovery codes      | Admin reach, bulk creation, the access log (H6) and deletion requests                                                                                                                       |
| `teacherAYear3`       | `e2000000-0000-4000-8000-ad0000000002` | Teacher at School A, Year 3: password, TOTP and recovery codes              | A Teacher whose class holds Families A1 and A2. Sent their Invites. Staff with TOTP                                                                                                         |
| `teacherAYears5And6`  | `e2000000-0000-4000-8000-ad0000000003` | Teacher at School A, Years 5 and 6: password and a passkey, no TOTP         | Cross-Year-Group probes at one School; reaches only Ben. An established Teacher with a passkey and no TOTP (H1)                                                                             |
| `teacherBYear3`       | `e2000000-0000-4000-8000-ad0000000004` | Teacher at School B, Year 3: password only                                  | Cross-School probes: the same Year Group as `teacherAYear3`. Staff with no second factor at all, as a new Teacher is (ADR 0036, H1), but 30 days on, so their first setup has closed (#243) |
| `teacherADeactivated` | `e2000000-0000-4000-8000-ad0000000005` | Teacher at School A, Year 3, deactivated: password, TOTP and recovery codes | Whether a deactivated adult's credentials, reach and Invites are refused everywhere                                                                                                         |

### Families and their Parents

| Handle                   | Id                                     | What it is                                                                                       | What it is for                                                                        |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `familyA1`               | `e2000000-0000-4000-8000-fa0000000001` | Pen-test Family A1, at School A: Ada in Year 3 and Ben in Year 5                                 | One of two Families in School A's Year 3 class; siblings in different Year Groups     |
| `parentA1`               | `e2000000-0000-4000-8000-ad0000000011` | A Parent in Family A1: password, TOTP and recovery codes; Invite accepted                        | A Parent with a second factor (A2)                                                    |
| `coParentA1`             | `e2000000-0000-4000-8000-ad0000000012` | A Parent in Family A1: password only                                                             | Co-Parent probes: what one Parent can see and change of the other                     |
| `familyA2`               | `e2000000-0000-4000-8000-fa0000000002` | Pen-test Family A2, at School A: twins Cara and Dev, both in Year 3                              | The other Family in School A's Year 3 class                                           |
| `parentA2PasskeyOnly`    | `e2000000-0000-4000-8000-ad0000000021` | A Parent in Family A2 with a passkey and no password; Invite accepted, then the password removed | The passkey-only Parent (H2). Staff see their Invite as accepted                      |
| `coParentA2Invited`      | `e2000000-0000-4000-8000-ad0000000022` | A Parent in Family A2 who hasn't signed in yet: no password, Invite pending                      | A pending Invite, made as a copy link by `teacherAYear3`                              |
| `familyB`                | `e2000000-0000-4000-8000-fa0000000003` | Pen-test Family B, at School B: Eli in Year 3; a deletion request pending                        | Cross-School and cross-Family probes; the Family with a pending deletion request (D3) |
| `parentB`                | `e2000000-0000-4000-8000-ad0000000031` | A Parent in Family B: password only; asked for the Family's deletion                             | A Parent with no second factor                                                        |
| `coParentBInviteExpired` | `e2000000-0000-4000-8000-ad0000000032` | A Parent in Family B who never signed in: no password, Invite expired                            | An expired Invite, emailed by `teacherBYear3`                                         |

### Children

| Handle             | Id                                     | What it is                                             | What it is for                                                                                 |
| ------------------ | -------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `childA1Year3`     | `e2000000-0000-4000-8000-c10000000001` | Ada, Family A1, School A, Year 3; Classmate visits on  | A Classmate who has opted in. Has play on the revoked device too                               |
| `childA1Year5`     | `e2000000-0000-4000-8000-c10000000002` | Ben, Family A1, School A, Year 5; Classmate visits off | Outside `teacherAYear3`'s reach and inside `teacherAYears5And6`'s. Ada's Gift goes to him      |
| `childA2Year3`     | `e2000000-0000-4000-8000-c10000000003` | Cara, Family A2, School A, Year 3; Classmate visits on | A Classmate who has opted in, in another Family from Ada                                       |
| `childA2Year3Twin` | `e2000000-0000-4000-8000-c10000000004` | Dev, Family A2, School A, Year 3; Classmate visits off | A Classmate who hasn't opted in                                                                |
| `childBYear3`      | `e2000000-0000-4000-8000-c10000000005` | Eli, Family B, School B, Year 3; Classmate visits on   | Same Year Group as Ada at another School, opted in where visits aren't approved: no Classmates |

### Family Devices

| Handle                  | Id                                     | What it is                                                | What it is for                                                                  |
| ----------------------- | -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `familyDeviceA1`        | `e2000000-0000-4000-8000-de0000000001` | Family A1's kitchen tablet                                | A device credential in a Family with two Year Groups and a Gift                 |
| `familyDeviceA1Revoked` | `e2000000-0000-4000-8000-de0000000002` | Family A1's old tablet, revoked seven days before loading | A revoked device whose token must be refused (F1); it recorded play before then |
| `familyDeviceA2`        | `e2000000-0000-4000-8000-de0000000003` | Family A2's laptop                                        | Cross-Family probes against Family A1, in the same class                        |
| `familyDeviceB`         | `e2000000-0000-4000-8000-de0000000004` | Family B's tablet                                         | Cross-School probes                                                             |

### Invites

| Handle                        | Id                                     | State    | What it is                                                          |
| ----------------------------- | -------------------------------------- | -------- | ------------------------------------------------------------------- |
| `inviteTeacherAYear3Accepted` | `e2000000-0000-4000-8000-1a0000000001` | Accepted | Emailed by `admin` to `teacherAYear3`                               |
| `inviteParentA1Accepted`      | `e2000000-0000-4000-8000-1a0000000002` | Accepted | Emailed by `teacherAYear3` to `parentA1`                            |
| `inviteParentA2Accepted`      | `e2000000-0000-4000-8000-1a0000000003` | Accepted | A copy link from `teacherAYear3` to `parentA2PasskeyOnly`           |
| `inviteCoParentA2Pending`     | `e2000000-0000-4000-8000-1a0000000004` | Pending  | A copy link from `teacherAYear3` to `coParentA2Invited`, for 6 days |
| `inviteCoParentBExpired`      | `e2000000-0000-4000-8000-1a0000000005` | Expired  | Emailed by `teacherBYear3` to `coParentBInviteExpired`              |

Staff saw the fourth state, not sent, for `parentA2PasskeyOnly` until #249, which shows any adult with a password, a passkey or an accepted Invite as accepted. No fixture adult is in it now.

### Deletion request

| Handle                   | Id                                     | What it is                                                                                       |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `deletionRequestFamilyB` | `e2000000-0000-4000-8000-d00000000001` | `parentB` asked for all of Family B to be deleted, three days ago. The Admin hasn't confirmed it |

## Play

Two days before loading, each Child plays one session on their Family's active device that records every kind of play event: answering questions and finishing activities five times, buying an Item, dressing their Character, saving and wearing an outfit, furnishing their Room, and finishing a times-tables check. Ada's Item is a Gift for Ben. Nine days before loading, Ada also played a short session on the device that was later revoked. That is history for F3 and F4 to work on. Play event ids start `e2000000-0000-4000-8000-e0`; the Rooms Classmates see are worked out from it as the server does after an upload.
