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

## Round 10: T4c Operation-Audit Tenant Isolation

### Completed

- Made operation audit logs tenant-owned:
  - added `AuditLog.tenantId` with root backfill, required default, tenant/date/resource indexes, and tenant FK;
  - exposed `tenantId` through audit records, DTO, OpenAPI, SDK summary, seed, and Admin Operation Logs.
- Scoped Prisma operation-audit operations:
  - list/detail/export/delete/retention clean resolve the active tenant from `RequestContext`;
  - missing context falls back to `tenant_root` for single-mode compatibility.
- Scoped new write audit records:
  - `recordOperation()` accepts optional `tenantId`;
  - interceptor-created records use repository fallback to store under the active request tenant.
- Added tenant-scope verification:
  - Prisma integration test records root and foreign tenant audit logs and proves root context cannot list, detail, delete, or retention-clean foreign logs;
  - `smoke:core-audit-log` seeds a foreign tenant audit log and exercises the public API.
- Added `guard:tenant-operation-log-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed passed.
- Seed typecheck, typed-smoke typecheck, OpenAPI export/drift, registry tag, and SDK checks passed.
- Tenant operation-log, login-log, and online-user guard scripts passed.
- Focused audit operation-log spec plus full lint/typecheck/test passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local operation-audit tenant checks.
- Public API operation-audit smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for dict, config, notice, file, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/runtime tenant propagation.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global operation-log view in T4c; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for operation-log APIs.
- No dict/config/notice/file tenant isolation in this sub-slice.

## Round 11: T4d Dictionary Tenant Isolation

### Completed

- Made dictionaries tenant-owned:
  - added `DictType.tenantId` with root backfill, required default, tenant/code uniqueness, tenant/date indexes, and tenant FK;
  - exposed `tenantId` through dictionary records, DTOs, SDK summaries, seed, export previews, and Admin Dicts.
- Scoped Prisma dictionary operations:
  - type and item list/detail/export/create/update/delete/recycle operations resolve the active tenant from `RequestContext`;
  - import, translation, cache refresh, and public simple-list use the same repository tenant boundary with `tenant_root` fallback.
- Added tenant-scope verification:
  - Prisma integration test creates the same dictionary code in root and a foreign tenant and proves root context cannot read, mutate, translate, restore, or hard-delete foreign rows;
  - `smoke:core-dict` seeds a foreign tenant dictionary and exercises the public API.
- Added `guard:tenant-dict-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed passed.
- Seed typecheck, typed-smoke typecheck, OpenAPI export/drift, registry tag, and SDK checks passed.
- Tenant dictionary, operation-log, login-log, and online-user guard scripts passed.
- Focused system-dict spec plus full lint/typecheck/test passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local dictionary tenant checks.
- Public API dictionary smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for config, notice, file, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/runtime tenant propagation.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global dictionary view in T4d; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for dictionary APIs.
- No config/notice/file tenant isolation in this sub-slice.

## Round 12: T4e System Config Tenant Isolation

### Completed

- Made system config tenant-owned:
  - added `SystemConfig.tenantId` with root backfill, tenant/key uniqueness, tenant/category index, and tenant FK;
  - added tenant ownership to environment overrides and secret versions with same-tenant config FKs and tenant-aware uniqueness;
  - exposed `tenantId` through config records, DTOs, SDK summaries, seed, export previews, and Admin Config.
- Scoped Prisma config operations:
  - config list/detail/export/create/update/delete/batch, value lookup, runtime reads, cache refresh, environment overrides, secret versions, and vault status/rotation resolve the active tenant from `RequestContext`;
  - `SystemConfigService` value-cache keys include tenant id to prevent same-key tenant cache bleed.
- Added tenant-scope verification:
  - Prisma integration test creates the same config key in root and a foreign tenant and proves root context cannot read, mutate, override, or rotate foreign rows;
  - `smoke:core-config` seeds a foreign tenant config/override/secret version and exercises the public API.
- Added `guard:tenant-config-scope`.

### Verification Log

Passed before deploy:

- `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm prisma:migrate`, and `pnpm prisma:seed`.
- Seed and typed-smoke typechecks plus OpenAPI export/drift, registry tag, SDK, and quality-doc checks passed.
- Tenant config, dictionary, operation-log, login-log, and online-user guard scripts passed.
- Focused system-config spec plus full repository lint, typecheck, and test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local config tenant checks.
- Public API config smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for notices, files, and related core tables.
- Complete T5 Redis/file/queue/WebSocket/Integration/OAuth/runtime tenant propagation.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global config view in T4e; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for config APIs.
- No notice/file tenant isolation in this sub-slice.

## Round 13: T4f File Asset Tenant Isolation

