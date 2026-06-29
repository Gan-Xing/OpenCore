# Handoff 索引

本目录保存 OpenCore（开元）阶段性交接文档。OpenCore 的品牌语是“开放之源，万物之始”，定位是 **AI Native 企业级全栈 Monorepo**。

## 当前阶段

已完成：

- S0/S1：品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档。
- D1-D6：平台边界、模块分类、契约与权限规范、API 启动计划、Admin 启动计划、OpenForge 路线图。
- S2-S9：API/Admin 双主干、contracts/shared/module-registry、API foundation、Admin shell、auth/RBAC、system management、monitor/tool baseline、OpenForge MVP。
- Runtime integration R-1-R7：legacy app freeze、runtime audit、env mapping、PostgreSQL migration/seed、Prisma persistence、Redis/BullMQ/MinIO diagnostics、integration smoke、final docs。
- OpenForge V1 A-L：safe generator pipeline、schema/config DSL、template/VFS、apply/manifest/rollback、API/Admin/SDK/Test/Docs pack、doctor/gate/e2e、final docs。
- Quality Cycle 001：平台内核加固、契约 gate、OpenForge V1 验证、轻量协同、operations/report 设计位、integration provider/design 边界、全仓 gate。
- 2026-06-11 Admin Pro V6 migration：官方 Ant Design Pro V6 架构、正式 OpenCore 页面、request/access/OpenAPI/SDK 对齐。
- 2026-06-12 Backend Self-Loop BE20：按依赖顺序完成 common/core/database/redis/file/system/security/audit/online-user/scheduler/monitor/generator-core/tools/api aggregation 后端闭环。
- Cycle-021 System Admin fallback closure：七个固定 System Admin 页面已完成 live-only、no fixture fallback、public API/Admin smoke 和 deploy guard 验收。
- Cycle-022 SaaS tenant foundation V1：租户身份、认证、RBAC/菜单裁剪、数据隔离、运行时隔离、Admin 租户控制面和 business-domain admission guard 已完成。

旧 handoff 是历史交接记录，不是当前执行 goal。新的实现工作必须另起明确的有限验收清单；不得从旧 handoff 自动推导下一轮工作。

## 当前事实来源

- [Strategy progress](../strategy/progress.md)
- [Cycle-021 handoff](../quality-cycle/cycle-021/handoff.md)
- [Cycle-021 acceptance matrix](../quality-cycle/cycle-021/acceptance-matrix.md)
- [Cycle-021 productization waterline](../quality-cycle/cycle-021/productization-waterline-audit.md)
- [OpenCore local deploy](../deployment/opencore-local-deploy.md)
- [OpenCore release readiness](../deployment/opencore-release-readiness.md)

## 交接文档归档

- [OpenCore monorepo 启动 handoff](opencore-monorepo-start-handoff.md)
- [2026-06-09 启动设计 handoff](2026-06-09-start-design-handoff.md)
- [2026-06-09 S2 API + Admin 初始化 handoff](2026-06-09-s2-api-admin-bootstrap-handoff.md)
- [2026-06-10 Strategy Blueprint /goal handoff](2026-06-10-strategy-blueprint-goal-handoff.md)
- [2026-06-10 S3-S8 Implementation Handoff](2026-06-10-s3-s8-implementation-handoff.md)
- [2026-06-10 Runtime Integration Handoff](2026-06-10-runtime-integration-handoff.md)
- [2026-06-10 S9 OpenForge MVP Handoff](2026-06-10-s9-openforge-mvp-handoff.md)
- [2026-06-10 OpenForge V1 Full Implementation Handoff](2026-06-10-openforge-v1-full-implementation-handoff.md)
- [2026-06-10 OpenCore Quality Recursion Handoff](2026-06-10-opencore-1-6-quality-recursion-handoff.md)
- [2026-06-11 Admin Ant Design Pro V6 Migration Handoff](2026-06-11-admin-ant-design-pro-v6-migration-handoff.md)
- [2026-06-11 Admin Ant Design Pro V6 Migration Notes](admin-ant-design-pro-v6-migration-notes.md)

## 验收入口

历史全仓/后端门禁：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
pnpm openapi:export
pnpm openapi:check
pnpm test:api
pnpm test:admin
NX_DAEMON=false pnpm nx test sdk
NX_DAEMON=false pnpm nx test contracts
pnpm openforge:gate
```

代码改动还必须执行固定部署脚本和公网验证：

```bash
pnpm deploy:opencore
```

- API: `http://144.217.243.161:39172`
- Admin: `http://144.217.243.161:39174`
- Local smoke: `39173`

Docs-only cleanup 不需要部署，但仍需要格式/文档检查、commit 和 push。

## 下一份 handoff 规则

下一份 handoff 只能描述明确范围、有限队列、验收矩阵、测试/smoke/deploy guard 和回滚边界。不得复用 OpenForge V1、BE20、Cycle-021 closure 或 Cycle-022 tenant foundation 继续扩大为业务逻辑生成、migration 创建、行业业务包、真实支付、生产 SaaS 商业运营扩展、完整 BPMN/report 或 AI/RAG/Agent 实现。
