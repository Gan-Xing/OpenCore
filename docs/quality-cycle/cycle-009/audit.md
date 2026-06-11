# cycle-009 Audit

London time: 2026-06-11 03:47:04 Europe/London

## Findings

Cycles 006-008 hardened newer S10/S11/S12 Admin pages with detail drawers, current-page export and bounded current-page filters. The older S6/S7 Admin wrappers still lag behind that standard:

- `RbacTable` renders a static `ProTable` with `search={false}`, raw `rows`, and an inert `DownloadOutlined` button instead of the shared current-page CSV export protocol.
- `SystemManagementTable` renders static S7/security rows with no filter toolbar and no current-page export action.
- S6/S7 pages do not declare export columns, so sensitive system config values cannot be redacted at the export contract level.
- Admin smoke tests now guard S10/S11/S12 pages, but do not guard the older core RBAC/system/security pages against unfiltered or inert-export regressions.
- OpenForge docs state generated Admin pages need bounded filters and filtered export, but do not explicitly call out core/RBAC/system-management wrapper parity.

## Scope Decision

Cycle 009 will upgrade existing core Admin wrappers and pages only. It will not add backend mutations, real create/update/delete forms, live API data fetching, async export execution, multitenancy, workflow, report designer, payment execution, CRM, ERP, MES, WMS, mall, member, AI, RAG or Agent features.

## Target

- Make `RbacTable` and `SystemManagementTable` consume the shared current-page filter/export primitives.
- Add bounded filters and export columns for users, roles, permissions, menus, dictionaries, system config, files, operation logs and login logs.
- Redact secret config values from current-page CSV export.
- Extend Admin smoke checks to cover S6/S7 pages.
- Update OpenForge docs so generated core/RBAC/system management tables keep the same filter/export contract as newer modules.
