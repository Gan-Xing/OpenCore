# cycle-009 Backlog

- [x] Q009-P1-CORE-ADMIN-WRAPPER-FILTER-EXPORT：阶段 1；问题：`RbacTable` / `SystemManagementTable` still render raw fixture rows and an inert export button；参考来源：Antdpro6 ProTable search + TableExportButton、OpenCore current-page filter/export helpers；涉及文件：`apps/admin/src/pages/System/RbacTable.tsx`、`SystemManagementTable.tsx`、`apps/admin/src/pages/shared/*`；实施要求：wrappers accept search fields, select filters, export columns/resource, use `useCurrentPageFilters`, bind `filteredRows`, and export via `CurrentPageExportButton`；完成标准：core wrappers no longer use raw `rows` for table/export.

- [x] Q009-P2-RBAC-ADMIN-FILTERS-EXPORTS：阶段 2；问题：users/roles/permissions/menus pages have no bounded filters or real current-page export；参考来源：RuoYi/Yudao system RBAC query forms、Antdpro6 Auth pages；涉及文件：`apps/admin/src/pages/System/Users.tsx`、`Roles.tsx`、`Permissions.tsx`、`Menus.tsx`；实施要求：add search fields, select filters for enabled/system/stage/dangerous, and export columns；完成标准：4 个 RBAC pages filter current rows and export filtered rows.

- [x] Q009-P3-SYSTEM-MANAGEMENT-FILTERS-EXPORTS：阶段 3；问题：dict/config/files pages have no current-page filters/export and config secret values need export redaction；参考来源：NestWeb dict/config bounded queries、RuoYi/Yudao system management pages；涉及文件：`apps/admin/src/pages/System/Dicts.tsx`、`Config.tsx`、`Files.tsx`；实施要求：add search fields, select filters for enabled/valueType/visibility/mime/uploadedBy, export columns, config secret value redaction；完成标准：S7 system pages filter/export without leaking secret config values.

- [x] Q009-P4-SECURITY-LOG-FILTERS-EXPORTS：阶段 4；问题：login/operation logs pages have no result/status filters or current-page export；参考来源：Antdpro6 login/system log pages、RuoYi/Yudao loginLog/operLog pages；涉及文件：`apps/admin/src/pages/Security/LoginLogs.tsx`、`OperationLogs.tsx`；实施要求：add search fields, select filters for success/status/method/action, export columns using summary-only fields；完成标准：security log pages filter/export current rows without adding log mutation behavior.

- [x] Q009-P5-ADMIN-SMOKE-CORE-GUARD：阶段 5；问题：Admin smoke guards S10/S11/S12 filter/export but not S6/S7 core wrapper parity；参考来源：Antdpro6 smoke/E2E list checks、OpenCore cycle-008 smoke guard；涉及文件：`apps/admin/scripts/smoke-test.mjs`；实施要求：assert core pages use search fields/filter/export column props and wrappers use current-page helpers；完成标准：core Admin pages cannot regress to raw static list/export wrappers unnoticed.

- [x] Q009-P6-OPENFORGE-CORE-FILTER-EXPORT-DOCS：阶段 6；问题：OpenForge docs mention generated Admin filters/exports generically but not core/RBAC/system wrapper parity and secret config export redaction；参考来源：Yudao/RuoYi system query/export conventions、OpenForge Admin generator；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：document generated core Admin wrappers must use bounded current-page filters, filtered export rows, and secret config redaction；完成标准：generated core Admin guidance matches S6/S7 wrapper implementation.

- [x] Q009-CLOSE-001：更新 `docs/quality-cycle/cycle-009/implementation-notes.md`。
- [x] Q009-CLOSE-002：写 `docs/quality-cycle/cycle-009/completion-report.md`。
- [x] Q009-CLOSE-003：运行全仓 gate。
- [x] Q009-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
