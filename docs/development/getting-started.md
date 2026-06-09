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
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

当前阶段尚未初始化 `apps/api` 和 `apps/admin` 的具体框架项目，因此部分 Nx target 在 S0/S1 可能没有可执行项目。这是阶段性预期，不代表业务能力缺失。

## 当前不可做

- 不实现登录。
- 不实现 RBAC。
- 不接数据库。
- 不生成 Prisma schema。
- 不初始化 Next.js、Expo、Taro 或 Tauri。
- 不实现 AI 业务、知识库、RAG、Agent 或工作流。
- 不做 CRM、ERP、MES、WMS、商城、支付、会员或多租户。
