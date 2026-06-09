# Handoff 索引

本目录保存 OpenCore（开元）阶段性交接文档。OpenCore 的品牌语是“开放之源，万物之始”，定位是 **AI Native 企业级全栈 Monorepo**。

## 当前阶段

已完成：

- S0/S1：品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档。
- D1-D6：平台边界、模块分类、契约与权限规范、API 启动计划、Admin 启动计划、OpenForge 路线图。

## 交接文档

- [OpenCore monorepo 启动 handoff](opencore-monorepo-start-handoff.md)
- [2026-06-09 启动设计 handoff](2026-06-09-start-design-handoff.md)

## D1-D6 设计文档

- [平台边界](../architecture/platform-boundaries.md)
- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)

## 下一阶段入口

下一阶段建议进入 S2：初始化 `apps/api` 和 `apps/admin` 空项目。

S2 仍应保持克制：

- `apps/api` 只做 NestJS 空应用、配置、健康检查、OpenAPI 基线。
- `apps/admin` 只做 Umi Max + Ant Design Pro V6 空后台、request/access/OpenAPI client 规范和测试基线。
- 不实现登录、RBAC、多租户、数据库 schema、RAG、Agent、知识库或业务模块。
