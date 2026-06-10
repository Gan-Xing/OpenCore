# 开发起步

## 环境要求

- Node.js 22 或更高版本。
- pnpm 10 或更高版本。
- PostgreSQL、Redis、MinIO/S3 用于当前 OpenCore runtime integration 本地运行。
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
```

## 当前可运行主线

S2-S8 和 runtime integration R-1-R7 已完成：

- `pnpm nx serve api`：启动 NestJS API。
- `pnpm nx serve admin`：启动 Umi Max Admin。
- `pnpm nx build api` / `pnpm nx build admin`：构建双主干。
- `pnpm nx test api`：运行 API Jest tests。
- `pnpm nx test admin`：运行 Admin smoke/typecheck tests。
- `pnpm prisma:validate`：校验 Prisma schema。
- `pnpm prisma:migrate`：应用 OpenCore baseline migration。
- `pnpm prisma:seed`：幂等初始化 OpenCore RBAC、系统管理和文件 metadata baseline。
- `pnpm openapi:export`：导出 OpenAPI snapshot。
- `pnpm openapi:check`：检查 OpenAPI drift。

API 启动后：

- `/health/live`：进程存活检查。
- `/health/ready`：readiness 检查。
- `/api/docs`：OpenAPI 文档。
- `/api/auth/*`、`/api/core/*`、`/api/monitor/*`、`/api/tools/*`：S6-S8 基线接口。

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

## Runtime 本地基线

本地运行前先准备 `.env.opencore.local`：

```bash
cp .env.example .env.opencore.local
```

然后只在本地替换占位符。该文件必须保持 ignored，不得提交。当前 runtime boundary：

- PostgreSQL：OpenCore-owned database/user/schema，Prisma migration + seed 已验证。
- Redis：OpenCore-owned prefix/DB boundary，用于 runtime diagnostics 和 BullMQ。
- BullMQ：OpenCore queue prefix，只做当前只读诊断基线。
- MinIO/S3：OpenCore-owned bucket/prefix，文件 metadata storageKey 使用 `runtime/` prefix。
- Auth seed：bootstrap admin password 只来自本地 env。

## 当前不可做

- 不实现 CRM、ERP、MES、WMS、商城、支付、会员或多租户。
- 不实现知识库、RAG、Agent 或 AI 业务。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不直接迁移旧 NestWeb / Antdpro6 业务代码。
- 不在 runtime integration 后继续无 handoff 地推进 S9；OpenForge MVP 应另起 handoff/goal。
