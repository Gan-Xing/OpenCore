# cycle-010 Reference Comparison

## NestWeb

- NestWeb keeps RBAC/system resources addressable by stable identifiers such as role code, user id, dict code, config key and log id.
- Its system-log/login-log boundary treats logs as read-oriented diagnostic records; OpenCore should preserve that read-only behavior in Admin details.
- Runtime config and logging guidance emphasizes redaction, so OpenCore detail views must not reconstruct or reveal secret config values.

## Antdpro6

- Antdpro6 uses ProTable list pages with row-level detail actions for system logs, login logs and approvals.
- Detail surfaces use Drawer/ProDescriptions patterns rather than overloading table cells with every field.
- Existing Antdpro6 access conventions distinguish view/detail permissions from mutation permissions; OpenCore should keep core detail actions read-only under the existing read page boundary.

## RuoYi / ruoyi-vue-pro

- RuoYi-style system modules expose stable list/detail flows for users, roles, menus, dicts, config and logs.
- Log detail pages are inspection surfaces, not mutation workflows.
- Dict/config pages separate row summary from item/value details, which maps cleanly to an Admin drawer with JSON sections.

## Yudao / yudao-ui-admin-vue3

- Yudao UI includes explicit detail components for login logs, operate logs, API logs, mail/SMS logs and social users.
- The detail components keep the list page scannable while moving verbose payloads into a separate detail surface.
- OpenCore should translate that product shape into React/antd drawers using local typed summaries and redaction rules, not copy Vue components.
