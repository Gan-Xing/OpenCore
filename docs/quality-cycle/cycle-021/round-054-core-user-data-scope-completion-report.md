# Round 54 Completion Report: core.user Data-Scope Enforcement

## Scope

Round 54 closed the admitted data-scope query enforcement stage for
`core.user/core.dept`.

This round delivered:

- `RequireDataScope({ userIdField: 'id', deptIdField: 'deptId' })` on user
  list, export and simple-list endpoints;
- an internal `SystemUserDataScopeFilter` query contract;
- seed and Prisma repository filtering for `all`, `none` and restricted
  `userIds`/`deptIds`;
- department-subtree filters intersected with role data-scope filters;
- focused seed/Prisma unit coverage for self-scope, department intersection,
  no-data scope, simple-list and export row counts;
- fixed-port, deploy and public smoke proving a `dataScope=self`
  low-permission user can only list/export itself.

Out of scope: full tenant isolation, all-module data-permission rollout,
workflow ownership rules, batch department deletion and drag-sort UI.

## Commits

- Feature commit:
  `446d9af feat(user): enforce data-scope on user queries / 用户查询启用数据范围约束`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.773e27e7.js`
- Users chunk: `p__System__Users.55735978.async.js`

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Local fixed-port smoke passed with:

- `core.user.data-scope.self-list`
- `core.user.data-scope.dept-intersection`
- `core.user.data-scope.simple-list`
- `core.user.data-scope.export`

Deploy smoke passed on fixed ports `39172`/`39174` with the same data-scope
checks, plus Admin same-origin login, duplicate-prefix login compatibility,
public Admin bundle checks and retired service-worker behavior.

Public API user smoke passed with the same data-scope checks against
`http://144.217.243.161:39172`.

Public Admin verification passed with:

- main bundle `umi.773e27e7.js` containing the fixed API origin;
- main bundle not containing `/api/api/auth/login`;
- Users chunk `p__System__Users.55735978.async.js` containing
  `Department scope`, `/core/users/export`, `/core/users/simple-list` and
  `deptId`.

## Remaining Debt

- `core.dept`: no remaining work in the current admitted P1 waterline.
- `core.dept`: batch department deletion, drag-sort UI or tenant-wide
  data-permission rollout if separately admitted.
- `core.user`: email/phone/social profile expansion remains outside the
  current admitted waterline.
