# cycle-021 Round 2 core.dept Completion Report

Date: 2026-06-12

## Scope

Round 2 productized `core.dept` as the next cycle-021 capability-map slice. The
accepted loop is department tree management, not user binding or data-scope
administration.

## Completed

- System department detail API contract, service and repository support.
- SDK department tree/detail/export/create/update/delete methods, types,
  fixtures and tests.
- Module-registry Admin metadata for `core.dept`.
- Admin route/access/shell registry wiring for `/system/depts`.
- Live Admin Departments page with tree list, detail, current-page export,
  create, update and delete actions.
- Admin smoke coverage for route, access, shell registry and live SDK tree
  usage.
- OpenAPI snapshot and registry route/tag drift checks refreshed.

## Verification

- Focused system/sdk/module-registry/api/admin typecheck passed.
- Focused system/sdk/module-registry/api tests passed.
- Admin smoke/tests passed.
- OpenAPI export/check/tag check, registry Admin route check and SDK check
  passed.
- Live HTTP smoke against port 3010 passed the login, list, detail, create
  parent, create child, update child, reject parent delete, delete child, delete
  parent and final list sequence.

## Explicitly Not Included

- User-department binding.
- Data-scope assignment UI.
- Batch delete or drag-sort persistence.
- Multi-tenant department hierarchy.
- Any CRM/ERP/MES/WMS/mall/member/pay/AI capability.

## Commit Record

- Feature commit: pending.
- Push: pending.
