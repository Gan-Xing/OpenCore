# Round 51 Completion Report: core.login-log/monitor.online-user Forced Logout Logging

## Scope

Round 51 closed the explicit Monitor Online Users forced logout logging stage
for `core.login-log`.

This round delivered:

- explicit `logout.force` login-log rows after single online-user kick-out;
- explicit `logout.force` login-log rows after batch online-user kick-out;
- `OperationsModule` integration with `AuditLoginLogModule`;
- target session username/IP/user-agent captured on the forced logout row;
- actor/reason preserved on online-user `revokedBy/revokedReason`, with
  current login-log `failureReason` text carrying the same context until a
  future structured login-log schema is admitted;
- fixed-port, deploy and public smoke proving the kicked token returns 401 and
  the `logout.force` row is filterable;
- Admin static smoke locking Login Logs `logout.force` markers.

Out of scope: IP location enrichment, mobile/SMS/social login logging,
structured login-log actor/reason fields and a Login Logs page action for
terminating sessions. Internal RBAC/user session invalidation remains a
security side effect and is not logged as `logout.force`.

## Commits

- Feature commit:
  `bfd2454 feat(login-log): record forced logout entries / 记录强退登出日志`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.ae1b5b3e.js`
- Login Logs chunk: `p__Security__LoginLogs.1647b5aa.async.js`

## Verification

- `node --check tools/scripts/smoke-core-online-user.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test api --testFile=operations.permission-matrix.spec.ts`
- `pnpm nx test online-user`
- `pnpm nx test admin`
- `pnpm prisma:seed`
- `pnpm nx test audit`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx typecheck api`
- `pnpm nx typecheck audit`
- `pnpm nx typecheck admin`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm lint`
- `pnpm deploy:opencore`

Local fixed-port smoke passed with:

- `monitor.online-user.batch-kick-out`
- `core.login-log.logout-force-recorded`
- `monitor.online-user.revoked-token-rejected`
- `monitor.online-user.admin-session-preserved`

Deploy smoke passed on fixed ports `39172`/`39174` with the same online-user
forced logout checks, plus Admin same-origin login, duplicate-prefix login
compatibility and public Admin bundle checks.

Public API online-user smoke passed with:

- `monitor.online-user.batch-kick-out`
- `core.login-log.logout-force-recorded`
- `monitor.online-user.revoked-token-rejected`
- `monitor.online-user.repeat-kick-blocked`
- `monitor.online-user.admin-session-preserved`

Public Admin verification passed with:

- Login Logs chunk containing `logout.force`;
- Login Logs chunk containing `Forced logout`;
- main bundle using `http://144.217.243.161:39172`;
- no bundle-generated `/api/api/auth/login`.

## Remaining Debt

- `core.login-log`: IP/location enrichment where feasible.
- `core.login-log`: structured actor/reason fields for logout rows if
  admitted.
- `core.login-log`: mobile/SMS/social login and logout variants if admitted.
- `core.login-log`: Login Logs page session-termination workflow as a separate
  stage if productized.
