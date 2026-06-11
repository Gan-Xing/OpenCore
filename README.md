# OpenCore（开元）

开放之源，万物之始。

OpenCore（中文名：开元）定位为 **AI Native 企业级全栈 Monorepo**。它面向一人公司、小团队和现代企业应用开发，用一套代码库统一管理 API、官方后台中台、官网、移动端、小程序、桌面端、共享契约、SDK、模块注册表、代码生成器 OpenForge，以及 AI Native 能力预留。

## 当前阶段

当前已经完成：

| 阶段   | 状态     | 说明                                                                                                                                                    |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0/S1  | complete | 品牌、monorepo 骨架、pnpm workspace、Nx、占位目录和基础文档                                                                                             |
| D1-D6  | complete | 平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge 与 AI Native 边界                                                                           |
| S2     | complete | `apps/api` NestJS 主干、health、OpenAPI skeleton；`apps/admin` Umi Max + Ant Design Pro V6 主干                                                         |
| S3     | complete | `@opencore/shared`、`@opencore/contracts`、`@opencore/module-registry` 基线                                                                             |
| S4     | complete | API config/env validation、request id、统一错误、结构化日志、安全基线、OpenAPI export                                                                   |
| S5     | complete | Admin Dashboard shell、异常页、request/access 规范、registry 菜单消费、OpenAPI 状态入口                                                                 |
| S6     | complete | Prisma/PostgreSQL schema、auth/RBAC、`Role.code`、`Permission.code`、RBAC API/SDK/Admin 页面                                                            |
| S7     | complete | 字典、系统参数、文件资产、操作日志、登录日志、系统管理 API/SDK/Admin 页面                                                                               |
| S8     | complete | status/version/queue 只读诊断、OpenAPI drift check、当前页导出协议、Monitor/Tool 页面                                                                   |
| S9     | complete | `tool.openforge`、OpenForge contracts、`tools/generator` Nx tool、只读 generate plan、diff plan、safety/preflight report                                |
| R-1-R7 | complete | 旧应用冻结、runtime audit、OpenCore env、PostgreSQL migration/seed、Prisma 持久化、Redis/BullMQ/MinIO/S3 诊断、集成 smoke 和最终文档审计                |
| V1     | complete | OpenForge safe generator：schema/config DSL、template/VFS、apply/manifest/rollback、API/Admin/SDK/Test/Docs pack、doctor/gate/e2e                       |
| Q001   | complete | Quality Cycle 001：RBAC/auth/audit/config/files/monitor/contracts/OpenForge 加固；新增轻量协同、operations/report 设计位、integration provider 设计边界 |

S3-S9 handoff、runtime integration R-1-R7、OpenForge V1 A-L 和 Quality Cycle 001 已完成。OpenForge 默认仍是 dry-run；真实写入必须显式 `--yes`，且只能创建或更新带合法 OpenForge marker 的 generated-owned files。

## 当前明确不做

- 不实现行业业务包或高风险闭环：CRM、ERP、MES、WMS、商城、真实支付、会员、多租户、知识库、RAG、Agent。
- Quality Cycle 001 只实现平台型轻量协同、operations/report 设计位和 integration provider/design 边界；不做 BPMN、完整报表设计器、大数据异步导出、真实支付回调/退款/对账或行业业务。
- 不复制 RuoYi/Yudao 的 Java/Vue 代码，只学习模块地图、权限粒度、菜单组织、代码生成器和精简版/完整版思路。
- 不直接迁移 NestWeb / Antdpro6 业务代码，只复用设计经验、工程纪律和测试习惯。
- 不实现完整任务调度平台、大数据异步导出、敏感配置暴露或无保护的 OpenForge 写文件生成器。

## 技术栈主线

- Monorepo：pnpm workspace + Nx。
- 后端：NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO/S3 + OpenAPI；当前已接入 OpenCore 独立 runtime boundary 和只读诊断。
- 官方后台：Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- 契约与 SDK：`@opencore/contracts`、`@opencore/sdk`、OpenAPI export/check。
- 模块注册表：`@opencore/module-registry`，统一模块、权限码、菜单、OpenAPI tag 和阶段边界。
- 官网：Next.js，后续阶段初始化。
- 移动端：Expo React Native，后续阶段初始化。
- 小程序：Taro + React，后续阶段初始化，不直接使用 React Native。
- 桌面端：Tauri，后续阶段初始化。
- AI Native：第一阶段只做架构预留，不实现 AI 业务。

