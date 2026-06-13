# Round 26 Completion Report: core.login-log Device Filters

Date: 2026-06-12
Feature commit: `dd720f8 feat(core-login-log): add device filters loop`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 26 closed the next `core.login-log` P1 productization gap: readable
device fields and server-side IP/time filters for login audit workflows.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire login-log product as complete.

## Delivered

- Shared `@opencore/common` user-agent parser.
- Login-log `browser` and `os` response fields derived from recorded
  `userAgent`.
- Server-side login-log filters: `ip`, `createdFrom`, `createdTo`.
- Invalid date and reversed range guards.
- Seed and Prisma repository support for the new filters.
- SDK/OpenAPI/Admin updates for device fields and server filters.
- Admin Login Logs toolbar for username/IP/result/time server filtering.
- Fixed-port/deploy/public login-log smoke for device parsing, IP/time filters,
  future-window exclusion, invalid date 400 and export device columns.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `tools/scripts/smoke-core-login-log.mjs` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public login-log smoke verified failed-login recording, server-side
  username/result/IP/time filters, future-window exclusion, invalid
  `createdFrom` 400, Chrome/Windows device fields and export device columns.
- `GET http://144.217.243.161:39174/security/login-logs/` returned 200.
- Public main Admin bundle `umi.688dcb49.js` contains API origin
  `http://144.217.243.161:39172` and `/core/login-logs`, and no
  `/api/api/auth/login`.
- Public Login Logs chunk `p__Security__LoginLogs.990c6615.async.js` contains
  `createdFrom`, `createdTo`, `Browser`, `OS` and `Apply server filters`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`.

## Remaining login-log.product Debt

- IP geolocation enrichment where feasible.
- Cleanup/delete and user-unlock policy integration.
- Lockout-policy tuning and login-type/result schema expansion.
- Session termination from login-log context if admitted as a separate product
  stage.
