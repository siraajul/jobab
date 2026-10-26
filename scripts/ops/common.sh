#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENV_FILE="${APP_ENV_FILE:-$TASK_ROOT/ops/production.env}"
export APP_ENV_FILE
[[ -f "$APP_ENV_FILE" ]] || { echo "Missing $APP_ENV_FILE; copy ops/production.env.example first." >&2; exit 1; }
compose=(docker compose --env-file "$APP_ENV_FILE" -f "$TASK_ROOT/ops/compose.yml")
JOBAB_RELEASE_STATE="$TASK_ROOT/.jobab/releases/${COMPOSE_PROJECT_NAME:-jobab-production}"
mkdir -p "$JOBAB_RELEASE_STATE"
if [[ -z "${RELEASE:-}" && -f "$JOBAB_RELEASE_STATE/current" ]]; then
  RELEASE="$(cat "$JOBAB_RELEASE_STATE/current")"; export RELEASE
fi
