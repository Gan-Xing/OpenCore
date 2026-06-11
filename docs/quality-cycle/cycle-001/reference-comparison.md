# OpenCore Quality Cycle 001 Reference Comparison

Reference clones inspected under `/tmp/opencore-quality-refs`.

## Gan-Xing/NestWeb

Inspected files and directories:

- `docs/permission-model.md`
- `docs/permissions.md`
- `docs/openapi/nestweb.openapi.json`
- `src/permissions`
- `src/menus`
- `src/messages`
- `src/approval-requests`
- `src/queue`
- `src/system-log`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `docs/development/message-center-integration.md`
- `docs/development/approval-lite-integration.md`
- `docs/handoff/ts-fullstack-s8-message-approval-export-handoff.md`

Reusable patterns:

- Stable role and permission codes are treated as cross-end contracts.
- Menus and permissions are related but not the same domain.
- Message center and approval-lite are useful bounded collaboration features.
- Queue and system-log are platform observability features, not domain modules.
- OpenAPI drift is a release gate, not a manual afterthought.

OpenCore comparison:

- OpenCore already mirrors stable permission codes and menu-permission linking through `@opencore/module-registry`.
- OpenCore has no collaboration.message or collaboration.approval-lite runtime yet.
- OpenCore audit/logging is not yet automatic for every write route.
- OpenCore must not migrate NestWeb schema/business code; only the boundary patterns are used.

## Gan-Xing/Antdpro6

Inspected files and directories:

- `src/access.ts`
- `config/routes.ts`
- `src/components/TableExportButton`
- `src/components/ResultStates`
- `src/pages/Dashboard`
- `src/pages/MessageCenter`
- `src/pages/Approvals`
- `src/pages/Auth`
- `src/pages/System`
- `src/pages/Security`
- `src/services/nest-web`
- `e2e`

Reusable patterns:

- Umi route access should be an explicit permission mapping, not hidden page logic.
- Admin pages should call typed service clients.
- Table export should be a reusable page-level action with bounded current-page semantics.
- Message center and approvals deserve first-class pages and smoke tests.
- E2E smoke tests cover auth/session and S8-style system pages.

OpenCore comparison:

- OpenCore Admin already has route/access mapping for dashboard, RBAC, system, monitor, OpenAPI, and export tools.
- OpenCore has no MessageCenter or Approval routes yet.
- OpenCore SDK exists, but Admin still uses local utility/request patterns and needs drift checks against registry routes/access.
- No Antdpro6 React code is copied.

## RuoYi / ruoyi-vue-pro

Inspected capability map:

- `yudao-module-system`
- `yudao-module-infra`
- `yudao-framework/yudao-spring-boot-starter-monitor`
- `yudao-framework/yudao-spring-boot-starter-job`
- `yudao-module-bpm`
- `yudao-module-report`
- `yudao-module-mall`
- `yudao-module-member`
- `yudao-module-crm`
- `yudao-module-erp`
- `yudao-module-mes`
- `yudao-module-wms`
- `yudao-module-pay`
- `yudao-module-iot`
- `yudao-module-ai`
- `yudao-ui/yudao-ui-admin-vue3`

Reusable patterns:

- Keep system, infra, monitor, job, workflow, report, and integration capabilities as separately admitted modules.
- Code generation and permission/route/menu metadata are platform concerns.
- CRM/ERP/MES/WMS/mall/member/pay/iot/AI are optional or business packages, not core.

OpenCore comparison:

- OpenCore has core/system/monitor/tool foundations and OpenForge.
- OpenCore does not yet have job, report, workflow admission, mail/SMS/OAuth provider boundaries.
- OpenCore must not copy Java/Vue implementation or import business domains into core.

## Yudao / yudao-ui-admin-vue3

Inspected capability map:

- `src/api/system`, including `dict`, `menu`, `role`, `user`, `notice`, `notify`, `mail`, `sms`, `oauth2`, `loginLog`, `operatelog`
- `src/api/infra`, including `codegen`, `config`, `file`, `job`, `jobLog`, `redis`
- `src/api/bpm`
- `src/api/report`
- `src/api/mall`
- `src/api/member`
- `src/api/crm`
- `src/api/erp`
- `src/api/iot`
- `src/api/ai`
- `src/views/system`, `src/views/infra`, `src/views/bpm`, `src/views/report`, `src/views/mall`, `src/views/member`, `src/views/crm`, `src/views/erp`, `src/views/iot`, `src/views/ai`
- `src/directives/permission`

Reusable patterns:

- System and infra pages are organized by domain with parallel API/view folders.
- Notification/notice/mail/SMS/OAuth appear as platform-adjacent modules with explicit UI/API surfaces.
- BPM/report/codegen pages are separate from business packages.
- Permission directives/access are applied consistently at view/action boundaries.

OpenCore comparison:

- OpenCore Admin routes are flat and explicit; future collaboration/integration pages should follow the same explicit route/access convention.
- OpenCore must keep BPM as admission/design/approval-lite bridge during cycle 001.
- OpenCore must only add payment as provider/mock/sandbox design until callback idempotency, refund, and reconciliation boundaries are explicitly complete.
