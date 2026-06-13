# Round 52 Completion Report: core.dept Sibling Order

## Scope

Round 52 closed the same-parent department sibling order stage for `core.dept`.

This round delivered:

- `PATCH /api/core/depts/order` protected by `core:dept:update`;
- DTO, repository, service, seed and Prisma support for department order
  updates;
- duplicate ID, missing ID, malformed order and cross-parent batch guards;
- SDK `updateDeptOrder` support;
- Admin Departments Move up / Move down row actions;
- OpenAPI snapshot updates;
- fixed-port, deploy and public smoke proving saved order in both tree and
  simple-list consumers.

Out of scope: data-scope workflow integration, role data-scope assignment UI,
batch department deletion and drag-sort persistence.

## Commits

- Feature commit:
  `2086842 feat(dept): add sibling order updates / 新增部门同级排序`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.c97fac69.js`
- Departments chunk: `p__System__Departments.a9ff471b.async.js`

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

Local fixed-port smoke passed with:

- `core.dept.order.duplicate-guard`
- `core.dept.order.missing-guard`
- `core.dept.order.same-parent-guard`
- `core.dept.order.bad-order-guard`
- `core.dept.order.update`
- `core.dept.order.tree-order`
- `core.dept.order.simple-list-order`

Deploy smoke passed on fixed ports `39172`/`39174` with the same department
order checks, plus Admin same-origin login, duplicate-prefix login
compatibility, public Admin bundle checks and retired service-worker behavior.

Public API department smoke passed with the same order checks against
`http://144.217.243.161:39172`.

Public Admin verification passed with:

- main bundle `umi.c97fac69.js` containing the fixed API origin;
- main bundle containing `/core/depts/order`;
- main bundle not containing `/api/api/auth/login`;
- Departments chunk `p__System__Departments.a9ff471b.async.js` containing
  `Move up`, `Move down` and `Department order saved.`.

## Remaining Debt

- `core.dept`: data-scope workflow integration.
- `core.dept`: role data-scope assignment UI if admitted.
- `core.dept`: batch department deletion if admitted.
- `core.dept`: drag-sort persistence UI if admitted.
