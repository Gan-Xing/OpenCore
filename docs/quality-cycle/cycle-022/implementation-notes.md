# OpenCore Cycle-022 Implementation Notes

Date: 2026-06-23

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
- No tenant-owned Role/Dept/Post CRUD yet.
- No repository-wide tenant scoping beyond root membership bridge sync for single-mode compatibility.

## Round 3: T3a Membership-Scoped RBAC Authorization

### Completed

- Extended tenant membership auth records with optional:
  - `roleCodes`;
  - `postCodes`;
  - `permissionCodes`.
- Updated authenticated user construction:
  - active tenant sessions prefer membership role codes over legacy `UserRole`;
  - active tenant sessions expose membership post codes;
  - active tenant sessions prefer membership permission codes, falling back to legacy permissions only for seed/in-memory compatibility.
- Updated Prisma RBAC repository:
  - `listTenantMembershipsForUser()` now loads `TenantMembershipRole`, `TenantMembershipPost`, role permissions, and plan modules;
  - registry permissions are clipped by the active tenant plan's `TenantPlanModule.moduleCode` list;
  - custom non-registry permissions are preserved because no module contract exists for them.
- Updated data-scope resolution:
  - `SecurityDataScopeService` passes `activeMembership.id`;
  - Prisma RBAC repository resolves member dept and member role data scope when a membership id is present.
- Updated public contract:
  - Auth OpenAPI DTO includes `AuthenticatedUser.postCodes`;
  - SDK `AuthenticatedUser` includes `postCodes`.
- Added verification:
  - tenant RBAC guard;
  - tenant RBAC smoke;
  - Prisma integration test creates a temporary tenant plan with only `core.dashboard`, assigns admin membership role/post, and proves login exposes only `core:dashboard:read`.

### Verification Log

Passed before deploy:

- Tenant foundation/auth/RBAC guards, Prisma validation/generation/seed, OpenAPI/SDK drift checks, and typed smoke typecheck.
- Focused security and API RBAC tests, including the plan-clipping integration test.
- Full repository lint, typecheck, and test suites.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Local and public API smokes for tenant foundation, tenant auth, and tenant RBAC.
- Public Admin `/system/tenants` route and login tenant-code bundle check.

### Remaining Product Debt

- Complete T3 tenant-owned Role/Dept/Post CRUD and unique constraint rewrite.
- Complete T4 tenant-owned System/core data isolation.
- Complete T5 runtime propagation.
- Complete T6 live Tenant Plan/Member CRUD, Admin switcher, and platform visit audit.

### Deliberate Non-Goals

- No Tenant Plan CRUD API in T3a; plan-clipping is proven through repository integration tests because the control-plane CRUD surface is T6.
- No front-end tenant switcher yet.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.

## Round 4: T3b Tenant-Scoped Role Catalog

### Completed

- Added migration `20260623093000_tenant_scoped_roles`:
  - adds `Role.tenantId`;
  - backfills existing roles to `tenant_root`;
  - replaces global `Role.code` uniqueness with `(tenantId, code)`;
  - adds `(tenantId, id)` so membership role bindings can enforce role ownership;
  - changes `TenantMembershipRole(tenantId, roleId)` to reference `Role(tenantId, id)`.
- Updated Prisma schema:
  - `Tenant.roles`;
  - required `Role.tenant`;
  - tenant indexes and composite uniqueness.
- Updated Role repository:
  - resolves active tenant through `RequestContext`;
  - scopes role list/get/create/update/delete to the active tenant;
  - reports duplicate role codes per tenant.
- Updated root compatibility:
  - `SystemUser` legacy `UserRole` create/update/filter/assignment paths connect roles by `(tenant_root, code)`;
  - seed upserts roles by `(tenant_root, code)` and seeded users attach root roles only.
- Updated RBAC integration fixture:
  - non-root tenant authz tests now create tenant-owned `admin` roles instead of attaching root roles across tenants.
- Added verification:
  - tenant role scope guard;
  - tenant role smoke;
  - integration test proves the same role code can exist in root and a non-root tenant while resolving by request context.

### Verification Log

Passed before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- `pnpm prisma:seed:check`, `pnpm guard:tenant-role-scope`, `pnpm smoke:typed:check`.
- OpenAPI export and SDK contract check.
- Focused System Role, System User, and API RBAC integration tests.
- Tenant foundation/auth/RBAC/role guards.
- Full repository lint, typecheck, and test suites.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Local and public API smokes for tenant foundation, tenant auth, tenant RBAC, and tenant role scope.
- Public Admin route and bundle checks from the deploy script.

### Remaining Product Debt

- Complete tenant-owned Department and Post repositories plus code uniqueness rewrites.
- Add non-root Tenant Member role/post assignment APIs/Admin surface.
- Complete T4 System/core tenant data isolation.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- Complete T6 live Tenant Plan/Member CRUD, Admin switcher, and platform visit audit.

### Deliberate Non-Goals

- No Department/Post tenantization in T3b.
- No public Role DTO shape change; active tenant is derived from authenticated request context.
- No Tenant Plan CRUD or Member CRUD API in T3b.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.
