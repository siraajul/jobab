#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
file="${1:?Usage: restore-drill.sh backup.dump}"
[[ -s "$file" ]] || { echo 'Backup missing or empty' >&2; exit 1; }
if [[ -f "$file.sha256" ]]; then shasum -a 256 -c "$file.sha256"; fi
db="jobab_restore_$(date +%s)_$$"
"${compose[@]}" exec -T postgres createdb -U jobab "$db"
cleanup() { "${compose[@]}" exec -T postgres dropdb -U jobab "$db"; }
trap cleanup EXIT
"${compose[@]}" exec -T postgres pg_restore -U jobab -d "$db" --exit-on-error --no-owner < "$file"
"${compose[@]}" exec -T postgres psql -v ON_ERROR_STOP=1 -U jobab -d "$db" -c 'SELECT count(*) AS migrations FROM _prisma_migrations;' -c 'SELECT count(*) AS orders FROM orders;' -c 'SELECT count(*) AS organizations FROM organizations;'
echo 'Restore drill passed in a disposable database. Active database unchanged.'