### Completed

- Made file assets tenant-owned:
  - added `FileAsset.tenantId` with root backfill, tenant/storage-key uniqueness, tenant/date index, and tenant FK;
  - exposed `tenantId` through file records, DTOs, SDK summaries, seed, export previews, and Admin Files.
- Scoped Prisma file asset operations:
  - list/detail/export/create/update/delete resolve the active tenant from `RequestContext`;
  - missing context falls back to `tenant_root` for single-mode compatibility.
- Tenant-scoped object keys:
  - new system file assets are stored under `runtime/tenant/<tenantId>/file-assets/...`;
  - upload/download/delete use the repository-returned storage key, so metadata scoping and object access share the same tenant boundary.
- Added tenant-scope verification:
  - Prisma integration test creates a foreign tenant file row and proves root context cannot read or list it;
  - `smoke:core-file` seeds a foreign tenant file metadata row and exercises list/detail/download/update/delete/export through the public API.
- Added `guard:tenant-file-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed.
- Seed and typed-smoke typechecks plus OpenAPI export/drift, registry tag, SDK, quality-doc, and tenant file guard checks.
- Focused system-management file spec plus full repository lint, typecheck, and test suites.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local file tenant checks.
- Public API file smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for notices and related unreviewed core tables.
- Complete T5 Redis/queue/WebSocket/Integration/OAuth/runtime tenant propagation and broader file runtime review.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global file asset view in T4f; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for file APIs.
- No notice tenant isolation in this sub-slice.

## Round 14: T4g System Notice Tenant Isolation

### Completed

- Made notices tenant-owned:
  - added `SystemNotice.tenantId` with root backfill, tenant/status/type and tenant/audience/pinned indexes, and a tenant FK;
  - added tenant ownership to `SystemNoticeTemplate`, `SystemNoticeReadReceipt`, and `SystemNoticeDelivery` with tenant-aware uniqueness and same-tenant child FKs.
- Scoped Prisma notice operations:
  - notice list/detail/create/update/publish/archive/delete resolve the active tenant from `RequestContext`;
  - inbox, unread count/list, read receipts, read-user listing, delivery listing/execution, template CRUD/render/create-notice/test-send, and export preview metadata are tenant-scoped;
  - dispatch recipients come from active memberships in the notice tenant.
- Exposed `tenantId` through notice records, DTOs, SDK summaries/fixtures, Admin Notices fields, seed data, and export previews.
- Added tenant-scope verification:
  - Prisma integration test creates root and foreign tenant notices/templates and proves root context cannot read inbox/delivery/template rows from the foreign tenant;
  - `smoke:core-notice` seeds a foreign tenant notice/template/delivery/receipt fixture and exercises root-scope public API isolation.
- Added `guard:tenant-notice-scope`.

### Verification Log

Passed before deploy:

- `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm prisma:migrate`, and `pnpm prisma:seed`.
- Seed and typed-smoke typechecks plus OpenAPI export/drift, registry tag, SDK, Admin i18n, quality-doc, API error-code, and tenant notice guard checks.
- Focused `system-notice` spec plus full repository lint, typecheck, and test suites.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local notice tenant checks.
- Public API notice smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T5 Redis/queue/WebSocket/Integration/OAuth/runtime tenant propagation and broader file/runtime review.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global notice view in T4g; platform visit/control-plane behavior belongs with T6.
- No client-driven tenant selector for notice APIs.
- No Redis/WebSocket/outbox tenant propagation beyond notice payload metadata in this sub-slice.

## Round 15: T5a Scheduler Tenant Propagation

### Completed

- Made scheduler rows tenant-owned:
  - added `JobDefinition.tenantId` and `JobRunLog.tenantId` with root backfill, `(tenantId, code)` uniqueness, tenant indexes, tenant FKs, and a same-tenant run-to-job FK;
  - seeded scheduler definitions and run logs under `tenant_root` for single/shared-root compatibility.
- Scoped scheduler runtime operations:
  - monitor job summary/list/detail/create/update/enable/disable/manual trigger/cron dispatch/worker claim/run list/run detail/run clean resolve the active tenant from `RequestContext`;
  - queued worker execution restores tenant request context before invoking handlers and stamps run metadata with `tenantId`;
  - audit-log retention deletes only audit rows belonging to the scheduler run tenant.
- Exposed `tenantId` through scheduler records, DTOs, SDK summaries/fixtures, OpenAPI, Admin Jobs, seed, and smoke.
- Added tenant-scope verification:
  - Scheduler Prisma integration test creates root and foreign jobs with the same code and proves root worker claim cannot consume the foreign queued run;
  - `smoke:core-monitor-jobs` seeds a foreign tenant scheduler job/run and proves root-scope monitor job APIs and worker claim stay inside `tenant_root`.
- Added `guard:tenant-scheduler-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed passed.
- Seed typing, typed smoke compilation, tenant scheduler guard, focused scheduler tests, OpenAPI drift/registry checks, SDK contract, Admin i18n, quality docs, full lint, full typecheck, and full test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local monitor-jobs tenant checks.
- Public API monitor-jobs smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete Redis namespace, broader BullMQ queue namespace/payload handling, WebSocket, Integration/outbox/OAuth, and broader runtime tenant propagation.
- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No Redis key namespace or BullMQ queue-name namespace rewrite in T5a.
- No Integration provider/outbox/OAuth/WebSocket tenant migration in this sub-slice.
- No platform-admin global scheduler view; platform visit/control-plane behavior belongs with T6.

