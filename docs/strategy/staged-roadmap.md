# Staged Roadmap

更新时间：2026-06-10

本路线图从 S3 开始。S0/S1/D1-D6 已完成文档和 monorepo 基线，S2 已初始化 `apps/api` 和 `apps/admin` 空主干。后续不能跳过 S3 直接写业务模块。

重要口径：S3-S8 是 OpenCore 从“空主干”走到“可创办公司/公开开发的企业后台基础架构”的实现主线；P4/P5 能力进入长期 backlog，但不得抢在契约、RBAC、系统管理和监控工具之前实现。

## Roadmap Overview

```mermaid
gantt
  title OpenCore S3-S12 Roadmap
  dateFormat  YYYY-MM-DD
  axisFormat  S%q
  section Foundation
  S3 contracts shared registry :s3, 2026-06-10, 14d
  S4 API core foundation :s4, after s3, 21d
  S5 Admin core shell :s5, after s4, 21d
  section Core
  S6 RBAC system :s6, after s5, 28d
  S7 system management :s7, after s6, 28d
  S8 monitor tool :s8, after s7, 28d
  section Platform Tools
  S9 OpenForge MVP :s9, after s8, 28d
  S10 collaboration :s10, after s9, 28d
  section Optional Design
  S11 knowledge design or optional module :s11, after s10, 21d
  S12 later optional modules :s12, after s11, 35d
```

## S3-S8 优化后的阶段门禁

| 阶段 | 进入条件                         | 必须落地                                                                                                                         | 必跑检查                                                                                | 退出条件                                                                    |
| ---- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| S3   | S2 API/Admin 空主干可 build/test | `packages/contracts`、`packages/shared`、`packages/module-registry`、权限码/菜单 schema、OpenAPI 导出与 SDK 生成协议             | `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test`、契约/registry 单测     | contracts/shared/registry 可空跑；权限码和菜单字段可校验；progress 记录证据 |
| S4   | S3 契约链路可空跑                | API config/env validation、统一错误、request id、结构化日志、OpenAPI 基线、安全默认值                                            | `pnpm build:api`、`pnpm test:api`、health/OpenAPI smoke、生产危险配置 fail-fast 测试    | API foundation 稳定，仍不写业务 schema                                      |
| S5   | S4 API foundation 可启动         | Admin Layout、Dashboard shell、错误页、空状态、request/access 规范、registry/mock 菜单消费                                       | `pnpm build:admin`、`pnpm test:admin`、`pnpm typecheck`、admin smoke/E2E                | Admin 壳可演示，正式菜单不混入 demo 页面                                    |
| S6   | S3-S5 全部通过                   | 允许引入 Prisma/PostgreSQL；实现 auth/RBAC 最小闭环：user、role、permission、menu、Role.code、Permission.code、guard、Admin 页面 | API/Admin 单测、RBAC E2E、OpenAPI/SDK drift check、权限码/菜单一致性测试                | 登录/RBAC、菜单、按钮权限、SDK、OpenAPI 可互相追踪                          |
| S7   | S6 RBAC 稳定                     | dict、system config、file asset、audit log、login log；基础 CRUD、分页、权限、审计                                               | CRUD 单测、权限矩阵测试、文件上传 smoke、审计脱敏测试、Admin 页面 smoke                 | 第一批系统管理可用，不混入图片/文章/微信/短信业务                           |
| S8   | S7 系统管理稳定                  | status、version、queue 只读诊断、OpenAPI drift CI、当前页导出模板/协议                                                           | monitor smoke、queue/status 单测、OpenAPI diff fail test、export test、敏感信息泄漏检查 | 可观测和工具基线完成，准备 S9 OpenForge MVP                                 |

S6 是第一个允许业务持久化模型进入的阶段；S3-S5 只允许契约、registry、foundation 和 Admin shell。任何阶段失败时，先修测试和 progress，不扩大范围。

```mermaid
flowchart LR
  DOCS[strategy docs] --> S3[S3 contracts registry]
  S3 --> S4[S4 api foundation]
  S4 --> S5[S5 admin shell]
  S5 --> S6[S6 auth rbac]
  S6 --> S7[S7 system management]
  S7 --> S8[S8 monitor tool]
  S8 --> S9[S9 OpenForge MVP]
```

