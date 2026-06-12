# 平台边界

本文档锁定 OpenCore（开元）的 app/package 职责边界。OpenCore 的定位是 **AI Native 企业级全栈 Monorepo**，品牌语是“开放之源，万物之始”。

当前 S3-S9、runtime integration、OpenForge V1、Q001 和 Backend Self-Loop BE20 已完成，但边界仍然重要：OpenCore 只把企业后台基础架构主线放进 core/runtime packages，不把 P4/P5 行业深水区提前塞入 core。

## 边界原则

- `apps/api` 是唯一业务后端入口。
- `apps/admin` 是官方后台主线，固定使用 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- OpenAPI 是 API 与前端、多端、SDK 的契约边界。
- 权限码、菜单元数据和模块元数据必须跨端共享。
- 共享契约和设计令牌，不强行共享所有 UI。
- 不迁移到 Refine，不使用 Vue，不使用 Java，官方 admin 不使用 MUI。
- 其他 UI 方案未来可以作为额外 app，例如 `apps/admin-mui`，但不影响官方主线。

## apps 职责

| 路径           | 职责                                                                                                 | 当前状态            |
| -------------- | ---------------------------------------------------------------------------------------------------- | ------------------- |
| `apps/api`     | NestJS API composition root、bootstrap、HTTP entry aggregation、runtime config、OpenAPI export/check | BE20 complete       |
| `apps/admin`   | 官方后台中台，使用 Umi Max + Ant Design Pro V6                                                       | S2-S8/Q001 complete |
| `apps/web`     | 官网，后续使用 Next.js                                                                               | 仅占位              |
| `apps/mobile`  | 移动端，后续使用 Expo React Native                                                                   | 仅占位              |
| `apps/miniapp` | 小程序，后续使用 Taro + React，不直接使用 React Native                                               | 仅占位              |
| `apps/desktop` | 桌面端，后续使用 Tauri                                                                               | 仅占位              |

## packages 职责

| 路径                       | 职责                                                                            | 不放什么                            |
| -------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| `packages/shared`          | 跨包通用类型、常量、无副作用工具                                                | 不放业务流程，不放运行时框架绑定    |
| `packages/common`          | 后端通用常量、错误码、响应契约、分页/排序/filter helper                         | 不依赖 NestJS、Prisma 或运行时连接  |
| `packages/contracts`       | 权限码、模块 schema、OpenAPI 产物、table export/query/upload/OpenForge contract | 不直接访问数据库，不承载 UI         |
| `packages/sdk`             | Admin 和未来多端消费的 typed SDK                                                | 不手写与契约漂移的接口              |
| `packages/module-registry` | 模块分层、权限码、菜单、OpenAPI tag、阶段和高风险模块 guard                     | 不实现业务运行时                    |
| `packages/core`            | NestJS foundation、异常、响应、请求上下文、OpenAPI、安全 header、结构化日志     | 不放具体 system/security/audit 业务 |
| `packages/database`        | Prisma service/module、事务和 seed helper                                       | 不承载业务 repository 规则          |
| `packages/redis`           | Redis client、key/TTL/cache helper、BullMQ connection options                   | 不直接实现业务缓存策略              |
| `packages/file`            | 本地/MinIO/S3 文件存储抽象、安全 key 和输入校验                                 | 不放图库、素材库或业务文件流程      |
| `packages/system`          | 字典、参数、通知公告、部门、岗位、菜单、角色、用户 runtime                      | 不放认证 token 或审计拦截器         |
| `packages/security`        | auth、JWT/password/captcha、permission/role/data-scope guards                   | 不放用户 CRUD 或菜单 CRUD           |
| `packages/audit`           | 登录日志、操作日志、audit decorator/interceptor                                 | 不放业务模块内部状态机              |
| `packages/online-user`     | 在线用户/session runtime                                                        | 不放完整 IM 或实时聊天              |
| `packages/scheduler`       | 调度任务、run log、BullMQ adapter metadata、registry whitelist                  | 不允许反射调用任意方法              |
| `packages/monitor`         | health、status、version、queue/cache/runtime diagnostics                        | 不暴露敏感配置明文                  |
| `packages/generator-core`  | OpenForge schema/config、planner、renderer、VFS、safe apply、rollback、doctor   | 不写 Prisma schema/migration        |
| `packages/ui-web`          | Web 共享 UI 能力                                                                | 不替代 Ant Design Pro 官方主线      |
| `packages/design-tokens`   | 颜色、间距、字号、动效和主题 token                                              | 不放页面组件                        |
| `packages/i18n`            | 文案 key、语言包结构和翻译工具边界                                              | 不放业务逻辑                        |
| `packages/testing`         | 测试工具、fixture、mock 和 E2E 辅助能力                                         | 不放生产代码                        |
| `packages/ai-core`         | AI Native 能力预留边界                                                          | 不实现模型调用、RAG、Agent 或知识库 |

## 当前禁止项

- 不实现 CRM、ERP、MES、WMS、商城、真实支付、会员、多租户。
- 不实现知识库、RAG、Agent。
- 不复制 RuoYi/Yudao Java/Vue 代码。
- 不把微信、短信、邮件、支付 provider 放进 core。
- 不实现无白名单动态反射调度、复杂任务编排平台、大数据异步导出或无保护的 OpenForge 写文件生成器。

## 相关文档

- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)
- [当前实现进度](../strategy/progress.md)
- [Backend Self-Loop completion report](../quality-cycle/cycle-020/completion-report.md)
