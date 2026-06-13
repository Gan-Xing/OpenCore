# Round 53 Completion Report: core.post Ordered List

## Scope

Round 53 closed the ordered-list stage for `core.post`.

This round delivered:

- `PATCH /api/core/posts/order` protected by `core:post:update`;
- DTO, repository, service, seed and Prisma support for post order updates;
- duplicate code, missing code and malformed order guards;
- SDK `updatePostOrder` support;
- Admin Posts Move up / Move down row actions;
- OpenAPI snapshot updates;
- fixed-port, deploy and public smoke proving saved order in both management
  list and simple-list consumers.

Out of scope: drag-sort-only UI and broader岗位 workflow automation.

## Commits

- Feature commit:
  `99078df feat(post): add ordered list updates / 新增岗位排序更新`
- Docs commit: this documentation commit

## Deployment

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Admin main bundle: `umi.1d2d9305.js`
- Posts chunk: `p__System__Posts.f6a42e2e.async.js`

## Verification

- `node --check tools/scripts/smoke-core-post.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm nx test system --testFile=system-post.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `pnpm nx typecheck system`
- `pnpm nx typecheck api`
- `pnpm nx typecheck sdk`
- `pnpm nx typecheck admin`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm prisma:validate`
- `pnpm smoke:api:local`
- `pnpm openapi:registry-tags:check`
- `pnpm registry:admin-routes:check`
- `pnpm format:check`
- `git diff --check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm prisma:seed`
- `pnpm test`
- `pnpm deploy:opencore`

Local fixed-port smoke passed with:

- `core.post.order.bad-order-guard`
- `core.post.order.duplicate-guard`
- `core.post.order.missing-guard`
- `core.post.order.update`
- `core.post.order.list-order`
- `core.post.order.simple-list-order`

Deploy smoke passed on fixed ports `39172`/`39174` with the same post order
checks, plus Admin same-origin login, duplicate-prefix login compatibility,
public Admin bundle checks and retired service-worker behavior.

Public API post smoke passed with the same order checks against
`http://144.217.243.161:39172`.

Public Admin verification passed with:

- main bundle `umi.1d2d9305.js` containing the fixed API origin;
- main bundle containing `/core/posts/order`;
- main bundle not containing `/api/api/auth/login`;
- Posts chunk `p__System__Posts.f6a42e2e.async.js` containing `Move up`,
  `Move down` and `Post order saved.`.

## Remaining Debt

- `core.post`: no remaining work in the current admitted P1 waterline.
- `core.post`: drag-sort-only UI if separately admitted.
- `core.post`: broader岗位 workflow automation if separately admitted.
