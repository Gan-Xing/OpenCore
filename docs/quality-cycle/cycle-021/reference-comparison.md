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

OpenCore Round 2 admitted the core management loop only:

- tree list, detail, current-page export, create, update and delete;
- parent selection that excludes the edited department and its descendants;
- delete protection for departments that still have children.

Round 27 later admits the enabled-department simple-list option source consumed
by Admin Users. OpenCore still does not admit batch delete, drag-sort
persistence, deeper user-binding workflows, data-scope configuration, tenant
hierarchy or workflow/business integration in these rounds.

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
Round 17 later closes the role menu-tree assignment and role-permission session
revocation portion of this gap. Round 18 later closes the role-user assignment
and user-role session revocation portion. Round 20 later closes the role status
and role mutation session-revocation portion.

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
Round 17 later closes the role menu-tree assignment and role-permission session
revocation portion of this gap. Round 18 later closes the role-user assignment
and user-role session revocation portion.

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
Round 19 later closes the reset-password/status-toggle endpoint gap and direct
user-mutation token/session refresh semantics.

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
Round 21 later closes the item-management and public simple-list consumer
portion of this gap with an equivalent `/core/dicts/:code/items` API and
`/core/dict-data/simple-list` endpoint.

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
vault/KMS integration or runtime feature-flag propagation in this round. Round
24 later closes public value-by-key plus service cache refresh/invalidation.

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

## Round 11 Login Log Reference Shape

RuoYi keeps login-log management under System/Monitor security operations. Its
standard shape centers on login information query, export, delete/clean and
unlock-oriented operations, with filters such as username, IP address, status
and login time.

Yudao keeps login logs under System. The Admin reference exposes page query,
export and row detail. Its response model includes ID, log type, trace ID, user
identity fields, username, result/status, IP, user agent and create time. The
backend reference exposes page, export and detail routes guarded by
`system:login-log:query` and `system:login-log:export`.

OpenCore admits the bounded loop that matches the current immutable audit
model:

- list, detail and current-page export for login-log records;
- stable `id` identity for detail;
- authenticated Admin page with live read-only rows and detail drawer;
- smoke coverage that performs a failed login, waits for the audit row, reads
  detail and exports the filtered current page;
- deploy hardening that embeds the public Admin API base URL and proxies
  same-origin Admin `/api/*` requests to the API.

OpenCore does not admit login-log deletion/cleanup, user unlock,
lockout-policy/session actions, location/device enrichment, server-side
date-range filters or schema expansion for logType/result/user-agent fields in
this round.

## Round 12 Operation Log Reference Shape

RuoYi keeps operation-log management under Monitor as an operator audit surface.
Its reference shape includes list, export, detail, delete and clean operations,
with filters such as module title, operator, business type, status and operation
time. The Admin page exposes row detail so a maintainer can inspect request
metadata after an operator action.

Yudao keeps operate logs under System. The backend reference exposes detail,
page query and export routes guarded by operation-log query/export permissions.
Its response model includes trace ID, user identity, type/subtype, business ID,
action, extra data, request method, request URL, IP, user agent and create time.

OpenCore admits the bounded loop that matches the current immutable audit
model:

- list, detail and current-page export for operation-log records;
- stable `id` identity for detail;
- authenticated Admin page with live read-only rows and detail drawer;
- smoke coverage that creates a temporary config through `POST /api/core/config`
  and proves the global audit interceptor recorded the write operation;
- deploy hardening that treats `ADMIN_API_BASE_URL` as the API origin and
  rejects `/api`-suffixed values before a browser can emit `/api/api` requests.

OpenCore does not admit operation-log deletion/cleanup, batch delete,
duration/location/user-agent schema expansion, operation type enum expansion,
async queue/indexing or business-domain audit timeline views in this round.

## Round 13 Online User Reference Shape

RuoYi keeps online-user management under Monitor. Its reference controller
exposes an online user list filtered by IP address and username, and a
force-logout action guarded by a dedicated forceLogout permission. The Admin
page shows token/session ID, username, department, host/IP, location, browser,
OS and login time, with a row-level strong-kick action.

Yudao models the comparable operational action through OAuth2 token
management. Its Admin page lists access tokens by user/client metadata and
exposes delete/logout actions; the backend routes call the auth service logout
flow for the selected access token. It also includes batch token deletion in
the broader reference shape.

OpenCore admits the bounded loop that matches the current package-owned online
session model:

- list, detail and permission-gated kick-out for online sessions;
- stable `id` identity for detail/kick-out;
- a dedicated non-admin seed session, `session_operator`, for smoke kick-out;
- authenticated Admin page with live rows, detail drawer, current-page export
  and sensitive token/revocation fields;
- smoke coverage that kicks `session_operator`, verifies repeat kick-out is
  rejected and confirms `session_admin` remains active;
- deploy hardening that retires old service workers and normalizes stale
  `/api/api/*` Admin proxy requests while still rejecting newly built bundles
  that contain duplicated API prefixes.

OpenCore does not admit OAuth client/token administration, batch token/session
deletion, JWT blacklist enforcement, browser/OS parsing, IP geolocation,
server-side date filters, location fields or online-user export endpoint
expansion in this round.

## Round 14 Online User Revocation Reference Shape

RuoYi force logout is operationally meaningful because the selected online user
is removed from the active token/session view and subsequent protected access
must fail. Its page also shows browser and OS metadata beside IP and login
time, so an operator can choose the correct device/session before forcing
logout.

Yudao's comparable OAuth2 token management deletes selected access tokens
through the auth service. The reference shape treats token deletion as a real
security action, not merely an audit annotation, and includes batch-oriented
token management in the broader Admin workflow.

OpenCore admits the stage-2 productization loop that matches its current
package-owned online-session model:

- bearer tokens carry a `jti` token ID and expiry metadata;
- successful logins register online sessions with token ID, username, IP, user
  agent, last-seen and expiry fields;
- bearer authentication checks the online-session repository and rejects
  revoked or expired sessions;
- list/detail rows expose browser and OS parsed from user agent data;
- Admin supports selected-row batch kick-out in addition to row-level kick-out;
- smoke logs in twice, batch-kicks the second real token and proves `/auth/me`
  rejects it with 401.

OpenCore still does not admit OAuth client administration, a standalone JWT
blacklist separate from the online-session store, IP geolocation/location
enrichment, server-side date filters or a dedicated online-user export
endpoint in this round.

## Round 15 File Content Reference Shape

Yudao keeps file management under Infra with upload, presigned upload,
download, delete and metadata page flows. Its file center is not just a table
of metadata: a user can create stored content and later retrieve or preview it
from the management surface.

RuoYi's common file handling similarly treats upload as an infrastructure
boundary that returns stored file metadata and a retrievable URL/path. The
important shared product expectation is that file metadata points to a real
stored object, not a placeholder row.

OpenCore admits the stage-2 loop that matches its existing package-owned file
storage boundary:

- `POST /core/files/upload` accepts authenticated JSON base64 content, decodes
  it and writes the bytes through `FileStorageService`;
- upload creates metadata using the stored object's generated `storageKey`;
- `GET /core/files/:id/download` reads metadata, loads bytes from storage and
  sends a binary response with MIME and attachment filename headers;
- deleting a file asset deletes the stored object before deleting metadata;
- metadata edits preserve `storageKey` so renames do not detach rows from
  object content;
- Admin File Center supports browser file selection, upload and row-level
  download;
- smoke proves that downloaded content exactly matches uploaded content.

OpenCore still does not admit presigned URL flows, public copy links,
storage-provider configuration UI, batch delete, object browser expansion or
image/video preview tooling in this round.

## Round 16 Menu Tree Metadata Reference Shape

RuoYi and Yudao both treat menu management as the Admin navigation and
permission-control plane, not just a flat route list. The reference shape
includes parent/child tree organization, menu type, icon, route component,
visibility/status and cache flags. Their broader products also connect menu
trees to role assignment workflows and route generation boundaries.

