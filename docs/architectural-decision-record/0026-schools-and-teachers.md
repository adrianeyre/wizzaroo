# Schools and Teachers, with School and Family as boundaries in the data

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo was for the owner's own Family ([0001](./0001-family-is-the-data-boundary.md)). The owner now wants it to serve Schools: an Admin creates Schools and Teachers, Teachers bring in Parents and follow the Children in their Year Groups, and nobody signs up.

A **School** is a name and a town, created only by the Admin. A **Teacher** belongs to exactly one School and teaches one or more of its Year Groups (always Years 1 to 6, never created, and possibly empty). **Family** stays the household, because siblings share the Family Chest, Gifts and Family Devices and can attend different Schools. So a Child belongs to one Family and one School, and a Parent belongs to the School that invited them and to every School one of their Children attends. Parents, Teachers and the Admin can all create Children, within their reach. Only the Admin and Teachers create and invite Parents, and only the Admin creates and invites Teachers. Parent-to-Parent Invites are removed.

A Teacher's reach is read-only: the Children in their Year Groups at their School, those Children's Parents, and the School's Parents who have no Children yet. A Teacher can send those Parents password resets and resend their Invites, but never changes how a Child plays and never moves or removes anyone. The Admin, still the owner alone, reaches everything, and every time the Admin opens a Child's progress it is logged. Teachers and the Admin must sign in with two-factor authentication or a passkey.

A Child's Year Group is worked out from their birth month and year (never the day) using the English school year, so it moves up every 1 September and each Teacher's Year Groups show the new cohort automatically. An optional one-year adjustment covers Children who are not in their age's year. This replaces a Parent changing the Year Group each September ([0025](./0025-one-island-per-year-group.md)).

The API scopes every query by the caller's reach, taken from their credential and never from the request, and integration tests prove that Families, Schools and Year Groups can't see each other. The compliance package that [0001](./0001-family-is-the-data-boundary.md) deferred becomes a gate: before a second School is added, all of these must be in place together: row-level security, ICO registration, a privacy policy, a data processing agreement with each School, data export and deletion for Parents, logged Admin access, and nightly encrypted Postgres backups kept off the home server, which replaces "no backups" in [0002](./0002-self-hosted-behind-a-cloudflare-tunnel.md). Until then the owner's own Children sit in one School created by the migration.

## Considered Options

- **Parent belongs to exactly one School**, as first asked: breaks for siblings at an infant and a junior school, which is common in England.
- **Dropping Family and hanging Children directly off Parents**: loses the shared Family Chest, Gifts and Family Devices, and makes two Parents of one Child awkward.
- **Year Group typed in by a Parent**: drifts out of date every September, and Teachers' views would silently show the wrong cohort.
- **Teachers able to change play settings**: Parents keep that control; a Teacher who could unlock Islands or change limits would be acting on a Family's home play without the Parents.

## Amended

Amended by [0035](./0035-teachers-lock-what-a-child-plays.md): Teachers can lock Islands and turn Regions and Games off for the Children in their Year Groups, and their Parents can't turn those back on. Everything else a Teacher reaches stays read-only.
