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

- `apps/api`：NestJS API composition root，保留 bootstrap、HTTP entry
  aggregation、模块聚合、runtime config 和 OpenAPI export/check。
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
- `core`：NestJS foundation、异常、响应、OpenAPI helper、请求上下文、安全基线和结构化日志。
- `database`：Prisma service/module、事务和 seed helper。
- `redis`：Redis client、key/TTL/cache helper。
- `file`：文件存储抽象和安全 key/input helper。
- `system`：字典、参数、公告、部门、岗位、菜单、角色、用户 runtime。
- `security`：auth、password/token、permission/role/data-scope guards。
- `audit`：登录日志、操作日志、audit decorator/interceptor。
- `online-user`：在线用户/session runtime。
- `scheduler`：任务定义、run log、BullMQ adapter metadata 和 registry whitelist。
- `monitor`：health、runtime diagnostics、status/version/queue monitor。
- `generator-core`：OpenForge metadata parsing、template rendering 和 code generation core。
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
