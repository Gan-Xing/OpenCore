# Monorepo 规划

OpenCore 使用 pnpm workspace + Nx 管理 monorepo。

## 当前顶层结构

- `apps/*`：可运行应用。
- `packages/*`：共享库、契约、SDK、模块注册表和工具性包。
- `tools/*`：工程工具和 OpenForge 代码生成器。
- `infra/*`：基础设施配置预留。
- `docs/*`：架构、模块、开发、部署、运行手册、策略、handoff 和 AI 文档。
- `prisma/*`：S6/S7 已建立的 PostgreSQL schema。

## apps

- `apps/api`：NestJS API，已完成 S2-S8 主线。
- `apps/admin`：Umi Max + Ant Design Pro V6 官方后台，已完成 S2-S8 主线。
- `apps/web`：官网占位，后续初始化 Next.js。
- `apps/mobile`：移动端占位，后续初始化 Expo React Native。
- `apps/miniapp`：小程序占位，后续初始化 Taro + React。
- `apps/desktop`：桌面端占位，后续初始化 Tauri。

第一阶段仍只开发 api/admin 主线，不开发 mobile、miniapp、desktop。

## packages

- `shared`：通用 validation result、runtime type guard、duplicate detection 等工具。
- `contracts`：权限码、模块/menu/permission schema、OpenAPI snapshot、table export contract。
- `sdk`：RBAC、系统管理、monitor/tool typed client 和 registry fixtures。
- `module-registry`：S5-S8 模块、权限、菜单、OpenAPI tag 和 P4/P5 泄漏检查。
- `auth`：认证与权限抽象的未来边界；当前 auth/RBAC runtime 在 `apps/api` 中实现，后续可抽取。
- `config`：共享配置未来边界；当前 API runtime config 在 `apps/api/src/platform/config` 中实现。
- `testing`：测试工具预留。
- `ai-core`：AI Native 架构预留。

## 工程原则

- 从契约和模块边界开始，而不是从业务页面开始。
- 通过 Nx target 管理构建、检查和测试。
- 通过 OpenAPI 驱动 API 契约和 SDK 生成。
- 通过模块注册表管理模块元信息、权限码、菜单、OpenAPI tag、端能力和发布状态。
- S3-S8 只完成 P0-P3 主线；P4/P5 保留长期 backlog。

## 当前检查入口

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
```
