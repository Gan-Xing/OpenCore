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
- P0/P1 foundation capabilities are auto-admissible as independent rounds.
  Older out-of-scope wording must be narrowed when it conflicts with this
  rule; only large business/platform domains still require explicit admission.

## Classification

| Round                                       | Capability            | Status                  | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | --------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1/55/56/60/61/63                            | `core.notice`         | First loop, enhance     | Management CRUD is live. Round 55 adds persisted per-user read receipts, authenticated inbox list/detail/unread-count/unread-list/mark-read/mark-all-read APIs, SDK/OpenAPI coverage, an Admin Inbox tab and a header unread badge. Round 56 adds management read-user analytics through API/SDK/Admin/OpenAPI and smoke-proves real read receipts are visible by notice. Round 60 adds persisted notification templates, strict render preview, template CRUD and draft-notice creation through API/SDK/Admin/OpenAPI plus smoke/deploy stale-bundle guards. Round 61 adds persisted in-app delivery records, publish-time auto dispatch, explicit idempotent dispatch, delivery list filters, Admin delivery records modal and read-status synchronization. Round 63 adds local provider execution with `provider/providerStatus/attemptCount/lastAttemptAt/sentAt/lastError`, explicit `execute` API, providerStatus filtering, Admin execute/provider columns, smoke/deploy guards and public chunk/OpenAPI verification. Real WebSocket/SMS/Mail adapters, multi-channel retry/failure queues and tenant/member/mobile channels remain below a full notice product.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2/27/43/52/54                               | `core.dept`           | Meets current waterline | Tree CRUD, child delete guard, the enabled-department simple-list option source consumed by Admin Users and user-bound department delete protection are live. Round 43 blocks deleting departments assigned to users and proves the failed delete preserves user `deptId`. Round 52 adds same-parent sibling order updates through API/SDK/Admin and smoke-proves duplicate, missing, malformed and cross-parent guards plus saved order in both tree and simple-list consumers. Round 54 applies admitted role/dept data-scope constraints to user list, export and simple-list queries, proving self-scope and department-filter intersections in fixed/deploy/public smoke. Batch department deletion, drag-sort UI and broader tenant-wide data-permission rollout remain separate admission decisions, not blockers for the current department waterline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3/22/25/42/53                               | `core.post`           | Meets current waterline | Post CRUD is live, Round 22 closes user-post binding, Round 25 adds the dedicated enabled-post simple-list option source consumed by Admin Users, Round 42 adds permission-gated batch deletion with selected-row Admin UI plus strict empty/duplicate/missing guards, and Round 53 adds ordered-list updates through API/SDK/Admin with malformed/duplicate/missing guards plus list/simple-list smoke. Drag-sort-only UI remains a separate admission decision, not a blocker for the current post waterline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4/16                                        | `core.menu`           | Meets current waterline | Round 16 closed the flat-model gap: menus now persist parent tree metadata, type, icon/component/status/cache fields, Admin tree operations, delete guards, nullable parent clearing and smoke coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5/17/18/20                                  | `core.role`           | Meets current waterline | Role CRUD, permission-code assignment, data scope, role menu-tree assignment, role-user assignment and role status are live. Role status/update/delete mutations revoke affected sessions, disabled roles are removed from auth/RBAC calculation and system roles cannot be disabled.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6                                           | `core.permission`     | Meets current waterline | OpenCore deliberately owns a persisted permission catalog. System/custom separation, registry mutation protection, live Admin CRUD for custom permissions and role option integration are enough for this product boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7/19/22/23/28/29/30/31/32/33/34/35/36/41/54 | `core.user`           | Meets current waterline | User CRUD with role/dept selection is live. Round 19 adds status/reset plus session invalidation after user mutations, Round 22 adds persisted post binding, Round 23 adds server-side department subtree filtering plus the Admin department side tree, Round 28 adds authenticated self-profile basic display-name read/update, Round 29 adds authenticated self-password change with old-password verification plus session revocation, Round 30 adds the authenticated enabled-user simple-list option source consumed by Admin role assignment, Round 31 adds profile avatar upload/public preview/replace/delete backed by file storage, Round 32 adds batch enable/disable plus batch delete with session revocation, Round 33 adds CSV-compatible import template/import results with update-existing session revocation, Round 34 adds the dedicated `core:user:import` permission across registry/API/Admin/smoke, Round 35 adds native XLSX export payload plus Admin `Download Excel` and fixed/deploy/public smoke guards, Round 36 adds native XLSX import template/parsing while keeping CSV backwards compatibility, Round 41 adds the dedicated User-page role assignment workflow with `core:user:manage`, API/SDK/Admin/OpenAPI coverage and session revocation, and Round 54 enforces role dataScope on list/export/simple-list queries while preserving explicit department subtree filters. Email/phone/social profile expansion remains outside the currently admitted waterline.                                                                                                                                                                                                                                                                                                                                                                      |
| 8/21                                        | `core.dict`           | Meets current waterline | Dict type CRUD plus embedded items is live from Round 8. Round 21 adds item-level management API/SDK/Admin, a public `dict-data/simple-list` consumer endpoint, disabled type/item filtering and smoke coverage for malformed boolean deserialization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 9/24/37/38/39/40/44/46/49/58/62/64          | `core.config`         | First loop, enhance     | Config CRUD and secret redaction are live. Round 24 adds public value-by-key reading, service value-cache refresh and mutation invalidation. Round 37 adds category/name/remark metadata across Prisma/API/SDK/Admin/export/smoke while preserving secret redaction and cache behavior. Round 38 adds native XLSX export payload plus Admin `Download Excel`, shared workbook/download helpers and fixed/deploy/public smoke guards. Round 39 adds permission-gated batch deletion with selected-row Admin UI and cache invalidation. Round 40 adds a persisted system/custom flag, blocks single and batch deletion of built-in configs, and disables destructive Admin selection/actions for system rows. Round 44 adds a public runtime config summary consumed by Admin login/shell title and smoke-proves title cache invalidation. Round 46 adds `auth.login.lockoutMinutes` as a public runtime login-policy field, Admin login consumption and runtime-key guardrails for public/type/integer validity; Round 47 consumes it from security-auth lockout enforcement. Round 49 adds `auth.login.maxFailedAttempts`, security-auth consumption, Admin login display and stale frontend bundle guards. Round 58 adds public boolean `feature.*.enabled` runtime feature flags, SDK/OpenAPI/Admin Config toggle/export support and smoke/deploy stale-bundle guards. Round 62 adds secret config at-rest vault encryption, seeded `auth.jwt.secretRef`, API/SDK/OpenAPI/Admin `encrypted` status, database plaintext smoke guards and stale Config bundle guards. Round 64 adds public numeric `feature.*.rolloutPercentage`, runtime `featureFlagRules`, deterministic evaluate API, SDK/Admin rollout controls and smoke/deploy stale-bundle guards. Remaining auto-admissible config work is audience targeting, rollout governance or a full experimentation surface. |
| 10/15                                       | `core.file`           | Meets current waterline | Round 15 closed the metadata-only gap: authenticated upload writes real content through `FileStorageService`, download returns stored bytes, Admin can upload/download, and smoke proves content equality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 11/26/45/47/48/49/50/51/57/59               | `core.login-log`      | First loop, enhance     | Immutable list/detail/export and failed-login smoke are live. Round 26 adds browser/OS device fields plus server-side IP and time-window filters. Round 45 adds persisted `logType/result` schema, username-login success/bad-credentials/disabled-user result mapping, API/SDK/Admin fields and server filters, export columns and smoke guards for invalid enum values. Round 47 adds persisted failed-attempt lockout, `account_locked` result mapping and permissioned username unlock in API/SDK/Admin/smoke. Round 48 adds permissioned batch deletion and clean-all maintenance actions with strict empty/duplicate/missing guards, no-partial-delete smoke and Admin selected-row cleanup. Round 49 drives the failed-attempt threshold from runtime `auth.login.maxFailedAttempts` and proves it through login-log lockout smoke. Round 50 adds current-user self logout logging plus real bearer token/session revocation. Round 51 adds explicit Monitor Online Users force-kick logging as `logout.force` while keeping internal RBAC/user session invalidation out of forced logout rows. Round 57 replaces the temporary `failureReason` overload with structured `actorUsername` and `reason` fields for self/force logout records across Prisma/API/SDK/Admin/OpenAPI/smoke. Round 59 adds persisted deterministic IP/location enrichment, location server filtering, export columns, Admin Location UI, smoke and deploy stale-bundle guards. Optional external GeoIP country/city/provider depth and broader mobile/social logging remain below reference depth.                                                                                                                                                                                                                                                                                            |
| 12                                          | `core.audit-log`      | Meets current waterline | Immutable operation audit list/detail/export is live and smoke proves a real write operation is recorded. Delete/clean remains an intentional audit-retention policy decision, not a current product blocker.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 13/14                                       | `monitor.online-user` | Meets current waterline | Round 14 closed the Round 13 thin loop: bearer auth now checks online-session state, batch kick-out revokes real sessions, smoke proves kicked tokens return 401, and browser/OS/IP fields reach SDK/Admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

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
   frontend bundle guards. Round 58 completed public boolean
   `feature.*.enabled` runtime feature flags, Admin Config toggles,
   SDK/OpenAPI propagation and feature-flag shape guards. Round 62 completed
   secret config at-rest vault encryption, seeded `auth.jwt.secretRef`,
   API/SDK/OpenAPI/Admin `encrypted` status, database plaintext smoke guards
   and stale Config bundle checks. Round 64 completed feature-flag percentage
   rollout with public numeric `feature.*.rolloutPercentage`, runtime
   `featureFlagRules`, deterministic evaluate API, SDK/Admin rollout controls
   and smoke/deploy stale-bundle guards. Remaining config foundation work is
   audience targeting, multi-environment rollout governance or a full
   experimentation surface. External KMS provider binding, key rotation and
   secret version history remain later hardening stages.
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
   revocation through the online-user session repository. Round 51 completed
   explicit online-user force logout login-log recording while avoiding
   pollution from internal role/user session invalidation. Round 57 completed
   structured actor/reason fields for self/force logout records and removed
   the old `failureReason` semantic overload. Round 59 completed
   deterministic IP/location enrichment with persisted `location`, API/SDK/
   Admin filters, export coverage, smoke and deploy guards. Remaining
   login-log work is optional external GeoIP country/city/provider depth and
   broader mobile/social login logging stages.
