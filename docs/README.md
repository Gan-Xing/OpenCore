# OpenCore 文档入口

更新时间：2026-06-29

本目录保存 OpenCore（开元）的架构、模块、开发、runtime、部署、handoff、quality cycle 和 AI Native 文档。当前事实不是停在 S3-S9/BE20：OpenCore 已完成 S3-S9、runtime integration、OpenForge V1、Quality Cycle 001、Backend Self-Loop BE20、Admin Pro V6 迁移、Cycle-021 的有限 System Admin fallback closure，以及 Cycle-022 的 SaaS tenant foundation V1。

## 当前事实

| 主题                | 当前状态                                                                                          | 主文档                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 项目进度索引        | Cycle-022 已完成 SaaS tenant foundation V1；当前无自动业务域队列                                  | [strategy/progress.md](strategy/progress.md)                                                                           |
| Tenant foundation   | 租户身份、认证、RBAC/菜单裁剪、数据隔离、运行时隔离、Admin 控制面、smoke/guard/OpenAPI/SDK 已闭环 | [quality-cycle/cycle-022/handoff.md](quality-cycle/cycle-022/handoff.md)                                               |
| Cycle-022 验收      | acceptance matrix、waterline、backlog、tenant architecture、threat model 均为当前多租户事实来源   | [quality-cycle/cycle-022/acceptance-matrix.md](quality-cycle/cycle-022/acceptance-matrix.md)                           |
| Cycle-021 验收      | acceptance matrix、waterline、backlog、handoff 均已闭环；不自动选择后续队列                       | [quality-cycle/cycle-021/handoff.md](quality-cycle/cycle-021/handoff.md)                                               |
| Admin 验收矩阵      | 七个固定 System Admin 页面均 API/SDK/Admin live-only、public smoke、deploy guard 通过             | [quality-cycle/cycle-021/acceptance-matrix.md](quality-cycle/cycle-021/acceptance-matrix.md)                           |
| 产品化水位          | 对若依/芋道能力按 OpenCore API/SDK/Admin/权限/种子/OpenAPI/smoke/deploy guard 重判                | [quality-cycle/cycle-021/productization-waterline-audit.md](quality-cycle/cycle-021/productization-waterline-audit.md) |
| 部署与 release gate | 固定端口 API `39172`、Admin `39174`、local smoke `39173`；代码改动走 `pnpm deploy:opencore`       | [deployment/opencore-release-readiness.md](deployment/opencore-release-readiness.md)                                   |
| Admin 路由          | 以 `apps/admin/config/routes.ts` 和 module registry 为事实来源                                    | [strategy/admin-page-map.md](strategy/admin-page-map.md)                                                               |
| 若依/芋道能力矩阵   | 只做能力归属、优先级和准入边界，不替代当前 Cycle-022 验收矩阵                                     | [strategy/ruoyi-yudao-capability-matrix.md](strategy/ruoyi-yudao-capability-matrix.md)                                 |

## 推荐阅读顺序

1. [架构总览](architecture/overview.md)
2. [平台边界](architecture/platform-boundaries.md)
3. [模块注册表](modules/module-registry.md)
4. [当前进度索引](strategy/progress.md)
5. [Cycle-022 handoff](quality-cycle/cycle-022/handoff.md)
6. [Cycle-022 acceptance matrix](quality-cycle/cycle-022/acceptance-matrix.md)
7. [Cycle-022 产品化水位审计](quality-cycle/cycle-022/productization-waterline-audit.md)
8. [Cycle-021 handoff](quality-cycle/cycle-021/handoff.md)
9. [Cycle-021 acceptance matrix](quality-cycle/cycle-021/acceptance-matrix.md)
10. [开发起步](development/getting-started.md)
11. [本地部署 runbook](deployment/opencore-local-deploy.md)
12. [Release readiness](deployment/opencore-release-readiness.md)
13. [Handoff 索引](handoff/README.md)

## 文档分组

