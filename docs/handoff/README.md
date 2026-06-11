# Handoff 索引

本目录保存 OpenCore（开元）阶段性交接文档。OpenCore 的品牌语是“开放之源，万物之始”，定位是 **AI Native 企业级全栈 Monorepo**。

## 当前阶段

已完成：

- S0/S1：品牌、monorepo 骨架、pnpm workspace、Nx 基础配置、占位应用目录和基础文档。
- D1-D6：平台边界、模块分类、契约与权限规范、API 启动计划、Admin 启动计划、OpenForge 路线图。
- S2：初始化 `apps/api` 和 `apps/admin` 空项目，接入 Nx targets、health/OpenAPI skeleton 和 Admin smoke/typecheck/build 基线。
- S3：contracts/shared/module-registry 基线。
- S4：API core foundation。
- S5：Admin core shell。
- S6：auth/RBAC system。
- S7：system management。
- S8：monitor/tool baseline。
- S9：OpenForge MVP，只读 generate plan、diff plan、safety/preflight report。
- Runtime integration R-1-R7：legacy app freeze、runtime audit、env mapping、PostgreSQL migration/seed、Prisma persistence、Redis/BullMQ/MinIO diagnostics、integration smoke、final docs。
- OpenForge V1 A-L：safe generator pipeline、schema/config DSL、template/VFS、apply/manifest/rollback、API/Admin/SDK/Test/Docs pack、doctor/gate/e2e、final docs。
- Quality Cycle 001：平台内核加固、契约 gate、OpenForge V1 验证、轻量协同、operations/report 设计位、integration provider/design 边界、全仓 gate。
- 2026-06-11 Admin Pro V6 migration：在 `fix/admin-ant-design-pro-v6` 上保留官方 Ant Design Pro V6 config/app/layout/request/i18n/openapi 底座，迁移 OpenCore Dashboard/System/Security/Monitor/Tools/Collaboration/Optional/Integrations 页面，删除 demo routes/pages/services/mocks，并将 auth/me 接到 OpenCore API。

S3-S9 handoff、runtime integration handoff、OpenForge V1 full implementation handoff 与 Quality Cycle 001 范围均已完成。若继续推进，应另起 cycle-002 或专项 handoff，并继续保留行业业务、真实支付、AI/RAG/Agent 的准入边界。

## 交接文档

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

## D1-D6 设计文档

- [平台边界](../architecture/platform-boundaries.md)
- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)
- [OpenForge V1 架构](../development/openforge-v1-architecture.md)
- [OpenForge Apply/Rollback Runbook](../development/openforge-apply-rollback-runbook.md)

## S3-S8 / Runtime 验收入口

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

Runtime integration, OpenForge V1, and Quality Cycle 001 final evidence is tracked in [progress.md](../strategy/progress.md) and [cycle-001 completion report](../quality-cycle/cycle-001/completion-report.md). Runtime evidence includes live API smoke for `/health/live`, `/health/ready`, `/api/docs`, `/api/auth/login`, and `/api/monitor/status`.

## 下一份 handoff 建议

Quality Cycle 001 已完成。下一份 handoff 可进入 cycle-002 recursion 或专项模块 hardening。不得复用 OpenForge V1 继续偷偷扩大为业务逻辑生成、migration 创建、行业业务包、真实支付或 AI/RAG/Agent 实现。
