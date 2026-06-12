# cycle-021 Productization Waterline Audit

Date: 2026-06-12  
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

| Round      | Capability            | Status                  | Reason                                                                                                                                                                                                                                                                                                                       |
| ---------- | --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | `core.notice`         | First loop, enhance     | Management CRUD is live, but read/unread state, notification inbox/header badge and delivery semantics remain below a full notice product.                                                                                                                                                                                   |
| 2          | `core.dept`           | First loop, enhance     | Tree CRUD and delete guard are live, but user binding, data-scope workflows and ordered tree operations still need follow-up.                                                                                                                                                                                                |
| 3/22/25    | `core.post`           | First loop, enhance     | Post CRUD is live, Round 22 closes user-post binding, and Round 25 adds the dedicated enabled-post simple-list option source consumed by Admin Users. Batch operations and ordered list refinements still remain below the full reference depth.                                                                             |
| 4/16       | `core.menu`           | Meets current waterline | Round 16 closed the flat-model gap: menus now persist parent tree metadata, type, icon/component/status/cache fields, Admin tree operations, delete guards, nullable parent clearing and smoke coverage.                                                                                                                     |
| 5/17/18/20 | `core.role`           | Meets current waterline | Role CRUD, permission-code assignment, data scope, role menu-tree assignment, role-user assignment and role status are live. Role status/update/delete mutations revoke affected sessions, disabled roles are removed from auth/RBAC calculation and system roles cannot be disabled.                                        |
| 6          | `core.permission`     | Meets current waterline | OpenCore deliberately owns a persisted permission catalog. System/custom separation, registry mutation protection, live Admin CRUD for custom permissions and role option integration are enough for this product boundary.                                                                                                  |
| 7/19/22/23 | `core.user`           | First loop, enhance     | User CRUD with role/dept selection is live. Round 19 adds status/reset plus session invalidation after user mutations, Round 22 adds persisted post binding and Round 23 adds server-side department subtree filtering plus the Admin department side tree. Profile/avatar, import/export and option/batch workflows remain. |
| 8/21       | `core.dict`           | Meets current waterline | Dict type CRUD plus embedded items is live from Round 8. Round 21 adds item-level management API/SDK/Admin, a public `dict-data/simple-list` consumer endpoint, disabled type/item filtering and smoke coverage for malformed boolean deserialization.                                                                       |
| 9/24       | `core.config`         | First loop, enhance     | Config CRUD and secret redaction are live. Round 24 adds public value-by-key reading, service value-cache refresh and mutation invalidation. Category/name/remark enrichment, batch/file export depth and broader runtime propagation boundaries remain.                                                                     |
| 10/15      | `core.file`           | Meets current waterline | Round 15 closed the metadata-only gap: authenticated upload writes real content through `FileStorageService`, download returns stored bytes, Admin can upload/download, and smoke proves content equality.                                                                                                                   |
| 11         | `core.login-log`      | First loop, enhance     | Immutable list/detail/export and failed-login smoke are live, but device/browser/OS/IP enrichment, date filters, cleanup/unlock policy integration and session actions are still below reference depth.                                                                                                                      |
| 12         | `core.audit-log`      | Meets current waterline | Immutable operation audit list/detail/export is live and smoke proves a real write operation is recorded. Delete/clean remains an intentional audit-retention policy decision, not a current product blocker.                                                                                                                |
| 13/14      | `monitor.online-user` | Meets current waterline | Round 14 closed the Round 13 thin loop: bearer auth now checks online-session state, batch kick-out revokes real sessions, smoke proves kicked tokens return 401, and browser/OS/IP fields reach SDK/Admin.                                                                                                                  |

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

1. `core.user`: Round 19 completed user status/reset-password flows and direct
   user-mutation session invalidation; Round 22 completed user-post binding;
   Round 23 completed department side-tree filtering. Remaining user work is
   profile/avatar, import/export and option/batch workflows.
2. `core.config`: Round 24 completed public get-value-by-key plus cache
   refresh/invalidation. Remaining config work is category/name/remark
   enrichment, batch/file export depth and broader runtime propagation
   boundaries.
3. `core.login-log`: browser/OS parsing, IP/location enrichment where feasible,
   server-side time filters and cleanup/unlock policy integration.
4. `core.dept` and `core.post`: department binding paths, simple-list
   endpoints for departments, post batch operations and ordered tree/list
   operations where useful.
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
