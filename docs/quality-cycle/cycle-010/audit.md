# cycle-010 Audit

London time: 2026-06-11 04:00:45 Europe/London

## Findings

OpenCore has closed the current-page filter/export gap for the core Admin pages, but the older S6/S7 wrappers still lack the read-only detail drawer pattern used by newer admitted pages.

- S10/S11/S12 pages open `ReadOnlyDetailDrawer` by stable id/code and keep table rows, detail state and export state separate.
- `RbacTable` and `SystemManagementTable` now have bounded filters and current-page export, but they still render only table rows plus placeholder create/edit/delete controls.
- Core RBAC pages have enough row data to show read-only details for users, roles, permissions and menus without adding mutation behavior.
- Core system/security pages have enough row data to show read-only details for dicts, config, files, login logs and operation logs.
- System config detail needs the same secret-value redaction discipline as current-page export. The current fixtures also lack a `secret` visibility sample, so the redaction path is not visible in Admin or SDK fixture checks.
- Admin smoke checks cover filters/export for core wrappers, but do not prevent a regression where core pages drop detail drawer metadata.

## Target

Add read-only detail drawer parity to S6/S7 core Admin wrappers and pages while preserving the current no-mutation boundary. Detail drawers must use summary/fixture data only, show stable identifiers, include JSON sections where useful, and redact secret system config values.

## Non-Goals

- No new backend mutation behavior.
- No new persistence, Prisma schema or migrations.
- No direct migration of NestWeb, Antdpro6, RuoYi or Yudao code.
- No arbitrary detail query builder or hidden bulk behavior.
