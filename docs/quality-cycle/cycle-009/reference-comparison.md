# cycle-009 Reference Comparison

## NestWeb

- NestWeb system/config/dict/log services use bounded query DTO fields (`keyword`, `enabled`, `group`, `status`, etc.) instead of free-form query DSLs.
- NestWeb security baseline treats secrets, tokens and sensitive query parameters as redaction surfaces.
- Lesson for OpenCore: core Admin export must be real current-page CSV and must redact secret config values.

## Antdpro6

- Antdpro6 RBAC/system pages use `ProTable` search forms and `TableExportButton` rather than inert toolbar buttons.
- System config, dict, file, login log and operation log pages use explicit columns/search controls, and export is presented as a separate table action.
- Lesson for OpenCore: the S6/S7 wrapper components should provide consistent list ergonomics so each page does not hand-roll the same toolbar.

## RuoYi / ruoyi-vue-pro

- RuoYi-style system pages expose query forms for user, role, menu, dict, config, file/log pages, and exports are permissioned explicit actions.
- Query fields are stable business fields, not arbitrary JSON/SQL expressions.
- Lesson for OpenCore: RBAC/system pages should filter by stable fields such as enabled/system/stage/visibility/type/result.

## Yudao / yudao-ui-admin-vue3

- Yudao-style system and infra pages keep list query controls, operation buttons and export separate.
- Sensitive values are not exposed as raw export columns.
- Lesson for OpenCore: keep the official Admin native to React/Umi/Ant Design Pro, but preserve the product convention of explicit bounded list controls.

## OpenCore Gap

- `apps/admin/src/pages/System/RbacTable.tsx` and `SystemManagementTable.tsx` predate the cycle 007/008 shared current-page export/filter helpers.
- Existing S6/S7 pages can reuse the same primitives without changing backend contracts or adding write behavior.
