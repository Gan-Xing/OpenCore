# 模块分类

本文档锁定 OpenCore 的模块分层、启用策略和注册表设计方向。当前 S3-S9、Q001、Backend Self-Loop BE20、Admin Pro V6 migration 和 Cycle-021 System Admin fallback closure 已完成 P0-P3 主线、后端 runtime 包化和七个 System Admin live-only 验收；P4/P5 仍保留长期 backlog，不进入当前 core。

## 分层定义

| 层级            | 定义                                                                     | 当前策略                                                                                               |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `core`          | 平台运行必需能力，例如用户、角色、权限、菜单、配置、字典、文件、审计基础 | BE20/Cycle-021 已实现 system/security/audit 主线和 System Admin live-only 验收                         |
| `monitor`       | 系统监控和运维能力，例如健康、版本、队列、日志、任务、运行状态           | BE20/Cycle-021 已实现 status/version/queue/cache/online-user/scheduler runtime 和 Admin live-only 加固 |
| `tool`          | 开发工具和平台工具，例如 OpenAPI、导入导出、OpenForge                    | S9/V1/BE20/Cycle-021 已实现 OpenAPI gate、导出协议、OpenForge core/CLI/Admin safe workbench            |
| `collaboration` | 消息、待办、通知、轻量审批和工作台等协同能力                             | Q001/Cycle-021 已完成轻量 live operations；BPMN/full workflow 仍需准入                                 |
| `optional`      | 通用可选模块，例如报表、工单、工作流增强等                               | Q001 已有 design/runtime 边界，完整实现需逐项准入                                                      |
| `industry`      | 工程、制造、教育、医疗、电商、CRM、ERP、MES、WMS 等行业能力              | 后续独立包或独立 app 评估                                                                              |
| `integration`   | 微信、短信、邮件、钉钉、飞书、支付等第三方集成                           | Q001 已有 provider/design 边界，真实供应商闭环需准入                                                   |
| `ai`            | AI Native 能力预留，例如模型供应商、Prompt、工具调用、审计、成本治理     | 当前只预留，不实现 RAG/Agent/知识库                                                                    |
| `experimental`  | 示例、实验和非主线模块                                                   | 默认关闭，不进入稳定版承诺                                                                             |

## 模块注册表字段

`packages/module-registry` 已开始描述模块元数据，而不是直接承载业务实现。

当前字段方向：

- `code`：稳定模块标识，例如 `core.user`。
- `title`：显示名称。
- `layer`：模块层级。
- `priority`：P0-P5。
- `status`：planned、preview、stable、deprecated 等。
- `stage`：S3-S12。
- `enabledByDefault`：是否默认启用。
- `permissions`：权限码列表。
- `menus`：菜单元数据列表。
- `apiTags`：关联 OpenAPI tag。
- `admin`：Admin base path 和 route 声明。

## 精简版和完整版思路

OpenCore 学习 RuoYi/Yudao 的模块地图、权限粒度、代码生成器和精简版/完整版思路，但不复制其 Java/Vue 代码。

- Lite：优先保留 `core`、必要的 `monitor` 和少量 `tool`。
- Full：增加 `collaboration`、`optional`、`integration`。
- Industry：通过 `industry` 扩展，而不是污染 `core`。
- AI Native：通过 `ai` 层挂接，不直接散落在业务模块中。

## 启用策略

模块启用必须同时满足：

- 模块处于允许启用的 `status`。
- 依赖模块已启用。
- 冲突模块未启用。
- 当前 edition 支持该模块。
- 当前 app 支持该模块能力。
- 不违反当前阶段边界和 P4/P5 backlog guard。

## 当前阶段禁止项

S3-S9、Q001、BE20 和 Cycle-021 closure 已完成，但仍不直接实现 CRM、ERP、MES、WMS、商城、真实支付、会员、生产多租户、知识库、RAG、Agent、完整 BPMN 工作流、完整报表设计器或大数据异步导出。新能力需要明确准入和有限验收队列。
