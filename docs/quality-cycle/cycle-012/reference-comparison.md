# cycle-012 Reference Comparison

## NestWeb

NestJS platforms typically centralize redaction around structured logging, DTO serialization and response shaping so a newly added metadata field cannot accidentally leak credentials. OpenCore already has platform logging redaction; this cycle applies the same defensive idea to Admin detail JSON rendering.

## Antdpro6

Ant Design Pro Admin detail drawers and descriptions frequently render backend metadata payloads for operational records. The useful pattern is to keep table, detail and action surfaces separate while applying display-specific formatting at the shared presentation component. OpenCore now keeps that shared detail drawer as the last rendering boundary for JSON redaction.

## RuoYi / ruoyi-vue-pro

RuoYi-style admin consoles expose system config, operation logs and login logs, but secret values are not shown as raw editable/detail values. OpenCore mirrors the read-only operational detail pattern while adding a generic JSON fallback for nested payloads and provider metadata.

## Yudao / yudao-ui-admin-vue3

Yudao admin pages commonly separate list filters, detail views and write dialogs with permission-aware affordances. For OpenCore, the detail drawer remains read-only and adds recursive sensitive-key masking for JSON sections so generated or admitted pages inherit consistent display safety.
