# Round 59 Completion Report: core.login-log IP Location

Date: 2026-06-13
Feature commit:
`b39b1ac feat(login-log): add ip location enrichment / 新增登录日志 IP 位置`
Deployment: API `39172`, Admin `39174`

## Capability

Round 59 adds deterministic IP/location enrichment for `core.login-log`.
OpenCore now persists a `location` field for login logs, computes it from the
request IP at write time and exposes it through API, SDK, OpenAPI, Admin and
smoke.

This is a foundation login-log loop, not an external GeoIP or country/city
accuracy product.

## Implemented

- Added IP normalization and deterministic location classification in
  `@opencore/common`.
- Added Prisma `LoginLog.location` plus migration/backfill.
- Extended seed and Prisma login-log repositories to compute, persist and
  filter `location`.
- Extended login-log DTOs, SDK summary/query types, registry fixtures and
  OpenAPI output.
- Added Admin Login Logs Location column, detail field, current-page export
  field and server-side Location filter.
- Extended fixed-port/deploy/public `core.login-log` smoke with detail
  location, location filters and export columns.
- Added a deploy-script guard that rejects stale Admin Login Logs bundles
  missing the Location server filter UI.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public login-log smoke passed with `core.login-log.location`.
- Public Admin Login Logs chunk
  `p__Security__LoginLogs.c2b20b26.async.js` contains
  `Login location server filter`, `Location` and `location`.

## Remaining Debt

- External GeoIP provider integration remains a separate foundation round.
- Country/city/provider configuration and IP database update governance remain
  separate foundation work.
- Mobile/SMS/social login logging remains a separate security-auth round.
- Session termination from the Login Logs page remains a separate admission.
