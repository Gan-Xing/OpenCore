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

- No current Cycle-022 tenant-foundation slice remains below the waterline.
- Future CRM/ERP/Mall/AI/payment domains are intentionally not implemented in this cycle and are blocked by admission guards until a future tenant-owned domain plan exists.

Cycle-022 can be described as complete SaaS tenant-foundation V1 for the current OpenCore codebase; future business domains need a new cycle.

## T2 Audit

| Requirement                                           | Status | Notes                                                                                                                                                         |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token and session tenant binding                      | Done   | Tokens carry `tid/mid/am`; `OnlineUserSession` persists `tenantId`, `membershipId`, and `accessMode`.                                                         |
| Bearer request validates tenant/member/session status | Done   | Auth rejects missing/mismatched tenant context and inactive tenant/member state before returning the user.                                                    |
| Request context enrichment                            | Done   | Guards write actor, tenant, membership, and access mode into `AsyncLocalStorage`.                                                                             |
| Select/switch APIs                                    | Done   | Login can return tenant-selection ticket; select/switch reissue tenant-bound tokens; switch revokes old.                                                      |
| Tenant code/domain login resolution                   | Done   | Login accepts optional `tenantCode` and derives host/domain selection from server-observed `X-Forwarded-Host` or `Host`, not from a public body `tenantHost`. |
| Single-mode compatibility                             | Done   | System user creation/update syncs root membership bridges; seed resolves root membership by username.                                                         |
| OpenAPI/SDK/Admin                                     | Done   | Auth DTO/OpenAPI and SDK remove public `tenantHost`; Admin login accepts optional tenant code.                                                                |
| Smoke                                                 | Done   | Tenant auth smoke validates token claims, request context, header tamper resistance, host-derived login, and switch revocation.                               |
| Guard                                                 | Done   | Static tenant auth guard checks schema/token/session/context/API/smoke markers and forbids public `tenantHost` body selectors.                                |

## T3a Audit

| Requirement                        | Status | Notes                                                                                                          |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Membership-derived roles and posts | Done   | Authenticated users prefer `TenantMembershipRole` and `TenantMembershipPost` for active tenant sessions.       |
| Tenant plan permission clipping    | Done   | Registry permissions are clipped by active tenant plan modules before reaching permission guards.              |
| Data scope uses active membership  | Done   | Security data-scope resolution receives the active membership id and uses membership dept/role scope.          |
| OpenAPI/SDK contract               | Done   | Authenticated user DTO/SDK type now includes membership-derived `postCodes`.                                   |
| Smoke/guard                        | Done   | Added `smoke:core-tenant-rbac` and `guard:tenant-rbac`.                                                        |
| Tenant-owned Role/Dept/Post CRUD   | Done   | Closed by T3b/T3c/T3d: Role, Post, and Department repositories are tenant-owned and scoped by request context. |
| Tenant-scoped unique constraints   | Done   | Closed by T3b/T3c/T3d: Role/Post/Dept code uniqueness is tenant-local.                                         |

## T3b Audit

| Requirement                                       | Status | Notes                                                                                                        |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Role ownership by tenant                          | Done   | `Role` now has `tenantId` and belongs to `Tenant`; existing roles backfill to `tenant_root`.                 |
| Role code uniqueness by tenant                    | Done   | Dropped global `Role.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)` for FK enforcement. |
| Membership role cannot cross tenant role owner    | Done   | `TenantMembershipRole(tenantId, roleId)` now references `Role(tenantId, id)`.                                |
| Role repository uses authenticated tenant context | Done   | `PrismaSystemRoleRepository` scopes list/get/create/update/delete through `RequestContext.tenantId`.         |
| Root legacy bridge compatibility                  | Done   | `SystemUser` legacy `UserRole` reads/writes stay pinned to `tenant_root` for single-mode compatibility.      |
| Seed/OpenAPI/SDK/Admin consistency                | Done   | Seed upserts root roles by `(tenant_root, code)`; OpenAPI/SDK shapes are unchanged and drift checks pass.    |
| Smoke/guard                                       | Done   | Added `smoke:core-tenant-role` and `guard:tenant-role-scope`.                                                |
| Tenant-owned Dept/Post CRUD                       | Done   | Closed by T3c/T3d: Post and Department repositories use tenant-local uniqueness and request context.         |
| Non-root membership role/post assignment Admin    | Done   | Closed by T3e/T6c: active-tenant assignment and platform member lifecycle APIs use `TenantMembership*`.      |

## T3c Audit

