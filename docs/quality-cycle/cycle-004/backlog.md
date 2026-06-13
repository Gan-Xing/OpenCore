# cycle-004 Backlog

- [x] Q004-P1-ACTION-GUARD-KERNEL：阶段 1；问题：平台 action endpoint 缺少统一的 deleted/terminal/disabled guard 口径；参考来源：RuoYi/Yudao job status transition tests、NestWeb approval pending check；涉及文件：`apps/api/src/modules/collaboration/collaboration/collaboration.repository.ts`、`apps/api/src/modules/monitor/operations/operations.repository.ts`、`apps/api/src/modules/integration/integration/integration.repository.ts`；实施要求：添加可复用 guard helper，用 Nest `BadRequestException` 拒绝非法状态，不删除已有安全约束；完成标准：seed 和 Prisma repository 可复用同一 guard 语义。

- [x] Q004-P2-SDK-ACTION-PATHS：阶段 2；问题：SDK specs 只抽样验证少量 action path，不能锁定完整 S10/S11/S12 action contract；参考来源：Antdpro6 services、Yudao action API 分离；涉及文件：`packages/sdk/src/collaboration-client.spec.ts`、`packages/sdk/src/operations-client.spec.ts`、`packages/sdk/src/integration-client.spec.ts`；实施要求：扩展 path specs 覆盖 archive/delete/publish/todo/cancel/reject、job enable/disable/list-runs/report、provider enable/disable/mail/sms/oauth/design；完成标准：SDK action URL/method 变更会被测试发现。

- [x] Q004-P3-OPENFORGE-ACTION-DOCS：阶段 3；问题：OpenForge docs 已要求 bounded filters，但未要求 action endpoint state guards；参考来源：OpenForge template authoring、RuoYi/Yudao status mutation conventions；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：补充 action endpoint guard policy，要求生成/人工 action 先校验当前状态、禁用资源、dry-run/confirmed destructive policy；完成标准：后续 action 模板不会默认生成无状态校验的 mutation。

- [x] Q004-P4-COLLAB-ACTION-GUARDS：阶段 4；问题：message/notice/todo action 可重写 deleted 或 terminal 状态；参考来源：NestWeb messages/approval actions、Antdpro6 MessageCenter/Approvals；涉及文件：`apps/api/src/modules/collaboration/collaboration/*`、`apps/admin/src/pages/Collaboration/*`；实施要求：message deleted 后禁止 read/archive/delete，notice archived 后禁止 publish，todo completed/canceled 后禁止 assign/complete/cancel；Admin fixture page 增加 action policy 可视列；完成标准：合法生命周期通过，非法重复/终态 mutation 抛 `BadRequestException`。

- [x] Q004-P5-OPERATIONS-ACTION-GUARDS：阶段 5；问题：disabled job 仍可 trigger，revoked session 可重复 kick-out 且 body 审计意图未体现；参考来源：RuoYi/Yudao job status transition tests、monitor online user force logout；涉及文件：`apps/api/src/modules/monitor/operations/*`、`apps/admin/src/pages/Monitor/*`；实施要求：triggerJob 仅允许 enabled job，kickOutSession 拒绝已 revoked session，Admin fixture page 展示 guarded action policy；完成标准：operations action 不会对禁用/终态记录继续写入。

- [x] Q004-P6-INTEGRATION-ACTION-GUARDS：阶段 6；问题：mail/SMS outbox 可使用 disabled provider，provider/channel mismatch 抛 plain Error，disabled template 仍可用于 enqueue；参考来源：Yudao mail/sms/template send/test、OAuth callback contract；涉及文件：`apps/api/src/modules/integration/integration/*`、`apps/admin/src/pages/Integrations/*`；实施要求：enqueueOutbox 要求 provider enabled、provider type 匹配 channel、template enabled，错误统一为 Nest `BadRequestException`；Admin fixture page 展示 provider/template action policy；完成标准：integration mock outbox 保持设计边界且 action guard 清晰。

- [x] Q004-CLOSE-001：更新 `docs/quality-cycle/cycle-004/implementation-notes.md`。
- [x] Q004-CLOSE-002：写 `docs/quality-cycle/cycle-004/completion-report.md`。
- [x] Q004-CLOSE-003：运行全仓 gate。
- [x] Q004-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