OpenCore admits the stage-2 loop that matches its current registry-owned route
model:

- registry menus now derive deterministic directory parents and leaf route
  metadata;
- persisted menus carry `parentKey`, `type`, `icon`, `component`, `status`,
  `cache` and `hidden` fields;
- Prisma enforces a parent relation and repository logic rejects self-parent,
  parent cycles and deletion of menus that still have children;
- update semantics distinguish omitted `parentKey` from `parentKey: null`, so
  clients can preserve or clear a parent intentionally;
- Admin Menus renders a tree table, parent `TreeSelect`, add-child action and
  status/cache/hidden controls;
- fixed-port smoke creates parent and child menus, verifies the delete guard,
  clears a parent with `null` and checks seed route metadata.

OpenCore still does not admit drag-sort/save-sort, menu cache refresh
endpoints, runtime router generation or dynamic registry editing in this
round. Role menu-tree assignment is handled by the following Round 17 role
authorization loop.

## Round 17 Role Menu Assignment Reference Shape

RuoYi exposes a role menu tree workflow through menu-tree selection endpoints
that return checked menu keys for a role. Yudao exposes the same product shape
through permission endpoints that list a role's menu ids and assign menus to a
role, alongside user-role assignment APIs.

OpenCore admits the matching stage-2 loop within its registry-owned permission
catalog:

- `GET /api/core/roles/:code/menus` returns the role's checked menu keys, the
  available menu metadata, menu-bound permission codes and preserved non-menu
  permission codes;
- `PATCH /api/core/roles/:code/menus` accepts menu keys, maps them to the
  menus' permission codes and preserves non-menu permission codes such as
  action-level grants;
- the API revokes active online-user sessions for every user currently holding
  the changed role, so old bearer sessions cannot continue after RBAC mutation;
- Admin Roles adds a row-level Menu Assignment tree dialog backed by SDK methods
  instead of hand-written request paths;
- fixed-port and public smoke prove menu assignment, preserved non-menu
  permissions, revoked old token 401 and relogin permission refresh.

OpenCore still does not admit role status toggle, batch role operations,
separate user-page role assignment or user reset-password/status mutation
semantics in this round. Round 20 later closes the role status and disabled-role
auth filtering portion.

## Round 18 Role User Assignment Reference Shape

RuoYi exposes role-user assignment as assigned-user, unassigned-user, cancel,
batch cancel and select-all assignment flows from role management. Yudao exposes
equivalent role/user assignment through permission APIs that list a user's roles
and assign roles to users.

OpenCore admits the matching stage-3 loop from the role management side:

- `GET /api/core/roles/:code/users` returns assigned and available users for a
  role;
- `PATCH /api/core/roles/:code/users` replaces the normal-user assignments for
  that role;
- malformed payloads, duplicate user IDs, missing users and system users are
  rejected before mutation;
- the API revokes active online-user sessions only for users whose role
  assignment changed, so old bearer sessions cannot continue with stale
  `roleCodes` or `permissionCodes`;
- Admin Roles adds a row-level User Assignment transfer dialog backed by SDK
  methods;
- fixed-port and public smoke prove unassign, assign, revoked old token 401 and
  relogin role/permission refresh.

OpenCore still does not admit role status toggle, batch role operations or
separate user-page role assignment in this round. Round 19 closes the
reset-password/status mutation semantics and direct user-mutation session
refresh portion from the user-management side. Round 20 closes the role status
and role mutation session-revocation portion.

## Round 19 User Security Mutation Reference Shape

RuoYi exposes user status change and reset-password actions directly from user
management. Yudao exposes equivalent user status update and password-reset
operations, with role/department/post/profile flows as adjacent but separate
user product depth.

OpenCore admits the matching stage-2 loop for direct user security mutation:

- `PATCH /api/core/users/:id/status` toggles a normal user's enabled state
  through a dedicated request contract;
- `POST /api/core/users/:id/reset-password` changes a normal user's password
  through a dedicated reset contract instead of overloading the edit form;
- direct `PATCH /api/core/users/:id` and `DELETE /api/core/users/:id` also
  revoke that user's active online-user sessions;
- mutation responses include `revokedSessionCount` so operators can see the
  security effect;
- Admin Users adds row-level status toggles, a reset-password dialog and
  revoked-session feedback;
- fixed-port, deploy and public smoke prove disabled users cannot log in, old
  tokens receive 401 after status/reset/update/delete, and the old password no
  longer works after reset;
- runtime validators reject malformed status payloads such as string booleans,
  so deserialization issues are covered by tests instead of operator memory.

OpenCore still does not admit post binding, profile/avatar/social endpoints,
Excel import/export workflows, batch user delete, separate User-page role
assignment or broader user option endpoints in this round. Round 22 later
closes the post binding portion, and Round 23 later closes department
side-tree filtering.

## Round 20 Role Status Security Reference Shape

RuoYi exposes role status changes as a basic role management operation. Yudao's
role management model also carries role status through create/update/list
flows, and disabled roles are expected to stop contributing authorization
state.

OpenCore admits the matching stage-4 loop for role status and role mutation
security effects:

- roles now persist an `enabled` boolean and expose it through API, SDK, seed,
  OpenAPI and Admin;
- `PATCH /api/core/roles/:code/status` toggles role status through a strict
  boolean request contract;
- system roles cannot be disabled, so an operator cannot lock out the
  bootstrap administrator path;
- disabled roles are filtered out of login `roleCodes`, permission aggregation
  and data-scope role calculations while keeping management-side assignments
  visible;
- role status, direct role update and role delete mutations return
  `revokedSessionCount` and revoke affected active online-user sessions;
- Admin Roles adds status filtering, status display, enable/disable controls
  and revoked-session feedback;
- fixed-port, deploy and public smoke prove stale tokens receive 401 after
  disable/enable/update/delete, disabled roles are omitted from auth results
  and permissions return after re-enabling plus relogin.

OpenCore still does not admit role batch operations, a separate standalone
data-scope endpoint, role simple-list endpoints or separate user-page role
assignment in this round.

## Round 21 Dict Item Data Reference Shape

RuoYi keeps dictionary type and dictionary data as separate System surfaces.
The data side has list/detail/create/update/delete, label/value/sort/status
fields and type-based option lookup used by other forms.

Yudao also splits dictionary type from dictionary data. Its backend exposes
dictionary data page/detail/create/update/delete/export and a simple-list style
consumer endpoint, while its Admin store caches simple dictionary data for
form option usage.

OpenCore admits the matching stage-2 loop while preserving its current
`DictType` plus item model:

- `GET /api/core/dict-data/simple-list` is a public consumer endpoint with
  optional `dictCode` filtering;
- the consumer endpoint returns only enabled items from enabled dictionary
  types;
- `GET/POST/PATCH/DELETE /api/core/dicts/:code/items` gives operators an
  item-level management API without forcing a separate Admin route;
- strict runtime normalization rejects malformed item booleans and sort
  values before mutation;
- Admin Dicts adds a row-level `Dictionary Items` modal for item CRUD and shows
  how many enabled items are visible to simple-list consumers;
- fixed-port, deploy and public smoke prove item CRUD, malformed boolean 400,
  public simple-list consumption and disabled item/type filtering.

OpenCore still does not admit dictionary batch delete, Excel import/export file
workflows, color/css/remark metadata, app-wide dictionary cache TTL/
invalidation or a separate dictionary-data Admin page in this round.

## Round 22 User Post Binding Reference Shape

RuoYi user management exposes post assignment in the user create/edit form
beside department and role controls. Yudao's user form follows the same
operator shape through `postIds`, loaded from a simple post option list.

OpenCore admits the matching stage-3 loop while preserving its current
code-based SDK/API contract:

- users now persist a many-to-many relation to system posts through `UserPost`;
- user summaries expose `postCodes`, and create/update requests accept
  `postCodes`;
- seed data binds the bootstrap admin to the seeded `admin` post;
- Admin Users loads live `core.post` options and renders post tags in the
  table/detail, plus a multi-select in create/edit forms;
