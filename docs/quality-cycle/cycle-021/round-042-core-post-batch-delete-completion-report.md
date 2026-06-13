# Round 42 Core Post Batch Deletion Completion Report

Date: 2026-06-13
Feature commit: `885fa9e feat(core-post): add batch post deletion / 新增岗位批量删除`
Public API: `http://144.217.243.161:39172`
Public Admin: `http://144.217.243.161:39174`

## Capability

`core.post` now has a deployable batch-deletion loop aligned with the Yudao
post `delete-list` and Admin selected-row deletion shape.

## Delivered

- Added `DELETE /api/core/posts/batch`, guarded by `core:post:delete`, before
  the dynamic `posts/:code` route.
- Added batch-delete DTOs and a `{ deleted, affected, codes }` result shape.
- Added `deletePosts` to `SystemPostRepository` and `SystemPostService`.
- Implemented all-or-nothing validation in seed and Prisma repositories:
  array shape, non-empty values, duplicate codes and missing posts are rejected
  before any deletion.
- Extended OpenAPI, SDK types/client/tests and API permission-matrix tests.
- Added Admin platform `deleteOpenCoreSystemPosts`.
- Added Admin Posts `rowSelection`, `Delete selected`, loading state and
  selected-row cleanup.
- Extended `tools/scripts/smoke-core-post.mjs` and Admin static smoke with
  batch-delete guards.

## Verification

- `pnpm nx test system --testFile=system-post.spec.ts`
- `pnpm nx test api --testFile=system-management.permission-matrix.spec.ts`
- `pnpm nx test sdk --testFile=system-management-client.spec.ts`
- `pnpm nx test admin`
- `node --check tools/scripts/smoke-core-post.mjs`
- `node --check apps/admin/scripts/smoke-test.mjs`
- `pnpm openapi:export`
- `pnpm openapi:check`
- `pnpm sdk:check`
- `pnpm openapi:registry-tags:check`
- `pnpm nx run-many -t typecheck --projects=api,admin,sdk,system,module-registry,contracts`
- `pnpm prisma:validate`
- `pnpm build:api`
- `pnpm build:admin`
- `pnpm format:check`
- `git diff --check`
- `pnpm smoke:api:local`
- `pnpm deploy:opencore`

## Public Verification

- Public `pnpm smoke:core-post` passed against
  `http://144.217.243.161:39172`, including
  `core.post.batch-delete.empty-guard`,
  `core.post.batch-delete.duplicate-guard`,
  `core.post.batch-delete.missing-guard`,
  `core.post.batch-delete` and
  `core.post.batch-delete.simple-list-cleanup`.
- Public Admin Posts chunk `p__System__Posts.f86b24a4.async.js` contains
  `Delete selected`, `Selected posts deleted` and `rowSelection`.
- Public Admin same-origin proxy login succeeded.
- Public Admin same-origin proxy created two temporary posts and deleted both
  through `/api/core/posts/batch`; both details returned 404 after deletion.

## Productization Waterline

`core.post` now has CRUD, user-post binding, the enabled-post option source and
batch deletion. It remains in "First loop, enhance" only because ordered list
operations or drag-sort persistence are not yet admitted.

## Remaining Debt

- Ordered post list operations where they materially improve Admin user
  workflows.
- No post drag-sort persistence or broader post-user workflow expansion was
  admitted in this round.
