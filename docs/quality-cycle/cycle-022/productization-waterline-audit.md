# OpenCore Cycle-022 Productization Waterline Audit

Date: 2026-06-22

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

- Tenant-bound authentication is not done.
- Tenant data-plane isolation is not done.
- Platform visit/impersonation is not done.
- Tenant plan CRUD and member management Admin are not done.
- Runtime propagation is not done.

These remain below the productization waterline and cannot be described as complete SaaS multi-tenancy.