- export previews include post assignments;
- runtime validation rejects duplicate and unknown post codes;
- fixed-port, deploy and public smoke prove unknown-post rejection,
  create-time `engineer` binding and update-time clearing.

OpenCore still does not admit profile/avatar/social endpoints, Excel
import/export workflows, batch user delete, standalone user simple-list
endpoints or a separate User-page role-assignment dialog in this round. Round
23 later closes department side-tree filtering.

## Round 23 User Department Tree Filter Reference Shape

RuoYi renders a department tree beside the user table. Clicking a node assigns
`queryParams.deptId` and reloads the user list, while the backend expands the
selected department to its descendants by checking the department ancestor
chain.

Yudao's Admin user page follows the same shape with a `DeptTreeSelect`
node-click handler that assigns `queryParams.deptId`; the backend expands the
selected department to child departments plus itself before applying the user
query.

OpenCore admits the matching stage-4 loop:

- `GET /api/core/users` and `GET /api/core/users/export` accept optional
  `deptId`;
- seed and Prisma repositories reject unknown department IDs and filter users
  by selected department plus descendants;
- SDK request types and OpenAPI snapshots expose the query parameter;
- Admin Users renders a left Department scope tree from live `core.dept`,
  supports All departments reset and applies the selected scope to live list
  loading;
- fallback data is also filtered by subtree when the live API is unavailable;
- fixed-port, deploy and public smoke prove unknown-department rejection,
  direct department filtering, headquarters subtree inclusion and unrelated
  engineering exclusion.

OpenCore still does not admit profile/avatar/social endpoints, Excel
import/export workflows, batch user delete, standalone user simple-list
endpoints or a separate User-page role-assignment dialog in this round.

## Round 24 Config Value Cache Reference Shape

RuoYi system config exposes `/system/config/configKey/{configKey}` for reading
a config value by key. Its service reads from Redis first, populates the cache
on misses, updates cache entries during insert/update/delete and exposes
`refreshCache` to clear and reload all config values.

Yudao infra config exposes `/infra/config/get-value-by-key?key=...` and its
Admin consumers call `ConfigApi.getConfigKey(...)` for runtime URLs such as
Swagger, Druid and SkyWalking. Yudao also blocks invisible config values from
being returned to frontend consumers.

OpenCore admits the matching stage-2 loop inside its current config model:

- `GET /api/core/config/get-value-by-key?key=...` returns only
  `visibility=public` values;
- private and secret config values are blocked from the public consumer;
- `SystemConfigService` keeps a public value cache and returns cached public
  values on repeat reads;
- create/update/delete invalidates the affected cached key;
- `POST /api/core/config/refresh-cache` rebuilds the public value cache and is
  guarded by `core:config:update`;
- Admin Config adds `Refresh cache` and public row `Read public value by key`;
- fixed-port, deploy and public smoke prove value-by-key, update invalidation,
  refresh-cache and secret-value 403.

OpenCore still does not admit category/name/remark schema expansion, batch
config delete, Excel file export, secret vault/KMS integration or broad
runtime feature-flag propagation in this round.

## Round 25 Post Simple-list Reference Shape

Yudao system post management exposes a simple-list option endpoint under the
post API, and its user form calls that endpoint to populate post assignment
options. The option source is separate from paginated post management.

RuoYi user management also treats post options as part of the user form
workflow; the user init/detail response carries available posts alongside role
and department data.

OpenCore admits the matching stage-2 loop while preserving its code-based post
contract:

- `GET /api/core/posts/simple-list` is a public consumer endpoint for enabled
  post options;
- the endpoint returns lightweight `{ code, name, order }` records sorted by
  order and name;
- disabled posts remain visible to management list filters but are omitted
  from the consumer option source;
- `@opencore/sdk` exposes `listPostOptions()` and Admin platform wraps it as
  `listOpenCoreSystemPostOptions()`;
- Admin Users uses that option source for post name maps and create/edit
  multi-select choices;
- fixed-port, deploy and public smoke prove disabled-post filtering, enabled
  option inclusion, lightweight option shape and cleanup.

OpenCore still does not admit batch post deletion, drag-sort/order persistence
or broader post assignment batch workflows in this round.

## Round 26 Login Log Device Filter Reference Shape

RuoYi monitor login-info exposes filters for IP address, username, status and
login-time range, and its table shows login location, browser, OS, message and
login time. It also offers cleanup and unlock actions that belong to a later
policy stage.

Yudao system login-log exposes `username`, `userIp`, `status` and `createTime`
filters. Its Admin list/detail shows `userIp`, raw `userAgent`, result and
create time.

OpenCore admits the matching stage-2 loop without adding storage columns:

- login-log summaries now derive `browser` and `os` from the recorded
  `userAgent`;
- the shared parser lives in `@opencore/common` and is reused by
  `monitor.online-user`;
- `GET /api/core/login-logs` and `/export` accept `ip`, `createdFrom` and
  `createdTo` in addition to username/result;
- malformed date filters return 400, and reversed ranges are rejected before
  repository access;
- Admin Login Logs adds server-side username/IP/result/time controls and shows
  Browser/OS in table/detail/export;
- fixed-port, deploy and public smoke prove Chrome/Windows device parsing,
  server-side IP/time filters, future-window exclusion, invalid-date guard and
  export device columns.

OpenCore still does not admit login-log cleanup/delete, user unlock,
lockout-policy tuning, IP geolocation, session termination from login logs or
login-type/result schema expansion in this round.

## Round 27 Department Simple-list Reference Shape

Yudao system department management exposes `/system/dept/simple-list` and
`/system/dept/list-all-simple` for lightweight enabled-department options. Its
role data-permission form loads the simple list and turns it into a tree before
rendering department checkboxes.

RuoYi user and role workflows also treat department options as basic form data:
user management exposes department trees for filtering and editing, and role
data-scope workflows expose department trees for custom data permissions.

OpenCore admits the matching stage-2 option-source loop while preserving the
existing department management tree:

- `GET /api/core/depts/simple-list` is a public consumer endpoint for enabled
  department options;
- the endpoint returns lightweight `{ id, name, parentId, order }` records
  sorted by order and name;
- disabled departments remain visible to management list filters but are
  omitted from the consumer option source;
- `@opencore/sdk` exposes `listDeptOptions()` and Admin platform wraps it as
  `listOpenCoreSystemDeptOptions()`;
- Admin Users uses that option source for the create/edit department selector,
  while the left Department scope filter still uses the full management tree;
- fixed-port, deploy and public smoke prove disabled-department filtering,
  enabled option inclusion, lightweight option shape and cleanup.

OpenCore still does not admit custom role data-scope department assignment,
batch department deletion, drag-sort/order persistence, tenant department
hierarchies or workflow/business binding in this round.

## Round 28 User Self-profile Reference Shape

RuoYi exposes the current user's profile under `/system/user/profile`, with
basic profile read/update, password update and avatar upload as one user-center
surface.

Yudao exposes the same product shape through user profile endpoints for
profile get/update and update-password, with the Admin user-center page acting
on the current authenticated account instead of the user-management table.

OpenCore admits the matching stage-5 foundation loop while preserving its
current user schema:

- `GET /api/core/users/profile` returns the current authenticated user's user
  summary without requiring a management permission;
- `PATCH /api/core/users/profile` updates only the current user's
  `displayName`;
- the new auth-only guard is explicit, so `/auth/me` and profile endpoints are
  not coupled to an unrelated dashboard permission;
- system-user management protection remains in place for
  `PATCH /api/core/users/:id`;
- Admin adds `/personal/profile` behind the Avatar menu and shows identity,
  department, roles and posts plus a display-name edit form;
- fixed-port, deploy and public smoke prove profile read/update, `/auth/me`
  display-name refresh, invalid display-name 400 and system-user management
  update rejection.

OpenCore still does not admit avatar upload, self password update, email/phone
profile fields, social account binding, user import/export file workflows,
batch user deletion or a standalone user simple-list endpoint in this round.

