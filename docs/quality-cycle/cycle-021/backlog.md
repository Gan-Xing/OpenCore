# cycle-021 Capability Map Productization Backlog

Started: 2026-06-12

## State Alignment

- [x] Re-read cycle-020 backlog, completion report, ledger and quality-cycle
      state.
- [x] Align `.opencore/quality-cycle/state.json` from documented cycle-020
      completion to active cycle-021 state.
- [x] Record cycle-021 as capability-map productization, not a continuation of
      the BE20 backend self-loop prompt.

## Round 1: core.notice Productization

Why this slice: RuoYi and Yudao both expose system notice management as a
first-class System capability. OpenCore already has the backend package/API
runtime, but SDK/Admin route/access/menu/smoke coverage is incomplete. This is
the lowest-dependency product gap before department/post hardening.

- [x] Add missing detail API contract for system notices.
- [x] Extend `@opencore/sdk` with typed system notice client methods, query
      filters and fixtures.
- [x] Promote `core.notice` to an Admin route/access/menu-checked module.
- [x] Add a live Admin System Notices page with list/detail/current-page export
      plus create/update/publish/archive/delete actions.
- [x] Extend Admin smoke checks to lock the notice route, access binding and SDK
      usage.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 2: core.dept Productization

Why this slice: RuoYi and Yudao both treat department management as a
foundation System capability for user organization and data-scope policy.
OpenCore already has package-owned department runtime and API routes, but the
login-protected Admin loop was missing SDK/Admin route/access/menu/smoke
coverage and a detail read contract.

- [x] Add missing detail API contract for system departments.
- [x] Extend `@opencore/sdk` with typed department tree/detail/export/create/
      update/delete methods and fixtures.
- [x] Promote `core.dept` to an Admin route/access/menu-checked module.
- [x] Add a live Admin Departments page with tree list/detail/current-page
      export plus create/update/delete actions.
- [x] Extend Admin smoke checks to lock department route, access binding, shell
      registry, SDK lifecycle usage and tree page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and live HTTP smoke gates.
- [x] Run full gates, commit and push this independently accepted product
      slice.

## Round 3: core.post Productization

Why this slice: RuoYi and Yudao both keep post/position management beside
department management under System. OpenCore already has package-owned post
runtime and list/export/create/update/delete API routes, but the logged-in
Admin loop was missing a detail read contract, SDK/Admin route/access/menu,
live page and smoke coverage.

- [x] Add missing detail API contract for system posts.
- [x] Extend `@opencore/sdk` with typed post list/detail/export/create/update/
      delete methods and fixtures.
- [x] Promote `core.post` to an Admin route/access/menu-checked module.
- [x] Add a live Admin Posts page with list/detail/current-page export plus
      create/update/delete actions.
- [x] Extend Admin smoke checks to lock post route, access binding, shell
      registry, SDK lifecycle usage and page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused and live HTTP smoke gates.
- [x] Run full gates, commit and push this independently accepted product
      slice.

## Round 4: core.menu Productization

Why this slice: RuoYi and Yudao both make menu management the control plane for
System navigation and button permissions. OpenCore already had package-owned
menu list/export/create/update/delete runtime and `core.menu` Admin shell
metadata, but the logged-in Admin loop was still a read-only registry fixture
and the API/SDK lacked a detail read contract.

- [x] Add missing detail API contract for system menus.
- [x] Extend `@opencore/system` menu repository/service contracts with
      `getMenu` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed menu detail support and nullable
      permission clearing.
- [x] Replace the read-only Admin Menus fixture with a live SDK-backed page for
      list/detail/current-page export plus create/update/delete actions.
- [x] Extend Admin smoke checks to lock menu route, access binding, shell
      registry, SDK lifecycle usage and page behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 5: core.role Productization

Why this slice: RuoYi and Yudao both place role management at the RBAC bridge
between users, permissions, menus and data scope. OpenCore already had
package-owned role list/export/create/update/delete runtime and Admin shell
metadata, but lacked a role detail API/SDK contract, SDK data-scope fields and
a live Admin role management page.

- [x] Add missing detail API contract for system roles.
- [x] Extend `@opencore/system` role repository/service contracts with
      `getRole` for seed and Prisma implementations.
- [x] Extend `@opencore/sdk` with typed role detail support and role
      data-scope fields.
- [x] Replace the read-only Admin Roles fixture with a live SDK-backed page for
      list/detail/current-page export plus create/update/delete actions.
- [x] Add custom data-scope department selection using the admitted department
      tree runtime.
- [x] Extend Admin smoke checks to lock role SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Round 6: core.permission Productization

Why this slice: after role management became live, the next lowest dependency
RBAC gap is the permission catalog itself. Yudao/RuoYi use permission
identifiers through menu, role and user assignment flows rather than as a
separate editable directory, while OpenCore already has a persisted
`Permission.code` table and API writes. The gap was that OpenCore still lacked
permission detail, system/custom metadata, registry permission mutation
protection and a live Admin page.

- [x] Add missing detail API contract for RBAC permissions.
- [x] Mark registry-seeded permissions as `system=true` and custom permissions
      as `system=false` across API, SDK fixtures and OpenAPI.
- [x] Protect registry permissions from update/delete while preserving custom
      permission create/update/delete.
- [x] Replace the read-only Admin Permissions fixture with a live SDK-backed
      page for list/detail/current-page export plus custom create/update/delete
      actions.
- [x] Let the live Roles page load permission options from the permission API so
      custom permissions can be assigned after creation.
- [x] Extend Admin smoke checks to lock permission SDK lifecycle usage and page
      behavior.
- [x] Refresh OpenAPI snapshot and registry route/tag checks.
- [x] Run focused, live HTTP smoke and full gates.
- [x] Commit and push this independently accepted product slice.

## Explicitly Out Of Scope

- Notice read/unread inbox, header badge and per-user read tracking.
- Message bus push, WebSocket delivery or mail/SMS fan-out.
- BPMN/workflow approval around announcements.
- Tenant-scoped notices.
- Department user binding and data-scope assignment UI.
- Batch department deletion or drag-sort persistence.
- User-post binding and user profile post selection.
- Batch post deletion and simple-list option endpoints.
- Menu parent/type/icon/component/status/cache/router-generation expansion.
- Role menu tree assignment, menu cache refresh, save-sort and drag-sort
  persistence.
- Role-user assignment pages, role simple-list endpoints, batch role deletion,
  standalone data-scope endpoint and role status toggle.
- Registry definition editing, dynamic permission discovery, menu-tree role
  assignment, user-role assignment and token permission refresh after permission
  mutation.
- CRM/ERP/MES/WMS/mall/member/pay/AI modules.
