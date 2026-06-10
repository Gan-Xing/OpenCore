# 模块优先级路线图

OpenCore 采用阶段化推进，避免过早写业务代码或把 P4/P5 深水区塞进 core。

## 已完成阶段

| 阶段   | 状态     | 结果                                                                                                                                                         |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S0/S1  | complete | 建立 pnpm workspace + Nx、apps/packages/tools/infra/docs 目录、品牌和基础文档                                                                                |
| D1-D6  | complete | 平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge/AI 路线                                                                                          |
| S2     | complete | 初始化 `apps/api` 和 `apps/admin` 双主干                                                                                                                     |
| S3     | complete | `packages/shared`、`packages/contracts`、`packages/module-registry`                                                                                          |
| S4     | complete | API foundation、OpenAPI export、安全/配置/日志/错误/request id                                                                                               |
| S5     | complete | Admin shell、Dashboard、异常页、request/access、registry 菜单                                                                                                |
| S6     | complete | auth/RBAC、Prisma/PostgreSQL schema、RBAC API/SDK/Admin 页面                                                                                                 |
| S7     | complete | dict、system config、file asset、audit log、login log、系统管理页面                                                                                          |
| S8     | complete | status/version/queue、OpenAPI drift check、export protocol、Monitor/Tool 页面                                                                                |
| R-1-R7 | complete | legacy app freeze、runtime audit、OpenCore env、PostgreSQL migration/seed、Prisma persistence、Redis/BullMQ/MinIO diagnostics、integration smoke、final docs |
| S9     | complete | OpenForge 只读 generate plan、diff plan、safety/preflight report、contracts、workspace tool、CLI 和测试                                                      |
| V1     | complete | OpenForge safe generator：schema/config DSL、template/VFS、apply/manifest/rollback、API/Admin/SDK/Test/Docs pack、doctor/gate/e2e、final docs                |

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

OpenForge V1 仍不写 `prisma/schema.prisma`、不创建 `prisma/migrations/**`、不生成业务逻辑、不实现 P4/P5 模块。S10 collaboration 可以复用它生成 message/todo/Approval Lite skeleton，但必须先通过 registry、OpenAPI 和 schema authoring。

## S10 以后

| 阶段 | 建议主题                              | 边界                                                                         |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------- |
| S10  | collaboration                         | message、todo、Approval Lite，可用 OpenForge V1 生成 skeleton，不做完整 BPMN |
| S11  | knowledge/optional design             | 只设计知识库或 optional module，不做 RAG/Agent                               |
| S12  | workflow/report/online-user/cache/job | 逐个通过准入 checklist，不一次性铺开                                         |
| S13+ | integration/industry/ai               | CRM、ERP、MES、WMS、商城、支付、会员、IoT、AI 等独立评估                     |

## P4/P5 长期 backlog

OpenCore 长期要覆盖 RuoYi/Yudao 代表的企业后台能力地图，但必须分层实现：

- `optional/*`：部门/岗位、通知公告、缓存、在线用户、定时任务、报表、工作流。
- `integration/*`：邮件、短信、微信、OAuth、WebSocket、支付 provider。
- `industry/*`：member、mall、CRM、ERP、MES、WMS、IoT、IM。
- `ai/*`：Knowledge、RAG、Agent、AI workflow。

`not_now` 只表示当前阶段不做，不表示永远不做。
