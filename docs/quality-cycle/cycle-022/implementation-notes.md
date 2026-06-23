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

## Round 5: T3c Tenant-Scoped Post Catalog

### Completed

- Added migration `20260623113000_tenant_scoped_posts`:
  - adds `SystemPost.tenantId`;
  - backfills existing posts to `tenant_root`;
  - replaces global `SystemPost.code` uniqueness with `(tenantId, code)`;
  - adds `(tenantId, id)` so membership post bindings can enforce post ownership;
  - changes `TenantMembershipPost(tenantId, postId)` to reference `SystemPost(tenantId, id)`.
- Updated Prisma schema:
  - `Tenant.posts`;
  - required `SystemPost.tenant`;
  - tenant indexes and composite uniqueness.
- Updated Post repository:
  - resolves active tenant through `RequestContext`;
  - scopes post list/options/get/create/update/delete/batch-delete/order updates to the active tenant;
  - reports duplicate post codes per tenant.
- Updated root compatibility:
  - `SystemUser` legacy `UserPost` create/update/filter paths connect posts by `(tenant_root, code)`;
  - seed upserts posts by `(tenant_root, code)` and seeded users attach root posts only.
- Updated RBAC integration fixture:
  - non-root tenant authz tests now create tenant-owned `engineer` posts instead of attaching root posts across tenants.
- Added verification:
  - tenant post scope guard;
  - tenant post smoke alias;
  - integration test proves the same post code can exist in root and a non-root tenant while resolving by request context.

### Verification Log

Passed before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- `pnpm prisma:seed:check`, tenant foundation/auth/RBAC/role/post guards, and typed smoke typecheck.
- OpenAPI export/check and SDK contract check.
- Focused System Post, System User, and API RBAC integration tests.
- Full repository lint, typecheck, and test suites.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Local and public API smokes for tenant foundation, tenant auth, tenant RBAC, tenant role scope, and tenant post scope.
- Public Admin route and bundle checks from the deploy script.

### Remaining Product Debt

- Complete tenant-owned Department repository plus tree/code uniqueness rewrite.
- Add non-root Tenant Member role/post assignment APIs/Admin surface.
- Complete T4 System/core tenant data isolation.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- Complete T6 live Tenant Plan/Member CRUD, Admin switcher, and platform visit audit.

### Deliberate Non-Goals

- No Department tenantization in T3c.
- No public Post DTO shape change; active tenant is derived from authenticated request context.
- No Tenant Plan CRUD or Member CRUD API in T3c.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.

## Round 6: T3d Tenant-Scoped Department Catalog

### Completed

- Added migration `20260623143000_tenant_scoped_departments`:
  - adds `SystemDept.tenantId`;
  - backfills existing departments to `tenant_root`;
  - replaces global `SystemDept.code` uniqueness with `(tenantId, code)`;
  - adds `(tenantId, id)` for same-tenant FK enforcement;
  - adds `SystemDept(tenantId, parentId)` same-tenant parent enforcement;
  - adds `TenantMembership(tenantId, deptId)` same-tenant membership department enforcement.
- Updated Prisma schema:
  - `Tenant.depts`;
  - required `SystemDept.tenant`;
  - tenant indexes and composite uniqueness.
- Updated Department repository:
  - resolves active tenant through `RequestContext`;
  - scopes department tree/options/get/create/update/order/delete operations to the active tenant;
  - rejects cross-tenant parents because parent lookup uses the same tenant context;
  - treats tenant memberships as department assignments when guarding delete.
- Updated root compatibility:
  - `SystemUser` legacy `User.deptId` validation and subtree filters stay pinned to `tenant_root`;
  - seed upserts root departments by `(tenant_root, code)`;
  - seeded users validate department ids in the root tenant only.
- Updated RBAC/data scope:
  - Role custom data-scope department validation is active-tenant scoped;
  - Prisma RBAC descendant department lookup uses the active request tenant, falling back to `tenant_root`.
