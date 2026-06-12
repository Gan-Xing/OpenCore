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
| BE20   | complete | Backend Self-Loop：按依赖顺序完成 common/core/database/redis/file/system/security/audit/online-user/scheduler/monitor/generator-core/tools/api 聚合     |

S3-S9 handoff、runtime integration R-1-R7、OpenForge V1 A-L、Quality Cycle 001 和 Backend Self-Loop BE20-P01 至 BE20-P24 已完成。OpenForge 默认仍是 dry-run；真实写入必须显式 `--yes`，且只能创建或更新带合法 OpenForge marker 的 generated-owned files。

## 后端当前状态

Backend Self-Loop 已在 2026-06-12 完成收尾记录。OpenCore 后端不再是只读 skeleton 或若依/芋道能力规划，而是已经形成 NestJS/Prisma/Redis/BullMQ/MinIO/OpenAPI 的 runtime 闭环：

- 基础包：`@opencore/common`、`@opencore/core`、`@opencore/database`、`@opencore/redis`、`@opencore/file`。
- 系统管理：字典、参数、通知公告、部门、岗位、菜单、角色、用户已下沉到 `@opencore/system`。
- 安全与审计：认证、JWT、密码、验证码、RBAC、数据权限、登录日志、操作日志已下沉到 `@opencore/security` 和 `@opencore/audit`。
- 监控与运维：在线用户、调度任务、运行时诊断、健康检查、队列状态、缓存/Redis/S3 探测已下沉到 `@opencore/online-user`、`@opencore/scheduler`、`@opencore/monitor`。
- 代码生成：OpenForge core 已下沉到 `@opencore/generator-core`，`tools/generator` 只保留 CLI wrapper、status、doctor、gate、plan/diff/check/apply/rollback。
- API 聚合：`apps/api` 只保留 bootstrap、HTTP entry aggregation、模块聚合、runtime config 和 OpenAPI export/check。

