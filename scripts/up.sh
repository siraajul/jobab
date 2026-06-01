#!/usr/bin/env bash
# One-command dev launcher.
#
#   pnpm run up   # or `jobabup` from anywhere
#
# NOTE: must be `pnpm run up`, not `pnpm up` — the latter is pnpm's built-in
# alias for `pnpm update` and will upgrade dependencies instead of running
# this script.
#
# Brings up infra (Postgres + Redis), applies any pending Prisma migrations,
# then starts the three dev processes (api + worker + web) together.
# Ctrl+C stops all three. On crash, prints a focused diagnosis instead of
# a generic "exited" message.

set -uo pipefail
cd "$(dirname "$0")/.."

# ── palette ─────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R='\033[0m'; B='\033[1m'; D='\033[2m'; I='\033[3m'
  SAF='\033[38;5;215m'; TEA='\033[38;5;43m'; MAG='\033[38;5;213m'
  AMB='\033[38;5;221m'; GRN='\033[38;5;78m'; RED='\033[38;5;203m'
  GRY='\033[38;5;245m'
else
  R=''; B=''; D=''; I=''; SAF=''; TEA=''; MAG=''; AMB=''; GRN=''; RED=''; GRY=''
fi

# ── log dir (kept around if a crash happens, so you can re-read) ────────────
LOG_DIR=".jobab/logs"
mkdir -p "$LOG_DIR"
rm -f "$LOG_DIR"/*.log "$LOG_DIR"/*.exit 2>/dev/null || true

# ── banner ──────────────────────────────────────────────────────────────────
clear 2>/dev/null || true
cat <<EOF

   ${SAF}     ██${R}${TEA}  ████${R}${MAG}  ██████${R}${AMB}   ██████${R}${SAF}  ██████${R}
   ${SAF}     ██${R}${TEA} ██  ██${R}${MAG} ██   ██${R}${AMB} ██   ██${R}${SAF} ██   ██${R}
   ${SAF}     ██${R}${TEA} ██  ██${R}${MAG} ██████${R}${AMB}  ██████${R}${SAF}  ██████${R}
   ${SAF} ██  ██${R}${TEA} ██  ██${R}${MAG} ██   ██${R}${AMB} ██   ██${R}${SAF} ██   ██${R}
   ${SAF}  ████${R} ${TEA} ████${R} ${MAG} ██████${R}${AMB}  ██   ██${R}${SAF} ██████${R}

   ${D}${I}AI sales agent · NestJS · Next.js · Postgres+pgvector · Redis${R}
   ${GRY}────────────────────────────────────────────────────────────${R}

EOF

# ── helpers ─────────────────────────────────────────────────────────────────
step() { printf "  ${B}${TEA}▶${R} ${B}%s${R}  ${D}%s${R}\n" "$1" "${2:-}"; }
ok()   { printf "  ${GRN}✓${R} ${D}%s${R}\n" "$1"; }
warn() { printf "  ${AMB}!${R} ${B}%s${R}\n" "$1"; }
fail() { printf "  ${RED}✗${R} ${B}%s${R}\n" "$1" >&2; }
note() { printf "  ${D}${I}%s${R}\n" "$1"; }
hr()   { printf "  ${GRY}────────────────────────────────────────────────────────────${R}\n"; }

# diagnose <tag> <log-file>
# Reads the last 40 lines of a process's log and tries to explain WHY it
# died. Falls through to dumping the tail when no pattern matches.
diagnose() {
  local tag="$1" log="$2"
  [[ -s "$log" ]] || { fail "[$tag] exited with no output"; return; }
  local tail; tail=$(tail -n 40 "$log")

  printf "\n  ${RED}✗ [${tag}] crashed${R}  ${D}${I}diagnosis:${R}\n"

  # Port conflict — different node/process is already on that port.
  if grep -qE "EADDRINUSE|address already in use" <<<"$tail"; then
    local port; port=$(grep -oE ":[0-9]+" <<<"$tail" | head -1 | tr -d ':')
    printf "    ${RED}port %s is already taken.${R}\n" "${port:-3000/3001}"
    printf "    ${D}find the process holding it:${R}  ${B}lsof -i :%s${R}\n" "${port:-3000}"
    printf "    ${D}then kill it:${R}                ${B}kill -9 <PID>${R}\n"
    return
  fi

  # Database unreachable.
  if grep -qE "P1001|Can't reach database|ECONNREFUSED.*5432" <<<"$tail"; then
    printf "    ${RED}Postgres is unreachable.${R}\n"
    printf "    ${D}check container status:${R}      ${B}docker compose ps postgres${R}\n"
    printf "    ${D}or restart it:${R}                ${B}docker compose restart postgres${R}\n"
    return
  fi

  # Redis unreachable.
  if grep -qE "ECONNREFUSED.*6379|Redis connection.*failed" <<<"$tail"; then
    printf "    ${RED}Redis is unreachable.${R}\n"
    printf "    ${D}check container status:${R}      ${B}docker compose ps redis${R}\n"
    return
  fi

  # Prisma client wasn't generated.
  if grep -qE "Prisma Client.*not (yet )?generated|@prisma/client did not initialize" <<<"$tail"; then
    printf "    ${RED}Prisma client is missing.${R}\n"
    printf "    ${D}generate it:${R}  ${B}pnpm --filter @jobab/backend prisma:generate${R}\n"
    return
  fi

  # Failed migration state.
  if grep -qE "P3009|migration.*failed" <<<"$tail"; then
    printf "    ${RED}A previous migration is in a failed state.${R}\n"
    printf "    ${D}resolve it:${R}  ${B}pnpm --filter @jobab/backend exec prisma migrate resolve${R}\n"
    return
  fi

  # Missing env var (NestJS Zod env loader throws clearly).
  if grep -qE "Environment variable.*(missing|not set|required)|ZodError.*env" <<<"$tail"; then
    local var; var=$(grep -oE "[A-Z_]{4,}" <<<"$tail" | sort -u | head -3 | tr '\n' ' ')
    printf "    ${RED}missing required env var(s).${R}\n"
    printf "    ${D}check apps/backend/.env — likely missing:${R}  ${B}%s${R}\n" "${var:-see error above}"
    return
  fi

  # Missing node module.
  if grep -qE "Cannot find module|ERR_MODULE_NOT_FOUND" <<<"$tail"; then
    local mod; mod=$(grep -oE "Cannot find module ['\"][^'\"]+['\"]" <<<"$tail" | head -1)
    printf "    ${RED}missing dependency.${R}  ${D}%s${R}\n" "${mod:-unknown}"
    printf "    ${D}re-install from the repo root:${R}  ${B}pnpm install${R}\n"
    return
  fi

  # TypeScript / parse error.
  if grep -qE "SyntaxError|Unexpected token|TS[0-9]+:" <<<"$tail"; then
    printf "    ${RED}TypeScript or syntax error in your code.${R}\n"
    printf "    ${D}offending lines:${R}\n"
    grep -E "TS[0-9]+:|SyntaxError|Unexpected token" <<<"$tail" | head -3 | sed "s/^/      /"
    return
  fi

  # Permission / file-system errors.
  if grep -qE "EACCES|permission denied" <<<"$tail"; then
    printf "    ${RED}filesystem permission denied.${R}\n"
    printf "    ${D}last error lines:${R}\n"
    grep -E "EACCES|permission denied" <<<"$tail" | head -2 | sed "s/^/      /"
    return
  fi

  # Generic uncaught throw / nest startup error.
  if grep -qE "UnhandledPromiseRejection|Error: |throw " <<<"$tail"; then
    printf "    ${RED}uncaught error during boot.${R}\n"
    printf "    ${D}last error lines:${R}\n"
    grep -E "Error: |throw |at " <<<"$tail" | head -5 | sed "s/^/      /"
    return
  fi

  # Fallback — just show the last 15 lines.
  printf "    ${D}no known pattern matched. last 15 lines:${R}\n"
  tail -n 15 "$log" | sed "s/^/      /"
}

# ── preflight ───────────────────────────────────────────────────────────────
step "preflight" "docker · pnpm · .env"
if ! command -v docker >/dev/null 2>&1; then
  fail "docker not on PATH — install Docker Desktop or colima."; exit 1
fi
if ! docker info >/dev/null 2>&1; then
  fail "docker daemon isn't running — open Docker Desktop, wait for it to be ready, then re-run."; exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  fail "pnpm not on PATH — install via 'npm i -g pnpm' or corepack."; exit 1
fi
if [[ ! -f apps/backend/.env ]]; then
  fail "apps/backend/.env is missing — copy apps/backend/.env.example and fill the secrets."; exit 1
fi
# Quick port-conflict check before we even start.
for port in 3000 3001 5432 6379; do
  if lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; then
    if ! docker ps --format '{{.Ports}}' | grep -q ":$port->"; then
      warn "port $port is already in use by a non-docker process — it will likely fail to bind."
      printf "    ${D}find it:${R}  ${B}lsof -i :%s${R}\n" "$port"
    fi
  fi
done
ok "all good"
echo

# ── infra ───────────────────────────────────────────────────────────────────
step "infra" "postgres (pgvector) + redis"
if ! docker compose up -d --wait > "$LOG_DIR/docker.log" 2>&1; then
  cat "$LOG_DIR/docker.log" | sed "s/^/    ${RED}/; s/\$/${R}/"
  fail "docker compose failed to bring infra up"
  diagnose "docker" "$LOG_DIR/docker.log"
  exit 1
fi
ok "containers healthy on :5432 and :6379"
echo

# ── migrations ──────────────────────────────────────────────────────────────
step "prisma" "apply pending migrations"
if ! pnpm --silent --filter @jobab/backend exec prisma migrate deploy > "$LOG_DIR/prisma.log" 2>&1; then
  cat "$LOG_DIR/prisma.log" | sed "s/^/    /"
  fail "prisma migrate deploy failed"
  diagnose "prisma" "$LOG_DIR/prisma.log"
  exit 1
fi
ok "schema in sync"
echo

# ── dev processes ───────────────────────────────────────────────────────────
hr
printf "  ${B}${SAF}◆${R}  ${B}api    ${R}${D}http://localhost:3000${R}\n"
printf "  ${B}${SAF}◆${R}  ${B}swagger${R}${D}http://localhost:3000/docs${R}  ${D}${I}auto-opens when ready${R}\n"
printf "  ${B}${TEA}◆${R}  ${B}wkr    ${R}${D}BullMQ consumer on Redis${R}\n"
printf "  ${B}${MAG}◆${R}  ${B}web    ${R}${D}http://localhost:3001${R}  ${D}${I}auto-opens when ready${R}\n"
hr
note "Ctrl+C stops all three. Logs are tagged below."
note "Set NO_OPEN=1 to skip auto-opening the browser."
note "Per-process logs: $LOG_DIR/<tag>.log"
echo

SHUTTING_DOWN=0

cleanup() {
  SHUTTING_DOWN=1
  echo
  hr
  step "shutting down"
  for pid in $(jobs -p); do
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  ok "all processes stopped"
  echo
  exit 0
}
trap cleanup INT TERM

# Spawn a tagged child process. Output is tee'd to a per-tag log so we can
# diagnose a crash by re-reading the last few lines.
run() {
  local tag="$1" colour="$2"; shift 2
  local prefix log
  log="$LOG_DIR/$tag.log"
  prefix=$(printf "${colour}│${R} ${B}${colour}%s${R} ${D}│${R} " "$tag")
  (
    if command -v setsid >/dev/null 2>&1; then
      setsid "$@" 2>&1
    else
      "$@" 2>&1
    fi
  ) | tee "$log" | sed -u "s|^|${prefix}|" &
  DEV_PIDS+=("$!")
}

DEV_PIDS=()
run "api" "$SAF" pnpm --silent --filter @jobab/backend dev
run "wkr" "$TEA" pnpm --silent --filter @jobab/backend start:worker:dev
run "web" "$MAG" pnpm --silent --filter @jobab/web dev

# ── auto-open browser when each service is reachable ────────────────────────
open_when_ready() {
  local label="$1" url="$2"
  local opener=""
  if command -v open >/dev/null 2>&1; then opener=open
  elif command -v xdg-open >/dev/null 2>&1; then opener=xdg-open
  else return 0
  fi
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null --max-time 1 "$url"; then
      printf "  ${GRN}✓${R} ${D}%s ready — opening %s${R}\n" "$label" "$url"
      "$opener" "$url" >/dev/null 2>&1 || true
      return 0
    fi
    sleep 1
  done
  printf "  ${AMB}!${R} ${D}%s didn't come up within 60s — see ${LOG_DIR}/api.log or ${LOG_DIR}/web.log${R}\n" "$label"
}

if [[ "${NO_OPEN:-0}" != "1" ]]; then
  (
    open_when_ready "swagger" "http://localhost:3000/docs"
    open_when_ready "web"     "http://localhost:3001"
  ) &
fi

# ── wait for any process to die, then diagnose ──────────────────────────────
# (poll instead of `wait -n` so this works on macOS's stock bash 3.2)
RC=0
while :; do
  for pid in "${DEV_PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid" 2>/dev/null; RC=$?
      break 2
    fi
  done
  sleep 1
done

if (( SHUTTING_DOWN == 0 )); then
  echo
  hr
  fail "a dev process exited unexpectedly (rc=$RC) — diagnosing…"
  echo
  # Figure out which process(es) died by checking whether their log file
  # has grown recently and whether the underlying pnpm pipeline is gone.
  # We diagnose all three; the dead one's log will have the relevant error.
  for tag in api wkr web; do
    log="$LOG_DIR/$tag.log"
    [[ -s "$log" ]] || continue
    # Heuristic: a still-running process keeps its log fresh (within 5s).
    if [[ $(find "$log" -mmin +0 -mtime -1 2>/dev/null | wc -l) -gt 0 ]]; then
      # Diagnose any process whose tail contains an error signal.
      if tail -n 40 "$log" | grep -qE "Error|error|EADDRINUSE|ECONNREFUSED|TypeError|throw |✗"; then
        diagnose "$tag" "$log"
      fi
    fi
  done
  echo
  note "Full logs: $LOG_DIR/{api,wkr,web}.log"
  echo
  cleanup
fi

cleanup
