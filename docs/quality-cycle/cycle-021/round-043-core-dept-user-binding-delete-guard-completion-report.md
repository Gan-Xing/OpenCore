# Round 043 core.dept User Binding Delete Guard Completion Report

Date: 2026-06-13
Feature commit:
`b4624cf feat(core-dept): guard deleting assigned departments / 保护已分配用户的部门删除`

## Scope

This round closed the department deletion data-integrity gap where a leaf
department with assigned users could be deleted and Prisma would set
`User.deptId` to null through the existing relation behavior.

The accepted loop covers API/runtime, Admin feedback, repository tests,
fixed-port smoke, deploy smoke and public URL verification.

## Implemented

- Added assigned-user preflight protection to seed and Prisma department
  deletion paths.
- Kept the existing child-department delete guard before mutation.
- Rejected deleting a department when any user still references it.
- Proved failed deletion preserves the user's `deptId`.
- Added Admin Departments delete-error fallback copy for assigned-user
  deletion failures.
- Extended `core.dept` smoke with assigned-user guard and preserved-binding
  checks.
- Locked the Admin delete warning in static smoke.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Fixed-port local smoke passed on `39173` and included:

- `core.dept.delete.assigned-user-guard`
- `core.dept.delete.assigned-user-preserved`

Deployment completed through `pnpm deploy:opencore` with API on `39172` and
Admin on `39174`.

## Public Verification

- Public API: `http://144.217.243.161:39172`
- Public Admin: `http://144.217.243.161:39174`
- Public `pnpm smoke:core-dept` passed with the assigned-user guard checks.
- Public Admin login bundle contains API origin
  `http://144.217.243.161:39172` and no duplicate `/api/api/auth/login`.
- Public Departments chunk contains `assigned users cannot be deleted`.
- Public Admin same-origin `/api/auth/login` and compatible
  `/api/api/auth/login` both succeeded.
- Public Admin same-origin proxy created a temporary department and bound user,
  rejected department deletion with 400, verified the user still had the same
  `deptId`, then cleaned up the user and department.

## Remaining Debt

This round does not claim full department productization. Remaining admitted
`core.dept` debt:

- data-scope workflow integration;
- ordered tree operations where useful.

Still out of scope for this round:

- department user binding Admin workflow;
- batch department deletion;
- drag-sort persistence.
