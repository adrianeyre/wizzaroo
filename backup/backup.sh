#!/bin/sh
set -eu -o pipefail

: "${BACKUP_AGE_RECIPIENT:?set BACKUP_AGE_RECIPIENT to the age public key backups are encrypted to}"
: "${BACKUP_RCLONE_REMOTE:?set BACKUP_RCLONE_REMOTE to where backups are sent and pruned, such as nas:wizzaroo-backups}"
: "${BACKUP_RCLONE_OFFSITE_REMOTE:?set BACKUP_RCLONE_OFFSITE_REMOTE to the off-site remote backups are also sent to and never pruned from, such as offsite:wizzaroo-backups}"
: "${BACKUP_KEEP_NIGHTS:?set BACKUP_KEEP_NIGHTS to how many nights of backups to keep}"

name="wizzaroo-$(date -u +%Y-%m-%dT%H%M%SZ).dump.age"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

pg_dump --format=custom | age --recipient "$BACKUP_AGE_RECIPIENT" >"$work/$name"

send_backup_to() {
  if rclone copyto "$work/$name" "$1/$name"; then
    echo "backup.upload.finished remote=$1 name=$name"
  else
    echo "backup.upload.failed remote=$1 name=$name" >&2
    return 1
  fi
}

# The off-site key must only write, to a bucket whose Object Lock keeps every upload (ADR 0030), so a server that is
# taken can't remove the off-site backups. Each night proves it: a probe is sent beside the backup and deleted for good
# (`--b2-hard-delete`, since an ordinary delete in B2 only hides a file, which a write-only key may do). The probe must
# still be there afterwards. If it is gone, or the check can't tell, the night fails, loudly, and the backup is
# unhealthy (pen test I4, #317). The probes live in their own folder, which restore.sh never reads, and the bucket's
# lifecycle rule clears them once the lock lets it. A stand-in that can't lock anything turns the check off by name.
lock_probes_directory=wizzaroo-lock-probes

check_offsite_refuses_deletes() {
  if [ "${BACKUP_OFFSITE_LOCK_CHECK:-}" = off-for-a-stand-in ]; then
    echo "backup.offsite.lock-check.skipped remote=$BACKUP_RCLONE_OFFSITE_REMOTE reason=stand-in" >&2
    return 0
  fi
  probe="$name.probe"
  if ! rclone touch "$BACKUP_RCLONE_OFFSITE_REMOTE/$lock_probes_directory/$probe"; then
    echo "backup.offsite.lock-check.failed remote=$BACKUP_RCLONE_OFFSITE_REMOTE reason=probe-not-sent" >&2
    return 1
  fi
  rclone deletefile --b2-hard-delete "$BACKUP_RCLONE_OFFSITE_REMOTE/$lock_probes_directory/$probe" >/dev/null 2>&1 || true
  if rclone lsf --files-only "$BACKUP_RCLONE_OFFSITE_REMOTE/$lock_probes_directory" 2>/dev/null | grep -xF "$probe" >/dev/null; then
    echo "backup.offsite.delete-refused remote=$BACKUP_RCLONE_OFFSITE_REMOTE probe=$lock_probes_directory/$probe"
  else
    echo "backup.offsite.delete-allowed remote=$BACKUP_RCLONE_OFFSITE_REMOTE probe=$lock_probes_directory/$probe: the off-site key deleted what it sent, so a server that is taken could delete every off-site backup. Give the server a key with only listBuckets, listFiles and writeFiles, to a bucket with Object Lock on in compliance mode" >&2
    return 1
  fi
}

prune_old_backups() {
  rclone lsf --files-only --include 'wizzaroo-*.dump.age' "$BACKUP_RCLONE_REMOTE" |
    sort -r |
    tail -n "+$((BACKUP_KEEP_NIGHTS + 1))" |
    while read -r old; do
      rclone deletefile "$BACKUP_RCLONE_REMOTE/$old"
      echo "backup.old-backup.deleted remote=$BACKUP_RCLONE_REMOTE name=$old"
    done
}

failed=0
reached_pruned_remote=true
send_backup_to "$BACKUP_RCLONE_REMOTE" || { failed=1; reached_pruned_remote=false; }
if send_backup_to "$BACKUP_RCLONE_OFFSITE_REMOTE"; then
  check_offsite_refuses_deletes || failed=1
else
  failed=1
fi

if [ "$reached_pruned_remote" = true ]; then
  prune_old_backups
fi

send-deletions.sh || failed=1

exit "$failed"
