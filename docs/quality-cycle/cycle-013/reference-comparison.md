# cycle-013 Reference Comparison

## NestWeb

NestJS backends often keep export logic behind service-level serializers so generated CSV/Excel output does not reuse raw request data directly. OpenCore's Admin export path is client-side for current-page fixtures, so the equivalent safety boundary is the shared CSV cell serializer.

## Antdpro6

Ant Design Pro table export helpers typically centralize row-to-file conversion. OpenCore already has a reusable `CurrentPageExportButton`; this cycle tightens that shared conversion point instead of adding per-page escaping rules.

## RuoYi / ruoyi-vue-pro

RuoYi-style admin export flows are permissioned and server-mediated. When OpenCore uses a bounded client-side CSV export for fixture-backed pages, it still needs spreadsheet-specific safety comparable to backend export utilities.

## Yudao / yudao-ui-admin-vue3

Yudao separates export permissions from list/detail actions and treats export as its own operational surface. OpenCore keeps the S8 current-page CSV boundary and adds formula-prefix neutralization as part of that export surface.
