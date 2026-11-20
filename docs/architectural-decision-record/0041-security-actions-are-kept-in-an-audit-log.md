# Security actions are kept in an audit log

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Until now the only record of who did what was the container log, which holds whatever each route chose to write, is kept for as long as Docker keeps it, and can't be searched from the app. That is no help in answering "who deleted this Family?" or "is someone guessing passwords?", and it is a copy of personal data with no retention (pen-test H14).

Wizzaroo now keeps an **Audit Log**: one row in `audit_log_entries` for each security action. The actions are a closed set, held as a Postgres enum:

- **Signing in and out:** a sign-in that worked (with its method: `password`, `password-and-code`, `passkey` or `invite`), a sign-in that failed (at the `password`, `code` or `passkey` step), and signing out.
- **Credentials:** two-factor turned on or off, a code refused when turning it off (`wrong-code`, or `codes-paused` while the adult's codes are paused; #257), a passkey added (including by QR hand-off) or removed, a password changed, set, removed or reset, and an email address changed.
- **Family Devices:** one made or signed out, and a Picture Password set.
- **People and places:**
  - a School created or deleted, or its Classmate visits approved or withdrawn
  - a Teacher created or their Year Groups changed
  - a Parent created
  - an adult deactivated
  - an Invite or a password reset sent by staff
  - a Child created, moved to another School or deleted
  - a Family deleted
  - a Deletion Request made or confirmed
- **The Admin's changes to what isn't theirs** (pen test B3, #288): the "logged Admin access" the second-School gate asks for covers what the Admin changes as well as what they read.
  - Stars given to a Child (`child.stars-awarded`), or coins to a Family Chest (`family-chest.coins-awarded`)
  - a School's name or town changed (`school.changed`)
  - another Family's Child's details, limits, Teacher locks, Classmate visits or birth changed (`child.changed`, `child.limits-changed`, `child.teacher-locks-changed`, `child.classmate-visits-changed`, `child.birth-given`). The Admin's change to their own Family's Child is a Parent's, and a Parent's changes aren't logged.

Each entry holds only what it needs:

- when it happened and the action;
- the actor, which is an adult's id with their roles at the time, a Family Device's id, or no one (a failed sign-in);
- the target's type and id;
- one short `detail` drawn from a fixed list per action, or an id (the new School, the new Family);
- the caller's IP address, on sign-ins only.

No names, email addresses, nicknames, request bodies or before-and-after values are kept. A failed sign-in against an email that has an account points at that account's id; the email typed is never stored. Picture Passwords are checked on the device (ADR 0005), so a wrong Picture Password never reaches the server and isn't logged.

The address comes from Cloudflare's `CF-Connecting-IP` header, which the tunnel sets on every request, and falls back to the socket's address. The header is believed only from `cloudflared`'s own socket, the fixed address `TUNNEL_PROXY_ADDRESS` names on Compose's `tunnel` network; from any other socket the socket's address is recorded, whatever the header says (pen test I2a, #332). Anything in that header that isn't an IP address is ignored. `trustProxy` stays off, so `request.ip` elsewhere is unchanged (pen-test H12 is still its own decision).

## Where the rules live

- **The same transaction as the action.** Each entry is written in the transaction that does the work. If the entry can't be written, the action is rolled back, and a refused action writes nothing. A failed sign-in has no transaction to share, so it is written on its own before the refusal is sent; if that write fails, the request fails.
- **No foreign keys.** `actor_id` and `target_id` reference nothing, so the cascade that erases a deleted Family can't erase the record that it was deleted. The ids left behind name no one once the rows they pointed at are gone.
- **Append-only for the app.** The `wizzaroo_reach` role is granted `SELECT` and `INSERT` only. One policy lets the Admin's connection read entries. Another lets a connection insert entries only in its own name: an adult as themselves, or a Family Device as one of its own Family's devices. Check constraints keep the actor and target columns consistent and keep IP addresses off anything but a sign-in.
- **Twelve months.** The server deletes entries older than twelve months when it starts and once a day after that, as the database owner.
- **Read by the Admin alone.** `GET /api/admin/audit-log-entries` is behind `runAsSignedInAdmin`, so it needs the Admin role and a second factor. It returns 50 entries a page, newest first, with the total count, filtered by action and by a UK date range. The Admin dashboard has an "Audit log" section with numbered pages. Opening the log isn't itself logged.
- **Each adult's own entries in their export** (pen test D3, #285). The Family export holds the downloading adult's own entries, the ones they took and the ones about them, with the IP address a sign-in came from, so a subject access request answered with it is complete. The reach role still can't read the log, so the export reads those entries on the server's own path, for that one adult. An entry another adult took about them keeps that adult's roles and leaves out their id, so no one else's identity is in the file. A sign-in that failed against their account keeps the address it came from, which may be someone else's: it is the record of an attempt on their account.

## Considered Options

- **Keep relying on the container log:** no work, but nothing can be searched or bounded, and it holds whatever each route happens to log.
- **Snapshot names into each entry:** easier to read ("Twoey deleted"), but it would keep a deleted Child's name for a year after their Parent asked for it to go.
- **Foreign keys with `ON DELETE SET NULL`:** keeps the entry but loses which Family was deleted, which is the one thing the entry is for.
- **Store every request's IP and user agent:** more to go on in an investigation, but every Parent's and Family Device's address would be held for a year, for little gain over sign-ins alone. Outside the log, a Family Device keeps the one address it was last used from, read the same way, so its Parent can spot a copy playing elsewhere (#302, [ADR 0005](./0005-family-devices-and-picture-passwords.md)); each new address replaces it, and signing the device out clears it.
- **Fold `admin_access_logs` into this table:** that log has a different reader (each Family sees the Admin's views of its Children, and it goes in the Family's export), so it stays separate.
- **Cursor pagination:** steadier under concurrent writes, but numbered pages are what the Admin dashboard already uses, and the log holds at most a year of one household's actions.

## Consequences

- Adding a new kind of action needs a migration to extend the `audit_action` enum.
- The database owner can still change or delete entries, because the app connects as a superuser (pen-test H4). The append-only rule holds against the reach role, not against someone holding the database password.
- A deleted Family's ids stay in the audit log for up to twelve months. They point at nothing, but the deletion tests check that table on its own.
- `admin_access_logs` follows the same rule for a deleted Child (pen test B3, #287): its `child_id` is no longer a foreign key, so the record that the Admin opened a Child outlives the Child's deletion, or their Family's, as `child.deleted` does here. The daily purge deletes a deleted Child's rows once they are twelve months old. A Child still there keeps every row.
- The Admin deletes a Child or a Family only once one of its Parents has asked (pen test D3 and B3, #284, #290), so every `child.deleted` or `family.deleted` the Admin writes comes after a `deletion-request.confirmed`.
- Request rate limiting (pen-test H8) is still not built. The log shows password guessing; it doesn't stop it.
