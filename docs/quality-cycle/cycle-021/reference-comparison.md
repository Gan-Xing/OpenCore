# cycle-021 Reference Comparison

Date: 2026-06-12

## Reference Revisions

- RuoYi-Vue remote HEAD checked: `41720e624c5a668c7d3777835e4c87095a7a1dfd`.
- Yudao / ruoyi-vue-pro remote HEAD checked:
  `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`.
- Local Yudao Admin checkout checked: `/home/ubuntu/dev/yudao-ui-admin-vue3`.

## RuoYi Notice Shape

RuoYi places notice management under System as "通知公告". The reference shape
includes:

- System menu entry and button-level permissions for query/add/edit/remove.
- List filters by title/operator/type/status.
- Detail/read view.
- Create, update and delete actions.
- Seeded notice type/status dictionaries and seeded notice rows.
- Additional read-status/header badge features.

OpenCore does not copy the Vue/Java/MyBatis implementation. The admitted shape
for this round is the management loop only: list/detail/create/update/delete and
publish/archive lifecycle.

## Yudao Notice Shape

Yudao keeps notice management under System and exposes:

- Page query, detail, create, update, delete and batch delete APIs.
- A form dialog for title/content/type/status.
- A push action.
- Separate in-site notify template/message capabilities.

OpenCore keeps push/in-site delivery out of this round. Publish/archive remains
an internal lifecycle action and does not imply WebSocket, mail, SMS or inbox
fan-out.

## OpenCore TS/NestJS Product Choice

- Use existing `@opencore/system` runtime and Prisma model.
- Add the missing detail read contract instead of adding read-status tables.
- Keep action permissions aligned to existing `core:notice:*` codes.
- Promote `/system/notices` through module-registry Admin metadata so
  `registry:admin-routes:check` can prevent future drift.
- Use `@opencore/sdk` as the Admin data boundary; no generated Umi OpenAPI chain
  and no vulnerable `mockjs` / `@umijs/openapi` dependency chain.

## Round 2 Department Reference Shape

RuoYi keeps department management under System as a tree table with list,
detail, create, update, delete, exclude-child parent selection and sort-saving
support. The permission shape is query/add/edit/remove and the form includes
parent, name, order, leader, phone, email and status.

Yudao keeps department management under System with simple-list, list/detail,
create, update, delete and batch delete APIs. The Admin form provides parent
selection and the standard department metadata fields.

OpenCore admits the core management loop only:

- tree list, detail, current-page export, create, update and delete;
- parent selection that excludes the edited department and its descendants;
- delete protection for departments that still have children.

OpenCore does not admit batch delete, drag-sort persistence, user binding,
data-scope configuration, tenant hierarchy or workflow/business integration in
this round.

## Round 3 Post Reference Shape

RuoYi keeps post management under System as a table CRUD capability with list,
export, detail, create, update, delete and option-select APIs. The permission
shape is list/query/add/edit/remove/export, and the form includes code, name,
sort, status and remark. RuoYi also uses posts in user assignment through a
user-post relation.

Yudao keeps post management under System with page, simple-list, detail, create,
update, delete, batch delete and export APIs. Its Admin page exposes filters for
name, code and status, plus create/update/delete/export operations.

OpenCore admits the core management loop only:

- paged list, detail, current-page export, create, update and delete;
- stable `code` identity for detail/update/delete, matching the existing
  OpenCore post runtime;
- logged-in Admin route/access/shell/page and smoke coverage.

OpenCore does not admit user-post binding, user form integration, simple-list
option endpoints, batch delete or data-scope expansion in this round.

## Round 4 Menu Reference Shape

RuoYi keeps menu management under System as a tree table with list, detail,
tree-select, role-menu tree-select, create, update, sort update and delete
operations. Its form covers parent menu, type, icon, display order, menu name,
route name/path/component, permission, query string, cache, visible and status
fields. Delete is guarded against child menus and role assignment.

