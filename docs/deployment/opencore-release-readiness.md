# OpenCore Release Readiness Gate

This gate freezes the current foundation platform as a releasable baseline. It
does not select a new productization loop or admit large domains. Tenant-owned
business domains must complete
[Business-Domain Admission](../development/business-domain-admission-template.md)
before implementation; the gate only proves admitted scope.

## Command

```bash
pnpm release:gate
```

The gate requires a clean git worktree by default. During script development
only, bypass with:

```bash
OPENCORE_RELEASE_GATE_ALLOW_DIRTY=true pnpm release:gate
```

## What It Proves

`pnpm release:gate` runs these checks in order:

1. clean worktree check
2. env file check
3. `pnpm format:check`
4. `pnpm prisma:validate`
5. `pnpm lint`
6. `pnpm typecheck`
7. `pnpm test`
8. SDK drift check
9. OpenAPI registry tag check
10. OpenAPI drift check
11. Admin route/access check
12. seven-page Admin fallback closure guard
13. tenant platform guards, including auth, RBAC, control-plane, runtime
    isolation, cross-domain scope guards, platform visit and business-domain
    admission
14. full build
15. fixed-port local API smoke
16. fixed-port deployment through `pnpm deploy:opencore`
17. public API/Admin/default-account smoke

The public smoke verifies:

- `GET /health/live`
- `GET /health/ready`
- public Admin root HTML
- `POST /api/auth/login` with the smoke admin account
- `GET /api/auth/me` with the returned bearer token
- required admin role and permission codes
- `POST /api/auth/logout`

The script does not print passwords, bearer tokens, database URLs, Redis URLs,
S3 keys or other secrets.

## Fixed Public Targets

Defaults:

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`

Overrides:

```bash
OPENCORE_RELEASE_PUBLIC_HOST=144.217.243.161
OPENCORE_RELEASE_PUBLIC_API_BASE_URL=http://144.217.243.161:39172
OPENCORE_RELEASE_PUBLIC_ADMIN_BASE_URL=http://144.217.243.161:39174
OPENCORE_SMOKE_ADMIN_USERNAME=admin
OPENCORE_SMOKE_ADMIN_PASSWORD=...
OPENCORE_RELEASE_REQUIRED_ROLE_CODES=admin
OPENCORE_RELEASE_REQUIRED_PERMISSION_CODES=core:dashboard:read,core:user:read,core:role:read
```

## Rollback

Application rollback is code-first:

1. revert the bad commit or reset the release branch through normal git review
   policy
2. run `pnpm release:gate` again
3. verify the public API/Admin URLs

Database migrations are forward-only in this local-server release path. Before
an irreversible schema or data migration, take an infrastructure backup of
PostgreSQL, Redis and object storage outside this repository. Do not treat the
release gate as a database backup tool.

## Runtime Evidence

Deployment runtime files stay under `.opencore/run/`:

- `.opencore/run/opencore-api.pid`
- `.opencore/run/opencore-admin.pid`
- `.opencore/run/opencore-api.log`
- `.opencore/run/opencore-admin.log`

Operational smoke after release should start with public `/health/live`,
public `/health/ready`, the Admin URL, Monitor Status, Login Logs and Operation
Logs.