- Updated RBAC integration fixture:
  - non-root tenant authz tests now create a tenant-owned `operations` department instead of binding the membership to a root department.
- Added verification:
  - tenant department scope guard;
  - tenant department smoke alias;
  - integration test proves the same department code can exist in root and a non-root tenant while tree/options/detail resolve by request context.

### Verification Log

Passed before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- `pnpm prisma:seed:check`, tenant foundation/auth/RBAC/role/post/dept guards, and typed smoke typecheck.
- OpenAPI export/check and SDK contract check.
- Direct System Department, System User, System Role, and API RBAC integration specs.
- Full repository lint, typecheck, and test suites.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Local and public API smokes for tenant foundation, tenant auth, tenant RBAC, tenant role scope, tenant post scope, and tenant department scope.
- Public Admin route and bundle checks from the deploy script.

### Remaining Product Debt

- Add non-root Tenant Member role/post/department assignment APIs/Admin surface.
- Complete T4 System/core tenant data isolation for dict, config, notice, file, logs, and online sessions.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- Complete T6 live Tenant Plan/Member CRUD, Admin switcher, and platform visit audit.

### Deliberate Non-Goals

- No Tenant Member CRUD or assignment API in T3d.
- No public Department DTO shape change; active tenant is derived from authenticated request context.
- No Tenant Plan CRUD API in T3d.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.

## Round 7: T3e Active-Tenant Member Assignment

### Completed

- Added active-tenant member APIs:
  - `GET /api/core/tenancy/members`;
  - `PATCH /api/core/tenancy/members/:membershipId/assignments`.
- Kept tenant selection server-side:
  - controller accepts no tenant query/header selector;
  - assignment body has `deptId`, `status`, `roleCodes`, and `postCodes` only;
  - service resolves tenant from `RequestContext`, falling back to `tenant_root` for single-mode compatibility.
- Added assignment validation:
  - membership must belong to the active tenant;
  - department must belong to the active tenant when set;
  - role codes must resolve in the active tenant;
  - post codes must resolve in the active tenant;
  - duplicate role/post codes are rejected.
- Added root bridge sync:
  - root member status syncs to `User.enabled`;
  - root member department syncs to `User.deptId`;
  - root member roles/posts sync to legacy `UserRole` and `UserPost`.
- Updated OpenAPI/SDK/Admin:
  - `TenantMemberDto` and `UpdateTenantMemberAssignmentsDto`;
  - SDK `TenancyClient.listMembers()` and `updateMemberAssignments()`;
  - `/system/tenants` now shows current-tenant members and edits status, department, roles, and posts from live APIs.
- Added verification:
  - integration spec for active-tenant assignment and cross-tenant role rejection;
  - `guard:tenant-member-assignment`;
  - `smoke:core-tenant-member`;
  - local/deploy smoke script wiring.

### Verification Log

Passed before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- `pnpm prisma:seed:check`, tenant foundation/auth/RBAC/role/post/dept/member guards, and typed smoke/script typechecks.
- OpenAPI export/check, registry tag check, and SDK contract check.
- API tenant service integration spec; full repository lint, typecheck, and test suites.
- Local API smoke script, including `core.tenant-member.list`, `core.tenant-member.update`, body `tenantId` ignore check, and root legacy bridge check.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Deploy smoke list, including public Admin UI checks and deployed API tenant member smoke.
- Public API tenant smokes for foundation, auth, RBAC, role, post, department, and member after sourcing `.env.opencore.local`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for dict, config, notice, file, audit/login logs, online sessions, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- Complete T6 live Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No new Prisma migration in T3e; required tenant-owned membership/role/post/dept relations already existed from T1 and T3b-T3d.
- No Tenant Member creation/invitation/deletion API in T3e.
- No client-driven tenant switch or body/query/header tenant selector.
- No Redis/file/queue/WebSocket/Integration tenant propagation yet.

## Round 8: T4a Online-Session Tenant Isolation

### Completed

