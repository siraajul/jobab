#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
umask 077
folder="${1:-$TASK_ROOT/backups}"
mkdir -p "$folder"
file="$folder/jobab-$(date -u +%Y%m%dT%H%M%SZ).dump"
"${compose[@]}" exec -T postgres pg_dump -U jobab -d jobab -Fc > "$file.partial"
"${compose[@]}" exec -T postgres pg_restore --list < "$file.partial" > /dev/null
mv "$file.partial" "$file"
shasum -a 256 "$file" > "$file.sha256"
echo "$file"
