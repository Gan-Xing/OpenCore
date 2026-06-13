# cycle-021 Productization Waterline Audit

Date: 2026-06-13
Trigger: user clarified that "minimal loop" means one deployable stage, not a
minimal final product.  
Reference HEADs rechecked:

- RuoYi-Vue: `41720e624c5a668c7d3777835e4c87095a7a1dfd`
- Yudao backend: `51b3d2d8cddd9a2a48e1edc2a7267359f61264cb`
- Yudao Admin: `caa6fa9be35a7ef13dc3aba082f4675962f5c234`

## Waterline Rules

Every cycle-021 round still must be a minimal deployable, testable and
reversible loop. That does not mean the product capability is complete after
one round.

A capability reaches the current OpenCore productization waterline only when:

- API, SDK, Admin, permission, menu, seed, OpenAPI and smoke coverage are live.
- The Admin page is useful for the real operator workflow, not just a fixture
  replacement or metadata-only demo.
- The loop covers the basic actions expected from RuoYi/Yudao for that
  capability, unless the omission is a deliberate OpenCore product boundary.
- Repeated deployment/runtime failures are encoded as tests, smoke checks or
  deploy-script guards.
- Security effects are real. A button that only changes an audit row is not
  enough when the operator expects access to be revoked.

## Classification