## Round 29 User Self-password Reference Shape

RuoYi exposes self-service password change under
`/system/user/profile/updatePwd`. The reference controller reads
`oldPassword/newPassword`, verifies the old password against the current
account, rejects a new password that matches the current password, writes the
new password hash and refreshes the cached login user.

Yudao exposes the same product shape under
`/system/user/profile/update-password`. Its request carries
`oldPassword/newPassword`, validates both fields and verifies the old password
before updating the current user's password.

OpenCore admits the matching stage-6 security loop while preserving its
current session model:

- `PATCH /api/core/users/profile/password` is an auth-only current-user
  endpoint;
- the endpoint accepts `oldPassword/newPassword`;
- seed and Prisma repositories verify the old password hash and reject
  same-password updates;
- successful updates write the new password hash and revoke the current user's
  active online-user sessions;
- Admin `/personal/profile` adds a `Change password` form and clears the local
  bearer token after success so the operator signs in again;
- fixed-port, deploy and public smoke prove wrong old password 401, same
  password 400, successful update, stale token 401, old password blocked and
  new password login.

OpenCore still does not admit avatar upload, email/phone profile fields,
social account binding, user import/export file workflows, batch user deletion
or a standalone user simple-list endpoint in this round.

## Round 30 User Simple-list Reference Shape

Yudao exposes enabled-user option sources under `/system/user/simple-list` and
`/system/user/list-all-simple`. The backend returns lightweight user records
for frontend dropdowns and supports an optional `deptId` filter. Its Admin
side uses `getSimpleUserList()` in reusable user selector components and
workflow/business forms rather than forcing every consumer to fetch the full
user management list.

RuoYi exposes the same product need through role authorization user selection:
allocated and unallocated user lists, plus select/cancel actions, are part of
the role-user assignment workflow.

OpenCore admits the matching stage-7 option-source loop while preserving a
privacy boundary for people data:

- `GET /api/core/users/simple-list` requires bearer authentication but does
  not require `core:user:read`;
- the endpoint supports `deptId` and follows OpenCore's already admitted
  department-subtree filtering semantics;
- only enabled users are returned;
- the returned shape is lightweight
  `{ id, username, displayName, deptId, postCodes }`;
- `roleCodes`, `enabled` and `system` stay out of the option payload;
- Admin Roles User Assignment consumes `listOpenCoreUserOptions()` for transfer
  labels while role assignment state continues to come from the role-user
  assignment API;
- fixed-port, deploy and public smoke prove auth guard 401, unknown-department
  404, department filtering, disabled-user filtering, enabled-user re-entry and
  option shape.

OpenCore still does not admit avatar upload, email/phone profile fields,
social account binding, user import/export file workflows, batch user deletion
or a dedicated User-page role assignment dialog in this round.

## Round 31 User Profile Avatar Reference Shape

RuoYi exposes current-user avatar upload as a dedicated profile endpoint:
`POST /system/user/profile/avatar` accepts an `avatarfile`, writes image
content through its upload utility, updates the current user's avatar path,
deletes the old avatar file and refreshes the cached login user.

Yudao carries `avatar` on the current-user profile response/update shape. Its
profile update accepts an avatar URL as part of current-user profile data,
while password change remains a separate current-user endpoint.

OpenCore admits the matching stage-8 loop by combining those two shapes inside
its existing file-storage boundary:

- `POST /api/core/users/profile/avatar` is an authenticated current-user
  endpoint that accepts `originalName/mimeType/contentBase64`;
- the upload path validates file name, base64, max size, allowed image MIME and
  magic bytes before storage;
- the image bytes are stored through `FileStorageService`, not in the user row;
- user rows persist `avatarUrl`, internal `avatarStorageKey`, MIME, size and
  update time;
- public user summary/profile/auth records expose `avatarUrl` and public
  metadata but never expose storage keys;
- `GET /api/core/users/:id/avatar` is a public read-only preview endpoint for
  browser image tags and Admin same-origin proxy previews;
- `DELETE /api/core/users/profile/avatar` clears the current user's avatar and
  removes the stored object;
- fixed-port, deploy and public smoke prove auth guard, malformed MIME/base64
  rejection, byte-for-byte public download, `/auth/me` avatar refresh,
  deletion cleanup and Admin same-origin preview.

OpenCore still does not admit email/phone profile fields, social account
binding, Excel import/export workflows, batch user deletion or a dedicated
User-page role assignment dialog in this round.

## Round 32 User Batch Mutation Reference Shape

RuoYi exposes user batch deletion through `DELETE /system/user/{userIds}` and
uses a separate `changeStatus` endpoint for user status changes. Yudao exposes
the same product shape with `DELETE /system/user/delete-list` for batch delete
and `PUT /system/user/update-status` for status mutation. Both products also
carry Excel import/export on the user management surface, but file parsing and
template workflows are a separate, higher-dependency slice.

OpenCore admits the matching stage-9 batch mutation loop while preserving the
session-revocation semantics added in earlier user rounds:

- `PATCH /api/core/users/batch/status` accepts `{ userIds, enabled }` and is
  guarded by `core:user:update`;
- `DELETE /api/core/users/batch` accepts `{ userIds }` and is guarded by
  `core:user:delete`;
- both endpoints are static routes before dynamic `users/:id` routes;
- empty arrays, duplicate IDs, missing users and system users are rejected
  before mutation;
- Prisma batch delete runs in a transaction across `userRole`, `userPost` and
  `user`;
- both batch status and batch delete revoke active online sessions for all
  affected usernames;
- Admin Users exposes row selection with system users disabled and toolbar
  actions for `Enable selected`, `Disable selected` and `Delete selected`;
- fixed-port, deploy and public smoke prove batch guards, token revocation,
  login blocking, Admin bundle markers, duplicate `/api/api` login tolerance
  and Admin same-origin proxy access.

OpenCore still does not admit native XLSX/binary Excel import/export depth,
email/phone profile fields, social account binding or a dedicated User-page
role assignment dialog in this round.

## Round 33 User Import Reference Shape

RuoYi exposes user import beside export on the System User surface:
`/system/user/importTemplate` downloads a template, `/system/user/importData`
accepts uploaded user rows and returns operator-facing success/failure
messages, and `/system/user/export` remains the paired export workflow.

Yudao exposes the same management surface with `/system/user/get-import-template`
and `/system/user/import`. Its import response reports created usernames,
updated usernames and failed usernames so operators can act on partial import
results rather than treating the file as all-or-nothing.

OpenCore admits the matching stage-10 import loop while preserving current
permissions and file-format boundaries:

- `GET /api/core/users/import-template` returns a base64 CSV template named
  `opencore-system-users-import-template.csv`;
- `POST /api/core/users/import` accepts base64 CSV content with fixed columns
  `username`, `displayName`, `password`, `roleCodes`, `deptId`, `postCodes`
  and `enabled`;
- both endpoints are static routes before `users/:id` and are guarded by
  `core:user:create`;
- blank department and post cells mean no binding, while role/post code lists
  use semicolon delimiters;
- file-level base64/header/empty-file failures return 400, while row-level
  validation errors are collected into `failures` so other rows can succeed;
- `updateExisting` must be a real boolean, preventing the repeated
  string-boolean deserialization drift from reappearing;
- updating existing users revokes those usernames' active online-user sessions;
- Admin Users now supports downloading the template, selecting a CSV, toggling
  update-existing and reviewing created/updated/failed results;
- fixed-port, deploy and public smoke prove template download, strict
  boolean-guard failure, partial result handling, update-session revocation,
  enabled-user filtering and public Admin bundle/proxy access.

OpenCore still does not claim native XLSX/binary Excel import/export depth,
server-side full Excel export formatting, a dedicated `core:user:import`
permission or a dedicated User-page role assignment dialog in this round.

## Round 34 User Import Permission Reference Shape

