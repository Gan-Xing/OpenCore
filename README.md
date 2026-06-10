# OpenCore（开元）

开放之源，万物之始。

OpenCore（中文名：开元）定位为 **AI Native 企业级全栈 Monorepo**。它面向一人公司、小团队和现代企业应用开发，用一套代码库统一管理 API、官方后台中台、官网、移动端、小程序、桌面端、共享契约、SDK、模块注册表、代码生成器 OpenForge，以及 AI Native 能力预留。

## 当前阶段

当前已经完成：

| 阶段  | 状态     | 说明                                                                                            |
| ----- | -------- | ----------------------------------------------------------------------------------------------- |
| S0/S1 | complete | 品牌、monorepo 骨架、pnpm workspace、Nx、占位目录和基础文档                                     |
| D1-D6 | complete | 平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge 与 AI Native 边界                   |
| S2    | complete | `apps/api` NestJS 主干、health、OpenAPI skeleton；`apps/admin` Umi Max + Ant Design Pro V6 主干 |
| S3    | complete | `@opencore/shared`、`@opencore/contracts`、`@opencore/module-registry` 基线                     |
| S4    | complete | API config/env validation、request id、统一错误、结构化日志、安全基线、OpenAPI export           |
| S5    | complete | Admin Dashboard shell、异常页、request/access 规范、registry 菜单消费、OpenAPI 状态入口         |
| S6    | complete | Prisma/PostgreSQL schema、auth/RBAC、`Role.code`、`Permission.code`、RBAC API/SDK/Admin 页面    |
| S7    | complete | 字典、系统参数、文件资产、操作日志、登录日志、系统管理 API/SDK/Admin 页面                       |
| S8    | complete | status/version/queue 只读诊断、OpenAPI drift check、当前页导出协议、Monitor/Tool 页面           |

S3-S8 handoff 目标已经完成。下一步不是继续偷跑 P4/P5，而是先做最终 audit；如果继续推进，应另起 S9 handoff/goal，进入 OpenForge MVP。

## 当前明确不做

- 不实现 P4/P5 模块：CRM、ERP、MES、WMS、商城、支付、会员、多租户、知识库、RAG、Agent。
- 不复制 RuoYi/Yudao 的 Java/Vue 代码，只学习模块地图、权限粒度、菜单组织、代码生成器和精简版/完整版思路。
- 不直接迁移 NestWeb / Antdpro6 业务代码，只复用设计经验、工程纪律和测试习惯。
- 不在 S8 中实现完整任务调度平台、大数据异步导出、敏感配置暴露或 OpenForge 写文件生成器。

## 技术栈主线

- Monorepo：pnpm workspace + Nx。
- 后端：NestJS + Prisma + PostgreSQL + OpenAPI；Redis、BullMQ、MinIO/S3 作为后续运行依赖边界继续接入。
- 官方后台：Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- 契约与 SDK：`@opencore/contracts`、`@opencore/sdk`、OpenAPI export/check。
- 模块注册表：`@opencore/module-registry`，统一模块、权限码、菜单、OpenAPI tag 和阶段边界。
- 官网：Next.js，后续阶段初始化。
- 移动端：Expo React Native，后续阶段初始化。
- 小程序：Taro + React，后续阶段初始化，不直接使用 React Native。
- 桌面端：Tauri，后续阶段初始化。
- AI Native：第一阶段只做架构预留，不实现 AI 业务。

## 工作区结构

- `apps/api`：NestJS API，已具备 health/readiness、OpenAPI export/check、API foundation、RBAC、系统管理、监控/工具基础模块。
- `apps/admin`：Umi Max + Ant Design Pro V6 官方后台，已具备 Dashboard shell、RBAC 页面、系统管理页面、Monitor/Tool 页面和 smoke test。
- `apps/web`：官网占位，后续使用 Next.js。
- `apps/mobile`：移动端占位，后续使用 Expo React Native。
- `apps/miniapp`：小程序占位，后续使用 Taro + React。
- `apps/desktop`：桌面端占位，后续使用 Tauri。
- `packages/shared`：共享 validation、type guard、duplicate detection 等基础工具。
- `packages/contracts`：权限码、模块/menu/permission schema、OpenAPI snapshot、table export contract。
- `packages/module-registry`：S5-S8 模块、权限、菜单、OpenAPI tag、P4/P5 泄漏检查。
- `packages/sdk`：RBAC、系统管理、监控、工具协议 typed client 和 registry fixtures。
- `tools/generator`：OpenForge 代码生成器预留，S9 才进入 MVP。
- `infra/*`：Docker、Nginx、监控和 Kubernetes 预留。
- `docs/*`：架构、模块、开发、策略、handoff 和 AI 路线文档。

## 本地命令

```bash
pnpm install
pnpm dev:api
pnpm dev:admin
pnpm build
pnpm build:api
pnpm build:admin
pnpm test
pnpm test:api
pnpm test:admin
pnpm lint
pnpm typecheck
pnpm format:check
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
```

API 默认端口为 `3000`，健康检查为 `/health/live` 和 `/health/ready`，OpenAPI 文档为 `/api/docs`。

Admin 默认使用 Umi Max dev server，通常为 `http://localhost:8000`；当前正式入口包括 `/dashboard`、`/system/*`、`/security/*`、`/monitor/*`、`/tools/openapi`、`/tools/export`。

## 文档入口

- [文档入口](docs/README.md)
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
- [Strategy Blueprint](docs/strategy/README.md)
- [S3-S8 实现进度](docs/strategy/progress.md)
