# 开发起步

## 环境要求

- Node.js 22 或更高版本。
- pnpm 10 或更高版本。
- PostgreSQL 用于 S6/S7 schema 和后续本地运行。

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
pnpm openapi:export
pnpm openapi:check
```

## 当前可运行主线

S2-S8 已完成：

- `pnpm nx serve api`：启动 NestJS API。
- `pnpm nx serve admin`：启动 Umi Max Admin。
- `pnpm nx build api` / `pnpm nx build admin`：构建双主干。
- `pnpm nx test api`：运行 API Jest tests。
- `pnpm nx test admin`：运行 Admin smoke/typecheck tests。
- `pnpm prisma:validate`：校验 Prisma schema。
- `pnpm openapi:export`：导出 OpenAPI snapshot。
- `pnpm openapi:check`：检查 OpenAPI drift。

API 启动后：

- `/health/live`：进程存活检查。
- `/health/ready`：readiness 检查。
- `/api/docs`：OpenAPI 文档。
- `/api/auth/*`、`/api/core/*`、`/api/monitor/*`、`/api/tool/*`：S6-S8 基线接口。

Admin 启动后默认访问 Umi Max dev server，通常为 `http://localhost:8000`。

当前正式页面：

- `/dashboard`
- `/system/users`
- `/system/roles`
- `/system/permissions`
- `/system/menus`
- `/system/dicts`
- `/system/config`
- `/system/files`
- `/security/login-logs`
- `/security/operation-logs`
- `/monitor/status`
- `/monitor/version`
- `/monitor/queues`
- `/tools/openapi`
- `/tools/export`

## 当前不可做

- 不实现 CRM、ERP、MES、WMS、商城、支付、会员或多租户。
- 不实现知识库、RAG、Agent 或 AI 业务。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不直接迁移旧 NestWeb / Antdpro6 业务代码。
- 不在 S8 后继续无 handoff 地推进 S9；OpenForge MVP 应另起 handoff/goal。