Yudao guards its user import endpoint with
`@ss.hasPermission('system:user:import')`, separate from user creation. That
matches the operator expectation that creating one user and bulk importing
many users are different grantable actions.

RuoYi's user management surface also treats import as a dedicated user-table
operation beside export and add/edit/delete, even though its permission naming
uses the RuoYi `add/edit/remove/export` convention around the broader page.

OpenCore admits the matching stage-11 permission loop:

- `PermissionAction` now includes `import`;
- only `core.user` registers `core:user:import`, so import is not globally
  added to unrelated CRUD modules;
- Prisma seed upserts `core:user:import` through the registry and assigns it
  to the seeded admin role;
- `GET /api/core/users/import-template` and `POST /api/core/users/import` are
  both guarded by `core:user:import`;
- Admin access exposes `canImportUsers`;
- Admin Users disables template download and import buttons without
  `core:user:import` and shows the missing permission marker;
- fixed-port, deploy and public smoke create a user with `core:user:create`
  but without `core:user:import`, prove the token lacks import permission, and
  prove both import endpoints return 403;
- public Admin verification proves `core:user:import` reaches the deployed
  permission catalog, main bundle and Users chunk.

OpenCore still does not claim native XLSX/binary Excel import/export depth,
server-side full Excel export formatting or a dedicated User-page role
assignment dialog in this round.

## Round 35 User XLSX Export Reference Shape

RuoYi guards user export with `@ss.hasPermi('system:user:export')` and writes
the file through `ExcelUtil.exportExcel`. Yudao guards `/export-excel` with
`@ss.hasPermission('system:user:export')` and writes an Excel file through
`ExcelUtils.write`.

OpenCore admits the matching stage-12 export-file loop while preserving the
current JSON API boundary:

- `GET /api/core/users/export` remains guarded by `core:user:export`;
- the response now includes `contentType` and `contentBase64` in addition to
  the existing export metadata;
- `core.user` returns `opencore-system-users.xlsx` with the standard XLSX MIME
  type and a valid zip container;
- Admin access exposes `canExportUsers`;
- Admin Users adds a `Download Excel` backend export button and shows
  `Missing core:user:export` when permission is absent;
- fixed-port, deploy and public smoke decode the base64 payload and verify the
  XLSX `PK` zip header;
- public Admin verification proves the deployed main bundle contains
  `core:user:export` and `/core/users/export`, the Users chunk contains Excel
  export UI markers and the same-origin Admin proxy returns the XLSX payload.

OpenCore still does not claim native XLSX import parsing or a dedicated
User-page role assignment dialog in this round.

## Round 36 User XLSX Import Reference Shape

RuoYi pairs user export with `importTemplate` and `importData` on the same
System User surface, using Excel utility helpers rather than a CSV-only
contract. Yudao similarly exposes `/system/user/get-import-template` and
`/system/user/import` as Excel-oriented user-management workflows with
structured created/updated/failed results.

OpenCore admits the matching stage-13 import-file loop while preserving the
existing API boundary and import semantics:

- `GET /api/core/users/import-template` now returns
  `opencore-system-users-import-template.xlsx` with the standard XLSX MIME
  type and a valid zip payload;
- `POST /api/core/users/import` automatically accepts XLSX zip payloads or the
  existing CSV payloads through `contentBase64`;
- XLSX parsing supports inline strings, shared strings, boolean cells and basic
  value cells for the fixed columns `username`, `displayName`, `password`,
  `roleCodes`, `deptId`, `postCodes` and `enabled`;
- the endpoint keeps `core:user:import`, strict boolean `updateExisting`,
  partial row failures, role/dept/post validation and update-session
  revocation;
- Admin Users advertises `Select CSV/XLSX file` while keeping the existing
  template download, update-existing toggle and result summary;
- fixed-port, deploy and public smoke include `core.user.import.xlsx` with
  dynamically generated XLSX rows, so the XLSX parser is guarded without
  mutating fixed sample usernames;
- public Admin verification proves the deployed Users chunk contains the
  CSV/XLSX upload marker and the same-origin import-template endpoint returns
  an XLSX `PK` zip payload.

OpenCore still does not claim a dedicated User-page role assignment dialog,
email/phone/social profile expansion or richer Excel error-highlighting in
this round.

## Round 37 Config Metadata Reference Shape

Yudao's config save/response shape carries operator-facing metadata such as
`category`, `name`, `key`, `value`, visibility and `remark`. RuoYi's config
management similarly exposes a human-readable config name and a type/grouping
dimension beside the raw key and value. Both references make config rows
operator-readable instead of treating the key as the only label.

OpenCore admits the matching stage-3 config metadata loop while preserving its
existing config boundaries:

- `SystemConfig` now persists `category`, required `name` and optional
  `remark`;
- the migration backfills existing rows with `category='system'` and
  `name=key`;
- DTOs, repositories, seed records, SDK types and registry fixtures expose the
  metadata consistently;
- Admin Config shows category/name/remark in list/detail/export and accepts
  them in create/edit forms;
- metadata remains visible for secret configs while secret values stay
  redacted;
- fixed-port, deploy and public smoke prove create/detail/update/export
  metadata plus the existing `get-value-by-key` and cache refresh behavior.

OpenCore still does not claim batch config deletion, native Excel config
export, secret vault/KMS integration or broad runtime feature-flag propagation
in this round.

## Round 38 Config XLSX Export Reference Shape

Yudao exposes config export as `GET /infra/config/export-excel`, guarded by
`infra:config:export`, and writes the result through `ExcelUtils.write`.
Yudao Admin calls the same endpoint with `request.download` from the config
management toolbar. RuoYi has the same expected product behavior: configuration
management includes an export action that downloads a spreadsheet rather than
only reporting export metadata.

OpenCore admits the matching stage-4 config file-export loop while preserving
its JSON API boundary:

- `GET /api/core/config/export` remains guarded by `core:config:export`;
- the response keeps the preview metadata and now adds optional
  `contentType/contentBase64`;
- the exported file is `opencore-system-config.xlsx` with the standard XLSX
  MIME type and valid zip payload;
- export columns include
  `category/name/key/value/valueType/visibility/public/description/remark`;
- secret config values are exported as `[REDACTED]` because the service uses
  the existing redacted repository results;
- Admin Config adds a `Download Excel` action and missing-permission state for
  `core:config:export`;
- fixed-port, deploy and public smoke prove the XLSX filename, MIME, base64,
  `PK` zip header, value column and Admin same-origin proxy export.

OpenCore still does not claim batch config deletion, secret vault/KMS
integration or broad runtime feature-flag propagation in this round.

## Round 39 Config Batch Deletion Reference Shape

Yudao exposes config batch deletion as `DELETE /infra/config/delete-list`,
guarded by `infra:config:delete`. Its Vue3 Admin config API provides
`deleteConfigList(ids)` and sends the selected ids to the backend. This is a
basic management-table operation paired with single-row delete and export.

OpenCore admits the matching stage-5 config batch-delete loop while preserving
its key-based configuration model:

- `DELETE /api/core/config/batch` is guarded by `core:config:delete`;
- the request body is `{ keys: string[] }`, because OpenCore config identity is
  the stable config key rather than a numeric infra id;
- the static `config/batch` route is registered before `config/:key`;
- empty arrays, non-string/empty keys, duplicate keys and missing configs are
  rejected before mutation;
- successful deletion returns `{ deleted: true, affected, keys }`;
- service cache invalidation runs for every deleted key;
- Admin Config adds selected-row deletion through `rowSelection` and
  `Delete selected`;
- fixed-port, deploy and public smoke prove the guard path, successful
  deletion, cache invalidation, deployed Admin chunk markers and Admin
  same-origin proxy behavior.

Round 39 did not claim a built-in-config deletion policy field, secret
vault/KMS integration or broad runtime feature-flag propagation.

## Round 40 Config System Deletion Policy Reference Shape

Yudao models configuration type through `ConfigTypeEnum.SYSTEM/CUSTOM`.
Operator-created configs are saved as custom, and both single delete and batch
delete reject system configs before deleting rows. RuoYi similarly treats
built-in framework configuration as a protected operational boundary rather
than ordinary user-created data.

