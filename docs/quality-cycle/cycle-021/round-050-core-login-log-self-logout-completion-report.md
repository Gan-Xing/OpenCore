# Round 50 Completion Report: core.login-log/security-auth Self Logout Revocation

## Scope

Round 50 closed the current-user self logout stage for login-log/security-auth.

This round delivered:

- `POST /api/auth/logout` with bearer auth and a `200` response;
- `SecurityAuthService.logout` that revokes the current bearer session by
  tokenId;
- `logout.self` login-log recording for successful self logout;
- Prisma/seed session repository support for tokenId revocation;
- SDK `rbac.logout(token)`;
- Admin avatar logout calling the backend logout API before clearing local
  token state;
- OpenAPI snapshot coverage for `/api/auth/logout`;
- fixed-port, deploy and public smoke proving the logged-out token is rejected
  by `/auth/me` and the `logout.self` row is recorded.

Out of scope: IP location enrichment, force-logout login-log integration,
mobile/SMS/social login logging and a Login Logs page action for terminating
sessions.

## Commits

- Feature commit:
  `f4ecd68 feat(auth): add self logout session revocation / 新增自助登出会话撤销`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.f9e7d7a1.js`
- Login page chunk: `p__user__login__index.b5055d16.async.js`

## Verification

- `pnpm nx test security`
- `pnpm nx test sdk`
- `pnpm nx test online-user`
- `pnpm nx test api`
- `pnpm nx test admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm nx typecheck api`
- `pnpm nx typecheck admin`
- `pnpm nx typecheck sdk`
- `pnpm nx typecheck security`
- `pnpm nx typecheck online-user`
- `pnpm smoke:api:local`
- `pnpm format:check`
- `pnpm lint`
- `pnpm deploy:opencore`

Local fixed-port smoke passed with:

- `auth.logout.self`
- `auth.logout.revokes-session`
- `core.login-log.logout-self-recorded`

Deploy smoke passed on fixed ports `39172`/`39174` with the same logout checks,
plus Admin duplicate-prefix login compatibility and public Admin bundle checks.

Public API login-log smoke passed with:

- `auth.logout.self`
- `auth.logout.revokes-session`
- `core.login-log.logout-self-recorded`

Public Admin verification passed with:

- main bundle using `http://144.217.243.161:39172`;
- main bundle containing `/auth/logout`;
- no API base with an extra `/api` suffix;
- deploy-script public login page and retired service-worker checks.

## Remaining Debt

- `core.login-log`: IP/location enrichment where feasible.
- `core.login-log`: force-logout login-log integration for operator kick-out.
- `core.login-log`: mobile/SMS/social login and logout variants if admitted.
- `monitor.online-user`: already revokes tokens for kick-out; any future link
  from login logs to terminate sessions should be admitted as a separate stage.