| Requirement                                       | Status | Notes                                                                                                      |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Post ownership by tenant                          | Done   | `SystemPost` now has `tenantId` and belongs to `Tenant`; existing posts backfill to `tenant_root`.         |
| Post code uniqueness by tenant                    | Done   | Dropped global `SystemPost.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)`.            |
| Membership post cannot cross tenant post owner    | Done   | `TenantMembershipPost(tenantId, postId)` now references `SystemPost(tenantId, id)`.                        |
| Post repository uses authenticated tenant context | Done   | `PrismaSystemPostRepository` scopes list/options/get/create/update/delete/batch/order by `RequestContext`. |
| Root legacy bridge compatibility                  | Done   | `SystemUser` legacy `UserPost` reads/writes stay pinned to `tenant_root` for single-mode compatibility.    |
| Seed/OpenAPI/SDK/Admin consistency                | Done   | Seed upserts root posts by `(tenant_root, code)`; OpenAPI/SDK/Admin shapes are unchanged and remain live.  |
| Smoke/guard                                       | Done   | Added `smoke:core-tenant-post` and `guard:tenant-post-scope`.                                              |
| Tenant-owned Department CRUD                      | Done   | Closed by T3d: department tree ownership and code uniqueness are tenant-local.                             |
| Non-root membership role/post assignment Admin    | Done   | Closed by T3e/T6c: non-root assignments use membership bridges rather than legacy `UserPost`.              |

## T3d Audit

| Requirement                                             | Status | Notes                                                                                                                                     |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Department ownership by tenant                          | Done   | `SystemDept` now has `tenantId` and belongs to `Tenant`; existing departments backfill to `tenant_root`.                                  |
| Department code uniqueness by tenant                    | Done   | Dropped global `SystemDept.code` uniqueness and added `(tenantId, code)` plus `(tenantId, id)`.                                           |
| Department tree cannot cross tenant parent ownership    | Done   | Migration adds `SystemDept(tenantId, parentId)` FK to `SystemDept(tenantId, id)`; repository parent lookup is scoped by `RequestContext`. |
| Membership department cannot cross tenant ownership     | Done   | Migration adds `TenantMembership(tenantId, deptId)` FK to `SystemDept(tenantId, id)`.                                                     |
| Department repository uses authenticated tenant context | Done   | `PrismaSystemDeptRepository` scopes tree/options/get/create/update/order/delete by `RequestContext`.                                      |
| Root legacy bridge compatibility                        | Done   | `SystemUser` legacy `User.deptId` validation/subtree filters and seed user departments stay pinned to `tenant_root`.                      |
| RBAC data-scope department lookup                       | Done   | Role custom data-scope department validation and RBAC descendant lookup are scoped to the active tenant.                                  |
| Seed/OpenAPI/SDK/Admin consistency                      | Done   | Seed upserts root departments by `(tenant_root, code)`; OpenAPI/SDK/Admin shapes are unchanged and remain live.                           |
| Smoke/guard                                             | Done   | Added `smoke:core-tenant-dept` and `guard:tenant-dept-scope`.                                                                             |
| Non-root membership role/post assignment Admin          | Done   | Closed by T3e/T6c: active-tenant assignment and member lifecycle APIs validate role/post ownership per tenant.                            |

## T3e Audit

| Requirement                                      | Status | Notes                                                                                                                       |
| ------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Active tenant member list API                    | Done   | `GET /api/core/tenancy/members` lists memberships for `RequestContext.tenantId` with user, dept, role, and post summaries.  |
| Active tenant member assignment API              | Done   | `PATCH /api/core/tenancy/members/:membershipId/assignments` updates status, department, roles, and posts for that tenant.   |
| No trusted client tenant selector                | Done   | The new controller has no query/header tenant selector and service resolves tenant via `getRequestContext()`.               |
| Cross-tenant assignment rejection                | Done   | Service validates membership, department, role, and post ownership in the active tenant before replacing assignments.       |
| Root legacy bridge compatibility                 | Done   | Root tenant assignment syncs `User.enabled`, `User.deptId`, `UserRole`, and `UserPost` for existing single-mode screens.    |
| OpenAPI/SDK/Admin consistency                    | Done   | OpenAPI exports member DTOs; SDK adds list/update calls; `/system/tenants` edits current-tenant assignments from live APIs. |
| Smoke/guard                                      | Done   | Added `smoke:core-tenant-member` and `guard:tenant-member-assignment`, both wired into local/deploy smoke scripts.          |
| Tenant Member CRUD/invitation and switcher Admin | Done   | Later closed by T6c Tenant Member lifecycle and T6d Admin tenant switcher.                                                  |

## T3f Audit