## Round 16: T5b Redis Cache Tenant Namespace

### Completed

- Added tenant-aware Redis key helpers:
  - `createTenantRedisKey`/`createTenantRedisKeyFactory` build `tenant:{tenantId}` Redis namespaces;
  - `RedisService.tenantKey()` exposes the same helper to runtime modules.
- Scoped monitor cache operations:
  - cache summary/list/name/value/delete/clear resolve the active tenant from `RequestContext`;
  - Redis scans always run under `tenant:{tenantId}` and never scan the raw global Redis keyspace;
  - full foreign tenant keys passed through query/body are normalized into the current tenant namespace, so they behave as misses and do not read/delete foreign keys.
- Exposed `tenantId` through cache key/name DTOs, SDK summaries/fixtures, OpenAPI, and Admin Cache key/name tables.
- Added tenant-scope verification:
  - Operations repository test seeds root and foreign Redis keys and proves root context cannot read/delete/clear the foreign key while the foreign context can still read it;
  - `smoke:core-monitor-jobs` seeds a foreign tenant Redis key and proves root-scope monitor cache APIs hide and preserve it.
- Added `guard:tenant-redis-scope`.

### Verification Log

Passed before deploy:

- Focused Redis package test and focused operations repository test passed.
- Tenant Redis guard, typed smoke compilation, SDK contract, Admin i18n, quality docs, OpenAPI export/drift, and registry tag checks passed.
- Full repository typecheck, lint, and test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local monitor-jobs cache tenant checks.
- Public API monitor-jobs smoke passed against `http://144.217.243.161:39172` with `monitor.cache.foreign-tenant-hidden`.

### Remaining Product Debt

- Complete broader BullMQ queue namespace/payload handling, WebSocket, Integration/outbox/OAuth, and broader runtime tenant propagation.
- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global Redis cache browser in T5b; platform visit/control-plane behavior belongs with T6.
- No BullMQ queue-name namespace rewrite in T5b.
- No Integration provider/outbox/OAuth/WebSocket tenant migration in this sub-slice.

## Round 17: T5c WebSocket Runtime Tenant Scope

### Completed

- Made WebSocket runtime events tenant-owned:
  - added `IntegrationWebSocketRuntimeEvent.tenantId` with root default, tenant FK, and tenant-leading room/type/created indexes;
  - exposed `tenantId` through WebSocket runtime connection, subscription, and event DTOs plus SDK summaries.
- Scoped WebSocket runtime operations:
  - diagnostics resolve `RequestContext.tenantId` and return only live/persisted records for the active tenant;
  - SSE subscriptions normalize rooms to `tenant:{tenantId}:integration.*`;
  - diagnostic publishes ignore client-supplied `tenant:*:` prefixes and rewrite rooms to the active tenant namespace before delivery/persistence.
- Added tenant-scope verification:
  - seed repository test checks root tenant rooms/events and forged foreign room rewrites;
  - Prisma integration test creates a foreign tenant and proves root and foreign diagnostics cannot see each other’s persisted runtime events;
  - `smoke:integration-designs` checks root tenant room metadata and public API foreign-prefix rewrite behavior.
- Added `guard:tenant-websocket-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed passed.
- Focused seed and Prisma integration repository tests passed.
- Tenant WebSocket guard, typed smoke compilation, SDK contract, Admin i18n, quality docs, OpenAPI export/drift, and registry tag checks passed.
- Full repository typecheck, lint, and test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local `integration.websocket-runtime.tenant-room`.
- Public API integration-designs smoke passed against `http://144.217.243.161:39172` with `integration.websocket-runtime.tenant-room`.

### Remaining Product Debt

