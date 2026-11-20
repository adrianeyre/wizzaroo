# Self-hosted on the home server behind a Cloudflare Tunnel, with no backups

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Wizzaroo runs on the owner's home server under Docker Compose: an `app` container (the API, which also serves the PWA), and `postgres` on an internal network only. A `cloudflared` container routes `wizzaroo.adrianeyre.co.uk` to `app`. The tunnel is an outbound connection, so a changing public IP address, CGNAT and closed ports don't matter, and Cloudflare provides the HTTPS a PWA needs.

## Considered Options

- **Firebase (Spark) or Supabase (Free).** Rejected: Firebase has hard caps, free Supabase projects pause after a week of inactivity, and self-hosting gives control and real SQL.
- **A DNS A record with dynamic DNS.** Rejected: it exposes the home IP address, needs open ports, has a short gap after every IP change, and fails behind CGNAT.
- **Cloudflare Access in front of the app.** Rejected: its sessions expire and redirect to a login page, which breaks a Family Device's long-lived sign-in and the PWA's background updates. Wizzaroo's own sign-in guards the API ([0005](./0005-family-devices-and-picture-passwords.md)).

## Consequences

There are deliberately **no database backups**. The owner accepts that losing the home server's disk loses the Children's progress. Don't add a backup container without revisiting this decision.

## Amended

Amended by [0026](./0026-schools-and-teachers.md): from the second School on, a nightly encrypted Postgres backup is kept off the home server.
