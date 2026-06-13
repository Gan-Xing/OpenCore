# Round 046 core.config Runtime Login Policy Completion Report

Date: 2026-06-13
Feature commit:
`b0b23ee feat(core-config): add runtime login policy / 新增运行时登录策略`

## Scope

This round closed the next admitted runtime config propagation loop. Before
this round, `auth.login.lockoutMinutes` existed as a seeded config row but was
private and not part of `GET /api/core/config/runtime`; Admin could only consume
the runtime Admin title.

The accepted loop covers seed data, migration, value validation, runtime
summary, API DTO, SDK/OpenAPI, Admin login consumption, fixed-port smoke,
deployment smoke and public URL verification.

## Implemented

- Made `auth.login.lockoutMinutes` a public system config.
- Added migration `20260613072000_config_runtime_login_policy`.
- Added `loginLockoutMinutes` to `SystemConfigRuntimeDto` and SDK runtime
  summary types.
- Read the login policy through the existing public config value cache.
- Added boolean/number config value validation in seed and Prisma repositories.
- Guarded runtime keys from private/secret visibility and incompatible value
  types.
- Required `auth.login.lockoutMinutes` to stay an integer between 1 and 1440.
- Stored Admin `runtimeConfig` in initial state.
- Rendered the login lockout window on the Admin login page.
- Extended Admin static smoke and `tools/scripts/smoke-core-config.mjs`.
- Refreshed OpenAPI.

## Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `node --check tools/scripts/smoke-core-config.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-config.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm prisma:validate`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,contracts`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

Fixed-port local smoke passed on `39173` and included:

- `core.config.runtime-login-policy`
- `core.config.runtime-login-policy-guards`

Deployment completed through `pnpm deploy:opencore` with API on `39172` and
Admin on `39174`.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-config` passed with runtime login-policy checks.
- Public Admin main bundle `umi.e39122bd.js` contains the deployed API origin,
  `/core/config/runtime` and no duplicate `/api/api/auth/login`.
- Public login chunk `p__user__login__index.48a5b578.async.js` contains
  `loginLockoutMinutes` and `Login lockout window`.
- Public Admin same-origin runtime matched public API runtime.
- Public Admin same-origin login and duplicate-prefix login both succeeded.
- Public Admin same-origin invalid login-policy updates returned 400.
- Public Admin same-origin valid login-policy update propagated to public API
  and Admin runtime endpoints, then restored the original value.

## Remaining Debt

This round does not claim full config or login-security productization.
Remaining admitted debt:

- secret vault/KMS integration if admitted into OpenCore's config boundary;
- broader runtime feature-flag propagation;
- real failed-attempt account lockout and user unlock policy;
- captcha configuration and workflows.