## 工作区结构

- `apps/api`：NestJS API，已具备 health/readiness、OpenAPI export/check、API foundation、RBAC、系统管理、监控/工具、轻量协同、operations/report 设计位、integration provider/design 边界，以及 PostgreSQL/Redis/BullMQ/MinIO runtime diagnostics。
- `apps/admin`：Umi Max + Ant Design Pro V6 官方后台，已具备 Dashboard shell、RBAC 页面、系统管理页面、Monitor/Tool/Collaboration/Optional/Integrations 页面和 smoke test。
- `apps/web`：官网占位，后续使用 Next.js。
- `apps/mobile`：移动端占位，后续使用 Expo React Native。
- `apps/miniapp`：小程序占位，后续使用 Taro + React。
- `apps/desktop`：桌面端占位，后续使用 Tauri。
- `packages/shared`：共享 validation、type guard、duplicate detection 等基础工具。
- `packages/contracts`：权限码、模块/menu/permission schema、OpenAPI snapshot、table export/query/upload/error/OpenForge contract。
- `packages/module-registry`：S5-S12 模块、权限、菜单、OpenAPI tag 和高风险业务泄漏检查。
- `packages/sdk`：RBAC、系统管理、监控、工具、协同、operations、integration typed clients 和 registry fixtures。
- `tools/generator`：OpenForge V1 安全生成器，提供 plan/diff/check、schema/config DSL、template/VFS、safe apply、manifest、rollback、doctor、gate 和 API/Admin/SDK/Test/Docs skeleton pack。
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
pnpm prisma:migrate
pnpm prisma:seed
pnpm openapi:export
pnpm openapi:check
pnpm openapi:registry-tags:check
pnpm registry:admin-routes:check
pnpm openforge:plan -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:diff -- --schema tools/generator/examples/core.dict.schema.json --format json
pnpm openforge:check
pnpm openforge:apply -- --schema tools/generator/examples/core.dict.v1.schema.json --dry-run
pnpm openforge:rollback -- --manifest .openforge/manifests/<id>.json --dry-run
pnpm openforge:doctor
pnpm openforge:gate
```

API 默认端口为 `3000`，健康检查为 `/health/live` 和 `/health/ready`，OpenAPI 文档为 `/api/docs`。
本地 runtime 值只放在 ignored `.env.opencore.local`；提交文件只允许使用 `.env.example` 占位符。

Admin 默认使用 Umi Max dev server，通常为 `http://localhost:8000`；当前正式入口包括 `/dashboard`、`/system/*`、`/security/*`、`/monitor/*`、`/tools/*`、`/collaboration/*`、`/optional/*`、`/integrations/*`。

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
- [OpenForge V1 架构](docs/development/openforge-v1-architecture.md)
- [OpenForge schema authoring](docs/development/openforge-schema-authoring.md)
- [OpenForge template authoring](docs/development/openforge-template-authoring.md)
- [OpenForge apply/rollback runbook](docs/development/openforge-apply-rollback-runbook.md)
- [OpenForge CI Gate](docs/development/openforge-ci-gate.md)
- [Module admission checklist](docs/development/module-admission-checklist.md)
- [Permission deprecation policy](docs/development/permission-deprecation-policy.md)
- [Export/upload contract](docs/development/export-upload-contract.md)
- [Workflow admission](docs/development/workflow-admission.md)
- [Integration WeChat design](docs/development/integration-wechat-design.md)
- [Integration WebSocket design](docs/development/integration-websocket-design.md)
- [Payment provider design](docs/development/integration-payment-provider-design.md)
- [Runtime inventory](docs/runtime/runtime-inventory.md)
- [OpenCore env mapping](docs/runtime/opencore-env-mapping.md)
- [Local runtime env runbook](docs/runtime/local-env-runbook.md)
- [AI Native 路线图](docs/ai/ai-native-roadmap.md)
- [Handoff 索引](docs/handoff/README.md)
- [Strategy Blueprint](docs/strategy/README.md)
- [S3-S8 与 runtime integration 进度](docs/strategy/progress.md)
