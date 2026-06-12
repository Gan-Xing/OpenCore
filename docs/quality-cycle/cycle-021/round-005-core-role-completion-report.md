# cycle-021 Round 5 core.role Completion Report

Date: 2026-06-12

## Scope

Round 5 productized `core.role` as the next cycle-021 capability-map slice. The
accepted loop is role management with permission assignment and OpenCore's
existing data-scope model, not RuoYi/Yudao-style role-user assignment or
menu-tree assignment.

## Completed

- System role detail API contract, service and repository support.
- SDK role detail method, data-scope type fields and tests.
- Live Admin Roles page with list, detail, current-page export, create, update
  and delete actions.
- Custom data-scope department selection using the existing department tree.
- Admin platform service wrappers for role list/detail/create/update/delete.
- Admin smoke coverage for SDK-backed role lifecycle usage and page behavior.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Focused system/sdk/api/admin typecheck passed.
- Focused system/sdk/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check/tag check, registry Admin route check and SDK check
  passed.
- Full gates passed: format, lint, typecheck, test, build, Prisma validate,
  API tests, contracts/module-registry/sdk tests, OpenAPI checks, registry
  Admin route check, Admin smoke and SDK check.
- Live HTTP smoke against port 3010 passed the login, list, seeded detail,
  create with custom data scope, detail, update to self data scope, export
  preview, system-role delete rejection, delete, deleted-detail 404 and final
  list sequence.

## Explicitly Not Included

- Role-user assignment pages.
- Role menu-tree assignment.
- Simple-list option endpoints.
- Batch role deletion.
- Standalone data-scope endpoint.
- Role status toggle.
- Token permission refresh semantics after role update.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit:
  `7ca8b2f feat(core-role): productize role management / 产品化角色管理闭环`.
- Push: `origin/main` updated from `4269cb4` to `7ca8b2f`.
