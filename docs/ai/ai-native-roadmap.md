# AI Native 路线图

OpenCore（开元）定位为 AI Native 企业级全栈 Monorepo，但第一阶段只做架构预留。

## 第一阶段边界

S0/S1 不实现：

- RAG。
- Agent。
- 知识库。
- 模型调用。
- 工作流。
- AI 业务模块。

`packages/ai-core` 仅作为未来 AI Native 能力的边界预留。

## 未来方向

后续可在基础工程稳定后评估：

- AI 配置中心。
- 模型供应商抽象。
- Prompt 与工具调用契约。
- 审计、限流、成本统计和安全策略。
- 与 OpenAPI、模块注册表和 OpenForge 的联动。

## 风险控制

AI 能力必须建立在清晰的权限、审计、数据边界和成本治理之上。

在登录、RBAC、模块注册表、OpenAPI 契约和基础观测能力稳定之前，不应进入 RAG、Agent 或知识库实现。
