# Round 27 Completion Report: core.dept Simple-list Options

Date: 2026-06-12
Feature commit: `844f36d feat(core-dept): add simple-list option source`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Scope

Round 27 closed the next `core.dept` P1 productization gap: a lightweight
enabled-department option source for consumer forms.

This round remains one deployable, verifiable and reversible stage. It does
not mark the entire department product as complete.

## Delivered

- Public `GET /api/core/depts/simple-list` consumer endpoint.
- Lightweight department option shape: `{ id, name, parentId, order }`.
- Enabled-only, order/name sorted option queries in seed and Prisma
  repositories.
- SDK/OpenAPI/Admin updates for department options.
- Admin Users create/edit department selector now consumes the simple-list
  option source.
- Fixed-port/deploy/public department smoke for disabled-department filtering,
  enabled option inclusion, lightweight option shape, detail/export/delete and
  cleanup.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

## Public Verification

- `GET http://144.217.243.161:39172/health/ready` returned 200.
- Public `pnpm smoke:core-dept` passed against
  `http://144.217.243.161:39172` with `OPENCORE_SMOKE_CHECK_DOCS=false`.
- Public department smoke verified disabled-department filtering, enabled option
  inclusion, lightweight option shape, export/detail/delete and cleanup.
- `GET http://144.217.243.161:39174/system/users/` returned 200.
- Public main Admin bundle `umi.cf2e4e65.js` contains API origin
  `http://144.217.243.161:39172` and `/core/depts/simple-list`, and no
  `/api/api/auth/login`.
- Public Users chunk `p__System__Users.b034bbd1.async.js` contains
  `Select department`.
- Public Admin same-origin proxy login returned 201 for both `/api/auth/login`
  and stale-compatible `/api/api/auth/login`; public API origin
  `/api/api/auth/login` also returned 201.

## Remaining Department Product Debt

- User binding path hardening beyond the current create/edit `deptId` and user
  list department filter.
- Role/custom data-scope department tree workflows.
- Ordered tree operations where useful.
- Batch delete only if admitted with parent/child safety semantics.
- Tenant hierarchy and workflow/business binding remain out of scope until a
  later product decision.
