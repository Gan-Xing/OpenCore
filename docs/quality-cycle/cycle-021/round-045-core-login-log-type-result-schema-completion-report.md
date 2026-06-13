# Round 045 core.login-log Type Result Schema Completion Report

Date: 2026-06-13
Supporting lint commit:
`4df5dd1 fix(system): satisfy xlsx export lint guard / 修复 XLSX 导出 lint 守卫`
Feature commit:
`167bf08 feat(login-log): add login type result schema / 新增登录日志类型结果模型`

## Scope

This round closed the login-log schema expansion gap for the current OpenCore
waterline. Before this round, login logs exposed only `success` plus
`failureReason`, while Yudao carries login `logType` and `result` fields and
RuoYi exposes login status/message alongside device/IP fields.

The accepted loop covers persisted fields, migration, auth recording, API DTOs,
OpenAPI, SDK, Admin Login Logs, fixed-port smoke, deploy smoke and public URL
verification.

## Implemented

- Added `SecurityLoginLogType` and `SecurityLoginResult`.
- Added persisted `LoginLog.logType` and `LoginLog.result`.
- Added migration `20260613064000_login_log_result_schema`.
- Seeded and backfilled login logs with `login.username` plus result values.
- Recorded successful username logins as `success`.
- Recorded missing users and bad passwords as `bad_credentials`.
- Recorded disabled users as `user_disabled` while keeping the public auth
  response unchanged.
- Kept legacy `success` for compatibility.
- Added API/SDK/Admin fields and `logType/result` filters.
- Added invalid enum 400 guards.
- Added export columns for `logType` and `result`.
- Extended Admin Login Logs with type/result columns, detail and filters.
- Extended fixed-port/deploy/public smoke with result-schema guards.
- Fixed the pre-existing XLSX helper lint blocker so the full lint gate passes.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Fixed-port local smoke passed on `39173` and included:

- `core.login-log.result-schema`
- `core.login-log.invalid-result-guard`

Deployment completed through `pnpm deploy:opencore` with API on `39172` and
Admin on `39174`.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-login-log` passed with result-schema checks.
- Public Admin main bundle `umi.63f63e69.js` contains the deployed API origin
  and no duplicate `/api/api/auth/login`.
- Public Login Logs chunk `p__Security__LoginLogs.1e1a0df4.async.js` contains
  type/result UI markers.
- Public Admin same-origin login and duplicate-prefix login both succeeded.
- Public Admin same-origin proxy returned a real failed login by
  `logType=login.username&result=bad_credentials`.
- Public Admin same-origin detail exposed type/result/device fields.
- Public Admin same-origin export preview included `logType` and `result`.
- Public Admin same-origin invalid `result` query returned 400.

## Remaining Debt

This round does not claim full login-log productization. Remaining admitted
`core.login-log` debt:

- IP/location enrichment where feasible;
- login-log deletion/cleanup;
- user unlock and lockout-policy integration.

Still out of scope for this round:

- mobile/social login workflows;
- logout logging;
- session termination from the login-log page;
- RuoYi-style clean/delete/unlock operations.
