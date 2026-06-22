# OpenCore Cycle-022 Implementation Notes

Date: 2026-06-22

## Round 1: T1 Foundation Models and Root Tenant

### Completed

- Added Prisma models:
  - `TenantPlan`
  - `TenantPlanModule`
  - `Tenant`
  - `TenantMembership`
  - `TenantMembershipRole`
  - `TenantMembershipPost`
  - `PlatformRole`
  - `UserPlatformRole`
  - `PlatformRolePermission`
- Added migration `20260622223000_tenant_foundation`:
  - creates root `system.full` plan;
  - creates root tenant `tenant_root`;
  - creates root membership rows for existing users;
  - copies existing `UserRole` to `TenantMembershipRole`;
  - copies existing `UserPost` to `TenantMembershipPost`;
  - creates `platform-admin` role and binds existing `admin` user.
- Added repeatable `seedTenancy()`:
  - syncs root plan modules from module registry;
  - keeps root tenant and all current users backfilled;
  - assigns platform tenant permissions to `platform-admin`.
- Added module registry entries:
  - `core.tenant`
  - `core.tenant-plan`
  - `core.tenant-member`
- Added platform permission contract support:
  - `platform` layer;
  - `suspend` and `visit` actions;
  - targeted validator allowance for `core.tenant*` modules carrying `platform:*` permissions.
- Added API:
  - `GET /api/core/tenancy/foundation`
  - protected by `platform:tenant:read`
  - no body/query/header tenant selector.
- Added SDK:
  - `createTenancyClient`
  - `TenancyFoundationSummary` types.
- Added Admin:
  - `/system/tenants` read-only live page.
- Added verification:
  - tenant foundation guard
  - tenant foundation smoke

### Verification Log

Passed locally:

- Prisma schema validation, Client generation, migration deploy, and seed.
- Tenant foundation guard, route/access guard, i18n guard, SDK contract check, OpenAPI export/check, and registry tag check.
- Full repository lint, typecheck, and test suites.
- Refreshed deploy on API 39172 and Admin 39174.
- Tenant foundation smoke against local and public API.
- Public Admin `/system/tenants` route and tenant page bundle fetch.

### Remaining Product Debt

- T2 tenant-bound auth/session/request context.
- T3 tenant RBAC and org migration.
- T4 core tenant data isolation.
- T5 runtime propagation.
- T6 live Tenant Plan/Member control plane and platform visit audit.

### Deliberate Non-Goals

- No tenant CRUD.
- No front-end tenant switching.
- No rewrite of Role/Dept/Post/Dict/Config/File repositories yet.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.

## Round 2: T2 Tenant-Bound Auth, Session, and Request Context

### Completed

- Added migration `20260623003000_tenant_bound_sessions`:
  - adds nullable `tenantId` and `membershipId` to `OnlineUserSession`;
  - adds `accessMode` defaulting to `tenant`;
  - backfills existing online sessions when username maps to root membership.
- Extended auth token/session model:
  - access token payload now includes tenant id (`tid`), membership id (`mid`), and access mode (`am`);
  - login tickets are short-lived HMAC tokens used only for tenant selection;
  - session repository activation returns tenant context for mismatch checks.
- Extended authentication flow:
  - single active membership logs in directly;
  - multiple active memberships return `tenant_selection_required` and a login ticket;
  - `/api/auth/select-tenant` exchanges a ticket for a tenant-bound token;
  - `/api/auth/switch-tenant` reissues a tenant-bound token and revokes the old token.
- Extended request context:
  - `RequestContext` now supports `actorUserId`, `tenantId`, `membershipId`, and `accessMode`;
  - RBAC guards populate context only after bearer authentication succeeds.
- Preserved single-mode compatibility:
  - Prisma system-user repository syncs root tenant membership bridges after user create/update/status/role assignment;
  - seed resolves online-session membership by username for older databases whose admin id predates the stable seed id.
- Added public surface:
  - Auth OpenAPI DTOs for active tenant/membership, login result, select tenant, switch tenant;
  - SDK `LoginResult`, `selectTenant`, and `switchTenant`;
  - Admin login optional tenant code field.
- Added verification:
  - tenant auth guard;
  - tenant auth smoke;
  - tenant foundation summary now exposes token-derived request context for smoke verification.

### Verification Log

Passed locally before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- Tenant foundation/auth guards, seed typecheck, typed smoke typecheck, SDK contract check, route/access guard, OpenAPI export/drift/tag checks.
- Focused tests for security, SDK, API, online-user, and system packages.
- Focused typecheck for core, security, online-user, system, API, SDK, and Admin.
- The first affected test run exposed the expected local DB pre-migration state; after applying `20260623003000_tenant_bound_sessions`, the failed online-user integration suite passed.

Passed after deploy:

- Full repository lint, typecheck, and test suites.
- Refreshed deploy on API `39172` and Admin `39174`.
- Tenant foundation/auth smokes against local and public API.
- Public Admin tenant route and login bundle tenant-code check.

### Remaining Product Debt

- T3 tenant RBAC/org repository migration.
- T4 tenant-owned data isolation for System and core records.
- T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- T6 live Tenant Plan/Member CRUD, Admin switcher, and platform visit audit.

### Deliberate Non-Goals

- No tenant CRUD.
- No full Admin tenant switcher yet.
- No tenant-derived permission clipping yet; permissions still come from legacy `UserRole` until T3.
- No repository-wide tenant scoping beyond root membership bridge sync for single-mode compatibility.
