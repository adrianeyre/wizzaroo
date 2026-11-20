# Family only for now, with Family as the boundary in the data

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo is for the owner's own Family, so there is no sign-up, no ICO registration and no data export or deletion flow yet. Every row about a Child still traces back to exactly one Family from day one. The API takes the Family from the caller's credential, never from the request, and scopes every query by it. One integration test proves that one Family cannot read another's data. This keeps opening Wizzaroo to other families cheap, without paying the compliance cost up front.

## Considered Options

- **Postgres row-level security as well as API scoping**, as the first PRD draft asked. Rejected for now: every connection would have to set the current Family, and every policy would be written and tested twice, for an app with one Family in it.
- **No Family boundary at all.** Rejected: adding one later means touching every table and query.

## Consequences

Letting a second family in triggers all of these together: row-level security, ICO registration, a privacy policy, data export and deletion for Parents, and a logged Admin action for reading another Family's data.

## Superseded

Superseded by [0026](./0026-schools-and-teachers.md): Wizzaroo now serves Schools, with School and Family both boundaries in the data. The compliance package listed above is now a gate on adding a second School.
