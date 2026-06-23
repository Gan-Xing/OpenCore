# OpenCore Cycle-022 Backlog

Date: 2026-06-23

## Scope Rule

Cycle-022 only advances SaaS tenant foundation. CRM/ERP/Mall/AI and other business domains stay out until tenant identity, auth, data, runtime, Admin, smoke, guard, OpenAPI, SDK, and docs are consistent.

## Progress Count

- Completed full slices: 3
- Current slice: T3 organization and RBAC tenantization
- Completed sub-slices: T3a membership-scoped authz and plan clipping
- Remaining full slices: 5

## Slices

| Slice                                  | Status      | Deliverable                                                                                                                                 | Notes                                                                                                                                                                                                                          |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T0 architecture admission              | Done        | Handoff plus cycle source docs                                                                                                              | Handoff exists; this backlog, acceptance matrix, waterline audit, and notes were added in this round.                                                                                                                          |
| T1 foundation models and root tenant   | Done        | TenantPlan, Tenant, TenantMembership, member role/post bridge, PlatformRole, root backfill, read-only foundation API/Admin/SDK/smoke/guard  | Verified locally, deployed, and smoke-tested against local/public API. No tenant switch or tenant data-plane rewrite yet.                                                                                                      |
| T2 auth and tenant context             | Done        | tenant-bound token, membership-bound session, select/switch tenant, request context enrichment, disabled tenant/member session invalidation | `tid/mid/am` tokens, `OnlineUserSession` tenant fields, select/switch APIs, request context guard wiring, guard/smoke.                                                                                                         |
| T3 organization and RBAC tenantization | In progress | tenant roles, departments, posts, membership role/post assignment, role permission clipping                                                 | T3a now authenticates from `TenantMembershipRole`/`TenantMembershipPost`, clips permissions by tenant plan modules, and resolves data scope by active membership. Tenant-owned Role/Dept/Post CRUD and unique rewrites remain. |
| T4 core tenant data isolation          | Pending     | dict, config, notice, file, audit/login log, online session isolation                                                                       | Each module needs two-tenant cross-access tests.                                                                                                                                                                               |
| T5 runtime propagation                 | Pending     | Redis namespace, file keys, BullMQ/Scheduler payload/context, Integration provider/outbox/OAuth/WebSocket tenant scope                      | Worker execution must restore tenant context.                                                                                                                                                                                  |
| T6 Admin control plane                 | Pending     | Tenants, Tenant Plans, Members, switcher, platform visit mode                                                                               | Must be live-only, audited, and permission-aligned.                                                                                                                                                                            |
| T7 optional/business migration         | Pending     | collaboration/report/future business model tenantization                                                                                    | Starts only after foundation is proven.                                                                                                                                                                                        |

## Current Round Debt

- T3a fixed auth-time permission derivation, but Role/Dept/Post repositories are still globally keyed.
- Admin tenant selection UI is minimal; full switcher/control plane remains T6.
- Existing System repositories are not tenant-scoped yet.
- Tenant Plans and Members do not have CRUD Admin pages yet.
- Redis, file object keys, queues, Integration, OAuth, WebSocket, and audit scope are not tenant-propagated yet.
