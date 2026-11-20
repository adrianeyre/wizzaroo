# Restoring a backup

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Every night the `backup` container takes a `pg_dump` of the `wizzaroo`
database, encrypts it with [age](https://age-encryption.org) to a public key,
and sends it with [rclone](https://rclone.org) to two targets set in `.env`:
the NAS on the LAN (`BACKUP_RCLONE_REMOTE`), where it keeps the newest
`BACKUP_KEEP_NIGHTS` backups (30 unless set) and deletes older ones, and the
off-site bucket (`BACKUP_RCLONE_OFFSITE_REMOTE`), where Object Lock keeps
every backup for 90 days. Restore from the NAS when it's there, since it's
nearer. Restore from the bucket when the NAS is gone or its copies are. See
[deploying to the home server](./deploying-to-the-home-server.md#backups) for
setting it up.

A Family, Child or adult the Admin has deleted stays deleted after any
restore. Each deletion is kept by id in `confirmed_deletions`, and the `backup`
container sends it to both targets within a minute of the Admin confirming it,
as one file per id in `wizzaroo-deletions/`, named for what was deleted and
holding only when. `restore.sh` reads that folder from the target it restores
from and deletes every one of them again, so a backup taken before a deletion
never brings it back.

A backup can only be read with the age **private** key, which never lives on
the home server. Keep it somewhere safe off the server, such as a password
manager. Without it, every backup is unreadable.

A backup holds each adult's TOTP secret sealed, not the key that opens it:
that is `TOTP_SECRET_KEY` in `.env`, kept in the password manager beside the
age key ([the TOTP secret key](./deploying-to-the-home-server.md#the-totp-secret-key)).
Restore onto a server whose `.env` holds the same key. Without it, every adult
with two-factor authentication signs in with a recovery code and sets it up again.

`src/backup-restore.test.ts` runs this restore in the test suite: it backs up
a database with the schema applied, restores the latest backup into an empty Postgres with
`restore.sh`, and checks the rows and the row-level security policies came
back. It also restores a backup taken before a Family's deletion, from either
target, and checks the Family stays deleted.

## Restoring into an empty database

The `backup` image carries `restore.sh` as well as `backup.sh`. It downloads
a backup (the newest unless you name one), decrypts it, fetches the
confirmed deletions from the same target, creates the `wizzaroo_reach`,
`wizzaroo_server` and `wizzaroo_app` roles if the server doesn't have them yet
(the dump's grants and policies name them, but roles belong to the server, not
the dump), and restores the dump with `pg_restore --exit-on-error --no-owner`.
It then adds the deletions to the restored `confirmed_deletions`, deletes every
Family, Child and adult they name, and checks none is left. It stops at the
first error, so a restore either finishes or tells you why not. A target it
can't read stops it before anything is restored. It needs an **empty** database:
restoring over a live one fails on the first table that already exists.

1. Stop the app, so nothing writes while you restore:

   ```bash
   docker compose stop app
   ```

2. Put the age private key on the server for the length of the restore, in a
   file only you can read:

   ```bash
   install -m 600 /dev/null ~/wizzaroo-backup-identity.txt
   # paste the key, starting AGE-SECRET-KEY-, into that file
   ```

3. Empty the database. This deletes everything in it, which is the point:

   ```bash
   docker compose exec postgres dropdb --username=wizzaroo --force wizzaroo
   docker compose exec postgres createdb --username=wizzaroo wizzaroo
   ```

   On a new server, `docker compose up -d postgres` gives you an empty
   database already.

4. List the backups if you want one other than the newest:

   ```bash
   docker compose run --rm backup sh -c 'rclone lsf "$BACKUP_RCLONE_REMOTE"'
   ```

5. Restore, giving a backup's name instead of `latest` to choose one. It runs
   as root only so it can read your key file, and every container drops every
   capability, so it adds back the one that reads a file root doesn't own
   (`DAC_READ_SEARCH`). `backup` logs in as `wizzaroo_backup`, which can only
   read, so the restore is given the superuser, `wizzaroo`, and its password
   from `.env` for this one run:

   ```bash
   export PGPASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' .env)"
   docker compose run --rm --user root --cap-add DAC_READ_SEARCH \
     --volume ~/wizzaroo-backup-identity.txt:/run/secrets/identity.txt:ro \
     --env BACKUP_AGE_IDENTITY_FILE=/run/secrets/identity.txt \
     --env PGUSER=wizzaroo --env PGPASSWORD \
     backup restore.sh latest
   unset PGPASSWORD
   ```

   It finishes with two lines:

   ```text
   backup.restore.deletions.applied sent=… recorded=… remaining=0
   backup.restore.finished name=… database=wizzaroo
   ```

   `sent` is how many deletions the target held, and `recorded` how many the
   restored database now keeps, which is at least as many. A line
   `backup.restore.deletions.none-sent` before them means the target held no
   deletions at all. That is right only if the Admin has never deleted a Family
   or a Child since these backups began. Otherwise stop, and restore from the
   other target.

6. Check the deletions were applied. This must print `0`:

   ```bash
   docker compose exec postgres psql --username=wizzaroo --dbname=wizzaroo --tuples-only --command="select count(*) from confirmed_deletions d where exists (select from families where id = d.target_id) or exists (select from children where id = d.target_id) or exists (select from users where id = d.target_id)"
   ```

   Anything else means a deleted Family, Child or adult is back: don't start
   the app. Run `restore.sh` again into an empty database.

7. Start the stack: `migrate` finds the schema the backup brought and
   gives `wizzaroo_app` its login and `APP_DATABASE_PASSWORD` again, then the
   app starts. Remove the private key from the server:

   ```bash
   docker compose up -d
   shred -u ~/wizzaroo-backup-identity.txt
   ```

8. Sign in at `https://wizzaroo.adrianeyre.co.uk/parent/` and check the
   Children and their progress are there.

## Restoring from the off-site bucket

The server's own B2 key can only write, so a restore from the bucket uses the
**read-only** key from the password manager, in an rclone config of its own
that is on the server only for the restore:

1. Put that config on the server, in a file only you can read:

   ```bash
   install -m 600 /dev/null ~/wizzaroo-restore-rclone.conf
   ```

   ```ini
   [offsite-read]
   type = b2
   account = …
   key = …
   ```

2. In steps 4 and 5 of restoring into an empty database, add these lines to
   `docker compose run`, with your bucket's name. Step 4 needs
   `--user root --cap-add DAC_READ_SEARCH` as well, to read the file, as step 5
   already has for the key:

   ```bash
   --volume ~/wizzaroo-restore-rclone.conf:/run/secrets/restore-rclone.conf:ro \
   --env RCLONE_CONFIG=/run/secrets/restore-rclone.conf \
   --env BACKUP_RCLONE_REMOTE=offsite-read:wizzaroo-backups-k3x9 \
   ```

3. Afterwards, `shred -u ~/wizzaroo-restore-rclone.conf`.

A file the server hid in the bucket is still there, locked, for its 90 days,
but `restore.sh` can't see it. Unhide it in Backblaze's web console first:
**Browse Files**, show all versions, and restore the hidden one.

## Drilling a restore

A drill restores into `restore-drill`, a throwaway Postgres held in memory on
the internal `database` network, which asks for the superuser's password like
the live one. The app keeps running and the live database
is never touched. Drill from both the NAS and the bucket: every quarter, and
after any change to the backups, the keys, the NAS or the bucket.

1. Put the age private key on the server, as in step 2 of
   [restoring into an empty database](#restoring-into-an-empty-database).

2. Start the drill database:

   ```bash
   docker compose --profile drill up -d --wait restore-drill
   ```

3. Restore the newest backup from the NAS into it. `restore-drill` asks for
   the superuser's password from `.env`, as `postgres` does, so nothing else on
   the database network gets into the restored data without it
   ([pen test I4, #315](../pen-test/findings/I4.md)):

   ```bash
   export PGPASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' .env)"
   docker compose run --rm --no-deps --user root --cap-add DAC_READ_SEARCH \
     --volume ~/wizzaroo-backup-identity.txt:/run/secrets/identity.txt:ro \
     --env BACKUP_AGE_IDENTITY_FILE=/run/secrets/identity.txt \
     --env PGHOST=restore-drill --env PGUSER=wizzaroo --env PGPASSWORD \
     backup restore.sh latest
   unset PGPASSWORD
   ```

   It finishes with `backup.restore.deletions.applied sent=… recorded=…
remaining=0` and `backup.restore.finished name=… database=wizzaroo`.

4. Compare it with the live database:

   ```bash
   check='select (select count(*) from users) as users, (select count(*) from families) as families, (select count(*) from children) as children, (select count(*) from characters) as characters, (select count(*) from play_events) as play_events, (select count(*) from pg_policies) as policies, (select count(*) from confirmed_deletions) as deletions, (select count(*) from confirmed_deletions d where exists (select from families where id = d.target_id) or exists (select from children where id = d.target_id) or exists (select from users where id = d.target_id)) as deleted_but_present'
   docker compose exec postgres psql --username=wizzaroo --dbname=wizzaroo --command="$check"
   docker compose exec restore-drill psql --username=wizzaroo --dbname=wizzaroo --command="$check"
   ```

   `policies` and `deletions` must match exactly, and `deleted_but_present`
   must be `0` in both. The other counts should match too, give or take what
   happened since the backup was taken, which is mostly new `play_events`.
   Zeros, or a restore that stopped with an error, mean the drill failed.

5. Empty the drill database and do it again from the bucket. Run step 3 with
   the lines from
   [restoring from the off-site bucket](#restoring-from-the-off-site-bucket)
   added, then step 4:

   ```bash
   docker compose --profile drill rm --stop --force restore-drill
   docker compose --profile drill up -d --wait restore-drill
   ```

6. Tear it down and take the keys off the server:

   ```bash
   docker compose --profile drill rm --stop --force restore-drill
   shred -u ~/wizzaroo-backup-identity.txt ~/wizzaroo-restore-rclone.conf
   ```

7. Check the backup still proves the off-site key can't delete. The night's
   line must be `backup.offsite.delete-refused`, never
   `backup.offsite.delete-allowed`:

   ```bash
   docker compose logs backup | grep 'backup.offsite.delete-' | tail -n 1
   ```

8. Add a line to the drill log below, with that check's result, and fix
   anything in this page that was wrong or unclear.

### Drill log

| Date | From | Backup restored | Result |
| ---- | ---- | --------------- | ------ |

## Things to know

- **Sign-ins survive a restore.** They live in the database, so browsers
  signed in when the backup was taken stay signed in.
- **Deletions stay deleted.** A Family, Child or adult the Admin deleted
  after the backup was taken is deleted again by `restore.sh`, from the ids
  the `backup` container sent within a minute of the deletion. Only one
  confirmed in the last minute before the server was lost, or one that hadn't
  reached the target you restore from (the container is unhealthy, logging
  `backup.deletions.failed`, until it has), can be missed.
- **Anything after the backup is gone.** Play recorded on a Family Device
  that hasn't synced yet is still in that device's outbox, and uploads again
  when it next reaches the server, because every event has its own ID.
- **It's tested, but drill it too.** The test proves the scripts restore what
  they back up; only a drill against the real target proves the target, the
  key and these steps work together.
