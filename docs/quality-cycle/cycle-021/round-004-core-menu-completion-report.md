# cycle-021 Round 4 core.menu Completion Report

Date: 2026-06-12

## Scope

Round 4 productized `core.menu` as the next cycle-021 capability-map slice. The
accepted loop is flat system menu management, not RuoYi/Yudao-style menu tree
or router-generation management.

## Completed

- System menu detail API contract, service and repository support.
- SDK menu detail method, nullable permission clearing type and tests.
- Live Admin Menus page with list, detail, current-page export, create, update
  and delete actions.
- Admin platform service wrappers for menu list/detail/create/update/delete.
- Admin smoke coverage for SDK-backed menu lifecycle usage and page behavior.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Standard round gates passed; repeated command transcripts were removed during docs compaction.

- Focused system/sdk/api/admin typecheck passed.
- Focused system/sdk/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check/tag check, registry Admin route check and SDK check
  passed.
- Full format/lint/typecheck/test gate passed.
- Live HTTP smoke against port 3010 passed the login, list, seeded detail,
  create, detail, update with permission clearing, export preview, delete,
  deleted-detail 404 and final list sequence.

## Explicitly Not Included

- Parent menu tree management.
- Menu type/icon/component/status/cache fields.
- Dynamic router generation.
- Role menu tree assignment.
- Menu cache refresh.
- Save-sort or drag-sort persistence.
- Prisma schema expansion.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit:
  `34e35c7 feat(core-menu): productize system menu management / 产品化系统菜单管理闭环`.
- Push: `origin/main` updated from `79c5583` to `34e35c7`.
