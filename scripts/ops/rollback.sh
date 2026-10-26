#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
if [[ -n "${1:-}" ]]; then previous="$1"
elif [[ -f "$JOBAB_RELEASE_STATE/previous" ]]; then previous="$(cat "$JOBAB_RELEASE_STATE/previous")"
else echo 'No previous release recorded; supply an existing image tag.' >&2; exit 1; fi
[[ "$previous" =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]+$ ]] || { echo 'Invalid image tag' >&2; exit 1; }
export RELEASE="$previous"
"${compose[@]}" stop -t 120 worker
"${compose[@]}" up -d --no-build --wait api worker web proxy
printf '%s\n' "$previous" > "$JOBAB_RELEASE_STATE/current"
echo 'Application images rolled back. Schema retained; do not downgrade below the session-revocation security release.'
