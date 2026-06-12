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

| Round | Capability            | Status                  | Reason                                                                                                                                                                                                                                                             |
| ----- | --------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `core.notice`         | First loop, enhance     | Management CRUD is live, but read/unread state, notification inbox/header badge and delivery semantics remain below a full notice product.                                                                                                                         |
| 2     | `core.dept`           | First loop, enhance     | Tree CRUD and delete guard are live, but user binding, data-scope workflows and ordered tree operations still need follow-up.                                                                                                                                      |
| 3     | `core.post`           | First loop, enhance     | Post CRUD is live, but user-post binding, simple-list option endpoints and batch operations are still missing from the foundation workflow.                                                                                                                        |
| 4/16  | `core.menu`           | Meets current waterline | Round 16 closed the flat-model gap: menus now persist parent tree metadata, type, icon/component/status/cache fields, Admin tree operations, delete guards, nullable parent clearing and smoke coverage.                                                           |
| 5/17  | `core.role`           | First loop, enhance     | Role CRUD, permission-code assignment, data scope and role menu-tree assignment are live. Round 17 also revokes active sessions for users holding a role after menu-permission mutation. Role-user assignment, role status and broader user mutation flows remain. |
| 6     | `core.permission`     | Meets current waterline | OpenCore deliberately owns a persisted permission catalog. System/custom separation, registry mutation protection, live Admin CRUD for custom permissions and role option integration are enough for this product boundary.                                        |
| 7     | `core.user`           | First loop, enhance     | User CRUD with role/dept selection is live, but reset password, status toggle, side-tree filtering, post binding, profile/avatar and token/session refresh semantics remain basic admin expectations.                                                              |
| 8     | `core.dict`           | First loop, enhance     | Dict type plus embedded items is live, but separate dict-data operations, simple-list/cache endpoints and public option consumption remain platform gaps.                                                                                                          |
| 9     | `core.config`         | First loop, enhance     | Config CRUD and secret redaction are live, but get-by-key, cache refresh, category/name/remark enrichment and runtime propagation are still missing.                                                                                                               |
| 10/15 | `core.file`           | Meets current waterline | Round 15 closed the metadata-only gap: authenticated upload writes real content through `FileStorageService`, download returns stored bytes, Admin can upload/download, and smoke proves content equality.                                                         |
| 11    | `core.login-log`      | First loop, enhance     | Immutable list/detail/export and failed-login smoke are live, but device/browser/OS/IP enrichment, date filters, cleanup/unlock policy integration and session actions are still below reference depth.                                                            |
| 12    | `core.audit-log`      | Meets current waterline | Immutable operation audit list/detail/export is live and smoke proves a real write operation is recorded. Delete/clean remains an intentional audit-retention policy decision, not a current product blocker.                                                      |
| 13/14 | `monitor.online-user` | Meets current waterline | Round 14 closed the Round 13 thin loop: bearer auth now checks online-session state, batch kick-out revokes real sessions, smoke proves kicked tokens return 401, and browser/OS/IP fields reach SDK/Admin.                                                        |

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

1. `core.role` plus `core.user`: role-user assignment, role status, user
   status/reset-password flows and token/session refresh semantics after
   user-role/user mutation. Round 17 completed role menu-tree assignment and
   role-permission session revocation.
2. `core.dict`: separate dict data workflow or a clearly equivalent item
   management API, simple-list/cache endpoints and consumer smoke.
3. `core.config`: get-by-key, cache refresh/invalidation and runtime
   propagation boundaries.
4. `core.login-log`: browser/OS parsing, IP/location enrichment where feasible,
   server-side time filters and cleanup/unlock policy integration.
5. `core.dept` and `core.post`: user binding paths, simple-list endpoints and
   ordered tree/list operations where useful.
6. `core.notice`: read/unread state, inbox/header badge and delivery adapter
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