- Scoped persisted monitor online-session operations:
  - list, detail, summary, expired cleanup, single kick-out, and batch kick-out resolve the active tenant from `RequestContext`;
  - missing context falls back to `tenant_root` for single-mode compatibility.
- Kept auth paths token-scoped:
  - session registration;
  - bearer token validation and `lastSeenAt` refresh;
  - direct token revocation.
- Added tenant-scope verification:
  - Prisma integration test creates a foreign tenant session and proves root context cannot list, detail, kick, or clean it;
  - `smoke:core-online-user` seeds a foreign tenant session through Prisma and exercises the public API.
- Updated seed/SDK/Admin:
  - source online-session seed and SDK fixture now include root tenant fields for `session_operator`;
  - Admin Online Users exposes access mode, tenant id, and membership id in search/export/detail/table surfaces.
- Added `guard:tenant-online-user-scope` and kept existing local/deploy smoke wiring for `smoke-core-online-user.ts`.

### Verification Log

Passed before deploy:

- Prisma schema validation, client generation, migration deploy, and seed.
- `pnpm prisma:seed:check`, tenant foundation/auth/RBAC/role/post/dept/member/online-user guards, and typed smoke/script typechecks.
- OpenAPI export/check, registry tag check, and SDK contract check.
- Online-user package integration spec; full repository lint, typecheck, and test suites.
- Local API smoke script, including foreign-tenant online-session hidden/detail/kick/cleanup checks.

Passed after deploy:

- Refreshed deploy on API `39172` and Admin `39174`.
- Deploy smoke list, including public Admin UI checks and deployed API online-user smoke.
- Public API tenant smokes for foundation, auth, RBAC, role, post, department, member, and online-user after sourcing `.env.opencore.local`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for dict, config, notice, file, audit/login logs, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/audit runtime propagation.
- Complete T6 live Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No Prisma migration in T4a; `OnlineUserSession.tenantId` already existed from T2.
- No body/query/header tenant selector for online-user monitor APIs.
- No platform-admin global online-session view; that belongs with T6 platform visit/control plane.
- No dict/config/notice/file/log tenant isolation in this sub-slice.

## Round 9: T4b Login-Log Tenant Isolation

### Completed

- Made login logs tenant-owned:
  - added `LoginLog.tenantId` with root backfill, required default, tenant/date indexes, and tenant FK;
  - exposed `tenantId` through audit records, DTO, OpenAPI, SDK summary, seed, and Admin Login Logs.
- Scoped Prisma login-log operations:
  - list/detail/export/delete/clean resolve the active tenant from `RequestContext`;
  - missing context falls back to `tenant_root` for single-mode compatibility.
- Scoped new records:
  - login attempt records accept optional `tenantId`;
  - successful login/social/logout records pass the selected session tenant when available;
  - public failed login attempts keep root fallback because they may not have a trusted tenant context.
- Added tenant-scope verification:
  - Prisma integration test records root and foreign tenant logs and proves root context cannot list, detail, delete, or clean foreign logs;
  - `smoke:core-login-log` seeds a foreign tenant login log and exercises the public API.
- Added `guard:tenant-login-log-scope`.

### Verification Log

Passed before deploy:

- `pnpm prisma:validate`, `pnpm prisma:generate`, and `pnpm prisma:migrate`.
- Focused security auth spec and audit login-log spec.
- `pnpm prisma:seed:check`, `pnpm smoke:typed:check`, OpenAPI export/check, registry tag check, and SDK contract check.
- All tenant guards including `pnpm guard:tenant-login-log-scope`.
- Full `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- `pnpm smoke:api:local`, including foreign-tenant login-log hidden/detail/delete/clean checks.

Passed after deploy:

- `pnpm deploy:local` rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke.
- Public API login-log smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for dict, config, notice, file, operation audit logs, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/runtime tenant propagation.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and tenant operation audit.

### Deliberate Non-Goals

- No platform-admin global login-log view in T4b; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for login-log APIs.
- No operation-audit tenant isolation in this sub-slice.
