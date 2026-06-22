# OpenCore Cycle-022 Acceptance Matrix

Date: 2026-06-22

| Area          | Requirement                                               | Status    | Evidence                                                                                                                            |
| ------------- | --------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | Global User can have tenant memberships                   | Done (T1) | `TenantMembership` model and root backfill added. Multi-tenant login remains T2.                                                    |
| Identity      | Single-tenant mode keeps default root tenant              | Done (T1) | `tenant_root` migration/seed and `OPENCORE_TENANCY_MODE` summary default to `single`.                                               |
| Identity      | Token/session bound to tenant and membership              | Done (T2) | Token payload includes `tid/mid/am`; `OnlineUserSession` stores `tenantId`, `membershipId`, and `accessMode`.                       |
| Identity      | Select/switch tenant reissues token                       | Done (T2) | `/api/auth/select-tenant` exchanges a login ticket; `/api/auth/switch-tenant` reissues a token and revokes the old session.         |
| Platform auth | Platform admin model separated from tenant roles          | Done (T1) | `PlatformRole`, `UserPlatformRole`, `PlatformRolePermission`, `platform-admin` seed added. Runtime auth still legacy until T2/T3.   |
| Plans         | Tenant plan uses module codes                             | Done (T1) | `TenantPlanModule.moduleCode`; root `system.full` seed syncs `listModules()`.                                                       |
| Database      | Root tenant backfills existing users                      | Done (T1) | Migration and seed create root memberships for all users. Smoke checks parity.                                                      |
| Database      | Legacy UserRole/UserPost copied to membership bridges     | Done (T1) | `TenantMembershipRole` and `TenantMembershipPost` migration/seed added.                                                             |
| Database      | Tenant-owned repositories scoped by tenant                | Pending   | T3/T4.                                                                                                                              |
| Database      | Composite unique constraints for tenant-owned codes       | Pending   | T3/T4. T1 does not rewrite Role/Dept/Post/Dict/Config uniqueness.                                                                   |
| API           | Ordinary API does not trust body/query/header tenantId    | Done (T2) | Guards populate tenant context from validated bearer token/session; smoke proves forged `tenant-id` header does not change context. |
| OpenAPI       | Tenant foundation endpoint exported                       | Done (T1) | `/api/core/tenancy/foundation` added under `Core Tenancy`.                                                                          |
| SDK           | Tenant foundation and tenant auth callable through SDK    | Done (T2) | `createTenancyClient().getFoundationSummary()`, `rbac.selectTenant()`, and `rbac.switchTenant()`.                                   |
| Admin         | Tenant foundation visible in live Admin                   | Done (T2) | `/system/tenants` read-only page calls live API; login accepts tenant code. CRUD/switcher intentionally pending.                    |
| Smoke         | Tenant foundation/auth smokes exist                       | Done (T2) | `pnpm smoke:core-tenancy-foundation` and `pnpm smoke:core-tenancy-auth`.                                                            |
| Guard         | Tenant foundation/auth guards exist                       | Done (T2) | `pnpm guard:tenant-foundation` and `pnpm guard:tenant-auth`.                                                                        |
| Runtime       | Redis/file/queue/WebSocket/Integration tenant propagation | Pending   | T5.                                                                                                                                 |
| Audit         | Platform visit and tenant audit                           | Pending   | T2/T6.                                                                                                                              |
| Delivery      | lint/typecheck/test/smoke/deploy pass                     | Done (T2) | Full lint/typecheck/test, deploy, local/public tenant smokes, and public Admin route/bundle check passed.                           |