## 阶段详情

| 阶段                                                 | 目标                                           | 新增模块                                                                                      | 后端交付                                                                   | 前端交付                                       | 文档交付                                                  | 验收标准                                                    | 不做什么                                        | 风险点                                   |
| ---------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| S3 contracts/shared/module-registry 基线             | 建立契约、共享类型、模块注册表的单一事实来源   | `packages/contracts`、`packages/shared`、`packages/module-registry`                           | OpenAPI 导出命令、契约保存规范、权限码/菜单 schema 草案                    | Admin 读取静态 registry 或 mock，不连业务接口  | 更新 OpenAPI workflow、module registry spec、SDK workflow | `pnpm` 命令可空跑；契约、权限、菜单字段可校验；无业务模块   | 不做登录、RBAC、数据库、Prisma schema           | schema 设计过早过细会锁死后续模块        |
| S4 API core foundation                               | 建立 API 平台基础                              | `platform/config`、`platform/errors`、`platform/logging`、`platform/request-context`          | env validation、统一错误、request id、日志、health/readiness、OpenAPI 基线 | 只消费 health / OpenAPI 状态                   | API runtime baseline、security baseline                   | API 可启动、health 可用、OpenAPI 可导出、生产危险配置会失败 | 不接业务表，不写 auth/RBAC                      | 过早接数据库会把 foundation 变成业务实现 |
| S5 Admin core shell                                  | 建立官方后台壳层                               | Dashboard shell、Layout、Error pages、Profile placeholder                                     | 提供健康摘要或静态契约                                                     | Dashboard、Layout、菜单壳、403/404/500、空状态 | Admin shell guide、route/menu spec                        | Admin 可启动、可构建、页面无真实业务依赖                    | 不做登录页真实接入，不做权限数据流              | 模板页污染正式菜单                       |
| S6 RBAC system                                       | 建立最小 RBAC 闭环                             | `core.user`、`core.role`、`core.permission`、`core.menu`                                      | 用户、角色、权限、菜单 API；`Role.code` 稳定；权限 guard                   | 用户、角色、权限、菜单、个人页、access         | RBAC spec、permission migration rules                     | 权限码、菜单、OpenAPI、SDK、页面按钮能互相追踪              | 不做多租户、组织数据权限、SSO                   | 权限粒度过粗或过细都会返工               |
| S7 system management                                 | 建立系统管理能力                               | `core.dict`、`core.config`、`core.file`、`core.audit-log`、`core.login-log`                   | 字典、系统参数、文件中心、操作日志、登录日志 API                           | 字典、参数、文件、操作日志、登录日志页面       | System management guide、file/audit spec                  | CRUD、分页、权限、导出、审计可跑通                          | 不做图片业务、文章业务、微信/短信/邮件 provider | 文件中心容易被业务语义污染               |
| S8 monitor / tool                                    | 建立可观测和工具基线                           | `monitor.status`、`monitor.version`、`monitor.queue`、`tool.openapi`、`tool.export`           | 系统状态、版本、队列状态、OpenAPI drift check、导出协议                    | 状态、版本、队列、OpenAPI 状态、当前页导出模板 | Monitor runbook、OpenAPI drift guide、export guide        | drift check 失败能阻止提交；状态页可诊断依赖                | 不做完整任务调度平台、不做大数据异步导出        | 监控页暴露敏感配置                       |
| S9 OpenForge code generator MVP                      | 建立只读和 dry-run 生成器                      | `tool.openforge`                                                                              | 读取 module registry、OpenAPI、人工 schema；输出生成计划和 diff            | OpenForge 页面展示 dry-run 结果                | OpenForge MVP spec、template safety rules                 | 默认不覆盖人工文件；重复运行无无意义 diff                   | 不生成业务逻辑，不写 Prisma schema              | 生成器越权修改文件                       |
| S10 collaboration                                    | 建立轻量协同                                   | `collaboration.message`、`collaboration.approval-lite`                                        | 通知、待办、单步审批 API；业务关联 `businessType + businessId`             | 消息中心、待办、Approval Lite 页面             | Message/Approval Lite integration guide                   | 通知可读、待办可完成、审批不可重复处理                      | 不做 BPMN、流程设计器、复杂工作流               | Approval Lite 膨胀成工作流               |
| S11 knowledge base design or optional module         | 做知识库设计或选择一个 optional 模块做设计验证 | `optional.knowledge-design` 或 `optional.report-design`                                       | 只产出设计、接口草案、风险清单                                             | 只产出页面草图或静态原型                       | Knowledge/optional module design doc                      | 明确是否进入后续路线，不能偷跑实现                          | 不做 RAG、Agent、向量库、模型调用               | AI Native 定位诱导过早实现               |
| S12 workflow/report/online-user/cache/job 等后续模块 | 汇总后续模块进入条件                           | `optional.workflow`、`optional.report`、`monitor.online-user`、`monitor.cache`、`monitor.job` | 选择性实现在线用户、缓存、任务、报表、工作流设计位                         | 对应页面按模块开关出现                         | S12 module admission checklist                            | 每个模块有启用条件、权限、菜单、OpenAPI tag                 | 不做 CRM/ERP/MES/WMS/商城/支付/会员/多租户      | 可选模块过多导致主线失焦                 |

