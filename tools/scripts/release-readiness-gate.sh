#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${OPENCORE_ENV_FILE:-$ROOT_DIR/.env.opencore.local}"
PUBLIC_HOST="${OPENCORE_RELEASE_PUBLIC_HOST:-${OPENCORE_DEPLOY_PUBLIC_HOST:-144.217.243.161}}"
API_PUBLIC_BASE_URL="${OPENCORE_RELEASE_PUBLIC_API_BASE_URL:-${OPENCORE_DEPLOY_PUBLIC_API_BASE_URL:-http://$PUBLIC_HOST:39172}}"
ADMIN_PUBLIC_BASE_URL="${OPENCORE_RELEASE_PUBLIC_ADMIN_BASE_URL:-${OPENCORE_DEPLOY_PUBLIC_ADMIN_BASE_URL:-http://$PUBLIC_HOST:39174}}"
RUN_DEPLOY="${OPENCORE_RELEASE_GATE_DEPLOY:-true}"
ALLOW_DIRTY="${OPENCORE_RELEASE_GATE_ALLOW_DIRTY:-false}"
TENANT_PLATFORM_GUARDS=(
  guard:tenant-foundation
  guard:tenant-auth
  guard:tenant-rbac
  guard:tenant-member-assignment
  guard:tenant-plan-control-plane
  guard:tenant-lifecycle-control-plane
  guard:tenant-member-control-plane
  guard:tenant-switcher
  guard:platform-visit
  guard:tenant-dept-scope
  guard:tenant-post-scope
  guard:tenant-role-scope
  guard:tenant-config-scope
  guard:tenant-dict-scope
  guard:tenant-file-scope
  guard:tenant-notice-scope
  guard:tenant-online-user-scope
  guard:tenant-operation-log-scope
  guard:tenant-login-log-scope
  guard:tenant-redis-scope
  guard:tenant-queue-scope
  guard:tenant-scheduler-scope
  guard:tenant-websocket-scope
  guard:tenant-integration-scope
  guard:tenant-collaboration-message-scope
  guard:tenant-collaboration-notice-scope
  guard:tenant-collaboration-todo-scope
  guard:tenant-collaboration-approval-scope
  guard:tenant-report-definition-scope
  guard:tenant-legacy-user-org
  guard:tenant-business-domain-admission
)

cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift
  echo "==> $label"
  "$@"
}

require_clean_worktree() {
  if [ "$ALLOW_DIRTY" = "true" ]; then
    echo "Release gate dirty-worktree check bypassed by OPENCORE_RELEASE_GATE_ALLOW_DIRTY=true."
    return 0
  fi

  local status
  status="$(git status --short)"
  if [ -n "$status" ]; then
    echo "Release gate requires a clean git worktree. Commit, stash or set OPENCORE_RELEASE_GATE_ALLOW_DIRTY=true." >&2
    echo "$status" >&2
    exit 1
  fi
}

require_env_file() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing env file: $ENV_FILE" >&2
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

run_pnpm_scripts() {
  local script

  for script in "$@"; do
    run_step "$script" pnpm "$script"
  done
}