Yudao keeps menu management under System with simple-list, list/detail, create,
update and delete APIs. Its Admin page exposes a virtual tree table, create/
update/delete actions, status controls and menu cache refresh, with form fields
for parent, type, icon, path, component, permission, sort, status, visible,
keepAlive and alwaysShow.

OpenCore admits the bounded management loop that matches the current
package-owned data model:

- flat list, detail, current-page export, create, update and delete;
- stable `key` identity for detail/update/delete;
- nullable `permissionCode` update so operators can unbind a menu from a
  permission;
- logged-in Admin page and smoke coverage through the existing
  `core.menu` route/access/shell metadata.

OpenCore does not admit tree parent/type/icon/component/status/cache fields,
dynamic router generation, role menu tree assignment, cache refresh, save-sort,
drag-sort persistence or Prisma schema expansion in this round.

## Round 5 Role Reference Shape

RuoYi keeps role management under System with list, export, detail, create,
update, data-scope update, status change, delete, role-all, assigned-user,
unassigned-user, cancel assignment, batch cancel, select-all assignment and
dept-tree APIs. Its Admin page exposes filters for role name/key/status, table
actions for create/update/delete/export, a role form with menu permission tree,
a data-permission dialog and a role-user assignment route.

Yudao keeps role management under System with page, simple-list, detail,
create, update, delete, batch delete and export APIs. Its Admin page exposes
role CRUD plus dedicated menu assignment and data-permission forms.

OpenCore admits the bounded management loop that matches the current
package-owned role model:

- list, detail, current-page export, create, update and delete;
- stable `code` identity for detail/update/delete;
- permission-code assignment through the existing registry-seeded permission
  catalog;
- data-scope update through the existing `all/custom/dept_tree/own_dept/self`
  model, with custom departments selected from the admitted department tree;
- system-role delete protection.

OpenCore does not admit role-user assignment, role menu-tree assignment,
simple-list endpoints, batch delete, separate data-scope update endpoints,
status toggles or token permission refresh semantics in this round.

## Round 6 Permission Reference Shape

RuoYi-style permission management is primarily expressed through menu records,
button permission identifiers and role/user assignment flows. The system menu
form owns the permission string, and role management assigns menu permissions
through a tree rather than editing a standalone permission catalog.

Yudao keeps `/system/permission` as an assignment control plane: list a role's
menus, assign role menus, assign role data scope, list a user's roles and
assign user roles. Its Admin side shows permission identifiers in menu
management and uses dedicated role/user assignment dialogs.

OpenCore already has a different admitted model: a persisted
`Permission.code` catalog seeded from `@opencore/module-registry`, then used by
roles, menus, guards and Admin access. Round 6 admits the bounded management
loop that matches that model:

- list, detail, current-page export, create, update and delete for permissions;
- stable `code` identity for detail/update/delete;
- `system=true` for registry-seeded permissions and `system=false` for custom
  permissions;
- mutation protection for registry permissions so core route/menu/access
  contracts cannot be deleted from Admin;
- live role permission options sourced from the permission API.

OpenCore does not admit registry definition editing, dynamic permission
discovery, role menu-tree assignment, user-role assignment, cache/menu refresh
or token permission refresh semantics in this round.

## Round 7 User Reference Shape

RuoYi keeps user management under System with page list, export, import
template/import, detail, create, update, delete, reset password, status change,
department tree filtering, role assignment and profile/avatar endpoints. Its
Admin page combines a department side tree, table filters, user form, role/post
selection and operation buttons guarded by system user permissions.

Yudao keeps user management under System with page, detail, create, update,
delete, export, import, password reset, status update, profile/avatar/social
capabilities, simple-list style option use and role/post/department assignment
flows. Its Admin form uses department and role selectors and separates some
assignment/profile operations into dedicated APIs and dialogs.

OpenCore admits the bounded loop that matches the current package-owned user
model:

- list, detail, current-page export, create, update and delete for users;
- stable `id` identity for detail/update/delete;
- role-code assignment through the existing live role runtime;
- optional `deptId` selection through the admitted department tree runtime;
- `enabled` and password fields in the same create/update model already owned
  by `@opencore/system`;
