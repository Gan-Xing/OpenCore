# apps/api 启动计划

本文档定义 `apps/api` 的 NestJS 启动顺序。当前 D1-D6 阶段只做计划，不初始化 NestJS 项目，不接数据库，不写 Prisma schema，不实现登录、RBAC、多租户或业务模块。

## 目标

S2 的 API 目标是建立一个可运行、可检查、可导出 OpenAPI 的空后端基线。

非目标：

- 不实现业务登录。
- 不实现 RBAC。
- 不创建业务表。
- 不写 Prisma schema。
- 不做 CRM、ERP、MES、WMS、商城、支付、会员或多租户。
- 不做知识库、RAG、Agent 或模型调用。

## 启动顺序

### API-0：初始化 NestJS 空应用

- 在 `apps/api` 初始化 NestJS 应用。
- 接入 Nx target：`serve`、`build`、`lint`、`test`、`typecheck`。
- 保持默认模块最小化，只保留启动入口和健康检查所需结构。

验收：

- `pnpm nx serve api` 可以启动。
- `pnpm nx build api` 可以构建。
- 没有业务模块。

### API-1：配置和环境变量校验

- 建立配置加载规范。
- 建立环境变量 schema 和默认值策略。
- 区分 local、test、production。
- 密钥只读取环境变量，不进入仓库。

验收：

- 缺失必要环境变量时启动失败且错误明确。
- 文档说明每个变量的用途。

### API-2：健康检查

- 建立 `/health/live` 和 `/health/ready` 设计。
- live 只表示进程存活。
- ready 后续用于依赖检查。

验收：

- 无数据库依赖时，健康检查仍可用于本地和 CI。

### API-3：OpenAPI 基线

- 接入 NestJS OpenAPI 文档导出。
- 建立 OpenAPI title、version、tag、error schema、pagination schema 的规范。
- 生成契约产物到 `packages/contracts` 的流程在 S2 先空跑。

验收：

- 可以导出 OpenAPI 文档。
- OpenAPI 产物不包含业务接口。

### API-4：日志、错误和请求上下文

- 建立统一错误响应格式。
- 建立 request id / trace id 规范。
- 建立结构化日志规范。

验收：

- 后续业务接口可以复用统一错误和日志机制。

### API-5：Prisma 接入设计

该步骤只在 API-0 到 API-4 稳定后执行。

- 先设计 Prisma module 接入方式。
- 再设计迁移策略。
- 再引入 PostgreSQL 连接。
- 最后才定义业务 schema。

D1-D6 和 S2 初始阶段不写 Prisma schema。

### API-6：Redis、BullMQ、MinIO/S3 接入设计

- Redis 用于缓存、限流、队列依赖。
- BullMQ 用于后台任务。
- MinIO/S3 用于文件对象存储。

这些能力必须在健康检查、配置和错误规范稳定后接入。

### API-7：auth/RBAC 设计后置

登录和 RBAC 是后续阶段，不属于 D1-D6，也不应抢在 API 基线之前实现。

在实现前必须先完成：

- 权限码标准。
- 菜单标准。
- 模块注册表标准。
- OpenAPI SDK 同步规范。

## 与 packages 的关系

- `packages/config`：配置 schema 和读取规范。
- `packages/contracts`：OpenAPI 产物和共享契约。
- `packages/auth`：后续认证与权限抽象。
- `packages/module-registry`：模块、权限和菜单元数据。
- `packages/testing`：API 测试工具。

## S2 实际执行记录

S2 使用 Nx/Nest 官方生成器初始化 `apps/api`，实际命令：

```bash
pnpm add -Dw @nx/nest@21.6.11 @nestjs/cli
pnpm nx g @nx/nest:application apps/api --name=api --linter=eslint --unitTestRunner=jest --e2eTestRunner=none --useProjectJson --strict --skipFormat
pnpm add -w @nestjs/swagger swagger-ui-express
```

当前 S2 结果：

- `apps/api` 已被 Nx 识别为 `api` 项目。
- 已配置 `build`、`serve`、`lint`、`test`、`typecheck` targets。
- 已实现 `/health/live` 和 `/health/ready`。
- 已接入 OpenAPI skeleton，文档路径为 `/api/docs`。
- 未接入 Prisma、PostgreSQL、Redis、BullMQ、MinIO/S3。
- 未实现登录、RBAC、多租户或业务模块。

## 风险

- 过早接数据库会让 schema 先于模块边界固化。
- 过早实现登录/RBAC 会导致权限码和菜单规范返工。
- 过早引入业务模块会掩盖 API 基线质量问题。
