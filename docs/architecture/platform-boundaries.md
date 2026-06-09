# 平台边界

本文档锁定 OpenCore（开元）在 D1-D6 启动设计阶段的 app/package 职责边界。OpenCore 的定位是 **AI Native 企业级全栈 Monorepo**，品牌语是“开放之源，万物之始”。

当前阶段只做平台设计，不写业务代码，不实现登录、RBAC、多租户、数据库连接、Prisma schema、RAG、Agent、知识库或业务模块。

## 边界原则

- `apps/api` 是唯一业务后端入口。
- `apps/admin` 是官方后台主线，固定使用 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- OpenAPI 是 API 与前端、多端、SDK 的契约边界。
- 权限码、菜单元数据和模块元数据必须跨端共享。
- 共享契约和设计令牌，不强行共享所有 UI。
- 不迁移到 Refine，不使用 Vue，不使用 Java，官方 admin 不使用 MUI。
- 其他 UI 方案未来可以作为额外 app，例如 `apps/admin-mui`，但不影响官方主线。

## apps 职责

| 路径 | 职责 | D1-D6 状态 |
| --- | --- | --- |
| `apps/api` | 后续承载 NestJS API、OpenAPI 导出、健康检查、配置、任务、文件和数据访问边界 | 只设计启动顺序 |
| `apps/admin` | 后续承载官方后台中台，使用 Umi Max + Ant Design Pro V6 | 只设计启动顺序 |
| `apps/web` | 官网，后续使用 Next.js | 仅占位 |
| `apps/mobile` | 移动端，后续使用 Expo React Native | 仅占位 |
| `apps/miniapp` | 小程序，后续使用 Taro + React，不直接使用 React Native | 仅占位 |
| `apps/desktop` | 桌面端，后续使用 Tauri | 仅占位 |

## packages 职责

| 路径 | 职责 | 不放什么 |
| --- | --- | --- |
| `packages/shared` | 跨包通用类型、常量、无副作用工具 | 不放业务流程，不放运行时框架绑定 |
| `packages/contracts` | OpenAPI 产物、DTO 类型、错误码、分页和过滤契约 | 不直接访问数据库，不承载 UI |
| `packages/sdk` | 由 OpenAPI 生成或包装的客户端 SDK | 不手写与契约漂移的接口 |
| `packages/auth` | 认证、会话、权限码和访问控制抽象的未来边界 | D1-D6 不实现登录或 RBAC |
| `packages/config` | 环境变量、配置 schema、默认值和配置读取规范 | 不放密钥，不放业务模块配置 |
| `packages/module-registry` | 模块分层、启用策略、菜单、权限码和端能力元数据 | D1-D6 不实现注册表运行时 |
| `packages/ui-web` | Web 共享 UI 能力，服务官方 admin 和未来 Web app | 不替代 Ant Design Pro 官方主线 |
| `packages/design-tokens` | 颜色、间距、字号、动效和主题 token | 不放页面组件 |
| `packages/i18n` | 文案 key、语言包结构和翻译工具边界 | 不放业务逻辑 |
| `packages/testing` | 测试工具、fixture、mock 和 E2E 辅助能力 | 不放生产代码 |
| `packages/ai-core` | AI Native 能力预留边界 | D1-D6 不实现模型调用、RAG、Agent 或知识库 |

## 工具和基础设施职责

| 路径 | 职责 |
| --- | --- |
| `tools/generator` | OpenForge 代码生成器预留位置 |
| `tools/scripts` | 仓库级脚本预留位置 |
| `infra/docker` | 本地和部署容器编排预留 |
| `infra/nginx` | 网关和静态资源代理预留 |
| `infra/monitoring` | 监控、日志、告警配置预留 |
| `infra/k8s` | Kubernetes 部署预留 |

## 依赖方向

```text
apps/admin ─┬─> packages/sdk ───────┐
            ├─> packages/ui-web     │
            ├─> packages/auth       │
            └─> packages/module-registry

apps/api ───┬─> packages/contracts
            ├─> packages/auth
            ├─> packages/config
            └─> packages/module-registry

packages/sdk ─────> packages/contracts
packages/ui-web ──> packages/design-tokens
packages/ai-core ─> packages/contracts
```

`apps/*` 可以依赖 `packages/*`。`packages/*` 不应反向依赖具体 app。

## 为什么暂时不启动 web/mobile/miniapp/desktop

- `apps/web` 依赖产品叙事和公开信息架构稳定，当前应先完成 API/Admin 主干。
- `apps/mobile` 依赖核心 API、认证、权限和离线策略稳定，当前启动会制造重复返工。
- `apps/miniapp` 依赖轻操作场景明确，且小程序使用 Taro + React，不直接使用 React Native。
- `apps/desktop` 依赖本地文件、系统能力和离线同步场景明确，当前还没有足够需求约束。

启动顺序锁定为：先 `apps/api` + `apps/admin`，再 `apps/web`，再 `apps/mobile`，再 `apps/miniapp`，最后 `apps/desktop`。

## 相关文档

- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)
