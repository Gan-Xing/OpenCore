# OpenCore Cycle-022 Productization Waterline Audit

Date: 2026-06-23

## Waterline

Cycle-022 may only count a slice when it is code-backed, migrated, seeded, visible through OpenAPI/SDK/Admin when applicable, covered by smoke/guard, and documented.

## T1 Audit

| Requirement                                | Status | Notes                                                                                                         |
| ------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| Real database model, not Tenant CRUD shell | Done   | Added TenantPlan, Tenant, TenantMembership, member role/post bridges, and platform role models.               |
| Default root tenant migration              | Done   | Migration creates `tenant_root`, `system.full`, root memberships, and copies legacy role/post bindings.       |
| Repeatable seed                            | Done   | `seedTenancy()` syncs root plan modules from module registry and backfills all users.                         |
| Preserve single/shared mode                | Done   | T1 adds shared model while defaulting runtime summary to `single`; no single-mode route was removed.          |
| OpenAPI                                    | Done   | `Core Tenancy` endpoint exported.                                                                             |
| SDK                                        | Done   | Tenancy client/types added.                                                                                   |
| Admin                                      | Done   | `/system/tenants` is read-only and live-only. No fake switching.                                              |
| Smoke                                      | Done   | Tenant foundation smoke validates root tenant, plan modules, platform role permissions, and backfill parity.  |
| Guard                                      | Done   | Static guard checks migration/seed/API/Admin/SDK invariants and rejects header/body/query tenantId on T1 API. |
| Docs                                       | Done   | Backlog, acceptance matrix, waterline audit, implementation notes, and handoff progress updated.              |

## Below Waterline

- Tenant data-plane isolation is not done.
- Platform visit/impersonation is not done.
- Tenant plan CRUD, member CRUD/invitation, Admin switcher, and platform visit mode are not done.
- Runtime propagation is not done.

These remain below the productization waterline and cannot be described as complete SaaS multi-tenancy.

## T2 Audit

| Requirement                                           | Status | Notes                                                                                                       |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Token and session tenant binding                      | Done   | Tokens carry `tid/mid/am`; `OnlineUserSession` persists `tenantId`, `membershipId`, and `accessMode`.       |
| Bearer request validates tenant/member/session status | Done   | Auth rejects missing/mismatched tenant context and inactive tenant/member state before returning the user.  |
| Request context enrichment                            | Done   | Guards write actor, tenant, membership, and access mode into `AsyncLocalStorage`.                           |
| Select/switch APIs                                    | Done   | Login can return tenant-selection ticket; select/switch reissue tenant-bound tokens; switch revokes old.    |
| Single-mode compatibility                             | Done   | System user creation/update syncs root membership bridges; seed resolves root membership by username.       |
| OpenAPI/SDK/Admin                                     | Done   | Auth DTO/OpenAPI updated; SDK has select/switch; Admin login accepts optional tenant code.                  |
| Smoke                                                 | Done   | Tenant auth smoke validates token claims, request context, header tamper resistance, and switch revocation. |
| Guard                                                 | Done   | Static tenant auth guard checks schema/token/session/context/API/smoke markers.                             |

## T3a Audit

| Requirement                        | Status  | Notes                                                                                                    |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| Membership-derived roles and posts | Done    | Authenticated users prefer `TenantMembershipRole` and `TenantMembershipPost` for active tenant sessions. |
| Tenant plan permission clipping    | Done    | Registry permissions are clipped by active tenant plan modules before reaching permission guards.        |
| Data scope uses active membership  | Done    | Security data-scope resolution receives the active membership id and uses membership dept/role scope.    |
| OpenAPI/SDK contract               | Done    | Authenticated user DTO/SDK type now includes membership-derived `postCodes`.                             |
| Smoke/guard                        | Done    | Added `smoke:core-tenant-rbac` and `guard:tenant-rbac`.                                                  |
| Tenant-owned Role/Dept/Post CRUD   | Pending | Existing Role/Dept/Post repositories remain globally keyed; T3 is not complete.                          |
| Tenant-scoped unique constraints   | Pending | Role/Dept/Post code uniqueness is still global and must be rewritten in a later T3/T4 closure.           |

## T3b Audit

| Requirement                                       | Status  | Notes                                                                                                        |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| Role ownership by tenant                          | Done    | `Role` now has `tenantId` and belongs to `Tenant`; existing roles backfill to `tenant_root`.                 |
| Role code uniqueness by tenant                    | Done    | Dropped global `Role.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)` for FK enforcement. |
| Membership role cannot cross tenant role owner    | Done    | `TenantMembershipRole(tenantId, roleId)` now references `Role(tenantId, id)`.                                |
| Role repository uses authenticated tenant context | Done    | `PrismaSystemRoleRepository` scopes list/get/create/update/delete through `RequestContext.tenantId`.         |
| Root legacy bridge compatibility                  | Done    | `SystemUser` legacy `UserRole` reads/writes stay pinned to `tenant_root` for single-mode compatibility.      |
| Seed/OpenAPI/SDK/Admin consistency                | Done    | Seed upserts root roles by `(tenant_root, code)`; OpenAPI/SDK shapes are unchanged and drift checks pass.    |
| Smoke/guard                                       | Done    | Added `smoke:core-tenant-role` and `guard:tenant-role-scope`.                                                |
| Tenant-owned Dept/Post CRUD                       | Pending | Department and Post repositories still use global code uniqueness.                                           |
| Non-root membership role/post assignment Admin    | Pending | T3b does not add control-plane assignment APIs; existing user-role assignment is root legacy only.           |

## T3c Audit

