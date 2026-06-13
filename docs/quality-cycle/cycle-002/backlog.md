# cycle-002 Backlog

## 1. Platform Core

- [x] Q002-P1-GATE-DRIFT：阶段 1；问题：recursive complete-cycle gate 未运行已存在的 admin route/access 与 registry tag drift 检查；参考来源：NestWeb system-log/openapi tests、Antdpro6 access/routes；涉及文件：`tools/quality-cycle/opencore-quality-cycle.mjs`、`package.json`；实施要求：把 Admin route/access 与 registry/OpenAPI tag drift 检查纳入 gateCommands，保持 `.env.opencore.local` 不读取不输出；完成标准：complete-cycle 内部 gate 覆盖 route/access 与 registry/OpenAPI tag drift。

## 2. Contract System

- [x] Q002-P2-SUMMARY-CONTRACTS：阶段 2；问题：collaboration/operations/integration center 缺少 OpenAPI/SDK summary contract；参考来源：Antdpro6 services、Yudao `src/api/system/*` 与 `src/api/infra/*`；涉及文件：`apps/api/src/modules/**/dto.ts`、`packages/sdk/src/*-types.ts`、`packages/sdk/src/*-client.ts`、`packages/contracts/openapi/opencore-api.json`；实施要求：新增 summary DTO、SDK summary types、client methods，保持稳定路径；完成标准：SDK 可调用三个 summary endpoint，OpenAPI snapshot clean。

## 3. OpenForge

- [x] Q002-P3-OPENFORGE-GATE-DOC：阶段 3；问题：OpenForge gate 文档没有说明 recursive gate 会额外执行项目漂移脚本；参考来源：OpenForge doctor/gate、NestWeb openapi workflow；涉及文件：`docs/development/openforge-v1-architecture.md`、`tools/generator/README.md`；实施要求：补充 gate 说明，强调 no-write/protected paths 与 route/access/tag drift；完成标准：文档与实际 gate 命令一致。

## 4. Collaboration

- [x] Q002-P4-COLLAB-SUMMARY：阶段 4；问题：message/notice/todo/approval-lite 缺少中心页 summary；参考来源：NestWeb messages/approval-requests、Antdpro6 MessageCenter/Approvals；涉及文件：`apps/api/src/modules/collaboration/collaboration/*`、`packages/sdk/src/collaboration-*`、`apps/admin/src/pages/Collaboration/*`；实施要求：新增 `GET /collaboration/summary`，返回 unread/read/archived message counts、draft/published notices、pending/assigned/completed/canceled todos、pending/approved/rejected approvals，并在 Admin collaboration pages 使用 fixture summary；完成标准：summary 不引入 BPMN，仅聚合已 admitted collaboration records。

## 5. Workflow / Reports / Jobs

- [x] Q002-P5-OPERATIONS-SUMMARY：阶段 5；问题：jobs/cache/online-users/reports 缺少 monitor center summary；参考来源：RuoYi/Yudao monitor job、redis、report centers；涉及文件：`apps/api/src/modules/monitor/operations/*`、`packages/sdk/src/operations-*`、`apps/admin/src/pages/Monitor/*`、`apps/admin/src/pages/Optional/*`；实施要求：新增 `GET /monitor/operations/summary`，返回 job enabled/disabled/run status counts、cache key count、online active/revoked counts、report enabled/disabled counts、export design status；完成标准：只做 bounded summary，不实现完整 report designer 或 async export executor。

## 6. Integration Capability

- [x] Q002-P6-INTEGRATION-SUMMARY：阶段 6；问题：providers/mail/sms/oauth/design-only topics 缺少 integration center summary；参考来源：Yudao mail/sms/oauth/pay API organization、RuoYi pay boundary；涉及文件：`apps/api/src/modules/integration/integration/*`、`packages/sdk/src/integration-*`、`apps/admin/src/pages/Integrations/*`；实施要求：新增 `GET /integrations/summary`，返回 provider health/enabled counts、mail/sms outbox status counts、OAuth provider count、design-only topic count，继续使用 `integration.billing-design` 而不是 `integration.pay`；完成标准：summary 不实现真实支付、微信生产闭环或 WebSocket server。

## 7. Cycle 002 Closeout

- [x] Q002-CLOSE-001：更新 `docs/quality-cycle/cycle-002/implementation-notes.md`。
- [x] Q002-CLOSE-002：写 `docs/quality-cycle/cycle-002/completion-report.md`。
- [x] Q002-CLOSE-003：运行全仓 gate。
- [x] Q002-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
