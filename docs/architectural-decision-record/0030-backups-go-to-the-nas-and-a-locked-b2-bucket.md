# Backups go to the NAS on the LAN and to a locked B2 bucket off-site

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

[0028](./0028-backups-are-age-encrypted-dumps-sent-with-rclone.md) left the backup target open. This chooses two, and the `backup` container sends every nightly dump to both.

- **The NAS**: a WD My Cloud EX4 on the home LAN, reached over SMB2 or later as its own `wizzaroo-backup` user, which can only reach the one `wizzaroo-backups` share. This is `BACKUP_RCLONE_REMOTE`, and the only target that is pruned to `BACKUP_KEEP_NIGHTS`. It survives the home server's disk failing, but not something that takes out the whole house.
- **Backblaze B2, EU Central**: `BACKUP_RCLONE_OFFSITE_REMOTE`, the off-site copy that the second-School gate in [0026](./0026-schools-and-teachers.md) needs. The bucket has Object Lock in compliance mode for 90 days, and a lifecycle rule removes each backup once its lock expires. The server's application key can only write. The home server never prunes it and can't remove anything from it, even if it is compromised.

Each copy is attempted on its own: one target failing never skips the other. Either failure logs `backup.upload.failed remote=…` and marks the container unhealthy. Both remotes are required in `docker-compose.yml`.

The EX4 has been out of WD support since April 2022 (My Cloud OS 3, with no security updates). It is acceptable here only because it never holds anything readable: every backup reaches it already age-encrypted, and the private key is never on the home server or the NAS. The worst a compromised EX4 can do is lose its own copies, and B2 still has them. It must never be reachable from the internet.

## Considered Options

- **SFTP to the NAS**: My Cloud only allows SSH as its `sshd` admin account, which can reach the whole NAS. Per-user SSH is an unsupported workaround that doesn't survive a reboot.
- **FTP to the NAS**: it limits a user to their shares, but sends the password in plain text. It is kept only as the fallback if the EX4 can't do SMB2.
- **The NAS copying its folder to the cloud itself**: the EX4's cloud apps were switched off at end of support, and on newer My Cloud models they are sync-only or untested against B2. The copy would also be outside the repo's tests.
- **Only the NAS, calling it "off the home server"**: it leaves the gate's off-site requirement unmet. Fire, flood or theft would take both machines.
- **A B2 key without `deleteFiles`, without Object Lock**: such a key can still hide files, which a lifecycle rule later purges. Object Lock stops that.
- **A US B2 region**: the backups are encrypted, but they still hold UK Children's data. Keeping every copy in the UK/EU keeps the privacy policy and each School's data processing agreement simple.

## Consequences

- The privacy policy names Backblaze B2 (EU Central) as where off-site backups are held.
- No one can delete a backup in B2 before its 90 days are up, including the owner. A backup taken by mistake stays until then.
- The NAS must be awake at `BACKUP_HOUR_UTC`, or that night's NAS copy fails and the container goes unhealthy.
- Replacing the EX4 later changes only `rclone.conf` and `BACKUP_RCLONE_REMOTE`.