- Complete broader BullMQ queue namespace/payload handling, Integration/outbox/OAuth tenant propagation, and broader runtime review.
- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No general-purpose application WebSocket channel implementation in T5c; this slice only scopes the existing integration diagnostics runtime.
- No Integration provider/outbox/OAuth tenant migration in this sub-slice.
- No platform-admin global WebSocket diagnostics view; platform visit/control-plane behavior belongs with T6.

## Round 18: T5d BullMQ Monitor Queue Tenant Namespace

### Completed

- Scoped monitor BullMQ tenant namespaces:
  - queue diagnostics keep logical BullMQ names (`maintenance`, `reports`) and use a tenant-specific Redis prefix from the active request tenant;
  - public API queue names remain logical while responses expose `tenantId` and `runtimeName` such as `tenant:{tenantId}:{queue}`;
  - queue pause/resume accepts legacy logical names and rewrites any client-supplied `tenant:*:` prefix into the active tenant namespace.
- Exposed `tenantId` and `runtimeName` through monitor queue DTOs, SDK summaries/fixtures, OpenAPI, and smoke.
- Added tenant-scope verification:
  - monitor package and API monitoring tests assert tenant runtime queue metadata and foreign-prefix rewrite behavior;
  - `smoke:core-monitor-jobs` checks root tenant queue runtime names and foreign-prefix normalization.
- Added `guard:tenant-queue-scope`.

### Verification Log

Passed before deploy:

- Focused monitor package and API monitoring tests passed.
- Tenant queue guard, typed smoke compilation, SDK contract, OpenAPI export/drift, registry tag, and quality docs checks passed.
- Full repository typecheck, lint, and test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local `monitor.queue.tenant-runtime-name`.
- Public API monitor jobs smoke passed against `http://144.217.243.161:39172` with `monitor.queue.tenant-runtime-name`.

### Remaining Product Debt

- Complete Integration/outbox/OAuth tenant propagation and broader runtime review.
- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No new BullMQ worker/enqueue implementation in T5d; this slice scopes the existing monitor queue probe/control runtime.
- No scheduler job definition field rename; public queue filters remain logical names.
- No Integration provider/outbox/OAuth tenant migration in this sub-slice.

## Round 19: T5e Integration Provider/Outbox/OAuth Tenant Scope

### Completed

- Made Integration persistent runtime tables tenant-owned:
  - added `tenantId` to Integration providers, provider audit logs, templates, outbox messages, OAuth tokens, OAuth flows, and OAuth callback audits;
  - replaced global provider/template code uniqueness with tenant-local `(tenantId, code)` uniqueness;
  - replaced OAuth token uniqueness with `(tenantId, providerCode, subjectId, providerAccountId)`.
- Scoped Prisma Integration repository operations:
  - provider, template, outbox, OAuth list/detail/mutation paths resolve active tenant from request context;
  - provider diagnostics and health audit only read active-tenant outbox rows;
  - outbox-to-notice delivery sync includes `tenantId` in the delivery update predicate;
  - OAuth callbacks use the globally unique flow `state` to recover the flow tenant before provider validation, token upsert, flow update, and callback audit creation.
- Exposed `tenantId` through Integration provider, provider audit, template, outbox, OAuth flow, OAuth callback audit, and OAuth token DTOs plus SDK summaries/fixtures.
- Added tenant-scope verification:
  - Prisma integration test creates root and foreign Integration rows with duplicate provider/template/OAuth identities and proves root cannot see foreign outbox/token data;
  - callback test proves a root-context callback for a foreign flow writes OAuth token/audit rows into the flow tenant;
  - Integration health and OAuth smokes check tenant fields, foreign-row hiding, forged `tenant-id` header resistance, and foreign row preservation.
- Added `guard:tenant-integration-scope`.

### Verification Log

Passed before deploy:

- Prisma validation, client generation, migration deploy, and seed/seed typecheck passed.
- Focused Integration repository tests passed, including tenant-scoped Prisma and in-memory repositories.
- T5e tenant Integration guard, typed smoke compilation, SDK contract, OpenAPI export/drift, registry tag, quality docs, full typecheck, full lint, and full test suites passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, applied migrations, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Integration health/OAuth tenant checks.
- Public API Integration health and OAuth token smokes passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete broader runtime tenant propagation review.
- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.

### Deliberate Non-Goals

- No platform-admin global Integration control-plane view in T5e; platform visit/control-plane behavior belongs with T6.
- No real external provider credential exchange/storage implementation beyond the existing callback/token-reference simulation.
- No business-domain Integration workflows beyond the existing mail/SMS/OAuth/WebSocket surfaces.

## Round 20: T5f Runtime Parity Audit

### Completed

- Audited the remaining runtime tenant propagation surfaces after T5a-T5e:
  - Redis monitor cache access;
  - File/object storage helpers and explicit global user-avatar storage;
  - BullMQ monitor queue probes/control;
  - Scheduler queue dispatch and worker claim;
  - Integration provider/outbox/OAuth and WebSocket runtime paths.
