# 编码规范

OpenCore（开元）定位为 AI Native 企业级全栈 Monorepo。编码规范优先服务长期可维护性、契约稳定性和多端一致性。

## 基本原则

- TypeScript 优先。
- 共享契约优先于重复定义。
- 模块边界优先于横向耦合。
- OpenAPI 优先于手写客户端协议。
- 生成器输出必须可读、可检查、可覆盖。

## 前端规范

- 官方后台使用 Umi Max + Ant Design Pro V6 + ProComponents v3 + antd 6 + React 19。
- 不迁移到 Refine。
- 不使用 Vue。
- 官方 admin 不使用 MUI。
- 其他 UI 方案未来可作为额外 app，例如 `apps/admin-mui`。

## 后端规范

- 后端主线是 NestJS + Prisma + PostgreSQL + Redis + BullMQ + MinIO/S3 + OpenAPI。
- S0/S1 不连接数据库，不生成 Prisma schema。
- 后续应先建立配置、日志、错误、OpenAPI 和健康检查基线，再进入业务模块。

## 多端规范

- 官网后续使用 Next.js。
- 移动端后续使用 Expo React Native。
- 小程序后续使用 Taro + React，不直接使用 React Native。
- 桌面端后续使用 Tauri。

## AI Native 规范

第一阶段只做架构预留，不实现 RAG、Agent、知识库、模型调用或 AI 业务。

AI 相关代码未来必须有清晰边界，不能直接散落在业务模块中。
