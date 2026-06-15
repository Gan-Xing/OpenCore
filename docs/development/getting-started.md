# 开发起步

## 环境要求

- Node.js 22 或更高版本。
- pnpm 10 或更高版本。
- PostgreSQL、Redis、MinIO/S3 用于当前 OpenCore runtime 本地运行。
- ignored `.env.opencore.local` 用于本地 OpenCore-only runtime 值；提交文件只能包含 `.env.example` 占位符。

## 安装依赖

```bash
pnpm install
```

## 常用命令

```bash
pnpm nx --help
pnpm dev:api
pnpm dev:admin
pnpm build:api
pnpm build:admin
pnpm test:api
pnpm test:admin
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:seed
pnpm openapi:export
pnpm openapi:check
pnpm quality-docs:check
```

## 当前可运行主线

OpenCore 已完成 S3-S9、runtime integration、OpenForge V1、Q001、BE20、Admin Pro V6 migration 和 Cycle-021 System Admin fallback closure。当前主线不是“继续补旧 S 阶段”，而是按有限验收队列推进新工作。

本地开发：

- `pnpm nx serve api`：启动 NestJS API。
- `pnpm nx serve admin`：启动 Umi Max Admin。
- `pnpm nx build api` / `pnpm nx build admin`：构建双主干。
- `pnpm nx test api`：运行 API Jest tests。
- `pnpm nx test admin`：运行 Admin smoke/typecheck tests。
- `pnpm prisma:validate`：校验 Prisma schema。
- `pnpm prisma:migrate`：应用 OpenCore migration。
- `pnpm prisma:seed`：幂等初始化 OpenCore RBAC、系统管理、运行时和验收所需 seed。
- `pnpm openapi:export`：导出 OpenAPI snapshot。
- `pnpm openapi:check`：检查 OpenAPI drift。

部署验证：

- 固定部署脚本：`pnpm deploy:opencore`
- API：`http://144.217.243.161:39172`
- Admin：`http://144.217.243.161:39174`
- 本地 smoke 端口：`39173`

Docs-only cleanup 不需要重新部署。任何代码改动都必须测试、commit、push、固定脚本部署，并用真实公网 API/Admin 请求验证。打印 Public URL 或只检查 bundle marker 不算 public smoke。

## API 入口

API 启动后：

- `/health/live`：进程存活检查。
- `/health/ready`：readiness 检查。
- `/api/docs`：OpenAPI 文档。
- `/api/auth/*`：登录、当前用户、session/token 行为。
- `/api/core/*`：system/RBAC/config/notice/file 等 core 能力。
- `/api/security/*`：login-log、operation-log 等安全审计能力。
- `/api/monitor/*`：status/version/queue/job/cache/online-user。
- `/api/tools/*`：OpenAPI、export、OpenForge。
- `/api/integrations/*`：provider/mail/sms/oauth/wechat/websocket/billing-design admitted surfaces。
- `/api/collaboration/*`：messages/notices/todos/approval-lite。

## Admin 当前正式页面

以 `apps/admin/config/routes.ts` 为事实来源：

- `/dashboard`
- `/personal/profile`
- `/system/users`
- `/system/roles`
- `/system/permissions`
- `/system/menus`
- `/system/dicts`
- `/system/config`
- `/system/notices`
- `/system/depts`
- `/system/posts`
- `/system/files`
- `/security/login-logs`
- `/security/operation-logs`
- `/monitor/status`
- `/monitor/version`
- `/monitor/queues`
- `/monitor/jobs`
- `/monitor/cache`
- `/monitor/online-users`
- `/tools/openapi`
- `/tools/export`
- `/tools/openforge`
- `/collaboration/messages`
- `/collaboration/notices`
- `/collaboration/todos`
- `/collaboration/approvals`
- `/optional/reports`
- `/optional/export-jobs`
- `/integrations/providers`
- `/integrations/mail`
- `/integrations/sms`
- `/integrations/oauth`
- `/integrations/wechat`
- `/integrations/websocket`
- `/integrations/billing-design`
- `/403`
- `/404`
- `/500`

Admin dev server 默认由 Umi Max 提供，通常为 `http://localhost:8000`。生产/验收部署使用固定 Admin 端口 `39174`。

## Runtime 本地基线

本地运行前先准备 `.env.opencore.local`：

```bash
cp .env.example .env.opencore.local
```

然后只在本地替换占位符。该文件必须保持 ignored，不得提交。当前 runtime boundary：

- PostgreSQL：OpenCore-owned database/user/schema，Prisma migration + seed 已验证。
- Redis：OpenCore-owned prefix/DB boundary，用于 runtime diagnostics、cache 和 BullMQ。
- BullMQ：OpenCore queue prefix，用于 monitor/queue/job admitted surfaces。
- MinIO/S3：OpenCore-owned bucket/prefix，文件 metadata storageKey 使用 runtime prefix。
- Auth seed：bootstrap admin password 只来自本地 env。

## 当前不可直接做

- 不直接实现 CRM、ERP、MES、WMS、mall、member。
- 不直接实现真实支付、退款、对账或生产多租户。
- 不直接实现知识库、RAG、Agent 或 AI workflow。
- 不直接实现完整 BPMN/full workflow、完整报表设计器或大数据异步导出。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不直接迁移旧 NestWeb / Antdpro6 业务代码。
- 不用 OpenForge 直接写 Prisma schema、migration 或业务逻辑。

这些不是“永远不做”，而是需要明确准入、有限验收矩阵和单独部署验证。