BE20 最终验证已通过：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build:api`、`pnpm prisma:validate`、`pnpm openapi:check`、`pnpm format:check`，并额外通过 OpenForge doctor/check/diff/test。

## 当前明确不做

- 不实现行业业务包或高风险闭环：CRM、ERP、MES、WMS、商城、真实支付、会员、多租户、知识库、RAG、Agent。
- Quality Cycle 001 只实现平台型轻量协同、operations/report 设计位和 integration provider/design 边界；不做 BPMN、完整报表设计器、大数据异步导出、真实支付回调/退款/对账或行业业务。
- 不复制 RuoYi/Yudao 的 Java/Vue 代码，只学习模块地图、权限粒度、菜单组织、代码生成器和精简版/完整版思路。
- 不直接迁移 NestWeb / Antdpro6 业务代码，只复用设计经验、工程纪律和测试习惯。
- 不实现无白名单动态反射调度、复杂任务编排平台、大数据异步导出、敏感配置暴露或无保护的 OpenForge 写文件生成器。

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

- `apps/api`：NestJS API composition root，保留 bootstrap、HTTP entry aggregation、模块聚合、runtime config 和 OpenAPI export/check；可复用 runtime 已下沉到 `packages/*` 或 `tools/*`。
- `apps/admin`：Umi Max + Ant Design Pro V6 官方后台，已具备 Dashboard shell、RBAC 页面、系统管理页面、Monitor/Tool/Collaboration/Optional/Integrations 页面和 smoke test。
- `apps/web`：官网占位，后续使用 Next.js。
- `apps/mobile`：移动端占位，后续使用 Expo React Native。
- `apps/miniapp`：小程序占位，后续使用 Taro + React。
- `apps/desktop`：桌面端占位，后续使用 Tauri。
- `packages/shared`：共享 validation、type guard、duplicate detection 等基础工具。
- `packages/common`：后端通用常量、错误码、响应契约、分页/排序/filter helper。
- `packages/contracts`：权限码、模块/menu/permission schema、OpenAPI snapshot、table export/query/upload/error/OpenForge contract。
- `packages/module-registry`：S5-S12 模块、权限、菜单、OpenAPI tag 和高风险业务泄漏检查。
- `packages/sdk`：RBAC、系统管理、监控、工具、协同、operations、integration typed clients 和 registry fixtures。
- `packages/core`：NestJS foundation、异常过滤、响应拦截、请求上下文、OpenAPI helper、安全 header 和结构化日志。
- `packages/database`：Prisma service/module、事务 helper 和 seed helper。
- `packages/redis`：Redis client、key/TTL/cache helper 和 BullMQ connection options。
- `packages/file`：本地/MinIO/S3 文件存储抽象、安全 key 和输入校验。
- `packages/system`：字典、参数、通知公告、部门、岗位、菜单、角色、用户 runtime。
- `packages/security`：auth、JWT/password/captcha、permission/role/data-scope guards。
- `packages/audit`：登录日志、操作日志、audit decorator/interceptor。
- `packages/online-user`：在线用户/session runtime。
- `packages/scheduler`：调度任务、run log、BullMQ adapter metadata 和 registry whitelist。
- `packages/monitor`：health、runtime diagnostics、status/version/queue/cache monitor。
- `packages/generator-core`：OpenForge generator core，提供 schema/config DSL、template/VFS、safe apply、manifest、rollback、doctor 和 API/Admin/SDK/Test/Docs skeleton pack。
- `tools/generator`：OpenForge CLI wrapper，提供 plan/diff/check/apply/manifest/rollback/doctor/status/gate root commands。
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
pnpm openforge:status
pnpm openforge:gate
```

API 默认端口为 `3000`，健康检查为 `/health/live` 和 `/health/ready`，OpenAPI 文档为 `/api/docs`。
本地 runtime 值只放在 ignored `.env.opencore.local`；提交文件只允许使用 `.env.example` 占位符。

Admin 默认使用 Umi Max dev server，通常为 `http://localhost:8000`；当前正式入口包括 `/dashboard`、`/system/*`、`/security/*`、`/monitor/*`、`/tools/*`、`/collaboration/*`、`/optional/*`、`/integrations/*`。

## Admin Pro V6 迁移状态

2026-06-11，`apps/admin` 已完成官方 Ant Design Pro V6 架构纠偏：保留 `config/config.ts`、`config/routes.ts`、`defaultSettings`、ProLayout runtime、requestErrorConfig、locales、OpenAPI plugin、request-record、React Query 和 Vitest；业务页面来自 `origin/main` 的 Dashboard/System/Security/Monitor/Tools/Collaboration/Optional/Integrations 与 403/404/500。

正式路由只保留 `/dashboard`、`/system/*`、`/security/*`、`/monitor/*`、`/tools/*`、`/collaboration/*`、`/optional/*`、`/integrations/*`、`/user/login`、`/403`、`/404`、`/500`，根路径重定向到 `/dashboard`。已删除 Ant Design Pro demo routes/pages/services/mocks，包括 `/welcome`、`/admin`、`/form`、`/list`、`/profile`、`/result`、`/account`、`/chatbot`、demo `oneapi.json` 和 `pro-api.ant-design-demo` 配置。

Admin 登录/current user 通过 `@opencore/sdk` 调用 `POST /api/auth/login` 与 `GET /api/auth/me`，token 存储键为 `opencore.admin.token`，请求统一追加 `Authorization: Bearer`、`x-request-id`、`x-trace-id`，401 跳转 `/user/login?redirect=...`，403 跳转 `/403`。权限继续由 `Permission.code` 驱动，并由 `pnpm registry:admin-routes:check` 校验 `config/routes.ts` 与 module-registry。

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
- [Backend Self-Loop prompt](docs/quality-cycle/opencore-backend-self-loop.md)
- [Backend Self-Loop backlog](docs/quality-cycle/cycle-020/backlog.md)
- [Backend Self-Loop completion report](docs/quality-cycle/cycle-020/completion-report.md)
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
- [当前进度与 BE20 证据](docs/strategy/progress.md)
