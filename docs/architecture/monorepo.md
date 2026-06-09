# Monorepo 规划

OpenCore 使用 pnpm workspace + Nx 管理 monorepo。

## 顶层结构

- `apps/*`：可运行应用。
- `packages/*`：共享库、契约、SDK、配置、模块注册表和工具性包。
- `tools/*`：工程工具和 OpenForge 代码生成器。
- `infra/*`：基础设施配置预留。
- `docs/*`：架构、模块、开发、部署、运行手册和 AI 文档。

## apps

- `apps/api`：后续初始化 NestJS API。
- `apps/admin`：后续初始化 Umi Max + Ant Design Pro V6 官方后台。
- `apps/web`：官网占位，后续初始化 Next.js。
- `apps/mobile`：移动端占位，后续初始化 Expo React Native。
- `apps/miniapp`：小程序占位，后续初始化 Taro + React。
- `apps/desktop`：桌面端占位，后续初始化 Tauri。

第一阶段只做 api/admin 规划和基础包，不开发 mobile、miniapp、desktop。

## packages

- `shared`：通用类型、常量和工具预留。
- `contracts`：OpenAPI、DTO 和跨端契约预留。
- `sdk`：面向应用端的 SDK 预留。
- `auth`：认证与权限边界预留，S0/S1 不实现登录或 RBAC。
- `config`：共享配置预留。
- `module-registry`：模块注册表预留。
- `ui-web`：Web UI 共享能力预留，官方 admin 仍以 Ant Design Pro 体系为主线。
- `design-tokens`：设计令牌预留。
- `i18n`：国际化预留。
- `testing`：测试工具预留。
- `ai-core`：AI Native 架构预留。

## 工程原则

- 从契约和模块边界开始，而不是从业务页面开始。
- 通过 Nx target 管理构建、检查和测试。
- 通过 OpenAPI 驱动 API 契约和 SDK 生成。
- 通过模块注册表管理模块元信息、依赖关系、端能力和发布状态。
- 保持 S0/S1 无业务实现，避免过早冻结错误抽象。
