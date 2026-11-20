#!/bin/sh
set -eu -o pipefail

: "${BACKUP_AGE_IDENTITY_FILE:?set BACKUP_AGE_IDENTITY_FILE to the file holding the age private key}"
: "${BACKUP_RCLONE_REMOTE:?set BACKUP_RCLONE_REMOTE to where backups were sent, such as offsite:wizzaroo}"
: "${PGDATABASE:?set PGDATABASE to the empty database to restore into}"

deletions_directory=wizzaroo-deletions

name="${1:-latest}"
if [ "$name" = latest ]; then
  # sed reads every line, where head would stop after one and, under pipefail, sort's SIGPIPE would fail the restore.
  name=$(rclone lsf --files-only --include 'wizzaroo-*.dump.age' "$BACKUP_RCLONE_REMOTE" | sort -r | sed -n 1p)
  if [ -z "$name" ]; then
    echo "backup.restore.failed reason=no-backups remote=$BACKUP_RCLONE_REMOTE" >&2
    exit 1
  fi
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

rclone copyto "$BACKUP_RCLONE_REMOTE/$name" "$work/$name"
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" --output "$work/dump" "$work/$name"

# Every deletion the Admin confirmed, sent by send-deletions.sh as it happened,
# is fetched before anything is restored, so a target that can't be read stops
# the restore before the database holds anything deleted (#280).
mkdir "$work/deletions"
remote_directories=$(rclone lsf --dirs-only "$BACKUP_RCLONE_REMOTE")
if printf '%s\n' "$remote_directories" | grep -x "$deletions_directory/" >/dev/null; then
  rclone copy "$BACKUP_RCLONE_REMOTE/$deletions_directory" "$work/deletions"
else
  echo "backup.restore.deletions.none-sent remote=$BACKUP_RCLONE_REMOTE" >&2
fi

: >"$work/deletions.csv"
sent=0
for path in "$work/deletions"/*; do
  [ -f "$path" ] || continue
  deletion=${path##*/}
  deleted_at=$(cat "$path")
  case "$deletion" in
    family-* | child-* | user-*) ;;
    *)
      echo "backup.restore.failed reason=unexpected-deletion name=$deletion" >&2
      exit 1
      ;;
  esac
  case "$deleted_at" in
    '' | *[!0-9TZ:-]*)
      echo "backup.restore.failed reason=unexpected-deletion name=$deletion" >&2
      exit 1
      ;;
  esac
  printf '%s,%s,%s\n' "${deletion%%-*}" "${deletion#*-}" "$deleted_at" >>"$work/deletions.csv"
  sent=$((sent + 1))
done

# The dump's grants and policies name the app's roles, which belong to the cluster and aren't in it. The app's
# migrate step gives wizzaroo_app its login and password, and its memberships, once the restore is done.
psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  if not exists (select from pg_roles where rolname = 'wizzaroo_reach') then
    create role wizzaroo_reach nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'wizzaroo_server') then
    create role wizzaroo_server nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'wizzaroo_app') then
    create role wizzaroo_app nologin noinherit;
  end if;
end
$$;
grant wizzaroo_reach to current_user;
SQL

pg_restore --exit-on-error --no-owner --dbname="$PGDATABASE" "$work/dump"

# Every deletion confirmed since the backup was taken is recorded and made again, so none comes back.
if ! psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 <<SQL; then
begin;
create temporary table sent_deletions (target_type text not null, target_id uuid not null, deleted_at timestamp with time zone not null) on commit drop;
\copy sent_deletions from '$work/deletions.csv' with (format csv)
insert into confirmed_deletions (target_type, target_id, deleted_at)
  select target_type, target_id, deleted_at from sent_deletions
  on conflict do nothing;
delete from play_events
  where payload ->> 'giftForChildId' in (select target_id::text from confirmed_deletions where target_type = 'child');
delete from children where id in (select target_id from confirmed_deletions where target_type = 'child');
delete from families where id in (select target_id from confirmed_deletions where target_type = 'family');
delete from users where id in (select target_id from confirmed_deletions where target_type = 'user');
commit;
SQL
  echo "backup.restore.failed reason=deletions-not-applied name=$name database=$PGDATABASE" >&2
  exit 1
fi

counts=$(psql --no-psqlrc --quiet --tuples-only --no-align --field-separator=' ' --set ON_ERROR_STOP=1 --command="
select count(*),
  count(*) filter (where (target_type = 'family' and exists (select from families where id = target_id))
    or (target_type = 'child' and exists (select from children where id = target_id))
    or (target_type = 'user' and exists (select from users where id = target_id)))
from confirmed_deletions")
recorded=${counts% *}
remaining=${counts#* }
if [ "$remaining" != 0 ]; then
  echo "backup.restore.failed reason=deletions-not-applied name=$name database=$PGDATABASE remaining=$remaining" >&2
  exit 1
fi
echo "backup.restore.deletions.applied sent=$sent recorded=$recorded remaining=0"
echo "backup.restore.finished name=$name database=$PGDATABASE"