- Fixed the remaining parity gap in the seed monitor operations repository:
  - seed cache list/value/clear/delete paths now resolve active tenant from `RequestContext`;
  - logical cache keys and prefixes are normalized into `opencore:tenant:{tenantId}:...`;
  - root seed cache calls cannot read or delete foreign tenant cache fixtures.
- Added a foreign seed cache fixture and focused repository assertions for root-hidden/foreign-visible cache behavior.
- Extended `guard:tenant-redis-scope` to cover seed repository tenant normalization and the foreign seed cache fixture.

### Verification Log

Passed before deploy:

- Focused monitor operations repository test covered root-hidden/foreign-visible seed cache behavior.
- Redis tenant-scope guard, quality docs check, full typecheck, lint, and test suite passed.

Passed after deploy:

- OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including monitor cache tenant checks.
- Public API `smoke:core-monitor-jobs` passed against `http://144.217.243.161:39172`, including `monitor.cache.foreign-tenant-hidden` and `monitor.queue.tenant-runtime-name`.

### Remaining Product Debt

- Complete T4 System/core tenant data isolation for other unreviewed non-org data.
- Complete T6 Tenant Plan CRUD, Tenant Member CRUD/invitation, Admin switcher, platform visit mode, and platform visit audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No new production Redis namespace abstraction in T5f; T5b already added the runtime helper and this round closes seed parity.
- No tenantization of Collaboration/Report optional data in T5f; those belong to T7.
- No platform-admin visit mode or cross-tenant control-plane behavior in T5f; that belongs to T6.

## Round 21: T6a Tenant Plan Control Plane

### Completed

- Added platform-scoped Tenant Plan control-plane APIs:
  - list and detail expose plan modules, limits, tenant usage, and timestamps;
  - create/update normalize code/name/remark/enabled/limits/module fields;
  - delete blocks assigned plans instead of removing plans still referenced by tenants.
- Plan module writes validate against the module registry and reject unknown or duplicate module codes before touching Prisma.
- OpenAPI and SDK now expose typed Tenant Plan list/detail/create/update/delete contracts.
- The live `/system/tenants` Admin page now loads plans through the new SDK calls and provides create/edit/delete controls without adding a tenant selector.
- Added focused API service tests, typed smoke coverage, and a static control-plane guard for T6a.

### Verification Log

Passed before deploy:

- Focused tenant service tests covered Tenant Plan create/update/delete, module validation, and in-use delete blocking.
- Tenant Plan control-plane guard, SDK contract check, OpenAPI export/drift/tag checks, API error-code guard, full typecheck, lint, and test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Tenant Plan checks.
- Public API Tenant Plan smoke passed against `http://144.217.243.161:39172`, including create/update/detail/delete, invalid module rejection, and in-use delete blocking.

### Remaining Product Debt

- Complete Tenant CRUD and tenant lifecycle actions.
- Complete Tenant Member CRUD/invitation beyond active-tenant assignment.
- Complete Admin tenant switcher, platform visit mode, and platform visit audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No platform visit/impersonation runtime in T6a.
- No tenant assignment or plan-change impact preview workflow in T6a.
- No Tenant Member invitation or global-user creation flow in T6a.

## Round 22: T6b Tenant Lifecycle Control Plane

### Completed

- Added platform-scoped Tenant lifecycle APIs:
  - list/detail expose plan, membership counts, owner usernames, contacts, expiry, and creator metadata;
  - create/update normalize code, slug, name, plan code, contact, account limit, and expiry fields;
  - status mutation supports active/suspended/expired without adding a hard-delete API.
- Added root tenant safety guards:
  - root code and slug cannot be changed;
  - root cannot be suspended or expired.
- OpenAPI and SDK now expose typed Tenant list/detail/create/update/status contracts.
- The live `/system/tenants` Admin page now loads tenants through the new SDK calls and provides create/edit/status controls without adding a tenant selector.
- Added focused API service tests, typed smoke coverage, and a static lifecycle control-plane guard for T6b.

### Verification Log

Passed before deploy:

- Focused tenant service tests covered Tenant lifecycle create/update/status, plan validation, and root status protection.
- Tenant lifecycle control-plane guard, SDK contract check, OpenAPI export/drift/tag checks, API error-code guard, full typecheck, lint, and test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Tenant lifecycle checks.
- Public API Tenant lifecycle smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete Tenant Member CRUD/invitation beyond active-tenant assignment.
- Complete Admin tenant switcher, platform visit mode, and platform visit audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No hard-delete tenant API in T6b.
- No Tenant Member invitation or global-user creation flow in T6b.
- No platform visit/impersonation runtime in T6b.

