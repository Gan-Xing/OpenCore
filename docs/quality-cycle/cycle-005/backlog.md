# cycle-005 Backlog

- [x] Q005-P1-DETAIL-KERNEL：阶段 1；问题：平台已具备 `requireRecord` 但 admitted modules 缺少统一 detail lookup 口径；参考来源：RuoYi/Yudao detail + page 分离、NestWeb entity read flows；涉及文件：`apps/api/src/modules/**/repository.ts`；实施要求：为 detail lookup 复用 `requireRecord`/redaction/hidden-record policy，不泄露 deleted message 或 secrets；完成标准：seed 和 Prisma repository 行为一致。

- [x] Q005-P2-SDK-DETAIL-CONTRACTS：阶段 2；问题：SDK clients 缺少 get/detail methods，Admin/consumer 只能 list 后本地筛选；参考来源：Antdpro6 services、Yudao `get*` API；涉及文件：`packages/sdk/src/collaboration-client.ts`、`packages/sdk/src/operations-client.ts`、`packages/sdk/src/integration-client.ts`、对应 specs/types；实施要求：新增 detail client methods 并扩展 path specs；完成标准：detail URL/method drift 会被 SDK specs 捕获。

- [x] Q005-P3-OPENFORGE-DETAIL-DOCS：阶段 3；问题：OpenForge docs 说明了 filters/action guards，但未规定 list/action-heavy 模块要有 detail read contract；参考来源：Yudao detail drawer/form patterns、OpenForge template authoring；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：补充 detail endpoint authoring guidance，强调 read permission、redaction、hidden/deleted policy；完成标准：后续 generated module skeleton 能表达 list/detail/action 三层边界。

- [x] Q005-P4-COLLAB-DETAIL-ENDPOINTS：阶段 4；问题：messages/notices/todos/approval-lite 缺少 detail endpoints；参考来源：Antdpro6 MessageCenter/Approvals detail drawer、NestWeb messages/approval entities；涉及文件：`apps/api/src/modules/collaboration/collaboration/*`、`packages/sdk/src/collaboration-*`；实施要求：新增 `GET /collaboration/messages/:id`、`/notices/:id`、`/todos/:id`、`/approvals/:id`，deleted message detail 返回 not found；完成标准：collaboration detail read 与 list/action 权限一致。

- [x] Q005-P5-OPERATIONS-DETAIL-ENDPOINTS：阶段 5；问题：jobs/runs/online-users/reports 缺少 detail endpoints，无法支撑确认页或日志详情；参考来源：RuoYi/Yudao job detail、job log detail、monitor online user；涉及文件：`apps/api/src/modules/monitor/operations/*`、`packages/sdk/src/operations-*`；实施要求：新增 `GET /monitor/jobs/:code`、`/monitor/jobs/:code/runs/:id`、`/monitor/online-users/:id`、`/optional/reports/:code`；完成标准：operations detail read 不触发 scheduler/export 执行。

- [x] Q005-P6-INTEGRATION-DETAIL-ENDPOINTS：阶段 6；问题：providers/templates/outbox 缺少 detail endpoints，provider detail 必须保持 redaction；参考来源：Yudao mail/sms template get/send forms、OAuth provider config patterns；涉及文件：`apps/api/src/modules/integration/integration/*`、`packages/sdk/src/integration-*`；实施要求：新增 provider、mail/sms template、mail/sms outbox detail endpoints；provider config redacted，outbox payload 仅保留 mock queue data；完成标准：detail endpoints 不绕过 disabled/provider/action guards。

- [x] Q005-CLOSE-001：更新 `docs/quality-cycle/cycle-005/implementation-notes.md`。
- [x] Q005-CLOSE-002：写 `docs/quality-cycle/cycle-005/completion-report.md`。
- [x] Q005-CLOSE-003：运行全仓 gate。
- [x] Q005-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
