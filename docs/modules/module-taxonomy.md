# 模块分类

本文档锁定 OpenCore 的模块分层、启用策略和注册表设计方向。D1-D6 阶段只做设计，不创建业务模块，不实现登录、RBAC、多租户、CRM、ERP、MES、WMS、商城、支付、会员、RAG、Agent 或知识库。

## 分层定义

| 层级 | 定义 | 默认策略 |
| --- | --- | --- |
| `core` | 平台运行必需能力，例如用户身份边界、组织边界、配置、字典、文件、审计基础 | 后续默认启用，但 D1-D6 不实现 |
| `monitor` | 系统监控和运维能力，例如日志、任务、健康检查、队列、告警、链路追踪 | 后续按部署形态启用 |
| `tool` | 开发工具和平台工具，例如 OpenForge、导入导出、代码生成、OpenAPI 工具 | 后续按开发/生产环境拆分 |
| `collaboration` | 消息、待办、通知、轻量审批和工作台等协同能力 | 后续可选启用 |
| `optional` | 通用可选模块，例如报表、工单、工作流增强等 | 后续按发行版本选择 |
| `industry` | 工程、制造、教育、医疗等行业能力 | 后续独立包或独立 app 评估 |
| `integration` | 微信、短信、邮件、钉钉、飞书、支付等第三方集成 | 后续按凭据和合规要求启用 |
| `ai` | AI Native 能力预留，例如模型供应商、Prompt、工具调用、审计、成本治理 | 第一阶段只预留，不实现 RAG/Agent/知识库 |
| `experimental` | 示例、实验和非主线模块 | 默认关闭，不进入稳定版承诺 |

## 模块注册表字段方向

`packages/module-registry` 后续应描述模块元数据，而不是直接承载业务实现。

建议字段：

- `id`：稳定模块标识，例如 `core.user`。
- `name`：显示名称。
- `layer`：模块层级，取值为本文档定义的九类。
- `description`：模块说明。
- `status`：`stable`、`preview`、`experimental`、`deprecated`。
- `edition`：`lite`、`full`、`enterprise` 或后续扩展值。
- `defaultEnabled`：是否默认启用。
- `dependencies`：依赖模块。
- `conflicts`：冲突模块。
- `permissions`：权限码列表。
- `menus`：菜单元数据列表。
- `openapiTags`：关联 OpenAPI tag。
- `apps`：支持的 app，例如 `api`、`admin`、`web`。

## 精简版和完整版思路

OpenCore 可以学习 RuoYi/Yudao 的模块地图、权限粒度、代码生成器和精简版/完整版思路，但不复制其 Java/Vue 代码。

- 精简版优先保留 `core`、必要的 `monitor` 和少量 `tool`。
- 完整版可以增加 `collaboration`、`optional`、`integration`。
- 行业版通过 `industry` 扩展，而不是污染 `core`。
- AI 能力通过 `ai` 层挂接，不直接散落在业务模块中。

## 启用策略

模块启用必须同时满足：

- 模块处于允许启用的 `status`。
- 依赖模块已启用。
- 冲突模块未启用。
- 当前 edition 支持该模块。
- 当前 app 支持该模块能力。

## 与权限、菜单和 OpenAPI 的关系

- 模块拥有权限码，但权限码的最终标准见 [契约与权限规范](../development/contract-and-permission-standard.md)。
- 模块可以声明菜单，但菜单渲染由 `apps/admin` 完成。
- 模块可以声明 OpenAPI tag，但接口实现由 `apps/api` 完成。
- OpenForge 后续可以读取模块注册表，生成权限码、菜单、API 骨架和后台页面骨架。

## 当前阶段禁止项

D1-D6 不实现任何模块运行时，不创建数据库表，不生成 Prisma schema，不实现登录、RBAC、多租户或业务模块。
