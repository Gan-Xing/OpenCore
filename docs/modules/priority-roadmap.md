# 模块优先级路线图

OpenCore 采用阶段化推进，避免过早写业务代码或把 P4/P5 深水区塞进 core。

## 已完成阶段

| 阶段  | 状态     | 结果                                                                          |
| ----- | -------- | ----------------------------------------------------------------------------- |
| S0/S1 | complete | 建立 pnpm workspace + Nx、apps/packages/tools/infra/docs 目录、品牌和基础文档 |
| D1-D6 | complete | 平台边界、模块分类、契约权限、API/Admin 启动计划、OpenForge/AI 路线           |
| S2    | complete | 初始化 `apps/api` 和 `apps/admin` 双主干                                      |
| S3    | complete | `packages/shared`、`packages/contracts`、`packages/module-registry`           |
| S4    | complete | API foundation、OpenAPI export、安全/配置/日志/错误/request id                |
| S5    | complete | Admin shell、Dashboard、异常页、request/access、registry 菜单                 |
| S6    | complete | auth/RBAC、Prisma/PostgreSQL schema、RBAC API/SDK/Admin 页面                  |
| S7    | complete | dict、system config、file asset、audit log、login log、系统管理页面           |
| S8    | complete | status/version/queue、OpenAPI drift check、export protocol、Monitor/Tool 页面 |

## S9：OpenForge MVP

下一阶段建议单独开 handoff/goal，不要混在 S3-S8 里继续偷跑。

S9 目标：

- 读取 module registry、OpenAPI 和人工 schema。
- 输出只读/dry-run generate plan。
- 输出 diff plan。
- 默认不覆盖人工文件。
- 不生成业务逻辑。
- 不写 Prisma schema。
- 不实现写文件生成器。

## S10 以后

| 阶段 | 建议主题                              | 边界                                                     |
| ---- | ------------------------------------- | -------------------------------------------------------- |
| S10  | collaboration                         | message、todo、Approval Lite，不做完整 BPMN              |
| S11  | knowledge/optional design             | 只设计知识库或 optional module，不做 RAG/Agent           |
| S12  | workflow/report/online-user/cache/job | 逐个通过准入 checklist，不一次性铺开                     |
| S13+ | integration/industry/ai               | CRM、ERP、MES、WMS、商城、支付、会员、IoT、AI 等独立评估 |

## P4/P5 长期 backlog

OpenCore 长期要覆盖 RuoYi/Yudao 代表的企业后台能力地图，但必须分层实现：

- `optional/*`：部门/岗位、通知公告、缓存、在线用户、定时任务、报表、工作流。
- `integration/*`：邮件、短信、微信、OAuth、WebSocket、支付 provider。
- `industry/*`：member、mall、CRM、ERP、MES、WMS、IoT、IM。
- `ai/*`：Knowledge、RAG、Agent、AI workflow。

`not_now` 只表示当前阶段不做，不表示永远不做。
