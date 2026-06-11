# 平台边界

本文档锁定 OpenCore（开元）的 app/package 职责边界。OpenCore 的定位是 **AI Native 企业级全栈 Monorepo**，品牌语是“开放之源，万物之始”。

当前 S3-S8 已完成，但边界仍然重要：OpenCore 只把企业后台基础架构主线放进 core，不把 P4/P5 行业深水区提前塞入 core。

## 边界原则

- `apps/api` 是唯一业务后端入口。
- `apps/admin` 是官方后台主线，固定使用 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- OpenAPI 是 API 与前端、多端、SDK 的契约边界。
- 权限码、菜单元数据和模块元数据必须跨端共享。
- 共享契约和设计令牌，不强行共享所有 UI。
- 不迁移到 Refine，不使用 Vue，不使用 Java，官方 admin 不使用 MUI。
- 其他 UI 方案未来可以作为额外 app，例如 `apps/admin-mui`，但不影响官方主线。

## apps 职责

| 路径           | 职责                                                                                                 | 当前状态       |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------- |
| `apps/api`     | NestJS API composition root、bootstrap、HTTP entry aggregation、runtime config、OpenAPI export/check | BE20 complete  |
| `apps/admin`   | 官方后台中台，使用 Umi Max + Ant Design Pro V6                                                       | S2-S8 complete |
| `apps/web`     | 官网，后续使用 Next.js                                                                               | 仅占位         |
| `apps/mobile`  | 移动端，后续使用 Expo React Native                                                                   | 仅占位         |
| `apps/miniapp` | 小程序，后续使用 Taro + React，不直接使用 React Native                                               | 仅占位         |
| `apps/desktop` | 桌面端，后续使用 Tauri                                                                               | 仅占位         |

## packages 职责

| 路径                       | 职责                                                     | 不放什么                            |
| -------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `packages/shared`          | 跨包通用类型、常量、无副作用工具                         | 不放业务流程，不放运行时框架绑定    |
| `packages/contracts`       | 权限码、模块 schema、OpenAPI 产物、table export contract | 不直接访问数据库，不承载 UI         |
| `packages/sdk`             | Admin 和未来多端消费的 typed SDK                         | 不手写与契约漂移的接口              |
| `packages/module-registry` | 模块分层、权限码、菜单、OpenAPI tag、阶段和 P4/P5 guard  | 不实现业务运行时                    |
| `packages/auth`            | 认证、会话、权限码和访问控制抽象的未来抽取边界           | 当前不重复实现 runtime              |
| `packages/config`          | 共享配置未来边界                                         | 不放密钥，不放业务模块配置          |
| `packages/ui-web`          | Web 共享 UI 能力                                         | 不替代 Ant Design Pro 官方主线      |
| `packages/design-tokens`   | 颜色、间距、字号、动效和主题 token                       | 不放页面组件                        |
| `packages/i18n`            | 文案 key、语言包结构和翻译工具边界                       | 不放业务逻辑                        |
| `packages/testing`         | 测试工具、fixture、mock 和 E2E 辅助能力                  | 不放生产代码                        |
| `packages/ai-core`         | AI Native 能力预留边界                                   | 不实现模型调用、RAG、Agent 或知识库 |

## 当前禁止项

- 不实现 CRM、ERP、MES、WMS、商城、支付、会员、多租户。
- 不实现知识库、RAG、Agent。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不把微信、短信、邮件、支付 provider 放进 core。
- 不在 S8 中实现完整任务调度平台、大数据异步导出或 OpenForge 写文件生成器。

## 相关文档

- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)
- [S3-S8 实现进度](../strategy/progress.md)
