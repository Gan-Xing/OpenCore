#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${OPENCORE_ENV_FILE:-$ROOT_DIR/.env.opencore.local}"
API_PORT="${OPENCORE_DEPLOY_API_PORT:-39172}"
ADMIN_PORT="${OPENCORE_DEPLOY_ADMIN_PORT:-39174}"
API_LISTEN_HOST="${OPENCORE_DEPLOY_API_HOST:-}"
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
DEPLOY_SERVICES_STARTED=false

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

run_tools_ts_script() {
  TS_NODE_PROJECT="$ROOT_DIR/tools/scripts/tsconfig.json" \
    TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"node10","module":"commonjs","customConditions":null}' \
    node -r ts-node/register -r tsconfig-paths/register "$@"
}

start_tools_ts_script_detached() {
  setsid env \
    TS_NODE_PROJECT="$ROOT_DIR/tools/scripts/tsconfig.json" \
    TS_NODE_COMPILER_OPTIONS='{"moduleResolution":"node10","module":"commonjs","customConditions":null}' \
    node -r ts-node/register -r tsconfig-paths/register "$@" </dev/null >>"$ADMIN_LOG_FILE" 2>&1 &
}

run_with_retry() {
  local label="$1"
  local attempts="$2"
  shift 2

  local attempt=1
  local status=0

  while [ "$attempt" -le "$attempts" ]; do
    if "$@"; then
      return 0
    fi

    status=$?
    if [ "$attempt" -ge "$attempts" ]; then
      echo "$label failed after $attempts attempt(s)." >&2
      return "$status"
    fi

    echo "$label failed on attempt $attempt/$attempts; retrying in 5s." >&2
    attempt=$((attempt + 1))
    sleep 5
  done
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
    "Other sign-in methods" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Bind an existing OpenCore account" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/user/social-login" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include the social login entry, callback page and binding surface." >&2
    echo "Refusing to deploy a stale social login frontend." >&2
    exit 1
  fi

  run_tools_ts_script "$ROOT_DIR/tools/scripts/admin-fallback-closure-guard.ts" \
    --root "$ROOT_DIR" \
    --manifest "$ROOT_DIR/tools/guards/system-admin-live-only.guard.json" \
    --dist "$ROOT_DIR/apps/admin/dist"

  run_tools_ts_script "$ROOT_DIR/tools/scripts/check-admin-i18n.ts" \
    --root "$ROOT_DIR"

  if ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Basic profile" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Account binding" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Login activity" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Sign out other devices" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Needs configuration" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include the live profile center tabs, activity and OAuth binding surface." >&2
    echo "Refusing to deploy a stale personal profile frontend." >&2
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

  if grep \
    --fixed-strings \
    "createDictFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Live data unavailable; showing SDK fixtures." \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! find "$ROOT_DIR/apps/admin/dist" \
    -maxdepth 1 \
    -type f \
    -name 'p__System__Dicts*.async.js' \
    | grep . >/dev/null || \
    ! grep \
    --fixed-strings \
    "listOpenCoreDictItemsPage" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "request={requestDicts}" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "request={requestItems}" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "deleteOpenCoreDicts" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "updateOpenCoreDictStatus" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "refreshOpenCoreDictCache" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "getOpenCoreDictImportTemplate" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "importOpenCoreDicts" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "listOpenCoreDeletedDictPage" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "restoreOpenCoreDictItem" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "hardDeleteOpenCoreDict" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "translateOpenCoreDictValues" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep \
    --fixed-strings \
    "clearDictOptionsCache" \
    "$ROOT_DIR/apps/admin/src/pages/System/Dicts.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/core/dict-items" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/core/dicts/refresh-cache" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/core/dicts/import" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/core/dicts/recycle-bin" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "/core/dict-data/translate" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Dicts page must use live-only data, server pagination, dictionary item controls, import, recycle bin, translation preview and cache refresh without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Dicts frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createSystemDeptFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Departments.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback department snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Departments.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live departments" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Department order saved." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Departments with children cannot be deleted" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-depts" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Departments page must use live-only data and tree/order controls without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Departments frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createSystemPostFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Posts.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback post snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Posts.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live posts" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Post order saved." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Delete selected" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-posts" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Posts page must use live-only data and batch/order controls without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Posts frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createPermissionSummariesFromRegistry" \
    "$ROOT_DIR/apps/admin/src/pages/System/Permissions.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback permission snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Permissions.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live permissions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Permission created." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "System permissions cannot be edited" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-permissions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Permissions page must use live-only data and CRUD controls without registry fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Permissions frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createMenuSummariesFromRegistry" \
    "$ROOT_DIR/apps/admin/src/pages/System/Menus.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createPermissionSummariesFromRegistry" \
    "$ROOT_DIR/apps/admin/src/pages/System/Menus.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback menu snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Menus.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live menus" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Menu created." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Add child" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-menus" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Menus page must use live-only data and live permission options without registry fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Menus frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createPermissionSummariesFromRegistry" \
    "$ROOT_DIR/apps/admin/src/pages/System/Roles.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createSystemDeptFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Roles.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Roles.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback role snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Roles.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Roles.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live roles" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live role detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Role menus updated." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Role users updated." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-roles" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Roles page must use live-only data and role assignment controls without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Roles frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createSystemDeptOptionFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createSystemDeptFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createSystemPostFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRoleRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback user snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Users.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live users" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live user detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "User Excel export downloaded" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Previewed " \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Assign Roles" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Pick users" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Temporary password generated" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Users page must use live-only data, imports, exports and assignment controls without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Users frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createSystemConfigFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Config.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Config.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback config snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Config.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setRows(fallbackRows)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Config.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Config.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system config" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system config detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live config environment overrides." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live config secret versions." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live config vault status." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Config Excel export downloaded" \
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
    "Feature audience" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-config" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Config page must use live-only data, environment overrides, secret vault controls and exports without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Config frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createSystemNoticeFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback system notice snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setRows(fallbackRows)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedTemplateDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedInboxDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Notices.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notices" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notice detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notice template detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notice inbox detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notice templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live system notice delivery records" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Run outbox schedule" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create draft from template" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Preview and apply" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "data-opencore-notice-create-template-panel" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-notices" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-notice-templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin System Notices page must use live-only lifecycle, inbox, template and delivery data without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed System Notices frontend page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createFileAssetFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Files.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "fallbackRows" \
    "$ROOT_DIR/apps/admin/src/pages/System/Files.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback file fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/System/Files.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setRows(fallbackRows)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Files.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "setSelectedDetail(record)" \
    "$ROOT_DIR/apps/admin/src/pages/System/Files.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live files" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live file detail." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Upload File" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Choose file" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "core-files" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Files page must use live-only upload, download, metadata and delete data without fixture fallback." >&2
    echo "Refusing to deploy a stale or fixture-backed Files frontend page." >&2
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

  if grep \
    --fixed-strings \
    "createAuditLogFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Security/OperationLogs.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback operation log fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Security/OperationLogs.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createLoginLogFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Security/LoginLogs.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback login log fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Security/LoginLogs.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Operation actor server filter" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Apply operation log server filters" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live operation logs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live login logs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin Security Logs pages must use live-only data and operation-log server filters without fixture fallback." >&2
    echo "Refusing to deploy stale or fixture-backed Security Logs pages." >&2
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

  if grep \
    --fixed-strings \
    "createSystemStatusFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Status.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback monitor snapshot" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Status.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live runtime status" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Runtime resources" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "CPU load 1m" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Memory usage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Disk usage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live runtime resources" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "monitor:status:read" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload runtime status" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live monitor runtime resource controls." >&2
    echo "Refusing to deploy a stale frontend monitor status page." >&2
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
    "pages.system.area.title" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.cards.reusableSelector" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.cards.treeTable" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.cards.ipBoundaryLookup" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.cards.datasetVersions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.actions.validateImport" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "pages.system.area.actions.activateImport" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
  ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "system:area:read" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include System Area tree, selector, IP lookup and import controls." >&2
    echo "Refusing to deploy a stale frontend Area Management page." >&2
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

  if grep \
    --fixed-strings \
    "createIntegrationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/Providers.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createIntegrationProviderHealthAuditFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/Providers.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findIntegrationOutboxFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/Providers.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback Integration Health Audit data" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/Providers.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live Integration Health Audit" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live Integration Health Audit data" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
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
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Config Version" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Secret Ref Validation" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Provider Test" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Provider Audit Logs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live Outbox Summary" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live integration provider health audit, signed callback, SMS HTTP, secret injection, Mail SMTP, SMTP TLS policy, outbox subject, SMTP attachments, provider diagnostics, provider test and provider audit surfaces." >&2
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

  if grep \
    --fixed-strings \
    "createIntegrationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/OAuth.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findOAuthTokenFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/OAuth.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback OAuth token inventory data" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/OAuth.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "OAuth token inventory" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live OAuth token inventory" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "OAuth callback flow admission" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "State validation flow ledger" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "OAuth callback audit trail" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Start OAuth flow" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live OAuth token inventory" \
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
    echo "Admin bundle does not include OAuth token inventory, callback flow and revoke controls." >&2
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
    "Last mail test-send" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Send test" \
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
    "Last SMS test-send" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Send test" \
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

  if grep \
    --fixed-strings \
    "createOperationsFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Jobs.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback job fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Jobs.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live scheduler jobs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Run log retention" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Clean run logs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live scheduler jobs" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live scheduler job run retention controls." >&2
    echo "Refusing to deploy a stale or fixture-backed Monitor Jobs page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createIntegrationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/WeChat.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findIntegrationDesignFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/WeChat.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "createIntegrationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/WebSocket.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findIntegrationDesignFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Integrations/WebSocket.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live WeChat design" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload live WeChat design" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "integration:wechat:read" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "WebSocket Runtime" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reload live WebSocket runtime" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Open diagnostic stream" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Runtime connection status" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Subscription event routing" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Diagnostic runtime events" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "integration:websocket:read" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live WebSocket runtime boundary" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live integration WebSocket runtime operations." >&2
    echo "Refusing to deploy stale frontend WeChat/WebSocket integration pages." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createCollaborationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Messages.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findMessageFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Messages.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live messages" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create message" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Mark read" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Archive message" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:message:create" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:message:delete" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live collaboration message operations." >&2
    echo "Refusing to deploy a stale frontend Collaboration Messages page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createCollaborationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Notices.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findNoticeFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Notices.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live notices" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create notice" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Publish notice" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Archive notice" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:notice:create" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:notice:update" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live collaboration notice operations." >&2
    echo "Refusing to deploy a stale frontend Collaboration Notices page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createCollaborationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Todos.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findTodoFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Todos.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live todos" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create todo" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Assign todo" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Complete todo" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Cancel todo" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:todo:create" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:todo:update" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live collaboration todo operations." >&2
    echo "Refusing to deploy a stale frontend Collaboration Todos page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createCollaborationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Tickets.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findTicketFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Tickets.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live tickets" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Overdue tickets" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Batch assign" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Export transitions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create ticket" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Ticket assigned" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Ticket attachment added" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:ticket:create" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:ticket:assign" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:ticket:comment" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:ticket:close" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:ticket:delete" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live collaboration ticket operations." >&2
    echo "Refusing to deploy a stale frontend Collaboration Tickets page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createCollaborationFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Approvals.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "findApprovalLiteFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Collaboration/Approvals.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live approvals" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Create approval" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Approve request" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Reject request" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:approval-lite:create" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "collaboration:approval-lite:update" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include live collaboration approval operations." >&2
    echo "Refusing to deploy a stale frontend Collaboration Approval Lite page." >&2
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

  if grep \
    --fixed-strings \
    "createQueueStatusFixture" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Queues.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback queue fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/Queues.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Scheduler queues" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Queue metrics" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Queue control" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Pause queue" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Resume queue" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "monitor:queue:manage" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null; then
    echo "Admin bundle does not include managed monitor queue controls." >&2
    echo "Refusing to deploy a stale frontend monitor queues page." >&2
    exit 1
  fi

  if grep \
    --fixed-strings \
    "createOperationsFixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/OnlineUsers.tsx" >/dev/null || \
    grep \
    --fixed-strings \
    "Using fallback online user fixtures" \
    "$ROOT_DIR/apps/admin/src/pages/Monitor/OnlineUsers.tsx" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Live online user sessions" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Unable to load live online users" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
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

  if grep -R \
    --fixed-strings \
    --include='*.js' \
    "SSE inbox events" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "System Notice Templates" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "Realtime sync enabled" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "New notices and read status changes are synchronized automatically." \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "More actions for" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "data-opencore-notices-mobile-list" \
    "$ROOT_DIR/apps/admin/dist" >/dev/null || \
    ! grep -R \
    --fixed-strings \
    --include='*.js' \
    "No system notices match the current filters." \
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

is_pid_alive() {
  local pid_file="$1"
  local pid

  pid="$(cat "$pid_file" 2>/dev/null || true)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

require_pid_alive() {
  local pid_file="$1"
  local label="$2"
  local log_file="$3"

  if ! is_pid_alive "$pid_file"; then
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

append_deploy_cors_origins() {
  local admin_origins="http://127.0.0.1:$ADMIN_PORT,http://localhost:$ADMIN_PORT,$ADMIN_PUBLIC_BASE_URL"

  if [ -n "${CORS_ORIGINS:-}" ]; then
    export CORS_ORIGINS="$CORS_ORIGINS,$admin_origins"
  else
    export CORS_ORIGINS="$admin_origins"
  fi
}

start_api_process() {
  echo "Starting OpenCore API on fixed port $API_PORT"
  (
    cd "$ROOT_DIR"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    append_deploy_cors_origins
    export PORT="$API_PORT"
    export API_HOST="$API_LISTEN_HOST"
    export NODE_ENV="${OPENCORE_DEPLOY_NODE_ENV:-${NODE_ENV:-development}}"
    export OPENCORE_APP_VERSION="$DEPLOY_APP_VERSION"
    export OPENCORE_GIT_COMMIT="$DEPLOY_GIT_COMMIT"
    export OPENCORE_BUILD_TIME="$DEPLOY_BUILD_TIME"
    export OPENCORE_DEPLOYMENT_ID="$DEPLOYMENT_ID"
    export OPENCORE_DEPLOY_PUBLIC_API_BASE_URL="$API_PUBLIC_BASE_URL"
    export OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL="$ADMIN_PUBLIC_BASE_URL"
    export OPENCORE_OAUTH_CALLBACK_REDIRECT_URL="${OPENCORE_OAUTH_CALLBACK_REDIRECT_URL:-$ADMIN_PUBLIC_BASE_URL/personal/profile}"
    setsid node dist/apps/api/main.js </dev/null >>"$API_LOG_FILE" 2>&1 &
    echo "$!" > "$API_PID_FILE"
  )

  if ! wait_for_url "$API_BASE_URL/health/live" "OpenCore API"; then
    tail -100 "$API_LOG_FILE" >&2 || true
    return 1
  fi

  if ! is_pid_alive "$API_PID_FILE"; then
    echo "OpenCore API is not running after deploy. Log tail:" >&2
    tail -100 "$API_LOG_FILE" >&2 || true
    return 1
  fi
}

start_admin_process() {
  echo "Starting OpenCore Admin on fixed port $ADMIN_PORT"
  (
    cd "$ROOT_DIR"
    export PORT="$ADMIN_PORT"
    export HOST="$ADMIN_LISTEN_HOST"
    export ADMIN_STATIC_ROOT="$ROOT_DIR/apps/admin/dist"
    export ADMIN_API_BASE_URL="$ADMIN_API_BASE_URL_VALUE"
    export ADMIN_API_PROXY_TARGET="$API_BASE_URL"
    start_tools_ts_script_detached "$ROOT_DIR/tools/scripts/serve-admin-static.ts"
    echo "$!" > "$ADMIN_PID_FILE"
  )

  if ! wait_for_url "$ADMIN_HEALTH_URL/" "OpenCore Admin"; then
    tail -100 "$ADMIN_LOG_FILE" >&2 || true
    return 1
  fi

  if ! is_pid_alive "$ADMIN_PID_FILE"; then
    echo "OpenCore Admin is not running after deploy. Log tail:" >&2
    tail -100 "$ADMIN_LOG_FILE" >&2 || true
    return 1
  fi
}

ensure_deployed_services_running() {
  local status=0

  if ! is_pid_alive "$API_PID_FILE" || ! curl -fsS "$API_BASE_URL/health/live" >/dev/null 2>&1; then
    echo "Restarting OpenCore API after failed deploy." >&2
    stop_pid_file "$API_PID_FILE" "OpenCore API" || true
    start_api_process || status=1
  fi

  if ! is_pid_alive "$ADMIN_PID_FILE" || ! curl -fsS "$ADMIN_HEALTH_URL/" >/dev/null 2>&1; then
    echo "Restarting OpenCore Admin after failed deploy." >&2
    stop_pid_file "$ADMIN_PID_FILE" "OpenCore Admin" || true
    start_admin_process || status=1
  fi

  return "$status"
}

handle_deploy_exit() {
  local status=$?

  trap - EXIT

  if [ "$status" -ne 0 ] && [ "$DEPLOY_SERVICES_STARTED" = "true" ]; then
    echo "OpenCore deploy failed after service startup; ensuring services remain available." >&2
    ensure_deployed_services_running || true
  fi

  exit "$status"
}

trap handle_deploy_exit EXIT

cd "$ROOT_DIR"

echo "Running source guards"
run_tools_ts_script "$ROOT_DIR/tools/scripts/check-admin-i18n.ts" \
  --root "$ROOT_DIR"
run_tools_ts_script "$ROOT_DIR/tools/scripts/check-api-error-codes.ts" \
  --root "$ROOT_DIR"

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

start_api_process
start_admin_process
DEPLOY_SERVICES_STARTED=true

verify_admin_api_proxy_login
verify_api_duplicate_prefix_login
run_with_retry \
  "Admin public bundle verification" \
  "${OPENCORE_DEPLOY_ADMIN_BUNDLE_ATTEMPTS:-3}" \
  verify_public_admin_bundle

run_with_retry \
  "Admin public UI smoke" \
  "${OPENCORE_DEPLOY_ADMIN_UI_SMOKE_ATTEMPTS:-3}" \
  run_with_env env \
    OPENCORE_SMOKE_ADMIN_BASE_URL="$ADMIN_PUBLIC_BASE_URL" \
    OPENCORE_SMOKE_TIMEOUT_MS="${OPENCORE_SMOKE_TIMEOUT_MS:-120000}" \
    run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
      "$ROOT_DIR/tools/smoke/smoke-admin-error-ui.ts"

run_with_retry \
  "Admin business i18n smoke" \
  "${OPENCORE_DEPLOY_ADMIN_UI_SMOKE_ATTEMPTS:-3}" \
  run_with_env env \
    OPENCORE_SMOKE_ADMIN_BASE_URL="$ADMIN_PUBLIC_BASE_URL" \
    OPENCORE_SMOKE_TIMEOUT_MS="${OPENCORE_SMOKE_TIMEOUT_MS:-120000}" \
    run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
      "$ROOT_DIR/tools/smoke/smoke-admin-business-i18n.ts"

run_with_retry \
  "Admin business actions smoke" \
  "${OPENCORE_DEPLOY_ADMIN_UI_SMOKE_ATTEMPTS:-3}" \
  run_with_env env \
    OPENCORE_SMOKE_ADMIN_BASE_URL="$ADMIN_PUBLIC_BASE_URL" \
    OPENCORE_SMOKE_ADMIN_API_BASE_URL="$API_BASE_URL" \
    OPENCORE_SMOKE_TIMEOUT_MS="${OPENCORE_SMOKE_TIMEOUT_MS:-120000}" \
    run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
      "$ROOT_DIR/tools/smoke/smoke-admin-business-actions.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-config.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-dict.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-menu.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-permission.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-role.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-monitor-status.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-monitor-jobs.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-post.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-messages.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-notices.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-todos.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-tickets.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-collaboration-approvals.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-operations-reports.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-notice.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-integration-health.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-integration-oauth-tokens.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-auth-social.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-integration-designs.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-dept.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-user.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-profile.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-member.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-member-lifecycle.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-switcher.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-platform-visit.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-lifecycle.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-tenant-plan.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-file.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-audit-log.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-tool-area.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-tool-openforge.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-online-user.ts"

run_with_env env \
  OPENCORE_SMOKE_BASE_URL="$API_BASE_URL" \
  OPENCORE_SMOKE_CHECK_DOCS="${OPENCORE_SMOKE_CHECK_DOCS:-false}" \
  run_tools_ts_script "$ROOT_DIR/tools/scripts/run-typed-smoke.ts" \
    "$ROOT_DIR/tools/smoke/smoke-core-login-log.ts"

require_pid_alive "$API_PID_FILE" "OpenCore API" "$API_LOG_FILE"
require_pid_alive "$ADMIN_PID_FILE" "OpenCore Admin" "$ADMIN_LOG_FILE"

echo "OpenCore deploy complete"
echo "API: $API_BASE_URL (pid $(cat "$API_PID_FILE"))"
echo "Public API: $API_PUBLIC_BASE_URL"
echo "Admin: $ADMIN_PUBLIC_BASE_URL (pid $(cat "$ADMIN_PID_FILE"))"
echo "Logs: $API_LOG_FILE, $ADMIN_LOG_FILE"
