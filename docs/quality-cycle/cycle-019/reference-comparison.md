# cycle-019 Reference Comparison

## NestWeb

NestWeb keeps permission, menu, OpenAPI and generated client expectations centralized so UI scaffolds do not fork policy. OpenCore should similarly make generated Admin output consume the same shared filter/detail/export helpers as human-authored Admin pages.

## Antdpro6

Antdpro6's ProTable and TableExportButton patterns centralize list/export behavior around stable page components. OpenCore's generated pages should not emit weaker one-off export buttons when `CurrentPageExportButton` already contains formula, redaction, row-limit and filename policy.

## RuoYi / ruoyi-vue-pro

RuoYi-style code generation aligns generated CRUD pages with platform-wide permission, export and detail conventions. OpenCore should use OpenForge to produce platform-conforming skeletons, not skeletons that drift from Admin shell safety behavior.

## Yudao / yudao-ui-admin-vue3

Yudao's codegen/admin modules keep generated list/detail/export pages consistent with the rest of the front-end module system. OpenCore should mirror that consistency by generating bounded filters, redacted detail surfaces and safe current-page export wiring by default.