3. `core.dept`: Round 27 completed the enabled-department simple-list option
   source; Round 43 completed user-bound department deletion protection and
   preserved user `deptId` on failed delete. Round 52 completed same-parent
   sibling order updates through API/SDK/Admin and fixed/deploy/public smoke.
   Round 54 completed admitted data-scope workflow integration by enforcing
   role dataScope on user list/export/simple-list queries. No remaining
   `core.dept` work is in the current admitted P1 waterline; batch department
   deletion, drag-sort UI or tenant-wide data-permission rollout require
   separate admission.
4. `core.notice`: Round 55 completed persisted per-user read/unread state,
   authenticated inbox APIs, Admin Inbox tab, header unread badge and
   fixed/deploy/public smoke. Round 56 completed management read-user analytics
   for notices across API/SDK/Admin/OpenAPI and smoke. Round 60 completed
   persisted notification templates, strict render preview, template CRUD,
   Admin `System Notice Templates` workflow and draft notice creation from a
   template across API/SDK/Admin/OpenAPI/fixed/deploy/public smoke. Round 61
   completed persisted in-app delivery records, publish-time auto dispatch,
   explicit idempotent dispatch, delivery list filters, Admin delivery records
   modal and read-status synchronization. Round 63 completed local provider
   execution with pending/sent provider state, explicit execute API,
   providerStatus filtering, Admin execute/provider columns and
   fixed/deploy/public smoke. Remaining notice work is real WebSocket/SMS/Mail
   adapters, multi-channel retry/failure queues and any admitted
   tenant/member/mobile channels before claiming full notice-product depth.