OpenCore admits the matching stage-6 config deletion-policy loop while
preserving its key-based configuration model:

- `SystemConfig.system` is persisted and defaults to false;
- seeded built-in rows such as `opencore.admin.title` and
  `auth.login.lockoutMinutes` are marked `system=true`;
- operator-created configs are always `system=false`;
- single delete rejects `system=true` configs with 400;
- batch delete rejects any request containing a `system=true` config before
  mutation, preventing partial custom-row deletion;
- DTO/OpenAPI/SDK/Admin/export surfaces expose the `system` flag;
- Admin Config displays System status, filters/details/exports it, disables
  row delete for built-in configs and prevents selecting them for batch delete;
- fixed-port, deploy and public smoke prove seeded system flags, single-delete
  guard, mixed-batch guard, deployed Admin chunk markers and public Admin/API
  login paths.

OpenCore still does not claim secret vault/KMS integration or broad runtime
feature-flag propagation in this round.

## Round 41 User Role Assignment Reference Shape

Yudao exposes dedicated user-side role assignment through
`GET /system/permission/list-user-roles` and
`POST /system/permission/assign-user-role`, guarded by
`system:permission:assign-user-role`. Its Vue3 user table has a row-level
`分配角色` action that opens a modal, loads the user's current role ids and
saves the selected role set back to the backend. RuoYi similarly treats user
role assignment as a user-management table action, not only as an edit-form
side effect.

OpenCore admits the matching stage-14 loop while preserving its string role
code model and existing session store:

- `core.user` registers a dedicated `core:user:manage` permission for
  user-side role assignment;
- `GET /api/core/users/:id/roles` returns the current user's role-code
  assignment summary;
- `PATCH /api/core/users/:id/roles` accepts `{ roleCodes }`, rejects duplicate
  codes, missing roles and system-user assignment, and returns
  `revokedSessionCount`;
- the API revokes active online-user sessions only when the role set changes,
  so stale bearer tokens cannot keep old role/permission state;
- SDK and OpenAPI expose typed `getUserRoleAssignment` and `assignUserRoles`
  contracts;
- Admin access exposes `canAssignUserRoles`;
- Admin Users adds a row-level `Assign Roles` modal with role multi-select,
  missing-permission copy and system-user disabled state;
- fixed-port, deploy and public smoke prove permission guards, system-user
  guard, duplicate/missing role guards, role clear/restore, token revocation
  and relogin role refresh;
- public Admin verification proves the deployed Users chunk contains
  `Assign Roles`, `Missing core:user:manage`,
  `System users cannot be assigned roles` and `Roles assigned.`, while the main
  bundle still points at the API origin without `/api/api`.

OpenCore does not claim email/phone/social profile expansion in this round;
those remain outside the currently admitted user-management waterline.

## Round 42 Post Batch Deletion Reference Shape

Yudao exposes post batch deletion as `DELETE /system/post/delete-list`, guarded
by `system:post:delete`. Its Vue3 Admin post API provides `deletePostList(ids)`
and the post table exposes a selected-row `批量删除` action that is disabled
until rows are selected. RuoYi has the same management-table expectation around
selected post deletion, paired with single delete and export.

OpenCore admits the matching stage-3 post batch-delete loop while preserving
its stable string `code` identity:

- `DELETE /api/core/posts/batch` is guarded by `core:post:delete`;
- the request body is `{ codes: string[] }`, because OpenCore post identity is
  the stable post code rather than a numeric id;
- the static `posts/batch` route is registered before `posts/:code`;
- empty arrays, non-string/empty codes, duplicate codes and missing posts are
  rejected before mutation;
- successful deletion returns `{ deleted: true, affected, codes }`;
- SDK and OpenAPI expose typed `deletePosts` contracts;
- Admin Posts adds selected-row deletion through `rowSelection` and
  `Delete selected`;
- fixed-port, deploy and public smoke prove the guard path, successful
  deletion, `posts/simple-list` cleanup, deployed Admin chunk markers and
  Admin same-origin proxy behavior.

OpenCore does not claim ordered list persistence, drag-sort operations or
post-user workflow expansion in this round.

## Round 43 Department User Binding Delete Guard Reference Shape

RuoYi and Yudao both treat department deletion as an organization-tree
integrity operation. Their current service paths guard parent departments with
children before deletion. OpenCore already had the child-department guard, but
its Prisma relation from `User.deptId` to `SystemDept.id` used
`onDelete: SetNull`; that meant a leaf department could be deleted even while
users were assigned to it, silently clearing their department binding.

OpenCore admits the stricter stage-3 department deletion loop for this product
boundary:

- department delete still rejects rows with child departments before mutation;
- seed and Prisma repositories also count users whose `deptId` equals the
  target department id;
- any assigned user makes `DELETE /api/core/depts/:id` return 400 before the
  database delete runs;
- failed deletes preserve each bound user's `deptId` instead of allowing the
  relation to set it to null;
- Admin Departments catches delete failures and exposes an assigned-user delete
  warning;
- fixed-port, deploy and public smoke prove assigned-user rejection, preserved
  user department binding, deployed Departments chunk markers and Admin
  same-origin proxy behavior.

OpenCore does not claim data-scope assignment UI, batch department deletion,
drag-sort persistence or a broader department-user assignment workflow in this
round.

## Round 44 Config Runtime Admin Title Reference Shape

RuoYi and Yudao both position system/infra config management as more than a
CRUD table: configuration keys are runtime parameters that application code can
read after operators update them. OpenCore already had public value-by-key,
cache refresh and cache invalidation, and it seeded
`opencore.admin.title` as a public system config, but the deployed Admin shell
and login page still only used hard-coded title text.

OpenCore admits the first stage-7 runtime propagation loop for the config
product boundary:

- `GET /api/core/config/runtime` is public and registered before dynamic
  `config/:key`;
- the response is a stable runtime summary `{ adminTitle }`, backed by the
  existing public config value cache and `opencore.admin.title`;
- config update invalidates the cached title through the existing service
  cache path, so runtime reads reflect operator changes;
- SDK exposes tokenless `getConfigRuntime()` for frontend bootstrap use;
- Admin `getInitialState` fetches runtime config and applies the title to
  layout settings;
- Admin login uses the runtime title with the hard-coded title only as
  fallback;
- fixed-port, deploy and public smoke prove public runtime reads, title update
  propagation, deployed bundle markers, same-origin Admin proxy behavior and
  restore of the seeded title.

OpenCore does not claim secret vault/KMS, broad multi-key runtime feature flag
propagation, per-environment config promotion or cluster-wide push
invalidation in this round.

## Round 45 Login Log Type Result Reference Shape

Yudao models login logs as both behavior type and outcome: `LoginLogDO` carries
`logType`, `result`, user identity, username, IP, user agent and create time;
its Admin page renders login type and login result through dictionaries and
exports those fields. Current Yudao login flow records username login success,
bad credentials, disabled user and captcha-related results, while mobile/social
login types exist as separate enum values.

RuoYi models login information around login status, message, IP/location,
browser, OS and login time. Its Admin surface also includes broader operations
such as delete, clean and unlock.

OpenCore admits the stage-3 login-log schema loop for the current product
boundary:

- persist `LoginLog.logType` and `LoginLog.result` with migration defaults and
  seed backfill;
- keep readable string enum values such as `login.username`, `success`,
  `bad_credentials` and `user_disabled` instead of importing Yudao numeric dict
  codes;
- keep the existing `success` boolean for backward compatibility;
- record missing users and bad passwords as `bad_credentials`;
- record disabled users as `user_disabled` while keeping the public auth
  response as the same 401 message;
- expose `logType/result` through DTO, OpenAPI, SDK, list/detail/export and
  Admin Login Logs;
- support server-side `logType/result` filters and reject unknown enum values
  with 400;
