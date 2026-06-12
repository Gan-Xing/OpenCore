#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${OPENCORE_ENV_FILE:-$ROOT_DIR/.env.opencore.local}"
API_PORT="${OPENCORE_DEPLOY_API_PORT:-39172}"
ADMIN_PORT="${OPENCORE_DEPLOY_ADMIN_PORT:-39174}"
API_BASE_URL="${OPENCORE_DEPLOY_API_BASE_URL:-http://127.0.0.1:$API_PORT}"
ADMIN_HEALTH_URL="${OPENCORE_DEPLOY_ADMIN_HEALTH_URL:-http://127.0.0.1:$ADMIN_PORT}"
PUBLIC_HOST="${OPENCORE_DEPLOY_PUBLIC_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
PUBLIC_HOST="${PUBLIC_HOST:-127.0.0.1}"
API_PUBLIC_BASE_URL="${OPENCORE_DEPLOY_PUBLIC_API_BASE_URL:-http://$PUBLIC_HOST:$API_PORT}"
ADMIN_PUBLIC_BASE_URL="${OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL:-http://$PUBLIC_HOST:$ADMIN_PORT}"
ADMIN_LISTEN_HOST="${OPENCORE_DEPLOY_ADMIN_HOST:-0.0.0.0}"
ADMIN_API_BASE_URL_VALUE="${OPENCORE_DEPLOY_ADMIN_API_BASE_URL:-$API_PUBLIC_BASE_URL}"
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

verify_admin_bundle_api_base_url() {
  case "$ADMIN_API_BASE_URL_VALUE" in
    */api | */api/)
      echo "ADMIN_API_BASE_URL must be the API origin without /api: $ADMIN_API_BASE_URL_VALUE" >&2
      echo "The Admin SDK request helper prefixes /api itself; including /api here produces /api/api requests." >&2
      exit 1
      ;;
  esac

  if grep -R \
    --fixed-strings \
    --include='*.js' \
    "$ADMIN_API_BASE_URL_VALUE" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    return
  fi

  echo "Admin bundle does not include ADMIN_API_BASE_URL=$ADMIN_API_BASE_URL_VALUE." >&2
  echo "Refusing to deploy a frontend that would post to the static server /api path." >&2
  exit 1
}

verify_admin_api_proxy_login() {
  run_with_env node - "$ADMIN_HEALTH_URL/api/auth/login" <<'NODE'
const url = process.argv[2];
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const passwordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates) => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

(async () => {
  try {
    await login();
    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: url,
        checks: ['admin.api-proxy.login'],
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl: url,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
})();

async function login() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      const response = await request(url, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });

      if (typeof response.accessToken !== 'string' || response.accessToken.length === 0) {
        throw new Error('Admin API proxy login response did not include accessToken');
      }

      return;
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof HttpStatusError) ||
        ![401, 403].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to authenticate smoke admin ${username} through Admin /api proxy. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
    { cause: lastError },
  );
}

async function request(targetUrl, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!options.expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${targetUrl} returned ${response.status}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${targetUrl} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
NODE
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
  local admin_origins="http://127.0.0.1:$ADMIN_PORT,http://localhost:$ADMIN_PORT,$ADMIN_PUBLIC_BASE_URL"

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
NX_DAEMON=false \
pnpm exec nx build admin --skip-nx-cache
verify_admin_bundle_api_base_url

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
  setsid node dist/apps/api/main.js </dev/null >>"$API_LOG_FILE" 2>&1 &
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
  export HOST="$ADMIN_LISTEN_HOST"
  export ADMIN_STATIC_ROOT="$ROOT_DIR/apps/admin/dist"
  export ADMIN_API_BASE_URL="$ADMIN_API_BASE_URL_VALUE"
  export ADMIN_API_PROXY_TARGET="$API_BASE_URL"
  setsid node "$ROOT_DIR/tools/scripts/serve-admin-static.mjs" </dev/null >>"$ADMIN_LOG_FILE" 2>&1 &
  echo "$!" > "$ADMIN_PID_FILE"
)

if ! wait_for_url "$ADMIN_HEALTH_URL/" "OpenCore Admin"; then
  tail -100 "$ADMIN_LOG_FILE" >&2 || true
  exit 1
fi
require_pid_alive "$ADMIN_PID_FILE" "OpenCore Admin" "$ADMIN_LOG_FILE"

verify_admin_api_proxy_login

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-config.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-file.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-audit-log.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-login-log.mjs"

require_pid_alive "$API_PID_FILE" "OpenCore API" "$API_LOG_FILE"
require_pid_alive "$ADMIN_PID_FILE" "OpenCore Admin" "$ADMIN_LOG_FILE"

echo "OpenCore deploy complete"
echo "API: $API_BASE_URL (pid $(cat "$API_PID_FILE"))"
echo "Public API: $API_PUBLIC_BASE_URL"
echo "Admin: $ADMIN_PUBLIC_BASE_URL (pid $(cat "$ADMIN_PID_FILE"))"
echo "Logs: $API_LOG_FILE, $ADMIN_LOG_FILE"