| Round                                    | Capability            | Status                  | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------- | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1                                        | `core.notice`         | First loop, enhance     | Management CRUD is live, but read/unread state, notification inbox/header badge and delivery semantics remain below a full notice product.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2/27/43                                  | `core.dept`           | First loop, enhance     | Tree CRUD, child delete guard, the enabled-department simple-list option source consumed by Admin Users and user-bound department delete protection are live. Round 43 blocks deleting departments assigned to users and proves the failed delete preserves user `deptId`. Data-scope workflows and ordered tree operations still need follow-up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 3/22/25/42                               | `core.post`           | First loop, enhance     | Post CRUD is live, Round 22 closes user-post binding, Round 25 adds the dedicated enabled-post simple-list option source consumed by Admin Users, and Round 42 adds permission-gated batch deletion with selected-row Admin UI plus strict empty/duplicate/missing guards. Ordered list refinements still remain below the full reference depth.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4/16                                     | `core.menu`           | Meets current waterline | Round 16 closed the flat-model gap: menus now persist parent tree metadata, type, icon/component/status/cache fields, Admin tree operations, delete guards, nullable parent clearing and smoke coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5/17/18/20                               | `core.role`           | Meets current waterline | Role CRUD, permission-code assignment, data scope, role menu-tree assignment, role-user assignment and role status are live. Role status/update/delete mutations revoke affected sessions, disabled roles are removed from auth/RBAC calculation and system roles cannot be disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6                                        | `core.permission`     | Meets current waterline | OpenCore deliberately owns a persisted permission catalog. System/custom separation, registry mutation protection, live Admin CRUD for custom permissions and role option integration are enough for this product boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 7/19/22/23/28/29/30/31/32/33/34/35/36/41 | `core.user`           | Meets current waterline | User CRUD with role/dept selection is live. Round 19 adds status/reset plus session invalidation after user mutations, Round 22 adds persisted post binding, Round 23 adds server-side department subtree filtering plus the Admin department side tree, Round 28 adds authenticated self-profile basic display-name read/update, Round 29 adds authenticated self-password change with old-password verification plus session revocation, Round 30 adds the authenticated enabled-user simple-list option source consumed by Admin role assignment, Round 31 adds profile avatar upload/public preview/replace/delete backed by file storage, Round 32 adds batch enable/disable plus batch delete with session revocation, Round 33 adds CSV-compatible import template/import results with update-existing session revocation, Round 34 adds the dedicated `core:user:import` permission across registry/API/Admin/smoke, Round 35 adds native XLSX export payload plus Admin `Download Excel` and fixed/deploy/public smoke guards, Round 36 adds native XLSX import template/parsing while keeping CSV backwards compatibility, and Round 41 adds the dedicated User-page role assignment workflow with `core:user:manage`, API/SDK/Admin/OpenAPI coverage and session revocation. Email/phone/social profile expansion remains outside the currently admitted waterline. |
| 8/21                                     | `core.dict`           | Meets current waterline | Dict type CRUD plus embedded items is live from Round 8. Round 21 adds item-level management API/SDK/Admin, a public `dict-data/simple-list` consumer endpoint, disabled type/item filtering and smoke coverage for malformed boolean deserialization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 9/24/37/38/39/40/44/46/49                | `core.config`         | First loop, enhance     | Config CRUD and secret redaction are live. Round 24 adds public value-by-key reading, service value-cache refresh and mutation invalidation. Round 37 adds category/name/remark metadata across Prisma/API/SDK/Admin/export/smoke while preserving secret redaction and cache behavior. Round 38 adds native XLSX export payload plus Admin `Download Excel`, shared workbook/download helpers and fixed/deploy/public smoke guards. Round 39 adds permission-gated batch deletion with selected-row Admin UI and cache invalidation. Round 40 adds a persisted system/custom flag, blocks single and batch deletion of built-in configs, and disables destructive Admin selection/actions for system rows. Round 44 adds a public runtime config summary consumed by Admin login/shell title and smoke-proves title cache invalidation. Round 46 adds `auth.login.lockoutMinutes` as a public runtime login-policy field, Admin login consumption and runtime-key guardrails for public/type/integer validity; Round 47 consumes it from security-auth lockout enforcement. Round 49 adds `auth.login.maxFailedAttempts`, security-auth consumption, Admin login display and stale frontend bundle guards. Secret vault/KMS integration and broad feature-flag propagation remain outside this closed stage.                                                                  |
| 10/15                                    | `core.file`           | Meets current waterline | Round 15 closed the metadata-only gap: authenticated upload writes real content through `FileStorageService`, download returns stored bytes, Admin can upload/download, and smoke proves content equality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 11/26/45/47/48/49/50                     | `core.login-log`      | First loop, enhance     | Immutable list/detail/export and failed-login smoke are live. Round 26 adds browser/OS device fields plus server-side IP and time-window filters. Round 45 adds persisted `logType/result` schema, username-login success/bad-credentials/disabled-user result mapping, API/SDK/Admin fields and server filters, export columns and smoke guards for invalid enum values. Round 47 adds persisted failed-attempt lockout, `account_locked` result mapping and permissioned username unlock in API/SDK/Admin/smoke. Round 48 adds permissioned batch deletion and clean-all maintenance actions with strict empty/duplicate/missing guards, no-partial-delete smoke and Admin selected-row cleanup. Round 49 drives the failed-attempt threshold from runtime `auth.login.maxFailedAttempts` and proves it through login-log lockout smoke. Round 50 adds current-user self logout logging plus real bearer token/session revocation. IP location enrichment, force-logout login-log integration and broader mobile/social logging remain below reference depth.                                                                                                                                                                                                                                                                                                                |
| 12                                       | `core.audit-log`      | Meets current waterline | Immutable operation audit list/detail/export is live and smoke proves a real write operation is recorded. Delete/clean remains an intentional audit-retention policy decision, not a current product blocker.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 13/14                                    | `monitor.online-user` | Meets current waterline | Round 14 closed the Round 13 thin loop: bearer auth now checks online-session state, batch kick-out revokes real sessions, smoke proves kicked tokens return 401, and browser/OS/IP fields reach SDK/Admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## Remediation Queue

Completed P0 remediation:

1. `monitor.online-user` stage 2: real session/token revocation enforcement,
   smoke proving a kicked token returns 401, batch kick-out, UA browser/OS
   parsing and IP fields surfaced in Admin.
2. `core.file` stage 2: authenticated file upload/download loop backed by the
   existing file storage boundary, with smoke proving downloaded content
   matches uploaded content.
3. `core.menu` stage 2: tree menu model and Admin tree operations aligned with
   route/menu metadata, including parent/child guards and nullable parent
   clearing smoke.

Remaining P0 rework before opening more broad product surfaces:

- None after Round 16. Continue with the P1 enhancement queue unless a new
  waterline audit identifies another blocker.

P1 enhancement queue:

