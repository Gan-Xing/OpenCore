# cycle-009 Implementation Notes

## Plan

- Upgrade RBAC and system-management wrapper components to reuse current-page filters and export.
- Add page-specific bounded search/filter/export column definitions for S6/S7 core pages.
- Redact secret system config values from export output.
- Extend Admin smoke checks for core wrapper/filter/export parity.
- Update OpenForge docs for generated core Admin parity.

## Implemented

- Upgraded `RbacTable` and `SystemManagementTable` to accept bounded search fields, select filters, export columns and resource names, bind ProTable data to `filteredRows`, and export the filtered current-page row set through `CurrentPageExportButton`.
- Added bounded search/filter/export definitions to S6 RBAC pages: users, roles, permissions and menus.
- Added bounded search/filter/export definitions to S7 system pages: dictionaries, system config and files.
- Redacted system config CSV export values when `visibility === 'secret'` while keeping the table display aligned with existing SDK fixture values.
- Added bounded search/filter/export definitions to security log pages for login logs and operation logs without adding mutation behavior.
- Extended `apps/admin/scripts/smoke-test.mjs` so core wrappers must use shared current-page filter/export helpers and core pages must pass search fields, filter options, export columns and resource metadata.
- Updated OpenForge V1 architecture and template authoring docs so generated core/RBAC/system Admin wrappers use bounded current-page filters, filtered exports and secret config export redaction.