| 分组     | 入口                                                                                                                                                                                                                                                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 架构     | [架构总览](architecture/overview.md)、[品牌与命名](architecture/brand.md)、[技术栈](architecture/tech-stack.md)、[Monorepo 规划](architecture/monorepo.md)、[平台边界](architecture/platform-boundaries.md)                                                                                                                                                                               |
| 模块     | [模块注册表](modules/module-registry.md)、[模块分类](modules/module-taxonomy.md)、[优先级路线图](modules/priority-roadmap.md)                                                                                                                                                                                                                                                             |
| 开发     | [开发起步](development/getting-started.md)、[契约与权限规范](development/contract-and-permission-standard.md)、[OpenForge V1 架构](development/openforge-v1-architecture.md)、[OpenForge Apply/Rollback Runbook](development/openforge-apply-rollback-runbook.md)、[Module Admission](development/module-admission-checklist.md)                                                          |
| 部署     | [本地部署 runbook](deployment/opencore-local-deploy.md)、[Release readiness](deployment/opencore-release-readiness.md)                                                                                                                                                                                                                                                                    |
| Runtime  | [Runtime inventory](runtime/runtime-inventory.md)、[OpenCore env mapping](runtime/opencore-env-mapping.md)、[Local env runbook](runtime/local-env-runbook.md)                                                                                                                                                                                                                             |
| Strategy | [Strategy Blueprint](strategy/README.md)、[当前进度](strategy/progress.md)、[能力矩阵](strategy/ruoyi-yudao-capability-matrix.md)、[Admin 页面地图](strategy/admin-page-map.md)、[阶段路线图](strategy/staged-roadmap.md)                                                                                                                                                                 |
| Handoff  | [Handoff 索引](handoff/README.md)；旧日期 handoff 是历史归档，不是新的执行 goal                                                                                                                                                                                                                                                                                                           |
| Quality  | [Cycle-022 Handoff](quality-cycle/cycle-022/handoff.md)、[Cycle-022 Acceptance Matrix](quality-cycle/cycle-022/acceptance-matrix.md)、[Cycle-022 Waterline Audit](quality-cycle/cycle-022/productization-waterline-audit.md)、[Cycle-022 Backlog](quality-cycle/cycle-022/backlog.md)、[Cycle-021 Handoff](quality-cycle/cycle-021/handoff.md)、[Quality Ledger](quality-cycle/ledger.md) |
| AI       | [AI Native 路线图](ai/ai-native-roadmap.md)                                                                                                                                                                                                                                                                                                                                               |

## 当前边界

已完成的基础平台能力包括 S3-S9、runtime integration R-1-R7、OpenForge V1 A-L、Quality Cycle 001、Backend Self-Loop BE20、Admin Pro V6 迁移、Cycle-021 System Admin fallback closure 和 Cycle-022 SaaS tenant foundation V1。基础后台能力和多租户基础设施已经按 OpenCore 的 package-owned runtime、typed SDK、Admin live-only、OpenAPI、smoke 和 guard/deploy 口径验收。

仍需显式准入的大域：CRM、ERP、MES、WMS、mall、member、真实支付/退款/对账、生产 SaaS 商业运营扩展、BPMN/full workflow、完整报表设计器、大数据异步导出、AI/RAG/Agent、OpenForge 直接写 Prisma schema/migration/business code。

Docs-only cleanup 不需要重新部署。任何代码改动都必须测试、commit、push，通过固定脚本部署，并用真实公网 API/Admin 请求验证；打印 Public URL 或只检查 bundle marker 不算 public smoke。

## Admin Pro V6 当前口径

`apps/admin` 使用官方 Ant Design Pro V6 架构：`apps/admin/config/config.ts`、`apps/admin/config/routes.ts`、`src/app.tsx`、request/access、OpenAPI plugin 和 typed SDK。正式页面包括 Dashboard、System、Security、Monitor、Tools、Collaboration、Optional、Integrations、Profile 和 403/404/500。登录/current user 使用 `POST /api/auth/login`、`GET /api/auth/me` 和 bearer token，权限使用 `Permission.code`，并由 module-registry route/access drift gate 校验。