| Requirement                       | Status | Notes                                                                                                                                |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Menu surfaces follow tenant plan  | Done   | `SystemMenuService` filters global Menu metadata by the authenticated user's `enabledModuleCodes` before list/detail/export results. |
| Role-menu assignment follows plan | Done   | `SystemRoleService` uses the same filtered menu list, so disabled-module menu keys cannot be assigned through role-menu APIs.        |
| No Menu tenant row ownership      | Done   | `Menu` remains global product metadata; tenant isolation is enforced by plan/module filtering rather than duplicating menu rows.     |
| Admin consistency                 | Done   | Admin menu and role-menu pages already consume live APIs, so their visible menu options are clipped by the tenant-bound token.       |
| Smoke/guard                       | Done   | `smoke:core-menu` covers a limited tenant plan that excludes `core.user`; `guard:tenant-rbac` locks the filter markers.              |

## T3g / T4i Root-Only Legacy User Org Bridges

| Requirement                     | Status | Notes                                                                                                                                            |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Legacy User department boundary | Done   | `User.legacyDeptTenantId` is root-only checked and `User(legacyDeptTenantId, deptId)` references `SystemDept(tenantId, id)`.                     |
| Legacy UserRole boundary        | Done   | `UserRole.tenantId` defaults to `tenant_root`, is root-only checked, and references `Role(tenantId, id)`.                                        |
| Legacy UserPost boundary        | Done   | `UserPost.tenantId` defaults to `tenant_root`, is root-only checked, and references `SystemPost(tenantId, id)`.                                  |
| Service compatibility           | Done   | Root System User writes and root TenantMember sync paths keep legacy bridge rows root-pinned while non-root assignments use `TenantMembership*`. |
| Smoke/guard                     | Done   | `guard:tenant-legacy-user-org`, focused `system-user` tests, and `smoke:core-user` cover foreign tenant dept/role/post rejection.                |

## T6a Tenant Plan Control Plane

| Requirement                   | Status | Notes                                                                                                                            |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Live Tenant Plan APIs         | Done   | Added list/detail/create/update/delete under `/api/core/tenancy/plans` with `platform:tenant-plan:*` permissions.                |
| Module registry validation    | Done   | Plan module codes are normalized, deduplicated, and checked against `listModules()` before writes.                               |
| In-use delete guard           | Done   | Delete blocks assigned plans and reports tenant usage instead of removing plans still referenced by tenants.                     |
| No trusted tenant selector    | Done   | Create/update DTOs and controller paths have no client-controlled tenant selector; plan control is platform-scoped.              |
| OpenAPI/SDK/Admin consistency | Done   | OpenAPI exports plan DTOs; SDK exposes typed plan CRUD calls; `/system/tenants` uses live plan APIs for list/create/edit/delete. |
| Smoke/guard                   | Done   | Added `smoke:core-tenant-plan` and `guard:tenant-plan-control-plane`, both wired into local/deploy smoke scripts.                |
| Remaining T6 scope            | Done   | Later closed by T6b/T6c/T6d/T6e/T6f.                                                                                             |

## T6b Tenant Lifecycle Control Plane

| Requirement                   | Status | Notes                                                                                                                                       |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Live Tenant lifecycle APIs    | Done   | Added list/detail/create/update/status under `/api/core/tenancy/tenants` with `platform:tenant:*` permissions and no hard-delete route.     |
| Field and plan validation     | Done   | Tenant code, slug, status, account limit, expiry, and optional plan code are normalized and validated before writes.                        |
| Root tenant safety            | Done   | Root tenant code/slug cannot be changed and root tenant cannot be suspended or expired.                                                     |
| No trusted tenant selector    | Done   | Create/update DTOs and controller paths have no client-controlled tenant selector; tenant control is platform-scoped.                       |
| OpenAPI/SDK/Admin consistency | Done   | OpenAPI exports tenant DTOs; SDK exposes typed tenant lifecycle calls; `/system/tenants` uses live APIs for tenant list/create/edit/status. |
| Smoke/guard                   | Done   | Added `smoke:core-tenant-lifecycle` and `guard:tenant-lifecycle-control-plane`, both wired into local/deploy smoke scripts.                 |
| Remaining T6 scope            | Done   | Later closed by T6c/T6d/T6e/T6f.                                                                                                            |

## T6c Tenant Member Lifecycle Control Plane

| Requirement                       | Status | Notes                                                                                                                                  |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Live Tenant Member APIs           | Done   | Added list/create/update/soft-remove under `/api/core/tenancy/tenants/:tenantId/members` with `platform:tenant-member:*` permissions.  |
| Existing/new user invitation      | Done   | Member create accepts existing `userId`/`username` or creates a new global user with forced password change before adding membership.  |
| Lifecycle and assignment controls | Done   | Member status supports `invited`, `active`, `suspended`, and `left`; updates validate tenant-owned dept/role/post assignments.         |
| Safety guards                     | Done   | Service enforces tenant account limits, rejects duplicate active memberships, and blocks removing/suspending the last active owner.    |
| No trusted tenant selector        | Done   | Tenant control is bound to the platform path parameter; create/update DTOs have no body/query/header tenant selector.                  |
| OpenAPI/SDK/Admin consistency     | Done   | OpenAPI exports member lifecycle DTOs; SDK exposes tenant member lifecycle calls; `/system/tenants` opens a live member control modal. |
| Smoke/guard                       | Done   | Added `smoke:core-tenant-member-lifecycle` and `guard:tenant-member-control-plane`, both wired into local/deploy smoke scripts.        |
| Remaining T6 scope                | Done   | Later closed by T6d/T6e/T6f.                                                                                                           |