| Requirement                                       | Status  | Notes                                                                                                      |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Post ownership by tenant                          | Done    | `SystemPost` now has `tenantId` and belongs to `Tenant`; existing posts backfill to `tenant_root`.         |
| Post code uniqueness by tenant                    | Done    | Dropped global `SystemPost.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)`.            |
| Membership post cannot cross tenant post owner    | Done    | `TenantMembershipPost(tenantId, postId)` now references `SystemPost(tenantId, id)`.                        |
| Post repository uses authenticated tenant context | Done    | `PrismaSystemPostRepository` scopes list/options/get/create/update/delete/batch/order by `RequestContext`. |
| Root legacy bridge compatibility                  | Done    | `SystemUser` legacy `UserPost` reads/writes stay pinned to `tenant_root` for single-mode compatibility.    |
| Seed/OpenAPI/SDK/Admin consistency                | Done    | Seed upserts root posts by `(tenant_root, code)`; OpenAPI/SDK/Admin shapes are unchanged and remain live.  |
| Smoke/guard                                       | Done    | Added `smoke:core-tenant-post` and `guard:tenant-post-scope`.                                              |
| Tenant-owned Department CRUD                      | Pending | Department repositories still use global code uniqueness and tree ownership.                               |
| Non-root membership role/post assignment Admin    | Pending | T3c does not add control-plane assignment APIs; existing user-post assignment is root legacy only.         |

## T3d Audit

| Requirement                                             | Status  | Notes                                                                                                                                     |
| ------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Department ownership by tenant                          | Done    | `SystemDept` now has `tenantId` and belongs to `Tenant`; existing departments backfill to `tenant_root`.                                  |
| Department code uniqueness by tenant                    | Done    | Dropped global `SystemDept.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)`.                                           |
| Department tree cannot cross tenant parent ownership    | Done    | Migration adds `SystemDept(tenantId, parentId)` FK to `SystemDept(tenantId, id)`; repository parent lookup is scoped by `RequestContext`. |
| Membership department cannot cross tenant ownership     | Done    | Migration adds `TenantMembership(tenantId, deptId)` FK to `SystemDept(tenantId, id)`.                                                     |
| Department repository uses authenticated tenant context | Done    | `PrismaSystemDeptRepository` scopes tree/options/get/create/update/order/delete by `RequestContext`.                                      |
| Root legacy bridge compatibility                        | Done    | `SystemUser` legacy `User.deptId` validation/subtree filters and seed user departments stay pinned to `tenant_root`.                      |
| RBAC data-scope department lookup                       | Done    | Role custom data-scope department validation and RBAC descendant lookup are scoped to the active tenant.                                  |
| Seed/OpenAPI/SDK/Admin consistency                      | Done    | Seed upserts root departments by `(tenant_root, code)`; OpenAPI/SDK/Admin shapes are unchanged and remain live.                           |
| Smoke/guard                                             | Done    | Added `smoke:core-tenant-dept` and `guard:tenant-dept-scope`.                                                                             |
| Non-root membership role/post assignment Admin          | Pending | T3d does not add control-plane assignment APIs; existing role/post assignment remains root legacy only.                                   |

## T3e Audit

| Requirement                                      | Status  | Notes                                                                                                                       |
| ------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Active tenant member list API                    | Done    | `GET /api/core/tenancy/members` lists memberships for `RequestContext.tenantId` with user, dept, role, and post summaries.  |
| Active tenant member assignment API              | Done    | `PATCH /api/core/tenancy/members/:membershipId/assignments` updates status, department, roles, and posts for that tenant.   |
| No trusted client tenant selector                | Done    | The new controller has no query/header tenant selector and service resolves tenant via `getRequestContext()`.               |
| Cross-tenant assignment rejection                | Done    | Service validates membership, department, role, and post ownership in the active tenant before replacing assignments.       |
| Root legacy bridge compatibility                 | Done    | Root tenant assignment syncs `User.enabled`, `User.deptId`, `UserRole`, and `UserPost` for existing single-mode screens.    |
| OpenAPI/SDK/Admin consistency                    | Done    | OpenAPI exports member DTOs; SDK adds list/update calls; `/system/tenants` edits current-tenant assignments from live APIs. |
| Smoke/guard                                      | Done    | Added `smoke:core-tenant-member` and `guard:tenant-member-assignment`, both wired into local/deploy smoke scripts.          |
| Tenant Member CRUD/invitation and switcher Admin | Pending | T3e is assignment only; full Tenant Member lifecycle and tenant switcher remain T6.                                         |

## T4a Audit

| Requirement                         | Status  | Notes                                                                                                                        |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Online session tenant isolation     | Done    | Monitor list/detail/summary/cleanup/kick-out now resolve the tenant from `RequestContext`, falling back to `tenant_root`.    |
| Auth token validation remains valid | Done    | Session registration, bearer token validation, and token revocation remain token-scoped so auth does not depend on UI scope. |
| Cross-tenant monitor rejection      | Done    | Prisma integration test and public smoke prove foreign-tenant sessions are hidden, skipped, and not cleaned from root scope. |
| Seed/SDK/Admin consistency          | Done    | Seed and SDK fixtures include root tenant fields; Admin Online Users exposes access mode, tenant id, and membership id.      |
| OpenAPI consistency                 | Done    | Online-session DTO already includes tenant fields; no endpoint shape change was required.                                    |
| Smoke/guard                         | Done    | Added `guard:tenant-online-user-scope`; existing `smoke:core-online-user` now covers foreign-tenant session isolation.       |
| Dict/config/notice/file/log scope   | Pending | T4a only closes online sessions. Remaining T4 modules still need tenant ownership, tests, smoke, guards, and docs.           |
