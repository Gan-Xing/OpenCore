# cycle-021 Round 7 core.user Completion Report

Date: 2026-06-12

## Scope

Round 7 productized `core.user` as the next cycle-021 RBAC/System slice. The
accepted loop is OpenCore's current user management model with role-code
assignment, optional department binding, enabled/password mutation and
seeded-admin protection, not the broader RuoYi/Yudao profile, import, post or
assignment-dialog surface.

## Completed

- User detail API contract and repository support.
- SDK user detail method, `deptId` field, `system` metadata field and tests.
- API-side seeded-admin `system=true` metadata across seed and Prisma-backed
  user summaries.
- Seeded-admin update/delete protection.
- Live Admin Users page with list, detail, current-page export, create, update
  and delete actions.
- Live role-code and department selectors sourced from the admitted role and
  department runtimes.
- Admin platform service wrappers for user list/detail/create/update/delete.
- Admin smoke coverage for SDK-backed user lifecycle usage and page behavior.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Focused system/sdk/api/admin typecheck passed.
- Focused system/sdk/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check, registry tag check, registry Admin route check and SDK
  check passed.
- Full gates passed: format, lint, typecheck, test, build, Prisma validate,
  API tests, contracts/module-registry/sdk tests, OpenAPI checks, registry
  Admin route check, Admin smoke and SDK check.
- Live HTTP smoke against port 3010 passed the live, ready, docs, login, list,
  seeded detail, create user, created detail, update, export preview,
  seeded-admin update rejection, seeded-admin delete rejection, delete,
  deleted-detail 404 sequence.

## Explicitly Not Included

- Excel import/export file workflows.
- Reset-password endpoint.
- Status-toggle endpoint.
- Dedicated user-role assignment dialog.
- Profile/avatar/social/simple-list endpoints.
- Post binding.
- Batch user delete.
- Department side-tree filtering.
- Token/session refresh semantics after user mutation.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit:
  `88c428f feat(core-user): productize user management / 产品化用户管理闭环`.
- Push: `origin/main` updated from `7d1d32f` to `88c428f`.
