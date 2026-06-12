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