## Round 23: T6c Tenant Member Lifecycle Control Plane

### Completed

- Added platform-scoped Tenant Member lifecycle APIs under `/api/core/tenancy/tenants/:tenantId/members`:
  - list members for a specified tenant;
  - invite an existing global user by `userId`/`username`;
  - create a new global user with `forcePasswordChange` and add membership;
  - update status, owner flag, department, roles, and posts;
  - soft-remove members by marking status `left` and clearing assignments.
- Added lifecycle safety:
  - statuses support `invited`, `active`, `suspended`, and `left`;
  - service enforces tenant account limits;
  - duplicate active memberships are rejected;
  - removing or deactivating the last active owner is blocked.
- OpenAPI and SDK now expose typed Tenant Member lifecycle contracts.
- The live `/system/tenants` Admin page now opens a per-tenant member control modal for list/create/edit/remove without adding a body/header/query tenant selector.
- Added focused API service tests, typed smoke coverage, and a static member control-plane guard for T6c.

### Verification Log

Passed before deploy:

- Focused tenant service tests covered member create/invite/update/remove, account limit, duplicate membership, and last active owner protection.
- Tenant member control-plane guard, SDK contract check, OpenAPI export/drift/tag checks, API error-code guard, full typecheck, lint, and test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Tenant Member lifecycle checks.
- Public API Tenant Member lifecycle smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete Admin tenant switcher.
- Complete platform visit mode and platform visit audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No Admin header tenant switcher in T6c.
- No platform visit/impersonation runtime in T6c.
- No email/SMS invitation delivery workflow in T6c; the control plane records invited memberships and can create users.

## Round 24: T6d Admin Tenant Switcher

### Completed

- Added `switchOpenCoreTenant()` to the Admin auth service:
  - calls SDK `switchTenant`;
  - persists the server-reissued access token;
  - returns the refreshed authenticated user shape used by Admin initial state.
- Added the Admin header `TenantSwitcher`:
  - renders only for users with multiple tenant options;
  - switches by `membershipId`;
  - updates current user permissions and reloads the page so tenant-scoped data is fetched under the new token.
- Wired the switcher into the runtime layout actions and component export surface.
- Added `smoke:core-tenant-switcher`:
  - creates a temporary active tenant and admin membership;
  - switches through `/auth/switch-tenant`;
  - proves the original token is revoked and the new token is bound to the switched tenant;
  - deletes temporary smoke tenants.
- Added `guard:tenant-switcher` and wired the smoke into local/deploy smoke scripts.

### Verification Log

Passed before deploy:

- Admin lint/test, typed smoke compilation, tenant switcher guard, full typecheck, lint, and test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Tenant Switcher checks.
- Public API Tenant Switcher smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete platform visit mode.
- Complete platform visit/impersonation audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No front-end-only tenant mutation; the switcher always uses server token reissue.
- No platform visit/impersonation runtime in T6d.
- No tenant switch without reload; reload is the minimal reliable boundary for clearing stale tenant-scoped Admin state.

## Round 25: T6e Platform Visit Mode

### Completed

- Added explicit platform visit authentication:
  - `POST /api/auth/platform-visit` is protected by `platform:tenant:visit`;
  - the service resolves the target tenant server-side by id/code/slug/host selector;
  - platform visit tokens use `accessMode: 'platform-visit'` and carry the target tenant id without creating a tenant membership.
- Updated bearer/session handling so platform visit sessions validate active tenant status, allow a missing membership id only for platform visit, and keep ordinary API tenant scope derived from the authenticated request context.
- Changed `/auth/me` to return the current bearer session instead of silently reissuing a tenant token, preserving platform visit mode for Admin and SDK callers.
- Added SDK/Admin wiring:
  - SDK `visitTenantAsPlatform()`;
  - Admin `visitOpenCoreTenantAsPlatform()`;
  - `/system/tenants` active-tenant visit action that stores the returned token and reloads tenant-scoped state.
- Added `smoke:core-platform-visit` and `guard:platform-visit`, and wired the smoke into local/deploy smoke scripts.

### Verification Log

Passed before deploy:

- Platform visit guard, typed smoke compilation, focused SDK auth client tests, security auth tests, focused security/online-user/API/Admin typechecks, OpenAPI export/drift/tag checks, SDK generation check, full typecheck, full lint, and full test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Platform Visit checks.
- Public API Platform Visit smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete platform visit/impersonation audit.
- Complete T7 optional/business model tenantization.

### Deliberate Non-Goals

