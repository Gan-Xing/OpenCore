# cycle-021 Round 6 core.permission Completion Report

Date: 2026-06-12

## Scope

Round 6 productized `core.permission` as the next cycle-021 RBAC slice. The
accepted loop is OpenCore's persisted permission catalog with system/custom
metadata and guarded custom permission management, not RuoYi/Yudao-style role
menu-tree or user-role assignment.

## Completed

- Permission detail API contract and repository support.
- SDK permission detail method, `system` metadata field and tests.
- API-side system/custom permission metadata across seed and Prisma
  repositories.
- Registry permission update/delete protection.
- Live Admin Permissions page with list, detail, current-page export, create,
  update and delete actions for custom permissions.
- Live Admin Roles page permission options sourced from the permission API.
- Admin platform service wrappers for permission list/detail/create/update/
  delete.
- Admin smoke coverage for SDK-backed permission lifecycle usage and page
  behavior.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Focused sdk/api/admin typecheck passed.
- Focused sdk/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check/tag check, registry Admin route check and SDK check
  passed.
- Full gates passed: format, lint, typecheck, test, build, Prisma validate,
  API tests, contracts/module-registry/sdk tests, OpenAPI checks, registry
  Admin route check, Admin smoke and SDK check.
- Live HTTP smoke against port 3010 passed the login, list, seeded detail,
  create custom permission, detail, update, export preview, system-permission
  update rejection, system-permission delete rejection, delete, deleted-detail
  404 and final list sequence.

## Explicitly Not Included

- Registry definition editing.
- Dynamic permission discovery.
- Role menu-tree assignment.
- User-role assignment.
- Permission cache or menu cache refresh.
- Token permission refresh semantics after permission mutation.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit:
  `680b578 feat(core-permission): productize permission management / 产品化权限管理闭环`.
- Push: `origin/main` updated from `1ad577b` to `680b578`.