- fixed-port, deploy and public smoke prove real failed-login recording,
  result/type filters, detail fields, export columns, deployed Admin chunk
  markers and Admin same-origin proxy behavior.

OpenCore does not claim IP location enrichment, login-log deletion/cleanup,
user unlock, lockout-policy tuning, logout logging or mobile/social login
workflows in this round.

## Round 46 Config Runtime Login Policy Reference Shape

RuoYi treats config keys as runtime parameters, not just management rows.
`SysConfigServiceImpl.selectConfigByKey(...)` reads from cache and database;
`CaptchaController` calls `selectCaptchaEnabled()` for login captcha behavior;
`SysLoginController` reads account password-policy keys such as
`sys.account.passwordValidateDays`; and the Admin API exposes
`/system/config/configKey/{configKey}` for key-based runtime reads.

Yudao similarly exposes infra config as a runtime dependency:
`ConfigApi.getConfigValueByKey(...)` is injected into system services, including
user registration checks such as `system.user.register-enabled`. Its Admin
config controller also exposes `get-value-by-key`.

OpenCore already had the first runtime summary stage from Round 44:
`GET /api/core/config/runtime` returned `{ adminTitle }` from the public config
cache and Admin consumed it for title rendering. Round 46 admits the next
runtime config stage:

- make seeded `auth.login.lockoutMinutes` public and system-owned;
- return `loginLockoutMinutes` from `GET /api/core/config/runtime`;
- keep the value backed by the existing config cache and update invalidation;
- validate boolean/number config values before they enter seed or Prisma
  repositories;
- protect runtime keys from being changed to private/secret or incompatible
  value types;
- require the login lockout window to be an integer between 1 and 1440 minutes;
- keep `AdminInitialState.runtimeConfig` and render the login lockout window on
  the Admin login page;
- fixed-port, deploy and public smoke prove invalid values return 400, runtime
  updates propagate and restored values are clean.

OpenCore does not claim real failed-attempt account lockout, user unlock,
captcha configuration, secret vault/KMS or broad feature-flag propagation in
this round.

## Round 47 Login Lockout Unlock Reference Shape

RuoYi's login security flow keeps a password retry counter per username and
locks the account for the configured lock time after the retry limit is
exceeded. Its monitoring login-info controller also exposes a username unlock
operation so an operator can clear the lockout state from the login-log
surface. Yudao's login-log model adds structured login result values, which
lets the Admin page distinguish bad credentials, disabled users and other
outcomes instead of relying only on a boolean.

OpenCore already had immutable login-log list/detail/export, device parsing,
server-side IP/time filters and Round 45 `logType/result` values. Round 46
made `auth.login.lockoutMinutes` a public runtime policy value. Round 47 admits
the matching security-auth and login-log foundation:

- persist username lockout state in Prisma `LoginLockout`;
- add `SecurityLoginLockoutRepository` and `SecurityLoginPolicyProvider` to the
  shared security boundary instead of keeping policy in a controller;
- read the lockout window from `auth.login.lockoutMinutes` and use a fixed
  five-attempt baseline for this stage;
- reject locked usernames before password verification while preserving the
  generic public auth failure response;
- record lockout-triggering and locked attempts as `account_locked`;
- clear failed-attempt state on successful login or explicit unlock;
- expose permissioned `POST /api/core/login-logs/unlock` with
  `core:login-log:manage`;
- add `account_locked` to DTO/OpenAPI/SDK/Admin result filters;
- let Admin Login Logs unlock a username from a row action when the operator
  has manage permission;
- fixed-port, deploy and public smoke prove temporary-user lockout, correct
  password rejection while locked, account-locked filtering, unlock and
  restored login.

OpenCore does not claim captcha verification, IP location enrichment, login-log
delete/clean, configurable failed-attempt threshold, logout logging, mobile/SMS
or social login workflows in this round.

## Round 48 Login Log Cleanup Maintenance Reference Shape

RuoYi's `SysLogininforController` treats login-log maintenance as part of the
monitoring login-info surface: it exposes selected-row removal and clean-all
operations in addition to list/export and username unlock. Yudao's current
login-log controller remains closer to a read/export audit surface, so for this
stage RuoYi is the stronger reference for maintenance actions while Yudao
continues to inform result typing and read/export shape.

OpenCore already had immutable login-log list/detail/export, browser/OS and
time/IP filters, `logType/result` schema, account lockout and username unlock.
Round 48 admits the cleanup maintenance stage:

- expose `DELETE /api/core/login-logs/batch` for selected-row deletion;
- expose `DELETE /api/core/login-logs/clean` for clean-all maintenance;
- protect both routes with dangerous `core:login-log:delete`;
- keep the batch route ahead of `login-logs/:id` so static cleanup paths are
  never swallowed by dynamic detail routing;
- reject empty arrays, duplicate IDs and missing IDs;
- reject mixed existing/missing IDs without deleting the existing row;
- return affected counts for both selected deletion and clean-all;
- add SDK/OpenAPI/Admin service wrappers and Admin Login Logs selected-row UI;
- disable destructive Admin actions when the operator lacks
  `core:login-log:delete`;
- fixed-port, deploy and public smoke prove guards, successful deletion,
  detail 404 after deletion, clean-all, empty list after clean and post-clean
  failed-login recording.

OpenCore does not claim IP location enrichment, configurable failed-attempt
threshold, logout/mobile/SMS/social login recording or session termination from
the login-log page in this round.

## Round 49 Runtime Failed-Attempt Policy Reference Shape

RuoYi's password retry service treats both retry count and lock time as
runtime policy inputs. The reference configuration shape includes
`user.password.maxRetryCount` and `user.password.lockTime`; the login path
increments a per-username counter, locks after the configured retry count and
uses the configured lock duration. RuoYi's login-info surface then provides
the operator unlock path already translated in Round 47.

Yudao continues to inform the structured login outcome model: login logs carry
typed results so bad credentials, disabled users and locked accounts can be
queried and displayed consistently.

OpenCore already had:

- `auth.login.lockoutMinutes` as a public runtime config;
- security-auth lockout enforcement consuming that lockout window;
- `account_locked` login-log results and username unlock;
- fixed-port/deploy/public smoke proving lockout behavior.

Round 49 admits the missing retry-count policy stage:

- seed `auth.login.maxFailedAttempts` as a public system number config;
- return `loginMaxFailedAttempts` from `GET /api/core/config/runtime`;
- validate it as an integer between 1 and 20 and keep it public/number typed;
- expose it through SDK/OpenAPI/Admin runtime state;
- have the API login policy provider consume it instead of a hardcoded count;
- render attempts plus minutes on the Admin login page;
- add smoke that mutates the threshold to 3, proves lockout uses that value and
  restores the original config;
- add deploy-script guards so stale Admin bundles missing the runtime login
  policy marker cannot be deployed.

OpenCore does not claim captcha verification, IP location enrichment, broader
logout/mobile/SMS/social login recording, session termination from the
login-log page, secret vault/KMS integration or broad runtime feature flags in
this round.

## Round 50 Self Logout Reference Shape

RuoYi wires Spring Security logout to `/logout`; the logout success handler
extracts the current login token, removes it from token storage and records a
login-info row with logout status. Yudao exposes `/system/auth/logout`; the
auth service removes the current OAuth2 access token and creates a
`LOGOUT_SELF` login-log entry. Both references treat logout as a backend
security operation, not just a browser-local token deletion.

OpenCore already had:

- bearer tokens carrying a token ID;
- online-user sessions registered on login and checked during bearer auth;
- operator kick-out revoking online-user sessions;
- `logout.self` and `logout.force` in the login-log type model;
- Admin avatar logout that only removed local storage.

Round 50 admits the current-user self logout stage:

- expose `POST /api/auth/logout` with bearer auth and a `200` response;
- verify the current bearer token and revoke its online-user session by
  tokenId;
- record a successful `logout.self` login log with request context;
- keep the Admin logout UX simple while changing it to call the backend logout
  API before clearing local token state;
