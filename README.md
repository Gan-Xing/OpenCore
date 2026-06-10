# OpenCore（开元）

开放之源，万物之始。

OpenCore（中文名：开元）定位为 **AI Native 企业级全栈 Monorepo**。它面向一人公司、小团队和现代企业应用开发，用一套代码库统一管理 API、官方后台中台、官网、移动端、小程序、桌面端、共享契约、模块注册表、代码生成器 OpenForge，以及 AI Native 能力预留。

## 当前阶段

当前已经完成 S0/S1/D1-D6，并进入 S2：初始化 `apps/api` 和 `apps/admin` 空项目。S2 只建立可运行 API/Admin 双主干，不写业务代码。

本阶段明确不做：

- 不实现登录、RBAC、多租户或任何业务模块。
- 不连接数据库，不生成 Prisma schema。
- 不初始化 Next.js、Expo、Taro、Tauri 项目。
- 不实现知识库、RAG、Agent、模型调用或工作流。
- 不做 CRM、ERP、MES、WMS、商城、支付、会员。

## 技术栈主线

- Monorepo：pnpm workspace + Nx。
- 后端：NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO/S3 + OpenAPI。
- 官方后台：Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- 官网：Next.js，后续阶段初始化。
- 移动端：Expo React Native，后续阶段初始化。
- 小程序：Taro + React，后续阶段初始化，不直接使用 React Native。
- 桌面端：Tauri，后续阶段初始化。
- AI Native：第一阶段只做架构预留，不实现 AI 业务。

## 明确边界

- 不迁移到 Refine。
- 不使用 Vue。
- 不使用 Java。
- 官方 admin 不使用 MUI。
- 其他 UI 方案未来可以作为额外 app，例如 `apps/admin-mui`。

## 工作区结构

- `apps/api`：NestJS API 空应用，已接入 `/health/live`、`/health/ready` 和 OpenAPI skeleton。
- `apps/admin`：Umi Max + Ant Design Pro V6 官方后台空应用，已锁定 React 19、antd 6、ProComponents v3。
- `apps/web`：官网占位，后续使用 Next.js。
- `apps/mobile`：移动端占位，后续使用 Expo React Native。
- `apps/miniapp`：小程序占位，后续使用 Taro + React。
- `apps/desktop`：桌面端占位，后续使用 Tauri。
- `packages/*`：共享包、契约、SDK、配置、模块注册表、设计资产、测试工具和 AI 能力预留。
- `tools/generator`：OpenForge 代码生成器预留。
- `infra/*`：Docker、Nginx、监控和 Kubernetes 预留。
- `docs/*`：架构、模块、开发、部署、运行手册和 AI 路线文档。

## 本地命令

```bash
pnpm install
pnpm dev:api
pnpm dev:admin
pnpm build:api
pnpm build:admin
pnpm test:api
pnpm test:admin
```

API 默认端口为 `3000`，健康检查为 `/health/live` 和 `/health/ready`，OpenAPI 文档为 `/api/docs`。

Admin 默认使用 Umi Max dev server，通常为 `http://localhost:8000`。

## 文档入口

- [架构总览](docs/architecture/overview.md)
- [品牌与命名](docs/architecture/brand.md)
- [技术栈](docs/architecture/tech-stack.md)
- [Monorepo 规划](docs/architecture/monorepo.md)
- [平台边界](docs/architecture/platform-boundaries.md)
- [模块注册表](docs/modules/module-registry.md)
- [模块分类](docs/modules/module-taxonomy.md)
- [优先级路线图](docs/modules/priority-roadmap.md)
- [开发起步](docs/development/getting-started.md)
- [契约与权限规范](docs/development/contract-and-permission-standard.md)
- [API 启动计划](docs/development/api-bootstrap-plan.md)
- [Admin 启动计划](docs/development/admin-bootstrap-plan.md)
- [OpenForge 路线图](docs/development/openforge-roadmap.md)
- [AI Native 路线图](docs/ai/ai-native-roadmap.md)
- [Handoff 索引](docs/handoff/README.md)
