# Row-level security through a reach role set for each request

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

The API scoping every query by the caller's reach ([0026](./0026-schools-and-teachers.md)) is one wall between Families. Row-level security in Postgres is the second, so that a query that forgets its filter still can't read or change another Family's rows.

Every table holding a Child's or an adult's data has row-level security on, with one policy for the `wizzaroo_reach` role, a role nobody can log in as. Each request that acts for someone runs its queries in one transaction that first switches to that role and records who is calling, with `set_config(..., true)` so both end with the transaction: the user (a Parent or the Admin, or none for a Family Device), their Family, and whether they are the Admin. The policies read those settings through small SQL functions: a Family's rows are within reach of its Parents, its Family Devices and the Admin; an adult's own sign-ins, passkeys and codes only of that adult and the Admin. Co-Parents can see each other's account rows, but not each other's sign-ins or codes, and a Family Device sees no adult's rows at all. A connection that hasn't said who is calling reaches nothing. A test fails if any table in the schema lacks row-level security or a policy, so a new table must come with one. The role gets grants table by table, never by default, so a new table is unreachable until its migration grants it.

The database owner, which applies migrations, bypasses the policies, as owners do. The server uses it, outside any reach, only to check a credential before anyone is known (signing in, a reset link, an Invite, a Family Device's cookie) and to check an email address isn't used by another account. Everything else a signed-in Parent, the Admin or a Family Device does runs within their reach. A Family export runs within the Parent's own Family's reach even for the Admin, so it can never include another Family.

A Teacher's reach needs no setting of its own: the policies look the caller up in `teachers` and `teacher_year_groups`, and a Teacher reads, never changes, the Children in their Year Groups at their School, those Children's Characters, play and Families, their Parents, and the School's Parents who have no Children yet (`school_parents`) with their Families, so a Teacher can add a Family's first Child. Those Teacher policies are `FOR SELECT` only, so every write still needs the Family's reach. The functions that look a Teacher up are `SECURITY DEFINER` with a fixed `search_path`, so they can read `teachers` and `children` whatever the caller's own policies allow, and they answer only yes or no. A Child with no School yet is in no Teacher's reach. A Child's Year is worked out from their birth month and year in the policies as in the API (`wizzaroo_school_year`), on the UK date the API sets for the request (`wizzaroo.today`), so both agree and follow the cohort on 1 September.

A Teacher still brings people in: they create Parents, a household's second adult, their Invites and password resets, and Children in their Year Groups. Those writes run as the owner, once the API has checked within the Teacher's reach that the School, Family, Parent or Year Group is theirs, because they create credentials and rows the Teacher's connection could not see yet, as an Invite or a reset link does. Two lookups run as the owner too, as email address checks do: whether an uploaded Parent's email already belongs to someone, and that Parent's Family's existing Children, so an upload can refuse a Parent outside the Teacher's reach or a likely duplicate. Every Family can read when the Admin opened one of its Children's progress, so its data export includes it.

## Considered Options

- **A login role per caller, or one per School**: Postgres roles are cluster-wide and slow to manage, and a role per Family would mean thousands of them.
- **A connection held for the whole request, with session-level settings**: settings outlive the request if the reset is missed, so a pooled connection could carry one Family's reach into the next request. A transaction can't leak.
- **Forcing row-level security on the owner too**: the credential checks before anyone is known need to read across all accounts, so they would need a second role anyway; keeping the owner as that role is simpler.
- **Leaving it to the API alone until a second School joins**: [0026](./0026-schools-and-teachers.md) makes row-level security part of the gate, and it is cheaper to build while there are two kinds of reach than four.

## Amendment, 17 November 2026: the app logs in as a role of its own, and the owner only migrates

The owner described above was the image's superuser, and the app logged in as it, so any SQL the app could be made to send could `RESET ROLE` out of a reach, turn row-level security off, run programs in the database's container and empty the Audit Log (pen-test finding D1-1, #273). From migration 0031:

- **The owner only migrates.** A `migrate` step, a container of its own in `docker-compose.yml`, applies the migrations as the owner and is the only one given its password. The app is never given it.
- **The app logs in as `wizzaroo_app`.** It isn't a superuser, has no `BYPASSRLS` and owns no table, and the server refuses to start on a login that is, or can become, any of those. Its own grants and policies are the reach's, inherited from `wizzaroo_reach`, and a reach runs on a pool of its own, so `RESET ROLE` inside a reach gives back no more than the reach.
- **The paths that ran as the owner run as `wizzaroo_server`.** That is the credential checks before anyone is known, the email-address checks, and the staff writes and two staff lookups above. The app's login can become it but holds none of its grants until it does. Its reach is written down in migration 0031: `SELECT`, `INSERT`, `UPDATE` and `DELETE` on every row of every table, through a policy per table, but no `TRUNCATE`, no DDL and no programs. On the Audit Log it may read and add, never change, and delete only an entry older than the twelve months ADR 0041 keeps them.
- **Row-level security stays unforced.** It no longer matters: nothing the app runs is the owner.

The SQL the app sends inside a reach still decides the reach, as before, through its settings and the roles its login can become, so the API is still the wall against SQL the app is made to send. What it can no longer do is anything only the owner or a superuser can.

`wizzaroo_server` seeing every row is the decision this ADR already made for the owner. It stops being acceptable when the second-School gate in [0026](./0026-schools-and-teachers.md) is met: by then its grants narrow to the tables and commands those paths use, table by table, and a test pins them.

Proposed by the pen-test fixes; owner to confirm.

## Amendment, 18 November 2026: a Parent route narrows the reach, and a deactivated Teacher reaches nothing

Four pen-test findings showed the policies leaving to the API what the second wall should check too. From migration 0049:

- **A Parent route runs within the Parent's own Family alone** (#261). `runAsSignedInParent` turns the Admin's reach off and sets `wizzaroo.own_family_only`, as the Family export already did. The Teacher policies skip a caller with that setting, so a Teacher who is also a Parent gets no Teacher reads on their Parent routes, and the owner's Parent dashboard reaches no other Family even though they are the Admin. The route still learns the adult's roles; only the database's reach narrows.
- **A Teacher's reach needs their account to be active** (#266). The functions that look a Teacher up also read `users.deactivated_at`, so a reach naming a deactivated Teacher reaches nothing a Teacher would, as one naming no one. The check is in the Teacher functions, which already read tables per row, and not in `wizzaroo_caller_user_id()` itself: a `SECURITY DEFINER` lookup there would run for every row every policy checks, the Admin's reads of every Family's play included. A deactivated Parent or Admin is still refused by the API alone, since deactivation ends their sessions and `loadSignedInUser` refuses them.
- **No reach changes who is in a Family** (#275). `family_parents` is `FOR SELECT` within a reach, and the reach role holds only `SELECT` on it. An adult joins a Family only as `wizzaroo_server`, when staff add them once their reach is checked or a Parent agrees to a join request, and leaves one only when they or their Family are deleted.
- **A Family Device's reach changes no Family Device** (#276). It reads its Family's devices. Signing a device in and revoking it need a reach naming a Parent of that Family, and a device's last contact is recorded as `wizzaroo_server` before its reach opens.
- **A Teacher's upload adds only to a Family in their reach** (#265, #277). A row naming an existing Parent outside the Teacher's reach is skipped, whatever School that Parent is at, so the owner-run lookup above refuses exactly what this ADR says it does.
- **The lookup refuses without saying why** (#278, #291). For a Teacher, every address with an account outside their reach, staff included, gets one reason that names no role and no School. Their preview treats such an address as one no one has, and the upload then skips its row, so the lookup run as the owner tells the Teacher nothing of whose an address is.

Proposed by the pen-test fixes; owner to confirm.

## Amendment, 18 November 2026: grants only what routes make, functions read only real tables, and no reach reads a Picture Password hash

Three pen-test findings narrowed what the reach role holds. From migrations 0053 to 0055:

- **Each table grants only the commands a route makes on it within a reach** (#298). An upsert counts as `INSERT` and `UPDATE`, and a locking read (`SELECT ... FOR UPDATE`) as `UPDATE`; a foreign key's cascade runs as the table's owner and needs no grant. Most policies are `FOR ALL` with no `WITH CHECK`, so the grant is the only other layer between a query bug and a write no route makes. A route that later needs a command grants it in its own migration, and the D5 sweep pins every table's grant.
- **A policy's functions read the real tables alone** (#299). Every function a policy calls that reads a table, `SECURITY DEFINER` or not, has a `search_path` of `pg_catalog, public, pg_temp`, so a session's temporary table can't stand in for the table it names. `TEMPORARY` on the database is revoked from PUBLIC, so the reach role can't make a temporary table at all. No route needs one.
- **No reach reads a Picture Password hash** (#304). Row-level security picks rows, not columns, so the reach role holds `SELECT` on every column of `children` but `picture_password_hash`, and a new column is unreadable within a reach until its migration grants it. A Family Device's reach is handed its own Family's hashes by `wizzaroo_family_device_picture_password_hash`, a `SECURITY DEFINER` function that answers only a reach naming no adult, for a Child of that reach's Family, and null otherwise; `GET /api/play/family` reads them through it. It is the one such function that answers with more than yes or no. Staff and Parents read `has_picture_password`, a column Postgres works out from the hash. A Parent's reach reads no hash either: no Parent route needs one.

Proposed by the pen-test fixes; owner to confirm.