- expose the operation through SDK/OpenAPI;
- add fixed-port, deploy and public smoke proving the logged-out token is
  rejected by `/auth/me` and the `logout.self` row is queryable.

OpenCore does not claim IP location enrichment, force-logout login-log
integration, mobile/SMS/social login recording or a Login Logs page action for
terminating sessions in this round.

## Round 51 Forced Logout Reference Shape

RuoYi's online-user controller exposes a force logout operation that deletes
the target login token from token storage and records the operation under a
force business action. It treats online-user kick-out as an explicit operator
action distinct from ordinary role/user mutation side effects.

Yudao's OAuth2 token management exposes access-token deletion through the admin
token surface. The auth service removes the token and records a
`LOGOUT_DELETE` login-log entry, making forced token deletion queryable in the
login-log audit surface.

OpenCore already had:

- explicit single and batch Monitor Online Users kick-out APIs;
- real online-user session revocation enforced by bearer authentication;
- `logout.force` in the login-log type model and Admin Login Logs filter;
- current-user `logout.self` logging from Round 50;
- internal RBAC/user mutation session invalidation for role/user changes.

Round 51 admits the explicit force-logout logging stage:

- keep session revocation behavior owned by `@opencore/online-user`;
- wire `OperationsModule` to `AuditLoginLogModule`;
- after successful `POST /api/monitor/online-users/:id/kick-out`, record one
  successful `logType=logout.force` login-log row for the target session;
- after successful `POST /api/monitor/online-users/kick-out`, record one
  successful `logout.force` row for each returned target session;
- use the target session username, IP and user agent for the login-log row;
- keep structured operator context in online-user
  `revokedBy/revokedReason`, while temporarily carrying the same text in the
  login-log `failureReason` field until a dedicated actor/reason schema is
  admitted;
- add fixed-port, deploy and public smoke proving a kicked token returns 401
  and the `logout.force` row is filterable.

OpenCore deliberately does not record every internal session invalidation as
`logout.force`; role/user mutations can revoke sessions as a security effect
without being operator online-user kick-out events. This round also does not
claim IP location enrichment, mobile/SMS/social login logging, structured
login-log actor/reason columns or a Login Logs page action for terminating
sessions.

## Round 52 Department Order Reference Shape

RuoYi exposes department sorting as an explicit management operation:
`SysDeptController.updateSort` accepts department IDs plus target order numbers
and protects the route with `system:dept:edit`. This keeps tree display order
editable without requiring a broader department workflow change.

Yudao keeps department `sort` in the department save request shape and returns
department lists ordered by that saved value. Its reference shape treats sort
as a basic organization-tree field, not a separate optional feature.

OpenCore already had a persisted `SystemDept.order` field and sorted tree plus
simple-list reads, but no way for an operator to save sibling order after tree
CRUD. Round 52 admits the same-parent order stage:

- expose `PATCH /api/core/depts/order` with `core:dept:update`;
- accept an item list of `{ id, order }` values;
- reject duplicate IDs, missing IDs, malformed order values and cross-parent
  batches before mutation;
- keep order updates scoped to siblings under the same `parentId`;
- add SDK and Admin Departments Move up / Move down actions;
- prove saved order through both tree and simple-list consumers in fixed-port,
  deploy and public smoke.

OpenCore does not claim drag-sort UI, batch department deletion, data-scope
workflow integration or role data-scope assignment UI in this round.

## Round 53 Post Order Reference Shape

RuoYi treats岗位 order as part of the normal post management surface:
`SysPost` carries `postSort`, the post table renders `岗位排序`, and the create/edit
form exposes `岗位顺序` through a bounded number input. That makes ordering a
basic post list field rather than a separate business workflow.

Yudao similarly keeps岗位 `sort` on `PostDO`, `PostSaveReqVO`,
`PostRespVO` and `PostSimpleRespVO`. Its user and post option flows consume
the ordered post shape, so a saved sort value must affect both management and
consumer lists.

OpenCore already had:

- `SystemPost.order` persisted in Prisma and seed records;
- post CRUD, export and Admin management;
- user-post binding;
- enabled-post `posts/simple-list` consumer;
- selected-row batch deletion.

Round 53 admits the remaining ordered-list stage:

- expose `PATCH /api/core/posts/order` with `core:post:update`;
- accept an item list of `{ code, order }` values;
- reject duplicate codes, missing codes and malformed order values before
  mutation;
- add SDK and Admin Posts Move up / Move down actions;
- prove saved order through both management list and simple-list consumers in
  fixed-port, deploy and public smoke.

OpenCore does not claim drag-sort-only UI or broader岗位 workflow automation in
this round; those are separate admissions if product demand appears.

## Round 54 User Data-Scope Query Reference Shape

RuoYi applies data permissions to management queries with `@DataScope`, where
the logged-in user's roles constrain department and user-owned records instead
of trusting only client-side filters. User management still accepts department
filters, but those filters narrow the already-permitted data set rather than
widening access.

Yudao similarly models system data permission as a server-side constraint. Its
role data-scope configuration is not just display metadata; list and export
queries are expected to run under the resolved data permission context.

OpenCore already had:

- role `dataScope` and `dataScopeDeptIds` persisted in seed and Prisma;
- role data-scope assignment UI from the role productization rounds;
- `SecurityDataScopeGuard`, `SecurityDataScopeService` and policy helpers in
  `@opencore/security`;
- user `deptId` ownership and explicit `deptId` subtree filters from Round 23;
- user list, simple-list and XLSX export consumers.

The missing product behavior was that resolved data-scope constraints were not
connected to a real management query. Round 54 admits the first visible
enforcement loop:

- apply `RequireDataScope({ userIdField: 'id', deptIdField: 'deptId' })` to
  user list, user export and user simple-list;
- convert resolved `all` / `none` / `restricted` constraints into an internal
  system-user query filter;
- OR restricted `userIds` and `deptIds` together, then AND that data-scope
  filter with any explicit department-subtree filter;
- implement the same rule in seed and Prisma repositories;
- prove self-scope and department-intersection behavior in fixed-port, deploy
  and public smoke through a temporary low-permission role/user.

OpenCore does not claim full tenant isolation, all-module data-permission
rollout, workflow-level ownership rules, batch department deletion or drag-sort
UI in this round. Those remain separate admissions.

## Round 55 Notice Inbox Read-State Reference Shape

RuoYi-style notice product depth is not only notice CRUD. Its notice-related
UI commonly includes header notification access, top-list style consumption,
mark-read/all-read operations and read-user records that let an operator see
whether a notice has reached users.

Yudao separates notice management from personal notify-message consumption. The
important consumer shape is the same: my-page, unread-list, unread-count,
mark-read and mark-all-read endpoints let the logged-in user operate their own
notification inbox without needing system-notice management permissions.

OpenCore already had:

- system notice management CRUD from Round 1;
- `core:notice:*` management permissions and Admin System Notices route;
- published/draft/archived lifecycle, audience and time-window fields;
- SDK/OpenAPI/Admin management coverage.

The missing product behavior was per-user read state and a real inbox consumer
surface. Round 55 admits this stage:

- add persisted `SystemNoticeReadReceipt` rows keyed by `(noticeId, userId)`;
- expose authenticated-only notice inbox page/detail, unread-list,
  unread-count, mark-read and mark-all-read APIs;
- keep inbox routes independent from management permissions while still
  requiring a valid bearer session;
- include only published, currently valid `all/admin` audience notices in the
  inbox;
- reject malformed read-status values, empty/duplicate read ids, hidden drafts
  and missing inbox notices before mutation;
- extend SDK/OpenAPI/Admin with a System Notices Inbox tab and header unread
  badge;
- prove fixed-port, deploy and public behavior through
  `tools/scripts/smoke-core-notice.mjs`.

OpenCore does not claim delivery templates, WebSocket/mail/SMS fan-out,
tenant-scoped notices, BPM approval around announcements or full read-user
analytics in this round. Those are the remaining notice productization stages
if admitted.