- No membership is created for platform visit mode.
- No front-end-only tenant mutation; platform visit always uses server token issue.
- No dedicated platform visit audit row yet; this round only records the old-token revocation reason and leaves full impersonation audit to the remaining T6 audit work.

## Round 26: T6f Platform Visit Audit

### Completed

- Added dedicated platform visit operation audit:
  - successful `/auth/platform-visit` calls write tenant-owned `AuditLog` rows under the visited tenant;
  - rows use `action=platform-visit`, `resource=auth.platform-visit`, and `resourceId=<targetTenantId>`;
  - metadata includes the visit reason, access mode, target tenant id, and target tenant code.
- The audit row uses the existing operation-log fields for actor username, request id, IP, location, user agent, duration, method, path, and status.
- If the dedicated audit write fails after the visit token is issued, the newly issued visit token is revoked before the error is returned.
- Extended `smoke:core-platform-visit` to verify the target-tenant audit row directly through Prisma.
- Extended `guard:platform-visit` to lock the audit module/controller/smoke markers.

### Verification Log

Passed before deploy:

- Platform visit guard, typed smoke compilation, focused API typecheck, full typecheck, full lint, and full test suite passed.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including local Platform Visit audit checks.
- Public API Platform Visit audit smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Continue T4/T7 remaining tenant data-plane review and optional/business model tenantization.

### Deliberate Non-Goals

- No new audit table in T6f; the existing tenant-owned `AuditLog` surface is sufficient for platform visit traceability.
- No platform visit recording on failed authorization; this round records successful cross-tenant access.

## Round 27: T7a Collaboration Message Tenant Isolation

### Completed

- Added migration `20260624023000_tenant_scoped_collaboration_messages`:
  - adds `CollaborationMessage.tenantId`;
  - backfills existing messages to `tenant_root`;
  - adds the tenant foreign key;
  - replaces global message lookup indexes with tenant-prefixed indexes.
- Updated Prisma schema with `Tenant.collaborationMessages` and `CollaborationMessage.tenant`.
- Updated Collaboration Message repositories:
  - Prisma summary/list/detail/create/read/archive/delete resolve `RequestContext.tenantId`;
  - seed repository mirrors the same tenant fallback so tests cannot bypass isolation.
- Updated public/admin surfaces:
  - seed message includes `tenantId`;
  - `MessageDto` and SDK `MessageSummary` expose `tenantId`;
  - Admin Messages displays and exports `tenantId`.
- Extended `smoke:core-collaboration-messages`:
  - creates a foreign tenant message through Prisma;
  - proves root token list/detail/read/archive/delete cannot access it;
  - verifies the foreign row remains owned by the foreign tenant.
- Added `guard:tenant-collaboration-message-scope`.

### Verification Log

Passed before deploy:

- Prisma client generation and schema validation.
- Tenant collaboration message guard, seed typecheck, typed smoke typecheck, OpenAPI export/check, SDK check, and registry tag check.
- Focused API Collaboration repository test, focused API/SDK/Admin typechecks, full typecheck, full lint, and full test suite.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, applied migration `20260624023000_tenant_scoped_collaboration_messages`, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including Collaboration Message foreign-tenant checks.
- Public API Collaboration Message smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T7 tenantization for Collaboration Notice, Collaboration Todo, Collaboration Approval Lite, ReportDefinition, and future business domains.

### Deliberate Non-Goals

- No client-supplied tenant selector was added.
- No sender/recipient identity redesign in T7a; this round only closes row ownership and access isolation.

## Round 28: T7b Collaboration Notice Tenant Isolation

### Completed

- Added migration `20260624033000_tenant_scoped_collaboration_notices`:
  - adds `CollaborationNotice.tenantId`;
  - backfills existing notices to `tenant_root`;
  - adds the tenant foreign key;
  - replaces global notice lookup indexes with tenant-prefixed indexes.
- Updated Prisma schema with `Tenant.collaborationNotices` and `CollaborationNotice.tenant`.
- Updated Collaboration Notice repositories:
  - Prisma summary/list/detail/create/publish/archive resolve `RequestContext.tenantId`;
  - seed repository mirrors the same tenant fallback so tests cannot bypass isolation.
- Updated public/admin surfaces:
  - seed notice includes `tenantId`;
  - `NoticeDto` and SDK `NoticeSummary` expose `tenantId`;
  - Admin Notices displays and exports `tenantId`.
- Extended `smoke:core-collaboration-notices`:
  - creates a foreign tenant notice through Prisma;
  - proves root token list/detail/publish/archive cannot access it;
  - verifies the foreign row remains owned by the foreign tenant.
- Added `guard:tenant-collaboration-notice-scope`.

### Verification Log

Passed before deploy:

