#!/bin/sh
set -eu

: "${PGUSER:?set PGUSER to the Postgres superuser that sets up the backup's role}"
: "${BACKUP_PGPASSWORD:?set BACKUP_PGPASSWORD to the backup role's own password, not the superuser's}"

if [ "$BACKUP_PGPASSWORD" = "${PGPASSWORD:-}" ]; then
  echo "backup.role.failed reason=superuser-password: give the backup role a password of its own, not the superuser's" >&2
  exit 1
fi

psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 <<'SQL'
\getenv backup_password BACKUP_PGPASSWORD
select 'create role wizzaroo_backup'
where not exists (select from pg_roles where rolname = 'wizzaroo_backup')
\gexec
alter role wizzaroo_backup with login nosuperuser nocreatedb nocreaterole noreplication bypassrls inherit password :'backup_password';
select format('revoke %s from wizzaroo_backup granted by %s', roleid::regrole, grantor::regrole)
from pg_auth_members
where member = 'wizzaroo_backup'::regrole and roleid <> 'pg_read_all_data'::regrole
\gexec
grant pg_read_all_data to wizzaroo_backup;
SQL
echo "backup.role.finished role=wizzaroo_backup"
