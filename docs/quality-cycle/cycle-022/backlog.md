# OpenCore Cycle-022 Backlog

Date: 2026-06-23

## Scope Rule

Cycle-022 only advances SaaS tenant foundation. CRM/ERP/Mall/AI and other business domains stay out until tenant identity, auth, data, runtime, Admin, smoke, guard, OpenAPI, SDK, and docs are consistent.

## Progress Count

- Completed full slices: 4
- Current slice: T4 core tenant data isolation
- Completed sub-slices: T3a membership-scoped authz/plan clipping; T3b tenant-scoped Role catalog; T3c tenant-scoped Post catalog; T3d tenant-scoped Department catalog; T3e active-tenant member assignment; T4a online sessions; T4b login logs; T4c operation audit logs; T4d dictionaries; T4e system config
- Remaining full slices: 4

## Slices

| Slice                                  | Status  | Deliverable                                                                                                                                 | Notes                                                                                                                                                                                                                                               |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0 architecture admission              | Done    | Handoff plus cycle source docs                                                                                                              | Handoff exists; this backlog, acceptance matrix, waterline audit, and notes were added in this round.                                                                                                                                               |
| T1 foundation models and root tenant   | Done    | TenantPlan, Tenant, TenantMembership, member role/post bridge, PlatformRole, root backfill, read-only foundation API/Admin/SDK/smoke/guard  | Verified locally, deployed, and smoke-tested against local/public API. No tenant switch or tenant data-plane rewrite yet.                                                                                                                           |
| T2 auth and tenant context             | Done    | tenant-bound token, membership-bound session, select/switch tenant, request context enrichment, disabled tenant/member session invalidation | `tid/mid/am` tokens, `OnlineUserSession` tenant fields, select/switch APIs, request context guard wiring, guard/smoke.                                                                                                                              |
| T3 organization and RBAC tenantization | Done    | tenant roles, departments, posts, membership role/post/department assignment, role permission clipping                                      | T3a authenticates from membership role/post bridges and clips permissions by tenant plan modules. T3b makes Role tenant-owned; T3c makes Post tenant-owned; T3d makes Department tenant-owned; T3e adds active-tenant member assignment APIs/Admin. |
| T4 core tenant data isolation          | Partial | dict, config, notice, file, audit/login log, online session isolation                                                                       | T4a scopes online-session monitor list/detail/summary/cleanup/kick-out by active tenant; T4b scopes login-log list/detail/delete/clean/recording by active tenant; T4c scopes operation audit log list/detail/delete/retention clean/recording by active tenant; T4d scopes dictionaries by active tenant; T4e scopes system config, overrides, secrets, vault status, cache, runtime reads, and exports by active tenant. Notice/file isolation still needs two-tenant cross-access tests. |
| T5 runtime propagation                 | Pending | Redis namespace, file keys, BullMQ/Scheduler payload/context, Integration provider/outbox/OAuth/WebSocket tenant scope                      | Worker execution must restore tenant context.                                                                                                                                                                                                       |
| T6 Admin control plane                 | Pending | Tenants, Tenant Plans, Members, switcher, platform visit mode                                                                               | Must be live-only, audited, and permission-aligned.                                                                                                                                                                                                 |
| T7 optional/business migration         | Pending | collaboration/report/future business model tenantization                                                                                    | Starts only after foundation is proven.                                                                                                                                                                                                             |

## Current Round Debt

- T4a closed online-session monitor isolation: list/detail/summary/cleanup/kick-out now use the active request tenant; auth token validation remains token-scoped.
- T4b closed login-log isolation: login-log list/detail/export/delete/clean and session success/self/logout/foreign smoke rows are tenant-scoped.
- T4c closed operation audit log isolation: operation audit list/detail/export/delete/retention clean and write-operation records are tenant-scoped.
- T4d closed dictionary isolation: dictionary type/item list/detail/export/create/update/delete/recycle/import/translation/simple-list operations are tenant-scoped.
- T4e closed system config isolation: config list/detail/export/create/update/delete/batch/value lookup/runtime/cache refresh/environment override/secret version/vault operations are tenant-scoped.
- Admin tenant selection UI is minimal; full switcher/control plane remains T6.
- Existing System/core repositories beyond Role/Post/Department org catalogs, dictionaries, system config, active member assignment, online sessions, login logs, and operation audit logs are not tenant-scoped yet.
- Tenant Plans and Tenant Members do not have CRUD/invitation Admin pages yet.
- Redis, file object keys, queues, Integration, OAuth, WebSocket, and broader platform audit scope are not tenant-propagated yet.
