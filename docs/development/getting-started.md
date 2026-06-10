# 开发起步

## 环境要求

- Node.js 22 或更高版本。
- pnpm 10 或更高版本。

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
```

S2 已初始化 `apps/api` 和 `apps/admin` 空项目：

- `pnpm nx serve api`：启动 NestJS API。
- `pnpm nx serve admin`：启动 Umi Max Admin。
- `pnpm nx build api` / `pnpm nx build admin`：构建双主干。
- `pnpm nx test api`：运行 API Jest health tests。
- `pnpm nx test admin`：运行 Admin S2 smoke test 和 typecheck。
- `pnpm nx typecheck api` / `pnpm nx typecheck admin`：类型检查。

API 启动后：

- `/health/live`：进程存活检查。
- `/health/ready`：S2 无外部依赖 readiness。
- `/api/docs`：OpenAPI skeleton。

Admin 启动后默认访问 Umi Max dev server，通常为 `http://localhost:8000`。

## 当前不可做

- 不实现登录。
- 不实现 RBAC。
- 不接数据库。
- 不生成 Prisma schema。
- 不初始化 Next.js、Expo、Taro 或 Tauri。
- 不实现 AI 业务、知识库、RAG、Agent 或工作流。
- 不做 CRM、ERP、MES、WMS、商城、支付、会员或多租户。
