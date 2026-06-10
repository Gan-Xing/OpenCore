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

S3-S9 handoff 与 runtime integration handoff 范围均已完成。若继续推进，应另起 P1 OpenForge hardening 或 S10 collaboration handoff/goal。

## 交接文档

- [OpenCore monorepo 启动 handoff](opencore-monorepo-start-handoff.md)
- [2026-06-09 启动设计 handoff](2026-06-09-start-design-handoff.md)
- [2026-06-09 S2 API + Admin 初始化 handoff](2026-06-09-s2-api-admin-bootstrap-handoff.md)
- [2026-06-10 Strategy Blueprint /goal handoff](2026-06-10-strategy-blueprint-goal-handoff.md)
- [2026-06-10 S3-S8 Implementation Handoff](2026-06-10-s3-s8-implementation-handoff.md)
- [2026-06-10 Runtime Integration Handoff](2026-06-10-runtime-integration-handoff.md)
- [2026-06-10 S9 OpenForge MVP Handoff](2026-06-10-s9-openforge-mvp-handoff.md)

## D1-D6 设计文档

- [平台边界](../architecture/platform-boundaries.md)
- [模块分类](../modules/module-taxonomy.md)
- [契约与权限规范](../development/contract-and-permission-standard.md)
- [API 启动计划](../development/api-bootstrap-plan.md)
- [Admin 启动计划](../development/admin-bootstrap-plan.md)
- [OpenForge 路线图](../development/openforge-roadmap.md)

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
```

Runtime integration final evidence is tracked in [progress.md](../strategy/progress.md). It includes live API smoke for `/health/live`, `/health/ready`, `/api/docs`, `/api/auth/login`, and `/api/monitor/status`.

## 下一份 handoff 建议

S9 handoff 已完成。下一份 handoff 可选择 P1 OpenForge CI/gate hardening，或进入 S10 collaboration。不得复用 S9 继续偷偷扩大为写文件生成器、业务逻辑生成、Prisma schema 写入、migration 创建或 P4/P5 模块实现。
