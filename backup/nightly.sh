#!/bin/sh
set -eu

: "${BACKUP_HOUR_UTC:=2}"
# How often to look for a deletion the Admin has just confirmed, so it is off
# the server within this many seconds rather than at the night's backup (#280).
: "${BACKUP_DELETIONS_CHECK_SECONDS:=60}"
succeeded=/tmp/backup-succeeded
last_backup=/tmp/backup-last-succeeded
backup_ok=false
deletions_ok=true
deletions_sent=

count_deletions() {
  ledger=$(psql --no-psqlrc --quiet --tuples-only --no-align \
    --command="select to_regclass('public.confirmed_deletions') is not null" 2>/dev/null) || return 0
  if [ "$ledger" != t ]; then
    echo 0
    return 0
  fi
  psql --no-psqlrc --quiet --tuples-only --no-align \
    --command="select count(*) from confirmed_deletions" 2>/dev/null || true
}

# The health check reads the marker's age as the last good backup's, so a
# deletion sent between backups restores the marker without making it newer.
mark_health() {
  if [ "$backup_ok" = true ] && [ "$deletions_ok" = true ]; then
    touch -r "$last_backup" "$succeeded"
  else
    rm -f "$succeeded"
  fi
}

run_backup() {
  counted=$(count_deletions)
  if backup.sh; then
    touch "$last_backup"
    backup_ok=true
    deletions_ok=true
    deletions_sent=$counted
  else
    backup_ok=false
    echo "backup.nightly.failed: the last backup did not reach every target, so this container is now unhealthy" >&2
  fi
  mark_health
}

send_new_deletions() {
  counted=$(count_deletions)
  if [ -z "$counted" ] || [ "$counted" = "$deletions_sent" ]; then
    return
  fi
  if send-deletions.sh; then
    deletions_ok=true
    deletions_sent=$counted
  else
    deletions_ok=false
    echo "backup.deletions.failed: a confirmed deletion did not reach every target, so this container is now unhealthy until it does" >&2
  fi
  mark_health
}

next_backup_after() {
  next=$(date -u -d "$(date -u +%Y-%m-%d) $BACKUP_HOUR_UTC:00:00" +%s)
  if [ "$next" -le "$1" ]; then
    next=$((next + 86400))
  fi
  echo "$next"
}

run_backup
next_backup=$(next_backup_after "$(date -u +%s)")
while true; do
  now=$(date -u +%s)
  if [ "$now" -ge "$next_backup" ]; then
    run_backup
    next_backup=$(next_backup_after "$now")
    continue
  fi
  send_new_deletions
  wait_seconds=$((next_backup - now))
  if [ "$wait_seconds" -gt "$BACKUP_DELETIONS_CHECK_SECONDS" ]; then
    wait_seconds=$BACKUP_DELETIONS_CHECK_SECONDS
  fi
  sleep "$wait_seconds"
done
