# OpenCore 文档入口

更新时间：2026-06-10

本目录保存 OpenCore（开元）的架构、模块、开发、runtime、策略、handoff 和 AI Native 文档。当前实现状态已经从 S0/S1/S2 推进到 **S3-S8 complete**，并完成 **runtime integration R-1-R7**。

## 当前实现状态

| 阶段   | 状态     | 文档入口                                                                                                                                                   |
| ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0/S1  | complete | [架构总览](architecture/overview.md)、[Monorepo 规划](architecture/monorepo.md)                                                                            |
| D1-D6  | complete | [平台边界](architecture/platform-boundaries.md)、[模块分类](modules/module-taxonomy.md)、[契约与权限规范](development/contract-and-permission-standard.md) |
| S2     | complete | [API 启动计划](development/api-bootstrap-plan.md)、[Admin 启动计划](development/admin-bootstrap-plan.md)                                                   |
| S3     | complete | [模块注册表](modules/module-registry.md)、[契约与权限规范](development/contract-and-permission-standard.md)                                                |
| S4     | complete | [API 启动计划](development/api-bootstrap-plan.md)                                                                                                          |
| S5     | complete | [Admin 启动计划](development/admin-bootstrap-plan.md)                                                                                                      |
| S6     | complete | [契约与权限规范](development/contract-and-permission-standard.md)、[S3-S8 进度](strategy/progress.md)                                                      |
| S7     | complete | [优先级路线图](modules/priority-roadmap.md)、[S3-S8 进度](strategy/progress.md)                                                                            |
| S8     | complete | [优先级路线图](modules/priority-roadmap.md)、[S3-S8 进度](strategy/progress.md)                                                                            |
| R-1-R7 | complete | [Runtime inventory](runtime/runtime-inventory.md)、[OpenCore env mapping](runtime/opencore-env-mapping.md)、[进度 ledger](strategy/progress.md)            |
| S9     | complete | [OpenForge 路线图](development/openforge-roadmap.md)、[OpenForge CI Gate](development/openforge-ci-gate.md)                                                |

## 推荐阅读顺序

1. [架构总览](architecture/overview.md)
2. [平台边界](architecture/platform-boundaries.md)
3. [模块注册表](modules/module-registry.md)
4. [优先级路线图](modules/priority-roadmap.md)
5. [开发起步](development/getting-started.md)
6. [Runtime inventory](runtime/runtime-inventory.md)
7. [S3-S8 与 runtime integration 进度](strategy/progress.md)
8. [Handoff 索引](handoff/README.md)

## 文档分组

| 分组     | 文档                                                                                                                                                                                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 架构     | [架构总览](architecture/overview.md)、[品牌与命名](architecture/brand.md)、[技术栈](architecture/tech-stack.md)、[Monorepo 规划](architecture/monorepo.md)、[平台边界](architecture/platform-boundaries.md)                                                                                                                          |
| 模块     | [模块注册表](modules/module-registry.md)、[模块分类](modules/module-taxonomy.md)、[优先级路线图](modules/priority-roadmap.md)                                                                                                                                                                                                        |
| 开发     | [开发起步](development/getting-started.md)、[契约与权限规范](development/contract-and-permission-standard.md)、[API 启动计划](development/api-bootstrap-plan.md)、[Admin 启动计划](development/admin-bootstrap-plan.md)、[OpenForge 路线图](development/openforge-roadmap.md)、[OpenForge CI Gate](development/openforge-ci-gate.md) |
| Runtime  | [Runtime inventory](runtime/runtime-inventory.md)、[OpenCore env mapping](runtime/opencore-env-mapping.md)、[Local env runbook](runtime/local-env-runbook.md)                                                                                                                                                                        |
| AI       | [AI Native 路线图](ai/ai-native-roadmap.md)                                                                                                                                                                                                                                                                                          |
| Strategy | [Strategy Blueprint](strategy/README.md)、[S3-S8 进度](strategy/progress.md)、[能力矩阵](strategy/ruoyi-yudao-capability-matrix.md)、[阶段路线图](strategy/staged-roadmap.md)                                                                                                                                                        |
| Handoff  | [Handoff 索引](handoff/README.md)、[S3-S8 Implementation Handoff](handoff/2026-06-10-s3-s8-implementation-handoff.md)、[Runtime Integration Handoff](handoff/2026-06-10-runtime-integration-handoff.md)、[S9 OpenForge MVP Handoff](handoff/2026-06-10-s9-openforge-mvp-handoff.md)                                                  |

## 当前边界

S3-S9 与 runtime integration R-1-R7 已完成，但 P4/P5 仍只保留长期 backlog，不进入当前 core：CRM、ERP、MES、WMS、商城、支付、会员、多租户、知识库、RAG、Agent 均未实现。S9 OpenForge MVP 只做只读 generate plan、diff plan 和 safety/preflight report。
