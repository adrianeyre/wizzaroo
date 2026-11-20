# TOTP secrets are sealed with a key the database never holds

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Teachers and the Admin must sign in with a second factor because they see many Families' Children (section 8 of `wizzaroo.md`, [ADR 0026](0026-schools-and-teachers.md)). Until now each TOTP secret was kept in `totp_secrets.secret`, and a secret being set up in `totp_setups.secret`, exactly as issued, and each recovery code as one unsalted SHA-256. So anyone who read the database, through a leaked connection, a backup with its key or an API bug inside a reach, held every adult's second factor, and could find a recovery code offline in GPU-days (pen-test A2: #254, #255).

## Decision

- **The secret is sealed.** Every TOTP secret, and every secret being set up, is stored as `v1.<IV>.<ciphertext>.<tag>` (base64url): AES-256-GCM with a fresh random 12-byte IV per value, under `TOTP_SECRET_KEY`. The adult's id is the additional data, so a sealed secret copied onto another adult's row doesn't open there. `src/server/auth/totp-secret-box.ts` does this and nothing else.
- **The key lives outside the database.** `TOTP_SECRET_KEY` is 32 random bytes as 64 hexadecimal characters, made with `openssl rand -hex 32`. Only the app is given it, by Compose from `.env`. The server won't start if it is unset, empty or not 64 hexadecimal characters. It is threaded from `loadVars` through `buildHttpServer` to every route that seals or opens a secret; tests that build a server without one read it from the environment, as the request-rate policy is read.
- **A value that doesn't open makes no code.** A secret sealed under another key, for another adult, changed, or held as issued is refused as a wrong code, never read as it is. Recovery codes don't need the secret, so an adult whose secret can't be opened still signs in with one.
- **Recovery codes are argon2id.** Each is hashed with a salt of its own, so a copy of `recovery_codes` is searched one code and one stored hash at a time. Each code carries about 59.5 bits and is checked against each of the adult's at most ten hashes, so the costs are lighter than a password's: 8 MiB and one pass, about 1.3 ms a check. Rows have a `uuid` id of their own, and a code is spent by deleting the row it matched, under a row lock, so racing requests spend it once.
- **What was stored before is converted on start-up.** A migration holds no key and can't run argon2. So before it listens, the server, as `wizzaroo_server`, seals every secret still held as issued and stretches every recovery code hash kept as one SHA-256 into `argon2id(sha256(code))`, which is what every code is checked as. It logs how many of each, and how many sealed secrets this key doesn't open. Until then neither old form is accepted. No single SHA-256 of a code is left stored.
- **The key is backed up apart from the database.** The nightly backups hold the sealed secrets and never the key. The owner keeps the key in the password manager beside the age private key. A restore without it loses every adult's TOTP: each signs in with a recovery code, or asks the owner to delete their `totp_secrets` row, and sets it up again.

## Considered options

- **Postgres `pgcrypto` with the key passed in each query:** the key would reach the database's statement log and every connection that runs the query. Sealing in the app keeps it out of the database entirely.
- **A key derived from another secret the app already holds, such as the database password:** one leak would then give both, and changing the database password would lose every secret.
- **One SHA-256 with a server-side pepper for recovery codes:** fast, and safe while the pepper is safe, but a second key to keep, and nothing left once both leak. argon2id is what passwords already use.
- **Re-seal on read instead of on start-up:** an adult who never signs in would keep a secret as issued indefinitely.
- **A deterministic IV for every secret:** rows would be repeatable, but two secrets for one adult under one IV would leak. Only the pen-test fixtures derive an IV, from the same seed the secret comes from, so loading them twice gives the same rows.

## Consequences

- Changing `TOTP_SECRET_KEY` needs every secret re-sealed first; there is no command for it yet, so for now the key is not changed.
- The fixtures seal each secret under the deployment's own key, and the credentials package still gives testers the secret as issued.
- `docker-compose.yml` refuses to start without the key, and the pen-test deployment generates one, adding it to an older `.env`.
