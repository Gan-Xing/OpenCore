# Round 49 Completion Report: core.config/security-auth Configurable Attempt Limit

## Scope

Round 49 closed the runtime failed-attempt threshold stage for the login policy.

This round delivered:

- public system config `auth.login.maxFailedAttempts`;
- runtime `loginMaxFailedAttempts` on `/api/core/config/runtime`;
- API login policy provider consumption of that runtime value;
- Admin login-page display of attempts plus lockout minutes;
- SDK/OpenAPI/fixture propagation;
- fixed-port, deploy and public smoke proving the threshold can be changed and
  lockout follows the configured value;
- deploy-script stale frontend guard for the login-policy bundle markers.

Out of scope: captcha verification, IP location enrichment, logout/mobile/SMS/
social login logging, session termination from the login-log page, secret
vault/KMS integration and broad feature-flag propagation.

## Commits

- Feature commit:
  `b4a0258 feat(login-policy): add configurable attempt limit / 新增登录失败次数策略`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.91a0b1a3.js`
- Login page chunk: `p__user__login__index.b5055d16.async.js`

## Verification

- `bash -n tools/scripts/deploy-local-opencore.sh tools/scripts/run-local-api-smoke.sh`
- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check tools/scripts/smoke-core-login-log.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test api --testFile=system-security-login-policy.provider.spec.ts`
- `pnpm nx test system --testFile=system-config.spec.ts --skip-nx-cache`
- `pnpm nx test sdk --testFile=registry-fixtures.spec.ts --skip-nx-cache`
- `pnpm nx test admin --skip-nx-cache`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm openapi:export`
- `pnpm prisma:validate`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,security,system,contracts --skip-nx-cache`
- `pnpm build:api`
- `FORCE_UTOOPACK= OPENCORE_ADMIN_BUNDLER=webpack NX_DAEMON=false pnpm exec nx build admin --skip-nx-cache`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

Public API config smoke passed with:

- `core.config.runtime-login-attempt-policy`
- `core.config.runtime-login-attempt-policy-guards`

Public API login-log smoke passed with:

- `auth.login-lockout.configurable-attempt-limit`
- `auth.login-lockout.enforced`
- `core.login-log.account-locked-filter`
- `core.login-log.unlock-restores-login`

Public Admin verification passed with:

- no stale HTML cache on `/user/login`;
- main bundle using `http://144.217.243.161:39172`;
- no bundle-generated duplicate `/api/api/auth/login`;
- Login page chunk containing `loginMaxFailedAttempts` and
  `Login lockout policy`;
- public API and Admin proxy runtime config returning
  `loginMaxFailedAttempts: 5`;
- public Admin proxy `/api/auth/login` and compatible `/api/api/auth/login`
  both returning a valid token.

## Remaining Debt

- `core.config`: secret vault/KMS integration if admitted, plus broader runtime
  feature-flag propagation.
- `core.login-log`: IP/location enrichment where feasible and broader
  logout/mobile/SMS/social login logging.
- Login policy: any future captcha or richer policy tuning must be admitted as
  separate stages with the same API/SDK/Admin/smoke/deploy coverage.