1. `core.config`: Round 24 completed public get-value-by-key plus cache
   refresh/invalidation; Round 37 completed category/name/remark metadata
   across Prisma/API/SDK/Admin/export/smoke; Round 38 completed native XLSX
   export payload plus Admin download and smoke guards; Round 39 completed
   batch deletion with Admin selected-row deletion, strict key guards and cache
   invalidation; Round 40 completed the persisted system/custom config deletion
   policy with API/Admin/smoke guards; Round 44 completed the first runtime
   propagation loop for Admin title through `config/runtime`; Round 46
   completed the runtime login policy summary for
   `auth.login.lockoutMinutes`, Admin login consumption and runtime-key
   guardrails; Round 47 consumes that key from security-auth lockout
   enforcement; Round 49 completed `auth.login.maxFailedAttempts` runtime
   propagation, Admin login display, security-auth consumption and stale
   frontend bundle guards. Remaining config work is any admitted secret
   vault/KMS integration and broader feature-flag propagation.
2. `core.login-log`: Round 26 completed browser/OS parsing and server-side
   IP/time filters. Round 45 completed persisted login type/result schema,
   Admin display and `logType/result` filters. Round 47 completed persisted
   failed-attempt lockout, `account_locked` result mapping and permissioned
   username unlock. Round 48 completed permissioned batch deletion and clean-all
   maintenance actions with strict empty/duplicate/missing guards, no-partial
   delete protection, Admin selected-row cleanup and fixed/deploy/public smoke
   coverage. Round 49 completed the configurable failed-attempt threshold by
   proving lockout can be driven from `auth.login.maxFailedAttempts`. Round 50
   completed current-user self logout logging and real bearer token/session
   revocation through the online-user session repository.
   Remaining login-log work is IP/location enrichment where feasible,
   force-logout login-log integration and broader mobile/social logging stages.
3. `core.dept`: Round 27 completed the enabled-department simple-list option
   source; Round 43 completed user-bound department deletion protection and
   preserved user `deptId` on failed delete. Remaining department work is
   data-scope workflow integration and ordered tree operations where useful.
4. `core.post`: Round 25 completed the enabled-post simple-list option source;
   Round 42 completed batch deletion with Admin selected-row deletion, strict
   code guards and fixed/deploy/public smoke coverage. Remaining post work is
   ordered list operations where useful.
5. `core.notice`: read/unread state, inbox/header badge and delivery adapter
   design before any real WebSocket/mail/SMS fan-out.

## Deployment Learning

The repeated login failure had two layers:

- Admin bundles must use the API origin as `ADMIN_API_BASE_URL`; the SDK adds
  `/api`.
- The API itself must also tolerate stale `/api/api/*` requests because old
  browser bundles can hit the API origin directly.

Commit `f4569a4` added API-side duplicate-prefix normalization and a deploy
smoke for `POST /api/api/auth/login`. Future deploy fixes must follow the same
pattern: encode the failure as code plus smoke, then deploy through
`pnpm deploy:opencore`.

Round 19 added another deploy-learning guard: `monitor.online-user` smoke no
longer requires the seeded `session_admin` row to appear on the first active
admin page. Real deployments can accumulate more than one page of active admin
sessions, so the smoke now asserts the current admin bearer token's session is
active. This keeps the deploy script strict about the product behavior without
depending on seed row pagination.

Round 20 added the role-status deserialization and session-revocation guard:
`core.role` smoke now disables, enables, updates and deletes a real temporary
role, proves stale tokens return 401, and proves disabled roles are filtered
from login role/permission results until re-enabled.

Round 21 added the dict item-data deserialization and consumer guard:
`core.dict` smoke now rejects malformed item boolean payloads, creates and
updates real dict items, proves the public `dict-data/simple-list` endpoint
filters disabled items and disabled dict types, and cleans up through the same
management API.

Round 22 added the user-post binding guard: `core.user` smoke now rejects
unknown post codes, creates a temporary user bound to the seeded `engineer`
post, clears `postCodes` through update and keeps the existing user
status/reset/update/delete session-revocation checks in the same fixed-port and
deploy smoke path.

Round 23 added the user department-subtree filtering guard: `core.user` smoke
now rejects unknown department IDs, creates a temporary user in the seeded
operations department, proves direct department filtering includes that user,
proves headquarters subtree filtering includes it, and proves an unrelated
engineering department filter excludes it in the same fixed-port and deploy
smoke path.

