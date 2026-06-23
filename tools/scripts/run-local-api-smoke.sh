#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${OPENCORE_ENV_FILE:-$ROOT_DIR/.env.opencore.local}"
SMOKE_PORT="${OPENCORE_SMOKE_PORT:-39173}"
BASE_URL="${OPENCORE_SMOKE_BASE_URL:-http://127.0.0.1:$SMOKE_PORT}"
RUN_DIR="$ROOT_DIR/.opencore/run"
LOG_FILE="$RUN_DIR/local-smoke-api.log"
API_PID=""

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

    if [ -n "$API_PID" ] && ! kill -0 "$API_PID" 2>/dev/null; then
      echo "$label exited before becoming ready. Log tail:" >&2
      tail -80 "$LOG_FILE" >&2 || true
      exit 1
    fi

    sleep 1
  done

  echo "$label did not become ready at $url" >&2
  tail -80 "$LOG_FILE" >&2 || true
  exit 1
}

cleanup() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

run_with_env() {
  (
    cd "$ROOT_DIR"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a

    if [ "$#" -gt 0 ] && [ "$1" = "env" ]; then
      shift
      local env_args=()
      while [ "$#" -gt 0 ]; do
        case "$1" in
          *=*)
            env_args+=("$1")
            shift
            ;;
          *)
            break
            ;;
        esac
      done

      if [ "$#" -gt 0 ] && [ "$1" = "run_tools_ts_script" ]; then
        shift
        env "${env_args[@]}" \
          TS_NODE_PROJECT="$ROOT_DIR/tools/scripts/tsconfig.json" \
          TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"node10","module":"commonjs","customConditions":null}' \
          node -r ts-node/register -r tsconfig-paths/register "$@"
        return
      fi

      env "${env_args[@]}" "$@"
      return
    fi

    "$@"
  )
}

run_tools_ts_script() {
  TS_NODE_PROJECT="$ROOT_DIR/tools/scripts/tsconfig.json" \
    TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"node10","module":"commonjs","customConditions":null}' \
    node -r ts-node/register -r tsconfig-paths/register "$@"
}

if ! ensure_port_clear "$SMOKE_PORT"; then
  echo "Fixed smoke port $SMOKE_PORT is already in use. Stop that listener or set OPENCORE_SMOKE_PORT explicitly." >&2
  exit 1
fi

if [ "${OPENCORE_SMOKE_SEED:-true}" = "true" ]; then
  echo "Applying local smoke migrations"
  run_with_env pnpm prisma:migrate
  echo "Refreshing local seed data for smoke login"
  run_with_env pnpm prisma:seed
fi

: > "$LOG_FILE"
echo "Starting OpenCore API smoke server on fixed port $SMOKE_PORT"

(
  cd "$ROOT_DIR"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
  export PORT="$SMOKE_PORT"
  export NODE_ENV="${NODE_ENV:-development}"
  exec pnpm dev:api
) >>"$LOG_FILE" 2>&1 &
API_PID="$!"

wait_for_url "$BASE_URL/health/live" "OpenCore API smoke server"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-true}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-config.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-dict.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-menu.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-permission.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-role.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-monitor-status.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-monitor-jobs.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-post.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-messages.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-notices.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-todos.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-approvals.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-notice.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-integration-oauth-tokens.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-integration-designs.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-dept.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-user.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-member.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-member-lifecycle.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-lifecycle.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-plan.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-file.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-audit-log.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-tool-area.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-online-user.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$BASE_URL" \
  OPENCORE_SMOKE_PORT="$SMOKE_PORT" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-login-log.ts"

echo "OpenCore local API smoke passed on $BASE_URL"
