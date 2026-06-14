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
DEPLOY_GIT_COMMIT="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
DEPLOY_BUILD_TIME="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
DEPLOY_BUILD_STAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
DEPLOY_APP_VERSION="$(
  node - "$ROOT_DIR/package.json" <<'NODE' 2>/dev/null || echo "0.0.0"
const { readFileSync } = require('node:fs');
const packageJson = JSON.parse(readFileSync(process.argv[2], 'utf8'));
process.stdout.write(String(packageJson.version || '0.0.0'));
NODE
)"
DEPLOYMENT_ID="${DEPLOY_GIT_COMMIT}-${DEPLOY_BUILD_STAMP}"

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

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "$ADMIN_API_BASE_URL_VALUE" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include ADMIN_API_BASE_URL=$ADMIN_API_BASE_URL_VALUE." >&2
    echo "Refusing to deploy a frontend that would post to the static server /api path." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "loginMaxFailedAttempts" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include runtime login max failed attempts policy." >&2
    echo "Refusing to deploy a stale frontend login page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Login lockout policy" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include the runtime login lockout policy text." >&2
    echo "Refusing to deploy a stale frontend login page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Feature Flag" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Rollout %" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Set rollout" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Audience Rules" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Set audience" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Environment Override" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Environment overrides" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Secret Versions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Rotate secret" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Vault Key Rotation" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Managed KMS provider" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "External encryption" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Rotate vault key" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Vault encrypted" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include the runtime feature flag, environment override and config vault key rotation surface." >&2
    echo "Refusing to deploy a stale frontend config page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Login location server filter" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "External GeoIP adapter" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "GeoIP endpoint" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "GeoIP lookup" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "External lookup" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include login-log location filtering and GeoIP lookup controls." >&2
    echo "Refusing to deploy a stale frontend login-log page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Retention policy" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Clean expired operation logs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core:audit-log:delete" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include operation-log retention cleanup controls." >&2
    echo "Refusing to deploy a stale frontend operation-log page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Redis Monitor" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload Redis cache" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Safe Value Preview" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Redis live monitor; dry-run by default; confirmed clear required" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live Redis cache monitor controls." >&2
    echo "Refusing to deploy a stale frontend cache page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live runtime version" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "OpenCore runtime" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Deployment ID" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload version info" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live runtime version metadata controls." >&2
    echo "Refusing to deploy a stale frontend monitor version page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live OpenAPI drift" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload OpenAPI drift" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Snapshot SHA-256" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Snapshot operations" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live OpenAPI drift snapshot metadata." >&2
    echo "Refusing to deploy a stale frontend OpenAPI page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live export protocol" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create export preview" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Bounded row preview" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Server capped rows" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live Tool Export protocol and preview controls." >&2
    echo "Refusing to deploy a stale frontend Export Tools page." >&2
    exit 1
  fi

  if grep -R \
    --fixed-strings \
    --include='*.js' \
    "createCurrentPageExportProtocolFixture" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live current-page export protocol" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Server capped current-page export" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live shared current-page export protocol wiring." >&2
    echo "Refusing to deploy stale fixture-backed current-page export buttons." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Plan artifacts" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Dry-run apply" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Manifest preview" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Manifest detail" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Dry-run confirmation" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "tool:openforge:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include OpenForge plan/dry-run/manifest confirmation controls." >&2
    echo "Refusing to deploy a stale frontend OpenForge page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Signed callback contract" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/api/integrations/mail/outbox/callback" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/api/integrations/sms/outbox/callback" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "SMS HTTP adapter" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "HTTP Secret Injection" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Mail SMTP adapter" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "SMTP TLS Policy" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Outbox Subject" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "SMTP Attachments" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Provider Diagnostics" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include integration signed callback, SMS HTTP, secret injection, Mail SMTP, SMTP TLS policy, outbox subject, SMTP attachments and provider diagnostics surfaces." >&2
    echo "Refusing to deploy a stale frontend integration provider page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Health Audit" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Config Audit" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Failure History" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include integration health/config audit and failure history surfaces." >&2
    echo "Refusing to deploy a stale frontend integration provider page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "OAuth token inventory" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Token lifecycle summary" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Revoke token" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "integration:oauth:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include OAuth token inventory and revoke controls." >&2
    echo "Refusing to deploy a stale frontend OAuth page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live mail templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Mail outbox operations" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Process queued mail outbox" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Preview template" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "integration:mail:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live integration mail template/outbox operations." >&2
    echo "Refusing to deploy a stale frontend Mail integration page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live SMS templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "SMS outbox operations" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Process queued SMS outbox" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Preview template" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "integration:sms:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live integration SMS template/outbox operations." >&2
    echo "Refusing to deploy a stale frontend SMS integration page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Registered handlers" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Run now" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Execution Mode" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Cron dispatch" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Worker claim" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "registered handler execution + retry/timeout diagnostics" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "monitor:job:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include monitor job runtime operation controls." >&2
    echo "Refusing to deploy a stale frontend monitor jobs page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Scheduler queues" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Queue metrics" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include monitor queue metrics." >&2
    echo "Refusing to deploy a stale frontend monitor queues page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Token blacklist maintenance" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Clean expired sessions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Cleanup eligible" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include online-user token blacklist maintenance controls." >&2
    echo "Refusing to deploy a stale frontend online-user page." >&2
    exit 1
  fi

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "System Notice Templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Realtime stream" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "SSE inbox events" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Notice template render preview" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create draft from template" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "System Notice Delivery Records" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Dispatch in-app deliveries" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Dispatch mail deliveries" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Dispatch SMS deliveries" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Execute mail outbox provider" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Execute SMS outbox provider" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Execute local provider" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Provider Message" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Provider Status" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Outbox Actions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Fail outbox" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Process queued outbox" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Run outbox schedule" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "failedCount" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Retry outbox" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Mark outbox sent" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include notice realtime, template, delivery and outbox state management." >&2
    echo "Refusing to deploy a stale frontend notice page." >&2
    exit 1
  fi
}

