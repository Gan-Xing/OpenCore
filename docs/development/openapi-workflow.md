# OpenAPI 工作流

OpenCore 使用 OpenAPI 作为 API 契约、SDK 和多端接入的核心桥梁。

## 目标

- API 契约从后端源头生成。
- 前端和多端客户端通过契约生成 SDK 或类型。
- 错误码、分页、排序、过滤、鉴权头和上传下载能力形成统一规范。
- OpenForge 可以基于契约生成后台页面、表单、列表、权限点和测试骨架。

## 当前状态

S2 建立了 OpenAPI 空跑流程；S3-S9、OpenForge V1、Q001 和 BE20 已经把它升级为当前契约门禁：

- 从 NestJS 应用导出 OpenAPI 文档。
- 将 OpenAPI 文档作为 `packages/contracts` 的输入。
- 生成 `packages/sdk` 的客户端类型和调用封装。
- 在 CI 中校验契约变更。
- 校验 OpenAPI tag 与 `packages/module-registry` 的一致性。
- 通过 `pnpm sdk:check` 防止 SDK 与 OpenAPI snapshot 漂移。
- 通过 OpenForge 读取 OpenAPI/module registry/schema 生成 safe plan、diff、check、apply、manifest 和 rollback。

## 当前边界

OpenAPI 是当前 API、SDK、Admin 和 OpenForge 的事实契约之一。后续新增模块必须先登记 module registry、权限码、菜单和 OpenAPI tag，再进入 API/SDK/Admin 实现。

当前仍不通过 OpenAPI/OpenForge 自动写 Prisma schema、migration、行业业务逻辑、真实支付闭环或 AI/RAG/Agent 能力。
