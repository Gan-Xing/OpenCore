# OpenCore Strategy Blueprint

更新时间：2026-06-10

本目录是 OpenCore 战略蓝图文档包。它回答“OpenCore 最终要做成什么、API 和 Admin 会长成什么、哪些能力要做、哪些能力暂缓、旧项目经验如何复用、后续阶段怎么走”。

## 当前状态

S3-S8 实现目标已经完成：

- S3 contracts / shared / module-registry：complete。
- S4 API core foundation：complete。
- S5 Admin core shell：complete。
- S6 auth / RBAC system：complete。
- S7 system management：complete。
- S8 monitor / tool baseline：complete。

S9 OpenForge MVP 已完成：只读 generate plan、diff plan、safety/preflight report、OpenForge contracts、`tools/generator` Nx tool 和 `tool.openforge` registry 登记均已落地。

OpenForge V1 A-L 已完成：schema/config DSL、template/VFS、safe apply、manifest、rollback、API/Admin/SDK/Test/Docs generator pack、doctor、gate、temp repo e2e 和最终文档已落地。OpenForge 默认 dry-run；真实写入必须显式 `--yes`，且仍不写 Prisma schema/migration，不实现 P4/P5 模块。

## 推荐阅读顺序

| 顺序 | 文件                                                                                                           | 先回答的问题                                          |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1    | [opencore-target-vision.md](opencore-target-vision.md)                                                         | OpenCore 最终是什么，和 RuoYi/Yudao 是什么关系        |
| 2    | [ruoyi-yudao-capability-matrix.md](ruoyi-yudao-capability-matrix.md)                                           | 对标后哪些模块做、哪些不做、哪些以后做                |
| 3    | [api-target-architecture.md](api-target-architecture.md)                                                       | `apps/api` 最终模块层次和后端建设顺序                 |
| 4    | [admin-page-map.md](admin-page-map.md)                                                                         | `apps/admin` 最终一级菜单、页面地图和前端建设顺序     |
| 5    | [legacy-reuse-audit.md](legacy-reuse-audit.md)                                                                 | NestWeb / Antdpro6 哪些经验可复用，哪些不迁移         |
| 6    | [staged-roadmap.md](staged-roadmap.md)                                                                         | S3 到 S12 每阶段交付什么、不做什么、怎么验收          |
| 7    | [visual/opencore-blueprint.html](visual/opencore-blueprint.html)                                               | 给 owner 快速浏览的单文件可视化总览                   |
| 8    | [progress.md](progress.md)                                                                                     | 当前蓝图包完成度、每轮 Codex 摘要、测试证据和最终验收 |
| 9    | [../handoff/2026-06-10-s3-s8-implementation-handoff.md](../handoff/2026-06-10-s3-s8-implementation-handoff.md) | S3-S8 实现 handoff 和阶段门禁                         |
| 10   | [../development/openforge-v1-architecture.md](../development/openforge-v1-architecture.md)                     | OpenForge V1 safe generator 架构和边界                |
| 11   | [../development/openforge-apply-rollback-runbook.md](../development/openforge-apply-rollback-runbook.md)       | 如何 apply、review manifest 和 rollback               |

## 哪些文件回答哪些问题

| 问题                                                                                         | 入口                                                                                                                                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenCore Lite / Full / AI Native Edition 怎么分                                              | [目标愿景](opencore-target-vision.md#opencore-lite--full--ai-native-edition)                                                                               |
| 为什么学习 RuoYi/Yudao 但不复制 Java/Vue                                                     | [目标愿景](opencore-target-vision.md#与-ruoyiyudao-的关系)                                                                                                 |
| RuoYi/Yudao 的 system、infra、workflow、report 等怎么映射                                    | [能力矩阵](ruoyi-yudao-capability-matrix.md)                                                                                                               |
| 后端 core / monitor / tool / collaboration / optional / industry / integration / ai 如何落地 | [API 蓝图](api-target-architecture.md#模块层级如何落地)                                                                                                    |
| 后台一级菜单和页面如何规划                                                                   | [Admin 页面蓝图](admin-page-map.md#最终一级菜单设计)                                                                                                       |
| NestWeb 的 Role.code、OpenAPI drift、runtime config 等如何复用                               | [旧项目复用审计](legacy-reuse-audit.md)                                                                                                                    |
| S3-S8 当前完成度                                                                             | [progress.md](progress.md)                                                                                                                                 |
| S9/OpenForge V1 完成了什么                                                                   | [阶段路线图](staged-roadmap.md)、[OpenForge 路线图](../development/openforge-roadmap.md)、[OpenForge V1 架构](../development/openforge-v1-architecture.md) |

## 后续 Codex 规则

后续不应继续复用 S3-S8、runtime integration、S9 或 OpenForge V1 handoff 做新业务实现。OpenForge V1 已完成安全生成器闭环，但不生成业务逻辑，不写 Prisma schema/migration，不绕过 patch plan 修改 human-authored entry files。若继续，应另起 S10 collaboration handoff/goal。

P4/P5 能力仍保留长期 backlog：CRM、ERP、MES、WMS、商城、支付、会员、多租户、知识库、RAG、Agent 均不得无 handoff 直接实现。
