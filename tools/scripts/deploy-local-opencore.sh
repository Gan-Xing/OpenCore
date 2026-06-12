#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${OPENCORE_ENV_FILE:-$ROOT_DIR/.env.opencore.local}"
API_PORT="${OPENCORE_DEPLOY_API_PORT:-39172}"
ADMIN_PORT="${OPENCORE_DEPLOY_ADMIN_PORT:-39174}"
API_BASE_URL="${OPENCORE_DEPLOY_API_BASE_URL:-http://127.0.0.1:$API_PORT}"
ADMIN_BASE_URL="${OPENCORE_DEPLOY_ADMIN_BASE_URL:-http://127.0.0.1:$ADMIN_PORT}"
ADMIN_API_BASE_URL_VALUE="${OPENCORE_DEPLOY_ADMIN_API_BASE_URL:-$API_BASE_URL/api}"
RUN_DIR="$ROOT_DIR/.opencore/run"
API_PID_FILE="$RUN_DIR/opencore-api.pid"
ADMIN_PID_FILE="$RUN_DIR/opencore-admin.pid"
API_LOG_FILE="$RUN_DIR/opencore-api.log"
ADMIN_LOG_FILE="$RUN_DIR/opencore-admin.log"

mkdir -p "$RUN_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

ensure_port_clear() {
  local port="$1"
  node - "$port" <<'NODE'
const net = require('node:net');
const port = Number(process.argv[2]);
const server = net.createServer();
server.once('error', () => process.exit(1));
server.once('listening', () => server.close(() => process.exit(0)));
server.listen(port, '127.0.0.1');
NODE
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local timeout_seconds="${3:-90}"
  local deadline=$((SECONDS + timeout_seconds))

  while [ "$SECONDS" -lt "$deadline" ]; do
    if node - "$url" <<'NODE' >/dev/null 2>&1; then
const url = process.argv[2];
fetch(url).then((response) => {
  process.exit(response.ok ? 0 : 1);
}).catch(() => process.exit(1));
NODE
      return 0
    fi
    sleep 1
  done

  echo "$label did not become ready at $url" >&2
  return 1
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ ! -f "$pid_file" ]; then
    return
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  rm -f "$pid_file"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  echo "Stopping existing $label process $pid"
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null; then
      return
    fi
    sleep 0.5
  done

  kill -9 "$pid" 2>/dev/null || true
}

require_pid_alive() {
  local pid_file="$1"
  local label="$2"
  local log_file="$3"
  local pid

  pid="$(cat "$pid_file" 2>/dev/null || true)"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    echo "$label is not running after deploy. Log tail:" >&2
    tail -100 "$log_file" >&2 || true
    exit 1
  fi
}

run_with_env() {
  (
    cd "$ROOT_DIR"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    "$@"
  )
}

append_deploy_cors_origins() {
  local admin_origins="http://127.0.0.1:$ADMIN_PORT,http://localhost:$ADMIN_PORT"

  if [ -n "${CORS_ORIGINS:-}" ]; then
    export CORS_ORIGINS="$CORS_ORIGINS,$admin_origins"
  else
    export CORS_ORIGINS="$admin_origins"
  fi
}

cd "$ROOT_DIR"

echo "Building OpenCore API"
pnpm build:api

echo "Building OpenCore Admin for $ADMIN_API_BASE_URL_VALUE"
FORCE_UTOOPACK= \
OPENCORE_ADMIN_BUNDLER=webpack \
ADMIN_API_BASE_URL="$ADMIN_API_BASE_URL_VALUE" \
pnpm build:admin

echo "Applying Prisma migrations"
run_with_env pnpm prisma:migrate

if [ "${OPENCORE_DEPLOY_SEED:-true}" = "true" ]; then
  echo "Running Prisma seed"
  run_with_env pnpm prisma:seed
fi

stop_pid_file "$API_PID_FILE" "OpenCore API"
stop_pid_file "$ADMIN_PID_FILE" "OpenCore Admin"

if ! ensure_port_clear "$API_PORT"; then
  echo "Fixed deploy API port $API_PORT is already in use. Stop that listener or set OPENCORE_DEPLOY_API_PORT explicitly." >&2
  exit 1
fi

if ! ensure_port_clear "$ADMIN_PORT"; then
  echo "Fixed deploy Admin port $ADMIN_PORT is already in use. Stop that listener or set OPENCORE_DEPLOY_ADMIN_PORT explicitly." >&2
  exit 1
fi

: > "$API_LOG_FILE"
: > "$ADMIN_LOG_FILE"

echo "Starting OpenCore API on fixed port $API_PORT"
(
  cd "$ROOT_DIR"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  append_deploy_cors_origins
  export PORT="$API_PORT"
  export NODE_ENV="${OPENCORE_DEPLOY_NODE_ENV:-${NODE_ENV:-development}}"
  nohup node dist/apps/api/main.js >>"$API_LOG_FILE" 2>&1 &
  echo "$!" > "$API_PID_FILE"
)

if ! wait_for_url "$API_BASE_URL/health/live" "OpenCore API"; then
  tail -100 "$API_LOG_FILE" >&2 || true
  exit 1
fi
require_pid_alive "$API_PID_FILE" "OpenCore API" "$API_LOG_FILE"

echo "Starting OpenCore Admin on fixed port $ADMIN_PORT"
(
  cd "$ROOT_DIR"
  export PORT="$ADMIN_PORT"
  export ADMIN_STATIC_ROOT="$ROOT_DIR/apps/admin/dist"
  nohup node "$ROOT_DIR/tools/scripts/serve-admin-static.mjs" >>"$ADMIN_LOG_FILE" 2>&1 &
  echo "$!" > "$ADMIN_PID_FILE"
)

if ! wait_for_url "$ADMIN_BASE_URL/" "OpenCore Admin"; then
  tail -100 "$ADMIN_LOG_FILE" >&2 || true
  exit 1
fi
require_pid_alive "$ADMIN_PID_FILE" "OpenCore Admin" "$ADMIN_LOG_FILE"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-config.mjs"

require_pid_alive "$API_PID_FILE" "OpenCore API" "$API_LOG_FILE"
require_pid_alive "$ADMIN_PID_FILE" "OpenCore Admin" "$ADMIN_LOG_FILE"

echo "OpenCore deploy complete"
echo "API: $API_BASE_URL (pid $(cat "$API_PID_FILE"))"
echo "Admin: $ADMIN_BASE_URL (pid $(cat "$ADMIN_PID_FILE"))"
echo "Logs: $API_LOG_FILE, $ADMIN_LOG_FILE"
