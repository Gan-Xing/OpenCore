# Handoff 索引

本目录保存 OpenCore（开元）阶段性交接文档。OpenCore 的品牌语是“开放之源，万物之始”，定位是 **AI Native 企业级全栈 Monorepo**。

## 当前阶段

已完成：

- S0/S1：品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档。
- D1-D6：平台边界、模块分类、契约与权限规范、API 启动计划、Admin 启动计划、OpenForge 路线图。

下一阶段：

- S2：初始化 `apps/api` 和 `apps/admin` 空项目。

## 交接文档

- [OpenCore monorepo 启动 handoff](opencore-monorepo-start-handoff.md)
- [2026-06-09 启动设计 handoff](2026-06-09-start-design-handoff.md)
- [2026-06-09 S2 API + Admin 初始化 handoff](2026-06-09-s2-api-admin-bootstrap-handoff.md)

## D1-D6 设计文档

- [平台边界](../architecture/platform-boundaries.md)
- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)

## S2 执行边界

S2 只初始化 `apps/api` 和 `apps/admin`：

- `apps/api` 只做 NestJS 空应用、健康检查、OpenAPI skeleton 和 Nx target。
- `apps/admin` 只做 Umi Max + Ant Design Pro V6 空后台、模板页隔离、Nx target 和测试基线。
- `apps/web`、`apps/mobile`、`apps/miniapp`、`apps/desktop` 继续只保留占位目录。
- 不实现登录、RBAC、多租户、数据库 schema、RAG、Agent、知识库或业务模块。

S2 必须优先使用官方脚手架或 Nx generator 生成，不要手写模拟模板文件。
