# Round 28 Completion Report: core.user Self-profile Basic Info

Date: 2026-06-13
Feature commit: `7db10fe feat(core-user): add self-profile loop`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 28 closed the next `core.user` P1 productization gap: authenticated
self-profile read/update for the current user.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire user product as complete.

## Delivered

- Auth-only RBAC decorator and guard support for bearer-authenticated endpoints
  without unrelated management permissions.
- `/api/auth/me` now uses auth-only semantics.
- `GET /api/core/users/profile` for the current user.
- `PATCH /api/core/users/profile` for current-user `displayName` updates only.
- System user repository/service support for profile updates in seed and Prisma
  implementations.
- Management system-user protection remains enforced for
  `PATCH /api/core/users/:id`.
- SDK/OpenAPI/Admin updates for the self-profile surface.
- Admin `/personal/profile` page and Avatar menu entry.
- Fixed-port/deploy/public user smoke for profile read/update, `/auth/me`
  display-name refresh, invalid display-name 400, system-user management
  update rejection and cleanup restoration.

## Verification

- `node --check tools/scripts/smoke-core-user.mjs`
- `bash -n tools/scripts/run-local-api-smoke.sh tools/scripts/deploy-local-opencore.sh`
- `NX_DAEMON=false pnpm nx test security --runInBand --runTestsByPath packages/security/src/security-rbac/security-rbac.spec.ts`
- `NX_DAEMON=false pnpm nx test system --runInBand --runTestsByPath packages/system/src/system-user/system-user.spec.ts`
- `NX_DAEMON=false pnpm nx test sdk --runInBand --runTestsByPath packages/sdk/src/rbac-client.spec.ts`
- `NX_DAEMON=false pnpm nx test api --runInBand --runTestsByPath src/modules/core/rbac/rbac.permission-matrix.spec.ts`
- `pnpm test:admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm openapi:registry-tags:check`
- `pnpm sdk:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm prisma:validate`
- `pnpm format:check`
- `pnpm test`
- `pnpm build`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `pnpm smoke:core-user` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public user smoke verified profile get/update, `/auth/me` display-name
  refresh, invalid display-name 400 and system-user management update
  protection.
- `GET http://144.217.243.161:39174/personal/profile/` returned 200.
- Public main Admin bundle `umi.b3f9bcae.js` contains API origin
  `http://144.217.243.161:39172` and `/core/users/profile`, and no
  `/api/api/auth/login`.
- Public Profile chunk `p__Personal__Profile.7e74b02d.async.js` contains
  `Display name`, `Profile saved.` and `postCodes`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Remaining User Product Debt

- Avatar upload and preview.
- Self password update and possibly MFA/session review flows.
- Email/phone profile fields if admitted into the OpenCore user schema.
- User import/export file workflows.
- User simple-list option endpoint if a consumer workflow requires it.
- Batch user deletion and batch enable/disable with session revocation.
- Dedicated user-page role assignment dialog if admitted separately from the
  role-user assignment flow.
