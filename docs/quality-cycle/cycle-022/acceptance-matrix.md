# OpenCore Cycle-022 Acceptance Matrix

Date: 2026-06-22

| Area          | Requirement                                               | Status    | Evidence                                                                                                                          |
| ------------- | --------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | Global User can have tenant memberships                   | Done (T1) | `TenantMembership` model and root backfill added. Multi-tenant login remains T2.                                                  |
| Identity      | Single-tenant mode keeps default root tenant              | Done (T1) | `tenant_root` migration/seed and `OPENCORE_TENANCY_MODE` summary default to `single`.                                             |
| Identity      | Token/session bound to tenant and membership              | Pending   | T2. Current token remains legacy `sub/jti`.                                                                                       |
| Identity      | Select/switch tenant reissues token                       | Pending   | T2. No Admin switcher added in T1.                                                                                                |
| Platform auth | Platform admin model separated from tenant roles          | Done (T1) | `PlatformRole`, `UserPlatformRole`, `PlatformRolePermission`, `platform-admin` seed added. Runtime auth still legacy until T2/T3. |
| Plans         | Tenant plan uses module codes                             | Done (T1) | `TenantPlanModule.moduleCode`; root `system.full` seed syncs `listModules()`.                                                     |
| Database      | Root tenant backfills existing users                      | Done (T1) | Migration and seed create root memberships for all users. Smoke checks parity.                                                    |
| Database      | Legacy UserRole/UserPost copied to membership bridges     | Done (T1) | `TenantMembershipRole` and `TenantMembershipPost` migration/seed added.                                                           |
| Database      | Tenant-owned repositories scoped by tenant                | Pending   | T3/T4.                                                                                                                            |
| Database      | Composite unique constraints for tenant-owned codes       | Pending   | T3/T4. T1 does not rewrite Role/Dept/Post/Dict/Config uniqueness.                                                                 |
| API           | Ordinary API does not trust body/query/header tenantId    | Done (T1) | T1 foundation endpoint has no body/query/header tenant selector; guard checks this. Full runtime guard is T2.                     |
| OpenAPI       | Tenant foundation endpoint exported                       | Done (T1) | `/api/core/tenancy/foundation` added under `Core Tenancy`.                                                                        |
| SDK           | Tenant foundation endpoint callable through SDK           | Done (T1) | `createTenancyClient().getFoundationSummary()`.                                                                                   |
| Admin         | Tenant foundation visible in live Admin                   | Done (T1) | `/system/tenants` read-only page calls live API. CRUD intentionally pending.                                                      |
| Smoke         | Tenant foundation smoke exists                            | Done (T1) | `pnpm smoke:core-tenancy-foundation`.                                                                                             |
| Guard         | Tenant foundation guard exists                            | Done (T1) | `pnpm guard:tenant-foundation`.                                                                                                   |
| Runtime       | Redis/file/queue/WebSocket/Integration tenant propagation | Pending   | T5.                                                                                                                               |
| Audit         | Platform visit and tenant audit                           | Pending   | T2/T6.                                                                                                                            |
| Delivery      | lint/typecheck/test/smoke/deploy pass                     | Done (T1) | Verified locally and after refreshed deploy; summary is recorded in `implementation-notes.md`.                                    |