Suggested P2 foundation queue after P1 closes:

1. Scheduler/monitor operation depth: job enable/disable/run-now, run-log
   diagnosis, retry/timeout controls and registry whitelist visibility.
2. OpenForge Admin productization: plan/diff/check/apply/manifest/rollback
   surfaces over the existing safe generator boundary.
3. Operation-log maintenance and enrichment: retention policy, structured
   duration/location/user-agent fields and explicit cleanup governance.
4. Report/analytics design-only surfaces: read-only dashboards and data-source
   boundaries before any full report designer admission.
5. Integration foundation: provider config, connection health and audit-only
   diagnostics before business execution workflows.

CRM/ERP/MES/WMS/mall/member/pay/AI remain business-domain admissions outside
the current cycle-021 foundation queue.

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

Round 59 added the login-log location guard: `core.login-log` smoke now records
a failed Chrome/Windows login, verifies detail exposes `location`, proves
server-side location filtering, verifies export columns include `location` and
deploy rejects stale Login Logs bundles missing the Location server filter UI.

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

Round 51 added the force logout login-log guard: `core.online-user` smoke now
logs in a second admin session, kicks it through the explicit Monitor Online
Users batch API, proves the kicked bearer token is rejected by `/auth/me`, and
then proves a `logType=logout.force`, `result=success` row is filterable.
This deliberately records only explicit Monitor Online Users kick-out, not the
internal RBAC/user session invalidation paths used by role or user mutations.

Round 52 added the department order guard: `core.dept` smoke now creates
same-parent sibling departments, rejects duplicate IDs, missing IDs,
cross-parent batches and malformed order values, saves a sibling order update
through `PATCH /core/depts/order`, and proves both department tree and
`depts/simple-list` consumers return the saved relative order.

Round 53 added the post order guard: `core.post` smoke now creates enabled
temporary posts, rejects malformed order values, duplicate codes and missing
codes, saves a post order update through `PATCH /core/posts/order`, and proves
both the management list and `posts/simple-list` consumers return the saved
relative order.

Round 54 added the user data-scope guard: `core.user` smoke now creates a
temporary role with `dataScope=self`, logs in a low-permission user, proves
`GET /core/users`, `GET /core/users/simple-list` and
`GET /core/users/export` only expose that user, and proves a manual department
query is intersected with the resolved data-scope rather than widening it.