## T6d Admin Tenant Switcher

| Requirement                   | Status | Notes                                                                                                                                        |
| ----------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Visible multi-tenant switcher | Done   | Admin header renders `TenantSwitcher` only when the authenticated user has more than one tenant option.                                      |
| Server token reissue          | Done   | Switcher calls SDK `switchTenant` through `switchOpenCoreTenant`, persists the returned token, and never mutates tenant context client-side. |
| Tenant state reload           | Done   | Admin updates current user/permission state and reloads the page so tenant-scoped screens refetch with the new bearer token.                 |
| Smoke/guard                   | Done   | Added `smoke:core-tenant-switcher` and `guard:tenant-switcher`, both wired into local/deploy smoke scripts.                                  |
| Remaining T6 scope            | Done   | Later closed by T6e/T6f.                                                                                                                     |

## T6e Platform Visit Mode

| Requirement                    | Status | Notes                                                                                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Explicit platform visit API    | Done   | Added `POST /api/auth/platform-visit` behind `platform:tenant:visit`.                                                                         |
| Server-resolved tenant context | Done   | The request accepts tenant id/code selectors, but the service resolves the tenant through the repository and validates status before signing. |
| Membership-less visit token    | Done   | Platform visit tokens carry `accessMode: 'platform-visit'` and target `tenantId` without creating or requiring `TenantMembership`.            |
| Bearer/session validation      | Done   | Bearer auth validates target tenant status, online sessions allow missing membership only for platform visit, and `/auth/me` preserves mode.  |
| OpenAPI/SDK/Admin consistency  | Done   | OpenAPI exports the request DTO, SDK exposes `visitTenantAsPlatform()`, and `/system/tenants` includes an active-tenant visit action.         |
| Smoke/guard                    | Done   | Added `smoke:core-platform-visit` and `guard:platform-visit`, both wired into local/deploy smoke scripts.                                     |
| Remaining T6 scope             | Done   | Platform visit audit was later closed by T6f.                                                                                                 |

## T6f Platform Visit Audit

| Requirement                 | Status | Notes                                                                                                                                        |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated audit row         | Done   | Successful platform visits write `AuditLog` rows with `action=platform-visit` and `resource=auth.platform-visit`.                            |
| Target tenant ownership     | Done   | The audit row `tenantId` and `resourceId` are the visited tenant id, so audit list/detail/export stays inside existing tenant audit scope.   |
| Reason and request context  | Done   | Audit metadata stores reason and target tenant identifiers; standard fields store actor, request id, IP, location, user agent, and duration. |
| No unaudited returned token | Done   | If the dedicated audit write fails, the newly issued platform-visit token is revoked before the error is returned.                           |
| Smoke/guard                 | Done   | `smoke:core-platform-visit` verifies the target-tenant audit row and `guard:platform-visit` locks audit wiring markers.                      |
| Remaining T6 scope          | Done   | T6 Admin control plane is closed.                                                                                                            |

## T7a Collaboration Messages

| Check                            | Status | Evidence                                                                                                                                   |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Message tenant ownership         | Done   | `CollaborationMessage.tenantId` is backfilled to `tenant_root`, defaults to root, and is constrained to `Tenant`.                          |
| Tenant-prefixed message indexes  | Done   | Recipient/status, sender, business, and deleted indexes now include `tenantId` first.                                                      |
| Repository tenant isolation      | Done   | Collaboration message summary/list/detail/create/read/archive/delete resolve the active tenant from `RequestContext` with root fallback.   |
| Cross-tenant API rejection       | Done   | `smoke:core-collaboration-messages` seeds a foreign tenant message and proves root-scope list/detail/read/archive/delete cannot access it. |
| Seed/OpenAPI/SDK/Admin           | Done   | Seed message rows, `MessageDto`, SDK `MessageSummary`, and Admin Messages expose `tenantId`.                                               |
| Smoke/guard                      | Done   | Added `guard:tenant-collaboration-message-scope`; existing collaboration message smoke now covers foreign-tenant message isolation.        |
| Remaining T7 optional data scope | Done   | Later closed by T7b/T7c/T7d/T7e/T7f.                                                                                                       |

## T7b Collaboration Notices

