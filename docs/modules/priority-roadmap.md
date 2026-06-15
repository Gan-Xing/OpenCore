# 模块优先级路线图

OpenCore 采用阶段化推进，避免过早写业务代码或把 P4/P5 深水区塞进 core。

## 已完成阶段

| 阶段      | 状态     | 结果                                                                                                                                                         |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S0/S1     | complete | 建立 pnpm workspace + Nx、apps/packages/tools/infra/docs 目录、品牌和基础文档                                                                                |
| D1-D6     | complete | 平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge/AI 路线                                                                                          |
| S2        | complete | 初始化 `apps/api` 和 `apps/admin` 双主干                                                                                                                     |
| S3        | complete | `packages/shared`、`packages/contracts`、`packages/module-registry`                                                                                          |
| S4        | complete | API foundation、OpenAPI export、安全/配置/日志/错误/request id                                                                                               |
| S5        | complete | Admin shell、Dashboard、异常页、request/access、registry 菜单                                                                                                |
| S6        | complete | auth/RBAC、Prisma/PostgreSQL schema、RBAC API/SDK/Admin 页面                                                                                                 |
| S7        | complete | dict、system config、file asset、audit log、login log、系统管理页面                                                                                          |
| S8        | complete | status/version/queue、OpenAPI drift check、export protocol、Monitor/Tool 页面                                                                                |
| R-1-R7    | complete | legacy app freeze、runtime audit、OpenCore env、PostgreSQL migration/seed、Prisma persistence、Redis/BullMQ/MinIO diagnostics、integration smoke、final docs |
| S9        | complete | OpenForge 只读 generate plan、diff plan、safety/preflight report、contracts、workspace tool、CLI 和测试                                                      |
| V1        | complete | OpenForge safe generator：schema/config DSL、template/VFS、apply/manifest/rollback、API/Admin/SDK/Test/Docs pack、doctor/gate/e2e、final docs                |
| Q001      | complete | 平台内核和契约加固、OpenForge gate、轻量 collaboration、monitor job/cache/online-user、optional report/export-job design、integration provider/design 边界   |
| BE20      | complete | 后端自循环：common/core/database/redis/file/system/security/audit/online-user/scheduler/monitor/generator-core/tools/api aggregation 按依赖顺序完成          |
| Admin V6  | complete | 官方 Ant Design Pro V6 架构、正式 OpenCore routes、request/access/OpenAPI/SDK 对齐、demo routes/services/mocks 清理                                          |
| Cycle-021 | closed   | 有限 System Admin fallback closure：七个 System Admin 页面完成 live-only、no fixture fallback、public smoke 和 deploy guard 验收                             |

## Runtime Integration

R-1 到 R7 已完成：

- 旧 Antdpro6 / NestWeb 应用运行态已冻结，基础服务和数据卷保留。
- OpenCore runtime env contract 已落地到 `.env.example`，本地真实值只在 ignored `.env.opencore.local`。
- PostgreSQL 使用 OpenCore 独立 database/user/schema boundary，并完成 baseline migration + seed。
- RBAC 与 system management 已从 seed/in-memory repository 升级为 Prisma-backed persistence。
- Redis/BullMQ/MinIO/S3 已接入只读 runtime diagnostics，并使用 OpenCore prefix/bucket/prefix。
- R6 完整 command gate、OpenAPI drift gate、Admin smoke、SDK/contracts targeted tests 和 live API smoke 均已通过。

## S9：OpenForge MVP

S9 已通过单独 handoff/goal 完成。当前 OpenForge 只允许 module registry 登记、contracts、workspace tool、CLI plan/diff/check、只读输入读取、安全/preflight report、测试和文档。

S9 目标：

- 读取 module registry、OpenAPI 和人工 schema。
- 输出只读/dry-run generate plan。
- 输出 diff plan。
- 默认不覆盖人工文件。
- 不生成业务逻辑。
- 不写 Prisma schema。
- 不实现写文件生成器。

## OpenForge V1：Safe Generator

OpenForge V1 Stage A-L 已完成。它在 S9 安全边界上增加写入能力，但只允许：

- 默认 dry-run。
- `--yes` 才能写。
- 创建/更新带合法 OpenForge marker 的 generated-owned files。
- 为 human-authored entry files 生成 patch-only markdown。
- 通过 manifest rollback 删除或恢复仍匹配 hash/marker 的 generated files。
- 通过 `openforge:doctor`、`openforge:test` 和 `openforge:gate` 进入本地门禁。

