# OpenCore Strategy Blueprint

更新时间：2026-06-15

本目录回答“OpenCore 最终要做成什么、如何对标若依/芋道、哪些能力已经进入基础平台、哪些能力仍需显式准入”。这里不保存每轮执行流水账；轮次细节归 `docs/quality-cycle/**`，当前状态归 `progress.md`。

## 当前状态

已完成：

- S3-S8：contracts/shared/module-registry、API foundation、Admin shell、auth/RBAC、system management、monitor/tool baseline。
- Runtime integration R-1-R7：独立 PostgreSQL、Redis/BullMQ、MinIO/S3、env boundary、migration/seed、live smoke。
- S9 + OpenForge V1：安全生成器、schema/config DSL、template/VFS、manifest/rollback、doctor/gate、generated skeleton 和 patch plan。
- Quality Cycle 001：平台内核加固、轻量 collaboration、operations/report 设计位、integration provider/design 边界。
- Backend Self-Loop BE20：common/core/database/redis/file/system/security/audit/online-user/scheduler/monitor/generator-core/tools/api aggregation 后端 runtime 包化。
- Admin Pro V6 migration：官方 Ant Design Pro V6 架构、正式 OpenCore routes、request/access/OpenAPI/SDK 对齐。
- Cycle-021 System Admin fallback closure：七个 System Admin 页面完成 strict acceptance，均为 live-only、无 fixture fallback、具备 public API/Admin smoke 和 deploy guard。

Cycle-021 closure 只确认七个固定 System Admin fallback debt 已关闭；新的业务域或大域能力必须另立有限验收清单。

## 推荐阅读顺序

| 顺序 | 文件                                                                                                                         | 先回答的问题                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1    | [progress.md](progress.md)                                                                                                   | 当前事实、source of truth、固定部署口径和无自动队列边界 |
| 2    | [../quality-cycle/cycle-021/handoff.md](../quality-cycle/cycle-021/handoff.md)                                               | Cycle-021 closure 的固定范围和准入边界                  |
| 3    | [../quality-cycle/cycle-021/acceptance-matrix.md](../quality-cycle/cycle-021/acceptance-matrix.md)                           | 七个 System Admin 页面的验收状态                        |
| 4    | [../quality-cycle/cycle-021/productization-waterline-audit.md](../quality-cycle/cycle-021/productization-waterline-audit.md) | 当前产品化水位和剩余债务                                |
| 5    | [ruoyi-yudao-capability-matrix.md](ruoyi-yudao-capability-matrix.md)                                                         | 若依/芋道能力如何映射到 OpenCore 层级和准入             |
| 6    | [admin-page-map.md](admin-page-map.md)                                                                                       | 当前 Admin 路由、菜单、页面和权限归属                   |
| 7    | [api-target-architecture.md](api-target-architecture.md)                                                                     | 后端 package-owned runtime 和 API composition root 目标 |
| 8    | [staged-roadmap.md](staged-roadmap.md)                                                                                       | 历史阶段和未来准入式阶段如何衔接                        |
| 9    | [legacy-reuse-audit.md](legacy-reuse-audit.md)                                                                               | 旧项目经验哪些已吸收、哪些不迁移                        |
| 10   | [opencore-target-vision.md](opencore-target-vision.md)                                                                       | OpenCore Lite / Full / AI Native 的长期愿景             |

## 文件职责

| 文件                                                 | 职责                                                  | 不负责                        |
| ---------------------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| `progress.md`                                        | 当前状态索引、固定部署端口、guardrail、无自动队列边界 | 轮次流水账、命令输出          |
| `ruoyi-yudao-capability-matrix.md`                   | 对标能力归属、优先级、准入层级                        | 逐项验收证据                  |
| `admin-page-map.md`                                  | 当前 Admin routes/menu/page map                       | 预测未来 S10/S12 路径         |
| `staged-roadmap.md`                                  | 历史阶段总结和未来准入方式                            | 作为当前执行 goal             |
| `../quality-cycle/cycle-021/acceptance-matrix.md`    | 七个 System Admin 页面的严格验收矩阵                  | 泛化成所有能力矩阵            |
| `../quality-cycle/cycle-021/reference-comparison.md` | 若依/芋道与 OpenCore 的产品化验收对比                 | 重复 waterline 或每轮决策列表 |
| `../quality-cycle/cycle-021/audit.md`                | 自审结论、返工原因、沉淀规则                          | 每轮报告或烟测日志            |

## 后续 Codex 规则

后续不应复用 S3-S8、runtime integration、S9、OpenForge V1、BE20 或 Cycle-021 closure 文档继续扩大范围。新的实现工作必须有明确的有限队列、验收矩阵、测试/smoke/deploy guard 和回滚边界。

P0/P1/P2 基础后台能力可以在已有准入范围内做独立闭环；业务域模块、支付、生产多租户、BPM、AI、完整报表设计器、行业套件和 OpenForge 直接写 schema/migration/business code 需要用户明确准入。
