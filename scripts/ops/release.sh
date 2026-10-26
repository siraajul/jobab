#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
next="${1:?Usage: release.sh immutable-image-tag}"
[[ "$next" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]+$ ]] || { echo 'Invalid image tag' >&2; exit 1; }
previous="${RELEASE:-}"
export RELEASE="$next"
"${compose[@]}" build api web migrate
"${compose[@]}" up -d --wait postgres redis
bash "$TASK_ROOT/scripts/ops/backup.sh"
# Drain the old worker before expanding the schema. Never run migrate reset.
"${compose[@]}" stop -t 120 worker
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d --wait api worker web proxy
if [[ -n "$previous" ]]; then printf '%s\n' "$previous" > "$JOBAB_RELEASE_STATE/previous"; fi
printf '%s\n' "$next" > "$JOBAB_RELEASE_STATE/current"
echo 'Containers healthy. Run scripts/ops/smoke.sh with the public URLs before accepting the release.'