OpenForge V1 仍不写 `prisma/schema.prisma`、不创建 `prisma/migrations/**`、不生成业务逻辑。Q001 的后续模块由人工实现并通过 registry、OpenAPI、SDK、Admin 和测试 gate；不得用 OpenForge 绕过 generated marker 或 patch-plan 边界。

## Quality Cycle 001

Q001 已完成以下平台型能力：

- `collaboration.message`、`collaboration.notice`、`collaboration.todo`、`collaboration.approval-lite`。
- `monitor.job`、`monitor.cache`、`monitor.online-user`。
- `optional.report`、`optional.export-job` 设计位。
- `integration.provider`、`integration.mail`、`integration.sms`、`integration.oauth`、`integration.wechat`、`integration.websocket`、`integration.billing-design`。

## Admin Pro V6 Architecture Migration

2026-06-11 已完成 Admin 专项迁移：`apps/admin` 使用官方 Ant Design Pro V6 `config/config.ts`、`config/routes.ts`、runtime `src/app.tsx`、`requestErrorConfig`、locales、OpenAPI plugin、request-record、React Query 和 Vitest 作为架构底座；业务页面来自 `origin/main` 的 S5-S8 + Q001 页面能力。

迁移后的正式路由只包含 Dashboard、System、Security、Monitor、Tools、Collaboration、Optional、Integrations、`/user/login` 和 403/404/500。Ant Design Pro demo routes/pages/services/mocks 已删除；auth/current user 通过 `@opencore/sdk` 调用 `POST /api/auth/login` 和 `GET /api/auth/me`；route/access drift gate 改为校验 `apps/admin/config/routes.ts`。

Q001 仍明确不做：

- BPMN/流程设计器。
- 完整报表设计器。
- 大数据异步导出生产执行。
- 真实支付、回调幂等、退款、对账闭环。
- CRM、ERP、MES、WMS、商城、会员、多租户、知识库、RAG、Agent。

## Backend Self-Loop BE20

BE20 已完成 OpenCore 后端运行时包化和 API 聚合收尾。若依/芋道主干后台能力已经按 TS/NestJS monorepo 边界转译到 OpenCore：

- 基础 runtime：common、core、database、redis、file。
- 系统管理：dict、config、notice、dept、post、menu、role、user。
- 安全审计：auth、password/JWT/captcha、RBAC、data-scope、login log、operation log。
- 监控运维：online-user、scheduler、monitor health/status/version/queue/cache/runtime diagnostics。
- 工具生成：generator-core 和 OpenForge CLI wrapper。
- API 聚合：`apps/api` 只保留 bootstrap、HTTP entry aggregation、module aggregation、runtime config、OpenAPI export/check。

BE20 验收记录：

- [Backend Self-Loop backlog](../quality-cycle/cycle-020/backlog.md)
- [Backend Self-Loop implementation notes](../quality-cycle/cycle-020/implementation-notes.md)
- [Backend Self-Loop completion report](../quality-cycle/cycle-020/completion-report.md)

## 后续准入式阶段

历史 S10/S11/S12 的很多 foundation hardening 已在 Cycle-021 中完成。后续不再自动沿用这些阶段名推进；新的实现必须先给出有限队列和验收矩阵。

| 候选主题                     | 边界                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| collaboration hardening      | 只能在明确准入时补消息/待办/Approval Lite 的产品化缺口；不自动进入 BPMN/full workflow |
| operations/report hardening  | scheduler/monitor 已有 runtime；完整报表设计器和大数据异步导出仍需单独准入            |
| integration hardening        | provider/mail/sms/oauth/design 已有 foundation；真实支付或大供应商运营面仍需单独准入  |
| industry/ai independent eval | CRM、ERP、MES、WMS、商城、会员、IoT、AI/RAG/Agent 等独立评估                          |

## P4/P5 长期 backlog

OpenCore 长期要覆盖 RuoYi/Yudao 代表的企业后台能力地图，但必须分层实现：

- `optional/*`：完整报表设计器、工作流设计器、租户等仍需逐项准入；Q001 已完成 report/export-job 设计位，BE20 已完成部门/岗位和调度 runtime。
- `integration/*`：邮件、短信、微信、OAuth、WebSocket provider 边界已进入 Q001；真实支付仍保持 design-only。
- `industry/*`：member、mall、CRM、ERP、MES、WMS、IoT、IM。
- `ai/*`：Knowledge、RAG、Agent、AI workflow。

`not_now` 只表示当前阶段不做，不表示永远不做。
