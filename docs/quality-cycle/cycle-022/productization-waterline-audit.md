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

- Tenant data-plane isolation is not done.
- Platform visit/impersonation is not done.
- Tenant plan CRUD and member management Admin are not done.
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