| Check                            | Status | Evidence                                                                                                                             |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Notice tenant ownership          | Done   | `CollaborationNotice.tenantId` is backfilled to `tenant_root`, defaults to root, and is constrained to `Tenant`.                     |
| Tenant-prefixed notice indexes   | Done   | Status/date and creator/date indexes now include `tenantId` first.                                                                   |
| Repository tenant isolation      | Done   | Collaboration notice summary/list/detail/create/publish/archive resolve the active tenant from `RequestContext` with root fallback.  |
| Cross-tenant API rejection       | Done   | `smoke:core-collaboration-notices` seeds a foreign tenant notice and proves root-scope list/detail/publish/archive cannot access it. |
| Seed/OpenAPI/SDK/Admin           | Done   | Seed notice rows, `NoticeDto`, SDK `NoticeSummary`, and Admin Notices expose `tenantId`.                                             |
| Smoke/guard                      | Done   | Added `guard:tenant-collaboration-notice-scope`; existing collaboration notice smoke now covers foreign-tenant notice isolation.     |
| Remaining T7 optional data scope | Done   | Later closed by T7c/T7d/T7e/T7f.                                                                                                     |

## T7c Collaboration Todos

| Check                            | Status | Evidence                                                                                                                                 |
| -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Todo tenant ownership            | Done   | `CollaborationTodo.tenantId` is backfilled to `tenant_root`, defaults to root, and is constrained to `Tenant`.                           |
| Tenant-prefixed todo indexes     | Done   | Assignee/status/date, source/status, and business indexes now include `tenantId` first.                                                  |
| Repository tenant isolation      | Done   | Collaboration todo summary/list/detail/create/assign/complete/cancel resolve the active tenant from `RequestContext` with root fallback. |
| Cross-tenant API rejection       | Done   | `smoke:core-collaboration-todos` seeds a foreign tenant todo and proves root-scope list/detail/assign/complete/cancel cannot access it.  |
| Seed/OpenAPI/SDK/Admin           | Done   | Seed todo rows, `TodoDto`, SDK `TodoSummary`, and Admin Todos expose `tenantId`.                                                         |
| Smoke/guard                      | Done   | Added `guard:tenant-collaboration-todo-scope`; existing collaboration todo smoke now covers foreign-tenant todo isolation.               |
| Remaining T7 optional data scope | Done   | Later closed by T7d/T7e/T7f.                                                                                                             |

## T7d Collaboration Approval Lite

| Check                            | Status | Evidence                                                                                                                                  |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Approval Lite tenant ownership   | Done   | `CollaborationApprovalLite.tenantId` is backfilled to `tenant_root`, defaults to root, and is constrained to `Tenant`.                    |
| Tenant-prefixed approval indexes | Done   | Requester/status/date, approver/status/date, and business indexes now include `tenantId` first.                                           |
| Repository tenant isolation      | Done   | Collaboration approval-lite summary/list/detail/create/approve/reject resolve the active tenant from `RequestContext` with root fallback. |
| Cross-tenant API rejection       | Done   | `smoke:core-collaboration-approvals` seeds a foreign tenant approval and proves root-scope list/detail/approve/reject cannot access it.   |
| Seed/OpenAPI/SDK/Admin           | Done   | Seed approval rows, `ApprovalLiteDto`, SDK `ApprovalLiteSummary`, and Admin Approvals expose `tenantId`.                                  |
| Smoke/guard                      | Done   | `guard:tenant-collaboration-approval-scope` passed and public collaboration approval smoke verified foreign-tenant approval isolation.    |
| Remaining T7 optional data scope | Done   | Later closed by T7e/T7f.                                                                                                                  |

## T7e ReportDefinition

| Check                             | Status | Evidence                                                                                                                   |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| ReportDefinition tenant ownership | Done   | `ReportDefinition.tenantId` is backfilled to `tenant_root`, defaults to root, and is constrained to `Tenant`.              |
| Tenant-local report code          | Done   | `ReportDefinition.code` uniqueness is now `(tenantId, code)` and enabled/owner lookup is tenant-prefixed.                  |
| Repository tenant isolation       | Done   | Operations summary/list/detail/create resolve the active tenant from `RequestContext` with root fallback.                  |
| Cross-tenant API rejection        | Done   | `smoke:core-operations-reports` seeds a foreign tenant report and proves root-scope list/detail cannot access it.          |
| Seed/OpenAPI/SDK/Admin            | Done   | Seed report rows, `ReportDefinitionDto`, SDK `ReportDefinitionSummary`, and Admin Reports expose `tenantId`.               |
| Smoke/guard                       | Done   | `guard:tenant-report-definition-scope` passed and public operations report smoke verified foreign-tenant report isolation. |
| Remaining T7 optional data scope  | Done   | T7f business-domain admission guard closes current-codebase scope; future domains require a new cycle.                     |