run_public_smoke() {
  node - "$API_PUBLIC_BASE_URL" "$ADMIN_PUBLIC_BASE_URL" <<'NODE'
const [rawApiBaseUrl, rawAdminBaseUrl] = process.argv.slice(2);
const apiBaseUrl = trimTrailingSlash(rawApiBaseUrl);
const adminBaseUrl = trimTrailingSlash(rawAdminBaseUrl);
const timeoutMs = Number(process.env.OPENCORE_RELEASE_PUBLIC_SMOKE_TIMEOUT_MS || 10000);
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const requiredRoleCodes = splitCsv(process.env.OPENCORE_RELEASE_REQUIRED_ROLE_CODES || 'admin');
const requiredPermissionCodes = splitCsv(
  process.env.OPENCORE_RELEASE_REQUIRED_PERMISSION_CODES ||
    'core:dashboard:read,core:user:read,core:role:read',
);
const passwordCandidates = unique(
  [
    process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
    process.env.BOOTSTRAP_ADMIN_PASSWORD,
    'admin123',
  ].filter(Boolean),
);

await expectOk(`${apiBaseUrl}/health/live`, 'public API live');
await expectOk(`${apiBaseUrl}/health/ready`, 'public API ready');

const adminResponse = await expectOk(`${adminBaseUrl}/`, 'public Admin root');
const adminHtml = await adminResponse.text();
if (!adminHtml.includes('<div id="root"') && !adminHtml.includes('umi.')) {
  throw new Error('public Admin root did not look like the deployed Umi app');
}

const login = await loginWithCandidates();
const accessToken = assertString(login.accessToken, 'login accessToken');
assertUser(login.user, 'login user');
assertCodes(login.user.roleCodes, requiredRoleCodes, 'login roleCodes');
assertCodes(login.user.permissionCodes, requiredPermissionCodes, 'login permissionCodes');

const me = await expectJson(`${apiBaseUrl}/api/auth/me`, 'public auth/me', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
assertUser(me.user, 'auth/me user');
if (me.user.username !== username) {
  throw new Error(`auth/me returned username ${me.user.username}, expected ${username}`);
}
assertCodes(me.user.roleCodes, requiredRoleCodes, 'auth/me roleCodes');
assertCodes(me.user.permissionCodes, requiredPermissionCodes, 'auth/me permissionCodes');

await expectOk(`${apiBaseUrl}/api/auth/logout`, 'public auth/logout', {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },
});

console.log('release public smoke passed');

async function loginWithCandidates() {
  let lastStatus = 0;

  for (const password of passwordCandidates) {
    const response = await fetchWithTimeout(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      return response.json();
    }

    lastStatus = response.status;
    if (![401, 403].includes(response.status)) {
      throw new Error(`public auth/login returned HTTP ${response.status}`);
    }
  }

  throw new Error(
    `Unable to authenticate release smoke admin ${username}; set OPENCORE_SMOKE_ADMIN_PASSWORD.`,
  );
}

async function expectOk(url, label, init = {}) {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  return response;
}

async function expectJson(url, label, init = {}) {
  const response = await expectOk(url, label, init);
  return response.json();
}

async function fetchWithTimeout(url, init = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function assertUser(user, label) {
  if (!user || typeof user !== 'object') {
    throw new Error(`${label} is missing`);
  }
  if (user.username !== username) {
    throw new Error(`${label} username mismatch`);
  }
  if (!Array.isArray(user.roleCodes) || user.roleCodes.length === 0) {
    throw new Error(`${label} roleCodes are missing`);
  }
  if (!Array.isArray(user.permissionCodes) || user.permissionCodes.length === 0) {
    throw new Error(`${label} permissionCodes are missing`);
  }
}

function assertCodes(actualCodes, requiredCodes, label) {
  for (const code of requiredCodes) {
    if (!actualCodes.includes(code)) {
      throw new Error(`${label} is missing ${code}`);
    }
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} is missing`);
  }
  return value;
}

function splitCsv(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '');
}

function unique(values) {
  return [...new Set(values)];
}
NODE
}

run_step "release git worktree check" require_clean_worktree
run_step "release env file check" require_env_file
run_step "format check" pnpm format:check
run_step "Prisma schema validation" pnpm prisma:validate
run_step "lint" pnpm lint
run_step "typecheck" pnpm typecheck
run_step "test" pnpm test
run_step "sdk drift check" pnpm sdk:check
run_step "OpenAPI registry tag check" pnpm openapi:registry-tags:check
run_step "OpenAPI drift check" pnpm openapi:check
run_step "Admin route access check" pnpm registry:admin-routes:check
run_step "Admin fallback closure guard" pnpm guard:admin-fallback-closure --json
run_pnpm_scripts "${TENANT_PLATFORM_GUARDS[@]}"
run_step "build" pnpm build
run_step "local API smoke" pnpm smoke:api:local

if [ "$RUN_DEPLOY" = "true" ]; then
  run_step "fixed-port deploy" env OPENCORE_DEPLOY_PUBLIC_HOST="$PUBLIC_HOST" pnpm deploy:opencore
else
  echo "==> fixed-port deploy skipped by OPENCORE_RELEASE_GATE_DEPLOY=false"
fi

run_step "public API/Admin/default-account smoke" run_with_env run_public_smoke

echo "Release readiness gate passed"
echo "Public API: $API_PUBLIC_BASE_URL"
echo "Public Admin: $ADMIN_PUBLIC_BASE_URL"
