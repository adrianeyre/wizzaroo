# Backups are age-encrypted dumps sent off the server with rclone

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

[0002](./0002-self-hosted-behind-a-cloudflare-tunnel.md) chose no backups while Wizzaroo held only the owner's Children. [0026](./0026-schools-and-teachers.md) makes nightly encrypted backups kept off the home server part of the gate before a second School.

A `backup` container in the Compose stack runs `pg_dump --format=custom` when it starts and then every night, pipes it through [age](https://age-encryption.org) to a public key, and copies the result with [rclone](https://rclone.org) to a remote named in `.env`. It keeps the newest backups up to a set number and deletes older ones. The private key never lives on the home server, so whoever takes the server, or the target, gets only ciphertext. A failed upload exits with an error, logs it, and marks the container unhealthy until a backup succeeds. Restoring is `restore.sh` in the same image, documented in [restoring a backup](../processes/restoring-a-backup.md) and run in the test suite against a real Postgres.

The container is `postgres:18-alpine` with age and rclone added, so `pg_dump` always matches the server's major version, and the scripts are POSIX shell, because they only join three command-line tools together.

Which target to use is still open, and so is the restore drill against it; the container is the same whichever target is chosen.

## Considered Options

- **GPG with a passphrase**: the server would hold the passphrase, so taking the server would unlock every backup.
- **A provider's own client (the AWS CLI, `b2`)**: ties the container to one provider before the target is chosen; rclone speaks to all of them through one config file.
- **A volume snapshot or `pg_basebackup`**: restoring needs the same Postgres version and layout, and the result is larger; a logical dump restores into any empty Postgres 18.
- **Writing the job in TypeScript inside the app image**: the app image has no `pg_dump`, and adding Postgres tools to it couples app releases to the database's version.

Amended by [0030](./0030-backups-go-to-the-nas-and-a-locked-b2-bucket.md): the targets are a NAS on the LAN and a B2 bucket with Object Lock, and every backup goes to both.