## T7f Business-Domain Admission

| Check                                 | Status | Evidence                                                                                                                                          |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No current unadmitted business models | Done   | Current Prisma schema has no CRM/ERP/Mall/AI/payment business-domain models to tenantize in Cycle-022.                                            |
| Registry admission guard              | Done   | Module registry keeps `industry.crm`, `industry.erp`, `industry.mall`, `integration.pay`, and `ai.*` out of the current SaaS foundation registry. |
| OpenForge admission guard             | Done   | Manual schema validation rejects forbidden P4/P5 business module inputs before generated code can enter the repo.                                 |
| Docs/guard                            | Done   | `guard:tenant-business-domain-admission` locks schema, registry, OpenForge, and Cycle-022 doc markers.                                            |

## T4a Audit

| Requirement                         | Status | Notes                                                                                                                        |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Online session tenant isolation     | Done   | Monitor list/detail/summary/cleanup/kick-out now resolve the tenant from `RequestContext`, falling back to `tenant_root`.    |
| Auth token validation remains valid | Done   | Session registration, bearer token validation, and token revocation remain token-scoped so auth does not depend on UI scope. |
| Cross-tenant monitor rejection      | Done   | Prisma integration test and public smoke prove foreign-tenant sessions are hidden, skipped, and not cleaned from root scope. |
| Seed/SDK/Admin consistency          | Done   | Seed and SDK fixtures include root tenant fields; Admin Online Users exposes access mode, tenant id, and membership id.      |
| OpenAPI consistency                 | Done   | Online-session DTO already includes tenant fields; no endpoint shape change was required.                                    |
| Smoke/guard                         | Done   | Added `guard:tenant-online-user-scope`; existing `smoke:core-online-user` now covers foreign-tenant session isolation.       |
| Config/notice/file scope            | Done   | Later closed by T4d/T4e/T4f/T4g/T4i.                                                                                         |

## T4b Audit

| Requirement                    | Status | Notes                                                                                                                             |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Login log tenant ownership     | Done   | `LoginLog.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                               |
| Repository tenant isolation    | Done   | Login-log list/detail/export/delete/clean use `RequestContext.tenantId` with `tenant_root` fallback.                              |
| Login attempt tenant recording | Done   | Successful session/self/social login events can carry the selected session tenant; public failures retain root fallback.          |
| Cross-tenant API rejection     | Done   | Prisma integration test and smoke prove foreign-tenant login logs are hidden, cannot be detailed/deleted, and survive root clean. |
| Seed/OpenAPI/SDK/Admin         | Done   | Seed login logs, DTO, SDK summary fixture, and Admin Login Logs expose `tenantId`.                                                |
| Smoke/guard                    | Done   | Added `guard:tenant-login-log-scope`; `smoke:core-login-log` now covers foreign-tenant login-log isolation.                       |
| Remaining log scope            | Done   | Platform visit audit was completed in T6f; username lockout scope was completed in T4h.                                           |

## T4h Login Lockouts

| Check                             | Status | Evidence                                                                                                                                                                |
| --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LoginLockout tenant ownership     | Done   | `LoginLockout.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                                                                 |
| Tenant-local username lockout key | Done   | Failed-login counters are unique by `(tenantId, username)`, so the same global user can be locked in one tenant without locking another.                                |
| Server-resolved tenant selector   | Done   | Login lockout resolution uses the server-side auth repository tenant lookup for `tenantCode`/host/id selectors and root fallback only when no selector is present.      |
| Current-tenant unlock             | Done   | `/core/login-logs/unlock` clears only the authenticated bearer tenant's lockout record for the username.                                                                |
| OpenAPI/SDK                       | Done   | Unlock result DTO and SDK summary expose `tenantId`.                                                                                                                    |
| Smoke/guard                       | Done   | Local deploy and public `smoke:core-login-log` cover root-vs-tenant lockout isolation; `guard:tenant-login-log-scope` locks schema, repository, smoke, and SDK markers. |
| Remaining T4 data scope           | Done   | Later closed by T4i root-only legacy bridge and current core/system ownership audit.                                                                                    |

## T4c Audit