verify_public_admin_bundle() {
  node - "$ADMIN_PUBLIC_BASE_URL" "$ADMIN_API_BASE_URL_VALUE" <<'NODE'
const adminBase = process.argv[2];
const apiBase = process.argv[3].replace(/\/+$/, '');
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

(async () => {
  const loginUrl = new URL(`/user/login?deploy-check=${stamp}`, withTrailingSlash(adminBase));
  const htmlResponse = await fetch(loginUrl, {
    headers: {
      'cache-control': 'no-cache',
    },
  });

  if (!htmlResponse.ok) {
    throw new Error(`Admin login page returned ${htmlResponse.status}`);
  }

  const htmlCacheControl = htmlResponse.headers.get('cache-control') || '';
  if (!/(^|,)\s*(no-cache|no-store|max-age=0)\b/i.test(htmlCacheControl)) {
    throw new Error(
      `Admin login page must not be cacheable, received cache-control=${htmlCacheControl || 'missing'}`,
    );
  }

  const html = await htmlResponse.text();
  const bundleMatch = html.match(/<script[^>]+src=["']([^"']*umi\.[^"']+\.js)["']/i);

  if (!bundleMatch) {
    throw new Error('Admin login page did not reference a umi.*.js bundle');
  }

  const bundleUrl = new URL(bundleMatch[1], loginUrl);
  bundleUrl.searchParams.set('deploy-check', stamp);

  const bundleResponse = await fetch(bundleUrl, {
    headers: {
      'cache-control': 'no-cache',
    },
  });

  if (!bundleResponse.ok) {
    throw new Error(`Admin bundle ${bundleUrl.pathname} returned ${bundleResponse.status}`);
  }

  const bundle = await bundleResponse.text();
  const badApiBase = `${apiBase}/api`;

  if (!bundle.includes(apiBase)) {
    throw new Error(`Admin bundle does not include API origin ${apiBase}`);
  }

  if (bundle.includes('/api/api/auth/login') || bundle.includes(badApiBase)) {
    throw new Error(
      'Admin bundle still contains a duplicated API prefix and would post to /api/api/auth/login',
    );
  }

  const serviceWorkerUrl = new URL(`/service-worker.js?deploy-check=${stamp}`, loginUrl);
  const serviceWorkerResponse = await fetch(serviceWorkerUrl, {
    headers: {
      'cache-control': 'no-cache',
    },
  });

  if (!serviceWorkerResponse.ok) {
    throw new Error(`Retired service worker endpoint returned ${serviceWorkerResponse.status}`);
  }

  const serviceWorkerCacheControl = serviceWorkerResponse.headers.get('cache-control') || '';
  const serviceWorkerBody = await serviceWorkerResponse.text();

  if (!serviceWorkerCacheControl.includes('no-store')) {
    throw new Error(
      `Retired service worker endpoint must be no-store, received ${serviceWorkerCacheControl || 'missing'}`,
    );
  }

  if (!serviceWorkerBody.includes('self.registration.unregister')) {
    throw new Error('Retired service worker endpoint must unregister stale Admin service workers');
  }

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl: adminBase,
      bundle: bundleUrl.pathname,
      checks: [
        'admin.public-login.no-cache',
        'admin.public-bundle.api-origin',
        'admin.public-bundle.no-duplicate-api-prefix',
        'admin.retired-service-worker',
      ],
    }),
  );
})().catch((error) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl: adminBase,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});

function withTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}
NODE
}

verify_admin_api_proxy_login() {
  run_with_env node - "$ADMIN_HEALTH_URL/api/auth/login" <<'NODE'
const urls = [
  process.argv[2],
  process.argv[2].replace('/api/auth/login', '/api/api/auth/login'),
];
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
    for (const url of urls) {
      await login(url);
    }

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: urls[0],
        checks: [
          'admin.api-proxy.login',
          'admin.api-proxy.duplicate-prefix-login',
        ],
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'fail',
        baseUrl: urls[0],
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }
})();

async function login(url) {
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

verify_api_duplicate_prefix_login() {
  run_with_env node - "$API_BASE_URL/api/api/auth/login" <<'NODE'
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
    await login(url);

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl: url,
        checks: ['api.duplicate-prefix-login'],
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

async function login(targetUrl) {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      const response = await request(targetUrl, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });

      if (typeof response.accessToken !== 'string' || response.accessToken.length === 0) {
        throw new Error('API duplicate-prefix login response did not include accessToken');
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
    `Unable to authenticate smoke admin ${username} through duplicated API prefix. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
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
  export OPENCORE_APP_VERSION="$DEPLOY_APP_VERSION"
  export OPENCORE_GIT_COMMIT="$DEPLOY_GIT_COMMIT"
  export OPENCORE_BUILD_TIME="$DEPLOY_BUILD_TIME"
  export OPENCORE_DEPLOYMENT_ID="$DEPLOYMENT_ID"
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
verify_api_duplicate_prefix_login
verify_public_admin_bundle

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-config.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-dict.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-menu.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-role.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-monitor-jobs.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-post.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-notice.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-integration-health.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-integration-oauth-tokens.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-dept.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-user.mjs"

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
  node "$ROOT_DIR/tools/scripts/smoke-tool-openforge.mjs"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  node "$ROOT_DIR/tools/scripts/smoke-core-online-user.mjs"

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
