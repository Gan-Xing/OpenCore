# Round 47 Completion Report: core.login-log Login Lockout And Unlock

## Scope

Round 47 closed the username/password login lockout and unlock foundation for
`core.login-log` and `security-auth`.

This round delivered:

- persistent Prisma `LoginLockout` state;
- shared security lockout abstractions and auth-service enforcement;
- runtime policy consumption from `auth.login.lockoutMinutes`;
- `account_locked` login-log result support;
- permissioned `POST /api/core/login-logs/unlock`;
- SDK/Admin unlock action and manage permission wiring;
- fixed-port, deploy and public smoke coverage for lockout, unlock and
  restored login.

Out of scope: captcha, IP location enrichment, login-log delete/clean,
configurable failed-attempt threshold, logout logging, mobile/SMS/social login
flows and session termination from the login-log page.

## Commits

- Feature commit:
  `8295eb5 feat(login-log): add login lockout unlock flow / 新增登录锁定解锁闭环`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.8f59c62c.js`
- Login Logs chunk: `p__Security__LoginLogs.c1cd7a6e.async.js`

## Verification

- `pnpm prisma:generate`
- `pnpm prisma:migrate`
- `pnpm prisma:validate`
- `pnpm nx test security --testFile=security-auth.spec.ts`
- `pnpm nx test audit --testFile=audit-login-log.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test module-registry --testFile=index.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test api --testFile=auth.service.spec.ts`
- `pnpm nx test admin`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,security,audit,system,contracts,module-registry`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm lint`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

Public API smoke passed with:

- `auth.login-lockout.enforced`
- `core.login-log.account-locked-filter`
- `core.login-log.unlock-restores-login`

Public Admin verification passed with:

- no stale HTML cache on `/user/login`;
- main bundle using `http://144.217.243.161:39172`;
- no bundle-generated duplicate `/api/api/auth/login`;
- Login Logs chunk containing unlock UI and `account_locked` markers;
- same-origin `/api/core/login-logs/unlock` working through Admin proxy.

## Remaining Debt

- IP/location enrichment where feasible.
- Login-log delete/clean retention policy.
- Configurable failed-attempt threshold beyond the current fixed five-attempt
  baseline.
- Logout/mobile/SMS/social login logging.
- Session termination from the login-log page, if accepted as a future product
  stage.