Round 24 added the config value-cache guard: `core.config` smoke now creates a
public temporary config, reads it through `get-value-by-key`, updates it and
proves the cached value is invalidated, explicitly refreshes the public value
cache, and verifies secret config values are blocked from the public value
consumer with 403.

Round 25 added the post option-source guard: `core.post` smoke now creates a
disabled temporary post, proves `posts/simple-list` filters it out, enables
the post and proves the lightweight `{ code, name, order }` option shape is
returned, then verifies export/detail/delete and cleanup through the same
fixed-port and deploy smoke path.

Round 26 added the login-log device/filter guard: `core.login-log` smoke now
records a failed Chrome/Windows login, verifies detail/list expose
`browser`/`os`, proves server-side username/result/IP/time-window filters,
proves a future time window excludes the row, proves malformed `createdFrom`
returns 400 and verifies export columns include device fields.

Round 27 added the department option-source guard: `core.dept` smoke now creates
a disabled temporary department, proves `depts/simple-list` filters it out,
enables the department and proves the lightweight `{ id, name, parentId, order }`
option shape is returned without management-only fields, then verifies
export/detail/delete and cleanup through the same fixed-port and deploy smoke
path.

Round 28 added the user self-profile guard: `core.user` smoke now reads the
current user's profile, updates the current user's `displayName`, proves
`/auth/me` reflects the updated display name, rejects an empty display name
with 400, and proves the system-user management update guard still rejects
`PATCH /core/users/:id` for the seeded admin user. The smoke restores the
admin display name during cleanup so repeated fixed-port, deploy and public
runs do not leave mutable state behind.

Round 29 added the user self-password guard: `core.user` smoke now changes a
temporary user's password through `PATCH /core/users/profile/password`, proves
wrong old passwords return 401, proves same old/new passwords return 400,
proves the successful change revokes the active bearer session, proves the old
password can no longer log in, and proves the new password can log in before
the later user update/delete revocation checks run.

Round 30 added the user option-source guard: `core.user` smoke now proves
`GET /core/users/simple-list` is authenticated-only, rejects unknown
department filters with 404, returns enabled users through the lightweight
`{ id, username, displayName, deptId, postCodes }` shape, omits
`roleCodes`/`enabled`/`system`, honors department-subtree filtering and removes
disabled users from the option source before re-adding them when enabled.

Round 31 added the user avatar guard: `core.user` smoke now proves
`POST /core/users/profile/avatar` is authenticated-only, rejects unsupported
MIME types and malformed base64 with 400, stores real image bytes through the
file storage boundary, exposes `avatarUrl` through `/auth/me`, downloads the
public avatar URL and compares bytes with the uploaded PNG, deletes the avatar
and proves the old public URL returns 404. Public Admin verification also
proves the same `avatarUrl` works through the Admin same-origin `/api` proxy.

Round 32 added the user batch-mutation guard: `core.user` smoke now creates two
temporary users, logs both in to create active sessions, rejects empty arrays,
duplicate IDs, system users and missing users, batch-disables both users and
proves both bearer tokens return 401 plus password login is blocked, re-enables
both users, batch-deletes both users and proves the new bearer tokens are also
revoked. Public Admin verification also proves the deployed Users chunk contains
batch UI markers, the main bundle contains batch API paths and the Admin
same-origin proxy reaches the batch status guard.

Round 33 added the user import guard: `core.user` smoke now fetches the import
template, rejects `updateExisting` string deserialization with 400, imports a
CSV with one valid row and one invalid-role row to prove partial results,
updates an existing imported user with `updateExisting: true`, proves the old
token is revoked, and proves disabled imported users are filtered from
`users/simple-list`. Public Admin verification also proves the deployed Users
chunk contains import modal markers, the main bundle contains import API paths,
and the Admin same-origin proxy reaches both the template endpoint and the
strict boolean guard.

Round 34 added the user import permission guard: `core.user` smoke now creates
a temporary role with `core:user:create` but without `core:user:import`, logs in
a temporary user with that role, proves the token contains create but not
import permission, and proves both import-template and import endpoints return 403. The same smoke then proves the admin import flow still works. Public Admin
verification also proves the deployed main bundle contains `core:user:import`
and import API paths, the Users chunk contains the import UI and missing
permission marker, the Admin same-origin permission catalog exposes
`core:user:import`, and the Admin proxy reaches the import-template endpoint.