Round 55 added the notice inbox/read-state guard: `core.notice` smoke now
proves unauthenticated inbox access is 401, invalid `readStatus` is 400, empty
and duplicate read-id arrays are 400, drafts are hidden from the inbox, missing
read ids are 404, published notices appear unread, mark-read is idempotent,
read and unread filters split correctly, mark-all-read clears remaining unread
items, and cleanup removes the temporary notices. Deploy smoke runs the same
script on fixed port `39172`, and public smoke runs it against
`http://144.217.243.161:39172`.

Round 56 added the notice read-user analytics guard: `core.notice` smoke now
rejects missing notice read-user queries with 404, marks a published notice
read through the authenticated inbox path, then proves the same logged-in user
appears in `GET /core/notices/:id/read-users` with a non-empty `readAt`.
Deploy smoke and public smoke run the same guard on fixed port `39172`, and
public Admin verification checks the deployed main bundle plus System Notices
chunk contain the read-users service and modal markers.

Round 57 added the structured logout actor/reason guard: `core.login-log`
smoke now proves self logout records `actorUsername` plus `reason`, online-user
force logout records the operator and reason in dedicated fields, and force
logout no longer writes those semantics into `failureReason`. Deploy smoke and
public smoke run the same guards on fixed port `39172`, while public Admin
verification checks the deployed Login Logs chunk contains actor filtering plus
Actor/Reason table and detail markers.

Round 58 added the runtime feature-flag guard: `core.config` smoke now verifies
seeded `feature.notice.inbox.enabled=true`, creates a dynamic
`feature.smoke.*.enabled` flag, proves `GET /core/config/runtime` exposes it
through `featureFlags`, rejects private/string/malformed feature-flag create
and update attempts, toggles it to false, and verifies the runtime map changes.
Admin static smoke and `pnpm deploy:opencore` now reject a stale Config bundle
that lacks the Feature Flag column, toggle marker and runtime/standard tags;
public verification proved the deployed Config chunk and runtime endpoint.

Round 60 added the notice template guard: `core.notice` smoke now verifies the
seeded `release.window` simple-list option, strict template render output,
missing/extra param rejection, malformed `enabled` and `pinned`
deserialization guards, template create/list/render, draft notice creation
from template, disabled-template render blocking and template cleanup. Admin
static smoke and `pnpm deploy:opencore` now reject a stale System Notices
bundle missing `System Notice Templates`, `Notice template render preview` or
`Create draft from template`; public verification proved the deployed
`p__System__Notices.c0987784.async.js` chunk contains those markers.

Round 61 added the notice delivery guard: `core.notice` smoke now verifies
missing notice delivery guards, draft dispatch blocking, malformed
`readStatus` and `channel` deserialization guards, unread and read delivery
records, idempotent explicit dispatch and inbox read sync back to delivery
`status/readAt`. Admin static smoke and `pnpm deploy:opencore` now reject a
stale System Notices bundle missing `System Notice Delivery Records` or
`Dispatch in-app deliveries`; the seed path resolves the actual admin user id
instead of assuming `user_admin`, so delivery seed data survives existing
database id drift.

Round 62 added the config secret vault guard: `core.config` smoke now verifies
the seeded `auth.jwt.secretRef` secret reference is redacted and forbidden from
value-by-key access, creates a temporary secret config, proves API detail/list
and export stay redacted, rejects non-string secret value types, and reads the
same `SystemConfig.value` row from PostgreSQL to prove it is an
`opencore:vault:v1:` envelope without the plaintext. Admin static smoke and
`pnpm deploy:opencore` now reject a stale Config bundle missing
`Vault encrypted`; public verification proved the deployed Config chunk
contains the vault markers.

Round 63 added the notice provider-execution guard: `core.notice` smoke now
verifies providerStatus deserialization, pending local-provider rows after
publish, `POST /core/notices/:id/deliveries/execute`, sent provider records,
idempotent repeat execution and read-state sync after provider execution. Admin
static smoke and deploy guard reject stale System Notices bundles missing
`Execute local provider` or `Provider Status`; public verification proved the
deployed chunk and OpenAPI markers.

Round 64 added the config feature-rollout guard: `core.config` smoke now
verifies seeded `feature.notice.inbox.rolloutPercentage=100`, runtime
`featureFlagRules`, deterministic public evaluate results, bad flag/subject
guards, invalid rollout create/update guards, dynamic rollout changes and
rollout disabled behavior. Admin static smoke and deploy guard reject stale
Config bundles missing `Rollout %`, `Set rollout` or `Feature rollout`;
public verification proved the deployed Config chunk, OpenAPI markers and
public `config/feature-flags/evaluate` endpoint through the config smoke.
