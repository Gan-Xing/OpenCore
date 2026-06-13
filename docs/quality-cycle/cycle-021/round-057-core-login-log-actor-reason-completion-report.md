# Round 57 Completion Report: core.login-log Structured Logout Actor/Reason

Date: 2026-06-13
Feature commit:
`a47182c feat(login-log): add structured logout actor reason / 新增退出日志操作者原因`
Deployment: API `39172`, Admin `39174`

## Capability

Round 57 replaces the temporary Round 51 `failureReason` overload for
successful force logout records with dedicated structured fields:
`actorUsername` and `reason`.

This keeps failed-login `failureReason` semantics clean while allowing
`logout.self` and `logout.force` rows to carry operator/reason context.

## Implemented

- Added Prisma `LoginLog.actorUsername` and `LoginLog.reason` plus migration.
- Extended seed upserts, audit records, DTOs, seed repository and Prisma
  repository with actor/reason read, write, filter and export support.
- Updated self logout to write the current user as `actorUsername` with
  `self logout` reason.
- Updated online-user force kick-out logging to write actor/reason directly
  and leave `failureReason` empty for successful force logout.
- Extended SDK types/client spec and OpenAPI snapshot.
- Added Admin Login Logs Actor server filter and Actor/Reason list, detail and
  export columns.
- Extended static Admin smoke plus fixed-port/deploy/public API smoke guards.
- Removed an unstable Prisma audit integration dependency on a fixed seed row.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public login-log smoke passed with
  `core.login-log.logout-self-actor-reason`.
- Public online-user smoke passed with
  `core.login-log.logout-force-actor-reason` and revoked-token rejection.
- Public Admin Login Logs chunk
  `p__Security__LoginLogs.02712a4e.async.js` contains `actorUsername`,
  `Login actor server filter`, `Actor` and `Reason`.

## Remaining Debt

- IP location enrichment where feasible.
- Broader mobile/SMS/social login logging if admitted.
- Session termination initiated from the Login Logs page remains a separate
  admission; explicit termination still belongs to Monitor Online Users.
