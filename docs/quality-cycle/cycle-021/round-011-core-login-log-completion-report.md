# Round 011 Core Login Log Completion Report

Date: 2026-06-12  
Capability: `core.login-log` productization and Admin API-base deploy hardening  
Feature commit: `40d879c feat(core-login-log): productize login log audit trail / 产品化登录日志审计链路`

## Summary

Round 011 productized login-log audit records as a real read-only Security
operation surface. The round added detail support across audit runtime, API and
SDK, replaced the fixture-only Admin page with a live SDK-backed page, and
extended fixed-port smoke/deploy scripts to verify failed-login recording.

The round also fixed the deployed Admin login 405 regression. The browser bundle
now receives `ADMIN_API_BASE_URL`, deploy refuses bundles that do not contain the
public API base URL, and the Admin static server proxies `/api/*` to the API as
a defense-in-depth fallback.

## Reference Alignment

- RuoYi and Yudao both expose login logs as a security/system audit surface for
  list, export and diagnosis.
- Yudao's Admin and backend include row detail; OpenCore now matches that
  bounded shape.
- OpenCore intentionally keeps login logs immutable in this round and does not
  add deletion, cleanup, unlock or lockout-policy actions.

## Implemented

- `GET /api/core/login-logs/:id` guarded by `core:login-log:read`.
- `@opencore/audit` `getLoginLog` contract for seed and Prisma repositories.
- `@opencore/sdk` login-log query/detail support and tests.
- Live Admin `/security/login-logs` page with list, detail drawer and
  current-page export.
- `tools/scripts/smoke-core-login-log.mjs` covering auth, failed-login record,
  list, detail and export.
- Login-log smoke wired into `pnpm smoke:api:local` and `pnpm deploy:opencore`.
- Admin config exposes `process.env.ADMIN_API_BASE_URL` to the browser build.
- Deploy script validates Admin JS contains the configured public API base URL.
- Admin static server proxies `/api/*` and deploy smokes same-origin
  `/api/auth/login`.

## Verification

- `node --check tools/scripts/serve-admin-static.mjs &&
node --check tools/scripts/smoke-core-login-log.mjs &&
node --check apps/admin/scripts/smoke-test.mjs`
- `bash -n tools/scripts/deploy-local-opencore.sh tools/scripts/run-local-api-smoke.sh`
- `pnpm test:admin`
- `FORCE_UTOOPACK= OPENCORE_ADMIN_BUNDLER=webpack ADMIN_API_BASE_URL=http://144.217.243.161:39172/api pnpm build:admin`
- `rg -l --fixed-strings "http://144.217.243.161:39172/api" apps/admin/dist -g '*.js'`
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test &&
pnpm openapi:check && pnpm sdk:check && pnpm smoke:api:local`

## Deployed URL Contract

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Login: `http://144.217.243.161:39174/user/login`

The deployed server's admin password is sourced from `.env.opencore.local`
`BOOTSTRAP_ADMIN_PASSWORD`; `admin123` is only a fallback for environments that
do not override the seed password.

## Remaining Risks

- Browser cache may still hold an old HTML/JS pair until the page is refreshed.
- Login-log date-range, location/device enrichment and lockout/session actions
  are intentionally deferred.
- The deploy path is local-server oriented; CI/CD promotion is still a separate
  future hardening track.
