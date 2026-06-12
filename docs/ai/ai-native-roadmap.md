# AI Native 路线图

OpenCore（开元）定位为 AI Native 企业级全栈 Monorepo，但当前只做架构预留。

## 当前状态

S3-S9、runtime integration、OpenForge V1、Q001 和 BE20 已完成企业后台基础架构与后端 runtime 主线，但 AI Native 实现仍未开始。

当前不实现：

- RAG。
- Agent。
- 知识库。
- 模型调用。
- AI workflow。
- AI 业务模块。

`packages/ai-core` 仅作为未来 AI Native 能力的边界预留。

## 进入 AI 实现前必须具备

- BE20 后端权限、`Permission.code`、RBAC 和 data-scope 稳定。
- BE20 审计、登录日志、操作日志、online-user 和 scheduler runtime 稳定。
- BE20 monitor/tool、OpenAPI drift、SDK drift、敏感信息防泄漏稳定。
- 模型供应商、Prompt、工具调用、成本治理和数据边界设计完成。

## 未来方向

后续可在基础工程稳定后评估：

- AI 配置中心。
- 模型供应商抽象。
- Prompt 与工具调用契约。
- 审计、限流、成本统计和安全策略。
- 与 OpenAPI、模块注册表和 OpenForge 的联动。
- Knowledge/RAG/Agent 的准入和退出策略。

## 风险控制

AI 能力必须建立在清晰的权限、审计、数据边界和成本治理之上。

在 S10+ collaboration、optional、integration 和 AI 成本/数据治理边界进一步稳定之前，不应进入 RAG、Agent 或知识库实现。