| Requirement                      | Status | Notes                                                                                                                             |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Operation audit tenant ownership | Done   | `AuditLog.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                               |
| Repository tenant isolation      | Done   | Audit-log list/detail/export/delete/retention clean use `RequestContext.tenantId` with `tenant_root` fallback.                    |
| Write operation tenant recording | Done   | Interceptor-created write audit rows are stored under the active request tenant through repository fallback.                      |
| Cross-tenant API rejection       | Done   | Prisma integration test and smoke prove foreign-tenant audit logs are hidden, cannot be detailed/deleted, and survive root clean. |
| Seed/OpenAPI/SDK/Admin           | Done   | Seed audit logs, DTO, SDK summary fixture, and Admin Operation Logs expose `tenantId`.                                            |
| Smoke/guard                      | Done   | Added `guard:tenant-operation-log-scope`; `smoke:core-audit-log` now covers foreign-tenant operation-audit isolation.             |
| Remaining audit scope            | Done   | Later closed by T6f platform visit audit.                                                                                         |

## T4d Dictionaries

| Requirement                 | Status | Notes                                                                                                                        |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Dictionary tenant ownership | Done   | `DictType.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                          |
| Tenant-code uniqueness      | Done   | Dictionary code uniqueness is now `(tenantId, code)`, allowing the same dictionary code in different tenants.                |
| Repository tenant isolation | Done   | Dictionary type/item list/detail/export/create/update/delete/recycle/import/translation/simple-list use `RequestContext`.    |
| Cross-tenant API rejection  | Done   | Prisma integration test and smoke prove foreign-tenant dictionaries are hidden, cannot be mutated, and survive root actions. |
| Seed/OpenAPI/SDK/Admin      | Done   | Seed dictionary rows, DTOs, SDK summaries/fixtures, and Admin Dicts expose `tenantId`.                                       |
| Smoke/guard                 | Done   | Added `guard:tenant-dict-scope`; `smoke:core-dict` now covers foreign-tenant dictionary isolation.                           |
| Remaining T4 data scope     | Done   | Later closed by T4e/T4f/T4g/T4i.                                                                                             |

## T4e System Config