- `system=true` metadata for the seeded administrator and update/delete
  protection for that administrator.

OpenCore does not admit Excel import workflows, reset-password/status-toggle
endpoints, dedicated user-role assignment dialogs, profile/avatar/social
endpoints, post binding, batch delete, department side-tree filtering,
simple-list expansion or token/session refresh semantics in this round.

## Round 8 Dictionary Reference Shape

RuoYi keeps dictionary management under System with separate dictionary type and
dictionary data surfaces. The reference shape includes type page/list/detail,
create, update, delete and export; data page/list/detail, create, update,
delete and export; status fields; dictionary data labels/values/sort; and
seeded option dictionaries used by other System forms.

Yudao keeps the same broad split between dictionary type and dictionary data.
Its API shape includes page/list/detail/create/update/delete for both type and
data, batch delete in selected flows, export support, simple-list/cache-facing
dictionary APIs, status handling and richer data metadata such as color type,
CSS class and remark fields.

OpenCore admits the bounded management loop that matches the current
package-owned dictionary model:

- list, detail, current-page export, create, update and delete for dictionary
  types;
- stable `code` identity for detail/update/delete;
- embedded dictionary item editing inside the dictionary type form;
- logged-in Admin page and smoke coverage through the existing
  `core.dict` route/access/shell metadata.

OpenCore does not admit a separate dict-data module/page/endpoints,
simple-list/cache endpoints, batch delete, Excel import/export file workflows,
color/css/remark fields, app public dictionary endpoints or dictionary cache
refresh in this round.

## Round 9 Config Reference Shape

RuoYi keeps parameter management under System with list, export, detail by ID,
value lookup by config key, create, update, delete and cache-refresh
operations. Its model uses config ID, name, key, value, type and remark fields,
with permissions for list/query/add/edit/remove/export/cache refresh.

Yudao keeps configuration management under Infra with page, detail,
get-value-by-key, create, update, delete, batch delete and export APIs. Its
model includes category, name, key, value, type, visibility, remark and create
time. Value lookup rejects invisible configs.

OpenCore admits the bounded loop that matches the current package-owned config
model:

- list, detail, current-page export, create, update and delete for system
  config records;
- stable `key` identity for detail/update/delete;
- `valueType` and `visibility` handling through the existing
  `@opencore/system` runtime;
- secret-key enforcement and `[REDACTED]` response semantics in API, SDK and
  Admin detail/edit flows;
- fixed-port local smoke and deploy commands so config CRUD can be verified
  against both a temporary API and the deployed local service.

OpenCore does not admit cache refresh, public get-value-by-key APIs, batch
delete, Excel file export, category/name/remark schema expansion, secret
vault/KMS integration or runtime feature-flag propagation in this round.

## Round 10 File Reference Shape

RuoYi's standard reference tree checked in this round does not expose a
standalone file-center management page in the sparse system module, but its
common upload path treats file handling as infrastructure around upload,
storage key and returned access URL metadata.

Yudao keeps file management under Infra. The Admin reference exposes file page
query, delete, batch delete, presigned upload and upload flows, with filters for
path, MIME type and create time plus preview, download and copy-link actions.
The backend reference exposes upload, presigned URL creation, create metadata,
detail, delete, batch delete and download endpoints. The response model
includes id, config id, path, name, URL, MIME type, size and create time.

OpenCore admits the bounded management loop that matches the current
package-owned metadata model:

- list, detail, current-page export, create, update and delete for file asset
  metadata;
- stable `id` identity for detail/update/delete;
- SDK-backed Admin page with live metadata CRUD and fallback fixtures only when
  the API is unavailable;
- fixed-port smoke and deploy scripts that verify file metadata after login;
- public Admin deploy that binds to `0.0.0.0` and builds against the server
  public API URL.

OpenCore does not admit binary upload, presigned upload/download URLs,
storage-provider configuration, public download/preview/copy-link workflows,
batch delete or object-browser expansion in this round.