- Prisma client generation and schema validation.
- Tenant collaboration notice guard, seed typecheck, typed smoke typecheck, OpenAPI export/check, SDK check, and registry tag check.
- Focused API Collaboration repository test, focused API/SDK/Admin typechecks, full typecheck, full lint, and full test suite.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, applied migration `20260624033000_tenant_scoped_collaboration_notices`, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including Collaboration Notice foreign-tenant checks.
- Public API Collaboration Notice smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T7 tenantization for Collaboration Todo, Collaboration Approval Lite, ReportDefinition, and future business domains.

### Deliberate Non-Goals

- No client-supplied tenant selector was added.
- No notice audience identity redesign in T7b; this round only closes row ownership and access isolation.

## Round 29: T7c Collaboration Todo Tenant Isolation

### Completed

- Added migration `20260624043000_tenant_scoped_collaboration_todos`:
  - adds `CollaborationTodo.tenantId`;
  - backfills existing todos to `tenant_root`;
  - adds the tenant foreign key;
  - replaces global todo lookup indexes with tenant-prefixed indexes.
- Updated Prisma schema with `Tenant.collaborationTodos` and `CollaborationTodo.tenant`.
- Updated Collaboration Todo repositories:
  - Prisma summary/list/detail/create/assign/complete/cancel resolve `RequestContext.tenantId`;
  - seed repository mirrors the same tenant fallback so tests cannot bypass isolation.
- Updated public/admin surfaces:
  - seed todo includes `tenantId`;
  - `TodoDto` and SDK `TodoSummary` expose `tenantId`;
  - Admin Todos displays and exports `tenantId`.
- Extended `smoke:core-collaboration-todos`:
  - creates a foreign tenant todo through Prisma;
  - proves root token list/detail/assign/complete/cancel cannot access it;
  - verifies the foreign row remains owned by the foreign tenant.
- Added `guard:tenant-collaboration-todo-scope`.

### Verification Log

Passed before deploy:

- Prisma client generation and schema validation.
- Tenant collaboration todo guard, seed typecheck, typed smoke typecheck, OpenAPI export/check, SDK check, and registry tag check.
- Focused API Collaboration repository test, focused API/SDK/Admin typechecks, full typecheck, full lint, and full test suite.

Passed after deploy:

- Refreshed OpenCore deploy rebuilt API/Admin, applied migration `20260624043000_tenant_scoped_collaboration_todos`, reseeded, restarted API `39172` and Admin `39174`, and passed deploy smoke including Collaboration Todo foreign-tenant checks.
- Public API Collaboration Todo smoke passed against `http://144.217.243.161:39172`.

### Remaining Product Debt

- Complete T7 tenantization for Collaboration Approval Lite, ReportDefinition, and future business domains.

### Deliberate Non-Goals

- No client-supplied tenant selector was added.
- No assignee identity redesign in T7c; this round only closes row ownership and access isolation.

## Round 30: T7d Collaboration Approval Lite Tenant Isolation

### Completed

- Added migration `20260624053000_tenant_scoped_collaboration_approvals`:
  - adds `CollaborationApprovalLite.tenantId`;
  - backfills existing approvals to `tenant_root`;
  - adds the tenant foreign key;
  - replaces global approval lookup indexes with tenant-prefixed indexes.
- Updated Prisma schema with `Tenant.collaborationApprovals` and `CollaborationApprovalLite.tenant`.
- Updated Collaboration Approval Lite repositories:
  - Prisma summary/list/detail/create/approve/reject resolve `RequestContext.tenantId`;
  - seed repository mirrors the same tenant fallback so tests cannot bypass isolation.
- Updated public/admin surfaces:
  - seed approval includes `tenantId`;
  - `ApprovalLiteDto` and SDK `ApprovalLiteSummary` expose `tenantId`;
  - Admin Approvals displays and exports `tenantId`.
- Extended `smoke:core-collaboration-approvals`:
  - creates a foreign tenant approval through Prisma;
  - proves root token list/detail/approve/reject cannot access it;
  - verifies the foreign row remains owned by the foreign tenant.
- Added `guard:tenant-collaboration-approval-scope`.

### Verification Log

- Passed Prisma validation/generation, seed and typed-smoke checks, OpenAPI/SDK drift checks, the focused collaboration repository spec, API/Admin/SDK/full typechecks, lint, full tests, refreshed deploy, and public Collaboration Approval Lite smoke including `collaboration.approvals.foreign-hidden`.

### Remaining Product Debt

- Complete T7 tenantization for ReportDefinition and future business domains.

### Deliberate Non-Goals

- No client-supplied tenant selector was added.
- No requester/approver identity redesign in T7d; this round only closes row ownership and access isolation.