| Requirement                   | Status | Notes                                                                                                                                          |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Config tenant ownership       | Done   | `SystemConfig.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                                        |
| Tenant-key uniqueness         | Done   | System config key uniqueness is now `(tenantId, key)`, allowing the same config key in different tenants.                                      |
| Override and secret ownership | Done   | `SystemConfigEnvironmentOverride` and `SystemConfigSecretVersion` carry tenant id and reference the same-tenant config row.                    |
| Repository tenant isolation   | Done   | Config CRUD, batch delete, value/runtime reads, cache refresh, exports, overrides, secret versions, and vault operations use `RequestContext`. |
| Cache tenant isolation        | Done   | `SystemConfigService` value-cache keys include tenant id so same-key tenant values do not bleed across requests.                               |
| Cross-tenant API rejection    | Done   | Prisma integration test and smoke prove foreign-tenant config rows are hidden, cannot be mutated, and survive root actions.                    |
| Seed/OpenAPI/SDK/Admin        | Done   | Seed config rows, DTOs, SDK summaries/fixtures, export previews, and Admin Config expose `tenantId`.                                           |
| Smoke/guard                   | Done   | Added `guard:tenant-config-scope`; `smoke:core-config` now covers foreign-tenant config isolation.                                             |
| Remaining T4 data scope       | Done   | Later closed by T4f/T4g/T4i.                                                                                                                   |

## T4f File Assets

| Check                         | Status | Evidence                                                                                                                                         |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| File asset tenant ownership   | Done   | `FileAsset.tenantId` is backfilled to `tenant_root`, required, indexed, and constrained to `Tenant`.                                             |
| Tenant storage-key uniqueness | Done   | File asset storage key uniqueness is now `(tenantId, storageKey)`, allowing tenant-local object-key ownership.                                   |
| Repository tenant isolation   | Done   | File list/detail/export/create/update/delete resolve the active tenant from `RequestContext` with `tenant_root` fallback.                        |
| Object key tenant prefix      | Done   | New system file asset keys are generated under `runtime/tenant/<tenantId>/file-assets/...`.                                                      |
| Cross-tenant API rejection    | Done   | Prisma integration test and smoke prove foreign-tenant file rows are hidden and cannot be read, downloaded, updated, or deleted from root scope. |
| Seed/OpenAPI/SDK/Admin        | Done   | Seed file rows, DTOs, SDK summaries/fixtures, export previews, and Admin Files expose `tenantId`.                                                |
| Smoke/guard                   | Done   | Added `guard:tenant-file-scope`; `smoke:core-file` now covers foreign-tenant file isolation.                                                     |
| Remaining T4 data scope       | Done   | Later closed by T4g/T4i.                                                                                                                         |

## T4g System Notices

| Check                          | Status | Evidence                                                                                                                                                   |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notice tenant ownership        | Done   | `SystemNotice`, `SystemNoticeTemplate`, `SystemNoticeReadReceipt`, and `SystemNoticeDelivery` are backfilled to `tenant_root` and constrained to `Tenant`. |
| Tenant-local notice uniqueness | Done   | Notice templates use `(tenantId, code)` uniqueness; read receipts and deliveries include tenant id in their uniqueness.                                    |
| Repository tenant isolation    | Done   | Notice list/detail/lifecycle/delete, inbox/read receipt, delivery, and template paths resolve the active tenant from `RequestContext`.                     |
| Tenant delivery fanout         | Done   | Notice dispatch recipients are active memberships in the notice tenant instead of all global enabled users.                                                |
| Cross-tenant API rejection     | Done   | Prisma integration test and smoke prove foreign-tenant notice/template/delivery/receipt rows are hidden and survive root actions.                          |
| Seed/OpenAPI/SDK/Admin         | Done   | Seed notice rows, DTOs, SDK summaries/fixtures, export previews, and Admin Notices expose `tenantId`.                                                      |
| Smoke/guard                    | Done   | Added `guard:tenant-notice-scope`; `smoke:core-notice` now covers foreign-tenant notice isolation.                                                         |
| Remaining T4 data scope        | Done   | Later closed by T4i current core/system ownership audit.                                                                                                   |

## T5a Scheduler Runtime Propagation

| Check                               | Status | Evidence                                                                                                                   |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Scheduler tenant ownership          | Done   | `JobDefinition` and `JobRunLog` are backfilled to `tenant_root`, constrained to `Tenant`, and keyed by `(tenantId, code)`. |
| Scheduler API tenant isolation      | Done   | Monitor job summary/list/detail/mutation/dispatch/claim/run-clean paths resolve the active tenant from `RequestContext`.   |
| Worker tenant context restoration   | Done   | `SchedulerJobExecutor` wraps handler execution in tenant request context and stamps run metadata with `tenantId`.          |
| Tenant-scoped retention side effect | Done   | The audit-log retention handler deletes only audit rows for the scheduler run tenant.                                      |
| Cross-tenant worker rejection       | Done   | Prisma integration test and smoke prove root job APIs and worker claim do not see or consume foreign-tenant queued runs.   |
| Seed/OpenAPI/SDK/Admin              | Done   | Seed scheduler rows, DTOs, SDK summaries/fixtures, and Admin Jobs expose `tenantId`.                                       |
| Smoke/guard                         | Done   | Added `guard:tenant-scheduler-scope`; `smoke:core-monitor-jobs` covers foreign-tenant scheduler isolation.                 |
| Remaining T5 runtime scope          | Done   | T5f completed the broader runtime parity audit and aligned seed monitor-cache behavior with Prisma tenant-prefix behavior. |

## T5e Integration Provider/Outbox/OAuth Runtime Scope

| Check                               | Status | Evidence                                                                                                                                       |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Integration tenant ownership        | Done   | Provider, provider audit, template, outbox, OAuth token, OAuth flow, and OAuth callback audit rows carry `tenantId` and constrain to `Tenant`. |
| Tenant-local Integration identities | Done   | Provider/template codes are unique per tenant; OAuth tokens are unique per `(tenantId, providerCode, subjectId, providerAccountId)`.           |
| Repository tenant isolation         | Done   | Integration provider/template/outbox/OAuth list/detail/mutation paths resolve the active tenant from request context.                          |
| OAuth callback tenant restoration   | Done   | Callback processing reads the globally unique flow `state` and writes token/audit/flow updates using the stored flow tenant.                   |
| Cross-tenant API rejection          | Done   | Prisma integration test and smokes prove foreign Integration outbox/token rows are hidden from root API context and preserved.                 |
| Seed/OpenAPI/SDK                    | Done   | Seed rows, DTOs, SDK summaries/fixtures, and OpenAPI Integration schemas expose tenant ownership.                                              |
| Smoke/guard                         | Done   | Added `guard:tenant-integration-scope`; Integration health/OAuth smokes cover tenant fields and foreign-row isolation.                         |
| Remaining T5 runtime scope          | Done   | T5f completed the broader runtime parity audit; no additional T5 production runtime gap was found beyond seed monitor-cache parity.            |

## T5f Runtime Parity Audit

| Check                          | Status | Evidence                                                                                                                            |
| ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Raw runtime surface audit      | Done   | Reviewed Redis, File/object, BullMQ, Scheduler, WebSocket, and Integration/OAuth runtime calls after T5a-T5e.                       |
| Seed monitor-cache parity      | Done   | `SeedOperationsRepository` now resolves active tenant context and normalizes cache keys/prefixes into `opencore:tenant:{tenantId}`. |
| Cross-tenant seed cache hiding | Done   | Focused operations repository test proves root cannot read foreign seed cache and foreign tenant can read it through logical key.   |
| Guard coverage                 | Done   | `guard:tenant-redis-scope` now checks seed repository tenant normalization and the foreign seed cache fixture.                      |
| Remaining runtime foundation   | Done   | T5 runtime propagation is closed; T6 control plane and T7 optional/business admission are closed for Cycle-022.                     |