Round 35 added the user XLSX export guard: `core.user` smoke now calls
`/core/users/export`, proves the response filename/MIME/columns, decodes
`contentBase64` and checks the XLSX zip header. Admin static smoke also locks
`exportOpenCoreUsers`, `canExportUsers`, `Download Excel` and
`Missing core:user:export`. The round also converted a local Prisma multi-peer
generation issue into `tools/scripts/sync-prisma-client-instances.mjs`, run
after `pnpm prisma:generate`, so package-local `@prisma/client` peer instances
do not keep stale generated schemas after install.

Round 36 added the user XLSX import guard: `core.user` smoke now fetches the
XLSX import template, checks filename/MIME/zip header and imports a dynamically
generated XLSX workbook under `core.user.import.xlsx`. Admin static smoke locks
`Select CSV/XLSX file`, and public Admin verification proves the deployed Users
chunk plus same-origin import-template endpoint return the upgraded XLSX
surface.

Round 37 added the config metadata guard: `core.config` smoke now creates and
updates a temporary config with `category`, `name` and `remark`, verifies
detail/list/export carry those fields, keeps secret values redacted while
leaving metadata visible, and proves the deployed Admin Config page contains
the metadata columns/forms plus the existing cache/value-by-key controls.

Round 38 added the config XLSX export guard: `core.config` smoke now verifies
`/core/config/export` returns `opencore-system-config.xlsx`, the XLSX MIME
type, a base64 body with `PK` zip header, and export columns including
`value` while preserving secret redaction. Admin static smoke locks
`canExportSystemConfig`, `Download Excel`, `Config Excel export downloaded`
and `Missing core:config:export`, and public Admin verification proves the
same-origin config export endpoint returns the XLSX payload through the
deployed proxy.

Round 39 added the config batch-delete guard: `core.config` smoke now rejects
empty key arrays, duplicate keys and missing keys, then creates two temporary
public configs, reads one through `get-value-by-key`, batch-deletes both through
`DELETE /core/config/batch`, proves both are gone, and proves the cached public
value is invalidated. Admin static smoke locks `Delete selected`,
`rowSelection`, `selectedRowKeys` and `deleteOpenCoreSystemConfigs`, while
public Admin verification proves the deployed chunk, main bundle and
same-origin batch-delete API path.

Round 40 added the config system-deletion guard: `core.config` smoke now reads
`opencore.admin.title`, proves its persisted `system` flag is true, proves
single delete returns 400, creates a custom config with `system=false`, proves a
mixed custom plus system batch delete returns 400 without deleting the custom
row, and then cleans up through the normal delete path. Admin static smoke locks
`System built-in configs cannot be deleted`, `getCheckboxProps`,
`selectedDeletableKeys` and `record.system`; public Admin verification proves
the deployed Config chunk and public API enforce the same policy through the
Admin/API origins.

Round 41 added the user role-assignment guard: `core.user` smoke now reads
`GET /core/users/:id/roles`, proves a normal user token without
`core:user:manage` receives 403 for GET/PATCH, proves system-user assignment
returns 400, rejects duplicate and missing role codes, clears and restores the
`viewer` role, and proves each role change revokes the previous bearer token
before relogin refreshes `roleCodes`. Admin static smoke locks
`core:user:manage`, `canAssignUserRoles`, the dedicated `Assign Roles` modal,
missing-permission marker and system-user disabled state; public Admin
verification proves the deployed Users chunk contains those markers and public
API/Admin login paths remain clean of duplicate `/api/api` prefixes.

Round 42 added the post batch-delete guard: `core.post` smoke now rejects empty
code arrays, duplicate codes and missing codes, creates two temporary enabled
posts, deletes both through `DELETE /core/posts/batch`, proves both detail
endpoints return 404 and proves the public `posts/simple-list` option source is
cleaned up. Admin static smoke locks `Delete selected`, `rowSelection`,
`selectedPostCodes` and `deleteOpenCoreSystemPosts`; public Admin verification
proves the deployed Posts chunk contains the batch UI markers and the Admin
same-origin proxy can create two posts and delete them through
`/api/core/posts/batch`.

