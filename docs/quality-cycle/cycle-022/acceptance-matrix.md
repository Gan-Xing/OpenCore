# OpenCore Cycle-022 Acceptance Matrix

Date: 2026-06-23

| Area          | Requirement                                               | Status     | Evidence                                                                                                                            |
| ------------- | --------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | Global User can have tenant memberships                   | Done (T1)  | `TenantMembership` model and root backfill added. Multi-tenant login remains T2.                                                    |
| Identity      | Single-tenant mode keeps default root tenant              | Done (T1)  | `tenant_root` migration/seed and `OPENCORE_TENANCY_MODE` summary default to `single`.                                               |
| Identity      | Token/session bound to tenant and membership              | Done (T2)  | Token payload includes `tid/mid/am`; `OnlineUserSession` stores `tenantId`, `membershipId`, and `accessMode`.                       |
| Identity      | Select/switch tenant reissues token                       | Done (T2)  | `/api/auth/select-tenant` exchanges a login ticket; `/api/auth/switch-tenant` reissues a token and revokes the old session.         |
| Platform auth | Platform admin model separated from tenant roles          | Done (T1)  | `PlatformRole`, `UserPlatformRole`, `PlatformRolePermission`, `platform-admin` seed added. Platform visit runtime remains T6.       |
| Plans         | Tenant plan uses module codes                             | Done (T1)  | `TenantPlanModule.moduleCode`; root `system.full` seed syncs `listModules()`.                                                       |
| Plans         | Tenant role permissions clipped by enabled plan modules   | Done (T3a) | Prisma RBAC repository derives permissions from active membership roles and filters registry permissions by `TenantPlanModule`.     |
| Database      | Root tenant backfills existing users                      | Done (T1)  | Migration and seed create root memberships for all users. Smoke checks parity.                                                      |
| Database      | Legacy UserRole/UserPost copied to membership bridges     | Done (T1)  | `TenantMembershipRole` and `TenantMembershipPost` migration/seed added.                                                             |
| Database      | Auth reads membership role/post bridges                   | Done (T3a) | Authenticated users now expose membership `roleCodes`, `postCodes`, and plan-clipped `permissionCodes`.                             |
| Database      | Role catalog scoped by active tenant                      | Done (T3b) | `Role.tenantId`, `(tenantId, code)` uniqueness, `PrismaSystemRoleRepository` request-context scoping, and root legacy bridge update. |
| Database      | Post catalog scoped by active tenant                      | Done (T3c) | `SystemPost.tenantId`, `(tenantId, code)` uniqueness, request-context scoping, and root legacy bridge update.                       |
| Database      | Tenant-owned repositories scoped by tenant                | Partial    | Role and Post catalogs are done in T3b/T3c. Dept and broader System/core repositories remain T3/T4.                                  |
| Database      | Composite unique constraints for tenant-owned codes       | Partial    | Role and Post `(tenantId, code)` are done. Dept/Dict/Config uniqueness remains pending.                                             |
| API           | Ordinary API does not trust body/query/header tenantId    | Done (T2)  | Guards populate tenant context from validated bearer token/session; smoke proves forged `tenant-id` header does not change context. |
| API           | Data scope resolves from active tenant membership         | Done (T3a) | `SecurityDataScopeService` passes active membership id to the RBAC repository.                                                      |
| OpenAPI       | Tenant foundation/auth DTOs exported                      | Done (T3a) | Authenticated user DTO includes tenant context and membership post codes.                                                           |
| SDK           | Tenant foundation/auth callable through SDK               | Done (T3a) | `createTenancyClient().getFoundationSummary()`, select/switch tenant, and `AuthenticatedUser.postCodes`.                            |
| Admin         | Tenant foundation visible in live Admin                   | Done (T2)  | `/system/tenants` read-only page calls live API; login accepts tenant code. CRUD/switcher intentionally pending.                    |
| Smoke         | Tenant foundation/auth/RBAC/org smokes exist              | Done (T3c) | `pnpm smoke:core-tenancy-foundation`, `pnpm smoke:core-tenancy-auth`, `pnpm smoke:core-tenant-rbac`, `pnpm smoke:core-tenant-role`, and `pnpm smoke:core-tenant-post`. |
| Guard         | Tenant foundation/auth/RBAC/org guards exist              | Done (T3c) | `pnpm guard:tenant-foundation`, `pnpm guard:tenant-auth`, `pnpm guard:tenant-rbac`, `pnpm guard:tenant-role-scope`, and `pnpm guard:tenant-post-scope`. |
| Runtime       | Redis/file/queue/WebSocket/Integration tenant propagation | Pending    | T5.                                                                                                                                 |
| Audit         | Platform visit and tenant audit                           | Pending    | T6.                                                                                                                                 |
| Delivery      | lint/typecheck/test/smoke/deploy pass                     | Done (T3c) | Full lint/typecheck/test, deploy, local/public tenant foundation/auth/RBAC/role/post smokes, and public Admin checks passed.        |
