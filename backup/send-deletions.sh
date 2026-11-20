#!/bin/sh
# Sends every confirmed deletion off the server, one file per id, so a restore
# of a backup taken before it can delete it again (#280). Each file is named
# for what was deleted and holds only when, and a file already on a target is
# never sent again, so nothing on either target is ever overwritten.
set -eu -o pipefail

: "${BACKUP_RCLONE_REMOTE:?set BACKUP_RCLONE_REMOTE to where backups are sent and pruned, such as nas:wizzaroo-backups}"
: "${BACKUP_RCLONE_OFFSITE_REMOTE:?set BACKUP_RCLONE_OFFSITE_REMOTE to the off-site remote backups are also sent to and never pruned from, such as offsite:wizzaroo-backups}"

deletions_directory=wizzaroo-deletions
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

has_ledger=$(psql --no-psqlrc --quiet --tuples-only --no-align --set ON_ERROR_STOP=1 \
  --command="select to_regclass('public.confirmed_deletions') is not null")
if [ "$has_ledger" != t ]; then
  echo "backup.deletions.skipped reason=no-ledger-table"
  exit 0
fi

psql --no-psqlrc --quiet --tuples-only --no-align --field-separator=' ' --set ON_ERROR_STOP=1 \
  --command="select target_type || '-' || target_id, to_char(deleted_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') from confirmed_deletions order by deleted_at" \
  >"$work/ledger"

mkdir "$work/$deletions_directory"
count=0
while read -r name deleted_at; do
  [ -n "$name" ] || continue
  printf '%s\n' "$deleted_at" >"$work/$deletions_directory/$name"
  count=$((count + 1))
done <"$work/ledger"

if [ "$count" -eq 0 ]; then
  echo "backup.deletions.skipped reason=none-confirmed"
  exit 0
fi

send_deletions_to() {
  if rclone copy --ignore-existing "$work/$deletions_directory" "$1/$deletions_directory"; then
    echo "backup.deletions.upload.finished remote=$1 ids=$count"
  else
    echo "backup.deletions.upload.failed remote=$1 ids=$count" >&2
    return 1
  fi
}

failed=0
send_deletions_to "$BACKUP_RCLONE_REMOTE" || failed=1
send_deletions_to "$BACKUP_RCLONE_OFFSITE_REMOTE" || failed=1
exit "$failed"