Round 43 added the department user-binding delete guard: `core.dept` smoke now
creates a temporary department plus a bound temporary user, proves deleting the
department returns 400 while the user is assigned, verifies the failed delete
preserves the user's `deptId`, then deletes the user and cleans up the
department. Admin static smoke locks the assigned-user delete warning, and
public Admin verification proves the deployed Departments chunk plus
same-origin proxy enforce the same behavior.

Round 44 added the config runtime-propagation guard: `core.config` smoke now
reads public `GET /core/config/runtime`, updates the seeded
`opencore.admin.title`, proves runtime config returns the new Admin title
through the same public cache boundary, then restores the original title.
Admin static smoke locks the runtime-config service and login runtime title
usage; public Admin verification proves the deployed main bundle contains
`/core/config/runtime`, the same-origin runtime endpoint is public, and both
Admin proxy plus public API see title updates before restore.

Round 45 added the login-log result-schema guard: `core.login-log` smoke now
records a real failed username login, verifies `logType=login.username`,
`result=bad_credentials`, detail fields and export columns, filters by
`logType/result`, and proves invalid `result`/`logType` values return 400.
Admin static smoke locks the Login Logs type/result filter and formatter
markers; public Admin verification proves the deployed Login Logs chunk
contains type/result UI markers and the same-origin proxy can query, detail and
export a real failed login by `logType/result`.

Round 46 added the runtime login-policy guard: `core.config` smoke now verifies
seeded `auth.login.lockoutMinutes` is a public system number config, public
runtime returns `loginLockoutMinutes`, invalid string/decimal/private updates
return 400, and a valid update propagates through `GET /core/config/runtime`
before being restored. Admin static smoke locks the runtime login policy field
and login-page UI marker; public Admin verification proves the deployed main
bundle calls `/core/config/runtime`, the login chunk renders
`Login lockout window`, Admin same-origin runtime matches public API runtime,
duplicate-prefix login still works, and login-policy updates restore cleanly.

Round 47 added the login lockout/unlock guard: `core.login-log` smoke now
creates a temporary user, triggers five bad username/password attempts, proves
the correct password is rejected while locked, verifies an `account_locked`
login-log row is filterable, calls `POST /core/login-logs/unlock`, proves the
correct password works again, and deletes the temporary user. Admin static smoke
locks the Login Logs unlock UI, `core:login-log:manage` access marker and
`account_locked` result option; public Admin verification proves the deployed
Login Logs chunk contains unlock UI markers and the same-origin proxy can call
`/api/core/login-logs/unlock`.

Round 48 added the login-log cleanup guard: `core.login-log` smoke now rejects
empty and duplicate batch-delete payloads, rejects a mixed existing/missing ID
without deleting the existing row, deletes a selected login log and proves its
detail endpoint returns 404, calls clean-all and proves the list is empty, then
records a post-clean failed login to prove the logging pipeline still works.
Admin static smoke locks `core:login-log:delete`, `canDeleteLoginLogs`,
`Delete selected`, `Clean all` and the cleanup policy marker; public Admin
verification proves the deployed Login Logs chunk contains cleanup UI markers
and the same-origin proxy reaches the batch-delete empty guard.

Round 49 added the runtime failed-attempt policy guard: `core.config` smoke now
verifies seeded `auth.login.maxFailedAttempts` is a public system number config,
rejects invalid zero/decimal/private updates, updates a valid value and proves
`GET /core/config/runtime` returns it before restore. `core.login-log` smoke now
temporarily sets the threshold to 3, triggers exactly three bad attempts,
proves lockout and unlock behavior, then restores the original value. Admin
static smoke locks the login-page runtime field and deploy-script stale bundle
guard, while `pnpm deploy:opencore` refuses an Admin bundle missing
`loginMaxFailedAttempts` or `Login lockout policy`.

Round 50 added the self logout/session-revocation guard: `core.login-log`
smoke now creates a temporary user, logs in to get a real bearer token, calls
`POST /auth/logout`, proves the same token is rejected by `/auth/me`, and then
proves a `logType=logout.self`, `result=success` row is filterable by username.
Admin static smoke locks that the avatar menu calls `logoutFromOpenCore`
instead of only clearing local storage; public Admin bundle verification proves
the deployed main bundle contains `/auth/logout` and the API origin without an
extra `/api` suffix.
