# cycle-003 Backlog

## 1. Platform Core

- [x] Q003-P1-QUERY-FILTER-POLICY：阶段 1；问题：新模块 list API 只有 pagination，缺少 bounded server-side filters；参考来源：NestWeb query DTO、RuoYi/Yudao list query contracts；涉及文件：`apps/api/src/modules/**/dto.ts`、`apps/api/src/modules/**/repository.ts`；实施要求：添加 status/type/enabled/prefix 等白名单过滤字段，避免任意 SQL/JSON 查询；测试要求：API repository specs 覆盖过滤；完成标准：过滤在 seed 和 Prisma repository 行为一致。

## 2. Contract System

- [x] Q003-P2-SDK-FILTER-CONTRACTS：阶段 2；问题：SDK clients 只序列化 page/pageSize，无法表达 list filters；参考来源：Antdpro6 services、Yudao `src/api/*` query object pass-through；涉及文件：`packages/sdk/src/collaboration-*`、`packages/sdk/src/operations-*`、`packages/sdk/src/integration-*`、`packages/contracts/openapi/opencore-api.json`；实施要求：新增 typed query request types，SDK `withQuery` 序列化 string/number/boolean filters；测试要求：SDK path specs + OpenAPI export/check；完成标准：SDK 可稳定生成带 filters 的 list URL。

## 3. OpenForge

- [x] Q003-P3-OPENFORGE-FILTER-DOC：阶段 3；问题：OpenForge docs 未强调生成 list API 时必须声明 bounded filter query DTO；参考来源：OpenForge template docs、NestWeb query DTO；涉及文件：`docs/development/openforge-template-authoring.md`、`docs/development/openforge-v1-architecture.md`；实施要求：补充 list filter guidance，禁止无界任意过滤；测试要求：`pnpm openforge:doctor`、`pnpm openforge:gate`；完成标准：文档指导与本轮 API query policy 一致。

## 4. Collaboration

- [x] Q003-P4-COLLAB-FILTERS：阶段 4；问题：collaboration lists 无法按 status/recipient/assignee/source 过滤；参考来源：NestWeb messages/approval query DTO、Antdpro6 MessageCenter/Approvals；涉及文件：`apps/api/src/modules/collaboration/collaboration/*`、`packages/sdk/src/collaboration-*`；实施要求：messages 支持 status/recipient，notices 支持 status，todos 支持 status/assignee/sourceType，approvals 支持 status/requester/approver；测试要求：API repository spec + SDK spec；完成标准：不引入 BPMN，仅过滤现有 records。

## 5. Workflow / Reports / Jobs

- [x] Q003-P5-OPERATIONS-FILTERS：阶段 5；问题：jobs/cache/online-users/reports lists 无法按 operational filters 查询；参考来源：RuoYi/Yudao monitor job、redis、report；涉及文件：`apps/api/src/modules/monitor/operations/*`、`packages/sdk/src/operations-*`；实施要求：jobs 支持 enabled/queueName，runs 支持 status，cache 支持 prefix，online-users 支持 active，reports 支持 enabled/owner；测试要求：API repository spec + SDK spec；完成标准：不实现 report designer 或 async export executor。

## 6. Integration Capability

- [x] Q003-P6-INTEGRATION-FILTERS：阶段 6；问题：providers/templates/outbox lists 无法按 type/enabled/health/status/provider 查询；参考来源：Yudao mail/sms/oauth/pay list APIs；涉及文件：`apps/api/src/modules/integration/integration/*`、`packages/sdk/src/integration-*`；实施要求：providers 支持 type/enabled/healthStatus，templates 支持 enabled，outbox 支持 status/providerCode；测试要求：API repository spec + SDK spec；完成标准：不实现真实 payment/WeChat/WebSocket runtime。

## 7. Cycle 003 Closeout

- [x] Q003-CLOSE-001：更新 `docs/quality-cycle/cycle-003/implementation-notes.md`。
- [x] Q003-CLOSE-002：写 `docs/quality-cycle/cycle-003/completion-report.md`。
- [x] Q003-CLOSE-003：运行全仓 gate。
- [x] Q003-CLOSE-004：运行 `node tools/quality-cycle/opencore-quality-cycle.mjs complete-cycle --max 20 --run-gate` 并确认 completedCycles +1。