## 阶段依赖图

```mermaid
flowchart TD
  S3[S3 Contracts Shared Registry] --> S4[S4 API Foundation]
  S4 --> S5[S5 Admin Shell]
  S5 --> S6[S6 RBAC]
  S6 --> S7[S7 System Management]
  S7 --> S8[S8 Monitor Tool]
  S8 --> S9[S9 OpenForge MVP]
  S9 --> S10[S10 Collaboration]
  S10 --> S11[S11 Optional Design]
  S11 --> S12[S12 Later Modules]
  S6 -. required before .-> TENANT[Multi-tenant decision]
  S10 -. required before .-> WORKFLOW[Workflow]
  S8 -. required before .-> AI[AI Native implementation]
```

## 第一年路线建议

| 时间段 | 建议范围 | 成功标准                                               |
| ------ | -------- | ------------------------------------------------------ |
| 第一段 | S3-S5    | 契约、模块注册表、API foundation、Admin shell 都能空跑 |
| 第二段 | S6-S7    | RBAC 和系统管理闭环可用，旧项目核心经验被重写吸收      |
| 第三段 | S8-S10   | 监控、工具、OpenForge MVP、消息和 Approval Lite 可演示 |
| 延后   | S11-S12  | 只做 optional/AI/行业模块准入设计，谨慎实现            |

## S12 之后的长期能力队列

为了实现“若依/芋道有的企业后台能力，OpenCore 都有长期归宿”，S12 之后建议继续拆成独立阶段，而不是把 P5 混进 core：

| 后续阶段 | 建议主题                              | 说明                                                                             |
| -------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| S13      | optional workflow/report/form-builder | 先做设计器和低代码能力的边界，不复制 BPMN/报表平台实现                           |
| S14      | integration providers                 | 邮件、短信、微信、OAuth、WebSocket、支付 provider 的凭据、安全、审计和成本治理   |
| S15      | member/mall/pay business pack         | 会员、商品、订单、支付、退款等商业能力，必须独立于 core 发布和启用               |
| S16      | CRM pack                              | 客户、联系人、商机、合同、跟进、回款等客户经营能力                               |
| S17      | ERP/WMS pack                          | 采购、销售、库存、仓储、财务边界，必须先有行业数据模型设计                       |
| S18      | MES/IoT/AI Native implementation      | 设备、生产、质检、IoT 规则、AI Knowledge/RAG/Agent，必须先有安全、审计和成本模型 |

这些阶段可以让 OpenCore 最终覆盖完整企业架构，但不会破坏 S3-S8 的可实现性。

## 不允许的路线捷径

- 不能在 S3 前写用户/角色/权限业务代码。
- 不能在 S6 前接多租户或组织数据权限。
- 不能在 S7 前把图片、文章、微信、短信放入 core。
- 不能在 S8 前做完整工作流、报表平台或大数据导出。
- 不能在 S10 前做知识库、RAG、Agent。
- 不能把 RuoYi/Yudao 的 Java/Vue 模块直接搬进 OpenCore。
